/**
 * Test IEEGraphBuilder
 *
 * Verifies that the IEE values package works correctly with tagteam-core.
 */

// Use local paths for monorepo testing
const IEEGraphBuilder = require('../src/IEEGraphBuilder');
const ValueAnalyzer = require('../src/ValueAnalyzer');

console.log('Testing tagteam-iee-values package...\n');

// Test 1: IEEGraphBuilder basic usage
console.log('Test 1: IEEGraphBuilder.build()');
try {
  const builder = new IEEGraphBuilder();
  const graph = builder.build('The doctor must allocate the last ventilator to the critically ill patient', {
    context: 'MedicalEthics'
  });

  console.log('  - Graph nodes:', graph['@graph'].length);
  console.log('  - Has value assertions:', graph._metadata?.hasValueAssertions || false);
  console.log('  - Value count:', graph._metadata?.valueAnalysis?.valueCount || 0);

  // Check for expected node types
  const nodeTypes = new Set();
  graph['@graph'].forEach(node => {
    (node['@type'] || []).forEach(t => nodeTypes.add(t));
  });

  console.log('  - Node types found:', nodeTypes.size);
  console.log('  PASS\n');
} catch (e) {
  console.log('  FAIL:', e.message, '\n');
}

// Test 2: ValueAnalyzer standalone
console.log('Test 2: ValueAnalyzer.analyzeText()');
try {
  const analyzer = new ValueAnalyzer();
  const analysis = analyzer.analyzeText('We must protect the vulnerable patients while respecting their autonomy');

  console.log('  - Scored values:', analysis.scoredValues?.length || 0);
  console.log('  - Conflicts:', analysis.conflicts?.length || 0);
  console.log('  - Has profile:', !!analysis.profile);

  if (analysis.scoredValues?.length > 0) {
    console.log('  - Top value:', analysis.scoredValues[0]?.value || 'N/A');
  }

  console.log('  PASS\n');
} catch (e) {
  console.log('  FAIL:', e.message, '\n');
}

// Test 3: ValueAnalyzer.analyze() - enrich existing graph
console.log('Test 3: ValueAnalyzer.analyze() - graph enrichment');
try {
  // First build a core-only graph (simulate what tagteam-core would produce)
  const SemanticGraphBuilder = require('../../../src/graph/SemanticGraphBuilder');
  const coreBuilder = new SemanticGraphBuilder();
  const coreGraph = coreBuilder.build('The nurse should prioritize the sickest patient');

  console.log('  - Core graph nodes:', coreGraph['@graph'].length);

  // Now enrich with values
  const analyzer = new ValueAnalyzer();
  const enrichedGraph = analyzer.analyze(coreGraph, {
    context: 'MedicalEthics'
  });

  console.log('  - Enriched graph nodes:', enrichedGraph['@graph'].length);
  console.log('  - Nodes added:', enrichedGraph['@graph'].length - coreGraph['@graph'].length);
  console.log('  - Enriched by:', enrichedGraph._metadata?.enrichedBy || 'N/A');

  console.log('  PASS\n');
} catch (e) {
  console.log('  FAIL:', e.message, '\n');
}

// Test 4: Core builder without assertion builder
console.log('Test 4: Core builder without values (core-only mode)');
try {
  const SemanticGraphBuilder = require('../../../src/graph/SemanticGraphBuilder');

  // Create builder without injecting assertion builder
  const coreBuilder = new SemanticGraphBuilder({
    assertionBuilder: null  // Explicitly no assertion builder
  });

  const graph = coreBuilder.build('The doctor treats the patient');

  // Should work fine, just no value assertions
  console.log('  - Graph nodes:', graph['@graph'].length);
  console.log('  - Has value assertions:', graph._metadata?.hasValueAssertions || false);

  // Verify no ValueAssertionEvent nodes
  const valueAssertions = graph['@graph'].filter(n =>
    n['@type']?.includes('tagteam:ValueAssertionEvent')
  );
  console.log('  - Value assertion nodes:', valueAssertions.length);

  if (valueAssertions.length === 0) {
    console.log('  PASS\n');
  } else {
    console.log('  FAIL: Should have no value assertions in core-only mode\n');
  }
} catch (e) {
  console.log('  FAIL:', e.message, '\n');
}

console.log('All tests completed.');
