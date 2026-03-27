# Realist Deontic Modeling — Implementation Plan

**Date:** 2026-03-27
**Priority:** HIGH — Ontological correctness (eliminates ghost acts)
**Spec:** `docs/development/realist-deontic-modeling-v1.2.1.md`
**Status:** Plan ready for review
**Baseline:** `953026e` (entity fragmentation fix shipped)

---

## Summary

Replace ghost IntentionalAct nodes for modal sentences with BFO-compliant
DICE + PlanSpecification + RealizableEntity graph topology. The modal
*detection* layer (TreeActExtractor._detectModality(), MODAL_TABLE, negation,
contractions, multi-word modals) is preserved exactly. The *serialization*
layer in SemanticGraphBuilder changes: modal verbs emit VerbPhrase (Tier 1) +
DICE + PlanSpec + deontic entity (Tier 2) instead of IntentionalAct nodes.
Non-modal sentences are unaffected.

---

## Scope

### What Changes

| Component | Current | After RDM |
|-----------|---------|-----------|
| Modal act `@type` | `IntentionalAct` | `tagteam:DiscourseReferent`, `tagteam:VerbPhrase` (Tier 1 only) |
| DirectiveContent | `tagteam:DirectiveContent` → prescribes act | `DirectiveInformationContentEntity` → prescribes PlanSpec |
| PlanSpecification | Does not exist | New node: act type, agent, patient |
| RealizableEntity | Does not exist | New node: Obligation/Permission/Prohibition/Intention |
| Roles for modal acts | AgentRole/PatientRole `realized_in` ghost act | No Role nodes; agent/patient on PlanSpec directly |
| `tagteam:actualityStatus` | On IntentionalAct | Removed for modal acts; `tagteam:fulfillmentState` on RealizableEntity |
| `tagteam:modalType`/`modalStrength` | On DirectiveContent | Replaced by `tagteam:deonticCategory` (discrete enum) |
| ConjunctiveObligation | Does not exist | New node for coordinated verbs under one modal |

### What Does NOT Change

| Component | Status |
|-----------|--------|
| TreeActExtractor._detectModality() | Preserved exactly — detection layer |
| MODAL_TABLE + CONTRACTION_STEMS | Preserved exactly |
| Non-modal IntentionalAct + Role nodes | Unchanged — actual acts keep current topology |
| Entity extraction (TreeEntityExtractor) | Unchanged |
| CDD pre-pass (Fix 2) | Unchanged |
| Ontology matching (OntologyTextTagger) | Unchanged |
| Copular/existential/possessive assertions | Unchanged |
| parse() SemanticRoleExtractor path | Unchanged (returns action.modality as before) |

---

## Files to Modify

| File | Change | Effort |
|------|--------|--------|
| `src/graph/SemanticGraphBuilder.js` | Branch act assembly: modal → VerbPhrase + DICE + PlanSpec + RealizableEntity; non-modal → current path | Large |
| `src/graph/DirectiveExtractor.js` | Evolve extract() to return DICE + PlanSpec pairs; rename type; replace modalType/Strength with deonticCategory | Medium |
| `src/graph/TreeRoleMapper.js` | Branch: modal acts → skip Role nodes, return prescribedAgent/Patient for PlanSpec; non-modal → current path | Medium |
| `src/graph/JSONLDSerializer.js` | Add @context entries for new classes/properties; retire ActualityStatus ghost entries | Medium |
| `ontology/tagteam.ttl` | Add 7 classes, 6 individuals, 8 properties per spec §9 | Medium |
| Tests | New RDM test file; rewrite 31 modal CI tests; update bundle tests | Large |

### Files NOT Modified

- `src/graph/TreeActExtractor.js` — detection layer preserved
- `src/graph/TreeEntityExtractor.js` — entity extraction unchanged
- `src/graph/ComplexDesignatorDetector.js` — unchanged
- `src/core/SemanticRoleExtractor.js` — parse() path unchanged
- `src/ontology/OntologyTextTagger.js` — unchanged

---

## Deontic Category Mapping (Single Source of Truth)

From spec §4. Implement as `DEONTIC_CATEGORY_TABLE` constant.

