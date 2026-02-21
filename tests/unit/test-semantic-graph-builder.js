/**
 * Unit Tests for SemanticGraphBuilder
 *
 * Tests Phase 1.1 Acceptance Criteria:
 * - AC-1.1.1: Valid JSON-LD Output
 * - AC-1.1.2: Namespace Strategy
 * - AC-1.1.3: Context Completeness
 *
 * Updated for Phase 4 Two-Tier Architecture (v2.2 spec)
 *
 * @version 4.0.0-phase4
 */

const assert = require('assert');
const SemanticGraphBuilder = require('../../src/graph/SemanticGraphBuilder');
const JSONLDSerializer = require('../../src/graph/JSONLDSerializer');

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

console.log('\n=== SemanticGraphBuilder Unit Tests ===\n');

// Test Suite 1: Basic Construction
console.log('Test Suite 1: Basic Construction');

test('SemanticGraphBuilder can be instantiated', () => {
  const builder = new SemanticGraphBuilder();
  assert(builder instanceof SemanticGraphBuilder);
});

test('build() returns graph structure', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('test text');
  assert(graph['@graph'] !== undefined, 'Has @graph property');
  assert(Array.isArray(graph['@graph']), '@graph is an array');
});

test('build() accepts options', () => {
  const builder = new SemanticGraphBuilder({ context: 'MedicalEthics' });
  const graph = builder.build('test', { namespace: 'custom' });
  assert(graph !== null);
});

// Test Suite 2: Node Management
console.log('\nTest Suite 2: Node Management');

test('addNode() adds node to graph', () => {
  const builder = new SemanticGraphBuilder();
  builder.build('test', { extractEntities: false, extractActs: false });

  const node = {
    '@id': 'inst:Test_Node_001',
    '@type': 'tagteam:DiscourseReferent',
    'rdfs:label': 'test node'
  };

  const added = builder.addNode(node);
  assert(added === node);
  assert(builder.getNodes().length === 1);
});

test('addNode() throws error if missing @id', () => {
  const builder = new SemanticGraphBuilder();
  builder.build('test', { extractEntities: false, extractActs: false });

  try {
    builder.addNode({ '@type': 'tagteam:DiscourseReferent' });
    assert.fail('Should have thrown error');
  } catch (error) {
    assert(error.message.includes('@id'));
  }
});

test('addNode() throws error if missing @type', () => {
  const builder = new SemanticGraphBuilder();
  builder.build('test', { extractEntities: false, extractActs: false });

  try {
    builder.addNode({ '@id': 'inst:Test_001' });
    assert.fail('Should have thrown error');
  } catch (error) {
    assert(error.message.includes('@type'));
  }
});

test('addNode() prevents duplicates by IRI', () => {
  const builder = new SemanticGraphBuilder();
  builder.build('test', { extractEntities: false, extractActs: false });

  const node1 = { '@id': 'inst:Test_001', '@type': 'tagteam:DiscourseReferent' };
  const node2 = { '@id': 'inst:Test_001', '@type': 'tagteam:DiscourseReferent', 'rdfs:label': 'updated' };

  builder.addNode(node1);
  builder.addNode(node2);

  assert(builder.getNodes().length === 1, 'Should have 1 node (merged)');
  assert(builder.getNode('inst:Test_001')['rdfs:label'] === 'updated');
});

test('addNodes() adds multiple nodes', () => {
  const builder = new SemanticGraphBuilder();
  builder.build('test', { extractEntities: false, extractActs: false });

  const nodes = [
    { '@id': 'inst:Node1', '@type': 'tagteam:DiscourseReferent' },
    { '@id': 'inst:Node2', '@type': 'tagteam:DiscourseReferent' },
    { '@id': 'inst:Node3', '@type': 'tagteam:DiscourseReferent' }
  ];

  builder.addNodes(nodes);
  assert(builder.getNodes().length === 3);
});

test('addNodes() throws error if not array', () => {
  const builder = new SemanticGraphBuilder();
  builder.build('test');

  try {
    builder.addNodes({ '@id': 'inst:Test', '@type': 'test' });
    assert.fail('Should have thrown error');
  } catch (error) {
    assert(error.message.includes('array'));
  }
});

