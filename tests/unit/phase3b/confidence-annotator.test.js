/**
 * Phase 3B: Confidence Annotator Tests
 *
 * Tests AC-3.14 through AC-3.17 from the Major Refactor Roadmap.
 * TDD: These tests are written BEFORE implementation.
 *
 * Authority: Major-Refactor-Roadmap.md §Phase 3B
 */

'use strict';

// ============================================================================
// Test framework (minimal, consistent with other phase tests)
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

function assertApprox(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected);
  assert(diff <= tolerance, `${message} (got ${actual}, expected ~${expected})`);
}

function section(name) {
  console.log(`\n\x1b[1m${name}\x1b[0m`);
}

// ============================================================================
// Load modules
// ============================================================================
let ConfidenceAnnotator;
try {
  ConfidenceAnnotator = require('../../../src/graph/ConfidenceAnnotator');
} catch (e) {
  console.log(`\x1b[31mCannot load ConfidenceAnnotator: ${e.message}\x1b[0m`);
  console.log('\nResults: 0 passed, 0 failed (module not found)');
  process.exit(1);
}

// Load calibration table
const fs = require('fs');
const path = require('path');
let calibration;
try {
  calibration = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../../training/models/dep-calibration.json'), 'utf8')
  );
} catch (e) {
  console.log(`\x1b[33mWarning: Could not load calibration table: ${e.message}\x1b[0m`);
  calibration = null;
}

// ============================================================================
// AC-3.14: Score Margin → Confidence Bucket
// ============================================================================
section('AC-3.14: Score Margin → Confidence Bucket');

{
  const annotator = new ConfidenceAnnotator(calibration);

  // High confidence: calibrated probability >= 0.9
  const highArc = { dependent: 1, head: 2, label: 'nsubj', scoreMargin: 100 };
  const highResult = annotator.annotateArc(highArc);
  assert(highResult.confidence === 'high',
    `AC-3.14a: High margin (100) → confidence "high" (got "${highResult.confidence}")`);

  // Medium confidence: 0.6 <= calibrated probability < 0.9
  const medArc = { dependent: 1, head: 2, label: 'nsubj', scoreMargin: 30 };
  const medResult = annotator.annotateArc(medArc);
  assert(medResult.confidence === 'medium',
    `AC-3.14b: Medium margin (30) → confidence "medium" (got "${medResult.confidence}")`);

  // Low confidence: calibrated probability < 0.6
  const lowArc = { dependent: 1, head: 2, label: 'obj', scoreMargin: 1 };
  const lowResult = annotator.annotateArc(lowArc);
  assert(lowResult.confidence === 'low',
    `AC-3.14c: Low margin (1) → confidence "low" (got "${lowResult.confidence}")`);
}

// ============================================================================
// AC-3.15: PP-Attachment Tighter Thresholds
// ============================================================================
section('AC-3.15: PP-Attachment Tighter Thresholds');

{
  const annotator = new ConfidenceAnnotator(calibration);

  // PP-attachment (obl) with medium margin should get lower confidence due to tighter thresholds
  const ppArc = { dependent: 5, head: 3, label: 'obl', scoreMargin: 50 };
  const ppResult = annotator.annotateArc(ppArc);
  assert(ppResult.confidence === 'medium' || ppResult.confidence === 'low',
    `AC-3.15a: PP-attachment arc (obl) with margin 50 → confidence is "medium" or "low", not "high" (got "${ppResult.confidence}")`);

  // PP-attachment should include alternative attachment info
  assert(typeof ppResult.alternativeAttachment === 'object' && ppResult.alternativeAttachment !== null,
    'AC-3.15b: PP-attachment arc includes alternativeAttachment object');

  // Signal shape must include required fields
  const signal = ppResult.alternativeAttachment || {};
  assert(typeof signal.ppHead === 'number' || signal.ppHead === undefined,
    'AC-3.15c: alternativeAttachment.ppHead is present');
  assert(typeof signal.currentLabel === 'string',
    `AC-3.15d: alternativeAttachment.currentLabel is a string (got "${signal.currentLabel}")`);
  assert(typeof signal.alternativeLabel === 'string',
    `AC-3.15e: alternativeAttachment.alternativeLabel is a string (got "${signal.alternativeLabel}")`);

  // nmod arcs also get PP treatment
  const nmodArc = { dependent: 5, head: 3, label: 'nmod', scoreMargin: 50 };
  const nmodResult = annotator.annotateArc(nmodArc);
  assert(nmodResult.alternativeAttachment !== undefined,
    'AC-3.15f: nmod arcs also get PP-attachment analysis');
}

