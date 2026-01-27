# Phase 6.2 Implementation Plan: InterpretationLattice

**Version:** 1.0
**Created:** 2026-01-26
**Status:** Planning
**Priority:** High
**Effort:** Medium

---

## Overview

### What is the InterpretationLattice?

The InterpretationLattice is a data structure that holds the default interpretation of a text plus any preserved alternative readings identified by the AmbiguityResolver.

**Key Insight:** Most consumers just want the "best guess" graph. The lattice provides this while also making alternative interpretations available for consumers who need them.

### Why Phase 6.2?

Phase 6.1 (AmbiguityResolver) **decides** which ambiguities to preserve. Phase 6.2 **structures** the results:

```
Phase 6.1 Output:              Phase 6.2 Structure:
┌────────────────────┐         ┌─────────────────────────────────┐
│ ResolutionResult   │   →     │ InterpretationLattice           │
│ - preserved: [...]  │         │ - defaultReading: { @graph... } │
│ - resolved: [...]   │         │ - alternativeReadings: [...]    │
│ - flagged: [...]    │         │ - resolutionLog: [...]          │
└────────────────────┘         └─────────────────────────────────┘
```

---

## Architecture Design

### Class Interface

```javascript
class InterpretationLattice {
  /**
   * Create an InterpretationLattice
   * @param {Object} defaultGraph - The default/primary interpretation
   * @param {Object} resolutionResult - From AmbiguityResolver.resolve()
   * @param {Object} options - Configuration options
   */
  constructor(defaultGraph, resolutionResult = null, options = {}) {
    this.defaultReading = defaultGraph;
    this.alternativeReadings = [];
    this.resolutionResult = resolutionResult;
    this.resolutionLog = [];
    this.options = options;
  }

  // ==================== Primary API ====================

  /**
   * Get the default (most likely) interpretation
   * @returns {Object} JSON-LD graph
   */
  getDefaultReading() { }

  /**
   * Get all alternative readings
   * @returns {Array} Array of alternative graphs with metadata
   */
  getAlternatives() { }

  /**
   * Add an alternative reading to the lattice
   * @param {Object} alternative - Alternative graph with metadata
   */
  addAlternative(alternative) { }

  /**
   * Get ambiguities that were preserved (have alternatives)
   * @returns {Array} Preserved ambiguities from ResolutionResult
   */
  getAmbiguitiesPreserved() { }

  // ==================== Analysis API ====================

  /**
   * Check if there's any significant unresolved ambiguity
   * @returns {boolean}
   */
  hasSignificantAmbiguity() { }

  /**
   * Get the reasoning for each resolution decision
   * @returns {Array} Resolution log entries
   */
  getResolutionReasoning() { }

  /**
   * Get summary statistics
   * @returns {Object} { totalAmbiguities, preserved, resolved, flagged }
   */
  getStatistics() { }

  // ==================== Serialization ====================

  /**
   * Serialize to JSON-LD format
   * @returns {Object} Full lattice as JSON-LD
   */
  toJSONLD() { }

  /**
   * Get just the default reading (backwards compatible)
   * @returns {Object} Default graph only
   */
  toSimplifiedGraph() { }

  /**
   * Log a resolution decision
   * @param {Object} entry - { ambiguity, decision, reason, timestamp }
   */
  logResolution(entry) { }
}
```

### Alternative Reading Structure

```javascript
{
  id: 'alt_modal_001',
  sourceAmbiguity: {
    type: 'modal_force',
    nodeId: 'inst:Act_123',
    span: 'should prioritize'
  },
  reading: 'epistemic',
  plausibility: 0.3,
  graph: {
    // Modified graph fragment
    "@id": "inst:Act_123_alt1",
    "tagteam:modality": "expectation",
    "tagteam:actualityStatus": "tagteam:Hypothetical"
  },
  derivedFrom: "inst:Act_123"
}
```

### Resolution Log Entry Structure

```javascript
{
  timestamp: "2026-01-26T10:30:00Z",
  ambiguity: { type: 'modal_force', nodeId: '...', ... },
  decision: 'preserved',  // 'preserved' | 'resolved' | 'flagged'
  reason: 'Confidence 0.65 below threshold 0.7',
  selectedReading: null,  // For 'resolved': which reading was chosen
  alternatives: ['obligation', 'expectation']  // For 'preserved': what alternatives exist
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
│       ├── ambiguity-resolver.test.js       # Phase 6.1 (done)
│       └── interpretation-lattice.test.js   # Phase 6.2 (new)
```

### Test Categories

#### Category 1: Constructor & Basic Properties (8 tests)

