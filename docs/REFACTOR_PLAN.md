# TagTeam.js Refactor Plan: Five-Layer NLP Foundation Upgrade

**Version**: 1.0
**Date**: 2026-02-13
**Status**: Proposal
**Goal**: Achieve ~95% end-to-end accuracy on semantic graph generation without LLMs

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Assessment](#2-current-architecture-assessment)
3. [Target Architecture](#3-target-architecture)
4. [Layer 1: Averaged Perceptron POS Tagger](#4-layer-1-averaged-perceptron-pos-tagger)
5. [Layer 2: Transition-Based Dependency Parser](#5-layer-2-transition-based-dependency-parser)
6. [Layer 3: Tree-Based Entity & Act Extraction](#6-layer-3-tree-based-entity--act-extraction)
7. [Layer 4: Copular & Stative Sentence Handling](#7-layer-4-copular--stative-sentence-handling)
8. [Layer 5: NER Upgrade with Gazetteers](#8-layer-5-ner-upgrade-with-gazetteers)
9. [What Gets Preserved vs. Replaced](#9-what-gets-preserved-vs-replaced)
10. [Training Pipeline](#10-training-pipeline)
11. [Integration Strategy](#11-integration-strategy)
12. [Testing & Validation](#12-testing--validation)
13. [Risk Assessment](#13-risk-assessment)
14. [Implementation Phases & Dependencies](#14-implementation-phases--dependencies)
15. [Bundle Size Budget](#15-bundle-size-budget)
16. [References & Resources](#16-references--resources)

---

## 1. Executive Summary

TagTeam.js produces BFO/CCO-compliant JSON-LD semantic graphs from natural language. The
ontology mapping layer (two-tier architecture, SHACL validation, ethical value detection) is
sound and should be preserved. However, the NLP foundation — a lexicon-based POS tagger with
8 contextual rules, linear-scan entity/act extraction, and no syntactic parser — creates a
hard ceiling on accuracy.

This plan replaces the NLP foundation in five layers while keeping the ontology mapping,
security modules, and existing API surface intact. The approach uses proven pre-LLM statistical
NLP techniques (averaged perceptron, arc-eager parsing, gazetteer-augmented NER) that run
entirely in JavaScript with no server dependency.

### Expected Accuracy Improvement

| Component               | Current (est.) | After Refactor | Technique                      |
|-------------------------|----------------|----------------|--------------------------------|
| POS tagging             | ~88-90%        | 96-97%         | Averaged perceptron            |
| Entity boundaries       | ~75-80%        | 88-92%         | Dependency subtrees + gazetteers |
| Predicate identification| ~70%           | 90-93%         | Dependency root + verb detection |
| Role assignment         | ~60%           | 85-90%         | Dependency relation mapping    |
| Copular/stative         | ~20%           | 95%+           | `cop` dependency pattern       |
| **End-to-end graph**    | **~40-50%**    | **~85-92%**    | Combined pipeline              |

The final 92%+ to 95% is achievable through domain-specific tuning on TagTeam's target
sentence types (ethical deliberation, organizational descriptions, stakeholder analysis).

---

## 2. Current Architecture Assessment

### What works

- **BFO/CCO ontology mapping**: Two-tier architecture (ICE DiscourseReferents + IC real-world
  entities) is well-designed and ontologically sound
- **Ethical value detection**: Week 2b pipeline (ValueMatcher, ValueScorer, EthicalProfiler)
  achieves 100% profile generation on the 20-scenario corpus
- **SHACL validation & complexity budget**: Graph quality constraints work correctly
- **Security hardening**: Input validation, output sanitization, audit logging
- **Ambiguity detection & interpretation lattice**: Phase 5-6 modules are architecturally clean
- **Build & deployment**: Custom UMD bundler, browser + Node.js compatibility

### What doesn't work

| Component | Problem | Root Cause |
|-----------|---------|------------|
| `POSTagger.js` | ~88-90% accuracy, cascading errors | Lexicon lookup + 8 hand-written rules |
| `EntityExtractor.js` | Fragments multi-word entities, misses NP boundaries | No syntactic parse; uses Compromise.js nouns or NPChunker heuristics |
| `ActExtractor.js` | Extracts spurious verbs (e.g., "border" in "Border Protection") | Linear scan for verbs; no dependency structure to constrain |
| `ActExtractor.js` | Assigns wrong agent/patient | Position-based heuristic (before verb = agent, after = patient) |
| `SentenceModeClassifier.js` | Misses copular sentences ("X is a Y") | Only 9 stative verbs; "be" is not in the taxonomy |
| `ComplexDesignatorDetector.js` | Correct detection but doesn't prevent downstream errors | Runs after entity extraction; shadow suppression has span mismatches |

### The fundamental gap

**There is no syntactic parser.** The system goes from POS tags directly to semantic roles
using token-level linear scanning. This is the architectural decision that creates the ceiling.

---

## 3. Target Architecture

### Before (Current Pipeline)

```
Input Text
    |
    v
[Lexicon POS Tagger] ---- 8 rules, ~88-90% accuracy
    |
    v
[Compromise.js NLP] ----- Verb/noun extraction
    |
    v
[NPChunker] ------------- Regex-like chunking from POS tags
    |
    v
[EntityExtractor] -------- Linear scan, no structure
    |
    v
[ComplexDesignatorDetector] -- Capitalization heuristics
    |
    v
[ActExtractor] ----------- Linear scan: "before verb = agent"
    |
    v
[BFO/CCO Mapping] ------- Ontology layer (PRESERVED)
    |
    v
JSON-LD Graph
```

### After (Refactored Pipeline)

```
Input Text
    |
    v
[Tokenizer] ------------- Character-level (existing, preserved)
    |
    v
[Perceptron POS Tagger] - Trained on Penn Treebank, ~97% accuracy     [NEW - Layer 1]
    |
    v
[Arc-Eager Dep Parser] -- Trained on UD English-EWT, ~91% LAS         [NEW - Layer 2]
    |
    v
[Dependency Tree]
    |
    +---> [Tree Entity Extractor] -- NP subtrees from dep tree         [REWRITE - Layer 3]
    |         |
    |         +---> [Gazetteer NER] -- Organization/person lists       [NEW - Layer 5]
    |
    +---> [Tree Act Extractor] ---- Root verb + dep relations          [REWRITE - Layer 3]
    |         |
    |         +---> [Copular Detector] -- cop/attr patterns            [NEW - Layer 4]
    |
    +---> [Tree Role Assigner] ---- nsubj=agent, dobj=patient, etc.    [REWRITE - Layer 3]
    |
    v
[BFO/CCO Mapping] ------- Ontology layer (PRESERVED)
    |
    v
JSON-LD Graph
```

### Key architectural change

The dependency tree becomes the **single source of truth** for all downstream extraction.
Entity boundaries, predicate identification, and role assignment all derive from the tree
structure rather than from independent heuristic scans over the token sequence.

---

## 4. Layer 1: Averaged Perceptron POS Tagger

### What it replaces

`src/core/POSTagger.js` — lexicon lookup (~297k entries) + 8 transformation rules

### Technical approach

The averaged perceptron is a linear classifier that achieves 96-97% POS accuracy on standard
benchmarks. It was the default POS tagger in NLTK and the original tagger in spaCy v1. It is
not a neural network — it's a weighted feature lookup that runs in O(n) time.

**Algorithm:**
1. For each token in the sentence, extract features (see below)
2. For each possible POS tag, compute a score = sum of (feature weight * feature presence)
3. Predict the tag with the highest score
4. Use the predicted tag as a feature for the next token (left-to-right greedy decoding)

**Feature template** (following Honnibal 2013):

```
Feature               Example for "Border" in "and Border Protection"
-----------           ------------------------------------------------
bias                  always 1
word                  "Border"
word_lower            "border"
suffix_3              "der"
suffix_2              "er"
suffix_1              "r"
prefix_1              "B"
is_upper              true
is_title              true
is_digit              false
is_hyphen             false
prev_word             "and"
prev_tag              "CC"        (predicted tag of previous token)
prev_prev_tag         "NNP"       (predicted tag of token before that)
prev_word+tag         "and+CC"
prev_tag+word         "CC+Border"
prev_prev_tag+prev_tag "NNP+CC"
next_word             "Protection"
next_suffix_3         "ion"
```

Each feature maps to a weight vector (one weight per possible tag). The total score for
a tag is the sum of all active feature weights for that tag. ~18-20 features per token,
~45 possible tags = ~900 lookups per token. Extremely fast.

**Why this fixes the "Border" problem:**
- `is_title: true` + `prev_tag: CC` + `prev_word: and` + `next_word: Protection`
- The trained weights strongly associate this feature combination with NNP (proper noun)
- The current tagger only checks the lexicon (where "border" has VB as a possible tag)
  and has no rule for "capitalized word between two other capitalized words"

### Training

- **Data**: Penn Treebank WSJ sections 0-18 (training), 19-21 (dev), 22-24 (test)
- **Alternative**: Universal Dependencies English-EWT (free, CC-BY-SA 4.0, 254k words)
- **Tool**: Python training script (~200 lines, following Honnibal's blog post)
- **Iterations**: 5-10 passes over training data (converges quickly)
- **Output**: JSON file with feature-weight mappings

### Model format (JSON)

```json
{
  "weights": {
    "bias": { "NN": 0.32, "VB": -0.12, "NNP": 0.08, ... },
    "is_title": { "NNP": 2.41, "NN": -0.93, "VB": -1.87, ... },
    "suffix_3=ion": { "NN": 1.52, "VB": -0.44, ... },
    ...
  },
  "tagdict": {
    "the": "DT",
    "is": "VBZ",
    ...
  },
  "classes": ["NN", "NNS", "NNP", "VB", "VBD", "VBG", "VBN", "VBP", "VBZ", ...]
}
```

The `tagdict` is an ambiguity-free lookup for the most common words (words that always have
the same tag in training data). This handles ~50% of tokens without any feature computation.

### JS implementation

```
New file: src/core/PerceptronTagger.js (~150-200 lines)
New file: src/data/pos-weights.json (~3-5 MB)
```

**Inference code structure:**

```javascript
class PerceptronTagger {
  constructor(model) {
    this.weights = model.weights;   // feature -> tag -> weight
    this.tagdict = model.tagdict;   // word -> unambiguous tag
    this.classes = model.classes;    // list of all tags
  }

  tag(tokens) {
    const tags = [];
    let prev = '-START-', prev2 = '-START2-';

    for (let i = 0; i < tokens.length; i++) {
      // Fast path: unambiguous words
      if (this.tagdict[tokens[i]]) {
        tags.push(this.tagdict[tokens[i]]);
        prev2 = prev;
        prev = tags[i];
        continue;
      }

      // Extract features
      const features = this._getFeatures(tokens, i, prev, prev2);

      // Score each tag
      const scores = {};
      for (const tag of this.classes) scores[tag] = 0;
      for (const feat of features) {
        const w = this.weights[feat];
        if (!w) continue;
        for (const tag in w) scores[tag] += w[tag];
      }

      // Pick best tag
      const best = this.classes.reduce((a, b) => scores[a] >= scores[b] ? a : b);
      tags.push(best);
      prev2 = prev;
      prev = best;
    }

    return tags;
  }
}
```

### Expected performance

- **Accuracy**: 96-97% on WSJ test set (matching published results)
- **Speed**: >100k tokens/sec in JS (feature extraction is string operations + hash lookups)
- **Model size**: 3-5 MB JSON (comparable to existing 4.1 MB lexicon it replaces)

### Migration path

1. The new tagger outputs Penn Treebank tags (same tagset as current `POSTagger.js`)
2. All downstream code that reads POS tags continues to work unchanged
3. The existing `lexicon.js` (4.1 MB) is no longer needed for POS tagging but may be
   retained as a backup/fallback if desired
4. `POSTagger.js` is replaced, not modified

---

## 5. Layer 2: Transition-Based Dependency Parser

### What it adds

No existing component — this is entirely new. It provides syntactic structure that the
current system completely lacks.

### Technical approach

The **arc-eager transition-based parser** (Nivre 2003, 2008) processes tokens left-to-right
in a single pass, building a dependency tree incrementally. At each step, a classifier decides
one of four actions:

| Transition | Effect | Example |
|------------|--------|---------|
| **SHIFT** | Push next token onto stack | Reading "doctor" |
| **LEFT-ARC(label)** | Stack top is dependent of buffer front | "The" ←det— "doctor" |
| **RIGHT-ARC(label)** | Buffer front is dependent of stack top | "doctor" —nsubj→ "must" |
| **REDUCE** | Pop stack top (already has head) | Done with "The" |

The classifier is another averaged perceptron, trained on gold-standard dependency trees.

**Feature template** for the parser (following MaltParser/Nivre 2006):

```
Feature               Description
-----------           ------------------------------------------------
stack[0].word         Top of stack word
stack[0].tag          Top of stack POS tag
stack[0].deprel       Top of stack dependency label (if assigned)
stack[1].word         Second element on stack
stack[1].tag          Second element POS tag
buffer[0].word        Front of buffer word
buffer[0].tag         Front of buffer POS tag
buffer[1].word        Second in buffer
buffer[1].tag         Second in buffer POS tag
buffer[2].tag         Third in buffer POS tag
stack[0].left_child   Leftmost child of stack top
stack[0].right_child  Rightmost child of stack top
buffer[0].left_child  Leftmost child of buffer front
```

Combined features (pairs and triples of the above) bring the total to ~40-60 features per
parser state. Each feature maps to a weight vector over all possible transitions.

### What dependency labels mean for TagTeam

The Universal Dependencies label set maps directly to TagTeam's needs:

| UD Label | Meaning | TagTeam Use |
|----------|---------|-------------|
| `nsubj` | Nominal subject | Agent role |
| `dobj` / `obj` | Direct object | Patient role |
| `iobj` | Indirect object | Recipient role |
| `obl` | Oblique argument | Instrument, location, beneficiary |
| `nmod` | Nominal modifier | Entity qualifier |
| `amod` | Adjectival modifier | Quality node |
| `cop` | Copula | Stative/relational sentence marker |
| `attr` / `xcomp` | Predicate nominal | Type classification |
| `conj` | Conjunction | Coordination (and/or) |
| `appos` | Apposition | Alias/abbreviation (e.g., "CBP") |
| `mark` | Subordinating conjunction | Clause boundary |
| `relcl` | Relative clause | Embedded predication |
| `nsubjpass` / `nsubj:pass` | Passive subject | Patient (not agent!) |
| `compound` | Compound word | Multi-word entity component |
| `flat` | Flat name | Multi-word proper name component |

### Training

- **Data**: Universal Dependencies English-EWT (UD_English-EWT)
  - 254,820 words, 16,622 sentences
  - Free download, CC-BY-SA 4.0 license
  - GitHub: `UniversalDependencies/UD_English-EWT`
  - CoNLL-U format with UPOS tags, dependency heads, and dependency labels
- **Algorithm**: Averaged perceptron with dynamic oracle (Goldberg & Nivre 2012)
- **Training**: Python script, 10-15 iterations, ~10 minutes on commodity hardware
- **Output**: JSON file with transition-weight mappings

### Model format (JSON)

```json
{
  "weights": {
    "s0.tag=VBZ": { "SHIFT": 0.12, "LEFT-ARC_nsubj": 1.87, "RIGHT-ARC_dobj": -0.34, ... },
    "s0.tag=VBZ+b0.tag=DT": { "SHIFT": 2.31, ... },
    ...
  },
  "labels": ["nsubj", "dobj", "iobj", "obl", "nmod", "amod", "det", "cop", ...],
  "transitions": ["SHIFT", "REDUCE", "LEFT-ARC_nsubj", "LEFT-ARC_det", "RIGHT-ARC_dobj", ...]
}
```

### JS implementation

```
New file: src/core/DependencyParser.js (~250-350 lines)
New file: src/data/dep-weights.json (~5-10 MB)
```

**Core data structures:**

```javascript
class DependencyParser {
  constructor(model) {
    this.weights = model.weights;
    this.transitions = model.transitions;
  }

  parse(tokens, tags) {
    // Initialize: stack = [ROOT], buffer = all tokens
    const stack = [{ id: 0, word: 'ROOT', tag: 'ROOT' }];
    const buffer = tokens.map((w, i) => ({ id: i + 1, word: w, tag: tags[i], head: -1, deprel: null }));
    const arcs = [];

    while (buffer.length > 0 || stack.length > 1) {
      const features = this._extractFeatures(stack, buffer, arcs);
      const scores = this._score(features);
      const valid = this._getValidTransitions(stack, buffer);
      const best = valid.reduce((a, b) => scores[a] >= scores[b] ? a : b);

      this._apply(best, stack, buffer, arcs);
    }

    return arcs; // [{dependent: 3, head: 1, label: 'nsubj'}, ...]
  }
}
```

**Output for "CBP is a component of DHS":**

```javascript
[
  { dependent: 1, head: 2, label: 'nsubj', word: 'CBP' },
  { dependent: 2, head: 0, label: 'root', word: 'is' },
  { dependent: 3, head: 4, label: 'det', word: 'a' },
  { dependent: 4, head: 2, label: 'attr', word: 'component' },
  { dependent: 5, head: 4, label: 'prep', word: 'of' },
  { dependent: 6, head: 5, label: 'pobj', word: 'DHS' }
]
```

Every downstream question ("who is the subject?", "is this copular?", "what does the PP
modify?") becomes a simple tree traversal.

### Expected performance

- **Accuracy**: 90-93% UAS, 88-91% LAS on UD English-EWT test set
- **Speed**: >5k sentences/sec (linear-time algorithm, ~2n transitions per sentence)
- **Model size**: 5-10 MB JSON

---

## 6. Layer 3: Tree-Based Entity & Act Extraction

### What it replaces

- `EntityExtractor.js` — linear scan + Compromise.js noun extraction + NPChunker heuristics
- `ActExtractor.js` — linear scan + Compromise.js verb extraction + position-based role
  assignment
- `RoleDetector.js` — heuristic role inference

These three files (~250 KB combined) would be rewritten to operate on the dependency tree
output from Layer 2.

### New entity extraction: dependency subtrees

Instead of scanning for nouns and trying to guess boundaries, extract entity spans by
collecting **the full subtree** rooted at each nominal head:

```javascript
function extractEntities(depTree) {
  const entities = [];

  for (const token of depTree.tokens) {
    // Entity heads: nouns that are arguments of the verb (nsubj, dobj, iobj, obl)
    if (['nsubj', 'dobj', 'obj', 'iobj', 'obl', 'nsubjpass'].includes(token.deprel)) {
      const span = depTree.getSubtree(token.id);  // All descendants
      const text = span.map(t => t.word).join(' ');

      entities.push({
        headWord: token.word,
        headTag: token.tag,
        fullText: text,
        tokens: span,
        role: token.deprel,
        start: Math.min(...span.map(t => t.startOffset)),
        end: Math.max(...span.map(t => t.endOffset))
      });
    }
  }

  return entities;
}
```

**What this fixes:**
- "Customs and Border Protection (CBP)" is the full subtree under "Protection"
  (compound + cc + conj + appos = one entity, not four)
- "Department of Homeland Security" is the full subtree under "Department"
  (prep + pobj + compound = one entity)
- No more shadow entity suppression needed — entity boundaries are correct from the start

### New act extraction: root verb + dependency labels

Instead of scanning for verbs and guessing agent/patient by position:

```javascript
function extractActs(depTree) {
  const acts = [];

  for (const token of depTree.tokens) {
    // Verbs: tokens tagged VB* that are not inside a nominal (e.g., not a gerund modifier)
    if (token.tag.startsWith('VB') && isPredicatePosition(token, depTree)) {
      const act = {
        verb: token.word,
        lemma: lemmatize(token.word),
        tag: token.tag,
        isCopular: hasDependentWithLabel(token, depTree, 'cop') ||
                   (token.word === 'is' && hasDependentWithLabel(token, depTree, 'attr')),
        isPassive: hasDependentWithLabel(token, depTree, 'nsubjpass') ||
                   hasDependentWithLabel(token, depTree, 'auxpass'),
        agent: null,
        patient: null,
        obliques: []
      };

      // Agent: nsubj (active) or obl_agent/nmod_agent (passive "by" phrase)
      const nsubj = getDependentByLabel(token, depTree, 'nsubj');
      const nsubjpass = getDependentByLabel(token, depTree, 'nsubjpass');

      if (act.isPassive) {
        act.patient = nsubjpass;  // Passive subject IS the patient
        act.agent = getByPhrase(token, depTree);  // "by X"
      } else {
        act.agent = nsubj;
        act.patient = getDependentByLabel(token, depTree, ['dobj', 'obj']);
      }

      // Oblique arguments: obl, iobj
      act.obliques = getDependentsByLabel(token, depTree, ['obl', 'iobj']);

      acts.push(act);
    }
  }

  return acts;
}
```

**What this fixes:**
- Agent/patient assignment is derived from labeled dependency edges, not token position
- Passive voice is handled by checking for `nsubjpass` — no heuristic pattern matching
- PP arguments (location, instrument, beneficiary) come from `obl` edges with the
  preposition preserved as a subtype
- Verbs inside proper nouns (e.g., "Border" in "Border Protection") are not extracted
  because they have a `compound` or `flat` label, not a predicate position

### New role mapping: dependency labels to BFO roles

The mapping from UD dependency labels to BFO/CCO roles becomes a clean lookup table:

```javascript
const DEP_TO_BFO_ROLE = {
  // Post-cleanup: all roles are bfo:Role (BFO_0000023) with rdfs:label for distinction
  'nsubj':     { role: 'bfo:Role', label: 'AgentRole',     bfo: 'bfo:BFO_0000023' },
  'dobj':      { role: 'bfo:Role', label: 'PatientRole',   bfo: 'bfo:BFO_0000023' },
  'obj':       { role: 'bfo:Role', label: 'PatientRole',   bfo: 'bfo:BFO_0000023' },
  'iobj':      { role: 'bfo:Role', label: 'RecipientRole', bfo: 'bfo:BFO_0000023' },
  'nsubjpass': { role: 'bfo:Role', label: 'PatientRole',   bfo: 'bfo:BFO_0000023' },
  'obl':       { role: 'bfo:Role', label: 'ObliqueRole',   bfo: 'bfo:BFO_0000023' },  // Subtyped by prep
};

// Oblique subtypes by preposition (all bfo:Role with rdfs:label)
const PREP_TO_ROLE = {
  'for':   { role: 'bfo:Role', label: 'BeneficiaryRole' },
  'with':  { role: 'bfo:Role', label: 'InstrumentRole' },
  'at':    { role: 'bfo:Role', label: 'LocationRole' },
  'in':    { role: 'bfo:Role', label: 'LocationRole' },
  'on':    { role: 'bfo:Role', label: 'LocationRole' },
  'from':  { role: 'bfo:Role', label: 'SourceRole' },
  'to':    { role: 'bfo:Role', label: 'DestinationRole' },
  'by':    { role: 'bfo:Role', label: 'AgentRole' },         // Passive agent
};
```

This replaces the heuristic role inference in `RoleDetector.js` with deterministic mapping
from syntactic structure.

### Estimated code reduction

| Current File | Size | Replacement | Est. Size |
|-------------|------|-------------|-----------|
| `EntityExtractor.js` | 132 KB | `TreeEntityExtractor.js` | ~15-20 KB |
| `ActExtractor.js` | 102 KB | `TreeActExtractor.js` | ~15-20 KB |
| `RoleDetector.js` | 14 KB | `TreeRoleMapper.js` | ~5-8 KB |
| **Total** | **248 KB** | | **~35-48 KB** |

The heuristic complexity in the current extractors exists to compensate for the lack of
syntactic structure. With a dependency tree, most special cases disappear.

---

## 7. Layer 4: Copular & Stative Sentence Handling

### What it replaces

`src/graph/SentenceModeClassifier.js` — hard-coded list of 9 stative verbs

### Technical approach

With a dependency parser, copular sentences are identified by a structural pattern, not a
verb lookup:

**Pattern 1: Copular predication ("X is a Y")**
```
cop
 |
 v
"is" ---attr---> "component" ---nsubj---> "CBP"
                     |
                     +---prep---> "of" ---pobj---> "DHS"
```
Detection: Any token with a `cop` dependent or `be` as root with `attr`/`acomp` child.

**Pattern 2: Existential ("There is/are X")**
```
expl
 |
 v
"There" <---expl--- "is" ---nsubj---> "problem"
```
Detection: Token has both `expl` and `nsubj` dependents.

**Pattern 3: Possessive ("X has Y")**
```
"organization" ---nsubj---> "has" ---dobj---> "members"
```
Detection: Verb lemma is "have" with no auxiliary (distinguishes "has members" from
"has been running").

**Pattern 4: Locative/stative ("X is in Y")**
```
"headquarters" ---nsubj---> "is" ---obl---> "El Paso"
                                     |
                                     +---case---> "in"
```
Detection: Copular verb with `obl` argument instead of `attr`.

### Output

For copular/stative sentences, the output is a **structural assertion** rather than an
IntentionalAct:

```javascript
{
  type: 'StructuralAssertion',
  subject: { /* entity from nsubj subtree */ },
  relation: 'cco:has_part',  // Inferred from "component of"
  object: { /* entity from attr/obl subtree */ },
  copula: 'is',
  confidence: 0.95
}
```

This is already partially implemented in `ActExtractor._createStructuralAssertion()`.
The refactor makes it reliable by triggering from dependency patterns rather than verb
lookups.

### Relation inference from predicate nominal

| Predicate Nominal | Inferred Relation | Example |
|-------------------|-------------------|---------|
| "component of" | `cco:has_part` | "CBP is a component of DHS" |
| "member of" | `cco:has_member` | "She is a member of the team" |
| "part of" | `cco:has_part` | "The engine is part of the car" |
| "type of" | `rdfs:subClassOf` | "A tiger is a type of cat" |
| "example of" | `rdf:type` | "This is an example of injustice" |
| "subset of" | `cco:has_subset` | "Cardiology is a subset of medicine" |
| (other) | `rdf:type` | "She is a doctor" → Person rdf:type Doctor |

This table can be extended as needed — and because it operates on parsed structure, adding
entries doesn't risk breaking unrelated sentences.

---

## 8. Layer 5: NER Upgrade with Gazetteers

### What it replaces

`src/graph/ComplexDesignatorDetector.js` — capitalization-based heuristics for proper names

### Technical approach: Gazetteer + dependency structure

A **gazetteer** is a lookup table of known entities. Combined with the dependency parser's
`compound` and `flat` labels, it provides high-precision NER without statistical models.

**Three-stage NER:**

1. **Dependency-based NP extraction** (from Layer 3): The parser identifies multi-word
   names via `compound` and `flat` edges. "Customs and Border Protection" is one subtree.

2. **Gazetteer lookup**: Check extracted NPs against known entity lists.

3. **Capitalization + context fallback**: For entities not in the gazetteer, use the
   existing ComplexDesignatorDetector heuristics as a fallback.

### Gazetteer sources (all freely available)

| Gazetteer | Size | Source | License |
|-----------|------|--------|---------|
| US Government agencies | ~500 entries | USA.gov | Public domain |
| International organizations | ~2,000 entries | Wikidata SPARQL | CC0 |
| Common person names | ~10,000 entries | US Census Bureau | Public domain |
| Country/state/city names | ~50,000 entries | GeoNames | CC-BY |
| Medical organizations | ~1,000 entries | NLM/WHO | Public domain |
| Religious organizations | ~500 entries | Wikidata | CC0 |

Total gazetteer size: ~200-500 KB JSON (trivial in the context of a 5+ MB bundle).

### Entity type classification

The gazetteer entries include type annotations:

```json
{
  "Customs and Border Protection": { "type": "cco:Organization", "aliases": ["CBP"] },
  "Department of Homeland Security": { "type": "cco:Organization", "aliases": ["DHS"] },
  "United States": { "type": "cco:GeopoliticalOrganization", "rdfs:label": "Nation", "aliases": ["US", "USA"] },
  ...
}
```

This feeds directly into the BFO/CCO entity type system — no inference needed for known
entities.

### Existing code preserved

The `ComplexDesignatorDetector.js` heuristics are retained as the fallback for entities
not in the gazetteer. The dependency parser's `compound`/`flat` labels provide better span
boundaries than the current capitalization-only approach.

---

## 9. What Gets Preserved vs. Replaced

### Preserved (no changes)

| Module | Reason |
|--------|--------|
| `SemanticRoleExtractor.js` | Week 1 API (parse method) — separate from graph pipeline |
| `ContextAnalyzer.js` | Context intensity analysis operates on its own features |
| `CertaintyAnalyzer.js` | Epistemic markers are independent of parse structure |
| `ValueMatcher.js` | Value detection uses keyword patterns, not syntax |
| `ValueScorer.js` | Scoring algorithm is independent |
| `EthicalProfiler.js` | Profiling operates on value/context outputs |
| `RealWorldEntityFactory.js` | Tier 2 entity creation logic is sound |
| `ScarcityAssertionFactory.js` | Scarcity detection is keyword-based |
| `DirectiveExtractor.js` | Modal detection from POS tags still works |
| `ObjectAggregateFactory.js` | Plural entity handling is independent |
| `QualityFactory.js` | Entity qualifiers from `amod` deps (improved) |
| `AssertionEventBuilder.js` | Provenance/assertion events are structural |
| `ContextManager.js` | Graph context management is independent |
| `InformationStaircaseBuilder.js` | IBE provenance is independent |
| `SHMLValidator.js` | SHACL validation operates on output graph |
| `ComplexityBudget.js` | Complexity limits are independent |
| `AmbiguityDetector.js` | Ambiguity detection (enhanced by deps) |
| `InterpretationLattice.js` | Lattice structure is independent |
| `AlternativeGraphBuilder.js` | Alternative readings are independent |
| `JSONLDSerializer.js` | Serialization is independent |
| All ontology modules | TTL parsing, ontology loading are independent |
| All security modules | Input validation, sanitization are independent |
| `Tokenizer.js` | Character-level tokenizer is reused |
| Build system (`scripts/build.js`) | Updated to include new files |

### Replaced

| Current Module | Replacement | Reason |
|---------------|-------------|--------|
| `POSTagger.js` + `lexicon.js` | `PerceptronTagger.js` + `pos-weights.json` | Accuracy: 88% → 97% |
| `NPChunker.js` | Absorbed into TreeEntityExtractor | Chunking done by dep tree |
| `EntityExtractor.js` | `TreeEntityExtractor.js` | Tree patterns replace linear scan |
| `ActExtractor.js` | `TreeActExtractor.js` | Tree patterns replace linear scan |
| `RoleDetector.js` | `TreeRoleMapper.js` | Dep labels replace heuristic inference |
| `SentenceModeClassifier.js` | Absorbed into TreeActExtractor | Copular = dep pattern |
| `PatternMatcher.js` | Evaluate for removal | May be unused after refactor |
| `MatchingStrategies.js` | Evaluate for removal | May be unused after refactor |

### Enhanced (modified but not replaced)

| Module | Enhancement |
|--------|-------------|
| `SemanticGraphBuilder.js` | Orchestrator updated to use dependency tree flow |
| `ComplexDesignatorDetector.js` | Becomes fallback behind gazetteer + dep tree NER |
| `AmbiguityDetector.js` | Can use dep tree for more precise ambiguity detection |
| `ClauseSegmenter.js` | Clause boundaries from `mark`/`relcl` dep labels |

---

## 10. Training Pipeline

### Overview

Training happens **once**, offline, in Python. The trained models are exported as JSON and
shipped with TagTeam.js. End users never need to train anything.

### Directory structure

```
training/
  ├── README.md                  # Setup and training instructions
  ├── requirements.txt           # Python dependencies (numpy, no ML frameworks)
  ├── data/
  │   └── UD_English-EWT/        # Downloaded treebank (CoNLL-U files)
  ├── train_pos_tagger.py        # Train averaged perceptron POS tagger
  ├── train_dep_parser.py        # Train arc-eager dependency parser
  ├── evaluate.py                # Evaluate on test set
  ├── export_models.py           # Export to JSON for JS consumption
  └── models/
      ├── pos-weights.json       # Exported POS tagger model
      └── dep-weights.json       # Exported dependency parser model
```

### Python dependencies

```
numpy          # Array operations for weight averaging
```

No TensorFlow, no PyTorch, no scikit-learn. The averaged perceptron is implementable with
just numpy (or even pure Python). The training scripts are self-contained.

### Training procedure

```bash
# 1. Download UD English-EWT
git clone https://github.com/UniversalDependencies/UD_English-EWT training/data/UD_English-EWT

# 2. Train POS tagger (5 iterations, ~2 minutes)
python training/train_pos_tagger.py \
  --train training/data/UD_English-EWT/en_ewt-ud-train.conllu \
  --dev training/data/UD_English-EWT/en_ewt-ud-dev.conllu \
  --iterations 5 \
  --output training/models/pos-weights.json

# 3. Train dependency parser (10 iterations, ~10 minutes)
python training/train_dep_parser.py \
  --train training/data/UD_English-EWT/en_ewt-ud-train.conllu \
  --dev training/data/UD_English-EWT/en_ewt-ud-dev.conllu \
  --iterations 10 \
  --output training/models/dep-weights.json

# 4. Evaluate
python training/evaluate.py \
  --test training/data/UD_English-EWT/en_ewt-ud-test.conllu \
  --pos-model training/models/pos-weights.json \
  --dep-model training/models/dep-weights.json

# 5. Copy models to TagTeam src/data/
cp training/models/*.json src/data/
```

### Domain fine-tuning (optional, for 92% → 95%)

After the base models are trained on UD-EWT, they can be further tuned on TagTeam-specific
data:

1. Create 100-200 manually annotated sentences from TagTeam's target domains
   (ethical deliberation, organizational descriptions, stakeholder analysis)
2. Format as CoNLL-U
3. Run 2-3 additional training iterations starting from the UD-EWT weights
4. Re-export to JSON

This is standard domain adaptation for perceptron models and typically yields 2-4% accuracy
improvement on in-domain data.

---

## 11. Integration Strategy

### SemanticGraphBuilder.build() — updated flow

The orchestrator (`SemanticGraphBuilder.js`) is the only existing file that needs significant
modification. The new flow:

```javascript
build(text, options) {
  // Step 1: Tokenize (existing Tokenizer.js)
  const tokens = this.tokenizer.tokenize(text);

  // Step 2: POS tag (NEW - Layer 1)
  const tags = this.posTagger.tag(tokens.map(t => t.text));

  // Step 3: Dependency parse (NEW - Layer 2)
  const depTree = this.depParser.parse(tokens.map(t => t.text), tags);

  // Step 4: NER with gazetteers (NEW - Layer 5)
  const nerResults = this.nerTagger.tag(tokens, tags, depTree);

  // Step 5: Extract entities from dep tree (NEW - Layer 3)
  const entities = this.treeEntityExtractor.extract(depTree, nerResults);

  // Step 6: Extract acts from dep tree (NEW - Layers 3+4)
  const acts = this.treeActExtractor.extract(depTree, entities);

  // Step 7: Map roles (NEW - Layer 3)
  const roles = this.treeRoleMapper.map(acts, entities, depTree);

  // Step 8: Create BFO/CCO graph nodes (EXISTING - preserved)
  const nodes = this.createGraphNodes(entities, acts, roles);

  // Step 9: Assertion events, value detection, etc. (EXISTING - preserved)
  this.addAssertionEvents(nodes, text, options);
  this.addValueDetection(nodes, text, options);

  // Step 10: SHACL validation (EXISTING - preserved)
  this.validate(nodes);

  return { '@context': this.context, '@graph': nodes };
}
```

### Backward compatibility

The public API remains unchanged:

```javascript
// These continue to work identically
TagTeam.parse(text)              // Semantic role extraction (Week 1 API)
TagTeam.buildGraph(text)         // JSON-LD graph (Phase 4+ API)
TagTeam.toJSONLD(text, options)  // Serialized JSON-LD
```

The `parse()` method (Week 1 API) can optionally be upgraded to use the new POS tagger
but this is not required — it has its own extraction path via `SemanticRoleExtractor`.

---

## 12. Testing & Validation

### Evaluation methodology

Each layer has independent unit tests plus end-to-end integration tests.

**Layer 1 tests** (POS tagger):
- Standard evaluation: accuracy on UD-EWT test set (target: >96%)
- TagTeam-specific: accuracy on 50 manually tagged sentences from test corpus
- Regression: existing golden test sentences should not degrade

**Layer 2 tests** (dependency parser):
- Standard evaluation: UAS and LAS on UD-EWT test set (target: >90% UAS, >88% LAS)
- TagTeam-specific: parse quality on 50 manually parsed sentences
- Specific failure cases: CBP sentence, copular sentences, passive voice

**Layer 3 tests** (tree extraction):
- Entity boundary accuracy: precision/recall on entity span detection
- Role assignment accuracy: precision/recall on agent/patient/oblique
- Comparison: side-by-side with current system on golden test corpus

**Layer 4 tests** (copular handling):
- Copular detection accuracy on 100 mixed sentences (50 copular, 50 eventive)
- Relation inference accuracy for predicate nominals

**Layer 5 tests** (NER):
- Gazetteer coverage: % of test corpus entities found in gazetteers
- Precision/recall of entity type classification

**End-to-end tests**:
- Existing golden test suite (`npm run test:golden`) — should not regress
- Existing component tests (`npm run test:component`) — should improve
- New evaluation set: 200 sentences with gold-standard JSON-LD graphs
- CBP-class sentences: 50 organizational/definitional sentences

### Regression tracking

Use the existing golden test infrastructure (`tests/golden/`) to track changes:

1. Run golden tests before refactor → save baseline
2. Run golden tests after each layer → compare
3. Flag any regression (metric that was correct before but wrong after)
4. Regressions must be fixed before proceeding to next layer

---

## 13. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Model size too large for browser | Medium | Prune zero/near-zero weights from JSON; use binary format if needed. Weight pruning typically removes 30-50% with <0.1% accuracy loss. |
| POS tagger accuracy lower than expected | Low | The averaged perceptron is thoroughly benchmarked; 96%+ is reliable. Fallback: use wink-nlp's tagger (~94.7% accuracy) as interim solution. |
| Dependency parser accuracy lower than expected | Medium | Arc-eager with perceptron is well-studied at 90-93% UAS. If below target, try: (a) beam search (width 4) instead of greedy, (b) richer feature templates, (c) additional training data from UD-EWT + UD-PUD. |
| Training pipeline complexity | Low | Only numpy is required. Training scripts are ~200-300 lines each. No GPU needed. |
| Integration breaks existing tests | Medium | Layer-by-layer integration with regression tests after each layer. Keep old code behind a feature flag during transition. |
| Browser performance regression | Low | Both perceptron scoring and arc-eager parsing are O(n) per sentence. JS implementation should process >1k sentences/sec — well within the existing <100ms target. |
| UD-EWT domain mismatch | Medium | UD-EWT covers web text (blogs, emails, reviews, newsgroups) which is reasonably close to TagTeam's target. Domain fine-tuning (Section 10) addresses remaining gaps. |

---

## 14. Implementation Phases & Dependencies

### Dependency graph

```
Layer 1 (POS Tagger) ──────────────────┐
                                        ├──> Layer 3 (Tree Extraction)
Layer 2 (Dep Parser) ──────────────────┘         │
    depends on Layer 1                            ├──> Layer 4 (Copular)
                                                  │
Layer 5 (NER Gazetteers) ─────────────────────────┘
    independent, can start in parallel
```

### Phase 1: Foundation (Layers 1 + 5 in parallel)

**Layer 1**: Train and integrate the perceptron POS tagger.

| Task | Output |
|------|--------|
| Write Python training script for averaged perceptron POS tagger | `training/train_pos_tagger.py` |
| Download UD English-EWT treebank | `training/data/UD_English-EWT/` |
| Train model, evaluate on test set | `training/models/pos-weights.json` |
| Implement JS inference (`PerceptronTagger.js`) | `src/core/PerceptronTagger.js` |
| Write unit tests (accuracy benchmark) | `tests/unit/perceptron-tagger.test.js` |
| Integrate into build system | Updated `scripts/build.js` |
| Run existing golden tests — verify no regression | Test report |

**Layer 5** (parallel): Build gazetteer data files.

| Task | Output |
|------|--------|
| Compile organization gazetteers from public sources | `src/data/gazetteers/organizations.json` |
| Compile person name gazetteers | `src/data/gazetteers/names.json` |
| Compile place name gazetteers | `src/data/gazetteers/places.json` |
| Implement GazetteerNER.js (lookup + alias matching) | `src/graph/GazetteerNER.js` |
| Write unit tests | `tests/unit/gazetteer-ner.test.js` |

### Phase 2: Parser (Layer 2)

| Task | Output |
|------|--------|
| Write Python training script for arc-eager parser | `training/train_dep_parser.py` |
| Implement arc-eager transition system in JS | `src/core/DependencyParser.js` |
| Implement feature extraction for parser states | Part of `DependencyParser.js` |
| Train model on UD-EWT, evaluate UAS/LAS | `training/models/dep-weights.json` |
| Write unit tests (parse accuracy, specific sentences) | `tests/unit/dep-parser.test.js` |
| Write dependency tree utility class (subtree extraction, label queries) | `src/core/DepTree.js` |
| Integrate into build system | Updated `scripts/build.js` |

### Phase 3: Extraction Rewrite (Layers 3 + 4)

| Task | Output |
|------|--------|
| Implement `TreeEntityExtractor.js` | `src/graph/TreeEntityExtractor.js` |
| Implement `TreeActExtractor.js` (includes copular detection) | `src/graph/TreeActExtractor.js` |
| Implement `TreeRoleMapper.js` | `src/graph/TreeRoleMapper.js` |
| Update `SemanticGraphBuilder.js` to use new pipeline | Modified `src/graph/SemanticGraphBuilder.js` |
| Write integration tests (entity boundaries, role assignment) | `tests/integration/tree-extraction.test.js` |
| Run golden tests — compare to Phase 1 baseline | Regression report |
| Run CBP-class sentences — verify correct handling | New test suite |

### Phase 4: Validation & Polish

| Task | Output |
|------|--------|
| Create 200-sentence evaluation set with gold-standard graphs | `tests/golden/evaluation-200.json` |
| Run full evaluation, measure end-to-end accuracy | Evaluation report |
| Domain fine-tuning if accuracy < 92% | Updated model weights |
| Update all demo pages to use new pipeline | Updated `demos/` |
| Performance benchmarking (bundle size, parse speed) | Performance report |
| Update documentation | Updated `docs/` |

---

## 15. Bundle Size Budget

### Current bundle

| Component | Size |
|-----------|------|
| `lexicon.js` | 4.11 MB |
| Compromise.js | 343 KB |
| Core modules | ~80 KB |
| Graph modules | ~600 KB |
| Data files | ~75 KB |
| **Total** | **~5.37 MB** |

### Projected bundle after refactor

| Component | Size | Notes |
|-----------|------|-------|
| `pos-weights.json` | 3-5 MB | Replaces `lexicon.js` (4.11 MB) |
| `dep-weights.json` | 5-10 MB | New; largest addition |
| `PerceptronTagger.js` | ~5 KB | Replaces `POSTagger.js` (4 KB) + `lexicon.js` |
| `DependencyParser.js` | ~10 KB | New |
| `DepTree.js` | ~5 KB | New utility |
| `TreeEntityExtractor.js` | ~20 KB | Replaces `EntityExtractor.js` (132 KB) |
| `TreeActExtractor.js` | ~20 KB | Replaces `ActExtractor.js` (102 KB) |
| `TreeRoleMapper.js` | ~8 KB | Replaces `RoleDetector.js` (14 KB) |
| `GazetteerNER.js` | ~5 KB | New |
| Gazetteer data | ~200-500 KB | New |
| Compromise.js | 343 KB | Keep or evaluate for removal |
| Remaining graph modules | ~400 KB | Preserved (some shrink) |
| Data files | ~75 KB | Preserved |
| **Total** | **~9-16 MB** | Depending on weight pruning |

### Size optimization strategies

1. **Weight pruning**: Remove feature-weight pairs with |weight| < threshold. Typically
   removes 30-50% of entries with <0.1% accuracy loss. Could bring dep-weights from 10 MB
   to 5-7 MB.

2. **Binary model format**: Store weights in Float32Array binary format instead of JSON.
   ~50% size reduction (no JSON key overhead). Load via `ArrayBuffer`.

3. **Lazy loading**: Load dependency parser model only when `buildGraph()` / `toJSONLD()`
   is called. The `parse()` API (Week 1) doesn't need it.

4. **Evaluate Compromise.js removal**: If the dependency parser + perceptron tagger handle
   all verb/noun extraction, Compromise.js (343 KB) may become unnecessary for the graph
   pipeline. Keep it only if `SemanticRoleExtractor` (Week 1 API) still needs it.

5. **gzip compression**: JSON model files compress very well (60-70% reduction). A 10 MB
   JSON model becomes ~3-4 MB over the wire with gzip. GitLab Pages serves gzip by default.

### Realistic target

With weight pruning + binary format: **~6-8 MB total bundle size** (vs. 5.37 MB today).
With gzip: **~2-3 MB over the wire**.

---

## 16. References & Resources

### Training Data

- [Universal Dependencies English-EWT](https://github.com/UniversalDependencies/UD_English-EWT)
  — 254,820 words, 16,622 sentences, CC-BY-SA 4.0
- [UD English-EWT documentation](https://universaldependencies.org/treebanks/en_ewt/index.html)
  — Annotation guidelines and statistics
- [UD English-PUD](https://universaldependencies.org/treebanks/en_pud/index.html)
  — Additional 1,000 parallel sentences for evaluation

### Algorithms & Papers

- Nivre, J. (2003). "An efficient algorithm for projective dependency parsing."
  IWPT 2003. — Original arc-eager algorithm
- [Nivre, J. (2008). "Algorithms for deterministic incremental dependency parsing."](https://aclanthology.org/J14-2001.pdf)
  Computational Linguistics 34:513-553. — Comprehensive treatment of arc-standard and arc-eager
- [Goldberg, Y. and Nivre, J. (2012). "A Dynamic Oracle for Arc-Eager Dependency Parsing."](https://aclanthology.org/C12-1059.pdf)
  COLING 2012. — Training improvement for arc-eager
- [Honnibal, M. (2013). "A Good Part-of-Speech Tagger in about 200 Lines of Python."](https://explosion.ai/blog/part-of-speech-pos-tagger-in-python)
  Explosion.ai blog. — Averaged perceptron POS tagger reference implementation
- Collins, M. (2002). "Discriminative Training Methods for Hidden Markov Models."
  EMNLP 2002. — Averaged perceptron theory

### JavaScript NLP Ecosystem

- [wink-nlp](https://winkjs.org/wink-nlp/) — JS NLP library, POS tagger at ~94.7% accuracy,
  NER, browser-compatible. Potential interim POS tagger solution.
- [averaged-perceptron npm package](https://www.npmjs.com/package/averaged-perceptron)
  — JS averaged perceptron with JSON weight import/export
- [Compromise.js](https://github.com/spencermountain/compromise) — Existing dependency;
  has NER (.organizations(), .people(), .places()) but no dependency parsing
- [node-crfsuite](https://github.com/vunb/node-crfsuite) — CRF bindings for Node.js
  (not browser-compatible, but useful for offline NER model training)
- [NLP.js](https://github.com/axa-group/nlp.js) — AXA's NLP toolkit with NER manager

### Reference Implementations

- [NLTK PerceptronTagger](https://www.nltk.org/_modules/nltk/tag/perceptron.html)
  — Python averaged perceptron POS tagger (reference for training code)
- [NLTK Transition Parser](https://www.nltk.org/_modules/nltk/parse/transitionparser.html)
  — Python arc-eager implementation (reference for parser code)
- [PerceptronixPointNever](https://github.com/cslu-nlp/PerceptronixPointNever)
  — Clean Python averaged perceptron POS tagger implementation
- [WheresYrHeadAt](https://github.com/cslu-nlp/WheresYrHeadAt)
  — Clean Python arc-eager dependency parser implementation
- [perceptron-dependency-parser](https://github.com/daandouwe/perceptron-dependency-parser)
  — Graph-based dependency parser with averaged perceptron

### BFO/CCO Ontology

- UD dependency labels → BFO role mapping is a novel contribution of this refactor
- The mapping table in Layer 3 should be validated against BFO 2020 and CCO 2.0
  specifications

---

## Appendix A: CBP Sentence — Before & After

### Input

```
Customs and Border Protection (CBP) is a component of Department of Homeland Security.
```

### Current output (broken)

- "Border" extracted as IntentionalAct (spurious verb)
- "a component" extracted as `bfo:BFO_0000040` material entity
- Implicit "you" agent inferred (imperative interpretation)
- ComplexDesignators detected but don't prevent downstream errors
- Actual meaning (CBP is-part-of DHS) is lost

### Expected output after refactor

```json
{
  "@graph": [
    {
      "@id": "inst:CBP_Organization",
      "@type": ["cco:Organization", "owl:NamedIndividual"],
      "rdfs:label": "Customs and Border Protection",
      "tagteam:alias": "CBP",
      "tagteam:sourceText": "Customs and Border Protection (CBP)"
    },
    {
      "@id": "inst:DHS_Organization",
      "@type": ["cco:Organization", "owl:NamedIndividual"],
      "rdfs:label": "Department of Homeland Security",
      "tagteam:sourceText": "Department of Homeland Security"
    },
    {
      "@id": "inst:PartOf_CBP_DHS",
      "@type": ["tagteam:StructuralAssertion"],
      "rdfs:label": "CBP is a component of DHS",
      "tagteam:subject": { "@id": "inst:CBP_Organization" },
      "tagteam:relation": "cco:has_part",
      "tagteam:object": { "@id": "inst:DHS_Organization" },
      "tagteam:copula": "is",
      "tagteam:predicateNominal": "component",
      "tagteam:assertionType": "structural_composition"
    }
  ]
}
```

Three nodes. Clean. Correct. Derived from dependency structure, not heuristics.

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Averaged perceptron** | A linear classifier where weights are averaged over all training iterations, reducing overfitting. Not a neural network. |
| **Arc-eager** | A transition-based parsing strategy that creates dependency arcs as early as possible, resulting in linear-time parsing. |
| **UAS** | Unlabeled Attachment Score — % of tokens assigned the correct head (ignoring label). |
| **LAS** | Labeled Attachment Score — % of tokens assigned the correct head AND label. |
| **CoNLL-U** | Standard file format for annotated dependency treebanks (used by Universal Dependencies). |
| **Gazetteer** | A lookup table of known entities with their types. Used for high-precision NER. |
| **UPOS** | Universal POS tags — a 17-tag set used across all UD treebanks. Mapped to Penn Treebank tags for backward compatibility. |
| **Transition system** | A formalism for incremental parsing where a sequence of actions (shift, reduce, arc) builds a parse tree left-to-right. |
| **Dynamic oracle** | A training strategy where the parser learns from the best action in any state, not just gold-standard states. Improves robustness. |

---

*End of refactor plan.*
