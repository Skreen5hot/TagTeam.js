# RDM Ontology TTL + @context Update Plan

**Date:** 2026-03-27
**Priority:** HIGH — OWL validators will flag undeclared terms
**Effort:** Small (1 session)
**Baseline:** `a68e9d3` (WS-2 shipped)

---

## Problem

The RDM implementation (`8059ee0`) emits 9 new OWL classes, 9 named individuals, and 11 properties in the graph output. The JSONLDSerializer @context correctly maps these terms to `tagteam:` IRIs. But `ontology/tagteam.ttl` has **zero** of these declarations. Any downstream consumer running OWL validation, SHACL, or loading the ontology into Protege will flag every RDM term as undeclared.

Additionally, the legacy `prescribes` property in the TTL has `rdfs:domain :DirectiveContent` — the old pre-RDM class. It needs updating to `DirectiveInformationContentEntity`.

---

## Gap Summary

| Category | Spec Requires | In TTL | In @context | Action |
|----------|--------------|--------|-------------|--------|
| Classes | 9 | 0 | 7 (missing `DeonticCategory`, `FulfillmentState`) | Add all 9 to TTL + 2 to @context |
| DeonticCategory individuals | 6 | 0 | 5 | Add all 6 to TTL, add `Hypothetical` dual-typing |
| FulfillmentState individuals | 3 | 0 | 3 | Add all 3 to TTL |
| Properties | 15 | 2 (wrong domain) | 11 (missing 4) | Add 13 new + fix 2 existing domains + add 4 to @context |

---

## Files to Modify

| File | Change | Effort |
|------|--------|--------|
| `ontology/tagteam.ttl` | Add §9 block: 9 classes, 9 individuals, 13 new properties, fix 2 existing | Medium |
| `src/graph/JSONLDSerializer.js` | Add `DeonticCategory`, `FulfillmentState` classes + 4 missing properties to @context | Small |
| `tests/unit/v2/tagteam-ttl.test.js` | Add assertions for new RDM terms | Small |

---

## Acceptance Criteria

### TTL Declarations

| AC | Assert | Expected |
|----|--------|----------|
| AC-TTL-01 | `tagteam:DirectiveInformationContentEntity` declared as `owl:Class`, `rdfs:subClassOf cco:InformationContentEntity` | Class exists |
| AC-TTL-02 | `tagteam:PlanSpecification` declared as `owl:Class`, `rdfs:subClassOf cco:InformationContentEntity` | Class exists |
| AC-TTL-03 | `tagteam:Obligation` declared as `owl:Class`, `rdfs:subClassOf bfo:RealizableEntity` | Class exists |
| AC-TTL-04 | `tagteam:Permission` declared as `owl:Class`, `rdfs:subClassOf bfo:RealizableEntity` | Class exists |
| AC-TTL-05 | `tagteam:Prohibition` declared as `owl:Class`, `rdfs:subClassOf bfo:RealizableEntity` | Class exists |
| AC-TTL-06 | `tagteam:Intention` declared as `owl:Class`, `rdfs:subClassOf bfo:RealizableEntity` | Class exists |
| AC-TTL-07 | `tagteam:ConjunctiveObligation` declared as `owl:Class`, `rdfs:subClassOf tagteam:Obligation` | Class exists |
| AC-TTL-08 | `tagteam:DeonticCategory` declared as `owl:Class` | Class exists |
| AC-TTL-09 | `tagteam:FulfillmentState` declared as `owl:Class` | Class exists |
| AC-TTL-10 | 6 DeonticCategory individuals declared with `rdf:type tagteam:DeonticCategory` | Individuals exist |
| AC-TTL-11 | 3 FulfillmentState individuals declared with `rdf:type tagteam:FulfillmentState` | Individuals exist |
| AC-TTL-12 | `tagteam:prescribes` domain updated to `:DirectiveInformationContentEntity`, range to `:PlanSpecification` | Domain/range correct |
| AC-TTL-13 | `tagteam:isSpecifiedBy` declared with domain `bfo:RealizableEntity`, range `:PlanSpecification` | Property exists |
| AC-TTL-14 | `tagteam:prescribedActType` declared as `owl:DatatypeProperty`, range `xsd:string` | Property exists |
| AC-TTL-15 | `tagteam:prescribedAgent` declared as `owl:ObjectProperty`, domain `:PlanSpecification`, range `bfo:IndependentContinuant` | Property exists |
| AC-TTL-16 | `tagteam:prescribedPatient` declared as `owl:ObjectProperty`, domain `:PlanSpecification`, range `bfo:Entity` | Property exists |
| AC-TTL-17 | `tagteam:deonticCategory` declared as `owl:ObjectProperty`, range `:DeonticCategory` | Property exists |
| AC-TTL-18 | `tagteam:fulfillmentState` declared as `owl:ObjectProperty`, domain `bfo:RealizableEntity`, range `:FulfillmentState` | Property exists |
| AC-TTL-19 | `tagteam:hasConjunct` declared as `owl:ObjectProperty`, domain `:ConjunctiveObligation`, range `:Obligation` | Property exists |
| AC-TTL-20 | `tagteam:interpretationConfidence` declared as `owl:DatatypeProperty`, range `xsd:float` | Property exists |

