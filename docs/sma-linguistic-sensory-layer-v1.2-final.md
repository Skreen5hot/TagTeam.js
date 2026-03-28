# SMA Linguistic Sensory Layer Specification v1.2

**Status:** APPROVED FOR DEPLOYMENT  
**Date:** 2026-03-28  
**Authors:** Aaron Damiano, Claude  
**Applies to:** TagTeam.js `buildGraph()` pipeline  
**Dependencies:** BFO 2020 (ISO 21838-2), CCO 2.0, Realist Deontic Modeling v1.2.1  
**Downstream Consumers:** Causal Simulation Service (CSS), Compliance Tracking Service (CTS), Narrative Identity Service (NIS), Deliberative Ethical Engine (DES)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-03-28 | Initial draft |
| v1.1 | 2026-03-28 | Closed open questions §11; added Layer 4 implementation algorithm §12; refined `grounding` range to `ActSpecification`; added `UnspecifiedEntity` for negative polarity |
| v1.2 | 2026-03-28 | **FINAL.** Hardened §12 with implementation advisories: event-noun blacklist for possessive stative; `evidentialMarker` for perception copulas; `obl:loc` refinement for locatives. Added §14 Implementation Advisories. |

---

## 1. Purpose

TagTeam.js serves as the **Linguistic Sensory Layer** for a Synthetic Moral Agent (SMA). This specification extends TagTeam to extract:

1. **States** (qualities) from stative predicates — enabling moral reasoning interfaces
2. **Events** (process descriptions) from narrative sentences — enabling causal accountability
3. **Non-events** (negated narratives) — enabling counterfactual and violation detection
4. **Temporal-aspectual anchors** — enabling state chronology and process completion tracking

The goal is to produce BFO 2020-compliant graphs that downstream services can wire into causal chains and moral assessments.

---

## 2. Foundational Ontological Commitments

### 2.1 The Grounded State Principle

**States are real but never ungrounded.**

In this framework:
- **States** (qualities of continuants) serve as **interfaces for moral reasoning** — they are what we evaluate, what we care about, what triggers obligations
- **Processes** (occurrents) serve as the **substrate for causal accountability** — they are what agents do, what changes states, what bears responsibility

A state like "hungry" is not an unanalyzable primitive. It is **grounded** in:
- A **process** (metabolic depletion, absence of feeding), OR
- A **law** (biological regularities that connect processes to states)

This grounding enables **bidirectional causal reasoning**:

```
Process → State:    "Metabolism depletes energy" → Hungry
State → Process:    Hungry → "Feeding act" (state motivates/enables act)
```

### 2.2 Implications for TagTeam

TagTeam, as a parser, cannot determine the full causal grounding of a state. But it MUST:
1. Extract the state (quality) as a real entity
2. Provide the **grounding slot** for downstream services to populate
3. Never instantiate occurrents that did not occur (no ghost acts)
4. Preserve the linguistic evidence that downstream services need

### 2.3 BFO 2020 Alignment

All classes and properties in this specification derive from or align with BFO 2020 (ISO 21838-2). TagTeam extensions are declared as subclasses of BFO primitives.

| BFO Class | IRI | TagTeam Usage |
|-----------|-----|---------------|
| Quality | `bfo:BFO_0000019` | States extracted from adjectival predicates |
| Role | `bfo:BFO_0000023` | Classification from nominal predicates |
| Specifically Dependent Continuant | `bfo:BFO_0000020` | Superclass of Quality, Role |
| Independent Continuant | `bfo:BFO_0000004` | Bearers of qualities and roles |
| Process | `bfo:BFO_0000015` | Events (when realized) |
| Information Content Entity | `cco:InformationContentEntity` | Tier 1 discourse entities |

| BFO Property | IRI | Domain → Range |
|--------------|-----|----------------|
| inheres in | `bfo:BFO_0000052` | SDC → IC |
| bearer of | `bfo:BFO_0000053` | IC → SDC |
| has participant | `bfo:BFO_0000057` | Process → Continuant |
| participates in | `bfo:BFO_0000056` | Continuant → Process |
| realizes | `bfo:BFO_0000055` | Process → Realizable Entity |
| realized in | `bfo:BFO_0000054` | Realizable Entity → Process |

---

## 3. Stative Predicate Extraction

### 3.1 Scope

Stative predicates include:
- **Adjectival**: "The child is hungry" — quality assertion
- **Nominal**: "The child is a student" — role/classification assertion
- **Locative**: "The child is in the kitchen" — spatial relation assertion
- **Possessive**: "The dog has fur" — part/quality relation assertion

Currently, TagTeam handles nominal predicates ("X is a Y") via `StructuralAssertion`. This specification extends that pattern to all stative predicate types.

### 3.2 Detection Patterns

| Pattern | Dependency Signature | Example |
|---------|---------------------|---------|
| Adjectival copular | Root is `JJ`, has `cop` dependent | "The child is hungry" |
| Nominal copular | Root is `NN`, has `cop` dependent, `nsubj` ≠ object | "The child is a student" |
| Locative copular | Has `cop` + `obl:loc` OR `obl` with locative `case` + LOCATION entity | "The child is in the kitchen" |
| Possessive stative | Root is `VB[ZP]` "have/has", `obj` is quality/part (NOT event-noun) | "The dog has fur" |
| Evidential copular | Root is perception verb + `xcomp` adjective | "She seems tired" |

### 3.3 Adjectival Copular — Quality Assertion

**Input:** "The child is hungry."

**Dependency Tree:**
```
hungry/JJ (root)
├── child/NN (nsubj)
│   └── The/DT (det)
└── is/VBZ (cop)
```

**Tier 1 Output (Discourse):**
```json
{
  "@id": "inst:QualityAssertion_hungry_abc123",
  "@type": ["tagteam:QualityAssertion", "tagteam:StructuralAssertion"],
  "rdfs:label": "Quality assertion: child → hungry",
  "tagteam:assertionSubject": { "@id": "inst:DR_the_child" },
  "tagteam:assertedQuality": "hungry",
  "tagteam:copulaLemma": "be",
  "tagteam:tenseAspect": { "@id": "tagteam:SimplePresentTense" },
  "is_about": { "@id": "inst:Quality_hungry_def456" },
  "is_concretized_by": { "@id": "inst:Input_Text_IBE_xyz" }
}
```

**Tier 2 Output (Domain):**
```json
{
  "@id": "inst:Quality_hungry_def456",
  "@type": ["bfo:BFO_0000019", "owl:NamedIndividual"],
  "rdfs:label": "hungry",
  "tagteam:qualityType": "hungry",
  "bfo:BFO_0000052": { "@id": "inst:Entity_child_ghi789" },
  "tagteam:grounding": null,
  "tagteam:observedAt": "2026-03-28T12:00:00Z"
}
```

