# TagTeam 3.0 Ontology Integration - IEE Engagement Plan

**Date**: January 18, 2026
**Status**: Planning Phase
**Goal**: Integrate TagTeam's proposed ontology-agnostic architecture with IEE's ValueNet foundation

---

## Executive Summary

TagTeam is planning a major 3.0 release that would make it **ontology-agnostic** with **BFO-compatible** pluggable value systems. This aligns perfectly with IEE's existing ValueNet integration and could eliminate the need for the intermediate `valueMapper.js` layer.

### Key Opportunity

Instead of:
```
TagTeam (50 hard-coded values) → valueMapper.js → IEE worldviews
```

We could have:
```
TagTeam 3.0 (loads ValueNet ontology) → IEE worldviews (with BFO grounding)
```

---

## Current Architecture vs. TagTeam 3.0 Vision

### Current State (TagTeam 2.0 + IEE)

```
┌─────────────────┐
│  TagTeam 2.0    │
│  (50 values)    │ ← Hard-coded in bundle
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  valueMapper.js │ ← Manual JavaScript mappings (52 values now)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  12 Worldviews  │
└─────────────────┘

┌─────────────────┐
│   ValueNet      │ ← Loaded but not integrated with TagTeam
│  (100+ values)  │
└─────────────────┘
```

**Limitations:**
- TagTeam's 50 values are baked into the bundle
- Manual maintenance of valueMapper.js (just added Patience & Generosity)
- ValueNet loaded but not used for value detection
- Duplicate value definitions across systems

### Proposed State (TagTeam 3.0 + ValueNet Integration)

```
┌──────────────────────────────────────────┐
│      BFO Ontology Layer                  │
│  - ValueNet dispositions (100+)          │
│  - IEE worldview values                  │
│  - Schwartz values (10 basic)            │
│  - Moral Foundations (6 foundations)     │
│  All using shared BFO vocabulary         │
└────────────┬─────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│     TagTeam 3.0 (Ontology-Agnostic)     │
│  Loads BFO-compatible ontologies        │
│  Detects values from unified ontology   │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│      moralReasoner.js                   │
│  Reasons using detected values          │
│  BFO grounding visible in reasoning     │
└─────────────────────────────────────────┘
```

**Benefits:**
- ✅ Eliminate valueMapper.js entirely
- ✅ TagTeam speaks ValueNet natively
- ✅ Single source of truth for value definitions
- ✅ Domain-specific extensions (medical, legal, etc.)
- ✅ User-customizable ontologies
- ✅ Multi-perspectival semantics in ontology, not code

---

## TagTeam 3.0 Architecture Overview

### Core Components

#### 1. Storage Abstraction Layer

Cross-platform persistent caching:

```javascript
/**
 * Automatically selects storage backend:
 * - Browser: IndexedDB (survives page refresh)
 * - Node.js: File System (.tagteam-cache/)
 * - Fallback: In-Memory Map (session only)
 */
class StorageAdapter {
    static create(options = {}) {
        if (typeof window !== 'undefined' && window.indexedDB) {
            return new IndexedDBAdapter(options);
        } else if (typeof process !== 'undefined' && process.versions.node) {
            return new FileSystemAdapter(options);
        } else {
            return new MemoryAdapter(options);
        }
    }
}
```

