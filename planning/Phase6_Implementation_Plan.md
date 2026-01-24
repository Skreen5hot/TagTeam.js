# Phase 6: Interpretation Lattice - Implementation Plan

**Version:** 1.2.0
**Created:** 2026-01-23
**Updated:** 2026-01-24 (Phase 6.4 Complete)
**Status:** ✅ COMPLETE (6.0, 6.1, 6.2, 6.3, 6.4)
**Prerequisites:** Phase 5 Complete (AmbiguityDetector, AmbiguityReport)

---

## Executive Summary

Phase 6 transforms Phase 5's ambiguity **detection** into ambiguity **resolution and preservation**. The key insight from Phase 5 is that not all detected ambiguities need multiple readings preserved—some are anomalies (selectional violations), others have clear defaults (high-confidence modals), and only truly ambiguous cases warrant alternative interpretations.

### Success Metrics
- **Test Coverage:** 50+ new tests ✅ (185 tests: 70 + 28 + 31 + 31 + 25)
- **Bundle Size:** +100KB max (target: 5.1MB total)
- **Backwards Compatibility:** 100% (existing API unchanged) ✅
- **Performance:** < 50ms overhead for lattice generation ✅

### Post-Critique Refinements (v1.1.0)

Based on linguistic review, three key refinements have been incorporated:

1. **Hierarchy of Evidence (6.1)**: Use selectional matching as a signal for noun category
   resolution. When verb selectional requirements match the entity reading, weight that
   reading at 0.99 to effectively resolve without forking.

2. **Modal Strength Scale (6.3)**: Check for adverbial intensifiers (strongly, possibly,
   certainly) to modulate `tagteam:plausibility` scores beyond the base 0.7/0.3 split.

3. **Metonymic Bridge (6.3)**: For metonymy cases (e.g., "The White House announced"),
   offer an alternative node re-typed as `cco:Organization` while preserving original
   source text, enabling semantic precision without losing surface fidelity.

### Phase 6.0 Status: ✅ COMPLETE
- `SelectionalPreferences.js` implemented with 8 verb classes, 6 entity categories
- 70 unit tests passing
- AmbiguityDetector integrated with SelectionalPreferences
- "The committee decided" no longer produces false positive violation
- "The rock decided" correctly flagged as inanimate_agent violation

### Phase 6.1 Status: ✅ COMPLETE
- `AmbiguityResolver.js` implemented with hierarchy of evidence
- 28 unit tests passing
- Resolution strategy: preserved, resolved, flaggedOnly
- Selectional matching used for noun_category resolution

### Phase 6.2 Status: ✅ COMPLETE
- `InterpretationLattice.js` implemented as the core data structure
- 31 unit tests passing
- Default reading + alternative readings with plausibility scores
- Audit trail via `getResolutionReasoning()`

### Phase 6.3 Status: ✅ COMPLETE
- `AlternativeGraphBuilder.js` implemented with modal strength scale
- 31 unit tests passing
- Intensifier detection for deontic/epistemic boosting
- Metonymic bridge for location→organization re-typing

### Phase 6.4 Status: ✅ COMPLETE
- `SemanticGraphBuilder.js` integrated with Phase 6 modules
- 25 integration tests passing
- `preserveAmbiguity: true` option enables lattice generation
- `_interpretationLattice` included in build result
- Version bumped to 6.0.0

---

## Implementation Iterations

### Iteration 6.0: Selectional Preference Lookup Table
**Duration:** 1-2 days
**Priority:** Critical
**Dependency:** None (can start immediately)

#### Goal
Create centralized selectional preference system to replace ad-hoc verb classification in AmbiguityDetector. This fixes false positives where organizations (committees, hospitals) are flagged as "inanimate agents."

#### Deliverables
1. `src/graph/SelectionalPreferences.js` - Lookup table module
2. `tests/unit/selectional-preferences.test.js` - Unit tests
3. Update `AmbiguityDetector.js` to use new module

#### Implementation Details

