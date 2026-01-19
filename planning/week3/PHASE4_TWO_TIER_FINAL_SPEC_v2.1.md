# Phase 4: Two-Tier Architecture Final Specification

**Version**: 2.1 (REVISED - Implementation Ready)
**Date**: 2026-01-19
**Status**: APPROVED FOR IMPLEMENTATION
**Based on**: BFO/CCO Expert Review + Gap Resolution + Implementation Review

---

## Executive Summary

This document specifies the **final architecture** for TagTeam.js Phase 4 JSON-LD output. The Two-Tier Architecture properly separates:

1. **Tier 1: Parsing Layer** (Information Content Entities) — What the text says
2. **Tier 2: Real-World Layer** (Independent Continuants) — The entities being described

This separation resolves all ontological category errors identified in expert review while maintaining practical implementability.

### Key Architectural Decisions (Resolved)

| Decision | Resolution |
|----------|------------|
| Act Actuality | Option B: Instantiate with `actualityStatus: "tagteam:Prescribed"` |
| Dormant Roles | Keep roles with `rdfs:comment` indicating dormancy |
| Scarcity Modeling | Use `tagteam:scarceResource` and `tagteam:competingParties` |
| VerbPhrase Integration | Link to IBE via `has_component` |
| Inverse Relations | Assert `inheres_in` only (not `is_bearer_of`) |
| GIT-Minimal | Reintegrated with `assertionType` and `validInContext` |
| IBE Staircase | Required; grounds all Tier 1 content |
| Namespace | `http://tagteam.fandaws.org/ontology/` |
| IRI Generation | SHA-256 deterministic hashing |
| Actuality Status | Named Individuals pattern (OWL NamedIndividual) |

---

## 1. Two-Tier Architecture

### 1.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TIER 1: PARSING LAYER                               │
│                    (Information Content Entities)                           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Input_Text_IBE                                   │   │
│  │          (InformationBearingEntity - the document)                   │   │
│  │                                                                       │   │
│  │   has_component:                                                      │   │
│  │     ├── DiscourseReferent "the doctor"                               │   │
│  │     ├── DiscourseReferent "the last ventilator"                      │   │
│  │     ├── DiscourseReferent "two critically ill patients"              │   │
│  │     ├── VerbPhrase "must allocate"                                   │   │
│  │     ├── DirectiveContent (obligation)                                │   │
│  │     ├── ScarcityAssertion                                            │   │
│  │     ├── ValueDetectionRecord                                         │   │
│  │     └── ContextAssessmentRecord                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              │ cco:is_about / tagteam:denotes               │
│                              ▼                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                         TIER 2: REAL-WORLD LAYER                            │
│                      (Independent Continuants)                              │
│                                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌────────────┐   │
│  │ cco:Person   │   │ cco:Person   │   │ cco:Person   │   │cco:Artifact│   │
│  │ (Doctor)     │   │ (Patient 1)  │   │ (Patient 2)  │   │(Ventilator)│   │
│  └──────────────┘   └──────────────┘   └──────────────┘   └────────────┘   │
│         ▲                  ▲                  ▲                  ▲          │
│         │ inheres_in       │ inheres_in       │ inheres_in       │          │
│         │                  │                  │                  │          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐         │          │
│  │ AgentRole    │   │ PatientRole  │   │ PatientRole  │         │          │
│  │ (realized_in)│   │ (dormant)    │   │ (dormant)    │         │          │
│  └──────┬───────┘   └──────────────┘   └──────────────┘         │          │
│         │                                                        │          │
│         │ realized_in                                            │ affects  │
│         ▼                                                        │          │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │              ActOfAllocation (actualityStatus: prescribed)       │       │
│  │                                                                   │       │
│  │  has_agent ──────► Person_Doctor                                 │       │
│  │  has_participant ► [Person_Patient_1, Person_Patient_2]          │       │
│  │  affects ────────► Artifact_Ventilator ──────────────────────────┘       │
│  │  prescribed_by ──► DirectiveContent (Tier 1)                     │       │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Diagram Notes**:
- Arrows point FROM dependent entity TO bearer (e.g., Role → Person for `inheres_in`)
- `has_component` is IBE → ICE (downward linking)
- `extracted_from` is ICE → IBE (upward linking for bidirectional navigation)

### 1.2 Layer Definitions

#### Tier 1: Parsing Layer (Information Content Entities)

**Purpose**: Capture what the text says, preserving linguistic features and extraction provenance.

**Node Types**:
| Type | Description | BFO Category |
|------|-------------|--------------|
| `cco:InformationBearingEntity` | The physical/digital document | IC (Independent Continuant) |
| `tagteam:DiscourseReferent` | A mention in text referring to something | ICE (subclass of InformationContentEntity) |
| `tagteam:VerbPhrase` | Linguistic representation of an action | ICE |
| `tagteam:DirectiveContent` | Deontic modality (must, should, may) | ICE (subclass of cco:DirectiveInformationContentEntity) |
| `tagteam:ScarcityAssertion` | Claims about resource scarcity | ICE |
| `tagteam:ValueDetectionRecord` | Record of detected ethical value | ICE |
| `tagteam:ContextAssessmentRecord` | Record of context intensity assessment | ICE |

**Note on IBE**: `cco:InformationBearingEntity` is classified as IC (Independent Continuant) because it represents the physical or digital medium bearing information (e.g., a document file, a string in memory). This is distinct from ICE (InformationContentEntity) which is the abstract content itself.

**Characteristics**:
- Preserves source text, positions, linguistic features
- Contains TagTeam-specific parsing metadata
- Links to Tier 2 via `cco:is_about` or `tagteam:denotes`
- **NEVER uses BFO physical relations** (`is_bearer_of`, `inheres_in`, `has_agent`)
- Includes GIT-Minimal metadata (`assertionType`, `validInContext`, `temporal_extent`)

#### Tier 2: Real-World Layer (Independent Continuants)

**Purpose**: Model the actual entities in the world being described.

**Node Types**:
| Type | Description | BFO Category |
|------|-------------|--------------|
| `cco:Person` | Human beings | IC |
| `cco:Artifact` | Man-made objects | IC |
| `cco:Organization` | Institutions | IC |
| `bfo:BFO_0000023` / `cco:AgentRole` | Roles inhering in entities | SDC |
| `cco:IntentionalAct` subclasses | Actions performed by agents | Occurrent |

