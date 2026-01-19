# TagTeam Consolidated Roadmap

**Version:** 5.1.0-vision
**Last Updated:** 2026-01-19
**Status:** Phase 4 Complete, Ideal NLP Roadmap Defined

---

## Vision Statement

> **TagTeam is a domain-neutral semantic interpretation engine that enables ethical dilemma analysis.**

TagTeam provides the foundational NLP infrastructure for extracting structured, ontologically-grounded representations from natural language. While domain-neutral by design, its primary use case is ethical dilemma analysis—a domain where ambiguity preservation is essential.

Natural language and ambiguity are inseparable. To properly analyze ethical dilemmas, we must preserve and surface ambiguity rather than force false precision. TagTeam aims to be a **semantic interpretation engine** that:

1. Makes explicit what the text commits to ontologically
2. Preserves what remains ambiguous or underspecified
3. Distinguishes the voice of the text from the voice of the interpreter
4. Knows the boundaries of its own competence
5. Produces structured representations that are auditable, contestable, and refinable

**Guiding Principle:** Better to output structured uncertainty than false precision.

### Architecture Philosophy

**Browser-First, Node.js Compatible**

TagTeam works like mermaid.js or d3.js - a self-contained JavaScript bundle that runs in browser or Node.js with no external dependencies.

```
┌─────────────────────────────────────────────────────────────────┐
│                    TagTeam Architecture                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              BROWSER BUNDLE (Primary)                    │   │
│  │              tagteam.js (~5-6 MB)                        │   │
│  │                                                          │   │
│  │  • Full semantic parsing                                 │   │
│  │  • Ambiguity preservation (interpretation lattice)       │   │
│  │  • BFO/CCO ontological mapping                          │   │
│  │  • Ethical value detection                              │   │
│  │  • SHACL validation                                     │   │
│  │  • JSON-LD output                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              │ Same API                          │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              NODE.JS (Server version)                    │   │
│  │              require('tagteam')                          │   │
│  │                                                          │   │
│  │  Same bundle + optional enhancements:                    │   │
│  │  • Batch processing                                     │   │
│  │  • Corpus analysis tools                                │   │
│  │  • Extended NLP integration (future)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Why Browser-First:**
- Self-contained = no server dependency
- Privacy for sensitive ethical content
- Instant feedback in educational/analysis tools
- Works offline
- Same codebase for browser and Node.js

---

## What's Complete

### Phase 4: JSON-LD Semantic Graphs (DONE)

**Certification:** 5.0/5.0 BFO/CCO Realist Compliance (2026-01-19)

| Week | Deliverables | Status |
|------|-------------|--------|
| **Week 1** | Two-tier architecture, Entity/Act extraction, Role detection | ✅ Complete |
| **Week 2** | Assertion events, GIT-Minimal provenance, Information Staircase | ✅ Complete |
| **Week 3** | SHACL validation, Complexity budget, Corpus testing, Documentation | ✅ Complete |

**Key Files Created:**
```
src/graph/
├── SemanticGraphBuilder.js    # Main orchestrator
├── EntityExtractor.js         # Tier 1/2 entity extraction
├── ActExtractor.js            # IntentionalAct nodes + selectional restrictions
├── RoleDetector.js            # BFO roles (Agent, Patient)
├── DomainConfigLoader.js      # Domain configuration system
├── AssertionEventBuilder.js   # Value/Context assertions
├── ContextManager.js          # Interpretation contexts
├── InformationStaircaseBuilder.js  # IBE/ICE linkage
├── JSONLDSerializer.js        # JSON-LD output
├── SHMLValidator.js           # SHACL pattern validation
├── ComplexityBudget.js        # Graph limits
└── [other factories...]

