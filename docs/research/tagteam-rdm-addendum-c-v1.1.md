# TagTeam PP Adjunct Suppression Specification

**Document ID:** TT-SPEC-RDM-C  
**Version:** 1.1  
**Previous:** 1.0 (2026-04-01)  
**Date:** 2026-04-01  
**Status:** Approved for Implementation  
**Type:** Normative Addendum to TT-SPEC-RDM v1.2.1  
**Companion to:** TT-SPEC-RDM-A v1.2 (Role Assignment Extension)  
**Depends on:**
- TagTeam Realist Demontic Modeling Specification v1.2.1
- TT-SPEC-RDM-A v1.2 (SUPPRESS semantics, §5)
- TagTeam Two-Tier Architecture Specification (current)

---

## Document Status

This addendum specifies a suppression rule for oblique PP arguments that the gold corpus treats as adjuncts rather than role-bearing event participants. It addresses the over-extraction bucket — 22 sentences where the system produces too many roles — by detecting when a verb's argument structure is semantically saturated and suppressing additional PP role assertions.

**Motivation:** Corpus diagnostic at F1 82.0% identified 22 over-extraction sentences where the system extracts a LocationRole, InstrumentRole, SourceRole, or BeneficiaryRole from a PP that the gold annotation does not consider a role-bearing argument. Full analysis of all 22 sentences produced the following breakdown:

| Category | Count | Treatment |
|----------|-------|-----------|
| PP adjunct suppression (this spec) | 14 | Specifiable — argument saturation signal |
| Passive spurious role (existing RDM-A scope) | 3 | Already partially covered; not expanded here |
| Multi-clause / cross-clause boundary | 2 | Out of scope — parser issue |
| Other structural | 3 | Out of scope |

**Key diagnostic findings:**
- 15 of 17 spurious PPs occur on verbs that already have both AgentRole and PatientRole assigned
- Spurious PPs are distributed across `in`, `at`, `with`, `for`, `on` — no `to`-PP cases (handled by TT-SPEC-RDM-A)
- Zero sentences in the adjunct bucket require a verb whitelist — the current corpus contains no verbs where a third non-`to` PP argument is semantically required
- The 2 sentences where the verb has no PatientRole ("coordinated with the embassy," "coordinated in the capital") are not covered by the argument-saturation rule and are addressed separately in §3.4

### v1.1 Revision Notes (from v1.0)

| Issue | Section(s) Changed | Nature |
|-------|-------------------|--------|
| **Two-pass ordering enforced at architecture level** — v1.0 stated the ordering constraint normatively in §6.3 prose but left the implementation structure to the implementer; a single-loop implementation with an internal conditional could interleave core argument state writes with oblique PP suppression checks, producing silent race conditions dependent on token-stream ordering | §1.1, §6.1, §6.2 (renamed), §6.3 (new — explicit two-method split), AC-ADJ-10 (new) | Normative strengthening — the two passes MUST be implemented as two separate methods with a mandatory sequencing call; a single loop that handles both core arguments and oblique PPs in the same iteration is non-conformant regardless of any internal ordering logic |

### Normative Interpretation

Any algorithm, condition table, suppression rule, method sequencing requirement, or prose describing PP role suppression conditions or acceptance/rejection criteria SHALL be interpreted as normative. MUST, MUST NOT, SHALL, SHOULD, RECOMMENDED, MAY, and OPTIONAL are interpreted per RFC 2119.

---

## Table of Contents