**Characteristics**:
- Uses proper BFO/CCO relations
- Roles inhere in Persons/Organizations via `bfo:inheres_in`
- Acts have agents via `cco:has_agent` pointing to Persons
- Acts marked with `actualityStatus` when prescribed but not actual
- Artifacts affected by acts via `cco:affects`

---

## 2. Relation Usage Rules

### 2.1 Canonical Relations by Layer

| Relation | Domain | Range | Layer | Notes |
|----------|--------|-------|-------|-------|
| `cco:is_about` | ICE | Any entity | Tier 1 → Tier 2 | Primary cross-tier link |
| `tagteam:denotes` | DiscourseReferent | IC | Tier 1 → Tier 2 | Alias for `is_about` |
| `tagteam:has_component` | IBE | ICE | Tier 1 only | Links document to extracted content |
| `tagteam:extracted_from` | ICE | IBE | Tier 1 only | Inverse of has_component (for navigation) |
| `bfo:inheres_in` | Role | Person/Organization | Tier 2 only | Role depends on bearer |
| `bfo:realized_in` | Role | Act | Tier 2 only | Role manifests in process |
| `cco:has_agent` | Act | Person | Tier 2 only | Act performed by agent |
| `cco:has_participant` | Act | Person | Tier 2 only | Persons involved in act |
| `cco:affects` | Act | Artifact | Tier 2 only | Act affects object |
| `cco:prescribes` | DirectiveContent | Act | Tier 1 → Tier 2 | Obligation prescribes act |
| `cco:prescribed_by` | Act | DirectiveContent | Tier 2 → Tier 1 | Inverse of prescribes |

### 2.2 Bidirectional Linking Strategy

For ease of graph traversal, TagTeam asserts both directions where applicable:

| Forward Relation | Inverse Relation | Assertion Strategy |
|------------------|------------------|-------------------|
| `has_component` | `extracted_from` | Assert both for navigation |
| `prescribes` | `prescribed_by` | Assert both for navigation |
| `inheres_in` | `is_bearer_of` | Assert `inheres_in` ONLY (reasoner infers inverse) |

**Rationale**: `has_component`/`extracted_from` and `prescribes`/`prescribed_by` are explicitly asserted because SPARQL queries commonly traverse in both directions and reasoner support varies. Role relations use canonical direction only per BFO conventions.

### 2.3 Prohibited Patterns

```javascript
// ❌ PROHIBITED: Referent bearing a role
{
  "@id": "inst:Doctor_Referent",
  "@type": ["tagteam:DiscourseReferent"],
  "bfo:is_bearer_of": "inst:AgentRole"  // INVALID - text cannot bear roles
}

// ❌ PROHIBITED: Act with referent as agent
{
  "@id": "inst:Act_Allocate",
  "@type": ["cco:ActOfAllocation"],
  "cco:has_agent": "inst:Doctor_Referent"  // INVALID - acts have real agents
}

// ❌ PROHIBITED: Artifact bearing PatientRole
{
  "@id": "inst:Ventilator",
  "@type": ["cco:Artifact"],
  "bfo:is_bearer_of": "inst:PatientRole"  // INVALID - artifacts aren't patients
}

// ❌ PROHIBITED: Redundant inverse relations
{
  "@id": "inst:Person_Doctor",
  "bfo:is_bearer_of": "inst:AgentRole"  // INVALID - use inheres_in on Role instead
}
```

### 2.4 Required Patterns

```javascript
// ✅ REQUIRED: Referent links to Person via is_about
{
  "@id": "inst:Doctor_Referent",
  "@type": ["tagteam:DiscourseReferent"],
  "cco:is_about": "inst:Person_Doctor"
}

// ✅ REQUIRED: Role inheres in Person (one direction only)
{
  "@id": "inst:AgentRole_Doctor",
  "@type": ["cco:AgentRole"],
  "bfo:inheres_in": "inst:Person_Doctor",
  "bfo:realized_in": "inst:Act_Allocate"
}

// ✅ REQUIRED: Act has Person as agent
{
  "@id": "inst:Act_Allocate",
  "@type": ["cco:ActOfAllocation"],
  "cco:has_agent": "inst:Person_Doctor",
  "tagteam:actualityStatus": "tagteam:Prescribed"
}

// ✅ REQUIRED: Artifact affected by act (no role)
{
  "@id": "inst:Act_Allocate",
  "cco:affects": "inst:Artifact_Ventilator"
}
```

---

## 3. Actuality Status for Occurrents

### 3.1 The Problem

BFO occurrents (processes, acts) are things that *happen*. A sentence like "The doctor **must** allocate..." describes an obligated act, not an actual one.

### 3.2 Resolution: Named Individuals Pattern

All Tier 2 acts include `tagteam:actualityStatus` pointing to an OWL Named Individual:

| Status | IRI | Meaning |
|--------|-----|---------|
| `Actual` | `tagteam:Actual` | The act has occurred or is occurring |
| `Prescribed` | `tagteam:Prescribed` | The act is obligated but not yet occurred |
| `Permitted` | `tagteam:Permitted` | The act is allowed but not required |
| `Prohibited` | `tagteam:Prohibited` | The act is forbidden |
| `Hypothetical` | `tagteam:Hypothetical` | The act is described in a thought experiment |
| `Planned` | `tagteam:Planned` | The act is intended for future execution |

### 3.3 Named Individual Definitions

These status values are defined as OWL Named Individuals in the TagTeam ontology:

