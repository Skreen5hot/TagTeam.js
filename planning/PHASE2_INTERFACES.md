# Phase 2: Package Interface Definitions

**Created:** 2026-01-23
**Status:** In Progress

---

## Overview

This document defines the public APIs for both packages after separation:
- **tagteam-core**: Domain-neutral semantic parsing engine
- **tagteam-iee-values**: IEE ethical value detection (separate repo)

---

## Package 1: tagteam-core

### package.json

```json
{
  "name": "tagteam-core",
  "version": "5.0.0",
  "description": "Domain-neutral semantic parser with BFO/CCO-compliant JSON-LD output",
  "main": "dist/tagteam-core.js",
  "module": "dist/tagteam-core.esm.js",
  "types": "dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/tagteam-core.esm.js",
      "require": "./dist/tagteam-core.js",
      "types": "./dist/types/index.d.ts"
    },
    "./browser": "./dist/tagteam-core.browser.js"
  },
  "scripts": {
    "build": "node scripts/build.js",
    "build:browser": "node scripts/build-browser.js",
    "test": "node tests/run-tests.js",
    "test:shacl": "node tests/unit/test-shacl-validation.js"
  },
  "dependencies": {
    "compromise": "^14.14.5"
  },
  "keywords": [
    "nlp",
    "semantic-parsing",
    "bfo",
    "cco",
    "json-ld",
    "ontology",
    "knowledge-graph"
  ],
  "author": "Aaron Damiano",
  "license": "MIT"
}
```

### Public API (Node.js)

```javascript
// ============================================================================
// MAIN EXPORTS
// ============================================================================

/**
 * SemanticGraphBuilder - Main entry point for building JSON-LD graphs
 *
 * @example
 * const { SemanticGraphBuilder } = require('tagteam-core');
 * const builder = new SemanticGraphBuilder();
 * const graph = builder.build("The doctor treats the patient");
 */
export { SemanticGraphBuilder } from './graph/SemanticGraphBuilder';

/**
 * JSONLDSerializer - Serialize graphs to JSON-LD string format
 */
export { JSONLDSerializer } from './graph/JSONLDSerializer';

/**
 * SHMLValidator - Validate graphs against SHACL patterns
 */
export { SHMLValidator } from './graph/SHMLValidator';

/**
 * DomainConfigLoader - Load domain-specific type mappings
 */
export { DomainConfigLoader } from './graph/DomainConfigLoader';

// ============================================================================
// EXTRACTORS (for custom pipelines)
// ============================================================================

export { EntityExtractor } from './graph/EntityExtractor';
export { ActExtractor } from './graph/ActExtractor';
export { RoleDetector } from './graph/RoleDetector';
export { DirectiveExtractor } from './graph/DirectiveExtractor';

// ============================================================================
// FACTORIES (for extending node types)
// ============================================================================

export { RealWorldEntityFactory } from './graph/RealWorldEntityFactory';
export { QualityFactory } from './graph/QualityFactory';
export { ObjectAggregateFactory } from './graph/ObjectAggregateFactory';
export { ScarcityAssertionFactory } from './graph/ScarcityAssertionFactory';

// ============================================================================
// INFRASTRUCTURE
// ============================================================================

export { InformationStaircaseBuilder } from './graph/InformationStaircaseBuilder';
export { ContextManager } from './graph/ContextManager';
export { ComplexityBudget } from './graph/ComplexityBudget';

// ============================================================================
// UTILITIES (general-purpose)
// ============================================================================

export { PatternMatcher } from './core/PatternMatcher';
export { MatchingStrategies } from './core/MatchingStrategies';
export { SemanticRoleExtractor } from './core/SemanticRoleExtractor';

// ============================================================================
// LOW-LEVEL (advanced users)
// ============================================================================

export { POSTagger } from './core/POSTagger';
export { TTLParser } from './ontology/TTLParser';
```

### Browser API

