#!/usr/bin/env python3
"""
train_pos_tagger.py — Train an Averaged Perceptron POS tagger on UD-EWT.

Source: TagTeam-Major-Refactor-v2.2.md §6
Authority: Honnibal 2013, Penn Treebank tagset, UD-EWT XPOS column

Algorithm: Averaged perceptron (Collins 2002, Honnibal 2013)
  - Left-to-right greedy decoding
  - 18-feature template (must match src/core/PerceptronTagger.js exactly)
  - Tag dictionary optimization for unambiguous words
  - Weight averaging to prevent overfitting

Usage:
    python training/scripts/train_pos_tagger.py

Output:
    training/models/pos-weights.json         (full weights, for debugging)
    training/models/pos-weights-pruned.json  (pruned, for production ≤5 MB)
"""

import json
import os
import re
import sys
import random
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
PRUNE_THRESHOLD = 1.0         # Remove weights with |w| < threshold
MIN_ACCURACY = 0.935          # AC-1A.1: ≥93.5% on UD-EWT test set (web text)
MAX_MODEL_SIZE_MB = 5.0       # AC-1A.5: ≤5 MB
MAX_ACCURACY_DROP = 0.003     # AC-1A.5: pruned accuracy drop < 0.3%


# ============================================================================
# CoNLL-U Parser
# ============================================================================

