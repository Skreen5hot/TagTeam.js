# Semantic Roles - Sources of Truth

**Purpose:** Authoritative references for semantic role assignment validation

---

## Primary Authority

### VerbNet

**Project:** VerbNet - A Broad-Coverage Verb Lexicon
**Maintainer:** University of Colorado Boulder
**Version:** 3.4 (as of 2023)
**URL:** https://verbs.colorado.edu/verbnet/
**Status:** **PRIMARY AUTHORITY** for semantic role assignment

**Why This Authority:**
- Maps directly to thematic roles used in CCO (Agent, Patient, Instrument, etc.)
- Provides verb class hierarchies with selectional restrictions
- Widely used in NLP for semantic role labeling (SRL)
- Compatible with PropBank and FrameNet

---

## VerbNet Thematic Roles

### Core Roles (Used in TagTeam/CCO)

| VerbNet Role | CCO Mapping | Definition | Example |
|--------------|-------------|------------|---------|
| **Agent** | `cco:has_agent` | Volitional causer of event | "The engineer designed the system" |
| **Patient** | `cco:has_patient` | Entity undergoing change | "The admin received the alert" |
| **Theme** | `cco:has_patient` | Entity in motion or being located | "The server stores the data" |
| **Experiencer** | `cco:has_agent` | Entity experiencing mental state | "The user noticed the bug" |
| **Instrument** | `cco:uses_instrument` | Tool used to perform action | "The script automated the task" |
| **Beneficiary** | `cco:has_beneficiary` | Entity for whose benefit action occurs | "The team built the feature for the client" |
| **Location** | `cco:occurs_at` | Spatial location of event | "The server runs in the datacenter" |
| **Source** | `cco:has_source` | Origin of motion or transfer | "The data migrated from the old system" |
| **Destination** | `cco:has_destination` | Goal of motion or transfer | "The request goes to the API" |

---

## Verb Classes Relevant to TagTeam

### 1. **fail-45.6** (Intransitive Change-of-State)

**Prototype Verb:** fail, crash, succeed, expire

**Thematic Frame:**
- **Theme[+artifact/-animate]** undergoes change
- **NO Patient role** (intransitive)

**Example:**
```
"The server fails"
  Agent: None
  Patient: None
  Theme: "the server" (undergoes change from working → failed)
```

**SelectionalPreferences:**
- Theme must be inanimate artifact or process
- Cannot take animate agent

**TagTeam Test Coverage:**
- CS-PREFIX-SUB-001: "If the server fails" → Should assign NO patient
- Failure mode: V7 assigns "admin" as patient (argument bleeding)

**Source:** VerbNet class 45.6 - https://verbs.colorado.edu/verb-index/vn/fail-45.6.php

---

### 2. **get-13.5.1** (Obtaining)

**Prototype Verb:** receive, obtain, get, acquire

**Thematic Frame:**
- **Agent[+animate]** receives
- **Theme[+concrete/-abstract]** is received

**Example:**
```
"The admin receives an alert"
  Agent: "the admin" (person receiving)
  Theme: "an alert" (thing received)
```

**Selectional Preferences:**
- Agent typically animate (person, organization)
- Theme typically concrete entity (object, information)

**TagTeam Test Coverage:**
- CS-PREFIX-SUB-001: "the admin receives an alert" → Should assign agent="admin", theme="alert"

**Source:** VerbNet class 13.5.1 - https://verbs.colorado.edu/verb-index/vn/get-13.5.1.php

---

### 3. **build-26.1** (Creation)

**Prototype Verb:** design, build, create, develop

