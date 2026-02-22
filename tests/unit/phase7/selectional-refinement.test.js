/**
 * Selectional Refinement Integration Test Suite
 * Phase 7.0 Story 4: Validates all three refinements together
 *
 * Stories covered:
 *   1. Temporal Region Detection (bfo:BFO_0000038 / bfo:BFO_0000008)
 *   2. Symptom & Quality Detection (bfo:BFO_0000019)
 *   3. Inanimate Agent Re-typing (InformationContentEntity)
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
  console.log('  Selectional Refinement Integration Tests - Phase 7.0');
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
    n['@type'] && !n['@type'].includes('tagteam:DiscourseReferent')
  );
}

function findNodesByType(graph, typeIncludes) {
  return getNodes(graph).filter(n =>
    n['@type'] && n['@type'].some(t => t.includes(typeIncludes))
  );
}

function findActByVerb(graph, verb) {
  return getNodes(graph).find(n =>
    (n['tagteam:verb'] === verb || n['tagteam:original_verb'] === verb) &&
    n['@type']
  );
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATION: Full medical sentence
// ═══════════════════════════════════════════════════════════════

const MEDICAL_TEXT =
  'Patient presents with chest pain and shortness of breath. ' +
  'Blood sugar levels are elevated, suggesting possible diabetes. ' +
  'Also reports persistent cough and fever for three days.';

let medicalGraph;

test('Integration: full medical sentence parses without error', () => {
  medicalGraph = buildGraph(MEDICAL_TEXT);
  assert.ok(medicalGraph, 'Graph should be produced');
  assert.ok(getNodes(medicalGraph).length > 0, 'Graph should have nodes');
});

test('Integration: "patient" → Person', () => {
  const node = findTier2ByLabel(medicalGraph, 'patient');
  assert.ok(node, 'Should find Tier 2 node for "patient"');
  assert.ok(node['@type'].includes('Person'),
    'patient should be Person, got: ' + JSON.stringify(node['@type']));
});

test('Integration: "chest pain" → bfo:BFO_0000019 (Quality)', () => {
  // May be combined with "shortness of breath" as a coordinated phrase
  const node = findTier2ByLabel(medicalGraph, 'chest pain');
  if (node) {
    assert.ok(node['@type'].includes('Quality'),
      'chest pain should be Quality, got: ' + JSON.stringify(node['@type']));
    assert.ok(!node['@type'].includes('Artifact'),
      'chest pain should NOT be Artifact');
  } else {
    // Compromise NLP may combine "chest pain and shortness of breath"
    const combined = findTier2ByLabel(medicalGraph, 'chest pain and shortness of breath');
    assert.ok(combined, 'Should find either "chest pain" or combined phrase');
    assert.ok(combined['@type'].includes('Quality'),
      'combined symptom phrase should be Quality');
  }
});

test('Integration: "blood sugar levels" → bfo:BFO_0000019 (Quality)', () => {
  const node = findTier2ByLabel(medicalGraph, 'blood sugar');
  assert.ok(node, 'Should find Tier 2 node for "blood sugar levels"');
  assert.ok(node['@type'].includes('Quality'),
    'blood sugar levels should be Quality, got: ' + JSON.stringify(node['@type']));
  assert.ok(!node['@type'].includes('Artifact'),
    'blood sugar levels should NOT be Artifact');
});

test('Integration: "three days" → bfo:BFO_0000038 (Temporal Region)', () => {
  const node = findTier2ByLabel(medicalGraph, 'three days');
  assert.ok(node, 'Should find Tier 2 node for "three days"');
  assert.ok(node['@type'].includes('bfo:BFO_0000038'),
    'three days should be Temporal Region, got: ' + JSON.stringify(node['@type']));
  assert.ok(!node['@type'].includes('Artifact'),
    'three days should NOT be Artifact');
});

test('Integration: "suggesting" → InformationContentEntity (not IntentionalAct)', () => {
  const node = findActByVerb(medicalGraph, 'suggest');
  assert.ok(node, 'Should find node for verb "suggest"');
  assert.ok(node['@type'].includes('InformationContentEntity'),
    'suggesting with inanimate subject should be ICE, got: ' + JSON.stringify(node['@type']));
  assert.ok(!node['@type'].includes('IntentionalAct'),
    'should NOT be IntentionalAct');
});

test('Integration: "reports" → ActOfCommunication (patient is animate)', () => {
  const node = findActByVerb(medicalGraph, 'report');
  assert.ok(node, 'Should find node for verb "report"');
  assert.ok(
    node['@type'].includes('ActOfCommunication') ||
    node['@type'].includes('IntentionalAct'),
    'reports with animate agent should be Act, got: ' + JSON.stringify(node['@type']));
  assert.ok(!node['@type'].includes('InformationContentEntity'),
    'should NOT be ICE when agent is animate');
});

// ═══════════════════════════════════════════════════════════════
// CROSS-STORY: No temporal or quality entity appears as agent
// ═══════════════════════════════════════════════════════════════

test('Integration: no temporal entity appears as has_agent', () => {
  const nodes = getNodes(medicalGraph);
  const temporalLabels = ['three days'];
  for (const n of nodes) {
    if (n['has_agent']) {
      const agentId = (n['has_agent']['@id'] || '').toLowerCase();
      for (const tl of temporalLabels) {
        const clean = tl.replace(/\s+/g, '_').toLowerCase();
        assert.ok(!agentId.includes(clean),
          `"${tl}" should not be agent of "${n['rdfs:label']}"`);
      }
    }
  }
});

test('Integration: no quality/symptom entity appears as has_agent', () => {
  const nodes = getNodes(medicalGraph);
  const symptomLabels = ['chest pain', 'blood sugar', 'cough', 'fever'];
  for (const n of nodes) {
    if (n['has_agent']) {
      const agentId = (n['has_agent']['@id'] || '').toLowerCase();
      for (const sl of symptomLabels) {
        const clean = sl.replace(/\s+/g, '_').toLowerCase();
        assert.ok(!agentId.includes(clean),
          `"${sl}" should not be agent of "${n['rdfs:label']}"`);
      }
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// CROSS-STORY: Artifact count should be minimal
// ═══════════════════════════════════════════════════════════════

test('Integration: medical sentence has no Artifact-typed Tier 2 nodes', () => {
  const artifacts = findNodesByType(medicalGraph, 'Artifact');
  // Filter to actual Tier 2 nodes (not DiscourseReferents)
  const tier2Artifacts = artifacts.filter(n =>
    !n['@type'].includes('tagteam:DiscourseReferent')
  );
  // In the medical sentence, nothing should be a plain Artifact
  // (patient=Person, symptoms=Quality, time=Temporal)
  assert.ok(tier2Artifacts.length === 0,
    `Expected 0 Artifact Tier 2 nodes, found ${tier2Artifacts.length}: ` +
    tier2Artifacts.map(n => n['rdfs:label']).join(', '));
});

// ═══════════════════════════════════════════════════════════════
// CROSS-STORY: Inference node links correctly
// ═══════════════════════════════════════════════════════════════

test('Integration: Inference node has is_about and supports_inference', () => {
  const node = findActByVerb(medicalGraph, 'suggest');
  assert.ok(node, 'Should find inference node');
  assert.ok(node['is_about'], 'Inference should have is_about');
  assert.ok(node['tagteam:supports_inference'],
    'Inference should have tagteam:supports_inference');
  assert.strictEqual(node['tagteam:detection_method'], 'selectional_retype');
});

runTests();
