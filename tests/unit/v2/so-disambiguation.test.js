/**
 * P2-SO: "So" Disambiguation Tests
 *
 * Phase 2 — validates "so" disambiguation between Result (therefore)
 * and Purpose (in_order_that) per v2Spec §3.1.3.
 *
 * Test IDs: P2-SO-1 through P2-SO-4
 */

'use strict';

const { describe, test, expect, createGraphBuilder, printSummary } = require('../../framework/test-helpers');
const ClauseSegmenter = require('../../../src/graph/ClauseSegmenter');

const segmenter = new ClauseSegmenter();

describe('P2-SO: "So" Disambiguation (Result vs Purpose)', () => {

  test('P2-SO-1: "The system was slow so the user refreshed." → therefore (Result, indicative, no modal)', () => {
    const result = segmenter.segment('The system was slow so the user refreshed.');
    expect(result.clauses.length).toBe(2);
    expect(result.clauses[1].conjunction).toBe('so');
    expect(result.relation).toBe('tagteam:therefore');
  });

  test('P2-SO-2: "He worked late so he could finish." → in_order_that (Purpose, modal "could")', () => {
    const result = segmenter.segment('He worked late so he could finish.');
    expect(result.clauses.length).toBe(2);
    expect(result.relation).toBe('tagteam:in_order_that');
  });

  test('P2-SO-3: "He worked late so that he could finish." → in_order_that (Purpose, "so that")', () => {
    const result = segmenter.segment('He worked late so that he could finish.');
    expect(result.clauses.length).toBe(2);
    expect(result.relation).toBe('tagteam:in_order_that');
  });

  test('P2-SO-4: "He left early so as to avoid traffic." → in_order_that (Purpose, "so as to")', () => {
    const result = segmenter.segment('He left early so as to avoid traffic.');
    expect(result.clauses.length).toBe(2);
    expect(result.relation).toBe('tagteam:in_order_that');
  });
});

printSummary();
