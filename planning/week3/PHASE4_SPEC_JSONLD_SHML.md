# Phase 4: JSON-LD Graph Output & SHML Integration - Specification

**Date**: January 18, 2026
**Version**: TagTeam v3.0.0-alpha.2 (Proposed)
**Status**: SPECIFICATION - Major Architectural Redesign
**Priority**: CRITICAL - Blocks all future development

---

## Executive Summary

This specification defines a **fundamental architectural shift** for TagTeam 3.0 to align with the **Semantically Honest Middle Layer (SHML)** principles. Instead of outputting flat value/context objects, TagTeam will generate **JSON-LD semantic graphs** that model ethical scenarios as networks of BFO/CCO entities, processes, and assertion events.

**New in v2**: Integration of **GIT-Minimal** (Grounded Intentionality Theory) patterns for:
- Context-scoped validity of assertions
- Human/machine assertion type distinction
- Foundation for future validation workflows

### The Problem We're Solving

**Current TagTeam Output (Week 2a):**
```json
{
  "values": ["Autonomy", "Justice"],
  "contextIntensity": {
    "temporal": { "urgency": 0.8 }
  }
}
```

**What's Wrong:**
- Commits the "Predicate Shortcut" - treats detections as facts
- No provenance (who/what detected these values?)
- No semantic structure (who is doing what to whom?)
- No process modeling (the act of parsing itself is invisible)
- Cannot represent disagreement, uncertainty, or belief scopes
- **No context scoping** - same text parsed under different frameworks yields identical output
- **No human/machine distinction** - automated detections indistinguishable from human validations

**SHML+GIT-Compliant Output (Proposed):**
```json
{
  "@context": { ... },
  "@graph": [
    // Entities extracted from text
    { "@id": "ex:Doctor_Referent_0", "@type": "tagteam:DiscourseReferent" },
    { "@id": "ex:Patient_Referent_A", "@type": "tagteam:DiscourseReferent" },

    // Acts and processes
    { "@id": "ex:Allocation_Act_0", "@type": "cco:IntentionalAct" },

    // Assertion events (the middle layer) - NOW WITH GIT EXTENSIONS
    {
      "@id": "ex:Autonomy_Assertion_0",
      "@type": "tagteam:ValueAssertionEvent",
      "tagteam:asserts": "ex:Autonomy_ICE",
      "tagteam:detected_by": "ex:TagTeam_Parser_v3",
      "tagteam:assertionType": "tagteam:AutomatedDetection",
      "tagteam:validInContext": "ex:MedicalEthics_Context",
      "tagteam:temporal_extent": "2026-01-18T..."
    },

    // Interpretation context (NEW - GIT pattern)
    {
      "@id": "ex:MedicalEthics_Context",
      "@type": "tagteam:InterpretationContext",
      "rdfs:label": "Medical Ethics Framework",
      "tagteam:framework": "Principlism (Beauchamp & Childress)"
    }
  ]
}
```

---

## 1. Design Principles (SHML Compliance + GIT Extension)

### 1.1 Semantic Honesty

> **Never represent a state as a static, global truth if it is in fact the output of a process.**

Every TagTeam detection is an **assertion event** produced by a parsing process, not an ontological fact about reality.

### 1.2 Grounded Intentionality (GIT-Minimal)

> **Every assertion has an agent, a context, and a type that determines its epistemic status.**

GIT-Minimal extends SHML by adding:
- **Context scoping**: Assertions are valid within interpretation contexts
- **Assertion typing**: Distinguishes automated detections from human validations
- **Validation workflow foundation**: Enables future human-in-the-loop confirmation

### 1.3 Three-Layer Architecture: Pragmatic Compromise

**Architectural Position**: While SHML theory prescribes LPG for native process modeling, TagTeam implements the middle layer **directly in JSON-LD**, treating assertion events as first-class nodes rather than edge annotations.

**Rationale**:
- TagTeam is a **parser that outputs semantic graphs**, not a graph database
- JSON-LD with proper typing can express process semantics adequately
- Assertion events as nodes (not edge properties) preserves SHML semantics
- Tooling compatibility and serialization simplicity

