# Phase 4 Specification - Question Resolution

**Date**: January 18, 2026
**Status**: Architectural Decisions
**Reviewer**: Aaron Damiano (Fandaws Ontology Service)

---

## Question 1: LPG vs JSON-LD Native Format

**Question**: Clarify the relationship between internal LPG and JSON-LD output—is there actually an LPG, or is JSON-LD the native format?

**Answer**: **JSON-LD is the native format**. There is NO separate LPG implementation.

**Rationale**:
- SHML theory discusses LPGs as the **conceptual model** for the middle layer
- But for TagTeam's use case, JSON-LD already supports everything we need:
  - Named graphs (multiple @graph objects)
  - Properties on nodes (via standard predicates)
  - Provenance metadata
  - RDF reification patterns

**Architectural Decision**:
```
Reality Layer (BFO/CCO) ← Conceptual grounding
         ↓
JSON-LD @graph ← NATIVE FORMAT (no LPG conversion)
         ↓
Public API Output ← Same JSON-LD (no projection needed)
```

**Implementation Impact**:
- Remove `ProcessModel.js` (LPG) from architecture
- Remove `ProjectionEngine.js` (no projection needed)
- JSON-LD is built directly by `SemanticGraphBuilder.js`

**Updated Module Structure**:
```
src/
├── graph/
│   ├── SemanticGraphBuilder.js      # Main orchestrator (builds JSON-LD directly)
│   ├── EntityExtractor.js            # Extract agents/patients/artifacts
│   ├── ActExtractor.js               # Extract intentional acts
│   ├── RoleDetector.js               # Detect BFO roles being realized
│   ├── AssertionEventBuilder.js     # Model parser outputs as events
│   └── JSONLDSerializer.js          # Final serialization only
│
├── ontology/
│   ├── CCOMapper.js                  # Map to CCO classes
│   ├── BFORelations.js               # BFO relation extraction
│   └── SHMLValidator.js              # SHACL validation
```

**Note**: The SHML "middle layer" is now a **logical layer within the JSON-LD @graph**, not a separate data structure.

---

## Question 2: DiscourseReferent Type

**Question**: Introduce a DiscourseReferent type for text-extracted entities to distinguish them from actual BFO continuants

**Answer**: **Yes, critical distinction**. We need to separate:
- **What we extracted from text** (discourse referents)
- **What actually exists in reality** (BFO entities)

**Problem**:
The current spec treats "ex:Doctor_0" as if it's the actual doctor (BFO continuant). But it's really a **discourse referent** - a way of referring to someone mentioned in text.

**Solution**: Introduce `tagteam:DiscourseReferent` as wrapper type.

**Updated Entity Structure**:

### Before (Wrong):
```json
{
  "@id": "ex:Doctor_0",
  "@type": ["cco:Agent"],
  "rdfs:label": "doctor"
}
```

### After (Correct):
```json
{
  "@id": "ex:Doctor_Referent_0",
  "@type": ["tagteam:DiscourseReferent"],
  "rdfs:label": "doctor (discourse referent)",
  "tagteam:extracted_from_span": "The doctor",
  "tagteam:span_offset": [0, 10],
  "tagteam:presumed_type": "cco:Agent",
  "tagteam:refers_to": "ex:Doctor_Entity_0"  // Optional: if we can ground it
}
```

**Optional BFO Entity (if grounded)**:
```json
{
  "@id": "ex:Doctor_Entity_0",
  "@type": ["owl:NamedIndividual", "cco:Agent"],
  "rdfs:label": "actual doctor entity",
  "tagteam:grounded": true,
  "tagteam:grounding_source": "external_knowledge_base"
}
```

**Key Principle**:
> TagTeam extracts **discourse referents** from text, not BFO entities. We don't know if "the doctor" is Dr. Smith, Dr. Jones, or a hypothetical agent.

**Implementation Rules**:
1. All text-extracted entities are `tagteam:DiscourseReferent`
2. They have `tagteam:presumed_type` (what we think they are ontologically)
3. Acts and roles link to discourse referents, not BFO entities
4. Optional: Grounding step can create actual BFO entities if external data available

