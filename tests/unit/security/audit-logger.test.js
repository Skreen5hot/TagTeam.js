/**
 * Audit Logger Tests
 * Security Phase 5: Structured security audit logging
 *
 * TDD: These tests are written BEFORE implementation.
 * Tests cover:
 * - AC-AL-1: log() emits structured JSON with timestamp and service
 * - AC-AL-2: ontologyFailure() emits critical event with details
 * - AC-AL-3: inputValidationWarning() emits warning event
 */

const assert = require('assert');

const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

function getLogger() {
  const { SecurityAuditLogger } = require('../../../src/security/audit-logger');
  return new SecurityAuditLogger();
}

/**
 * Capture console.log output from a function call.
 */
function captureLog(fn) {
  const original = console.log;
  let captured = '';
  console.log = (msg) => { captured = msg; };
  try {
    fn();
  } finally {
    console.log = original;
  }
  return JSON.parse(captured);
}

// ============================================================
// AC-AL-1: log() emits structured JSON with timestamp and service
// ============================================================

test('AC-AL-1: log() emits JSON with timestamp and service', () => {
  const logger = getLogger();
  const output = captureLog(() => logger.log({ event: 'TEST', severity: 'info' }));

  assert.strictEqual(output.service, 'tagteam');
  assert.strictEqual(output.event, 'TEST');
  assert.strictEqual(output.severity, 'info');
  assert.ok(!isNaN(Date.parse(output.timestamp)), 'timestamp should be valid ISO');
});

// ============================================================
// AC-AL-2: ontologyFailure() emits critical event
// ============================================================

test('AC-AL-2: ontologyFailure() emits critical event with details', () => {
  const logger = getLogger();
  const output = captureLog(() => logger.ontologyFailure({
    file: 'foo.ttl',
    expected: 'abc',
    actual: 'def',
    approver: 'aaron'
  }));

  assert.strictEqual(output.event, 'ONTOLOGY_INTEGRITY_FAILED');
  assert.strictEqual(output.severity, 'critical');
  assert.strictEqual(output.action, 'PARSING_HALTED');
  assert.strictEqual(output.file, 'foo.ttl');
  assert.strictEqual(output.expected, 'abc');
  assert.strictEqual(output.actual, 'def');
  assert.strictEqual(output.approver, 'aaron');
});

// ============================================================
// AC-AL-3: inputValidationWarning() emits warning event
// ============================================================

test('AC-AL-3: inputValidationWarning() emits warning event', () => {
  const logger = getLogger();
  const output = captureLog(() => logger.inputValidationWarning({
    code: 'HIGH_CONNECTOR_DENSITY',
    text: 'some suspicious text'
  }));

  assert.strictEqual(output.event, 'INPUT_VALIDATION_WARNING');
  assert.strictEqual(output.severity, 'warning');
  assert.strictEqual(output.code, 'HIGH_CONNECTOR_DENSITY');
});

// ============================================================
// Runner
// ============================================================

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Security Phase 5: Audit Logger Tests');
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
