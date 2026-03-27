# WS-3 Fix 1: Modal Verb Detection in Tree Pipeline

**Date:** 2026-03-26
**Priority:** Highest (WS-3 — demo-blocking)
**Status:** Approved, ready for TDD implementation

---

## Problem Statement

The tree pipeline (default path, `useTreeExtractors: true`) has **zero modal detection**. `TreeActExtractor.js` ignores all `aux` children with POS tag `MD`. Every modal verb — `must`, `shall`, `will`, `may`, `can`, `should`, `could`, `would`, `might` — produces no annotation on the act node. No `tagteam:modality`, no `tagteam:actualityStatus`, no `tagteam:deonticType`, no `DirectiveContent` nodes.

Additionally, `TagTeam.parse()` uses `SemanticRoleExtractor._detectModality()` which has its own `MODAL_MARKERS` constant — and `shall` is missing from that list. So both `parse()` and `buildGraph()` fail for `shall`.

Every CBP policy sentence the users tested with `shall` returned `modality=null`. This is the single most common deontic modal in federal regulatory text.

**Source document for test sentences:** `docs/research/cms-2303-dhs-data-exch.pdf` — CMS/DHS Data Exchange Memorandum of Agreement. Contains dense `shall`/`must`/`may not` language representative of the domain.

---

## Scope

### Files to Modify

| File | Change |
|------|--------|
| `src/graph/TreeActExtractor.js` | Add `_detectModality()` using dep tree `aux`+`MD` children |
| `src/graph/SemanticGraphBuilder.js` | Wire modal props to act JSON-LD nodes, invoke DirectiveExtractor, set defaults |
| `src/core/SemanticRoleExtractor.js` | Add `shall` to `MODAL_MARKERS.necessity` |
| `tests/linguistic/verbphrase/modality/deontic-obligation.test.js` | Tighten to strict TDD gates, add ISA MOA sentences |

### What Does NOT Change

- Legacy `ActExtractor.js` — already handles modals, not touched
- `DirectiveExtractor.js` — already handles modal marker → DirectiveContent, just needs to be invoked
- Ontology matching pipeline — unrelated
- Two-tier architecture — unrelated

---

## Modal Vocabulary (Single Source of Truth)

This table is the canonical reference. Implement as a constant `MODAL_TABLE` in `TreeActExtractor.js`.

| Modal | Base Modality | Base Status | Negated Modality | Negated Status | Deontic Type |
|-------|--------------|-------------|------------------|----------------|-------------|
| `must` | obligation | `tagteam:Prescribed` | prohibition | `tagteam:Prohibited` | duty |
| `shall` | obligation | `tagteam:Prescribed` | prohibition | `tagteam:Prohibited` | duty |
| `should` | recommendation | `tagteam:Prescribed` | — | — | duty |
| `will` | intention | `tagteam:Actual` | — | — | — |
| `may` | permission | `tagteam:Permitted` | prohibition | `tagteam:Prohibited` | privilege |
| `can` | ability | `tagteam:Possible` | prohibition | `tagteam:Prohibited` | — |
| `could` | hypothetical | `tagteam:Hypothetical` | — | — | — |
| `would` | hypothetical | `tagteam:Hypothetical` | — | — | — |
| `might` | possibility | `tagteam:Possible` | — | — | — |
| `have to` | obligation | `tagteam:Prescribed` | — | — | duty |
| `need to` | obligation | `tagteam:Prescribed` | — | — | duty |
| `ought to` | obligation | `tagteam:Prescribed` | — | — | duty |

**Note on `could`:** Ambiguous between hypothetical ("could fail") and ability/past-can ("could speak three languages"). Default mapping is `hypothetical`. AC-SH-09b tests the ability reading to document this as a known single-reading default, not a bug.

---

## Detection Order (Critical)

1. **Find modal:** Scan `aux` children of the verb node for POS tag `MD`. Get the modal word.
2. **Find negation:** Scan `advmod` children for "not"/"n't", or check for "cannot" as a single token.
3. **Combine:** If negation is present AND the base modality has a negated form in the table, use the negated modality/status. Otherwise use the base form.

Do NOT rely on the existing negation path in the parser (`action.negation = true`) — it doesn't know about deontic flipping. The modal detector owns the full classification.

---

## Acceptance Criteria

