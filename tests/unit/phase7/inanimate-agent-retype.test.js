/**
 * Inanimate Agent Re-typing Test Suite
 * Phase 7.0 Story 3: Inanimate subjects with inference verbs → ICE (not IntentionalAct)
 *
 * "Blood sugar levels suggest diabetes" should produce InformationContentEntity,
 * NOT IntentionalAct with an inanimate agent.
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
  console.log('  Inanimate Agent Re-typing Tests - Phase 7.0 Story 3');
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

function findNodeByType(graph, typeIncludes) {
  const nodes = graph['@graph'] || [];
  return nodes.find(n =>
    n['@type'] && n['@type'].some(t => t.includes(typeIncludes))
  );
}

function findNodesByType(graph, typeIncludes) {
  const nodes = graph['@graph'] || [];
  return nodes.filter(n =>
    n['@type'] && n['@type'].some(t => t.includes(typeIncludes))
  );
}

function findActByVerb(graph, verb) {
  const nodes = graph['@graph'] || [];
  return nodes.find(n =>
    (n['tagteam:verb'] === verb || n['tagteam:original_verb'] === verb) &&
    n['@type']
  );
}

// ═══════════════════════════════════════════════════════════════
// Inanimate subject + inference verb → ICE
// ═══════════════════════════════════════════════════════════════

test('"Blood sugar levels suggest diabetes" → InformationContentEntity', () => {
  const graph = buildGraph('Blood sugar levels suggest diabetes');
  const node = findActByVerb(graph, 'suggest');
  assert.ok(node, 'Should find node for verb "suggest"');
  assert.ok(node['@type'].includes('InformationContentEntity'),
    '@type should include InformationContentEntity, got: ' + JSON.stringify(node['@type']));
  assert.ok(!node['@type'].includes('IntentionalAct'),
    '@type should NOT include IntentionalAct');
});

test('"suggest" with inanimate agent produces tagteam:Inference subtype', () => {
  const graph = buildGraph('Blood sugar levels suggest diabetes');
  const node = findActByVerb(graph, 'suggest');
  assert.ok(node, 'Should find node for verb "suggest"');
  assert.ok(node['@type'].includes('tagteam:Inference'),
    '@type should include tagteam:Inference');
});

test('"The results indicate infection" → InformationContentEntity', () => {
  const graph = buildGraph('The results indicate infection');
  const node = findActByVerb(graph, 'indicate');
  assert.ok(node, 'Should find node for verb "indicate"');
  assert.ok(node['@type'].includes('InformationContentEntity'),
    '@type should include InformationContentEntity, got: ' + JSON.stringify(node['@type']));
});

test('"indicate" with inanimate agent produces tagteam:ClinicalFinding subtype', () => {
  const graph = buildGraph('The results indicate infection');
  const node = findActByVerb(graph, 'indicate');
  assert.ok(node, 'Should find node for verb "indicate"');
  assert.ok(node['@type'].includes('tagteam:ClinicalFinding'),
    '@type should include tagteam:ClinicalFinding');
});

test('"The data shows improvement" → InformationContentEntity', () => {
  const graph = buildGraph('The data shows improvement');
  const node = findActByVerb(graph, 'show');
  assert.ok(node, 'Should find node for verb "show"');
  assert.ok(node['@type'].includes('InformationContentEntity'),
    '@type should include InformationContentEntity, got: ' + JSON.stringify(node['@type']));
});

// ═══════════════════════════════════════════════════════════════
// ICE node metadata
// ═══════════════════════════════════════════════════════════════

test('ICE node has detection_method and original_verb', () => {
  const graph = buildGraph('Blood sugar levels suggest diabetes');
  const node = findActByVerb(graph, 'suggest');
  assert.ok(node, 'Should find inference node');
  assert.strictEqual(node['tagteam:detection_method'], 'selectional_retype');
  assert.strictEqual(node['tagteam:original_verb'], 'suggest');
});

test('ICE node has is_about linking to inanimate source', () => {
  const graph = buildGraph('Blood sugar levels suggest diabetes');
  const node = findActByVerb(graph, 'suggest');
  assert.ok(node, 'Should find inference node');
  assert.ok(node['is_about'], 'Should have is_about property');
  assert.ok(node['is_about']['@id'], 'is_about should have @id');
});

test('ICE node has tagteam:supports_inference linking to inferred entity', () => {
  const graph = buildGraph('Blood sugar levels suggest diabetes');
  const node = findActByVerb(graph, 'suggest');
  assert.ok(node, 'Should find inference node');
  assert.ok(node['tagteam:supports_inference'],
    'Should have tagteam:supports_inference property');
});

// ═══════════════════════════════════════════════════════════════
// Animate subject + inference verb → IntentionalAct (unchanged)
// ═══════════════════════════════════════════════════════════════

test('"The doctor suggests treatment" → IntentionalAct (animate agent)', () => {
  const graph = buildGraph('The doctor suggests treatment');
  const node = findActByVerb(graph, 'suggest');
  assert.ok(node, 'Should find node for verb "suggest"');
  // Doctor is animate → should remain IntentionalAct
  assert.ok(!node['@type'].includes('InformationContentEntity'),
    '@type should NOT include InformationContentEntity when agent is animate');
});

test('"Patient reports persistent cough" → ActOfCommunication (unchanged)', () => {
  const graph = buildGraph('Patient reports persistent cough');
  const node = findActByVerb(graph, 'report');
  assert.ok(node, 'Should find node for verb "report"');
  // Patient is animate → communication act unchanged
  assert.ok(node['@type'].includes('ActOfCommunication') ||
            node['@type'].includes('IntentionalAct'),
    'Animate agent should produce IntentionalAct or ActOfCommunication');
  assert.ok(!node['@type'].includes('InformationContentEntity'),
    '@type should NOT include InformationContentEntity for animate agent');
});

// ═══════════════════════════════════════════════════════════════
// Non-inference verbs with inanimate agents remain unchanged
// ═══════════════════════════════════════════════════════════════

test('Non-inference verb with any subject remains IntentionalAct', () => {
  const graph = buildGraph('The doctor treats the patient');
  const node = findActByVerb(graph, 'treat');
  assert.ok(node, 'Should find node for verb "treat"');
  assert.ok(node['@type'].includes('IntentionalAct'),
    'Non-inference verb should produce standard act type');
});

runTests();
