# Phase 4 Roadmap Alignment Review: v2.0 Roadmap vs v2.1 Two-Tier Spec

**Date**: 2026-01-19
**Purpose**: Comprehensive review of implementation roadmap against revised Two-Tier Architecture specification
**Documents Compared**:
- `PHASE4_IMPLEMENTATION_ROADMAP.md` (v2.0)
- `PHASE4_TWO_TIER_FINAL_SPEC_v2.1.md`

---

## Executive Summary

The v2.0 roadmap was written before the Two-Tier Architecture was finalized. It contains several fundamental assumptions that conflict with the v2.1 spec. This document identifies all conflicts and proposes a unified roadmap update.

**Recommendation**: Update the roadmap before proceeding with implementation to avoid rework.

---

## Week 1 Alignment Analysis

### Phase 1.1: Semantic Graph Builder ✅ COMPLETE - NEEDS UPDATES

| Roadmap Item | v2.1 Spec Requirement | Status | Gap |
|--------------|----------------------|--------|-----|
| JSON-LD @context | Updated @context with new properties | ⚠️ Partial | Missing VerbPhrase props, scarcity props, actuality status |
| IRI generation | SHA-256 with 12 hex chars | ✅ OK | Currently uses 8 chars (minor) |
| Namespace `inst:` | Same | ✅ OK | None |

**Required Updates**:
1. Update @context to v2.1 spec (Section 10)
2. Consider increasing IRI hash to 12 chars for collision resistance

---

### Phase 1.2: Entity Extraction ⚠️ COMPLETE - MAJOR REWORK NEEDED

| Roadmap Item | v2.1 Spec Requirement | Status | Gap |
|--------------|----------------------|--------|-----|
| Create DiscourseReferent (Tier 1) | Same | ✅ OK | None |
| Use `denotesType` property | Use `cco:is_about` to Tier 2 entity | ❌ WRONG | **CRITICAL**: Need Tier 2 entities |
| Entities are ICE only | Entities need Tier 2 IC counterparts | ❌ MISSING | Must create cco:Person, cco:Artifact |
| Scarcity on referent | ScarcityAssertion as separate ICE | ⚠️ Different | Need separate node with new props |

**Roadmap AC-1.2.1 Conflict**:
```javascript
// ROADMAP says:
assert(doctor['tagteam:denotesType'] === 'cco:Person');

// v2.1 SPEC requires:
assert(doctor['cco:is_about'] === 'inst:Person_Doctor'); // Link to Tier 2
const person = graph.find(n => n['@id'] === 'inst:Person_Doctor');
assert(person['@type'].includes('cco:Person')); // Tier 2 entity exists
```

**Required Updates**:
1. Add `RealWorldEntityFactory.js` to create Tier 2 entities
2. Change from `denotesType` to `is_about` linking to Tier 2
3. Keep `denotesType` for backwards compatibility (deprecate)
4. Create separate ScarcityAssertion nodes

---

### Phase 1.3: Act Extraction ⚠️ COMPLETE - MAJOR REWORK NEEDED

| Roadmap Item | v2.1 Spec Requirement | Status | Gap |
|--------------|----------------------|--------|-----|
| Acts link to DiscourseReferent | Acts link to Tier 2 Person | ❌ WRONG | **CRITICAL** |
| `cco:has_agent` → referent | `cco:has_agent` → cco:Person | ❌ WRONG | Must link to Tier 2 |
| `cco:affects` → referent | `cco:affects` → cco:Artifact | ❌ WRONG | Must link to Tier 2 |
| No VerbPhrase node | VerbPhrase as separate Tier 1 ICE | ❌ MISSING | Need VerbPhrase nodes |
| No actualityStatus | `tagteam:actualityStatus` required | ❌ MISSING | Must add |
| No DirectiveContent | DirectiveContent for modality | ❌ MISSING | Need separate ICE |

