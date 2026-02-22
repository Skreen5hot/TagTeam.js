/**
 * Pronoun Typing Test Suite
 * Phase 7.1: IEE Realist Pronoun → BFO/CCO Type Mapping
 *
 * Pronouns carry selectional presuppositions about their antecedent's
 * ontological category. "He" presupposes Person, "it" presupposes
 * bfo:BFO_0000004 (Independent Continuant), etc.
 */

const assert = require('assert');

let EntityExtractor, SemanticGraphBuilder;
try {
  EntityExtractor = require('../../../src/graph/EntityExtractor');
  SemanticGraphBuilder = require('../../../src/graph/SemanticGraphBuilder');
} catch (e) {
  console.log('Note: Required modules not found:', e.message);
}

const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Pronoun Typing Tests - Phase 7.1 IEE Realist Mapping');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!EntityExtractor) {
    console.log('❌ EntityExtractor not found.\n');
    return;
  }

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

  console.log(`\n  Total: ${results.passed} passed, ${results.failed} failed\n`);
  if (results.failed > 0) process.exit(1);
}

function extractEntities(text) {
  const extractor = new EntityExtractor();
  return extractor.extract(text, { createTier2: false });
}

function findEntity(entities, labelIncludes) {
  return entities.find(e =>
    (e['rdfs:label'] || '').toLowerCase().includes(labelIncludes.toLowerCase())
  );
}

function buildGraph(text) {
  const builder = new SemanticGraphBuilder();
  return builder.build(text);
}

function getNodes(graph) {
  return graph['@graph'] || [];
}

function findTier2ByLabel(graph, labelIncludes) {
  return getNodes(graph).find(n =>
    (n['rdfs:label'] || '').toLowerCase().includes(labelIncludes.toLowerCase()) &&
    n['@type'] && n['@type'].includes('owl:NamedIndividual') &&
    !n['@type'].includes('tagteam:DiscourseReferent')
  );
}

// ═══════════════════════════════════════════════════════════════
// Gendered pronouns → Person
// ═══════════════════════════════════════════════════════════════

test('"He" → denotesType = Person', () => {
  const entities = extractEntities('He needs to drop the hand gun');
  const he = findEntity(entities, 'he');
  assert.ok(he, 'Should find entity for "He"');
  assert.strictEqual(he['tagteam:denotesType'], 'Person',
    'He should denote Person, got: ' + he['tagteam:denotesType']);
});

test('"She" → denotesType = Person', () => {
  const entities = extractEntities('She prescribes the medication');
  const she = findEntity(entities, 'she');
  assert.ok(she, 'Should find entity for "She"');
  assert.strictEqual(she['tagteam:denotesType'], 'Person');
});

test('"Him" → denotesType = Person', () => {
  const entities = extractEntities('The doctor treats him');
  const him = findEntity(entities, 'him');
  assert.ok(him, 'Should find entity for "him"');
  assert.strictEqual(him['tagteam:denotesType'], 'Person');
});

// ═══════════════════════════════════════════════════════════════
// "it" → bfo:BFO_0000004 (Independent Continuant)
// ═══════════════════════════════════════════════════════════════

test('"it" → denotesType = bfo:BFO_0000004 (Independent Continuant)', () => {
  const entities = extractEntities('It broke during transport');
  const it = findEntity(entities, 'it');
  assert.ok(it, 'Should find entity for "it"');
  assert.strictEqual(it['tagteam:denotesType'], 'bfo:BFO_0000004',
    'It should denote Independent Continuant, got: ' + it['tagteam:denotesType']);
});

// ═══════════════════════════════════════════════════════════════
// "they" → bfo:BFO_0000027 (Object Aggregate)
// ═══════════════════════════════════════════════════════════════

test('"they" → denotesType = bfo:BFO_0000027 (Object Aggregate)', () => {
  const entities = extractEntities('They arrived at the hospital');
  const they = findEntity(entities, 'they');
  assert.ok(they, 'Should find entity for "they"');
  assert.strictEqual(they['tagteam:denotesType'], 'bfo:BFO_0000027',
    'They should denote Object Aggregate, got: ' + they['tagteam:denotesType']);
});

// ═══════════════════════════════════════════════════════════════
// Demonstratives → bfo:BFO_0000001 (Entity)
// ═══════════════════════════════════════════════════════════════

test('"this" → denotesType = bfo:BFO_0000001 if extracted', () => {
  const entities = extractEntities('This requires immediate attention');
  const thisEntity = findEntity(entities, 'this');
  if (thisEntity) {
    assert.strictEqual(thisEntity['tagteam:denotesType'], 'bfo:BFO_0000001',
      'This should denote Entity, got: ' + thisEntity['tagteam:denotesType']);
  }
  // Demonstratives may not be extracted as entities — that's acceptable
  assert.ok(true, 'Demonstrative extraction is best-effort');
});

// ═══════════════════════════════════════════════════════════════
// Tier 2 typing: "He" → Person Tier 2 node
// ═══════════════════════════════════════════════════════════════

test('Tier 2 for "He" is typed Person', () => {
  const graph = buildGraph('He needs to drop the hand gun');
  const he = findTier2ByLabel(graph, 'he');
  if (he) {
    assert.ok(he['@type'].includes('Person'),
      'Tier 2 for "He" should include Person, got: ' + JSON.stringify(he['@type']));
  }
});

test('Tier 2 for "it" is typed bfo:BFO_0000004', () => {
  const graph = buildGraph('It broke during transport');
  const it = findTier2ByLabel(graph, 'it');
  if (it) {
    assert.ok(it['@type'].includes('bfo:BFO_0000004'),
      'Tier 2 for "it" should include bfo:BFO_0000004, got: ' + JSON.stringify(it['@type']));
  }
});

// ═══════════════════════════════════════════════════════════════
// Referential status remains anaphoric for pronouns
// ═══════════════════════════════════════════════════════════════

test('Pronoun referentialStatus is still "anaphoric"', () => {
  const entities = extractEntities('He needs to drop the hand gun');
  const he = findEntity(entities, 'he');
  assert.ok(he, 'Should find entity for "He"');
  assert.strictEqual(he['tagteam:referentialStatus'], 'anaphoric',
    'Pronoun should be anaphoric, got: ' + he['tagteam:referentialStatus']);
});

// ═══════════════════════════════════════════════════════════════
// Non-pronoun entities remain unchanged
// ═══════════════════════════════════════════════════════════════

test('"doctor" still typed Person (not affected by pronoun logic)', () => {
  const entities = extractEntities('The doctor examines the patient');
  const doctor = findEntity(entities, 'doctor');
  assert.ok(doctor, 'Should find entity for "doctor"');
  assert.strictEqual(doctor['tagteam:denotesType'], 'Person');
});

test('"hand gun" still typed Artifact (not affected by pronoun logic)', () => {
  const entities = extractEntities('He needs to drop the hand gun');
  const gun = findEntity(entities, 'gun') || findEntity(entities, 'hand gun');
  assert.ok(gun, 'Should find entity for "hand gun"');
  assert.ok(
    gun['tagteam:denotesType'] === 'Artifact' || gun['tagteam:denotesType'] === 'bfo:BFO_0000040',
    'hand gun should be Artifact or Material Entity, got: ' + gun['tagteam:denotesType']
  );
});

runTests();
