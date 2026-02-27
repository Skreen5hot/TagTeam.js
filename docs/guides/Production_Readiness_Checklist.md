# TagTeam.js — Production Readiness Checklist

**Version:** 3.0.2
**Date:** February 27, 2026
**Author:** Aaron, Technical Lead / Semantic Architect
**Status:** Merged to MAIN
**Branch:** origin/main (commit `162361e`)
**Previous:** v3.0.1 at `b6a7896`
**Classification:** INTERNAL — Development Team Distribution Only

---

## Executive Summary

The BFO/CCO IRI integrity audit is complete. Over the course of fifteen commits, the team eliminated all phantom IRIs from TagTeam's output. Every class, property, and relation value in the system now resolves through the @context alias layer to a verified opaque IRI in a published ontology (BFO 2020 or CCO 2.0), or is honestly declared in the `tagteam:` namespace as parser-defined metadata.

The v2.2 audit (commits `10b1817`, `b6a7896`) fixed 3 additional fabricated CCO IRIs (`has_input`, `has_output`, `prescribed_by`), added 6 missing CCO inverse properties, restructured the @context to consistent expanded `{@id}` form, added 27 v3 ontology terms, and corrected datatype typing for `has_text_value` (`xsd:string`) and `has_start_time`/`has_end_time` (`xsd:dateTime`).

The Tier 1/Tier 2 type separation fix (commit `162361e`) resolved the ontological contradiction where Tier 1 DiscourseReferent nodes carried both information-entity and independent-continuant types. Tier 1 `@type` is now `[DiscourseReferent]` only, with ontological type preserved as `denotesType` metadata. Fabricated role properties (`tagteam:bearer`, `tagteam:realizedIn`) replaced with BFO properties (`inheres_in`, `realized_in`). Role bearers repointed from Tier 1 to Tier 2. Back-links (`is_subject_of`, `is_bearer_of`) added on Tier 2 for O(1) graph traversal. 343 structural checks passed across 11 test graphs. See `docs/development/tier-separation-violation-revised.md` for the full architecture specification.

This checklist defines the requirements for merging the dev branch to MAIN, the criteria for any external demonstration or deployment, and the hardening tasks that should be scheduled after the initial release. Items are organized into three tiers based on blocking priority.

### Completed Work — Commit Trail

| Commit | Scope | Phantom IRIs Eliminated |
|--------|-------|------------------------|
| `15eb4dc` | Fabricated IRI cleanup | 94 fabricated classes |
| `BUG-A/B/C` | Post-cleanup regression fixes | Malformed IRIs, gazetteer, UI |
| `30558a9` | BFO property IRI corrections | 8 phantom property IRIs |
| `a524225` | CCO property compact IRI bypass | 13 phantom property IRIs |
| `0c1783a` | Gold baseline regeneration | — |
| `1724fde` | CCO class migration to opaque IRIs | 12 phantom class IRIs |
| `9ed8311` | Actions 1–3: CCO properties, BFO classes, structural relations | 14 properties + 15 classes + 7 relations |
| `0fd2248` | Fix nsubj BFO identifier in RoleMappingContract | Opaque IRI in contract `bfo` field |
| `85feb43` | Add HEAD_NOUN_TYPE_MAP to TreeEntityExtractor | CI 26/26 + two-tier 23/23 |
| `b14442f` | Update demos and docs to bare @context alias convention | Demo + 13 doc files |
| `c97229b` | Bump version to 3.0.0 for merge to main | Version metadata |
| `416b882` | Eliminate all Node.js patterns from browser bundle | CI gate for Node patterns |
| `8fa5afc` | Move compromise and n3 to devDependencies | Zero runtime deps |
| `10b1817` | @context audit v2.2: fix 3 fabricated CCO IRIs, restructure, add v3 terms | 3 fabricated IRIs + 6 missing properties + 27 v3 terms |
| `b6a7896` | Fix has_start_time/has_end_time @context typing to xsd:dateTime | 2 incorrectly typed properties |
| `56e262a` | Update Production Readiness Checklist for v2.2 audit | — |
| `162361e` | Tier 1/Tier 2 type separation: eliminate ontological contradiction | 2 fabricated properties (`tagteam:bearer`, `tagteam:realizedIn`) |

**Result:** Zero phantom IRIs remain in `src/`. Zero fabricated role properties remain. Every IRI in every output graph resolves to a published ontology entry or is declared as `tagteam:` namespace. Tier 1/Tier 2 type separation is enforced — no OWL disjointness violations.

