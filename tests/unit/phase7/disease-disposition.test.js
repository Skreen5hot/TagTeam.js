/**
 * Disease/Disposition Detection Test Suite
 * Phase 7.1 Story 1: Diseases → BFO Disposition (bfo:BFO_0000016)
 *
 * Per OGMS/BFO, diseases are Dispositions — predispositions to undergo
 * pathological processes. Only true symptoms (pain, cough, fever) are Qualities.
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
  console.log('  Disease/Disposition Detection Tests - Phase 7.1 Story 1');
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

function findTier2Node(graph, labelIncludes) {
  const nodes = graph['@graph'] || [];
  return nodes.find(n =>
    (n['rdfs:label'] || '').toLowerCase().includes(labelIncludes.toLowerCase()) &&
    n['@type'] && !n['@type'].includes('tagteam:DiscourseReferent')
  );
}

// ═══════════════════════════════════════════════════════════════
// Tier 1: Disease terms → BFO_0000016 (Disposition)
// ═══════════════════════════════════════════════════════════════

test('"diabetes" → BFO_0000016 (Disposition)', () => {
  const entities = extractEntities('The patient has diabetes');
  const entity = findEntity(entities, 'diabetes');
  assert.ok(entity, 'Should find "diabetes" entity');
  assert.strictEqual(entity['tagteam:denotesType'], 'bfo:BFO_0000016',
    'diabetes should be Disposition, got: ' + entity['tagteam:denotesType']);
});

test('"cancer" → BFO_0000016 (Disposition)', () => {
  const entities = extractEntities('She was diagnosed with cancer');
  const entity = findEntity(entities, 'cancer');
  assert.ok(entity, 'Should find "cancer" entity');
  assert.strictEqual(entity['tagteam:denotesType'], 'bfo:BFO_0000016');
});

test('"infection" → BFO_0000016 (Disposition)', () => {
  const entities = extractEntities('The results indicate infection');
  const entity = findEntity(entities, 'infection');
  assert.ok(entity, 'Should find "infection" entity');
  assert.strictEqual(entity['tagteam:denotesType'], 'bfo:BFO_0000016');
});

test('"asthma" → BFO_0000016 (Disposition)', () => {
  const entities = extractEntities('Patient presents with asthma');
  const entity = findEntity(entities, 'asthma');
  assert.ok(entity, 'Should find "asthma" entity');
  assert.strictEqual(entity['tagteam:denotesType'], 'bfo:BFO_0000016');
});

test('"pneumonia" → BFO_0000016 (Disposition)', () => {
  const entities = extractEntities('Likely pneumonia was diagnosed');
  const entity = findEntity(entities, 'pneumonia');
  assert.ok(entity, 'Should find "pneumonia" entity');
  assert.strictEqual(entity['tagteam:denotesType'], 'bfo:BFO_0000016');
});

test('"hepatitis" → BFO_0000016 (Disposition)', () => {
  const entities = extractEntities('Testing for hepatitis');
  const entity = findEntity(entities, 'hepatitis');
  assert.ok(entity, 'Should find "hepatitis" entity');
  assert.strictEqual(entity['tagteam:denotesType'], 'bfo:BFO_0000016');
});

// ═══════════════════════════════════════════════════════════════
// Symptoms remain Quality (BFO_0000019)
// ═══════════════════════════════════════════════════════════════

test('"chest pain" remains BFO_0000019 (Quality)', () => {
  const entities = extractEntities('Patient reports chest pain');
  const entity = findEntity(entities, 'chest pain');
  assert.ok(entity, 'Should find "chest pain" entity');
  assert.strictEqual(entity['tagteam:denotesType'], 'bfo:BFO_0000019');
});

test('"fever" remains BFO_0000019 (Quality)', () => {
  const entities = extractEntities('The patient has a fever');
  const entity = findEntity(entities, 'fever');
  assert.ok(entity, 'Should find "fever" entity');
  assert.strictEqual(entity['tagteam:denotesType'], 'bfo:BFO_0000019');
});

test('"cough" remains BFO_0000019 (Quality)', () => {
  const entities = extractEntities('Patient presents with cough');
  const entity = findEntity(entities, 'cough');
  assert.ok(entity, 'Should find "cough" entity');
  assert.strictEqual(entity['tagteam:denotesType'], 'bfo:BFO_0000019');
});

test('"blood sugar levels" remains BFO_0000019 (Quality)', () => {
  const entities = extractEntities('Blood sugar levels are elevated');
  const entity = findEntity(entities, 'blood sugar');
  assert.ok(entity, 'Should find "blood sugar" entity');
  assert.strictEqual(entity['tagteam:denotesType'], 'bfo:BFO_0000019');
});

// ═══════════════════════════════════════════════════════════════
// Non-medical entities unchanged
// ═══════════════════════════════════════════════════════════════

test('"ventilator" remains cco:Artifact', () => {
  const entities = extractEntities('The doctor used the ventilator');
  const vent = findEntity(entities, 'ventilator');
  assert.ok(vent, 'Should find "ventilator" entity');
  assert.strictEqual(vent['tagteam:denotesType'], 'cco:Artifact');
});

test('"patient" remains cco:Person', () => {
  const entities = extractEntities('The patient has diabetes');
  const patient = findEntity(entities, 'patient');
  assert.ok(patient, 'Should find "patient" entity');
  assert.strictEqual(patient['tagteam:denotesType'], 'cco:Person');
});

// ═══════════════════════════════════════════════════════════════
// Tier 2: Full graph typing
// ═══════════════════════════════════════════════════════════════

test('Tier 2 node for "diabetes" typed BFO_0000016 (not Artifact)', () => {
  const graph = buildGraph('Patient has diabetes');
  const tier2 = findTier2Node(graph, 'diabetes');
  assert.ok(tier2, 'Should find Tier 2 node for "diabetes"');
  assert.ok(tier2['@type'].includes('bfo:BFO_0000016'),
    '@type should include bfo:BFO_0000016, got: ' + JSON.stringify(tier2['@type']));
  assert.ok(!tier2['@type'].includes('cco:Artifact'),
    '@type should NOT include cco:Artifact');
  assert.ok(!tier2['@type'].includes('bfo:BFO_0000019'),
    '@type should NOT include bfo:BFO_0000019 (Quality)');
});

// ═══════════════════════════════════════════════════════════════
// Disease excluded from agent assignment
// ═══════════════════════════════════════════════════════════════

test('Disease entity not assigned as agent in full graph', () => {
  const graph = buildGraph('The results indicate infection');
  const nodes = graph['@graph'] || [];
  for (const n of nodes) {
    if (n['has_agent']) {
      const agentId = (n['has_agent']['@id'] || '').toLowerCase();
      assert.ok(!agentId.includes('infection'),
        'Infection (disease) should not be agent');
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// Direct method test
// ═══════════════════════════════════════════════════════════════

test('_checkForSymptomType returns BFO_0000016 for "diabetes"', () => {
  const ext = new EntityExtractor();
  const result = ext._checkForSymptomType('diabetes', 'diabetes');
  assert.strictEqual(result, 'bfo:BFO_0000016');
});

test('_checkForSymptomType returns BFO_0000019 for "fever"', () => {
  const ext = new EntityExtractor();
  const result = ext._checkForSymptomType('fever', 'fever');
  assert.strictEqual(result, 'bfo:BFO_0000019');
});

test('_checkForSymptomType returns null for "ventilator"', () => {
  const ext = new EntityExtractor();
  const result = ext._checkForSymptomType('ventilator', 'ventilator');
  assert.strictEqual(result, null);
});

runTests();
