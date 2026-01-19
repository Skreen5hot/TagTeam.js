/**
 * Unit Tests for Assertion Events (Week 2)
 *
 * Tests for AssertionEventBuilder:
 * - Value assertion creation with proper structure
 * - Three-way confidence decomposition
 * - ICE nodes as separate entities
 * - Context assessment for all 12 dimensions
 *
 * @version 4.0.0-phase4-week2
 */

const assert = require('assert');
const AssertionEventBuilder = require('../../src/graph/AssertionEventBuilder');

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

console.log('\n=== Assertion Events Tests (Week 2) ===\n');

// Create builder instance
const builder = new AssertionEventBuilder({ namespace: 'inst' });

// Mock data
const mockScoredValues = [
  {
    value: 'Autonomy',
    category: 'ethical',
    confidence: 0.85,
    extractionConfidence: 0.95,
    classificationConfidence: 0.90,
    relevanceConfidence: 0.75,
    evidence: 'patient choice'
  },
  {
    value: 'Beneficence',
    category: 'ethical',
    confidence: 0.72,
    evidence: 'best outcome'
  }
];

const mockContext = {
  contextIRI: 'inst:MedicalEthics_Context',
  ibeIRI: 'inst:Input_Text_IBE_abc123',
  parserAgentIRI: 'inst:TagTeam_Parser_v4_0_0'
};

const mockContextIntensity = {
  urgency: 0.9,
  timePressure: 0.85,
  irreversibility: 0.7,
  powerDifferential: 0.6,
  dependencyLevel: 0.8,
  trustRequirement: 0.75,
  stakesLevel: 0.95,
  scopeOfImpact: 0.6,
  cascadeRisk: 0.5,
  informationCompleteness: 0.4,
  expertiseRequired: 0.85,
  uncertaintyLevel: 0.7
};

// ================================================================
// Value Assertion Tests
// ================================================================
console.log('Value Assertion Creation');

test('creates value assertions from scored values', () => {
  const result = builder.createValueAssertions(mockScoredValues, mockContext);

  assert(result.assertionEvents.length === 2, 'Should create 2 assertion events');
  assert(result.iceNodes.length === 2, 'Should create 2 ICE nodes');
});

test('assertion event has correct @type', () => {
  const result = builder.createValueAssertions(mockScoredValues, mockContext);
  const event = result.assertionEvents[0];

  assert(event['@type'].includes('tagteam:ValueAssertionEvent'),
    'Should have ValueAssertionEvent type');
  assert(event['@type'].includes('owl:NamedIndividual'),
    'Should have NamedIndividual type');
});

test('assertion event has asserts link to ICE', () => {
  const result = builder.createValueAssertions(mockScoredValues, mockContext);
  const event = result.assertionEvents[0];
  const ice = result.iceNodes[0];

  assert(event['tagteam:asserts'] === ice['@id'],
    'Assertion should link to its ICE node');
});

test('assertion event has detected_by link to parser agent', () => {
  const result = builder.createValueAssertions(mockScoredValues, mockContext);
  const event = result.assertionEvents[0];

  assert(event['tagteam:detected_by'] === mockContext.parserAgentIRI,
    'Should have detected_by link to parser agent');
});

test('assertion event has based_on link to IBE', () => {
  const result = builder.createValueAssertions(mockScoredValues, mockContext);
  const event = result.assertionEvents[0];

  assert(event['tagteam:based_on'] === mockContext.ibeIRI,
    'Should have based_on link to IBE');
});

// ================================================================
// Three-Way Confidence Tests
// ================================================================
console.log('\nThree-Way Confidence Decomposition');

test('assertion has extractionConfidence', () => {
  const result = builder.createValueAssertions(mockScoredValues, mockContext);
  const event = result.assertionEvents[0];

  assert(typeof event['tagteam:extractionConfidence'] === 'number',
    'Should have extractionConfidence');
  assert(event['tagteam:extractionConfidence'] === 0.95,
    'Should preserve explicit extractionConfidence');
});

