# TagTeam.js v2 Implementation Plan

**Source**: [v2Spec.md (v1.3)](v2Spec.md) | [v2Milestones.md](v2Milestones.md)
**Date**: 2026-02-01
**Approach**: Test-Driven Development — tests written before implementation for every phase
**Architecture Principle**: v2 is a pre-processing layer. v1's `SemanticGraphBuilder.build()` pipeline is wrapped, not replaced.

---

## How to Read This Document

Each phase follows this structure:

1. **Write failing tests** — acceptance criteria expressed as test cases
2. **Implement** — minimum code to make tests pass
3. **Regression check** — `npm test` must remain green throughout
4. **Demo** — verify the milestone demo scenario from v2Milestones.md

Test files use the existing custom framework (`tests/framework/test-helpers.js`) with `describe`, `test`, `expect`, `semantic`, and `parseToGraph` helpers.

### Build Script Requirement

`scripts/build.js` uses **hardcoded file paths** — it does NOT auto-discover new source files. Every new v2 module added to `src/graph/` must be manually registered in the build script:

1. Add a `const xxxPath = path.join(...)` declaration
2. Add a `let xxx = fs.readFileSync(...)` read
3. Add a `xxx = stripCommonJS(xxx, 'ClassName')` conversion
4. Add a `${xxx}` template insertion in the bundle
5. Expose the class in the `TagTeam` API object

v2 source files stay in `src/graph/` (flat — no subdirectory). The v2 ontology schema goes in `ontology/tagteam-v2.ttl` alongside the existing v1 `ontology/tagteam.ttl`.

### Release Alignment

| Release | Phases | Target |
|---------|--------|--------|
| **v2.0 MVP** | Phases 0–6 | Q2 2026 |
| **v2.1** | Phases 7–10 | Q3 2026 |
| **v2.2** | Phases 11–13 | Q4 2026 |

---

## Phase 0: Prerequisites & Schema

**Milestone**: M-0 (prerequisite — enables all downstream work)
**Purpose**: Deliver `tagteam.ttl` schema, v1 Wh-word entity support, and v2 config plumbing.

### 0.1 What Gets Built

Three deliverables:

1. **`ontology/tagteam-v2.ttl`** — OWL ontology defining all v2 classes, properties, and individuals. All v2 output must validate against this schema.
2. **v1 Wh-word pseudo-entities** — Modify `EntityExtractor.js` so v1 accepts Wh-words (`who`, `what`, `which`, `where`, `when`) as valid entity inputs with interrogative definiteness.
3. **v2 config API** — Add `v2` option namespace to `SemanticGraphBuilder` so features can be toggled.

### 0.2 Files to Create

| File | Purpose |
|------|---------|
| `ontology/tagteam-v2.ttl` | OWL schema for v2 classes/properties |
| `tests/unit/v2/tagteam-ttl.test.js` | Schema validation tests |
| `tests/unit/v2/wh-pseudo-entities.test.js` | Wh-word entity recognition tests |

### 0.3 Files to Modify

| File | Change |
|------|--------|
| `src/graph/EntityExtractor.js` | Add `WH_PSEUDO_ENTITIES` lookup; recognize Wh-words as entities with `definiteness: "interrogative"` |
| `src/graph/SemanticGraphBuilder.js` | Accept `v2: { enabled, clauseSegmentation, speechActNodes, discourse }` in build options |

### 0.4 Acceptance Criteria (Tests)

**tagteam.ttl schema:**

| Test ID | Test | Assertion |
|---------|------|-----------|
| P0-TTL-1 | `tagteam.ttl` parses without error via TurtleParser | No parse errors |
| P0-TTL-2 | Schema defines `tagteam:Inquiry`, `tagteam:DirectiveContent`, `tagteam:ConditionalContent`, `tagteam:ClauseRelation` | All classes present |
| P0-TTL-3 | Schema defines `tagteam:and_then`, `tagteam:therefore`, `tagteam:in_order_that`, `tagteam:contrasts_with` | All clause relation individuals present |
| P0-TTL-4 | Schema defines `tagteam:Interrogative` actuality status (others in core) | Present |
| P0-TTL-5 | Schema defines `tagteam:clauseIndex`, `tagteam:subjectSource`, `tagteam:whPhrase`, `tagteam:verbClass` properties | All properties present |

**Wh-word entity recognition:**

| Test ID | Test | Assertion |
|---------|------|-----------|
| P0-WH-1 | Build `"the auditor review which report"` (pre-normalized) | "which report" extracted as entity with `definiteness: "interrogative_selective"` |
| P0-WH-2 | Build `"who approved the budget"` (pre-normalized) | "who" extracted as `cco:Person` entity with `definiteness: "interrogative"` |
| P0-WH-3 | Build `"the committee decide what"` (pre-normalized) | "what" extracted as `bfo:Entity` with `definiteness: "interrogative"` |
| P0-WH-4 | Wh pseudo-entity type mapping | `who`/`whom` → `cco:Person`, `what` → `bfo:Entity`, `which` → `bfo:Entity`, `where` → `bfo:Site`, `when` → `bfo:TemporalRegion` |

**v2 config passthrough:**

| Test ID | Test | Assertion |
|---------|------|-----------|
| P0-CFG-1 | `build(text, { v2: { enabled: false } })` produces identical output to `build(text)` | JSON-identical |
| P0-CFG-2 | `build(text, { v2: { enabled: true } })` produces valid output (no errors) | No throw |

### 0.5 tagteam.ttl Schema Content

