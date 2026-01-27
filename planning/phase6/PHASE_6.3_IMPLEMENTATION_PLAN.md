# Phase 6.3 Implementation Plan: AlternativeGraphBuilder

**Version:** 1.0
**Created:** 2026-01-26
**Status:** Planning
**Priority:** High
**Effort:** Medium

---

## Overview

### What is the AlternativeGraphBuilder?

The AlternativeGraphBuilder generates alternative graph fragments for preserved ambiguities. When the AmbiguityResolver decides to preserve an ambiguity (rather than resolve it), this builder creates variant nodes that represent the alternative interpretations.

**Key Insight:** The default graph represents the most plausible reading. Alternative graph fragments represent other valid interpretations that consumers may want to explore.

### Why Phase 6.3?

Phase 6.1 (AmbiguityResolver) **decides** which ambiguities to preserve.
Phase 6.2 (InterpretationLattice) **structures** the results.
Phase 6.3 (AlternativeGraphBuilder) **generates** the alternative graph fragments.

```
Phase 6.1 Output:              Phase 6.2 Structure:              Phase 6.3 Generation:
┌────────────────────┐         ┌─────────────────────┐          ┌─────────────────────────┐
│ ResolutionResult   │   →     │ InterpretationLattice│    →    │ AlternativeGraphBuilder │
│ - preserved: [...]  │         │ - defaultReading     │          │ - buildAlternatives()   │
│                    │         │ - alternativeReadings │          │ - createVariantNode()   │
└────────────────────┘         └─────────────────────┘          └─────────────────────────┘
```

---

## Architecture Design

### Class Interface

```javascript
class AlternativeGraphBuilder {
  /**
   * Create an AlternativeGraphBuilder
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      iriSuffix: '_alt',           // Suffix for alternative node IRIs
      preserveOriginalLinks: true, // Keep links to original nodes
      includeMetadata: true,       // Add metadata about source ambiguity
      ...options
    };
  }

  // ==================== Primary API ====================

  /**
   * Build alternative graph fragments for preserved ambiguities
   * @param {Object} defaultGraph - The default/primary interpretation graph
   * @param {Array} preservedAmbiguities - Ambiguities that were preserved
   * @returns {Array} Array of alternative reading objects
   */
  buildAlternatives(defaultGraph, preservedAmbiguities) { }

  /**
   * Create a single alternative reading for an ambiguity
   * @param {Object} ambiguity - The ambiguity to create an alternative for
   * @param {Object} defaultGraph - The default graph for context
   * @param {number} alternativeIndex - Index of this alternative (0-based)
   * @returns {Object} Alternative reading object
   */
  createAlternativeReading(ambiguity, defaultGraph, alternativeIndex = 0) { }

  /**
   * Create a variant node with modified properties
   * @param {Object} originalNode - The original node from default graph
   * @param {Object} modifications - Properties to change
   * @param {string} suffix - IRI suffix for uniqueness
   * @returns {Object} New node with modified properties and unique IRI
   */
  createVariantNode(originalNode, modifications, suffix = '_alt1') { }

  // ==================== Type-Specific Builders ====================

  /**
   * Build alternatives for modal force ambiguity
   * @param {Object} ambiguity - Modal ambiguity
   * @param {Object} defaultGraph - Default graph
   * @returns {Array} Alternative readings for epistemic/deontic
   */
  buildModalAlternatives(ambiguity, defaultGraph) { }

  /**
   * Build alternatives for scope ambiguity
   * @param {Object} ambiguity - Scope ambiguity
   * @param {Object} defaultGraph - Default graph
   * @returns {Array} Alternative readings for different scope orders
   */
  buildScopeAlternatives(ambiguity, defaultGraph) { }

  /**
   * Build alternatives for noun category ambiguity
   * @param {Object} ambiguity - Noun category ambiguity
   * @param {Object} defaultGraph - Default graph
   * @returns {Array} Alternative readings (role vs organization, etc.)
   */
  buildNounCategoryAlternatives(ambiguity, defaultGraph) { }

  // ==================== Utilities ====================

  /**
   * Generate a unique IRI for an alternative node
   * @param {string} originalIri - Original node IRI
   * @param {number} index - Alternative index
   * @returns {string} New unique IRI
   */
  generateAlternativeIri(originalIri, index) { }

  /**
   * Find the node in graph that corresponds to an ambiguity
   * @param {Object} graph - The graph to search
   * @param {Object} ambiguity - The ambiguity with nodeId
   * @returns {Object|null} The matching node or null
   */
  findNodeForAmbiguity(graph, ambiguity) { }
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
  reading: 'epistemic',          // The interpretation this alternative represents
  plausibility: 0.3,             // How plausible this reading is
  derivedFrom: 'inst:Act_123',   // Links back to default node
  graph: {
    // Modified graph fragment
    "@id": "inst:Act_123_alt1",
    "@type": ["cco:IntentionalAct", "tagteam:AlternativeNode"],
    "tagteam:modality": "expectation",
    "tagteam:actualityStatus": "tagteam:Hypothetical",
    "tagteam:alternativeFor": { "@id": "inst:Act_123" }
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
│       ├── ambiguity-resolver.test.js       # Phase 6.1 (done)
│       ├── interpretation-lattice.test.js   # Phase 6.2 (done)
│       └── alternative-graph-builder.test.js # Phase 6.3 (new)
```

