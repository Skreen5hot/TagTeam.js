/**
 * Phase 6.5.3 ValueNetAdapter Tests
 *
 * Tests for ValueNet TTL to ValueMatcher integration.
 *
 * The adapter converts OntologyManager's value definitions (from TTL)
 * to the format expected by ValueMatcher for ethical value detection.
 *
 * Test Count: 50 tests across 6 categories
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import components
const ValueNetAdapter = require('../../../src/ontology/ValueNetAdapter.js');
const OntologyManager = require('../../../src/ontology/OntologyManager.js');

describe('Phase 6.5.3: ValueNetAdapter', () => {
  let adapter;
  let manager;

  // Sample ValueNet TTL content
  const sampleValueNetTTL = `
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

    vn:BeneficenceDisposition a bfo:0000016 ;
        rdfs:label "Beneficence" ;
        vn:keywords "help, benefit, welfare, good" ;
        vn:upholdingTerms "help, assist, support, aid, benefit" ;
        vn:violatingTerms "harm, hurt, damage, neglect" .
  `;

  beforeEach(() => {
    manager = new OntologyManager();
    manager.loadFromString(sampleValueNetTTL, { format: 'turtle', namespace: 'vn' });
    adapter = new ValueNetAdapter(manager);
  });

  // ===========================================================================
  // Category 1: Constructor and Initialization (8 tests)
  // ===========================================================================
  describe('Category 1: Constructor and Initialization', () => {
    it('VA-001: Constructor accepts OntologyManager', () => {
      const a = new ValueNetAdapter(manager);
      expect(a).toBeDefined();
      expect(a.ontologyManager).toBe(manager);
    });

    it('VA-002: Constructor throws without OntologyManager', () => {
      expect(() => new ValueNetAdapter()).toThrow();
    });

    it('VA-003: Constructor accepts options', () => {
      const a = new ValueNetAdapter(manager, { defaultDomain: 'ethics' });
      expect(a.options.defaultDomain).toBe('ethics');
    });

    it('VA-004: Default domain is "valuenet"', () => {
      const a = new ValueNetAdapter(manager);
      expect(a.options.defaultDomain).toBe('valuenet');
    });

    it('VA-005: Adapter has toValueMatcherFormat method', () => {
      expect(typeof adapter.toValueMatcherFormat).toBe('function');
    });

    it('VA-006: Adapter has getAllAsValueMatcherFormat method', () => {
      expect(typeof adapter.getAllAsValueMatcherFormat).toBe('function');
    });

    it('VA-007: Adapter has createValueMatcher method', () => {
      expect(typeof adapter.createValueMatcher).toBe('function');
    });

    it('VA-008: Static convert method available', () => {
      expect(typeof ValueNetAdapter.convert).toBe('function');
    });
  });

  // ===========================================================================
  // Category 2: Single Value Conversion (10 tests)
  // ===========================================================================
  describe('Category 2: Single Value Conversion', () => {
    it('SC-001: Converts value name correctly', () => {
      const converted = adapter.toValueMatcherFormat('SecurityDisposition');
      expect(converted.name).toBe('Security');
    });

    it('SC-002: Converts keywords to semanticMarkers', () => {
      const converted = adapter.toValueMatcherFormat('SecurityDisposition');
      expect(converted.semanticMarkers).toContain('safety');
      expect(converted.semanticMarkers).toContain('protection');
    });

    it('SC-003: Converts upholdingTerms to polarityIndicators.upholding', () => {
      const converted = adapter.toValueMatcherFormat('SecurityDisposition');
      expect(converted.polarityIndicators.upholding).toContain('protect');
      expect(converted.polarityIndicators.upholding).toContain('safeguard');
    });

    it('SC-004: Converts violatingTerms to polarityIndicators.violating', () => {
      const converted = adapter.toValueMatcherFormat('SecurityDisposition');
      expect(converted.polarityIndicators.violating).toContain('endanger');
      expect(converted.polarityIndicators.violating).toContain('harm');
    });

    it('SC-005: Sets domain from options', () => {
      const converted = adapter.toValueMatcherFormat('SecurityDisposition');
      expect(converted.domain).toBe('valuenet');
    });

    it('SC-006: Preserves IRI in converted format', () => {
      const converted = adapter.toValueMatcherFormat('SecurityDisposition');
      expect(converted.iri).toBeDefined();
    });

    it('SC-007: Preserves BFO type in converted format', () => {
      const converted = adapter.toValueMatcherFormat('SecurityDisposition');
      expect(converted.bfoType).toBeDefined();
    });

    it('SC-008: Returns null for unknown value', () => {
      const converted = adapter.toValueMatcherFormat('NonExistent');
      expect(converted).toBeNull();
    });

    it('SC-009: Handles value with empty keywords', () => {
      // Load a value without keywords
      manager.loadFromString(`
        @prefix vn: <https://test.org#> .
        vn:EmptyValue a <http://purl.obolibrary.org/obo/BFO_0000016> ;
            <http://www.w3.org/2000/01/rdf-schema#label> "Empty" .
      `, { format: 'turtle', namespace: 'test' });

      const converted = adapter.toValueMatcherFormat('EmptyValue');
      expect(converted).toBeDefined();
      expect(converted.semanticMarkers).toEqual([]);
    });

    it('SC-010: Static convert works on raw value object', () => {
      const rawValue = {
        name: 'TestValue',
        label: 'Test',
        keywords: ['keyword1', 'keyword2'],
        upholdingTerms: ['uphold1'],
        violatingTerms: ['violate1'],
        type: 'bfo:0000016'
      };

      const converted = ValueNetAdapter.convert(rawValue);
      expect(converted.name).toBe('Test');
      expect(converted.semanticMarkers).toContain('keyword1');
    });
  });

  // ===========================================================================
  // Category 3: Batch Conversion (8 tests)
  // ===========================================================================
  describe('Category 3: Batch Conversion', () => {
    it('BC-001: getAllAsValueMatcherFormat returns all values', () => {
      const all = adapter.getAllAsValueMatcherFormat();
      expect(all.length).toBe(4); // 4 values in sample TTL
    });

    it('BC-002: All converted values have required fields', () => {
      const all = adapter.getAllAsValueMatcherFormat();
      all.forEach(v => {
        expect(v.name).toBeDefined();
        expect(v.domain).toBeDefined();
        expect(v.semanticMarkers).toBeDefined();
        expect(v.polarityIndicators).toBeDefined();
      });
    });

    it('BC-003: getValueDefinitionsObject returns { values: [...] } format', () => {
      const obj = adapter.getValueDefinitionsObject();
      expect(obj.values).toBeDefined();
      expect(Array.isArray(obj.values)).toBe(true);
    });

    it('BC-004: getValueDefinitionsObject includes metadata', () => {
      const obj = adapter.getValueDefinitionsObject();
      expect(obj.version).toBeDefined();
      expect(obj.source).toBe('valuenet');
    });

    it('BC-005: Filter values by BFO type', () => {
      const dispositions = adapter.getAllAsValueMatcherFormat({
        bfoType: 'bfo:0000016'
      });
      expect(dispositions.length).toBeGreaterThan(0);
    });

    it('BC-006: Filter values by namespace', () => {
      const vnValues = adapter.getAllAsValueMatcherFormat({
        namespace: 'vn'
      });
      expect(vnValues.length).toBe(4);
    });

    it('BC-007: Empty manager returns empty array', () => {
      const emptyManager = new OntologyManager();
      const emptyAdapter = new ValueNetAdapter(emptyManager);
      const all = emptyAdapter.getAllAsValueMatcherFormat();
      expect(all).toEqual([]);
    });

    it('BC-008: Batch conversion preserves all values', () => {
      const all = adapter.getAllAsValueMatcherFormat();
      const names = all.map(v => v.name);
      expect(names).toContain('Security');
      expect(names).toContain('Freedom');
      expect(names).toContain('Justice');
      expect(names).toContain('Beneficence');
    });
  });

  // ===========================================================================
  // Category 4: ValueMatcher Integration (10 tests)
  // ===========================================================================
  describe('Category 4: ValueMatcher Integration', () => {
    it('VM-001: createValueMatcher returns ValueMatcher instance', () => {
      const matcher = adapter.createValueMatcher();
      expect(matcher).toBeDefined();
      expect(typeof matcher.matchValues).toBe('function');
    });

    it('VM-002: Created ValueMatcher detects values in text', () => {
      const matcher = adapter.createValueMatcher();
      const results = matcher.matchValues('We must protect the safety of citizens');

      expect(results.length).toBeGreaterThan(0);
    });

    it('VM-003: ValueMatcher detects Security value', () => {
      const matcher = adapter.createValueMatcher();
      const results = matcher.matchValues('Ensure safety and protection for all');

      const security = results.find(r => r.name === 'Security');
      expect(security).toBeDefined();
    });

    it('VM-004: ValueMatcher detects polarity (upholding)', () => {
      const matcher = adapter.createValueMatcher();
      // Include keyword (safety) + upholding term (protect)
      const results = matcher.matchValues('We must protect safety and safeguard the community');

      const security = results.find(r => r.name === 'Security');
      expect(security).toBeDefined();
      expect(security.polarity).toBe(1); // Upholding
    });

    it('VM-005: ValueMatcher detects polarity (violating)', () => {
      const matcher = adapter.createValueMatcher();
      // Include keyword (safety) + violating term (endanger) - no upholding terms
      const results = matcher.matchValues('This action will endanger safety and threaten stability');

      const security = results.find(r => r.name === 'Security');
      expect(security).toBeDefined();
      expect(security.polarity).toBe(-1); // Violating
    });

    it('VM-006: ValueMatcher detects Freedom value', () => {
      const matcher = adapter.createValueMatcher();
      const results = matcher.matchValues('Citizens deserve liberty and independence');

      const freedom = results.find(r => r.name === 'Freedom');
      expect(freedom).toBeDefined();
    });

    it('VM-007: ValueMatcher detects Justice value', () => {
      const matcher = adapter.createValueMatcher();
      const results = matcher.matchValues('We must ensure fairness and equity');

      const justice = results.find(r => r.name === 'Justice');
      expect(justice).toBeDefined();
    });

    it('VM-008: ValueMatcher handles conflicted polarity', () => {
      const matcher = adapter.createValueMatcher();
      // Both upholding (protect) and violating (harm) present
      const results = matcher.matchValues('We protect some but harm others');

      const security = results.find(r => r.name === 'Security');
      if (security) {
        expect(security.polarity).toBe(0); // Conflicted
      }
    });

    it('VM-009: ValueMatcher provides evidence array', () => {
      const matcher = adapter.createValueMatcher();
      const results = matcher.matchValues('Safety and protection are paramount');

      const security = results.find(r => r.name === 'Security');
      expect(security).toBeDefined();
      expect(security.evidence.length).toBeGreaterThan(0);
    });

    it('VM-010: ValueMatcher getValueDefinition works', () => {
      const matcher = adapter.createValueMatcher();
      const def = matcher.getValueDefinition('Security');
      expect(def).toBeDefined();
      expect(def.name).toBe('Security');
    });
  });

  // ===========================================================================
  // Category 5: Conflict Handling (6 tests)
  // ===========================================================================
  describe('Category 5: Conflict Handling', () => {
    it('CF-001: getConflictsForValue returns conflicts', () => {
      const conflicts = adapter.getConflictsForValue('SecurityDisposition');
      expect(conflicts).toBeDefined();
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('CF-002: Conflict includes Freedom for Security', () => {
      const conflicts = adapter.getConflictsForValue('SecurityDisposition');
      expect(conflicts.some(c => c.includes('Freedom'))).toBe(true);
    });

    it('CF-003: Returns empty for value without conflicts', () => {
      const conflicts = adapter.getConflictsForValue('JusticeDisposition');
      expect(conflicts).toEqual([]);
    });

    it('CF-004: includeConflicts option adds relatedValues', () => {
      const converted = adapter.toValueMatcherFormat('SecurityDisposition', {
        includeConflicts: true
      });
      expect(converted.relatedValues).toBeDefined();
      expect(converted.relatedValues.conflicts).toBeDefined();
    });

    it('CF-005: Conflicts map to value names', () => {
      const converted = adapter.toValueMatcherFormat('SecurityDisposition', {
        includeConflicts: true
      });
      const conflictNames = converted.relatedValues.conflicts;
      expect(conflictNames.some(n => n.includes('Freedom'))).toBe(true);
    });

    it('CF-006: getAllConflictPairs returns all conflict pairs', () => {
      const pairs = adapter.getAllConflictPairs();
      expect(pairs.length).toBeGreaterThan(0);
      expect(pairs[0]).toHaveProperty('value1');
      expect(pairs[0]).toHaveProperty('value2');
    });
  });

  // ===========================================================================
  // Category 6: Integration and Edge Cases (8 tests)
  // ===========================================================================
  describe('Category 6: Integration and Edge Cases', () => {
    it('IE-001: Works with multiple loaded ontologies', () => {
      // Load additional ontology
      manager.loadFromString(`
        @prefix ethics: <http://example.org/ethics#> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
        ethics:HonestyDisposition a <http://purl.obolibrary.org/obo/BFO_0000016> ;
            rdfs:label "Honesty" ;
            ethics:keywords "truth, sincerity" .
      `, { format: 'turtle', namespace: 'ethics' });

      const all = adapter.getAllAsValueMatcherFormat();
      expect(all.length).toBe(5); // 4 + 1 new
    });

    it('IE-002: Handles Unicode in keywords', () => {
      manager.loadFromString(`
        @prefix vn: <https://test.org#> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
        vn:UniValue a <http://purl.obolibrary.org/obo/BFO_0000016> ;
            rdfs:label "Universal" ;
            vn:keywords "justice, \u516c\u6b63, \u6b63\u7fa9" .
      `, { format: 'turtle', namespace: 'uni' });

      const converted = adapter.toValueMatcherFormat('UniValue');
      expect(converted.semanticMarkers.length).toBeGreaterThan(0);
    });

    it('IE-003: Converted values are JSON-serializable', () => {
      const obj = adapter.getValueDefinitionsObject();
      const json = JSON.stringify(obj);
      const parsed = JSON.parse(json);
      expect(parsed.values.length).toBe(4);
    });

    it('IE-004: toJSON exports adapter state', () => {
      const json = adapter.toJSON();
      expect(json.valueCount).toBe(4);
      expect(json.source).toBe('valuenet');
    });

    it('IE-005: Handles prefixed IRI in value lookup', () => {
      const converted = adapter.toValueMatcherFormat('vn:SecurityDisposition');
      expect(converted).toBeDefined();
      expect(converted.name).toBe('Security');
    });

    it('IE-006: Custom domain override in conversion', () => {
      const converted = adapter.toValueMatcherFormat('SecurityDisposition', {
        domain: 'custom'
      });
      expect(converted.domain).toBe('custom');
    });

    it('IE-007: Batch conversion with custom domain', () => {
      const customAdapter = new ValueNetAdapter(manager, { defaultDomain: 'ethics' });
      const all = customAdapter.getAllAsValueMatcherFormat();
      all.forEach(v => {
        expect(v.domain).toBe('ethics');
      });
    });

    it('IE-008: Performance - convert 100 values under 50ms', () => {
      // Load many values
      let ttl = '@prefix vn: <https://perf.org#> .\n';
      for (let i = 0; i < 100; i++) {
        ttl += `vn:Value${i} a <http://purl.obolibrary.org/obo/BFO_0000016> ;
            <http://www.w3.org/2000/01/rdf-schema#label> "Value${i}" ;
            vn:keywords "keyword${i}" .\n`;
      }
      manager.loadFromString(ttl, { format: 'turtle', namespace: 'perf' });

      const start = Date.now();
      const all = adapter.getAllAsValueMatcherFormat();
      const elapsed = Date.now() - start;

      expect(all.length).toBeGreaterThanOrEqual(100);
      expect(elapsed).toBeLessThan(50);
    });
  });
});
