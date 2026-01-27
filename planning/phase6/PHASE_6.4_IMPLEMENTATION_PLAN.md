# Phase 6.4 Implementation Plan: Builder Integration + Deontic Enhancement

**Version:** 1.0
**Created:** 2026-01-26
**Status:** Planning
**Priority:** High
**Effort:** Medium

---

## Overview

### What is Phase 6.4?

Phase 6.4 brings together all Phase 6 components into SemanticGraphBuilder and extends the deontic vocabulary based on research into BFO-based deontic ontologies.

**Two Main Goals:**
1. **Builder Integration:** Wire up AmbiguityResolver, InterpretationLattice, and AlternativeGraphBuilder into SemanticGraphBuilder with opt-in `preserveAmbiguity` API
2. **Deontic Enhancement:** Extend deontic vocabulary to support prohibition, claim, power, and better modal disambiguation

### Why Deontic Enhancement?

Based on research into [Jonathan Vajda's CCO D-Acts](https://github.com/jonathanvajda/cco-d-acts) and [Donohue's BFO-Based Deontic Ontology](https://www.semanticscholar.org/paper/Toward-a-BFO-Based-Deontic-Ontology-Donohue/d5014f0f29ae4d503ed6afb78e4c4e0b2f2e6135), ethical reasoning requires richer deontic vocabulary beyond obligation/permission.

**Current Coverage:**
| Deontic Concept | Modality | ActualityStatus | Status |
|-----------------|----------|-----------------|--------|
| Obligation | `obligation` | `tagteam:Prescribed` | ✅ Exists |
| Permission | `permission` | `tagteam:Permitted` | ✅ Exists |
| Prohibition | `prohibition` | `tagteam:Prohibited` | ✅ Exists |
| Recommendation | `recommendation` | `tagteam:Prescribed` | ✅ Exists |
| Claim/Right | ❌ | ❌ | **Gap** |
| Power/Authority | ❌ | ❌ | **Gap** |
| Entitlement | ❌ | ❌ | **Gap** |

---

## Architecture

### Integration Flow

```
User calls: builder.build(text, { preserveAmbiguity: true })
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SemanticGraphBuilder                           │
│  1. Parse text → graph nodes (existing)                         │
│  2. Detect ambiguities → AmbiguityReport (Phase 5)              │
│  3. Resolve ambiguities → ResolutionResult (Phase 6.1)          │
│  4. Build lattice → InterpretationLattice (Phase 6.2)          │
│  5. Generate alternatives → AlternativeGraphBuilder (Phase 6.3) │
│  6. Return result with _interpretationLattice                   │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
{
  '@graph': [...],                    // Default reading
  '_ambiguityReport': {...},          // Phase 5 output
  '_interpretationLattice': {...},    // Phase 6 output (new)
  '_metadata': { version, ... }
}
```

### Deontic Detection Flow

```
Text: "The physician is entitled to refuse treatment"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DeonticDetector (enhanced)                     │
│  1. Detect modal auxiliaries (existing)                         │
│  2. Detect deontic lexical markers (new)                        │
│  3. Classify deontic type (enhanced)                            │
│  4. Map to ActualityStatus (enhanced)                           │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
{
  "tagteam:modality": "claim",
  "tagteam:actualityStatus": "tagteam:Entitled",
  "tagteam:deonticType": "hohfeldian_claim"
}
```

---

## Part 1: Builder Integration

### API Design

```javascript
// Backwards compatible - no change
const result = builder.build(text);
// Returns: { '@graph': [...], '_metadata': {...} }

// Phase 5: Ambiguity detection
const result = builder.build(text, { detectAmbiguity: true });
// Returns: { '@graph': [...], '_ambiguityReport': {...}, '_metadata': {...} }

// Phase 6: Ambiguity preservation (NEW)
const result = builder.build(text, { preserveAmbiguity: true });
// Returns: {
//   '@graph': [...],                    // Default reading
//   '_ambiguityReport': {...},          // Phase 5 output
//   '_interpretationLattice': {...},    // Phase 6 output
//   '_metadata': { hasInterpretationLattice: true, ... }
// }
```

### Configuration Options

```javascript
builder.build(text, {
  // Phase 5 options
  detectAmbiguity: true,        // Enable ambiguity detection

  // Phase 6 options (new)
  preserveAmbiguity: true,      // Enable lattice generation
  preserveThreshold: 0.7,       // Confidence threshold for preservation
  maxAlternatives: 3,           // Max alternatives per ambiguity

  // Deontic options (new)
  detectDeontic: true,          // Enhanced deontic detection
  deonticVocabulary: 'extended' // 'basic' | 'extended' | 'hohfeldian'
});
```

### SemanticGraphBuilder Changes

```javascript
// In SemanticGraphBuilder.build()
build(text, options = {}) {
  // ... existing parsing logic ...

  // Phase 5: Detect ambiguities
  let ambiguityReport = null;
  if (options.detectAmbiguity || options.preserveAmbiguity) {
    ambiguityReport = this.ambiguityDetector.detect(this.nodes, text, parseResult);
  }

  // Phase 6: Resolve and preserve ambiguities (NEW)
  let interpretationLattice = null;
  if (options.preserveAmbiguity && ambiguityReport) {
    // 6.1: Resolve which ambiguities to preserve
    const resolutionResult = this.ambiguityResolver.resolve(ambiguityReport, {
      preserveThreshold: options.preserveThreshold || 0.7,
      maxReadingsPerNode: options.maxAlternatives || 3
    });

    // 6.2: Create lattice with default reading
    interpretationLattice = new InterpretationLattice(
      { '@graph': this.nodes },
      resolutionResult
    );

    // 6.3: Generate alternatives for preserved ambiguities
    const alternatives = this.alternativeBuilder.buildAlternatives(
      { '@graph': this.nodes },
      resolutionResult.preserved
    );

    // Add alternatives to lattice
    for (const alt of alternatives) {
      interpretationLattice.addAlternative(alt);
    }
  }

  // Build result
  const result = {
    '@context': this._buildContext(),
    '@graph': this.nodes,
    '_metadata': {
      version: '6.4.0',
      hasInterpretationLattice: !!interpretationLattice,
      ...
    }
  };

  if (ambiguityReport) {
    result._ambiguityReport = ambiguityReport;
  }

  if (interpretationLattice) {
    result._interpretationLattice = interpretationLattice;
  }

  return result;
}
```

---

## Part 2: Deontic Enhancement

### Extended Deontic Vocabulary

Based on Hohfeldian fundamental legal concepts and BFO-based deontic ontology research:

```javascript
/**
 * Extended Deontic Modality Mappings
 */
const EXTENDED_MODALITY_MAPPINGS = {
  // === Existing (obligation/permission/prohibition) ===

  // Obligation (duty to act)
  'must': 'obligation',
  'shall': 'obligation',          // Added - legal/formal
  'have to': 'obligation',
  'need to': 'obligation',
  'required': 'obligation',
  'obligated': 'obligation',      // Added
  'duty': 'obligation',           // Added - lexical

  // Permission (liberty to act)
  'may': 'permission',
  'can': 'permission',
  'allowed': 'permission',
  'permitted': 'permission',      // Added
  'free to': 'permission',        // Added

  // Prohibition (duty not to act)
  'must not': 'prohibition',
  'shall not': 'prohibition',     // Added - legal/formal
  'cannot': 'prohibition',
  'may not': 'prohibition',
  'forbidden': 'prohibition',     // Added
  'prohibited': 'prohibition',    // Added
  'not allowed': 'prohibition',   // Added

  // === New Deontic Types ===

  // Claim/Right (correlative of duty)
  'entitled': 'claim',
  'has right': 'claim',
  'has the right': 'claim',
  'deserves': 'claim',
  'owed': 'claim',
  'due': 'claim',

  // Power/Authority (ability to change normative relations)
  'authorize': 'power',
  'authorizes': 'power',
  'authorized': 'power',
  'empower': 'power',
  'empowers': 'power',
  'empowered': 'power',
  'delegate': 'power',
  'delegates': 'power',
  'grant': 'power',
  'grants': 'power',
  'confer': 'power',
  'confers': 'power',

  // Immunity (protection from power)
  'immune': 'immunity',
  'protected': 'immunity',
  'exempt': 'immunity',
  'exempted': 'immunity',

  // Recommendation (soft obligation)
  'should': 'recommendation',
  'ought': 'recommendation',
  'advisable': 'recommendation',
  'recommended': 'recommendation'
};
```

### Extended ActualityStatus Vocabulary

```javascript
/**
 * Extended Modality to ActualityStatus mapping
 */
const EXTENDED_MODALITY_TO_STATUS = {
  // Existing
  'obligation': 'tagteam:Prescribed',
  'permission': 'tagteam:Permitted',
  'prohibition': 'tagteam:Prohibited',
  'recommendation': 'tagteam:Prescribed',
  'intention': 'tagteam:Planned',
  'hypothetical': 'tagteam:Hypothetical',

  // New
  'claim': 'tagteam:Entitled',           // Right-holder status
  'power': 'tagteam:Empowered',          // Authority status
  'immunity': 'tagteam:Protected',       // Protection status
};
```

### Hohfeldian Relations (Optional Enhancement)

For advanced users who need full normative relation modeling:

```javascript
/**
 * Hohfeldian correlative pairs
 * If A has X, then B has Y (towards A)
 */
const HOHFELDIAN_CORRELATIVES = {
  'claim': 'duty',           // A's claim → B's duty
  'privilege': 'no_claim',   // A's privilege → B's no-claim
  'power': 'liability',      // A's power → B's liability
  'immunity': 'disability'   // A's immunity → B's disability
};

/**
 * Hohfeldian opposite pairs
 * A has X means A does NOT have Y
 */
const HOHFELDIAN_OPPOSITES = {
  'claim': 'no_claim',
  'privilege': 'duty',
  'power': 'disability',
  'immunity': 'liability'
};
```

### DeonticDetector Enhancement

```javascript
/**
 * Enhanced deontic detection for ActExtractor
 */
class DeonticDetector {
  constructor(options = {}) {
    this.vocabulary = options.vocabulary || 'extended'; // 'basic' | 'extended' | 'hohfeldian'
    this.mappings = this._getMappings();
  }

  /**
   * Detect deontic modality from text and verb data
   * @param {string} text - Source text
   * @param {Object} verbData - Parsed verb information
   * @returns {Object} Deontic detection result
   */
  detect(text, verbData) {
    const result = {
      modality: null,
      actualityStatus: null,
      deonticType: null,
      markers: [],
      confidence: 0
    };

    // 1. Check modal auxiliary (existing logic)
    if (verbData.auxiliary) {
      const modalResult = this._checkModalAuxiliary(verbData.auxiliary);
      if (modalResult) {
        result.modality = modalResult.modality;
        result.markers.push({ type: 'modal', text: verbData.auxiliary });
        result.confidence = 0.9;
      }
    }

    // 2. Check lexical markers (new)
    const lexicalResult = this._checkLexicalMarkers(text);
    if (lexicalResult && (!result.modality || lexicalResult.confidence > result.confidence)) {
      result.modality = lexicalResult.modality;
      result.markers = result.markers.concat(lexicalResult.markers);
      result.confidence = Math.max(result.confidence, lexicalResult.confidence);
    }

    // 3. Map to actuality status
    if (result.modality) {
      result.actualityStatus = this._mapToActualityStatus(result.modality);
      result.deonticType = this._classifyDeonticType(result.modality);
    }

    return result;
  }

  /**
   * Classify deontic type for Hohfeldian analysis
   */
  _classifyDeonticType(modality) {
    const types = {
      'obligation': 'duty',
      'permission': 'privilege',
      'prohibition': 'duty',     // duty NOT to act
      'claim': 'claim',
      'power': 'power',
      'immunity': 'immunity',
      'recommendation': 'soft_duty'
    };
    return types[modality] || null;
  }

  /**
   * Check for lexical deontic markers in text
   */
  _checkLexicalMarkers(text) {
    const lowerText = text.toLowerCase();
    const markers = [];
    let modality = null;
    let confidence = 0;

    // Check multi-word patterns first (more specific)
    const multiWordPatterns = [
      { pattern: /\b(has the right|has right)\b/i, modality: 'claim', confidence: 0.85 },
      { pattern: /\b(is entitled|are entitled)\b/i, modality: 'claim', confidence: 0.85 },
      { pattern: /\b(is authorized|are authorized)\b/i, modality: 'power', confidence: 0.85 },
      { pattern: /\b(is empowered|are empowered)\b/i, modality: 'power', confidence: 0.85 },
      { pattern: /\b(is forbidden|are forbidden)\b/i, modality: 'prohibition', confidence: 0.85 },
      { pattern: /\b(is prohibited|are prohibited)\b/i, modality: 'prohibition', confidence: 0.85 },
      { pattern: /\b(is exempt|are exempt)\b/i, modality: 'immunity', confidence: 0.80 },
      { pattern: /\b(not allowed)\b/i, modality: 'prohibition', confidence: 0.85 }
    ];

    for (const { pattern, modality: m, confidence: c } of multiWordPatterns) {
      const match = text.match(pattern);
      if (match) {
        modality = m;
        confidence = c;
        markers.push({ type: 'lexical', text: match[0] });
        break; // Use first match
      }
    }

    if (!modality) {
      // Check single-word patterns
      const singleWordPatterns = [
        { words: ['entitled', 'deserves', 'owed'], modality: 'claim', confidence: 0.75 },
        { words: ['authorize', 'authorizes', 'empower', 'empowers', 'delegate', 'delegates'], modality: 'power', confidence: 0.80 },
        { words: ['forbidden', 'prohibited'], modality: 'prohibition', confidence: 0.80 },
        { words: ['exempt', 'immune', 'protected'], modality: 'immunity', confidence: 0.70 }
      ];

      for (const { words, modality: m, confidence: c } of singleWordPatterns) {
        for (const word of words) {
          if (lowerText.includes(word)) {
            modality = m;
            confidence = c;
            markers.push({ type: 'lexical', text: word });
            break;
          }
        }
        if (modality) break;
      }
    }

    return modality ? { modality, markers, confidence } : null;
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
│       ├── selectional-preferences.test.js  # 60 tests (done)
│       ├── ambiguity-resolver.test.js       # 46 tests (done)
│       ├── interpretation-lattice.test.js   # 55 tests (done)
│       ├── alternative-graph-builder.test.js # 75 tests (done)
│       └── builder-integration.test.js      # Phase 6.4 (new)
├── integration/
│   └── phase6-integration.test.js           # End-to-end tests
```

### Test Categories

#### Category 1: Builder Integration - Basic (10 tests)

| Test ID | Input | Expected | Priority |
|---------|-------|----------|----------|
| BI-001 | `build(text)` no options | No lattice, backwards compatible | P0 |
| BI-002 | `build(text, { detectAmbiguity: true })` | Has `_ambiguityReport`, no lattice | P0 |
| BI-003 | `build(text, { preserveAmbiguity: true })` | Has `_interpretationLattice` | P0 |
| BI-004 | `preserveAmbiguity` implies `detectAmbiguity` | Both reports present | P0 |
| BI-005 | Lattice `getDefaultReading()` matches `@graph` | Same content | P0 |
| BI-006 | `_metadata.hasInterpretationLattice` set | Boolean flag correct | P0 |
| BI-007 | Lattice has alternatives for modal ambiguity | Alternatives populated | P0 |
| BI-008 | `preserveThreshold` option respected | Config passed through | P1 |
| BI-009 | `maxAlternatives` option respected | Limited alternatives | P1 |
| BI-010 | No alternatives when no preserved ambiguities | Empty alternatives array | P1 |

#### Category 2: Builder Integration - Alternatives (10 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| BA-001 | Modal ambiguity preserved | Alternative has different modality | P0 |
| BA-002 | Scope ambiguity preserved | Alternative has different scope | P0 |
| BA-003 | Multiple ambiguities | Multiple alternatives generated | P0 |
| BA-004 | Alternative IRIs unique | No duplicate `@id` values | P0 |
| BA-005 | Alternatives link to source | `derivedFrom` set correctly | P0 |
| BA-006 | Plausibility scores assigned | All alternatives have scores | P0 |
| BA-007 | Lattice `toJSONLD()` includes alternatives | Full serialization | P1 |
| BA-008 | Lattice `toSimplifiedGraph()` excludes alternatives | Just default | P1 |
| BA-009 | High confidence ambiguity resolved | Not preserved | P1 |
| BA-010 | Low confidence ambiguity preserved | Is preserved | P1 |

#### Category 3: Deontic Detection - Basic (10 tests)

| Test ID | Input | Expected Modality | Priority |
|---------|-------|-------------------|----------|
| DD-001 | "must provide care" | `obligation` | P0 |
| DD-002 | "shall not disclose" | `prohibition` | P0 |
| DD-003 | "may refuse treatment" | `permission` | P0 |
| DD-004 | "is prohibited from" | `prohibition` | P0 |
| DD-005 | "is forbidden to" | `prohibition` | P0 |
| DD-006 | "is allowed to" | `permission` | P0 |
| DD-007 | "should consider" | `recommendation` | P0 |
| DD-008 | "ought to prioritize" | `recommendation` | P0 |
| DD-009 | "required to report" | `obligation` | P0 |
| DD-010 | "not allowed to" | `prohibition` | P0 |

#### Category 4: Deontic Detection - Extended (10 tests)

| Test ID | Input | Expected Modality | Priority |
|---------|-------|-------------------|----------|
| DE-001 | "entitled to refuse" | `claim` | P0 |
| DE-002 | "has the right to" | `claim` | P0 |
| DE-003 | "deserves treatment" | `claim` | P0 |
| DE-004 | "is authorized to" | `power` | P0 |
| DE-005 | "empowers the committee" | `power` | P0 |
| DE-006 | "delegates authority" | `power` | P0 |
| DE-007 | "is exempt from" | `immunity` | P1 |
| DE-008 | "is protected from" | `immunity` | P1 |
| DE-009 | "grants permission" | `power` | P1 |
| DE-010 | "confers the right" | `power` | P1 |

#### Category 5: ActualityStatus Mapping (10 tests)

| Test ID | Modality | Expected Status | Priority |
|---------|----------|-----------------|----------|
| AS-001 | `obligation` | `tagteam:Prescribed` | P0 |
| AS-002 | `permission` | `tagteam:Permitted` | P0 |
| AS-003 | `prohibition` | `tagteam:Prohibited` | P0 |
| AS-004 | `claim` | `tagteam:Entitled` | P0 |
| AS-005 | `power` | `tagteam:Empowered` | P0 |
| AS-006 | `immunity` | `tagteam:Protected` | P1 |
| AS-007 | `recommendation` | `tagteam:Prescribed` | P0 |
| AS-008 | Negated obligation | `tagteam:Negated` | P0 |
| AS-009 | No modality, past tense | `tagteam:Actual` | P0 |
| AS-010 | `hypothetical` | `tagteam:Hypothetical` | P1 |

#### Category 6: Deontic in Graph Output (8 tests)

| Test ID | Input | Expected Graph Property | Priority |
|---------|-------|-------------------------|----------|
| DG-001 | "entitled to" | `tagteam:modality: 'claim'` | P0 |
| DG-002 | "authorized to" | `tagteam:modality: 'power'` | P0 |
| DG-003 | "forbidden from" | `tagteam:modality: 'prohibition'` | P0 |
| DG-004 | "entitled" | `tagteam:actualityStatus: 'tagteam:Entitled'` | P0 |
| DG-005 | Extended vocab | `tagteam:deonticType` present | P1 |
| DG-006 | Claim detected | `tagteam:deonticType: 'claim'` | P1 |
| DG-007 | Power detected | `tagteam:deonticType: 'power'` | P1 |
| DG-008 | Multiple deontic markers | All captured | P2 |

#### Category 7: Edge Cases (8 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| EC-001 | No modal, no deontic markers | No deontic properties | P0 |
| EC-002 | Ambiguous modal (should) | Recommendation by default | P0 |
| EC-003 | Conflicting markers | Higher confidence wins | P1 |
| EC-004 | Nested modals | Outer modal wins | P1 |
| EC-005 | Negated permission | Not prohibition (different) | P1 |
| EC-006 | Empty text | Graceful handling | P1 |
| EC-007 | Unknown modal | No modality assigned | P1 |
| EC-008 | Case insensitivity | Markers detected | P1 |

#### Category 8: Integration with Lattice (6 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| IL-001 | Deontic ambiguity → lattice | Alternatives have different modalities | P0 |
| IL-002 | "should" ambiguity preserved | Both deontic and epistemic readings | P0 |
| IL-003 | Claim vs obligation | Both readings available | P1 |
| IL-004 | Lattice serializes deontic info | JSON-LD includes modality | P1 |
| IL-005 | AlternativeGraphBuilder uses extended vocab | Alternatives have new statuses | P1 |
| IL-006 | Full pipeline with deontic | End-to-end works | P0 |

---

## Acceptance Criteria

### Builder Integration Criteria

- [ ] **AC-001:** `preserveAmbiguity: true` returns `_interpretationLattice`
- [ ] **AC-002:** `_interpretationLattice` is valid InterpretationLattice instance
- [ ] **AC-003:** Default reading matches `@graph`
- [ ] **AC-004:** Alternatives generated for preserved ambiguities
- [ ] **AC-005:** `_ambiguityReport` still included (Phase 5 compatibility)
- [ ] **AC-006:** `_metadata.hasInterpretationLattice` flag set
- [ ] **AC-007:** No lattice when `preserveAmbiguity: false`
- [ ] **AC-008:** Configuration options passed through correctly

### Deontic Enhancement Criteria

- [ ] **AC-009:** Prohibition detected from "forbidden", "prohibited", "shall not"
- [ ] **AC-010:** Claim detected from "entitled", "has right", "deserves"
- [ ] **AC-011:** Power detected from "authorized", "empowered", "delegates"
- [ ] **AC-012:** Immunity detected from "exempt", "immune", "protected"
- [ ] **AC-013:** `tagteam:Entitled` actuality status for claims
- [ ] **AC-014:** `tagteam:Empowered` actuality status for powers
- [ ] **AC-015:** `tagteam:Protected` actuality status for immunities
- [ ] **AC-016:** `tagteam:deonticType` added to graph nodes
- [ ] **AC-017:** Extended vocabulary backwards compatible with basic

### Quality Criteria

- [ ] **AC-018:** All P0 tests pass (45 tests)
- [ ] **AC-019:** All P1 tests pass (22 tests)
- [ ] **AC-020:** 90%+ P2 tests pass (5 tests)
- [ ] **AC-021:** Zero regression in existing tests
- [ ] **AC-022:** Bundle size increase < 5KB

---

## Implementation Steps

### Step 1: Create Test File (TDD)

Write all P0 tests as failing tests first.

### Step 2: Extend Deontic Vocabulary

1. Update `MODALITY_MAPPINGS` in ActExtractor.js
2. Update `MODALITY_TO_STATUS` with new statuses
3. Add `_checkLexicalMarkers()` method
4. Add `tagteam:deonticType` to node output

### Step 3: Update AlternativeGraphBuilder

1. Add new modality modifications for claim/power/immunity
2. Update `_getModalModifications()` for extended vocabulary

### Step 4: Integrate into SemanticGraphBuilder

1. Add imports for Phase 6 components
2. Add `preserveAmbiguity` option handling
3. Wire up AmbiguityResolver → InterpretationLattice → AlternativeGraphBuilder
4. Add `_interpretationLattice` to output

### Step 5: Update JSON-LD Context

1. Add `tagteam:Entitled` to @context
2. Add `tagteam:Empowered` to @context
3. Add `tagteam:Protected` to @context
4. Add `tagteam:deonticType` to @context

### Step 6: Run All Tests

All P0 and P1 tests should pass.

---

## Files to Modify/Create

```
src/graph/
├── SemanticGraphBuilder.js   # Integration logic (modify)
├── ActExtractor.js           # Extended deontic vocab (modify)
├── AlternativeGraphBuilder.js # Extended modality mods (modify)
├── JSONLDSerializer.js       # Extended @context (modify)
└── DeonticDetector.js        # Optional: extract to separate class (new)

tests/unit/phase6/
└── builder-integration.test.js  # Phase 6.4 tests (new)

tests/integration/
└── lattice-integration.test.js  # Update existing (modify)
```

---

## JSON-LD Context Additions

```javascript
{
  "@context": {
    // Existing...

    // New ActualityStatus values
    "tagteam:Entitled": {
      "@id": "http://purl.org/tagteam#Entitled",
      "@type": "@id",
      "rdfs:comment": "The agent holds a claim/right to something"
    },
    "tagteam:Empowered": {
      "@id": "http://purl.org/tagteam#Empowered",
      "@type": "@id",
      "rdfs:comment": "The agent has normative power/authority"
    },
    "tagteam:Protected": {
      "@id": "http://purl.org/tagteam#Protected",
      "@type": "@id",
      "rdfs:comment": "The agent has immunity from certain powers"
    },

    // New properties
    "tagteam:deonticType": {
      "@id": "http://purl.org/tagteam#deonticType",
      "rdfs:comment": "Hohfeldian classification of deontic position"
    }
  }
}
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| P0 Test Pass Rate | 100% | 45/45 tests |
| P1 Test Pass Rate | 100% | 22/22 tests |
| P2 Test Pass Rate | 90%+ | 5/5 tests |
| Regression Tests | 0 failures | All existing tests pass |
| Bundle Size | < +5KB | Measure before/after |
| Deontic Coverage | 6 types | obligation, permission, prohibition, claim, power, immunity |

---

## Sign-Off

- [ ] Plan reviewed
- [ ] Acceptance criteria agreed
- [ ] Test strategy approved
- [ ] Ready to implement

---

*Phase 6.4 Implementation Plan - Builder Integration + Deontic Enhancement*
