# TagTeam.js v2 Milestones

**Source**: [v2Spec.md](v2Spec.md) (v1.3)
**Date**: 2026-02-01
**Version**: 2.0
**Principle**: Every milestone must be demonstrable with real inputs and observable outputs. If it cannot be demoed, it is split or rejected below.

**Release Alignment**:

| Release | Milestones | Target |
|---------|-----------|--------|
| **v2.0 MVP** | M-0, M-1, M-2, M-3, M-4 | Q2 2026 |
| **v2.1** | M-5, M-6 | Q3 2026 |
| **v2.2** | M-7, M-8 | Q4 2026 |
| **v2.3+** | M-9, M-10, M-11 | 2027+ |

---

## Rejected / Deferred Items

The following spec items are **not milestones** because they cannot be independently demonstrated:

| Spec Section | Item | Reason | Disposition |
|-------------|------|--------|-------------|
| §3.1.1 | ENH-008 Ergative Compound | No new logic — automatically resolved by clause segmentation (ENH-007). Verified as acceptance criteria within M-1. | **Absorbed into M-1** |
| §5 | Phase 8.1 Noun Ambiguity | "Improves over v1 defaults" is not a discrete demo. Context-dependent noun typing is an incremental accuracy gain with no before/after toggle. | **Deferred to v2.3+ — needs measurable benchmark first** |
| §5 | Phase 8.2 Iterative Verb Refinement | Multi-pass is an internal optimization. Demo would show identical output to v1 for most inputs. No user-observable distinction. | **Deferred to v2.3+ — needs measurable benchmark first** |
| §5 | Phase 10 Human Validation Loop | Requires IEE team input that does not exist. Data model alone produces JSON nodes with no validation workflow to demo. | **Deferred until IEE provides validation workflow requirements** |
| §5 | ENH-018 Relative Clauses | Listed in dependency graph Tier 3 but no feature specification section written in v2Spec. Cannot milestone without spec. | **Deferred — needs spec section first** |

---

## M-0: Prerequisites & Schema

### Objective

v1 modifications and the `tagteam.ttl` OWL schema required before any v2 feature can ship.

### In-Scope

- **v1 Wh-word entity recognition** (§1.3.1): `WH_PSEUDO_ENTITIES` map (`who`, `whom`, `what`, `which`, `where`, `when`) added to v1's entity extraction
- **tagteam.ttl OWL schema** (§4): Formal ontology defining all v2 classes, properties, and individuals
- **v2 configuration API** (§7.1): `v2: { enabled, clauseSegmentation, speechActNodes, discourse }` options

### Out-of-Scope

- Any v2 processing logic — this is infrastructure only
- Discourse session API (`createSession`) — that ships with M-7

### Demo Scenario

1. Build `"The auditor reviewed the report."` with v2 enabled — show v1 output unchanged (no regression)
2. Show `WH_PSEUDO_ENTITIES` map accessible: `who` → `cco:Person`, `what` → `bfo:Entity`, `which` → `bfo:Entity`
3. Load `ontologies/tagteam.ttl` — show it parses as valid OWL with classes: `tagteam:Inquiry`, `tagteam:DirectiveContent`, `tagteam:ConditionalContent`, `tagteam:ClauseRelation`
4. Show v2 config toggles: `builder.options.v2.clauseSegmentation.enabled === true`

### Evidence Artifacts

- `ontologies/tagteam.ttl` — valid OWL, all v2 classes/properties defined per §4.2
- `tests/unit/wh-pseudo-entities.test.js` — v1 accepts Wh-words as entities
- `tests/unit/tagteam-ttl.test.js` — schema loads and validates
- v1 regression suite: `npm test` — no failures

### Traceability

- v2Spec.md §1.3 (v1 Modifications Required)
- v2Spec.md §4 (Ontology Schema: tagteam.ttl)
- v2Spec.md §7.1 (Configuration)

---

## M-1: Clause Segmentation & Compound Sentences

### Objective

