/**
 * ENH-015: Prepositional Phrase Semantic Role Discrimination
 * Test Suite for v1 Enhancement
 *
 * Acceptance Criteria:
 * AC-015.1: "for NP" → BeneficiaryRole
 * AC-015.2: "with NP" (instrument) → InstrumentRole
 * AC-015.3: "with NP" (comitative, person) → participant
 * AC-015.4: "to NP" → RecipientRole
 * AC-015.5: "by NP" in passive → AgentRole
 * AC-015.6: "from NP" → SourceRole (participant)
 * AC-015.7: No preposition → default PatientRole for persons
 * AC-015.8: Preposition tracked in entity metadata
 */

const assert = require('assert');
const {
  buildGraph,
  findEntityByLabel,
  findRoleByBearer,
  getRoleType,
  hasIntroducingPreposition,
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
  console.log('  ENH-015: Prepositional Phrase Semantic Role Discrimination');
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
// AC-015.1: "for NP" → BeneficiaryRole
// ═══════════════════════════════════════════════════════════════

test('AC-015.1a: "repaired the device for the client" → client is beneficiary', () => {
  const graph = buildGraph('The technician repaired the device for the client.');
  const clientRole = findRoleByBearer(graph, 'client');

  assert.ok(clientRole, 'Client should have a role');
  const roleType = getRoleType(clientRole);
  assert.strictEqual(roleType, 'beneficiary',
    `Client should have beneficiary role, got: ${roleType}`);
});

test('AC-015.1b: "repaired the device for the client" → device is patient', () => {
  const graph = buildGraph('The technician repaired the device for the client.');
  const deviceRole = findRoleByBearer(graph, 'device');

  assert.ok(deviceRole, 'Device should have a role');
  const roleType = getRoleType(deviceRole);
  assert.strictEqual(roleType, 'patient',
    `Device should have patient role, got: ${roleType}`);
});

test('AC-015.1c: "bought flowers for the patient" → patient is beneficiary', () => {
  const graph = buildGraph('The nurse bought flowers for the patient.');
  const patientRole = findRoleByBearer(graph, 'patient');

  assert.ok(patientRole, 'Patient should have a role');
  const roleType = getRoleType(patientRole);
  assert.strictEqual(roleType, 'beneficiary',
    `Patient should have beneficiary role, got: ${roleType}`);
});

// ═══════════════════════════════════════════════════════════════
// AC-015.2: "with NP" (instrument) → InstrumentRole
// ═══════════════════════════════════════════════════════════════

test('AC-015.2a: "operated with the scalpel" → scalpel is instrument', () => {
  const graph = buildGraph('The surgeon operated with the scalpel.');
  const scalpelRole = findRoleByBearer(graph, 'scalpel');

  assert.ok(scalpelRole, 'Scalpel should have a role');
  const roleType = getRoleType(scalpelRole);
  assert.strictEqual(roleType, 'instrument',
    `Scalpel should have instrument role, got: ${roleType}`);
});

test('AC-015.2b: "cut the tape with scissors" → scissors is instrument', () => {
  const graph = buildGraph('The worker cut the tape with scissors.');
  const scissorsRole = findRoleByBearer(graph, 'scissors');

  assert.ok(scissorsRole, 'Scissors should have a role');
  const roleType = getRoleType(scissorsRole);
  assert.strictEqual(roleType, 'instrument',
    `Scissors should have instrument role, got: ${roleType}`);
});

// ═══════════════════════════════════════════════════════════════
// AC-015.3: "with NP" (comitative, person) → participant
// ═══════════════════════════════════════════════════════════════

test('AC-015.3: "consulted with the specialist" → specialist is participant (comitative)', () => {
  const graph = buildGraph('The doctor consulted with the specialist.');
  const specialistRole = findRoleByBearer(graph, 'specialist');

  assert.ok(specialistRole, 'Specialist should have a role');
  const roleType = getRoleType(specialistRole);
  // "with" + Person = comitative (not instrument)
  assert.strictEqual(roleType, 'participant',
    `Specialist should be participant (comitative), got: ${roleType}`);
});

// ═══════════════════════════════════════════════════════════════
// AC-015.4: "to NP" → RecipientRole
// ═══════════════════════════════════════════════════════════════

test('AC-015.4a: "gave the medication to the patient" → patient is recipient', () => {
  const graph = buildGraph('The nurse gave the medication to the patient.');
  const patientRole = findRoleByBearer(graph, 'patient');

  assert.ok(patientRole, 'Patient should have a role');
  const roleType = getRoleType(patientRole);
  assert.strictEqual(roleType, 'recipient',
    `Patient should have recipient role, got: ${roleType}`);
});

test('AC-015.4b: "gave the medication to the patient" → medication is patient', () => {
  const graph = buildGraph('The nurse gave the medication to the patient.');
  const medRole = findRoleByBearer(graph, 'medication');

  assert.ok(medRole, 'Medication should have a role');
  const roleType = getRoleType(medRole);
  assert.strictEqual(roleType, 'patient',
    `Medication should have patient role, got: ${roleType}`);
});

test('AC-015.4c: "sent the report to the manager" → manager is recipient', () => {
  const graph = buildGraph('The assistant sent the report to the manager.');
  const managerRole = findRoleByBearer(graph, 'manager');

  assert.ok(managerRole, 'Manager should have a role');
  const roleType = getRoleType(managerRole);
  assert.strictEqual(roleType, 'recipient',
    `Manager should have recipient role, got: ${roleType}`);
});

// ═══════════════════════════════════════════════════════════════
// AC-015.5: "by NP" in passive → AgentRole
// ═══════════════════════════════════════════════════════════════

test('AC-015.5: "The report was reviewed by the auditor" → auditor is agent', () => {
  const graph = buildGraph('The report was reviewed by the auditor.');
  const auditor = getAgentOfAct(graph, 'review');

  assert.ok(auditor, 'Should have an agent');
  assert.ok(auditor['rdfs:label']?.toLowerCase().includes('auditor'),
    `Auditor should be agent, got: ${auditor['rdfs:label']}`);
});

// ═══════════════════════════════════════════════════════════════
// AC-015.6: "from NP" → SourceRole (participant with preposition)
// ═══════════════════════════════════════════════════════════════

test('AC-015.6: "received data from the sensor" → sensor has prep "from"', () => {
  const graph = buildGraph('The system received data from the sensor.');
  const sensor = findEntityByLabel(graph, 'sensor');

  assert.ok(sensor, 'Should find sensor entity');
  assert.strictEqual(sensor['tagteam:introducingPreposition'], 'from',
    `Sensor should have introducingPreposition "from", got: ${sensor['tagteam:introducingPreposition']}`);
});

// ═══════════════════════════════════════════════════════════════
// AC-015.7: No preposition → default PatientRole for persons
// ═══════════════════════════════════════════════════════════════

test('AC-015.7a: "The doctor treated the patient" → patient has PatientRole', () => {
  const graph = buildGraph('The doctor treated the patient.');
  const patientRole = findRoleByBearer(graph, 'patient');

  assert.ok(patientRole, 'Patient should have a role');
  const roleType = getRoleType(patientRole);
  assert.strictEqual(roleType, 'patient',
    `Direct object person should have patient role, got: ${roleType}`);
});

test('AC-015.7b: Direct object without preposition → no introducingPreposition', () => {
  const graph = buildGraph('The doctor treated the patient.');
  const patient = findEntityByLabel(graph, 'patient');

  assert.ok(patient, 'Should find patient entity');
  assert.ok(!patient['tagteam:introducingPreposition'],
    'Direct object should not have introducing preposition');
});

// ═══════════════════════════════════════════════════════════════
// AC-015.8: Preposition tracked in entity metadata
// ═══════════════════════════════════════════════════════════════

test('AC-015.8a: "gave medication to the patient" → patient has prep "to"', () => {
  const graph = buildGraph('The nurse gave medication to the patient.');
  const patient = findEntityByLabel(graph, 'patient');

  assert.ok(patient, 'Should find patient entity');
  assert.strictEqual(patient['tagteam:introducingPreposition'], 'to',
    `Patient should have introducingPreposition "to", got: ${patient['tagteam:introducingPreposition']}`);
});

test('AC-015.8b: "repaired device for the client" → client has prep "for"', () => {
  const graph = buildGraph('The technician repaired the device for the client.');
  const client = findEntityByLabel(graph, 'client');

  assert.ok(client, 'Should find client entity');
  assert.strictEqual(client['tagteam:introducingPreposition'], 'for',
    `Client should have introducingPreposition "for", got: ${client['tagteam:introducingPreposition']}`);
});

test('AC-015.8c: "operated with the scalpel" → scalpel has prep "with"', () => {
  const graph = buildGraph('The surgeon operated with the scalpel.');
  const scalpel = findEntityByLabel(graph, 'scalpel');

  assert.ok(scalpel, 'Should find scalpel entity');
  assert.strictEqual(scalpel['tagteam:introducingPreposition'], 'with',
    `Scalpel should have introducingPreposition "with", got: ${scalpel['tagteam:introducingPreposition']}`);
});

// Run tests
runTests();
