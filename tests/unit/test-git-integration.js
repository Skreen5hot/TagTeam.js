/**
 * Unit Tests for GIT-Minimal Integration (Week 2)
 *
 * Tests for GIT-Minimal compliance:
 * - assertionType = AutomatedDetection on all events
 * - InterpretationContext node creation
 * - validInContext links on all assertions
 * - Default context fallback
 * - @context supports supersedes/validatedBy
 *
 * @version 4.0.0-phase4-week2
 */

const assert = require('assert');
const ContextManager = require('../../src/graph/ContextManager');
const SemanticGraphBuilder = require('../../src/graph/SemanticGraphBuilder');
const JSONLDSerializer = require('../../src/graph/JSONLDSerializer');

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

console.log('\n=== GIT-Minimal Integration Tests (Week 2) ===\n');

// ================================================================
// ContextManager Tests
// ================================================================
console.log('ContextManager');

const contextManager = new ContextManager({ namespace: 'inst' });

test('creates MedicalEthics context node', () => {
  const node = contextManager.getOrCreateContext('MedicalEthics');

  assert(node, 'Should create node for MedicalEthics');
  assert(node['@type'].includes('tagteam:InterpretationContext'),
    'Should have InterpretationContext type');
  assert(node['tagteam:framework'] === 'Principlism (Beauchamp & Childress)',
    'Should have framework metadata');
});

test('returns null for Default context (vocabulary term)', () => {
  const node = contextManager.getOrCreateContext('Default');

  assert(node === null, 'Default context should not create node');
});

test('Default context IRI is vocabulary term', () => {
  const iri = contextManager.getContextIRI('Default');

  assert(iri === 'tagteam:Default_Context',
    'Default should use vocabulary term IRI');
});

test('named context IRI is instance', () => {
  const iri = contextManager.getContextIRI('MedicalEthics');

  assert(iri === 'inst:MedicalEthics_Context',
    'Named contexts should use instance IRIs');
});

test('caches context nodes', () => {
  contextManager.reset();
  const first = contextManager.getOrCreateContext('UtilitarianEthics');
  const second = contextManager.getOrCreateContext('UtilitarianEthics');

  assert(first === second, 'Should return cached node');
});

test('predefined contexts have metadata', () => {
  contextManager.reset();
  const node = contextManager.getOrCreateContext('DeontologicalEthics');

  assert(node['rdfs:label'] === 'Deontological Ethics Framework',
    'Should have label');
  assert(node['rdfs:comment'].includes('Duty-based'),
    'Should have comment');
  assert(node['tagteam:framework'] === 'Kantian',
    'Should have framework');
});

test('supports custom contexts', () => {
  contextManager.reset();
  const node = contextManager.getOrCreateContext('CustomFramework');

  assert(node, 'Should create custom context');
  assert(node['tagteam:framework'] === 'Custom',
    'Custom context should have framework = Custom');
});

test('isPredefined returns correct values', () => {
  assert(contextManager.isPredefined('MedicalEthics') === true,
    'MedicalEthics is predefined');
  assert(contextManager.isPredefined('Default') === true,
    'Default is predefined');
  assert(contextManager.isPredefined('SomeRandom') === false,
    'Random names are not predefined');
});

test('getPredefinedContextNames returns all predefined', () => {
  const names = contextManager.getPredefinedContextNames();

  assert(names.includes('MedicalEthics'), 'Should include MedicalEthics');
  assert(names.includes('Default'), 'Should include Default');
  assert(names.includes('VirtueEthics'), 'Should include VirtueEthics');
  assert(names.length >= 8, 'Should have at least 8 predefined contexts');
});

// ================================================================
// SemanticGraphBuilder GIT Integration
// ================================================================
console.log('\nSemanticGraphBuilder GIT Integration');

const TEST_TEXT = 'The doctor must allocate the last ventilator';

test('build() creates IBE node', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build(TEST_TEXT);

  const ibeNodes = graph['@graph'].filter(n =>
    n['@type']?.includes('InformationBearingEntity')
  );

  assert(ibeNodes.length === 1, 'Should create one IBE node');
  assert(ibeNodes[0]['has_text_value'] === TEST_TEXT,
    'IBE should contain input text');
});

test('build() creates parser agent node', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build(TEST_TEXT);

  const agentNodes = graph['@graph'].filter(n =>
    n['@type']?.includes('Agent')
  );

  assert(agentNodes.length === 1, 'Should create one parser agent');
  assert(agentNodes[0]['tagteam:version'],
    'Agent should have version');
});

test('build() with context option creates context node', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build(TEST_TEXT, { context: 'MedicalEthics' });

  const contextNodes = graph['@graph'].filter(n =>
    n['@type']?.includes('tagteam:InterpretationContext')
  );

  assert(contextNodes.length === 1, 'Should create context node');
  assert(contextNodes[0]['@id'] === 'inst:MedicalEthics_Context',
    'Should have correct context IRI');
});

test('build() without context uses Default (no node)', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build(TEST_TEXT);

  const contextNodes = graph['@graph'].filter(n =>
    n['@type']?.includes('tagteam:InterpretationContext')
  );

  assert(contextNodes.length === 0,
    'Default context should not create a node');
});

test('metadata includes contextIRI', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build(TEST_TEXT, { context: 'MedicalEthics' });

  assert(graph._metadata.contextIRI === 'inst:MedicalEthics_Context',
    'Metadata should include contextIRI');
});

