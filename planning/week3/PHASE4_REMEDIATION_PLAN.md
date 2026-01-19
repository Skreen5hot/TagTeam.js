# Phase 4 Remediation Plan: Aligning Week 1 Implementation with v2.1 Spec

**Version**: 1.0
**Date**: 2026-01-19
**Status**: READY FOR REVIEW
**Based on**: PHASE4_TWO_TIER_FINAL_SPEC_v2.1.md + PHASE4_IMPLEMENTATION_ROADMAP.md

---

## Executive Summary

This document identifies gaps between the completed Week 1 implementation and the revised v2.1 Two-Tier Architecture specification, then provides a prioritized remediation plan.

**Current State**: Week 1 complete (Phases 1.1-1.4), 116 tests passing
**Target State**: v2.1 spec compliance for Two-Tier Architecture

---

## 1. Critical Architecture Gap: Two-Tier Separation

### 1.1 The Problem

The v2.1 spec requires a **Two-Tier Architecture**:
- **Tier 1 (Parsing Layer)**: DiscourseReferent, VerbPhrase, DirectiveContent (ICE)
- **Tier 2 (Real-World Layer)**: cco:Person, cco:Artifact, cco:IntentionalAct (IC)

**Current Implementation**: Only creates Tier 1 nodes (DiscourseReferent) with a `denotesType` property pointing to what the entity type would be. Does NOT create actual Tier 2 cco:Person/cco:Artifact nodes.

### 1.2 Impact

| Spec Requirement | Current Status | Gap |
|-----------------|----------------|-----|
| Tier 1 DiscourseReferent | ✅ Implemented | None |
| Tier 2 cco:Person/cco:Artifact | ❌ Not implemented | **CRITICAL** |
| Cross-tier `is_about` link | ❌ Not implemented | **CRITICAL** |
| Roles inhere in Tier 2 Persons | ❌ Roles link to DiscourseReferent | **CRITICAL** |
| Acts have Tier 2 Person as agent | ❌ Acts link to DiscourseReferent | **CRITICAL** |

### 1.3 Remediation Tasks

| Task | Priority | Effort | Module |
|------|----------|--------|--------|
| R1.1: Create `RealWorldEntityFactory.js` | P0 | Medium | NEW |
| R1.2: Update SemanticGraphBuilder to create Tier 2 entities | P0 | Medium | SemanticGraphBuilder.js |
| R1.3: Add `cco:is_about` links from DiscourseReferent to Person/Artifact | P0 | Low | EntityExtractor.js |
| R1.4: Update RoleDetector to link roles to Tier 2 entities (not referents) | P0 | Medium | RoleDetector.js |
| R1.5: Update ActExtractor to link acts to Tier 2 entities (not referents) | P0 | Medium | ActExtractor.js |

---

## 2. Role Bearer Constraint Update

### 2.1 The Problem

The v2.1 spec specifies:
- Roles MUST inhere in `cco:Person` or `cco:Organization` (Tier 2)
- Roles MUST NOT inhere in `DiscourseReferent` (Tier 1)
- Only assert `bfo:inheres_in` on Role (not `bfo:is_bearer_of` on Person)

**Current Implementation**:
- Roles link to DiscourseReferent via `bfo:inheres_in` ❌
- Also asserts `bfo:is_bearer_of` on the bearer ❌

### 2.2 Remediation Tasks

| Task | Priority | Effort | Module |
|------|----------|--------|--------|
| R2.1: Change `bfo:inheres_in` target from Referent IRI to Person IRI | P0 | Low | RoleDetector.js |
| R2.2: Remove `bfo:is_bearer_of` assertion on bearers | P0 | Low | RoleDetector.js |
| R2.3: Add support for `cco:Organization` as role bearer | P1 | Low | RoleDetector.js |

---

## 3. Actuality Status for Acts

### 3.1 The Problem

The v2.1 spec requires:
- All acts MUST have `tagteam:actualityStatus` property
- Status is a Named Individual: `tagteam:Prescribed`, `tagteam:Actual`, etc.
- Deontic modality maps to actuality status

**Current Implementation**:
- Has `tagteam:modality` property (e.g., "obligation") ✅
- Does NOT have `tagteam:actualityStatus` ❌

### 3.2 Remediation Tasks

| Task | Priority | Effort | Module |
|------|----------|--------|--------|
| R3.1: Add `ActualityStatusResolver.js` module | P1 | Low | NEW |
| R3.2: Map modality → actuality status in ActExtractor | P1 | Low | ActExtractor.js |
| R3.3: Add actualityStatus to all IntentionalAct nodes | P1 | Low | ActExtractor.js |