```turtle
tagteam:ActualityStatus a owl:Class ;
  rdfs:label "Actuality Status" ;
  rdfs:comment "The temporal/modal status of an act" .

tagteam:Actual a owl:NamedIndividual, tagteam:ActualityStatus ;
  rdfs:label "Actual" ;
  rdfs:comment "The act has occurred or is occurring" .

tagteam:Prescribed a owl:NamedIndividual, tagteam:ActualityStatus ;
  rdfs:label "Prescribed" ;
  rdfs:comment "The act is obligated by a directive but has not yet occurred" .

tagteam:Permitted a owl:NamedIndividual, tagteam:ActualityStatus ;
  rdfs:label "Permitted" ;
  rdfs:comment "The act is allowed but not required" .

tagteam:Prohibited a owl:NamedIndividual, tagteam:ActualityStatus ;
  rdfs:label "Prohibited" ;
  rdfs:comment "The act is forbidden" .

tagteam:Hypothetical a owl:NamedIndividual, tagteam:ActualityStatus ;
  rdfs:label "Hypothetical" ;
  rdfs:comment "The act is described in a thought experiment" .

tagteam:Planned a owl:NamedIndividual, tagteam:ActualityStatus ;
  rdfs:label "Planned" ;
  rdfs:comment "The act is intended for future execution" .
```

### 3.4 Example

```json
{
  "@id": "inst:Act_Allocate",
  "@type": ["cco:IntentionalAct", "cco:ActOfAllocation"],
  "rdfs:label": "act of allocating ventilator",
  "tagteam:actualityStatus": "tagteam:Prescribed",
  "rdfs:comment": "This process is obligated by a directive but has not yet occurred.",
  "cco:has_agent": "inst:Person_Doctor",
  "cco:affects": "inst:Artifact_Ventilator",
  "cco:prescribed_by": "inst:Directive_Must_Allocate"
}
```

---

## 4. Role Handling

### 4.1 Role Bearer Rules

| CCO Role Type | Valid Bearer | Invalid Bearer |
|---------------|--------------|----------------|
| `cco:AgentRole` | `cco:Person`, `cco:Organization` | DiscourseReferent, Artifact |
| `cco:PatientRole` | `cco:Person` | DiscourseReferent, Artifact |
| `cco:BeneficiaryRole` | `cco:Person`, `cco:Organization` | DiscourseReferent, Artifact |

### 4.2 Dormant Roles

When a role is justified by text but not realized in any act, mark it as dormant:

```json
{
  "@id": "inst:PatientRole_1",
  "@type": ["bfo:BFO_0000023", "cco:PatientRole"],
  "rdfs:label": "patient role of patient 1",
  "bfo:inheres_in": "inst:Person_Patient_1",
  "rdfs:comment": "Dormant role: inheres in person, justified by linguistic referent 'patient', but not currently realized in an active care process."
}
```

### 4.3 Relation Direction

**Assert only `bfo:inheres_in` on the Role node.** Do not assert `bfo:is_bearer_of` on the Person node.

```javascript
// ✅ CORRECT: inheres_in on Role
{
  "@id": "inst:AgentRole_Doctor",
  "bfo:inheres_in": "inst:Person_Doctor"
}

// ❌ INCORRECT: is_bearer_of on Person (redundant)
{
  "@id": "inst:Person_Doctor",
  "bfo:is_bearer_of": "inst:AgentRole_Doctor"
}
```

Reasoners can infer the inverse if needed; asserting both creates maintenance burden.

---

## 5. Deontic Modality Modeling

### 5.1 DirectiveContent Pattern

Deontic modality ("must", "should", "may") is modeled as `cco:DirectiveInformationContentEntity`:

```json
{
  "@id": "inst:Directive_Must_Allocate",
  "@type": ["cco:DirectiveInformationContentEntity", "tagteam:DirectiveContent"],
  "rdfs:label": "obligation to allocate",
  "tagteam:modalType": "obligation",
  "tagteam:modalMarker": "must",
  "tagteam:modalStrength": 1.0,
  "cco:prescribes": "inst:Act_Allocate",

  "tagteam:assertionType": "tagteam:AutomatedDetection",
  "tagteam:validInContext": "inst:InterpretationContext_MedicalEthics",
  "tagteam:temporal_extent": "2026-01-19T10:30:00Z"
}
```

### 5.2 Modal Type Vocabulary

| Marker | Modal Type | Strength |
|--------|------------|----------|
| must, shall, will | `obligation` | 1.0 |
| should, ought to | `recommendation` | 0.7 |
| may, can, could | `permission` | 0.5 |
| must not, shall not | `prohibition` | 1.0 |
| should not | `discouragement` | 0.7 |

---

## 6. Scarcity Modeling

### 6.1 ScarcityAssertion as ICE

Scarcity is a **contextual assessment**, not an intrinsic property. Model it as an Information Content Entity with separate properties for scarce resource and competing parties:

```json
{
  "@id": "inst:ScarcityAssertion_Ventilator",
  "@type": ["tagteam:ScarcityAssertion", "cco:InformationContentEntity"],
  "rdfs:label": "ventilator scarcity assessment",
  "tagteam:scarceResource": "inst:Artifact_Ventilator",
  "tagteam:competingParties": [
    "inst:Person_Patient_1",
    "inst:Person_Patient_2"
  ],
  "tagteam:evidenceText": "the last ventilator",
  "tagteam:supplyCount": 1,
  "tagteam:demandCount": 2,
  "tagteam:scarcityRatio": 0.5,
  "extracted_from": "inst:Input_Text_IBE",

  "tagteam:assertionType": "tagteam:AutomatedDetection",
  "tagteam:validInContext": "inst:InterpretationContext_MedicalEthics",
  "tagteam:temporal_extent": "2026-01-19T10:30:00Z"
}
```

### 6.2 ScarcityAssertion Properties

| Property | Type | Description |
|----------|------|-------------|
| `tagteam:scarceResource` | IRI | The resource that is scarce (Artifact) |
| `tagteam:competingParties` | IRI[] | The parties competing for the resource (Persons) |
| `tagteam:evidenceText` | string | The linguistic evidence for scarcity |
| `tagteam:supplyCount` | integer | Number of available resources |
| `tagteam:demandCount` | integer | Number of parties needing resource |
| `tagteam:scarcityRatio` | decimal | supply / demand ratio |

### 6.3 Scarcity Indicators

| Indicator | Evidence | scarcityRatio |
|-----------|----------|---------------|
| "the last" | Single remaining | supply/demand |
| "the only" | Single available | supply/demand |
| "between X" | Competition | 1/X |
| "not enough" | Explicit shortage | < 1.0 |

---

## 7. Information Staircase (IBE Grounding)

### 7.1 Required Structure

