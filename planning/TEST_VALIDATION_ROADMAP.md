# TagTeam Test Validation Roadmap

**Version:** 1.0
**Created:** 2026-02-10
**Status:** Active Development
**Purpose:** Establish TRUE validation pyramid with clear sources of truth

---

## Executive Summary

### The Problem

Current state: 556 "golden tests" pass at 100%, but expert validation reveals critical failures (0% pass rate on real scenarios). This indicates:

1. **No Component-Level Testing** - Can't isolate where failures occur
2. **Mock-Based "Tests"** - Not running actual TagTeam code
3. **No Ground Truth** - Unclear what "correct" means at each stage
4. **No Failure Attribution** - Can't diagnose root causes

### The Solution

Build a **three-level validation pyramid** where each level has:
- ✅ Clear source of truth
- ✅ Explicit expected outcomes
- ✅ Executable tests (not mocks)
- ✅ Failure attribution to specific components

**Key Insight:** Tests that FAIL are valuable - they show us exactly where to fix.

---

## The Validation Pyramid

```
                    ╱╲
                   ╱  ╲
                  ╱ L3 ╲         Level 3: Acceptance Tests
                 ╱      ╲        (2-5 tests per feature)
                ╱________╲       SME validates correctness
               ╱╲        ╱╲
              ╱  ╲      ╱  ╲
             ╱ L2 ╲    ╱ L2 ╲    Level 2: Integration Tests
            ╱      ╲  ╱      ╲   (10-20 tests per feature)
           ╱________╲╱________╲  Validate component interactions
          ╱╲                  ╱╲
         ╱  ╲                ╱  ╲
        ╱ L1 ╲              ╱ L1 ╲  Level 1: Component Tests
       ╱      ╲            ╱      ╲ (50-100 tests per component)
      ╱________╲__________╱________╲ Validate individual functions
```

**Distribution:**
- Level 1: 70% of tests (fast, isolated, abundant)
- Level 2: 25% of tests (moderate speed, integrated)
- Level 3: 5% of tests (slow, end-to-end, authoritative)

---

## Level 1: Component Tests (White Box)

### Definition

**Purpose:** Test individual parsing components in isolation
**Scope:** Single function/module with mocked dependencies
**Speed:** Fast (< 1ms per test)
**Count:** 50-100 tests per component

### Source of Truth

| Component | Authority | Reference |
|-----------|-----------|-----------|
| Clause Splitter | Linguistic theory | Huddleston & Pullum (2002), Cambridge Grammar |
| Entity Extractor | BFO ontology | BFO 2.0 specification |
| Role Detector | CCO ontology | CCO role taxonomy |
| Selectional Prefs | Lexical semantics | VerbNet, FrameNet |

### Components to Test

#### 1.1: Clause Segmentation (`ClauseSegmenter`)

**What It Does:** Splits sentences into clause boundaries

**Test Cases:**

```javascript
// Test: PREFIX_SUBORDINATOR_WITH_COMMA
{
  input: "If the server fails, the admin receives an alert.",
  expected: {
    clauses: [
      { text: "If the server fails", start: 0, end: 20, type: "subordinate" },
      { text: "the admin receives an alert", start: 22, end: 49, type: "main" }
    ],
    boundaries: [
      { position: 20, marker: "comma", reason: "subordinate-clause-terminator" }
    ]
  },
  sourceOfTruth: "Cambridge Grammar §8.3 - Subordinate clause boundaries"
}

// Test: INFIX_COORDINATOR_AND
{
  input: "The doctor examined the patient and the nurse administered medication.",
  expected: {
    clauses: [
      { text: "The doctor examined the patient", start: 0, end: 31, type: "coordinate" },
      { text: "the nurse administered medication", start: 36, end: 69, type: "coordinate" }
    ],
    boundaries: [
      { position: 32, marker: "and", reason: "coordinating-conjunction" }
    ]
  },
  sourceOfTruth: "Cambridge Grammar §15.2 - Coordination"
}

// Test: RELATIVE_CLAUSE_WHO
{
  input: "The engineer who designed the system left.",
  expected: {
    clauses: [
      { text: "The engineer left", start: 0, end: 42, type: "main",
        embeds: [
          { text: "who designed the system", start: 13, end: 36, type: "relative",
            antecedent: "The engineer" }
        ]
      }
    ]
  },
  sourceOfTruth: "Cambridge Grammar §12.1 - Relative clauses"
}
```