### @context Completeness

| AC | Assert | Expected |
|----|--------|----------|
| AC-CTX-01 | `DeonticCategory` in @context | Mapped to `tagteam:DeonticCategory` |
| AC-CTX-02 | `FulfillmentState` in @context | Mapped to `tagteam:FulfillmentState` |
| AC-CTX-03 | `disambiguationNote` in @context | Mapped to `tagteam:disambiguationNote` |
| AC-CTX-04 | `realizedAt` in @context as `xsd:dateTime` | Mapped correctly |
| AC-CTX-05 | `violatedAt` in @context as `xsd:dateTime` | Mapped correctly |
| AC-CTX-06 | `violationEvidence` in @context | Mapped correctly |

### Non-Regression

| AC | Assert | Expected |
|----|--------|----------|
| AC-NR-01 | TTL test suite passes | All existing + new assertions |
| AC-NR-02 | RDM tests (40/40) | 0 regressions |
| AC-NR-03 | Full CI (14 suites) | 0 regressions |
| AC-NR-04 | Bundle rebuild succeeds | tagteam.js generated |

### Legacy Cleanup

| AC | Assert | Expected |
|----|--------|----------|
| AC-LC-01 | Old `tagteam:DirectiveContent` retained in TTL (backward compat) with deprecation note | Not deleted, noted as superseded |
| AC-LC-02 | Old `tagteam:ActualityStatus` individuals retained | Not deleted — non-modal acts still use `tagteam:Actual` |
| AC-LC-03 | `tagteam:Hypothetical` dual-typed: both `ActualityStatus` and `DeonticCategory` | Both types present |

---

## Implementation Sequence

### Step 1: Add RDM §9 block to tagteam.ttl

Add after the existing declarations (before `# END OF ONTOLOGY`):
- 9 class declarations with rdfs:label, skos:definition, rdfs:subClassOf
- 6 DeonticCategory individuals
- 3 FulfillmentState individuals
- 13 new property declarations
- Update `prescribes` domain/range
- Add deprecation note on `DirectiveContent`

### Step 2: Update @context in JSONLDSerializer.js

Add 6 missing entries: `DeonticCategory`, `FulfillmentState`, `disambiguationNote`, `realizedAt`, `violatedAt`, `violationEvidence`.

### Step 3: Update TTL test assertions

Add checks for all 9 classes, 9 individuals, and key properties.

### Step 4: Rebuild + full CI

Rebuild bundle, run all suites, verify non-regression.

---

## Risks

| Risk | Mitigation |
|------|-----------|
| TTL syntax error breaks parser | Run TurtleParser on the updated file as smoke test |
| Duplicate IRI with legacy `prescribes` | Update in-place, don't create a second declaration |
| `Hypothetical` dual-typing confuses reasoners | OWL 2 allows multiple types on individuals. Document the dual role. |
