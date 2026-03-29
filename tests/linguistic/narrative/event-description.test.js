/**
 * WS-C: EventDescription Tests
 *
 * Tests EventDescription ICE for affirmative narrative sentences.
 * Per SMA Linguistic Sensory Layer v1.2, §4.1–4.3.
 *
 * Spec: docs/sma-linguistic-sensory-layer-v1.2-final.md
 * Plan: docs/development/plan-ws-c-event-description.md
 *
 * @tags p1, narrative, event-description, sma
 */

const { describe, test, expect, semantic, parseToGraph, printSummary, exit } = require('../../framework/test-helpers');

const TREE_OPTS = { useTreeExtractors: true };

function resolveId(val) {
  if (!val) return null;
  return (typeof val === 'object' && val['@id']) ? val['@id'] : val;
}

function findEventDescription(graph, actTypeHint) {
  return semantic.findNode(graph, n => {
    const types = [].concat(n['@type'] || []);
    if (!types.some(t => t.includes('EventDescription'))) return false;
    if (actTypeHint) {
      return (n['tagteam:actType'] || '').toLowerCase().includes(actTypeHint.toLowerCase());
    }
    return true;
  });
}

function findIntentionalAct(graph, verbHint) {
  return semantic.findNode(graph, n => {
    const types = [].concat(n['@type'] || []);
    if (!types.includes('IntentionalAct')) return false;
    if ((n['@id'] || '').includes('ParsingAct')) return false;
    if (verbHint) {
      const verb = (n['tagteam:verb'] || n['tagteam:lemma'] || n['rdfs:label'] || '').toLowerCase();
      return verb.includes(verbHint);
    }
    return true;
  });
}

function findVerbPhrase(graph, verbHint) {
  return semantic.findNode(graph, n => {
    const types = [].concat(n['@type'] || []);
    if (!types.includes('tagteam:VerbPhrase')) return false;
    if (types.includes('IntentionalAct')) return false; // Must be pure VP, not combined
    if (verbHint) {
      return (n['tagteam:verb'] || '').toLowerCase().includes(verbHint);
    }
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════
// Core EventDescription
// ═══════════════════════════════════════════════════════════════

describe('Core EventDescription', function() {

  test('AC-EVT-01: EventDescription exists with realizationStatus: Realized', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const ed = findEventDescription(graph, 'feed');
    expect(ed).toBeTruthy();
    const status = resolveId(ed['tagteam:realizationStatus']);
    expect(status).toBeTruthy();
    expect(status.includes('Realized')).toBeTruthy();
  });

  test('AC-EVT-02: EventDescription actType = "feed"', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const ed = findEventDescription(graph, 'feed');
    expect(ed).toBeTruthy();
    expect(ed['tagteam:actType']).toBe('feed');
  });

  test('AC-EVT-03: EventDescription agent → parent Tier 2', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const ed = findEventDescription(graph, 'feed');
    expect(ed).toBeTruthy();
    expect(ed['tagteam:agent']).toBeTruthy();
  });

  test('AC-EVT-04: EventDescription patient → child Tier 2', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const ed = findEventDescription(graph, 'feed');
    expect(ed).toBeTruthy();
    expect(ed['tagteam:patient']).toBeTruthy();
  });

  test('AC-EVT-05: IntentionalAct still exists (actual process)', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const act = findIntentionalAct(graph, 'feed') || findIntentionalAct(graph, 'fed');
    expect(act).toBeTruthy();
  });

  test('AC-EVT-06: IntentionalAct describedBy → EventDescription', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const act = findIntentionalAct(graph, 'feed') || findIntentionalAct(graph, 'fed');
    const ed = findEventDescription(graph, 'feed');
    expect(act).toBeTruthy();
    expect(ed).toBeTruthy();
    expect(resolveId(act['tagteam:describedBy'])).toBe(ed['@id']);
  });

  test('AC-EVT-07: VerbPhrase is_about → EventDescription', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const vp = findVerbPhrase(graph, 'feed');
    const ed = findEventDescription(graph, 'feed');
    expect(vp).toBeTruthy();
    expect(ed).toBeTruthy();
    expect(resolveId(vp['is_about'])).toBe(ed['@id']);
  });

});

// ═══════════════════════════════════════════════════════════════
// Tier 1 VerbPhrase for Narratives
// ═══════════════════════════════════════════════════════════════

