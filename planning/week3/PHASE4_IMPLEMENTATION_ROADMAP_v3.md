# Phase 4 Implementation Roadmap v3.0: Two-Tier Architecture

**Project**: TagTeam v3.0.0-alpha.2
**Phase**: JSON-LD Graph Output with Two-Tier Architecture
**Duration**: 3 weeks (15 working days)
**Start Date**: TBD
**Status**: PLANNING
**Version**: 3.1 (Aligned with PHASE4_TWO_TIER_FINAL_SPEC_v2.2.md)

---

## Revision Summary (v3.0)

**Major Changes from v2.0 based on Two-Tier Architecture Specification**:

### Critical Changes (Breaking)

1. **C1: Entity Linking Model Changed**
   - OLD: `tagteam:denotesType` pointing to CCO class (e.g., `'cco:Person'`)
   - NEW: `cco:is_about` pointing to Tier 2 entity instance (e.g., `'inst:Person_Doctor'`)
   - Impact: EntityExtractor, all acceptance criteria

2. **C2: Acts Link to Tier 2 Entities**
   - OLD: `cco:has_agent` → DiscourseReferent
   - NEW: `cco:has_agent` → cco:Person (Tier 2)
   - Impact: ActExtractor, all act-related tests

3. **C3: Roles Inhere in Tier 2 Entities**
   - OLD: `bfo:inheres_in` → DiscourseReferent
   - NEW: `bfo:inheres_in` → cco:Person or cco:Organization
   - Impact: RoleDetector, SHACL validation

4. **C4: New Tier 2 Entity Creation Required**
   - NEW: Must create cco:Person, cco:Artifact, cco:Organization instances
   - NEW: `RealWorldEntityFactory.js` module required
   - Impact: Week 1 restructured

5. **C5: Inverse Relations Removed**
   - OLD: Assert both `inheres_in` on Role AND `is_bearer_of` on Person
   - NEW: Assert only `inheres_in` on Role (reasoner infers inverse)
   - Impact: RoleDetector cleanup

6. **C6: Assertion Types Renamed and Retyped**
   - OLD: `ValueAssertionEvent` (Occurrent)
   - NEW: `ValueDetectionRecord` (ICE)
   - OLD: `ContextAssessmentEvent` (Occurrent)
   - NEW: `ContextAssessmentRecord` (ICE)
   - Impact: AssertionEventBuilder → DetectionRecordBuilder

7. **C7: IBE Category Corrected**
   - OLD: IBE typed as GDC (Generically Dependent Continuant)
   - NEW: IBE typed as IC (Independent Continuant)
   - Impact: Documentation, @context

### Moderate Changes (Structural)

8. **M1: VerbPhrase Nodes Required**
   - NEW: Create `tagteam:VerbPhrase` ICE nodes
   - NEW: VerbPhrase links to Act via `is_about`
   - Impact: ActExtractor split

9. **M2: DirectiveContent Nodes Required**
   - NEW: Create `tagteam:DirectiveContent` for deontic modality
   - NEW: `cco:prescribes` / `cco:prescribed_by` bidirectional
   - Impact: New DeonticContentExtractor module

10. **M3: actualityStatus Required on Acts**
    - NEW: All acts must have `tagteam:actualityStatus`
    - NEW: Named Individuals: `tagteam:Actual`, `tagteam:Prescribed`, etc.
    - Impact: ActExtractor, ActualityStatusResolver

11. **M4: ScarcityAssertion Properties Changed**
    - OLD: `cco:is_about` pointing to resource
    - NEW: `tagteam:scarceResource` (single Artifact)
    - NEW: `tagteam:competingParties` (array of Persons)
    - Impact: ScarcityAssertionBuilder module

12. **M5: IBE Linking Relations Changed**
    - OLD: `cco:is_concretized_by` for ICE→IBE
    - NEW: `tagteam:has_component` (IBE→ICE) + `tagteam:extracted_from` (ICE→IBE)
    - Impact: SemanticGraphBuilder IBE generation

13. **M6: temporal_extent Scope Expanded**
    - OLD: Only on IBE
    - NEW: On ALL Tier 1 nodes (DiscourseReferent, VerbPhrase, etc.)
    - Impact: All extractors

### Minor Changes (Enhancements)

14. **N1: IRI Hash Length Increased**
    - OLD: 8 hex characters
    - NEW: 12 hex characters (better collision resistance)
    - Impact: IRIGenerator

15. **N2: Organization as Role Bearer**
    - NEW: cco:Organization can bear roles (not just Person)
    - Impact: RoleDetector validation

---

## v3.1 Addendum: Semantic Architect Review Changes

Based on the Semantic Architect Review of v2.1, the following additional changes are incorporated (from v2.2 spec):

### Breaking Changes (v3.1)

16. **Removed `tagteam:denotes` Alias**
    - Use `cco:is_about` consistently everywhere
    - Remove from @context and all references

17. **Document-Scoped Tier 2 IRIs**
    - Tier 2 entity IRIs now include document/session scope in hash input
    - Prevents accidental cross-document co-reference
    - Example: `"doctor|inst:IBE_abc123"` instead of just `"doctor"`

### Additive Changes (v3.1)

18. **Tier 2 Provenance Properties**
    - Add `tagteam:instantiated_at` (xsd:dateTime) to Tier 2 entities
    - Add `tagteam:instantiated_by` (IRI pointing to IBE) to Tier 2 entities

19. **Negated Acts Support**
    - Add `tagteam:Negated` to ActualityStatus vocabulary
    - Add `tagteam:negationMarker` property
    - Handle "did not" patterns in ActExtractor

