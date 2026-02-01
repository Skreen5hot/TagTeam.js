/**
 * P1-SCAFFOLD: ClauseSegmenter Scaffold Tests
 *
 * Phase 1 — validates that the no-op ClauseSegmenter integrates into
 * the v2 pipeline without changing v1 behavior.
 *
 * Test IDs: P1-SCAFFOLD-1 through P1-SCAFFOLD-4
 */

'use strict';

const { describe, test, expect, createGraphBuilder, printSummary } = require('../../framework/test-helpers');
const ClauseSegmenter = require('../../../src/graph/ClauseSegmenter');

const GOLDEN_SENTENCES = [
  'The doctor treated the patient.',
  'The administrator reviewed the report.',
  'The nurse monitored the patient.',
  'The engineer designed the system.',
  'The manager approved the budget.',
  'The teacher evaluated the student.',
  'The auditor examined the records.',
  'The pilot flew the aircraft.',
  'The chef prepared the meal.',
  'The scientist analyzed the data.'
];

/**
 * Strip non-deterministic fields (IRIs, timestamps) for structural comparison.
 */
function structuralFingerprint(graph) {
  const s = JSON.stringify(graph);
  return s
    .replace(/inst:[A-Za-z0-9_]+/g, 'IRI')
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.Z]+/g, 'TS');
}

describe('P1-SCAFFOLD: ClauseSegmenter Pipeline Scaffold', () => {

  test('P1-SCAFFOLD-1: segment() returns single clause for simple sentence', () => {
    const segmenter = new ClauseSegmenter();
    const input = 'The doctor treated the patient.';
    const result = segmenter.segment(input);

    expect(result.clauses.length).toBe(1);
    expect(result.clauses[0].text).toBe(input);
  });

  test('P1-SCAFFOLD-2: Clause shape has required properties', () => {
    const segmenter = new ClauseSegmenter();
    const result = segmenter.segment('The doctor treated the patient.');
    const clause = result.clauses[0];

    expect(clause.text).toBeDefined();
    expect(clause.start).toBeDefined();
    expect(clause.end).toBeDefined();
    expect(clause.index).toBeDefined();
    expect(clause.conjunction).toBeDefined();
    expect(clause.clauseType).toBeDefined();

    // Verify values
    expect(clause.start).toBe(0);
    expect(clause.end).toBe('The doctor treated the patient.'.length);
    expect(clause.index).toBe(0);
    expect(clause.conjunction).toBeNull();
    expect(clause.clauseType).toBe('independent');
  });

  test('P1-SCAFFOLD-3: build() output structurally identical to v1 for 10 golden sentences', () => {
    for (const sentence of GOLDEN_SENTENCES) {
      // v1 baseline (no v2)
      const b1 = createGraphBuilder();
      const g1 = b1.build(sentence);

      // v2 enabled
      const b2 = createGraphBuilder();
      const g2 = b2.build(sentence, { v2: { enabled: true } });

      const fp1 = structuralFingerprint(g1);
      const fp2 = structuralFingerprint(g2);
      if (fp1 !== fp2) {
        throw new Error(`Output differs for: "${sentence}"`);
      }
    }
  });

  test('P1-SCAFFOLD-4: Clause boundaries visible in _debug when verbose: true', () => {
    const builder = createGraphBuilder();
    const result = builder.build('The doctor treated the patient.', {
      v2: { enabled: true },
      verbose: true
    });

    expect(result._debug).toBeDefined();
    expect(result._debug.clauses).toBeDefined();
    expect(Array.isArray(result._debug.clauses)).toBe(true);
    expect(result._debug.clauses.length).toBe(1);
    expect(result._debug.clauses[0].text).toBe('The doctor treated the patient.');
  });
});

printSummary();