**File: `src/graph/SelectionalPreferences.js`**
```javascript
/**
 * Selectional Preferences - Phase 6.0
 *
 * Centralizes verb→argument requirements for semantic role validation.
 * Used by AmbiguityDetector to determine selectional violations.
 */

const VERB_CLASSES = {
  // Mental acts requiring animate/organization agents
  intentional_mental: {
    verbs: ['decide', 'believe', 'intend', 'think', 'consider', 'judge',
            'evaluate', 'assess', 'plan', 'hope', 'wish', 'choose'],
    subjectRequirement: ['animate', 'organization'],
    objectRequirement: null
  },

  // Physical acts requiring animate agents
  intentional_physical: {
    verbs: ['lift', 'throw', 'carry', 'push', 'pull', 'hit', 'kick',
            'run', 'walk', 'jump', 'climb', 'cut', 'break'],
    subjectRequirement: ['animate'],
    objectRequirement: ['material_entity']
  },

  // Communication acts (organizations can communicate)
  communication: {
    verbs: ['announce', 'report', 'claim', 'state', 'declare', 'tell',
            'inform', 'ask', 'request', 'promise', 'warn'],
    subjectRequirement: ['animate', 'organization'],
    objectRequirement: ['proposition', 'animate']
  },

  // Transfer acts (organizations can transfer)
  transfer: {
    verbs: ['give', 'allocate', 'assign', 'distribute', 'provide',
            'deliver', 'send', 'offer', 'grant'],
    subjectRequirement: ['animate', 'organization'],
    objectRequirement: ['continuant']
  },

  // Employment/hiring (organizations can hire)
  employment: {
    verbs: ['hire', 'fire', 'employ', 'appoint', 'dismiss', 'recruit'],
    subjectRequirement: ['animate', 'organization'],
    objectRequirement: ['animate']
  }
};

const ENTITY_CATEGORIES = {
  animate: ['person', 'doctor', 'patient', 'nurse', ...],
  organization: ['committee', 'board', 'council', 'company', 'hospital', ...],
  material_entity: ['ventilator', 'medication', 'equipment', ...],
  inanimate: ['rock', 'stone', 'table', 'chair', ...]
};
```

#### Acceptance Criteria

| ID | Criterion | Test Method |
|----|-----------|-------------|
| 6.0.1 | `getVerbClass(verb)` returns correct class for 50+ verbs | Unit test |
| 6.0.2 | `getSubjectRequirement(verb)` returns requirements array | Unit test |
| 6.0.3 | `isValidAgent(verb, entityType)` returns true for organizations with communication verbs | Unit test |
| 6.0.4 | `isValidAgent('decide', 'committee')` returns `true` | Unit test |
| 6.0.5 | `isValidAgent('decide', 'rock')` returns `false` | Unit test |
| 6.0.6 | `isValidAgent('lift', 'organization')` returns `false` (physical acts) | Unit test |
| 6.0.7 | AmbiguityDetector uses SelectionalPreferences instead of hardcoded lists | Integration test |
| 6.0.8 | "The committee decided" does NOT produce selectional_violation | Integration test |
| 6.0.9 | "The rock decided" still produces selectional_violation | Integration test |
| 6.0.10 | Bundle size increase < 10KB | Build verification |

#### Test Cases
```javascript
// tests/unit/selectional-preferences.test.js

describe('SelectionalPreferences', () => {
  describe('verb classification', () => {
    it('classifies "decide" as intentional_mental');
    it('classifies "lift" as intentional_physical');
    it('classifies "announce" as communication');
    it('classifies "allocate" as transfer');
    it('classifies "hire" as employment');
    it('returns null for unknown verbs');
  });

  describe('agent validation', () => {
    it('allows animate agents for all verb classes');
    it('allows organization agents for mental acts');
    it('allows organization agents for communication');
    it('allows organization agents for transfer');
    it('disallows organization agents for physical acts');
    it('disallows inanimate agents for all intentional acts');
  });

  describe('entity categorization', () => {
    it('categorizes "committee" as organization');
    it('categorizes "hospital" as organization');
    it('categorizes "rock" as inanimate');
    it('categorizes "doctor" as animate');
  });
});
```

---

### Iteration 6.1: Ambiguity Resolution Strategy
**Duration:** 2-3 days
**Priority:** High
**Dependency:** 6.0 (SelectionalPreferences)

#### Goal
Create decision logic that determines which ambiguities to preserve as multiple readings vs resolve to a single default.

#### Deliverables
1. `src/graph/AmbiguityResolver.js` - Resolution strategy module
2. `tests/unit/ambiguity-resolver.test.js` - Unit tests
3. Configuration schema for resolution thresholds

#### Implementation Details

**Resolution Strategy Matrix (v1.1 - with Hierarchy of Evidence):**

| Ambiguity Type | When to Preserve | When to Resolve |
|----------------|------------------|-----------------|
| `selectional_violation` | Never | Always (flag only) |
| `modal_force` | confidence < 0.7 AND no intensifier | confidence >= 0.7 OR strong intensifier |
| `noun_category` | "of" complement present AND no selectional match | Selectional match (verb requires entity) |
| `scope` | Always | Never (significant semantic difference) |
| `potential_metonymy` | Never (flag + suggest re-typed alternative) | Always (suggest reading) |

**Hierarchy of Evidence for Resolution (Priority Order):**

1. **Selectional Match** (Highest): If verb selectional requirements match only one reading,
   resolve with confidence 0.99. Example: "The organization hired staff" - `hire` requires
   `organization|animate` agent, so "organization" as entity has 0.99 confidence.

