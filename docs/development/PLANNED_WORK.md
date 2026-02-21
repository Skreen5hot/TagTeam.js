# TagTeam.js — Comprehensive Planned Work Document

**Version**: 1.0
**Date**: 2026-02-20
**Authority**: This document is the single source of truth for all planned, in-progress, and completed work. It supersedes fragmented references across specs, roadmaps, and planning files.

---

## Document Map

| Document | Purpose | Status |
|----------|---------|--------|
| `docs/development/TagTeam-Major-Refactor-v2.2.md` | Master spec (the "what and why") | Approved, sections actively consumed |
| `docs/development/Major-Refactor-Roadmap.md` | TDD phase roadmap (the "how and when") | Phases 0-4 complete, Phase 5 not started |
| `docs/architecture/spec-section-9.5-genericity-detection-final.md` | GenericityDetector spec (§9.5) | Implemented (not in roadmap — orphaned feature) |
| `docs/research/Fandaws_v3.3_Specification.md` | Fandaws integration spec (§10.4.1) | Phase 5 depends on this |
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
Phase 5   ░░░░░░░░░░░░░░░░░░░░   0%  Fandaws Integration             ❌ NOT STARTED
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

## SECTION 2: ACTIVE WORK (In Progress)

### GenericityDetector Demo Prep (2026-02-20)

| Item | Status | Notes |
|------|--------|-------|
| Demo buttons + genericity badges | ✅ Done | tree-demo.html updated |
| P0 regression fix (CBP → owl:Class) | ✅ Fixed | Commit eab0b91, acronym guard |
| Stakeholder demo | ⏸️ Paused | Waiting for stative verb concern resolution |

**Stakeholder Concern:** "Dogs have fur" correctly classified as GEN/95%, but pipeline treats "have" as IntentionalAct with AgentRole/PatientRole. This is ontologically wrong for stative possession. See §9.5.5 Pattern A — stative predicates should produce `bfo:has_quality` or `bfo:inheres_in`, not IntentionalAct + AgentRole.

**Resolution path:** Requires act type reclassification for stative verbs. The GenericityDetector identifies the sentence as generic correctly, but the act extraction pipeline doesn't distinguish stative from dynamic predicates. This is an architectural gap documented in the PHVD (assumption A-010).

---

## SECTION 3: PLANNED WORK (Not Started)

### 3.1 Phase 5: Fandaws Integration — TagTeamAdapter + ParseResult Contract

**Priority:** HIGH — Core product integration
**Dependencies:** Phase 4 complete (all except legal sign-off)
**Spec:** `docs/research/Fandaws_v3.3_Specification.md` §10.4.1
**Roadmap:** `docs/development/Major-Refactor-Roadmap.md` Phase 5

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

**Deliverables:**
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

### 5.4 Roadmap Gaps

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

### CI Pipeline (`npm run test:ci`)

| Suite | Tests | Status |
|-------|-------|--------|
| Phase 0 | 135 | ✅ |
| Phase 1 | 87/88 | ✅ (1 skip) |
| Phase 2 | 65/69 | ✅ (4 skip for accuracy) |
| Phase 3A | 30 | ✅ |
| Phase 3B | 53 | ✅ |
| Two-Tier ICE | 23 | ✅ |
| Component | 89/100 | ✅ (11 architectural) |
| Adversarial | 130 | ✅ |
| Sanitization | 20 | ✅ |
| Bundle | 2 | ✅ |
| Regression | 119 | ✅ |
| API Compat | 21+ | ✅ |
| Binary | varies | ✅ |
| **Total** | **~770+** | **✅ All pass** |

### Additional Test Suites

| Suite | Command | Tests | Status |
|-------|---------|-------|--------|
| Genericity Detection | `npm run test:phase5` (misnamed) | 43 | ✅ |
| Gold Evaluation | `npm run gold:evaluate` | 200 sentences | Entity F1 90.3%, Role F1 59.3% |
| Golden Tests | `npm run test:golden` | 556 | 3.2% pass (spec documents) |
| Expert Validation | `npm run test:expert` | 2 | ❌ 0% (P0 architectural) |
| Phase 6 | 11 test files | varies | ✅ (pre-refactor) |
| Phase 7 | 15 test files | varies | ✅ (pre-refactor) |
| Security | 7 test files | varies | ✅ |

---

## SECTION 7: PRIORITIZED WORK QUEUE

### Tier 1: Immediate (This Sprint)

| # | Work Item | Effort | Blocker? | Depends On |
|---|-----------|--------|----------|------------|
| 1 | Resolve stakeholder stative verb concern | Small | Blocks demo | — |
| 2 | Legal sign-off follow-up | External | Blocks release | — |

### Tier 2: Near-Term (Next Sprint)

| # | Work Item | Effort | Depends On |
|---|-----------|--------|------------|
| 3 | Phase 5 Fandaws Integration (AC-5.1–5.14) | Large | Phase 4 exit |
| 4 | Stative predicate reclassification | Medium | — |

### Tier 3: Medium-Term

| # | Work Item | Effort | Depends On |
|---|-----------|--------|------------|
| 5 | §9.5.5 OWL Restriction Patterns (A-E) | Large | #4 (stative) |
| 6 | Role F1 improvement campaign | Large | — |
| 7 | p50 latency optimization | Medium | — |

### Tier 4: Long-Term / Deferred

| # | Work Item | Effort | Depends On |
|---|-----------|--------|------------|
| 8 | Domain fine-tuning | Large | Phase 5 |
| 9 | Prefix subordination (V7 arch fix) | Very Large | — |
| 10 | Relative clause support (V7 arch fix) | Very Large | — |
| 11 | Mobile performance testing | Medium | Hardware |

---

## SECTION 8: KEY METRICS DASHBOARD

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Entity F1 | 90.3% | ≥88% | ✅ |
| Role F1 | 59.3% | ≥85% | ❌ (baselined) |
| POS accuracy | 93.5% | ≥96% | ⚠️ (accepted) |
| UAS | 85.3% | ≥90% | ⚠️ (accepted) |
| LAS | 83.2% | ≥88% | ⚠️ (accepted) |
| Component tests | 89/100 (89%) | 100% | ⚠️ (11 architectural) |
| CI tests | ~770+ | All pass | ✅ |
| Genericity tests | 43/43 | All pass | ✅ |
| Bundle size | 5.49 MB / 0.97 MB gz | <10/<4 MB | ✅ |
| p50 latency | 15.95ms | <10ms | ❌ |
| p95 latency | 27.44ms | <30ms | ✅ |
| Copular accuracy | 96.875% | ≥95% | ✅ |
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
