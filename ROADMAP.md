# TagTeam Consolidated Roadmap

**Version:** 5.3.1-phase5
**Last Updated:** 2026-01-23
**Status:** Phase 5 Complete, Ambiguity Detection, 280+ Tests, Ready for Phase 6

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

### Phase 5: NLP Foundation Upgrade (DONE)

**Certification:** Complete (2026-01-23)

| Deliverable | Status |
|-------------|--------|
| **5.0** NLP Library Evaluation | ✅ Custom implementation chosen |
| **5.1** Core NLP (Lemmatizer, ContractionExpander) | ✅ 149 tests |
| **5.2** Phrase Extractors (VP, NP) | ✅ 59 tests |
| **5.3** Ambiguity Detection | ✅ 71 tests |
| **5.3.1** Stakeholder Improvements | ✅ selectionalMismatch, Organization typing |

**Key Files Created:**
```
src/core/
├── ContractionExpander.js     # "don't" → "do not"
├── Lemmatizer.js              # "walked" → "walk"
├── VerbPhraseExtractor.js     # Modal force, negation, tense
└── NounPhraseExtractor.js     # Determiners, compounds, quantifiers

src/graph/
├── AmbiguityDetector.js       # 5 ambiguity types
└── AmbiguityReport.js         # JSON-LD output
```

**Test Coverage:** 280+ tests passing (Phase 5 specific: 279 tests)

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

## Phase 5: NLP Foundation Upgrade ✅ COMPLETE

**Goal:** Remove Compromise bottleneck, enable ambiguity detection

**Status:** ✅ Complete (2026-01-23)
**Test Coverage:** 280+ tests passing (100% pass rate)
**Bundle Size:** +50KB (well under +200KB budget)

### Key Decision: Custom Implementation Over External Libraries

After evaluation, we chose **custom implementation** over external NLP libraries because:

1. **Zero new dependencies** - No supply chain risk
2. **Full control** - Tailored for ethical reasoning domain
3. **Archive code** - Robust implementations already existed
4. **Bundle size** - Custom code smaller than Wink NLP (+600KB) or nlp.js (+800KB)
5. **IEE corpus tested** - 100% accuracy on test scenarios

### 5.0 NLP Library Evaluation ✅ COMPLETE

**Decision:** Build custom modules using archived code rather than adding external dependencies.

**Rationale documented in:** Phase 5 Demo Presentation (`demos/Phase5_Demo_Presentation.md`)

### 5.1 Core NLP Modules ✅ COMPLETE

Created from archived POSTaggerGraph.js code:

| Module | Purpose | Test Count |
|--------|---------|------------|
| `src/core/ContractionExpander.js` | "don't" → "do not" with POS tags | 49 tests |
| `src/core/Lemmatizer.js` | "walked" → "walk", "children" → "child" | 100 tests |

### 5.2 Phrase Extractors ✅ COMPLETE

Custom extractors reduce Compromise dependency:

| Module | Purpose | Test Count |
|--------|---------|------------|
| `src/core/VerbPhraseExtractor.js` | Modals, negation, tense, voice | 27 tests |
| `src/core/NounPhraseExtractor.js` | Determiners, modifiers, compounds | 32 tests |

**Key Features:**
- Modal force classification (deontic vs epistemic signals)
- Negation detection including "never" look-back
- Quantifier detection (universal, existential, negative)
- Nominalization detection for process/continuant ambiguity

### 5.3 Ambiguity Detection Layer ✅ COMPLETE

| Module | Purpose | Test Count |
|--------|---------|------------|
| `src/graph/AmbiguityDetector.js` | Identifies 5+ ambiguity types | 31 tests |
| `src/graph/AmbiguityReport.js` | Structured output with JSON-LD | 26 tests |
| Integration tests | End-to-end with SemanticGraphBuilder | 14 tests |

**Ambiguity Types Detected:**

| Type | Detection Signal | Example |
|------|------------------|---------|
| `noun_category` | Nominalization suffix + context | "organization" (process vs entity) |
| `modal_force` | Modal + subject/verb analysis | "should" (obligation vs expectation) |
| `scope` | Quantifier + negation position | "not all" (wide vs narrow scope) |
| `selectional_violation` | Inanimate agent + intentional verb | "The rock decided" |
| `potential_metonymy` | Location as agent | "The White House announced" |

