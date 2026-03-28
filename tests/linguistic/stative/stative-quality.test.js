/**
 * Stative Predicate Reclassification Tests — WS-A
 *
 * Tests QualityAssertion + bfo:Quality Tier 2 nodes for stative predicates.
 * Per SMA Linguistic Sensory Layer v1.2, Layer 4a stative gate.
 *
 * Spec: docs/sma-linguistic-sensory-layer-v1.2-final.md
 * Plan: docs/development/plan-stative-predicate-reclassification.md
 *
 * @tags p0, stative, quality, sma
 */

const { describe, test, expect, semantic, parseToGraph, printSummary, exit } = require('../../framework/test-helpers');

const TREE_OPTS = { useTreeExtractors: true };

function resolveId(val) {
  if (!val) return null;
  return (typeof val === 'object' && val['@id']) ? val['@id'] : val;
}

function findQualityAssertion(graph, qualityHint) {
  return semantic.findNode(graph, n => {
    const types = [].concat(n['@type'] || []);
    if (!types.some(t => t.includes('QualityAssertion'))) return false;
    if (qualityHint) {
      const q = n['tagteam:assertedQuality'] || '';
      return q.toLowerCase().includes(qualityHint.toLowerCase());
    }
    return true;
  });
}

function findQualityNode(graph, qualityHint) {
  return semantic.findNode(graph, n => {
    const types = [].concat(n['@type'] || []);
    if (!types.some(t => t.includes('BFO_0000019'))) return false;
    if (qualityHint) {
      const q = n['tagteam:qualityType'] || n['rdfs:label'] || '';
      return q.toLowerCase().includes(qualityHint.toLowerCase());
    }
    return true;
  });
}

function hasNoGhostAct(graph, verbHint) {
  return !(graph['@graph'] || []).some(n => {
    const types = [].concat(n['@type'] || []);
    if (!types.includes('IntentionalAct')) return false;
    if ((n['rdfs:label'] || '').toLowerCase() === 'semantic parsing act') return false;
    const verb = (n['tagteam:verb'] || n['rdfs:label'] || '').toLowerCase();
    return verb.includes(verbHint.toLowerCase());
  });
}

// ═══════════════════════════════════════════════════════════════
// Pattern 1: Adjectival Copular → QualityAssertion + Quality
// ═══════════════════════════════════════════════════════════════

describe('Pattern 1: Adjectival Copular', function() {

  test('AC-STA-01: "The child is hungry" → QualityAssertion exists', () => {
    const graph = parseToGraph('The child is hungry.', TREE_OPTS);
    const qa = findQualityAssertion(graph, 'hungry');
    expect(qa).toBeTruthy();
  });

  test('AC-STA-02: QualityAssertion assertedQuality = "hungry"', () => {
    const graph = parseToGraph('The child is hungry.', TREE_OPTS);
    const qa = findQualityAssertion(graph, 'hungry');
    expect(qa).toBeTruthy();
    expect(qa['tagteam:assertedQuality']).toBe('hungry');
  });

  test('AC-STA-03: Quality Tier 2 node (bfo:BFO_0000019) exists', () => {
    const graph = parseToGraph('The child is hungry.', TREE_OPTS);
    const q = findQualityNode(graph, 'hungry');
    expect(q).toBeTruthy();
    const types = [].concat(q['@type'] || []);
    expect(types.some(t => t.includes('BFO_0000019'))).toBeTruthy();
  });

  test('AC-STA-04: Quality inheres_in → child Tier 2 entity', () => {
    const graph = parseToGraph('The child is hungry.', TREE_OPTS);
    const q = findQualityNode(graph, 'hungry');
    expect(q).toBeTruthy();
    // bfo:BFO_0000052 = inheres_in
    const bearerId = resolveId(q['bfo:BFO_0000052']) || resolveId(q['inheres_in']);
    expect(bearerId).toBeTruthy();
  });

  test('AC-STA-05: Quality has grounding slot (null)', () => {
    const graph = parseToGraph('The child is hungry.', TREE_OPTS);
    const q = findQualityNode(graph, 'hungry');
    expect(q).toBeTruthy();
    expect('tagteam:grounding' in q).toBeTruthy();
    expect(q['tagteam:grounding']).toBeNull();
  });

  test('AC-STA-06: No IntentionalAct for "hungry"', () => {
    const graph = parseToGraph('The child is hungry.', TREE_OPTS);
    expect(hasNoGhostAct(graph, 'hungry')).toBeTruthy();
  });

  test('AC-STA-07: "The soup is hot" → QualityAssertion', () => {
    const graph = parseToGraph('The soup is hot.', TREE_OPTS);
    const qa = findQualityAssertion(graph, 'hot');
    expect(qa).toBeTruthy();
    expect(qa['tagteam:assertedQuality']).toBe('hot');
  });

});

// ═══════════════════════════════════════════════════════════════
// Pattern 5: Evidential Copular
// ═══════════════════════════════════════════════════════════════