test('metadata includes ibeIRI', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build(TEST_TEXT);

  assert(graph._metadata.ibeIRI,
    'Metadata should include ibeIRI');
  assert(graph._metadata.ibeIRI.startsWith('inst:Input_Text_IBE_'),
    'ibeIRI should have correct prefix');
});

test('metadata includes parserAgentIRI', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build(TEST_TEXT);

  assert(graph._metadata.parserAgentIRI,
    'Metadata should include parserAgentIRI');
  assert(graph._metadata.parserAgentIRI.includes('TagTeam_Parser'),
    'parserAgentIRI should have correct format');
});

// ================================================================
// JSONLDSerializer GIT Vocabulary
// ================================================================
console.log('\nJSONLDSerializer GIT Vocabulary');

const serializer = new JSONLDSerializer();

test('@context includes assertionType', () => {
  const jsonldStr = serializer.serialize({ '@graph': [] });
  const jsonld = JSON.parse(jsonldStr);

  assert(jsonld['@context'].assertionType,
    '@context should include assertionType');
});

test('@context includes validInContext', () => {
  const jsonldStr = serializer.serialize({ '@graph': [] });
  const jsonld = JSON.parse(jsonldStr);

  assert(jsonld['@context'].validInContext,
    '@context should include validInContext');
});

test('@context includes supersedes', () => {
  const jsonldStr = serializer.serialize({ '@graph': [] });
  const jsonld = JSON.parse(jsonldStr);

  assert(jsonld['@context'].supersedes,
    '@context should include supersedes');
});

test('@context includes validatedBy', () => {
  const jsonldStr = serializer.serialize({ '@graph': [] });
  const jsonld = JSON.parse(jsonldStr);

  assert(jsonld['@context'].validatedBy,
    '@context should include validatedBy');
});

test('@context includes is_concretized_by', () => {
  const jsonldStr = serializer.serialize({ '@graph': [] });
  const jsonld = JSON.parse(jsonldStr);

  assert(jsonld['@context'].is_concretized_by,
    '@context should include is_concretized_by for ICE linkage');
});

test('@context includes ValueAssertionEvent', () => {
  const jsonldStr = serializer.serialize({ '@graph': [] });
  const jsonld = JSON.parse(jsonldStr);

  assert(jsonld['@context'].ValueAssertionEvent,
    '@context should include ValueAssertionEvent');
});

test('@context includes ContextAssessmentEvent', () => {
  const jsonldStr = serializer.serialize({ '@graph': [] });
  const jsonld = JSON.parse(jsonldStr);

  assert(jsonld['@context'].ContextAssessmentEvent,
    '@context should include ContextAssessmentEvent');
});

test('@context includes confidence properties', () => {
  const jsonldStr = serializer.serialize({ '@graph': [] });
  const jsonld = JSON.parse(jsonldStr);

  assert(jsonld['@context'].extractionConfidence,
    '@context should include extractionConfidence');
  assert(jsonld['@context'].classificationConfidence,
    '@context should include classificationConfidence');
  assert(jsonld['@context'].relevanceConfidence,
    '@context should include relevanceConfidence');
  assert(jsonld['@context'].aggregateConfidence,
    '@context should include aggregateConfidence');
});

// ================================================================
// Full Integration Test
// ================================================================
console.log('\nFull Integration');

test('value assertions have GIT-Minimal properties when provided', () => {
  const builder = new SemanticGraphBuilder();
  const scoredValues = [
    { value: 'Autonomy', confidence: 0.85 },
    { value: 'Justice', confidence: 0.72 }
  ];

  const graph = builder.build(TEST_TEXT, {
    context: 'MedicalEthics',
    scoredValues
  });

  const assertions = graph['@graph'].filter(n =>
    n['@type']?.includes('tagteam:ValueAssertionEvent')
  );

  assert(assertions.length === 2, 'Should create 2 value assertions');

  assertions.forEach(assertion => {
    assert(assertion['tagteam:assertionType'] === 'tagteam:AutomatedDetection',
      'Should have AutomatedDetection type');
    assert(assertion['tagteam:validInContext'] === 'inst:MedicalEthics_Context',
      'Should have validInContext link');
    assert(assertion['tagteam:based_on'],
      'Should have based_on link to IBE');
    assert(assertion['tagteam:detected_by'],
      'Should have detected_by link to parser');
  });
});

test('context assessments have GIT-Minimal properties when provided', () => {
  const builder = new SemanticGraphBuilder();
  const contextIntensity = {
    urgency: 0.9,
    stakesLevel: 0.85
  };

  const graph = builder.build(TEST_TEXT, {
    context: 'MedicalEthics',
    contextIntensity
  });

  const assessments = graph['@graph'].filter(n =>
    n['@type']?.includes('tagteam:ContextAssessmentEvent')
  );

  assert(assessments.length === 2, 'Should create 2 context assessments');

  assessments.forEach(assessment => {
    assert(assessment['tagteam:assertionType'] === 'tagteam:AutomatedDetection',
      'Should have AutomatedDetection type');
    assert(assessment['tagteam:validInContext'] === 'inst:MedicalEthics_Context',
      'Should have validInContext link');
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
  process.exit(1);
}

console.log('\n✓ All GIT-Minimal integration tests passed!');