Compound and coordinated sentences produce one correctly-scoped act per clause with inter-clause relationship links, including elliptical subject injection and "so" disambiguation.

### In-Scope

- **Three-case algorithm** (§3.1.2):
  - **Case A** (full clause coordination): Explicit subject + finite verb on both sides → segment into two clauses
  - **Case B** (elliptical coordination): No right subject + voice/auxiliary change → segment + inject left subject
  - **Case C** (VP coordination): No right subject + same verb form → do NOT segment (single clause, compound VP)
- **Conjunction-to-relationship mapping**: `and` → `tagteam:and_then`, `but` → `tagteam:contrasts_with`, `or` → `tagteam:alternative_to`
- **"So" disambiguation** (§3.1.3): `so that`/`so as to`/`so` + modal → `tagteam:in_order_that` (Purpose); `so` + indicative → `tagteam:therefore` (Result)
- **Elliptical subject injection** (§3.1.4): `tagteam:subjectSource: "ellipsis_injection"` metadata on injected subjects
- Ergative verbs in compound context resolve correctly per clause (ENH-008)
- `tagteam:clauseIndex` on each act node

### Out-of-Scope

- Subordinate clauses (temporal, conditional) — covered by M-2 and M-4
- Relative clauses ("the doctor who treated the patient") — deferred
- Lists of three or more clauses

### Demo Scenario

1. **Case A — Full coordination**: Build `"The server rebooted and the application restarted."`
   - Show: **two** act nodes with separate agents — "server" → "rebooted", "application" → "restarted"
   - Show: `tagteam:and_then` link between the two acts (NOT `simultaneous_with`)
2. **Case B — Elliptical**: Build `"The server rebooted and was verified by the administrator."`
   - Show: two acts — "rebooted" (server as patient) and "verified" (administrator as agent, server as patient)
   - Show: `tagteam:subjectSource: "ellipsis_injection"` on the second clause
   - Show: voice change (active → passive) triggered segmentation
3. **Case C — VP coordination**: Build `"The server rebooted and restarted."`
   - Show: single act with compound VP — NO segmentation
4. **Contrast**: Build `"The doctor examined the patient but the nurse disagreed."`
   - Show: `tagteam:contrasts_with` link and correct agent assignment
5. **"So" as Result**: Build `"The system was slow so the user refreshed the page."`
   - Show: `tagteam:therefore` link (indicative → Result)
6. **"So" as Purpose**: Build `"He worked late so he could finish the report."`
   - Show: `tagteam:in_order_that` link (modal "could" → Purpose)
7. **Passthrough**: Build `"The doctor examined the patient."` — single act, no clause link

### Evidence Artifacts

- Test suites: `tests/unit/clause-segmentation.test.js`, `tests/unit/elliptical-subjects.test.js`, `tests/unit/so-disambiguation.test.js` — all green
- JSON-LD output showing `tagteam:and_then`, `tagteam:contrasts_with`, `tagteam:therefore`, `tagteam:in_order_that`
- JSON-LD output showing `tagteam:subjectSource: "ellipsis_injection"` for Case B
- v1 regression suite: `npm test` — no failures

### Traceability

- v2Spec.md §3.1.1 (Coordination Type Detection)
- v2Spec.md §3.1.2 (Clause Boundary Detection Algorithm — Case A/B/C)
- v2Spec.md §3.1.3 ("So" Disambiguation)
- v2Spec.md §3.1.4 (Output Structure)
- v2Spec.md §3.1.5 (Acceptance Criteria — all 6)

---

## M-2: Temporal Clause Linking

### Objective

Sentences with temporal subordinating conjunctions produce two acts linked by the correct temporal relation.

### In-Scope

- Detection of `when`, `after`, `before`, `while`, `until`, `since`, `as soon as`
- Subordinate vs main clause identification
- `tagteam:temporalRelation` link with correct type (`precedes`, `follows`, `simultaneous_with`)

### Out-of-Scope

- Temporal grounding to calendar dates (M-10)
- Complex temporal chains ("after X but before Y")
- Conditional "when" (`when` meaning `if`) — covered by M-4