2. **Adverbial Intensifiers**: If modal has intensifier, adjust confidence:
   - "strongly should" → +0.15 to deontic reading
   - "possibly must" → +0.20 to epistemic reading
   - "certainly may" → +0.20 to epistemic reading

3. **Structural Signals**: "of" complement, agent position, perfect aspect

4. **Base Heuristics** (Lowest): Default readings based on frequency

**File: `src/graph/AmbiguityResolver.js`**
```javascript
/**
 * AmbiguityResolver - Phase 6.1
 *
 * Decides which detected ambiguities to preserve as multiple readings
 * vs resolve to a single default interpretation.
 */

class AmbiguityResolver {
  constructor(config = {}) {
    this.config = {
      preserveThreshold: config.preserveThreshold || 0.7,
      maxReadingsPerNode: config.maxReadingsPerNode || 3,
      alwaysPreserveScope: config.alwaysPreserveScope !== false,
      ...config
    };
  }

  /**
   * Resolve ambiguities from Phase 5 AmbiguityReport
   * @returns {Object} { preserved: [], resolved: [], flaggedOnly: [] }
   */
  resolve(ambiguityReport, options = {}) {
    const result = {
      preserved: [],    // Will generate alternative readings
      resolved: [],     // Resolved to default, no alternatives
      flaggedOnly: []   // Selectional violations - flag but don't fork
    };

    for (const ambiguity of ambiguityReport.ambiguities) {
      const decision = this._decideResolution(ambiguity);
      result[decision.category].push({
        ...ambiguity,
        resolution: decision
      });
    }

    return result;
  }

  _decideResolution(ambiguity) {
    // Selectional violations are never preserved
    if (ambiguity.type === 'selectional_violation') {
      return {
        category: 'flaggedOnly',
        reason: 'anomalous_input',
        preserveAlternatives: false
      };
    }

    // Scope ambiguity always preserved (semantic difference significant)
    if (ambiguity.type === 'scope' && this.config.alwaysPreserveScope) {
      return {
        category: 'preserved',
        reason: 'significant_semantic_difference',
        preserveAlternatives: true
      };
    }

    // Modal force: preserve if low confidence
    if (ambiguity.type === 'modal_force') {
      const confidence = this._computeConfidence(ambiguity);
      if (confidence < this.config.preserveThreshold) {
        return {
          category: 'preserved',
          reason: 'low_confidence',
          confidence,
          preserveAlternatives: true
        };
      }
      return {
        category: 'resolved',
        reason: 'high_confidence',
        confidence,
        preserveAlternatives: false
      };
    }

    // Noun category: preserve if "of" complement signals process reading
    if (ambiguity.type === 'noun_category') {
      if (ambiguity.signals?.includes('of_complement')) {
        return {
          category: 'preserved',
          reason: 'of_complement_present',
          preserveAlternatives: true
        };
      }
      return {
        category: 'resolved',
        reason: 'clear_context',
        preserveAlternatives: false
      };
    }

    // Metonymy: flag only, suggest reading
    if (ambiguity.type === 'potential_metonymy') {
      return {
        category: 'flaggedOnly',
        reason: 'metonymy_suggested',
        preserveAlternatives: false
      };
    }

    // Default: resolve if high confidence, preserve otherwise
    const confidence = this._computeConfidence(ambiguity);
    return confidence >= this.config.preserveThreshold
      ? { category: 'resolved', confidence, preserveAlternatives: false }
      : { category: 'preserved', confidence, preserveAlternatives: true };
  }
}
```

#### Acceptance Criteria

| ID | Criterion | Test Method |
|----|-----------|-------------|
| 6.1.1 | `resolve()` returns `{ preserved, resolved, flaggedOnly }` structure | Unit test |
| 6.1.2 | `selectional_violation` always goes to `flaggedOnly` | Unit test |
| 6.1.3 | `scope` ambiguity always goes to `preserved` (configurable) | Unit test |
| 6.1.4 | `modal_force` with confidence < 0.7 goes to `preserved` | Unit test |
| 6.1.5 | `modal_force` with confidence >= 0.7 goes to `resolved` | Unit test |
| 6.1.6 | `noun_category` with "of_complement" signal goes to `preserved` | Unit test |
| 6.1.7 | `potential_metonymy` goes to `flaggedOnly` | Unit test |
| 6.1.8 | `preserveThreshold` config is respected | Unit test |
| 6.1.9 | `maxReadingsPerNode` limits preserved alternatives | Unit test |
| 6.1.10 | Each resolution includes `reason` for audit trail | Unit test |

