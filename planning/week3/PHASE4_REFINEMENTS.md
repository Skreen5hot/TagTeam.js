# Phase 4 Specification - Refinements from Review

**Date**: January 18, 2026
**Reviewer**: Aaron Damiano
**Status**: Critical Refinements - Must Incorporate Before Implementation

---

## Summary of Refinements

User provided 6 critical refinements to the Phase 4 specification that must be incorporated:

1. **LPG vs JSON-LD**: Clarify architectural position (pragmatic compromise)
2. **DiscourseReferent**: Add referential status and type hierarchy
3. **Confidence Scores**: Decompose into 3 distinct types
4. **realizes Direction**: Fix redundancy, use `realized_in` consistently
5. **Complexity Budget**: Add empirical baselines and pruning strategies
6. **Namespace Strategy**: Add `inst:` namespace for production instances

---

## 1. LPG vs JSON-LD: Architectural Position Statement

### User's Analysis

Three coherent positions:
- **Option A**: LPG is runtime, JSON-LD is serialization (SHML purist)
- **Option B**: JSON-LD IS the middle layer (pragmatic compromise)
- **Option C**: RDF-star as bridge (emerging standard)

### User's Recommendation

**Option B** with explicit acknowledgment.

### Implementation

**Add to Section 1.2** (Three-Layer Architecture):

```markdown
### 1.2 Three-Layer Architecture: Pragmatic Compromise

**Architectural Position**: While SHML theory prescribes LPG for native process modeling,
TagTeam implements the middle layer **directly in JSON-LD**, treating assertion events as
first-class nodes rather than edge annotations.

**Rationale**:
- TagTeam is a **parser that outputs semantic graphs**, not a graph database
- JSON-LD with proper typing can express process semantics adequately
- Assertion events as nodes (not edge properties) preserves SHML semantics
- Tooling compatibility and serialization simplicity

**Trade-off**: This trades some structural elegance (LPG's native edge properties) for
practical benefits (JSON-LD ecosystem, RDF interoperability, no runtime DB dependency).

| Layer | Substrate | Role | TagTeam Implementation |
|-------|-----------|------|----------------------|
| **Reality** | BFO/CCO ontologies | Defines what exists | Conceptual grounding only |
| **Middle (SHML)** | JSON-LD @graph | Models semantic processes | Assertion events as nodes |
| **Logic** | JSON-LD @graph | Public API output | Same structure (no projection) |

**Note**: If future requirements demand true LPG features (e.g., path queries, graph
algorithms), the JSON-LD output can be ingested into Neo4j/memgraph as a migration path.
```

---

## 2. DiscourseReferent: Enhanced Type Hierarchy

### User's Proposal

Add `referentialStatus` property to distinguish:
- `hypothetical` - Thought experiment (may not exist)
- `presupposed` - Text assumes existence (definite article)
- `introduced` - Text introduces referent (indefinite article)
- `anaphoric` - Refers back to previous referent

### Implementation

**Updated @context**:
```json
{
  "@context": {
    "DiscourseReferent": {
      "@id": "tagteam:DiscourseReferent",
      "rdfs:subClassOf": "cco:InformationContentEntity",
      "rdfs:comment": "A referent introduced by discourse, which may or may not denote an actual entity"
    },
    "denotesType": {
      "@id": "tagteam:denotesType",
      "@type": "@id",
      "rdfs:comment": "The BFO/CCO type this referent would instantiate if actual"
    },
    "referentialStatus": {
      "@id": "tagteam:referentialStatus",
      "@type": "@id",
      "rdfs:comment": "Epistemic status: hypothetical, presupposed, introduced, or anaphoric"
    },
    "discourseRole": {
      "@id": "tagteam:discourseRole",
      "rdfs:comment": "Grammatical role in sentence: agent, patient, instrument, etc."
    },
    "definiteness": {
      "@id": "tagteam:definiteness",
      "rdfs:comment": "Linguistic definiteness: definite, indefinite, bare"
    }
  }
}
```

**Updated Entity Example**:
```json
{
  "@id": "ex:Doctor_Referent_a8f3b2",
  "@type": ["tagteam:DiscourseReferent"],
  "tagteam:denotesType": "cco:Person",
  "tagteam:discourseRole": "agent",
  "rdfs:label": "the doctor",
  "tagteam:extracted_from_span": "The doctor",
  "tagteam:span_offset": [0, 10],
  "tagteam:definiteness": "definite",
  "tagteam:referentialStatus": "presupposed"
}
```