### Demo Scenario

1. Build graph for: `"When the alarm sounded, the guards responded."`
   - Show: two act nodes: "sounded" and "responded" with separate agents
   - Show: `tagteam:temporalRelation: "precedes"` linking alarm → guards
2. Build graph for: `"The team celebrated after the project launched."`
   - Show: `tagteam:temporalRelation: "follows"` linking celebrated → launched
3. Build graph for: `"The nurse monitored the patient while the doctor operated."`
   - Show: `tagteam:temporalRelation: "simultaneous_with"`

### Evidence Artifacts

- Test suite: `tests/unit/temporal-clauses.test.js` — all green
- JSON-LD output showing `tagteam:temporalRelation` with correct values
- v1 regression suite: no failures

### Traceability

- v2Spec.md §3.1.3 (ENH-009) — all 3 acceptance criteria

---

## M-3: Wh-Movement & Structural Normalization

### Objective

Wh-questions are structurally normalized before semantic compilation, producing correct role assignments. Negation in contracted auxiliaries is preserved.

### In-Scope

- **Wh-movement normalization** (§3.3.2): Fronted Wh-NP identified as patient, intervening NP as agent, split verb reconstituted, auxiliary discarded
- **Negation preservation** (§3.3.2): Contracted auxiliaries (`didn't`, `won't`, `can't`) → `tagteam:Negated` actuality status preserved alongside `tagteam:Interrogative`
- **v2Metadata handoff**: `whPhrase`, `whFunction`, `headNoun`, `negation` fields passed to v1

### Out-of-Scope

- Indirect questions ("I wonder who called")
- Cleft constructions ("It was the doctor who treated the patient")
- Wh-movement in relative clauses
- Expletive subject detection — moved to M-6

### Demo Scenario

1. **Wh-object question**: Build `"Which report did the auditor review?"`
   - Show: "auditor" is agent, "report" is patient, verb is "review"
   - Show: no act for auxiliary "did"
   - Show: `tagteam:Inquiry` ICE node wrapping the act (integration with M-4)
2. **Wh-subject question**: Build `"Who approved the budget?"`
   - Show: "who" is agent (subject Wh, `cco:Person`), "budget" is patient
3. **Negated question**: Build `"Why didn't the server restart?"`
   - Show: `tagteam:actualityStatus: ["Interrogative", "Negative"]` — both preserved
   - Show: auxiliary "didn't" discarded but negation kept
4. **Negated Wh**: Build `"What won't the committee approve?"`
   - Show: "committee" is agent, "what" is patient, negation preserved

### Evidence Artifacts

- Test suites: `tests/unit/wh-movement.test.js`, `tests/unit/negated-questions.test.js` — all green
- JSON-LD output showing correct role assignments, no phantom auxiliary acts
- JSON-LD output showing dual actuality status `[Interrogative, Negative]`
- v1 regression suite: no failures

### Traceability

- v2Spec.md §3.3.2 (Wh-Movement & Do-Support — normalization + negation preservation)
- v2Spec.md §1.3.1 (Wh-Word Entity Recognition — prerequisite from M-0)

---

## M-4: Speech Act ICE Nodes — Questions & Conditionals

### Objective

Questions and conditional sentences produce dedicated ICE wrapper nodes that capture illocutionary force, in addition to the underlying semantic act. This is the **v2.0 MVP** ICE scope.

### In-Scope

- `tagteam:Inquiry` for interrogatives (ENH-002) — yes/no, Wh-object, Wh-subject, tag questions
- `tagteam:ConditionalContent` with `has_antecedent`/`has_consequent` for conditionals (ENH-006)
- Declarative passthrough (no ICE wrapper)

### Out-of-Scope

- `tagteam:DirectiveContent` for imperatives (ENH-004) — ships in M-6
- `tagteam:ValueAssertionEvent` for exclamations (ENH-005) — ships in M-6
- Indirect speech acts ("Can you pass the salt?" as directive)
- Rhetorical questions

### Demo Scenario