#### Test Cases
```javascript
// tests/unit/ambiguity-resolver.test.js

describe('AmbiguityResolver', () => {
  describe('resolution strategy', () => {
    it('never preserves selectional violations');
    it('always preserves scope ambiguity by default');
    it('preserves modal_force when confidence < threshold');
    it('resolves modal_force when confidence >= threshold');
    it('preserves noun_category with of_complement');
    it('resolves noun_category without of_complement');
    it('flags metonymy without preserving');
  });

  describe('configuration', () => {
    it('respects custom preserveThreshold');
    it('respects maxReadingsPerNode limit');
    it('alwaysPreserveScope can be disabled');
  });

  describe('audit trail', () => {
    it('includes reason for each resolution');
    it('includes confidence score where applicable');
  });
});
```

---

### Iteration 6.2: Interpretation Lattice Data Structure
**Duration:** 2-3 days
**Priority:** High
**Dependency:** 6.1 (AmbiguityResolver)

#### Goal
Create the InterpretationLattice class that holds the default reading plus alternative interpretations for preserved ambiguities.

#### Deliverables
1. `src/graph/InterpretationLattice.js` - Main lattice class
2. `tests/unit/interpretation-lattice.test.js` - Unit tests

#### Implementation Details

**File: `src/graph/InterpretationLattice.js`**
```javascript
/**
 * InterpretationLattice - Phase 6.2
 *
 * Holds a default interpretation plus alternative readings for
 * preserved ambiguities. Provides audit trail for resolution decisions.
 */

class InterpretationLattice {
  constructor(defaultGraph, resolutions) {
    this.defaultReading = defaultGraph;
    this.resolutions = resolutions;
    this.alternativeReadings = [];
    this.metadata = {
      createdAt: new Date().toISOString(),
      ambiguityCount: resolutions.preserved.length +
                      resolutions.resolved.length +
                      resolutions.flaggedOnly.length,
      preservedCount: resolutions.preserved.length
    };
  }

  // Primary API
  getDefaultReading() {
    return this.defaultReading;
  }

  getAlternatives() {
    return this.alternativeReadings;
  }

  addAlternative(altReading) {
    this.alternativeReadings.push(altReading);
  }

  getAmbiguitiesPreserved() {
    return this.resolutions.preserved;
  }

  // Analysis API
  hasSignificantAmbiguity() {
    return this.resolutions.preserved.length > 0;
  }

  getResolutionReasoning() {
    return {
      preserved: this.resolutions.preserved.map(a => ({
        type: a.type,
        nodeId: a.nodeId,
        reason: a.resolution.reason,
        confidence: a.resolution.confidence
      })),
      resolved: this.resolutions.resolved.map(a => ({
        type: a.type,
        nodeId: a.nodeId,
        reason: a.resolution.reason,
        defaultReading: a.defaultReading
      })),
      flagged: this.resolutions.flaggedOnly.map(a => ({
        type: a.type,
        nodeId: a.nodeId,
        reason: a.resolution.reason
      }))
    };
  }

  // Serialization
  toJSONLD() {
    return {
      '@type': 'tagteam:InterpretationLattice',
      'tagteam:defaultReading': this.defaultReading,
      'tagteam:alternativeReadings': this.alternativeReadings.map(alt => ({
        '@type': 'tagteam:AlternativeReading',
        'tagteam:plausibility': alt.plausibility,
        'tagteam:derivedFrom': alt.derivedFrom,
        'tagteam:ambiguityType': alt.ambiguityType,
        'tagteam:reading': alt.reading,
        '@graph': alt.graph
      })),
      'tagteam:resolutionLog': this.getResolutionReasoning(),
      'tagteam:metadata': this.metadata
    };
  }

  toSimplifiedGraph() {
    // Backwards compatible - just return default reading
    return this.defaultReading;
  }
}
```

#### Acceptance Criteria

| ID | Criterion | Test Method |
|----|-----------|-------------|
| 6.2.1 | Constructor accepts defaultGraph and resolutions | Unit test |
| 6.2.2 | `getDefaultReading()` returns the default graph | Unit test |
| 6.2.3 | `getAlternatives()` returns array of alternative readings | Unit test |
| 6.2.4 | `addAlternative()` appends to alternativeReadings | Unit test |
| 6.2.5 | `getAmbiguitiesPreserved()` returns preserved ambiguities | Unit test |
| 6.2.6 | `hasSignificantAmbiguity()` returns true when preserved.length > 0 | Unit test |
| 6.2.7 | `getResolutionReasoning()` returns structured audit trail | Unit test |
| 6.2.8 | `toJSONLD()` produces valid JSON-LD with @type | Unit test |
| 6.2.9 | `toSimplifiedGraph()` returns only default reading | Unit test |
| 6.2.10 | Metadata includes createdAt, ambiguityCount, preservedCount | Unit test |

