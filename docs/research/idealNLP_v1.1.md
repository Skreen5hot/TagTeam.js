## Ideal Natural Language Processing Service: A Vision (v1.1)

**Version:** 1.1
**Previous:** v1.0
**Changes:** Addresses combinatorial explosion, clarifies self-knowledge scope, adds async processing mode, strengthens temporal grounding, links to broader architecture

---

### Preamble: What's Wrong With Current NLP

Current NLP systems—even state-of-the-art LLMs—share fundamental limitations:

| Limitation | Consequence |
|------------|-------------|
| **Conflate extraction with interpretation** | Can't distinguish "text says X" from "X is true" |
| **Force resolution of ambiguity** | Lose information by picking one reading |
| **Ignore epistemic status** | Treat hedged claims same as definite assertions |
| **Flatten discourse structure** | Miss how sentences relate to each other |
| **Extract entities, not ontological commitments** | "Person" tag tells you nothing about BFO category |
| **Stateless processing** | Each document processed in isolation |
| **Opaque confidence** | Single score hides multidimensional uncertainty |
| **No self-knowledge** | Can't articulate what they don't understand |

An ideal NLP service should overcome all of these.

---

### Design Philosophy

**The NLP service is not a black box that produces "answers."**

It is a **semantic interpretation engine** that:
1. Makes explicit what the text commits to ontologically
2. Preserves what remains ambiguous or underspecified
3. Distinguishes the voice of the text from the voice of the interpreter
4. Knows the boundaries of its own competence
5. Produces structured representations that are auditable, contestable, and refinable

**Guiding Principle:** Better to output structured uncertainty than false precision.

---

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     IDEAL NLP SERVICE ARCHITECTURE                               │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        INPUT PROCESSING                                  │   │
│  │                                                                          │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │   │ Text        │  │ Document    │  │ Multi-Modal │  │ Context     │   │   │
│  │   │ Normalization│  │ Structure   │  │ Integration │  │ Injection   │   │   │
│  │   │             │  │ Parser      │  │ (tables,    │  │ (prior      │   │   │
│  │   │             │  │             │  │  images)    │  │  knowledge) │   │   │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    LINGUISTIC ANALYSIS LAYER                             │   │
│  │                                                                          │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │   │
│  │  │                    Syntactic Processing                           │   │   │
│  │  │  • Constituency & Dependency Parsing                              │   │   │
│  │  │  • Clause Boundary Detection                                      │   │   │
│  │  │  • Ellipsis Resolution                                            │   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                          │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │   │
│  │  │                    Semantic Processing                            │   │   │
│  │  │  • Semantic Role Labeling (deep)                                  │   │   │
│  │  │  • Word Sense Disambiguation                                      │   │   │
│  │  │  • Selectional Restriction Analysis                               │   │   │
│  │  │  • Quantifier Scope Resolution                                    │   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                          │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │   │
│  │  │                    Pragmatic Processing                           │   │   │
│  │  │  • Speech Act Classification                                      │   │   │
│  │  │  • Presupposition Extraction                                      │   │   │
│  │  │  • Implicature Detection                                          │   │   │
│  │  │  • Rhetorical Relation Analysis                                   │   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                          │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │   │
│  │  │                    Discourse Processing                           │   │   │
│  │  │  • Coreference Resolution (cross-document)                        │   │   │
│  │  │  • Discourse Coherence Modeling                                   │   │   │
│  │  │  • Topic/Focus Structure                                          │   │   │
│  │  │  • Narrative Arc Detection                                        │   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    EPISTEMIC ANALYSIS LAYER                              │   │
│  │                                                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │ Source      │  │ Evidentiality│  │ Certainty   │  │ Temporal    │   │   │
│  │  │ Attribution │  │ Detection   │  │ Analysis    │  │ Grounding   │   │   │
│  │  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤   │   │
│  │  │ Who said    │  │ How do they │  │ How sure    │  │ When true   │   │   │
│  │  │ this?       │  │ know?       │  │ are they?   │  │ (if ever)?  │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  │                                                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │ Modality    │  │ Conditiontic│  │ Counterfact-│  │ Perspectival│   │   │
│  │  │ Analysis    │  │ Detection   │  │ ual Analysis│  │ Indexing    │   │   │
│  │  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤   │   │
│  │  │ Must/may/   │  │ If-then     │  │ What didn't │  │ Whose view  │   │   │
│  │  │ should      │  │ dependencies│  │ happen      │  │ is this?    │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    ONTOLOGICAL MAPPING LAYER                             │   │
│  │                                                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │ BFO Category│  │ Role        │  │ Relation    │  │ Event       │   │   │
│  │  │ Assignment  │  │ Detection   │  │ Mapping     │  │ Structure   │   │   │
│  │  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤   │   │
│  │  │ IC/GDC/SDC/ │  │ Semantic    │  │ BFO/CCO     │  │ Temporal    │   │   │
│  │  │ Occurrent   │  │ roles →     │  │ relation    │  │ parts,      │   │   │
│  │  │             │  │ BFO roles   │  │ selection   │  │ causation   │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  │                                                                          │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │   │
│  │  │                 Domain Ontology Integration                       │   │   │
│  │  │  • Configurable domain specialization                             │   │   │
│  │  │  • Multi-ontology alignment                                       │   │   │
│  │  │  • Novel concept flagging                                         │   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    INTERPRETATION MANAGEMENT LAYER                       │   │
│  │                                                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │ Ambiguity   │  │ Interpretation│ │ Confidence  │  │ Explanation │   │   │
│  │  │ Preservation│  │ Lattice     │  │ Decomposition│ │ Generation  │   │   │
│  │  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤   │   │
│  │  │ Keep all    │  │ Partial     │  │ Multi-dim   │  │ Why this    │   │   │
│  │  │ SIGNIFICANT │  │ order of    │  │ uncertainty │  │ interpretation│ │   │
│  │  │ readings    │  │ readings    │  │ scores      │  │ ?           │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  │                                                                          │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │   │
│  │  │              AMBIGUITY PRUNING STRATEGIES (v1.1)                  │   │   │
│  │  │  • Ontological equivalence collapse                               │   │   │
│  │  │  • Implausibility filtering                                       │   │   │
│  │  │  • Configurable preservation depth                                │   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    VALIDATION LAYER (v1.1)                               │   │
│  │                                                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │                Internal Self-Assessment                          │   │   │
│  │  │  • Configuration-based competence (what ontologies loaded?)      │   │   │
│  │  │  • Processing failure detection (parse failures, unknown terms)  │   │   │
│  │  │  • Coverage metrics (what % of input was successfully processed) │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                          │   │   
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │                External Validation (SHACL)                       │   │   │
│  │  │  • Output graph validated against domain ontology constraints    │   │   │
│  │  │  • Impossible relations flagged                                  │   │   │
│  │  │  • Domain-specific plausibility checks                           │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         OUTPUT LAYER                                     │   │
│  │                                                                          │   │
│  │   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │   │
│  │   │ Semantic Graph   │  │ Interpretation   │  │ Validation       │     │   │
│  │   │ (JSON-LD)        │  │ Report           │  │ Report           │     │   │
│  │   └──────────────────┘  └──────────────────┘  └──────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### Processing Modes (v1.1)

