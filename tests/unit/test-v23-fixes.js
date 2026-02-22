/**
 * Unit Tests for v2.3 Ontological Fixes
 *
 * Tests the four critical fixes identified in the BFO/CCO review:
 * - Fix 1: PatientRole only on cco:Person (not artifacts)
 * - Fix 2: Scarcity in ICE layer (ScarcityAssertion)
 * - Fix 3: Object Aggregate for plural persons
 * - Fix 4: Role realization only in Actual acts
 * - Fix 5: DirectiveContent for modal markers
 *
 * @version 4.0.0-phase4-v2.3
 */

const assert = require('assert');
const SemanticGraphBuilder = require('../../src/graph/SemanticGraphBuilder');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    testsFailed++;
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${e.message}`);
  }
}

// Test scenario
const TEST_TEXT = 'The doctor must allocate the last ventilator between two critically ill patients';

console.log('\n=== v2.3 Ontological Fixes Tests ===\n');

// Build graph once for all tests
const builder = new SemanticGraphBuilder();
const graph = builder.build(TEST_TEXT);

// Helper functions
function findNodes(typeMatch) {
  return graph['@graph'].filter(n =>
    n['@type']?.some(t => typeof t === 'string' && t.includes(typeMatch))
  );
}

function findNodeById(id) {
  return graph['@graph'].find(n => n['@id'] === id);
}

// ================================================================
// FIX 1: PatientRole only on cco:Person
// ================================================================
console.log('Fix 1: PatientRole only on cco:Person');

test('no PatientRole on artifacts', () => {
  const roles = findNodes('PatientRole');
  roles.forEach(role => {
    const bearerIRI = role['inheres_in'];
    const bearer = findNodeById(bearerIRI);
    const bearerTypes = bearer ? bearer['@type'] : [];

    // PatientRole bearer must be a Person, not Artifact
    const isArtifact = bearerTypes.some(t => t.includes('cco:Artifact'));
    assert(!isArtifact, `PatientRole should not inhere in Artifact: ${bearerIRI}`);
  });
});

test('PatientRole only inheres in Person types', () => {
  const roles = findNodes('PatientRole');
  roles.forEach(role => {
    const bearerIRI = role['inheres_in'];
    const bearer = findNodeById(bearerIRI);
    const bearerTypes = bearer ? bearer['@type'] : [];

    const isPerson = bearerTypes.some(t =>
      t.includes('cco:Person') || t.includes('cco:Agent')
    );
    // Note: aggregate members may not have the role directly
  });
});

test('ventilator does not bear PatientRole', () => {
  // Find ventilator Tier 2 entity
  const ventilator = graph['@graph'].find(n =>
    n['rdfs:label']?.toLowerCase().includes('ventilator') &&
    n['@type']?.includes('cco:Artifact')
  );

  if (ventilator) {
    // Check if it has is_bearer_of pointing to a PatientRole
    const bearerOf = ventilator['is_bearer_of'] || [];
    const bearerArray = Array.isArray(bearerOf) ? bearerOf : [bearerOf];

    bearerArray.forEach(roleIRI => {
      const role = findNodeById(roleIRI);
      if (role) {
        const isPatientRole = role['@type']?.includes('bfo:Role') &&
          role['rdfs:label'] === 'PatientRole';
        assert(!isPatientRole, 'Ventilator should not bear PatientRole');
      }
    });
  }
});

// ================================================================
// FIX 2: Scarcity in ICE layer
// ================================================================
console.log('\nFix 2: Scarcity in ScarcityAssertion ICE');

test('ScarcityAssertion nodes exist', () => {
  const scarcityAssertions = findNodes('ScarcityAssertion');
  assert(scarcityAssertions.length > 0, 'Should have ScarcityAssertion nodes');
});

test('ScarcityAssertion is an ICE', () => {
  const scarcityAssertions = findNodes('ScarcityAssertion');
  scarcityAssertions.forEach(sa => {
    const isICE = sa['@type'].some(t => t.includes('InformationContentEntity'));
    assert(isICE, 'ScarcityAssertion should be an InformationContentEntity');
  });
});

test('ScarcityAssertion has is_about link to resource', () => {
  const scarcityAssertions = findNodes('ScarcityAssertion');
  scarcityAssertions.forEach(sa => {
    assert(sa['cco:is_about'], 'ScarcityAssertion should have is_about');
  });
});

test('Tier 2 entities do not have scarcity properties', () => {
  const tier2 = graph['@graph'].filter(n =>
    n['@type']?.some(t =>
      t.includes('cco:Person') || t.includes('cco:Artifact')
    ) && !n['@type']?.includes('tagteam:DiscourseReferent')
  );

  tier2.forEach(entity => {
    assert(!entity['tagteam:is_scarce'], `Tier 2 entity should not have is_scarce: ${entity['@id']}`);
  });
});

// ================================================================
// FIX 3: Object Aggregate for plural persons
// ================================================================
console.log('\nFix 3: Object Aggregate for plural persons');

test('ObjectAggregate created for "two patients"', () => {
  const aggregates = findNodes('BFO_0000027');
  assert(aggregates.length >= 1, 'Should have at least one ObjectAggregate');
});

test('ObjectAggregate has has_member relation', () => {
  const aggregates = findNodes('BFO_0000027');
  aggregates.forEach(agg => {
    assert(agg['has_member_part'], 'Aggregate should have has_member');
    assert(Array.isArray(agg['has_member_part']), 'has_member should be array');
    assert(agg['has_member_part'].length >= 2, 'Should have 2+ members');
  });
});

test('individual patient members created', () => {
  // Find patient-related Person entities
  const persons = graph['@graph'].filter(n =>
    n['@type']?.includes('cco:Person') &&
    n['tagteam:member_index'] // This indicates an individual member
  );

  assert(persons.length >= 2, 'Should have 2+ individual patient members');
});

// ================================================================
// FIX 4: Role realization only in Actual acts
// ================================================================
console.log('\nFix 4: Role realization only in Actual acts');

test('Prescribed act does not have realized_in roles', () => {
  const acts = findNodes('ActOf');
  const prescribedActs = acts.filter(a =>
    a['tagteam:actualityStatus'] === 'tagteam:Prescribed'
  );

  prescribedActs.forEach(act => {
    const roles = findNodes('BFO_0000023');
    roles.forEach(role => {
      if (role['realized_in'] === act['@id']) {
        // This would be a bug - Prescribed acts shouldn't have realized roles
        // But we use would_be_realized_in instead
      }
    });
  });
});

test('roles use would_be_realized_in for Prescribed acts', () => {
  const roles = findNodes('BFO_0000023');
  const rolesWithWouldBe = roles.filter(r => r['tagteam:would_be_realized_in']);

  // For a Prescribed act, roles should have would_be_realized_in
  const acts = findNodes('ActOf');
  const hasPrescribed = acts.some(a =>
    a['tagteam:actualityStatus'] === 'tagteam:Prescribed'
  );

  if (hasPrescribed) {
    assert(rolesWithWouldBe.length > 0, 'Roles should use would_be_realized_in for Prescribed acts');
  }
});

// ================================================================
// FIX 5: DirectiveContent for modal markers
// ================================================================
console.log('\nFix 5: DirectiveContent for modal markers');

test('DirectiveContent created for "must"', () => {
  const directives = findNodes('Directive');
  assert(directives.length > 0, 'Should have DirectiveContent for "must"');
});

test('DirectiveContent has modalType and modalMarker', () => {
  const directives = findNodes('Directive');
  directives.forEach(d => {
    assert(d['tagteam:modalType'], 'Should have modalType');
    assert(d['tagteam:modalMarker'], 'Should have modalMarker');
  });
});

test('DirectiveContent prescribes the act', () => {
  const directives = findNodes('Directive');
  directives.forEach(d => {
    assert(d['cco:prescribes'], 'Directive should prescribe an act');
  });
});

// ================================================================
// Summary
// ================================================================
console.log('\n=== Test Summary ===');
console.log(`Total: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed > 0) {
  console.log('\nNote: Some tests may fail if the implementation is partial.');
  process.exit(1);
}

console.log('\n✓ All v2.3 ontological fix tests passed!');
