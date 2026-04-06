# TagTeam.js — Production Readiness Checklist

**Version:** 7.0.0
**Date:** April 6, 2026
**Author:** Aaron, Technical Lead / Semantic Architect
**Status:** Merged to MAIN — paused pending Fandaws Phase F-0
**Branch:** `main` at commit `8a44253`
**Previous:** v5.0.0 at `ec08a7d`
**Classification:** INTERNAL — Development Team Distribution Only

---

## Executive Summary

TagTeam v7.0.0 is a deterministic, client-side semantic parser producing BFO/CCO-compliant JSON-LD knowledge graphs. Since the v5.0 checklist, the project has completed:

- **Sentence Boundary Architecture (SBA) v1.3**: Multi-sentence parsing with 4 segmentation rules, parenthetical extraction, and 143/144 test coverage
- **Realist Deontic Modeling**: Modal verbs produce Directive → PlanSpecification → Obligation chains (not ghost IntentionalActs)
- **Four normative role specs**: TT-SPEC-RDM-A/B/C and TT-SPEC-ENT-A/B driving Role F1 from 57.8% to 83.0%
- **Ontology-driven graph assembly**: Domain TTL files provide entity types and graph assembly templates via `requiresPatient`/`requiresRecipient`
- **Constitution pipeline**: Article I Section 2 parsing with domain ontology, validating the architecture end-to-end
- **Fandaws integration spec v2.0**: Split request (Entity Dictionary + Process Hierarchy + Selectional Restrictions), role-to-property mapping with CCO 2.0 opaque IRIs
- **Developer Guide**: 8-part guide for new developers
- **README rewrite**: Accurate v7.0 project description

**Current metrics (2026-04-06):**

| Metric | Value |
|--------|-------|
| Entity F1 | 93.1% (target >= 88%) |
| Role F1 | 83.0% (target >= 85%) |
| CI suites | 21, 0 failures |
| SBA | 143/144 (99.3%) |
| CCO complex | 106/106 (100%) |
| ISA multi-sentence | 70/70 (100%) |
| SHACL shapes | 21/21 (100%) |
| Bundle size | ~12 MB raw, ~2.3 MB gzip |
| Runtime dependencies | 0 |

---

## TIER 1 — MERGE GATE

*All items verified at `8a44253` (2026-04-06).*

### 1.1 IRI Integrity Verification

- [ ] **FT-06: JSON-LD round-trip test.** Not yet automated. Verified manually — all expanded IRIs resolve to published BFO 2020 / CCO 2.0 entries. *(Deferred to Fandaws integration phase.)*

- [x] **FT-07: Grep verification suite.** Full Appendix A grep suite run at `8a44253`. All hits are in comments only — zero phantom IRIs in executable code. *(Verified 2026-04-06.)*

- [x] **@context freeze policy.** Established and enforced. Latest addition: `occurs_in` → `bfo:BFO_0000066` with source citation. *(Active since v2.2 audit.)*

### 1.2 Build Artifact Integrity

- [x] **Demo bundle sync.** `demos/tagteam.js` matches `dist/tagteam.js` by checksum. *(Verified 2026-04-06.)*

- [x] **Single-file architecture.** `areModelsLoaded()` returns `true` immediately. Bundle includes all POS/dep models. *(Verified 2026-04-06.)*

- [x] **Gold baseline evaluation.** Entity F1 93.1%, Role F1 83.0%. No regressions from any spec implementation. *(Verified 2026-04-06.)*

### 1.3 Test Suite

- [x] **CI tests: 21 suites, 0 failures.** Includes SBA, SHACL, component, linguistic, ontology, bundle, adversarial, and schema tests. *(Verified 2026-04-06.)*

- [x] **SBA corpus: 143/144 (99.3%).** 1 known failure (SBA-019-C5 entity span precision). *(Verified 2026-04-06.)*

- [x] **CCO complex corpus: 106/106 (100%).** *(Verified 2026-04-06.)*

- [x] **ISA multi-sentence corpus: 70/70 (100%).** *(Verified 2026-04-06.)*

- [x] **SHACL shape validation: 21/21 (100%).** *(Verified 2026-04-06.)*

---

## TIER 2 — RELEASE GATE

*Complete before any external demonstration or deployment.*

### 2.1 Performance and Bundle Size

- [x] **Bundle size.** ~12 MB raw / ~2.3 MB gzip. Within 15 MB / 4 MB gates. *(Verified 2026-04-06.)*

- [ ] **Brotli compression analysis.** Target: under 2 MB Brotli for CDN delivery.

- [ ] **Automated parse-time benchmark.** CI step measuring `buildGraph()` on a 20-word sentence. Fail if >60ms.

### 2.2 Security and Input Handling

