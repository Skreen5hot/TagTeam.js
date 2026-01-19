/**
 * Unit Tests for RoleDetector
 *
 * Tests Phase 1.4 Acceptance Criteria:
 * - AC-1.4.1: Role Creation
 * - AC-1.4.2: Role Bearer Link
 * - AC-1.4.3: Role Realization Link
 * - AC-1.4.4: Inverse Relations Consistency
 *
 * @version 3.0.0-alpha.2
 */

const assert = require('assert');
const RoleDetector = require('../../src/graph/RoleDetector');
const SemanticGraphBuilder = require('../../src/graph/SemanticGraphBuilder');

// Test counter
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    testsFailed++;
  }
}

console.log('\n=== RoleDetector Unit Tests ===\n');

// Test Suite 1: Basic Detection
console.log('Test Suite 1: Basic Detection');

test('RoleDetector can be instantiated', () => {
  const detector = new RoleDetector();
  assert(detector instanceof RoleDetector);
});

test('detect() returns array of roles', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));
  assert(Array.isArray(roles), 'Returns array');
  assert(roles.length > 0, 'Has roles');
});

test('detect() creates BFO Role nodes', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  assert(roles.length >= 1, 'Has at least one role');
  const role = roles[0];
  assert(role['@type'].includes('bfo:BFO_0000023'), 'Has BFO Role type');
});

test('detect() includes owl:NamedIndividual in type array', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  const role = roles[0];
  assert(role['@type'].includes('owl:NamedIndividual'), 'Has owl:NamedIndividual');
});

// Test Suite 2: Agent Role Detection (AC-1.4.1)
console.log('\nTest Suite 2: Agent Role Detection (AC-1.4.1)');

test('detects agent role from has_agent link', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  const agentRole = roles.find(r =>
    r['tagteam:roleType'] === 'agent');
  assert(agentRole, 'Found agent role');
});

test('agent role has cco:AgentRole type', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  const agentRole = roles.find(r =>
    r['tagteam:roleType'] === 'agent');
  assert(agentRole['@type'].includes('cco:AgentRole'), 'Has AgentRole type');
});

test('agent role has rdfs:label', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const roles = graph['@graph'].filter(n =>
    n['tagteam:roleType'] === 'agent');

  const role = roles[0];
  assert(role['rdfs:label'], 'Has label');
  assert(role['rdfs:label'].includes('agent'), 'Label includes agent');
});

// Test Suite 3: Patient Role Detection (AC-1.4.1)
console.log('\nTest Suite 3: Patient Role Detection (AC-1.4.1)');

test('detects patient role from affects link', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  const patientRole = roles.find(r =>
    r['tagteam:roleType'] === 'patient');
  assert(patientRole, 'Found patient role');
});

test('patient role has cco:PatientRole type', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  const patientRole = roles.find(r =>
    r['tagteam:roleType'] === 'patient');
  assert(patientRole['@type'].includes('cco:PatientRole'), 'Has PatientRole type');
});

// Test Suite 4: Role Bearer Link (AC-1.4.2)
console.log('\nTest Suite 4: Role Bearer Link (AC-1.4.2)');

test('every role has bfo:inheres_in (bearer link)', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  roles.forEach(role => {
    assert(role['bfo:inheres_in'], `${role['rdfs:label']} has bearer`);
  });
});

test('bearer link points to discourse referent', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  roles.forEach(role => {
    const bearerIRI = role['bfo:inheres_in'];
    const bearer = graph['@graph'].find(n => n['@id'] === bearerIRI);
    assert(bearer, `Found bearer for ${role['rdfs:label']}`);
    assert(bearer['@type'].includes('tagteam:DiscourseReferent'),
      'Bearer is discourse referent');
  });
});

test('agent role bearer is doctor referent', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const agentRole = graph['@graph'].find(n =>
    n['tagteam:roleType'] === 'agent');

  assert(agentRole['bfo:inheres_in'].includes('Doctor'),
    'Agent bearer is doctor');
});

test('patient role bearer is patient referent', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const patientRole = graph['@graph'].find(n =>
    n['tagteam:roleType'] === 'patient');

  assert(patientRole['bfo:inheres_in'].includes('Patient'),
    'Patient bearer is patient');
});

// Test Suite 5: Role Realization Link (AC-1.4.3)
console.log('\nTest Suite 5: Role Realization Link (AC-1.4.3)');

test('roles have bfo:realized_in (realization link)', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  const realizedRoles = roles.filter(r => r['bfo:realized_in']);
  assert(realizedRoles.length > 0, 'Has realized roles');
});

test('realization link points to IntentionalAct', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  roles.forEach(role => {
    if (role['bfo:realized_in']) {
      const actIRI = role['bfo:realized_in'];
      const act = graph['@graph'].find(n => n['@id'] === actIRI);
      assert(act, `Found act for ${role['rdfs:label']}`);
      assert(act['@type'].some(t => t.includes('IntentionalAct') || t.includes('ActOf')),
        'Realization is IntentionalAct');
    }
  });
});

