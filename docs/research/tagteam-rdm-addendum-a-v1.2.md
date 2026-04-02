# TagTeam Role Assignment Extension

**Document ID:** TT-SPEC-RDM-A  
**Version:** 1.2  
**Previous:** 1.1 (2026-04-01)  
**Date:** 2026-04-01  
**Status:** Approved for Implementation  
**Type:** Normative Addendum to TT-SPEC-RDM v1.2.1  
**Depends on:**
- TagTeam Realist Demontic Modeling Specification v1.2.1
- TagTeam Two-Tier Architecture Specification (current)
- TagTeam SHACL Validation Specification v1.3.1

---

## Document Status

This addendum extends the `RoleMappingContract` and `TreeRoleMapper` modules with two normative role assignment patterns absent from RDM v1.2.1. It does not modify or supersede any existing normative content in that specification. All existing acceptance criteria in RDM v1.2.1 remain in force.

**Motivation:** Diagnostic analysis of the 40-sentence ISA corpus at F1 78.3% identified 81 sentences with systematic role errors, of which 17 (21% of all errors) fall into two structurally addressable patterns not covered by the current `RoleMappingContract`:

- **Ditransitive Recipient Detection** — 9 sentences where a `to`-PP argument receives `DestinationRole` when it should receive `RecipientRole`
- **Passive Voice + `to`-PP Interaction** — 8 sentences where the system correctly performs the passive role flip but misassigns a following `to`-PP because the role mapping does not account for syntactic voice

These two patterns share a common root cause: the `RoleMappingContract`'s `to`-PP → `DestinationRole` mapping is a global default that does not yield to higher-priority contextual signals. This addendum introduces a priority-ordered resolution algorithm that governs when that default is overridden.

### v1.1 Revision Notes (from v1.0)

Three issues were identified during adversarial architectural review. All three are resolved as normative changes.

| Issue | Section(s) Changed | Nature |
|-------|-------------------|--------|
| **File paths incorrect** — spec referenced non-existent `src/roles/` directory; actual paths are `src/core/RoleMappingContract.js` and `src/graph/TreeRoleMapper.js` | §1.1, §6.1, §7.1 | Normative correction — all file paths updated to match actual codebase layout |
| **NER label mismatch** — §3.3 referenced spaCy-style labels (`PERSON`, `ORG`); TagTeam uses GazetteerNER producing CCO-mapped types (`Person`, `Organization`, `GovernmentOrganization`); `context.nerLabels` field named the wrong source | §3.3, §7.2, AC-RAX-3, AC-RAX-9 | Normative correction — animacy check updated to use GazetteerNER entity type strings; `context` extension updated accordingly |
| **`in`-PP suppression contradiction** — AC-RAX-4 first bullet said "any `to`/`in` PP present receives SUPPRESS" while the second bullet and §7.1 code both established that suppression only applies to `to`-PP; `in`-PP always receives `LocationRole` from the unchanged table | §4.1, §4.4, AC-RAX-4 | Normative correction — `NON_ROLE_PP_VERBS_PASSIVE` suppresses `to`-PP only; `in`-PP handling is explicitly unchanged |
| **Voice-adjusted table is dead code** — §4.2 referenced a normative "voice-adjusted role table" (§4.3), but §7.1 code intercepts all `to`-PP before the table is ever consulted; the §5 algorithm fully subsumes the table's logic | §4.2, §4.3 (removed), §2 Definitions | Normative correction — §4.3 removed; §4.2 rewritten to state that §5 IS the passive handling; no separate table is consulted |
| **Animacy check misses NER PERSON and ORG tags** — §3.3 listed four animacy detection methods, none covering standard NER entity types; "Bob" (NER: PERSON) and "The Bureau" (NER: ORG) would fail all checks and receive `DestinationRole` incorrectly | §3.3 | Normative addition — NER `PERSON` and `ORG` labels added as priority checks #2 and #3 in the animacy detection order |

### Normative Interpretation

Any algorithm, table, decision tree, seed list, or prose describing role resolution order, role assignment conditions, or acceptance/rejection criteria SHALL be interpreted as normative. MUST, MUST NOT, SHALL, SHOULD, RECOMMENDED, MAY, and OPTIONAL are interpreted per RFC 2119.

---

