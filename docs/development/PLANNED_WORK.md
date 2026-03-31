# TagTeam.js — Comprehensive Planned Work Document

**Version**: 3.0
**Date**: 2026-03-31
**Authority**: This document is the single source of truth for all planned, in-progress, and completed work. It supersedes fragmented references across specs, roadmaps, and planning files.

---

## Document Map

| Document | Purpose | Status |
|----------|---------|--------|
| `docs/development/TagTeam-Major-Refactor-v2.2.md` | Master spec (the "what and why") | Approved, sections actively consumed |
| `docs/development/Major-Refactor-Roadmap.md` | TDD phase roadmap (the "how and when") | Phases 0-4 complete, Phase 5 not started |
| `docs/architecture/spec-section-9.5-genericity-detection-final.md` | GenericityDetector spec (§9.5) | Implemented (not in roadmap — orphaned feature) |
| `docs/research/Fandaws_v3.3_Specification.md` | Fandaws integration spec (§10.4.1) | Phase 5 deferred — parser maturity required first |
| `docs/dossiers/PHVD-2026-02-20-WP2.yaml` | Pre-demo validation dossier for GenericityDetector | Active |
| `docs/development/EVALUATION_REPORT.md` | Gold evaluation results | Published 2026-02-18 |
| `docs/development/PERFORMANCE_REPORT.md` | Benchmark results | Published 2026-02-17 |
| **This document** | Work tracker — ties everything together | **Active** |

---

## Implementation Status Overview

```
Phase 0   ████████████████████ 100%  Labels, Unicode, Tokenizer       ✅ COMPLETE
Phase 1A  ████████████████████ 100%  Perceptron POS Tagger            ✅ COMPLETE (93.5% acc)
Phase 1B  ████████████████████ 100%  Gazetteer NER                    ✅ COMPLETE
Phase 2   ████████████████████ 100%  Dependency Parser                ✅ COMPLETE (85.3% UAS)
Phase 3A  ████████████████████ 100%  Tree Extraction                  ✅ COMPLETE
Phase 3B  ████████████████████ 100%  Confidence, Debug, Loading       ✅ COMPLETE
Phase 4   ██████████████████░░  95%  Validation & Release Readiness   ⚠️ 1 BLOCKER (legal)
§9.5      ████████████████████ 100%  Genericity Detection             ✅ COMPLETE (orphaned)
Phase 5   ░░░░░░░░░░░░░░░░░░░░   0%  Fandaws Integration             ⏸️ DEFERRED (parser maturity)
Phase 6   ████████████████████ 100%  Ambiguity Preservation           ✅ COMPLETE (untracked)
Phase 7   ████████████████████ 100%  Semantic Refinement              ✅ COMPLETE (untracked)
```

---

## SECTION 1: COMPLETED WORK

### Phase 0: Label Convention Contract + Tokenizer Alignment (2026-02-13) ✅

| AC | Description | Result |
|----|-------------|--------|
| AC-0.1 | UD v2 label set validation (37 labels) | ✅ Pass |
| AC-0.2 | PTB POS tag set validation (45 tags) | ✅ Pass |
| AC-0.3 | Unicode normalization | ✅ 20/20 |
| AC-0.4 | Tokenizer alignment (<0.5% mismatch) | ✅ 28/28 |
| AC-0.5 | UD v2 → BFO/CCO role mapping | ✅ 26/26 |

**Key files:** `src/core/LabelConvention.js`, `src/core/UnicodeNormalizer.js`, `src/core/RoleMappingContract.js`
**Tests:** `npm run test:phase0` → 3 test files

---

### Phase 1A: Averaged Perceptron POS Tagger (2026-02-13) ✅

| AC | Description | Result |
|----|-------------|--------|
| AC-1A.1 | POS accuracy ≥ 96% | ⚠️ 93.5% (below target, accepted) |
| AC-1A.2 | Feature template (18 features) | ✅ Pass |
| AC-1A.3 | Tag dictionary optimization | ✅ Pass |
| AC-1A.4 | Model pruning (< 5 MB) | ✅ 2.7 MB |
| AC-1A.5 | JS inference module | ✅ Pass |
| AC-1A.6 | Integration with tokenizer | ✅ Pass |
| AC-1A.7 | Model provenance metadata | ✅ Pass |

**Key files:** `src/core/PerceptronTagger.js`, `src/data/pos-weights-pruned.json`, `src/data/pos-weights-pruned.bin`
**Tests:** `npm run test:phase1`

---

### Phase 1B: Gazetteer NER (2026-02-13) ✅

| AC | Description | Result |
|----|-------------|--------|
| AC-1B.1–1B.6 | Gazetteer format, lookup, abbreviation, versioning | ✅ 27/27 |

**Key files:** `src/graph/GazetteerNER.js`, `src/data/gazetteers/`
**Tests:** `npm run test:phase1`

---

### Phase 2: Transition-Based Dependency Parser (2026-02-15) ✅

| AC | Description | Result |
|----|-------------|--------|
| AC-2.1 | UAS ≥ 90% | ⚠️ 85.3% (below target, accepted) |
| AC-2.2 | LAS ≥ 88% | ⚠️ 83.2% (below target, accepted) |
| AC-2.3–2.10 | Transitions, DepTree, calibration | ✅ All pass |
| AC-2.11 | Binary model export (TT01 format) | ✅ Pass |
| AC-2.12 | Model provenance | ✅ Pass |

**Key files:** `src/core/DependencyParser.js`, `src/core/DepTree.js`, `src/core/DepTreeCorrector.js`, `src/data/dep-weights-pruned.bin`
**Tests:** `npm run test:phase2`

---

### Phase 3A: Core Extraction — Tree-Based Entity, Act, Role (2026-02-16) ✅

| AC | Description | Result |
|----|-------------|--------|
| AC-3.0 | Full pipeline ordering (7-stage) | ✅ Pass |
| AC-3.1–3.4b | Entity extraction from DepTree | ✅ Pass |
| AC-3.5–3.7 | Act extraction (root verb, passive, negation) | ✅ Pass |
| AC-3.8–3.11b | 5 copular patterns, 7 relation inferences | ✅ Pass |
| AC-3.12–3.13 | Role mapping (nsubj→Agent, obj→Patient, oblique subtyping) | ✅ Pass |

**Total:** 30/30 assertions
**Key files:** `src/graph/TreeEntityExtractor.js`, `src/graph/TreeActExtractor.js`, `src/graph/TreeRoleMapper.js`
**Tests:** `npm run test:phase3a`

---

### Phase 3B: Infrastructure & Integration (2026-02-16) ✅

| AC | Description | Result |
|----|-------------|--------|
| AC-3.14–3.17 | Confidence propagation, PP-attachment, ambiguity signals | ✅ 22/22 |
| AC-3.18 | Debug/verbose output | ✅ 20/20 |
| AC-3.19–3.21 | Async model loading (3 modes) | ✅ 11/11 |
| AC-3.22 | Cross-sentence mention IDs | ✅ Pass |

**Total:** 53/53 assertions
**Key files:** `src/graph/ConfidenceAnnotator.js`, `src/graph/SemanticGraphBuilder.js`
**Tests:** `npm run test:phase3b`

---

### Phase 4: Validation, Polish, and Release Readiness (2026-02-18) ⚠️ 95%

| AC | Description | Result |
|----|-------------|--------|
| AC-4.1 | 200-sentence gold set | ✅ Entity F1 90.3%, Role F1 59.3% (baselined) |
| AC-4.2b | Stative vs agentive passive subset | ✅ In gold set |
| AC-4.3 | Three-way coordination | ✅ In gold set |
| AC-4.3b | Ditransitive verb subcategorization | ✅ DepTreeCorrector implemented |
| AC-4.4–4.7 | Adversarial edge cases | ✅ 130/130 |
| AC-4.8–4.11 | Security sanitization (6 vectors) | ✅ 20/20 |
| AC-4.12 | Bundle size | ✅ 5.49 MB / 0.97 MB gzipped |
| AC-4.13 | Binary model loading | ✅ TT01 verified |
| AC-4.14/4.14b | Checksum/version error handling | ✅ Pass |
| AC-4.15 | Desktop performance | ⚠️ p95=27.44ms ✅, p50=15.95ms ❌ (>10ms) |
| AC-4.16 | Desktop memory | ✅ <50 MB |
| AC-4.17 | Mobile targets | ⏸️ Advisory, not tested |
| AC-4.18–4.19 | Regression gate (golden + component) | ✅ Maintained |
| AC-4.20 | API backward compatibility + path isolation | ✅ 21+ tests |
| AC-4.21 | Attribution/third-party licenses | ⚠️ Drafted, legal pending |
| — | EVALUATION_REPORT.md | ✅ Published |
| — | PERFORMANCE_REPORT.md | ✅ Published |
| — | Two-tier ICE (23/23) | ✅ Pass |

