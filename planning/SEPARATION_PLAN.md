# TagTeam Package Separation Plan

**Version:** 1.1.0
**Created:** 2026-01-22
**Updated:** 2026-01-22
**Status:** Planning - Awaiting Approval

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| NPM Scope | `tagteam-core` / `tagteam-iee-values` | No scope - simpler, no npm org required |
| General-purpose modules | Keep in core | SemanticRoleExtractor, PatternMatcher stay in core |
| Ontology split | Defer | Split tagteam.ttl later to reduce initial work |
| Browser bundles | Separate files | IEE loads both; others load core only |

---

## Overview

Separate TagTeam into two packages:
- **tagteam-core**: Domain-neutral semantic parsing engine
- **tagteam-iee-values**: IEE ethical value detection (separate repo)

## Repository Strategy

**Chosen Approach:** Separate Repositories

```
TagTeam.js/              → Becomes tagteam-core (npm: tagteam-core)
TagTeam-IEE-Values/      → New repo (npm: tagteam-iee-values)
```

### Rationale
- Clean ownership boundaries (IEE team can own values repo)
- Independent versioning and release cycles
- Simpler CI/CD per repo
- Clear dependency: values → core (never reverse)
- Existing repo becomes core with minimal migration

---

## Phase 1: Inventory & Categorization

**Goal:** Identify what belongs in each package

### Core Package (tagteam-core)

**Modules to Keep:**
```
src/
├── core/
│   ├── POSTagger.js
│   ├── lexicon.js
│   ├── Compromise.js (bundled NLP)
│   ├── PatternMatcher.js           # General-purpose, stays in core
│   ├── MatchingStrategies.js       # General-purpose, stays in core
│   └── SemanticRoleExtractor.js    # General-purpose, stays in core
├── graph/
│   ├── SemanticGraphBuilder.js
│   ├── EntityExtractor.js
│   ├── ActExtractor.js
│   ├── RoleDetector.js
│   ├── DirectiveExtractor.js
│   ├── ScarcityAssertionFactory.js
│   ├── ObjectAggregateFactory.js
│   ├── QualityFactory.js
│   ├── RealWorldEntityFactory.js
│   ├── InformationStaircaseBuilder.js
│   ├── ContextManager.js           # Keep (interpretation contexts are generic)
│   ├── JSONLDSerializer.js
│   ├── SHMLValidator.js
│   ├── ComplexityBudget.js
│   └── DomainConfigLoader.js
├── types/
│   └── index.d.ts                  # TypeScript definitions
config/
└── medical.json                    # Domain configs stay with core

ontology/
└── tagteam.ttl                     # Full ontology (split deferred)
```

**Tests to Keep:**
```
tests/
├── linguistic/                     # All linguistic tests
├── ontology/                       # BFO/CCO mapping tests
├── graph/                          # Graph construction tests
└── integration/
    └── test-phase4-corpus.js       # Core corpus tests
```

### Values Package (tagteam-iee-values)

**Modules to Extract:**
```
src/
├── analyzers/
│   ├── ContextAnalyzer.js          # 12 context dimensions
│   ├── ValueMatcher.js             # Pattern matching for values
│   ├── ValueScorer.js              # Confidence scoring
│   └── EthicalProfiler.js          # Profile generation
├── graph/
│   └── AssertionEventBuilder.js    # ValueAssertionEvent, ContextAssessmentEvent

data/
├── value-definitions-comprehensive.json
├── frame-value-boosts.json
└── conflict-pairs.json

iee-collaboration/                  # All IEE-specific docs and tests
```

**Note:** PatternMatcher, MatchingStrategies, and SemanticRoleExtractor stay in core as general-purpose utilities. Values package will import them from core.

**Tests to Extract:**
```
tests/
├── values/                         # Value detection tests
├── context/                        # Context analysis tests
└── integration/
    └── iee-*.js                    # IEE-specific integration tests
```

---

## Phase 2: Define Package Interfaces

### tagteam-core API