### 3.3 Modality to Actuality Status Mapping

| Modality | Actuality Status |
|----------|------------------|
| obligation | `tagteam:Prescribed` |
| recommendation | `tagteam:Prescribed` |
| permission | `tagteam:Permitted` |
| prohibition | `tagteam:Prohibited` |
| intention | `tagteam:Planned` |
| (none) | `tagteam:Actual` |

---

## 4. VerbPhrase as Separate ICE Node

### 4.1 The Problem

The v2.1 spec shows VerbPhrase as a separate Tier 1 ICE node that links to the Tier 2 Act via `is_about`.

**Current Implementation**:
- Act nodes contain verb info inline (`tagteam:verb`, `tagteam:verb_text`)
- No separate VerbPhrase node exists

### 4.2 Remediation Tasks

| Task | Priority | Effort | Module |
|------|----------|--------|--------|
| R4.1: Create VerbPhrase nodes in ActExtractor | P1 | Medium | ActExtractor.js |
| R4.2: Add `is_about` link from VerbPhrase to Act | P1 | Low | ActExtractor.js |
| R4.3: Add `verb`, `lemma`, `tense`, `hasModalMarker` properties | P1 | Low | ActExtractor.js |

---

## 5. DirectiveContent for Deontic Modality

### 5.1 The Problem

The v2.1 spec requires deontic modality to be modeled as `tagteam:DirectiveContent` (subclass of `cco:DirectiveInformationContentEntity`).

**Current Implementation**:
- Modality is a simple string property on Act nodes
- No DirectiveContent nodes exist

### 5.2 Remediation Tasks

| Task | Priority | Effort | Module |
|------|----------|--------|--------|
| R5.1: Create `DeonticContentExtractor.js` module | P1 | Medium | NEW |
| R5.2: Generate DirectiveContent nodes for modal verbs | P1 | Medium | DeonticContentExtractor.js |
| R5.3: Add `cco:prescribes` / `cco:prescribed_by` links | P1 | Low | Both |

---

## 6. ScarcityAssertion Changes

### 6.1 The Problem

The v2.1 spec changes ScarcityAssertion:
- Replace `cco:is_about` with:
  - `tagteam:scarceResource` (single Artifact)
  - `tagteam:competingParties` (array of Persons)

**Current Implementation**:
- Scarcity is a property on DiscourseReferent (`tagteam:is_scarce`)
- No separate ScarcityAssertion node exists

### 6.2 Remediation Tasks

| Task | Priority | Effort | Module |
|------|----------|--------|--------|
| R6.1: Create `ScarcityAssertionBuilder.js` module | P2 | Medium | NEW |
| R6.2: Detect scarcity patterns and create ScarcityAssertion nodes | P2 | Medium | ScarcityAssertionBuilder.js |
| R6.3: Add `scarceResource` and `competingParties` properties | P2 | Low | ScarcityAssertionBuilder.js |

---

## 7. IBE (Information Bearing Entity) Grounding

### 7.1 The Problem

The v2.1 spec requires:
- Every parse MUST include an `InformationBearingEntity` node for the input text
- All Tier 1 nodes link to IBE via `has_component` (IBE→ICE) and `extracted_from` (ICE→IBE)

**Current Implementation**:
- No IBE node exists ❌
- No `has_component` or `extracted_from` links

### 7.2 Remediation Tasks

| Task | Priority | Effort | Module |
|------|----------|--------|--------|
| R7.1: Create IBE node in SemanticGraphBuilder | P1 | Low | SemanticGraphBuilder.js |
| R7.2: Add `has_component` array to IBE | P1 | Low | SemanticGraphBuilder.js |
| R7.3: Add `extracted_from` to all Tier 1 nodes | P1 | Low | All extractors |

---

## 8. GIT-Minimal Properties

### 8.1 The Problem

The v2.1 spec requires all Tier 1 nodes to have:
- `tagteam:assertionType` (default: `tagteam:AutomatedDetection`)
- `tagteam:validInContext` (IRI to InterpretationContext)
- `tagteam:temporal_extent` (xsd:dateTime)

**Current Implementation**:
- None of these properties exist on nodes

### 8.2 Remediation Tasks

