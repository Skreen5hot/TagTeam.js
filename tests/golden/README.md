# TagTeam Golden Test Corpus

**Version:** 2.0
**Schema Version:** 2.0
**Created:** 2026-02-09
**Status:** Active Development

---

## 📖 Overview

The **Golden Test Corpus** is a curated, versioned collection of reference test cases that define expected behavior for TagTeam's semantic parsing capabilities. Unlike unit tests (which test individual functions), golden tests validate **end-to-end parsing accuracy** against real-world scenarios.

### Purpose

1. **Regression Prevention** - Ensure new features don't break existing parsing
2. **Accuracy Benchmarking** - Track parsing accuracy improvements over time
3. **IEE Validation** - Verify compliance with IEE team requirements
4. **Documentation** - Serve as executable examples of expected behavior
5. **Version Stability** - Lock down v1 behavior before v2 architecture changes

---

## 📊 Current Status

| Metric | Value |
|--------|-------|
| **Total Corpuses** | 20 (1 complete, 19 planned) |
| **Total Test Cases** | 586 (20 complete, 566 planned) |
| **Completion** | 3.4% |
| **P0 Test Cases** | 396 |
| **Last Updated** | 2026-02-09 |

### By Category

| Category | Corpuses | Test Cases | Status |
|----------|----------|------------|--------|
| Phase-specific | 5 | 170 | ⏳ In Progress |
| Feature-specific | 5 | 110 | 📋 Planned |
| v1-acceptance | 3 | 90 | 📋 Planned |
| IEE-integration | 3 | 116 | 📋 Planned |
| Regression | 3 | 60 | 📋 Planned |
| Edge-cases | 1 | 40 | 📋 Planned |

---

## 🗂️ Corpus Structure

```
tests/golden/
├── README.md                          # This file
├── CONTRIBUTING.md                    # How to add test cases
├── SCHEMA.md                          # Test case schema documentation
├── corpus-index.json                  # Master index of all corpuses
│
├── schemas/                           # JSON schemas
│   └── test-case-schema-v2.json      # v2.0 test case schema
│
├── phase-specific/                    # Organized by roadmap phase
│   ├── selectional-corpus.json        # ✅ Phase 6.0 - Complete (20 cases)
│   ├── interpretation-lattice.json    # 📋 Phase 6.1-6.4 - Planned (50 cases)
│   ├── ontology-loading.json          # 📋 Phase 6.5 - Planned (30 cases)
│   ├── epistemic-markers.json         # 📋 Phase 7.1-7.2 - Planned (40 cases)
│   └── validation-layer.json          # 📋 Phase 9 - Planned (30 cases)
│
├── feature-specific/                  # Organized by linguistic feature
│   ├── definiteness-corpus.json       # 📋 Definite/indefinite NPs (20 cases)
│   ├── modality-corpus.json           # 📋 Deontic/epistemic modals (30 cases)
│   ├── voice-corpus.json              # 📋 Active/passive/middle (25 cases)
│   ├── negation-corpus.json           # 📋 Scope and polarity (20 cases)
│   └── temporal-corpus.json           # 📋 Tense/aspect (15 cases)
│
├── v1-acceptance/                     # v1 scope contract validation
│   ├── v1-core-features.json          # 📋 All v1 IN SCOPE features (40 cases)
│   ├── v1-deferred-features.json      # 📋 All v1 EXPLICITLY DEFERRED (30 cases)
│   └── v1-edge-cases.json             # 📋 Boundary conditions (20 cases)
│
├── iee-integration/                   # IEE team validation
│   ├── ethical-values.json            # 📋 Week 2b value detection (50 cases)
│   ├── context-intensity.json         # 📋 Week 2a dimensions (36 cases)
│   └── semantic-roles.json            # 📋 Week 1 agent/patient (30 cases)
│
├── regression/                        # Historical regression tests
│   ├── phase4-regressions.json        # 📋 Phase 4 known issues (20 cases)
│   ├── phase5-regressions.json        # 📋 Phase 5 known issues (20 cases)
│   └── phase6-regressions.json        # 📋 Phase 6 known issues (20 cases)
│
├── domain-specific/                   # Domain-specific tests
│   └── edge-cases.json                # 📋 Comprehensive edge cases (40 cases)
│
└── results/                           # Test results and reports
    ├── latest-report.html             # HTML dashboard
    ├── accuracy-history.csv           # Historical tracking
    └── latest-results.json            # Latest run results
```

---

## 🚀 Quick Start

### Running Golden Tests

```bash
# Run all golden tests
npm run test:golden

# Run specific corpus
npm run test:golden -- --corpus=selectional-corpus

# Run by priority
npm run test:golden -- --priority=P0

# Run by category
npm run test:golden -- --category=phase-specific

# Generate HTML report
npm run test:golden -- --report
```

### Adding a New Test Case

