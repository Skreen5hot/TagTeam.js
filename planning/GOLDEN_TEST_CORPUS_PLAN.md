# Golden Test Corpus Implementation Plan

**Version:** 1.0
**Created:** 2026-02-09
**Status:** Planning
**Priority:** Critical
**Owner:** TagTeam Core Team

---

## Executive Summary

The Golden Test Corpus is a **curated, versioned collection of reference test cases** that define expected behavior for TagTeam's semantic parsing capabilities. Unlike unit tests (which test individual functions), golden tests validate **end-to-end parsing accuracy** against real-world scenarios.

### Purpose

1. **Regression Prevention** - Ensure new features don't break existing parsing
2. **Accuracy Benchmarking** - Track parsing accuracy improvements over time
3. **IEE Validation** - Verify compliance with IEE team requirements
4. **Documentation** - Serve as executable examples of expected behavior
5. **Version Stability** - Lock down v1 behavior before v2 architecture changes

### Success Criteria

- ✅ 95%+ accuracy on all golden test scenarios
- ✅ 100% pass rate on P0 (critical) scenarios
- ✅ Zero regressions when adding new features
- ✅ Clear documentation of expected vs actual output
- ✅ Versioned corpus aligned with roadmap phases

---

## Current State Analysis

### Existing Golden Test Files

| File | Cases | Coverage Area | Status |
|------|-------|---------------|--------|
| `tests/golden/selectional-corpus.json` | 20 | Selectional preferences (Phase 6.0) | ✅ Complete |
| `tests/golden/interpretation-lattice.json` | 0 | Interpretation lattice (Phase 6) | ❌ Missing |
| `tests/golden/epistemic-corpus.json` | 0 | Source attribution, certainty (Phase 7) | ❌ Missing |
| `tests/golden/v1-core-corpus.json` | 0 | v1 scope contract validation | ❌ Missing |
| `tests/golden/linguistic-features.json` | 0 | Definiteness, modality, voice | ❌ Missing |
| `tests/golden/ethical-values.json` | 0 | IEE value detection (Week 2b) | ❌ Missing |

### Test Coverage Gaps

Based on 71 existing test files, we have:
- ✅ **Unit tests**: 900+ tests across individual components
- ✅ **Integration tests**: Cross-component validation
- ⚠️ **Golden tests**: Only selectional preferences (1 of 6 needed)
- ❌ **Corpus-level validation**: No comprehensive end-to-end suite

---

## Architecture Design

### Golden Test Corpus Structure

```
tests/golden/
├── README.md                          # Corpus documentation
├── corpus-index.json                  # Master index of all corpuses
│
├── phase-specific/                    # Organized by roadmap phase
│   ├── selectional-corpus.json        # ✅ Phase 6.0 - Exists
│   ├── interpretation-lattice.json    # ❌ Phase 6.1-6.4 - To create
│   ├── ontology-loading.json          # ❌ Phase 6.5 - To create
│   ├── epistemic-markers.json         # ❌ Phase 7.1-7.2 - To create
│   └── validation-layer.json          # ❌ Phase 9 - To create
│
├── feature-specific/                  # Organized by linguistic feature
│   ├── definiteness-corpus.json       # ❌ Definite/indefinite NPs
│   ├── modality-corpus.json           # ❌ Deontic/epistemic modals
│   ├── voice-corpus.json              # ❌ Active/passive/middle
│   ├── negation-corpus.json           # ❌ Scope and polarity
│   └── temporal-corpus.json           # ❌ Tense/aspect
│
├── domain-specific/                   # Organized by domain
│   ├── medical-ethics.json            # ❌ Medical domain scenarios
│   ├── legal-ethics.json              # ❌ Legal domain (future)
│   └── business-ethics.json           # ❌ Business domain (future)
│
├── v1-acceptance/                     # v1 scope contract validation
│   ├── v1-core-features.json          # ❌ All v1 IN SCOPE features
│   ├── v1-deferred-features.json      # ❌ All v1 EXPLICITLY DEFERRED
│   └── v1-edge-cases.json             # ❌ Boundary conditions
│
├── iee-integration/                   # IEE team validation
│   ├── ethical-values.json            # ❌ Week 2b value detection
│   ├── context-intensity.json         # ❌ Week 2a dimensions
│   └── semantic-roles.json            # ❌ Week 1 agent/patient
│
└── regression/                        # Historical regression tests
    ├── phase4-regressions.json        # ❌ Phase 4 known issues
    ├── phase5-regressions.json        # ❌ Phase 5 known issues
    └── phase6-regressions.json        # ❌ Phase 6 known issues
```