**BLOCKER:** Legal sign-off on CC-BY-SA 4.0 derivative-work determination — external dependency, not under our control.

---

### §9.5 GenericityDetector (2026-02-19/20) ✅ ORPHANED FEATURE

**Status:** Fully implemented but NOT assigned to any phase in the roadmap.
**Spec:** `docs/architecture/spec-section-9.5-genericity-detection-final.md`
**PHVD:** `docs/dossiers/PHVD-2026-02-20-WP2.yaml`

| Feature | Status |
|---------|--------|
| 4-signal classification (determiner, tense, predicate, register) | ✅ Implemented |
| GEN/INST/UNIV/AMB categories | ✅ Implemented |
| owl:Class (GEN/UNIV) vs owl:NamedIndividual (INST) | ✅ Implemented |
| Gazetteer/acronym guard (Step 0) | ✅ Implemented (P0 fix eab0b91) |
| Confidence scores + alternative readings | ✅ Implemented |
| Demo integration (tree-demo.html) | ✅ Implemented |
| Unit tests | ✅ 43/43 pass |

**NOT implemented (§9.5.5 Patterns A-E):**
- Pattern A: GEN → owl:Restriction + owl:someValuesFrom
- Pattern C: UNIV → owl:Restriction + owl:allValuesFrom
- Pattern D: AMB → structured uncertainty with alternatives
- Pattern E: Normative generic via deontic modal → owl:Restriction

These require act/role context to determine property and filler. Deferred to future work package.

**Key files:** `src/graph/GenericityDetector.js`, `src/graph/RealWorldEntityFactory.js`
**Tests:** `tests/unit/phase5/genericity-detection.test.js` (43 assertions)

---

### Phase 6: Ambiguity Preservation (Pre-Refactor) ✅ UNTRACKED

**Status:** Implemented BEFORE the refactor roadmap was written. Has 11 test files but is NOT reflected in `Major-Refactor-Roadmap.md`.

| Feature | Test File | Status |
|---------|-----------|--------|
| Interpretation Lattice (v6.0.0) | interpretation-lattice.test.js | ✅ |
| Alternative Graph Builder | alternative-graph-builder.test.js | ✅ |
| Ambiguity Resolver | ambiguity-resolver.test.js | ✅ |
| Selectional Preferences | selectional-preferences.test.js | ✅ |
| Bridge Ontology Loader | bridge-ontology-loader.test.js | ✅ |
| Builder Integration | builder-integration.test.js | ✅ |
| Ontology Manager | ontology-manager.test.js | ✅ |
| Ontology Text Tagger | ontology-text-tagger.test.js | ✅ |
| Ontology Validator | ontology-validator.test.js | ✅ |
| Turtle Parser | turtle-parser.test.js | ✅ |
| ValueNet Adapter | valuenet-adapter.test.js | ✅ |

**Key files:** `src/graph/InterpretationLattice.js`, `src/graph/AmbiguityDetector.js`, `src/graph/AmbiguityResolver.js`, `src/graph/AlternativeGraphBuilder.js`, `src/graph/SelectionalPreferences.js`

---

### Phase 7: Semantic Refinement (Pre-Refactor) ✅ UNTRACKED

**Status:** Implemented BEFORE the refactor roadmap. Has 15 test files but is NOT in `Major-Refactor-Roadmap.md`.

| Feature | Test File | Status |
|---------|-----------|--------|
| Stative Predication | stative-predication.test.js | ✅ |
| Source Attribution | source-attribution.test.js | ✅ |
| Temporal Detection | temporal-detection.test.js | ✅ |
| Temporal Linking | temporal-linking.test.js | ✅ |
| Complex Designator | complex-designator.test.js | ✅ |
| Certainty Analyzer | certainty-analyzer.test.js | ✅ |
| Modal Realism | modal-realism.test.js | ✅ |
| Pronoun Typing | pronoun-typing.test.js | ✅ |
| Selectional Refinement | selectional-refinement.test.js | ✅ |
| Role Consolidation | role-consolidation.test.js | ✅ |
| Inanimate Agent Retype | inanimate-agent-retype.test.js | ✅ |
| Infinitive Complement | infinitive-complement.test.js | ✅ |
| Disease Disposition | disease-disposition.test.js | ✅ |
| Symptom Detection | symptom-detection.test.js | ✅ |
| Traffic Cop Integration | traffic-cop-integration.test.js | ✅ |

**Key files:** Various in `src/graph/`

---

### Phase 9: Combined Validation (Pre-Refactor) ✅ UNTRACKED

| Feature | Test File | Status |
|---------|-----------|--------|
| Combined Validation Report | combined-validation-report.test.js | ✅ |

---

## SECTION 2: ACTIVE WORK — Post-Demo Workstreams (2026-03-26)

### Context

Stakeholder demo on 2026-03-26 exposed surface-level failures that undermined confidence in the tool. The architecture is sound (two-tier graph, BFO compliance, ontology matching, OWL NPA for negation — all validated). The problem: we demoed a parser to people who needed a platform, and the parser couldn't handle their sentences.

**What broke in front of users:**
- `shall` not recognized as deontic modal (every CBP policy sentence returned `modality=null`)
- "Department of Homeland Security" fragmented into separate tokens
- JSON-LD output incomprehensible to non-technical users
- Ontology matching produced duplicate nodes (now fixed: commit `d64abda`)

**What is NOT being revisited:** Two-tier architecture, FT-03 StructuralAssertion work, ontology tagger priority engine, BFO/CCO topology, model embedding, values layer removal. The architecture is solid. We're finishing the surface.

Three parallel workstreams address this. None are optional.

---

### WS-1: Domain Test Corpus

**Priority:** HIGHEST — quality gate everything else depends on
**Owner:** Needed
**Timeline:** Before any other feature work

Build a corpus of 50 real sentences from CBP policy documents, federal regulations, and operational text. Run every sentence through `buildGraph()`. Review every graph for correctness.

**Why:** Current test sentences are synthetic ("The cat sleeps"). Nobody at a demo types those. They type: "An officer shall verify that the traveler's documentation is consistent with the information provided on the CBP Form 6059B."

**Process:**
1. Collect 50 sentences from real CBP/DHS source documents
2. Run each through `buildGraph()`, capture full `@graph` output
3. Manual review: entities correct? Multi-word intact? Roles correct? Modality? Negation? Ontology match?
4. Categorize each failure: **Bug** (fix it), **Known limitation** (add to S6 as `known: true`), **Enhancement** (file for later)
5. Bug-category: write regression test, fix it
6. Known-limitation: document in semantic parse runner S6

**Deliverable:** `tests/corpus/cbp-policy-corpus.json` — 50 sentences with output and correctness annotations. Becomes acceptance test for all future parser changes.

---

### WS-2: SME Demo UI

**Priority:** HIGH — required before any future external demo
**Owner:** Needed
**Timeline:** Parallel with WS-1

Build a visualization layer that renders `buildGraph()` output as something subject matter experts can read. JSON-LD is a serialization format for machines.

**Three views:**

**Entity Cards:** For each Tier 2 node (identified by `is_subject_of`):
- Entity name, type (excluding owl:NamedIndividual/owl:Class), ontology matches (label + confidence), role in sentence

**Relation Map:** For each StructuralAssertion or Tier 2 → Tier 2 property:
- Subject → Relation → Object as table row ("CBP → part of → DHS")
- Negated assertions: strike-through or red indicator

**Raw JSON toggle:** Full `@graph` behind "Developer View" button. Hidden by default.

**What NOT to build:** No D3 force layouts. No interactive graph. Cards and a table. Comprehension, not exploration.

**Deliverable:** Updated `dist/standalone-demo.html`. Works from `file://`. No server. No build step.

---

### WS-3: Embarrassing Failures