config/
└── medical.json               # Medical domain vocabulary
```

**Test Coverage:** 290+ tests passing

**Acronyms:**
- **IEE**: Institute for Ethical Engineering - collaboration partner for ethical value definitions
- **BFO**: Basic Formal Ontology - top-level ontology framework
- **CCO**: Common Core Ontologies - mid-level ontology extending BFO
- **GIT**: Grounded Information Transfer theory

### Domain-Neutral Parser Implementation (DONE)

**Certification:** 5.0/5.0 Expert Certified (2026-01-19)

| Phase | Deliverables | Status |
|-------|-------------|--------|
| **Phase 1** | Suffix-based process detection, result noun exceptions, ONTOLOGICAL_VOCABULARY | ✅ Complete |
| **Phase 2** | DomainConfigLoader, config/medical.json, type specialization | ✅ Complete |
| **Phase 3** | Selectional restrictions, verb sense disambiguation, config overrides | ✅ Complete |

**Key Achievements:**
- "Palliative care" → `cco:ActOfCare` (Occurrent)
- "Provide care" → `cco:ActOfService` via selectional restrictions
- "Provide medication" → `cco:ActOfTransferOfPossession` (different verb sense)
- Domain vocabulary in loadable config files
- BFO-only mode works without any config loaded

---

## Ideal NLP Roadmap

### The Core Problem

Current TagTeam forces resolution of ambiguity. For ethical dilemma analysis, this loses critical information:

```
Input: "The doctor should prioritize the younger patient"

Current Output (forced resolution):
{
  "denotesType": "cco:ActOfPrioritization",
  "actualityStatus": "tagteam:Prescribed"  // Picked one reading
}

Ideal Output (ambiguity preserved):
{
  "interpretationLattice": {
    "readings": [
      { "id": "deontic", "gloss": "obligation to prioritize", "plausibility": 0.7 },
      { "id": "epistemic", "gloss": "expectation of prioritizing", "plausibility": 0.3 }
    ]
  },
  "defaultReading": "deontic"
}
```

### API Design: Opt-In Lattice (Backwards Compatible)

```javascript
// Current API (unchanged) - returns single graph
const graph = builder.build(text);

// New API (opt-in) - returns lattice with multiple readings
const result = builder.build(text, { preserveAmbiguity: true });
// Returns: {
//   defaultReading: JSON-LD graph,
//   lattice: InterpretationLattice,
//   _epistemics: { sourceAttributions, certaintyMarkers },
//   _validation: { internal, external }
// }
```

---

## Phase 5: NLP Foundation Upgrade

**Goal:** Remove Compromise bottleneck, enable ambiguity detection

**Bundle Size Budget:** +200KB max (target: 5.0MB total)

**Why This First:** Compromise NLP limitations block all downstream improvements:
- Can't reliably identify Agent vs Patient (no dependency parsing)
- Verb/noun ambiguity causes incorrect extractions
- Can't detect PP attachment for complex ethical scenarios

### 5.0 Evaluate Alternative NLP Libraries (FIRST)

**Status:** Not started
**Priority:** Critical (do this before 5.1-5.3)
**Effort:** Low

Before building custom tokenizers, evaluate whether existing libraries solve our problems:

| Library | Bundle Size | Key Features | Verdict Criteria |
|---------|-------------|--------------|------------------|
| **Wink NLP** | +600KB | Better tokenization, NER, sentiment | Reduces Compromise dependency? |
| **Natural** | +400KB | Tokenizers, stemmers, classifiers | Lighter alternative? |
| **nlp.js** | +800KB | Multiple language support | Overkill for English-only? |

**Decision Criteria:**
- Does it provide dependency-like information?
- Does it run in browser without modification?
- Is bundle size acceptable for browser-first?

**Deliverable:** Decision document in `docs/research/nlp-library-evaluation.md`

### 5.1 Revive POSTaggerGraph.js

**Status:** Not started
**Priority:** High
**Effort:** Low (code exists in archive)

Integrate archived features into current pipeline:
- Lemmatizer for better verb normalization
- Contraction expansion ("don't" → "do not")
- Quote state tracking

**Files to modify:**
- `src/core/POSTagger.js` - integrate Lemmatizer
- `src/graph/ActExtractor.js` - use lemmatized verbs

### 5.2 Reduce Compromise Dependency

**Status:** Not started
**Priority:** High
**Effort:** Medium

Current Compromise usage:
- ActExtractor: verb phrase extraction
- EntityExtractor: noun phrase extraction

Target state:
- Compromise: sentence boundary detection only
- Custom tokenizer: everything else

**Deliverables:**
- `src/core/Tokenizer.js` - new tokenizer using lexicon
- `src/core/NounPhraseExtractor.js` - custom NP extraction
- `src/core/VerbPhraseExtractor.js` - custom VP extraction

### 5.3 Ambiguity Detection Layer

**Status:** Not started
**Priority:** High
**Effort:** Medium

Create infrastructure to detect (not yet preserve) ambiguous cases:

| Ambiguity Type | Detection Signal | Example |
|----------------|------------------|---------|
| Noun Process/Continuant | Suffix + context | "organization" |
| Verb Sense | Multiple selectional matches | "run" |
| Deontic/Epistemic | Modal + context | "should" |
| Scope | Quantifiers + negation | "not all" |

**Deliverables:**
- `src/graph/AmbiguityDetector.js` - identifies ambiguous spans
- `src/graph/AmbiguityReport.js` - structured ambiguity metadata

---

## Phase 6: Interpretation Lattice

**Goal:** Preserve significant ambiguities in structured output

**Bundle Size Budget:** +100KB max (target: 5.1MB total)

### 6.1 Lattice Data Structure

**Status:** Not started
**Priority:** High
**Effort:** Medium

Based on idealNLP_v1.1.md specification:

```javascript
class InterpretationLattice {
  constructor() {
    this.nodes = [];        // InterpretationNode[]
    this.relations = [];    // subsumes, mutually_exclusive
    this.rootNode = null;   // Minimal commitment reading
    this.defaultReading = null;  // Highest plausibility
  }