1. **Yes/no question**: Build `"Did the committee approve the budget?"`
   - Show: `tagteam:Inquiry` node with `cco:is_about` → the approve act
   - Show: act retains `tagteam:Interrogative` actuality
2. **Wh-question with ICE**: Build `"Which report did the auditor review?"`
   - Show: `tagteam:Inquiry` wrapping the normalized act from M-3
   - Show: `tagteam:isQuestionFocus: true` on the patient entity
3. **Conditional**: Build `"If demand increases, expand capacity."`
   - Show: `tagteam:ConditionalContent` with `has_antecedent` (increase, `tagteam:Hypothetical`) and `has_consequent` (expand, `tagteam:Prescribed`)
4. **Declarative**: Build `"The doctor treated the patient."` — show no ICE wrapper node

### Evidence Artifacts

- Test suite: `tests/unit/speech-act-ice.test.js` — all green
- JSON-LD output for each sentence type showing correct ICE node structure
- v1 regression suite: no failures

### Traceability

- v2Spec.md §3.2.1 (ENH-002 — Question ICE)
- v2Spec.md §3.2.4 (ENH-006 — Conditional ICE)

---

## M-5: Verb Class Routing — Psych-Verbs, Raising, and Causatives

### Objective

Three non-standard verb classes produce correct semantic roles using CCO-compliant mappings instead of defaulting to agent-verb-patient.

### In-Scope

- **Psych-verbs** (ENH-012, §3.3.1): Act typed as `cco:MentalProcess`, Experiencer (object) mapped to `cco:has_agent`, Stimulus (subject) mapped to `tagteam:has_cause`, `tagteam:verbClass: "psych_verb"`
- **Raising verbs** (ENH-017): No act for raising verb, infinitive is primary act, epistemic qualifier attached
- **Causatives** (ENH-013): Two linked acts with separate agents, causative "had" distinguished from past-perfect "had"

### Out-of-Scope

- Control verbs ("He wants to leave") — post-v2
- Light verbs ("take a walk") — post-v2
- Psych-verb passives ("The administrator was worried by the failure")

### Demo Scenario

1. **Psych-verb (CCO-compliant)**: Build `"The failure worried the administrator."`
   - Show: act typed as `cco:MentalProcess` (NOT `cco:IntentionalAct`)
   - Show: `cco:has_agent` → administrator (Experiencer IS the agent of the mental process)
   - Show: `tagteam:has_cause` → failure (Stimulus causes the process)
   - Show: `tagteam:verbClass: "psych_verb"`
2. **Raising verb**: Build `"The engineer seems to understand the problem."`
   - Show: single act node for "understand" (no act for "seems")
   - Show: "engineer" is agent of "understand"
   - Show: `tagteam:epistemicStatus: "apparent"` on the act
3. **Causative**: Build `"The manager had the team revise the document."`
   - Show: two act nodes — directive (manager as agent) + revise (team as agent)
   - Show: `tagteam:causes` link between them
4. **Negative case**: Build `"The team had revised the document."` (past perfect)
   - Show: single act for "revised" — no causative split

### Evidence Artifacts

- Test suites: `tests/unit/psych-verbs-cco.test.js`, `tests/unit/raising-verbs.test.js`, `tests/unit/causatives.test.js` — all green
- JSON-LD showing `cco:MentalProcess` with `cco:has_agent` (Experiencer) and `tagteam:has_cause` (Stimulus)
- v1 regression suite: no failures

### Traceability

- v2Spec.md §3.3.1 (Psych-Verb Causation — CCO compliance, role transformation diagram)
- v2Spec.md §3.3.2 (ENH-013 — Causatives)
- v2Spec.md §3.3.5 (ENH-017 — Raising verbs)

---

## M-6: Directive & Exclamatory ICE + Expletive Subjects

### Objective

Remaining speech act ICE types ship alongside expletive subject detection with the referential "It" decision tree.

### In-Scope

