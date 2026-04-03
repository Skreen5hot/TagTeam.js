# TagTeam Semantic Graph Builder Extension: Document Authority Wiring

**Document ID:** TT-SPEC-SGB-A  
**Version:** 1.1  
**Previous:** 1.0 (2026-04-03)  
**Date:** 2026-04-03  
**Status:** Approved for Implementation  
**Type:** Normative Addendum to TagTeam Two-Tier Architecture Specification  
**Depends on:**
- TagTeam Two-Tier Architecture Specification (current)
- TagTeam Realist Deontic Modeling Specification v1.2.1
- TT-SPEC-RDM-A v1.2 (passive handling, SUPPRESS semantics)
- TT-SPEC-SBA v1.3 (sentenceIndex, SentenceCluster)

---

## Document Status

This addendum specifies two normative extensions to `SemanticGraphBuilder`:

1. **Gap 3 — Document-to-Obligation Wiring:** When a token in a clause matches a `DirectiveInformationContentEntity` subclass via `OntologyTextTagger`, that document entity MUST be wired as the `is_prescribed_by` source on any `Obligation` node produced from the same clause, replacing the synthetic modal-marker `Directive` node.

2. **Gap 4 — Performative Vesting Act:** When a passive modal clause contains a vesting verb (a verb whose `PlanSpec` maps to a domain-defined `ActOfVesting` subclass), an `Act` node MUST be produced. This overrides the RDM's general passive modal suppression of Act nodes for this specific verb class.

**Motivation:** The constitution pipeline test exposed that `tagteam:USConstitution` is correctly identified via ontology match on the token "herein" but is excluded from entity extraction (correctly — "herein" is a syntactic modifier, not an argument entity). The match data is therefore not available as a `DiscourseReferent` to link into the deontic chain. A clause-level match record is needed to carry the match forward to `SemanticGraphBuilder` without requiring the token to be extracted as an entity. Gap 4 depends on Gap 3 being resolved first — the `Act` node's `realizes` relation requires a correct Obligation whose `is_prescribed_by` is already wired.

### v1.1 Revision Notes (from v1.0)

| Issue | Section | Nature |
|-------|---------|--------|
| **`authorityMatch` was a conditional field, not a gate** — v1.0's `_buildVestingAct` code produced an Act node without `prescribedBy` when `authorityMatch` was null, contradicting §4.4's stated dependency. A performative act without a known authority document is ontologically invalid — it cannot be `Discharged` if no enacting document is identified | §5.4 | Normative correction — `authorityMatch` is now Gate 4 in `_buildVestingAct`; if null, the method returns null and the obligation remains `Pending`. `prescribedBy` is no longer conditional on the node — it is always present when the Act node is produced |

Any algorithm, data structure, wiring rule, or prose describing clause-level match propagation, obligation source wiring, or Act node production conditions SHALL be interpreted as normative. MUST, MUST NOT, SHALL, SHOULD, RECOMMENDED, MAY, and OPTIONAL are interpreted per RFC 2119.

---

## Table of Contents