20. **Coreference Resolution**
    - Add `tagteam:corefersWith` property for anaphoric references
    - Create CoreferenceResolver module (OPTIONAL for Phase 4)

21. **@container for competingParties**
    - Add `"@container": "@set"` to competingParties in @context

22. **Additional SHACL Shapes**
    - DirectiveContent must have `prescribes`
    - VerbPhrase must have `is_about` linking to Act
    - IBE must have at least one `has_component`
    - Bidirectional integrity check (prescribes ↔ prescribed_by)
    - Role realization constraint (warning if role realized in multiple acts)

23. **Scarcity Subproperties**
    - Declare `scarceResource` and `competingParties` as subproperties of `is_about`
    - Enables generic SPARQL queries for "what is this ICE about"

### Position Index Corrections (v3.1)

The example positions in the spec were corrected:
- Input text: "The doctor must allocate the last ventilator between two critically ill patients"
- Total length: **80** characters (not 82)
- "the last ventilator": positions **25-44** (not 27-46)
- "two critically ill patients": positions **53-80** (not 55-82)

---

## Executive Summary

Phase 4 v3.0 transforms TagTeam into a **Two-Tier Knowledge Graph Generator** that properly separates:

1. **Tier 1: Parsing Layer** (ICE) — What the text says (linguistic representation)
2. **Tier 2: Real-World Layer** (IC) — The entities being described (ontological representation)

**Key Architectural Principles**:
- DiscourseReferent (Tier 1) → `is_about` → Person/Artifact (Tier 2)
- Roles `inheres_in` Tier 2 Persons (NOT DiscourseReferents)
- Acts `has_agent` Tier 2 Persons (NOT DiscourseReferents)
- VerbPhrase (Tier 1) → `is_about` → IntentionalAct (Tier 2)

---

## Week 1: Two-Tier Core Infrastructure (REVISED)

### Objective
Build the foundational two-tier architecture: Tier 1 (parsing artifacts) and Tier 2 (real-world entities) with proper cross-tier linking.

---

### Phase 1.1: Core Infrastructure (Days 1-2) ✅ COMPLETE - NEEDS UPDATE

**Goal**: Update the graph builder and @context for Two-Tier Architecture.

#### Remediation Tasks (from completed v2.0 work)

**Day 1: @context Update**
- [ ] Update @context with v2.1 spec properties (Section 10)
- [ ] Add VerbPhrase, DirectiveContent, ScarcityAssertion classes
- [ ] Add `is_about`, `scarceResource`, `competingParties` properties
- [ ] Add actualityStatus Named Individuals to @context
- [ ] Add `has_component` / `extracted_from` for IBE linking
- [ ] Remove deprecated `denotesType` (keep for backwards compat warning)

**Day 2: IRI Generation Update**
- [ ] Increase hash length from 8 to 12 hex characters
- [ ] Add IRI generation patterns for Tier 2 entities
- [ ] Create deterministic IRI for Person, Artifact, Organization
- [ ] Update `generateIRI()` method signature

#### Acceptance Criteria

**AC-1.1.1: Updated @context**
```javascript
const context = parsed['@context'];

// Cross-tier relations
assert(context.is_about['@type'] === '@id', "is_about defined");
assert(context.has_component['@type'] === '@id', "has_component defined");
assert(context.extracted_from['@type'] === '@id', "extracted_from defined");

// Scarcity properties
assert(context.scarceResource['@type'] === '@id', "scarceResource defined");
assert(context.competingParties['@type'] === '@id', "competingParties defined");

// Actuality status
assert(context.actualityStatus['@type'] === '@id', "actualityStatus defined");
assert(context.Prescribed === 'tagteam:Prescribed', "Named Individual defined");
```

**AC-1.1.2: IRI Generation with 12-char Hash**
```javascript
const iri = builder.generateIRI("the doctor", "DiscourseReferent", 0);
// Format: inst:The_Doctor_Referent_a1b2c3d4e5f6 (12 chars)
assert(iri.match(/_[a-f0-9]{12}$/), "IRI ends with 12 hex chars");
```

#### Deliverables
- [ ] Updated `@context` in JSONLDSerializer
- [ ] Updated `generateIRI()` in SemanticGraphBuilder
- [ ] Unit test updates for new @context

---

### Phase 1.2: Two-Tier Entity Extraction (Days 3-4) ⚠️ MAJOR REWORK

**Goal**: Create BOTH Tier 1 DiscourseReferent AND Tier 2 real-world entities.

#### Tasks

**Day 3: RealWorldEntityFactory**
- [ ] Create `src/graph/RealWorldEntityFactory.js` (NEW)
- [ ] Create cco:Person instances from person referents
- [ ] Create cco:Artifact instances from object referents
- [ ] Create cco:Organization instances from organization referents
- [ ] Generate deterministic Tier 2 IRIs

**Day 4: Cross-Tier Linking**
- [ ] Update `EntityExtractor.js` to use `is_about` instead of `denotesType`
- [ ] Link DiscourseReferent → Tier 2 entity via `cco:is_about`
- [ ] Add `tagteam:temporal_extent` to all DiscourseReferents
- [ ] Add `tagteam:extracted_from` link to IBE placeholder

#### Acceptance Criteria

