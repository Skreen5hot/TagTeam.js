/**
 * Output Sanitizer Tests
 * Security Phase 4: Output sanitization with provenance
 *
 * TDD: These tests are written BEFORE implementation.
 * Tests cover:
 * - AC-OS-1: Only allowed properties pass through sanitize()
 * - AC-OS-2: Provenance metadata is attached
 * - AC-OS-3: Empty warnings produces empty array in provenance
 * - AC-OS-4: All allowed property names are preserved
 */

const assert = require('assert');

const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

function getModule() {
  return require('../../../src/security/output-sanitizer');
}

// ============================================================
// AC-OS-1: Only allowed properties pass through
// ============================================================

test('AC-OS-1: Disallowed properties are stripped', () => {
  const { sanitize } = getModule();
  const ice = {
    id: 'ice_001',
    type: 'StructuralAssertion',
    label: 'includes',
    internalDebug: 'should be removed',
    _privateField: 'should be removed',
    __proto_hack: 'should be removed'
  };
  const result = sanitize(ice);

  assert.strictEqual(result.id, 'ice_001');
  assert.strictEqual(result.type, 'StructuralAssertion');
  assert.strictEqual(result.label, 'includes');
  assert.strictEqual(result.internalDebug, undefined);
  assert.strictEqual(result._privateField, undefined);
  assert.strictEqual(result.__proto_hack, undefined);
});

// ============================================================
// AC-OS-2: Provenance metadata is attached
// ============================================================

test('AC-OS-2: sanitizeWithProvenance attaches provenance', () => {
  const { sanitizeWithProvenance } = getModule();
  const ices = [{ id: 'ice_001', type: 'StructuralAssertion' }];
  const context = {
    ontologyHash: 'sha256:abc123',
    warnings: [{ code: 'HIGH_CONNECTOR_DENSITY' }]
  };
  const result = sanitizeWithProvenance(ices, context);

  assert.strictEqual(result.length, 1);
  assert.ok(result[0].provenance, 'Should have provenance');
  assert.strictEqual(result[0].provenance.ontologyHash, 'sha256:abc123');
  assert.deepStrictEqual(result[0].provenance.securityWarnings, ['HIGH_CONNECTOR_DENSITY']);
  assert.strictEqual(result[0].provenance.inputValidated, true);
  // Timestamp should be valid ISO
  assert.ok(!isNaN(Date.parse(result[0].provenance.timestamp)));
});

// ============================================================
// AC-OS-3: Empty warnings produces empty array
// ============================================================

test('AC-OS-3: Empty warnings → empty securityWarnings array', () => {
  const { sanitizeWithProvenance } = getModule();
  const ices = [{ id: 'ice_001', type: 'Test' }];
  const context = { ontologyHash: 'sha256:def', warnings: [] };
  const result = sanitizeWithProvenance(ices, context);

  assert.deepStrictEqual(result[0].provenance.securityWarnings, []);
});

// ============================================================
// AC-OS-4: All 15 allowed properties preserved
// ============================================================

test('AC-OS-4: All allowed properties are preserved', () => {
  const { sanitize } = getModule();
  const ice = {
    id: 'ice_001',
    type: 'StructuralAssertion',
    label: 'includes',
    fullName: 'International Centre',
    nameComponents: ['International', 'Centre'],
    denotedType: 'cco:Organization',
    candidateType: 'bfo:Entity',
    expression: 'the group includes',
    assertedRelation: 'cco:has_member',
    subject: 'ref_001',
    objects: ['ref_002'],
    verbPhrase: 'includes',
    agent: 'ref_003',
    patient: 'ref_004',
    actualityStatus: 'Actual',
    normativeStatus: 'Prescribed',
    salience: 0.8,
    denotationConfidence: 0.95,
    sourceSpan: 'the group includes five members',
    evidence: ['lexical'],
    extra: 'should be removed'
  };
  const result = sanitize(ice);

  assert.strictEqual(result.id, 'ice_001');
  assert.strictEqual(result.type, 'StructuralAssertion');
  assert.strictEqual(result.label, 'includes');
  assert.strictEqual(result.fullName, 'International Centre');
  assert.deepStrictEqual(result.nameComponents, ['International', 'Centre']);
  assert.strictEqual(result.denotedType, 'cco:Organization');
  assert.strictEqual(result.candidateType, 'bfo:Entity');
  assert.strictEqual(result.expression, 'the group includes');
  assert.strictEqual(result.assertedRelation, 'cco:has_member');
  assert.strictEqual(result.subject, 'ref_001');
  assert.deepStrictEqual(result.objects, ['ref_002']);
  assert.strictEqual(result.verbPhrase, 'includes');
  assert.strictEqual(result.agent, 'ref_003');
  assert.strictEqual(result.patient, 'ref_004');
  assert.strictEqual(result.actualityStatus, 'Actual');
  assert.strictEqual(result.normativeStatus, 'Prescribed');
  assert.strictEqual(result.salience, 0.8);
  assert.strictEqual(result.denotationConfidence, 0.95);
  assert.strictEqual(result.sourceSpan, 'the group includes five members');
  assert.deepStrictEqual(result.evidence, ['lexical']);
  assert.strictEqual(result.extra, undefined);
});

// ============================================================
// Runner
// ============================================================

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Security Phase 4: Output Sanitizer Tests');
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