Every TagTeam parse must include an `InformationBearingEntity` that grounds all Tier 1 content:

```json
{
  "@id": "inst:Input_Text_IBE",
  "@type": ["cco:InformationBearingEntity"],
  "rdfs:label": "input text document",
  "cco:has_text_value": "The doctor must allocate the last ventilator between two critically ill patients",
  "tagteam:char_count": 82,
  "tagteam:received_at": "2026-01-19T10:30:00Z",

  "tagteam:has_component": [
    "inst:Referent_Doctor",
    "inst:Referent_Ventilator",
    "inst:Referent_Patients",
    "inst:VerbPhrase_Allocate",
    "inst:Directive_Must_Allocate",
    "inst:ScarcityAssertion_Ventilator"
  ],

  "tagteam:assertionType": "tagteam:AutomatedDetection",
  "tagteam:validInContext": "inst:InterpretationContext_MedicalEthics",
  "tagteam:temporal_extent": "2026-01-19T10:30:00Z"
}
```

### 7.2 Component Linking

All Tier 1 ICE nodes link back to the IBE via `extracted_from`. Position indices are 0-based character offsets from the start of the input text:

```json
{
  "@id": "inst:Referent_Doctor",
  "@type": ["tagteam:DiscourseReferent"],
  "tagteam:extracted_from": "inst:Input_Text_IBE",
  "tagteam:sourceText": "The doctor",
  "tagteam:startPosition": 0,
  "tagteam:endPosition": 10
}
```

**Position Semantics**:
- `startPosition`: 0-based index of first character (inclusive)
- `endPosition`: 0-based index of last character (exclusive, like JavaScript `substring()`)
- For "The doctor" at start of string: startPosition=0, endPosition=10

---

## 8. GIT-Minimal Integration

### 8.1 Required Properties on All Tier 1 Nodes

Every Tier 1 ICE must include:

| Property | Type | Description |
|----------|------|-------------|
| `tagteam:assertionType` | IRI | Who/what made this assertion |
| `tagteam:validInContext` | IRI | Interpretation framework |
| `tagteam:temporal_extent` | xsd:dateTime | When assertion was made |

### 8.2 Assertion Types

| Type | IRI | Use |
|------|-----|-----|
| `AutomatedDetection` | `tagteam:AutomatedDetection` | Parser-generated (default) |
| `HumanValidation` | `tagteam:HumanValidation` | Human confirmed |
| `HumanRejection` | `tagteam:HumanRejection` | Human rejected |
| `HumanCorrection` | `tagteam:HumanCorrection` | Human corrected |

### 8.3 Interpretation Context

```json
{
  "@id": "inst:InterpretationContext_MedicalEthics",
  "@type": ["tagteam:InterpretationContext"],
  "rdfs:label": "Medical Ethics Framework",
  "tagteam:framework": "Principlism (Beauchamp & Childress)",
  "rdfs:comment": "Four principles: autonomy, beneficence, non-maleficence, justice"
}
```

---

## 9. IRI Generation Strategy

### 9.1 Deterministic IRI Generation

To ensure consistent, reproducible IRIs across parse runs, TagTeam uses SHA-256 hashing:

```javascript
function generateIRI(prefix, type, content) {
  const hash = sha256(`${type}:${content}`).substring(0, 12);
  return `inst:${prefix}_${hash}`;
}

// Examples:
// Referent IRI: generateIRI("Referent", "DiscourseReferent", "the doctor|0|10")
//   → inst:Referent_a1b2c3d4e5f6

// Person IRI: generateIRI("Person", "Person", "doctor")
//   → inst:Person_f6e5d4c3b2a1

// Act IRI: generateIRI("Act", "ActOfAllocation", "allocate|doctor|ventilator")
//   → inst:Act_1a2b3c4d5e6f
```

### 9.2 IRI Components by Entity Type

| Entity Type | Hash Input Components |
|-------------|----------------------|
| DiscourseReferent | sourceText + startPosition + endPosition |
| Person | normalized label (lowercase) |
| Artifact | normalized label + type |
| Role | roleType + bearerIRI |
| Act | verb + agentIRI + affectedIRI |
| ScarcityAssertion | resourceIRI + competingPartyIRIs |
| Directive | modalMarker + prescribedActIRI |

### 9.3 Implementation Notes

- Hash collisions are astronomically unlikely with 12 hex characters (48 bits)
- Same input always produces same IRI (idempotent)
- Different inputs produce different IRIs (collision-resistant)
- Human-readable prefix retained for debugging

---

## 10. Complete @context