**Roadmap AC-1.3.2 Conflict**:
```javascript
// ROADMAP says:
assert(allocAct['cco:has_agent'].includes('Referent'), "Agent is discourse referent");

// v2.1 SPEC requires:
assert(allocAct['cco:has_agent'] === 'inst:Person_Doctor'); // Link to Tier 2 Person
assert(!allocAct['cco:has_agent'].includes('Referent')); // NOT a referent!
```

**Required Updates**:
1. Acts must link to Tier 2 entities (Person, Artifact)
2. Add VerbPhrase ICE nodes linking to acts via `is_about`
3. Add `actualityStatus` to all acts
4. Add DirectiveContent nodes for deontic modality
5. Add `cco:prescribed_by` on acts linking to DirectiveContent

---

### Phase 1.4: Role Detection ⚠️ COMPLETE - MAJOR REWORK NEEDED

| Roadmap Item | v2.1 Spec Requirement | Status | Gap |
|--------------|----------------------|--------|-----|
| Role `inheres_in` referent | Role `inheres_in` Tier 2 Person | ❌ WRONG | **CRITICAL** |
| Assert `is_bearer_of` on bearer | Only assert `inheres_in` on Role | ❌ WRONG | Remove inverse |
| Allow any bearer type | Only cco:Person or cco:Organization | ⚠️ Different | Need validation |

**Roadmap AC-1.4.2 Conflict**:
```javascript
// ROADMAP says:
const bearer = graph['@graph'].find(n => n['@id'] === role['bfo:inheres_in']);
assert(bearer['@type'].includes('DiscourseReferent'), "Bearer is discourse referent");

// v2.1 SPEC requires:
const bearer = graph['@graph'].find(n => n['@id'] === role['bfo:inheres_in']);
assert(bearer['@type'].includes('cco:Person') ||
       bearer['@type'].includes('cco:Organization'),
       "Bearer is Tier 2 entity, NOT DiscourseReferent");
```

**Required Updates**:
1. Change `inheres_in` target from Referent to Tier 2 Person/Org
2. Remove `is_bearer_of` assertion on bearers
3. Validate bearer is Person or Organization

---

## Week 2 Alignment Analysis

### Phase 2.1: Assertion Event Builder ⚠️ NOT STARTED - NEEDS RENAME

| Roadmap Item | v2.1 Spec Requirement | Status | Gap |
|--------------|----------------------|--------|-----|
| `ValueAssertionEvent` | `ValueDetectionRecord` (ICE) | ❌ WRONG NAME | Rename + retype |
| `ContextAssessmentEvent` | `ContextAssessmentRecord` (ICE) | ❌ WRONG NAME | Rename + retype |
| Typed as Occurrent | Typed as ICE | ❌ WRONG CATEGORY | Must be ICE |

**v2.1 Spec Change (Section 1.2)**:
> `ValueAssertionEvent` → `ValueDetectionRecord` (retyped as ICE)
> `ContextAssessmentEvent` → `ContextAssessmentRecord` (retyped as ICE)

**Required Updates**:
1. Rename classes to `ValueDetectionRecord` and `ContextAssessmentRecord`
2. Type as ICE (cco:InformationContentEntity), not Occurrent
3. Update @context accordingly

---

### Phase 2.2: GIT-Minimal Integration ✅ MOSTLY ALIGNED

| Roadmap Item | v2.1 Spec Requirement | Status | Gap |
|--------------|----------------------|--------|-----|
| `assertionType` property | Same | ✅ OK | None |
| `validInContext` property | Same | ✅ OK | None |
| InterpretationContext nodes | Same | ✅ OK | None |
| `temporal_extent` on IBE | `temporal_extent` on ALL Tier 1 nodes | ⚠️ Different | Expand scope |

**Required Updates**:
1. Add `temporal_extent` to ALL Tier 1 nodes (not just IBE)

---

### Phase 2.3: Information Staircase ⚠️ NOT STARTED - UPDATES NEEDED

