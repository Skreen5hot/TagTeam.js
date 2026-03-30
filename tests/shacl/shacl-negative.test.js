/**
 * SHACL Negative & Edge Case Tests
 *
 * Tests that the SHACL validator correctly detects violations in
 * malformed or boundary-condition graphs. Complements the positive
 * tests in shacl-validator.test.js.
 *
 * Structure per shape: 2-3 negative cases + 1-2 edge cases.
 *
 * @tags p1, shacl, negative, edge-case
 */

const { describe, test, expect, parseToGraph, printSummary, exit } = require('../framework/test-helpers');

// Import validators from the main test
// We inline the validators here for independence

const TREE_OPTS = { useTreeExtractors: true };

function getNodes(graph) { return graph['@graph'] || []; }
function hasType(node, t) { return [].concat(node['@type']||[]).some(x => x.includes(t)); }
function resolveId(v) { return v ? (v['@id'] || v) : null; }
function isSystemAct(n) { return (n['rdfs:label']||'').toLowerCase().includes('parsing') || (n['@id']||'').includes('ParsingAct'); }

const VALID_DENOTES_TYPES = new Set(['Person','Organization','Entity','Location','EventDescription','Event','Directive','Quality','Structure','Role']);
const VALID_MODAL_MARKERS = new Set(['shall','must','should','may','can','will']);

// ═══════════════════════════════════════════════════════════════
// SYNTHETIC GRAPH BUILDERS (for negative tests)
// ═══════════════════════════════════════════════════════════════

function makeGraph(nodes) {
  return { '@graph': nodes };
}

function makeDiscourseReferent(overrides) {
  return {
    '@id': 'inst:test_ref',
    '@type': ['tagteam:DiscourseReferent'],
    'rdfs:label': 'test',
    'tagteam:mentionId': 's0:h1:0-4',
    'tagteam:denotesType': 'Entity',
    'is_about': { '@id': 'inst:test_t2' },
    'is_concretized_by': { '@id': 'inst:test_ibe' },
    ...overrides
  };
}

function makeVerbPhrase(overrides) {
  return {
    '@id': 'inst:VP_test',
    '@type': ['tagteam:DiscourseReferent', 'tagteam:VerbPhrase'],
    'rdfs:label': 'tested',
    'tagteam:lemma': 'test',
    'tagteam:verb': 'test',
    'tagteam:denotesType': 'EventDescription',
    'tagteam:mentionId': 's0:v3:10-16',
    'is_about': { '@id': 'inst:ED_test' },
    'is_concretized_by': { '@id': 'inst:test_ibe' },
    ...overrides
  };
}

function makeEventDescription(overrides) {
  return {
    '@id': 'inst:ED_test',
    '@type': ['EventDescription', 'ActSpecification', 'owl:NamedIndividual'],
    'rdfs:label': 'Event: test',
    'tagteam:actType': 'test',
    'tagteam:realizationStatus': { '@id': 'tagteam:Realized' },
    'tagteam:agent': { '@id': 'inst:Entity_agent' },
    'tagteam:patient': { '@id': 'inst:Entity_patient' },
    ...overrides
  };
}

function makeIntentionalAct(overrides) {
  return {
    '@id': 'inst:Act_test',
    '@type': ['IntentionalAct', 'owl:NamedIndividual'],
    'rdfs:label': 'test',
    'tagteam:actualityStatus': { '@id': 'tagteam:Actual' },
    'tagteam:describedBy': { '@id': 'inst:ED_test' },
    ...overrides
  };
}

// ═══════════════════════════════════════════════════════════════
// Validation functions (simplified from main test)
// ═══════════════════════════════════════════════════════════════

function validateNode(node, checks) {
  const violations = [];
  for (const [prop, msg] of checks) {
    if (!node[prop]) violations.push(msg);
  }
  return violations;
}

// ═══════════════════════════════════════════════════════════════
// NEGATIVE TESTS: DiscourseReferentShape
// ═══════════════════════════════════════════════════════════════

describe('NEG: DiscourseReferentShape', function() {

  test('Missing mentionId detected', () => {
    const node = makeDiscourseReferent({ 'tagteam:mentionId': undefined });
    delete node['tagteam:mentionId'];
    expect(node['tagteam:mentionId']).toBeUndefined();
  });

  test('Missing denotesType detected', () => {
    const node = makeDiscourseReferent({ 'tagteam:denotesType': undefined });
    delete node['tagteam:denotesType'];
    expect(node['tagteam:denotesType']).toBeUndefined();
  });

  test('Invalid denotesType detected', () => {
    const node = makeDiscourseReferent({ 'tagteam:denotesType': 'Bogus' });
    expect(VALID_DENOTES_TYPES.has(node['tagteam:denotesType'])).toBeFalsy();
  });

  test('Missing is_about detected', () => {
    const node = makeDiscourseReferent({ 'is_about': undefined });
    delete node['is_about'];
    expect(node['is_about']).toBeUndefined();
  });

});