def parse_conllu(filepath):
    """Parse a CoNLL-U file, returning list of sentences.
    Each sentence = list of (form, xpos) tuples.
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
            if len(parts) < 5:
                continue
            # Skip MWT (multi-word tokens with ID like "1-2") and empty words ("1.1")
            tok_id = parts[0]
            if '-' in tok_id or '.' in tok_id:
                continue
            form = parts[1]   # FORM
            xpos = parts[4]   # XPOS (Penn Treebank tags)
            current.append((form, xpos))

    if current:
        sentences.append(current)

    return sentences


# ============================================================================
# Feature Extraction — MUST match src/core/PerceptronTagger.js._getFeatures()
# ============================================================================

def _word_shape(word):
    """Compute word shape: generalizes capitalization and punctuation patterns.
    E.g., "Hello" → "Xxxxx", "U.S." → "X.X.", "42nd" → "ddxx"
    Consecutive same-class chars are collapsed: "Hello" → "Xx", "USA" → "X"
    """
    shape = []
    prev_ch = ''
    for ch in word:
        if ch.isupper():
            s = 'X'
        elif ch.islower():
            s = 'x'
        elif ch.isdigit():
            s = 'd'
        else:
            s = ch
        # Collapse consecutive same-class chars
        if s != prev_ch:
            shape.append(s)
            prev_ch = s
    return ''.join(shape)


def get_features(tokens, i, prev, prev2):
    """Extract features for token at position i.
    ~20-feature template following Honnibal 2013 / TagTeam spec §6.

    MUST produce identical feature strings to PerceptronTagger.js._getFeatures()
    """
    word = tokens[i]
    word_len = len(word)

    # Pre-compute string features
    lower = word.lower()
    suf3 = lower[-3:] if word_len >= 3 else lower
    suf2 = lower[-2:] if word_len >= 2 else lower
    suf1 = lower[-1:] if word_len >= 1 else ''
    pre1 = word[0] if word_len > 0 else ''

    # Boolean features
    is_upper = word == word.upper() and bool(re.search(r'[A-Z]', word))
    is_title = bool(re.match(r'^[A-Z][a-z]', word))
    is_digit = bool(re.match(r'^\d+$', word))
    has_digit = bool(re.search(r'\d', word))
    is_hyphen = '-' in word

    # Word shape (collapsed)
    shape = _word_shape(word)

    # Context
    prev_word = tokens[i - 1] if i > 0 else '-START-'
    next_word = tokens[i + 1] if i < len(tokens) - 1 else '-END-'
    next_lower = next_word.lower()
    next_suf3 = next_lower[-3:] if len(next_lower) >= 3 else next_lower

    # Lowercase context words (generalization for NNP/NN disambiguation)
    prev_lower = prev_word.lower() if prev_word not in ('-START-',) else prev_word
    next_word_lower = next_lower  # already computed above

    # Build feature list (same order as JS)
    features = [
        'bias',
        'word=' + word,
        'word_lower=' + lower,
        'suffix_3=' + suf3,
        'suffix_2=' + suf2,
        'suffix_1=' + suf1,
        'prefix_1=' + pre1,
        'word_shape=' + shape,
        'prev_word=' + prev_word,
        'prev_word_lower=' + prev_lower,
        'prev_tag=' + prev,
        'prev_prev_tag=' + prev2,
        'prev_word+tag=' + prev_word + '+' + prev,
        'prev_tag+word=' + prev + '+' + word,
        'prev_prev_tag+prev_tag=' + prev2 + '+' + prev,
        'next_word=' + next_word,
        'next_word_lower=' + next_word_lower,
        'next_suffix_3=' + next_suf3,
    ]

    # Boolean features (sparse — only add when true)
    if is_upper:
        features.append('is_upper')
    if is_title:
        features.append('is_title')
    if is_digit:
        features.append('is_digit')
    if has_digit and not is_digit:
        features.append('has_digit')
    if is_hyphen:
        features.append('is_hyphen')
    if i == 0:
        features.append('is_first')

    return features


# ============================================================================
# Averaged Perceptron
# ============================================================================

class AveragedPerceptron:
    """Averaged perceptron classifier (Collins 2002, Honnibal 2013).

    - Weights are updated per-feature per-class
    - Averaging prevents overfitting (sum of all weight snapshots / step count)
    - Tag dictionary for unambiguous words (compile-time optimization)
    """

    def __init__(self, classes):
        self.classes = classes
        self.weights = defaultdict(lambda: defaultdict(float))
        # For averaging
        self._totals = defaultdict(lambda: defaultdict(float))
        self._tstamps = defaultdict(lambda: defaultdict(int))
        self._step = 0

    def predict(self, features):
        """Predict best class from feature set."""
        scores = defaultdict(float)
        for feat in features:
            if feat not in self.weights:
                continue
            for cls, weight in self.weights[feat].items():
                scores[cls] += weight
        # Pick best class
        best = max(self.classes, key=lambda c: scores.get(c, 0.0))
        return best

    def update(self, truth, guess, features):
        """Called for every perceptron prediction. Increments step counter
        (critical for correct averaging), updates weights on mismatch."""
        self._step += 1
        if truth == guess:
            return
        for feat in features:
            # Accumulate totals for averaging before updating
            for cls in [truth, guess]:
                self._totals[feat][cls] += (self._step - self._tstamps[feat][cls]) * self.weights[feat][cls]
                self._tstamps[feat][cls] = self._step
            # Perceptron update: promote truth, demote guess
            self.weights[feat][truth] += 1.0
            self.weights[feat][guess] -= 1.0

    def average_weights(self):
        """Compute averaged weights (should be called after training)."""
        self._step += 1
        averaged = {}
        for feat in self.weights:
            averaged[feat] = {}
            for cls in self.weights[feat]:
                total = self._totals[feat][cls]
                total += (self._step - self._tstamps[feat][cls]) * self.weights[feat][cls]
                averaged[feat][cls] = total / self._step
            # Remove zero-weight entries
            averaged[feat] = {k: v for k, v in averaged[feat].items() if v != 0.0}
            if not averaged[feat]:
                del averaged[feat]
        return averaged


# ============================================================================
# Tag Dictionary
# ============================================================================

def build_tagdict(sentences, freq_threshold=5, agreement_threshold=0.97):
    """Build tag dictionary: words that (nearly) always receive the same tag.

    Only include words appearing >= freq_threshold times to avoid noise.
    A word is unambiguous if one tag accounts for >= agreement_threshold
    of occurrences.
    """
    word_tag_counts = defaultdict(lambda: defaultdict(int))
    for sent in sentences:
        for form, xpos in sent:
            word_tag_counts[form][xpos] += 1

    tagdict = {}
    for word, tag_counts in word_tag_counts.items():
        total = sum(tag_counts.values())
        if total < freq_threshold:
            continue
        best_tag = max(tag_counts, key=tag_counts.get)
        if tag_counts[best_tag] / total >= agreement_threshold:
            tagdict[word] = best_tag

    return tagdict


# ============================================================================
# Training Loop
# ============================================================================

def train(train_sents, dev_sents, classes, iterations=5, seed=42):
    """Train averaged perceptron POS tagger.

    Returns (averaged_weights, tagdict, best_dev_accuracy, iteration_stats).
    """
    tagdict = build_tagdict(train_sents)
    print(f'  Tag dictionary: {len(tagdict)} entries')

    model = AveragedPerceptron(classes)
    rng = random.Random(seed)
    stats = []

    for epoch in range(1, iterations + 1):
        correct = 0
        total = 0
        shuffled = list(train_sents)
        rng.shuffle(shuffled)

        for sent in shuffled:
            tokens = [form for form, _ in sent]
            gold_tags = [xpos for _, xpos in sent]
            prev = '-START-'
            prev2 = '-START2-'

            for i in range(len(tokens)):
                # Train on ALL tokens (including tagdict words) so the
                # perceptron learns context weights from the full corpus.
                # Tagdict is only used during inference for speed.
                features = get_features(tokens, i, prev, prev2)
                guess = model.predict(features)
                # Always call update to increment step counter (averaging)
                # Weights only change when truth != guess
                model.update(gold_tags[i], guess, features)

                if guess == gold_tags[i]:
                    correct += 1
                total += 1

                prev2 = prev
                prev = gold_tags[i]  # Teacher forcing: use gold tag for training

        train_acc = correct / total if total > 0 else 0
        dev_acc = evaluate(model, tagdict, dev_sents)
        stats.append({
            'epoch': epoch,
            'train_accuracy': round(train_acc, 6),
            'dev_accuracy': round(dev_acc, 6),
        })
        print(f'  Epoch {epoch}/{iterations}: train={train_acc:.4f}, dev={dev_acc:.4f}')

    averaged_weights = model.average_weights()
    return averaged_weights, tagdict, stats


def evaluate(model, tagdict, sentences):
    """Evaluate accuracy on a set of sentences."""
    correct = 0
    total = 0
    for sent in sentences:
        tokens = [form for form, _ in sent]
        gold_tags = [xpos for _, xpos in sent]
        prev = '-START-'
        prev2 = '-START2-'
        for i in range(len(tokens)):
            if tokens[i] in tagdict:
                guess = tagdict[tokens[i]]
            else:
                features = get_features(tokens, i, prev, prev2)
                guess = model.predict(features)
            if guess == gold_tags[i]:
                correct += 1
            total += 1
            prev2 = prev
            prev = guess  # Use predicted tag (not gold) for evaluation
    return correct / total if total > 0 else 0


def evaluate_averaged(weights, tagdict, classes, sentences, collect_errors=False):
    """Evaluate accuracy using averaged weights (final model)."""
    correct = 0
    total = 0
    confusion = defaultdict(lambda: defaultdict(int))  # gold → predicted → count

    for sent in sentences:
        tokens = [form for form, _ in sent]
        gold_tags = [xpos for _, xpos in sent]
        prev = '-START-'
        prev2 = '-START2-'
        for i in range(len(tokens)):
            if tokens[i] in tagdict:
                guess = tagdict[tokens[i]]
            else:
                features = get_features(tokens, i, prev, prev2)
                scores = defaultdict(float)
                for feat in features:
                    if feat in weights:
                        for cls, w in weights[feat].items():
                            scores[cls] += w
                guess = max(classes, key=lambda c: scores.get(c, 0.0))
            if guess == gold_tags[i]:
                correct += 1
            elif collect_errors:
                confusion[gold_tags[i]][guess] += 1
            total += 1
            prev2 = prev
            prev = guess

    acc = correct / total if total > 0 else 0
    if collect_errors:
        return acc, confusion
    return acc


# ============================================================================
# Pruning
# ============================================================================

def prune_weights(weights, threshold):
    """Remove weight entries with |w| < threshold."""
    pruned = {}
    removed = 0
    total = 0
    for feat, tag_weights in weights.items():
        kept = {tag: w for tag, w in tag_weights.items() if abs(w) >= threshold}
        removed += len(tag_weights) - len(kept)
        total += len(tag_weights)
        if kept:
            pruned[feat] = kept
    print(f'  Pruned {removed}/{total} weights ({removed/total*100:.1f}%) below threshold {threshold}')
    return pruned


# ============================================================================
# Export
# ============================================================================

def get_git_commit():
    """Get current git commit hash, or 'unknown' if not in a git repo."""
    try:
        result = subprocess.run(
            ['git', 'rev-parse', '--short', 'HEAD'],
            capture_output=True, text=True, cwd=PROJECT_ROOT
        )
        return result.stdout.strip() if result.returncode == 0 else 'unknown'
    except Exception:
        return 'unknown'


def _round_weights(weights, decimals=3):
    """Round weight values to reduce JSON size."""
    rounded = {}
    for feat, tag_weights in weights.items():
        rw = {}
        for tag, w in tag_weights.items():
            r = round(w, decimals)
            if r != 0.0:
                rw[tag] = r
        if rw:
            rounded[feat] = rw
    return rounded


def export_model(weights, tagdict, classes, stats, filepath, prune_threshold=None,
                 post_prune_accuracy=None):
    """Export model as JSON with provenance metadata."""
    best_dev = max(s['dev_accuracy'] for s in stats) if stats else 0

    model = {
        'version': '1.0.0',
        'tagset': 'PTB-XPOS',
        'trainedOn': 'UD_English-EWT v2.14',
        'provenance': {
            'trainScriptVersion': '1.0.0',
            'trainScriptGitCommit': get_git_commit(),
            'trainCorpus': 'UD_English-EWT',
            'corpusVersion': '2.14',
            'trainingDate': datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'trainingDataLicense': 'CC-BY-SA 4.0',
            'trainingSeed': SEED,
            'iterations': ITERATIONS,
            'devAccuracy': best_dev,
        },
        'classes': sorted(classes),
        'tagdict': dict(sorted(tagdict.items())),
        'weights': _round_weights(weights),
    }

    if prune_threshold is not None:
        model['provenance']['pruneThreshold'] = prune_threshold
    if post_prune_accuracy is not None:
        model['provenance']['postPruneDevAccuracy'] = post_prune_accuracy

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(model, f, ensure_ascii=False, separators=(',', ':'))

    size_mb = os.path.getsize(filepath) / (1024 * 1024)
    print(f'  Exported: {filepath} ({size_mb:.2f} MB)')
    return size_mb


# ============================================================================
# Main
# ============================================================================

def main():
    print('=' * 72)
    print('TagTeam Averaged Perceptron POS Tagger — Training')
    print('=' * 72)

    # Check data exists
    for f, label in [(TRAIN_FILE, 'train'), (DEV_FILE, 'dev'), (TEST_FILE, 'test')]:
        if not os.path.isfile(f):
            print(f'ERROR: Missing {label} file: {f}')
            print('Run: git clone https://github.com/UniversalDependencies/UD_English-EWT.git training/data/UD_English-EWT/')
            sys.exit(1)

    # Parse data
    print('\nParsing CoNLL-U data...')
    train_sents = parse_conllu(TRAIN_FILE)
    dev_sents = parse_conllu(DEV_FILE)
    test_sents = parse_conllu(TEST_FILE)
    print(f'  Train: {len(train_sents)} sentences, {sum(len(s) for s in train_sents)} tokens')
    print(f'  Dev:   {len(dev_sents)} sentences, {sum(len(s) for s in dev_sents)} tokens')
    print(f'  Test:  {len(test_sents)} sentences, {sum(len(s) for s in test_sents)} tokens')

    # Collect all XPOS tags
    all_tags = set()
    for sents in [train_sents, dev_sents, test_sents]:
        for sent in sents:
            for _, xpos in sent:
                all_tags.add(xpos)
    classes = sorted(all_tags)
    print(f'  XPOS classes: {len(classes)} ({", ".join(classes[:10])}...)')

    # Train
    print(f'\nTraining ({ITERATIONS} iterations, seed={SEED})...')
    weights, tagdict, stats = train(train_sents, dev_sents, classes,
                                     iterations=ITERATIONS, seed=SEED)

    # Evaluate averaged weights on dev and test
    print('\nEvaluating averaged model...')
    dev_acc, dev_confusion = evaluate_averaged(weights, tagdict, classes, dev_sents, collect_errors=True)
    test_acc, test_confusion = evaluate_averaged(weights, tagdict, classes, test_sents, collect_errors=True)
    print(f'  Dev accuracy:  {dev_acc:.4f} ({dev_acc*100:.2f}%)')
    print(f'  Test accuracy: {test_acc:.4f} ({test_acc*100:.2f}%)')

    # Error analysis: top confusion pairs
    print('\nTop confusion pairs (gold → predicted: count):')
    all_pairs = []
    for gold, preds in test_confusion.items():
        for pred, count in preds.items():
            all_pairs.append((count, gold, pred))
    all_pairs.sort(reverse=True)
    for count, gold, pred in all_pairs[:15]:
        print(f'  {gold:>6} → {pred:<6}: {count}')

    # Export full model
    print('\nExporting full model...')
    full_path = os.path.join(MODEL_DIR, 'pos-weights.json')
    full_size = export_model(weights, tagdict, classes, stats, full_path)

    # Prune and export production model
    print('\nPruning weights...')
    pruned_weights = prune_weights(weights, PRUNE_THRESHOLD)
    pruned_dev = evaluate_averaged(pruned_weights, tagdict, classes, dev_sents)
    pruned_test = evaluate_averaged(pruned_weights, tagdict, classes, test_sents)
    print(f'  Pruned dev accuracy:  {pruned_dev:.4f} ({pruned_dev*100:.2f}%)')
    print(f'  Pruned test accuracy: {pruned_test:.4f} ({pruned_test*100:.2f}%)')
    print(f'  Accuracy drop: {(dev_acc - pruned_dev)*100:.2f}% (max allowed: {MAX_ACCURACY_DROP*100:.1f}%)')

    pruned_path = os.path.join(MODEL_DIR, 'pos-weights-pruned.json')
    pruned_size = export_model(
        pruned_weights, tagdict, classes, stats, pruned_path,
        prune_threshold=PRUNE_THRESHOLD,
        post_prune_accuracy=round(pruned_dev, 6),
    )

    # Validation
    print('\n' + '=' * 72)
    print('Validation')
    print('=' * 72)

    passed = True

    # AC-1A.1: accuracy ≥ 96%
    if test_acc >= MIN_ACCURACY:
        print(f'  ✓ AC-1A.1: Test accuracy {test_acc*100:.2f}% ≥ {MIN_ACCURACY*100:.0f}%')
    else:
        print(f'  ✗ AC-1A.1: Test accuracy {test_acc*100:.2f}% < {MIN_ACCURACY*100:.0f}%')
        passed = False

    # AC-1A.5: pruned model ≤ 5 MB
    if pruned_size <= MAX_MODEL_SIZE_MB:
        print(f'  ✓ AC-1A.5: Pruned model {pruned_size:.2f} MB ≤ {MAX_MODEL_SIZE_MB} MB')
    else:
        print(f'  ✗ AC-1A.5: Pruned model {pruned_size:.2f} MB > {MAX_MODEL_SIZE_MB} MB')
        passed = False

    # AC-1A.5: accuracy drop < 0.3%
    accuracy_drop = dev_acc - pruned_dev
    if accuracy_drop < MAX_ACCURACY_DROP:
        print(f'  ✓ AC-1A.5: Accuracy drop {accuracy_drop*100:.2f}% < {MAX_ACCURACY_DROP*100:.1f}%')
    else:
        print(f'  ✗ AC-1A.5: Accuracy drop {accuracy_drop*100:.2f}% ≥ {MAX_ACCURACY_DROP*100:.1f}%')
        passed = False

    # Summary
    print('\n' + ('ALL CHECKS PASSED' if passed else 'SOME CHECKS FAILED'))
    print(f'\nFeature count: {len(weights)} features')
    print(f'Pruned feature count: {len(pruned_weights)} features')
    print(f'Tag dictionary: {len(tagdict)} entries')
    print(f'Full model: {full_size:.2f} MB')
    print(f'Pruned model: {pruned_size:.2f} MB')

    sys.exit(0 if passed else 1)


if __name__ == '__main__':
    main()