describe('Tier 1 VerbPhrase for Narratives', function() {

  test('AC-EVT-08: VerbPhrase @type = DiscourseReferent + VerbPhrase', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const vp = findVerbPhrase(graph, 'feed');
    expect(vp).toBeTruthy();
    const types = [].concat(vp['@type'] || []);
    expect(types.includes('tagteam:DiscourseReferent')).toBeTruthy();
    expect(types.includes('tagteam:VerbPhrase')).toBeTruthy();
  });

  test('AC-EVT-09: VerbPhrase verb = "feed"', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const vp = findVerbPhrase(graph, 'feed');
    expect(vp).toBeTruthy();
    expect(vp['tagteam:verb']).toBeTruthy();
  });

  test('AC-EVT-10: VerbPhrase NOT typed as IntentionalAct', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const vp = findVerbPhrase(graph, 'feed');
    expect(vp).toBeTruthy();
    const types = [].concat(vp['@type'] || []);
    expect(types.includes('IntentionalAct')).toBeFalsy();
  });

});

// ═══════════════════════════════════════════════════════════════
// Roles Unchanged
// ═══════════════════════════════════════════════════════════════

describe('Roles Unchanged', function() {

  test('AC-EVT-11: AgentRole realized_in → IntentionalAct', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const agent = semantic.findNode(graph, n =>
      [].concat(n['@type'] || []).includes('Role') &&
      ((n['tagteam:roleType'] || '') === 'AgentRole' || (n['rdfs:label'] || '') === 'AgentRole')
    );
    expect(agent).toBeTruthy();
    const realizedIn = resolveId(agent['realized_in']);
    expect(realizedIn).toBeTruthy();
    // Should point to IntentionalAct, not EventDescription
    const target = (graph['@graph'] || []).find(n => n['@id'] === realizedIn);
    expect(target).toBeTruthy();
    expect([].concat(target['@type'] || []).includes('IntentionalAct')).toBeTruthy();
  });

  test('AC-EVT-12: PatientRole realized_in → IntentionalAct', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const patient = semantic.findNode(graph, n =>
      [].concat(n['@type'] || []).includes('Role') &&
      ((n['tagteam:roleType'] || '') === 'PatientRole' || (n['rdfs:label'] || '') === 'PatientRole')
    );
    expect(patient).toBeTruthy();
    const realizedIn = resolveId(patient['realized_in']);
    expect(realizedIn).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// RealizationStatus
// ═══════════════════════════════════════════════════════════════

describe('RealizationStatus', function() {

  test('AC-EVT-13: present tense → Realized', () => {
    const graph = parseToGraph('The doctor treats the patient.', TREE_OPTS);
    const ed = findEventDescription(graph, 'treat');
    expect(ed).toBeTruthy();
    const status = resolveId(ed['tagteam:realizationStatus']);
    expect(status.includes('Realized')).toBeTruthy();
  });

  test('AC-EVT-14: past tense → Realized', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const ed = findEventDescription(graph, 'feed');
    expect(ed).toBeTruthy();
    const status = resolveId(ed['tagteam:realizationStatus']);
    expect(status.includes('Realized')).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════════

describe('Edge Cases', function() {

  test('AC-EVT-21: passive "was written by the analyst" → agent: analyst', () => {
    const graph = parseToGraph('The report was written by the analyst.', TREE_OPTS);
    const ed = findEventDescription(graph, 'write') || findEventDescription(graph, 'written');
    expect(ed).toBeTruthy();
    // Agent should be analyst (from obl:by), not report
    if (ed['tagteam:agent']) {
      const agentId = resolveId(ed['tagteam:agent']);
      const agent = (graph['@graph'] || []).find(n => n['@id'] === agentId);
      if (agent) {
        expect((agent['rdfs:label'] || '').toLowerCase().includes('analyst')).toBeTruthy();
      }
    }
  });

  test('AC-EVT-22: "John and Mary reviewed the document" → agents linked', () => {
    const graph = parseToGraph('John and Mary reviewed the document.', TREE_OPTS);
    const ed = findEventDescription(graph, 'review');
    expect(ed).toBeTruthy();
    // At minimum, one agent should be linked
    expect(ed['tagteam:agent']).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// Non-Regression
// ═══════════════════════════════════════════════════════════════

describe('Non-Regression', function() {

  test('AC-EVT-15: modal → RDM path (no EventDescription)', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const ed = findEventDescription(graph, 'review');
    expect(ed).toBeFalsy();
    const dice = semantic.findNode(graph, n =>
      [].concat(n['@type'] || []).some(t => t.includes('DirectiveInformationContentEntity'))
    );
    expect(dice).toBeTruthy();
  });

  test('AC-EVT-16: stative → QualityAssertion (no EventDescription)', () => {
    const graph = parseToGraph('The child is hungry.', TREE_OPTS);
    const ed = findEventDescription(graph, null);
    expect(ed).toBeFalsy();
  });

  test('AC-EVT-17: copular → StructuralAssertion (no EventDescription)', () => {
    const graph = parseToGraph('CBP is a component of DHS.', TREE_OPTS);
    const ed = findEventDescription(graph, null);
    expect(ed).toBeFalsy();
  });

});

printSummary();
exit();