**Detection Rules**:
| Linguistic Pattern | referentialStatus | definiteness |
|--------------------|-------------------|--------------|
| "The doctor" | `presupposed` | `definite` |
| "A doctor" | `introduced` | `indefinite` |
| "Doctor" (bare) | `introduced` | `bare` |
| "She" (pronoun) | `anaphoric` | `definite` |
| "If there were a doctor" | `hypothetical` | `indefinite` |

---

## 3. Confidence Scores: Three-Way Decomposition

### User's Analysis

Distinguish:
- **Extraction Confidence**: Correctly identified linguistic unit
- **Classification Confidence**: Correctly mapped to type
- **Relevance Confidence**: Semantically significant for scenario

### Implementation (Option: Separate Properties)

**Updated Assertion Event**:
```json
{
  "@id": "ex:Autonomy_Assertion_0",
  "@type": ["tagteam:ValueAssertionEvent"],
  "rdfs:label": "autonomy value assertion",
  "tagteam:asserts": "ex:Autonomy_ICE",
  "tagteam:detected_by": "ex:TagTeam_Parser_v3",
  "tagteam:based_on": "ex:Input_Text_IBE",

  "tagteam:extractionConfidence": 0.95,
  "tagteam:classificationConfidence": 0.85,
  "tagteam:relevanceConfidence": 0.70,

  "tagteam:aggregateConfidence": 0.83,
  "tagteam:aggregationMethod": "geometric_mean",

  "tagteam:detection_method": "keyword_pattern_matching",
  "tagteam:matched_markers": ["autonomy", "decide"]
}
```

**@context Additions**:
```json
{
  "extractionConfidence": {
    "@id": "tagteam:extractionConfidence",
    "@type": "xsd:decimal",
    "rdfs:comment": "Confidence that the linguistic unit was correctly identified (0.0-1.0)"
  },
  "classificationConfidence": {
    "@id": "tagteam:classificationConfidence",
    "@type": "xsd:decimal",
    "rdfs:comment": "Confidence that the unit maps to the assigned type (0.0-1.0)"
  },
  "relevanceConfidence": {
    "@id": "tagteam:relevanceConfidence",
    "@type": "xsd:decimal",
    "rdfs:comment": "Confidence that this detection is semantically significant (0.0-1.0)"
  },
  "aggregateConfidence": {
    "@id": "tagteam:aggregateConfidence",
    "@type": "xsd:decimal",
    "rdfs:comment": "Overall confidence (computed from components)"
  },
  "aggregationMethod": {
    "@id": "tagteam:aggregationMethod",
    "rdfs:comment": "How aggregate was computed: geometric_mean, min, product, etc."
  }
}
```

**Documentation**:

Add to Section 4.4 (Value Detection):

```markdown
### Confidence Calculation

Every assertion event includes a three-way confidence breakdown:

1. **Extraction Confidence** (0.0-1.0)
   - How certain the NLP parser is that it correctly identified the linguistic unit
   - Example: "autonomy" tagged as noun with 0.95 confidence

2. **Classification Confidence** (0.0-1.0)
   - How certain the mapper is that this unit maps to the assigned ethical value
   - Example: "autonomy" → IEE:Autonomy with 0.85 confidence (could be medical autonomy vs. political autonomy)

3. **Relevance Confidence** (0.0-1.0)
   - How certain the analyzer is that this detection is semantically significant
   - Example: Autonomy is genuinely at stake (0.70) vs. mentioned in passing (0.20)

**Aggregate Confidence**: Computed via geometric mean by default:
```
aggregate = (extraction × classification × relevance)^(1/3)
```

This prevents false positives from inflating overall confidence.
```

---

## 4. Fix `realizes` Relation Direction

### User's Analysis

BFO specifies:
- `realizes`: Process → Realizable
- `realized_in`: Realizable → Process

Current spec uses both (redundant).

### User's Recommendation

Pick one direction consistently. Use `realized_in` on roles since roles are focal objects.

### Implementation

**Updated Role Node**:
```json
{
  "@id": "ex:AgentRole_b7e4f2",
  "@type": ["owl:NamedIndividual", "bfo:BFO_0000023"],
  "rdfs:label": "agent role",
  "bfo:inheres_in": "ex:Doctor_Referent_a8f3b2",
  "bfo:realized_in": "ex:Allocation_Act_0"
}
```

**Remove from Act Node**:
```json
{
  "@id": "ex:Allocation_Act_0",
  "@type": ["owl:NamedIndividual", "cco:IntentionalAct"],
  "rdfs:label": "allocation act",
  "cco:has_agent": "ex:Doctor_Referent_a8f3b2",
  "bfo:has_participant": ["ex:Patient_Referent_A", "ex:Patient_Referent_B"],
  "cco:affects": "ex:Ventilator_Referent_0"
  // NO "realizes" property
}
```

