/**
 * Phase 1.3 Acceptance Criteria Verification
 *
 * Verifies all acceptance criteria from roadmap are met:
 * - AC-1.3.1: Act Extraction with CCO Type Mapping
 * - AC-1.3.2: Act Links to Tier 2 Entities (v2.2)
 * - AC-1.3.3: ActualityStatus on All Acts (v2.2)
 *
 * Updated for Phase 4 Two-Tier Architecture (v2.2 spec)
 *
 * @version 4.0.0-phase4
 */

const assert = require('assert');
const SemanticGraphBuilder = require('../../src/graph/SemanticGraphBuilder');
const ActExtractor = require('../../src/graph/ActExtractor');

console.log('\n=== Phase 1.3 Acceptance Criteria Verification ===\n');

// AC-1.3.1: Act Extraction with CCO Type Mapping
console.log('Verifying AC-1.3.1: Act Extraction with CCO Type Mapping');

const text1 = "The doctor must treat the patient";
const builder1 = new SemanticGraphBuilder();
const graph1 = builder1.build(text1);

// Find acts
const acts1 = graph1['@graph'].filter(n =>
  n['@type'].some(t => t.includes('ActOf') || t.includes('IntentionalAct')));

assert(acts1.length >= 1, "Extracts at least one act");

const treatAct = acts1.find(a => a['tagteam:verb'] === 'treat');
assert(treatAct, "Found treat act");
assert(treatAct['@type'].includes('cco:IntentionalAct'),
  "'treat' maps to cco:IntentionalAct");
assert(treatAct['tagteam:modality'] === 'obligation',
  "'must' detected as obligation modality");

console.log('✓ AC-1.3.1: Act Extraction with CCO Type Mapping - PASSED\n');

// AC-1.3.2: Act Links to Tier 2 Entities
console.log('Verifying AC-1.3.2: Act Links to Tier 2 Entities (v2.2)');

const text2 = "The doctor treats the patient";
const builder2 = new SemanticGraphBuilder();
const graph2 = builder2.build(text2);

// Find Tier 2 Person entities
const tier2Persons = graph2['@graph'].filter(n =>
  n['@type'] && n['@type'].includes('cco:Person'));

assert(tier2Persons.length >= 2, "Has Tier 2 Person entities");

// Find acts
const acts2 = graph2['@graph'].filter(n =>
  n['@type'].some(t => t.includes('ActOf')));

const act2 = acts2[0];
assert(act2['has_agent'], "Act has cco:has_agent");
assert(act2['affects'], "Act has cco:affects");

// Verify agent is Tier 2 entity
const agentIsTier2 = tier2Persons.some(p => p['@id'] === act2['has_agent']);
assert(agentIsTier2, "Agent (has_agent) links to Tier 2 Person entity");

// Verify affects is Tier 2 entity
const affectsTier2 = tier2Persons.some(p => p['@id'] === act2['affects']);
assert(affectsTier2, "Patient (affects) links to Tier 2 Person entity");

console.log('✓ AC-1.3.2: Act Links to Tier 2 Entities - PASSED');
console.log(`  Agent IRI: ${act2['has_agent']}`);
console.log(`  Affects IRI: ${act2['affects']}\n`);

// AC-1.3.3: ActualityStatus on All Acts
console.log('Verifying AC-1.3.3: ActualityStatus on All Acts (v2.2)');

// Test various modalities and their status mappings
const testCases = [
  {
    text: "The doctor treats the patient",
    expectedStatus: "tagteam:Actual",
    description: "Simple present → Actual"
  },
  {
    text: "The doctor must treat the patient",
    expectedStatus: "tagteam:Prescribed",
    description: "Obligation (must) → Prescribed"
  },
  {
    text: "The patient may leave",
    expectedStatus: "tagteam:Permitted",
    description: "Permission (may) → Permitted"
  },
  {
    text: "The doctor will treat the patient",
    expectedStatus: "tagteam:Planned",
    description: "Intention (will) → Planned"
  },
  {
    text: "The doctor should treat the patient",
    expectedStatus: "tagteam:Prescribed",
    description: "Recommendation (should) → Prescribed"
  }
];

testCases.forEach(testCase => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build(testCase.text);

  const acts = graph['@graph'].filter(n =>
    n['@type'].some(t => t.includes('ActOf') || t.includes('IntentionalAct')));

  const act = acts[0];
  assert(act['tagteam:actualityStatus'] === testCase.expectedStatus,
    `${testCase.description}: expected ${testCase.expectedStatus}, got ${act['tagteam:actualityStatus']}`);

  console.log(`  ✓ ${testCase.description}`);
});

console.log('✓ AC-1.3.3: ActualityStatus on All Acts - PASSED\n');

// Verify v2.2 Position Properties
console.log('Verifying v2.2 Position Properties on Acts');

const extractor = new ActExtractor();
const acts3 = extractor.extract("The doctor treats the patient");
const act3 = acts3[0];

assert(act3['tagteam:sourceText'] !== undefined, "Has sourceText");
assert(act3['tagteam:startPosition'] !== undefined, "Has startPosition");
assert(act3['tagteam:endPosition'] !== undefined, "Has endPosition");
assert(typeof act3['tagteam:startPosition'] === 'number', "startPosition is number");
assert(typeof act3['tagteam:endPosition'] === 'number', "endPosition is number");

console.log('✓ v2.2 Position Properties - PASSED\n');

// Summary
console.log('=== Phase 1.3 Deliverables (Updated for v2.2) ===');
console.log('✓ ActExtractor.js (v4.0.0-phase4) - COMPLETE');
console.log('  - Verb-to-CCO type mapping');
console.log('  - Modality detection (obligation, permission, recommendation, intention)');
console.log('  - Negation detection');
console.log('  - Tier 2 entity linking via is_about resolution');
console.log('  - ActualityStatus determination');
console.log('  - v2.2 position properties (sourceText, startPosition, endPosition)');
console.log('✓ test-act-extraction.js (39 unit tests including v2.2) - COMPLETE\n');

console.log('=== All Phase 1.3 Acceptance Criteria VERIFIED ===\n');

console.log('Phase 1.3: Act Extraction with Tier 2 Linking (v2.2) - ✅ COMPLETE');
console.log('Ready to proceed to Phase 2: Directive and Scarcity Extraction\n');
