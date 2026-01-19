# TagTeam JSON-LD Examples

This document provides annotated examples of TagTeam Phase 4 JSON-LD output.

---

## Example 1: Simple Scenario

**Input Text:**
```
The doctor treats the patient.
```

**JSON-LD Output:**
```json
{
  "@context": {
    "bfo": "http://purl.obolibrary.org/obo/",
    "cco": "http://www.ontologyrepository.com/CommonCoreOntologies/",
    "tagteam": "http://tagteam.fandaws.org/ontology/",
    "inst": "http://tagteam.fandaws.org/instance/",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "owl": "http://www.w3.org/2002/07/owl#",
    "xsd": "http://www.w3.org/2001/XMLSchema#"
  },
  "@graph": [
    {
      "@id": "inst:Doctor_Referent_a8f3b2cd",
      "@type": ["tagteam:DiscourseReferent", "owl:NamedIndividual"],
      "rdfs:label": "the doctor",
      "tagteam:denotesType": "cco:Person",
      "tagteam:definiteness": "definite",
      "tagteam:referentialStatus": "presupposed",
      "tagteam:extracted_from_span": "The doctor",
      "tagteam:span_offset": [0, 10],
      "cco:is_about": "inst:Doctor_Person_a8f3b2cd"
    },
    {
      "@id": "inst:Doctor_Person_a8f3b2cd",
      "@type": ["cco:Person", "owl:NamedIndividual"],
      "rdfs:label": "doctor (Person)"
    },
    {
      "@id": "inst:Patient_Referent_b9e2c3df",
      "@type": ["tagteam:DiscourseReferent", "owl:NamedIndividual"],
      "rdfs:label": "the patient",
      "tagteam:denotesType": "cco:Person",
      "tagteam:definiteness": "definite",
      "tagteam:referentialStatus": "presupposed",
      "cco:is_about": "inst:Patient_Person_b9e2c3df"
    },
    {
      "@id": "inst:Patient_Person_b9e2c3df",
      "@type": ["cco:Person", "owl:NamedIndividual"],
      "rdfs:label": "patient (Person)"
    },
    {
      "@id": "inst:Treat_IntentionalAct_c4d1e5fg",
      "@type": ["cco:IntentionalAct", "owl:NamedIndividual"],
      "rdfs:label": "treats",
      "tagteam:verb": "treats",
      "tagteam:lemma": "treat",
      "tagteam:tense": "present",
      "tagteam:actualityStatus": "tagteam:Actual",
      "cco:has_agent": "inst:Doctor_Person_a8f3b2cd",
      "cco:affects": "inst:Patient_Person_b9e2c3df"
    },
    {
      "@id": "inst:Agent_Role_d5e2f6gh",
      "@type": ["cco:AgentRole", "bfo:BFO_0000023", "owl:NamedIndividual"],
      "rdfs:label": "Agent role of doctor in treats",
      "bfo:inheres_in": "inst:Doctor_Person_a8f3b2cd",
      "bfo:realized_in": "inst:Treat_IntentionalAct_c4d1e5fg"
    },
    {
      "@id": "inst:Patient_Role_e6f3g7hi",
      "@type": ["cco:PatientRole", "bfo:BFO_0000023", "owl:NamedIndividual"],
      "rdfs:label": "Patient role of patient in treats",
      "bfo:inheres_in": "inst:Patient_Person_b9e2c3df",
      "bfo:realized_in": "inst:Treat_IntentionalAct_c4d1e5fg"
    }
  ]
}
```

### Key Points

- **Two-Tier Architecture**: `DiscourseReferent` (Tier 1) links to `cco:Person` (Tier 2) via `cco:is_about`
- **Roles**: `AgentRole` and `PatientRole` link bearers to acts
- **`owl:NamedIndividual`**: All instances include this type

---

## Example 2: Ventilator Allocation (Complex)

**Input Text:**
```
The doctor must allocate the last ventilator between two critically ill patients.
```

