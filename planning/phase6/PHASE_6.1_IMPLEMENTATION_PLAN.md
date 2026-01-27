# Phase 6.1 Implementation Plan: Ambiguity Resolver

**Version:** 1.0
**Created:** 2026-01-26
**Status:** Planning
**Priority:** High
**Effort:** Medium

---

## Overview

### What is the AmbiguityResolver?

The AmbiguityResolver takes ambiguities detected by Phase 5's `AmbiguityDetector` and decides which ones should be preserved as multiple readings vs. resolved to a single default reading.

**Key Insight:** Not all ambiguities are worth preserving. The resolver applies configurable rules to determine:
1. Which ambiguities create semantically meaningful alternatives
2. Which are anomalies to flag but not fork
3. What confidence threshold triggers preservation

### Why Phase 6.1?

Phase 5 **detects** ambiguities. Phase 6.0 provides **validation** via SelectionalPreferences. Phase 6.1 **decides** what to do with detected ambiguities:

```
Phase 5 Output:          Phase 6.1 Decision:        Phase 6.2+ Action:
┌─────────────────┐      ┌───────────────────┐      ┌─────────────────┐
│ AmbiguityReport │  →   │ AmbiguityResolver │  →   │ Preserve OR     │
│ - modal_force   │      │ - preserve?       │      │ Resolve         │
│ - scope         │      │ - threshold check │      │ to Lattice      │
│ - selectional   │      │ - rule match      │      └─────────────────┘
└─────────────────┘      └───────────────────┘
```

---

## Architecture Design

### Resolution Rules

| Ambiguity Type | Default Strategy | Preserve When | Never Preserve |
|----------------|------------------|---------------|----------------|
| `selectional_violation` | Flag only | Never | Always (anomalous) |
| `modal_force` | Preserve | confidence < 0.8 | confidence ≥ 0.8 |
| `noun_category` | Context-based | "of" complement present | Agent of intentional act |
| `scope` | Preserve | Always (significant) | - |
| `potential_metonymy` | Flag only | Never | Always (just annotate) |
| `verb_sense` | Resolve | confidence < 0.6 | confidence ≥ 0.6 |

### Class Interface

```javascript
class AmbiguityResolver {
  constructor(config = {}) {
    this.config = {
      preserveThreshold: 0.7,      // Below this confidence, preserve both readings
      maxReadingsPerNode: 3,       // Cap on alternative readings per node
      maxTotalAlternatives: 10,    // Cap on total alternatives in output
      rules: { ... }               // Per-type resolution rules
    };
  }

  /**
   * Resolve ambiguities from AmbiguityReport
   * @param {AmbiguityReport} report - From AmbiguityDetector
   * @param {Object} context - Additional context (graph, entities, acts)
   * @returns {ResolutionResult}
   */
  resolve(report, context = {}) { }

  /**
   * Check if a specific ambiguity should be preserved
   * @param {Object} ambiguity - Single ambiguity from report
   * @param {Object} context - Additional context
   * @returns {Object} { preserve: boolean, reason: string, defaultReading: string }
   */
  shouldPreserve(ambiguity, context = {}) { }

  /**
   * Get resolution rule for ambiguity type
   * @param {string} type - Ambiguity type
   * @returns {Object} Resolution rule
   */
  getRule(type) { }

  /**
   * Add or override a resolution rule
   * @param {string} type - Ambiguity type
   * @param {Object} rule - Resolution rule
   */
  setRule(type, rule) { }
}
```

### ResolutionResult Structure

```javascript
{
  // Ambiguities to preserve (create alternative readings)
  preserved: [
    {
      ambiguity: { type: 'modal_force', ... },
      readings: ['obligation', 'expectation'],
      defaultReading: 'obligation',
      reason: 'Confidence 0.65 below threshold 0.7'
    }
  ],

  // Ambiguities resolved to single reading
  resolved: [
    {
      ambiguity: { type: 'noun_category', ... },
      selectedReading: 'continuant',
      reason: 'Agent of intentional act signal'
    }
  ],

  // Ambiguities flagged but not forked (anomalies, metonymy)
  flagged: [
    {
      ambiguity: { type: 'selectional_violation', ... },
      flag: 'selectionalMismatch',
      reason: 'Anomalous input - inanimate agent'
    }
  ],

  // Statistics
  stats: {
    total: 5,
    preserved: 2,
    resolved: 2,
    flagged: 1
  }
}
```

---

## Test-Driven Development Plan

### Test File Structure

```
tests/
├── unit/
│   └── phase6/
│       ├── selectional-preferences.test.js  # Phase 6.0 (done)
│       └── ambiguity-resolver.test.js       # Phase 6.1 (new)
```

