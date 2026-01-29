/**
 * Semantic Security Validator Tests
 * Security Phase 3: Heuristic threat detection (T3-T6)
 *
 * TDD: These tests are written BEFORE implementation.
 * Tests cover:
 * - AC-SV-1/2: T3 — Entity boundary manipulation (connector density)
 * - AC-SV-3/4: T4 — Actuality status spoofing
 * - AC-SV-5/6: T5 — Negation obfuscation
 * - AC-SV-7/8: T6 — Salience inflation
 * - AC-SV-9/10: validate() aggregation and disclaimer
 */

const assert = require('assert');

const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

function getValidator() {
  const { SemanticSecurityValidator } = require('../../../src/security/semantic-validators');
  return new SemanticSecurityValidator();
}

// ============================================================
// AC-SV-1: T3 — High connector density triggers warning
// ============================================================

test('AC-SV-1: High connector density triggers HIGH_CONNECTOR_DENSITY', () => {
  const v = getValidator();
  // ~20% connectors: "of and for or of and for or of and for or of and for or of and for word word"
  const text = 'the of and for or of and for or of and for or of and for or of and for word word';
  const warnings = v.checkEntityBoundaries(text);

  assert.ok(warnings.length > 0, 'Should trigger warning');
  assert.strictEqual(warnings[0].code, 'HIGH_CONNECTOR_DENSITY');
  assert.strictEqual(warnings[0].confidence, 'heuristic');
});

// ============================================================
// AC-SV-2: T3 — Normal connector density passes
// ============================================================

test('AC-SV-2: Normal text passes entity boundary check', () => {
  const v = getValidator();
  const warnings = v.checkEntityBoundaries('The CEO signed the contract');

  assert.strictEqual(warnings.length, 0);
});

// ============================================================
// AC-SV-3: T4 — Actuality confusion triggers warning
// ============================================================

test('AC-SV-3: "Hypothetically, the suspect committed" triggers ACTUALITY_CONFUSION', () => {
  const v = getValidator();
  const warnings = v.checkActualityMarkers('Hypothetically, the suspect committed the crime');

  assert.ok(warnings.length > 0, 'Should trigger warning');
  assert.strictEqual(warnings[0].code, 'ACTUALITY_CONFUSION');
});

// ============================================================
// AC-SV-4: T4 — Normal conditional passes
// ============================================================

test('AC-SV-4: Normal conditional passes actuality check', () => {
  const v = getValidator();
  const warnings = v.checkActualityMarkers('If the patient consents, the doctor will proceed');

  assert.strictEqual(warnings.length, 0);
});

// ============================================================
// AC-SV-5: T5 — Buried negation triggers warning
// ============================================================

test('AC-SV-5: "was involved in no wrongdoing" triggers BURIED_NEGATION', () => {
  const v = getValidator();
  const warnings = v.checkNegationPatterns('The defendant was involved in no wrongdoing');

  assert.ok(warnings.length > 0, 'Should trigger warning');
  assert.strictEqual(warnings[0].code, 'BURIED_NEGATION');
});

test('AC-SV-5: "absence of" triggers BURIED_NEGATION', () => {
  const v = getValidator();
  const warnings = v.checkNegationPatterns('The absence of evidence was noted');

  assert.ok(warnings.length > 0, 'Should trigger warning');
  assert.strictEqual(warnings[0].code, 'BURIED_NEGATION');
});

// ============================================================
// AC-SV-6: T5 — Explicit negation passes
// ============================================================

test('AC-SV-6: Explicit negation passes negation check', () => {
  const v = getValidator();
  const warnings = v.checkNegationPatterns('The defendant did not commit the crime');

  assert.strictEqual(warnings.length, 0);
});

// ============================================================
// AC-SV-7: T6 — Excessive emphasis triggers warning
// ============================================================

test('AC-SV-7: >5 emphasis words triggers EXCESSIVE_EMPHASIS', () => {
  const v = getValidator();
  const text = 'The primary essential crucial critical key fundamental vital goal is safety';
  const warnings = v.checkSalienceMarkers(text);

  assert.ok(warnings.length > 0, 'Should trigger warning');
  assert.strictEqual(warnings[0].code, 'EXCESSIVE_EMPHASIS');
  assert.ok(warnings[0].count > 5);
});

// ============================================================
// AC-SV-8: T6 — Normal emphasis passes
// ============================================================

test('AC-SV-8: Normal emphasis passes salience check', () => {
  const v = getValidator();
  const warnings = v.checkSalienceMarkers('The primary goal is to improve safety');

  assert.strictEqual(warnings.length, 0);
});

// ============================================================
// AC-SV-9: validate() aggregates all checks
// ============================================================

test('AC-SV-9: validate() aggregates multiple warnings', () => {
  const v = getValidator();
  // Text with buried negation + excessive emphasis
  const text = 'The primary essential crucial critical key fundamental absence of accountability was primary';
  const result = v.validate(text);

  assert.ok(result.warnings.length >= 2, `Should have multiple warnings, got ${result.warnings.length}`);
  const codes = result.warnings.map(w => w.code);
  assert.ok(codes.includes('BURIED_NEGATION'), 'Should include BURIED_NEGATION');
  assert.ok(codes.includes('EXCESSIVE_EMPHASIS'), 'Should include EXCESSIVE_EMPHASIS');
  assert.ok(result.disclaimer, 'Should include disclaimer');
});

// ============================================================
// AC-SV-10: validate() returns disclaimer on clean text
// ============================================================

test('AC-SV-10: Clean text returns zero warnings with disclaimer', () => {
  const v = getValidator();
  const result = v.validate('The CEO signed the contract');

  assert.strictEqual(result.warnings.length, 0);
  assert.ok(result.disclaimer, 'Should include disclaimer even on clean text');
});

// ============================================================
// Runner
// ============================================================

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Security Phase 3: Semantic Security Validator Tests');
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
