# TagTeam.js Comprehensive Test Infrastructure Plan

**Version**: 1.0
**Date**: 2026-01-22
**Status**: Implementation Ready

---

## Executive Summary

This document outlines the infrastructure plan to implement the comprehensive test suite defined in `tagTeam_Comprehensive_test_Plan_v1.2.md`. The plan prioritizes tests based on current feature availability and establishes a growth-oriented framework.

---

## 1. Current Test Infrastructure Assessment

### 1.1 What We Have

| Component | Status | Coverage |
|-----------|--------|----------|
| **Test Framework** | Custom minimal | Works but not scalable |
| **Unit Tests** | 16 files | Entity, Act, Role, SHACL, Graph |
| **Integration Tests** | 14 files | Corpus validation, Phase verification |
| **Browser Tests** | 4 HTML files | Bundle, context, trust |
| **Test Data** | Centralized JSON | 20-scenario corpus |
| **Validation** | SHMLValidator | 8 SHACL patterns |

### 1.2 Gaps Identified

| Gap | Impact | Priority |
|-----|--------|----------|
| No async test support in helper | Blocks temporal/causal tests | HIGH |
| No test grouping/filtering | Hard to run subsets | MEDIUM |
| No coverage tracking | Can't measure progress | HIGH |
| No fixture management | Test isolation issues | MEDIUM |
| No performance benchmarks | Can't track regressions | LOW |
| Single-file test pattern | Doesn't scale to 200+ tests | HIGH |

---

## 2. Proposed Test Framework Architecture

### 2.1 Directory Structure

```
tests/
├── framework/                    # Test infrastructure (NEW)
│   ├── test-runner.js           # Main test runner with filtering
│   ├── test-helpers.js          # Shared assertion helpers
│   ├── fixtures.js              # Fixture management
│   ├── coverage-tracker.js      # Track test coverage
│   └── reporters/               # Output formatters
│       ├── console.js
│       └── json.js
│
├── linguistic/                   # Tier 1 tests (NEW structure)
│   ├── clause-types/
│   │   ├── declarative.test.js
│   │   ├── interrogative.test.js
│   │   ├── imperative.test.js
│   │   └── conditional.test.js
│   │
│   ├── referents/
│   │   ├── definiteness/
│   │   ├── reference-types/
│   │   └── coreference/
│   │
│   ├── verbphrase/
│   │   ├── tense-aspect/
│   │   ├── modality/
│   │   └── polarity-negation/
│   │
│   └── temporal-causal/          # Future Phase 5+
│       ├── temporal-ordering/
│       └── causal-structure/
│
├── ontology/                     # Tier 2 tests (NEW structure)
│   ├── bfo-mapping/
│   │   ├── continuants/
│   │   └── occurrents/
│   │
│   ├── cco-mapping/
│   │   ├── agents/
│   │   ├── artifacts/
│   │   └── acts-and-events/
│   │
│   ├── actuality/
│   │   ├── actual.test.js
│   │   ├── prescribed.test.js
│   │   └── prohibited.test.js
│   │
│   └── reversibility/            # Future Phase 5+
│
├── domains/                      # Domain-agnostic scenarios (NEW)
│   ├── healthcare/
│   ├── legal-regulatory/
│   ├── business-operations/
│   └── everyday-informal/
│
├── output/                       # Output validation (NEW)
│   ├── jsonld/
│   ├── shacl/
│   └── git-minimal/
│
├── robustness/                   # Error handling (NEW)
│   ├── malformed-input/
│   ├── graceful-degradation/
│   └── complexity-budget/
│
├── performance/                  # Benchmarks (NEW)
│   ├── throughput/
│   └── scaling/
│
├── unit/                         # EXISTING - keep as is
├── integration/                  # EXISTING - keep as is
├── browser/                      # EXISTING - keep as is
├── iee/                          # EXISTING - keep as is
├── validators/                   # EXISTING - keep as is
└── comprehensive/                # EXISTING - plans and docs
```

### 2.2 Test Runner Design

