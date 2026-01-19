# Phase 4 Implementation Roadmap: JSON-LD + SHML + GIT-Minimal

**Project**: TagTeam v3.0.0-alpha.2
**Phase**: JSON-LD Graph Output with Semantic Honesty
**Duration**: 3 weeks (15 working days)
**Start Date**: TBD
**Status**: PLANNING
**Version**: 2.0 (Revised 2026-01-18)

---

## Revision Summary (v2.0)

**Changes from v1.0 based on expert critique**:

1. **ADDED Phase 1.4: Role Detection** (Day 5 afternoon) - CRITICAL GAP
   - Roles link discourse referents to acts
   - Required for SHACL Role Pattern compliance
   - 120 LOC + 15 unit tests

2. **FIXED AC-1.2.4 Contradiction**
   - Clarified: Continuants (entities) are `DiscourseReferent` (NOT BFO entities)
   - Occurrents (acts) ARE `cco:IntentionalAct` (CCO-typed)
   - Distinguished entity extraction from act extraction

3. **REQUIRED IBE Linking** (Phase 2.3)
   - Removed "if needed" qualifier - ICE → IBE linking is REQUIRED for SHACL
   - Added AC-2.3.2b to test both `based_on` and `is_concretized_by` relationships
   - Information Staircase is mandatory for semantic honesty

4. **ADJUSTED Day 5 Timeline**
   - Split Act Extraction across Days 4-5 (instead of all Day 5)
   - Day 4 afternoon: Act extraction + verb-to-CCO mapping
   - Day 5 morning: Act linking + modality
   - Day 5 afternoon: Role Detection (new)

5. **ADDED AC-2.2.5: Supersession Testing**
   - Tests that @context supports `supersedes` and `validatedBy` properties
   - Foundation for Phase 5 HumanValidation workflow
   - Ensures GIT-Minimal is not just "aspirational"

6. **ADDED AC-3.2.5: Cross-Chunk Reference Validation**
   - Tests that same entity in multiple chunks is properly linked
   - Strategy: SHA-256 deterministic IRI generation OR explicit co-reference links
   - Prevents graph fragmentation in long documents

7. **SPECIFIED Technical Details**
   - IRI hashing: SHA-256 of (text + span_offset + type), truncated to 8 hex chars
   - Default context: `tagteam:Default_Context` (not `inst:Default_Context`)
   - All instances include `owl:NamedIndividual` in type arrays

8. **RELAXED Performance Target**
   - Changed from <200ms to <300ms for typical scenario
   - Rationale: Compromise NLP (50-100ms) + graph construction + SHA-256 hashing
   - Added benchmark milestone after Week 2 to verify feasibility

9. **INCREASED Test Coverage**
   - Unit tests: 50 → 178 (15-30 per module based on complexity)
   - Total test cases: 123 → 270
   - Added RoleDetector module to deliverables (9 modules total)

10. **CLARIFIED SHACL Patterns Availability**
    - Noted that `SHACL_PATTERNS_REFERENCE.md` already exists (expert-certified)
    - Phase 3.1 is implementation, not design
    - 8 patterns ready for integration

**Impact**: Timeline remains 3 weeks (15 days), but Day 5 rebalanced. LOC increased from 1000 to 1170. Test coverage significantly improved.

---

## Executive Summary

Phase 4 transforms TagTeam from a flat value detector into a **semantically honest knowledge graph generator** by:

1. **Outputting JSON-LD graphs** (not flat objects) with BFO/CCO entities
2. **Modeling all detections as assertion events** (SHML compliance)
3. **Tracking provenance with GIT-Minimal** (human/machine distinction, context scoping)
4. **Validating with SHACL** against expert-certified patterns

**Key Deliverables**:
- Semantic graph builder that outputs JSON-LD @graph structures
- Discourse referent extraction (text mentions, not reality claims)
- Assertion event modeling (value detections, context assessments)
- GIT-Minimal integration (assertionType, validInContext, InterpretationContext)
- SHACL validation against 8 expert-certified patterns

---

## Implementation Approach

### Incremental Strategy: "Walk, Then Run"

Instead of building all modules simultaneously, we follow a **vertical slice approach**:

| Week | Focus | Output Example |
|------|-------|----------------|
| **Week 1** | Core graph infrastructure + simple entities | JSON-LD with discourse referents only |
| **Week 2** | Assertion events + GIT extensions | JSON-LD with value assertions + automated detection type |
| **Week 3** | SHACL validation + testing | Validated, production-ready graphs |

**Why This Works**:
- Each week produces a **working end-to-end system** (testable output)
- Early feedback loop on graph structure decisions
- Lower risk than "big bang" integration at week 3

---

## Week 1: Core Infrastructure & Entity Extraction

### Objective
Build the foundational graph builder and extract discourse referents from text, outputting valid JSON-LD (even if incomplete).

---

### Phase 1.1: Semantic Graph Builder (Days 1-2) ✅ COMPLETE

**Goal**: Create the orchestrator that builds JSON-LD @graph structures.

#### Tasks

**Day 1: Module Setup**
- [x] Create `src/graph/SemanticGraphBuilder.js`
- [x] Create `src/graph/JSONLDSerializer.js`
- [x] Define core interfaces in `src/types/graph.d.ts`
- [x] Set up @context with all namespaces (tagteam:, bfo:, cco:, inst:, ex:)

**Day 2: Basic Graph Construction**
- [x] Implement `SemanticGraphBuilder.build(text, options)` method
- [x] Implement `addNode(node)` / `addNodes(nodes)` helpers
- [x] Implement IRI generation with `inst:` namespace + SHA-256 hash-based IDs
- [x] Implement `JSONLDSerializer.serialize(graph)` → JSON-LD string

#### Acceptance Criteria

**AC-1.1.1: Valid JSON-LD Output**
```javascript
// GIVEN
const text = "The doctor treats the patient";
const graph = SemanticGraphBuilder.build(text);

// WHEN
const jsonld = JSONLDSerializer.serialize(graph);
const parsed = JSON.parse(jsonld);

// THEN
assert(parsed['@context'] !== undefined, "Has @context");
assert(parsed['@graph'] !== undefined, "Has @graph array");
assert(parsed['@context'].tagteam === "http://tagteam.fandaws.org/ontology/");
assert(parsed['@context'].inst === "http://tagteam.fandaws.org/instance/");
```

**AC-1.1.2: Namespace Strategy**
- Production instances use `inst:` prefix (not `ex:`)
- Example: `inst:Doctor_Referent_a8f3b2`, not `ex:Doctor_Referent_0`
- IRI generation uses **SHA-256 hashing** of (text + span_offset + type), truncated to 8 hex chars
- Same text + position + type → same IRI across runs (reproducibility)

**AC-1.1.3: Context Completeness**
```javascript
const context = parsed['@context'];
assert(context.DiscourseReferent === "tagteam:DiscourseReferent");
assert(context.denotesType['@type'] === "@id");
assert(context.extractionConfidence['@type'] === "xsd:decimal");
```

#### Deliverables
- [x] `SemanticGraphBuilder.js` (~200 lines) ✅
- [x] `JSONLDSerializer.js` (~150 lines) ✅
- [x] `src/types/graph.d.ts` (~165 lines) ✅
- [x] Unit test: `test-semantic-graph-builder.js` (32 tests, ~390 lines) ✅
- [x] Integration test: `verify-phase1-1.js` (AC verification) ✅

---

### Phase 1.2: Entity Extraction → Discourse Referents (Days 3-4) ✅ COMPLETE

**Goal**: Extract entities from text using Compromise NLP and create `tagteam:DiscourseReferent` nodes.

#### Tasks

**Day 3: Entity Extractor Module**
- [x] Create `src/graph/EntityExtractor.js`
- [x] Integrate with existing Compromise NLP (from Week 1/2a)
- [x] Extract agents (persons, occupations) as discourse referents
- [x] Extract artifacts (medical equipment, resources)
- [x] Extract numeric entities (cardinality, scarcity markers)