## Table of Contents

1. [Scope and Architecture Placement](#1-scope-and-architecture-placement)
2. [Definitions](#2-definitions)
3. [Ditransitive Recipient Detection](#3-ditransitive-recipient-detection)
4. [Passive Voice `to`-PP Interaction](#4-passive-voice-to-pp-interaction)
5. [Unified `to`-PP Resolution Algorithm](#5-unified-to-pp-resolution-algorithm)
6. [RoleMappingContract Changes](#6-rolemappingcontract-changes)
7. [TreeRoleMapper Changes](#7-treerolemapper-changes)
8. [Acceptance Criteria](#8-acceptance-criteria)
9. [Expected F1 Impact](#9-expected-f1-impact)

---

## 1. Scope and Architecture Placement

### 1.1 Modules Modified

This addendum affects exactly two modules:

| Module | File | Change Type |
|--------|------|-------------|
| `RoleMappingContract` | `src/core/RoleMappingContract.js` | Additive — new `DITRANSITIVE_VERBS` and `NON_ROLE_PP_VERBS_PASSIVE` registries |
| `TreeRoleMapper` | `src/graph/TreeRoleMapper.js` | Additive — new `resolveToPPRole()` function called before existing `to`-PP default |

No changes to `DepTreeCorrector`, `ModalDetector`, `SemanticGraphBuilder`, `OntologyTextTagger`, or any SHACL shapes.

### 1.2 What Is Not Changed

- The existing passive role flip (`nsubj:pass` → `PatientRole`, `agent` → `AgentRole`) is correct and unchanged.
- The existing `iobj` → `RecipientRole` mapping is correct and unchanged.
- The default `to`-PP → `DestinationRole` mapping is retained as the terminal fallback when `resolveToPPRole()` returns `null`.
- **All non-`to` PP mappings are entirely unchanged.** `in`/`at`/`on` → `LocationRole`, `from` → `SourceRole`, `for` → `BeneficiaryRole`, `with` → `InstrumentRole`. The `NON_ROLE_PP_VERBS_PASSIVE` registry affects `to`-PP arguments only. `in`-PP and `at`-PP arguments always receive `LocationRole` from the existing `PP_ROLE_TABLE`, regardless of voice and regardless of verb type.

### 1.3 Interaction with Wave 3 SBA

The coordination role propagation errors (12 standard + 4 three-way) are explicitly out of scope. They require `VerbPhrase.coordinatedVPIndex` from SBA Wave 3. This addendum does not interact with coordination decomposition in any way.

---

## 2. Definitions

| Term | Definition |
|------|-----------|
| **Ditransitive verb** | A verb that takes both a direct object (theme/patient) and an indirect object (recipient). The indirect object may surface as an `iobj` dependent or as a `to`-PP dependent in dative-alternation constructions. |
| **RecipientRole** | A `RoleAssertion` on the entity that receives the result of a transfer or communication event — the entity for whose benefit or into whose possession something moves. |
| **DestinationRole** | A `RoleAssertion` on a location or endpoint toward which motion or transfer is directed. Distinguished from `RecipientRole` by animacy and by the semantic type of the transfer event. |
| **BeneficiaryRole** | A `RoleAssertion` on an entity that benefits from an action without being the direct recipient of a physical or informational transfer. Used for `for`-PP arguments. |
| **`to`-PP** | A prepositional phrase headed by `to` that is a dependent of a verb, distinct from infinitival `to`. Detection: the `to` token has dependency label `prep`, `obl`, `nmod`, `dative`, or `obl:to`, NOT `aux` or `mark`. |
| **`isPassive`** | Boolean flag already computed by `TreeRoleMapper` when the governing verb has an `nsubj:pass` dependent. Referenced here without modification to its detection logic. |
| **`DITRANSITIVE_VERBS`** | The normative registry of verbs that trigger the ditransitive `to`-PP → `RecipientRole` override. Defined in §3.2. |
| **`NON_ROLE_PP_VERBS_PASSIVE`** | The normative registry of stative/perception verbs whose `to`-PP arguments are suppressed (no `RoleAssertion` generated) when the verb is in passive voice. Applies to `to`-PP only. Defined in §4.3. |
| **SUPPRESS** | A return value from `resolveToPPRole()` indicating that the `to`-PP head noun should be extracted as a Tier 1 `DiscourseReferent` but must not generate a Tier 2 `RoleAssertion`. |

---

## 3. Ditransitive Recipient Detection

### 3.1 The Problem

The current `RoleMappingContract` maps any `to`-PP argument globally to `DestinationRole`. This is correct for motion verbs ("The agent moved the evidence to the vault") but wrong for transfer verbs ("The magistrate granted bail to the accused"). In the latter, "the accused" is a Recipient — an animate entity into whose possession or purview something passes — not a Destination.

The `DepTreeCorrector` already handles one case: when the indirect object surfaces as an `iobj` dependent, it rewrites compound structures and the `iobj` correctly maps to `RecipientRole`. But when the indirect object surfaces as a `to`-PP in a dative-alternation construction, the `iobj` rewrite does not fire and `DestinationRole` is assigned incorrectly.

**Affected corpus sentences (all currently at ≤ 40% F1):**
- "The commander gave the team new orders" — gold expects Agent + Recipient + Patient
- "The prosecutor presented the evidence to the jury" — `to`-PP should be Recipient
- "The magistrate granted bail to the accused" — total miss (0% F1)
- "The committee awarded the grant to the laboratory" — `to`-PP should be Recipient
- Five additional sentences matching the same pattern

### 3.2 `DITRANSITIVE_VERBS` Registry

When a `to`-PP argument is governed by any verb in this registry, the `to`-PP receives `RecipientRole` rather than `DestinationRole`, subject to the animacy check in §3.3.

```javascript
const DITRANSITIVE_VERBS = new Set([
  // Transfer of possession
  'give', 'gave', 'given',
  'grant', 'granted',
  'award', 'awarded',
  'assign', 'assigned',
  'transfer', 'transferred',
  'allocate', 'allocated',
  'return', 'returned',
  'restore', 'restored',
  'pay', 'paid',
  'owe', 'owed',
  'lend', 'lent',
  'hand', 'handed',
  'forward', 'forwarded',

  // Transfer of information/communication
  'present', 'presented',
  'submit', 'submitted',
  'provide', 'provided',
  'offer', 'offered',
  'show', 'showed', 'shown',
  'tell', 'told',
  'report', 'reported',
  'disclose', 'disclosed',
  'transmit', 'transmitted',
  'send', 'sent',
  'deliver', 'delivered',
  'issue', 'issued',
  'notify', 'notified',

  // Transfer of authority/rights
  'sell', 'sold',
  'lease', 'leased',
  'delegate', 'delegated',
  'entrust', 'entrusted',
  'license', 'licensed',
  'authorize', 'authorized'
]);
```

**Extension mechanism:** The registry MUST be loadable from `src/core/ditransitive-verbs.json`. The JSON file is the authoritative extension point; its entries are merged with the seed set at initialization. The hardcoded set above is the normative seed.

**Lemmatization:** The lookup MUST normalize the governing verb token using the existing lemmatizer before checking membership. If lemmatization is unavailable, fall back to the explicit inflected forms in the seed set.

### 3.3 Animacy Check

The `to`-PP → `RecipientRole` upgrade applies only when the `to`-PP's head noun is animate (i.e., is or could be an agent). This prevents over-application to sentences like "The officer transferred the file to the archive" where "archive" is a `DestinationRole`.

**Animacy detection — evaluated in strict priority order, first match wins:**

1. The `to`-PP head noun's Tier 2 type is a subclass of `cco:Agent` → **animate**
2. The `to`-PP head noun has GazetteerNER entity type `Person` or any subtype → **animate** *(v1.1: was spaCy `PERSON`; corrected in v1.2)*
3. The `to`-PP head noun has GazetteerNER entity type `Organization`, `GovernmentOrganization`, or any subtype → **animate** — organizations are agents in the BFO/CCO model *(v1.1: was spaCy `ORG`; corrected in v1.2)*
4. The `to`-PP head noun is a proper noun (`PROPN`) AND appears in the Fandaws `us-government` or `legal-regulatory` domain → **animate**
5. The `to`-PP head noun is a personal pronoun (`him`, `her`, `them`, `whom`) → **animate**
6. The `to`-PP head noun has a `det` or `amod` dependent that is a human role title (`the director`, `the committee`, `the accused`, `the jury`) → **animate**
7. Default → **not animate**; use existing `DestinationRole` fallback

**Why GazetteerNER types are used (priorities 2-3):** TagTeam's pipeline does not use spaCy's NER tagger. It uses GazetteerNER, which resolves entity spans against the CCO-mapped vocabulary and assigns types from the CCO type hierarchy — `Person`, `Organization`, `GovernmentOrganization`, etc. These types are already computed at parse time and available in `context.gazetteerTypes`. They are used here in preference to Fandaws vocabulary lookup (priority 4) because they are always available, including before F-0 delivers.

**Note on geopolitical entities:** GazetteerNER `GeopoliticalEntity` types are intentionally NOT treated as animate. "Washington" as a location reference should receive `DestinationRole`. If context makes clear that "Washington" refers to a government body, Fandaws domain lookup (priority 4) handles that case when available.

**Conservative default:** When animacy cannot be determined (no Tier 2 type, no NER label, no pronoun, no Fandaws match, no title pattern), the result is NOT animate and the `DestinationRole` default applies. **Do not guess.** Uncertain animacy produces a conservative result, not a wrong one.

### 3.4 `iobj` Priority

When a sentence contains both an explicit `iobj` dependent AND a `to`-PP, the `iobj` → `RecipientRole` mapping takes absolute priority. The algorithm in §5 returns `null` at Step 2 when `iobj` is present, preserving the existing (correct) behavior. The `to`-PP in this case falls through to `DestinationRole`.

---

## 4. Passive Voice `to`-PP Interaction

### 4.1 The Problem

The system correctly detects passive voice and applies the standard flip:
- `nsubj:pass` argument → `PatientRole`
- `agent` (`by`-phrase) argument → `AgentRole`

The gap is specific to `to`-PP arguments in passive sentences. The existing `PP_ROLE_TABLE` assigns `to`-PP → `DestinationRole` without considering voice. Two failure modes result:

**Failure mode A — Passive ditransitive:** "The report was submitted to the director." The verb "submitted" is ditransitive-capable and "director" is animate, so the `to`-PP should receive `RecipientRole`. Instead it receives `DestinationRole`.

**Failure mode B — Passive stative/perception verb with spurious `to`-PP:** "The cargo was seized by customs officers." The verb "seize" does not take a `to`-PP role argument — the `by`-phrase is the only role-bearing PP. A `to`-PP that appears through prepositional attachment ambiguity should be suppressed entirely. Instead it receives `DestinationRole`, producing a spurious third role.

**Scope of the passive gap:** The passive interaction issue is exclusively a `to`-PP problem. `in`-PP and `at`-PP arguments already receive `LocationRole` from the unchanged `PP_ROLE_TABLE` in both active and passive voice. No change to `in`-PP or `at`-PP handling is required.

### 4.2 How Passive Context Is Handled

The §5 algorithm handles both passive failure modes directly. There is no separate voice-adjusted lookup table — the algorithm itself encodes the voice-sensitive logic through its step ordering:

- **Step 3** of §5 handles Failure Mode B: when `isPassive === true` and the verb is in `NON_ROLE_PP_VERBS_PASSIVE`, the `to`-PP is suppressed before any role-assignment logic runs.
- **Steps 4–6** of §5 handle Failure Mode A: when `isPassive === true` and the verb is ditransitive-capable and the head noun is animate, `RecipientRole` is assigned — exactly as it would be in active voice.

The algorithm does not branch on `isPassive` to select a different table. It passes `isPassive` as an input to Step 3. This is a deliberate design: the same animacy and ditransitivity logic governs `to`-PP role assignment in both voices. The passive context affects only whether suppression fires (Step 3) and is otherwise transparent to the downstream steps.

### 4.3 `NON_ROLE_PP_VERBS_PASSIVE` Registry

When `isPassive === true` and the governing verb appears in this registry, the `to`-PP argument is suppressed — it receives no `RoleAssertion`. The head noun is retained as a Tier 1 `DiscourseReferent` but generates no Tier 2 role node.

```javascript
const NON_ROLE_PP_VERBS_PASSIVE = new Set([
  'seize', 'seized',
  'discover', 'discovered',
  'observe', 'observed',
  'find', 'found',
  'detect', 'detected',
  'identify', 'identified',
  'locate', 'located',
  'arrest', 'arrested',
  'apprehend', 'apprehended',
  'intercept', 'intercepted'
]);
```

This registry applies **only to `to`-PP arguments.** `in`-PP and `at`-PP arguments governed by these same verbs are NOT suppressed — they continue to receive `LocationRole` from the existing unchanged `PP_ROLE_TABLE`. The call site in §7.1 skips non-`to` PPs entirely before calling `resolveToPPRole()`.

**Extension mechanism:** Loadable from `src/core/non-role-pp-verbs-passive.json` with the same merge semantics as `DITRANSITIVE_VERBS`.

---

## 5. Unified `to`-PP Resolution Algorithm

This algorithm MUST be implemented as `resolveToPPRole(verbToken, toPPHeadToken, isPassive, context)` in `TreeRoleMapper`. It is called for every `to`-PP argument — and only for `to`-PP arguments — before the existing default mapping applies.

```
Input:
  verbToken       — the governing verb token (lemma, pos, dep available)
  toPPHeadToken   — the head noun of the to-PP argument
  isPassive       — boolean, from existing passive detection
  context         — { sentence, arcs, tier2Types, gazetteerTypes, ibeIri }

Output:
  "RecipientRole"  — assign RecipientRole to the to-PP head
  "SUPPRESS"       — extract as DiscourseReferent only; no RoleAssertion
  null             — use existing PP_ROLE_TABLE default (DestinationRole)

Algorithm:

Step 1 — Infinitival to guard.
  If toPPHeadToken.pos is VERB or AUX
  → return null.
  (Infinitival 'to' is not a role-bearing PP. Existing logic handles it.)

Step 2 — iobj priority guard.
  If verbToken has an iobj dependent in context.arcs
  → return null.
  (iobj already receives RecipientRole via existing mapping.
  The to-PP in this sentence is a secondary argument; do not override.)

Step 3 — Passive stative/perception suppression.
  If isPassive === true
  AND lemma(verbToken) ∈ NON_ROLE_PP_VERBS_PASSIVE
  → return "SUPPRESS".
  (Stative/perception verbs do not take to-PP role arguments.
  The spurious DestinationRole is suppressed entirely.)

Step 4 — Ditransitive verb check.
  If lemma(verbToken) ∉ DITRANSITIVE_VERBS
  → return null. (Use DestinationRole default.)

Step 5 — Animacy check.
  Run animacy detection (§3.3) on toPPHeadToken using context.gazetteerTypes
  and context.tier2Types.
  If NOT animate
  → return null. (Use DestinationRole default.)

Step 6 — Assign RecipientRole.
  → return "RecipientRole".
```

**Step ordering rationale:** Step 3 (suppression) fires before Steps 4–6 (ditransitive/animacy). This ensures a verb that is both in `NON_ROLE_PP_VERBS_PASSIVE` and theoretically ditransitive-capable always suppresses rather than assigning RecipientRole. In practice no verb appears in both registries, but the ordering makes the behavior deterministic if a corpus extension produces such a conflict.

**`context.gazetteerTypes`:** The `context` object must be extended to pass GazetteerNER entity type strings for all tokens in the sentence. These are already computed at parse time by the existing GazetteerNER pipeline; this addendum requires only that they be threaded into the `context` object passed to `resolveToPPRole()`.

**`"SUPPRESS"` semantics:** The `to`-PP head noun is extracted as a `DiscourseReferent` (Tier 1) but generates no `RoleAssertion` (Tier 2). `"SUPPRESS"` is a return value consumed by `TreeRoleMapper`, not a graph node type. No SHACL shapes need to change.

---

## 6. `RoleMappingContract` Changes

### 6.1 New Registry Entries

```javascript
// src/core/RoleMappingContract.js

// NEW: Ditransitive verb registry
const DITRANSITIVE_VERBS = loadAndMerge(
  DITRANSITIVE_VERBS_SEED,          // §3.2
  'src/core/ditransitive-verbs.json'
);

// NEW: Passive stative/perception verb registry
const NON_ROLE_PP_VERBS_PASSIVE = loadAndMerge(
  NON_ROLE_PP_VERBS_PASSIVE_SEED,   // §4.3
  'src/core/non-role-pp-verbs-passive.json'
);

// UNCHANGED: existing PP role table
// The 'to' entry remains as the terminal fallback.
// resolveToPPRole() fires before this table for all to-PP arguments.
const PP_ROLE_TABLE = {
  'to':   'DestinationRole',
  'in':   'LocationRole',
  'at':   'LocationRole',
  'from': 'SourceRole',
  'for':  'BeneficiaryRole',
  'with': 'InstrumentRole',
  // ... existing entries unchanged
};
```

### 6.2 Dependency Label Recognition

```javascript
// Labels that indicate a to-PP argument (role-bearing candidate):
const TO_PP_DEP_LABELS = new Set([
  'prep', 'obl', 'nmod', 'dative', 'obl:to'
]);

// Labels that indicate infinitival 'to' (NOT a role-bearing PP):
const INFINITIVAL_TO_LABELS = new Set([
  'aux', 'mark', 'xcomp'
]);
```

---

## 7. `TreeRoleMapper` Changes

### 7.1 Call Site Integration

The `resolveToPPRole()` function is called only for `to`-PP arguments. All other prepositions bypass it entirely and continue to the existing `PP_ROLE_TABLE` lookup unchanged.

```javascript
for (const ppArg of extractedPPArguments) {

  // Non-to PPs: existing logic entirely unchanged.
  // in/at/on → LocationRole, from → SourceRole, etc.
  // NON_ROLE_PP_VERBS_PASSIVE does NOT affect these.
  if (ppArg.preposition !== 'to') {
    const role = PP_ROLE_TABLE[ppArg.preposition] ?? 'UnknownRole';
    assignRole(ppArg.headToken, role);
    continue;
  }

  // to-PP: run priority resolution algorithm (§5)
  const resolvedRole = resolveToPPRole(
    verbToken,
    ppArg.headToken,
    isPassive,
    context   // must include context.gazetteerTypes
  );

  if (resolvedRole === 'SUPPRESS') {
    // Extract as DiscourseReferent (Tier 1). No RoleAssertion (Tier 2).
    extractMentionOnly(ppArg.headToken, context);
    continue;
  }

  if (resolvedRole !== null) {
    // RecipientRole (or any future override value)
    assignRole(ppArg.headToken, resolvedRole);
    continue;
  }

  // Algorithm returned null: use existing default
  assignRole(ppArg.headToken, PP_ROLE_TABLE['to']); // 'DestinationRole'
}
```

### 7.2 `context` Object Extension

The existing `context` object must be extended with `gazetteerTypes` — the entity type strings produced by GazetteerNER for each token:

```javascript
const context = {
  sentence,
  arcs,
  tier2Types,
  ibeIri,
  gazetteerTypes: sentence.tokens.map(t => t.gazetteerType ?? null)  // NEW — from GazetteerNER
};
```

`gazetteerTypes[i]` is the GazetteerNER entity type string for `sentence.tokens[i]` (e.g., `"Person"`, `"Organization"`, `"GovernmentOrganization"`), or `null` if no type was assigned. This field is used by animacy check priorities 2 and 3 in §3.3.

GazetteerNER types are already computed by the pipeline before `TreeRoleMapper` runs. This extension requires only that the type strings be threaded into the `context` object — no new computation.

### 7.3 Passive Detection Invariant

`isPassive` MUST be computed before `resolveToPPRole()` is called. This addendum does not change passive detection logic.

### 7.4 `resolveToPPRole()` Placement

A private method of `TreeRoleMapper`. It accesses registries via the `RoleMappingContract` interface. It is a pure function over its inputs — no IPFS, StateAdapter, or graph-building dependencies.

---

## 8. Acceptance Criteria

### AC-RAX-1: Ditransitive `to`-PP → RecipientRole

- [ ] `"The prosecutor presented the evidence to the jury."` → "jury" receives `RecipientRole`
- [ ] `"The committee awarded the grant to the laboratory."` → "laboratory" receives `RecipientRole`
- [ ] `"The commander gave the team new orders."` → `iobj` "team" receives `RecipientRole`; "orders" receives `PatientRole`; exactly 3 roles total
- [ ] `"The magistrate granted bail to the accused."` → "accused" receives `RecipientRole`; "bail" receives `PatientRole`; F1 > 0%

### AC-RAX-2: Ditransitive `to`-PP → DestinationRole When Non-Animate

- [ ] `"The officer transferred the file to the archive."` → "archive" fails animacy check (no NER, no Fandaws match, no pronoun, no title pattern) → `DestinationRole`
- [ ] `"The system routed the alert to the queue."` → "queue" is non-animate → `DestinationRole`
- [ ] `"CMS submitted the report to Washington."` → "Washington" has NER label `GPE`, not `PERSON` or `ORG` → NOT animate by §3.3 priorities 2-3 → `DestinationRole` (location reference)

### AC-RAX-3: GazetteerNER-Based Animacy (v1.1, corrected in v1.2)

- [ ] `"The magistrate granted bail to Bob."` → "Bob" has GazetteerNER type `Person` (priority 2 in §3.3) → animate → `RecipientRole`
- [ ] `"The agency delegated authority to the Bureau."` → "the Bureau" has GazetteerNER type `Organization` (priority 3 in §3.3) → animate → `RecipientRole`
- [ ] `"The office transferred authority to the Washington field division."` → "Washington field division" has no `Person` or `Organization` GazetteerNER type and is not in Fandaws → NOT animate → `DestinationRole`

### AC-RAX-4: Passive + Ditransitive `to`-PP → RecipientRole

- [ ] `"The report was submitted to the director."` → `isPassive === true`; "submitted" in `DITRANSITIVE_VERBS`; "director" is animate (priority 6, title pattern) → `RecipientRole`
- [ ] `"The evidence was presented to the magistrate."` → same pattern → `RecipientRole`

### AC-RAX-5: Passive Non-Role-PP Suppression (`to`-PP only)

- [ ] `"The cargo was seized by customs officers."` → `isPassive === true`; "seize" in `NON_ROLE_PP_VERBS_PASSIVE`; any `to`-PP present receives `SUPPRESS` — no `RoleAssertion` generated; output is exactly 2 roles (PatientRole + AgentRole), matching gold
- [ ] `"The narcotics were discovered in a hidden compartment."` → "discover" in `NON_ROLE_PP_VERBS_PASSIVE`; the `in`-PP "a hidden compartment" is NOT affected by this registry — it receives `LocationRole` from the unchanged `PP_ROLE_TABLE` (§7.1 bypasses `resolveToPPRole()` for non-`to` prepositions)
- [ ] A sentence with a `NON_ROLE_PP_VERBS_PASSIVE` verb in active voice (e.g., "Officers seized the cargo near the border") does not suppress the `near`-PP — the registry only fires when `isPassive === true`

### AC-RAX-6: Infinitival `to` Exclusion

- [ ] `"CMS shall provide access to review the records."` → "review" has pos `VERB` → algorithm returns `null` at Step 1; no role assigned to the infinitival clause
- [ ] Infinitival guard does not fire on `"provide access to the agency"` — "agency" has pos `NOUN`

### AC-RAX-7: `iobj` Priority

- [ ] In a sentence where the parser produces both `iobj` and a `to`-PP on the same verb, the `iobj` receives `RecipientRole` (existing behavior, unchanged); algorithm returns `null` at Step 2 for the `to`-PP, which then receives `DestinationRole`
- [ ] No sentence produces two `RecipientRole` assignments on the same verb

### AC-RAX-8: Registry Loading

- [ ] `DITRANSITIVE_VERBS` contains all seed entries from §3.2 at initialization
- [ ] `NON_ROLE_PP_VERBS_PASSIVE` contains all seed entries from §4.3 at initialization
- [ ] If `src/core/ditransitive-verbs.json` is absent, initialization succeeds using seed set only
- [ ] If `src/core/ditransitive-verbs.json` is present, entries merged with seed set; JSON entries take precedence on conflict
- [ ] If `src/core/non-role-pp-verbs-passive.json` is absent, initialization succeeds using seed set only
- [ ] Lemmatization applied before lookup: "granted" matches "grant", "awarded" matches "award"

### AC-RAX-9: `context.gazetteerTypes` Availability (v1.1, corrected in v1.2)

- [ ] `context.gazetteerTypes` is a non-null array with length equal to `sentence.tokens.length`
- [ ] `context.gazetteerTypes[i]` is the GazetteerNER entity type string for token `i` (e.g., `"Person"`, `"Organization"`, `"GovernmentOrganization"`), or `null` if no type was assigned by the gazetteer
- [ ] The animacy check in §3.3 correctly reads from `context.gazetteerTypes` using the sentence-relative token index of `toPPHeadToken`
- [ ] Animacy check priority 2 fires when `gazetteerTypes[headTokenIndex] === "Person"` (or any Person subtype)
- [ ] Animacy check priority 3 fires when `gazetteerTypes[headTokenIndex] === "Organization"` or `"GovernmentOrganization"` (or any Organization subtype)

### AC-RAX-10: `SUPPRESS` Semantics

- [ ] A suppressed `to`-PP head noun produces a `DiscourseReferent` node in Tier 1
- [ ] A suppressed `to`-PP head noun does NOT produce a `RoleAssertion` in Tier 2
- [ ] `has_output` on the `ParsingAct` includes the suppressed mention's `DiscourseReferent`
- [ ] The `SentenceCluster` for the relevant sentence includes the suppressed mention's `DiscourseReferent`

### AC-RAX-11: Non-`to` PP Handling Unchanged

- [ ] `in`-PP arguments always receive `LocationRole` regardless of verb type, voice, or whether the verb appears in `NON_ROLE_PP_VERBS_PASSIVE`
- [ ] `at`-PP, `from`-PP, `for`-PP, `with`-PP arguments are unaffected by `resolveToPPRole()`
- [ ] `resolveToPPRole()` is never called for non-`to` prepositions

### AC-RAX-12: Corpus Regression

- [ ] All 40 existing ISA corpus sentences that were passing before this addendum continue to pass
- [ ] Zero regressions on any sentence in the corpus
- [ ] All existing passive role flip behavior (`nsubj:pass` → `PatientRole`, `by`-agent → `AgentRole`) is unchanged

### AC-RAX-13: Target F1

- [ ] Corpus F1 on the 168 role-bearing sentences ≥ 83% after implementation of this addendum alone (before Fandaws integration)
- [ ] Corpus F1 ≥ 88% after Fandaws domain/range integration is built on top of this addendum

---

## 9. Expected F1 Impact

**Baseline:** 78.3% F1 (168 role-bearing sentences, 81 sentences with at least one error)

| Pattern | Affected Sentences | Current F1 | Projected After |
|---------|-------------------|-----------|-----------------|
| Ditransitive `to`-PP (active) | 9 | ~35% avg | ~85% avg |
| Passive + `to`-PP (RecipientRole) | 5 | ~50% avg | ~80% avg |
| Passive over-extraction (SUPPRESS) | 3 | ~67% avg | ~95% avg |
| No change (other patterns) | 151 | 78.3% | 78.3% |

**Projected overall F1:** ~83–85% before Fandaws integration, ~88–90% after.

GazetteerNER-based animacy (new in v1.1, corrected in v1.2) is expected to contribute an additional 2–4 sentences beyond the original 17, since several corpus sentences contain named individuals not registered in Fandaws but recognizable by the GazetteerNER pipeline. These are not counted in the projections above and represent upside.

---

## Document History

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-04-01 | Initial specification. Two patterns: ditransitive recipient detection and passive+PP interaction. |
| 1.1 | 2026-04-01 | Fixed `in`-PP suppression contradiction in AC-RAX-4 and §4.1; removed dead-code voice-adjusted table (§4.3); added NER `PERSON` and `ORG` animacy detection at priorities 2-3 in §3.3; added AC-RAX-3 (NER animacy), AC-RAX-9 (context.nerLabels), AC-RAX-11 (non-to PP unchanged). |
| 1.2 | 2026-04-01 | Corrected all `src/roles/` file paths to `src/core/` and `src/graph/` to match actual codebase layout; replaced spaCy NER labels (`PERSON`, `ORG`) with GazetteerNER entity type strings (`Person`, `Organization`, `GovernmentOrganization`) throughout §3.3, §7.2, AC-RAX-3, AC-RAX-9; renamed `context.nerLabels` to `context.gazetteerTypes`. |

---

*This addendum is a component of the TagTeam.js semantic parser project within the Ontology of Freedom Initiative / Federated Network for Sovereign Reasoning (FNSR).*