| Roadmap Item | v2.1 Spec Requirement | Status | Gap |
|--------------|----------------------|--------|-----|
| IBE node exists | Same | ✅ OK | None |
| `has_text_value` property | Same | ✅ OK | None |
| `is_concretized_by` link | `has_component` / `extracted_from` bidirectional | ⚠️ Different | Use v2.1 relations |
| IBE typed as GDC | IBE typed as IC | ❌ WRONG | Fix BFO category |

**v2.1 Spec Section 7**:
- IBE links to components via `tagteam:has_component`
- Components link back via `tagteam:extracted_from`
- `is_concretized_by` is for ICE→IBE (different purpose)

**Required Updates**:
1. Use `has_component` / `extracted_from` for IBE↔ICE linking
2. Correct IBE BFO category (IC, not GDC)

---

## Week 3 Alignment Analysis

### Phase 3.1: SHACL Validator ⚠️ NOT STARTED - UPDATES NEEDED

| Roadmap Item | v2.1 Spec Requirement | Status | Gap |
|--------------|----------------------|--------|-----|
| Role Pattern: bearer exists | Bearer is Person/Org (not Referent) | ⚠️ Different | More specific |
| Information Staircase | Use `has_component`/`extracted_from` | ⚠️ Different | New relations |
| ScarcityAssertion validation | Validate `scarceResource` + `competingParties` | ❌ MISSING | New shape |

**New SHACL Shape Required (v2.1 Section 12.5)**:
```turtle
tagteam:ScarcityAssertionShape a sh:NodeShape ;
  sh:targetClass tagteam:ScarcityAssertion ;
  sh:property [
    sh:path tagteam:scarceResource ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:class cco:Artifact ;
  ] ;
  sh:property [
    sh:path tagteam:competingParties ;
    sh:minCount 1 ;
    sh:class cco:Person ;
  ] .
```

**Required Updates**:
1. Update Role Pattern SHACL to validate Tier 2 bearers
2. Add ScarcityAssertion SHACL shape
3. Update validation for `has_component`/`extracted_from`

---

### Phase 3.2: Complexity Budget ✅ ALIGNED

No significant changes needed. The complexity budget module is architecture-agnostic.

---

### Phase 3.3: IEE Corpus Testing ⚠️ UPDATES NEEDED

| Roadmap Item | v2.1 Spec Requirement | Status | Gap |
|--------------|----------------------|--------|-----|
| Validate DiscourseReferent count | Also validate Tier 2 entity count | ⚠️ Different | Add Tier 2 checks |
| Validate role bearers | Validate bearers are Tier 2 | ⚠️ Different | Update checks |

**Required Updates**:
1. Add Tier 2 entity count validation
2. Add cross-tier link validation
3. Update expected output structure for corpus tests

---

## Summary: All Conflicts Identified

### Critical Conflicts (Must Fix Before Proceeding)

| ID | Conflict | Roadmap | v2.1 Spec | Impact |
|----|----------|---------|-----------|--------|
| C1 | Entity linking | `denotesType` to CCO class | `is_about` to Tier 2 instance | Week 1 |
| C2 | Act agents | Link to DiscourseReferent | Link to cco:Person | Week 1 |
| C3 | Role bearers | Link to DiscourseReferent | Link to cco:Person | Week 1 |
| C4 | Tier 2 entities | Don't exist | Must create | Week 1 |
| C5 | is_bearer_of | Assert on bearer | Don't assert | Week 1 |
| C6 | ValueAssertionEvent | Occurrent type | ICE type (renamed) | Week 2 |
| C7 | IBE category | GDC | IC | Week 2 |

### Moderate Conflicts (Should Fix)

| ID | Conflict | Roadmap | v2.1 Spec | Impact |
|----|----------|---------|-----------|--------|
| M1 | VerbPhrase nodes | Not created | Required ICE | Week 1 |
| M2 | DirectiveContent | Not created | Required ICE | Week 1 |
| M3 | actualityStatus | Not present | Required on acts | Week 1 |
| M4 | ScarcityAssertion | Property on referent | Separate ICE node | Week 1 |
| M5 | IBE linking | is_concretized_by | has_component/extracted_from | Week 2 |
| M6 | temporal_extent | On IBE only | On ALL Tier 1 nodes | Week 2 |

