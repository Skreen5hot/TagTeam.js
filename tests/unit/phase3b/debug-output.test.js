/**
 * Phase 3B: Debug Output Tests
 *
 * Tests AC-3.18 from the Major Refactor Roadmap.
 * TDD: These tests are written BEFORE implementation.
 *
 * Authority: Major-Refactor-Roadmap.md §Phase 3B
 */

'use strict';

// ============================================================================
// Test framework
// ============================================================================
let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m\u2713\x1b[0m ${message}`);
    passed++;
  } else {
    console.log(`  \x1b[31m\u2717\x1b[0m ${message}`);
    failed++;
    failures.push(message);
  }
}

function section(name) {
  console.log(`\n\x1b[1m${name}\x1b[0m`);
}

// ============================================================================
// Load modules
// ============================================================================
let SemanticGraphBuilder;
try {
  SemanticGraphBuilder = require('../../../src/graph/SemanticGraphBuilder');
} catch (e) {
  console.log(`\x1b[31mCannot load SemanticGraphBuilder: ${e.message}\x1b[0m`);
  process.exit(1);
}

// Check if tree pipeline modules are available
let treeModulesAvailable = true;
try {
  require('../../../src/graph/TreeEntityExtractor');
  require('../../../src/graph/TreeActExtractor');
  require('../../../src/graph/TreeRoleMapper');
  require('../../../src/core/DependencyParser');
  require('../../../src/core/PerceptronTagger');
} catch (e) {
  treeModulesAvailable = false;
}

// ============================================================================
// AC-3.18: Verbose Mode
// ============================================================================
section('AC-3.18: Verbose Mode — verbose: true');

if (!treeModulesAvailable) {
  console.log('  \x1b[33m(skipped — tree pipeline modules not available)\x1b[0m');
  skipped += 8;
} else {
  const text = 'The doctor treated the patient';

  // Test verbose: true
  const builder = new SemanticGraphBuilder({});
  let graph;
  try {
    graph = builder.build(text, { useTreeExtractors: true, verbose: true });
  } catch (e) {
    console.log(`  \x1b[33mWarning: build failed: ${e.message}\x1b[0m`);
    graph = null;
  }

  if (graph) {
    const debug = graph._debug;
    assert(debug !== undefined && debug !== null,
      'AC-3.18a: verbose:true → graph._debug is defined');

    if (debug) {
      // _debug.dependencyTree is an array of arcs
      assert(Array.isArray(debug.dependencyTree),
        'AC-3.18b: _debug.dependencyTree is an array');

      if (Array.isArray(debug.dependencyTree) && debug.dependencyTree.length > 0) {
        const arc = debug.dependencyTree[0];
        assert(typeof arc.id === 'number' || typeof arc.dependent === 'number',
          'AC-3.18c: _debug.dependencyTree[0] has id/dependent field');
        assert(typeof arc.word === 'string',
          `AC-3.18d: _debug.dependencyTree[0] has word field (got "${arc.word}")`);
        assert(typeof arc.tag === 'string',
          `AC-3.18e: _debug.dependencyTree[0] has tag field (got "${arc.tag}")`);
        assert(typeof arc.head === 'number',
          `AC-3.18f: _debug.dependencyTree[0] has head field`);
        assert(typeof arc.deprel === 'string',
          `AC-3.18g: _debug.dependencyTree[0] has deprel field (got "${arc.deprel}")`);
        assert(typeof arc.margin === 'number',
          `AC-3.18h: _debug.dependencyTree[0] has margin field`);
      } else {
        assert(false, 'AC-3.18c: (skipped — empty dependencyTree)');
        assert(false, 'AC-3.18d: (skipped — empty dependencyTree)');
        assert(false, 'AC-3.18e: (skipped — empty dependencyTree)');
        assert(false, 'AC-3.18f: (skipped — empty dependencyTree)');
        assert(false, 'AC-3.18g: (skipped — empty dependencyTree)');
        assert(false, 'AC-3.18h: (skipped — empty dependencyTree)');
      }

      // _debug.tokens is an array of { text, tag }
      assert(Array.isArray(debug.tokens),
        'AC-3.18i: _debug.tokens is an array');

      if (Array.isArray(debug.tokens) && debug.tokens.length > 0) {
        const tok = debug.tokens[0];
        assert(typeof tok.text === 'string',
          `AC-3.18j: _debug.tokens[0] has text field (got "${tok.text}")`);
        assert(typeof tok.tag === 'string',
          `AC-3.18k: _debug.tokens[0] has tag field (got "${tok.tag}")`);
      } else {
        assert(false, 'AC-3.18j: (skipped — empty tokens)');
        assert(false, 'AC-3.18k: (skipped — empty tokens)');
      }

      // _debug.entitySpans is an array
      assert(Array.isArray(debug.entitySpans),
        'AC-3.18l: _debug.entitySpans is an array');

      if (Array.isArray(debug.entitySpans) && debug.entitySpans.length > 0) {
        const span = debug.entitySpans[0];
        assert(typeof span.head === 'number',
          `AC-3.18m: entitySpans[0] has head field`);
        assert(typeof span.fullText === 'string',
          `AC-3.18n: entitySpans[0] has fullText field (got "${span.fullText}")`);
        assert(typeof span.role === 'string',
          `AC-3.18o: entitySpans[0] has role field (got "${span.role}")`);
      } else {
        assert(false, 'AC-3.18m: (skipped — empty entitySpans)');
        assert(false, 'AC-3.18n: (skipped — empty entitySpans)');
        assert(false, 'AC-3.18o: (skipped — empty entitySpans)');
      }

      // _debug.gazetteers has matched[] and unmatched[]
      assert(debug.gazetteers !== undefined && typeof debug.gazetteers === 'object',
        'AC-3.18p: _debug.gazetteers is an object');

      if (debug.gazetteers) {
        assert(Array.isArray(debug.gazetteers.matched),
          'AC-3.18q: _debug.gazetteers.matched is an array');
        assert(Array.isArray(debug.gazetteers.unmatched),
          'AC-3.18r: _debug.gazetteers.unmatched is an array');
      } else {
        assert(false, 'AC-3.18q: (skipped — no gazetteers)');
        assert(false, 'AC-3.18r: (skipped — no gazetteers)');
      }
    } else {
      // Force remaining failures
      for (let i = 0; i < 17; i++) {
        assert(false, `AC-3.18 sub-test (skipped — _debug is null)`);
      }
    }
  } else {
    for (let i = 0; i < 18; i++) {
      assert(false, `AC-3.18 (skipped — graph build failed)`);
    }
  }
}

// ============================================================================
// AC-3.18: Verbose Mode — verbose: false
// ============================================================================
section('AC-3.18: Verbose Mode — verbose: false');

if (!treeModulesAvailable) {
  console.log('  \x1b[33m(skipped — tree pipeline modules not available)\x1b[0m');
  skipped += 1;
} else {
  const text = 'The doctor treated the patient';
  const builder = new SemanticGraphBuilder({});
  let graph;
  try {
    graph = builder.build(text, { useTreeExtractors: true, verbose: false });
  } catch (e) {
    graph = null;
  }

  if (graph) {
    assert(graph._debug === undefined,
      'AC-3.18s: verbose:false → graph._debug is undefined');
  } else {
    assert(false, 'AC-3.18s: (skipped — graph build failed)');
  }
}

// ============================================================================
// AC-3.18: Verbose Mode — default (no verbose option)
// ============================================================================
section('AC-3.18: Verbose Mode — default (no verbose option)');

if (!treeModulesAvailable) {
  console.log('  \x1b[33m(skipped — tree pipeline modules not available)\x1b[0m');
  skipped += 1;
} else {
  const text = 'The doctor treated the patient';
  const builder = new SemanticGraphBuilder({});
  let graph;
  try {
    graph = builder.build(text, { useTreeExtractors: true });
  } catch (e) {
    graph = null;
  }

  if (graph) {
    assert(graph._debug === undefined,
      'AC-3.18t: Default (no verbose) → graph._debug is undefined');
  } else {
    assert(false, 'AC-3.18t: (skipped — graph build failed)');
  }
}

// ============================================================================
// Report
// ============================================================================
console.log(`\n${'='.repeat(70)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped (${passed + failed + skipped} total)`);
console.log(`${'='.repeat(70)}`);

if (failures.length > 0) {
  console.log(`\n\x1b[31mFailures:\x1b[0m`);
  for (const f of failures) {
    console.log(`  - ${f}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
