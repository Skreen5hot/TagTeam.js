/**
 * Unit Tests for ActExtractor
 *
 * Tests Phase 1.3 Acceptance Criteria:
 * - AC-1.3.1: Act Extraction
 * - AC-1.3.2: Act Links to Discourse Referents
 *
 * @version 3.0.0-alpha.2
 */

const assert = require('assert');
const ActExtractor = require('../../src/graph/ActExtractor');
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

console.log('\n=== ActExtractor Unit Tests ===\n');

// Test Suite 1: Basic Extraction
console.log('Test Suite 1: Basic Extraction');

test('ActExtractor can be instantiated', () => {
  const extractor = new ActExtractor();
  assert(extractor instanceof ActExtractor);
});

test('extract() returns array of acts', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor treats the patient');
  assert(Array.isArray(acts), 'Returns array');
  assert(acts.length > 0, 'Has acts');
});

test('extract() creates IntentionalAct nodes', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor treats the patient');

  assert(acts.length >= 1, 'Has at least one act');
  const act = acts[0];
  assert(act['@type'].includes('cco:ActOfMedicalTreatment') ||
         act['@type'].includes('cco:IntentionalAct'), 'Has IntentionalAct type');
});

test('extract() includes owl:NamedIndividual in type array', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor treats the patient');

  const act = acts[0];
  assert(act['@type'].includes('owl:NamedIndividual'), 'Has owl:NamedIndividual');
});

// Test Suite 2: Verb-to-CCO Mapping (AC-1.3.1)
console.log('\nTest Suite 2: Verb-to-CCO Mapping (AC-1.3.1)');

test('maps "treat" to cco:ActOfMedicalTreatment', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor treats the patient');

  const treatAct = acts.find(a => a['tagteam:verb'] === 'treat');
  assert(treatAct, 'Found treat act');
  assert(treatAct['@type'].includes('cco:ActOfMedicalTreatment'), 'Correct CCO type');
});

test('maps "distribute" to cco:ActOfAllocation', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor distributes the resources');

  const distAct = acts.find(a => a['tagteam:verb'] === 'distribute');
  assert(distAct, 'Found distribute act');
  assert(distAct['@type'].includes('cco:ActOfAllocation'), 'Correct CCO type');
});

test('maps "decide" to cco:ActOfDecision', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The family decides the outcome');

  const decideAct = acts.find(a => a['tagteam:verb'] === 'decide');
  assert(decideAct, 'Found decide act');
  assert(decideAct['@type'].includes('cco:ActOfDecision'), 'Correct CCO type');
});

test('maps "help" to cco:ActOfAssistance', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The nurse helps the patient');

  const helpAct = acts.find(a => a['tagteam:verb'] === 'help');
  assert(helpAct, 'Found help act');
  assert(helpAct['@type'].includes('cco:ActOfAssistance'), 'Correct CCO type');
});

test('maps unknown verbs to cco:IntentionalAct', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The person walks the path');

  const walkAct = acts.find(a => a['tagteam:verb'] === 'walk');
  assert(walkAct, 'Found walk act');
  assert(walkAct['@type'].includes('cco:IntentionalAct'), 'Fallback to IntentionalAct');
});

// Test Suite 3: Modality Detection (AC-1.3.1)
console.log('\nTest Suite 3: Modality Detection (AC-1.3.1)');

test('detects "must" as obligation', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor must allocate the resources');

  const act = acts[0];
  assert(act['tagteam:modality'] === 'obligation', 'Modality is obligation');
});

test('detects "should" as recommendation', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The nurse should help the patient');

  const act = acts[0];
  assert(act['tagteam:modality'] === 'recommendation', 'Modality is recommendation');
});

test('detects "may" as permission', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The patient may leave the room');

  const act = acts[0];
  assert(act['tagteam:modality'] === 'permission', 'Modality is permission');
});

test('detects "will" as intention', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor will treat the patient');

  const act = acts[0];
  assert(act['tagteam:modality'] === 'intention', 'Modality is intention');
});

test('no modality for simple present', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor treats the patient');

  const act = acts[0];
  assert(act['tagteam:modality'] === undefined || act['tagteam:modality'] === null,
    'No modality for simple present');
});

// Test Suite 4: Negation Detection
console.log('\nTest Suite 4: Negation Detection');

test('detects negation in "does not treat"', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor does not treat');

  // Look for treat act
  const treatAct = acts.find(a => a['tagteam:verb'] === 'treat');
  if (treatAct) {
    assert(treatAct['tagteam:negated'] === true, 'Negation detected');
  }
});

// Test Suite 5: Verb Properties
console.log('\nTest Suite 5: Verb Properties');

test('acts have verb infinitive', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor treats the patient');

  const act = acts[0];
  assert(act['tagteam:verb'], 'Has verb property');
  assert(act['tagteam:verb'] === 'treat', 'Verb is infinitive form');
});

test('acts have verb_text (original form)', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor treats the patient');

  const act = acts[0];
  assert(act['tagteam:verb_text'], 'Has verb_text property');
});

test('acts have span_offset', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor treats the patient');

  const act = acts[0];
  assert(act['tagteam:span_offset'], 'Has span_offset');
  assert(Array.isArray(act['tagteam:span_offset']), 'span_offset is array');
});

