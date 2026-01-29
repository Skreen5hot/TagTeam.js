/**
 * Input Validator Tests
 * Security Phase 1: Input validation and sanitization
 *
 * TDD: These tests are written BEFORE implementation.
 * Tests cover:
 * - AC-IV-1: Text exceeding MAX_TEXT_LENGTH is rejected
 * - AC-IV-2: Null bytes are rejected
 * - AC-IV-3: Valid text passes and is NFKC-normalized
 * - AC-IV-4: Unicode normalization converts equivalent forms
 * - AC-IV-5: Empty/null input is rejected
 */

const assert = require('assert');

const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

function getValidator() {
  const { validateInput } = require('../../../src/security/input-validator');
  return validateInput;
}

// ============================================================
// AC-IV-1: Text exceeding MAX_TEXT_LENGTH is rejected
// ============================================================

test('AC-IV-1: Text > 100,000 chars is rejected', () => {
  const validateInput = getValidator();
  const longText = 'A'.repeat(100001);
  const result = validateInput(longText);

  assert.strictEqual(result.valid, false, 'Should be invalid');
  const issue = result.issues.find(i => i.code === 'INPUT_TOO_LONG');
  assert.ok(issue, 'Should have INPUT_TOO_LONG issue');
  assert.strictEqual(issue.severity, 'error');
  assert.strictEqual(issue.confidence, 'deterministic');
});

test('AC-IV-1: Text exactly 100,000 chars is accepted', () => {
  const validateInput = getValidator();
  const text = 'A'.repeat(100000);
  const result = validateInput(text);

  assert.strictEqual(result.valid, true, 'Exactly at limit should pass');
});

// ============================================================
// AC-IV-2: Null bytes are rejected
// ============================================================

test('AC-IV-2: Text with null byte is rejected', () => {
  const validateInput = getValidator();
  const result = validateInput('Hello\x00World');

  assert.strictEqual(result.valid, false, 'Should be invalid');
  const issue = result.issues.find(i => i.code === 'NULL_BYTE');
  assert.ok(issue, 'Should have NULL_BYTE issue');
  assert.strictEqual(issue.severity, 'error');
  assert.strictEqual(issue.confidence, 'deterministic');
});

// ============================================================
// AC-IV-3: Valid text passes and is NFKC-normalized
// ============================================================

test('AC-IV-3: Normal text passes with zero issues', () => {
  const validateInput = getValidator();
  const text = 'The CEO signed the contract';
  const result = validateInput(text);

  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.issues.length, 0);
  assert.strictEqual(result.normalized, text.normalize('NFKC'));
});

// ============================================================
// AC-IV-4: Unicode normalization converts equivalent forms
// ============================================================

test('AC-IV-4: Decomposed Unicode is NFKC-normalized', () => {
  const validateInput = getValidator();
  // "café" with decomposed accent (e + combining acute)
  const decomposed = 'caf\u0065\u0301';
  const result = validateInput(decomposed);

  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.normalized, decomposed.normalize('NFKC'));
  // NFKC composes e + combining acute → é
  assert.ok(result.normalized.includes('\u00E9'), 'Should compose to é');
});

// ============================================================
// AC-IV-5: Empty/null input is rejected
// ============================================================

test('AC-IV-5: Null input is rejected', () => {
  const validateInput = getValidator();
  const result = validateInput(null);

  assert.strictEqual(result.valid, false);
  const issue = result.issues.find(i => i.code === 'EMPTY_INPUT');
  assert.ok(issue, 'Should have EMPTY_INPUT issue');
});

test('AC-IV-5: Undefined input is rejected', () => {
  const validateInput = getValidator();
  const result = validateInput(undefined);

  assert.strictEqual(result.valid, false);
  const issue = result.issues.find(i => i.code === 'EMPTY_INPUT');
  assert.ok(issue, 'Should have EMPTY_INPUT issue');
});

test('AC-IV-5: Empty string is rejected', () => {
  const validateInput = getValidator();
  const result = validateInput('');

  assert.strictEqual(result.valid, false);
  const issue = result.issues.find(i => i.code === 'EMPTY_INPUT');
  assert.ok(issue, 'Should have EMPTY_INPUT issue');
});

// ============================================================
// Runner
// ============================================================

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Security Phase 1: Input Validator Tests');
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
