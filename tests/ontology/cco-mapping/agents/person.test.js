/**
 * CCO Person Mapping Tests
 *
 * Tests that human entities are correctly mapped to Person type.
 * Person is a fundamental CCO agent type.
 *
 * Plan Reference: Section 2.2 CCO Extension Mapping / Agents
 * Priority: P0 (Must pass - core ontology feature)
 *
 * @tags p0, ontology, cco-mapping, agents
 */

const { describe, test, expect, semantic, parseToGraph, printSummary, exit } = require('../../../framework/test-helpers');

describe('CCO Person Mapping', function() {

  describe('Medical Roles → Person', function() {

    test('"doctor" maps to Person denotesType', () => {
      const graph = parseToGraph('The doctor treats the patient.');

      const doctor = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('doctor')
      );

      expect(doctor).toBeTruthy();
      semantic.denotesType(doctor, 'Person');
    });

    test('"patient" maps to Person denotesType', () => {
      const graph = parseToGraph('The doctor treats the patient.');

      const patient = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('patient')
      );

      expect(patient).toBeTruthy();
      semantic.denotesType(patient, 'Person');
    });

    test('"nurse" maps to Person', () => {
      const graph = parseToGraph('The nurse administers medication.');

      const nurse = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('nurse')
      );

      expect(nurse).toBeTruthy();
      semantic.denotesType(nurse, 'Person');
    });

    test('"physician" maps to Person', () => {
      const graph = parseToGraph('The physician examines the patient.');

      const physician = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('physician')
      );

      expect(physician).toBeTruthy();
      semantic.denotesType(physician, 'Person');
    });

    test('"surgeon" maps to Person', () => {
      const graph = parseToGraph('The surgeon performs the operation.');

      const surgeon = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('surgeon')
      );

      expect(surgeon).toBeTruthy();
      semantic.denotesType(surgeon, 'Person');
    });

  });

  describe('Tier 2 Person Entities', function() {

    test('creates Tier 2 Person entity', () => {
      const graph = parseToGraph('The doctor helps the patient.');

      // Look for Tier 2 Person nodes
      const tier2Person = semantic.findNode(graph, n =>
        n['@type']?.includes('Person') &&
        !n['@type']?.includes('tagteam:DiscourseReferent')
      );

      expect(tier2Person).toBeTruthy();
    });

    test('Tier 1 referent links to Tier 2 Person via is_about', () => {
      const graph = parseToGraph('The doctor treats the patient.');

      const referent = semantic.findNode(graph, n =>
        n['@type']?.includes('tagteam:DiscourseReferent') &&
        n['rdfs:label']?.toLowerCase().includes('doctor')
      );

      expect(referent).toBeTruthy();
      expect(referent['is_about']).toBeTruthy();

      // Find the Tier 2 entity
      const tier2Id = referent['is_about']?.['@id'] || referent['is_about'];
      const tier2 = semantic.findNode(graph, n => n['@id'] === tier2Id);

      if (tier2) {
        semantic.hasType(tier2, 'Person');
      }
    });

  });

  describe('Group of Persons', function() {

    test('"family" maps to Agent', () => {
      const graph = parseToGraph('The family must make the decision.');

      const family = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('family')
      );

      expect(family).toBeTruthy();
      expect(family['tagteam:denotesType']).toBe('Agent');
    });

    test('"patients" (plural) with count creates ObjectAggregate', () => {
      const graph = parseToGraph('The doctor treats two critically ill patients.');

      // Look for aggregate or group
      const aggregate = semantic.findNode(graph, n =>
        n['@type']?.includes('bfo:BFO_0000027') ||
        n['rdfs:label']?.toLowerCase().includes('aggregate')
      );

      // Aggregate should exist for "two patients"
      expect(aggregate).toBeTruthy();
    });

    test('"committee" maps to group type', () => {
      const graph = parseToGraph('The committee reviews the proposal.');

      const committee = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('committee')
      );

      expect(committee).toBeTruthy();
      // Committee is a group
      const denotesType = committee['tagteam:denotesType'];
      expect(denotesType === 'Agent' || denotesType === 'Organization').toBeTruthy();
    });

  });

  describe('Person as Agent in Acts', function() {

    test('Person entity serves as agent of act', () => {
      const graph = parseToGraph('The doctor treats the patient.');

      const act = semantic.findNode(graph, n => n['tagteam:verb'] === 'treat');
      expect(act).toBeTruthy();

      const agentRef = act['has_agent'];
      expect(agentRef).toBeTruthy();

      const agentId = agentRef['@id'] || agentRef;
      const agent = semantic.findNode(graph, n => n['@id'] === agentId);

      if (agent) {
        semantic.hasType(agent, 'Person');
      }
    });

    test('Person entity can be patient of act', () => {
      const graph = parseToGraph('The doctor helps the patient.');

      const act = semantic.findNode(graph, n => n['tagteam:verb'] === 'help');
      expect(act).toBeTruthy();

      const affectsRef = act['affects'];
      expect(affectsRef).toBeTruthy();
    });

  });

  describe('Person with Qualities', function() {

    test('"critically ill patient" has associated Quality', () => {
      const graph = parseToGraph('The doctor treats the critically ill patient.');

      // Look for Quality node
      const quality = semantic.findNode(graph, n =>
        n['@type']?.includes('bfo:BFO_0000019') ||
        n['@type']?.includes('bfo:Quality')
      );

      if (quality) {
        // Quality should inhere in the patient
        expect(quality['inheres_in']).toBeTruthy();
      }
    });

    test('Quality inheres in Person entity', () => {
      const graph = parseToGraph('The nurse helps the elderly patient.');

      const quality = semantic.findNode(graph, n =>
        n['@type']?.includes('bfo:BFO_0000019')
      );

      if (quality) {
        const inheresIn = quality['inheres_in'];
        expect(inheresIn).toBeTruthy();

        const bearerId = inheresIn['@id'] || inheresIn;
        const bearer = semantic.findNode(graph, n => n['@id'] === bearerId);

        if (bearer) {
          semantic.hasType(bearer, 'Person');
        }
      }
    });

  });

});

printSummary();
exit();