**Trade-off**: This trades some structural elegance (LPG's native edge properties) for practical benefits (JSON-LD ecosystem, RDF interoperability, no runtime DB dependency).

| Layer | Substrate | Role | TagTeam Implementation |
|-------|-----------|------|----------------------|
| **Reality** | BFO/CCO ontologies | Defines what exists | Conceptual grounding only |
| **Middle (SHML)** | JSON-LD @graph | Models semantic processes | Assertion events as nodes |
| **Logic** | JSON-LD @graph | Public API output | Same structure (no projection) |

**Note**: If future requirements demand true LPG features (e.g., path queries, graph algorithms), the JSON-LD output can be ingested into Neo4j/memgraph as a migration path.

### 1.4 Assertions as Occurrents

Following BFO:
- **Continuants** persist through time (doctors, patients, machines)
- **Occurrents** happen/unfold (allocating, asserting, diagnosing)

**All TagTeam detections are occurrents:**
- Detecting "Autonomy" → `AutonomyAssertionEvent`
- Measuring urgency → `UrgencyAssessmentAct`
- Extracting entities → `EntityExtractionProcess`

---

## 2. Architecture Components

### 2.1 New Core Modules

```
src/
├── graph/
│   ├── SemanticGraphBuilder.js      # Main orchestrator (builds JSON-LD directly)
│   ├── EntityExtractor.js            # Extract discourse referents
│   ├── ActExtractor.js               # Extract intentional acts
│   ├── RoleDetector.js               # Detect BFO roles being realized
│   ├── AssertionEventBuilder.js     # Model parser outputs as events
│   ├── ContextManager.js            # NEW: Manage interpretation contexts (GIT)
│   ├── ComplexityBudget.js          # Enforce node/referent limits
│   └── JSONLDSerializer.js          # Final serialization
│
├── ontology/
│   ├── CCOMapper.js                  # Map to CCO classes
│   ├── BFORelations.js               # BFO relation extraction
│   └── SHMLValidator.js              # SHACL validation (uses shaclValidator.js)
│
└── utils/
    ├── IRIGenerator.js               # Generate IRIs with namespaces
    └── TextChunker.js                # Chunk long texts
```

### 2.2 Data Flow

```
Input Text + Context (optional)
    ↓
[1. NLP Parsing (Compromise)]
    ↓
[2. Entity Extraction] → (Doctor, Patients, Ventilator)
    ↓
[3. Act Extraction] → (Allocation Act)
    ↓
[4. Role Detection] → (Doctor has Agent role, Patients have Patient roles)
    ↓
[5. Value Detection] → (Autonomy, Justice markers)
    ↓
[6. Assertion Event Modeling] → (Each detection becomes an AssertionEvent)
    ↓
[6a. Context Binding (NEW)] → (Bind assertions to interpretation context)
    ↓
[6b. Assertion Typing (NEW)] → (Mark as AutomatedDetection)
    ↓
[7. Graph Construction] → (Build @graph with all entities/acts/assertions)
    ↓
[8. JSON-LD Serialization] → (Output with @context)
    ↓
Output: JSON-LD Graph
```

---

## 3. JSON-LD Output Specification

### 3.1 @context Structure

```json
{
  "@context": {
    "bfo": "http://purl.obolibrary.org/obo/",
    "cco": "http://www.ontologyrepository.com/CommonCoreOntologies/",
    "tagteam": "http://tagteam.fandaws.org/ontology/",
    "inst": "http://tagteam.fandaws.org/instance/",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "owl": "http://www.w3.org/2002/07/owl#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",

    "// === TagTeam Core Classes ===": "",
    "DiscourseReferent": "tagteam:DiscourseReferent",
    "ValueAssertionEvent": "tagteam:ValueAssertionEvent",
    "ContextAssessmentEvent": "tagteam:ContextAssessmentEvent",
    "DocumentParseResult": "tagteam:DocumentParseResult",
    "CrossChunkReference": "tagteam:CrossChunkReference",

    "// === GIT-Minimal Classes (NEW) ===": "",
    "InterpretationContext": "tagteam:InterpretationContext",
    "AutomatedDetection": "tagteam:AutomatedDetection",
    "HumanValidation": "tagteam:HumanValidation",
    "HumanRejection": "tagteam:HumanRejection",
    "HumanCorrection": "tagteam:HumanCorrection",

    "// === DiscourseReferent Properties ===": "",
    "denotesType": { "@id": "tagteam:denotesType", "@type": "@id" },
    "referentialStatus": { "@id": "tagteam:referentialStatus", "@type": "@id" },
    "discourseRole": "tagteam:discourseRole",
    "definiteness": "tagteam:definiteness",

    "// === Confidence Properties (Three-way decomposition) ===": "",
    "extractionConfidence": { "@id": "tagteam:extractionConfidence", "@type": "xsd:decimal" },
    "classificationConfidence": { "@id": "tagteam:classificationConfidence", "@type": "xsd:decimal" },
    "relevanceConfidence": { "@id": "tagteam:relevanceConfidence", "@type": "xsd:decimal" },
    "aggregateConfidence": { "@id": "tagteam:aggregateConfidence", "@type": "xsd:decimal" },
    "aggregationMethod": "tagteam:aggregationMethod",

    "// === GIT-Minimal Properties (NEW) ===": "",
    "validInContext": { "@id": "tagteam:validInContext", "@type": "@id" },
    "assertionType": { "@id": "tagteam:assertionType", "@type": "@id" },
    "validatedBy": { "@id": "tagteam:validatedBy", "@type": "@id" },
    "validationTimestamp": { "@id": "tagteam:validationTimestamp", "@type": "xsd:dateTime" },
    "supersedes": { "@id": "tagteam:supersedes", "@type": "@id" },
    "framework": "tagteam:framework",

    "// === BFO Relations (Use realized_in only, not realizes) ===": "",
    "inheres_in": { "@id": "bfo:BFO_0000052", "@type": "@id" },
    "realized_in": { "@id": "bfo:BFO_0000054", "@type": "@id" },
    "has_participant": { "@id": "bfo:BFO_0000057", "@type": "@id" },

    "// === CCO Relations ===": "",
    "has_agent": { "@id": "cco:has_agent", "@type": "@id" },
    "affects": { "@id": "cco:affects", "@type": "@id" },

    "// === TagTeam Assertion Properties ===": "",
    "asserts": { "@id": "tagteam:asserts", "@type": "@id" },
    "based_on": { "@id": "tagteam:based_on", "@type": "@id" },
    "detected_by": { "@id": "tagteam:detected_by", "@type": "@id" },
    "extracted_from_span": "tagteam:extracted_from_span",
    "span_offset": "tagteam:span_offset",

    "// === Additional Properties ===": "",
    "temporal_extent": { "@id": "tagteam:temporal_extent", "@type": "xsd:dateTime" },
    "detection_method": "tagteam:detection_method",
    "matched_markers": "tagteam:matched_markers"
  }
}
```

**Namespace Strategy**:
- `tagteam:` = `http://tagteam.fandaws.org/ontology/` for TagTeam vocabulary (classes and properties)
- `inst:` = `http://tagteam.fandaws.org/instance/` for production instance IRIs
- `ex:` = `http://example.org/` for examples in documentation ONLY

**Note**: All examples in this specification use `ex:` for readability. Production deployments MUST use `inst:` namespace with session-scoped identifiers.

---

### 3.2 GIT-Minimal Type Definitions

#### 3.2.1 Assertion Types (NEW)

TagTeam distinguishes **who made the assertion** and **what epistemic status it has**:

| Type | IRI | Meaning | Use Case |
|------|-----|---------|----------|
| `AutomatedDetection` | `tagteam:AutomatedDetection` | Parser-generated detection, not human-reviewed | Default for all TagTeam outputs |
| `HumanValidation` | `tagteam:HumanValidation` | Human confirmed automated detection is correct | Post-processing review workflow |
| `HumanRejection` | `tagteam:HumanRejection` | Human rejected automated detection as incorrect | Post-processing review workflow |
| `HumanCorrection` | `tagteam:HumanCorrection` | Human corrected automated detection | Replaces rejected detection |

**Type Hierarchy** (for future OWL ontology):
```
tagteam:AssertionType
  ├── tagteam:AutomatedDetection
  └── tagteam:HumanAssertionType
        ├── tagteam:HumanValidation
        ├── tagteam:HumanRejection
        └── tagteam:HumanCorrection
```

#### 3.2.2 Interpretation Context (NEW)

An `InterpretationContext` scopes assertions to a particular framework, domain, or perspective:

```json
{
  "@id": "ex:MedicalEthics_Context",
  "@type": ["tagteam:InterpretationContext"],
  "rdfs:label": "Medical Ethics Framework",
  "tagteam:framework": "Principlism (Beauchamp & Childress)",
  "rdfs:comment": "Interprets values through the lens of autonomy, beneficence, non-maleficence, and justice"
}
```

**Why this matters:**
- Same text parsed under `MedicalEthics_Context` vs `LegalLiability_Context` may yield different value detections
- Enables comparative analysis: "What values emerge under Framework A vs Framework B?"
- Foundation for belief-scoped reasoning (Phase 5)

**Common Context Types:**

| Context | Framework | Notes |
|---------|-----------|-------|
| `MedicalEthics_Context` | Principlism | Four principles: autonomy, beneficence, non-maleficence, justice |
| `DeontologicalEthics_Context` | Kantian | Duty-based, categorical imperative |
| `UtilitarianEthics_Context` | Consequentialist | Greatest good for greatest number |
| `VirtueEthics_Context` | Aristotelian | Character and flourishing |
| `CareEthics_Context` | Relational | Relationships and responsibilities |
| `Default_Context` | TagTeam Default | No specific framework; general ethical value detection |

---

### 3.3 @graph Node Types

#### 3.3.1 DiscourseReferents (Extracted from Text)

**CRITICAL**: All text-extracted entities are `tagteam:DiscourseReferent`, NOT BFO entities.

**Agent Referent:**
```json
{
  "@id": "ex:Doctor_Referent_a8f3b2",
  "@type": ["tagteam:DiscourseReferent"],
  "rdfs:label": "the doctor",
  "tagteam:denotesType": "cco:Person",
  "tagteam:discourseRole": "agent",
  "tagteam:extracted_from_span": "The doctor",
  "tagteam:span_offset": [0, 10],
  "tagteam:definiteness": "definite",
  "tagteam:referentialStatus": "presupposed"
}
```

**Artifact Referent:**
```json
{
  "@id": "ex:Ventilator_Referent_c4d9e1",
  "@type": ["tagteam:DiscourseReferent"],
  "rdfs:label": "last ventilator",
  "tagteam:denotesType": "cco:Artifact",
  "tagteam:discourseRole": "instrument",
  "tagteam:extracted_from_span": "last ventilator",
  "tagteam:span_offset": [35, 50],
  "tagteam:definiteness": "definite",
  "tagteam:referentialStatus": "presupposed",
  "tagteam:is_scarce": true,
  "tagteam:quantity": 1
}
```

**Key Principle**: TagTeam extracts discourse referents from text, not actual BFO entities. We don't know if "the doctor" is Dr. Smith or a hypothetical agent.

**referentialStatus Values:**
| Value | Meaning | Example |
|-------|---------|---------|
| `presupposed` | Text assumes referent exists (definite article) | "The doctor" |
| `introduced` | Text introduces referent (indefinite article) | "A doctor" |
| `anaphoric` | Refers back to previously introduced referent | "She" (pronoun) |
| `hypothetical` | Thought experiment (may not exist) | "If there were a doctor" |

#### 3.3.2 Roles (BFO Realizables)

```json
{
  "@id": "ex:AgentRole_b7e4f2",
  "@type": ["bfo:BFO_0000023"],
  "rdfs:label": "agent role",
  "inheres_in": "ex:Doctor_Referent_a8f3b2",
  "realized_in": "ex:Allocation_Act_0"
}
```

**Note**: Roles link to discourse referents (what was mentioned in text), not hypothetical BFO entities.

#### 3.3.3 Acts (Occurrents)

```json
{
  "@id": "ex:Allocation_Act_0",
  "@type": ["cco:IntentionalAct"],
  "rdfs:label": "allocation act",
  "has_agent": "ex:Doctor_Referent_a8f3b2",
  "has_participant": ["ex:Patient_Referent_A", "ex:Patient_Referent_B"],
  "affects": "ex:Ventilator_Referent_c4d9e1",
  "tagteam:verb": "allocate",
  "tagteam:tense": "present_modal"
}
```

#### 3.3.4 Assertion Events (Middle Layer) — WITH GIT EXTENSIONS

**Value Assertion (Automated):**
```json
{
  "@id": "ex:Autonomy_Assertion_0",
  "@type": ["tagteam:ValueAssertionEvent"],
  "rdfs:label": "autonomy value assertion",
  "asserts": "ex:Autonomy_ICE",
  "detected_by": "ex:TagTeam_Parser_v3",
  "based_on": "ex:Input_Text_IBE",

  "// GIT-Minimal Extensions": "",
  "assertionType": "tagteam:AutomatedDetection",
  "validInContext": "ex:MedicalEthics_Context",

  "// Confidence (three-way decomposition)": "",
  "extractionConfidence": 0.95,
  "classificationConfidence": 0.85,
  "relevanceConfidence": 0.70,
  "aggregateConfidence": 0.83,
  "aggregationMethod": "geometric_mean",

  "// Provenance": "",
  "temporal_extent": "2026-01-18T10:30:00Z",
  "detection_method": "keyword_pattern_matching",
  "matched_markers": ["autonomy", "decide"]
}
```

**Value Assertion (Human Validated):**
```json
{
  "@id": "ex:Autonomy_Assertion_0_validated",
  "@type": ["tagteam:ValueAssertionEvent"],
  "rdfs:label": "autonomy value assertion (validated)",
  "asserts": "ex:Autonomy_ICE",
  "detected_by": "ex:TagTeam_Parser_v3",
  "based_on": "ex:Input_Text_IBE",

  "// GIT-Minimal Extensions": "",
  "assertionType": "tagteam:HumanValidation",
  "validInContext": "ex:MedicalEthics_Context",
  "validatedBy": "ex:Human_Reviewer_DrSmith",
  "validationTimestamp": "2026-01-18T11:45:00Z",
  "supersedes": "ex:Autonomy_Assertion_0",

  "// Confidence updated after human review": "",
  "aggregateConfidence": 0.95,

  "// Original detection preserved": "",
  "temporal_extent": "2026-01-18T10:30:00Z"
}
```

**Value Assertion (Human Rejected):**
```json
{
  "@id": "ex:Autonomy_Assertion_0_rejected",
  "@type": ["tagteam:ValueAssertionEvent"],
  "rdfs:label": "autonomy value assertion (rejected)",
  "asserts": "ex:Autonomy_ICE",

  "assertionType": "tagteam:HumanRejection",
  "validInContext": "ex:MedicalEthics_Context",
  "validatedBy": "ex:Human_Reviewer_DrSmith",
  "validationTimestamp": "2026-01-18T11:45:00Z",
  "supersedes": "ex:Autonomy_Assertion_0",

  "rdfs:comment": "Reviewer determined autonomy is not actually at stake in this scenario"
}
```

**Confidence Breakdown:**
- **extractionConfidence** (0.95): High confidence that "autonomy" and "decide" were correctly identified as keywords
- **classificationConfidence** (0.85): High confidence that these map to IEE:Autonomy (not political autonomy)
- **relevanceConfidence** (0.70): Moderate confidence that autonomy is genuinely at stake (not just mentioned in passing)
- **aggregateConfidence** (0.83): Geometric mean = (0.95 × 0.85 × 0.70)^(1/3)

**Context Assessment Event:**
```json
{
  "@id": "ex:Urgency_Assessment_0",
  "@type": ["tagteam:ContextAssessmentEvent"],
  "rdfs:label": "urgency assessment",
  "asserts": "ex:Urgency_ICE",
  "tagteam:dimension": "temporal.urgency",
  "tagteam:score": 0.8,

  "// GIT-Minimal Extensions": "",
  "assertionType": "tagteam:AutomatedDetection",
  "validInContext": "ex:Default_Context",

  "extractionConfidence": 0.98,
  "classificationConfidence": 0.95,
  "relevanceConfidence": 0.90,
  "aggregateConfidence": 0.94,
  "aggregationMethod": "geometric_mean",

  "detected_by": "ex:TagTeam_ContextAnalyzer_v3",
  "based_on": ["ex:Modal_Verb_Must", "ex:Critical_Illness_Pattern"]
}
```

#### 3.3.5 Information Content Entities (ICE)

```json
{
  "@id": "ex:Autonomy_ICE",
  "@type": ["cco:InformationContentEntity"],
  "rdfs:label": "Autonomy (ethical value)",
  "cco:is_about": "ex:Allocation_Act_0",
  "tagteam:polarity": 1,
  "tagteam:salience": 0.8
}
```

#### 3.3.6 Information Bearing Entities (IBE)

```json
{
  "@id": "ex:Input_Text_IBE",
  "@type": ["cco:InformationBearingEntity"],
  "rdfs:label": "input text",
  "cco:has_text_value": "The doctor must allocate the last ventilator between two critically ill patients",
  "tagteam:char_count": 81,
  "tagteam:received_at": "2026-01-18T10:30:00Z"
}
```

#### 3.3.7 Interpretation Context (NEW - GIT)

```json
{
  "@id": "ex:MedicalEthics_Context",
  "@type": ["tagteam:InterpretationContext"],
  "rdfs:label": "Medical Ethics Framework",
  "tagteam:framework": "Principlism (Beauchamp & Childress)",
  "rdfs:comment": "Four principles: autonomy, beneficence, non-maleficence, justice"
}
```

#### 3.3.8 Human Reviewer Agent (NEW - GIT)

```json
{
  "@id": "ex:Human_Reviewer_DrSmith",
  "@type": ["cco:Person"],
  "rdfs:label": "Dr. Smith (Human Reviewer)",
  "tagteam:reviewer_id": "drsmith@hospital.org",
  "tagteam:qualification": "Medical Ethics Board Certified"
}
```

---

## 4. Extraction Rules

### 4.1 Entity Extraction

**CRITICAL**: All extracted entities are `tagteam:DiscourseReferent` nodes, NOT BFO entities.

**Agents (Compromise NLP):**
- Extract `#Person`, `#Occupation`, proper nouns
- Create `tagteam:DiscourseReferent` with `denotesType: cco:Person`
- Set `referentialStatus` based on definiteness ("the doctor" → `presupposed`, "a doctor" → `introduced`)
- Preserve text span for traceability

**Patients:**
- Extract objects of verbs (receive action)
- Create `tagteam:DiscourseReferent` with `denotesType: cco:Person`
- Set `discourseRole: "patient"`

**Artifacts:**
- Extract `#Thing`, medical equipment, resources
- Create `tagteam:DiscourseReferent` with `denotesType: cco:Artifact`
- Mark scarcity/quantity if indicated

**Numeric Entities:**
- "two patients" → extract cardinality, create multiple referents
- "last ventilator" → mark scarcity in referent properties

### 4.2 Act Extraction

**Verb Phrase Patterns:**
- Modal verbs (`must`, `should`) → deontic modality
- Action verbs → map to CCO act types
  - `allocate` → `cco:ActOfAllocation`
  - `decide` → `cco:ActOfDecisionMaking`
  - `diagnose` → `cco:ActOfDiagnosing`

**Act Properties:**
- `has_agent`: subject of sentence (link to discourse referent)
- `has_participant`: direct/indirect objects (link to discourse referents)
- `affects`: resources/artifacts involved (link to discourse referents)
- `tagteam:modality`: modal force (obligation/permission/prohibition)

### 4.3 Role Detection

**Role Patterns:**
- Agent performing intentional act → `bfo:Role` (agent role)
- Patient receiving care → `cco:PatientRole`
- Authority making decision → `cco:AuthorityRole`

**Role Realization:**
- Every role links to discourse referent via `inheres_in`
- Every role links to process via `realized_in`

### 4.4 Value Detection (SHML + GIT)

**Current Detection:** Pattern matching on semantic markers

**New SHML+GIT Wrapping:**
```javascript
// OLD (Week 2a)
return { values: ["Autonomy"], polarity: 1 };

// NEW (Phase 4 + GIT) - Returns nodes to be added to @graph
return [
  // The assertion event with GIT extensions
  {
    "@id": "ex:Autonomy_Assertion_0",
    "@type": "tagteam:ValueAssertionEvent",
    "asserts": "ex:Autonomy_ICE",
    "detected_by": "ex:TagTeam_Parser_v3",
    
    // GIT-Minimal properties
    "assertionType": "tagteam:AutomatedDetection",
    "validInContext": context || "ex:Default_Context",
    
    "matched_markers": ["decide", "autonomy"],
    "extractionConfidence": 0.90,
    "classificationConfidence": 0.85,
    "relevanceConfidence": 0.80,
    "aggregateConfidence": 0.85,
    "aggregationMethod": "geometric_mean"
  },
  // The ICE (separate node)
  {
    "@id": "ex:Autonomy_ICE",
    "@type": "cco:InformationContentEntity",
    "rdfs:label": "Autonomy (ethical value)",
    "tagteam:polarity": 1
  }
];
```

### 4.5 Context Intensity → Assessment Events

**12 Dimensions become 12 Assessment Events:**

```javascript
// OLD
contextIntensity: {
  temporal: { urgency: 0.8, duration: 1.0 }
}

// NEW (with GIT extensions)
[
  {
    "@id": "ex:Urgency_Assessment_0",
    "@type": "tagteam:ContextAssessmentEvent",
    "tagteam:dimension": "temporal.urgency",
    "tagteam:score": 0.8,
    "assertionType": "tagteam:AutomatedDetection",
    "validInContext": "ex:Default_Context",
    "based_on": ["ex:Modal_Must_Pattern", "ex:Critical_State_Marker"]
  },
  {
    "@id": "ex:Duration_Assessment_0",
    "@type": "tagteam:ContextAssessmentEvent",
    "tagteam:dimension": "temporal.duration",
    "tagteam:score": 1.0,
    "assertionType": "tagteam:AutomatedDetection",
    "validInContext": "ex:Default_Context",
    "based_on": ["ex:Irreversible_Outcome_Pattern"]
  }
]
```

---

## 5. SHACL Validation (Integration Point)

User will provide SHACL shapes to validate:
- BFO/CCO class usage
- Required relations (e.g., every `IntentionalAct` must have `has_agent`)
- Cardinality constraints
- Domain/range restrictions
- **NEW**: GIT-Minimal constraints (e.g., every assertion must have `assertionType`)

**Validation Flow:**
```
Generate JSON-LD Graph
    ↓
Load SHACL Shapes
    ↓
Validate with SHACL processor
    ↓
Report violations OR
    ↓
Return validated graph
```

**GIT-Minimal SHACL Shape (Example):**
```turtle
tagteam:ValueAssertionEventShape a sh:NodeShape ;
  sh:targetClass tagteam:ValueAssertionEvent ;
  sh:property [
    sh:path tagteam:assertionType ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:in ( tagteam:AutomatedDetection tagteam:HumanValidation tagteam:HumanRejection tagteam:HumanCorrection ) ;
  ] ;
  sh:property [
    sh:path tagteam:validInContext ;
    sh:minCount 1 ;
    sh:class tagteam:InterpretationContext ;
  ] .
```

---

## 6. Example: Full Output for Ventilator Scenario

**Input:**
```
"The doctor must allocate the last ventilator between two critically ill patients"
```

**Parse Options:**
```javascript
TagTeam.parse(text, { 
  format: 'jsonld',
  context: 'MedicalEthics'  // NEW: specify interpretation context
})
```

**Output:**
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
    "ValueAssertionEvent": "tagteam:ValueAssertionEvent",
    "ContextAssessmentEvent": "tagteam:ContextAssessmentEvent",
    "InterpretationContext": "tagteam:InterpretationContext",
    "AutomatedDetection": "tagteam:AutomatedDetection",
    
    "denotesType": { "@id": "tagteam:denotesType", "@type": "@id" },
    "referentialStatus": "tagteam:referentialStatus",
    "assertionType": { "@id": "tagteam:assertionType", "@type": "@id" },
    "validInContext": { "@id": "tagteam:validInContext", "@type": "@id" },
    "asserts": { "@id": "tagteam:asserts", "@type": "@id" },
    "based_on": { "@id": "tagteam:based_on", "@type": "@id" },
    "detected_by": { "@id": "tagteam:detected_by", "@type": "@id" },
    "inheres_in": { "@id": "bfo:BFO_0000052", "@type": "@id" },
    "realized_in": { "@id": "bfo:BFO_0000054", "@type": "@id" },
    "has_agent": { "@id": "cco:has_agent", "@type": "@id" },
    "has_participant": { "@id": "bfo:BFO_0000057", "@type": "@id" },
    "affects": { "@id": "cco:affects", "@type": "@id" },
    "extractionConfidence": { "@id": "tagteam:extractionConfidence", "@type": "xsd:decimal" },
    "classificationConfidence": { "@id": "tagteam:classificationConfidence", "@type": "xsd:decimal" },
    "relevanceConfidence": { "@id": "tagteam:relevanceConfidence", "@type": "xsd:decimal" },
    "aggregateConfidence": { "@id": "tagteam:aggregateConfidence", "@type": "xsd:decimal" }
  },
  "@graph": [
    
    {
      "@id": "ex:MedicalEthics_Context",
      "@type": ["tagteam:InterpretationContext"],
      "rdfs:label": "Medical Ethics Framework",
      "tagteam:framework": "Principlism (Beauchamp & Childress)"
    },

    {
      "@id": "ex:Doctor_Referent_0",
      "@type": ["tagteam:DiscourseReferent"],
      "rdfs:label": "the doctor",
      "denotesType": "cco:Person",
      "tagteam:discourseRole": "agent",
      "tagteam:extracted_from_span": "The doctor",
      "tagteam:span_offset": [0, 10],
      "tagteam:definiteness": "definite",
      "referentialStatus": "presupposed"
    },
    {
      "@id": "ex:Patient_Referent_A",
      "@type": ["tagteam:DiscourseReferent"],
      "rdfs:label": "patient (critically ill)",
      "denotesType": "cco:Person",
      "tagteam:discourseRole": "patient",
      "referentialStatus": "presupposed",
      "tagteam:is_critically_ill": true
    },
    {
      "@id": "ex:Patient_Referent_B",
      "@type": ["tagteam:DiscourseReferent"],
      "rdfs:label": "patient (critically ill)",
      "denotesType": "cco:Person",
      "tagteam:discourseRole": "patient",
      "referentialStatus": "presupposed",
      "tagteam:is_critically_ill": true
    },
    {
      "@id": "ex:Ventilator_Referent_0",
      "@type": ["tagteam:DiscourseReferent"],
      "rdfs:label": "last ventilator",
      "denotesType": "cco:Artifact",
      "tagteam:discourseRole": "instrument",
      "referentialStatus": "presupposed",
      "tagteam:is_scarce": true,
      "tagteam:quantity": 1
    },

    {
      "@id": "ex:AgentRole_0",
      "@type": ["bfo:BFO_0000023"],
      "rdfs:label": "agent role",
      "inheres_in": "ex:Doctor_Referent_0",
      "realized_in": "ex:Allocation_Act_0"
    },
    {
      "@id": "ex:PatientRole_A",
      "@type": ["cco:PatientRole"],
      "inheres_in": "ex:Patient_Referent_A",
      "realized_in": "ex:Allocation_Act_0"
    },
    {
      "@id": "ex:PatientRole_B",
      "@type": ["cco:PatientRole"],
      "inheres_in": "ex:Patient_Referent_B",
      "realized_in": "ex:Allocation_Act_0"
    },

    {
      "@id": "ex:Allocation_Act_0",
      "@type": ["cco:IntentionalAct"],
      "rdfs:label": "allocation act",
      "has_agent": "ex:Doctor_Referent_0",
      "has_participant": ["ex:Patient_Referent_A", "ex:Patient_Referent_B"],
      "affects": "ex:Ventilator_Referent_0",
      "tagteam:verb": "allocate",
      "tagteam:modality": "obligation"
    },

    {
      "@id": "ex:Justice_Assertion_0",
      "@type": ["tagteam:ValueAssertionEvent"],
      "rdfs:label": "justice value assertion",
      "asserts": "ex:Justice_ICE",
      "detected_by": "ex:TagTeam_Parser_v3.0.0",
      "based_on": "ex:Input_Text_IBE",
      "assertionType": "tagteam:AutomatedDetection",
      "validInContext": "ex:MedicalEthics_Context",
      "extractionConfidence": 0.95,
      "classificationConfidence": 0.90,
      "relevanceConfidence": 0.95,
      "aggregateConfidence": 0.93,
      "tagteam:aggregationMethod": "geometric_mean",
      "tagteam:temporal_extent": "2026-01-18T10:30:00Z",
      "tagteam:detection_method": "keyword_pattern_matching",
      "tagteam:matched_markers": ["allocate", "between", "two"]
    },
    {
      "@id": "ex:Autonomy_Assertion_0",
      "@type": ["tagteam:ValueAssertionEvent"],
      "rdfs:label": "autonomy value assertion",
      "asserts": "ex:Autonomy_ICE",
      "detected_by": "ex:TagTeam_Parser_v3.0.0",
      "based_on": "ex:Input_Text_IBE",
      "assertionType": "tagteam:AutomatedDetection",
      "validInContext": "ex:MedicalEthics_Context",
      "extractionConfidence": 0.85,
      "classificationConfidence": 0.70,
      "relevanceConfidence": 0.70,
      "aggregateConfidence": 0.75,
      "tagteam:aggregationMethod": "geometric_mean",
      "tagteam:matched_markers": ["patients", "decide"]
    },
    {
      "@id": "ex:Urgency_Assessment_0",
      "@type": ["tagteam:ContextAssessmentEvent"],
      "rdfs:label": "urgency assessment",
      "asserts": "ex:Urgency_ICE",
      "tagteam:dimension": "temporal.urgency",
      "tagteam:score": 1.0,
      "assertionType": "tagteam:AutomatedDetection",
      "validInContext": "ex:MedicalEthics_Context",
      "extractionConfidence": 0.98,
      "classificationConfidence": 0.95,
      "relevanceConfidence": 0.92,
      "aggregateConfidence": 0.95,
      "tagteam:aggregationMethod": "geometric_mean",
      "based_on": ["ex:Modal_Must", "ex:Critical_Illness", "ex:Scarce_Resource"]
    },

    {
      "@id": "ex:Justice_ICE",
      "@type": ["cco:InformationContentEntity"],
      "rdfs:label": "Justice (ethical value)",
      "cco:is_about": "ex:Allocation_Act_0",
      "tagteam:polarity": 1,
      "tagteam:salience": 0.9
    },
    {
      "@id": "ex:Autonomy_ICE",
      "@type": ["cco:InformationContentEntity"],
      "rdfs:label": "Autonomy (ethical value)",
      "tagteam:polarity": 0,
      "tagteam:salience": 0.6,
      "rdfs:comment": "Patients' autonomy is constrained by scarcity"
    },
    {
      "@id": "ex:Urgency_ICE",
      "@type": ["cco:InformationContentEntity"],
      "rdfs:label": "High urgency context",
      "cco:is_about": "ex:Allocation_Act_0"
    },

    {
      "@id": "ex:Input_Text_IBE",
      "@type": ["cco:InformationBearingEntity"],
      "cco:has_text_value": "The doctor must allocate the last ventilator between two critically ill patients",
      "tagteam:received_at": "2026-01-18T10:30:00Z"
    },

    {
      "@id": "ex:TagTeam_Parser_v3.0.0",
      "@type": ["cco:ArtificialAgent"],
      "rdfs:label": "TagTeam.js Parser v3.0.0-alpha.2",
      "tagteam:version": "3.0.0-alpha.2",
      "tagteam:algorithm": "BFO-aware NLP with CCO mapping"
    }
  ]
}
```

---

## 7. Backward Compatibility

### 7.1 Legacy Output Mode

Provide opt-in flag for old format:

```javascript
TagTeam.parse(text, { format: 'legacy' })
// Returns Week 2a format: { values: [...], contextIntensity: {...} }

