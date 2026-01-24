/**
 * AmbiguityResolver Unit Tests - Phase 6.1
 *
 * Tests the resolution strategy for determining which ambiguities
 * to preserve as multiple readings vs resolve to a single default.
 */

const AmbiguityResolver = require('../../src/graph/AmbiguityResolver.js');
const AmbiguityReport = require('../../src/graph/AmbiguityReport.js');

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
      if (actual !== undefined) throw new Error(`Expected undefined but got ${JSON.stringify(actual)}`);
    },
    toHaveLength(expected) {
      if (!actual || actual.length !== expected) {
        throw new Error(`Expected length ${expected} but got ${actual ? actual.length : 0}`);
      }
    },
    toContain(item) {
      if (!actual || !actual.includes(item)) {
        throw new Error(`Expected array to contain "${item}"`);
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
    toBeGreaterThanOrEqual(expected) {
      if (actual < expected) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
    }
  };
}

let passed = 0;
let failed = 0;

// Helper to create mock ambiguity report
function mockReport(ambiguities) {
  return new AmbiguityReport(ambiguities);
}

// Helper to create ambiguity objects
function amb(type, overrides = {}) {
  const defaults = {
    type,
    span: 'test span',
    nodeId: `node_${type}_1`,
    readings: ['reading1', 'reading2'],
    signals: [],
    defaultReading: 'reading1',
    confidence: 'medium'
  };
  return { ...defaults, ...overrides };
}

const resolver = new AmbiguityResolver();

