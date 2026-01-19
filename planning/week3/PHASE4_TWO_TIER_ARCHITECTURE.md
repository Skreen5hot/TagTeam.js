# Phase 4: Two-Tier Architecture Specification

**Version**: 1.0 (Draft for Expert Review)
**Date**: 2026-01-19
**Status**: Awaiting Expert Approval
**Based on**: BFO/CCO Expert Critique of Initial Implementation

---

## Executive Summary

This document specifies a revised architecture for TagTeam.js Phase 4 JSON-LD output that properly separates:

1. **Parsing Layer** (Information Content Entities) - What the text says
2. **Real-World Layer** (Independent Continuants) - The entities being described

This separation resolves the ontological category errors identified in the expert review.

---

## 1. Problem Statement

### 1.1 Original Issues Identified

| Issue | Current (Wrong) | Why It's Wrong |
|-------|-----------------|----------------|
| **Role Bearers** | `DiscourseReferent bfo:is_bearer_of Role` | Text cannot bear roles; only real entities can |
| **Agent Relations** | `Act cco:has_agent DiscourseReferent` | Acts don't have text as agents; they have people |
| **PatientRole on Artifact** | Ventilator bears `cco:PatientRole` | PatientRole is for medical patients, not objects |
| **Scarcity Modeling** | `is_scarce` property on patient referent | Scarcity is contextual, not intrinsic to patients |
| **Modality** | `tagteam:modality: "obligation"` | Should be a DirectiveInformationContentEntity |

### 1.2 Root Cause

The fundamental error was applying **physical BFO/CCO relations** to **Discourse Referents** (Information Content Entities) rather than the **Real-World Entities** they denote.

---

## 2. Two-Tier Architecture

### 2.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TIER 1: PARSING LAYER                                │
│                    (Information Content Entities)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────┐     ┌──────────────────────┐                 │
│  │ DiscourseReferent    │     │ DiscourseReferent    │                 │
│  │ "the doctor"         │     │ "the last ventilator"│                 │
│  │ sourceText, position │     │ sourceText, position │                 │
│  │ definiteness, etc.   │     │ definiteness, etc.   │                 │
│  └──────────┬───────────┘     └──────────┬───────────┘                 │
│             │                            │                              │
│             │ cco:is_about               │ cco:is_about                 │
│             │                            │                              │
│             ▼                            ▼                              │
├─────────────────────────────────────────────────────────────────────────┤
│                    TIER 2: REAL-WORLD LAYER                             │
│                    (Independent Continuants)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────┐     ┌──────────────────────┐                 │
│  │ cco:Person           │     │ cco:Artifact         │                 │
│  │ (the actual doctor)  │     │ (the actual machine) │                 │
│  │                      │     │                      │                 │
│  │ bfo:is_bearer_of ────┼──┐  │                      │                 │
│  └──────────────────────┘  │  └──────────────────────┘                 │
│                            │              ▲                             │
│                            ▼              │ cco:affects                 │
│  ┌──────────────────────┐  │              │                             │
│  │ cco:AgentRole        │  │  ┌──────────┴───────────┐                 │
│  │ bfo:inheres_in ──────┼──┘  │ cco:ActOfAllocation  │                 │
│  │ bfo:realized_in ─────┼────▶│ cco:has_agent ───────┼──► Person       │
│  └──────────────────────┘     │                      │                 │
│                               └──────────────────────┘                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Layer Definitions

#### Tier 1: Parsing Layer (Information Content Entities)

**Purpose**: Capture what the text says, including linguistic features.

**Node Types**:
- `tagteam:DiscourseReferent` - A mention in text that refers to something
- `tagteam:VerbPhrase` - A linguistic representation of an action
- `tagteam:DirectiveContent` - Deontic modality (must, should, may)
- `tagteam:ScarcityAssertion` - Claims about resource scarcity

**Characteristics**:
- Preserves source text, positions, linguistic features
- Contains TagTeam-specific parsing metadata
- Links to Tier 2 via `cco:is_about` or `tagteam:denotes`
- Does NOT use BFO physical relations

#### Tier 2: Real-World Layer (Independent Continuants)

**Purpose**: Model the actual entities in the world being described.

**Node Types**:
- `cco:Person` - Human beings
- `cco:Artifact` - Man-made objects (ventilator)
- `cco:Organization` - Institutions
- `bfo:Role` subclasses - Roles that inhere in entities
- `cco:IntentionalAct` subclasses - Actions performed by agents

