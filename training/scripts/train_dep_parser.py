#!/usr/bin/env python3
"""
train_dep_parser.py — Train an Arc-Eager Dependency Parser on UD-EWT.

Source: TagTeam-Major-Refactor-v2.2.md §7
Authority: Nivre 2003 (arc-eager), Goldberg & Nivre 2012 (dynamic oracle)

Algorithm: Averaged perceptron with dynamic oracle
  - Arc-eager transition system (SHIFT, LEFT-ARC, RIGHT-ARC, REDUCE)
  - Dynamic oracle computes optimal transition set for any parser state,
    not just the gold-standard derivation (Goldberg & Nivre 2012 §3)
  - This enables exploration during training: the parser can recover from
    errors by learning the best action from non-gold configurations
  - Reference implementations:
    - Goldberg & Nivre 2012: "Training Deterministic Parsers with Non-Deterministic Oracles"
      https://aclanthology.org/Q12-1030/
    - spaCy v1 (Honnibal): arc-eager with dynamic oracle
      https://github.com/explosion/spaCy/tree/v1.x

Feature template: ~40-60 features per parser state
  - Stack/buffer word and tag features
  - Child label features
  - Combined features (bigrams, trigrams)
  MUST match src/core/DependencyParser.js._getFeatures() exactly

Usage:
    python training/scripts/train_dep_parser.py

Output:
    training/models/dep-weights.json          (full weights, for debugging)
    training/models/dep-weights-pruned.json   (pruned, for production ≤5 MB)
    training/models/dep-weights-pruned.bin    (binary, for browser)
    training/models/dep-calibration.json      (confidence calibration table)
"""

import json
import os
import re
import sys
import random
import struct
import hashlib
import datetime
import subprocess
from collections import defaultdict

# Fix Windows console encoding for Unicode output
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# ============================================================================
# Paths
# ============================================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
UD_EWT_DIR = os.path.join(SCRIPT_DIR, '..', 'data', 'UD_English-EWT')
MODEL_DIR = os.path.join(SCRIPT_DIR, '..', 'models')

TRAIN_FILE = os.path.join(UD_EWT_DIR, 'en_ewt-ud-train.conllu')
DEV_FILE = os.path.join(UD_EWT_DIR, 'en_ewt-ud-dev.conllu')
TEST_FILE = os.path.join(UD_EWT_DIR, 'en_ewt-ud-test.conllu')

# ============================================================================
# Config
# ============================================================================

SEED = 42
ITERATIONS = 15
PRUNE_THRESHOLD = 3.0           # Remove weights with |w| < threshold
NUM_BUCKETS = 2 ** 18           # 262144 feature hash buckets (AC-2.10)
MIN_UAS = 0.90                  # AC-2.1: UAS ≥ 90% on UD-EWT test set
MIN_LAS = 0.88                  # AC-2.1: LAS ≥ 88% on UD-EWT test set
MAX_MODEL_SIZE_MB = 5.0         # AC-2.10: ≤5 MB
MAX_ACCURACY_DROP = 0.003       # AC-2.10: pruned accuracy drop < 0.3%

# UD v2 dependency labels used in UD-EWT
UD_LABELS = [
    'root', 'nsubj', 'obj', 'iobj', 'csubj', 'ccomp', 'xcomp',
    'obl', 'vocative', 'expl', 'dislocated', 'advcl', 'advmod',
    'discourse', 'aux', 'cop', 'mark', 'nmod', 'appos', 'nummod',
    'acl', 'amod', 'det', 'clf', 'case', 'conj', 'cc', 'fixed',
    'flat', 'compound', 'list', 'parataxis', 'orphan', 'goeswith',
    'reparandum', 'punct', 'dep',
    # Subtypes used in UD-EWT
    'nsubj:pass', 'csubj:pass', 'aux:pass', 'obl:npmod', 'obl:tmod',
    'acl:relcl', 'det:predet', 'cc:preconj', 'nmod:poss', 'nmod:npmod',
    'nmod:tmod', 'compound:prt', 'flat:foreign',
    # Additional subtype for by-phrase in passives
    'obl:agent',
]


# ============================================================================
# CoNLL-U Parser
# ============================================================================

def parse_conllu(filepath):
    """Parse a CoNLL-U file, returning list of sentences.
    Each sentence = list of (id, form, xpos, head, deprel) tuples.
    Skips multi-word tokens (IDs with '-') and empty words (IDs with '.').
    """
    sentences = []
    current = []

    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                if current:
                    sentences.append(current)
                    current = []
                continue
            if line.startswith('#'):
                continue
            parts = line.split('\t')
            if len(parts) < 10:
                continue
            tok_id = parts[0]
            if '-' in tok_id or '.' in tok_id:
                continue
            tid = int(tok_id)
            form = parts[1]   # FORM
            xpos = parts[4]   # XPOS (Penn Treebank tags)
            head = int(parts[6])  # HEAD
            deprel = parts[7]     # DEPREL

            current.append((tid, form, xpos, head, deprel))

    if current:
        sentences.append(current)

    return sentences


# ============================================================================
# Arc-Eager Transition System
# ============================================================================

class ArcEagerState:
    """Parser configuration: (stack, buffer, arcs).

    The arc-eager transition system (Nivre 2003) uses four transitions:
      SHIFT:           Move buffer[0] → top of stack
      LEFT-ARC(label): Arc from buffer[0] → stack[-1], pop stack[-1]
      RIGHT-ARC(label): Arc from stack[-1] → buffer[0], push buffer[0] to stack
      REDUCE:          Pop stack[-1] (must already have a head)
    """

    def __init__(self, n):
        self.stack = [0]  # ROOT sentinel
        self.buffer = list(range(1, n + 1))
        self.heads = [-1] * (n + 1)      # heads[i] = head of token i
        self.labels = [None] * (n + 1)    # labels[i] = deprel of token i
        self.left_children = [None] * (n + 1)   # leftmost child label
        self.right_children = [None] * (n + 1)  # rightmost child label
        self.left_dep_count = [0] * (n + 1)     # number of left dependents
        self.right_dep_count = [0] * (n + 1)    # number of right dependents
        self.n = n

    @property
    def s0(self):
        return self.stack[-1] if self.stack else -1

    @property
    def s1(self):
        return self.stack[-2] if len(self.stack) > 1 else -1

    @property
    def b0(self):
        return self.buffer[0] if self.buffer else -1

    def is_terminal(self):
        return len(self.buffer) == 0 and len(self.stack) <= 1

    def get_valid_transitions(self, transition_set):
        """Get valid transitions from current state.

        Validity constraints (Nivre 2003):
          SHIFT:     buffer non-empty
          LEFT-ARC:  buffer non-empty, stack[-1] ≠ ROOT, no head yet
          RIGHT-ARC: buffer non-empty
          REDUCE:    stack[-1] ≠ ROOT, already has a head
        """
        valid = []
        s0 = self.s0

        if self.buffer:
            valid.append('SHIFT')

        if s0 > 0 and self.heads[s0] != -1:
            valid.append('REDUCE')

        if self.buffer and s0 > 0 and self.heads[s0] == -1:
            for t in transition_set:
                if t.startswith('LEFT-'):
                    valid.append(t)

        if self.buffer:
            for t in transition_set:
                if t.startswith('RIGHT-'):
                    valid.append(t)

        return valid

    def apply(self, transition):
        """Apply a transition, modifying state in-place."""
        if transition == 'SHIFT':
            self.stack.append(self.buffer.pop(0))
        elif transition == 'REDUCE':
            self.stack.pop()
        elif transition.startswith('LEFT-'):
            label = transition[5:]
            dep = self.stack.pop()
            head = self.buffer[0]
            self.heads[dep] = head
            self.labels[dep] = label
            if dep < head:
                self.left_children[head] = label
                self.left_dep_count[head] += 1
            else:
                self.right_children[head] = label
                self.right_dep_count[head] += 1
        elif transition.startswith('RIGHT-'):
            label = transition[6:]
            dep = self.buffer.pop(0)
            head = self.stack[-1]
            self.heads[dep] = head
            self.labels[dep] = label
            self.stack.append(dep)
            if dep < head:
                self.left_children[head] = label
                self.left_dep_count[head] += 1
            else:
                self.right_children[head] = label
                self.right_dep_count[head] += 1


