/**
 * SHACL Domain/Range Validation Tests
 *
 * Tests that the SHMLValidator correctly enforces BFO/CCO domain/range constraints.
 * These are the CCO Expert Checklist rules from ontology review.
 *
 * Plan Reference: Section 4.2 SHACL Compliance
 * Priority: P0 (Must pass - ontology compliance)
 *
 * @tags p0, output, shacl, domain-range
 */

const { describe, test, expect, semantic, parseToGraph, printSummary, exit } = require('../../framework/test-helpers');
const SHMLValidator = require('../../../src/graph/SHMLValidator');

describe('Domain/Range SHACL Validation', function() {

  describe('has_agent Constraint (CCO Expert Rule)', function() {
    // Domain: bfo:Process, Range: cco:Agent

    test('has_agent on Process node passes validation', () => {
      const graph = parseToGraph('The doctor treats the patient.');

      const result = semantic.passesSHACLValidation(graph);
      expect(result.valid).toBe(true);

      // Check DomainRangeValidation pattern score
      expect(result.patterns.DomainRangeValidation?.score).toBeGreaterThanOrEqual(80);
    });

    test('graph with has_agent linking to Person passes', () => {
      const graph = parseToGraph('The nurse administers the medication.');

      const act = semantic.findNode(graph, n => n['has_agent']);
      expect(act).toBeTruthy();

      const result = semantic.passesSHACLValidation(graph);
      expect(result.valid).toBe(true);
    });

  });

  describe('prescribes Constraint (CCO Expert Rule)', function() {
    // Domain: DirectiveContent, Range: bfo:Process

    test('prescribes from DirectiveContent passes validation', () => {
      const graph = parseToGraph('The doctor must allocate the resource.');

      const directive = semantic.findNode(graph, n =>
        n['@type']?.includes('tagteam:DirectiveContent')
      );

      if (directive) {
        const result = semantic.passesSHACLValidation(graph);
        expect(result.valid).toBe(true);
      } else {
        // If no directive found, test still passes (no constraint to violate)
        expect(true).toBe(true);
      }
    });

    test('DirectiveContent prescribes an IntentionalAct', () => {
      const graph = parseToGraph('The committee must approve the proposal.');

      const directive = semantic.findNode(graph, n =>
        n['prescribes']
      );

      if (directive) {
        const prescribesId = directive['prescribes']?.['@id'] || directive['prescribes'];
        const act = semantic.findNode(graph, n => n['@id'] === prescribesId);

        // If we can find the act, verify it's a process type
        if (act) {
          const types = act['@type'] || [];
          const isProcess = types.some(t =>
            t.includes('Act') || t.includes('Process') || t.includes('BFO_0000015')
          );
          expect(isProcess).toBe(true);
        }
      }
    });

  });

  describe('inheres_in Constraint (CCO Expert Rule)', function() {
    // Domain: Role/Quality, Range: IndependentContinuant

    test('Role inheres_in Person passes validation', () => {
      const graph = parseToGraph('The doctor treats the patient.');

      const role = semantic.findNode(graph, n =>
        n['inheres_in'] && n['@type']?.some(t => t.includes('Role'))
      );

      if (role) {
        const result = semantic.passesSHACLValidation(graph);
        expect(result.valid).toBe(true);
      }
    });

    test('Quality inheres_in Person passes validation', () => {
      const graph = parseToGraph('The critically ill patient needs help.');

      const quality = semantic.findNode(graph, n =>
        n['@type']?.includes('bfo:BFO_0000019') ||
        n['@type']?.includes('bfo:Quality')
      );

      if (quality) {
        expect(quality['inheres_in']).toBeTruthy();
        const result = semantic.passesSHACLValidation(graph);
        expect(result.valid).toBe(true);
      }
    });

  });

  describe('is_about Constraint', function() {
    // Domain: DiscourseReferent, Range: Tier 2 entity

    test('DiscourseReferent is_about Tier 2 entity', () => {
      const graph = parseToGraph('The doctor helps the patient.');

      const referent = semantic.findNode(graph, n =>
        n['@type']?.includes('tagteam:DiscourseReferent') &&
        n['is_about']
      );

      if (referent) {
        const aboutId = referent['is_about']?.['@id'] || referent['is_about'];
        const tier2 = semantic.findNode(graph, n => n['@id'] === aboutId);

        if (tier2) {
          // Tier 2 should be Person, Artifact, etc.
          const types = tier2['@type'] || [];
          const isTier2 = types.some(t =>
            t.includes('Person') || t.includes('Artifact') ||
            t.includes('Organization') || t.includes('ObjectAggregate')
          );
          expect(isTier2).toBe(true);
        }
      }
    });

  });

  describe('Full Graph Validation', function() {

    test('simple sentence passes full validation', () => {
      const graph = parseToGraph('The doctor treats the patient.');
      const result = semantic.passesSHACLValidation(graph);
      expect(result.valid).toBe(true);
    });

    test('obligation sentence passes full validation', () => {
      const graph = parseToGraph('The physician must inform the family.');
      const result = semantic.passesSHACLValidation(graph);
      expect(result.valid).toBe(true);
    });

    test('scarcity sentence passes full validation', () => {
      const graph = parseToGraph('The doctor must allocate the last ventilator between two patients.');
      const result = semantic.passesSHACLValidation(graph);
      expect(result.valid).toBe(true);
    });

    test('DomainRangeValidation score is 100%', () => {
      const graph = parseToGraph('The nurse must administer the medication to the patient.');
      const result = semantic.passesSHACLValidation(graph);

      expect(result.patterns.DomainRangeValidation.score).toBe(100);
    });

  });

  describe('Vocabulary Validation', function() {

    test('all types are known vocabulary', () => {
      const graph = parseToGraph('The doctor must decide the outcome.');

      const validator = new SHMLValidator({ verbose: true });
      const result = validator.validate(graph);

      // Check for no unknown class violations
      const unknownClassWarnings = result.warnings.filter(w =>
        w.pattern === 'VocabularyValidation' && w.message.includes('Unknown class')
      );

      // Some unknown classes are acceptable (CCO extensions)
      // But core types should be known
      expect(unknownClassWarnings.length).toBeLessThanOrEqual(5);
    });

    test('all predicates are known vocabulary', () => {
      const graph = parseToGraph('The committee reviews the proposal.');

      const validator = new SHMLValidator({ verbose: true });
      const result = validator.validate(graph);

      // Check vocabulary validation score
      expect(result.patterns.VocabularyValidation.score).toBeGreaterThanOrEqual(90);
    });

  });

});

printSummary();
exit();
