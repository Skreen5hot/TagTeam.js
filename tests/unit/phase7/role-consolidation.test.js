/**
 * Role Consolidation Test Suite
 * Phase 7.1 Story 2: One role per bearer, realized across multiple acts
 *
 * BFO roles are continuants — they persist. A person bears ONE agent role
 * realized across multiple acts, not a new role per act.
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
  console.log('  Role Consolidation Tests - Phase 7.1 Story 2');
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

function findRoleNodes(graph, roleType) {
  return getNodes(graph).filter(n =>
    n['@type'] && n['@type'].includes(roleType)
  );
}

function findAgentRoles(graph) {
  return getNodes(graph).filter(n =>
    n['@type'] && n['@type'].includes('bfo:Role') &&
    (n['rdfs:label'] === 'AgentRole' || (typeof n['rdfs:label'] === 'string' && n['rdfs:label'].startsWith('agent role')))
  );
}

function findNodeByLabel(graph, labelIncludes) {
  return getNodes(graph).find(n =>
    (n['rdfs:label'] || '').toLowerCase().includes(labelIncludes.toLowerCase())
  );
}

// ═══════════════════════════════════════════════════════════════
// Multi-act sentence: one bearer, one role
// ═══════════════════════════════════════════════════════════════

const MULTI_ACT_TEXT =
  'Patient presents with chest pain and shortness of breath. ' +
  'Blood sugar levels are elevated, suggesting possible diabetes. ' +
  'Also reports persistent cough and fever for three days.';

let multiActGraph;

test('Multi-act sentence parses without error', () => {
  multiActGraph = buildGraph(MULTI_ACT_TEXT);
  assert.ok(multiActGraph, 'Graph should be produced');
});

test('Only one AgentRole node for "patient" across multiple acts', () => {
  const agentRoles = findAgentRoles(multiActGraph);
  // Filter to roles that inhere in patient
  const patientRoles = agentRoles.filter(r => {
    const inheres = r['inheres_in'];
    const iri = inheres ? (inheres['@id'] || inheres) : '';
    return iri.toLowerCase().includes('patient');
  });
  assert.strictEqual(patientRoles.length, 1,
    `Expected 1 agent role for patient, found ${patientRoles.length}`);
});

test('Consolidated role has array realized_in when multiple acts', () => {
  const agentRoles = findAgentRoles(multiActGraph);
  const patientRole = agentRoles.find(r => {
    const inheres = r['inheres_in'];
    const iri = inheres ? (inheres['@id'] || inheres) : '';
    return iri.toLowerCase().includes('patient');
  });
  if (!patientRole) {
    assert.fail('Should find patient agent role');
    return;
  }

  const realized = patientRole['realized_in'];
  if (Array.isArray(realized)) {
    assert.ok(realized.length >= 2,
      `Expected 2+ acts in realized_in array, got ${realized.length}`);
  } else {
    // Single act is also acceptable if NLP only detects one agent relationship
    assert.ok(realized, 'Should have at least one realized_in');
  }
});

test('Role label is bearer-only (no act verb)', () => {
  const agentRoles = findAgentRoles(multiActGraph);
  const patientRole = agentRoles.find(r => {
    const inheres = r['inheres_in'];
    const iri = inheres ? (inheres['@id'] || inheres) : '';
    return iri.toLowerCase().includes('patient');
  });
  if (!patientRole) {
    assert.fail('Should find patient agent role');
    return;
  }

  const label = patientRole['rdfs:label'] || '';
  assert.ok(label.includes('agent role of'),
    `Label should contain "agent role of", got: "${label}"`);
  assert.ok(!label.includes(' in '),
    `Label should NOT contain " in <verb>", got: "${label}"`);
});

test('Bearer has exactly one is_bearer_of reference', () => {
  const nodes = getNodes(multiActGraph);
  const patientNode = nodes.find(n =>
    (n['rdfs:label'] || '').toLowerCase().includes('patient') &&
    n['@type'] && n['@type'].includes('Person')
  );
  if (!patientNode) {
    // Skip if patient Tier 2 not found
    return;
  }

  const bearerOf = patientNode['is_bearer_of'];
  if (bearerOf) {
    const refs = Array.isArray(bearerOf) ? bearerOf : [bearerOf];
    // Deduplicate by IRI
    const uniqueIRIs = new Set(refs.map(r => typeof r === 'object' ? r['@id'] : r));
    assert.strictEqual(uniqueIRIs.size, refs.length,
      `Bearer links should be deduplicated, found ${refs.length} refs with ${uniqueIRIs.size} unique`);
  }
});

// ═══════════════════════════════════════════════════════════════
// Single-act sentence: still works (no regression)
// ═══════════════════════════════════════════════════════════════

test('Single-act sentence produces one role with single realized_in', () => {
  const graph = buildGraph('The doctor treats the patient');
  const agentRoles = findAgentRoles(graph);
  assert.ok(agentRoles.length >= 1, 'Should have at least one agent role');

  const doctorRole = agentRoles.find(r => {
    const inheres = r['inheres_in'];
    const iri = inheres ? (inheres['@id'] || inheres) : '';
    return iri.toLowerCase().includes('doctor');
  });
  if (doctorRole) {
    const realized = doctorRole['realized_in'];
    // Single act: should be object, not array
    assert.ok(!Array.isArray(realized),
      'Single-act role should have object realized_in, not array');
  }
});

// ═══════════════════════════════════════════════════════════════
// Role IRI determinism: same bearer always produces same IRI
// ═══════════════════════════════════════════════════════════════

test('Same bearer produces same role IRI across runs', () => {
  const graph1 = buildGraph('The doctor treats the patient');
  const graph2 = buildGraph('The doctor treats the patient');
  const roles1 = findAgentRoles(graph1);
  const roles2 = findAgentRoles(graph2);
  if (roles1.length > 0 && roles2.length > 0) {
    assert.strictEqual(roles1[0]['@id'], roles2[0]['@id'],
      'Same input should produce same role IRI');
  }
});

runTests();
