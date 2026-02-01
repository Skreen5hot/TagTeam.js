/**
 * P0-CFG: v2 Configuration Passthrough Tests
 *
 * Phase 0 — validates that the v2 config namespace is accepted by
 * SemanticGraphBuilder.build() without changing behavior when disabled.
 *
 * Test IDs: P0-CFG-1, P0-CFG-2
 */

'use strict';

const { describe, test, expect, createGraphBuilder, printSummary } = require('../../framework/test-helpers');

/**
 * Strip generated IRIs and timestamps for structural comparison.
 */
function structuralFingerprint(graph) {
  const s = JSON.stringify(graph);
  return s
    .replace(/inst:[A-Za-z0-9_]+/g, 'IRI')
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.Z]+/g, 'TS');
}

describe('P0-CFG: v2 Configuration Passthrough', () => {

  test('P0-CFG-1: build(text, { v2: { enabled: false } }) produces structurally identical output to build(text)', () => {
    const text = 'The doctor treated the patient.';

    const builder1 = createGraphBuilder();
    const g1 = builder1.build(text);

    const builder2 = createGraphBuilder();
    const g2 = builder2.build(text, { v2: { enabled: false } });

    expect(structuralFingerprint(g1)).toBe(structuralFingerprint(g2));
  });

  test('P0-CFG-2: build(text, { v2: { enabled: true } }) produces valid output (no errors)', () => {
    const builder = createGraphBuilder();
    let threw = false;
    let graph;
    try {
      graph = builder.build('The doctor treated the patient.', {
        v2: {
          enabled: true,
          clauseSegmentation: { enabled: true, ellipsisInjection: true },
          speechActNodes: { questions: true, directives: true, conditionals: true },
          discourse: { enabled: false }
        }
      });
    } catch (e) {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(graph).toBeDefined();
    expect(graph['@graph']).toBeDefined();
    expect(graph['@graph'].length).toBeGreaterThan(0);
  });
});

printSummary();
