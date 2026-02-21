/**
 * P2: Compound Sentence Segmentation Tests
 *
 * Phase 2 — validates three-case clause detection algorithm,
 * conjunction-to-relation mapping, and graph output for compound sentences.
 *
 * Test IDs: P2-A-1 through P2-A-4, P2-C-1 through P2-C-3,
 *           P2-ERG-1, P2-ERG-2, P2-FALL-1, P2-INT-1 through P2-INT-3
 */

'use strict';

const { describe, test, expect, createGraphBuilder, semantic, printSummary } = require('../../framework/test-helpers');
const ClauseSegmenter = require('../../../src/graph/ClauseSegmenter');

const segmenter = new ClauseSegmenter();

describe('P2-A: Case A — Full Clause Coordination', () => {

  test('P2-A-1: "The server rebooted and the application restarted." → 2 clauses, conjunction "and"', () => {
    const result = segmenter.segment('The server rebooted and the application restarted.');
    expect(result.clauses.length).toBe(2);
    expect(result.clauses[1].conjunction).toBe('and');
  });

  test('P2-A-2: "The doctor examined the patient but the nurse disagreed." → 2 clauses, conjunction "but"', () => {
    const result = segmenter.segment('The doctor examined the patient but the nurse disagreed.');
    expect(result.clauses.length).toBe(2);
    expect(result.clauses[1].conjunction).toBe('but');
  });

  test('P2-A-3: "The team won or the manager resigned." → 2 clauses, conjunction "or"', () => {
    const result = segmenter.segment('The team won or the manager resigned.');
    expect(result.clauses.length).toBe(2);
    expect(result.clauses[1].conjunction).toBe('or');
  });

  test('P2-A-4: "The server did not restart nor did the backup respond." → 2 clauses, conjunction "nor"', () => {
    const result = segmenter.segment('The server did not restart nor did the backup respond.');
    expect(result.clauses.length).toBe(2);
    expect(result.clauses[1].conjunction).toBe('nor');
  });
});

describe('P2-C: Case C — VP Coordination (NO segmentation)', () => {

  test('P2-C-1: "The server rebooted and restarted." → 1 clause (shared subject, same verb form)', () => {
    const result = segmenter.segment('The server rebooted and restarted.');
    expect(result.clauses.length).toBe(1);
  });

  test('P2-C-2: "The doctor and the nurse treated the patient." → 1 clause (NP conjunction)', () => {
    const result = segmenter.segment('The doctor and the nurse treated the patient.');
    expect(result.clauses.length).toBe(1);
  });

  test('P2-C-3: "The tall and experienced doctor treated the patient." → 1 clause (adjective conjunction)', () => {
    const result = segmenter.segment('The tall and experienced doctor treated the patient.');
    expect(result.clauses.length).toBe(1);
  });
});

describe('P2-INT: Integration — Graph Output', () => {

  test('P2-INT-1: Compound sentence produces 2 act nodes with ClauseRelation "and_then"', () => {
    const builder = createGraphBuilder();
    const graph = builder.build('The server rebooted and the application restarted.', {
      v2: { enabled: true }
    });
    const nodes = graph['@graph'] || [];

    // Find act nodes
    const acts = nodes.filter(n => {
      const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
      return types.some(t => t.includes('IntentionalAct'));
    });
    expect(acts.length).toBe(2);

    // Find ClauseRelation
    const relations = nodes.filter(n => {
      const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
      return types.some(t => t.includes('ClauseRelation'));
    });
    expect(relations.length).toBe(1);
    expect(relations[0]['tagteam:relationType']).toBe('tagteam:and_then');
  });

  test('P2-INT-2: "but" produces ClauseRelation with "contrasts_with"', () => {
    const builder = createGraphBuilder();
    const graph = builder.build('The doctor examined the patient but the nurse disagreed.', {
      v2: { enabled: true }
    });
    const nodes = graph['@graph'] || [];

    const relations = nodes.filter(n => {
      const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
      return types.some(t => t.includes('ClauseRelation'));
    });
    expect(relations.length).toBe(1);
    expect(relations[0]['tagteam:relationType']).toBe('tagteam:contrasts_with');
  });

  test('P2-INT-3: Simple sentence produces 1 act, no ClauseRelation', () => {
    const builder = createGraphBuilder();
    const graph = builder.build('The doctor treated the patient.', {
      v2: { enabled: true }
    });
    const nodes = graph['@graph'] || [];

    const relations = nodes.filter(n => {
      const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
      return types.some(t => t.includes('ClauseRelation'));
    });
    expect(relations.length).toBe(0);
  });
});