**Priority:** HIGH — specific bugs that broke the demo
**Owner:** Dev team
**Timeline:** Immediate, before WS-1 corpus review

#### Fix 1: `shall` Modality (S8-02)
**Status:** Test exists, test fails. **Effort:** Small.
Add `shall` to the modal verb list alongside `must`, `will`, `can`, `might`. Classify as deontic obligation.

#### Fix 2: Multi-Word Entity Fragmentation
**Status:** Tracked as §5.1b. **Effort:** Medium.
"Department of Homeland Security" fragmented in certain syntactic positions. Reproduce, trace, patch. Test in subject, object, possessive, prepositional, and relative clause positions.

#### Fix 3: Ontology Matching Bugs
**Status:** ✅ FIXED (commit `d64abda`). Three bugs resolved:
- Duplicate match nodes → removed dead label supplement loop + subject dedup
- Missing OWL type distinction → added `ontologyMatchOWLType` field
- CCO acronym (`cco:ont00001753`) not in priority chain → added to `PRIORITY_PROPERTIES`
- `ontologyMatchClass` renamed to `ontologyMatchIRI`

---

### WS Success Criteria

| # | Criterion | Measurement |
|---|-----------|-------------|
| 1 | Corpus complete | 50 real CBP sentences parsed, every graph reviewed, every failure categorized |
| 2 | Demo UI usable | Non-technical user sees entity cards + relations, not JSON-LD |
| 3 | Embarrassments fixed | `shall` recognized. "Department of Homeland Security" never fragments. Ontology matching correct. |
| 4 | Test runners green | All three HTML runners pass (within expected known-limitation and TDD-target counts) |

**When all four are met, we demo again.**

---

## SECTION 3: PLANNED WORK (Not Started)

### 3.1 Phase 5: Fandaws Integration — TagTeamAdapter + ParseResult Contract

**Priority:** DEFERRED — TagTeam not mature enough to serve as Fandaws NLParser
**Dependencies:** Phase 4 complete, WS-1/WS-3 workstreams, Role F1 ≥ 85%
**Spec:** `docs/research/Fandaws_v3.3_Specification.md` §10.4.1
**Roadmap:** `docs/development/Major-Refactor-Roadmap.md` Phase 5

**Deferral rationale (2026-03-26):**
Phase 5 makes TagTeam the NLParser *for* Fandaws. This requires TagTeam to reliably parse the sentence types Fandaws will feed it — policy text, regulatory language, multi-word entities, deontic modals. The 2026-03-26 stakeholder demo proved TagTeam cannot yet handle these patterns: Role F1 is 59% (target 85%), coordination splits multi-word entities, `shall` isn't recognized. Shipping the adapter now would give Fandaws a parser that breaks on its core input.

**What is NOT deferred:** TagTeam can already consume Fandaws' *output* (the knowledge graph) as an ontology via `OntologyTextTagger.fromTTL()`. This is Layer 3 type resolution (§3.5) — the Fandaws graph enriches TagTeam entity matching. This capability is live and working.

**Prerequisite to un-defer:**
- WS-1 corpus: 50 real policy sentences parsed correctly
- WS-3 fixes: `shall` modality, multi-word entity fragmentation
- Role F1 ≥ 75% (relaxed from 85% — sufficient for adapter MVP)
- Coordination entity accuracy ≥ 90% on coord-keep baselines

**AC list preserved for when work resumes:**

| AC | Description | Effort |
|----|-------------|--------|
| AC-5.1 | TagTeamParseResult schema conformance | Medium |
| AC-5.2 | VerbType routing — classification (copular) | Medium |
| AC-5.3 | VerbType routing — property (has/adjective) | Medium |
| AC-5.4 | VerbType routing — customRelationship (transitive) | Medium |
| AC-5.5 | Confidence propagation to ParseResult | Small |
| AC-5.6 | Speech act detection (assertion/question/directive) | Medium |
| AC-5.7 | Modality detection (epistemic/deontic/realis) | Medium |
| AC-5.8 | Hedging detection | Small |
| AC-5.9 | Adapter parse() method | Medium |
| AC-5.10 | Adapter isAvailable() method | Small |
| AC-5.11 | Adapter getCapabilities() method | Small |
| AC-5.12 | Subject extraction from semantic roles | Medium |
| AC-5.13 | Copular-to-classification mapping | Medium |
| AC-5.14 | Negation passthrough | Small |
| AC-5.15 | Knowledge graph context (advisory) | Large — deferred |

**Deliverables (when un-deferred):**
- `src/adapters/TagTeamAdapter.js`
- `src/adapters/FandawsParseResultMapper.js`
- `src/adapters/VerbTypeClassifier.js`
- `src/adapters/DiscourseAnnotationExtractor.js`
- `tests/unit/phase5/fandaws-integration.test.js`
- `tests/integration/fandaws-adapter.test.js`
- `tests/unit/phase5/parse-result-contract.test.js`

**Exit criteria:** VerbType accuracy ≥ 90%, discourse annotations correct, all Phase 0-4 regression gate passes.

---

### 3.2 §9.5.5 OWL Restriction Patterns (Patterns A-E)

**Priority:** MEDIUM — Required for ontological correctness of generic assertions
**Dependencies:** GenericityDetector (✅ done), act/role extraction context
**Spec:** `docs/architecture/spec-section-9.5-genericity-detection-final.md` §9.5.5
**Roadmap:** ❌ NOT in roadmap — needs to be added

**What's missing:**
Currently, GenericityDetector classifies entities as GEN/INST/UNIV/AMB and RealWorldEntityFactory creates `owl:Class` or `owl:NamedIndividual`. But the full OWL output patterns are not implemented:

| Pattern | Input | Current Output | Correct Output |
|---------|-------|---------------|----------------|
| A (GEN) | "Dogs have fur" | `owl:Class "Dog"` | `owl:Restriction` on `bfo:has_quality` with `owl:someValuesFrom "Fur"` |
| B (INST) | "Fido has fur" | `owl:NamedIndividual "Fido"` | ✅ Already correct |
| C (UNIV) | "All dogs have fur" | `owl:Class "Dog"` | `owl:Restriction` with `owl:allValuesFrom "Fur"` |
| D (AMB) | "The dog ran" | `owl:Class "Dog"` | Structured uncertainty with GEN + INST alternatives |
| E (Norm) | "Officers shall report" | `owl:Class "Officer"` | `owl:Restriction` with `deonticModality: "obligation"` |

**Effort:** Large — requires integration with act/role context to determine the property (predicate) and filler (object) for restrictions.

**Prerequisite:** Stative predicate recognition. "Dogs have fur" needs "have" classified as stative possession (not IntentionalAct). This is the stakeholder concern noted above.

---

### 3.3 Stative Predicate Reclassification

**Priority:** HIGH — Blocks §9.5.5 Patterns AND stakeholder concern
**Dependencies:** GenericityDetector (✅), TreeActExtractor
**Spec:** `docs/architecture/tagteam-v7-stative-predication-spec.md`
**Roadmap:** ❌ NOT in roadmap

**Problem:** The pipeline currently treats ALL verbs as potential IntentionalActs. Stative verbs ("have", "contain", "resemble", "belong to", "consist of") produce ontologically wrong output:
- "Dogs have fur" → Agent=Dogs, Patient=fur (wrong — possession is not an intentional act)
- "The box contains books" → Agent=box, Patient=books (wrong — inanimate containment is not agentive)

**Correct output for stative predication:**
- "Dogs have fur" → `bfo:has_quality` or `bfo:bearer_of` relationship (no act, no roles)
- "The box contains books" → `bfo:has_part` or spatial containment relation

**Scope:**
1. Identify stative verbs (STATIVE_VERBS set already exists in GenericityDetector)
2. When subject is GEN/UNIV and predicate is stative: emit relation, not act+roles
3. When subject is INST and predicate is stative: emit instance-level property assertion

---

### 3.5 TypeClassifier Module — Ontology-Grounded Entity Classification

**Priority:** HIGH — Blocks ontological correctness (see §5.2 Fabricated IRIs)
**Dependencies:** CCO OWL audit (§5.2, done), Tier 2 default fix (done)
**Roadmap:** NOT in roadmap — inter-phase tech debt