**@context Declaration** (optional, for completeness):
```json
{
  "realizes": {
    "@id": "bfo:BFO_0000055",
    "@type": "@id",
    "owl:inverseOf": { "@id": "bfo:BFO_0000054" }
  },
  "realized_in": {
    "@id": "bfo:BFO_0000054",
    "@type": "@id"
  }
}
```

**Policy**: Always use `realized_in` from Role → Process. Never emit `realizes` from Process → Role.

---

## 5. Complexity Budget: Empirical Baselines

### User's Analysis

Ventilator example (1 sentence, 15 words) → ~25 nodes
**Ratio**: 1.5-2 nodes per word for ethically dense text

### User's Proposed Budget

| Input Size | Max Nodes | Max Output | Strategy |
|------------|-----------|------------|----------|
| ≤50 words | 100 nodes | 25 KB | Single pass |
| 51-200 words | 300 nodes | 75 KB | Single pass + pruning |
| 201-500 words | 500 nodes | 125 KB | Paragraph chunking |
| >500 words | 500/chunk | 125 KB/chunk | Document chunking |

### Pruning Strategies

1. **Salience threshold**: Only emit value assertions with `relevanceConfidence > 0.5`
2. **Entity merging**: Coreferent mentions collapse to single discourse referent
3. **Role deduplication**: Don't emit role nodes if type is inferrable from act participation

### Implementation

**Add Section 5.1** (Complexity Budget):

```markdown
## 5.1 Complexity Budget & Performance Targets

### Empirical Baseline

The ventilator allocation example (15 words, 1 sentence) produces approximately 25 nodes.

**Node-to-Word Ratio**: 1.5-2.0 nodes per word for ethically dense text.

### Budget Tiers

| Input Size | Max Nodes | Max Output Size | Strategy |
|------------|-----------|-----------------|----------|
| **≤50 words** | 100 nodes | 25 KB | Single-pass processing |
| **51-200 words** | 300 nodes | 75 KB | Single-pass with pruning |
| **201-500 words** | 500 nodes | 125 KB | Paragraph-based chunking |
| **>500 words** | 500 per chunk | 125 KB per chunk | Document chunking with cross-refs |

### Pruning Strategies

Applied when approaching node limits:

1. **Salience Threshold**: Only emit value assertions where `relevanceConfidence > 0.5`
2. **Coreference Merging**: Collapse anaphoric mentions to single discourse referent
3. **Role Deduplication**: Omit role nodes if type is inferrable from act participation
4. **Low-Confidence Filtering**: Drop context assessments below confidence threshold

### Chunking Protocol

For documents >500 words:

```json
{
  "@context": { ... },
  "@id": "inst:parse_2026-01-18T10-30-00Z",
  "@type": "tagteam:DocumentParseResult",
  "tagteam:chunks": [
    {
      "@id": "inst:parse_2026-01-18T10-30-00Z/chunk_0",
      "tagteam:span": [0, 500],
      "tagteam:word_count": 95,
      "@graph": [ /* chunk 0 nodes */ ]
    },
    {
      "@id": "inst:parse_2026-01-18T10-30-00Z/chunk_1",
      "tagteam:span": [501, 1000],
      "tagteam:word_count": 98,
      "@graph": [ /* chunk 1 nodes */ ]
    }
  ],
  "tagteam:cross_chunk_references": [
    {
      "@type": "tagteam:CrossChunkReference",
      "tagteam:referent": "inst:parse_2026-01-18T10-30-00Z/Doctor_Referent_0",
      "tagteam:appears_in_chunks": [0, 1, 3]
    }
  ]
}
```

### Configuration API

```javascript
TagTeam.parse(text, {
  maxNodesPerChunk: 500,
  chunkingStrategy: 'paragraph' | 'sentence' | 'fixed_length',
  pruningThreshold: 0.5,
  mergeCoreferents: true,
  deduplicateRoles: true
});
```
```

---

## 6. Namespace Strategy: Production Instances

### User's Proposal

Add `inst:` namespace for production instance IRIs:
- Pattern: `inst:{session_id}/{type}_{index}`
- Example: `inst:parse_2026-01-18T10-30-00Z/Doctor_0`

Reserve `ex:` for specification examples only.

### Implementation

**Updated Namespace Table**:

| Namespace | Prefix | Purpose |
|-----------|--------|---------|
| `http://purl.obolibrary.org/obo/` | `bfo:` | BFO classes and relations |
| `http://www.ontologyrepository.com/CommonCoreOntologies/` | `cco:` | CCO classes and relations |
| `http://tagteam.fandaws.org/ontology/` | `tagteam:` | TagTeam vocabulary (classes, properties) |
| `http://tagteam.fandaws.org/instance/` | `inst:` | **Production instance IRIs** |
| `http://example.org/` | `ex:` | **Examples and tests only** |

**Instance IRI Generation**:

```javascript
function generateInstanceIRI(sessionID, entityType, index) {
  return `http://tagteam.fandaws.org/instance/${sessionID}/${entityType}_${index}`;
}

// Example usage
const sessionID = new Date().toISOString().replace(/[:.]/g, '-');
// → "2026-01-18T10-30-00-000Z"

const doctorIRI = generateInstanceIRI(sessionID, 'Doctor_Referent', 0);
// → "http://tagteam.fandaws.org/instance/2026-01-18T10-30-00-000Z/Doctor_Referent_0"
```

**Updated @context**:
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
    "xsd": "http://www.w3.org/2001/XMLSchema#"
  }
}
```

**Specification Note**:

> All examples in this specification use the `ex:` (example.org) namespace for readability.
> Production deployments MUST mint instance IRIs under `inst:` (http://tagteam.fandaws.org/instance/)
> with session-scoped identifiers.

---

## Summary: Complete Updated @context

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

    "DiscourseReferent": {
      "@id": "tagteam:DiscourseReferent",
      "rdfs:subClassOf": "cco:InformationContentEntity"
    },
    "ValueAssertionEvent": "tagteam:ValueAssertionEvent",
    "ContextAssessmentEvent": "tagteam:ContextAssessmentEvent",
    "DocumentParseResult": "tagteam:DocumentParseResult",
    "CrossChunkReference": "tagteam:CrossChunkReference",

    "denotesType": { "@id": "tagteam:denotesType", "@type": "@id" },
    "referentialStatus": { "@id": "tagteam:referentialStatus", "@type": "@id" },
    "discourseRole": "tagteam:discourseRole",
    "definiteness": "tagteam:definiteness",

    "extractionConfidence": { "@id": "tagteam:extractionConfidence", "@type": "xsd:decimal" },
    "classificationConfidence": { "@id": "tagteam:classificationConfidence", "@type": "xsd:decimal" },
    "relevanceConfidence": { "@id": "tagteam:relevanceConfidence", "@type": "xsd:decimal" },
    "aggregateConfidence": { "@id": "tagteam:aggregateConfidence", "@type": "xsd:decimal" },
    "aggregationMethod": "tagteam:aggregationMethod",

    "inheres_in": { "@id": "bfo:BFO_0000052", "@type": "@id" },
    "realized_in": { "@id": "bfo:BFO_0000054", "@type": "@id" },
    "has_participant": { "@id": "bfo:BFO_0000057", "@type": "@id" },
    "has_agent": { "@id": "cco:has_agent", "@type": "@id" },
    "affects": { "@id": "cco:affects", "@type": "@id" },

    "asserts": { "@id": "tagteam:asserts", "@type": "@id" },
    "based_on": { "@id": "tagteam:based_on", "@type": "@id" },
    "detected_by": { "@id": "tagteam:detected_by", "@type": "@id" },
    "extracted_from_span": "tagteam:extracted_from_span",
    "span_offset": "tagteam:span_offset"
  }
}
```

---

## Implementation Checklist (Updated)

### Pre-Implementation
- [ ] Incorporate all 6 refinements into main specification
- [ ] Create tagteam ontology TTL file with all custom terms
- [ ] Document confidence calculation algorithms
- [ ] Define referentialStatus value set
- [ ] Test IRI generation with session IDs

### Week 1 (Core Infrastructure)
- [ ] Implement DiscourseReferent extraction with referentialStatus detection
- [ ] IRI generator using `inst:` namespace
- [ ] Complexity budget enforcement (ComplexityBudget.js)
- [ ] Three-way confidence calculation

### Week 2 (Assertion Events + Validation)
- [ ] Assertion events with confidence breakdown
- [ ] Fix realizes/realized_in usage (use realized_in only)
- [ ] Implement pruning strategies
- [ ] SHACL validation integration

### Week 3 (Chunking + Testing)
- [ ] Document chunking with cross-chunk references
- [ ] Coreference resolution
- [ ] Performance testing (meet empirical baselines)
- [ ] Full IEE corpus validation

---

**Document Version**: 1.0
**Status**: REFINEMENTS - Ready to Incorporate
**Last Updated**: January 18, 2026
**Next Step**: Update main spec with all refinements
**Owner**: TagTeam Development Team + Fandaws Ontology Service
