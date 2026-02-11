# TagTeam.js v3 Specification: Notes & Planning

**Version**: 3.0.0-spec-v0.1
**Date**: 2026-02-02
**Status**: Early Notes (Pre-Draft)
**Prerequisite**: TagTeam.js v2.0 (clause segmentation, ellipsis injection, boundary enforcement)

---

## Context

v3 planning emerges from the V7-002 regression testing cycle, which validated the v2 clause boundary architecture but identified gaps that require deeper linguistic modeling. These notes capture Phase 3+ work items surfaced by SME review.

---

## 1. Copula / Stative Predicate Support

**Origin**: V7 Case 5 — "The system was slow so the user refreshed the page."

**Problem**: ActExtractor produces no node for copular predicates ("was slow", "is ready", "were broken"). The verb "was" is treated as an auxiliary, and "slow" is an adjective. No `IntentionalAct` is generated.

**Impact**: When a compound sentence has a stative clause linked by "so" (causal), the causal relation is lost because there's no act node to attach the `ClauseRelation` to.

**Requirements**:
- Detect copular constructions: `be` + Adjective/NounPhrase
- Emit a `tagteam:State` node (not `cco:IntentionalAct`) with:
  - `tagteam:predicate`: the adjective or NP complement ("slow")
  - `tagteam:stateBearer`: the subject entity ("system")
  - `tagteam:tense`, `tagteam:actualityStatus` as usual
- ClauseRelation should be able to link State nodes, not just Act nodes
- State nodes should participate in role detection (the subject bears the state)

**Design questions**:
- Should `tagteam:State` be a subclass of `bfo:Process` or a `bfo:Quality`?
- CCO alignment: `cco:stasis_of` vs. new predicate?
- Does a State have an Agent? (No — states are non-agentive by definition)

---

## 2. Passive Voice Agent Detection ("by" phrases)

**Origin**: V7 Case B — "The server rebooted and was verified by the admin."

**Problem**: In passive constructions, the "by" prepositional phrase introduces the Agent. Currently, ActExtractor assigns "admin" as Patient (closest entity after verb) rather than recognizing the "by" marker.

**Current behavior**: `cco:affects: admin` (wrong — admin is the agent, server is the patient)

**Requirements**:
- Detect passive voice: auxiliary "was/were/been" + past participle
- When passive detected, look for "by" + NP as the Agent
- Subject of passive clause (or injected subject) becomes Patient
- "by" NP becomes Agent

**Design notes**:
- This interacts with v2 ellipsis injection — the injected subject in passive Case B should be the Patient, not the Agent
- Compromise NLP may already tag passive voice — check `#Passive` tag availability
- This is partially a v1 ActExtractor enhancement, not strictly v3

---

## 3. Anaphora Resolution (Cross-Clause Pronoun Linking)

**Origin**: V7 Case 6 — "He worked late so he could finish the report."

**Observation**: Both "He" instances generate separate DiscourseReferent nodes but resolve to the same `Person_He` entity (via `cco:is_about`). This works by accident (same label = same entity IRI). True anaphora resolution would handle cases like "The doctor examined the patient. She disagreed." where "she" must resolve to either doctor or patient.

**Requirements**:
- Cross-sentence pronoun resolution (gender/number agreement)
- Reflexive vs. non-reflexive distinction
- Cataphoric reference ("Before she left, the doctor signed the chart")
- Integration with DiscourseReferent `tagteam:referentialStatus`

**Priority**: Low — current label-matching heuristic handles same-sentence cases adequately.

---

## 4. Temporal Grounding

**Observation**: Acts have `tagteam:tense` (PastTense, PresentTense) but no temporal anchoring. ClauseRelations like `and_then` imply temporal ordering but don't assert it.

**Requirements**:
- `tagteam:temporalOrder` on ClauseRelation (before, after, simultaneous)
- Temporal adverb detection ("yesterday", "before", "after", "while")
- Integration with BFO temporal regions

**Priority**: Medium — deferred to v3 per v2Spec roadmap (v2.3+).

---

## 5. Modality & Certainty Refinement

**Observation**: V7 Case 6 correctly detected `tagteam:isHedged: true` and `tagteam:hedgeMarkers: ["could"]` on the "finish" act. This is functional but limited.

**Requirements**:
- Distinguish epistemic modality ("could" = possibility) from deontic ("must" = obligation)
- Map modal verbs to `tagteam:modalityType` enum
- Interaction with `tagteam:actualityStatus` — "could finish" should be `tagteam:Possible`, not `tagteam:Actual`

---

## 6. Multi-Clause Chains (3+ clauses)

**Current limitation**: ClauseSegmenter finds the first coordinating conjunction and splits into exactly 2 clauses. Sentences with 3+ coordinated clauses are not handled.

**Example**: "The server rebooted, the application restarted, and the user logged back in."

**Requirements**:
- Support comma-separated clause chains with terminal conjunction
- Generate N act nodes with N-1 ClauseRelation links (chain topology)
- Handle mixed conjunction types: "A and B but C"

---

## Prioritization (Tentative)

| Item | Complexity | Impact | Target |
|------|-----------|--------|--------|
| Passive "by" agent | Low | High | v2.1 |
| Copula/State nodes | Medium | High | v3.0 |
| Multi-clause chains | Medium | Medium | v3.0 |
| Modality refinement | Low | Medium | v3.0 |
| Anaphora resolution | High | Medium | v3.1 |
| Temporal grounding | High | Medium | v3.1+ |

---

*This document will evolve as implementation progresses. See [v2Spec.md](v2Spec.md) for the current production specification.*