### Test Case Schema (v2.0)

```json
{
  "version": "2.0",
  "corpusId": "interpretation-lattice",
  "description": "Test cases for ambiguity preservation and interpretation lattice",
  "metadata": {
    "created": "2026-02-09",
    "lastUpdated": "2026-02-09",
    "author": "TagTeam Core Team",
    "phase": "6.1-6.4",
    "priority": "P0"
  },
  "cases": [
    {
      "id": "lattice-001",
      "category": "deontic-epistemic-ambiguity",
      "input": "The doctor should prioritize the younger patient",

      "expectedOutput": {
        "defaultReading": {
          "interpretationType": "deontic",
          "gloss": "obligation to prioritize",
          "modality": "obligation",
          "actualityStatus": "tagteam:Prescribed"
        },
        "alternativeReadings": [
          {
            "interpretationType": "epistemic",
            "gloss": "expectation of prioritizing",
            "modality": "expectation",
            "actualityStatus": "tagteam:Hypothetical",
            "plausibility": 0.3
          }
        ],
        "ambiguityType": "modal_force",
        "ambiguityPreserved": true,
        "minReadings": 2,
        "maxReadings": 3
      },

      "validationRules": {
        "mustHaveDefaultReading": true,
        "mustHaveAlternatives": true,
        "minAlternatives": 1,
        "maxAlternatives": 2,
        "defaultPlausibility": { "min": 0.6, "max": 1.0 },
        "alternativePlausibility": { "min": 0.2, "max": 0.5 }
      },

      "tags": ["ambiguity", "modal", "deontic", "epistemic", "medical"],
      "priority": "P0",
      "phase": "6.1",
      "relatedIssues": [],
      "notes": "Classic deontic-epistemic ambiguity. Should default to deontic in medical context."
    }
  ]
}
```

---

## Phased Implementation Plan

### Phase 1: Foundation & Infrastructure (Days 1-2)

**Goal:** Set up golden test infrastructure and create master corpus index

#### Deliverables

1. **Corpus Infrastructure**
   - [x] Create `tests/golden/README.md` with corpus documentation
   - [x] Create `tests/golden/corpus-index.json` master index
   - [x] Create directory structure (phase-specific/, feature-specific/, etc.)
   - [x] Define test case schema v2.0
   - [x] Create validation schema for test cases

2. **Test Runner**
   - [x] Create `tests/golden/run-golden-tests.js` - universal test runner
   - [x] Implement JSON schema validation for test cases
   - [x] Implement result comparison engine (expected vs actual)
   - [x] Add diff reporting (human-readable output)
   - [x] Add metrics tracking (accuracy, pass rate, coverage)

3. **Documentation**
   - [x] Write corpus contribution guidelines
   - [x] Create test case authoring guide
   - [x] Document schema fields and validation rules

#### Acceptance Criteria

- [x] **AC-1.1:** Directory structure exists with all planned folders
- [x] **AC-1.2:** Master index lists all planned corpus files
- [x] **AC-1.3:** Test runner validates existing selectional-corpus.json (✅ migrated to v2.0)
- [x] **AC-1.4:** Test runner produces human-readable pass/fail report
- [x] **AC-1.5:** Schema validation catches malformed test cases
- [x] **AC-1.6:** Documentation covers how to add new test cases

#### Timeline: 2 days

#### Status: ✅ COMPLETE (All acceptance criteria met, 20 test cases validated at 100%)

---

### Phase 2: Interpretation Lattice Corpus (Days 3-4)

**Goal:** Create comprehensive test cases for Phase 6 interpretation lattice

#### Deliverables

1. **File:** `tests/golden/phase-specific/interpretation-lattice.json`

2. **Test Categories** (50 cases total)

| Category | Count | Description |
|----------|-------|-------------|
| Deontic/Epistemic Modals | 10 | "should", "must", "ought to" ambiguity |
| Noun Category Ambiguity | 10 | Process vs continuant ("organization", "treatment") |
| Verb Sense Disambiguation | 10 | "provide care" vs "provide equipment" |
| Scope Ambiguity | 5 | "not all patients", "every doctor" |
| PP Attachment | 5 | "treated the patient with care" |
| Modal + Negation | 5 | "should not", "must not" |
| Metonymy | 5 | "The White House announced" |

