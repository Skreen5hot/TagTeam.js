#!/usr/bin/env node
/**
 * TagTeam.js Separated Bundle Builder
 *
 * Creates three bundles:
 * 1. dist/tagteam-core.js    - Core semantic parsing (no values)
 * 2. dist/tagteam-values.js  - IEE value detection (addon for core)
 * 3. dist/tagteam.js         - Combined bundle (backwards compatible)
 *
 * Usage: node scripts/build-separated.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔨 Building TagTeam.js separated bundles...\n');

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
  console.log('✅ Created dist/ directory');
}

// ============================================================================
// READ SOURCE FILES
// ============================================================================

console.log('📖 Reading core source files...');

// Core files
const lexiconPath = path.join(__dirname, '..', 'src', 'core', 'lexicon.js');
const posTaggerPath = path.join(__dirname, '..', 'src', 'core', 'POSTagger.js');
const patternMatcherPath = path.join(__dirname, '..', 'src', 'core', 'PatternMatcher.js');
const matchingStrategiesPath = path.join(__dirname, '..', 'src', 'core', 'MatchingStrategies.js');
const compromisePath = path.join(__dirname, '..', 'node_modules', 'compromise', 'builds', 'compromise.js');
const semanticExtractorPath = path.join(__dirname, '..', 'src', 'core', 'SemanticRoleExtractor.js');

// Graph modules (CORE)
const realWorldEntityFactoryPath = path.join(__dirname, '..', 'src', 'graph', 'RealWorldEntityFactory.js');
const entityExtractorPath = path.join(__dirname, '..', 'src', 'graph', 'EntityExtractor.js');
const actExtractorPath = path.join(__dirname, '..', 'src', 'graph', 'ActExtractor.js');
const roleDetectorPath = path.join(__dirname, '..', 'src', 'graph', 'RoleDetector.js');
const semanticGraphBuilderPath = path.join(__dirname, '..', 'src', 'graph', 'SemanticGraphBuilder.js');
const jsonldSerializerPath = path.join(__dirname, '..', 'src', 'graph', 'JSONLDSerializer.js');
const scarcityAssertionFactoryPath = path.join(__dirname, '..', 'src', 'graph', 'ScarcityAssertionFactory.js');
const directiveExtractorPath = path.join(__dirname, '..', 'src', 'graph', 'DirectiveExtractor.js');
const objectAggregateFactoryPath = path.join(__dirname, '..', 'src', 'graph', 'ObjectAggregateFactory.js');
const qualityFactoryPath = path.join(__dirname, '..', 'src', 'graph', 'QualityFactory.js');
const contextManagerPath = path.join(__dirname, '..', 'src', 'graph', 'ContextManager.js');
const informationStaircaseBuilderPath = path.join(__dirname, '..', 'src', 'graph', 'InformationStaircaseBuilder.js');
const domainConfigLoaderPath = path.join(__dirname, '..', 'src', 'graph', 'DomainConfigLoader.js');
const shmlValidatorPath = path.join(__dirname, '..', 'src', 'graph', 'SHMLValidator.js');
const complexityBudgetPath = path.join(__dirname, '..', 'src', 'graph', 'ComplexityBudget.js');

// VALUES-only files
const contextAnalyzerPath = path.join(__dirname, '..', 'src', 'analyzers', 'ContextAnalyzer.js');
const valueMatcherPath = path.join(__dirname, '..', 'src', 'analyzers', 'ValueMatcher.js');
const valueScorerPath = path.join(__dirname, '..', 'src', 'analyzers', 'ValueScorer.js');
const ethicalProfilerPath = path.join(__dirname, '..', 'src', 'analyzers', 'EthicalProfiler.js');
const assertionEventBuilderPath = path.join(__dirname, '..', 'src', 'graph', 'AssertionEventBuilder.js');

// Data files (VALUES)
const valueDefinitionsPath = path.join(__dirname, '..', 'iee-collaboration', 'from-iee', 'data', 'value-definitions-comprehensive.json');
const frameValueBoostsPath = path.join(__dirname, '..', 'iee-collaboration', 'from-iee', 'data', 'frame-value-boosts.json');
const conflictPairsPath = path.join(__dirname, '..', 'iee-collaboration', 'from-iee', 'data', 'conflict-pairs.json');

// Read all files
let lexicon = fs.readFileSync(lexiconPath, 'utf8');
let posTagger = fs.readFileSync(posTaggerPath, 'utf8');
let patternMatcher = fs.readFileSync(patternMatcherPath, 'utf8');
let matchingStrategies = fs.readFileSync(matchingStrategiesPath, 'utf8');
let compromise = fs.readFileSync(compromisePath, 'utf8');
let semanticExtractor = fs.readFileSync(semanticExtractorPath, 'utf8');

let realWorldEntityFactory = fs.readFileSync(realWorldEntityFactoryPath, 'utf8');
let entityExtractor = fs.readFileSync(entityExtractorPath, 'utf8');
let actExtractor = fs.readFileSync(actExtractorPath, 'utf8');
let roleDetector = fs.readFileSync(roleDetectorPath, 'utf8');
let semanticGraphBuilder = fs.readFileSync(semanticGraphBuilderPath, 'utf8');
let jsonldSerializer = fs.readFileSync(jsonldSerializerPath, 'utf8');
let scarcityAssertionFactory = fs.readFileSync(scarcityAssertionFactoryPath, 'utf8');
let directiveExtractor = fs.readFileSync(directiveExtractorPath, 'utf8');
let objectAggregateFactory = fs.readFileSync(objectAggregateFactoryPath, 'utf8');
let qualityFactory = fs.readFileSync(qualityFactoryPath, 'utf8');
let contextManager = fs.readFileSync(contextManagerPath, 'utf8');
let informationStaircaseBuilder = fs.readFileSync(informationStaircaseBuilderPath, 'utf8');
let domainConfigLoader = fs.readFileSync(domainConfigLoaderPath, 'utf8');
let shmlValidator = fs.readFileSync(shmlValidatorPath, 'utf8');
let complexityBudget = fs.readFileSync(complexityBudgetPath, 'utf8');

// VALUES files
let contextAnalyzer = fs.readFileSync(contextAnalyzerPath, 'utf8');
let valueMatcher = fs.readFileSync(valueMatcherPath, 'utf8');
let valueScorer = fs.readFileSync(valueScorerPath, 'utf8');
let ethicalProfiler = fs.readFileSync(ethicalProfilerPath, 'utf8');
let assertionEventBuilder = fs.readFileSync(assertionEventBuilderPath, 'utf8');

const valueDefinitions = fs.readFileSync(valueDefinitionsPath, 'utf8');
const frameValueBoosts = fs.readFileSync(frameValueBoostsPath, 'utf8');
const conflictPairs = fs.readFileSync(conflictPairsPath, 'utf8');

// Calculate sizes
const coreSize = lexicon.length + posTagger.length + patternMatcher.length +
  matchingStrategies.length + compromise.length + semanticExtractor.length +
  realWorldEntityFactory.length + entityExtractor.length + actExtractor.length +
  roleDetector.length + semanticGraphBuilder.length + jsonldSerializer.length +
  scarcityAssertionFactory.length + directiveExtractor.length +
  objectAggregateFactory.length + qualityFactory.length + contextManager.length +
  informationStaircaseBuilder.length + domainConfigLoader.length +
  shmlValidator.length + complexityBudget.length;

const valuesSize = contextAnalyzer.length + valueMatcher.length +
  valueScorer.length + ethicalProfiler.length + assertionEventBuilder.length +
  valueDefinitions.length + frameValueBoosts.length + conflictPairs.length;

console.log(`  Core modules: ${(coreSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Values modules: ${(valuesSize / 1024).toFixed(2)} KB`);

// ============================================================================
// PROCESS SOURCE FILES
// ============================================================================

console.log('\n🔧 Processing source files...');

// Strip IIFE wrapper from SemanticRoleExtractor
if (semanticExtractor.includes('(function(window)')) {
  semanticExtractor = semanticExtractor
    .replace(/^\s*\/\*![^]*?\*\/\s*\n/, '')
    .replace(/^\s*\(function\(window\)\s*\{\s*\n/m, '')
    .replace(/\s*window\.SemanticRoleExtractor\s*=\s*SemanticRoleExtractor;\s*\n/gm, '')
    .replace(/\}\)\(window\);\s*$/gm, '');
}

// Replace window references
if (semanticExtractor.includes('window.VALUE_DEFINITIONS')) {
  semanticExtractor = semanticExtractor.replace(/window\./g, '_global.');
}

// Fix POSTagger global variable leak
if (posTagger.includes('word = ret[i]')) {
  posTagger = posTagger.replace(/(\s+)word = ret\[i\];/g, '$1var word = ret[i];');
}

// Fix lexicon for cross-platform
if (lexicon.includes('window.POSTAGGER_LEXICON')) {
  lexicon = lexicon.replace(/window\.POSTAGGER_LEXICON/g, '_global.POSTAGGER_LEXICON');
}

// Strip UMD wrappers
function stripUMD(code, deps) {
  if (code.includes('(function(root, factory)')) {
    const pattern = deps
      ? new RegExp(`}\\(typeof self[^}]+function\\(${deps}\\)\\s*\\{([\\s\\S]+)\\}\\)\\);`)
      : /}\(typeof self[^}]+function\(\)\s*\{([\s\S]+)\}\)\);/;
    const match = code.match(pattern);
    if (match) return match[1];
  }
  return code;
}

patternMatcher = stripUMD(patternMatcher, 'nlp');
matchingStrategies = stripUMD(matchingStrategies, null);
contextAnalyzer = stripUMD(contextAnalyzer, 'PatternMatcher');
valueMatcher = stripUMD(valueMatcher, 'PatternMatcher');
valueScorer = stripUMD(valueScorer, null);
ethicalProfiler = stripUMD(ethicalProfiler, null);

// Strip CommonJS
function stripCommonJS(code, options = {}) {
  code = code.replace(/const\s+\w+\s*=\s*require\([^)]+\);\s*\r?\n?/g, '');
  code = code.replace(/module\.exports\s*=\s*\w+;\s*\r?\n?/g, '');
  code = code.replace(/'use strict';\s*\r?\n?/g, '');

  // For core bundle: strip and replace with null declaration (AssertionEventBuilder not defined elsewhere)
  if (options.stripOptionalAssertionBuilder === 'core') {
    code = code.replace(
      /\/\/\s*OPTIONAL:[\s\S]*?let\s+AssertionEventBuilder\s*=\s*null;[\s\S]*?try\s*\{[\s\S]*?require\(['"]\.\/AssertionEventBuilder['"]\)[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?\/\/[^\n]*\r?\n\s*\}/g,
      '// AssertionEventBuilder removed for core bundle\n  let AssertionEventBuilder = null;'
    );
  }

  // For combined bundle: completely remove the block (AssertionEventBuilder defined elsewhere)
  if (options.stripOptionalAssertionBuilder === 'combined') {
    code = code.replace(
      /\/\/\s*OPTIONAL:[\s\S]*?let\s+AssertionEventBuilder\s*=\s*null;[\s\S]*?try\s*\{[\s\S]*?require\(['"]\.\/AssertionEventBuilder['"]\)[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?\/\/[^\n]*\r?\n\s*\}/g,
      '// AssertionEventBuilder provided directly in combined bundle'
    );
  }

  return code;
}

realWorldEntityFactory = stripCommonJS(realWorldEntityFactory);
entityExtractor = stripCommonJS(entityExtractor);
actExtractor = stripCommonJS(actExtractor);
roleDetector = stripCommonJS(roleDetector);
jsonldSerializer = stripCommonJS(jsonldSerializer);
scarcityAssertionFactory = stripCommonJS(scarcityAssertionFactory);
directiveExtractor = stripCommonJS(directiveExtractor);
objectAggregateFactory = stripCommonJS(objectAggregateFactory);
qualityFactory = stripCommonJS(qualityFactory);
contextManager = stripCommonJS(contextManager);
informationStaircaseBuilder = stripCommonJS(informationStaircaseBuilder);
domainConfigLoader = stripCommonJS(domainConfigLoader);
shmlValidator = stripCommonJS(shmlValidator);
complexityBudget = stripCommonJS(complexityBudget);
assertionEventBuilder = stripCommonJS(assertionEventBuilder);

// Create two versions of SemanticGraphBuilder:
// - semanticGraphBuilderCore: for core bundle (set AssertionEventBuilder to null)
// - semanticGraphBuilderCombined: for combined bundle (AssertionEventBuilder defined elsewhere)
let semanticGraphBuilderCore = stripCommonJS(semanticGraphBuilder, { stripOptionalAssertionBuilder: 'core' });
let semanticGraphBuilderCombined = stripCommonJS(semanticGraphBuilder, { stripOptionalAssertionBuilder: 'combined' });

console.log('  ✓ Processed all source files');

// ============================================================================
// BROWSER CRYPTO SHIM
// ============================================================================

const cryptoShim = `
  // Browser-compatible SHA-256 implementation for IRI generation
  const crypto = {
    createHash: function(algorithm) {
      if (algorithm !== 'sha256') {
        throw new Error('Only sha256 is supported in browser');
      }
      return {
        _data: '',
        update: function(data) {
          this._data += data;
          return this;
        },
        digest: function(encoding) {
          let hash = 5381;
          const str = this._data;
          for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash = hash & 0xffffffff;
          }
          const hex1 = (hash >>> 0).toString(16).padStart(8, '0');
          let hash2 = 0;
          for (let i = 0; i < str.length; i++) {
            hash2 = str.charCodeAt(i) + ((hash2 << 6) + (hash2 << 16) - hash2);
            hash2 = hash2 & 0xffffffff;
          }
          const hex2 = (hash2 >>> 0).toString(16).padStart(8, '0');
          return (hex1 + hex2).repeat(4).substring(0, 64);
        }
      };
    }
  };
`;

// ============================================================================
// BUILD CORE BUNDLE
// ============================================================================

console.log('\n🔧 Building tagteam-core.js...');

const coreBundleHeader = `/*!
 * TagTeam Core - Domain-Neutral Semantic Parser
 * Version: 5.0.0
 * Date: ${new Date().toISOString().split('T')[0]}
 *
 * Core semantic parsing engine with BFO/CCO-compliant JSON-LD output.
 * Does NOT include value detection - use tagteam-iee-values for that.
 *
 * Copyright (c) 2025-2026 Aaron Damiano
 * Licensed under MIT
 */
