# Phase 4: Two-Tier Architecture Final Specification

**Version**: 2.2 (ERRATA + ENHANCEMENTS)
**Date**: 2026-01-19
**Status**: APPROVED FOR IMPLEMENTATION
**Based on**: v2.1 + Semantic Architect Review

---

## Version 2.2 Changes

This version addresses the Semantic Architect Review critique of v2.1. Changes are organized by concern ID from the review.

### Breaking/Structural Changes

| ID | Change | Section |
|----|--------|---------|
| 2.1 | Removed `tagteam:denotes` alias; use `cco:is_about` only | 2.1, 10 |
| 2.5 | Added document/session scope to Tier 2 IRI generation | 9.2 |
| 3.1 | Fixed position indices in example (was off by 2) | 11.1 |
| 3.1 | Fixed char_count (82 → 80) | 11.1 |

### Additive Changes

| ID | Change | Section |
|----|--------|---------|
| 2.2 | Added VerbPhrase → Act linkage clarification | 2.5 (NEW) |
| 2.3 | Added Tier 2 provenance properties | 2.6 (NEW) |
| 2.4 | Declared scarcity properties as subproperties of is_about | 6.4 (NEW) |
| 2.6 | Added missing SHACL shapes | 12.6-12.9 (NEW) |
| 2.7 | Added role realization constraint shape | 12.10 (NEW) |
| 3.2 | Added @container to competingParties | 10 |
| 4.1 | Added negated act guidance | 3.5 (NEW) |
| 4.2 | Added coreference resolution pattern | 7.3 (NEW) |

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
| VerbPhrase Integration | Link to IBE via `has_component`; link to Act via `is_about` |
| Inverse Relations | Assert `inheres_in` only (not `is_bearer_of`) |
| GIT-Minimal | Reintegrated with `assertionType` and `validInContext` |
| IBE Staircase | Required; grounds all Tier 1 content |
| Namespace | `http://tagteam.fandaws.org/ontology/` |
| IRI Generation | SHA-256 deterministic hashing with document scope |
| Actuality Status | Named Individuals pattern (OWL NamedIndividual) |
| Cross-Tier Link | Use `cco:is_about` only (removed `denotes` alias) |

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
│                              │ cco:is_about                                 │
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
- **v2.2**: Removed `tagteam:denotes` from diagram; use `cco:is_about` only

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
- Links to Tier 2 via `cco:is_about`
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
- **v2.2**: Include provenance linking back to generating parse (see Section 2.6)

---

## 2. Relation Usage Rules

### 2.1 Canonical Relations by Layer

| Relation | Domain | Range | Layer | Notes |
|----------|--------|-------|-------|-------|
| `cco:is_about` | ICE | Any entity | Tier 1 → Tier 2 | Primary cross-tier link |
| `tagteam:has_component` | IBE | ICE | Tier 1 only | Links document to extracted content |
| `tagteam:extracted_from` | ICE | IBE | Tier 1 only | Inverse of has_component (for navigation) |
| `bfo:inheres_in` | Role | Person/Organization | Tier 2 only | Role depends on bearer |
| `bfo:realized_in` | Role | Act | Tier 2 only | Role manifests in process |
| `cco:has_agent` | Act | Person | Tier 2 only | Act performed by agent |
| `cco:has_participant` | Act | Person | Tier 2 only | Persons involved in act |
| `cco:affects` | Act | Artifact | Tier 2 only | Act affects object |
| `cco:prescribes` | DirectiveContent | Act | Tier 1 → Tier 2 | Obligation prescribes act |
| `cco:prescribed_by` | Act | DirectiveContent | Tier 2 → Tier 1 | Inverse of prescribes |

**v2.2 Change**: Removed `tagteam:denotes` from this table. Use `cco:is_about` consistently.

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

### 2.5 VerbPhrase → Act Linkage Semantics (NEW in v2.2)

**Concern**: The VerbPhrase uses `is_about` to link to an Act that may have `actualityStatus: Prescribed` (not yet occurred). Is `is_about` semantically appropriate for non-actual occurrents?