**AC-1.2.1: Tier 2 Entity Creation**
```javascript
// GIVEN
const text = "The doctor must allocate the last ventilator";

// WHEN
const graph = SemanticGraphBuilder.build(text);

// THEN: Both tiers exist
const referents = graph['@graph'].filter(n =>
  n['@type'].includes('tagteam:DiscourseReferent'));
const persons = graph['@graph'].filter(n =>
  n['@type'].includes('cco:Person'));
const artifacts = graph['@graph'].filter(n =>
  n['@type'].includes('cco:Artifact'));

assert(referents.length >= 2, "Tier 1: At least doctor + ventilator referents");
assert(persons.length >= 1, "Tier 2: At least 1 Person (doctor)");
assert(artifacts.length >= 1, "Tier 2: At least 1 Artifact (ventilator)");
```

**AC-1.2.2: Cross-Tier is_about Link**
```javascript
const doctorRef = referents.find(r => r['rdfs:label'].includes('doctor'));

// NEW: is_about links to Tier 2 entity instance
assert(doctorRef['cco:is_about'], "DiscourseReferent has is_about");
assert(doctorRef['cco:is_about'].includes('Person'), "Links to Person entity");

// Verify Tier 2 entity exists
const personIRI = doctorRef['cco:is_about'];
const person = graph['@graph'].find(n => n['@id'] === personIRI);
assert(person, "Tier 2 Person exists");
assert(person['@type'].includes('cco:Person'), "Typed as cco:Person");
```

**AC-1.2.3: denotesType Deprecated**
```javascript
// denotesType should NOT exist on new referents
assert(!doctorRef['tagteam:denotesType'],
  "denotesType deprecated - use is_about instead");
```

**AC-1.2.4: Temporal Extent on Tier 1**
```javascript
referents.forEach(r => {
  assert(r['tagteam:temporal_extent'],
    "All Tier 1 nodes have temporal_extent");
});
```

#### Deliverables
- [ ] `RealWorldEntityFactory.js` (~180 lines) (NEW)
- [ ] Updated `EntityExtractor.js` with is_about linking
- [ ] Unit test: `test-real-world-entities.js` (25 tests)
- [ ] Integration test: `verify-phase1-2-v3.js`

---

### Phase 1.3: Act Extraction with Tier 2 Linking (Days 4-5) ⚠️ MAJOR REWORK

**Goal**: Extract acts that link to Tier 2 Persons (not DiscourseReferents).

#### Tasks

**Day 4 Afternoon: Act-to-Tier2 Linking**
- [ ] Update `ActExtractor.js` to resolve agent/patient to Tier 2 entities
- [ ] `cco:has_agent` → cco:Person (NOT DiscourseReferent)
- [ ] `cco:affects` → cco:Artifact (NOT DiscourseReferent)
- [ ] `cco:has_participant` → cco:Person[]

**Day 5 Morning: ActualityStatus + VerbPhrase**
- [ ] Create `src/graph/ActualityStatusResolver.js` (NEW)
- [ ] Add `tagteam:actualityStatus` to all acts
- [ ] Create VerbPhrase ICE nodes linking to acts via `is_about`
- [ ] Map modality to actualityStatus (must → Prescribed)

#### Acceptance Criteria

**AC-1.3.1: Act Links to Tier 2 Person (CRITICAL)**
```javascript
// GIVEN
const text = "The doctor must allocate the ventilator";

// WHEN
const graph = SemanticGraphBuilder.build(text);
const acts = graph['@graph'].filter(n =>
  n['@type'].includes('cco:IntentionalAct'));

// THEN: Agent is Tier 2 Person (NOT DiscourseReferent)
const allocAct = acts[0];
assert(allocAct['cco:has_agent'], "Act has agent");
assert(!allocAct['cco:has_agent'].includes('Referent'),
  "Agent is NOT DiscourseReferent");
assert(allocAct['cco:has_agent'].includes('Person'),
  "Agent IS cco:Person");

// Verify agent is Tier 2 entity
const agentIRI = allocAct['cco:has_agent'];
const agent = graph['@graph'].find(n => n['@id'] === agentIRI);
assert(agent['@type'].includes('cco:Person'), "Agent typed as cco:Person");
```

**AC-1.3.2: actualityStatus Required**
```javascript
acts.forEach(act => {
  assert(act['tagteam:actualityStatus'], "Act has actualityStatus");
  const validStatuses = [
    'tagteam:Actual', 'tagteam:Prescribed', 'tagteam:Permitted',
    'tagteam:Prohibited', 'tagteam:Hypothetical', 'tagteam:Planned'
  ];
  assert(validStatuses.includes(act['tagteam:actualityStatus']),
    "actualityStatus is valid Named Individual");
});
```

**AC-1.3.3: VerbPhrase ICE Created**
```javascript
const verbPhrases = graph['@graph'].filter(n =>
  n['@type'].includes('tagteam:VerbPhrase'));
assert(verbPhrases.length >= 1, "VerbPhrase node created");

const vp = verbPhrases[0];
assert(vp['tagteam:verb'], "Has verb lemma");
assert(vp['cco:is_about'], "Links to Tier 2 act");
assert(vp['cco:is_about'] === allocAct['@id'], "VerbPhrase is_about the Act");
```

**AC-1.3.4: affects Links to Tier 2 Artifact**
```javascript
assert(allocAct['cco:affects'], "Act affects something");
const affectedIRI = allocAct['cco:affects'];
const affected = graph['@graph'].find(n => n['@id'] === affectedIRI);
assert(affected['@type'].includes('cco:Artifact'),
  "Affected is cco:Artifact (Tier 2)");
```

#### Deliverables
- [ ] Updated `ActExtractor.js` with Tier 2 linking
- [ ] `ActualityStatusResolver.js` (~80 lines) (NEW)
- [ ] VerbPhrase generation in ActExtractor
- [ ] Unit test: `test-act-tier2-linking.js` (30 tests)
- [ ] Integration test: `verify-phase1-3-v3.js`