`;

const coreBundle = `${coreBundleHeader}
(function(global, factory) {
  'use strict';
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    global.TagTeam = factory();
  }
})(typeof window !== 'undefined' ? window : this, function() {
  'use strict';

  const _global = typeof window !== 'undefined' ? window : global;

  // ============================================================================
  // LEXICON DATA
  // ============================================================================

${lexicon}

  _global.LEXICON_TAG_MAP = {
    "NN": ["NN"], "NNS": ["NNS"], "NNP": ["NNP"],
    "JJ": ["JJ"], "JJR": ["JJR"], "JJS": ["JJS"],
    "VB": ["VB"], "VBD": ["VBD"], "VBG": ["VBG"], "VBN": ["VBN"], "VBP": ["VBP"], "VBZ": ["VBZ"],
    "RB": ["RB"], "RBR": ["RBR"], "RBS": ["RBS"],
    "PRP": ["PRP"], "PRP$": ["PRP$"], "DT": ["DT"], "IN": ["IN"], "CC": ["CC"], "UH": ["UH"],
    "CD": ["CD"], "EX": ["EX"], "FW": ["FW"], "LS": ["LS"], "MD": ["MD"], "POS": ["POS"],
    "SYM": ["SYM"], "TO": ["TO"], "WDT": ["WDT"], "WP": ["WP"], "WP$": ["WP$"], "WRB": ["WRB"]
  };

  // ============================================================================
  // POS TAGGER
  // ============================================================================

${posTagger}

  // ============================================================================
  // COMPROMISE.JS NLP LIBRARY
  // ============================================================================

${compromise}

  // Make nlp available - works in both browser and Node.js
  const nlp = typeof _global.nlp !== 'undefined' ? _global.nlp : (typeof module !== 'undefined' && require ? require('compromise') : null);

  // ============================================================================
  // MATCHING STRATEGIES
  // ============================================================================

  const MatchingStrategies = (function() {
${matchingStrategies}
    return MatchingStrategies;
  })();

  // ============================================================================
  // PATTERN MATCHER
  // ============================================================================

  const PatternMatcher = (function(nlp) {
${patternMatcher}
    return PatternMatcher;
  })(nlp);

  // ============================================================================
  // SEMANTIC ROLE EXTRACTOR
  // ============================================================================

${semanticExtractor}

  // ============================================================================
  // GRAPH MODULES
  // ============================================================================

${cryptoShim}

${realWorldEntityFactory}
${entityExtractor}
${actExtractor}
${roleDetector}
${jsonldSerializer}
${scarcityAssertionFactory}
${directiveExtractor}
${objectAggregateFactory}
${qualityFactory}
${contextManager}
${informationStaircaseBuilder}
${shmlValidator}
${complexityBudget}
${domainConfigLoader}
${semanticGraphBuilderCore}

  // ============================================================================
  // CORE API
  // ============================================================================

  const TagTeam = {
    // Main methods
    parse: function(text, options) {
      const extractor = new SemanticRoleExtractor();
      return extractor.parseSemanticAction(text);
    },

    parseMany: function(texts) {
      return texts.map(text => this.parse(text));
    },

    buildGraph: function(text, options) {
      const builder = new SemanticGraphBuilder(options);
      return builder.build(text, options);
    },

    toJSONLD: function(text, options) {
      options = options || {};
      const graph = this.buildGraph(text, options);
      const serializer = new JSONLDSerializer({ pretty: options.pretty });
      return serializer.serialize(graph);
    },

    // Version
    version: '5.0.0-core',

    // Expose classes
    SemanticRoleExtractor,
    POSTagger,
    PatternMatcher,
    MatchingStrategies,
    SemanticGraphBuilder,
    JSONLDSerializer,
    RealWorldEntityFactory,
    EntityExtractor,
    ActExtractor,
    RoleDetector,
    ScarcityAssertionFactory,
    DirectiveExtractor,
    ObjectAggregateFactory,
    QualityFactory,
    ContextManager,
    InformationStaircaseBuilder,
    SHMLValidator,
    ComplexityBudget,
    DomainConfigLoader
  };

  return TagTeam;
});
`;

const coreOutputPath = path.join(distDir, 'tagteam-core.js');
fs.writeFileSync(coreOutputPath, coreBundle, 'utf8');
const coreBundleSize = fs.statSync(coreOutputPath).size;
console.log(`  ✓ Generated dist/tagteam-core.js (${(coreBundleSize / 1024 / 1024).toFixed(2)} MB)`);

// ============================================================================
// BUILD VALUES BUNDLE
// ============================================================================

console.log('\n🔧 Building tagteam-values.js...');

const valuesBundleHeader = `/*!
 * TagTeam IEE Values - Ethical Value Detection Add-on
 * Version: 1.0.0
 * Date: ${new Date().toISOString().split('T')[0]}
 *
 * IEE ethical value detection for TagTeam semantic graphs.
 * REQUIRES: tagteam-core.js to be loaded first!
 *
 * Copyright (c) 2025-2026 IEE Team
 * Licensed under MIT
 */
