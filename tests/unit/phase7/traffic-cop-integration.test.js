/**
 * Traffic Cop Integration Tests
 * Phase 7 / v7: Sentence Mode Classification in SemanticGraphBuilder
 *
 * TDD: These tests are written BEFORE implementation.
 * Tests cover:
 * - AC-C1: Stative sentence → STRUCTURAL mode
 * - AC-C2: Eventive sentence → NARRATIVE mode
 * - AC-C3: High complexity + stative → STRUCTURAL + GREEDY NER
 * - AC-C4: High complexity + eventive → NARRATIVE + GREEDY NER
 * - AC-C5: Backward compatibility (enableTrafficCop: false)
 * - AC-C6: Object complexity scoring
 * - AC-C7: Full Marble end-to-end with traffic cop
 */

const assert = require('assert');

const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

function getBuilder(options = {}) {
  const SemanticGraphBuilder = require('../../../src/graph/SemanticGraphBuilder');
  return new SemanticGraphBuilder(options);
}

function findNodesByType(graph, typeName) {
  const nodes = graph['@graph'] || [];
  return nodes.filter(n => {
    const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
    return types.some(t => t && t.includes(typeName));
  });
}

const MARBLE_SENTENCE = 'Complexly named organizations include the International Association of Marble, Slate and Stone Polishers, Rubbers and Sawyers, Tile and Marble Setters\' Helpers and Marble Mosaic and Terrazzo Workers\' Helpers, the United States Department of Health and Human Services National Institutes of Health, the Joint United Nations Program on HIV and AIDS, the Organization for Economic Co-operation and Development, and the International Centre for Settlement of Investment Disputes.';

// ============================================================
// AC-C1: Traffic cop routes stative sentence to STRUCTURAL mode
// ============================================================

test('AC-C1: Stative sentence → STRUCTURAL mode', () => {
  const builder = getBuilder({ enableTrafficCop: true });
  const graph = builder.build('The group includes five members', { enableTrafficCop: true });

  assert.strictEqual(builder.sentenceMode, 'STRUCTURAL',
    'Stative verb "include" should trigger STRUCTURAL mode');

  const assertions = findNodesByType(graph, 'StructuralAssertion');
  assert.ok(assertions.length > 0, 'Should create StructuralAssertion');

  const acts = findNodesByType(graph, 'IntentionalAct');
  const includeAct = acts.find(a => a['tagteam:verb'] === 'include');
  assert.strictEqual(includeAct, undefined, 'No IntentionalAct for "include"');
});

// ============================================================
// AC-C2: Traffic cop routes eventive sentence to NARRATIVE mode
// ============================================================

test('AC-C2: Eventive sentence → NARRATIVE mode', () => {
  const builder = getBuilder({ enableTrafficCop: true });
  const graph = builder.build('The CEO signed the contract', { enableTrafficCop: true });

  assert.strictEqual(builder.sentenceMode, 'NARRATIVE',
    'Eventive verb "sign" should trigger NARRATIVE mode');

  const acts = findNodesByType(graph, 'IntentionalAct');
  assert.ok(acts.length > 0, 'Should create IntentionalAct');

  const assertions = findNodesByType(graph, 'StructuralAssertion');
  assert.strictEqual(assertions.length, 0, 'No StructuralAssertion for eventive verb');
});

// ============================================================
// AC-C3: High complexity + stative → STRUCTURAL + GREEDY NER
// ============================================================

test('AC-C3: Stative + high complexity → STRUCTURAL + greedy NER', () => {
  const builder = getBuilder({ enableTrafficCop: true });
  const graph = builder.build(
    'Organizations include the International Association of Marble and Stone Polishers',
    { enableTrafficCop: true }
  );

  assert.strictEqual(builder.sentenceMode, 'STRUCTURAL',
    'Stative verb should trigger STRUCTURAL mode');

  const cds = findNodesByType(graph, 'ComplexDesignator');
  assert.ok(cds.length > 0,
    'High complexity object should trigger greedy NER → ComplexDesignators');

  const assertions = findNodesByType(graph, 'StructuralAssertion');
  assert.ok(assertions.length > 0, 'Should create StructuralAssertion');
});

// ============================================================
// AC-C4: High complexity + eventive → NARRATIVE + GREEDY NER
// ============================================================

test('AC-C4: Eventive + high complexity → NARRATIVE + greedy NER', () => {
  const builder = getBuilder({ enableTrafficCop: true });
  const graph = builder.build(
    'The President visited the Centre for Settlement of Investment Disputes',
    { enableTrafficCop: true }
  );

  assert.strictEqual(builder.sentenceMode, 'NARRATIVE',
    'Eventive verb should trigger NARRATIVE mode');

  const acts = findNodesByType(graph, 'IntentionalAct');
  const visitAct = acts.find(a => a['tagteam:verb'] === 'visit');
  assert.ok(visitAct, 'Should create IntentionalAct for "visit"');

  const cds = findNodesByType(graph, 'ComplexDesignator');
  const centreCD = cds.find(cd =>
    (cd['tagteam:fullName'] || '').includes('Centre'));
  assert.ok(centreCD, 'Should detect Centre for Settlement... as ComplexDesignator');
});

