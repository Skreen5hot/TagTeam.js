# TagTeam Sentence Boundary Architecture Specification

**Document ID:** TT-SPEC-SBA  
**Version:** 1.3  
**Previous:** 1.2 (2026-04-01)  
**Date:** 2026-04-01  
**Status:** Approved for Alpha.2 Implementation  
**Target Build:** TagTeam v7 / Alpha.2  
**Depends on:**
- TagTeam SHACL Validation Specification v1.3.1
- TagTeam Realist Deontic Modeling Specification v1.2.1
- TagTeam Two-Tier Architecture Specification (current)

---

## Document Status

This version resolves eight issues identified during consistency and formalization review of v1.2. The review found four internal contradictions requiring correction (the worked example tokenSpan bug, the `mentionId` format split across three locations, the absent JSON-to-RDF projection that the SHACL shapes depend on, and the incomplete `SentenceRelationshipShape` coverage), and confirmed that four open questions had been carried without decisions long enough to affect testability. All eight items are resolved in this version. No open questions remain.

**This is the approved implementation baseline for Alpha.2.** Implementers MUST treat this version as the execution contract, not v1.2.

### v1.3 Revision Notes (from v1.2)

| Issue | Classification | Resolution | Section(s) |
|-------|---------------|------------|------------|
| **`tokenSpan` bug in §4.2 worked example** — second sentence declared `tokenSpan: [5, 9]` with 6 tokens, violating the spec's own `tokens.length === tokenSpan[1] - tokenSpan[0] + 1` rule | Internal contradiction | Corrected to `tokenSpan: [5, 10]`; all arc indices verified consistent with the corrected bounds | §4.2 |
| **`mentionId` format inconsistency** — §2 said `m{position}`, §5.3.3 code used `m{j}` where j is head token index, AC-SBA-6 said `m{tokenIndex}`; three locations, potentially different semantics | Internal contradiction | Unified to `{parsingActId}:s{sentenceIndex}:m{headTokenIndex}` with a single normative definition of `headTokenIndex` in §2 and propagated to §5.3.3 and AC-SBA-6 | §2, §5.3.3, §9 |
| **SHACL shapes reference RDF properties with no defined JSON-to-RDF mapping** — shapes use `tagteam:hasSentence`, `tagteam:tokenCount`, `tagteam:hasArc`, `tagteam:tokenSpanStart/End`, `tagteam:firstToken`; none of these were projected from the JSON schema, leaving validators to invent the mapping | Critical gap | New §4.6 defines the complete deterministic JSON-to-RDF projection: IRI construction rules, all triples produced, derived properties (`tokenCount`, `tokenSpanStart`, `tokenSpanEnd`, `firstToken`), and linking triples. Projection is normative. | §4.6 (new) |
| **`SBA_SentenceRelationshipShape` underconstrained** — verified existence of a relationship node and referential validity, but not adjacency, uniqueness per pair, or consistency between `relationshipType` and `logicalConnector` | Coverage gap | Three new SPARQL blocks added: `RelationshipAdjacencyViolation`, `RelationshipDuplicateViolation`, `RelationshipTypeConsistencyViolation` | §6.5 |
| **Q1 (abbreviation lexicon) unresolved** — whether the lexicon is a hardcoded constant or a configurable file affects corpus iteration cost and deployment assumptions | Open question closed | Decision: configurable JSON file (`src/nlp/abbreviation-lexicon.json`) shipping in the dist bundle; three-tier structure (`standard`, `agency`, `custom`); loaded at segmenter initialization | §5.1.2 |
| **Q3 (numbered list marker handling) unresolved** — whether list markers are stripped before parsing or passed to the parser as `punct` dependencies | Open question closed | Decision: Option A — strip before parsing; store original marker string in new `listMarker` field on `SentenceRecord`; `tokens` array never contains the marker | §4.2 (field added), §5.1.3 Rule B-2 |
| **Q4 (Wave 1 multi-sentence corpus) unresolved** — 40-sentence single-sentence corpus does not validate the segmenter; no multi-sentence inputs in Wave 1 scope | Open question closed | Decision: Wave 1 MUST include 10 multi-sentence inputs from the CMS-DHS MOA with specified composition; Wave 1 blocking criteria updated | §10 |
| **Q5 (`"legal-proviso"` and `"legal-exception"` types) unresolved** — whether deontic constructions (`notwithstanding`, `provided that`) warrant distinct `relationshipType` values | Open question closed | Decision: both added as valid types; trigger vocabulary specified; type-consistency SHACL constraint updated to include them | §4.4, §6.5 |

### Normative Interpretation