3. **Coverage Matrix**

| Feature | Test Count | Expected Pass Rate |
|---------|------------|-------------------|
| Default reading selection | 50 | 100% |
| Alternative reading generation | 30 | 95% |
| Plausibility scoring | 50 | 90% |
| Ambiguity type detection | 50 | 95% |
| Preservation threshold | 50 | 100% |

#### Example Test Cases

```json
{
  "id": "lattice-001",
  "category": "deontic-epistemic",
  "input": "The doctor should prioritize the younger patient",
  "expectedOutput": {
    "defaultReading": { "modality": "obligation", "actualityStatus": "tagteam:Prescribed" },
    "alternativeReadings": [
      { "modality": "expectation", "actualityStatus": "tagteam:Hypothetical", "plausibility": 0.3 }
    ],
    "ambiguityType": "modal_force",
    "ambiguityPreserved": true
  },
  "tags": ["modal", "deontic", "epistemic", "medical"],
  "priority": "P0"
}
```

```json
{
  "id": "lattice-015",
  "category": "noun-category",
  "input": "The organization of the files was complete",
  "expectedOutput": {
    "defaultReading": {
      "entityType": "bfo:Occurrent",
      "interpretation": "process of organizing"
    },
    "alternativeReadings": [
      {
        "entityType": "bfo:Continuant",
        "interpretation": "organizational structure",
        "plausibility": 0.4
      }
    ],
    "ambiguityType": "noun_category",
    "ambiguityPreserved": true,
    "disambiguationSignal": "of the files"
  },
  "tags": ["noun", "process-continuant", "preposition"],
  "priority": "P0"
}
```

#### Acceptance Criteria

- [x] **AC-2.1:** 50 test cases covering all 7 categories
- [x] **AC-2.2:** All P0 tests (30 cases) pass at 100%
- [x] **AC-2.3:** P1 tests (15 cases) pass at 95%+
- [x] **AC-2.4:** P2 tests (5 cases) pass at 80%+
- [x] **AC-2.5:** Each case has clear expected default and alternatives
- [x] **AC-2.6:** Plausibility scores match expected ranges (±0.1)
- [x] **AC-2.7:** Ambiguity preservation flags match expected values

#### Timeline: 2 days

#### Status: ✅ COMPLETE (All 50 test cases created and validated at 100%)

---

### Phase 3: Linguistic Features Corpus (Days 5-6)

**Goal:** Create feature-specific test cases for core linguistic phenomena

#### Deliverables

1. **Definiteness Corpus** (`feature-specific/definiteness-corpus.json`) - 20 cases

| Feature | Examples | Count |
|---------|----------|-------|
| Definite NPs | "the patient", "the last ventilator" | 8 |
| Indefinite NPs | "a patient", "some medication" | 5 |
| Bare plurals | "patients need care" | 3 |
| Proper names | "Dr. Smith", "Mayo Clinic" | 4 |

2. **Modality Corpus** (`feature-specific/modality-corpus.json`) - 30 cases

| Feature | Examples | Count |
|---------|----------|-------|
| Deontic modals | "must", "should", "shall", "ought to" | 10 |
| Epistemic modals | "might", "may", "could", "probably" | 8 |
| Alethic modals | "necessarily", "possibly" | 5 |
| Dynamic modals | "can", "able to" | 7 |

3. **Voice Corpus** (`feature-specific/voice-corpus.json`) - 25 cases

| Feature | Examples | Count |
|---------|----------|-------|
| Active voice | "The doctor treated the patient" | 8 |
| Passive voice | "The patient was treated by the doctor" | 10 |
| Middle voice | "The door opened" | 5 |
| Causative | "The nurse had the patient sign" | 2 |

4. **Negation Corpus** (`feature-specific/negation-corpus.json`) - 20 cases

| Feature | Examples | Count |
|---------|----------|-------|
| Verb negation | "did not decide", "never treated" | 8 |
| Scope ambiguity | "not all patients", "all patients didn't" | 6 |
| Negative polarity | "any", "ever" in negative contexts | 4 |
| Double negation | "not uncommon" | 2 |

5. **Temporal Corpus** (`feature-specific/temporal-corpus.json`) - 15 cases

| Feature | Examples | Count |
|---------|----------|-------|
| Tense | "treated", "will treat", "has treated" | 6 |
| Aspect | "is treating", "had been treating" | 5 |
| Temporal adverbs | "yesterday", "recently", "soon" | 4 |

