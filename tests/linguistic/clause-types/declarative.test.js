/**
 * Declarative Clause Tests
 *
 * Tests extraction of entities and acts from standard declarative sentences.
 * These are the most common sentence type and form the foundation of parsing.
 *
 * Plan Reference: Section 1.1 Clause Types & Syntactic Structures
 * Priority: P0 (Must pass - core feature)
 *
 * @tags p0, linguistic, clause-types
 */

const { describe, test, expect, semantic, parseToGraph, printSummary, exit } = require('../../framework/test-helpers');

// ============================================================
// Simple Declarative (SVO)
// ============================================================

describe('Simple Declarative (SVO)', function() {});

test('extracts subject entity from simple declarative', () => {
  const graph = parseToGraph('The doctor treats the patient.');

  const doctor = semantic.findNode(graph, n =>
    n['rdfs:label']?.toLowerCase().includes('doctor')
  );

  expect(doctor).toBeTruthy();
  semantic.hasType(doctor, 'tagteam:DiscourseReferent');
});

test('extracts object entity from simple declarative', () => {
  const graph = parseToGraph('The doctor treats the patient.');

  const patient = semantic.findNode(graph, n =>
    n['rdfs:label']?.toLowerCase().includes('patient')
  );

  expect(patient).toBeTruthy();
  semantic.hasType(patient, 'tagteam:DiscourseReferent');
});

test('extracts verb/act from simple declarative', () => {
  const graph = parseToGraph('The doctor treats the patient.');

  const act = semantic.findNode(graph, n =>
    n['tagteam:verb'] === 'treat'
  );

  expect(act).toBeTruthy();
  semantic.hasType(act, 'cco:ActOfMedicalTreatment');
});

test('links act to agent via has_agent', () => {
  const graph = parseToGraph('The doctor treats the patient.');

  const act = semantic.findNode(graph, n => n['tagteam:verb'] === 'treat');
  expect(act).toBeTruthy();

  const hasAgent = act['cco:has_agent'];
  expect(hasAgent).toBeTruthy();
  expect(hasAgent['@id']).toBeDefined();
});

// ============================================================
// Declarative with Multiple Entities
// ============================================================

describe('Declarative with Multiple Entities', function() {});

test('extracts multiple entities from compound subject', () => {
  const graph = parseToGraph('The doctor and the nurse treat the patient.');

  const referents = semantic.getNodesOfType(graph, 'DiscourseReferent');
  expect(referents.length).toBeGreaterThanOrEqual(2);
});

test('extracts resource and recipients from allocation sentence', () => {
  const graph = parseToGraph('The doctor must allocate the ventilator between two patients.');

  const ventilator = semantic.findNode(graph, n =>
    n['rdfs:label']?.toLowerCase().includes('ventilator')
  );
  expect(ventilator).toBeTruthy();

  const patients = semantic.findNode(graph, n =>
    n['rdfs:label']?.toLowerCase().includes('patient')
  );
  expect(patients).toBeTruthy();
});

// ============================================================
// Declarative with Modifiers
// ============================================================

describe('Declarative with Modifiers', function() {});

test('extracts entity with adjective modifier', () => {
  const graph = parseToGraph('The critically ill patient needs treatment.');

  const patient = semantic.findNode(graph, n =>
    n['rdfs:label']?.toLowerCase().includes('patient')
  );

  expect(patient).toBeTruthy();
  // Check for quality or qualifier
  const label = patient['rdfs:label'].toLowerCase();
  expect(label.includes('ill') || patient['tagteam:qualifiers']).toBeTruthy();
});

test('extracts entity with determiner "the last"', () => {
  const graph = parseToGraph('The doctor allocates the last ventilator.');

  const ventilator = semantic.findNode(graph, n =>
    n['rdfs:label']?.toLowerCase().includes('ventilator')
  );

  expect(ventilator).toBeTruthy();
  expect(ventilator['tagteam:definiteness']).toBe('definite');
});

// ============================================================
// Declarative Tense Variations
// ============================================================

describe('Declarative Tense Variations', function() {});

test('parses present tense declarative', () => {
  const graph = parseToGraph('The committee reviews the proposal.');

  const act = semantic.findNode(graph, n => n['tagteam:verb']);
  expect(act).toBeTruthy();
});

test('parses past tense declarative', () => {
  const graph = parseToGraph('The committee reviewed the proposal.');

  const act = semantic.findNode(graph, n => n['tagteam:verb']);
  expect(act).toBeTruthy();
  expect(act['tagteam:actualityStatus']).toBe('tagteam:Actual');
});

printSummary();
exit();
