# Architecture Issue: Tier 1/Tier 2 Type Separation Violation

**Severity:** Architecture Debt (not a hotfix)  
**Filed by:** Aaron, Technical Lead / Semantic Architect  
**Date:** February 25, 2026  
**Revised:** February 26, 2026 (post @context audit v2.2)  
**Affects:** All output graphs  
**Blocked by:** @context audit v2.2 ✅ (completed 2026-02-26 — IRI integrity prerequisite satisfied)  
**Blocks:** `tagteam.ttl` formalization, OWL reasoner compatibility, SHACL validation pipeline

---

## Summary

A reviewer correctly identified that Role bearer pointers target Discourse Referent nodes instead of real-world Entity nodes. This is a real ontological issue, but the root cause runs deeper than the bearer pointer. Tier 1 nodes are dual-typed as both information entities and independent continuants, which is an ontological contradiction that would be flagged by any OWL reasoner. Fixing the bearer pointer without fixing the dual-typing creates a new inconsistency while solving the old one.

This document explains the real problem, why the naive fix is insufficient, and what the correct resolution looks like.

---

## The Contradiction

Every Tier 1 Discourse Referent node currently carries two types that are ontologically incompatible:

```json
{
  "@id": "inst:The_doctor",
  "@type": ["Person", "tagteam:DiscourseReferent"]
}
```

This node simultaneously claims to be:

1. **A Person** — `cco:ont00001262`, which is a subclass of Agent → IndependentContinuant. A physical entity that exists in the world, occupies space, bears roles, and participates in acts.

2. **A DiscourseReferent** — `tagteam:DiscourseReferent`. A mention in text. An information-layer entity that refers to a real-world thing but is not itself that thing.

The words "the doctor" on a page cannot perform surgery. The actual doctor can. These are different things. BFO is explicit about this distinction — it's the entire reason the Information Entity branch exists separately from the Independent Continuant branch. When we formalize `tagteam:DiscourseReferent` in `tagteam.ttl`, it will be declared as a subclass of `GenericallyDependentContinuant` or `InformationContentEntity`, at which point any reasoner will immediately flag the dual typing as a disjointness violation.

We built the two-tier architecture specifically to enforce this separation. Tier 1 is the linguistic layer (what was said). Tier 2 is the ontological layer (what exists in the world). But the current implementation collapses the two tiers on Tier 1 nodes by giving them both types.

---

## Why This Matters Now

Three things are converging:

1. **The `tagteam.ttl` task** (Tier 2 item in the Production Readiness Checklist) requires us to formally declare what `DiscourseReferent` is. The moment we do, the dual-typing contradiction becomes machine-detectable.

2. **The role bearer issue** reported by the reviewer. Role nodes have `tagteam:bearer` pointing to Tier 1 nodes. In BFO, roles inhere in independent continuants. A DiscourseReferent is not an independent continuant. This is currently masked because Tier 1 nodes also carry the `Person`/`Organization` type, so a reasoner could technically validate the bearer — but only by ignoring the `DiscourseReferent` type, which it won't.

3. **Fandaws integration.** Fandaws will consume these graphs and reason over them. If Tier 1 nodes claim to be both information entities and physical entities, Fandaws can't determine which branch of BFO to reason about.

---

## What the Reviewer Proposed (and Why It's Insufficient)

The reviewer proposed changing `tagteam:bearer` to point from the Discourse Referent to the Tier 2 entity:

```
// Before (current)
Role.bearer → inst:The_doctor (Tier 1, DiscourseReferent)

// Proposed fix
Role.bearer → inst:Person_Doctor_af188af80b7c (Tier 2, Person)
```

This fixes the bearer pointer but leaves the dual-typing in place. After this fix:

- Tier 1 nodes still claim to be `["Person", "DiscourseReferent"]` — still ontologically contradictory.
- Tier 1 nodes carry `Person` in `@type` but no roles point to them — the type is now orphaned metadata with no functional purpose.
- Consumers querying for all `Person` nodes get both Tier 1 and Tier 2 results, with different structures and different properties. Confusing.
- The graph becomes harder to traverse: to get from a Role to the linguistic metadata (parseConfidence, mentionId), you'd go Role → Tier 2 → (reverse is_about lookup) → Tier 1. Every query gets an extra hop.

The fix addresses a symptom while the disease remains.

---

## The Correct Fix

Four changes, implemented together as a single architectural commit:

### Change 1: Remove ontological types from Tier 1 nodes

Tier 1 nodes are linguistic objects. Their `@type` should reflect only that:

```json
// BEFORE (current — ontologically contradictory)
{
  "@id": "inst:The_doctor",
  "@type": ["Person", "tagteam:DiscourseReferent"],
  "tagteam:denotesType": "Person"
}

// AFTER (clean — linguistic layer only)
{
  "@id": "inst:The_doctor",
  "@type": ["DiscourseReferent"],
  "denotesType": "Person"
}
```

The ontological type (`Person`) moves exclusively to the Tier 2 entity where it belongs. The `denotesType` property on the Tier 1 node still communicates "this mention refers to a Person" — but as a metadata claim, not as an ontological assertion about what the mention itself *is*.