```json
{
  "@context": {
    "// Namespace Prefixes": "",
    "bfo": "http://purl.obolibrary.org/obo/",
    "cco": "http://www.ontologyrepository.com/CommonCoreOntologies/",
    "tagteam": "http://tagteam.fandaws.org/ontology/",
    "inst": "http://tagteam.fandaws.org/instance/",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "owl": "http://www.w3.org/2002/07/owl#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",

    "// Tier 1 Classes": "",
    "DiscourseReferent": "tagteam:DiscourseReferent",
    "VerbPhrase": "tagteam:VerbPhrase",
    "DirectiveContent": "tagteam:DirectiveContent",
    "ScarcityAssertion": "tagteam:ScarcityAssertion",
    "ValueDetectionRecord": "tagteam:ValueDetectionRecord",
    "ContextAssessmentRecord": "tagteam:ContextAssessmentRecord",
    "InterpretationContext": "tagteam:InterpretationContext",

    "// GIT-Minimal Classes": "",
    "AutomatedDetection": "tagteam:AutomatedDetection",
    "HumanValidation": "tagteam:HumanValidation",
    "HumanRejection": "tagteam:HumanRejection",
    "HumanCorrection": "tagteam:HumanCorrection",

    "// Actuality Status Named Individuals": "",
    "ActualityStatus": "tagteam:ActualityStatus",
    "Actual": "tagteam:Actual",
    "Prescribed": "tagteam:Prescribed",
    "Permitted": "tagteam:Permitted",
    "Prohibited": "tagteam:Prohibited",
    "Hypothetical": "tagteam:Hypothetical",
    "Planned": "tagteam:Planned",

    "// Cross-Tier Relations": "",
    "is_about": { "@id": "cco:is_about", "@type": "@id" },
    "denotes": { "@id": "tagteam:denotes", "@type": "@id" },
    "prescribes": { "@id": "cco:prescribes", "@type": "@id" },
    "prescribed_by": { "@id": "cco:prescribed_by", "@type": "@id" },

    "// Tier 1 Relations": "",
    "has_component": { "@id": "tagteam:has_component", "@type": "@id" },
    "extracted_from": { "@id": "tagteam:extracted_from", "@type": "@id" },

    "// Tier 2 Relations (BFO)": "",
    "inheres_in": { "@id": "bfo:BFO_0000052", "@type": "@id" },
    "realized_in": { "@id": "bfo:BFO_0000054", "@type": "@id" },
    "has_participant": { "@id": "bfo:BFO_0000057", "@type": "@id" },

    "// Tier 2 Relations (CCO)": "",
    "has_agent": { "@id": "cco:has_agent", "@type": "@id" },
    "affects": { "@id": "cco:affects", "@type": "@id" },

    "// GIT-Minimal Properties": "",
    "assertionType": { "@id": "tagteam:assertionType", "@type": "@id" },
    "validInContext": { "@id": "tagteam:validInContext", "@type": "@id" },
    "actualityStatus": { "@id": "tagteam:actualityStatus", "@type": "@id" },

    "// Confidence Properties": "",
    "extractionConfidence": { "@id": "tagteam:extractionConfidence", "@type": "xsd:decimal" },
    "classificationConfidence": { "@id": "tagteam:classificationConfidence", "@type": "xsd:decimal" },
    "relevanceConfidence": { "@id": "tagteam:relevanceConfidence", "@type": "xsd:decimal" },
    "aggregateConfidence": { "@id": "tagteam:aggregateConfidence", "@type": "xsd:decimal" },

    "// Deontic Properties": "",
    "modalType": "tagteam:modalType",
    "modalMarker": "tagteam:modalMarker",
    "modalStrength": { "@id": "tagteam:modalStrength", "@type": "xsd:decimal" },

    "// Scarcity Properties": "",
    "scarceResource": { "@id": "tagteam:scarceResource", "@type": "@id" },
    "competingParties": { "@id": "tagteam:competingParties", "@type": "@id" },
    "supplyCount": { "@id": "tagteam:supplyCount", "@type": "xsd:integer" },
    "demandCount": { "@id": "tagteam:demandCount", "@type": "xsd:integer" },
    "scarcityRatio": { "@id": "tagteam:scarcityRatio", "@type": "xsd:decimal" },
    "evidenceText": "tagteam:evidenceText",

    "// Discourse Referent Properties": "",
    "sourceText": "tagteam:sourceText",
    "startPosition": { "@id": "tagteam:startPosition", "@type": "xsd:integer" },
    "endPosition": { "@id": "tagteam:endPosition", "@type": "xsd:integer" },
    "definiteness": "tagteam:definiteness",
    "quantity": { "@id": "tagteam:quantity", "@type": "xsd:integer" },
    "quantityIndicator": "tagteam:quantityIndicator",
    "qualifiers": "tagteam:qualifiers",

    "// VerbPhrase Properties": "",
    "verb": "tagteam:verb",
    "lemma": "tagteam:lemma",
    "tense": "tagteam:tense",
    "hasModalMarker": "tagteam:hasModalMarker",

    "// IBE Properties": "",
    "has_text_value": "cco:has_text_value",
    "char_count": { "@id": "tagteam:char_count", "@type": "xsd:integer" },
    "received_at": { "@id": "tagteam:received_at", "@type": "xsd:dateTime" },
    "temporal_extent": { "@id": "tagteam:temporal_extent", "@type": "xsd:dateTime" },

    "// Value Detection Properties": "",
    "asserts": { "@id": "tagteam:asserts", "@type": "@id" },
    "detected_by": { "@id": "tagteam:detected_by", "@type": "@id" },
    "based_on": { "@id": "tagteam:based_on", "@type": "@id" },
    "polarity": { "@id": "tagteam:polarity", "@type": "xsd:integer" },
    "salience": { "@id": "tagteam:salience", "@type": "xsd:decimal" },
    "matched_markers": "tagteam:matched_markers"
  }
}
```

---

## 11. Complete Example: Ventilator Scenario

### Input Text
> "The doctor must allocate the last ventilator between two critically ill patients"

### 11.1 Full JSON-LD Output