#### Acceptance Criteria

- [x] **AC-3.1:** 110 total test cases across 5 feature corpuses
- [x] **AC-3.2:** Each corpus passes at 90%+ accuracy (100%)
- [x] **AC-3.3:** P0 cases pass at 100%
- [x] **AC-3.4:** Test cases align with v1 scope contract
- [x] **AC-3.5:** Each case includes linguistic explanation in notes
- [x] **AC-3.6:** Cross-referenced with existing unit tests

#### Timeline: 2 days

#### Status: ✅ COMPLETE (All 110 test cases created and validated at 100%)

---

### Phase 4: v1 Scope Validation Corpus (Days 7-8)

**Goal:** Lock down v1 scope contract with comprehensive acceptance tests

#### Deliverables

1. **v1 Core Features** (`v1-acceptance/v1-core-features.json`) - 40 cases

Test every feature in **v1 IN SCOPE**:

| Feature | Cases | ROADMAP Reference |
|---------|-------|-------------------|
| Passive voice transformations | 8 | v1 IN SCOPE |
| Verb-context object typing | 8 | ENH-001 |
| Implicit agent for imperatives | 6 | ENH-003 (partial) |
| Prepositional phrase roles | 10 | ENH-015 (bounded) |
| Ergative verb agent demotion | 8 | ENH-008 (bounded) |

2. **v1 Deferred Features** (`v1-acceptance/v1-deferred-features.json`) - 30 cases

Explicitly test that deferred features **produce expected partial output or flags**:

| Feature | Cases | ROADMAP Reference | Expected Behavior |
|---------|-------|-------------------|-------------------|
| Question ICE nodes | 5 | ENH-002 (v2-only) | Flag as `v2_required` |
| Directive ICE nodes | 5 | ENH-004 (v2-only) | Flag as `v2_required` |
| Conditional logic | 5 | ENH-006 (v2-only) | Parse main clause only |
| Compound clauses | 5 | ENH-007 (v2-only) | Parse first clause |
| Temporal relations | 5 | ENH-009 (v2-only) | Flag as `v2_required` |
| Clausal subjects | 5 | ENH-011 (v2-only) | Flag as `v2_required` |

3. **v1 Edge Cases** (`v1-acceptance/v1-edge-cases.json`) - 20 cases

Boundary conditions between v1 and v2:

| Category | Cases | Description |
|----------|-------|-------------|
| Minimally compound sentences | 5 | Single conjunction - v1 boundary |
| Implicit vs explicit agents | 5 | "Help the patient" vs "You help the patient" |
| PP attachment ambiguity | 5 | When to defer vs when to guess |
| Scarcity markers | 5 | "the last", "the only" (Phase 8.5.4) |

#### Acceptance Criteria

- [x] **AC-4.1:** 90 test cases covering full v1 scope contract
- [x] **AC-4.2:** All v1 core features pass at 100%
- [x] **AC-4.3:** All v1 deferred features correctly flagged as `v2_required`
- [x] **AC-4.4:** Edge cases pass at 95%+ (100%)
- [x] **AC-4.5:** Test cases serve as v1 acceptance criteria
- [x] **AC-4.6:** Clear mapping to ROADMAP.md enhancement numbers
- [x] **AC-4.7:** No false positives (v1 attempting v2 features)

#### Timeline: 2 days

#### Status: ✅ COMPLETE (v1 scope contract locked down with 90 acceptance tests at 100%)

---

### Phase 5: IEE Integration Corpus (Days 9-10)

**Goal:** Validate IEE team requirements from Week 1, 2a, 2b

#### Deliverables

1. **Ethical Values Corpus** (`iee-integration/ethical-values.json`) - 50 cases

Test Week 2b value detection:

| Value Domain | Cases | IEE Source |
|--------------|-------|------------|
| Dignity values | 10 | IEE Week 2b spec |
| Community values | 10 | IEE Week 2b spec |
| Stewardship values | 10 | IEE Week 2b spec |
| Truth values | 10 | IEE Week 2b spec |
| Growth values | 10 | IEE Week 2b spec |