```javascript
// tests/framework/test-runner.js

/**
 * TagTeam Test Runner
 *
 * Features:
 * - Async/await support
 * - Test filtering by path/tag
 * - Coverage tracking
 * - Multiple reporters
 * - Graceful failure handling
 */

class TestRunner {
  constructor(options = {}) {
    this.options = {
      filter: options.filter || null,      // Filter by path pattern
      tags: options.tags || [],            // Filter by tags
      reporter: options.reporter || 'console',
      timeout: options.timeout || 5000,
      bail: options.bail || false,         // Stop on first failure
      ...options
    };

    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
      tests: []
    };
  }

  async run(testFiles) { /* ... */ }
}
```

---

## 3. Test Coverage Matrix

### 3.1 Feature-to-Test Mapping

This matrix maps comprehensive test plan sections to current TagTeam capabilities.

#### TIER: NOW (Features exist, tests should pass)

| Test Category | Plan Section | Current Feature | Priority |
|---------------|--------------|-----------------|----------|
| Declarative clauses | 1.1 clause-types | EntityExtractor | P0 |
| Definite/Indefinite NPs | 1.2 referents | definiteness detection | P0 |
| Agent/Patient extraction | 1.2 referents | EntityExtractor | P0 |
| Verb-to-CCO mapping | 1.3 verbphrase | ActExtractor | P0 |
| Deontic obligation | 1.3 modality | "must" detection | P0 |
| Deontic permission | 1.3 modality | "may" detection | P0 |
| Sentential negation | 1.3 polarity | negation handling | P0 |
| BFO continuants | 2.1 bfo-mapping | RealWorldEntityFactory | P0 |
| CCO Person/Agent | 2.2 cco-mapping | denotesType mapping | P0 |
| Actual status | 2.3 actuality | actualityStatus | P0 |
| Prescribed status | 2.3 actuality | obligation modality | P0 |
| JSON-LD structure | 4.1 jsonld | JSONLDSerializer | P0 |
| SHACL compliance | 4.2 shacl | SHMLValidator | P0 |
| Role pattern | 4.2 shacl | RoleDetector | P0 |
| Domain/range | 4.2 shacl | CCO Expert rules | P0 |

#### TIER: SOON (Features partially exist, may need fixes)

| Test Category | Plan Section | Current Feature | Priority |
|---------------|--------------|-----------------|----------|
| Passive voice | 1.1 voice-and-valency | Compromise parsing | P1 |
| Pronouns | 1.2 reference-types | Basic extraction | P1 |
| Quantified NPs | 1.2 reference-types | "two patients" | P1 |
| Simple past tense | 1.3 tense-aspect | tense detection | P1 |
| Present perfect | 1.3 tense-aspect | "has completed" | P1 |
| CCO Artifacts | 2.2 cco-mapping | Artifact detection | P1 |
| CCO Organizations | 2.2 cco-mapping | "hospital" | P1 |
| Prohibited status | 2.3 actuality | "must not" | P1 |
| Hypothetical status | 2.3 actuality | "if...would" | P1 |
| Empty/whitespace input | 5 robustness | Graceful handling | P1 |
| Sentence fragments | 5 robustness | Partial parse | P1 |

#### TIER: LATER (Features not yet implemented)

| Test Category | Plan Section | Blocker | Priority |
|---------------|--------------|---------|----------|
| Interrogative clauses | 1.1 clause-types | Not implemented | P2 |
| Imperative clauses | 1.1 clause-types | Not implemented | P2 |
| Coreference resolution | 1.2 coreference | Phase 5+ | P2 |
| Cross-sentence chains | 1.2 coreference | Phase 5+ | P2 |
| Propositional attitudes | 1.3 attitudes | Phase 5+ | P3 |
| Temporal ordering | 1.4 temporal | Phase 5+ | P3 |
| Causal structure | 1.4 causal | Phase 5+ | P3 |
| Semantic reversibility | 2.4 reversibility | Phase 5+ | P3 |
| Quantity normalization | 2.2 quantities | Phase 5+ | P3 |
| Timeline reconstruction | 1.4 temporal | Phase 5+ | P3 |