| Modal | Deontic Category IRI | RealizableEntity Type | Emit RE? | Default Confidence |
|-------|---------------------|----------------------|----------|-------------------|
| `must` | `tagteam:UnconditionalObligation` | `Obligation` | Yes | 0.95 |
| `shall` | `tagteam:UnconditionalObligation` | `Obligation` | Yes | 0.95 |
| `should` | `tagteam:DefeasibleObligation` | `Obligation` | Yes | 0.85 |
| `ought to` | `tagteam:DefeasibleObligation` | `Obligation` | Yes | 0.85 |
| `have to` | `tagteam:UnconditionalObligation` | `Obligation` | Yes | 0.95 |
| `need to` | `tagteam:UnconditionalObligation` | `Obligation` | Yes | 0.95 |
| `will` | `tagteam:DeclaredIntention` | `Intention` | Yes | 0.75 |
| `may` | `tagteam:GrantedPermission` | `Permission` | Yes | 0.70 |
| `can` | `tagteam:GrantedPermission` | `Permission` | Yes | 0.70 |
| `must not` | `tagteam:UnconditionalProhibition` | `Prohibition` | Yes | 0.90 |
| `shall not` | `tagteam:UnconditionalProhibition` | `Prohibition` | Yes | 0.90 |
| `may not` | `tagteam:UnconditionalProhibition` | `Prohibition` | Yes | 0.90 |
| `cannot` | `tagteam:UnconditionalProhibition` | `Prohibition` | Yes | 0.85 |
| `can't` | `tagteam:UnconditionalProhibition` | `Prohibition` | Yes | 0.80 |
| `could` | `tagteam:Hypothetical` | — | No | 0.80 |
| `would` | `tagteam:Hypothetical` | — | No | 0.80 |
| `might` | `tagteam:Hypothetical` | — | No | 0.80 |

---

## Acceptance Criteria

### Phase 1: Modal Branch — VerbPhrase (Tier 1) + No Ghost Acts

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| RDM-01 | "The committee shall review the proposal." | VP node `@type` | `['tagteam:DiscourseReferent', 'tagteam:VerbPhrase']` (NOT `IntentionalAct`) |
| RDM-02 | "The committee shall review the proposal." | VP `tagteam:verb` | `review` |
| RDM-03 | "The committee shall review the proposal." | VP `tagteam:modalMarker` | `shall` |
| RDM-04 | "The committee shall review the proposal." | VP `tagteam:deonticCategory` | `tagteam:UnconditionalObligation` |
| RDM-05 | "The committee shall review the proposal." | VP `tagteam:interpretationConfidence` | `0.95` |
| RDM-06 | "The committee shall review the proposal." | No node with `@type` including `IntentionalAct` and verb "review" | Ghost act eliminated |
| RDM-07 | "The doctor treats the patient." (no modal) | IntentionalAct node exists with verb "treat" | Actual acts unchanged |

### Phase 2: DICE + PlanSpecification

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| RDM-08 | "The committee shall review the proposal." | DICE node `@type` includes `DirectiveInformationContentEntity` | exists |
| RDM-09 | "The committee shall review the proposal." | DICE `prescribes` → PlanSpec `@id` | link exists |
| RDM-10 | "The committee shall review the proposal." | DICE `tagteam:deonticCategory` | `tagteam:UnconditionalObligation` |
| RDM-11 | "The committee shall review the proposal." | DICE `tagteam:modalMarker` | `shall` |
| RDM-12 | "The committee shall review the proposal." | PlanSpec `@type` includes `PlanSpecification` | exists |
| RDM-13 | "The committee shall review the proposal." | PlanSpec `tagteam:prescribedActType` | `review` |
| RDM-14 | "The committee shall review the proposal." | PlanSpec `tagteam:prescribedAgent` → Committee Tier 2 `@id` | agent linked |
| RDM-15 | "The committee shall review the proposal." | PlanSpec `tagteam:prescribedPatient` → Proposal Tier 2 `@id` | patient linked |
| RDM-16 | "The committee shall review the proposal." | VP `is_about` → DICE `@id` | Tier 1→Tier 2 link |

### Phase 3: RealizableEntity

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| RDM-17 | "The committee shall review the proposal." | Obligation node exists with `@type` including `Obligation` | exists |
| RDM-18 | "The committee shall review the proposal." | Obligation `inheres_in` → Committee Tier 2 `@id` | bearer linked |
| RDM-19 | "The committee shall review the proposal." | Obligation `is_prescribed_by` → DICE `@id` | provenance linked |
| RDM-20 | "The committee shall review the proposal." | Obligation `isSpecifiedBy` → PlanSpec `@id` | content linked |
| RDM-21 | "The committee shall review the proposal." | Obligation `tagteam:deonticCategory` | `tagteam:UnconditionalObligation` |
| RDM-22 | "The committee shall review the proposal." | Obligation `tagteam:fulfillmentState` | `tagteam:Pending` |
| RDM-23 | "Officers shall not disclose records." | Prohibition node exists with `tagteam:deonticCategory` = `UnconditionalProhibition` | prohibition |
| RDM-24 | "The patient may refuse treatment." | Permission node exists with `tagteam:deonticCategory` = `GrantedPermission` | permission |
| RDM-25 | "The agency will provide data." | Intention node exists with `tagteam:deonticCategory` = `DeclaredIntention` | intention |
| RDM-26 | "The system could fail under load." | No RealizableEntity emitted | hypothetical = no RE |
| RDM-27 | "The system could fail under load." | DICE + PlanSpec exist (hypothetical still gets documentation) | nodes exist |