// ============================================================
// AC-C5: Backward compatibility — enableTrafficCop: false
// ============================================================

test('AC-C5: enableTrafficCop: false preserves v6 behavior', () => {
  const builder = getBuilder({ enableTrafficCop: false });
  const graph = builder.build('The group includes five members', { enableTrafficCop: false });

  // With traffic cop disabled, stative verbs still go through Phase A inline check
  // but no automatic greedy NER or mode classification
  assert.strictEqual(builder.sentenceMode, undefined,
    'sentenceMode should not be set when traffic cop is disabled');
});

test('AC-C5: Default (no option) — traffic cop enabled by default', () => {
  const builder = getBuilder();
  const graph = builder.build('The group includes five members');

  // enableTrafficCop defaults to true
  assert.strictEqual(builder.sentenceMode, 'STRUCTURAL',
    'Traffic cop should be enabled by default');
});

// ============================================================
// AC-C6: Object complexity scoring
// ============================================================

test('AC-C6: Low complexity text returns high: false', () => {
  const builder = getBuilder();
  const result = builder._measureObjectComplexity('The group includes five members');
  assert.strictEqual(result.high, false,
    'Simple noun phrase should have low complexity');
});

test('AC-C6: High complexity text (>60% capitalized) returns high: true', () => {
  const builder = getBuilder();
  const result = builder._measureObjectComplexity(
    'Organizations include the International Association of Marble and Stone Polishers'
  );
  assert.strictEqual(result.high, true,
    'Dense capitalized object phrase should have high complexity');
});

// ============================================================
// AC-C7: Full Marble end-to-end with traffic cop
// ============================================================

test('AC-C7: Marble end-to-end — mode STRUCTURAL, NER GREEDY', () => {
  const builder = getBuilder({ enableTrafficCop: true });
  const graph = builder.build(MARBLE_SENTENCE, { enableTrafficCop: true });

  assert.strictEqual(builder.sentenceMode, 'STRUCTURAL',
    'Marble sentence should be classified as STRUCTURAL');
});

test('AC-C7: Marble end-to-end — 5 ComplexDesignators', () => {
  const builder = getBuilder({ enableTrafficCop: true });
  const graph = builder.build(MARBLE_SENTENCE, { enableTrafficCop: true });

  const cds = findNodesByType(graph, 'ComplexDesignator');
  assert.ok(cds.length >= 5,
    `Should detect at least 5 ComplexDesignators, got ${cds.length}`);
});

test('AC-C7: Marble end-to-end — StructuralAssertion, no IntentionalAct for "include"', () => {
  const builder = getBuilder({ enableTrafficCop: true });
  const graph = builder.build(MARBLE_SENTENCE, { enableTrafficCop: true });

  const assertions = findNodesByType(graph, 'StructuralAssertion');
  assert.ok(assertions.length > 0, 'Should have StructuralAssertion');

  const acts = findNodesByType(graph, 'IntentionalAct');
  const includeAct = acts.find(a => a['tagteam:verb'] === 'include');
  assert.strictEqual(includeAct, undefined,
    '"include" should NOT produce IntentionalAct');
});

test('AC-C7: Marble end-to-end — no AgentRole or PatientRole', () => {
  const builder = getBuilder({ enableTrafficCop: true });
  const graph = builder.build(MARBLE_SENTENCE, { enableTrafficCop: true });

  const agentRoles = findNodesByType(graph, 'AgentRole');
  const patientRoles = findNodesByType(graph, 'PatientRole');

  // There may be roles from Compromise false-positive verbs (e.g., "named"),
  // but there should be none from "include"
  const includeRelatedRoles = [...agentRoles, ...patientRoles].filter(r => {
    const realizedIn = r['bfo:BFO_0000054'] || r['tagteam:would_be_realized_in'];
    if (!realizedIn) return false;
    const iri = typeof realizedIn === 'object' ? realizedIn['@id'] : realizedIn;
    // Check if this role is linked to an act with verb "include"
    const nodes = graph['@graph'] || [];
    const act = nodes.find(n => n['@id'] === iri && n['tagteam:verb'] === 'include');
    return !!act;
  });
  assert.strictEqual(includeRelatedRoles.length, 0,
    'No roles should be linked to "include" (stative verb)');
});

// ============================================================
// Runner
// ============================================================

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Phase 7 / v7: Traffic Cop Integration Tests');
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