**Expected Failures (V7.0):**
- ❌ PREFIX_SUBORDINATOR_WITH_COMMA - Splitter doesn't detect "If..., " boundary
- ✅ INFIX_COORDINATOR_AND - Should pass (V7 supports this)
- ❌ RELATIVE_CLAUSE_WHO - No relative clause detection

**Diagnostic Value:** When these fail, we know the splitter needs enhancement, not the downstream components.

---

#### 1.2: Subordination Detection (`SubordinationDetector`)

**What It Does:** Classifies subordinate clause types

**Test Cases:**

```javascript
// Test: CONDITIONAL_IF
{
  input: "If the server fails",
  expected: {
    type: "subordinate",
    subtype: "conditional",
    marker: "if",
    semanticRelation: "condition",
    polarity: "positive"
  },
  sourceOfTruth: "Quirk et al. (1985) §15.33 - Conditional clauses"
}

// Test: TEMPORAL_WHEN
{
  input: "When the alarm sounded",
  expected: {
    type: "subordinate",
    subtype: "temporal",
    marker: "when",
    semanticRelation: "synchronous",
    polarity: "positive"
  },
  sourceOfTruth: "Quirk et al. (1985) §15.25 - Temporal clauses"
}

// Test: CAUSAL_BECAUSE
{
  input: "because the power failed",
  expected: {
    type: "subordinate",
    subtype: "causal",
    marker: "because",
    semanticRelation: "caused_by",
    polarity: "positive"
  },
  sourceOfTruth: "Quirk et al. (1985) §15.45 - Reason clauses"
}
```

**Expected Failures (V7.0):**
- ❌ All tests - V7 has no subordination detection module

**Diagnostic Value:** These failing tests define the requirements for V7-003 fix.

---

#### 1.3: Entity Extraction (`EntityExtractor`)

**What It Does:** Identifies noun phrases and their ontological types

**Test Cases:**

```javascript
// Test: DEFINITE_ARTIFACT
{
  input: "the server",
  context: "If the server fails",
  expected: {
    text: "the server",
    type: "cco:Artifact",
    definiteness: "definite",
    referentialStatus: "hypothetical",  // in conditional context
    number: "singular"
  },
  sourceOfTruth: "BFO 2.0 - Artifact classification + Definiteness theory (Heim 1982)"
}

// Test: DEFINITE_PERSON
{
  input: "the engineer",
  context: "The engineer who designed the system left",
  expected: {
    text: "the engineer",
    type: "cco:Person",
    definiteness: "definite",
    referentialStatus: "presupposed",  // definite = speaker assumes familiarity
    number: "singular"
  },
  sourceOfTruth: "CCO Person taxonomy + Definiteness theory"
}

// Test: RELATIVE_PRONOUN_WHO
{
  input: "who",
  context: "The engineer who designed the system",
  expected: {
    text: "who",
    type: "relative-pronoun",
    antecedent: "the engineer",
    referentialStatus: "anaphoric",
    personType: "animate"
  },
  sourceOfTruth: "Huddleston & Pullum §12.2 - Relative pronouns"
}
```

**Expected Failures (V7.0):**
- ✅ DEFINITE_ARTIFACT - Should pass
- ✅ DEFINITE_PERSON - Should pass
- ❌ RELATIVE_PRONOUN_WHO - Treats "who" as new entity, not anaphoric

**Diagnostic Value:** Isolates entity recognition from clause structure issues.

---

#### 1.4: Role Assignment (`RoleDetector`)

**What It Does:** Assigns semantic roles (agent, patient, etc.) to entities

**Test Cases:**