### Test Categories

#### Category 1: Basic Resolution (10 tests)

| Test ID | Input Ambiguity | Expected Result | Priority |
|---------|-----------------|-----------------|----------|
| BR-001 | `{ type: 'selectional_violation' }` | `flagged` (never preserve) | P0 |
| BR-002 | `{ type: 'potential_metonymy' }` | `flagged` (annotate only) | P0 |
| BR-003 | `{ type: 'modal_force', confidence: 0.5 }` | `preserved` (below threshold) | P0 |
| BR-004 | `{ type: 'modal_force', confidence: 0.9 }` | `resolved` (above threshold) | P0 |
| BR-005 | `{ type: 'scope' }` | `preserved` (always significant) | P0 |
| BR-006 | `{ type: 'noun_category', signals: ['of_complement'] }` | `preserved` | P0 |
| BR-007 | `{ type: 'noun_category', signals: ['agent_signal'] }` | `resolved` to continuant | P0 |
| BR-008 | `{ type: 'verb_sense', confidence: 0.4 }` | `preserved` | P1 |
| BR-009 | `{ type: 'verb_sense', confidence: 0.8 }` | `resolved` | P1 |
| BR-010 | Empty report | Empty result | P1 |

#### Category 2: Threshold Configuration (8 tests)

| Test ID | Config | Input | Expected | Priority |
|---------|--------|-------|----------|----------|
| TC-001 | `{ preserveThreshold: 0.5 }` | modal_force conf=0.6 | `resolved` | P0 |
| TC-002 | `{ preserveThreshold: 0.5 }` | modal_force conf=0.4 | `preserved` | P0 |
| TC-003 | `{ preserveThreshold: 0.9 }` | modal_force conf=0.8 | `preserved` | P1 |
| TC-004 | `{ maxReadingsPerNode: 2 }` | 3 readings | Capped to 2 | P1 |
| TC-005 | `{ maxTotalAlternatives: 5 }` | 10 ambiguities | Capped to 5 preserved | P1 |
| TC-006 | Default config | - | preserveThreshold=0.7 | P2 |
| TC-007 | Custom rule override | - | Uses custom rule | P1 |
| TC-008 | Null config | - | Uses defaults | P2 |

#### Category 3: Context-Dependent Resolution (10 tests)

| Test ID | Ambiguity | Context | Expected | Priority |
|---------|-----------|---------|----------|----------|
| CD-001 | noun_category | Has "of" complement | `preserved` | P0 |
| CD-002 | noun_category | Is agent of act | `resolved` to continuant | P0 |
| CD-003 | noun_category | Has duration predicate | `resolved` to process | P0 |
| CD-004 | modal_force | Perfect aspect | `resolved` to epistemic | P1 |
| CD-005 | modal_force | Agent subject | `resolved` to deontic | P1 |
| CD-006 | modal_force | Stative verb | Leans epistemic | P1 |
| CD-007 | scope | "not all" pattern | Default wide scope | P1 |
| CD-008 | scope | Multiple quantifiers | `preserved` | P1 |
| CD-009 | selectional | Organization agent | Not a violation | P0 |
| CD-010 | selectional | Inanimate agent | Flagged as violation | P0 |

#### Category 4: Full Report Resolution (7 tests)

| Test ID | Report Contents | Expected Stats | Priority |
|---------|-----------------|----------------|----------|
| FR-001 | 1 modal_force (low conf) | preserved: 1 | P0 |
| FR-002 | 1 selectional_violation | flagged: 1 | P0 |
| FR-003 | Mixed: 2 modal, 1 scope, 1 violation | preserved: 3, flagged: 1 | P0 |
| FR-004 | 5 scope ambiguities | preserved: 5 | P1 |
| FR-005 | All high confidence | resolved: all | P1 |
| FR-006 | Max cap exceeded | Respects maxTotalAlternatives | P1 |
| FR-007 | Empty report | All stats = 0 | P2 |

#### Category 5: Edge Cases (5 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| EC-001 | Unknown ambiguity type | Treated as preserve | P1 |
| EC-002 | Null ambiguity | Skipped | P2 |
| EC-003 | Missing confidence | Uses default (0.5) | P1 |
| EC-004 | Missing signals array | Empty signals | P2 |
| EC-005 | Conflicting signals | First matching rule wins | P1 |

---

## Acceptance Criteria

### Functional Criteria