**Problem:** Entity type classification currently uses scattered keyword lists (`PERSON_KEYWORDS`, `ORG_KEYWORDS` in RealWorldEntityFactory.js, `ENTITY_TYPE_MAPPINGS` in EntityExtractor.js) that grow ad-hoc and produce fabricated CCO IRIs. Deverbal nouns ("treatment", "surgery", "assessment") cross the BFO continuant/occurrent boundary and cannot be enumerated.

**Solution (3 layers):**

**Layer 1 (immediate — done):** Default changed from `cco:Artifact` to `bfo:BFO_0000001` (Entity). Wrong-but-general is safer than wrong-and-specific.

**Layer 2 (this module):** Single `TypeClassifier` backed by `src/data/type-classifications.json`:
```json
{
  "treatment": {
    "primary": "bfo:BFO_0000015",
    "morphological_hint": "deverbal_noun",
    "source_verb": "treat",
    "note": "Ambiguous: process vs. continuant depending on context. Default to Process."
  },
  "doctor": {
    "primary": "cco:Person",
    "verified": true,
    "ccoIRI": "ont00001262"
  }
}
```

Properties:
- Derived from published CCO OWL, not invented
- `morphological_hint` field for deverbal nouns
- `verified` field tracks ontology provenance
- Single source of truth — replaces all keyword lists
- Explicit disambiguation notes for ambiguous terms

**Layer 3 (Fandaws integration):** Knowledge graph resolves classification at query time. TypeClassifier JSON becomes offline fallback.

**Deliverables:**
- `src/graph/TypeClassifier.js` — single classification module
- `src/data/type-classifications.json` — ontology-derived lookup
- Remove: `PERSON_KEYWORDS`, `ORG_KEYWORDS` from RealWorldEntityFactory.js
- Remove: `ENTITY_TYPE_MAPPINGS` from EntityExtractor.js
- Migrate fabricated `cco:*Role` IRIs to `tagteam:*Role`
- Tests: classification accuracy against gold corpus

**Exit criteria:** Zero fabricated CCO IRIs in output graphs. All entity types traceable to published OWL or explicitly marked as `tagteam:` extensions.

---

### 3.6 Post-Phase 5: Domain Fine-Tuning

**Priority:** LOW — Optional quality improvement
**Dependencies:** Phase 5 complete
**Roadmap:** In roadmap as "Post-Phase 5"

**Deliverables:**
- 100-200 annotated domain sentences (`training/data/tagteam-domain/`)
- Annotation guidelines (`training/ANNOTATION_GUIDELINES.md`)
- Fine-tuned POS + dep models

**Targets:**
- Domain accuracy improvement ≥ 3%
- No regression on UD-EWT (within 0.5%)
- Model size still within 10 MB

---

## SECTION 4: BLOCKED WORK

### 4.1 Legal Sign-Off (AC-4.21)

**Blocker type:** External — requires legal review
**Impact:** Blocks Phase 4 formal exit and public release
**Status:** CC-BY-SA 4.0 derivative-work determination pending
**What's done:** THIRD_PARTY_LICENSES.md drafted with UD-EWT, GeoNames, gazetteer attribution
**What's needed:** Written legal opinion on whether trained model weights constitute a derivative work

### 4.2 Mobile Performance Testing (AC-4.17)

**Blocker type:** Hardware — requires physical devices
**Impact:** Advisory only, not a release blocker
**Status:** Desktop benchmarks done (p50=15.95ms, p95=27.44ms)
**Targets (if tested):** iPhone 12: p50<15ms, p95<50ms; Pixel 4a: p50<25ms, p95<80ms

---

## SECTION 5: KNOWN GAPS AND TECHNICAL DEBT

### 5.1 Accuracy Gaps

| Metric | Target | Actual | Gap | Root Cause |
|--------|--------|--------|-----|------------|
| POS accuracy | ≥96% | 93.5% | -2.5% | Single-layer perceptron ceiling |
| UAS | ≥90% | 85.3% | -4.7% | Single-layer perceptron ceiling |
| LAS | ≥88% | 83.2% | -4.8% | Single-layer perceptron ceiling |
| Entity F1 | ≥88% | 90.3% | ✅ +2.3% | Exceeded target |
| Role F1 | ≥85% | 59.3% | -25.7% | Oblique roles, coordination, passives |
| p50 latency | <10ms | 15.95ms | +5.95ms | Two-tier ICE overhead |

**Role F1 gap analysis** (from EVALUATION_REPORT.md):
- Oblique role assignment: primary driver of missed roles
- Coordination: agent/patient sharing across conjuncts inconsistent
- Passive voice: obl:agent detection works but some edge cases fail
- Improvement path: targeted fixes per pattern type, not architectural change

### 5.1b Coordination Entity Boundary Failure (2026-03-26)

**Severity:** HIGH — Multi-word named entities containing "and" are destroyed by coordination split
**Impact:** Ontology matching cannot work if the entity was never extracted as a unit

**Observed failure:** "Customs and Border Protection is part of Department of Homeland Security."
- Parser splits on "and", creating fragments: `Customs`, `Border Protection`, `Security`
- "Customs" and "Security" misclassified as verbs (`Act_Customs`, `Act_Security`)
- Period extracted as entity (`inst:`)
- No ontology match possible because "Customs and Border Protection" never exists as a node
- Compare: "CBP is part of Department of Homeland Security." works correctly (single token, no coordination ambiguity)

**Scope:** Affects all government agency names with "and": Customs and Border Protection, Immigration and Customs Enforcement, Fish and Wildlife Service, Bureau of Alcohol Tobacco and Firearms. Baseline tests `coord-keep-001` through `coord-keep-005` all fail.

**Root cause:** `TreeEntityExtractor._handleCoordination()` compound-crossing guard (intended to return KEEP when conjuncts have `compound` children) is not firing reliably for these patterns. The dependency parser produces a coordination structure where "and" triggers conjunct splitting before the compound guard can prevent it.

**Existing defenses:**
- Compound-crossing check in `TreeEntityExtractor.js` (lines ~218-233): returns null (KEEP) when conjuncts have compound deps — but not triggering for these cases
- GazetteerNER: could prevent split if these names were in the gazetteer, but government agency names are not in the current gazetteer set
- ComplexDesignatorDetector: designed for greedy multi-word NER but runs after coordination has already split

**Fix paths (not prioritized):**
1. Add government agency names to GazetteerNER — prevents split at source
2. Fix compound-crossing guard to handle these dependency structures
3. Move ComplexDesignatorDetector before coordination split
4. Ontology-aware entity boundary repair: if a loaded ontology contains "Customs and Border Protection" as an rdfs:label, use it as NER evidence to prevent splitting

### 5.2 Fabricated Ontology IRIs (CCO Audit — 2026-02-21)

**Severity:** HIGH — Ontological correctness
**Impact:** False assertions in output graphs; downstream systems cannot resolve fabricated IRIs

**Audit result:** Of the CCO IRIs used in the codebase, only **8 classes** and **6 properties** are verified in published CCO OWL files. **22 act classes**, **5 role classes**, and **2 properties** are fabricated with the `cco:` prefix.

| Category | Verified | Fabricated | Details |
|----------|----------|------------|---------|
| Act classes | 3 (Act, IntentionalAct, ActOfCommunication) | 22 (all medical, domain-specific acts) | None of the medical act taxonomy exists in CCO |
| Entity classes | 5 (Person, Organization, Agent, Facility, ICE) | 2 (GeopoliticalEntity, GroupOfPersons) | Close CCO equivalents exist with different names |
| Role classes | 0 | 5 (AgentRole, PatientRole, RecipientRole, BeneficiaryRole, InstrumentRole) | CCO has social/institutional roles, not thematic roles |
| Properties | 6 (has_agent, affects, has_recipient, is_about, has_text_value, prescribes) | 2 (has_instrument, has_beneficiary) | |

**Additional issues:**
- CCO namespace URI wrong: codebase uses `http://www.ontologyrepository.com/CommonCoreOntologies/`, published CCO uses `https://www.commoncoreontologies.org/`
- CCO uses opaque numeric IRIs (`cco:ont00000005` for Act), not human-readable CURIEs
- Thematic roles (AgentRole, PatientRole, etc.) should be `tagteam:` namespace

**Immediate mitigations applied (2026-02-21):**
1. Tier 2 default changed from `cco:Artifact` to `bfo:BFO_0000001` (Entity)
2. `bfo-cco-registry.js` annotated with `verified: true/false` and `note` fields