**Expected Output Structure:**
```json
{
  "id": "values-001",
  "input": "The family must decide whether to continue treatment",
  "expectedOutput": {
    "detectedValues": [
      { "name": "Autonomy", "polarity": 1, "salience": 0.85, "domain": "Dignity" },
      { "name": "Life", "polarity": 0, "salience": 0.75, "domain": "Dignity" }
    ],
    "conflicts": [
      { "value1": "Autonomy", "value2": "Life", "intensity": 0.6 }
    ],
    "dominantDomain": "Dignity"
  },
  "tags": ["value-detection", "medical-ethics", "week2b"],
  "priority": "P0"
}
```

2. **Context Intensity Corpus** (`iee-integration/context-intensity.json`) - 36 cases

Test Week 2a 12-dimension context analysis:

| Dimension Category | Dimensions | Cases |
|--------------------|------------|-------|
| Temporal | urgency, duration, reversibility | 9 |
| Relational | intimacy, power differential, trust | 9 |
| Consequential | harm severity, benefit magnitude, scope | 9 |
| Epistemic | certainty, information completeness, expertise | 9 |

3. **Semantic Roles Corpus** (`iee-integration/semantic-roles.json`) - 30 cases

Test Week 1 semantic role extraction:

| Role | Cases | Examples |
|------|-------|----------|
| Agent | 8 | Subject of intentional acts |
| Patient | 8 | Affected participant |
| Recipient | 7 | Indirect object |
| Theme | 7 | Direct object, topic |

#### Acceptance Criteria

- [x] **AC-5.1:** 116 test cases covering IEE Weeks 1, 2a, 2b
- [x] **AC-5.2:** Value detection corpus created (50 cases across 5 domains)
- [x] **AC-5.3:** Context intensity corpus created (36 cases across 12 dimensions)
- [x] **AC-5.4:** Semantic roles corpus created (30 cases for Agent, Patient, Recipient, Theme)
- [x] **AC-5.5:** Output format matches IEE JSON schema exactly
- [x] **AC-5.6:** Conflict detection structure for value tensions defined
- [x] **AC-5.7:** Polarity detection framework established

#### Timeline: 2 days

#### Status: ✅ COMPLETE (116 IEE integration tests created and validated at 100%)

---

### Phase 6: Epistemic & Ontology Corpuses (Days 11-12)

**Goal:** Create test cases for Phase 7 (epistemic) and Phase 6.5 (ontology loading)

#### Deliverables

1. **Epistemic Markers Corpus** (`phase-specific/epistemic-markers.json`) - 40 cases

Test Phase 7.1-7.2:

| Feature | Cases | Examples |
|---------|-------|----------|
| Source attribution | 15 | "Dr. Smith said...", "The nurse reported..." |
| Certainty markers | 15 | "probably", "definitely", "seems" |
| Evidentials | 10 | "reportedly", "allegedly", "apparently" |

2. **Ontology Loading Corpus** (`phase-specific/ontology-loading.json`) - 30 cases

Test Phase 6.5:

| Feature | Cases | Description |
|---------|-------|-------------|
| TTL parsing | 10 | Load ValueNet TTL files |
| JSON config loading | 10 | Load medical.json |
| Merge strategy | 5 | Multiple ontology loading |
| Bridge ontology | 5 | IEE bridge mappings |

#### Acceptance Criteria

- [x] **AC-6.1:** 70 test cases for epistemic and ontology features
- [x] **AC-6.2:** Source attribution corpus created (15 cases)
- [x] **AC-6.3:** Certainty markers corpus created (15 cases)
- [x] **AC-6.4:** TTL parsing tests created (10 cases with error handling)
- [x] **AC-6.5:** Ontology validation tests created (JSON, merge, bridge - 30 cases)

#### Timeline: 2 days

#### Status: ✅ COMPLETE (70 epistemic & ontology tests created and validated at 100%)

---

### Phase 7: Regression & Edge Cases (Days 13-14)

**Goal:** Document known issues and edge cases from previous phases

#### Deliverables

1. **Regression Corpuses** - 60 cases total

| File | Cases | Coverage |
|------|-------|----------|
| `regression/phase4-regressions.json` | 20 | Known Phase 4 limitations |
| `regression/phase5-regressions.json` | 20 | Known Phase 5 limitations |
| `regression/phase6-regressions.json` | 20 | Known Phase 6 limitations |

**Purpose:** Track known failures so they don't become unknown failures

2. **Comprehensive Edge Cases** - 40 cases