```javascript
// Main exports
export { SemanticGraphBuilder } from './graph/SemanticGraphBuilder';
export { JSONLDSerializer } from './graph/JSONLDSerializer';
export { SHMLValidator } from './graph/SHMLValidator';
export { DomainConfigLoader } from './graph/DomainConfigLoader';

// Entity/Act extraction (for extension)
export { EntityExtractor } from './graph/EntityExtractor';
export { ActExtractor } from './graph/ActExtractor';
export { RoleDetector } from './graph/RoleDetector';

// Factories (for extension)
export { RealWorldEntityFactory } from './graph/RealWorldEntityFactory';
export { QualityFactory } from './graph/QualityFactory';
export { ObjectAggregateFactory } from './graph/ObjectAggregateFactory';

// Low-level (advanced users)
export { POSTagger } from './core/POSTagger';

// Types
export * from './types';
```

### tagteam-iee-values API

```javascript
import { SemanticGraphBuilder } from '@tagteam/core';

// Main exports
export { ValueAnalyzer } from './ValueAnalyzer';
export { ContextAnalyzer } from './analyzers/ContextAnalyzer';
export { EthicalProfiler } from './analyzers/EthicalProfiler';

// Extension point: custom value definitions
export { ValueMatcher } from './analyzers/ValueMatcher';
export { ValueScorer } from './analyzers/ValueScorer';

// Convenience: pre-configured builder with values
export { IEEGraphBuilder } from './IEEGraphBuilder';
```

### Usage Examples

**Core Only:**
```javascript
import { SemanticGraphBuilder } from '@tagteam/core';

const builder = new SemanticGraphBuilder();
const graph = builder.build("The doctor must allocate the ventilator");
// Returns: JSON-LD with entities, acts, roles, directives
// No value assertions
```

**With IEE Values:**
```javascript
import { SemanticGraphBuilder } from '@tagteam/core';
import { ValueAnalyzer } from '@tagteam/iee-values';

const builder = new SemanticGraphBuilder();
const graph = builder.build("The doctor must allocate the ventilator");

const analyzer = new ValueAnalyzer();
const enrichedGraph = analyzer.analyze(graph, {
  context: 'MedicalEthics',
  includeContextDimensions: true
});
// Returns: JSON-LD with value assertions, context assessments
```

**Convenience API:**
```javascript
import { IEEGraphBuilder } from '@tagteam/iee-values';

const builder = new IEEGraphBuilder();
const graph = builder.build("The doctor must allocate the ventilator", {
  context: 'MedicalEthics'
});
// Returns: Full JSON-LD with everything (current behavior)
```

---

## Phase 3: Incremental Extraction

### Step 3.1: Create Extension Points in Core

Before extracting, ensure core has clean extension points:

1. **Graph Builder Hooks**
   - `onBeforeBuild(text, options)` - preprocessing
   - `onAfterEntities(entities)` - entity post-processing
   - `onAfterActs(acts)` - act post-processing
   - `onBeforeSerialize(graph)` - final enrichment

2. **Remove Value-Specific Code from Core**
   - `buildOptions.scoredValues` - move to values package
   - `buildOptions.contextIntensity` - move to values package
   - AssertionEventBuilder calls - move to values package

### Step 3.2: Extract to Separate Directory First

Before creating new repo, extract within current repo:

```
TagTeam.js/
├── packages/
│   ├── core/                 # Refactored core
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   └── iee-values/           # Extracted values
│       ├── src/
│       ├── tests/
│       └── package.json
└── package.json              # Workspace root (temporary)
```

This allows testing the separation before splitting repos.

### Step 3.3: Verify Tests Pass

```bash
# Core tests (should pass without values)
cd packages/core && npm test

# Values tests (should pass with core as dependency)
cd packages/iee-values && npm test

# Integration tests (both packages together)
npm run test:integration
```

### Step 3.4: Split to Separate Repos

1. Create `TagTeam-IEE-Values` repo
2. Move `packages/iee-values/` to new repo
3. Publish `@tagteam/core` to npm
4. Update new repo to depend on `@tagteam/core`
5. Flatten `packages/core/` back to root of TagTeam.js

---

## Phase 4: Update Build System

### Core Build (tagteam-core)

```javascript
// scripts/build.js changes
- Remove ValueMatcher, ValueScorer, EthicalProfiler
- Remove ContextAnalyzer, SemanticRoleExtractor (if only used by values)
- Remove value-definitions JSON files
- Remove AssertionEventBuilder value-specific code
- Update bundle: ~4.2MB (down from 4.85MB)
```

