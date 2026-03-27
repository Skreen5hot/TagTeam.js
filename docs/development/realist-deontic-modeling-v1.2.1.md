# Realist Deontic Modeling in TagTeam v1.2.1

**Specification Status:** Final  
**Author:** Aaron Damiano, Semantic Architect  
**Co-Author:** Claude (Anthropic), Architecture Review  
**Date:** March 26, 2026  
**Revision:** v1.2.1 — final; OWL model tightening from external review  
**Applies to:** TagTeam.js `buildGraph()` tree pipeline  
**Dependencies:** BFO 2020, CCO v1.5, OWL 2 DL  
**Supersedes:** Ghost Act model (IntentionalAct with `tagteam:actualityStatus`)

### Changelog

| Version | Changes |
|---------|---------|
| v1.0 | Initial specification. Ghost act elimination, Directive + PlanSpec + RealizableEntity model. |
| v1.1 | Closed open questions: `will` to realist path, `prescribedActClass`, passive agent resolution, coordinated acts. |
| v1.2 | Semantic hardening. Discrete deonticCategory, conjunctive obligations, lifecycle formalization, modal disambiguation, clean examples. |
| v1.2.1 | **OWL model tightening.** Added `isSpecifiedBy` (Obligation → PlanSpec direct link). `ConjunctiveObligation` now subclasses `Obligation`. Defined `DeonticCategory` and `FulfillmentState` as proper OWL classes. Narrowed `hasConjunct` range to `Obligation`. Clarified DICE as provenance (records the speech act) vs. PlanSpec as specification (defines realization conditions). |

---

## 1. Problem Statement

### 1.1 The Ghost Act Violation

TagTeam's current graph topology instantiates `IntentionalAct` nodes for every verb phrase, regardless of whether the act has occurred. For "The committee shall review the proposal," the system emits:

```
inst:Act_review  a  IntentionalAct, owl:NamedIndividual ;
    tagteam:verb "review" ;
    tagteam:modality "obligation" ;
    tagteam:actualityStatus tagteam:Prescribed .
```

This violates BFO's realist commitment. An `IntentionalAct` is an Occurrent — an entity that unfolds in time. Occurrents exist only when they are occurring or have occurred. The `tagteam:actualityStatus` property is TagTeam-specific; no standard BFO/CCO reasoner recognizes it. A query for `?x a IntentionalAct` returns ghost acts alongside real acts with no standard filtering mechanism.

### 1.2 What Actually Exists

For "The committee shall review the proposal," these entities exist at parse time:

- **The Committee** — Independent Continuant (Organization)
- **The Proposal** — Generically Dependent Continuant (InformationContentEntity)
- **The directive itself** — Generically Dependent Continuant (the rule prescribing the review)
- **The Obligation** — Specifically Dependent Continuant (RealizableEntity inhering in the Committee)

What does NOT exist: the review. No Occurrent instance is warranted.

### 1.3 Design Goals

1. **BFO Compliance:** No Occurrent instances for acts that have not occurred.
2. **Query Tractability:** "Who must do what?" answerable within 4 graph hops.
3. **NLP Preservation:** Linguistic metadata remains accessible on Tier 1 nodes.
4. **Lifecycle Support:** Clear rules for obligation creation, realization, and discharge.
5. **Backward Compatibility:** Actual (non-modal) acts are unaffected.
6. **Semantic Honesty:** Modal mappings documented as domain-specific interpretation rules with explicit confidence, not universal ontological truths.

---

## 2. Architecture: Hybrid Tier 1 / Tier 2 Model

### 2.1 Principle

- **Tier 1 (Discourse):** What the text says. Prescribed verb phrases are `tagteam:DiscourseReferent` + `tagteam:VerbPhrase` — ICEs carrying linguistic metadata.
- **Tier 2 (Domain):** What exists in reality. Directives, plan specifications, and deontic entities.

### 2.2 When This Model Applies

| Actuality | Model | Example |
|-----------|-------|---------|
| Actual (no modal) | **Current model** — `IntentionalAct`, roles realize in act | "The doctor treats the patient." |
| Prescribed (`must`, `shall`, `should`, `ought to`, `have to`, `need to`) | **Realist model** — DICE + PlanSpec + Obligation | "The committee shall review the proposal." |
| Intention (`will`) | **Realist model** — DICE + PlanSpec + Intention | "The agency will provide data." |
| Permitted (`may`, `can`) | **Realist model** — DICE + PlanSpec + Permission | "The patient may refuse treatment." |
| Prohibited (`must not`, `shall not`, `may not`, `cannot`) | **Realist model** — DICE + PlanSpec + Prohibition | "Officers shall not disclose records." |
| Hypothetical (`could`, `would`, `might`) | **Realist model** — DICE + PlanSpec only (no RealizableEntity) | "The system could fail under load." |

### 2.3 Branching Point in Code

