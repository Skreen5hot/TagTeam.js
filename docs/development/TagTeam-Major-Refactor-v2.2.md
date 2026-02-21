# TagTeam.js Refactor Plan: Five-Layer NLP Foundation Upgrade

**Version**: 2.2 (Final Hardened)  
**Date**: 2026-02-13  
**Status**: Approved — ready for implementation  
**Supersedes**: v2.1 (2026-02-13)  
**Reviews addressed**:  
- Architectural Review by Claude Opus 4.6 (2026-02-13) — all 25 findings resolved in v2.0  
- Expert Review #1 (2026-02-13) — all 8 findings resolved in v2.1  
- Expert Review #2 (2026-02-13) — all findings resolved in this version  
**Goal**: Achieve ~95% end-to-end accuracy on semantic graph generation without LLMs

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-13 | Initial proposal |
| 2.0 | 2026-02-13 | Addresses all review findings: UD v2 label normalization, hard bundle ceiling, subtree traversal rules, negated copular patterns, XPOS training specification, Phase 0 Label Convention, confidence propagation, gazetteer versioning, Phase 5 precedence rules, non-projective handling, `_debug.dependencyTree` output |
| 2.1 | 2026-02-13 | Expert Review #1: Tokenizer alignment contract (§5.5), recursive subtree traversal clarification (§8.1), coordination blob known limitation (§8.1, §21.7), gazetteer abbreviation normalization (§10.2), PP-attachment confidence tuning (§13), feature string caching advisory (§6), binary model format elevated to REQUIRED (§20), UD-EWT version pinned to ≥2.14 (§6, §7) |
| 2.2 | 2026-02-13 | **Final hardened.** Expert Review #2: Licensing & attribution obligations (§15.1), Unicode normalization in tokenizer alignment (§5.5), binary header full specification with endianness/checksums/versioning (§20), async model loading API (§16.1), model provenance metadata (§6, §7), confidence calibration step (§13), conservative coordination split heuristic (§8.1.2), adversarial test cases (§17), security sanitization test matrix (§17), cross-sentence mention ID interface (§21.1), dynamic oracle implementation reference (§7), apposition alias promotion (§8.1) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Edge-Canonical Constraint Compliance](#2-edge-canonical-constraint-compliance)
3. [Current Architecture Assessment](#3-current-architecture-assessment)
4. [Target Architecture](#4-target-architecture)
5. [Phase 0: Label Convention Contract](#5-phase-0-label-convention-contract)
6. [Layer 1: Averaged Perceptron POS Tagger](#6-layer-1-averaged-perceptron-pos-tagger)
7. [Layer 2: Transition-Based Dependency Parser](#7-layer-2-transition-based-dependency-parser)
8. [Layer 3: Tree-Based Entity & Act Extraction](#8-layer-3-tree-based-entity--act-extraction)
9. [Layer 4: Copular & Stative Sentence Handling](#9-layer-4-copular--stative-sentence-handling)
10. [Layer 5: NER Upgrade with Gazetteers](#10-layer-5-ner-upgrade-with-gazetteers)
11. [What Gets Preserved vs. Replaced](#11-what-gets-preserved-vs-replaced)
12. [Phase 5 Module Lifecycle & Precedence](#12-phase-5-module-lifecycle--precedence)
13. [Confidence Propagation & Structured Uncertainty](#13-confidence-propagation--structured-uncertainty)
14. [Verbose Debug Output](#14-verbose-debug-output)
15. [Training Pipeline](#15-training-pipeline)
16. [Integration Strategy](#16-integration-strategy)
17. [Testing & Validation](#17-testing--validation)
18. [Risk Assessment](#18-risk-assessment)
19. [Implementation Phases & Dependencies](#19-implementation-phases--dependencies)
20. [Bundle Size Budget](#20-bundle-size-budget)
21. [Known Horizons & Deferred Work](#21-known-horizons--deferred-work)
22. [References & Resources](#22-references--resources)

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

All dependency labels in this specification use the **Universal Dependencies v2** convention.
All POS tags use the **Penn Treebank** tagset (extracted from the XPOS column of UD treebanks).
A normative mapping between these conventions and BFO/CCO roles is defined in §5.

### Expected Accuracy Improvement

| Component               | Current (est.) | After Refactor | Technique                      |
|-------------------------|----------------|----------------|--------------------------------|
| POS tagging             | ~88–90%        | 96–97%         | Averaged perceptron            |
| Entity boundaries       | ~75–80%        | 88–92%         | Dependency subtrees + gazetteers |
| Predicate identification| ~70%           | 90–93%         | Dependency root + verb detection |
| Role assignment         | ~60%           | 85–90%         | Dependency relation mapping    |
| Copular/stative         | ~20%           | 95%+           | `cop` dependency pattern       |
| **End-to-end graph**    | **~40–50%**    | **~85–92%**    | Combined pipeline              |

The final 92%+ to 95% is achievable through domain-specific tuning on TagTeam's target
sentence types (ethical deliberation, organizational descriptions, stakeholder analysis).

### Guiding Principle

> *Better to output structured uncertainty than false precision.*

When the parser is uncertain, the system emits explicit uncertainty markers into the graph
rather than committing to a reading it cannot support. This aligns with TagTeam's existing
interpretation lattice architecture and the Edge-Canonical constraint that offline/degraded
execution is a first-class mode.

---

## 2. Edge-Canonical Constraint Compliance

This section documents how each architectural constraint is satisfied. These are not
aspirations — they are normative requirements. Any implementation that violates these
constraints is non-conformant.

### 2.1 Edge-Canonical First Principle

Both the POS tagger and dependency parser are O(n) algorithms implemented in pure JavaScript.
Model weights ship as static JSON (or binary ArrayBuffer). The system runs unmodified in
a browser via `<script src="dist/tagteam.js">` or via `node index.js`. No server, no WASM,
no WebWorker is required.

**Hard constraint:** Total bundle size MUST NOT exceed **10 MB uncompressed** or **4 MB
gzipped**. See §20 for the budget and required optimizations.

### 2.2 No Required Infrastructure

The training pipeline (Python + numpy) is an offline developer tool, not a runtime dependency.
Trained models export as JSON files that ship with the bundle. Gazetteers are static JSON.
No databases, message brokers, service registries, or addressable servers are required.

### 2.3 Determinism Over Deployment

Both the averaged perceptron (greedy left-to-right decoding) and arc-eager parser (greedy
transition sequence) are fully deterministic. The `tagdict` in the POS tagger is a
**compile-time optimization** derived from training data — it is immutable at runtime and
does not constitute hidden state.

Same input text + same model weights + same gazetteer version = same JSON-LD graph. Always.

Gazetteer data files carry a version identifier (see §10.4). The graph output includes
a provenance reference to the gazetteer version via the existing GIT-Minimal pattern.

### 2.4 Separation of Concerns

| Concern | Component | Pluggable? |
|---------|-----------|------------|
| **Computation** | POS tagging, dep parsing, tree extraction, role mapping | Core (not pluggable) |
| **State** | Model weight files, gazetteer data files | Static, versioned, replaceable |
| **Orchestration** | `SemanticGraphBuilder.build()` | Single entry point |
| **Integration** | Build system, test infrastructure, demo pages | Independent |

The dependency tree is the single internal representation connecting Computation layers.
It is consumed within a single `build()` call and does not persist.

### 2.5 JSON-LD as Canonical Representation

JSON-LD remains the sole output format. The dependency tree is an internal intermediate
representation. It is optionally exposed via `_debug.dependencyTree` in verbose mode (§14)
but is not part of the canonical output contract.

### 2.6 Offline Is a First-Class Mode

All model weights and gazetteer data are bundled. Zero network calls at inference time.
When the parser encounters input it cannot confidently analyze, it emits structured
uncertainty (§13) rather than failing.

---

## 3. Current Architecture Assessment

### What works

- **BFO/CCO ontology mapping**: Two-tier architecture (ICE DiscourseReferents + IC real-world
  entities) is well-designed and ontologically sound
- **Ethical value detection**: Week 2b pipeline (ValueMatcher, ValueScorer, EthicalProfiler)
  achieves 100% profile generation on the 20-scenario corpus
- **SHACL validation & complexity budget**: Graph quality constraints work correctly
- **Security hardening**: Input validation, output sanitization, audit logging
- **Ambiguity detection & interpretation lattice**: Phase 5–6 modules are architecturally clean
- **Build & deployment**: Custom UMD bundler, browser + Node.js compatibility
- **Phase 5 NLP modules**: ContractionExpander, Lemmatizer, VerbPhraseExtractor,
  NounPhraseExtractor — valuable and retained (see §12 for precedence rules)

### What doesn't work

| Component | Problem | Root Cause |
|-----------|---------|------------|
| `POSTagger.js` | ~88–90% accuracy, cascading errors | Lexicon lookup + 8 hand-written rules |
| `EntityExtractor.js` | Fragments multi-word entities, misses NP boundaries | No syntactic parse; uses Compromise.js nouns or NPChunker heuristics |
| `ActExtractor.js` | Extracts spurious verbs (e.g., "border" in "Border Protection") | Linear scan for verbs; no dependency structure to constrain |
| `ActExtractor.js` | Assigns wrong agent/patient | Position-based heuristic (before verb = agent, after = patient) |
| `SentenceModeClassifier.js` | Misses copular sentences ("X is a Y") | Only 9 stative verbs; "be" is not in the taxonomy |
| `ComplexDesignatorDetector.js` | Correct detection but doesn't prevent downstream errors | Runs after entity extraction; shadow suppression has span mismatches |

### The fundamental gap

**There is no syntactic parser.** The system goes from POS tags directly to semantic roles
using token-level linear scanning. This is the architectural decision that creates the ceiling.

---

## 4. Target Architecture

### Before (Current Pipeline)

```
Input Text
    |
    v
[Lexicon POS Tagger] ---- 8 rules, ~88–90% accuracy
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
[ContractionExpander] --- "don't" → "do not" (existing, always runs)
    |
    v
[Tokenizer] ------------- Character-level (existing, UD-aligned per §5.5)
    |
    v
[Perceptron POS Tagger] - Trained on UD-EWT XPOS, ~97% accuracy    [NEW — Layer 1]
    |
    v
[Arc-Eager Dep Parser] -- Trained on UD-EWT, ~91% LAS              [NEW — Layer 2]
    |
    v
[Dependency Tree] -------- UD v2 labels (normative convention)
    |
    +---> [Tree Entity Extractor] -- NP subtrees via traversal rules [REWRITE — Layer 3]
    |         |                      (recursive, §8.1.1)
    |         +---> [Gazetteer NER] -- Versioned + normalized        [NEW — Layer 5]
    |
    +---> [Tree Act Extractor] ---- Root verb + dep relations        [REWRITE — Layer 3]
    |         |
    |         +---> [Copular Detector] -- cop + negation patterns    [NEW — Layer 4]
    |
    +---> [Tree Role Assigner] ---- UD label → BFO role mapping      [REWRITE — Layer 3]
    |
    +---> [Confidence Annotator] -- Score margin → uncertainty flags  [NEW — §13]
    |                               (PP-attachment tuning)
    v
[BFO/CCO Mapping] ------- Ontology layer (PRESERVED)
    |
    v
JSON-LD Graph (with optional _debug.dependencyTree)
```

### Key architectural change

The dependency tree becomes the **single source of truth** for all downstream extraction.
Entity boundaries, predicate identification, and role assignment all derive from the tree
structure rather than from independent heuristic scans over the token sequence.

---

## 5. Phase 0: Label Convention Contract

**This section is normative.** It defines the exact tagsets and label sets used throughout
the system. All training scripts, JS inference code, extraction logic, and test assertions
MUST conform to these conventions. Discrepancies between this section and any code or
example elsewhere in this document are errors in those examples.

### 5.1 POS Tagset: Penn Treebank (via UD-EWT XPOS)

The POS tagger outputs **Penn Treebank** tags. Training data is extracted from the **XPOS**
column (not UPOS) of the UD English-EWT treebank. This maintains backward compatibility
with all existing TagTeam code that consumes POS tags.

The XPOS column in UD English-EWT contains PTB-compatible tags. The training script MUST
read from this column.

**Canonical tag list** (45 tags):

```
CC  CD  DT  EX  FW  IN  JJ  JJR JJS LS  MD  NN  NNS NNP NNPS
PDT POS PRP PRP$ RB  RBR RBS RP  SYM TO  UH  VB  VBD VBG VBN
VBP VBZ WDT WP  WP$ WRB .   ,   :   ``  ''  -LRB- -RRB- #  $
```

### 5.2 Dependency Label Set: Universal Dependencies v2

The dependency parser outputs **UD v2** labels. Training data is read from the standard
DEPREL column of UD English-EWT CoNLL-U files.

**Canonical label list** (37 core labels used in English):

| UD v2 Label | TagTeam Usage | Replaces (v1.0 error) |
|-------------|---------------|-----------------------|
| `nsubj` | Agent (active voice) | — |
| `nsubj:pass` | Patient (passive subject) | `nsubjpass` |
| `obj` | Patient (direct object) | `dobj` |
| `iobj` | Recipient (indirect object) | — |
| `obl` | Oblique argument (PP) | `pobj`, `prep` (combined) |
| `obl:agent` | Agent (passive "by" phrase) | — |
| `nmod` | Nominal modifier | — |
| `amod` | Adjectival modifier | — |
| `advmod` | Adverbial modifier | — |
| `nummod` | Numeric modifier | — |
| `det` | Determiner | — |
| `case` | Preposition/postposition | `prep` |
| `cop` | Copula ("is", "was") | — |
| `xcomp` | Open clausal complement (predicate nominal) | `attr` |
| `ccomp` | Clausal complement | — |
| `advcl` | Adverbial clause | — |
| `acl` | Adnominal clause | — |
| `acl:relcl` | Relative clause | `relcl` |
| `conj` | Conjunct | — |
| `cc` | Coordinating conjunction | — |
| `compound` | Compound word | — |
| `flat` | Flat name | — |
| `fixed` | Fixed expression | — |
| `appos` | Apposition | — |
| `mark` | Subordinating conjunction | — |
| `aux` | Auxiliary verb | — |
| `aux:pass` | Passive auxiliary | `auxpass` |
| `expl` | Expletive ("there") | — |
| `neg` | Negation | — (new in this spec) |
| `punct` | Punctuation | — |
| `root` | Root of sentence | — |
| `dep` | Unspecified dependency | — |
| `parataxis` | Paratactic relation | — |
| `discourse` | Discourse element | — |
| `vocative` | Vocative | — |
| `orphan` | Orphan in ellipsis | — |
| `list` | List item | — |

**Critical corrections from v1.0:**
- `dobj` → `obj` (UD v2 standard)
- `nsubjpass` → `nsubj:pass` (UD v2 subtype)
- `auxpass` → `aux:pass` (UD v2 subtype)
- `pobj` → does not exist in UD; absorbed into `obl` or `nmod`
- `prep` → does not exist in UD; replaced by `case` (on the preposition) + `obl`/`nmod` (on the noun)
- `attr` → does not exist in UD; predicate nominals use `xcomp` or the copular analysis (see §9)
- `relcl` → `acl:relcl` (UD v2 subtype)

### 5.3 UD v2 Label → BFO/CCO Role Mapping (Normative)

This table is the canonical contract between the dependency parser output and the ontology
mapping layer. All role assignment code MUST implement this mapping.

```javascript
/**
 * NORMATIVE: UD v2 dependency label → BFO/CCO semantic role
 * This mapping is the single source of truth for role assignment.
 */
const UD_TO_BFO_ROLE = {
  // Core argument roles (all roles are bfo:Role with rdfs:label for distinction)
  'nsubj':      { role: 'bfo:Role', label: 'AgentRole',     bfo: 'bfo:BFO_0000023', note: 'Active voice subject' },
  'obj':        { role: 'bfo:Role', label: 'PatientRole',   bfo: 'bfo:BFO_0000023', note: 'Direct object' },
  'iobj':       { role: 'bfo:Role', label: 'RecipientRole', bfo: 'bfo:BFO_0000023', note: 'Indirect object' },
  'nsubj:pass': { role: 'bfo:Role', label: 'PatientRole',   bfo: 'bfo:BFO_0000023', note: 'Passive subject = patient' },
  'obl:agent':  { role: 'bfo:Role', label: 'AgentRole',     bfo: 'bfo:BFO_0000023', note: 'Passive "by" phrase = agent' },

  // Oblique roles (subtyped by preposition via `case` dependent)
  'obl':        { role: 'bfo:Role', label: 'ObliqueRole',   bfo: 'bfo:BFO_0000023', note: 'Subtyped by case child' },
};

/**
 * NORMATIVE: Preposition (case label value) → oblique role subtype
 * Applied when the `obl` argument has a `case` dependent.
 */
const CASE_TO_OBLIQUE_ROLE = {
  // All oblique roles use bfo:Role with rdfs:label for subtype distinction
  'for':   { role: 'bfo:Role', label: 'BeneficiaryRole' },
  'with':  { role: 'bfo:Role', label: 'InstrumentRole' },
  'at':    { role: 'bfo:Role', label: 'LocationRole' },
  'in':    { role: 'bfo:Role', label: 'LocationRole' },
  'on':    { role: 'bfo:Role', label: 'LocationRole' },
  'from':  { role: 'bfo:Role', label: 'SourceRole' },
  'to':    { role: 'bfo:Role', label: 'DestinationRole' },
  'by':    { role: 'bfo:Role', label: 'AgentRole' },           // Passive agent (also captured via obl:agent)
  'about': { role: 'bfo:Role', label: 'TopicRole' },
  'against': { role: 'bfo:Role', label: 'OpponentRole' },
};
```

### 5.4 Non-Projective Input Handling

The arc-eager transition system produces only projective dependency trees. English is
predominantly projective, but certain constructions (wh-movement, topicalization, some
relative clauses) produce non-projective gold trees in UD-EWT.

**Normative behavior:** The greedy arc-eager parser naturally approximates the nearest
projective tree for non-projective input. This is expected behavior, not an error.
When the parser's greedy choice produces an arc that the dynamic oracle would score
differently in a non-projective gold tree, the resulting dependency is flagged as
low-confidence (see §13). No special-case handling is required.

The parser does NOT attempt non-projective parsing (e.g., swap-lazy, pseudo-projective
transforms). These are deferred to v2 if the empirical non-projective error rate exceeds
2% on TagTeam's target domains.

**Concrete decision point (NEW in v2.2):** During Phase 2 validation, the evaluation
script MUST report:
1. The percentage of UD-EWT test set sentences containing non-projective gold arcs
2. The LAS specifically on non-projective arcs (expected: significantly lower than overall)
3. The percentage of TagTeam domain dev sentences affected

If metric (3) exceeds 2%, the Phase 2 sign-off MUST include a decision:
- **Option A:** Enable pseudo-projective transforms during training (projectivize gold
  trees before training, de-projectivize at inference via arc labels)
- **Option B:** Enable swap transition (adds non-projective capability at the cost of
  O(n²) worst case, though typically near-linear)
- **Option C:** Accept the error rate and document affected sentence patterns

This decision is recorded in the Phase 2 completion report.

### 5.5 Tokenizer Alignment Contract (NEW in v2.1)

**Risk level: HIGH.** This section was added in response to Expert Review #1.

The Perceptron POS Tagger (§6) and Dependency Parser (§7) are trained on UD English-EWT.
The UD-EWT treebank uses specific tokenization conventions defined by the UD standard:

| Input Text | UD Tokenization | Notes |
|------------|----------------|-------|
| `don't` | `do` + `n't` | Contraction split |
| `can't` | `ca` + `n't` | Contraction split (irregular) |
| `cannot` | `can` + `not` | Single word split |
| `I'm` | `I` + `'m` | Contraction split |
| `it's` | `it` + `'s` | Contraction split |
| `won't` | `wo` + `n't` | Contraction split (irregular) |
| `10-year` | `10` + `-` + `year` | Hyphen split |
| `U.S.` | `U.S.` | NOT split (abbreviation) |
| `(CBP)` | `(` + `CBP` + `)` | Parentheses split |

#### 5.5.1 Unicode Text Normalization (NEW in v2.2)

UD-EWT training data uses ASCII punctuation. Real-world input contains Unicode variants
that will silently break contraction splitting and feature extraction if not normalized.

**Normative requirement:** Before tokenization, all input text MUST be passed through a
Unicode normalization step. This step is inserted between raw input and `Tokenizer.js`.

**Required normalizations:**

| Category | Input | Normalized | Codepoints |
|----------|-------|-----------|------------|
| Smart single quotes | `'` `'` `‛` | `'` | U+2018, U+2019, U+201B → U+0027 |
| Smart double quotes | `"` `"` `‟` | `"` | U+201C, U+201D, U+201F → U+0022 |
| Non-breaking space | ` ` | ` ` | U+00A0 → U+0020 |
| Narrow no-break space | ` ` | ` ` | U+202F → U+0020 |
| Zero-width spaces | `​` `‌` `‍` | (removed) | U+200B, U+200C, U+200D → empty |
| Em dash | `—` | ` -- ` | U+2014 → space-padded ASCII |
| En dash | `–` | `-` | U+2013 → U+002D |
| Ellipsis | `…` | `...` | U+2026 → three periods |
| Soft hyphen | `­` | (removed) | U+00AD → empty |

**Implementation:**

```javascript
function normalizeUnicode(text) {
  return text
    .normalize('NFKC')                           // Canonical decomposition + compatibility composition
    .replace(/[\u2018\u2019\u201B]/g, "'")        // Smart single quotes → ASCII
    .replace(/[\u201C\u201D\u201F]/g, '"')        // Smart double quotes → ASCII
    .replace(/[\u00A0\u202F]/g, ' ')              // Non-breaking spaces → space
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')   // Zero-width chars → remove
    .replace(/\u2014/g, ' -- ')                    // Em dash → spaced double hyphen
    .replace(/\u2013/g, '-')                       // En dash → hyphen
    .replace(/\u2026/g, '...')                     // Ellipsis → three periods
    .replace(/\u00AD/g, '');                       // Soft hyphen → remove
}
```

**Ordering:** `normalizeUnicode()` runs FIRST, before `ContractionExpander`, before
`Tokenizer.js`. This ensures all downstream processing operates on ASCII-normalized text.

**TOKENIZER_ALIGNMENT_REPORT must include (v2.2):**
- All items from v2.1, PLUS:
- Test results for each Unicode variant in the table above
- Test results for text containing: URLs, email addresses, emoji sequences
- Test results for mixed-script input (Latin + Cyrillic, Latin + CJK)
- Confirmation that NFKC normalization does not corrupt any UD-EWT training data

**The problem:** If TagTeam's runtime `Tokenizer.js` produces different token boundaries
than the UD-EWT training data, the POS tagger's feature extraction will misalign and
accuracy will degrade significantly. For example, if `Tokenizer.js` keeps "don't" as
one token but the tagger was trained on "do" + "n't", every feature involving that
token will be wrong.

**Normative requirement:** The runtime tokenizer MUST produce token boundaries compatible
with the UD-EWT training data for the models to achieve their benchmarked accuracy.

**Resolution strategy (choose one during Phase 0):**

**Option A: Align Tokenizer.js to UD standard** (RECOMMENDED)
- Modify `Tokenizer.js` to split contractions per UD conventions
- This is simplified by the existing `ContractionExpander.js` (Phase 5), which already
  expands "don't" → "do not". After expansion, UD tokenization is trivial.
- NOTE: `ContractionExpander.js` expands to full words ("do not"), while UD splits to
  morphological segments ("do" + "n't"). These are different. The alignment step must
  decide which convention to use and ensure the training data matches.
- If ContractionExpander runs BEFORE tokenization (current behavior), then the tokenizer
  sees "do not" (two words), which aligns with UD boundaries.
- **Verification:** After alignment, run the UD-EWT raw text through `Tokenizer.js` and
  compare token counts against CoNLL-U token counts. Mismatch rate must be <0.5%.

**Option B: Re-tokenize training data to match Tokenizer.js**
- Extract raw text from UD-EWT CoNLL-U files
- Run through `Tokenizer.js` (via Node.js script)
- Re-align gold POS tags and dependency arcs to the new tokenization
- Train on the re-tokenized data
- CAUTION: Re-alignment of dependency arcs across different tokenizations is non-trivial
  and error-prone. Option A is strongly preferred.

**Option C: Add a UD-compatible tokenizer as a preprocessing step**
- Implement a small UD-standard tokenizer (~50–80 lines) that runs between
  `ContractionExpander` and `PerceptronTagger`
- This tokenizer handles only the UD-specific splits (contractions, punctuation separation)
- Original `Tokenizer.js` output is preserved for offset tracking and API compatibility
- A token-index mapping bridges the two tokenizations

**Deliverable:** Phase 0 MUST produce a **Tokenizer Alignment Report** documenting:
1. Which option was chosen and why
2. Token-boundary comparison on 100 representative sentences
3. Mismatch rate (must be <0.5%)
4. Any Tokenizer.js modifications required

---

## 6. Layer 1: Averaged Perceptron POS Tagger

### What it replaces

`src/core/POSTagger.js` — lexicon lookup (~297k entries) + 8 transformation rules

### Technical approach

The averaged perceptron is a linear classifier that achieves 96–97% POS accuracy on standard
benchmarks. It was the default POS tagger in NLTK and the original tagger in spaCy v1. It is
not a neural network — it's a weighted feature lookup that runs in O(n) time.

**Algorithm:**
1. For each token in the sentence, extract features (see below)
2. For each possible POS tag, compute a score = sum of (feature weight × feature presence)
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
a tag is the sum of all active feature weights for that tag. ~18–20 features per token,
~45 possible tags = ~900 lookups per token. Extremely fast.

**JS Performance Advisory (NEW in v2.1):** The feature template includes `suffix_3`,
`suffix_2`, `suffix_1`, and `prefix_1`, all of which require string slicing. In tight
loops, repeated `String.slice()` calls create short-lived string allocations that can
trigger garbage collection pauses. The implementation MUST pre-compute all suffix/prefix
features once per token and store them in a reusable object, NOT re-slice on each feature
lookup. Example:

```javascript
// CORRECT: compute once, reuse
_getFeatures(tokens, i, prev, prev2) {
  const word = tokens[i];
  const len = word.length;
  // Pre-compute all string-derived features once
  const lower = word.toLowerCase();
  const suf3 = len >= 3 ? lower.slice(-3) : lower;
  const suf2 = len >= 2 ? lower.slice(-2) : lower;
  const suf1 = lower.slice(-1);
  const pre1 = word[0];
  // ... build feature array from cached values
}

// WRONG: re-slice inside scoring loop — causes GC pressure
```

This is a JS-specific optimization. The Python training scripts need not worry about this.

**Why this fixes the "Border" problem:**
- `is_title: true` + `prev_tag: CC` + `prev_word: and` + `next_word: Protection`
- The trained weights strongly associate this feature combination with NNP (proper noun)
- The current tagger only checks the lexicon (where "border" has VB as a possible tag)
  and has no rule for "capitalized word between two other capitalized words"

### Training

- **Data**: Universal Dependencies English-EWT (UD_English-EWT)
  - 254,820 words, 16,622 sentences
  - Free download, CC-BY-SA 4.0 license
  - GitHub: `UniversalDependencies/UD_English-EWT`
  - **REQUIRED: Version ≥2.14.** Earlier versions contain inconsistencies in `nsubj:pass`
    and other subtyped labels. Pin to v2.14 or later in training scripts.
- **Tag column**: **XPOS** (Penn Treebank compatible) — NOT UPOS
- **Iterations**: 5–10 passes over training data (converges quickly)
- **Output**: JSON file with feature-weight mappings

**Why XPOS:** The UD-EWT treebank provides both UPOS (17 coarse tags) and XPOS (PTB-compatible
fine-grained tags). All existing TagTeam downstream code expects PTB tags (VB, VBZ, VBN, NN,
NNP, etc.). Training on XPOS maintains this contract without requiring a tag translation layer.

### Model format (JSON — debug / reference)

```json
{
  "version": "1.0.0",
  "tagset": "PTB-XPOS",
  "trainedOn": "UD_English-EWT v2.14",
  "provenance": {
    "trainScriptVersion": "1.0.0",
    "trainScriptGitCommit": "abc1234",
    "trainingDate": "2026-02-15T10:30:00Z",
    "trainingDataLicense": "CC-BY-SA 4.0",
    "trainingSeed": 42,
    "iterations": 5,
    "devAccuracy": 0.9683,
    "pruneThreshold": 0.01,
    "postPruneDevAccuracy": 0.9679
  },
  "weights": {
    "bias": { "NN": 0.32, "VB": -0.12, "NNP": 0.08 },
    "is_title": { "NNP": 2.41, "NN": -0.93, "VB": -1.87 },
    "suffix_3=ion": { "NN": 1.52, "VB": -0.44 }
  },
  "tagdict": {
    "the": "DT",
    "is": "VBZ"
  },
  "classes": ["NN", "NNS", "NNP", "VB", "VBD", "VBG", "VBN", "VBP", "VBZ"]
}
```

The `provenance` block (NEW in v2.2) captures training-time metadata for reproducibility
and auditing. Every field is REQUIRED in the JSON export. The binary format (§20)
encodes this in the metadata JSON block of the header.

The `tagdict` is a **compile-time optimization** derived from training data: words that
always receive the same tag in the training corpus are looked up directly without feature
computation. This handles ~50% of tokens. The `tagdict` is immutable at runtime and does
not constitute hidden state.

### JS implementation

```
New file: src/core/PerceptronTagger.js (~150–200 lines)
New file: src/data/pos-weights.json (~3–5 MB, for debugging)
New file: src/data/pos-weights.bin (~1.5–2.5 MB, PRODUCTION — see §20 binary spec)
```

**Inference code structure:**

```javascript
class PerceptronTagger {
  constructor(model) {
    this.weights = model.weights;   // feature → tag → weight
    this.tagdict = model.tagdict;   // word → unambiguous tag (compile-time optimization)
    this.classes = model.classes;    // list of all PTB tags
  }

  tag(tokens) {
    const tags = [];
    let prev = '-START-', prev2 = '-START2-';

    for (let i = 0; i < tokens.length; i++) {
      // Fast path: unambiguous words (compile-time optimization from training data)
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

- **Accuracy**: 96–97% on UD-EWT test set (XPOS column, matching published results)
- **Speed**: >100k tokens/sec in JS (feature extraction is string operations + hash lookups)
- **Model size**: 3–5 MB JSON (MUST NOT exceed 5 MB; prune if necessary)

### Migration path

1. The new tagger outputs Penn Treebank tags (same tagset as current `POSTagger.js`)
2. All downstream code that reads POS tags continues to work unchanged
3. The existing `lexicon.js` (4.1 MB) is no longer needed for POS tagging but may be
   retained as a fallback during the transition period
4. `POSTagger.js` is replaced, not modified

---

## 7. Layer 2: Transition-Based Dependency Parser

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
stack[0].tag          Top of stack POS tag (PTB)
stack[0].deprel       Top of stack dependency label (UD v2, if assigned)
stack[1].word         Second element on stack
stack[1].tag          Second element POS tag
buffer[0].word        Front of buffer word
buffer[0].tag         Front of buffer POS tag
buffer[1].word        Second in buffer
buffer[1].tag         Second in buffer POS tag
buffer[2].tag         Third in buffer POS tag
stack[0].left_child   Leftmost child label of stack top
stack[0].right_child  Rightmost child label of stack top
buffer[0].left_child  Leftmost child label of buffer front
```

Combined features (pairs and triples of the above) bring the total to ~40–60 features per
parser state. Each feature maps to a weight vector over all possible transitions.

### UD v2 dependency labels for TagTeam

The parser outputs UD v2 labels as defined in §5.2. The following table shows how each
label serves TagTeam's semantic extraction needs:

| UD v2 Label | Meaning | TagTeam Use |
|-------------|---------|-------------|
| `nsubj` | Nominal subject | Agent role |
| `obj` | Direct object | Patient role |
| `iobj` | Indirect object | Recipient role |
| `obl` | Oblique argument | Instrument, location, beneficiary (via `case` child) |
| `nmod` | Nominal modifier | Entity qualifier |
| `amod` | Adjectival modifier | Quality node |
| `cop` | Copula | Stative/relational sentence marker |
| `xcomp` | Open clausal complement | Predicate nominal in copular sentences |
| `conj` | Conjunction | Coordination (and/or) |
| `appos` | Apposition | Alias/abbreviation (e.g., "CBP") |
| `mark` | Subordinating conjunction | Clause boundary |
| `acl:relcl` | Relative clause | Embedded predication |
| `nsubj:pass` | Passive subject | Patient (not agent!) |
| `obl:agent` | Passive agent ("by" phrase) | Agent in passive |
| `aux:pass` | Passive auxiliary | Passive voice marker |
| `compound` | Compound word | Multi-word entity component |
| `flat` | Flat name | Multi-word proper name component |
| `neg` | Negation | Negated copular/stative detection (§9) |
| `case` | Preposition | Oblique role subtyping |

### Training

- **Data**: Universal Dependencies English-EWT (UD_English-EWT)
  - 254,820 words, 16,622 sentences
  - Free download, CC-BY-SA 4.0 license
  - GitHub: `UniversalDependencies/UD_English-EWT`
  - CoNLL-U format: HEAD column for heads, DEPREL column for UD v2 labels
  - **REQUIRED: Version ≥2.14.** Same version constraint as Layer 1 (see §6).
- **POS input**: XPOS column (PTB tags) — the parser consumes the same tags the tagger produces
- **Algorithm**: Averaged perceptron with dynamic oracle (Goldberg & Nivre 2012)
- **Dynamic oracle reference implementation (NEW in v2.2):** Training with a dynamic
  oracle is non-trivial. The `training/README.md` MUST link to at least one tested
  open-source reference implementation. Recommended sources:
  - Goldberg & Nivre's original Java implementation (MaltParser)
  - Matthew Honnibal's Python implementation (spaCy v1 `_parser.pyx`)
  - The `train_dep_parser.py` script MUST include inline comments referencing the
    algorithm from Goldberg & Nivre 2012 §3 (computing the optimal transition set for
    any parser state, not just the gold-standard state)
- **Training**: Python script, 10–15 iterations, ~10 minutes on commodity hardware
- **Output**: JSON file with transition-weight mappings (plus binary export per §20)

### Model format (JSON — debug / reference)

```json
{
  "version": "1.0.0",
  "labelset": "UD-v2",
  "trainedOn": "UD_English-EWT v2.14",
  "provenance": {
    "trainScriptVersion": "1.0.0",
    "trainScriptGitCommit": "abc1234",
    "trainingDate": "2026-02-15T10:45:00Z",
    "trainingDataLicense": "CC-BY-SA 4.0",
    "trainingSeed": 42,
    "iterations": 10,
    "devUAS": 0.9187,
    "devLAS": 0.8943,
    "pruneThreshold": 0.01,
    "postPruneDevUAS": 0.9181,
    "postPruneDevLAS": 0.8937
  },
  "weights": {
    "s0.tag=VBZ": { "SHIFT": 0.12, "LEFT-ARC_nsubj": 1.87, "RIGHT-ARC_obj": -0.34 },
    "s0.tag=VBZ+b0.tag=DT": { "SHIFT": 2.31 }
  },
  "labels": ["nsubj", "obj", "iobj", "obl", "nmod", "amod", "det", "cop"],
  "transitions": ["SHIFT", "REDUCE", "LEFT-ARC_nsubj", "LEFT-ARC_det", "RIGHT-ARC_obj"]
}
```

### JS implementation

```
New file: src/core/DependencyParser.js (~250–350 lines)
New file: src/core/DepTree.js (~100–150 lines)
New file: src/data/dep-weights.json (~5–8 MB, for debugging)
New file: src/data/dep-weights.bin (~2.5–4.0 MB, PRODUCTION — see §20 binary spec)
```

**Core parser with score margin tracking (for confidence propagation, §13):**

```javascript
class DependencyParser {
  constructor(model) {
    this.weights = model.weights;
    this.transitions = model.transitions;
  }

  parse(tokens, tags) {
    const stack = [{ id: 0, word: 'ROOT', tag: 'ROOT' }];
    const buffer = tokens.map((w, i) => ({
      id: i + 1, word: w, tag: tags[i], head: -1, deprel: null
    }));
    const arcs = [];
    const confidences = []; // NEW: track per-arc confidence

    while (buffer.length > 0 || stack.length > 1) {
      const features = this._extractFeatures(stack, buffer, arcs);
      const scores = this._score(features);
      const valid = this._getValidTransitions(stack, buffer);

      // Sort valid transitions by score
      const ranked = valid.sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
      const best = ranked[0];
      const second = ranked[1];

      // Score margin: difference between top two valid transitions
      const margin = second ? (scores[best] || 0) - (scores[second] || 0) : Infinity;

      const arcResult = this._apply(best, stack, buffer, arcs);
      if (arcResult) {
        arcResult.scoreMargin = margin;
        confidences.push(arcResult);
      }
    }

    return { arcs, confidences };
  }
}
```

**Output for "CBP is a component of DHS" (UD v2 labels):**

```javascript
{
  arcs: [
    { dependent: 1, head: 4, label: 'nsubj',    word: 'CBP' },
    { dependent: 2, head: 4, label: 'cop',       word: 'is' },
    { dependent: 3, head: 4, label: 'det',       word: 'a' },
    { dependent: 4, head: 0, label: 'root',      word: 'component' },
    { dependent: 5, head: 6, label: 'case',      word: 'of' },
    { dependent: 6, head: 4, label: 'nmod',      word: 'DHS' }
  ],
  confidences: [ /* per-arc score margins */ ]
}
```

**Note on UD v2 copular analysis:** In UD v2, the predicate nominal ("component") is the
head of the copular clause, not the copula ("is"). The copula attaches to the predicate
nominal via `cop`. This differs from the spaCy-style analysis used in v1.0 of this spec
where "is" was the root. The UD v2 analysis is correct and is what the parser will produce.

### Expected performance

- **Accuracy**: 90–93% UAS, 88–91% LAS on UD-EWT test set
- **Speed**: >5k sentences/sec (linear-time algorithm, ~2n transitions per sentence)
- **Model size**: 5–8 MB JSON raw; MUST be ≤5 MB after weight pruning

---

## 8. Layer 3: Tree-Based Entity & Act Extraction

### What it replaces

- `EntityExtractor.js` — linear scan + Compromise.js noun extraction + NPChunker heuristics
- `ActExtractor.js` — linear scan + Compromise.js verb extraction + position-based role assignment
- `RoleDetector.js` — heuristic role inference

### 8.1 Entity Subtree Traversal Rules (Normative)

When extracting entity text from a head noun's dependency subtree, the following rules
determine which edges are traversed. These rules are **normative** — they define entity
span boundaries for the entire system.

| UD v2 Label | Traverse? | Rationale |
|-------------|-----------|-----------|
| `compound` | ✅ YES | Multi-word compound: "Border Protection" |
| `flat` | ✅ YES | Multi-word name: "Barack Obama" |
| `flat:name` | ✅ YES | Same as `flat` (UD subtype) |
| `fixed` | ✅ YES | Fixed expression: "as well as" |
| `amod` | ✅ YES | Adjectival modifier: "critically ill patient" |
| `det` | ✅ YES | Determiner: "the doctor" |
| `nummod` | ✅ YES | Numeric modifier: "two patients" |
| `cc` | ✅ YES | Coordinator within entity: "Customs *and* Border Protection" |
| `conj` | ✅ YES | Conjunct within entity: "Customs and *Border* Protection" |
| `nmod` | ✅ YES | Nominal modifier: "Department *of Homeland Security*" |
| `case` | ✅ YES | Preposition within nmod: "Department *of* Homeland Security" |
| `appos` | ✅ EXTRACT ALIAS | Apposition extracts alias: "(CBP)" → `tagteam:alias` |
| `acl:relcl` | ❌ NO | Relative clause: "the doctor *who treated the patient*" |
| `acl` | ❌ NO | Adnominal clause: "the decision *to operate*" |
| `advcl` | ❌ NO | Adverbial clause (should not appear under NP, but guard) |
| `cop` | ❌ NO | Copula belongs to the clause, not the entity |
| `punct` | ❌ NO | Punctuation excluded from entity text |

**Coordination rule:** When the head noun has `conj` children, the entity span includes
ALL conjuncts and their subtrees, plus any `cc` coordinators. This ensures "Customs and
Border Protection" is one entity, not three.

**Known limitation — Coordination Blob (NEW in v2.1):** The coordination rule works
correctly for entities whose conjuncts form a single named entity ("Customs *and* Border
Protection"). However, it also collapses genuinely distinct entities into one span when
they share a predicate. Example: "CBP and ICE are agencies" produces a single entity
"CBP and ICE" rather than two separate entities sharing the `nsubj` role.

### 8.1.2 Conservative Coordination Split Heuristic (NEW in v2.2)

Expert Review #2 correctly observed that a lightweight, conservative split rule can
resolve many coordination blob cases without requiring the full scope-aware analysis
deferred to v2 (§21.7).

**Rule:** After entity extraction produces a span containing `conj` + `cc` edges, apply
the following split test:

```javascript
function shouldSplitCoordination(headEntity, depTree, gazetteer) {
  const conjuncts = depTree.getChildren(headEntity.headId)
    .filter(c => c.deprel === 'conj');

  if (conjuncts.length === 0) return false;

  // Condition 1: Head and ALL conjuncts are proper nouns (NNP/NNPS)
  const allProper = headEntity.headTag.startsWith('NNP') &&
    conjuncts.every(c => c.tag.startsWith('NNP'));
  if (!allProper) return false;

  // Condition 2: Head and ALL conjuncts independently match gazetteer entries
  const headMatch = gazetteer.lookup(headEntity.headWord);
  const conjMatches = conjuncts.map(c => gazetteer.lookup(c.word));
  const allMatch = headMatch && conjMatches.every(m => m !== null);
  if (!allMatch) return false;

  // Condition 3: No compound or flat edges cross the conjunction boundary
  // (i.e., the conjuncts are not parts of a single multi-word name)
  const headCompounds = depTree.getChildren(headEntity.headId)
    .filter(c => c.deprel === 'compound' || c.deprel === 'flat');
  const conjunctIds = new Set(conjuncts.map(c => c.id));
  const compoundsCrossConjunction = headCompounds.some(c => conjunctIds.has(c.id));
  if (compoundsCrossConjunction) return false;

  return true;  // Safe to split
}
```

**When split triggers:** Each conjunct becomes a separate entity node. All conjuncts
inherit the parent dependency role (`nsubj`, `obj`, etc.) and are linked to the same
predicate. The original composite span is NOT emitted.

**When split does NOT trigger:** The entity is emitted as a single composite span
(v2.1 behavior). This is the conservative default.

**Examples:**

| Input | Head NNP? | All Conj NNP? | All in Gazetteer? | Compounds Cross? | Result |
|-------|-----------|---------------|-------------------|-------------------|--------|
| "CBP and ICE are agencies" | ✅ | ✅ | ✅ | ❌ | **SPLIT** → 2 entities |
| "Customs and Border Protection" | ✅ | ✅ | ❌ (parts only) | ✅ (compound) | **KEEP** → 1 entity |
| "doctors and nurses" | ❌ (NN) | ❌ (NN) | — | — | **KEEP** → 1 entity |
| "France and Germany" | ✅ | ✅ | ✅ | ❌ | **SPLIT** → 2 entities |

This heuristic is deliberately conservative — it only splits when ALL three conditions
are met. False splits are more harmful than false blobs (a split creates incorrect
graph structure; a blob is merely imprecise). The full coordination analysis remains
deferred to v2 (§21.7).

**Apposition alias promotion rule (NEW in v2.2):** When a gazetteer lookup fails on
the primary entity label but succeeds on an extracted alias (from `appos`), the alias
MAY be promoted to the canonical label. Example: "International Business Machines, IBM"
— if the gazetteer contains "IBM" but not the full name, the entity node uses "IBM" as
`rdfs:label` and "International Business Machines" as `tagteam:alias` (reversed from
the default). This promotion is only applied when the alias produces a stronger gazetteer
match (exact match on alias vs. no match on label).

**Apposition rule:** When the head noun has an `appos` child, the apposition text is
extracted as a `tagteam:alias` property on the entity, not concatenated into the entity
label. Example:
- Entity label: "Customs and Border Protection"
- `tagteam:alias`: "CBP"

### 8.1.1 Subtree Traversal Is Recursive (Clarification, NEW in v2.1)

The traversal rules in the table above apply **recursively to the entire subtree** of
each traversed dependent, not just to direct children. When a dependency edge is marked
"YES", ALL descendants reachable through other "YES" edges are included.

Example demonstrating recursive depth:

```
Input: "the allegedly corrupt senior official"

Tree:
  official ← head
    ├── the ← det          (YES → include "the")
    ├── senior ← amod      (YES → include "senior")
    └── corrupt ← amod     (YES → include "corrupt")
         └── allegedly ← advmod   (YES? → see below)
```

**Clarification on `advmod` under `amod`:** The traversal table governs edges from the
entity head noun. For edges *within* a traversed modifier's subtree, the rule is:
include ALL descendants of any traversed node, EXCEPT those whose edge type would be
excluded at the top level (`acl:relcl`, `acl`, `advcl`, `cop`, `punct`).

In this example, "allegedly" is an `advmod` of "corrupt" (which is an `amod` of "official").
Since `advmod` is not in the exclusion list, it is included. The full entity span is:
**"the allegedly corrupt senior official"**.

**Implementation:** `DepTree.getEntitySubtree(headId)` performs a recursive depth-first
traversal starting from the head node. At each edge, it checks the edge label against
the exclusion set `{acl:relcl, acl, advcl, cop, punct}`. If the edge is NOT in the
exclusion set, the dependent and its subtree are included. If it IS in the exclusion set,
the entire subtree below that dependent is skipped.

```javascript
getEntitySubtree(headId, excludeLabels = ENTITY_BOUNDARY_LABELS) {
  const result = [];
  const visit = (nodeId) => {
    result.push(this.tokens[nodeId]);
    for (const child of this.getChildren(nodeId)) {
      if (excludeLabels.has(child.deprel)) continue;  // Boundary: stop recursion
      if (child.deprel === 'appos') continue;          // Extracted as alias, not span
      visit(child.id);
    }
  };
  visit(headId);
  return result.sort((a, b) => a.id - b.id);  // Return in surface order
}

const ENTITY_BOUNDARY_LABELS = new Set([
  'acl:relcl', 'acl', 'advcl', 'cop', 'punct'
]);
```

### 8.2 Entity extraction implementation

```javascript
function extractEntities(depTree) {
  const entities = [];

  for (const token of depTree.tokens) {
    // Entity heads: nouns that are arguments of the predicate
    if (['nsubj', 'obj', 'iobj', 'obl', 'nsubj:pass'].includes(token.deprel)) {
      const span = depTree.getEntitySubtree(token.id);  // Uses traversal rules from §8.1
      const aliases = depTree.getAppositions(token.id);  // Extracts appos children as aliases
      const text = span.map(t => t.word).join(' ');

      entities.push({
        headWord: token.word,
        headTag: token.tag,
        fullText: text,
        tokens: span,
        role: token.deprel,          // UD v2 label
        aliases: aliases,            // e.g., ["CBP"]
        start: Math.min(...span.map(t => t.startOffset)),
        end: Math.max(...span.map(t => t.endOffset))
      });
    }
  }

  return entities;
}
```

### 8.3 Act extraction implementation

```javascript
function extractActs(depTree) {
  const acts = [];

  for (const token of depTree.tokens) {
    if (token.tag.startsWith('VB') && isPredicatePosition(token, depTree)) {
      const act = {
        verb: token.word,
        lemma: lemmatize(token.word),
        tag: token.tag,
        // Copular detection: predicate nominal is root, copula is `cop` dependent
        isCopular: depTree.hasDependentWithLabel(token.id, 'cop') ||
                   (token.deprel === 'cop'),  // Token IS the copula
        isPassive: depTree.hasDependentWithLabel(token.id, 'nsubj:pass') ||
                   depTree.hasDependentWithLabel(token.id, 'aux:pass'),
        isNegated: depTree.hasDependentWithLabel(token.id, 'advmod',
                     t => ['not', "n't", 'never', 'no'].includes(t.word.toLowerCase())),
        agent: null,
        patient: null,
        obliques: []
      };

      // Agent: nsubj (active) or obl:agent (passive "by" phrase)
      const nsubj = depTree.getDependentByLabel(token.id, 'nsubj');
      const nsubjPass = depTree.getDependentByLabel(token.id, 'nsubj:pass');

      if (act.isPassive) {
        act.patient = nsubjPass;           // Passive subject IS the patient
        act.agent = depTree.getDependentByLabel(token.id, 'obl:agent') ||
                    depTree.getDependentByLabel(token.id, 'obl',
                      t => depTree.hasDependentWithLabel(t.id, 'case',
                        c => c.word.toLowerCase() === 'by'));
      } else {
        act.agent = nsubj;
        act.patient = depTree.getDependentByLabel(token.id, 'obj');
      }

      // Oblique arguments: obl, iobj (with case child for role subtyping)
      act.obliques = depTree.getDependentsByLabel(token.id, ['obl', 'iobj']);

      acts.push(act);
    }
  }

  return acts;
}
```

### 8.4 Role mapping (UD v2 → BFO/CCO)

Role mapping uses the normative table defined in §5.3. The `CASE_TO_OBLIQUE_ROLE` table
subtypes oblique arguments by their preposition.

### 8.5 Estimated code reduction

| Current File | Size | Replacement | Est. Size |
|-------------|------|-------------|-----------|
| `EntityExtractor.js` | 132 KB | `TreeEntityExtractor.js` | ~15–20 KB |
| `ActExtractor.js` | 102 KB | `TreeActExtractor.js` | ~15–20 KB |
| `RoleDetector.js` | 14 KB | `TreeRoleMapper.js` | ~5–8 KB |
| **Total** | **248 KB** | | **~35–48 KB** |

---

## 9. Layer 4: Copular & Stative Sentence Handling

### What it replaces

`src/graph/SentenceModeClassifier.js` — hard-coded list of 9 stative verbs

### Technical approach

With a dependency parser producing UD v2 labels, copular sentences are identified by a
structural pattern, not a verb lookup.

**Important UD v2 note:** In UD v2, the predicate nominal is the syntactic head of a
copular clause, and the copula ("is") is a `cop` dependent of the predicate nominal.
This means "CBP is a component of DHS" parses with "component" as root, not "is".

### Pattern 1: Copular predication ("X is a Y")

```
UD v2 tree:
  "component" ← root
    ├── "CBP" ← nsubj
    ├── "is" ← cop
    ├── "a" ← det
    └── "DHS" ← nmod
         └── "of" ← case
```

Detection: The root or any predicate has a `cop` dependent.

### Pattern 2: Negated copular predication ("X is NOT a Y") — NEW in v2.0

```
UD v2 tree:
  "component" ← root
    ├── "CBP" ← nsubj
    ├── "is" ← cop
    ├── "not" ← advmod
    ├── "a" ← det
    └── "DHS" ← nmod
         └── "of" ← case
```

Detection: The predicate has both a `cop` dependent AND an `advmod` dependent whose
lemma is "not", "n't", "never", or "no".

Output: `StructuralAssertion` with `tagteam:negated: true`.

### Pattern 3: Existential ("There is/are X")

```
  "problem" ← root
    ├── "There" ← expl
    └── "is" ← cop
```

Detection: Token has both `expl` and `cop` dependents.

### Pattern 4: Possessive ("X has Y")

```
  "has" ← root
    ├── "organization" ← nsubj
    └── "members" ← obj
```

Detection: Verb lemma is "have" with `obj` but no `aux` child (distinguishes "has members"
from "has been running").

### Pattern 5: Locative/stative ("X is in Y")

```
  "headquarters" ← root
    ├── "is" ← cop
    ├── "El Paso" ← obl
    │    └── "in" ← case
    └── ... ← nsubj
```

Detection: Predicate has `cop` dependent and `obl` argument (instead of `nmod` for
composition or `xcomp` for type predication).

### Output for copular sentences

```javascript
{
  type: 'StructuralAssertion',
  subject: { /* entity from nsubj subtree */ },
  relation: 'cco:has_part',    // Inferred from predicate nominal
  object: { /* entity from nmod/obl subtree */ },
  copula: 'is',
  negated: false,               // true for Pattern 2
  confidence: 0.95
}
```

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

### Negation interaction

When `negated: true`, the structural assertion represents a **denial** of the relation.
The JSON-LD output includes `tagteam:negated: true` and the downstream ontology layer
does NOT assert the relation as fact. Instead, a `tagteam:NegatedStructuralAssertion`
node is created. This preserves the information that the text explicitly denies the relation.

```json
{
  "@id": "inst:NegPartOf_CBP_DHS",
  "@type": ["tagteam:NegatedStructuralAssertion"],
  "rdfs:label": "CBP is not a component of DHS",
  "tagteam:subject": { "@id": "inst:CBP_Organization" },
  "tagteam:relation": "cco:has_part",
  "tagteam:object": { "@id": "inst:DHS_Organization" },
  "tagteam:negated": true,
  "tagteam:copula": "is",
  "tagteam:assertionType": "negated_structural_composition"
}
```

---

## 10. Layer 5: NER Upgrade with Gazetteers

### What it replaces

`src/graph/ComplexDesignatorDetector.js` — capitalization-based heuristics for proper names

### Technical approach: Gazetteer + dependency structure

A **gazetteer** is a lookup table of known entities. Combined with the dependency parser's
`compound` and `flat` labels, it provides high-precision NER without statistical models.

**Three-stage NER:**

1. **Dependency-based NP extraction** (from Layer 3): The parser identifies multi-word
   names via `compound` and `flat` edges. "Customs and Border Protection" is one subtree.

2. **Gazetteer lookup**: Check extracted NPs against known entity lists. Match strategy:
   exact match (case-insensitive) on full entity text, then alias match on abbreviations.

3. **Capitalization + context fallback**: For entities not in the gazetteer, use the
   existing ComplexDesignatorDetector heuristics as a fallback.

### 10.1 Gazetteer sources (all freely available)

| Gazetteer | Size | Source | License |
|-----------|------|--------|---------|
| US Government agencies | ~500 entries | USA.gov | Public domain |
| International organizations | ~2,000 entries | Wikidata SPARQL | CC0 |
| Common person names | ~10,000 entries | US Census Bureau | Public domain |
| Country/state/city names | ~50,000 entries | GeoNames | CC-BY |
| Medical organizations | ~1,000 entries | NLM/WHO | Public domain |
| Religious organizations | ~500 entries | Wikidata | CC0 |

Total gazetteer size: ~200–500 KB JSON.

### 10.2 Matching strategy

| Match Type | Method | Example |
|------------|--------|---------|
| Full exact | Case-insensitive match on full entity text | "customs and border protection" → CBP |
| Alias exact | Match against aliases array | "CBP" → Customs and Border Protection |
| Normalized | Abbreviation expansion before match (NEW in v2.1) | "Dept. of Homeland Security" → Department of Homeland Security |
| Partial | NOT supported in v1 — "Customs" alone does not match | — |

**Abbreviation normalization (NEW in v2.1):** Before gazetteer lookup, entity text is
passed through a lightweight normalization step that expands common abbreviations. This
prevents a "cliff effect" where minor surface variations (e.g., "Dept." vs "Department")
cause a complete miss and fall through to the heuristic fallback.

```javascript
const ABBREVIATION_MAP = {
  'dept.':   'department',
  'dept':    'department',
  'assn.':   'association',
  'assn':    'association',
  'org.':    'organization',
  'org':     'organization',
  'corp.':   'corporation',
  'corp':    'corporation',
  'inc.':    'incorporated',
  'inc':     'incorporated',
  'intl.':   'international',
  'intl':    'international',
  'natl.':   'national',
  'natl':    'national',
  'admin.':  'administration',
  'admin':   'administration',
  'govt.':   'government',
  'govt':    'government',
  'univ.':   'university',
  'univ':    'university',
  'svc.':    'service',
  'svcs.':   'services',
  'mgmt.':   'management',
  'mgmt':    'management',
  'comm.':   'commission',
  'comm':    'commission',
  'div.':    'division',
  'div':     'division',
};
```

The normalization is applied to the entity text before case-insensitive comparison. It
does NOT modify the entity text in the output — only the lookup key.

**Match precedence:**
1. Exact case-insensitive match on raw entity text
2. Exact alias match on raw entity text
3. Exact case-insensitive match on **normalized** entity text (abbreviations expanded)
4. Fallback to ComplexDesignatorDetector heuristics

Additionally, each gazetteer entry's `aliases` array SHOULD include common abbreviated
forms. For example, "Department of Homeland Security" should list `["DHS", "Dept. of
Homeland Security", "Homeland Security Dept."]` as aliases.

Partial matching (substring, fuzzy) is deferred to avoid false positives. If a downstream
use case requires it, it can be added as an opt-in configuration.

### 10.3 Entity type classification

```json
{
  "Customs and Border Protection": {
    "type": "cco:Organization",
    "aliases": ["CBP"],
    "parent": "Department of Homeland Security"
  },
  "Department of Homeland Security": {
    "type": "cco:Organization",
    "aliases": ["DHS"]
  }
}
```

### 10.4 Gazetteer versioning (NEW in v2.0)

Each gazetteer data file MUST include a version header:

```json
{
  "_meta": {
    "gazetteerId": "us-government-agencies",
    "version": "2026.02.1",
    "source": "USA.gov",
    "license": "Public domain",
    "entryCount": 487,
    "generatedAt": "2026-02-13T00:00:00Z"
  },
  "entities": {
    "Customs and Border Protection": { "type": "cco:Organization", "aliases": ["CBP"] }
  }
}
```

The GIT-Minimal provenance output MUST include gazetteer version references:

```json
{
  "@id": "inst:Processing_abc123",
  "@type": "cco:IntentionalAct",
  "rdfs:label": "ActOfArtificialProcessing",
  "tagteam:gazetteerVersions": [
    { "id": "us-government-agencies", "version": "2026.02.1" },
    { "id": "geonames-places", "version": "2026.01.1" }
  ]
}
```

This ensures determinism is traceable: same input + same model + same gazetteer version
= same output.

### 10.5 Existing code preserved

The `ComplexDesignatorDetector.js` heuristics are retained as the fallback for entities
not in the gazetteer. The dependency parser's `compound`/`flat` labels provide better span
boundaries than the current capitalization-only approach.

---

## 11. What Gets Preserved vs. Replaced

### Preserved (no changes)

| Module | Reason |
|--------|--------|
| `SemanticRoleExtractor.js` | Week 1 API (parse method) — separate from graph pipeline |
| `ContextAnalyzer.js` | Context intensity analysis operates on its own features |
| `CertaintyAnalyzer.js` | Epistemic markers are independent of parse structure |
| `ValueMatcher.js` | Value detection uses keyword patterns, not syntax |
| `ValueScorer.js` | Scoring algorithm is independent |
| `EthicalProfiler.js` | Profiling operates on value/context outputs |
| `ContractionExpander.js` | Phase 5 — still used in parse() API path (see §12) |
| `Lemmatizer.js` | Phase 5 — still used in parse() API path (see §12) |
| `VerbPhraseExtractor.js` | Phase 5 — fallback for parse() API path (see §12) |
| `NounPhraseExtractor.js` | Phase 5 — fallback for parse() API path (see §12) |
| `RealWorldEntityFactory.js` | Tier 2 entity creation logic is sound |
| `ScarcityAssertionFactory.js` | Scarcity detection is keyword-based |
| `DirectiveExtractor.js` | Modal detection from POS tags still works |
| `ObjectAggregateFactory.js` | Plural entity handling is independent |
| `QualityFactory.js` | Entity qualifiers — improved input from `amod` deps |
| `AssertionEventBuilder.js` | Provenance/assertion events are structural |
| `ContextManager.js` | Graph context management is independent |
| `InformationStaircaseBuilder.js` | IBE provenance is independent |
| `SHMLValidator.js` | SHACL validation operates on output graph |
| `ComplexityBudget.js` | Complexity limits are independent |
| `AmbiguityDetector.js` | Ambiguity detection — enhanced by deps |
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
| `RoleDetector.js` | `TreeRoleMapper.js` | UD labels replace heuristic inference |
| `SentenceModeClassifier.js` | Absorbed into TreeActExtractor | Copular = dep pattern |

### Enhanced (modified but not replaced)

| Module | Enhancement |
|--------|-------------|
| `SemanticGraphBuilder.js` | Orchestrator updated to use dependency tree flow |
| `ComplexDesignatorDetector.js` | Becomes fallback behind gazetteer + dep tree NER |
| `AmbiguityDetector.js` | Can use dep tree for more precise ambiguity detection |
| `ClauseSegmenter.js` | Clause boundaries from `mark`/`acl:relcl` dep labels |

---

## 12. Phase 5 Module Lifecycle & Precedence (NEW in v2.0)

### The problem

Phase 5 modules (ContractionExpander, Lemmatizer, VerbPhraseExtractor, NounPhraseExtractor)
were built to operate without a dependency parser. After the refactor, the dependency tree
provides much of the same information (and more). This creates potential conflicts.

### Precedence rules (normative)

| API Path | POS Source | Structure Source | Phase 5 Modules |
|----------|-----------|------------------|-----------------|
| `TagTeam.parse()` (Week 1 API) | PerceptronTagger | VerbPhraseExtractor, NounPhraseExtractor | **Primary** — no dep tree |
| `TagTeam.buildGraph()` (Phase 4+ API) | PerceptronTagger | DependencyParser | **Fallback only** |
| `TagTeam.toJSONLD()` | PerceptronTagger | DependencyParser | **Fallback only** |

**Rule:** When the dependency tree is available (i.e., `buildGraph()` and `toJSONLD()`
paths), the tree-based extractors are authoritative. Phase 5 modules are NOT invoked
for entity/act extraction in these paths.

**Rule:** When the dependency tree is NOT available (i.e., `parse()` path), Phase 5
modules remain the primary extraction mechanism. This preserves backward compatibility
for the Week 1 API.

**Rule:** `ContractionExpander.js` and `Lemmatizer.js` are always invoked as preprocessing
steps regardless of API path. They operate on raw text before POS tagging and do not
conflict with the dependency tree.

### Deprecation checklist (post-stabilization)

After the refactor has stabilized (all golden tests passing, no regressions for 30 days),
evaluate each Phase 5 module for deprecation:

| Module | Deprecation Candidate? | Condition |
|--------|----------------------|-----------|
| `ContractionExpander.js` | No | Always needed for preprocessing |
| `Lemmatizer.js` | No | Always needed (dep parser doesn't lemmatize) |
| `VerbPhraseExtractor.js` | Yes, for buildGraph path | If parse() API is also migrated to use dep tree |
| `NounPhraseExtractor.js` | Yes, for buildGraph path | If parse() API is also migrated to use dep tree |
| `NPChunker.js` | Yes, immediately | Fully replaced by TreeEntityExtractor |

Deprecation is NOT a v1 deliverable. Phase 5 modules remain in the bundle during the
refactor period. Removal is a separate work package with its own test plan.

---

## 13. Confidence Propagation & Structured Uncertainty (NEW in v2.0)

### Motivation

The parser's greedy decoding sometimes makes choices with narrow score margins — the
top-scoring transition barely beats the second-best. These low-margin decisions produce
dependency arcs that may be wrong. Rather than silently committing to potentially incorrect
structure, the system propagates confidence information downstream.

This aligns with TagTeam's guiding principle: *"Better to output structured uncertainty
than false precision."*

### Score margin calculation

At each parser step, the score margin is:

```
margin = score(best_transition) - score(second_best_valid_transition)
```

A high margin (>2.0) means the parser is confident. A low margin (<0.5) means the
decision was borderline.

### Confidence thresholds

| Margin | Confidence Level | TagTeam Behavior |
|--------|-----------------|------------------|
| ≥ 2.0 | High | No annotation |
| 0.5 – 2.0 | Medium | `tagteam:parseConfidence: "medium"` on affected graph nodes |
| < 0.5 | Low | `tagteam:parseConfidence: "low"` + feeds into AmbiguityDetector |

### PP-attachment sensitivity tuning (NEW in v2.1)

Prepositional phrase attachment is the single most common error class for transition-based
parsers. The classic ambiguity — "I saw the man with the telescope" — manifests as the
parser choosing between attaching the PP ("with the telescope") to the verb ("saw") or
the noun ("man"). This decision maps to either an `obl` arc (verb attachment) or an
`nmod` arc (noun attachment).

**Normative requirement:** The `ConfidenceAnnotator` MUST apply **tighter thresholds**
for arcs with label `obl` or `nmod` when the dependent has a `case` child (indicating
a prepositional phrase):

| Margin (PP arcs only) | Confidence Level | Rationale |
|-----------------------|-----------------|-----------|
| ≥ 3.0 | High | PP attachment requires higher confidence |
| 1.0 – 3.0 | Medium | Flag for review |
| < 1.0 | Low | Feed into AmbiguityDetector with alternative attachment |

When a PP-attachment arc is flagged as low-confidence, the `ConfidenceAnnotator` MUST
also compute the **alternative attachment point** — if the parser chose `obl` (verb
attachment), the alternative is `nmod` (noun attachment) to the nearest preceding noun,
and vice versa. This alternative is passed to the AmbiguityDetector:

```javascript
{
  type: 'pp_attachment_uncertainty',
  affectedArc: { dependent: 7, head: 3, label: 'obl' },     // chosen: verb attachment
  alternativeArc: { dependent: 7, head: 5, label: 'nmod' },  // alternative: noun attachment
  scoreMargin: 0.71,
  ppHead: 'with',     // the preposition
  ppNoun: 'telescope' // the PP's noun
}
```

This is the highest-value signal for the interpretation lattice, as PP-attachment
ambiguity is frequently meaning-changing (instrument vs. modifier, location vs.
possession).

### Integration with existing ambiguity pipeline

Low-confidence dependency arcs feed into the existing `AmbiguityDetector.js` as a new
ambiguity signal type:

```javascript
{
  type: 'parse_uncertainty',
  affectedArc: { dependent: 3, head: 1, label: 'nsubj' },
  scoreMargin: 0.32,
  calibratedProbability: 0.61,   // NEW in v2.2: calibrated probability (see below)
  alternativeLabel: 'obj',
  alternativeMargin: 0.32,
  alternativeProbability: 0.39   // NEW in v2.2
}
```

This integrates naturally with the Phase 6 interpretation lattice — a low-confidence
`nsubj` arc might produce alternative readings where the entity is `obj` (patient)
instead of `nsubj` (agent).

### Confidence calibration (NEW in v2.2)

Raw score margins are heuristic — a margin of 1.5 does not directly correspond to a
probability. Expert Review #2 correctly identified that downstream decision rules and
UI thresholds benefit from calibrated probabilities.

**Calibration procedure (performed once, during training evaluation):**

1. Run the trained parser on the UD-EWT dev set
2. For each parser decision, record: `(margin, correct_or_not)`
3. Bin margins into ~50 equal-frequency bins
4. For each bin, compute: `P(correct | margin in bin)` = (correct decisions / total)
5. Fit a monotonic mapping function: `margin → P(correct)`
   - **Preferred method:** Isotonic regression (sklearn.isotonic.IsotonicRegression)
   - **Fallback method:** Logistic/Platt scaling (simpler, parametric)
6. Export the calibration mapping as a lookup table in the model file

**Calibration table format (added to model JSON / binary header):**

```json
{
  "calibration": {
    "method": "isotonic",
    "bins": [
      { "marginMin": 0.0, "marginMax": 0.3, "probability": 0.52 },
      { "marginMin": 0.3, "marginMax": 0.6, "probability": 0.68 },
      { "marginMin": 0.6, "marginMax": 1.0, "probability": 0.79 },
      { "marginMin": 1.0, "marginMax": 2.0, "probability": 0.91 },
      { "marginMin": 2.0, "marginMax": 5.0, "probability": 0.97 },
      { "marginMin": 5.0, "marginMax": 999, "probability": 0.99 }
    ]
  }
}
```

**Runtime usage:** The `ConfidenceAnnotator` looks up the calibrated probability from
the margin and stores BOTH values on graph nodes:

```json
{
  "tagteam:parseConfidence": "low",
  "tagteam:parseMargin": 0.32,
  "tagteam:parseProbability": 0.56
}
```

The `low/medium/high` bucket labels remain for human readability. The calibrated
probability enables quantitative downstream decisions (e.g., "suppress nodes with
P < 0.6" or "show alternative reading if P < 0.7").

**Training pipeline addition:** `training/calibrate_parser.py` (~80 lines) produces
the calibration table from dev-set predictions. This runs after `train_dep_parser.py`
and before `export_models.py`.

### Confidence on graph nodes

When a graph node (entity, act, or role) depends on a low-confidence arc, it inherits
a confidence annotation:

```json
{
  "@id": "inst:Agent_Role_abc",
  "@type": "bfo:Role",
  "rdfs:label": "AgentRole",
  "bfo:BFO_0000052": { "@id": "inst:Person_Doctor" },
  "tagteam:parseConfidence": "low",
  "tagteam:parseMargin": 0.32
}
```

Consumers of TagTeam output can filter or flag nodes with `tagteam:parseConfidence: "low"`.

---

## 14. Verbose Debug Output (NEW in v2.0)

### Existing pattern

TagTeam already supports `{ verbose: true }` which exposes `_debug.tokens` (POS tags
from Compromise.js). The refactor extends this pattern.

### New debug fields

When `{ verbose: true }` is passed to `buildGraph()`:

```javascript
const graph = TagTeam.buildGraph(text, { verbose: true });

// Existing (updated to use PerceptronTagger output)
graph._debug.tokens = [
  { text: "CBP", tag: "NNP" },
  { text: "is", tag: "VBZ" },
  { text: "a", tag: "DT" },
  { text: "component", tag: "NN" },
  { text: "of", tag: "IN" },
  { text: "DHS", tag: "NNP" }
];

// NEW: Dependency tree
graph._debug.dependencyTree = [
  { id: 1, word: "CBP",       tag: "NNP", head: 4, deprel: "nsubj", margin: 3.21 },
  { id: 2, word: "is",        tag: "VBZ", head: 4, deprel: "cop",   margin: 5.44 },
  { id: 3, word: "a",         tag: "DT",  head: 4, deprel: "det",   margin: 4.82 },
  { id: 4, word: "component", tag: "NN",  head: 0, deprel: "root",  margin: 2.91 },
  { id: 5, word: "of",        tag: "IN",  head: 6, deprel: "case",  margin: 6.10 },
  { id: 6, word: "DHS",       tag: "NNP", head: 4, deprel: "nmod",  margin: 3.55 }
];

// NEW: Entity extraction trace
graph._debug.entitySpans = [
  { head: "CBP",       span: [1],    fullText: "CBP",    role: "nsubj" },
  { head: "component", span: [3, 4], fullText: "a component", role: "root" },
  { head: "DHS",       span: [5, 6], fullText: "of DHS", role: "nmod" }
];

// NEW: Gazetteer matches
graph._debug.gazetteers = {
  matched: [
    { text: "CBP", gazetteerId: "us-government-agencies", version: "2026.02.1",
      resolvedTo: "Customs and Border Protection", type: "cco:Organization" }
  ],
  unmatched: []
};
```

The `_debug` object is NOT part of the canonical JSON-LD output. It is stripped by
`JSONLDSerializer.js` when producing the final `@graph`. It exists solely for developer
inspection and is only populated when `verbose: true`.

---

## 15. Training Pipeline

### 15.1 Licensing & Attribution (NEW in v2.2 — BLOCKING)

**This section is a release blocker.** Expert Review #2 correctly identified that
training models on CC-BY-SA 4.0 data creates redistribution obligations that must be
resolved before shipping models in the TagTeam bundle.

**Training data license:**

| Data Source | License | Obligations |
|-------------|---------|-------------|
| UD English-EWT | CC-BY-SA 4.0 | Attribution required. Share-alike may apply to derived works. |
| GeoNames | CC-BY 4.0 | Attribution required. |
| Wikidata | CC0 | No obligations. |
| US Census (names) | Public domain | No obligations. |
| USA.gov (agencies) | Public domain | No obligations. |
| NLM/WHO (medical orgs) | Public domain | No obligations. |

**The CC-BY-SA 4.0 question:** Whether model weights trained on CC-BY-SA data constitute
a "derivative work" under copyright law is legally contested. Some legal interpretations
hold that trained model weights are transformative (not derivative); others argue that
they embed sufficient representation of the original data to trigger share-alike. This
spec does NOT resolve this legal question — it requires that it be resolved.

**Required actions (BLOCKING release):**

1. **Legal review:** Before shipping any models trained on UD-EWT, obtain a written
   legal opinion (internal counsel or external) on whether the trained binary weights
   constitute a derivative work under CC-BY-SA 4.0.

2. **Attribution:** Regardless of the derivative-work question, CC-BY-SA 4.0 requires
   attribution. The following attribution MUST be included in:
   - `training/README.md`
   - `package.json` (in a `licenses` or `credits` field)
   - The binary model header (§20, `trainingDataLicense` field)
   - Any public documentation or release notes

   **Attribution text:**
   ```
   POS tagger and dependency parser models trained on Universal Dependencies
   English-EWT (https://universaldependencies.org/treebanks/en_ewt/),
   licensed under CC-BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).
   Original data by Silveira et al. (2014) and subsequent UD contributors.
   ```

3. **License file:** Ship a `THIRD_PARTY_LICENSES.md` in the TagTeam distribution
   listing all data sources, their licenses, and attribution statements.

4. **If derivative-work ruling is YES (share-alike applies):**
   - The trained model weights must be distributed under CC-BY-SA 4.0 or a compatible
     license
   - This does NOT affect the TagTeam.js source code (which has its own license)
   - Document the model license separately from the code license

5. **If derivative-work ruling is NO (share-alike does not apply):**
   - Attribution is still required (CC-BY requirement)
   - Models can be distributed under any license
   - Document this determination in `THIRD_PARTY_LICENSES.md`

**Timeline:** Legal review MUST be initiated during Phase 0 and completed before Phase 2
(dependency parser training). POS tagger training (Phase 1) can proceed in parallel with
legal review since the model is not shipped until Phase 4.

### Overview

Training happens **once**, offline, in Python. The trained models are exported as JSON and
shipped with TagTeam.js. End users never need to train anything.

### Directory structure

```
training/
  ├── README.md                  # Setup, instructions, AND UD-EWT attribution (§15.1)
  ├── THIRD_PARTY_LICENSES.md   # All data source licenses — NEW in v2.2
  ├── requirements.txt           # Python dependencies (numpy + sklearn for calibration)
  ├── LABEL_CONVENTION.md        # Copy of §5 from this spec (normative reference)
  ├── TOKENIZER_ALIGNMENT_REPORT.md  # Phase 0 deliverable (§5.5) — NEW in v2.1
  ├── data/
  │   └── UD_English-EWT/        # Downloaded treebank (CoNLL-U files, version ≥2.14)
  ├── train_pos_tagger.py        # Train averaged perceptron POS tagger (XPOS column)
  ├── train_dep_parser.py        # Train arc-eager dependency parser (UD v2 labels)
  ├── calibrate_parser.py        # Margin → probability calibration — NEW in v2.2
  ├── prune_weights.py           # Weight pruning to meet size budget
  ├── export_models.py           # Export to JSON (debug) AND binary (production)
  ├── evaluate.py                # Evaluate on test set
  ├── tokenizer_alignment.py     # Compare Tokenizer.js output vs CoNLL-U gold tokens
  └── models/
      ├── pos-weights.json       # Exported POS tagger model (debug format)
      ├── pos-weights.bin        # Exported POS tagger model (production binary)
      ├── dep-weights.json       # Exported dependency parser model (debug format)
      └── dep-weights.bin        # Exported dependency parser model (production binary)
```

### Python dependencies

```
numpy          # Array operations for weight averaging
scikit-learn   # Isotonic regression for confidence calibration (§13) — NEW in v2.2
```

No TensorFlow, no PyTorch. `scikit-learn` is a training-only dependency (not runtime)
and is used solely for the isotonic regression calibration step.

### Training procedure

```bash
# 0. Tokenizer alignment check (NEW in v2.1 — MUST PASS BEFORE TRAINING)
python training/tokenizer_alignment.py \
  --conllu training/data/UD_English-EWT/en_ewt-ud-train.conllu \
  --tokenizer-cmd "node -e \"const T = require('./src/core/Tokenizer'); ...\"" \
  --report training/TOKENIZER_ALIGNMENT_REPORT.md \
  --max-mismatch-rate 0.005   # 0.5% threshold — fail if exceeded

# 1. Download UD English-EWT (version ≥2.14)
git clone https://github.com/UniversalDependencies/UD_English-EWT training/data/UD_English-EWT

# 2. Train POS tagger on XPOS column (PTB tags)
python training/train_pos_tagger.py \
  --train training/data/UD_English-EWT/en_ewt-ud-train.conllu \
  --dev training/data/UD_English-EWT/en_ewt-ud-dev.conllu \
  --tag-column xpos \
  --iterations 5 \
  --output training/models/pos-weights.json

# 3. Train dependency parser on UD v2 labels
python training/train_dep_parser.py \
  --train training/data/UD_English-EWT/en_ewt-ud-train.conllu \
  --dev training/data/UD_English-EWT/en_ewt-ud-dev.conllu \
  --pos-column xpos \
  --iterations 10 \
  --output training/models/dep-weights.json

# 4. Prune weights to meet size budget
python training/prune_weights.py \
  --model training/models/pos-weights.json \
  --threshold 0.01 \
  --max-size-mb 5 \
  --output training/models/pos-weights-pruned.json

python training/prune_weights.py \
  --model training/models/dep-weights.json \
  --threshold 0.01 \
  --max-size-mb 5 \
  --output training/models/dep-weights-pruned.json

# 5. Calibrate parser confidence (NEW in v2.2)
python training/calibrate_parser.py \
  --model training/models/dep-weights-pruned.json \
  --dev training/data/UD_English-EWT/en_ewt-ud-dev.conllu \
  --method isotonic \
  --output training/models/dep-calibration.json

# 6. Export to binary format (REQUIRED in v2.1)
python training/export_models.py \
  --json-model training/models/pos-weights-pruned.json \
  --output-bin training/models/pos-weights-pruned.bin \
  --format float32

python training/export_models.py \
  --json-model training/models/dep-weights-pruned.json \
  --calibration training/models/dep-calibration.json \
  --output-bin training/models/dep-weights-pruned.bin \
  --format float32

# 6. Evaluate
python training/evaluate.py \
  --test training/data/UD_English-EWT/en_ewt-ud-test.conllu \
  --pos-model training/models/pos-weights-pruned.json \
  --dep-model training/models/dep-weights-pruned.json \
  --pos-column xpos

# 7. Copy production models to TagTeam src/data/
cp training/models/*-pruned.bin src/data/
cp training/models/*-pruned.json src/data/   # Keep JSON for debugging
```

### Weight pruning specification (normative)

The `prune_weights.py` script MUST:

1. Remove all feature-weight entries where `|weight| < threshold` (default: 0.01)
2. Report accuracy on dev set before and after pruning
3. Fail with error if post-pruning accuracy drops more than 0.3% from pre-pruning
4. Fail with error if output file exceeds `--max-size-mb`

Expected pruning results: 30–50% reduction in model size with <0.1% accuracy loss.

### Domain fine-tuning (optional, for 92% → 95%)

After the base models are trained on UD-EWT, they can be further tuned on TagTeam-specific
data:

1. Create 100–200 manually annotated sentences from TagTeam's target domains
   (ethical deliberation, organizational descriptions, stakeholder analysis)
2. Format as CoNLL-U (XPOS column for tags, UD v2 DEPREL for labels)
3. Run 2–3 additional training iterations starting from the UD-EWT weights
4. Re-export and re-prune to JSON

This is a **separate work package** with its own timeline and quality criteria. It is
NOT required for the base refactor to succeed.

---

## 16. Integration Strategy

### 16.1 Async Model Loading API (NEW in v2.2)

Model files (POS weights: ~2 MB, dep weights: ~3.5 MB) can cause main-thread stalls
if loaded synchronously, especially on mobile devices with limited RAM.

**Normative requirement:** TagTeam MUST provide an async model loading API:

```javascript
// Explicit async load — integrators control timing
await TagTeam.loadModels({
  pos: '/models/pos-weights-pruned.bin',
  dep: '/models/dep-weights-pruned.bin',    // Optional — only needed for buildGraph()
  gazetteers: '/models/gazetteers/'          // Optional — directory or manifest URL
});

// After loadModels resolves, all sync APIs work as before
const graph = TagTeam.buildGraph(text);
```

**Loading behavior:**

| API | POS model required? | Dep model required? | Auto-load if missing? |
|-----|--------------------|--------------------|----------------------|
| `TagTeam.parse()` | Yes | No | Yes (POS only) |
| `TagTeam.buildGraph()` | Yes | Yes | Yes (both) |
| `TagTeam.toJSONLD()` | Yes | Yes | Yes (both) |
| `TagTeam.loadModels()` | Explicit | Explicit | N/A |

**Auto-load behavior:** If `buildGraph()` is called before `loadModels()`, TagTeam
auto-loads the required models from default paths. This preserves backward compatibility
but logs a console warning:

```
[TagTeam] Models not pre-loaded. Loading synchronously from default paths.
For better performance, call TagTeam.loadModels() during app initialization.
```

**Progressive loading strategy (RECOMMENDED for mobile):**
1. App startup: `await TagTeam.loadModels({ pos: url })` — load POS model only (~2 MB)
2. `TagTeam.parse()` is now available immediately
3. When user triggers graph generation: `await TagTeam.loadModels({ dep: url })` — load
   dep model on demand (~3.5 MB)
4. `TagTeam.buildGraph()` is now available

**Error handling:**

```javascript
try {
  await TagTeam.loadModels({ pos: url, dep: url });
} catch (e) {
  if (e instanceof TagTeam.ModelLoadError) {
    // e.model: 'pos' | 'dep' | 'gazetteers'
    // e.reason: 'network' | 'checksum_mismatch' | 'version_incompatible' | 'oom'
    console.error(`Failed to load ${e.model}: ${e.reason}`);
  }
}
```

**Memory budget (advisory):** On devices with <2 GB RAM (low-end Android), loading both
models simultaneously may cause pressure. The progressive strategy above mitigates this.
Phase 4 validation MUST include memory profiling on representative mobile devices (see §17).

### SemanticGraphBuilder.build() — updated flow

```javascript
build(text, options) {
  // Step 0: Unicode normalization (NEW in v2.2 — §5.5.1)
  const normalized = normalizeUnicode(text);

  // Step 1: Preprocess (existing modules, always invoked)
  const expanded = this.contractionExpander.expand(normalized);

  // Step 2: Tokenize (existing Tokenizer.js, UD-aligned per §5.5)
  const tokens = this.tokenizer.tokenize(expanded);

  // Step 3: POS tag (NEW — Layer 1)
  const tags = this.posTagger.tag(tokens.map(t => t.text));

  // Step 4: Dependency parse (NEW — Layer 2)
  const { arcs, confidences } = this.depParser.parse(tokens.map(t => t.text), tags);
  const depTree = new DepTree(tokens, tags, arcs, confidences);

  // Step 5: NER with gazetteers (NEW — Layer 5)
  const nerResults = this.nerTagger.tag(tokens, tags, depTree);

  // Step 6: Extract entities from dep tree (NEW — Layer 3)
  //         Includes coordination split heuristic (§8.1.2)
  const entities = this.treeEntityExtractor.extract(depTree, nerResults);

  // Step 7: Extract acts from dep tree (NEW — Layers 3+4)
  const acts = this.treeActExtractor.extract(depTree, entities);

  // Step 8: Map roles via UD v2 → BFO (NEW — Layer 3, using §5.3 mapping)
  const roles = this.treeRoleMapper.map(acts, entities, depTree);

  // Step 9: Annotate confidence with calibrated probabilities (§13)
  this.confidenceAnnotator.annotate(entities, acts, roles, confidences);

  // Step 10: Create BFO/CCO graph nodes (EXISTING — preserved)
  const nodes = this.createGraphNodes(entities, acts, roles);

  // Step 11: Assertion events, value detection, etc. (EXISTING — preserved)
  this.addAssertionEvents(nodes, text, options);
  this.addValueDetection(nodes, text, options);

  // Step 12: SHACL validation (EXISTING — preserved)
  this.validate(nodes);

  // Step 13: Debug output (§14, only if verbose)
  if (options.verbose) {
    this._debug = {
      tokens: tokens.map((t, i) => ({ text: t.text, tag: tags[i] })),
      dependencyTree: depTree.toDebugArray(),
      entitySpans: entities.map(e => e.toDebugObject()),
      gazetteers: nerResults.toDebugObject()
    };
  }

  // Step 14: Emit cross-sentence mention IDs for future coreference (§21.1)
  this._assignMentionIds(entities);

  return { '@context': this.context, '@graph': nodes };
}
```

### Backward compatibility

The public API remains unchanged:

```javascript
// These continue to work identically
TagTeam.parse(text)              // Semantic role extraction (Week 1 API — uses Phase 5 modules)
TagTeam.buildGraph(text)         // JSON-LD graph (Phase 4+ API — uses dep tree)
TagTeam.toJSONLD(text, options)  // Serialized JSON-LD
```

---

## 17. Testing & Validation

### Evaluation methodology

Each layer has independent unit tests plus end-to-end integration tests.

**Layer 1 tests** (POS tagger):
- Standard evaluation: accuracy on UD-EWT test set XPOS column (target: >96%)
- TagTeam-specific: accuracy on 50 manually tagged sentences from test corpus
- Regression: existing golden test sentences should not degrade

**Layer 2 tests** (dependency parser):
- Standard evaluation: UAS and LAS on UD-EWT test set (target: >90% UAS, >88% LAS)
- UD v2 label correctness: verify all output labels are in canonical set (§5.2)
- TagTeam-specific: parse quality on 50 manually parsed sentences
- Specific failure cases: CBP sentence, copular sentences, passive voice

**Layer 3 tests** (tree extraction):
- Entity boundary accuracy: precision/recall on entity span detection
- Subtree traversal rule compliance: verify only §8.1-permitted edges are traversed
- Role assignment accuracy: precision/recall on agent/patient/oblique
- Comparison: side-by-side with current system on golden test corpus

**Layer 4 tests** (copular handling):
- Copular detection accuracy on 100 mixed sentences (50 copular, 50 eventive)
- Negated copular detection on 20 negated sentences (NEW)
- Relation inference accuracy for predicate nominals

**Layer 5 tests** (NER):
- Gazetteer coverage: % of test corpus entities found in gazetteers
- Gazetteer version metadata: verify `_meta` fields present and correct
- Precision/recall of entity type classification

**Confidence propagation tests** (§13):
- Score margin calculation correctness
- Threshold classification (high/medium/low)
- Calibration curve: margin vs actual accuracy on dev set (NEW in v2.2)
- AmbiguityDetector integration: low-confidence arcs produce ambiguity signals
- PP-attachment specific: verify tighter thresholds apply to `obl`/`nmod` with `case`

**Debug output tests** (§14):
- `_debug.dependencyTree` present when `verbose: true`
- `_debug.dependencyTree` absent when `verbose: false`
- All debug fields match expected structure

**Model loading tests** (§16.1, NEW in v2.2):
- `TagTeam.loadModels()` resolves with correct model metadata
- `TagTeam.buildGraph()` auto-loads missing models with console warning
- `TagTeam.buildGraph()` after explicit `loadModels()` produces no warning
- Checksum mismatch throws `ModelLoadError` with `reason: 'checksum_mismatch'`
- Progressive loading: POS-only load enables `parse()`, dep load enables `buildGraph()`

**End-to-end tests**:
- Existing golden test suite (`npm run test:golden`) — should not regress
- Existing component tests (`npm run test:component`) — should improve
- New evaluation set: 200 sentences with gold-standard JSON-LD graphs
- CBP-class sentences: 50 organizational/definitional sentences
- Coordination split: 20 sentences with coordinated NNPs (verify split/keep decisions)

### Adversarial & edge-case test sets (NEW in v2.2)

Expert Review #2 identified categories of input that stress tokenization and parsing
boundaries. The following test sets MUST be created during Phase 4:

| Test Category | Examples | Count | Purpose |
|--------------|---------|-------|---------|
| Unicode variants | Smart quotes: `don't`, em dashes, non-breaking spaces | 20 | Verify §5.5.1 normalization |
| URLs and emails | `Visit https://example.com or email info@cbp.gov` | 15 | Verify tokenizer doesn't fragment |
| Emoji sequences | `The decision was unjust 😡` | 10 | Verify emoji stripped/ignored cleanly |
| Heavy punctuation | `(a) first; (b) second — and (c) third.` | 15 | Verify parenthetical/semicolon handling |
| Legal enumerations | `Section 101(a)(2)(B) of Title 8` | 10 | Nested parenthetical references |
| Hyphenated compounds | `well-established`, `commander-in-chief`, `6-methylaminopurine` | 15 | Verify compound handling |
| Mixed scripts | `The Медведев doctrine`, `The 日本語 policy` | 10 | Non-Latin in otherwise English text |
| PDF-scraped text | Orphaned line breaks, column artifacts, header fragments | 15 | Common in government documents |
| Quoted speech | `He said, "The policy is clear."` | 10 | Verify quote boundaries |
| All-caps input | `CBP IS A COMPONENT OF DHS` | 10 | Feature template handles non-title case |

Total: ~130 adversarial sentences.

These are NOT used for accuracy scoring — they are used to verify that the system
produces *some* output without crashing, that Unicode normalization works, and that
error cases produce structured uncertainty rather than garbage.

### Security sanitization test matrix (NEW in v2.2)

JSON-LD labels derive from source text. The existing security hardening modules handle
input validation and output sanitization. This matrix verifies coverage:

| Attack Vector | Input | Expected Behavior | Test |
|--------------|-------|-------------------|------|
| XSS via entity label | `<script>alert(1)</script> is an agency` | Entity label HTML-escaped in JSON-LD | Unit test |
| XSS via `rdfs:label` | `<img onerror=alert(1)> is a person` | Label escaped | Unit test |
| JSON injection | `"key": "value"} is a concept` | Quotes escaped in JSON-LD serialization | Unit test |
| Unicode control chars | `CBP\u0000 is an agency` | Null bytes stripped | Unit test |
| Oversized input | 100,000-word paragraph | Graceful rejection or truncation | Unit test |
| Deeply nested entity | 50-level deep dependency chain | Stack overflow protection | Unit test |

These tests verify that `JSONLDSerializer.js` escapes all string values and that the
existing `InputValidator.js` catches adversarial input.

### Performance metrics (NEW in v2.2)

Phase 4 validation MUST produce the following metrics:

**Accuracy metrics:**
- Confusion matrix by UD label (nsubj vs obj vs obl) — identifies systematic errors
- PP-attachment error rate: % of `obl`/`nmod` arcs incorrectly assigned
- Margin distribution histogram on dev set — verifies calibration
- Calibration curve: predicted probability vs actual accuracy per bin

**Performance metrics (measured on representative devices):**

| Device Class | Target | Metric |
|-------------|--------|--------|
| Desktop Chrome (M1 Mac) | p50 <5ms, p95 <20ms per sentence | `buildGraph()` latency |
| Desktop Chrome (M1 Mac) | <50 MB peak heap | Model loading + 100 sentences |
| iPhone 12 Safari | p50 <15ms, p95 <50ms per sentence | `buildGraph()` latency |
| iPhone 12 Safari | <80 MB peak heap | Model loading + 100 sentences |
| Pixel 4a Chrome | p50 <25ms, p95 <80ms per sentence | `buildGraph()` latency |
| Pixel 4a Chrome | <100 MB peak heap | Model loading + 100 sentences |

If any mobile target exceeds its heap budget, the progressive loading strategy (§16.1)
becomes REQUIRED (not just RECOMMENDED) for that device class.

### Regression tracking

1. Run golden tests before refactor → save baseline
2. Run golden tests after each layer → compare
3. Flag any regression (metric that was correct before but wrong after)
4. Regressions must be fixed before proceeding to next layer
5. Per-golden-test delta table: pre-refactor vs post-refactor (NEW in v2.2)

---

## 18. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| **UD-EWT CC-BY-SA 4.0 redistribution obligation** | **Critical** | **NEW in v2.2.** BLOCKING. Legal review required before shipping models. Attribution required regardless. See §15.1 for full procedure. |
| **Tokenization mismatch between Tokenizer.js and UD-EWT** | **Critical** | Phase 0 MUST produce Tokenizer Alignment Report (§5.5). Mismatch rate must be <0.5%. Unicode normalization (§5.5.1) runs before tokenizer. |
| Model size exceeds 10 MB budget | High | Weight pruning is REQUIRED, not optional. `prune_weights.py` enforces `--max-size-mb`. Binary format is REQUIRED (v2.1). |
| POS tagger accuracy lower than expected | Low | Averaged perceptron is thoroughly benchmarked at 96%+. Fallback: wink-nlp's tagger (~94.7%) as interim. |
| Dependency parser accuracy lower than expected | Medium | Try: (a) beam search width 4 (deferred), (b) richer features, (c) additional training data from UD-PUD. |
| **PP-attachment errors** | **Medium** | Tighter confidence thresholds for `obl`/`nmod` arcs with `case` children (§13). Alternative attachment points with calibrated probabilities feed into AmbiguityDetector. |
| UD label convention mismatch in code | High | §5 is the normative contract. All training scripts and JS code reference §5.2 label table. CI test validates output labels against canonical set. |
| Phase 5 module conflict with dep tree | Medium | Precedence rules in §12 are normative. `buildGraph()` path uses dep tree only. `parse()` path uses Phase 5 only. |
| Training pipeline complexity | Low | numpy + scikit-learn (calibration only). Training scripts are ~200–300 lines each. No GPU needed. |
| Integration breaks existing tests | Medium | Layer-by-layer integration with regression tests after each layer. Old code behind feature flag during transition. |
| Browser performance regression | Low | Both perceptron and arc-eager are O(n). JS implementation processes >1k sentences/sec. Feature strings pre-computed once per token (§6 advisory). |
| **Mobile OOM on model loading** | **Medium** | **NEW in v2.2.** Progressive/async model loading (§16.1). POS model first, dep model on demand. Memory profiling on mobile targets in Phase 4 (§17). |
| UD-EWT domain mismatch | Medium | UD-EWT covers web text (blogs, emails, reviews). Domain fine-tuning (§15) addresses gaps. UD-EWT version pinned to ≥2.14 (v2.1). |
| Non-projective input produces incorrect tree | Low | English is predominantly projective. Concrete measurement and decision point added in Phase 2 (§5.4). |
| Gazetteer drift over time | Low | Gazetteers are versioned (§10.4). Provenance output includes version. Updates are independent of code releases. |
| **Gazetteer abbreviation miss** | **Low** | Surface variations ("Dept." vs "Department") addressed by abbreviation normalization (§10.2). |
| Bundle size exceeds gzip target | Medium | Weight pruning + binary format (both REQUIRED). Hard ceiling: 10 MB uncompressed, 4 MB gzipped. |
| **Coordination blob** | **Low** | Conservative gazetteer-aware split heuristic added (§8.1.2). Full coordination analysis deferred (§21.7). |
| **Unicode input corruption** | **Medium** | **NEW in v2.2.** Smart quotes, non-breaking spaces, zero-width chars silently break tokenization. NFKC + explicit normalization map (§5.5.1). |
| **XSS via entity labels** | **Low** | **NEW in v2.2.** Security sanitization test matrix added (§17). JSONLDSerializer escapes all string values. |

---

## 19. Implementation Phases & Dependencies

### Dependency graph

```
Phase 0 (Label Convention + Tokenizer Alignment + Legal Review)    ← BLOCKING
    |
    v
Layer 1 (POS Tagger) ──────────────────┐
    uses §5.1 XPOS convention          ├──> Layer 3 (Tree Extraction)
    requires aligned tokenizer (§5.5)  │    uses §5.3 role mapping
Layer 2 (Dep Parser) ──────────────────┘    includes coord split (§8.1.2)
    uses §5.2 UD v2 convention              │
    depends on Layer 1                      ├──> Layer 4 (Copular + Negation)
    + calibration step (§13)                │
                                            │
Layer 5 (NER Gazetteers) ─────────────────┘
    independent, can start in parallel      │
                                            v
                                  Confidence Propagation (§13)
                                      incl. PP-attachment tuning
                                      incl. calibrated probabilities
                                  Debug Output (§14)
                                  Async Model API (§16.1)
                                            │
                                            v
                                  Legal sign-off (§15.1) ← BLOCKING for release
```

### Phase 0: Label Convention Contract + Tokenizer Standardization + Legal Review

| Task | Output | Priority |
|------|--------|----------|
| Finalize §5 of this spec as a standalone document | `training/LABEL_CONVENTION.md` | P0 |
| Create UD v2 label validation script | `training/validate_labels.py` | P0 |
| Create CI test that validates JS output labels against canonical set | `tests/unit/label-convention.test.js` | P0 |
| **Tokenizer Alignment Audit (v2.1)**: Run UD-EWT raw text through `Tokenizer.js`, compare token boundaries against CoNLL-U gold tokenization, include Unicode variant tests (§5.5.1) | `training/TOKENIZER_ALIGNMENT_REPORT.md` | **P0 — BLOCKING** |
| **Tokenizer Alignment Fix**: Implement chosen alignment strategy from §5.5 (Option A recommended), including `normalizeUnicode()` (§5.5.1) | Modified `src/core/Tokenizer.js` or new `src/core/UDTokenizer.js` | **P0 — BLOCKING** |
| **Tokenizer Alignment Validation**: Verify mismatch rate <0.5% on 100 representative sentences including Unicode adversarial cases | Test report in alignment doc | **P0 — BLOCKING** |
| **Legal Review — UD-EWT License (v2.2)**: Initiate legal review of CC-BY-SA 4.0 obligations for trained model weights; determine derivative-work status | Written legal opinion | **P0 — BLOCKING (for release, not training)** |
| **THIRD_PARTY_LICENSES.md (v2.2)**: Draft attribution and license file for all data sources | `training/THIRD_PARTY_LICENSES.md` | **P0** |

**Sequencing note:** The Tokenizer Alignment tasks are **blocking** — Layer 1 (POS Tagger)
training MUST NOT begin until the Tokenizer Alignment Report confirms <0.5% mismatch rate.
Training on UD-EWT data with a misaligned runtime tokenizer will produce a tagger that
fails on every contracted or specially-punctuated sentence.

### Phase 1: Foundation (Layers 1 + 5 in parallel)

**Layer 1**: Train and integrate the perceptron POS tagger.

| Task | Output |
|------|--------|
| Write Python training script (XPOS column extraction) | `training/train_pos_tagger.py` |
| Download UD English-EWT treebank | `training/data/UD_English-EWT/` |
| Train model, evaluate on test set (target: >96% XPOS accuracy) | `training/models/pos-weights.json` |
| Prune weights to ≤5 MB | `training/models/pos-weights-pruned.json` |
| Implement JS inference (`PerceptronTagger.js`) | `src/core/PerceptronTagger.js` |
| Write unit tests (accuracy benchmark + label validation) | `tests/unit/perceptron-tagger.test.js` |
| Integrate into build system | Updated `scripts/build.js` |
| Run existing golden tests — verify no regression | Test report |

**Layer 5** (parallel): Build versioned gazetteer data files.

| Task | Output |
|------|--------|
| Compile organization gazetteers with `_meta` headers | `src/data/gazetteers/organizations.json` |
| Compile person name gazetteers with `_meta` headers | `src/data/gazetteers/names.json` |
| Compile place name gazetteers with `_meta` headers | `src/data/gazetteers/places.json` |
| Implement GazetteerNER.js (lookup + alias matching + version tracking) | `src/graph/GazetteerNER.js` |
| Write unit tests | `tests/unit/gazetteer-ner.test.js` |

### Phase 2: Parser (Layer 2)

| Task | Output |
|------|--------|
| Write Python training script (UD v2 DEPREL, XPOS for features) with dynamic oracle (link to reference impl in README) | `training/train_dep_parser.py` |
| Implement arc-eager transition system with score margin tracking | `src/core/DependencyParser.js` |
| Implement DepTree utility (subtree extraction per §8.1 rules, recursive per §8.1.1) | `src/core/DepTree.js` |
| Train model on UD-EWT ≥2.14, evaluate UAS/LAS | `training/models/dep-weights.json` |
| Prune weights to ≤5 MB | `training/models/dep-weights-pruned.json` |
| **Run confidence calibration (v2.2)**: isotonic regression on dev set margins | `training/models/dep-calibration.json` |
| **Measure non-projective error rate (v2.2)**: report per §5.4 decision point | Section in evaluation report |
| Write unit tests (parse accuracy + label validation + specific sentences) | `tests/unit/dep-parser.test.js` |
| Integrate into build system | Updated `scripts/build.js` |

### Phase 3: Extraction Rewrite (Layers 3 + 4 + Confidence + Debug)

| Task | Output |
|------|--------|
| Implement `TreeEntityExtractor.js` with §8.1 traversal rules + coord split heuristic (§8.1.2) | `src/graph/TreeEntityExtractor.js` |
| Implement `TreeActExtractor.js` (includes copular + negated copular) | `src/graph/TreeActExtractor.js` |
| Implement `TreeRoleMapper.js` using §5.3 normative mapping | `src/graph/TreeRoleMapper.js` |
| Implement `ConfidenceAnnotator.js` (§13) with calibrated probabilities and PP-attachment tuning | `src/graph/ConfidenceAnnotator.js` |
| Implement `normalizeUnicode()` preprocessing step (§5.5.1) | `src/core/UnicodeNormalizer.js` |
| Implement async model loading API (§16.1) | Updated `src/TagTeam.js` |
| Update `SemanticGraphBuilder.js` to use new pipeline + debug output + mention IDs (§21.1) | Modified `src/graph/SemanticGraphBuilder.js` |
| Write integration tests (entity boundaries, role assignment, negation, coord split) | `tests/integration/tree-extraction.test.js` |
| Write confidence propagation tests (including calibration curve verification) | `tests/unit/confidence-annotator.test.js` |
| Write debug output tests | `tests/unit/debug-output.test.js` |
| Write async model loading tests (§16.1) | `tests/unit/model-loading.test.js` |
| Run golden tests — compare to Phase 1 baseline | Regression report |
| Run CBP-class sentences — verify correct handling | New test suite |

### Phase 4: Validation & Polish

| Task | Output |
|------|--------|
| Create 200-sentence evaluation set with gold-standard graphs | `tests/golden/evaluation-200.json` |
| **Create 130-sentence adversarial test set (v2.2)**: Unicode, URLs, emoji, legal, PDF text | `tests/adversarial/edge-cases.json` |
| **Run security sanitization test matrix (v2.2)**: XSS, injection, overflow | `tests/security/sanitization.test.js` |
| Run full evaluation, measure end-to-end accuracy + confusion matrix by UD label | Evaluation report |
| **Mobile memory profiling (v2.2)**: iPhone 12, Pixel 4a, desktop Chrome | Performance report with heap measurements |
| Verify bundle size ≤ 10 MB uncompressed, ≤ 4 MB gzipped | Size report |
| **Verify binary model checksums load correctly (v2.2)** | CI test |
| **Obtain legal sign-off on UD-EWT licensing (v2.2)**: BLOCKING for release | Legal opinion document |
| **Ship THIRD_PARTY_LICENSES.md (v2.2)** | Included in distribution |
| Domain fine-tuning if accuracy < 92% (separate work package) | Updated model weights |
| Update all demo pages to use new pipeline | Updated `demos/` |
| Performance benchmarking (bundle size, parse speed, p50/p95 latency) | Performance report |
| Update documentation including ROADMAP.md | Updated `docs/` |

---

## 20. Bundle Size Budget (Normative)

### Hard ceiling

| Metric | MUST NOT EXCEED |
|--------|-----------------|
| Total bundle uncompressed | **10 MB** |
| Total bundle gzipped | **4 MB** |

Failure to meet this budget blocks release. Weight pruning is a REQUIRED optimization,
not optional.

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
| `pos-weights-pruned.bin` | ~1.5–2.5 MB | Binary Float32Array. Replaces `lexicon.js` (4.11 MB). |
| `dep-weights-pruned.bin` | ~2.5–3.5 MB | Binary Float32Array. Largest addition. |
| `PerceptronTagger.js` | ~5 KB | Replaces `POSTagger.js` |
| `DependencyParser.js` | ~10 KB | New |
| `DepTree.js` | ~5 KB | New utility (includes §8.1.1 recursive traversal) |
| `TreeEntityExtractor.js` | ~20 KB | Replaces `EntityExtractor.js` (132 KB) |
| `TreeActExtractor.js` | ~20 KB | Replaces `ActExtractor.js` (102 KB) |
| `TreeRoleMapper.js` | ~8 KB | Replaces `RoleDetector.js` (14 KB) |
| `ConfidenceAnnotator.js` | ~5 KB | New (includes PP-attachment tuning, §13) |
| `GazetteerNER.js` | ~7 KB | New (includes abbreviation normalization, §10.2) |
| Gazetteer data | ~200–500 KB | New (versioned, §10.4) |
| Remaining graph modules | ~400 KB | Preserved (some shrink) |
| Data files | ~75 KB | Preserved |

### Required optimizations to meet budget

| Optimization | Status | Expected Savings |
|--------------|--------|-----------------|
| **Weight pruning** (threshold 0.01) | REQUIRED | 30–50% per model file |
| **Remove lexicon.js** | REQUIRED after tagger validated | −4.11 MB |
| **Binary model format (Float32Array)** | **REQUIRED** (elevated from OPTIONAL in v2.1) | ~50% size reduction vs JSON; eliminates JSON parse blocking on main thread |
| **Evaluate Compromise.js removal** | RECOMMENDED | −343 KB if dep parser handles all extraction |
| Lazy loading (dep model only on buildGraph) | OPTIONAL | Reduces initial load for parse()-only users |
| gzip compression | ASSUMED (standard for web servers) | 60–70% reduction over wire |

**Why binary format is now REQUIRED (v2.1):** Expert review identified that JSON parsing
of 5 MB model files blocks the browser main thread during initialization. `Float32Array`
from an `ArrayBuffer` is instantaneous (memory-mapped) and eliminates both the parse
overhead and the intermediate string allocation. Additionally, the weight lookup becomes
a direct array index operation instead of a hash-map lookup, improving inference speed.

**Binary format specification (hardened in v2.2):**

```
File layout:
  [Fixed Header: 64 bytes]
  [Metadata JSON block: variable length, UTF-8]
  [Feature Index: variable length]
  [Weight Matrix: Float32Array]
  [Calibration Table: variable length, dep model only]

Fixed Header (64 bytes):
  bytes 0–3:    magic number "TT01" (0x54 0x54 0x30 0x31)
  byte  4:      header version major (uint8) — currently 1
  byte  5:      header version minor (uint8) — currently 0
  byte  6:      endianness flag: 0x00 = little-endian (REQUIRED), 0x01 = big-endian
  byte  7:      model type: 0x01 = POS tagger, 0x02 = dependency parser
  bytes 8–11:   feature count (uint32 LE)
  bytes 12–15:  class/transition count (uint32 LE)
  bytes 16–19:  tagdict entry count (uint32 LE, POS model only; 0 for dep model)
  bytes 20–23:  metadata JSON block length in bytes (uint32 LE)
  bytes 24–27:  feature index length in bytes (uint32 LE)
  bytes 28–31:  weight matrix length in bytes (uint32 LE)
  bytes 32–63:  SHA-256 checksum of bytes after header (metadata + index + weights + calibration)

Endianness: LITTLE-ENDIAN is REQUIRED for all multi-byte values. This matches the native
byte order of x86, ARM (default), and WASM, avoiding byte-swap overhead. The endianness
flag is a safety check — the loader MUST verify it and reject big-endian files.

Metadata JSON block (UTF-8, NOT null-terminated):
  Contains the provenance object from §6/§7 model format, plus:
  {
    "formatVersion": "1.0",
    "trainingDataLicense": "CC-BY-SA 4.0",
    "attribution": "Universal Dependencies English-EWT ...",
    "calibration": { ... }   // dep model only, from §13
  }
  Length is specified in header bytes 20–23.

Feature index:
  Sorted list of feature strings, each terminated by 0x00 (null byte).
  Each feature's position in this list is its row index in the weight matrix.
  Length is specified in header bytes 24–27.

Weight matrix:
  Float32Array of size (feature_count × class_count), row-major, little-endian.
  Row i corresponds to feature i in the feature index.
  Column j corresponds to class j (tag or transition) in sorted order.
  Length is specified in header bytes 28–31.

Checksum:
  SHA-256 of all bytes after the 64-byte header (metadata + index + weights + calibration).
  The loader MUST compute the checksum and compare against bytes 32–63.
  Mismatch throws ModelLoadError with reason 'checksum_mismatch'.
```

**Versioning strategy:** The header version (major.minor) enables future format changes.
- Minor version increment: backward-compatible additions (new metadata fields, new sections
  after the weight matrix). Old loaders ignore unknown trailing data.
- Major version increment: breaking changes (different matrix layout, different header
  structure). Old loaders reject with `reason: 'version_incompatible'`.

**Quantization (ADVISORY, not required):** If further size reduction is needed beyond
pruning + Float32, 16-bit quantization (Float16 or fixed-point Int16) can halve the
weight matrix size. This requires storing quantization parameters (scale, zero_point)
in the metadata block and dequantizing at load time. Measured accuracy impact must be
<0.2% on dev set. This is deferred unless the 10 MB ceiling cannot be met with Float32.

### Budget math (worst case after required optimizations)

```
pos-weights-pruned.bin:  2.0–2.5 MB (Float32Array, pruned)
dep-weights-pruned.bin:  2.5–3.5 MB (Float32Array, pruned)
JS code:                 0.5 MB
Gazetteers:              0.5 MB
                         ─────
Total:                   5.5–7.0 MB  ← well within 10 MB ceiling ✓
```

**Realistic estimate:** 5.5–7.0 MB uncompressed, 2.0–3.0 MB gzipped.

This is a significant improvement over the v2.0 estimate (7–9 MB uncompressed) and
removes the worst-case scenario where both models hit their 5 MB JSON ceiling.

---

## 21. Known Horizons & Deferred Work

The following capabilities are explicitly out of scope for this refactor. They are
documented here to prevent scope creep and to acknowledge known limitations.

### 21.1 Cross-sentence reasoning (v2)

The parser operates on single sentences. The synthetic person will need discourse-level
understanding (coreference resolution, temporal ordering across sentences, causal chains).
This requires architectural changes beyond the NLP foundation and is correctly deferred
to v2.

**Cross-sentence mention ID interface (NEW in v2.2):** To enable future coreference
resolution without re-parsing, each entity node in the JSON-LD graph receives a stable
`tagteam:mentionId` that encodes its sentence index, head position, and entity span:

```json
{
  "@id": "inst:CBP_Organization",
  "@type": ["cco:Organization"],
  "rdfs:label": "CBP",
  "tagteam:mentionId": "s0:h1:0-1"
}
```

Format: `s{sentenceIndex}:h{headTokenId}:{startOffset}-{endOffset}`

When a future v2 coreference module processes multiple sentences, it can link mentions
across sentences by matching `tagteam:mentionId` values — e.g., "CBP" in sentence 1 and
"it" in sentence 2 share the same referent. The mention IDs are emitted now (zero runtime
cost) so that v2 does not need to re-parse or re-identify entities.

This interface is **forward-compatible only** — no consumer currently reads `mentionId`.
If the ID format changes in v2, no backward compatibility obligation exists.

### 21.2 Metaphor and figurative language (post-v2)

"The weight of the decision crushed him." The parser will correctly identify syntactic
structure but cannot detect the metaphorical reading. Figurative language detection is
an open research problem and is outside the scope of deterministic parsing.

### 21.3 Beam search parser (deferred unless needed)

If greedy arc-eager UAS < 88% on UD-EWT test set, implement beam search with width 4.
This increases complexity and slightly reduces determinism (tie-breaking). Defer unless
empirically needed.

### 21.4 Domain-specific treebank annotation (separate work package)

100–200 manually annotated sentences for domain fine-tuning. Requires:
- Annotation guidelines document
- Trained annotator (or self-annotation with inter-annotator agreement check)
- CoNLL-U format with XPOS and UD v2 DEPREL
- Quality criteria: >95% inter-annotator agreement on label assignment

This is NOT required for the base refactor to succeed.

### 21.5 Dependency tree → JSON-LD vocabulary (FNSR future)

If the dependency tree proves valuable as an audit/debug artifact (beyond `_debug` mode),
consider defining a formal JSON-LD vocabulary for dependency trees. This could enable
dependency trees as first-class citizens in the FNSR knowledge graph. Deferred to post-refactor.

### 21.6 The gap between 92% and 100%

The remaining 5–8% error rate will come from structurally difficult cases: garden-path
sentences, long-distance dependencies, rare constructions, genuinely ambiguous syntax.

The architecture supports graceful degradation via the confidence propagation mechanism
(§13): when the parser is uncertain, it says so. The interpretation lattice (Phase 6)
then preserves multiple readings rather than committing to one.

This is by design: *Better to output structured uncertainty than false precision.*

### 21.7 Coordination splitting (v2) — NEW in v2.1

When coordinated noun phrases serve as a shared argument — "CBP and ICE are agencies" —
the current traversal rules (§8.1) extract a single entity "CBP and ICE" because the
`conj` edge is traversed. This is correct for named entities whose conjuncts form a
single designator ("Customs and Border Protection") but incorrect for enumerations of
distinct entities.

Splitting coordination structures into separate entity nodes requires:

1. **Designator-vs-enumeration classification**: Is "X and Y" one entity or two?
   Heuristics: if both conjuncts are NNP (proper nouns) and neither shares a compound
   with the coordinator, treat as enumeration. If one conjunct has `compound` or `flat`
   children that span across the coordinator, treat as single designator.

2. **Shared-role duplication**: When coordination is split, each resulting entity inherits
   the parent's dependency role. "CBP and ICE are agencies" becomes two `nsubj` relations
   to the same predicate.

3. **Quantifier scoping**: "Every doctor and nurse" — does "every" distribute over both
   conjuncts? This is a genuine semantic ambiguity that may require interpretation lattice
   alternatives.

This is deferred to v2 as it requires scope-aware analysis beyond syntactic structure.

---

## 22. References & Resources

### Training Data

- [Universal Dependencies English-EWT](https://github.com/UniversalDependencies/UD_English-EWT)
  — 254,820 words, 16,622 sentences, CC-BY-SA 4.0
  - **XPOS column**: PTB-compatible tags (used for POS training)
  - **DEPREL column**: UD v2 labels (used for parser training)
- [UD English-EWT documentation](https://universaldependencies.org/treebanks/en_ewt/index.html)
- [UD v2 guidelines](https://universaldependencies.org/guidelines.html)
  — Normative reference for label definitions
- [UD English-PUD](https://universaldependencies.org/treebanks/en_pud/index.html)
  — Additional 1,000 parallel sentences for evaluation

### Algorithms & Papers

- Nivre, J. (2003). "An efficient algorithm for projective dependency parsing."
  IWPT 2003. — Original arc-eager algorithm
- Nivre, J. (2008). "Algorithms for deterministic incremental dependency parsing."
  Computational Linguistics 34:513–553.
- Goldberg, Y. and Nivre, J. (2012). "A Dynamic Oracle for Arc-Eager Dependency Parsing."
  COLING 2012. — Training improvement for arc-eager
- Honnibal, M. (2013). "A Good Part-of-Speech Tagger in about 200 Lines of Python."
  Explosion.ai blog. — Averaged perceptron POS tagger reference implementation
- Collins, M. (2002). "Discriminative Training Methods for Hidden Markov Models."
  EMNLP 2002. — Averaged perceptron theory

### BFO/CCO Ontology

- The UD v2 → BFO/CCO role mapping (§5.3) is a novel contribution of this refactor
- Validated against BFO 2020 (ISO/IEC 21838-2) and CCO 2.0 specifications
- The `CASE_TO_OBLIQUE_ROLE` table (§5.3) extends CCO's role taxonomy with
  preposition-based subtyping

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
      "tagteam:negated": false,
      "tagteam:copula": "is",
      "tagteam:predicateNominal": "component",
      "tagteam:assertionType": "structural_composition"
    }
  ]
}
```

Three nodes. Clean. Correct. Derived from UD v2 dependency structure, not heuristics.

---

## Appendix B: Negated Copular Sentence — NEW in v2.0

### Input

```
CBP is not a law enforcement training academy.
```

### Expected UD v2 dependency tree

```
  "academy" ← root
    ├── "CBP" ← nsubj
    ├── "is" ← cop
    ├── "not" ← advmod
    ├── "a" ← det
    ├── "law" ← compound
    ├── "enforcement" ← compound
    └── "training" ← compound
```

### Expected output

```json
{
  "@id": "inst:NegType_CBP_Academy",
  "@type": ["tagteam:NegatedStructuralAssertion"],
  "rdfs:label": "CBP is not a law enforcement training academy",
  "tagteam:subject": { "@id": "inst:CBP_Organization" },
  "tagteam:relation": "rdf:type",
  "tagteam:object": { "@id": "inst:LawEnforcementTrainingAcademy_Type" },
  "tagteam:negated": true,
  "tagteam:copula": "is",
  "tagteam:assertionType": "negated_type_predication"
}
```

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Averaged perceptron** | A linear classifier where weights are averaged over all training iterations, reducing overfitting. Not a neural network. |
| **Arc-eager** | A transition-based parsing strategy that creates dependency arcs as early as possible, resulting in linear-time parsing. |
| **UAS** | Unlabeled Attachment Score — % of tokens assigned the correct head (ignoring label). |
| **LAS** | Labeled Attachment Score — % of tokens assigned the correct head AND label. |
| **CoNLL-U** | Standard file format for annotated dependency treebanks (used by Universal Dependencies). |
| **XPOS** | Language-specific POS tags in UD treebanks. For English-EWT, these are PTB-compatible. |
| **UPOS** | Universal POS tags — a 17-tag set used across all UD treebanks. NOT used in this spec. |
| **UD v2** | Universal Dependencies version 2 — the label convention used for all dependency labels in this spec. |
| **Gazetteer** | A versioned lookup table of known entities with their types. Used for high-precision NER. |
| **Score margin** | Difference between the parser's top-scoring and second-scoring transition at a given step. Low margins indicate uncertainty. |
| **Transition system** | A formalism for incremental parsing where a sequence of actions (shift, reduce, arc) builds a parse tree left-to-right. |
| **Dynamic oracle** | A training strategy where the parser learns from the best action in any state, not just gold-standard states. Improves robustness. |
| **Projective tree** | A dependency tree where no arcs cross. Arc-eager produces only projective trees. |
| **tagdict** | Compile-time optimization: a lookup table of words that always receive the same POS tag in training data, enabling O(1) tagging for ~50% of tokens. |
| **Tokenizer alignment** | The requirement that the runtime tokenizer produce token boundaries compatible with the training data's tokenization standard. Misalignment causes feature extraction errors in the POS tagger and parser. |
| **PP-attachment** | Prepositional phrase attachment: the problem of determining whether a PP modifies a verb (`obl`) or a noun (`nmod`). The most common error class for transition-based parsers. |
| **Coordination blob** | When coordinated entities ("CBP and ICE") are extracted as a single span because the `conj` edge is traversed. A known limitation of v2.1 (see §21.7). |
| **Abbreviation normalization** | A pre-lookup step that expands common abbreviations ("Dept." → "Department") before gazetteer matching, preventing surface-variation misses. |
| **Confidence calibration** | A mapping from raw parser score margins to calibrated probabilities, computed via isotonic regression on the dev set. Enables quantitative downstream decisions. |
| **Mention ID** | A stable identifier assigned to each entity mention, encoding sentence index, head position, and span offsets. Enables future cross-sentence coreference without re-parsing. |
| **NFKC** | Unicode Normalization Form KC — canonical decomposition followed by compatibility composition. Normalizes equivalent Unicode sequences to a single representation. |
| **Progressive loading** | A model loading strategy where the POS model loads first (enabling `parse()`), and the dependency parser model loads on demand when `buildGraph()` is first called. Reduces initial memory pressure on mobile. |

---

## Appendix D: Review Traceability

### D.1 Architectural Review (2026-02-13) — all addressed in v2.0

Every finding from the Architectural Review (2026-02-13) is addressed below with
a reference to where in this spec the fix appears.

| Review Finding | Category | Resolution | Section |
|----------------|----------|------------|---------|
| Normalize dependency labels to UD v2 | Normative | All labels normalized; canonical table created | §5.2, §5.3 |
| Specify XPOS extraction for POS training | Normative | XPOS specified as training column | §5.1, §6, §15 |
| Set hard bundle size ceiling | Normative | 10 MB uncompressed / 4 MB gzipped | §2.1, §20 |
| Add subtree traversal rules for entity spans | Normative | 16-row traversal table with rationale | §8.1 |
| Address negated copular sentences | Normative | Pattern 2 + NegatedStructuralAssertion type | §9, Appendix B |
| Add `_debug.dependencyTree` output | Advisory | Full debug schema specified | §14 |
| Version gazetteers | Advisory | `_meta` header + provenance output | §10.4 |
| Specify non-projective handling | Advisory | Documented as expected behavior | §5.4 |
| Add confidence/uncertainty output | Advisory | Score margin → threshold → graph annotation | §13 |
| Plan Phase 5 module lifecycle | Advisory | Precedence rules + deprecation checklist | §12 |
| Phase 0: Label Convention Document | Advisory | §5 serves as standalone normative contract | §5, §19 |
| Phase 5 module conflict risk | Risk | Precedence rules prevent conflict | §12 |
| UD label convention mismatch risk | Risk | §5 is the single source of truth; CI validates | §5, §18 |
| Coordination handling in subtrees | Technical | `conj` + `cc` traversal rule specified | §8.1 |
| Relative clause boundary | Technical | `acl:relcl` excluded from entity spans | §8.1 |
| Apposition/alias extraction | Technical | `appos` → `tagteam:alias` rule specified | §8.1 |
| Beam search parser | Deferred | Deferred unless UAS < 88% | §21.3 |
| Domain-specific annotation | Deferred | Separate work package | §21.4 |
| Dep tree JSON-LD vocabulary | Deferred | FNSR future work | §21.5 |
| Graceful degradation / uncertainty | Architectural | Confidence propagation + lattice integration | §13 |
| tagdict is compile-time optimization | Clarification | Explicitly stated in §2.3 and §6 | §2.3, §6 |
| Cross-sentence reasoning horizon | Acknowledgment | Documented as known limitation | §21.1 |
| Metaphor/figurative language horizon | Acknowledgment | Documented as known limitation | §21.2 |
| 92%–100% accuracy gap | Acknowledgment | Graceful degradation by design | §21.6 |

All 25 architectural review findings addressed. Zero outstanding items.

### D.2 Expert Review #1 (2026-02-13) — all addressed in v2.1

| Review Finding | Severity | Resolution | Section |
|----------------|----------|------------|---------|
| Tokenization mismatch trap: Tokenizer.js may split differently than UD-EWT training data | **Critical** | Tokenizer Alignment Contract added as normative requirement; three resolution options specified; Phase 0 expanded to include alignment audit as blocking task | §5.5, §19 |
| Coordination blob: "CBP and ICE" extracted as single entity | Medium | Documented as known limitation; coordination splitting deferred to v2 with specification sketch | §8.1, §21.7 |
| Gazetteer abbreviation cliff effect: "Dept." misses "Department" | Medium | Abbreviation normalization step added before gazetteer lookup; common abbreviation map specified; alias best practices documented | §10.2 |
| PP-attachment errors: arc-eager parsers struggle with PP attachment | Medium | Tighter confidence thresholds for `obl`/`nmod` arcs with `case` children; alternative attachment point computed and passed to AmbiguityDetector | §13 |
| UD-EWT version consistency: older versions have label inconsistencies | Medium | UD-EWT version pinned to ≥2.14 in both Layer 1 and Layer 2 training specifications | §6, §7 |
| JS string performance: suffix/prefix features cause GC pressure in tight loops | Low | Feature string caching advisory added; pre-compute-once pattern specified with code example | §6 |
| Recursive subtree traversal: unclear if grandchildren are included | Low | Explicit recursive traversal specification added with exclusion-set algorithm and reference implementation | §8.1.1 |
| Binary model format: JSON parsing blocks main thread | Medium | Binary format (Float32Array) elevated from OPTIONAL to REQUIRED; binary layout specification added; budget math updated with improved estimates | §20 |

All 8 expert review #1 findings addressed. Zero outstanding items.

### D.3 Expert Review #2 (2026-02-13) — all addressed in v2.2

| Review Finding | Severity | Resolution | Section |
|----------------|----------|------------|---------|
| UD-EWT CC-BY-SA 4.0 licensing obligations for trained models | **Critical** | Full licensing section added with legal review procedure, attribution requirements, derivative-work analysis, and THIRD_PARTY_LICENSES.md deliverable. Legal sign-off is release blocker. | §15.1, §19 |
| Unicode apostrophe/quote variants break tokenization | **Critical** | NFKC + explicit normalization map added as mandatory preprocessing step before tokenizer. Smart quotes, non-breaking spaces, zero-width chars, em/en dashes all normalized. | §5.5.1 |
| Binary header underspecified (endianness, versioning, checksums) | **Critical** | Full binary header specification: little-endian REQUIRED, SHA-256 checksum of payload, major/minor header versioning with compatibility strategy, metadata JSON block with provenance | §20 |
| Mobile OOM risk on model loading | **High** | Async model loading API (`TagTeam.loadModels()`) with progressive loading strategy. POS-first, dep-on-demand. Error handling with typed errors. Mobile memory profiling required in Phase 4. | §16.1, §17 |
| Model provenance metadata missing | **High** | `provenance` block added to both POS and dep model formats: trainingSeed, gitCommit, trainingDate, trainingDataLicense, trainScriptVersion, dev/eval metrics, pruning metrics | §6, §7 |
| Confidence calibration: margins are heuristic, not probabilistic | **High** | Isotonic regression calibration step added to training pipeline. Calibrated probabilities stored on arcs and graph nodes alongside margin and bucket label. `calibrate_parser.py` added to training directory. scikit-learn added as training-only dependency. | §13, §15 |
| PP-attachment alternatives should include scores/probabilities | **Medium** | Alternative attachment arcs now include both `alternativeMargin` and `alternativeProbability` (calibrated). PP-specific ambiguity signal type carries full quantitative alternative. | §13 |
| Non-projective handling needs concrete decision point | **Medium** | Phase 2 evaluation MUST report: (1) % non-projective gold sentences, (2) LAS on non-projective arcs, (3) % domain sentences affected. Three explicit options (pseudo-projective, swap, accept) documented with decision recorded in Phase 2 completion report. | §5.4 |
| Dynamic oracle implementation is non-trivial — need reference | **Medium** | Reference implementations linked (MaltParser Java, spaCy v1 Python). `train_dep_parser.py` MUST include inline comments referencing Goldberg & Nivre 2012 §3. | §7 |
| Coordination blob: conservative split heuristic is feasible now | **Medium** | Gazetteer-aware coordination split heuristic added: splits when ALL conjuncts are NNP, ALL independently match gazetteer, and NO compound/flat edges cross the conjunction. Conservative — only splits when all three conditions met. | §8.1.2 |
| Apposition alias promotion: alias may be canonical in some cases | **Low** | Alias promotion rule added: when gazetteer matches alias but not label, entity uses alias as `rdfs:label` and original label as `tagteam:alias` (reversed). | §8.1.2 |
| Adversarial test cases needed: URLs, emoji, PDF text, legal enumerations | **Medium** | 130-sentence adversarial test set specified across 10 categories (Unicode, URLs, emoji, punctuation, legal, hyphenated, mixed scripts, PDF, quotes, all-caps). | §17 |
| Security sanitization test matrix for XSS/injection via entity labels | **Medium** | 6-vector security test matrix added: XSS via label, JSON injection, null bytes, oversized input, deep nesting. Verifies JSONLDSerializer escaping and InputValidator coverage. | §17 |
| Cross-sentence mention IDs for future coreference | **Low** | `tagteam:mentionId` format defined (`s{idx}:h{head}:{start}-{end}`). Assigned at zero runtime cost. Forward-compatible only — no backward compatibility obligation. | §21.1 |
| Binary feature index optimization (compact dictionary) | **Advisory** | Noted. Current UTF-8 null-terminated index is simple and correct. Compact uint32 mapping is a valid optimization if index size proves problematic. Deferred — not needed to meet 10 MB ceiling with Float32 + pruning. | §20 (no change) |
| Weight quantization (8-bit / 16-bit) | **Advisory** | Documented as deferred optimization in §20. Quantization parameters would be stored in metadata block. Required accuracy impact <0.2% on dev set. Not needed unless Float32 + pruning fails to meet ceiling. | §20 |
| Tokenizer alignment per-token error breakdown | **Low** | Added to TOKENIZER_ALIGNMENT_REPORT requirements: per-category breakdown (contractions, hyphenation, parentheses) in addition to aggregate mismatch rate. | §5.5 |
| Feature Map object reuse for GC pressure | **Low** | Covered by existing §6 feature caching advisory. Map reuse is an implementation detail within the pre-compute-once pattern. | §6 (no change) |
| Performance: p50/p95 latency, mobile heap, confusion matrix | **Medium** | Full performance metrics table added: desktop + iPhone 12 + Pixel 4a targets for latency and heap. Confusion matrix by UD label and PP-attachment error rate required. Calibration curve verification required. | §17 |
| ContractionExpander vs UD split: be explicit about strategy choice | **Low** | §5.5 already specifies this decision must be made in Phase 0 and documented in TOKENIZER_ALIGNMENT_REPORT. Option A (ContractionExpander before tokenizer) is RECOMMENDED. | §5.5 (no change) |

All 20 expert review #2 findings addressed. Zero outstanding items.

**Cumulative review status:** 25 (architectural) + 8 (expert #1) + 20 (expert #2) = **53 total findings addressed. Zero outstanding.**

---

*End of refactor plan v2.2 (Final Hardened).*

*"The dependency tree becomes the single source of truth for all downstream extraction."*