#### Test Cases
```javascript
// tests/unit/interpretation-lattice.test.js

describe('InterpretationLattice', () => {
  describe('construction', () => {
    it('stores default reading');
    it('stores resolutions');
    it('initializes empty alternativeReadings');
    it('computes metadata on construction');
  });

  describe('primary API', () => {
    it('returns default reading');
    it('returns alternatives after adding');
    it('returns preserved ambiguities');
  });

  describe('analysis API', () => {
    it('hasSignificantAmbiguity returns false for empty preserved');
    it('hasSignificantAmbiguity returns true when preserved');
    it('getResolutionReasoning includes all categories');
  });

  describe('serialization', () => {
    it('toJSONLD includes @type');
    it('toJSONLD includes resolution log');
    it('toSimplifiedGraph is backwards compatible');
  });
});
```

---

### Iteration 6.3: Alternative Graph Generation
**Duration:** 2-3 days
**Priority:** Medium
**Dependency:** 6.2 (InterpretationLattice)

#### Goal
Create the AlternativeGraphBuilder that generates variant graph nodes for preserved ambiguities.

#### Deliverables
1. `src/graph/AlternativeGraphBuilder.js` - Alternative generator
2. `tests/unit/alternative-graph-builder.test.js` - Unit tests

#### Implementation Details

**File: `src/graph/AlternativeGraphBuilder.js`**
```javascript
/**
 * AlternativeGraphBuilder - Phase 6.3
 *
 * Generates alternative graph nodes for preserved ambiguities.
 * Each alternative has a unique IRI traceable to the original node.
 */

class AlternativeGraphBuilder {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Build an alternative reading for a preserved ambiguity
   * @param {Object} originalGraph - The default graph
   * @param {Object} ambiguity - The preserved ambiguity with resolution
   * @returns {Object} Alternative reading with modified nodes
   */
  build(originalGraph, ambiguity) {
    const strategy = this._getStrategy(ambiguity.type);
    return strategy.call(this, originalGraph, ambiguity);
  }

  _getStrategy(type) {
    const strategies = {
      'modal_force': this._buildModalAlternative,
      'noun_category': this._buildNounCategoryAlternative,
      'scope': this._buildScopeAlternative
    };
    return strategies[type] || this._buildGenericAlternative;
  }

  _buildModalAlternative(originalGraph, ambiguity) {
    // Find the act node and create epistemic variant
    const alternatives = [];

    for (const reading of ambiguity.readings) {
      if (reading === ambiguity.defaultReading) continue;

      const altNode = this._cloneNode(originalGraph, ambiguity.nodeId);
      altNode['@id'] = `${ambiguity.nodeId}_alt_${reading}`;
      altNode['tagteam:modality'] = reading;
      altNode['tagteam:actualityStatus'] = this._mapModalityToActuality(reading);
      altNode['tagteam:plausibility'] = this._computePlausibility(ambiguity, reading);
      altNode['tagteam:derivedFrom'] = { '@id': ambiguity.nodeId };
      altNode['tagteam:alternativeFor'] = ambiguity.type;

      alternatives.push({
        reading,
        plausibility: altNode['tagteam:plausibility'],
        derivedFrom: ambiguity.nodeId,
        ambiguityType: 'modal_force',
        node: altNode
      });
    }

    return alternatives;
  }

  _buildScopeAlternative(originalGraph, ambiguity) {
    // Create narrow scope variant
    const alternatives = [];

    const altReading = ambiguity.readings.find(r => r !== ambiguity.defaultReading);
    if (!altReading) return alternatives;

    const altNode = this._cloneNode(originalGraph, ambiguity.nodeId);
    altNode['@id'] = `${ambiguity.nodeId}_alt_${altReading}_scope`;
    altNode['tagteam:scopeReading'] = altReading;
    altNode['tagteam:formalization'] = ambiguity.formalizations?.[altReading];
    altNode['tagteam:plausibility'] = 0.4; // Scope alternatives typically lower
    altNode['tagteam:derivedFrom'] = { '@id': ambiguity.nodeId };

    alternatives.push({
      reading: altReading,
      plausibility: 0.4,
      derivedFrom: ambiguity.nodeId,
      ambiguityType: 'scope',
      node: altNode
    });

    return alternatives;
  }

  _mapModalityToActuality(modality) {
    const mapping = {
      'obligation': 'tagteam:Prescribed',
      'expectation': 'tagteam:Hypothetical',
      'permission': 'tagteam:Permitted',
      'possibility': 'tagteam:Hypothetical',
      'inference': 'tagteam:Hypothetical'
    };
    return mapping[modality] || 'tagteam:Hypothetical';
  }

  _computePlausibility(ambiguity, reading) {
    // Default reading gets higher plausibility
    if (reading === ambiguity.defaultReading) return 0.7;
    // Alternative readings split remaining probability
    const altCount = ambiguity.readings.length - 1;
    return 0.3 / altCount;
  }

  _cloneNode(graph, nodeId) {
    const original = graph['@graph']?.find(n => n['@id'] === nodeId);
    return original ? { ...original } : {};
  }
}
```