**Resolution**: Yes, this is valid under the following interpretation:

1. **ICE about Specification**: The VerbPhrase ICE is "about" the *specification* or *type* of act being described, not a specific historical token. The Act node represents "an act of allocating as specified in this text," which exists as a describable entity even if not actualized.

2. **Actuality is Separate**: The `actualityStatus` property disambiguates whether the Act has occurred. The `is_about` relation holds regardless of actuality—the text is still *about* that act.

3. **Parallels Directive Pattern**: DirectiveContent uses `prescribes` to link to Prescribed acts. VerbPhrase using `is_about` follows the same pattern.

**Example**:
```json
{
  "@id": "inst:VerbPhrase_Allocate",
  "@type": ["tagteam:VerbPhrase"],
  "tagteam:verb": "allocate",
  "cco:is_about": "inst:Act_Allocate",
  "rdfs:comment": "Links to the act specification described by this verb phrase"
}
```

### 2.6 Tier 2 Provenance Properties (NEW in v2.2)

**Concern**: Tier 2 entities (Person, Artifact, Act) lack temporal grounding. For entity resolution across documents, knowing when a Tier 2 entity was instantiated matters.

**Resolution**: Add optional provenance properties to Tier 2 entities:

| Property | Type | Description |
|----------|------|-------------|
| `tagteam:instantiated_at` | xsd:dateTime | When this entity was first created |
| `tagteam:instantiated_by` | IRI | The parse event/IBE that created this entity |

**Example**:
```json
{
  "@id": "inst:Person_Doctor_abc123",
  "@type": ["cco:Person"],
  "rdfs:label": "doctor",
  "tagteam:instantiated_at": "2026-01-19T10:30:00Z",
  "tagteam:instantiated_by": "inst:Input_Text_IBE"
}
```

**Implementation Note**: These properties are OPTIONAL for Phase 4 but RECOMMENDED for systems requiring entity resolution.

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
| `Negated` | `tagteam:Negated` | **v2.2**: The act explicitly did not occur |

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

tagteam:Negated a owl:NamedIndividual, tagteam:ActualityStatus ;
  rdfs:label "Negated" ;
  rdfs:comment "The act explicitly did not occur (v2.2)" .
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

### 3.5 Negated Acts (NEW in v2.2)

**Concern**: How to model negation in source text like "The doctor **did not** allocate the ventilator."

**Resolution**: Use `tagteam:Negated` as actualityStatus combined with optional `tagteam:negationMarker`:

```json
{
  "@id": "inst:Act_Allocate_Negated",
  "@type": ["cco:IntentionalAct", "cco:ActOfAllocation"],
  "rdfs:label": "act of allocating ventilator (negated)",
  "tagteam:actualityStatus": "tagteam:Negated",
  "tagteam:negationMarker": "did not",
  "rdfs:comment": "This act explicitly did not occur as stated in the source text.",
  "cco:has_agent": "inst:Person_Doctor",
  "cco:affects": "inst:Artifact_Ventilator"
}
```

**Interpretation**: `Negated` indicates the text asserts the act's non-occurrence. This is distinct from:
- `Prohibited` (act is forbidden but might have occurred anyway)
- `Hypothetical` (act is in a thought experiment, no claim about actuality)

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

### 6.4 Scarcity Properties as Subproperties (NEW in v2.2)

**Concern**: Should `scarceResource` and `competingParties` be declared as subproperties of `is_about` to enable generic "what is this ICE about" queries?

**Resolution**: Yes. In the TagTeam ontology, declare:

```turtle
tagteam:scarceResource rdfs:subPropertyOf cco:is_about ;
  rdfs:label "scarce resource" ;
  rdfs:comment "The artifact that is scarce (specialized is_about)" ;
  rdfs:domain tagteam:ScarcityAssertion ;
  rdfs:range cco:Artifact .

tagteam:competingParties rdfs:subPropertyOf cco:is_about ;
  rdfs:label "competing parties" ;
  rdfs:comment "The persons competing for the resource (specialized is_about)" ;
  rdfs:domain tagteam:ScarcityAssertion ;
  rdfs:range cco:Person .
```