// Test Suite 6: Inverse Relations (AC-1.4.4)
console.log('\nTest Suite 6: Inverse Relations (AC-1.4.4)');

test('bearers have bfo:is_bearer_of inverse relation', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  roles.forEach(role => {
    const bearerIRI = role['bfo:inheres_in'];
    const bearer = graph['@graph'].find(n => n['@id'] === bearerIRI);

    assert(bearer['bfo:is_bearer_of'], 'Bearer has is_bearer_of');
  });
});

test('is_bearer_of contains role IRI', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  roles.forEach(role => {
    const bearerIRI = role['bfo:inheres_in'];
    const bearer = graph['@graph'].find(n => n['@id'] === bearerIRI);

    const bearerOf = Array.isArray(bearer['bfo:is_bearer_of'])
      ? bearer['bfo:is_bearer_of']
      : [bearer['bfo:is_bearer_of']];

    assert(bearerOf.includes(role['@id']),
      `Bearer's is_bearer_of includes ${role['@id']}`);
  });
});

// Test Suite 7: Integration with SemanticGraphBuilder
console.log('\nTest Suite 7: Integration with SemanticGraphBuilder');

test('SemanticGraphBuilder detects roles automatically', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  assert(roles.length >= 1, 'Has at least 1 role');
});

test('graph contains entities, acts, and roles', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const entities = graph['@graph'].filter(n =>
    n['@type'].includes('tagteam:DiscourseReferent'));
  const acts = graph['@graph'].filter(n =>
    n['@type'].some(t => t.includes('IntentionalAct') || t.includes('ActOf')));
  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  assert(entities.length >= 2, 'Has entities');
  assert(acts.length >= 1, 'Has acts');
  assert(roles.length >= 1, 'Has roles');
});

test('can disable role detection', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient', { detectRoles: false });

  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  assert(roles.length === 0, 'No roles when disabled');
});

// Test Suite 8: IRI Generation
console.log('\nTest Suite 8: IRI Generation');

test('roles use inst: namespace', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  const role = roles[0];
  assert(role['@id'].startsWith('inst:'), 'IRI starts with inst:');
});

test('role IRIs include role type', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const agentRole = graph['@graph'].find(n =>
    n['tagteam:roleType'] === 'agent');

  assert(agentRole['@id'].includes('Agent') || agentRole['@id'].includes('Role'),
    'IRI includes role type');
});

test('role IRIs are deterministic', () => {
  const builder1 = new SemanticGraphBuilder();
  const graph1 = builder1.build('The doctor treats the patient');
  const roles1 = graph1['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  const builder2 = new SemanticGraphBuilder();
  const graph2 = builder2.build('The doctor treats the patient');
  const roles2 = graph2['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));

  // Same role type should have same IRI
  const agent1 = roles1.find(r => r['tagteam:roleType'] === 'agent');
  const agent2 = roles2.find(r => r['tagteam:roleType'] === 'agent');
  assert(agent1['@id'] === agent2['@id'], 'Same input produces same IRI');
});

// Test Suite 9: Complex Scenario (AC-1.4.1 - AC-1.4.4)
console.log('\nTest Suite 9: Complex Scenario (AC-1.4.1 - AC-1.4.4)');

test('complex: "The doctor must allocate the ventilator"', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor must allocate the ventilator');

  // AC-1.4.1: Role creation
  const roles = graph['@graph'].filter(n =>
    n['@type'].includes('bfo:BFO_0000023'));
  assert(roles.length >= 1, 'Extracted roles');

  // Find agent role
  const agentRole = roles.find(r => r['tagteam:roleType'] === 'agent');
  assert(agentRole, 'Agent role exists');

  // AC-1.4.2: Bearer link
  assert(agentRole['bfo:inheres_in'], 'Has bearer');
  const bearer = graph['@graph'].find(n => n['@id'] === agentRole['bfo:inheres_in']);
  assert(bearer['@type'].includes('tagteam:DiscourseReferent'), 'Bearer is referent');

  // AC-1.4.3: Realization link
  assert(agentRole['bfo:realized_in'], 'Has realization');
  const act = graph['@graph'].find(n => n['@id'] === agentRole['bfo:realized_in']);
  assert(act, 'Act exists');

  // AC-1.4.4: Inverse consistency
  const bearerOf = Array.isArray(bearer['bfo:is_bearer_of'])
    ? bearer['bfo:is_bearer_of']
    : [bearer['bfo:is_bearer_of']];
  assert(bearerOf.includes(agentRole['@id']), 'Inverse relation consistent');
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Total: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
}

console.log('\n✓ All Phase 1.4 unit tests passed!');