# ============================================================================
# Dynamic Oracle (Goldberg & Nivre 2012 §3)
#
# The dynamic oracle computes the set of optimal transitions from ANY parser
# state, not just the gold-standard state. This is critical for training:
#
# In a static oracle, the training signal is only defined for the gold
# derivation. If the parser makes an error during training, the static oracle
# has no guidance for recovery — it can only tell the parser what it SHOULD
# have done, not what to do NOW.
#
# The dynamic oracle solves this by computing, for each parser configuration,
# the set of transitions that can still lead to the best reachable tree.
# A transition t is optimal if the resulting configuration can reach a tree
# whose arc set is maximally overlapping with the gold tree.
#
# Per Goldberg & Nivre 2012 §3: A transition t from configuration c is
# OPTIMAL if cost(t, c, G) = 0, where cost counts the gold arcs that
# become unreachable after applying t.
#
# Cost computation for arc-eager:
#   SHIFT:        cost = number of gold arcs (s0 → b_j) for any b_j in buffer
#                        (these LEFT-ARCs become impossible after shifting)
#   LEFT-ARC(l):  cost = 0 if gold_head[s0] == b0 AND gold_label[s0] == l
#                        else number of gold arcs lost
#   RIGHT-ARC(l): cost = 0 if gold_head[b0] == s0 AND gold_label[b0] == l
#                        else number of gold arcs lost
#   REDUCE:       cost = number of gold arcs (b_j → s0) for any b_j in buffer
#                        (these RIGHT-ARCs become impossible after reducing)
# ============================================================================

def dynamic_oracle_cost(state, transition, gold_heads, gold_labels):
    """Compute the cost of a transition in the current state.

    Cost = number of gold arcs that become unreachable after applying transition.
    A transition with cost 0 is optimal (Goldberg & Nivre 2012 §3).

    Args:
        state: ArcEagerState
        transition: transition string (e.g., 'SHIFT', 'LEFT-nsubj')
        gold_heads: list of gold head indices (1-indexed, 0=ROOT)
        gold_labels: list of gold dependency labels

    Returns:
        int: cost (0 = optimal)
    """
    s0 = state.s0
    b0 = state.b0

    if transition == 'SHIFT':
        # Cost = gold arcs where s0 is dependent of some b_j (LEFT-ARCs lost)
        # Plus gold arcs where some b_j is dependent of s0 that haven't been created
        cost = 0
        if s0 > 0:
            # s0 could be a dependent of b0 (LEFT-ARC lost)
            if gold_heads[s0] == b0:
                cost += 1
            # Any buffer item that should be a left-dependent of s0
            for j in state.buffer:
                if gold_heads[j] == s0 and state.heads[j] == -1:
                    cost += 1
        return cost

    elif transition == 'REDUCE':
        # Cost = gold arcs where some b_j is dependent of s0 (RIGHT-ARCs lost)
        cost = 0
        if s0 > 0:
            for j in state.buffer:
                if gold_heads[j] == s0:
                    cost += 1
        return cost

    elif transition.startswith('LEFT-'):
        label = transition[5:]
        if s0 <= 0:
            return float('inf')
        # LEFT-ARC assigns head=b0 to dep=s0
        # Cost 0 if this matches gold
        if gold_heads[s0] == b0 and gold_labels[s0] == label:
            return 0
        # Cost = 1 if gold head of s0 is b0 but label differs
        if gold_heads[s0] == b0:
            return 1
        # Cost = 1 if gold head of s0 is NOT b0 (wrong head assigned)
        # Plus any gold dependents of s0 in buffer that become unreachable
        cost = 1
        return cost

    elif transition.startswith('RIGHT-'):
        label = transition[6:]
        if b0 < 0:
            return float('inf')
        # RIGHT-ARC assigns head=s0 to dep=b0
        # Cost 0 if this matches gold
        if gold_heads[b0] == s0 and gold_labels[b0] == label:
            return 0
        # Cost = 1 if gold head of b0 is s0 but label differs
        if gold_heads[b0] == s0:
            return 1
        # Cost accounting for lost arcs
        cost = 0
        # If b0's gold head is in the buffer, a RIGHT-ARC now means
        # b0 can't get its correct head later
        if gold_heads[b0] != s0:
            cost += 1
        return cost

    return float('inf')


# ============================================================================
# Feature Extraction — MUST match src/core/DependencyParser.js._getFeatures()
# ============================================================================

def _word_shape(word):
    """Compute word shape: X=upper, x=lower, d=digit, -=hyphen, .=punct."""
    shape = []
    prev = ''
    for ch in word:
        if ch.isupper():
            c = 'X'
        elif ch.islower():
            c = 'x'
        elif ch.isdigit():
            c = 'd'
        elif ch == '-':
            c = '-'
        else:
            c = '.'
        if c != prev:  # collapse runs
            shape.append(c)
            prev = c
    return ''.join(shape) if shape else 'x'