```turtle
@prefix : <http://tagteam.fandaws.org/ontology/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix cco: <https://www.commoncoreontologies.org/> .

<http://tagteam.fandaws.org/ontology/v2/> a owl:Ontology ;
    owl:versionInfo "2.0.0" ;
    owl:imports <http://tagteam.fandaws.org/ontology/core/> .

# Speech Act Classes (DirectiveContent is in core)
:SpeechAct rdfs:subClassOf cco:InformationContentEntity .
:Inquiry rdfs:subClassOf :SpeechAct .
:ConditionalContent rdfs:subClassOf :SpeechAct .
:ValueAssertionEvent rdfs:subClassOf :SpeechAct .

# Structural Classes
:ClauseRelation a owl:Class .
:CausativeAct rdfs:subClassOf cco:IntentionalAct .

# Actuality Status (Actual, Hypothetical, Prescribed, Negated in core)
:Interrogative a owl:NamedIndividual, :ActualityStatus .

# Clause Relation Type Individuals
:and_then a owl:NamedIndividual .
:therefore a owl:NamedIndividual .
:in_order_that a owl:NamedIndividual .
:contrasts_with a owl:NamedIndividual .
:alternative_to a owl:NamedIndividual .

# Temporal Relation Individuals
:precedes a owl:NamedIndividual .
:follows a owl:NamedIndividual .
:simultaneous_with a owl:NamedIndividual .

# Properties (corefersWith is in core)
:clauseIndex a owl:DatatypeProperty .
:subjectSource a owl:DatatypeProperty .
:whPhrase a owl:DatatypeProperty .
:verbClass a owl:DatatypeProperty .
:epistemicStatus a owl:DatatypeProperty .
:isQuestionFocus a owl:DatatypeProperty .
:structuralAmbiguity a owl:AnnotationProperty .

# Clause Relation Properties
:relationType a owl:ObjectProperty .
:fromClause a owl:ObjectProperty .
:toClause a owl:ObjectProperty .
:has_antecedent a owl:ObjectProperty .
:has_consequent a owl:ObjectProperty .
:has_cause a owl:ObjectProperty .
```

---

## Phase 1: v2 Pipeline Scaffold

**Milestone**: None (infrastructure — no user-facing demo)
**Purpose**: Create the v2 structural layer that wraps v1 without changing any behavior.

### 1.1 What Gets Built

`ClauseSegmenter.js` (returns single clause — no-op) and integration into `SemanticGraphBuilder.build()`. Proves the plumbing works without changing output.

### 1.2 Files to Create

| File | Purpose |
|------|---------|
| `src/graph/ClauseSegmenter.js` | Clause boundary detection module (no-op in this phase) |
| `tests/unit/v2/clause-segmenter.test.js` | Unit tests |

### 1.3 Files to Modify

| File | Change |
|------|--------|
| `src/graph/SemanticGraphBuilder.js` | Call `ClauseSegmenter.segment(text)` early in `build()` when `v2.enabled`; pass clause boundaries to extractors via `buildOptions._clauses` |

### 1.4 Acceptance Criteria (Tests)

| Test ID | Test | Assertion |
|---------|------|-----------|
| P1-SCAFFOLD-1 | `segment("The doctor treated the patient.")` returns single clause | `clauses.length === 1`, `clauses[0].text === input` |
| P1-SCAFFOLD-2 | Clause shape: `{ text, start, end, index, conjunction, clauseType }` | All properties defined |
| P1-SCAFFOLD-3 | `build()` output is byte-identical to v1 for 10 golden sentences | JSON.stringify comparison |
| P1-SCAFFOLD-4 | Clause boundaries visible in `_debug` when `verbose: true` | `result._debug.clauses` present |

---

## Phase 2: Compound Sentence Segmentation (M-1)

**Milestone**: M-1 — Clause Segmentation & Compound Sentences
**Depends on**: Phase 1
**Spec Reference**: v2Spec §3.1.1–§3.1.5

### 2.1 What Gets Built

`ClauseSegmenter` detects clause boundaries using the three-case algorithm from v2Spec §3.1.2:

- **Case A**: Full clause coordination (`"X rebooted and Y restarted"`) → segment
- **Case B**: Elliptical clause coordination (`"X rebooted and was verified"`) → segment + inject left subject
- **Case C**: VP coordination (`"X rebooted and restarted"`) → do NOT segment

Plus "so" disambiguation (§3.1.3) and conjunction-to-relation mapping.

`ActExtractor._linkToEntities()` is modified to constrain entity-verb linking to within-clause scope.

### 2.2 Files to Modify

| File | Change |
|------|--------|
| `src/graph/ClauseSegmenter.js` | Implement three-case detection algorithm, "so" disambiguation, elliptical subject injection |
| `src/graph/ActExtractor.js` | Add `_getClauseForPosition(offset)` helper; modify `_linkToEntities()` to filter entities to same clause (~line 1524) |
| `src/graph/EntityExtractor.js` | Add `_getClauseForPosition(offset)` helper; modify `_findGoverningVerb()` to respect clause boundaries (~line 1288) |
| `src/graph/SemanticGraphBuilder.js` | After act extraction, create `tagteam:ClauseRelation` nodes for multi-clause sentences |

### 2.3 Acceptance Criteria (Tests)

```
tests/unit/v2/clause-segmenter.test.js (extend)
tests/unit/v2/compound-sentences.test.js
tests/unit/v2/so-disambiguation.test.js
tests/unit/v2/elliptical-subjects.test.js
```

