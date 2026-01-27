# Phase 6.0 Implementation Plan: Selectional Preferences

**Version:** 1.0
**Created:** 2026-01-26
**Status:** Planning
**Priority:** Critical
**Effort:** Low

---

## Overview

### What Are Selectional Preferences?

Selectional preferences (also called selectional restrictions) define semantic constraints on verb arguments. They specify what types of entities can fill particular roles for a given verb class.

**Example:**
- "The doctor decided to operate" → Valid (animate agent + intentional verb)
- "The rock decided to move" → Invalid (inanimate agent + intentional verb)
- "The committee decided to proceed" → Valid (organization agent + intentional verb)

### Why Phase 6.0 First?

Phase 5 exposed a gap: `AmbiguityDetector` flags selectional violations but uses inline heuristics. Phase 6.0 creates a centralized, extensible lookup system that:

1. **Fixes false positives** - "ventilator" flagged as anomalous agent (it's a tool, not making decisions)
2. **Enables organizations as agents** - "The committee decided" is valid
3. **Provides foundation** for plausibility scoring in Phase 6.1+
4. **Separates data from logic** - Verb classes in config, not hardcoded

---

## Current State Analysis

### Existing Code (Phase 5)

**AmbiguityDetector.js:150-180** (approximate):
```javascript
_isIntentionalAct(verb) {
  const intentionalVerbs = [
    'decide', 'believe', 'think', 'want', 'intend', 'plan',
    'hope', 'fear', 'expect', 'assume', 'conclude'
  ];
  return intentionalVerbs.includes(verb.toLowerCase());
}

_isAnimateEntity(entity) {
  // Crude check - needs improvement
  const animateTypes = ['cco:Person', 'cco:Organization'];
  return animateTypes.some(t => entity.type?.includes(t));
}
```

**Problems:**
1. Hardcoded verb list
2. Binary animate/inanimate check
3. No verb class taxonomy
4. No object constraints (only subject)
5. Organization handling is ad-hoc

### What We Need

A structured system that answers:
- Given verb V and subject S, is S a valid agent?
- Given verb V and object O, is O a valid patient/theme?
- What's the confidence level of this judgment?

---

## Architecture Design

### Data Model

```javascript
// SelectionalPreferences.js

const VERB_CLASSES = {
  intentional_mental: {
    verbs: ['decide', 'believe', 'think', 'want', 'intend', 'plan', 'hope',
            'fear', 'expect', 'assume', 'conclude', 'consider', 'prefer'],
    subjectRequirement: {
      allowed: ['animate', 'organization', 'collective'],
      forbidden: ['inanimate', 'abstract']
    },
    objectRequirement: {
      allowed: ['any'],  // "decide X", "believe Y" - no strong constraint
      forbidden: []
    }
  },

  intentional_physical: {
    verbs: ['lift', 'throw', 'carry', 'push', 'pull', 'grab', 'hold'],
    subjectRequirement: {
      allowed: ['animate'],
      forbidden: ['inanimate', 'abstract', 'organization']
    },
    objectRequirement: {
      allowed: ['material_entity'],
      forbidden: ['abstract']
    }
  },

  communication: {
    verbs: ['announce', 'report', 'claim', 'state', 'declare', 'say',
            'tell', 'inform', 'notify', 'assert'],
    subjectRequirement: {
      allowed: ['animate', 'organization', 'collective'],
      forbidden: ['inanimate']
    },
    objectRequirement: {
      allowed: ['proposition', 'information', 'any'],
      forbidden: []
    }
  },

  transfer: {
    verbs: ['give', 'allocate', 'assign', 'distribute', 'provide', 'deliver'],
    subjectRequirement: {
      allowed: ['animate', 'organization'],
      forbidden: ['inanimate', 'abstract']
    },
    objectRequirement: {
      allowed: ['material_entity', 'information', 'resource'],
      forbidden: []
    }
  },

  causation: {
    verbs: ['cause', 'create', 'produce', 'generate', 'make'],
    subjectRequirement: {
      allowed: ['any'],  // Even inanimate can cause
      forbidden: []
    },
    objectRequirement: {
      allowed: ['any'],
      forbidden: []
    }
  }
};

const ENTITY_CATEGORIES = {
  animate: {
    types: ['cco:Person', 'cco:Organism'],
    keywords: ['person', 'patient', 'doctor', 'nurse', 'family', 'human']
  },
  organization: {
    types: ['cco:Organization', 'cco:GroupOfPersons'],
    keywords: ['committee', 'board', 'council', 'commission', 'panel',
               'team', 'hospital', 'institution', 'company', 'government']
  },
  collective: {
    types: ['cco:GroupOfPersons'],
    keywords: ['family', 'group', 'staff', 'crew', 'public']
  },
  inanimate: {
    types: ['bfo:MaterialEntity'],
    keywords: ['rock', 'table', 'machine', 'ventilator', 'equipment', 'device'],
    excludeIfAlso: ['animate', 'organization']  // MaterialEntity is too broad
  },
  abstract: {
    types: ['bfo:GenericallyDependentContinuant', 'bfo:Quality'],
    keywords: ['idea', 'concept', 'policy', 'rule', 'law']
  },
  material_entity: {
    types: ['bfo:MaterialEntity', 'cco:Artifact'],
    keywords: ['organ', 'medication', 'equipment', 'resource', 'supply']
  }
};
```

### Class Interface

```javascript
class SelectionalPreferences {
  constructor(options = {}) {
    this.verbClasses = options.verbClasses || VERB_CLASSES;
    this.entityCategories = options.entityCategories || ENTITY_CATEGORIES;
    this.customOverrides = options.customOverrides || {};
  }

  /**
   * Check if entity can be subject of verb
   * @param {string} verb - The verb lemma
   * @param {Object} entity - Entity with type and/or label
   * @returns {Object} { valid: boolean, confidence: number, reason: string }
   */
  checkSubject(verb, entity) { }

  /**
   * Check if entity can be object of verb
   * @param {string} verb - The verb lemma
   * @param {Object} entity - Entity with type and/or label
   * @returns {Object} { valid: boolean, confidence: number, reason: string }
   */
  checkObject(verb, entity) { }

  /**
   * Get verb class for a given verb
   * @param {string} verb - The verb lemma
   * @returns {string|null} Verb class name or null
   */
  getVerbClass(verb) { }

  /**
   * Get entity category for a given entity
   * @param {Object} entity - Entity with type and/or label
   * @returns {string[]} Array of matching categories
   */
  getEntityCategories(entity) { }

  /**
   * Add custom verb to existing class
   * @param {string} verbClass - Class name
   * @param {string} verb - Verb to add
   */
  addVerb(verbClass, verb) { }

  /**
   * Add custom entity keyword to category
   * @param {string} category - Category name
   * @param {string} keyword - Keyword to add
   */
  addEntityKeyword(category, keyword) { }
}
```

---

## Test-Driven Development Plan

### Test File Structure

```
tests/
├── unit/
│   └── phase6/
│       ├── selectional-preferences.test.js    # Core unit tests
│       └── selectional-integration.test.js    # Integration with AmbiguityDetector
└── golden/
    └── selectional-corpus.json                # Golden test cases
```

### Test Categories

#### Category 1: Verb Class Lookup (10 tests)

| Test ID | Input | Expected Output | Priority |
|---------|-------|-----------------|----------|
| VC-001 | `getVerbClass('decide')` | `'intentional_mental'` | P0 |
| VC-002 | `getVerbClass('lift')` | `'intentional_physical'` | P0 |
| VC-003 | `getVerbClass('announce')` | `'communication'` | P0 |
| VC-004 | `getVerbClass('give')` | `'transfer'` | P0 |
| VC-005 | `getVerbClass('cause')` | `'causation'` | P0 |
| VC-006 | `getVerbClass('walk')` | `null` (no class) | P1 |
| VC-007 | `getVerbClass('DECIDE')` | `'intentional_mental'` (case insensitive) | P1 |
| VC-008 | `getVerbClass('')` | `null` | P2 |
| VC-009 | `getVerbClass(null)` | `null` | P2 |
| VC-010 | `getVerbClass('believes')` | `'intentional_mental'` (lemma expected) | P1 |

#### Category 2: Entity Categorization (15 tests)

| Test ID | Input Entity | Expected Categories | Priority |
|---------|--------------|---------------------|----------|
| EC-001 | `{ type: 'cco:Person' }` | `['animate']` | P0 |
| EC-002 | `{ type: 'cco:Organization' }` | `['organization']` | P0 |
| EC-003 | `{ label: 'committee' }` | `['organization', 'collective']` | P0 |
| EC-004 | `{ label: 'rock' }` | `['inanimate']` | P0 |
| EC-005 | `{ label: 'patient' }` | `['animate']` | P0 |
| EC-006 | `{ type: 'bfo:MaterialEntity', label: 'ventilator' }` | `['inanimate', 'material_entity']` | P0 |
| EC-007 | `{ type: 'cco:Person', label: 'doctor' }` | `['animate']` | P1 |
| EC-008 | `{ label: 'family' }` | `['animate', 'collective']` | P1 |
| EC-009 | `{ type: 'bfo:Quality' }` | `['abstract']` | P1 |
| EC-010 | `{ label: 'hospital' }` | `['organization']` | P1 |
| EC-011 | `{ }` | `['unknown']` | P2 |
| EC-012 | `{ type: 'cco:GroupOfPersons' }` | `['organization', 'collective']` | P1 |
| EC-013 | `{ label: 'The White House' }` | `['organization']` (metonymy) | P1 |
| EC-014 | `{ label: 'surgeon' }` | `['animate']` | P1 |
| EC-015 | `{ label: 'board of directors' }` | `['organization', 'collective']` | P1 |

#### Category 3: Subject Validation (20 tests)

| Test ID | Verb | Subject | Expected | Priority |
|---------|------|---------|----------|----------|
| SV-001 | `'decide'` | `{ type: 'cco:Person' }` | `{ valid: true, confidence: 0.95 }` | P0 |
| SV-002 | `'decide'` | `{ label: 'rock' }` | `{ valid: false, confidence: 0.9 }` | P0 |
| SV-003 | `'decide'` | `{ label: 'committee' }` | `{ valid: true, confidence: 0.9 }` | P0 |
| SV-004 | `'lift'` | `{ type: 'cco:Person' }` | `{ valid: true, confidence: 0.95 }` | P0 |
| SV-005 | `'lift'` | `{ label: 'committee' }` | `{ valid: false, confidence: 0.85 }` | P0 |
| SV-006 | `'announce'` | `{ label: 'hospital' }` | `{ valid: true, confidence: 0.9 }` | P0 |
| SV-007 | `'announce'` | `{ label: 'ventilator' }` | `{ valid: false, confidence: 0.9 }` | P0 |
| SV-008 | `'cause'` | `{ label: 'storm' }` | `{ valid: true, confidence: 0.8 }` | P1 |
| SV-009 | `'give'` | `{ type: 'cco:Person' }` | `{ valid: true, confidence: 0.95 }` | P0 |
| SV-010 | `'give'` | `{ label: 'machine' }` | `{ valid: false, confidence: 0.85 }` | P1 |
| SV-011 | `'believe'` | `{ label: 'family' }` | `{ valid: true, confidence: 0.85 }` | P1 |
| SV-012 | `'think'` | `{ label: 'patient' }` | `{ valid: true, confidence: 0.95 }` | P1 |
| SV-013 | `'think'` | `{ label: 'policy' }` | `{ valid: false, confidence: 0.8 }` | P1 |
| SV-014 | `'walk'` | `{ type: 'cco:Person' }` | `{ valid: true, confidence: 0.5 }` (unknown verb) | P1 |
| SV-015 | `'decide'` | `{ label: 'The White House' }` | `{ valid: true, confidence: 0.8 }` | P1 |
| SV-016 | `'report'` | `{ label: 'nurse' }` | `{ valid: true, confidence: 0.95 }` | P1 |
| SV-017 | `'report'` | `{ label: 'document' }` | `{ valid: false, confidence: 0.7 }` | P2 |
| SV-018 | `'allocate'` | `{ label: 'board' }` | `{ valid: true, confidence: 0.9 }` | P1 |
| SV-019 | `'prefer'` | `{ type: 'cco:Person' }` | `{ valid: true, confidence: 0.95 }` | P1 |
| SV-020 | `'prefer'` | `{ label: 'table' }` | `{ valid: false, confidence: 0.9 }` | P1 |

#### Category 4: Object Validation (10 tests)

| Test ID | Verb | Object | Expected | Priority |
|---------|------|--------|----------|----------|
| OV-001 | `'lift'` | `{ label: 'box' }` | `{ valid: true, confidence: 0.9 }` | P0 |
| OV-002 | `'lift'` | `{ label: 'idea' }` | `{ valid: false, confidence: 0.85 }` | P0 |
| OV-003 | `'give'` | `{ label: 'medication' }` | `{ valid: true, confidence: 0.95 }` | P0 |
| OV-004 | `'announce'` | `{ label: 'decision' }` | `{ valid: true, confidence: 0.9 }` | P1 |
| OV-005 | `'decide'` | `{ label: 'anything' }` | `{ valid: true, confidence: 0.7 }` | P1 |
| OV-006 | `'allocate'` | `{ label: 'organ' }` | `{ valid: true, confidence: 0.95 }` | P0 |
| OV-007 | `'allocate'` | `{ label: 'resources' }` | `{ valid: true, confidence: 0.9 }` | P1 |
| OV-008 | `'throw'` | `{ type: 'bfo:MaterialEntity' }` | `{ valid: true, confidence: 0.9 }` | P1 |
| OV-009 | `'throw'` | `{ label: 'concept' }` | `{ valid: false, confidence: 0.8 }` | P2 |
| OV-010 | `'provide'` | `{ label: 'care' }` | `{ valid: true, confidence: 0.9 }` | P0 |

#### Category 5: Integration with AmbiguityDetector (10 tests)

| Test ID | Sentence | Expected Flag | Priority |
|---------|----------|---------------|----------|
| INT-001 | "The doctor decided to operate" | No violation | P0 |
| INT-002 | "The rock decided to move" | `selectional_violation` | P0 |
| INT-003 | "The committee decided to proceed" | No violation | P0 |
| INT-004 | "The ventilator decided to stop" | `selectional_violation` | P0 |
| INT-005 | "The hospital announced the policy" | No violation | P0 |
| INT-006 | "The table announced the results" | `selectional_violation` | P0 |
| INT-007 | "The family believes in recovery" | No violation | P1 |
| INT-008 | "The board allocated the resources" | No violation | P1 |
| INT-009 | "The White House announced sanctions" | No violation (metonymy) | P1 |
| INT-010 | "The storm caused damage" | No violation (causation allows inanimate) | P1 |

#### Category 6: Edge Cases (5 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| EDGE-001 | Unknown verb, known entity | `{ valid: true, confidence: 0.5 }` (default permissive) | P1 |
| EDGE-002 | Known verb, unknown entity | `{ valid: true, confidence: 0.5 }` (default permissive) | P1 |
| EDGE-003 | Empty verb | `{ valid: true, confidence: 0.0 }` | P2 |
| EDGE-004 | Empty entity | `{ valid: true, confidence: 0.0 }` | P2 |
| EDGE-005 | Custom override: add "robot" as animate | Respected | P2 |

---

## Acceptance Criteria

### Functional Criteria

- [ ] **AC-001:** `getVerbClass()` returns correct class for all 50+ verbs in taxonomy
- [ ] **AC-002:** `getEntityCategories()` correctly categorizes entities by type and label
- [ ] **AC-003:** `checkSubject()` returns `{ valid, confidence, reason }` for all verb-subject pairs
- [ ] **AC-004:** `checkObject()` returns `{ valid, confidence, reason }` for all verb-object pairs
- [ ] **AC-005:** Organizations (committee, board, hospital) accepted as valid agents for intentional_mental verbs
- [ ] **AC-006:** Inanimate objects (rock, table, ventilator) rejected as agents for intentional verbs
- [ ] **AC-007:** Causation verbs accept any subject type (storms can cause things)

### Integration Criteria

- [ ] **AC-008:** `AmbiguityDetector` uses `SelectionalPreferences` instead of inline heuristics
- [ ] **AC-009:** No regression in existing ambiguity detection tests (71 tests)
- [ ] **AC-010:** `selectional_violation` flag only appears for genuine violations (no false positives)

### Quality Criteria

- [ ] **AC-011:** All P0 tests pass (35 tests)
- [ ] **AC-012:** All P1 tests pass (25 tests)
- [ ] **AC-013:** 90%+ P2 tests pass (10 tests)
- [ ] **AC-014:** Test coverage > 90% for SelectionalPreferences.js
- [ ] **AC-015:** Bundle size increase < 15KB

### Documentation Criteria

- [ ] **AC-016:** JSDoc comments on all public methods
- [ ] **AC-017:** README section explaining verb classes and entity categories
- [ ] **AC-018:** Example usage in code comments

---

## Implementation Steps

### Step 1: Create Test File (TDD)

```bash
# Create test file first
tests/unit/phase6/selectional-preferences.test.js
```

Write all P0 tests as failing tests.

### Step 2: Implement Core Class

```bash
# Create implementation
src/graph/SelectionalPreferences.js
```

1. Define `VERB_CLASSES` constant
2. Define `ENTITY_CATEGORIES` constant
3. Implement `getVerbClass()`
4. Implement `getEntityCategories()`
5. Implement `checkSubject()`
6. Implement `checkObject()`

### Step 3: Run P0 Tests

All 35 P0 tests should pass.

### Step 4: Add P1 Tests & Refinements

Add edge cases and additional verb/entity coverage.

### Step 5: Integration

1. Modify `AmbiguityDetector.js` to use `SelectionalPreferences`
2. Run existing 71 ambiguity tests
3. Verify no regressions

### Step 6: Documentation

1. Add JSDoc
2. Update ROADMAP.md status

---

## Golden Test Corpus

**File:** `tests/golden/selectional-corpus.json`

```json
{
  "version": "1.0",
  "description": "Golden test cases for selectional preference validation",
  "cases": [
    {
      "id": "golden-001",
      "sentence": "The doctor decided to operate",
      "verb": "decide",
      "subject": { "label": "doctor", "type": "cco:Person" },
      "expectedSubjectValid": true,
      "expectedConfidence": 0.95,
      "tags": ["intentional_mental", "animate_subject", "medical"]
    },
    {
      "id": "golden-002",
      "sentence": "The rock decided to move",
      "verb": "decide",
      "subject": { "label": "rock" },
      "expectedSubjectValid": false,
      "expectedConfidence": 0.9,
      "expectedViolationType": "selectional_violation",
      "tags": ["intentional_mental", "inanimate_subject", "anomalous"]
    },
    {
      "id": "golden-003",
      "sentence": "The committee decided to proceed",
      "verb": "decide",
      "subject": { "label": "committee", "type": "cco:Organization" },
      "expectedSubjectValid": true,
      "expectedConfidence": 0.9,
      "tags": ["intentional_mental", "organization_subject"]
    },
    {
      "id": "golden-004",
      "sentence": "The hospital announced the policy",
      "verb": "announce",
      "subject": { "label": "hospital" },
      "expectedSubjectValid": true,
      "expectedConfidence": 0.9,
      "tags": ["communication", "organization_subject", "metonymy"]
    },
    {
      "id": "golden-005",
      "sentence": "The storm caused significant damage",
      "verb": "cause",
      "subject": { "label": "storm" },
      "expectedSubjectValid": true,
      "expectedConfidence": 0.8,
      "tags": ["causation", "inanimate_subject", "natural_force"]
    }
  ]
}
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Verb coverage incomplete | Medium | Low | Start with IEE corpus verbs, expand iteratively |
| Entity categorization ambiguous | Medium | Medium | Default to permissive (valid: true, low confidence) |
| Integration breaks existing tests | Low | High | Run full test suite before/after integration |
| Performance impact | Low | Low | Lookup tables are O(1), minimal overhead |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| P0 Test Pass Rate | 100% | 35/35 tests |
| P1 Test Pass Rate | 100% | 25/25 tests |
| P2 Test Pass Rate | 90%+ | 9+/10 tests |
| Regression Tests | 0 failures | 71/71 existing tests |
| Bundle Size | < +15KB | Measure before/after |
| False Positive Rate | < 5% | Manual review of flagged violations |

---

## Timeline

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Write P0 tests | `selectional-preferences.test.js` with 35 failing tests |
| 1 | Implement core class | `SelectionalPreferences.js` passing P0 tests |
| 2 | Add P1 tests | 25 additional tests |
| 2 | Refine implementation | All P1 tests passing |
| 3 | Integration | Modify `AmbiguityDetector.js` |
| 3 | Regression testing | Verify 71 existing tests pass |
| 3 | Documentation | JSDoc, ROADMAP update |

---

## Appendix: Verb Class Taxonomy

### intentional_mental (13 verbs)
`decide, believe, think, want, intend, plan, hope, fear, expect, assume, conclude, consider, prefer`

### intentional_physical (7 verbs)
`lift, throw, carry, push, pull, grab, hold`

### communication (10 verbs)
`announce, report, claim, state, declare, say, tell, inform, notify, assert`

### transfer (6 verbs)
`give, allocate, assign, distribute, provide, deliver`

### causation (5 verbs)
`cause, create, produce, generate, make`

**Total: 41 verbs in initial taxonomy**

---

## Sign-Off

- [ ] Plan reviewed
- [ ] Acceptance criteria agreed
- [ ] Test strategy approved
- [ ] Ready to implement

---

*Phase 6.0 Implementation Plan - SelectionalPreferences*