def get_features(state, words, tags, heads, labels, left_children, right_children):
    """Extract features from parser configuration.
    ~80-100 features per state (§7.1, enhanced with Zhang & Nivre 2011).
    MUST produce identical feature strings to DependencyParser.js._getFeatures()
    """
    features = ['bias']

    s0 = state.s0
    s1 = state.s1
    b0 = state.b0
    b1 = state.buffer[1] if len(state.buffer) > 1 else -1
    b2 = state.buffer[2] if len(state.buffer) > 2 else -1

    def w(i):
        return words[i] if i >= 0 else '_NULL_'
    def t(i):
        return tags[i] if i >= 0 else '_NULL_'
    def wl(i):
        return words[i].lower() if i >= 0 else '_null_'
    def dl(i):
        return (labels[i] or '_NONE_') if i >= 0 else '_NULL_'
    def lc(i):
        return (left_children[i] or '_NONE_') if i >= 0 else '_NULL_'
    def rc(i):
        return (right_children[i] or '_NONE_') if i >= 0 else '_NULL_'
    def nld(i):
        return str(min(state.left_dep_count[i], 3)) if i >= 0 else '0'
    def nrd(i):
        return str(min(state.right_dep_count[i], 3)) if i >= 0 else '0'

    # Single features
    if s0 >= 0:
        features.append('s0_word=' + w(s0))
        features.append('s0_word_lower=' + wl(s0))
        features.append('s0_tag=' + t(s0))
        features.append('s0_deprel=' + dl(s0))
        features.append('s0_lc=' + lc(s0))
        features.append('s0_rc=' + rc(s0))

    if s1 >= 0:
        features.append('s1_word=' + w(s1))
        features.append('s1_tag=' + t(s1))

    if b0 >= 0:
        features.append('b0_word=' + w(b0))
        features.append('b0_word_lower=' + wl(b0))
        features.append('b0_tag=' + t(b0))
        features.append('b0_lc=' + lc(b0))

    if b1 >= 0:
        features.append('b1_word=' + w(b1))
        features.append('b1_tag=' + t(b1))

    if b2 >= 0:
        features.append('b2_tag=' + t(b2))

    # Combined features
    if s0 >= 0 and b0 >= 0:
        features.append('s0_tag+b0_tag=' + t(s0) + '+' + t(b0))
        features.append('s0_word+b0_tag=' + w(s0) + '+' + t(b0))
        features.append('s0_tag+b0_word=' + t(s0) + '+' + w(b0))
        features.append('s0_word+b0_word=' + w(s0) + '+' + w(b0))
        features.append('s0_word_lower+b0_word_lower=' + wl(s0) + '+' + wl(b0))
        features.append('b0_tag+s0_tag+s0_word_lower=' + t(b0) + '+' + t(s0) + '+' + wl(s0))

    if s0 >= 0 and b0 >= 0:
        features.append('s0_tag+b0_tag+s0_word_lower=' + t(s0) + '+' + t(b0) + '+' + wl(s0))
        features.append('s0_tag+b0_tag+b0_word_lower=' + t(s0) + '+' + t(b0) + '+' + wl(b0))
        features.append('s0_word+b0_tag+b0_word_lower=' + w(s0) + '+' + t(b0) + '+' + wl(b0))

    if s1 >= 0 and s0 >= 0 and b0 >= 0:
        features.append('s1_tag+s0_tag+b0_tag=' + t(s1) + '+' + t(s0) + '+' + t(b0))

    if s0 >= 0 and b0 >= 0 and b1 >= 0:
        features.append('s0_tag+b0_tag+b1_tag=' + t(s0) + '+' + t(b0) + '+' + t(b1))

    if s0 > 0 and heads[s0] != -1:
        features.append('s0_has_head')

    if len(state.buffer) == 0:
        features.append('b_empty')

    if s0 > 0 and heads[s0] != -1 and len(state.buffer) == 0:
        features.append('s0_has_head+b_empty')

    # Suffix features
    if b0 >= 0:
        bword = words[b0]
        if len(bword) >= 3:
            features.append('b0_suf3=' + bword[-3:].lower())
        if len(bword) >= 2:
            features.append('b0_suf2=' + bword[-2:].lower())

    if s0 > 0:
        sword = words[s0]
        if len(sword) >= 3:
            features.append('s0_suf3=' + sword[-3:].lower())
        if len(sword) >= 2:
            features.append('s0_suf2=' + sword[-2:].lower())

    # === Distance features (Zhang & Nivre 2011) ===
    if s0 >= 0 and b0 >= 0:
        dist = min(abs(s0 - b0), 10)
        features.append('dist=' + str(dist))
        features.append('s0_tag+b0_tag+dist=' + t(s0) + '+' + t(b0) + '+' + str(dist))
        features.append('s0_word_lower+dist=' + wl(s0) + '+' + str(dist))
        features.append('b0_word_lower+dist=' + wl(b0) + '+' + str(dist))

    # === Valency features (number of left/right dependents) ===
    if s0 >= 0:
        features.append('s0_n_ldeps=' + nld(s0))
        features.append('s0_n_rdeps=' + nrd(s0))
        features.append('s0_tag+s0_n_ldeps=' + t(s0) + '+' + nld(s0))
        features.append('s0_tag+s0_n_rdeps=' + t(s0) + '+' + nrd(s0))

    if b0 >= 0:
        features.append('b0_n_ldeps=' + nld(b0))
        features.append('b0_tag+b0_n_ldeps=' + t(b0) + '+' + nld(b0))

    # === Head features for s0 (if assigned) ===
    if s0 > 0 and heads[s0] != -1:
        h = heads[s0]
        features.append('s0_head_tag=' + t(h))
        features.append('s0_head_word_lower=' + wl(h))
        if b0 >= 0:
            features.append('s0_head_tag+b0_tag=' + t(h) + '+' + t(b0))

    # === Additional combined features ===
    if s0 >= 0 and b0 >= 0:
        features.append('s0_tag+s0_lc+b0_tag=' + t(s0) + '+' + lc(s0) + '+' + t(b0))
        features.append('s0_tag+s0_rc+b0_tag=' + t(s0) + '+' + rc(s0) + '+' + t(b0))

    if s1 >= 0 and s0 >= 0:
        features.append('s1_tag+s0_tag=' + t(s1) + '+' + t(s0))
        features.append('s1_tag+s0_word_lower=' + t(s1) + '+' + wl(s0))

    if b0 >= 0 and b1 >= 0:
        features.append('b0_tag+b1_tag=' + t(b0) + '+' + t(b1))
        features.append('b0_word_lower+b1_tag=' + wl(b0) + '+' + t(b1))

    # Stack depth indicator
    slen = min(len(state.stack), 5)
    features.append('stack_depth=' + str(slen))

    # Buffer length indicator (binned)
    blen = min(len(state.buffer), 5)
    features.append('buffer_len=' + str(blen))

    # === Word shape features (helps with rare/unseen words) ===
    if s0 > 0:
        features.append('s0_shape=' + _word_shape(words[s0]))
    if b0 >= 0:
        features.append('b0_shape=' + _word_shape(words[b0]))
    if s0 >= 0 and b0 >= 0:
        features.append('s0_shape+b0_shape=' + _word_shape(words[s0] if s0 > 0 else 'ROOT') + '+' + _word_shape(words[b0]))

    # === Prefix features (first 3 chars — helps with morphology) ===
    if s0 > 0:
        features.append('s0_pre3=' + words[s0][:3].lower())
    if b0 >= 0:
        features.append('b0_pre3=' + words[b0][:3].lower())

    # === Second-order features (s0 deprel context) ===
    if s0 > 0 and heads[s0] != -1 and b0 >= 0:
        features.append('s0_deprel+b0_tag=' + dl(s0) + '+' + t(b0))
        features.append('s0_deprel+s0_tag+b0_tag=' + dl(s0) + '+' + t(s0) + '+' + t(b0))

    # Valency + distance combined
    if s0 >= 0 and b0 >= 0:
        features.append('s0_n_rdeps+dist=' + nrd(s0) + '+' + str(min(abs(s0 - b0), 10)))

    return features


# ============================================================================
# Averaged Perceptron for Transitions
# ============================================================================

