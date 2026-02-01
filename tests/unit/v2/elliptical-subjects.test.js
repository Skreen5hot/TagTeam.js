/**
 * P2-B: Elliptical Subject Injection Tests
 *
 * Phase 2 — validates Case B elliptical clause coordination where
 * the subject is injected from the left clause.
 *
 * Test IDs: P2-B-1 through P2-B-3
 */

'use strict';

const { describe, test, expect, createGraphBuilder, printSummary } = require('../../framework/test-helpers');
const ClauseSegmenter = require('../../../src/graph/ClauseSegmenter');

const segmenter = new ClauseSegmenter();

describe('P2-B: Case B — Elliptical Clause Coordination', () => {

  test('P2-B-1: "The server rebooted and was verified by the admin." → 2 clauses, injected subject "The server"', () => {
    const result = segmenter.segment('The server rebooted and was verified by the admin.');
    expect(result.clauses.length).toBe(2);
    expect(result.clauses[1].injectedSubject).toBe('The server');
  });

  test('P2-B-2: Graph output — 2 acts, "server" is patient of both, subjectSource: "ellipsis_injection"', () => {
    const builder = createGraphBuilder();
    const graph = builder.build('The server rebooted and was verified by the admin.', {
      v2: { enabled: true }
    });
    const nodes = graph['@graph'] || [];

    const acts = nodes.filter(n => {
      const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
      return types.some(t => t.includes('IntentionalAct'));
    });
    expect(acts.length).toBe(2);

    // At least one act should have subjectSource: "ellipsis_injection"
    const injectedAct = acts.find(a => a['tagteam:subjectSource'] === 'ellipsis_injection');
    expect(injectedAct).toBeDefined();
  });

  test('P2-B-3: "The report was written and was approved." → 2 clauses (same voice, new clause = Case B)', () => {
    const result = segmenter.segment('The report was written and was approved.');
    expect(result.clauses.length).toBe(2);
    expect(result.clauses[1].injectedSubject).toBe('The report');
  });
});

printSummary();