  // Operations
  getMinimalCommitment()      // Returns root node (risk-averse)
  getDefaultReading()         // Returns highest-plausibility leaf
  getReadingsAtLevel(n)       // Returns all nodes at depth n
  filterByPlausibility(threshold)  // Filter by confidence
  collapseToOntology()        // Only ontologically-distinct readings
}
```

**Deliverables:**
- `src/graph/InterpretationLattice.js`
- `src/graph/InterpretationNode.js`

### 6.2 Ambiguity Pruning Pipeline

**Status:** Not started
**Priority:** Medium
**Effort:** Medium

Four-stage pruning (from idealNLP v1.1):

```
All Possible Readings
        │
        ▼
┌─────────────────────────────────────┐
│ STAGE 1: Implausibility Filter      │
│ Remove selectional violations       │
│ Threshold: plausibility < 0.1       │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ STAGE 2: Ontological Equivalence    │
│ Merge identical BFO categorizations │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ STAGE 3: Significance Filter        │
│ Keep only readings that matter:     │
│ Different truth conditions          │
│ Different obligations               │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ STAGE 4: Cardinality Cap            │
│ Keep top N by plausibility          │
│ Flag if truncated                   │
└─────────────────────────────────────┘
        │
        ▼
Preserved Significant Readings (typically 1-3)
```

**Deliverables:**
- `src/graph/AmbiguityPruner.js`
- Configuration for pruning thresholds

### 6.3 SemanticGraphBuilder Integration

**Status:** Not started
**Priority:** High
**Effort:** Medium

Modify `build()` to support opt-in lattice:

```javascript
build(text, options = {}) {
  // ... existing pipeline ...

  if (options.preserveAmbiguity) {
    const ambiguities = this.ambiguityDetector.detect(text, entities, acts);
    const lattice = this.latticeBuilder.build(ambiguities);
    const prunedLattice = this.pruner.prune(lattice, options.pruningConfig);

    return {
      defaultReading: this._buildGraph(),  // Current behavior
      lattice: prunedLattice,
      _epistemics: this._buildEpistemics(),
      _validation: this._buildValidation()
    };
  }

  return this._buildGraph();  // Backwards compatible
}
```

---

## Phase 7: Epistemic Layer

**Goal:** Support epistemic status analysis for ethical reasoning

**Bundle Size Budget:** +50KB max (target: 5.15MB total)

**Scope Definition:** This phase focuses on *detecting* epistemic markers in text, NOT implementing a full epistemology framework. The goal is structured metadata that downstream consumers can use.

### 7.1 Source Attribution Detection

**Status:** Not started
**Priority:** High
**Effort:** Medium

Detect and structure attribution patterns in text:

**Detection Patterns:**
| Pattern | Example | Output |
|---------|---------|--------|
| Quote attribution | `"X," said Dr. Smith` | `{ source: "Dr. Smith", type: "direct_quote" }` |
| Reported speech | `The nurse reported that...` | `{ source: "nurse", type: "reported" }` |
| Institutional | `Hospital policy states...` | `{ source: "hospital", type: "institutional" }` |

**Output Structure:**
```json
{
  "claim": "The patient should receive treatment",
  "attribution": {
    "detectedSource": "physician",
    "sourceType": "cco:Physician",
    "attributionType": "direct_quote",
    "confidence": 0.85
  }
}
```

**Deliverables:**
- `src/graph/SourceAttributionDetector.js` - pattern-based detection
- Detection patterns for 5 common attribution types
- Extended @context vocabulary

**NOT in scope:** Full evidential reasoning chains, multi-hop attribution

### 7.2 Certainty Markers

**Status:** Not started
**Priority:** Medium
**Effort:** Low

Detect hedges and boosters via lexical patterns:

| Marker Type | Examples | Effect |
|-------------|----------|--------|
| Hedges | "might", "possibly", "seems" | Reduce certainty |
| Boosters | "definitely", "clearly", "must" | Increase certainty |
| Evidentials | "reportedly", "allegedly" | Mark as reported |

**Deliverables:**
- `src/analyzers/CertaintyAnalyzer.js` - lexicon-based detection
- Certainty vocabulary in @context
- ~50 marker terms in lexicon

### 7.3 Temporal Grounding

**Status:** Not started
**Priority:** Medium
**Effort:** Medium

Add explicit referenceTime support for relative temporal expressions:

```javascript
builder.build(text, {
  referenceTime: '2026-01-19T00:00:00Z',
  documentDate: '2026-01-15T00:00:00Z'
});

