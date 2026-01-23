# Phase 1: Module Inventory & Categorization

**Created:** 2026-01-23
**Status:** Complete

---

## Source Files Inventory

### src/core/ (5 files)

| File | Size | Package | Dependencies | Notes |
|------|------|---------|--------------|-------|
| `lexicon.js` | 4.11 MB | CORE | None | POS lexicon data |
| `POSTagger.js` | 3.89 KB | CORE | lexicon.js | Part-of-speech tagging |
| `PatternMatcher.js` | 16.36 KB | CORE | None | General-purpose pattern matching |
| `MatchingStrategies.js` | 2.66 KB | CORE | None | Matching strategy utilities |
| `SemanticRoleExtractor.js` | 36.42 KB | CORE | None | Semantic role extraction |

### src/analyzers/ (4 files)

| File | Size | Package | Dependencies | Notes |
|------|------|---------|--------------|-------|
| `ContextAnalyzer.js` | 16.89 KB | VALUES | PatternMatcher (core) | 12 context dimensions |
| `ValueMatcher.js` | 7.02 KB | VALUES | PatternMatcher (core) | Value pattern matching |
| `ValueScorer.js` | 9.33 KB | VALUES | None | Confidence scoring |
| `EthicalProfiler.js` | 14.41 KB | VALUES | None | Profile generation |

### src/graph/ (16 files)

| File | Size | Package | Dependencies | Notes |
|------|------|---------|--------------|-------|
| `SemanticGraphBuilder.js` | 20.45 KB | CORE* | AssertionEventBuilder | Main orchestrator |
| `EntityExtractor.js` | 33.63 KB | CORE | RealWorldEntityFactory | Tier 1/2 entities |
| `ActExtractor.js` | 26.43 KB | CORE | None | IntentionalAct nodes |
| `RoleDetector.js` | 12.17 KB | CORE | None | BFO roles |
| `DirectiveExtractor.js` | 5.55 KB | CORE | None | Deontic directives |
| `ScarcityAssertionFactory.js` | 5.04 KB | CORE | None | Scarcity ICE nodes |
| `ObjectAggregateFactory.js` | 6.60 KB | CORE | None | BFO aggregates |
| `QualityFactory.js` | 5.17 KB | CORE | None | BFO qualities |
| `RealWorldEntityFactory.js` | 11.11 KB | CORE | None | Tier 2 entities |
| `InformationStaircaseBuilder.js` | 4.21 KB | CORE | None | IBE/parser agent |
| `ContextManager.js` | 5.27 KB | CORE | None | Interpretation contexts |
| `JSONLDSerializer.js` | 10.47 KB | CORE | None | JSON-LD output |
| `SHMLValidator.js` | 37.30 KB | CORE | None | SHACL validation |
| `ComplexityBudget.js` | 12.02 KB | CORE | None | Graph limits |
| `DomainConfigLoader.js` | 9.60 KB | CORE | None | Domain configs |
| `AssertionEventBuilder.js` | 12.21 KB | VALUES | crypto | Value/Context assertions |

**\*Note:** SemanticGraphBuilder imports AssertionEventBuilder. This dependency needs to be made optional.

### src/ontology/ (1 file)

| File | Package | Notes |
|------|---------|-------|
| `TTLParser.js` | CORE | Turtle parser |

### src/validation/ (1 file)

| File | Package | Notes |
|------|---------|-------|
| `shaclValidator.js` | CORE | SHACL validation |

---

## Data Files Inventory

### IEE-Specific Data (to extract)

| File | Size | Package | Notes |
|------|------|---------|-------|
| `value-definitions-comprehensive.json` | 47.00 KB | VALUES | 50 IEE value definitions |
| `frame-value-boosts.json` | 13.62 KB | VALUES | Frame-value associations |
| `conflict-pairs.json` | 12.73 KB | VALUES | Value conflict pairs |
| `compound-terms.json` | ? | VALUES | Compound ethical terms |
| `context-patterns.json` | ? | VALUES | Context detection patterns |
| `value-definitions-core.json` | ? | VALUES | Core value subset |

### Core Data (to keep)

| File | Package | Notes |
|------|---------|-------|
| `config/medical.json` | CORE | Medical domain config |

---

## Test Files Inventory

### Core Tests (to keep)

```
tests/
├── framework/
│   ├── test-helpers.js
│   └── test-runner.js
├── linguistic/
│   ├── clause-types/declarative.test.js
│   ├── referents/definiteness/definite-np.test.js
│   └── verbphrase/modality/deontic-obligation.test.js
├── ontology/
│   ├── actuality/prescribed.test.js
│   └── cco-mapping/agents/person.test.js
├── output/
│   └── shacl/domain-range.test.js
├── unit/
│   ├── test-act-extraction.js
│   ├── test-complexity-budget.js
│   ├── test-domain-config.js
│   ├── test-domain-neutral-phase1.js
│   ├── test-entity-extraction.js
│   ├── test-information-staircase.js
│   ├── test-role-detection.js
│   ├── test-selectional-restrictions.js
│   ├── test-semantic-graph-builder.js
│   ├── test-shacl-validation.js
│   ├── test-v23-fixes.js
│   ├── test-v24-fixes.js
│   ├── ttl-parser.test.js
│   └── pattern-matching.test.js
├── integration/
│   ├── test-phase4-corpus.js
│   ├── verify-phase1-*.js
│   └── ttl-parser-integration.test.js
└── validators/
    ├── tagteam-validator.js
    └── tagteam-validator-browser.js
```