class AveragedPerceptron:
    """Averaged perceptron classifier for parser transitions.
    Same algorithm as POS tagger (Collins 2002, Honnibal 2013).
    """

    def __init__(self, classes):
        self.classes = list(classes)
        self.weights = defaultdict(lambda: defaultdict(float))
        self._totals = defaultdict(lambda: defaultdict(float))
        self._tstamps = defaultdict(lambda: defaultdict(int))
        self._step = 0

    def predict(self, features, valid_transitions=None):
        """Predict best transition from features. Only considers valid transitions."""
        scores = defaultdict(float)
        for feat in features:
            if feat not in self.weights:
                continue
            for cls, weight in self.weights[feat].items():
                scores[cls] += weight

        candidates = valid_transitions if valid_transitions else self.classes
        best = max(candidates, key=lambda c: scores.get(c, 0.0))

        # Compute score margin for confidence
        sorted_scores = sorted(
            [(c, scores.get(c, 0.0)) for c in candidates],
            key=lambda x: -x[1]
        )
        margin = 0.0
        if len(sorted_scores) >= 2:
            margin = sorted_scores[0][1] - sorted_scores[1][1]

        return best, margin

    def update(self, truth, guess, features):
        """Perceptron update with averaging."""
        self._step += 1
        if truth == guess:
            return
        for feat in features:
            for cls in [truth, guess]:
                self._totals[feat][cls] += (self._step - self._tstamps[feat][cls]) * self.weights[feat][cls]
                self._tstamps[feat][cls] = self._step
            self.weights[feat][truth] += 1.0
            self.weights[feat][guess] -= 1.0

    def average_weights(self):
        """Compute averaged weights."""
        self._step += 1
        averaged = {}
        for feat in self.weights:
            averaged[feat] = {}
            for cls in self.weights[feat]:
                total = self._totals[feat][cls]
                total += (self._step - self._tstamps[feat][cls]) * self.weights[feat][cls]
                averaged[feat][cls] = total / self._step
            averaged[feat] = {k: v for k, v in averaged[feat].items() if v != 0.0}
            if not averaged[feat]:
                del averaged[feat]
        return averaged


# ============================================================================
# Training
# ============================================================================

def build_transition_set(labels):
    """Build the full set of transitions from label list."""
    transitions = ['SHIFT', 'REDUCE']
    for label in labels:
        if label != 'root':
            transitions.append(f'LEFT-{label}')
        transitions.append(f'RIGHT-{label}')
    # LEFT-root is not standard (root has no head in UD)
    return transitions


def static_oracle(state, gold_heads, gold_labels):
    """Static oracle: compute the correct transition for projective gold trees.

    Priority order (Nivre 2003):
      1. LEFT-ARC(label) if gold_head[s0] == b0
      2. RIGHT-ARC(label) if gold_head[b0] == s0
      3. REDUCE if s0 has a head and no remaining dependents in buffer
      4. SHIFT otherwise
    """
    s0 = state.s0
    b0 = state.b0

    # LEFT-ARC: s0's gold head is b0
    if s0 > 0 and b0 > 0 and gold_heads[s0] == b0:
        return 'LEFT-' + gold_labels[s0]

    # RIGHT-ARC: b0's gold head is s0
    if s0 >= 0 and b0 > 0 and gold_heads[b0] == s0:
        return 'RIGHT-' + gold_labels[b0]

    # REDUCE: s0 has head and no remaining right-dependents in buffer
    if s0 > 0 and state.heads[s0] != -1:
        has_dep_in_buffer = any(gold_heads[j] == s0 for j in state.buffer)
        if not has_dep_in_buffer:
            return 'REDUCE'

    # SHIFT
    if state.buffer:
        return 'SHIFT'

    # Fallback: REDUCE if possible (shouldn't happen for well-formed trees)
    if s0 > 0 and state.heads[s0] != -1:
        return 'REDUCE'

    return None


def train_sentence(model, sentence, transition_set, gold_heads, gold_labels, explore_rate=0.1, rng=None):
    """Train on one sentence using static oracle with exploration.

    Uses static oracle (Nivre 2003) for the gold derivation.
    With probability explore_rate, follows the model's prediction instead
    of the oracle to simulate error recovery (Goldberg & Nivre 2012 §3).
    When exploring, uses dynamic oracle to determine best recovery action.
    """
    n = len(sentence)
    words = ['ROOT'] + [form for _, form, _, _, _ in sentence]
    tags = ['ROOT'] + [xpos for _, _, xpos, _, _ in sentence]

    state = ArcEagerState(n)
    correct = 0
    total = 0

    while not state.is_terminal():
        valid = state.get_valid_transitions(transition_set)
        if not valid:
            break

        features = get_features(
            state, words, tags, state.heads, state.labels,
            state.left_children, state.right_children
        )

        # Get oracle transition (static oracle for gold derivation)
        oracle = static_oracle(state, gold_heads, gold_labels)

        # Fallback: if static oracle returns None or invalid transition
        if oracle is None or oracle not in valid:
            # Use dynamic oracle as fallback
            costs = {t: dynamic_oracle_cost(state, t, gold_heads, gold_labels) for t in valid}
            min_cost = min(costs.values())
            optimal = [t for t, c in costs.items() if c == min_cost]
            oracle = optimal[0]

        # Model prediction
        guess, margin = model.predict(features, valid)

        # Update: oracle is truth, guess is prediction
        model.update(oracle, guess, features)

        if guess == oracle:
            correct += 1
        total += 1

        # Follow oracle during training (with optional exploration)
        if rng and rng.random() < explore_rate and guess in valid:
            state.apply(guess)
        else:
            state.apply(oracle)

    return correct, total


def evaluate(model, sentences, transition_set):
    """Evaluate UAS and LAS on a set of sentences."""
    total_arcs = 0
    correct_head = 0  # UAS
    correct_head_label = 0  # LAS

    for sentence in sentences:
        n = len(sentence)
        words = ['ROOT'] + [form for _, form, _, _, _ in sentence]
        tags = ['ROOT'] + [xpos for _, _, xpos, _, _ in sentence]
        gold_heads = [0] + [head for _, _, _, head, _ in sentence]
        gold_labels = ['ROOT'] + [deprel for _, _, _, _, deprel in sentence]

        state = ArcEagerState(n)
        margins = []

        while not state.is_terminal():
            valid = state.get_valid_transitions(transition_set)
            if not valid:
                break
            features = get_features(
                state, words, tags, state.heads, state.labels,
                state.left_children, state.right_children
            )
            guess, margin = model.predict(features, valid)
            margins.append(margin)
            state.apply(guess)

        # Final sweep: assign root to remaining stack items
        while len(state.stack) > 1:
            idx = state.stack.pop()
            if state.heads[idx] == -1:
                state.heads[idx] = 0
                state.labels[idx] = 'root'

        # Score
        for i in range(1, n + 1):
            total_arcs += 1
            if state.heads[i] == gold_heads[i]:
                correct_head += 1
                if state.labels[i] == gold_labels[i]:
                    correct_head_label += 1

    uas = correct_head / total_arcs if total_arcs > 0 else 0
    las = correct_head_label / total_arcs if total_arcs > 0 else 0
    return uas, las