**Benefit**: SPARQL queries for `?ice cco:is_about ?entity` will include scarcity relations via subproperty reasoning.

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
  "tagteam:char_count": 80,
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

**v2.2 Fix**: `char_count` corrected from 82 to **80**.

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

### 7.3 Coreference Resolution (NEW in v2.2)

**Concern**: When text contains anaphora like "The doctor... she...", how should the DiscourseReferent for "she" link to the same Tier 2 Person?

**Resolution**: Use `tagteam:corefersWith` to link coreferent DiscourseReferents:

```json
{
  "@id": "inst:Referent_She",
  "@type": ["tagteam:DiscourseReferent"],
  "tagteam:sourceText": "she",
  "tagteam:startPosition": 45,
  "tagteam:endPosition": 48,
  "tagteam:corefersWith": "inst:Referent_Doctor",
  "cco:is_about": "inst:Person_Doctor"
}
```

**Properties**:
| Property | Type | Description |
|----------|------|-------------|
| `tagteam:corefersWith` | IRI | Links to the antecedent DiscourseReferent |

**Notes**:
- Both coreferent referents link to the same Tier 2 entity via `is_about`
- `corefersWith` captures the linguistic coreference relation
- This is OPTIONAL—implementation may skip coreference resolution in Phase 4

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

// Person IRI: generateIRI("Person", "Person", "doctor|doc123")
//   → inst:Person_f6e5d4c3b2a1

// Act IRI: generateIRI("Act", "ActOfAllocation", "allocate|doctor|ventilator|doc123")
//   → inst:Act_1a2b3c4d5e6f
```

### 9.2 IRI Components by Entity Type (UPDATED in v2.2)

**Concern**: For Tier 2 entities, using only `normalized label` creates unintended co-reference across documents.

**Resolution**: Include document/session identifier in Tier 2 IRI hash inputs:

| Entity Type | Hash Input Components | v2.2 Change |
|-------------|----------------------|-------------|
| DiscourseReferent | sourceText + startPosition + endPosition | Same |
| **Person** | normalized label + **documentIRI or sessionID** | Added scope |
| **Artifact** | normalized label + type + **documentIRI or sessionID** | Added scope |
| **Organization** | normalized label + **documentIRI or sessionID** | Added scope |
| Role | roleType + bearerIRI | Same |
| Act | verb + agentIRI + affectedIRI | Same |
| ScarcityAssertion | resourceIRI + competingPartyIRIs | Same |
| Directive | modalMarker + prescribedActIRI | Same |

**Example**:
```javascript
// Old (v2.1): Same IRI for any "doctor" across all documents
generateIRI("Person", "Person", "doctor")
  → inst:Person_f6e5d4c3b2a1

// New (v2.2): Scoped to document
generateIRI("Person", "Person", "doctor|inst:Input_Text_IBE_abc123")
  → inst:Person_7a8b9c0d1e2f