**Cache Performance:**
| Environment | First Load | Cached Load | Storage Location |
|-------------|-----------|-------------|------------------|
| **Browser** | 500ms (network) | 5ms (IndexedDB) | IndexedDB |
| **Node.js** | 500ms (network) | 10ms (file) | .tagteam-cache/*.json |
| **Memory** | 500ms (network) | 0ms (Map) | RAM |

#### 2. Ontology Manager

Three-tier caching architecture:

```javascript
class OntologyManager {
    async loadOntology(source) {
        // 1. Check hot memory cache (fastest - ~0ms)
        if (this.memoryCache.has(cacheKey)) {
            return this.memoryCache.get(cacheKey);
        }

        // 2. Check persistent storage (fast - ~5-10ms)
        const cached = await this.storage.get(cacheKey);
        if (cached && !source.forceRefresh) {
            this.memoryCache.set(cacheKey, cached);
            return cached;
        }

        // 3. Fetch and parse from source (slow - ~50-500ms)
        const ontology = await this.fetchAndParse(source);

        // 4. Store in persistent cache
        await this.storage.set(cacheKey, ontology);

        // 5. Cache in memory
        this.memoryCache.set(cacheKey, ontology);

        return ontology;
    }
}
```

#### 3. BFO Compatibility Layer

Maps BFO constructs to TagTeam structures:

```turtle
# Example: BFO-compatible value definition

@prefix bfo: <http://purl.obolibrary.org/obo/BFO_> .
@prefix ethics: <https://integralethics.org/ontology#> .

ethics:Autonomy a bfo:0000019 ;  # bfo:Quality
    rdfs:label "Autonomy" ;
    rdfs:comment "Capacity for self-determination" ;
    ethics:domain ethics:Dignity ;
    ethics:keywords "choice, freedom, independence" ;
    ethics:upholdingTerms "respecting choice, enabling freedom" ;
    ethics:violatingTerms "forcing decision, restricting choice" ;
    ethics:entails ethics:Respect, ethics:Dignity .
```

**BFO Mapping:**
- `bfo:Quality` → Ethical Values
- `bfo:Disposition` → Value tendencies
- `bfo:Role` → Semantic roles (Agent, Patient)
- `bfo:Process` → Actions, semantic frames
- `bfo:bearerOf` → Entity has value
- `bfo:precedesTemporally` → Value entailment

#### 4. Multi-Ontology Support

```javascript
// Load and merge multiple ontologies
await TagTeam.loadOntologies([
  { source: 'file', path: './valueNet/valuenet-core.ttl' },
  { source: 'file', path: './valueNet/valuenet-schwartz-values.ttl' },
  { source: 'file', path: './ontology/iee-worldview-values.ttl' },
  { source: 'file', path: './custom/medical-ethics.ttl' }
], { merge: true });

// Query loaded ontologies
const ontologies = TagTeam.getLoadedOntologies();
// [
//   { namespace: 'valuenet', valueCount: 100 },
//   { namespace: 'iee', valueCount: 50 },
//   { namespace: 'medical', valueCount: 30 }
// ]
```

---

## Integration Scenarios for IEE

### Scenario 1: Direct ValueNet Detection

**Eliminate valueMapper.js entirely**

```javascript
// Load ValueNet as the detection ontology
await TagTeam.loadOntology({
  source: 'file',
  path: './valueNet/valuenet-schwartz-values.ttl',
  format: 'turtle',
  namespace: 'valuenet'
});

await TagTeam.loadOntology({
  source: 'file',
  path: './valueNet/valuenet-moral-foundations.ttl',
  format: 'turtle',
  namespace: 'valuenet',
  merge: true
});

// Parse scenario - TagTeam detects ValueNet dispositions directly
const result = TagTeam.parse("A hospital must decide whether to give a scarce donor organ...");

console.log(result.ethicalProfile.values);
// Output (ValueNet dispositions):
// [
//   {
//     name: "SecurityDisposition",
//     salience: 0.7,
//     iri: "https://fandaws.com/ontology/bfo/valuenet-schwartz-values#SecurityDisposition",
//     bfoClass: "bfo:Quality"
//   },
//   {
//     name: "BenevolenceDisposition",
//     salience: 0.6,
//     iri: "https://fandaws.com/ontology/bfo/valuenet-schwartz-values#BenevolenceDisposition"
//   }
// ]
```

**Advantage:** No intermediate mapping layer - TagTeam → ValueNet → Worldviews

### Scenario 2: Ontology-Driven Worldview Mappings

**Replace JavaScript mappings with BFO relationships**

Instead of:
```javascript
// valueMapper.js (current)
export const tagteamToWorldviewValueMap = {
  'Autonomy': ['self_determination', 'freedom', 'agency'],
  'Beneficence': ['physical_wellbeing', 'welfare', 'good']
};
```

Use ontology:
```turtle
# iee-tagteam-integration.ttl

@prefix iee: <http://ontology-of-freedom.org/iee#> .
@prefix tt: <https://tagteam.org/values#> .
@prefix vn: <https://fandaws.com/ontology/bfo/valuenet-schwartz-values#> .

# Map TagTeam values to IEE worldview values
tt:Autonomy owl:sameAs iee:SelfDetermination ;
    iee:relatedTo iee:Freedom, iee:Agency ;
    iee:worldviewSalience [
        iee:worldview iee:Idealism ;
        iee:salience "high"
    ] ,
    [
        iee:worldview iee:Materialism ;
        iee:salience "low"
    ] .

# Map ValueNet dispositions to worldview values with grounding
vn:SecurityDisposition iee:realizesIn [
    iee:worldview iee:Materialism ;
    iee:value iee:PhysicalWellbeing ;
    iee:grounding "Physical safety and material resources" ;
    iee:salience "high"
] ,
[
    iee:worldview iee:Phenomenalism ;
    iee:value iee:SubjectiveCertainty ;
    iee:grounding "Subjective certainty in perceptions" ;
    iee:salience "high"
] ,
[
    iee:worldview iee:Spiritualism ;
    iee:value iee:SpiritualSecurity ;
    iee:grounding "Security in transcendent truth" ;
    iee:salience "medium"
] .
```

Load it:
```javascript
await TagTeam.loadOntology({
  source: 'file',
  path: './ontology/iee-tagteam-integration.ttl'
});

// TagTeam now knows worldview salience automatically
const result = TagTeam.parse(scenario);

// Result includes worldview perspectives from ontology
console.log(result.ethicalProfile.values[0]);
// {
//   name: "SecurityDisposition",
//   salience: 0.7,
//   worldviewInterpretations: [
//     {
//       worldview: "Materialism",
//       meaning: "Physical safety and material resources",
//       salience: "high"
//     },
//     {
//       worldview: "Phenomenalism",
//       meaning: "Subjective certainty in perceptions",
//       salience: "high"
//     },
//     {
//       worldview: "Spiritualism",
//       meaning: "Security in transcendent truth",
//       salience: "medium"
//     }
//   ]
// }
```

### Scenario 3: Domain-Specific Extensions

```javascript
// Load base + medical extension
await TagTeam.loadOntologies([
  { source: 'file', path: './ontology/iee-base.ttl' },
  { source: 'file', path: './ontology/medical-ethics.ttl', merge: true }
]);

// TagTeam now knows medical-specific values:
// - Informed Consent
// - Primum Non Nocere
// - Patient Autonomy
// - Therapeutic Privilege

const result = TagTeam.parse("The doctor must obtain informed consent before surgery.");

console.log(result.ethicalProfile.values);
// [
//   { name: "InformedConsent", salience: 0.9, domain: "Medical" },
//   { name: "Autonomy", salience: 0.7, domain: "Dignity" }
// ]
```

### Scenario 4: Conflict Detection from Ontology

```turtle
# Define conflicts in ontology instead of computing algorithmically

iee:Autonomy ethics:ConflictsWith iee:Beneficence ;
    ethics:severity "high" ;
    ethics:context "medical" ;
    rdfs:comment "Classic tension: patient choice vs physician judgment" .

vn:SecurityDisposition ethics:ConflictsWith vn:StimulationDisposition ;
    ethics:severity "moderate" ;
    rdfs:comment "Safety vs novelty-seeking" .
```

TagTeam detects these conflicts automatically:

```javascript
const result = TagTeam.parse(scenario);

console.log(result.ethicalProfile.conflicts);
// [
//   {
//     value1: "Autonomy",
//     value2: "Beneficence",
//     severity: "high",
//     context: "medical",
//     source: "ontology",  // Not computed!
//     explanation: "Classic tension: patient choice vs physician judgment"
//   }
// ]
```

---

## Implementation Roadmap

### Phase 1: Proof of Concept (1-2 weeks)

**Goal:** Validate TagTeam 3.0 can load ValueNet

**Tasks:**
- [ ] Install/test TagTeam 3.0 ontology loading API
- [ ] Load `valuenet-schwartz-values.ttl` into TagTeam
- [ ] Parse test scenario and verify ValueNet detection
- [ ] Compare detection quality vs current TagTeam 2.0

**Success Criteria:**
- TagTeam successfully loads ValueNet TTL files
- Detects Schwartz values (Security, Hedonism, Achievement, etc.)
- Detection accuracy ≥ current TagTeam 2.0

**Deliverable:** `proof-of-concept/tagteam-valuenet-test.js`

### Phase 2: Ontology Bridge (2-3 weeks)

**Goal:** Create BFO ontology that bridges TagTeam, ValueNet, and IEE worldviews

**Tasks:**
- [ ] Create `iee-tagteam-valuenet-bridge.ttl`
- [ ] Define mappings: TagTeam 50 values → ValueNet dispositions
- [ ] Define mappings: ValueNet dispositions → IEE worldview values
- [ ] Include worldview-specific salience levels
- [ ] Include multi-perspectival grounding explanations
- [ ] Validate BFO compliance

**File Structure:**
```
ontology/
├── iee-tagteam-valuenet-bridge.ttl  # NEW: Unified mappings
├── worldview-valuenet-mappings.ttl  # EXISTS: IEE worldview mappings
└── value-conflict-resolution.ttl    # EXISTS: Conflict definitions
```

**Success Criteria:**
- All 52 TagTeam values mapped to ValueNet
- All ValueNet dispositions mapped to worldview values
- Passes BFO validation

**Deliverable:** `ontology/iee-tagteam-valuenet-bridge.ttl`

### Phase 3: Integration Testing (2 weeks)

**Goal:** Test full pipeline with ontology-driven detection

**Tasks:**
- [ ] Load unified ontology into TagTeam 3.0
- [ ] Update `moralReasoner.js` to use ontology mappings
- [ ] Test with IEE's existing test scenarios
- [ ] Compare reasoning quality (ontology vs code-based)
- [ ] Measure performance impact
- [ ] Update deliberationOrchestrator integration

**Test Cases:**
- [ ] Organ allocation scenario (Care vs Dignity)
- [ ] End-of-life scenario (Autonomy vs Beneficence)
- [ ] Research ethics scenario (Truth vs Safety)
- [ ] All 108 existing unit tests still pass

**Success Criteria:**
- All test scenarios produce equivalent or better reasoning
- No performance regression (< 10% slower)
- All existing tests pass

**Deliverable:** Integration test suite

### Phase 4: Migration (3-4 weeks)

**Goal:** Deprecate valueMapper.js, move logic to ontology

**Tasks:**
- [ ] Migrate all valueMapper mappings to TTL
- [ ] Update moralReasoner to read from ontology
- [ ] Add BFO grounding to deliberation output
- [ ] Update UI to display BFO references (optional)
- [ ] Create migration documentation
- [ ] Update all tests to use ontology

**Deprecation Strategy:**
```javascript
// Old way (deprecated but still works)
import { tagteamToWorldviewValueMap } from './valueMapper.js';

// New way
const mapping = ontologyManager.getValueMapping('Autonomy');
// Returns ontology-defined mapping with BFO grounding
```

**Success Criteria:**
- valueMapper.js can be removed without breaking functionality
- All worldview reasoning references BFO classes
- Documentation updated

**Deliverable:** Migration complete, valueMapper.js deprecated

### Phase 5: Enhancement (Ongoing)

**Goal:** Leverage ontology for richer reasoning

**Tasks:**
- [ ] Domain-specific ontology extensions (medical, legal)
- [ ] User-customizable value ontologies
- [ ] Export deliberation as RDF/OWL
- [ ] Ontology versioning and updates
- [ ] Publish IEE ontology to BioPortal/OBO Foundry

**Deliverable:** Enhanced IEE with full BFO ecosystem integration

---

## Benefits Analysis

### Technical Benefits

| Benefit | Current | With TagTeam 3.0 | Impact |
|---------|---------|------------------|--------|
| **Single Source of Truth** | Values defined in 3 places (TagTeam, valueMapper, ValueNet) | Unified BFO ontology | High |
| **Maintainability** | Manual JS mapping updates | Edit TTL ontology | High |
| **Extensibility** | Hard-coded, requires code changes | Load new ontology files | High |
| **BFO Compliance** | Partial (ValueNet only) | Full (TagTeam + ValueNet + IEE) | Medium |
| **Multi-perspectival Semantics** | Code-based | Ontology-driven | High |
| **Conflict Detection** | Algorithmic | Ontology-defined + algorithmic | Medium |
| **Domain Customization** | Difficult | Easy (load domain ontology) | High |

### User-Facing Benefits

| Benefit | Description | Impact |
|---------|-------------|--------|
| **Richer Explanations** | BFO grounding in deliberation output ("SecurityDisposition as bfo:Quality...") | Medium |
| **Domain-Specific Values** | Medical ethics uses medical values, legal uses legal values | High |
| **Transparent Reasoning** | Ontology defines why values conflict, not black-box algorithm | High |
| **Customizability** | Organizations can load their own value ontologies | Low (niche use case) |

### Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **TagTeam 3.0 delayed/cancelled** | Medium | High | Continue with valueMapper, revisit when 3.0 releases |
| **Performance degradation** | Low | Medium | Optimize ontology loading, use caching |
| **Complexity for users** | Medium | Medium | Keep defaults simple, advanced features optional |
| **BFO overhead without benefit** | Medium | High | **Test first** - validate BFO actually improves reasoning |
| **Breaking existing integrations** | Low | High | Maintain backward compatibility, gradual migration |

---

## Decision Framework

### Should We Pursue This?

**Test These Questions:**

1. **Quality**: Does ontology-driven detection improve value detection accuracy?
   - Metric: Compare TagTeam 2.0 vs 3.0+ValueNet on test corpus
   - Threshold: ≥ 95% of current quality

2. **Performance**: Is the performance acceptable?
   - Metric: Deliberation latency with ontology loading
   - Threshold: < 3 seconds for first load, < 100ms for cached

3. **User Value**: Does BFO grounding make reasoning more understandable?
   - Metric: User testing with ontology vs code-based output
   - Threshold: ≥ 70% prefer ontology-grounded explanations

4. **Maintenance**: Is ontology maintenance easier than code maintenance?
   - Metric: Time to add new value + test
   - Threshold: < 50% time vs current valueMapper approach

### Go/No-Go Criteria

**Proceed with Full Integration if:**
- ✅ All 4 test questions meet thresholds
- ✅ TagTeam 3.0 API is stable (not alpha/beta)
- ✅ Bundle size increase < 50 KB
- ✅ No major performance regression

**Stay with Current Architecture if:**
- ❌ Any test question fails threshold
- ❌ TagTeam 3.0 significantly delayed (> 6 months)
- ❌ Ontology complexity outweighs benefits

**Hybrid Approach (Recommended):**
- ✅ Prototype with TagTeam 3.0 to validate concept
- ✅ Maintain valueMapper.js as fallback
- ✅ Gradually migrate as ontology proves value
- ✅ Keep both systems working until ontology fully validated

---

## Collaboration with TagTeam Team

### Feedback to Provide

**IEE Use Case for TagTeam 3.0:**

1. **Multi-Ontology Requirement**
   - Need: Load ValueNet (100+ values) + IEE values (50+) + domain extensions
   - Question: How does TagTeam handle overlapping value definitions?
   - Example: "Autonomy" defined in all three ontologies

2. **BFO Compliance**
   - Need: Full BFO support for dispositions, roles, processes
   - Question: Does TagTeam validate BFO structure?
   - Example: Reject ontology if `bfo:Quality` misused

3. **Cross-Platform Storage**
   - Need: Works in browser (PWA) and Node.js
   - Question: How does IndexedDB ↔ FileSystem caching work?
   - Example: Deploy IEE as PWA with offline ontology caching

4. **Performance Requirements**
   - Need: First load < 3s, cached < 100ms
   - Question: What's the typical TTL parsing time?
   - Example: ValueNet has ~200 triples, IEE has ~500

5. **Semantic Frames + Ontologies**
   - Need: Load frame definitions from ontology
   - Question: Can semantic frames be in TTL?
   - Example: "TreatmentDecision" frame boosts Autonomy +0.3

### Integration Points

**Potential Collaboration:**

1. **Reference Implementation**
   - IEE as TagTeam 3.0 reference implementation
   - Demonstrate BFO-compatible ontology integration
   - Test case for cross-platform storage

2. **Ontology Examples**
   - Contribute IEE ontologies to TagTeam examples
   - Show multi-perspectival value semantics
   - Demonstrate worldview-specific salience

3. **Performance Benchmarking**
   - Test TagTeam 3.0 with large ontologies
   - Provide feedback on parsing performance
   - Suggest optimizations for browser deployment

4. **Documentation**
   - BFO integration guide
   - Multi-ontology best practices
   - PWA deployment with ontology caching

---

## Next Steps

### Immediate (This Week)

1. **Monitor TagTeam 3.0 Development**
   - Check GitHub/documentation for 3.0 roadmap
   - Identify when API will stabilize
   - Contact TagTeam team about IEE use case

2. **Document Current ValueMapper**
   - Formalize all 52 value mappings
   - Document mapping rationale
   - Prepare for migration to ontology

3. **Validate ValueNet Quality**
   - Test if ValueNet dispositions are comprehensive enough
   - Identify gaps in coverage
   - Decide if TagTeam's 50 values or ValueNet's 100+ is better base

### Short-term (1-2 months)

1. **Prototype Phase 1**
   - Wait for TagTeam 3.0 alpha/beta
   - Test ontology loading with ValueNet
   - Measure detection quality vs current

2. **Ontology Design**
   - Start designing `iee-tagteam-valuenet-bridge.ttl`
   - Define BFO-compliant structure
   - Validate with ontology experts

3. **Stakeholder Alignment**
   - Present findings to IEE stakeholders
   - Get buy-in for migration effort
   - Allocate resources if pursuing

### Medium-term (3-6 months)

1. **Full Integration** (if prototype successful)
   - Execute Phases 2-4
   - Migrate valueMapper to ontology
   - Update documentation

2. **Alternative** (if prototype unsuccessful)
   - Continue with valueMapper.js
   - Incrementally adopt BFO where beneficial
   - Revisit when TagTeam 3.0 matures

---

## Appendix: Example Files

### A. Sample IEE-TagTeam-ValueNet Bridge

**File: `ontology/iee-tagteam-valuenet-bridge.ttl`**

```turtle
@prefix iee: <http://ontology-of-freedom.org/iee#> .
@prefix tt: <https://tagteam.org/values#> .
@prefix vn: <https://fandaws.com/ontology/bfo/valuenet-schwartz-values#> .
@prefix bfo: <http://purl.obolibrary.org/obo/BFO_> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix ethics: <https://integralethics.org/ontology#> .

# ==========================================
# TagTeam → ValueNet Mappings
# ==========================================

tt:Autonomy owl:sameAs vn:SelfDirectionDisposition ;
    rdfs:comment "TagTeam's Autonomy maps to Schwartz's Self-Direction" .

tt:Justice owl:sameAs vn:UniversalismDisposition ;
    rdfs:comment "TagTeam's Justice maps to Schwartz's Universalism" .

tt:Beneficence ethics:relatedTo vn:BenevolenceDisposition, vn:SecurityDisposition ;
    rdfs:comment "Beneficence relates to both benevolence and security (wellbeing)" .

# ==========================================
# ValueNet → IEE Worldview Mappings
# (Multi-perspectival semantics)
# ==========================================

vn:SecurityDisposition ethics:realizesIn [
    a ethics:WorldviewRealization ;
    iee:worldview iee:Materialism ;
    iee:realizesAs iee:PhysicalWellbeing ;
    iee:grounding "In materialism, security is grounded in physical safety and material resources" ;
    iee:salience "high"
] ;
ethics:realizesIn [
    a ethics:WorldviewRealization ;
    iee:worldview iee:Phenomenalism ;
    iee:realizesAs iee:SubjectiveCertainty ;
    iee:grounding "In phenomenalism, security is subjective certainty in one's perceptions" ;
    iee:salience "high"
] ;
ethics:realizesIn [
    a ethics:WorldviewRealization ;
    iee:worldview iee:Realism ;
    iee:realizesAs iee:NaturalLaw ;
    iee:grounding "In realism, security is conformity to objective natural law" ;
    iee:salience "medium"
] .

vn:SelfDirectionDisposition ethics:realizesIn [
    iee:worldview iee:Idealism ;
    iee:realizesAs iee:SelfDetermination ;
    iee:grounding "In idealism, self-direction is the expression of conscious autonomy" ;
    iee:salience "very_high"
] ;
ethics:realizesIn [
    iee:worldview iee:Materialism ;
    iee:realizesAs iee:PhysicalWellbeing ;
    iee:grounding "In materialism, self-direction is subordinate to physical constraints" ;
    iee:salience "low"
] .

# ==========================================
# Conflict Definitions
# ==========================================

vn:SecurityDisposition ethics:ConflictsWith vn:StimulationDisposition ;
    ethics:severity "moderate" ;
    rdfs:comment "Safety vs novelty-seeking" .

vn:SelfDirectionDisposition ethics:ConflictsWith vn:ConformityDisposition ;
    ethics:severity "high" ;
    rdfs:comment "Independence vs tradition/obedience" .

# ==========================================
# Domain Assignments
# ==========================================

vn:SecurityDisposition ethics:primaryDomain ethics:Care .
vn:BenevolenceDisposition ethics:primaryDomain ethics:Care .
vn:UniversalismDisposition ethics:primaryDomain ethics:Dignity .
vn:SelfDirectionDisposition ethics:primaryDomain ethics:Dignity .
```

### B. Test Configuration

**File: `testing/tagteam-3.0-test-config.json`**

```json
{
  "version": "3.0-test",
  "storage": {
    "cacheDir": "./.tagteam-cache-test",
    "dbName": "TagTeamTest"
  },
  "ontology": {
    "sources": [
      {
        "url": "file://./valueNet/valuenet-core.ttl",
        "format": "ttl",
        "cache": "memory",
        "namespace": "valuenet-core"
      },
      {
        "url": "file://./valueNet/valuenet-schwartz-values.ttl",
        "format": "ttl",
        "cache": "memory",
        "namespace": "valuenet-schwartz"
      },
      {
        "url": "file://./ontology/iee-tagteam-valuenet-bridge.ttl",
        "format": "ttl",
        "cache": "memory",
        "namespace": "iee-bridge"
      }
    ],
    "merge": true,
    "validateBFO": true
  },
  "testScenarios": [
    {
      "id": "organ-allocation",
      "description": "A hospital must decide whether to give a scarce donor organ to a 25-year-old patient with excellent long-term survival odds, or a 65-year-old patient who has been on the waiting list longer.",
      "expectedValues": ["SecurityDisposition", "BenevolenceDisposition", "UniversalismDisposition"],
      "expectedConflicts": ["SecurityDisposition vs BenevolenceDisposition"]
    },
    {
      "id": "end-of-life",
      "description": "A patient with terminal cancer requests withdrawal of life support against family wishes.",
      "expectedValues": ["SelfDirectionDisposition", "BenevolenceDisposition"],
      "expectedConflicts": ["SelfDirectionDisposition vs BenevolenceDisposition"]
    }
  ]
}
```

### C. Proof-of-Concept Test Script

**File: `proof-of-concept/tagteam-valuenet-test.js`**

```javascript
/**
 * TagTeam 3.0 + ValueNet Integration Test
 *
 * Tests:
 * 1. Load ValueNet into TagTeam 3.0
 * 2. Parse test scenarios
 * 3. Compare detection vs TagTeam 2.0
 * 4. Measure performance
 */