---

## TIER 1 — MERGE GATE

*These items block merging dev to MAIN. Do not merge until every box is checked.*

### 1.1 IRI Integrity Verification

- [ ] **JSON-LD round-trip test.** Create an automated test that loads a sample graph, calls `jsonld.expand()`, and verifies every expanded IRI matches a published BFO 2020 or CCO 2.0 entry. This is the definitive test — it's what any downstream consumer will do. Install `jsonld` via npm and add to the CI pipeline. *(Not yet automated — verified manually at `b6a7896`.)*

- [ ] **Grep CI gate.** Run the full grep verification suite (see Appendix A) in CI. Every pattern must return zero matches in `src/` excluding comments and @context alias targets. Fail the build if any match is found. *(Not yet automated — verified manually at `b6a7896`. All patterns return zero code matches; only comment hits remain.)*

- [x] **@context freeze policy.** Any future addition to the @context must include the verified opaque IRI and a comment citing the source (BFO OWL line number or CCO CSV line number). Undocumented additions are not permitted. *(Established by convention. The v2.2 audit documents all additions with verified IRIs in the audit ledger and restructured JSON reference.)*

### 1.2 Build Artifact Integrity

- [x] **Demo bundle sync.** Verify `demos/tagteam.js` matches `dist/tagteam.js` by checksum. Add a CI step that compares the two files and fails on mismatch. *(Verified at `162361e`: checksum `dbfd3431f85395da4c356ade516385ef`. CI step not yet automated.)*

- [x] **Model file loading.** Confirm all demo pages successfully load: POS lexicon, dependency model, and all gazetteer files (places, organizations, person keywords). *(Verified at `c97229b`; no model changes since.)*

- [x] **Gold baseline evaluation.** Run `npm run gold:evaluate`. Zero mismatches required. *(Verified at `162361e`: Entity F1 89.6%, Role F1 57.8%, 0 mismatches. 200 baselines regenerated. Role F1 drop from 59.3% is a label-source change — evaluator reads Tier 2 labels post-separation. See FT-01 in merge approval memo.)*

### 1.3 Test Suite

- [x] **CI tests: all phases passing, 0 failures.** *(Verified at `162361e`: 770+ tests, 0 failures across all 13 phases.)*

- [x] **Component tests: 42/100 baseline maintained.** No regression from the pre-audit baseline (was 30, improved to 42 via HEAD_NOUN_TYPE_MAP and TreeEntityExtractor fixes). *(Verified at `162361e`: 42/100, 0 errors.)*

---

## TIER 2 — RELEASE GATE

*These items block any external demonstration, deployment, or distribution of TagTeam. Complete after merge to MAIN, before any external use.*

### 2.1 Performance and Bundle Size

- [ ] **Compression analysis.** The 5.2MB raw bundle is the largest cost to the user in an edge-canonical architecture. Verify gzip and Brotli compressed sizes. Target: under 1.5MB compressed.

- [ ] **POS lexicon lazy loading.** The 4.1MB POS lexicon and Turtle ontology files should load on demand when `TagTeam.parse()` is first called, not at import time. This is the highest-impact optimization available.

- [ ] **Automated parse-time benchmark.** Add a CI step that measures `parse()` execution time on a standard 20-word sentence. Fail if time exceeds 60ms on the CI runner. Establish a baseline and track regressions.

### 2.2 Security and Input Handling

- [ ] **ReDoS audit.** Audit `PatternMatcher.js` and `POSTagger.js` for nested quantifiers in regular expressions. NLP libraries with regex-heavy tokenizers are classic ReDoS targets. Use a tool like `safe-regex` or `vuln-regex-detector`.

- [ ] **Input size cap.** Implement a hard character limit on `parse()` (recommended: 10,000 characters). Return a structured error, not a browser hang.

- [ ] **Input normalization.** Sanitize null bytes, control characters, and non-UTF-8 sequences before they reach the compromise NLP engine.

### 2.3 Robustness

- [ ] **Non-English input fallback.** When non-English text is passed to `parse()`, the system must return an empty graph with a diagnostic message — not throw a TypeError.

- [ ] **Circular dependency audit.** Verify the 20+ modules in `src/graph` have no circular imports that would break bundlers (Vite, Webpack 4, Rollup). Use `madge` or a similar tool.

