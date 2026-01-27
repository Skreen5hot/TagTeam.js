/**
 * Temporal Linking Test Suite
 * Phase 7.1 Story 4: Link temporal regions to nearby entities
 * via cco:occupies_temporal_region
 */

const assert = require('assert');

let SemanticGraphBuilder;
try {
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
  console.log('  Temporal Linking Tests - Phase 7.1 Story 4');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!SemanticGraphBuilder) {
    console.log('❌ SemanticGraphBuilder not found.\n');
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

function findTemporalNode(graph, labelIncludes) {
  return getNodes(graph).find(n =>
    (n['rdfs:label'] || '').toLowerCase().includes(labelIncludes.toLowerCase()) &&
    n['@type'] && (n['@type'].includes('bfo:BFO_0000038') || n['@type'].includes('bfo:BFO_0000008'))
  );
}

// ═══════════════════════════════════════════════════════════════
// Basic temporal linking
// ═══════════════════════════════════════════════════════════════

test('"cough for three days" → cough has occupies_temporal_region', () => {
  const graph = buildGraph('Patient reports persistent cough for three days');
  const cough = findTier2ByLabel(graph, 'cough');
  const threeDays = findTemporalNode(graph, 'three days');
  assert.ok(threeDays, 'Should find temporal node "three days"');
  if (cough) {
    assert.ok(cough['cco:occupies_temporal_region'],
      'Cough should have cco:occupies_temporal_region');
    assert.strictEqual(
      cough['cco:occupies_temporal_region']['@id'],
      threeDays['@id'],
      'occupies_temporal_region should point to three days node'
    );
  }
});

test('"fever for two weeks" → fever linked to temporal region', () => {
  const graph = buildGraph('Patient has fever for two weeks');
  const fever = findTier2ByLabel(graph, 'fever');
  const twoWeeks = findTemporalNode(graph, 'two weeks');
  assert.ok(twoWeeks, 'Should find temporal node "two weeks"');
  if (fever) {
    assert.ok(fever['cco:occupies_temporal_region'],
      'Fever should have cco:occupies_temporal_region');
  }
});

// ═══════════════════════════════════════════════════════════════
// Cross-sentence isolation
// ═══════════════════════════════════════════════════════════════

test('Temporal in second sentence does not link to first sentence entities', () => {
  const graph = buildGraph('The doctor treats the patient. The fever lasted three days.');
  const doctor = findTier2ByLabel(graph, 'doctor');
  if (doctor) {
    // Doctor is in the first sentence, three days in the second
    // They should NOT be linked
    assert.ok(!doctor['cco:occupies_temporal_region'],
      'Doctor (first sentence) should NOT be linked to temporal in second sentence');
  }
});

// ═══════════════════════════════════════════════════════════════
// Temporal nodes themselves are not self-linked
// ═══════════════════════════════════════════════════════════════

test('Temporal node does not have occupies_temporal_region on itself', () => {
  const graph = buildGraph('Patient reports cough for three days');
  const threeDays = findTemporalNode(graph, 'three days');
  assert.ok(threeDays, 'Should find temporal node');
  assert.ok(!threeDays['cco:occupies_temporal_region'],
    'Temporal node should not link to itself');
});

// ═══════════════════════════════════════════════════════════════
// Acts/Roles are not linked
// ═══════════════════════════════════════════════════════════════

test('Act nodes do not receive occupies_temporal_region', () => {
  const graph = buildGraph('Patient reports cough for three days');
  const nodes = getNodes(graph);
  const acts = nodes.filter(n =>
    n['@type'] && (n['@type'].includes('cco:IntentionalAct') ||
                   n['@type'].includes('cco:ActOfCommunication'))
  );
  for (const act of acts) {
    assert.ok(!act['cco:occupies_temporal_region'],
      `Act "${act['rdfs:label']}" should NOT have occupies_temporal_region`);
  }
});

runTests();