- [ ] **AC-001:** `resolve()` returns ResolutionResult with preserved, resolved, flagged arrays
- [ ] **AC-002:** `selectional_violation` always flagged, never preserved
- [ ] **AC-003:** `potential_metonymy` always flagged, never preserved
- [ ] **AC-004:** `modal_force` preserved when confidence < threshold
- [ ] **AC-005:** `scope` always preserved (semantically significant)
- [ ] **AC-006:** `noun_category` uses context signals for resolution
- [ ] **AC-007:** Respects `maxReadingsPerNode` cap
- [ ] **AC-008:** Respects `maxTotalAlternatives` cap
- [ ] **AC-009:** `shouldPreserve()` works for single ambiguity checks

### Configuration Criteria

- [ ] **AC-010:** Default preserveThreshold is 0.7
- [ ] **AC-011:** Custom threshold respected
- [ ] **AC-012:** Custom rules can override defaults
- [ ] **AC-013:** Works with no config (uses defaults)

### Quality Criteria

- [ ] **AC-014:** All P0 tests pass (20 tests)
- [ ] **AC-015:** All P1 tests pass (15 tests)
- [ ] **AC-016:** 90%+ P2 tests pass (5 tests)
- [ ] **AC-017:** Zero regression in existing tests
- [ ] **AC-018:** Bundle size increase < 10KB

---

## Implementation Steps

### Step 1: Create Test File (TDD)

Write all P0 tests as failing tests first.

### Step 2: Implement Core Class

1. Define default resolution rules
2. Implement `resolve(report, context)`
3. Implement `shouldPreserve(ambiguity, context)`
4. Implement rule matching logic

### Step 3: Run P0 Tests

All 20 P0 tests should pass.

### Step 4: Add P1 Tests & Refinements

Add context-dependent resolution and configuration tests.

### Step 5: Integration

Update existing `ambiguity-resolver.test.js` if it exists, or create integration tests.

---

## Resolution Rules (Default)

```javascript
const DEFAULT_RULES = {
  selectional_violation: {
    action: 'flag',
    reason: 'Anomalous input - flag but do not fork',
    flag: 'selectionalMismatch'
  },

  potential_metonymy: {
    action: 'flag',
    reason: 'Metonymic usage - annotate but do not fork',
    flag: 'potentialMetonymy'
  },

  modal_force: {
    action: 'threshold',
    threshold: 0.8,  // Override global threshold
    preserveReason: 'Modal ambiguity below confidence threshold',
    resolveReason: 'Modal ambiguity resolved with high confidence',
    contextRules: [
      { signal: 'perfect_aspect', resolve: 'epistemic', confidence: 0.85 },
      { signal: 'agent_subject', resolve: 'deontic', confidence: 0.75 },
      { signal: 'stative_verb', resolve: 'epistemic', confidence: 0.7 }
    ]
  },

  noun_category: {
    action: 'context',
    contextRules: [
      { signal: 'of_complement', preserve: true },
      { signal: 'subject_of_intentional_act', resolve: 'continuant' },
      { signal: 'duration_predicate', resolve: 'process' },
      { signal: 'predicate_adjective', resolve: 'process' }
    ],
    default: { preserve: true, reason: 'No strong context signal' }
  },

  scope: {
    action: 'preserve',
    reason: 'Scope ambiguity is semantically significant',
    contextRules: [
      { pattern: 'not_all', defaultReading: 'wide' },
      { pattern: 'multiple_quantifiers', defaultReading: 'subject_wide' }
    ]
  },

  verb_sense: {
    action: 'threshold',
    threshold: 0.6,
    preserveReason: 'Verb sense ambiguous',
    resolveReason: 'Verb sense resolved with context'
  }
};
```

---

## Files

```
src/graph/
├── SelectionalPreferences.js    # Phase 6.0 (done)
├── AmbiguityDetector.js         # Phase 5 (done)
├── AmbiguityReport.js           # Phase 5 (done)
└── AmbiguityResolver.js         # Phase 6.1 (new)

tests/unit/phase6/
├── selectional-preferences.test.js  # 60 tests (done)
└── ambiguity-resolver.test.js       # 40 tests (new)
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| P0 Test Pass Rate | 100% | 20/20 tests |
| P1 Test Pass Rate | 100% | 15/15 tests |
| P2 Test Pass Rate | 90%+ | 4+/5 tests |
| Regression Tests | 0 failures | All existing tests pass |
| Bundle Size | < +10KB | Measure before/after |

---

## Sign-Off

- [ ] Plan reviewed
- [ ] Acceptance criteria agreed
- [ ] Test strategy approved
- [ ] Ready to implement

---

*Phase 6.1 Implementation Plan - AmbiguityResolver*