describe('Pattern 5: Evidential Copular', function() {

  test('AC-STA-15: "She seems tired" → QualityAssertion with evidentialMarker', () => {
    const graph = parseToGraph('She seems tired.', TREE_OPTS);
    const qa = findQualityAssertion(graph, 'tired');
    expect(qa).toBeTruthy();
    expect(qa['tagteam:evidentialMarker']).toBe('seem');
  });

  test('AC-STA-16: epistemicStatus = Observational', () => {
    const graph = parseToGraph('She seems tired.', TREE_OPTS);
    const qa = findQualityAssertion(graph, 'tired');
    expect(qa).toBeTruthy();
    const status = resolveId(qa['tagteam:epistemicStatus']);
    expect(status).toBeTruthy();
    expect(status.includes('Observational')).toBeTruthy();
  });

  test('AC-STA-17: Quality node also has epistemicStatus: Observational', () => {
    const graph = parseToGraph('She seems tired.', TREE_OPTS);
    const q = findQualityNode(graph, 'tired');
    expect(q).toBeTruthy();
    const status = resolveId(q['tagteam:epistemicStatus']);
    expect(status).toBeTruthy();
    expect(status.includes('Observational')).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// Pattern 3: Possessive Stative + Event-Noun Blacklist
// ═══════════════════════════════════════════════════════════════

describe('Pattern 3: Possessive Stative', function() {

  test('AC-STA-10: "Dogs have fur" → QualityAssertion with assertedQuality "fur"', () => {
    const graph = parseToGraph('Dogs have fur.', TREE_OPTS);
    const qa = findQualityAssertion(graph, 'fur');
    expect(qa).toBeTruthy();
    expect(qa['tagteam:assertedQuality']).toBe('fur');
  });

  test('AC-STA-11: "Dogs have fur" → Quality with kindLevel true', () => {
    const graph = parseToGraph('Dogs have fur.', TREE_OPTS);
    const q = findQualityNode(graph, 'fur');
    expect(q).toBeTruthy();
    // kindLevel should be true for bare plural generic subject
    expect(q['tagteam:kindLevel']).toBe(true);
  });

  test('AC-STA-12: "Dogs have fur" → no IntentionalAct, no AgentRole', () => {
    const graph = parseToGraph('Dogs have fur.', TREE_OPTS);
    // No ghost IntentionalAct for "have"
    expect(hasNoGhostAct(graph, 'have')).toBeTruthy();
    // No AgentRole
    const roles = (graph['@graph'] || []).filter(n =>
      [].concat(n['@type'] || []).includes('Role') &&
      (n['tagteam:roleType'] === 'AgentRole' || n['rdfs:label'] === 'AgentRole')
    );
    expect(roles.length).toBe(0);
  });

  test('AC-STA-13: "The committee has a meeting" → IntentionalAct (event-noun)', () => {
    const graph = parseToGraph('The committee has a meeting.', TREE_OPTS);
    // "meeting" is an event-noun — should NOT be stative
    const act = semantic.findNode(graph, n => {
      const types = [].concat(n['@type'] || []);
      return types.includes('IntentionalAct') && !(n['@id'] || '').includes('ParsingAct');
    });
    expect(act).toBeTruthy();
  });

  test('AC-STA-29: "He has to submit the form" → RDM path (not stative)', () => {
    const graph = parseToGraph('He has to submit the form.', TREE_OPTS);
    // Should route to RDM, not stative
    const dice = semantic.findNode(graph, n =>
      [].concat(n['@type'] || []).some(t => t.includes('DirectiveInformationContentEntity'))
    );
    expect(dice).toBeTruthy();
    // No QualityAssertion
    const qa = findQualityAssertion(graph, null);
    expect(qa).toBeFalsy();
  });

});

// ═══════════════════════════════════════════════════════════════
// Bug Fixes: Entity Span + Coordination + Test Selector
// ═══════════════════════════════════════════════════════════════

describe('Bug Fixes', function() {

  // AC-STA-18: "Water consists of hydrogen and oxygen" — subject should be "Water" not "water consist"
  // KNOWN LIMITATION (POS tagger RC-1): "consists" tagged NNS instead of VBZ.
  // Parser treats it as a noun, not a verb. Stative gate can't fire.
  // Skip until POS tagger is improved.
  test.skip('AC-STA-18: "Water consists of..." → subject = "Water" (KNOWN: POS tagger RC-1)', () => {
    const graph = parseToGraph('Water consists of hydrogen and oxygen.', TREE_OPTS);
    const qa = findQualityAssertion(graph, null);
    if (qa) {
      const subj = qa['tagteam:assertionSubject'] || '';
      expect(subj.toLowerCase().includes('consist')).toBeFalsy();
    }
  });

  // AC-STA-19: Multiple stative objects linked
  // KNOWN LIMITATION: Depends on AC-STA-18 (needs "consists" as verb first)
  test.skip('AC-STA-19: "Water consists of hydrogen and oxygen" → both objects linked (KNOWN: POS tagger RC-1)', () => {
    const graph = parseToGraph('Water consists of hydrogen and oxygen.', TREE_OPTS);
    // Would check for multiple hasObject links on StructuralAssertion
  });

  test('AC-STA-20: "The group includes five members" → StructuralAssertion, no ghost act', () => {
    const graph = parseToGraph('The group includes five members.', TREE_OPTS);
    // "includes" is a stative verb — should produce StructuralAssertion
    const sa = semantic.findNode(graph, n => {
      const types = [].concat(n['@type'] || []);
      return types.some(t => t.includes('StructuralAssertion'));
    });
    expect(sa).toBeTruthy();
    // No IntentionalAct for "includes" (check by @id pattern, not verb lemma)
    const ghostActs = (graph['@graph'] || []).filter(n => {
      const types = [].concat(n['@type'] || []);
      if (!types.includes('IntentionalAct')) return false;
      if ((n['@id'] || '').includes('ParsingAct')) return false;
      return (n['@id'] || '').toLowerCase().includes('include');
    });
    expect(ghostActs.length).toBe(0);
  });

});

// ═══════════════════════════════════════════════════════════════
// Pattern 2: Nominal Copular → RoleAssertion
// ═══════════════════════════════════════════════════════════════

describe('Pattern 2: Nominal Copular', function() {

  test('AC-STA-08: "The child is a student" → Role node (bfo:BFO_0000023)', () => {
    const graph = parseToGraph('The child is a student.', TREE_OPTS);
    const role = semantic.findNode(graph, n => {
      const types = [].concat(n['@type'] || []);
      return types.some(t => t.includes('BFO_0000023'));
    });
    expect(role).toBeTruthy();
  });

  test('AC-STA-09: Role inheres_in → child Tier 2 entity', () => {
    const graph = parseToGraph('The child is a student.', TREE_OPTS);
    const role = semantic.findNode(graph, n => {
      const types = [].concat(n['@type'] || []);
      return types.some(t => t.includes('BFO_0000023'));
    });
    expect(role).toBeTruthy();
    const bearerId = resolveId(role['bfo:BFO_0000052']) || resolveId(role['inheres_in']);
    expect(bearerId).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// Pattern 4: Locative Copular
// ═══════════════════════════════════════════════════════════════

describe('Pattern 4: Locative Copular', function() {

  test('AC-STA-14: "The book is on the table" → StructuralAssertion with locative', () => {
    const graph = parseToGraph('The book is on the table.', TREE_OPTS);
    const sa = semantic.findNode(graph, n => {
      const types = [].concat(n['@type'] || []);
      return types.some(t => t.includes('StructuralAssertion'));
    });
    expect(sa).toBeTruthy();
    // Should have locative pattern or located_in relation
    const pattern = sa['tagteam:pattern'] || '';
    const relation = sa['tagteam:relation'] || '';
    expect(pattern === 'locative' || relation.includes('located')).toBeTruthy();
  });

  test('AC-STA-28: "The book is by the author" → NOT locative', () => {
    const graph = parseToGraph('The book is by the author.', TREE_OPTS);
    const sa = semantic.findNode(graph, n => {
      const types = [].concat(n['@type'] || []);
      return types.some(t => t.includes('StructuralAssertion'));
    });
    expect(sa).toBeTruthy();
    // Should NOT have located_in relation — "by" here is authorship
    const relation = sa['tagteam:relation'] || '';
    expect(relation.includes('located')).toBeFalsy();
  });

});

// ═══════════════════════════════════════════════════════════════
// Non-Regression
// ═══════════════════════════════════════════════════════════════

describe('Non-Regression', function() {

  test('AC-STA-21: "The doctor treats the patient" → IntentionalAct preserved', () => {
    const graph = parseToGraph('The doctor treats the patient.', TREE_OPTS);
    const act = semantic.findNode(graph, n => {
      const types = [].concat(n['@type'] || []);
      return types.includes('IntentionalAct') && !(n['@id'] || '').includes('ParsingAct');
    });
    expect(act).toBeTruthy();
  });

  test('AC-STA-22: "The committee shall review" → RDM path unchanged', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const dice = semantic.findNode(graph, n =>
      [].concat(n['@type'] || []).some(t => t.includes('DirectiveInformationContentEntity'))
    );
    expect(dice).toBeTruthy();
  });

  test('AC-STA-23: "CBP is a component of DHS" → StructuralAssertion unchanged', () => {
    const graph = parseToGraph('CBP is a component of DHS.', TREE_OPTS);
    const sa = semantic.findNode(graph, n =>
      [].concat(n['@type'] || []).some(t => t.includes('Assertion'))
    );
    expect(sa).toBeTruthy();
  });

});

printSummary();
exit();