### 2.4 Ontology Version Management

- [ ] **Version pinning with source hashes.** Declare the exact ontology versions in build metadata including the Git commit hash of each source TTL file used during the build. Specifically: BFO 2020 `bfo-core.ttl` (commit hash from the BFO GitHub repository) and CCO 2.0 (release tag plus commit hash of the merged OWL file). If CCO releases a 2.1 that renumbers opaque IRIs, the team must know immediately and be able to diff against the pinned version.

- [x] **`tagteam.ttl` creation.** Create a formal OWL file defining all ~60 `tagteam:` namespace properties and classes. This is required for Fandaws and any downstream consumer to reason over TagTeam output. Each property should have `rdfs:label`, `rdfs:comment`, and domain/range declarations. *(Done: `ontology/tagteam-v3.ttl`, 341 lines, 28 subjects with full axioms. Added to @context in `10b1817`.)*

- [ ] **`measures` alias documentation.** The `measures` alias maps to CCO's "is a measurement of" (`ont00001966`), not the English verb "measures." Add a comment in the @context and include a note in the API documentation. This directly affects how consumers interpret the data output and must be clarified before any external use.

### 2.5 Integration Contract

- [ ] **Fandaws contract test.** Define and test the contract between TagTeam output and Fandaws consumption. Fandaws expects: `tagteam:classNominationStatus`, `tagteam:requiresOntologyResolution`, `tagteam:classificationLabel`, `tagteam:classificationBasis` on nominated nodes. Create a contract test that verifies these fields are present and correctly structured on all GEN/UNIV nodes.

---

## TIER 3 — HARDENING

*Important engineering improvements. Schedule after the initial release. These do not block merge or external use.*

### 3.1 Build and Distribution

- [ ] **Tree shaking / ESM build.** Ensure the ESM build allows consumers to import only the core parser without the EthicalProfiler, reducing bundle size for applications that don't need value detection.

- [ ] **CJS/ESM/UMD output.** Provide all three formats in `dist/` to support modern bundlers (Vite, Astro) and legacy environments (script tags).

- [ ] **Source maps.** Ship `.js.map` files so developers can debug the library in their own consoles.

### 3.2 Runtime Performance

- [ ] **Memory profiling.** Run the browser profiler on `parseMany()` with 1,000+ strings. Verify the InterpretationLattice is properly garbage collected between parse calls. File any leaks found.

- [ ] **Lexicon caching.** Investigate IndexedDB caching for the POS lexicon so repeated page loads don't re-download 4.1MB.

### 3.3 Test Coverage

- [ ] **Component test coverage target: 70%.** The current baseline of 30/100 is a non-regression gate, not an adequacy standard. Define a roadmap to increase component test coverage to 70%+ with priority on: entity extraction accuracy, role detection correctness, genericity classification, and structural assertion output. Each new feature or bug fix should include corresponding gold baseline additions.

### 3.4 @context Architecture

- [ ] **@context modularity.** The @context has ~150 entries; a typical parse uses ~40. Split into a base context (namespaces + core structural properties) and extension contexts (scarcity, values, context assessment, human workflow). Use JSON-LD @context array composition.

- [ ] **Dual-alias documentation.** Document that `continuant_part_of` and `is_part_of` both map to `bfo:BFO_0000176` intentionally (property alias vs. structural assertion alias). Prevent future "cleanup" that removes one.

### 3.5 Documentation

- [ ] **Full API reference.** Generate JSDoc or TypeDoc documentation covering all public methods, configuration options, and output graph structure.

- [ ] **Ethical value detection documentation.** The EthicalProfiler detects values based on a keyword lexicon. Document the scope, assumptions, and limitations of this detection. Include what frameworks are covered, what biases exist in the lexicon, and how to extend it. This deserves thoughtful treatment as a standalone document, not a checklist item.

---

## Appendix A: Grep Verification Suite

Run all commands below against `src/`. Every command must return zero matches. Integrate into CI as a pre-merge gate.

### CCO Property Phantom IRIs

```bash
grep -rn "cco:has_agent\|cco:is_about\|cco:affects\|cco:prescribes" src/
grep -rn "cco:has_text_value\|cco:has_recipient\|cco:has_part\b" src/
grep -rn "cco:designates\|cco:is_designated_by\|cco:is_measured_by" src/
grep -rn "cco:measures\b\|cco:uses_measurement_unit\|cco:occupies" src/
grep -rn "cco:participates_in\|cco:is_part_of\|cco:occurs_during" src/
```