```
if act has modality (any modal detected):
    → Realist path: VerbPhrase (Tier 1) + DICE + PlanSpec (Tier 2)
    → Emit RealizableEntity based on deontic category (§3.4)
    → Do NOT emit IntentionalAct
else (no modal):
    → Current path: IntentionalAct (Tier 2), roles realize in act
```

---

## 3. Node Type Definitions

### 3.1 Tier 1: VerbPhrase (Prescribed)

An Information Content Entity, NOT an Occurrent. Carries all NLP metadata.

**Type:** `tagteam:DiscourseReferent`, `tagteam:VerbPhrase`  
**NOT typed as:** `IntentionalAct`, `Process`, `Occurrent`

| Property | Type | Description |
|----------|------|-------------|
| `rdfs:label` | string | Verb text |
| `tagteam:verb` | string | Verb lemma |
| `tagteam:modality` | string | Modal classification |
| `tagteam:modalMarker` | string | Surface modal word |
| `tagteam:deonticCategory` | IRI | Discrete category (§4) |
| `tagteam:interpretationConfidence` | float | Parser confidence in the deontic classification (0.0–1.0) |
| `tagteam:disambiguationNote` | string | (Optional) Human-readable note on classification ambiguity |
| `tagteam:isNegated` | boolean | Modal negation |
| `tagteam:isPassive` | boolean | Passive clause |
| `tagteam:sourceText` | string | Modal + verb surface form |
| `is_about` | IRI ref | → Tier 2 DICE |
| `is_concretized_by` | IRI ref | → IBE |

### 3.2 Tier 2: DirectiveInformationContentEntity (DICE)

The normative speech act — the fact that a rule, command, or authorization was issued. Answers: "what was said?"

**Functional role: Provenance.** The DICE records *that* a directive was issued — it is the speech act, the source, the authority. It does NOT define what the obligation requires; that is the PlanSpecification's role. The DICE carries provenance (source document, modal marker) while the PlanSpecification carries semantics (agent, patient, act type). A single DICE prescribes exactly one PlanSpecification (1:1). Multiple DICEs from different source documents may prescribe functionally identical PlanSpecifications, enabling duplicate-detection.

**Type:** `DirectiveInformationContentEntity`, `InformationContentEntity`, `owl:NamedIndividual`

| Property | Type | Description |
|----------|------|-------------|
| `rdfs:label` | string | Descriptive label |
| `prescribes` | IRI ref | → exactly one PlanSpecification |
| `is_concretized_by` | IRI ref | → IBE |
| `tagteam:modalMarker` | string | Surface modal word |
| `tagteam:deonticCategory` | IRI | Deontic category (§4) |

### 3.3 Tier 2: PlanSpecification

The content of what was prescribed — act type, agent, and patient. Answers: "what should happen?" Does not instantiate the act.

**Functional role: Specification.** The PlanSpecification defines the *realization conditions* of a deontic entity. It is what a RealizableEntity (Obligation, Permission, etc.) is "about." The RealizableEntity links to the PlanSpecification directly via `isSpecifiedBy`, giving a 1-hop path from "who bears obligation?" to "what must they do?" The DICE provides provenance (who said it); the PlanSpec provides content (what it means).

**Type:** `PlanSpecification`, `InformationContentEntity`, `owl:NamedIndividual`

**Note on `prescribedActClass`:** This provides a reference hook to a domain ontology's act taxonomy. It is a convenience property for downstream consumers, not a formal T-Box assertion.

| Property | Type | Description |
|----------|------|-------------|
| `rdfs:label` | string | Descriptive label |
| `tagteam:prescribedActType` | string | Verb lemma |
| `tagteam:prescribedActClass` | IRI ref | (Optional) → OWL Class in domain ontology |
| `tagteam:prescribedAgent` | IRI ref | → Tier 2 entity |
| `tagteam:prescribedPatient` | IRI ref | → Tier 2 entity |
| `tagteam:prescribedRecipient` | IRI ref | → Tier 2 entity (if applicable) |

**Passive voice:** When `act.isPassive === true`, assign oblique entity (`obl` with `case: "by"`) as `prescribedAgent` and surface subject as `prescribedPatient`.

### 3.4 Tier 2: RealizableEntity (Deontic)

A Specifically Dependent Continuant that currently exists, inhering in the bearer.

| Deontic Category | Type | Emitted? |
|-----------------|------|----------|
| `tagteam:UnconditionalObligation` | `Obligation` | Yes |
| `tagteam:DefeasibleObligation` | `Obligation` | Yes |
| `tagteam:DeclaredIntention` | `Intention` | Yes |
| `tagteam:GrantedPermission` | `Permission` | Yes |
| `tagteam:UnconditionalProhibition` | `Prohibition` | Yes |
| `tagteam:Hypothetical` | *None* | No |

