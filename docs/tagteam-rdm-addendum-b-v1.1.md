# TagTeam Coordination Role Propagation Specification

**Document ID:** TT-SPEC-RDM-B  
**Version:** 1.1  
**Previous:** 1.0 (2026-04-01)  
**Date:** 2026-04-01  
**Status:** Approved for Implementation  
**Type:** Normative Addendum to TT-SPEC-RDM v1.2.1  
**Companion to:** TT-SPEC-RDM-A v1.2 (Role Assignment Extension)  
**Depends on:**
- TagTeam Realist Deontic Modeling Specification v1.2.1
- TT-SPEC-SBA v1.3 (Wave 3 coordination decomposition infrastructure)
- TagTeam Two-Tier Architecture Specification (current)

---

## Document Status

This addendum specifies how role assignments distribute across coordinated argument structures. It addresses two coordination patterns and one implementation bug, all identified through diagnostic analysis of the 40-sentence ISA corpus at F1 80.9%.

### v1.1 Revision Notes (from v1.0)

| Issue | Section(s) Changed | Nature |
|-------|-------------------|--------|
| **Composite key specification for `entityByHead`** — v1.0 normatively required "sentence-relative head token index" as the key but did not specify the key format, leaving open the possibility of collisions between sentences in a multi-sentence forest. Architectural review identified that a post-SBA forest produces multiple sentences where the same sentence-relative index (e.g., index 3) can appear in every sentence. A plain integer key is not unique across the forest. The composite format `` `${sentenceIndex}-${headTokenIndex}` `` is now the normative key. | §4.2, §4.3, §6.2, AC-COORD-5, AC-COORD-6 | Normative addition — specifies the exact key format; all references to "sentence-relative head token index" now mean the composite string |

**Prerequisite:** SBA Wave 3 is confirmed in — `VerbPhrase.coordinatedVPIndex` is populated and SBA-007 and SBA-024 pass. This spec may not be implemented against a Wave 1 or Wave 2 build.

**Motivation:** Three failure modes were identified through corpus data points:

| Pattern | Sentences | Root Cause | Nature |
|---------|-----------|-----------|--------|
| **Shared-argument VP propagation** — one subject, N conjunct verbs: "A shall review and approve X" | 12 (coord-split) | `_propagateToConjuncts` only walks conj children of arguments; it does not propagate arguments across conjunct verb nodes | Missing feature — needs spec |
| **Subject-coordination entityByHead miss** — one verb, N conjunct subjects: "A and B reviewed X" | Up to 12 (coord-split overlap) | `entityByHead` lookup fails on conj-dependent entities because map keys do not match `child.dependent` indices | Implementation bug — normative key definition needed |
| **Three-way coordination degradation** — "FBI, DEA, and ATF coordinated X": parser produces `flat` + one `nsubj` instead of a `conj` chain | 4 (coord-three) | Parser failure for most cases; when parser succeeds, recursive walk handles N-ary correctly | Graceful degradation — define behavior for both success and failure |

### Normative Interpretation

Any algorithm, map definition, propagation rule, or prose describing coordination role assignment conditions or acceptance/rejection criteria SHALL be interpreted as normative. MUST, MUST NOT, SHALL, SHOULD, RECOMMENDED, MAY, and OPTIONAL are interpreted per RFC 2119.

---

## Table of Contents