```javascript
// Browser global: TagTeam
// All classes available as TagTeam.ClassName

const TagTeam = {
  // Main entry points
  SemanticGraphBuilder,
  JSONLDSerializer,
  SHMLValidator,
  DomainConfigLoader,

  // Extractors
  EntityExtractor,
  ActExtractor,
  RoleDetector,
  DirectiveExtractor,

  // Factories
  RealWorldEntityFactory,
  QualityFactory,
  ObjectAggregateFactory,
  ScarcityAssertionFactory,

  // Infrastructure
  InformationStaircaseBuilder,
  ContextManager,
  ComplexityBudget,

  // Utilities
  PatternMatcher,
  MatchingStrategies,
  SemanticRoleExtractor,

  // Low-level
  POSTagger,

  // Convenience methods
  buildGraph(text, options) { ... },
  toJSONLD(text, options) { ... },

  // Version
  version: '5.0.0'
};
```

### Extension Points

The core package provides hooks for extension packages like tagteam-iee-values:

```javascript
/**
 * SemanticGraphBuilder Extension Points
 *
 * Values package can inject custom processing via these options:
 */
class SemanticGraphBuilder {
  constructor(options = {}) {
    // Extension point: Custom assertion builder
    // If provided, will be called during build to add value/context assertions
    this.assertionBuilder = options.assertionBuilder || null;

    // Extension point: Post-processing hook
    // Called after graph construction with full graph access
    this.postProcessor = options.postProcessor || null;
  }

  build(text, options = {}) {
    // ... existing pipeline ...

    // Extension point: Allow external builders to add assertions
    if (this.assertionBuilder && options.enableValueAssertions !== false) {
      const assertions = this.assertionBuilder.createAssertions(
        this.nodes,
        {
          ibeIRI: ibeNode['@id'],
          parserAgentIRI: parserAgentNode['@id'],
          contextIRI: contextIRI
        }
      );
      this.addNodes(assertions.nodes || []);
    }

    // Extension point: Post-processing
    if (this.postProcessor) {
      this.postProcessor(this.nodes, { text, options });
    }

    return { '@graph': this.nodes, _metadata: {...} };
  }
}
```

---

## Package 2: tagteam-iee-values

### package.json

```json
{
  "name": "tagteam-iee-values",
  "version": "1.0.0",
  "description": "IEE ethical value detection for TagTeam semantic graphs",
  "main": "dist/tagteam-iee-values.js",
  "module": "dist/tagteam-iee-values.esm.js",
  "types": "dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/tagteam-iee-values.esm.js",
      "require": "./dist/tagteam-iee-values.js",
      "types": "./dist/types/index.d.ts"
    },
    "./browser": "./dist/tagteam-iee-values.browser.js"
  },
  "peerDependencies": {
    "tagteam-core": "^5.0.0"
  },
  "keywords": [
    "ethics",
    "values",
    "iee",
    "moral-reasoning",
    "tagteam"
  ],
  "author": "IEE Team",
  "license": "MIT"
}
```

### Public API (Node.js)

```javascript
// ============================================================================
// MAIN EXPORTS
// ============================================================================

/**
 * IEEGraphBuilder - Pre-configured builder with value detection
 *
 * @example
 * const { IEEGraphBuilder } = require('tagteam-iee-values');
 * const builder = new IEEGraphBuilder();
 * const graph = builder.build("The doctor must allocate the ventilator", {
 *   context: 'MedicalEthics'
 * });
 */
export { IEEGraphBuilder } from './IEEGraphBuilder';

/**
 * ValueAnalyzer - Analyze existing graphs for ethical values
 *
 * @example
 * const { ValueAnalyzer } = require('tagteam-iee-values');
 * const { SemanticGraphBuilder } = require('tagteam-core');
 *
 * const coreBuilder = new SemanticGraphBuilder();
 * const graph = coreBuilder.build("The doctor treats the patient");
 *
 * const analyzer = new ValueAnalyzer();
 * const enrichedGraph = analyzer.analyze(graph, { context: 'MedicalEthics' });
 */
export { ValueAnalyzer } from './ValueAnalyzer';

// ============================================================================
// ANALYZERS
// ============================================================================

export { ContextAnalyzer } from './analyzers/ContextAnalyzer';
export { ValueMatcher } from './analyzers/ValueMatcher';
export { ValueScorer } from './analyzers/ValueScorer';
export { EthicalProfiler } from './analyzers/EthicalProfiler';

// ============================================================================
// ASSERTION BUILDER
// ============================================================================

export { AssertionEventBuilder } from './graph/AssertionEventBuilder';

// ============================================================================
// DATA
// ============================================================================

export { VALUE_DEFINITIONS } from './data/value-definitions';
export { FRAME_VALUE_BOOSTS } from './data/frame-value-boosts';
export { CONFLICT_PAIRS } from './data/conflict-pairs';
```