### 3.2 Coverage Estimates

| Tier | Plan Sections | Estimated Tests | Can Pass Now |
|------|---------------|-----------------|--------------|
| NOW | ~40% of plan | ~80 tests | 90%+ |
| SOON | ~25% of plan | ~50 tests | 60-80% |
| LATER | ~35% of plan | ~70 tests | 0-20% |

---

## 4. Implementation Phases

### Phase 1: Framework Foundation (This PR)

**Goal**: Establish scalable test infrastructure

1. Create `tests/framework/` directory
2. Implement `test-runner.js` with async support
3. Implement `test-helpers.js` with rich assertions
4. Create `fixtures.js` for test data management
5. Add npm scripts for running test subsets

**Deliverables**:
- [ ] `tests/framework/test-runner.js`
- [ ] `tests/framework/test-helpers.js`
- [ ] `tests/framework/fixtures.js`
- [ ] Updated `package.json` scripts
- [ ] Directory structure skeleton

### Phase 2: P0 Tests (Immediate follow-up)

**Goal**: Full coverage of NOW tier

1. Migrate existing unit tests to new structure
2. Add missing P0 tests per coverage matrix
3. Verify all P0 tests pass

**Deliverables**:
- [ ] `tests/linguistic/clause-types/declarative.test.js`
- [ ] `tests/linguistic/referents/definiteness/*.test.js`
- [ ] `tests/ontology/bfo-mapping/continuants/*.test.js`
- [ ] `tests/output/shacl/*.test.js`

### Phase 3: P1 Tests (Week 2)

**Goal**: Partial coverage of SOON tier

1. Add P1 tests with `skip` markers where features incomplete
2. Document feature gaps discovered
3. Track pass/fail trends

### Phase 4: Domain Tests (Week 3)

**Goal**: Domain-agnostic scenario coverage

1. Port IEE corpus tests to new structure
2. Add healthcare, legal, business scenarios
3. Verify domain independence (<15% per domain)

### Phase 5: P2/P3 Tests (Ongoing)

**Goal**: Future feature coverage

1. Add tests as stubs (`.skip`)
2. Remove `.skip` as features land
3. Track progress toward comprehensive plan

---

## 5. Test Helper API

### 5.1 Core Helpers

```javascript
// tests/framework/test-helpers.js

const { expect, assert } = require('./assertions');
const { createFixture, loadCorpus } = require('./fixtures');

/**
 * Test suite grouping
 */
function describe(name, fn) {
  console.log(`\n=== ${name} ===\n`);
  fn();
}

/**
 * Individual test with async support
 */
async function test(name, fn, options = {}) {
  const { skip, timeout = 5000, tags = [] } = options;

  if (skip) {
    console.log(`○ ${name} (skipped)`);
    return { status: 'skipped', name };
  }

  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
    console.log(`✓ ${name}`);
    return { status: 'passed', name };
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  ${error.message}`);
    return { status: 'failed', name, error };
  }
}

/**
 * Skip test (placeholder for future)
 */
test.skip = (name, fn) => test(name, fn, { skip: true });

/**
 * Focus on single test (for debugging)
 */
test.only = (name, fn) => test(name, fn, { only: true });
```

### 5.2 Semantic Assertions

```javascript
// Specialized assertions for TagTeam output