**Case A — Full clause coordination:**

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P2-A-1 | `"The server rebooted and the application restarted."` | `clauses.length === 2`; clause[1].conjunction === "and" |
| P2-A-2 | `"The doctor examined the patient but the nurse disagreed."` | `clauses.length === 2`; clause[1].conjunction === "but" |
| P2-A-3 | `"The team won or the manager resigned."` | `clauses.length === 2`; conjunction === "or" |
| P2-A-4 | `"The server did not restart nor did the backup respond."` | `clauses.length === 2`; conjunction === "nor"; relation === `tagteam:alternative_to` |

**Case B — Elliptical clause coordination:**

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P2-B-1 | `"The server rebooted and was verified by the admin."` | `clauses.length === 2`; clause[1] has injected subject "The server" |
| P2-B-2 | `"The server rebooted and was verified by the admin."` | Graph: 2 acts; "server" is patient of both; `tagteam:subjectSource: "ellipsis_injection"` on verify act |
| P2-B-3 | `"The report was written and was approved."` | Elliptical: same voice but new clause (Case B per spec) |

**Case C — VP coordination (NO segmentation):**

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P2-C-1 | `"The server rebooted and restarted."` | `clauses.length === 1` (same verb form, shared subject) |
| P2-C-2 | `"The doctor and the nurse treated the patient."` | `clauses.length === 1` (NP conjunction) |
| P2-C-3 | `"The tall and experienced doctor treated the patient."` | `clauses.length === 1` (adjective conjunction) |

**"So" disambiguation (§3.1.3):**

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P2-SO-1 | `"The system was slow so the user refreshed."` | Relation: `tagteam:therefore` (Result — indicative, no modal) |
| P2-SO-2 | `"He worked late so he could finish."` | Relation: `tagteam:in_order_that` (Purpose — modal "could") |
| P2-SO-3 | `"He worked late so that he could finish."` | Relation: `tagteam:in_order_that` (Purpose — "so that") |
| P2-SO-4 | `"He left early so as to avoid traffic."` | Relation: `tagteam:in_order_that` (Purpose — "so as to") |

**Integration tests — graph output:**

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P2-INT-1 | `"The server rebooted and the application restarted."` | 2 act nodes; agent/patient clause-scoped; `tagteam:ClauseRelation` with `relationType: "tagteam:and_then"` |
| P2-INT-2 | `"The doctor examined the patient but the nurse disagreed."` | `relationType: "tagteam:contrasts_with"` |
| P2-INT-3 | `"The doctor treated the patient."` | 1 act, no ClauseRelation (passthrough) |

**Conjunction-to-relation mapping (per v1.3 spec):**

| Conjunction | Relation | Rationale |
|-------------|----------|-----------|
| `and` | `tagteam:and_then` | Sequential default ("He arrived and she left") |
| `but` | `tagteam:contrasts_with` | Adversative |
| `yet` | `tagteam:contrasts_with` | Adversative |
| `or` | `tagteam:alternative_to` | Disjunctive |
| `nor` | `tagteam:alternative_to` | Negative disjunctive |
| `so` (no modal) | `tagteam:therefore` | Result |
| `so` (modal) | `tagteam:in_order_that` | Purpose |

**Ergative compound (ENH-008, absorbed):**

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P2-ERG-1 | `"The server rebooted and the app restarted."` | Both subjects are patients (ergative per clause) |
| P2-ERG-2 | `"The admin rebooted the server."` | Admin is agent (transitive) |

**Fallback behavior (§2.4):**

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P2-FALL-1 | Ambiguous coordination case | `tagteam:structuralAmbiguity` annotation present; output still valid |

### 2.4 Implementation Notes

**Entity-verb linking change in `ActExtractor._linkToEntities()`** (~line 1524):

```javascript
const verbClauseIdx = this._getClauseForPosition(verbOffset, options._clauses);
referents.forEach(entity => {
  const entityOffset = this._getEntityStart(entity);
  const entityClauseIdx = this._getClauseForPosition(entityOffset, options._clauses);
  if (entityClauseIdx !== verbClauseIdx) return; // Skip cross-clause entities
  // ... existing before/after partitioning
});
```

**Voice/auxiliary change detection** (Case B vs C):
- If right side starts with `was/were/been` + past participle → voice change → Case B
- If right side starts with bare verb in same tense → Case C

---

## Phase 3: Temporal Clause Linking (M-2)

**Milestone**: M-2 — Temporal Clause Linking
**Depends on**: Phase 2
**Spec Reference**: v2Spec §3.1 (subordinate clauses)

### 3.1 What Gets Built

`ClauseSegmenter` extended for temporal subordinating conjunctions. `tagteam:temporalRelation` links created between clause acts.

### 3.2 Files to Modify

| File | Change |
|------|--------|
| `src/graph/ClauseSegmenter.js` | Add temporal subordinate clause detection |
| `src/graph/SemanticGraphBuilder.js` | Create temporal relation links for temporal clause pairs |

### 3.3 Acceptance Criteria (Tests)

```
tests/unit/v2/temporal-clauses.test.js
```

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P3-TC-1 | `"When the alarm sounded, the guards responded."` | 2 acts; `tagteam:temporalRelation: "precedes"` from alarm to guard |
| P3-TC-2 | `"The team celebrated after the project launched."` | `tagteam:temporalRelation: "follows"` |
| P3-TC-3 | `"The nurse monitored the patient while the doctor operated."` | `tagteam:temporalRelation: "simultaneous_with"` |
| P3-TC-4 | `"Before the surgery began, the team reviewed the plan."` | Review `precedes` surgery |
| P3-TC-5 | `"The system waited until the user responded."` | Wait `precedes` respond |
| P3-TC-6 | `"The doctor treated the patient."` | 1 act, no temporal relation (passthrough) |
| P3-TC-9 | `"When demand increases, expand capacity."` | ConditionalContent, NOT temporal (imperative consequent → conditional per §3.2.4) |
| P3-TC-10 | `"When the alarm sounded, the guards responded."` | Temporal (both clauses indicative past → temporal) |
| P3-TC-7 | Both acts: `tagteam:actualityStatus: "tagteam:Actual"` | Events happened |
| P3-TC-8 | Agent/patient scoped per clause | "alarm" → "sounded", "guards" → "responded" |