test('assertion has classificationConfidence', () => {
  const result = builder.createValueAssertions(mockScoredValues, mockContext);
  const event = result.assertionEvents[0];

  assert(typeof event['tagteam:classificationConfidence'] === 'number',
    'Should have classificationConfidence');
  assert(event['tagteam:classificationConfidence'] === 0.90,
    'Should preserve explicit classificationConfidence');
});

test('assertion has relevanceConfidence', () => {
  const result = builder.createValueAssertions(mockScoredValues, mockContext);
  const event = result.assertionEvents[0];

  assert(typeof event['tagteam:relevanceConfidence'] === 'number',
    'Should have relevanceConfidence');
  assert(event['tagteam:relevanceConfidence'] === 0.75,
    'Should preserve explicit relevanceConfidence');
});

test('assertion has aggregateConfidence (geometric mean)', () => {
  const result = builder.createValueAssertions(mockScoredValues, mockContext);
  const event = result.assertionEvents[0];

  assert(typeof event['tagteam:aggregateConfidence'] === 'number',
    'Should have aggregateConfidence');

  // Geometric mean of 0.95, 0.90, 0.75 = (0.95 * 0.90 * 0.75)^(1/3) ≈ 0.86
  const expected = Math.pow(0.95 * 0.90 * 0.75, 1/3);
  const actual = event['tagteam:aggregateConfidence'];
  assert(Math.abs(actual - expected) < 0.01,
    `Aggregate should be geometric mean: expected ${expected.toFixed(2)}, got ${actual}`);
});

test('assertion specifies aggregation method', () => {
  const result = builder.createValueAssertions(mockScoredValues, mockContext);
  const event = result.assertionEvents[0];

  assert(event['tagteam:aggregationMethod'] === 'geometric_mean',
    'Should specify geometric_mean as aggregation method');
});

test('computes defaults when confidence components missing', () => {
  const result = builder.createValueAssertions(mockScoredValues, mockContext);
  const event = result.assertionEvents[1]; // Second value lacks explicit confidences

  assert(typeof event['tagteam:extractionConfidence'] === 'number',
    'Should compute extraction even if not provided');
  assert(typeof event['tagteam:classificationConfidence'] === 'number',
    'Should compute classification even if not provided');
  assert(typeof event['tagteam:relevanceConfidence'] === 'number',
    'Should compute relevance even if not provided');
});

// ================================================================
// ICE Node Tests
// ================================================================
console.log('\nICE Nodes');

test('ICE node has correct @type', () => {
  const result = builder.createValueAssertions(mockScoredValues, mockContext);
  const ice = result.iceNodes[0];

  assert(ice['@type'].includes('tagteam:EthicalValueICE'),
    'Should have EthicalValueICE type');
  assert(ice['@type'].includes('cco:InformationContentEntity'),
    'Should have InformationContentEntity type');
});

test('ICE node has is_concretized_by link to IBE', () => {
  const result = builder.createValueAssertions(mockScoredValues, mockContext);
  const ice = result.iceNodes[0];

  assert(ice['cco:is_concretized_by'] === mockContext.ibeIRI,
    'ICE should be concretized by IBE');
});

test('ICE node has value metadata', () => {
  const result = builder.createValueAssertions(mockScoredValues, mockContext);
  const ice = result.iceNodes[0];

  assert(ice['tagteam:valueName'] === 'Autonomy',
    'Should have valueName');
  assert(ice['tagteam:valueCategory'] === 'ethical',
    'Should have valueCategory');
});

// ================================================================
// GIT-Minimal Properties
// ================================================================
console.log('\nGIT-Minimal Properties');

test('assertion has assertionType = AutomatedDetection', () => {
  const result = builder.createValueAssertions(mockScoredValues, mockContext);
  const event = result.assertionEvents[0];

  assert(event['tagteam:assertionType'] === 'tagteam:AutomatedDetection',
    'Should have AutomatedDetection assertion type');
});