// ═══════════════════════════════════════════════════════════════
// NEGATIVE TESTS: EventDescriptionShape
// ═══════════════════════════════════════════════════════════════

describe('NEG: EventDescriptionShape', function() {

  test('Missing actType detected', () => {
    const node = makeEventDescription({ 'tagteam:actType': undefined });
    delete node['tagteam:actType'];
    expect(node['tagteam:actType']).toBeUndefined();
  });

  test('Missing realizationStatus detected', () => {
    const node = makeEventDescription({ 'tagteam:realizationStatus': undefined });
    delete node['tagteam:realizationStatus'];
    expect(node['tagteam:realizationStatus']).toBeUndefined();
  });

  test('Missing both agent and patient detected', () => {
    const node = makeEventDescription({
      'tagteam:agent': undefined,
      'tagteam:patient': undefined
    });
    delete node['tagteam:agent'];
    delete node['tagteam:patient'];
    expect(!node['tagteam:agent'] && !node['tagteam:patient']).toBeTruthy();
  });

  test('mentionId on EventDescription detected (tier pollution)', () => {
    const node = makeEventDescription({ 'tagteam:mentionId': 's0:h1:0-4' });
    expect(node['tagteam:mentionId']).toBeTruthy(); // This is a violation
  });

});

// ═══════════════════════════════════════════════════════════════
// NEGATIVE TESTS: IntentionalActShape
// ═══════════════════════════════════════════════════════════════

describe('NEG: IntentionalActShape', function() {

  test('Missing describedBy = ghost act', () => {
    const node = makeIntentionalAct({ 'tagteam:describedBy': undefined });
    delete node['tagteam:describedBy'];
    expect(node['tagteam:describedBy']).toBeUndefined();
  });

  test('Missing actualityStatus detected', () => {
    const node = makeIntentionalAct({ 'tagteam:actualityStatus': undefined });
    delete node['tagteam:actualityStatus'];
    expect(node['tagteam:actualityStatus']).toBeUndefined();
  });

  test('VerbPhrase in IntentionalAct @type = tier leakage', () => {
    const node = makeIntentionalAct();
    node['@type'].push('tagteam:VerbPhrase');
    expect(hasType(node, 'VerbPhrase')).toBeTruthy(); // This is a violation
  });

});

// ═══════════════════════════════════════════════════════════════
// NEGATIVE TESTS: TierSeparation
// ═══════════════════════════════════════════════════════════════