import TagTeam from '../static/lib/tagteam.js';
import { ontologyManager } from '../src/concepts/ontologyManager.js';

async function testTagTeam3Integration() {
  console.log('🧪 TagTeam 3.0 + ValueNet Integration Test\n');

  // 1. Load ValueNet ontologies
  console.log('📥 Loading ValueNet ontologies...');
  const startLoad = performance.now();

  await TagTeam.loadOntology({
    source: 'file',
    path: './valueNet/valuenet-core.ttl',
    format: 'turtle',
    namespace: 'valuenet-core'
  });

  await TagTeam.loadOntology({
    source: 'file',
    path: './valueNet/valuenet-schwartz-values.ttl',
    format: 'turtle',
    namespace: 'valuenet-schwartz',
    merge: true
  });

  const loadTime = performance.now() - startLoad;
  console.log(`✅ Ontologies loaded in ${loadTime.toFixed(0)}ms\n`);

  // 2. Parse test scenario
  console.log('🔍 Parsing test scenario...');
  const scenario = "A hospital must decide whether to give a scarce donor organ to a 25-year-old patient with excellent long-term survival odds, or a 65-year-old patient who has been on the waiting list longer.";

  const startParse = performance.now();
  const result = TagTeam.parse(scenario);
  const parseTime = performance.now() - startParse;

  console.log(`✅ Parsed in ${parseTime.toFixed(0)}ms\n`);

  // 3. Display detected values
  console.log('📊 Detected Values (ValueNet Dispositions):');
  result.ethicalProfile.values.forEach(v => {
    console.log(`  - ${v.name} (salience: ${v.salience.toFixed(2)})`);
    if (v.iri) console.log(`    IRI: ${v.iri}`);
    if (v.bfoClass) console.log(`    BFO: ${v.bfoClass}`);
  });
  console.log('');

  // 4. Compare with TagTeam 2.0 baseline
  console.log('🔄 Comparing with TagTeam 2.0 baseline...');
  const baseline2_0 = {
    values: ['Autonomy', 'Equality', 'Justice', 'Beneficence'],
    count: 4
  };

  const detected = result.ethicalProfile.values.map(v => v.name);
  const coverage = detected.length >= baseline2_0.count ? '✅' : '⚠️';

  console.log(`  TagTeam 2.0: ${baseline2_0.count} values`);
  console.log(`  TagTeam 3.0: ${detected.length} values ${coverage}`);
  console.log('');

  // 5. Test worldview mapping (if bridge loaded)
  if (result.ethicalProfile.values[0]?.worldviewInterpretations) {
    console.log('🌍 Multi-Perspectival Interpretations:');
    result.ethicalProfile.values[0].worldviewInterpretations.forEach(interp => {
      console.log(`  ${interp.worldview}: ${interp.meaning} (${interp.salience})`);
    });
  } else {
    console.log('ℹ️  Worldview bridge not loaded (expected for Phase 1 test)');
  }
  console.log('');

  // 6. Performance summary
  console.log('⏱️  Performance Summary:');
  console.log(`  Ontology loading: ${loadTime.toFixed(0)}ms`);
  console.log(`  Scenario parsing: ${parseTime.toFixed(0)}ms`);
  console.log(`  Total: ${(loadTime + parseTime).toFixed(0)}ms`);
  console.log('');

  // 7. Validation
  const thresholds = {
    loadTime: 5000,    // 5 seconds
    parseTime: 1000,   // 1 second
    minValues: 4
  };

  const passed =
    loadTime < thresholds.loadTime &&
    parseTime < thresholds.parseTime &&
    detected.length >= thresholds.minValues;

  if (passed) {
    console.log('✅ All thresholds passed!');
    console.log('   → Proceed to Phase 2 (Ontology Bridge)');
  } else {
    console.log('❌ Some thresholds failed:');
    if (loadTime >= thresholds.loadTime)
      console.log(`   - Load time: ${loadTime}ms > ${thresholds.loadTime}ms`);
    if (parseTime >= thresholds.parseTime)
      console.log(`   - Parse time: ${parseTime}ms > ${thresholds.parseTime}ms`);
    if (detected.length < thresholds.minValues)
      console.log(`   - Values: ${detected.length} < ${thresholds.minValues}`);
  }
}

// Run test
testTagTeam3Integration().catch(console.error);
```

---

## Document History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-01-18 | 1.0 | Claude + Aaron | Initial draft based on TagTeam 3.0 planning doc |

---

**Status**: 📋 Planning
**Next Review**: When TagTeam 3.0 API stabilizes
**Owner**: IEE Architecture Team