// Test Suite 3: IRI Generation (AC-1.1.2)
console.log('\nTest Suite 3: IRI Generation (AC-1.1.2 - Namespace Strategy)');

test('generateIRI() creates deterministic IRIs', () => {
  const builder = new SemanticGraphBuilder();

  const iri1 = builder.generateIRI('the doctor', 'DiscourseReferent', 0);
  const iri2 = builder.generateIRI('the doctor', 'DiscourseReferent', 0);

  assert(iri1 === iri2, 'Same input should produce same IRI');
});

test('generateIRI() uses SHA-256 hash (12 hex chars per v2.2 spec)', () => {
  const builder = new SemanticGraphBuilder();
  const iri = builder.generateIRI('the doctor', 'DiscourseReferent', 0);

  // Should match pattern: inst:The_Doctor_DiscourseReferent_<12 hex chars>
  assert(iri.startsWith('inst:'), 'Uses inst: prefix');
  assert(/[0-9a-f]{12}$/.test(iri), 'Ends with 12 hex characters (v2.2 spec)');
});

test('generateIRI() includes text + offset + type in hash', () => {
  const builder = new SemanticGraphBuilder();

  const iri1 = builder.generateIRI('doctor', 'DiscourseReferent', 0);
  const iri2 = builder.generateIRI('doctor', 'DiscourseReferent', 10);
  const iri3 = builder.generateIRI('doctor', 'Act', 0);

  // Different offset/type should produce different hashes
  assert(iri1 !== iri2, 'Different offset produces different IRI');
  assert(iri1 !== iri3, 'Different type produces different IRI');
});

test('generateIRI() handles special characters in text', () => {
  const builder = new SemanticGraphBuilder();

  const iri = builder.generateIRI('the doctor!', 'DiscourseReferent', 0);

  // Should clean special chars
  assert(!iri.includes('!'), 'Removes special characters');
  assert(iri.includes('The_Doctor'), 'Preserves cleaned text');
});

test('generateIRI() handles multi-word text', () => {
  const builder = new SemanticGraphBuilder();

  const iri = builder.generateIRI('last ventilator', 'DiscourseReferent', 0);

  assert(iri.includes('Last_Ventilator'), 'Joins words with underscore');
});

test('generateIRI() respects custom namespace', () => {
  const builder = new SemanticGraphBuilder({ namespace: 'custom' });

  const iri = builder.generateIRI('test', 'DiscourseReferent', 0);

  assert(iri.startsWith('custom:'), 'Uses custom namespace');
});

// Test Suite 4: Graph Utilities
console.log('\nTest Suite 4: Graph Utilities');

test('getNode() retrieves node by IRI', () => {
  const builder = new SemanticGraphBuilder();
  builder.build('test');

  const node = { '@id': 'inst:Test_001', '@type': 'tagteam:DiscourseReferent' };
  builder.addNode(node);

  const retrieved = builder.getNode('inst:Test_001');
  assert(retrieved === node);
});

test('getNode() returns undefined for non-existent IRI', () => {
  const builder = new SemanticGraphBuilder();
  builder.build('test');

  const retrieved = builder.getNode('inst:NonExistent');
  assert(retrieved === undefined);
});

test('clear() resets graph', () => {
  const builder = new SemanticGraphBuilder();
  builder.build('test');
  builder.addNode({ '@id': 'inst:Test_001', '@type': 'test' });

  builder.clear();

  assert(builder.getNodes().length === 0);
});

test('getStats() returns graph statistics', () => {
  const builder = new SemanticGraphBuilder();
  // Use extractEntities: false and extractActs: false to get predictable count
  builder.build('test input text', { extractEntities: false, extractActs: false });
  builder.addNode({ '@id': 'inst:Test_001', '@type': 'test' });

  const stats = builder.getStats();

  assert(stats.nodeCount === 1);
  assert(stats.inputLength === 15);
  assert(stats.timestamp !== undefined);
});