---

### Phase 1.4: Role Detection with Tier 2 Bearers (Day 5 Afternoon) ⚠️ MAJOR REWORK

**Goal**: Roles inhere in Tier 2 Persons (not DiscourseReferents).

#### Tasks

**Day 5 Afternoon: Role-to-Tier2 Linking**
- [ ] Update `RoleDetector.js` to link `inheres_in` to Tier 2 entities
- [ ] Remove `is_bearer_of` assertion on bearers
- [ ] Validate bearer is cco:Person or cco:Organization (not DiscourseReferent)

#### Acceptance Criteria

**AC-1.4.1: Role Inheres in Tier 2 Person (CRITICAL)**
```javascript
// GIVEN
const text = "The doctor must allocate the ventilator";

// WHEN
const graph = SemanticGraphBuilder.build(text);
const roles = graph['@graph'].filter(n =>
  n['@type'].includes('bfo:BFO_0000023'));

// THEN: Bearer is Tier 2 Person (NOT DiscourseReferent)
roles.forEach(role => {
  assert(role['bfo:inheres_in'], "Role has bearer via inheres_in");

  const bearerIRI = role['bfo:inheres_in'];
  const bearer = graph['@graph'].find(n => n['@id'] === bearerIRI);

  // CRITICAL: Bearer must be Tier 2 entity
  assert(!bearer['@type'].includes('DiscourseReferent'),
    "Bearer is NOT DiscourseReferent");
  assert(
    bearer['@type'].includes('cco:Person') ||
    bearer['@type'].includes('cco:Organization'),
    "Bearer is cco:Person or cco:Organization (Tier 2)"
  );
});
```

**AC-1.4.2: No is_bearer_of Assertion (Inverse Removed)**
```javascript
// Verify no inverse assertion on bearer
const persons = graph['@graph'].filter(n =>
  n['@type'].includes('cco:Person'));

persons.forEach(person => {
  assert(!person['bfo:is_bearer_of'],
    "Person does NOT have is_bearer_of (only assert inheres_in on Role)");
});
```

**AC-1.4.3: Valid Bearer Types Only**
```javascript
roles.forEach(role => {
  const bearerIRI = role['bfo:inheres_in'];
  const bearer = graph['@graph'].find(n => n['@id'] === bearerIRI);

  const validBearerTypes = ['cco:Person', 'cco:Organization'];
  const hasValidType = validBearerTypes.some(t =>
    bearer['@type'].includes(t));

  assert(hasValidType,
    `Bearer must be Person or Organization, got: ${bearer['@type']}`);
});
```

#### Deliverables
- [ ] Updated `RoleDetector.js` with Tier 2 bearer linking
- [ ] Removed is_bearer_of assertions
- [ ] Unit test: `test-role-tier2-bearers.js` (20 tests)
- [ ] Integration test: `verify-phase1-4-v3.js`

---

### Phase 1.5: Deontic Content Extraction (Day 5 Afternoon) (NEW)

**Goal**: Extract DirectiveContent nodes for deontic modality.

#### Tasks

**Day 5 Afternoon (Extended)**
- [ ] Create `src/graph/DeonticContentExtractor.js` (NEW)
- [ ] Detect modal markers (must, should, may, etc.)
- [ ] Create DirectiveContent ICE nodes
- [ ] Link DirectiveContent → Act via `cco:prescribes`
- [ ] Link Act → DirectiveContent via `cco:prescribed_by` (bidirectional)

#### Acceptance Criteria

**AC-1.5.1: DirectiveContent Node Created**
```javascript
// GIVEN
const text = "The doctor must allocate the ventilator";

// WHEN
const graph = SemanticGraphBuilder.build(text);
const directives = graph['@graph'].filter(n =>
  n['@type'].includes('tagteam:DirectiveContent'));

// THEN
assert(directives.length >= 1, "DirectiveContent node created");
const directive = directives[0];
assert(directive['tagteam:modalType'] === 'obligation');
assert(directive['tagteam:modalMarker'] === 'must');
assert(directive['tagteam:modalStrength'] === 1.0);
```

**AC-1.5.2: Bidirectional prescribes/prescribed_by**
```javascript
const directive = directives[0];
const act = acts[0];

// Directive prescribes Act
assert(directive['cco:prescribes'] === act['@id'],
  "DirectiveContent prescribes the Act");

// Act prescribed_by Directive
assert(act['cco:prescribed_by'] === directive['@id'],
  "Act prescribed_by the DirectiveContent");
```

#### Deliverables
- [ ] `DeonticContentExtractor.js` (~120 lines) (NEW)
- [ ] Unit test: `test-deontic-content.js` (15 tests)

---

### Week 1 Milestone: Two-Tier JSON-LD Output

**Goal**: End-to-end test producing valid Two-Tier JSON-LD.

