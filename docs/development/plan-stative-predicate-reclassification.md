# Stative Predicate Reclassification Plan (Revised)

**Date:** 2026-03-28
**Priority:** HIGH — Blocks §9.5.5 OWL Restriction Patterns + SMA Layer 4
**Spec:** `docs/sma-linguistic-sensory-layer-v1.2-final.md` (primary), `docs/architecture/tagteam-v7-stative-predication-spec.md` (legacy)
**Status:** Plan revised per SMA spec review
**Baseline:** `4a71ba4` (@context fix shipped)
**Supersedes:** Initial plan (bug-fix only scope)

---

## Scope Change from Initial Plan

The initial plan addressed 3 bugs and 1 enhancement in the existing StructuralAssertion system. The SMA spec (v1.2) extends the scope significantly:

| Initial Plan | SMA Spec Addition |
|-------------|-------------------|
| Fix verb-in-subject span (Bug 1) | Still needed |
| Fix multiple stative objects (Bug 2) | Still needed |
| Fix AC-A1 test selector (Bug 3) | Still needed |
| Suppress redundant "have" act (Enh 4) | Subsumed by Layer 4 gate |
| — | **QualityAssertion** class for adjectival copulars |
| — | **bfo:Quality** (BFO_0000019) nodes that `inheres_in` bearers |
| — | **RoleAssertion** class for nominal copulars |
| — | **evidentialMarker** for perception copulas ("seems tired") |
| — | **isEventNoun()** blacklist for "has a meeting" disambiguation |
| — | **Grounding slot** (`tagteam:grounding: null`) for downstream CSS |
| — | **Layer 4 gate algorithm** before existing act detection |
| — | **kindLevel** flag for generic subjects |

---

## Architecture: Layer 4 Stative Gate

Per spec §12, the stative detector inserts as Layer 4a in the pipeline, BEFORE modal detection (4b) and narrative act detection (4c):

```
Stage 4a: Stative Gate (NEW)
  → If stative predicate detected → emit QualityAssertion/RoleAssertion/StructuralAssertion
  → Skip IntentionalAct, skip RDM, skip Role nodes
Stage 4b: Modal Detection (RDM — existing)
  → If modal detected → emit DICE + PlanSpec + RealizableEntity
Stage 4c: Narrative Act Detection (existing)
  → Default → emit IntentionalAct + Roles
```

Gate order is deterministic: stative → modal → negated → actual.

---

## Implementation Workstreams

Per spec §9, this is **WS-A only** (Stative Predicate Extraction). WS-B through WS-E (EventDescription, negation, tense-aspect, deontic-narrative bridge) are separate future work.

---

## Files to Modify

| File | Change | Effort |
|------|--------|--------|
| `src/graph/TreeActExtractor.js` | Add `isStativePredicate()` gate, `isEventNoun()` blacklist, suppress acts for stative | Medium |
| `src/graph/SemanticGraphBuilder.js` | Emit QualityAssertion + Quality nodes for adjectival/possessive; RoleAssertion for nominal; evidential markers | Large |
| `src/graph/JSONLDSerializer.js` | Add @context for new types/properties | Small |
| `ontology/tagteam.ttl` | Add QualityAssertion, RoleAssertion, Quality-related properties | Small |
| Tests | New stative test file with SMA spec test vectors | Medium |

---

## Stative Detection Patterns (from spec §12.2)

| # | Pattern | Dep Signature | Example | Output |
|---|---------|---------------|---------|--------|
| 1 | Adjectival copular | Root=JJ, has `cop` child | "The child is hungry" | QualityAssertion + Quality |
| 2 | Nominal copular | Root=NN, has `cop` child, nsubj≠root | "The child is a student" | RoleAssertion + Role |
| 3 | Possessive stative | Root=have, has `obj`, no `aux:MD`, obj NOT event-noun | "Dogs have fur" | QualityAssertion + Quality |
| 4 | Locative copular | Has `cop` + `obl` with locative case marker | "The book is on the table" | StructuralAssertion (locative) |
| 5 | Evidential copular | Root=seem/appear/look, has `xcomp:JJ` | "She seems tired" | QualityAssertion + Quality + evidentialMarker |

---

## Event-Noun Blacklist (spec §12.3)

"The committee has a meeting" must NOT trigger stative — "meeting" is an event noun.

