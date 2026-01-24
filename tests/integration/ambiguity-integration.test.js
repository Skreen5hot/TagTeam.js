/**
 * Ambiguity Integration Tests - Phase 5.3
 *
 * Tests the integration of AmbiguityDetector with SemanticGraphBuilder
 */

const SemanticGraphBuilder = require('../../src/graph/SemanticGraphBuilder');
const AmbiguityDetector = require('../../src/graph/AmbiguityDetector');
const AmbiguityReport = require('../../src/graph/AmbiguityReport');

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
    toBeInstanceOf(expected) {
      if (!(actual instanceof expected)) {
        throw new Error(`Expected instance of ${expected.name} but got ${actual?.constructor?.name}`);
      }
    }
  };
}

let passed = 0;
let failed = 0;

describe('Ambiguity Integration with SemanticGraphBuilder', () => {

  describe('basic integration', () => {
    if (it('returns graph without ambiguity report by default', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor treats the patient');

      expect(result['@graph']).toBeDefined();
      expect(result._ambiguityReport).toBeUndefined();
    })) passed++; else failed++;

    if (it('includes ambiguity report when detectAmbiguity is true', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The organization should allocate resources', {
        detectAmbiguity: true
      });

      expect(result['@graph']).toBeDefined();
      expect(result._ambiguityReport).toBeDefined();
      expect(result._ambiguityReport).toBeInstanceOf(AmbiguityReport);
    })) passed++; else failed++;

    if (it('does not affect graph output when ambiguity detection is enabled', () => {
      const builder1 = new SemanticGraphBuilder();
      const builder2 = new SemanticGraphBuilder();
      const resultWithout = builder1.build('The doctor treats the patient');
      const resultWith = builder2.build('The doctor treats the patient', {
        detectAmbiguity: true
      });

      // Graph structure should be the same (except for ambiguity report)
      expect(resultWith['@graph']).toBeDefined();
      // Use same text to ensure identical parsing
      expect(resultWith._metadata.nodeCount).toBe(resultWithout._metadata.nodeCount);
    })) passed++; else failed++;
  });

  describe('ambiguity detection content', () => {
    if (it('detects modal ambiguity in parsed output', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor should allocate the ventilator', {
        detectAmbiguity: true
      });

      const report = result._ambiguityReport;
      expect(report.hasAmbiguities()).toBeTrue();

      const modals = report.getByType('modal_force');
      expect(modals.length).toBeGreaterThan(0);
      expect(modals[0].modal).toBe('should');
    })) passed++; else failed++;

    if (it('detects scope ambiguity in text', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('Not all patients received treatment', {
        detectAmbiguity: true
      });

      const report = result._ambiguityReport;
      const scopes = report.getByType('scope');
      expect(scopes.length).toBeGreaterThan(0);
      expect(scopes[0].defaultReading).toBe('wide');
    })) passed++; else failed++;

    if (it('provides ambiguity statistics', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The organization should allocate resources', {
        detectAmbiguity: true
      });

      const report = result._ambiguityReport;
      expect(report.statistics).toBeDefined();
      expect(report.statistics.total).toBeGreaterThan(0);
    })) passed++; else failed++;
  });

  describe('JSON-LD serialization', () => {
    if (it('serializes ambiguity report to JSON-LD', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor must allocate', {
        detectAmbiguity: true
      });

      const report = result._ambiguityReport;
      const jsonld = report.toJSONLD();

      expect(jsonld['@type']).toBe('tagteam:AmbiguityReport');
      expect(jsonld['tagteam:ambiguities']).toBeDefined();
    })) passed++; else failed++;

    if (it('includes confidence in JSON-LD output', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The doctor should allocate resources', {
        detectAmbiguity: true
      });

      const report = result._ambiguityReport;
      const jsonld = report.toJSONLD();

      if (jsonld['tagteam:ambiguities'].length > 0) {
        const amb = jsonld['tagteam:ambiguities'][0];
        expect(amb['tagteam:confidence']).toBeDefined();
      }
    })) passed++; else failed++;
  });

  describe('standalone usage', () => {
    if (it('AmbiguityDetector works standalone', () => {
      const detector = new AmbiguityDetector();
      const report = detector.detect(
        'The organization should allocate',
        [{ '@id': 'e1', label: 'organization' }],
        [{ '@id': 'a1', verb: 'allocate', modal: 'should' }],
        []
      );

      expect(report).toBeInstanceOf(AmbiguityReport);
      expect(report.hasAmbiguities()).toBeTrue();
    })) passed++; else failed++;

    if (it('AmbiguityReport works standalone', () => {
      const report = new AmbiguityReport([
        { type: 'modal_force', modal: 'should', readings: ['obligation', 'expectation'] }
      ]);

      expect(report.count).toBe(1);
      expect(report.getByType('modal_force')).toHaveLength(1);
    })) passed++; else failed++;
  });

  // Phase 5.3.1: Stakeholder feedback improvements
  describe('Phase 5.3.1 - ambiguity surfacing in @graph nodes', () => {
    if (it('surfaces selectionalMismatch flag when inanimate agent detected', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The ventilator decided to allocate resources', {
        detectAmbiguity: true
      });

      // Find act nodes with selectionalMismatch flag
      const nodesWithMismatch = result['@graph'].filter(node =>
        node['tagteam:selectionalMismatch'] === true
      );

      expect(nodesWithMismatch.length).toBeGreaterThan(0);
      expect(nodesWithMismatch[0]['tagteam:hasAmbiguity']).toBeTrue();
      expect(nodesWithMismatch[0]['tagteam:ambiguityType']).toBe('inanimate_agent');
      expect(nodesWithMismatch[0]['tagteam:ontologyConstraint']).toBeDefined();
    })) passed++; else failed++;

    if (it('surfaces modal ambiguity flags on act nodes', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The committee must review applications', {
        detectAmbiguity: true
      });

      // Find act nodes with ambiguity flags
      const actsWithAmbiguity = result['@graph'].filter(node =>
        node['tagteam:hasAmbiguity'] === true &&
        node['tagteam:modalAmbiguity']
      );

      expect(actsWithAmbiguity.length).toBeGreaterThan(0);
      const modalAmb = actsWithAmbiguity[0]['tagteam:modalAmbiguity'];
      expect(modalAmb['tagteam:readings']).toBeDefined();
    })) passed++; else failed++;

    if (it('types committee as cco:Organization', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The committee should review', {
        detectAmbiguity: true
      });

      // Find Organization nodes
      const orgs = result['@graph'].filter(node =>
        node['@type']?.includes('cco:Organization')
      );

      // There should be an Organization for "committee"
      const committeeOrg = orgs.find(o =>
        (o['rdfs:label'] || '').toLowerCase().includes('committee')
      );
      expect(committeeOrg).toBeDefined();
    })) passed++; else failed++;

    if (it('types administration as cco:Organization', () => {
      const builder = new SemanticGraphBuilder();
      const result = builder.build('The administration announced policy', {
        detectAmbiguity: true
      });

      // Find Organization nodes
      const orgs = result['@graph'].filter(node =>
        node['@type']?.includes('cco:Organization')
      );

      // There should be an Organization for "administration"
      const adminOrg = orgs.find(o =>
        (o['rdfs:label'] || '').toLowerCase().includes('administration')
      );
      expect(adminOrg).toBeDefined();
    })) passed++; else failed++;
  });

});

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
