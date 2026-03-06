#!/usr/bin/env node
/**
 * Test the bundle
 */

const path = require('path');

console.log('Testing bundle...\n');

// Test 1: Main bundle
console.log('Test 1: Main bundle (tagteam.js)');
try {
  const TagTeam = require('../dist/tagteam.js');

  console.log('  - Version:', TagTeam.version);
  console.log('  - SemanticGraphBuilder:', typeof TagTeam.SemanticGraphBuilder);

  // Test building a graph
  const graph = TagTeam.buildGraph('The doctor treats the patient');
  console.log('  - Graph nodes:', graph['@graph'].length);

  // Test parse
  const result = TagTeam.parse('The nurse should prioritize the patient');
  console.log('  - parse() agent:', result.agent?.text);
  console.log('  - parse() version:', result.version);

  console.log('  ✓ PASS - Bundle works\n');
} catch (e) {
  console.log('  ✗ FAIL:', e.message);
  console.log('  Stack:', e.stack?.split('\n').slice(0, 3).join('\n'));
  console.log('');
}

console.log('All bundle tests completed.');