1. [Scope and Architecture Placement](#1-scope-and-architecture-placement)
2. [Definitions](#2-definitions)
3. [Gap 3: Clause-Level Authority Match](#3-gap-3-clause-level-authority-match)
4. [Gap 4: Performative Vesting Act Production](#4-gap-4-performative-vesting-act-production)
5. [SemanticGraphBuilder Changes](#5-semanticgraphbuilder-changes)
6. [OntologyTextTagger Changes](#6-ontologytextagger-changes)
7. [Acceptance Criteria](#7-acceptance-criteria)
8. [Expected Impact](#8-expected-impact)

---

## 1. Scope and Architecture Placement

### 1.1 Modules Modified

| Module | File | Change Type |
|--------|------|-------------|
| `OntologyTextTagger` | `src/nlp/OntologyTextTagger.js` | Additive — emits clause-level authority match record alongside token-level matches |
| `SemanticGraphBuilder` | `src/graph/SemanticGraphBuilder.js` | Additive — reads clause-level authority match; wires `is_prescribed_by`; conditionally produces Act node for vesting verbs |

No changes to `TreeEntityExtractor`, `TreeRoleMapper`, `RoleMappingContract`, `SentenceSegmenter`, or any SHACL shapes.

### 1.2 What Is Not Changed

- Token-level entity extraction decisions — whether "herein" is extracted as a `DiscourseReferent` remains the entity extractor's decision and is not modified by this spec
- The synthetic `Directive` node produced from the modal marker — it is retained as a fallback when no clause-level authority match exists
- All non-vesting passive modal handling — RDM's passive suppression of Act nodes continues unchanged for all verbs not in `VESTING_VERBS`
- Gold ISA corpus behavior — the ISA corpus does not load external ontologies; no clause-level authority matches will be produced; all existing deontic chain construction is unchanged

---

## 2. Definitions

| Term | Definition |
|------|-----------|
| **Clause-level authority match** | A record produced by `OntologyTextTagger` when any token in a sentence matches a `DirectiveInformationContentEntity` subclass, regardless of whether that token is extracted as a Tier 1 entity. Stored at the sentence level, not the token level. |
| **Authority document** | The Named Individual in the loaded ontology that the clause-level authority match resolves to. Has at least one `rdf:type` that is a subclass of `cco:DirectiveInformationContentEntity`. |
| **`VESTING_VERBS`** | The normative registry of verb lemmas that, when appearing in a passive modal clause whose `PlanSpec` maps to a domain-defined `ActOfVesting` subclass, MUST produce an Act node. Defined in §4.2. |
| **Performative obligation** | An obligation that is enacted by the authoritative document at ratification or issuance — not a future obligation on an agent. Distinguished from directive obligations by the passive voice construction and the absence of a named prescribed agent. |
| **Synthetic Directive node** | The `DirectiveInformationContentEntity` node currently created by `SemanticGraphBuilder` from the modal marker alone (e.g., `inst:Directive_shall_549f0d18ce93`). Retained as fallback; superseded by the authority document when a clause-level authority match is present. |

---

## 3. Gap 3: Clause-Level Authority Match

### 3.1 The Problem

"herein" matches `tagteam:USConstitution` (a `ConstitutionalDocument` / `DirectiveInformationContentEntity` subclass) with confidence 1. The dep tree corrector correctly excludes "herein" from entity extraction — it is a syntactic adverbial modifier, not an argument entity. As a result, no `DiscourseReferent` for `tagteam:USConstitution` appears in the Tier 1 graph, and the authority document cannot be linked to the `Obligation` node's `is_prescribed_by` relation.

The current `Obligation` node says:
```json
"is_prescribed_by": { "@id": "inst:Directive_shall_549f0d18ce93" }
```

The ideal graph says:
```json
"tagteam:is_prescribed_by": { "@id": "inst:USConstitution" }
```

The synthetic Directive is a parser artifact. The authority document is the semantically correct source.

### 3.2 Clause-Level Authority Match Record

`OntologyTextTagger` MUST produce a **clause-level authority match record** whenever any token in a sentence matches a `DirectiveInformationContentEntity` subclass, regardless of the token's syntactic role and regardless of whether the token is extracted as an entity.

**Record structure:**

```javascript
{
  sentenceIndex: 0,                    // from SentenceRecord.sentenceIndex
  matchedToken: "herein",              // the token text that triggered the match
  matchedTokenIndex: 3,                // sentence-relative token index
  authorityIRI: "https://example.org/tagteam/ontology#USConstitution",
  authorityLabel: "Constitution of the United States",
  authorityTypes: [                    // rdf:type declarations of the matched IRI
    "tagteam:ConstitutionalDocument",
    "cco:DirectiveInformationContentEntity",
    "owl:NamedIndividual"
  ],
  matchConfidence: 1,
  matchType: "alias"                   // "exact", "alias", "altLabel"
}
```

This record is produced in addition to any token-level match records. It is stored on the `SegmenterOutput` or equivalent sentence-level structure passed to `SemanticGraphBuilder`, not on any individual token or entity.

**When to produce:** Only when `matchConfidence >= 1` AND the matched IRI's `rdf:type` includes a class that is a subclass of `cco:DirectiveInformationContentEntity`. A generic Organization or Person match does not produce a clause-level authority match record.

**Multiple matches:** If two tokens in the same sentence match different `DirectiveInformationContentEntity` subclass individuals, two records are produced. `SemanticGraphBuilder` uses the record with the highest confidence; if equal, the one whose matched IRI appears earliest in the sentence.

### 3.3 Obligation Wiring Rule

When `SemanticGraphBuilder` constructs an `Obligation` node for a clause, it MUST check whether a clause-level authority match record exists for the same `sentenceIndex`. If one exists:

1. Create a Tier 2 node for the authority document if one does not already exist:
   ```javascript
   {
     "@id": "inst:{localName}",           // local name from authority IRI
     "@type": authorityRecord.authorityTypes,
     "rdfs:label": authorityRecord.authorityLabel,
     "tagteam:identifiedVia": authorityRecord.matchedToken,
     "tagteam:typeBasis": "ontology-match"
   }
   ```

2. Set `is_prescribed_by` on the Obligation to point to the authority document node, NOT to the synthetic Directive node:
   ```javascript
   obligation["is_prescribed_by"] = { "@id": `inst:${localName}` };
   ```

3. Retain the synthetic Directive node — it may still be useful for downstream processing — but remove it from the `is_prescribed_by` chain.

4. If no clause-level authority match exists, use the synthetic Directive node as before (existing behavior, unchanged).

### 3.4 The IBE Is Not the Authority Document

The `InformationBearingEntity` represents the physical text input. The authority document represents the normative source of the obligation. These are different ontological entities. The IBE MUST NOT be promoted to `is_prescribed_by` even when it is identified as a `ConstitutionalDocument`. The IBE's role is provenance (`is_concretized_by`), not authority (`is_prescribed_by`). The authority document node created in §3.3 step 1 is distinct from the IBE.

---

## 4. Gap 4: Performative Vesting Act Production

### 4.1 The Problem and the Decision

The RDM's general rule suppresses Act nodes for passive modal clauses, routing them through PlanSpec only. This is correct for most regulatory text — "records shall be provided" describes a future obligation, not an act being performed.

Constitutional vesting clauses are a different ontological category. "All legislative Powers herein granted shall be vested in a Congress" is a **performative** — the text enacts the vesting at the moment of ratification. The obligation is not pending; it was discharged at ratification. The appropriate representation includes an Act node typed to the domain's `ActOfVesting` class, realizing the Obligation.

**The normative decision:** Passive modal clauses containing a verb in `VESTING_VERBS` AND whose PlanSpec maps to a domain-defined `ActOfVesting` subclass (i.e., the matched `prescribedActType` is a `tagteam:` IRI, not a bare verb lemma) MUST produce an Act node. All other passive modal clauses continue to suppress Act nodes per the existing RDM rule.

### 4.2 `VESTING_VERBS` Registry

```javascript
const VESTING_VERBS = new Set([
  'vest', 'vested',
  'grant', 'granted',
  'confer', 'conferred',
  'delegate', 'delegated',
  'invest', 'invested',     // "invested with authority"
  'ordain', 'ordained',
  'establish', 'established'
]);
```

**Extension mechanism:** Loadable from `src/core/vesting-verbs.json`. Seed set is normative; JSON file entries are additive.

**Trigger condition — both must hold simultaneously:**

1. The verb lemma is in `VESTING_VERBS`
2. The `PlanSpec` node's `prescribedActType` is a domain IRI (contains `tagteam:` or the loaded ontology's namespace prefix) — meaning the OntologyTextTagger matched the verb to a domain-defined act class

If `prescribedActType` is a bare lemma string (e.g., `"vest"`) rather than a domain IRI, condition 2 fails and the Act node is NOT produced. This prevents spurious Act node creation when processing ISA corpus text that uses the word "vest" without a loaded domain ontology that defines `tagteam:ActOfVesting`.

### 4.3 Act Node Structure

When both trigger conditions are met:

```javascript
{
  "@id": `inst:Act_${verbLemma}_${hash}`,
  "@type": [
    prescribedActType,          // e.g., "tagteam:ActOfVesting"
    "owl:NamedIndividual"
  ],
  "rdfs:label": `Act: ${verbLemma} (performative)`,
  "realizes": { "@id": obligationId },
  "tagteam:isPerformative": true,
  "tagteam:fulfillmentState": { "@id": "tagteam:Discharged" },
  "tagteam:prescribedBy": { "@id": authorityDocumentId }
}
```

**`tagteam:isPerformative: true`** — flags this Act as enacted at the time of document ratification, not as a future obligation. Downstream reasoning can use this flag to distinguish performative acts from directive obligations.

**`tagteam:fulfillmentState: Discharged`** — performative obligations are discharged at ratification. The corresponding `Obligation` node's `fulfillmentState` MUST also be updated from `tagteam:Pending` to `tagteam:Discharged` when a performative Act is produced.

**Role assignments on the Act node:**

- `hasPatient` — the entity whose type is being vested (the universal quantifier entity, e.g., `inst:Entity_All_Legislative_Power` — even if unresolved, the relation is asserted)
- `hasRecipient` — the entity receiving the vested authority (the `obl` argument of the passive vesting verb, e.g., `inst:Congress`)

Role assignment for the Act node runs AFTER the Obligation wiring (§3.3) because `hasRecipient` should point to the authority-receiving entity, which may require the clause-level match to be processed first.

### 4.4 Dependency on Gap 3

The Act node MUST NOT be produced if no Obligation node exists for the clause. If Gap 3 wiring is not in place, the `realizes` relation on the Act node has no valid target. Implementations MUST check for an Obligation node before producing the Act node. If no Obligation exists (e.g., because the clause-level authority match failed), fall back to PlanSpec-only output per existing RDM behavior.

---

## 5. SemanticGraphBuilder Changes

### 5.1 Clause-Level Authority Match Ingestion

In `SemanticGraphBuilder.buildSentenceGraph()`, after receiving the `SentenceRecord` and its associated tagger output, extract any clause-level authority match records:

```javascript
const authorityMatch = sentenceRecord.clauseAuthorityMatch ?? null;
// null if no DirectiveInformationContentEntity match in this sentence
```

Pass `authorityMatch` into the obligation construction method.

### 5.2 Obligation Construction — Modified

```javascript
_buildObligation(verbPhrase, planSpec, authorityMatch, context) {
  const obligation = {
    "@id": `inst:Obligation_${verbPhrase.lemma}_${hash}`,
    "@type": ["Obligation", "owl:NamedIndividual"],
    "rdfs:label": `Obligation: ${verbPhrase.lemma}`,
    "tagteam:deonticCategory": { "@id": verbPhrase.deonticCategory },
    "tagteam:fulfillmentState": { "@id": "tagteam:Pending" },
    "isSpecifiedBy": { "@id": planSpec["@id"] }
  };

  if (authorityMatch && authorityMatch.matchConfidence >= 1) {
    // Gap 3: wire authority document as prescribed_by source
    const authorityNode = this._getOrCreateAuthorityNode(authorityMatch, context);
    obligation["is_prescribed_by"] = { "@id": authorityNode["@id"] };
    // Retain synthetic Directive but remove from is_prescribed_by chain
    obligation["tagteam:syntheticDirective"] = { "@id": syntheticDirectiveId };
  } else {
    // Fallback: existing behavior — synthetic Directive as prescribed_by
    obligation["is_prescribed_by"] = { "@id": syntheticDirectiveId };
  }

  return obligation;
}
```

### 5.3 PlanSpec Construction — Modified for Domain Act Type

When `OntologyTextTagger` matches the verb to a domain act class, the `prescribedActType` MUST be set to the matched IRI, not the bare lemma:

```javascript
planSpec["tagteam:prescribedActType"] = verbHasDomainMatch
  ? domainActClassIRI          // e.g., "tagteam:ActOfVesting"
  : verbPhrase.lemma;          // e.g., "vest" (fallback — existing behavior)
```

This is the condition checked in §4.2 trigger condition 2.

### 5.4 Vesting Act Production — New Method

```javascript
_buildVestingAct(verbPhrase, obligation, planSpec, authorityMatch, sentence, context) {
  // Gate 1: verb must be in VESTING_VERBS
  if (!VESTING_VERBS.has(verbPhrase.lemma)) return null;

  // Gate 2: prescribedActType must be a domain IRI, not a bare lemma
  if (!planSpec["tagteam:prescribedActType"]?.includes('tagteam:')) return null;

  // Gate 3: Obligation must exist (realizes target)
  if (!obligation) return null;

  // Gate 4: authorityMatch must be present — a performative act requires a known
  // authoritative document. Without a recognized prescribing document, we cannot
  // assert that the vesting is enacted rather than pending. Fall back to
  // Obligation-only output (existing behavior).
  if (!authorityMatch) return null;

  // All four gates passed — produce the performative Act node

  // Update obligation fulfillmentState to Discharged
  obligation["tagteam:fulfillmentState"] = { "@id": "tagteam:Discharged" };

  const actNode = {
    "@id": `inst:Act_${verbPhrase.lemma}_${hash}`,
    "@type": [planSpec["tagteam:prescribedActType"], "owl:NamedIndividual"],
    "rdfs:label": `Act: ${verbPhrase.lemma} (performative)`,
    "realizes": { "@id": obligation["@id"] },
    "tagteam:isPerformative": true,
    "tagteam:fulfillmentState": { "@id": "tagteam:Discharged" },
    "tagteam:prescribedBy": {
      "@id": this._getOrCreateAuthorityNode(authorityMatch, context)["@id"]
    }
  };

  // Role assignment
  const patientEntity = this._findUniversalQuantifierEntity(sentence);
  const recipientEntity = this._findOblArgEntity(verbPhrase, sentence);

  if (patientEntity) actNode["tagteam:hasPatient"] = { "@id": patientEntity["@id"] };
  if (recipientEntity) actNode["tagteam:hasRecipient"] = { "@id": recipientEntity["@id"] };

  return actNode;
}
```

**Four gates, all mandatory.** The `authorityMatch` gate (Gate 4) answers the question the cautionary note raised: is a performative act valid if we don't know what document enacted it? The answer is no. A performative requires a known authoritative source. Without one, the obligation remains `Pending` and the Act node is not produced. This is not a degraded fallback — it is the ontologically correct behavior. "Shall be vested" without a recognizable authority document is an unresolved prescription, not a performative enactment.

### 5.5 Call Site Ordering

Within `buildSentenceGraph()`, the sequence for deontic sentences is:

```javascript
// 1. Build PlanSpec (with domain act type if available)
const planSpec = this._buildPlanSpec(verbPhrase, domainActClassIRI);

// 2. Build Obligation (with Gap 3 authority wiring)
const obligation = this._buildObligation(verbPhrase, planSpec, authorityMatch, context);

// 3. Conditionally build Vesting Act (Gap 4 — depends on steps 1+2)
const vestingAct = verbPhrase.isPassive
  ? this._buildVestingAct(verbPhrase, obligation, planSpec, authorityMatch, sentence, context)
  : null;

// 4. Add to output — vestingAct may be null (no change if null)
if (vestingAct) graphOutput.push(vestingAct);
```

---

## 6. OntologyTextTagger Changes

### 6.1 Clause-Level Match Emission

In `OntologyTextTagger.tag()`, after processing all tokens in a sentence, check whether any token produced a match whose IRI resolves to a `DirectiveInformationContentEntity` subclass:

```javascript
_emitClauseAuthorityMatch(sentenceRecord, tokenMatches, ontologyGraph) {
  const authorityMatches = tokenMatches.filter(m =>
    m.confidence >= 1 &&
    ontologyGraph.isSubclassOf(m.matchedIRI, 'cco:DirectiveInformationContentEntity')
  );

  if (authorityMatches.length === 0) return null;

  // Use highest confidence match; earliest token position as tiebreaker
  const best = authorityMatches.sort((a, b) =>
    b.confidence - a.confidence || a.tokenIndex - b.tokenIndex
  )[0];

  return {
    sentenceIndex: sentenceRecord.sentenceIndex,
    matchedToken: best.tokenText,
    matchedTokenIndex: best.tokenIndex,
    authorityIRI: best.matchedIRI,
    authorityLabel: best.matchedLabel,
    authorityTypes: ontologyGraph.getTypes(best.matchedIRI),
    matchConfidence: best.confidence,
    matchType: best.matchType
  };
}
```

This method runs regardless of whether the token is extracted as an entity. The entity extraction decision and the clause-level authority match are independent.

### 6.2 Integration with SentenceRecord

The clause-level authority match is attached to the `SentenceRecord` as `clauseAuthorityMatch`:

```javascript
sentenceRecord.clauseAuthorityMatch = this._emitClauseAuthorityMatch(
  sentenceRecord, tokenMatches, ontologyGraph
) ?? null;
```

`clauseAuthorityMatch` is `null` when no qualifying match exists. This field is always present (not absent) on `SentenceRecord` when `OntologyTextTagger` has run — `null` means "no authority document found," not "field not checked."

---

## 7. Acceptance Criteria

### AC-SGB-1: Clause-Level Authority Match Production

- [ ] Input containing "herein" matching `tagteam:USConstitution` → `sentenceRecord.clauseAuthorityMatch` is non-null with `authorityIRI: "https://example.org/tagteam/ontology#USConstitution"`
- [ ] "herein" excluded from entity extraction (dep tree corrector decision) → clause-level match still produced
- [ ] `clauseAuthorityMatch` is `null` on all ISA corpus sentences (no external ontology loaded; no DirectiveInformationContentEntity matches possible)

### AC-SGB-2: Obligation Wiring

- [ ] Constitution sentence: `Obligation_vested.is_prescribed_by` → `inst:USConstitution` (authority document node), NOT `inst:Directive_shall_*`
- [ ] Authority document node has `@type` including `tagteam:ConstitutionalDocument` and `cco:DirectiveInformationContentEntity`
- [ ] ISA corpus: `Obligation.is_prescribed_by` → synthetic Directive node (existing behavior unchanged; `clauseAuthorityMatch` is null)

### AC-SGB-3: Authority Document Node Creation

- [ ] `inst:USConstitution` node created in the output graph with correct `@type`, `rdfs:label "Constitution of the United States"`, and `tagteam:identifiedVia: "herein"`
- [ ] Node is created once — if two clauses in the same document reference the same authority IRI, only one authority document node exists
- [ ] Authority document node is NOT the IBE node (`inst:Input_Text_IBE_*`)

### AC-SGB-4: PlanSpec Domain Act Type

- [ ] Constitution sentence: `PlanSpec_vested.prescribedActType === "tagteam:ActOfVesting"` (IRI, not bare lemma)
- [ ] ISA corpus sentence with verb "vest" and no loaded domain ontology: `PlanSpec.prescribedActType === "vest"` (bare lemma — existing behavior)

### AC-SGB-5: Vesting Act Production

- [ ] Constitution sentence ("shall be vested"): Act node produced with `@type: ["tagteam:ActOfVesting", "owl:NamedIndividual"]`
- [ ] Act node has `realizes → inst:Obligation_vested`
- [ ] Act node has `tagteam:isPerformative: true`
- [ ] Act node has `tagteam:fulfillmentState: tagteam:Discharged`
- [ ] Corresponding Obligation node has `tagteam:fulfillmentState: tagteam:Discharged` (updated from Pending)
- [ ] ISA corpus passive modal ("records shall be provided"): NO Act node produced — `prescribedActType` is a bare lemma, trigger condition 2 fails

### AC-SGB-6: Act Node Role Assignments

- [ ] `Act_vested.hasPatient` → the entity for "All legislative Powers" (even if `denotesType: LegislativePower` via Gap 5a fix)
- [ ] `Act_vested.hasRecipient` → the entity for "a Congress" (the obl argument of the passive vesting clause)

### AC-SGB-7: Regression

- [ ] ISA gold corpus Role F1 holds at 83.0% — no change (clause-level authority match is null on all ISA sentences; no new Act nodes produced)
- [ ] SBA holds at 143/144
- [ ] SHACL holds at 21/21

### AC-SGB-8: Dependency Enforcement

- [ ] When `clauseAuthorityMatch` is null but verb is in `VESTING_VERBS` AND `prescribedActType` is a domain IRI: Act node is NOT produced; Obligation remains `tagteam:Pending` (Gate 4 blocks)
- [ ] When `clauseAuthorityMatch` is non-null but verb is NOT in `VESTING_VERBS`: Obligation is wired to authority document (Gap 3 only; Gate 1 blocks Gap 4)
- [ ] When all four gates pass: Act node IS produced; `tagteam:prescribedBy` is always present on the Act node — never absent, never conditional
- [ ] `Obligation.fulfillmentState` is `Discharged` if and only if an Act node was produced; remains `Pending` in all other cases

---

## 8. Expected Impact

**On the constitution test:**

| Node | Before | After |
|------|--------|-------|
| `Obligation_vested.is_prescribed_by` | `inst:Directive_shall_*` | `inst:USConstitution` |
| `inst:USConstitution` | Absent | Present — `ConstitutionalDocument` + `DirectiveInformationContentEntity` |
| Act node | Absent (`acts: 0`) | `inst:Act_vested` — `tagteam:ActOfVesting` |
| `PlanSpec.prescribedActType` | `"vest"` | `"tagteam:ActOfVesting"` |
| `Obligation.fulfillmentState` | `tagteam:Pending` | `tagteam:Discharged` |
| `Act_vested.prescribedBy` | N/A | Always present — `inst:USConstitution` |

**On the ISA corpus:** No change. All metrics hold.

**On the ideal graph comparison:** After this spec is implemented, the current output will match the ideal graph on every node except the deferred items (Bug 3 — Senate/HoR split; Gap 5c — continuant_part_of propagation).

---

## Document History

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-04-03 | Initial specification. Gap 3: clause-level authority match record; Obligation wiring to authority document. Gap 4: VESTING_VERBS registry; performative Act node production conditioned on domain IRI in prescribedActType. |
| 1.1 | 2026-04-03 | `authorityMatch` promoted from conditional field to Gate 4 in `_buildVestingAct`. A performative act without a known authority document is ontologically invalid — obligation remains Pending when Gate 4 fails. `prescribedBy` is now always present on produced Act nodes. AC-SGB-8 extended with explicit gate enforcement test cases. |

---

*This addendum is a component of the TagTeam.js semantic parser project within the Ontology of Freedom Initiative / Federated Network for Sovereign Reasoning (FNSR).*
