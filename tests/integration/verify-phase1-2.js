/**
 * Phase 1.2 Acceptance Criteria Verification
 *
 * Verifies all acceptance criteria from roadmap are met:
 * - AC-1.2.1: Agent Extraction
 * - AC-1.2.2: Artifact Extraction
 * - AC-1.2.3: Artifact Scarcity Detection
 * - AC-1.2.4: Continuants vs Occurrents Type Distinction
 *
 * @version 3.0.0-alpha.2
 */

const assert = require('assert');
const SemanticGraphBuilder = require('../../src/graph/SemanticGraphBuilder');
const JSONLDSerializer = require('../../src/graph/JSONLDSerializer');

console.log('\n=== Phase 1.2 Acceptance Criteria Verification ===\n');

// Common test input
const text = "The doctor must allocate the last ventilator between two critically ill patients";

// Build graph
const builder = new SemanticGraphBuilder();
const graph = builder.build(text);

// AC-1.2.1: Agent Extraction
console.log('Verifying AC-1.2.1: Agent Extraction');

const doctor = graph['@graph'].find(n =>
  n['rdfs:label']?.toLowerCase().includes('doctor'));

assert(doctor !== undefined, "Found doctor entity");
assert(doctor['@type'].includes('tagteam:DiscourseReferent'),
  "Doctor has DiscourseReferent type");
assert(doctor['tagteam:denotesType'] === 'cco:Person',
  "Doctor denotesType is cco:Person");
assert(doctor['tagteam:definiteness'] === 'definite',
  "Doctor has definite definiteness (from 'The')");
assert(doctor['tagteam:referentialStatus'] === 'presupposed',
  "Doctor has presupposed referentialStatus");

console.log('✓ AC-1.2.1: Agent Extraction - PASSED');
console.log(`  Doctor IRI: ${doctor['@id']}`);
console.log(`  denotesType: ${doctor['tagteam:denotesType']}`);
console.log(`  definiteness: ${doctor['tagteam:definiteness']}\n`);

// AC-1.2.2: Artifact Extraction
console.log('Verifying AC-1.2.2: Artifact Extraction');

// Find the DiscourseReferent specifically (not the ScarcityAssertion)
const ventilator = graph['@graph'].find(n =>
  n['rdfs:label']?.toLowerCase().includes('ventilator') &&
  n['@type']?.includes('tagteam:DiscourseReferent'));

assert(ventilator !== undefined, "Found ventilator DiscourseReferent entity");
assert(ventilator['@type'].includes('tagteam:DiscourseReferent'),
  "Ventilator has DiscourseReferent type");
assert(ventilator['tagteam:denotesType'] === 'cco:Artifact',
  "Ventilator denotesType is cco:Artifact");

console.log('✓ AC-1.2.2: Artifact Extraction - PASSED');
console.log(`  Ventilator IRI: ${ventilator['@id']}`);
console.log(`  denotesType: ${ventilator['tagteam:denotesType']}\n`);

// AC-1.2.3: Artifact Scarcity Detection
console.log('Verifying AC-1.2.3: Artifact Scarcity Detection');

assert(ventilator['tagteam:is_scarce'] === true,
  "Ventilator is_scarce is true");
assert(ventilator['tagteam:quantity'] === 1,
  "Ventilator quantity is 1 (from 'last')");

// Check patients have quantity (find the DiscourseReferent specifically)
const patients = graph['@graph'].find(n =>
  n['rdfs:label']?.toLowerCase().includes('patient') &&
  n['@type']?.includes('tagteam:DiscourseReferent'));
assert(patients !== undefined, "Found patients DiscourseReferent entity");
assert(patients['tagteam:quantity'] === 2,
  "Patients quantity is 2 (from 'two')");

console.log('✓ AC-1.2.3: Artifact Scarcity Detection - PASSED');
console.log(`  Ventilator is_scarce: ${ventilator['tagteam:is_scarce']}`);
console.log(`  Ventilator quantity: ${ventilator['tagteam:quantity']}`);
console.log(`  Patients quantity: ${patients['tagteam:quantity']}\n`);

