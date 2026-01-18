#!/usr/bin/env node
/**
 * TagTeam.js Bundle Builder
 *
 * Creates a single-file d3.js-style bundle from source files
 *
 * Usage: node build.js
 * Output: dist/tagteam.js (full bundle)
 */

const fs = require('fs');
const path = require('path');

console.log('🔨 Building TagTeam.js bundle...\n');

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
  console.log('✅ Created dist/ directory');
}

// Read source files
console.log('📖 Reading source files...');
const lexiconPath = path.join(__dirname, 'src', 'lexicon.js');
const posTaggerPath = path.join(__dirname, 'src', 'POSTagger.js');
const patternMatcherPath = path.join(__dirname, 'src', 'PatternMatcher.js');
const contextAnalyzerPath = path.join(__dirname, 'src', 'ContextAnalyzer.js');
const valueMatcherPath = path.join(__dirname, 'src', 'ValueMatcher.js');
const valueScorerPath = path.join(__dirname, 'src', 'ValueScorer.js');
const ethicalProfilerPath = path.join(__dirname, 'src', 'EthicalProfiler.js');
const semanticExtractorPath = path.join(__dirname, 'src', 'SemanticRoleExtractor.js');

let lexicon = fs.readFileSync(lexiconPath, 'utf8');
let posTagger = fs.readFileSync(posTaggerPath, 'utf8');
let patternMatcher = fs.readFileSync(patternMatcherPath, 'utf8');
let contextAnalyzer = fs.readFileSync(contextAnalyzerPath, 'utf8');
let valueMatcher = fs.readFileSync(valueMatcherPath, 'utf8');
let valueScorer = fs.readFileSync(valueScorerPath, 'utf8');
let ethicalProfiler = fs.readFileSync(ethicalProfilerPath, 'utf8');
let semanticExtractor = fs.readFileSync(semanticExtractorPath, 'utf8');

console.log(`  ✓ lexicon.js (${(lexicon.length / 1024 / 1024).toFixed(2)} MB)`);
console.log(`  ✓ POSTagger.js (${(posTagger.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ PatternMatcher.js (${(patternMatcher.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ ContextAnalyzer.js (${(contextAnalyzer.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ ValueMatcher.js (${(valueMatcher.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ ValueScorer.js (${(valueScorer.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ EthicalProfiler.js (${(ethicalProfiler.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ SemanticRoleExtractor.js (${(semanticExtractor.length / 1024).toFixed(2)} KB)`);

// Read data files for Week 2b
console.log('\n📖 Reading Week 2b data files...');
const valueDefinitionsPath = path.join(__dirname, 'iee-collaboration', 'from-iee', 'data', 'value-definitions-comprehensive.json');
const frameValueBoostsPath = path.join(__dirname, 'iee-collaboration', 'from-iee', 'data', 'frame-value-boosts.json');
const conflictPairsPath = path.join(__dirname, 'iee-collaboration', 'from-iee', 'data', 'conflict-pairs.json');

const valueDefinitions = fs.readFileSync(valueDefinitionsPath, 'utf8');
const frameValueBoosts = fs.readFileSync(frameValueBoostsPath, 'utf8');
const conflictPairs = fs.readFileSync(conflictPairsPath, 'utf8');

console.log(`  ✓ value-definitions-comprehensive.json (${(valueDefinitions.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ frame-value-boosts.json (${(frameValueBoosts.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ conflict-pairs.json (${(conflictPairs.length / 1024).toFixed(2)} KB)`);

// Strip IIFE wrappers from SemanticRoleExtractor if present
console.log('\n🔧 Processing source files...');
if (semanticExtractor.includes('(function(window)')) {
  // Remove the IIFE wrapper and window export
  semanticExtractor = semanticExtractor
    .replace(/^\s*\/\*![^]*?\*\/\s*\n/, '') // Remove header comment
    .replace(/^\s*\(function\(window\)\s*\{\s*\n/m, '') // Remove opening IIFE
    .replace(/\s*window\.SemanticRoleExtractor\s*=\s*SemanticRoleExtractor;\s*\n/gm, '') // Remove window export
    .replace(/\}\)\(window\);\s*$/gm, ''); // Remove closing IIFE
  console.log('  ✓ Stripped IIFE wrapper from SemanticRoleExtractor');
}

