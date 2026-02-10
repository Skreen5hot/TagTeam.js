# BFO/CCO Ontology - Sources of Truth

**Purpose:** Authoritative references for entity classification and ontological structure

---

## Primary Authority: Basic Formal Ontology (BFO)

**Project:** Basic Formal Ontology
**Version:** 2.0 (ISO/IEC 21838-2)
**Maintainer:** National Center for Ontological Research (NCOR)
**URL:** https://basic-formal-ontology.org/
**Status:** **PRIMARY AUTHORITY** for top-level ontological categories

**Why This Authority:**
- ISO standard for upper-level ontology
- Foundation for CCO and all domain ontologies used in TagTeam
- Defines clear distinction between Continuants (objects) and Occurrents (processes)
- Widely adopted in scientific and defense communities

---

## BFO Top-Level Hierarchy

### Core Categories

```
BFO:0000001 Entity
├── BFO:0000002 Continuant (persists through time)
│   ├── BFO:0000004 IndependentContinuant
│   │   ├── BFO:0000030 Object (material entity)
│   │   └── BFO:0000024 FiatObjectPart
│   ├── BFO:0000020 SpecificallyDependentContinuant
│   │   ├── BFO:0000023 Role
│   │   ├── BFO:0000016 Disposition
│   │   └── BFO:0000017 RealizableEntity
│   └── BFO:0000031 GenericallyDependentContinuant
│       └── InformationContentEntity (defined in CCO)
└── BFO:0000003 Occurrent (unfolds over time)
    ├── BFO:0000015 Process
    ├── BFO:0000035 ProcessBoundary
    └── BFO:0000038 TemporalRegion
```

---

## BFO Principles for TagTeam

### 1. **Continuant vs. Occurrent Distinction**

**Rule:** Entities extracted from noun phrases are Continuants; verb phrases denote Occurrents.

**Examples:**
```
"The server fails"
  → "the server" = Continuant (BFO:0000030 Object)
  → "fails" = Occurrent (BFO:0000015 Process)

"The admin receives an alert"
  → "the admin" = Continuant (subclass: cco:Person)
  → "an alert" = Continuant (subclass: cco:InformationContentEntity)
  → "receives" = Occurrent (subclass: cco:IntentionalAct)
```

**TagTeam Test Coverage:**
- All entity extraction tests validate Continuant classification
- All act extraction tests validate Occurrent classification

**Source:** BFO 2.0 Specification §3.1-3.2

---

### 2. **Object vs. Fiat Object Part**

**Rule:** If an entity has clear spatial boundaries independent of human designation, it's an Object. If boundaries are imposed by convention, it's a Fiat Object Part.

**Examples:**
```
"The server" → BFO:0000030 Object (natural boundaries)
"The northern server rack" → BFO:0000024 FiatObjectPart (spatial boundary is conventional)
"The admin team" → BFO:0000030 Object (organization has natural boundaries)
"The frontend of the system" → BFO:0000024 FiatObjectPart (boundary is conventional)
```

**TagTeam Application:**
- Most extracted entities are Objects (servers, admins, systems)
- Fiat parts rare in technical language (typically handled as qualities or roles)

**Source:** BFO 2.0 Specification §4.1

---

### 3. **Role vs. Disposition**

**Rule:** Roles are realized through participation in processes; Dispositions are realized through undergoing processes.

**Examples:**
```
"The admin" → has Role "administrator" (realized by performing admin acts)
"The server" → has Disposition "fragility" (realized by breaking when stressed)
```

**TagTeam Application:**
- Person entities have Roles (admin, engineer, user)
- Artifact entities have Dispositions (ability to fail, store data, etc.)

**Source:** BFO 2.0 Specification §5.2-5.3

---

## Secondary Authority: Common Core Ontologies (CCO)

**Project:** Common Core Ontologies
**Version:** 1.5
**Maintainer:** CUBRC Inc. / US DoD
**URL:** https://github.com/CommonCoreOntology/CommonCoreOntologies
**Status:** **PRIMARY AUTHORITY** for mid-level entity and act classifications

**Why This Authority:**
- Extends BFO with domain-specific classes (Person, Artifact, IntentionalAct)
- Defines semantic role properties (`cco:has_agent`, `cco:has_patient`, etc.)
- Official CCO is target schema for TagTeam output

---

## CCO Entity Classification

### CCO:Agent