TagTeam.parse(text, { format: 'jsonld' })  // DEFAULT
// Returns full SHML+GIT-compliant JSON-LD graph

TagTeam.parse(text, { format: 'jsonld', context: 'MedicalEthics' })  // NEW
// Returns JSON-LD with specific interpretation context
```

### 7.2 Projection Helpers

```javascript
// Extract simple values from graph
TagTeam.extractValues(graph)
// Returns: ["Autonomy", "Justice"]

// Extract context scores
TagTeam.extractContextScores(graph)
// Returns: { temporal: { urgency: 1.0 }, ... }

// NEW: Filter assertions by type
TagTeam.extractAssertionsByType(graph, 'HumanValidation')
// Returns: [only human-validated assertion events]

// NEW: Filter assertions by context
TagTeam.extractAssertionsByContext(graph, 'MedicalEthics_Context')
// Returns: [only assertions valid in medical ethics context]
```

---

## 8. Implementation Phases

### Phase 4.1: Core Infrastructure (Week 1)
- [ ] SemanticGraphBuilder module
- [ ] EntityExtractor (Compromise integration)
- [ ] ActExtractor (verb phrase analysis)
- [ ] JSONLDSerializer with @context

### Phase 4.2: Assertion Event Modeling (Week 1-2)
- [ ] AssertionEventBuilder
- [ ] Wrap current value detection in assertion events
- [ ] Wrap context intensity in assessment events
- [ ] ICE/IBE node generation
- [ ] **NEW**: Add `assertionType: AutomatedDetection` to all assertions
- [ ] **NEW**: Add `validInContext` binding

### Phase 4.3: BFO/CCO Mapping (Week 2)
- [ ] CCOMapper with class hierarchy
- [ ] BFORelations extractor
- [ ] Role detection logic
- [ ] Integration with ontology manifests from Phase 2

### Phase 4.4: GIT-Minimal Integration (Week 2) — NEW
- [ ] ContextManager module
- [ ] InterpretationContext node generation
- [ ] Default_Context fallback
- [ ] Context parameter in parse options

### Phase 4.5: SHACL Validation (Week 2-3)
- [ ] Load user-provided SHACL shapes
- [ ] Integrate SHACL-JS or rdflib validator
- [ ] Validation reporting
- [ ] Auto-fix common violations
- [ ] **NEW**: GIT-Minimal validation shapes

### Phase 4.6: Testing & Documentation (Week 3)
- [ ] 50+ test scenarios from IEE corpus
- [ ] Validation against CCO/BFO standards
- [ ] SHACL conformance testing
- [ ] User documentation
- [ ] **NEW**: GIT integration examples

---

## 9. Success Criteria

### 9.1 Functional Requirements
- [ ] Every TagTeam output is valid JSON-LD
- [ ] All entities typed as DiscourseReferent (not BFO entities)
- [ ] All detections modeled as assertion events
- [ ] Provenance tracked (parser version, timestamp, confidence)
- [ ] SHACL validation passes
- [ ] **NEW**: All assertions have `assertionType`
- [ ] **NEW**: All assertions have `validInContext`

### 9.2 SHML Compliance
- [ ] No "predicate shortcuts" - all assertions are events
- [ ] ICE/IBE distinction maintained
- [ ] Process model explicit (parser acts are visible)
- [ ] Multiple belief scopes supportable (future)

### 9.3 GIT-Minimal Compliance (NEW)
- [ ] Human/machine distinction expressible
- [ ] Context scoping functional
- [ ] Validation workflow foundation in place
- [ ] Supersession chain trackable

### 9.4 Performance
- [ ] Parse time < 200ms for typical scenario
- [ ] JSON-LD output < 50 KB
- [ ] Validation time < 100ms

---

## 10. Architectural Decisions (RESOLVED)

### ✓ 1. LPG vs JSON-LD Native Format
**Decision**: JSON-LD is the native format. No separate LPG implementation.

### ✓ 2. DiscourseReferent Type
**Decision**: Use `tagteam:DiscourseReferent` for all text-extracted entities.
- Distinguishes discourse (what was mentioned) from reality (what exists)
- All entities link to discourse referents, not BFO entities

### ✓ 3. Confidence Scores Precision
**Decision**: Confidence measures **parser certainty**, not truth.
- Range: [0.0, 1.0]
- Breakdown: extractionConfidence, classificationConfidence, relevanceConfidence
- Aggregate: geometric mean

### ✓ 4. Fix `realizes` Relation Direction
**Decision**: Use `bfo:realized_in` from Role → Process only (no redundant inverse).

### ✓ 5. Complexity Budget & Chunking
**Decision**: Hard limits enforced:
- Max 200 nodes per graph
- Max 30 discourse referents
- Max 50 assertion events
- Max 2000 characters input
- Chunking strategy for longer texts

### ✓ 6. Namespace Strategy
**Decision**: Hybrid approach
- `tagteam:` = `http://tagteam.fandaws.org/ontology/` for TagTeam vocabulary
- `inst:` = `http://tagteam.fandaws.org/instance/` for production instance IRIs
- `ex:` = `http://example.org/` for examples in documentation ONLY
- CCO/BFO namespaces as standard

