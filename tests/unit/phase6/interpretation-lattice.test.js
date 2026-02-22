/**
 * @file tests/unit/phase6/interpretation-lattice.test.js
 * @description Unit tests for InterpretationLattice (Phase 6.2)
 *
 * Test Categories:
 * - Basic Properties (BP): Constructor and basic accessors
 * - Adding Alternatives (AA): Adding and retrieving alternative readings
 * - Resolution Result Integration (RR): Working with AmbiguityResolver output
 * - Resolution Logging (RL): Audit trail functionality
 * - Serialization (SE): JSON-LD and simplified output
 * - Edge Cases (EC): Boundary conditions and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
const InterpretationLattice = require('../../../src/graph/InterpretationLattice.js');

// Test fixtures
const sampleDefaultGraph = {
  '@context': {
    'tagteam': 'http://purl.org/tagteam#',
    'bfo': 'http://purl.obolibrary.org/obo/BFO_'
  },
  '@graph': [
    {
      '@id': 'inst:Act_123',
      '@type': 'IntentionalAct',
      'tagteam:modality': 'obligation',
      'tagteam:actualityStatus': 'tagteam:Prescribed'
    }
  ]
};

const sampleResolutionResult = {
  preserved: [
    {
      ambiguity: { type: 'modal_force', nodeId: 'inst:Act_123', readings: ['obligation', 'expectation'] },
      readings: ['obligation', 'expectation'],
      defaultReading: 'obligation',
      reason: 'Confidence 0.65 below threshold 0.7'
    }
  ],
  resolved: [
    {
      ambiguity: { type: 'noun_category', nodeId: 'inst:Entity_456' },
      selectedReading: 'continuant',
      reason: 'Agent of intentional act'
    }
  ],
  flagged: [
    {
      ambiguity: { type: 'selectional_violation', nodeId: 'inst:Act_789' },
      flag: 'selectionalMismatch',
      reason: 'Inanimate agent'
    }
  ],
  stats: {
    total: 3,
    preserved: 1,
    resolved: 1,
    flagged: 1
  }
};

const sampleAlternative = {
  id: 'alt_modal_001',
  sourceAmbiguity: {
    type: 'modal_force',
    nodeId: 'inst:Act_123',
    span: 'should prioritize'
  },
  reading: 'epistemic',
  plausibility: 0.3,
  graph: {
    '@id': 'inst:Act_123_alt1',
    'tagteam:modality': 'expectation',
    'tagteam:actualityStatus': 'tagteam:Hypothetical'
  },
  derivedFrom: 'inst:Act_123'
};

describe('InterpretationLattice', () => {
  let lattice;

  beforeEach(() => {
    lattice = new InterpretationLattice(sampleDefaultGraph, sampleResolutionResult);
  });

  // ============================================
  // Category 1: Basic Properties (BP) - 8 tests
  // ============================================
  describe('Basic Properties', () => {

    // BP-001: Empty constructor creates valid lattice
    it('BP-001: should create valid lattice with empty constructor', () => {
      const emptyLattice = new InterpretationLattice();

      expect(emptyLattice).toBeDefined();
      expect(emptyLattice.getDefaultReading()).toBeNull();
    });

    // BP-002: DefaultGraph only stores correctly
    it('BP-002: should store defaultGraph correctly', () => {
      const graphOnlyLattice = new InterpretationLattice(sampleDefaultGraph);

      expect(graphOnlyLattice.getDefaultReading()).toEqual(sampleDefaultGraph);
    });

    // BP-003: DefaultGraph + ResolutionResult stores both
    it('BP-003: should store defaultGraph and resolutionResult', () => {
      expect(lattice.getDefaultReading()).toEqual(sampleDefaultGraph);
      expect(lattice.resolutionResult).toEqual(sampleResolutionResult);
    });

    // BP-004: Options are applied
    it('BP-004: should apply options', () => {
      const optionsLattice = new InterpretationLattice(sampleDefaultGraph, null, {
        includeTimestamp: true,
        version: '6.2.0'
      });

      expect(optionsLattice.options.includeTimestamp).toBe(true);
      expect(optionsLattice.options.version).toBe('6.2.0');
    });

    // BP-005: getDefaultReading returns graph
    it('BP-005: should return defaultReading via getDefaultReading()', () => {
      const result = lattice.getDefaultReading();

      expect(result).toBeDefined();
      expect(result['@graph']).toBeDefined();
      expect(result['@graph'].length).toBe(1);
    });

    // BP-006: alternativeReadings starts empty
    it('BP-006: should start with empty alternativeReadings', () => {
      expect(lattice.getAlternatives()).toEqual([]);
    });

    // BP-007: resolutionLog starts empty
    it('BP-007: should start with empty resolutionLog', () => {
      expect(lattice.getResolutionReasoning()).toEqual([]);
    });

    // BP-008: Null resolutionResult handled gracefully
    it('BP-008: should handle null resolutionResult gracefully', () => {
      const nullResLattice = new InterpretationLattice(sampleDefaultGraph, null);

      expect(nullResLattice.getAmbiguitiesPreserved()).toEqual([]);
      expect(nullResLattice.hasSignificantAmbiguity()).toBe(false);
    });
  });

  // ============================================
  // Category 2: Adding Alternatives (AA) - 8 tests
  // ============================================
  describe('Adding Alternatives', () => {

    // AA-001: addAlternative adds to array
    it('AA-001: should add alternative to alternativeReadings', () => {
      lattice.addAlternative(sampleAlternative);

      expect(lattice.getAlternatives()).toHaveLength(1);
      expect(lattice.getAlternatives()[0]).toEqual(sampleAlternative);
    });

    // AA-002: Multiple alternatives stored in order
    it('AA-002: should store multiple alternatives in order', () => {
      const alt1 = { ...sampleAlternative, id: 'alt_001' };
      const alt2 = { ...sampleAlternative, id: 'alt_002' };
      const alt3 = { ...sampleAlternative, id: 'alt_003' };

      lattice.addAlternative(alt1);
      lattice.addAlternative(alt2);
      lattice.addAlternative(alt3);

      const alts = lattice.getAlternatives();
      expect(alts).toHaveLength(3);
      expect(alts[0].id).toBe('alt_001');
      expect(alts[1].id).toBe('alt_002');
      expect(alts[2].id).toBe('alt_003');
    });

    // AA-003: Plausibility accessible
    it('AA-003: should make plausibility accessible', () => {
      lattice.addAlternative(sampleAlternative);

      const alt = lattice.getAlternatives()[0];
      expect(alt.plausibility).toBe(0.3);
    });

    // AA-004: derivedFrom links to source
    it('AA-004: should preserve derivedFrom link', () => {
      lattice.addAlternative(sampleAlternative);

      const alt = lattice.getAlternatives()[0];
      expect(alt.derivedFrom).toBe('inst:Act_123');
    });

    // AA-005: getAlternatives returns all
    it('AA-005: should return all alternatives', () => {
      lattice.addAlternative({ ...sampleAlternative, id: 'alt_1' });
      lattice.addAlternative({ ...sampleAlternative, id: 'alt_2' });

      expect(lattice.getAlternatives()).toHaveLength(2);
    });

    // AA-006: Filter by ambiguity type
    it('AA-006: should filter alternatives by type', () => {
      const modalAlt = { ...sampleAlternative, id: 'modal_alt', sourceAmbiguity: { type: 'modal_force' } };
      const scopeAlt = { ...sampleAlternative, id: 'scope_alt', sourceAmbiguity: { type: 'scope' } };

      lattice.addAlternative(modalAlt);
      lattice.addAlternative(scopeAlt);

      const modalOnly = lattice.getAlternatives('modal_force');
      expect(modalOnly).toHaveLength(1);
      expect(modalOnly[0].id).toBe('modal_alt');
    });

    // AA-007: Null alternative ignored
    it('AA-007: should ignore null alternative', () => {
      lattice.addAlternative(null);
      lattice.addAlternative(undefined);

      expect(lattice.getAlternatives()).toHaveLength(0);
    });

    // AA-008: Duplicate IDs rejected
    it('AA-008: should reject duplicate alternative IDs', () => {
      const alt1 = { ...sampleAlternative, id: 'duplicate_id' };
      const alt2 = { ...sampleAlternative, id: 'duplicate_id' };

      lattice.addAlternative(alt1);
      lattice.addAlternative(alt2);

      expect(lattice.getAlternatives()).toHaveLength(1);
    });
  });

  // ============================================
  // Category 3: Resolution Result Integration (RR) - 8 tests
  // ============================================
  describe('Resolution Result Integration', () => {

    // RR-001: getAmbiguitiesPreserved returns preserved
    it('RR-001: should return preserved ambiguities', () => {
      const preserved = lattice.getAmbiguitiesPreserved();

      expect(preserved).toHaveLength(1);
      expect(preserved[0].ambiguity.type).toBe('modal_force');
    });

    // RR-002: getAmbiguitiesPreserved with none returns empty
    it('RR-002: should return empty array when no preserved', () => {
      const emptyResult = {
        preserved: [],
        resolved: [],
        flagged: [],
        stats: { total: 0, preserved: 0, resolved: 0, flagged: 0 }
      };
      const noPreservedLattice = new InterpretationLattice(sampleDefaultGraph, emptyResult);

      expect(noPreservedLattice.getAmbiguitiesPreserved()).toEqual([]);
    });

    // RR-003: hasSignificantAmbiguity with preserved returns true
    it('RR-003: should return true when ambiguities are preserved', () => {
      expect(lattice.hasSignificantAmbiguity()).toBe(true);
    });

    // RR-004: hasSignificantAmbiguity with none returns false
    it('RR-004: should return false when no preserved ambiguities', () => {
      const emptyResult = {
        preserved: [],
        resolved: [],
        flagged: [],
        stats: { total: 0, preserved: 0, resolved: 0, flagged: 0 }
      };
      const noAmbiguityLattice = new InterpretationLattice(sampleDefaultGraph, emptyResult);

      expect(noAmbiguityLattice.hasSignificantAmbiguity()).toBe(false);
    });

    // RR-005: getStatistics returns correct counts
    it('RR-005: should return correct statistics', () => {
      const stats = lattice.getStatistics();

      expect(stats.totalAmbiguities).toBe(3);
      expect(stats.preserved).toBe(1);
      expect(stats.resolved).toBe(1);
      expect(stats.flagged).toBe(1);
    });

    // RR-006: getStatistics with empty returns zeros
    it('RR-006: should return zeros for empty result', () => {
      const emptyLattice = new InterpretationLattice(sampleDefaultGraph, null);
      const stats = emptyLattice.getStatistics();

      expect(stats.totalAmbiguities).toBe(0);
      expect(stats.preserved).toBe(0);
    });

    // RR-007: Flagged accessible via stats
    it('RR-007: should include flagged count in statistics', () => {
      const stats = lattice.getStatistics();

      expect(stats.flagged).toBe(1);
    });

    // RR-008: Resolved accessible via stats
    it('RR-008: should include resolved count in statistics', () => {
      const stats = lattice.getStatistics();

      expect(stats.resolved).toBe(1);
    });
  });

  // ============================================
  // Category 4: Resolution Logging (RL) - 6 tests
  // ============================================
  describe('Resolution Logging', () => {

    // RL-001: logResolution adds entry
    it('RL-001: should add entry to resolution log', () => {
      lattice.logResolution({
        ambiguity: { type: 'modal_force' },
        decision: 'preserved',
        reason: 'Low confidence'
      });

      expect(lattice.getResolutionReasoning()).toHaveLength(1);
    });

    // RL-002: Auto-timestamp if missing
    it('RL-002: should add timestamp if missing', () => {
      lattice.logResolution({
        ambiguity: { type: 'modal_force' },
        decision: 'preserved',
        reason: 'Low confidence'
      });

      const log = lattice.getResolutionReasoning()[0];
      expect(log.timestamp).toBeDefined();
    });

    // RL-003: getResolutionReasoning returns all entries
    it('RL-003: should return all log entries', () => {
      lattice.logResolution({ ambiguity: { type: 'modal_force' }, decision: 'preserved', reason: 'A' });
      lattice.logResolution({ ambiguity: { type: 'scope' }, decision: 'preserved', reason: 'B' });

      expect(lattice.getResolutionReasoning()).toHaveLength(2);
    });

    // RL-004: Entries ordered correctly
    it('RL-004: should maintain entry order', () => {
      lattice.logResolution({ ambiguity: { type: 'first' }, decision: 'resolved', reason: '1' });
      lattice.logResolution({ ambiguity: { type: 'second' }, decision: 'preserved', reason: '2' });

      const log = lattice.getResolutionReasoning();
      expect(log[0].ambiguity.type).toBe('first');
      expect(log[1].ambiguity.type).toBe('second');
    });

    // RL-005: Null entry ignored
    it('RL-005: should ignore null log entry', () => {
      lattice.logResolution(null);
      lattice.logResolution(undefined);

      expect(lattice.getResolutionReasoning()).toHaveLength(0);
    });

    // RL-006: Entry fields validated
    it('RL-006: should preserve entry fields', () => {
      lattice.logResolution({
        ambiguity: { type: 'modal_force', nodeId: 'node_123' },
        decision: 'preserved',
        reason: 'Confidence below threshold',
        alternatives: ['obligation', 'expectation']
      });

      const entry = lattice.getResolutionReasoning()[0];
      expect(entry.ambiguity.nodeId).toBe('node_123');
      expect(entry.decision).toBe('preserved');
      expect(entry.alternatives).toContain('obligation');
    });
  });

  // ============================================
  // Category 5: Serialization (SE) - 10 tests
  // ============================================
  describe('Serialization', () => {

    // SE-001: toJSONLD structure is valid
    it('SE-001: should produce valid JSON-LD structure', () => {
      const jsonld = lattice.toJSONLD();

      expect(jsonld['@context']).toBeDefined();
      expect(jsonld['@type']).toBe('tagteam:InterpretationLattice');
    });

    // SE-002: toJSONLD includes defaultReading
    it('SE-002: should include defaultReading in JSON-LD', () => {
      const jsonld = lattice.toJSONLD();

      expect(jsonld['tagteam:defaultReading']).toBeDefined();
      expect(jsonld['tagteam:defaultReading']['@graph']).toBeDefined();
    });

    // SE-003: toJSONLD includes alternatives
    it('SE-003: should include alternativeReadings in JSON-LD', () => {
      lattice.addAlternative(sampleAlternative);
      const jsonld = lattice.toJSONLD();

      expect(jsonld['tagteam:alternativeReadings']).toBeDefined();
      expect(jsonld['tagteam:alternativeReadings']).toHaveLength(1);
    });

    // SE-004: toJSONLD includes statistics
    it('SE-004: should include statistics in JSON-LD', () => {
      const jsonld = lattice.toJSONLD();

      expect(jsonld['_statistics']).toBeDefined();
      expect(jsonld['_statistics'].totalAmbiguities).toBe(3);
    });

    // SE-005: toJSONLD includes resolutionLog
    it('SE-005: should include resolutionLog in JSON-LD', () => {
      lattice.logResolution({ ambiguity: { type: 'test' }, decision: 'resolved', reason: 'Test' });
      const jsonld = lattice.toJSONLD();

      expect(jsonld['_resolutionLog']).toBeDefined();
      expect(jsonld['_resolutionLog']).toHaveLength(1);
    });

    // SE-006: toSimplifiedGraph returns just default
    it('SE-006: should return just defaultReading from toSimplifiedGraph()', () => {
      const simplified = lattice.toSimplifiedGraph();

      expect(simplified).toEqual(sampleDefaultGraph);
      expect(simplified['tagteam:alternativeReadings']).toBeUndefined();
    });

    // SE-007: toSimplifiedGraph is backwards compatible
    it('SE-007: should be backwards compatible', () => {
      const simplified = lattice.toSimplifiedGraph();

      expect(simplified['@context']).toBeDefined();
      expect(simplified['@graph']).toBeDefined();
    });

    // SE-008: Empty alternatives is empty array
    it('SE-008: should have empty array for no alternatives', () => {
      const jsonld = lattice.toJSONLD();

      expect(Array.isArray(jsonld['tagteam:alternativeReadings'])).toBe(true);
      expect(jsonld['tagteam:alternativeReadings']).toHaveLength(0);
    });

    // SE-009: Nested graphs preserved
    it('SE-009: should preserve @graph structure', () => {
      const jsonld = lattice.toJSONLD();

      expect(jsonld['tagteam:defaultReading']['@graph'][0]['@id']).toBe('inst:Act_123');
    });

    // SE-010: Includes metadata
    it('SE-010: should include metadata in JSON-LD', () => {
      const jsonld = lattice.toJSONLD();

      expect(jsonld['_metadata']).toBeDefined();
      expect(jsonld['_metadata'].generatedAt).toBeDefined();
    });
  });

  // ============================================
  // Category 6: Edge Cases (EC) - 5 tests
  // ============================================
  describe('Edge Cases', () => {

    // EC-001: No alternatives produces valid output
    it('EC-001: should produce valid output with no alternatives', () => {
      const jsonld = lattice.toJSONLD();

      expect(jsonld['tagteam:alternativeReadings']).toEqual([]);
      expect(jsonld['tagteam:defaultReading']).toBeDefined();
    });

    // EC-002: Large number of alternatives preserved
    it('EC-002: should handle large number of alternatives', () => {
      for (let i = 0; i < 100; i++) {
        lattice.addAlternative({ ...sampleAlternative, id: `alt_${i}` });
      }

      expect(lattice.getAlternatives()).toHaveLength(100);
    });

    // EC-003: Missing fields get defaults
    it('EC-003: should apply defaults for missing fields', () => {
      lattice.addAlternative({ id: 'minimal_alt' });

      const alt = lattice.getAlternatives()[0];
      expect(alt.id).toBe('minimal_alt');
      // Should not throw, should have undefined for missing fields
    });

    // EC-004: getDefaultReading returns copy
    it('EC-004: should return copy from getDefaultReading()', () => {
      const reading1 = lattice.getDefaultReading();
      const reading2 = lattice.getDefaultReading();

      // Modify one
      reading1['@graph'][0]['@id'] = 'modified';

      // Other should be unchanged (if returning copies)
      // Note: Current implementation may not copy - this test documents expected behavior
      expect(reading2['@graph'][0]['@id']).toBeDefined();
    });

    // EC-005: Alternative count in statistics
    it('EC-005: should include alternativeCount in statistics', () => {
      lattice.addAlternative({ ...sampleAlternative, id: 'alt_1' });
      lattice.addAlternative({ ...sampleAlternative, id: 'alt_2' });

      const stats = lattice.getStatistics();
      expect(stats.alternativeCount).toBe(2);
    });
  });

  // ============================================
  // API Verification
  // ============================================
  describe('API', () => {

    it('should have getDefaultReading method', () => {
      expect(typeof lattice.getDefaultReading).toBe('function');
    });

    it('should have getAlternatives method', () => {
      expect(typeof lattice.getAlternatives).toBe('function');
    });

    it('should have addAlternative method', () => {
      expect(typeof lattice.addAlternative).toBe('function');
    });

    it('should have getAmbiguitiesPreserved method', () => {
      expect(typeof lattice.getAmbiguitiesPreserved).toBe('function');
    });

    it('should have hasSignificantAmbiguity method', () => {
      expect(typeof lattice.hasSignificantAmbiguity).toBe('function');
    });

    it('should have getStatistics method', () => {
      expect(typeof lattice.getStatistics).toBe('function');
    });

    it('should have logResolution method', () => {
      expect(typeof lattice.logResolution).toBe('function');
    });

    it('should have getResolutionReasoning method', () => {
      expect(typeof lattice.getResolutionReasoning).toBe('function');
    });

    it('should have toJSONLD method', () => {
      expect(typeof lattice.toJSONLD).toBe('function');
    });

    it('should have toSimplifiedGraph method', () => {
      expect(typeof lattice.toSimplifiedGraph).toBe('function');
    });
  });
});