### 5.3.1 Stakeholder Improvements ✅ COMPLETE

Based on stakeholder review (2026-01-23):

1. **`tagteam:selectionalMismatch: true`** - Flag on acts with inanimate agents
2. **Organization typing** - committee, board, council, commission, panel, team → `cco:Organization`
3. **Ambiguity surfacing** - Flags added directly to `@graph` nodes, not just `_ambiguityReport`

### Phase 5 Lessons Learned

**What Worked Well:**
- Incremental development with continuous testing
- Custom code + archived implementations = zero dependencies
- `detectAmbiguity: true` opt-in flag preserves backwards compatibility
- Surfacing ambiguity in both `_ambiguityReport` AND `@graph` nodes serves different consumers

**What Could Be Improved:**
- Entity label handling inconsistency (`label` vs `rdfs:label`) caused bug in integration
- Need consistent interface between test data and production graph structure

**Key Insight for Phase 6:**
The ambiguity detection foundation is solid, but **resolution** is the hard problem. Phase 5 flags ambiguity; Phase 6 must decide *when* to preserve multiple readings vs pick a default.

---

## Phase 6: Interpretation Lattice

**Goal:** Transform detected ambiguities (Phase 5) into preserved, structured readings

**Bundle Size Budget:** +100KB max (target: 5.1MB total)

**Prerequisites:** Phase 5 complete (AmbiguityDetector, AmbiguityReport)

### Phase 5 → Phase 6 Connection

Phase 5 **detects** ambiguities and flags them. Phase 6 **resolves** when to preserve multiple readings:

```
Phase 5 Output:                      Phase 6 Output:
┌────────────────────────┐           ┌────────────────────────────────────┐
│ _ambiguityReport: {    │           │ interpretationLattice: {           │
│   ambiguities: [       │    →      │   defaultReading: { graph... },    │
│     { type: "modal",   │           │   alternativeReadings: [           │
│       readings: [...], │           │     { id: "epistemic",             │
│       confidence: ... }│           │       plausibility: 0.3,           │
│   ]                    │           │       graph: {...} }               │
│ }                      │           │   ]                                │
└────────────────────────┘           └────────────────────────────────────┘
```

### 6.0 Selectional Preference Lookup Table (FIRST)

**Status:** Not started
**Priority:** Critical (stakeholder requested)
**Effort:** Low

Before building the full lattice, create the selectional preference system that Phase 5 exposed as missing:

| Verb Class | Subject Requirement | Object Requirement |
|------------|--------------------|--------------------|
| `intentional_mental` (decide, believe, intend) | `animate` OR `organization` | - |
| `intentional_physical` (lift, throw, carry) | `animate` | `material_entity` |
| `communication` (announce, report, claim) | `animate` OR `organization` | `proposition` |
| `transfer` (give, allocate, assign) | `animate` OR `organization` | `continuant` |

**Deliverables:**
- `src/graph/SelectionalPreferences.js` - lookup table with verb→requirement mappings
- Extend `AmbiguityDetector._isIntentionalAct()` to use centralized preferences
- Add `cco:Organization` as valid agent for intentional acts (committees can "decide")

**Why First:** This fixes the "inanimate agent" false positives (ventilator ≠ rock) and provides foundation for plausibility scoring.

### 6.1 Ambiguity Resolution Strategy

**Status:** Not started
**Priority:** High
**Effort:** Medium

**Key Insight from Phase 5:** Not all ambiguities need multiple readings preserved. Define resolution strategy:

| Ambiguity Type | Resolution Strategy |
|----------------|---------------------|
| `selectional_violation` | Flag but DON'T create alternative (anomalous input) |
| `modal_force` | Preserve 2 readings if confidence < 0.8 |
| `noun_category` | Use context signals; preserve if "of" complement present |
| `scope` | Preserve 2 readings (semantic difference significant) |
| `potential_metonymy` | Flag with suggested reading; don't fork graph |