- **Directive ICE** (ENH-004, §3.2.2): `tagteam:DirectiveContent` for imperatives with **homonym handling** — verb/noun homonyms (`Monitor`, `List`, `Report`) disambiguated using the following-token decision tree (colon → label, subject noun → declarative, DET+NOUN → imperative)
- **Exclamatory ICE** (ENH-005): `tagteam:ValueAssertionEvent` with `bfo:has_quality`
- **Expletive subject detection** (ENH-016, §3.3.3): "It" + be + ADJ + clause pattern detection with the adjective-type decision tree:
  - Evaluative/modal ADJ (`necessary`, `likely`, `clear`) + `that`-clause → **expletive** (discard "It", parse embedded clause)
  - Physical ADJ (`heavy`, `large`, `hard`) → check discourse for prior referent → **referential** if found, **expletive** if not

### Out-of-Scope

- Indirect speech acts ("Can you pass the salt?" as directive)
- Rhetorical questions
- Cleft constructions ("It was the doctor who...")

### Demo Scenario

1. **Directive (clear verb)**: Build `"Submit the report by Friday."`
   - Show: `tagteam:DirectiveContent` node wrapping the submit act
   - Show: implicit "you" agent on the act
2. **Directive (homonym — imperative)**: Build `"Monitor the port."`
   - Show: `tagteam:DirectiveContent` — "Monitor" classified as imperative (DET+NOUN follows)
3. **Directive (homonym — rejected)**: Build `"Monitor lizards are large reptiles."`
   - Show: NO `tagteam:DirectiveContent` — "Monitor" classified as noun (subject pattern follows)
4. **Directive (homonym — label)**: Build `"Monitor definition: a screen used for display."`
   - Show: NO `tagteam:DirectiveContent` — colon indicates label/definition
5. **Exclamation**: Build `"What a disaster the launch was!"`
   - Show: `tagteam:ValueAssertionEvent` with `bfo:has_quality` → disaster quality
6. **Expletive "It"**: Build `"It is necessary that the system restart."`
   - Show: no entity node for "It"
   - Show: "system" is agent of "restart", deontic `obligation` from "necessary"
7. **Referential "It"**: In a session, build `"The server is heavy."` then `"It is hard to move."`
   - Show: "It" resolves to `inst:Server_001` (physical ADJ + prior referent)

### Evidence Artifacts

- Test suites: `tests/unit/directive-homonyms.test.js`, `tests/unit/exclamatory-ice.test.js`, `tests/unit/expletive-it.test.js` — all green
- JSON-LD output showing homonym disambiguation results
- JSON-LD output showing expletive vs referential "It" handling
- v1 regression suite: no failures

### Traceability

- v2Spec.md §3.2.2 (Directive ICE — homonym handling flowchart)
- v2Spec.md §3.2.3 (Exclamatory ICE — ENH-005)
- v2Spec.md §3.3.3 (Expletive Subject Detection — decision tree)

---

## M-7: Discourse Memory — Sessions, Anaphora & Clausal Subjects

### Objective

Multi-sentence discourse within concurrency-safe sessions resolves abstract anaphora and clausal subjects correctly.

### In-Scope

- **Concurrency-safe sessions** (§3.4.1): `builder.createSession()` → `session.build()` → `session.finalize()` with isolated `DiscourseState` per session
- **Abstract anaphora** (ENH-010, §3.4.2): "the event/incident/situation" resolved to preceding act(s) via `tagteam:corefersWith`
- **Clausal subjects** (ENH-011): "The fact that X" recognized as subject of main verb, embedded clause parsed independently
- **Salience model** (§3.4.2): `salience = (recency × 0.4) + (grammaticalRole × 0.3) + (topicContinuity × 0.2) + (definiteness × 0.1)`
- Definite vs indefinite anaphora ("the event" resolves, "an event" creates new entity)
- Cross-sentence resolution within a session

### Out-of-Scope

- Pronoun resolution ("She examined the patient")
- Cross-session discourse
- Multi-paragraph discourse tracking beyond topic chain

### Demo Scenario