1. [Scope and Architecture Placement](#1-scope-and-architecture-placement)
2. [Definitions](#2-definitions)
3. [Pattern A: Shared-Argument VP Propagation](#3-pattern-a-shared-argument-vp-propagation)
4. [Pattern B: Subject-Coordination entityByHead Correctness](#4-pattern-b-subject-coordination-entitybyhead-correctness)
5. [Pattern C: Three-Way Coordination Degradation](#5-pattern-c-three-way-coordination-degradation)
6. [TreeRoleMapper Changes](#6-treerolemapper-changes)
7. [Acceptance Criteria](#8-acceptance-criteria)
8. [Expected F1 Impact](#9-expected-f1-impact)

---

## 1. Scope and Architecture Placement

### 1.1 Modules Modified

| Module | File | Change Type |
|--------|------|-------------|
| `TreeRoleMapper` | `src/graph/TreeRoleMapper.js` | Additive — new `_propagateSharedArguments()` method; normative `entityByHead` key definition; `_propagateToConjunctsRecursive` guard |

No changes to `RoleMappingContract`, `DepTreeCorrector`, `SemanticGraphBuilder`, `SentenceSegmenter`, or any SHACL shapes.

### 1.2 What Is Not Changed

- `_propagateToConjuncts` and `_propagateToConjunctsRecursive` are not replaced. The bug fix in §4 is a normative constraint on their key behavior, not a rewrite.
- SBA decomposition (how `coordinatedVPIndex` is assigned) is unchanged.
- Role type assignments on non-coordinated sentences are unchanged.
- The `DITRANSITIVE_VERBS` and `NON_ROLE_PP_VERBS_PASSIVE` registries from TT-SPEC-RDM-A are unchanged.

### 1.3 Relationship to SBA Coordination Decomposition

SBA Wave 3 coordination decomposition (§7 of TT-SPEC-SBA v1.3) splits a coordinated VP structure within a single sentence into multiple `VerbPhrase` nodes, each carrying a `coordinatedVPIndex`. That process is about identifying separate obligation events from a single sentence.

This specification is about the next step: once multiple `VerbPhrase` nodes exist for a sentence, how do shared grammatical arguments (the subject, the object) get their roles assigned to each VP? SBA says "there are two VPs here." This spec says "and here is how their arguments get their roles."

---

## 2. Definitions

| Term | Definition |
|------|-----------|
| **Primary VP** | The `VerbPhrase` node with `coordinatedVPIndex: 0` in a coordination group. Its parse subtree contains the shared nsubj and, in most cases, the first object argument. |
| **Conjunct VP** | Any `VerbPhrase` node with `coordinatedVPIndex > 0` in a coordination group. Its parse subtree contains the conjunct verb and, when it has a distinct object, that object. |
| **Coordination group** | The set of all `VerbPhrase` nodes with the same `tagteam:sentenceIndex` and non-null `coordinatedVPIndex`, produced from the same sentence by SBA decomposition. |
| **Shared argument** | A role-bearing entity assigned during processing of the primary VP whose governing arc (nsubj, obj) appears in the primary VP's parse subtree and NOT in any conjunct VP's parse subtree. This entity's role must be propagated to all conjunct VPs that do not already carry a role of the same type. |
| **Distinct argument** | A role-bearing entity whose governing arc appears within a specific conjunct VP's parse subtree. This entity's role is NOT propagated — it belongs to that VP only. |
| **`entityByHead`** | The map from composite key to extracted entity used within `TreeRoleMapper` during role assignment. **Key format (normative):** `` `${sentenceIndex}-${headTokenIndex}` `` where `sentenceIndex` is the zero-based sentence position from `SentenceRecord.sentenceIndex` and `headTokenIndex` is the sentence-relative head token index defined below. See §4.2. |
| **Sentence-relative head token index** | The `headTokenIndex` component of a `mentionId` as defined in TT-SPEC-SBA §2 — the sentence-relative index of the dependency head token of the entity's span. Combined with `sentenceIndex` to form the composite `entityByHead` key. |

---

## 3. Pattern A: Shared-Argument VP Propagation

### 3.1 The Problem

When SBA decomposes "CMS shall review and approve the report" into two `VerbPhrase` nodes, the parse subtrees are:

```
VP[0] (coordinatedVPIndex: 0):
  root: review
  arcs: nsubj(CMS → review), aux(shall → review), obj(report → review)
  → TreeRoleMapper assigns: AgentRole(CMS), PatientRole(report)

VP[1] (coordinatedVPIndex: 1):
  root: approve
  arcs: (no nsubj, no obj — shared arguments are not in this subtree)
  → TreeRoleMapper assigns: nothing
```

VP[1] produces no role assignments because "CMS" and "the report" do not appear in its parse subtree. The result is an obligation with no prescribed agent — which is semantically incoherent.

### 3.2 The Propagation Rule

After `TreeRoleMapper` completes normal role assignment for all VerbPhrase nodes in a sentence, it MUST execute a shared-argument propagation pass for any coordination group present in that sentence.

**Propagation is governed by these rules, applied in order:**

**Rule P-1: AgentRole always propagates.**

For every conjunct VP[i] where i > 0:
- If VP[0] has an AgentRole assignment AND VP[i] has no AgentRole assignment → copy VP[0]'s AgentRole to VP[i], preserving entity identity.
- If VP[i] already has its own AgentRole (rare — only when each conjunct has its own nsubj) → do NOT propagate; VP[i]'s AgentRole is distinct.

**Rule P-2: PatientRole propagates only when the conjunct has no distinct object.**

For every conjunct VP[i] where i > 0:
- If VP[0] has a PatientRole AND VP[i] has no PatientRole → copy VP[0]'s PatientRole to VP[i].
- If VP[i] already has its own PatientRole (because its subtree contains a distinct obj arc) → do NOT propagate. VP[i]'s PatientRole is distinct and takes precedence.

**Rule P-3: No other roles propagate.**

RecipientRole, DestinationRole, LocationRole, BeneficiaryRole, InstrumentRole, and SourceRole are NOT propagated from VP[0] to conjunct VPs. These roles are argument-specific and their presence on the primary VP does not imply they apply to conjunct verb events.

**Example application:**

```
"CMS shall review the summary and approve the final report"

VP[0]: AgentRole(CMS), PatientRole(summary)
VP[1]: PatientRole(final report)     ← distinct obj in VP[1]'s subtree

After propagation:
VP[0]: AgentRole(CMS), PatientRole(summary)            ← unchanged
VP[1]: AgentRole(CMS) [propagated], PatientRole(final report) [distinct, not overwritten]
```

```
"CMS shall review and approve the report"

VP[0]: AgentRole(CMS), PatientRole(report)
VP[1]: (empty)

After propagation:
VP[0]: AgentRole(CMS), PatientRole(report)     ← unchanged
VP[1]: AgentRole(CMS) [propagated], PatientRole(report) [propagated]
```

### 3.3 `_propagateSharedArguments()` Specification

```javascript
_propagateSharedArguments(
  coordinationGroups,  // Map<sentenceIndex, VerbPhrase[]> — all groups for this ParsingAct
  roles                // Map<vpId, RoleAssignment[]> — mutable; modified in place
): void {

  for (const [sentIdx, vps] of coordinationGroups) {
    // Sort by coordinatedVPIndex to establish primary VP
    const sorted = vps.slice().sort((a, b) => a.coordinatedVPIndex - b.coordinatedVPIndex);
    const primaryVP = sorted[0];   // coordinatedVPIndex === 0
    const conjunctVPs = sorted.slice(1);

    if (conjunctVPs.length === 0) continue;

    const primaryRoles = roles.get(primaryVP.id) ?? [];
    const primaryAgent = primaryRoles.find(r => r.roleType === 'AgentRole');
    const primaryPatient = primaryRoles.find(r => r.roleType === 'PatientRole');

    for (const conjunctVP of conjunctVPs) {
      const conjunctRoles = roles.get(conjunctVP.id) ?? [];

      // Rule P-1: AgentRole
      const hasAgent = conjunctRoles.some(r => r.roleType === 'AgentRole');
      if (primaryAgent && !hasAgent) {
        conjunctRoles.push({
          ...primaryAgent,
          sourceVPId: primaryVP.id,    // provenance: marks this as propagated
          propagated: true
        });
      }

      // Rule P-2: PatientRole — only if conjunct has no distinct obj
      const hasPatient = conjunctRoles.some(r => r.roleType === 'PatientRole');
      if (primaryPatient && !hasPatient) {
        conjunctRoles.push({
          ...primaryPatient,
          sourceVPId: primaryVP.id,
          propagated: true
        });
      }

      roles.set(conjunctVP.id, conjunctRoles);
    }
  }
}
```

**`propagated: true` flag:** Propagated roles carry this flag. It is stored in the `RoleAssertion` node but does not affect role semantics. It enables future diagnostic tooling to distinguish roles the system assigned directly from roles it inferred through coordination propagation. SHACL shapes do not validate this flag.

**`sourceVPId`:** The IRI of the primary VP from which the role was propagated. Stored for provenance; not validated by SHACL.

### 3.4 When Propagation Applies

`_propagateSharedArguments()` MUST be called for every `ParsingAct` in which at least one `VerbPhrase` has a non-null `coordinatedVPIndex`. It MUST be called AFTER all normal per-VP role assignments are complete, not interleaved with them. It operates on the completed `roles` map and modifies it in place.

Single-VP sentences (the majority) produce no coordination group entries and the function is a no-op for them.

---

## 4. Pattern B: Subject-Coordination entityByHead Correctness

### 4.1 The Bug

For sentences with coordinated subjects — "The agent and the analyst reviewed the evidence" — `_propagateToConjuncts` IS the correct mechanism. It walks `conj` children of the nsubj node and assigns the same AgentRole to each. The recursive walk is architecturally correct.

The failure is that `entityByHead.get(child.dependent)` returns `undefined` for conjunct subjects. The most likely cause is a coordinate system collision introduced by the SBA forest architecture: in a multi-sentence `ParsingAct`, every sentence resets token indices to 0. A plain integer key like `3` is not unique across the forest — sentence 0 token 3 and sentence 1 token 3 are different entities. If the entity extractor populates `entityByHead` with plain integers but `TreeRoleMapper` queries with a different integer (or vice versa), every sentence after sentence 0 will miss on every lookup.

### 4.2 Normative Key Definition — Composite Format

**`entityByHead` MUST use the composite key format `` `${sentenceIndex}-${headTokenIndex}` ``.**

- `sentenceIndex` — the zero-based sentence position from `SentenceRecord.sentenceIndex` for the sentence in which the entity appears
- `headTokenIndex` — the sentence-relative head token index of the entity's span, as defined in TT-SPEC-SBA §2 (the `m` component of `mentionId`)

**Examples:**

```javascript
// Entity "analyst" at sentence-relative index 4 in sentence 1:
const key = `1-4`;   // sentenceIndex=1, headTokenIndex=4
entityByHead.set(key, analystEntity);

// Entity "agent" at sentence-relative index 1 in sentence 1:
const key = `1-1`;
entityByHead.set(key, agentEntity);

// Lookup in _propagateToConjunctsRecursive:
const key = `${currentSentenceIndex}-${child.dependent}`;
const conjEntity = entityByHead.get(key);
```

**Why the composite key is required:** In a single-sentence `ParsingAct` (the pre-SBA baseline), all token indices are unique and a plain integer key works. In a multi-sentence forest, sentence 0 and sentence 1 both have a token at sentence-relative index 0, 1, 2, etc. A plain integer key produces silent collisions — the entity at `sentences[1].tokens[3]` overwrites or is confused with the entity at `sentences[0].tokens[3]`. The composite key eliminates this class of bug entirely.

**Both population and lookup MUST use the composite key.** If the entity extractor populates with `sentenceIndex-headTokenIndex` but `_propagateToConjunctsRecursive` queries with a plain integer (or vice versa), every cross-sentence lookup will miss. This is an all-or-nothing contract.

For single-sentence `ParsingAct`s, `sentenceIndex` is always `0`, so the composite key reduces to `0-${headTokenIndex}` — functionally equivalent to the old plain integer key for all existing single-sentence behavior.

### 4.3 Guard Against Silent Miss

`_propagateToConjunctsRecursive` MUST emit a diagnostic warning when `entityByHead.get(child.dependent)` returns `undefined` for a `conj`-labeled arc:

```javascript
_propagateToConjunctsRecursive(headId, sourceEntity, depTree, entityByHead, act, sourceRole, roles) {
  const children = depTree.getChildren(headId);
  for (const child of children) {
    if (child.label !== 'conj') continue;

    // NORMATIVE (v1.1): composite key — sentenceIndex must be in scope here
    const lookupKey = `${currentSentenceIndex}-${child.dependent}`;
    const conjEntity = entityByHead.get(lookupKey);

    // Diagnostic guard — miss indicates composite key not used at population site
    if (!conjEntity) {
      console.warn(
        `[TreeRoleMapper] _propagateToConjuncts: no entity at key '${lookupKey}' ` +
        `(sentenceIndex=${currentSentenceIndex}, conj dependent=${child.dependent}). ` +
        `Verify entityByHead is populated with composite keys '\${sentenceIndex}-\${headTokenIndex}' ` +
        `at both the entity extractor and the role mapper call sites.`
      );
      continue;
    }

    if (conjEntity !== sourceEntity) {
      roles.push({ ...sourceRole, entity: conjEntity, entityId: conjEntity.headId });
    }

    this._propagateToConjunctsRecursive(child.dependent, sourceEntity, depTree, entityByHead, act, sourceRole, roles);
  }
}
```

**`currentSentenceIndex`** must be threaded into `_propagateToConjunctsRecursive` as a parameter (or captured from the enclosing sentence context). It is the `sentenceIndex` of the `SentenceRecord` currently being processed.

---

## 5. Pattern C: Three-Way Coordination Degradation

### 5.1 The Problem

When the parser correctly produces a `conj` chain for three-way coordination — "A, B, and C reviewed X" — the existing `_propagateToConjunctsRecursive` handles it: it recurses from A → B → C, propagating AgentRole at each step.

When the parser fails (producing `flat` for "A, B" and treating only C as `nsubj`), there is no `conj` chain to walk. This is a parser failure, not a `TreeRoleMapper` bug.

### 5.2 Graceful Degradation Policy

When the parser produces a `flat` arc between noun tokens that are semantically coordinate subjects, the system MUST NOT attempt to recover the flattened entities for role propagation. Attempting to walk `flat` arcs as if they were `conj` arcs would produce incorrect results on non-coordination `flat` constructions (multi-word proper names, numeric expressions, etc.).

**The normative behavior is:**

- If the parser produces a valid `conj` chain: `_propagateToConjunctsRecursive` assigns AgentRole to all entities in the chain. Correct result.
- If the parser produces `flat` instead of `conj`: only the `nsubj` entity receives AgentRole. Partial result — accepted as correct behavior for this parser error.
- If the parser produces a mix (e.g., "FBI, DEA" as `flat` and "ATF" as `nsubj`): only ATF receives AgentRole. Partial result — accepted.

**No special case is added to TreeRoleMapper for `flat` coordination.** The partial result is the correct system output given the parser's output. Recovery from parser `flat`/`conj` confusion is deferred to a future parser tuning effort.

### 5.3 Acceptance of Partial Results in Corpus

The 4 coord-three sentences are classified as parser failures. Their F1 scores will not improve from this specification. They are retained in the test corpus as regression guards: any change that makes their F1 WORSE is a regression; any change that makes it BETTER (from parser improvement) is recorded as a gain.

---

## 6. TreeRoleMapper Changes

### 6.1 New Call Site: Shared-Argument Propagation

In `TreeRoleMapper.assignRoles()` (or its equivalent top-level orchestration method), after all per-VP role assignments complete, add:

```javascript
// After per-VP role assignment loop:
const coordinationGroups = this._buildCoordinationGroups(verbPhrases);
if (coordinationGroups.size > 0) {
  this._propagateSharedArguments(coordinationGroups, roles);
}
```

`_buildCoordinationGroups()` groups VerbPhrase nodes by sentenceIndex, filtering to those with non-null `coordinatedVPIndex`:

```javascript
_buildCoordinationGroups(verbPhrases) {
  const groups = new Map();
  for (const vp of verbPhrases) {
    if (vp.coordinatedVPIndex === null || vp.coordinatedVPIndex === undefined) continue;
    const key = vp.sentenceIndex;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(vp);
  }
  // Only include groups with more than one VP (single VP has nothing to propagate)
  for (const [key, vps] of groups) {
    if (vps.length < 2) groups.delete(key);
  }
  return groups;
}
```

### 6.2 entityByHead Population — Composite Key Enforcement

The population of `entityByHead` (wherever it occurs in `SemanticGraphBuilder` or the entity extraction pipeline) MUST use the composite key format `` `${sentenceIndex}-${headTokenIndex}` ``. This is not a new method — it is a normative constraint on existing population logic.

```javascript
// Normative population pattern — wherever entityByHead is populated:
const key = `${sentence.sentenceIndex}-${entity.headTokenIndex}`;
entityByHead.set(key, entity);
```

The audit MUST verify all three population sites are using composite keys:

1. Single-token entities: key is `` `${sentenceIndex}-${token.sentenceRelativeIndex}` ``
2. Multi-token entities: key is `` `${sentenceIndex}-${span.headTokenIndex}` `` where `headTokenIndex` matches the `m` component of the entity's `mentionId`
3. No entity is stored under a plain integer or document-relative index

If the audit finds any population site using plain integers, correct it to the composite format. The diagnostic warning in §4.3 will surface any remaining mismatches during corpus testing — a warning in a corpus run is a failing condition and MUST be resolved before the run is accepted.

### 6.3 Placement of `_propagateSharedArguments` and `_buildCoordinationGroups`

Both methods are private methods of `TreeRoleMapper`. They have no dependencies outside the module except reading `VerbPhrase.coordinatedVPIndex` and `VerbPhrase.sentenceIndex` (both from SBA Wave 3) and reading/writing the `roles` map (internal to the role assignment pass). They are pure over their inputs with the exception of the `console.warn` in §4.3.

---

## 7. Acceptance Criteria

### AC-COORD-1: Shared-Subject VP Propagation — Basic

- [ ] `"CMS shall review and approve the report."` → two `VerbPhrase` nodes; after propagation, both carry `AgentRole(CMS)` and `PatientRole(report)`
- [ ] `propagated: true` is set on the AgentRole and PatientRole in VP[1]
- [ ] `sourceVPId` on propagated roles matches the IRI of VP[0]

### AC-COORD-2: Shared-Subject VP Propagation — Distinct Object

- [ ] `"CMS shall review the summary and approve the final report."` → two VPs; VP[0] has `PatientRole(summary)`, VP[1] has `PatientRole(final report)` (distinct, not overwritten); both VPs have `AgentRole(CMS)` (propagated to VP[1])
- [ ] VP[1]'s `PatientRole(final report)` does NOT have `propagated: true`

### AC-COORD-3: Shared-Subject VP Propagation — N-ary (Three VPs)

- [ ] `"CMS shall review, approve, and distribute the report."` (if SBA produces three VPs) → all three VPs carry `AgentRole(CMS)`; all three carry `PatientRole(report)` when no VP has a distinct object
- [ ] Propagation handles N > 2 without error

### AC-COORD-4: No Propagation of Non-Agent/Patient Roles

- [ ] `"CMS shall present the report to the director and file it with the archive."` → VP[0] carries `RecipientRole(director)`; VP[1] carries `DestinationRole(archive)`; `RecipientRole(director)` is NOT propagated to VP[1]

### AC-COORD-5: Subject-Coordination — entityByHead Composite Key

- [ ] `"The agent and the analyst reviewed the evidence."` → single VP; `_propagateToConjuncts` fires on nsubj "agent"; "analyst" (conj of "agent") receives `AgentRole`; output is `AgentRole(agent)`, `AgentRole(analyst)`, `PatientRole(evidence)`
- [ ] No `console.warn` is emitted during this sentence's processing
- [ ] `entityByHead` is populated with composite key `"1-${headTokenIndex}"` (or `"0-${headTokenIndex}"` for sentence 0) — not plain integers
- [ ] `entityByHead.get("${sentenceIndex}-${child.dependent}")` for "analyst"'s conj arc returns the analyst entity, not `undefined`
- [ ] For a two-sentence `ParsingAct`, entities in sentence 1 are stored under keys `"1-0"`, `"1-1"`, etc. — not `"0"`, `"1"`, etc. (which would collide with sentence 0's entities)

### AC-COORD-6: Diagnostic Warning on entityByHead Miss

- [ ] A manually crafted fixture where `entityByHead` is populated with plain integer keys causes `_propagateToConjunctsRecursive` to emit a `console.warn` containing the composite key that was attempted (e.g., `"1-4"`) and the text `"\${sentenceIndex}-\${headTokenIndex}"`
- [ ] Processing continues despite the warning; the sentence produces partial role output rather than throwing
- [ ] The warning is treated as a failing condition in corpus test runs — a clean SHACL result with a `console.warn` present is NOT an accepted passing run

### AC-COORD-7: Three-Way Subject Coordination — Success Case

- [ ] When the parser produces a valid conj chain `A → conj → B → conj → C` with `nsubj(A → verb)`: `_propagateToConjunctsRecursive` assigns `AgentRole` to A, B, and C
- [ ] No special-case code is needed for N=3 vs N=2 — the recursive walk handles both

### AC-COORD-8: Three-Way Coordination — Graceful Degradation

- [ ] When the parser produces `flat(B → A)` and `nsubj(C → verb)`: only C receives AgentRole; A and B do NOT; no error is thrown
- [ ] A `flat` arc is never walked as if it were a `conj` arc by `_propagateToConjunctsRecursive`

### AC-COORD-9: No Propagation for Single-VP Sentences

- [ ] `_buildCoordinationGroups` returns an empty map for sentences with no coordination
- [ ] `_propagateSharedArguments` is a no-op when `coordinationGroups.size === 0`
- [ ] All existing non-coordination sentences produce identical output before and after this change

### AC-COORD-10: Corpus Regression

- [ ] All sentences passing before this change continue to pass
- [ ] SBA shape compliance holds at 143/144 or better
- [ ] SHACL shapes hold at 21/21

### AC-COORD-11: Target F1

- [ ] Role F1 ≥ 83% on the 168 role-bearing sentences after this spec is implemented, combined with TT-SPEC-RDM-A v1.2 already in place

---

## 8. Expected F1 Impact

**Baseline:** 80.9% (current, with TT-SPEC-RDM-A v1.2 implemented)

| Pattern | Sentences | Mechanism | Expected Gain |
|---------|-----------|-----------|--------------|
| Pattern A: shared-argument VP propagation | 12 (coord-split) | `_propagateSharedArguments()` | ~2–3 points |
| Pattern B: entityByHead key fix | Up to 12 (some overlap with coord-split) | Key coordinate system normalization | ~0.5–1 point (incremental, many already covered by SBA propagation) |
| Pattern C: three-way degradation | 4 (coord-three) | No change — parser failures accepted | 0 |

**Projected F1 after implementation:** ~83–84%

Combined with gazetteer vocabulary expansion (5 sentences, ~1 point) already in progress, this brings the total to approximately 84–85%, meeting the target.

The 12 coordination sentences represent the largest single actionable cluster remaining. The coordinate system fix for `entityByHead` is correctness work that prevents future regressions as well as recovering some current errors.

---

## Document History

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-04-01 | Initial specification. Three patterns: shared-argument VP propagation (Pattern A), entityByHead key correctness (Pattern B), three-way degradation policy (Pattern C). Addresses coord-split and coord-three categories from ISA corpus diagnostic. |
| 1.1 | 2026-04-01 | Composite key format `` `${sentenceIndex}-${headTokenIndex}` `` specified as normative for `entityByHead` throughout §4.1, §4.2, §4.3, §6.2, AC-COORD-5, AC-COORD-6. Replaces underspecified "sentence-relative head token index" with an exact key string that is collision-free across a multi-sentence SBA forest. `currentSentenceIndex` threading requirement added to `_propagateToConjunctsRecursive` signature. |

---

*This addendum is a component of the TagTeam.js semantic parser project within the Ontology of Freedom Initiative / Federated Network for Sovereign Reasoning (FNSR).*