// Test Suite 5: JSON-LD Serialization (AC-1.1.1)
console.log('\nTest Suite 5: JSON-LD Serialization (AC-1.1.1 - Valid JSON-LD Output)');

test('JSONLDSerializer can be instantiated', () => {
  const serializer = new JSONLDSerializer();
  assert(serializer instanceof JSONLDSerializer);
});

test('serialize() produces valid JSON', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The doctor treats the patient');

  const serializer = new JSONLDSerializer();
  const jsonld = serializer.serialize(graph);

  // Should be valid JSON
  const parsed = JSON.parse(jsonld);
  assert(parsed !== null);
});

test('serialize() includes @context (AC-1.1.1)', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('test');

  const serializer = new JSONLDSerializer();
  const jsonld = serializer.serialize(graph);
  const parsed = JSON.parse(jsonld);

  assert(parsed['@context'] !== undefined, 'Has @context');
  assert(parsed['@graph'] !== undefined, 'Has @graph array');
});

test('serialize() includes tagteam namespace (AC-1.1.1)', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const jsonld = serializer.serialize(graph);
  const parsed = JSON.parse(jsonld);

  assert(parsed['@context'].tagteam === 'http://tagteam.fandaws.org/ontology/',
    'Has tagteam namespace');
  assert(parsed['@context'].inst === 'http://tagteam.fandaws.org/instance/',
    'Has inst namespace');
});

test('serialize() with pretty formatting', () => {
  const serializer = new JSONLDSerializer({ pretty: true });
  const graph = { '@graph': [] };
  const jsonld = serializer.serialize(graph);

  // Pretty format should have newlines
  assert(jsonld.includes('\n'), 'Contains newlines for pretty printing');
});

test('parse() deserializes JSON-LD', () => {
  const serializer = new JSONLDSerializer();
  const original = { '@graph': [{ '@id': 'test:1', '@type': 'test' }] };

  const jsonld = serializer.serialize(original);
  const parsed = serializer.parse(jsonld);

  assert(parsed['@graph'].length === 1);
  assert(parsed['@context'] !== undefined);
});

// Test Suite 6: Context Completeness (AC-1.1.3)
console.log('\nTest Suite 6: Context Completeness (AC-1.1.3)');

test('@context includes DiscourseReferent class (AC-1.1.3)', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.DiscourseReferent === 'tagteam:DiscourseReferent',
    '@context defines DiscourseReferent');
});

test('@context includes is_about (cross-tier relation per v2.2 spec)', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.is_about['@id'] === 'cco:is_about',
    'is_about maps to cco:is_about');
  assert(context.is_about['@type'] === '@id',
    'is_about is @id type');
});

test('@context includes extractionConfidence with xsd:decimal type (AC-1.1.3)', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.extractionConfidence['@type'] === 'xsd:decimal',
    'extractionConfidence is xsd:decimal type');
});

test('@context includes all GIT-Minimal classes', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.InterpretationContext === 'tagteam:InterpretationContext');
  assert(context.AutomatedDetection === 'tagteam:AutomatedDetection');
  assert(context.HumanValidation === 'tagteam:HumanValidation');
});

test('@context includes GIT-Minimal properties', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.validInContext['@type'] === '@id');
  assert(context.assertionType['@type'] === '@id');
  assert(context.supersedes['@type'] === '@id');
  assert(context.validatedBy['@type'] === '@id');
});

test('@context includes BFO relations', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.inheres_in['@id'] === 'bfo:BFO_0000052');
  assert(context.realized_in['@id'] === 'bfo:BFO_0000054');
  assert(context.has_participant['@id'] === 'bfo:BFO_0000057');
});

test('@context includes CCO relations', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.has_agent['@type'] === '@id');
  assert(context.affects['@type'] === '@id');
});

// Test Suite 7: Two-Tier Architecture v2.2 Properties
console.log('\nTest Suite 7: Two-Tier Architecture v2.2 Properties');

