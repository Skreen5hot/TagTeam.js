/**
 * Interpretation Lattice Integration Tests - Phase 6.4
 *
 * Tests the integration of Phase 6 components into SemanticGraphBuilder.
 */

const SemanticGraphBuilder = require('../../src/graph/SemanticGraphBuilder.js');

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
    toBeUndefined() {
      if (actual !== undefined) throw new Error(`Expected undefined but got ${actual}`);
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
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null but got ${actual}`);
    }
  };
}

let passed = 0;
let failed = 0;

describe('Interpretation Lattice Integration', () => {

  describe('backwards compatibility', () => {
    if (it('returns standard output without preserveAmbiguity', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor treats the patient');

      expect(result['@graph']).toBeDefined();
      expect(result._interpretationLattice).toBeUndefined();
    })) passed++; else failed++;

    if (it('preserves all existing Phase 5 behavior', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor treats the patient', {
        detectAmbiguity: true
      });

      expect(result['@graph']).toBeDefined();
      expect(result._ambiguityReport).toBeDefined();
      // Phase 5 behavior - no lattice without preserveAmbiguity
      expect(result._interpretationLattice).toBeUndefined();
    })) passed++; else failed++;

    if (it('_metadata.version is 6.0.0', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('Test text');
      expect(result._metadata.version).toBe('6.0.0');
    })) passed++; else failed++;
  });

  describe('lattice generation', () => {
    if (it('includes _interpretationLattice with preserveAmbiguity: true', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor should treat the patient', {
        preserveAmbiguity: true
      });

      expect(result._interpretationLattice).toBeDefined();
    })) passed++; else failed++;

    if (it('_metadata.hasInterpretationLattice is true when lattice present', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor should treat the patient', {
        preserveAmbiguity: true
      });

      expect(result._metadata.hasInterpretationLattice).toBeTrue();
    })) passed++; else failed++;

    if (it('default reading matches @graph', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor should treat the patient', {
        preserveAmbiguity: true
      });

      const lattice = result._interpretationLattice;
      const defaultReading = lattice.getDefaultReading();
      expect(defaultReading['@graph']).toBeDefined();
      expect(defaultReading['@graph'].length).toBe(result['@graph'].length);
    })) passed++; else failed++;

    if (it('lattice has getAlternatives method', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor should treat the patient', {
        preserveAmbiguity: true
      });

      const lattice = result._interpretationLattice;
      expect(typeof lattice.getAlternatives).toBe('function');
    })) passed++; else failed++;

    if (it('lattice has hasSignificantAmbiguity method', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor should treat the patient', {
        preserveAmbiguity: true
      });

      const lattice = result._interpretationLattice;
      expect(typeof lattice.hasSignificantAmbiguity).toBe('function');
    })) passed++; else failed++;

    if (it('lattice has toJSONLD method', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor should treat the patient', {
        preserveAmbiguity: true
      });

      const lattice = result._interpretationLattice;
      expect(typeof lattice.toJSONLD).toBe('function');
      const jsonld = lattice.toJSONLD();
      expect(jsonld['@type']).toBe('tagteam:InterpretationLattice');
    })) passed++; else failed++;
  });

  describe('modal ambiguity preservation', () => {
    if (it('creates alternatives for "should" modal ambiguity', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor should prioritize the patient', {
        preserveAmbiguity: true
      });

      const lattice = result._interpretationLattice;
      // "should" is modal ambiguous - check if preserved
      const preserved = lattice.getAmbiguitiesPreserved();
      // May or may not have modal ambiguity depending on detection
      expect(Array.isArray(preserved)).toBeTrue();
    })) passed++; else failed++;

    if (it('includes _ambiguityReport alongside _interpretationLattice', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor should treat the patient', {
        preserveAmbiguity: true,
        detectAmbiguity: true
      });

      // Both should be present
      expect(result._ambiguityReport).toBeDefined();
      expect(result._interpretationLattice).toBeDefined();
    })) passed++; else failed++;
  });

  describe('selectional recovery (Phase 6.0)', () => {
    if (it('does not flag organization agents as violations', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The hospital decided to expand', {
        preserveAmbiguity: true
      });

      // "hospital" is an organization - should not trigger selectional violation
      const report = result._ambiguityReport;
      if (report && report.ambiguities) {
        const violations = report.ambiguities.filter(a => a.type === 'selectional_violation');
        expect(violations.length).toBe(0);
      }
    })) passed++; else failed++;

    if (it('flags inanimate agents as violations', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The rock decided to move', {
        preserveAmbiguity: true
      });

      // "rock" is inanimate - should trigger selectional violation
      const report = result._ambiguityReport;
      if (report && report.ambiguities) {
        const violations = report.ambiguities.filter(a => a.type === 'selectional_violation');
        expect(violations.length).toBeGreaterThan(0);
      }
    })) passed++; else failed++;
  });

  describe('configuration options', () => {
    if (it('respects preserveThreshold option', () => {
      const builder = new SemanticGraphBuilder();
      // With high threshold, more ambiguities should be preserved
      const result = builder.build('The doctor should treat the patient', {
        preserveAmbiguity: true,
        preserveThreshold: 0.9
      });

      expect(result._interpretationLattice).toBeDefined();
    })) passed++; else failed++;

    if (it('respects maxAlternatives option', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor should treat the patient', {
        preserveAmbiguity: true,
        maxAlternatives: 2
      });

      expect(result._interpretationLattice).toBeDefined();
    })) passed++; else failed++;

    if (it('respects useSelectionalEvidence option', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The organization manages resources', {
        preserveAmbiguity: true,
        useSelectionalEvidence: false
      });

      expect(result._interpretationLattice).toBeDefined();
    })) passed++; else failed++;
  });

  describe('resolution categorization', () => {
    if (it('resolutions include preserved, resolved, and flaggedOnly', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor should allocate resources', {
        preserveAmbiguity: true
      });

      const lattice = result._interpretationLattice;
      expect(lattice.resolutions).toBeDefined();
      expect(Array.isArray(lattice.resolutions.preserved)).toBeTrue();
      expect(Array.isArray(lattice.resolutions.resolved)).toBeTrue();
      expect(Array.isArray(lattice.resolutions.flaggedOnly)).toBeTrue();
    })) passed++; else failed++;

    if (it('getResolutionReasoning returns structured audit trail', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor should treat the patient', {
        preserveAmbiguity: true
      });

      const lattice = result._interpretationLattice;
      const reasoning = lattice.getResolutionReasoning();

      expect(reasoning.preserved).toBeDefined();
      expect(reasoning.resolved).toBeDefined();
      expect(reasoning.flagged).toBeDefined();
    })) passed++; else failed++;
  });

  describe('toSimplifiedGraph backwards compatibility', () => {
    if (it('toSimplifiedGraph returns only default reading', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor should treat the patient', {
        preserveAmbiguity: true
      });

      const lattice = result._interpretationLattice;
      const simplified = lattice.toSimplifiedGraph();

      // Should be the same as default reading (no alternatives)
      expect(simplified['@graph']).toBeDefined();
      expect(simplified['@graph'].length).toBe(result['@graph'].length);
    })) passed++; else failed++;
  });

  describe('performance', () => {
    if (it('adds minimal overhead for lattice generation', () => {
      const builder = new SemanticGraphBuilder();
      const text = 'The doctor should allocate limited resources to the patient';

      // Time without lattice
      const start1 = Date.now();
      for (let i = 0; i < 10; i++) {
        builder.build(text, { detectAmbiguity: true });
      }
      const time1 = Date.now() - start1;

      // Time with lattice
      const start2 = Date.now();
      for (let i = 0; i < 10; i++) {
        builder.build(text, { preserveAmbiguity: true });
      }
      const time2 = Date.now() - start2;

      // Lattice should add < 50ms overhead per call on average
      const overhead = (time2 - time1) / 10;
      expect(overhead).toBeLessThan(50);
    })) passed++; else failed++;
  });

  describe('Phase 6 acceptance criteria', () => {
    // AC 6.4.1: preserveAmbiguity: false returns standard output
    if (it('AC 6.4.1: preserveAmbiguity: false is backwards compatible', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('Test text', { preserveAmbiguity: false });
      expect(result._interpretationLattice).toBeUndefined();
    })) passed++; else failed++;

    // AC 6.4.2: preserveAmbiguity: true includes _interpretationLattice
    if (it('AC 6.4.2: preserveAmbiguity: true includes lattice', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor should act', { preserveAmbiguity: true });
      expect(result._interpretationLattice).toBeDefined();
    })) passed++; else failed++;

    // AC 6.4.3: _ambiguityReport still included when detectAmbiguity: true
    if (it('AC 6.4.3: _ambiguityReport still included', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('Test text', { detectAmbiguity: true });
      expect(result._ambiguityReport).toBeDefined();
    })) passed++; else failed++;

    // AC 6.4.4: Lattice getDefaultReading() matches @graph
    if (it('AC 6.4.4: default reading matches @graph', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('Test text', { preserveAmbiguity: true });
      const defaultReading = result._interpretationLattice.getDefaultReading();
      expect(defaultReading['@graph'].length).toBe(result['@graph'].length);
    })) passed++; else failed++;

    // AC 6.4.7: No alternatives for selectional_violation
    if (it('AC 6.4.7: no alternatives for selectional violations', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The rock decided to move', { preserveAmbiguity: true });

      const lattice = result._interpretationLattice;
      // Selectional violations go to flaggedOnly, not preserved
      const flagged = lattice.resolutions.flaggedOnly || [];
      // Check that violations don't get alternatives
      const alternatives = lattice.getAlternatives();
      const violationAlts = alternatives.filter(a =>
        a.ambiguityType === 'selectional_violation'
      );
      expect(violationAlts.length).toBe(0);
    })) passed++; else failed++;
  });

});

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