### Test Categories

#### Category 1: Constructor & Basic Properties (6 tests)

| Test ID | Input | Expected Result | Priority |
|---------|-------|-----------------|----------|
| BP-001 | Empty constructor | Creates builder with default options | P0 |
| BP-002 | Custom options | Options applied correctly | P0 |
| BP-003 | Default iriSuffix | '_alt' | P0 |
| BP-004 | Custom iriSuffix | Uses provided suffix | P1 |
| BP-005 | preserveOriginalLinks default | true | P1 |
| BP-006 | includeMetadata default | true | P1 |

#### Category 2: IRI Generation (8 tests)

| Test ID | Input | Expected | Priority |
|---------|-------|----------|----------|
| IG-001 | generateAlternativeIri('inst:Act_1', 0) | 'inst:Act_1_alt1' | P0 |
| IG-002 | generateAlternativeIri('inst:Act_1', 1) | 'inst:Act_1_alt2' | P0 |
| IG-003 | generateAlternativeIri with custom suffix | Uses custom suffix | P1 |
| IG-004 | generateAlternativeIri null input | Throws or handles gracefully | P1 |
| IG-005 | IRI with existing suffix | Appends correctly | P1 |
| IG-006 | Multiple alternatives same node | All unique IRIs | P0 |
| IG-007 | IRI preserves namespace | 'inst:' prefix preserved | P0 |
| IG-008 | IRI with special characters | Handled correctly | P2 |

#### Category 3: Variant Node Creation (10 tests)

| Test ID | Operation | Expected | Priority |
|---------|-----------|----------|----------|
| VN-001 | createVariantNode basic | Returns new node with modified IRI | P0 |
| VN-002 | createVariantNode preserves @type | Original types preserved | P0 |
| VN-003 | createVariantNode applies modifications | Properties changed | P0 |
| VN-004 | createVariantNode adds alternativeFor | Links to original | P0 |
| VN-005 | createVariantNode preserves other properties | Unmodified props kept | P0 |
| VN-006 | createVariantNode deep copy | Doesn't mutate original | P0 |
| VN-007 | createVariantNode with null original | Handles gracefully | P1 |
| VN-008 | createVariantNode with empty modifications | Returns clone with new IRI | P1 |
| VN-009 | createVariantNode adds AlternativeNode type | @type includes marker | P1 |
| VN-010 | createVariantNode custom suffix | Uses provided suffix | P1 |

#### Category 4: Modal Alternatives (10 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| MA-001 | buildModalAlternatives basic | Returns array of alternatives | P0 |
| MA-002 | Modal deontic default → epistemic alt | Creates epistemic alternative | P0 |
| MA-003 | Modal epistemic default → deontic alt | Creates deontic alternative | P0 |
| MA-004 | Modal with multiple alternatives | All readings represented | P0 |
| MA-005 | Modal alternative has correct reading | 'epistemic' or 'deontic' | P0 |
| MA-006 | Modal alternative has plausibility | Score assigned | P0 |
| MA-007 | Modal alternative links to source | derivedFrom set | P0 |
| MA-008 | Modal alternative graph fragment valid | Has required properties | P1 |
| MA-009 | Modal with null ambiguity | Returns empty array | P1 |
| MA-010 | Modal modality property set correctly | expectation vs obligation | P1 |