### CCO Class Compact IRIs

```bash
grep -rn "cco:Person\|cco:Organization\|cco:IntentionalAct\|cco:Agent" src/
grep -rn "cco:InformationBearingEntity\|cco:InformationContentEntity" src/
grep -rn "cco:Artifact\|cco:Facility\|cco:Country\|cco:GeopoliticalOrganization" src/
```

### Fabricated BFO Readable Forms

```bash
grep -rn "'bfo:Entity'\|\"bfo:Entity\"\|'bfo:Process'\|\"bfo:Process\"" src/
grep -rn "'bfo:Quality'\|'bfo:Disposition'\|'bfo:MaterialEntity'" src/
grep -rn "'bfo:Site'\|'bfo:TemporalRegion'\|'bfo:Role'" src/
```

### Obsolete BFO IRIs

```bash
grep -rn "BFO_0000051\|BFO_0000052\|BFO_0000053" src/
```

### Fabricated Structural Assertion Relations

```bash
grep -rn "'cco:has_part'\|'cco:member_of'\|'cco:part_of'" src/
grep -rn "'cco:has_possession'\|'cco:has_function'\|'cco:located_in'" src/
grep -rn "'bfo:located_in'\|'bfo:part_of'" src/
```

### BFO Property Compact IRIs

```bash
grep -rn "bfo:inheres_in\|bfo:is_bearer_of\|bfo:has_member" src/
grep -rn "cco:is_concretized_by\|cco:concretizes" src/
```

### Fabricated CCO IRIs (v2.2 audit)

```bash
grep -rn "tagteam:has_input\|tagteam:has_output\|tagteam:prescribed_by" src/
```

### Fabricated Role Properties (tier separation)

```bash
grep -rn "tagteam:bearer\|tagteam:realizedIn" src/
grep -rn "tagteam:bearer\|tagteam:realizedIn" tests/ --include="*.js"
```

### Build Verification

```bash
npm run build
npm run test:ci          # all phases passing, 0 failures
npm run test:component   # >= 42 baseline
npm run gold:evaluate    # 0 mismatches
```

---

## Appendix B: Verified @context IRI Ledger

Complete mapping of all ontology-sourced aliases in the @context as of commit `b6a7896`. Every IRI below has been verified against the published OWL source files. All entries use expanded `{@id}` form as of v2.2 restructuring (`10b1817`).

### BFO 2020 Properties (8)

| Alias | Opaque IRI | BFO Label |
|-------|-----------|-----------|
| `is_concretized_by` | `bfo:BFO_0000058` | is concretized by at some time |
| `concretizes` | `bfo:BFO_0000059` | concretizes at some time |
| `inheres_in` | `bfo:BFO_0000197` | inheres in at all times |
| `is_bearer_of` | `bfo:BFO_0000196` | bearer of at all times |
| `realized_in` | `bfo:BFO_0000054` | realized in |
| `realizes` | `bfo:BFO_0000055` | realizes |
| `has_participant` | `bfo:BFO_0000057` | has participant at some time |
| `has_member_part` | `bfo:BFO_0000115` | has member part at some time |

### BFO 2020 Properties — Re-exports (3)

| Alias | Opaque IRI | Note |
|-------|-----------|------|
| `occupies_temporal_region` | `bfo:BFO_0000199` | Was `cco:` re-export |
| `participates_in` | `bfo:BFO_0000056` | Inverse of `has_participant` |
| `is_part_of` | `bfo:BFO_0000176` | Continuant part of |

### BFO 2020 Structural Relation Aliases (4)

| Alias | Opaque IRI | Note |
|-------|-----------|------|
| `located_in` | `bfo:BFO_0000171` | Structural assertion relation |
| `has_continuant_part` | `bfo:BFO_0000178` | Structural assertion relation |
| `continuant_part_of` | `bfo:BFO_0000176` | Intentional duplicate of `is_part_of` (assertion context) |
| `member_part_of` | `bfo:BFO_0000129` | Structural assertion relation |

### CCO 2.0 Properties (17)

