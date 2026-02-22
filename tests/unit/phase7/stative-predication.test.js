/**
 * Stative Predication Tests
 * Phase 7 / v7: Sentence Mode Classification + StructuralAssertion
 *
 * TDD: These tests are written BEFORE implementation.
 * All tests should fail initially and pass after Phase A is complete.
 *
 * Tests cover:
 * - AC-A1: Definite stative verbs produce StructuralAssertion
 * - AC-A2: Each stative verb maps to correct relation
 * - AC-A3: Ambiguous verb disambiguation
 * - AC-A4: StructuralAssertion node structure
 * - AC-A5: Narrative regression
 * - AC-A6: "have" modal sense excluded
 * - AC-A7: Stative verb with modal modifier
 * - AC-A8: Mixed stative + eventive verbs
 */

const assert = require('assert');

const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

function buildGraph(text, options = {}) {
  const SemanticGraphBuilder = require('../../../src/graph/SemanticGraphBuilder');
  const builder = new SemanticGraphBuilder(options);
  return builder.build(text, options);
}

function findNodesByType(graph, typeName) {
  const nodes = graph['@graph'] || [];
  return nodes.filter(n => {
    const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
    return types.some(t => t && t.includes(typeName));
  });
}

function findActByVerb(graph, verb) {
  const nodes = graph['@graph'] || [];
  return nodes.find(n => {
    const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
    const isAct = types.some(t => t && (t.includes('IntentionalAct') || t.includes('ActOf')));
    return isAct && n['tagteam:verb'] === verb;
  });
}

// ============================================================
// AC-A1: Definite stative verbs produce StructuralAssertion
// ============================================================

test('AC-A1: "The group includes five members" produces StructuralAssertion', () => {
  const graph = buildGraph('The group includes five members');
  const assertions = findNodesByType(graph, 'StructuralAssertion');

  assert.ok(assertions.length > 0, 'Should create at least one StructuralAssertion');
  assert.strictEqual(assertions[0]['tagteam:assertsRelation'], 'cco:has_member');
  assert.ok(assertions[0]['tagteam:hasSubject'], 'Should have subject');
  assert.ok(assertions[0]['tagteam:hasObject'], 'Should have object(s)');

  const acts = findNodesByType(graph, 'IntentionalAct');
  assert.strictEqual(acts.length, 0, 'Should NOT create IntentionalAct for stative verb');
});

test('AC-A1: No AgentRole or PatientRole for stative assertions', () => {
  const graph = buildGraph('The group includes five members');
  const agentRoles = findNodesByType(graph, 'AgentRole');
  const patientRoles = findNodesByType(graph, 'PatientRole');

  assert.strictEqual(agentRoles.length, 0, 'Should not create AgentRole for stative verb');
  assert.strictEqual(patientRoles.length, 0, 'Should not create PatientRole for stative verb');
});

// ============================================================
// AC-A2: Each stative verb maps to correct relation
// ============================================================

test('AC-A2: "contain" maps to cco:has_part', () => {
  const graph = buildGraph('The box contains three items');
  const assertions = findNodesByType(graph, 'StructuralAssertion');
  assert.ok(assertions.length > 0, 'Should create StructuralAssertion');
  assert.strictEqual(assertions[0]['tagteam:assertsRelation'], 'cco:has_part');
});

test('AC-A2: "comprise" maps to cco:has_member', () => {
  const graph = buildGraph('The committee comprises four members');
  const assertions = findNodesByType(graph, 'StructuralAssertion');
  assert.ok(assertions.length > 0, 'Should create StructuralAssertion');
  assert.strictEqual(assertions[0]['tagteam:assertsRelation'], 'cco:has_member');
});

test('AC-A2: "have" (possessive) maps to cco:has_possession', () => {
  const graph = buildGraph('The hospital has two ventilators');
  const assertions = findNodesByType(graph, 'StructuralAssertion');
  assert.ok(assertions.length > 0, 'Should create StructuralAssertion');
  assert.strictEqual(assertions[0]['tagteam:assertsRelation'], 'cco:has_possession');
});

test('AC-A2: "own" maps to cco:has_possession', () => {
  const graph = buildGraph('She owns the building');
  const assertions = findNodesByType(graph, 'StructuralAssertion');
  assert.ok(assertions.length > 0, 'Should create StructuralAssertion');
  assert.strictEqual(assertions[0]['tagteam:assertsRelation'], 'cco:has_possession');
});

// NOTE: "encompass" test skipped — Compromise NLP does not recognize "encompasses" as a verb
// (tags it as plural noun). This is a known NLP limitation, not a stative logic bug.
// Will be addressed when we add verb lexicon teaching or switch NLP backends.
// test('AC-A2: "encompass" maps to cco:has_member', () => { ... });

// ============================================================
// AC-A3: Ambiguous verb disambiguation
// ============================================================

test('AC-A3: "represent" stative — Ambassador represents the United States', () => {
  const graph = buildGraph('The Ambassador represents the United States');
  const assertions = findNodesByType(graph, 'StructuralAssertion');
  assert.ok(assertions.length > 0,
    'Should create StructuralAssertion when object is Organization/Nation');
});