| Property | Type | Description |
|----------|------|-------------|
| `rdfs:label` | string | Descriptive label |
| `inheres_in` | IRI ref | → Tier 2 entity bearing the deontic entity |
| `is_prescribed_by` | IRI ref | → exactly one DICE (provenance: who said it) |
| `isSpecifiedBy` | IRI ref | → exactly one PlanSpecification (specification: what it requires) |
| `tagteam:deonticCategory` | IRI | Instance of `tagteam:DeonticCategory` class (§4) |
| `tagteam:fulfillmentState` | IRI | Instance of `tagteam:FulfillmentState` class: `Pending` / `Discharged` / `Violated` |

### 3.5 ConjunctiveObligation

Groups obligations from coordinated verbs. Discharged only when ALL conjuncts are discharged. Subclasses `Obligation` so that queries for `?x a Obligation` automatically include compound obligations.

**Type:** `tagteam:ConjunctiveObligation` (rdfs:subClassOf `tagteam:Obligation`)

| Property | Type | Description |
|----------|------|-------------|
| `tagteam:hasConjunct` | IRI ref (multi) | → each component `Obligation` (range: `tagteam:Obligation`, not all RealizableEntities) |
| `tagteam:fulfillmentState` | IRI | Pending until all conjuncts Discharged |

---

## 4. Deontic Category Enum

The deontic classification is a **discrete enum** of named individuals. The `interpretationConfidence` is a **separate** property reflecting parser certainty — it is NOT a measure of normative force.

| Category IRI | Meaning | Typical Modals | Default Confidence |
|-------------|---------|---------------|-------------------|
| `tagteam:UnconditionalObligation` | Non-defeasible duty | `must`, `shall` | 0.95 |
| `tagteam:DefeasibleObligation` | Recommendation; overridable | `should`, `ought to` | 0.85 |
| `tagteam:DeclaredIntention` | Self-committed future act | `will` | 0.75 |
| `tagteam:GrantedPermission` | Authorization to act | `may`, `can` | 0.70 |
| `tagteam:UnconditionalProhibition` | Absolute forbiddance | `must not`, `shall not`, `may not` | 0.90 |
| `tagteam:Hypothetical` | Possible, no deontic force | `could`, `would`, `might` | 0.80 |

**Why discrete, not continuous:** A float conflates normative force with classification certainty. "Should" is not "80% of must" — it is a categorically different speech act. The discrete enum preserves this.

---

## 5. Modal Disambiguation Rules

These are **domain-specific interpretation rules for regulatory/legal text**, not universal truths. They are default heuristics; domain configs can override.

### 5.1 `will` — Intention vs. Narrative Future

| Context | Classification | Confidence | Rationale |
|---------|---------------|------------|-----------|
| Regulatory/legal text | `DeclaredIntention` | 0.75 | Commitment |
| Reported speech | `DeclaredIntention` | 0.60 | Lower certainty |
| Scientific prediction | `DeclaredIntention` | 0.50 | May be epistemic |

### 5.2 `can` — Ability vs. Permission

| Context | Classification | Confidence | Rationale |
|---------|---------------|------------|-----------|
| Human agent, regulatory | `GrantedPermission` | 0.80 | Authorization |
| System/inanimate subject | `GrantedPermission` | 0.50 | Likely ability; flagged as ambiguous |

### 5.3 `may` — Permission vs. Epistemic

| Context | Classification | Confidence |
|---------|---------------|------------|
| Regulatory text | `GrantedPermission` | 0.90 |
| Epistemic ("It may rain") | `Hypothetical` | 0.50 |

### 5.4 `may not` / `cannot`

| Form | Classification | Confidence | Note |
|------|---------------|------------|------|
| `may not` | `UnconditionalProhibition` | 0.90 | Denial of permission |
| `cannot` | `UnconditionalProhibition` | 0.85 | Can mean inability; lower confidence |
| `can't` | `UnconditionalProhibition` | 0.80 | Tokenizer may split |

### 5.5 `must` — Deontic vs. Epistemic

| Context | Classification | Confidence | Note |
|---------|---------------|------------|------|
| `must` + action verb | `UnconditionalObligation` | 0.95 | Clear deontic |
| `must` + copular `be` + state | `UnconditionalObligation` | 0.50 | Likely epistemic; `disambiguationNote`: "Possible epistemic reading" |

---

## 6. Graph Topology Examples

Each subsection shows exactly one clean pattern.

### 6.1 Actual Act (No Change)

**Sentence:** "The doctor treats the patient."

```
Tier 2:
  Act_treat           a  IntentionalAct, owl:NamedIndividual ;
                       tagteam:verb "treat" .
  AgentRole_doctor    a  AgentRole ;
                       inheres_in → Doctor_t2 ;
                       realized_in → Act_treat .
  PatientRole_patient a  PatientRole ;
                       inheres_in → Patient_t2 ;
                       realized_in → Act_treat .
```

Unchanged. Real Occurrent, real role realization.

### 6.2 Prescribed Obligation

**Sentence:** "The committee shall review the proposal."