**Temporal conjunction mapping:**

| Conjunction | Relation | Rationale |
|-------------|----------|-----------|
| `when` | `tagteam:simultaneous_with` | Default temporal (but see Phase 3 note on conditional disambiguation) |
| `while` | `tagteam:simultaneous_with` | Concurrent events |
| `before` | `tagteam:precedes` | Main clause precedes subordinate |
| `after` | `tagteam:follows` | Main clause follows subordinate |
| `until` | `tagteam:precedes` | Main clause continues up to subordinate event |
| `since` | `tagteam:follows` | Main clause follows subordinate onset |
| `as soon as` | `tagteam:follows` | Immediate succession |
| `once` | `tagteam:follows` | Subordinate triggers main |

---

## Phase 4: Wh-Movement & Structural Normalization (M-5)

**Milestone**: M-5 — Wh-Movement & Structural Normalization
**Depends on**: Phase 0 (Wh pseudo-entities), Phase 2 (clause infrastructure)
**Spec Reference**: v2Spec §3.3.2 (Wh-movement), §3.3.3 (Expletive subjects)

### 4.1 What Gets Built

A `StructuralNormalizer.js` that rewrites Wh-questions and expletive-subject constructions into canonical SVO order. Includes **negation preservation** from contracted auxiliaries.

### 4.2 Files to Create

| File | Purpose |
|------|---------|
| `src/graph/StructuralNormalizer.js` | Rewrites non-canonical word orders to SVO |
| `tests/unit/v2/wh-movement.test.js` | Wh-question tests including negation |
| `tests/unit/v2/expletive-subjects.test.js` | Expletive "It" with referential disambiguation |

### 4.3 Files to Modify

| File | Change |
|------|--------|
| `src/graph/SemanticGraphBuilder.js` | Call `StructuralNormalizer.normalize()` after clause segmentation, before entity/act extraction |

### 4.4 Acceptance Criteria (Tests)

**Wh-movement (ENH-014):**

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P4-WH-1 | `"Which report did the auditor review?"` | "auditor" = agent, "report" = patient, verb = "review" |
| P4-WH-2 | `"Which report did the auditor review?"` | No act for auxiliary "did" |
| P4-WH-3 | `"Which report did the auditor review?"` | `v2Metadata.whPhrase: "which report"`, `whFunction: "object"` |
| P4-WH-4 | `"Who approved the budget?"` | "who" = agent (subject Wh), "budget" = patient |
| P4-WH-5 | `"What did the committee decide?"` | "committee" = agent, "what" = patient |

**Negation preservation (v1.3 §3.3.2):**

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P4-NEG-1 | `"Why didn't the server restart?"` | `actualityStatus` includes `"tagteam:Negated"` AND `"tagteam:Interrogative"` |
| P4-NEG-2 | `"Why didn't the server restart?"` | No act for "didn't"; verb = "restart" |
| P4-NEG-3 | `"Won't the committee approve?"` | Negation preserved; verb = "approve" |
| P4-NEG-4 | `"Did the committee approve?"` | NO negation (positive question) |

**Expletive subjects (ENH-016) — with referential "It" disambiguation (v1.3 §3.3.3):**

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P4-EXP-1 | `"It is necessary that the system restart."` | No entity for "It"; deontic `obligation` from "necessary" |
| P4-EXP-2 | `"It is likely that the committee will approve."` | No entity for "It"; epistemic `probable` from "likely" |
| P4-EXP-3 | `"It is important that all staff attend."` | Deontic `high_priority_obligation` from "important" |
| P4-EXP-4 | `"It rained yesterday."` | "It" IS an entity (weather "it" is not expletive — no `adj + that` pattern) |
| P4-EXP-5 | `"It is clear that the policy failed."` | Expletive — evaluative adj + that-clause → no entity for "It" |

**Modal adjective mapping:**

| Adjective | Property | Type |
|-----------|----------|------|
| `necessary`, `required`, `essential`, `mandatory` | `obligation` | deontic |
| `important`, `critical`, `vital` | `high_priority_obligation` | deontic |
| `possible`, `likely`, `probable` | `probable` | epistemic |
| `unlikely`, `impossible` | `improbable` | epistemic |
| `clear`, `obvious` | evaluative → expletive, no modal mapping | — |

---

## Phase 5: Speech Act ICE Nodes — Question & Conditional (M-4, Part 1)

**Milestone**: M-4 (partial — Question + Conditional only for v2.0 MVP)
**Depends on**: Phase 2 (conditionals need clause segmentation), Phase 4 (Wh-questions)
**Spec Reference**: v2Spec §3.2.1, §3.2.4

### 5.1 What Gets Built

`SpeechActClassifier.js` creates ICE wrapper nodes for interrogatives and conditionals.

### 5.2 Files to Create

| File | Purpose |
|------|---------|
| `src/graph/SpeechActClassifier.js` | Creates ICE wrapper nodes by sentence mood |
| `tests/unit/v2/speech-act-ice.test.js` | Tests for Question + Conditional ICE |

### 5.3 Acceptance Criteria (Tests)