// Resolves: "last week" → 2026-01-12 to 2026-01-19
// Resolves: "yesterday" → 2026-01-18
```

**Deliverables:**
- `src/graph/TemporalGrounder.js` - relative time resolution
- Support for: yesterday/today/tomorrow, last/next week/month, N days ago
- Temporal resolution in entity extraction

**NOT in scope:** Complex temporal reasoning, event ordering

---

## Phase 8: Enhanced Disambiguation

**Goal:** Improve accuracy using context and iteration

### 8.1 Noun Ambiguity Resolution

**Status:** Not started
**Priority:** Medium
**Effort:** Medium

| Signal | Interpretation | Example |
|--------|---------------|---------|
| "the X" + verb phrase | Continuant | "The organization hired..." |
| "X of Y" | Process | "Organization of files..." |
| "during X" | Occurrent | "During treatment..." |

### 8.2 Iterative Verb Refinement

**Status:** Not started
**Priority:** Low
**Effort:** Medium

Multi-pass disambiguation:
```
Pass 1: Selectional restrictions (current)
Pass 2: ContextDimension scores
Pass 3: ActualityStatus consistency
```

### 8.3 Evaluate Wink NLP

**Status:** Not started
**Priority:** Low
**Effort:** Medium

If Phase 5 improvements insufficient, evaluate Wink NLP:
- +600KB bundle size
- Better tokenization
- Named entity recognition
- Sentiment (may help with ethical valence)

---

## Phase 9: Validation Layer

**Goal:** Robust internal and external validation

### 9.1 Internal Self-Assessment

**Status:** Partial (SHACL done)
**Priority:** Medium
**Effort:** Low

What TagTeam can reliably know about itself:
- Configuration state (ontologies loaded, domain configs active)
- Processing metrics (parse success/failure, unknown terms)
- Coverage (% of input that produced output)

### 9.2 External SHACL Validation

**Status:** ✅ Complete (SHMLValidator)
**Priority:** N/A

Already implemented:
- 8 expert-certified patterns
- Domain plausibility checks
- Role bearer constraints

### 9.3 Combined Validation Report

**Status:** Not started
**Priority:** Low
**Effort:** Low

Unified report format:
```json
{
  "validation": {
    "internal": { "selfAssessmentScore": 0.85 },
    "external": { "shaclValidationScore": 0.92 },
    "combined": { "overallScore": 0.88, "recommendation": "..." }
  }
}
```

---

## Phase 10: Human Validation Loop

**Goal:** Enable expert correction workflow

**Status:** Not Started - Requires IEE (Institute for Ethical Engineering) team input

**Scope:** Define data model for human corrections. TagTeam does NOT implement UI—consumers build their own validation interfaces using this data model.

### 10.1 Validation Data Model

**Assertion Types:**
```javascript
// Human validates machine assertion
{
  "@type": "tagteam:HumanValidationEvent",
  "tagteam:validates": "inst:Autonomy_ValueAssertion_abc123",
  "tagteam:validator": "inst:Expert_Jane_Doe",
  "tagteam:validationStatus": "tagteam:Confirmed",  // Confirmed | Rejected | Modified
  "tagteam:timestamp": "2026-01-19T..."
}