**Deliverables:**
- `src/graph/AmbiguityResolver.js` - decides which ambiguities to preserve
- Configuration: `{ preserveThreshold: 0.7, maxReadingsPerNode: 3 }`

### 6.2 Lattice Data Structure (Simplified)

**Status:** Not started
**Priority:** High
**Effort:** Medium

Based on Phase 5 learnings, simplify from original spec. Focus on **practical utility**:

```javascript
class InterpretationLattice {
  constructor(defaultGraph, ambiguities) {
    this.defaultReading = defaultGraph;     // The "best guess" graph
    this.ambiguities = ambiguities;         // Phase 5 AmbiguityReport
    this.alternativeReadings = [];          // Only for preserved ambiguities
    this.resolutionLog = [];                // Audit trail
  }

  // Primary API
  getDefaultReading()           // Returns defaultReading (most consumers use this)
  getAlternatives()             // Returns array of alternative interpretations
  getAmbiguitiesPreserved()     // Returns which ambiguities have multiple readings

  // Analysis API
  hasSignificantAmbiguity()     // True if any unresolved ambiguity
  getResolutionReasoning()      // Why each ambiguity was resolved/preserved

  // Serialization
  toJSONLD()                    // Full lattice as JSON-LD
  toSimplifiedGraph()           // Default reading only (backwards compatible)
}
```

**Key Simplification:** Don't build full lattice graph with subsumption relations upfront. Build alternative readings on-demand for specific ambiguity types.

**Deliverables:**
- `src/graph/InterpretationLattice.js`

### 6.3 Alternative Graph Generation

**Status:** Not started
**Priority:** Medium
**Effort:** Medium

For preserved ambiguities, generate alternative graph fragments:

```javascript
// Modal force ambiguity → two act interpretations
{
  defaultReading: {
    "@id": "inst:Act_123",
    "tagteam:actualityStatus": "tagteam:Prescribed",  // Deontic: obligation
    "tagteam:modality": "obligation"
  },
  alternativeReadings: [{
    "@id": "inst:Act_123_alt1",
    "tagteam:actualityStatus": "tagteam:Hypothetical", // Epistemic: expectation
    "tagteam:modality": "expectation",
    "tagteam:plausibility": 0.3,
    "tagteam:derivedFrom": { "@id": "inst:Act_123" }
  }]
}
```

**Deliverables:**
- `src/graph/AlternativeGraphBuilder.js` - creates variant nodes for ambiguities
- Ensure IRIs are unique but traceable (`_alt1`, `_alt2` suffixes)

### 6.4 SemanticGraphBuilder Integration

**Status:** Not started
**Priority:** High
**Effort:** Low (infrastructure from Phase 5 exists)

Extend `build()` with opt-in lattice (builds on `detectAmbiguity: true`):

```javascript
build(text, options = {}) {
  // Phase 5: Detect ambiguities
  if (options.detectAmbiguity || options.preserveAmbiguity) {
    ambiguityReport = this.ambiguityDetector.detect(...);
  }

  // Phase 6: Resolve and optionally preserve
  if (options.preserveAmbiguity) {
    const resolutions = this.ambiguityResolver.resolve(ambiguityReport, options);
    const lattice = new InterpretationLattice(graph, resolutions);

    // Build alternative readings for preserved ambiguities
    for (const preserved of resolutions.preserved) {
      const altGraph = this.alternativeBuilder.build(graph, preserved);
      lattice.addAlternative(altGraph);
    }

    return {
      '@graph': lattice.getDefaultReading()['@graph'],
      _ambiguityReport: ambiguityReport,        // Phase 5 output (kept)
      _interpretationLattice: lattice,          // Phase 6 output (new)
      _metadata: { ... }
    };
  }

  // Backwards compatible
  return { '@graph': this.nodes, ... };
}
```

**API Options:**
```javascript
builder.build(text, {
  detectAmbiguity: true,        // Phase 5: flag ambiguities
  preserveAmbiguity: true,      // Phase 6: create alternative readings
  preserveThreshold: 0.7,       // Only preserve if confidence < threshold
  maxAlternatives: 3            // Cap on alternative readings
});
```