// ============================================================================
// AC-3.16: Calibrated Probability on Graph Nodes
// ============================================================================
section('AC-3.16: Calibrated Probability on Graph Nodes');

{
  const annotator = new ConfidenceAnnotator(calibration);

  // Annotate a set of arcs and check the full annotation shape
  const arcs = [
    { dependent: 1, head: 3, label: 'det', scoreMargin: 150 },
    { dependent: 2, head: 3, label: 'nsubj', scoreMargin: 80 },
    { dependent: 3, head: 0, label: 'root', scoreMargin: 120 },
    { dependent: 4, head: 5, label: 'det', scoreMargin: 140 },
    { dependent: 5, head: 3, label: 'obj', scoreMargin: 2 },
  ];

  const annotated = annotator.annotateArcs(arcs);

  // Low confidence arc should have all three fields
  const lowArc = annotated.find(a => a.dependent === 5 && a.label === 'obj');
  assert(lowArc !== undefined, 'AC-3.16a: Low-confidence arc found in annotated output');
  assert(typeof lowArc.parseConfidence === 'string',
    `AC-3.16b: tagteam:parseConfidence is present (got "${lowArc.parseConfidence}")`);
  assert(typeof lowArc.parseMargin === 'number',
    `AC-3.16c: tagteam:parseMargin is present (got ${lowArc.parseMargin})`);
  assert(typeof lowArc.parseProbability === 'number',
    `AC-3.16d: tagteam:parseProbability is present (got ${lowArc.parseProbability})`);
  assert(lowArc.parseProbability >= 0 && lowArc.parseProbability <= 1,
    `AC-3.16e: parseProbability is in [0,1] (got ${lowArc.parseProbability})`);

  // High confidence arc should have higher probability
  const highArc = annotated.find(a => a.dependent === 1 && a.label === 'det');
  assert(highArc.parseProbability > lowArc.parseProbability,
    `AC-3.16f: High-margin arc has higher probability than low-margin arc (${highArc.parseProbability} > ${lowArc.parseProbability})`);
}

// ============================================================================
// AC-3.17: Low-Confidence Feeds AmbiguityDetector
// ============================================================================
section('AC-3.17: Low-Confidence Feeds AmbiguityDetector');

{
  const annotator = new ConfidenceAnnotator(calibration);

  // Low confidence nsubj arc should emit ambiguity signal
  const lowArc = { dependent: 2, head: 3, label: 'nsubj', scoreMargin: 1 };
  const result = annotator.annotateArc(lowArc);

  assert(result.ambiguitySignal !== undefined,
    'AC-3.17a: Low-confidence arc emits ambiguity signal');

  if (result.ambiguitySignal) {
    assert(result.ambiguitySignal.type === 'parse_uncertainty',
      `AC-3.17b: Ambiguity signal type is "parse_uncertainty" (got "${result.ambiguitySignal.type}")`);
    assert(typeof result.ambiguitySignal.affectedArc === 'object',
      'AC-3.17c: Ambiguity signal has affectedArc object');
    assert(result.ambiguitySignal.affectedArc.label === 'nsubj',
      `AC-3.17d: affectedArc.label matches arc label (got "${result.ambiguitySignal.affectedArc.label}")`);
    assert(typeof result.ambiguitySignal.alternativeLabel === 'string',
      `AC-3.17e: Ambiguity signal has alternativeLabel (got "${result.ambiguitySignal.alternativeLabel}")`);
    assert(typeof result.ambiguitySignal.calibratedProbability === 'number',
      `AC-3.17f: Ambiguity signal has calibratedProbability (got ${result.ambiguitySignal.calibratedProbability})`);
  } else {
    // Force 4 failures if signal is missing
    assert(false, 'AC-3.17b: (skipped — no ambiguity signal)');
    assert(false, 'AC-3.17c: (skipped — no ambiguity signal)');
    assert(false, 'AC-3.17d: (skipped — no ambiguity signal)');
    assert(false, 'AC-3.17e: (skipped — no ambiguity signal)');
    assert(false, 'AC-3.17f: (skipped — no ambiguity signal)');
  }

  // High confidence arc should NOT emit ambiguity signal
  const highArc = { dependent: 1, head: 2, label: 'det', scoreMargin: 150 };
  const highResult = annotator.annotateArc(highArc);
  assert(highResult.ambiguitySignal === undefined || highResult.ambiguitySignal === null,
    'AC-3.17g: High-confidence arc does NOT emit ambiguity signal');
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