#### Category 5: Scope Alternatives (8 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| SA-001 | buildScopeAlternatives basic | Returns array of alternatives | P0 |
| SA-002 | Scope wide default → narrow alt | Creates narrow reading | P0 |
| SA-003 | Scope narrow default → wide alt | Creates wide reading | P0 |
| SA-004 | Scope alternative has correct reading | 'wide' or 'narrow' | P0 |
| SA-005 | Scope alternative modifies scope property | scopeRelation changed | P0 |
| SA-006 | Scope alternative has plausibility | Score assigned | P1 |
| SA-007 | Scope with multiple operators | All combinations generated | P2 |
| SA-008 | Scope with null ambiguity | Returns empty array | P1 |

#### Category 6: Noun Category Alternatives (6 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| NC-001 | buildNounCategoryAlternatives basic | Returns array of alternatives | P0 |
| NC-002 | Noun org default → role alt | Creates role reading | P0 |
| NC-003 | Noun category alternative changes @type | Different CCO type | P0 |
| NC-004 | Noun alternative has correct reading | Category name | P1 |
| NC-005 | Noun alternative has plausibility | Score assigned | P1 |
| NC-006 | Noun with null ambiguity | Returns empty array | P1 |

#### Category 7: buildAlternatives Integration (10 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| BA-001 | buildAlternatives empty preserved | Returns empty array | P0 |
| BA-002 | buildAlternatives single modal | Returns modal alternatives | P0 |
| BA-003 | buildAlternatives single scope | Returns scope alternatives | P0 |
| BA-004 | buildAlternatives mixed types | All types handled | P0 |
| BA-005 | buildAlternatives multiple same type | All processed | P0 |
| BA-006 | buildAlternatives null graph | Handles gracefully | P1 |
| BA-007 | buildAlternatives null preserved | Returns empty array | P1 |
| BA-008 | buildAlternatives unique IDs | No duplicate alternative IDs | P0 |
| BA-009 | buildAlternatives sets sourceAmbiguity | Each alt has source | P0 |
| BA-010 | Unknown ambiguity type | Skipped gracefully | P1 |

#### Category 8: createAlternativeReading (6 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| AR-001 | createAlternativeReading basic | Returns valid alternative object | P0 |
| AR-002 | createAlternativeReading has id | Unique ID generated | P0 |
| AR-003 | createAlternativeReading has sourceAmbiguity | Includes type and nodeId | P0 |
| AR-004 | createAlternativeReading has graph | Contains variant node | P0 |
| AR-005 | createAlternativeReading null ambiguity | Returns null | P1 |
| AR-006 | createAlternativeReading index used | Different index → different IRI | P1 |

#### Category 9: findNodeForAmbiguity (5 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| FN-001 | findNodeForAmbiguity found | Returns matching node | P0 |
| FN-002 | findNodeForAmbiguity not found | Returns null | P0 |
| FN-003 | findNodeForAmbiguity in @graph array | Searches nested | P0 |
| FN-004 | findNodeForAmbiguity null graph | Returns null | P1 |
| FN-005 | findNodeForAmbiguity null ambiguity | Returns null | P1 |

#### Category 10: Edge Cases (6 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| EC-001 | Very large number of ambiguities | All processed | P2 |
| EC-002 | Deeply nested graph structure | Nodes found correctly | P1 |
| EC-003 | Ambiguity with missing nodeId | Handled gracefully | P1 |
| EC-004 | Graph with circular references | No infinite loops | P2 |
| EC-005 | Alternative for already-alternative node | Creates nested alternative | P2 |
| EC-006 | Empty ambiguity readings array | Uses defaults | P1 |

---

## Acceptance Criteria

### Functional Criteria

- [ ] **AC-001:** Constructor accepts options and applies defaults
- [ ] **AC-002:** `generateAlternativeIri()` creates unique, traceable IRIs
- [ ] **AC-003:** `createVariantNode()` creates deep copies with modifications
- [ ] **AC-004:** `buildModalAlternatives()` generates epistemic/deontic alternatives
- [ ] **AC-005:** `buildScopeAlternatives()` generates wide/narrow alternatives
- [ ] **AC-006:** `buildNounCategoryAlternatives()` generates category alternatives
- [ ] **AC-007:** `buildAlternatives()` processes all preserved ambiguities
- [ ] **AC-008:** `findNodeForAmbiguity()` locates nodes in nested graphs
- [ ] **AC-009:** All alternatives have unique IDs
- [ ] **AC-010:** All alternatives link back to source via derivedFrom