```
Tier 1:
  VP_shall_review     a  tagteam:DiscourseReferent, tagteam:VerbPhrase ;
                       tagteam:verb "review" ;
                       tagteam:modalMarker "shall" ;
                       tagteam:deonticCategory tagteam:UnconditionalObligation ;
                       tagteam:interpretationConfidence 0.95 ;
                       is_about → Directive_shall_review .
Tier 2:
  Directive_shall_review   a  DirectiveInformationContentEntity ;
                            prescribes → PlanSpec_review_proposal ;
                            tagteam:deonticCategory tagteam:UnconditionalObligation .
  PlanSpec_review_proposal a  PlanSpecification ;
                            tagteam:prescribedActType "review" ;
                            tagteam:prescribedAgent → Committee_t2 ;
                            tagteam:prescribedPatient → Proposal_t2 .
  Obligation_committee     a  Obligation ;
                            inheres_in → Committee_t2 ;
                            is_prescribed_by → Directive_shall_review ;
                            isSpecifiedBy → PlanSpec_review_proposal ;
                            tagteam:deonticCategory tagteam:UnconditionalObligation ;
                            tagteam:fulfillmentState tagteam:Pending .
```

No IntentionalAct. No ghost roles.

### 6.3 Prohibition

**Sentence:** "Officers shall not disclose records."

```
Tier 2:
  Directive_shall_not_disclose  a  DirectiveInformationContentEntity ;
                                 prescribes → PlanSpec_disclose_records ;
                                 tagteam:deonticCategory tagteam:UnconditionalProhibition .
  PlanSpec_disclose_records     a  PlanSpecification ;
                                 tagteam:prescribedActType "disclose" ;
                                 tagteam:prescribedAgent → Officers_t2 ;
                                 tagteam:prescribedPatient → Records_t2 .
  Prohibition_officers          a  Prohibition ;
                                 inheres_in → Officers_t2 ;
                                 is_prescribed_by → Directive_shall_not_disclose ;
                                 isSpecifiedBy → PlanSpec_disclose_records ;
                                 tagteam:deonticCategory tagteam:UnconditionalProhibition ;
                                 tagteam:fulfillmentState tagteam:Pending .
```

### 6.4 Permission

**Sentence:** "The patient may refuse treatment."

```
Tier 2:
  Directive_may_refuse    a  DirectiveInformationContentEntity ;
                           tagteam:deonticCategory tagteam:GrantedPermission .
  PlanSpec_refuse         a  PlanSpecification ;
                           tagteam:prescribedActType "refuse" ;
                           tagteam:prescribedAgent → Patient_t2 ;
                           tagteam:prescribedPatient → Treatment_t2 .
  Permission_patient      a  Permission ;
                           inheres_in → Patient_t2 ;
                           is_prescribed_by → Directive_may_refuse ;
                           isSpecifiedBy → PlanSpec_refuse ;
                           tagteam:fulfillmentState tagteam:Pending .
```

### 6.5 Hypothetical (No RealizableEntity)

**Sentence:** "The system could fail under load."

```
Tier 2:
  Directive_could_fail    a  DirectiveInformationContentEntity ;
                           tagteam:deonticCategory tagteam:Hypothetical .
  PlanSpec_fail           a  PlanSpecification ;
                           tagteam:prescribedActType "fail" ;
                           tagteam:prescribedAgent → System_t2 .
```

No RealizableEntity emitted.

### 6.6 Intention

**Sentence:** "The agency will provide data."

```
Tier 1:
  VP_will_provide       a  tagteam:DiscourseReferent, tagteam:VerbPhrase ;
                         tagteam:verb "provide" ;
                         tagteam:deonticCategory tagteam:DeclaredIntention ;
                         tagteam:interpretationConfidence 0.75 ;
                         is_about → Directive_will_provide .
Tier 2:
  Directive_will_provide     a  DirectiveInformationContentEntity ;
                              tagteam:deonticCategory tagteam:DeclaredIntention .
  PlanSpec_provide_data      a  PlanSpecification ;
                              tagteam:prescribedActType "provide" ;
                              tagteam:prescribedAgent → Agency_t2 ;
                              tagteam:prescribedPatient → Data_t2 .
  Intention_agency           a  Intention ;
                              inheres_in → Agency_t2 ;
                              is_prescribed_by → Directive_will_provide ;
                              isSpecifiedBy → PlanSpec_provide_data ;
                              tagteam:deonticCategory tagteam:DeclaredIntention ;
                              tagteam:fulfillmentState tagteam:Pending .
```

### 6.7 Coordinated Acts (Conjunctive Obligation)

**Sentence:** "The committee shall review and approve the proposal."