// Human rejects false positive
{
  "@type": "tagteam:HumanRejectionEvent",
  "tagteam:rejects": "inst:Justice_ValueAssertion_def456",
  "tagteam:rejectionReason": "Value not present in context",
  "tagteam:validator": "inst:Expert_Jane_Doe"
}

// Human provides correction
{
  "@type": "tagteam:HumanCorrectionEvent",
  "tagteam:corrects": "inst:Beneficence_ValueAssertion_ghi789",
  "tagteam:supersedes": "inst:Autonomy_ValueAssertion_abc123",
  "tagteam:correctionNote": "Should be classified as Beneficence, not Autonomy"
}
```

### 10.2 Supersession Chain

Track correction history:
```
Original → Correction1 → Correction2 (current)
           supersedes    supersedes
```

**Deliverables:**
- `src/graph/HumanValidationBuilder.js` - creates validation event nodes
- @context vocabulary for validation types
- `tagteam:supersedes` chain for tracking correction history
- API: `builder.recordValidation(assertionId, validatorId, status)`

---

## Phase 11: Extended Domain Support

**Goal:** Expand to additional domains

| Domain | Config File | Status |
|--------|-------------|--------|
| Medical | `config/medical.json` | ✅ Complete |
| Legal | `config/legal.json` | Not started |
| Business | `config/business.json` | Not started |
| Scientific | `config/scientific.json` | Not started |

---

## Test Strategy for Ambiguity Preservation

**Goal:** Ensure lattice correctness through golden test corpus

### Golden Corpus Requirements

Create `tests/golden/ambiguity-corpus.json` with:

```json
{
  "corpus": [
    {
      "id": "deontic-epistemic-001",
      "input": "The doctor should prioritize the younger patient",
      "expectedReadings": [
        { "type": "deontic", "gloss": "obligation to prioritize" },
        { "type": "epistemic", "gloss": "expectation of prioritizing" }
      ],
      "expectedDefault": "deontic",
      "minReadings": 2,
      "maxReadings": 3
    }
  ]
}
```

### Test Categories

| Category | Test Count | Example |
|----------|------------|---------|
| Deontic/Epistemic modals | 10 | "should", "must", "ought to" |
| Noun process/continuant | 10 | "organization", "treatment" |
| Verb sense ambiguity | 10 | "provide care" vs "provide equipment" |
| Scope ambiguity | 5 | "not all patients", "every doctor" |
| PP attachment | 5 | "treated the patient with care" |

### Validation Criteria

1. **Reading count:** `minReadings <= actual <= maxReadings`
2. **Reading types:** All `expectedReadings` types present
3. **Default selection:** `defaultReading` matches `expectedDefault`
4. **Plausibility ordering:** Higher-plausibility readings ranked first

### Test Commands

```bash
node tests/unit/test-lattice-golden.js      # Golden corpus validation
node tests/unit/test-lattice-properties.js  # Property-based tests
```

---

## Bundle Size Trajectory

| Phase | Component | Size Delta | Cumulative |
|-------|-----------|------------|------------|
| Phase 4 (current) | Core + Graph | - | 4.8 MB |
| Phase 5 | NLP upgrades | +200 KB | 5.0 MB |
| Phase 6 | Lattice | +100 KB | 5.1 MB |
| Phase 7 | Epistemic | +50 KB | 5.15 MB |
| Phase 8-9 | Disambiguation + Validation | +50 KB | 5.2 MB |
| **Target Max** | - | - | **6.0 MB** |

**Size Management Strategies:**
- Tree-shaking unused code paths
- Lazy loading of domain configs
- Optional Wink NLP as separate import

---

## Implementation Priority Matrix

| Phase | Priority | Effort | Dependencies | Enables |
|-------|----------|--------|--------------|---------|
| **5.0** NLP Library Eval | Critical | Low | None | 5.1, 5.2, 5.3 |
| **5.1** POSTaggerGraph | High | Low | 5.0 | 5.2, 5.3 |
| **5.2** Reduce Compromise | High | Medium | 5.0, 5.1 | 5.3, 6.x |
| **5.3** Ambiguity Detection | High | Medium | 5.2 | 6.x |
| **6.1** Lattice Data Structure | High | Medium | 5.3 | 6.2, 6.3 |
| **6.2** Pruning Pipeline | Medium | Medium | 6.1 | 6.3 |
| **6.3** Builder Integration | High | Medium | 6.1, 6.2 | 7.x |
| **7.1** Source Attribution | High | Medium | 6.3 | 7.2 |
| **7.2** Certainty Markers | Medium | Low | 7.1 | - |
| **7.3** Temporal Grounding | Medium | Medium | 6.3 | - |
| **8.x** Disambiguation | Low | Medium | 6.3 | - |
| **9.x** Validation | Low | Low | 6.3 | - |
| **10** Human Validation | Medium | Medium | 6.3 | - |
| **11** Domain Support | Low | Low | None | - |

---

## Recommended Implementation Sequence

### Near-Term (Next 2-4 weeks)

1. **Phase 5.0:** Evaluate NLP libraries (Wink, Natural) - FIRST
2. **Phase 5.1:** Revive POSTaggerGraph.js
3. **Phase 5.2:** Reduce Compromise dependency
4. **Phase 5.3:** Ambiguity detection infrastructure

### Medium-Term (1-2 months)

5. **Phase 6.1:** Interpretation lattice data structure
6. **Phase 6.2:** Ambiguity pruning pipeline
7. **Phase 6.3:** SemanticGraphBuilder integration (opt-in API)
8. Create golden test corpus for lattice validation

### Longer-Term (2-3 months)

9. **Phase 7.1:** Source attribution detection
10. **Phase 7.2-7.3:** Certainty markers, temporal grounding
11. **Phase 8.x:** Enhanced disambiguation

### As Needed

- **Phase 10:** Human validation (when IEE ready)
- **Phase 11:** Domain configs (as domains are needed)

---

## Ideal NLP Capability Mapping

| Ideal NLP Requirement | TagTeam Phase | Status |
|-----------------------|---------------|--------|
| BFO Category Assignment | Phase 4 | ✅ Complete |
| Semantic Role Detection | Phase 4 | ✅ Complete |
| Selectional Restrictions | Phase 4 | ✅ Complete |
| Domain Ontology Integration | Phase 4 | ✅ Complete |
| SHACL Validation | Phase 4 | ✅ Complete |
| GIT-Minimal Provenance | Phase 4 | ✅ Complete |
| Confidence Decomposition | Phase 4 | ✅ Complete |
| **Ambiguity Preservation** | Phase 6 | Planned |
| **Interpretation Lattice** | Phase 6 | Planned |
| **Source Attribution** | Phase 7 | Planned |
| **Epistemic Status** | Phase 7 | Planned |
| **Temporal Grounding** | Phase 7 | Planned |
| Human Validation Loop | Phase 10 | Planned |

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 5.1.0-vision | 2026-01-19 | Addressed critique: scope clarity, bundle budgets, test strategy, Phase 7/10 detail |
| 5.0.0-vision | 2026-01-19 | Ideal NLP roadmap, opt-in lattice API design |
| 4.0.0-phase4 | 2026-01-19 | Domain-Neutral Parser, Selectional Restrictions |
| 4.0.0 | 2026-01-19 | Phase 4 complete, JSON-LD, SHACL validation |
| 2.0.0 | 2026-01 | IEE integration, 50 values, ethical profiling |
| 1.0.0 | 2025 | Initial semantic parser |

---

## Current Bundle

```
dist/tagteam.js  (~4.8 MB single bundle)