**Updated @context**:
```json
{
  "@context": {
    "tagteam:DiscourseReferent": {
      "@id": "http://tagteam.fandaws.org/ontology/DiscourseReferent"
    },
    "presumed_type": {
      "@id": "tagteam:presumed_type",
      "@type": "@id"
    },
    "refers_to": {
      "@id": "tagteam:refers_to",
      "@type": "@id"
    },
    "extracted_from_span": {
      "@id": "tagteam:extracted_from_span"
    }
  }
}
```

---

## Question 3: Confidence Scores Precision

**Question**: Specify what confidence scores measure precisely

**Answer**: Confidence scores measure **the parser's certainty in the assertion**, NOT the truth of the claim.

**Precise Definition**:
```
confidence: decimal [0.0, 1.0]
```

**Meaning**: The probability that TagTeam's detection method correctly identified this pattern/entity/value.

**What it measures**:
- **0.9**: High confidence - strong pattern match, unambiguous context
- **0.5**: Medium confidence - weak signals, ambiguous markers
- **0.2**: Low confidence - barely detected, may be false positive

**What it does NOT measure**:
- ❌ Truth of the statement in reality
- ❌ Epistemic certainty of the scenario
- ❌ Reliability of the input text source

**Examples**:

### High Confidence (0.95)
```
Input: "The doctor must immediately allocate the ventilator"
Detection: Urgency = HIGH
Confidence: 0.95

Why: Strong markers ("must", "immediately"), unambiguous context
```

### Medium Confidence (0.6)
```
Input: "The doctor should consider allocation"
Detection: Urgency = MEDIUM
Confidence: 0.6

Why: Weaker modal ("should"), tentative verb ("consider")
```

### Low Confidence (0.3)
```
Input: "Allocation might be discussed"
Detection: Autonomy present
Confidence: 0.3

Why: No direct autonomy markers, only inferred from "discussed"
```

**Metadata Structure**:
```json
{
  "@id": "ex:Autonomy_Assertion_0",
  "@type": "tagteam:ValueAssertionEvent",
  "tagteam:confidence": 0.85,
  "tagteam:confidence_basis": {
    "marker_strength": 0.9,      // How strong the keyword match was
    "context_support": 0.8,      // How well context supports detection
    "ambiguity_penalty": -0.05   // Deduction for ambiguous phrasing
  },
  "tagteam:detection_method": "keyword_pattern_matching"
}
```

**Implementation**:
- Document confidence calculation algorithm
- Provide breakdown of score components
- Allow users to filter assertions by confidence threshold

---

## Question 4: Fix `realizes` Relation Direction

**Question**: Fix the realizes relation direction to match BFO

**Answer**: **Current spec has it backwards**. BFO defines:

**BFO Definition**:
```
realizes: Process → Realizable (Role/Disposition/Function)
realized_in: Realizable → Process
```

**Incorrect (Current Spec)**:
```json
{
  "@id": "ex:AgentRole_0",
  "@type": ["bfo:BFO_0000023"],
  "realized_in": "ex:Allocation_Act_0"  // ✓ Correct
},
{
  "@id": "ex:Allocation_Act_0",
  "@type": ["cco:IntentionalAct"],
  "realizes": ["ex:AgentRole_0"]  // ✓ Correct (but see note below)
}
```

**Actually both are correct** - they're inverse relations. But we should be consistent.

**Best Practice**: Use `realized_in` from Role → Process (more natural for querying roles).

**Corrected Structure**:
```json
{
  "@id": "ex:AgentRole_0",
  "@type": ["bfo:BFO_0000023"],
  "rdfs:label": "agent role",
  "bfo:inheres_in": "ex:Doctor_Referent_0",
  "bfo:realized_in": "ex:Allocation_Act_0"
}
```

**Note**: Process → realizes → Role is valid BFO, but redundant if we already have Role → realized_in → Process.

**Recommendation**: Only include `realized_in` (from Role to Process) to avoid duplication.

---

## Question 5: Complexity Budget & Chunking Strategy

**Question**: Define a complexity budget and chunking strategy

**Answer**: **Hard limits to prevent graph explosion**