test('@context includes Tier 1 classes (v2.2)', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.DiscourseReferent === 'tagteam:DiscourseReferent');
  assert(context.VerbPhrase === 'tagteam:VerbPhrase');
  assert(context.DirectiveContent === 'tagteam:DirectiveContent');
  assert(context.ScarcityAssertion === 'tagteam:ScarcityAssertion');
  assert(context.ValueDetectionRecord === 'tagteam:ValueDetectionRecord');
  assert(context.ContextAssessmentRecord === 'tagteam:ContextAssessmentRecord');
});

test('@context includes Actuality Status Named Individuals (v2.2)', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.ActualityStatus === 'tagteam:ActualityStatus');
  assert(context.Actual === 'tagteam:Actual');
  assert(context.Prescribed === 'tagteam:Prescribed');
  assert(context.Permitted === 'tagteam:Permitted');
  assert(context.Prohibited === 'tagteam:Prohibited');
  assert(context.Hypothetical === 'tagteam:Hypothetical');
  assert(context.Planned === 'tagteam:Planned');
  assert(context.Negated === 'tagteam:Negated');
});

test('@context includes cross-tier relations (v2.2)', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.is_about['@id'] === 'cco:is_about');
  assert(context.prescribes['@id'] === 'cco:prescribes');
  assert(context.prescribed_by['@id'] === 'tagteam:prescribed_by');
});

test('@context includes Tier 1 relations (v2.2)', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.has_component['@id'] === 'tagteam:has_component');
  assert(context.extracted_from['@id'] === 'tagteam:extracted_from');
  assert(context.corefersWith['@id'] === 'tagteam:corefersWith');
});

test('@context includes provenance properties (v2.2)', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.instantiated_at['@id'] === 'tagteam:instantiated_at');
  assert(context.instantiated_at['@type'] === 'xsd:dateTime');
  assert(context.instantiated_by['@id'] === 'tagteam:instantiated_by');
  assert(context.negationMarker === 'tagteam:negationMarker');
});

test('@context includes actualityStatus property (v2.2)', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.actualityStatus['@id'] === 'tagteam:actualityStatus');
  assert(context.actualityStatus['@type'] === '@id');
});

test('@context includes scarcity properties (v2.2)', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.scarceResource['@id'] === 'tagteam:scarceResource');
  assert(context.competingParties['@id'] === 'tagteam:competingParties');
  assert(context.competingParties['@container'] === '@set', 'competingParties has @container: @set');
  assert(context.supplyCount['@type'] === 'xsd:integer');
  assert(context.demandCount['@type'] === 'xsd:integer');
  assert(context.scarcityRatio['@type'] === 'xsd:decimal');
});

test('@context includes deontic properties (v2.2)', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.modalType === 'tagteam:modalType');
  assert(context.modalMarker === 'tagteam:modalMarker');
  assert(context.modalStrength['@type'] === 'xsd:decimal');
});

test('@context includes VerbPhrase properties (v2.2)', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.verb === 'tagteam:verb');
  assert(context.lemma === 'tagteam:lemma');
  assert(context.tense === 'tagteam:tense');
  assert(context.hasModalMarker === 'tagteam:hasModalMarker');
});

test('@context includes IBE properties (v2.2)', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.has_text_value === 'cco:has_text_value');
  assert(context.char_count['@type'] === 'xsd:integer');
  assert(context.received_at['@type'] === 'xsd:dateTime');
  assert(context.temporal_extent['@type'] === 'xsd:dateTime');
});

test('@context includes DiscourseReferent properties (v2.2)', () => {
  const serializer = new JSONLDSerializer();
  const graph = { '@graph': [] };
  const parsed = JSON.parse(serializer.serialize(graph));

  const context = parsed['@context'];
  assert(context.sourceText === 'tagteam:sourceText');
  assert(context.startPosition['@type'] === 'xsd:integer');
  assert(context.endPosition['@type'] === 'xsd:integer');
  assert(context.definiteness === 'tagteam:definiteness');
  assert(context.quantity['@type'] === 'xsd:integer');
  assert(context.quantityIndicator === 'tagteam:quantityIndicator');
  assert(context.qualifiers === 'tagteam:qualifiers');
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Total: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
}

console.log('\n✓ All Phase 1.1 tests passed!');