```json
{
  "@context": {
    "bfo": "http://purl.obolibrary.org/obo/",
    "cco": "http://www.ontologyrepository.com/CommonCoreOntologies/",
    "tagteam": "http://tagteam.fandaws.org/ontology/",
    "inst": "http://tagteam.fandaws.org/instance/",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",

    "DiscourseReferent": "tagteam:DiscourseReferent",
    "VerbPhrase": "tagteam:VerbPhrase",
    "DirectiveContent": "tagteam:DirectiveContent",
    "ScarcityAssertion": "tagteam:ScarcityAssertion",
    "InterpretationContext": "tagteam:InterpretationContext",
    "ValueDetectionRecord": "tagteam:ValueDetectionRecord",

    "is_about": { "@id": "cco:is_about", "@type": "@id" },
    "has_component": { "@id": "tagteam:has_component", "@type": "@id" },
    "extracted_from": { "@id": "tagteam:extracted_from", "@type": "@id" },
    "inheres_in": { "@id": "bfo:BFO_0000052", "@type": "@id" },
    "realized_in": { "@id": "bfo:BFO_0000054", "@type": "@id" },
    "has_participant": { "@id": "bfo:BFO_0000057", "@type": "@id" },
    "has_agent": { "@id": "cco:has_agent", "@type": "@id" },
    "affects": { "@id": "cco:affects", "@type": "@id" },
    "prescribes": { "@id": "cco:prescribes", "@type": "@id" },
    "prescribed_by": { "@id": "cco:prescribed_by", "@type": "@id" },
    "asserts": { "@id": "tagteam:asserts", "@type": "@id" },
    "detected_by": { "@id": "tagteam:detected_by", "@type": "@id" },
    "based_on": { "@id": "tagteam:based_on", "@type": "@id" },
    "assertionType": { "@id": "tagteam:assertionType", "@type": "@id" },
    "validInContext": { "@id": "tagteam:validInContext", "@type": "@id" },
    "actualityStatus": { "@id": "tagteam:actualityStatus", "@type": "@id" },
    "scarceResource": { "@id": "tagteam:scarceResource", "@type": "@id" },
    "competingParties": { "@id": "tagteam:competingParties", "@type": "@id" },
    "verb": "tagteam:verb",
    "lemma": "tagteam:lemma",
    "tense": "tagteam:tense",
    "hasModalMarker": "tagteam:hasModalMarker"
  },

  "@graph": [

    {
      "@id": "inst:InterpretationContext_MedicalEthics",
      "@type": ["tagteam:InterpretationContext"],
      "rdfs:label": "Medical Ethics Framework",
      "tagteam:framework": "Principlism (Beauchamp & Childress)"
    },

    {
      "@id": "inst:Input_Text_IBE",
      "@type": ["cco:InformationBearingEntity"],
      "rdfs:label": "input text document",
      "cco:has_text_value": "The doctor must allocate the last ventilator between two critically ill patients",
      "tagteam:char_count": 82,
      "tagteam:received_at": "2026-01-19T10:30:00Z",
      "has_component": [
        "inst:Referent_Doctor",
        "inst:Referent_Ventilator",
        "inst:Referent_Patients",
        "inst:VerbPhrase_Allocate",
        "inst:Directive_Must_Allocate",
        "inst:ScarcityAssertion_Ventilator"
      ],
      "tagteam:temporal_extent": "2026-01-19T10:30:00Z"
    },

    {
      "@id": "inst:Referent_Doctor",
      "@type": ["tagteam:DiscourseReferent"],
      "rdfs:label": "the doctor",
      "tagteam:sourceText": "The doctor",
      "tagteam:startPosition": 0,
      "tagteam:endPosition": 10,
      "tagteam:definiteness": "definite",
      "extracted_from": "inst:Input_Text_IBE",
      "is_about": "inst:Person_Doctor",
      "assertionType": "tagteam:AutomatedDetection",
      "validInContext": "inst:InterpretationContext_MedicalEthics",
      "tagteam:temporal_extent": "2026-01-19T10:30:00Z"
    },

    {
      "@id": "inst:Referent_Ventilator",
      "@type": ["tagteam:DiscourseReferent"],
      "rdfs:label": "the last ventilator",
      "tagteam:sourceText": "the last ventilator",
      "tagteam:startPosition": 27,
      "tagteam:endPosition": 46,
      "tagteam:definiteness": "definite",
      "tagteam:quantityIndicator": "last",
      "extracted_from": "inst:Input_Text_IBE",
      "is_about": "inst:Artifact_Ventilator",
      "assertionType": "tagteam:AutomatedDetection",
      "validInContext": "inst:InterpretationContext_MedicalEthics",
      "tagteam:temporal_extent": "2026-01-19T10:30:00Z"
    },

    {
      "@id": "inst:Referent_Patients",
      "@type": ["tagteam:DiscourseReferent"],
      "rdfs:label": "two critically ill patients",
      "tagteam:sourceText": "two critically ill patients",
      "tagteam:startPosition": 55,
      "tagteam:endPosition": 82,
      "tagteam:definiteness": "indefinite",
      "tagteam:quantity": 2,
      "tagteam:qualifiers": ["critically ill"],
      "extracted_from": "inst:Input_Text_IBE",
      "is_about": ["inst:Person_Patient_1", "inst:Person_Patient_2"],
      "assertionType": "tagteam:AutomatedDetection",
      "validInContext": "inst:InterpretationContext_MedicalEthics",
      "tagteam:temporal_extent": "2026-01-19T10:30:00Z"
    },

    {
      "@id": "inst:VerbPhrase_Allocate",
      "@type": ["tagteam:VerbPhrase"],
      "rdfs:label": "must allocate",
      "tagteam:verb": "allocate",
      "tagteam:lemma": "allocate",
      "tagteam:tense": "present",
      "tagteam:hasModalMarker": "must",
      "extracted_from": "inst:Input_Text_IBE",
      "is_about": "inst:Act_Allocate",
      "assertionType": "tagteam:AutomatedDetection",
      "validInContext": "inst:InterpretationContext_MedicalEthics",
      "tagteam:temporal_extent": "2026-01-19T10:30:00Z"
    },

    {
      "@id": "inst:Directive_Must_Allocate",
      "@type": ["cco:DirectiveInformationContentEntity", "tagteam:DirectiveContent"],
      "rdfs:label": "obligation to allocate",
      "tagteam:modalType": "obligation",
      "tagteam:modalMarker": "must",
      "tagteam:modalStrength": 1.0,
      "extracted_from": "inst:Input_Text_IBE",
      "prescribes": "inst:Act_Allocate",
      "assertionType": "tagteam:AutomatedDetection",
      "validInContext": "inst:InterpretationContext_MedicalEthics",
      "tagteam:temporal_extent": "2026-01-19T10:30:00Z"
    },

    {
      "@id": "inst:ScarcityAssertion_Ventilator",
      "@type": ["tagteam:ScarcityAssertion", "cco:InformationContentEntity"],
      "rdfs:label": "ventilator scarcity assessment",
      "tagteam:scarceResource": "inst:Artifact_Ventilator",
      "tagteam:competingParties": [
        "inst:Person_Patient_1",
        "inst:Person_Patient_2"
      ],
      "tagteam:evidenceText": "the last ventilator",
      "tagteam:supplyCount": 1,
      "tagteam:demandCount": 2,
      "tagteam:scarcityRatio": 0.5,
      "extracted_from": "inst:Input_Text_IBE",
      "assertionType": "tagteam:AutomatedDetection",
      "validInContext": "inst:InterpretationContext_MedicalEthics",
      "tagteam:temporal_extent": "2026-01-19T10:30:00Z"
    },

    {
      "@id": "inst:Person_Doctor",
      "@type": ["cco:Person"],
      "rdfs:label": "doctor"
    },

    {
      "@id": "inst:Artifact_Ventilator",
      "@type": ["cco:Artifact", "cco:MedicalDevice"],
      "rdfs:label": "ventilator"
    },

    {
      "@id": "inst:Person_Patient_1",
      "@type": ["cco:Person"],
      "rdfs:label": "patient 1"
    },

    {
      "@id": "inst:Person_Patient_2",
      "@type": ["cco:Person"],
      "rdfs:label": "patient 2"
    },

    {
      "@id": "inst:AgentRole_Doctor",
      "@type": ["bfo:BFO_0000023", "cco:AgentRole"],
      "rdfs:label": "agent role of doctor",
      "inheres_in": "inst:Person_Doctor",
      "realized_in": "inst:Act_Allocate"
    },

    {
      "@id": "inst:PatientRole_1",
      "@type": ["bfo:BFO_0000023", "cco:PatientRole"],
      "rdfs:label": "patient role of patient 1",
      "inheres_in": "inst:Person_Patient_1",
      "rdfs:comment": "Dormant role: inheres in person, justified by linguistic referent 'patient', but not currently realized in an active care process."
    },

    {
      "@id": "inst:PatientRole_2",
      "@type": ["bfo:BFO_0000023", "cco:PatientRole"],
      "rdfs:label": "patient role of patient 2",
      "inheres_in": "inst:Person_Patient_2",
      "rdfs:comment": "Dormant role: inheres in person, justified by linguistic referent 'patient', but not currently realized in an active care process."
    },

    {
      "@id": "inst:Act_Allocate",
      "@type": ["cco:IntentionalAct", "cco:ActOfAllocation"],
      "rdfs:label": "act of allocating ventilator",
      "actualityStatus": "tagteam:Prescribed",
      "rdfs:comment": "This process is obligated by a directive but has not yet occurred.",
      "has_agent": "inst:Person_Doctor",
      "affects": "inst:Artifact_Ventilator",
      "has_participant": ["inst:Person_Patient_1", "inst:Person_Patient_2"],
      "prescribed_by": "inst:Directive_Must_Allocate"
    },

    {
      "@id": "inst:Justice_DetectionRecord",
      "@type": ["tagteam:ValueDetectionRecord", "cco:InformationContentEntity"],
      "rdfs:label": "justice value detection record",
      "asserts": "inst:Justice_ICE",
      "detected_by": "inst:TagTeam_Parser",
      "based_on": "inst:Input_Text_IBE",
      "assertionType": "tagteam:AutomatedDetection",
      "validInContext": "inst:InterpretationContext_MedicalEthics",
      "tagteam:extractionConfidence": 0.95,
      "tagteam:classificationConfidence": 0.90,
      "tagteam:relevanceConfidence": 0.95,
      "tagteam:aggregateConfidence": 0.93,
      "tagteam:temporal_extent": "2026-01-19T10:30:00Z",
      "tagteam:matched_markers": ["allocate", "between", "two", "patients"]
    },

    {
      "@id": "inst:Justice_ICE",
      "@type": ["cco:InformationContentEntity"],
      "rdfs:label": "Justice (ethical value)",
      "is_about": "inst:Act_Allocate",
      "tagteam:polarity": 1,
      "tagteam:salience": 0.9
    },

    {
      "@id": "inst:TagTeam_Parser",
      "@type": ["cco:ArtificialAgent"],
      "rdfs:label": "TagTeam.js Parser v3.0.0",
      "tagteam:version": "3.0.0",
      "tagteam:algorithm": "BFO-aware NLP with CCO mapping"
    }
  ]
}
```