### Complexity Budget (Per Parse Call)

| Metric | Limit | Rationale |
|--------|-------|-----------|
| **Max Graph Nodes** | 200 | Typical scenario: ~50 nodes. 200 allows for complex cases without explosion |
| **Max Discourse Referents** | 30 | Most scenarios have < 10 entities. 30 handles long narratives |
| **Max Assertion Events** | 50 | 12 context dimensions + ~10 value assertions + extras |
| **Max Text Length** | 2000 chars | ~300-400 words. Longer texts should be chunked |
| **Max Parse Time** | 500ms | User experience threshold |

### Chunking Strategy

**When to Chunk**:
- Input text > 2000 characters
- OR estimated nodes > 200
- OR parse time approaching 500ms

**Chunking Method**:
```javascript
function chunkText(text, maxChars = 2000) {
  // Split on sentence boundaries (. ! ?)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChars) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}
```

**Multi-Chunk Output**:
```json
{
  "@context": { ... },
  "tagteam:chunked": true,
  "tagteam:chunk_count": 3,
  "tagteam:chunks": [
    {
      "@id": "ex:Chunk_0",
      "tagteam:chunk_index": 0,
      "tagteam:chunk_text": "First part of text...",
      "@graph": [ /* nodes for chunk 0 */ ]
    },
    {
      "@id": "ex:Chunk_1",
      "tagteam:chunk_index": 1,
      "tagteam:chunk_text": "Second part...",
      "@graph": [ /* nodes for chunk 1 */ ]
    }
  ],
  "tagteam:cross_chunk_references": [
    // Links between chunks (e.g., same entity mentioned in multiple chunks)
  ]
}
```

**Budget Enforcement**:
```javascript
class ComplexityBudget {
  constructor() {
    this.maxNodes = 200;
    this.maxReferents = 30;
    this.maxAssertions = 50;
    this.nodeCount = 0;
    this.referentCount = 0;
    this.assertionCount = 0;
  }

  canAddNode(type) {
    if (this.nodeCount >= this.maxNodes) {
      throw new Error('Complexity budget exceeded: max nodes reached');
    }

    if (type === 'DiscourseReferent' && this.referentCount >= this.maxReferents) {
      throw new Error('Too many entities extracted - consider chunking input');
    }

    if (type === 'AssertionEvent' && this.assertionCount >= this.maxAssertions) {
      throw new Error('Too many assertions - consider chunking input');
    }

    return true;
  }

  addNode(type) {
    this.canAddNode(type);
    this.nodeCount++;

    if (type === 'DiscourseReferent') this.referentCount++;
    if (type === 'AssertionEvent') this.assertionCount++;
  }
}
```

**Error Handling**:
- If budget exceeded mid-parse: truncate gracefully, add warning metadata
- Return partial graph with `tagteam:truncated: true`
- Recommend chunking in error message

---

## Question 6: Namespace Strategy

**Question**: Resolve namespace strategy before implementation begins

**Answer**: **Hybrid approach** - use Fandaws namespace for TagTeam-specific terms, example.org for instances.

### Namespace Allocations

| Purpose | Namespace | Example |
|---------|-----------|---------|
| **TagTeam Ontology** | `http://tagteam.fandaws.org/ontology/` | `tagteam:DiscourseReferent` |
| **TagTeam Instances** | `http://example.org/tagteam/` | `ex:Doctor_Referent_0` |
| **CCO** | `http://www.ontologyrepository.com/CommonCoreOntologies/` | `cco:Agent` |
| **BFO** | `http://purl.obolibrary.org/obo/` | `bfo:BFO_0000023` |

### Rationale

**Why Fandaws for ontology**:
- You own the domain
- Aligns with SHML research provenance
- Can host actual OWL ontology at that URL
- Professional/authoritative namespace

**Why example.org for instances**:
- RFC 2606 reserved domain for examples
- Makes clear these are **discourse referents**, not real-world entities
- No namespace ownership burden
- Standard practice for demos/documentation

**Alternative** (if you want instance persistence):
- Use `http://tagteam.fandaws.org/instances/` for instances
- Enables future resolution (could host instance metadata)
- More "production ready" but higher maintenance