### Phase 4: ConjunctiveObligation

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| RDM-28 | "The committee shall review and approve the proposal." | Two Obligation nodes (review + approve) | two obligations |
| RDM-29 | "The committee shall review and approve the proposal." | ConjunctiveObligation node with `hasConjunct` → both Obligations | wrapper exists |
| RDM-30 | "The committee shall review and approve the proposal." | ConjunctiveObligation `tagteam:fulfillmentState` = `Pending` | pending |

### Phase 5: Role Branch for Modal Sentences

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| RDM-31 | "The committee shall review the proposal." | No AgentRole or PatientRole nodes in graph | no ghost roles |
| RDM-32 | "The committee shall review the proposal." | PlanSpec has `prescribedAgent` and `prescribedPatient` | roles on PlanSpec |
| RDM-33 | "The doctor treats the patient." (no modal) | AgentRole + PatientRole nodes exist with `realized_in` → Act | actual roles unchanged |
| RDM-34 | "The records shall be destroyed by the officer." (passive) | PlanSpec `prescribedAgent` → Officer (obl:by), `prescribedPatient` → Records (nsubj:pass) | passive agent resolution |

### Phase 6: ISA MOA Sentences

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| RDM-35 | "CMS shall allow USCIS to monitor..." | DICE + PlanSpec + Obligation emitted | full topology |
| RDM-36 | "The AE must submit such documentation electronically." | Obligation `inheres_in` → AE Tier 2 | bearer correct |
| RDM-37 | "CMS and AEs may not deny an application..." | Prohibition emitted, `deonticCategory` = `UnconditionalProhibition` | prohibition |
| RDM-38 | "Both Parties shall comply with the limitations..." | Obligation emitted | obligation |

### Phase 7: Non-Regression

| AC | Assert | Expected |
|----|--------|----------|
| RDM-39 | "The doctor treats the patient." → IntentionalAct + AgentRole + PatientRole | Actual acts completely unchanged |
| RDM-40 | "CBP is a component of DHS." → StructuralAssertion | Copular unchanged |
| RDM-41 | Entity boundary tests (18/18) | 0 regressions |
| RDM-42 | Tagger tests (141) + bundle tests (53) | 0 regressions (after bundle rebuild) |
| RDM-43 | Full CI suite (14 suites) | 0 regressions |

---

## TDD Implementation Sequence

### Phase 1: Modal Branch — VerbPhrase Tier 1 (Red → Green)

**Red:** Write tests RDM-01 through RDM-07. All fail (current output has IntentionalAct).

**Green:** In `_buildWithTreeExtractors()` act assembly loop:
```
if (act.modality) {
  // Realist path: VerbPhrase (Tier 1) — NOT IntentionalAct
  // @type = ['tagteam:DiscourseReferent', 'tagteam:VerbPhrase']
  // Properties: verb, modalMarker, deonticCategory, interpretationConfidence
  // Skip: no tagteam:actualityStatus, no IntentionalAct type
} else {
  // Current path: IntentionalAct
}
```

**Expected test delta:** RDM-01–07 pass. 31 existing modal CI tests break (expected — topology changed).

### Phase 2: DICE + PlanSpecification (Red → Green)

**Red:** Write tests RDM-08 through RDM-16.

**Green:** Evolve `DirectiveExtractor.extract()`:
- Input: modal detection results (act objects with modality info)
- Output: `{ dice, planSpec }` pairs
- DICE: `@type = ['DirectiveInformationContentEntity', 'InformationContentEntity', 'owl:NamedIndividual']`
- PlanSpec: `@type = ['PlanSpecification', 'InformationContentEntity', 'owl:NamedIndividual']`
- DICE `prescribes` → PlanSpec (not act)
- VerbPhrase `is_about` → DICE

### Phase 3: RealizableEntity (Red → Green)

**Red:** Write tests RDM-17 through RDM-27.

**Green:** After DICE + PlanSpec creation, emit RealizableEntity:
- Look up `DEONTIC_CATEGORY_TABLE` from act.modality
- If category emits RE: create Obligation/Permission/Prohibition/Intention node
- `inheres_in` → agent entity (from PlanSpec.prescribedAgent)
- `is_prescribed_by` → DICE
- `isSpecifiedBy` → PlanSpec
- `tagteam:deonticCategory` → category IRI
- `tagteam:fulfillmentState` → `tagteam:Pending`
- If Hypothetical: skip RE emission

### Phase 4: ConjunctiveObligation (Red → Green)

**Red:** Write tests RDM-28 through RDM-30.