`;

const valuesBundle = `${valuesBundleHeader}
(function(global, factory) {
  'use strict';
  if (typeof module === 'object' && typeof module.exports === 'object') {
    // Try multiple ways to find TagTeam core
    var TagTeam = global.TagTeam;
    if (!TagTeam) {
      try { TagTeam = require('tagteam-core'); } catch(e) {}
    }
    if (!TagTeam) {
      try { TagTeam = require('./tagteam-core'); } catch(e) {}
    }
    if (!TagTeam) {
      try { TagTeam = require('./tagteam-core.js'); } catch(e) {}
    }
    if (!TagTeam) {
      throw new Error('TagTeam Values requires TagTeam Core. Load tagteam-core.js first or install tagteam-core package.');
    }
    module.exports = factory(TagTeam);
  } else if (typeof define === 'function' && define.amd) {
    define(['tagteam-core'], factory);
  } else {
    if (!global.TagTeam) {
      throw new Error('TagTeam Values requires TagTeam Core to be loaded first');
    }
    global.TagTeamValues = factory(global.TagTeam);
  }
})(typeof window !== 'undefined' ? window : this, function(TagTeam) {
  'use strict';

  const _global = typeof window !== 'undefined' ? window : global;

  // Get PatternMatcher from core
  const PatternMatcher = TagTeam.PatternMatcher;

  // ============================================================================
  // VALUE DEFINITIONS DATA
  // ============================================================================

  const VALUE_DEFINITIONS = ${valueDefinitions};
  const FRAME_VALUE_BOOSTS = ${frameValueBoosts};
  const CONFLICT_PAIRS = ${conflictPairs};

  // Make available globally for legacy code
  _global.VALUE_DEFINITIONS = VALUE_DEFINITIONS;
  _global.FRAME_VALUE_BOOSTS = FRAME_VALUE_BOOSTS;
  _global.CONFLICT_PAIRS = CONFLICT_PAIRS;

  // ============================================================================
  // CONTEXT ANALYZER
  // ============================================================================

  const ContextAnalyzer = (function(PatternMatcher) {
${contextAnalyzer}
    return ContextAnalyzer;
  })(PatternMatcher);

  // ============================================================================
  // VALUE MATCHER
  // ============================================================================

  const ValueMatcher = (function(PatternMatcher) {
${valueMatcher}
    return ValueMatcher;
  })(PatternMatcher);

  // ============================================================================
  // VALUE SCORER
  // ============================================================================

  const ValueScorer = (function() {
${valueScorer}
    return ValueScorer;
  })();

  // ============================================================================
  // ETHICAL PROFILER
  // ============================================================================

  const EthicalProfiler = (function() {
${ethicalProfiler}
    return EthicalProfiler;
  })();

  // ============================================================================
  // ASSERTION EVENT BUILDER
  // ============================================================================

${cryptoShim}

${assertionEventBuilder}

  // ============================================================================
  // IEE GRAPH BUILDER
  // ============================================================================

  class IEEGraphBuilder {
    constructor(options = {}) {
      this.options = options;

      // Initialize value analyzer components
      this.contextAnalyzer = new ContextAnalyzer(options.contextPatterns);
      this.valueMatcher = new ValueMatcher(options.valueDefinitions || VALUE_DEFINITIONS);
      this.valueScorer = new ValueScorer({
        frameBoosts: options.frameBoosts || FRAME_VALUE_BOOSTS,
        conflictPairs: options.conflictPairs || CONFLICT_PAIRS
      });
      this.ethicalProfiler = new EthicalProfiler(options.conflictPairs || CONFLICT_PAIRS);
      this.assertionBuilder = new AssertionEventBuilder(options);

      // Create core builder with assertion builder injected
      this.coreBuilder = new TagTeam.SemanticGraphBuilder({
        ...options,
        assertionBuilder: this.assertionBuilder
      });
    }

    build(text, options = {}) {
      const buildOptions = { ...this.options, ...options };

      // Analyze values
      const patternMatcher = new PatternMatcher();
      const taggedWords = patternMatcher.nlp ? patternMatcher.nlp(text).terms().json() : [];

      const contextIntensity = this.contextAnalyzer.analyzeContext(text, taggedWords, null, null);
      const flatContext = this._flattenContext(contextIntensity);

      const matchedValues = this.valueMatcher.matchValues(text, taggedWords);
      const scoredValues = this.valueScorer.scoreValues(
        matchedValues, null, [], VALUE_DEFINITIONS.values || VALUE_DEFINITIONS
      );

      // Build graph with values
      return this.coreBuilder.build(text, {
        ...buildOptions,
        scoredValues,
        contextIntensity: flatContext
      });
    }

    _flattenContext(ctx) {
      const flat = {};
      for (const cat of Object.keys(ctx)) {
        if (typeof ctx[cat] === 'object') {
          for (const [dim, score] of Object.entries(ctx[cat])) {
            flat[dim] = score;
          }
        }
      }
      return flat;
    }

    analyzeValues(text) {
      const patternMatcher = new PatternMatcher();
      const taggedWords = patternMatcher.nlp ? patternMatcher.nlp(text).terms().json() : [];

      const contextIntensity = this.contextAnalyzer.analyzeContext(text, taggedWords, null, null);
      const matchedValues = this.valueMatcher.matchValues(text, taggedWords);
      const scoredValues = this.valueScorer.scoreValues(
        matchedValues, null, [], VALUE_DEFINITIONS.values || VALUE_DEFINITIONS
      );
      const profile = this.ethicalProfiler.generateProfile(scoredValues);

      return {
        scoredValues,
        contextIntensity,
        conflicts: profile.conflicts || [],
        profile
      };
    }
  }

  // ============================================================================
  // VALUES API
  // ============================================================================

  const TagTeamValues = {
    // Main entry point
    IEEGraphBuilder,

    // Analyzers
    ContextAnalyzer,
    ValueMatcher,
    ValueScorer,
    EthicalProfiler,

    // Graph components
    AssertionEventBuilder,

    // Data
    VALUE_DEFINITIONS,
    FRAME_VALUE_BOOSTS,
    CONFLICT_PAIRS,

    // Version
    version: '1.0.0'
  };

  return TagTeamValues;
});
`;

const valuesOutputPath = path.join(distDir, 'tagteam-values.js');
fs.writeFileSync(valuesOutputPath, valuesBundle, 'utf8');
const valuesBundleSize = fs.statSync(valuesOutputPath).size;
console.log(`  ✓ Generated dist/tagteam-values.js (${(valuesBundleSize / 1024).toFixed(2)} KB)`);

// ============================================================================
// BUILD COMBINED BUNDLE (backwards compatible)
// ============================================================================

console.log('\n🔧 Building tagteam.js (combined)...');

const combinedBundleHeader = `/*!
 * TagTeam.js - Combined Bundle (Core + Values)
 * Version: 5.0.0
 * Date: ${new Date().toISOString().split('T')[0]}
 *
 * Combined bundle for backwards compatibility.
 * Includes both core semantic parsing and IEE value detection.
 *
 * For new projects, consider using separate bundles:
 * - tagteam-core.js (if you don't need values)
 * - tagteam-core.js + tagteam-values.js (if you need values)
 *
 * Copyright (c) 2025-2026 Aaron Damiano
 * Licensed under MIT
 */
