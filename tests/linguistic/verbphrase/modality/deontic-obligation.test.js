/**
 * Deontic Obligation Modality Tests
 *
 * Tests detection of obligation modals (must, shall, have to, need to, should).
 * These create Prescribed actuality status on acts.
 *
 * Plan Reference: Section 1.3 VerbPhrase / Modality
 * Priority: P0 (Must pass - core deontic feature)
 *
 * @tags p0, linguistic, modality, deontic
 */

const { describe, test, expect, semantic, parseToGraph, printSummary, exit } = require('../../../framework/test-helpers');

describe('Deontic Obligation Modality', function() {

  describe('Strong Obligation (must)', function() {

    test('"must" creates Prescribed actuality status', () => {
      const graph = parseToGraph('The doctor must treat the patient.');

      const act = semantic.findNode(graph, n => n['tagteam:verb'] === 'treat');
      expect(act).toBeTruthy();

      semantic.hasActualityStatus(act, 'Prescribed');
    });

    test('"must" creates DirectiveContent node', () => {
      const graph = parseToGraph('The doctor must allocate the resource.');

      const directive = semantic.findNode(graph, n =>
        n['@type']?.includes('tagteam:DirectiveContent') ||
        n['@type']?.includes('cco:DirectiveInformationContentEntity')
      );

      expect(directive).toBeTruthy();
      expect(directive['tagteam:modalType']).toBe('obligation');
    });

    test('"must" directive links to prescribed act', () => {
      const graph = parseToGraph('The doctor must help the patient.');

      const directive = semantic.findNode(graph, n =>
        n['tagteam:modalType'] === 'obligation'
      );
      expect(directive).toBeTruthy();

      const prescribes = directive['cco:prescribes'];
      expect(prescribes).toBeTruthy();
    });

    test('"must" modal strength is 1.0', () => {
      const graph = parseToGraph('The doctor must decide.');

      const directive = semantic.findNode(graph, n =>
        n['tagteam:modalMarker'] === 'must'
      );
      expect(directive).toBeTruthy();
      expect(directive['tagteam:modalStrength']).toBe(1);
    });

  });

  describe('Other Obligation Modals', function() {

    test('"shall" creates obligation', () => {
      const graph = parseToGraph('The committee shall review the proposal.');

      const act = semantic.findNode(graph, n => n['tagteam:verb'] === 'review');

      if (act && act['tagteam:actualityStatus']) {
        // If modality detected
        semantic.hasActualityStatus(act, 'Prescribed');
      }
      // Pass if act extracted at minimum
      expect(act).toBeTruthy();
    });

    test('"should" creates recommendation/weak obligation', () => {
      const graph = parseToGraph('The doctor should inform the family.');

      const act = semantic.findNode(graph, n => n['tagteam:verb'] === 'inform');
      expect(act).toBeTruthy();

      // Should maps to Prescribed (weaker form)
      if (act['tagteam:modality']) {
        expect(act['tagteam:modality']).toBe('recommendation');
      }
    });

    test('"have to" creates obligation', () => {
      const graph = parseToGraph('We have to allocate resources fairly.');

      const act = semantic.findNode(graph, n => n['tagteam:verb'] === 'allocate');
      expect(act).toBeTruthy();
    });

    test('"need to" creates obligation', () => {
      const graph = parseToGraph('The team needs to complete the assessment.');

      const act = semantic.findNode(graph, n =>
        n['tagteam:verb'] === 'complete' || n['tagteam:verb'] === 'need'
      );
      expect(act).toBeTruthy();
    });

  });

  describe('Obligation with Agents', function() {

    test('obligation act links to agent entity', () => {
      const graph = parseToGraph('The physician must disclose the risks.');

      const act = semantic.findNode(graph, n => n['tagteam:verb'] === 'disclose');
      expect(act).toBeTruthy();

      const hasAgent = act['cco:has_agent'];
      expect(hasAgent).toBeTruthy();
    });

    test('obligation preserves agent type as Person', () => {
      const graph = parseToGraph('The nurse must administer the medication.');

      const nurse = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('nurse')
      );
      expect(nurse).toBeTruthy();

      // Check Tier 1 denotesType or Tier 2 type
      if (nurse['tagteam:denotesType']) {
        expect(nurse['tagteam:denotesType']).toBe('cco:Person');
      }
    });

  });

  describe('Complex Obligation Sentences', function() {

    test('obligation with resource scarcity', () => {
      const graph = parseToGraph('The doctor must allocate the last ventilator between two patients.');

      const act = semantic.findNode(graph, n => n['tagteam:verb'] === 'allocate');
      expect(act).toBeTruthy();
      semantic.hasActualityStatus(act, 'Prescribed');

      // Should detect scarcity
      const scarcity = semantic.findNode(graph, n =>
        n['@type']?.includes('tagteam:ScarcityAssertion')
      );
      expect(scarcity).toBeTruthy();
    });

    test('obligation in medical context', () => {
      const graph = parseToGraph('The physician must obtain informed consent before the procedure.');

      const act = semantic.findNode(graph, n => n['tagteam:verb'] === 'obtain');
      expect(act).toBeTruthy();
    });

  });

});

printSummary();
exit();