// Fix POSTagger global variable leak (word = ret[i] should be var word = ret[i])
if (posTagger.includes('word = ret[i]')) {
  posTagger = posTagger.replace(/(\s+)word = ret\[i\];/g, '$1var word = ret[i];');
  console.log('  ✓ Fixed global variable leak in POSTagger');
}

// Build the bundle
console.log('\n🔧 Building bundle...');

const bundle = `/*!
 * TagTeam.js - Deterministic Semantic Parser with Ethical Value Detection
 * Version: 2.0.0 (Week 2b Complete)
 * Date: ${new Date().toISOString().split('T')[0]}
 *
 * A client-side JavaScript library for extracting semantic roles from natural language text
 * Week 1: Semantic role extraction
 * Week 2a: Context intensity analysis (12 dimensions)
 * Week 2b: Ethical value detection (50 values, conflict detection, domain analysis)
 *
 * Inspired by d3.js and mermaid.js - single file, zero dependencies, simple API
 *
 * Copyright (c) 2025-2026 Aaron Damiano
 * Licensed under MIT
 *
 * Repository: https://github.com/yourusername/TagTeam.js
 */

(function(global, factory) {
  'use strict';

  // UMD (Universal Module Definition) for compatibility
  if (typeof module === 'object' && typeof module.exports === 'object') {
    // Node.js / CommonJS
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    // AMD (RequireJS)
    define([], factory);
  } else {
    // Browser global
    global.TagTeam = factory();
  }
})(typeof window !== 'undefined' ? window : this, function() {
  'use strict';

  // ============================================================================
  // LEXICON DATA (~4.2MB)
  // ============================================================================

${lexicon}

  // Define LEXICON_TAG_MAP (required by POSTagger)
  window.LEXICON_TAG_MAP = {
    "NN": ["NN"], "NNS": ["NNS"], "NNP": ["NNP"],
    "JJ": ["JJ"], "JJR": ["JJR"], "JJS": ["JJS"],
    "VB": ["VB"], "VBD": ["VBD"], "VBG": ["VBG"], "VBN": ["VBN"], "VBP": ["VBP"], "VBZ": ["VBZ"],
    "RB": ["RB"], "RBR": ["RBR"], "RBS": ["RBS"],
    "PRP": ["PRP"], "PRP$": ["PRP$"], "DT": ["DT"], "IN": ["IN"], "CC": ["CC"], "UH": ["UH"],
    "CD": ["CD"], "EX": ["EX"], "FW": ["FW"], "LS": ["LS"], "MD": ["MD"], "POS": ["POS"],
    "SYM": ["SYM"], "TO": ["TO"], "WDT": ["WDT"], "WP": ["WP"], "WP$": ["WP$"], "WRB": ["WRB"]
  };

  // ============================================================================
  // POS TAGGER (~4KB)
  // ============================================================================

${posTagger}

  // ============================================================================
  // PATTERN MATCHER (Week 2a) (~8KB)
  // ============================================================================

${patternMatcher}

  // ============================================================================
  // CONTEXT ANALYZER (Week 2a) (~15KB)
  // ============================================================================

${contextAnalyzer}

  // ============================================================================
  // WEEK 2B: ETHICAL VALUE DETECTION DATA (~70KB)
  // ============================================================================

  // Value definitions (50 values across 5 domains)
  window.VALUE_DEFINITIONS = ${valueDefinitions};

  // Frame and role boost mappings
  window.FRAME_VALUE_BOOSTS = ${frameValueBoosts};

  // Predefined conflict pairs (18 known ethical tensions)
  window.CONFLICT_PAIRS = ${conflictPairs};

  // ============================================================================
  // VALUE MATCHER (Week 2b) (~6KB)
  // ============================================================================

${valueMatcher}

  // ============================================================================
  // VALUE SCORER (Week 2b) (~9KB)
  // ============================================================================

${valueScorer}

  // ============================================================================
  // ETHICAL PROFILER (Week 2b) (~12KB)
  // ============================================================================

${ethicalProfiler}

  // ============================================================================
  // SEMANTIC ROLE EXTRACTOR (~32KB + Week 2a/2b enhancements)
  // ============================================================================

${semanticExtractor}

  // ============================================================================
  // UNIFIED API
  // ============================================================================

  /**
   * TagTeam - Unified API for semantic parsing
   */
  const TagTeam = {
    /**
     * Parse a sentence and extract semantic roles
     *
     * @param {string} text - The sentence to parse
     * @param {Object} options - Optional configuration
     * @param {boolean} options.includeConfidence - Include confidence scores (default: true)
     * @param {boolean} options.detectNegation - Detect negation (default: true)
     * @param {boolean} options.resolveCompounds - Handle multi-word entities (default: true)
     * @param {boolean} options.includeRawTokens - Include raw POS tokens (default: false)
     * @returns {Object} Semantic action structure
     *
     * @example
     * const result = TagTeam.parse("I should tell my doctor about the pain");
     * console.log(result.agent);  // { text: "I", entity: "self" }
     * console.log(result.action); // { verb: "tell", modality: "should" }
     */
    parse: function(text, options) {
      options = options || {};

      const extractor = new SemanticRoleExtractor();
      const result = extractor.parseSemanticAction(text);

      // Apply options
      if (options.includeRawTokens) {
        result._rawTokens = extractor.lastTokens;
      }

      return result;
    },

    /**
     * Parse multiple sentences in batch
     *
     * @param {string[]} texts - Array of sentences to parse
     * @returns {Object[]} Array of semantic action structures
     *
     * @example
     * const results = TagTeam.parseMany([
     *   "I love my best friend",
     *   "The doctor recommended treatment"
     * ]);
     */
    parseMany: function(texts) {
      return texts.map(text => this.parse(text));
    },

    /**
     * Load value definitions for semantic matching (Week 2 feature)
     *
     * @param {Object} definitions - Value definitions in IEE format
     */
    loadValueDefinitions: function(definitions) {
      // TODO: Implement in Week 2
      console.warn('TagTeam.loadValueDefinitions: Feature available in Week 2');
      return this;
    },

    /**
     * Add custom compound terms
     *
     * @param {string[]} terms - Array of multi-word terms
     *
     * @example
     * TagTeam.loadCompoundTerms(["artificial intelligence", "machine learning"]);
     */
    loadCompoundTerms: function(terms) {
      if (typeof SemanticRoleExtractor.prototype.addCompoundTerms === 'function') {
        const extractor = new SemanticRoleExtractor();
        extractor.addCompoundTerms(terms);
      }
      return this;
    },

    /**
     * Add custom semantic frame
     *
     * @param {Object} frameDefinition - Frame definition
     *
     * @example
     * TagTeam.addSemanticFrame({
     *   name: 'spiritual_practice',
     *   coreVerbs: ['pray', 'worship', 'meditate']
     * });
     */
    addSemanticFrame: function(frameDefinition) {
      // TODO: Implement frame extension API
      console.warn('TagTeam.addSemanticFrame: Feature available in Week 2');
      return this;
    },

    /**
     * Version information
     */
    version: '2.0.0',

    // Advanced: Expose classes for power users
    SemanticRoleExtractor: SemanticRoleExtractor,
    POSTagger: POSTagger
  };

  // Return the unified API
  return TagTeam;
});
`;