**Characteristics**:
- Uses proper BFO/CCO relations
- Roles inhere in Persons, not text
- Acts have agents that are Persons, not referents
- Artifacts can be affected by acts, but don't bear PatientRoles

---

## 3. Corrected Relation Usage

### 3.1 Relation Assignment Rules

| Relation | Domain (Subject) | Range (Object) | Layer |
|----------|------------------|----------------|-------|
| `cco:is_about` | DiscourseReferent | Any Tier 2 entity | Cross-tier |
| `tagteam:denotes` | DiscourseReferent | Any Tier 2 entity | Cross-tier |
| `bfo:is_bearer_of` | cco:Person | bfo:Role | Tier 2 only |
| `bfo:inheres_in` | bfo:Role | cco:Person | Tier 2 only |
| `bfo:realized_in` | bfo:Role | cco:IntentionalAct | Tier 2 only |
| `cco:has_agent` | cco:IntentionalAct | cco:Person | Tier 2 only |
| `cco:affects` | cco:IntentionalAct | cco:Artifact | Tier 2 only |
| `cco:prescribes` | DirectiveContent | cco:IntentionalAct | Cross-tier |

### 3.2 What NOT to Do

```javascript
// WRONG: Referent bearing a role
{
  "@id": "inst:The_Doctor_Referent",
  "@type": ["tagteam:DiscourseReferent"],
  "bfo:is_bearer_of": "inst:Agent_Role"  // ❌ INVALID
}

// WRONG: Act with referent as agent
{
  "@id": "inst:Act_Allocate",
  "@type": ["cco:ActOfAllocation"],
  "cco:has_agent": "inst:The_Doctor_Referent"  // ❌ INVALID
}

// WRONG: Artifact bearing PatientRole
{
  "@id": "inst:Ventilator",
  "@type": ["cco:Artifact"],
  "bfo:is_bearer_of": "inst:Patient_Role"  // ❌ INVALID
}
```

### 3.3 What TO Do

```javascript
// CORRECT: Referent links to Person via is_about
{
  "@id": "inst:The_Doctor_Referent",
  "@type": ["tagteam:DiscourseReferent"],
  "cco:is_about": "inst:Doctor_Person"  // ✅ VALID
}

// CORRECT: Person bears the role
{
  "@id": "inst:Doctor_Person",
  "@type": ["cco:Person"],
  "bfo:is_bearer_of": "inst:Agent_Role"  // ✅ VALID
}

// CORRECT: Act has Person as agent
{
  "@id": "inst:Act_Allocate",
  "@type": ["cco:ActOfAllocation"],
  "cco:has_agent": "inst:Doctor_Person"  // ✅ VALID
}

// CORRECT: Artifact is affected by act (no PatientRole)
{
  "@id": "inst:Act_Allocate",
  "@type": ["cco:ActOfAllocation"],
  "cco:affects": "inst:Ventilator_Artifact"  // ✅ VALID
}
```

---

## 4. Corrected Role Taxonomy

### 4.1 CCO Role Types and Their Proper Bearers

| CCO Role Type | Proper Bearer | Example |
|---------------|---------------|---------|
| `cco:AgentRole` | `cco:Person` | Doctor performing allocation |
| `cco:PatientRole` | `cco:Person` | Person receiving medical care |
| `cco:BeneficiaryRole` | `cco:Person` | Person who benefits from act |
| `cco:RecipientRole` | `cco:Person` | Person receiving something |

### 4.2 What Artifacts Can Be

Artifacts (like ventilators) are NOT patients. They can be:

- **Target** of an act (`cco:affects`)
- **Resource** being allocated
- **Instrument** used in an act (`cco:has_instrument`)
- Bearer of a **Function** (not a Role)

```javascript
// Ventilator as affected artifact
{
  "@id": "inst:Ventilator_Artifact",
  "@type": ["cco:Artifact", "cco:MedicalDevice"],
  "rdfs:label": "the last ventilator"
  // Note: NO is_bearer_of relation
}

// Act affects the artifact
{
  "@id": "inst:Act_Allocate",
  "@type": ["cco:ActOfAllocation"],
  "cco:affects": "inst:Ventilator_Artifact",
  "cco:has_agent": "inst:Doctor_Person"
}
```

---

## 5. Modeling Deontic Modality ("must")