**RESOLVED (2026-02-21):** Full IRI cleanup completed. All 94 fabricated IRIs removed from source, tests, and docs. Namespace corrected to `https://www.commoncoreontologies.org/`. Fabricated properties moved to `tagteam:` namespace. All role classes unified to `bfo:Role` with `rdfs:label` distinction. See plan file `cryptic-foraging-planet.md` for full details.
3. `PROCESS_TYPE_MAPPINGS` in RealWorldEntityFactory.js annotated as fabricated

**Resolution:** TypeClassifier module (see §3.5) replaces keyword lists with ontology-grounded JSON lookup, migrates fabricated IRIs to `tagteam:` namespace.

### 5.3 Architectural Limitations (V7)

These are **known and accepted** limitations that require major architectural work:

| Limitation | Impact | Tests Affected |
|------------|--------|---------------|
| No prefix subordination | "If X, Y" bleeds arguments | 5 component tests |
| No relative clause support | "The X who Y" fragments | 1 component test |
| No embedded clause detection | Subject bleeding | Multiple |
| Causative verb handling | "caused X to Y" | 1 component test |

**Component test ceiling:** 89/100 (89%) — 11 failures are architectural, not fixable without new clause boundary infrastructure.

### 5.4 ISA Corpus Failures (2026-03-30)

**Source:** ISA Test Runner (`dist/isa-test-runner-cms-dhs.html`) — 40 sentences from CMS-DHS Data Exchange MOA, validated with `TagTeam.buildGraph()` + SHACL shape validation.

**Overall (post-strict validator):** 15 pass / 10 partial / 15 fail (37.5%)

**SME Review (2026-03-30):** Identified 5 root-cause bug clusters from the 25 failing/partial tests:

| Cluster | Root Cause | Tests Affected | Severity |
|---------|-----------|----------------|----------|
| BC-1 | ~~RDM/Eventive bleed (ghost acts)~~ | ~~CMS-01,02,03,07,10; USCIS-04,05; JOINT-04~~ | ✅ CLOSED |
| BC-2 | EventDescription participant starvation (§7.1.3) | CMS-01,02,03,10; USCIS-04,05; JOINT-04; STAT-01,02; CPLX-01,03 | HIGH |
| BC-3 | PlanSpecification role dropping | CMS-01; USCIS-01,02,03,04 | HIGH |
| BC-4 | ~~Copular/Stative misrouting~~ | ~~STAT-01, STAT-02~~ | ✅ CLOSED |
| BC-5 | ~~Tier 1 metadata & enum drift~~ | ~~STAT-04,05,06; PROHIB-01~~ | ✅ CLOSED |

#### 5.4a Dep Parser Copular Fragmentation (STAT-01, STAT-02)

**Severity:** MEDIUM — blocks stative role extraction for short copular sentences with acronym subjects
**Status:** Known issue, documented with `knownIssue` in ISA corpus

**Observed failure:** "CMS is the Recipient Agency in this data exchange program."
- Dep parser produces NO `cop` relation for "is"
- "CMS", "is", "Recipient", "." all extracted as separate verb acts
- Stative gate never fires — sentence gets 4 ghost IntentionalActs instead of RoleAssertion

**Scope:** Affects copular sentences where subject is an all-caps acronym (CMS, DHS/USCIS). Longer copular sentences ("The Hub is the CMS-managed electronic service...") parse correctly.

**Root cause:** UAS 85.3% — the dep parser's transition model doesn't reliably produce `cop` arcs for short sentences with acronym-initial NNP subjects. The parser sees "CMS" as a potential verb root.

**Fix paths:**
1. Dep parser rule-based post-correction: if sentence matches `NNP + VBZ:is + DT + ...`, force `cop` relation
2. DepTreeCorrector heuristic: detect copular pattern in POS sequence and inject `cop` arc
3. Model retraining with more copular examples (expensive)

**Tests affected:** STAT-01, STAT-02 in ISA corpus

#### 5.4b "Agrees to [verb]" Commissive Pattern (2026-03-30 — FIXED)

**Severity:** HIGH — blocked all "agrees to provide/make/conduct" sentences (5 ISA tests)
**Status:** ✅ FIXED — added `'agree': 'intention'` to `MULTI_WORD_MODAL_LEMMAS`

**What was wrong:** "CMS agrees to provide USCIS with..." → "agrees" treated as narrative verb, no deontic detection. The embedded xcomp verb ("provide") was the actual prescribed act but wasn't being extracted through the multi-word modal path.

**Additional fix:** Added "agrees" and 22 other VBZ forms to `IRREGULAR_LEMMAS` — the `-es` suffix rule was over-truncating ("agrees"→"agre" instead of "agree").

#### 5.4c Ghost IntentionalAct in Subordinate Clauses (2026-03-30 — FIXED)

**Severity:** HIGH — affected ~10 ISA deontic sentences with embedded clauses
**Status:** ✅ FIXED — extended modality inheritance to `advcl`/`ccomp`/`acl:relcl`

**What was wrong:** "CMS will report this Agreement to OMB and to the appropriate Committees of Congress for review." → Main verb "report" correctly got DICE + PlanSpec, but subordinate verbs from advcl/ccomp/acl:relcl clauses emitted ghost IntentionalAct + EventDescription because they had no modal marker of their own.

**Fix:** Subordinate clauses under a deontic main clause now inherit the parent's modality, matching the existing behavior for `conj` (coordinated verbs).

#### 5.4d POS Tagger VBZ Mistagging (RC-1)

**Severity:** LOW — affects 4 tests across stative + entity suites
**Status:** Known issue, tests skipped with `RC-1` annotation

**Observed:** "consists", "enforces", "treats" tagged as NNS instead of VBZ by the perceptron tagger. These are VBZ forms that the tagger's feature model doesn't distinguish from plural nouns.

**Root cause:** POS accuracy 93.5% — single-layer perceptron ceiling. The `-s`/`-es` suffix is ambiguous between VBZ and NNS without broader context features.

**Tests affected:** 2 stative tests, 2 entity boundary tests (all skipped RC-1)

#### 5.4e EventDescription Participant Coverage (§7.1.3)

**Severity:** HIGH — SHACL invariant violation
**Status:** Known issue — tracked for fix

**Observed failure:** "CMS, through the Hub, may disclose to AEs the data received from USCIS..." → EventDescription for "receive" has `actType` and `realizationStatus` but is missing both `tagteam:agent` and `tagteam:patient`.

**Root cause:** The post-Tier2 resolution pass uses `_findTier2ByLabel()` to match role text labels to Tier 2 entity labels. When the role text is "the data" but the Tier 2 label is "datum" (lemmatized by RealWorldEntityFactory), the match fails. The normalizer strips determiners but doesn't handle singular/plural stem differences ("data"→"datum").

**Fix path:** Extend `_findTier2ByLabel()` to try lemmatized forms and plural-to-singular fallback when the initial match fails.

**Tests affected:** CMS-02, and likely any sentence where object entities have lemmatized Tier 2 labels

#### 5.4f PlanSpec Participant Starvation (Role Propagation)

**Severity:** HIGH — PlanSpecification missing prescribedPatient, prescribedRecipient, prescribedInstrument
**Status:** Known issue — next sprint priority

**Observed:** "CMS will make available upon request system security assessments..." → `PlanSpec_make` has `prescribedAgent: CMS` but `prescribedPatient` is missing entirely. The assessments and evidence are not linked to the prescribed act.

**Root cause (two layers):**

1. **`_findTier2ByLabel()` resolution failure** (§5.4e): The deferred resolution pass tries to match role text labels to Tier 2 entity labels. When labels don't match (lemmatization, plural/singular), the resolution silently fails and the property is dropped.

2. **RDM modal-pivot traversal gap**: When the parser generates a PlanSpecification, the role mapper must traverse dep arcs from the modal root verb to find its `obj` or `xcomp→obl` children. Currently the act assembly stamps `_agentText` from `nsubj` but does NOT traverse `obj`, `obl`, or `xcomp` children to find patient/recipient entities for the PlanSpec. The mapping logic stops at the verb and doesn't cross into the argument structure.

**Fix path:**
1. When assembling a PlanSpec for a modal act, traverse `obj` → `prescribedPatient`, `obl` with preposition "to" → `prescribedRecipient`, `obl` with preposition "through/via" → `prescribedInstrument`
2. Fix `_findTier2ByLabel()` to try lemmatized and plural-normalized fallback matching
3. Add `prescribedInstrument` property support to PlanSpec assembly and ontology