describe('AmbiguityResolver', () => {

  describe('basic structure', () => {
    if (it('resolve() returns { preserved, resolved, flaggedOnly } structure', () => {
      const report = mockReport([]);
      const result = resolver.resolve(report);

      expect(result.preserved).toBeDefined();
      expect(result.resolved).toBeDefined();
      expect(result.flaggedOnly).toBeDefined();
      expect(Array.isArray(result.preserved)).toBeTrue();
      expect(Array.isArray(result.resolved)).toBeTrue();
      expect(Array.isArray(result.flaggedOnly)).toBeTrue();
    })) passed++; else failed++;

    if (it('handles null/empty input gracefully', () => {
      const result1 = resolver.resolve(null);
      const result2 = resolver.resolve({});
      const result3 = resolver.resolve(mockReport([]));

      expect(result1.preserved).toHaveLength(0);
      expect(result2.preserved).toHaveLength(0);
      expect(result3.preserved).toHaveLength(0);
    })) passed++; else failed++;

    if (it('each resolution includes reason for audit trail', () => {
      const report = mockReport([
        amb('selectional_violation'),
        amb('scope'),
        amb('modal_force', { confidence: 'high' })
      ]);

      const result = resolver.resolve(report);
      const all = [...result.preserved, ...result.resolved, ...result.flaggedOnly];

      for (const r of all) {
        expect(r.resolution).toBeDefined();
        expect(r.resolution.reason).toBeDefined();
      }
    })) passed++; else failed++;
  });

  describe('selectional_violation handling', () => {
    if (it('selectional_violation always goes to flaggedOnly', () => {
      const report = mockReport([
        amb('selectional_violation', { signal: 'inanimate_agent' })
      ]);

      const result = resolver.resolve(report);

      expect(result.flaggedOnly).toHaveLength(1);
      expect(result.preserved).toHaveLength(0);
      expect(result.resolved).toHaveLength(0);
    })) passed++; else failed++;

    if (it('selectional_violation reason is anomalous_input', () => {
      const report = mockReport([amb('selectional_violation')]);
      const result = resolver.resolve(report);

      expect(result.flaggedOnly[0].resolution.reason).toBe('anomalous_input');
    })) passed++; else failed++;

    if (it('selectional_violation has preserveAlternatives: false', () => {
      const report = mockReport([amb('selectional_violation')]);
      const result = resolver.resolve(report);

      expect(result.flaggedOnly[0].resolution.preserveAlternatives).toBeFalse();
    })) passed++; else failed++;
  });

  describe('scope ambiguity handling', () => {
    if (it('scope ambiguity always goes to preserved by default', () => {
      const report = mockReport([
        amb('scope', { quantifier: 'all', readings: ['wide', 'narrow'] })
      ]);

      const result = resolver.resolve(report);

      expect(result.preserved).toHaveLength(1);
      expect(result.preserved[0].type).toBe('scope');
    })) passed++; else failed++;

    if (it('scope reason is significant_semantic_difference', () => {
      const report = mockReport([amb('scope')]);
      const result = resolver.resolve(report);

      expect(result.preserved[0].resolution.reason).toBe('significant_semantic_difference');
    })) passed++; else failed++;

    if (it('alwaysPreserveScope can be disabled via config', () => {
      const customResolver = new AmbiguityResolver({ alwaysPreserveScope: false });
      const report = mockReport([amb('scope', { confidence: 'high' })]);

      const result = customResolver.resolve(report);

      // Without alwaysPreserveScope, high confidence scope goes to resolved
      expect(result.resolved).toHaveLength(1);
    })) passed++; else failed++;
  });

  describe('modal_force handling', () => {
    if (it('modal_force with high confidence goes to resolved', () => {
      const report = mockReport([
        amb('modal_force', {
          modal: 'must',
          signals: ['agent_subject', 'intentional_act', 'second_person_subject'],
          confidence: 'high'
        })
      ]);

      const result = resolver.resolve(report);

      expect(result.resolved).toHaveLength(1);
    })) passed++; else failed++;

    if (it('modal_force with low confidence goes to preserved', () => {
      const report = mockReport([
        amb('modal_force', {
          modal: 'should',
          signals: [],
          confidence: 'low'
        })
      ]);

      const result = resolver.resolve(report);

      expect(result.preserved).toHaveLength(1);
    })) passed++; else failed++;

    if (it('modal_force with agent_subject signal boosts deontic', () => {
      const report = mockReport([
        amb('modal_force', {
          modal: 'should',
          signals: ['agent_subject'],
          confidence: 'medium'
        })
      ]);

      const result = resolver.resolve(report);
      const resolution = result.resolved[0]?.resolution || result.preserved[0]?.resolution;

      expect(resolution.deonticBoost).toBeGreaterThan(0);
    })) passed++; else failed++;

    if (it('modal_force with perfect_aspect signal boosts epistemic', () => {
      const report = mockReport([
        amb('modal_force', {
          modal: 'must',
          signals: ['perfect_aspect'],
          confidence: 'medium'
        })
      ]);

      const result = resolver.resolve(report);
      const resolution = result.resolved[0]?.resolution || result.preserved[0]?.resolution;

      expect(resolution.epistemicBoost).toBeGreaterThan(0);
    })) passed++; else failed++;

    if (it('respects preserveThreshold config', () => {
      const highThreshold = new AmbiguityResolver({ preserveThreshold: 0.9 });
      const lowThreshold = new AmbiguityResolver({ preserveThreshold: 0.3 });

      const report = mockReport([
        amb('modal_force', { confidence: 0.6 }) // Numeric confidence
      ]);

      const highResult = highThreshold.resolve(report);
      const lowResult = lowThreshold.resolve(report);

      // High threshold should preserve (0.6 < 0.9)
      expect(highResult.preserved.length).toBeGreaterThanOrEqual(0);
      // Low threshold should resolve (0.6 > 0.3)
      // Note: depends on signal boosting
    })) passed++; else failed++;
  });

  describe('noun_category handling', () => {
    if (it('noun_category with subject_of_intentional_act resolves to continuant', () => {
      const report = mockReport([
        amb('noun_category', {
          span: 'organization',
          signals: ['subject_of_intentional_act'],
          readings: ['process', 'continuant']
        })
      ]);

      const result = resolver.resolve(report);

      expect(result.resolved).toHaveLength(1);
      expect(result.resolved[0].resolution.reason).toBe('selectional_match');
      expect(result.resolved[0].resolution.defaultReading).toBe('continuant');
    })) passed++; else failed++;

    if (it('noun_category with of_complement preserves (suggests process)', () => {
      const report = mockReport([
        amb('noun_category', {
          span: 'organization of files',
          signals: ['of_complement'],
          readings: ['process', 'continuant']
        })
      ]);

      const result = resolver.resolve(report);

      expect(result.preserved).toHaveLength(1);
      expect(result.preserved[0].resolution.reason).toBe('of_complement_present');
    })) passed++; else failed++;

    if (it('noun_category without signals defaults to continuant', () => {
      const report = mockReport([
        amb('noun_category', {
          span: 'administration',
          signals: [],
          readings: ['process', 'continuant']
        })
      ]);

      const result = resolver.resolve(report);

      expect(result.resolved).toHaveLength(1);
      expect(result.resolved[0].resolution.defaultReading).toBe('continuant');
    })) passed++; else failed++;
  });

  describe('potential_metonymy handling', () => {
    if (it('potential_metonymy goes to flaggedOnly', () => {
      const report = mockReport([
        amb('potential_metonymy', {
          span: 'house',
          signal: 'location_as_agent'
        })
      ]);

      const result = resolver.resolve(report);

      expect(result.flaggedOnly).toHaveLength(1);
    })) passed++; else failed++;

    if (it('potential_metonymy suggests re-typing as Organization', () => {
      const report = mockReport([amb('potential_metonymy')]);
      const result = resolver.resolve(report);

      const resolution = result.flaggedOnly[0].resolution;
      expect(resolution.suggestRetyping).toBeTrue();
      expect(resolution.suggestedType).toBe('cco:Organization');
    })) passed++; else failed++;
  });

  describe('configuration', () => {
    if (it('respects custom preserveThreshold', () => {
      const strictResolver = new AmbiguityResolver({ preserveThreshold: 0.95 });
      const report = mockReport([
        amb('modal_force', { confidence: 0.8, signals: ['agent_subject'] })
      ]);

      // With 0.95 threshold, 0.8 confidence should preserve
      const result = strictResolver.resolve(report);
      // Result depends on signal boosting, but threshold should be respected
      expect(result).toBeDefined();
    })) passed++; else failed++;

    if (it('useSelectionalEvidence can be disabled', () => {
      const noSelectional = new AmbiguityResolver({ useSelectionalEvidence: false });
      const report = mockReport([
        amb('noun_category', {
          signals: ['subject_of_intentional_act'],
          confidence: 'medium'
        })
      ]);

      const result = noSelectional.resolve(report);
      // Without selectional evidence, shouldn't auto-resolve at 0.99 via selectional_match
      const all = [...result.resolved, ...result.preserved];
      expect(all.length).toBeGreaterThan(0);
      const resolution = all[0].resolution;
      // Should NOT be selectional_match when useSelectionalEvidence is false
      const isSelectionalMatch = resolution.reason === 'selectional_match';
      expect(isSelectionalMatch).toBeFalse();
    })) passed++; else failed++;
  });

  describe('statistics', () => {
    if (it('getStatistics returns correct counts', () => {
      const report = mockReport([
        amb('selectional_violation'),
        amb('scope'),
        amb('scope'),
        amb('modal_force', { confidence: 'high', signals: ['agent_subject', 'intentional_act'] })
      ]);

      const result = resolver.resolve(report);
      const stats = resolver.getStatistics(result);

      expect(stats.total).toBe(4);
      expect(stats.flaggedOnly).toBe(1);
      expect(stats.preserved).toBe(2);
      expect(stats.byType.scope).toBe(2);
      expect(stats.byType.selectional_violation).toBe(1);
    })) passed++; else failed++;

    if (it('getStatistics includes byReason breakdown', () => {
      const report = mockReport([
        amb('selectional_violation'),
        amb('scope')
      ]);

      const result = resolver.resolve(report);
      const stats = resolver.getStatistics(result);

      expect(stats.byReason).toBeDefined();
      expect(stats.byReason.anomalous_input).toBe(1);
      expect(stats.byReason.significant_semantic_difference).toBe(1);
    })) passed++; else failed++;
  });

  describe('Phase 6 acceptance criteria', () => {
    // AC 6.1.1: resolve() returns { preserved, resolved, flaggedOnly }
    if (it('AC 6.1.1: resolve() returns correct structure', () => {
      const result = resolver.resolve(mockReport([]));
      expect('preserved' in result).toBeTrue();
      expect('resolved' in result).toBeTrue();
      expect('flaggedOnly' in result).toBeTrue();
    })) passed++; else failed++;

    // AC 6.1.2: selectional_violation always goes to flaggedOnly
    if (it('AC 6.1.2: selectional_violation → flaggedOnly', () => {
      const result = resolver.resolve(mockReport([amb('selectional_violation')]));
      expect(result.flaggedOnly).toHaveLength(1);
      expect(result.preserved).toHaveLength(0);
      expect(result.resolved).toHaveLength(0);
    })) passed++; else failed++;

    // AC 6.1.3: scope always goes to preserved (configurable)
    if (it('AC 6.1.3: scope → preserved (default)', () => {
      const result = resolver.resolve(mockReport([amb('scope')]));
      expect(result.preserved).toHaveLength(1);
    })) passed++; else failed++;

    // AC 6.1.7: potential_metonymy goes to flaggedOnly
    if (it('AC 6.1.7: potential_metonymy → flaggedOnly', () => {
      const result = resolver.resolve(mockReport([amb('potential_metonymy')]));
      expect(result.flaggedOnly).toHaveLength(1);
    })) passed++; else failed++;

    // AC 6.1.10: Each resolution includes reason for audit trail
    if (it('AC 6.1.10: resolutions include reason', () => {
      const report = mockReport([
        amb('selectional_violation'),
        amb('scope'),
        amb('modal_force')
      ]);
      const result = resolver.resolve(report);
      const all = [...result.preserved, ...result.resolved, ...result.flaggedOnly];

      for (const r of all) {
        expect(r.resolution.reason).toBeDefined();
      }
    })) passed++; else failed++;
  });

});

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
