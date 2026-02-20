# Implementation Plan: GenericityDetector (§9.5)

## Overview

Implement a `GenericityDetector` module that classifies subject NPs as Generic (GEN), Instance (INST), Universal (UNIV), or Ambiguous (AMB). This enables TagTeam to distinguish kind-referring expressions ("Dogs have fur") from instance-referring expressions ("The dogs have fleas") and produce ontologically correct output — `owl:Class` restrictions vs. `owl:NamedIndividual` assertions.

## Scope

- **New file**: `src/graph/GenericityDetector.js` (~200 lines)
- **New test file**: `tests/unit/phase5/genericity-detection.test.js` (~20 test cases from §9.5.10)
- **Modified files**:
  - `src/graph/SemanticGraphBuilder.js` — wire GenericityDetector at Stage 8.5
  - `src/graph/RealWorldEntityFactory.js` — use `owl:Class` for GEN/UNIV subjects instead of `owl:NamedIndividual`
  - `src/graph/ConfidenceAnnotator.js` — emit genericity confidence alongside arc confidence
  - `scripts/build.js` — add GenericityDetector to UMD bundle

## Work Packages

### WP1: GenericityDetector Core Module
**File**: `src/graph/GenericityDetector.js`
**Dependencies**: DepTree, Lemmatizer (both exist)
**Estimated size**: ~200 lines

**Data structures** (from spec §9.5.3):
- `DET_TO_GENERICITY` — determiner → category map (Signal 1)
- `MASS_NOUNS` — ~50 mass nouns for bare-noun disambiguation (Signal 1)
- `TENSE_GENERICITY_SIGNAL` — POS tag → support signal (Signal 2)
- `MODAL_GENERICITY_SIGNAL` — modal verb → support signal (Signal 2)
- `STATIVE_VERBS` — ~30 stative verbs (Signal 3)

**Main method**: `classify(entities, depTree, tags, options)`
- Returns: `Map<entityId, { category, confidence, alternative? }>`
- Only classifies **subject** entities (role = nsubj, nsubj:pass)
- Object entities default to INST (per §9.5.7 — object genericity deferred)

**Algorithm** (from spec §9.5.4):
1. For each subject entity, find its `det` child via `depTree.getChildren(headId)`
2. Classify determiner → GEN/INST/UNIV/AMB (Signal 1)
3. Find governing verb, check POS tag → tense signal (Signal 2)
4. If modal, subclassify deontic vs. epistemic (Signal 2b)
5. Check verb lemma for stative vs. dynamic (Signal 3)
6. Apply decision logic: strong signals override; AMB resolved by tally

**Key implementation notes**:
- DepTree `getChildren(headId)` returns `{ dependent, label, word, tag }` — filter for `label === 'det'`
- DepTree `getHead(depId)` returns `{ head, label, scoreMargin }` — use to find governing verb
- Tags are 0-indexed (`tags[tokenId - 1]`), tokens are 0-indexed (`tokens[tokenId - 1]`)
- Lemmatizer used for stative verb lookup: `lemmatizer.lemmatize(word, tag).lemma`

### WP2: Pipeline Integration (SemanticGraphBuilder)
**File**: `src/graph/SemanticGraphBuilder.js`
**Changes**: ~15 lines

Insert at line ~1927 (after Stage 7: TreeRoleMapper, before Stage 8: Mention IDs):

```javascript
// Stage 7.5: Genericity detection (§9.5)
stages.current = 'classifyGenericity';
const genericityDetector = new _GenericityDetector({ lemmatizer: this.lemmatizer });
const genericityMap = genericityDetector.classify(entities, depTree, tags, buildOptions);
```

Then in the JSON-LD node construction loop (line ~1958), annotate entity nodes:

```javascript
// Genericity annotations (§9.5)
const gen = genericityMap.get(entity.headId);
if (gen) {
  entityNode['tagteam:genericityCategory'] = gen.category;
  entityNode['tagteam:genericityConfidence'] = gen.confidence;
  if (gen.alternative) {
    entityNode['tagteam:genericityAlternative'] = {
      'tagteam:category': gen.alternative.category,
      'tagteam:confidence': gen.alternative.confidence
    };
  }
}
```

Pass genericityMap to RealWorldEntityFactory (line ~2032).

### WP3: RealWorldEntityFactory Modification
**File**: `src/graph/RealWorldEntityFactory.js`
**Changes**: ~10 lines in `_createTier2Entity()`

Currently (line 262):
```javascript
'@type': [tier2Type, 'owl:NamedIndividual'],
```

Modified to check genericity:
```javascript
const isClassLevel = referent['tagteam:genericityCategory'] === 'GEN'
                  || referent['tagteam:genericityCategory'] === 'UNIV';
'@type': isClassLevel
  ? [tier2Type, 'owl:Class']
  : [tier2Type, 'owl:NamedIndividual'],
```

For GEN subjects, also add:
- `tagteam:subjectClass` pointing to the type IRI
- Use `owl:someValuesFrom` restriction structure (Pattern A from §9.5.5)

For UNIV subjects:
- Use `owl:allValuesFrom` restriction structure (Pattern C from §9.5.5)

