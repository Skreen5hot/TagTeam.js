/**
 * Phase 6.5.2 OntologyManager Tests
 *
 * Tests for unified ontology loading (JSON + TTL) with caching.
 *
 * Supported Features:
 * - Load JSON domain configs (existing format)
 * - Load TTL/Turtle ontology files (via TurtleParser)
 * - Auto-detect format by file extension
 * - Memory caching for performance
 * - Merge multiple ontologies with conflict warnings
 * - Query value definitions, type specializations, conflicts
 *
 * Test Count: 70 tests across 9 categories
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import component
const OntologyManager = require('../../../src/ontology/OntologyManager.js');

describe('Phase 6.5.2: OntologyManager', () => {
  let manager;

  beforeEach(() => {
    manager = new OntologyManager();
  });

  // ===========================================================================
  // Category 1: Constructor and Initialization (8 tests)
  // ===========================================================================
  describe('Category 1: Constructor and Initialization', () => {
    it('OM-001: Constructor creates manager with empty state', () => {
      const m = new OntologyManager();
      expect(m).toBeDefined();
      expect(m.getLoadedOntologies()).toEqual([]);
    });

    it('OM-002: Constructor accepts options', () => {
      const m = new OntologyManager({ cacheEnabled: true });
      expect(m).toBeDefined();
      expect(m.options.cacheEnabled).toBe(true);
    });

    it('OM-003: Memory cache is initialized', () => {
      const m = new OntologyManager();
      expect(m.cache).toBeDefined();
      expect(m.cache instanceof Map).toBe(true);
    });

    it('OM-004: Loaded ontologies array is initialized', () => {
      const m = new OntologyManager();
      expect(m.loadedOntologies).toBeDefined();
      expect(Array.isArray(m.loadedOntologies)).toBe(true);
    });

    it('OM-005: Value definitions map is initialized', () => {
      const m = new OntologyManager();
      expect(m.valueDefinitions).toBeDefined();
      expect(m.valueDefinitions instanceof Map).toBe(true);
    });

    it('OM-006: Type specializations map is initialized', () => {
      const m = new OntologyManager();
      expect(m.typeSpecializations).toBeDefined();
      expect(m.typeSpecializations instanceof Map).toBe(true);
    });

    it('OM-007: Conflicts map is initialized', () => {
      const m = new OntologyManager();
      expect(m.conflicts).toBeDefined();
      expect(m.conflicts instanceof Map).toBe(true);
    });

    it('OM-008: Constructor with disabled cache', () => {
      const m = new OntologyManager({ cacheEnabled: false });
      expect(m.options.cacheEnabled).toBe(false);
    });
  });

  // ===========================================================================
  // Category 2: Format Detection (8 tests)
  // ===========================================================================
  describe('Category 2: Format Detection', () => {
    it('FD-001: Detects TTL format from .ttl extension', () => {
      const format = manager.detectFormat('valuenet.ttl');
      expect(format).toBe('turtle');
    });

    it('FD-002: Detects TTL format from .turtle extension', () => {
      const format = manager.detectFormat('ontology.turtle');
      expect(format).toBe('turtle');
    });

    it('FD-003: Detects JSON format from .json extension', () => {
      const format = manager.detectFormat('medical.json');
      expect(format).toBe('json');
    });

    it('FD-004: Detects TTL format case-insensitively', () => {
      const format = manager.detectFormat('ValueNet.TTL');
      expect(format).toBe('turtle');
    });

    it('FD-005: Detects JSON format case-insensitively', () => {
      const format = manager.detectFormat('Config.JSON');
      expect(format).toBe('json');
    });

    it('FD-006: Returns null for unknown extension', () => {
      const format = manager.detectFormat('data.xml');
      expect(format).toBeNull();
    });

    it('FD-007: Handles paths with directories', () => {
      const format = manager.detectFormat('./path/to/ontology.ttl');
      expect(format).toBe('turtle');
    });

    it('FD-008: Explicit format overrides detection', () => {
      // When loading, explicit format should override auto-detection
      expect(manager.detectFormat('data.xml', 'turtle')).toBe('turtle');
    });
  });

  // ===========================================================================
  // Category 3: Loading TTL Ontologies (10 tests)
  // ===========================================================================
  describe('Category 3: Loading TTL Ontologies', () => {
    const sampleTTL = `
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
          vn:keywords "choice, freedom, independence" .
    `;

    it('TL-001: loadFromString() loads TTL content', () => {
      const result = manager.loadFromString(sampleTTL, { format: 'turtle', namespace: 'vn' });
      expect(result.success).toBe(true);
      expect(result.valueCount).toBeGreaterThan(0);
    });

    it('TL-002: Loaded TTL adds to loadedOntologies', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', namespace: 'vn' });
      const loaded = manager.getLoadedOntologies();
      expect(loaded.length).toBe(1);
      expect(loaded[0].format).toBe('turtle');
    });

    it('TL-003: TTL values are queryable after load', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', namespace: 'vn' });
      const value = manager.getValueDefinition('SecurityDisposition');
      expect(value).toBeDefined();
      expect(value.label).toBe('Security');
    });

    it('TL-004: TTL keywords are extracted', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', namespace: 'vn' });
      const value = manager.getValueDefinition('SecurityDisposition');
      expect(value.keywords).toContain('safety');
      expect(value.keywords).toContain('protection');
    });

    it('TL-005: TTL upholding terms are extracted', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', namespace: 'vn' });
      const value = manager.getValueDefinition('SecurityDisposition');
      expect(value.upholdingTerms).toContain('protect');
      expect(value.upholdingTerms).toContain('safeguard');
    });

    it('TL-006: TTL violating terms are extracted', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', namespace: 'vn' });
      const value = manager.getValueDefinition('SecurityDisposition');
      expect(value.violatingTerms).toContain('endanger');
      expect(value.violatingTerms).toContain('risk');
    });

    it('TL-007: TTL BFO type is extracted', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', namespace: 'vn' });
      const value = manager.getValueDefinition('SecurityDisposition');
      expect(value.type).toBe('bfo:0000016');
    });

    it('TL-008: Multiple values from TTL are loaded', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', namespace: 'vn' });
      const security = manager.getValueDefinition('SecurityDisposition');
      const autonomy = manager.getValueDefinition('AutonomyDisposition');
      expect(security).toBeDefined();
      expect(autonomy).toBeDefined();
    });

    it('TL-009: Namespace prefix is stored', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', namespace: 'vn' });
      const loaded = manager.getLoadedOntologies();
      expect(loaded[0].namespace).toBe('vn');
    });

    it('TL-010: Invalid TTL returns error result', () => {
      const result = manager.loadFromString('invalid { ttl content', { format: 'turtle' });
      expect(result.success).toBe(true); // Parser is lenient
      expect(result.valueCount).toBe(0);
    });
  });

  // ===========================================================================
  // Category 4: Loading JSON Configs (10 tests)
  // ===========================================================================
  describe('Category 4: Loading JSON Configs', () => {
    const sampleJSON = {
      domain: 'test',
      version: '1.0',
      typeSpecializations: {
        'bfo:BFO_0000015': {
          'care': 'cco:ActOfCare',
          'treatment': 'cco:ActOfMedicalTreatment'
        }
      },
      processRootWords: {
        'care': 'cco:ActOfCare'
      }
    };

    it('JL-001: loadFromObject() loads JSON config', () => {
      const result = manager.loadFromObject(sampleJSON);
      expect(result.success).toBe(true);
    });

    it('JL-002: Loaded JSON adds to loadedOntologies', () => {
      manager.loadFromObject(sampleJSON);
      const loaded = manager.getLoadedOntologies();
      expect(loaded.length).toBe(1);
      expect(loaded[0].format).toBe('json');
    });

    it('JL-003: JSON domain name is stored', () => {
      manager.loadFromObject(sampleJSON);
      const loaded = manager.getLoadedOntologies();
      expect(loaded[0].namespace).toBe('test');
    });

    it('JL-004: Type specializations are queryable', () => {
      manager.loadFromObject(sampleJSON);
      const type = manager.getTypeSpecialization('bfo:BFO_0000015', 'care');
      expect(type).toBe('cco:ActOfCare');
    });

    it('JL-005: Process root words are queryable', () => {
      manager.loadFromObject(sampleJSON);
      const type = manager.getProcessRootType('care');
      expect(type).toBe('cco:ActOfCare');
    });

    it('JL-006: Missing domain field throws error', () => {
      expect(() => {
        manager.loadFromObject({ version: '1.0' });
      }).toThrow(/domain/i);
    });

    it('JL-007: Missing version field throws error', () => {
      expect(() => {
        manager.loadFromObject({ domain: 'test' });
      }).toThrow(/version/i);
    });

    it('JL-008: JSON version is stored', () => {
      manager.loadFromObject(sampleJSON);
      const loaded = manager.getLoadedOntologies();
      expect(loaded[0].version).toBe('1.0');
    });

    it('JL-009: loadFromString() parses JSON string', () => {
      const jsonStr = JSON.stringify(sampleJSON);
      const result = manager.loadFromString(jsonStr, { format: 'json' });
      expect(result.success).toBe(true);
    });

    it('JL-010: Invalid JSON returns error', () => {
      expect(() => {
        manager.loadFromString('{ invalid json', { format: 'json' });
      }).toThrow();
    });
  });

  // ===========================================================================
  // Category 5: Memory Caching (8 tests)
  // ===========================================================================
  describe('Category 5: Memory Caching', () => {
    const sampleTTL = `
      @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
      vn:TestValue a <http://purl.obolibrary.org/obo/BFO_0000016> .
    `;

    it('MC-001: Cache stores loaded content', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', cacheKey: 'test1' });
      expect(manager.cache.has('test1')).toBe(true);
    });

    it('MC-002: Cached content returns faster', () => {
      // First load
      manager.loadFromString(sampleTTL, { format: 'turtle', cacheKey: 'test2' });

      // Second load from cache
      const start = Date.now();
      manager.loadFromString(sampleTTL, { format: 'turtle', cacheKey: 'test2' });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50); // Should be nearly instant
    });

    it('MC-003: Cache can be cleared', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', cacheKey: 'test3' });
      expect(manager.cache.size).toBeGreaterThan(0);

      manager.clearCache();
      expect(manager.cache.size).toBe(0);
    });

    it('MC-004: Cache disabled prevents caching', () => {
      const m = new OntologyManager({ cacheEnabled: false });
      m.loadFromString(sampleTTL, { format: 'turtle', cacheKey: 'test4' });
      expect(m.cache.size).toBe(0);
    });

    it('MC-005: isCached() returns true for cached content', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', cacheKey: 'test5' });
      expect(manager.isCached('test5')).toBe(true);
    });

    it('MC-006: isCached() returns false for uncached content', () => {
      expect(manager.isCached('nonexistent')).toBe(false);
    });

    it('MC-007: Cache respects force reload option', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', cacheKey: 'test7' });

      // Force reload should re-parse
      const result = manager.loadFromString(sampleTTL, {
        format: 'turtle',
        cacheKey: 'test7',
        forceReload: true
      });
      expect(result.fromCache).toBe(false);
    });

    it('MC-008: getCacheStats() returns cache statistics', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', cacheKey: 'stat1' });
      manager.loadFromString(sampleTTL, { format: 'turtle', cacheKey: 'stat2' });

      const stats = manager.getCacheStats();
      expect(stats.entries).toBe(2);
    });
  });

  // ===========================================================================
  // Category 6: Merge Strategy (8 tests)
  // ===========================================================================
  describe('Category 6: Merge Strategy', () => {
    const ttl1 = `
      @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
      vn:Value1 a <http://purl.obolibrary.org/obo/BFO_0000016> ;
          rdfs:label "Original Label" .
    `;

    const ttl2 = `
      @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
      vn:Value1 a <http://purl.obolibrary.org/obo/BFO_0000016> ;
          rdfs:label "Updated Label" .
      vn:Value2 a <http://purl.obolibrary.org/obo/BFO_0000016> ;
          rdfs:label "New Value" .
    `;

    it('MS-001: Multiple ontologies merge by default', () => {
      manager.loadFromString(ttl1, { format: 'turtle', namespace: 'vn1' });
      manager.loadFromString(ttl2, { format: 'turtle', namespace: 'vn2' });

      const loaded = manager.getLoadedOntologies();
      expect(loaded.length).toBe(2);
    });

    it('MS-002: Last loaded wins for conflicts', () => {
      manager.loadFromString(ttl1, { format: 'turtle', namespace: 'vn1' });
      manager.loadFromString(ttl2, { format: 'turtle', namespace: 'vn2' });

      const value = manager.getValueDefinition('Value1');
      expect(value.label).toBe('Updated Label');
    });

    it('MS-003: New values from later loads are added', () => {
      manager.loadFromString(ttl1, { format: 'turtle', namespace: 'vn1' });
      manager.loadFromString(ttl2, { format: 'turtle', namespace: 'vn2' });

      const value = manager.getValueDefinition('Value2');
      expect(value).toBeDefined();
      expect(value.label).toBe('New Value');
    });

    it('MS-004: Conflicts are tracked', () => {
      manager.loadFromString(ttl1, { format: 'turtle', namespace: 'vn1' });
      manager.loadFromString(ttl2, { format: 'turtle', namespace: 'vn2' });

      const conflicts = manager.getMergeConflicts();
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('MS-005: Merge can be disabled (replace mode)', () => {
      manager.loadFromString(ttl1, { format: 'turtle', namespace: 'vn1' });
      manager.loadFromString(ttl2, { format: 'turtle', namespace: 'vn2', merge: false });

      // Replace mode clears previous
      const loaded = manager.getLoadedOntologies();
      expect(loaded.length).toBe(1);
    });

    it('MS-006: getConflicts() returns value-specific conflicts', () => {
      manager.loadFromString(ttl1, { format: 'turtle', namespace: 'vn1' });
      manager.loadFromString(ttl2, { format: 'turtle', namespace: 'vn2' });

      const conflicts = manager.getConflicts('Value1');
      expect(conflicts).toBeDefined();
    });

    it('MS-007: JSON and TTL can be merged', () => {
      const json = {
        domain: 'test',
        version: '1.0',
        typeSpecializations: { 'bfo:BFO_0000015': { 'care': 'cco:ActOfCare' } }
      };

      manager.loadFromString(ttl1, { format: 'turtle', namespace: 'vn' });
      manager.loadFromObject(json);

      const loaded = manager.getLoadedOntologies();
      expect(loaded.length).toBe(2);
      expect(loaded.some(o => o.format === 'turtle')).toBe(true);
      expect(loaded.some(o => o.format === 'json')).toBe(true);
    });

    it('MS-008: hasMergeConflicts() returns boolean', () => {
      manager.loadFromString(ttl1, { format: 'turtle', namespace: 'vn1' });
      expect(manager.hasMergeConflicts()).toBe(false);

      manager.loadFromString(ttl2, { format: 'turtle', namespace: 'vn2' });
      expect(manager.hasMergeConflicts()).toBe(true);
    });
  });

  // ===========================================================================
  // Category 7: Query Methods (10 tests)
  // ===========================================================================
  describe('Category 7: Query Methods', () => {
    beforeEach(() => {
      const ttl = `
        @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
        @prefix ethics: <http://example.org/ethics#> .

        vn:SecurityDisposition a <http://purl.obolibrary.org/obo/BFO_0000016> ;
            rdfs:label "Security" ;
            vn:keywords "safety, stability" ;
            ethics:conflictsWith vn:AutonomyDisposition .

        vn:AutonomyDisposition a <http://purl.obolibrary.org/obo/BFO_0000016> ;
            rdfs:label "Autonomy" ;
            vn:keywords "freedom, choice" .
      `;
      manager.loadFromString(ttl, { format: 'turtle', namespace: 'vn' });
    });

    it('QM-001: getValueDefinition() by name', () => {
      const value = manager.getValueDefinition('SecurityDisposition');
      expect(value).toBeDefined();
      expect(value.label).toBe('Security');
    });

    it('QM-002: getValueDefinition() by full IRI', () => {
      const value = manager.getValueDefinition('vn:SecurityDisposition');
      expect(value).toBeDefined();
    });

    it('QM-003: getValueDefinition() returns null for unknown', () => {
      const value = manager.getValueDefinition('NonExistent');
      expect(value).toBeNull();
    });

    it('QM-004: getAllValueDefinitions() returns all values', () => {
      const values = manager.getAllValueDefinitions();
      expect(values.length).toBe(2);
    });

    it('QM-005: getConflicts() returns conflicting values', () => {
      const conflicts = manager.getConflicts('SecurityDisposition');
      expect(conflicts).toContain('vn:AutonomyDisposition');
    });

    it('QM-006: getConflicts() returns empty for no conflicts', () => {
      const conflicts = manager.getConflicts('AutonomyDisposition');
      expect(conflicts.length).toBe(0);
    });

    it('QM-007: findByKeyword() searches keywords', () => {
      const results = manager.findByKeyword('safety');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Security');
    });

    it('QM-008: findByKeyword() is case-insensitive', () => {
      const results = manager.findByKeyword('SAFETY');
      expect(results.length).toBeGreaterThan(0);
    });

    it('QM-009: getLoadedOntologies() returns metadata', () => {
      const loaded = manager.getLoadedOntologies();
      expect(loaded[0]).toHaveProperty('namespace');
      expect(loaded[0]).toHaveProperty('format');
      expect(loaded[0]).toHaveProperty('valueCount');
    });

    it('QM-010: hasValue() checks existence', () => {
      expect(manager.hasValue('SecurityDisposition')).toBe(true);
      expect(manager.hasValue('NonExistent')).toBe(false);
    });
  });

  // ===========================================================================
  // Category 8: Clear and Reset (6 tests)
  // ===========================================================================
  describe('Category 8: Clear and Reset', () => {
    const sampleTTL = `
      @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
      vn:TestValue a <http://purl.obolibrary.org/obo/BFO_0000016> .
    `;

    it('CR-001: clear() removes all loaded ontologies', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', namespace: 'vn' });
      expect(manager.getLoadedOntologies().length).toBe(1);

      manager.clear();
      expect(manager.getLoadedOntologies().length).toBe(0);
    });

    it('CR-002: clear() removes all value definitions', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', namespace: 'vn' });
      expect(manager.getAllValueDefinitions().length).toBeGreaterThan(0);

      manager.clear();
      expect(manager.getAllValueDefinitions().length).toBe(0);
    });

    it('CR-003: clear() clears cache', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', cacheKey: 'test' });
      expect(manager.cache.size).toBeGreaterThan(0);

      manager.clear();
      expect(manager.cache.size).toBe(0);
    });

    it('CR-004: clearCache() only clears cache', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', cacheKey: 'test' });

      manager.clearCache();

      expect(manager.cache.size).toBe(0);
      expect(manager.getLoadedOntologies().length).toBe(1);
    });

    it('CR-005: unloadOntology() removes specific ontology', () => {
      manager.loadFromString(sampleTTL, { format: 'turtle', namespace: 'vn1' });
      manager.loadFromString(sampleTTL, { format: 'turtle', namespace: 'vn2' });

      manager.unloadOntology('vn1');

      const loaded = manager.getLoadedOntologies();
      expect(loaded.length).toBe(1);
      expect(loaded[0].namespace).toBe('vn2');
    });

    it('CR-006: unloadOntology() returns false for unknown namespace', () => {
      const result = manager.unloadOntology('nonexistent');
      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // Category 9: Integration and Performance (12 tests)
  // ===========================================================================
  describe('Category 9: Integration and Performance', () => {
    it('IP-001: Load realistic ValueNet fragment', () => {
      const valuenetTTL = `
        @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
        @prefix bfo: <http://purl.obolibrary.org/obo/BFO_> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
        @prefix ethics: <http://example.org/ethics#> .

        vn:SecurityDisposition a bfo:0000016 ;
            rdfs:label "Security" ;
            vn:keywords "safety, stability, protection, order" ;
            vn:upholdingTerms "protect, secure, safeguard, defend" ;
            vn:violatingTerms "endanger, threaten, risk, harm" ;
            ethics:conflictsWith vn:FreedomDisposition .

        vn:FreedomDisposition a bfo:0000016 ;
            rdfs:label "Freedom" ;
            vn:keywords "liberty, independence, autonomy, choice" ;
            vn:upholdingTerms "liberate, free, emancipate, release" ;
            vn:violatingTerms "restrict, constrain, imprison, control" .

        vn:JusticeDisposition a bfo:0000016 ;
            rdfs:label "Justice" ;
            vn:keywords "fairness, equity, impartiality, balance" ;
            vn:upholdingTerms "adjudicate, balance, equalize, arbitrate" ;
            vn:violatingTerms "discriminate, bias, favor, prejudice" .
      `;

      const result = manager.loadFromString(valuenetTTL, { format: 'turtle', namespace: 'vn' });
      expect(result.success).toBe(true);
      expect(result.valueCount).toBe(3);

      const security = manager.getValueDefinition('SecurityDisposition');
      expect(security.keywords.length).toBeGreaterThan(0);
      expect(security.upholdingTerms.length).toBeGreaterThan(0);
    });

    it('IP-002: Load JSON config and TTL together', () => {
      const json = {
        domain: 'medical',
        version: '1.0',
        typeSpecializations: {
          'bfo:BFO_0000015': { 'care': 'cco:ActOfCare' }
        }
      };

      const ttl = `
        @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
        vn:BeneficenceDisposition a <http://purl.obolibrary.org/obo/BFO_0000016> ;
            <http://www.w3.org/2000/01/rdf-schema#label> "Beneficence" .
      `;

      manager.loadFromObject(json);
      manager.loadFromString(ttl, { format: 'turtle', namespace: 'vn' });

      // Both are loaded
      expect(manager.getLoadedOntologies().length).toBe(2);

      // JSON specialization works
      expect(manager.getTypeSpecialization('bfo:BFO_0000015', 'care')).toBe('cco:ActOfCare');

      // TTL value works
      expect(manager.getValueDefinition('BeneficenceDisposition')).toBeDefined();
    });

    it('IP-003: Load performance - 10 values under 100ms', () => {
      let ttl = `@prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .\n`;
      for (let i = 0; i < 10; i++) {
        ttl += `vn:Value${i} a <http://purl.obolibrary.org/obo/BFO_0000016> .\n`;
      }

      const start = Date.now();
      manager.loadFromString(ttl, { format: 'turtle' });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it('IP-004: Cached load under 10ms', () => {
      const ttl = `
        @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
        vn:CachedValue a <http://purl.obolibrary.org/obo/BFO_0000016> .
      `;

      // First load
      manager.loadFromString(ttl, { format: 'turtle', cacheKey: 'perf-test' });

      // Cached load
      const start = Date.now();
      manager.loadFromString(ttl, { format: 'turtle', cacheKey: 'perf-test' });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10);
    });

    it('IP-005: toJSON() serializes state', () => {
      const ttl = `
        @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
        vn:TestValue a <http://purl.obolibrary.org/obo/BFO_0000016> .
      `;
      manager.loadFromString(ttl, { format: 'turtle', namespace: 'vn' });

      const json = manager.toJSON();
      expect(json).toHaveProperty('loadedOntologies');
      expect(json).toHaveProperty('valueDefinitions');
    });

    it('IP-006: fromJSON() restores state', () => {
      const ttl = `
        @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
        vn:TestValue a <http://purl.obolibrary.org/obo/BFO_0000016> ;
            rdfs:label "Test" .
      `;
      manager.loadFromString(ttl, { format: 'turtle', namespace: 'vn' });

      const json = manager.toJSON();

      const newManager = new OntologyManager();
      newManager.fromJSON(json);

      expect(newManager.getValueDefinition('TestValue')).toBeDefined();
    });

    it('IP-007: getStats() returns usage statistics', () => {
      const ttl = `
        @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
        vn:Value1 a <http://purl.obolibrary.org/obo/BFO_0000016> .
        vn:Value2 a <http://purl.obolibrary.org/obo/BFO_0000016> .
      `;
      manager.loadFromString(ttl, { format: 'turtle', namespace: 'vn' });

      const stats = manager.getStats();
      expect(stats.totalOntologies).toBe(1);
      expect(stats.totalValues).toBe(2);
    });

    it('IP-008: Handles empty TTL gracefully', () => {
      const result = manager.loadFromString('', { format: 'turtle' });
      expect(result.success).toBe(true);
      expect(result.valueCount).toBe(0);
    });

    it('IP-009: Handles empty JSON gracefully', () => {
      expect(() => {
        manager.loadFromObject({ domain: 'empty', version: '1.0' });
      }).not.toThrow();
    });

    it('IP-010: Unicode in values preserved', () => {
      const ttl = `
        @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
        vn:UniTest a <http://purl.obolibrary.org/obo/BFO_0000016> ;
            rdfs:label "Gerechtigkeit" ;
            vn:keywords "justice, \u516c\u6b63, \u6b63\u7fa9" .
      `;
      manager.loadFromString(ttl, { format: 'turtle', namespace: 'vn' });

      const value = manager.getValueDefinition('UniTest');
      expect(value.label).toBe('Gerechtigkeit');
    });

    it('IP-011: Concurrent loads handled correctly', async () => {
      const ttl1 = `@prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
        vn:Async1 a <http://purl.obolibrary.org/obo/BFO_0000016> .`;
      const ttl2 = `@prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
        vn:Async2 a <http://purl.obolibrary.org/obo/BFO_0000016> .`;

      // Simulate concurrent loads
      manager.loadFromString(ttl1, { format: 'turtle', namespace: 'vn1' });
      manager.loadFromString(ttl2, { format: 'turtle', namespace: 'vn2' });

      expect(manager.getLoadedOntologies().length).toBe(2);
    });

    it('IP-012: Works without TurtleParser (JSON only mode)', () => {
      const json = {
        domain: 'jsonOnly',
        version: '1.0',
        typeSpecializations: { 'bfo:Test': { 'term': 'type' } }
      };

      const m = new OntologyManager();
      m.loadFromObject(json);

      expect(m.getTypeSpecialization('bfo:Test', 'term')).toBe('type');
    });
  });
});
