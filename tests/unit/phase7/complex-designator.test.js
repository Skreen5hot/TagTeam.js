/**
 * Complex Designator Tests
 * Phase 7 / v7: ComplexDesignatorDetector + Greedy NER
 *
 * TDD: These tests are written BEFORE implementation.
 * All detector tests should fail initially and pass after Phase B is complete.
 *
 * Tests cover:
 * - AC-B1: Marble gold standard (5 organizations as single entities)
 * - AC-B2: AIDS never interpreted as verb
 * - AC-B3: ALL_CAPS words are never verbs inside capitalized sequences
 * - AC-B4: Settlement — morphological override inside vs outside names
 * - AC-B5: Boundary — "and" joins inside names, splits at clause boundaries
 * - AC-B6: Preposition "of" always joins inside names
 * - AC-B7: ComplexDesignator node structure
 * - AC-B8: Regression — standard NER unchanged when greedyNER=false
 * - AC-B9: Comma-separated list produces multiple ComplexDesignators
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

// ============================================================
// Unit tests for ComplexDesignatorDetector (standalone)
// ============================================================

function getDetector() {
  const ComplexDesignatorDetector = require('../../../src/graph/ComplexDesignatorDetector');
  return new ComplexDesignatorDetector();
}

// ============================================================
// AC-B5: Boundary — "and" joins inside names, splits at clause boundaries
// ============================================================

test('AC-B5: "Health and Human Services" → ONE ComplexDesignator', () => {
  const detector = getDetector();
  const spans = detector.detect('Health and Human Services');
  assert.strictEqual(spans.length, 1, 'Should detect one ComplexDesignator');
  assert.strictEqual(spans[0].text, 'Health and Human Services');
});

test('AC-B5: "Stone Polishers and the union representatives" → TWO entities', () => {
  const detector = getDetector();
  const spans = detector.detect('the Stone Polishers and the union representatives met');
  // "Stone Polishers" is a ComplexDesignator; "union representatives" is lowercase, not a CD
  const cdSpans = spans.filter(s => s.text.includes('Stone Polishers'));
  assert.ok(cdSpans.length >= 1, 'Should detect Stone Polishers as ComplexDesignator');
  // "and the union representatives" should NOT be part of Stone Polishers
  assert.ok(!cdSpans[0].text.includes('union'),
    '"and the [lowercase]" should break the ComplexDesignator boundary');
});

// ============================================================
// AC-B6: Preposition "of" always joins inside names
// ============================================================

test('AC-B6: "Centre for Settlement of Investment Disputes" → ONE ComplexDesignator', () => {
  const detector = getDetector();
  const spans = detector.detect('the Centre for Settlement of Investment Disputes');
  const cd = spans.find(s => s.text.includes('Centre'));
  assert.ok(cd, 'Should detect ComplexDesignator starting with Centre');
  assert.ok(cd.text.includes('Settlement'), '"of" should join — Settlement included');
  assert.ok(cd.text.includes('Disputes'), 'Full name should be preserved');
});

// ============================================================
// AC-B3: ALL_CAPS words are never verbs inside capitalized sequences
// ============================================================

test('AC-B3: "Joint United Nations Program on HIV and AIDS" → AIDS is name component', () => {
  const detector = getDetector();
  const spans = detector.detect('the Joint United Nations Program on HIV and AIDS');
  assert.strictEqual(spans.length, 1, 'Should detect one ComplexDesignator');
  assert.ok(spans[0].text.includes('AIDS'), 'AIDS should be inside the ComplexDesignator');
  assert.ok(spans[0].text.includes('HIV'), 'HIV should be inside the ComplexDesignator');
});

test('AC-B3: "NATO forces deployed to the region" → NATO is ComplexDesignator', () => {
  const detector = getDetector();
  const spans = detector.detect('NATO forces deployed to the region');
  const natoSpan = spans.find(s => s.text.includes('NATO'));
  assert.ok(natoSpan, 'Should detect NATO as part of a ComplexDesignator');
});

// ============================================================
// AC-B9: Comma-separated list produces multiple ComplexDesignators
// ============================================================

test('AC-B9: "the OECD, the World Bank, and UNICEF" → 3 separate ComplexDesignators', () => {
  const detector = getDetector();
  const spans = detector.detect('the OECD, the World Bank, and UNICEF');
  assert.ok(spans.length >= 3, `Should detect at least 3 ComplexDesignators, got ${spans.length}`);
});

// ============================================================
// AC-B7: ComplexDesignator node structure
// ============================================================

test('AC-B7: ComplexDesignator span has required properties', () => {
  const detector = getDetector();
  const spans = detector.detect('the International Centre for Settlement of Investment Disputes');
  assert.ok(spans.length > 0, 'Should detect at least one span');

  const span = spans[0];
  assert.ok(span.text, 'Should have text');
  assert.ok(span.start >= 0, 'Should have start position');
  assert.ok(span.end > span.start, 'Should have end position > start');
  assert.ok(Array.isArray(span.components), 'Should have components array');
  assert.ok(span.components.length > 0, 'Components should not be empty');
});

// ============================================================
// Integration tests (require full graph builder + greedyNER)
// ============================================================

// AC-B2: AIDS never interpreted as verb
test('AC-B2: "The Program on HIV and AIDS supports treatment access" — AIDS not a verb', () => {
  const graph = buildGraph('The Program on HIV and AIDS supports treatment access', { greedyNER: true });
  const nodes = graph['@graph'] || [];

  // Check no act has verb = "aids" or "aid"
  const actNodes = findNodesByType(graph, 'IntentionalAct');
  const aidsAct = actNodes.find(a => {
    const verb = a['tagteam:verb'] || '';
    return verb.toLowerCase() === 'aid' || verb.toLowerCase() === 'aids';
  });
  assert.strictEqual(aidsAct, undefined, 'AIDS should NOT be parsed as a verb');

  // Should have a ComplexDesignator containing AIDS
  const cds = findNodesByType(graph, 'ComplexDesignator');
  const aidsCD = cds.find(cd => {
    const name = cd['tagteam:fullName'] || '';
    return name.includes('AIDS');
  });
  assert.ok(aidsCD, 'AIDS should appear inside a ComplexDesignator fullName');
});

// AC-B4: Settlement — morphological override inside vs outside names
test('AC-B4: "settlement" standalone is NOT a ComplexDesignator', () => {
  const detector = getDetector();
  const spans = detector.detect('The settlement of the lawsuit took three months');
  // "settlement" is lowercase — should not be a ComplexDesignator
  const settlementCD = spans.find(s => s.text.toLowerCase().includes('settlement'));
  assert.strictEqual(settlementCD, undefined,
    'Lowercase "settlement" should NOT be a ComplexDesignator');
});

test('AC-B4: "Centre for Settlement of Investment Disputes" — Settlement is name component', () => {
  const graph = buildGraph(
    'The President visited the Centre for Settlement of Investment Disputes',
    { greedyNER: true }
  );
  const cds = findNodesByType(graph, 'ComplexDesignator');
  const centreCD = cds.find(cd => {
    const name = cd['tagteam:fullName'] || '';
    return name.includes('Centre') && name.includes('Settlement');
  });
  assert.ok(centreCD, 'Should have ComplexDesignator for Centre for Settlement...');

  // Should NOT have a separate Process node for "Settlement"
  const processNodes = findNodesByType(graph, 'Process');
  const settlementProcess = processNodes.find(p => {
    const label = p['rdfs:label'] || '';
    return label.toLowerCase().includes('settlement');
  });
  assert.strictEqual(settlementProcess, undefined,
    'Settlement inside name should NOT generate Process node');
});

// AC-B8: Regression — standard NER unchanged when greedyNER=false
test('AC-B8: Standard NER unchanged when greedyNER defaults to false', () => {
  const graph = buildGraph('The CEO signed the contract');
  const cds = findNodesByType(graph, 'ComplexDesignator');
  assert.strictEqual(cds.length, 0,
    'No ComplexDesignator nodes when greedyNER is not enabled');
});

test('AC-B8: greedyNER=false explicitly produces no ComplexDesignators', () => {
  const graph = buildGraph('The CEO signed the contract', { greedyNER: false });
  const cds = findNodesByType(graph, 'ComplexDesignator');
  assert.strictEqual(cds.length, 0,
    'No ComplexDesignator nodes when greedyNER=false');
});

// AC-B1: The Marble Gold Standard
test('AC-B1: Marble sentence — detects 5 ComplexDesignators', () => {
  const marbleSentence = 'Complexly named organizations include the International Association of Marble, Slate and Stone Polishers, Rubbers and Sawyers, Tile and Marble Setters\' Helpers and Marble Mosaic and Terrazzo Workers\' Helpers, the United States Department of Health and Human Services National Institutes of Health, the Joint United Nations Program on HIV and AIDS, the Organization for Economic Co-operation and Development, and the International Centre for Settlement of Investment Disputes.';

  const graph = buildGraph(marbleSentence, { greedyNER: true });
  const cds = findNodesByType(graph, 'ComplexDesignator');

  assert.ok(cds.length >= 5,
    `Should detect at least 5 ComplexDesignators, got ${cds.length}`);
});

test('AC-B1: Marble sentence — "Rubbers and Sawyers" inside cd_001 name', () => {
  const marbleSentence = 'Complexly named organizations include the International Association of Marble, Slate and Stone Polishers, Rubbers and Sawyers, Tile and Marble Setters\' Helpers and Marble Mosaic and Terrazzo Workers\' Helpers, the United States Department of Health and Human Services National Institutes of Health, the Joint United Nations Program on HIV and AIDS, the Organization for Economic Co-operation and Development, and the International Centre for Settlement of Investment Disputes.';

  const graph = buildGraph(marbleSentence, { greedyNER: true });
  const cds = findNodesByType(graph, 'ComplexDesignator');

  // Find the one containing "International Association"
  const cd001 = cds.find(cd => {
    const name = cd['tagteam:fullName'] || '';
    return name.includes('International Association');
  });
  assert.ok(cd001, 'Should find ComplexDesignator for International Association');
  assert.ok(cd001['tagteam:fullName'].includes('Rubbers and Sawyers'),
    '"Rubbers and Sawyers" should be INSIDE the International Association name');
});

test('AC-B1: Marble sentence — "include" produces StructuralAssertion, not IntentionalAct', () => {
  const marbleSentence = 'Complexly named organizations include the International Association of Marble, Slate and Stone Polishers, Rubbers and Sawyers, Tile and Marble Setters\' Helpers and Marble Mosaic and Terrazzo Workers\' Helpers, the United States Department of Health and Human Services National Institutes of Health, the Joint United Nations Program on HIV and AIDS, the Organization for Economic Co-operation and Development, and the International Centre for Settlement of Investment Disputes.';

  const graph = buildGraph(marbleSentence, { greedyNER: true });

  // "include" should be routed to StructuralAssertion, not IntentionalAct
  const assertions = findNodesByType(graph, 'StructuralAssertion');
  assert.ok(assertions.length > 0,
    'Should have StructuralAssertion for "include"');

  // No IntentionalAct should have verb "include"
  const acts = findNodesByType(graph, 'IntentionalAct');
  const includeAct = acts.find(a => a['tagteam:verb'] === 'include');
  assert.strictEqual(includeAct, undefined,
    '"include" should NOT produce IntentionalAct');

  // No act should have a verb matching a word inside a ComplexDesignator (e.g., "aid" from AIDS)
  const cdVerbs = acts.filter(a => {
    const verb = a['tagteam:verb'] || '';
    return ['aid', 'aids'].includes(verb.toLowerCase());
  });
  assert.strictEqual(cdVerbs.length, 0,
    'No verbs from inside ComplexDesignator spans (e.g., AIDS→aid)');
});

test('AC-B1: Marble sentence — each ComplexDesignator has required properties', () => {
  const marbleSentence = 'Complexly named organizations include the International Association of Marble, Slate and Stone Polishers, Rubbers and Sawyers, Tile and Marble Setters\' Helpers and Marble Mosaic and Terrazzo Workers\' Helpers, the United States Department of Health and Human Services National Institutes of Health, the Joint United Nations Program on HIV and AIDS, the Organization for Economic Co-operation and Development, and the International Centre for Settlement of Investment Disputes.';

  const graph = buildGraph(marbleSentence, { greedyNER: true });
  const cds = findNodesByType(graph, 'ComplexDesignator');

  for (const cd of cds) {
    assert.ok(cd['@id'], `CD should have @id: ${cd['tagteam:fullName']}`);
    assert.ok(cd['tagteam:fullName'], 'CD should have tagteam:fullName');
    assert.ok(Array.isArray(cd['tagteam:nameComponents']),
      'CD should have tagteam:nameComponents array');
    assert.ok(cd['tagteam:denotedType'],
      'CD should have tagteam:denotedType');
  }
});

// ============================================================
// Runner
// ============================================================

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Phase 7 / v7: Complex Designator Tests');
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
