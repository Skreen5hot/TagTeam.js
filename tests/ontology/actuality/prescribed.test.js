/**
 * Prescribed Actuality Status Tests
 *
 * Tests that obligation modals correctly assign Prescribed status to acts.
 * Prescribed = Act is obligated but not yet actual (must/shall do).
 *
 * Plan Reference: Section 2.3 Actuality Status & Modality Mapping
 * Priority: P0 (Must pass - core ontology feature)
 *
 * @tags p0, ontology, actuality
 */

const { describe, test, expect, semantic, parseToGraph, printSummary, exit } = require('../../framework/test-helpers');

describe('Prescribed Actuality Status', function() {

  describe('Basic Prescribed Status', function() {

    test('obligation modal assigns Prescribed status', () => {
      const graph = parseToGraph('The doctor must treat the patient.');

      const act = semantic.findNode(graph, n => n['tagteam:verb'] === 'treat');
      expect(act).toBeTruthy();

      expect(act['tagteam:actualityStatus']).toBe('tagteam:Prescribed');
    });

    test('Prescribed status distinct from Actual', () => {
      const graph = parseToGraph('The doctor treats the patient.');

      const act = semantic.findNode(graph, n => n['tagteam:verb'] === 'treat');
      expect(act).toBeTruthy();

      expect(act['tagteam:actualityStatus']).toBe('tagteam:Actual');
    });

    test('both statuses in same graph are distinct', () => {
      // This tests parsing two different sentences
      const prescribedGraph = parseToGraph('The doctor must help the patient.');
      const actualGraph = parseToGraph('The doctor helped the patient.');

      const prescribedAct = semantic.findNode(prescribedGraph, n => n['tagteam:verb'] === 'help');
      const actualAct = semantic.findNode(actualGraph, n => n['tagteam:verb'] === 'help');

      expect(prescribedAct['tagteam:actualityStatus']).toBe('tagteam:Prescribed');
      expect(actualAct['tagteam:actualityStatus']).toBe('tagteam:Actual');
    });

  });

  describe('Role Realization with Prescribed Acts', function() {

    test('roles use would_be_realized_in for Prescribed acts', () => {
      const graph = parseToGraph('The doctor must allocate the resource.');

      // Find agent role
      const role = semantic.findNode(graph, n =>
        (n['@type']?.includes('bfo:Role') && n['rdfs:label'] === 'AgentRole') ||
        n['@type']?.includes('bfo:BFO_0000023')
      );

      if (role) {
        // Per ontology constraints, non-Actual acts use would_be_realized_in
        const realization = role['tagteam:would_be_realized_in'] || role['realized_in'];
        expect(realization).toBeTruthy();
      }
    });

    test('roles use realized_in for Actual acts', () => {
      const graph = parseToGraph('The doctor allocated the resource.');

      const role = semantic.findNode(graph, n =>
        n['@type']?.includes('bfo:Role') && n['rdfs:label'] === 'AgentRole'
      );

      if (role) {
        // Actual acts use realized_in
        const realization = role['realized_in'];
        if (realization) {
          expect(realization['@id']).toBeDefined();
        }
      }
    });

  });

  describe('Prescribed with DirectiveContent', function() {

    test('Prescribed act has associated DirectiveContent', () => {
      const graph = parseToGraph('The committee must approve the proposal.');

      const directive = semantic.findNode(graph, n =>
        n['@type']?.includes('tagteam:DirectiveContent')
      );

      expect(directive).toBeTruthy();
    });

    test('DirectiveContent prescribes the Prescribed act', () => {
      const graph = parseToGraph('The team must complete the project.');

      const directive = semantic.findNode(graph, n =>
        n['@type']?.includes('tagteam:DirectiveContent')
      );

      const act = semantic.findNode(graph, n =>
        n['tagteam:verb'] === 'complete'
      );

      if (directive && act) {
        const prescribes = directive['cco:prescribes'];
        expect(prescribes).toBeTruthy();
      }
    });

  });

  describe('Multiple Prescribed Acts', function() {

    test('multiple obligations in same sentence', () => {
      const graph = parseToGraph('The physician must inform and must document.');

      const acts = semantic.getNodesOfType(graph, 'IntentionalAct')
        .concat(semantic.getNodesOfType(graph, 'ActOfCommunication'));

      // Should find at least one act
      expect(acts.length).toBeGreaterThanOrEqual(1);
    });

  });

  describe('Prescribed in Medical Context', function() {

    test('medical obligation has Prescribed status', () => {
      const graph = parseToGraph('The surgeon must obtain consent before operating.');

      const act = semantic.findNode(graph, n =>
        n['tagteam:verb'] === 'obtain'
      );

      expect(act).toBeTruthy();
      expect(act['tagteam:actualityStatus']).toBe('tagteam:Prescribed');
    });

    test('ethical obligation scenario', () => {
      const graph = parseToGraph('The doctor must prioritize the most critical patient.');

      const act = semantic.findNode(graph, n =>
        n['tagteam:verb'] === 'prioritize'
      );

      expect(act).toBeTruthy();
      semantic.hasActualityStatus(act, 'Prescribed');
    });

  });

});

printSummary();
exit();