```

**Entity Resolution Note**: If cross-document entity identity is desired, use a separate entity resolution layer with `owl:sameAs` linking. The default IRI generation is document-scoped to prevent accidental co-reference.

### 9.3 Implementation Notes

- Hash collisions are astronomically unlikely with 12 hex characters (48 bits)
- Same input always produces same IRI (idempotent)
- Different inputs produce different IRIs (collision-resistant)
- Human-readable prefix retained for debugging

---

## 10. Complete @context (UPDATED in v2.2)

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
    "Negated": "tagteam:Negated",

    "// Cross-Tier Relations": "",
    "is_about": { "@id": "cco:is_about", "@type": "@id" },
    "prescribes": { "@id": "cco:prescribes", "@type": "@id" },
    "prescribed_by": { "@id": "cco:prescribed_by", "@type": "@id" },

    "// Tier 1 Relations": "",
    "has_component": { "@id": "tagteam:has_component", "@type": "@id" },
    "extracted_from": { "@id": "tagteam:extracted_from", "@type": "@id" },
    "corefersWith": { "@id": "tagteam:corefersWith", "@type": "@id" },

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

    "// Provenance Properties (v2.2)": "",
    "instantiated_at": { "@id": "tagteam:instantiated_at", "@type": "xsd:dateTime" },
    "instantiated_by": { "@id": "tagteam:instantiated_by", "@type": "@id" },
    "negationMarker": "tagteam:negationMarker",

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
    "competingParties": { "@id": "tagteam:competingParties", "@type": "@id", "@container": "@set" },
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

**v2.2 Changes**:
- Removed `denotes` (use `is_about` only)
- Added `corefersWith` for coreference resolution
- Added `instantiated_at`, `instantiated_by` for Tier 2 provenance
- Added `negationMarker` for negated acts
- Added `Negated` to ActualityStatus
- Added `"@container": "@set"` to `competingParties`

---

## 11. Complete Example: Ventilator Scenario (CORRECTED in v2.2)

### Input Text
> "The doctor must allocate the last ventilator between two critically ill patients"

**v2.2 Fix**: Total length is **80 characters** (not 82).

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
    "competingParties": { "@id": "tagteam:competingParties", "@type": "@id", "@container": "@set" },
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
      "tagteam:char_count": 80,
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
      "tagteam:startPosition": 25,
      "tagteam:endPosition": 44,
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
      "tagteam:startPosition": 53,
      "tagteam:endPosition": 80,
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
      "rdfs:label": "doctor",
      "tagteam:instantiated_at": "2026-01-19T10:30:00Z",
      "tagteam:instantiated_by": "inst:Input_Text_IBE"
    },

    {
      "@id": "inst:Artifact_Ventilator",
      "@type": ["cco:Artifact", "cco:MedicalDevice"],
      "rdfs:label": "ventilator",
      "tagteam:instantiated_at": "2026-01-19T10:30:00Z",
      "tagteam:instantiated_by": "inst:Input_Text_IBE"
    },

    {
      "@id": "inst:Person_Patient_1",
      "@type": ["cco:Person"],
      "rdfs:label": "patient 1",
      "tagteam:instantiated_at": "2026-01-19T10:30:00Z",
      "tagteam:instantiated_by": "inst:Input_Text_IBE"
    },

    {
      "@id": "inst:Person_Patient_2",
      "@type": ["cco:Person"],
      "rdfs:label": "patient 2",
      "tagteam:instantiated_at": "2026-01-19T10:30:00Z",
      "tagteam:instantiated_by": "inst:Input_Text_IBE"
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

**v2.2 Fixes in Example**:
1. `char_count`: 82 → **80**
2. `"the last ventilator"` positions: 27-46 → **25-44**
3. `"two critically ill patients"` positions: 55-82 → **53-80**
4. Removed `denotes` references
5. Added `instantiated_at` and `instantiated_by` to Tier 2 entities
6. Added `"@container": "@set"` to `competingParties` in @context

---

## 12. SHACL Validation Shapes (EXPANDED in v2.2)

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

### 12.6 DirectiveContent Validation (NEW in v2.2)

```turtle
# DirectiveContent must prescribe an Act
tagteam:DirectiveContentShape a sh:NodeShape ;
  sh:targetClass tagteam:DirectiveContent ;
  sh:property [
    sh:path cco:prescribes ;
    sh:minCount 1 ;
    sh:class cco:IntentionalAct ;
    sh:message "DirectiveContent must prescribe at least one Act" ;
  ] ;
  sh:property [
    sh:path tagteam:modalType ;
    sh:minCount 1 ;
    sh:message "DirectiveContent must have modalType" ;
  ] .
```

### 12.7 VerbPhrase Validation (NEW in v2.2)

```turtle
# VerbPhrase must link to an Act via is_about
tagteam:VerbPhraseShape a sh:NodeShape ;
  sh:targetClass tagteam:VerbPhrase ;
  sh:property [
    sh:path cco:is_about ;
    sh:minCount 1 ;
    sh:class cco:IntentionalAct ;
    sh:message "VerbPhrase must link to an Act via is_about" ;
  ] ;
  sh:property [
    sh:path tagteam:verb ;
    sh:minCount 1 ;
    sh:message "VerbPhrase must have verb property" ;
  ] .