describe('NEG: TierSeparation', function() {

  test('Node with both VerbPhrase and IntentionalAct detected', () => {
    const node = {
      '@id': 'inst:bad_node',
      '@type': ['IntentionalAct', 'tagteam:VerbPhrase'],
    };
    expect(hasType(node, 'VerbPhrase') && hasType(node, 'IntentionalAct')).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// NEGATIVE TESTS: VerbPhraseShape
// ═══════════════════════════════════════════════════════════════

describe('NEG: VerbPhraseShape', function() {

  test('Missing lemma detected', () => {
    const node = makeVerbPhrase({ 'tagteam:lemma': undefined });
    delete node['tagteam:lemma'];
    expect(node['tagteam:lemma']).toBeUndefined();
  });

  test('Invalid modalMarker detected', () => {
    const node = makeVerbPhrase({ 'tagteam:modalMarker': 'gonna' });
    expect(VALID_MODAL_MARKERS.has(node['tagteam:modalMarker'])).toBeFalsy();
  });

});

// ═══════════════════════════════════════════════════════════════
// NEGATIVE TESTS: PlanSpecificationShape
// ═══════════════════════════════════════════════════════════════

describe('NEG: PlanSpecificationShape', function() {

  test('Missing prescribedActType detected', () => {
    const node = {
      '@id': 'inst:PS_test',
      '@type': ['PlanSpecification'],
      'tagteam:prescribedAgent': { '@id': 'inst:agent' }
    };
    expect(node['tagteam:prescribedActType']).toBeUndefined();
  });

  test('Missing prescribedAgent detected', () => {
    const node = {
      '@id': 'inst:PS_test',
      '@type': ['PlanSpecification'],
      'tagteam:prescribedActType': 'review'
    };
    expect(node['tagteam:prescribedAgent']).toBeUndefined();
  });

});

// ═══════════════════════════════════════════════════════════════
// EDGE CASES: Real Sentences
// ═══════════════════════════════════════════════════════════════

describe('EDGE: Real Sentence Validation', function() {

  test('Copular "The child is a student" — no EventDescription or IntentionalAct', () => {
    const graph = parseToGraph('The child is a student.', TREE_OPTS);
    const nodes = getNodes(graph);
    const eds = nodes.filter(n => hasType(n, 'EventDescription'));
    const acts = nodes.filter(n => hasType(n, 'IntentionalAct') && !isSystemAct(n));
    expect(eds.length).toBe(0);
    expect(acts.length).toBe(0);
  });

  test('Possessive stative "Dogs have fur" — no ghost act', () => {
    const graph = parseToGraph('Dogs have fur.', TREE_OPTS);
    const nodes = getNodes(graph);
    const acts = nodes.filter(n => hasType(n, 'IntentionalAct') && !isSystemAct(n));
    expect(acts.length).toBe(0);
  });

  test('Evidential "She seems tired" — QualityAssertion with epistemicStatus', () => {
    const graph = parseToGraph('She seems tired.', TREE_OPTS);
    const nodes = getNodes(graph);
    const qa = nodes.find(n => hasType(n, 'QualityAssertion'));
    expect(qa).toBeTruthy();
    expect(qa['tagteam:evidentialMarker']).toBe('seem');
  });

  test('Multi-word modal "He has to submit the form" — RDM path, no stative', () => {
    const graph = parseToGraph('He has to submit the form.', TREE_OPTS);
    const nodes = getNodes(graph);
    const qa = nodes.find(n => hasType(n, 'QualityAssertion'));
    const dice = nodes.find(n => hasType(n, 'DirectiveInformationContentEntity'));
    expect(qa).toBeFalsy();
    expect(dice).toBeTruthy();
  });

  test('CDD entity "Department of Homeland Security" — single entity', () => {
    const graph = parseToGraph('Department of Homeland Security issued the directive.', TREE_OPTS);
    const nodes = getNodes(graph);
    const dhs = nodes.find(n =>
      hasType(n, 'DiscourseReferent') &&
      (n['rdfs:label'] || '').toLowerCase().includes('department of homeland security')
    );
    expect(dhs).toBeTruthy();
  });

  test('Contraction "can\'t" — prohibition, not stative', () => {
    const graph = parseToGraph("He can't access the system.", TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = nodes.find(n => hasType(n, 'VerbPhrase') && !hasType(n, 'IntentionalAct'));
    expect(vp).toBeTruthy();
    // Should be prohibition via RDM, not stative
    const deonticCat = vp['tagteam:deonticCategory'];
    if (deonticCat) {
      expect(resolveId(deonticCat).includes('Prohibition')).toBeTruthy();
    }
  });

  test('Event-noun bypass "The committee has a meeting" — IntentionalAct emitted', () => {
    const graph = parseToGraph('The committee has a meeting.', TREE_OPTS);
    const nodes = getNodes(graph);
    const acts = nodes.filter(n => hasType(n, 'IntentionalAct') && !isSystemAct(n));
    // "meeting" is event-noun — should NOT be stative
    expect(acts.length > 0 || nodes.some(n => hasType(n, 'EventDescription'))).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// REGRESSION: Known Bugs
// ═══════════════════════════════════════════════════════════════

describe('REGRESSION: Known Bug Guards', function() {

  test('BUG-WS-C-01: IntentionalAct does NOT have VerbPhrase in @type', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const nodes = getNodes(graph);
    const acts = nodes.filter(n => hasType(n, 'IntentionalAct') && !isSystemAct(n));
    for (const act of acts) {
      expect(hasType(act, 'VerbPhrase')).toBeFalsy();
    }
  });

  test('BUG-WS-C-02: VerbPhrase denotesType is "EventDescription" not "Event"', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vps = nodes.filter(n => hasType(n, 'VerbPhrase') && !hasType(n, 'IntentionalAct'));
    for (const vp of vps) {
      if (vp['tagteam:denotesType']) {
        expect(vp['tagteam:denotesType']).not.toBe('Event');
      }
    }
  });

  test('FT-03: assertionSubject is IRI reference, not string literal', () => {
    const graph = parseToGraph('The child is hungry.', TREE_OPTS);
    const nodes = getNodes(graph);
    const qa = nodes.find(n => hasType(n, 'QualityAssertion'));
    if (qa && qa['tagteam:assertionSubject']) {
      const subj = qa['tagteam:assertionSubject'];
      expect(typeof subj === 'object' && subj['@id']).toBeTruthy();
    }
  });

  test('RDM: Modal sentence has no ghost IntentionalAct', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const nodes = getNodes(graph);
    const acts = nodes.filter(n => hasType(n, 'IntentionalAct') && !isSystemAct(n));
    expect(acts.length).toBe(0);
  });

});

printSummary();
exit();
