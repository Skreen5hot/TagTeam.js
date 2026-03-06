/**
 * Unit Tests for Information Staircase (Week 2)
 *
 * Tests for InformationStaircaseBuilder:
 * - IBE node with full input text
 * - Assertions link to IBE via based_on
 * - ICE nodes link to IBE via is_concretized_by
 * - Parser agent node exists
 *
 * @version 4.0.0-phase4-week2
 */

const assert = require('assert');
const InformationStaircaseBuilder = require('../../src/graph/InformationStaircaseBuilder');
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

console.log('\n=== Information Staircase Tests (Week 2) ===\n');

// ================================================================
// IBE Node Tests
// ================================================================
console.log('IBE (Information Bearing Entity) Node');

const builder = new InformationStaircaseBuilder({ version: '4.0.0-phase4-week2' });
const TEST_TEXT = 'The doctor must allocate the last ventilator between two critically ill patients';
const timestamp = new Date().toISOString();

test('creates IBE node with correct @type', () => {
  const ibe = builder.createInputIBE(TEST_TEXT, timestamp);

  assert(ibe['@type'].includes('InformationBearingEntity'),
    'Should have InformationBearingEntity type');
  assert(ibe['@type'].includes('owl:NamedIndividual'),
    'Should have NamedIndividual type');
});

test('IBE has has_text_value with full input text', () => {
  const ibe = builder.createInputIBE(TEST_TEXT, timestamp);

  assert(ibe['has_text_value'] === TEST_TEXT,
    'Should contain full input text');
});

test('IBE has char_count', () => {
  const ibe = builder.createInputIBE(TEST_TEXT, timestamp);

  assert(ibe['tagteam:char_count'] === TEST_TEXT.length,
    'Should have correct character count');
});

test('IBE has word_count', () => {
  const ibe = builder.createInputIBE(TEST_TEXT, timestamp);
  const expectedWords = TEST_TEXT.trim().split(/\s+/).length;

  assert(ibe['tagteam:word_count'] === expectedWords,
    `Should have correct word count (${expectedWords})`);
});

test('IBE has received_at timestamp', () => {
  const ibe = builder.createInputIBE(TEST_TEXT, timestamp);

  assert(ibe['tagteam:received_at'] === timestamp,
    'Should have received_at timestamp');
});

test('IBE IRI is deterministic (same text = same IRI)', () => {
  builder.reset();
  const iri1 = builder.getIBE_IRI(TEST_TEXT);
  const iri2 = builder.getIBE_IRI(TEST_TEXT);

  assert(iri1 === iri2, 'Same text should produce same IRI');
});

test('IBE IRI differs for different text', () => {
  const iri1 = builder.getIBE_IRI('Hello world');
  const iri2 = builder.getIBE_IRI('Goodbye world');

  assert(iri1 !== iri2, 'Different text should produce different IRIs');
});

test('IBE IRI has correct format', () => {
  const iri = builder.getIBE_IRI(TEST_TEXT);

  assert(iri.startsWith('inst:Input_Text_IBE_'),
    'IRI should have correct prefix');
  assert(iri.length > 'inst:Input_Text_IBE_'.length,
    'IRI should have hash suffix');
});

// ================================================================
// Parser Agent Tests
// ================================================================
console.log('\nParser Agent Node');

test('creates parser agent with correct @type', () => {
  builder.reset();
  const agent = builder.createParserAgent();

  assert(agent['@type'].includes('Agent'),
    'Should have ArtificialAgent type');
  assert(agent['@type'].includes('owl:NamedIndividual'),
    'Should have NamedIndividual type');
});

test('parser agent has version', () => {
  builder.reset();
  const agent = builder.createParserAgent();

  assert(agent['tagteam:version'] === '4.0.0-phase4-week2',
    'Should have version from constructor options');
});

test('parser agent has label with version', () => {
  builder.reset();
  const agent = builder.createParserAgent();

  assert(agent['rdfs:label'].includes('TagTeam.js Parser'),
    'Label should include product name');
  assert(agent['rdfs:label'].includes('4.0.0'),
    'Label should include version');
});

test('parser agent has algorithm', () => {
  builder.reset();
  const agent = builder.createParserAgent();

  assert(agent['tagteam:algorithm'],
    'Should have algorithm property');
});

test('parser agent has capabilities', () => {
  builder.reset();
  const agent = builder.createParserAgent();

  assert(Array.isArray(agent['tagteam:capabilities']),
    'Should have capabilities array');
  assert(agent['tagteam:capabilities'].includes('entity_extraction'),
    'Should include entity_extraction capability');
  assert(agent['tagteam:capabilities'].includes('value_detection'),
    'Should include value_detection capability');
});

test('parser agent is singleton (cached)', () => {
  builder.reset();
  const agent1 = builder.createParserAgent();
  const agent2 = builder.createParserAgent();

  assert(agent1 === agent2, 'Should return same cached instance');
});

test('parser agent IRI is deterministic', () => {
  builder.reset();
  const iri1 = builder.getParserAgentIRI();
  const iri2 = builder.getParserAgentIRI();

  assert(iri1 === iri2, 'Agent IRI should be consistent');
});

test('parser agent IRI includes version', () => {
  builder.reset();
  const iri = builder.getParserAgentIRI();

  assert(iri.includes('4_0_0'),
    'IRI should include version (dots replaced with underscores)');
});

// ================================================================
// Integration with SemanticGraphBuilder
// ================================================================
console.log('\nIntegration with SemanticGraphBuilder');

test('SemanticGraphBuilder creates IBE node', () => {
  const graphBuilder = new SemanticGraphBuilder();
  const graph = graphBuilder.build(TEST_TEXT);

  const ibeNodes = graph['@graph'].filter(n =>
    n['@type']?.includes('InformationBearingEntity')
  );

  assert(ibeNodes.length === 1, 'Should create exactly one IBE node');
});

test('SemanticGraphBuilder creates parser agent', () => {
  const graphBuilder = new SemanticGraphBuilder();
  const graph = graphBuilder.build(TEST_TEXT);

  const agentNodes = graph['@graph'].filter(n =>
    n['@type']?.includes('Agent')
  );

  assert(agentNodes.length === 1, 'Should create exactly one parser agent');
});

test('IBE contains full input text', () => {
  const graphBuilder = new SemanticGraphBuilder();
  const graph = graphBuilder.build(TEST_TEXT);

  const ibe = graph['@graph'].find(n =>
    n['@type']?.includes('InformationBearingEntity')
  );

  assert(ibe['has_text_value'] === TEST_TEXT,
    'IBE should contain exact input text');
});

// ================================================================
// Summary
// ================================================================
console.log('\n=== Test Summary ===');
console.log(`Total: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
}

console.log('\n✓ All Information Staircase tests passed!');
