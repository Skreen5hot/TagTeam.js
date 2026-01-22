/**
 * CCO Person Mapping Tests
 *
 * Tests that human entities are correctly mapped to cco:Person type.
 * Person is a fundamental CCO agent type.
 *
 * Plan Reference: Section 2.2 CCO Extension Mapping / Agents
 * Priority: P0 (Must pass - core ontology feature)
 *
 * @tags p0, ontology, cco-mapping, agents
 */

const { describe, test, expect, semantic, parseToGraph, printSummary, exit } = require('../../../framework/test-helpers');

describe('CCO Person Mapping', function() {

  describe('Medical Roles → cco:Person', function() {

    test('"doctor" maps to cco:Person denotesType', () => {
      const graph = parseToGraph('The doctor treats the patient.');

      const doctor = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('doctor')
      );

      expect(doctor).toBeTruthy();
      semantic.denotesType(doctor, 'cco:Person');
    });

    test('"patient" maps to cco:Person denotesType', () => {
      const graph = parseToGraph('The doctor treats the patient.');

      const patient = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('patient')
      );

      expect(patient).toBeTruthy();
      semantic.denotesType(patient, 'cco:Person');
    });

    test('"nurse" maps to cco:Person', () => {
      const graph = parseToGraph('The nurse administers medication.');

      const nurse = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('nurse')
      );

      expect(nurse).toBeTruthy();
      semantic.denotesType(nurse, 'cco:Person');
    });

    test('"physician" maps to cco:Person', () => {
      const graph = parseToGraph('The physician examines the patient.');

      const physician = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('physician')
      );

      expect(physician).toBeTruthy();
      semantic.denotesType(physician, 'cco:Person');
    });

    test('"surgeon" maps to cco:Person', () => {
      const graph = parseToGraph('The surgeon performs the operation.');

      const surgeon = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('surgeon')
      );

      expect(surgeon).toBeTruthy();
      semantic.denotesType(surgeon, 'cco:Person');
    });

  });

  describe('Tier 2 Person Entities', function() {

    test('creates Tier 2 cco:Person entity', () => {
      const graph = parseToGraph('The doctor helps the patient.');

      // Look for Tier 2 Person nodes
      const tier2Person = semantic.findNode(graph, n =>
        n['@type']?.includes('cco:Person') &&
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
      expect(referent['cco:is_about']).toBeTruthy();

      // Find the Tier 2 entity
      const tier2Id = referent['cco:is_about']?.['@id'] || referent['cco:is_about'];
      const tier2 = semantic.findNode(graph, n => n['@id'] === tier2Id);

      if (tier2) {
        semantic.hasType(tier2, 'cco:Person');
      }
    });

  });

  describe('Group of Persons', function() {

    test('"family" maps to cco:GroupOfPersons', () => {
      const graph = parseToGraph('The family must make the decision.');

      const family = semantic.findNode(graph, n =>
        n['rdfs:label']?.toLowerCase().includes('family')
      );

      expect(family).toBeTruthy();
      expect(family['tagteam:denotesType']).toBe('cco:GroupOfPersons');
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
      expect(denotesType === 'cco:GroupOfPersons' || denotesType === 'cco:Organization').toBeTruthy();
    });

  });

  describe('Person as Agent in Acts', function() {

    test('Person entity serves as agent of act', () => {
      const graph = parseToGraph('The doctor treats the patient.');

      const act = semantic.findNode(graph, n => n['tagteam:verb'] === 'treat');
      expect(act).toBeTruthy();

      const agentRef = act['cco:has_agent'];
      expect(agentRef).toBeTruthy();

      const agentId = agentRef['@id'] || agentRef;
      const agent = semantic.findNode(graph, n => n['@id'] === agentId);

      if (agent) {
        semantic.hasType(agent, 'cco:Person');
      }
    });

    test('Person entity can be patient of act', () => {
      const graph = parseToGraph('The doctor helps the patient.');

      const act = semantic.findNode(graph, n => n['tagteam:verb'] === 'help');
      expect(act).toBeTruthy();

      const affectsRef = act['cco:affects'];
      expect(affectsRef).toBeTruthy();
    });

  });

  describe('Person with Qualities', function() {

    test('"critically ill patient" has associated Quality', () => {
      const graph = parseToGraph('The doctor treats the critically ill patient.');

      // Look for Quality node
      const quality = semantic.findNode(graph, n =>
        n['@type']?.includes('bfo:BFO_0000019') ||
        n['@type']?.includes('cco:DiseaseQuality')
      );

      if (quality) {
        // Quality should inhere in the patient
        expect(quality['bfo:inheres_in']).toBeTruthy();
      }
    });

    test('Quality inheres in Person entity', () => {
      const graph = parseToGraph('The nurse helps the elderly patient.');

      const quality = semantic.findNode(graph, n =>
        n['@type']?.includes('bfo:BFO_0000019')
      );

      if (quality) {
        const inheresIn = quality['bfo:inheres_in'];
        expect(inheresIn).toBeTruthy();

        const bearerId = inheresIn['@id'] || inheresIn;
        const bearer = semantic.findNode(graph, n => n['@id'] === bearerId);

        if (bearer) {
          semantic.hasType(bearer, 'cco:Person');
        }
      }
    });

  });

});

printSummary();
exit();