### Minor Conflicts (Nice to Fix)

| ID | Conflict | Roadmap | v2.1 Spec | Impact |
|----|----------|---------|-----------|--------|
| N1 | IRI hash length | 8 chars | 12 chars | Week 1 |
| N2 | Organization bearer | Not mentioned | Allowed | Week 1 |

---

## Recommended Roadmap Updates

### Option A: Patch Existing Roadmap (Not Recommended)

Update individual sections in place. Risk: Inconsistent document, may miss dependencies.

### Option B: Create Roadmap v3.0 (Recommended)

Create a new version of the roadmap that:
1. Incorporates Two-Tier Architecture from the start
2. Restructures Week 1 deliverables for Tier 2 entity creation
3. Updates all acceptance criteria to match v2.1 spec
4. Renames Week 2 assertion types
5. Updates SHACL patterns for v2.1

### Proposed Roadmap v3.0 Structure

**Week 1 (Revised)**:
- Phase 1.1: Core Infrastructure (unchanged)
- Phase 1.2: Two-Tier Entity Extraction (NEW)
  - 1.2a: DiscourseReferent extraction (Tier 1)
  - 1.2b: RealWorldEntityFactory (Tier 2)
  - 1.2c: Cross-tier `is_about` linking
- Phase 1.3: Act Extraction with Tier 2 Linking (REVISED)
  - Acts link to Tier 2 Persons
  - Add VerbPhrase ICE nodes
  - Add actualityStatus
- Phase 1.4: Role Detection with Tier 2 Bearers (REVISED)
  - Roles inhere in Tier 2 Persons
  - Remove is_bearer_of assertion
- Phase 1.5: Deontic Content (NEW)
  - DirectiveContent ICE nodes
  - prescribes/prescribed_by links

**Week 2 (Revised)**:
- Phase 2.1: Detection Records (RENAMED from Assertion Events)
  - ValueDetectionRecord (ICE)
  - ContextAssessmentRecord (ICE)
- Phase 2.2: GIT-Minimal (mostly unchanged)
  - Add temporal_extent to ALL Tier 1 nodes
- Phase 2.3: IBE Staircase (REVISED)
  - has_component / extracted_from bidirectional
  - Correct IBE category (IC)
- Phase 2.4: ScarcityAssertion (NEW)
  - scarceResource / competingParties properties

**Week 3 (Revised)**:
- Phase 3.1: SHACL Validator (UPDATED)
  - Two-tier validation rules
  - ScarcityAssertion shape
- Phase 3.2: Complexity Budget (unchanged)
- Phase 3.3: Corpus Testing (UPDATED)
  - Tier 2 entity validation
- Phase 3.4: Documentation (unchanged)

---

## Decision Required

**Question**: Should we:

1. **Create Roadmap v3.0** - Full rewrite aligned with v2.1 spec
2. **Patch Roadmap v2.0** - Update specific sections only
3. **Proceed with Remediation** - Fix code first, update roadmap later

**Recommendation**: Option 1 (Create Roadmap v3.0)

Rationale:
- The Two-Tier Architecture is a fundamental change
- Patching creates an inconsistent document
- A clean roadmap helps track progress accurately
- Week 2 hasn't started, so no wasted effort documenting already-done work

---

## Next Steps

1. [ ] Decide on roadmap update approach
2. [ ] Create PHASE4_IMPLEMENTATION_ROADMAP_v3.md (if Option 1)
3. [ ] Begin implementation of Phase R1 (Two-Tier fix)
4. [ ] Update tests in parallel

---

**Document Status**: READY FOR DECISION
**Author**: Claude
**Date**: 2026-01-19