| Task | Priority | Effort | Module |
|------|----------|--------|--------|
| R8.1: Add GIT-Minimal properties to all Tier 1 nodes | P1 | Low | SemanticGraphBuilder.js |
| R8.2: Create default InterpretationContext node | P1 | Low | ContextManager.js (NEW) |
| R8.3: Support `{ context: 'MedicalEthics' }` option | P1 | Medium | ContextManager.js |

---

## 9. @context Updates

### 9.1 The Problem

The v2.1 spec has specific @context requirements that differ from current implementation.

### 9.2 Required @context Additions

```javascript
// NEW: VerbPhrase properties
"verb": "tagteam:verb",
"lemma": "tagteam:lemma",
"tense": "tagteam:tense",
"hasModalMarker": "tagteam:hasModalMarker",

// NEW: Scarcity properties (changed from is_about)
"scarceResource": { "@id": "tagteam:scarceResource", "@type": "@id" },
"competingParties": { "@id": "tagteam:competingParties", "@type": "@id" },

// NEW: Type renames
"ValueDetectionRecord": "tagteam:ValueDetectionRecord",  // was ValueAssertionEvent
"ContextAssessmentRecord": "tagteam:ContextAssessmentRecord",  // was ContextAssessmentEvent

// NEW: Actuality Status Named Individuals
"ActualityStatus": "tagteam:ActualityStatus",
"Actual": "tagteam:Actual",
"Prescribed": "tagteam:Prescribed",
"Permitted": "tagteam:Permitted",
"Prohibited": "tagteam:Prohibited",
"Hypothetical": "tagteam:Hypothetical",
"Planned": "tagteam:Planned"
```

### 9.3 Remediation Tasks

| Task | Priority | Effort | Module |
|------|----------|--------|--------|
| R9.1: Update @context in JSONLDSerializer | P0 | Medium | JSONLDSerializer.js |

---

## 10. Test Updates Required

### 10.1 Tests Needing Updates

| Test File | Changes Needed |
|-----------|----------------|
| `test-entity-extraction.js` | Add tests for Tier 2 entity creation, `is_about` links |
| `test-act-extraction.js` | Add tests for `actualityStatus`, VerbPhrase nodes, links to Tier 2 |
| `test-role-detection.js` | Fix bearer links (Tier 2 not Tier 1), remove `is_bearer_of` assertions |
| `test-semantic-graph-builder.js` | Add IBE tests, GIT-Minimal properties, two-tier structure |

### 10.2 New Tests Required

| Test File | Purpose |
|-----------|---------|
| `test-two-tier-architecture.js` | Verify Tier 1/Tier 2 separation |
| `test-git-minimal.js` | Verify GIT-Minimal properties on all Tier 1 nodes |
| `test-actuality-status.js` | Verify actuality status on all acts |

---

## 11. Prioritized Implementation Order

### Phase R1: Critical Two-Tier Fix (P0) - Day 1

1. Create `RealWorldEntityFactory.js`
2. Update SemanticGraphBuilder to create Tier 2 entities
3. Add `is_about` links from DiscourseReferent to Person/Artifact
4. Update RoleDetector to link to Tier 2 entities
5. Update ActExtractor to link to Tier 2 entities
6. Update @context in JSONLDSerializer

### Phase R2: Spec Compliance (P1) - Day 2

1. Add actualityStatus to all acts
2. Create IBE node with has_component/extracted_from
3. Add VerbPhrase nodes
4. Add GIT-Minimal properties (assertionType, validInContext, temporal_extent)
5. Create ContextManager for InterpretationContext

### Phase R3: Full Feature Parity (P2) - Day 3

1. Create DirectiveContent nodes for deontic modality
2. Create ScarcityAssertion nodes
3. Create ActualityStatusResolver
4. Update all tests for v2.1 compliance

---

## 12. Estimated Effort

| Phase | New Code | Modified Code | Tests | Total |
|-------|----------|---------------|-------|-------|
| R1 (P0) | ~200 LOC | ~150 LOC | ~50 tests | ~400 LOC |
| R2 (P1) | ~150 LOC | ~100 LOC | ~40 tests | ~290 LOC |
| R3 (P2) | ~200 LOC | ~50 LOC | ~30 tests | ~280 LOC |
| **TOTAL** | **~550 LOC** | **~300 LOC** | **~120 tests** | **~970 LOC** |

---

## 13. Acceptance Criteria for Remediation