1. **Multi-sentence session**:
   ```javascript
   const session = builder.createSession({ discourse: { enabled: true } });
   session.build("The server failed.");
   session.build("The administrator noticed the event.");
   const result = session.finalize();
   ```
   - Show: "the event" in sentence 2 resolves via `tagteam:corefersWith` to the Fail act from sentence 1
   - Show: no disconnected entity node for "event"
2. **Clausal subject**: Build `"The fact that the server failed worried the administrator."`
   - Show: embedded "failed" process is cause of "worried" (`cco:MentalProcess`, integration with M-5)
   - Show: "administrator" has `cco:has_agent` (Experiencer), "server" is agent of "failed" NOT "worried"
3. **Concurrency safety**:
   ```javascript
   await Promise.all([
     processDoc(builder, doc1),  // Session A
     processDoc(builder, doc2),  // Session B
   ]);
   ```
   - Show: Session A's "the event" does NOT resolve to Session B's acts
4. **Negative case**: Build `"An event occurred yesterday."`
   - Show: "event" creates a normal entity (indefinite, no anaphoric resolution)

### Evidence Artifacts

- Test suites: `tests/unit/clausal-subjects.test.js`, `tests/unit/abstract-anaphora.test.js`, `tests/unit/concurrency.test.js` — all green
- Concurrency test: 100 parallel sessions, no state leakage
- JSON-LD output showing `tagteam:corefersWith` links
- v1 regression suite: no failures

### Traceability

- v2Spec.md §3.4.1 (Concurrency Safety — session lifecycle diagram)
- v2Spec.md §3.4.2 (Discourse Memory Model — salience formula)
- v2Spec.md §7.2 (Document Mode API)

---

## M-8: Relative Clauses

### Objective

Sentences with relative clauses produce correct entity modification without misattributing roles across clause boundaries.

### In-Scope

- ENH-018: Relative pronoun detection (`who`, `that`, `which` as relative)
- Relative clause scoped to modifying the head noun
- No cross-clause agent/patient bleeding

### Out-of-Scope

- Non-restrictive relative clauses ("The doctor, who was tired, left")
- Stacked relative clauses

### Demo Scenario

1. Build `"The doctor who treated the patient left."`
   - Show: "doctor" is agent of "left" (main clause) AND agent of "treated" (relative clause)
   - Show: "patient" is patient of "treated", NOT of "left"
2. Build `"The report that the auditor reviewed was incomplete."`
   - Show: "auditor" is agent of "reviewed" (relative clause), "report" is patient of "reviewed" AND subject of "was incomplete"

### Evidence Artifacts

- Test suite: `tests/unit/relative-clauses.test.js` — all green
- JSON-LD output showing correct scoping
- v1 regression suite: no failures

### Traceability

- v2Spec.md §5 Dependency Graph — Tier 3 (ENH-018)
- *Note: Full spec section pending — milestone contingent on spec being written*

---

## M-9: Expanded Source Attribution

### Objective

Source attribution detects reported speech, institutional sources, and multi-hop evidential chains beyond v1's direct-quote-only detection.

### In-Scope

- Reported speech: "The nurse reported that..." → `{ type: "reported" }`
- Institutional: "Hospital policy states..." → `{ type: "institutional" }`
- Evidential chains: "The nurse said the doctor confirmed that..." → depth 2

### Out-of-Scope

- Direct quote detection (already v1)
- Source credibility scoring
- Cross-document attribution tracking

### Demo Scenario

1. Build `"The nurse reported that the patient had improved."`
   - Show attribution: `{ source: "nurse", type: "reported", confidence: ... }`
2. Build `"Hospital policy states that all patients must consent."`
   - Show attribution: `{ source: "hospital", type: "institutional" }`
3. Build `"The nurse said the doctor confirmed that the test was positive."`
   - Show evidential chain with depth 2: nurse → doctor → test result
4. Build `'"The patient is stable," said Dr. Smith.'`
   - Show: still works as v1 direct quote (no regression)

### Evidence Artifacts