1. [Scope and Architecture Placement](#1-scope-and-architecture-placement)
2. [Definitions](#2-definitions)
3. [The Argument Saturation Rule](#3-the-argument-saturation-rule)
4. [Suppression Algorithm](#4-suppression-algorithm)
5. [RoleMappingContract Changes](#5-rolemappingcontract-changes)
6. [TreeRoleMapper Changes](#6-treerolemapper-changes)
7. [Acceptance Criteria](#7-acceptance-criteria)
8. [Expected F1 Impact](#8-expected-f1-impact)

---

## 1. Scope and Architecture Placement

### 1.1 Modules Modified

| Module | File | Change Type |
|--------|------|-------------|
| `RoleMappingContract` | `src/core/RoleMappingContract.js` | Additive — `ADJUNCT_PREPOSITIONS` set; `PP_ADJUNCT_SUPPRESSION_ENABLED` flag |
| `TreeRoleMapper` | `src/graph/TreeRoleMapper.js` | Additive — `_assignCoreArgRoles()` method (Pass 1); `_assignObliquePPRoles()` method (Pass 2, calls `_shouldSuppressAdjunctPP()`); mandatory two-method call sequence in `assignRoles()` |

No changes to `TreeEntityExtractor`, `DepTreeCorrector`, `SemanticGraphBuilder`, or any SHACL shapes.

### 1.2 What Is Not Changed

- `to`-PP handling — all `to`-PP role assignment runs through `resolveToPPRole()` from TT-SPEC-RDM-A and is unaffected by this spec
- Passive role flip (`nsubj:pass` → `PatientRole`, `by`-agent → `AgentRole`) — unchanged
- `NON_ROLE_PP_VERBS_PASSIVE` suppression from TT-SPEC-RDM-A — unchanged and complementary
- Sentences where the verb has no PatientRole — the argument saturation rule does not fire; PP roles are assigned normally (§3.4)
- `SUPPRESS` semantics from TT-SPEC-RDM-A §5 — reused without modification: suppressed PP head nouns are retained as Tier 1 `DiscourseReferent` nodes but generate no Tier 2 `RoleAssertion`

### 1.3 Relationship to TT-SPEC-RDM-A

TT-SPEC-RDM-A addresses `to`-PP role assignment specifically. This spec addresses oblique PPs with prepositions `in`, `at`, `on`, `with`, `for`, `near`. The two mechanisms are disjoint by preposition type and operate on separate code paths. No interaction or ordering dependency exists between them beyond both using the `SUPPRESS` sentinel return value.

---

## 2. Definitions

| Term | Definition |
|------|-----------|
| **Argument saturation** | The state of a verb's argument structure when it has been assigned at least one AgentRole and at least one PatientRole from its parse subtree. A saturated verb's core event participants are accounted for; additional PP dependents are candidate adjuncts. |
| **Adjunct PP** | A prepositional phrase dependent of a verb that modifies the circumstances of the event (location, manner, instrument) rather than naming an event participant. In BFO/CCO terms: a modifier of an Occurrent rather than an argument bearing a Role. |
| **`ADJUNCT_PREPOSITIONS`** | The normative set of prepositions whose PP arguments are candidates for adjunct suppression when the verb is saturated: `{ "in", "at", "on", "with", "for", "near" }`. |
| **Verb saturation check** | The predicate `isVerbSaturated(verbId, assignedRoles)` — true when `assignedRoles` contains at least one role with `roleType === "AgentRole"` and at least one with `roleType === "PatientRole"` for the given verb. |
| **`SUPPRESS`** | Return value from `_shouldSuppressAdjunctPP()` indicating that the PP head noun should be retained as a Tier 1 `DiscourseReferent` but must not generate a Tier 2 `RoleAssertion`. Identical semantics to TT-SPEC-RDM-A §5. |

---

## 3. The Argument Saturation Rule

### 3.1 Core Principle

When a verb has both an AgentRole-bearing argument and a PatientRole-bearing argument, its core event structure is complete. In BFO/CCO terms: the Occurrent has its prescribed Agent and its affected Patient. Additional oblique PP dependents at this point are circumstantial modifiers — they describe where, how, or in what context the event occurred — not participants in the event itself.

The corpus data confirms this principle: 15 of 17 spurious PP roles in the over-extraction bucket occur precisely when both AgentRole and PatientRole are already assigned. The verbs involved — `file`, `discover`, `brief`, `announce`, `fine`, `publish`, `present`, `sue`, `transport`, `examine`, `recover`, `review` — are all transitive verbs whose argument structure is fully expressed by subject + object. The PPs are adjuncts.

### 3.2 The Rule

**When a verb V is argument-saturated (has at least one AgentRole and at least one PatientRole already assigned) AND an oblique PP argument's preposition is in `ADJUNCT_PREPOSITIONS` AND the PP head noun is non-animate (fails `_isAnimate()`) → suppress the PP role (SUPPRESS).**

All three conditions must hold simultaneously. A single failing condition preserves the existing behavior:
- Verb not saturated → assign normally (§3.4)
- Preposition not in `ADJUNCT_PREPOSITIONS` → assign normally (includes `to`, `from`, `by`)
- Head noun is animate → assign normally (a `with`-PP whose head is an Organization may be a recipient)

### 3.3 Why Animacy Is the Third Condition

"The officer coordinated with the embassy" — the verb has no PatientRole (the saturation condition does not fire here, addressed in §3.4). But consider "The agency filed the report with the director" — verb is saturated (Agent=agency, Patient=report), preposition is `with`, and "director" IS animate. Suppressing RecipientRole on an animate `with`-PP would be wrong in some contexts. The animacy guard ensures that animate entities in `with`-PPs are not suppressed — they remain potential Recipients. Only non-animate `with`-PP heads (offices, departments, courts as locations) are suppressed.

**Note on Organization animacy:** Organization entities are animate per TT-SPEC-RDM-A §3.3. "Filed with the court" — if "court" resolves to an Organization type via OntologyTextTagger/GazetteerNER, it is animate and the suppression does NOT fire. Role assignment proceeds normally. The vocabulary entry for "court" as an Organization subtype (added to `isa-domain-extension.ttl`) thus interacts with this spec: better entity typing reduces over-suppression risk for institutional nouns.

### 3.4 Unsaturated Verb Handling (No PatientRole)

Two sentences in the over-extraction bucket have verbs with no PatientRole:
- "The officer coordinated with the embassy in the capital" → AgentRole(officer), no PatientRole
- Related intransitive/reflexive structures

For these sentences, the saturation condition fails (no PatientRole) and the suppression rule does NOT fire. PP roles are assigned by existing logic. These 2 sentences are accepted as residual over-extraction not addressable by this spec without broader changes to intransitive verb PP handling, which is out of scope.

---

## 4. Suppression Algorithm

This algorithm MUST be implemented as `_shouldSuppressAdjunctPP(verbId, ppArg, assignedRoles, context)` in `TreeRoleMapper`. It is called for every oblique PP argument (dep label `obl`) before the existing PP role table lookup, but AFTER `resolveToPPRole()` has already declined to handle it (i.e., this algorithm only receives non-`to` PPs).

```
Input:
  verbId        — identifier of the governing verb token
  ppArg         — { preposition: string, headToken: Token, depLabel: string }
  assignedRoles — Role[] currently assigned to verbId (mutable, updated as roles are assigned)
  context       — { sentence, arcs, tier2Types, gazetteerTypes, ibeIri, sentenceIndex }

Output:
  "SUPPRESS"   — retain as DiscourseReferent (Tier 1); no RoleAssertion (Tier 2)
  null         — use existing PP_ROLE_TABLE default

Algorithm:

Step 1 — Preposition guard.
  If ppArg.preposition NOT IN ADJUNCT_PREPOSITIONS { "in", "at", "on", "with", "for", "near" }
  → return null. (Existing default handles all other prepositions.)

Step 2 — Saturation check.
  hasAgent = assignedRoles.some(r => r.verbId === verbId && r.roleType === "AgentRole")
  hasPatient = assignedRoles.some(r => r.verbId === verbId && r.roleType === "PatientRole")
  If NOT (hasAgent AND hasPatient)
  → return null. (Verb not saturated — PP may be role-bearing.)

Step 3 — Animacy check.
  Run _isAnimate() on ppArg.headToken using context.gazetteerTypes and context.tier2Types.
  If animate
  → return null. (Animate PP heads are not suppressed — potential recipients or agents.)

Step 4 — Suppress.
  → return "SUPPRESS".
```

**Step ordering rationale:** Step 1 is a fast preposition filter — most PP assignments are not in `ADJUNCT_PREPOSITIONS` and exit immediately. Step 2 is the core semantic check — saturation must be established before suppression applies. Step 3 is the animacy guard — the most expensive check runs last, only when needed.

**Timing requirement:** `_shouldSuppressAdjunctPP()` MUST be called after all `nsubj`, `obj`, and `iobj` role assignments for the current verb are complete. This ensures `assignedRoles` contains the final AgentRole and PatientRole when the saturation check runs. If oblique PPs are processed interleaved with core arguments, Step 2 may check an incomplete `assignedRoles` and produce wrong results.

**`SUPPRESS` semantics** (identical to TT-SPEC-RDM-A §5): The PP head noun is retained as a `DiscourseReferent` (Tier 1) but generates no `RoleAssertion` (Tier 2). SHACL shapes do not need to change. `SUPPRESS` is consumed by `TreeRoleMapper` and not propagated to the graph.

---

## 5. RoleMappingContract Changes

```javascript
// src/core/RoleMappingContract.js

// NEW: Adjunct prepositions eligible for saturation-based suppression
// to-PP is excluded — handled by resolveToPPRole() in TT-SPEC-RDM-A
// from-PP is excluded — SourceRole is semantically required on transfer verbs
// by-PP is excluded — passive agent marker, handled separately
const ADJUNCT_PREPOSITIONS = new Set([
  'in', 'at', 'on', 'with', 'for', 'near'
]);

// Policy flag — enables suppression rule globally
// Set to false to disable for debugging without code removal
const PP_ADJUNCT_SUPPRESSION_ENABLED = true;
```

**Why `from` is excluded from `ADJUNCT_PREPOSITIONS`:** "The agency seized the contraband from the smuggler" — SourceRole on "smuggler" is semantically meaningful even when the verb is saturated. `from`-PP arguments often name the origin participant of a transfer event. Including `from` in the set would suppress SourceRole on sentences where it is genuinely role-bearing. The corpus does not contain `from`-PP over-extraction cases.

**Why `near` is included:** "The inspector examined the cargo near the border" — LocationRole on "border" is an adjunct. `near` does not appear as a role-bearing preposition in any current corpus sentence and always produces adjunct modification.

---

## 6. TreeRoleMapper Changes

### 6.1 Mandatory Two-Method Call Sequence in `assignRoles()`

The two-pass structure MUST be implemented as two separate method calls in `TreeRoleMapper.assignRoles()`. A single loop that processes both core arguments and oblique PPs — even one with internal ordering logic — is **non-conformant**. The separation into two methods is the architectural guarantee that Pass 1 state is fully committed before Pass 2 reads it.

```javascript
// TreeRoleMapper.assignRoles() — mandatory call sequence (normative)
assignRoles(verbId, allArcs, entities, context) {
  const assignedRoles = [];

  // PASS 1 — Core argument role assignment.
  // Processes nsubj, obj, iobj arcs only.
  // Fully mutates assignedRoles before Pass 2 begins.
  // _shouldSuppressAdjunctPP() MUST NOT be called here.
  this._assignCoreArgRoles(verbId, allArcs, entities, assignedRoles, context);

  // PASS 2 — Oblique PP role assignment with adjunct suppression.
  // Reads assignedRoles (now complete from Pass 1).
  // Calls _shouldSuppressAdjunctPP() against the fully mutated state.
  // _assignCoreArgRoles() MUST NOT be called here.
  this._assignObliquePPRoles(verbId, allArcs, entities, assignedRoles, context);

  return assignedRoles;
}
```

**`_assignCoreArgRoles(verbId, allArcs, entities, assignedRoles, context)`** — processes arcs with dep labels `nsubj`, `nsubj:pass`, `obj`, `iobj`. Assigns AgentRole, PatientRole, RecipientRole as appropriate. MUST NOT process any `obl` arc. MUST NOT call `_shouldSuppressAdjunctPP()`.

**`_assignObliquePPRoles(verbId, allArcs, entities, assignedRoles, context)`** — processes arcs with dep label `obl`. For each `obl` arc, routes through `resolveToPPRole()` (for `to`-PP, per TT-SPEC-RDM-A) or `_shouldSuppressAdjunctPP()` (for other prepositions). Reads `assignedRoles` to evaluate saturation. MUST NOT modify AgentRole or PatientRole entries — it only adds new entries or suppresses.

If the existing `assignRoles()` implementation processes arc types in a single loop, it MUST be refactored to conform to this two-method structure. This is not optional: the saturation check in `_shouldSuppressAdjunctPP()` Step 2 reads `assignedRoles` for AgentRole and PatientRole presence — if those entries are not yet written (because core arg processing is interleaved), the check produces wrong results for sentences where the subject or object appears after the oblique PP in token-stream order.

### 6.2 `_assignObliquePPRoles()` Implementation

```javascript
_assignObliquePPRoles(verbId, allArcs, entities, assignedRoles, context) {
  const oblArcs = allArcs.filter(a => a.head === verbId && a.dep === 'obl');

  for (const arc of oblArcs) {
    const ppArg = this._buildPPArg(arc, context.sentence);
    if (!ppArg) continue;

    if (ppArg.preposition === 'to') {
      // to-PP: TT-SPEC-RDM-A path — unchanged
      const resolved = this.resolveToPPRole(verbId, ppArg.headToken, context.isPassive, context);
      if (resolved === 'SUPPRESS') { extractMentionOnly(ppArg.headToken, context); continue; }
      if (resolved !== null) { assignedRoles.push(buildRole(ppArg.headToken, resolved)); continue; }
      assignedRoles.push(buildRole(ppArg.headToken, PP_ROLE_TABLE['to']));
      continue;
    }

    // Non-to PP: adjunct suppression check (TT-SPEC-RDM-C)
    if (PP_ADJUNCT_SUPPRESSION_ENABLED) {
      const suppressed = this._shouldSuppressAdjunctPP(
        verbId, ppArg, assignedRoles, context   // assignedRoles is now fully populated from Pass 1
      );
      if (suppressed === 'SUPPRESS') {
        extractMentionOnly(ppArg.headToken, context);
        continue;
      }
    }

    // No suppression — existing PP_ROLE_TABLE default
    assignedRoles.push(buildRole(ppArg.headToken, PP_ROLE_TABLE[ppArg.preposition] ?? 'UnknownRole'));
  }
}
```

### 6.3 `_shouldSuppressAdjunctPP()` Placement

Private method of `TreeRoleMapper`. Pure function over its inputs — `ADJUNCT_PREPOSITIONS`, `_isAnimate()`, and the `assignedRoles` array passed from `_assignObliquePPRoles()`. No IPFS, StateAdapter, or graph-building dependencies. Always called from `_assignObliquePPRoles()` (Pass 2) and never from `_assignCoreArgRoles()` (Pass 1).

---

## 7. Acceptance Criteria

### AC-ADJ-1: Basic Saturation Suppression

- [ ] `"The officer filed the report with the office."` → Agent(officer), Patient(report); InstrumentRole(office) SUPPRESSED; output is exactly 2 roles
- [ ] `"The analyst discovered discrepancies in the records."` → Agent(analyst), Patient(discrepancies); LocationRole(records) SUPPRESSED; output is exactly 2 roles
- [ ] `"The director briefed the team on the operation."` → Agent(director), Patient(team); LocationRole(operation) SUPPRESSED; output is exactly 2 roles
- [ ] `"The court fined the company for violations."` → Agent(court), Patient(company); BeneficiaryRole(violations) SUPPRESSED; output is exactly 2 roles

### AC-ADJ-2: Suppressed Entity Retained as DiscourseReferent

- [ ] "office" in "filed the report with the office" → `DiscourseReferent` node present in Tier 1 graph
- [ ] "office" → no `RoleAssertion` node in Tier 2 graph
- [ ] `has_output` on the `ParsingAct` includes the suppressed mention's `DiscourseReferent`

### AC-ADJ-3: Animate PP Not Suppressed

- [ ] `"The agency filed the report with the director."` → if "director" is animate (Priority 6: title pattern in `_isAnimate()`): PatientRole(report) AND RecipientRole(director); suppression does NOT fire
- [ ] `"The officer coordinated the response with the bureau."` → if "bureau" resolves to Organization type (animate): AgentRole(officer), PatientRole(response), and bureau receives its role normally

### AC-ADJ-4: Unsaturated Verb — No Suppression

- [ ] `"The officer coordinated with the embassy in the capital."` → verb has AgentRole but NO PatientRole; saturation check fails; both `with`-PP and `in`-PP receive roles normally (LocationRole or similar per existing table)
- [ ] Any sentence where the verb is intransitive or the obj argument is missing → suppression does NOT fire

### AC-ADJ-5: `to`-PP Excluded from Suppression

- [ ] `"The inspector transferred the cargo to the warehouse."` → `to`-PP routes through `resolveToPPRole()` (TT-SPEC-RDM-A); this spec does NOT intercept it
- [ ] `"The prosecutor presented the evidence to the jury."` → `to`-PP produces RecipientRole(jury) via TT-SPEC-RDM-A; suppression does NOT fire regardless of verb saturation

### AC-ADJ-6: `from`-PP Excluded from Suppression

- [ ] `"The agency seized the contraband from the smuggler."` → `from` not in `ADJUNCT_PREPOSITIONS`; SourceRole(smuggler) assigned normally; suppression does NOT fire

### AC-ADJ-7: PP_ADJUNCT_SUPPRESSION_ENABLED Flag

- [ ] When `PP_ADJUNCT_SUPPRESSION_ENABLED = false`, all PP roles are assigned as if this spec were not implemented; existing behavior restored
- [ ] When `PP_ADJUNCT_SUPPRESSION_ENABLED = true` (default), suppression fires on all qualifying sentences

### AC-ADJ-8: Corpus Regression

- [ ] All sentences passing before this spec continue to pass
- [ ] SBA shape compliance holds at 143/144 or better
- [ ] SHACL shapes hold at 21/21
- [ ] Role F1 does not decrease on any non-over-extraction sentence

### AC-ADJ-9: Target F1

- [ ] Role F1 ≥ 86.5% after this spec is implemented, combined with TT-SPEC-RDM-A v1.2, TT-SPEC-RDM-B v1.1, and TT-SPEC-ENT-A v1.1 already in place

### AC-ADJ-10: Two-Pass Architecture Conformance (v1.1)

- [ ] `_assignCoreArgRoles()` exists as a separate method and processes ONLY `nsubj`, `nsubj:pass`, `obj`, `iobj` arcs — no `obl` arcs handled within it
- [ ] `_assignObliquePPRoles()` exists as a separate method and processes ONLY `obl` arcs — no `nsubj` or `obj` arcs handled within it
- [ ] `assignRoles()` calls `_assignCoreArgRoles()` to completion before calling `_assignObliquePPRoles()`; the two calls are sequential with no interleaving
- [ ] A test fixture where the oblique PP token appears BEFORE the subject in the sentence token stream still produces correct suppression — this is the race condition that single-loop implementations produce and the two-method architecture prevents
- [ ] A single-loop implementation that processes `nsubj`, `obl`, `obj` in token-stream order (not arc-type order) produces incorrect results on the above fixture — confirming the two-pass separation is load-bearing, not cosmetic

### AC-ADJ-9: Target F1

- [ ] Role F1 ≥ 86.5% after this spec is implemented, combined with TT-SPEC-RDM-A v1.2, TT-SPEC-RDM-B v1.1, and TT-SPEC-ENT-A v1.1 already in place

---

## 8. Expected F1 Impact

**Baseline:** 82.0% (current)

| Mechanism | Sentences Addressed | Expected Gain |
|-----------|-------------------|--------------|
| Adjunct suppression (14 sentences) | Agent+Patient saturated verbs with non-animate adjunct PPs | ~4–5 points |
| Unsaturated verb exceptions (2 sentences) | Not addressed — accepted residual | 0 |
| Passive spurious / multi-clause (6 sentences) | Out of scope — separate mechanism or parser issue | 0 |
| Vocabulary additions in progress (4+ sentences) | `isa-domain-extension.ttl` expansion | ~1–2 points |

**Projected F1 after implementation:** ~86.5–88%

The adjunct suppression rule is the single highest-leverage remaining spec. 14 sentences, one predicate, one call site, one ordering constraint. It brings the system well past the 85% target and into territory where the remaining error sentences are genuine parser failures outside the scope of semantic-layer specification.

---

## Document History

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-04-01 | Initial specification. Argument saturation rule: three-condition predicate (saturation + preposition + animacy). `from` and `to` explicitly excluded. `PP_ADJUNCT_SUPPRESSION_ENABLED` flag. Ordering constraint stated normatively in prose. |
| 1.1 | 2026-04-01 | Two-pass architecture enforced at method level. `_assignCoreArgRoles()` (Pass 1) and `_assignObliquePPRoles()` (Pass 2) are now separate methods; single-loop implementations are non-conformant. Mandatory call sequence added to `assignRoles()`. AC-ADJ-10 added — includes a race-condition fixture test that a single-loop implementation fails and the two-method implementation passes. |

---

*This addendum is a component of the TagTeam.js semantic parser project within the Ontology of Freedom Initiative / Federated Network for Sovereign Reasoning (FNSR).*