**JSON-LD Output (abbreviated):**
```json
{
  "@context": { /* ... */ },
  "@graph": [
    // Tier 1: Discourse Referent for "the doctor"
    {
      "@id": "inst:Doctor_Referent_0469b924",
      "@type": ["tagteam:DiscourseReferent", "owl:NamedIndividual"],
      "rdfs:label": "the doctor",
      "tagteam:denotesType": "cco:Person",
      "tagteam:definiteness": "definite",
      "cco:is_about": "inst:Doctor_Person_0469b924"
    },

    // Tier 2: Real-world Person
    {
      "@id": "inst:Doctor_Person_0469b924",
      "@type": ["cco:Person", "owl:NamedIndividual"],
      "rdfs:label": "doctor (Person)"
    },

    // Tier 1: Discourse Referent for "the last ventilator"
    {
      "@id": "inst:Ventilator_Referent_1a2b3c4d",
      "@type": ["tagteam:DiscourseReferent", "owl:NamedIndividual"],
      "rdfs:label": "the last ventilator",
      "tagteam:denotesType": "cco:Artifact",
      "tagteam:definiteness": "definite",
      "cco:is_about": "inst:Ventilator_Artifact_1a2b3c4d"
    },

    // Tier 2: Artifact (no scarcity directly - see ScarcityAssertion below)
    {
      "@id": "inst:Ventilator_Artifact_1a2b3c4d",
      "@type": ["cco:Artifact", "owl:NamedIndividual"],
      "rdfs:label": "ventilator (Artifact)"
    },

    // ICE Layer: Scarcity Assertion (text SAYS it's scarce)
    {
      "@id": "inst:Scarcity_Assertion_2b3c4d5e",
      "@type": ["tagteam:ScarcityAssertion", "cco:InformationContentEntity", "owl:NamedIndividual"],
      "rdfs:label": "Scarcity assertion: ventilator",
      "tagteam:scarceResource": "inst:Ventilator_Artifact_1a2b3c4d",
      "tagteam:supplyCount": 1,
      "tagteam:scarcityMarker": "last"
    },

    // Tier 1: Discourse Referent for "two critically ill patients"
    {
      "@id": "inst:Patients_Referent_3c4d5e6f",
      "@type": ["tagteam:DiscourseReferent", "owl:NamedIndividual"],
      "rdfs:label": "two critically ill patients",
      "tagteam:quantity": 2,
      "cco:is_about": "inst:Patients_Aggregate_3c4d5e6f"
    },

    // Object Aggregate (plural persons)
    {
      "@id": "inst:Patients_Aggregate_3c4d5e6f",
      "@type": ["bfo:BFO_0000027", "owl:NamedIndividual"],
      "rdfs:label": "aggregate of 2 patients",
      "tagteam:member_count": 2,
      "bfo:has_member": [
        "inst:Patient_Member_0_4d5e6f7g",
        "inst:Patient_Member_1_5e6f7g8h"
      ]
    },

    // Individual members
    {
      "@id": "inst:Patient_Member_0_4d5e6f7g",
      "@type": ["cco:Person", "owl:NamedIndividual"],
      "rdfs:label": "patient member 1"
    },
    {
      "@id": "inst:Patient_Member_1_5e6f7g8h",
      "@type": ["cco:Person", "owl:NamedIndividual"],
      "rdfs:label": "patient member 2"
    },

    // Quality nodes (v2.4)
    {
      "@id": "inst:Quality_CriticallyIll_6f7g8h9i",
      "@type": ["cco:DiseaseQuality", "bfo:BFO_0000019", "owl:NamedIndividual"],
      "rdfs:label": "critically ill quality",
      "tagteam:qualifierText": "critically ill",
      "tagteam:severity": "critical",
      "bfo:inheres_in": "inst:Patient_Member_0_4d5e6f7g"
    },

    // IntentionalAct with modal marker
    {
      "@id": "inst:Allocate_IntentionalAct_7g8h9i0j",
      "@type": ["cco:IntentionalAct", "owl:NamedIndividual"],
      "rdfs:label": "must allocate",
      "tagteam:verb": "allocate",
      "tagteam:lemma": "allocate",
      "tagteam:tense": "present",
      "tagteam:modality": "obligation",
      "tagteam:actualityStatus": "tagteam:Prescribed",
      "cco:has_agent": "inst:Doctor_Person_0469b924",
      "cco:affects": "inst:Ventilator_Artifact_1a2b3c4d",
      "bfo:has_participant": [
        "inst:Patient_Member_0_4d5e6f7g",
        "inst:Patient_Member_1_5e6f7g8h"
      ]
    },

    // Directive Content ICE (modal "must")
    {
      "@id": "inst:Directive_Must_8h9i0j1k",
      "@type": ["tagteam:DirectiveContent", "cco:DirectiveInformationContentEntity", "owl:NamedIndividual"],
      "rdfs:label": "Directive: must allocate",
      "tagteam:modalType": "deontic",
      "tagteam:modalMarker": "must",
      "tagteam:modalStrength": 1.0,
      "tagteam:prescribes": "inst:Allocate_IntentionalAct_7g8h9i0j"
    },

    // Agent Role (realized in actual acts only)
    {
      "@id": "inst:Agent_Role_9i0j1k2l",
      "@type": ["cco:AgentRole", "bfo:BFO_0000023", "owl:NamedIndividual"],
      "rdfs:label": "Agent role of doctor",
      "bfo:inheres_in": "inst:Doctor_Person_0469b924",
      "tagteam:would_be_realized_in": "inst:Allocate_IntentionalAct_7g8h9i0j"
    },

    // Patient Roles on aggregate members (v2.4)
    {
      "@id": "inst:Patient_Role_0j1k2l3m",
      "@type": ["cco:PatientRole", "bfo:BFO_0000023", "owl:NamedIndividual"],
      "rdfs:label": "Patient role of member 1",
      "bfo:inheres_in": "inst:Patient_Member_0_4d5e6f7g",
      "tagteam:would_be_realized_in": "inst:Allocate_IntentionalAct_7g8h9i0j"
    }
  ]
}
```