### Core Modal Detection (TreeActExtractor + SemanticGraphBuilder)

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-SH-01 | "The doctor must treat the patient." | `tagteam:modality` on act for "treat" | `obligation` |
| AC-SH-02 | "The doctor must treat the patient." | `tagteam:actualityStatus` | `tagteam:Prescribed` |
| AC-SH-03 | "The doctor must treat the patient." | `tagteam:deonticType` | `duty` |
| AC-SH-04 | "The committee shall review the proposal." | modality + status on act for "review" | `obligation` + `tagteam:Prescribed` |
| AC-SH-05 | "The doctor should inform the family." | modality + status on act for "inform" | `recommendation` + `tagteam:Prescribed` |
| AC-SH-06a | "The nurse will administer medication." | modality on act for "administer" | `intention` |
| AC-SH-06b | "The nurse will administer medication." | `tagteam:actualityStatus` on act for "administer" | `tagteam:Actual` (design choice: `will` = future commitment mapped to Actual, not a future-oriented status. If the team later decides `will` should map differently, this test catches the change.) |
| AC-SH-07 | "The patient may refuse treatment." | modality + status on act for "refuse" | `permission` + `tagteam:Permitted` |
| AC-SH-08 | "The patient can request records." | modality + status on act for "request" | `ability` + `tagteam:Possible` |
| AC-SH-09a | "The system could fail under load." | modality + status on act for "fail" | `hypothetical` + `tagteam:Hypothetical` |
| AC-SH-09b | "She could speak three languages." | modality on act for "speak" | `hypothetical` (known default — `could` always maps hypothetical, no context disambiguation) |

### Negated Modals (Prohibition)

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-SH-10 | "The officer shall not disclose records." | modality + status + deonticType on act for "disclose" | `prohibition` + `tagteam:Prohibited` + `duty` |
| AC-SH-11 | "Employees must not access restricted areas." | modality on act for "access" | `prohibition` |
| AC-SH-12 | "You cannot enter the building." | modality + status on act for "enter" | `prohibition` + `tagteam:Prohibited` |

### Multi-word Modals (Fallback Path)

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-SH-13 | "We have to allocate resources fairly." | modality on act for "allocate" | `obligation` |
| AC-SH-14 | "The team needs to complete the assessment." | modality on act for "complete" | `obligation` |
| AC-SH-15 | "Doctors ought to follow guidelines." | modality + status on act for "follow" | `obligation` + `tagteam:Prescribed` |

### DirectiveContent Nodes

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-SH-16 | "The doctor must allocate the resource." | Node with `@type` includes `tagteam:DirectiveContent` | exists |
| AC-SH-17 | "The doctor must help the patient." | DirectiveContent `prescribes` → act `@id` | link exists |
| AC-SH-18 | "The doctor must decide." | `tagteam:modalMarker` + `tagteam:modalStrength` | `must` + `1` |
| AC-SH-19 | "The committee shall review the proposal." | `tagteam:modalMarker` + `tagteam:modalStrength` | `shall` + `1.0` |

### Graph Property Compatibility

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-SH-20 | "The doctor treats the patient." (no modal) | `tagteam:verb` on act node | `treat` |
| AC-SH-21 | "The doctor treats the patient." (no modal) | `tagteam:actualityStatus` default | `tagteam:Actual` |

### parse() Path (SemanticRoleExtractor)

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-SH-22 | `TagTeam.parse("An officer shall verify documentation")` | `action.modality` | `shall` |
| AC-SH-23 | `TagTeam.parse("CMS shall provide data")` | `action.modality` | `shall` |

### ISA MOA Real-World Sentences (from cms-2303-dhs-data-exch.pdf)

These sentences are pulled verbatim from the CMS/DHS Data Exchange MOA. They serve double duty: validating modal detection AND seeding the WS-1 domain corpus.

| AC | Input (verbatim from MOA) | Assert | Expected |
|----|---------------------------|--------|----------|
| AC-SH-25 | "CMS shall allow USCIS to monitor and review all records and documents under CMS control related to this Agreement." | modality on act for "allow" | `obligation` + `tagteam:Prescribed` |
| AC-SH-26 | "The AE must submit such documentation electronically." | modality on act for "submit" | `obligation` + `tagteam:Prescribed` |
| AC-SH-27 | "CMS and AEs may not deny an application based on a verification response that fails to confirm the applicant's status." | modality on act for "deny" | `prohibition` + `tagteam:Prohibited` |

