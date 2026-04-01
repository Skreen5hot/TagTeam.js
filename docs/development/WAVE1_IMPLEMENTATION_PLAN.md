# Wave 1 Implementation Plan: Sentence Boundary Architecture

**Spec:** `docs/tagteam-sentence-boundary-spec-v1.3.md`
**Scope:** Wave 1 only — Rule B-1 (standard hard boundaries)
**Target:** Zero cross-sentence arcs. `_metadata.sentences` schema live.
**Depends on:** Beta.2 (v5.4.0-beta.2) — current main

---

## Implementation Order (10 Steps)

### Step 0: Audit Tier 2 IRI Generation
**Effort:** Small (30 min)
**Risk:** Blocking — must confirm before fixture migration

Audit `RealWorldEntityFactory._buildTier2IRI()` and `SemanticGraphBuilder` to confirm:
- No `uuid()`, `Date.now()`, or `Math.random()` in Tier 2 IRI construction
- IRI is deterministic from `bfoType + canonicalLabel`
- Two independent parses of "CMS" produce identical Tier 2 IRI

If randomness found: remove it (one-line fix). If deterministic: document and proceed.

**Files:** `src/graph/RealWorldEntityFactory.js`, `src/graph/SemanticGraphBuilder.js`
**AC:** Same sentence parsed twice → identical Tier 2 IRIs

---

### Step 1: Migrate Test Fixtures to `_metadata.sentences[]` Format
**Effort:** Medium (2-3 hours)
**Risk:** Low — mechanical transformation, isolated commit

Run §11.1 `migrateMetadata()` against all test fixtures:
- 106 CCO corpus baselines (`tests/gold/baselines/*.json`)
- 30 CCO complex sentences (`tests/corpus/cco-complex-sentences.json`)
- 20 CCO stress sentences (`tests/corpus/cco-stress-sentences.json`)
- 40 ISA corpus (in `dist/isa-test-runner-cms-dhs.html`)
- All CI test assertions reading `_metadata.root`, `_metadata.arcs`, `_metadata.tokens`

Transform: flat `_metadata` → `_metadata.sentences[0]` wrapper.
Update: all test assertions from `_metadata.root` → `_metadata.sentences[0].root`.

**Commit isolated. CI MUST go green on old code before new code lands.**

**Files:** All `tests/` files, `dist/isa-test-runner-cms-dhs.html`
**AC:** AC-SBA-2 — all fixtures have `sentences` array, `sentenceRelationships: []`

---

### Step 2: Create Abbreviation Lexicon
**Effort:** Small (30 min)

Create `src/nlp/abbreviation-lexicon.json` with seed entries per §5.1.2:

```json
{
  "standard": ["U.S.", "U.S.C.", "Sec.", "No.", "Vol.", "Art.", "Fig.",
    "et al.", "i.e.", "e.g.", "vs.", "approx.", "Dept.", "Div.",
    "Est.", "Gov.", "Jr.", "Sr.", "Inc.", "Corp.", "etc."],
  "agency": [],
  "custom": []
}
```

**Files:** `src/nlp/abbreviation-lexicon.json` (new)
**AC:** File loads, merged Set contains all standard entries

---

### Step 3: Implement SentenceSegmenter (Rule B-1 Only)
**Effort:** Medium (3-4 hours)

New module: `src/nlp/SentenceSegmenter.js`

**Rule B-1 logic:**
1. Tokenize full input
2. Scan for `.`, `!`, `?` tokens
3. Check preceding token NOT in abbreviation lexicon
4. Check following token exists and starts uppercase
5. Check preceding span contains at least one finite verb (VB* tag)
6. Split at boundary, produce `SentenceRecord` per §4.2

**Wave 1 constraints:**
- `logicalConnector: null` on all output
- `listMarker: null` on all records
- `isParenthetical: false`, `parentSentenceIndex: null` on all records
- `sentenceRelationships: []` (empty — no soft boundaries in Wave 1)
- `segmentationType: "standard"` on all records

**Interface per §5.1:**
```typescript
function segment(inputText, vocabulary, options?): SegmenterOutput
```

**Files:** `src/nlp/SentenceSegmenter.js` (new)
**AC:** AC-SBA-1, AC-SBA-4

---

### Step 4: Implement TokenReIndexer
**Effort:** Medium (2-3 hours)

New module: `src/nlp/TokenReIndexer.js`

Maps sentence-relative parser output to the `SentenceRecord` schema:
- `documentOffsets[i]` = document token index for sentence token `i`
- Verify `tokenSpan[1] - tokenSpan[0] + 1 === tokens.length` → `TokenSpanCardinalityError`
- Accept optional `cddSpans` → filter and convert to sentence-relative positions

**Files:** `src/nlp/TokenReIndexer.js` (new)
**AC:** AC-SBA-2 (tokenSpan cardinality)

---

### Step 5: Implement `buildForest()` Entry Point
**Effort:** Large (4-6 hours)

Restructure `SemanticGraphBuilder` and `build.js`:

```javascript
// New entry point
function buildForest(sentences, parsingActId, ibeIri, options) {
  const pipeline = initNLPPipeline();  // single init
  const results = [];
  for (const sentence of sentences) {
    results.push(parseSentence(pipeline, sentence));
  }
  return buildForestGraph(results, parsingActId, ibeIri, options);
}

// Existing entry point delegates
function buildGraph(input, options) {
  const segmented = segment(input, abbreviationLexicon);
  return buildForest(segmented.sentences, generateId(), generateIbeIri(), options);
}
```

Key changes:
- Pipeline init moved out of per-sentence loop
- `buildGraph()` calls segmenter first, then `buildForest()`
- Per-sentence graph building produces `sentenceIndex` on all Tier 1 nodes
- IBE created once, threaded through all sentences

**Files:** `src/graph/SemanticGraphBuilder.js`, `scripts/build.js`
**AC:** AC-SBA-1, AC-SBA-8

---

### Step 6: Implement SentenceCluster Construction
**Effort:** Medium (2-3 hours)

Per §5.3.2, after each sentence is processed:
- Create `SentenceCluster` node grouping all DRs and VPs from that sentence
- Add `has_sentence_cluster` array to `ParsingAct`
- Retain `has_output` for backward compatibility

**Files:** `src/graph/SemanticGraphBuilder.js`
**AC:** AC-SBA-10

---

### Step 7: Implement JSON-to-RDF Projection
**Effort:** Medium (3-4 hours)

Per §4.6, deterministic mapping from `_metadata` JSON to RDF triples:
- IRI construction rules (§4.6.1)
- Triples per `_metadata` object (§4.6.2)
- Triples per `sentences[i]` including derived `tokenCount` (§4.6.3)
- Triples per `arcs[j]` (§4.6.4)
- Consistency constraints (§4.6.6)

**Files:** New projection module or extension to SHACL test infrastructure
**AC:** AC-SBA-3

---

### Step 8: Load SHACL Shapes into Test Runner
**Effort:** Medium (2-3 hours)

Add to existing SHACL test infrastructure:
- `SBA_ForestStructureShape` (§6.1) — Relative-Indexing Contract
- `SBA_SentenceIndexShape` (§6.2) — sentenceIndex on all Tier 1 nodes
- `SBA_SentenceClusterShape` (§6.6) — cluster consistency

Wave 1 shapes only (3 of 6). Remaining 3 shapes in Wave 2.

**Files:** `tests/shacl/sba-shapes.test.js` (new)
**AC:** AC-SBA-9

---

### Step 9: Draft 10 Multi-Sentence ISA Inputs
**Effort:** Medium (2-3 hours)

From CMS-DHS MOA corpus:
- **4 two-sentence** standard-boundary pairs (shared entity subjects)
- **3 three-plus-sentence** multi-obligation paragraphs
- **3 ccomp-would-have-fired** — consecutive obligation pairs that currently produce cross-sentence arcs

For each: run pre-SBA parser, confirm structural error, document expected post-SBA output.

**Files:** `tests/corpus/isa-multi-sentence.json` (new)
**AC:** AC-SBA-1 (no ccomp between root verbs)

---

### Step 10: Wave 1 Blocking Criteria
**Effort:** Small (1 hour)

Run full validation:
- Zero `ForestStructureViolation` across all 50 inputs (40 + 10)
- Zero `SentenceIndexViolation`
- Zero `MissingClusterViolation`
- Zero `SentenceClusterViolation`
- All 21 existing CI suites still green
- CCO complex corpus: 106/106
- CCO stress corpus: 20/20 structural

---

## Estimated Total Effort

| Step | Effort | Dependencies |
|------|--------|-------------|
| 0. Tier 2 IRI audit | 30 min | None |
| 1. Fixture migration | 2-3 hrs | Step 0 |
| 2. Abbreviation lexicon | 30 min | None |
| 3. SentenceSegmenter | 3-4 hrs | Step 2 |
| 4. TokenReIndexer | 2-3 hrs | Step 3 |
| 5. buildForest() | 4-6 hrs | Steps 3, 4 |
| 6. SentenceCluster | 2-3 hrs | Step 5 |
| 7. JSON-to-RDF Projection | 3-4 hrs | Step 5 |
| 8. SHACL shapes | 2-3 hrs | Step 7 |
| 9. Multi-sentence corpus | 2-3 hrs | Step 5 |
| 10. Validation | 1 hr | All |
| **Total** | **~22-32 hrs** | **~3-4 sessions** |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Fixture migration breaks CI | High | Isolated commit, mechanical transform |
| buildForest() changes break single-sentence output | High | buildGraph() delegates to buildForest() with wrapping |
| POS tagger/dep parser model loading per-sentence | Medium | Single pipeline init in buildForest() |
| CDD spans crossing sentence boundaries | Low | Filter in TokenReIndexer (§Architecture 3) |
| Tier 2 IRI instability | High | Step 0 audit before any migration |

---

## Not In Scope (Wave 2-3)

- Rules B-2, B-3, B-4 (soft boundaries, lists, section headers)
- SentenceRelationship nodes
- Parenthetical extraction
- Coordination decomposition
- precedingModalContext
- Cross-sentence coreference (WS-E)