#### Milestone Test
```javascript
// GIVEN
const text = "The doctor must allocate the last ventilator between two critically ill patients";

// WHEN
const jsonld = TagTeam.parse(text, { format: 'jsonld' });
const parsed = JSON.parse(jsonld);

// THEN: Verify Two-Tier Structure

// Tier 1 nodes
const referents = parsed['@graph'].filter(n =>
  n['@type'].includes('DiscourseReferent'));
const verbPhrases = parsed['@graph'].filter(n =>
  n['@type'].includes('VerbPhrase'));
const directives = parsed['@graph'].filter(n =>
  n['@type'].includes('DirectiveContent'));

assert(referents.length >= 4, "4+ discourse referents");
assert(verbPhrases.length >= 1, "1+ verb phrase");
assert(directives.length >= 1, "1+ directive content");

// Tier 2 nodes
const persons = parsed['@graph'].filter(n =>
  n['@type'].includes('cco:Person'));
const artifacts = parsed['@graph'].filter(n =>
  n['@type'].includes('cco:Artifact'));
const acts = parsed['@graph'].filter(n =>
  n['@type'].includes('cco:IntentionalAct'));
const roles = parsed['@graph'].filter(n =>
  n['@type'].includes('bfo:BFO_0000023'));

assert(persons.length >= 3, "3+ persons (doctor + 2 patients)");
assert(artifacts.length >= 1, "1+ artifact (ventilator)");
assert(acts.length >= 1, "1+ act");
assert(roles.length >= 1, "1+ role");

// Cross-tier linking verification
referents.forEach(ref => {
  assert(ref['cco:is_about'], "Referent links to Tier 2 via is_about");
});

acts.forEach(act => {
  assert(act['cco:has_agent'], "Act has agent");
  const agentIRI = act['cco:has_agent'];
  const agent = parsed['@graph'].find(n => n['@id'] === agentIRI);
  assert(agent['@type'].includes('cco:Person'),
    "Act agent is cco:Person (Tier 2)");
  assert(act['tagteam:actualityStatus'], "Act has actualityStatus");
});

roles.forEach(role => {
  const bearerIRI = role['bfo:inheres_in'];
  const bearer = parsed['@graph'].find(n => n['@id'] === bearerIRI);
  assert(bearer['@type'].includes('cco:Person'),
    "Role bearer is cco:Person (Tier 2)");
});
```

#### Week 1 Acceptance Criteria (Updated)

| ID | Criterion | v2.0 | v3.0 (Two-Tier) |
|----|-----------|------|-----------------|
| AC-W1.1 | Valid JSON-LD output | Same | Same |
| AC-W1.2 | Entity typing | DiscourseReferent only | DiscourseReferent + cco:Person/Artifact |
| AC-W1.3 | Act agent | Link to DiscourseReferent | Link to cco:Person (Tier 2) |
| AC-W1.4 | Role bearer | Link to DiscourseReferent | Link to cco:Person (Tier 2) |
| AC-W1.5 | Cross-tier link | N/A (denotesType) | `is_about` to Tier 2 instance (v2.2: removed `denotes` alias) |
| AC-W1.6 | actualityStatus | N/A | Required on all acts |
| AC-W1.7 | VerbPhrase nodes | N/A | Required, links to act |
| AC-W1.8 | DirectiveContent | N/A | Required for deontic modality |
| AC-W1.9 | IRI hashing | 8 chars | 12 chars |

---

## Week 2: Detection Records + GIT-Minimal Integration (REVISED)

### Objective
Wrap all detections as ICE records (not Occurrent events) with GIT-Minimal provenance.

---

### Phase 2.1: Detection Record Builder (Days 6-7) ⚠️ RENAMED

**Goal**: Model value detections and context assessments as ICE records.

**Critical Change**: Classes renamed and retyped from Occurrent to ICE:
- `ValueAssertionEvent` → `ValueDetectionRecord`
- `ContextAssessmentEvent` → `ContextAssessmentRecord`

#### Tasks

**Day 6: Value Detection Records**
- [ ] Create `src/graph/DetectionRecordBuilder.js` (RENAMED from AssertionEventBuilder)
- [ ] Create `tagteam:ValueDetectionRecord` (ICE, not Occurrent)
- [ ] Create separate ICE nodes for each value
- [ ] Add three-way confidence decomposition

**Day 7: Context Assessment Records**
- [ ] Create `tagteam:ContextAssessmentRecord` (ICE, not Occurrent)
- [ ] Convert 12 dimensions → 12 separate records
- [ ] Add GIT-Minimal properties to all records

#### Acceptance Criteria

**AC-2.1.1: ValueDetectionRecord as ICE**
```javascript
const records = graph['@graph'].filter(n =>
  n['@type'].includes('tagteam:ValueDetectionRecord'));
assert(records.length >= 1, "ValueDetectionRecord exists");

// CRITICAL: Must be ICE, not Occurrent
const record = records[0];
assert(record['@type'].includes('cco:InformationContentEntity'),
  "ValueDetectionRecord is ICE subclass");
assert(!record['@type'].includes('Occurrent'),
  "ValueDetectionRecord is NOT Occurrent");
```

**AC-2.1.2: ContextAssessmentRecord as ICE**
```javascript
const assessments = graph['@graph'].filter(n =>
  n['@type'].includes('tagteam:ContextAssessmentRecord'));
assert(assessments.length >= 1, "ContextAssessmentRecord exists");

assessments.forEach(a => {
  assert(a['@type'].includes('cco:InformationContentEntity'),
    "ContextAssessmentRecord is ICE subclass");
});
```

#### Deliverables
- [ ] `DetectionRecordBuilder.js` (~200 lines) (RENAMED)
- [ ] Unit test: `test-detection-records.js` (25 tests)

---

### Phase 2.2: GIT-Minimal Integration (Days 8-9) ✅ MOSTLY ALIGNED

**Goal**: Add GIT-Minimal properties to all Tier 1 nodes.

#### Tasks

**Day 8: Assertion Type + Context**
- [ ] Add `tagteam:assertionType` to all Tier 1 nodes
- [ ] Add `tagteam:validInContext` to all Tier 1 nodes
- [ ] Add `tagteam:temporal_extent` to ALL Tier 1 nodes (expanded scope)