### Values Build (tagteam-iee-values)

```javascript
// New build script
- Bundle ValueMatcher, ValueScorer, EthicalProfiler
- Bundle ContextAnalyzer, SemanticRoleExtractor
- Bundle value-definitions JSON
- External dependency: @tagteam/core
- Bundle size: ~500KB
```

### Browser Bundles

**Option A: Separate Bundles**
```html
<script src="tagteam-core.js"></script>
<script src="tagteam-iee-values.js"></script>
```

**Option B: Combined Bundle for IEE**
```html
<!-- IEE gets a pre-combined bundle -->
<script src="tagteam-iee.js"></script>
```

---

## Phase 5: Documentation & Migration

### Update Documentation

1. **Core README**: Focus on semantic parsing, remove value examples
2. **Values README**: Installation, dependency on core, IEE-specific usage
3. **Migration Guide**: For existing users who want both packages

### Deprecation Path

```javascript
// In current TagTeam.js, add deprecation warnings
console.warn('TagTeam.parse() with values is deprecated. Use @tagteam/iee-values');
```

### Version Strategy

- `@tagteam/core@5.0.0` - First separated release
- `@tagteam/iee-values@1.0.0` - First release of values package
- `tagteam@4.x` - Legacy combined package (deprecated)

---

## Phase 6: Ontology Considerations

**DEFERRED** - Keep full tagteam.ttl in core for now. Split later if needed.

The ontology currently contains both core terms (DiscourseReferent, ActualityStatus) and value terms (ValueAssertionEvent, EthicalValueICE). Splitting can be done in a future release without breaking changes since both packages will use the same IRI namespace.

---

## Test Strategy

### Core Tests

| Category | Test File | Description |
|----------|-----------|-------------|
| Linguistic | `linguistic/**/*.test.js` | All NLP parsing tests |
| Ontology | `ontology/**/*.test.js` | BFO/CCO mapping tests |
| Graph | `graph/*.test.js` | Graph construction |
| SHACL | `shacl/*.test.js` | Validation tests |
| Integration | `integration/core-*.test.js` | End-to-end without values |

### Values Tests

| Category | Test File | Description |
|----------|-----------|-------------|
| Value Detection | `values/*.test.js` | Value pattern matching |
| Context Analysis | `context/*.test.js` | 12 dimension scoring |
| Profiling | `profiling/*.test.js` | Ethical profile generation |
| Integration | `integration/iee-*.test.js` | Full pipeline with values |
| IEE Corpus | `iee-corpus/*.test.js` | IEE-provided test cases |

### Shared Test Utilities

```javascript
// @tagteam/test-utils (optional third package or just shared)
export { createTestGraph } from './fixtures';
export { assertValidJSONLD } from './assertions';
export { mockPOSTagger } from './mocks';
```

---

## Timeline Estimate

| Phase | Description | Effort |
|-------|-------------|--------|
| **Phase 1** | Inventory & categorization | 2-3 hours |
| **Phase 2** | Define interfaces | 2-3 hours |
| **Phase 3** | Incremental extraction | 1-2 days |
| **Phase 4** | Update build system | 4-6 hours |
| **Phase 5** | Documentation | 2-3 hours |
| **Phase 6** | Ontology split | DEFERRED |
| **Testing** | Verify all tests pass | 1 day |
| **Total** | | ~3 days |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing IEE workflows | Provide migration guide, keep legacy package |
| Circular dependencies | Strict dependency direction: values → core |
| Duplicate code | Identify shared utilities, consider test-utils package |
| Build complexity | Use standard tools (esbuild/rollup for bundling) |
| Version drift | Semantic versioning, peer dependency on core |

---

## Decision Points - RESOLVED

| # | Decision | Resolution |
|---|----------|------------|
| 1 | NPM Scope | `tagteam-core` (no scope) |
| 2 | Browser Bundle Strategy | Separate files |
| 3 | Ontology Split | Deferred |
| 4 | SemanticRoleExtractor | Core (general-purpose) |
| 5 | PatternMatcher | Core (general-purpose) |

---

## Next Steps

1. ✅ Review this plan
2. ✅ Decide on decision points (all resolved)
3. **AWAITING APPROVAL** to proceed
4. Start with Phase 1: detailed inventory
5. Create Phase 3 branch for extraction work