```

### 12.8 IBE Validation (NEW in v2.2)

```turtle
# IBE must have at least one component
tagteam:IBEShape a sh:NodeShape ;
  sh:targetClass cco:InformationBearingEntity ;
  sh:property [
    sh:path tagteam:has_component ;
    sh:minCount 1 ;
    sh:message "IBE must have at least one has_component link" ;
  ] ;
  sh:property [
    sh:path cco:has_text_value ;
    sh:minCount 1 ;
    sh:message "IBE must have has_text_value with source text" ;
  ] .
```

### 12.9 Bidirectional Integrity (NEW in v2.2)

```turtle
# If DirectiveContent prescribes Act, Act should have prescribed_by
tagteam:PrescriptionIntegrityShape a sh:NodeShape ;
  sh:targetClass cco:IntentionalAct ;
  sh:sparql [
    sh:message "Act prescribed_by should match DirectiveContent prescribes" ;
    sh:select """
      PREFIX cco: <http://www.ontologyrepository.com/CommonCoreOntologies/>
      PREFIX tagteam: <http://tagteam.fandaws.org/ontology/>
      SELECT $this ?directive WHERE {
        ?directive cco:prescribes $this .
        FILTER NOT EXISTS { $this cco:prescribed_by ?directive }
      }
    """
  ] .
```

### 12.10 Role Realization Constraint (NEW in v2.2)

```turtle
# A role should not be realized in multiple acts (ontologically suspicious)
tagteam:RoleRealizationConstraint a sh:NodeShape ;
  sh:targetClass bfo:BFO_0000023 ;
  sh:sparql [
    sh:severity sh:Warning ;
    sh:message "Role realized in multiple acts - verify this is intentional" ;
    sh:select """
      PREFIX bfo: <http://purl.obolibrary.org/obo/>
      SELECT $this (COUNT(?act) AS ?actCount) WHERE {
        $this bfo:BFO_0000054 ?act .
      }
      GROUP BY $this
      HAVING (COUNT(?act) > 1)
    """
  ] .