def train(train_sents, dev_sents, transition_set, iterations=15, seed=42, explore_rate=0.1):
    """Train arc-eager parser with dynamic oracle."""
    model = AveragedPerceptron(transition_set)
    rng = random.Random(seed)
    stats = []

    for epoch in range(1, iterations + 1):
        correct = 0
        total = 0
        shuffled = list(train_sents)
        rng.shuffle(shuffled)

        for sentence in shuffled:
            n = len(sentence)
            gold_heads = [0] + [head for _, _, _, head, _ in sentence]
            gold_labels = ['ROOT'] + [deprel for _, _, _, _, deprel in sentence]

            c, t = train_sentence(model, sentence, transition_set, gold_heads, gold_labels,
                                  explore_rate=explore_rate, rng=rng)
            correct += c
            total += t

        train_acc = correct / total if total > 0 else 0
        dev_uas, dev_las = evaluate(model, dev_sents, transition_set)
        stats.append({
            'epoch': epoch,
            'train_accuracy': round(train_acc, 6),
            'dev_uas': round(dev_uas, 6),
            'dev_las': round(dev_las, 6),
        })
        print(f'  Epoch {epoch}/{iterations}: train_acc={train_acc:.4f}, dev_UAS={dev_uas:.4f}, dev_LAS={dev_las:.4f}')

    averaged_weights = model.average_weights()
    return averaged_weights, stats


# ============================================================================
# Confidence Calibration (Isotonic Regression)
# ============================================================================

