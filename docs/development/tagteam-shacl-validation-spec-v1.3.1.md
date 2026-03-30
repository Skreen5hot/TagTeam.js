# TagTeam SHACL Validation Specification

**Version:** 1.3.1  
**Date:** 2026-03-30  
**Status:** APPROVED FOR IMPLEMENTATION  
**Canonical Namespace:** `http://tagteam.fandaws.org/ontology/`  
**Companion To:** SMA Linguistic Sensory Layer Spec v1.2  
**Purpose:** Structural integrity validation for TagTeam semantic graphs

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-29 | Initial release |
| 1.2.0 | 2026-03-29 | Added InstrumentalRoleShape, NegationConsistencyRule, DeprecatedPatternDetection, Genericity tuning |
| 1.3.0 | 2026-03-30 | Architectural clarification (Two-Tier/Three-Layer), Normative Vocabularies (§3), Canonical Fields (§4), Type-based constraints replacing heuristics, SHACL prefix declarations, Conformance levels (§15), Appendix sync fixes |
| 1.3.1 | 2026-03-30 | **Developer alignment:** Namespace sync with codebase (`http://tagteam.fandaws.org/ontology/`, `https://www.commoncoreontologies.org/`), systemGenerated relaxed to SHOULD, WS-B-READY profile added, Implementation approach guidance (§16.6) |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architectural Overview](#2-architectural-overview)
3. [Normative Terms and Controlled Vocabularies](#3-normative-terms-and-controlled-vocabularies)
4. [Canonical Fields and Derivation](#4-canonical-fields-and-derivation)
5. [Namespace and Prefix Declarations](#5-namespace-and-prefix-declarations)
6. [Tier 1: Discourse Layer Shapes](#6-tier-1-discourse-layer-shapes)
7. [Tier 2: Information Content Entity Shapes](#7-tier-2-information-content-entity-shapes)
8. [Tier 2: Process & Role Shapes](#8-tier-2-process--role-shapes)
9. [Tier 2: Entity Shapes](#9-tier-2-entity-shapes)
10. [Provenance Shapes](#10-provenance-shapes)
11. [Cross-Tier Integrity Constraints](#11-cross-tier-integrity-constraints)
12. [Anti-Pattern Detection](#12-anti-pattern-detection)
13. [Severity Classification](#13-severity-classification)
14. [Validation Matrix](#14-validation-matrix)
15. [Conformance Levels](#15-conformance-levels)
16. [Implementation Notes](#16-implementation-notes)
17. [Appendix A: Complete SHACL Turtle](#appendix-a-complete-shacl-turtle)
18. [Appendix B: Test Sentences](#appendix-b-test-sentences)
19. [Appendix C: Conformance Checklist](#appendix-c-conformance-checklist)

---

## 1. Introduction

### 1.1 Purpose

This specification defines SHACL (Shapes Constraint Language) shapes for validating TagTeam semantic graphs. It guards against the **fallacy of composition** — where individual components pass unit tests but the assembled graph violates architectural invariants.

### 1.2 Scope

| In Scope | Out of Scope |
|----------|--------------|
| Structural validation of emitted graphs | NLP parsing accuracy |
| Tier separation enforcement | Semantic correctness of extracted meaning |
| Cross-reference integrity | Performance optimization |
| Anti-pattern detection | UI/UX concerns |
| Negation-realization consistency (WS-B) | Temporal anchoring (WS-D) |
| Instrumental role validation | Epistemic modal logic |
| Controlled vocabulary enforcement | Domain-specific extensions |

### 1.3 Conformance Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

### 1.4 Relationship to Other Specifications

| Specification | Relationship |
|---------------|--------------|
| SMA Linguistic Sensory Layer v1.2 | Normative — defines the architecture |
| RDM v1.2.1 | Normative — defines deontic modeling |
| BFO 2020 | Normative — upper ontology |
| CCO 2.0 | Normative — common core ontology |
| SHACL W3C Recommendation | Normative — constraint language |

---

## 2. Architectural Overview

### 2.1 Two-Tier, Three-Layer Architecture

**CLARIFICATION (v1.3):** TagTeam uses a **Two-Tier** architecture with **Three Semantic Layers**. Previous versions conflated "tier" and "layer" terminology.

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 1: DISCOURSE TIER                       │
│       Linguistic surface — mentions, not meaning                │
│                                                                 │
│   Layer 1.1: Discourse Referents (noun phrases, pronouns)       │
│   Layer 1.2: Verb Phrases (predicates, modals)                  │
├─────────────────────────────────────────────────────────────────┤
│                    TIER 2: SEMANTIC TIER                        │
│       Ontological content — meaning, not surface                │
│                                                                 │
│   Layer 2.1: Information Content Entities (ICEs)                │
│              EventDescription, PlanSpecification, Assertions    │
│                                                                 │
│   Layer 2.2: Continuants & Occurrents                           │
│              Entities, Processes, Roles                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Tier vs Layer Definitions

| Term | Definition | Examples |
|------|------------|----------|
| **Tier 1** | Linguistic surface forms — pointers to meaning | DiscourseReferent, VerbPhrase |
| **Tier 2** | Semantic content — ontological individuals | All other node types |
| **Layer 2.1 (ICE)** | Information about reality | EventDescription, PlanSpecification, QualityAssertion |
| **Layer 2.2 (BFO)** | Reality itself | IntentionalAct, Person, AgentRole |

### 2.3 Tier Separation Principle

**CRITICAL INVARIANT:** Tier 1 nodes MUST NOT carry Tier 2 types and vice versa.

| Node Type | Tier | Layer | Forbidden Cross-Typing |
|-----------|------|-------|------------------------|
| DiscourseReferent | 1 | 1.1 | Any Tier 2 type |
| VerbPhrase | 1 | 1.2 | Any Tier 2 type |
| EventDescription | 2 | 2.1 | DiscourseReferent, VerbPhrase |
| PlanSpecification | 2 | 2.1 | DiscourseReferent, VerbPhrase |
| QualityAssertion | 2 | 2.1 | DiscourseReferent, VerbPhrase |
| IntentionalAct | 2 | 2.2 | DiscourseReferent, VerbPhrase |
| Person/Entity | 2 | 2.2 | DiscourseReferent, VerbPhrase |
| AgentRole/PatientRole | 2 | 2.2 | DiscourseReferent, VerbPhrase |

### 2.4 Information Flow

```
Tier 1                           Tier 2
───────                          ───────
DiscourseReferent ──is_about──▶  Entity (Layer 2.2)
                                    │
VerbPhrase ──is_about──▶         EventDescription (Layer 2.1)
                                    │
                                    ▼ describedBy (inverse)
                                 IntentionalAct (Layer 2.2)
                                    │
                                    ▼ realized_in (inverse)
                                 AgentRole (Layer 2.2) ──inheres_in──▶ Entity
```

### 2.5 Predicate Classification

| Category | Tier 1 | Layer 2.1 | Layer 2.2 |
|----------|--------|-----------|-----------|
| Eventive (transitive) | VerbPhrase | EventDescription [Realized] | IntentionalAct + Roles |
| Eventive (intransitive) | VerbPhrase | EventDescription [Realized] | IntentionalAct + AgentRole |
| Eventive (instrumental) | VerbPhrase | EventDescription [Realized] | IntentionalAct + All Roles |
| Negated eventive | VerbPhrase [negated] | EventDescription [Unrealized] | *None* |
| Stative (quality) | VerbPhrase | QualityAssertion | *None* |
| Stative (structural) | VerbPhrase | StructuralAssertion | *None* |
| Deontic | VerbPhrase | DICE + PlanSpecification | Obligation/Permission |

---

## 3. Normative Terms and Controlled Vocabularies

**NEW in v1.3:** This section defines the allowed values for all controlled vocabulary fields. Validators MUST reject values not in these lists unless explicitly extended.

### 3.1 denotesType (Tier 1 → Tier 2 Category)

| Value | Description | Target Layer |
|-------|-------------|--------------|
| `"Person"` | Human individual | 2.2 |
| `"Organization"` | Corporate/institutional entity | 2.2 |
| `"Entity"` | Generic independent continuant | 2.2 |
| `"Location"` | Spatial region or place | 2.2 |
| `"EventDescription"` | Description of an event (CURRENT) | 2.1 |
| `"Event"` | **DEPRECATED** — use EventDescription | 2.2 |
| `"Directive"` | Deontic directive ICE | 2.1 |
| `"Quality"` | Quality assertion | 2.1 |
| `"Structure"` | Structural/mereological assertion | 2.1 |
| `"Role"` | Role assertion | 2.1 |

### 3.2 modalMarker (Deontic Modal Verbs)

| Value | Deontic Force | Example |
|-------|---------------|---------|
| `"shall"` | Unconditional obligation | "shall review" |
| `"must"` | Strong obligation | "must comply" |
| `"should"` | Advisory/recommended | "should consider" |
| `"may"` | Permission | "may attend" |
| `"can"` | Ability/permission | "can submit" |
| `"will"` | Future/commitment | "will provide" |

### 3.3 deonticCategory (Deontic Classification)

| IRI | Description |
|-----|-------------|
| `tagteam:UnconditionalObligation` | Mandatory without conditions |
| `tagteam:ConditionalObligation` | Mandatory if conditions met |
| `tagteam:Permission` | Allowed but not required |
| `tagteam:Prohibition` | Forbidden |
| `tagteam:Advisory` | Recommended but not binding |

### 3.4 realizationStatus (Event Actuality)

| IRI | Description | IntentionalAct Emitted? |
|-----|-------------|-------------------------|
| `tagteam:Realized` | Event occurred/is occurring | Yes |
| `tagteam:Unrealized` | Event did not occur (negated, future, hypothetical) | No |

### 3.5 actualityStatus (Process Actuality)

| IRI | Description |
|-----|-------------|
| `tagteam:Actual` | Process actually occurred |
| `tagteam:Hypothetical` | Process is hypothetical/counterfactual |

### 3.6 genericityCategory (Instance vs Kind)

| Value | Description |
|-------|-------------|
| `"INST"` | Specific instance ("the committee") |
| `"KIND"` | Generic kind ("committees in general") |
| `"AMB"` | Ambiguous/undetermined |

### 3.7 parseConfidence (Parse Quality)

| Value | Probability Range |
|-------|-------------------|
| `"high"` | ≥ 0.90 |
| `"medium"` | 0.70 – 0.89 |
| `"low"` | < 0.70 |

---

## 4. Canonical Fields and Derivation

**NEW in v1.3:** This section clarifies which fields are canonical (source of truth) vs derived (computed/redundant).

### 4.1 Field Canonicity Table

| Field | Location | Canonicity | Derivation Source |
|-------|----------|------------|-------------------|
| `rdfs:label` | All nodes | Canonical | N/A |
| `tagteam:mentionId` | Tier 1 only | Canonical | N/A |
| `tagteam:lemma` | VerbPhrase | Canonical | Morphological analysis |
| `tagteam:verb` | VerbPhrase | Derived | = lemma (convenience alias) |
| `tagteam:actType` | EventDescription | Derived | Copied from VerbPhrase.lemma |
| `tagteam:prescribedActType` | PlanSpecification | Derived | Copied from VerbPhrase.lemma |
| `tagteam:denotesType` | DiscourseReferent | Canonical | NER + type resolution |
| `tagteam:realizationStatus` | EventDescription | Canonical | Negation/tense analysis |
| `tagteam:actualityStatus` | IntentionalAct | Derived | = Actual iff ED.realizationStatus = Realized |
| `tagteam:agent` | EventDescription | Canonical | Dependency parse (nsubj) |
| `tagteam:patient` | EventDescription | Canonical | Dependency parse (obj) |
| `tagteam:instrument` | EventDescription | Canonical | Dependency parse (obl + "with") |

### 4.2 Consistency Rules

**INVARIANT 4.2.1:** `VerbPhrase.lemma` MUST equal the `actType` of its `is_about` target (if EventDescription).

**INVARIANT 4.2.2:** `IntentionalAct.actualityStatus` MUST be `tagteam:Actual` if and only if its `describedBy` target has `realizationStatus: tagteam:Realized`.

**INVARIANT 4.2.3:** `VerbPhrase.verb` SHOULD equal `VerbPhrase.lemma` (legacy field, may be removed in future).

---

## 5. Namespace and Prefix Declarations

### 5.1 Turtle Prefix Declarations

```turtle
@prefix sh:      <http://www.w3.org/ns/shacl#> .
@prefix xsd:     <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:    <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:     <http://www.w3.org/2002/07/owl#> .
@prefix bfo:     <http://purl.obolibrary.org/obo/> .
@prefix cco:     <https://www.commoncoreontologies.org/> .
@prefix tagteam: <http://tagteam.fandaws.org/ontology/> .
@prefix ttshacl: <http://tagteam.fandaws.org/shacl/> .
```

### 5.2 SHACL Prefix Declaration Node (v1.3 Addition)

**REQUIRED for SPARQL portability across validators:**

```turtle
ttshacl:PrefixDeclarations
  a owl:Ontology ;
  sh:declare [
    sh:prefix "tagteam" ;
    sh:namespace "http://tagteam.fandaws.org/ontology/"^^xsd:anyURI
  ] ;
  sh:declare [
    sh:prefix "cco" ;
    sh:namespace "https://www.commoncoreontologies.org/"^^xsd:anyURI
  ] ;
  sh:declare [
    sh:prefix "bfo" ;
    sh:namespace "http://purl.obolibrary.org/obo/"^^xsd:anyURI
  ] ;
  sh:declare [
    sh:prefix "rdfs" ;
    sh:namespace "http://www.w3.org/2000/01/rdf-schema#"^^xsd:anyURI
  ] ;
  sh:declare [
    sh:prefix "xsd" ;
    sh:namespace "http://www.w3.org/2001/XMLSchema#"^^xsd:anyURI
  ] .
```

All SPARQL-based shapes MUST reference this declaration:

```turtle
sh:prefixes ttshacl:PrefixDeclarations ;
```

---

## 6. Tier 1: Discourse Layer Shapes

### 6.1 Shape: DiscourseReferentShape

**Target:** All nodes with `@type` including `tagteam:DiscourseReferent`

**Purpose:** Validates Tier 1 linguistic mentions with proper metadata and Tier 2 linkage.

#### 6.1.1 Constraints

| Property | Cardinality | Type | Vocabulary | Description |
|----------|-------------|------|------------|-------------|
| `tagteam:mentionId` | exactly 1 | xsd:string | — | Unique span identifier |
| `rdfs:label` | exactly 1 | xsd:string | — | Surface text |
| `tagteam:denotesType` | exactly 1 | xsd:string | §3.1 | Category of referent |
| `is_about` | min 1 | IRI | — | Link to Tier 2 |
| `is_concretized_by` | exactly 1 | IRI | — | Link to source IBE |
| `tagteam:parseConfidence` | max 1 | xsd:string | §3.7 | Confidence level |

#### 6.1.2 Anti-Patterns (MUST NOT)

- MUST NOT have `@type` including any Tier 2 type (see §2.3)
- MUST NOT have `tagteam:actualityStatus`
- MUST NOT have `tagteam:realizationStatus`

#### 6.1.3 SHACL

```turtle
ttshacl:DiscourseReferentShape
  a sh:NodeShape ;
  sh:targetClass tagteam:DiscourseReferent ;
  sh:name "Discourse Referent Shape" ;
  sh:description "Validates Tier 1 linguistic mentions" ;
  
  sh:property [
    sh:path tagteam:mentionId ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "DiscourseReferent MUST have exactly one mentionId"
  ] ;
  
  sh:property [
    sh:path rdfs:label ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "DiscourseReferent MUST have exactly one rdfs:label"
  ] ;
  
  sh:property [
    sh:path tagteam:denotesType ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:in ( "Person" "Organization" "Entity" "Location" "EventDescription" "Event" "Directive" "Quality" "Structure" "Role" ) ;
    sh:message "DiscourseReferent MUST have exactly one denotesType from controlled vocabulary"
  ] ;
  
  sh:property [
    sh:path tagteam:is_about ;
    sh:minCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "DiscourseReferent MUST have at least one is_about link"
  ] ;
  
  sh:property [
    sh:path tagteam:is_concretized_by ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "DiscourseReferent MUST link to source IBE"
  ] ;
  
  # Anti-patterns: Tier separation
  sh:not [ sh:class cco:IntentionalAct ] ;
  sh:not [ sh:class cco:Role ] ;
  sh:not [ sh:class tagteam:EventDescription ] ;
  sh:not [ sh:class tagteam:PlanSpecification ] ;
  
  sh:property [
    sh:path tagteam:actualityStatus ;
    sh:maxCount 0 ;
    sh:message "DiscourseReferent MUST NOT have actualityStatus (Tier 2 property)"
  ] ;
  
  sh:property [
    sh:path tagteam:realizationStatus ;
    sh:maxCount 0 ;
    sh:message "DiscourseReferent MUST NOT have realizationStatus (Tier 2 property)"
  ] .
```

---

### 6.2 Shape: VerbPhraseShape

**Target:** All nodes with `@type` including `tagteam:VerbPhrase`

**Purpose:** Validates Tier 1 verb mentions with modal routing.

#### 6.2.1 Constraints

| Property | Cardinality | Type | Vocabulary | Description |
|----------|-------------|------|------------|-------------|
| `tagteam:lemma` | exactly 1 | xsd:string | — | Lemmatized verb (CANONICAL) |
| `tagteam:verb` | exactly 1 | xsd:string | — | Verb string (DERIVED) |
| `is_about` | exactly 1 | IRI | — | Link to Layer 2.1 ICE |
| `tagteam:modalMarker` | max 1 | xsd:string | §3.2 | Modal verb if present |
| `tagteam:negated` | max 1 | xsd:boolean | — | Negation flag |

#### 6.2.2 SHACL

```turtle
ttshacl:VerbPhraseShape
  a sh:NodeShape ;
  sh:targetClass tagteam:VerbPhrase ;
  sh:name "Verb Phrase Shape" ;
  sh:description "Validates Tier 1 verb mentions" ;
  
  sh:property [
    sh:path tagteam:lemma ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "VerbPhrase MUST have exactly one lemma"
  ] ;
  
  sh:property [
    sh:path tagteam:verb ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "VerbPhrase MUST have exactly one verb"
  ] ;
  
  sh:property [
    sh:path tagteam:is_about ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "VerbPhrase MUST have exactly one is_about link"
  ] ;
  
  sh:property [
    sh:path tagteam:modalMarker ;
    sh:in ( "shall" "must" "should" "may" "can" "will" ) ;
    sh:message "VerbPhrase modalMarker must be from controlled vocabulary"
  ] ;
  
  # Anti-patterns: Tier separation
  sh:not [ sh:class cco:IntentionalAct ] ;
  sh:not [ sh:class bfo:BFO_0000015 ] ;
  sh:not [ sh:class tagteam:EventDescription ] ;
  
  sh:property [
    sh:path tagteam:realized_in ;
    sh:maxCount 0 ;
    sh:message "VerbPhrase MUST NOT have realized_in (Role property)"
  ] ;
  
  sh:property [
    sh:path tagteam:describedBy ;
    sh:maxCount 0 ;
    sh:message "VerbPhrase MUST NOT have describedBy (Process property)"
  ] .
```

---

## 7. Tier 2: Information Content Entity Shapes

### 7.1 Shape: EventDescriptionShape

**Target:** All nodes with `@type` including `tagteam:EventDescription`

**Purpose:** Validates Layer 2.1 descriptions of events.

#### 7.1.1 Constraints

| Property | Cardinality | Type | Vocabulary | Canonicity |
|----------|-------------|------|------------|------------|
| `tagteam:actType` | exactly 1 | xsd:string | — | Derived from VP.lemma |
| `tagteam:realizationStatus` | exactly 1 | IRI | §3.4 | Canonical |
| `tagteam:agent` | min 0* | IRI | — | Canonical |
| `tagteam:patient` | min 0* | IRI | — | Canonical |
| `tagteam:instrument` | min 0 | IRI | — | Canonical |

*At least one of agent/patient MUST be present.

#### 7.1.2 SHACL

```turtle
ttshacl:EventDescriptionShape
  a sh:NodeShape ;
  sh:targetClass tagteam:EventDescription ;
  sh:name "Event Description Shape" ;
  sh:description "Validates Layer 2.1 event descriptions" ;
  
  sh:property [
    sh:path tagteam:actType ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "EventDescription MUST have exactly one actType"
  ] ;
  
  sh:property [
    sh:path tagteam:realizationStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "EventDescription MUST have exactly one realizationStatus"
  ] ;
  
  # Participant coverage: at least one of agent or patient
  sh:or (
    [ sh:property [ sh:path tagteam:agent ; sh:minCount 1 ] ]
    [ sh:property [ sh:path tagteam:patient ; sh:minCount 1 ] ]
  ) ;
  
  sh:property [
    sh:path tagteam:instrument ;
    sh:nodeKind sh:IRI
  ] ;
  
  # Tier separation
  sh:not [ sh:class tagteam:VerbPhrase ] ;
  sh:not [ sh:class tagteam:DiscourseReferent ] ;
  
  sh:property [
    sh:path tagteam:mentionId ;
    sh:maxCount 0 ;
    sh:message "EventDescription MUST NOT have mentionId (Tier 1 property)"
  ] .
```

---

### 7.2 Shape: QualityAssertionShape

**Target:** All nodes with `@type` including `tagteam:QualityAssertion`

```turtle
ttshacl:QualityAssertionShape
  a sh:NodeShape ;
  sh:targetClass tagteam:QualityAssertion ;
  sh:name "Quality Assertion Shape" ;
  
  sh:property [
    sh:path tagteam:assertedQuality ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "QualityAssertion MUST have assertedQuality"
  ] ;
  
  sh:property [
    sh:path tagteam:assertionSubject ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "QualityAssertion MUST have assertionSubject"
  ] ;
  
  sh:property [
    sh:path tagteam:describedBy ;
    sh:maxCount 0 ;
    sh:message "QualityAssertion MUST NOT have describedBy"
  ] .
```

---

### 7.3 Shape: StructuralAssertionShape

**Target:** All nodes with `@type` including `tagteam:StructuralAssertion`

```turtle
ttshacl:StructuralAssertionShape
  a sh:NodeShape ;
  sh:targetClass tagteam:StructuralAssertion ;
  sh:name "Structural Assertion Shape" ;
  
  sh:property [
    sh:path tagteam:hasSubject ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "StructuralAssertion MUST have hasSubject"
  ] ;
  
  sh:property [
    sh:path tagteam:hasObject ;
    sh:minCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "StructuralAssertion MUST have at least one hasObject"
  ] .
```

---

### 7.4 Shape: PlanSpecificationShape

**Target:** All nodes with `@type` including `tagteam:PlanSpecification`

```turtle
ttshacl:PlanSpecificationShape
  a sh:NodeShape ;
  sh:targetClass tagteam:PlanSpecification ;
  sh:name "Plan Specification Shape" ;
  
  sh:property [
    sh:path tagteam:prescribedActType ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "PlanSpecification MUST have prescribedActType"
  ] ;
  
  sh:property [
    sh:path tagteam:prescribedAgent ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "PlanSpecification MUST have prescribedAgent"
  ] .
```

---

### 7.5 Shape: DirectiveICEShape

**Target:** All nodes with `@type` including `tagteam:DirectiveInformationContentEntity`

```turtle
ttshacl:DirectiveICEShape
  a sh:NodeShape ;
  sh:targetClass tagteam:DirectiveInformationContentEntity ;
  sh:name "Directive ICE Shape" ;
  
  sh:property [
    sh:path tagteam:modalMarker ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:in ( "shall" "must" "should" "may" "can" "will" ) ;
    sh:message "DICE MUST have modalMarker from controlled vocabulary"
  ] ;
  
  sh:property [
    sh:path tagteam:deonticCategory ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "DICE MUST have deonticCategory"
  ] ;
  
  sh:property [
    sh:path tagteam:prescribes ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "DICE MUST prescribe a PlanSpecification"
  ] .
```

---

## 8. Tier 2: Process & Role Shapes

### 8.1 Shape: IntentionalActShape

**Target:** All nodes typed as `cco:IntentionalAct` (explicit type-based, not string heuristic)

**CHANGE in v1.3:** Replaced string-based ParsingAct exclusion with explicit type marker.

#### 8.1.1 Exclusion Strategy (v1.3.1 Update)

The parser SHOULD mark system-generated acts with `tagteam:systemGenerated true`. The shape excludes these explicitly, with a fallback heuristic when the property is absent.

```turtle
ttshacl:IntentionalActShape
  a sh:NodeShape ;
  sh:target [
    a sh:SPARQLTarget ;
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX cco: <https://www.commoncoreontologies.org/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      SELECT ?this
      WHERE {
        ?this a cco:IntentionalAct .
        OPTIONAL { ?this rdfs:label ?label }
        # Exclude system-generated acts (explicit property OR fallback heuristic)
        FILTER (
          NOT EXISTS { ?this tagteam:systemGenerated true }
          && !CONTAINS(LCASE(COALESCE(STR(?label), "")), "parsing")
          && !CONTAINS(STR(?this), "Parsing")
          && !CONTAINS(STR(?this), "System")
        )
      }
    """
  ] ;
  sh:name "Intentional Act Shape" ;
  sh:description "Validates Layer 2.2 processes" ;
  
  sh:property [
    sh:path tagteam:actualityStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:in ( tagteam:Actual tagteam:Hypothetical ) ;
    sh:message "IntentionalAct MUST have actualityStatus from controlled vocabulary"
  ] ;
  
  sh:property [
    sh:path tagteam:describedBy ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "IntentionalAct MUST be describedBy an EventDescription"
  ] ;
  
  # Tier separation
  sh:not [ sh:class tagteam:VerbPhrase ] ;
  sh:not [ sh:class tagteam:DiscourseReferent ] ;
  
  sh:property [
    sh:path tagteam:mentionId ;
    sh:maxCount 0 ;
    sh:message "IntentionalAct MUST NOT have mentionId"
  ] ;
  
  sh:property [
    sh:path tagteam:denotesType ;
    sh:maxCount 0 ;
    sh:message "IntentionalAct MUST NOT have denotesType"
  ] .
```

---

### 8.2 Shape: AgentRoleShape

```turtle
ttshacl:AgentRoleShape
  a sh:NodeShape ;
  sh:targetClass cco:AgentRole ;
  sh:name "Agent Role Shape" ;
  
  sh:property [
    sh:path bfo:BFO_0000052 ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "AgentRole MUST inhere in one entity"
  ] ;
  
  sh:property [
    sh:path bfo:BFO_0000054 ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "AgentRole MUST be realized in one process"
  ] .
```

---

### 8.3 Shape: PatientRoleShape

```turtle
ttshacl:PatientRoleShape
  a sh:NodeShape ;
  sh:targetClass cco:PatientRole ;
  sh:name "Patient Role Shape" ;
  
  sh:property [
    sh:path bfo:BFO_0000052 ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "PatientRole MUST inhere in one entity"
  ] ;
  
  sh:property [
    sh:path bfo:BFO_0000054 ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "PatientRole MUST be realized in one process"
  ] .
```

---

### 8.4 Shape: InstrumentalRoleShape

```turtle
ttshacl:InstrumentalRoleShape
  a sh:NodeShape ;
  sh:targetClass tagteam:InstrumentalRole ;
  sh:name "Instrumental Role Shape" ;
  
  sh:property [
    sh:path bfo:BFO_0000052 ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "InstrumentalRole MUST inhere in one entity"
  ] ;
  
  sh:property [
    sh:path bfo:BFO_0000054 ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "InstrumentalRole MUST be realized in one process"
  ] .
```

---

## 9. Tier 2: Entity Shapes

### 9.1 Shape: EntityShape

**CHANGE in v1.3:** Replaced heuristic IRI pattern matching with explicit type-based targeting.

**Rationale:** The v1.2 shape used `FILTER(CONTAINS(STR(?this), "Entity_"))` which:
- Fails for valid entities with different naming conventions
- Passes for invalid nodes that happen to match the pattern

**New approach:** Target entities by their explicit BFO/CCO types.

```turtle
ttshacl:EntityShape
  a sh:NodeShape ;
  sh:target [
    a sh:SPARQLTarget ;
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX cco: <https://www.commoncoreontologies.org/>
      PREFIX bfo: <http://purl.obolibrary.org/obo/>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      SELECT ?this
      WHERE {
        ?this a owl:NamedIndividual .
        # Must be an independent continuant (BFO) or CCO entity type
        {
          { ?this a bfo:BFO_0000040 }  # material entity
          UNION { ?this a cco:Person }
          UNION { ?this a cco:Organization }
          UNION { ?this a cco:Artifact }
          UNION { ?this a cco:GeospatialRegion }
        }
        # Exclude ICEs and Tier 1
        FILTER NOT EXISTS { ?this a tagteam:DiscourseReferent }
        FILTER NOT EXISTS { ?this a tagteam:EventDescription }
        FILTER NOT EXISTS { ?this a cco:InformationContentEntity }
      }
    """
  ] ;
  sh:name "Entity Shape" ;
  sh:description "Validates Layer 2.2 extracted entities" ;
  
  sh:property [
    sh:path rdfs:label ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "Entity MUST have exactly one rdfs:label"
  ] ;
  
  sh:property [
    sh:path tagteam:is_subject_of ;
    sh:minCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "Entity MUST link back to at least one DiscourseReferent"
  ] .
```

---

### 9.2 Entity Disjointness Rule

**CHANGE in v1.3:** Replaced opaque "always-fail" SPARQL with explicit constraint.

```turtle
ttshacl:EntityDisjointnessRule
  a sh:NodeShape ;
  sh:targetClass cco:Person ;
  sh:name "Person-Organization Disjointness" ;
  sh:severity sh:Violation ;
  
  sh:not [
    sh:class cco:Organization
  ] ;
  sh:message "Entity MUST NOT be both Person and Organization (BFO disjointness)" .
```

---

## 10. Provenance Shapes

### 10.1 Shape: InformationBearingEntityShape

```turtle
ttshacl:InformationBearingEntityShape
  a sh:NodeShape ;
  sh:targetClass cco:InformationBearingEntity ;
  sh:name "Information Bearing Entity Shape" ;
  
  sh:property [
    sh:path cco:has_text_value ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "IBE MUST have exactly one has_text_value"
  ] ;
  
  sh:property [
    sh:path tagteam:received_at ;
    sh:datatype xsd:dateTime ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "IBE MUST have exactly one received_at timestamp"
  ] .
```

---

### 10.2 Shape: ProvenanceChainShape

```turtle
ttshacl:ProvenanceChainShape
  a sh:NodeShape ;
  sh:targetClass tagteam:DiscourseReferent ;
  sh:name "Provenance Chain Shape" ;
  
  sh:property [
    sh:path tagteam:is_concretized_by ;
    sh:minCount 1 ;
    sh:class cco:InformationBearingEntity ;
    sh:message "DiscourseReferent MUST trace to source IBE"
  ] .
```

---

## 11. Cross-Tier Integrity Constraints

### 11.1 Tier Separation Rule

```turtle
ttshacl:TierSeparationRule
  a sh:NodeShape ;
  sh:target [
    a sh:SPARQLTarget ;
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX cco: <https://www.commoncoreontologies.org/>
      SELECT ?this
      WHERE {
        ?this a tagteam:VerbPhrase .
        ?this a cco:IntentionalAct .
      }
    """
  ] ;
  sh:name "Tier Separation Rule" ;
  sh:severity sh:Violation ;
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "Node MUST NOT be both VerbPhrase (Tier 1) and IntentionalAct (Tier 2)" ;
    sh:select "SELECT $this WHERE { }"
  ] .
```

---

### 11.2 Denotation Consistency Rule

```turtle
ttshacl:DenotationConsistencyRule
  a sh:NodeShape ;
  sh:targetClass tagteam:VerbPhrase ;
  sh:name "Denotation Consistency Rule" ;
  sh:severity sh:Violation ;
  
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "VerbPhrase denotesType does not match is_about target type" ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      SELECT $this ?denotesType ?targetType
      WHERE {
        $this tagteam:denotesType ?denotesType .
        $this tagteam:is_about ?target .
        ?target a ?targetType .
        FILTER(?targetType IN (
          tagteam:EventDescription,
          tagteam:QualityAssertion,
          tagteam:StructuralAssertion,
          tagteam:DirectiveInformationContentEntity
        ))
        FILTER(
          (?denotesType = "EventDescription" && ?targetType != tagteam:EventDescription) ||
          (?denotesType = "Directive" && ?targetType != tagteam:DirectiveInformationContentEntity) ||
          (?denotesType = "Quality" && ?targetType != tagteam:QualityAssertion) ||
          (?denotesType = "Structure" && ?targetType != tagteam:StructuralAssertion)
        )
      }
    """
  ] .
```

---

### 11.3 Stative Exclusion Rule

```turtle
ttshacl:StativeExclusionRule
  a sh:NodeShape ;
  sh:target [
    a sh:SPARQLTarget ;
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      SELECT ?this
      WHERE {
        ?vp tagteam:is_about ?this .
        { ?this a tagteam:QualityAssertion }
        UNION { ?this a tagteam:StructuralAssertion }
      }
    """
  ] ;
  sh:name "Stative Exclusion Rule" ;
  sh:severity sh:Violation ;
  
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "Stative assertion MUST NOT coexist with IntentionalAct from same VP" ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX cco: <https://www.commoncoreontologies.org/>
      SELECT $this ?act
      WHERE {
        ?vp tagteam:is_about $this .
        ?vp tagteam:is_about ?act .
        ?act a cco:IntentionalAct .
        FILTER(?act != $this)
      }
    """
  ] .
```

---

### 11.4 Role Realization Target Rule

```turtle
ttshacl:RoleRealizationTargetRule
  a sh:NodeShape ;
  sh:target [
    a sh:SPARQLTarget ;
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:select """
      PREFIX cco: <https://www.commoncoreontologies.org/>
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      SELECT ?this
      WHERE {
        { ?this a cco:AgentRole }
        UNION { ?this a cco:PatientRole }
        UNION { ?this a tagteam:InstrumentalRole }
      }
    """
  ] ;
  sh:name "Role Realization Target Rule" ;
  sh:severity sh:Violation ;
  
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "Role realized_in MUST point to IntentionalAct, NOT EventDescription" ;
    sh:select """
      PREFIX bfo: <http://purl.obolibrary.org/obo/>
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      SELECT $this ?target
      WHERE {
        $this bfo:BFO_0000054 ?target .
        ?target a tagteam:EventDescription .
      }
    """
  ] .
```

---

### 11.5 Negation-Realization Consistency Rule

```turtle
ttshacl:NegationRealizationConsistencyRule
  a sh:NodeShape ;
  sh:targetClass tagteam:VerbPhrase ;
  sh:name "Negation-Realization Consistency Rule" ;
  sh:severity sh:Violation ;
  
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "Negated VerbPhrase points to Realized EventDescription - should be Unrealized" ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT $this ?ed ?status
      WHERE {
        $this tagteam:negated true .
        $this tagteam:is_about ?ed .
        ?ed a tagteam:EventDescription .
        ?ed tagteam:realizationStatus ?status .
        FILTER(
          ?status = tagteam:Realized ||
          STR(?status) = "Realized" ||
          STR(?status) = "http://tagteam.fandaws.org/ontology/Realized"
        )
      }
    """
  ] .
```

---

### 11.6 Negated No Process Rule

```turtle
ttshacl:NegatedNoProcessRule
  a sh:NodeShape ;
  sh:targetClass tagteam:VerbPhrase ;
  sh:name "Negated No Process Rule" ;
  sh:severity sh:Violation ;
  
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "Negated VerbPhrase linked to IntentionalAct - negated events have no process" ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX cco: <https://www.commoncoreontologies.org/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      SELECT $this ?act
      WHERE {
        $this tagteam:negated true .
        $this tagteam:is_about ?ed .
        ?act tagteam:describedBy ?ed .
        ?act a cco:IntentionalAct .
        OPTIONAL { ?act rdfs:label ?label }
        # Exclude system-generated acts (v1.3.1 fallback)
        FILTER (
          NOT EXISTS { ?act tagteam:systemGenerated true }
          && !CONTAINS(LCASE(COALESCE(STR(?label), "")), "parsing")
          && !CONTAINS(STR(?act), "Parsing")
          && !CONTAINS(STR(?act), "System")
        )
      }
    """
  ] .
```

---

### 11.7 Instrument Consistency Rule

**FIX in v1.3:** This rule was missing from Appendix A in v1.2.

```turtle
ttshacl:InstrumentConsistencyRule
  a sh:NodeShape ;
  sh:targetClass tagteam:EventDescription ;
  sh:severity sh:Warning ;
  sh:name "Instrument Consistency Rule" ;
  
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "EventDescription has instrument but no InstrumentalRole found" ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX bfo: <http://purl.obolibrary.org/obo/>
      SELECT $this ?instrument
      WHERE {
        $this tagteam:instrument ?instrument .
        FILTER NOT EXISTS {
          ?role a tagteam:InstrumentalRole .
          ?role bfo:BFO_0000052 ?instrument .
        }
      }
    """
  ] .
```

---

### 11.8 Canonical Field Consistency Rule

**NEW in v1.3:** Enforces §4.2 invariants.

```turtle
ttshacl:LemmaActTypeConsistencyRule
  a sh:NodeShape ;
  sh:targetClass tagteam:VerbPhrase ;
  sh:severity sh:Warning ;
  sh:name "Lemma-ActType Consistency Rule" ;
  
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "VerbPhrase.lemma does not match EventDescription.actType" ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      SELECT $this ?lemma ?actType
      WHERE {
        $this tagteam:lemma ?lemma .
        $this tagteam:is_about ?ed .
        ?ed a tagteam:EventDescription .
        ?ed tagteam:actType ?actType .
        FILTER(?lemma != ?actType)
      }
    """
  ] .
```

---

## 12. Anti-Pattern Detection

### 12.1 Ghost Act Detection

```turtle
ttshacl:GhostActDetection
  a sh:NodeShape ;
  sh:target [
    a sh:SPARQLTarget ;
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:select """
      PREFIX cco: <https://www.commoncoreontologies.org/>
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      SELECT ?this
      WHERE {
        ?this a cco:IntentionalAct .
        OPTIONAL { ?this rdfs:label ?label }
        # Exclude system-generated acts (v1.3.1 fallback)
        FILTER (
          NOT EXISTS { ?this tagteam:systemGenerated true }
          && !CONTAINS(LCASE(COALESCE(STR(?label), "")), "parsing")
          && !CONTAINS(STR(?this), "Parsing")
          && !CONTAINS(STR(?this), "System")
        )
      }
    """
  ] ;
  sh:name "Ghost Act Detection" ;
  sh:severity sh:Violation ;
  
  sh:property [
    sh:path tagteam:describedBy ;
    sh:minCount 1 ;
    sh:message "IntentionalAct without describedBy is a ghost act"
  ] .
```

---

### 12.2 Orphan EventDescription Detection

```turtle
ttshacl:OrphanEventDescriptionDetection
  a sh:NodeShape ;
  sh:targetClass tagteam:EventDescription ;
  sh:name "Orphan EventDescription Detection" ;
  sh:severity sh:Warning ;
  
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "Realized EventDescription not linked from any IntentionalAct" ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX cco: <https://www.commoncoreontologies.org/>
      SELECT $this
      WHERE {
        $this a tagteam:EventDescription .
        $this tagteam:realizationStatus ?status .
        FILTER(
          ?status = tagteam:Realized ||
          STR(?status) = "Realized" ||
          STR(?status) = "http://tagteam.fandaws.org/ontology/Realized"
        )
        FILTER NOT EXISTS {
          ?act tagteam:describedBy $this .
          ?act a cco:IntentionalAct .
        }
      }
    """
  ] .
```

---

### 12.3 Tier Pollution Detection

```turtle
ttshacl:TierPollutionDetection
  a sh:NodeShape ;
  sh:target [
    a sh:SPARQLTarget ;
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:select """
      PREFIX cco: <https://www.commoncoreontologies.org/>
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      SELECT ?this
      WHERE {
        { ?this a cco:IntentionalAct }
        UNION { ?this a tagteam:EventDescription }
      }
    """
  ] ;
  sh:name "Tier Pollution Detection" ;
  sh:severity sh:Violation ;
  
  sh:property [
    sh:path tagteam:mentionId ;
    sh:maxCount 0 ;
    sh:message "Tier 2 node has Tier 1 property mentionId"
  ] ;
  
  sh:property [
    sh:path tagteam:sourceText ;
    sh:maxCount 0 ;
    sh:message "Tier 2 node has Tier 1 property sourceText"
  ] .
```

---

### 12.4 Deprecated Pattern Detection

```turtle
ttshacl:DeprecatedDenotesTypeDetection
  a sh:NodeShape ;
  sh:targetClass tagteam:VerbPhrase ;
  sh:name "Deprecated denotesType Detection" ;
  sh:severity sh:Warning ;
  
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "denotesType='Event' is DEPRECATED - migrate to 'EventDescription'" ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      SELECT $this ?denotesType
      WHERE {
        $this tagteam:denotesType ?denotesType .
        FILTER(?denotesType = "Event")
      }
    """
  ] .
```

---

## 13. Severity Classification

| Severity | Meaning | Action |
|----------|---------|--------|
| `sh:Violation` | MUST fix — breaks spec compliance | Fail validation |
| `sh:Warning` | SHOULD fix — consistency or migration issue | Log warning |
| `sh:Info` | MAY fix — suggestion for improvement | Informational |

### 13.1 Severity Summary

| Shape | Severity | Conformance Level |
|-------|----------|-------------------|
| DiscourseReferentShape | Violation | Required |
| VerbPhraseShape | Violation | Required |
| EventDescriptionShape | Violation | Required |
| QualityAssertionShape | Violation | Required |
| StructuralAssertionShape | Violation | Required |
| PlanSpecificationShape | Violation | Required |
| DirectiveICEShape | Violation | Required |
| IntentionalActShape | Violation | Required |
| AgentRoleShape | Violation | Required |
| PatientRoleShape | Violation | Required |
| InstrumentalRoleShape | Violation | Recommended |
| EntityShape | Violation | Required |
| EntityDisjointnessRule | Violation | Required |
| IBEShape | Violation | Required |
| ProvenanceChainShape | Violation | Required |
| TierSeparationRule | Violation | Required |
| DenotationConsistencyRule | Violation | Required |
| StativeExclusionRule | Violation | Required |
| RoleRealizationTargetRule | Violation | Required |
| NegationRealizationConsistencyRule | Violation | Recommended |
| NegatedNoProcessRule | Violation | Recommended |
| InstrumentConsistencyRule | Warning | Advisory |
| LemmaActTypeConsistencyRule | Warning | Advisory |
| GhostActDetection | Violation | Required |
| OrphanEventDescriptionDetection | Warning | Advisory |
| TierPollutionDetection | Violation | Required |
| DeprecatedDenotesTypeDetection | Warning | Advisory |

---

## 14. Validation Matrix

### 14.1 Coverage by Workstream

| Shape | WS-A | WS-B | WS-C | WS-D | RDM |
|-------|------|------|------|------|-----|
| DiscourseReferentShape | ✓ | ✓ | ✓ | ✓ | ✓ |
| VerbPhraseShape | ✓ | ✓ | ✓ | ✓ | ✓ |
| EventDescriptionShape | | ✓ | ✓ | ✓ | |
| QualityAssertionShape | ✓ | | | | |
| StructuralAssertionShape | ✓ | | | | |
| PlanSpecificationShape | | | | | ✓ |
| DirectiveICEShape | | | | | ✓ |
| IntentionalActShape | | | ✓ | | |
| AgentRoleShape | | | ✓ | | |
| PatientRoleShape | | | ✓ | | |
| InstrumentalRoleShape | | | ✓ | | |
| NegationRealizationConsistencyRule | | ✓ | | | |
| NegatedNoProcessRule | | ✓ | | | |

### 14.2 Bug Detection Coverage

| Bug | Detecting Shape |
|-----|-----------------|
| Tier leakage (VP+IA) | TierSeparationRule, IntentionalActShape |
| denotesType mismatch | DenotationConsistencyRule, DeprecatedDenotesTypeDetection |
| Intransitive agent missing | EventDescriptionShape (participant coverage) |
| Instrument role missing | InstrumentalRoleShape, InstrumentConsistencyRule |
| Ghost act | GhostActDetection, StativeExclusionRule |
| Negation-realization mismatch | NegationRealizationConsistencyRule |
| Canonical field drift | LemmaActTypeConsistencyRule |

---

## 15. Conformance Levels

**NEW in v1.3:** Distinguishes required, recommended, and advisory rules.

### 15.1 Definitions

| Level | Meaning | Validation Behavior |
|-------|---------|---------------------|
| **Required** | MUST pass for spec conformance | Fail on any violation |
| **Recommended** | SHOULD pass for production quality | Warn on violation |
| **Advisory** | MAY pass for best practices | Log for review |

### 15.2 Conformance Profiles

#### Profile: Minimal Conformance

All **Required** shapes MUST pass. Suitable for development/testing.

```yaml
profile: minimal
required_shapes:
  - DiscourseReferentShape
  - VerbPhraseShape
  - EventDescriptionShape
  - QualityAssertionShape
  - StructuralAssertionShape
  - PlanSpecificationShape
  - DirectiveICEShape
  - IntentionalActShape
  - AgentRoleShape
  - PatientRoleShape
  - EntityShape
  - EntityDisjointnessRule
  - IBEShape
  - ProvenanceChainShape
  - TierSeparationRule
  - DenotationConsistencyRule
  - StativeExclusionRule
  - RoleRealizationTargetRule
  - GhostActDetection
  - TierPollutionDetection
```

#### Profile: Production Conformance

All **Required** and **Recommended** shapes MUST pass.

```yaml
profile: production
extends: minimal
additional_shapes:
  - InstrumentalRoleShape
  - NegationRealizationConsistencyRule
  - NegatedNoProcessRule
```

#### Profile: WS-B-READY (v1.3.1 Addition)

**Use this profile until WS-B (Negation) is implemented.** Skips negation-specific shapes.

```yaml
profile: ws-b-ready
extends: minimal
skip_shapes:
  - NegationRealizationConsistencyRule  # Deferred: WS-B not implemented
  - NegatedNoProcessRule                 # Deferred: WS-B not implemented
additional_shapes:
  - InstrumentalRoleShape
```

**Developer Note:** The WS-B shapes (`NegationRealizationConsistencyRule`, `NegatedNoProcessRule`) are architecturally correct and remain in the spec for forward compatibility. Use `ws-b-ready` profile until TagTeam implements:
1. `tagteam:hasNegation` property on VerbPhrase
2. Negation marker detection ("not", "never", "n't")
3. Automatic `realizationStatus: Unrealized` for negated predicates

#### Profile: Strict Conformance

All shapes MUST pass (including advisory as warnings).

```yaml
profile: strict
extends: production
advisory_as_warning: true
additional_shapes:
  - InstrumentConsistencyRule
  - LemmaActTypeConsistencyRule
  - OrphanEventDescriptionDetection
  - DeprecatedDenotesTypeDetection
```

---

## 16. Implementation Notes

### 16.1 Validation Execution

```bash
# Apache Jena
shacl validate --shapes tagteam-shacl-v1.3.ttl --data graph.jsonld

# pyshacl
python -m pyshacl -s tagteam-shacl-v1.3.ttl -df json-ld graph.jsonld
```

### 16.2 JSON-LD Preprocessing

```javascript
const expanded = await jsonld.expand(compactGraph);
const nquads = await jsonld.toRDF(expanded, { format: 'application/n-quads' });
```

### 16.3 System-Generated Act Marking

**v1.3.1 RELAXATION:** The parser SHOULD mark system acts. Validators MUST implement a fallback heuristic when the property is absent.

```json
{
  "@id": "inst:ParsingAct_abc123",
  "@type": ["IntentionalAct"],
  "tagteam:systemGenerated": true,
  "rdfs:label": "Semantic parsing act"
}
```

**Fallback Heuristic (when `systemGenerated` absent):**
1. Check if `rdfs:label` contains "parsing" (case-insensitive)
2. Check if `@id` IRI contains "Parsing" or "System"
3. If either matches, treat as system-generated

**Implementation Note:** The SHACL shapes use `FILTER NOT EXISTS { ?this tagteam:systemGenerated true }` which naturally passes when the property is absent. The fallback heuristic is implemented as an additional SPARQL check:

```sparql
FILTER (
  NOT EXISTS { ?this tagteam:systemGenerated true }
  && !CONTAINS(LCASE(STR(?label)), "parsing")
  && !CONTAINS(STR(?this), "Parsing")
  && !CONTAINS(STR(?this), "System")
)
```

### 16.4 Warning Threshold Configuration

```yaml
warning_thresholds:
  InstrumentConsistencyRule: 0.50
  LemmaActTypeConsistencyRule: 0.10
  DeprecatedDenotesTypeDetection: 0.10
```

### 16.5 Canonical Namespaces (v1.3.1)

**CRITICAL:** These namespaces are synchronized with the TagTeam codebase and MUST be used:

| Prefix | Canonical IRI | Notes |
|--------|---------------|-------|
| `tagteam:` | `http://tagteam.fandaws.org/ontology/` | Note: `http` (not `https`), trailing `/` (not `#`) |
| `cco:` | `https://www.commoncoreontologies.org/` | Note: `https`, current CCO namespace |
| `ttshacl:` | `http://tagteam.fandaws.org/shacl/` | SHACL shapes namespace |
| `bfo:` | `http://purl.obolibrary.org/obo/` | OBO Foundry BFO 2020 |

**Common Mistakes:**
- ❌ `https://tagteam.ai/ontology#` (old marketing domain)
- ❌ `http://www.ontologyrepository.com/CommonCoreOntologies/` (deprecated CCO namespace)
- ❌ `http://tagteam.fandaws.com/ontology/` (`.com` vs `.org`)

### 16.6 Implementation Approach (v1.3.1)

TagTeam supports **dual validation modes** to satisfy both external consumers and in-pipeline requirements:

#### Option A: External SHACL Validation (CI/CD)

Use the canonical TTL file with standard validators:

```bash
# Apache Jena SHACL
shacl validate --shapes tagteam-shacl-v1.3.1.ttl --data graph.jsonld

# pyshacl (Python)
python -m pyshacl -s tagteam-shacl-v1.3.1.ttl -df json-ld graph.jsonld

# rdf-validate-shacl (Node.js)
npx rdf-validate-shacl tagteam-shacl-v1.3.1.ttl graph.jsonld
```

**Use case:** CI/CD pipelines, external consumers, formal conformance testing.

#### Option B: JavaScript In-Pipeline Validation

The existing `SHMLValidator.js` implements equivalent constraints programmatically:

```javascript
import { validateGraph } from './SHMLValidator.js';

const result = validateGraph(jsonldGraph, {
  profile: 'ws-b-ready',  // or 'minimal', 'production', 'strict'
  warnOnAdvisory: true
});

if (!result.valid) {
  result.violations.forEach(v => console.error(v.message));
}
```

**Use case:** Browser execution, real-time feedback, test suites.

#### Option C: Both (Recommended)

- **Development:** JavaScript validator for fast iteration
- **CI/CD:** pyshacl/Jena for formal validation
- **Release:** Both must pass

```yaml
# .github/workflows/validate.yml
jobs:
  validate:
    steps:
      - run: npm test  # JS validator
      - run: pyshacl -s tagteam-shacl-v1.3.1.ttl -df json-ld output/*.jsonld
```

### 16.7 Edge-Canonical Compliance

Per the FNSR Edge-Canonical First Principle, the JavaScript validator:
- Runs unmodified in browser or Node.js
- Requires no external infrastructure
- Uses JSON-LD as canonical representation
- Works offline-first

---

## Appendix A: Complete SHACL Turtle

```turtle
# =============================================================================
# TagTeam SHACL Validation Shapes v1.3.1
# Canonical Namespace: http://tagteam.fandaws.org/ontology/
# Generated: 2026-03-30
# =============================================================================

@prefix sh:      <http://www.w3.org/ns/shacl#> .
@prefix xsd:     <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:    <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:     <http://www.w3.org/2002/07/owl#> .
@prefix bfo:     <http://purl.obolibrary.org/obo/> .
@prefix cco:     <https://www.commoncoreontologies.org/> .
@prefix tagteam: <http://tagteam.fandaws.org/ontology/> .
@prefix ttshacl: <http://tagteam.fandaws.org/shacl/> .

# =============================================================================
# PREFIX DECLARATIONS FOR SPARQL PORTABILITY
# =============================================================================

ttshacl:PrefixDeclarations
  a owl:Ontology ;
  sh:declare [
    sh:prefix "tagteam" ;
    sh:namespace "http://tagteam.fandaws.org/ontology/"^^xsd:anyURI
  ] ;
  sh:declare [
    sh:prefix "cco" ;
    sh:namespace "https://www.commoncoreontologies.org/"^^xsd:anyURI
  ] ;
  sh:declare [
    sh:prefix "bfo" ;
    sh:namespace "http://purl.obolibrary.org/obo/"^^xsd:anyURI
  ] ;
  sh:declare [
    sh:prefix "rdfs" ;
    sh:namespace "http://www.w3.org/2000/01/rdf-schema#"^^xsd:anyURI
  ] ;
  sh:declare [
    sh:prefix "xsd" ;
    sh:namespace "http://www.w3.org/2001/XMLSchema#"^^xsd:anyURI
  ] .

# =============================================================================
# TIER 1: DISCOURSE LAYER SHAPES
# =============================================================================

ttshacl:DiscourseReferentShape
  a sh:NodeShape ;
  sh:targetClass tagteam:DiscourseReferent ;
  sh:name "Discourse Referent Shape" ;
  
  sh:property [
    sh:path tagteam:mentionId ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "DiscourseReferent MUST have exactly one mentionId"
  ] ;
  
  sh:property [
    sh:path rdfs:label ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "DiscourseReferent MUST have exactly one rdfs:label"
  ] ;
  
  sh:property [
    sh:path tagteam:denotesType ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:in ( "Person" "Organization" "Entity" "Location" "EventDescription" "Event" "Directive" "Quality" "Structure" "Role" ) ;
    sh:message "DiscourseReferent MUST have denotesType from controlled vocabulary"
  ] ;
  
  sh:property [
    sh:path tagteam:is_about ;
    sh:minCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "DiscourseReferent MUST have at least one is_about"
  ] ;
  
  sh:property [
    sh:path tagteam:is_concretized_by ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "DiscourseReferent MUST link to source IBE"
  ] ;
  
  sh:not [ sh:class cco:IntentionalAct ] ;
  sh:not [ sh:class cco:Role ] ;
  sh:not [ sh:class tagteam:EventDescription ] .


ttshacl:VerbPhraseShape
  a sh:NodeShape ;
  sh:targetClass tagteam:VerbPhrase ;
  sh:name "Verb Phrase Shape" ;
  
  sh:property [
    sh:path tagteam:lemma ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "VerbPhrase MUST have exactly one lemma"
  ] ;
  
  sh:property [
    sh:path tagteam:verb ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "VerbPhrase MUST have exactly one verb"
  ] ;
  
  sh:property [
    sh:path tagteam:is_about ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "VerbPhrase MUST have exactly one is_about"
  ] ;
  
  sh:property [
    sh:path tagteam:modalMarker ;
    sh:in ( "shall" "must" "should" "may" "can" "will" ) ;
    sh:message "modalMarker must be from controlled vocabulary"
  ] ;
  
  sh:not [ sh:class cco:IntentionalAct ] ;
  sh:not [ sh:class bfo:BFO_0000015 ] ;
  sh:not [ sh:class tagteam:EventDescription ] .

# =============================================================================
# TIER 2: ICE SHAPES
# =============================================================================

ttshacl:EventDescriptionShape
  a sh:NodeShape ;
  sh:targetClass tagteam:EventDescription ;
  sh:name "Event Description Shape" ;
  
  sh:property [
    sh:path tagteam:actType ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "EventDescription MUST have exactly one actType"
  ] ;
  
  sh:property [
    sh:path tagteam:realizationStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "EventDescription MUST have exactly one realizationStatus"
  ] ;
  
  sh:or (
    [ sh:property [ sh:path tagteam:agent ; sh:minCount 1 ] ]
    [ sh:property [ sh:path tagteam:patient ; sh:minCount 1 ] ]
  ) ;
  
  sh:property [
    sh:path tagteam:instrument ;
    sh:nodeKind sh:IRI
  ] ;
  
  sh:not [ sh:class tagteam:VerbPhrase ] ;
  sh:not [ sh:class tagteam:DiscourseReferent ] ;
  
  sh:property [
    sh:path tagteam:mentionId ;
    sh:maxCount 0 ;
    sh:message "EventDescription MUST NOT have mentionId"
  ] .


ttshacl:QualityAssertionShape
  a sh:NodeShape ;
  sh:targetClass tagteam:QualityAssertion ;
  sh:name "Quality Assertion Shape" ;
  
  sh:property [
    sh:path tagteam:assertedQuality ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "QualityAssertion MUST have assertedQuality"
  ] ;
  
  sh:property [
    sh:path tagteam:assertionSubject ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "QualityAssertion MUST have assertionSubject"
  ] .


ttshacl:StructuralAssertionShape
  a sh:NodeShape ;
  sh:targetClass tagteam:StructuralAssertion ;
  sh:name "Structural Assertion Shape" ;
  
  sh:property [
    sh:path tagteam:hasSubject ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "StructuralAssertion MUST have hasSubject"
  ] ;
  
  sh:property [
    sh:path tagteam:hasObject ;
    sh:minCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "StructuralAssertion MUST have at least one hasObject"
  ] .


ttshacl:PlanSpecificationShape
  a sh:NodeShape ;
  sh:targetClass tagteam:PlanSpecification ;
  sh:name "Plan Specification Shape" ;
  
  sh:property [
    sh:path tagteam:prescribedActType ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "PlanSpecification MUST have prescribedActType"
  ] ;
  
  sh:property [
    sh:path tagteam:prescribedAgent ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "PlanSpecification MUST have prescribedAgent"
  ] .


ttshacl:DirectiveICEShape
  a sh:NodeShape ;
  sh:targetClass tagteam:DirectiveInformationContentEntity ;
  sh:name "Directive ICE Shape" ;
  
  sh:property [
    sh:path tagteam:modalMarker ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:in ( "shall" "must" "should" "may" "can" "will" ) ;
    sh:message "DICE MUST have modalMarker from controlled vocabulary"
  ] ;
  
  sh:property [
    sh:path tagteam:prescribes ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "DICE MUST prescribe a PlanSpecification"
  ] .

# =============================================================================
# TIER 2: PROCESS & ROLE SHAPES
# =============================================================================

ttshacl:IntentionalActShape
  a sh:NodeShape ;
  sh:target [
    a sh:SPARQLTarget ;
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX cco: <https://www.commoncoreontologies.org/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      SELECT ?this
      WHERE {
        ?this a cco:IntentionalAct .
        OPTIONAL { ?this rdfs:label ?label }
        # Exclude system-generated acts (explicit property OR fallback heuristic)
        FILTER (
          NOT EXISTS { ?this tagteam:systemGenerated true }
          && !CONTAINS(LCASE(COALESCE(STR(?label), "")), "parsing")
          && !CONTAINS(STR(?this), "Parsing")
          && !CONTAINS(STR(?this), "System")
        )
      }
    """
  ] ;
  sh:name "Intentional Act Shape" ;
  
  sh:property [
    sh:path tagteam:actualityStatus ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "IntentionalAct MUST have actualityStatus"
  ] ;
  
  sh:property [
    sh:path tagteam:describedBy ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "IntentionalAct MUST have describedBy"
  ] ;
  
  sh:not [ sh:class tagteam:VerbPhrase ] ;
  sh:not [ sh:class tagteam:DiscourseReferent ] ;
  
  sh:property [
    sh:path tagteam:mentionId ;
    sh:maxCount 0 ;
    sh:message "IntentionalAct MUST NOT have mentionId"
  ] .


ttshacl:AgentRoleShape
  a sh:NodeShape ;
  sh:targetClass cco:AgentRole ;
  sh:name "Agent Role Shape" ;
  
  sh:property [
    sh:path bfo:BFO_0000052 ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "AgentRole MUST inhere in one entity"
  ] ;
  
  sh:property [
    sh:path bfo:BFO_0000054 ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "AgentRole MUST be realized in one process"
  ] .


ttshacl:PatientRoleShape
  a sh:NodeShape ;
  sh:targetClass cco:PatientRole ;
  sh:name "Patient Role Shape" ;
  
  sh:property [
    sh:path bfo:BFO_0000052 ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "PatientRole MUST inhere in one entity"
  ] ;
  
  sh:property [
    sh:path bfo:BFO_0000054 ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "PatientRole MUST be realized in one process"
  ] .


ttshacl:InstrumentalRoleShape
  a sh:NodeShape ;
  sh:targetClass tagteam:InstrumentalRole ;
  sh:name "Instrumental Role Shape" ;
  
  sh:property [
    sh:path bfo:BFO_0000052 ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "InstrumentalRole MUST inhere in one entity"
  ] ;
  
  sh:property [
    sh:path bfo:BFO_0000054 ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "InstrumentalRole MUST be realized in one process"
  ] .

# =============================================================================
# ENTITY SHAPES
# =============================================================================

ttshacl:EntityShape
  a sh:NodeShape ;
  sh:target [
    a sh:SPARQLTarget ;
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX cco: <https://www.commoncoreontologies.org/>
      PREFIX bfo: <http://purl.obolibrary.org/obo/>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      SELECT ?this
      WHERE {
        ?this a owl:NamedIndividual .
        {
          { ?this a bfo:BFO_0000040 }
          UNION { ?this a cco:Person }
          UNION { ?this a cco:Organization }
          UNION { ?this a cco:Artifact }
        }
        FILTER NOT EXISTS { ?this a tagteam:DiscourseReferent }
        FILTER NOT EXISTS { ?this a tagteam:EventDescription }
      }
    """
  ] ;
  sh:name "Entity Shape" ;
  
  sh:property [
    sh:path rdfs:label ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "Entity MUST have exactly one rdfs:label"
  ] ;
  
  sh:property [
    sh:path tagteam:is_subject_of ;
    sh:minCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "Entity MUST link back to at least one DiscourseReferent"
  ] .


ttshacl:EntityDisjointnessRule
  a sh:NodeShape ;
  sh:targetClass cco:Person ;
  sh:name "Person-Organization Disjointness" ;
  sh:severity sh:Violation ;
  
  sh:not [ sh:class cco:Organization ] ;
  sh:message "Entity MUST NOT be both Person and Organization" .

# =============================================================================
# PROVENANCE SHAPES
# =============================================================================

ttshacl:InformationBearingEntityShape
  a sh:NodeShape ;
  sh:targetClass cco:InformationBearingEntity ;
  sh:name "IBE Shape" ;
  
  sh:property [
    sh:path cco:has_text_value ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "IBE MUST have has_text_value"
  ] ;
  
  sh:property [
    sh:path tagteam:received_at ;
    sh:datatype xsd:dateTime ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "IBE MUST have received_at"
  ] .


ttshacl:ProvenanceChainShape
  a sh:NodeShape ;
  sh:targetClass tagteam:DiscourseReferent ;
  sh:name "Provenance Chain Shape" ;
  
  sh:property [
    sh:path tagteam:is_concretized_by ;
    sh:minCount 1 ;
    sh:class cco:InformationBearingEntity ;
    sh:message "DiscourseReferent MUST trace to IBE"
  ] .

# =============================================================================
# CROSS-TIER INTEGRITY CONSTRAINTS
# =============================================================================

ttshacl:TierSeparationRule
  a sh:NodeShape ;
  sh:target [
    a sh:SPARQLTarget ;
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX cco: <https://www.commoncoreontologies.org/>
      SELECT ?this WHERE {
        ?this a tagteam:VerbPhrase .
        ?this a cco:IntentionalAct .
      }
    """
  ] ;
  sh:name "Tier Separation Rule" ;
  sh:severity sh:Violation ;
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "Node MUST NOT be both VerbPhrase and IntentionalAct" ;
    sh:select "SELECT $this WHERE { }"
  ] .


ttshacl:StativeExclusionRule
  a sh:NodeShape ;
  sh:target [
    a sh:SPARQLTarget ;
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      SELECT ?this WHERE {
        ?vp tagteam:is_about ?this .
        { ?this a tagteam:QualityAssertion }
        UNION { ?this a tagteam:StructuralAssertion }
      }
    """
  ] ;
  sh:name "Stative Exclusion Rule" ;
  sh:severity sh:Violation ;
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "Stative assertion coexists with IntentionalAct" ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX cco: <https://www.commoncoreontologies.org/>
      SELECT $this ?act WHERE {
        ?vp tagteam:is_about $this .
        ?vp tagteam:is_about ?act .
        ?act a cco:IntentionalAct .
        FILTER(?act != $this)
      }
    """
  ] .


ttshacl:RoleRealizationTargetRule
  a sh:NodeShape ;
  sh:target [
    a sh:SPARQLTarget ;
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:select """
      PREFIX cco: <https://www.commoncoreontologies.org/>
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      SELECT ?this WHERE {
        { ?this a cco:AgentRole }
        UNION { ?this a cco:PatientRole }
        UNION { ?this a tagteam:InstrumentalRole }
      }
    """
  ] ;
  sh:name "Role Realization Target Rule" ;
  sh:severity sh:Violation ;
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "Role realized_in MUST point to IntentionalAct" ;
    sh:select """
      PREFIX bfo: <http://purl.obolibrary.org/obo/>
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      SELECT $this ?target WHERE {
        $this bfo:BFO_0000054 ?target .
        ?target a tagteam:EventDescription .
      }
    """
  ] .


ttshacl:NegationRealizationConsistencyRule
  a sh:NodeShape ;
  sh:targetClass tagteam:VerbPhrase ;
  sh:name "Negation-Realization Consistency" ;
  sh:severity sh:Violation ;
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "Negated VP points to Realized ED" ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      SELECT $this ?ed ?status WHERE {
        $this tagteam:negated true .
        $this tagteam:is_about ?ed .
        ?ed a tagteam:EventDescription .
        ?ed tagteam:realizationStatus ?status .
        FILTER(
          ?status = tagteam:Realized ||
          STR(?status) = "Realized" ||
          STR(?status) = "http://tagteam.fandaws.org/ontology/Realized"
        )
      }
    """
  ] .


ttshacl:NegatedNoProcessRule
  a sh:NodeShape ;
  sh:targetClass tagteam:VerbPhrase ;
  sh:name "Negated No Process Rule" ;
  sh:severity sh:Violation ;
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "Negated VP linked to IntentionalAct" ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX cco: <https://www.commoncoreontologies.org/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      SELECT $this ?act WHERE {
        $this tagteam:negated true .
        $this tagteam:is_about ?ed .
        ?act tagteam:describedBy ?ed .
        ?act a cco:IntentionalAct .
        OPTIONAL { ?act rdfs:label ?label }
        FILTER (
          NOT EXISTS { ?act tagteam:systemGenerated true }
          && !CONTAINS(LCASE(COALESCE(STR(?label), "")), "parsing")
          && !CONTAINS(STR(?act), "Parsing")
          && !CONTAINS(STR(?act), "System")
        )
      }
    """
  ] .


ttshacl:InstrumentConsistencyRule
  a sh:NodeShape ;
  sh:targetClass tagteam:EventDescription ;
  sh:severity sh:Warning ;
  sh:name "Instrument Consistency Rule" ;
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "ED has instrument but no InstrumentalRole" ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX bfo: <http://purl.obolibrary.org/obo/>
      SELECT $this ?instrument WHERE {
        $this tagteam:instrument ?instrument .
        FILTER NOT EXISTS {
          ?role a tagteam:InstrumentalRole .
          ?role bfo:BFO_0000052 ?instrument .
        }
      }
    """
  ] .


ttshacl:LemmaActTypeConsistencyRule
  a sh:NodeShape ;
  sh:targetClass tagteam:VerbPhrase ;
  sh:severity sh:Warning ;
  sh:name "Lemma-ActType Consistency" ;
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "VP.lemma != ED.actType" ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      SELECT $this ?lemma ?actType WHERE {
        $this tagteam:lemma ?lemma .
        $this tagteam:is_about ?ed .
        ?ed a tagteam:EventDescription .
        ?ed tagteam:actType ?actType .
        FILTER(?lemma != ?actType)
      }
    """
  ] .

# =============================================================================
# ANTI-PATTERN DETECTION
# =============================================================================

ttshacl:GhostActDetection
  a sh:NodeShape ;
  sh:target [
    a sh:SPARQLTarget ;
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:select """
      PREFIX cco: <https://www.commoncoreontologies.org/>
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      SELECT ?this WHERE {
        ?this a cco:IntentionalAct .
        OPTIONAL { ?this rdfs:label ?label }
        FILTER (
          NOT EXISTS { ?this tagteam:systemGenerated true }
          && !CONTAINS(LCASE(COALESCE(STR(?label), "")), "parsing")
          && !CONTAINS(STR(?this), "Parsing")
          && !CONTAINS(STR(?this), "System")
        )
      }
    """
  ] ;
  sh:name "Ghost Act Detection" ;
  sh:severity sh:Violation ;
  sh:property [
    sh:path tagteam:describedBy ;
    sh:minCount 1 ;
    sh:message "IntentionalAct without describedBy is ghost act"
  ] .


ttshacl:OrphanEventDescriptionDetection
  a sh:NodeShape ;
  sh:targetClass tagteam:EventDescription ;
  sh:name "Orphan ED Detection" ;
  sh:severity sh:Warning ;
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "Realized ED not linked from IntentionalAct" ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      PREFIX cco: <https://www.commoncoreontologies.org/>
      SELECT $this WHERE {
        $this a tagteam:EventDescription .
        $this tagteam:realizationStatus ?status .
        FILTER(
          ?status = tagteam:Realized ||
          STR(?status) = "Realized" ||
          STR(?status) = "http://tagteam.fandaws.org/ontology/Realized"
        )
        FILTER NOT EXISTS {
          ?act tagteam:describedBy $this .
          ?act a cco:IntentionalAct .
        }
      }
    """
  ] .


ttshacl:TierPollutionDetection
  a sh:NodeShape ;
  sh:target [
    a sh:SPARQLTarget ;
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:select """
      PREFIX cco: <https://www.commoncoreontologies.org/>
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      SELECT ?this WHERE {
        { ?this a cco:IntentionalAct }
        UNION { ?this a tagteam:EventDescription }
      }
    """
  ] ;
  sh:name "Tier Pollution Detection" ;
  sh:severity sh:Violation ;
  sh:property [
    sh:path tagteam:mentionId ;
    sh:maxCount 0 ;
    sh:message "Tier 2 node has mentionId"
  ] ;
  sh:property [
    sh:path tagteam:sourceText ;
    sh:maxCount 0 ;
    sh:message "Tier 2 node has sourceText"
  ] .


ttshacl:DeprecatedDenotesTypeDetection
  a sh:NodeShape ;
  sh:targetClass tagteam:VerbPhrase ;
  sh:name "Deprecated denotesType Detection" ;
  sh:severity sh:Warning ;
  sh:sparql [
    sh:prefixes ttshacl:PrefixDeclarations ;
    sh:message "denotesType='Event' is DEPRECATED" ;
    sh:select """
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      SELECT $this ?denotesType WHERE {
        $this tagteam:denotesType ?denotesType .
        FILTER(?denotesType = "Event")
      }
    """
  ] .

# =============================================================================
# END OF SHAPES
# =============================================================================
```

---

## Appendix B: Test Sentences

### B.1 Eventive Path (WS-C)

| Sentence | Expected | Notes |
|----------|----------|-------|
| "The parent fed the child." | ED[Realized], IA, AR, PR | Transitive |
| "The child slept." | ED[Realized], IA, AR | Intransitive |
| "She cut the paper with scissors." | ED[Realized], IA, AR, PR, IR | Instrumental |

### B.2 Stative Path (WS-A)

| Sentence | Expected | Notes |
|----------|----------|-------|
| "The child is hungry." | QA | No IntentionalAct |
| "CBP is a component of DHS." | SA | No IntentionalAct |

### B.3 Negation Path (WS-B)

| Sentence | Expected | Notes |
|----------|----------|-------|
| "The parent did not feed the child." | ED[Unrealized] | No IntentionalAct |
| "She never arrived." | ED[Unrealized] | No IntentionalAct |

### B.4 Deontic Path (RDM)

| Sentence | Expected | Notes |
|----------|----------|-------|
| "The committee shall review the proposal." | DICE, PS, Obl | Obligation |
| "Members may attend." | DICE, PS, Perm | Permission |

---

## Appendix C: Conformance Checklist

### Required (MUST pass)

- [ ] DiscourseReferentShape
- [ ] VerbPhraseShape
- [ ] EventDescriptionShape
- [ ] QualityAssertionShape
- [ ] StructuralAssertionShape
- [ ] PlanSpecificationShape
- [ ] DirectiveICEShape
- [ ] IntentionalActShape
- [ ] AgentRoleShape
- [ ] PatientRoleShape
- [ ] EntityShape
- [ ] EntityDisjointnessRule
- [ ] IBEShape
- [ ] ProvenanceChainShape
- [ ] TierSeparationRule
- [ ] DenotationConsistencyRule
- [ ] StativeExclusionRule
- [ ] RoleRealizationTargetRule
- [ ] GhostActDetection
- [ ] TierPollutionDetection

### Recommended (SHOULD pass)

- [ ] InstrumentalRoleShape
- [ ] NegationRealizationConsistencyRule
- [ ] NegatedNoProcessRule

### Advisory (MAY pass)

- [ ] InstrumentConsistencyRule
- [ ] LemmaActTypeConsistencyRule
- [ ] OrphanEventDescriptionDetection
- [ ] DeprecatedDenotesTypeDetection

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-29 | Initial release |
| 1.2.0 | 2026-03-29 | InstrumentalRole, Negation, Deprecated, Genericity tuning |
| 1.3.0 | 2026-03-30 | Two-Tier/Three-Layer clarification, Normative Vocabularies, Canonical Fields, Type-based constraints, SHACL prefix declarations, Conformance levels, Appendix sync |

---

*End of Specification*