**Question ICE (ENH-002):**

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P5-Q-1 | `"Did the committee approve the budget?"` | `tagteam:Inquiry` node with `cco:is_about` → approve act |
| P5-Q-2 | `"Did the committee approve the budget?"` | Act retains `tagteam:actualityStatus: "tagteam:Interrogative"` |
| P5-Q-3 | `"Which report did the auditor review?"` | Inquiry node; act has `cco:affects` with `tagteam:isQuestionFocus: true` (Wh-focus) |
| P5-Q-4 | `"Who approved the budget?"` | Inquiry node (subject Wh) |
| P5-Q-5 | `"Is the patient stable?"` | Inquiry node (yes/no, stative) |
| P5-Q-6 | `"They approved, didn't they?"` | Inquiry node (tag question per v1.3 §3.2.1) |

> **Tag question detection**: Implemented in `SpeechActClassifier` via regex pattern matching for comma + auxiliary + pronoun + `?` at sentence end (e.g., `, didn't they?`, `, isn't it?`, `, won't we?`). The tag itself is stripped; the main clause is classified as interrogative.

**Conditional ICE (ENH-006):**

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P5-C-1 | `"If demand increases, expand capacity."` | `tagteam:ConditionalContent` with `has_antecedent` → increase, `has_consequent` → expand |
| P5-C-2 | `"If demand increases, expand capacity."` | Antecedent: `actualityStatus: "tagteam:Hypothetical"` |
| P5-C-3 | `"If demand increases, expand capacity."` | Consequent: `actualityStatus: "tagteam:Prescribed"` |
| P5-C-4 | `"Unless the patient consents, do not proceed."` | ConditionalContent present |

**Declarative passthrough:**

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P5-P-1 | `"The doctor treated the patient."` | No Inquiry or ConditionalContent nodes |

---

## Phase 6: v2.0 MVP Validation Gate

**Milestone**: v2.0 MVP exit criteria
**Purpose**: Verify all v2.0 features work together and output validates against `tagteam.ttl`.

### 6.1 Acceptance Criteria

| Test ID | Test | Assertion |
|---------|------|-----------|
| P6-MVP-1 | All v2 outputs validate against `tagteam.ttl` schema | Every node type and property in output exists in schema |
| P6-MVP-2 | Elliptical subject injection >85% accuracy | Test on 20-sentence corpus |
| P6-MVP-3 | "So" disambiguation >85% accuracy | Test on 10 "so" sentences |
| P6-MVP-4 | Negated questions >95% accuracy | Test on 10 negated questions |
| P6-MVP-5 | `npm test` passes (full v1 regression) | All existing tests green |
| P6-MVP-6 | `npm run security:test` passes | All 41 security tests green |
| P6-MVP-7 | Performance: v2 latency < 2x v1 latency | Benchmark on 100 sentences |

**Milestone coverage checklist** — verify each milestone demo scenario from v2Milestones.md passes:

| Check | Milestone | Demo Scenario |
|-------|-----------|---------------|
| P6-MC-1 | M-0 | `tagteam.ttl` parses; Wh-entities recognized; v2 config accepted |
| P6-MC-2 | M-1 | Compound sentence segmented with correct clause relations |
| P6-MC-3 | M-2 | Temporal clause linking with correct temporal relations |
| P6-MC-4 | M-4 (pt1) | Question + Conditional ICE nodes produced |
| P6-MC-5 | M-5 (basic) | Wh-movement normalized; expletive "It" handled |

---

## Phase 7: Verb Class Routing — Psych-Verbs (M-3, Part 1)

**Milestone**: M-3 (psych-verbs)
**Depends on**: Phase 0 only (independent of clause segmentation)
**Release**: v2.1
**Spec Reference**: v2Spec §3.3.1

### 7.1 What Gets Built

`VerbClassRegistry.js` and psych-verb routing in `ActExtractor`. Per v1.3 spec, psych-verbs produce `cco:MentalProcess` (not `cco:IntentionalAct`). The Experiencer IS the agent (CCO requires MentalProcess to have an agent). The Stimulus is linked via `tagteam:has_cause`.

### 7.2 Files to Create

| File | Purpose |
|------|---------|
| `src/graph/VerbClassRegistry.js` | Central registry for verb class lookups |
| `tests/unit/v2/verb-class-registry.test.js` | Unit tests for registry |
| `tests/unit/v2/psych-verbs.test.js` | Integration tests |

### 7.3 Files to Modify

| File | Change |
|------|--------|
| `src/graph/ActExtractor.js` | After entity-verb linking, check verb class. If psych-verb: remap to `cco:MentalProcess`, subject → `has_cause`, object → `has_agent` |
| `src/graph/RoleDetector.js` | Handle `has_cause` links for role creation |

### 7.4 Acceptance Criteria (Tests)

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P7-PSY-1 | `"The failure worried the administrator."` | Act `@type: "cco:MentalProcess"` (not IntentionalAct) |
| P7-PSY-2 | `"The failure worried the administrator."` | `cco:has_agent` → administrator (Experiencer IS agent per CCO) |
| P7-PSY-3 | `"The failure worried the administrator."` | `tagteam:has_cause` → failure (Stimulus, NOT has_agent) |
| P7-PSY-4 | `"The failure worried the administrator."` | `tagteam:verbClass: "psych_verb"` |
| P7-PSY-5 | `"The news surprised the team."` | Same pattern: team = agent, news = cause |
| P7-PSY-6 | `"The doctor treated the patient."` | Normal IntentionalAct (non-psych verb unaffected) |
| P7-PSY-7 | All 20 MVP PSYCH_VERBS in registry | worry, surprise, frighten, concern, alarm, disturb, shock, confuse, puzzle, annoy, irritate, please, delight, amuse, bore, interest, fascinate, terrify, horrify, embarrass |

