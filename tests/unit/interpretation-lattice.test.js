/**
 * InterpretationLattice Unit Tests - Phase 6.2
 *
 * Tests the lattice data structure that holds default and alternative
 * interpretations with resolution audit trail.
 */

const InterpretationLattice = require('../../src/graph/InterpretationLattice.js');

// Test runner
function describe(name, fn) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${name}`);
  console.log('='.repeat(60));
  fn();
}

function it(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    return true;
  } catch (e) {
    console.log(`  [FAIL] ${name}`);
    console.log(`         ${e.message}`);
    return false;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected "${expected}" but got "${actual}"`);
      }
    },
    toEqual(expected) {
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      if (actualStr !== expectedStr) {
        throw new Error(`Expected ${expectedStr} but got ${actualStr}`);
      }
    },
    toBeTrue() {
      if (actual !== true) throw new Error(`Expected true but got ${actual}`);
    },
    toBeFalse() {
      if (actual !== false) throw new Error(`Expected false but got ${actual}`);
    },
    toBeDefined() {
      if (actual === undefined) throw new Error('Expected value to be defined');
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null but got ${actual}`);
    },
    toHaveLength(expected) {
      if (!actual || actual.length !== expected) {
        throw new Error(`Expected length ${expected} but got ${actual ? actual.length : 0}`);
      }
    },
    toContain(item) {
      if (!actual || !actual.includes(item)) {
        throw new Error(`Expected to contain "${item}"`);
      }
    },
    toBeGreaterThan(expected) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    }
  };
}

let passed = 0;
let failed = 0;

// Mock data
const mockDefaultGraph = {
  '@graph': [
    { '@id': 'act_1', '@type': 'IntentionalAct', 'rdfs:label': 'allocate' }
  ]
};

const mockResolutions = {
  preserved: [
    {
      type: 'modal_force',
      nodeId: 'act_1',
      span: 'should allocate',
      readings: ['obligation', 'expectation'],
      resolution: {
        category: 'preserved',
        reason: 'balanced_evidence',
        confidence: 0.6
      }
    }
  ],
  resolved: [
    {
      type: 'noun_category',
      nodeId: 'entity_1',
      span: 'organization',
      defaultReading: 'continuant',
      resolution: {
        category: 'resolved',
        reason: 'selectional_match',
        confidence: 0.99
      }
    }
  ],
  flaggedOnly: [
    {
      type: 'selectional_violation',
      nodeId: 'act_2',
      span: 'rock decided',
      signal: 'inanimate_agent',
      resolution: {
        category: 'flaggedOnly',
        reason: 'anomalous_input'
      }
    }
  ]
};

const mockAlternative = {
  reading: 'expectation',
  plausibility: 0.3,
  derivedFrom: 'act_1',
  ambiguityType: 'modal_force',
  node: { '@id': 'act_1_alt_expectation', '@type': 'IntentionalAct' }
};

describe('InterpretationLattice', () => {

  describe('construction', () => {
    if (it('stores default reading', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      expect(lattice.getDefaultReading()).toBe(mockDefaultGraph);
    })) passed++; else failed++;

    if (it('stores resolutions', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      expect(lattice.resolutions.preserved).toHaveLength(1);
      expect(lattice.resolutions.resolved).toHaveLength(1);
      expect(lattice.resolutions.flaggedOnly).toHaveLength(1);
    })) passed++; else failed++;

    if (it('initializes empty alternativeReadings', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      expect(lattice.getAlternatives()).toHaveLength(0);
    })) passed++; else failed++;

    if (it('computes metadata on construction', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      expect(lattice.metadata).toBeDefined();
      expect(lattice.metadata.createdAt).toBeDefined();
      expect(lattice.metadata.ambiguityCount).toBe(3);
      expect(lattice.metadata.preservedCount).toBe(1);
    })) passed++; else failed++;

    if (it('handles null resolutions gracefully', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, null);
      expect(lattice.resolutions.preserved).toHaveLength(0);
      expect(lattice.metadata.ambiguityCount).toBe(0);
    })) passed++; else failed++;
  });

  describe('primary API', () => {
    if (it('getDefaultReading returns default reading', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      const result = lattice.getDefaultReading();
      expect(result['@graph']).toBeDefined();
      expect(result['@graph']).toHaveLength(1);
    })) passed++; else failed++;

    if (it('getAlternatives returns alternatives after adding', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      lattice.addAlternative(mockAlternative);
      const alts = lattice.getAlternatives();
      expect(alts).toHaveLength(1);
      expect(alts[0].reading).toBe('expectation');
    })) passed++; else failed++;

    if (it('addAlternative appends to alternativeReadings', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      lattice.addAlternative({ reading: 'alt1', plausibility: 0.3 });
      lattice.addAlternative({ reading: 'alt2', plausibility: 0.2 });
      expect(lattice.getAlternatives()).toHaveLength(2);
    })) passed++; else failed++;

    if (it('getAmbiguitiesPreserved returns preserved ambiguities', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      const preserved = lattice.getAmbiguitiesPreserved();
      expect(preserved).toHaveLength(1);
      expect(preserved[0].type).toBe('modal_force');
    })) passed++; else failed++;

    if (it('getAmbiguitiesResolved returns resolved ambiguities', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      const resolved = lattice.getAmbiguitiesResolved();
      expect(resolved).toHaveLength(1);
      expect(resolved[0].type).toBe('noun_category');
    })) passed++; else failed++;

    if (it('getAmbiguitiesFlagged returns flagged ambiguities', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      const flagged = lattice.getAmbiguitiesFlagged();
      expect(flagged).toHaveLength(1);
      expect(flagged[0].type).toBe('selectional_violation');
    })) passed++; else failed++;
  });

  describe('analysis API', () => {
    if (it('hasSignificantAmbiguity returns true when preserved.length > 0', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      expect(lattice.hasSignificantAmbiguity()).toBeTrue();
    })) passed++; else failed++;

    if (it('hasSignificantAmbiguity returns false for empty preserved', () => {
      const noPreserved = {
        preserved: [],
        resolved: [{ type: 'test' }],
        flaggedOnly: []
      };
      const lattice = new InterpretationLattice(mockDefaultGraph, noPreserved);
      expect(lattice.hasSignificantAmbiguity()).toBeFalse();
    })) passed++; else failed++;

    if (it('hasAnomalies returns true when flaggedOnly.length > 0', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      expect(lattice.hasAnomalies()).toBeTrue();
    })) passed++; else failed++;

    if (it('getInterpretationCount returns 1 + alternatives', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      expect(lattice.getInterpretationCount()).toBe(1);
      lattice.addAlternative(mockAlternative);
      expect(lattice.getInterpretationCount()).toBe(2);
    })) passed++; else failed++;

    if (it('getResolutionReasoning includes all categories', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      const reasoning = lattice.getResolutionReasoning();

      expect(reasoning.preserved).toBeDefined();
      expect(reasoning.resolved).toBeDefined();
      expect(reasoning.flagged).toBeDefined();

      expect(reasoning.preserved[0].reason).toBe('balanced_evidence');
      expect(reasoning.resolved[0].reason).toBe('selectional_match');
      expect(reasoning.flagged[0].reason).toBe('anomalous_input');
    })) passed++; else failed++;

    if (it('getAlternativesForNode filters by derivedFrom', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      lattice.addAlternative({ derivedFrom: 'act_1', reading: 'alt1' });
      lattice.addAlternative({ derivedFrom: 'act_2', reading: 'alt2' });
      lattice.addAlternative({ derivedFrom: 'act_1', reading: 'alt3' });

      const forAct1 = lattice.getAlternativesForNode('act_1');
      expect(forAct1).toHaveLength(2);
    })) passed++; else failed++;

    if (it('getMostPlausibleAlternative returns highest plausibility', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      lattice.addAlternative({ reading: 'low', plausibility: 0.2 });
      lattice.addAlternative({ reading: 'high', plausibility: 0.5 });
      lattice.addAlternative({ reading: 'mid', plausibility: 0.3 });

      const best = lattice.getMostPlausibleAlternative();
      expect(best.reading).toBe('high');
      expect(best.plausibility).toBe(0.5);
    })) passed++; else failed++;

    if (it('getMostPlausibleAlternative returns null for no alternatives', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      expect(lattice.getMostPlausibleAlternative()).toBeNull();
    })) passed++; else failed++;
  });

  describe('serialization', () => {
    if (it('toJSONLD includes @type', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      const jsonld = lattice.toJSONLD();
      expect(jsonld['@type']).toBe('tagteam:InterpretationLattice');
    })) passed++; else failed++;

    if (it('toJSONLD includes defaultReading', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      const jsonld = lattice.toJSONLD();
      expect(jsonld['tagteam:defaultReading']).toBeDefined();
    })) passed++; else failed++;

    if (it('toJSONLD includes alternativeReadings', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      lattice.addAlternative(mockAlternative);
      const jsonld = lattice.toJSONLD();

      expect(jsonld['tagteam:alternativeReadings']).toHaveLength(1);
      const alt = jsonld['tagteam:alternativeReadings'][0];
      expect(alt['@type']).toBe('tagteam:AlternativeReading');
      expect(alt['tagteam:plausibility']).toBe(0.3);
    })) passed++; else failed++;

    if (it('toJSONLD includes resolutionLog', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      const jsonld = lattice.toJSONLD();
      expect(jsonld['tagteam:resolutionLog']).toBeDefined();
      expect(jsonld['tagteam:resolutionLog'].preserved).toBeDefined();
    })) passed++; else failed++;

    if (it('toJSONLD includes metadata', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      const jsonld = lattice.toJSONLD();
      expect(jsonld['tagteam:metadata']).toBeDefined();
      expect(jsonld['tagteam:metadata'].createdAt).toBeDefined();
    })) passed++; else failed++;

    if (it('toSimplifiedGraph returns only default reading (backwards compatible)', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      lattice.addAlternative(mockAlternative);

      const simplified = lattice.toSimplifiedGraph();
      expect(simplified).toBe(mockDefaultGraph);
    })) passed++; else failed++;

    if (it('toString returns readable summary', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      const str = lattice.toString();
      expect(str).toContain('InterpretationLattice');
      expect(str).toContain('Preserved: 1');
      expect(str).toContain('AMBIGUOUS');
    })) passed++; else failed++;
  });

  describe('Phase 6.2 acceptance criteria', () => {
    // AC 6.2.1: Constructor accepts defaultGraph and resolutions
    if (it('AC 6.2.1: Constructor accepts defaultGraph and resolutions', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      expect(lattice.defaultReading).toBe(mockDefaultGraph);
      expect(lattice.resolutions).toBe(mockResolutions);
    })) passed++; else failed++;

    // AC 6.2.6: hasSignificantAmbiguity returns true when preserved.length > 0
    if (it('AC 6.2.6: hasSignificantAmbiguity returns true when preserved', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      expect(lattice.hasSignificantAmbiguity()).toBeTrue();
    })) passed++; else failed++;

    // AC 6.2.8: toJSONLD produces valid JSON-LD with @type
    if (it('AC 6.2.8: toJSONLD produces valid JSON-LD', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      const jsonld = lattice.toJSONLD();
      expect(jsonld['@type']).toBe('tagteam:InterpretationLattice');
    })) passed++; else failed++;

    // AC 6.2.9: toSimplifiedGraph returns only default reading
    if (it('AC 6.2.9: toSimplifiedGraph is backwards compatible', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      expect(lattice.toSimplifiedGraph()).toBe(mockDefaultGraph);
    })) passed++; else failed++;

    // AC 6.2.10: Metadata includes createdAt, ambiguityCount, preservedCount
    if (it('AC 6.2.10: Metadata includes required fields', () => {
      const lattice = new InterpretationLattice(mockDefaultGraph, mockResolutions);
      expect(lattice.metadata.createdAt).toBeDefined();
      expect(lattice.metadata.ambiguityCount).toBe(3);
      expect(lattice.metadata.preservedCount).toBe(1);
    })) passed++; else failed++;
  });

});

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