**Day 4: Referential Status Detection**
- [x] Implement definiteness detection ("the doctor" → definite, "a doctor" → indefinite)
- [x] Implement referentialStatus assignment (presupposed, introduced, anaphoric, hypothetical)
- [x] Implement discourse role detection (agent, patient, instrument)
- [x] Preserve text span offsets for traceability

#### Acceptance Criteria

**AC-1.2.1: Discourse Referent Creation**
```javascript
// GIVEN
const text = "The doctor must allocate the last ventilator";

// WHEN
const graph = SemanticGraphBuilder.build(text);
const referents = graph['@graph'].filter(n => n['@type'].includes('tagteam:DiscourseReferent'));

// THEN
assert(referents.length >= 2, "Extracted at least doctor + ventilator");
const doctor = referents.find(r => r['rdfs:label'].includes('doctor'));
assert(doctor['tagteam:denotesType'] === 'cco:Person');
assert(doctor['tagteam:definiteness'] === 'definite');
assert(doctor['tagteam:referentialStatus'] === 'presupposed');
```

**AC-1.2.2: Text Span Preservation**
```javascript
const ventilator = referents.find(r => r['rdfs:label'].includes('ventilator'));
assert(ventilator['tagteam:extracted_from_span'] === "last ventilator");
assert(Array.isArray(ventilator['tagteam:span_offset']));
assert(ventilator['tagteam:span_offset'][0] < ventilator['tagteam:span_offset'][1]);
```

**AC-1.2.3: Artifact Scarcity Detection**
```javascript
assert(ventilator['tagteam:is_scarce'] === true);
assert(ventilator['tagteam:quantity'] === 1);
```

**AC-1.2.4: Continuants vs Occurrents Type Distinction**
```javascript
// CRITICAL: Continuants (entities) are DiscourseReferent, NOT BFO entity types
// Occurrents (acts) ARE CCO-typed
const referents = graph['@graph'].filter(n => n['@type'].includes('DiscourseReferent'));
referents.forEach(r => {
  assert(r['@type'].includes('tagteam:DiscourseReferent'),
    "Referents must be DiscourseReferent");
  assert(!r['@type'].includes('cco:Person') && !r['@type'].includes('cco:Artifact'),
    "Referents don't claim BFO entity status - only point to types via denotesType");
  assert(r['@type'].includes('owl:NamedIndividual'), "Include owl:NamedIndividual for instances");
});

// Acts (occurrents) ARE properly CCO-typed
const acts = graph['@graph'].filter(n => n['@type'].includes('cco:IntentionalAct'));
acts.forEach(a => {
  assert(a['@type'].includes('cco:IntentionalAct'), "Acts ARE CCO-typed");
  assert(a['@type'].includes('owl:NamedIndividual'), "Include owl:NamedIndividual consistently");
});
```

#### Deliverables
- [x] `EntityExtractor.js` (~270 lines) ✅
- [x] Updated `SemanticGraphBuilder.js` to integrate EntityExtractor ✅
- [x] Unit test: `test-entity-extraction.js` (31 tests, ~300 lines) ✅
- [x] Integration test: `verify-phase1-2.js` (AC verification) ✅

---

### Phase 1.3: Act Extraction (Days 4-5) ✅ COMPLETE

**Goal**: Extract intentional acts from verb phrases and link to discourse referents.

#### Tasks

**Day 4 Afternoon: Act Extractor Module**
- [x] Create `src/graph/ActExtractor.js`
- [x] Extract verb phrases using Compromise
- [x] Map verbs to CCO act types (allocate → cco:ActOfAllocation)
- [x] Build verb-to-CCO lookup table from ontology manifests

**Day 5 Morning: Act Linking & Modality**
- [x] Link acts to discourse referents (has_agent, has_participant, affects)
- [x] Detect deontic modality (must → obligation, should → recommendation)
- [x] Add temporal extent metadata to acts

#### Acceptance Criteria

**AC-1.3.1: Act Extraction**
```javascript
// GIVEN
const text = "The doctor must allocate the last ventilator between two patients";

// WHEN
const graph = SemanticGraphBuilder.build(text);
const acts = graph['@graph'].filter(n => n['@type'].includes('cco:IntentionalAct'));

// THEN
assert(acts.length >= 1, "Extracted allocation act");
const allocAct = acts[0];
assert(allocAct['tagteam:verb'] === 'allocate');
assert(allocAct['tagteam:modality'] === 'obligation');
```

**AC-1.3.2: Act Links to Discourse Referents**
```javascript
assert(allocAct['cco:has_agent'].includes('Referent'), "Agent is discourse referent");
assert(Array.isArray(allocAct['bfo:has_participant']), "Has participants");
assert(allocAct['cco:affects'].includes('Referent'), "Affects is discourse referent");
```

#### Deliverables
- [x] `ActExtractor.js` (~340 lines) ✅
- [x] Verb-to-CCO lookup table (inline in ActExtractor) ✅
- [x] Unit test: `test-act-extraction.js` (29 tests, ~300 lines) ✅
- [x] Integration test: `verify-phase1-3.js` (AC verification) ✅

---

### Phase 1.4: Role Detection (Day 5 Afternoon) ✅ COMPLETE

**Goal**: Detect BFO roles and link them to discourse referents and acts.

**Expert Note**: This phase was MISSING from original roadmap. Roles link discourse referents to acts—without them, the graph is structurally incomplete per SHACL Role Pattern.

#### Tasks

**Day 5 Afternoon: Role Detection Module**
- [x] Create `src/graph/RoleDetector.js`
- [x] Detect agent roles (subject of intentional act → `bfo:BFO_0000023` Role)
- [x] Detect patient roles (object/recipient of act → Role)
- [x] Link roles to discourse referents via `bfo:inheres_in` (role bearer)
- [x] Link roles to acts via `bfo:realized_in` (role realization)
- [x] Handle dormant roles (bearer without realization - valid per BFO)

#### Acceptance Criteria

**AC-1.4.1: Role Creation**
```javascript
// GIVEN
const text = "The doctor must allocate the ventilator";

// WHEN
const graph = SemanticGraphBuilder.build(text);
const roles = graph['@graph'].filter(n => n['@type'].includes('bfo:BFO_0000023'));

// THEN
assert(roles.length >= 1, "Extracted at least agent role");
const agentRole = roles.find(r => r['rdfs:label']?.includes('agent'));
assert(agentRole, "Agent role exists");
```

**AC-1.4.2: Role Bearer Link (SHACL VIOLATION if missing)**
```javascript
// CRITICAL: Every Role MUST have a bearer (BFO principle: Bearer Necessity)
roles.forEach(role => {
  assert(role['bfo:inheres_in'], "Role has bearer");
  const bearer = graph['@graph'].find(n => n['@id'] === role['bfo:inheres_in']);
  assert(bearer['@type'].includes('DiscourseReferent'), "Bearer is discourse referent");
});
```

**AC-1.4.3: Role Realization Link (WARNING if missing - dormant roles valid)**
```javascript
// Roles SHOULD be realized, but dormant roles are ontologically valid
const realizedRoles = roles.filter(r => r['bfo:realized_in']);
const dormantRoles = roles.filter(r => !r['bfo:realized_in']);

console.log(`Realized roles: ${realizedRoles.length}, Dormant roles: ${dormantRoles.length}`);

// Realized roles should link to acts
realizedRoles.forEach(role => {
  const act = graph['@graph'].find(n => n['@id'] === role['bfo:realized_in']);
  assert(act['@type'].includes('cco:IntentionalAct'), "Realization is an act");
});
```

**AC-1.4.4: Inverse Relations Consistency**
```javascript
// Verify inverse consistency (if A inheres_in B, then B is_bearer_of A)
roles.forEach(role => {
  const bearerIRI = role['bfo:inheres_in'];
  const bearer = graph['@graph'].find(n => n['@id'] === bearerIRI);

  // Inverse should exist (or can be inferred by reasoner)
  if (bearer['bfo:is_bearer_of']) {
    assert(Array.isArray(bearer['bfo:is_bearer_of'])
      ? bearer['bfo:is_bearer_of'].includes(role['@id'])
      : bearer['bfo:is_bearer_of'] === role['@id'],
      "Inverse relation consistent");
  }
});
```