```
Tier 2:
  Directive_shall_review    a  DirectiveInformationContentEntity ;
                             prescribes → PlanSpec_review .
  PlanSpec_review           a  PlanSpecification ;
                             tagteam:prescribedActType "review" ;
                             tagteam:prescribedAgent → Committee_t2 ;
                             tagteam:prescribedPatient → Proposal_t2 .
  Obligation_review         a  Obligation ;
                             inheres_in → Committee_t2 ;
                             is_prescribed_by → Directive_shall_review ;
                             isSpecifiedBy → PlanSpec_review ;
                             tagteam:fulfillmentState tagteam:Pending .

  Directive_shall_approve   a  DirectiveInformationContentEntity ;
                             prescribes → PlanSpec_approve .
  PlanSpec_approve          a  PlanSpecification ;
                             tagteam:prescribedActType "approve" ;
                             tagteam:prescribedAgent → Committee_t2 ;
                             tagteam:prescribedPatient → Proposal_t2 .
  Obligation_approve        a  Obligation ;
                             inheres_in → Committee_t2 ;
                             is_prescribed_by → Directive_shall_approve ;
                             isSpecifiedBy → PlanSpec_approve ;
                             tagteam:fulfillmentState tagteam:Pending .

  ConjunctiveObligation_001 a  tagteam:ConjunctiveObligation ;
                              tagteam:hasConjunct → Obligation_review ;
                              tagteam:hasConjunct → Obligation_approve ;
                              tagteam:fulfillmentState tagteam:Pending .
```

Two independent Obligations + one ConjunctiveObligation wrapper. Discharged only when both conjuncts are Discharged.

### 6.8 Passive Prescribed Act

**Sentence:** "The records shall be destroyed by the officer."

```
Tier 2:
  PlanSpec_destroy_records  a  PlanSpecification ;
                             tagteam:prescribedActType "destroy" ;
                             tagteam:prescribedAgent → Officer_t2 ;
                             tagteam:prescribedPatient → Records_t2 .
  Obligation_officer        a  Obligation ;
                             inheres_in → Officer_t2 ;
                             is_prescribed_by → Directive_shall_destroy ;
                             isSpecifiedBy → PlanSpec_destroy_records .
```

Agent from oblique, not surface subject.

---

## 7. SPARQL Query Patterns

### 7.1 "What must the committee do?"

```sparql
SELECT ?actType ?patient WHERE {
  ?obligation a :Obligation ;
              :inheres_in ?agent ;
              :isSpecifiedBy ?plan .
  ?plan tagteam:prescribedActType ?actType .
  OPTIONAL { ?plan tagteam:prescribedPatient ?patient }
  ?agent rdfs:label "committee" .
}
```

**3 hops** (Committee → Obligation → PlanSpec → actType). The `isSpecifiedBy` direct link eliminates the DICE traversal for content queries. Use `is_prescribed_by` when you need provenance (which document, which modal marker).

### 7.2 "What is prohibited?"

```sparql
SELECT ?agent ?actType WHERE {
  ?prohibition a :Prohibition ;
               :inheres_in ?agent ;
               :isSpecifiedBy ?plan .
  ?plan tagteam:prescribedActType ?actType .
}
```

### 7.3 "Is compound obligation fully discharged?"

```sparql
ASK {
  ?conj a tagteam:ConjunctiveObligation .
  FILTER NOT EXISTS {
    ?conj tagteam:hasConjunct ?part .
    ?part tagteam:fulfillmentState tagteam:Pending .
  }
}
```

Returns true only when ALL conjuncts are discharged.

### 7.4 "Unfulfilled obligations"

```sparql
SELECT ?obligation ?agent ?actType WHERE {
  ?obligation a :Obligation ;
              :inheres_in ?agent ;
              :isSpecifiedBy ?plan ;
              tagteam:fulfillmentState tagteam:Pending .
  ?plan tagteam:prescribedActType ?actType .
}
```

---

## 8. Lifecycle Formalization

### 8.1 Fulfillment States

| State | Meaning | Set by |
|-------|---------|--------|
| `tagteam:Pending` | Exists, not yet discharged | TagTeam at parse time |
| `tagteam:Discharged` | Realized by an actual act | Downstream consumer |
| `tagteam:Violated` | Deadline passed or prohibited act performed | Downstream consumer |

TagTeam ONLY sets `Pending`. Transitions are downstream responsibility.

### 8.2 Realization Cardinality

| Rule | Constraint |
|------|-----------|
| One act → multiple obligations | **Yes.** One review can discharge obligations from two documents. |
| One obligation → multiple acts | **No.** Obligation is Pending or Discharged. For partial completion, decompose into ConjunctiveObligation. |
| Partial realization | Use ConjunctiveObligation with independently dischargeable conjuncts. |
| Temporal indexing | Consumer SHOULD assert `tagteam:realizedAt` (xsd:dateTime) on discharge. |

### 8.3 Discharge Protocol

1. Instantiate `IntentionalAct` (real Occurrent).
2. Assert `bfo:realizes → Obligation`.
3. Assert `tagteam:realizedAt` on Obligation.
4. Update `tagteam:fulfillmentState` → `Discharged`.
5. For ConjunctiveObligation: if all conjuncts Discharged, update wrapper.

### 8.4 Violation Protocol

1. Update `tagteam:fulfillmentState` → `Violated`.
2. Optionally assert `tagteam:violatedAt` and `tagteam:violationEvidence`.

---

## 9. Ontology Declarations

### 9.1 Classes

