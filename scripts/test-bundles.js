#!/usr/bin/env node
/**
 * Test the separated bundles
 */

const path = require('path');

console.log('Testing separated bundles...\n');

// Test 1: Core bundle
console.log('Test 1: Core bundle (tagteam-core.js)');
try {
  const TagTeam = require('../dist/tagteam-core.js');

  console.log('  - Version:', TagTeam.version);
  console.log('  - SemanticGraphBuilder:', typeof TagTeam.SemanticGraphBuilder);

  // Test building a graph
  const graph = TagTeam.buildGraph('The doctor treats the patient');
  console.log('  - Graph nodes:', graph['@graph'].length);
  console.log('  - Has value assertions:', graph._metadata?.hasValueAssertions || false);

  // Verify no value assertions in core-only mode
  const valueAssertions = graph['@graph'].filter(n =>
    n['@type']?.includes('tagteam:ValueAssertionEvent')
  );
  if (valueAssertions.length === 0) {
    console.log('  ✓ PASS - Core bundle works without values\n');
  } else {
    console.log('  ✗ FAIL - Unexpected value assertions in core bundle\n');
  }
} catch (e) {
  console.log('  ✗ FAIL:', e.message);
  console.log('  Stack:', e.stack?.split('\n').slice(0, 3).join('\n'));
  console.log('');
}

// Test 2: Values bundle (requires core)
console.log('Test 2: Values bundle (tagteam-values.js)');
try {
  // First load core
  const TagTeam = require('../dist/tagteam-core.js');
  global.TagTeam = TagTeam; // Make available globally

  // Then load values
  const TagTeamValues = require('../dist/tagteam-values.js');

  console.log('  - Version:', TagTeamValues.version);
  console.log('  - IEEGraphBuilder:', typeof TagTeamValues.IEEGraphBuilder);

  // Test building a graph with values
  const builder = new TagTeamValues.IEEGraphBuilder();
  const graph = builder.build('The doctor must allocate the ventilator to the patient', {
    context: 'MedicalEthics'
  });

  console.log('  - Graph nodes:', graph['@graph'].length);
  console.log('  - Has scored values:', graph._metadata?.scoredValues?.length > 0 || false);

  console.log('  ✓ PASS - Values bundle works with core\n');
} catch (e) {
  console.log('  ✗ FAIL:', e.message);
  console.log('  Stack:', e.stack?.split('\n').slice(0, 3).join('\n'));
  console.log('');
}

// Test 3: Combined bundle
console.log('Test 3: Combined bundle (tagteam.js)');
try {
  // Clear the require cache to avoid conflicts
  delete require.cache[require.resolve('../dist/tagteam-core.js')];
  delete require.cache[require.resolve('../dist/tagteam-values.js')];

  const TagTeam = require('../dist/tagteam.js');

  console.log('  - Version:', TagTeam.version);
  console.log('  - SemanticGraphBuilder:', typeof TagTeam.SemanticGraphBuilder);
  console.log('  - AssertionEventBuilder:', typeof TagTeam.AssertionEventBuilder);

  // Test building a graph
  const graph = TagTeam.buildGraph('The nurse should prioritize the patient');
  console.log('  - Graph nodes:', graph['@graph'].length);

  console.log('  ✓ PASS - Combined bundle works\n');
} catch (e) {
  console.log('  ✗ FAIL:', e.message);
  console.log('  Stack:', e.stack?.split('\n').slice(0, 3).join('\n'));
  console.log('');
}

console.log('All bundle tests completed.');