**Thematic Frame:**
- **Agent[+animate]** creates
- **Patient[+artifact]** is created
- Optional **Material** (what it's built from)
- Optional **Product** (result of creation)

**Example:**
```
"The engineer designed the system"
  Agent: "the engineer" (creator)
  Patient: "the system" (thing created)
```

**Selectional Preferences:**
- Agent must be animate (human, organization)
- Patient typically artifact (system, software, building)

**TagTeam Test Coverage:**
- CS-REL-001: "The engineer who designed the system" → Should assign agent="engineer", patient="system"
- Failure mode: V7 treats "who" as separate agent

**Source:** VerbNet class 26.1 - https://verbs.colorado.edu/verb-index/vn/build-26.1.php

---

### 4. **leave-51.2** (Departure)

**Prototype Verb:** leave, depart, exit

**Thematic Frame:**
- **Theme[+animate]** departs
- Optional **Source** (location departed from)

**Example:**
```
"The engineer left"
  Theme: "the engineer" (entity in motion)
  Source: (implicit location)
```

**Selectional Preferences:**
- Theme typically animate (person, animal)
- If inanimate, must be capable of motion (vehicle, data)

**TagTeam Test Coverage:**
- CS-REL-001: "The engineer who designed the system left" → Should assign theme="engineer"
- Failure mode: V7 assigns theme="system" (subject bleeding)

**Source:** VerbNet class 51.2 - https://verbs.colorado.edu/verb-index/vn/leave-51.2.php

---

## Selectional Restrictions

### Animacy Constraints

VerbNet specifies animacy for many roles:

| Role | Animacy Constraint | Rationale |
|------|-------------------|-----------|
| Agent (volitional) | [+animate] | Only animate entities have volition |
| Theme (motion) | [+animate] OR [+movable] | Entity must be capable of motion |
| Experiencer | [+animate] | Only animate entities experience mental states |
| Instrument | [-animate] | Tools are typically inanimate |

**TagTeam Application:**
- If a verb requires [+animate] agent but we assign [-animate] entity → Flag as selectional violation
- Example: "The server designed the system" → Invalid (artifact cannot be agent of "design")

**Test Case:**
```json
{
  "id": "L2-role-001",
  "input": {
    "verb": "design",
    "entities": ["the server", "the system"],
    "verbClass": "build-26.1"
  },
  "expected": {
    "roleAssignment": null,
    "violation": {
      "type": "selectional_restriction_violation",
      "reason": "Agent role requires [+animate] but 'server' is [-animate]"
    }
  },
  "sourceOfTruth": "VerbNet 26.1 selectional restrictions"
}
```

---

## Mapping VerbNet to CCO Properties

### CCO IntentionalAct Properties

| CCO Property | VerbNet Equivalent | Domain | Range |
|--------------|-------------------|---------|-------|
| `cco:has_agent` | Agent | `cco:IntentionalAct` | `cco:Agent` |
| `cco:has_patient` | Patient / Theme | `cco:Act` | `bfo:Continuant` |
| `cco:affects` | Theme (non-change) | `cco:Act` | `bfo:Continuant` |
| `cco:uses_instrument` | Instrument | `cco:IntentionalAct` | `cco:Artifact` |
| `cco:has_input` | Source / Material | `cco:Act` | `bfo:Continuant` |
| `cco:has_output` | Product / Result | `cco:Act` | `bfo:Continuant` |

**Ambiguity Resolution:**
- **Theme vs. Patient:** Use Patient if entity undergoes intrinsic change; Theme if just location/possession changes
- **Agent vs. Experiencer:** Both map to `cco:has_agent` (CCO doesn't distinguish)
- **Instrument vs. Agent:** If entity has volition → Agent; if used as tool → Instrument

---

## PropBank (Secondary Authority)

**Project:** PropBank - Proposition Bank
**Maintainer:** Linguistic Data Consortium (LDC)
**URL:** https://propbank.github.io/
**Use Case:** Cross-validation when VerbNet is ambiguous

**PropBank Roles:**
- **Arg0:** Proto-agent (typically agent)
- **Arg1:** Proto-patient (typically patient/theme)
- **Arg2:** Instrument, beneficiary, attribute (verb-specific)
- **ArgM:** Modifiers (location, time, manner)

**When to Use PropBank:**
- If VerbNet doesn't have a class for the verb
- If VerbNet class is ambiguous
- For verbs with idiosyncratic argument structures

---

## FrameNet (Tertiary Authority)

**Project:** FrameNet - Frame Semantics Database
**Maintainer:** International Computer Science Institute (ICSI)
**URL:** https://framenet.icsi.berkeley.edu/
**Use Case:** High-level semantic frames for complex events

**Example Frame: Transfer**
- **Donor:** Entity giving
- **Recipient:** Entity receiving
- **Theme:** Thing transferred

**When to Use FrameNet:**
- For complex multi-participant events (e.g., "The admin received an alert from the server")
- When VerbNet thematic roles are too coarse-grained

---

## Application to TagTeam Testing

### Level 1: Role Assignment Tests

**Test Template:**
```json
{
  "id": "L1-role-assign-001",
  "component": "RoleDetector",
  "input": {
    "verb": "fail",
    "verbClass": "fail-45.6",
    "entities": [
      { "text": "the server", "type": "cco:Artifact", "animacy": "inanimate" }
    ]
  },
  "expected": {
    "roles": [
      { "entity": "the server", "role": "theme", "cco_property": "cco:has_patient" }
    ],
    "forbiddenRoles": [
      { "entity": "*", "role": "patient", "reason": "Intransitive verb - no patient" }
    ]
  },
  "sourceOfTruth": {
    "authority": "VerbNet",
    "class": "fail-45.6",
    "url": "https://verbs.colorado.edu/verb-index/vn/fail-45.6.php"
  }
}
```

### Level 2: Selectional Restriction Tests

**Test Template:**
```json
{
  "id": "L2-selectional-001",
  "input": {
    "verb": "design",
    "verbClass": "build-26.1",
    "entities": [
      { "text": "the server", "animacy": "inanimate" },
      { "text": "the system", "animacy": "inanimate" }
    ]
  },
  "expected": {
    "violation": {
      "type": "animacy_mismatch",
      "role": "agent",
      "required": "[+animate]",
      "actual": "[-animate]",
      "entity": "the server"
    }
  },
  "sourceOfTruth": "VerbNet 26.1 - Agent requires [+animate]"
}
```

---

## Citation Format

**In Test Files:**
```json
"sourceOfTruth": "VerbNet class fail-45.6 (Intransitive change-of-state)"
```

**In Test Runner Output:**
```
❌ L1-role-assign-001 FAILED
   Authority: VerbNet 45.6 (fail verbs)
   Expected: Theme role only (intransitive)
   Actual: Agent + Patient assigned
   Violation: Intransitive verb cannot have patient
```

---

## References

1. Kipper, K., Korhonen, A., Ryant, N., & Palmer, M. (2008). *A large-scale classification of English verbs.* Language Resources and Evaluation, 42(1), 21-40.

2. Palmer, M., Gildea, D., & Kingsbury, P. (2005). *The proposition bank: An annotated corpus of semantic roles.* Computational linguistics, 31(1), 71-106.

3. Fillmore, C. J., & Baker, C. (2010). *A frames approach to semantic analysis.* In B. Heine & H. Narrog (Eds.), *The Oxford Handbook of Linguistic Analysis* (pp. 313-340). Oxford University Press.

---

**Last Updated:** 2026-02-10
**Maintained By:** TagTeam Test Infrastructure Team