### 5.1 Current (Incorrect) Approach

```javascript
{
  "@id": "inst:Act_Allocate",
  "tagteam:modality": "obligation"  // ❌ Not ontologically grounded
}
```

### 5.2 Correct CCO Approach

Deontic modality should be modeled as a `DirectiveInformationContentEntity` that `prescribes` the act.

```javascript
// The directive (deontic content)
{
  "@id": "inst:Obligation_Allocate",
  "@type": ["cco:DirectiveInformationContentEntity", "tagteam:DeonticContent"],
  "rdfs:label": "obligation to allocate",
  "tagteam:modalType": "obligation",
  "tagteam:modalMarker": "must",
  "cco:prescribes": "inst:Act_Allocate"
}

// The act being prescribed
{
  "@id": "inst:Act_Allocate",
  "@type": ["cco:ActOfAllocation"],
  "cco:prescribed_by": "inst:Obligation_Allocate"
}
```

### 5.3 Modal Types

| Marker | Modal Type | CCO Class |
|--------|------------|-----------|
| must, shall | `obligation` | `cco:DirectiveInformationContentEntity` |
| should, ought | `recommendation` | `cco:DirectiveInformationContentEntity` |
| may, can | `permission` | `cco:DirectiveInformationContentEntity` |
| must not | `prohibition` | `cco:DirectiveInformationContentEntity` |

---

## 6. Modeling Scarcity

### 6.1 Current (Incorrect) Approach

```javascript
{
  "@id": "inst:Patients_Referent",
  "tagteam:is_scarce": true  // ❌ Scarcity on patients makes no sense
}
```

### 6.2 Correct Approach: Scarcity as Contextual Assertion

Scarcity is a **context-dependent assessment** about resource availability, not an intrinsic property.

```javascript
// Scarcity assertion (Tier 1 - Information Layer)
{
  "@id": "inst:Scarcity_Assertion_001",
  "@type": ["tagteam:ScarcityAssertion", "cco:InformationContentEntity"],
  "rdfs:label": "scarcity of ventilators",
  "tagteam:scarceResource": "inst:Ventilator_Artifact",
  "tagteam:evidenceText": "the last ventilator",
  "tagteam:demandingParties": ["inst:Patient_1", "inst:Patient_2"],
  "tagteam:scarcityRatio": {
    "available": 1,
    "demanded": 2
  }
}
```

### 6.3 Alternative: Interpretation Context

```javascript
{
  "@id": "inst:Context_MedicalScarcity",
  "@type": ["tagteam:InterpretationContext"],
  "tagteam:contextType": "ResourceScarcity",
  "tagteam:applies_to": "inst:Ventilator_Artifact",
  "tagteam:scarcityIndicators": ["last", "only", "single"]
}
```

---

## 7. Complete Example: Corrected JSON-LD Output

### Input Text
> "The doctor must allocate the last ventilator between two critically ill patients"

### 7.1 Tier 1: Parsing Layer Nodes

