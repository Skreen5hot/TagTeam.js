# TagTeam Entity Coordination Extraction Specification

**Document ID:** TT-SPEC-ENT-A  
**Version:** 1.1  
**Previous:** 1.0 (2026-04-01)  
**Date:** 2026-04-01  
**Status:** Approved for Implementation  
**Type:** Normative Addendum to TagTeam Two-Tier Architecture Specification  
**Companion to:** TT-SPEC-RDM-B v1.1 (Coordination Role Propagation)  
**Depends on:**
- TagTeam Two-Tier Architecture Specification (current)
- TagTeam SHACL Validation Specification v1.3.1
- TT-SPEC-SBA v1.3
- TT-SPEC-RDM-B v1.1 (normative dependency for Pattern 1 role propagation)

---

## Document Status

This addendum specifies how `TreeEntityExtractor` handles coordinated nominal phrases. It addresses two structural patterns in which the extractor currently merges or misses entities that are visible in the dependency parse, preventing downstream role propagation from receiving the correct entity count.

**Motivation:** Corpus diagnostic at F1 80.9% identified ~10 coord-split sentences where coordination role propagation (TT-SPEC-RDM-B) is architecturally correct but produces no gain because the entity extractor delivers only one entity for an NP that the parse tree represents as two. Both patterns have identical root cause — `conj` + `cc` signals are visible in the dependency tree but are not used as entity split signals — but different arc structures requiring separate extraction strategies.

**Relationship to CDD:** The ComplexDesignatorDetector (CDD) locks multi-word spans before entity extraction runs. Coordinated proper noun spans locked by CDD (e.g., "Centers for Medicare and Medicaid Services") MUST NOT be split by this spec. CDD lock status is the first guard condition evaluated for both patterns. The coord-split-001 result ("FBI and CIA" → two entities via CDD) confirms that the downstream role propagation is correct when given two separate entities — this spec produces the same result for common-noun coordination.

### v1.1 Revision Notes (from v1.0)

| Issue | Section(s) Changed | Nature |
|-------|-------------------|--------|
| **Pipeline ordering paradox in §4.3** — v1.0 directed the entity extractor to assign PatientRole to conjunct C "at recovery time," but entity extraction runs before role mapping; H has no role at the time Pattern 2 fires | §2 (new definition), §4.3 (rewritten), §6.2 (new subsection), §6.4 (new), AC-ENT-2 | Normative correction — extractor now stamps C with `tagteam:coordinatedWith: [H_mentionId]`; TreeRoleMapper reads this pointer after H's role is known and copies it to C |
| **Pattern 1 role dependency not made normative** — v1.0 mentioned `_propagateToConjuncts` in one acceptance criterion but never established it as a normative dependency; the spec did not state what delivers C's role or what must be in place for it to arrive | §1.1 (modules), §3.4 (new), §6.3 (new), AC-ENT-1 | Normative clarification — Pattern 1 depends on TT-SPEC-RDM-B `_propagateToConjuncts`; `conj` arc traversal is now a formally stated RoleMappingContract provision; split entities receive roles via this mechanism, not by any action of the entity extractor |

### Normative Interpretation

Any algorithm, guard condition, extraction rule, pointer definition, or prose describing entity span construction, conjunct recovery, or role delivery SHALL be interpreted as normative. MUST, MUST NOT, SHALL, SHOULD, RECOMMENDED, MAY, and OPTIONAL are interpreted per RFC 2119.

---

## Table of Contents

