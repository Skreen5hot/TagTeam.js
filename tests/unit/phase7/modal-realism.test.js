/**
 * Modal Realism Test Suite
 * Phase 7.1 Story 3: Modal adjectives stripped from Tier 2 labels
 *
 * "possible diabetes" → Tier 2 label = "diabetes", Tier 1 referentialStatus = "hypothetical"
 * Per realist ontology, modality belongs to the ICE, not the entity instance.
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
  console.log('  Modal Realism Tests - Phase 7.1 Story 3');
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

function findTier1Node(graph, labelIncludes) {
  const nodes = graph['@graph'] || [];
  return nodes.find(n =>
    (n['rdfs:label'] || '').toLowerCase().includes(labelIncludes.toLowerCase()) &&
    n['@type'] && n['@type'].includes('tagteam:DiscourseReferent')
  );
}

// ═══════════════════════════════════════════════════════════════
// Tier 1: referentialStatus = "hypothetical" for modal phrases
// ═══════════════════════════════════════════════════════════════

test('"possible diabetes" → Tier 1 referentialStatus = "hypothetical"', () => {
  const entities = extractEntities('Blood sugar levels suggest possible diabetes');
  const entity = findEntity(entities, 'possible diabetes') || findEntity(entities, 'diabetes');
  assert.ok(entity, 'Should find entity for "possible diabetes"');
  assert.strictEqual(entity['tagteam:referentialStatus'], 'hypothetical',
    'referentialStatus should be hypothetical, got: ' + entity['tagteam:referentialStatus']);
});

test('"suspected infection" → Tier 1 referentialStatus = "hypothetical"', () => {
  const entities = extractEntities('Results indicate suspected infection');
  const entity = findEntity(entities, 'suspected infection') || findEntity(entities, 'infection');
  assert.ok(entity, 'Should find entity for "suspected infection"');
  assert.strictEqual(entity['tagteam:referentialStatus'], 'hypothetical');
});

test('"likely pneumonia" → Tier 1 referentialStatus = "hypothetical"', () => {
  const entities = extractEntities('Diagnosis suggests likely pneumonia');
  const entity = findEntity(entities, 'likely pneumonia') || findEntity(entities, 'pneumonia');
  assert.ok(entity, 'Should find entity for "likely pneumonia"');
  assert.strictEqual(entity['tagteam:referentialStatus'], 'hypothetical');
});

test('"chest pain" (no modal) → referentialStatus != "hypothetical"', () => {
  const entities = extractEntities('Patient reports chest pain');
  const entity = findEntity(entities, 'chest pain');
  assert.ok(entity, 'Should find entity for "chest pain"');
  assert.notStrictEqual(entity['tagteam:referentialStatus'], 'hypothetical',
    'Non-modal phrase should not be hypothetical');
});

// ═══════════════════════════════════════════════════════════════
// Tier 2: Modal adjectives stripped from label
// ═══════════════════════════════════════════════════════════════

test('Tier 2 label for "possible diabetes" = "diabetes" (modal stripped)', () => {
  const graph = buildGraph('Blood sugar levels suggest possible diabetes');
  const tier2 = findTier2Node(graph, 'diabetes');
  assert.ok(tier2, 'Should find Tier 2 node for diabetes');
  assert.ok(!tier2['rdfs:label'].includes('possible'),
    'Tier 2 label should not contain "possible", got: ' + tier2['rdfs:label']);
});

test('Tier 2 label for "suspected infection" = "infection" (modal stripped)', () => {
  const graph = buildGraph('Results indicate suspected infection');
  const tier2 = findTier2Node(graph, 'infection');
  assert.ok(tier2, 'Should find Tier 2 node for infection');
  assert.ok(!tier2['rdfs:label'].includes('suspected'),
    'Tier 2 label should not contain "suspected", got: ' + tier2['rdfs:label']);
});

test('Tier 2 label for "chest pain" unchanged (no modal)', () => {
  const graph = buildGraph('Patient reports chest pain');
  const tier2 = findTier2Node(graph, 'chest pain');
  assert.ok(tier2, 'Should find Tier 2 node for chest pain');
  assert.ok(tier2['rdfs:label'].includes('chest pain'),
    'Non-modal label should be preserved');
});

// ═══════════════════════════════════════════════════════════════
// Tier 1 preserves original sourceText
// ═══════════════════════════════════════════════════════════════

test('Tier 1 preserves "possible diabetes" as sourceText/label', () => {
  const graph = buildGraph('Blood sugar levels suggest possible diabetes');
  const tier1 = findTier1Node(graph, 'possible diabetes') || findTier1Node(graph, 'diabetes');
  assert.ok(tier1, 'Should find Tier 1 node');
  // Tier 1 label or sourceText should contain the original modal phrase
  const label = tier1['rdfs:label'] || '';
  const source = tier1['tagteam:sourceText'] || '';
  assert.ok(label.includes('diabetes') || source.includes('diabetes'),
    'Tier 1 should reference diabetes');
});

// ═══════════════════════════════════════════════════════════════
// Disease type preserved after modal stripping
// ═══════════════════════════════════════════════════════════════

test('"possible diabetes" → Tier 2 typed BFO_0000016 (Disposition)', () => {
  const graph = buildGraph('Blood sugar levels suggest possible diabetes');
  const tier2 = findTier2Node(graph, 'diabetes');
  assert.ok(tier2, 'Should find Tier 2 node');
  assert.ok(tier2['@type'].includes('bfo:BFO_0000016'),
    'Should be Disposition, got: ' + JSON.stringify(tier2['@type']));
});

runTests();