#### Deliverables
- [x] `RoleDetector.js` (~200 lines) ✅
- [x] Unit test: `test-role-detection.js` (24 tests, ~300 lines) ✅
- [x] Integration test: `verify-phase1-4.js` (AC verification) ✅

---

### Week 1 Milestone: Basic JSON-LD Output

**Goal**: End-to-end test producing valid JSON-LD with entities and acts.

#### Milestone Test
```javascript
// GIVEN
const text = "The doctor must allocate the last ventilator between two critically ill patients";

// WHEN
const jsonld = TagTeam.parse(text, { format: 'jsonld' });

// THEN
const parsed = JSON.parse(jsonld);
assert(parsed['@graph'].length >= 5, "At least 5 nodes (doctor, 2 patients, ventilator, act)");

// Validate structure
const referents = parsed['@graph'].filter(n => n['@type'].includes('DiscourseReferent'));
const acts = parsed['@graph'].filter(n => n['@type'].includes('IntentionalAct'));
assert(referents.length >= 4, "4+ discourse referents");
assert(acts.length >= 1, "1+ intentional act");

// Validate JSON-LD syntax
const jsonldLib = require('jsonld');
await jsonldLib.expand(jsonld); // Should not throw
```

#### Week 1 Acceptance Criteria

**✓ AC-W1.1**: Valid JSON-LD output (passes jsonld.expand() without errors)
**✓ AC-W1.2**: All entities are DiscourseReferent (NOT BFO entities), acts ARE CCO-typed
**✓ AC-W1.3**: Acts link to discourse referents (not undefined IRIs)
**✓ AC-W1.4**: Roles created with bearers (SHACL Role Pattern foundation)
**✓ AC-W1.5**: Text span preservation for all referents
**✓ AC-W1.6**: IRI generation uses `inst:` namespace with SHA-256 hashing consistently
**✓ AC-W1.7**: All instance data includes `owl:NamedIndividual` in type arrays

---

## Week 2: Assertion Events + GIT-Minimal Integration

### Objective
Wrap all detections (values, context intensity) as assertion events with GIT-Minimal provenance (assertionType, validInContext).

---

### Phase 2.1: Assertion Event Builder (Days 6-7)

**Goal**: Model value detections and context assessments as occurrent events.

#### Tasks

**Day 6: Value Assertion Events**
- [ ] Create `src/graph/AssertionEventBuilder.js`
- [ ] Wrap current value detection (Week 1/2a) in `tagteam:ValueAssertionEvent`
- [ ] Create separate ICE nodes (not inline) for each value
- [ ] Add three-way confidence decomposition (extraction/classification/relevance)
- [ ] Add provenance metadata (detected_by, based_on, temporal_extent)

**Day 7: Context Assessment Events**
- [ ] Wrap context intensity (Week 2a) in `tagteam:ContextAssessmentEvent`
- [ ] Convert 12 dimensions → 12 separate assertion events
- [ ] Link assessment events to ICE nodes
- [ ] Add confidence breakdown to assessments

#### Acceptance Criteria

**AC-2.1.1: Value Assertion Structure**
```javascript
// GIVEN
const text = "The doctor must decide between patients' autonomy and justice";

// WHEN
const graph = SemanticGraphBuilder.build(text);
const assertions = graph['@graph'].filter(n => n['@type'].includes('ValueAssertionEvent'));

// THEN
assert(assertions.length >= 2, "Autonomy + Justice assertions");
const autoAssertion = assertions.find(a => a['rdfs:label'].includes('autonomy'));
assert(autoAssertion['tagteam:asserts'], "Links to ICE");
assert(autoAssertion['tagteam:detected_by'], "Has parser agent");
assert(autoAssertion['tagteam:based_on'], "Links to input text IBE");
```

**AC-2.1.2: Confidence Breakdown**
```javascript
assert(autoAssertion['tagteam:extractionConfidence'] >= 0.0);
assert(autoAssertion['tagteam:classificationConfidence'] >= 0.0);
assert(autoAssertion['tagteam:relevanceConfidence'] >= 0.0);
assert(autoAssertion['tagteam:aggregateConfidence'] >= 0.0);
assert(autoAssertion['tagteam:aggregationMethod'] === 'geometric_mean');

// Verify geometric mean calculation
const extracted = autoAssertion['tagteam:extractionConfidence'];
const classified = autoAssertion['tagteam:classificationConfidence'];
const relevant = autoAssertion['tagteam:relevanceConfidence'];
const expected = Math.pow(extracted * classified * relevant, 1/3);
assert(Math.abs(autoAssertion['tagteam:aggregateConfidence'] - expected) < 0.01);
```

**AC-2.1.3: ICE as Separate Nodes**
```javascript
const iceNodes = graph['@graph'].filter(n => n['@type'].includes('cco:InformationContentEntity'));
assert(iceNodes.length >= 2, "Separate ICE nodes for Autonomy + Justice");

const autonomyICE = iceNodes.find(ice => ice['rdfs:label'].includes('Autonomy'));
assert(autonomyICE['@id'] === autoAssertion['tagteam:asserts'], "Assertion links to ICE");
```

**AC-2.1.4: Context Assessment Events**
```javascript
const contextAssessments = graph['@graph'].filter(n =>
  n['@type'].includes('ContextAssessmentEvent'));
assert(contextAssessments.length >= 1, "At least urgency assessment");

const urgency = contextAssessments.find(c => c['tagteam:dimension'] === 'temporal.urgency');
assert(urgency['tagteam:score'] >= 0.0 && urgency['tagteam:score'] <= 1.0);
assert(urgency['tagteam:extractionConfidence'], "Has confidence breakdown");
```

#### Deliverables
- [ ] `AssertionEventBuilder.js` (200 lines)
- [ ] Updated value detection to output assertion events
- [ ] Updated context intensity to output assessment events
- [ ] Unit test: `test-assertion-events.js` (150 lines)

---

### Phase 2.2: GIT-Minimal Integration (Days 8-9)

**Goal**: Add assertionType, validInContext, and InterpretationContext nodes for provenance.

#### Tasks

**Day 8: Assertion Type Labeling**
- [ ] Add `tagteam:assertionType` property to all assertion events
- [ ] Default all events to `tagteam:AutomatedDetection`
- [ ] Add GIT classes to @context (AutomatedDetection, HumanValidation, etc.)
- [ ] Document assertion type hierarchy

**Day 9: Interpretation Context**
- [ ] Create `src/graph/ContextManager.js`
- [ ] Generate `tagteam:InterpretationContext` nodes
- [ ] Link all assertions to context via `tagteam:validInContext`
- [ ] Support parse option: `{ context: 'MedicalEthics' }`
- [ ] Implement `Default_Context` fallback

#### Acceptance Criteria

**AC-2.2.1: Assertion Type on All Events**
```javascript
// GIVEN
const graph = SemanticGraphBuilder.build(text);

// WHEN
const allAssertions = graph['@graph'].filter(n =>
  n['@type'].includes('ValueAssertionEvent') ||
  n['@type'].includes('ContextAssessmentEvent'));

// THEN
allAssertions.forEach(assertion => {
  assert(assertion['tagteam:assertionType'] === 'tagteam:AutomatedDetection',
    "All automated detections labeled correctly");
});
```

**AC-2.2.2: Interpretation Context Creation**
```javascript
// GIVEN
const options = { format: 'jsonld', context: 'MedicalEthics' };

// WHEN
const jsonld = TagTeam.parse(text, options);
const graph = JSON.parse(jsonld);

// THEN
const contexts = graph['@graph'].filter(n =>
  n['@type'].includes('tagteam:InterpretationContext'));
assert(contexts.length === 1, "Exactly one context node");
assert(contexts[0]['tagteam:framework'] === 'Principlism (Beauchamp & Childress)');
```