1. Choose the appropriate corpus file (see [CONTRIBUTING.md](CONTRIBUTING.md))
2. Follow the [test case schema v2.0](schemas/test-case-schema-v2.json)
3. Add your test case to the `cases` array
4. Validate schema: `npm run validate:golden`
5. Run tests: `npm run test:golden`
6. Update `corpus-index.json` with new test count

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed instructions.

---

## 📐 Test Case Schema (v2.0)

### Minimal Example

```json
{
  "id": "lattice-001",
  "category": "deontic-epistemic-ambiguity",
  "input": "The doctor should prioritize the younger patient",
  "expectedOutput": {
    "defaultReading": {
      "modality": "obligation",
      "actualityStatus": "tagteam:Prescribed"
    },
    "alternativeReadings": [
      {
        "modality": "expectation",
        "actualityStatus": "tagteam:Hypothetical",
        "plausibility": 0.3
      }
    ],
    "ambiguityType": "modal_force",
    "ambiguityPreserved": true
  },
  "tags": ["modal", "deontic", "epistemic", "medical"],
  "priority": "P0"
}
```

### Full Schema

See [SCHEMA.md](SCHEMA.md) for complete schema documentation and examples.

---

## 📈 Success Criteria

### Target Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Overall Accuracy | 95%+ | N/A | ❌ Not measured |
| P0 Pass Rate | 100% | N/A | ❌ Not measured |
| P1 Pass Rate | 95%+ | N/A | ❌ Not measured |
| P2 Pass Rate | 80%+ | N/A | ❌ Not measured |
| v1 Core Features | 100% | N/A | ❌ Not measured |
| IEE Value Detection | 75%+ | N/A | ❌ Not measured |

### Must-Have for v1 Release

- ✅ Interpretation lattice corpus (50 cases) passes at 95%+
- ✅ v1 core features corpus (40 cases) passes at 100%
- ✅ IEE value detection corpus (50 cases) passes at 75%+
- ✅ Automated test runner integrated into CI/CD
- ✅ No regressions in existing selectional-corpus.json

---

## 🔍 Corpus Index

For a complete list of all corpuses, see [corpus-index.json](corpus-index.json).

### By Priority

| Priority | Corpuses | Test Cases | Description |
|----------|----------|------------|-------------|
| **P0** | 12 | 396 | Critical - blocking v1 release |
| **P1** | 7 | 150 | High - should have for v1 |
| **P2** | 1 | 40 | Medium - nice to have |

### By Phase

| Phase | Corpuses | Test Cases | Status |
|-------|----------|------------|--------|
| Phase 6 | 4 | 150 | ⏳ In Progress |
| Phase 7 | 1 | 40 | 📋 Planned |
| v1 | 8 | 235 | 📋 Planned |
| IEE | 3 | 116 | 📋 Planned |
| Regression | 3 | 60 | 📋 Planned |

---

## 🛠️ Test Runner

The golden test runner (`run-golden-tests.js`) provides:

- ✅ **Schema Validation** - Validates test cases against v2.0 schema
- ✅ **Result Comparison** - Compares expected vs actual output
- ✅ **Diff Reporting** - Human-readable differences
- ✅ **Metrics Tracking** - Accuracy, pass rate, coverage
- ✅ **Filtering** - By corpus, priority, category, tags
- ✅ **HTML Reports** - Visual dashboard with charts
- ✅ **CI/CD Integration** - GitHub Actions support
- ✅ **Regression Detection** - Compares with previous run

### Usage Examples

```bash
# Basic run
npm run test:golden

# Verbose output
npm run test:golden -- --verbose

# Watch mode (re-run on file changes)
npm run test:golden -- --watch

# Update snapshots (careful!)
npm run test:golden -- --update-snapshots

# Dry run (validate without executing)
npm run test:golden -- --dry-run
```

---

## 📚 Documentation

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to add test cases
- **[SCHEMA.md](SCHEMA.md)** - Test case schema documentation
- **[corpus-index.json](corpus-index.json)** - Master corpus index
- **[GOLDEN_TEST_CORPUS_PLAN.md](../../planning/GOLDEN_TEST_CORPUS_PLAN.md)** - Implementation plan
- **[ROADMAP.md](../../ROADMAP.md)** - Project roadmap

---

## 🔗 Related Resources

- **IEE Collaboration**: [iee-collaboration/](../../iee-collaboration/)
- **Unit Tests**: [tests/unit/](../unit/)
- **Integration Tests**: [tests/integration/](../integration/)
- **Deliverables**: [deliverables/](../../deliverables/)

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-02-09 | Initial golden test corpus infrastructure |
| 1.0 | 2026-01-26 | Selectional corpus (Phase 6.0) |

---

## 🤝 Contributing

We welcome contributions to the golden test corpus! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- How to choose the right corpus file
- Test case authoring guidelines
- Schema validation requirements
- Pull request process
- Code review checklist

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/anthropics/claude-code/issues)
- **Documentation**: [docs/](../../docs/)
- **IEE Team**: See [iee-collaboration/](../../iee-collaboration/)

---

*Golden Test Corpus - TagTeam.js v3.0*
*Built with ❤️ by the TagTeam Core Team*