**Diagnostic note on AC-SH-27:** This is the hardest test in the set. The sentence has a coordinated subject ("CMS and AEs"), a complex prepositional chain ("based on a verification response that fails to confirm"), and a relative clause in the object. If this test fails, first check whether an act node for "deny" exists at all — if `_buildAct()` never found "deny" as the main verb, modal detection never fires because there's no act to attach it to. If act extraction is the bottleneck, classify as a **WS-1 corpus finding** (act extraction on complex syntax), not a Cycle 2 modal detection bug.
| AC-SH-28 | "Both Parties shall maintain a level of security that is commensurate with the risk and magnitude of the harm that could result from misuse of the information." | modality on act for "maintain" | `obligation` + `tagteam:Prescribed` |
| AC-SH-29 | "Both Parties shall comply with the limitations on use and disclosure." | modality on act for "comply" | `obligation` + `tagteam:Prescribed` |

### Non-Regression

| AC | Assert | Expected |
|----|--------|----------|
| AC-SH-30 | Full CI suite (14 suites) | 0 failures |
| AC-SH-31 | Tagger tests (141) + bundle tests (53) | 0 failures |
| AC-SH-32 | "CBP is a component of DHS." (copular) | No `tagteam:modality` — no spurious modal annotation |

---

## TDD Implementation Sequence

### Cycle 1: Core modals (Red → Green)

**Red:** Write/tighten tests for AC-SH-01–05, AC-SH-20–23. All fail.

**Green:**
1. Add `MODAL_TABLE` constant to `TreeActExtractor.js`
2. Add `_detectModality(depTree, verbId)` — scan `aux` children for POS `MD`, look up in table
3. Modify `_buildAct()` to call `_detectModality()`, attach `modalVerb`, `modality`, `actualityStatus`, `deonticType`, `sourceText`
4. In `SemanticGraphBuilder._buildWithTreeExtractors()`:
   - Add `tagteam:verb`, `tagteam:modality`, `tagteam:actualityStatus`, `tagteam:deonticType`, `tagteam:sourceText` to act node assembly
   - Set default `tagteam:actualityStatus: 'tagteam:Actual'` for non-modal acts
5. Add `shall` to `MODAL_MARKERS.necessity` in `SemanticRoleExtractor.js`

### Cycle 2: Negated modals (Red → Green)

**Red:** Write tests for AC-SH-10–12. All fail.

**Green:** In `_detectModality()`, after finding modal, scan for `advmod` "not"/"n't" siblings. If negation + modal has negated form in table, use negated modality/status. Handle "cannot" as single-token special case.

### Cycle 3: Multi-word modals (Red → Green)

**Red:** Write tests for AC-SH-13–15. All fail.

**Green:** In `_detectModality()`, add fallback: if verb lemma is "have"/"need"/"ought" and has `xcomp` child preceded by `mark` "to", treat as multi-word modal. Look up in table.

### Cycle 4: DirectiveContent (Red → Green)

**Red:** Write tests for AC-SH-16–19. All fail.

**Green:** In `SemanticGraphBuilder._buildWithTreeExtractors()`, after act node loop, invoke `this.directiveExtractor.extract(actNodes, text)` and push results to `graphNodes`.

### Cycle 5: ISA MOA sentences (Red → Green)

**Red:** Write tests for AC-SH-25–29. Some may already pass from Cycles 1-2.

**Green:** Fix any remaining issues exposed by real regulatory text.

### Cycle 6: Non-regression

Run AC-SH-30–32. Fix any regressions.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| POS tagger doesn't tag all modals as `MD` | Fallback: check `aux` child word against `MODAL_TABLE` regardless of POS tag |
| "cannot" stays as single token | Handle as special case in `_detectModality()` |
| DirectiveExtractor needs `tagteam:sourceText` | Reconstruct from clause tokens (modal + verb + dependents) |
| `could` is ambiguous (hypothetical vs ability) | Default to `hypothetical`. Document as known single-reading default (AC-SH-09b). |
| Detection order: modal vs negation | Specified: modal first → negation second → combine. `_detectModality()` owns the full flow. |
| `parse()` path is separate from `buildGraph()` | Fix both: `SemanticRoleExtractor.MODAL_MARKERS` (add `shall`) AND `TreeActExtractor._detectModality()` (add full modal detection) |