#### 5.4g Semantic Role Reversal

**Severity:** MEDIUM — AgentRole assigned to patient entity
**Status:** Known issue

**Observed:** "the data received from USCIS" → "the data" gets AgentRole for the "receive" act. Correct assignment is PatientRole (data is received, not receiving).

**Root cause:** In passive/reduced relative clauses like "data received from USCIS", the `nsubj` of "received" is "data" — the role mapper sees nsubj → AgentRole. But in passive constructions, nsubj is actually the patient. The passive detection (`isPassive`) may not fire for reduced relative clauses (no "was"/"been" auxiliary).

**Fix path:** Detect reduced relative clause pattern (VBN without aux) and flip nsubj from AgentRole to PatientRole.

#### 5.4h Hyper-Aggressive Noun Chunking (NER Boundary)

**Severity:** HIGH — entity spans absorb entire clause fragments, collapsing distinct entities into one
**Status:** Known issue — next sprint priority

**Observed:** "CMS will make available upon request system security assessments and other evidence for the purpose of making risk-based decisions." → parser emits a single 70-character DiscourseReferent: `"request system security assessments and other evidence for the purpose"`.

**Expected:** Three sibling entities: "system security assessments", "evidence", "the purpose" (or "purpose of making risk-based decisions").

**Root cause:** `TreeEntityExtractor._collectEntitySpan()` walks the dep tree greedily starting from the head noun. It swallows:
1. Preceding prepositional phrases via `obl` arcs ("upon request" → absorbed as part of the span)
2. Coordinating conjunctions via `conj` arcs ("and other evidence" → merged instead of split)
3. Trailing prepositional modifiers via `nmod` arcs ("for the purpose" → appended to span)

The method excludes `acl:relcl`, `acl`, `advcl`, `cop`, `punct`, and `appos` — but does NOT exclude `obl`, `nmod` at head level, or `conj` when siblings should be separate entities.

**Fix path:**
1. Break on coordinating conjunctions (`cc`/`conj`): sibling conjuncts should be extracted as separate entities, not merged into the head span
2. Exclude `nmod` children at head level when they have their own `case` preposition (indicates oblique role, not part of the noun phrase)
3. Exclude `obl` children entirely from entity spans (oblique arguments belong to the verb, not the noun)
4. Depth-limit `nmod` collection to 1 level (direct modifiers only, not chains)

#### 5.4i Coreference Architecture — One DR per Mention (IRI Collision)

**Severity:** HIGH — violates JSON-LD semantics and breaks graph visualization
**Status:** Known issue — architectural fix required

**Observed:** "CMS shall allow USCIS to monitor... under CMS possession and control." → Two `@graph` nodes share `"@id": "inst:CMS"` with different `mentionId` values (`s0:h1:0-3` and `s0:h14:76-79`). JSON-LD requires unique `@id` per node. D3 renders them as disconnected duplicate circles.

**Principle:** Tier 1 is the linguistic surface — mentions, not meaning. A DiscourseReferent represents a specific span of text. The Entity at Tier 2 is what it refers to. Two mentions of "CMS" = two DRs → one shared Tier 2 Entity.

**Current (wrong):**
```
{ "@id": "inst:CMS", "mentionId": "s0:h1:0-3" }
{ "@id": "inst:CMS", "mentionId": "s0:h14:76-79" }
```

**Correct model:**
```
{ "@id": "inst:DR_CMS_m1", "mentionId": "s0:h1:0-3", "is_about": "inst:Entity_CMS" }
{ "@id": "inst:DR_CMS_m2", "mentionId": "s0:h14:76-79", "is_about": "inst:Entity_CMS" }
```

**IRI pattern:** `inst:DR_{normalizedLabel}_m{mentionIndex}`

**Why it matters:**
1. **Provenance** — trace which mention triggered which obligation
2. **Span accuracy** — each DR carries its own character offsets
3. **Tier separation** — SHACL v1.3.1 §2.3 requires DRs as linguistic pointers, not semantic content
4. **Coreference chains** — future anaphora resolution ("CMS... they... the agency") requires distinct DRs

**Fix path:** In DR generation, maintain a mention counter per normalized label. Generate unique IRI per mention. All mentions share the same `is_about` target.

```javascript
// Before: const drId = `inst:${normalizedLabel}`;
// After:  const drId = `inst:DR_${normalizedLabel}_m${mentionIndex}`;
```

### 5.5 Roadmap Gaps

| Item | Issue | Resolution |
|------|-------|------------|
| GenericityDetector (§9.5) | Implemented but not assigned to any roadmap phase | Add to roadmap as "Phase 4.5" or document as inter-phase feature |
| Phase 6 (Ambiguity) | Implemented pre-refactor, NOT reflected as complete in roadmap | Mark as complete in roadmap |
| Phase 7 (Semantic Refinement) | Implemented pre-refactor, NOT in roadmap at all | Add to roadmap as completed pre-refactor work |
| §9.5.5 Patterns A-E | In spec, NOT in roadmap | Create dedicated work package |
| Stative predicate reclassification | Stakeholder concern, NOT in roadmap | Create dedicated work package |
| Security phases | 7 test files exist, no roadmap entry | Document as cross-cutting concern |

---

## SECTION 6: TEST INFRASTRUCTURE

### CI Pipeline (`npm run test:ci`) — 21 suites

| Suite | Command | Tests | Status |
|-------|---------|-------|--------|
| Phase 0 | `test:phase0` | 135 | ✅ |
| Phase 1 | `test:phase1` | 87/88 | ✅ (1 skip) |
| Phase 2 | `test:phase2` | 65/69 | ✅ (4 skip for accuracy) |
| Phase 3A | `test:phase3a` | 30 | ✅ |
| Phase 3B | `test:phase3b` | 53 | ✅ |
| Two-Tier ICE | `test:two-tier` | 23 | ✅ |
| Component | `test:component` | 16/100 | ✅ (topology change) |
| Adversarial | `test:adversarial` | 130 | ✅ |
| Sanitization | `test:sanitization` | 20 | ✅ |
| Bundle | `test:bundle` | 53 | ✅ |
| Regression | `test:regression` | 119 | ✅ |
| API Compat | `test:api` | 21+ | ✅ |
| Binary | `test:binary` | varies | ✅ |
| RDM | `test:rdm` | 40 | ✅ |
| Stative | `test:stative` | 23 (2 skip RC-1) | ✅ |
| Narrative | `test:narrative` | 19 | ✅ |
| Entity Boundary | `test:entity` | 18 (2 skip RC-1) | ✅ |
| SHACL | `test:shacl` | 41 (14+27) | ✅ |
| Corpus Regression | `test:corpus` | 15 | ✅ |
| TTL Schema | `test:ttl-schema` | 16 | ✅ |
| Tagger | `test:tagger` | 141 | ✅ |

### Additional Test Suites (not in CI)

| Suite | Command | Tests | Status |
|-------|---------|-------|--------|
| SHACL Frontier | `test:shacl:frontier` | 50 (3 known fails) | ⚠️ |
| ISA CMS-DHS | `dist/isa-test-runner-cms-dhs.html` | 40 | ⚠️ (2 dep parser, 4 expected) |
| Genericity Detection | `test:phase5` (misnamed) | 43 | ✅ |
| Gold Evaluation | `gold:evaluate` | 200 sentences | Entity F1 90.3%, Role F1 59.3% |
| Golden Tests | `test:golden` | 556 | 3.2% pass (spec documents) |
| Phase 6 | 11 test files | varies | ✅ (pre-refactor) |
| Phase 7 | 15 test files | varies | ✅ (pre-refactor) |
| Security | 7 test files | varies | ✅ |

---

## SECTION 7: PRIORITIZED WORK QUEUE (Updated 2026-03-30)

### Tier 1: Immediate — Demo Recovery (Parallel Workstreams)

