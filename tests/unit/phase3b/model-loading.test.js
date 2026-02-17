/**
 * Phase 3B: Model Loading Tests
 *
 * Tests AC-3.19 through AC-3.22 from the Major Refactor Roadmap.
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
const fs = require('fs');
const path = require('path');

let SemanticGraphBuilder;
try {
  SemanticGraphBuilder = require('../../../src/graph/SemanticGraphBuilder');
} catch (e) {
  console.log(`\x1b[31mCannot load SemanticGraphBuilder: ${e.message}\x1b[0m`);
  process.exit(1);
}

// Model paths
const posModelPath = path.join(__dirname, '../../../src/data/pos-weights-pruned.json');
const depModelPath = path.join(__dirname, '../../../src/data/dep-weights-pruned.json');
const calibrationPath = path.join(__dirname, '../../../src/data/dep-calibration.json');

const posModelExists = fs.existsSync(posModelPath);
const depModelExists = fs.existsSync(depModelPath);
const calibrationExists = fs.existsSync(calibrationPath);

// ============================================================================
// AC-3.19: Explicit Async Load
// ============================================================================
section('AC-3.19: Explicit Async Load');

// The TagTeam unified API should support loadModels() with pos, dep, and calibration paths
{
  // Check that loadModels function exists on the builder or via TagTeam API
  // In Node.js, the builder caches models after first use
  // AC-3.19 requires explicit async load to work without warning

  if (!posModelExists || !depModelExists) {
    console.log('  \x1b[33m(skipped — model files not found)\x1b[0m');
    skipped += 3;
  } else {
    const builder = new SemanticGraphBuilder({});

    // Load models explicitly
    const posModel = JSON.parse(fs.readFileSync(posModelPath, 'utf8'));
    const depModel = JSON.parse(fs.readFileSync(depModelPath, 'utf8'));

    // Set up the builder with pre-loaded models
    const PerceptronTagger = require('../../../src/core/PerceptronTagger');
    const DependencyParser = require('../../../src/core/DependencyParser');

    builder._treePosTagger = new PerceptronTagger(posModel);
    builder._treeDepParser = new DependencyParser(depModel);

    // Load calibration if available
    if (calibrationExists) {
      builder._calibration = JSON.parse(fs.readFileSync(calibrationPath, 'utf8'));
    }

    // buildGraph with useTreeExtractors should work without console warning
    let graph;
    try {
      graph = builder.build('The doctor treated the patient', { useTreeExtractors: true });
    } catch (e) {
      graph = null;
    }

    assert(graph !== null && graph !== undefined,
      'AC-3.19a: buildGraph() works after explicit model loading');
    assert(graph && graph['@graph'] && Array.isArray(graph['@graph']),
      'AC-3.19b: Result has @graph array');
    assert(graph && graph._metadata,
      'AC-3.19c: Result has _metadata');
  }
}

// ============================================================================
// AC-3.20: Auto-Load with Warning
// ============================================================================
section('AC-3.20: Auto-Load with Warning');

if (!posModelExists || !depModelExists) {
  console.log('  \x1b[33m(skipped — model files not found)\x1b[0m');
  skipped += 2;
} else {
  // Create a fresh builder with NO pre-loaded models
  const builder = new SemanticGraphBuilder({});

  // Capture console warnings
  const originalWarn = console.warn;
  let warningEmitted = false;
  console.warn = function(...args) {
    const msg = args.join(' ');
    if (msg.includes('pre-load') || msg.includes('loadModels') || msg.includes('auto-load') || msg.includes('loading')) {
      warningEmitted = true;
    }
    // Don't print during test
  };

  let graph;
  try {
    graph = builder.build('The doctor treated the patient', { useTreeExtractors: true });
  } catch (e) {
    graph = null;
  }

  console.warn = originalWarn;

  assert(graph !== null,
    'AC-3.20a: Auto-load succeeds (models loaded from default paths)');
  assert(warningEmitted,
    'AC-3.20b: Console warning emitted about pre-loading');
}

// ============================================================================
// AC-3.21: Progressive Loading
// ============================================================================
section('AC-3.21: Progressive Loading');

if (!posModelExists || !depModelExists) {
  console.log('  \x1b[33m(skipped — model files not found)\x1b[0m');
  skipped += 2;
} else {
  // Load only POS model
  const builder = new SemanticGraphBuilder({});
  const posModel = JSON.parse(fs.readFileSync(posModelPath, 'utf8'));
  const PerceptronTagger = require('../../../src/core/PerceptronTagger');
  builder._treePosTagger = new PerceptronTagger(posModel);

  // POS-only pipeline (parse) should succeed — returns tokens + tags
  let parseResult;
  try {
    parseResult = builder.buildPOSOnly
      ? builder.buildPOSOnly('The doctor treated the patient')
      : builder.build('The doctor treated the patient', { useTreeExtractors: true, posOnly: true });
  } catch (e) {
    // If posOnly not supported yet, check that full pipeline auto-loads dep model
    try {
      parseResult = builder.build('The doctor treated the patient', { useTreeExtractors: true });
    } catch (e2) {
      parseResult = null;
    }
  }

  assert(parseResult !== null,
    'AC-3.21a: With only POS model loaded, pipeline still produces output (auto-loads dep model)');

  // Verify dep model was auto-loaded
  assert(builder._treeDepParser !== null && builder._treeDepParser !== undefined,
    'AC-3.21b: After full pipeline call, dep model was auto-loaded');
}

// ============================================================================
// AC-3.22: Cross-Sentence Mention ID Format
// ============================================================================
section('AC-3.22: Cross-Sentence Mention ID Format');

if (!posModelExists || !depModelExists) {
  console.log('  \x1b[33m(skipped — model files not found)\x1b[0m');
  skipped += 4;
} else {
  const builder = new SemanticGraphBuilder({});
  let graph;
  try {
    graph = builder.build('The doctor treated the patient', {
      useTreeExtractors: true,
      verbose: true
    });
  } catch (e) {
    graph = null;
  }

  if (graph && graph['@graph']) {
    // Find entity nodes in the graph
    const entityNodes = graph['@graph'].filter(n =>
      n['@type'] && !n['@type'].includes('cco:IntentionalAct') &&
      !n['@type'].includes('tagteam:StructuralAssertion') &&
      !n['@type'].includes('tagteam:NegatedStructuralAssertion') &&
      n['rdfs:label'] &&
      !n['@type'].some(t => t.endsWith('Role'))
    );

    assert(entityNodes.length > 0,
      `AC-3.22a: Entity nodes found in graph (found ${entityNodes.length})`);

    if (entityNodes.length > 0) {
      const hasmentionIds = entityNodes.every(n => typeof n['tagteam:mentionId'] === 'string');
      assert(hasmentionIds,
        'AC-3.22b: All entity nodes have tagteam:mentionId');

      // Check format: "s{sentenceIdx}:h{headId}:{charStart}-{charEnd}"
      const mentionId = entityNodes[0]['tagteam:mentionId'];
      if (mentionId) {
        const mentionPattern = /^s\d+:h\d+:\d+-\d+$/;
        assert(mentionPattern.test(mentionId),
          `AC-3.22c: mentionId matches format "s{N}:h{N}:{start}-{end}" (got "${mentionId}")`);
      } else {
        assert(false, 'AC-3.22c: (skipped — no mentionId on first entity)');
      }

      // Ensure mention IDs are unique
      const ids = entityNodes.map(n => n['tagteam:mentionId']).filter(Boolean);
      const uniqueIds = new Set(ids);
      assert(uniqueIds.size === ids.length,
        `AC-3.22d: All mention IDs are unique (${uniqueIds.size}/${ids.length})`);
    } else {
      assert(false, 'AC-3.22b: (skipped — no entities)');
      assert(false, 'AC-3.22c: (skipped — no entities)');
      assert(false, 'AC-3.22d: (skipped — no entities)');
    }
  } else {
    assert(false, 'AC-3.22a: (skipped — graph build failed)');
    assert(false, 'AC-3.22b: (skipped — graph build failed)');
    assert(false, 'AC-3.22c: (skipped — graph build failed)');
    assert(false, 'AC-3.22d: (skipped — graph build failed)');
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