- Test suite: `tests/unit/source-attribution-v2.test.js` — all green
- JSON-LD output showing `attribution` objects with `type`, `source`, and chain depth
- v1 attribution tests: no regressions

### Traceability

- v2Spec.md §3.5.1 (Phase 7.1 expanded) — all 3 acceptance criteria

---

## M-10: Temporal Grounding

### Objective

Relative temporal expressions resolve to concrete dates when `referenceTime` is provided.

### In-Scope

- `yesterday`, `today`, `tomorrow` → single dates
- `last week`, `next month` → date ranges
- `N days ago`, `N weeks ago` → computed dates
- Unresolvable expressions left as-is

### Out-of-Scope

- Cross-clause temporal ordering (M-2)
- Fuzzy expressions ("recently", "soon")
- Timezone handling beyond UTC

### Demo Scenario

1. Build with options:
   ```javascript
   builder.build("The patient was admitted yesterday.", {
     referenceTime: '2026-02-01T00:00:00Z'
   });
   ```
   - Show: temporal annotation resolves "yesterday" to `2026-01-31`
2. Build: `"The audit was completed last week."` with same referenceTime
   - Show: resolves to date range `2026-01-19` to `2026-01-25`
3. Build: `"The incident occurred 3 days ago."`
   - Show: resolves to `2026-01-29`
4. Build: `"The meeting will happen soon."` — show expression left as-is (no guessing)

### Evidence Artifacts

- Test suite: `tests/unit/temporal-grounding.test.js` — all green
- JSON-LD output showing resolved `tagteam:temporalValue` on entity/act nodes
- v1 regression suite: no failures

### Traceability

- v2Spec.md §3.5.2 (Phase 7.3) — all 3 acceptance criteria

---

## M-11: Domain Expansion — Legal & Business Configs

### Objective

Legal and business domain configurations load and correctly type domain-specific entities and acts, following the established `config/medical.json` pattern.

### In-Scope

- `config/legal.json`: contract, statute, regulation, plaintiff, defendant, counsel, verdict, ruling
- `config/business.json`: shareholder, board, dividend, acquisition, audit, compliance, fiduciary
- Domain switching without interference

### Out-of-Scope

- Scientific domain (insufficient use cases to demo)
- Domain-specific verb taxonomies
- Cross-domain entity resolution

### Demo Scenario

1. Load legal config, build: `"The plaintiff filed a motion against the defendant."`
   - Show: "plaintiff" and "defendant" typed to legal person roles, "motion" typed to legal document ICE
2. Load business config, build: `"The board approved the acquisition of the subsidiary."`
   - Show: "board" typed as `cco:Agent` (rdfs:label: "GroupOfPersons"), "acquisition" typed correctly
3. Switch back to medical config, build: `"The surgeon performed the operation."`
   - Show: medical types, no legal/business leakage
4. Load business config, re-run the medical sentence
   - Show: "surgeon" falls back to generic `cco:Person` (no medical vocab loaded)

### Evidence Artifacts

- Config files: `config/legal.json`, `config/business.json`
- Test suites: `tests/unit/domain-legal.test.js`, `tests/unit/domain-business.test.js` — all green
- JSON-LD output showing domain-specific typing
- Cross-domain isolation test: no type leakage

### Traceability

- v2Spec.md §3.8 (Phase 11) — all 3 acceptance criteria

---

## Milestone Dependency Order

```
M-0 (Prerequisites & Schema)  ← DO FIRST, everything depends on this
 │
 ├── M-1 (Clause Segmentation)  ← CRITICAL PATH
 │    ├── M-2 (Temporal Clauses)
 │    └── M-8 (Relative Clauses) — needs clause boundary infrastructure
 │
 ├── M-3 (Wh-Movement & Negation)
 │    └── M-4 (Question & Conditional ICE) — Wh-questions need M-3
 │
 ├── M-5 (Verb Class Routing)  ← independent of M-1
 │
 └── M-6 (Directive ICE + Expletive "It")  ← needs M-5 for referential "It" with psych-verbs
      └── M-7 (Discourse Memory) — needs M-1 + M-5 + M-6
           └── M-8 (Relative Clauses) — needs discourse for complex cases

M-9  (Source Attribution)    ← independent
M-10 (Temporal Grounding)   ← independent
M-11 (Domain Expansion)     ← independent
```