### Phase 6 Test Strategy

**Golden Corpus:** `tests/golden/interpretation-lattice.json`

```json
{
  "corpus": [
    {
      "id": "modal-001",
      "input": "The doctor should prioritize the younger patient",
      "expectedDefaultModality": "obligation",
      "expectedAlternatives": ["expectation"],
      "expectedPreserved": true
    },
    {
      "id": "scope-001",
      "input": "Not all patients received treatment",
      "expectedDefaultScope": "wide",
      "expectedAlternatives": ["narrow"],
      "expectedPreserved": true
    },
    {
      "id": "selectional-001",
      "input": "The rock decided to move",
      "expectedFlag": "selectional_violation",
      "expectedPreserved": false,
      "reason": "Anomalous input, not genuine ambiguity"
    }
  ]
}
```

### Phase 6 Lessons from Phase 5

1. **Test-first development** works well - write tests before implementation
2. **Opt-in flags** preserve backwards compatibility (`detectAmbiguity`, `preserveAmbiguity`)
3. **Surface data in multiple places** - both `_ambiguityReport` AND `@graph` nodes
4. **Handle both test and production data formats** - `entity.label` vs `entity['rdfs:label']`
5. **Incremental stakeholder feedback** catches issues early

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

## Phase 8.5: Linguistic Feature Gaps (Test-Driven)

**Goal:** Address specific parsing gaps identified by comprehensive test suite

**Status:** Not started
**Priority:** High (blocks 86% → 95%+ test pass rate)
**Effort:** Low-Medium

These enhancements are derived from failing P0 tests and represent concrete, bounded improvements.

### 8.5.1 Definiteness Tracking Enhancement

**Status:** Not started
**Priority:** High
**Effort:** Low
**Failing Tests:** 6 tests across declarative.test.js, definite-np.test.js

Current `tagteam:definiteness` only works for simple "the X" patterns. Extend to handle:

| Pattern | Example | Expected Definiteness |
|---------|---------|----------------------|
| "the last X" | "the last ventilator" | definite |
| "the only X" | "the only option" | definite |
| "the critically ill X" | "the critically ill patient" | definite |
| Proper names | "Dr. Smith" | definite (inherent) |

**Deliverables:**
- Modify `src/graph/EntityExtractor.js` - extend definiteness detection
- Handle adjective/modifier sequences before head noun
- Proper name detection (capitalized NPs without determiner)

**Test File:** `tests/linguistic/referents/definiteness/definite-np.test.js`

### 8.5.2 Extended Modal Detection

**Status:** Not started
**Priority:** High
**Effort:** Low
**Failing Tests:** 2 tests in deontic-obligation.test.js

Current modal detection misses some obligation markers:

| Modal | Current Status | Fix Required |
|-------|---------------|--------------|
| "must" | ✅ Working | - |
| "shall" | ❌ Maps to Actual | Add to obligation modals |
| "have to" | ❌ Not detected | Multi-word modal detection |
| "need to" | ✅ Working | - |

**Deliverables:**
- Modify `src/graph/ActExtractor.js` - add "shall" to DEONTIC_MODALS
- Modify `src/graph/DirectiveExtractor.js` - ensure multi-word modal patterns match

**Test File:** `tests/linguistic/verbphrase/modality/deontic-obligation.test.js`

### 8.5.3 Domain Vocabulary Expansion

**Status:** Not started
**Priority:** Medium
**Effort:** Low
**Failing Tests:** 2 tests in person.test.js

Add missing terms to medical domain config:

| Term | Expected Mapping | Current Status |
|------|-----------------|----------------|
| "surgeon" | cco:Person | ❌ Falls back to bfo:MaterialEntity |
| "committee" | cco:GroupOfPersons | ❌ Not recognized |
| "board" | cco:GroupOfPersons | ❌ Not recognized |

**Deliverables:**
- Update `config/medical.json` - add surgeon, committee, board
- Add group entity patterns to EntityExtractor

**Test File:** `tests/ontology/cco-mapping/agents/person.test.js`