```json
{
  "@context": {
    "tagteam": "https://tagteam.js.org/ontology#",
    "cco": "http://www.ontologyrepository.com/CommonCoreOntologies/",
    "bfo": "http://purl.obolibrary.org/obo/",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "xsd": "http://www.w3.org/2001/XMLSchema#"
  },
  "@graph": [
    {
      "@id": "inst:Referent_The_Doctor",
      "@type": ["tagteam:DiscourseReferent"],
      "rdfs:label": "the doctor",
      "tagteam:sourceText": "The doctor",
      "tagteam:startPosition": 0,
      "tagteam:endPosition": 10,
      "tagteam:definiteness": "definite",
      "tagteam:denotesType": "cco:Person",
      "cco:is_about": "inst:Person_Doctor"
    },
    {
      "@id": "inst:Referent_Ventilator",
      "@type": ["tagteam:DiscourseReferent"],
      "rdfs:label": "the last ventilator",
      "tagteam:sourceText": "the last ventilator",
      "tagteam:startPosition": 27,
      "tagteam:endPosition": 46,
      "tagteam:definiteness": "definite",
      "tagteam:denotesType": "cco:Artifact",
      "tagteam:quantityIndicator": "last",
      "cco:is_about": "inst:Artifact_Ventilator"
    },
    {
      "@id": "inst:Referent_Patients",
      "@type": ["tagteam:DiscourseReferent"],
      "rdfs:label": "two critically ill patients",
      "tagteam:sourceText": "two critically ill patients",
      "tagteam:startPosition": 55,
      "tagteam:endPosition": 82,
      "tagteam:definiteness": "indefinite",
      "tagteam:denotesType": "cco:Person",
      "tagteam:quantity": 2,
      "tagteam:qualifiers": ["critically ill"],
      "cco:is_about": ["inst:Person_Patient_1", "inst:Person_Patient_2"]
    },
    {
      "@id": "inst:VerbPhrase_Allocate",
      "@type": ["tagteam:VerbPhrase"],
      "rdfs:label": "must allocate",
      "tagteam:verb": "allocate",
      "tagteam:lemma": "allocate",
      "tagteam:tense": "present",
      "tagteam:hasModalMarker": "must",
      "cco:is_about": "inst:Act_Allocate"
    },
    {
      "@id": "inst:Directive_Must_Allocate",
      "@type": ["cco:DirectiveInformationContentEntity", "tagteam:DeonticContent"],
      "rdfs:label": "obligation to allocate",
      "tagteam:modalType": "obligation",
      "tagteam:modalMarker": "must",
      "tagteam:modalStrength": 1.0,
      "cco:prescribes": "inst:Act_Allocate"
    },
    {
      "@id": "inst:Scarcity_Assertion",
      "@type": ["tagteam:ScarcityAssertion"],
      "rdfs:label": "ventilator scarcity",
      "tagteam:scarceResource": "inst:Artifact_Ventilator",
      "tagteam:evidenceText": "the last ventilator",
      "tagteam:demandingParties": ["inst:Person_Patient_1", "inst:Person_Patient_2"],
      "tagteam:scarcityRatio": {
        "available": 1,
        "demanded": 2
      }
    }
  ]
}
```

### 7.2 Tier 2: Real-World Layer Nodes

```json
{
  "@graph": [
    {
      "@id": "inst:Person_Doctor",
      "@type": ["cco:Person"],
      "rdfs:label": "doctor",
      "bfo:is_bearer_of": "inst:Role_Agent_Doctor"
    },
    {
      "@id": "inst:Artifact_Ventilator",
      "@type": ["cco:Artifact", "cco:MedicalDevice"],
      "rdfs:label": "ventilator"
    },
    {
      "@id": "inst:Person_Patient_1",
      "@type": ["cco:Person"],
      "rdfs:label": "patient 1",
      "bfo:is_bearer_of": "inst:Role_Patient_1"
    },
    {
      "@id": "inst:Person_Patient_2",
      "@type": ["cco:Person"],
      "rdfs:label": "patient 2",
      "bfo:is_bearer_of": "inst:Role_Patient_2"
    },
    {
      "@id": "inst:Role_Agent_Doctor",
      "@type": ["bfo:BFO_0000023", "cco:AgentRole"],
      "rdfs:label": "agent role of doctor",
      "bfo:inheres_in": "inst:Person_Doctor",
      "bfo:realized_in": "inst:Act_Allocate"
    },
    {
      "@id": "inst:Role_Patient_1",
      "@type": ["bfo:BFO_0000023", "cco:PatientRole"],
      "rdfs:label": "patient role of patient 1",
      "bfo:inheres_in": "inst:Person_Patient_1"
    },
    {
      "@id": "inst:Role_Patient_2",
      "@type": ["bfo:BFO_0000023", "cco:PatientRole"],
      "rdfs:label": "patient role of patient 2",
      "bfo:inheres_in": "inst:Person_Patient_2"
    },
    {
      "@id": "inst:Act_Allocate",
      "@type": ["cco:IntentionalAct", "cco:ActOfAllocation"],
      "rdfs:label": "act of allocating ventilator",
      "cco:has_agent": "inst:Person_Doctor",
      "cco:affects": "inst:Artifact_Ventilator",
      "cco:has_participant": ["inst:Person_Patient_1", "inst:Person_Patient_2"],
      "cco:prescribed_by": "inst:Directive_Must_Allocate"
    }
  ]
}
```

### 7.3 Combined Full Graph