```javascript
// Test: INTRANSITIVE_VERB_FAIL
{
  input: {
    verb: "fail",
    verbClass: "intransitive",
    entities: [
      { text: "the server", type: "cco:Artifact" }
    ]
  },
  expected: {
    agent: "the server",
    patient: null,  // intransitive = no patient
    roleAssignments: [
      { entity: "the server", role: "cco:AgentRole" }
    ]
  },
  sourceOfTruth: "VerbNet class 'fail-45.6' (intransitive)"
}

// Test: TRANSITIVE_VERB_RECEIVE
{
  input: {
    verb: "receive",
    verbClass: "transitive",
    entities: [
      { text: "the admin", type: "cco:Person" },
      { text: "an alert", type: "cco:Artifact" }
    ]
  },
  expected: {
    agent: "the admin",
    patient: "an alert",
    roleAssignments: [
      { entity: "the admin", role: "cco:AgentRole" },
      { entity: "an alert", role: "cco:PatientRole" }
    ]
  },
  sourceOfTruth: "VerbNet class 'get-13.5.1' (transitive)"
}
```

**Expected Failures (V7.0):**
- ✅ Tests should pass IF entities are correctly scoped
- ❌ Will fail in practice because argument bleeding provides wrong entities

**Diagnostic Value:** Proves whether role assignment logic is sound, separate from clause segmentation.

---

#### 1.5: Argument Linking (`ArgumentLinker`)

**What It Does:** Links verb arguments while respecting clause boundaries

**Test Cases:**

```javascript
// Test: HARD_BOUNDARY_ENFORCEMENT
{
  input: {
    clauses: [
      {
        text: "If the server fails",
        entities: ["the server"],
        verb: "fail",
        boundary: "hard"
      },
      {
        text: "the admin receives an alert",
        entities: ["the admin", "an alert"],
        verb: "receive",
        boundary: "hard"
      }
    ]
  },
  expected: {
    clause0: {
      verb: "fail",
      linkedArguments: ["the server"],
      forbiddenArguments: ["the admin", "an alert"]  // from clause 1
    },
    clause1: {
      verb: "receive",
      linkedArguments: ["the admin", "an alert"],
      forbiddenArguments: ["the server"]  // from clause 0
    }
  },
  sourceOfTruth: "V7 Architecture - Hard Boundary Design Principle"
}
```

**Expected Failures (V7.0):**
- ❌ HARD_BOUNDARY_ENFORCEMENT - Boundaries not recognized for subordination
- ✅ Should pass for coordination (V7 already handles "X and Y")

**Diagnostic Value:** Isolates whether hard boundaries are being respected.

---

## Level 2: Integration Tests (Gray Box)

### Definition

**Purpose:** Test interaction between 2-3 components
**Scope:** Component integration with real (not mocked) dependencies
**Speed:** Moderate (10-50ms per test)
**Count:** 10-20 tests per feature

### Source of Truth

| Integration Point | Authority | Reference |
|-------------------|-----------|-----------|
| Clause → Entity | Scope theory | Barker & Shan (2014) - Scope and Binding |
| Entity → Role | CCO semantics | CCO role hierarchy |
| Role → Graph | BFO structure | BFO 2.0 ontology |

### Integration Points to Test

#### 2.1: Clause Segmentation → Entity Extraction

**What It Tests:** Entities are extracted within correct clause scope

**Test Cases:**

```javascript
// Test: SUBORDINATION_ENTITY_SCOPING
{
  input: "If the server fails, the admin receives an alert.",
  clauses: [  // From ClauseSegmenter
    { text: "If the server fails", type: "subordinate" },
    { text: "the admin receives an alert", type: "main" }
  ],
  expected: {
    clause0Entities: ["the server"],
    clause1Entities: ["the admin", "an alert"],
    crossClauseLeakage: []  // No entities should cross boundaries
  },
  sourceOfTruth: "Scope theory - entities bound within their clause"
}
```

**Expected Failures (V7.0):**
- ❌ SUBORDINATION_ENTITY_SCOPING - Clause boundaries not detected, all entities in one scope

**Diagnostic Value:** Confirms whether clause boundaries are propagating to entity extraction.

---

#### 2.2: Entity Extraction → Role Assignment

**What It Tests:** Roles are assigned based on verb-entity compatibility

**Test Cases:**

