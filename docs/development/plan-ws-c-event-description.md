# WS-C: EventDescription Class — Implementation Plan

**Date:** 2026-03-29
**Priority:** P1 — prerequisite for WS-B (narrative negation) and WS-E (deontic-narrative bridge)
**Spec:** `docs/sma-linguistic-sensory-layer-v1.2-final.md` §4.1–4.3
**Status:** Plan ready for review
**Baseline:** `20b03e8` (SMA stative ontology shipped)

---

## Summary

Affirmative narrative sentences ("The parent fed the child") currently emit a bare
IntentionalAct. WS-C adds an EventDescription ICE layer between the VerbPhrase
(Tier 1) and the IntentionalAct (Tier 2 process), parallel to how RDM adds
DICE + PlanSpec between VerbPhrase and RealizableEntity.

The EventDescription carries the structural content (actType, agent, patient,
realizationStatus) while the IntentionalAct is the actual BFO Process. This
separation enables WS-B (negated narratives emit EventDescription with
Unrealized status and NO IntentionalAct) and WS-E (structural matching between
PlanSpec and EventDescription for violation detection).

---

## Architecture: ActSpecification Superclass

Per spec §4.2, both PlanSpecification and EventDescription share a common
superclass `ActSpecification`:

```
ActSpecification (ICE)
├── PlanSpecification — prescribes an act that SHOULD occur (RDM)
└── EventDescription — describes an act that DID occur (WS-C)
```

Shared properties: `actType`, `agent`, `patient`
PlanSpec-only: `prescribedActType`, `prescribedAgent`, `prescribedPatient`
EventDesc-only: `realizationStatus`, `tenseAspect`

**Design decision:** EventDescription uses `tagteam:actType`, `tagteam:agent`,
`tagteam:patient` (not `prescribedActType` etc.) because these are descriptive,
not prescriptive. The shared structure enables the deontic-narrative matching
in WS-E.

---

## What Changes

| Component | Current | After WS-C |
|-----------|---------|-----------|
| Non-modal act `@type` | `['IntentionalAct', 'tagteam:VerbPhrase']` | VerbPhrase (Tier 1) + EventDescription + IntentionalAct (Tier 2) |
| Tier 1 for narrative acts | Combined with IntentionalAct | Separate VerbPhrase (DiscourseReferent) with `is_about` → EventDescription |
| EventDescription | Does not exist | New ICE: actType, agent, patient, realizationStatus |
| IntentionalAct | Carries verb, status, roles | Actual BFO Process linked via `describedBy` ← EventDescription |
| Roles | `realized_in` → IntentionalAct | Unchanged — roles still realize in the actual process |
| ActSpecification | Does not exist | New superclass for PlanSpec + EventDesc |

### What Does NOT Change

- Modal sentences (RDM path) — DICE + PlanSpec + RealizableEntity unchanged
- Stative sentences — QualityAssertion + bfo:Quality unchanged
- Copular/existential/possessive assertions — unchanged
- Entity extraction, CDD, ontology matching — unchanged

---

## Files to Modify

| File | Change | Effort |
|------|--------|--------|
| `src/graph/SemanticGraphBuilder.js` | Refactor non-modal act assembly: emit VerbPhrase + EventDescription + IntentionalAct | Medium |
| `src/graph/JSONLDSerializer.js` | Add @context entries for new types/properties | Small |
| `ontology/tagteam.ttl` | Add ActSpecification, EventDescription, RealizationStatus classes + individuals | Small |
| Tests | New WS-C test file | Medium |

---

## Acceptance Criteria

### Core EventDescription

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-EVT-01 | "The parent fed the child." | EventDescription node exists with `realizationStatus: Realized` | exists |
| AC-EVT-02 | "The parent fed the child." | EventDescription has `actType: "feed"` | verb lemma |
| AC-EVT-03 | "The parent fed the child." | EventDescription has `agent` → parent Tier 2 entity | agent linked |
| AC-EVT-04 | "The parent fed the child." | EventDescription has `patient` → child Tier 2 entity | patient linked |
| AC-EVT-05 | "The parent fed the child." | IntentionalAct still exists (actual process) | process preserved |
| AC-EVT-06 | "The parent fed the child." | IntentionalAct has `describedBy` → EventDescription | link exists |
| AC-EVT-07 | "The parent fed the child." | VerbPhrase (Tier 1) has `is_about` → EventDescription | Tier 1→2 link |

### Tier 1 VerbPhrase for Narratives

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-EVT-08 | "The parent fed the child." | VerbPhrase `@type` = `['tagteam:DiscourseReferent', 'tagteam:VerbPhrase']` | correct types |
| AC-EVT-09 | "The parent fed the child." | VerbPhrase `tagteam:verb` = "feed" | verb lemma |
| AC-EVT-10 | "The parent fed the child." | VerbPhrase NOT typed as IntentionalAct | Tier separation |

