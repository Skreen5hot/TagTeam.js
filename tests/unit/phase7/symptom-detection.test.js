/**
 * Symptom & Quality Detection Test Suite
 * Phase 7.0 Story 2: Symptoms → BFO Quality (bfo:BFO_0000019)
 *
 * Ensures "chest pain" becomes bfo:BFO_0000019 (not Artifact)
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
  console.log('  Symptom & Quality Detection Tests - Phase 7.0 Story 2');
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

// Helper: extract entities and find by label
function extractEntities(text) {
  const extractor = new EntityExtractor();
  return extractor.extract(text, { createTier2: false });
}

function findEntity(entities, labelIncludes) {
  return entities.find(e =>
    (e['rdfs:label'] || '').toLowerCase().includes(labelIncludes.toLowerCase())
  );
}

// Helper: build full graph and find Tier 2 node by label
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
// Tier 1: denotesType detection — single-word symptoms
// ═══════════════════════════════════════════════════════════════

test('"fever" → BFO_0000019 (Quality)', () => {
  const entities = extractEntities('The patient has a fever');
  const symptom = findEntity(entities, 'fever');
  assert.ok(symptom, 'Should find "fever" entity');
  assert.strictEqual(symptom['tagteam:denotesType'], 'Quality',
    'denotesType should be bfo:BFO_0000019 (Quality)');
});

test('"cough" → BFO_0000019', () => {
  const entities = extractEntities('Patient presents with cough');
  const symptom = findEntity(entities, 'cough');
  assert.ok(symptom, 'Should find "cough" entity');
  assert.strictEqual(symptom['tagteam:denotesType'], 'Quality');
});

test('"nausea" → BFO_0000019', () => {
  const entities = extractEntities('She experienced nausea');
  const symptom = findEntity(entities, 'nausea');
  assert.ok(symptom, 'Should find "nausea" entity');
  assert.strictEqual(symptom['tagteam:denotesType'], 'Quality');
});

test('"headache" → BFO_0000019', () => {
  const entities = extractEntities('The headache persisted');
  const symptom = findEntity(entities, 'headache');
  assert.ok(symptom, 'Should find "headache" entity');
  assert.strictEqual(symptom['tagteam:denotesType'], 'Quality');
});

// ═══════════════════════════════════════════════════════════════
// Tier 1: denotesType detection — multi-word phrases
// ═══════════════════════════════════════════════════════════════

test('"chest pain" → BFO_0000019', () => {
  const entities = extractEntities('Patient reports chest pain');
  const symptom = findEntity(entities, 'chest pain');
  assert.ok(symptom, 'Should find "chest pain" entity');
  assert.strictEqual(symptom['tagteam:denotesType'], 'Quality');
});

test('"shortness of breath" → BFO_0000019', () => {
  const entities = extractEntities('Patient has shortness of breath');
  const symptom = findEntity(entities, 'shortness of breath');
  assert.ok(symptom, 'Should find "shortness of breath" entity');
  assert.strictEqual(symptom['tagteam:denotesType'], 'Quality');
});

test('"sore throat" → BFO_0000019', () => {
  const entities = extractEntities('She complains of a sore throat');
  const symptom = findEntity(entities, 'sore throat');
  assert.ok(symptom, 'Should find "sore throat" entity');
  assert.strictEqual(symptom['tagteam:denotesType'], 'Quality');
});

// ═══════════════════════════════════════════════════════════════
// Tier 1: modifier-stripped detection
// ═══════════════════════════════════════════════════════════════

test('"persistent cough" → BFO_0000019', () => {
  const entities = extractEntities('Patient reports persistent cough');
  const symptom = findEntity(entities, 'persistent cough') || findEntity(entities, 'cough');
  assert.ok(symptom, 'Should find "persistent cough" entity');
  assert.strictEqual(symptom['tagteam:denotesType'], 'Quality');
});

test('"chronic fatigue" → BFO_0000019', () => {
  const entities = extractEntities('Diagnosed with chronic fatigue');
  const symptom = findEntity(entities, 'chronic fatigue') || findEntity(entities, 'fatigue');
  assert.ok(symptom, 'Should find "chronic fatigue" entity');
  assert.strictEqual(symptom['tagteam:denotesType'], 'Quality');
});

// ═══════════════════════════════════════════════════════════════
// Tier 2: @type in full graph
// ═══════════════════════════════════════════════════════════════

test('Tier 2 node for "fever" typed BFO_0000019 (not Artifact)', () => {
  const graph = buildGraph('Patient has a high fever');
  const tier2 = findTier2Node(graph, 'fever');
  assert.ok(tier2, 'Should find Tier 2 node for "fever"');
  assert.ok(tier2['@type'].includes('Quality'),
    '@type should include bfo:BFO_0000019');
  assert.ok(!tier2['@type'].includes('Artifact'),
    '@type should NOT include Artifact');
});

// ═══════════════════════════════════════════════════════════════
// Non-symptom entities remain unchanged
// ═══════════════════════════════════════════════════════════════

test('"ventilator" still classified as Artifact', () => {
  const entities = extractEntities('The doctor used the ventilator');
  const vent = findEntity(entities, 'ventilator');
  assert.ok(vent, 'Should find "ventilator" entity');
  assert.strictEqual(vent['tagteam:denotesType'], 'Artifact');
});

test('"patient" still classified as Person', () => {
  const entities = extractEntities('The patient has chest pain');
  const patient = findEntity(entities, 'patient');
  assert.ok(patient, 'Should find "patient" entity');
  assert.strictEqual(patient['tagteam:denotesType'], 'Person');
});

// ═══════════════════════════════════════════════════════════════
// Quality exclusion from agent assignment
// ═══════════════════════════════════════════════════════════════

test('Symptom entity not assigned as agent in full graph', () => {
  const graph = buildGraph('Patient reports chest pain');
  const nodes = graph['@graph'] || [];
  const acts = nodes.filter(n => n['@type'] && (
    n['@type'].includes('IntentionalAct') ||
    n['@type'].includes('ActOfCommunication')
  ));
  for (const act of acts) {
    if (act['has_agent']) {
      const agentId = act['has_agent']['@id'] || act['has_agent'];
      assert.ok(!agentId.toLowerCase().includes('chest_pain'),
        `Act should not have "chest pain" as agent`);
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// Direct method test for _checkForSymptomType
// ═══════════════════════════════════════════════════════════════

test('_checkForSymptomType recognizes "blood sugar" phrase', () => {
  const ext = new EntityExtractor();
  const result = ext._checkForSymptomType('blood sugar', 'sugar');
  assert.strictEqual(result, 'Quality',
    '_checkForSymptomType should recognize "blood sugar"');
});

test('_checkForSymptomType returns null for "ventilator"', () => {
  const ext = new EntityExtractor();
  const result = ext._checkForSymptomType('ventilator', 'ventilator');
  assert.strictEqual(result, null,
    '_checkForSymptomType should return null for non-symptom');
});

runTests();
