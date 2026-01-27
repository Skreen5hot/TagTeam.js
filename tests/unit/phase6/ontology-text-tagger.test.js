/**
 * Phase 6.6 - OntologyTextTagger Test Suite
 *
 * Tests the general-purpose ontology-driven text tagging system,
 * including PropertyMapper and OntologyTextTagger.
 *
 * Test IDs: OTT-001 through OTT-060
 */

const OntologyTextTagger = require('../../../src/ontology/OntologyTextTagger.js');
const PropertyMapper = require('../../../src/ontology/PropertyMapper.js');
const TurtleParser = require('../../../src/ontology/TurtleParser.js');

// =============================================================================
// Test Ontologies
// =============================================================================

const MEDICAL_TTL = `
@prefix med: <https://example.org/medical#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix bfo: <http://purl.obolibrary.org/obo/BFO_> .

med:CardiovascularDisease a bfo:0000016 ;
    rdfs:label "Cardiovascular Disease" ;
    med:indicators "chest pain, shortness of breath, heart attack, stroke, hypertension" ;
    med:icdCode "I00-I99" ;
    med:riskFactors "smoking, obesity, diabetes, high cholesterol" ;
    med:category med:ChronicDisease .

med:RespiratoryInfection a bfo:0000016 ;
    rdfs:label "Respiratory Infection" ;
    med:indicators "cough, fever, congestion, pneumonia, bronchitis" ;
    med:icdCode "J00-J99" ;
    med:category med:AcuteDisease .

med:Diabetes a bfo:0000016 ;
    rdfs:label "Diabetes" ;
    med:indicators "blood sugar, insulin, glucose, thirst, fatigue" ;
    med:icdCode "E08-E13" ;
    med:riskFactors "obesity, sedentary, genetics" ;
    med:category med:ChronicDisease .
`;

const LEGAL_TTL = `
@prefix legal: <https://example.org/legal#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

legal:ContractBreach a legal:LegalConcept ;
    rdfs:label "Breach of Contract" ;
    legal:searchTerms "breach, violated agreement, failed to perform, non-performance" ;
    legal:positiveResolution "cure, remedy, settlement, mediation" ;
    legal:negativeOutcome "damages, penalty, termination, liability" ;
    legal:jurisdiction "common-law" ;
    legal:category legal:ContractLaw .

legal:Negligence a legal:LegalConcept ;
    rdfs:label "Negligence" ;
    legal:searchTerms "negligence, duty of care, reasonable person, careless" ;
    legal:positiveResolution "settlement, compensation" ;
    legal:negativeOutcome "damages, injury, harm" ;
    legal:jurisdiction "common-law" ;
    legal:category legal:TortLaw .
`;

const ENV_TTL = `
@prefix env: <https://example.org/environmental#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

env:WaterPollution a env:EnvironmentalHazard ;
    rdfs:label "Water Pollution" ;
    env:keywords "discharge, effluent, contamination, river, groundwater" ;
    env:category env:PollutionType .

env:AirPollution a env:EnvironmentalHazard ;
    rdfs:label "Air Pollution" ;
    env:keywords "emissions, smog, particulate, ozone, exhaust" ;
    env:category env:PollutionType .

env:Deforestation a env:EnvironmentalHazard ;
    rdfs:label "Deforestation" ;
    env:keywords "logging, clear-cut, forest loss, habitat destruction" ;
    env:category env:LandUse .
`;

const SIMPLE_TTL = `
@prefix ex: <https://example.org/test#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

ex:ConceptA a ex:TestClass ;
    rdfs:label "Concept A" ;
    ex:terms "alpha, beta, gamma" .

ex:ConceptB a ex:TestClass ;
    rdfs:label "Concept B" ;
    ex:terms "delta, epsilon" .
`;

const MEDICAL_PROPERTY_MAP = {
  keywords: 'med:indicators',
  category: 'med:category',
  extraProperties: ['med:icdCode', 'med:riskFactors']
};

const LEGAL_PROPERTY_MAP = {
  keywords: 'legal:searchTerms',
  typeFilter: 'legal:LegalConcept',
  upholding: 'legal:positiveResolution',
  violating: 'legal:negativeOutcome',
  category: 'legal:category',
  extraProperties: ['legal:jurisdiction']
};

