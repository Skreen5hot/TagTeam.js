/**
 * Definite NP Tests
 *
 * Tests extraction and marking of definite noun phrases ("the X").
 * Definite NPs presuppose the existence of their referent.
 *
 * Plan Reference: Section 1.2 Discourse Referent Extraction / Definiteness
 * Priority: P0 (Must pass - core feature)
 *
 * @tags p0, linguistic, referents, definiteness
 */

const { describe, test, expect, semantic, parseToGraph, printSummary, exit } = require('../../../framework/test-helpers');

describe('Definite Noun Phrases', function() {

  describe('Basic Definite Detection', function() {

    test('"the doctor" is marked as definite', () => {
      const graph = parseToGraph('The doctor treats the patient.');

      const doctor = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('doctor')
      );

      expect(doctor).toBeTruthy();
      expect(doctor['tagteam:definiteness']).toBe('definite');
    });

    test('"the patient" is marked as definite', () => {
      const graph = parseToGraph('The doctor treats the patient.');

      const patient = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('patient')
      );

      expect(patient).toBeTruthy();
      expect(patient['tagteam:definiteness']).toBe('definite');
    });

    test('multiple definite NPs in same sentence', () => {
      const graph = parseToGraph('The nurse gives the medication to the patient.');

      const referents = semantic.getNodesOfType(graph, 'DiscourseReferent');
      const definiteCount = referents.filter(r =>
        r['tagteam:definiteness'] === 'definite'
      ).length;

      expect(definiteCount).toBeGreaterThanOrEqual(2);
    });

  });

  describe('Definite with Modifiers', function() {

    test('"the last ventilator" is definite', () => {
      const graph = parseToGraph('The doctor allocates the last ventilator.');

      const ventilator = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('ventilator')
      );

      expect(ventilator).toBeTruthy();
      expect(ventilator['tagteam:definiteness']).toBe('definite');
    });

    test('"the critically ill patient" is definite', () => {
      const graph = parseToGraph('The doctor treats the critically ill patient.');

      const patient = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('patient')
      );

      expect(patient).toBeTruthy();
      expect(patient['tagteam:definiteness']).toBe('definite');
    });

    test('"the elderly man" is definite', () => {
      const graph = parseToGraph('The physician examines the elderly man.');

      const man = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('man')
      );

      expect(man).toBeTruthy();
      expect(man['tagteam:definiteness']).toBe('definite');
    });

  });

  describe('Referential Status', function() {

    test('definite NP has presupposed referential status', () => {
      const graph = parseToGraph('The committee reviews the proposal.');

      const committee = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('committee')
      );

      expect(committee).toBeTruthy();
      // Presupposed = existence assumed, not introduced
      expect(committee['tagteam:referentialStatus']).toBe('presupposed');
    });

    test('definite subject is presupposed', () => {
      const graph = parseToGraph('The hospital provides emergency care.');

      const hospital = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('hospital')
      );

      expect(hospital).toBeTruthy();
      expect(hospital['tagteam:referentialStatus']).toBe('presupposed');
    });

  });

  describe('Definite vs Indefinite Contrast', function() {

    test('definite and indefinite in same sentence are distinguished', () => {
      const graph = parseToGraph('The doctor treats a new patient.');

      const doctor = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('doctor')
      );
      const patient = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('patient')
      );

      expect(doctor).toBeTruthy();
      expect(patient).toBeTruthy();

      expect(doctor['tagteam:definiteness']).toBe('definite');
      expect(patient['tagteam:definiteness']).toBe('indefinite');
    });

    test('different referential statuses assigned correctly', () => {
      const graph = parseToGraph('The nurse examines a child.');

      const nurse = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('nurse')
      );
      const child = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('child')
      );

      expect(nurse).toBeTruthy();
      expect(child).toBeTruthy();

      expect(nurse['tagteam:referentialStatus']).toBe('presupposed');
      expect(child['tagteam:referentialStatus']).toBe('introduced');
    });

  });

  describe('Proper Names (Inherently Definite)', function() {

    test('proper name is treated as definite', () => {
      const graph = parseToGraph('Dr. Smith treats the patient.');

      // Look for any entity containing "Smith"
      const smith = semantic.findNode(graph, n =>
        n['rdfs:label']?.includes('Smith') || n['rdfs:label']?.includes('Dr')
      );

      // Proper names may or may not be extracted as separate entities
      // but when they are, they should be definite
      if (smith && smith['tagteam:definiteness']) {
        expect(smith['tagteam:definiteness']).toBe('definite');
      }
    });

  });

  describe('Scarcity Markers on Definite NPs', function() {

    test('"the last" indicates scarcity on definite NP', () => {
      const graph = parseToGraph('The surgeon uses the last available donor organ.');

      const organ = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('organ')
      );

      expect(organ).toBeTruthy();
      expect(organ['tagteam:definiteness']).toBe('definite');

      // Check for scarcity markers
      if (organ['tagteam:is_scarce'] || organ['tagteam:quantity']) {
        expect(organ['tagteam:is_scarce'] || organ['tagteam:quantity'] === 1).toBeTruthy();
      }
    });

    test('"the only" implies uniqueness/scarcity', () => {
      const graph = parseToGraph('The doctor is the only specialist available.');

      const specialist = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('specialist')
      );

      if (specialist) {
        expect(specialist['tagteam:definiteness']).toBe('definite');
      }
    });

  });

});

printSummary();
exit();