### 8.5.4 Scarcity Marker Detection

**Status:** Not started
**Priority:** Medium
**Effort:** Low
**Failing Tests:** 2 tests in definite-np.test.js

Detect scarcity/uniqueness markers that affect resource allocation analysis:

| Marker | Example | Scarcity Property |
|--------|---------|-------------------|
| "the last" | "the last ventilator" | `tagteam:scarcityMarker: "last"` |
| "the only" | "the only option" | `tagteam:scarcityMarker: "only"` |
| "the remaining" | "the remaining supplies" | `tagteam:scarcityMarker: "remaining"` |

**Deliverables:**
- Modify `src/graph/EntityExtractor.js` - detect scarcity modifiers
- Add `tagteam:scarcityMarker` to entity nodes
- Update JSONLDSerializer @context

**Test File:** `tests/linguistic/referents/definiteness/definite-np.test.js`

### Test Coverage Impact

| Enhancement | Tests Fixed | New Pass Rate |
|-------------|-------------|---------------|
| 8.5.1 Definiteness | 6 | 92% |
| 8.5.2 Modal Detection | 2 | 94% |
| 8.5.3 Vocabulary | 2 | 96% |
| 8.5.4 Scarcity Markers | 2 | 97% |
| **Combined** | **12** | **97%+** |

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

| Phase | Component | Size Delta | Cumulative | Status |
|-------|-----------|------------|------------|--------|
| Phase 4 | Core + Graph | - | 4.8 MB | ✅ Complete |
| Phase 5 | NLP upgrades | +50 KB | 4.85 MB | ✅ Complete (under budget!) |
| Phase 6 | Lattice | +100 KB | 4.95 MB | Planned |
| Phase 7 | Epistemic | +50 KB | 5.0 MB | Planned |
| Phase 8-9 | Disambiguation + Validation | +50 KB | 5.05 MB | Planned |
| **Target Max** | - | - | **6.0 MB** | - |

**Phase 5 Size Success:** Stayed well under +200KB budget by using custom implementations instead of external libraries.

**Size Management Strategies:**
- Tree-shaking unused code paths
- Lazy loading of domain configs
- Custom implementations over external libraries (proven in Phase 5)

---

## Implementation Priority Matrix

| Phase | Priority | Effort | Dependencies | Enables | Status |
|-------|----------|--------|--------------|---------|--------|
| **5.0** NLP Library Eval | Critical | Low | None | 5.1, 5.2, 5.3 | ✅ Complete |
| **5.1** Core NLP Modules | High | Low | 5.0 | 5.2, 5.3 | ✅ Complete |
| **5.2** Phrase Extractors | High | Medium | 5.0, 5.1 | 5.3, 6.x | ✅ Complete |
| **5.3** Ambiguity Detection | High | Medium | 5.2 | 6.x | ✅ Complete |
| **6.0** Selectional Preferences | Critical | Low | 5.3 | 6.1, 6.2 | **Next** |
| **6.1** Ambiguity Resolver | High | Medium | 6.0 | 6.2, 6.3 | Planned |
| **6.2** Lattice Data Structure | High | Medium | 6.1 | 6.3, 6.4 | Planned |
| **6.3** Alternative Graph Builder | Medium | Medium | 6.2 | 6.4 | Planned |
| **6.4** Builder Integration | High | Low | 6.2, 6.3 | 7.x | Planned |
| **7.1** Source Attribution | High | Medium | 6.4 | 7.2 | Planned |
| **7.2** Certainty Markers | Medium | Low | 7.1 | - | Planned |
| **7.3** Temporal Grounding | Medium | Medium | 6.4 | - | Planned |
| **8.x** Disambiguation | Low | Medium | 6.4 | - | Planned |
| **9.x** Validation | Low | Low | 6.4 | - | Planned |
| **10** Human Validation | Medium | Medium | 6.4 | - | Planned |
| **11** Domain Support | Low | Low | None | - | Planned |

---

## Recommended Implementation Sequence

### ✅ Complete