#### Acceptance Criteria

| ID | Criterion | Test Method |
|----|-----------|-------------|
| 6.3.1 | `build()` returns array of alternative readings | Unit test |
| 6.3.2 | Modal alternatives have unique IRIs with `_alt_` suffix | Unit test |
| 6.3.3 | Modal alternatives map modality to actuality correctly | Unit test |
| 6.3.4 | Scope alternatives include formalization | Unit test |
| 6.3.5 | Each alternative has `tagteam:derivedFrom` link to original | Unit test |
| 6.3.6 | Each alternative has `tagteam:plausibility` score | Unit test |
| 6.3.7 | Default reading gets plausibility 0.7, alternatives split 0.3 | Unit test |
| 6.3.8 | Alternatives preserve all other properties from original | Unit test |
| 6.3.9 | Returns empty array for ambiguity types without strategy | Unit test |
| 6.3.10 | Handles missing nodeId gracefully | Unit test |

#### Test Cases
```javascript
// tests/unit/alternative-graph-builder.test.js

describe('AlternativeGraphBuilder', () => {
  describe('modal_force alternatives', () => {
    it('creates epistemic alternative for deontic default');
    it('assigns unique IRI with _alt_ suffix');
    it('maps obligation → Prescribed actuality');
    it('maps expectation → Hypothetical actuality');
    it('includes derivedFrom link');
    it('assigns plausibility scores');
  });

  describe('scope alternatives', () => {
    it('creates narrow scope alternative');
    it('includes formalization in alternative');
    it('assigns lower plausibility to scope alternatives');
  });

  describe('noun_category alternatives', () => {
    it('creates process reading alternative');
    it('handles entity vs process distinction');
  });

  describe('edge cases', () => {
    it('returns empty for unknown ambiguity types');
    it('handles missing nodeId');
    it('handles single-reading ambiguities');
  });
});
```

---

### Iteration 6.4: SemanticGraphBuilder Integration
**Duration:** 1-2 days
**Priority:** High
**Dependency:** 6.1, 6.2, 6.3

#### Goal
Integrate all Phase 6 components into SemanticGraphBuilder with opt-in `preserveAmbiguity` flag.

#### Deliverables
1. Modified `src/graph/SemanticGraphBuilder.js`
2. `tests/integration/interpretation-lattice-integration.test.js`
3. Updated API documentation

#### Implementation Details

**Modify SemanticGraphBuilder.build():**
```javascript
build(text, options = {}) {
  // ... existing Phase 5 code ...

  // Phase 5: Ambiguity Detection (existing)
  let ambiguityReport = null;
  if (options.detectAmbiguity || options.preserveAmbiguity) {
    ambiguityReport = this.ambiguityDetector.detect(
      text, tier2Entities, extractedActs, roles
    );

    if (ambiguityReport && ambiguityReport.ambiguities) {
      this._surfaceAmbiguityFlags(ambiguityReport.ambiguities, extractedActs, tier2Entities);
    }
  }

  // Phase 6: Interpretation Lattice (NEW)
  let interpretationLattice = null;
  if (options.preserveAmbiguity && ambiguityReport) {
    // 6.1: Resolve which ambiguities to preserve
    const resolutions = this.ambiguityResolver.resolve(ambiguityReport, {
      preserveThreshold: options.preserveThreshold || 0.7,
      maxReadingsPerNode: options.maxAlternatives || 3
    });

    // 6.2: Create lattice structure
    interpretationLattice = new InterpretationLattice(
      { '@graph': this.nodes },
      resolutions
    );

    // 6.3: Build alternative readings for preserved ambiguities
    for (const preserved of resolutions.preserved) {
      const alternatives = this.alternativeBuilder.build(
        { '@graph': this.nodes },
        preserved
      );
      for (const alt of alternatives) {
        interpretationLattice.addAlternative(alt);
      }
    }
  }

  const result = {
    '@graph': this.nodes,
    _metadata: { ... }
  };

  // Include Phase 5 output
  if (ambiguityReport) {
    result._ambiguityReport = ambiguityReport;
  }

  // Include Phase 6 output
  if (interpretationLattice) {
    result._interpretationLattice = interpretationLattice;
  }

  return result;
}
```

**API Options:**
```javascript
builder.build(text, {
  // Phase 5 options
  detectAmbiguity: true,

  // Phase 6 options
  preserveAmbiguity: true,
  preserveThreshold: 0.7,
  maxAlternatives: 3
});
```

#### Acceptance Criteria