### ✓ 7. GIT-Minimal Integration (NEW)
**Decision**: Integrate GIT patterns minimally:
- Add `assertionType` property (AutomatedDetection | HumanValidation | HumanRejection | HumanCorrection)
- Add `validInContext` property linking to InterpretationContext
- Add `InterpretationContext` class for framework scoping
- Add `supersedes` for validation workflow chains
- Defer full GIT ontology import to future phase

### Remaining Open Questions

1. **CCO Version**: Which version to target? (Latest is ~2023)
2. **Belief Scopes**: Phase 5 feature (GIT-Minimal provides foundation)

---

## 11. GIT-Minimal Future Extensions (Phase 5+)

The GIT-Minimal integration in Phase 4 provides foundation for:

### Phase 5: Validation Workflows
- UI for human review of automated detections
- Batch validation tools
- Confidence recalibration based on human feedback

### Phase 6: Multi-Context Comparison
- Parse same text under multiple frameworks
- Generate differential analysis
- Support ethical framework comparison research

### Phase 7: Full GIT Integration (Optional)
- Import GIT ontology formally
- Align `tagteam:ValueAssertionEvent` as subclass of `git:InterpretationAct`
- Interoperability with Concretize and other GIT-compliant tools

---

## 12. Next Steps

**Immediate (Today):**
1. User provides SHACL shapes
2. Review/approve this specification
3. Confirm GIT-Minimal scope is appropriate

**Week 1:**
1. Implement SemanticGraphBuilder skeleton
2. Integrate Compromise for entity extraction
3. Create first JSON-LD output (entities only)

**Week 2:**
1. Add assertion event wrapping with GIT extensions
2. Implement BFO/CCO mapping
3. ContextManager module
4. SHACL validation integration

**Week 3:**
1. Full IEE corpus testing
2. Documentation
3. Release v3.0.0-alpha.2

---

**Document Version**: 2.0
**Status**: SPECIFICATION - Includes GIT-Minimal Integration
**Last Updated**: January 18, 2026
**Dependencies**: Phase 2 (TTL Parser) ✓ Complete
**Blocks**: Phase 5, Phase 6
**Owner**: TagTeam Development Team + Fandaws Ontology Service