```turtle
tagteam:DirectiveInformationContentEntity rdf:type owl:Class ;
    rdfs:subClassOf cco:InformationContentEntity ;
    rdfs:label "Directive Information Content Entity"@en ;
    skos:definition "An ICE representing a normative speech act that prescribes, permits, or prohibits."@en .

tagteam:PlanSpecification rdf:type owl:Class ;
    rdfs:subClassOf cco:InformationContentEntity ;
    rdfs:label "Plan Specification"@en ;
    skos:definition "An ICE describing the content of a prescribed act: type, agent, patient."@en .

tagteam:Obligation rdf:type owl:Class ;
    rdfs:subClassOf bfo:RealizableEntity ;
    rdfs:label "Obligation"@en ;
    skos:definition "A realizable entity inhering in a bearer, prescribing performance of a specified act."@en .

tagteam:Permission rdf:type owl:Class ;
    rdfs:subClassOf bfo:RealizableEntity ;
    rdfs:label "Permission"@en ;
    skos:definition "A realizable entity authorizing performance of a specified act."@en .

tagteam:Prohibition rdf:type owl:Class ;
    rdfs:subClassOf bfo:RealizableEntity ;
    rdfs:label "Prohibition"@en ;
    skos:definition "A realizable entity forbidding performance of a specified act."@en .

tagteam:Intention rdf:type owl:Class ;
    rdfs:subClassOf bfo:RealizableEntity ;
    rdfs:label "Intention"@en ;
    skos:definition "A realizable entity representing self-declared commitment without external normative compulsion."@en .

tagteam:ConjunctiveObligation rdf:type owl:Class ;
    rdfs:subClassOf tagteam:Obligation ;
    rdfs:label "Conjunctive Obligation"@en ;
    skos:definition "An obligation whose satisfaction requires ALL component obligations to be discharged."@en .

tagteam:DeonticCategory rdf:type owl:Class ;
    rdfs:label "Deontic Category"@en ;
    skos:definition "Enumeration class for discrete deontic classifications. Instances represent categorically distinct normative force types."@en .

tagteam:FulfillmentState rdf:type owl:Class ;
    rdfs:label "Fulfillment State"@en ;
    skos:definition "Enumeration class for obligation lifecycle states: Pending, Discharged, Violated."@en .
```

### 9.2 Deontic Category Individuals

```turtle
tagteam:UnconditionalObligation rdf:type tagteam:DeonticCategory ;
    rdfs:label "Unconditional Obligation"@en .
tagteam:DefeasibleObligation rdf:type tagteam:DeonticCategory ;
    rdfs:label "Defeasible Obligation"@en .
tagteam:DeclaredIntention rdf:type tagteam:DeonticCategory ;
    rdfs:label "Declared Intention"@en .
tagteam:GrantedPermission rdf:type tagteam:DeonticCategory ;
    rdfs:label "Granted Permission"@en .
tagteam:UnconditionalProhibition rdf:type tagteam:DeonticCategory ;
    rdfs:label "Unconditional Prohibition"@en .
tagteam:Hypothetical rdf:type tagteam:DeonticCategory ;
    rdfs:label "Hypothetical"@en .
```

### 9.3 Fulfillment State Individuals

```turtle
tagteam:Pending rdf:type tagteam:FulfillmentState ; rdfs:label "Pending"@en .
tagteam:Discharged rdf:type tagteam:FulfillmentState ; rdfs:label "Discharged"@en .
tagteam:Violated rdf:type tagteam:FulfillmentState ; rdfs:label "Violated"@en .
```

### 9.4 Properties

