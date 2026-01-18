# SHACL Validation Patterns Reference

**Expert Review Status**: ✅ APPROVED (2026-01-09)
**Source**: Fandaws Ontology Service - CCO/BFO Realist Ontologist
**TagTeam Integration**: Phase 4 - JSON-LD Output Validation

---

## Overview

This document summarizes the **expert-approved SHACL validation patterns** from the Fandaws shaclValidator that TagTeam 3.0 will implement for JSON-LD graph output validation.

All patterns follow **BFO/CCO realist ontology principles** and have been certified by a CCO/BFO expert.

---

## Pattern 1: Information Staircase

**Purpose**: Validates the ICE → IBE → Literal pattern for representing information

**Rules**:
1. **ICE Concretization** (WARNING)
   - Every `cco:InformationContentEntity` SHOULD have `cco:is_concretized_by` relationship to an IBE
   - Expert rationale: "ICE can exist abstractly (like a Law or Recipe), but for practical modeling it should be concretized"

2. **IBE Text Value** (WARNING)
   - Every `cco:InformationBearingEntity` that concretizes an ICE SHOULD have `cco:has_text_value`
   - Completes the staircase from abstract info to concrete text

3. **IBE Concretization** (WARNING)
   - Every IBE SHOULD concretize at least one ICE (via `cco:concretizes` or inverse)
   - Expert rationale: "Blank slate IBE is rarely the modeling intent"

**TagTeam Application**:
```json
{
  "@id": "ex:Autonomy_ICE",
  "@type": "cco:InformationContentEntity",
  "cco:is_concretized_by": "ex:Input_Text_IBE"  // ← Rule 1
},
{
  "@id": "ex:Input_Text_IBE",
  "@type": "cco:InformationBearingEntity",
  "cco:concretizes": "ex:Autonomy_ICE",
  "cco:has_text_value": "The doctor must allocate..."  // ← Rule 2
}
```

---

## Pattern 2: Role Pattern

**Purpose**: Validates that BFO Roles are properly borne and optionally realized

**Rules**:
1. **Role Bearer** (VIOLATION)
   - Every `bfo:Role` (or `cco:Role`) MUST be borne by at least one entity
   - Uses `cco:is_bearer_of` predicate
   - Expert rationale: **"A Role cannot exist without a bearer - this is ontologically impossible"**
   - BFO Principle: "Bearer Necessity"

2. **Bearer Type** (WARNING)
   - Bearer SHOULD be an `bfo:IndependentContinuant` (or subclass like `cco:Person`, `cco:Agent`)
   - Only independent continuants can bear roles per BFO

3. **Role Realization** (WARNING)
   - Role SHOULD be realized by at least one `bfo:Process` (or subclass like `cco:Act`)
   - Uses `cco:realizes` predicate
   - Expert rationale: **"Dispositions can remain dormant"** (BFO Principle: "The Realization Fallacy")
   - Example: Fire extinguisher role exists even if never used

4. **Realizer Type** (WARNING)
   - Realizer SHOULD be a `bfo:Process` or subclass

**TagTeam Application**:
```json
{
  "@id": "ex:Doctor_0",
  "@type": "cco:Agent",
  "cco:is_bearer_of": "ex:AgentRole_0"  // ← Rule 1 (bearer link)
},
{
  "@id": "ex:AgentRole_0",
  "@type": "bfo:BFO_0000023",  // Role
  "cco:realized_in": "ex:Allocation_Act_0"  // ← Rule 3 (realization link)
},
{
  "@id": "ex:Allocation_Act_0",
  "@type": "cco:IntentionalAct",  // Process subclass
  "cco:realizes": "ex:AgentRole_0"
}
```

---

## Pattern 3: Designation Pattern

**Purpose**: Validates that Designative ICEs (names, identifiers) actually designate something

**Rules**:
1. **Designation Link** (VIOLATION)
   - Every `cco:DesignativeInformationContentEntity` MUST designate an entity
   - Can use `cco:designates` (preferred) OR inverse `cco:is_designated_by`
   - Expert rationale: **"A 'Name' that names nothing is not a Designative ICE in a realist sense"**

**TagTeam Application**:
```json
{
  "@id": "ex:DoctorName_ICE",
  "@type": "cco:DesignativeInformationContentEntity",
  "cco:designates": "ex:Doctor_0"  // ← Rule 1 (must designate)
}
```

---