**AC-2.2.3: Valid In Context Links**
```javascript
const allAssertions = graph['@graph'].filter(n =>
  n['@type'].includes('ValueAssertionEvent') ||
  n['@type'].includes('ContextAssessmentEvent'));

allAssertions.forEach(assertion => {
  assert(assertion['tagteam:validInContext'], "Has validInContext link");
  assert(assertion['tagteam:validInContext'].includes('MedicalEthics') ||
         assertion['tagteam:validInContext'].includes('Default'),
    "Links to valid context");
});
```

**AC-2.2.4: Default Context Fallback**
```javascript
// GIVEN: No context specified
const defaultGraph = TagTeam.parse(text, { format: 'jsonld' });

// THEN: Uses tagteam:Default_Context (pre-defined vocabulary item, not inst:)
const parsed = JSON.parse(defaultGraph);
const assertions = parsed['@graph'].filter(n => n['@type'].includes('AssertionEvent'));
assertions.forEach(a => {
  assert(a['tagteam:validInContext'] === 'tagteam:Default_Context',
    "Uses tagteam: namespace for well-known default context");
});
```

**AC-2.2.5: Supersession Chain Foundation (GIT-Minimal)**
```javascript
// CRITICAL: Supersession must be testable for validation workflow foundation
// Verify @context supports supersedes/validatedBy properties
const context = parsed['@context'];
assert(context.supersedes, "@context defines supersedes");
assert(context.supersedes['@type'] === '@id', "supersedes is object property");
assert(context.validatedBy, "@context defines validatedBy");
assert(context.validatedBy['@type'] === '@id', "validatedBy is object property");

// Verify nodes CAN have supersedes property (even if not populated yet)
// This establishes foundation for Phase 5 HumanValidation workflow
const exampleAssertion = assertions[0];
// Should be allowed (even if undefined for AutomatedDetection in Phase 4)
assert(exampleAssertion['tagteam:supersedes'] === undefined ||
       typeof exampleAssertion['tagteam:supersedes'] === 'string',
  "Supersedes property is valid IRI or undefined");
```

#### Deliverables
- [ ] `ContextManager.js` (80 lines)
- [ ] Updated @context with GIT vocabulary
- [ ] Unit test: `test-git-integration.js` (100 lines)
- [ ] Documentation: GIT assertion types reference

---

### Phase 2.3: Information Staircase (ICE/IBE) (Day 10)

**Goal**: Complete the information architecture with IBE nodes and concretization relationships.

**Critical Note**: ICE → IBE linking is REQUIRED (not "if needed"). The Information Staircase from SHML paper requires this for semantic honesty.

#### Tasks

**Day 10: IBE Node Generation**
- [ ] Generate `cco:InformationBearingEntity` node for input text
- [ ] Add `cco:has_text_value` with full input text
- [ ] **REQUIRED**: Link assertion events to IBE via `tagteam:based_on` (provenance)
- [ ] **REQUIRED**: Link ICE to IBE via `cco:is_concretized_by` (information staircase)
- [ ] Ensure both relationships exist for SHACL compliance
- [ ] Add parser agent node (`cco:ArtificialAgent`)

#### Acceptance Criteria

**AC-2.3.1: IBE Node Exists**
```javascript
const ibeNodes = graph['@graph'].filter(n =>
  n['@type'].includes('cco:InformationBearingEntity'));
assert(ibeNodes.length === 1, "One IBE for input text");

const ibe = ibeNodes[0];
assert(ibe['cco:has_text_value'] === text, "IBE contains full input text");
assert(ibe['tagteam:received_at'], "Has timestamp");
```

**AC-2.3.2: Assertion Events Link to IBE (REQUIRED)**
```javascript
const assertions = graph['@graph'].filter(n =>
  n['@type'].includes('AssertionEvent'));
assertions.forEach(a => {
  assert(a['tagteam:based_on'], "Assertion has based_on link");
  assert(a['tagteam:based_on'] === ibe['@id'], "All assertions based on IBE");
});
```

**AC-2.3.2b: ICE → IBE Concretization Link (REQUIRED for SHACL)**
```javascript
const iceNodes = graph['@graph'].filter(n =>
  n['@type'].includes('cco:InformationContentEntity'));

iceNodes.forEach(ice => {
  assert(ice['cco:is_concretized_by'], "ICE has concretization link");
  assert(ice['cco:is_concretized_by'] === ibe['@id'], "ICE concretized by IBE");
});

// Verify IBE also has inverse (optional but recommended)
if (ibe['cco:concretizes']) {
  const concretizedICEs = Array.isArray(ibe['cco:concretizes'])
    ? ibe['cco:concretizes']
    : [ibe['cco:concretizes']];
  iceNodes.forEach(ice => {
    assert(concretizedICEs.includes(ice['@id']), "IBE inverse link consistent");
  });
}
```

**AC-2.3.3: Parser Agent Node**
```javascript
const agents = graph['@graph'].filter(n =>
  n['@type'].includes('cco:ArtificialAgent'));
assert(agents.length === 1, "One parser agent");
assert(agents[0]['tagteam:version'] === '3.0.0-alpha.2');
assert(agents[0]['rdfs:label'].includes('TagTeam'));
```

#### Deliverables
- [ ] IBE generation logic in `SemanticGraphBuilder.js`
- [ ] Parser agent node generation
- [ ] Unit test: `test-information-staircase.js` (60 lines)

---

### Week 2 Milestone: SHML+GIT-Compliant Output

**Goal**: Full semantic honesty with provenance tracking.

#### Milestone Test
```javascript
// GIVEN
const text = "The doctor must allocate the last ventilator between two patients";
const options = { format: 'jsonld', context: 'MedicalEthics' };

// WHEN
const jsonld = TagTeam.parse(text, options);
const graph = JSON.parse(jsonld);

// THEN: Verify SHML compliance
const assertions = graph['@graph'].filter(n =>
  n['@type'].includes('ValueAssertionEvent') ||
  n['@type'].includes('ContextAssessmentEvent'));

assertions.forEach(a => {
  // Provenance
  assert(a['tagteam:detected_by'], "Has detecting agent");
  assert(a['tagteam:based_on'], "Based on IBE");
  assert(a['tagteam:temporal_extent'], "Has timestamp");

  // GIT-Minimal
  assert(a['tagteam:assertionType'] === 'tagteam:AutomatedDetection');
  assert(a['tagteam:validInContext'], "Valid in context");

  // Confidence
  assert(a['tagteam:extractionConfidence'] !== undefined);
  assert(a['tagteam:aggregateConfidence'] !== undefined);
});

// Verify no predicate shortcuts
const iceNodes = graph['@graph'].filter(n =>
  n['@type'].includes('InformationContentEntity'));
iceNodes.forEach(ice => {
  // ICE should NOT directly assert values - assertions do that
  assert(!ice['tagteam:value'], "No direct value property on ICE");
});
```

#### Week 2 Acceptance Criteria

**✓ AC-W2.1**: All value detections are ValueAssertionEvent (not flat values)
**✓ AC-W2.2**: All context assessments are ContextAssessmentEvent
**✓ AC-W2.3**: Every assertion has assertionType = AutomatedDetection
**✓ AC-W2.4**: Every assertion has validInContext link
**✓ AC-W2.5**: Three-way confidence breakdown on all assertions
**✓ AC-W2.6**: IBE node exists with full input text
**✓ AC-W2.7**: Parser agent node exists
**✓ AC-W2.8**: InterpretationContext node created when context specified

---

## Week 3: SHACL Validation + Production Readiness

### Objective
Validate graphs against expert-certified SHACL patterns, handle complexity budget, and achieve production quality.

---

### Phase 3.1: SHACL Validator Integration (Days 11-12)

**Goal**: Integrate the expert-approved shaclValidator.js from Fandaws and validate outputs.