// =============================================================================
// 1. Constructor & Configuration (8 tests)
// =============================================================================

describe('OntologyTextTagger', () => {
  describe('1. Constructor & Configuration', () => {
    it('OTT-001: requires propertyMap', () => {
      expect(() => new OntologyTextTagger()).toThrow('propertyMap');
    });

    it('OTT-002: requires keywords in propertyMap', () => {
      expect(() => new OntologyTextTagger({ propertyMap: {} })).toThrow('keywords');
    });

    it('OTT-003: constructs with valid propertyMap', () => {
      const tagger = new OntologyTextTagger({
        propertyMap: { keywords: 'ex:terms' }
      });
      expect(tagger).toBeDefined();
      expect(tagger.domain).toBe('custom');
    });

    it('OTT-004: accepts custom domain', () => {
      const tagger = new OntologyTextTagger({
        propertyMap: { keywords: 'ex:terms' },
        domain: 'medical'
      });
      expect(tagger.domain).toBe('medical');
    });

    it('OTT-005: accepts match options', () => {
      const tagger = new OntologyTextTagger({
        propertyMap: { keywords: 'ex:terms' },
        matchOptions: { caseSensitive: true, minKeywordMatches: 2 }
      });
      expect(tagger.matchOptions.caseSensitive).toBe(true);
      expect(tagger.matchOptions.minKeywordMatches).toBe(2);
    });

    it('OTT-006: fromTTL static factory creates loaded tagger', () => {
      const tagger = OntologyTextTagger.fromTTL(SIMPLE_TTL, {
        propertyMap: { keywords: 'ex:terms' }
      });
      expect(tagger.tagDefinitions.length).toBe(2);
    });

    it('OTT-007: fromJSON static factory creates loaded tagger', () => {
      const tagger = OntologyTextTagger.fromJSON({
        classes: [
          { id: 'test:A', name: 'A', label: 'Concept A', keywords: 'foo, bar' },
          { id: 'test:B', name: 'B', label: 'Concept B', keywords: 'baz, qux' }
        ]
      }, {
        propertyMap: { keywords: 'keywords' }
      });
      expect(tagger.tagDefinitions.length).toBe(2);
    });

    it('OTT-008: fromJSON throws without classes array', () => {
      expect(() => OntologyTextTagger.fromJSON({}, {
        propertyMap: { keywords: 'keywords' }
      })).toThrow('classes');
    });
  });

  // ===========================================================================
  // 2. Property Mapping (10 tests)
  // ===========================================================================

  describe('2. Property Mapping', () => {
    it('OTT-010: extracts keywords from mapped property', () => {
      const tagger = OntologyTextTagger.fromTTL(MEDICAL_TTL, {
        propertyMap: MEDICAL_PROPERTY_MAP,
        domain: 'medical'
      });
      const def = tagger.getTagDefinition('med:CardiovascularDisease');
      expect(def).not.toBeNull();
      expect(def.keywords).toContain('chest pain');
      expect(def.keywords).toContain('stroke');
    });

    it('OTT-011: extracts label from rdfs:label', () => {
      const tagger = OntologyTextTagger.fromTTL(MEDICAL_TTL, {
        propertyMap: MEDICAL_PROPERTY_MAP
      });
      const def = tagger.getTagDefinition('med:CardiovascularDisease');
      expect(def.label).toBe('Cardiovascular Disease');
    });

    it('OTT-012: extracts category from mapped property', () => {
      const tagger = OntologyTextTagger.fromTTL(MEDICAL_TTL, {
        propertyMap: MEDICAL_PROPERTY_MAP
      });
      const def = tagger.getTagDefinition('med:CardiovascularDisease');
      expect(def.category).toBe('med:ChronicDisease');
    });

    it('OTT-013: extracts extra properties as metadata', () => {
      const tagger = OntologyTextTagger.fromTTL(MEDICAL_TTL, {
        propertyMap: MEDICAL_PROPERTY_MAP
      });
      const def = tagger.getTagDefinition('med:CardiovascularDisease');
      expect(def.metadata).toBeDefined();
      expect(def.metadata.icdCode).toBe('I00-I99');
      expect(def.metadata.riskFactors).toBeDefined();
    });

    it('OTT-014: applies typeFilter to restrict classes', () => {
      const tagger = OntologyTextTagger.fromTTL(LEGAL_TTL, {
        propertyMap: LEGAL_PROPERTY_MAP
      });
      expect(tagger.tagDefinitions.length).toBe(2);
      // All should be legal:LegalConcept
      for (const def of tagger.tagDefinitions) {
        expect(def.type).toBe('legal:LegalConcept');
      }
    });

    it('OTT-015: typeFilter excludes non-matching types', () => {
      // Use medical TTL but filter for a type that doesn't exist
      const tagger = OntologyTextTagger.fromTTL(MEDICAL_TTL, {
        propertyMap: {
          keywords: 'med:indicators',
          typeFilter: 'med:NonExistentType'
        }
      });
      expect(tagger.tagDefinitions.length).toBe(0);
    });

    it('OTT-016: typeFilter accepts array of types', () => {
      const ttl = `
        @prefix ex: <https://example.org/#> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

        ex:A a ex:TypeOne ; rdfs:label "A" ; ex:kw "alpha" .
        ex:B a ex:TypeTwo ; rdfs:label "B" ; ex:kw "beta" .
        ex:C a ex:TypeThree ; rdfs:label "C" ; ex:kw "gamma" .
      `;
      const tagger = OntologyTextTagger.fromTTL(ttl, {
        propertyMap: {
          keywords: 'ex:kw',
          typeFilter: ['ex:TypeOne', 'ex:TypeTwo']
        }
      });
      expect(tagger.tagDefinitions.length).toBe(2);
    });

    it('OTT-017: extracts upholding/violating terms', () => {
      const tagger = OntologyTextTagger.fromTTL(LEGAL_TTL, {
        propertyMap: LEGAL_PROPERTY_MAP
      });
      const def = tagger.getTagDefinition('legal:ContractBreach');
      expect(def.upholdingTerms).toContain('remedy');
      expect(def.violatingTerms).toContain('damages');
    });

    it('OTT-018: skips subjects without keywords property', () => {
      const ttl = `
        @prefix ex: <https://example.org/#> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

        ex:HasKeywords a ex:Type ; rdfs:label "Has" ; ex:kw "word1, word2" .
        ex:NoKeywords a ex:Type ; rdfs:label "None" .
      `;
      const tagger = OntologyTextTagger.fromTTL(ttl, {
        propertyMap: { keywords: 'ex:kw' }
      });
      expect(tagger.tagDefinitions.length).toBe(1);
      expect(tagger.tagDefinitions[0].label).toBe('Has');
    });

    it('OTT-019: handles missing label gracefully (falls back to name)', () => {
      const ttl = `
        @prefix ex: <https://example.org/#> .
        ex:NoLabel a ex:Type ; ex:kw "something" .
      `;
      const tagger = OntologyTextTagger.fromTTL(ttl, {
        propertyMap: { keywords: 'ex:kw' }
      });
      expect(tagger.tagDefinitions[0].name).toBe('NoLabel');
      expect(tagger.tagDefinitions[0].label).toBe('NoLabel');
    });
  });

  // ===========================================================================
  // 3. Text Tagging (12 tests)
  // ===========================================================================

  describe('3. Text Tagging', () => {
    let medTagger;
    let legalTagger;

    beforeEach(() => {
      medTagger = OntologyTextTagger.fromTTL(MEDICAL_TTL, {
        propertyMap: MEDICAL_PROPERTY_MAP,
        domain: 'medical'
      });
      legalTagger = OntologyTextTagger.fromTTL(LEGAL_TTL, {
        propertyMap: LEGAL_PROPERTY_MAP,
        domain: 'legal'
      });
    });

    it('OTT-020: detects single class in text', () => {
      const tags = medTagger.tagText('Patient has chest pain and shortness of breath.');
      expect(tags.length).toBeGreaterThanOrEqual(1);
      expect(tags[0].class).toBe('med:CardiovascularDisease');
    });

    it('OTT-021: returns evidence array', () => {
      const tags = medTagger.tagText('Patient has chest pain and shortness of breath.');
      const cardio = tags.find(t => t.class === 'med:CardiovascularDisease');
      expect(cardio.evidence).toContain('chest pain');
      expect(cardio.evidence).toContain('shortness of breath');
    });

    it('OTT-022: returns keywordCount', () => {
      const tags = medTagger.tagText('Patient has chest pain and shortness of breath.');
      const cardio = tags.find(t => t.class === 'med:CardiovascularDisease');
      expect(cardio.keywordCount).toBeGreaterThanOrEqual(2);
    });

    it('OTT-023: returns confidence score', () => {
      const tags = medTagger.tagText('Patient has chest pain.');
      const cardio = tags.find(t => t.class === 'med:CardiovascularDisease');
      expect(cardio.confidence).toBeGreaterThan(0);
      expect(cardio.confidence).toBeLessThanOrEqual(1);
    });

    it('OTT-024: detects multiple classes in same text', () => {
      const tags = medTagger.tagText('Patient with chest pain, cough, and high blood sugar levels.');
      expect(tags.length).toBeGreaterThanOrEqual(2);
      const classNames = tags.map(t => t.class);
      expect(classNames).toContain('med:CardiovascularDisease');
    });

    it('OTT-025: returns domain in results', () => {
      const tags = medTagger.tagText('Patient has chest pain.');
      expect(tags[0].domain).toBe('medical');
    });

    it('OTT-026: returns category in results when mapped', () => {
      const tags = medTagger.tagText('Patient has chest pain.');
      const cardio = tags.find(t => t.class === 'med:CardiovascularDisease');
      expect(cardio.category).toBe('med:ChronicDisease');
    });

    it('OTT-027: returns metadata in results when extraProperties mapped', () => {
      const tags = medTagger.tagText('Patient has chest pain.');
      const cardio = tags.find(t => t.class === 'med:CardiovascularDisease');
      expect(cardio.metadata).toBeDefined();
      expect(cardio.metadata.icdCode).toBe('I00-I99');
    });

    it('OTT-028: returns empty array for non-matching text', () => {
      const tags = medTagger.tagText('The weather is sunny today.');
      expect(tags).toEqual([]);
    });

    it('OTT-029: returns empty array for empty/null input', () => {
      expect(medTagger.tagText('')).toEqual([]);
      expect(medTagger.tagText(null)).toEqual([]);
    });

    it('OTT-030: detects polarity from upholding terms', () => {
      const tags = legalTagger.tagText('The breach was resolved through remedy and settlement.');
      const breach = tags.find(t => t.class === 'legal:ContractBreach');
      expect(breach).toBeDefined();
      expect(breach.polarity).toBe(1); // upholding (positive resolution)
    });

    it('OTT-031: detects polarity from violating terms', () => {
      const tags = legalTagger.tagText('The breach resulted in significant damages and penalty.');
      const breach = tags.find(t => t.class === 'legal:ContractBreach');
      expect(breach).toBeDefined();
      expect(breach.polarity).toBe(-1); // violating (negative outcome)
    });
  });

  // ===========================================================================
  // 4. Category Grouping (6 tests)
  // ===========================================================================

  describe('4. Category Grouping', () => {
    let medTagger;

    beforeEach(() => {
      medTagger = OntologyTextTagger.fromTTL(MEDICAL_TTL, {
        propertyMap: MEDICAL_PROPERTY_MAP,
        domain: 'medical'
      });
    });

    it('OTT-032: groups results by category', () => {
      const grouped = medTagger.tagTextGrouped(
        'Patient has chest pain, high blood sugar, and insulin resistance.'
      );
      expect(grouped['med:ChronicDisease']).toBeDefined();
      expect(grouped['med:ChronicDisease'].length).toBeGreaterThanOrEqual(1);
    });

    it('OTT-033: separates different categories', () => {
      const grouped = medTagger.tagTextGrouped(
        'Patient has chest pain and cough with fever.'
      );
      // CardiovascularDisease → ChronicDisease, RespiratoryInfection → AcuteDisease
      const categories = Object.keys(grouped);
      expect(categories.length).toBeGreaterThanOrEqual(2);
    });

    it('OTT-034: returns empty object for non-matching text', () => {
      const grouped = medTagger.tagTextGrouped('The weather is nice.');
      expect(Object.keys(grouped).length).toBe(0);
    });

    it('OTT-035: puts uncategorized results under _uncategorized', () => {
      const tagger = OntologyTextTagger.fromTTL(SIMPLE_TTL, {
        propertyMap: { keywords: 'ex:terms' }
      });
      const grouped = tagger.tagTextGrouped('Testing alpha and delta values.');
      if (Object.keys(grouped).length > 0) {
        expect(grouped['_uncategorized']).toBeDefined();
      }
    });

    it('OTT-036: grouped results contain same data as flat results', () => {
      const text = 'Patient has chest pain and fever with cough.';
      const flat = medTagger.tagText(text);
      const grouped = medTagger.tagTextGrouped(text);

      const allGrouped = Object.values(grouped).flat();
      expect(allGrouped.length).toBe(flat.length);
    });

    it('OTT-037: each grouped result has category field', () => {
      const grouped = medTagger.tagTextGrouped('Patient has chest pain and cough.');
      for (const [category, results] of Object.entries(grouped)) {
        if (category !== '_uncategorized') {
          for (const result of results) {
            expect(result.category).toBe(category);
          }
        }
      }
    });
  });

  // ===========================================================================
  // 5. Match Options (8 tests)
  // ===========================================================================

  describe('5. Match Options', () => {
    it('OTT-038: case insensitive matching by default', () => {
      const tagger = OntologyTextTagger.fromTTL(SIMPLE_TTL, {
        propertyMap: { keywords: 'ex:terms' }
      });
      const tags = tagger.tagText('ALPHA and BETA are here.');
      expect(tags.length).toBeGreaterThanOrEqual(1);
    });

    it('OTT-039: case sensitive matching when configured', () => {
      const tagger = OntologyTextTagger.fromTTL(SIMPLE_TTL, {
        propertyMap: { keywords: 'ex:terms' },
        matchOptions: { caseSensitive: true }
      });
      // Keywords are lowercase "alpha, beta" — uppercase text shouldn't match
      const tags = tagger.tagText('ALPHA and BETA are here.');
      expect(tags.length).toBe(0);
    });

    it('OTT-040: word boundary matching by default', () => {
      const tagger = OntologyTextTagger.fromTTL(SIMPLE_TTL, {
        propertyMap: { keywords: 'ex:terms' }
      });
      // "alphabet" contains "alpha" but word boundary should prevent match
      const tags = tagger.tagText('The alphabet is long.');
      expect(tags.length).toBe(0);
    });

    it('OTT-041: substring matching when wordBoundary disabled', () => {
      const tagger = OntologyTextTagger.fromTTL(SIMPLE_TTL, {
        propertyMap: { keywords: 'ex:terms' },
        matchOptions: { wordBoundary: false }
      });
      const tags = tagger.tagText('The alphabet is long.');
      expect(tags.length).toBeGreaterThanOrEqual(1);
    });

    it('OTT-042: minKeywordMatches filters low matches', () => {
      const tagger = OntologyTextTagger.fromTTL(MEDICAL_TTL, {
        propertyMap: MEDICAL_PROPERTY_MAP,
        matchOptions: { minKeywordMatches: 3 }
      });
      // Only "chest pain" matches CardiovascularDisease (1 keyword)
      const tags = tagger.tagText('Patient has chest pain.');
      const cardio = tags.find(t => t.class === 'med:CardiovascularDisease');
      expect(cardio).toBeUndefined();
    });

    it('OTT-043: minKeywordMatches allows sufficient matches', () => {
      const tagger = OntologyTextTagger.fromTTL(MEDICAL_TTL, {
        propertyMap: MEDICAL_PROPERTY_MAP,
        matchOptions: { minKeywordMatches: 2 }
      });
      const tags = tagger.tagText('Patient has chest pain, shortness of breath, and a heart attack.');
      const cardio = tags.find(t => t.class === 'med:CardiovascularDisease');
      expect(cardio).toBeDefined();
    });

    it('OTT-044: confidenceThreshold filters low confidence', () => {
      const tagger = OntologyTextTagger.fromTTL(MEDICAL_TTL, {
        propertyMap: MEDICAL_PROPERTY_MAP,
        matchOptions: { confidenceThreshold: 0.5 }
      });
      // Only 1 of 5 keywords matches → confidence = 0.2
      const tags = tagger.tagText('Patient has chest pain.');
      const cardio = tags.find(t => t.class === 'med:CardiovascularDisease');
      expect(cardio).toBeUndefined();
    });

    it('OTT-045: class filter limits which classes are checked', () => {
      const tagger = OntologyTextTagger.fromTTL(MEDICAL_TTL, {
        propertyMap: MEDICAL_PROPERTY_MAP
      });
      const tags = tagger.tagText('Patient has chest pain and cough with fever.', {
        classes: ['med:RespiratoryInfection']
      });
      // Should only return respiratory, not cardiovascular
      expect(tags.every(t => t.class === 'med:RespiratoryInfection')).toBe(true);
    });
  });

  // ===========================================================================
  // 6. Introspection (6 tests)
  // ===========================================================================

  describe('6. Introspection', () => {
    let medTagger;

    beforeEach(() => {
      medTagger = OntologyTextTagger.fromTTL(MEDICAL_TTL, {
        propertyMap: MEDICAL_PROPERTY_MAP,
        domain: 'medical'
      });
    });

    it('OTT-046: getTaggableClasses returns all classes', () => {
      const classes = medTagger.getTaggableClasses();
      expect(classes.length).toBe(3);
    });

    it('OTT-047: getTaggableClasses includes class metadata', () => {
      const classes = medTagger.getTaggableClasses();
      const cardio = classes.find(c => c.id === 'med:CardiovascularDisease');
      expect(cardio.label).toBe('Cardiovascular Disease');
      expect(cardio.category).toBe('med:ChronicDisease');
      expect(cardio.keywordCount).toBe(5);
      expect(cardio.hasPolarity).toBe(false); // no upholding/violating mapped
    });

    it('OTT-048: getStats returns correct counts', () => {
      const stats = medTagger.getStats();
      expect(stats.classCount).toBe(3);
      expect(stats.totalKeywords).toBeGreaterThan(0);
      expect(stats.categories).toBe(2); // ChronicDisease, AcuteDisease
    });

    it('OTT-049: getStats reports polarity classes', () => {
      const tagger = OntologyTextTagger.fromTTL(LEGAL_TTL, {
        propertyMap: LEGAL_PROPERTY_MAP
      });
      const stats = tagger.getStats();
      expect(stats.withPolarity).toBe(2); // both legal concepts have polarity
    });

    it('OTT-050: getTagDefinition returns null for unknown class', () => {
      expect(medTagger.getTagDefinition('med:NonExistent')).toBeNull();
    });

    it('OTT-051: validatePropertyMap returns valid for good ontology', () => {
      const result = medTagger.validatePropertyMap();
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  // ===========================================================================
  // 7. Export & Compatibility (5 tests)
  // ===========================================================================

  describe('7. Export & Compatibility', () => {
    let medTagger;

    beforeEach(() => {
      medTagger = OntologyTextTagger.fromTTL(MEDICAL_TTL, {
        propertyMap: MEDICAL_PROPERTY_MAP,
        domain: 'medical'
      });
    });

    it('OTT-052: toValueMatcherFormat returns correct structure', () => {
      const vmFormat = medTagger.toValueMatcherFormat();
      expect(vmFormat.values).toBeDefined();
      expect(vmFormat.values.length).toBe(3);
      expect(vmFormat.version).toBe('6.6');
      expect(vmFormat.source).toBe('medical');
    });

    it('OTT-053: toValueMatcherFormat values have semanticMarkers', () => {
      const vmFormat = medTagger.toValueMatcherFormat();
      const cardio = vmFormat.values.find(v => v.name === 'Cardiovascular Disease');
      expect(cardio.semanticMarkers).toContain('chest pain');
      expect(cardio.domain).toBe('medical');
    });

    it('OTT-054: toValueMatcherFormat includes polarityIndicators', () => {
      const tagger = OntologyTextTagger.fromTTL(LEGAL_TTL, {
        propertyMap: LEGAL_PROPERTY_MAP,
        domain: 'legal'
      });
      const vmFormat = tagger.toValueMatcherFormat();
      const breach = vmFormat.values.find(v => v.name === 'Breach of Contract');
      expect(breach.polarityIndicators.upholding).toContain('remedy');
      expect(breach.polarityIndicators.violating).toContain('damages');
    });

    it('OTT-055: exportDefinitions returns serializable JSON', () => {
      const exported = medTagger.exportDefinitions();
      expect(exported.domain).toBe('medical');
      expect(exported.classCount).toBe(3);
      expect(exported.definitions).toBeDefined();
      expect(exported.definitions.length).toBe(3);
      // Should be serializable
      const json = JSON.stringify(exported);
      expect(json).toBeDefined();
    });

    it('OTT-056: exportDefinitions preserves metadata', () => {
      const exported = medTagger.exportDefinitions();
      const cardio = exported.definitions.find(d => d.id === 'med:CardiovascularDisease');
      expect(cardio.metadata.icdCode).toBe('I00-I99');
    });
  });

  // ===========================================================================
  // 8. Edge Cases (5 tests)
  // ===========================================================================

  describe('8. Edge Cases', () => {
    it('OTT-057: handles empty ontology', () => {
      const ttl = `
        @prefix ex: <https://example.org/#> .
      `;
      const tagger = OntologyTextTagger.fromTTL(ttl, {
        propertyMap: { keywords: 'ex:terms' }
      });
      expect(tagger.tagDefinitions.length).toBe(0);
      expect(tagger.tagText('any text')).toEqual([]);
    });

    it('OTT-058: handles ontology with no keyword properties', () => {
      const ttl = `
        @prefix ex: <https://example.org/#> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
        ex:Thing a ex:Type ; rdfs:label "Thing" .
      `;
      const tagger = OntologyTextTagger.fromTTL(ttl, {
        propertyMap: { keywords: 'ex:nonExistentProp' }
      });
      expect(tagger.tagDefinitions.length).toBe(0);
    });

    it('OTT-059: validatePropertyMap reports errors when no data loaded', () => {
      const tagger = new OntologyTextTagger({
        propertyMap: { keywords: 'ex:terms' }
      });
      const result = tagger.validatePropertyMap();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('OTT-060: works with environmental ontology (different domain)', () => {
      const tagger = OntologyTextTagger.fromTTL(ENV_TTL, {
        propertyMap: {
          keywords: 'env:keywords',
          typeFilter: 'env:EnvironmentalHazard',
          category: 'env:category'
        },
        domain: 'environmental'
      });
      expect(tagger.tagDefinitions.length).toBe(3);

      const tags = tagger.tagText('The factory discharge contaminated the river with effluent.');
      const water = tags.find(t => t.class === 'env:WaterPollution');
      expect(water).toBeDefined();
      expect(water.domain).toBe('environmental');
      expect(water.category).toBe('env:PollutionType');
    });
  });

  // ===========================================================================
  // 9. PropertyMapper Unit Tests (5 tests)
  // ===========================================================================

  describe('9. PropertyMapper', () => {
    it('OTT-061: requires propertyMap with keywords', () => {
      expect(() => new PropertyMapper()).toThrow();
      expect(() => new PropertyMapper({})).toThrow('keywords');
    });

    it('OTT-062: constructs with minimal config', () => {
      const mapper = new PropertyMapper({ keywords: 'ex:kw' });
      expect(mapper.propertyMap.keywords).toBe('ex:kw');
      expect(mapper.propertyMap.label).toBe('rdfs:label');
    });

    it('OTT-063: extractDefinitions returns correct count', () => {
      const parser = new TurtleParser();
      const result = parser.parse(SIMPLE_TTL);
      const mapper = new PropertyMapper({ keywords: 'ex:terms' });
      const defs = mapper.extractDefinitions(result);
      expect(defs.length).toBe(2);
    });

    it('OTT-064: validate detects missing required property', () => {
      const parser = new TurtleParser();
      const result = parser.parse(SIMPLE_TTL);
      const mapper = new PropertyMapper({ keywords: 'ex:nonExistent' });
      const validation = mapper.validate(result);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('nonExistent'))).toBe(true);
    });

    it('OTT-065: validate reports partial coverage as warning', () => {
      // medical TTL: riskFactors exists on 2 of 3 classes
      const parser = new TurtleParser();
      const result = parser.parse(MEDICAL_TTL);
      const mapper = new PropertyMapper({
        keywords: 'med:indicators',
        extraProperties: ['med:riskFactors']
      });
      const validation = mapper.validate(result);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });
});