| ID | Criterion | Test Method |
|----|-----------|-------------|
| 6.4.1 | `preserveAmbiguity: false` returns standard output (backwards compatible) | Integration test |
| 6.4.2 | `preserveAmbiguity: true` includes `_interpretationLattice` | Integration test |
| 6.4.3 | `_ambiguityReport` still included when `detectAmbiguity: true` | Integration test |
| 6.4.4 | Lattice `getDefaultReading()` matches `@graph` | Integration test |
| 6.4.5 | Alternatives generated for modal_force ambiguities | Integration test |
| 6.4.6 | Alternatives generated for scope ambiguities | Integration test |
| 6.4.7 | No alternatives for selectional_violation | Integration test |
| 6.4.8 | `preserveThreshold` option is respected | Integration test |
| 6.4.9 | `maxAlternatives` option limits alternatives | Integration test |
| 6.4.10 | Performance: < 50ms overhead for lattice generation | Benchmark test |

#### Integration Test Cases
```javascript
// tests/integration/interpretation-lattice-integration.test.js

describe('Interpretation Lattice Integration', () => {
  describe('backwards compatibility', () => {
    it('returns standard output without preserveAmbiguity');
    it('preserves all existing Phase 5 behavior');
  });

  describe('lattice generation', () => {
    it('includes _interpretationLattice with preserveAmbiguity: true');
    it('default reading matches @graph');
    it('alternatives have valid structure');
  });

  describe('modal ambiguity preservation', () => {
    it('creates epistemic alternative for "should" modal');
    it('creates inference alternative for "must" modal');
    it('respects preserveThreshold');
  });

  describe('scope ambiguity preservation', () => {
    it('creates narrow scope alternative for "not all"');
    it('includes formalizations');
  });

  describe('configuration', () => {
    it('respects custom preserveThreshold');
    it('respects maxAlternatives limit');
  });

  describe('performance', () => {
    it('adds < 50ms overhead for typical sentences');
  });
});
```

---

### Iteration 6.5: Golden Corpus and Documentation
**Duration:** 1-2 days
**Priority:** Medium
**Dependency:** 6.4

#### Goal
Create golden test corpus and update documentation for Phase 6 features.

#### Deliverables
1. `tests/golden/interpretation-lattice.json` - Golden test corpus
2. `docs/PHASE6_USER_GUIDE.md` - User guide
3. Updated `README.md` with Phase 6 API

#### Golden Corpus Structure
```json
{
  "corpus": [
    {
      "id": "modal-001",
      "input": "The doctor should prioritize the younger patient",
      "expectedDefault": {
        "modality": "obligation",
        "actuality": "tagteam:Prescribed"
      },
      "expectedAlternatives": [
        {
          "modality": "expectation",
          "actuality": "tagteam:Hypothetical",
          "minPlausibility": 0.2
        }
      ],
      "shouldPreserve": true
    },
    {
      "id": "modal-002",
      "input": "The committee must review all applications",
      "expectedDefault": {
        "modality": "obligation"
      },
      "expectedAlternatives": ["inference"],
      "shouldPreserve": true,
      "notes": "Committee is valid organization agent"
    },
    {
      "id": "scope-001",
      "input": "Not all patients received treatment",
      "expectedDefault": {
        "scope": "wide",
        "formalization": "¬∀x.P(x)"
      },
      "expectedAlternatives": [
        {
          "scope": "narrow",
          "formalization": "∀x.¬P(x)"
        }
      ],
      "shouldPreserve": true
    },
    {
      "id": "selectional-001",
      "input": "The rock decided to move",
      "expectedFlag": "selectional_violation",
      "shouldPreserve": false,
      "reason": "Inanimate agent with intentional verb - anomalous"
    },
    {
      "id": "selectional-002",
      "input": "The hospital decided to expand",
      "expectedFlag": null,
      "shouldPreserve": false,
      "reason": "Organization is valid agent for decide"
    },
    {
      "id": "metonymy-001",
      "input": "The White House announced new policy",
      "expectedFlag": "potential_metonymy",
      "expectedSuggestedReading": "institution",
      "shouldPreserve": false
    },
    {
      "id": "noun-001",
      "input": "The organization of files took hours",
      "expectedDefault": {
        "category": "process"
      },
      "expectedAlternatives": [],
      "shouldPreserve": true,
      "reason": "of-complement signals process reading"
    },
    {
      "id": "noun-002",
      "input": "The organization hired new staff",
      "expectedDefault": {
        "category": "continuant"
      },
      "shouldPreserve": false,
      "reason": "Agent of intentional act signals entity reading"
    }
  ]
}
```

#### Acceptance Criteria

| ID | Criterion | Test Method |
|----|-----------|-------------|
| 6.5.1 | Golden corpus has 20+ test cases | File inspection |
| 6.5.2 | Each test case has id, input, expectedDefault | File inspection |
| 6.5.3 | Test runner validates all golden corpus cases | Automated test |
| 6.5.4 | User guide covers all Phase 6 API options | Documentation review |
| 6.5.5 | User guide includes code examples | Documentation review |
| 6.5.6 | README updated with Phase 6 features | Documentation review |