```

---

## 13. Implementation Checklist (UPDATED)

### 13.1 Module Changes Required

| Module | Change Type | Description | v2.2 Update |
|--------|-------------|-------------|-------------|
| `EntityExtractor.js` | **Major** | Create BOTH DiscourseReferent (Tier 1) AND Person/Artifact (Tier 2) | Add document scope to IRI |
| `ActExtractor.js` | **Major** | Link acts to Tier 2 Persons; add `actualityStatus` | Add `Negated` support |
| `RoleDetector.js` | **Major** | Roles inhere in Persons/Organizations; use `inheres_in` only | Same |
| `SemanticGraphBuilder.js` | **Moderate** | Orchestrate two-tier generation; create IBE | Add provenance properties |
| `JSONLDSerializer.js` | **Minor** | Updated @context | Remove denotes, add v2.2 properties |
| `ContextManager.js` | **Minor** | Unchanged from GIT-Minimal spec | Same |

### 13.2 New Modules Required

| Module | Purpose | v2.2 Update |
|--------|---------|-------------|
| `RealWorldEntityFactory.js` | Create Tier 2 entities from Tier 1 referents | Document-scoped IRIs |
| `DeonticContentExtractor.js` | Extract DirectiveContent from modal verbs | Same |
| `ScarcityAssertionBuilder.js` | Build scarcity assertions from linguistic cues | Same |
| `ActualityStatusResolver.js` | Determine act status (prescribed, actual, negated, etc.) | Add Negated |
| `IRIGenerator.js` | SHA-256 based deterministic IRI generation | Add document scope |
| `CoreferenceResolver.js` (OPTIONAL) | Resolve anaphoric references | NEW in v2.2 |

### 13.3 Acceptance Criteria Updates

All ACs from the roadmap must be updated to:
1. Check for two-tier structure (Tier 1 referents + Tier 2 entities)
2. Verify `is_about` links from referents to entities (NOT `denotes`)
3. Verify roles use `inheres_in` (not `is_bearer_of`)
4. Verify acts have `actualityStatus`
5. Verify artifacts are not role bearers
6. Verify IBE exists with `has_component` links
7. Verify all Tier 1 nodes have `temporal_extent`
8. Verify ScarcityAssertion uses `scarceResource` and `competingParties`
9. **v2.2**: Verify position indices are correct
10. **v2.2**: Verify Tier 2 IRIs are document-scoped (optional check)

---

## 14. Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-19 | Initial two-tier draft based on expert critique |
| 2.0 | 2026-01-19 | **FINAL**: Incorporated gap resolutions, GIT-Minimal, IBE staircase |
| 2.1 | 2026-01-19 | Implementation review fixes |
| 2.2 | 2026-01-19 | Semantic Architect review fixes (see below) |

### v2.2 Changes (Semantic Architect Review)

1. **2.1 - Removed `denotes` alias**
   - Use `cco:is_about` consistently
   - Removed from @context, diagram, relation tables

2. **2.2 - VerbPhrase → Act linkage clarification**
   - Added Section 2.5 explaining semantics of linking to non-actual acts

3. **2.3 - Tier 2 provenance properties**
   - Added `instantiated_at`, `instantiated_by` to Tier 2 entities
   - Added Section 2.6

4. **2.4 - Scarcity subproperties**
   - Declared `scarceResource` and `competingParties` as subproperties of `is_about`
   - Added Section 6.4

5. **2.5 - Document-scoped Tier 2 IRIs**
   - Updated Section 9.2 to include document/session scope in hash input
   - Prevents accidental cross-document co-reference

6. **2.6-2.9 - Missing SHACL shapes**
   - Added DirectiveContent, VerbPhrase, IBE, Bidirectional integrity shapes

7. **2.7 - Role realization constraint**
   - Added shape detecting roles realized in multiple acts (warning)

8. **3.1 - Position index error fixed**
   - Corrected example positions for ventilator (25-44) and patients (53-80)
   - Fixed char_count (82 → 80)

9. **3.2 - @container for competingParties**
   - Added `"@container": "@set"` to @context

10. **4.1 - Negated acts**
    - Added `tagteam:Negated` ActualityStatus
    - Added `tagteam:negationMarker` property
    - Added Section 3.5

11. **4.2 - Coreference resolution**
    - Added `tagteam:corefersWith` property
    - Added Section 7.3

---

## 15. Approval

**Status**: ✅ APPROVED FOR IMPLEMENTATION

**Approvals**:
- [x] BFO/CCO Expert Review - Passed
- [x] Gap Resolution Review - Incorporated
- [x] GIT-Minimal Integration - Verified
- [x] SHACL Validation Shapes - Defined
- [x] Implementation Review - v2.1 fixes incorporated
- [x] Semantic Architect Review - v2.2 fixes incorporated

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
❌ tagteam:denotes (removed in v2.2 - use is_about)
```

### IRI Generation (v2.2)

```javascript
// Pattern: inst:{Prefix}_{sha256_12chars}
// Tier 1: Document-local (position-based)
generateIRI("Referent", "DiscourseReferent", "the doctor|0|10")
  → inst:Referent_a1b2c3d4e5f6

// Tier 2: Document-scoped (v2.2 change)
generateIRI("Person", "Person", "doctor|inst:IBE_abc123")
  → inst:Person_7a8b9c0d1e2f
```

### ActualityStatus Values (v2.2)

```
tagteam:Actual      - Has occurred
tagteam:Prescribed  - Obligated, not occurred
tagteam:Permitted   - Allowed, not required
tagteam:Prohibited  - Forbidden
tagteam:Hypothetical- Thought experiment
tagteam:Planned     - Intended future
tagteam:Negated     - Explicitly did not occur (v2.2)
```