**Day 9: Interpretation Context**
- [ ] Create InterpretationContext nodes
- [ ] Support context specification via options

#### Acceptance Criteria

**AC-2.2.1: temporal_extent on ALL Tier 1 Nodes (Expanded Scope)**
```javascript
// CRITICAL: temporal_extent now required on ALL Tier 1 nodes
const tier1Types = [
  'DiscourseReferent', 'VerbPhrase', 'DirectiveContent',
  'ScarcityAssertion', 'ValueDetectionRecord', 'ContextAssessmentRecord'
];

tier1Types.forEach(type => {
  const nodes = graph['@graph'].filter(n =>
    n['@type'].some(t => t.includes(type)));

  nodes.forEach(node => {
    assert(node['tagteam:temporal_extent'],
      `${type} must have temporal_extent`);
  });
});
```

#### Deliverables
- [ ] Updated extractors with temporal_extent
- [ ] `ContextManager.js` (~80 lines)
- [ ] Unit test: `test-git-minimal.js` (20 tests)

---

### Phase 2.3: IBE Staircase (Day 10) ⚠️ UPDATED LINKING

**Goal**: Complete information architecture with bidirectional IBE linking.

**Critical Change**: Use `has_component`/`extracted_from` instead of `is_concretized_by`.

#### Tasks

**Day 10: IBE Node + Bidirectional Linking**
- [ ] Generate IBE node with `cco:has_text_value`
- [ ] Link IBE → ICE via `tagteam:has_component`
- [ ] Link ICE → IBE via `tagteam:extracted_from`
- [ ] Verify bidirectional navigation

#### Acceptance Criteria

**AC-2.3.1: IBE Node Exists**
```javascript
const ibeNodes = graph['@graph'].filter(n =>
  n['@type'].includes('cco:InformationBearingEntity'));
assert(ibeNodes.length === 1, "One IBE for input text");

const ibe = ibeNodes[0];
assert(ibe['cco:has_text_value'] === text, "IBE contains full input text");
```

**AC-2.3.2: has_component Linking (IBE → ICE)**
```javascript
// IBE has has_component pointing to all Tier 1 ICEs
assert(Array.isArray(ibe['tagteam:has_component']),
  "IBE has has_component array");

const referents = graph['@graph'].filter(n =>
  n['@type'].includes('DiscourseReferent'));

referents.forEach(ref => {
  assert(ibe['tagteam:has_component'].includes(ref['@id']),
    "IBE has_component includes all referents");
});
```

**AC-2.3.3: extracted_from Linking (ICE → IBE)**
```javascript
// All Tier 1 ICEs have extracted_from pointing to IBE
referents.forEach(ref => {
  assert(ref['tagteam:extracted_from'] === ibe['@id'],
    "Referent extracted_from IBE");
});

const verbPhrases = graph['@graph'].filter(n =>
  n['@type'].includes('VerbPhrase'));
verbPhrases.forEach(vp => {
  assert(vp['tagteam:extracted_from'] === ibe['@id'],
    "VerbPhrase extracted_from IBE");
});
```

#### Deliverables
- [ ] IBE generation in SemanticGraphBuilder
- [ ] Bidirectional linking logic
- [ ] Unit test: `test-ibe-staircase.js` (15 tests)

---

### Phase 2.4: ScarcityAssertion Builder (Day 10) (NEW)

**Goal**: Build scarcity assertions with new property structure.

#### Tasks

**Day 10 Afternoon**
- [ ] Create `src/graph/ScarcityAssertionBuilder.js` (NEW)
- [ ] Use `tagteam:scarceResource` instead of `is_about`
- [ ] Use `tagteam:competingParties` array
- [ ] Add `supplyCount`, `demandCount`, `scarcityRatio`

#### Acceptance Criteria

**AC-2.4.1: ScarcityAssertion Properties**
```javascript
// GIVEN
const text = "The doctor must allocate the last ventilator between two patients";

// WHEN
const graph = SemanticGraphBuilder.build(text);
const scarcityNodes = graph['@graph'].filter(n =>
  n['@type'].includes('tagteam:ScarcityAssertion'));

// THEN
assert(scarcityNodes.length >= 1, "ScarcityAssertion created");
const scarcity = scarcityNodes[0];

// NEW properties (not is_about)
assert(scarcity['tagteam:scarceResource'], "Has scarceResource");
assert(scarcity['tagteam:competingParties'], "Has competingParties");

// scarceResource links to Tier 2 Artifact
const resourceIRI = scarcity['tagteam:scarceResource'];
const resource = graph['@graph'].find(n => n['@id'] === resourceIRI);
assert(resource['@type'].includes('cco:Artifact'),
  "scarceResource is cco:Artifact");

// competingParties links to Tier 2 Persons
const partyIRIs = scarcity['tagteam:competingParties'];
assert(Array.isArray(partyIRIs), "competingParties is array");
partyIRIs.forEach(iri => {
  const party = graph['@graph'].find(n => n['@id'] === iri);
  assert(party['@type'].includes('cco:Person'),
    "competingParty is cco:Person");
});

// Numeric properties
assert(scarcity['tagteam:supplyCount'] === 1);
assert(scarcity['tagteam:demandCount'] === 2);
assert(scarcity['tagteam:scarcityRatio'] === 0.5);
```

#### Deliverables
- [ ] `ScarcityAssertionBuilder.js` (~100 lines) (NEW)
- [ ] Unit test: `test-scarcity-assertion.js` (15 tests)

---

### Week 2 Acceptance Criteria (Updated)