```json
{
  "@context": {
    "tagteam": "https://tagteam.js.org/ontology#",
    "cco": "http://www.ontologyrepository.com/CommonCoreOntologies/",
    "bfo": "http://purl.obolibrary.org/obo/",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "inst": "https://tagteam.js.org/instance#",

    "is_about": { "@id": "cco:is_about", "@type": "@id" },
    "denotes": { "@id": "tagteam:denotes", "@type": "@id" },
    "inheres_in": { "@id": "bfo:BFO_0000052", "@type": "@id" },
    "is_bearer_of": { "@id": "bfo:BFO_0000053", "@type": "@id" },
    "realized_in": { "@id": "bfo:BFO_0000054", "@type": "@id" },
    "has_participant": { "@id": "bfo:BFO_0000057", "@type": "@id" },
    "has_agent": { "@id": "cco:has_agent", "@type": "@id" },
    "affects": { "@id": "cco:affects", "@type": "@id" },
    "prescribes": { "@id": "cco:prescribes", "@type": "@id" },
    "prescribed_by": { "@id": "cco:prescribed_by", "@type": "@id" }
  },
  "@graph": [
    // === TIER 1: PARSING LAYER ===
    {
      "@id": "inst:Referent_The_Doctor",
      "@type": ["tagteam:DiscourseReferent"],
      "rdfs:label": "the doctor",
      "tagteam:sourceText": "The doctor",
      "tagteam:definiteness": "definite",
      "is_about": "inst:Person_Doctor"
    },
    {
      "@id": "inst:Referent_Ventilator",
      "@type": ["tagteam:DiscourseReferent"],
      "rdfs:label": "the last ventilator",
      "tagteam:sourceText": "the last ventilator",
      "tagteam:definiteness": "definite",
      "tagteam:quantityIndicator": "last",
      "is_about": "inst:Artifact_Ventilator"
    },
    {
      "@id": "inst:Referent_Patients",
      "@type": ["tagteam:DiscourseReferent"],
      "rdfs:label": "two critically ill patients",
      "tagteam:sourceText": "two critically ill patients",
      "tagteam:definiteness": "indefinite",
      "tagteam:quantity": 2,
      "is_about": ["inst:Person_Patient_1", "inst:Person_Patient_2"]
    },
    {
      "@id": "inst:Directive_Must_Allocate",
      "@type": ["cco:DirectiveInformationContentEntity", "tagteam:DeonticContent"],
      "rdfs:label": "obligation to allocate",
      "tagteam:modalType": "obligation",
      "tagteam:modalMarker": "must",
      "prescribes": "inst:Act_Allocate"
    },
    {
      "@id": "inst:Scarcity_Assertion",
      "@type": ["tagteam:ScarcityAssertion"],
      "rdfs:label": "ventilator scarcity",
      "tagteam:scarceResource": "inst:Artifact_Ventilator",
      "tagteam:evidenceText": "the last ventilator",
      "tagteam:demandingParties": ["inst:Person_Patient_1", "inst:Person_Patient_2"]
    },

    // === TIER 2: REAL-WORLD LAYER ===
    {
      "@id": "inst:Person_Doctor",
      "@type": ["cco:Person"],
      "rdfs:label": "doctor",
      "is_bearer_of": "inst:Role_Agent_Doctor"
    },
    {
      "@id": "inst:Artifact_Ventilator",
      "@type": ["cco:Artifact", "cco:MedicalDevice"],
      "rdfs:label": "ventilator"
    },
    {
      "@id": "inst:Person_Patient_1",
      "@type": ["cco:Person"],
      "rdfs:label": "patient 1",
      "is_bearer_of": "inst:Role_Patient_1"
    },
    {
      "@id": "inst:Person_Patient_2",
      "@type": ["cco:Person"],
      "rdfs:label": "patient 2",
      "is_bearer_of": "inst:Role_Patient_2"
    },
    {
      "@id": "inst:Role_Agent_Doctor",
      "@type": ["bfo:BFO_0000023", "cco:AgentRole"],
      "rdfs:label": "agent role of doctor",
      "inheres_in": "inst:Person_Doctor",
      "realized_in": "inst:Act_Allocate"
    },
    {
      "@id": "inst:Role_Patient_1",
      "@type": ["bfo:BFO_0000023", "cco:PatientRole"],
      "rdfs:label": "patient role of patient 1",
      "inheres_in": "inst:Person_Patient_1"
    },
    {
      "@id": "inst:Role_Patient_2",
      "@type": ["bfo:BFO_0000023", "cco:PatientRole"],
      "rdfs:label": "patient role of patient 2",
      "inheres_in": "inst:Person_Patient_2"
    },
    {
      "@id": "inst:Act_Allocate",
      "@type": ["cco:IntentionalAct", "cco:ActOfAllocation"],
      "rdfs:label": "act of allocating ventilator",
      "has_agent": "inst:Person_Doctor",
      "affects": "inst:Artifact_Ventilator",
      "has_participant": ["inst:Person_Patient_1", "inst:Person_Patient_2"],
      "prescribed_by": "inst:Directive_Must_Allocate"
    }
  ]
}
```