┌─────────────────────────────────────────────────────────────┐
│                    tagteam.js (4.8 MB)                      │
├─────────────────────────────────────────────────────────────┤
│  Core                                                       │
│  ├── lexicon.js (4.1 MB POS lexicon)                       │
│  ├── POSTagger.js                                          │
│  ├── PatternMatcher.js                                     │
│  └── SemanticRoleExtractor.js                              │
├─────────────────────────────────────────────────────────────┤
│  Analyzers                                                  │
│  ├── ContextAnalyzer.js (12 dimensions)                    │
│  ├── ValueMatcher.js                                       │
│  ├── ValueScorer.js                                        │
│  └── EthicalProfiler.js                                    │
├─────────────────────────────────────────────────────────────┤
│  Graph (Phase 4)                                            │
│  ├── SemanticGraphBuilder.js                               │
│  ├── JSONLDSerializer.js                                   │
│  ├── SHMLValidator.js                                      │
│  └── [12 other modules]                                    │
├─────────────────────────────────────────────────────────────┤
│  Data                                                       │
│  ├── IEE 50 value definitions                              │
│  ├── Frame-value boosts                                    │
│  ├── Conflict pairs                                        │
│  └── Compound terms                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
TagTeam.js/
├── dist/
│   └── tagteam.js              # Production bundle (4.8 MB)
├── src/
│   ├── core/                   # Semantic parsing
│   ├── analyzers/              # Ethics analysis
│   ├── graph/                  # Phase 4 JSON-LD
│   └── types/                  # TypeScript definitions
├── tests/
│   ├── unit/                   # 290+ unit tests
│   └── integration/            # Corpus validation
├── docs/
│   ├── PHASE4_USER_GUIDE.md
│   ├── JSONLD_EXAMPLES.md
│   ├── SHACL_VALIDATION_GUIDE.md
│   └── research/
│       └── idealNLP_v1.1.md    # Vision document
├── config/
│   └── medical.json            # Medical domain config
├── planning/
│   └── week3/                  # Phase 4 planning docs
├── archive/
│   └── POS Graph POC/          # POSTaggerGraph.js (to revive)
├── iee-collaboration/          # IEE test corpus
├── ROADMAP.md                  # This file
└── README.md
```

---

## Quick Reference

### Build Commands

```bash
npm run build          # Build production bundle
npm test               # Run all tests
node tests/unit/test-shacl-validation.js    # SHACL tests
node tests/integration/test-phase4-corpus.js # Corpus validation
```

### Current API

```javascript
// Basic parsing (current)
const result = TagTeam.parse(text);

// With JSON-LD output (current)
const builder = new SemanticGraphBuilder();
const graph = builder.build(text, { context: 'MedicalEthics' });

// SHACL validation (current)
const validator = new SHMLValidator();
const report = validator.validate(graph);
```

### Future API (Phase 6+)

```javascript
// Opt-in ambiguity preservation
const result = builder.build(text, {
  preserveAmbiguity: true,
  pruningConfig: { maxReadings: 5, plausibilityThreshold: 0.1 }
});

// Access lattice
console.log(result.defaultReading);     // JSON-LD graph (most likely)
console.log(result.lattice.nodes);      // All significant readings
console.log(result._epistemics);        // Source attribution, certainty
```

---

## Contact & Support

- **Issues:** https://github.com/anthropics/claude-code/issues
- **IEE Collaboration:** See `iee-collaboration/` folder

---

**TagTeam** - A domain-neutral semantic interpretation engine for ethical dilemma analysis.

*"Better to output structured uncertainty than false precision."*