### New Classes to Create

#### IEEGraphBuilder

```javascript
/**
 * IEEGraphBuilder - Convenience class that wraps SemanticGraphBuilder
 * with value detection enabled
 *
 * This is the primary entry point for IEE users who want both
 * semantic parsing and value detection in one step.
 */
const { SemanticGraphBuilder } = require('tagteam-core');
const ValueAnalyzer = require('./ValueAnalyzer');
const AssertionEventBuilder = require('./graph/AssertionEventBuilder');

class IEEGraphBuilder {
  constructor(options = {}) {
    this.options = options;
    this.valueAnalyzer = new ValueAnalyzer(options);
    this.assertionBuilder = new AssertionEventBuilder(options);

    // Create core builder with our assertion builder injected
    this.coreBuilder = new SemanticGraphBuilder({
      ...options,
      assertionBuilder: this.assertionBuilder
    });
  }

  /**
   * Build a complete graph with semantic parsing AND value detection
   *
   * @param {string} text - Input text
   * @param {Object} options - Build options
   * @param {string} options.context - Interpretation context (e.g., 'MedicalEthics')
   * @param {boolean} options.includeContextDimensions - Include 12-dimension analysis
   * @returns {Object} JSON-LD graph with value assertions
   */
  build(text, options = {}) {
    const buildOptions = { ...this.options, ...options };

    // Step 1: Analyze values and context
    const valueAnalysis = this.valueAnalyzer.analyzeText(text, buildOptions);

    // Step 2: Build core graph with value data injected
    const graph = this.coreBuilder.build(text, {
      ...buildOptions,
      scoredValues: valueAnalysis.scoredValues,
      contextIntensity: valueAnalysis.contextIntensity
    });

    return graph;
  }

  /**
   * Load domain configuration
   */
  loadDomainConfig(configPath) {
    return this.coreBuilder.loadDomainConfig(configPath);
  }
}

module.exports = IEEGraphBuilder;
```

#### ValueAnalyzer

