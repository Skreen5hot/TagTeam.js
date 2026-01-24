/**
 * AlternativeGraphBuilder Unit Tests - Phase 6.3
 *
 * Tests the generation of alternative graph nodes for preserved ambiguities.
 */

const AlternativeGraphBuilder = require('../../src/graph/AlternativeGraphBuilder.js');

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
    },
    toBeLessThan(expected) {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toBeCloseTo(expected, precision = 2) {
      const multiplier = Math.pow(10, precision);
      const actualRounded = Math.round(actual * multiplier) / multiplier;
      const expectedRounded = Math.round(expected * multiplier) / multiplier;
      if (actualRounded !== expectedRounded) {
        throw new Error(`Expected ${actual} to be close to ${expected} (precision: ${precision})`);
      }
    }
  };
}

let passed = 0;
let failed = 0;

// Mock graph
const mockGraph = {
  '@graph': [
    {
      '@id': 'act_1',
      '@type': 'cco:IntentionalAct',
      'rdfs:label': 'allocate',
      'tagteam:modality': 'obligation'
    },
    {
      '@id': 'entity_1',
      '@type': 'cco:Organization',
      'rdfs:label': 'organization'
    }
  ]
};

const builder = new AlternativeGraphBuilder();

describe('AlternativeGraphBuilder', () => {

  describe('basic functionality', () => {
    if (it('build() returns array of alternative readings', () => {
      const ambiguity = {
        type: 'modal_force',
        nodeId: 'act_1',
        readings: ['obligation', 'expectation'],
        defaultReading: 'obligation'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(Array.isArray(alternatives)).toBeTrue();
      expect(alternatives).toHaveLength(1); // One alternative (not default)
    })) passed++; else failed++;

    if (it('handles null/empty ambiguity gracefully', () => {
      expect(builder.build(mockGraph, null)).toHaveLength(0);
      expect(builder.build(mockGraph, {})).toHaveLength(0);
    })) passed++; else failed++;

    if (it('returns empty array for unknown ambiguity types with no readings', () => {
      const ambiguity = { type: 'unknown_type' };
      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives).toHaveLength(0);
    })) passed++; else failed++;
  });

  describe('modal_force alternatives', () => {
    if (it('creates alternative for non-default reading', () => {
      const ambiguity = {
        type: 'modal_force',
        nodeId: 'act_1',
        readings: ['obligation', 'expectation'],
        defaultReading: 'obligation'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives).toHaveLength(1);
      expect(alternatives[0].reading).toBe('expectation');
    })) passed++; else failed++;

    if (it('assigns unique IRI with _alt_ suffix', () => {
      const ambiguity = {
        type: 'modal_force',
        nodeId: 'act_1',
        readings: ['obligation', 'expectation'],
        defaultReading: 'obligation'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives[0].node['@id']).toContain('_alt_');
      expect(alternatives[0].node['@id']).toBe('act_1_alt_expectation');
    })) passed++; else failed++;

    if (it('maps obligation to Prescribed actuality', () => {
      const ambiguity = {
        type: 'modal_force',
        nodeId: 'act_1',
        readings: ['expectation', 'obligation'],
        defaultReading: 'expectation'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      const obligationAlt = alternatives.find(a => a.reading === 'obligation');
      expect(obligationAlt.actualityStatus).toBe('tagteam:Prescribed');
    })) passed++; else failed++;

    if (it('maps expectation to Hypothetical actuality', () => {
      const ambiguity = {
        type: 'modal_force',
        nodeId: 'act_1',
        readings: ['obligation', 'expectation'],
        defaultReading: 'obligation'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives[0].actualityStatus).toBe('tagteam:Hypothetical');
    })) passed++; else failed++;

    if (it('includes derivedFrom link', () => {
      const ambiguity = {
        type: 'modal_force',
        nodeId: 'act_1',
        readings: ['obligation', 'expectation'],
        defaultReading: 'obligation'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives[0].derivedFrom).toBe('act_1');
      expect(alternatives[0].node['tagteam:derivedFrom']['@id']).toBe('act_1');
    })) passed++; else failed++;

    if (it('assigns plausibility scores', () => {
      const ambiguity = {
        type: 'modal_force',
        nodeId: 'act_1',
        readings: ['obligation', 'expectation'],
        defaultReading: 'obligation'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives[0].plausibility).toBeDefined();
      expect(alternatives[0].plausibility).toBeGreaterThan(0);
      expect(alternatives[0].plausibility).toBeLessThan(1);
    })) passed++; else failed++;

    if (it('default gets 0.7, alternatives split 0.3', () => {
      const ambiguity = {
        type: 'modal_force',
        nodeId: 'act_1',
        readings: ['obligation', 'expectation'],
        defaultReading: 'obligation'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      // One alternative, so it gets all of 0.3
      expect(alternatives[0].plausibility).toBeCloseTo(0.3);
    })) passed++; else failed++;

    if (it('splits remaining probability among multiple alternatives', () => {
      const ambiguity = {
        type: 'modal_force',
        nodeId: 'act_1',
        readings: ['obligation', 'expectation', 'inference'],
        defaultReading: 'obligation'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives).toHaveLength(2);
      // Each alternative gets 0.3 / 2 = 0.15
      expect(alternatives[0].plausibility).toBeCloseTo(0.15);
      expect(alternatives[1].plausibility).toBeCloseTo(0.15);
    })) passed++; else failed++;
  });

  describe('scope alternatives', () => {
    if (it('creates narrow scope alternative', () => {
      const ambiguity = {
        type: 'scope',
        nodeId: 'scope_1',
        readings: ['wide', 'narrow'],
        defaultReading: 'wide',
        formalizations: {
          wide: '¬∀x.P(x)',
          narrow: '∀x.¬P(x)'
        }
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives).toHaveLength(1);
      expect(alternatives[0].reading).toBe('narrow');
    })) passed++; else failed++;

    if (it('includes formalization in alternative', () => {
      const ambiguity = {
        type: 'scope',
        nodeId: 'scope_1',
        readings: ['wide', 'narrow'],
        defaultReading: 'wide',
        formalizations: {
          wide: '¬∀x.P(x)',
          narrow: '∀x.¬P(x)'
        }
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives[0].formalization).toBe('∀x.¬P(x)');
      expect(alternatives[0].node['tagteam:formalization']).toBe('∀x.¬P(x)');
    })) passed++; else failed++;

    if (it('assigns lower plausibility to scope alternatives', () => {
      const ambiguity = {
        type: 'scope',
        nodeId: 'scope_1',
        readings: ['wide', 'narrow'],
        defaultReading: 'wide'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      // Narrow scope gets 0.35 (lower than typical alternatives)
      expect(alternatives[0].plausibility).toBeLessThan(0.5);
    })) passed++; else failed++;
  });

  describe('noun_category alternatives', () => {
    if (it('creates process reading alternative', () => {
      const ambiguity = {
        type: 'noun_category',
        nodeId: 'entity_1',
        readings: ['process', 'continuant'],
        defaultReading: 'continuant'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives).toHaveLength(1);
      expect(alternatives[0].reading).toBe('process');
    })) passed++; else failed++;

    if (it('adds bfo:Process type for process reading', () => {
      const ambiguity = {
        type: 'noun_category',
        nodeId: 'entity_1',
        readings: ['process', 'continuant'],
        defaultReading: 'continuant'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives[0].node['@type']).toContain('bfo:Process');
    })) passed++; else failed++;

    if (it('adds nominalizationReading annotation', () => {
      const ambiguity = {
        type: 'noun_category',
        nodeId: 'entity_1',
        readings: ['process', 'continuant'],
        defaultReading: 'continuant'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives[0].node['tagteam:nominalizationReading']).toBe('process');
    })) passed++; else failed++;
  });

  describe('potential_metonymy alternatives (Metonymic Bridge)', () => {
    if (it('creates institutional alternative for location', () => {
      const ambiguity = {
        type: 'potential_metonymy',
        nodeId: 'location_1',
        span: 'The White House',
        signal: 'location_as_agent'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives).toHaveLength(1);
      expect(alternatives[0].reading).toBe('institution');
    })) passed++; else failed++;

    if (it('re-types as cco:Organization', () => {
      const ambiguity = {
        type: 'potential_metonymy',
        nodeId: 'location_1',
        span: 'The White House'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives[0].suggestedType).toBe('cco:Organization');
      expect(alternatives[0].node['@type']).toContain('cco:Organization');
    })) passed++; else failed++;

    if (it('preserves original source text as metonymicSource', () => {
      const ambiguity = {
        type: 'potential_metonymy',
        nodeId: 'location_1',
        span: 'The White House'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives[0].metonymicSource).toBe('The White House');
      expect(alternatives[0].node['tagteam:metonymicSource']).toBe('The White House');
    })) passed++; else failed++;

    if (it('records literal type as cco:Artifact', () => {
      const ambiguity = {
        type: 'potential_metonymy',
        nodeId: 'location_1',
        span: 'The White House'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives[0].node['tagteam:literalType']).toBe('cco:Artifact');
    })) passed++; else failed++;
  });

  describe('intensifier detection', () => {
    if (it('boosts epistemic reading when epistemic intensifier present', () => {
      const ambiguity = {
        type: 'modal_force',
        nodeId: 'act_1',
        span: 'probably should allocate',
        readings: ['obligation', 'expectation'],
        defaultReading: 'obligation'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      // "probably" is epistemic intensifier, should boost expectation
      // Base would be 0.3, boost adds 0.15 = 0.45
      expect(alternatives[0].plausibility).toBeGreaterThan(0.3);
    })) passed++; else failed++;

    if (it('boosts deontic reading when deontic intensifier present', () => {
      const ambiguity = {
        type: 'modal_force',
        nodeId: 'act_1',
        span: 'definitely must allocate',
        readings: ['expectation', 'obligation'],
        defaultReading: 'expectation'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      // "definitely" is deontic intensifier, should boost obligation
      // Note: obligation is now the alternative
      expect(alternatives[0].plausibility).toBeGreaterThan(0.3);
    })) passed++; else failed++;
  });

  describe('edge cases', () => {
    if (it('handles missing nodeId', () => {
      const ambiguity = {
        type: 'modal_force',
        readings: ['obligation', 'expectation'],
        defaultReading: 'obligation'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives).toHaveLength(1);
      // Should still create node with fallback ID
      expect(alternatives[0].node['@id']).toBeDefined();
    })) passed++; else failed++;

    if (it('handles single-reading ambiguities (no alternatives)', () => {
      const ambiguity = {
        type: 'modal_force',
        nodeId: 'act_1',
        readings: ['obligation'],
        defaultReading: 'obligation'
      };

      const alternatives = builder.build(mockGraph, ambiguity);
      expect(alternatives).toHaveLength(0);
    })) passed++; else failed++;

    if (it('handles missing graph @graph array', () => {
      const ambiguity = {
        type: 'modal_force',
        nodeId: 'act_1',
        readings: ['obligation', 'expectation'],
        defaultReading: 'obligation'
      };

      const alternatives = builder.build({}, ambiguity);
      expect(alternatives).toHaveLength(1);
      // Should still create alternative with empty cloned node
    })) passed++; else failed++;
  });

  describe('Phase 6.3 acceptance criteria', () => {
    // AC 6.3.1: build() returns array of alternative readings
    if (it('AC 6.3.1: build() returns array', () => {
      const result = builder.build(mockGraph, {
        type: 'modal_force',
        nodeId: 'act_1',
        readings: ['a', 'b'],
        defaultReading: 'a'
      });
      expect(Array.isArray(result)).toBeTrue();
    })) passed++; else failed++;

    // AC 6.3.2: Modal alternatives have unique IRIs with _alt_ suffix
    if (it('AC 6.3.2: unique IRIs with _alt_ suffix', () => {
      const result = builder.build(mockGraph, {
        type: 'modal_force',
        nodeId: 'act_1',
        readings: ['obligation', 'expectation'],
        defaultReading: 'obligation'
      });
      expect(result[0].node['@id']).toContain('_alt_');
    })) passed++; else failed++;

    // AC 6.3.5: Each alternative has derivedFrom link
    if (it('AC 6.3.5: derivedFrom link to original', () => {
      const result = builder.build(mockGraph, {
        type: 'modal_force',
        nodeId: 'act_1',
        readings: ['obligation', 'expectation'],
        defaultReading: 'obligation'
      });
      expect(result[0].derivedFrom).toBe('act_1');
    })) passed++; else failed++;

    // AC 6.3.6: Each alternative has plausibility score
    if (it('AC 6.3.6: plausibility scores present', () => {
      const result = builder.build(mockGraph, {
        type: 'modal_force',
        nodeId: 'act_1',
        readings: ['obligation', 'expectation'],
        defaultReading: 'obligation'
      });
      expect(result[0].plausibility).toBeDefined();
      expect(typeof result[0].plausibility).toBe('number');
    })) passed++; else failed++;

    // AC 6.3.9: Returns empty array for unknown types without readings
    if (it('AC 6.3.9: empty for types without strategy or readings', () => {
      const result = builder.build(mockGraph, { type: 'unknown' });
      expect(result).toHaveLength(0);
    })) passed++; else failed++;
  });

});

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