| # | Work Item | Workstream | Effort | Status |
|---|-----------|------------|--------|--------|
| 1 | Fix `shall` modality (S8-02) | WS-3 | Small | ✅ DONE (MODAL_TABLE + tree pipeline) |
| 2 | Fix multi-word entity fragmentation (§5.1b) | WS-3 | Medium | ✅ DONE (CDD pre-pass + locked spans) |
| 3 | Fix ontology matching bugs (dedup, OWL type, acronym) | WS-3 | Medium | ✅ DONE (`d64abda`) |
| 4 | Build 50-sentence CBP domain corpus | WS-1 | Medium | ✅ DONE (38/50 = 76%) |
| 5 | Review corpus graphs, categorize failures | WS-1 | Large | ✅ DONE (15 regression tests) |
| 6 | SME demo UI (entity cards + relation map) | WS-2 | Medium | ✅ DONE (standalone-demo.html) |

### Tier 1b: SMA Workstreams (2026-03-27 → 2026-03-30)

| # | Work Item | Effort | Status |
|---|-----------|--------|--------|
| 1b.1 | RDM v1.2.1 — ghost act elimination (DICE + PlanSpec) | Large | ✅ DONE (40/40 tests) |
| 1b.2 | SMA WS-A — stative predicate extraction | Medium | ✅ DONE (23/23 tests) |
| 1b.3 | SMA WS-C — EventDescription for narratives | Medium | ✅ DONE (19/19 tests) |
| 1b.4 | SHACL shape validation (JS validator) | Medium | ✅ DONE (91 tests: 14+27+50) |
| 1b.5 | ISA test runner — real TagTeam integration | Small | ✅ DONE (replaces mock) |
| 1b.6 | "Agrees to [verb]" commissive pattern (§5.4b) | Small | ✅ DONE (MULTI_WORD_MODAL_LEMMAS) |
| 1b.7 | Ghost act suppression in subordinate clauses (§5.4c) | Small | ✅ DONE (modality inheritance) |
| 1b.8 | VBZ lemmatization fixes (23 irregular forms) | Small | ✅ DONE (IRREGULAR_LEMMAS) |

### Tier 2: Parser Maturity — ISA Bug Clusters + Fandaws Readiness

**BC-1, BC-4, BC-5 CLOSED (2026-03-30).** Remaining priority: BC-2 unblocks 11 tests, BC-3 unblocks 5 tests.

| # | Work Item | Bug Cluster | Effort | Depends On | Tests Affected |
|---|-----------|-------------|--------|------------|----------------|
| 7 | ~~**BC-1: Suppress ED+IA on RDM pivots**~~ | BC-1 §5.4c | Medium | — | ✅ CLOSED — ghost act suppression + finite-verb refinement |
| 8 | **BC-2: ED participant coverage** — Map nsubj→agent, obj→patient onto EventDescription. Fix `_findTier2ByLabel()` to handle lemmatized labels ("data"≠"datum"). Fix passive/reduced-relative role reversal. **Note:** Low-confidence dep arcs (parseProbability <0.5) cause silent entity dropping, which starves both ED and PlanSpec participants. Fix must also handle graceful degradation for ambiguous compound chains. | BC-2 §5.4e,g | Large | — | CMS-01,02,03,10; USCIS-04,05; JOINT-04; STAT-01,02; CPLX-01,03 |
| 9 | **BC-3: PlanSpec prescribedAgent/Patient** — Ensure nsubj maps to `prescribedAgent` through "agrees to" control verb chains AND obj/obl map to `prescribedPatient`/`prescribedRecipient`. **Scope note:** prescribedPatient dropping is caused by the same `_findTier2ByLabel()` resolution failure AND by entity extraction silently aborting on low-confidence dependency arcs. Must account for both. | BC-3 §5.4f | Medium | #8 | CMS-01; USCIS-01,02,03,04 |
| 10 | ~~**BC-4: Copular/stative misrouting**~~ | BC-4 §5.4a | Medium | — | ✅ CLOSED — CDD KNOWN_ACRONYMS + _detectListItems guard |
| 11 | ~~**BC-5: Tier 1 metadata**~~ — mentionId span bug fixed (CDD _detectListItems), systemGenerated flag on both code paths, denotesType enum enforced in SHACL validator | BC-5 | Small | — | ✅ CLOSED |
| 12 | Role F1 improvement (oblique roles, coordination propagation) | — | Large | — | |
| 13 | Coordination entity boundary fix (§5.1b comprehensive) | — | Large | — | |
| 14 | Legal sign-off follow-up (AC-4.21) | — | External | — | |
| 15 | POS tagger VBZ/NNS disambiguation (§5.4d, RC-1) | — | Medium | — | 4 tests skipped |
| 16 | **NER hyper-aggressive chunking (§5.4h)** — Break `_collectEntitySpan` on `conj`/`cc` (sibling entities), exclude `obl` children, limit `nmod` depth at head level. 70-char single-entity spans must become 3+ distinct entities. | §5.4h | Medium | — | ISA entity boundaries, blocks BC-3 prescribedPatient |
| 17 | **Coreference: one DR per mention (§5.4i)** — Generate unique IRI per mention (`DR_{label}_m{idx}`), all sharing same `is_about` target. Fixes JSON-LD `@id` collision, D3 visualization, and enables future anaphora chains. | §5.4i | Medium | — | All multi-mention sentences |
| 18 | SMA WS-B — Narrative negation | — | Medium | WS-C | Not started |

### Tier 2b: Fandaws HIRI Integration (NEW — reprioritized from Tier 4)

**Rationale:** The original roadmap deferred Fandaws until "parser maturity" (Role F1 ≥75%, coord ≥90%). The ISA corpus analysis (2026-03-30) revealed that the 85.3% UAS dep parser is the root ceiling on accuracy. Rather than spending 10+ weeks improving the parser, integrating the Fandaws knowledge graph (150K+ terms, BFO/CCO-typed, HIRI-atomized on IPFS) provides a top-down correction signal that compensates for parser errors at every downstream layer. This **inverts the dependency**: Fandaws maturity enables parser error recovery, not the other way around.

**Architecture: Three-Tier Resolution**

```
Tier A (compile-time): Bloom filter (~225KB) + core vocab (2K terms, ~500KB)
  → Ships with bundle. Instant "might exist" check. Zero latency.

Tier B (session cache): LRU in IndexedDB, ~5K entries, ~2MB
  → Persists across parses within a session. Avoids re-fetching.

Tier C (IPFS/HIRI): On-demand per-atom fetch, ~50-200ms per miss
  → Full 150K graph access. Content-addressed, cacheable.
```

**Lookup flow per sentence:**
1. Parse (current pipeline, ~15ms) → extract entity candidates
2. Bloom filter check (Tier A, <1ms) → YES/NO per candidate
3. Cache lookup (Tier B, <1ms) → HIT returns type, IRI, labels
4. IPFS resolve (Tier C, async, cache miss only) → fetch HIRI atom
5. Enrich graph: denotesType, Tier 2 IRI, selectional restrictions

**API:** Async-capable `buildGraph()` with ontology config. Current sync API unchanged (backward compatible).

| Phase | Work Item | Effort | Depends On | Target |
|-------|-----------|--------|------------|--------|
| F-1 | **Compiler: TTL → Bloom + Core Vocab** — Build-time script that reads Fandaws domain TTL files, extracts `rdfs:label`, `skos:altLabel`, `rdf:type`, `rdfs:domain`/`rdfs:range`. Outputs `bloom-filter.bin` (~225KB) and `core-vocabulary.json` (top 2K terms by frequency, ~500KB). | Medium | Fandaws TTL export | Week 1-2 |
| F-2 | **Async Resolution Layer** — `FandawsResolver` class: Bloom check → LRU cache → IPFS gateway fallback. Returns `{ iri, type, labels[], domain, range }` per term. IndexedDB persistence for Tier B cache. | Medium | F-1 | Week 2-3 |
| F-3 | **Wire into Entity Extraction** — Bloom-positive terms become span anchors in `TreeEntityExtractor` (same mechanism as CDD locked spans). If Fandaws says "system security assessments" is a known compound term, lock the span. Replaces heuristic NER boundary guessing. | Medium | F-2 | Week 3-4 |
| F-4 | **Wire into Type Assignment** — `RealWorldEntityFactory` uses resolved HIRI type instead of heuristic `type-mapping`. `denotesType` set from BFO/CCO class. Replaces `@type[0]` bootstrap fallback. | Small | F-2 | Week 3-4 |
| F-5 | **Wire into Selectional Preferences** — `SelectionalPreferences` module (currently unused) activated with domain/range from resolved class properties. Guides role assignment: if "provide" has range `InformationContentEntity`, "data" gets PatientRole not AgentRole. | Medium | F-4 | Week 4-5 |
| F-6 | **Wire into `_findTier2ByLabel`** — Resolution pass uses canonical label + altLabels from Fandaws instead of string matching. "data" → `skos:altLabel "data"` on entity with `rdfs:label "Datum"` → exact match. Fixes BC-2/BC-3 label resolution. | Small | F-2 | Week 3 |
| F-7 | **Domain Manifests** — Compile domain-specific vocab subsets (legal, medical, finance, ~500 terms each). Auto-detect domain from input text, prefetch relevant manifest. | Small | F-1 | Week 5 |