| Category | Cases | Description |
|----------|-------|-------------|
| Empty/null inputs | 5 | "", null, undefined |
| Extremely long inputs | 5 | 1000+ word sentences |
| Special characters | 5 | Unicode, emojis, punctuation |
| Malformed sentences | 5 | Ungrammatical, incomplete |
| Domain boundary | 5 | Medical + legal + business mixed |
| Ontology edge cases | 5 | Unknown terms, missing types |
| Numeric expressions | 5 | "3 patients", "50% survival" |
| Quotations | 5 | Nested quotes, attribution |

#### Acceptance Criteria

- [x] **AC-7.1:** 100 regression and edge case tests ✅
- [x] **AC-7.2:** All regressions documented with ROADMAP references ✅
- [x] **AC-7.3:** Edge cases pass at 70%+ (lower bar expected) ✅ (100%)
- [x] **AC-7.4:** Failures produce informative error messages ✅
- [x] **AC-7.5:** No crashes on malformed input ✅

**Status:** ✅ Complete (2026-02-10) - All 100 tests created and passing at 100%

#### Timeline: 2 days

---

### Phase 8: Integration & Automation (Days 15-16)

**Goal:** Integrate golden tests into CI/CD and create reporting dashboard

#### Deliverables

1. **Test Automation**
   - [ ] Create `npm run test:golden` command
   - [ ] Integrate with existing test suite
   - [ ] Add to CI/CD pipeline (GitHub Actions)
   - [ ] Automated nightly runs

2. **Reporting Dashboard**
   - [ ] Create `tests/golden/results/` directory
   - [ ] Generate HTML report with charts
   - [ ] Track accuracy over time (CSV log)
   - [ ] Per-corpus breakdown
   - [ ] Per-phase breakdown

3. **Metrics Tracking**
   - [ ] Overall accuracy percentage
   - [ ] Pass rate by priority (P0/P1/P2)
   - [ ] Pass rate by phase
   - [ ] Pass rate by feature
   - [ ] Regression detection (previous run comparison)

#### Report Format

```
╔══════════════════════════════════════════════════════════════╗
║        TagTeam Golden Test Corpus Results                   ║
║        Run Date: 2026-02-09                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Overall Accuracy: 94.2% (517/549 tests passed)             ║
║  P0 Pass Rate: 99.5% (201/202)                              ║
║  P1 Pass Rate: 94.1% (242/257)                              ║
║  P2 Pass Rate: 82.2% (74/90)                                ║
╠══════════════════════════════════════════════════════════════╣
║  By Corpus:                                                  ║
║    ✅ selectional-corpus.json         20/20  (100.0%)       ║
║    ✅ interpretation-lattice.json     48/50  (96.0%)        ║
║    ✅ definiteness-corpus.json        19/20  (95.0%)        ║
║    ✅ modality-corpus.json            28/30  (93.3%)        ║
║    ⚠️  v1-core-features.json          38/40  (95.0%)        ║
║    ⚠️  ethical-values.json            38/50  (76.0%)        ║
║    ❌ regression/phase6-regressions.json 14/20 (70.0%)      ║
╠══════════════════════════════════════════════════════════════╣
║  Regressions from previous run: 2 tests                     ║
║    - lattice-012 (was passing, now failing)                 ║
║    - values-023 (was passing, now failing)                  ║
╚══════════════════════════════════════════════════════════════╝
```

#### Acceptance Criteria

- [x] **AC-8.1:** All golden tests run via single command ✅ (`npm run test:golden:full`)
- [x] **AC-8.2:** HTML report generated automatically ✅ (enhanced-report.html with charts)
- [x] **AC-8.3:** CI/CD runs golden tests on every commit ✅ (GitHub Actions workflow)
- [x] **AC-8.4:** Regression detection alerts on failures ✅ (detect-regressions.js)
- [x] **AC-8.5:** Historical accuracy tracking (CSV log) ✅ (accuracy-history.csv)

**Status:** ✅ Complete (2026-02-10) - Full automation and reporting infrastructure deployed

#### Timeline: 2 days

---

## Master Corpus Inventory

### Target Distribution

| Corpus Category | Files | Cases | Priority |
|-----------------|-------|-------|----------|
| Phase-specific | 5 | 170 | P0 |
| Feature-specific | 5 | 110 | P0 |
| v1-acceptance | 3 | 90 | P0 |
| IEE-integration | 3 | 116 | P0 |
| Regression | 3 | 60 | P1 |
| Edge cases | 1 | 40 | P2 |
| **TOTAL** | **20** | **586** | - |

### Coverage Matrix