| ID | Criterion | v2.0 | v3.0 (Two-Tier) |
|----|-----------|------|-----------------|
| AC-W2.1 | Value detections | ValueAssertionEvent | ValueDetectionRecord (ICE) |
| AC-W2.2 | Context assessments | ContextAssessmentEvent | ContextAssessmentRecord (ICE) |
| AC-W2.3 | Assertion type | AutomatedDetection | Same |
| AC-W2.4 | Valid in context | Same | Same |
| AC-W2.5 | temporal_extent | On IBE only | On ALL Tier 1 nodes |
| AC-W2.6 | IBE linking | is_concretized_by | has_component + extracted_from |
| AC-W2.7 | ScarcityAssertion | is_about resource | scarceResource + competingParties |

---

## Week 3: SHACL Validation + Production Readiness (UPDATED)

### Objective
Validate graphs against Two-Tier Architecture SHACL patterns.

---

### Phase 3.1: SHACL Validator Integration (Days 11-12) ⚠️ UPDATED PATTERNS

**Goal**: Validate Two-Tier Architecture compliance.

#### Tasks

**Day 11: Two-Tier Validation Rules**
- [ ] Update Role Pattern: Bearer is Person/Org (NOT DiscourseReferent)
- [ ] Update Act Pattern: Agent is Person (NOT DiscourseReferent)
- [ ] Add actualityStatus validation
- [ ] Add ScarcityAssertion validation shape

**Day 12: Cross-Tier Link Validation**
- [ ] Validate is_about links from DiscourseReferent to Tier 2
- [ ] Validate VerbPhrase → Act linking
- [ ] Validate DirectiveContent ↔ Act bidirectional linking

#### Acceptance Criteria

**AC-3.1.1: Role Bearer Validation (Two-Tier)**
```javascript
// GIVEN: Role with DiscourseReferent bearer (INVALID)
const badGraph = {
  "@graph": [
    {
      "@id": "inst:AgentRole_0",
      "@type": ["bfo:BFO_0000023"],
      "bfo:inheres_in": "inst:Doctor_Referent"  // WRONG: should be Person
    },
    {
      "@id": "inst:Doctor_Referent",
      "@type": ["tagteam:DiscourseReferent"]
    }
  ]
};

// WHEN
const report = SHMLValidator.validate(badGraph);

// THEN
assert(report.violations.length >= 1, "Detects invalid bearer");
const violation = report.violations.find(v => v.pattern === 'RoleBearerShape');
assert(violation.message.includes('Person') ||
       violation.message.includes('Organization'),
  "Message indicates valid bearer types");
```

**AC-3.1.2: Act Agent Validation (Two-Tier)**
```javascript
// GIVEN: Act with DiscourseReferent agent (INVALID)
const badGraph = {
  "@graph": [
    {
      "@id": "inst:Act_Allocate",
      "@type": ["cco:IntentionalAct"],
      "cco:has_agent": "inst:Doctor_Referent"  // WRONG: should be Person
    }
  ]
};

// WHEN
const report = SHMLValidator.validate(badGraph);

// THEN
assert(report.violations.length >= 1, "Detects invalid agent");
```

**AC-3.1.3: ScarcityAssertion Validation**
```javascript
// From v2.1 spec Section 12.5
const goodScarcity = {
  "@graph": [{
    "@id": "inst:Scarcity_1",
    "@type": ["tagteam:ScarcityAssertion"],
    "tagteam:scarceResource": "inst:Ventilator",
    "tagteam:competingParties": ["inst:Patient_1", "inst:Patient_2"]
  }]
};

const report = SHMLValidator.validate(goodScarcity);
assert(report.violations.length === 0, "Valid scarcity passes");

// Invalid: missing scarceResource
const badScarcity = {
  "@graph": [{
    "@id": "inst:Scarcity_2",
    "@type": ["tagteam:ScarcityAssertion"],
    "tagteam:competingParties": ["inst:Patient_1"]
    // MISSING: scarceResource
  }]
};

const badReport = SHMLValidator.validate(badScarcity);
assert(badReport.violations.length >= 1, "Detects missing scarceResource");
```

#### Deliverables
- [ ] Updated `SHMLValidator.js` with Two-Tier rules
- [ ] New ScarcityAssertionShape
- [ ] Unit test: `test-shacl-two-tier.js` (30 tests)

---

### Phase 3.2: Complexity Budget (Day 13) ✅ ALIGNED

No significant changes from v2.0. The complexity budget is architecture-agnostic.

---

### Phase 3.3: Corpus Testing (Day 14) ⚠️ UPDATED CHECKS

**Goal**: Test all IEE scenarios with Two-Tier validation.

#### Updated Acceptance Criteria

**AC-3.3.1: Tier 2 Entity Count Validation**
```javascript
results.forEach((jsonld, idx) => {
  const graph = JSON.parse(jsonld);

  // Count Tier 2 entities
  const persons = graph['@graph'].filter(n =>
    n['@type'].includes('cco:Person'));
  const artifacts = graph['@graph'].filter(n =>
    n['@type'].includes('cco:Artifact'));
  const tier2Count = persons.length + artifacts.length;

  // Count Tier 1 referents
  const referents = graph['@graph'].filter(n =>
    n['@type'].includes('DiscourseReferent'));

  // Every referent should have corresponding Tier 2 entity
  // (some may be shared, so tier2Count <= referents.length)
  assert(tier2Count >= 1,
    `Scenario ${idx}: At least 1 Tier 2 entity`);
});
```