### Recommended Execution Order

| Order | Milestone | Release | Rationale |
|-------|-----------|---------|-----------|
| 1 | **M-0** | v2.0 | Prerequisite — unlocks everything |
| 2 | **M-1** | v2.0 | Critical path — unlocks M-2, M-8 |
| 3 | **M-3** | v2.0 | Independent, unlocks M-4 |
| 4 | **M-2** | v2.0 | Builds on M-1, moderate complexity |
| 5 | **M-4** | v2.0 | Builds on M-3, completes MVP ICE |
| 6 | **M-5** | v2.1 | Independent, high value |
| 7 | **M-6** | v2.1 | Builds on M-5, completes all ICE types |
| 8 | **M-7** | v2.2 | Builds on M-1 + M-5 + M-6, highest complexity |
| 9 | **M-8** | v2.2 | Builds on M-1 + M-7, contingent on spec |
| 10 | **M-9** | v2.3+ | Independent, extends existing v1 module |
| 11 | **M-10** | v2.3+ | Independent, self-contained |
| 12 | **M-11** | v2.3+ | Independent, config-only |

---

## Summary

| ID | Name | ENH/Phase Coverage | Spec Section | Release |
|----|------|--------------------|-------------|---------|
| M-0 | Prerequisites & Schema | v1 Wh-entities, tagteam.ttl, v2 config | §1.3, §4, §7.1 | v2.0 |
| M-1 | Clause Segmentation | ENH-007, ENH-008, "so" disambig, ellipsis | §3.1.1–§3.1.5 | v2.0 |
| M-2 | Temporal Clauses | ENH-009 | §3.1.3 | v2.0 |
| M-3 | Wh-Movement & Negation | ENH-014 + negation preservation | §3.3.2 | v2.0 |
| M-4 | Question & Conditional ICE | ENH-002, ENH-006 | §3.2.1, §3.2.4 | v2.0 |
| M-5 | Verb Class Routing (CCO) | ENH-012, ENH-013, ENH-017 | §3.3.1, §3.3.2, §3.3.5 | v2.1 |
| M-6 | Directive + Exclamatory ICE + Expletive "It" | ENH-004, ENH-005, ENH-016 | §3.2.2, §3.2.3, §3.3.3 | v2.1 |
| M-7 | Discourse Memory | ENH-010, ENH-011, concurrency | §3.4.1, §3.4.2, §7.2 | v2.2 |
| M-8 | Relative Clauses | ENH-018 | §5 (pending spec) | v2.2 |
| M-9 | Source Attribution Expanded | Phase 7.1 | §3.5.1 | v2.3+ |
| M-10 | Temporal Grounding | Phase 7.3 | §3.5.2 | v2.3+ |
| M-11 | Domain Expansion | Phase 11 | §3.8 | v2.3+ |

**Rejected/Deferred**: Phase 8.1 (Noun Ambiguity), Phase 8.2 (Verb Refinement), Phase 10 (Human Validation), ENH-018 spec section (pending) — see top of document.

**Coverage**: All v2Spec v1.3 features covered. 12 milestones across 4 releases. 5 items deferred with justification.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-01 | Initial milestones (9 milestones, aligned to v2Spec v1.0) |
| 2.0 | 2026-02-01 | Aligned to v2Spec v1.3: added M-0 (prerequisites/schema), added M-8 (relative clauses); fixed `and` → `and_then`; added ellipsis/Case B, "so" disambiguation, negation preservation to M-1/M-3; updated M-3 psych-verbs to CCO-compliant `has_agent`/`has_cause`; added homonym handling to M-6; added referential "It" decision tree to M-6; added concurrency-safe sessions to M-7; split ICE milestones by release (M-4 = MVP, M-6 = v2.1); renumbered M-5 through M-11 |