| Test ID | Input | Expected Result | Priority |
|---------|-------|-----------------|----------|
| BP-001 | Empty constructor | Creates valid lattice with null defaults | P0 |
| BP-002 | DefaultGraph only | Stores defaultReading correctly | P0 |
| BP-003 | DefaultGraph + ResolutionResult | Stores both correctly | P0 |
| BP-004 | With options | Applies options | P1 |
| BP-005 | defaultReading accessible | getDefaultReading() returns graph | P0 |
| BP-006 | alternativeReadings starts empty | getAlternatives() returns [] | P0 |
| BP-007 | resolutionLog starts empty | getResolutionReasoning() returns [] | P1 |
| BP-008 | Null resolutionResult handled | No errors, graceful defaults | P1 |

#### Category 2: Adding Alternatives (8 tests)

| Test ID | Operation | Expected | Priority |
|---------|-----------|----------|----------|
| AA-001 | addAlternative(valid) | Adds to alternativeReadings | P0 |
| AA-002 | addAlternative(multiple) | All stored in order | P0 |
| AA-003 | addAlternative with plausibility | Plausibility accessible | P0 |
| AA-004 | addAlternative with derivedFrom | Links to source node | P0 |
| AA-005 | getAlternatives() | Returns all alternatives | P0 |
| AA-006 | getAlternatives() by type | Filter by ambiguity type | P1 |
| AA-007 | addAlternative(null) | Ignored gracefully | P2 |
| AA-008 | addAlternative rejects duplicates | No duplicate IDs | P1 |

#### Category 3: Resolution Result Integration (8 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| RR-001 | getAmbiguitiesPreserved() with preserved | Returns preserved array | P0 |
| RR-002 | getAmbiguitiesPreserved() with none | Returns empty array | P0 |
| RR-003 | hasSignificantAmbiguity() with preserved | Returns true | P0 |
| RR-004 | hasSignificantAmbiguity() with none | Returns false | P0 |
| RR-005 | getStatistics() with mixed | Correct counts | P0 |
| RR-006 | getStatistics() empty | All zeros | P1 |
| RR-007 | Resolution result with flagged | Accessible via stats | P1 |
| RR-008 | Resolution result with resolved | Accessible via stats | P1 |

#### Category 4: Resolution Logging (6 tests)

| Test ID | Operation | Expected | Priority |
|---------|-----------|----------|----------|
| RL-001 | logResolution(entry) | Entry added to log | P0 |
| RL-002 | logResolution adds timestamp | Auto-timestamp if missing | P1 |
| RL-003 | getResolutionReasoning() | Returns all entries | P0 |
| RL-004 | Multiple log entries | Ordered correctly | P1 |
| RL-005 | logResolution(null) | Ignored | P2 |
| RL-006 | Log entry has required fields | Validated | P2 |

#### Category 5: Serialization (10 tests)

| Test ID | Method | Expected | Priority |
|---------|--------|----------|----------|
| SE-001 | toJSONLD() structure | Valid JSON-LD with @context | P0 |
| SE-002 | toJSONLD() includes defaultReading | Under defaultReading key | P0 |
| SE-003 | toJSONLD() includes alternatives | Under alternativeReadings key | P0 |
| SE-004 | toJSONLD() includes statistics | Under _statistics key | P1 |
| SE-005 | toJSONLD() includes resolutionLog | Under _resolutionLog key | P1 |
| SE-006 | toSimplifiedGraph() | Returns just defaultReading | P0 |
| SE-007 | toSimplifiedGraph() is backwards compatible | Same as original builder output | P0 |
| SE-008 | toJSONLD() with empty alternatives | Empty array, not null | P1 |
| SE-009 | toJSONLD() preserves @graph structure | Nested graphs valid | P1 |
| SE-010 | toJSONLD() includes metadata | Version, timestamp | P2 |

#### Category 6: Edge Cases (5 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| EC-001 | No alternatives, toJSONLD() | Valid output with empty alternatives | P1 |
| EC-002 | Large number of alternatives | All preserved correctly | P2 |
| EC-003 | Alternative with missing fields | Defaults applied | P1 |
| EC-004 | getDefaultReading() returns copy | Mutations don't affect original | P2 |
| EC-005 | Concurrent addAlternative calls | Thread-safe behavior | P2 |

---

## Acceptance Criteria

### Functional Criteria

- [ ] **AC-001:** Constructor accepts defaultGraph and resolutionResult
- [ ] **AC-002:** `getDefaultReading()` returns the default interpretation
- [ ] **AC-003:** `addAlternative()` adds alternative readings
- [ ] **AC-004:** `getAlternatives()` returns all alternative readings
- [ ] **AC-005:** `getAmbiguitiesPreserved()` returns preserved ambiguities from ResolutionResult
- [ ] **AC-006:** `hasSignificantAmbiguity()` returns true if any preserved
- [ ] **AC-007:** `getStatistics()` returns correct counts
- [ ] **AC-008:** `logResolution()` adds audit entries
- [ ] **AC-009:** `getResolutionReasoning()` returns log entries