test('assertion has validInContext link', () => {
  const result = builder.createValueAssertions(mockScoredValues, mockContext);
  const event = result.assertionEvents[0];

  assert(event['tagteam:validInContext'] === mockContext.contextIRI,
    'Should have validInContext link to context');
});

// ================================================================
// Context Assessment Tests
// ================================================================
console.log('\nContext Assessment Events');

test('creates context assessments for all 12 dimensions', () => {
  const result = builder.createContextAssessments(mockContextIntensity, mockContext);

  assert(result.assessmentEvents.length === 12,
    `Should create 12 assessment events, got ${result.assessmentEvents.length}`);
  assert(result.iceNodes.length === 12,
    `Should create 12 ICE nodes, got ${result.iceNodes.length}`);
});

test('context assessment has correct @type', () => {
  const result = builder.createContextAssessments(mockContextIntensity, mockContext);
  const event = result.assessmentEvents[0];

  assert(event['@type'].includes('tagteam:ContextAssessmentEvent'),
    'Should have ContextAssessmentEvent type');
});

test('context assessment has dimension property', () => {
  const result = builder.createContextAssessments(mockContextIntensity, mockContext);
  const urgencyEvent = result.assessmentEvents.find(e =>
    e['tagteam:dimension'] === 'urgency'
  );

  assert(urgencyEvent, 'Should have urgency assessment');
  assert(urgencyEvent['tagteam:score'] === 0.9, 'Should have correct score');
});

test('context assessment has category property', () => {
  const result = builder.createContextAssessments(mockContextIntensity, mockContext);
  const urgencyEvent = result.assessmentEvents.find(e =>
    e['tagteam:dimension'] === 'urgency'
  );

  assert(urgencyEvent['tagteam:category'] === 'temporal',
    'Urgency should be in temporal category');
});

test('context assessment has GIT-Minimal properties', () => {
  const result = builder.createContextAssessments(mockContextIntensity, mockContext);
  const event = result.assessmentEvents[0];

  assert(event['tagteam:assertionType'] === 'tagteam:AutomatedDetection',
    'Should have AutomatedDetection type');
  assert(event['tagteam:validInContext'] === mockContext.contextIRI,
    'Should have validInContext link');
  assert(event['tagteam:based_on'] === mockContext.ibeIRI,
    'Should have based_on link');
  assert(event['tagteam:detected_by'] === mockContext.parserAgentIRI,
    'Should have detected_by link');
});

test('context dimension ICE has is_concretized_by', () => {
  const result = builder.createContextAssessments(mockContextIntensity, mockContext);
  const ice = result.iceNodes[0];

  assert(ice['cco:is_concretized_by'] === mockContext.ibeIRI,
    'Context ICE should be concretized by IBE');
});

// ================================================================
// Edge Cases
// ================================================================
console.log('\nEdge Cases');

test('handles empty scored values array', () => {
  const result = builder.createValueAssertions([], mockContext);

  assert(result.assertionEvents.length === 0, 'Should return empty arrays');
  assert(result.iceNodes.length === 0, 'Should return empty arrays');
});

test('handles null scored values', () => {
  const result = builder.createValueAssertions(null, mockContext);

  assert(result.assertionEvents.length === 0, 'Should handle null gracefully');
  assert(result.iceNodes.length === 0, 'Should handle null gracefully');
});

test('handles empty context intensity', () => {
  const result = builder.createContextAssessments({}, mockContext);

  assert(result.assessmentEvents.length === 0, 'Should handle empty object');
});

test('handles partial context intensity', () => {
  const partial = { urgency: 0.8, stakesLevel: 0.9 };
  const result = builder.createContextAssessments(partial, mockContext);

  assert(result.assessmentEvents.length === 2,
    'Should only create events for provided dimensions');
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

console.log('\n✓ All assertion event tests passed!');