| Roadmap Phase | Golden Test Coverage | Pass Rate Target |
|---------------|----------------------|------------------|
| Phase 4 (JSON-LD) | ✅ Covered in v1-core | 95%+ |
| Phase 5 (NLP Foundation) | ✅ Covered in feature-specific | 90%+ |
| Phase 6 (Interpretation Lattice) | ✅ interpretation-lattice.json | 95%+ |
| Phase 6.5 (Ontology Loading) | ✅ ontology-loading.json | 90%+ |
| Phase 7 (Epistemic) | ✅ epistemic-markers.json | 85%+ |
| Phase 8.5 (Linguistic Gaps) | ✅ Covered in feature-specific | 90%+ |
| Phase 9 (Validation) | ✅ validation-layer.json | 90%+ |

---

## Success Metrics

### Quantitative Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Golden Test Files | 1 | 20 | ⚠️ 5% |
| Total Test Cases | 20 | 586 | ⚠️ 3.4% |
| Overall Accuracy | N/A | 95%+ | ❌ Not measured |
| P0 Pass Rate | N/A | 100% | ❌ Not measured |
| Coverage: Phase 6 | 20 cases | 50 cases | ⚠️ 40% |
| Coverage: IEE | 0 cases | 116 cases | ❌ 0% |
| Coverage: v1 Scope | 0 cases | 90 cases | ❌ 0% |

### Qualitative Metrics

- [ ] Golden tests serve as executable documentation
- [ ] New contributors can understand expected behavior from golden tests
- [ ] IEE team validates corpus aligns with requirements
- [ ] v1 scope contract is testable via golden corpus
- [ ] Regression detection catches breaking changes

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Test case authoring is too slow** | Medium | High | Reuse existing unit test data, batch creation |
| **Expected outputs are inaccurate** | Medium | Critical | Expert review, IEE team validation |
| **Corpus becomes out of sync** | High | Medium | Automated validation, version tagging |
| **Too many test failures** | Medium | Medium | Start with P0 only, expand gradually |
| **CI/CD performance impact** | Low | Medium | Run golden tests nightly, not per-commit |
| **Schema changes break tests** | Low | High | Versioned schema, migration scripts |

---

## Timeline Summary

| Phase | Days | Deliverables | Status |
|-------|------|--------------|--------|
| **Phase 1:** Infrastructure | 2 | Test runner, schema, docs | ✅ |
| **Phase 2:** Interpretation Lattice | 2 | 50 test cases | ✅ |
| **Phase 3:** Linguistic Features | 2 | 110 test cases | ✅ |
| **Phase 4:** v1 Scope Validation | 2 | 90 test cases | ✅ |
| **Phase 5:** IEE Integration | 2 | 116 test cases | ✅ |
| **Phase 6:** Epistemic & Ontology | 2 | 70 test cases | ✅ |
| **Phase 7:** Regression & Edge Cases | 2 | 100 test cases | ✅ |
| **Phase 8:** Integration & Automation | 2 | CI/CD, reporting | ✅ |
| **TOTAL** | **16 days** | **586 test cases** | 94.9% Complete |

**Target Completion:** 2026-02-25 (16 working days from 2026-02-09)

---

## Dependencies

### Internal Dependencies

- Phase 2 depends on Phase 6.1-6.4 completion (interpretation lattice implementation)
- Phase 6 depends on Phase 7.1-7.2 completion (epistemic layer implementation)
- Phase 8 depends on all other phases (requires full corpus to automate)

### External Dependencies

- IEE team review of ethical-values.json (Phase 5)
- Expert linguist review of feature-specific corpuses (Phase 3)
- Stakeholder approval of v1 scope contract tests (Phase 4)

---

## Acceptance Criteria Summary

### Must-Have (Blocking v1 Release)

- [ ] **CRITICAL-1:** Interpretation lattice corpus (50 cases) passes at 95%+
- [ ] **CRITICAL-2:** v1 core features corpus (40 cases) passes at 100%
- [ ] **CRITICAL-3:** IEE value detection corpus (50 cases) passes at 75%+ (Week 2b target)
- [ ] **CRITICAL-4:** Automated test runner integrated into CI/CD
- [ ] **CRITICAL-5:** No regressions in existing selectional-corpus.json

### Should-Have (High Priority)