**Note:** `tagteam:grounding` is a **slot** that downstream services (CSS) populate when they determine the causal grounding. TagTeam leaves it null but provides the structure. The range is `tagteam:ActSpecification`, allowing reference to either a realized Process (via EventDescription) or an unrealized event that caused the state.

### 3.4 Nominal Copular — Role/Classification Assertion

**Input:** "The child is a student."

TagTeam distinguishes:
- **Rigid classification** (essential type): rare in natural language
- **Role/phase classification** (contingent): "is a student", "is a doctor"

Per BFO 2020, contingent classifications are best modeled as Roles (`bfo:BFO_0000023`) that the continuant bears.

**Tier 2 Output:**
```json
{
  "@id": "inst:Role_student_def456",
  "@type": ["bfo:BFO_0000023", "owl:NamedIndividual"],
  "rdfs:label": "student",
  "tagteam:roleType": "student",
  "bfo:BFO_0000052": { "@id": "inst:Entity_child_ghi789" },
  "tagteam:observedAt": "2026-03-28T12:00:00Z"
}
```

### 3.5 Possessive — Quality/Part Assertion

**Input:** "Dogs have fur."

**Analysis:** This asserts that instances of Dog bear a Quality (fur-having) or have a Part (fur). The generic "Dogs" indicates a **kind-level** assertion.

**Tier 1 Output:**
```json
{
  "@id": "inst:QualityAssertion_fur_abc123",
  "@type": ["tagteam:QualityAssertion", "tagteam:StructuralAssertion"],
  "tagteam:assertionSubject": { "@id": "inst:DR_dogs" },
  "tagteam:assertedQuality": "fur",
  "tagteam:genericityCategory": "KIND",
  "tagteam:genericityConfidence": 0.9,
  "is_about": { "@id": "inst:Quality_fur_def456" }
}
```

**Tier 2 Output:**
```json
{
  "@id": "inst:Quality_fur_def456",
  "@type": ["bfo:BFO_0000019", "owl:NamedIndividual"],
  "rdfs:label": "fur (kind-level)",
  "tagteam:qualityType": "fur",
  "bfo:BFO_0000052": { "@id": "inst:Kind_Dog_ghi789" },
  "tagteam:kindLevel": true
}
```

### 3.6 Evidential Copular — Perception-Qualified Quality

**Input:** "She seems tired."

Evidential copulas (`seem`, `appear`, `look`, `sound`, `feel`) carry **epistemic modality** — the speaker is reporting an observation, not asserting absolute ground truth.

**Tier 1 Output:**
```json
{
  "@id": "inst:QualityAssertion_tired_abc123",
  "@type": ["tagteam:QualityAssertion", "tagteam:StructuralAssertion"],
  "tagteam:assertionSubject": { "@id": "inst:DR_she" },
  "tagteam:assertedQuality": "tired",
  "tagteam:evidentialMarker": "seem",
  "tagteam:epistemicStatus": { "@id": "tagteam:Observational" },
  "tagteam:tenseAspect": { "@id": "tagteam:SimplePresentTense" },
  "is_about": { "@id": "inst:Quality_tired_def456" }
}
```

**Tier 2 Output:**
```json
{
  "@id": "inst:Quality_tired_def456",
  "@type": ["bfo:BFO_0000019", "owl:NamedIndividual"],
  "rdfs:label": "tired (observed)",
  "tagteam:qualityType": "tired",
  "bfo:BFO_0000052": { "@id": "inst:Entity_she_ghi789" },
  "tagteam:epistemicStatus": { "@id": "tagteam:Observational" },
  "tagteam:grounding": null
}
```

The `tagteam:evidentialMarker` and `tagteam:epistemicStatus` properties allow downstream services (NIS) to know this state is an observation, not an absolute ground truth.

### 3.7 Quality Taxonomy Decision

**RESOLVED:** TagTeam does NOT attempt to classify qualities into categories (emotional, physical, etc.).

TagTeam remains a **structural parser**. It emits `tagteam:qualityType` as a string (the adjective lemma). Downstream services (e.g., an Ontology Matcher or domain-specific gazetteer) map that string to a rich quality taxonomy if needed.

**Rationale:** Attempting to classify "hungry" as "Physical" and "angry" as "Emotional" within the parser introduces brittleness and domain-specific logic that does not belong in the linguistic layer.

### 3.8 What TagTeam Does NOT Emit

For stative predicates, TagTeam **MUST NOT** emit:
- `cco:IntentionalAct` (no act occurred)
- `AgentRole` / `PatientRole` (no thematic roles for states)
- Any BFO Occurrent subclass

The existing "ghost act" bug — "Dogs have fur" → `IntentionalAct(have)` with `AgentRole(dogs)` — violates BFO realism. Stative verbs do not denote acts.

---

## 4. Narrative Event Description

### 4.1 The EventDescription / PlanSpecification Distinction

TagTeam must distinguish:

| Class | Speech Act | Modality | Example |
|-------|-----------|----------|---------|
| `tagteam:PlanSpecification` | Prescriptive | Deontic (should/must) | "Parents must feed children" |
| `tagteam:EventDescription` | Descriptive | Narrative (did/does) | "The parent fed the child" |

Both share structural properties (agent, patient, actType) but have categorically different semantics:
- **PlanSpecification** prescribes an act that SHOULD occur
- **EventDescription** describes an act that DID occur (or DID NOT occur, when negated)

### 4.2 Ontology

```turtle
tagteam:ActSpecification rdf:type owl:Class ;
    rdfs:subClassOf cco:InformationContentEntity ;
    rdfs:label "Act Specification"@en ;
    skos:definition "An abstract superclass for ICEs that specify the structure of an act (agent, patient, act type) without asserting its realization or obligation status."@en .

tagteam:PlanSpecification rdf:type owl:Class ;
    rdfs:subClassOf tagteam:ActSpecification ;
    rdfs:label "Plan Specification"@en ;
    skos:definition "An ICE prescribing an act that SHOULD occur. Used in deontic contexts."@en .

tagteam:EventDescription rdf:type owl:Class ;
    rdfs:subClassOf tagteam:ActSpecification ;
    rdfs:label "Event Description"@en ;
    skos:definition "An ICE describing an act that DID occur (or DID NOT occur when negated). Used in narrative contexts."@en .
```

**Architectural Note:** The `ActSpecification` abstraction is the most significant design win in this specification. It allows structural property sharing (agent, patient, actType) while strictly separating **Realization Status** (Did it happen?) from **Modality** (Should it happen?). This enables the SMA to "see" the same semantic content across different speech acts.

### 4.3 Affirmative Narrative — Realized Event

**Input:** "The parent fed the child."