---

## 8. Implementation Impact Assessment

### 8.1 Modules Requiring Changes

| Module | Change Type | Description |
|--------|-------------|-------------|
| `EntityExtractor.js` | **Major** | Must create BOTH referent AND real-world entity nodes |
| `ActExtractor.js` | **Major** | Must link acts to real-world Persons, not referents |
| `RoleDetector.js` | **Major** | Must assign roles to Persons, not referents |
| `SemanticGraphBuilder.js` | **Moderate** | Must orchestrate two-tier generation |
| `JSONLDSerializer.js` | **Minor** | Add new @context terms |

### 8.2 New Modules Needed

| Module | Purpose |
|--------|---------|
| `RealWorldEntityFactory.js` | Create Tier 2 entities from parsed referents |
| `DeonticContentExtractor.js` | Extract and model deontic modality properly |
| `ScarcityAssertionBuilder.js` | Build scarcity assertions from linguistic cues |

### 8.3 Test Impact

- **Unit tests**: All 116 tests will need updates to reflect new node types
- **Integration tests**: AC criteria need revision for two-tier output
- **New tests**: Tests for cross-tier linking, proper role bearer assignment

---

## 9. Open Questions for Expert

1. **Entity Identity**: When "the doctor" appears multiple times, should we create one `Person_Doctor` or multiple? (Coreference resolution)

2. **Dormant Roles**: If we detect a patient referent but no act involving them, do we still create the PatientRole? The spec says dormant roles are valid in BFO.

3. **Scarcity Assertion Type**: Should `ScarcityAssertion` be a subclass of `cco:InformationContentEntity` or a separate TagTeam class?

4. **Act Instantiation**: The text describes a hypothetical/prescribed act. Should we create the `ActOfAllocation` instance, or only reference the act type? (The act hasn't happened yet.)

5. **Inverse Relations**: Should we include both `is_bearer_of` on Person AND `inheres_in` on Role, or just one direction?

---

## 10. Approval Section

**Requested Action**: Please review this specification and provide:
- [ ] **APPROVED** - Proceed with implementation
- [ ] **APPROVED WITH MODIFICATIONS** - See notes below
- [ ] **REVISE** - Major changes needed

**Expert Notes**:
_____________________________________________
_____________________________________________
_____________________________________________

**Reviewed by**: ___________________________
**Date**: ___________________________

---

## Appendix A: BFO/CCO Reference

### A.1 Key BFO Classes Used

| BFO ID | Name | Description |
|--------|------|-------------|
| `BFO_0000004` | IndependentContinuant | Entities that don't depend on other entities |
| `BFO_0000023` | Role | A realizable entity that inheres in an IC |
| `BFO_0000015` | Process | An occurrent that has temporal parts |
| `BFO_0000031` | GenericallyDependentContinuant | Information entities |

### A.2 Key CCO Classes Used

| CCO Class | BFO Parent | Description |
|-----------|------------|-------------|
| `cco:Person` | IndependentContinuant | A human being |
| `cco:Artifact` | IndependentContinuant | A man-made object |
| `cco:AgentRole` | Role | Role of performing an act |
| `cco:PatientRole` | Role | Role of receiving medical care |
| `cco:IntentionalAct` | Process | An act performed with intention |
| `cco:DirectiveInformationContentEntity` | GDC | A prescription or command |

### A.3 Key Relations Used

| Relation | Domain | Range | Description |
|----------|--------|-------|-------------|
| `bfo:is_bearer_of` | IC | SDC | Entity bears a realizable |
| `bfo:inheres_in` | SDC | IC | Realizable inheres in entity |
| `bfo:realized_in` | Realizable | Process | Realizable manifests in process |
| `cco:has_agent` | Act | Agent | Act has an agent |
| `cco:affects` | Act | IC | Act affects an entity |
| `cco:is_about` | ICE | Entity | Information is about entity |
| `cco:prescribes` | Directive | Act | Directive prescribes act |
