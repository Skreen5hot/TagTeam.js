# Package Separation Complete

**Date:** 2026-01-23
**Status:** Complete

---

## Summary

TagTeam.js has been successfully separated into two packages:

1. **tagteam-core** - Domain-neutral semantic parsing
2. **tagteam-iee-values** - IEE ethical value detection (optional add-on)

This separation allows IEE to use the values package independently while keeping the core semantic parsing engine clean and reusable for other applications.

---

## Implementation Phases

### Phase 1: Inventory & Categorization
- Identified all modules and their dependencies
- Categorized into core vs values-specific

### Phase 2: Interface Definition
- Defined package boundaries
- Designed extension point pattern for optional value detection

### Phase 3: Incremental Extraction
- Made `AssertionEventBuilder` optional in `SemanticGraphBuilder`
- Created `packages/iee-values/` directory structure
- Implemented `IEEGraphBuilder` wrapper
- Implemented `ValueAnalyzer` for standalone use
- Fixed all dependency issues

### Phase 4: Build System Update
- Created `scripts/build-separated.js`
- Generates three bundles:
  - `dist/tagteam-core.js` (4.71 MB)
  - `dist/tagteam-values.js` (138 KB)
  - `dist/tagteam.js` (4.84 MB - combined, backwards compatible)
- All bundle tests pass

### Phase 5: Documentation
- Created `packages/iee-values/README.md`
- Updated `dist/README.md` with new bundle options
- Created this summary document

---

## Architecture

### Extension Point Pattern

The core `SemanticGraphBuilder` now supports optional assertion builders:

```javascript
// In SemanticGraphBuilder.js
let AssertionEventBuilder = null;
try {
  AssertionEventBuilder = require('./AssertionEventBuilder');
} catch (e) {
  // Core-only mode
}

// In constructor
if (options.assertionBuilder) {
  this.assertionEventBuilder = options.assertionBuilder;  // External
} else if (AssertionEventBuilder) {
  this.assertionEventBuilder = new AssertionEventBuilder();  // Built-in
} else {
  this.assertionEventBuilder = null;  // Core-only
}
```

### Package Structure

```
packages/
└── iee-values/
    ├── package.json
    ├── README.md
    ├── src/
    │   ├── index.js
    │   ├── IEEGraphBuilder.js
    │   ├── ValueAnalyzer.js
    │   ├── analyzers/
    │   │   ├── index.js
    │   │   ├── ContextAnalyzer.js
    │   │   ├── ValueMatcher.js
    │   │   ├── ValueScorer.js
    │   │   └── EthicalProfiler.js
    │   └── graph/
    │       └── AssertionEventBuilder.js
    ├── data/
    │   ├── index.js
    │   ├── value-definitions-comprehensive.json
    │   ├── frame-value-boosts.json
    │   └── conflict-pairs.json
    └── tests/
        └── test-iee-graph-builder.js
```

---

## Usage Patterns

### Browser: Core Only
```html
<script src="tagteam-core.js"></script>
<script>
  const graph = TagTeam.buildGraph("text");
</script>
```

### Browser: Core + Values
```html
<script src="tagteam-core.js"></script>
<script src="tagteam-values.js"></script>
<script>
  const builder = new TagTeamValues.IEEGraphBuilder();
  const graph = builder.build("text", { context: "MedicalEthics" });
</script>
```

### Node.js: Core Only
```javascript
const TagTeam = require('tagteam-core');
const graph = TagTeam.buildGraph("text");
```

### Node.js: Core + Values
```javascript
const { SemanticGraphBuilder } = require('tagteam-core');
const { ValueAnalyzer } = require('tagteam-iee-values');

const coreBuilder = new SemanticGraphBuilder();
const graph = coreBuilder.build("text");

const analyzer = new ValueAnalyzer();
const enriched = analyzer.analyze(graph, { context: "MedicalEthics" });
```

---

## Key Files Modified

| File | Changes |
|------|---------|
| `src/graph/SemanticGraphBuilder.js` | Made AssertionEventBuilder optional |
| `scripts/build-separated.js` | New build script for separated bundles |
| `scripts/test-bundles.js` | New test script for bundle verification |
| `packages/iee-values/*` | New package structure |
| `dist/README.md` | Updated documentation |

---

## Test Results

All tests pass:

1. **Core bundle** - Works without values, no value assertions generated
2. **Values bundle** - Works with core, generates value assertions
3. **Combined bundle** - Full functionality, backwards compatible
4. **IEE values package tests** - 4/4 pass

---

## Benefits

1. **Smaller Core Bundle** - 4.71 MB vs 4.84 MB (130 KB savings)
2. **Modular Architecture** - Use only what you need
3. **Independent Versioning** - Values package can evolve independently
4. **Cleaner Separation** - Domain-specific code isolated from core
5. **Backwards Compatible** - Combined bundle still available

---

## Next Steps (Optional)

1. Publish `tagteam-core` to npm
2. Publish `tagteam-iee-values` to npm
3. Create separate GitHub repository for values package
4. Add TypeScript type definitions
5. Minify bundles for production