---

## 12. SHACL Validation Shapes

### 12.1 Cross-Tier Link Validation

```turtle
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix tagteam: <http://tagteam.fandaws.org/ontology/> .
@prefix cco: <http://www.ontologyrepository.com/CommonCoreOntologies/> .
@prefix bfo: <http://purl.obolibrary.org/obo/> .

# DiscourseReferent must link to Tier 2 entity
tagteam:DiscourseReferentShape a sh:NodeShape ;
  sh:targetClass tagteam:DiscourseReferent ;
  sh:property [
    sh:path cco:is_about ;
    sh:minCount 1 ;
    sh:message "DiscourseReferent must link to real-world entity via is_about" ;
  ] ;
  sh:property [
    sh:path tagteam:assertionType ;
    sh:minCount 1 ;
    sh:message "DiscourseReferent must have assertionType (GIT-Minimal)" ;
  ] ;
  sh:property [
    sh:path tagteam:temporal_extent ;
    sh:minCount 1 ;
    sh:message "DiscourseReferent must have temporal_extent (GIT-Minimal)" ;
  ] .
```

### 12.2 Role Bearer Validation

```turtle
# Role must inhere in Person or Organization, not DiscourseReferent
tagteam:RoleBearerShape a sh:NodeShape ;
  sh:targetClass bfo:BFO_0000023 ;
  sh:property [
    sh:path bfo:BFO_0000052 ;  # inheres_in
    sh:minCount 1 ;
    sh:or (
      [ sh:class cco:Person ]
      [ sh:class cco:Organization ]
    ) ;
    sh:message "Role must inhere in cco:Person or cco:Organization, not DiscourseReferent" ;
  ] .
```

### 12.3 Act Agent Validation

```turtle
# Act must have Person as agent, not DiscourseReferent
tagteam:ActAgentShape a sh:NodeShape ;
  sh:targetClass cco:IntentionalAct ;
  sh:property [
    sh:path cco:has_agent ;
    sh:minCount 1 ;
    sh:class cco:Person ;
    sh:message "Act must have cco:Person as agent, not DiscourseReferent" ;
  ] ;
  sh:property [
    sh:path tagteam:actualityStatus ;
    sh:minCount 1 ;
    sh:message "Act must have actualityStatus (Prescribed, Actual, etc.)" ;
  ] .
```

### 12.4 Artifact Not Patient

```turtle
# Artifact must NOT bear PatientRole
tagteam:ArtifactNotPatientShape a sh:NodeShape ;
  sh:targetClass cco:Artifact ;
  sh:not [
    sh:property [
      sh:path bfo:BFO_0000053 ;  # is_bearer_of
      sh:class cco:PatientRole ;
    ]
  ] ;
  sh:message "Artifact cannot bear PatientRole" .
```

