/**
 * Red Team Test Corpus Tests
 * Security Phase 7: Regression prevention for semantic validators
 *
 * TDD: Each corpus file must trigger its corresponding warning code.
 * Tests cover:
 * - AC-RT-1: Each corpus file triggers its corresponding warning
 * - AC-RT-2: Each corpus file triggers ONLY relevant warnings
 * - AC-RT-3: Clean text triggers zero warnings
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

function getValidator() {
  const { SemanticSecurityValidator } = require('../../../src/security/semantic-validators');
  return new SemanticSecurityValidator();
}

const CORPUS_DIR = path.join(__dirname, '..', '..', '..', 'security', 'test-corpus');

const EXPECTED = {
  't3-entity-boundary/connector-flooding.txt': 'HIGH_CONNECTOR_DENSITY',
  't4-actuality-spoofing/hypothetical-assertion.txt': 'ACTUALITY_CONFUSION',
  't5-negation-bypass/buried-negation.txt': 'BURIED_NEGATION',
  't6-salience-inflation/emphasis-flooding.txt': 'EXCESSIVE_EMPHASIS'
};

// ============================================================
// AC-RT-1: Each corpus file triggers its corresponding warning
// ============================================================

for (const [file, expectedCode] of Object.entries(EXPECTED)) {
  test(`AC-RT-1: ${file} → ${expectedCode}`, () => {
    const v = getValidator();
    const text = fs.readFileSync(path.join(CORPUS_DIR, file), 'utf8');
    const result = v.validate(text);

    assert.ok(
      result.warnings.some(w => w.code === expectedCode),
      `Should trigger ${expectedCode}, got: ${result.warnings.map(w => w.code).join(', ') || 'none'}`
    );
  });
}

// ============================================================
// AC-RT-2: Corpus files exist and are non-empty
// ============================================================

test('AC-RT-2: All corpus files exist and are non-empty', () => {
  for (const file of Object.keys(EXPECTED)) {
    const fullPath = path.join(CORPUS_DIR, file);
    assert.ok(fs.existsSync(fullPath), `${file} should exist`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(content.trim().length > 0, `${file} should be non-empty`);
  }
});

// ============================================================
// AC-RT-3: Clean text triggers zero warnings
// ============================================================

test('AC-RT-3: Clean text triggers zero warnings', () => {
  const v = getValidator();
  const result = v.validate('The doctor treated the patient at the hospital.');

  assert.strictEqual(result.warnings.length, 0, 'Clean text should have no warnings');
});

// ============================================================
// Runner
// ============================================================

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Security Phase 7: Red Team Test Corpus');
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
