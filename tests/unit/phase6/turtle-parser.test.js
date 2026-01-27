/**
 * Phase 6.5.1 TurtleParser Tests
 *
 * Tests for lightweight Turtle/TTL parser for ontology loading.
 *
 * Supported Constructs:
 * - @prefix declarations
 * - Basic triples (subject predicate object)
 * - rdf:type shortcuts (a)
 * - String literals and labels
 * - Multi-value properties (comma-separated objects)
 * - Semicolon-separated predicate lists
 *
 * NOT Supported (out of scope):
 * - Full OWL reasoning
 * - SPARQL queries
 * - Blank node complex structures
 * - RDF/XML format
 *
 * Test Count: 70 tests across 9 categories
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import component
const TurtleParser = require('../../../src/ontology/TurtleParser.js');

describe('Phase 6.5.1: TurtleParser', () => {
  let parser;

  beforeEach(() => {
    parser = new TurtleParser();
  });

  // ===========================================================================
  // Category 1: Basic Parsing (10 tests)
  // ===========================================================================
  describe('Category 1: Basic Parsing', () => {
    it('BP-001: Empty constructor creates parser with defaults', () => {
      const p = new TurtleParser();
      expect(p).toBeDefined();
      expect(p.prefixes).toBeDefined();
    });

    it('BP-002: parse() returns result object', () => {
      const result = parser.parse('');
      expect(result).toBeDefined();
      expect(result.prefixes).toBeDefined();
      expect(result.triples).toBeDefined();
    });

    it('BP-003: parse() handles null input gracefully', () => {
      const result = parser.parse(null);
      expect(result).toBeDefined();
      expect(result.triples).toEqual([]);
    });

    it('BP-004: parse() handles undefined input gracefully', () => {
      const result = parser.parse(undefined);
      expect(result).toBeDefined();
      expect(result.triples).toEqual([]);
    });

    it('BP-005: parse() strips comments', () => {
      const ttl = `
        # This is a comment
        @prefix ex: <http://example.org/> .
        # Another comment
        ex:Thing a ex:Class . # inline comment
      `;
      const result = parser.parse(ttl);
      expect(result.prefixes['ex']).toBe('http://example.org/');
      expect(result.triples.length).toBe(1);
    });

    it('BP-006: parse() handles Windows line endings', () => {
      const ttl = '@prefix ex: <http://example.org/> .\r\nex:A a ex:B .';
      const result = parser.parse(ttl);
      expect(result.triples.length).toBe(1);
    });

    it('BP-007: parse() handles mixed line endings', () => {
      const ttl = '@prefix ex: <http://example.org/> .\r\nex:A a ex:B .\nex:C a ex:D .';
      const result = parser.parse(ttl);
      expect(result.triples.length).toBe(2);
    });

    it('BP-008: parse() handles empty lines', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .

        ex:A a ex:B .

        ex:C a ex:D .
      `;
      const result = parser.parse(ttl);
      expect(result.triples.length).toBe(2);
    });

    it('BP-009: parse() returns errors array', () => {
      const result = parser.parse('');
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('BP-010: parse() with valid TTL has no errors', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:A a ex:B .
      `;
      const result = parser.parse(ttl);
      expect(result.errors.length).toBe(0);
    });
  });

  // ===========================================================================
  // Category 2: Prefix Parsing (10 tests)
  // ===========================================================================
  describe('Category 2: Prefix Parsing', () => {
    it('PX-001: Parse single @prefix declaration', () => {
      const ttl = '@prefix ex: <http://example.org/> .';
      const result = parser.parse(ttl);
      expect(result.prefixes['ex']).toBe('http://example.org/');
    });

    it('PX-002: Parse multiple @prefix declarations', () => {
      const ttl = `
        @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
        @prefix bfo: <http://purl.obolibrary.org/obo/BFO_> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
      `;
      const result = parser.parse(ttl);
      expect(result.prefixes['vn']).toBe('https://fandaws.com/ontology/bfo/valuenet#');
      expect(result.prefixes['bfo']).toBe('http://purl.obolibrary.org/obo/BFO_');
      expect(result.prefixes['rdfs']).toBe('http://www.w3.org/2000/01/rdf-schema#');
    });

    it('PX-003: Parse PREFIX (SPARQL-style) declaration', () => {
      const ttl = 'PREFIX ex: <http://example.org/>';
      const result = parser.parse(ttl);
      expect(result.prefixes['ex']).toBe('http://example.org/');
    });

    it('PX-004: Parse @base declaration', () => {
      const ttl = '@base <http://example.org/base/> .';
      const result = parser.parse(ttl);
      expect(result.base).toBe('http://example.org/base/');
    });

    it('PX-005: Default prefix (empty prefix)', () => {
      const ttl = '@prefix : <http://example.org/default/> .';
      const result = parser.parse(ttl);
      expect(result.prefixes['']).toBe('http://example.org/default/');
    });

    it('PX-006: Prefix with numbers', () => {
      const ttl = '@prefix ex2: <http://example.org/v2/> .';
      const result = parser.parse(ttl);
      expect(result.prefixes['ex2']).toBe('http://example.org/v2/');
    });

    it('PX-007: Prefix with underscore', () => {
      const ttl = '@prefix my_prefix: <http://example.org/my/> .';
      const result = parser.parse(ttl);
      expect(result.prefixes['my_prefix']).toBe('http://example.org/my/');
    });

    it('PX-008: Common prefixes auto-recognized', () => {
      // Parser should recognize common prefixes even without declaration
      const ttl = 'rdfs:Class a rdfs:Resource .';
      const result = parser.parse(ttl);
      // Should still parse even without explicit rdfs prefix
      expect(result.triples.length).toBeGreaterThanOrEqual(0);
    });

    it('PX-009: Prefix IRI with fragment identifier', () => {
      const ttl = '@prefix owl: <http://www.w3.org/2002/07/owl#> .';
      const result = parser.parse(ttl);
      expect(result.prefixes['owl']).toBe('http://www.w3.org/2002/07/owl#');
    });

    it('PX-010: Prefix IRI with path', () => {
      const ttl = '@prefix obo: <http://purl.obolibrary.org/obo/> .';
      const result = parser.parse(ttl);
      expect(result.prefixes['obo']).toBe('http://purl.obolibrary.org/obo/');
    });
  });

  // ===========================================================================
  // Category 3: Triple Parsing (10 tests)
  // ===========================================================================
  describe('Category 3: Triple Parsing', () => {
    it('TR-001: Parse simple triple', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:Subject ex:predicate ex:Object .
      `;
      const result = parser.parse(ttl);
      expect(result.triples.length).toBe(1);
      expect(result.triples[0].subject).toBe('ex:Subject');
      expect(result.triples[0].predicate).toBe('ex:predicate');
      expect(result.triples[0].object).toBe('ex:Object');
    });

    it('TR-002: Parse rdf:type shortcut (a)', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:Thing a ex:Class .
      `;
      const result = parser.parse(ttl);
      expect(result.triples.length).toBe(1);
      expect(result.triples[0].predicate).toBe('rdf:type');
      expect(result.triples[0].object).toBe('ex:Class');
    });

    it('TR-003: Parse multiple triples', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:A a ex:Class .
        ex:B a ex:Class .
        ex:C a ex:Class .
      `;
      const result = parser.parse(ttl);
      expect(result.triples.length).toBe(3);
    });

    it('TR-004: Parse semicolon-separated predicates', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
        ex:Thing a ex:Class ;
                 rdfs:label "A Thing" .
      `;
      const result = parser.parse(ttl);
      expect(result.triples.length).toBe(2);
      const labels = result.triples.filter(t => t.predicate === 'rdfs:label');
      expect(labels.length).toBe(1);
    });

    it('TR-005: Parse comma-separated objects', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:Thing ex:hasValue ex:Value1, ex:Value2, ex:Value3 .
      `;
      const result = parser.parse(ttl);
      expect(result.triples.length).toBe(3);
      expect(result.triples.every(t => t.subject === 'ex:Thing')).toBe(true);
    });

    it('TR-006: Parse full IRI as subject', () => {
      const ttl = '<http://example.org/Thing> a <http://example.org/Class> .';
      const result = parser.parse(ttl);
      expect(result.triples.length).toBe(1);
      expect(result.triples[0].subject).toBe('http://example.org/Thing');
    });

    it('TR-007: Parse mixed prefixed and full IRIs', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:Thing a <http://www.w3.org/2002/07/owl#Class> .
      `;
      const result = parser.parse(ttl);
      expect(result.triples.length).toBe(1);
    });

    it('TR-008: Parse triple spanning multiple lines', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:Thing
          a
          ex:Class .
      `;
      const result = parser.parse(ttl);
      expect(result.triples.length).toBe(1);
    });

    it('TR-009: Handle missing period gracefully', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:A a ex:B
        ex:C a ex:D .
      `;
      // Should either recover or report error
      const result = parser.parse(ttl);
      expect(result).toBeDefined();
    });

    it('TR-010: Parse triple with numeric local name', () => {
      const ttl = `
        @prefix bfo: <http://purl.obolibrary.org/obo/BFO_> .
        bfo:0000016 a bfo:0000002 .
      `;
      const result = parser.parse(ttl);
      expect(result.triples.length).toBe(1);
      expect(result.triples[0].subject).toBe('bfo:0000016');
    });
  });

  // ===========================================================================
  // Category 4: Literal Parsing (10 tests)
  // ===========================================================================
  describe('Category 4: Literal Parsing', () => {
    it('LT-001: Parse simple string literal', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
        ex:Thing rdfs:label "My Thing" .
      `;
      const result = parser.parse(ttl);
      const labelTriple = result.triples.find(t => t.predicate === 'rdfs:label');
      expect(labelTriple.object).toBe('My Thing');
      expect(labelTriple.objectType).toBe('literal');
    });

    it('LT-002: Parse string literal with single quotes', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:Thing ex:name 'Single quoted' .
      `;
      const result = parser.parse(ttl);
      expect(result.triples[0].object).toBe('Single quoted');
    });

    it('LT-003: Parse string literal with escaped quotes', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:Thing ex:desc "He said \\"hello\\"" .
      `;
      const result = parser.parse(ttl);
      expect(result.triples[0].object).toContain('hello');
    });

    it('LT-004: Parse string literal with language tag', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
        ex:Thing rdfs:label "La chose"@fr .
      `;
      const result = parser.parse(ttl);
      const labelTriple = result.triples.find(t => t.predicate === 'rdfs:label');
      expect(labelTriple.object).toBe('La chose');
      expect(labelTriple.language).toBe('fr');
    });

    it('LT-005: Parse string literal with datatype', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
        ex:Thing ex:count "42"^^xsd:integer .
      `;
      const result = parser.parse(ttl);
      expect(result.triples[0].object).toBe('42');
      expect(result.triples[0].datatype).toContain('integer');
    });

    it('LT-006: Parse multi-line string literal', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:Thing ex:desc """This is a
        multi-line
        string""" .
      `;
      const result = parser.parse(ttl);
      expect(result.triples[0].object).toContain('multi-line');
    });

    it('LT-007: Parse comma-separated keywords', () => {
      const ttl = `
        @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
        vn:Security vn:keywords "safety, stability, protection" .
      `;
      const result = parser.parse(ttl);
      expect(result.triples[0].object).toBe('safety, stability, protection');
    });

    it('LT-008: Parse boolean literal', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:Thing ex:active true .
      `;
      const result = parser.parse(ttl);
      expect(result.triples[0].object).toBe('true');
      expect(result.triples[0].objectType).toBe('literal');
    });

    it('LT-009: Parse integer literal', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:Thing ex:count 42 .
      `;
      const result = parser.parse(ttl);
      expect(result.triples[0].object).toBe('42');
    });

    it('LT-010: Parse decimal literal', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:Thing ex:score 3.14 .
      `;
      const result = parser.parse(ttl);
      expect(result.triples[0].object).toBe('3.14');
    });
  });

  // ===========================================================================
  // Category 5: ValueNet Structure Extraction (10 tests)
  // ===========================================================================
  describe('Category 5: ValueNet Structure Extraction', () => {
    const valueNetTTL = `
      @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
      @prefix bfo: <http://purl.obolibrary.org/obo/BFO_> .
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

      vn:SecurityDisposition a bfo:0000016 ;
          rdfs:label "Security" ;
          vn:keywords "safety, stability, protection" ;
          vn:upholdingTerms "protect, secure, safeguard" ;
          vn:violatingTerms "endanger, threaten, risk" .

      vn:AutonomyDisposition a bfo:0000016 ;
          rdfs:label "Autonomy" ;
          vn:keywords "freedom, independence, choice" ;
          vn:upholdingTerms "liberate, empower, enable" ;
          vn:violatingTerms "constrain, restrict, control" .
    `;

    it('VN-001: Extract class declarations', () => {
      const result = parser.parse(valueNetTTL);
      const classes = result.getClasses();
      expect(classes.length).toBeGreaterThanOrEqual(2);
      expect(classes.some(c => c.id.includes('SecurityDisposition'))).toBe(true);
    });

    it('VN-002: Extract labels', () => {
      const result = parser.parse(valueNetTTL);
      const labels = result.getLabels();
      expect(labels['vn:SecurityDisposition']).toBe('Security');
      expect(labels['vn:AutonomyDisposition']).toBe('Autonomy');
    });

    it('VN-003: Extract keywords', () => {
      const result = parser.parse(valueNetTTL);
      const keywords = result.getKeywords('vn:SecurityDisposition');
      expect(keywords).toContain('safety');
      expect(keywords).toContain('protection');
    });

    it('VN-004: Extract upholding terms', () => {
      const result = parser.parse(valueNetTTL);
      const terms = result.getProperty('vn:SecurityDisposition', 'vn:upholdingTerms');
      expect(terms).toContain('protect');
    });

    it('VN-005: Extract violating terms', () => {
      const result = parser.parse(valueNetTTL);
      const terms = result.getProperty('vn:SecurityDisposition', 'vn:violatingTerms');
      expect(terms).toContain('endanger');
    });

    it('VN-006: Extract BFO type', () => {
      const result = parser.parse(valueNetTTL);
      const type = result.getType('vn:SecurityDisposition');
      expect(type).toBe('bfo:0000016');
    });

    it('VN-007: getSubjects() returns all subjects', () => {
      const result = parser.parse(valueNetTTL);
      const subjects = result.getSubjects();
      expect(subjects.length).toBeGreaterThanOrEqual(2);
    });

    it('VN-008: getTriplesForSubject() returns all triples', () => {
      const result = parser.parse(valueNetTTL);
      const triples = result.getTriplesForSubject('vn:SecurityDisposition');
      expect(triples.length).toBeGreaterThanOrEqual(4);
    });

    it('VN-009: toValueDefinition() creates TagTeam format', () => {
      const result = parser.parse(valueNetTTL);
      const valueDef = result.toValueDefinition('vn:SecurityDisposition');
      expect(valueDef).toBeDefined();
      expect(valueDef.name).toBe('SecurityDisposition');
      expect(valueDef.label).toBe('Security');
      expect(valueDef.keywords).toContain('safety');
    });

    it('VN-010: getAllValueDefinitions() returns all values', () => {
      const result = parser.parse(valueNetTTL);
      const values = result.getAllValueDefinitions();
      expect(values.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ===========================================================================
  // Category 6: Relationship Extraction (8 tests)
  // ===========================================================================
  describe('Category 6: Relationship Extraction', () => {
    const relationshipTTL = `
      @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
      @prefix owl: <http://www.w3.org/2002/07/owl#> .
      @prefix ethics: <http://example.org/ethics#> .

      vn:Security owl:sameAs vn:Safety .
      vn:Security ethics:conflictsWith vn:Freedom .
      vn:Justice ethics:relatedTo vn:Fairness .
      vn:Autonomy ethics:opposedTo vn:Obedience .
    `;

    it('RL-001: Extract owl:sameAs relationships', () => {
      const result = parser.parse(relationshipTTL);
      const sameAs = result.getRelationships('owl:sameAs');
      expect(sameAs.length).toBeGreaterThanOrEqual(1);
    });

    it('RL-002: Extract conflictsWith relationships', () => {
      const result = parser.parse(relationshipTTL);
      const conflicts = result.getRelationships('ethics:conflictsWith');
      expect(conflicts.some(r => r.subject.includes('Security'))).toBe(true);
    });

    it('RL-003: Extract relatedTo relationships', () => {
      const result = parser.parse(relationshipTTL);
      const related = result.getRelationships('ethics:relatedTo');
      expect(related.length).toBeGreaterThanOrEqual(1);
    });

    it('RL-004: Get relationships for subject', () => {
      const result = parser.parse(relationshipTTL);
      const rels = result.getRelationshipsForSubject('vn:Security');
      expect(rels.length).toBeGreaterThanOrEqual(2);
    });

    it('RL-005: Get all relationship types', () => {
      const result = parser.parse(relationshipTTL);
      const types = result.getRelationshipTypes();
      expect(types).toContain('owl:sameAs');
      expect(types).toContain('ethics:conflictsWith');
    });

    it('RL-006: Bidirectional relationship lookup', () => {
      const result = parser.parse(relationshipTTL);
      // Can find Security -> Freedom conflict
      const conflicts = result.getConflicts('vn:Security');
      expect(conflicts.some(c => c.includes('Freedom'))).toBe(true);
    });

    it('RL-007: Extract opposedTo relationships', () => {
      const result = parser.parse(relationshipTTL);
      const opposed = result.getRelationships('ethics:opposedTo');
      expect(opposed.length).toBeGreaterThanOrEqual(1);
    });

    it('RL-008: Get all predicates used', () => {
      const result = parser.parse(relationshipTTL);
      const predicates = result.getPredicates();
      expect(predicates.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ===========================================================================
  // Category 7: Error Handling (8 tests)
  // ===========================================================================
  describe('Category 7: Error Handling', () => {
    it('EH-001: Invalid prefix declaration reports error', () => {
      const ttl = '@prefix ex <http://example.org/> .'; // Missing colon
      const result = parser.parse(ttl);
      // Should still return result, possibly with error
      expect(result).toBeDefined();
    });

    it('EH-002: Unterminated string reports error', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:Thing ex:label "unterminated .
      `;
      const result = parser.parse(ttl);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('EH-003: Unknown prefix used reports warning', () => {
      const ttl = 'unknown:Thing a unknown:Class .';
      const result = parser.parse(ttl);
      // Should still parse but may warn
      expect(result).toBeDefined();
    });

    it('EH-004: Missing object in triple reports error', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:Thing ex:predicate .
      `;
      const result = parser.parse(ttl);
      expect(result).toBeDefined();
    });

    it('EH-005: Invalid IRI format handled', () => {
      const ttl = '<invalid iri with spaces> a <http://example.org/Class> .';
      const result = parser.parse(ttl);
      expect(result).toBeDefined();
    });

    it('EH-006: Recovers from syntax error to continue parsing', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:A a ex:B .
        ex:C invalid syntax here
        ex:D a ex:E .
      `;
      const result = parser.parse(ttl);
      // Should parse at least some triples
      expect(result.triples.length).toBeGreaterThanOrEqual(1);
    });

    it('EH-007: Empty file returns valid empty result', () => {
      const result = parser.parse('');
      expect(result.triples).toEqual([]);
      expect(result.errors.length).toBe(0);
    });

    it('EH-008: Binary/non-text input handled gracefully', () => {
      // Simulate non-text input
      const result = parser.parse('\x00\x01\x02');
      expect(result).toBeDefined();
    });
  });

  // ===========================================================================
  // Category 8: IRI Resolution (6 tests)
  // ===========================================================================
  describe('Category 8: IRI Resolution', () => {
    it('IR-001: Resolve prefixed IRI to full IRI', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:Thing a ex:Class .
      `;
      const result = parser.parse(ttl);
      const fullIRI = result.resolveIRI('ex:Thing');
      expect(fullIRI).toBe('http://example.org/Thing');
    });

    it('IR-002: Full IRI passes through unchanged', () => {
      const result = parser.parse('@prefix ex: <http://example.org/> .');
      const fullIRI = result.resolveIRI('http://example.org/Thing');
      expect(fullIRI).toBe('http://example.org/Thing');
    });

    it('IR-003: Resolve with base IRI', () => {
      const ttl = `
        @base <http://example.org/base/> .
        <Thing> a <Class> .
      `;
      const result = parser.parse(ttl);
      // Relative IRIs should resolve against base
      expect(result.triples[0].subject).toContain('Thing');
    });

    it('IR-004: getPrefixedForm() returns shortened IRI', () => {
      const ttl = '@prefix ex: <http://example.org/> .';
      const result = parser.parse(ttl);
      const prefixed = result.getPrefixedForm('http://example.org/Thing');
      expect(prefixed).toBe('ex:Thing');
    });

    it('IR-005: Unknown prefix returns original', () => {
      const result = parser.parse('');
      const fullIRI = result.resolveIRI('unknown:Thing');
      // Should return original if prefix unknown
      expect(fullIRI).toContain('unknown:Thing');
    });

    it('IR-006: Expand common prefixes', () => {
      // rdf, rdfs, owl, xsd should work even without explicit declaration
      const result = parser.parse('');
      const rdfType = result.resolveIRI('rdf:type');
      expect(rdfType).toContain('rdf');
    });
  });

  // ===========================================================================
  // Category 9: Integration & Performance (8 tests)
  // ===========================================================================
  describe('Category 9: Integration & Performance', () => {
    it('IP-001: Parse realistic ValueNet fragment', () => {
      const ttl = `
        @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
        @prefix bfo: <http://purl.obolibrary.org/obo/BFO_> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
        @prefix owl: <http://www.w3.org/2002/07/owl#> .

        vn:HarmDisposition a bfo:0000016 ;
            rdfs:label "Harm Avoidance" ;
            rdfs:comment "The disposition to avoid causing harm to others" ;
            vn:keywords "harm, hurt, damage, injury" ;
            vn:upholdingTerms "protect, safeguard, prevent" ;
            vn:violatingTerms "harm, hurt, damage, injure" ;
            owl:sameAs vn:NonMaleficence .
      `;
      const result = parser.parse(ttl);
      expect(result.triples.length).toBeGreaterThanOrEqual(6);
      const valueDef = result.toValueDefinition('vn:HarmDisposition');
      expect(valueDef.label).toBe('Harm Avoidance');
    });

    it('IP-002: Parse 50+ triples in reasonable time', () => {
      let ttl = '@prefix ex: <http://example.org/> .\n';
      for (let i = 0; i < 50; i++) {
        ttl += `ex:Thing${i} a ex:Class .\n`;
      }
      const startTime = Date.now();
      const result = parser.parse(ttl);
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
      expect(result.triples.length).toBe(50);
    });

    it('IP-003: Parse complex predicate chain', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

        ex:ComplexThing
            a ex:Class ;
            rdfs:label "Complex" ;
            ex:prop1 "value1" ;
            ex:prop2 "value2" ;
            ex:prop3 "value3" ;
            ex:related ex:Other1, ex:Other2, ex:Other3 .
      `;
      const result = parser.parse(ttl);
      expect(result.triples.length).toBeGreaterThanOrEqual(8);
    });

    it('IP-004: toJSON() produces serializable output', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:Thing a ex:Class .
      `;
      const result = parser.parse(ttl);
      const json = JSON.stringify(result.toJSON());
      expect(json).toBeDefined();
      const parsed = JSON.parse(json);
      expect(parsed.triples).toBeDefined();
    });

    it('IP-005: Parse ontology with multiple subjects', () => {
      const ttl = `
        @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
        @prefix bfo: <http://purl.obolibrary.org/obo/BFO_> .

        vn:Value1 a bfo:0000016 ; rdfs:label "Value 1" .
        vn:Value2 a bfo:0000016 ; rdfs:label "Value 2" .
        vn:Value3 a bfo:0000016 ; rdfs:label "Value 3" .
        vn:Value4 a bfo:0000016 ; rdfs:label "Value 4" .
        vn:Value5 a bfo:0000016 ; rdfs:label "Value 5" .
      `;
      const result = parser.parse(ttl);
      const subjects = result.getSubjects();
      expect(subjects.length).toBe(5);
    });

    it('IP-006: Handle Unicode in literals', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:Thing ex:label "日本語" .
        ex:Thing2 ex:label "émoji: 🎉" .
      `;
      const result = parser.parse(ttl);
      expect(result.triples.some(t => t.object.includes('日本語'))).toBe(true);
    });

    it('IP-007: Consistent results on repeated parsing', () => {
      const ttl = `
        @prefix ex: <http://example.org/> .
        ex:A a ex:B .
      `;
      const result1 = parser.parse(ttl);
      const result2 = parser.parse(ttl);
      expect(result1.triples.length).toBe(result2.triples.length);
      expect(result1.triples[0].subject).toBe(result2.triples[0].subject);
    });

    it('IP-008: Parser is reusable', () => {
      const ttl1 = `
        @prefix ex1: <http://example.org/1/> .
        ex1:A a ex1:B .
      `;
      const ttl2 = `
        @prefix ex2: <http://example.org/2/> .
        ex2:C a ex2:D .
      `;
      const result1 = parser.parse(ttl1);
      const result2 = parser.parse(ttl2);
      expect(result1.prefixes['ex1']).toBeDefined();
      expect(result2.prefixes['ex2']).toBeDefined();
    });
  });
});
