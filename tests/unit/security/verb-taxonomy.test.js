/**
 * Verb Taxonomy Validation Tests
 * Security Phase 6: Ontology-based verb constraint enforcement
 *
 * TDD: These tests are written BEFORE implementation.
 * Tests cover:
 * - AC-VT-1: Critical eventive verb miscategorized as stative → error
 * - AC-VT-2: Correctly categorized verbs produce no issues
 */

const assert = require('assert');

const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

function getValidator() {
  const { validateVerbTaxonomy } = require('../../../src/security/ontology-integrity');
  return validateVerbTaxonomy;
}

// ============================================================
// AC-VT-1: Critical eventive verb miscategorized as stative → error
// ============================================================

test('AC-VT-1: "kill" classified as stative triggers CRITICAL_VERB_MISCATEGORIZED', () => {
  const validate = getValidator();

  const taxonomy = {
    isStative: (verb) => ['kill', 'include'].includes(verb),
    isEventive: (verb) => !['kill', 'include'].includes(verb)
  };

  const ontology = {
    getInstancesOf: (cls) => {
      if (cls === 'tagteam:CriticalEventiveVerb') return ['kill', 'murder', 'steal', 'consent'];
      if (cls === 'tagteam:CriticalStativeVerb') return ['include', 'contain'];
      return [];
    }
  };

  const issues = validate(taxonomy, ontology);

  assert.ok(issues.length > 0, 'Should have issues');
  const killIssue = issues.find(i => i.verb === 'kill');
  assert.ok(killIssue, 'Should flag "kill"');
  assert.strictEqual(killIssue.severity, 'critical');
  assert.strictEqual(killIssue.code, 'CRITICAL_VERB_MISCATEGORIZED');
});

test('AC-VT-1: "murder" classified as stative also triggers error', () => {
  const validate = getValidator();

  const taxonomy = {
    isStative: (verb) => verb === 'murder',
    isEventive: (verb) => verb !== 'murder'
  };

  const ontology = {
    getInstancesOf: (cls) => {
      if (cls === 'tagteam:CriticalEventiveVerb') return ['kill', 'murder'];
      if (cls === 'tagteam:CriticalStativeVerb') return ['include'];
      return [];
    }
  };

  const issues = validate(taxonomy, ontology);
  const murderIssue = issues.find(i => i.verb === 'murder');
  assert.ok(murderIssue, 'Should flag "murder"');
  assert.strictEqual(murderIssue.code, 'CRITICAL_VERB_MISCATEGORIZED');
});

test('AC-VT-1: Critical stative verb miscategorized as eventive → error', () => {
  const validate = getValidator();

  const taxonomy = {
    isStative: () => false,
    isEventive: () => true
  };

  const ontology = {
    getInstancesOf: (cls) => {
      if (cls === 'tagteam:CriticalEventiveVerb') return [];
      if (cls === 'tagteam:CriticalStativeVerb') return ['include', 'contain'];
      return [];
    }
  };

  const issues = validate(taxonomy, ontology);
  const includeIssue = issues.find(i => i.verb === 'include');
  assert.ok(includeIssue, 'Should flag "include"');
  assert.strictEqual(includeIssue.code, 'CRITICAL_VERB_MISCATEGORIZED');
});

// ============================================================
// AC-VT-2: Correctly categorized verbs produce no issues
// ============================================================

test('AC-VT-2: Correct categorization produces no issues', () => {
  const validate = getValidator();

  const taxonomy = {
    isStative: (verb) => ['include', 'contain'].includes(verb),
    isEventive: (verb) => ['kill', 'murder', 'steal', 'consent'].includes(verb)
  };

  const ontology = {
    getInstancesOf: (cls) => {
      if (cls === 'tagteam:CriticalEventiveVerb') return ['kill', 'murder', 'steal', 'consent'];
      if (cls === 'tagteam:CriticalStativeVerb') return ['include', 'contain'];
      return [];
    }
  };

  const issues = validate(taxonomy, ontology);
  assert.strictEqual(issues.length, 0, `Should have no issues, got ${JSON.stringify(issues)}`);
});

// ============================================================
// Runner
// ============================================================

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Security Phase 6: Verb Taxonomy Validation Tests');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const t of tests) {
    try {
      await t.fn();
      results.passed++;
      console.log(`  ✅ ${t.name}`);
    } catch (e) {
      results.failed++;
      console.log(`  ❌ ${t.name}`);
      console.log(`     ${e.message}`);
    }
  }

  console.log(`\n  Total: ${tests.length} tests, ${results.passed} passed, ${results.failed} failed\n`);
  process.exit(results.failed > 0 ? 1 : 0);
}

runTests();