### @context Prefix Mapping

```json
{
  "@context": {
    "cco": "http://www.ontologyrepository.com/CommonCoreOntologies/",
    "bfo": "http://purl.obolibrary.org/obo/",
    "tagteam": "http://tagteam.fandaws.org/ontology/",
    "ex": "http://example.org/tagteam/",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "owl": "http://www.w3.org/2002/07/owl#",
    "xsd": "http://www.w3.org/2001/XMLSchema#"
  }
}
```

### IRI Generation Strategy

**DiscourseReferents**:
```
ex:Doctor_Referent_{hash}
ex:Patient_Referent_{hash}
ex:Ventilator_Referent_{hash}
```

**Assertion Events**:
```
ex:Autonomy_Assertion_{timestamp}_{hash}
ex:Urgency_Assessment_{timestamp}_{hash}
```

**ICE/IBE**:
```
ex:Autonomy_ICE_{hash}
ex:Input_Text_IBE_{timestamp}
```

**Hash Function**:
```javascript
function generateIRI(type, label, text) {
  // Use content-based hash for determinism
  const hash = crypto.createHash('md5')
    .update(text + label + type)
    .digest('hex')
    .substring(0, 8);

  return `http://example.org/tagteam/${type}_${hash}`;
}
```

**Timestamp Format**:
```
ISO 8601: 2026-01-18T10:30:00Z
In IRI: 20260118T103000Z (no punctuation)
```

### Ontology Hosting Plan

**tagteam.fandaws.org/ontology/ should serve**:
1. HTML documentation (human-readable)
2. TTL ontology file (machine-readable)
3. Content negotiation (Accept: text/turtle vs text/html)

**Minimum viable ontology** (week 3):
```turtle
@prefix tagteam: <http://tagteam.fandaws.org/ontology/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

tagteam:DiscourseReferent a owl:Class ;
  rdfs:label "Discourse Referent" ;
  rdfs:comment "An entity mentioned in text, distinct from the actual BFO entity it may refer to" .

tagteam:ValueAssertionEvent a owl:Class ;
  rdfs:subClassOf bfo:BFO_0000015 ; # Process
  rdfs:label "Value Assertion Event" ;
  rdfs:comment "An event in which TagTeam detects an ethical value in text" .

# ... etc
```

**Decision**: Use Fandaws namespace. I'll help you create the ontology file in Phase 4.

---

## Summary of Architectural Decisions

| Question | Decision |
|----------|----------|
| **LPG vs JSON-LD** | JSON-LD is native format, no separate LPG |
| **DiscourseReferent** | Yes - use `tagteam:DiscourseReferent` for all text-extracted entities |
| **Confidence** | Measures parser certainty, not truth. Range [0.0, 1.0] with breakdown |
| **realizes direction** | Use `realized_in` from Role → Process only (avoid redundancy) |
| **Complexity budget** | 200 nodes, 30 referents, 50 assertions, 2000 chars max |
| **Namespace** | `tagteam.fandaws.org/ontology/` for classes, `example.org/tagteam/` for instances |

---

## Updated Implementation Checklist

### Pre-Implementation (This Week)
- [ ] Create tagteam ontology TTL file
- [ ] Host at tagteam.fandaws.org/ontology/
- [ ] Update spec with all answers above
- [ ] Get final approval from Aaron

### Week 1 (Core Infrastructure)
- [ ] Implement DiscourseReferent extraction
- [ ] IRI generation with namespaces
- [ ] Complexity budget enforcement
- [ ] Basic JSON-LD serialization

### Week 2 (Assertion Events + Validation)
- [ ] Assertion event wrapping with confidence
- [ ] Fix realizes/realized_in usage
- [ ] SHACL validation integration

### Week 3 (Testing + Chunking)
- [ ] Chunking strategy implementation
- [ ] Test with long texts
- [ ] Performance optimization

---

**Document Version**: 1.0
**Status**: ANSWERS - Awaiting Final Approval
**Last Updated**: January 18, 2026
**Next Step**: Update main spec with these decisions
**Owner**: TagTeam Development Team + Fandaws Ontology Service