```javascript
/**
 * ValueAnalyzer - Analyze text or graphs for ethical values
 *
 * Can be used standalone to analyze text, or to enrich
 * existing graphs built with tagteam-core.
 */
const ContextAnalyzer = require('./analyzers/ContextAnalyzer');
const ValueMatcher = require('./analyzers/ValueMatcher');
const ValueScorer = require('./analyzers/ValueScorer');
const EthicalProfiler = require('./analyzers/EthicalProfiler');

class ValueAnalyzer {
  constructor(options = {}) {
    this.options = options;
    this.contextAnalyzer = new ContextAnalyzer(options.contextPatterns);
    this.valueMatcher = new ValueMatcher(options.valueDefinitions);
    this.valueScorer = new ValueScorer(options);
    this.ethicalProfiler = new EthicalProfiler(options);
  }

  /**
   * Analyze text for values and context dimensions
   *
   * @param {string} text - Input text
   * @param {Object} options - Analysis options
   * @returns {Object} { scoredValues, contextIntensity, conflicts, profile }
   */
  analyzeText(text, options = {}) {
    // POS tagging (uses PatternMatcher from core)
    const taggedWords = this._tagText(text);

    // Context analysis (12 dimensions)
    const contextIntensity = this.contextAnalyzer.analyzeContext(
      text, taggedWords, null, null
    );

    // Value matching
    const matchedValues = this.valueMatcher.matchValues(text, taggedWords);

    // Value scoring
    const scoredValues = this.valueScorer.scoreValues(
      matchedValues,
      contextIntensity,
      options.context
    );

    // Conflict detection
    const conflicts = this.valueScorer.detectConflicts(scoredValues);

    // Ethical profile
    const profile = this.ethicalProfiler.generateProfile(scoredValues, conflicts);

    return {
      scoredValues,
      contextIntensity,
      conflicts,
      profile
    };
  }

  /**
   * Enrich an existing graph with value assertions
   *
   * @param {Object} graph - Graph from tagteam-core
   * @param {Object} options - Analysis options
   * @returns {Object} Enriched graph with value assertions
   */
  analyze(graph, options = {}) {
    // Extract text from IBE node
    const ibeNode = graph['@graph'].find(n =>
      n['@type']?.includes('cco:InformationBearingEntity')
    );
    const text = ibeNode?.['cco:has_text_value'] || '';

    // Analyze text
    const analysis = this.analyzeText(text, options);

    // Create assertion nodes
    const assertionBuilder = new AssertionEventBuilder();
    const valueAssertions = assertionBuilder.createValueAssertions(
      analysis.scoredValues,
      {
        contextIRI: options.contextIRI || 'inst:DefaultContext',
        ibeIRI: ibeNode?.['@id'],
        parserAgentIRI: this._findParserAgent(graph)
      }
    );

    // Return enriched graph
    return {
      '@graph': [
        ...graph['@graph'],
        ...valueAssertions.assertionEvents,
        ...valueAssertions.iceNodes
      ],
      _metadata: {
        ...graph._metadata,
        valueAnalysis: analysis
      }
    };
  }

  _tagText(text) {
    // Use PatternMatcher from core for consistency
    const { PatternMatcher } = require('tagteam-core');
    const matcher = new PatternMatcher();
    return matcher.nlp(text).terms().json();
  }

  _findParserAgent(graph) {
    const agent = graph['@graph'].find(n =>
      n['@type']?.includes('cco:ArtificialAgent')
    );
    return agent?.['@id'];
  }
}

module.exports = ValueAnalyzer;
```

---

## Usage Examples

### Example 1: Core Only (No Values)

```javascript
const { SemanticGraphBuilder } = require('tagteam-core');

const builder = new SemanticGraphBuilder();
const graph = builder.build("The doctor treats the patient");

console.log(graph['@graph'].length); // Entities, acts, roles - no value assertions
```

### Example 2: Core + Values (Two-Step)

```javascript
const { SemanticGraphBuilder } = require('tagteam-core');
const { ValueAnalyzer } = require('tagteam-iee-values');

// Step 1: Build core graph
const coreBuilder = new SemanticGraphBuilder();
const coreGraph = coreBuilder.build("The doctor must allocate the ventilator");

// Step 2: Enrich with values
const analyzer = new ValueAnalyzer();
const enrichedGraph = analyzer.analyze(coreGraph, {
  context: 'MedicalEthics',
  includeContextDimensions: true
});

console.log(enrichedGraph._metadata.valueAnalysis.scoredValues);
```

### Example 3: IEE Convenience API (One-Step)

```javascript
const { IEEGraphBuilder } = require('tagteam-iee-values');

const builder = new IEEGraphBuilder();
const graph = builder.build("The doctor must allocate the last ventilator", {
  context: 'MedicalEthics'
});

// Graph includes everything: entities, acts, roles, value assertions, context assessments
console.log(graph['@graph'].length);
```

### Example 4: Browser Usage