**Problem Addressed:** Full pipeline is computationally expensive; cannot be real-time for documents.

**Solution:** Dual-mode processing with explicit tradeoffs.

#### Synchronous Mode (Real-Time)

For short inputs where latency matters:

```javascript
// API
POST /api/v1/parse/sync
Content-Type: application/json

{
  "text": "The board approved the merger.",
  "context": { /* optional */ },
  "config": {
    "mode": "sync",
    "maxLatencyMs": 500,
    "depth": "standard"  // reduced pipeline
  }
}

// Response: Immediate (< 500ms)
{
  "result": { /* JSON-LD graph */ },
  "processingNote": "Reduced pipeline for latency target"
}
```

**Sync Mode Constraints:**

| Input Size | Max Latency | Pipeline Depth |
|------------|-------------|----------------|
| < 500 chars | 200ms | Full |
| 500-2000 chars | 500ms | Standard (no rhetorical analysis) |
| 2000-5000 chars | 1000ms | Basic (no pragmatics) |
| > 5000 chars | Rejected | Must use async |

#### Asynchronous Mode (Job-Based)

For documents where completeness matters:

```javascript
// Submit job
POST /api/v1/parse/async
Content-Type: application/json

{
  "document": { /* or documentUrl */ },
  "context": { /* ... */ },
  "config": {
    "mode": "async",
    "depth": "full",
    "callbackUrl": "https://client.example/webhook"  // optional
  }
}

// Response: Job ID
{
  "jobId": "job-a1b2c3d4",
  "status": "queued",
  "estimatedCompletionTime": "2026-01-19T15:35:00Z",
  "statusUrl": "/api/v1/jobs/job-a1b2c3d4"
}

// Poll for status
GET /api/v1/jobs/job-a1b2c3d4

{
  "jobId": "job-a1b2c3d4",
  "status": "processing",
  "progress": {
    "stage": "epistemic_analysis",
    "percentComplete": 65
  },
  "estimatedCompletionTime": "2026-01-19T15:34:30Z"
}

// Completed
{
  "jobId": "job-a1b2c3d4",
  "status": "completed",
  "resultUrl": "/api/v1/jobs/job-a1b2c3d4/result",
  "completedAt": "2026-01-19T15:34:28Z"
}
```

