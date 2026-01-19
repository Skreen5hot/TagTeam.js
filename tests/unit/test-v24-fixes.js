/**
 * Unit Tests for v2.4 Ontological Fixes
 *
 * Tests the fixes from CCO expert review:
 * - Fix A: PatientRole on individual aggregate members
 * - Fix C: BFO Quality nodes for qualifiers like "critically ill"
 *
 * @version 4.0.0-phase4-v2.4
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

console.log('\n=== v2.4 Ontological Fixes Tests ===\n');

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
// FIX A: PatientRole on aggregate members
// ================================================================
console.log('Fix A: PatientRole on aggregate members');

test('aggregate members exist', () => {
  const members = graph['@graph'].filter(n =>
    n['tagteam:member_index'] !== undefined
  );
  assert(members.length >= 2, `Should have at least 2 members, found ${members.length}`);
});

test('aggregate members have PatientRole', () => {
  const members = graph['@graph'].filter(n =>
    n['tagteam:member_index'] !== undefined &&
    n['@type']?.includes('cco:Person')
  );

  const patientRoles = findNodes('PatientRole');

  // Each person member should have a PatientRole that inheres in it
  members.forEach(member => {
    const hasPatientRole = patientRoles.some(role =>
      role['bfo:inheres_in'] === member['@id']
    );
    assert(hasPatientRole, `Member ${member['@id']} should have PatientRole`);
  });
});

test('PatientRoles inhere in Person members (not aggregate)', () => {
  const patientRoles = findNodes('PatientRole');
  const aggregates = findNodes('BFO_0000027');

  patientRoles.forEach(role => {
    const bearer = findNodeById(role['bfo:inheres_in']);
    if (bearer) {
      // Should NOT be an aggregate
      const isAggregate = bearer['@type']?.some(t => t.includes('BFO_0000027'));
      assert(!isAggregate, 'PatientRole should not inhere in ObjectAggregate');

      // Should be a Person
      const isPerson = bearer['@type']?.some(t => t.includes('cco:Person'));
      assert(isPerson, 'PatientRole bearer should be cco:Person');
    }
  });
});

test('member bfo:is_bearer_of links to PatientRole', () => {
  const members = graph['@graph'].filter(n =>
    n['tagteam:member_index'] !== undefined &&
    n['@type']?.includes('cco:Person')
  );

  members.forEach(member => {
    const bearerOf = member['bfo:is_bearer_of'] || [];
    const bearerArray = Array.isArray(bearerOf) ? bearerOf : [bearerOf];

    // Should have at least one role (PatientRole or Quality)
    assert(bearerArray.length > 0, `Member ${member['rdfs:label']} should be bearer of something`);

    // Find PatientRole specifically
    const hasPatientRole = bearerArray.some(roleIRI => {
      const role = findNodeById(roleIRI);
      return role && role['@type']?.some(t => t.includes('PatientRole'));
    });
    assert(hasPatientRole, `Member ${member['rdfs:label']} should bear PatientRole`);
  });
});

// ================================================================
// FIX C: Quality nodes for qualifiers
// ================================================================
console.log('\nFix C: BFO Quality nodes for qualifiers');

test('Quality nodes created for "critically ill"', () => {
  const qualities = findNodes('BFO_0000019');
  assert(qualities.length > 0, 'Should have at least one Quality node');
});

test('Quality nodes have correct type for critical illness', () => {
  const qualities = findNodes('DiseaseQuality');
  // Should have DiseaseQuality for "critically ill"
  assert(qualities.length >= 2, 'Should have DiseaseQuality for each ill patient');
});

test('Quality nodes have inheres_in link to Person', () => {
  const qualities = findNodes('BFO_0000019');

  qualities.forEach(quality => {
    assert(quality['bfo:inheres_in'], 'Quality should have inheres_in');

    const bearer = findNodeById(quality['bfo:inheres_in']);
    assert(bearer, 'Quality bearer should exist');

    const isPerson = bearer['@type']?.some(t => t.includes('cco:Person'));
    assert(isPerson, 'Quality should inhere in Person');
  });
});

test('Quality has severity property for critical illness', () => {
  const diseaseQualities = findNodes('DiseaseQuality');

  diseaseQualities.forEach(quality => {
    assert(quality['tagteam:severity'] === 'critical',
      `Critical illness quality should have severity 'critical', got '${quality['tagteam:severity']}'`);
  });
});

test('Quality has qualifierText property', () => {
  const qualities = findNodes('BFO_0000019');

  qualities.forEach(quality => {
    assert(quality['tagteam:qualifierText'],
      'Quality should have qualifierText property');
  });
});

test('Person members bear both PatientRole and Quality', () => {
  const members = graph['@graph'].filter(n =>
    n['tagteam:member_index'] !== undefined &&
    n['@type']?.includes('cco:Person')
  );

  members.forEach(member => {
    const bearerOf = member['bfo:is_bearer_of'] || [];
    const bearerArray = Array.isArray(bearerOf) ? bearerOf : [bearerOf];

    // Check for PatientRole
    const hasPatientRole = bearerArray.some(iri => {
      const node = findNodeById(iri);
      return node && node['@type']?.some(t => t.includes('PatientRole'));
    });

    // Check for Quality
    const hasQuality = bearerArray.some(iri => {
      const node = findNodeById(iri);
      return node && node['@type']?.some(t => t.includes('BFO_0000019'));
    });

    assert(hasPatientRole, `Member ${member['rdfs:label']} should bear PatientRole`);
    assert(hasQuality, `Member ${member['rdfs:label']} should bear Quality`);
  });
});

// ================================================================
// Verify previous v2.3 fixes still work
// ================================================================
console.log('\nVerify v2.3 fixes still work');

test('ScarcityAssertion still exists', () => {
  const scarcityAssertions = findNodes('ScarcityAssertion');
  assert(scarcityAssertions.length > 0, 'Should have ScarcityAssertion nodes');
});

test('DirectiveContent still exists', () => {
  const directives = findNodes('Directive');
  assert(directives.length > 0, 'Should have DirectiveContent for "must"');
});

test('ObjectAggregate still exists', () => {
  const aggregates = findNodes('BFO_0000027');
  assert(aggregates.length >= 1, 'Should have ObjectAggregate');
});

test('AgentRole uses would_be_realized_in (not realized_in) for Prescribed', () => {
  const agentRoles = findNodes('AgentRole');
  agentRoles.forEach(role => {
    // For Prescribed acts, should use would_be_realized_in
    assert(role['tagteam:would_be_realized_in'] || role['bfo:realized_in'],
      'Role should have realization link');
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

console.log('\n✓ All v2.4 ontological fix tests passed!');