**Green:** In act assembly, detect coordinated verbs under same modal (TreeActExtractor already extracts multiple acts from `conj` children sharing the same `aux:MD`). For each group of obligations from the same modal scope:
- Create individual Obligation per act
- Create ConjunctiveObligation wrapper with `hasConjunct` → each Obligation
- `fulfillmentState` → Pending

### Phase 5: Role Branch (Red → Green)

**Red:** Write tests RDM-31 through RDM-34.

**Green:** In TreeRoleMapper.map():
```
for each act:
  if act has modality:
    // Resolve agent/patient from dep tree but don't create Role nodes
    // Return { prescribedAgent, prescribedPatient, prescribedRecipient }
    // These get attached to PlanSpec in the assembly phase
  else:
    // Current path: create Role nodes with realized_in → act
```

Passive resolution (RDM-34): when `act.isPassive`, assign `obl` with `case: "by"` as prescribedAgent, `nsubj:pass` as prescribedPatient.

### Phase 6: ISA MOA + Test Rewrite (Red → Green)

**Red/Green:**
- Write RDM-35 through RDM-38
- Rewrite 31 CI modal tests to check DICE/PlanSpec/RE instead of IntentionalAct properties
- Update bundle tests for new node types

### Phase 7: Ontology + @context + CI (Green → Ship)

- Add 7 classes, 6 deontic category individuals, 3 fulfillment state individuals, 8 properties to `tagteam.ttl`
- Add @context entries in JSONLDSerializer for new terms
- Retire ghost-act @context entries (`ActualityStatus` individuals except `Actual`)
- Rebuild bundle, sync demos
- Run full CI + entity + tagger + bundle suites
- Run all HTML test runners

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| 31 modal CI tests break during Phases 1–3 | Expected — topology changing. Tests rewritten in Phase 6. Entity/tagger/bundle tests unaffected throughout. |
| DirectiveExtractor refactor breaks legacy path | Legacy path (`useLegacy: true`) is not touched — it uses ActExtractor which is separate. Only tree path changes. |
| PlanSpec agent/patient resolution fails for complex sentences | Uses same dep tree traversal as current TreeRoleMapper. If role detection works now, it works on PlanSpec. |
| ConjunctiveObligation edge cases (3+ verbs) | Handle same as 2: create individual Obligations + one wrapper. N-ary conjunction is just more hasConjunct links. |
| Backward compatibility for consumers reading `IntentionalAct` | Breaking change for modal sentences. Non-modal sentences unchanged. Document in release notes. |
| `tagteam:actualityStatus` removal | Only removed from modal acts. Non-modal acts retain `tagteam:Actual`. Property stays in @context and TTL. |

---

## Ontology Additions (§9 of spec)

### New Classes (7)

- `tagteam:DirectiveInformationContentEntity` (subClassOf `cco:InformationContentEntity`)
- `tagteam:PlanSpecification` (subClassOf `cco:InformationContentEntity`)
- `tagteam:Obligation` (subClassOf `bfo:RealizableEntity`)
- `tagteam:Permission` (subClassOf `bfo:RealizableEntity`)
- `tagteam:Prohibition` (subClassOf `bfo:RealizableEntity`)
- `tagteam:Intention` (subClassOf `bfo:RealizableEntity`)
- `tagteam:ConjunctiveObligation` (subClassOf `tagteam:Obligation`)
- `tagteam:DeonticCategory` (enumeration class)
- `tagteam:FulfillmentState` (enumeration class)

### New Individuals (9)

- 6 DeonticCategory: `UnconditionalObligation`, `DefeasibleObligation`, `DeclaredIntention`, `GrantedPermission`, `UnconditionalProhibition`, `Hypothetical`
- 3 FulfillmentState: `Pending`, `Discharged`, `Violated`

### New Properties (8)

- `tagteam:prescribedActType` (datatype, domain PlanSpec)
- `tagteam:prescribedActClass` (object, domain PlanSpec, range owl:Class)
- `tagteam:prescribedAgent` (object, domain PlanSpec)
- `tagteam:prescribedPatient` (object, domain PlanSpec)
- `tagteam:prescribedRecipient` (object, domain PlanSpec)
- `tagteam:isSpecifiedBy` (object, domain RealizableEntity, range PlanSpec)
- `tagteam:deonticCategory` (object, range DeonticCategory)
- `tagteam:fulfillmentState` (object, domain RealizableEntity, range FulfillmentState)
- `tagteam:interpretationConfidence` (datatype, range xsd:float)
- `tagteam:hasConjunct` (object, domain ConjunctiveObligation, range Obligation)

### Retired/Evolved

- `tagteam:DirectiveContent` → renamed to `DirectiveInformationContentEntity`
- `tagteam:modalType` / `tagteam:modalStrength` → replaced by `tagteam:deonticCategory`
- `tagteam:ActualityStatus` individuals (Prescribed, Permitted, etc.) → retained in TTL for backward compat but no longer emitted by tree pipeline for modal acts