**Note**: SHACL patterns are ALREADY AVAILABLE at [planning/week3/SHACL_PATTERNS_REFERENCE.md](planning/week3/SHACL_PATTERNS_REFERENCE.md) (expert-certified 2026-01-09, 2026-01-13). This is an implementation task, not a design task.

#### Tasks

**Day 11: Validator Adaptation**
- [ ] Review `src/validation/shaclValidator.js` (Fandaws reference implementation)
- [ ] Review `planning/week3/SHACL_PATTERNS_REFERENCE.md` (expert-certified patterns)
- [ ] Create `src/ontology/SHMLValidator.js` wrapper
- [ ] Adapt validator for TagTeam's JSON-LD structure
- [ ] Implement validation reporting (violations, warnings, info)

**Day 12: Pattern Implementation**
- [ ] Priority 1: Role Pattern validation
- [ ] Priority 1: Information Staircase validation
- [ ] Priority 1: Domain/Range validation
- [ ] Priority 2: Socio-Primal Pattern (Agent/Act)
- [ ] Priority 2: Designation Pattern
- [ ] Priority 2: Vocabulary Validation

#### Acceptance Criteria

**AC-3.1.1: Role Pattern Validation**
```javascript
// GIVEN: Graph with Role lacking bearer
const badGraph = {
  "@graph": [
    {
      "@id": "ex:AgentRole_0",
      "@type": ["bfo:BFO_0000023"],
      "bfo:realized_in": "ex:Act_0"
      // MISSING: bfo:inheres_in
    }
  ]
};

// WHEN
const report = SHMLValidator.validate(badGraph);

// THEN
assert(report.violations.length >= 1, "Detects missing bearer");
const violation = report.violations.find(v => v.pattern === 'RolePattern');
assert(violation.severity === 'VIOLATION');
assert(violation.message.includes('bearer'));
```

**AC-3.1.2: Information Staircase Validation**
```javascript
// GIVEN: Well-formed ICE → IBE
const goodGraph = {
  "@graph": [
    {
      "@id": "ex:Autonomy_ICE",
      "@type": ["cco:InformationContentEntity"],
      "cco:is_concretized_by": "ex:Text_IBE"
    },
    {
      "@id": "ex:Text_IBE",
      "@type": ["cco:InformationBearingEntity"],
      "cco:has_text_value": "sample text"
    }
  ]
};

// WHEN
const report = SHMLValidator.validate(goodGraph);

// THEN
const staircaseWarnings = report.warnings.filter(w => w.pattern === 'InformationStaircase');
assert(staircaseWarnings.length === 0, "No warnings for valid staircase");
```

**AC-3.1.3: Vocabulary Validation**
```javascript
// GIVEN: Typo in class name
const typoGraph = {
  "@graph": [{
    "@id": "ex:Entity_0",
    "@type": ["cco:Persosn"]  // Typo: should be cco:Person
  }]
};

// WHEN
const report = SHMLValidator.validate(typoGraph);

// THEN
const vocabWarnings = report.warnings.filter(w => w.pattern === 'VocabularyValidation');
assert(vocabWarnings.length >= 1, "Detects typo");
assert(vocabWarnings[0].message.includes('Persosn'));
```

**AC-3.1.4: Validation Reporting Format**
```javascript
const report = SHMLValidator.validate(graph);

assert(report.complianceScore !== undefined, "Has compliance score");
assert(report.complianceScore >= 0 && report.complianceScore <= 100);
assert(Array.isArray(report.violations));
assert(Array.isArray(report.warnings));
assert(Array.isArray(report.info));

report.violations.forEach(v => {
  assert(v.pattern, "Has pattern name");
  assert(v.severity === 'VIOLATION');
  assert(v.message, "Has human-readable message");
  assert(v.node, "Identifies problematic node");
});
```

#### Deliverables
- [ ] `SHMLValidator.js` (150 lines)
- [ ] Validation report formatter
- [ ] Unit test: `test-shacl-validation.js` (200 lines)
- [ ] Test fixtures for all 8 patterns

---

### Phase 3.2: Complexity Budget Enforcement (Day 13)

**Goal**: Enforce hard limits to prevent graph explosion, implement chunking for long texts.

#### Tasks

**Day 13: Budget Module**
- [ ] Create `src/graph/ComplexityBudget.js`
- [ ] Implement node counting (max 200 nodes)
- [ ] Implement referent counting (max 30 discourse referents)
- [ ] Implement assertion counting (max 50 assertion events)
- [ ] Implement input length check (max 2000 chars)
- [ ] Implement pruning strategies (drop low-confidence assertions)
- [ ] Implement chunking for >2000 char inputs

#### Acceptance Criteria

**AC-3.2.1: Hard Limits Enforced**
```javascript
// GIVEN: Very long text (>2000 chars)
const longText = "The doctor...".repeat(1000); // >2000 chars

// WHEN
const result = TagTeam.parse(longText, { format: 'jsonld' });

// THEN: Either chunked or rejected
if (result.chunked) {
  assert(Array.isArray(result.chunks), "Returns multiple graphs");
  result.chunks.forEach(chunk => {
    const graph = JSON.parse(chunk);
    assert(graph['@graph'].length <= 200, "Each chunk under node limit");
  });
} else {
  // Single graph, but may be truncated
  const graph = JSON.parse(result);
  assert(graph['@graph'].length <= 200, "Graph under node limit");
}
```

**AC-3.2.2: Referent Limit**
```javascript
// GIVEN: Text with 50 potential entities
const manyEntities = "Person1, Person2, Person3, ...Person50 all met";

// WHEN
const graph = JSON.parse(TagTeam.parse(manyEntities, { format: 'jsonld' }));

// THEN
const referents = graph['@graph'].filter(n =>
  n['@type'].includes('DiscourseReferent'));
assert(referents.length <= 30, "Capped at 30 referents");
```

**AC-3.2.3: Assertion Limit with Pruning**
```javascript
// GIVEN: Text triggering many low-confidence assertions
const ambiguous = "Maybe it's about freedom or possibly autonomy...";

// WHEN
const graph = JSON.parse(TagTeam.parse(ambiguous, { format: 'jsonld' }));

// THEN
const assertions = graph['@graph'].filter(n =>
  n['@type'].includes('AssertionEvent'));
assert(assertions.length <= 50, "Capped at 50 assertions");

// Verify pruning kept high-confidence assertions
if (assertions.length === 50) {
  assertions.forEach(a => {
    assert(a['tagteam:aggregateConfidence'] >= 0.5,
      "Pruned low-confidence assertions");
  });
}
```

**AC-3.2.4: Chunking Metadata**
```javascript
// GIVEN: Chunked result
const chunked = TagTeam.parse(longText, { format: 'jsonld' });

// THEN: Each chunk has metadata
chunked.chunks.forEach((chunk, idx) => {
  const graph = JSON.parse(chunk);
  const metadata = graph['@graph'].find(n =>
    n['@type'].includes('tagteam:DocumentParseResult'));

  assert(metadata['tagteam:chunk_index'] === idx);
  assert(metadata['tagteam:total_chunks'] === chunked.chunks.length);
  assert(metadata['tagteam:chunk_text_range'], "Has text range");
});
```