### Values Tests (to extract)

```
tests/
├── unit/
│   ├── test-assertion-events.js       # ValueAssertionEvent tests
│   └── test-git-integration.js        # GIT-Minimal (values related)
├── integration/
│   ├── iee-polarity-fix.test.js       # IEE-specific
│   ├── test-week2b.js                 # Values integration
│   └── test-full-corpus.js            # May have value tests
└── iee-collaboration/                 # All IEE test corpus
```

---

## Dependency Graph

```
                    ┌─────────────────────────────────────┐
                    │           VALUES PACKAGE            │
                    │                                     │
                    │  ┌─────────────┐  ┌─────────────┐  │
                    │  │ValueMatcher │  │ContextAnalyzer│ │
                    │  └──────┬──────┘  └──────┬──────┘  │
                    │         │                │         │
                    │         └───────┬────────┘         │
                    │                 │                  │
                    │         ┌───────▼────────┐         │
                    │         │ PatternMatcher │         │
                    │         └───────┬────────┘         │
                    │                 │ (import from     │
                    │                 │  core)           │
                    │  ┌─────────────┐│ ┌─────────────┐  │
                    │  │ValueScorer  ││ │EthicalProfiler││
                    │  └─────────────┘│ └─────────────┘  │
                    │                 │                  │
                    │  ┌──────────────▼───────────────┐  │
                    │  │    AssertionEventBuilder     │  │
                    │  └──────────────────────────────┘  │
                    └─────────────────┬───────────────────┘
                                      │
                                      │ (optional import)
                                      │
┌─────────────────────────────────────▼────────────────────────────────────┐
│                            CORE PACKAGE                                   │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    SemanticGraphBuilder                            │  │
│  │  (needs refactor: AssertionEventBuilder import becomes optional)   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│           │              │              │              │                 │
│           ▼              ▼              ▼              ▼                 │
│  ┌──────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐        │
│  │EntityExtractor│ │ActExtractor│ │RoleDetector│ │DirectiveExt. │        │
│  └──────────────┘ └────────────┘ └────────────┘ └──────────────┘        │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │RealWorldEntity   │  │ObjectAggregate   │  │QualityFactory    │       │
│  │Factory           │  │Factory           │  │                  │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Utilities: PatternMatcher, MatchingStrategies, SemanticRoleExt.  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Infra: JSONLDSerializer, SHMLValidator, DomainConfigLoader, etc. │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Key Refactoring Required

### 1. SemanticGraphBuilder (Critical)

Current code imports AssertionEventBuilder unconditionally:
```javascript
const AssertionEventBuilder = require('./AssertionEventBuilder');
```

And uses it in `build()`:
```javascript
if (buildOptions.extractValues !== false && buildOptions.scoredValues) {
  const valueResult = this.assertionEventBuilder.createValueAssertions(...);
  // ...
}
```

**Required Change:** Make AssertionEventBuilder optional:
- Don't require it at top
- Check if values package is loaded
- Skip value assertion creation if not available

### 2. Build Script (scripts/build.js)

Currently bundles all modules together. Need two build modes:
- Core build: excludes analyzers/, AssertionEventBuilder, IEE data
- Full build: current behavior (deprecated, for migration)

---

## Size Analysis

### Current Bundle: 4.85 MB

| Component | Size | Package |
|-----------|------|---------|
| lexicon.js | 4.11 MB | CORE |
| Compromise NLP | 342.86 KB | CORE |
| Graph modules | ~200 KB | CORE |
| Core utilities | ~60 KB | CORE |
| **Core Total** | **~4.7 MB** | |
| | | |
| Analyzers | ~48 KB | VALUES |
| AssertionEventBuilder | 12 KB | VALUES |
| IEE Data JSONs | ~73 KB | VALUES |
| **Values Total** | **~133 KB** | |

### Projected Sizes

- **tagteam-core**: ~4.7 MB (lexicon dominates)
- **tagteam-iee-values**: ~133 KB + tagteam-core peer dependency

---

## Summary: Module Assignment

### CORE (tagteam-core) - 22 files

**src/core/** (5 files)
- lexicon.js
- POSTagger.js
- PatternMatcher.js
- MatchingStrategies.js
- SemanticRoleExtractor.js

**src/graph/** (15 files)
- SemanticGraphBuilder.js (needs refactor)
- EntityExtractor.js
- ActExtractor.js
- RoleDetector.js
- DirectiveExtractor.js
- ScarcityAssertionFactory.js
- ObjectAggregateFactory.js
- QualityFactory.js
- RealWorldEntityFactory.js
- InformationStaircaseBuilder.js
- ContextManager.js
- JSONLDSerializer.js
- SHMLValidator.js
- ComplexityBudget.js
- DomainConfigLoader.js

**src/ontology/** (1 file)
- TTLParser.js

**src/validation/** (1 file)
- shaclValidator.js

### VALUES (tagteam-iee-values) - 5 files + data

**src/analyzers/** (4 files)
- ContextAnalyzer.js
- ValueMatcher.js
- ValueScorer.js
- EthicalProfiler.js

**src/graph/** (1 file)
- AssertionEventBuilder.js

**data/** (6 files)
- value-definitions-comprehensive.json
- frame-value-boosts.json
- conflict-pairs.json
- compound-terms.json
- context-patterns.json
- value-definitions-core.json

---

## Next: Phase 2

Define the public API interfaces for both packages.