Any algorithm, schema definition, SHACL shape, projection rule, or prose describing parsing order, data structure constraints, or acceptance/rejection criteria SHALL be interpreted as normative unless explicitly marked INFORMATIVE or OPTIONAL. MUST, MUST NOT, SHALL, SHOULD, RECOMMENDED, MAY, and OPTIONAL are interpreted per RFC 2119.

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Definitions](#2-definitions)
3. [Architectural Principles](#3-architectural-principles)
4. [Data Model: Forest Metadata Schema](#4-data-model-forest-metadata-schema)
5. [Module Specifications](#5-module-specifications)
6. [SHACL Validation Shapes](#6-shacl-validation-shapes)
7. [Coordination Decomposition](#7-coordination-decomposition)
8. [Modal Scope Inheritance Stub](#8-modal-scope-inheritance-stub)
9. [Acceptance Criteria](#9-acceptance-criteria)
10. [Implementation Sequencing](#10-implementation-sequencing)
11. [Migration Guide](#11-migration-guide)
12. [Resolved Design Decisions](#12-resolved-design-decisions)

---

## 1. Purpose and Scope

### 1.1 The Core Problem

TagTeam's dependency parser produces a single rooted tree per input string. When the input contains multiple sentences, the parser either (a) treats the second sentence's root verb as a syntactic subordinate (`ccomp`, `advcl`) of the first sentence's root, or (b) produces a malformed tree with two roots. Neither output is semantically valid.

The consequence in the knowledge graph is a violation of the **Independence of Occurrents** — the ontological principle that distinct events described in distinct sentences are not inherently subordinate to one another unless explicitly linked by a lexical conjunction. When "CMS shall provide access" and "USCIS shall monitor records" appear as consecutive sentences, two independent `Obligation` Realizable Entities must be generated, each inhering in its own prescribed agent. A `ccomp` arc between them forces both obligations into a single syntactic scope, making it impossible to correctly assign the `DirectiveICE` and `PlanSpecification` nodes for the second sentence.

### 1.2 Scope

This specification defines:

- The mandatory pipeline ordering: Segmenter → Per-sentence Parser → Graph Builder → Cross-sentence Resolution (§3.1)
- The Relative-Indexing Contract: all arc indices are sentence-relative with no opt-out (§3.4)
- The `_metadata.sentences` array schema including `logicalConnector`, `listMarker`, `parentSentenceIndex`, and `isParenthetical` fields (§4.2)
- The `tagteam:SentenceRelationship` node type with five `relationshipType` values including `"legal-proviso"` and `"legal-exception"` (§4.4)
- The `tagteam:SentenceCluster` node type providing structured `ParsingAct` output (§4.5)
- The JSON-to-RDF Projection defining the deterministic mapping from `_metadata` JSON to the RDF graph that SHACL shapes validate (§4.6)
- The `SentenceSegmenter` module with a configurable lexicon, four boundary rules, and list-marker stripping (§5.1)
- The `TokenReIndexer` module bridging document-relative and sentence-relative positions (§5.2)
- Required changes to `SemanticGraphBuilder.js` for `SentenceCluster` construction (§5.3)
- Six SHACL validation shapes, with `SBA_SentenceRelationshipShape` strengthened by adjacency, uniqueness, and type-consistency constraints (§6)
- The distinction between sentence splitting and intra-sentence coordination decomposition (§7)
- A `precedingModalContext` stub on `VerbPhrase` for future WS-E modal inheritance (§8)

### 1.3 What This Specification Does NOT Define

- Anaphora resolution algorithms (scoped to WS-E)
- Cross-sentence coreference clustering (scoped to WS-E)
- The WS-E Narrative Bridge architecture
- Changes to the RDM Tier 2 ICE/IC assignment logic (unchanged)
- The Fandaws HIRI integration (addressed in Fandaws HIRI Integration Requirements v1.0)

### 1.4 Capabilities Unblocked

| Capability | Enabled by Wave |
|-----------|----------------|
| Multi-sentence ISA inputs without `ccomp` hallucination | Wave 1 |
| Correct `sentenceIndex` on all Tier 1 nodes (`DiscourseReferent` and `VerbPhrase`) | Wave 1 |
| Structured `SentenceCluster` output on `ParsingAct` | Wave 1 |
| Distinct `mentionId` values enabling future anaphora resolution | Wave 2 |
| Regulatory list, conditional, and parenthetical segmentation | Wave 2 |
| `SentenceRelationship` nodes preserving soft-boundary discourse connections | Wave 2 |
| Legal-proviso and legal-exception relationship types for deontic constructions | Wave 2 |
| Coordinated VP decomposition into distinct `VerbPhrase` nodes | Wave 3 |
| `precedingModalContext` pointer stub for WS-E modal inheritance | Wave 3 |

---

## 2. Definitions

| Term | Definition |
|------|-----------|
| **Sentence** | A maximal contiguous token span that constitutes a syntactically complete, independently parseable unit. In regulatory text, includes numbered list items and semicoloned conditionals meeting the criteria in §5.1.3. |
| **Forest** | The ordered set of sentence trees produced by parsing a multi-sentence input. Each tree has exactly one root. No arc in any tree has a head or dependent in a different tree. |
| **Sentence Index** (`sentenceIndex`) | Zero-based integer identifying a sentence's position in the discourse sequence within a single `ParsingAct`. Immutable once assigned by the Segmenter. |
| **Document Token Index** | The token's position in the full, unsplit input string. Used for provenance (`tokenSpan` fields). Always document-relative. |
| **Sentence Token Index** | The token's position within its sentence. Used for dependency arcs. Always sentence-relative. Resets to 0 at each sentence boundary. **This is the only valid mode for arc indices in this specification.** |
| **Relative-Indexing Contract** | The normative requirement that all arc `head` and `dependent` values are sentence-relative. No arc in any `SentenceRecord` may use a document-relative index. See §3.4. |
| **Head Token Index** (`headTokenIndex`) | The sentence-relative token index of the head (governor) token of a mention's token span. For single-token mentions, this is the token's sentence-relative position. For multi-token mentions (e.g., "Centers for Medicare & Medicaid Services"), this is the dependency head of the span — the token that governs the others in the dependency tree. This is the `m` component in `mentionId`. |
| **`mentionId`** | A globally unique identifier for a `DiscourseReferent` within a `ParsingAct`. Format: **`{parsingActId}:s{sentenceIndex}:m{headTokenIndex}`** where `headTokenIndex` is the sentence-relative index of the head token of the mention's token span (see §5.3.3). |
| **`logicalConnector`** | The discourse-level connector that triggered a soft sentence boundary. Values: `null` (hard boundary), `"semicolon"`, `"discourse-marker"`, `"enumeration"`. Recorded on both the `SentenceRecord`s and the `SentenceRelationship` node. |
| **`SentenceRelationship`** | A node linking two adjacent `SentenceRecord`s that were split by a soft boundary. Records the connector type and relationship category. Five valid `relationshipType` values: `"juxtaposition"`, `"elaboration"`, `"contrast"`, `"legal-proviso"`, `"legal-exception"`. See §4.4. |
| **`SentenceCluster`** | A node grouping all Tier 1 output nodes (`DiscourseReferent`, `VerbPhrase`) produced from a single `SentenceRecord`. The forest-structured accessor on `ParsingAct` for multi-sentence inputs. |
| **IBE** | Information Bearing Entity (`inst:Input_Text_IBE_{uuid}`). One IBE is created per `ParsingAct`, regardless of sentence count. |
| **JSON-to-RDF Projection** | The deterministic mapping from `_metadata` JSON to RDF triples, defined in §4.6. SHACL validators MUST implement this projection. |
| **Coordination Decomposition** | Splitting a coordinated VP structure within a single sentence into multiple `VerbPhrase` nodes. Distinct from sentence splitting (§7). |
| **`precedingModalContext`** | An optional pointer from a sentence's `VerbPhrase` to a prior sentence's `DirectiveICE`. Populated by WS-E; null in this spec. |

---

## 3. Architectural Principles

### 3.1 The Segment-First Invariant (Normative)

**The SentenceSegmenter MUST run before the dependency parser receives any input.** This is the central architectural constraint preventing `ccomp` hallucination at the source.

```
Input Text
    │
    ▼
[1] SentenceSegmenter
    │  Produces: SentenceRecords with document-relative tokenSpan
    │            SentenceRelationship nodes for soft boundaries
    │
    ▼
[2] Per-sentence DependencyParser (one invocation per sentence)
    │  Input: single sentence text — never the full document
    │  Produces: sentence-relative arcs (Relative-Indexing Contract, §3.4)
    │
    ▼
[3] TokenReIndexer
    │  Bridges sentence-relative (arcs) and document-relative (provenance)
    │  Populates _metadata.sentences[i] entries
    │
    ▼
[4] SemanticGraphBuilder (per sentence)
    │  Builds Tier 1 nodes, sentenceIndex, mentionIds
    │  Constructs SentenceCluster per sentence (§4.5)
    │
    ▼
[5] CrossSentenceResolver (placeholder for WS-E)
    │  Currently: identity pass
    │  Future: coreference clustering, is_about convergence
    │
    ▼
Forest Graph → JSON-to-RDF Projection (§4.6) → SHACL Validation (six shapes)
```

Any implementation that invokes the dependency parser on the full, unsplit input text MUST be treated as a conformance failure.

### 3.2 The Independence of Occurrents Constraint

Each sentence MUST produce at least one independent subgraph in Tier 1. No `VerbPhrase` from sentence `i` may have a syntactic dependency arc subordinating it to a `VerbPhrase` from sentence `j ≠ i`, unless a lexical conjunction explicitly tagged by the Segmenter as a cross-sentence discourse connector spans the boundary.

This constraint governs syntactic subordination in Tier 1. Tier 2 nodes MAY be shared when coreference is detected.

### 3.3 Provenance Continuity

A single `ParsingAct` produces one IBE node, created before segmentation. All `DiscourseReferent` and `VerbPhrase` nodes across all sentences MUST carry `is_concretized_by` pointing to that IBE. Sentence splitting MUST NOT break this chain.

### 3.4 The Relative-Indexing Contract (Normative)

**All arc `head` and `dependent` values in every `SentenceRecord` MUST be sentence-relative indices, zero-based into that sentence's `tokens` array.** This is a structural guarantee, not a convention.

The dependency parser is invoked per sentence and produces sentence-relative indices inherently. The `TokenReIndexer` records the document-relative offset of each sentence token in `documentOffsets` for provenance but MUST NOT convert arc indices. These two coordinate systems MUST NOT be mixed within a single `SentenceRecord`.

**Diagnostic:** An arc value ≥ `sentences[i].tokens.length` is either a document-relative index (a `TokenReIndexer` bug) or the parser received the full document string (a Segment-First violation). Both produce the same symptom — an out-of-bounds index — and `SBA_ForestStructureShape` catches both with a violation message identifying which invariant failed.

#### 3.4.1 Rejection of the `headType` Enum Anti-Pattern

An earlier review recommended a `headType: "relative" | "global"` field on each arc. **This is rejected.** Allowing "global" as a valid schema value means a validator cannot assume sentence-relative indexing without reading `headType` first. The `headType` field would encode a distinction that should not exist. Sentence-relative indexing is normative with no opt-out. The Relative-Indexing Contract enforced by `SBA_ForestStructureShape` requires no per-arc annotation.

---

## 4. Data Model: Forest Metadata Schema

### 4.1 Breaking Change: `_metadata` Schema

The flat `_metadata` structure with document-level `tokens`, `arcs`, and `root` is **deprecated** as of v1.1. The `sentences` array nesting was introduced in v1.1. v1.2 extended the `SentenceRecord` field set. v1.3 adds `listMarker` and corrects the worked example. Migration instructions are in §11.

### 4.2 `SentenceRecord` Schema (v1.3 Extended)

**Worked example: two sentences from a semicolon-conditional split.**

Input: `"CMS shall provide access; USCIS may request additional records."`

Document-level tokenization (the semicolon IS tokenized but then consumed):
```
0:CMS  1:shall  2:provide  3:access  4:;  5:USCIS  6:may  7:request  8:additional  9:records  10:.
```

```json
{
  "_metadata": {
    "inputText": "CMS shall provide access; USCIS may request additional records.",
    "parsingActId": "pa-uuid-...",
    "ibeIri": "inst:Input_Text_IBE_...",
    "sentences": [
      {
        "sentenceIndex": 0,
        "text": "CMS shall provide access",
        "tokenSpan": [0, 3],
        "tokens": ["CMS", "shall", "provide", "access"],
        "root": 2,
        "arcs": [
          { "dep": "nsubj", "head": 2, "dependent": 0 },
          { "dep": "aux",   "head": 2, "dependent": 1 },
          { "dep": "obj",   "head": 2, "dependent": 3 }
        ],
        "modalMarker": "shall",
        "segmentationType": "semicolon-conditional",
        "logicalConnector": "semicolon",
        "listMarker": null,
        "precedingModalContext": null,
        "isParenthetical": false,
        "parentSentenceIndex": null
      },
      {
        "sentenceIndex": 1,
        "text": "USCIS may request additional records.",
        "tokenSpan": [5, 10],
        "tokens": ["USCIS", "may", "request", "additional", "records", "."],
        "root": 2,
        "arcs": [
          { "dep": "nsubj", "head": 2, "dependent": 0 },
          { "dep": "aux",   "head": 2, "dependent": 1 },
          { "dep": "obj",   "head": 2, "dependent": 4 },
          { "dep": "amod",  "head": 4, "dependent": 3 }
        ],
        "modalMarker": "may",
        "segmentationType": "semicolon-conditional",
        "logicalConnector": "semicolon",
        "listMarker": null,
        "precedingModalContext": null,
        "isParenthetical": false,
        "parentSentenceIndex": null
      }
    ],
    "sentenceRelationships": [
      {
        "id": "inst:SentenceRel_pa-uuid-_0-1",
        "fromSentenceIndex": 0,
        "toSentenceIndex": 1,
        "logicalConnector": "semicolon",
        "relationshipType": "juxtaposition"
      }
    ]
  }
}
```

**Verification of the Relative-Indexing Contract in this example:**

- Sentence 0: `tokens.length = 4`, `tokenSpan = [0,3]`, `4 == 3-0+1` ✓. All arc `head`/`dependent` values are in `[0,3]` ✓.
- Sentence 1: `tokens.length = 6`, `tokenSpan = [5,10]`, `6 == 10-5+1` ✓. All arc `head`/`dependent` values are in `[0,5]` ✓.

The `tokenSpan: [5, 10]` in v1.3 corrects the `[5, 9]` error in v1.2, which violated the spec's own cardinality rule.

**Full `SentenceRecord` field table:**

| Field | Type | Required | Since | Definition |
|-------|------|----------|-------|------------|
| `sentenceIndex` | integer ≥ 0 | REQUIRED | v1.1 | Zero-based discourse position. Immutable. |
| `text` | string | REQUIRED | v1.1 | Raw sentence text. Whitespace-normalized. Does NOT include the list marker when `listMarker` is non-null. |
| `tokenSpan` | [integer, integer] | REQUIRED | v1.1 | `[start, end]` inclusive, **document-relative**. `end - start + 1` MUST equal `tokens.length`. |
| `tokens` | string[] | REQUIRED | v1.1 | This sentence's tokens. Does NOT include the list marker. `length = tokenSpan[1] - tokenSpan[0] + 1`. |
| `root` | integer | REQUIRED | v1.1 | **Sentence-relative** root token index. Valid range: `[0, tokens.length)`. |
| `arcs` | Arc[] | REQUIRED | v1.1 | Dependency arcs. All `head` and `dependent` are **sentence-relative** (Relative-Indexing Contract, §3.4). |
| `modalMarker` | string \| null | REQUIRED | v1.1 | Primary modal verb. Null if absent. |
| `segmentationType` | enum | REQUIRED | v1.1 | Boundary detection rule. Values: `"standard"`, `"numbered-list"`, `"semicolon-conditional"`, `"section-header-inline"`, `"parenthetical"`. |
| `logicalConnector` | enum \| null | REQUIRED | v1.2 | Connector at the split point. Values: `null`, `"semicolon"`, `"discourse-marker"`, `"enumeration"`. MUST be non-null for `"semicolon-conditional"` splits. |
| `listMarker` | string \| null | REQUIRED | **v1.3** | The stripped list marker (`"1."`, `"2."`, `"a."`, etc.) when Rule B-2 fired. Null otherwise. Retained for provenance; absent from `tokens`. |
| `precedingModalContext` | IRI \| null | OPTIONAL | v1.1 | Prior sentence's `DirectiveICE`. Null in Waves 1-2. |
| `isParenthetical` | boolean | REQUIRED | v1.2 | True if extracted from a parenthetical insert. |
| `parentSentenceIndex` | integer \| null | REQUIRED | v1.2 | `sentenceIndex` of the enclosing sentence when `isParenthetical: true`. Null otherwise. |
| `coordinatedVPs` | integer[] | OPTIONAL | v1.1 | VP clause positions from coordination decomposition. See §7. |

**`Arc` object:**

```typescript
interface Arc {
  dep: string;       // Universal Dependencies relation label
  head: number;      // Sentence-relative governor index — NEVER document-relative
  dependent: number; // Sentence-relative dependent index — NEVER document-relative
}
```

### 4.3 Tier 1 Node: Required New Fields

**`DiscourseReferent` additions:**

```json
{
  "tagteam:sentenceIndex": 0,
  "tagteam:mentionId": "pa-uuid-...:s0:m2",
  "tagteam:documentTokenSpan": [0, 0]
}
```

**`VerbPhrase` additions:**

```json
{
  "tagteam:sentenceIndex": 0,
  "tagteam:verbTokenIndex": 2,
  "tagteam:coordinatedVPIndex": null
}
```

`tagteam:sentenceIndex` is REQUIRED on both node types (this has been the case since v1.1 — see revision notes for the misread correction).

### 4.4 `SentenceRelationship` Node Type

A `SentenceRelationship` node is created by the Segmenter for every soft-boundary split. It preserves the discourse connection between the two resulting sentences.

**Schema:**

```json
{
  "@id": "inst:SentenceRel_{parsingActId}_{fromIdx}-{toIdx}",
  "@type": "tagteam:SentenceRelationship",
  "tagteam:fromSentenceIndex": 0,
  "tagteam:toSentenceIndex": 1,
  "tagteam:logicalConnector": "semicolon",
  "tagteam:relationshipType": "juxtaposition",
  "tagteam:parsingActId": "pa-uuid-..."
}
```

**`tagteam:relationshipType`** — five valid values:

| Value | Connector | Trigger Detection | Example |
|-------|-----------|-------------------|---------|
| `"juxtaposition"` | `"semicolon"` | No discourse marker at start of second sentence | `"CMS shall provide; USCIS shall monitor"` |
| `"elaboration"` | `"semicolon"` | Second sentence begins with: `specifically`, `particularly`, `namely`, `that is` | `"CMS shall comply; specifically, it must provide quarterly reports"` |
| `"contrast"` | `"semicolon"` | Second sentence begins with: `however`, `nevertheless`, `notwithstanding`, `conversely` | `"CMS shall provide; however, USCIS may decline"` |
| `"legal-proviso"` | `"semicolon"` | Second sentence begins with: `notwithstanding`, `subject to`, `pursuant to`, `in accordance with` | `"CMS shall provide; notwithstanding any other provision"` |
| `"legal-exception"` | `"semicolon"` | Second sentence begins with: `provided that`, `except that`, `except where`, `unless` | `"CMS shall allow access; provided that the request is in writing"` |
| `"enumeration"` | `"enumeration"` | `logicalConnector === "enumeration"` | Numbered list items |

**Disambiguation between `"contrast"` and `"legal-proviso"`:** The word `notwithstanding` appears in both. When `notwithstanding` appears as the first token of the second sentence in a semicolon-split, the `relationshipType` MUST be `"legal-proviso"`, not `"contrast"`. `notwithstanding` carries deontic override force in federal regulatory text that is distinct from general adversative discourse. `"contrast"` is reserved for `however`, `nevertheless`, and `conversely`.

**`detectRelationshipType()` algorithm (normative):**

```javascript
const LEGAL_PROVISO_MARKERS   = ['notwithstanding', 'subject to', 'pursuant to',
                                  'in accordance with'];
const LEGAL_EXCEPTION_MARKERS = ['provided that', 'except that', 'except where', 'unless'];
const CONTRAST_MARKERS        = ['however', 'nevertheless', 'conversely'];
const ELABORATION_MARKERS     = ['specifically', 'particularly', 'namely', 'that is'];

function detectRelationshipType(connector, toSentenceTokens) {
  if (connector === 'enumeration') return 'enumeration';

  // Check first token and first two-token phrase against all marker lists.
  // Two-token phrases take priority over single tokens to handle "provided that",
  // "subject to", etc. correctly.
  const first  = toSentenceTokens[0]?.toLowerCase() ?? '';
  const phrase = `${first} ${toSentenceTokens[1]?.toLowerCase() ?? ''}`.trim();

  if (LEGAL_EXCEPTION_MARKERS.includes(phrase) ||
      LEGAL_EXCEPTION_MARKERS.includes(first))   return 'legal-exception';
  if (LEGAL_PROVISO_MARKERS.includes(phrase) ||
      LEGAL_PROVISO_MARKERS.includes(first))     return 'legal-proviso';
  if (CONTRAST_MARKERS.includes(first))          return 'contrast';
  if (ELABORATION_MARKERS.includes(first))       return 'elaboration';

  return 'juxtaposition';  // default for bare semicolons
}
```

`sentenceRelationships` MUST be an array on every `_metadata` object (may be empty). Hard boundary splits produce no entries.

### 4.5 `SentenceCluster` Node Type

A `SentenceCluster` groups all Tier 1 output nodes produced from a single `SentenceRecord`.

**Schema:**

```json
{
  "@id": "inst:SentenceCluster_{parsingActId}_s{sentenceIndex}",
  "@type": "tagteam:SentenceCluster",
  "tagteam:sentenceIndex": 0,
  "tagteam:hasDiscourseReferent": ["inst:DR_...", "inst:DR_..."],
  "tagteam:hasVerbPhrase": ["inst:VP_..."],
  "tagteam:ibeIri": "inst:Input_Text_IBE_...",
  "tagteam:segmentationType": "standard",
  "tagteam:logicalConnector": null
}
```

**`ParsingAct` additions:**

```json
{
  "tagteam:has_sentence_cluster": ["inst:SentenceCluster_..._s0", "inst:SentenceCluster_..._s1"],
  "tagteam:hasSentenceRelationship": ["inst:SentenceRel_..._0-1"],
  "tagteam:has_output": ["..."]
}
```

`tagteam:has_output` is retained for backward compatibility. `tagteam:has_sentence_cluster` is the normative forest accessor for multi-sentence `ParsingAct`s.

### 4.6 JSON-to-RDF Projection (New in v1.3)

The six SHACL validation shapes query an RDF graph. The `_metadata` schema is JSON. This section defines the **deterministic projection** from `_metadata` JSON to the RDF triples the shapes operate on. All SHACL validators for this specification MUST implement this projection before executing any SBA shape. A validator that operates directly on JSON without projecting to RDF MUST be treated as non-conformant.

#### 4.6.1 IRI Construction

| Source | IRI pattern |
|--------|-------------|
| ParsingAct | Existing `ParsingAct` IRI from the graph |
| `_metadata` object | `<{ibeIri}/forest-metadata>` |
| `sentences[i]` | `<{ibeIri}/sent/{i}>` |
| `sentences[i].arcs[j]` | `<{ibeIri}/sent/{i}/arc/{j}>` |
| `sentenceRelationships[k]` | `<{ibeIri}/rel/{fromSentenceIndex}-{toSentenceIndex}>` |

Where `ibeIri` is the value of `_metadata.ibeIri`.

#### 4.6.2 Triples Produced per `_metadata` Object

```turtle
<parsingActIri>  tagteam:hasMetadata  <{ibeIri}/forest-metadata> .
<{ibeIri}/forest-metadata>  a  tagteam:ForestMetadata .
```

#### 4.6.3 Triples Produced per `sentences[i]`

```turtle
<{ibeIri}/forest-metadata>  tagteam:hasSentence  <{ibeIri}/sent/{i}> .

<{ibeIri}/sent/{i}>
    a                        tagteam:SentenceRecord ;
    tagteam:sentenceIndex    {i}                              ;  # integer
    tagteam:tokenCount       {sentences[i].tokens.length}    ;  # derived — not in JSON
    tagteam:tokenSpanStart   {sentences[i].tokenSpan[0]}     ;  # integer
    tagteam:tokenSpanEnd     {sentences[i].tokenSpan[1]}     ;  # integer
    tagteam:firstToken       "{sentences[i].tokens[0]}"      ;  # string; used by §6.5
    tagteam:segmentationType "{sentences[i].segmentationType}" .

# logicalConnector: emit only when non-null
# (SPARQL FILTER NOT EXISTS handles absence correctly for OPTIONAL matching)
<{ibeIri}/sent/{i}>  tagteam:logicalConnector  "{sentences[i].logicalConnector}" .
# (omit triple when logicalConnector is null)
```

**Derived property `tagteam:tokenCount`:** This value is NOT stored in the JSON. The projection MUST compute it as `sentences[i].tokens.length` and assert it as an RDF triple. This is the authoritative denominator used by `SBA_ForestStructureShape` for bounds checking.

#### 4.6.4 Triples Produced per `sentences[i].arcs[j]`

```turtle
<{ibeIri}/sent/{i}>  tagteam:hasArc  <{ibeIri}/sent/{i}/arc/{j}> .

<{ibeIri}/sent/{i}/arc/{j}>
    a                  tagteam:Arc  ;
    tagteam:dep        "{arcs[j].dep}"       ;  # string
    tagteam:head       {arcs[j].head}        ;  # integer
    tagteam:dependent  {arcs[j].dependent}   .  # integer
```

#### 4.6.5 Triples Produced per `sentenceRelationships[k]`

```turtle
<parsingActIri>  tagteam:hasSentenceRelationship
    <{ibeIri}/rel/{rel.fromSentenceIndex}-{rel.toSentenceIndex}> .

<{ibeIri}/rel/{rel.fromSentenceIndex}-{rel.toSentenceIndex}>
    a                          tagteam:SentenceRelationship ;
    tagteam:fromSentenceIndex  {rel.fromSentenceIndex}      ;  # integer
    tagteam:toSentenceIndex    {rel.toSentenceIndex}        ;  # integer
    tagteam:logicalConnector   "{rel.logicalConnector}"     ;  # string
    tagteam:relationshipType   "{rel.relationshipType}"     .  # string
```

#### 4.6.6 Projection Consistency Constraints

The projection MUST satisfy these constraints. Any projection that violates them is non-conformant regardless of whether the SHACL shapes detect the violation:

1. `tagteam:tokenCount` for `sentences[i]` MUST equal `sentences[i].tokenSpan[1] - sentences[i].tokenSpan[0] + 1`. If the JSON is internally inconsistent, the projection MUST throw `TokenSpanCardinalityError` rather than silently emitting an incorrect `tagteam:tokenCount`.
2. Every `tagteam:head` and `tagteam:dependent` integer value on an arc MUST be asserted as an `xsd:integer`, not a string or float.
3. `tagteam:fromSentenceIndex` and `tagteam:toSentenceIndex` on `SentenceRelationship` nodes MUST be asserted as `xsd:integer`.

---

## 5. Module Specifications

### 5.1 SentenceSegmenter

**Location:** `src/nlp/SentenceSegmenter.js`

```typescript
interface SegmenterOutput {
  sentences: SentenceRecord[];
  sentenceRelationships: SentenceRelationshipRecord[];
  abbreviationsMatched: string[];
  totalTokens: number;
}

function segment(
  inputText: string,
  vocabulary: VocabularyLookup,
  options?: SegmenterOptions
): SegmenterOutput
```

#### 5.1.1 Tokenization

Tokenization MUST precede boundary detection. Token boundaries follow spaCy-compatible whitespace and punctuation rules with these overrides for regulatory text:

- Hyphenated compound terms (e.g., `data-sharing`) are single tokens
- Slash-separated alternatives (e.g., `CMS/DHS`) are single tokens
- Numbered list markers (`1.`, `2.`, `a.`, `b.`) are single tokens, NOT sentence-initial periods

#### 5.1.2 Abbreviation Lexicon (Q1 Decision)

The segmenter MUST load its abbreviation lexicon from **`src/nlp/abbreviation-lexicon.json`** at initialization. This file ships in the dist bundle, satisfying the edge-canonical constraint that no runtime network access is required.

**Lexicon file format:**

```json
{
  "standard": [
    "U.S.", "U.S.C.", "Sec.", "No.", "Vol.", "Art.", "Fig.",
    "et al.", "i.e.", "e.g.", "vs.", "approx.", "Dept.", "Div.",
    "Est.", "Gov.", "Jr.", "Sr.", "Inc.", "Corp.", "etc."
  ],
  "agency": [],
  "custom": []
}
```

The three arrays are merged into a single runtime `Set<string>`. The `agency` array is populated from `skos:altLabel` values in the Fandaws HIRI `us-government` domain TTL when F-0 delivers. Until then it is empty. The `custom` array is reserved for corpus-specific overrides added during testing; entries there persist across releases. Implementations MUST merge all three arrays without deduplication errors.

All acronyms in the `agency` array are treated as boundary-safe regardless of trailing period.

#### 5.1.3 Boundary Detection Rules

Rules are evaluated in priority order. The first matching rule determines the boundary type.

**Rule B-1: Standard sentence boundary**
- `tokens[p]` is `.`, `!`, or `?`
- `tokens[p-1]` is NOT in the abbreviation lexicon
- `tokens[p+1]` exists and begins with an uppercase character
- The token span preceding `p` contains at least one finite verb
- `segmentationType: "standard"` | `logicalConnector: null`

**Rule B-2: Numbered list item (with list-marker stripping — Q3 Decision)**

When Rule B-2 fires, the list marker MUST be stripped from the sentence before it is passed to the dependency parser. The original marker string is stored in `listMarker` for provenance. The `tokenSpan` and `tokens` array reflect the post-strip sentence; the `tokenSpan[0]` for the first item starts at the token after the marker.

- `tokens[p]` matches `\d+\.` or `[a-z]\.`
- Preceding token is NOT a list marker
- Token appears at start of a line or following a newline in the original input
- **Strip action:** Remove the list marker token from `tokens`; store it in `listMarker`; adjust `tokenSpan[0]` to reflect the post-strip start
- `segmentationType: "numbered-list"` | `logicalConnector: "enumeration"`

**Why Option A (strip) over Option B (pass as `punct`):** A list marker like `"1."` has no semantic role in the obligation — it is discourse metadata indicating position in an enumeration. Passing it to the parser as a `punct` dependent creates a spurious arc from the marker to the sentence root that downstream graph-building logic must special-case. Stripping before parsing produces a clean tree and a clean graph. The original marker is preserved in `listMarker` for provenance and for future discourse-level analysis.

**Rule B-3: Semicolon conditional (soft boundary)**
- `tokens[p]` is `;`
- Both spans (before and after `p`) contain a modal verb
- Both spans contain an independent syntactic subject (a `PROPN` or `NOUN` adjacent to a modal)
- Both spans MUST have an independent subject — a clause beginning with a continuation fragment (e.g., `"including historical records"`) has no independent subject and MUST NOT trigger Rule B-3
- The semicolon token is consumed; it appears in neither resulting `tokens` array
- A `SentenceRelationship` record MUST be produced
- `segmentationType: "semicolon-conditional"` | `logicalConnector: "semicolon"`

**Rule B-4: Section header with inline obligation**
- `tokens[p]` is `.`
- Preceding span is a capitalized noun phrase with no finite verb
- `tokens[p+1]` begins a new obligation (proper noun + modal within 5 tokens)
- Section header is split off as `"section-header-inline"` — produces no Tier 1 nodes
- `segmentationType: "section-header-inline"` | `logicalConnector: null`

#### 5.1.4 Parenthetical Handling

Parenthetical content meeting all three criteria MUST be extracted as a child `SentenceRecord` (Wave 2 deliverable):
1. Contains at least one finite verb
2. Contains at least one modal verb
3. Is longer than 5 tokens

Extracted parenthetical: `isParenthetical: true`, `parentSentenceIndex` set to enclosing sentence's index, `segmentationType: "parenthetical"`, `logicalConnector: null`. The enclosing sentence's `tokens` retains `["(", "...", ")"]` placeholder sentinel.

Wave 1: all records MUST have `isParenthetical: false`, `parentSentenceIndex: null`.

#### 5.1.5 Edge Cases

- **Zero sentences:** Entire input treated as `sentences[0]`.
- **Empty after split:** Zero-token spans discarded.
- **Consecutive boundary markers:** Each resolved independently.
- **No maximum sentence count.**

### 5.2 TokenReIndexer

**Location:** `src/nlp/TokenReIndexer.js`

```typescript
interface ReIndexedSentence {
  sentenceRecord: SentenceRecord;
  documentOffsets: number[];  // documentOffsets[i] = document token index for sentence token i
}

function reIndex(
  parserOutput: RawParserOutput,
  sentenceSpan: [number, number],
  documentTokens: string[]
): ReIndexedSentence
```

The `TokenReIndexer` MUST NOT convert arc indices to document-relative form. `documentOffsets[i]` is used by `SemanticGraphBuilder` to compute `tagteam:documentTokenSpan` on `DiscourseReferent` nodes without altering the arc indices.

**Invariant:** `documentOffsets.length === sentenceRecord.tokens.length`. Mismatch → `TokenizationMismatchError`.

**Projection note:** The `TokenReIndexer` is responsible for emitting the `tokenSpan` pair that appears in `SentenceRecord`. It MUST verify that `sentenceSpan[1] - sentenceSpan[0] + 1 === parserOutput.tokens.length` before writing the record. Mismatch → `TokenSpanCardinalityError` (same error as in §4.6.6 — same underlying invariant).

### 5.3 SemanticGraphBuilder Changes

**Location:** `src/graph/SemanticGraphBuilder.js`

#### 5.3.1 Forest Dispatch

```typescript
function buildForestGraph(
  sentences: SentenceRecord[],
  sentenceRelationships: SentenceRelationshipRecord[],
  parsingActId: string,
  ibeIri: string,
  options: BuildOptions
): ForestGraphResult {
  const clusters: SentenceCluster[] = [];
  const allTierTwoNodes: Node[] = [];

  for (const sentence of sentences) {
    if (sentence.segmentationType === 'section-header-inline') continue;

    const sentenceGraph = buildSentenceGraph(sentence, parsingActId, ibeIri, options);
    const cluster = buildSentenceCluster(sentence, sentenceGraph, parsingActId, ibeIri);
    clusters.push(cluster);
    allTierTwoNodes.push(...sentenceGraph.tierTwo);
  }

  const relationshipNodes = sentenceRelationships.map(rel =>
    buildSentenceRelationshipNode(rel, parsingActId)
  );

  return { clusters, relationshipNodes, allTierTwoNodes, parsingActId, ibeIri };
}
```

#### 5.3.2 `SentenceCluster` Construction

```typescript
function buildSentenceCluster(
  sentence: SentenceRecord,
  sentenceGraph: SentenceGraphResult,
  parsingActId: string,
  ibeIri: string
): SentenceCluster {
  return {
    id: `inst:SentenceCluster_${parsingActId}_s${sentence.sentenceIndex}`,
    type: 'tagteam:SentenceCluster',
    sentenceIndex: sentence.sentenceIndex,
    hasDiscourseReferent: sentenceGraph.tierOne
      .filter(n => n.type === 'tagteam:DiscourseReferent').map(n => n.id),
    hasVerbPhrase: sentenceGraph.tierOne
      .filter(n => n.type === 'tagteam:VerbPhrase').map(n => n.id),
    ibeIri,
    segmentationType: sentence.segmentationType,
    logicalConnector: sentence.logicalConnector ?? null
  };
}
```

#### 5.3.3 `mentionId` Generation (v1.3 Unified)

For each `DiscourseReferent` created from `sentences[i]`, `headTokenIndex` is the sentence-relative index of the head token of the mention's span:

```javascript
// For a single-token mention at sentence-relative position j:
const headTokenIndex = j;

// For a multi-token mention spanning sentence-relative positions [spanStart, spanEnd]:
// headTokenIndex is the index of the dependency head of the span.
// The dependency head is the token within [spanStart, spanEnd] that is NOT the
// dependent of any other token within the same span — i.e., the token whose
// 'head' arc points outside the span (or to a token outside the span).
const headTokenIndex = findSpanHead(spanStart, spanEnd, sentence.arcs);

const mentionId = `${parsingActId}:s${i}:m${headTokenIndex}`;
```

This is the unified definition of `mentionId`. The `m` component is ALWAYS the sentence-relative head token index, not the ordinal position of the mention within the sentence. The format `{parsingActId}:s{sentenceIndex}:m{headTokenIndex}` MUST be used in all three locations — the §2 Definitions, this code, and AC-SBA-6 — and they now agree.

#### 5.3.4 IBE Provenance Assignment

Every `DiscourseReferent` and `VerbPhrase` node carries `tagteam:is_concretized_by: <ibeIri>`. Every `SentenceCluster` carries `tagteam:ibeIri: <ibeIri>`. The IBE is created once, before `buildForestGraph` is called.

---

## 6. SHACL Validation Shapes

Six shapes total. `SBA_SentenceRelationshipShape` is substantially strengthened in v1.3 with three new SPARQL constraint blocks. All shapes are added to the existing SHACL Validation Specification (v1.3.1).

**SHACL prerequisite:** All six shapes MUST be executed after the JSON-to-RDF Projection (§4.6) has run. The properties queried in these shapes (`tagteam:hasSentence`, `tagteam:tokenCount`, `tagteam:hasArc`, `tagteam:tokenSpanStart`, `tagteam:tokenSpanEnd`, `tagteam:firstToken`) are produced by the projection and do not exist in the raw JSON or the pre-projection RDF graph.

### 6.1 SBA_ForestStructureShape

**Target:** Every `ParsingAct`  
**Purpose:** Enforces the Relative-Indexing Contract  
**Severity:** Violation

```turtle
tagteam:SBA_ForestStructureShape
  a sh:NodeShape ;
  sh:targetClass tagteam:ParsingAct ;
  sh:sparql [
    sh:message """ForestStructureViolation (Relative-Indexing Contract): arc {$arc} in sentence
      {$sentIdx} has {$field} = {$idx}, which is out of range for a sentence with {$tokenCount}
      tokens. Arc indices MUST be sentence-relative (0-based into the sentence token array).
      A value >= tokenCount indicates either (a) the parser received the full document string
      instead of a single sentence [Segment-First Invariant violation, §3.1], or (b) the
      TokenReIndexer converted sentence-relative indices to document-relative form
      [Relative-Indexing Contract violation, §3.4].""" ;
    sh:severity sh:Violation ;
    sh:select """
      SELECT $this ?arc ?sentIdx ?field ?idx ?tokenCount
      WHERE {
        $this tagteam:hasMetadata ?meta .
        ?meta tagteam:hasSentence ?sent .
        ?sent tagteam:sentenceIndex ?sentIdx ;
              tagteam:tokenCount ?tokenCount ;
              tagteam:hasArc ?arc .
        {
          BIND("head" AS ?field)
          ?arc tagteam:head ?idx .
          FILTER(?idx >= ?tokenCount || ?idx < 0)
        } UNION {
          BIND("dependent" AS ?field)
          ?arc tagteam:dependent ?idx .
          FILTER(?idx >= ?tokenCount || ?idx < 0)
        }
      }
    """ ;
  ] .
```

### 6.2 SBA_SentenceIndexShape

**Target:** Every `DiscourseReferent` and `VerbPhrase`  
**Purpose:** Enforces `tagteam:sentenceIndex` on all Tier 1 nodes  
**Severity:** Violation

```turtle
tagteam:SBA_SentenceIndexShape
  a sh:NodeShape ;
  sh:or (
    [ sh:targetClass tagteam:DiscourseReferent ]
    [ sh:targetClass tagteam:VerbPhrase ]
  ) ;
  sh:property [
    sh:path tagteam:sentenceIndex ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 0 ;
    sh:message "SentenceIndexViolation: DiscourseReferent or VerbPhrase missing required tagteam:sentenceIndex. Required on both node types since v1.1." ;
    sh:severity sh:Violation ;
  ] .
```

### 6.3 SBA_MentionPartitionShape

**Target:** Every `ParsingAct` with two or more `has_output` mentions  
**Purpose:** Enforces that no `DiscourseReferent`'s `documentTokenSpan` crosses a sentence boundary  
**Severity:** Violation

```turtle
tagteam:SBA_MentionPartitionShape
  a sh:NodeShape ;
  sh:targetClass tagteam:ParsingAct ;
  sh:sparql [
    sh:message "MentionPartitionViolation: DiscourseReferent {$mention} has documentTokenSpan [{$spanStart}, {$spanEnd}] that crosses sentence boundary between sentence {$sentA} (ending at token {$boundaryA}) and sentence {$sentB} (starting at token {$boundaryB})." ;
    sh:severity sh:Violation ;
    sh:select """
      SELECT $this ?mention ?spanStart ?spanEnd ?sentA ?boundaryA ?sentB ?boundaryB
      WHERE {
        $this tagteam:has_output ?mention .
        ?mention a tagteam:DiscourseReferent ;
                 tagteam:documentTokenSpan ?span ;
                 tagteam:sentenceIndex ?sentA .
        BIND(strbefore(str(?span), ",") AS ?spanStart)
        BIND(strafter(str(?span), ",")  AS ?spanEnd)
        $this tagteam:hasMetadata ?meta .
        ?meta tagteam:hasSentence ?sentNodeA .
        ?sentNodeA tagteam:sentenceIndex ?sentA ;
                   tagteam:tokenSpanEnd ?boundaryA .
        ?meta tagteam:hasSentence ?sentNodeB .
        ?sentNodeB tagteam:sentenceIndex ?sentB ;
                   tagteam:tokenSpanStart ?boundaryB .
        FILTER(?sentB = ?sentA + 1)
        FILTER(xsd:integer(?spanEnd) >= ?boundaryB)
      }
    """ ;
  ] .
```

### 6.4 SBA_IBEProvenanceShape

**Target:** Every `ParsingAct` with two or more `has_output` nodes  
**Purpose:** Enforces that all Tier 1 nodes from a single `ParsingAct` share the same IBE IRI  
**Severity:** Violation

```turtle
tagteam:SBA_IBEProvenanceShape
  a sh:NodeShape ;
  sh:targetClass tagteam:ParsingAct ;
  sh:sparql [
    sh:message "IBEProvenanceViolation: ParsingAct {$this} has output node {$node} pointing to IBE {$ibeB}, but the ParsingAct canonical IBE is {$ibeA}. All Tier 1 nodes must share the same is_concretized_by target." ;
    sh:severity sh:Violation ;
    sh:select """
      SELECT DISTINCT $this ?node ?ibeA ?ibeB
      WHERE {
        $this tagteam:has_output ?anchorNode ;
              tagteam:has_output ?node .
        ?anchorNode tagteam:is_concretized_by ?ibeA .
        ?node tagteam:is_concretized_by ?ibeB .
        FILTER(?ibeA != ?ibeB)
        FILTER(?node != ?anchorNode)
      }
    """ ;
  ] .
```

### 6.5 SBA_SentenceRelationshipShape (v1.3 Strengthened)

**Target:** Every `ParsingAct`  
**Purpose:** Enforces existence, adjacency, uniqueness, and type-consistency of `SentenceRelationship` nodes  
**Severity:** Violation  
**Change in v1.3:** Three new SPARQL blocks added for adjacency, uniqueness, and type-consistency.

```turtle
tagteam:SBA_SentenceRelationshipShape
  a sh:NodeShape ;
  sh:targetClass tagteam:ParsingAct ;

  sh:sparql [
    sh:message """SentenceRelationshipViolation (missing): sentence {$sentIdx} has
      segmentationType 'semicolon-conditional' or 'enumeration' but no SentenceRelationship
      node links it to an adjacent sentence. Every soft-boundary split MUST produce a
      SentenceRelationship record (§4.4).""" ;
    sh:severity sh:Violation ;
    sh:select """
      SELECT $this ?sentIdx
      WHERE {
        $this tagteam:hasMetadata ?meta .
        ?meta tagteam:hasSentence ?sent .
        ?sent tagteam:sentenceIndex ?sentIdx ;
              tagteam:segmentationType ?stype .
        FILTER(?stype IN ("semicolon-conditional", "enumeration"))
        FILTER NOT EXISTS {
          $this tagteam:hasSentenceRelationship ?rel .
          { ?rel tagteam:fromSentenceIndex ?sentIdx . }
          UNION
          { ?rel tagteam:toSentenceIndex ?sentIdx . }
        }
      }
    """ ;
  ] ;

  sh:sparql [
    sh:message """OrphanRelationshipViolation: SentenceRelationship {$rel} references
      sentenceIndex {$sentIdx} which does not exist in _metadata.sentences.""" ;
    sh:severity sh:Violation ;
    sh:select """
      SELECT $this ?rel ?sentIdx
      WHERE {
        $this tagteam:hasSentenceRelationship ?rel .
        { ?rel tagteam:fromSentenceIndex ?sentIdx . }
        UNION
        { ?rel tagteam:toSentenceIndex ?sentIdx . }
        FILTER NOT EXISTS {
          $this tagteam:hasMetadata ?meta .
          ?meta tagteam:hasSentence ?sent .
          ?sent tagteam:sentenceIndex ?sentIdx .
        }
      }
    """ ;
  ] ;

  sh:sparql [
    sh:message """RelationshipAdjacencyViolation: SentenceRelationship {$rel} links
      sentences {$fromIdx} and {$toIdx}, but toSentenceIndex ({$toIdx}) must equal
      fromSentenceIndex + 1 ({$expected}). SentenceRelationships may only link
      immediately adjacent sentences.""" ;
    sh:severity sh:Violation ;
    sh:select """
      SELECT $this ?rel ?fromIdx ?toIdx ?expected
      WHERE {
        $this tagteam:hasSentenceRelationship ?rel .
        ?rel tagteam:fromSentenceIndex ?fromIdx ;
             tagteam:toSentenceIndex   ?toIdx .
        BIND(?fromIdx + 1 AS ?expected)
        FILTER(?toIdx != ?expected)
      }
    """ ;
  ] ;

  sh:sparql [
    sh:message """RelationshipDuplicateViolation: ParsingAct {$this} has two
      SentenceRelationship nodes ({$rel1} and {$rel2}) both linking sentences
      {$fromIdx} → {$toIdx}. At most one relationship is permitted per
      adjacent sentence pair.""" ;
    sh:severity sh:Violation ;
    sh:select """
      SELECT $this ?rel1 ?rel2 ?fromIdx ?toIdx
      WHERE {
        $this tagteam:hasSentenceRelationship ?rel1 ;
              tagteam:hasSentenceRelationship ?rel2 .
        ?rel1 tagteam:fromSentenceIndex ?fromIdx ;
              tagteam:toSentenceIndex   ?toIdx .
        ?rel2 tagteam:fromSentenceIndex ?fromIdx ;
              tagteam:toSentenceIndex   ?toIdx .
        FILTER(?rel1 != ?rel2)
        FILTER(str(?rel1) < str(?rel2))
      }
    """ ;
  ] ;

  sh:sparql [
    sh:message """RelationshipTypeConsistencyViolation: SentenceRelationship {$rel}
      has logicalConnector '{$connector}' but relationshipType '{$relType}' is
      inconsistent with that connector. Enumeration connector requires
      relationshipType 'enumeration'. Semicolon connector requires one of:
      juxtaposition, elaboration, contrast, legal-proviso, legal-exception.""" ;
    sh:severity sh:Violation ;
    sh:select """
      SELECT $this ?rel ?connector ?relType
      WHERE {
        $this tagteam:hasSentenceRelationship ?rel .
        ?rel tagteam:logicalConnector ?connector ;
             tagteam:relationshipType ?relType .
        FILTER(
          (?connector = "enumeration" && ?relType != "enumeration")
          ||
          (?connector = "semicolon"   && ?relType = "enumeration")
          ||
          (?connector = "semicolon"   && ?relType NOT IN (
            "juxtaposition", "elaboration", "contrast",
            "legal-proviso", "legal-exception"
          ))
        )
      }
    """ ;
  ] .
```

**Summary of the five constraint blocks:**
1. **Missing** — semicolon-conditional or enumeration sentence has no relationship node
2. **Orphan** — relationship references a non-existent `sentenceIndex`
3. **Adjacency** — `toSentenceIndex ≠ fromSentenceIndex + 1`
4. **Duplicate** — two relationship nodes for the same `(from, to)` pair
5. **Type-consistency** — `relationshipType` is incompatible with `logicalConnector`

### 6.6 SBA_SentenceClusterShape

**Target:** Every `ParsingAct`  
**Purpose:** Enforces structural consistency between `has_sentence_cluster` and the nodes produced  
**Severity:** Violation

```turtle
tagteam:SBA_SentenceClusterShape
  a sh:NodeShape ;
  sh:targetClass tagteam:ParsingAct ;
  sh:sparql [
    sh:message """SentenceClusterViolation: node {$node} has sentenceIndex {$sentIdx}
      but belongs to SentenceCluster {$cluster} with sentenceIndex {$clusterIdx}.
      Every Tier 1 node must belong to the cluster whose sentenceIndex matches
      its own sentenceIndex.""" ;
    sh:severity sh:Violation ;
    sh:select """
      SELECT $this ?node ?sentIdx ?cluster ?clusterIdx
      WHERE {
        $this tagteam:has_sentence_cluster ?cluster .
        ?cluster tagteam:sentenceIndex ?clusterIdx .
        {
          ?cluster tagteam:hasDiscourseReferent ?node .
          ?node tagteam:sentenceIndex ?sentIdx .
        } UNION {
          ?cluster tagteam:hasVerbPhrase ?node .
          ?node tagteam:sentenceIndex ?sentIdx .
        }
        FILTER(?sentIdx != ?clusterIdx)
      }
    """ ;
  ] ;
  sh:sparql [
    sh:message """MissingClusterViolation: node {$node} (sentenceIndex {$sentIdx}) is in
      has_output but is not listed in any SentenceCluster. Every Tier 1 node from a
      non-header sentence MUST appear in the corresponding SentenceCluster.""" ;
    sh:severity sh:Violation ;
    sh:select """
      SELECT $this ?node ?sentIdx
      WHERE {
        $this tagteam:has_output ?node .
        ?node tagteam:sentenceIndex ?sentIdx .
        FILTER NOT EXISTS {
          $this tagteam:has_sentence_cluster ?cluster .
          ?cluster tagteam:sentenceIndex ?sentIdx .
          { ?cluster tagteam:hasDiscourseReferent ?node . }
          UNION
          { ?cluster tagteam:hasVerbPhrase ?node . }
        }
      }
    """ ;
  ] .
```

---

## 7. Coordination Decomposition

*(Unchanged from v1.2)*

Sentence splitting operates on the document before parsing and produces multiple `SentenceRecord` entries. Coordination decomposition operates on the parse tree of a single sentence and produces multiple `VerbPhrase` nodes from a coordinated VP structure. These are distinct processes.

Decomposition fires when: (a) conjunction is `and`, `or`, or `but`; (b) both conjuncts are VP nodes; (c) both share the same `nsubj`; (d) both contain a modal verb. It MUST NOT fire on object-clause coordination or when conjuncts have different subjects.

Decomposed `VerbPhrase` nodes carry `tagteam:coordinatedVPIndex` (0-based) and the same `tagteam:sentenceIndex`. Both nodes appear in the same `SentenceCluster`.

---

## 8. Modal Scope Inheritance Stub

*(Unchanged from v1.2)*

`precedingModalContext` is null in all Wave 1-2 outputs. It is reserved for WS-E. The field is present in the schema and serialized even when null.

---

## 9. Acceptance Criteria

### AC-SBA-1: Segment-First Invariant

- [ ] `DependencyParser` receives single-sentence text only; never the full document
- [ ] A two-sentence input produces `_metadata.sentences.length === 2`
- [ ] No arc in `sentences[0]` has a value valid only in `sentences[1]`'s token range
- [ ] Test input `"CMS shall allow USCIS to monitor records. USCIS shall report quarterly."` produces no `ccomp` arc between the two root verbs

### AC-SBA-2: Forest Metadata Schema

- [ ] Single-sentence fixtures produce `_metadata.sentences.length === 1` with `sentenceIndex: 0`
- [ ] Deprecated flat `_metadata.root` and `_metadata.arcs` are absent from all new outputs
- [ ] `sentences[i].tokens.length === sentences[i].tokenSpan[1] - sentences[i].tokenSpan[0] + 1` for all `i`
- [ ] `_metadata.sentenceRelationships` is present on all outputs (may be empty array)
- [ ] `_metadata.sentences[1].tokenSpan` in the semicolon-split worked example is `[5, 10]` (not `[5, 9]`)

### AC-SBA-3: JSON-to-RDF Projection

- [ ] The projection produces a `tagteam:ForestMetadata` node linked to the `ParsingAct` via `tagteam:hasMetadata`
- [ ] For each `sentences[i]`, a `tagteam:SentenceRecord` node is produced with `tagteam:tokenCount`, `tagteam:tokenSpanStart`, `tagteam:tokenSpanEnd`, and `tagteam:firstToken` triples
- [ ] `tagteam:tokenCount` equals `sentences[i].tokens.length`, not `tokenSpan[1] - tokenSpan[0]` (these differ when the list marker is stripped — `tokenCount` is always the actual token array length)
- [ ] For each `sentences[i].arcs[j]`, a `tagteam:Arc` node is produced with `tagteam:head` and `tagteam:dependent` as `xsd:integer` literals
- [ ] `tagteam:logicalConnector` triple is absent for `sentences[i]` where `logicalConnector` is null
- [ ] `TokenSpanCardinalityError` is thrown when `tokenSpan[1] - tokenSpan[0] + 1 ≠ tokens.length` in source JSON
- [ ] SHACL shapes produce the same results regardless of whether they are executed before or after the first sentence-level Tier 1 nodes are added to the graph (projection is idempotent)

### AC-SBA-4: Segmenter — Standard Boundaries

- [ ] `"CMS shall allow USCIS to monitor all records. USCIS shall report quarterly."` → `sentences.length === 2`; both have `logicalConnector: null`
- [ ] `"U.S. regulations require CMS to comply."` → `sentences.length === 1`
- [ ] `"CMS shall provide access to all records; including historical records."` → `sentences.length === 1` (second clause lacks independent subject — Rule B-3 MUST NOT fire)

### AC-SBA-5: Segmenter — Regulatory Text and Soft Boundaries

- [ ] Numbered list input → sentence count equals item count; each record has `segmentationType: "numbered-list"`, `logicalConnector: "enumeration"`, non-null `listMarker`, and `tokens` does NOT contain the marker
- [ ] `"CMS shall provide access; USCIS may request additional records."` → `sentences.length === 2`; both have `segmentationType: "semicolon-conditional"`, `logicalConnector: "semicolon"`; semicolon absent from both `tokens` arrays; `sentenceRelationships.length === 1` with `fromSentenceIndex: 0`, `toSentenceIndex: 1`
- [ ] `"CMS shall provide; however, USCIS may decline."` → `sentenceRelationships[0].relationshipType === "contrast"`
- [ ] `"CMS shall allow access; provided that the request is in writing."` → `sentenceRelationships[0].relationshipType === "legal-exception"`
- [ ] `"CMS shall provide; notwithstanding any other provision, USCIS may restrict."` → `sentenceRelationships[0].relationshipType === "legal-proviso"` (NOT `"contrast"`)
- [ ] Section header input → first record has `segmentationType: "section-header-inline"` and produces no Tier 1 nodes
- [ ] Abbreviation lexicon loaded from `src/nlp/abbreviation-lexicon.json`; `U.S.` does not trigger boundary; `CMS` (from `agency` array when populated) does not trigger boundary

### AC-SBA-6: `sentenceIndex` on All Tier 1 Nodes

- [ ] Every `DiscourseReferent` carries `tagteam:sentenceIndex` as a non-negative integer
- [ ] Every `VerbPhrase` carries `tagteam:sentenceIndex` as a non-negative integer
- [ ] Nodes from sentence 0 carry `sentenceIndex: 0`; nodes from sentence 1 carry `sentenceIndex: 1`
- [ ] `sentenceIndex` is not modified after initial assignment

### AC-SBA-7: `mentionId` Uniqueness and Format

- [ ] No two `DiscourseReferent` nodes in the same `ParsingAct` share a `mentionId`
- [ ] Format matches **`{parsingActId}:s{sentenceIndex}:m{headTokenIndex}`** where `headTokenIndex` is the sentence-relative index of the dependency head token of the mention's span
- [ ] "CMS" (single-token mention at sentence position 0) → `mentionId` ends in `:m0`
- [ ] A multi-token mention "Centers for Medicare & Medicaid Services" with dependency head at sentence position 3 → `mentionId` ends in `:m3`
- [ ] "CMS" in sentence 0 and "CMS" in sentence 1 have different `mentionId` values; both may share the same `is_about` Tier 2 target

### AC-SBA-8: IBE Provenance Continuity

- [ ] A two-sentence input produces exactly one `inst:Input_Text_IBE_{uuid}` node
- [ ] All `DiscourseReferent` and `VerbPhrase` nodes from all sentences carry the same `is_concretized_by` IRI
- [ ] Every `SentenceCluster` carries `tagteam:ibeIri` pointing to the same IRI
- [ ] Verified by string equality, not graph identity

### AC-SBA-9: SHACL Shape Enforcement

**`SBA_ForestStructureShape`:**
- [ ] Fires with message containing "Relative-Indexing Contract" on a fixture with `head: 15` in an 8-token sentence
- [ ] Passes on all 40 existing ISA corpus sentences (migrated) and all 10 new multi-sentence inputs

**`SBA_SentenceIndexShape`:**
- [ ] Fires on `DiscourseReferent` missing `sentenceIndex`; fires on `VerbPhrase` missing `sentenceIndex`

**`SBA_MentionPartitionShape`:**
- [ ] Fires on a `DiscourseReferent` whose `documentTokenSpan` crosses a sentence boundary

**`SBA_IBEProvenanceShape`:**
- [ ] Fires when two `DiscourseReferent` nodes point to different IBE IRIs

**`SBA_SentenceRelationshipShape`:**
- [ ] Fires `SentenceRelationshipViolation` on a semicolon-conditional sentence with no relationship node
- [ ] Fires `OrphanRelationshipViolation` on a relationship referencing `sentenceIndex: 99` when only 2 sentences exist
- [ ] Fires `RelationshipAdjacencyViolation` on a relationship with `fromSentenceIndex: 0`, `toSentenceIndex: 2` (skips sentence 1)
- [ ] Fires `RelationshipDuplicateViolation` on a fixture with two relationship nodes both linking sentences 0 → 1
- [ ] Fires `RelationshipTypeConsistencyViolation` on a relationship with `logicalConnector: "semicolon"` and `relationshipType: "enumeration"`
- [ ] Fires `RelationshipTypeConsistencyViolation` on a relationship with `logicalConnector: "enumeration"` and `relationshipType: "contrast"`
- [ ] Passes on standard (hard-boundary) inputs with empty `sentenceRelationships` array
- [ ] Passes on the semicolon-split worked example from §4.2

**`SBA_SentenceClusterShape`:**
- [ ] Fires `SentenceClusterViolation` when a node appears in the wrong cluster
- [ ] Fires `MissingClusterViolation` when a node is in `has_output` but in no cluster
- [ ] Passes on all 40 migrated corpus sentences

### AC-SBA-10: Structured `ParsingAct` Output

- [ ] Multi-sentence `ParsingAct` has `has_sentence_cluster` ordered by `sentenceIndex`, one entry per non-header sentence
- [ ] Single-sentence `ParsingAct`: `has_sentence_cluster` has exactly one entry
- [ ] `has_output` continues to enumerate all Tier 1 nodes (backward compatibility)

### AC-SBA-11: Parenthetical Child Trees (Wave 2)

- [ ] Parenthetical with modal verb and ≥ 6 tokens → extracted child `SentenceRecord` with `isParenthetical: true` and correct `parentSentenceIndex`
- [ ] Enclosing sentence `tokens` contains `["(", "...", ")"]` sentinel
- [ ] Wave 1 outputs: all records have `isParenthetical: false`, `parentSentenceIndex: null`

### AC-SBA-12: Coordination Decomposition (Wave 3)

- [ ] `"CMS shall provide access and report quarterly."` → two `VerbPhrase` nodes, both `sentenceIndex: 0`, `coordinatedVPIndex` values 0 and 1
- [ ] `"CMS shall allow USCIS to monitor records and provide quarterly reports."` → one `VerbPhrase` (object-clause coordination does not produce two root VPs)
- [ ] Both decomposed VPs appear in the same `SentenceCluster`

### AC-SBA-13: Modal Stub

- [ ] All Wave 1-2 outputs have `precedingModalContext: null` on all `SentenceRecord` entries
- [ ] Field is serialized (not absent) even when null

---

## 10. Implementation Sequencing

### Wave 1 — "The Boundary Is Real"

**Objective:** No cross-sentence arcs. `_metadata.sentences` schema live. `SentenceCluster` structure live. JSON-to-RDF Projection implemented.

**Deliverables:**
- `src/nlp/abbreviation-lexicon.json` — created with `standard` seed entries; `agency` and `custom` arrays empty
- `SentenceSegmenter.js` — Rule B-1 only; `logicalConnector: null` on all output; `listMarker: null`, `isParenthetical: false`, `parentSentenceIndex: null` on all records; empty `sentenceRelationships` array
- `TokenReIndexer.js` — complete including `TokenSpanCardinalityError`
- JSON-to-RDF Projection — complete; all derived properties (`tokenCount`, `tokenSpanStart/End`, `firstToken`) asserted
- `SemanticGraphBuilder.js` — forest dispatch, `sentenceIndex` injection, `mentionId` generation (using `headTokenIndex`), IBE provenance threading, `SentenceCluster` construction
- All four original SHACL shapes plus `SBA_SentenceClusterShape` — active in test runner
- **40 existing ISA corpus fixtures** migrated to `_metadata.sentences` format (see §11)
- **10 new multi-sentence inputs** from CMS-DHS MOA (Q4 decision):
  - 4 inputs with 2-sentence standard-boundary splits
  - 3 inputs with 3+ sentence standard-boundary splits
  - 3 inputs that would have produced `ccomp` arcs under pre-SBA architecture
- AC-SBA-1, AC-SBA-2, AC-SBA-3, AC-SBA-4, AC-SBA-6, AC-SBA-7, AC-SBA-8, AC-SBA-9 (four shapes + cluster shape), AC-SBA-10, AC-SBA-13

**Blocking criteria for Wave 2:** Zero `ForestStructureViolation`, `SentenceIndexViolation`, `MissingClusterViolation`, or `SentenceClusterViolation` findings across all 50 corpus inputs (40 + 10 new).

### Wave 2 — "The Segmenter Knows the Domain"

**Objective:** All four boundary rules functional. List markers stripped cleanly. Soft boundaries produce `SentenceRelationship` nodes with legal-proviso and legal-exception types. All six SHACL shapes active.

**Deliverables:**
- `SentenceSegmenter.js` — Rules B-2 (with stripping), B-3, B-4; `SentenceRelationship` records with `detectRelationshipType()` including all five types; `listMarker` field populated; independent-subject guard on Rule B-3; parenthetical extraction; `agency` array populated when Fandaws F-0 delivers
- `SBA_SentenceRelationshipShape` and `SBA_IBEProvenanceShape` and `SBA_MentionPartitionShape` — active
- New test corpus: minimum 10 multi-sentence inputs with regulatory structure (numbered lists, semicolon conditionals with all five relationship types, section headers, parentheticals)
- AC-SBA-5, AC-SBA-9 (all six shapes), AC-SBA-11

**Blocking criteria for Wave 3:** All six shapes pass. No `SentenceRelationshipViolation`, `RelationshipAdjacencyViolation`, `RelationshipDuplicateViolation`, `RelationshipTypeConsistencyViolation`, `MentionPartitionViolation`, or `IBEProvenanceViolation` findings.

### Wave 3 — "Coordination and Context"

**Objective:** Coordinated VPs produce distinct `VerbPhrase` nodes. `precedingModalContext` stub populated for qualifying inputs.

**Deliverables:**
- `SemanticGraphBuilder.js` — coordination decomposition logic
- `precedingModalContext` heuristic (§8)
- AC-SBA-12, AC-SBA-13

**Blocking criteria for WS-E:** All AC-SBA criteria passing. ISA corpus overall pass rate ≥ 85%.

---

## 11. Migration Guide

### 11.1 Test Fixture Migration

```javascript
function migrateMetadata(oldMetadata) {
  return {
    inputText: oldMetadata.inputText ?? '',
    parsingActId: oldMetadata.parsingActId ?? generateParsingActId(),
    ibeIri: oldMetadata.ibeIri ?? generateIbeIri(),
    sentenceRelationships: [],     // empty: all existing fixtures are single-sentence
    sentences: [{
      sentenceIndex: 0,
      text: oldMetadata.inputText ?? '',
      tokenSpan: [0, (oldMetadata.tokens?.length ?? 1) - 1],
      tokens: oldMetadata.tokens ?? [],
      root: oldMetadata.root ?? 0,
      arcs: oldMetadata.arcs ?? [],
      modalMarker: oldMetadata.modalMarker ?? null,
      segmentationType: 'standard',
      logicalConnector: null,
      listMarker: null,              // v1.3: new field
      precedingModalContext: null,
      isParenthetical: false,
      parentSentenceIndex: null
    }]
  };
}
```

After migration, run the JSON-to-RDF Projection on each fixture and execute all six SHACL shapes before beginning Wave 1 corpus testing.

### 11.2 Downstream Module Impact

- `OntologyTextTagger.js` — reads `tokens`; must iterate `sentences`
- `ModalDetector.js` — reads `arcs` per sentence; must operate per-sentence; must skip `listMarker` token position when `listMarker` is non-null
- `EntityFragmentDetector.js` / `ComplexDesignatorDetector.js` — must operate per-sentence; must skip placeholder sentinel `["(", "...", ")"]` positions
- SHACL test runner — must run JSON-to-RDF Projection before executing any SBA shape; must load all six shapes

---

## 12. Resolved Design Decisions

All questions from prior versions are closed. This section documents the decisions for audit purposes.

**Q1 (Abbreviation lexicon source of truth):** Configurable JSON file (`src/nlp/abbreviation-lexicon.json`) with three-tier structure (`standard`, `agency`, `custom`), shipping in the dist bundle. The file satisfies the edge-canonical constraint — no runtime network access required. Corpus-specific additions go in `custom`. Fandaws F-0 populates `agency`. See §5.1.2.

**Q2 (Semicolon conditional detection threshold):** Closed in v1.2 — the independent-subject guard added to Rule B-3 prevents continuation fragments from triggering false splits. `"CMS shall provide access to all records; including historical records."` → single sentence.

**Q3 (Numbered list marker handling):** Option A — strip before parsing. The list marker is stored in the `listMarker` field on `SentenceRecord` for provenance. The `tokens` array and the parser never see the marker. `tokenSpan` reflects the post-strip token range. See §5.1.3 Rule B-2.

**Q4 (Wave 1 multi-sentence corpus target):** N=10 multi-sentence inputs from the CMS-DHS MOA, with specified composition: 4 two-sentence standard-boundary pairs, 3 three-or-more-sentence inputs, 3 inputs that would have produced `ccomp` arcs pre-SBA. These are added to the ISA test runner alongside the 40 existing single-sentence tests. See §10 Wave 1.

**Q5 (`"legal-proviso"` and `"legal-exception"` types):** Both added as valid `relationshipType` values. `"legal-proviso"` is triggered by `notwithstanding`, `subject to`, `pursuant to`, `in accordance with`. `"legal-exception"` is triggered by `provided that`, `except that`, `except where`, `unless`. `"notwithstanding"` maps to `"legal-proviso"`, not `"contrast"` — this is a disambiguation that matters for federal regulatory semantics. See §4.4 and §6.5 type-consistency constraint.

---

## Document History

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-03-31 | Informal framework — five principles, no normative specification |
| 1.1 | 2026-04-01 | First formal specification. Pipeline ordering, `_metadata.sentences` schema, SentenceSegmenter, TokenReIndexer, four SHACL shapes, coordination decomposition, precedingModalContext stub, three-wave sequencing, migration guide |
| 1.2 | 2026-04-01 | Relative-Indexing Contract; `headType` enum rejected; `logicalConnector` and parenthetical fields; `SentenceRelationship`; `SentenceCluster`; two new SHACL shapes; Rule B-3 independent-subject guard; Q2 closed |
| 1.3 | 2026-04-01 | **Final hardened spec.** TokenSpan bug corrected (§4.2); `mentionId` unified to `headTokenIndex` (§2, §5.3.3, §9); JSON-to-RDF Projection defined (§4.6); `SBA_SentenceRelationshipShape` strengthened with adjacency, uniqueness, and type-consistency (§6.5); `listMarker` field added (§4.2); configurable lexicon file (§5.1.2); list-marker stripping (§5.1.3 Rule B-2); Wave 1 corpus: N=10 multi-sentence inputs (§10); `"legal-proviso"` and `"legal-exception"` types (§4.4, §6.5); all open questions closed (§12) |

---

*This specification is a component of the TagTeam.js semantic parser project within the Ontology of Freedom Initiative / Federated Network for Sovereign Reasoning (FNSR).*