```javascript
// Test: SELECTIONAL_RESTRICTION_VIOLATION
{
  input: {
    verb: "design",
    verbSelectionalPrefs: {
      agent: "animate",  // VerbNet: design-26.4 requires animate agent
      patient: "artifact"
    },
    entities: [
      { text: "who", type: "relative-pronoun", animacy: "unknown" },
      { text: "the system", type: "cco:Artifact", animacy: "inanimate" }
    ]
  },
  expected: {
    roleAssignment: {
      agent: "who",  // Despite animacy unknown, should assign based on syntax
      patient: "the system"
    },
    violations: [
      {
        type: "selectional_mismatch",
        severity: "warning",
        reason: "Animacy of 'who' unresolved - needs anaphora resolution"
      }
    ]
  },
  sourceOfTruth: "VerbNet selectional restrictions + Pragmatic resolution"
}
```

**Expected Failures (V7.0):**
- ❌ Test passes but with wrong reason (treats "who" as separate animate entity, not unresolved anaphor)

**Diagnostic Value:** Distinguishes between selectional preference logic and anaphora resolution.

---

#### 2.3: Clause Relations → Graph Structure

**What It Tests:** Clause relations create proper graph links

**Test Cases:**

```javascript
// Test: CONDITIONAL_RELATION_CREATION
{
  input: {
    clauses: [
      { id: "clause0", type: "subordinate", subtype: "conditional",
        act: "inst:Fail_Act" },
      { id: "clause1", type: "main",
        act: "inst:Receive_Act" }
    ]
  },
  expected: {
    clauseRelations: [
      {
        "@type": "tagteam:ClauseRelation",
        "tagteam:relationType": "tagteam:conditional",
        "tagteam:antecedent": "inst:Fail_Act",
        "tagteam:consequent": "inst:Receive_Act",
        "rdfs:label": "IF(fail) THEN(receive)"
      }
    ]
  },
  sourceOfTruth: "Conditional semantics (Lewis 1973) + TagTeam ClauseRelation ontology"
}
```

**Expected Failures (V7.0):**
- ❌ CONDITIONAL_RELATION_CREATION - No ClauseRelation created (subordination not detected)

**Diagnostic Value:** Tests whether clause metadata flows into graph construction.

---

## Level 3: Acceptance Tests (Black Box)

### Definition

**Purpose:** Validate end-to-end correctness from SME perspective
**Scope:** Full pipeline from raw text to final graph
**Speed:** Slow (50-500ms per test)
**Count:** 2-5 tests per feature

### Source of Truth

**Primary Authority:** Subject Matter Expert (CCO/SME)
**Validation Method:** Expert reviews graph and confirms:
1. All entities are correctly identified
2. All acts are correctly extracted
3. All roles are correctly assigned
4. All relations are correctly represented
5. No false assertions exist

### Test Categories

#### 3.1: Subordination (P0 - Blocking)

**Test 1.2: Conditional (If-clause)**

```javascript
{
  id: "acceptance-subordination-if",
  input: "If the server fails, the admin receives an alert.",

  expertExpectation: {
    clauses: [
      {
        type: "subordinate-conditional",
        semantics: "IF(server fails) → condition → THEN(admin receives alert)"
      }
    ],
    entities: [
      { text: "the server", correctlyIdentified: true },
      { text: "the admin", correctlyIdentified: true },
      { text: "an alert", correctlyIdentified: true }
    ],
    acts: [
      { verb: "fail", agent: "server", patient: null,
        criticalAssertion: "Server fails (intransitive) - NOT 'server fails admin'" },
      { verb: "receive", agent: "admin", patient: "alert",
        criticalAssertion: "Admin receives alert" }
    ],
    relations: [
      { type: "conditional", from: "fail", to: "receive",
        criticalAssertion: "IF-THEN relationship must exist" }
    ]
  },

  currentStatus_V7: "FAIL",
  failureMode: "Argument bleeding + missing relation",
  failureDetails: {
    falseAssertion: "Server affects Admin (cco:affects)",
    missingLink: "No ClauseRelation between acts",
    impact: "Semantic corruption - false fact in knowledge graph"
  },

  sourceOfTruth: {
    validator: "CCO/SME Expert",
    validationDate: "2026-02-10",
    authority: "Domain semantics + Conditional logic"
  }
}
```