### Integration Criteria

- [ ] **AC-011:** Alternatives can be added to InterpretationLattice
- [ ] **AC-012:** Alternative graph fragments are valid JSON-LD
- [ ] **AC-013:** Variant nodes preserve CCO/BFO type hierarchy

### Quality Criteria

- [ ] **AC-014:** All P0 tests pass (35 tests)
- [ ] **AC-015:** All P1 tests pass (25 tests)
- [ ] **AC-016:** 90%+ P2 tests pass (5 tests)
- [ ] **AC-017:** Zero regression in existing tests
- [ ] **AC-018:** Bundle size increase < 5KB

---

## Implementation Steps

### Step 1: Create Test File (TDD)

Write all P0 tests as failing tests first.

### Step 2: Implement Core Utilities

1. Constructor with options
2. `generateAlternativeIri()`
3. `createVariantNode()`
4. `findNodeForAmbiguity()`

### Step 3: Run Initial P0 Tests

Core utility tests should pass.

### Step 4: Implement Type-Specific Builders

1. `buildModalAlternatives()`
2. `buildScopeAlternatives()`
3. `buildNounCategoryAlternatives()`

### Step 5: Implement Integration Methods

1. `createAlternativeReading()`
2. `buildAlternatives()`

### Step 6: Run All Tests

All P0 and P1 tests should pass.

---

## Modal Alternative Generation Logic

```javascript
buildModalAlternatives(ambiguity, defaultGraph) {
  const node = this.findNodeForAmbiguity(defaultGraph, ambiguity);
  if (!node) return [];

  const alternatives = [];
  const readings = ambiguity.readings || ['deontic', 'epistemic'];
  const defaultReading = ambiguity.defaultReading || readings[0];

  // Generate alternative for each non-default reading
  for (let i = 0; i < readings.length; i++) {
    const reading = readings[i];
    if (reading === defaultReading) continue;

    const modifications = this._getModalModifications(reading);
    const variantNode = this.createVariantNode(node, modifications, `_alt${i + 1}`);

    alternatives.push({
      id: `alt_modal_${ambiguity.nodeId}_${i + 1}`,
      sourceAmbiguity: {
        type: ambiguity.type,
        nodeId: ambiguity.nodeId,
        span: ambiguity.span
      },
      reading: reading,
      plausibility: this._calculatePlausibility(ambiguity, reading),
      derivedFrom: ambiguity.nodeId,
      graph: variantNode
    });
  }

  return alternatives;
}

_getModalModifications(reading) {
  if (reading === 'epistemic') {
    return {
      'tagteam:modality': 'expectation',
      'tagteam:actualityStatus': 'tagteam:Hypothetical'
    };
  } else if (reading === 'deontic') {
    return {
      'tagteam:modality': 'obligation',
      'tagteam:actualityStatus': 'tagteam:Prescribed'
    };
  }
  return {};
}
```

---

## Files

```
src/graph/
├── SelectionalPreferences.js    # Phase 6.0 (done)
├── AmbiguityDetector.js         # Phase 5 (done)
├── AmbiguityReport.js           # Phase 5 (done)
├── AmbiguityResolver.js         # Phase 6.1 (done)
├── InterpretationLattice.js     # Phase 6.2 (done)
└── AlternativeGraphBuilder.js   # Phase 6.3 (new)

tests/unit/phase6/
├── selectional-preferences.test.js  # 60 tests (done)
├── ambiguity-resolver.test.js       # 46 tests (done)
├── interpretation-lattice.test.js   # 55 tests (done)
└── alternative-graph-builder.test.js # 75 tests (new)
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| P0 Test Pass Rate | 100% | 35/35 tests |
| P1 Test Pass Rate | 100% | 25/25 tests |
| P2 Test Pass Rate | 90%+ | 5+/5 tests |
| Regression Tests | 0 failures | All existing tests pass |
| Bundle Size | < +5KB | Measure before/after |

---

## Sign-Off

- [ ] Plan reviewed
- [ ] Acceptance criteria agreed
- [ ] Test strategy approved
- [ ] Ready to implement

---

*Phase 6.3 Implementation Plan - AlternativeGraphBuilder*