test('acts have rdfs:label', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor gives the resources');

  const act = acts[0];
  assert(act['rdfs:label'], 'Has label');
  assert(act['rdfs:label'].includes('give'), 'Label includes verb');
});

// Test Suite 6: Entity Linking (AC-1.3.2)
console.log('\nTest Suite 6: Entity Linking (AC-1.3.2)');

test('links agent from entity before verb', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const acts = graph['@graph'].filter(n =>
    n['@type'].some(t => t.includes('IntentionalAct') || t.includes('ActOf')));

  assert(acts.length >= 1, 'Has acts');
  const act = acts[0];
  assert(act['cco:has_agent'], 'Has agent link');
  assert(act['cco:has_agent'].includes('Doctor'), 'Agent is doctor');
});

test('links patient/affects from entity after verb', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const acts = graph['@graph'].filter(n =>
    n['@type'].some(t => t.includes('IntentionalAct') || t.includes('ActOf')));

  const act = acts[0];
  assert(act['cco:affects'], 'Has affects link');
  assert(act['cco:affects'].includes('Patient'), 'Affects is patient');
});

test('links participants array', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor allocates the ventilator between two patients');

  const acts = graph['@graph'].filter(n =>
    n['@type'].some(t => t.includes('IntentionalAct') || t.includes('ActOf')));

  const allocAct = acts.find(a => a['tagteam:verb'] === 'allocate');
  if (allocAct) {
    assert(allocAct['bfo:has_participant'], 'Has participants');
    assert(Array.isArray(allocAct['bfo:has_participant']), 'Participants is array');
  }
});

// Test Suite 7: Integration with SemanticGraphBuilder
console.log('\nTest Suite 7: Integration with SemanticGraphBuilder');

test('SemanticGraphBuilder extracts acts automatically', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const acts = graph['@graph'].filter(n =>
    n['@type'].some(t => t.includes('IntentionalAct') || t.includes('ActOf')));

  assert(acts.length >= 1, 'Has at least 1 act');
});

test('graph contains both entities and acts', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const entities = graph['@graph'].filter(n =>
    n['@type'].includes('tagteam:DiscourseReferent'));
  const acts = graph['@graph'].filter(n =>
    n['@type'].some(t => t.includes('IntentionalAct') || t.includes('ActOf')));

  assert(entities.length >= 2, 'Has entities');
  assert(acts.length >= 1, 'Has acts');
});

test('can disable act extraction', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats', { extractActs: false });

  const acts = graph['@graph'].filter(n =>
    n['@type'].some(t => t.includes('IntentionalAct') || t.includes('ActOf')));

  assert(acts.length === 0, 'No acts when disabled');
});

// Test Suite 8: IRI Generation
console.log('\nTest Suite 8: IRI Generation');

test('acts use inst: namespace', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const acts = graph['@graph'].filter(n =>
    n['@type'].some(t => t.includes('IntentionalAct') || t.includes('ActOf')));

  const act = acts[0];
  assert(act['@id'].startsWith('inst:'), 'IRI starts with inst:');
});

test('act IRIs include SHA-256 hash', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const acts = graph['@graph'].filter(n =>
    n['@type'].some(t => t.includes('IntentionalAct') || t.includes('ActOf')));

  const act = acts[0];
  assert(/[0-9a-f]{8}$/.test(act['@id']), 'IRI ends with 8 hex chars');
});

test('same act produces same IRI (deterministic)', () => {
  const builder1 = new SemanticGraphBuilder();
  const graph1 = builder1.build('The doctor treats the patient');
  const acts1 = graph1['@graph'].filter(n =>
    n['@type'].some(t => t.includes('ActOf')));

  const builder2 = new SemanticGraphBuilder();
  const graph2 = builder2.build('The doctor treats the patient');
  const acts2 = graph2['@graph'].filter(n =>
    n['@type'].some(t => t.includes('ActOf')));

  assert(acts1[0]['@id'] === acts2[0]['@id'], 'Same input produces same IRI');
});

// Test Suite 9: Complex Scenario (AC-1.3.1 + AC-1.3.2)
console.log('\nTest Suite 9: Complex Scenario (AC-1.3.1 + AC-1.3.2)');

test('complex: "The doctor must allocate the last ventilator between two patients"', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor must allocate the last ventilator between two patients');

  // Find allocation act
  const acts = graph['@graph'].filter(n =>
    n['@type'].some(t => t.includes('IntentionalAct') || t.includes('ActOf')));

  const allocAct = acts.find(a => a['tagteam:verb'] === 'allocate');
  assert(allocAct, 'Found allocation act');

  // AC-1.3.1: Verb and modality
  assert(allocAct['tagteam:verb'] === 'allocate', 'Verb is allocate');
  assert(allocAct['tagteam:modality'] === 'obligation', 'Modality is obligation');
  assert(allocAct['@type'].includes('cco:ActOfAllocation'), 'Type is ActOfAllocation');

  // AC-1.3.2: Links to entities
  assert(allocAct['cco:has_agent'], 'Has agent');
  assert(allocAct['cco:has_agent'].includes('Doctor'), 'Agent is doctor referent');
  assert(allocAct['bfo:has_participant'], 'Has participants');
  assert(Array.isArray(allocAct['bfo:has_participant']), 'Participants is array');
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Total: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
}

console.log('\n✓ All Phase 1.3 unit tests passed!');
