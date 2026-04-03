# TagTeam Entity Coordination Extraction Specification — Addendum B

**Document ID:** TT-SPEC-ENT-A-B  
**Version:** 1.1  
**Previous:** 1.0 (2026-04-03)  
**Date:** 2026-04-03  
**Status:** Approved for Implementation  
**Type:** Normative Addendum to TT-SPEC-ENT-A v1.1  
**Depends on:**
- TT-SPEC-ENT-A v1.1 (Pattern 1 coordination splitting — implemented)
- TagTeam Two-Tier Architecture Specification (current)
- TT-SPEC-SGB-A v1.1 (graph assembly infrastructure)
- TagTeam SHACL Validation Specification v1.3.1

---

## Document Status

This addendum specifies two normative extensions that close Bug 3 (Senate/HoR coordination split) and Gap 5c (`continuant_part_of` propagation):

1. **CDD Ontology Awareness (Change 1):** `ComplexDesignatorDetector` receives a `knownIndividuals` set at construction time. Before joining tokens across a coordination connector, it checks whether both conjunct spans are independently recognized Named Individuals. If yes, the span is not locked — it is left for ENT-A Pattern 1 to split.

2. **`continuant_part_of` Propagation Pass (Change 3):** After graph assembly, a post-assembly enrichment pass reads BFO mereological relations from the loaded ontology and asserts them between instance nodes when both the source and target Named Individuals are present in the current `ParsingAct` graph.

Change 2 (ENT-A Guard G-1 refinement) requires no code change — Guard G-1 will stop blocking the split automatically once Change 1 prevents CDD from locking the span.

**Root cause:** The CDD operates on surface text patterns only and runs before `OntologyTextTagger` (Stage 4.8 vs F-3). It has no access to ontology information. When it encounters "Senate and House of Representatives," it treats "and" as an internal connector and locks the full span. The OntologyTextTagger later finds both IRIs inside the merged span but cannot split it — Guard G-1 blocks ENT-A Pattern 1 because the span is already locked. The information needed to make the correct locking decision arrives after the decision is made.

**Fix strategy:** Inject a lightweight `Set<string>` of Named Individual labels into CDD at construction time (Option B over Option A — inject data, not modules; see §3.1). CDD checks the Set before locking across coordination. No semantic module dependency is introduced into CDD.

### v1.1 Revision Notes (from v1.0)

| Issue | Section | Nature |
|-------|---------|--------|
| **Language tag regex too narrow** — `/@[a-z]+$/` strips standard tags (`@en`, `@fr`) but fails on BCP 47 region subtags (`@en-US`) and script subtags (`@zh-Hant`), leaving residual text like `"-US"` in the normalized label and causing silent lookup failures for any TTL using regional or script language tags | §3.2 | Normative correction — regex updated to `/@[a-zA-Z-]+$/` |

### Normative Interpretation

Any algorithm, set population rule, guard condition, propagation rule, or prose describing CDD locking behavior or BFO relation assertion SHALL be interpreted as normative. MUST, MUST NOT, SHALL, SHOULD, RECOMMENDED, MAY, and OPTIONAL are interpreted per RFC 2119.

---

## Table of Contents