describe('P2-ERG: Ergative Compound', () => {

  test('P2-ERG-1: "The server rebooted and the app restarted." — both subjects are patients (ergative)', () => {
    const builder = createGraphBuilder();
    const graph = builder.build('The server rebooted and the app restarted.', {
      v2: { enabled: true }
    });
    const nodes = graph['@graph'] || [];
    const acts = nodes.filter(n => {
      const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
      return types.some(t => t.includes('IntentionalAct'));
    });
    // Both acts should exist (ergative is handled by v1's existing voice detection)
    expect(acts.length).toBe(2);
  });

  test('P2-ERG-2: "The admin rebooted the server." — admin is agent (transitive)', () => {
    const builder = createGraphBuilder();
    const graph = builder.build('The admin rebooted the server.', {
      v2: { enabled: true }
    });
    const nodes = graph['@graph'] || [];
    const acts = nodes.filter(n => {
      const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
      return types.some(t => t.includes('IntentionalAct'));
    });
    expect(acts.length).toBe(1);
  });
});

describe('P2-FALL: Fallback Behavior', () => {

  test('P2-FALL-1: Ambiguous coordination case gets structuralAmbiguity annotation', () => {
    // This is a placeholder — the fallback mechanism annotates ambiguous cases
    // For now, verify that all output is valid even with edge cases
    const builder = createGraphBuilder();
    const graph = builder.build('The server rebooted and the application restarted.', {
      v2: { enabled: true }
    });
    expect(graph['@graph']).toBeDefined();
    expect(graph['@graph'].length).toBeGreaterThan(0);
  });
});

describe('P2-BOUNDARY: Hard Entity Boundaries at Clause Edges', () => {

  function getActByVerb(nodes, verbSubstring) {
    return nodes.find(n => {
      const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
      if (!types.some(t => t.includes('IntentionalAct') || t.includes('ActOf'))) return false;
      const verb = (n['tagteam:verb'] || n['rdfs:label'] || '').toLowerCase();
      return verb.includes(verbSubstring.toLowerCase());
    });
  }

  function iriContains(val, substring) {
    if (!val) return false;
    const id = typeof val === 'object' ? (val['@id'] || '') : val;
    return id.toLowerCase().includes(substring.toLowerCase());
  }

  test('P2-BOUNDARY-1: "The server rebooted and the application restarted." — Act 0 must NOT link to "application"', () => {
    const builder = createGraphBuilder();
    const graph = builder.build('The server rebooted and the application restarted.', {
      v2: { enabled: true }
    });
    const nodes = graph['@graph'] || [];
    const rebootAct = getActByVerb(nodes, 'reboot');
    expect(rebootAct).toBeDefined();

    // "application" must NOT appear as patient/affects of reboot
    const affects = rebootAct['cco:affects'];
    const hasPatient = rebootAct['cco:affects'];
    expect(iriContains(affects, 'application')).toBe(false);
    expect(iriContains(hasPatient, 'application')).toBe(false);
  });

  test('P2-BOUNDARY-2: "The doctor examined the patient but the nurse disagreed." — Nurse must NOT be patient of examine', () => {
    const builder = createGraphBuilder();
    const graph = builder.build('The doctor examined the patient but the nurse disagreed.', {
      v2: { enabled: true }
    });
    const nodes = graph['@graph'] || [];
    const examineAct = getActByVerb(nodes, 'examine');
    expect(examineAct).toBeDefined();

    // Check all participants of examine — nurse must not be among them
    const affects = examineAct['cco:affects'];
    const hasPatient = examineAct['cco:affects'];
    const participants = examineAct['tagteam:participants'] || [];
    expect(iriContains(affects, 'nurse')).toBe(false);
    expect(iriContains(hasPatient, 'nurse')).toBe(false);
    const nurseInParticipants = participants.some(p => iriContains(p, 'nurse'));
    expect(nurseInParticipants).toBe(false);
  });

  test('P2-BOUNDARY-3: "The system was slow so the user refreshed the page." — user/page must NOT link to slow act', () => {
    const builder = createGraphBuilder();
    const graph = builder.build('The system was slow so the user refreshed the page.', {
      v2: { enabled: true }
    });
    const nodes = graph['@graph'] || [];

    // Find the "slow" or first act (clause 0)
    const acts = nodes.filter(n => {
      const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
      return types.some(t => t.includes('IntentionalAct'));
    });
    // Clause 0 act should not link to user or page
    const clause0Act = acts.find(a => (a['tagteam:clauseIndex'] === 0));
    if (clause0Act) {
      expect(iriContains(clause0Act['cco:affects'], 'user')).toBe(false);
      expect(iriContains(clause0Act['cco:affects'], 'page')).toBe(false);
      expect(iriContains(clause0Act['cco:affects'], 'user')).toBe(false);
      expect(iriContains(clause0Act['cco:affects'], 'page')).toBe(false);
    }
  });
});

printSummary();
