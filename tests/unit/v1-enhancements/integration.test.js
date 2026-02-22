/**
 * v1 Enhancements Integration Tests
 * Cross-enhancement scenarios that verify multiple features working together
 */

const assert = require('assert');
const {
  buildGraph,
  findEntityByLabel,
  findActByVerb,
  findRoleByBearer,
  getRoleType,
  getAgentOfAct,
  getPatientOfAct
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
  console.log('  v1 Enhancements: Integration Tests');
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
// Cross-Enhancement: ENH-003 + ENH-015 (Imperative + Preposition)
// ═══════════════════════════════════════════════════════════════

test('INT-001: Imperative + Beneficiary: "Submit the report for the client"', () => {
  const graph = buildGraph('Submit the report for the client.');

  // ENH-003: Implicit agent "you"
  const agent = getAgentOfAct(graph, 'submit');
  assert.ok(agent, 'Act should have agent');
  assert.strictEqual(agent['rdfs:label'], 'you',
    'Agent should be implicit "you"');

  // ENH-015: Client is beneficiary
  const clientRole = findRoleByBearer(graph, 'client');
  assert.ok(clientRole, 'Client should have role');
  const roleType = getRoleType(clientRole);
  assert.strictEqual(roleType, 'beneficiary',
    `Client should be beneficiary, got: ${roleType}`);
});

test('INT-002: Imperative + Instrument: "Cut the cable with the pliers"', () => {
  const graph = buildGraph('Cut the cable with the pliers.');

  // ENH-003: Implicit agent
  const agent = getAgentOfAct(graph, 'cut');
  assert.ok(agent, 'Act should have agent');
  assert.strictEqual(agent['rdfs:label'], 'you');

  // ENH-015: Pliers is instrument
  const pliersRole = findRoleByBearer(graph, 'pliers');
  assert.ok(pliersRole, 'Pliers should have role');
  const roleType = getRoleType(pliersRole);
  assert.strictEqual(roleType, 'instrument',
    `Pliers should be instrument, got: ${roleType}`);
});

// ═══════════════════════════════════════════════════════════════
// Cross-Enhancement: ENH-001 + ENH-015 (Cognitive Verb + Preposition)
// ═══════════════════════════════════════════════════════════════

test('INT-003: Cognitive verb + Instrument: "Review the design with the checklist"', () => {
  const graph = buildGraph('Review the design with the checklist.');

  // ENH-001: Design refined to ICE
  const design = findEntityByLabel(graph, 'design');
  assert.ok(design, 'Should find design');
  assert.strictEqual(design['tagteam:denotesType'], 'InformationContentEntity',
    `Design should be ICE, got: ${design['tagteam:denotesType']}`);

  // ENH-015: Checklist is instrument
  const checklistRole = findRoleByBearer(graph, 'checklist');
  assert.ok(checklistRole, 'Checklist should have role');
  const roleType = getRoleType(checklistRole);
  assert.strictEqual(roleType, 'instrument',
    `Checklist should be instrument, got: ${roleType}`);
});

test('INT-004: Cognitive verb + Beneficiary: "Analyze the report for the client"', () => {
  const graph = buildGraph('The consultant analyzed the report for the client.');

  // ENH-001: Report refined to ICE
  const report = findEntityByLabel(graph, 'report');
  assert.ok(report, 'Should find report');
  assert.strictEqual(report['tagteam:denotesType'], 'InformationContentEntity',
    `Report should be ICE, got: ${report['tagteam:denotesType']}`);

  // ENH-015: Client is beneficiary
  const clientRole = findRoleByBearer(graph, 'client');
  assert.ok(clientRole, 'Client should have role');
  const roleType = getRoleType(clientRole);
  assert.strictEqual(roleType, 'beneficiary',
    `Client should be beneficiary, got: ${roleType}`);
});

// ═══════════════════════════════════════════════════════════════
// Cross-Enhancement: ENH-008 + ENH-015 (Ergative + Preposition)
// ═══════════════════════════════════════════════════════════════

test('INT-005: Ergative + Source: "The alarm sounded from the sensor"', () => {
  const graph = buildGraph('The alarm sounded from the sensor.');

  // ENH-008: Alarm demoted (emission verb)
  const act = findActByVerb(graph, 'sound');
  assert.ok(act, 'Should find sound act');

  const agent = getAgentOfAct(graph, 'sound');
  if (agent) {
    assert.notStrictEqual(agent['rdfs:label']?.toLowerCase(), 'alarm',
      'Alarm should not be agent (emission verb)');
  }

  // ENH-015: Sensor has "from" preposition
  const sensor = findEntityByLabel(graph, 'sensor');
  assert.ok(sensor, 'Should find sensor');
  assert.strictEqual(sensor['tagteam:introducingPreposition'], 'from',
    `Sensor should have prep "from", got: ${sensor['tagteam:introducingPreposition']}`);
});

// ═══════════════════════════════════════════════════════════════
// Cross-Enhancement: ENH-003 + ENH-001 (Imperative + Cognitive)
// ═══════════════════════════════════════════════════════════════

test('INT-006: Imperative + Cognitive: "Review the design"', () => {
  const graph = buildGraph('Review the design.');

  // ENH-003: Implicit agent
  const agent = getAgentOfAct(graph, 'review');
  assert.ok(agent, 'Act should have agent');
  assert.strictEqual(agent['rdfs:label'], 'you');

  // ENH-001: Design refined to ICE (cognitive verb "review")
  const design = findEntityByLabel(graph, 'design');
  assert.ok(design, 'Should find design');
  assert.strictEqual(design['tagteam:denotesType'], 'InformationContentEntity',
    `Design should be ICE, got: ${design['tagteam:denotesType']}`);
});

// ═══════════════════════════════════════════════════════════════
// Full Pipeline: All Four Enhancements
// ═══════════════════════════════════════════════════════════════

test('INT-007: Full pipeline: "Review the report for the client with the checklist"', () => {
  const graph = buildGraph('Review the report for the client with the checklist.');

  // ENH-003: Implicit agent
  const agent = getAgentOfAct(graph, 'review');
  assert.ok(agent, 'Act should have agent');
  assert.strictEqual(agent['rdfs:label'], 'you');

  // ENH-001: Report refined to ICE
  const report = findEntityByLabel(graph, 'report');
  assert.ok(report, 'Should find report');
  assert.strictEqual(report['tagteam:denotesType'], 'InformationContentEntity',
    `Report should be ICE, got: ${report['tagteam:denotesType']}`);

  // ENH-015: Client is beneficiary
  const clientRole = findRoleByBearer(graph, 'client');
  assert.ok(clientRole, 'Client should have role');
  assert.strictEqual(getRoleType(clientRole), 'beneficiary',
    'Client should be beneficiary');

  // ENH-015: Checklist is instrument
  const checklistRole = findRoleByBearer(graph, 'checklist');
  assert.ok(checklistRole, 'Checklist should have role');
  assert.strictEqual(getRoleType(checklistRole), 'instrument',
    'Checklist should be instrument');
});

// ═══════════════════════════════════════════════════════════════
// Regression: Ensure existing behavior unchanged
// ═══════════════════════════════════════════════════════════════

test('REG-001: Simple declarative unchanged: "The doctor treated the patient"', () => {
  const graph = buildGraph('The doctor treated the patient.');

  // Agent should be doctor
  const agent = getAgentOfAct(graph, 'treat');
  assert.ok(agent, 'Act should have agent');
  assert.ok(agent['rdfs:label']?.toLowerCase().includes('doctor'),
    `Doctor should be agent, got: ${agent['rdfs:label']}`);

  // Patient should be patient role
  const patientRole = findRoleByBearer(graph, 'patient');
  assert.ok(patientRole, 'Patient should have role');
  assert.strictEqual(getRoleType(patientRole), 'patient',
    'Patient should have patient role');
});

test('REG-002: Passive voice unchanged: "The patient was treated by the doctor"', () => {
  const graph = buildGraph('The patient was treated by the doctor.');

  // Agent should be doctor (passive voice)
  const agent = getAgentOfAct(graph, 'treat');
  assert.ok(agent, 'Act should have agent');
  assert.ok(agent['rdfs:label']?.toLowerCase().includes('doctor'),
    `Doctor should be agent in passive, got: ${agent['rdfs:label']}`);
});

// Run tests
runTests();