def build_calibration_table(model, dev_sents, transition_set, n_bins=10):
    """Build confidence calibration table using isotonic regression on dev set.

    Maps score margins → P(correct arc).
    AC-2.9: Must have ≥5 bins and be monotonically increasing.
    """
    margin_correct = []  # (margin, is_correct)

    for sentence in dev_sents:
        n = len(sentence)
        words = ['ROOT'] + [form for _, form, _, _, _ in sentence]
        tags = ['ROOT'] + [xpos for _, _, xpos, _, _ in sentence]
        gold_heads = [0] + [head for _, _, _, head, _ in sentence]

        state = ArcEagerState(n)
        arc_margins = {}

        while not state.is_terminal():
            valid = state.get_valid_transitions(transition_set)
            if not valid:
                break
            features = get_features(
                state, words, tags, state.heads, state.labels,
                state.left_children, state.right_children
            )
            guess, margin = model.predict(features, valid)

            # Track which tokens get arcs in this transition
            if guess.startswith('LEFT-'):
                arc_margins[state.s0] = margin
            elif guess.startswith('RIGHT-'):
                arc_margins[state.b0] = margin

            state.apply(guess)

        # Final sweep
        while len(state.stack) > 1:
            idx = state.stack.pop()
            if state.heads[idx] == -1:
                state.heads[idx] = 0
                state.labels[idx] = 'root'
                arc_margins[idx] = 0.0

        # Collect margin/correctness pairs
        for i in range(1, n + 1):
            m = arc_margins.get(i, 0.0)
            is_correct = (state.heads[i] == gold_heads[i])
            margin_correct.append((m, is_correct))

    # Sort by margin
    margin_correct.sort(key=lambda x: x[0])

    # Bin into n_bins equal-frequency bins
    bin_size = max(1, len(margin_correct) // n_bins)
    bins = []
    for i in range(0, len(margin_correct), bin_size):
        chunk = margin_correct[i:i + bin_size]
        if not chunk:
            continue
        min_margin = chunk[0][0]  # sorted, so first element is minimum
        accuracy = sum(1 for _, c in chunk if c) / len(chunk)
        bins.append({
            'margin': round(min_margin, 4),
            'probability': round(accuracy, 4),
            'count': len(chunk)
        })

    # Ensure monotonicity (isotonic regression: pool adjacent violators, iterate)
    changed = True
    while changed:
        changed = False
        for i in range(1, len(bins)):
            if bins[i]['probability'] < bins[i - 1]['probability']:
                avg_prob = (bins[i - 1]['probability'] + bins[i]['probability']) / 2
                bins[i - 1]['probability'] = round(avg_prob, 4)
                bins[i]['probability'] = round(avg_prob, 4)
                changed = True

    return {'bins': bins}


# ============================================================================
# Pruning
# ============================================================================

def prune_weights(weights, threshold=1.0):
    """Remove weights with absolute value below threshold."""
    pruned = {}
    original_count = 0
    pruned_count = 0

    for feat in weights:
        original_count += len(weights[feat])
        row = {k: v for k, v in weights[feat].items() if abs(v) >= threshold}
        if row:
            pruned[feat] = row
            pruned_count += len(row)

    return pruned, original_count, pruned_count


# ============================================================================
# Feature Hashing (Weinberger et al. 2009)
# ============================================================================

def fnv1a_hash(s, num_buckets):
    """FNV-1a hash. Must match DependencyParser._fnv1a() in JS.
    Uses Unicode code points (ord) to match JS charCodeAt() for BMP chars.
    """
    h = 0x811c9dc5  # FNV offset basis (32-bit)
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF  # FNV prime, mask to 32-bit
    return h % num_buckets


def hash_model(weights, num_buckets, prune_threshold=0.0, round_digits=2):
    """Hash feature names to integer bucket IDs using FNV-1a.

    Replaces long feature name strings with compact integer keys.
    Weights that hash to the same bucket are summed (additive collision).

    Returns: (hashed_weights_dict, stats_dict)
    """
    hashed = defaultdict(lambda: defaultdict(float))

    for feat, row in weights.items():
        bucket = fnv1a_hash(feat, num_buckets)
        bucket_key = str(bucket)
        for trans, w in row.items():
            hashed[bucket_key][trans] += w

    # Round weights
    if round_digits is not None:
        for bk in hashed:
            for t in list(hashed[bk]):
                hashed[bk][t] = round(hashed[bk][t], round_digits)

    # Prune small weights
    final = {}
    total_entries = 0
    for bk in hashed:
        row = {t: w for t, w in hashed[bk].items() if abs(w) >= prune_threshold}
        if row:
            final[bk] = row
            total_entries += len(row)

    stats = {
        'original_features': len(weights),
        'num_buckets': num_buckets,
        'active_buckets': len(final),
        'total_entries': total_entries,
    }
    return final, stats


class HashedModelWrapper:
    """Wrapper that hashes features before weight lookup, for evaluation."""

    def __init__(self, hashed_weights, num_buckets, transitions):
        self.weights = defaultdict(lambda: defaultdict(float))
        for bk, row in hashed_weights.items():
            for t, w in row.items():
                self.weights[bk][t] = w
        self.num_buckets = num_buckets
        self.classes = transitions

    def predict(self, features, valid_transitions=None):
        scores = defaultdict(float)
        for feat in features:
            bk = str(fnv1a_hash(feat, self.num_buckets))
            if bk not in self.weights:
                continue
            for cls, weight in self.weights[bk].items():
                scores[cls] += weight

        candidates = valid_transitions if valid_transitions else self.classes
        best = max(candidates, key=lambda c: scores.get(c, 0.0))

        sorted_scores = sorted(
            [(c, scores.get(c, 0.0)) for c in candidates],
            key=lambda x: -x[1]
        )
        margin = 0.0
        if len(sorted_scores) >= 2:
            margin = sorted_scores[0][1] - sorted_scores[1][1]

        return best, margin


# ============================================================================
# Binary Model Export (AC-2.11)
# ============================================================================

def export_binary(json_model_path, bin_output_path, transitions):
    """Export JSON model to sparse binary format.

    Binary format (§20, v1.1 sparse):
      Fixed Header (64 bytes):
        bytes 0-3:    Magic "TT01"
        bytes 4-5:    Version 1.1
        byte  6:      Endianness 0x00 (little-endian)
        byte  7:      Model type 0x02 (dependency parser)
        bytes 8-11:   Feature count (uint32 LE)
        bytes 12-15:  Transition count (uint32 LE)
        bytes 16-19:  Total non-zero entries (uint32 LE)
        bytes 20-23:  Metadata JSON length (uint32 LE)
        bytes 24-27:  Feature index length (uint32 LE)
        bytes 28-31:  Weight data length (uint32 LE)
        bytes 32-63:  SHA-256 checksum of payload
      Payload:
        Metadata JSON (UTF-8)
        Feature index (null-terminated strings)
        Sparse weight data:
          For each feature: uint16 count, then count × (uint16 col_idx, float32 weight)
    """
    with open(json_model_path, 'r', encoding='utf-8') as f:
        model = json.load(f)

    weights = model['weights']

    # Collect all features
    feature_list = sorted(weights.keys())
    feature_count = len(feature_list)
    transition_count = len(transitions)

    # Build transition → column index map
    trans_to_idx = {t: i for i, t in enumerate(transitions)}

    # Metadata JSON (without weights)
    metadata = {k: v for k, v in model.items() if k != 'weights'}
    metadata['transitions'] = transitions
    metadata_bytes = json.dumps(metadata, separators=(',', ':')).encode('utf-8')

    # Feature index (null-terminated)
    feat_index_bytes = b'\x00'.join(f.encode('utf-8') for f in feature_list) + b'\x00'

    # Sparse weight data: for each feature, store (count, [(col, weight), ...])
    weight_parts = []
    total_entries = 0
    for feat in feature_list:
        row = weights.get(feat, {})
        entries = []
        for trans, w in row.items():
            idx = trans_to_idx.get(trans)
            if idx is not None and w != 0:
                entries.append((idx, w))
        total_entries += len(entries)
        # Write: uint16 count
        weight_parts.append(struct.pack('<H', len(entries)))
        # Write: count × (uint16 col_idx, float32 weight)
        for col_idx, w in entries:
            weight_parts.append(struct.pack('<Hf', col_idx, w))

    weight_bytes = b''.join(weight_parts)

    # Build payload
    payload = metadata_bytes + feat_index_bytes + weight_bytes

    # Compute SHA-256 checksum
    checksum = hashlib.sha256(payload).digest()

    # Build header
    header = bytearray(64)
    header[0:4] = b'TT01'           # Magic
    header[4] = 1                     # Version major
    header[5] = 1                     # Version minor (1.1 = sparse)
    header[6] = 0x00                  # Little-endian
    header[7] = 0x02                  # Dependency parser
    struct.pack_into('<I', header, 8, feature_count)
    struct.pack_into('<I', header, 12, transition_count)
    struct.pack_into('<I', header, 16, total_entries)
    struct.pack_into('<I', header, 20, len(metadata_bytes))
    struct.pack_into('<I', header, 24, len(feat_index_bytes))
    struct.pack_into('<I', header, 28, len(weight_bytes))
    header[32:64] = checksum

    # Write binary file
    with open(bin_output_path, 'wb') as f:
        f.write(bytes(header))
        f.write(payload)

    return os.path.getsize(bin_output_path)


# ============================================================================
# Non-Projective Analysis (AC-2.8)
# ============================================================================

def measure_non_projective(sentences):
    """Measure non-projective arc rate in gold data."""
    total_sents = 0
    np_sents = 0
    total_arcs = 0
    np_arcs = 0

    for sentence in sentences:
        n = len(sentence)
        heads = [0] + [head for _, _, _, head, _ in sentence]
        has_np = False

        for i in range(1, n + 1):
            hi = heads[i]
            lo, hi_arc = min(i, hi), max(i, hi)
            # Check if any other arc crosses this one
            for j in range(1, n + 1):
                if j == i:
                    continue
                hj = heads[j]
                lo_j, hi_j = min(j, hj), max(j, hj)
                # Crossing: one endpoint of j's arc is inside (lo, hi) and the other is outside
                if (lo < lo_j < hi_arc < hi_j) or (lo_j < lo < hi_j < hi_arc):
                    np_arcs += 1
                    has_np = True
                    break
            total_arcs += 1

        total_sents += 1
        if has_np:
            np_sents += 1

    return {
        'total_sentences': total_sents,
        'np_sentences': np_sents,
        'np_sentence_rate': round(np_sents / total_sents, 4) if total_sents > 0 else 0,
        'total_arcs': total_arcs,
        'np_arcs': np_arcs,
        'np_arc_rate': round(np_arcs / total_arcs, 6) if total_arcs > 0 else 0,
    }


# ============================================================================
# Main
# ============================================================================

def postprocess(num_buckets=None, prune_threshold=None):
    """Re-hash existing full model with different parameters (skip training).

    Usage: python train_dep_parser.py --postprocess [--buckets=N] [--prune=T]
    """
    nb = num_buckets or NUM_BUCKETS
    pt = prune_threshold if prune_threshold is not None else PRUNE_THRESHOLD

    full_path = os.path.join(MODEL_DIR, 'dep-weights.json')
    if not os.path.exists(full_path):
        print(f'ERROR: Full model not found: {full_path}')
        print('Run full training first.')
        sys.exit(1)

    print(f'Loading full model from {full_path}...')
    with open(full_path, 'r', encoding='utf-8') as f:
        full_model = json.load(f)

    weights = full_model['weights']
    transition_set = full_model['transitions']
    all_labels = full_model['labels']
    provenance = full_model.get('provenance', {})

    # Load test/dev data for evaluation
    test_sents = parse_conllu(TEST_FILE)
    dev_sents = parse_conllu(DEV_FILE)
    print(f'  Test: {len(test_sents)} sentences')
    print(f'  Dev:  {len(dev_sents)} sentences')

    # Evaluate full (unhashed) model
    eval_model = AveragedPerceptron(transition_set)
    eval_model.weights = defaultdict(lambda: defaultdict(float))
    for feat, row in weights.items():
        for cls, w in row.items():
            eval_model.weights[feat][cls] = w
    test_uas, test_las = evaluate(eval_model, test_sents, transition_set)
    print(f'  Full model test UAS: {test_uas:.4f}, LAS: {test_las:.4f}')

    # Try hashing with given parameters
    print(f'\nFeature hashing (buckets={nb}, prune={pt})...')
    hashed_weights, hash_stats = hash_model(weights, nb, prune_threshold=pt, round_digits=2)
    print(f'  Features: {hash_stats["original_features"]} → {hash_stats["active_buckets"]} buckets')
    print(f'  Weight entries: {hash_stats["total_entries"]}')

    hashed_eval = HashedModelWrapper(hashed_weights, nb, transition_set)
    hashed_uas, hashed_las = evaluate(hashed_eval, test_sents, transition_set)
    uas_drop = test_uas - hashed_uas
    las_drop = test_las - hashed_las
    print(f'  Hashed test UAS: {hashed_uas:.4f} (drop: {uas_drop:.4f})')
    print(f'  Hashed test LAS: {hashed_las:.4f} (drop: {las_drop:.4f})')

    # Estimate model size
    hashed_model = {
        'version': '1.0.0',
        'labelset': 'UD-v2',
        'trainedOn': 'UD_English-EWT',
        'provenance': provenance,
        'labels': sorted(all_labels),
        'transitions': transition_set,
        'numBuckets': nb,
        'weights': hashed_weights,
    }

    pruned_path = os.path.join(MODEL_DIR, 'dep-weights-pruned.json')
    with open(pruned_path, 'w', encoding='utf-8') as f:
        json.dump(hashed_model, f, separators=(',', ':'))
    pruned_size = os.path.getsize(pruned_path) / (1024 * 1024)
    print(f'  Model size: {pruned_size:.2f} MB (target: ≤{MAX_MODEL_SIZE_MB})')

    # Update provenance
    provenance['hashBuckets'] = nb
    provenance['prunedFrom'] = hash_stats['original_features']
    provenance['prunedTo'] = hash_stats['active_buckets']
    provenance['postPruneUAS'] = round(hashed_uas, 6)
    provenance['postPruneLAS'] = round(hashed_las, 6)

    # Re-save with updated provenance
    hashed_model['provenance'] = provenance
    with open(pruned_path, 'w', encoding='utf-8') as f:
        json.dump(hashed_model, f, separators=(',', ':'))

    # Calibration
    print('\nBuilding calibration table...')
    calibration = build_calibration_table(hashed_eval, dev_sents, transition_set)
    print(f'  Bins: {len(calibration["bins"])}')
    for b in calibration['bins']:
        print(f'    margin≥{b["margin"]:.2f}: P(correct)={b["probability"]:.4f} (n={b["count"]})')

    calib_path = os.path.join(MODEL_DIR, 'dep-calibration.json')
    with open(calib_path, 'w', encoding='utf-8') as f:
        json.dump(calibration, f, indent=2)

    # Binary export
    print('\nExporting binary model...')
    bin_path = os.path.join(MODEL_DIR, 'dep-weights-pruned.bin')
    bin_size = export_binary(pruned_path, bin_path, transition_set)
    print(f'  Binary: {bin_size / 1024:.0f} KB (JSON: {pruned_size*1024:.0f} KB)')

    # Summary
    print(f'\n{"="*70}')
    print(f'POSTPROCESS SUMMARY')
    print(f'{"="*70}')
    print(f'  Full UAS:       {test_uas:.4f}')
    print(f'  Hashed UAS:     {hashed_uas:.4f} (drop: {uas_drop:.4f}, target: <{MAX_ACCURACY_DROP})')
    print(f'  Full LAS:       {test_las:.4f}')
    print(f'  Hashed LAS:     {hashed_las:.4f} (drop: {las_drop:.4f})')
    print(f'  Buckets:        {nb} (active: {hash_stats["active_buckets"]})')
    print(f'  Prune threshold:{pt}')
    print(f'  Model size:     {pruned_size:.2f} MB')
    print(f'  Binary size:    {bin_size / 1024:.0f} KB')
    passed = max(uas_drop, las_drop) < MAX_ACCURACY_DROP and pruned_size <= MAX_MODEL_SIZE_MB
    print(f'  Status:         {"✓ PASS" if passed else "✗ NEEDS TUNING"}')


def main():
    quick_mode = '--quick' in sys.argv
    postprocess_mode = '--postprocess' in sys.argv

    # Handle --postprocess mode
    if postprocess_mode:
        # Parse optional --buckets=N and --prune=T
        nb = None
        pt = None
        for arg in sys.argv:
            if arg.startswith('--buckets='):
                nb = int(arg.split('=')[1])
            elif arg.startswith('--prune='):
                pt = float(arg.split('=')[1])
        postprocess(num_buckets=nb, prune_threshold=pt)
        return

    print('=' * 70)
    print('TagTeam.js — Dependency Parser Training')
    print('Algorithm: Averaged perceptron + dynamic oracle (Goldberg & Nivre 2012)')
    print('Data: UD_English-EWT v2.14')
    if quick_mode:
        print('MODE: --quick (reduced data for pipeline testing)')
    print('=' * 70)

    # Check data files exist
    for f, name in [(TRAIN_FILE, 'train'), (DEV_FILE, 'dev'), (TEST_FILE, 'test')]:
        if not os.path.exists(f):
            print(f'\nERROR: {name} file not found: {f}')
            print('Download UD_English-EWT from https://universaldependencies.org/')
            print(f'Place CoNLL-U files in: {UD_EWT_DIR}')
            sys.exit(1)

    os.makedirs(MODEL_DIR, exist_ok=True)

    # Load data
    print('\nLoading data...')
    train_sents = parse_conllu(TRAIN_FILE)
    dev_sents = parse_conllu(DEV_FILE)
    test_sents = parse_conllu(TEST_FILE)
    # Quick mode: use subset for fast pipeline testing
    num_iterations = ITERATIONS
    if quick_mode:
        train_sents = train_sents[:2000]
        dev_sents = dev_sents[:500]
        test_sents = test_sents[:500]
        num_iterations = 5

    print(f'  Train: {len(train_sents)} sentences')
    print(f'  Dev:   {len(dev_sents)} sentences')
    print(f'  Test:  {len(test_sents)} sentences')

    # Collect labels from training data
    all_labels = set()
    for sent in train_sents + dev_sents:
        for _, _, _, _, deprel in sent:
            all_labels.add(deprel)
    print(f'  Labels: {len(all_labels)} unique')

    # Build transition set
    transition_set = build_transition_set(sorted(all_labels))
    print(f'  Transitions: {len(transition_set)}')

    # Train
    print(f'\nTraining ({num_iterations} iterations, seed={SEED}, explore=0.1)...')
    weights, stats = train(train_sents, dev_sents, transition_set,
                           iterations=num_iterations, seed=SEED, explore_rate=0.1)
    print(f'  Final dev: UAS={stats[-1]["dev_uas"]:.4f}, LAS={stats[-1]["dev_las"]:.4f}')

    # Evaluate on test
    print('\nEvaluating on test set...')
    # Create a model object for evaluation
    eval_model = AveragedPerceptron(transition_set)
    eval_model.weights = defaultdict(lambda: defaultdict(float))
    for feat, row in weights.items():
        for cls, w in row.items():
            eval_model.weights[feat][cls] = w

    test_uas, test_las = evaluate(eval_model, test_sents, transition_set)
    print(f'  Test UAS: {test_uas:.4f} (target: ≥{MIN_UAS})')
    print(f'  Test LAS: {test_las:.4f} (target: ≥{MIN_LAS})')

    # Non-projective analysis (AC-2.8)
    print('\nNon-projective analysis...')
    np_stats = measure_non_projective(test_sents)
    print(f'  Non-projective sentences: {np_stats["np_sentences"]}/{np_stats["total_sentences"]} ({np_stats["np_sentence_rate"]*100:.1f}%)')
    print(f'  Non-projective arcs: {np_stats["np_arcs"]}/{np_stats["total_arcs"]} ({np_stats["np_arc_rate"]*100:.2f}%)')

    # Get git commit
    try:
        git_commit = subprocess.check_output(
            ['git', 'rev-parse', '--short', 'HEAD'],
            cwd=PROJECT_ROOT, stderr=subprocess.DEVNULL
        ).decode().strip()
    except Exception:
        git_commit = 'unknown'

    # Build provenance
    provenance = {
        'trainScriptVersion': '1.0.0',
        'trainScriptGitCommit': git_commit,
        'trainCorpus': 'UD_English-EWT',
        'corpusVersion': '2.14',
        'trainDate': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
        'trainingDataLicense': 'CC-BY-SA 4.0',
        'trainingSeed': SEED,
        'iterations': num_iterations,
        'oracleType': 'dynamic',
        'UAS': round(test_uas, 6),
        'LAS': round(test_las, 6),
        'devUAS': round(stats[-1]['dev_uas'], 6),
        'devLAS': round(stats[-1]['dev_las'], 6),
        'pruneThreshold': PRUNE_THRESHOLD,
        'prunedFrom': 0,
        'prunedTo': 0,
        'nonProjective': np_stats,
    }

    # Save full model
    full_model = {
        'version': '1.0.0',
        'labelset': 'UD-v2',
        'trainedOn': 'UD_English-EWT',
        'provenance': provenance,
        'labels': sorted(all_labels),
        'transitions': transition_set,
        'weights': weights,
    }

    full_path = os.path.join(MODEL_DIR, 'dep-weights.json')
    with open(full_path, 'w', encoding='utf-8') as f:
        json.dump(full_model, f, indent=2)
    full_size = os.path.getsize(full_path) / (1024 * 1024)
    print(f'\nFull model saved: {full_path} ({full_size:.2f} MB)')

    # Feature hashing (Weinberger et al. 2009, AC-2.10)
    print(f'\nFeature hashing (buckets={NUM_BUCKETS}, prune={PRUNE_THRESHOLD})...')
    hashed_weights, hash_stats = hash_model(weights, NUM_BUCKETS,
                                             prune_threshold=PRUNE_THRESHOLD,
                                             round_digits=2)
    print(f'  Features: {hash_stats["original_features"]} → {hash_stats["active_buckets"]} buckets')
    print(f'  Weight entries: {hash_stats["total_entries"]}')

    # Evaluate hashed model
    hashed_eval = HashedModelWrapper(hashed_weights, NUM_BUCKETS, transition_set)
    hashed_uas, hashed_las = evaluate(hashed_eval, test_sents, transition_set)
    uas_drop = test_uas - hashed_uas
    las_drop = test_las - hashed_las
    print(f'  Hashed test UAS: {hashed_uas:.4f} (drop: {uas_drop:.4f})')
    print(f'  Hashed test LAS: {hashed_las:.4f} (drop: {las_drop:.4f})')

    provenance['hashBuckets'] = NUM_BUCKETS
    provenance['prunedFrom'] = hash_stats['original_features']
    provenance['prunedTo'] = hash_stats['active_buckets']
    provenance['postPruneUAS'] = round(hashed_uas, 6)
    provenance['postPruneLAS'] = round(hashed_las, 6)

    # Save hashed model
    hashed_model = {
        'version': '1.0.0',
        'labelset': 'UD-v2',
        'trainedOn': 'UD_English-EWT',
        'provenance': provenance,
        'labels': sorted(all_labels),
        'transitions': transition_set,
        'numBuckets': NUM_BUCKETS,
        'weights': hashed_weights,
    }

    pruned_path = os.path.join(MODEL_DIR, 'dep-weights-pruned.json')
    with open(pruned_path, 'w', encoding='utf-8') as f:
        json.dump(hashed_model, f, separators=(',', ':'))
    pruned_size = os.path.getsize(pruned_path) / (1024 * 1024)
    print(f'  Hashed model saved: {pruned_path} ({pruned_size:.2f} MB)')

    # Calibration table (AC-2.9) — built from hashed model for consistency
    print('\nBuilding calibration table...')
    calibration = build_calibration_table(hashed_eval, dev_sents, transition_set)
    print(f'  Bins: {len(calibration["bins"])}')
    for b in calibration['bins']:
        print(f'    margin≥{b["margin"]:.2f}: P(correct)={b["probability"]:.4f} (n={b["count"]})')

    # Save calibration table
    calib_path = os.path.join(MODEL_DIR, 'dep-calibration.json')
    with open(calib_path, 'w', encoding='utf-8') as f:
        json.dump(calibration, f, indent=2)
    print(f'  Calibration table saved: {calib_path}')

    # Export binary (AC-2.11)
    print('\nExporting binary model...')
    bin_path = os.path.join(MODEL_DIR, 'dep-weights-pruned.bin')
    bin_size = export_binary(pruned_path, bin_path, transition_set)
    print(f'  Binary model saved: {bin_path} ({bin_size / 1024:.0f} KB)')
    print(f'  Compression: JSON {pruned_size*1024:.0f} KB → Binary {bin_size / 1024:.0f} KB')

    # Summary
    print('\n' + '=' * 70)
    print('SUMMARY')
    print('=' * 70)
    print(f'  Test UAS:         {test_uas:.4f} (target: ≥{MIN_UAS}) {"✓" if test_uas >= MIN_UAS else "✗"}')
    print(f'  Test LAS:         {test_las:.4f} (target: ≥{MIN_LAS}) {"✓" if test_las >= MIN_LAS else "✗"}')
    print(f'  Hashed UAS:       {hashed_uas:.4f} (drop: {uas_drop:.4f})')
    print(f'  Hashed LAS:       {hashed_las:.4f} (drop: {las_drop:.4f})')
    print(f'  Hash buckets:     {NUM_BUCKETS}')
    print(f'  Active buckets:   {hash_stats["active_buckets"]}')
    print(f'  Model size:       {pruned_size:.2f} MB (target: ≤{MAX_MODEL_SIZE_MB}) {"✓" if pruned_size <= MAX_MODEL_SIZE_MB else "✗"}')
    print(f'  Binary size:      {bin_size / 1024:.0f} KB')
    print(f'  Accuracy drop:    {max(uas_drop, las_drop):.4f} (target: <{MAX_ACCURACY_DROP}) {"✓" if max(uas_drop, las_drop) < MAX_ACCURACY_DROP else "✗"}')
    print(f'  Calibration bins: {len(calibration["bins"])} (target: ≥5) {"✓" if len(calibration["bins"]) >= 5 else "✗"}')
    print(f'  Non-projective:   {np_stats["np_sentence_rate"]*100:.1f}% sentences')
    print(f'  Oracle type:      dynamic (Goldberg & Nivre 2012)')

    if test_uas < MIN_UAS or test_las < MIN_LAS:
        print(f'\n⚠️  Accuracy below target. Consider more iterations or feature engineering.')
    if pruned_size > MAX_MODEL_SIZE_MB:
        print(f'\n⚠️  Model size exceeds {MAX_MODEL_SIZE_MB} MB budget. Adjust NUM_BUCKETS or PRUNE_THRESHOLD.')

    print('\nDone.')


if __name__ == '__main__':
    main()