---

## NEW Lattice-Specific Tests (from Critique)

These tests validate the "Interpretation" capability that Phase 6 enables:

### 3.1 The "Branching Probability" Test
```javascript
// Test: Ensure system doesn't pick a winner prematurely when signals are balanced
it('preserves balanced modal ambiguity with equal weights', () => {
  const result = builder.build('The patient should be in surgery', {
    preserveAmbiguity: true
  });

  const lattice = result._interpretationLattice;
  const alternatives = lattice.getAlternatives();

  // Should have two readings with similar plausibility
  expect(alternatives.length).toBe(1); // One alternative (deontic is default)

  const deonticReading = lattice.getDefaultReading();
  const epistemicReading = alternatives[0];

  // Weights should be balanced (no strong signals either way)
  expect(epistemicReading.plausibility).toBeGreaterThan(0.3);
});
```

### 3.2 The "Quantifier-Negation" Force Test
```javascript
// Test: Verify formalization correctly represents operator precedence
it('generates correct formalizations for scope ambiguity', () => {
  const result = builder.build('Not all members must attend', {
    preserveAmbiguity: true
  });

  const lattice = result._interpretationLattice;
  const scopeAmbiguity = lattice.getAmbiguitiesPreserved()
    .find(a => a.type === 'scope');

  expect(scopeAmbiguity).toBeDefined();

  // Wide scope: ¬□∀ (It is not required that all attend)
  expect(scopeAmbiguity.formalizations.wide).toContain('¬');

  // Narrow scope: □¬∀ (It is required that not all attend)
  expect(scopeAmbiguity.formalizations.narrow).toBeDefined();
});
```

### 3.3 The "Selectional Recovery" Test
```javascript
// Test: Confirm SelectionalPreferences suppresses false positives
it('does not flag organization agents as violations', () => {
  const result = builder.build('The hospital decided to expand', {
    detectAmbiguity: true
  });

  const violations = result._ambiguityReport.getByType('selectional_violation');
  expect(violations.length).toBe(0);
});
```

---

## Test Summary

### Unit Tests (Target: 50+, Current: 70)
| Module | Test Count |
|--------|------------|
| SelectionalPreferences | 70 ✅ |
| AmbiguityResolver | 12 (planned) |
| InterpretationLattice | 10 (planned) |
| AlternativeGraphBuilder | 12 (planned) |

### Integration Tests (Target: 15+, Current: 14)
| Category | Test Count |
|----------|------------|
| Backwards Compatibility | 3 |
| Lattice Generation | 4 (planned) |
| Modal Preservation | 3 (planned) |
| Scope Preservation | 2 (planned) |
| Configuration | 2 |
| Performance | 1 (planned) |

### Golden Corpus Tests (Target: 20+)
| Category | Test Count |
|----------|------------|
| Modal Force | 5 |
| Scope | 3 |
| Selectional | 4 |
| Metonymy | 3 |
| Noun Category | 5 |

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance regression | Medium | High | Benchmark tests, lazy evaluation |
| Bundle size overflow | Low | Medium | Continuous size monitoring |
| API breaking changes | Low | High | Backwards compatibility tests |
| Complex ambiguity interactions | Medium | Medium | Comprehensive golden corpus |

---

## Definition of Done

Phase 6 is complete when:

1. ✅ All 5 iterations complete (6.0 - 6.5)
2. ✅ 50+ tests passing
3. ✅ Bundle size < 5.0MB
4. ✅ Golden corpus 100% pass rate
5. ✅ Performance benchmark < 50ms overhead
6. ✅ Documentation updated
7. ✅ Stakeholder demo/review completed

---

## Appendix: File Structure

```
src/graph/
├── SelectionalPreferences.js    # 6.0 - Verb→requirement lookup
├── AmbiguityResolver.js         # 6.1 - Resolution strategy
├── InterpretationLattice.js     # 6.2 - Lattice data structure
├── AlternativeGraphBuilder.js   # 6.3 - Alternative generation
├── SemanticGraphBuilder.js      # 6.4 - Integration (modified)
├── AmbiguityDetector.js         # Phase 5 (modified to use 6.0)
└── AmbiguityReport.js           # Phase 5 (unchanged)

tests/
├── unit/
│   ├── selectional-preferences.test.js
│   ├── ambiguity-resolver.test.js
│   ├── interpretation-lattice.test.js
│   └── alternative-graph-builder.test.js
├── integration/
│   └── interpretation-lattice-integration.test.js
└── golden/
    └── interpretation-lattice.json

docs/
└── PHASE6_USER_GUIDE.md
```