```javascript
const EVENT_NOUN_BLACKLIST = new Set([
  'meeting', 'surgery', 'flight', 'appointment', 'conference',
  'session', 'trial', 'hearing', 'examination', 'interview',
  'wedding', 'funeral', 'party', 'ceremony', 'celebration',
  'game', 'match', 'race', 'competition', 'concert', 'performance',
  'lesson', 'class', 'lecture', 'seminar', 'workshop',
  'trip', 'journey', 'vacation', 'tour', 'visit',
  'conversation', 'discussion', 'debate', 'argument', 'fight',
  'operation', 'procedure', 'transaction', 'deal', 'negotiation'
]);
```

---

## Acceptance Criteria

### Pattern 1: Adjectival Copular → QualityAssertion + Quality

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-STA-01 | "The child is hungry." | QualityAssertion node exists with `@type` including `tagteam:QualityAssertion` | exists |
| AC-STA-02 | "The child is hungry." | QualityAssertion `tagteam:assertedQuality` = "hungry" | quality extracted |
| AC-STA-03 | "The child is hungry." | Quality node (Tier 2) with `@type` including `bfo:BFO_0000019` | BFO Quality exists |
| AC-STA-04 | "The child is hungry." | Quality `bfo:BFO_0000052` (inheres_in) → child Tier 2 entity | inheres in bearer |
| AC-STA-05 | "The child is hungry." | Quality `tagteam:grounding` = null | grounding slot present |
| AC-STA-06 | "The child is hungry." | No IntentionalAct for "hungry" (excluding ParsingAct) | no ghost act |
| AC-STA-07 | "The soup is hot." | QualityAssertion with `assertedQuality: "hot"` | works for any adjective |

### Pattern 2: Nominal Copular → RoleAssertion

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-STA-08 | "The child is a student." | Node with `@type` including `bfo:BFO_0000023` (Role) | BFO Role exists |
| AC-STA-09 | "The child is a student." | Role `bfo:BFO_0000052` → child Tier 2 entity | inheres in bearer |

### Pattern 3: Possessive Stative → QualityAssertion

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-STA-10 | "Dogs have fur." | QualityAssertion with `assertedQuality: "fur"` | possessive → quality |
| AC-STA-11 | "Dogs have fur." | Quality node with `tagteam:kindLevel: true` | generic subject |
| AC-STA-12 | "Dogs have fur." | No IntentionalAct, no AgentRole | no ghost act or roles |
| AC-STA-13 | "The committee has a meeting." | IntentionalAct emitted (event-noun bypass) | event-noun blacklist works |

### Pattern 4: Locative Copular

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-STA-14 | "The book is on the table." | StructuralAssertion with locative relation | locative detected |

### Pattern 5: Evidential Copular

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-STA-15 | "She seems tired." | QualityAssertion with `tagteam:evidentialMarker: "seem"` | evidential marker |
| AC-STA-16 | "She seems tired." | QualityAssertion `tagteam:epistemicStatus` = `tagteam:Observational` | epistemic status |
| AC-STA-17 | "She seems tired." | Quality node for "tired" with `tagteam:epistemicStatus: Observational` | propagated to quality |

### Bug Fixes (from initial plan, still needed)

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-STA-18 | "Water consists of hydrogen and oxygen." | Subject entity = "Water" (not "water consist") | clean entity boundary |
| AC-STA-19 | "Water consists of hydrogen and oxygen." | StructuralAssertion links BOTH "hydrogen" and "oxygen" | multiple objects |
| AC-STA-20 | "The group includes five members." | No IntentionalAct (excluding ParsingAct) | test selector fixed |

### Non-Regression

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-STA-21 | "The doctor treats the patient." | IntentionalAct + AgentRole + PatientRole | eventive unchanged |
| AC-STA-22 | "The committee shall review the proposal." | DICE + PlanSpec + Obligation (RDM) | modal unchanged |
| AC-STA-23 | "CBP is a component of DHS." | StructuralAssertion (copular predication) | existing copular unchanged |
| AC-STA-24 | RDM tests (40/40) | 0 regressions | |
| AC-STA-25 | Entity boundary tests (18/18) | 0 regressions | |
| AC-STA-26 | Full CI (14 suites) | 0 regressions | |
| AC-STA-27 | Corpus regression (15/15) | 0 regressions | |

### Edge Cases

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-STA-28 | "The book is by the author." | NOT locative (no LOCATION NER on "author") | authorship, not location |
| AC-STA-29 | "He has to submit the form." | NOT stative (modal "have to") — routes to RDM | modal bypass |

---

## TDD Implementation Sequence

### Cycle 1: Layer 4 gate + adjectival copular (Patterns 1 & 5)

**Red:** Write tests AC-STA-01 through AC-STA-07, AC-STA-15 through AC-STA-17.