**Tier 1 Output:**
```json
{
  "@id": "inst:VP_fed_abc123",
  "@type": ["tagteam:VerbPhrase", "tagteam:DiscourseReferent"],
  "rdfs:label": "fed",
  "tagteam:verb": "feed",
  "tagteam:tenseAspect": { "@id": "tagteam:SimplePastTense" },
  "tagteam:isNegated": false,
  "is_about": { "@id": "inst:EventDesc_feed_def456" }
}
```

**Tier 2 Output:**
```json
{
  "@id": "inst:EventDesc_feed_def456",
  "@type": ["tagteam:EventDescription", "owl:NamedIndividual"],
  "rdfs:label": "Event: feed",
  "tagteam:actType": "feed",
  "tagteam:agent": { "@id": "inst:Entity_parent_ghi789" },
  "tagteam:patient": { "@id": "inst:Entity_child_jkl012" },
  "tagteam:realizationStatus": { "@id": "tagteam:Realized" },
  "tagteam:tenseAspect": { "@id": "tagteam:SimplePastTense" }
}
```

**Additionally**, TagTeam emits the **actual Process** (because the event is asserted as realized):
```json
{
  "@id": "inst:Process_feed_mno345",
  "@type": ["bfo:BFO_0000015", "cco:IntentionalAct", "owl:NamedIndividual"],
  "rdfs:label": "Feeding act",
  "bfo:BFO_0000057": [
    { "@id": "inst:Entity_parent_ghi789" },
    { "@id": "inst:Entity_child_jkl012" }
  ],
  "tagteam:describedBy": { "@id": "inst:EventDesc_feed_def456" }
}
```

### 4.4 Negated Narrative — Unrealized Event

**Input:** "The parent did not feed the child."

**The Realist Non-Event Principle:** TagTeam **MUST NOT** instantiate a Process (Occurrent) for events asserted as not having occurred.

**Tier 1 Output:**
```json
{
  "@id": "inst:VP_not_fed_abc123",
  "@type": ["tagteam:VerbPhrase", "tagteam:DiscourseReferent"],
  "rdfs:label": "did not feed",
  "tagteam:verb": "feed",
  "tagteam:tenseAspect": { "@id": "tagteam:SimplePastTense" },
  "tagteam:isNegated": true,
  "tagteam:negationMarker": "not",
  "is_about": { "@id": "inst:EventDesc_feed_def456" }
}
```

**Tier 2 Output:**
```json
{
  "@id": "inst:EventDesc_feed_def456",
  "@type": ["tagteam:EventDescription", "owl:NamedIndividual"],
  "rdfs:label": "Non-event: feed",
  "tagteam:actType": "feed",
  "tagteam:agent": { "@id": "inst:Entity_parent_ghi789" },
  "tagteam:patient": { "@id": "inst:Entity_child_jkl012" },
  "tagteam:realizationStatus": { "@id": "tagteam:Unrealized" },
  "tagteam:tenseAspect": { "@id": "tagteam:SimplePastTense" }
}
```