**AC-3.2.5: Cross-Chunk Entity Reference Linking**
```javascript
// CRITICAL: If the same entity appears in multiple chunks, they need to be linked
// This was MISSING from original roadmap

// GIVEN: Long text where "the doctor" appears in multiple chunks
const multiChunkText = "The doctor arrived. ".repeat(200); // Spans 2+ chunks

// WHEN
const chunked = TagTeam.parse(multiChunkText, { format: 'jsonld' });

// THEN: Verify entity IRI consistency across chunks
const allDoctorRefs = [];
chunked.chunks.forEach(chunkJSON => {
  const graph = JSON.parse(chunkJSON);
  const doctorRefs = graph['@graph'].filter(n =>
    n['@type'].includes('DiscourseReferent') &&
    n['rdfs:label']?.includes('doctor'));
  allDoctorRefs.push(...doctorRefs);
});

// Same entity text + type should generate same IRI (SHA-256 determinism)
// OR chunks should explicitly link co-referent entities
if (allDoctorRefs.length > 1) {
  const uniqueIRIs = new Set(allDoctorRefs.map(r => r['@id']));

  // Strategy 1: Same IRI (preferred - enables graph merging)
  const usingSameIRI = uniqueIRIs.size === 1;

  // Strategy 2: Explicit co-reference links
  const usingCorefLinks = allDoctorRefs.some(r =>
    r['tagteam:same_as'] || r['owl:sameAs']);

  assert(usingSameIRI || usingCorefLinks,
    "Cross-chunk entities either share IRI or have explicit co-reference links");

  console.log(`Cross-chunk strategy: ${usingSameIRI ? 'Same IRI' : 'Co-reference links'}`);
}
```

#### Deliverables
- [ ] `ComplexityBudget.js` (120 lines)
- [ ] Integration into SemanticGraphBuilder
- [ ] Unit test: `test-complexity-budget.js` (100 lines)

---

### Phase 3.3: Full IEE Corpus Testing (Day 14)

**Goal**: Test against all 60 IEE corpus scenarios, ensure 100% graph validity.

#### Tasks

**Day 14: Corpus Integration Tests**
- [ ] Create `tests/integration/test-phase4-corpus.js`
- [ ] Run all 60 IEE scenarios through Phase 4 pipeline
- [ ] Validate all outputs with SHACL validator
- [ ] Generate compliance report for each scenario
- [ ] Identify and fix any validation failures

#### Acceptance Criteria

**AC-3.3.1: All Scenarios Produce Valid JSON-LD**
```javascript
// GIVEN: All 60 IEE corpus scenarios
const scenarios = require('../fixtures/iee-corpus.json');

// WHEN
const results = scenarios.map(s => TagTeam.parse(s.text, { format: 'jsonld' }));

// THEN
results.forEach((jsonld, idx) => {
  assert.doesNotThrow(() => JSON.parse(jsonld),
    `Scenario ${idx}: Valid JSON`);

  const graph = JSON.parse(jsonld);
  assert(graph['@context'], `Scenario ${idx}: Has @context`);
  assert(graph['@graph'], `Scenario ${idx}: Has @graph`);
});
```

**AC-3.3.2: SHACL Compliance Rate**
```javascript
// Target: 90% compliance (54/60 scenarios with no VIOLATIONS)
let compliantCount = 0;

results.forEach((jsonld, idx) => {
  const graph = JSON.parse(jsonld);
  const report = SHMLValidator.validate(graph);

  if (report.violations.length === 0) {
    compliantCount++;
  } else {
    console.warn(`Scenario ${idx} violations:`, report.violations);
  }
});

const complianceRate = (compliantCount / results.length) * 100;
assert(complianceRate >= 90, `Compliance rate: ${complianceRate}%`);
```

**AC-3.3.3: Discourse Referent Recall**
```javascript
// Target: 95% of expected entities extracted as discourse referents
scenarios.forEach((scenario, idx) => {
  if (!scenario.expectedEntities) return;

  const graph = JSON.parse(results[idx]);
  const referents = graph['@graph'].filter(n =>
    n['@type'].includes('DiscourseReferent'));

  const extractedCount = referents.length;
  const expectedCount = scenario.expectedEntities.length;
  const recall = extractedCount / expectedCount;

  assert(recall >= 0.95,
    `Scenario ${idx}: Entity recall ${recall * 100}%`);
});
```

**AC-3.3.4: Value Assertion Accuracy**
```javascript
// Compare against Week 2a baseline (100% accuracy on values)
scenarios.forEach((scenario, idx) => {
  const graph = JSON.parse(results[idx]);
  const assertions = graph['@graph'].filter(n =>
    n['@type'].includes('ValueAssertionEvent'));

  const detectedValues = assertions.map(a => {
    const iceNode = graph['@graph'].find(node =>
      node['@id'] === a['tagteam:asserts']);
    return iceNode['rdfs:label'].split(' ')[0]; // Extract value name
  });

  scenario.expectedValues.forEach(expectedValue => {
    assert(detectedValues.includes(expectedValue),
      `Scenario ${idx}: Missing value ${expectedValue}`);
  });
});
```

#### Deliverables
- [ ] `test-phase4-corpus.js` (200 lines)
- [ ] Compliance report: `PHASE4_CORPUS_VALIDATION.md`
- [ ] Failure analysis document (if any scenarios fail)

---

### Phase 3.4: Documentation & Examples (Day 15)

**Goal**: Complete user-facing documentation, API reference, and examples.

#### Tasks

**Day 15: Documentation**
- [ ] Update README.md with Phase 4 usage
- [ ] Create `docs/PHASE4_USER_GUIDE.md`
- [ ] Create `docs/JSONLD_EXAMPLES.md` with annotated outputs
- [ ] Create `docs/GIT_INTEGRATION.md` explaining assertionType/validInContext
- [ ] Create `docs/SHACL_VALIDATION_GUIDE.md`
- [ ] Add JSDoc comments to all public APIs
- [ ] Generate API reference with documentation tool

#### Acceptance Criteria

**AC-3.4.1: User Guide Completeness**
The user guide must cover:
- [ ] Basic usage: `TagTeam.parse(text, { format: 'jsonld' })`
- [ ] Context specification: `{ context: 'MedicalEthics' }`
- [ ] Interpretation of output: @graph structure walkthrough
- [ ] Confidence score interpretation
- [ ] SHACL validation usage
- [ ] Troubleshooting common issues

**AC-3.4.2: Example Gallery**
`JSONLD_EXAMPLES.md` must include annotated examples for:
- [ ] Simple scenario (1 entity, 1 act, 1 value)
- [ ] Complex scenario (ventilator allocation - full example from spec)
- [ ] Context assessment focus
- [ ] Multi-value conflict
- [ ] Chunked long text

**AC-3.4.3: API Reference**
```javascript
// All public methods must have JSDoc
/**
 * Parse text into JSON-LD semantic graph
 * @param {string} text - Input text to analyze
 * @param {ParseOptions} options - Configuration options
 * @param {('legacy'|'jsonld')} options.format - Output format
 * @param {string} [options.context] - Interpretation context (e.g., 'MedicalEthics')
 * @returns {string|object} JSON-LD string or legacy format object
 * @example
 * const jsonld = TagTeam.parse("The doctor treats the patient", {
 *   format: 'jsonld',
 *   context: 'MedicalEthics'
 * });
 */
TagTeam.parse(text, options)
```

#### Deliverables
- [ ] `PHASE4_USER_GUIDE.md` (500 lines)
- [ ] `JSONLD_EXAMPLES.md` (300 lines)
- [ ] `GIT_INTEGRATION.md` (200 lines)
- [ ] `SHACL_VALIDATION_GUIDE.md` (250 lines)
- [ ] Updated README.md

---

### Week 3 Milestone: Production Release

**Goal**: v3.0.0-alpha.2 ready for public deployment.

#### Final Acceptance Test