```html
<!-- Load core first -->
<script src="tagteam-core.browser.js"></script>

<!-- Load values (optional) -->
<script src="tagteam-iee-values.browser.js"></script>

<script>
  // Core only
  const coreGraph = TagTeam.buildGraph("The doctor treats the patient");

  // With values (if loaded)
  if (typeof TagTeamValues !== 'undefined') {
    const builder = new TagTeamValues.IEEGraphBuilder();
    const fullGraph = builder.build("The doctor must allocate the ventilator", {
      context: 'MedicalEthics'
    });
  }
</script>
```

---

## Refactoring Requirements

### 1. SemanticGraphBuilder Changes

**Current (problematic):**
```javascript
const AssertionEventBuilder = require('./AssertionEventBuilder');
// ... unconditionally uses AssertionEventBuilder
```

**Refactored (clean separation):**
```javascript
// No require for AssertionEventBuilder
// Extension point allows external injection

class SemanticGraphBuilder {
  constructor(options = {}) {
    // Accept external assertion builder
    this.assertionBuilder = options.assertionBuilder || null;
  }

  build(text, options = {}) {
    // ... core pipeline ...

    // Only create value assertions if builder provided AND data available
    if (this.assertionBuilder && options.scoredValues) {
      const valueResult = this.assertionBuilder.createValueAssertions(
        options.scoredValues,
        { contextIRI, ibeIRI, parserAgentIRI }
      );
      this.addNodes(valueResult.assertionEvents);
      this.addNodes(valueResult.iceNodes);
    }

    // ... rest of pipeline ...
  }
}
```

### 2. Build Script Changes

**Core Build (scripts/build.js):**
- Remove: `contextAnalyzer`, `valueMatcher`, `valueScorer`, `ethicalProfiler`
- Remove: `assertionEventBuilder` (moved to values package)
- Remove: Value definition JSON files
- Keep: All graph modules, `PatternMatcher`, `SemanticRoleExtractor`

**Values Build (new: scripts/build-values.js):**
- Include: `contextAnalyzer`, `valueMatcher`, `valueScorer`, `ethicalProfiler`
- Include: `assertionEventBuilder`
- Include: Value definition JSON files
- External: `tagteam-core` (peer dependency)

---

## Migration Path

### For Existing Users

```javascript
// OLD (deprecated)
const TagTeam = require('tagteam-js');
const result = TagTeam.buildGraph(text, {
  extractValues: true,
  context: 'MedicalEthics'
});

// NEW (recommended)
const { IEEGraphBuilder } = require('tagteam-iee-values');
const builder = new IEEGraphBuilder();
const result = builder.build(text, { context: 'MedicalEthics' });
```

### Deprecation Warnings

The legacy package will emit warnings:

```javascript
// In tagteam-js@4.x (legacy combined package)
if (options.extractValues) {
  console.warn(
    'DEPRECATED: Value extraction in tagteam-js is deprecated. ' +
    'Please migrate to tagteam-iee-values package. ' +
    'See: https://github.com/TagTeam-IEE-Values/migration-guide'
  );
}
```

---

## Test Strategy

### Core Package Tests

| Test Category | Description |
|--------------|-------------|
| `test-entity-extraction.js` | Entity extraction without values |
| `test-act-extraction.js` | Act extraction |
| `test-role-detection.js` | Role detection |
| `test-semantic-graph-builder.js` | Full pipeline (no values) |
| `test-shacl-validation.js` | SHACL compliance |
| `test-domain-config.js` | Domain configuration loading |
| `ttl-parser.test.js` | Turtle parsing |

### Values Package Tests

| Test Category | Description |
|--------------|-------------|
| `test-value-matcher.js` | Value pattern matching |
| `test-value-scorer.js` | Confidence scoring |
| `test-context-analyzer.js` | 12-dimension analysis |
| `test-ethical-profiler.js` | Profile generation |
| `test-assertion-events.js` | Value/context assertions |
| `test-iee-graph-builder.js` | Integration with core |

---

## Next: Phase 3

Implement the incremental extraction:
1. Create extension points in SemanticGraphBuilder
2. Move AssertionEventBuilder to values package
3. Create IEEGraphBuilder and ValueAnalyzer
4. Update build scripts
5. Verify all tests pass