### Roles Unchanged

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-EVT-11 | "The parent fed the child." | AgentRole `realized_in` → IntentionalAct (the process, not EventDescription) | roles realize in process |
| AC-EVT-12 | "The parent fed the child." | PatientRole `realized_in` → IntentionalAct | patient role preserved |

### RealizationStatus

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-EVT-13 | "The doctor treats the patient." (present tense) | EventDescription with `realizationStatus: Realized` | present = realized |
| AC-EVT-14 | "The parent fed the child." (past tense) | EventDescription with `realizationStatus: Realized` | past = realized |

### Edge Cases

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-EVT-21 | "The report was written by the analyst." | EventDescription `agent` → analyst, `patient` → report | passive voice |
| AC-EVT-22 | "John and Mary reviewed the document." | EventDescription with agent(s) linked | coordination |

### Non-Regression

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-EVT-15 | "The committee shall review the proposal." | RDM path: DICE + PlanSpec + Obligation (no EventDescription) | modal unchanged |
| AC-EVT-16 | "The child is hungry." | Stative: QualityAssertion (no EventDescription) | stative unchanged |
| AC-EVT-17 | "CBP is a component of DHS." | Copular: StructuralAssertion (no EventDescription) | copular unchanged |
| AC-EVT-18 | Stative tests (23/23) | 0 regressions | |
| AC-EVT-19 | RDM tests (40/40) | 0 regressions | |
| AC-EVT-20 | Full CI (14 suites) | 0 regressions | |

---

## TDD Implementation Sequence

### Cycle 1: EventDescription + VerbPhrase Tier 1 separation (Red → Green)

**Red:** Write tests AC-EVT-01 through AC-EVT-10. All fail (current output has combined IntentionalAct).

**Green:** In `_buildWithTreeExtractors()` non-modal act assembly (the `else` branch):

1. Create VerbPhrase (Tier 1): `@type = ['tagteam:DiscourseReferent', 'tagteam:VerbPhrase']` with `tagteam:verb`, `is_about` → EventDescription
2. Create EventDescription (Tier 2): `@type = ['EventDescription', 'owl:NamedIndividual']` with `actType`, `realizationStatus: Realized`
3. Keep IntentionalAct but link via `describedBy` → EventDescription
4. Resolve EventDescription `agent`/`patient` to Tier 2 entities (same deferred pattern as PlanSpec)

### Cycle 2: Roles + ActSpecification (Red → Green)

**Red:** Write tests AC-EVT-11 through AC-EVT-14.

**Green:**
1. Roles continue to `realized_in` → IntentionalAct (the actual process)
2. Add ActSpecification superclass to TTL
3. Update PlanSpecification in TTL to subClassOf ActSpecification

### Cycle 3: Ontology + @context + non-regression

1. Add ActSpecification, EventDescription, RealizationStatus to TTL
2. Add Realized, Unrealized individuals
3. Add @context entries: EventDescription, ActSpecification, RealizationStatus, Realized, Unrealized, actType, agent, patient, realizationStatus, describedBy
4. Rebuild bundle, run full CI (AC-EVT-15 through AC-EVT-20)

---

## Ontology Additions

### New Classes
- `tagteam:ActSpecification` (subClassOf `cco:InformationContentEntity`) — abstract superclass
- `tagteam:EventDescription` (subClassOf `tagteam:ActSpecification`)
- `tagteam:RealizationStatus` (enumeration class)

### Update Existing
- `tagteam:PlanSpecification` — add `rdfs:subClassOf tagteam:ActSpecification`

### New Individuals
- `tagteam:Realized` (RealizationStatus)
- `tagteam:Unrealized` (RealizationStatus) — emitted by WS-B, declared now

### New Properties
- `tagteam:actType` (datatype, domain ActSpecification, range xsd:string)
- `tagteam:agent` (object, domain ActSpecification)
- `tagteam:patient` (object, domain ActSpecification)
- `tagteam:realizationStatus` (object, domain EventDescription, range RealizationStatus)
- `tagteam:describedBy` (object, domain bfo:Process, range EventDescription)

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Splitting IntentionalAct into VerbPhrase + EventDescription + Process breaks existing tests | RDM tests don't touch non-modal acts. Stative tests don't touch eventive acts. Corpus regression tests check modal and stative, not narrative topology. The main risk is the 14 CI suites — run AC-EVT-20 early. |
| Roles point to wrong node after split | Roles `realized_in` must point to IntentionalAct (the process), not EventDescription (the ICE). The process `@id` keeps the same pattern `inst:Act_*`. |
| EventDescription agent/patient resolution timing | Same deferred pattern as PlanSpec — store `_agentText`/`_patientText`, resolve after Tier 2 creation. Already proven in RDM. |
| PlanSpec subClassOf change breaks existing | Adding `ActSpecification` as superclass is additive — PlanSpec retains all existing properties and `subClassOf ICE`. No breaking change. |

---

## Out of Scope (WS-B)

- Negated narratives ("did not feed") → EventDescription with `Unrealized` — separate workstream
- This plan always emits `Realized` for affirmative sentences
- The `Unrealized` individual is declared in the ontology now for WS-B to use later