**Green:**
1. Add `isStativePredicate()` to TreeActExtractor using spec §12.2 algorithm
2. In `_buildWithTreeExtractors()`: before act assembly, run stative gate on each act. If stative, route to `emitQualityAssertion()` instead of act path.
3. `emitQualityAssertion()` creates: QualityAssertion (Tier 1) + Quality node (Tier 2) with `bfo:BFO_0000052` → bearer, `grounding: null`
4. For evidential pattern (Pattern 5): add `evidentialMarker` and `epistemicStatus`

### Cycle 2: Possessive stative + event-noun blacklist (Pattern 3)

**Red:** Write tests AC-STA-10 through AC-STA-13, AC-STA-29.

**Green:**
1. Add `EVENT_NOUN_BLACKLIST` to TreeActExtractor
2. Modify `_isPossessive()`: add `isEventNoun(obj)` check — if event noun, return false (route to act path)
3. In stative gate: when `have` + `obj` + no modal + not event-noun → emit QualityAssertion
4. Remove the redundant `_buildAct()` call after `_isPossessive()` — emit only stative nodes
5. Add `tagteam:kindLevel` from genericity detection

### Cycle 3: Nominal copular + locative (Patterns 2 & 4)

**Red:** Write tests AC-STA-08, AC-STA-09, AC-STA-14, AC-STA-28.

**Green:**
1. For nominal copular: emit RoleAssertion + `bfo:BFO_0000023` (Role) node
2. For locative copular: emit StructuralAssertion with locative relation (existing code mostly works)
3. Add `LOCATION_NOUN_GAZETTEER` for Pattern 4 fallback

### Cycle 4: Bug fixes + multiple objects

**Red:** Write tests AC-STA-18 through AC-STA-20.

**Green:**
1. Fix verb-in-subject entity span (Bug 1)
2. Link multiple `conj` objects to StructuralAssertion (Bug 2)
3. Fix AC-A1 test selector (Bug 3)

### Cycle 5: Ontology + @context + non-regression

1. Add QualityAssertion, RoleAssertion, EpistemicStatus to TTL
2. Add @context entries for new properties
3. Rebuild bundle
4. Run AC-STA-21 through AC-STA-27

---

## Ontology Additions

### New Classes

- `tagteam:QualityAssertion` (subClassOf `tagteam:StructuralAssertion`)
- `tagteam:RoleAssertion` (subClassOf `tagteam:StructuralAssertion`)
- `tagteam:EpistemicStatus` (enumeration class)

### New Individuals

- `tagteam:Asserted` (EpistemicStatus)
- `tagteam:Observational` (EpistemicStatus)

### New Properties

- `tagteam:assertedQuality` (datatype, domain QualityAssertion, range xsd:string)
- `tagteam:qualityType` (datatype, domain bfo:Quality, range xsd:string)
- `tagteam:grounding` (object, domain bfo:Quality, range tagteam:ActSpecification)
- `tagteam:kindLevel` (datatype, domain bfo:Quality, range xsd:boolean)
- `tagteam:observedAt` (datatype, domain bfo:Quality, range xsd:dateTime)
- `tagteam:evidentialMarker` (datatype, domain QualityAssertion, range xsd:string)
- `tagteam:epistemicStatus` (object, range EpistemicStatus)
- `tagteam:copulaLemma` (datatype, domain StructuralAssertion, range xsd:string)

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Stative gate intercepts sentences that should be acts | Gate order: stative → modal → act. Modal check (`hasModalAuxiliary`) runs in gate before stative can fire for "must have". `_isPossessive` already checks `!hasAux`. |
| "has a meeting" triggers stative | `EVENT_NOUN_BLACKLIST` explicitly prevents. AC-STA-13 validates. |
| "seems tired" treated as absolute fact | `evidentialMarker` + `epistemicStatus: Observational` propagated to both Tier 1 and Tier 2 nodes. AC-STA-15/16/17 validate. |
| "by the author" misclassified as locative | Pattern 4 requires NER LOCATION tag or LOCATION_NOUN_GAZETTEER membership. "author" fails both. AC-STA-28 validates. |
| Existing copular assertions ("CBP is a component of DHS") broken | Those go through `_handleCopular()` which fires BEFORE the stative gate (in TreeActExtractor.extract()). Non-regression: AC-STA-23. |

---

## Out of Scope (Future WS-B through WS-E)

- **EventDescription class** (WS-C): affirmative narratives → new ICE type
- **Narrative negation** (WS-B): "did not feed" → EventDescription with Unrealized
- **Tense-aspect extraction** (WS-D): verb morphology → TenseAspect individuals
- **Deontic-narrative bridge** (WS-E): structural matching for violation detection
- **ActSpecification superclass**: PlanSpec + EventDesc share structure (WS-C prerequisite)