> **Implementation note:** `denotesType` is legitimately TagTeam-scoped — CCO has no "denotes the type of the real-world referent" annotation property. It must be added to the @context and declared in `tagteam-v3.ttl` as part of this work.

### Change 2: Move role bearers to Tier 2 entities using `inheres_in`

With Tier 1 nodes no longer carrying ontological types, role bearers must point to Tier 2. The current codebase uses `tagteam:bearer`, which duplicates an existing BFO property. In BFO, roles *inhere in* their bearers via `inheres_in` (`bfo:BFO_0000197`), which is already aliased in the @context (verified in audit v2.2).

```json
// BEFORE
{
  "@id": "inst:Role_The_doctor_AgentRole",
  "tagteam:bearer": { "@id": "inst:The_doctor" }
}

// AFTER
{
  "@id": "inst:Role_Doctor_AgentRole",
  "inheres_in": { "@id": "inst:Person_Doctor_af188af80b7c" }
}
```

This is now ontologically clean: a `Role` (`BFO_0000023`) inheres in a `Person` (subclass of IndependentContinuant). No domain/range violations. The `inheres_in` property resolves through the @context to `bfo:BFO_0000197`, not a fabricated tagteam IRI.

> **Audit note:** `tagteam:bearer` is a fabricated property that duplicates `bfo:BFO_0000197` (`inheres_in`). Verify usage in `RoleDetector.js` and `SemanticGraphBuilder.js`. If `bearer` is used as a bare key anywhere in JSON-LD output, either add it as an @context alias to `bfo:BFO_0000197` or replace it with `inheres_in` directly. Do not retain both.

### Change 3: Add back-link from Tier 2 to Tier 1 using `is_subject_of`

Currently, the Tier 1 → Tier 2 link is `is_about` (`cco:ont00001808`). There's no reverse link. After moving role bearers to Tier 2, consumers traversing from a Role to the linguistic metadata need a path. Two options:

**Option A:** Consumers follow the reverse `is_about` link. This is standard in graph databases but requires a reverse lookup, which is O(n) in a JSON-LD document without an index.

**Option B:** Add the explicit CCO inverse property on Tier 2 nodes:

```json
{
  "@id": "inst:Person_Doctor_af188af80b7c",
  "@type": ["Person", "owl:NamedIndividual"],
  "is_subject_of": { "@id": "inst:The_doctor" }
}
```

Recommend **Option B** for graph traversability. `is_subject_of` (`cco:ont00001801`) is the formal CCO inverse of `is_about` — it was added to the @context during audit v2.2 for exactly this use case. The back-link costs one property per Tier 2 node and eliminates the reverse lookup.

> **Why `is_subject_of` and not `tagteam:denoted_by`:** The original draft of this document proposed minting `tagteam:denoted_by`. The @context audit v2.2 established the principle that TagTeam must not mint properties when CCO already defines the exact relationship. `is_subject_of` exists, has the correct semantics (inverse of `is_about`), and is already in the @context with a verified opaque IRI. Minting `tagteam:denoted_by` would be the same class of error the audit was designed to eliminate.

### Change 4: Add `denotesType` to @context and `tagteam-v3.ttl`

`denotesType` is used on Tier 1 nodes to communicate the ontological type of the real-world referent without asserting that type on the Tier 1 node itself. This property has no CCO equivalent — it is legitimately TagTeam-scoped.

Add to @context:
```json
"denotesType": { "@id": "tagteam:denotesType" }
```

Declare in `tagteam-v3.ttl`:
```turtle
tagteam:denotesType rdf:type owl:AnnotationProperty ;
    rdfs:label "denotes type"@en ;
    rdfs:comment "Indicates the ontological type of the real-world entity that a DiscourseReferent refers to, without asserting that type on the DiscourseReferent node itself."@en ;
    rdfs:domain tagteam:DiscourseReferent .
```

---

## What the Output Looks Like After the Fix

Input: *"The doctor must allocate the last ventilator between two critically ill patients"*

```
Tier 1 (Linguistic):
  inst:The_doctor
    @type: [DiscourseReferent]
    denotesType: "Person"
    mentionId: "s0:h2:0-10"
    parseConfidence: "high"
    is_about → inst:Person_Doctor_af18...
    is_concretized_by → inst:Input_Text_IBE_...

Tier 2 (Ontological):
  inst:Person_Doctor_af18...
    @type: [Person, owl:NamedIndividual]
    typeBasis: "keyword"
    is_subject_of → inst:The_doctor

Roles:
  inst:Role_Doctor_AgentRole
    @type: [Role]
    inheres_in → inst:Person_Doctor_af18...    ← points to Tier 2 via BFO property
    realizedIn → inst:Act_allocate

Act:
  inst:Act_allocate
    @type: [IntentionalAct, VerbPhrase]
    is_concretized_by → inst:Input_Text_IBE_...
```

Tier separation is enforced: linguistic metadata stays on Tier 1, ontological assertions stay on Tier 2, roles connect to the ontological layer through verified BFO/CCO properties.

---

## Breaking Changes

This is a structural change to the output graph. Every consumer will be affected:

| What changes | Before | After |
|---|---|---|
| Tier 1 `@type` | `["Person", "DiscourseReferent"]` | `["DiscourseReferent"]` |
| Role bearer property | `tagteam:bearer` → Tier 1 | `inheres_in` (`bfo:BFO_0000197`) → Tier 2 |
| Tier 2 nodes | No back-link | `is_subject_of` (`cco:ont00001801`) → Tier 1 |
| Consumer queries for "all Persons" | Match both Tier 1 and Tier 2 | Match Tier 2 only |
| Consumer path: Role → linguistic metadata | Role → bearer → Tier 1 (direct) | Role → inheres_in → Tier 2 → is_subject_of → Tier 1 |

### Affected artifacts:

- **Output Schema Specification** — Node Type 1 and Node Type 4 sections need rewriting
- **Gold baselines** — All 200 files affected (Tier 1 `@type` changes on every referent)
- **SHMLValidator** — Tier 1 validation rules, role bearer validation
- **Test files** — All component tests that assert `@type` on Tier 1 nodes
- **ECVE** — If it queries Tier 1 `@type` for ontological filtering
- **@context** — Add `denotesType`, verify/replace `bearer` alias

---

## What NOT to Do

- **Do not implement only the bearer pointer fix.** It creates a half-state where Tier 1 nodes carry ontological types that nothing uses, and the dual-typing contradiction remains.
- **Do not add `sh:class bfo:BFO_0000004` (IndependentContinuant) to the SHACL shape.** The reviewer's SHACL constraint requires bearers to be IndependentContinuants, but TagTeam's default type is `Entity` (BFO_0000001), which is the BFO root class and is NOT a subclass of IndependentContinuant. The SHACL shape would reject valid output. The correct constraint is `sh:not [ sh:class tagteam:DiscourseReferent ]` — bearers must not be discourse referents. That's sufficient.
- **Do not rush this into a hotfix.** This is an architectural change that touches the fundamental graph structure. Scope it as a dedicated sprint item with its own test validation cycle.
- **Do not mint `tagteam:denoted_by`.** CCO's `is_subject_of` (`cco:ont00001801`) is the formal inverse of `is_about` and is already in the @context. Minting a duplicate violates the IRI integrity principle established in audit v2.2.
- **Do not retain `tagteam:bearer` alongside `inheres_in`.** If `bearer` is used in codebase, migrate it to `inheres_in` or alias it to `bfo:BFO_0000197` in the @context. Having both creates consumer confusion and interoperability debt.

---

## Scope Estimate

| Task | Effort |
|---|---|
| Modify RoleDetector.js to resolve bearer through `is_about` and use `inheres_in` | Small — the `is_about` target is already computed before role assignment |
| Audit `tagteam:bearer` usage, migrate to `inheres_in` (`bfo:BFO_0000197`) | Small — verify no downstream code depends on the `bearer` key |
| Modify SemanticGraphBuilder.js to remove ontological types from Tier 1 `@type` | Medium — need to verify no downstream code depends on Tier 1 carrying CCO types |
| Add `is_subject_of` back-link to RealWorldEntityFactory.js | Small — property already in @context |
| Add `denotesType` to @context and declare in `tagteam-v3.ttl` | Small |
| Grep for `has_participant`/`has_agent` on act nodes (edge case from reviewer) | Small — verify these only appear on provenance ParsingAct, not domain acts |
| Update SHMLValidator for new Tier 1/Tier 2 shape | Medium |
| Update Output Schema Specification | Small |
| Regenerate all gold baselines | Mechanical (200 files) |
| Update component tests | Medium (Tier 1 `@type` assertions change everywhere) |
| Verify ECVE and any other consumers | Depends on consumer count |

Total estimate: 1–2 days of focused work, plus baseline regeneration and consumer verification.

---

## Recommendation

Schedule this as the first item in the next development cycle. It should land before `tagteam.ttl` formalization (since `tagteam.ttl` will declare `DiscourseReferent`'s position in the BFO hierarchy, at which point the dual-typing becomes machine-detectable as an error). It should also land before any Fandaws integration testing, since Fandaws will reason over these graphs.

The IRI integrity audit gave us confidence that every IRI in the graph is real. This fix gives us confidence that every *assertion* in the graph is real — that when we say something is a Person, we mean the actual person, not the text that mentions them.

---

## Appendix: Audit Trail

| Date | Event |
|---|---|
| 2026-02-25 | Original issue filed based on reviewer feedback |
| 2026-02-25 | Reviewer feedback incorporated: `is_subject_of` over `tagteam:denoted_by`, act participant edge case identified |
| 2026-02-25 | `has_input`/`has_output` IRI duplication identified (CCO properties exist) |
| 2026-02-25 | @context audit v2.2 initiated against merged CCO |
| 2026-02-26 | @context audit v2.2 completed: 3 critical IRI fixes, 3 missing inverse properties, 2 datatype typing fixes, 198 entries validated |
| 2026-02-26 | Architecture issue revised: `denoted_by` → `is_subject_of`, `bearer` → `inheres_in`, `denotesType` formalization added, scope estimate updated |
