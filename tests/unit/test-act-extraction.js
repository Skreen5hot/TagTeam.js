/**
 * Unit Tests for ActExtractor
 *
 * Tests Phase 1.3 Acceptance Criteria:
 * - AC-1.3.1: Act Extraction
 * - AC-1.3.2: Act Links to Tier 2 Entities (v2.2)
 * - AC-1.3.3: ActualityStatus on all acts (v2.2)
 *
 * Updated for Phase 4 Two-Tier Architecture (v2.2 spec)
 *
 * @version 4.0.0-phase4
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
  assert(act['@type'].includes('cco:IntentionalAct'), 'Has IntentionalAct type');
});

test('extract() includes owl:NamedIndividual in type array', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor treats the patient');

  const act = acts[0];
  assert(act['@type'].includes('owl:NamedIndividual'), 'Has owl:NamedIndividual');
});

// Test Suite 2: Verb-to-CCO Mapping (AC-1.3.1)
console.log('\nTest Suite 2: Verb-to-CCO Mapping (AC-1.3.1)');

test('maps "treat" to cco:IntentionalAct', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor treats the patient');

  const treatAct = acts.find(a => a['tagteam:verb'] === 'treat');
  assert(treatAct, 'Found treat act');
  assert(treatAct['@type'].includes('cco:IntentionalAct'), 'Correct CCO type');
});

test('maps "distribute" to cco:IntentionalAct', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor distributes the resources');

  const distAct = acts.find(a => a['tagteam:verb'] === 'distribute');
  assert(distAct, 'Found distribute act');
  assert(distAct['@type'].includes('cco:IntentionalAct'), 'Correct CCO type');
});

test('maps "decide" to cco:IntentionalAct', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The family decides the outcome');

  const decideAct = acts.find(a => a['tagteam:verb'] === 'decide');
  assert(decideAct, 'Found decide act');
  assert(decideAct['@type'].includes('cco:IntentionalAct'), 'Correct CCO type');
});

test('maps "help" to cco:IntentionalAct', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The nurse helps the patient');

  const helpAct = acts.find(a => a['tagteam:verb'] === 'help');
  assert(helpAct, 'Found help act');
  assert(helpAct['@type'].includes('cco:IntentionalAct'), 'Correct CCO type');
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

test('acts have sourceText (v2.2, replaces verb_text)', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor treats the patient');

  const act = acts[0];
  assert(act['tagteam:sourceText'], 'Has sourceText property');
});

test('acts have v2.2 position properties', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor treats the patient');

  const act = acts[0];
  assert(act['tagteam:startPosition'] !== undefined, 'Has startPosition');
  assert(act['tagteam:endPosition'] !== undefined, 'Has endPosition');
  assert(typeof act['tagteam:startPosition'] === 'number', 'startPosition is number');
  assert(typeof act['tagteam:endPosition'] === 'number', 'endPosition is number');
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

test('act IRIs include SHA-256 hash (12 chars per v2.2)', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const acts = graph['@graph'].filter(n =>
    n['@type'].some(t => t.includes('IntentionalAct') || t.includes('ActOf')));

  const act = acts[0];
  assert(/[0-9a-f]{12}$/.test(act['@id']), 'IRI ends with 12 hex chars (v2.2)');
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

// Test Suite 9: ActualityStatus (v2.2 AC-1.3.3)
console.log('\nTest Suite 9: ActualityStatus (v2.2 AC-1.3.3)');

test('all acts have actualityStatus', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor treats the patient');

  assert(acts.length >= 1, 'Has acts');
  acts.forEach(act => {
    assert(act['tagteam:actualityStatus'], 'Has actualityStatus');
  });
});

test('simple present tense -> tagteam:Actual', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor treats the patient');

  const act = acts.find(a => a['tagteam:verb'] === 'treat');
  assert(act, 'Found act');
  assert(act['tagteam:actualityStatus'] === 'tagteam:Actual',
    'Simple present is Actual');
});

test('obligation (must) -> tagteam:Prescribed', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor must treat the patient');

  const act = acts[0];
  assert(act['tagteam:actualityStatus'] === 'tagteam:Prescribed',
    'Obligation is Prescribed');
});

test('permission (may) -> tagteam:Permitted', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The patient may leave');

  const act = acts[0];
  assert(act['tagteam:actualityStatus'] === 'tagteam:Permitted',
    'Permission is Permitted');
});

test('intention (will) -> tagteam:Planned', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor will treat the patient');

  const act = acts[0];
  assert(act['tagteam:actualityStatus'] === 'tagteam:Planned',
    'Intention is Planned');
});

test('negation -> tagteam:Negated (overrides modality)', () => {
  const extractor = new ActExtractor();
  const acts = extractor.extract('The doctor does not treat');

  const treatAct = acts.find(a => a['tagteam:verb'] === 'treat');
  if (treatAct && treatAct['tagteam:negated']) {
    assert(treatAct['tagteam:actualityStatus'] === 'tagteam:Negated',
      'Negation results in Negated status');
  }
});

// Test Suite 10: Tier 2 Entity Linking (v2.2 AC-1.3.2)
console.log('\nTest Suite 10: Tier 2 Entity Linking (v2.2 AC-1.3.2)');

test('acts link to Tier 2 entities when available', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  // Find Tier 2 Person entities
  const tier2Persons = graph['@graph'].filter(n =>
    n['@type'] && n['@type'].includes('cco:Person'));

  // Find acts
  const acts = graph['@graph'].filter(n =>
    n['@type'].some(t => t.includes('IntentionalAct') || t.includes('ActOf')));

  if (tier2Persons.length > 0) {
    const act = acts[0];
    // Agent should be a Tier 2 Person IRI
    if (act['cco:has_agent']) {
      const agentIsTier2 = tier2Persons.some(p => p['@id'] === act['cco:has_agent']);
      assert(agentIsTier2, 'Agent links to Tier 2 Person entity');
    }
  }
});

test('acts link to Tier 1 referents when linkToTier2 disabled', () => {
  const ActExtractor = require('../../src/graph/ActExtractor');
  const EntityExtractor = require('../../src/graph/EntityExtractor');

  const text = 'The doctor treats the patient';

  // Extract entities with Tier 2 creation
  const entityExtractor = new EntityExtractor({ createTier2: true });
  const entities = entityExtractor.extract(text);

  // Extract acts with linkToTier2 disabled
  const actExtractor = new ActExtractor({ linkToTier2: false });
  const acts = actExtractor.extract(text, { entities });

  const act = acts[0];
  if (act && act['cco:has_agent']) {
    // Agent should be a Tier 1 referent (contains Referent)
    assert(act['cco:has_agent'].includes('Referent'),
      'With linkToTier2=false, links to Tier 1 referents');
  }
});

test('Tier 2 linking uses is_about resolution', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  // Find Tier 1 referents with is_about links
  const referents = graph['@graph'].filter(n =>
    n['@type'] && n['@type'].includes('tagteam:DiscourseReferent') &&
    n['cco:is_about']);

  // Find Tier 2 persons
  const tier2 = graph['@graph'].filter(n =>
    n['@type'] && (n['@type'].includes('cco:Person') ||
                   n['@type'].includes('cco:Artifact')));

  // Verify is_about links resolve to Tier 2
  referents.forEach(ref => {
    const linkedTier2 = tier2.find(t => t['@id'] === ref['cco:is_about']);
    assert(linkedTier2, `Referent ${ref['@id']} links to valid Tier 2 entity`);
  });
});

// Test Suite 11: Complex Scenario (AC-1.3.1 + AC-1.3.2 + AC-1.3.3)
console.log('\nTest Suite 11: Complex Scenario (v2.2)');

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
  assert(allocAct['@type'].includes('cco:IntentionalAct'), 'Type is IntentionalAct');

  // AC-1.3.2: Links to entities (Tier 2 in v2.2)
  assert(allocAct['cco:has_agent'], 'Has agent');
  // Agent should be Tier 2 Person (contains Person_ prefix)
  assert(allocAct['cco:has_agent'].includes('Person') ||
         allocAct['cco:has_agent'].includes('Doctor'),
    'Agent links to entity');
  assert(allocAct['bfo:has_participant'], 'Has participants');
  assert(Array.isArray(allocAct['bfo:has_participant']), 'Participants is array');

  // AC-1.3.3: ActualityStatus (v2.2)
  assert(allocAct['tagteam:actualityStatus'] === 'tagteam:Prescribed',
    'Obligation has Prescribed status');
});

test('complex: full Two-Tier graph structure', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  // Verify Two-Tier structure
  const tier1Referents = graph['@graph'].filter(n =>
    n['@type'] && n['@type'].includes('tagteam:DiscourseReferent'));
  const tier2Entities = graph['@graph'].filter(n =>
    n['@type'] && (n['@type'].includes('cco:Person') ||
                   n['@type'].includes('cco:Artifact') ||
                   n['@type'].includes('cco:Organization')));
  const acts = graph['@graph'].filter(n =>
    n['@type'].some(t => t.includes('ActOf')));

  // Should have both tiers
  assert(tier1Referents.length >= 2, 'Has Tier 1 referents');
  assert(tier2Entities.length >= 2, 'Has Tier 2 entities');
  assert(acts.length >= 1, 'Has acts');

  // Acts link to Tier 2
  const act = acts[0];
  if (act['cco:has_agent']) {
    const agentIsTier2 = tier2Entities.some(e => e['@id'] === act['cco:has_agent']);
    assert(agentIsTier2, 'Act agent is Tier 2 entity');
  }
  if (act['cco:affects']) {
    const affectsTier2 = tier2Entities.some(e => e['@id'] === act['cco:affects']);
    assert(affectsTier2, 'Act affects is Tier 2 entity');
  }
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
