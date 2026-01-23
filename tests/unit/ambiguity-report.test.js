/**
 * AmbiguityReport Unit Tests - Phase 5.3
 */

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
    toHaveLength(expected) {
      if (!actual || actual.length !== expected) {
        throw new Error(`Expected length ${expected} but got ${actual ? actual.length : 0}`);
      }
    },
    toBeCloseTo(expected, decimals = 2) {
      const factor = Math.pow(10, decimals);
      if (Math.round(actual * factor) !== Math.round(expected * factor)) {
        throw new Error(`Expected ${expected} (±${1/factor}) but got ${actual}`);
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

describe('AmbiguityReport', () => {

  describe('constructor and basic properties', () => {
    if (it('creates empty report', () => {
      const report = new AmbiguityReport([]);
      expect(report.count).toBe(0);
      expect(report.hasAmbiguities()).toBeFalse();
    })) passed++; else failed++;

    if (it('creates report with ambiguities', () => {
      const report = new AmbiguityReport([
        { type: 'modal_force', span: 'should', readings: ['a', 'b'] }
      ]);
      expect(report.count).toBe(1);
      expect(report.hasAmbiguities()).toBeTrue();
    })) passed++; else failed++;

    if (it('includes timestamp', () => {
      const report = new AmbiguityReport([]);
      expect(report.timestamp).toBeDefined();
    })) passed++; else failed++;
  });

  describe('getByType', () => {
    if (it('filters by type', () => {
      const report = new AmbiguityReport([
        { type: 'modal_force', span: 'should' },
        { type: 'noun_category', span: 'organization' },
        { type: 'modal_force', span: 'must' }
      ]);
      const modals = report.getByType('modal_force');
      expect(modals).toHaveLength(2);
      expect(modals[0].span).toBe('should');
      expect(modals[1].span).toBe('must');
    })) passed++; else failed++;

    if (it('returns empty array for no matches', () => {
      const report = new AmbiguityReport([
        { type: 'modal_force', span: 'should' }
      ]);
      const scopes = report.getByType('scope');
      expect(scopes).toHaveLength(0);
    })) passed++; else failed++;
  });

  describe('getBySeverity', () => {
    if (it('filters by reading count', () => {
      const report = new AmbiguityReport([
        { type: 'a', readings: ['x', 'y'] },
        { type: 'b', readings: ['x', 'y', 'z'] },
        { type: 'c', readings: ['x'] }
      ]);
      const severe = report.getBySeverity(3);
      expect(severe).toHaveLength(1);
      expect(severe[0].type).toBe('b');
    })) passed++; else failed++;

    if (it('defaults to 2 readings minimum', () => {
      const report = new AmbiguityReport([
        { type: 'a', readings: ['x', 'y'] },
        { type: 'b', readings: ['x'] }
      ]);
      const result = report.getBySeverity();
      expect(result).toHaveLength(1);
    })) passed++; else failed++;
  });

  describe('getForNode', () => {
    if (it('filters by nodeId', () => {
      const report = new AmbiguityReport([
        { type: 'a', nodeId: 'node_1' },
        { type: 'b', nodeId: 'node_2' },
        { type: 'c', nodeId: 'node_1' }
      ]);
      const forNode1 = report.getForNode('node_1');
      expect(forNode1).toHaveLength(2);
    })) passed++; else failed++;
  });

  describe('hasCriticalAmbiguities', () => {
    if (it('returns true for >2 readings', () => {
      const report = new AmbiguityReport([
        { type: 'a', readings: ['x', 'y', 'z', 'w'] }
      ]);
      expect(report.hasCriticalAmbiguities()).toBeTrue();
    })) passed++; else failed++;

    if (it('returns false for <=2 readings', () => {
      const report = new AmbiguityReport([
        { type: 'a', readings: ['x', 'y'] }
      ]);
      expect(report.hasCriticalAmbiguities()).toBeFalse();
    })) passed++; else failed++;
  });

  describe('getConfidence', () => {
    if (it('uses existing confidence if present', () => {
      const report = new AmbiguityReport([]);
      const ambiguity = { type: 'a', confidence: 'high' };
      expect(report.getConfidence(ambiguity)).toBe('high');
    })) passed++; else failed++;

    if (it('computes high for selectional_violation', () => {
      const report = new AmbiguityReport([]);
      const ambiguity = { type: 'selectional_violation', signals: [] };
      expect(report.getConfidence(ambiguity)).toBe('high');
    })) passed++; else failed++;

    if (it('computes high for 2+ signals', () => {
      const report = new AmbiguityReport([]);
      const ambiguity = { type: 'modal_force', signals: ['a', 'b'] };
      expect(report.getConfidence(ambiguity)).toBe('high');
    })) passed++; else failed++;

    if (it('computes medium for 1 signal', () => {
      const report = new AmbiguityReport([]);
      const ambiguity = { type: 'modal_force', signals: ['a'] };
      expect(report.getConfidence(ambiguity)).toBe('medium');
    })) passed++; else failed++;

    if (it('computes low for no signals', () => {
      const report = new AmbiguityReport([]);
      const ambiguity = { type: 'modal_force', signals: [] };
      expect(report.getConfidence(ambiguity)).toBe('low');
    })) passed++; else failed++;
  });

  describe('statistics', () => {
    if (it('computes total correctly', () => {
      const report = new AmbiguityReport([
        { type: 'a', readings: ['x', 'y'] },
        { type: 'b', readings: ['x', 'y', 'z'] },
        { type: 'a', readings: ['x', 'y'] }
      ]);
      expect(report.statistics.total).toBe(3);
    })) passed++; else failed++;

    if (it('computes byType correctly', () => {
      const report = new AmbiguityReport([
        { type: 'modal_force', readings: ['a', 'b'] },
        { type: 'modal_force', readings: ['a', 'b', 'c'] },
        { type: 'noun_category', readings: ['x', 'y'] }
      ]);
      expect(report.statistics.byType.modal_force).toBe(2);
      expect(report.statistics.byType.noun_category).toBe(1);
    })) passed++; else failed++;

    if (it('computes avgReadings correctly', () => {
      const report = new AmbiguityReport([
        { type: 'a', readings: ['x', 'y'] },         // 2
        { type: 'b', readings: ['x', 'y', 'z'] },    // 3
        { type: 'c', readings: ['x', 'y'] }          // 2
      ]);
      expect(report.statistics.avgReadings).toBeCloseTo(2.33, 1);
    })) passed++; else failed++;

    if (it('handles empty report', () => {
      const report = new AmbiguityReport([]);
      expect(report.statistics.total).toBe(0);
      expect(report.statistics.avgReadings).toBe(0);
    })) passed++; else failed++;
  });

  describe('toJSONLD', () => {
    if (it('produces valid JSON-LD structure', () => {
      const report = new AmbiguityReport([
        { type: 'modal_force', span: 'should', readings: ['obligation', 'expectation'] }
      ]);
      const jsonld = report.toJSONLD();

      expect(jsonld['@type']).toBe('tagteam:AmbiguityReport');
      expect(jsonld['tagteam:ambiguityCount']).toBe(1);
      expect(jsonld['tagteam:ambiguities'][0]['@type']).toBe('tagteam:DetectedAmbiguity');
    })) passed++; else failed++;

    if (it('includes statistics in JSON-LD', () => {
      const report = new AmbiguityReport([
        { type: 'modal_force', readings: ['a', 'b'] }
      ]);
      const jsonld = report.toJSONLD();

      expect(jsonld['tagteam:statistics']['@type']).toBe('tagteam:AmbiguityStatistics');
      expect(jsonld['tagteam:statistics']['tagteam:total']).toBe(1);
    })) passed++; else failed++;

    if (it('includes all ambiguity fields', () => {
      const report = new AmbiguityReport([
        {
          type: 'modal_force',
          span: 'should allocate',
          nodeId: 'act_1',
          modal: 'should',
          readings: ['obligation', 'expectation'],
          signals: ['agent_subject'],
          defaultReading: 'obligation'
        }
      ]);
      const jsonld = report.toJSONLD();
      const amb = jsonld['tagteam:ambiguities'][0];

      expect(amb['tagteam:span']).toBe('should allocate');
      expect(amb['tagteam:affectsNode']['@id']).toBe('act_1');
      expect(amb['tagteam:modal']).toBe('should');
      expect(amb['tagteam:possibleReadings']).toEqual(['obligation', 'expectation']);
      expect(amb['tagteam:defaultReading']).toBe('obligation');
    })) passed++; else failed++;

    if (it('includes selectional violation fields', () => {
      const report = new AmbiguityReport([
        {
          type: 'selectional_violation',
          signal: 'inanimate_agent',
          subject: 'rock',
          verb: 'hired',
          nodeId: 'act_1',
          ontologyConstraint: 'bfo:Agent requires animate'
        }
      ]);
      const jsonld = report.toJSONLD();
      const amb = jsonld['tagteam:ambiguities'][0];

      expect(amb['tagteam:violationType']).toBe('inanimate_agent');
      expect(amb['tagteam:subject']).toBe('rock');
      expect(amb['tagteam:verb']).toBe('hired');
      expect(amb['tagteam:ontologyConstraint']).toBe('bfo:Agent requires animate');
    })) passed++; else failed++;

    if (it('includes scope fields', () => {
      const report = new AmbiguityReport([
        {
          type: 'scope',
          quantifier: 'all',
          negation: 'not',
          readings: ['wide', 'narrow'],
          formalizations: { wide: '¬∀x', narrow: '∀x¬' }
        }
      ]);
      const jsonld = report.toJSONLD();
      const amb = jsonld['tagteam:ambiguities'][0];

      expect(amb['tagteam:quantifier']).toBe('all');
      expect(amb['tagteam:negation']).toBe('not');
      expect(amb['tagteam:formalizations'].wide).toBe('¬∀x');
    })) passed++; else failed++;
  });

  describe('toString', () => {
    if (it('shows empty message for no ambiguities', () => {
      const report = new AmbiguityReport([]);
      expect(report.toString()).toBe('AmbiguityReport: No ambiguities detected');
    })) passed++; else failed++;

    if (it('shows count and types', () => {
      const report = new AmbiguityReport([
        { type: 'modal_force', readings: ['a', 'b'] },
        { type: 'noun_category', readings: ['x', 'y'] }
      ]);
      const str = report.toString();
      expect(str.includes('2 ambiguities')).toBeTrue();
      expect(str.includes('modal_force: 1')).toBeTrue();
      expect(str.includes('noun_category: 1')).toBeTrue();
    })) passed++; else failed++;
  });

});

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