**Acceptance Criteria:**
- ✅ No false assertions (e.g., "server affects admin")
- ✅ All entities correctly typed
- ✅ All roles correctly assigned
- ✅ Conditional relation exists
- ✅ Graph can answer: "What happens if the server fails?" → "Admin receives alert"

---

**Test 1.3: Temporal (When-clause)**

```javascript
{
  id: "acceptance-subordination-when",
  input: "When the alarm sounded, the guards responded.",

  expertExpectation: {
    acts: [
      { verb: "sound", agent: "alarm", patient: null,
        criticalAssertion: "Alarm sounds (intransitive) - NOT 'alarm sounded guards'" },
      { verb: "respond", agent: "guards", patient: null,
        criticalAssertion: "Guards respond" }
    ],
    relations: [
      { type: "temporal", from: "sound", to: "respond",
        semantics: "WHEN(alarm sounds) → immediately_before → (guards respond)" }
    ]
  },

  currentStatus_V7: "FAIL",
  failureMode: "Argument bleeding (confirmed by expert Test 1.1.7)",

  sourceOfTruth: {
    validator: "CCO/SME Expert",
    authority: "Temporal semantics"
  }
}
```

---

#### 3.2: Relative Clauses (P1 - Critical)

**Test 2.1: Subject Relative (Who-clause)**

```javascript
{
  id: "acceptance-relative-who",
  input: "The engineer who designed the system left.",

  expertExpectation: {
    entities: [
      { text: "the engineer", correctlyIdentified: true,
        criticalAssertion: "Engineer is subject of BOTH 'designed' and 'left'" },
      { text: "who", referenceType: "anaphoric", antecedent: "the engineer",
        criticalAssertion: "'who' = the engineer (NOT separate entity)" },
      { text: "the system", correctlyIdentified: true }
    ],
    acts: [
      { verb: "design", agent: "engineer", patient: "system",
        criticalAssertion: "Engineer designed system (NOT 'who' as separate person)" },
      { verb: "leave", agent: "engineer", patient: null,
        criticalAssertion: "Engineer left (NOT 'system left')" }
    ],
    structure: {
      mainClause: { subject: "engineer", verb: "left" },
      relativeClause: { relativizes: "engineer", verb: "designed", object: "system" }
    }
  },

  currentStatus_V7: "FAIL",
  failureMode: "Subject bleeding + entity fragmentation",
  failureDetails: {
    falseEntity: "'who' instantiated as separate Person_Who",
    falseAssertion: "System left (cco:has_agent = system) - should be engineer",
    orphanedEntity: "Engineer has no role in any act"
  },

  sourceOfTruth: {
    validator: "CCO/SME Expert",
    validationDate: "2026-02-10",
    authority: "Relative clause semantics + Anaphora theory"
  }
}
```

**Acceptance Criteria:**
- ✅ "Engineer" is subject of both "designed" and "left"
- ✅ "Who" resolved as anaphoric reference (not new entity)
- ✅ No false assertion like "system left"
- ✅ Graph can answer: "Who left?" → "The engineer"
- ✅ Graph can answer: "Who designed the system?" → "The engineer"

---

## Test Implementation Plan

### Phase 1: Level 1 Component Tests (Week 1-2)

**Goal:** Build 50-100 component tests for critical path