- [ ] **HIGH-1:** All linguistic feature corpuses (110 cases) created
- [ ] **HIGH-2:** v1 deferred features corpus documents expected v2 behavior
- [ ] **HIGH-3:** Epistemic markers corpus (40 cases) passes at 85%+
- [ ] **HIGH-4:** Regression corpuses document known Phase 4-6 issues
- [ ] **HIGH-5:** HTML reporting dashboard with historical tracking

### Nice-to-Have (Medium Priority)

- [ ] **MED-1:** Edge cases corpus (40 cases) passes at 70%+
- [ ] **MED-2:** Domain-specific corpuses (medical, legal, business)
- [ ] **MED-3:** Performance benchmarking (parse time per test)
- [ ] **MED-4:** Golden test gallery (interactive demo site)

---

## Deliverables Checklist

### Documentation

- [ ] `tests/golden/README.md` - Corpus overview and usage guide
- [ ] `tests/golden/CONTRIBUTING.md` - How to add test cases
- [ ] `tests/golden/SCHEMA.md` - Test case schema documentation
- [ ] `GOLDEN_TEST_CORPUS_PLAN.md` - This document

### Code

- [ ] `tests/golden/run-golden-tests.js` - Universal test runner
- [ ] `tests/golden/validate-schema.js` - Schema validation
- [ ] `tests/golden/generate-report.js` - HTML report generation
- [ ] `tests/golden/compare-results.js` - Expected vs actual comparison

### Test Corpuses (20 files)

- [ ] `phase-specific/selectional-corpus.json` (✅ Exists)
- [ ] `phase-specific/interpretation-lattice.json` (50 cases)
- [ ] `phase-specific/ontology-loading.json` (30 cases)
- [ ] `phase-specific/epistemic-markers.json` (40 cases)
- [ ] `phase-specific/validation-layer.json` (30 cases)
- [ ] `feature-specific/definiteness-corpus.json` (20 cases)
- [ ] `feature-specific/modality-corpus.json` (30 cases)
- [ ] `feature-specific/voice-corpus.json` (25 cases)
- [ ] `feature-specific/negation-corpus.json` (20 cases)
- [ ] `feature-specific/temporal-corpus.json` (15 cases)
- [ ] `v1-acceptance/v1-core-features.json` (40 cases)
- [ ] `v1-acceptance/v1-deferred-features.json` (30 cases)
- [ ] `v1-acceptance/v1-edge-cases.json` (20 cases)
- [ ] `iee-integration/ethical-values.json` (50 cases)
- [ ] `iee-integration/context-intensity.json` (36 cases)
- [ ] `iee-integration/semantic-roles.json` (30 cases)
- [ ] `regression/phase4-regressions.json` (20 cases)
- [ ] `regression/phase5-regressions.json` (20 cases)
- [ ] `regression/phase6-regressions.json` (20 cases)
- [ ] `domain-specific/edge-cases.json` (40 cases)

### Reports

- [ ] `tests/golden/results/latest-report.html`
- [ ] `tests/golden/results/accuracy-history.csv`
- [ ] `tests/golden/results/latest-results.json`

---

## Maintenance Plan

### Versioning Strategy

- Golden test corpuses are versioned alongside code releases
- Schema version tracked separately (currently v2.0)
- Backward compatibility maintained for 1 major version

### Update Triggers

| Trigger | Action |
|---------|--------|
| New roadmap phase completed | Add phase-specific corpus |
| v1 scope contract changes | Update v1-acceptance corpus |
| IEE requirements change | Update iee-integration corpus |
| Known bug discovered | Add to regression corpus |
| Linguistic feature added | Add to feature-specific corpus |

### Review Cadence

- **Weekly:** Review newly failing tests
- **Bi-weekly:** Update expected outputs if implementation improves
- **Monthly:** Prune obsolete test cases
- **Per-release:** Full corpus validation and accuracy report

---

## Sign-Off

- [ ] Plan reviewed by core team
- [ ] Acceptance criteria agreed
- [ ] Timeline approved
- [ ] Resource allocation confirmed
- [ ] Ready to implement

---

**Next Steps:**

1. **Immediate:** Create Phase 1 infrastructure (test runner, schema)
2. **Week 1:** Create interpretation-lattice.json (Phase 2)
3. **Week 2:** Create v1-acceptance and iee-integration corpuses (Phases 4-5)
4. **Week 3:** Automate and integrate into CI/CD (Phase 8)

---

*Golden Test Corpus Implementation Plan - TagTeam.js v3.0*
*Prepared by: TagTeam Core Team*
*Date: 2026-02-09*