**Decision needed**: The full OWL restriction patterns (Pattern A–E from §9.5.5) are complex graph structures. For WP3, we implement the **minimal change**: swap `owl:NamedIndividual` → `owl:Class` for GEN/UNIV, annotate with `tagteam:genericityCategory`. The full restriction patterns (owl:Restriction, owl:onProperty, owl:someValuesFrom/allValuesFrom) are a separate WP if needed — they require act/role context to determine the property and filler.

### WP4: ConfidenceAnnotator Extension
**File**: `src/graph/ConfidenceAnnotator.js`
**Changes**: ~15 lines

Add method:
```javascript
genericityConfidence(genericityResult) {
  // Map genericity confidence to standard buckets
  const prob = genericityResult.confidence;
  return {
    confidence: prob >= 0.85 ? 'high' : prob >= 0.6 ? 'medium' : 'low',
    probability: prob
  };
}
```

Emit on entity nodes alongside `tagteam:parseConfidence`.

### WP5: Test Suite
**File**: `tests/unit/phase5/genericity-detection.test.js`
**Test count**: ~20 tests (from §9.5.10)

**Signal 1 tests** (determiner-driven):
1. "Dogs have fur" → GEN, confidence ≥ 0.9
2. "The dogs have fleas" → INST, confidence ≥ 0.85
3. "Those dogs are barking" → INST, confidence ≥ 0.9
4. "All dogs bark" → UNIV, confidence ≥ 0.85
5. "No dogs were harmed" → UNIV, confidence ≥ 0.85
6. "Water boils at 100 degrees" → GEN, confidence ≥ 0.85
7. "System failed" → AMB or INST, NOT GEN

**Signal 2 tests** (tense/modal):
8. "A dog is a loyal companion" → GEN, confidence ≥ 0.65
9. "A dog bit me" → INST, confidence ≥ 0.6, with GEN alternative
10. "An officer shall verify documentation" → GEN, confidence ≥ 0.7
11. "An officer might verify documentation" → AMB, confidence ≤ 0.6

**Signal 3 tests** (predicate type):
12. "Mammals contain hemoglobin" → GEN, confidence ≥ 0.9
13. "Children ran across the field" → GEN, confidence ≤ 0.75

**Proper nouns**:
14. "CBP is a component of DHS" → INST, confidence ≥ 0.9

**Institutional The**:
15. "The electron has negative charge" → AMB, with GEN alternative

**Domain class terms**:
16. "An agency is a component of a department" → GEN, confidence ≥ 0.7

**Structured uncertainty**:
17. Any AMB classification includes confidence score
18. Any AMB with alternative includes `tagteam:genericityAlternative`

**Integration tests** (end-to-end through pipeline):
19. GEN subject produces `owl:Class` in Tier 2 (not `owl:NamedIndividual`)
20. INST subject produces `owl:NamedIndividual` in Tier 2 (unchanged behavior)

### WP6: Bundle Integration
**File**: `scripts/build.js`
**Changes**: ~15 lines (same pattern as DepTreeCorrector)

Add GenericityDetector to:
1. Path declaration
2. File read
3. stripCommonJS processing
4. Bundle template with shim
5. API export

## Execution Order

```
WP1 → WP5 (unit tests, TDD) → WP2 → WP3 → WP4 → WP5 (integration tests) → WP6
```

1. **WP1**: Build GenericityDetector module with all 4 signals
2. **WP5 (partial)**: Write unit tests, run against WP1, iterate
3. **WP2**: Wire into SemanticGraphBuilder pipeline
4. **WP3**: Modify RealWorldEntityFactory for GEN/UNIV
5. **WP4**: Extend ConfidenceAnnotator
6. **WP5 (complete)**: Run integration tests through full pipeline
7. **WP6**: Add to bundle, rebuild, verify

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| POS tagger misclassifies determiners | AMBIGUOUS_WORD_FIXES already handles common cases; add to list if needed |
| DepTree doesn't expose `det` children | Confirmed: `getChildren(headId)` returns all children with labels; filter for `label === 'det'` |
| Lemmatizer misses stative verbs | Lemmatizer has 150+ irregular verb forms; STATIVE_VERBS list uses lemma forms, so lookup is after lemmatization |
| Governing verb not found for subject | Fallback: if no governing verb found, use `AMB` with 0.5 confidence |
| OWL restriction patterns too complex | WP3 starts with minimal change (Class vs. NamedIndividual); full restriction patterns deferred if needed |
| Mass noun list too small | Conservative: unlisted bare singulars → AMB (safe default); list extensible |

## Fandaws Integration Impact

GenericityDetector output feeds directly into the Fandaws adapter (Phase 5):
- **VerbTypeClassifier**: GEN/UNIV + copular → `verbType = "classification"` (class-level)
- **ParseResultMapper**: Can include `tagteam:genericityCategory` in `discourseAnnotations`
- **Q3 from Integration Brief**: Multi-act handling becomes more precise — generic assertions are class-level, instance assertions are individual-level

## Regression Gate

After implementation:
- All existing Phase 0–4 tests must still pass (`npm run test:ci`)
- Component tests: 96% pass rate maintained (96/100)
- INST entities (the current default) must produce identical output to pre-genericity behavior
- Only new GEN/UNIV classifications change Tier 2 output