- [ ] **ReDoS audit.** Audit regex-heavy modules for nested quantifiers.

- [ ] **Input size cap.** Hard character limit on `buildGraph()` (recommended: 10,000 characters).

- [ ] **Input normalization.** Sanitize null bytes and control characters before NLP pipeline.

### 2.3 Robustness

- [ ] **Non-English input fallback.** Return empty graph with diagnostic, not TypeError.

- [ ] **Circular dependency audit.** Verify no circular imports in `src/graph` modules.

### 2.4 Ontology Version Management

- [ ] **Version pinning with source hashes.** Declare exact BFO 2020 and CCO 2.0 versions in build metadata.

- [x] **`tagteam.ttl` creation.** `ontology/tagteam.ttl` v4.1.0 — 106 entities with full axioms. *(Completed `3d8b245`.)*

- [ ] **`measures` alias documentation.** Clarify that `measures` maps to CCO "is a measurement of" (`ont00001966`).

### 2.5 Integration Contract

- [x] **Fandaws integration spec v2.0.** Split request architecture aligned with Fandaws team. Role-to-property mapping using CCO 2.0 opaque IRIs. Awaiting Phase F-0 TTL deliverables. *(Completed 2026-04-06, see `docs/integration/fandaws-hiri-integration-requirements.md`.)*

- [ ] **Fandaws contract test.** Automated test verifying `classNominationStatus`, `requiresOntologyResolution` on nominated nodes. *(Deferred to Phase F-3.)*

- [ ] **Dual emission (Role nodes + CCO direct edges).** IntentionalAct nodes need `has_agent`, `has_participant`, `has_recipient`, `occurs_in` edges alongside Role nodes. *(Deferred to Phase F-2, blocked on Fandaws F-0.)*

---

## TIER 3 — HARDENING

*Schedule after Fandaws integration. Do not block merge or external use.*

### 3.1 Build and Distribution

- [ ] **Tree shaking / ESM build.**
- [ ] **CJS/ESM/UMD output.**
- [ ] **Source maps.**

### 3.2 Runtime Performance

- [ ] **Memory profiling.** InterpretationLattice GC verification.
- [ ] **Lexicon caching.** IndexedDB for POS lexicon across page loads.

### 3.3 Test Coverage

- [ ] **Component test coverage target: 70%.** Current: 89/100 (89%) — 11 failures are architectural ceiling (prefix subordination, relative clauses, embedded clauses).

### 3.4 @context Architecture

- [ ] **@context modularity.** Split 272 entries into base + extension contexts.
- [ ] **Dual-alias documentation.** `continuant_part_of` and `is_part_of` both map to `bfo:BFO_0000176`.

### 3.5 Documentation

- [x] **Developer Guide.** 8-part guide at `docs/guides/DEVELOPER_GUIDE.md`. *(Completed 2026-04-06.)*
- [x] **README.** Accurate v7.0 project description. *(Completed 2026-04-06.)*
- [ ] **Full API reference.** JSDoc/TypeDoc for all public methods.

### 3.6 Known Matching Gaps

- [ ] **Multi-word phrase lemmatization.** "hand guns" does not match label "Hand Gun". *(Documented in PLANNED_WORK.md §5.3b.)*
- [ ] **No synonym/hypernym expansion.** "gun" does not match "Firearm". *(By design — defer to Fandaws.)*

---

## Appendix A: Grep Verification Suite

Run all commands below against `src/`. Every command must return zero matches in executable code.

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

### Fabricated Role Properties

```bash
grep -rn "tagteam:bearer\|tagteam:realizedIn" src/
```

### Single-File Architecture Verification

```bash
ls dist/
# Expected: standalone-demo.html  tagteam.js  test.html  (plus iri-match-tests.html, demo HTML files)

node -e "const T = require('./dist/tagteam.js'); console.log(T.areModelsLoaded())"
# Expected: true
```

---

## Appendix B: Key Documents

| Document | Path |
|----------|------|
| Developer Guide | `docs/guides/DEVELOPER_GUIDE.md` |
| Planned Work (single source of truth) | `docs/development/PLANNED_WORK.md` |
| Fandaws Integration Spec v2.0 | `docs/integration/fandaws-hiri-integration-requirements.md` |
| SBA Spec v1.3 | `docs/tagteam-sentence-boundary-spec-v1.3.md` |
| SBA SHACL Shapes | `docs/development/tagteam-sba-shacl-v1.3.ttl` |
| TagTeam Ontology | `ontology/tagteam.ttl` v4.1.0 |
| README | `README.md` |

---

**Next milestone:** Fandaws Phase F-0 TTL deliverables (Entity Dictionary + Process Hierarchy + Selectional Restrictions). TagTeam resumes at Phase F-1 (compiler: TTL → bloom filter + core vocabulary).