**Pipeline Stages for Progress Reporting:**

```
queued → preprocessing → linguistic_analysis → epistemic_analysis → 
ontological_mapping → interpretation_management → validation → completed
```

---

### Layer 1: Input Processing

#### 1.1 Document Structure Parser

**Beyond flat text.** Real documents have structure that carries meaning:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DOCUMENT STRUCTURE MODEL                          │
│                                                                      │
│  Document                                                            │
│  ├── Metadata (title, author, date, genre)                          │
│  ├── Sections                                                        │
│  │   ├── Section 1 (heading, rhetorical function)                   │
│  │   │   ├── Paragraphs                                              │
│  │   │   │   ├── Sentences                                           │
│  │   │   │   │   ├── Clauses                                         │
│  │   │   │   │   │   └── Propositions                                │
│  │   │   ├── Lists (ordered/unordered, semantic type)               │
│  │   │   ├── Tables (header/data, relations)                        │
│  │   │   └── Figures (caption, reference)                           │
│  │   └── Section 2...                                                │
│  ├── Footnotes/Endnotes (linked to referents)                       │
│  ├── References/Citations                                            │
│  └── Appendices                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 1.2 Multi-Modal Integration

Text rarely exists alone. An ideal NLP service handles:

| Modality | Integration Approach |
|----------|---------------------|
| **Tables** | Parse as structured assertions; header = property, cell = value |
| **Charts/Graphs** | Extract trends, comparisons, outliers as propositions |
| **Images with text** | OCR + spatial relationship to surrounding text |
| **Diagrams** | Extract entities and relations from visual structure |
| **Forms** | Field labels = properties, entries = values |
| **Mathematical notation** | Parse as logical/quantitative assertions |

#### 1.3 Context Injection (Enhanced v1.1)

Processing doesn't happen in a vacuum. The service accepts prior context:

```javascript
interface ProcessingContext {
  // What we already know about entities mentioned
  priorKnowledge: {
    entities: EntityProfile[],      
    relations: RelationAssertion[], 
    terminology: TermDefinition[]   
  },
  
  // Document context (ENHANCED)
  documentContext: {
    genre: string,          
    author: EntityRef,      
    audience: EntityRef[],  
    purpose: string,        
    
    // v1.1: Explicit temporal anchoring
    documentDate: Date,           // When document was created
    referenceTime: Date,          // Default "now" for temporal expressions
    effectiveDate?: Date,         // When content takes effect (for contracts)
    
    // v1.1: Source trust integration
    sourceId: string,             // Links to Trust Registry
    institutionalContext?: string // "earnings_call", "court_filing", "casual_email"
  },
  
  // Interpretation guidance
  interpretationContext: {
    domain: string,              
    ontologyConfig: string,      
    ambiguityTolerance: number,  
    confidenceThreshold: number,
    
    // v1.1: Pruning configuration
    maxReadingsPerAmbiguity: number,  // Default: 5
    collapseEquivalentReadings: boolean,  // Default: true
    implausibilityThreshold: number   // Below this, discard reading
  }
}
```

**Temporal Grounding Enhancement (v1.1):**

The `referenceTime` parameter is critical for resolving:
- "last week" → referenceTime minus 7 days
- "the former president" → president before referenceTime
- "recently" → within N days of referenceTime
- "previously" → before referenceTime

Without explicit referenceTime, the service uses documentDate. If neither is provided, processing time is used with a warning.

---

### Layer 2: Linguistic Analysis

*(Unchanged from v1.0 - see original document for full detail)*

Key capabilities:
- Deep Semantic Role Labeling
- Quantifier Scope Resolution  
- Speech Act Classification
- Presupposition Extraction
- Implicature Detection
- Rhetorical Relation Analysis

---

### Layer 3: Epistemic Analysis

#### 3.1 Source Attribution (Enhanced v1.1)

**Integration with Trust Registry:**