> **Psych-verb coverage**: The 20-verb MVP list covers the most frequent Experiencer-object psych-verbs. The `VerbClassRegistry` is designed for extension — a production deployment should target 40+ verbs (adding: astonish, astound, bewilder, captivate, charm, comfort, convince, dazzle, depress, disappoint, discourage, dishearten, dismay, enchant, encourage, engage, entertain, excite, exhaust, exhilarate, frustrate, gratify, humiliate, impress, inspire, intimidate, intrigue, motivate, mystify, offend, outrage, overwhelm, perplex, provoke, reassure, repel, sadden, satisfy, scare, startle, stimulate, stun, thrill, torment, trouble, unnerve, upset). Expansion is additive-only and does not require architectural changes.

**Output structure per v1.3 §3.3.1:**
```json
{
  "@type": "cco:MentalProcess",
  "@id": "inst:Worry_Process_001",
  "cco:has_agent": { "@id": "inst:Administrator_001" },
  "tagteam:has_cause": { "@id": "inst:Failure_001" },
  "tagteam:verbClass": "psych_verb"
}
```

---

## Phase 8: Verb Class Routing — Raising Verbs (M-3, Part 2)

**Milestone**: M-3 (raising verbs)
**Depends on**: Phase 7 (VerbClassRegistry exists)
**Release**: v2.1

### 8.1 Acceptance Criteria (Tests)

```
tests/unit/v2/raising-verbs.test.js
```

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P8-RAISE-1 | `"The engineer seems to understand the problem."` | Single act for "understand" (no act for "seems") |
| P8-RAISE-2 | `"The engineer seems to understand the problem."` | "engineer" = agent of "understand" |
| P8-RAISE-3 | `"The engineer seems to understand the problem."` | `tagteam:epistemicStatus: "apparent"` |
| P8-RAISE-4 | `"The system appears to malfunction."` | Act for "malfunction"; `epistemicStatus: "apparent"` |
| P8-RAISE-5 | `"The process tends to fail under load."` | `epistemicStatus: "tendency"` |
| P8-RAISE-6 | `"The doctor treated the patient."` | Normal act (unaffected) |

---

## Phase 9: Verb Class Routing — Causatives (M-3, Part 3)

**Milestone**: M-3 (causatives)
**Depends on**: Phase 7 (VerbClassRegistry exists)
**Release**: v2.1

### 9.1 Acceptance Criteria (Tests)

```
tests/unit/v2/causatives.test.js
```

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P9-CAUS-1 | `"The manager had the team revise the document."` | 2 act nodes |
| P9-CAUS-2 | `"The manager had the team revise the document."` | Directive act: `cco:has_agent` → manager |
| P9-CAUS-3 | `"The manager had the team revise the document."` | Semantic act: `cco:has_agent` → team, verb = "revise" |
| P9-CAUS-4 | `"The manager had the team revise the document."` | `tagteam:causes` link from directive → semantic |
| P9-CAUS-5 | `"The team had revised the document."` | 1 act (past perfect, NOT causative) |
| P9-CAUS-6 | `"The teacher made the students rewrite the essay."` | 2 acts |
| P9-CAUS-7 | `"The guard let the visitor enter."` | 2 acts |

---

## Phase 10: Speech Act ICE Nodes — Directive & Exclamatory (M-4, Part 2)

**Milestone**: M-4 (remaining ICE types)
**Depends on**: Phase 5
**Release**: v2.1
**Spec Reference**: v2Spec §3.2.2 (with homonym handling), §3.2.3

### 10.1 Acceptance Criteria (Tests)

**Directive ICE with homonym handling (v1.3 §3.2.2):**

```
tests/unit/v2/directive-ice.test.js
tests/unit/v2/directive-homonyms.test.js
```

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P10-D-1 | `"Submit the report by Friday."` | `tagteam:DirectiveContent` node present |
| P10-D-2 | `"Submit the report by Friday."` | Directive has `cco:is_about` → submit act |
| P10-D-3 | `"Submit the report by Friday."` | Act has implicit "you" agent |
| P10-D-4 | `"Monitor the port."` | DirectiveContent present (imperative — DET+NOUN follows verb) |
| P10-D-5 | `"Monitor lizards are reptiles."` | NO DirectiveContent (declarative — noun subject follows) |
| P10-D-6 | `"List: eggs, milk, bread"` | NO DirectiveContent (colon pattern — label, not imperative) |
| P10-D-7 | `"List the files."` | DirectiveContent present (DET+NOUN follows) |

**Exclamatory ICE (ENH-005):**

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P10-E-1 | `"What a disaster the launch was!"` | `tagteam:ValueAssertionEvent` node present |
| P10-E-2 | `"What a disaster the launch was!"` | `cco:is_about` → launch entity |
| P10-E-3 | `"What a disaster the launch was!"` | `bfo:has_quality` → disaster quality |
| P10-E-4 | `"The doctor treated the patient."` | No ValueAssertionEvent (declarative) |

---

## Phase 11: Expletive Subject — Referential "It" (M-5, extension)

**Milestone**: M-5 extension for v2.1
**Depends on**: Phase 4 (basic expletive handling), Phase 12 (discourse memory)
**Release**: v2.1
**Spec Reference**: v2Spec §3.3.3 decision tree

### 11.1 What Gets Built

Full "It" disambiguation per the v1.3 decision tree: physical adjectives + prior discourse referent → referential "It". This requires the discourse tracker from Phase 12.

> **Execution order**: Despite its numbering, Phase 11 runs **after** Phase 12. It is numbered 11 because it extends Phase 4's expletive handling (M-5), but its dependency on `DiscourseTracker` (Phase 12) means it cannot begin until sessions are implemented. See Track D in the parallel tracks diagram.