1. [Scope and Architecture Placement](#1-scope-and-architecture-placement)
2. [Definitions](#2-definitions)
3. [Change 1: CDD Ontology Awareness](#3-change-1-cdd-ontology-awareness)
4. [Change 2: ENT-A Guard G-1 (No Code Change Required)](#4-change-2-ent-a-guard-g-1-no-code-change-required)
5. [Change 3: `continuant_part_of` Propagation Pass](#5-change-3-continuant_part_of-propagation-pass)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Expected Impact](#7-expected-impact)

---

## 1. Scope and Architecture Placement

### 1.1 Modules Modified

| Module | File | Change Type |
|--------|------|-------------|
| `ComplexDesignatorDetector` | `src/nlp/ComplexDesignatorDetector.js` | Additive — `knownIndividuals` constructor parameter; pre-join check in `_consumeComplexDesignator` |
| `SemanticGraphBuilder` | `src/graph/SemanticGraphBuilder.js` | Additive — `knownIndividuals` Set population at Stage 4.8; `_enrichMereologicalRelations()` post-assembly pass |

No changes to `OntologyTextTagger`, `TreeEntityExtractor`, `TreeRoleMapper`, or any SHACL shapes.

### 1.2 What Is Not Changed

- CDD surface pattern detection for all non-coordination spans — unchanged
- CDD behavior when `knownIndividuals` is null (no ontology loaded) — identical to current behavior; no regression path
- ENT-A Pattern 1 logic (`_detectConjunctSplit`) — unchanged; it will fire on the previously-blocked span automatically
- ENT-A Guard G-1 code — unchanged; its behavior changes because the span will no longer be CDD-locked
- ISA corpus behavior — `knownIndividuals` is null when no ontology is loaded; CDD runs identically to today
- All SHACL shapes — unchanged

### 1.3 Pipeline Stage Reference

```
Stage 4.8 (line 2187-2194): CDD runs
    ↓  [NEW] knownIndividuals Set passed into CDD constructor
    ↓  [NEW] pre-join check fires for coordination spans
    ↓
F-3 (line 2218): OntologyTextTagger runs
    ↓
ENT-A Pattern 1: DetectConjunctSplit
    ↓  [UNBLOCKED] Guard G-1 no longer fires for ontology-known conjuncts
    ↓
Post-assembly: [NEW] _enrichMereologicalRelations pass
```

---

## 2. Definitions

| Term | Definition |
|------|-----------|
| **`knownIndividuals`** | A `Set<string>` of normalized label strings, one entry per `rdfs:label` and `skos:altLabel` value of every Named Individual in the loaded ontology. Populated by `SemanticGraphBuilder` from the tagger's ontology index before CDD runs. `null` when no ontology is loaded. |
| **Label normalization** | The process applied to produce `knownIndividuals` entries and to surface text before Set lookup: lowercase, whitespace-collapse (multiple spaces → single space), strip language tags. Example: `"House of Representatives"@en` → `"house of representatives"`. |
| **Coordination connector** | A token between two nominal spans whose text is `"and"`, `"or"`, `"nor"`, or `"but"` and which appears as the `cc` dependent in the dependency parse. |
| **Ontology-known conjunct** | A nominal span (one or more tokens) whose normalized surface text appears in `knownIndividuals`. |
| **BFO mereological relation** | An RDF triple of the form `SUBJECT bfo:BFO_0000050 TARGET` (`continuant_part_of`) or `SUBJECT bfo:BFO_0000051 TARGET` (`has_continuant_part`) found in the loaded ontology graph. |
| **Enrichment pass** | The post-assembly `_enrichMereologicalRelations()` pass that reads BFO mereological triples from the ontology and asserts equivalent relations between instance nodes in the current `ParsingAct` graph. |

---

## 3. Change 1: CDD Ontology Awareness

### 3.1 Why Option B (Data Injection) Over Option A (Module Injection)

Option A would pass the `OntologyTextTagger` instance into the CDD constructor. This is wrong because:

- CDD is a low-level surface pattern detector. OntologyTextTagger is a high-level semantic module. A dependency from low-level to high-level is architecturally inverted.
- Testing CDD would require constructing a tagger. Swapping the tagger implementation would break the CDD.
- CDD needs only label strings — a Set. It does not need confidence scoring, IRI resolution, match type detection, or any other tagger capability.

Option B injects a `Set<string>`. The CDD does not know the Set's source. It could come from the tagger, a static file, or a test fixture. The only coupling point is the normalization contract (§2), which is simple and stable.

### 3.2 `knownIndividuals` Set Population

`SemanticGraphBuilder` populates `knownIndividuals` immediately before constructing the CDD, using the tagger's loaded ontology index:

```javascript
function buildKnownIndividuals(ontologyTagger) {
  if (!ontologyTagger?._parseResult) return null;

  const individuals = new Set();
  const ontology = ontologyTagger._parseResult;

  for (const iri of ontology.getNamedIndividuals()) {
    // rdfs:label values
    for (const label of ontology.getLabels(iri)) {
      individuals.add(normalize(label));
    }
    // skos:altLabel values
    for (const altLabel of ontology.getAltLabels(iri)) {
      individuals.add(normalize(altLabel));
    }
  }

  return individuals;
}

function normalize(label) {
  return label
    .replace(/@[a-zA-Z-]+$/, '')  // strip BCP 47 language tags: @en, @en-US, @zh-Hant
    .replace(/\s+/g, ' ')          // collapse whitespace
    .trim()
    .toLowerCase();
}
```

**Population timing:** This function runs once per `ParsingAct`, before `new ComplexDesignatorDetector(...)` is called. It does not run per-sentence or per-token. The Set is computed once and reused for all sentences in the document.

**What is included:** All `owl:NamedIndividual` instances in the loaded ontology. Class labels (for `owl:Class` nodes) are NOT included — the check is specifically for Named Individuals that should be treated as distinct entities.

**What is excluded:** `owl:Class` labels, `owl:ObjectProperty` labels, annotation property labels. Only Named Individuals are potential split targets.

### 3.3 CDD Constructor Change

```javascript
class ComplexDesignatorDetector {
  constructor(options = {}) {
    this._knownIndividuals = options.knownIndividuals ?? null;
    // ... existing initialization unchanged
  }
}
```

Construction call site in `SemanticGraphBuilder`:

```javascript
// Stage 4.8 — was: new ComplexDesignatorDetector()
const knownIndividuals = buildKnownIndividuals(buildOptions._ontologyTagger);
const cdd = new ComplexDesignatorDetector({ knownIndividuals });
```

When `knownIndividuals` is `null`, the CDD behaves identically to the pre-spec implementation. The null check is the single condition that ensures zero regression on the ISA corpus.

### 3.4 Pre-Join Check in `_consumeComplexDesignator`

In the CDD's internal method that decides whether to join tokens across a coordination connector (`_consumeComplexDesignator` or equivalent), add the following check before any join is executed:

```javascript
_shouldJoinAcrossCoordination(leftSpan, connector, rightSpan) {
  // Existing condition: connector text must be an internal connector
  // (e.g., "and" in "Centers for Medicare and Medicaid Services")
  // New condition: if both sides are ontology-known, do NOT join

  if (this._knownIndividuals === null) {
    // No ontology loaded — original behavior
    return true;
  }

  const leftNorm = normalize(leftSpan.text);
  const rightNorm = normalize(rightSpan.text);

  const leftKnown = this._knownIndividuals.has(leftNorm);
  const rightKnown = this._knownIndividuals.has(rightNorm);

  if (leftKnown && rightKnown) {
    // Both conjuncts are independently known Named Individuals
    // Do NOT join — return the span unlocked for ENT-A Pattern 1
    return false;
  }

  // At least one conjunct is not a known individual — join as before
  return true;
}
```

**Guard conditions for the pre-join check:**

- **Both sides must be known:** If only one conjunct is a known individual, join proceeds normally. Partial recognition does not prevent locking. This prevents false splits on phrases like "Medicare and other programs" where "Medicare" is known but "other programs" is not.
- **Connector must be coordination:** Only fires when the connector is `"and"`, `"or"`, `"nor"`, or `"but"`. Non-coordination internal connectors (hyphens, slashes) are unaffected.
- **Null check is mandatory:** If `knownIndividuals` is null, skip the check entirely. This is the zero-regression guarantee.

**Surface text normalization for lookup:** The `leftSpan.text` and `rightSpan.text` must be normalized using the same `normalize()` function used during Set population. If the CDD's internal span representation uses a different text form, normalize it before lookup. The normalization contract is the only coupling between CDD and the tagger.

### 3.5 What Happens After the Lock Is Suppressed

When `_shouldJoinAcrossCoordination` returns `false`, the CDD does not produce a locked span covering "Senate and House of Representatives." Instead:

- "Senate" is treated as a standalone designator (CDD may or may not lock it as a single-token span — existing behavior for single tokens applies)
- "House of Representatives" is treated as a standalone multi-word designator (CDD locks it as a normal multi-word NNP span if its internal tokens qualify)
- The coordination structure "Senate and House of Representatives" is left unlocked as a whole

ENT-A Pattern 1 then receives an unlocked span with a visible `conj` arc between "Senate" and "House" (token 22 and token 24 in the arc array). Guard G-1 no longer fires. Pattern 1 splits normally, producing:

- Entity: "Senate" — ontology match → `tagteam:Senate` → `denotesType: LegislativeBody`
- Entity: "House of Representatives" — ontology match → `tagteam:HouseOfRepresentatives` → `denotesType: LegislativeBody`

Each entity receives its own composite `entityByHead` key, its own `DiscourseReferent`, and its own Tier 2 node.

---

## 4. Change 2: ENT-A Guard G-1 (No Code Change Required)

Guard G-1 reads: "If CDD-locked span, do not split."

After Change 1, "Senate and House of Representatives" will not be CDD-locked. Guard G-1 will evaluate to false for this span and will not block Pattern 1. No code change is needed.

**Provenance stamping (additive):** ENT-A Pattern 1 should stamp each split entity with:

```javascript
entity.splitFrom = originalSpanMentionId;  // mentionId of the pre-split merged span
entity.splitMethod = "coordination-ontology"; // distinguishes from CDD-driven splits
```

This is diagnostic only — it does not affect role assignment, SHACL validation, or graph topology. It enables future auditing of which entities were produced by coordination splitting.

---

## 5. Change 3: `continuant_part_of` Propagation Pass

### 5.1 When to Run

`_enrichMereologicalRelations()` runs once per `ParsingAct`, after all standard graph assembly is complete — after type promotion, after performative Act production (TT-SPEC-SGB-A), after all entity extraction and role assignment. It is a read-then-write pass: it reads the ontology graph and the current instance graph, then writes new relations.

It is a no-op when `ontologyTagger._parseResult` is null (no ontology loaded). The ISA corpus never triggers it.

### 5.2 Algorithm

```javascript
_enrichMereologicalRelations(graph, ontologyGraph) {
  if (!ontologyGraph) return;

  // Build a reverse index: ontologyIRI → Tier 2 instance node
  const iriToInstance = new Map();
  for (const node of graph.getTier2Nodes()) {
    const match = node.ontologyMatch?.[0];
    if (match?.ontologyMatchConfidence >= 1) {
      iriToInstance.set(match.ontologyMatchIRI, node);
    }
  }

  // For each Tier 2 node with a confident ontology match:
  for (const [iri, instanceNode] of iriToInstance) {

    // Check for continuant_part_of (BFO_0000050) assertions in the ontology
    const partOfTargets = ontologyGraph.getObjects(iri, 'bfo:BFO_0000050');
    for (const targetIRI of partOfTargets) {
      const targetInstance = iriToInstance.get(targetIRI);
      if (targetInstance) {
        // Assert the relation on the instance node
        instanceNode['bfo:BFO_0000050'] = { "@id": targetInstance["@id"] };
        // Human-readable alias for the visualizer
        instanceNode['continuant_part_of'] = { "@id": targetInstance["@id"] };
      }
      // If targetInstance not found: silent — the target is not in this ParsingAct.
      // Do not hallucinate a reference to an entity not extracted from the text.
    }

    // Check for has_continuant_part (BFO_0000051) — inverse direction
    const hasPartTargets = ontologyGraph.getObjects(iri, 'bfo:BFO_0000051');
    for (const targetIRI of hasPartTargets) {
      const targetInstance = iriToInstance.get(targetIRI);
      if (targetInstance) {
        instanceNode['bfo:BFO_0000051'] = { "@id": targetInstance["@id"] };
        instanceNode['has_continuant_part'] = { "@id": targetInstance["@id"] };
      }
    }
  }
}
```

**No hallucination principle:** If `targetIRI` has no corresponding instance in the current `ParsingAct` graph, the relation is not asserted. The enrichment pass only connects entities that are actually present in the parsed text. It does not infer the existence of entities from ontological relations alone.

**Multi-match handling:** If a Tier 2 node has multiple `ontologyMatch` entries (e.g., the merged Senate/HoR node), use the first match with confidence ≥ 1 for the mereological lookup. After Bug 3 is fixed, this multi-match case should no longer occur for Senate and HoR — they will be separate nodes with single matches each.

**Relation overwrite policy:** If a Tier 2 node already carries a `continuant_part_of` relation (e.g., set by another pipeline stage), do not overwrite it. Check for existence before writing:

```javascript
if (!instanceNode['continuant_part_of']) {
  instanceNode['continuant_part_of'] = { "@id": targetInstance["@id"] };
}
```

### 5.3 Expected Output After Both Changes

For the constitution sentence, after Bug 3 and Gap 5c are both implemented:

```json
{
  "@id": "inst:Senate_entity",
  "@type": ["LegislativeBody", "owl:NamedIndividual"],
  "rdfs:label": "Senate",
  "continuant_part_of": { "@id": "inst:Entity_Congress_9e7cf822f7b6" },
  "tagteam:splitFrom": "893750d6:s0:m22",
  "tagteam:splitMethod": "coordination-ontology",
  "ontologyMatch": [{
    "ontologyMatchIRI": "https://example.org/tagteam/ontology#Senate",
    "ontologyMatchConfidence": 1
  }]
},
{
  "@id": "inst:HouseOfRepresentatives_entity",
  "@type": ["LegislativeBody", "owl:NamedIndividual"],
  "rdfs:label": "House of Representatives",
  "continuant_part_of": { "@id": "inst:Entity_Congress_9e7cf822f7b6" },
  "tagteam:splitFrom": "893750d6:s0:m22",
  "tagteam:splitMethod": "coordination-ontology",
  "ontologyMatch": [{
    "ontologyMatchIRI": "https://example.org/tagteam/ontology#HouseOfRepresentatives",
    "ontologyMatchConfidence": 1
  }]
}
```

---

## 6. Acceptance Criteria

### AC-ENT-B-1: CDD Lock Suppression for Ontology-Known Conjuncts

- [ ] `"a Senate and House of Representatives"` with constitution TTL loaded → CDD does NOT lock the full span; "Senate" and "House of Representatives" are treated as separate designators
- [ ] ENT-A Pattern 1 fires on the unlocked coordination; produces two separate entity nodes
- [ ] `tagteam:splitFrom` and `tagteam:splitMethod: "coordination-ontology"` are present on both split entities

### AC-ENT-B-2: CDD Lock Preserved for Non-Individual Coordination

- [ ] `"Centers for Medicare and Medicaid Services"` with any ontology loaded → CDD locks the full span (neither "Medicare" nor "Medicaid Services" are Named Individuals in the loaded ontology — they are parts of a longer designator)
- [ ] ISA corpus: all currently-passing CDD-locked spans continue to lock → no regression

### AC-ENT-B-3: Null Guard — No Ontology, No Change

- [ ] `new ComplexDesignatorDetector({})` (no `knownIndividuals`) → identical behavior to pre-spec CDD on all inputs
- [ ] ISA gold corpus Role F1 holds at 83.0%; SBA at 143/144; SHACL at 21/21

### AC-ENT-B-4: Partial Recognition — Join Proceeds

- [ ] Input: "Senate and other legislative bodies" — "Senate" is a known individual but "other legislative bodies" is not → CDD joins normally; full span is locked; ENT-A does not split

### AC-ENT-B-5: `knownIndividuals` Set Population

- [ ] Set contains `"senate"`, `"house of representatives"`, `"congress"`, `"united states"`, `"constitution of the united states"`, `"herein"` from the constitution TTL (normalized to lowercase)
- [ ] Set does NOT contain class labels like `"legislative body"`, `"legislative power"`, `"act of vesting"` — only Named Individuals
- [ ] Set is populated once per `ParsingAct`, not per sentence

### AC-ENT-B-6: `continuant_part_of` Propagation — Basic

- [ ] After full pipeline with constitution TTL: `inst:Senate_entity.continuant_part_of → inst:Entity_Congress_9e7cf822f7b6`
- [ ] After full pipeline with constitution TTL: `inst:HouseOfRepresentatives_entity.continuant_part_of → inst:Entity_Congress_9e7cf822f7b6`
- [ ] Neither relation exists without the constitution TTL loaded (ISA corpus — no enrichment)

### AC-ENT-B-7: No Hallucination

- [ ] If Congress were NOT extracted from the text (e.g., a sentence mentioning only "Senate"), `inst:Senate_entity` does NOT carry `continuant_part_of` — the target entity is absent from the graph
- [ ] Enrichment pass produces no assertions when `iriToInstance.get(targetIRI)` returns undefined

### AC-ENT-B-8: Overwrite Protection

- [ ] If a Tier 2 node already carries `continuant_part_of` from another pipeline stage, the enrichment pass does not overwrite it

### AC-ENT-B-9: Full Constitution Test

- [ ] Constitution sentence produces exactly 6 DiscourseReferent nodes: United States, Senate, House of Representatives (two separate nodes), legislative Powers, a Congress, which
- [ ] Senate and HouseOfRepresentatives nodes have distinct `mentionId` values, distinct `@id` values, distinct `ontologyMatch` IRIs
- [ ] `continuant_part_of` relations asserted on both Senate and HouseOfRepresentatives pointing to Congress
- [ ] All other nodes and relations from previous outputs unchanged (regression)

### AC-ENT-B-10: Visualizer Edges

- [ ] `continuant_part_of` added to the visualizer's edge relation whitelist
- [ ] Senate → Congress and HouseOfRepresentatives → Congress edges visible in the graph visualization

---

## 7. Expected Impact

**On the constitution test:**

| Item | Before | After |
|------|--------|-------|
| "Senate and HoR" | 1 merged node, `denotesType: LegislativeBody` | 2 separate nodes, each `LegislativeBody` |
| `continuant_part_of` on Senate | Absent | → Congress |
| `continuant_part_of` on HoR | Absent | → Congress |
| Total DR nodes | 5 | 6 |

**On the ISA corpus:** No change. `knownIndividuals` is null; CDD behavior is identical to today; enrichment pass is a no-op.

**On the ideal graph comparison:** After this spec is implemented, the current output matches the ideal graph on every node and relation that is in scope. The constitution pipeline is complete.

---

## Document History

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-04-03 | Initial specification. CDD `knownIndividuals` injection. Pre-join check. Guard G-1 unchanged. `_enrichMereologicalRelations()` pass. |
| 1.1 | 2026-04-03 | Fixed `normalize()` regex from `/@[a-z]+$/` to `/@[a-zA-Z-]+$/` to correctly strip BCP 47 language tags with region subtags (`@en-US`) and script subtags (`@zh-Hant`). Silent lookup failures on regional-tagged TTLs are now prevented. |

---

*This addendum is a component of the TagTeam.js semantic parser project within the Ontology of Freedom Initiative / Federated Network for Sovereign Reasoning (FNSR).*