**Priority 1: Clause Segmentation (5 days)**
- Implement tests for subordinate detection (If/When/While/Because)
- Implement tests for coordinate detection (and/but/or)
- Implement tests for relative clause detection (who/which/that)
- **Expected Result:** 40+ tests, 50% will FAIL on V7 (that's good - shows gaps)

**Priority 2: Entity Extraction (3 days)**
- Implement tests for definite/indefinite detection
- Implement tests for entity type classification (Person/Artifact/etc.)
- Implement tests for anaphora detection (pronouns, relative pronouns)
- **Expected Result:** 30+ tests, 20% will FAIL on V7 (anaphora issues)

**Priority 3: Role Assignment (2 days)**
- Implement tests for agent/patient assignment
- Implement tests for selectional preference violations
- **Expected Result:** 20+ tests, 80% will PASS (role logic is sound, just gets wrong inputs)

**Deliverable:** Component test suite with clear failure attribution

---

### Phase 2: Level 2 Integration Tests (Week 3)

**Goal:** Build 20-30 integration tests

**Priority 1: Clause → Entity Scoping (3 days)**
- Test that entities respect clause boundaries
- Test that hard boundaries prevent argument leakage
- **Expected Result:** 10+ tests, 60% will FAIL on V7 (subordination not detected)

**Priority 2: Entity → Role → Graph (2 days)**
- Test that roles flow correctly into graph structure
- Test that ClauseRelations are created from clause metadata
- **Expected Result:** 10+ tests, 40% will FAIL on V7 (missing relations)

**Deliverable:** Integration test suite showing component interaction failures

---

### Phase 3: Level 3 Acceptance Tests (Week 4)

**Goal:** SME-validate 10-15 end-to-end scenarios

**Priority 1: Subordination Acceptance (2 days)**
- Expert validates 5 subordination tests (If/When/While/Because/Although)
- Document expected vs. actual with visual diagrams
- **Expected Result:** All will FAIL on V7 (confirms P0 blocking)

**Priority 2: Relative Clause Acceptance (2 days)**
- Expert validates 5 relative clause tests (who/which/that)
- Document false assertions and missing links
- **Expected Result:** All will FAIL on V7 (confirms P1 critical)

**Priority 3: Baseline Success Cases (1 day)**
- Expert validates 5 simple coordination tests ("X and Y")
- Confirm what DOES work in V7
- **Expected Result:** 80%+ will PASS (establishes baseline)

**Deliverable:** Expert-validated acceptance test suite with clear pass/fail criteria

---

## Failure Attribution Workflow

### Example: Test 1.2 Fails

**Level 3 (Acceptance):** FAIL
- Symptom: "Server affects admin" (false assertion)
- Attribution: Drill down to Level 2

**Level 2 (Integration):** Clause → Entity Scoping
- Test: "Are entities scoped to correct clause?"
- Result: FAIL - All entities in single scope
- Attribution: Drill down to Level 1

**Level 1 (Component):** Clause Segmentation
- Test: "Does splitter detect 'If..., ' boundary?"
- Result: FAIL - Returns single clause
- **Root Cause Identified:** ClauseSegmenter doesn't recognize prefix subordinators

**Fix Path:**
1. Enhance ClauseSegmenter to detect subordinate markers
2. Re-run Level 1 test → should PASS
3. Re-run Level 2 test → should PASS (entities now scoped correctly)
4. Re-run Level 3 test → should PASS (no more argument bleeding)

---

## Success Metrics

### Level 1 (Component Tests)

**Current State:**
- Tests implemented: 0
- Tests passing: N/A
- Coverage: 0%

**Target State (End of Phase 1):**
- Tests implemented: 90+
- Tests passing: 50-70% (30-50% expected failures is GOOD)
- Coverage: 80% of critical components

**Acceptance Criteria:**
- Every component has 10+ tests
- Every known failure mode has a test
- Failures point to specific functions needing fixes

---

### Level 2 (Integration Tests)

**Current State:**
- Tests implemented: 0
- Tests passing: N/A
- Integration points covered: 0

**Target State (End of Phase 2):**
- Tests implemented: 25+
- Tests passing: 60-80% (some failures expected at integration boundaries)
- Integration points covered: 5+ critical paths

**Acceptance Criteria:**
- Every component pair has 3+ integration tests
- Failures show which components don't communicate correctly
- Data flow through pipeline is validated

---

### Level 3 (Acceptance Tests)

**Current State:**
- Tests implemented: 2 (expert validation)
- Tests passing: 0% (0/2)
- SME validation: Complete for 2 tests

**Target State (End of Phase 3):**
- Tests implemented: 15+
- Tests passing: 60%+ (some features may not be V7-ready)
- SME validation: Complete for all tests

**Acceptance Criteria:**
- Every P0 feature has 2+ acceptance tests
- Expert has validated expected output for all tests
- Failures represent known limitations (not surprises)

---

## Deliverables

### Week 1-2: Component Test Suite
```
tests/
  unit/
    clause-segmentation.test.js        (40 tests)
    entity-extraction.test.js          (30 tests)
    role-assignment.test.js            (20 tests)
    README.md                          (Documents sources of truth)
```

### Week 3: Integration Test Suite
```
tests/
  integration/
    clause-to-entity.test.js           (10 tests)
    entity-to-role.test.js             (8 tests)
    role-to-graph.test.js              (7 tests)
    README.md                          (Documents integration points)
```

### Week 4: Acceptance Test Suite
```
tests/
  acceptance/
    subordination.test.js              (5 tests - SME validated)
    relative-clauses.test.js           (5 tests - SME validated)
    coordination.test.js               (5 tests - baseline)
    README.md                          (Documents expert validation)
    expert-validation-report.html      (Visual summary)
```

---

## Ground Truth Registry

For each test, document:

```json
{
  "testId": "L1-clause-seg-001",
  "level": 1,
  "component": "ClauseSegmenter",
  "input": "If the server fails, the admin receives an alert.",
  "expected": "...",
  "sourceOfTruth": {
    "authority": "Cambridge Grammar of the English Language",
    "chapter": "§8.3 Subordinate clauses",
    "page": 234,
    "rule": "Comma after initial adverbial clause marks boundary",
    "alternativeAuthority": "Quirk et al. (1985) §15.33"
  },
  "validatedBy": "Dr. Linguistic Expert",
  "validationDate": "2026-02-10",
  "confidence": "high"
}
```

**Sources of Truth Repository:**
- `docs/sources-of-truth/linguistic-theory.md` - Grammar references
- `docs/sources-of-truth/bfo-ontology.md` - BFO classifications
- `docs/sources-of-truth/cco-ontology.md` - CCO role taxonomy
- `docs/sources-of-truth/expert-validations.md` - SME decisions

---

## Next Actions

### Immediate (This Week)

1. **Review this roadmap with expert** (30 min call)
   - Confirm acceptance test expectations
   - Get expert to validate 3-5 baseline tests (what DOES work in V7)

2. **Create component test infrastructure** (2 days)
   - Set up test framework (Jest/Mocha)
   - Create test templates with source-of-truth fields
   - Write first 10 component tests

3. **Run component tests against V7** (1 day)
   - Document failure rate
   - Identify top 3 failing components
   - Create failure attribution report

### Short-term (Weeks 2-3)

1. **Complete Level 1 component tests** (90+ tests)
2. **Implement Level 2 integration tests** (25+ tests)
3. **Fix highest-priority failures** (subordination)
4. **Re-run test pyramid** → measure improvement

### Medium-term (Week 4)

1. **SME validates acceptance tests** (15+ scenarios)
2. **Document V7 capabilities and limitations**
3. **Define V7 final scope** (what's in vs. deferred to V8)
4. **Create V7 release criteria** (must pass X% at each level)

---

## Conclusion

**Current Reality:**
- 556 "tests" that don't test anything
- 2 real tests that both fail
- No way to diagnose failures

**After This Roadmap:**
- 130+ real tests across 3 levels
- Clear failure attribution at each level
- Tests that fail INFORMATIVELY (show us what to fix)
- SME-validated ground truth
- Confidence that passing tests mean actual correctness

**Key Insight:** A test suite where 30-50% of tests fail IS SUCCESS if those failures:
1. Are expected (not surprises)
2. Point to specific root causes
3. Define the path forward
4. Prevent regressions when fixed

**Tests that fail diagnostically are more valuable than tests that pass meaninglessly.**

---

**Questions to Resolve:**

1. Which linguistic theory references should we use as authoritative?
2. How much time can expert dedicate to validating Level 3 tests?
3. Should we build component tests in parallel with fixes, or tests-first?
4. What's the minimum % pass rate for V7 release at each level?

**Next Step:** Review with expert and get sign-off on acceptance test expectations.