## Pattern 4: Temporal Interval Pattern

**Purpose**: Validates temporal intervals have valid start/end times

**Rules**:
1. **Interval Start Time** (WARNING)
   - `cco:TemporalInterval` SHOULD have `cco:has_start_time` relationship
   - Value is a literal (datetime)

2. **Interval End Time** (WARNING)
   - `cco:TemporalInterval` SHOULD have `cco:has_end_time` relationship
   - Ongoing processes may lack end time (hence WARNING not VIOLATION)

3. **Time Ordering** (VIOLATION)
   - If both start and end times exist, start MUST be <= end
   - Expert rationale: "Backwards time intervals are logically/ontologically impossible"

**TagTeam Application**:
```json
{
  "@id": "ex:Allocation_TimeInterval",
  "@type": "cco:TemporalInterval",
  "cco:has_start_time": "2026-01-18T10:30:00Z",  // ← Rule 1
  "cco:has_end_time": "2026-01-18T10:35:00Z"     // ← Rule 2
  // start < end → Rule 3 satisfied
}
```

---

## Pattern 5: Measurement Pattern

**Purpose**: Validates that quality measurements are complete

**Rules**:
1. **Measurement Target** (VIOLATION)
   - Every `cco:QualityMeasurement` MUST be linked to a `bfo:Quality`
   - Uses inverse `cco:is_measured_by` predicate
   - Rationale: "A measurement without a target quality is meaningless"

2. **Measurement Value** (VIOLATION)
   - Every `cco:QualityMeasurement` MUST have `cco:has_measurement_value`
   - Value is numeric literal
   - Rationale: "A measurement without a value is incomplete"

3. **Measurement Unit** (VIOLATION)
   - Every `cco:QualityMeasurement` MUST have `cco:uses_measurement_unit`
   - Links to `cco:MeasurementUnit`
   - Rationale: "A numeric value without a unit is ambiguous (is '5' meters, kilograms, or something else?)"

**TagTeam Application**:
```json
{
  "@id": "ex:Urgency_Quality",
  "@type": "bfo:BFO_0000019",  // Quality
  "cco:is_measured_by": "ex:Urgency_Measurement"  // ← Rule 1
},
{
  "@id": "ex:Urgency_Measurement",
  "@type": "cco:QualityMeasurement",
  "cco:has_measurement_value": 0.8,  // ← Rule 2
  "cco:uses_measurement_unit": "ex:NormalizedScore_Unit"  // ← Rule 3
}
```

---

## Pattern 6: Socio-Primal Pattern (Agent/Act)

**Purpose**: Validates social reality through agent participation in temporal acts

**Expert Note**: "This pattern was MISSING from original set. Critical for modeling agent participation in temporal activities."

**Rules**:
1. **Act Temporal Grounding** (WARNING)
   - `cco:Act` SHOULD have `cco:occurs_during` relationship to `cco:TemporalInterval`
   - Helps establish when the act took place

2. **Act Participant** (WARNING)
   - `cco:Act` SHOULD have at least one participant (agent)
   - Uses inverse `cco:participates_in` predicate
   - Rationale: "Acts without participants are abstract descriptions"

**TagTeam Application**:
```json
{
  "@id": "ex:Allocation_Act_0",
  "@type": "cco:IntentionalAct",
  "cco:occurs_during": "ex:Allocation_TimeInterval",  // ← Rule 1
  "cco:has_participant": ["ex:Doctor_0", "ex:Patient_A", "ex:Patient_B"]
},
{
  "@id": "ex:Doctor_0",
  "@type": "cco:Agent",
  "cco:participates_in": "ex:Allocation_Act_0"  // ← Rule 2 (inverse)
}
```

---

## Pattern 7: Domain/Range Validation

**Purpose**: Validates that predicates are used with appropriate subject/object types

**Expert Addition (2026-01-13)**: "Realist Glue" properties added

**Key Predicates with Constraints**:

### Information Flow
- `cco:is_concretized_by`: ICE → IBE
- `cco:concretizes`: IBE → ICE
- `cco:has_text_value`: IBE → Literal

### Role/Realization
- `cco:is_bearer_of`: IndependentContinuant → Role
- `cco:realizes`: Process → Role
- `cco:designates`: DesignativeICE → Entity
- `cco:is_designated_by`: Entity → DesignativeICE

### Participation
- `cco:participates_in`: Agent → Act/Process
- `cco:occurs_during`: Act/Process → TemporalInterval