1. [Scope and Architecture Placement](#1-scope-and-architecture-placement)
2. [Definitions](#2-definitions)
3. [Pattern 1: Nominal Conjunct Splitting (Argument Position)](#3-pattern-1-nominal-conjunct-splitting-argument-position)
4. [Pattern 2: Verb-Attached Conjunct Object Recovery](#4-pattern-2-verb-attached-conjunct-object-recovery)
5. [Guard Conditions](#5-guard-conditions)
6. [TreeEntityExtractor Changes](#6-treeentityextractor-changes)
7. [Acceptance Criteria](#7-acceptance-criteria)
8. [Expected F1 Impact](#8-expected-f1-impact)

---

## 1. Scope and Architecture Placement

### 1.1 Modules Modified

| Module | File | Change Type |
|--------|------|-------------|
| `TreeEntityExtractor` | `src/graph/TreeEntityExtractor.js` | Additive — two new detection methods; modified span-building logic; `coordinatedWith` pointer stamped on Pattern 2 conjuncts |
| `TreeRoleMapper` | `src/graph/TreeRoleMapper.js` | Additive — new `_resolveCoordinatedWithRoles()` pass for Pattern 2 |
| `RoleMappingContract` | `src/core/RoleMappingContract.js` | Additive — `conj` arc formally listed as a role-propagation arc for Pattern 1 |

### 1.2 What Is Not Changed

- CDD locked-span behavior — CDD spans are never split by this spec (§5, Guard G-1)
- Single-entity extraction for non-coordinated NPs — unchanged
- Multi-token span construction for non-coordinated compound nouns — unchanged
- Entity extraction for proper-noun multi-word entities recognized by GazetteerNER — unchanged
- `DepTreeCorrector`, `SemanticGraphBuilder`, and all SHACL shapes — unchanged
- `_propagateToConjuncts` logic in `TreeRoleMapper` — unchanged; this spec creates the entities that mechanism needs, but does not modify the mechanism itself

### 1.3 Out of Scope

**Cross-clause coordination (adv-multi-008 pattern):** When the parser produces `conj(C → A)` where C is semantically the subject of a second clause rather than a coordinate of A in the same clause, this spec does not attempt recovery. Distinguishing intra-clause coordination (specifiable) from cross-clause parser misattachment (not specifiable without false positives) requires clause boundary detection that is not available in the current pipeline. These sentences are classified as parser failures and deferred.

**Three-way+ coordination with flat attachment:** When the parser produces `flat` arcs instead of a `conj` chain (documented in TT-SPEC-RDM-B §5), no split is applied. `flat` arcs are never treated as coordination signals by this spec.

---

## 2. Definitions

| Term | Definition |
|------|-----------|
| **`tagteam:coordinatedWith`** | A structural pointer stamped on a Pattern 2 conjunct entity C at extraction time. Value: the `mentionId` of the primary argument entity H from which C was recovered. Read by `TreeRoleMapper._resolveCoordinatedWithRoles()` after H's role is assigned, to copy H's role to C. This pointer is the only role-relevant information the entity extractor produces — the actual role name is determined downstream by the role mapper, not by the extractor. |
| **Coordination signal** | A `conj` arc between two nominal tokens accompanied by a `cc` dependent in the span between them. The `cc` dependent's text MUST be `"and"`, `"or"`, `"nor"`, or `"but"`. Both the `conj` arc and the `cc` dependent must be present for a coordination signal to be recognized. |
| **Head entity** | The nominal entity extracted from the primary argument arc (nsubj, obj, iobj, obl). This is the entity that would be extracted under the current (pre-spec) behavior. |
| **Conjunct entity** | A separate nominal entity extracted from a `conj` arc dependent of the head entity (Pattern 1) or of the governing verb (Pattern 2). Always a new entity distinct from the head entity. |
| **Conjunct span** | The minimal token span for a conjunct entity — the conjunct token itself plus any pre-nominal modifiers (det, amod, compound) that are dependents of the conjunct token and appear before it in the sentence. Does not extend past the next boundary marker (period, semicolon, or another `cc` token). |
| **CDD-locked span** | A token span whose boundaries are fixed by the ComplexDesignatorDetector prior to entity extraction. A span is CDD-locked if any token in the span has been marked as part of a CDD-recognized designator. CDD-locked spans are never split. |
| **Nominal token** | A token with POS tag `NOUN`, `PROPN`, or `PRON`. Pronouns included because "she and the director" is a valid coordination requiring two entities. |

---

## 3. Pattern 1: Nominal Conjunct Splitting (Argument Position)

### 3.1 The Problem

The parser correctly represents "The agent and the analyst" as:
```
det       The       → agent
nsubj     agent     → reviewed
conj      analyst   → agent
cc        and       → analyst
det       the       → analyst
```

The `conj` arc from "analyst" to "agent" correctly marks them as coordinate elements. The entity extractor, when building the span for "agent," walks its subtree and includes "analyst" (a `conj` child of "agent") in the same span. The result is one entity covering the entire coordination, making "analyst" unavailable as a separate entity for role propagation.

### 3.2 Split Algorithm

When the entity extractor builds a span for a nominal token N that is the head of a primary argument arc (nsubj, obj, iobj):

```
DetectConjunctSplit(N, arcs, sentence):

1. Guard check (§5): if any guard condition G-1 through G-4 applies → do not split; return [N] as the only entity.

2. Find conj children: collect all arcs where arc.head === N.sentenceRelativeIndex
   AND arc.dep === "conj"
   AND the dependent token C has a nominal POS (NOUN, PROPN, PRON).

3. Find cc children: for each candidate conjunct C, verify that a "cc" arc exists
   where arc.head === C.sentenceRelativeIndex
   AND arc.dep === "cc"
   AND the cc token text is in { "and", "or", "nor", "but" }.

4. If no valid (conj, cc) pair found → return [N] as the only entity (no split).

5. For each valid conjunct C:
   a. Build N's entity span EXCLUDING C and C's subtree.
      N's span: N.sentenceRelativeIndex and its pre-nominal modifier subtree
      (det, amod, compound children of N that appear before N and are not
      the cc token or any part of C's subtree).
   b. Build C's conjunct span: C.sentenceRelativeIndex and C's pre-nominal
      modifier subtree (det, amod, compound children of C that appear before C).
   c. Create separate entity for each span.

6. Return [headEntity(N), conjunctEntity(C1), conjunctEntity(C2), ...].
   Order by sentence-relative position (ascending).
```

**Example — subject coordination:**

Input: "The agent and the analyst reviewed the evidence."

```
N = agent (index 1)
Conj child: analyst (index 4), cc = "and" (index 2)

N span: [1, 1]         → entity "agent"
C span: [3, 4]         → entity "the analyst"
  (det "the" at index 3 is amod/det child of "analyst", included in conjunct span)

Output: [entity("agent"), entity("the analyst")]
```

### 3.4 Role Delivery for Pattern 1 Conjunct Entities (Normative Dependency on TT-SPEC-RDM-B)

The entity extractor produces split entities — it does not assign roles to them. Pattern 1 conjunct entities C receive their roles through `_propagateToConjuncts` in `TreeRoleMapper` (specified in TT-SPEC-RDM-B §4). This is a normative dependency: **TT-SPEC-RDM-B MUST be implemented before TT-SPEC-ENT-A Pattern 1 produces correct F1 results.**

The mechanism works as follows:
1. Pattern 1 produces entity H (at composite key `"s-headIdx(H)"`) and entity C (at composite key `"s-headIdx(C)"`), both in `entityByHead`
2. `TreeRoleMapper` processes the nsubj arc, finds H, assigns AgentRole to H
3. `_propagateToConjuncts` walks the `conj(C → H)` arc from H, looks up C at `"s-child.dependent"`, finds the separately-keyed entity C, assigns AgentRole to C
4. Step 3 was impossible before Pattern 1 because C and H were the same merged entity; Pattern 1 makes C addressable by giving it its own composite key

**What the `RoleMappingContract` must formally state (§6.3):** `conj` is a role-propagation arc — when a role-bearing entity H has a `conj` dependent C, and C is a nominal entity in `entityByHead`, the same role assigned to H is propagated to C. This is the formal contract that `_propagateToConjuncts` implements. It must be listed in `RoleMappingContract` so that the contract is self-contained and not dependent on knowledge of TT-SPEC-RDM-B's implementation details.

**Head entity span** — when splitting, the head entity's span MUST terminate before the `cc` token. Tokens between the head noun and the `cc` that are not pre-nominal modifiers of the head (e.g., modifiers that are part of the conjunct's own NP) are excluded.

**Conjunct entity span** — includes the conjunct token and any determiner (`det`), adjectival modifier (`amod`), or compound modifier (`compound`) that is a dependent of the conjunct token and appears between the conjunct token and the preceding `cc` token (or sentence start).

**N-ary coordination** — when multiple `conj` children exist (A and B and C), the algorithm produces one entity per nominal: [A, B, C]. Each `conj` is evaluated independently. The recursive walk in `_propagateToConjunctsRecursive` (TT-SPEC-RDM-B §4.3) handles the downstream role propagation for N > 2.

---

## 4. Pattern 2: Verb-Attached Conjunct Object Recovery

### 4.1 The Problem

The parser attaches coordinate objects differently from coordinate subjects. For "reviewed the documents and the photographs":

```
obj       documents   → reviewed
conj      photographs → reviewed    ← attaches to the VERB, not to "documents"
cc        and         → photographs
```

"photographs" is a `conj` dependent of the verb, not of "documents." The entity extractor walks the `obj` subtree of "reviewed" and finds "documents." It does not walk `conj` dependents of the verb as entity candidates, because `conj` on a verb normally indicates a coordinate verb phrase (handled by SBA), not a coordinate object. "photographs" is invisible.

### 4.2 Recovery Algorithm

After the entity extractor assigns entities to all standard argument arcs of a verb V (nsubj, obj, iobj, obl), execute a conjunct object recovery pass:

```
RecoverVerbConjunctObjects(V, arcs, extractedEntities, sentence):

1. Find all arcs where arc.head === V.sentenceRelativeIndex AND arc.dep === "conj".

2. For each conj dependent C of V:
   a. Guard check (§5): if any guard condition applies → skip this C.
   b. Check C is nominal: C.pos must be in { NOUN, PROPN, PRON }.
      If C.pos is VERB or AUX → this is VP coordination (SBA domain) → skip.
   c. Verify cc sibling: a "cc" arc must exist where arc.head === C.sentenceRelativeIndex
      AND cc token text is in { "and", "or", "nor", "but" }.
      If no cc sibling → skip (asyndetic construction, not safe to recover).
   d. Check C is not already in extractedEntities: if any extracted entity's span
      contains C.sentenceRelativeIndex → skip (already captured).
   e. Build conjunct span for C: C.sentenceRelativeIndex and C's pre-nominal
      modifier subtree (det, amod, compound children of C appearing before C).
   f. Create conjunct entity for C.
   g. Assign it PatientRole (same role as the primary obj entity).

3. Return all newly created conjunct entities.
```

**Example — object coordination:**

Input: "The detective reviewed the documents and the photographs."

```
V = reviewed
obj → documents (index 4), cc → "and" (index 5)
conj → photographs (index 7), cc sibling: "and" at index 5 (arc.head = 7)

photographs.pos = NOUN → not a verb → not VP coordination
Not already in extractedEntities
Conjunct span: [6, 7] → "the photographs"
  (det "the" at index 6 is det child of photographs)

New entity: entity("the photographs") → PatientRole
```

### 4.3 Role Delivery for Pattern 2 Conjunct Entities — `coordinatedWith` Pointer

**The entity extractor MUST NOT assign roles.** Entity extraction runs before role mapping. At the time Pattern 2 fires, H has no role — it has only a span and a composite `entityByHead` key. Assigning a role to C based on H's future role would require predicting what the role mapper will decide, which violates the pipeline ordering.

Instead, the extractor stamps C with a structural pointer:

```javascript
conjunctEntity.coordinatedWith = H_mentionId;
// e.g., "pa-uuid-...:s0:m4"  where 4 is headIdx(H)
```

`coordinatedWith` records the `mentionId` of H at extraction time. `mentionId` is available because it is computed from the composite key immediately when H's entity is created.

After the role mapper completes all standard role assignments for the sentence, it executes `_resolveCoordinatedWithRoles()` (§6.2), which:
1. Iterates all entities with non-null `coordinatedWith`
2. Looks up the pointed-to entity H by `mentionId`
3. Copies H's final role type and act association to C
4. Stamps `recoveredConjunct: true` on the copied role for diagnostics

This preserves pipeline ordering: the extractor produces a structural pointer, the role mapper resolves it after roles are known.

---

## 5. Guard Conditions

These conditions are evaluated before any split or recovery is applied. If any guard fires, the coordination detection returns without modification. Guards are evaluated in order; the first match terminates evaluation.

**G-1: CDD-locked span.** If the head entity's span or any candidate conjunct's span overlaps with a CDD-locked span, do not split or recover. CDD takes precedence unconditionally. This preserves "Centers for Medicare and Medicaid Services" as a single entity even though "and" appears between "Medicaid" and "Services." The CDD lock is checked against the token-level CDD annotation, not the string content.

**G-2: Named entity continuity.** If the head token and the conjunct token have been assigned the same GazetteerNER entity type AND are within 3 tokens of each other, treat them as part of the same named entity and do not split. This prevents splitting multi-word proper nouns that the parser happens to connect with `conj` rather than `compound` (e.g., parser quirks on organization names not in the CDD lexicon).

**G-3: Conjunct is verbal.** For Pattern 2 only: if the `conj` dependent C has POS `VERB` or `AUX`, this is VP coordination handled by SBA. Do not recover C as an object entity.

**G-4: No `cc` sibling.** If no `cc` arc is present alongside the `conj`, do not split. Asyndetic coordination (A, B, C without conjunctions) is not addressed by this spec. The `cc` requirement prevents spurious splits on `conj` arcs that arise from parser errors rather than genuine coordination.

**G-5: Cross-clause signal.** If the candidate conjunct C is the nsubj of a separate finite verb (i.e., there exists a `nsubj` arc from C to any verb other than V or the primary argument's governing verb), treat this as potential cross-clause coordination and do not split. This is the out-of-scope case documented in §1.3. Conservative behavior — do not recover — is correct here.

---

## 6. Module Changes

### 6.1 TreeEntityExtractor — Call Sites

**Pattern 1 call site** — in `TreeEntityExtractor._extractEntityForArc()`, after computing the initial span for a nominal argument, call `_detectConjunctSplit`:

```javascript
_extractEntityForArc(arc, sentence, cddSpans, context) {
  const baseSpan = this._buildNominalSpan(arc.dependent, sentence.arcs, sentence.tokens);

  // Pattern 1 — check for coordinated conjuncts
  const splits = this._detectConjunctSplit(arc.dependent, sentence, cddSpans);

  if (splits.length <= 1) {
    return [this._buildEntity(baseSpan, arc, context)];
  }

  // Produce one entity per conjunct; no roles assigned here
  return splits.map(split =>
    this._buildEntity(split.span, arc, context)
  );
}
```

**Pattern 2 call site** — in `TreeEntityExtractor._extractEntitiesForVerb()`, after all standard arcs are processed, call `_recoverVerbConjunctObjects`:

```javascript
_extractEntitiesForVerb(verbArc, sentence, cddSpans, context) {
  const entities = this._extractStandardArguments(verbArc, sentence, cddSpans, context);

  // Pattern 2 — recover verb-attached conjunct objects; stamp coordinatedWith, no roles
  const recovered = this._recoverVerbConjunctObjects(
    verbArc.head, sentence, cddSpans, entities, context
  );

  return [...entities, ...recovered];
}
```

**`_recoverVerbConjunctObjects` stamps `coordinatedWith` on each recovered entity:**

```javascript
for (const conjunct of recoveredConjuncts) {
  const primaryObj = entities.find(e => e.arcDep === 'obj');
  if (primaryObj) {
    conjunct.coordinatedWith = primaryObj.mentionId;
  }
}
```

### 6.2 RoleMappingContract — `conj` as Normative Propagation Arc

Add the following to `src/core/RoleMappingContract.js`:

```javascript
// Normative role-propagation arcs (v1.1 addition from TT-SPEC-ENT-A)
// When a role-bearing entity H has a conj-labeled dependent C that is nominal
// and present in entityByHead, the same role assigned to H MUST be propagated to C.
// This is the formal contract that _propagateToConjuncts implements.
const ROLE_PROPAGATION_ARCS = new Set([
  'conj'   // coordinate nominal propagation — TT-SPEC-ENT-A §3.4, TT-SPEC-RDM-B §4
]);
```

This entry is the formal declaration that makes the contract self-contained. `_propagateToConjuncts` in `TreeRoleMapper` is the implementation of this contract — the contract must be stated independently of the implementation so that future implementations can be verified against it.

### 6.3 TreeRoleMapper — `_resolveCoordinatedWithRoles()` (Pattern 2 resolution)

After all standard per-arc and `_propagateToConjuncts` role assignments complete for a sentence, execute:

```javascript
_resolveCoordinatedWithRoles(allEntities, roles, mentionIdIndex) {
  for (const entity of allEntities) {
    if (!entity.coordinatedWith) continue;

    const primaryEntity = mentionIdIndex.get(entity.coordinatedWith);
    if (!primaryEntity) {
      console.warn(
        `[TreeRoleMapper] _resolveCoordinatedWithRoles: ` +
        `no entity found for coordinatedWith mentionId '${entity.coordinatedWith}'. ` +
        `Role copy skipped for entity at ${entity.mentionId}.`
      );
      continue;
    }

    const primaryRoles = roles.get(primaryEntity.id) ?? [];
    const conjunctRoles = roles.get(entity.id) ?? [];

    for (const primaryRole of primaryRoles) {
      conjunctRoles.push({
        ...primaryRole,
        entity: entity,
        entityId: entity.headId,
        recoveredConjunct: true,    // diagnostic — does not affect role semantics
        sourceEntityId: primaryEntity.id
      });
    }

    roles.set(entity.id, conjunctRoles);
  }
}
```

`mentionIdIndex` is a `Map<mentionId, entity>` built once at the start of `map()` from all entities in the current `ParsingAct`. It is the lookup index for resolving `coordinatedWith` pointers. It is distinct from `entityByHead` (which is keyed by composite position); `mentionIdIndex` is keyed by the full `mentionId` string.

**Call site ordering — mandatory:**

```javascript
// Inside TreeRoleMapper.map() — ordering is normative:
// 1. Standard argument role assignment (per arc)
this._assignStandardRoles(acts, entityByHead, roles, context);

// 2. _propagateToConjuncts (Pattern 1 — walks conj arcs on role-bearing entities)
this._propagateConjunctRoles(entityByHead, roles, context);

// 3. _propagateSharedArguments (TT-SPEC-RDM-B — propagates across conjunct VPs)
this._propagateSharedArguments(coordinationGroups, roles);

// 4. _resolveCoordinatedWithRoles (Pattern 2 — copies roles to coordinatedWith targets)
this._resolveCoordinatedWithRoles(allEntities, roles, mentionIdIndex);

// 5. Flatten to Role[] array and return
return this._flattenRoles(roles);
```

Step 4 MUST run after steps 1-3 because `_resolveCoordinatedWithRoles` copies the FINAL role of H — the role after all propagation passes have completed. Running it before step 2 or 3 would copy a potentially incomplete role state.

### 6.4 `entityByHead` Population — Unchanged from TT-SPEC-RDM-B

All entities produced by Pattern 1 splits and Pattern 2 recovery MUST be added to `entityByHead` using the composite key `` `${sentenceIndex}-${headTokenIndex}` `` per TT-SPEC-RDM-B §4.2. No special handling — the composite key ensures all conjunct entities are individually addressable.

---

## 7. Acceptance Criteria

### AC-ENT-1: Pattern 1 — Subject Coordination Split and Role Delivery

- [ ] `"The agent and the analyst reviewed the evidence."` → 2 entities extracted: entity("agent") at composite key `"s-1"`, entity("analyst") at composite key `"s-4"` (indices illustrative — use actual sentence-relative positions)
- [ ] Entity extractor assigns NO roles — entities are span-only at extraction time
- [ ] `_propagateToConjuncts` fires on entity("agent") after AgentRole is assigned to it; walks `conj(analyst → agent)` arc; looks up entity("analyst") at `"s-headIdx(analyst)"`; find succeeds; AgentRole propagated to entity("analyst")
- [ ] Final output: AgentRole(agent), AgentRole(analyst), PatientRole(evidence)
- [ ] Entity spans do not overlap
- [ ] Each entity has a distinct `mentionId` with correct `headTokenIndex`
- [ ] `conj` is listed in `ROLE_PROPAGATION_ARCS` in `RoleMappingContract`

### AC-ENT-2: Pattern 2 — Verb-Attached Conjunct Object Recovery and Role Delivery

- [ ] `"The detective reviewed the documents and the photographs."` → entity extractor produces entity("photographs") with `coordinatedWith = mentionId(documents)` — NO role assigned at extraction time
- [ ] `_resolveCoordinatedWithRoles()` fires after all standard role assignments; finds entity("photographs").coordinatedWith; looks up entity("documents") via `mentionIdIndex`; copies PatientRole from entity("documents") to entity("photographs")
- [ ] Final output: entity("documents") PatientRole, entity("photographs") PatientRole with `recoveredConjunct: true`
- [ ] entity("documents") is unaffected — same span, same role, no `coordinatedWith` field
- [ ] `_resolveCoordinatedWithRoles()` runs AFTER `_propagateToConjuncts` and `_propagateSharedArguments` — verified by call site ordering in §6.3

### AC-ENT-3: N-ary Coordination (Three Conjuncts)

- [ ] `"The agent, the analyst, and the director reviewed the evidence."` → 3 entities, all receive AgentRole
- [ ] (Parser-dependent: if parser produces A → conj → B → conj → C chain, all three are extracted; if parser produces a partial chain, the partial result is accepted per TT-SPEC-RDM-B §5)

### AC-ENT-4: Guard G-1 — CDD Lock Preserved

- [ ] `"The Centers for Medicare and Medicaid Services reviewed the filing."` → 1 entity (CDD-locked span — not split at "and")
- [ ] `"The Fish and Wildlife Service coordinated with CBP."` → 1 entity (CDD-locked — not split)
- [ ] coord-split-001 ("FBI and CIA coordinated the operation") continues to produce 2 entities via existing CDD locking — no regression

### AC-ENT-5: Guard G-3 — VP Coordination Not Triggered

- [ ] `"CMS shall review and approve the report."` → Pattern 2 does NOT fire; "approve" has POS VERB → guard G-3 applies; SBA handles this as VP coordination; entity extractor produces 1 entity (CMS) with 1 patient entity (report); VerbPhrase decomposition is unaffected

### AC-ENT-6: Guard G-4 — No Split Without cc

- [ ] A sentence where the parser produces `conj` without a `cc` sibling → no split; single entity returned
- [ ] Asyndetic coordination ("the agent, the analyst reviewed...") → no split

### AC-ENT-7: Role Correctness After Split

- [ ] For Pattern 1 subjects: both entities receive AgentRole (via `_propagateToConjuncts`)
- [ ] For Pattern 2 objects: both entities receive PatientRole (primary via role mapper, conjunct via §4.3 direct assignment)
- [ ] No sentence produces duplicate role assignments on the same entity

### AC-ENT-8: mentionId Correctness

- [ ] Each split/recovered entity has a `mentionId` of the form `{parsingActId}:s{sentenceIndex}:m{headTokenIndex}` per TT-SPEC-SBA §2
- [ ] `headTokenIndex` for entity("analyst") in "The agent and the analyst" is the sentence-relative index of "analyst", NOT the index of "agent"

### AC-ENT-9: Corpus Regression

- [ ] All sentences passing before this spec continue to pass
- [ ] SBA shape compliance holds at 143/144 or better
- [ ] SHACL shapes hold at 21/21
- [ ] Entity F1 does not decrease (expected: stable or slight increase)

### AC-ENT-10: Target F1

- [ ] Role F1 ≥ 84.5% after this spec is implemented, combined with TT-SPEC-RDM-A v1.2 and TT-SPEC-RDM-B v1.1 already in place

---

## 8. Expected F1 Impact

**Baseline:** 80.9% (current, with TT-SPEC-RDM-A v1.2 and TT-SPEC-RDM-B v1.1 implemented)

| Pattern | Affected Sentences | Mechanism | Expected Gain |
|---------|-------------------|-----------|--------------|
| Pattern 1: subject coord split | 6 (coord-split 003, 004, 006, 013 + overlap) | `DetectConjunctSplit` on nsubj/iobj | ~1.5–2 points |
| Pattern 2: verb-conjunct obj recovery | 4 (coord-split 008, 011 + similar) | `RecoverVerbConjunctObjects` on obj | ~1–1.5 points |
| Gazetteer expansion (in progress) | 5 (Bucket B) | Vocabulary entries | ~1 point |

**Projected F1 after all three:** ~84.5–85.5%

This projection meets the 85% target. The remaining parser failure sentences (adv-rel-clause 6, adv-nested-pp 5, svo-basic 7, adv-multi-clause 4) are accepted as the residual gap attributable to parser quality and are deferred.

---

## Document History

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-04-01 | Initial specification. Two patterns: Pattern 1 (nominal conjunct splitting) and Pattern 2 (verb-attached conjunct object recovery). Five guard conditions. |
| 1.1 | 2026-04-01 | Fixed pipeline ordering paradox: §4.3 rewritten — extractor stamps `coordinatedWith` pointer instead of assigning roles; `_resolveCoordinatedWithRoles()` added to `TreeRoleMapper` (§6.3) to resolve pointer after roles are known. Made Pattern 1 role dependency explicit: §3.4 added as normative dependency statement on TT-SPEC-RDM-B `_propagateToConjuncts`; `conj` added to `ROLE_PROPAGATION_ARCS` in `RoleMappingContract` (§6.2). Module table updated to include `TreeRoleMapper` and `RoleMappingContract`. Call site ordering in §6.3 is normative. |

---

*This addendum is a component of the TagTeam.js semantic parser project within the Ontology of Freedom Initiative / Federated Network for Sovereign Reasoning (FNSR).*
