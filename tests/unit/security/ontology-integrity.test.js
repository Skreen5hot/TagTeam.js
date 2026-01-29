/**
 * Ontology Integrity Tests
 * Security Phase 2: Signed manifest verification
 *
 * TDD: These tests are written BEFORE implementation.
 * Tests cover:
 * - AC-OI-1: Valid manifest with matching hashes passes
 * - AC-OI-2: Tampered file fails integrity check
 * - AC-OI-3: Missing file fails integrity check
 * - AC-OI-4: Missing manifest fails gracefully
 * - AC-OI-5: Manifest exposes version and approver
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

// Test fixture directory
const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'ontology-integrity');

function setup() {
  // Create fixture directory and test files
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  // Create a test ontology file
  fs.writeFileSync(path.join(FIXTURE_DIR, 'test-ontology.ttl'), 'tagteam:TestClass a owl:Class .');
  fs.writeFileSync(path.join(FIXTURE_DIR, 'test-vocab.yaml'), 'kill: eventive');

  // Compute real hashes
  const ttlHash = crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(FIXTURE_DIR, 'test-ontology.ttl')))
    .digest('hex');
  const yamlHash = crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(FIXTURE_DIR, 'test-vocab.yaml')))
    .digest('hex');

  // Create valid manifest
  const validManifest = {
    version: '2026-01-29',
    approver: 'aaron@example.org',
    files: {
      [path.join(FIXTURE_DIR, 'test-ontology.ttl')]: {
        sha256: ttlHash,
        lastModified: '2026-01-29T10:00:00Z'
      },
      [path.join(FIXTURE_DIR, 'test-vocab.yaml')]: {
        sha256: yamlHash,
        lastModified: '2026-01-29T10:00:00Z'
      }
    }
  };
  fs.writeFileSync(
    path.join(FIXTURE_DIR, 'valid-manifest.json'),
    JSON.stringify(validManifest, null, 2)
  );

  // Create tampered manifest (wrong hash)
  const tamperedManifest = JSON.parse(JSON.stringify(validManifest));
  tamperedManifest.files[path.join(FIXTURE_DIR, 'test-ontology.ttl')].sha256 = 'deadbeef';
  fs.writeFileSync(
    path.join(FIXTURE_DIR, 'tampered-manifest.json'),
    JSON.stringify(tamperedManifest, null, 2)
  );

  // Create manifest referencing missing file
  const missingFileManifest = {
    version: '2026-01-29',
    approver: 'aaron@example.org',
    files: {
      [path.join(FIXTURE_DIR, 'nonexistent.ttl')]: {
        sha256: 'abc123',
        lastModified: '2026-01-29T10:00:00Z'
      }
    }
  };
  fs.writeFileSync(
    path.join(FIXTURE_DIR, 'missing-file-manifest.json'),
    JSON.stringify(missingFileManifest, null, 2)
  );
}

function cleanup() {
  fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
}

function getVerifier() {
  const { verifyOntologyIntegrity } = require('../../../src/security/ontology-integrity');
  return verifyOntologyIntegrity;
}

// ============================================================
// AC-OI-1: Valid manifest with matching hashes passes
// ============================================================

test('AC-OI-1: Valid manifest passes integrity check', () => {
  const verify = getVerifier();
  const result = verify(path.join(FIXTURE_DIR, 'valid-manifest.json'));

  assert.strictEqual(result.valid, true, 'Should be valid');
  assert.ok(result.results.every(r => r.valid), 'All files should pass');
});

// ============================================================
// AC-OI-2: Tampered file fails integrity check
// ============================================================

test('AC-OI-2: Tampered file fails with expected vs actual hash', () => {
  const verify = getVerifier();
  const result = verify(path.join(FIXTURE_DIR, 'tampered-manifest.json'));

  assert.strictEqual(result.valid, false, 'Should be invalid');
  const failed = result.results.find(r => !r.valid);
  assert.ok(failed, 'Should have a failed entry');
  assert.strictEqual(failed.expected, 'deadbeef');
  assert.ok(failed.actual && failed.actual !== 'deadbeef', 'Actual hash should differ');
});

// ============================================================
// AC-OI-3: Missing file fails integrity check
// ============================================================

test('AC-OI-3: Missing file produces FILE_NOT_FOUND error', () => {
  const verify = getVerifier();
  const result = verify(path.join(FIXTURE_DIR, 'missing-file-manifest.json'));

  assert.strictEqual(result.valid, false, 'Should be invalid');
  const failed = result.results.find(r => !r.valid);
  assert.ok(failed, 'Should have a failed entry');
  assert.strictEqual(failed.error, 'FILE_NOT_FOUND');
});

// ============================================================
// AC-OI-4: Missing manifest fails gracefully
// ============================================================

test('AC-OI-4: Missing manifest returns MANIFEST_NOT_FOUND', () => {
  const verify = getVerifier();
  const result = verify(path.join(FIXTURE_DIR, 'nonexistent-manifest.json'));

  assert.strictEqual(result.valid, false, 'Should be invalid');
  assert.strictEqual(result.error, 'MANIFEST_NOT_FOUND');
});

// ============================================================
// AC-OI-5: Manifest exposes version and approver
// ============================================================

test('AC-OI-5: Result includes manifestVersion and approver', () => {
  const verify = getVerifier();
  const result = verify(path.join(FIXTURE_DIR, 'valid-manifest.json'));

  assert.strictEqual(result.manifestVersion, '2026-01-29');
  assert.strictEqual(result.approver, 'aaron@example.org');
});

// ============================================================
// Runner
// ============================================================

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Security Phase 2: Ontology Integrity Tests');
  console.log('═══════════════════════════════════════════════════════════════\n');

  setup();

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

  cleanup();

  console.log(`\n  Total: ${tests.length} tests, ${results.passed} passed, ${results.failed} failed\n`);
  process.exit(results.failed > 0 ? 1 : 0);
}

runTests();