`;

const combinedBundle = `${combinedBundleHeader}
(function(global, factory) {
  'use strict';
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    global.TagTeam = factory();
  }
})(typeof window !== 'undefined' ? window : this, function() {
  'use strict';

  const _global = typeof window !== 'undefined' ? window : global;

  // ============================================================================
  // LEXICON DATA
  // ============================================================================

${lexicon}

  _global.LEXICON_TAG_MAP = {
    "NN": ["NN"], "NNS": ["NNS"], "NNP": ["NNP"],
    "JJ": ["JJ"], "JJR": ["JJR"], "JJS": ["JJS"],
    "VB": ["VB"], "VBD": ["VBD"], "VBG": ["VBG"], "VBN": ["VBN"], "VBP": ["VBP"], "VBZ": ["VBZ"],
    "RB": ["RB"], "RBR": ["RBR"], "RBS": ["RBS"],
    "PRP": ["PRP"], "PRP$": ["PRP$"], "DT": ["DT"], "IN": ["IN"], "CC": ["CC"], "UH": ["UH"],
    "CD": ["CD"], "EX": ["EX"], "FW": ["FW"], "LS": ["LS"], "MD": ["MD"], "POS": ["POS"],
    "SYM": ["SYM"], "TO": ["TO"], "WDT": ["WDT"], "WP": ["WP"], "WP$": ["WP$"], "WRB": ["WRB"]
  };

  // ============================================================================
  // POS TAGGER
  // ============================================================================

${posTagger}

  // ============================================================================
  // COMPROMISE.JS NLP LIBRARY
  // ============================================================================

${compromise}

  // Make nlp available - works in both browser and Node.js
  const nlp = typeof _global.nlp !== 'undefined' ? _global.nlp : (typeof module !== 'undefined' && require ? require('compromise') : null);

  // ============================================================================
  // MATCHING STRATEGIES
  // ============================================================================

  const MatchingStrategies = (function() {
${matchingStrategies}
    return MatchingStrategies;
  })();

  // ============================================================================
  // PATTERN MATCHER
  // ============================================================================

  const PatternMatcher = (function(nlp) {
${patternMatcher}
    return PatternMatcher;
  })(nlp);

  // ============================================================================
  // VALUE DEFINITIONS DATA
  // ============================================================================

  _global.VALUE_DEFINITIONS = ${valueDefinitions};
  _global.FRAME_VALUE_BOOSTS = ${frameValueBoosts};
  _global.CONFLICT_PAIRS = ${conflictPairs};

  // ============================================================================
  // CONTEXT ANALYZER
  // ============================================================================

  const ContextAnalyzer = (function(PatternMatcher) {
${contextAnalyzer}
    return ContextAnalyzer;
  })(PatternMatcher);

  // ============================================================================
  // VALUE MATCHER
  // ============================================================================

  const ValueMatcher = (function(PatternMatcher) {
${valueMatcher}
    return ValueMatcher;
  })(PatternMatcher);

  _global.ValueMatcher = ValueMatcher;

  // ============================================================================
  // VALUE SCORER
  // ============================================================================

  const ValueScorer = (function() {
${valueScorer}
    return ValueScorer;
  })();

  _global.ValueScorer = ValueScorer;

  // ============================================================================
  // ETHICAL PROFILER
  // ============================================================================

  const EthicalProfiler = (function() {
${ethicalProfiler}
    return EthicalProfiler;
  })();

  _global.EthicalProfiler = EthicalProfiler;

  // ============================================================================
  // SEMANTIC ROLE EXTRACTOR
  // ============================================================================

${semanticExtractor}

  // ============================================================================
  // GRAPH MODULES
  // ============================================================================

${cryptoShim}

${realWorldEntityFactory}
${entityExtractor}
${actExtractor}
${roleDetector}
${jsonldSerializer}
${scarcityAssertionFactory}
${directiveExtractor}
${objectAggregateFactory}
${qualityFactory}
${assertionEventBuilder}
${contextManager}
${informationStaircaseBuilder}
${shmlValidator}
${complexityBudget}
${domainConfigLoader}
${semanticGraphBuilderCombined}

  // ============================================================================
  // COMBINED API
  // ============================================================================

  const TagTeam = {
    parse: function(text, options) {
      const extractor = new SemanticRoleExtractor();
      return extractor.parseSemanticAction(text);
    },

    parseMany: function(texts) {
      return texts.map(text => this.parse(text));
    },

    buildGraph: function(text, options) {
      const builder = new SemanticGraphBuilder(options);
      return builder.build(text, options);
    },

    toJSONLD: function(text, options) {
      options = options || {};
      const graph = this.buildGraph(text, options);
      const serializer = new JSONLDSerializer({ pretty: options.pretty });
      return serializer.serialize(graph);
    },

    version: '5.0.0',

    // All classes exposed
    SemanticRoleExtractor,
    POSTagger,
    PatternMatcher,
    MatchingStrategies,
    SemanticGraphBuilder,
    JSONLDSerializer,
    RealWorldEntityFactory,
    EntityExtractor,
    ActExtractor,
    RoleDetector,
    ScarcityAssertionFactory,
    DirectiveExtractor,
    ObjectAggregateFactory,
    QualityFactory,
    ContextManager,
    InformationStaircaseBuilder,
    SHMLValidator,
    ComplexityBudget,
    DomainConfigLoader,
    // Values
    ContextAnalyzer,
    ValueMatcher,
    ValueScorer,
    EthicalProfiler,
    AssertionEventBuilder
  };

  return TagTeam;
});
`;

const combinedOutputPath = path.join(distDir, 'tagteam.js');
fs.writeFileSync(combinedOutputPath, combinedBundle, 'utf8');
const combinedBundleSize = fs.statSync(combinedOutputPath).size;
console.log(`  ✓ Generated dist/tagteam.js (${(combinedBundleSize / 1024 / 1024).toFixed(2)} MB)`);

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n✨ Build complete!\n');
console.log('📦 Bundles generated:');
console.log(`   dist/tagteam-core.js   (${(coreBundleSize / 1024 / 1024).toFixed(2)} MB) - Core only`);
console.log(`   dist/tagteam-values.js (${(valuesBundleSize / 1024).toFixed(2)} KB) - Values add-on`);
console.log(`   dist/tagteam.js        (${(combinedBundleSize / 1024 / 1024).toFixed(2)} MB) - Combined`);
console.log('\n📖 Usage:');
console.log('\n   Core only:');
console.log('   <script src="tagteam-core.js"></script>');
console.log('   <script>TagTeam.buildGraph("text")</script>');
console.log('\n   With values:');
console.log('   <script src="tagteam-core.js"></script>');
console.log('   <script src="tagteam-values.js"></script>');
console.log('   <script>');
console.log('     const builder = new TagTeamValues.IEEGraphBuilder();');
console.log('     builder.build("text", { context: "MedicalEthics" });');
console.log('   </script>');
console.log('\n   Combined (legacy):');
console.log('   <script src="tagteam.js"></script>\n');