**Expected impact on accuracy:**

| Metric | Before Fandaws | After F-1→F-6 | Why |
|--------|---------------|---------------|-----|
| Entity typing | ~70% | ~92% | Lookup replaces heuristic |
| NER boundary | ~80% | ~90% | Ontology-aware span anchoring |
| Role F1 | 57.8% | ~72% | Selectional restrictions guide assignment |
| ISA pass rate | 37.5% | ~78% | Entity + type + role improvements compound |
| denotesType accuracy | ~60% | ~95% | Direct BFO/CCO class from graph |

**Fandaws requirements (from Aaron):**
- Export per-domain TTL files with: `rdfs:label`, `skos:altLabel`, `rdf:type` (BFO/CCO class), `rdfs:domain`/`rdfs:range`
- HIRI content-addressed IRIs per atomized class
- IPFS gateway endpoint for Tier C resolution
- Confirmed available ✅

### Tier 3: Ontological Completeness + SMA Continuation

| # | Work Item | Effort | Depends On |
|---|-----------|--------|------------|
| 19 | §9.5.5 OWL Restriction Patterns (A-E) | Large | WS-A (stative) |
| 20 | TypeClassifier module (§3.5) — **largely replaced by F-4** | Medium | F-4 |
| 21 | p50 latency optimization | Medium | — |
| 22 | SMA WS-D — Tense-aspect | Medium | WS-C |
| 23 | SMA WS-E — Deontic-narrative bridge | Medium | WS-B, WS-C |

### Tier 4: Deferred (post-85% general)

| # | Work Item | Effort | Depends On |
|---|-----------|--------|------------|
| 24 | Prefix subordination (V7 arch fix) | Very Large | — |
| 25 | Relative clause support (V7 arch fix) | Very Large | — |
| 26 | Mobile performance testing | Medium | Hardware |
| 27 | Legal sign-off follow-up (AC-4.21) | External | — |

---

## SECTION 8: RELEASE MILESTONES (Updated 2026-03-31)

| Milestone | Target Pass Rate | Work Items | Target Date |
|-----------|-----------------|------------|-------------|
| **Alpha.2** | ~65% ISA | BC-2, BC-3, §5.4h NER, §5.4i coreference | +3 weeks (2026-04-21) |
| **Alpha.3** | ~78% ISA | F-1→F-6 (Fandaws HIRI integration) | +5 weeks (2026-05-05) |
| **Beta** | ~85% general | F-7 domain manifests + selectional preferences tuning | +7 weeks (2026-05-19) |
| **Go off script** | ≥85% general | Stakeholders can test arbitrary input | Beta gate |

**Critical path:** Tier 2 (#8, #9, #16, #17) → Tier 2b (F-1→F-6) → Beta

---

## SECTION 9: KEY METRICS DASHBOARD (Updated 2026-03-31)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Entity F1 | 91.5% | ≥88% | ✅ (was 89.6%) |
| Role F1 | 60.1% | ≥85% | ❌ (was 57.8%, P=60.8% R=88.1%) |
| POS accuracy | 93.5% | ≥96% | ⚠️ (accepted) |
| UAS | 85.3% | ≥90% | ⚠️ (accepted) |
| LAS | 83.2% | ≥88% | ⚠️ (accepted) |
| Component tests | 16/100 (16%) | 100% | ⚠️ (topology change) |
| CI tests | 21 suites, 0 failures | All pass | ✅ |
| RDM tests | 40/40 | All pass | ✅ |
| Stative tests | 23/23 (2 skip RC-1) | All pass | ✅ |
| Narrative tests | 19/19 | All pass | ✅ |
| Entity boundary | 18/18 (2 skip RC-1) | All pass | ✅ |
| SHACL tests | 91 (14+27+50) | 47/50 frontier, 3 known | ✅ |
| Tagger tests | 141/141 | All pass | ✅ |
| Bundle tests | 53/53 | All pass | ✅ |
| Corpus regression | 15/15 | All pass | ✅ |
| TTL schema | 16/16 | All pass | ✅ |
| ISA corpus (CMS-DHS) | 23/40 pass (57.5%) | Tier-dependent | ⚠️ 3/7 tiers at threshold (CMS 90%, Complex 60%, Tier 4) |
| Bundle size | 10.95 MB | <15 MB | ✅ |
| p50 latency | 15.95ms | <10ms | ❌ |
| p95 latency | 27.44ms | <30ms | ✅ |
| Copular accuracy | 96.875% | ≥95% | ✅ |
| Ontology matching | No dupes, OWL type, acronyms | Correct | ✅ |
| Version | 5.0.0 | — | Merged to main (RDM breaking change) |
| Coordination accuracy | 80% | — | ⚠️ |

---

## SECTION 9: FILE INVENTORY

### Production Code (54 files)

**src/core/ (17 files):** BinaryModelLoader, ContractionExpander, DependencyParser, DepTree, DepTreeCorrector, LabelConvention, Lemmatizer, lexicon, MatchingStrategies, NounPhraseExtractor, PatternMatcher, PerceptronTagger, POSTagger, RoleMappingContract, SemanticRoleExtractor, UnicodeNormalizer, VerbPhraseExtractor

**src/graph/ (37 files):** ActExtractor, AlternativeGraphBuilder, AmbiguityDetector, AmbiguityReport, AmbiguityResolver, AssertionEventBuilder, ClauseSegmenter, CombinedValidationReport, ComplexDesignatorDetector, ComplexityBudget, ConfidenceAnnotator, ContextManager, DirectiveExtractor, DomainConfigLoader, EntityExtractor, GazetteerNER, GenericityDetector, InformationStaircaseBuilder, InterpretationLattice, JSONLDSerializer, NPChunker, ObjectAggregateFactory, OntologyValidator, QualityFactory, RealWorldEntityFactory, RoleDetector, ScarcityAssertionFactory, SelectionalPreferences, SemanticGraphBuilder, SentenceModeClassifier, SHMLValidator, SourceAttributionDetector, Tokenizer, TreeActExtractor, TreeEntityExtractor, TreeRoleMapper, ValidationReport

### Binary Models (2 files)
- `src/data/pos-weights-pruned.bin` (1.8 MB)
- `src/data/dep-weights-pruned.bin` (1.6 MB)

### Specification Documents
- `docs/development/TagTeam-Major-Refactor-v2.2.md` — Master spec (v2.2 Final Hardened)
- `docs/development/Major-Refactor-Roadmap.md` — TDD phase roadmap
- `docs/architecture/spec-section-9.5-genericity-detection-final.md` — Genericity spec
- `docs/research/Fandaws_v3.3_Specification.md` — Fandaws integration spec
- `docs/architecture/tagteam-v7-stative-predication-spec.md` — Stative predication spec

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-20 | Initial comprehensive document |
| 2.1 | 2026-03-30 | Added §5.4 ISA corpus failures. Updated Tier 1 to DONE, added Tier 1b SMA workstreams. 21 CI suites. |
| 2.2 | 2026-03-30 | SME review: strict SHACL validator (37.5% pass), 5 bug clusters (BC-1 through BC-5), §5.4e-h added. Ghost act suppression refined to finite-verb check. systemGenerated flag added to ParsingAct. |
| 3.0 | 2026-03-31 | **Roadmap inversion**: Fandaws HIRI integration reprioritized from Tier 4 to Tier 2b. Three-tier resolution architecture (Bloom + cache + IPFS). 7-phase implementation plan (F-1→F-7). §5.4i coreference added. Release milestones: Alpha.2 (65%), Alpha.3 (78%), Beta (85% general, "go off script" gate). Fandaws replaces dep parser accuracy work as primary path to 85%. |