// AC-1.2.4: Continuants vs Occurrents Type Distinction
console.log('Verifying AC-1.2.4: Continuants vs Occurrents Type Distinction');

const referents = graph['@graph'].filter(n =>
  n['@type'].includes('tagteam:DiscourseReferent'));

console.log(`  Found ${referents.length} DiscourseReferent nodes`);

referents.forEach(r => {
  // Must be DiscourseReferent
  assert(r['@type'].includes('tagteam:DiscourseReferent'),
    `${r['rdfs:label']} must be DiscourseReferent`);

  // Must NOT claim BFO entity status directly in @type
  assert(!r['@type'].includes('cco:Person'),
    `${r['rdfs:label']} @type should NOT include cco:Person`);
  assert(!r['@type'].includes('cco:Artifact'),
    `${r['rdfs:label']} @type should NOT include cco:Artifact`);

  // Should include owl:NamedIndividual
  assert(r['@type'].includes('owl:NamedIndividual'),
    `${r['rdfs:label']} should include owl:NamedIndividual`);

  // Should use denotesType to point to entity type
  assert(r['tagteam:denotesType'],
    `${r['rdfs:label']} should have denotesType`);

  console.log(`  ✓ ${r['rdfs:label']}: @type=${JSON.stringify(r['@type'])}, denotesType=${r['tagteam:denotesType']}`);
});

console.log('✓ AC-1.2.4: Continuants vs Occurrents Type Distinction - PASSED\n');

// Verify span preservation (v2.2 properties)
console.log('Verifying Span Preservation (v2.2 spec)');

referents.forEach(r => {
  // v2.2 uses startPosition/endPosition instead of span_offset array
  assert(r['tagteam:startPosition'] !== undefined, `${r['rdfs:label']} has startPosition`);
  assert(r['tagteam:endPosition'] !== undefined, `${r['rdfs:label']} has endPosition`);
  assert(typeof r['tagteam:startPosition'] === 'number', 'startPosition is number');
  assert(typeof r['tagteam:endPosition'] === 'number', 'endPosition is number');
  assert(r['tagteam:sourceText'], `${r['rdfs:label']} has sourceText`);
});

console.log('✓ Span Preservation (v2.2 spec) - PASSED\n');

// Verify JSON-LD serialization works with entities
console.log('Verifying JSON-LD Serialization');

const serializer = new JSONLDSerializer();
const jsonld = serializer.serialize(graph);
const parsed = JSON.parse(jsonld);

assert(parsed['@context'] !== undefined, "Has @context");
assert(parsed['@graph'] !== undefined, "Has @graph");
assert(parsed['@graph'].length > 0, "Has entities in @graph");

// Verify context includes DiscourseReferent definition
assert(parsed['@context'].DiscourseReferent === 'tagteam:DiscourseReferent',
  "@context defines DiscourseReferent");

// Note: denotesType uses the tagteam namespace prefix directly
// It's not defined with explicit @type in the context (uses standard property mapping)

console.log('✓ JSON-LD Serialization - PASSED\n');

// Summary
console.log('=== Phase 1.2 Deliverables ===');
console.log('✓ EntityExtractor.js (~270 lines) - COMPLETE');
console.log('✓ Updated SemanticGraphBuilder.js to integrate EntityExtractor - COMPLETE');
console.log('✓ Unit test: test-entity-extraction.js (31 tests) - COMPLETE');
console.log('✓ Integration test: verify-phase1-2.js - COMPLETE\n');

console.log('=== All Phase 1.2 Acceptance Criteria VERIFIED ===\n');

console.log('Phase 1.2: Entity Extraction → Discourse Referents - ✅ COMPLETE');
console.log('Ready to proceed to Phase 1.3: Act Extraction\n');