| Alias | Opaque IRI | CCO Label | Typing | Added |
|-------|-----------|-----------|--------|-------|
| `has_agent` | `cco:ont00001833` | has agent | `@id` | v1 |
| `has_recipient` | `cco:ont00001922` | has recipient | `@id` | v1 |
| `is_about` | `cco:ont00001808` | is about | `@id` | v1 |
| `affects` | `cco:ont00001834` | affects | `@id` | v1 |
| `prescribes` | `cco:ont00001942` | prescribes | `@id` | v1 |
| `has_text_value` | `cco:ont00001765` | has text value | `xsd:string` | v1 *(typing fixed v2.2)* |
| `designates` | `cco:ont00001916` | designates | `@id` | v1 |
| `is_designated_by` | `cco:ont00001879` | is designated by | `@id` | v1 |
| `is_measured_by` | `cco:ont00001904` | is measured by | `@id` | v1 |
| `measures` | `cco:ont00001966` | **⚠ "is a measurement of"** — not the English verb | `@id` | v1 |
| `uses_measurement_unit` | `cco:ont00001863` | uses measurement unit | `@id` | v1 |
| `has_input` | `cco:ont00001921` | has input | `@id` | **v2.2** *(was fabricated `tagteam:has_input`)* |
| `has_output` | `cco:ont00001986` | has output | `@id` | **v2.2** *(was fabricated `tagteam:has_output`)* |
| `prescribed_by` | `cco:ont00001920` | prescribed by | `@id` | **v2.2** *(was fabricated `tagteam:prescribed_by`)* |
| `is_subject_of` | `cco:ont00001801` | is subject of | `@id` | **v2.2** |
| `is_input_of` | `cco:ont00001841` | is input of | `@id` | **v2.2** |
| `is_output_of` | `cco:ont00001816` | is output of | `@id` | **v2.2** |

### CCO 2.0 Classes (12)

| Alias | Opaque IRI | CCO Label |
|-------|-----------|-----------|
| `Act` | `cco:ont00000005` | Act |
| `ActOfCommunication` | `cco:ont00000402` | Act of Communication |
| `Agent` | `cco:ont00001017` | Agent |
| `Artifact` | `cco:ont00000995` | Artifact |
| `Country` | `cco:ont00000139` | Country |
| `Facility` | `cco:ont00000192` | Facility |
| `GeopoliticalOrganization` | `cco:ont00000176` | Geopolitical Organization |
| `InformationBearingEntity` | `cco:ont00000253` | Information Bearing Entity |
| `InformationContentEntity` | `cco:ont00000958` | Information Content Entity |
| `IntentionalAct` | `cco:ont00000228` | Intentional Act |
| `Organization` | `cco:ont00001180` | Organization |
| `Person` | `cco:ont00001262` | Person |

### BFO 2020 Classes (15)

| Alias | Opaque IRI | BFO Label |
|-------|-----------|-----------|
| `Entity` | `bfo:BFO_0000001` | entity |
| `Continuant` | `bfo:BFO_0000002` | continuant |
| `IndependentContinuant` | `bfo:BFO_0000004` | independent continuant |
| `TemporalRegion` | `bfo:BFO_0000008` | temporal region |
| `Process` | `bfo:BFO_0000015` | process |
| `Disposition` | `bfo:BFO_0000016` | disposition |
| `Quality` | `bfo:BFO_0000019` | quality |
| `Role` | `bfo:BFO_0000023` | role |
| `ObjectAggregate` | `bfo:BFO_0000027` | object aggregate |
| `Site` | `bfo:BFO_0000029` | site |
| `Object` | `bfo:BFO_0000030` | object |
| `GenericallyDependentContinuant` | `bfo:BFO_0000031` | generically dependent continuant |
| `OneDimensionalTemporalRegion` | `bfo:BFO_0000038` | one-dimensional temporal region |
| `MaterialEntity` | `bfo:BFO_0000040` | material entity |
| `RelationalQuality` | `bfo:BFO_0000145` | relational quality |

### tagteam: Namespace — Aspirational Properties (4)

*Moved from `cco:` namespace. Not in any published ontology. Reserved for future feature implementation. `has_start_time` and `has_end_time` typed `xsd:dateTime` as of `b6a7896`.*

| Alias | Current @id | Typing | Rationale |
|-------|-----------|--------|-----------|
| `occurs_during` | `tagteam:occurs_during` | `@id` | Temporal relation — map to ontology when temporal support added |
| `has_measurement_value` | `tagteam:has_measurement_value` | — | Measurement support — map when measurement features added |
| `has_start_time` | `tagteam:has_start_time` | `xsd:dateTime` | Temporal bound — typing fixed in `b6a7896` |
| `has_end_time` | `tagteam:has_end_time` | `xsd:dateTime` | Temporal bound — typing fixed in `b6a7896` |