```turtle
tagteam:prescribes rdf:type owl:ObjectProperty ;
    rdfs:domain tagteam:DirectiveInformationContentEntity ;
    rdfs:range tagteam:PlanSpecification ;
    rdfs:label "prescribes"@en .
tagteam:is_prescribed_by rdf:type owl:ObjectProperty ;
    owl:inverseOf tagteam:prescribes ;
    rdfs:label "is prescribed by"@en ;
    skos:definition "Provenance link: which directive speech act justifies this deontic entity."@en .
tagteam:isSpecifiedBy rdf:type owl:ObjectProperty ;
    rdfs:domain bfo:RealizableEntity ;
    rdfs:range tagteam:PlanSpecification ;
    rdfs:label "is specified by"@en ;
    skos:definition "Content link: which PlanSpecification defines the realization conditions for this deontic entity. Provides direct 1-hop access from obligation to prescribed act content."@en .
tagteam:prescribedActType rdf:type owl:DatatypeProperty ;
    rdfs:domain tagteam:PlanSpecification ; rdfs:range xsd:string ;
    rdfs:label "prescribed act type"@en .
tagteam:prescribedActClass rdf:type owl:ObjectProperty ;
    rdfs:domain tagteam:PlanSpecification ; rdfs:range owl:Class ;
    rdfs:label "prescribed act class"@en ;
    skos:definition "Reference hook to domain ontology act class. Convenience, not formal T-Box."@en .
tagteam:prescribedAgent rdf:type owl:ObjectProperty ;
    rdfs:domain tagteam:PlanSpecification ; rdfs:range bfo:IndependentContinuant ;
    rdfs:label "prescribed agent"@en .
tagteam:prescribedPatient rdf:type owl:ObjectProperty ;
    rdfs:domain tagteam:PlanSpecification ; rdfs:range bfo:Entity ;
    rdfs:label "prescribed patient"@en .
tagteam:prescribedRecipient rdf:type owl:ObjectProperty ;
    rdfs:domain tagteam:PlanSpecification ; rdfs:range bfo:IndependentContinuant ;
    rdfs:label "prescribed recipient"@en .
tagteam:deonticCategory rdf:type owl:ObjectProperty ;
    rdfs:range tagteam:DeonticCategory ;
    rdfs:label "deontic category"@en ;
    skos:definition "Discrete deontic classification. NOT a continuous measure."@en .
tagteam:interpretationConfidence rdf:type owl:DatatypeProperty ;
    rdfs:range xsd:float ;
    rdfs:label "interpretation confidence"@en ;
    skos:definition "Parser confidence in classification. NOT normative force."@en .
tagteam:fulfillmentState rdf:type owl:ObjectProperty ;
    rdfs:domain bfo:RealizableEntity ;
    rdfs:range tagteam:FulfillmentState ;
    rdfs:label "fulfillment state"@en .
tagteam:realizedAt rdf:type owl:DatatypeProperty ;
    rdfs:range xsd:dateTime ;
    rdfs:label "realized at"@en .
tagteam:violatedAt rdf:type owl:DatatypeProperty ;
    rdfs:range xsd:dateTime ;
    rdfs:label "violated at"@en .
tagteam:violationEvidence rdf:type owl:ObjectProperty ;
    rdfs:label "violation evidence"@en .
tagteam:hasConjunct rdf:type owl:ObjectProperty ;
    rdfs:domain tagteam:ConjunctiveObligation ;
    rdfs:range tagteam:Obligation ;
    rdfs:label "has conjunct"@en .
tagteam:disambiguationNote rdf:type owl:DatatypeProperty ;
    rdfs:range xsd:string ;
    rdfs:label "disambiguation note"@en .
```

---

## 10. Implementation Plan

**Phase 1:** Split emission path in `_buildWithTreeExtractors()`. Modal → realist. Non-modal → current.
**Phase 2:** Refactor `DirectiveExtractor` to produce DICE + PlanSpec. Retire `DirectiveContent`.
**Phase 3:** Emit RealizableEntity nodes with deonticCategory and fulfillmentState.
**Phase 4:** ConjunctiveObligation for coordinated verbs.
**Phase 5:** Update test runners. Add lifecycle discharge tests.

---

## 11. Acceptance Criteria

### Ghost Act Elimination
| AC | Assert | Expected |
|----|--------|----------|
| RDM-01 | "shall review" | No IntentionalAct |
| RDM-02 | "treats the patient" (actual) | IntentionalAct preserved |
| RDM-03 | "must not disclose" | No IntentionalAct |

### Directive + PlanSpec
| AC | Assert | Expected |
|----|--------|----------|
| RDM-04 | "shall review" | DICE exists |
| RDM-05 | DICE | deonticCategory = UnconditionalObligation |
| RDM-06 | DICE | modalMarker = "shall" |
| RDM-07 | DICE | prescribes → exactly one PlanSpec |
| RDM-08 | PlanSpec | prescribedActType = "review" |
| RDM-09 | PlanSpec | prescribedAgent → Committee |
| RDM-10 | PlanSpec | prescribedPatient → Proposal |

### RealizableEntity
| AC | Assert | Expected |
|----|--------|----------|
| RDM-11 | "shall review" | Obligation exists |
| RDM-12 | Obligation | inheres_in → Committee |
| RDM-13 | Obligation | is_prescribed_by → DICE |
| RDM-14 | Obligation | deonticCategory = UnconditionalObligation |
| RDM-15 | "may refuse" | Permission exists |
| RDM-16 | "shall not disclose" | Prohibition exists |
| RDM-17 | "could fail" | No RealizableEntity |

### Fulfillment
| AC | Assert | Expected |
|----|--------|----------|
| RDM-18 | Any RealizableEntity at parse | fulfillmentState = Pending |
| RDM-19 | After manual bfo:realizes | Transitions to Discharged |

### Tier 1 VerbPhrase
| AC | Assert | Expected |
|----|--------|----------|
| RDM-20 | VP for "shall review" | @type: DiscourseReferent + VerbPhrase, NOT IntentionalAct |
| RDM-21 | VP | is_about → DICE |
| RDM-22 | VP | interpretationConfidence is float 0–1 |

### Intention
| AC | Assert | Expected |
|----|--------|----------|
| RDM-23 | "will provide" | No IntentionalAct |
| RDM-24 | Intention node | inheres_in → Agency, deonticCategory = DeclaredIntention |
| RDM-25 | VP for "will provide" | interpretationConfidence ≤ 0.80 |