### Measurement
- `cco:has_measurement_value`: QualityMeasurement → Literal
- `cco:uses_measurement_unit`: QualityMeasurement → MeasurementUnit
- `cco:is_measured_by`: Quality → QualityMeasurement

### Realist Glue (Expert Certified 2026-01-13)
- `cco:is_part_of`: **Continuant → Continuant** (strict like-to-like)
  - VIOLATION if Continuant → Process (cross-category)
  - Expert: "A Continuant can participate in a Process, but NEVER be a part of it"
- `cco:is_attribute_of`: Quality/Disposition → IndependentContinuant
- `cco:affects`: Process → MaterialEntity
- `cco:is_made_of`: Artifact → MaterialEntity
- `cco:is_site_of`: Site/Facility → Process

**Severity**: WARNING (not VIOLATION) since type inference is limited in graph validation

---

## Pattern 8: Vocabulary Validation

**Purpose**: Catches typos and unrecognized CCO/BFO terms

**Expert Escalation (2026-01-13)**: Elevated from INFO to WARNING

**Rules**:
1. **Unrecognized Classes** (WARNING)
   - All classes should be from known CCO/BFO namespaces
   - Class names validated against CCO/BFO reference lists
   - Catches typos like `cco:Persosn` instead of `cco:Person`
   - Expert rationale: "A typo represents a failure to ground the model in CCO's semantic space"

2. **Unrecognized Predicates** (WARNING)
   - All predicates should be from known vocabularies (CCO/RDF/RDFS/OWL)
   - Helps catch custom predicates that may not be semantically valid

**TagTeam Application**:
- Before generating JSON-LD, validate all IRIs against known vocabularies
- Provide helpful error messages suggesting correct spellings

---

## Severity Levels (Aligned with SHACL)

### VIOLATION
- **Must be fixed** - ontologically impossible otherwise
- Examples:
  - Role without bearer
  - Name that doesn't designate anything
  - Measurement without value or unit
  - Backwards time intervals

### WARNING
- **Should be addressed** - incomplete but valid
- Examples:
  - Role not realized (dormant disposition)
  - ICE without IBE concretization
  - Act without temporal interval
  - Unrecognized vocabulary

### INFO
- **Suggestion** - nice to have
- Examples:
  - Additional metadata recommendations
  - Style conventions

---

## Implementation Priority for TagTeam Phase 4

### Priority 1 (Must Have - Week 1-2)
1. **Role Pattern** - Core to BFO modeling
2. **Information Staircase** - Required for all ICE/IBE output
3. **Domain/Range Validation** - Prevents semantic errors

### Priority 2 (Should Have - Week 2)
4. **Socio-Primal Pattern** - Critical for agent/act modeling
5. **Designation Pattern** - For entity naming
6. **Vocabulary Validation** - Catches typos early

### Priority 3 (Nice to Have - Week 3)
7. **Temporal Interval Pattern** - If time modeling implemented
8. **Measurement Pattern** - If quality measurements used

---

## Reference Implementation

The complete SHACL validator is at:
- **Location**: `src/validation/shaclValidator.js`
- **Source**: Fandaws Ontology Service (Ontograde project)
- **Expert Review**: CCO/BFO Realist Ontologist (2026-01-09, 2026-01-13)

**Key Features**:
- Pattern-based validation (not SHACL shapes execution)
- User-friendly error messages with explanations
- Compliance scoring (0-100%)
- Integration with N3.js Store for RDF graph validation

---

## Next Steps for TagTeam Integration

1. **Adapt Validator** (Week 1)
   - Remove Mermaid-specific code
   - Integrate with TagTeam's JSON-LD serializer
   - Add TagTeam-specific patterns (Value Assertions, Context Assessments)

2. **Extend Patterns** (Week 2)
   - Add `tagteam:ValueAssertionEvent` pattern
   - Add `tagteam:ContextAssessmentEvent` pattern
   - Validate parser provenance metadata

3. **Testing** (Week 2-3)
   - Test on IEE corpus outputs
   - Validate against CCO/BFO reference ontologies
   - Generate compliance reports

---

**Document Version**: 1.0
**Status**: Reference Guide
**Last Updated**: January 18, 2026
**Source**: src/validation/shaclValidator.js
**Expert Approval**: 2026-01-09, 2026-01-13
**Owner**: TagTeam Development Team + Fandaws Ontology Service