### Key Points

- **ScarcityAssertion**: Scarcity is on ICE layer, not directly on artifacts
- **ObjectAggregate**: "two patients" creates aggregate with member links
- **Quality Nodes**: "critically ill" creates BFO Quality inherent in persons
- **Modal Markers**: "must" creates DirectiveContent prescribing the act
- **ActualityStatus**: `Prescribed` for deontic obligation (not yet actual)
- **would_be_realized_in**: Roles use this for non-actual acts

---

## Example 3: With Assertion Events (Week 2)

**Input Text:**
```
The family must decide whether to continue treatment.
```

**With Context and Values:**
```javascript
const graph = builder.build(text, {
  context: 'MedicalEthics',
  scoredValues: [
    { name: 'Autonomy', score: 0.9, polarity: -1, confidence: 0.85 },
    { name: 'Compassion', score: 0.8, polarity: 1, confidence: 0.80 }
  ]
});
```

**JSON-LD Output (Week 2 additions):**
```json
{
  "@context": { /* ... */ },
  "@graph": [
    // ... entities, acts, roles ...

    // Information Bearing Entity (input text)
    {
      "@id": "inst:Input_IBE_abc12345",
      "@type": ["cco:InformationBearingEntity", "owl:NamedIndividual"],
      "rdfs:label": "Input text",
      "cco:has_text_value": "The family must decide whether to continue treatment.",
      "tagteam:char_count": 54,
      "tagteam:word_count": 9,
      "tagteam:received_at": "2026-01-19T12:00:00.000Z"
    },

    // Parser Agent
    {
      "@id": "inst:TagTeam_Parser_v4.0.0",
      "@type": ["cco:ArtificialAgent", "owl:NamedIndividual"],
      "rdfs:label": "TagTeam Semantic Parser v4.0.0",
      "tagteam:version": "4.0.0-phase4-week2",
      "tagteam:algorithm": "Compromise NLP + Pattern Matching",
      "tagteam:capabilities": [
        "entity extraction",
        "act extraction",
        "role detection",
        "value detection",
        "context assessment"
      ]
    },

    // Interpretation Context
    {
      "@id": "inst:MedicalEthics_Context_def45678",
      "@type": ["tagteam:InterpretationContext", "owl:NamedIndividual"],
      "rdfs:label": "Medical Ethics Context",
      "tagteam:framework": "Principlism (Beauchamp & Childress)",
      "tagteam:instantiated_at": "2026-01-19T12:00:00.000Z"
    },

    // Value Assertion Event: Autonomy
    {
      "@id": "inst:Autonomy_ValueAssertion_ghi78901",
      "@type": ["tagteam:ValueAssertionEvent", "owl:NamedIndividual"],
      "rdfs:label": "Value assertion: Autonomy",
      "tagteam:asserts": "inst:Autonomy_ICE_jkl01234",
      "tagteam:assertionType": "tagteam:AutomatedDetection",
      "tagteam:validInContext": "inst:MedicalEthics_Context_def45678",
      "tagteam:detected_by": "inst:TagTeam_Parser_v4.0.0",
      "tagteam:based_on": "inst:Input_IBE_abc12345",
      "tagteam:temporal_extent": "2026-01-19T12:00:00.000Z",
      "tagteam:extractionConfidence": 0.95,
      "tagteam:classificationConfidence": 0.90,
      "tagteam:relevanceConfidence": 0.85,
      "tagteam:aggregateConfidence": 0.90,
      "tagteam:aggregationMethod": "geometric_mean"
    },

    // Ethical Value ICE (separate from assertion)
    {
      "@id": "inst:Autonomy_ICE_jkl01234",
      "@type": ["tagteam:EthicalValueICE", "cco:InformationContentEntity", "owl:NamedIndividual"],
      "rdfs:label": "Autonomy (ethical value)",
      "tagteam:valueName": "Autonomy",
      "tagteam:valueCategory": "core",
      "tagteam:salience": 0.9,
      "tagteam:polarity": -1,
      "cco:is_concretized_by": "inst:Input_IBE_abc12345"
    },

    // Value Assertion Event: Compassion
    {
      "@id": "inst:Compassion_ValueAssertion_mno23456",
      "@type": ["tagteam:ValueAssertionEvent", "owl:NamedIndividual"],
      "rdfs:label": "Value assertion: Compassion",
      "tagteam:asserts": "inst:Compassion_ICE_pqr45678",
      "tagteam:assertionType": "tagteam:AutomatedDetection",
      "tagteam:validInContext": "inst:MedicalEthics_Context_def45678",
      "tagteam:detected_by": "inst:TagTeam_Parser_v4.0.0",
      "tagteam:based_on": "inst:Input_IBE_abc12345",
      "tagteam:extractionConfidence": 0.88,
      "tagteam:classificationConfidence": 0.85,
      "tagteam:relevanceConfidence": 0.80,
      "tagteam:aggregateConfidence": 0.84,
      "tagteam:aggregationMethod": "geometric_mean"
    },

    {
      "@id": "inst:Compassion_ICE_pqr45678",
      "@type": ["tagteam:EthicalValueICE", "cco:InformationContentEntity", "owl:NamedIndividual"],
      "rdfs:label": "Compassion (ethical value)",
      "tagteam:valueName": "Compassion",
      "tagteam:salience": 0.8,
      "tagteam:polarity": 1,
      "cco:is_concretized_by": "inst:Input_IBE_abc12345"
    }
  ]
}
```