### 11.2 Acceptance Criteria (Tests)

```
tests/unit/v2/expletive-it.test.js
```

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P11-IT-1 | Session: `"The server is heavy."` then `"It is hard to move."` | "It" resolves to server (physical adj + prior referent) |
| P11-IT-2 | `"It is necessary that X restart."` | Expletive (evaluative adj + that-clause — always expletive) |
| P11-IT-3 | `"It is hard to understand."` (no prior referent) | Expletive (physical adj + to-infinitive + no referent) |
| P11-IT-4 | `"The server is heavy. It is hard to move."` | "It" is REFERENTIAL — resolves to server (physical adj + prior referent per v1.3 decision tree) |

---

## Phase 12: Discourse Memory — Concurrency-Safe Sessions (M-6, Part 1)

**Milestone**: M-6 (discourse infrastructure)
**Release**: v2.2
**Spec Reference**: v2Spec §3.4.1–§3.4.2

### 12.1 What Gets Built

`DiscourseTracker.js` with session-based isolation. `TagTeamBuilder.createSession()` API per v1.3 §7.2.

### 12.2 Files to Create

| File | Purpose |
|------|---------|
| `src/graph/DiscourseTracker.js` | Session-scoped discourse state |
| `tests/unit/v2/discourse-sessions.test.js` | Session isolation tests |
| `tests/unit/v2/concurrency.test.js` | 100 parallel sessions, no leakage |

### 12.3 Acceptance Criteria (Tests)

**Session API:**

| Test ID | Test | Assertion |
|---------|------|-----------|
| P12-SESS-1 | `createSession()` returns session with `build()` and `finalize()` | Methods exist |
| P12-SESS-2 | `session.build("S1."); session.build("S2."); session.finalize()` | Returns combined graph |
| P12-SESS-3 | Session A and Session B have independent state | Session A's entities don't appear in Session B |

**Concurrency:**

| Test ID | Test | Assertion |
|---------|------|-----------|
| P12-CONC-1 | 100 parallel sessions with different inputs | No cross-session entity leakage |
| P12-CONC-2 | Sessions can be garbage collected after finalize | No memory leak |
| P12-CONC-3 | Session A builds while Session B builds (interleaved) | Both produce correct, independent graphs |
| P12-CONC-4 | `finalize()` on already-finalized session | Throws descriptive error (not silent corruption) |
| P12-CONC-5 | `build()` after `finalize()` | Throws descriptive error |
| P12-CONC-6 | 100 parallel sessions: entity counts match sequential runs | Deterministic output regardless of scheduling |
| P12-CONC-7 | Session with 50 sequential `build()` calls | Memory grows linearly, not exponentially |

---

## Phase 13: Discourse Memory — Anaphora & Clausal Subjects (M-6, Part 2)

**Milestone**: M-6 (anaphora + clausal subjects)
**Depends on**: Phase 12 (discourse tracker), Phase 7 (psych-verbs for clausal subject demo)
**Release**: v2.2

### 13.1 Acceptance Criteria (Tests)

**Abstract anaphora (ENH-010):**

```
tests/unit/v2/abstract-anaphora.test.js
```

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P13-ANA-1 | Session: `"The server failed."` then `"The administrator logged the event."` | "the event" → `tagteam:corefersWith` → fail act |
| P13-ANA-2 | Single sentence: `"When the alarm sounded, the guards responded and the system logged the event."` | "the event" resolves to preceding acts (intra-sentence) |
| P13-ANA-3 | `"An event occurred yesterday."` | "event" creates normal entity (indefinite, no resolution) |
| P13-ANA-4 | Anaphoric nouns covered: `the event`, `the incident`, `the situation`, `the occurrence`, `the problem`, `the issue` | All resolve when preceded by acts |

**Clausal subjects (ENH-011):**

```
tests/unit/v2/clausal-subjects.test.js
```

| Test ID | Input | Assertion |
|---------|-------|-----------|
| P13-CS-1 | `"The fact that the server failed worried the administrator."` | "server" = agent of "failed", NOT of "worried" |
| P13-CS-2 | `"The fact that the server failed worried the administrator."` | "failed" process = `tagteam:has_cause` of "worried" (psych-verb integration) |
| P13-CS-3 | `"The fact that the server failed worried the administrator."` | "administrator" = `cco:has_agent` of "worried" (Experiencer is agent per CCO) |
| P13-CS-4 | `"The idea that costs would rise concerned the board."` | Correct parsing |

---

## Known Limitations

These are deliberate scope boundaries for the v2.0–v2.2 implementation:

| Limitation | Rationale | Potential Future Work |
|------------|-----------|----------------------|
| **20-verb psych-verb MVP list** | Sufficient for validation; registry is extensible | Expand to 60+ verbs in v2.1 patch |
| **No relative clause handling** | No spec section written yet (ENH-018 deferred) | Requires its own spec + milestone before implementation |
| **Single-sentence anaphora window** | Cross-sentence resolution requires discourse tracker (Phase 12) | Phases 11+13 extend to multi-sentence |
| **No garden-path recovery** | Ambiguous parses get `structuralAmbiguity` annotation but no re-parse | Could add backtracking parser in v2.3+ |
| **Tag question detection via regex** | Covers standard English tag patterns; non-standard forms may miss | Could integrate POS-based detection |
| **"When" disambiguation is heuristic** | Uses mood/tense of consequent clause; edge cases exist | Could add corpus-trained classifier |
| **No indirect speech acts** | "Can you pass the salt?" treated as question, not directive | Requires pragmatic inference layer |

---