1. **Phase 5.0:** NLP Library evaluation → Custom implementation chosen
2. **Phase 5.1:** Core NLP (Lemmatizer, ContractionExpander) → 149 tests
3. **Phase 5.2:** Phrase extractors (VP, NP) → 59 tests
4. **Phase 5.3:** Ambiguity detection → 71 tests
5. **Phase 5.3.1:** Stakeholder improvements → selectionalMismatch, Organization typing

### Immediate (Phase 6)

6. **Phase 6.0:** Selectional Preferences lookup table (Critical - fixes false positives)
7. **Phase 6.1:** Ambiguity Resolver (decides preserve vs resolve)
8. **Phase 6.2:** InterpretationLattice data structure
9. **Phase 6.3:** Alternative graph generation
10. **Phase 6.4:** SemanticGraphBuilder integration (opt-in API)
11. Create golden test corpus for lattice validation

### Medium-Term (Phase 7)

12. **Phase 7.1:** Source attribution detection
13. **Phase 7.2-7.3:** Certainty markers, temporal grounding

### Longer-Term

14. **Phase 8.x:** Enhanced disambiguation
15. **Phase 9.x:** Extended validation

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
| **Ambiguity Detection** | Phase 5 | ✅ Complete |
| **Modal Force Classification** | Phase 5 | ✅ Complete |
| **Selectional Violation Detection** | Phase 5 | ✅ Complete |
| **Scope Ambiguity Detection** | Phase 5 | ✅ Complete |
| **Metonymy Detection** | Phase 5 | ✅ Complete |
| **Ambiguity Resolution** | Phase 6 | Planned |
| **Interpretation Lattice** | Phase 6 | Planned |
| **Source Attribution** | Phase 7 | Planned |
| **Epistemic Status** | Phase 7 | Planned |
| **Temporal Grounding** | Phase 7 | Planned |
| Human Validation Loop | Phase 10 | Planned |

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 5.3.1-phase5 | 2026-01-23 | Phase 5 complete: 280+ tests, ambiguity detection, stakeholder improvements |
| 5.2.0-tests | 2026-01-22 | Phase 8.5 test-driven enhancements, comprehensive test framework |
| 5.1.0-vision | 2026-01-19 | Addressed critique: scope clarity, bundle budgets, test strategy, Phase 7/10 detail |
| 5.0.0-vision | 2026-01-19 | Ideal NLP roadmap, opt-in lattice API design |
| 4.0.0-phase4 | 2026-01-19 | Domain-Neutral Parser, Selectional Restrictions |
| 4.0.0 | 2026-01-19 | Phase 4 complete, JSON-LD, SHACL validation |
| 2.0.0 | 2026-01 | IEE integration, 50 values, ethical profiling |
| 1.0.0 | 2025 | Initial semantic parser |

---

## Current Bundle

```
dist/tagteam.js  (~4.85 MB single bundle)

┌─────────────────────────────────────────────────────────────┐
│                    tagteam.js (4.85 MB)                     │
├─────────────────────────────────────────────────────────────┤
│  Core                                                       │
│  ├── lexicon.js (4.1 MB POS lexicon)                       │
│  ├── POSTagger.js                                          │
│  ├── PatternMatcher.js                                     │
│  ├── SemanticRoleExtractor.js                              │
│  ├── ContractionExpander.js (Phase 5)                      │
│  ├── Lemmatizer.js (Phase 5)                               │
│  ├── VerbPhraseExtractor.js (Phase 5)                      │
│  └── NounPhraseExtractor.js (Phase 5)                      │
├─────────────────────────────────────────────────────────────┤
│  Analyzers                                                  │
│  ├── ContextAnalyzer.js (12 dimensions)                    │
│  ├── ValueMatcher.js                                       │
│  ├── ValueScorer.js                                        │
│  └── EthicalProfiler.js                                    │
├─────────────────────────────────────────────────────────────┤
│  Graph (Phase 4 + 5)                                        │
│  ├── SemanticGraphBuilder.js                               │
│  ├── JSONLDSerializer.js                                   │
│  ├── SHMLValidator.js                                      │
│  ├── AmbiguityDetector.js (Phase 5)                        │
│  └── AmbiguityReport.js (Phase 5)                          │
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