### 12.5 ScarcityAssertion Validation

```turtle
# ScarcityAssertion must have scarceResource and competingParties
tagteam:ScarcityAssertionShape a sh:NodeShape ;
  sh:targetClass tagteam:ScarcityAssertion ;
  sh:property [
    sh:path tagteam:scarceResource ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:class cco:Artifact ;
    sh:message "ScarcityAssertion must have exactly one scarceResource (Artifact)" ;
  ] ;
  sh:property [
    sh:path tagteam:competingParties ;
    sh:minCount 1 ;
    sh:class cco:Person ;
    sh:message "ScarcityAssertion must have at least one competingParty (Person)" ;
  ] .
```

---

## 13. Implementation Checklist

### 13.1 Module Changes Required

| Module | Change Type | Description |
|--------|-------------|-------------|
| `EntityExtractor.js` | **Major** | Create BOTH DiscourseReferent (Tier 1) AND Person/Artifact (Tier 2) |
| `ActExtractor.js` | **Major** | Link acts to Tier 2 Persons; add `actualityStatus` |
| `RoleDetector.js` | **Major** | Roles inhere in Persons/Organizations; use `inheres_in` only |
| `SemanticGraphBuilder.js` | **Moderate** | Orchestrate two-tier generation; create IBE |
| `JSONLDSerializer.js` | **Minor** | Updated @context |
| `ContextManager.js` | **Minor** | Unchanged from GIT-Minimal spec |

### 13.2 New Modules Required

| Module | Purpose |
|--------|---------|
| `RealWorldEntityFactory.js` | Create Tier 2 entities from Tier 1 referents |
| `DeonticContentExtractor.js` | Extract DirectiveContent from modal verbs |
| `ScarcityAssertionBuilder.js` | Build scarcity assertions from linguistic cues |
| `ActualityStatusResolver.js` | Determine act status (prescribed, actual, etc.) |
| `IRIGenerator.js` | SHA-256 based deterministic IRI generation |

### 13.3 Acceptance Criteria Updates

All ACs from the roadmap must be updated to:
1. Check for two-tier structure (Tier 1 referents + Tier 2 entities)
2. Verify `is_about` links from referents to entities
3. Verify roles use `inheres_in` (not `is_bearer_of`)
4. Verify acts have `actualityStatus`
5. Verify artifacts are not role bearers
6. Verify IBE exists with `has_component` links
7. Verify all Tier 1 nodes have `temporal_extent`
8. Verify ScarcityAssertion uses `scarceResource` and `competingParties`

---

## 14. Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-19 | Initial two-tier draft based on expert critique |
| 2.0 | 2026-01-19 | **FINAL**: Incorporated gap resolutions, GIT-Minimal, IBE staircase |
| 2.1 | 2026-01-19 | Implementation review fixes (see below) |

### v2.1 Changes

1. **Breaking: Renamed event types to record types**
   - `ValueAssertionEvent` → `ValueDetectionRecord` (retyped as ICE)
   - `ContextAssessmentEvent` → `ContextAssessmentRecord` (retyped as ICE)

2. **Structural: Fixed diagram arrow directions**
   - `inheres_in` arrows now point FROM Role TO Person (not reverse)

3. **Structural: Split ScarcityAssertion properties**
   - `cco:is_about` replaced with:
     - `tagteam:scarceResource` (single Artifact)
     - `tagteam:competingParties` (array of Persons)

4. **Additive: IRI generation strategy section**
   - New Section 9 documenting SHA-256 deterministic hashing

5. **Additive: VerbPhrase @context properties**
   - Added `verb`, `lemma`, `tense`, `hasModalMarker` to @context

6. **Additive: SHACL shape expansions**
   - Role bearer shape now allows `cco:Organization` via `sh:or`
   - New ScarcityAssertion validation shape

7. **Clarification: Bidirectional linking strategy**
   - Documented which relations are asserted both ways vs. canonical only

8. **Clarification: Position indexing semantics**
   - Documented 0-based, exclusive end position (JavaScript substring semantics)

9. **Correction: IBE BFO category**
   - Fixed table: IBE is IC (Independent Continuant), not GDC

10. **Clarification: Actuality Status as Named Individuals**
    - Added Section 3.3 with OWL NamedIndividual definitions

---

## 15. Approval

**Status**: ✅ APPROVED FOR IMPLEMENTATION

**Approvals**:
- [x] BFO/CCO Expert Review - Passed
- [x] Gap Resolution Review - Incorporated
- [x] GIT-Minimal Integration - Verified
- [x] SHACL Validation Shapes - Defined
- [x] Implementation Review - v2.1 fixes incorporated

**Implementation Target**: TagTeam v3.0.0-alpha.2
**Owner**: TagTeam Development Team + Fandaws Ontology Service

---

## Appendix A: Quick Reference Card

### Valid Cross-Tier Links

```
Tier 1 (ICE)                    Tier 2 (IC)
─────────────                   ────────────
DiscourseReferent ──is_about──► Person
DiscourseReferent ──is_about──► Artifact
VerbPhrase ────────is_about──► IntentionalAct
DirectiveContent ──prescribes─► IntentionalAct
ScarcityAssertion ─scarceResource──► Artifact
ScarcityAssertion ─competingParties► Person[]
```

### Valid Tier 2 Relations

```
Person ◄──inheres_in── Role ──realized_in──► Act
Organization ◄──inheres_in── Role
                                              │
Act ──has_agent──► Person                     │
Act ──has_participant──► Person               │
Act ──affects──► Artifact                     │
Act ◄──prescribes── DirectiveContent          │
```

### Prohibited Patterns

```
❌ DiscourseReferent ──is_bearer_of──► Role
❌ Act ──has_agent──► DiscourseReferent
❌ Artifact ──is_bearer_of──► PatientRole
❌ Person ──is_bearer_of──► Role (use inheres_in on Role instead)
❌ ScarcityAssertion ──is_about──► Person (use competingParties instead)
```

### IRI Generation

```javascript
// Pattern: inst:{Prefix}_{sha256_12chars}
generateIRI("Referent", "DiscourseReferent", "the doctor|0|10")
  → inst:Referent_a1b2c3d4e5f6
```