The NLP service extracts *who said what*. The broader architecture's Trust Registry determines *how much to believe them*.

```json
{
  "claim": "Revenue increased 15%",
  "attributionChain": [
    {
      "source": "CFO",
      "sourceId": "person:cfo-jane-smith",  // Links to Trust Registry
      "commitmentLevel": "asserted",
      "evidentialBasis": "direct_knowledge"
    }
  ],
  "trustRegistryHook": {
    "sourceId": "person:cfo-jane-smith",
    "contextualRole": "company_officer",
    "institutionalContext": "earnings_call",
    "note": "Trust score to be resolved by Reconciliation Layer"
  }
}
```

**Separation of Concerns:**

| Responsibility | NLP Service | Trust Registry | Reconciliation Layer |
|----------------|-------------|----------------|---------------------|
| Who said it? | ✓ | | |
| How trustworthy are they? | | ✓ | |
| Which version to believe? | | | ✓ |

The NLP service provides the raw attribution; it does NOT make trust judgments.

#### 3.2 Temporal Grounding (Enhanced v1.1)

**Explicit Reference Time Handling:**

```json
{
  "claim": "The company was profitable last quarter",
  "temporalGrounding": {
    "referenceTime": "2026-01-19T00:00:00Z",  // From context injection
    "resolvedInterval": {
      "type": "calendar_quarter",
      "value": "2025-Q4",
      "start": "2025-10-01",
      "end": "2025-12-31"
    },
    "resolution": {
      "expression": "last quarter",
      "anchoredTo": "referenceTime",
      "method": "calendar_unit_offset"
    }
  }
}
```

**Implicit Temporality Handling:**

| Expression | Resolution Strategy |
|------------|---------------------|
| "last week" | referenceTime - 7 days |
| "the former president" | Query: who held role before referenceTime |
| "recently" | referenceTime - (configurable window, default 30 days) |
| "previously" | Before referenceTime (unbounded start) |
| "soon" | After referenceTime (configurable window) |
| Bare past tense | Before referenceTime, interval unknown |

**When Reference Time Is Missing:**

```json
{
  "warning": {
    "type": "temporal_anchor_missing",
    "message": "No referenceTime provided; using documentDate",
    "fallback": "2026-01-15T00:00:00Z",
    "affectedExpressions": ["last week", "previously", "recently"],
    "recommendation": "Provide explicit referenceTime for accurate temporal grounding"
  }
}
```

---

### Layer 4: Ontological Mapping

*(Largely unchanged from v1.0)*

Key capabilities:
- BFO Category Assignment
- Role Detection
- Event Structure Analysis
- Novel Concept Flagging

---

### Layer 5: Interpretation Management (Revised v1.1)

#### 5.1 Ambiguity Preservation with Pruning

**Problem Addressed:** Combinatorial explosion when multiple ambiguities combine.

**The Reality Check:** The critique's worst-case scenario (3 ambiguous NPs × 2 ambiguous quantifiers = 12+ readings) is theoretically valid but empirically rare. In practice:

- Most sentences have 0-1 significant ambiguities
- Ambiguities are often local (don't multiply)
- Many "readings" are ontologically equivalent

**However**, the concern is legitimate for complex legal/technical text. The solution is **principled pruning**, not abandoning ambiguity preservation.

**Pruning Strategies:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                 AMBIGUITY PRUNING PIPELINE                           │
│                                                                      │
│  All Possible Readings                                               │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ STAGE 1: Implausibility Filter                               │   │
│  │                                                              │   │
│  │ Remove readings that violate:                                │   │
│  │ • Selectional restrictions (verbs require certain arg types) │   │
│  │ • World knowledge (rivers don't raise interest rates)        │   │
│  │ • Domain constraints (if medical config, filter non-medical) │   │
│  │                                                              │   │
│  │ Threshold: plausibility < 0.1 → discard                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ STAGE 2: Ontological Equivalence Collapse                    │   │
│  │                                                              │   │
│  │ Merge readings that produce IDENTICAL:                       │   │
│  │ • BFO category assignments                                   │   │
│  │ • Role assignments                                           │   │
│  │ • Relation structures                                        │   │
│  │                                                              │   │
│  │ "bank (financial)" vs "bank (specific institution)" →        │   │
│  │  Both yield cco:Organization → COLLAPSE                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ STAGE 3: Significance Filter                                 │   │
│  │                                                              │   │
│  │ Keep only readings where difference MATTERS:                 │   │
│  │ • Different truth conditions                                 │   │
│  │ • Different obligations/permissions                          │   │
│  │ • Different entity references                                │   │
│  │                                                              │   │
│  │ If readings differ only in stylistic interpretation → MERGE  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ STAGE 4: Cardinality Cap                                     │   │
│  │                                                              │   │
│  │ If > maxReadingsPerAmbiguity remain:                        │   │
│  │ • Rank by plausibility                                       │   │
│  │ • Keep top N                                                 │   │
│  │ • Flag that readings were truncated                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │                                                            │
│         ▼                                                            │
│  Preserved Significant Readings (typically 1-3)                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Pruning Metadata:**

```json
{
  "ambiguityAnalysis": {
    "originalReadingCount": 8,
    "afterImplausibilityFilter": 4,
    "afterEquivalenceCollapse": 2,
    "afterSignificanceFilter": 2,
    "finalReadingCount": 2,
    "truncated": false,
    "prunedReadings": [
      {
        "reading": "river bank interpretation",
        "prunedAt": "implausibility_filter",
        "reason": "selectional restriction violation: 'raised rates' requires financial entity"
      }
    ]
  }
}
```

#### 5.2 Interpretation Lattice (Enhanced v1.1)

**JSON-LD Structure for Lattice:**

```json
{
  "@context": {
    "tagteam": "http://tagteam.fandaws.org/ontology/",
    "interp": "http://tagteam.fandaws.org/interpretation/"
  },
  
  "sentence": "The chicken is ready to eat",
  "sentenceId": "sent-001",
  
  "interpretationLattice": {
    "@type": "interp:InterpretationLattice",
    "rootNode": "interp:reading-root",
    
    "nodes": [
      {
        "@id": "interp:reading-root",
        "@type": "interp:InterpretationNode",
        "level": 0,
        "content": {
          "gloss": "Some entity described as 'chicken' is in a state of readiness related to eating",
          "commitments": {
            "entityExists": true,
            "entityDescribedAs": "chicken",
            "stateType": "readiness",
            "relatedTo": "eating"
          }
        },
        "specificity": "minimal",
        "children": ["interp:reading-food", "interp:reading-animal"]
      },
      
      {
        "@id": "interp:reading-food",
        "@type": "interp:InterpretationNode",
        "level": 1,
        "content": {
          "gloss": "The chicken (food item) is prepared for consumption",
          "commitments": {
            "chickenType": "food",
            "bfoCategory": "bfo:BFO_0000040",
            "readinessFor": "being_eaten",
            "impliedAgent": "external_consumer"
          },
          "semanticStructure": {
            "subject": { "ref": "chicken", "type": "food" },
            "predicate": "ready_for",
            "theme": "consumption_by_other"
          }
        },
        "specificity": "domain_resolved",
        "plausibility": 0.85,
        "supportingEvidence": ["cooking context", "food preparation frame"],
        "parent": "interp:reading-root",
        "children": ["interp:reading-food-cooked", "interp:reading-food-live"]
      },
      
      {
        "@id": "interp:reading-animal",
        "@type": "interp:InterpretationNode",
        "level": 1,
        "content": {
          "gloss": "The chicken (animal) is ready to eat something",
          "commitments": {
            "chickenType": "animal",
            "bfoCategory": "cco:Organism",
            "readinessFor": "performing_eating",
            "impliedAgent": "chicken_itself"
          },
          "semanticStructure": {
            "subject": { "ref": "chicken", "type": "animal" },
            "predicate": "ready_to_perform",
            "action": "eating"
          }
        },
        "specificity": "domain_resolved",
        "plausibility": 0.15,
        "supportingEvidence": ["animal care frame"],
        "parent": "interp:reading-root",
        "children": []
      },
      
      {
        "@id": "interp:reading-food-cooked",
        "@type": "interp:InterpretationNode",
        "level": 2,
        "content": {
          "gloss": "The cooked chicken dish is ready to be served and eaten",
          "commitments": {
            "chickenType": "food",
            "preparationState": "cooked",
            "readinessFor": "immediate_consumption"
          }
        },
        "specificity": "fully_resolved",
        "plausibility": 0.80,
        "parent": "interp:reading-food",
        "children": []
      }
    ],
    
    "latticeRelations": [
      {
        "type": "subsumes",
        "general": "interp:reading-root",
        "specific": "interp:reading-food"
      },
      {
        "type": "subsumes",
        "general": "interp:reading-root",
        "specific": "interp:reading-animal"
      },
      {
        "type": "subsumes",
        "general": "interp:reading-food",
        "specific": "interp:reading-food-cooked"
      },
      {
        "type": "mutually_exclusive",
        "nodes": ["interp:reading-food", "interp:reading-animal"]
      }
    ],
    
    "defaultReading": "interp:reading-food-cooked",
    "defaultRationale": "Highest plausibility among fully resolved readings"
  },
  
  "disambiguationGuidance": {
    "contextClues": [
      {
        "clue": "Preceding mention of cooking/kitchen",
        "favors": "interp:reading-food"
      },
      {
        "clue": "Preceding mention of farm/animals",
        "favors": "interp:reading-animal"
      }
    ],
    "queryForResolution": "Is the context about food preparation or animal husbandry?"
  }
}
```

**Lattice Operations:**

| Operation | Use Case | Result |
|-----------|----------|--------|
| `getMinimalCommitment()` | Risk-averse downstream | Returns root node |
| `getDefaultReading()` | Standard processing | Returns highest-plausibility leaf |
| `getReadingsAtLevel(n)` | Controlled specificity | Returns all nodes at depth n |
| `filterByPlausibility(threshold)` | Confidence filtering | Returns nodes above threshold |
| `collapseToOntology()` | Graph integration | Returns ontologically-distinct readings only |

---

### Layer 6: Validation (Revised v1.1)

**Addressing the "Grading Your Own Paper" Problem:**

The critique correctly notes that LLMs are bad at knowing when they hallucinate. However, I push back slightly on the framing:

**What "self-knowledge" means here is NOT:**
- "I know my output is correct" (impossible)
- "I know I'm not hallucinating" (impossible)

**What "self-knowledge" means here IS:**
- "I know what ontologies I have loaded" (configuration fact)
- "I know what terms I failed to parse" (processing fact)
- "I know what percentage of input I covered" (coverage metric)
- "I know my output violates SHACL constraints" (validation fact)

The first category (internal self-assessment) is reliably knowable. The second category (external validation) requires the SHACL-based reality check the critique recommends.

**Revised Two-Layer Validation:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                      VALIDATION LAYER                                │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │            INTERNAL SELF-ASSESSMENT                            │  │
│  │                                                                │  │
│  │  What the NLP service CAN reliably know about itself:          │  │
│  │                                                                │  │
│  │  Configuration State:                                          │  │
│  │  • Which ontologies are loaded                                 │  │
│  │  • Which domain configs are active                             │  │
│  │  • What processing depth was used                              │  │
│  │                                                                │  │
│  │  Processing Metrics:                                           │  │
│  │  • Parse success/failure per sentence                          │  │
│  │  • Unknown terms encountered                                   │  │
│  │  • Coverage (% of input that produced output)                  │  │
│  │                                                                │  │
│  │  Structural Completeness:                                      │  │
│  │  • Unresolved references                                       │  │
│  │  • Missing role fillers                                        │  │
│  │  • Incomplete event structures                                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │            EXTERNAL VALIDATION (SHACL)                         │  │
│  │                                                                │  │
│  │  What requires external checking:                              │  │
│  │                                                                │  │
│  │  Ontological Legality:                                         │  │
│  │  • Are the asserted types valid in the domain ontology?        │  │
│  │  • Are the relations used correctly (domain/range)?            │  │
│  │  • Are role bearer constraints satisfied?                      │  │
│  │                                                                │  │
│  │  Domain Plausibility:                                          │  │
│  │  • Do the extracted values fall within expected ranges?        │  │
│  │  • Are the entity combinations plausible?                      │  │
│  │  • Do temporal assertions make sense?                          │  │
│  │                                                                │  │
│  │  Cross-Reference Consistency:                                  │  │
│  │  • Does this contradict the existing graph?                    │  │
│  │  • Are there entity resolution conflicts?                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │            COMBINED VALIDATION REPORT                          │  │
│  │                                                                │  │
│  │  Overall Reliability:                                          │  │
│  │  • internal_assessment: 0.85                                   │  │
│  │  • external_validation: 0.92                                   │  │
│  │  • combined_score: 0.88                                        │  │
│  │                                                                │  │
│  │  Issues:                                                       │  │
│  │  • [internal] 3 unknown terms                                  │  │
│  │  • [external] 1 SHACL warning (unusual but not invalid)        │  │
│  │                                                                │  │
│  │  Recommendations:                                              │  │
│  │  • Load pharmaceutical ontology for better term coverage       │  │
│  │  • Flag unusual entity combination for human review            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**SHACL Validation Examples:**

```turtle
# Validate that extracted Acts have plausible agents
tagteam:ActAgentPlausibilityShape a sh:NodeShape ;
  sh:targetClass cco:IntentionalAct ;
  sh:sparql [
    sh:message "Act agent should be Person or Organization, found: {$agent}" ;
    sh:select """
      SELECT $this ?agent WHERE {
        $this cco:has_agent ?agent .
        FILTER NOT EXISTS { ?agent a/rdfs:subClassOf* cco:Agent }
      }
    """
  ] .

# Validate temporal consistency
tagteam:TemporalConsistencyShape a sh:NodeShape ;
  sh:targetClass tagteam:TemporalAssertion ;
  sh:sparql [
    sh:message "End time cannot precede start time" ;
    sh:select """
      SELECT $this WHERE {
        $this tagteam:hasStartTime ?start ;
             tagteam:hasEndTime ?end .
        FILTER (?end < ?start)
      }
    """
  ] .

# Domain-specific: Medical dosage plausibility
medical:DosagePlausibilityShape a sh:NodeShape ;
  sh:targetClass medical:MedicationDosage ;
  sh:property [
    sh:path medical:dosageAmount ;
    sh:maxExclusive 10000 ;  # mg
    sh:message "Dosage amount unusually high - verify extraction"
  ] .
```

**Validation Output:**

```json
{
  "validation": {
    "internal": {
      "configurationState": {
        "ontologiesLoaded": ["bfo", "cco", "medical"],
        "domainConfig": "medical.json",
        "processingDepth": "full"
      },
      "processingMetrics": {
        "sentencesParsed": 23,
        "sentencesFailed": 1,
        "unknownTerms": ["hERG", "IC50"],
        "coveragePercent": 95.6
      },
      "structuralCompleteness": {
        "unresolvedReferences": 2,
        "incompleteEvents": 0
      },
      "selfAssessmentScore": 0.85
    },
    
    "external": {
      "shaclValidation": {
        "shapesChecked": 47,
        "violations": 0,
        "warnings": 1,
        "warningDetails": [
          {
            "shape": "medical:DosagePlausibilityShape",
            "severity": "warning",
            "node": "inst:Dosage_001",
            "message": "Dosage amount (5000mg) unusually high - verify extraction"
          }
        ]
      },
      "domainPlausibility": {
        "score": 0.92,
        "flags": []
      },
      "externalValidationScore": 0.92
    },
    
    "combined": {
      "overallScore": 0.88,
      "recommendation": "Review flagged dosage; otherwise high confidence",
      "humanReviewRequired": false,
      "humanReviewSuggested": true
    }
  }
}
```

---

### Output Schemas

#### Primary Output: Semantic Graph (JSON-LD)

```json
{
  "@context": { /* ... */ },
  "@graph": [
    /* Tier 1: Information Content Entities */
    /* Tier 2: Real World Entities */
  ],
  
  "_meta": {
    "processingId": "proc-001",
    "jobId": "job-a1b2c3d4",  // If async
    "timestamp": "2026-01-19T15:30:00Z",
    "serviceVersion": "4.0.0",
    "configProfile": "default+medical",
    "processingMode": "async_full",
    "processingDuration": "12.4s"
  },
  
  "_context": {
    "referenceTime": "2026-01-19T00:00:00Z",
    "documentDate": "2026-01-15T00:00:00Z",
    "sourceId": "doc:clinical-trial-report-2026-001"
  },
  
  "_epistemics": {
    "overallConfidence": { /* decomposed */ },
    "interpretationLattices": { /* per ambiguous segment */ },
    "sourceAttributions": { /* linked to trust registry */ }
  },
  
  "_validation": {
    "internal": { /* self-assessment */ },
    "external": { /* SHACL results */ },
    "combined": { /* overall */ }
  },
  
  "_explanations": {
    /* per-assertion reasoning traces */
  },
  
  "_processingNotes": {
    "failures": [ /* explicit failures */ ],
    "truncations": [ /* if readings were capped */ ],
    "clarificationsNeeded": [ /* questions for human */ ]
  }
}
```

---

### Integration with Broader Architecture (v1.1)

**How This NLP Service Fits:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SEMANTIC DATA PLATFORM                            │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   INGESTION LAYER                            │   │
│  │                                                              │   │
│  │  ┌─────────┐  ┌─────────────────────────────┐  ┌─────────┐ │   │
│  │  │   SQL   │  │    NLP SERVICE (this doc)   │  │   API   │ │   │
│  │  │ Adapter │  │                             │  │ Adapter │ │   │
│  │  │         │  │  • Dual-mode (sync/async)   │  │         │ │   │
│  │  │         │  │  • Ambiguity preservation   │  │         │ │   │
│  │  │         │  │  • Source attribution       │  │         │ │   │
│  │  │         │  │  • Self-assessment          │  │         │ │   │
│  │  └────┬────┘  └──────────────┬──────────────┘  └────┬────┘ │   │
│  │       │                      │                      │       │   │
│  │       │    Ontology Registry validates all          │       │   │
│  │       └──────────────────────┼──────────────────────┘       │   │
│  │                              │                               │   │
│  │                              ▼                               │   │
│  │                      Semantic Event Bus                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 RECONCILIATION LAYER                         │   │
│  │                                                              │   │
│  │  Source Attribution ──────────────▶ Trust Registry           │   │
│  │       (from NLP)                    (platform service)       │   │
│  │                                            │                 │   │
│  │                                            ▼                 │   │
│  │  Interpretation Lattice ─────────▶ Entity Resolution         │   │
│  │  (multiple readings)               (may use lattice to pick) │   │
│  │                                            │                 │   │
│  │                                            ▼                 │   │
│  │  Validation Report ──────────────▶ HITL Queue               │   │
│  │  (flags for review)                (if validation warnings)  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│                         GRAPH LAYER                                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Integration Points:**

| NLP Output | Consumed By | Purpose |
|------------|-------------|---------|
| Source attributions | Trust Registry | Resolve conflicting claims |
| Interpretation lattice | Entity Resolution | Choose appropriate reading |
| Validation warnings | HITL Service | Queue for human review |
| Confidence decomposition | Reconciliation | Weight assertions |
| Temporal grounding | Graph Layer | Temporal reasoning |
| Processing metadata | Status Service | Job tracking |

---

### Capabilities Summary (Updated)

| Capability | Current NLP | Ideal NLP Service | v1.1 Enhancement |
|------------|-------------|-------------------|------------------|
| Entity extraction | ✓ | ✓ with BFO categories | — |
| Relation extraction | ✓ | ✓ with proper ontological relations | — |
| Ambiguity handling | Force resolution | Preserve significant readings | **Pruning strategies** |
| Epistemic status | Ignored | Full analysis | **Trust registry integration** |
| Temporal grounding | Limited | Full with intervals | **Explicit reference time** |
| Confidence | Single score | Multi-dimensional decomposition | — |
| Explanation | None | Full reasoning trace | — |
| Self-knowledge | None | Configuration + coverage metrics | **Clarified scope** |
| External validation | None | — | **SHACL validation layer** |
| Processing mode | Sync only | Sync + async | **Job-based for documents** |
| Lattice output | None | Partial order of readings | **JSON-LD schema defined** |

---

### Implementation Considerations (Revised)

| Phase | Capabilities | Builds On | Mode |
|-------|--------------|-----------|------|
| **Current (TagTeam 3.0)** | Two-tier, BFO mapping, deontic, basic epistemic | Foundation | Sync |
| **Next (4.0)** | Source attribution, confidence decomposition, ambiguity preservation with pruning, async mode | Phase 4 | Sync + Async |
| **Future (5.0)** | Full pragmatics (speech acts, presupposition, implicature), interpretation lattice | Discourse research | Async primary |
| **Aspirational (6.0)** | Full self-assessment, SHACL validation, clarification requests | AI/interpretability research | Async primary |

---

### Summary of v1.1 Changes

| Critique | Response | Change |
|----------|----------|--------|
| Combinatorial explosion of ambiguity | Valid; implemented pruning | Added 4-stage pruning pipeline |
| Self-knowledge is impossible | Partially valid; clarified scope | Split into internal (knowable) + external (SHACL) |
| Processing latency | Valid | Added sync/async dual-mode |
| Source attribution needs Trust Registry | Valid | Added integration hooks |
| Temporal grounding needs reference time | Valid | Added explicit referenceTime in context |
| Need lattice JSON-LD schema | Agreed | Added full schema with operations |

---

### References

- BFO 2020 Specification: https://basic-formal-ontology.org/
- CCO: https://github.com/CommonCoreOntology/CommonCoreOntologies
- SHACL: https://www.w3.org/TR/shacl/
- Discourse Representation Theory: Kamp & Reyle
- Speech Act Theory: Searle, Austin
- Rhetorical Structure Theory: Mann & Thompson