### Serialization Criteria

- [ ] **AC-010:** `toJSONLD()` produces valid JSON-LD structure
- [ ] **AC-011:** `toJSONLD()` includes all components (default, alternatives, stats, log)
- [ ] **AC-012:** `toSimplifiedGraph()` returns just the default graph
- [ ] **AC-013:** `toSimplifiedGraph()` is backwards compatible with existing API

### Quality Criteria

- [ ] **AC-014:** All P0 tests pass (20 tests)
- [ ] **AC-015:** All P1 tests pass (17 tests)
- [ ] **AC-016:** 90%+ P2 tests pass (8 tests)
- [ ] **AC-017:** Zero regression in existing tests
- [ ] **AC-018:** Bundle size increase < 5KB

---

## Implementation Steps

### Step 1: Create Test File (TDD)

Write all P0 tests as failing tests first.

### Step 2: Implement Core Class

1. Constructor with defaultGraph and resolutionResult
2. Primary API: getDefaultReading(), addAlternative(), getAlternatives()
3. Resolution integration: getAmbiguitiesPreserved(), hasSignificantAmbiguity()
4. Logging: logResolution(), getResolutionReasoning()

### Step 3: Run P0 Tests

All 20 P0 tests should pass.

### Step 4: Implement Serialization

1. toJSONLD() with full structure
2. toSimplifiedGraph() for backwards compatibility

### Step 5: Add P1 Tests & Refinements

Add filtering, validation, and edge case handling.

---

## JSON-LD Output Structure

```javascript
{
  "@context": {
    "@vocab": "http://purl.org/tagteam#",
    "bfo": "http://purl.obolibrary.org/obo/BFO_",
    "cco": "http://www.ontologyrepository.com/CommonCoreOntologies/",
    "tagteam": "http://purl.org/tagteam#"
  },

  "@type": "tagteam:InterpretationLattice",

  "tagteam:defaultReading": {
    "@graph": [
      // The default/primary interpretation nodes
    ]
  },

  "tagteam:alternativeReadings": [
    {
      "@id": "inst:Alt_001",
      "@type": "tagteam:AlternativeReading",
      "tagteam:sourceAmbiguity": "modal_force",
      "tagteam:reading": "epistemic",
      "tagteam:plausibility": 0.3,
      "tagteam:derivedFrom": { "@id": "inst:Act_123" },
      "tagteam:graphFragment": {
        "@id": "inst:Act_123_alt1",
        "tagteam:modality": "expectation"
      }
    }
  ],

  "_statistics": {
    "totalAmbiguities": 5,
    "preserved": 2,
    "resolved": 2,
    "flagged": 1,
    "alternativeCount": 3
  },

  "_resolutionLog": [
    {
      "timestamp": "2026-01-26T10:30:00Z",
      "ambiguityType": "modal_force",
      "decision": "preserved",
      "reason": "Confidence below threshold"
    }
  ],

  "_metadata": {
    "version": "6.2.0",
    "generatedAt": "2026-01-26T10:30:00Z"
  }
}
```

---

## Integration with Phase 6.3 & 6.4

Phase 6.2 provides the **data structure**. Phase 6.3 will **generate** alternative graph fragments. Phase 6.4 will **integrate** with SemanticGraphBuilder:

```javascript
// Phase 6.4 usage
const result = builder.build(text, { preserveAmbiguity: true });

// result._interpretationLattice is an InterpretationLattice instance
const lattice = result._interpretationLattice;

console.log(lattice.getDefaultReading());      // Primary interpretation
console.log(lattice.hasSignificantAmbiguity()); // True if preserved
console.log(lattice.getAlternatives());         // Alternative readings
console.log(lattice.toJSONLD());               // Full serialization
```

---

## Files

```
src/graph/
├── SelectionalPreferences.js    # Phase 6.0 (done)
├── AmbiguityDetector.js         # Phase 5 (done)
├── AmbiguityReport.js           # Phase 5 (done)
├── AmbiguityResolver.js         # Phase 6.1 (done)
└── InterpretationLattice.js     # Phase 6.2 (new)

tests/unit/phase6/
├── selectional-preferences.test.js  # 60 tests (done)
├── ambiguity-resolver.test.js       # 46 tests (done)
└── interpretation-lattice.test.js   # 45 tests (new)
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| P0 Test Pass Rate | 100% | 20/20 tests |
| P1 Test Pass Rate | 100% | 17/17 tests |
| P2 Test Pass Rate | 90%+ | 7+/8 tests |
| Regression Tests | 0 failures | All existing tests pass |
| Bundle Size | < +5KB | Measure before/after |

---

## Sign-Off

- [ ] Plan reviewed
- [ ] Acceptance criteria agreed
- [ ] Test strategy approved
- [ ] Ready to implement

---

*Phase 6.2 Implementation Plan - InterpretationLattice*
