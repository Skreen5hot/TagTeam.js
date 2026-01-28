/**
 * ENH-008: Ergative/Unaccusative Verb Agent Demotion
 * Test Suite for v1 Enhancement
 *
 * Acceptance Criteria:
 * AC-008.1: Intransitive ergative demotes inanimate agent
 * AC-008.2: Always-ergative verbs demote even with object
 * AC-008.3: Animate subject of ergative verb remains agent
 * AC-008.4: Non-ergative verb preserves inanimate agent
 * AC-008.5: Emission verbs are always demoted
 */

const assert = require('assert');
const {
  buildGraph,
  findActByVerb,
  getAgentOfAct,
  getPatientOfAct,
  findEntityByLabel,
  findRoleByBearer,
  getRoleType
} = require('./test-utils');

const tests = [];
const results = { passed: 0, failed: 0, skipped: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

function skip(name, fn) {
  tests.push({ name, fn, skip: true });
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ENH-008: Ergative/Unaccusative Verb Agent Demotion');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const t of tests) {
    if (t.skip) {
      results.skipped++;
      console.log(`  ⏭️  ${t.name} (skipped)`);
      continue;
    }

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

  console.log(`\n  Total: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped\n`);

  if (results.failed > 0) {
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════
// AC-008.1: Intransitive ergative demotes inanimate agent
// ═══════════════════════════════════════════════════════════════

test('AC-008.1a: "The server rebooted" → server is NOT agent', () => {
  const graph = buildGraph('The server rebooted.');
  const act = findActByVerb(graph, 'reboot');

  assert.ok(act, 'Should find reboot act');

  // Server should NOT be agent
  const agent = getAgentOfAct(graph, 'reboot');
  if (agent) {
    assert.notStrictEqual(agent['rdfs:label']?.toLowerCase(), 'server',
      'Server should not be agent of intransitive ergative');
  }
});

test('AC-008.1b: "The server rebooted" → server is participant/patient', () => {
  const graph = buildGraph('The server rebooted.');
  const act = findActByVerb(graph, 'reboot');

  assert.ok(act, 'Should find reboot act');

  // Server should be patient or participant
  const patient = getPatientOfAct(graph, 'reboot');
  const hasParticipant = act['bfo:has_participant'];

  assert.ok(patient || hasParticipant,
    'Server should be patient or participant');
});

test('AC-008.1c: "The system crashed" → system is demoted', () => {
  const graph = buildGraph('The system crashed.');
  const agent = getAgentOfAct(graph, 'crash');

  if (agent) {
    assert.notStrictEqual(agent['rdfs:label']?.toLowerCase(), 'system',
      'System should not be agent of "crash"');
  }
});

// ═══════════════════════════════════════════════════════════════
// AC-008.2: Always-ergative verbs demote even with object
// ═══════════════════════════════════════════════════════════════

test('AC-008.2a: "The alarm sounded the warning" → alarm is NOT agent', () => {
  const graph = buildGraph('The alarm sounded the warning.');
  const agent = getAgentOfAct(graph, 'sound');

  // Alarm (inanimate + emission verb) should never be agent
  if (agent) {
    assert.notStrictEqual(agent['rdfs:label']?.toLowerCase(), 'alarm',
      'Alarm should not be agent (emission verb)');
  }
});

test('AC-008.2b: "The alarm sounded the warning" → warning is patient', () => {
  const graph = buildGraph('The alarm sounded the warning.');
  const patient = getPatientOfAct(graph, 'sound');

  assert.ok(patient, 'Should have a patient');
  assert.ok(patient['rdfs:label']?.toLowerCase().includes('warning'),
    `Warning should be patient, got: ${patient['rdfs:label']}`);
});

// ═══════════════════════════════════════════════════════════════
// AC-008.3: Animate subject of ergative verb remains agent
// ═══════════════════════════════════════════════════════════════

test('AC-008.3a: "The technician rebooted the server" → technician is agent', () => {
  const graph = buildGraph('The technician rebooted the server.');
  const agent = getAgentOfAct(graph, 'reboot');

  assert.ok(agent, 'Should have an agent');
  assert.ok(agent['rdfs:label']?.toLowerCase().includes('technician'),
    `Technician should be agent, got: ${agent['rdfs:label']}`);
});

test('AC-008.3b: "The technician rebooted the server" → server is patient', () => {
  const graph = buildGraph('The technician rebooted the server.');
  const patient = getPatientOfAct(graph, 'reboot');

  assert.ok(patient, 'Should have a patient');
  assert.ok(patient['rdfs:label']?.toLowerCase().includes('server'),
    `Server should be patient, got: ${patient['rdfs:label']}`);
});

// ═══════════════════════════════════════════════════════════════
// AC-008.4: Non-ergative verb preserves inanimate agent
// ═══════════════════════════════════════════════════════════════

test('AC-008.4: "The bulldozer destroyed the building" → bulldozer is agent', () => {
  const graph = buildGraph('The bulldozer destroyed the building.');
  const agent = getAgentOfAct(graph, 'destroy');

  // "destroy" is NOT ergative - bulldozer can be agent (instrument-as-agent)
  assert.ok(agent, 'Should have an agent');
  assert.ok(agent['rdfs:label']?.toLowerCase().includes('bulldozer'),
    `Bulldozer should be agent (non-ergative verb), got: ${agent['rdfs:label']}`);
});

// ═══════════════════════════════════════════════════════════════
// AC-008.5: Emission verbs are always demoted
// ═══════════════════════════════════════════════════════════════

test('AC-008.5a: "The sensor emitted a signal" → sensor is NOT agent', () => {
  const graph = buildGraph('The sensor emitted a signal.');
  const agent = getAgentOfAct(graph, 'emit');

  if (agent) {
    assert.notStrictEqual(agent['rdfs:label']?.toLowerCase(), 'sensor',
      'Sensor should not be agent (emission verb)');
  }
});

test('AC-008.5b: "The LED flashed" → LED is NOT agent', () => {
  const graph = buildGraph('The LED flashed.');
  const agent = getAgentOfAct(graph, 'flash');

  if (agent) {
    assert.notStrictEqual(agent['rdfs:label']?.toLowerCase(), 'led',
      'LED should not be agent (emission verb)');
  }
});

test('AC-008.5c: "The beacon glowed" → beacon is demoted', () => {
  const graph = buildGraph('The beacon glowed.');
  const agent = getAgentOfAct(graph, 'glow');

  if (agent) {
    assert.notStrictEqual(agent['rdfs:label']?.toLowerCase(), 'beacon',
      'Beacon should not be agent (emission verb)');
  }
});

// Run tests
runTests();