**Definition:** Material entity capable of performing intentional acts

**Subclasses:**
- **cco:Person** - Human being (engineer, admin, user)
- **cco:Organization** - Social entity with collective intentionality (team, company)

**Examples:**
```
"the engineer" → cco:Person
"the admin" → cco:Person (with Role "administrator")
"the team" → cco:Organization
```

**TagTeam Test Coverage:**
- CS-REL-001: "The engineer who designed the system" → Should classify as cco:Person
- Test that "who" is NOT instantiated as separate cco:Person

**Source:** CCO Agent Ontology v1.5

---

### CCO:Artifact

**Definition:** Material entity that is the product of intentional design

**Subclasses:**
- **cco:InformationBearingArtifact** - Artifact that encodes information (alert, log, message)
- **cco:Facility** - Artifact designed for specific purpose (server, database, system)

**Examples:**
```
"the server" → cco:Artifact (subclass: cco:Facility)
"the database" → cco:Artifact
"an alert" → cco:InformationBearingArtifact
"the system" → cco:Artifact
```

**TagTeam Test Coverage:**
- CS-PREFIX-SUB-001: "the server" → Should classify as cco:Artifact
- CS-PREFIX-SUB-001: "an alert" → Should classify as cco:InformationBearingArtifact

**Source:** CCO Artifact Ontology v1.5

---

### CCO:InformationContentEntity

**Definition:** Generically dependent continuant that encodes information

**Subclasses:**
- **cco:DirectiveInformationContentEntity** - Commands, requests, instructions
- **cco:DescriptiveInformationContentEntity** - Descriptions, assertions, reports

**Examples:**
```
"the credentials" → cco:InformationContentEntity
"the data" → cco:InformationContentEntity
"the issue" → cco:InformationContentEntity (problem report)
```

**TagTeam Test Coverage:**
- CS-REL-005: "credentials" → Should classify as cco:InformationContentEntity

**Source:** CCO Information Entity Ontology v1.5

---

## CCO Act Classification

### CCO:IntentionalAct

**Definition:** Act of which some agent is the bearer of a disposition that is causally relevant to the act's occurrence

**Key Properties:**
- **cco:has_agent** (Domain: cco:IntentionalAct, Range: cco:Agent)
- **cco:has_patient** (Domain: cco:Act, Range: bfo:Continuant)
- **cco:affects** (Domain: cco:Act, Range: bfo:Continuant)

**Examples:**
```
"The engineer designed the system"
  → cco:IntentionalAct (subclass: cco:ActOfDesigning)
  → cco:has_agent: engineer (cco:Person)
  → cco:has_patient: system (cco:Artifact)

"The admin receives an alert"
  → cco:IntentionalAct (subclass: cco:ActOfReceiving)
  → cco:has_agent: admin (cco:Person)
  → cco:has_patient: alert (cco:InformationBearingArtifact)
```

**TagTeam Test Coverage:**
- All act extraction tests validate that agents are cco:Agent
- All role assignment tests validate that `cco:has_agent` points to appropriate entity

**Source:** CCO Event Ontology v1.5

---

### CCO:Act (Non-Intentional)

**Definition:** Process that is not necessarily intentional

**Examples:**
```
"The server fails"
  → cco:Act (non-intentional process)
  → cco:has_patient: server (undergoes change)
  → NO cco:has_agent (failure is not volitional)

"The alarm sounded"
  → cco:Act (non-intentional process)
  → cco:has_patient: alarm (undergoes change)
```

**Critical Distinction:**
- **IntentionalAct** requires volitional agent (person, organization)
- **Act** may have no agent (natural processes, failures)

**TagTeam Test Coverage:**
- CS-PREFIX-SUB-001: "fails" → Should be cco:Act, NOT cco:IntentionalAct
- Should have NO cco:has_agent property

**Source:** CCO Event Ontology v1.5

---

## CCO Semantic Role Properties

### Core Properties

| Property | Domain | Range | Semantics |
|----------|--------|-------|-----------|
| `cco:has_agent` | cco:IntentionalAct | cco:Agent | Volitional performer |
| `cco:has_patient` | cco:Act | bfo:Continuant | Entity undergoing change |
| `cco:affects` | cco:Act | bfo:Continuant | Entity causally affected (no intrinsic change) |
| `cco:uses_instrument` | cco:IntentionalAct | cco:Artifact | Tool used in act |
| `cco:has_input` | cco:Act | bfo:Continuant | Entity consumed/transformed |
| `cco:has_output` | cco:Act | bfo:Continuant | Entity produced |
| `cco:occurs_at` | bfo:Occurrent | bfo:SpatialRegion | Location of occurrence |
| `cco:occurs_on` | bfo:Occurrent | bfo:TemporalInstant | Time of occurrence |