### Disambiguation
| AC | Assert | Expected |
|----|--------|----------|
| RDM-26 | "must verify" (action verb) | confidence ≥ 0.90 |
| RDM-27 | "must be in pain" (copular) | confidence ≤ 0.60, disambiguationNote present |
| RDM-28 | "system can process" (inanimate) | confidence ≤ 0.60 |

### Passive & Coordinated
| AC | Assert | Expected |
|----|--------|----------|
| RDM-29 | Passive: "shall be destroyed by officer" | prescribedAgent → Officer |
| RDM-30 | Passive obligation | inheres_in → Officer |
| RDM-31 | Coordinated: "shall review and approve" | Two DICEs, two Obligations |
| RDM-32 | Coordinated | One ConjunctiveObligation, two hasConjunct |
| RDM-33 | ConjunctiveObligation | fulfillmentState = Pending |

### isSpecifiedBy Direct Link (v1.2.1)
| AC | Assert | Expected |
|----|--------|----------|
| RDM-38 | Obligation for "shall review" | `isSpecifiedBy` → PlanSpec_review_proposal |
| RDM-39 | "What must X do?" query | Traverses Obligation → PlanSpec in 1 hop (3 total from agent) |

### OWL Model Constraints (v1.2.1)
| AC | Assert | Expected |
|----|--------|----------|
| RDM-40 | deonticCategory values | All are instances of `tagteam:DeonticCategory` class |
| RDM-41 | fulfillmentState values | All are instances of `tagteam:FulfillmentState` class |
| RDM-42 | ConjunctiveObligation | Is `rdfs:subClassOf tagteam:Obligation` — included in `?x a Obligation` queries |
| RDM-43 | hasConjunct range | Only `tagteam:Obligation` instances, not Permission or Intention |

### Non-Regression
| AC | Assert | Expected |
|----|--------|----------|
| RDM-34 | Actual act | IntentionalAct preserved |
| RDM-35 | Copular | StructuralAssertion unaffected |
| RDM-36 | Entity extraction | CDD, genericity unaffected |
| RDM-37 | Full CI suite | 0 failures |

---

## 12. FNSR Integration

- **CTS:** Consumes Obligation/Intention. Tracks fulfillmentState. Uses ConjunctiveObligation for compound compliance.
- **DES:** Reads deonticCategory for defeasibility. UnconditionalObligation = non-defeasible. DefeasibleObligation = overridable.
- **CSS:** Uses PlanSpecification for counterfactual simulation.
- **NIS:** Uses Tier 1 VerbPhrase for narrative tracking.

---

## 13. Resolved Questions

All questions from v1.0, v1.1, v1.2, and v1.2.1 external review are resolved.

| # | Question | Resolution |
|---|----------|-----------|
| 1 | `will` path | Realist. Intention node. §2.2, §6.6 |
| 2 | `should` class | Obligation with DefeasibleObligation category. §4 |
| 3 | Passive agents | From oblique. §3.3, §6.8 |
| 4 | Coordinated acts | Independent Obligations + ConjunctiveObligation. §6.7 |
| 5 | Float strengths | Replaced: discrete deonticCategory + interpretationConfidence. §4 |
| 6 | Fulfillment lifecycle | Formalized: states, cardinality, temporal indexing. §8 |
| 7 | DICE/PlanSpec distinction | DICE = provenance (speech act). PlanSpec = specification (content). §3.2, §3.3 |
| 8 | Partial compliance | ConjunctiveObligation with independent conjuncts. §3.5, §8.2 |
| 9 | Disambiguation | Domain-specific rules with confidence scores. §5 |
| 10 | Obligation → PlanSpec direct link | `isSpecifiedBy` property. 3-hop queries. §3.4, §7.1, §9.4, RDM-38/39 |
| 11 | ConjunctiveObligation subclass | Yes, `rdfs:subClassOf tagteam:Obligation`. §3.5, §9.1, RDM-42 |
| 12 | Category/State generic ranges | Defined `DeonticCategory` and `FulfillmentState` as proper OWL classes. §9.1, §9.2, §9.3, RDM-40/41 |
| 13 | hasConjunct range too broad | Narrowed to `tagteam:Obligation`. §9.4, RDM-43 |
| 14 | Directive creates vs records | DICE *records* the normative speech act (provenance). It does not causally create the Obligation — TagTeam creates both at parse time. §3.2 |

---

*This specification establishes the ontological foundation for modeling obligation, permission, prohibition, and intention in TagTeam without violating BFO's realist commitment. Modal mappings are domain-specific interpretation rules with explicit confidence. The `isSpecifiedBy` direct link enables 3-hop content queries while `is_prescribed_by` preserves provenance. Lifecycle formalization ensures parse-time creation and downstream discharge are formally distinguishable. It is the bridge between linguistic analysis and the FNSR ecosystem's reasoning about moral agency.*