### Key Points

- **Information Staircase**: IBE (text) -> ICE (values) -> Assertions
- **GIT-Minimal**: Every assertion has assertionType, validInContext
- **Provenance**: detected_by links to parser agent, based_on links to IBE
- **Three-Way Confidence**: Extraction, classification, relevance decomposed
- **ICE Concretization**: Values link back to IBE via is_concretized_by

---

## Example 4: Context Assessment

**12 Dimension Assessment:**
```json
{
  "@id": "inst:Urgency_Assessment_stu56789",
  "@type": ["tagteam:ContextAssessmentEvent", "owl:NamedIndividual"],
  "rdfs:label": "Context assessment: temporal.urgency",
  "tagteam:asserts": "inst:Urgency_ICE_vwx78901",
  "tagteam:assertionType": "tagteam:AutomatedDetection",
  "tagteam:validInContext": "inst:MedicalEthics_Context",
  "tagteam:detected_by": "inst:TagTeam_Parser_v4.0.0",
  "tagteam:based_on": "inst:Input_IBE_abc12345",
  "tagteam:dimension": "temporal.urgency",
  "tagteam:score": 0.9,
  "tagteam:category": "temporal",
  "tagteam:extractionConfidence": 0.92,
  "tagteam:aggregateConfidence": 0.88
}
```

### 12 Context Dimensions

**Temporal:**
- `temporal.urgency` - Time pressure
- `temporal.duration` - How long effects last
- `temporal.reversibility` - Can decision be undone

**Relational:**
- `relational.intimacy` - Closeness of relationships
- `relational.powerDifferential` - Power imbalance
- `relational.trust` - Trust level

**Consequential:**
- `consequential.harmSeverity` - How severe potential harm
- `consequential.benefitMagnitude` - How significant benefits
- `consequential.scope` - How many affected

**Epistemic:**
- `epistemic.certainty` - How certain outcomes are
- `epistemic.informationCompleteness` - Is info complete
- `epistemic.expertise` - Relevant expertise level

---

## Validation Report Example

```javascript
const report = validator.validate(graph);
console.log(validator.formatReport(report));
```

**Output:**
```
═══════════════════════════════════════════════════════════════════
                    SHACL VALIDATION REPORT
═══════════════════════════════════════════════════════════════════

Compliance Score: 85%

SUMMARY
  Total Nodes: 15
  Violations:  0
  Warnings:    3
  Info:        2

PATTERN SCORES
  InformationStaircase:  100% (5/5)
  RolePattern:           83% (5/6)
  DesignationPattern:    100% (2/2)
  TemporalIntervalPattern: 50% (1/2)
  MeasurementPattern:    N/A
  SocioPrimalPattern:    80% (4/5)
  DomainRangeValidation: 100% (10/10)
  VocabularyValidation:  95% (19/20)

WARNINGS
  [RolePattern] Role inst:Agent_Role_xyz is not realized by any process
    Suggestion: Add cco:realized_in or tagteam:would_be_realized_in

  [SocioPrimalPattern] Act inst:Decide_Act has no temporal grounding
    Suggestion: Add cco:occurs_during or tagteam:temporal_extent

  [VocabularyValidation] Unknown predicate: tagteam:customProp
    Suggestion: Check spelling. Similar: tagteam:polarity

═══════════════════════════════════════════════════════════════════
```

---

## Further Reading

- [PHASE4_USER_GUIDE.md](PHASE4_USER_GUIDE.md) - Complete user guide
- [SHACL_VALIDATION_GUIDE.md](SHACL_VALIDATION_GUIDE.md) - Validation patterns detail