// Write the bundle
const outputPath = path.join(distDir, 'tagteam.js');
fs.writeFileSync(outputPath, bundle, 'utf8');

const bundleSize = fs.statSync(outputPath).size;
console.log(`  ✓ Generated dist/tagteam.js (${(bundleSize / 1024 / 1024).toFixed(2)} MB)`);

// Create a simple test HTML
const testHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TagTeam.js Bundle Test</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 { color: #2563eb; }
    pre {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
    }
    .result {
      margin: 20px 0;
      padding: 15px;
      border: 2px solid #10b981;
      border-radius: 8px;
      background: #f0fdf4;
    }
    button {
      background: #2563eb;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <h1>🎯 TagTeam.js Bundle Test</h1>
  <p>Testing single-file bundle with simple API</p>

  <h2>Test 1: Simple Parse</h2>
  <button onclick="test1()">Run Test 1</button>
  <div id="test1-result"></div>

  <h2>Test 2: Batch Parse</h2>
  <button onclick="test2()">Run Test 2</button>
  <div id="test2-result"></div>

  <h2>Test 3: IEE Test Sentence</h2>
  <button onclick="test3()">Run Test 3</button>
  <div id="test3-result"></div>

  <!-- Load the bundle -->
  <script src="tagteam.js"></script>

  <script>
    function test1() {
      const text = "I love my best friend";
      const result = TagTeam.parse(text);

      document.getElementById('test1-result').innerHTML = \`
        <div class="result">
          <strong>Input:</strong> "\${text}"<br><br>
          <strong>Result:</strong>
          <pre>\${JSON.stringify(result, null, 2)}</pre>
        </div>
      \`;
    }

    function test2() {
      const texts = [
        "I love my best friend",
        "The doctor recommended treatment",
        "We must decide about the coal plant"
      ];
      const results = TagTeam.parseMany(texts);

      document.getElementById('test2-result').innerHTML = \`
        <div class="result">
          <strong>Input:</strong> 3 sentences<br><br>
          <strong>Results:</strong>
          <pre>\${JSON.stringify(results, null, 2)}</pre>
        </div>
      \`;
    }

    function test3() {
      const text = "I should tell my doctor about the pain";
      const result = TagTeam.parse(text);

      document.getElementById('test3-result').innerHTML = \`
        <div class="result">
          <strong>Input:</strong> "\${text}"<br><br>
          <strong>Agent:</strong> \${result.agent ? result.agent.text : 'N/A'}<br>
          <strong>Action:</strong> \${result.action ? result.action.verb : 'N/A'}<br>
          <strong>Modality:</strong> \${result.action && result.action.modality ? result.action.modality : 'none'}<br>
          <strong>Recipient:</strong> \${result.recipient ? result.recipient.text : 'N/A'}<br>
          <strong>Theme:</strong> \${result.theme ? result.theme.text : 'N/A'}<br>
          <strong>Frame:</strong> \${result.semanticFrame || 'N/A'}<br><br>
          <strong>Full Result:</strong>
          <pre>\${JSON.stringify(result, null, 2)}</pre>
        </div>
      \`;
    }

    // Auto-run test 1 on load
    window.addEventListener('load', () => {
      console.log('TagTeam.js loaded! Version:', TagTeam.version);
      test1();
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(distDir, 'test.html'), testHtml, 'utf8');
console.log('  ✓ Created dist/test.html');

// Summary
console.log('\n✨ Build complete!\n');
console.log('📦 Bundle: dist/tagteam.js');
console.log('🧪 Test:   dist/test.html');
console.log('\n📖 Usage:');
console.log('   <script src="tagteam.js"></script>');
console.log('   <script>');
console.log('     const result = TagTeam.parse("I love coding");');
console.log('     console.log(result);');
console.log('   </script>');
console.log('\n🚀 Next steps:');
console.log('   1. Open dist/test.html in browser');
console.log('   2. Verify all tests pass');
console.log('   3. Update demos to use bundle');
console.log('   4. Share with IEE team\n');