const semanticAssertions = {
  /**
   * Assert node has expected BFO/CCO type
   */
  toHaveType(node, expectedType) {
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    if (!types.includes(expectedType)) {
      throw new Error(`Expected type ${expectedType}, got ${types.join(', ')}`);
    }
  },

  /**
   * Assert graph contains node matching predicate
   */
  toContainNode(graph, predicate) {
    const nodes = graph['@graph'] || graph.nodes || [];
    const found = nodes.find(predicate);
    if (!found) {
      throw new Error('No matching node found in graph');
    }
    return found;
  },

  /**
   * Assert relation exists between nodes
   */
  toHaveRelation(graph, subjectId, predicate, objectId) {
    const subject = graph['@graph'].find(n => n['@id'] === subjectId);
    if (!subject) throw new Error(`Subject ${subjectId} not found`);

    const value = subject[predicate];
    const targetId = value?.['@id'] || value;

    if (targetId !== objectId) {
      throw new Error(`Expected ${predicate} to be ${objectId}, got ${targetId}`);
    }
  },

  /**
   * Assert SHACL validation passes
   */
  toPassSHACLValidation(graph, options = {}) {
    const SHMLValidator = require('../../src/graph/SHMLValidator');
    const validator = new SHMLValidator(options);
    const result = validator.validate(graph);

    if (!result.valid) {
      const violations = result.violations.map(v => v.message).join('\n');
      throw new Error(`SHACL validation failed:\n${violations}`);
    }
  }
};
```

---

## 6. NPM Scripts

```json
{
  "scripts": {
    "test": "node tests/framework/test-runner.js",
    "test:unit": "node tests/framework/test-runner.js --filter unit/",
    "test:linguistic": "node tests/framework/test-runner.js --filter linguistic/",
    "test:ontology": "node tests/framework/test-runner.js --filter ontology/",
    "test:output": "node tests/framework/test-runner.js --filter output/",
    "test:robustness": "node tests/framework/test-runner.js --filter robustness/",
    "test:p0": "node tests/framework/test-runner.js --tags p0",
    "test:p1": "node tests/framework/test-runner.js --tags p1",
    "test:coverage": "node tests/framework/coverage-tracker.js",
    "test:watch": "node tests/framework/test-runner.js --watch"
  }
}
```

---

## 7. Migration Strategy

### 7.1 Preserve Existing Tests

All existing tests in `tests/unit/` and `tests/integration/` remain functional. New framework is additive.

### 7.2 Gradual Migration

1. New tests use new framework
2. Old tests migrated opportunistically
3. Both systems coexist during transition

### 7.3 Test Naming Convention

```
{category}.{subcategory}.test.js

Examples:
- declarative.clause.test.js
- definite-np.referent.test.js
- person.cco-mapping.test.js
```

---

## 8. Success Metrics

| Metric | Target | Tracking |
|--------|--------|----------|
| P0 test pass rate | 95%+ | CI/coverage |
| P1 test pass rate | 70%+ | CI/coverage |
| Test execution time | <30s total | CI metrics |
| Coverage of plan sections | 60%+ (NOW+SOON) | coverage-tracker |
| Regression rate | 0 new failures | CI comparison |

---

## 9. Next Steps

1. **Approve this plan** - Review and confirm approach
2. **Create framework skeleton** - `tests/framework/` directory
3. **Implement test runner** - Async, filtering, reporters
4. **Port P0 tests** - Start with existing unit tests
5. **Add missing P0 tests** - Per coverage matrix
6. **Document progress** - Update README with coverage

---

## Appendix A: Test Tags Reference

| Tag | Description | Example |
|-----|-------------|---------|
| `p0` | Must pass now (core features) | Entity extraction |
| `p1` | Should pass (partial features) | Passive voice |
| `p2` | Future feature | Coreference |
| `p3` | Research feature | Temporal logic |
| `regression` | Bug fix verification | v2.3 fixes |
| `slow` | Performance benchmark | Large corpus |
| `browser` | Browser-only test | DOM dependent |
| `skip` | Temporarily disabled | Known failure |

---

## Appendix B: Feature-Test Dependency Graph

```
EntityExtractor
├── tests/linguistic/referents/definiteness/*
├── tests/linguistic/referents/reference-types/*
└── tests/ontology/cco-mapping/agents/*

ActExtractor
├── tests/linguistic/verbphrase/tense-aspect/*
├── tests/linguistic/verbphrase/modality/*
└── tests/ontology/cco-mapping/acts-and-events/*

RoleDetector
├── tests/ontology/bfo-mapping/continuants/role.test.js
└── tests/output/shacl/role-shape.test.js

SHMLValidator
├── tests/output/shacl/*
└── tests/output/git-minimal/*

SemanticGraphBuilder
├── tests/output/jsonld/*
└── tests/integration/* (full pipeline)
```