### tagteam: Namespace — Domain-Specific Relations (4)

*Not found in CCO 2.0 or BFO 2020. Defined by TagTeam for structural assertion output.*

| Alias | @id | Usage |
|-------|-----|-------|
| `has_possession` | `tagteam:has_possession` | Possessive structural assertions |
| `has_function` | `tagteam:has_function` | Functional structural assertions |
| `has_spatial_extent` | `tagteam:has_spatial_extent` | Spatial structural assertions |
| `bears_role_for` | `tagteam:bears_role_for` | Role-bearing structural assertions |

### tagteam: Namespace — v3 Ontology Terms (27)

*Defined in `ontology/tagteam-v3.ttl`. Added to @context in `10b1817`.*

**Classes (6):**

| Alias | @id | OWL Type |
|-------|-----|----------|
| `SpeechAct` | `tagteam:SpeechAct` | owl:Class (subClassOf cco:ActOfCommunication) |
| `Inquiry` | `tagteam:Inquiry` | owl:Class (subClassOf tagteam:SpeechAct) |
| `ConditionalContent` | `tagteam:ConditionalContent` | owl:Class (subClassOf bfo:GenericallyDependentContinuant) |
| `ClauseRelation` | `tagteam:ClauseRelation` | owl:Class (subClassOf bfo:GenericallyDependentContinuant) |
| `CausativeAct` | `tagteam:CausativeAct` | owl:Class (subClassOf cco:IntentionalAct) |
| `ValueAssertionEvent` | `tagteam:ValueAssertionEvent` | owl:Class (subClassOf cco:IntentionalAct) |

**Individuals (9):**

| Alias | @id | OWL Type |
|-------|-----|----------|
| `Interrogative` | `tagteam:Interrogative` | owl:NamedIndividual (tagteam:ActualityStatus) |
| `and_then` | `tagteam:and_then` | owl:NamedIndividual (tagteam:ClauseRelation) |
| `therefore` | `tagteam:therefore` | owl:NamedIndividual (tagteam:ClauseRelation) |
| `in_order_that` | `tagteam:in_order_that` | owl:NamedIndividual (tagteam:ClauseRelation) |
| `contrasts_with` | `tagteam:contrasts_with` | owl:NamedIndividual (tagteam:ClauseRelation) |
| `alternative_to` | `tagteam:alternative_to` | owl:NamedIndividual (tagteam:ClauseRelation) |
| `precedes` | `tagteam:precedes` | owl:NamedIndividual (tagteam:ClauseRelation) |
| `follows` | `tagteam:follows` | owl:NamedIndividual (tagteam:ClauseRelation) |
| `simultaneous_with` | `tagteam:simultaneous_with` | owl:NamedIndividual (tagteam:ClauseRelation) |

**Object Properties (6):**

| Alias | @id | Typing |
|-------|-----|--------|
| `relationType` | `tagteam:relationType` | `@id` |
| `fromClause` | `tagteam:fromClause` | `@id` |
| `toClause` | `tagteam:toClause` | `@id` |
| `has_antecedent` | `tagteam:has_antecedent` | `@id` |
| `has_consequent` | `tagteam:has_consequent` | `@id` |
| `has_cause` | `tagteam:has_cause` | `@id` |

**Datatype Properties (6):**

| Alias | @id | Typing | Added |
|-------|-----|--------|-------|
| `denotesType` | `tagteam:denotesType` | — | **tier-sep** *(ontological type metadata on Tier 1 DiscourseReferent nodes)* |
| `clauseIndex` | `tagteam:clauseIndex` | `xsd:integer` | v3 |
| `subjectSource` | `tagteam:subjectSource` | — | v3 |
| `whPhrase` | `tagteam:whPhrase` | — | v3 |
| `verbClass` | `tagteam:verbClass` | — | v3 |
| `epistemicStatus` | `tagteam:epistemicStatus` | — | v3 |

**Boolean Properties (1):**

| Alias | @id | Typing |
|-------|-----|--------|
| `isQuestionFocus` | `tagteam:isQuestionFocus` | `xsd:boolean` |

**Annotation Properties (1):**

| Alias | @id | Typing |
|-------|-----|--------|
| `structuralAmbiguity` | `tagteam:structuralAmbiguity` | — |