```javascript
// End-to-end production test
const text = `
The family must decide whether to continue life support for their elderly father.
The doctor explains that further treatment may prolong suffering without improving outcomes.
The patient's autonomy is limited due to unconsciousness, but his prior living will
expressed a wish for comfort care. The family is torn between respecting his wishes
and their hope for recovery.
`;

const options = {
  format: 'jsonld',
  context: 'MedicalEthics'
};

// Parse
const jsonld = TagTeam.parse(text, options);
const graph = JSON.parse(jsonld);

// Validate structure
assert(graph['@context']);
assert(graph['@graph'].length >= 10, "Complex graph with many nodes");

// Validate SHACL
const report = SHMLValidator.validate(graph);
assert(report.complianceScore >= 80, `Compliance: ${report.complianceScore}%`);
assert(report.violations.length === 0, "No VIOLATIONS");

// Check key components
const referents = graph['@graph'].filter(n => n['@type'].includes('DiscourseReferent'));
assert(referents.length >= 3, "Family, doctor, patient");

const acts = graph['@graph'].filter(n => n['@type'].includes('IntentionalAct'));
assert(acts.length >= 1, "Decision act");

const assertions = graph['@graph'].filter(n =>
  n['@type'].includes('ValueAssertionEvent'));
assert(assertions.length >= 2, "Autonomy, beneficence, etc.");

// Verify GIT compliance
assertions.forEach(a => {
  assert(a['tagteam:assertionType'] === 'tagteam:AutomatedDetection');
  assert(a['tagteam:validInContext'].includes('MedicalEthics'));
  assert(a['tagteam:aggregateConfidence'] !== undefined);
});

// Verify context node
const contexts = graph['@graph'].filter(n =>
  n['@type'].includes('InterpretationContext'));
assert(contexts.length === 1);
assert(contexts[0]['tagteam:framework'] === 'Principlism (Beauchamp & Childress)');

console.log("✅ Production release criteria met");
```

#### Week 3 Acceptance Criteria

**✓ AC-W3.1**: All 60 IEE corpus scenarios produce valid JSON-LD
**✓ AC-W3.2**: SHACL compliance rate ≥ 90%
**✓ AC-W3.3**: Zero VIOLATIONS on production test scenarios
**✓ AC-W3.4**: Documentation complete (user guide, examples, API reference)
**✓ AC-W3.5**: Performance: Parse time < 200ms for typical scenario
**✓ AC-W3.6**: Graph size: Typical output < 50 KB
**✓ AC-W3.7**: Backwards compatibility: Legacy format still works

---

## Phase 4 Overall Success Criteria

### Functional Requirements

**FR-1: JSON-LD Output**
- [ ] Every parse outputs valid JSON-LD (passes jsonld.expand())
- [ ] All entities typed as DiscourseReferent (not BFO entities)
- [ ] All detections modeled as assertion events (no predicate shortcuts)
- [ ] Provenance tracked (parser version, timestamp, confidence)

**FR-2: SHML Compliance**
- [ ] No predicate shortcuts - all assertions are events
- [ ] ICE/IBE distinction maintained
- [ ] Process model explicit (parser acts visible)
- [ ] Information staircase: ICE → IBE → Literal

**FR-3: GIT-Minimal Compliance**
- [ ] All assertions have `assertionType` (default: AutomatedDetection)
- [ ] All assertions have `validInContext` link
- [ ] InterpretationContext node created when context specified
- [ ] Human/machine distinction expressible
- [ ] Supersession chain trackable (foundation for validation workflows)

**FR-4: SHACL Validation**
- [ ] Role Pattern: Roles have bearers (VIOLATION if missing)
- [ ] Information Staircase: ICEs concretized (WARNING if not)
- [ ] Domain/Range: Predicates used correctly
- [ ] Vocabulary: No typos in CCO/BFO terms (WARNING)
- [ ] Compliance score calculation (0-100%)

**FR-5: Complexity Management**
- [ ] Max 200 nodes per graph (enforced)
- [ ] Max 30 discourse referents (enforced)
- [ ] Max 50 assertion events (enforced)
- [ ] Max 2000 characters input (chunked if exceeded)
- [ ] Pruning: Low-confidence assertions dropped when limits hit

### Non-Functional Requirements

**NFR-1: Performance**
- [ ] Parse time < 300ms for typical scenario (< 500 chars) - relaxed from 200ms
  - **Note**: Compromise NLP alone: 50-100ms, plus graph construction, IRI hashing (SHA-256), confidence calculation, assertion wrapping
  - If significantly faster after Week 2 benchmarking, can tighten to 250ms
- [ ] JSON-LD output < 50 KB for typical scenario
- [ ] SHACL validation time < 100ms
- [ ] **Benchmark after Week 2** to verify performance targets are realistic

**NFR-2: Backwards Compatibility**
- [ ] Legacy format still supported: `{ format: 'legacy' }`
- [ ] Week 2a tests still pass
- [ ] Projection helpers: `extractValues(graph)`, `extractContextScores(graph)`

**NFR-3: Code Quality**
- [ ] 90% test coverage (unit + integration)
- [ ] All public APIs have JSDoc
- [ ] ESLint passes with zero warnings
- [ ] No console.log in production code

**NFR-4: Documentation**
- [ ] User guide with examples
- [ ] API reference
- [ ] SHACL validation guide
- [ ] GIT integration explained
- [ ] Migration guide from Week 2a

---

## Risk Mitigation Strategies

### Risk 1: SHACL Validation Complexity
**Likelihood**: Medium
**Impact**: High
**Mitigation**:
- Use proven shaclValidator.js from Fandaws (expert-certified)
- Prioritize patterns (Role > Staircase > Domain/Range)
- Accept warnings (not just violations) as success for Week 3
- Defer advanced patterns (Measurement, Temporal) to Phase 5