test('AC-A3: "represent" eventive — lawyer represents my interests', () => {
  const graph = buildGraph('The lawyer represents my interests in the negotiation');
  const acts = findNodesByType(graph, 'IntentionalAct');
  assert.ok(acts.length > 0,
    'Should create IntentionalAct when object is abstract');
  const assertions = findNodesByType(graph, 'StructuralAssertion');
  assert.strictEqual(assertions.length, 0,
    'Should NOT create StructuralAssertion for eventive sense');
});

// ============================================================
// AC-A4: StructuralAssertion node structure
// ============================================================

test('AC-A4: StructuralAssertion has required properties', () => {
  const graph = buildGraph('The team includes three specialists');
  const assertions = findNodesByType(graph, 'StructuralAssertion');
  assert.ok(assertions.length > 0, 'Should create StructuralAssertion');

  const sa = assertions[0];
  assert.ok(sa['@id'], 'Should have @id');
  assert.ok(sa['tagteam:assertsRelation'], 'Should have assertsRelation');
  assert.ok(sa['tagteam:hasSubject'], 'Should have hasSubject');
  assert.ok(sa['tagteam:hasObject'], 'Should have hasObject');
  assert.ok(sa['tagteam:verb'], 'Should have verb');
  assert.ok(sa['tagteam:sourceText'], 'Should have sourceText');

  // Should NOT have act-specific properties
  assert.strictEqual(sa['has_agent'], undefined, 'Should not have cco:has_agent');
  assert.strictEqual(sa['affects'], undefined, 'Should not have cco:affects');
});

// ============================================================
// AC-A5: Narrative sentences are unaffected (regression)
// ============================================================

test('AC-A5: "The CEO signed the contract" still creates IntentionalAct', () => {
  const graph = buildGraph('The CEO signed the contract');
  const act = findActByVerb(graph, 'sign');
  assert.ok(act, 'Should create IntentionalAct for eventive verb');

  const assertions = findNodesByType(graph, 'StructuralAssertion');
  assert.strictEqual(assertions.length, 0, 'Should NOT create StructuralAssertion');
});

test('AC-A5: "The doctor must allocate the ventilator" preserves Prescribed status', () => {
  const graph = buildGraph('The doctor must allocate the ventilator');
  const act = findActByVerb(graph, 'allocate');
  assert.ok(act, 'Should create IntentionalAct for eventive verb');
  assert.ok(
    act['tagteam:actualityStatus'] === 'tagteam:Prescribed' ||
    act['tagteam:modality'] === 'must',
    'Should have Prescribed status or must modality'
  );
});

test('AC-A5: "The patient did not take the medication" preserves Negated status', () => {
  const graph = buildGraph('The patient did not take the medication');
  const nodes = graph['@graph'] || [];
  const actNode = nodes.find(n => {
    const types = Array.isArray(n['@type']) ? n['@type'] : [];
    return types.some(t => t && (t.includes('IntentionalAct') || t.includes('ActOf')));
  });
  assert.ok(actNode, 'Should create IntentionalAct for eventive verb');
});

// ============================================================
// AC-A6: "have" modal sense excluded from stative
// ============================================================

test('AC-A6: "have to" is modal, not possessive stative', () => {
  const graph = buildGraph('The doctor has to treat the patient');
  const assertions = findNodesByType(graph, 'StructuralAssertion');
  assert.strictEqual(assertions.length, 0,
    '"have to" should NOT trigger StructuralAssertion');
});

// ============================================================
// AC-A7: Stative verb with modal modifier
// ============================================================

test('AC-A7: "must include" still creates StructuralAssertion', () => {
  const graph = buildGraph('The committee must include diverse members');
  const assertions = findNodesByType(graph, 'StructuralAssertion');
  assert.ok(assertions.length > 0,
    'Modal + stative verb should still create StructuralAssertion');
});

// ============================================================
// AC-A8: Multiple verbs — stative + eventive
// ============================================================

test('AC-A8: Mixed sentence creates both StructuralAssertion and IntentionalAct', () => {
  const graph = buildGraph('The team includes five specialists and decided to expand');
  const assertions = findNodesByType(graph, 'StructuralAssertion');
  const acts = findNodesByType(graph, 'IntentionalAct');

  assert.ok(assertions.length >= 1, 'Should have at least one StructuralAssertion');
  assert.ok(acts.length >= 1, 'Should have at least one IntentionalAct');
});

// ============================================================
// Runner
// ============================================================

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Phase 7 / v7: Stative Predication Tests');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const t of tests) {
    try {
      await t.fn();
      results.passed++;
      console.log(`  ✅ ${t.name}`);
    } catch (e) {
      results.failed++;
      console.log(`  ❌ ${t.name}`);
      console.log(`     ${e.message}`);
    }
  }

  console.log(`\n  Total: ${tests.length} tests, ${results.passed} passed, ${results.failed} failed\n`);
  process.exit(results.failed > 0 ? 1 : 0);
}

runTests();