**TagTeam Usage:**
- Use `cco:has_agent` for subjects of intentional verbs (design, receive, approve)
- Use `cco:has_patient` for direct objects (what is affected)
- Use `cco:affects` when entity is causally relevant but doesn't change intrinsically

**Source:** CCO Relation Ontology v1.5

---

## Application to TagTeam Testing

### Level 1: Entity Classification Tests

**Test Template:**
```json
{
  "id": "L1-entity-class-001",
  "component": "EntityExtractor",
  "input": {
    "text": "the server",
    "context": "If the server fails"
  },
  "expected": {
    "text": "the server",
    "bfoClass": "BFO:0000030",  // Object
    "ccoClass": "cco:Artifact",
    "animacy": "inanimate",
    "definiteness": "definite"
  },
  "sourceOfTruth": {
    "authority": "BFO 2.0 + CCO Artifact Ontology",
    "principle": "Server is material artifact with designed function",
    "reference": "CCO:Artifact definition"
  }
}
```

### Level 2: Ontological Consistency Tests

**Test Template:**
```json
{
  "id": "L2-ontology-001",
  "input": {
    "act": {
      "type": "cco:IntentionalAct",
      "verb": "design",
      "properties": {
        "cco:has_agent": "entity_server_123"
      }
    },
    "entities": [
      { "id": "entity_server_123", "type": "cco:Artifact", "animacy": "inanimate" }
    ]
  },
  "expected": {
    "violation": {
      "type": "ontological_inconsistency",
      "reason": "cco:IntentionalAct requires cco:Agent as subject, but 'entity_server_123' is cco:Artifact"
    }
  },
  "sourceOfTruth": "CCO:IntentionalAct domain restriction (agent must be cco:Agent)"
}
```

---

## Common Classification Errors

### Error 1: Treating Relative Pronouns as Entities

**Incorrect:**
```
"who" → inst:Who_Person_abc123 (cco:Person)
```

**Correct:**
```
"who" → NOT an entity (anaphoric reference to antecedent)
```

**Source:** BFO does not classify grammatical markers as Entities; only referents are classified.

---

### Error 2: Classifying Non-Volitional Acts as IntentionalAct

**Incorrect:**
```
"The server fails" → cco:IntentionalAct
```

**Correct:**
```
"The server fails" → cco:Act (non-intentional process)
```

**Source:** CCO:IntentionalAct requires volitional agent; failures are non-volitional.

---

### Error 3: Using cco:has_agent for Non-Agents

**Incorrect:**
```
inst:Fail_Act cco:has_agent inst:Server_Artifact
```

**Correct:**
```
inst:Fail_Act cco:has_patient inst:Server_Artifact
```

**Source:** CCO:has_agent range is cco:Agent; servers are cco:Artifact, not cco:Agent.

---

## Citation Format

**In Test Files:**
```json
"sourceOfTruth": "BFO 2.0 §4.1 - Object classification"
```

**In Test Runner Output:**
```
❌ L1-entity-class-001 FAILED
   Authority: BFO 2.0 + CCO Artifact Ontology v1.5
   Expected: cco:Artifact (material object with designed function)
   Actual: cco:Person (incorrectly classified)
```

---

## References

1. Arp, R., Smith, B., & Spear, A. D. (2015). *Building Ontologies with Basic Formal Ontology.* MIT Press. ISBN 978-0262527811.

2. ISO/IEC 21838-2:2021 - *Information technology — Top-level ontologies (TLO) — Part 2: Basic Formal Ontology (BFO).*

3. Cox, A. P., et al. (2016). *An Ontological Approach to Common Core Ontologies.* Semantic Technology for Intelligence, Defense, and Security (STIDS).

4. Common Core Ontologies (2023). *CCO v1.5 Documentation.* Retrieved from https://github.com/CommonCoreOntology/CommonCoreOntologies

---

**Last Updated:** 2026-02-10
**Maintained By:** TagTeam Test Infrastructure Team