### Risk 2: Performance Degradation
**Likelihood**: Low
**Impact**: Medium
**Mitigation**:
- Benchmark after each phase
- Profile with Chrome DevTools if >200ms
- Optimize Compromise integration (cache NLP results)
- Implement lazy graph construction (don't build unused nodes)

### Risk 3: Graph Explosion (Too Many Nodes)
**Likelihood**: High
**Impact**: Medium
**Mitigation**:
- Enforce complexity budget early (Week 1)
- Test with adversarial inputs (very long texts, many entities)
- Implement aggressive pruning (confidence threshold)
- Document chunking behavior clearly

### Risk 4: SHACL Compliance Failures
**Likelihood**: Medium
**Impact**: High
**Mitigation**:
- Start validation early (Week 2)
- Accept 80% compliance for alpha.2 (not 100%)
- Create fixture graphs for each pattern (test in isolation)
- Fail gracefully (report violations but don't crash)

### Risk 5: GIT Integration Scope Creep
**Likelihood**: High
**Impact**: Medium
**Mitigation**:
- Strictly limit to GIT-Minimal (assertionType, validInContext only)
- Defer HumanValidation workflow to Phase 5
- Defer multi-user collaboration to Phase 6
- Document future extensions clearly (roadmap)

---

## Dependencies

### External Libraries
- **compromise** (v14.14.5): NLP entity extraction
- **n3** (v1.17.1): RDF/Turtle parsing (already integrated)
- **jsonld** (optional): For expanded form validation

### Internal Dependencies
- **Week 1 NLP**: Compromise integration must be working
- **Week 2a Context Analysis**: 12 dimensions, 100% accuracy baseline
- **Phase 2 TTL Parser**: Ontology manifests for CCO/BFO class lookup

### Knowledge Dependencies
- **SHACL_PATTERNS_REFERENCE.md**: Expert-certified validation patterns
- **PHASE4_SPEC_JSONLD_SHML.md**: Architecture specification
- **PHASE4_ANSWERS.md**: Architectural decisions (LPG, DiscourseReferent, etc.)
- **GIT_Integration_Business_Case.md**: GIT-Minimal scope definition

---

## Deliverables Summary

### Code Artifacts
| Module | Lines of Code | Unit Tests | Status |
|--------|---------------|------------|--------|
| `SemanticGraphBuilder.js` | 150 | 20 | Week 1 |
| `JSONLDSerializer.js` | 50 | 15 | Week 1 |
| `EntityExtractor.js` | 150 | 20 | Week 1 |
| `ActExtractor.js` | 150 | 18 | Week 1 |
| `RoleDetector.js` | 120 | 15 | Week 1 |
| `AssertionEventBuilder.js` | 200 | 25 | Week 2 |
| `ContextManager.js` | 80 | 15 | Week 2 |
| `SHMLValidator.js` | 150 | 30 | Week 3 |
| `ComplexityBudget.js` | 120 | 20 | Week 3 |
| **TOTAL** | **1170 LOC** | **178 unit tests** (~15-30 per module) | |

**Note**: Original estimate of 50 unit tests was too low. Revised to 135+ unit tests for proper coverage (15-30 per module based on complexity).

### Documentation Artifacts
| Document | Pages | Status |
|----------|-------|--------|
| `PHASE4_USER_GUIDE.md` | 15 | Week 3 |
| `JSONLD_EXAMPLES.md` | 10 | Week 3 |
| `GIT_INTEGRATION.md` | 8 | Week 3 |
| `SHACL_VALIDATION_GUIDE.md` | 10 | Week 3 |
| `PHASE4_CORPUS_VALIDATION.md` | 5 | Week 3 |
| Updated README.md | 3 | Week 3 |
| **TOTAL** | **51 pages** | |

### Test Artifacts
| Test Suite | Scenarios | Status |
|------------|-----------|--------|
| Unit Tests (9 modules) | 178 | Weeks 1-3 |
| Integration Tests (corpus) | 60 | Week 3 |
| Performance Tests | 5 | Week 3 |
| SHACL Validation Tests | 8 patterns × 3 cases = 24 | Week 3 |
| Week Milestones | 3 | Weeks 1-3 |
| **TOTAL** | **270 test cases** | |

**Revision Note**: Increased from 123 to 270 test cases to ensure proper coverage. Unit tests increased from 50 to 178 (15-30 per module).

---

## Team Roles & Responsibilities

### Primary Developer
- All coding (Weeks 1-3)
- Unit test development
- Code review (self-review + external if available)
- Documentation writing

### Optional: External Reviewer (If Available)
- SHACL pattern verification (Week 2-3)
- GIT-Minimal compliance check (Week 2)
- Architecture review (Week 1 end)

### User (Aaron)
- Requirements clarification
- Acceptance testing (end of each week)
- Documentation review
- Final approval for release

---

## Next Steps

### Immediate Actions (Before Week 1)
1. **Review & Approve This Roadmap**
   - [ ] Accept phased approach (Walk, Then Run)
   - [ ] Confirm acceptance criteria are clear
   - [ ] Approve GIT-Minimal scope (no scope creep)

2. **Set Up Environment**
   - [ ] Ensure Compromise integration is stable (from Week 1/2a)
   - [ ] Verify n3 library is working (Phase 2)
   - [ ] Create `src/graph/` directory structure

3. **Clarify Open Questions**
   - [ ] CCO version to target? (Latest is ~2023)
   - [ ] Default context name? ("Default_Context" vs "General_Ethics")
   - [ ] Namespace IRI generation: hash algorithm? (SHA-256 vs MD5 vs UUID)

4. **Prepare Test Data**
   - [ ] Confirm IEE corpus is accessible (60 scenarios)
   - [ ] Create 5 adversarial test cases (very long, many entities, etc.)
   - [ ] Prepare SHACL test fixtures (1 per pattern)

### Weekly Checkpoints
- **End of Week 1**: Demo basic JSON-LD output (entities + acts)
- **End of Week 2**: Demo SHML+GIT-compliant output (assertions + context)
- **End of Week 3**: Final release review (compliance report + docs)

---

## Appendix A: Reference Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         TagTeam v3.0                            │
│                   (Phase 4: JSON-LD Output)                     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Input Text     │
                        │  + Options      │
                        │  {context: ...} │
                        └────────┬────────┘
                                 │
                                 ▼
        ┌────────────────────────────────────────────┐
        │      SemanticGraphBuilder.build()          │
        │  (Main Orchestrator - Week 1)              │
        └────────────────────────────────────────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 ▼               ▼               ▼
         ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
         │   Entity     │ │     Act      │ │   Assertion  │
         │  Extractor   │ │  Extractor   │ │    Event     │
         │  (Week 1)    │ │  (Week 1)    │ │   Builder    │
         │              │ │              │ │  (Week 2)    │
         └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
                │                │                │
                ▼                ▼                ▼
         Discourse        Intentional      Value/Context
         Referents        Acts             Assertions
         (tagteam:DR)     (cco:Act)        (tagteam:VAE)
                │                │                │
                └────────────────┼────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Context        │
                        │  Manager        │
                        │  (Week 2)       │
                        └────────┬────────┘
                                 │
                                 ▼
                        Add assertionType
                        Add validInContext
                        Create InterpretationContext
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Complexity     │
                        │  Budget         │
                        │  (Week 3)       │
                        └────────┬────────┘
                                 │
                                 ▼
                        Enforce limits
                        Prune low-confidence
                        Chunk if needed
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  JSON-LD        │
                        │  Serializer     │
                        │  (Week 1)       │
                        └────────┬────────┘
                                 │
                                 ▼
                        {
                          "@context": {...},
                          "@graph": [...]
                        }
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  SHACL          │
                        │  Validator      │
                        │  (Week 3)       │
                        └────────┬────────┘
                                 │
                                 ▼
                        Compliance Report
                        (Violations, Warnings, Score)
```

---

## Appendix B: Example Progression

### Week 1 Output (Basic JSON-LD)
```json
{
  "@context": {
    "tagteam": "http://tagteam.fandaws.org/ontology/",
    "cco": "http://www.ontologyrepository.com/CommonCoreOntologies/",
    "bfo": "http://purl.obolibrary.org/obo/"
  },
  "@graph": [
    {
      "@id": "inst:Doctor_Referent_a8f3",
      "@type": ["tagteam:DiscourseReferent"],
      "rdfs:label": "the doctor",
      "tagteam:denotesType": "cco:Person"
    },
    {
      "@id": "inst:Allocation_Act_b9e2",
      "@type": ["cco:IntentionalAct"],
      "cco:has_agent": "inst:Doctor_Referent_a8f3"
    }
  ]
}
```

### Week 2 Output (SHML + GIT)
```json
{
  "@context": { /* ... */ },
  "@graph": [
    {
      "@id": "inst:Doctor_Referent_a8f3",
      "@type": ["tagteam:DiscourseReferent"],
      "tagteam:denotesType": "cco:Person"
    },
    {
      "@id": "inst:Justice_Assertion_c4d1",
      "@type": ["tagteam:ValueAssertionEvent"],
      "tagteam:asserts": "inst:Justice_ICE",
      "tagteam:assertionType": "tagteam:AutomatedDetection",
      "tagteam:validInContext": "inst:MedicalEthics_Context",
      "tagteam:extractionConfidence": 0.95,
      "tagteam:aggregateConfidence": 0.87
    },
    {
      "@id": "inst:MedicalEthics_Context",
      "@type": ["tagteam:InterpretationContext"],
      "tagteam:framework": "Principlism"
    }
  ]
}
```

### Week 3 Output (Validated, Production-Ready)
```json
{
  "@context": { /* complete */ },
  "@graph": [
    /* Discourse Referents */
    /* Acts */
    /* Roles */
    /* Assertion Events (with GIT) */
    /* ICE/IBE nodes */
    /* InterpretationContext */
    /* Parser Agent */
  ],
  "_validation": {
    "complianceScore": 94,
    "violations": 0,
    "warnings": 2,
    "validated": "2026-01-18T12:00:00Z"
  }
}
```

---

**Document Status**: Ready for Review (Revised)
**Version**: 2.0
**Last Updated**: January 18, 2026
**Previous Version**: 1.0 (backed up to PHASE4_IMPLEMENTATION_ROADMAP_v1.md)
**Owner**: TagTeam Development Team
**Approver**: Aaron (Project Owner)

**Revision History**:
- v1.0 (2026-01-18): Initial roadmap
- v2.0 (2026-01-18): Addressed comprehensive critique - added Role Detection, fixed contradictions, specified technical details, increased test coverage

---

**Approval Section**

- [ ] **APPROVED** - Proceed with Phase 4 implementation per this roadmap
- [ ] **APPROVED WITH MODIFICATIONS** - See notes: _______________
- [ ] **REVISE** - Requested changes: _______________

**Approved by**: ___________________________
**Date**: ___________________________
**Target Start Date**: ___________________________