### AC-R1: Two-Tier Architecture Verified
```javascript
const graph = TagTeam.buildGraph("The doctor must allocate the ventilator");

// Tier 1: DiscourseReferent exists
const referents = graph['@graph'].filter(n =>
  n['@type'].includes('tagteam:DiscourseReferent'));
assert(referents.length >= 2, "Has discourse referents");

// Tier 2: Person and Artifact exist
const persons = graph['@graph'].filter(n =>
  n['@type'].includes('cco:Person'));
const artifacts = graph['@graph'].filter(n =>
  n['@type'].includes('cco:Artifact'));
assert(persons.length >= 1, "Has Tier 2 Person");
assert(artifacts.length >= 1, "Has Tier 2 Artifact");

// Cross-tier link: is_about
const doctorRef = referents.find(r => r['rdfs:label'].includes('doctor'));
assert(doctorRef['cco:is_about'], "Referent has is_about link");
const personIRI = doctorRef['cco:is_about'];
assert(persons.some(p => p['@id'] === personIRI), "is_about points to Person");
```

### AC-R2: Roles Inhere in Tier 2 Entities
```javascript
const roles = graph['@graph'].filter(n =>
  n['@type'].includes('bfo:BFO_0000023'));

roles.forEach(role => {
  const bearerIRI = role['bfo:inheres_in'];
  const bearer = graph['@graph'].find(n => n['@id'] === bearerIRI);

  // Bearer MUST be Tier 2 entity (Person/Organization), NOT DiscourseReferent
  assert(!bearer['@type'].includes('tagteam:DiscourseReferent'),
    "Role bearer is NOT DiscourseReferent");
  assert(bearer['@type'].includes('cco:Person') ||
         bearer['@type'].includes('cco:Organization'),
    "Role bearer IS Person or Organization");
});
```

### AC-R3: Acts Have Actuality Status
```javascript
const acts = graph['@graph'].filter(n =>
  n['@type'].some(t => t.includes('IntentionalAct')));

acts.forEach(act => {
  assert(act['tagteam:actualityStatus'], "Act has actualityStatus");
  assert(act['tagteam:actualityStatus'].startsWith('tagteam:'),
    "Actuality status is Named Individual");
});
```

### AC-R4: IBE Grounding Exists
```javascript
const ibe = graph['@graph'].find(n =>
  n['@type'].includes('cco:InformationBearingEntity'));

assert(ibe, "IBE node exists");
assert(ibe['cco:has_text_value'], "IBE has input text");
assert(ibe['tagteam:has_component'], "IBE has components");

// All Tier 1 nodes link back to IBE
const tier1Nodes = graph['@graph'].filter(n =>
  n['@type'].includes('tagteam:DiscourseReferent') ||
  n['@type'].includes('tagteam:VerbPhrase'));

tier1Nodes.forEach(node => {
  assert(node['tagteam:extracted_from'] === ibe['@id'],
    "Tier 1 node links to IBE via extracted_from");
});
```

### AC-R5: GIT-Minimal Properties Present
```javascript
const tier1Nodes = graph['@graph'].filter(n =>
  n['@type'].includes('tagteam:DiscourseReferent') ||
  n['@type'].includes('tagteam:VerbPhrase') ||
  n['@type'].includes('tagteam:DirectiveContent'));

tier1Nodes.forEach(node => {
  assert(node['tagteam:assertionType'], "Has assertionType");
  assert(node['tagteam:validInContext'], "Has validInContext");
  assert(node['tagteam:temporal_extent'], "Has temporal_extent");
});
```

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Test breakage during refactor | High | Medium | Update tests incrementally with code changes |
| Browser bundle size increase | Medium | Low | Monitor bundle size, optimize if needed |
| Performance regression | Low | Medium | Benchmark before/after, lazy entity creation |
| API breaking changes | High | High | Maintain backwards compatibility mode |

---

## 15. Backwards Compatibility

To minimize disruption, the remediation will:

1. **Keep existing properties**: Don't remove `tagteam:denotesType` - add `is_about` alongside
2. **Add mode flag**: `{ twoTier: true }` to opt-in to v2.1 output (default: true for new code)
3. **Deprecation warnings**: Log warnings for deprecated patterns
4. **Migration guide**: Document differences between v1 and v2.1 output

---

## 16. Approval

**Status**: READY FOR REVIEW

**Next Steps**:
1. [ ] Review and approve this remediation plan
2. [ ] Begin Phase R1 (Critical Two-Tier Fix)
3. [ ] Update tests in parallel with code changes
4. [ ] Verify all acceptance criteria pass

**Estimated Timeline**: 3 days for complete remediation

---

**Document History**:
- v1.0 (2026-01-19): Initial remediation plan created