## Deferred to v2.3+

| Feature | Reason | Spec Reference |
|---------|--------|---------------|
| **ENH-018 Relative Clauses** | Not in v2Spec v1.3 milestones; added to Tier 3 dependency graph but no spec section written | v2Spec §5 (mentioned in dependency graph only) |
| **Phase 7.1 Source Attribution Expanded** | Independent, lower priority | v2Spec §3.5.1 |
| **Phase 7.3 Temporal Grounding** | Independent, self-contained | v2Spec §3.5.2 |
| **Phase 11 Domain Expansion** | Config-only, independent | v2Spec §3.8 |
| **Phase 10 Human Validation Loop** | Requires IEE team input | v2Spec §3.7 |
| **Phase 8.1/8.2 Disambiguation** | Not independently demonstrable | v2Milestones rejected items |

These features can be implemented at any time without blocking the v2.0–v2.2 track. They should get their own implementation plan when prioritized.

---

## Execution Summary

### v2.0 MVP (Q2 2026)

| Phase | Milestone | New Files | Test Count |
|-------|-----------|-----------|------------|
| 0 | M-0 (prereqs) | 3 | 11 |
| 1 | (scaffold) | 2 | 4 |
| 2 | M-1 | 3 | 23 |
| 3 | M-2 | 1 | 10 |
| 4 | M-5 | 3 | 15 |
| 5 | M-4 (pt1) | 2 | 11 |
| 6 | (gate) | 0 | 12 |
| **Subtotal** | | **14** | **86** |

### v2.1 (Q3 2026)

| Phase | Milestone | New Files | Test Count |
|-------|-----------|-----------|------------|
| 7 | M-3 (psych) | 3 | 7 |
| 8 | M-3 (raising) | 1 | 6 |
| 9 | M-3 (causative) | 1 | 7 |
| 10 | M-4 (pt2) | 2 | 11 |
| 11 | M-5 (ext) | 1 | 4 |
| **Subtotal** | | **8** | **35** |

### v2.2 (Q4 2026)

| Phase | Milestone | New Files | Test Count |
|-------|-----------|-----------|------------|
| 12 | M-6 (sessions) | 3 | 10 |
| 13 | M-6 (anaphora) | 2 | 8 |
| **Subtotal** | | **5** | **18** |

### Integration Test Files

In addition to unit tests, cross-phase integration tests verify end-to-end behavior:

| File | Phases Covered | Purpose |
|------|---------------|---------|
| `tests/integration/v2/compound-to-ice.test.js` | 2 + 5 | Compound sentences with question/conditional ICE |
| `tests/integration/v2/temporal-to-ice.test.js` | 3 + 5 | Temporal clauses with conditional "when" disambiguation |
| `tests/integration/v2/wh-to-ice.test.js` | 4 + 5 | Wh-movement feeding into Inquiry ICE nodes |
| `tests/integration/v2/psych-verb-clausal.test.js` | 7 + 13 | Psych-verbs with clausal subjects |
| `tests/integration/v2/discourse-anaphora.test.js` | 12 + 13 + 11 | Multi-sentence discourse with anaphora and referential "It" |
| `tests/integration/v2/full-pipeline.test.js` | All | 20-sentence golden corpus validating complete v2 pipeline |

### Grand Total: **33 new files** (27 unit + 6 integration), **139 unit tests + integration suites**

### Parallel Tracks

```
Track A (critical path — v2.0 MVP):
  Phase 0 → 1 → 2 → 3 → 5 → 6

Track B (structural normalization — v2.0 MVP):
  Phase 0 → 4 → 5 (converges with Track A)

Track C (verb classes — v2.1):
  Phase 0 → 7 → 8 → 9

Track D (discourse — v2.2):
  Phase 7 + Phase 2 → 12 → 13 → 11
```

### Regression Gate (Every Phase)

After every phase:
1. `npm test` — all existing integration tests
2. `npm run security:test` — all 41 security tests
3. `node tests/unit/verbose-pos.test.js` — verbose diagnostic mode
4. All new v2 tests for completed phases
5. **Schema validation**: All v2 output node types and properties validate against `ontology/tagteam-v2.ttl` — run `tests/unit/v2/tagteam-ttl.test.js` which checks that every `@type`, property key, and named individual in output exists in the schema. This catches drift between implementation and ontology.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-01 | Initial v2 implementation plan |
| 2.0.0 | 2026-02-01 | Rewritten to align with v2Spec v1.3: added tagteam.ttl schema phase, Wh-pseudo-entities prerequisite, elliptical subject injection, "so" disambiguation, negation preservation, CCO-compliant psych-verb mapping, imperative homonym handling, referential "It" disambiguation, concurrency-safe sessions, `and` → `and_then` fix, relative clauses deferred |
| 2.1.0 | 2026-02-01 | Review fixes: moved P4-EXP-5 to Phase 11 (discourse dependency), added Phase 11 execution order note, tag question detection note, `nor` test P2-A-4, temporal conjunction mapping table (until/since/as soon as), psych-verb expansion note (20→60+), "when" temporal vs conditional disambiguation tests, Phase 6 milestone coverage checklist, expanded concurrency tests (5→10), schema validation in regression gate. Added Known Limitations section, integration test files (6 cross-phase suites). Updated test counts: 33 new files (27 unit + 6 integration), 139 unit tests |
| 2.2.0 | 2026-02-01 | Pre-v2 preparatory changes: schema path corrected from `ontologies/tagteam.ttl` to `ontology/tagteam-v2.ttl` (colocated with v1 schema), added build script requirement note (hardcoded paths — manual registration required), v2 source files confirmed flat in `src/graph/` |
