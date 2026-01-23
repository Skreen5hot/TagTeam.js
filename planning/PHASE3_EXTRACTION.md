# Phase 3: Incremental Extraction

**Created:** 2026-01-23
**Status:** Complete

---

## Summary

Phase 3 implemented the code changes necessary to separate tagteam-core from tagteam-iee-values:

1. **Refactored SemanticGraphBuilder** to make AssertionEventBuilder optional
2. **Created packages/iee-values/** directory structure with new classes
3. **Verified core-only mode** works without value assertions

---

## Changes Made

### 1. SemanticGraphBuilder (src/graph/SemanticGraphBuilder.js)

**Key Changes:**
- AssertionEventBuilder is now loaded via try/catch (optional dependency)
- Constructor accepts `options.assertionBuilder` for external injection
- Value/context assertion creation only runs if builder is available
- Added `hasValueAssertions` to metadata
- Updated version to 5.0.0

```javascript
// OPTIONAL: AssertionEventBuilder - only load if available
let AssertionEventBuilder = null;
try {
  AssertionEventBuilder = require('./AssertionEventBuilder');
} catch (e) {
  // AssertionEventBuilder not available - core-only mode
}

// In constructor:
if (options.assertionBuilder) {
  // External assertion builder injected (from tagteam-iee-values)
  this.assertionEventBuilder = options.assertionBuilder;
} else if (AssertionEventBuilder) {
  // Built-in AssertionEventBuilder available (backwards compatibility)
  this.assertionEventBuilder = new AssertionEventBuilder({ graphBuilder: this });
} else {
  // No assertion builder - core-only mode
  this.assertionEventBuilder = null;
}

// In build():
if (this.assertionEventBuilder && buildOptions.scoredValues) {
  // Create value assertions only if builder and data available
}
```

### 2. New Package Structure

```
packages/
└── iee-values/
    ├── package.json
    ├── data/
    │   ├── index.js
    │   ├── conflict-pairs.json
    │   ├── frame-value-boosts.json
    │   └── value-definitions-comprehensive.json
    ├── src/
    │   ├── index.js
    │   ├── IEEGraphBuilder.js       # NEW - convenience wrapper
    │   ├── ValueAnalyzer.js         # NEW - standalone analyzer
    │   ├── analyzers/
    │   │   ├── index.js
    │   │   ├── ContextAnalyzer.js   # Copied from src/analyzers/
    │   │   ├── ValueMatcher.js      # Copied from src/analyzers/
    │   │   ├── ValueScorer.js       # Copied from src/analyzers/
    │   │   └── EthicalProfiler.js   # Copied from src/analyzers/
    │   └── graph/
    │       └── AssertionEventBuilder.js  # Copied from src/graph/
    └── tests/
        └── test-iee-graph-builder.js
```

### 3. New Classes

#### IEEGraphBuilder
- Pre-configured builder that combines SemanticGraphBuilder with value detection
- Injects AssertionEventBuilder into core builder
- Provides one-step API for IEE users

```javascript
const { IEEGraphBuilder } = require('tagteam-iee-values');
const builder = new IEEGraphBuilder();
const graph = builder.build(text, { context: 'MedicalEthics' });
```

#### ValueAnalyzer
- Standalone value/context analyzer
- Can analyze text directly OR enrich existing graphs
- Uses default value definitions from bundled data

```javascript
const { ValueAnalyzer } = require('tagteam-iee-values');
const analyzer = new ValueAnalyzer();

// Standalone text analysis
const analysis = analyzer.analyzeText(text);

// Enrich existing graph from tagteam-core
const enrichedGraph = analyzer.analyze(coreGraph, options);
```

### 4. Analyzer Updates

Updated import paths in copied analyzers to use tagteam-core:

```javascript
// ContextAnalyzer.js, ValueMatcher.js
let PatternMatcher;
try {
  PatternMatcher = require('tagteam-core').PatternMatcher;
} catch (e) {
  // Fallback for development/monorepo
  PatternMatcher = require('../../../../src/core/PatternMatcher');
}
```

---

## Test Results

All tests pass:

```
Test 1: IEEGraphBuilder.build()
  - Graph nodes: 25
  - Has value assertions: true
  - Value count: 2
  PASS

Test 2: ValueAnalyzer.analyzeText()
  - Scored values: 1
  - Conflicts: 0
  - Has profile: true
  PASS

Test 3: ValueAnalyzer.analyze() - graph enrichment
  - Core graph nodes: 11
  - Enriched graph nodes: 19
  - Nodes added: 8
  PASS

Test 4: Core builder without values (core-only mode)
  - Graph nodes: 10
  - Has value assertions: false
  - Value assertion nodes: 0
  PASS
```

---

## Backwards Compatibility

The changes maintain full backwards compatibility:

1. **Existing code** that imports SemanticGraphBuilder and uses value options continues to work
2. **AssertionEventBuilder** is still bundled in the original location for legacy builds
3. **Core-only usage** works by simply not providing `scoredValues` in options

---

## Files Changed

| File | Change |
|------|--------|
| `src/graph/SemanticGraphBuilder.js` | Made AssertionEventBuilder optional |
| `packages/iee-values/package.json` | New package manifest |
| `packages/iee-values/src/index.js` | Main exports |
| `packages/iee-values/src/IEEGraphBuilder.js` | New class |
| `packages/iee-values/src/ValueAnalyzer.js` | New class |
| `packages/iee-values/src/analyzers/*.js` | Copied with updated imports |
| `packages/iee-values/src/graph/AssertionEventBuilder.js` | Copied |
| `packages/iee-values/data/*.json` | Copied IEE data files |

---

## Next: Phase 4

Update the build system to:
1. Create separate `dist/tagteam-core.js` (without value modules)
2. Create separate `dist/tagteam-iee-values.js` (values only)
3. Maintain combined bundle for backwards compatibility