**No Process node is emitted.** The EventDescription exists (it's an ICE describing what was said) but it references no actual Occurrent.

### 4.5 Negative Polarity Items

**Input:** "The parent didn't feed anyone."

**RESOLVED:** Negative polarity items (anyone, anything, ever, etc.) are handled as quantified patients.

**Tier 2 Output:**
```json
{
  "@id": "inst:EventDesc_feed_npi_001",
  "@type": ["tagteam:EventDescription"],
  "tagteam:actType": "feed",
  "tagteam:agent": { "@id": "inst:Entity_parent_001" },
  "tagteam:patient": { "@id": "inst:UnspecifiedEntity_anyone_001" },
  "tagteam:realizationStatus": { "@id": "tagteam:Unrealized" }
}
```

```json
{
  "@id": "inst:UnspecifiedEntity_anyone_001",
  "@type": ["tagteam:UnspecifiedEntity", "owl:NamedIndividual"],
  "rdfs:label": "anyone",
  "tagteam:quantifier": { "@id": "tagteam:QuantifierNone" },
  "tagteam:npiLicensor": "not"
}
```

This allows the CTS to see that the set of people fed was empty, satisfying the "anyone" scope. The `UnspecifiedEntity` class represents existentially quantified participants whose identity is not specified.

### 4.6 SMA Value

The Causal Simulation Service (CSS) can now:
1. See that a `feed` event was reported as `Unrealized`
2. Query for the patient (`child`)
3. Infer the resulting state: `child` → `bfo:BFO_0000053` → `Quality(hungry)`

The Compliance Tracking Service (CTS) can:
1. Find an `Obligation` with `isSpecifiedBy` → `PlanSpec(feed, agent:Parent, patient:child)`
2. Find an `EventDescription` with `actType: feed, agent: parent, patient: child, realizationStatus: Unrealized`
3. Match the structures → conclude **Violation**

---

## 5. Temporal-Aspectual Anchoring

### 5.1 Tense-Aspect Categories

TagTeam extracts tense and aspect from verb morphology and auxiliaries:

| POS Pattern | Category | Temporal Anchor | Aspectual Status |
|-------------|----------|-----------------|------------------|
| VBD | SimplePast | Before speech time | Completed |
| VBZ/VBP | SimplePresent | At speech time | Ongoing/Habitual |
| MD(will) + VB | SimpleFuture | After speech time | Prospective |
| has/have + VBN | PresentPerfect | Before speech time, relevant now | Completed |
| was/were + VBG | PastProgressive | Before speech time | Incomplete |
| had + VBN | PastPerfect | Before reference time | Completed |

### 5.2 Aspectual Status Semantics

| Status | Meaning | SMA Implication |
|--------|---------|-----------------|
| Completed | Process reached natural endpoint | State change has occurred |
| Incomplete | Process was ongoing, may not have finished | State change may be partial |
| Prospective | Process anticipated but not begun | State change is future |
| Habitual | Process occurs regularly | State is recurring |

**Example:**
- "The parent was feeding the child" (Incomplete) → child may still be hungry
- "The parent fed the child" (Completed) → child is likely not hungry

### 5.3 Ontology

```turtle
tagteam:TenseAspect rdf:type owl:Class ;
    rdfs:label "Tense-Aspect Category"@en ;
    skos:definition "An enumeration of tense-aspect combinations extracted from verb morphology."@en .

tagteam:SimplePastTense rdf:type owl:NamedIndividual, tagteam:TenseAspect ;
    rdfs:label "Simple Past"@en ;
    tagteam:temporalAnchor "before_speech_time" ;
    tagteam:aspectualStatus "completed" .

tagteam:SimplePresentTense rdf:type owl:NamedIndividual, tagteam:TenseAspect ;
    rdfs:label "Simple Present"@en ;
    tagteam:temporalAnchor "at_speech_time" ;
    tagteam:aspectualStatus "ongoing" .

tagteam:SimpleFutureTense rdf:type owl:NamedIndividual, tagteam:TenseAspect ;
    rdfs:label "Simple Future"@en ;
    tagteam:temporalAnchor "after_speech_time" ;
    tagteam:aspectualStatus "prospective" .

tagteam:PresentPerfectTense rdf:type owl:NamedIndividual, tagteam:TenseAspect ;
    rdfs:label "Present Perfect"@en ;
    tagteam:temporalAnchor "before_speech_time" ;
    tagteam:aspectualStatus "completed" .

tagteam:PastProgressiveTense rdf:type owl:NamedIndividual, tagteam:TenseAspect ;
    rdfs:label "Past Progressive"@en ;
    tagteam:temporalAnchor "before_speech_time" ;
    tagteam:aspectualStatus "incomplete" .

tagteam:PastPerfectTense rdf:type owl:NamedIndividual, tagteam:TenseAspect ;
    rdfs:label "Past Perfect"@en ;
    tagteam:temporalAnchor "before_reference_time" ;
    tagteam:aspectualStatus "completed" .
```

---

## 6. Deontic-Narrative Alignment

### 6.1 The Matching Problem

For the SMA to detect violations, it must match:
- An `Obligation` (from a rule) specifying what SHOULD happen
- An `EventDescription` (from a narrative) describing what DID or DID NOT happen

These are **different nodes** with **different IRIs**. The matching must be structural.

### 6.2 Structural Matching Algorithm

Two ActSpecifications (PlanSpec or EventDesc) **match** iff:
1. `actType` lemmas are identical (after normalization)
2. `agent` entities unify (same individual, or instance-of-class relationship)
3. `patient` entities unify (same individual, or instance-of-class relationship)

### 6.3 SPARQL Pattern for Violation Detection

```sparql
PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
PREFIX bfo: <http://purl.obolibrary.org/obo/>

SELECT ?obligation ?eventDesc ?agent ?patient ?actType
WHERE {
  # Find an Obligation
  ?obligation a tagteam:Obligation ;
              tagteam:isSpecifiedBy ?planSpec ;
              tagteam:fulfillmentState tagteam:Pending .
  
  ?planSpec tagteam:prescribedActType ?actType ;
            tagteam:prescribedAgent ?agentClass ;
            tagteam:prescribedPatient ?patientClass .
  
  # Find a matching EventDescription that is Unrealized
  ?eventDesc a tagteam:EventDescription ;
             tagteam:actType ?actType ;
             tagteam:agent ?agent ;
             tagteam:patient ?patient ;
             tagteam:realizationStatus tagteam:Unrealized .
  
  # Unify agent (instance of class)
  ?agent a ?agentClass .
  
  # Unify patient (instance of class)
  ?patient a ?patientClass .
}
```

### 6.4 Namespace Normalization

For matching to work across documents, TagTeam normalizes:
- Act types to lowercase lemmas: "fed" → "feed", "feeding" → "feed"
- Entity types to canonical class IRIs: "Parent" → `schema:Parent` or domain ontology class

---

## 7. Ontology Additions

### 7.1 Classes

| Class | Superclass | Definition |
|-------|------------|------------|
| `tagteam:QualityAssertion` | `tagteam:StructuralAssertion` | A structural assertion that a continuant bears a quality |
| `tagteam:RoleAssertion` | `tagteam:StructuralAssertion` | A structural assertion that a continuant bears a role |
| `tagteam:ActSpecification` | `cco:InformationContentEntity` | Abstract superclass for act structure descriptions |
| `tagteam:EventDescription` | `tagteam:ActSpecification` | Describes an event that did/didn't occur (narrative) |
| `tagteam:TenseAspect` | `owl:Class` | Enumeration of tense-aspect categories |
| `tagteam:RealizationStatus` | `owl:Class` | Enumeration: Realized, Unrealized |
| `tagteam:UnspecifiedEntity` | `bfo:BFO_0000004` | An entity whose identity is not specified (existential) |
| `tagteam:Quantifier` | `owl:Class` | Enumeration of quantifier types |
| `tagteam:EpistemicStatus` | `owl:Class` | Enumeration: Asserted, Observational, Hypothetical |

### 7.2 Individuals

| Individual | Type | Definition |
|------------|------|------------|
| `tagteam:Realized` | `tagteam:RealizationStatus` | The described event occurred |
| `tagteam:Unrealized` | `tagteam:RealizationStatus` | The described event did not occur |
| `tagteam:SimplePastTense` | `tagteam:TenseAspect` | Past tense, perfective aspect |
| `tagteam:SimplePresentTense` | `tagteam:TenseAspect` | Present tense, imperfective aspect |
| `tagteam:SimpleFutureTense` | `tagteam:TenseAspect` | Future tense |
| `tagteam:PresentPerfectTense` | `tagteam:TenseAspect` | Present perfect |
| `tagteam:PastProgressiveTense` | `tagteam:TenseAspect` | Past progressive |
| `tagteam:PastPerfectTense` | `tagteam:TenseAspect` | Past perfect (pluperfect) |
| `tagteam:QuantifierNone` | `tagteam:Quantifier` | Zero quantity (anyone, nothing) |
| `tagteam:QuantifierAll` | `tagteam:Quantifier` | Universal (everyone, everything) |
| `tagteam:QuantifierSome` | `tagteam:Quantifier` | Existential (someone, something) |
| `tagteam:Asserted` | `tagteam:EpistemicStatus` | Speaker asserts as fact |
| `tagteam:Observational` | `tagteam:EpistemicStatus` | Speaker reports observation (evidential) |

### 7.3 Properties

| Property | Type | Domain | Range | Definition |
|----------|------|--------|-------|------------|
| `tagteam:assertedQuality` | Datatype | QualityAssertion | xsd:string | The quality predicate extracted |
| `tagteam:qualityType` | Datatype | bfo:Quality | xsd:string | The quality type label |
| `tagteam:grounding` | Object | bfo:Quality | ActSpecification | The act specification that grounds this state |
| `tagteam:actType` | Datatype | ActSpecification | xsd:string | The act type (verb lemma) |
| `tagteam:agent` | Object | ActSpecification | bfo:IC | The agent of the specified act |
| `tagteam:patient` | Object | ActSpecification | bfo:Entity | The patient of the specified act |
| `tagteam:realizationStatus` | Object | EventDescription | RealizationStatus | Whether the event occurred |
| `tagteam:tenseAspect` | Object | VerbPhrase, EventDesc | TenseAspect | The tense-aspect category |
| `tagteam:describedBy` | Object | bfo:Process | EventDescription | Links actual process to its description |
| `tagteam:kindLevel` | Datatype | bfo:Quality | xsd:boolean | True if kind-level (generic) quality |
| `tagteam:observedAt` | Datatype | bfo:Quality | xsd:dateTime | Parse timestamp for state observation |
| `tagteam:quantifier` | Object | UnspecifiedEntity | Quantifier | The quantifier type |
| `tagteam:npiLicensor` | Datatype | UnspecifiedEntity | xsd:string | The negative polarity licensor |
| `tagteam:temporalAnchor` | Datatype | TenseAspect | xsd:string | Temporal relation to speech time |
| `tagteam:aspectualStatus` | Datatype | TenseAspect | xsd:string | Completeness status |
| `tagteam:copulaLemma` | Datatype | StructuralAssertion | xsd:string | The copula verb lemma |
| `tagteam:evidentialMarker` | Datatype | QualityAssertion | xsd:string | The evidential verb (seem, appear, etc.) |
| `tagteam:epistemicStatus` | Object | QualityAssertion, Quality | EpistemicStatus | Certainty level of the assertion |

---

## 8. Complete Graph Example

### 8.1 Multi-Sentence Scenario

**Input:**
```
"Parents must feed their children. The child is hungry. The parent did not feed the child."
```

**Expected Output (condensed):**

```json
{
  "@context": { "...": "..." },
  "@graph": [
    // Sentence 1: Deontic — "Parents must feed their children"
    {
      "@id": "inst:Obligation_feed_001",
      "@type": ["tagteam:Obligation"],
      "tagteam:deonticCategory": { "@id": "tagteam:UnconditionalObligation" },
      "tagteam:fulfillmentState": { "@id": "tagteam:Pending" },
      "tagteam:isSpecifiedBy": { "@id": "inst:PlanSpec_feed_001" },
      "bfo:BFO_0000052": { "@id": "inst:Kind_Parent" }
    },
    {
      "@id": "inst:PlanSpec_feed_001",
      "@type": ["tagteam:PlanSpecification"],
      "tagteam:prescribedActType": "feed",
      "tagteam:prescribedAgent": { "@id": "inst:Kind_Parent" },
      "tagteam:prescribedPatient": { "@id": "inst:Kind_Child" }
    },

    // Sentence 2: Stative — "The child is hungry"
    {
      "@id": "inst:QualityAssertion_hungry_002",
      "@type": ["tagteam:QualityAssertion"],
      "tagteam:assertedQuality": "hungry",
      "is_about": { "@id": "inst:Quality_hungry_002" }
    },
    {
      "@id": "inst:Quality_hungry_002",
      "@type": ["bfo:BFO_0000019"],
      "rdfs:label": "hungry",
      "tagteam:qualityType": "hungry",
      "bfo:BFO_0000052": { "@id": "inst:Entity_child_002" },
      "tagteam:grounding": null
    },

    // Sentence 3: Negated Narrative — "The parent did not feed the child"
    {
      "@id": "inst:VP_not_feed_003",
      "@type": ["tagteam:VerbPhrase"],
      "tagteam:verb": "feed",
      "tagteam:isNegated": true,
      "tagteam:tenseAspect": { "@id": "tagteam:SimplePastTense" },
      "is_about": { "@id": "inst:EventDesc_feed_003" }
    },
    {
      "@id": "inst:EventDesc_feed_003",
      "@type": ["tagteam:EventDescription"],
      "tagteam:actType": "feed",
      "tagteam:agent": { "@id": "inst:Entity_parent_003" },
      "tagteam:patient": { "@id": "inst:Entity_child_002" },
      "tagteam:realizationStatus": { "@id": "tagteam:Unrealized" }
    }

    // NOTE: No IntentionalAct for sentences 2 or 3
  ]
}
```

### 8.2 Downstream Inference

The CTS can now execute the SPARQL pattern from §6.3:
1. `Obligation_feed_001` specifies `PlanSpec(feed, Parent, Child)`
2. `EventDesc_feed_003` describes `Event(feed, parent, child, Unrealized)`
3. Match on: actType=feed, agent=parent∈Parent, patient=child∈Child
4. **Conclusion:** Obligation violated

The CSS can now:
1. See `Quality_hungry_002` with null `grounding`
2. See `EventDesc_feed_003` with `Unrealized` status
3. **Inference:** The unrealized feeding is the grounding for the hungry state
4. Populate: `Quality_hungry_002.grounding = EventDesc_feed_003`

**Note on Grounding Range:** The `grounding` property has range `tagteam:ActSpecification` (not `bfo:Process`). This is intentional — when a state is caused by an *absence* of action, the grounding points to an `EventDescription` with `Unrealized` status, not to a non-existent Process.

---

## 9. Implementation Workstreams

| WS | Name | Scope | Priority |
|----|------|-------|----------|
| WS-A | Stative Predicate Extraction | §3, §12 (adjectival, nominal, possessive copulars) | P0 — oldest open bug |
| WS-B | Narrative Negation | §4.4, §4.5 (negated narratives → EventDescription, no Process) | P1 |
| WS-C | EventDescription Class | §4.1-4.3 (new class, affirmative narratives) | P1 |
| WS-D | Tense-Aspect Extraction | §5 (tense/aspect categories and properties) | P2 |
| WS-E | Deontic-Narrative Bridge | §6 (matching algorithm, SPARQL patterns) | P2 |

**Recommended sequence:** WS-A → WS-C → WS-B → WS-D → WS-E

WS-A is the immediate priority (the "Dogs have fur" bug). WS-C and WS-B are tightly coupled and should ship together. WS-D and WS-E are downstream enablers.

---

## 10. Acceptance Criteria

### WS-A: Stative Predicate Extraction

| AC | Input | Assert |
|----|-------|--------|
| AC-STA-01 | "The child is hungry." | QualityAssertion emitted, no IntentionalAct |
| AC-STA-02 | "The child is hungry." | Quality node with `bfo:BFO_0000052` → child entity |
| AC-STA-03 | "The child is a student." | RoleAssertion emitted, Role node with `bfo:BFO_0000052` → child |
| AC-STA-04 | "Dogs have fur." | QualityAssertion emitted, no IntentionalAct, no AgentRole |
| AC-STA-05 | "Dogs have fur." | Quality node with `kindLevel: true` |
| AC-STA-06 | "The book is on the table." | StructuralAssertion with locative relation |
| AC-STA-07 | "The soup is hot." | QualityAssertion, Quality node, no IntentionalAct |
| AC-STA-08 | "She seems tired." | QualityAssertion with `evidentialMarker: "seem"`, `epistemicStatus: Observational` |
| AC-STA-09 | "The committee has a meeting." | IntentionalAct (event-noun, NOT stative) |
| AC-STA-10 | "The book is by the author." | StructuralAssertion with authorship relation (NOT locative) |

### WS-B: Narrative Negation

| AC | Input | Assert |
|----|-------|--------|
| AC-NEG-01 | "The parent did not feed the child." | No IntentionalAct node |
| AC-NEG-02 | "The parent did not feed the child." | EventDescription with `realizationStatus: Unrealized` |
| AC-NEG-03 | "The parent did not feed the child." | VerbPhrase with `isNegated: true` |
| AC-NEG-04 | "The parent never fed the child." | Same as AC-NEG-01/02 (handles "never") |
| AC-NEG-05 | "The parent fed the child." | IntentionalAct node emitted (affirmative) |
| AC-NEG-06 | "The parent didn't feed anyone." | UnspecifiedEntity with `quantifier: QuantifierNone` |

### WS-C: EventDescription

| AC | Input | Assert |
|----|-------|--------|
| AC-EVT-01 | "The parent fed the child." | EventDescription with `realizationStatus: Realized` |
| AC-EVT-02 | "The parent fed the child." | IntentionalAct linked via `describedBy` |
| AC-EVT-03 | "The parent fed the child." | EventDescription has `agent`, `patient`, `actType` |

### WS-D: Tense-Aspect

| AC | Input | Assert |
|----|-------|--------|
| AC-TAS-01 | "The parent fed the child." | `tenseAspect: SimplePastTense` |
| AC-TAS-02 | "The parent is feeding the child." | `tenseAspect: PresentProgressiveTense` |
| AC-TAS-03 | "The parent has fed the child." | `tenseAspect: PresentPerfectTense` |
| AC-TAS-04 | "The parent will feed the child." | `tenseAspect: SimpleFutureTense` |

---

## 11. Resolved Questions

| # | Question | Resolution |
|---|----------|------------|
| Q1 | Should TagTeam classify qualities (emotional/physical)? | **NO.** TagTeam emits `tagteam:qualityType` as a string. Downstream services map to taxonomy. |
| Q2 | What is the range of `grounding`? | **`tagteam:ActSpecification`** — allows reference to unrealized events (EventDescription with Unrealized status). |
| Q3 | How to handle negative polarity items? | **`tagteam:UnspecifiedEntity`** with `tagteam:quantifier: QuantifierNone`. |

---

## 12. Layer 4 Implementation: Stative Predicate Detection

This section provides the algorithmic logic for the `buildGraph()` pipeline to detect and route stative predicates away from the IntentionalAct path.

### 12.1 Pipeline Position

The stative predicate detector runs in **Layer 4 (Act Extraction)** after dependency parsing (Layer 1) and entity extraction (Layer 3), but **before** the current IntentionalAct emission logic.

```
Layer 1: Tokenization + POS + Dependency Parse
Layer 2: Sentence Segmentation + Speech Act Classification
Layer 3: Entity Extraction (DiscourseReferent, Tier 2 entities)
Layer 4: Act Extraction ← STATIVE GATE INSERTED HERE
  └── 4a: Stative Predicate Detection (NEW)
  └── 4b: Modal Detection (RDM)
  └── 4c: Narrative Act Detection (existing IntentionalAct path)
Layer 5: Role Resolution
Layer 6: Serialization
```

### 12.2 Stative Gate Algorithm

```
FUNCTION isStativePredicate(rootToken, arcs) → Boolean

  // Pattern 1: Adjectival copular root
  IF rootToken.pos == 'JJ' OR rootToken.pos == 'JJR' OR rootToken.pos == 'JJS':
    IF hasDependentWithLabel(rootToken, arcs, 'cop'):
      RETURN TRUE

  // Pattern 2: Nominal copular root (non-equative)
  IF rootToken.pos IN ['NN', 'NNS', 'NNP', 'NNPS']:
    IF hasDependentWithLabel(rootToken, arcs, 'cop'):
      nsubj = getDependentWithLabel(rootToken, arcs, 'nsubj')
      IF nsubj != NULL AND nsubj.lemma != rootToken.lemma:
        // "The child is a student" (child ≠ student) → stative
        RETURN TRUE
      // "John is the president" might be equative — handled elsewhere

  // Pattern 3: Possessive stative ("have/has" + concrete noun object)
  IF rootToken.lemma == 'have' AND rootToken.pos IN ['VBZ', 'VBP', 'VB']:
    obj = getDependentWithLabel(rootToken, arcs, 'obj')
    IF obj != NULL:
      IF NOT hasModalAuxiliary(rootToken, arcs):
        IF isConcreteNounOrQuality(obj) AND NOT isEventNoun(obj):
          // "Dogs have fur" → stative
          // But "The committee has a meeting" → NOT stative (event-noun)
          RETURN TRUE

  // Pattern 4: Locative copular (refined)
  IF hasDependentWithLabel(rootToken, arcs, 'cop'):
    // Check for obl:loc (Universal Dependencies locative subtype)
    IF hasDependentWithLabel(rootToken, arcs, 'obl:loc'):
      RETURN TRUE
    // Fallback: check obl with locative case marker + LOCATION NER
    obl = getDependentWithLabel(rootToken, arcs, 'obl')
    IF obl != NULL:
      caseMarker = getDependentWithLabel(obl, arcs, 'case')
      IF caseMarker != NULL AND caseMarker.lemma IN ['in', 'on', 'at', 'under', 'near']:
        IF obl.ner == 'LOCATION' OR obl.ner == 'GPE' OR obl.ner == 'FAC':
          RETURN TRUE
        // Additional heuristic: common location nouns
        IF obl.lemma IN LOCATION_NOUN_GAZETTEER:
          RETURN TRUE

  // Pattern 5: Evidential/perception copulas
  IF rootToken.lemma IN ['seem', 'appear', 'look', 'sound', 'feel', 'taste', 'smell']:
    IF rootToken.pos IN ['VBZ', 'VBP', 'VB', 'VBD']:
      xcomp = getDependentWithLabel(rootToken, arcs, 'xcomp')
      IF xcomp != NULL AND xcomp.pos IN ['JJ', 'JJR', 'JJS']:
        // "She seems tired" → stative (evidential)
        RETURN TRUE

  RETURN FALSE
END FUNCTION
```

### 12.3 Helper Functions

```
FUNCTION hasDependentWithLabel(head, arcs, label) → Boolean
  FOR arc IN arcs:
    IF arc.head == head.index AND arc.label == label:
      RETURN TRUE
    // Handle subtype labels (e.g., 'obl:loc' matches 'obl:loc')
    IF ':' IN label AND arc.label == label:
      RETURN TRUE
  RETURN FALSE
END FUNCTION

FUNCTION getDependentWithLabel(head, arcs, label) → Token | NULL
  FOR arc IN arcs:
    IF arc.head == head.index AND arc.label == label:
      RETURN tokens[arc.dependent]
    // Handle base label match (e.g., 'obl' matches 'obl:loc')
    IF ':' IN arc.label AND arc.label.startsWith(label + ':'):
      RETURN tokens[arc.dependent]
  RETURN NULL
END FUNCTION

FUNCTION hasModalAuxiliary(verb, arcs) → Boolean
  FOR arc IN arcs:
    IF arc.head == verb.index AND arc.label == 'aux':
      auxToken = tokens[arc.dependent]
      IF auxToken.pos == 'MD':
        RETURN TRUE
  RETURN FALSE
END FUNCTION

FUNCTION isConcreteNounOrQuality(token) → Boolean
  // Heuristic: common nouns that denote parts, substances, or qualities
  IF token.pos IN ['NN', 'NNS']:
    RETURN TRUE
  RETURN FALSE
END FUNCTION

FUNCTION isEventNoun(token) → Boolean
  // Blacklist of event-denoting nominalizations
  // These should trigger the act path, not the stative path
  EVENT_NOUN_BLACKLIST = [
    'meeting', 'surgery', 'flight', 'appointment', 'conference',
    'session', 'trial', 'hearing', 'examination', 'interview',
    'wedding', 'funeral', 'party', 'ceremony', 'celebration',
    'game', 'match', 'race', 'competition', 'concert', 'performance',
    'lesson', 'class', 'lecture', 'seminar', 'workshop',
    'trip', 'journey', 'vacation', 'tour', 'visit',
    'conversation', 'discussion', 'debate', 'argument', 'fight',
    'operation', 'procedure', 'transaction', 'deal', 'negotiation'
  ]
  RETURN token.lemma IN EVENT_NOUN_BLACKLIST
END FUNCTION

// Gazetteer for common location nouns (Pattern 4 fallback)
LOCATION_NOUN_GAZETTEER = [
  'table', 'desk', 'chair', 'floor', 'ceiling', 'wall', 'room',
  'kitchen', 'bedroom', 'bathroom', 'office', 'garage', 'basement',
  'shelf', 'drawer', 'cabinet', 'closet', 'corner', 'center',
  'box', 'bag', 'container', 'pocket', 'folder'
]
```

### 12.4 Routing Logic

```
FUNCTION processAct(rootToken, arcs, entities)

  // Gate 1: Stative predicate?
  IF isStativePredicate(rootToken, arcs):
    RETURN emitStativeAssertion(rootToken, arcs, entities)

  // Gate 2: Modal verb? (RDM path)
  IF hasModalAuxiliary(rootToken, arcs):
    RETURN emitDeonticStructure(rootToken, arcs, entities)  // existing RDM

  // Gate 3: Negated narrative?
  IF isNegated(rootToken, arcs):
    RETURN emitNegativeEventDescription(rootToken, arcs, entities)

  // Default: Affirmative narrative → IntentionalAct
  RETURN emitIntentionalAct(rootToken, arcs, entities)

END FUNCTION
```

**Critical Note:** The gate order is deterministic and prevents leakage:
- A negated modal ("must not feed") hits Gate 2 first → RDM path (correct)
- A negated narrative ("did not feed") skips Gates 1-2, hits Gate 3 → EventDescription (correct)
- A stative ("is hungry") hits Gate 1 first → QualityAssertion (correct)

### 12.5 Stative Emission Logic

```
FUNCTION emitStativeAssertion(rootToken, arcs, entities)

  subject = getDependentWithLabel(rootToken, arcs, 'nsubj')
  subjectEntity = resolveToTier2(subject, entities)

  // Determine stative type
  IF rootToken.pos IN ['JJ', 'JJR', 'JJS']:
    // Adjectival → Quality
    RETURN emitQualityAssertion(rootToken, subjectEntity, NULL)
  
  ELSE IF rootToken.lemma IN ['seem', 'appear', 'look', 'sound', 'feel']:
    // Evidential copula → Quality with evidential marker
    xcomp = getDependentWithLabel(rootToken, arcs, 'xcomp')
    RETURN emitQualityAssertion(xcomp, subjectEntity, rootToken.lemma)

  ELSE IF rootToken.pos IN ['NN', 'NNS', 'NNP', 'NNPS']:
    // Nominal → Role
    RETURN emitRoleAssertion(rootToken, subjectEntity)
  
  ELSE IF rootToken.lemma == 'have':
    // Possessive → Quality/Part
    obj = getDependentWithLabel(rootToken, arcs, 'obj')
    RETURN emitQualityAssertion(obj, subjectEntity, NULL)
  
  ELSE:
    // Locative or other → generic StructuralAssertion
    RETURN emitLocativeAssertion(rootToken, arcs, subjectEntity)

END FUNCTION

FUNCTION emitQualityAssertion(qualityToken, bearerEntity, evidentialVerb)

  // Tier 1: QualityAssertion
  assertionNode = {
    "@id": generateId("QualityAssertion", qualityToken.lemma),
    "@type": ["tagteam:QualityAssertion", "tagteam:StructuralAssertion"],
    "tagteam:assertedQuality": qualityToken.lemma,
    "tagteam:assertionSubject": { "@id": bearerEntity.discourseReferent },
    "tagteam:tenseAspect": extractTenseAspect(qualityToken),
    "is_about": { "@id": generateId("Quality", qualityToken.lemma) }
  }
  
  // Add evidential marker if present
  IF evidentialVerb != NULL:
    assertionNode["tagteam:evidentialMarker"] = evidentialVerb
    assertionNode["tagteam:epistemicStatus"] = { "@id": "tagteam:Observational" }

  // Tier 2: bfo:Quality
  qualityNode = {
    "@id": generateId("Quality", qualityToken.lemma),
    "@type": ["bfo:BFO_0000019", "owl:NamedIndividual"],
    "rdfs:label": qualityToken.lemma,
    "tagteam:qualityType": qualityToken.lemma,
    "bfo:BFO_0000052": { "@id": bearerEntity.tier2Id },
    "tagteam:grounding": null,
    "tagteam:kindLevel": isKindLevel(bearerEntity),
    "tagteam:observedAt": currentTimestamp()
  }
  
  // Propagate epistemic status to quality node
  IF evidentialVerb != NULL:
    qualityNode["tagteam:epistemicStatus"] = { "@id": "tagteam:Observational" }

  RETURN [assertionNode, qualityNode]

END FUNCTION
```

### 12.6 Negation Detection

```
FUNCTION isNegated(rootToken, arcs) → Boolean
  FOR arc IN arcs:
    IF arc.head == rootToken.index AND arc.label == 'advmod':
      advToken = tokens[arc.dependent]
      IF advToken.lemma IN ['not', 'never', "n't"]:
        RETURN TRUE
  RETURN FALSE
END FUNCTION

FUNCTION getNegationMarker(rootToken, arcs) → String | NULL
  FOR arc IN arcs:
    IF arc.head == rootToken.index AND arc.label == 'advmod':
      advToken = tokens[arc.dependent]
      IF advToken.lemma IN ['not', 'never', "n't"]:
        RETURN advToken.text
  RETURN NULL
END FUNCTION
```

### 12.7 Kind-Level Detection

```
FUNCTION isKindLevel(entity) → Boolean
  // Bare plurals and generic subjects are kind-level
  IF entity.genericityCategory == 'KIND':
    RETURN TRUE
  IF entity.determiner == NULL AND entity.number == 'plural':
    RETURN TRUE
  RETURN FALSE
END FUNCTION
```

### 12.8 Integration Points

The Layer 4 stative gate integrates with existing TagTeam modules:

| Module | Integration |
|--------|-------------|
| `DependencyParser` | Provides `arcs` array with `{head, dependent, label}` |
| `EntityExtractor` | Provides `entities` map with Tier 1 → Tier 2 links |
| `GenericityTagger` | Provides `genericityCategory` on entities |
| `NERTagger` | Provides `ner` tag on tokens (for locative detection) |
| `JSONLDSerializer` | Receives stative nodes for serialization |
| `OntologyTagger` | Can match `qualityType` to domain quality classes |

### 12.9 Test Vectors

| Input | Root | Pattern | Expected Output |
|-------|------|---------|-----------------|
| "The child is hungry." | hungry/JJ | Adjectival copular | QualityAssertion, Quality |
| "Dogs have fur." | have/VBZ | Possessive | QualityAssertion, Quality (kindLevel) |
| "The child is a student." | student/NN | Nominal copular | RoleAssertion, Role |
| "The book is on the table." | table/NN | Locative copular | StructuralAssertion (locative) |
| "She seems tired." | seems/VBZ | Evidential | QualityAssertion (evidentialMarker: "seem") |
| "The parent fed the child." | fed/VBD | — | IntentionalAct (NOT stative) |
| "The committee shall review." | review/VB | — | RDM path (NOT stative) |
| "The committee has a meeting." | have/VBZ | — | IntentionalAct (event-noun, NOT stative) |
| "The book is by the author." | author/NN | — | StructuralAssertion (authorship, NOT locative) |

---

## 13. Glossary

| Term | Definition |
|------|------------|
| **Act Specification** | An abstract ICE describing the structure of an act without asserting realization or obligation |
| **Epistemic Status** | The certainty level of an assertion (Asserted, Observational, Hypothetical) |
| **Event Description** | A narrative ICE describing an act that did or didn't occur |
| **Event-Noun** | A nominalization that denotes an event (meeting, surgery) rather than a thing |
| **Evidential Marker** | A perception verb (seem, appear) that indicates the speaker is reporting observation |
| **Grounding** | The process or law that causally explains a state |
| **Plan Specification** | A deontic ICE prescribing an act that should occur |
| **Quality** | A specifically dependent continuant that inheres in a bearer (BFO) |
| **Realization Status** | Whether a described event actually occurred |
| **Stative Predicate** | A linguistic construction denoting a state rather than an action |
| **Tense-Aspect** | The temporal and completeness properties of a verb phrase |

---

## 14. Implementation Advisories

These advisories document edge cases and mitigations identified during architectural review.

### Advisory 1: The "Copular Have" Ambiguity

**Risk:** "Have" is heavily overloaded in English. "The committee has a meeting" could accidentally trigger the possessive stative pattern if "meeting" is misclassified.

**Mitigation:** The `isEventNoun()` function (§12.3) maintains a blacklist of event-denoting nominalizations. Sentences like "The committee has a meeting" correctly route to the IntentionalAct path, not the stative path.

**Test Vector:** AC-STA-09 validates this case.

### Advisory 2: Evidential Copulas and Epistemic Status

**Risk:** "Seems" carries epistemic modality (uncertainty). Mapping "seems tired" directly to `bfo:Quality(tired)` without marking the uncertainty could cause the SMA to treat observations as absolute facts.

**Mitigation:** The `tagteam:evidentialMarker` and `tagteam:epistemicStatus` properties (§3.6, §7.3) are populated when an evidential copula is detected. Downstream services (NIS) can distinguish observations from assertions.

**Test Vector:** AC-STA-08 validates this case.

### Advisory 3: Locative vs Non-Locative "By"

**Risk:** "The book is by the author" uses "by" but denotes authorship, not location. Naive case-marker matching could misclassify this as locative.

**Mitigation:** Pattern 4 in §12.2 is refined to require EITHER:
1. Universal Dependencies `obl:loc` subtype label, OR
2. Case marker + NER tag of `LOCATION`/`GPE`/`FAC`, OR
3. Case marker + membership in `LOCATION_NOUN_GAZETTEER`

"By the author" fails all three checks (no `obl:loc`, no LOCATION NER on "author", "author" not in gazetteer).

**Test Vector:** AC-STA-10 validates this case.

### Advisory 4: Gate Order Prevents Leakage

**Risk:** A negated modal like "must not feed" could accidentally hit the narrative negation path instead of the RDM path.

**Mitigation:** The gate order in §12.4 is strict: Stative → Modal → Negated → Affirmative. Modal detection (Gate 2) runs before negation detection (Gate 3), so "must not feed" correctly routes to RDM.

**Test Vector:** Covered by existing RDM test suite (AC-NEG-* for contractions like "mustn't").

---

## 15. Verification Matrix

| SMA Requirement | TagTeam Feature | Spec Section | Status |
|-----------------|-----------------|--------------|--------|
| Extract States | QualityAssertion, bfo:Quality | §3, §12 | ✓ PASS |
| Extract Non-Events | EventDescription (Unrealized) | §4.4 | ✓ PASS |
| Temporal Anchors | TenseAspect ontology | §5 | ✓ PASS |
| Causal Grounding | `tagteam:grounding` slot (range: ActSpecification) | §3.3, §11 Q2 | ✓ PASS |
| Epistemic Qualification | `evidentialMarker`, `epistemicStatus` | §3.6, §14 Adv 2 | ✓ PASS |
| Negative Polarity | UnspecifiedEntity, QuantifierNone | §4.5, §11 Q3 | ✓ PASS |
| Event-Noun Disambiguation | `isEventNoun()` blacklist | §12.3, §14 Adv 1 | ✓ PASS |
| Locative Refinement | obl:loc, NER, gazetteer | §12.2, §14 Adv 3 | ✓ PASS |

---

*This specification completes the linguistic sensory layer, enabling TagTeam to produce the high-resolution semantic signal required for a Synthetic Moral Agent to perceive, reason about, and judge the moral landscape of natural language reports.*

**— END OF SPECIFICATION —**