**AC-3.3.2: Cross-Tier Link Validation**
```javascript
results.forEach((jsonld, idx) => {
  const graph = JSON.parse(jsonld);

  const referents = graph['@graph'].filter(n =>
    n['@type'].includes('DiscourseReferent'));

  referents.forEach(ref => {
    assert(ref['cco:is_about'],
      `Scenario ${idx}: Referent ${ref['@id']} has is_about`);

    // Verify target exists
    const targetIRI = ref['cco:is_about'];
    const target = graph['@graph'].find(n => n['@id'] === targetIRI);
    assert(target,
      `Scenario ${idx}: is_about target exists`);
    assert(!target['@type'].includes('DiscourseReferent'),
      `Scenario ${idx}: is_about target is Tier 2 (not DiscourseReferent)`);
  });
});
```

---

### Phase 3.4: Documentation (Day 15)

Updated documentation deliverables for Two-Tier Architecture:

- [ ] `PHASE4_USER_GUIDE.md` - includes Two-Tier explanation
- [ ] `JSONLD_EXAMPLES.md` - shows both tiers
- [ ] `TWO_TIER_ARCHITECTURE_GUIDE.md` (NEW)
- [ ] `GIT_INTEGRATION.md`
- [ ] `SHACL_VALIDATION_GUIDE.md` - updated shapes

---

## Deliverables Summary (v3.0)

### Code Artifacts

| Module | Lines | Tests | Status | Change from v2.0 |
|--------|-------|-------|--------|------------------|
| `SemanticGraphBuilder.js` | 250 | 35 | Week 1 | Updated |
| `JSONLDSerializer.js` | 80 | 15 | Week 1 | Updated @context |
| `EntityExtractor.js` | 300 | 30 | Week 1 | is_about linking |
| `RealWorldEntityFactory.js` | 180 | 25 | Week 1 | **NEW** |
| `ActExtractor.js` | 380 | 35 | Week 1 | Tier 2 linking |
| `ActualityStatusResolver.js` | 80 | 15 | Week 1 | **NEW** |
| `RoleDetector.js` | 180 | 20 | Week 1 | Tier 2 bearers |
| `DeonticContentExtractor.js` | 120 | 15 | Week 1 | **NEW** |
| `DetectionRecordBuilder.js` | 200 | 25 | Week 2 | **RENAMED** |
| `ContextManager.js` | 80 | 15 | Week 2 | Same |
| `ScarcityAssertionBuilder.js` | 100 | 15 | Week 2 | **NEW** |
| `SHMLValidator.js` | 200 | 35 | Week 3 | Two-Tier rules |
| `ComplexityBudget.js` | 120 | 20 | Week 3 | Same |
| **TOTAL** | **2270 LOC** | **300 tests** | | +1100 LOC from v2.0 |

### New Modules (v3.0/v3.1)

| Module | Purpose |
|--------|---------|
| `RealWorldEntityFactory.js` | Create Tier 2 cco:Person, cco:Artifact from referents |
| `ActualityStatusResolver.js` | Determine act status (Prescribed, Actual, Negated, etc.) |
| `DeonticContentExtractor.js` | Extract DirectiveContent from modal verbs |
| `ScarcityAssertionBuilder.js` | Build scarcity assertions with new properties |
| `CoreferenceResolver.js` | (OPTIONAL) Resolve anaphoric references (v2.2) |

---

## Migration Path

### From v2.0 Implementation to v3.0

1. **Phase R1: EntityExtractor Fix** (Day 1)
   - Add Tier 2 entity creation
   - Change `denotesType` to `is_about`

2. **Phase R2: ActExtractor Fix** (Day 2)
   - Change agent/patient links to Tier 2
   - Add actualityStatus
   - Add VerbPhrase generation

3. **Phase R3: RoleDetector Fix** (Day 3)
   - Change bearer links to Tier 2
   - Remove is_bearer_of assertions

4. **Phase R4: New Modules** (Days 4-5)
   - RealWorldEntityFactory
   - ActualityStatusResolver
   - DeonticContentExtractor

5. **Phase R5: Week 2 Renames** (Days 6-7)
   - Rename AssertionEventBuilder → DetectionRecordBuilder
   - Retype as ICE instead of Occurrent

---

## Risk Mitigation (Updated)

### Risk 1: Breaking Changes Too Extensive
**Likelihood**: Medium
**Impact**: High
**Mitigation**:
- Create parallel v3 extractors, don't modify v2 in place
- Run both pipelines during transition
- Comprehensive test coverage before switching

### Risk 2: Tier 2 Entity Explosion
**Likelihood**: Medium
**Impact**: Medium
**Mitigation**:
- Deduplicate Tier 2 entities (same label → same IRI)
- Enforce Tier 2 entity budget (max 20)
- Merge similar entities (fuzzy matching)

### Risk 3: Cross-Tier Linking Complexity
**Likelihood**: High
**Impact**: High
**Mitigation**:
- Build entity index during extraction
- Resolve all Tier 1 → Tier 2 links in single pass
- Validate all links exist before serialization

---

## Approval

**Status**: Ready for Review
**Version**: 3.1
**Last Updated**: January 19, 2026
**Based On**: PHASE4_TWO_TIER_FINAL_SPEC_v2.2.md (Semantic Architect Review incorporated)

**Approval Section**

- [ ] **APPROVED** - Proceed with Phase 4 v3.0 implementation
- [ ] **APPROVED WITH MODIFICATIONS** - See notes: _______________
- [ ] **REVISE** - Requested changes: _______________

**Approved by**: ___________________________
**Date**: ___________________________
**Target Start Date**: ___________________________
