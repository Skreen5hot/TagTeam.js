/**
 * SelectionalPreferences Test Suite
 * Phase 6.0: Selectional Preference Validation
 *
 * Tests verb-argument semantic constraints for ambiguity detection.
 * TDD approach: tests written before implementation.
 */

const assert = require('assert');

// Will be implemented
let SelectionalPreferences;
try {
  SelectionalPreferences = require('../../../src/graph/SelectionalPreferences');
} catch (e) {
  // Expected to fail initially - TDD
  console.log('Note: SelectionalPreferences not yet implemented');
}

// Test runner
const tests = [];
const results = { passed: 0, failed: 0, skipped: 0 };

function test(name, fn, priority = 'P0') {
  tests.push({ name, fn, priority });
}

function skip(name, fn, priority = 'P0') {
  tests.push({ name, fn, priority, skip: true });
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SelectionalPreferences Test Suite - Phase 6.0');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!SelectionalPreferences) {
    console.log('❌ SelectionalPreferences class not found. Implement src/graph/SelectionalPreferences.js\n');
    console.log(`Total: 0 passed, ${tests.length} skipped (not implemented)\n`);
    return;
  }

  const prefs = new SelectionalPreferences();

  for (const t of tests) {
    if (t.skip) {
      console.log(`  ⏭️  [${t.priority}] ${t.name} (skipped)`);
      results.skipped++;
      continue;
    }

    try {
      await t.fn(prefs);
      console.log(`  ✅ [${t.priority}] ${t.name}`);
      results.passed++;
    } catch (err) {
      console.log(`  ❌ [${t.priority}] ${t.name}`);
      console.log(`     ${err.message}`);
      results.failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Results: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

// ============================================================================
// Category 1: Verb Class Lookup (10 tests)
// ============================================================================

test('VC-001: getVerbClass("decide") returns intentional_mental', (prefs) => {
  const result = prefs.getVerbClass('decide');
  assert.strictEqual(result, 'intentional_mental', `Expected 'intentional_mental', got '${result}'`);
}, 'P0');

test('VC-002: getVerbClass("lift") returns intentional_physical', (prefs) => {
  const result = prefs.getVerbClass('lift');
  assert.strictEqual(result, 'intentional_physical', `Expected 'intentional_physical', got '${result}'`);
}, 'P0');

test('VC-003: getVerbClass("announce") returns communication', (prefs) => {
  const result = prefs.getVerbClass('announce');
  assert.strictEqual(result, 'communication', `Expected 'communication', got '${result}'`);
}, 'P0');

test('VC-004: getVerbClass("give") returns transfer', (prefs) => {
  const result = prefs.getVerbClass('give');
  assert.strictEqual(result, 'transfer', `Expected 'transfer', got '${result}'`);
}, 'P0');

test('VC-005: getVerbClass("cause") returns causation', (prefs) => {
  const result = prefs.getVerbClass('cause');
  assert.strictEqual(result, 'causation', `Expected 'causation', got '${result}'`);
}, 'P0');

test('VC-006: getVerbClass("walk") returns null for unknown verb', (prefs) => {
  const result = prefs.getVerbClass('walk');
  assert.strictEqual(result, null, `Expected null, got '${result}'`);
}, 'P1');

test('VC-007: getVerbClass("DECIDE") is case insensitive', (prefs) => {
  const result = prefs.getVerbClass('DECIDE');
  assert.strictEqual(result, 'intentional_mental', `Expected 'intentional_mental', got '${result}'`);
}, 'P1');

test('VC-008: getVerbClass("") returns null for empty string', (prefs) => {
  const result = prefs.getVerbClass('');
  assert.strictEqual(result, null, `Expected null, got '${result}'`);
}, 'P2');

test('VC-009: getVerbClass(null) returns null', (prefs) => {
  const result = prefs.getVerbClass(null);
  assert.strictEqual(result, null, `Expected null, got '${result}'`);
}, 'P2');

test('VC-010: getVerbClass("believe") returns intentional_mental', (prefs) => {
  const result = prefs.getVerbClass('believe');
  assert.strictEqual(result, 'intentional_mental', `Expected 'intentional_mental', got '${result}'`);
}, 'P1');

// ============================================================================
// Category 2: Entity Categorization (15 tests)
// ============================================================================

test('EC-001: getEntityCategories({ type: "cco:Person" }) includes animate', (prefs) => {
  const result = prefs.getEntityCategories({ type: 'cco:Person' });
  assert(result.includes('animate'), `Expected 'animate' in ${JSON.stringify(result)}`);
}, 'P0');

test('EC-002: getEntityCategories({ type: "cco:Organization" }) includes organization', (prefs) => {
  const result = prefs.getEntityCategories({ type: 'cco:Organization' });
  assert(result.includes('organization'), `Expected 'organization' in ${JSON.stringify(result)}`);
}, 'P0');

test('EC-003: getEntityCategories({ label: "committee" }) includes organization', (prefs) => {
  const result = prefs.getEntityCategories({ label: 'committee' });
  assert(result.includes('organization'), `Expected 'organization' in ${JSON.stringify(result)}`);
}, 'P0');

test('EC-004: getEntityCategories({ label: "rock" }) includes inanimate', (prefs) => {
  const result = prefs.getEntityCategories({ label: 'rock' });
  assert(result.includes('inanimate'), `Expected 'inanimate' in ${JSON.stringify(result)}`);
}, 'P0');

test('EC-005: getEntityCategories({ label: "patient" }) includes animate', (prefs) => {
  const result = prefs.getEntityCategories({ label: 'patient' });
  assert(result.includes('animate'), `Expected 'animate' in ${JSON.stringify(result)}`);
}, 'P0');

test('EC-006: getEntityCategories({ type: "bfo:MaterialEntity", label: "ventilator" }) includes inanimate', (prefs) => {
  const result = prefs.getEntityCategories({ type: 'bfo:MaterialEntity', label: 'ventilator' });
  assert(result.includes('inanimate'), `Expected 'inanimate' in ${JSON.stringify(result)}`);
}, 'P0');

test('EC-007: getEntityCategories({ type: "cco:Person", label: "doctor" }) includes animate', (prefs) => {
  const result = prefs.getEntityCategories({ type: 'cco:Person', label: 'doctor' });
  assert(result.includes('animate'), `Expected 'animate' in ${JSON.stringify(result)}`);
}, 'P1');

test('EC-008: getEntityCategories({ label: "family" }) includes animate and collective', (prefs) => {
  const result = prefs.getEntityCategories({ label: 'family' });
  assert(result.includes('animate'), `Expected 'animate' in ${JSON.stringify(result)}`);
  assert(result.includes('collective'), `Expected 'collective' in ${JSON.stringify(result)}`);
}, 'P1');

test('EC-009: getEntityCategories({ type: "bfo:Quality" }) includes abstract', (prefs) => {
  const result = prefs.getEntityCategories({ type: 'bfo:Quality' });
  assert(result.includes('abstract'), `Expected 'abstract' in ${JSON.stringify(result)}`);
}, 'P1');

test('EC-010: getEntityCategories({ label: "hospital" }) includes organization', (prefs) => {
  const result = prefs.getEntityCategories({ label: 'hospital' });
  assert(result.includes('organization'), `Expected 'organization' in ${JSON.stringify(result)}`);
}, 'P1');

test('EC-011: getEntityCategories({}) returns unknown', (prefs) => {
  const result = prefs.getEntityCategories({});
  assert(result.includes('unknown'), `Expected 'unknown' in ${JSON.stringify(result)}`);
}, 'P2');

test('EC-012: getEntityCategories({ type: "cco:GroupOfPersons" }) includes organization and collective', (prefs) => {
  const result = prefs.getEntityCategories({ type: 'cco:GroupOfPersons' });
  assert(result.includes('organization'), `Expected 'organization' in ${JSON.stringify(result)}`);
  assert(result.includes('collective'), `Expected 'collective' in ${JSON.stringify(result)}`);
}, 'P1');

test('EC-013: getEntityCategories({ label: "The White House" }) includes organization (metonymy)', (prefs) => {
  const result = prefs.getEntityCategories({ label: 'The White House' });
  assert(result.includes('organization'), `Expected 'organization' in ${JSON.stringify(result)}`);
}, 'P1');

test('EC-014: getEntityCategories({ label: "surgeon" }) includes animate', (prefs) => {
  const result = prefs.getEntityCategories({ label: 'surgeon' });
  assert(result.includes('animate'), `Expected 'animate' in ${JSON.stringify(result)}`);
}, 'P1');

test('EC-015: getEntityCategories({ label: "board" }) includes organization', (prefs) => {
  const result = prefs.getEntityCategories({ label: 'board' });
  assert(result.includes('organization'), `Expected 'organization' in ${JSON.stringify(result)}`);
}, 'P1');

// ============================================================================
// Category 3: Subject Validation (20 tests)
// ============================================================================

test('SV-001: checkSubject("decide", { type: "cco:Person" }) is valid', (prefs) => {
  const result = prefs.checkSubject('decide', { type: 'cco:Person' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
  assert(result.confidence >= 0.9, `Expected confidence >= 0.9, got ${result.confidence}`);
}, 'P0');

test('SV-002: checkSubject("decide", { label: "rock" }) is invalid', (prefs) => {
  const result = prefs.checkSubject('decide', { label: 'rock' });
  assert.strictEqual(result.valid, false, `Expected valid=false, got ${result.valid}`);
  assert(result.confidence >= 0.85, `Expected confidence >= 0.85, got ${result.confidence}`);
}, 'P0');

test('SV-003: checkSubject("decide", { label: "committee" }) is valid (organization)', (prefs) => {
  const result = prefs.checkSubject('decide', { label: 'committee' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
  assert(result.confidence >= 0.85, `Expected confidence >= 0.85, got ${result.confidence}`);
}, 'P0');

test('SV-004: checkSubject("lift", { type: "cco:Person" }) is valid', (prefs) => {
  const result = prefs.checkSubject('lift', { type: 'cco:Person' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
  assert(result.confidence >= 0.9, `Expected confidence >= 0.9, got ${result.confidence}`);
}, 'P0');

test('SV-005: checkSubject("lift", { label: "committee" }) is invalid (org cannot lift)', (prefs) => {
  const result = prefs.checkSubject('lift', { label: 'committee' });
  assert.strictEqual(result.valid, false, `Expected valid=false, got ${result.valid}`);
}, 'P0');

test('SV-006: checkSubject("announce", { label: "hospital" }) is valid', (prefs) => {
  const result = prefs.checkSubject('announce', { label: 'hospital' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
  assert(result.confidence >= 0.85, `Expected confidence >= 0.85, got ${result.confidence}`);
}, 'P0');

test('SV-007: checkSubject("announce", { label: "ventilator" }) is invalid', (prefs) => {
  const result = prefs.checkSubject('announce', { label: 'ventilator' });
  assert.strictEqual(result.valid, false, `Expected valid=false, got ${result.valid}`);
}, 'P0');

test('SV-008: checkSubject("cause", { label: "storm" }) is valid (causation allows any)', (prefs) => {
  const result = prefs.checkSubject('cause', { label: 'storm' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
}, 'P1');

test('SV-009: checkSubject("give", { type: "cco:Person" }) is valid', (prefs) => {
  const result = prefs.checkSubject('give', { type: 'cco:Person' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
  assert(result.confidence >= 0.9, `Expected confidence >= 0.9, got ${result.confidence}`);
}, 'P0');

test('SV-010: checkSubject("give", { label: "machine" }) is invalid', (prefs) => {
  const result = prefs.checkSubject('give', { label: 'machine' });
  assert.strictEqual(result.valid, false, `Expected valid=false, got ${result.valid}`);
}, 'P1');

test('SV-011: checkSubject("believe", { label: "family" }) is valid', (prefs) => {
  const result = prefs.checkSubject('believe', { label: 'family' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
}, 'P1');

test('SV-012: checkSubject("think", { label: "patient" }) is valid', (prefs) => {
  const result = prefs.checkSubject('think', { label: 'patient' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
}, 'P1');

test('SV-013: checkSubject("think", { label: "policy" }) is invalid', (prefs) => {
  const result = prefs.checkSubject('think', { label: 'policy' });
  assert.strictEqual(result.valid, false, `Expected valid=false, got ${result.valid}`);
}, 'P1');

test('SV-014: checkSubject("walk", { type: "cco:Person" }) returns valid with low confidence (unknown verb)', (prefs) => {
  const result = prefs.checkSubject('walk', { type: 'cco:Person' });
  assert.strictEqual(result.valid, true, `Expected valid=true for unknown verb, got ${result.valid}`);
  assert(result.confidence <= 0.6, `Expected low confidence for unknown verb, got ${result.confidence}`);
}, 'P1');

test('SV-015: checkSubject("decide", { label: "The White House" }) is valid (metonymy)', (prefs) => {
  const result = prefs.checkSubject('decide', { label: 'The White House' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
}, 'P1');

test('SV-016: checkSubject("report", { label: "nurse" }) is valid', (prefs) => {
  const result = prefs.checkSubject('report', { label: 'nurse' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
}, 'P1');

test('SV-017: checkSubject("report", { label: "document" }) is invalid', (prefs) => {
  const result = prefs.checkSubject('report', { label: 'document' });
  assert.strictEqual(result.valid, false, `Expected valid=false, got ${result.valid}`);
}, 'P2');

test('SV-018: checkSubject("allocate", { label: "board" }) is valid', (prefs) => {
  const result = prefs.checkSubject('allocate', { label: 'board' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
}, 'P1');

test('SV-019: checkSubject("prefer", { type: "cco:Person" }) is valid', (prefs) => {
  const result = prefs.checkSubject('prefer', { type: 'cco:Person' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
}, 'P1');

test('SV-020: checkSubject("prefer", { label: "table" }) is invalid', (prefs) => {
  const result = prefs.checkSubject('prefer', { label: 'table' });
  assert.strictEqual(result.valid, false, `Expected valid=false, got ${result.valid}`);
}, 'P1');

// ============================================================================
// Category 4: Object Validation (10 tests)
// ============================================================================

test('OV-001: checkObject("lift", { label: "box" }) is valid', (prefs) => {
  const result = prefs.checkObject('lift', { label: 'box' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
}, 'P0');

test('OV-002: checkObject("lift", { label: "idea" }) is invalid (cannot lift abstract)', (prefs) => {
  const result = prefs.checkObject('lift', { label: 'idea' });
  assert.strictEqual(result.valid, false, `Expected valid=false, got ${result.valid}`);
}, 'P0');

test('OV-003: checkObject("give", { label: "medication" }) is valid', (prefs) => {
  const result = prefs.checkObject('give', { label: 'medication' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
}, 'P0');

test('OV-004: checkObject("announce", { label: "decision" }) is valid', (prefs) => {
  const result = prefs.checkObject('announce', { label: 'decision' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
}, 'P1');

test('OV-005: checkObject("decide", { label: "anything" }) is valid (mental verbs have loose object constraints)', (prefs) => {
  const result = prefs.checkObject('decide', { label: 'anything' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
}, 'P1');

test('OV-006: checkObject("allocate", { label: "organ" }) is valid', (prefs) => {
  const result = prefs.checkObject('allocate', { label: 'organ' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
}, 'P0');

test('OV-007: checkObject("allocate", { label: "resources" }) is valid', (prefs) => {
  const result = prefs.checkObject('allocate', { label: 'resources' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
}, 'P1');

test('OV-008: checkObject("throw", { type: "bfo:MaterialEntity" }) is valid', (prefs) => {
  const result = prefs.checkObject('throw', { type: 'bfo:MaterialEntity' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
}, 'P1');

test('OV-009: checkObject("throw", { label: "concept" }) is invalid', (prefs) => {
  const result = prefs.checkObject('throw', { label: 'concept' });
  assert.strictEqual(result.valid, false, `Expected valid=false, got ${result.valid}`);
}, 'P2');

test('OV-010: checkObject("provide", { label: "care" }) is valid', (prefs) => {
  const result = prefs.checkObject('provide', { label: 'care' });
  assert.strictEqual(result.valid, true, `Expected valid=true, got ${result.valid}`);
}, 'P0');

// ============================================================================
// Category 5: Edge Cases (5 tests)
// ============================================================================

test('EDGE-001: Unknown verb with known entity returns valid with low confidence', (prefs) => {
  const result = prefs.checkSubject('flibbertigibbet', { type: 'cco:Person' });
  assert.strictEqual(result.valid, true, `Expected valid=true for unknown verb`);
  assert(result.confidence <= 0.6, `Expected low confidence, got ${result.confidence}`);
}, 'P1');

test('EDGE-002: Known verb with empty entity returns valid with low confidence', (prefs) => {
  const result = prefs.checkSubject('decide', {});
  assert.strictEqual(result.valid, true, `Expected valid=true for unknown entity`);
  assert(result.confidence <= 0.6, `Expected low confidence, got ${result.confidence}`);
}, 'P1');

test('EDGE-003: Empty verb returns valid with zero confidence', (prefs) => {
  const result = prefs.checkSubject('', { type: 'cco:Person' });
  assert.strictEqual(result.valid, true, `Expected valid=true for empty verb`);
  assert(result.confidence === 0 || result.confidence <= 0.1, `Expected ~0 confidence, got ${result.confidence}`);
}, 'P2');

test('EDGE-004: Null entity returns valid with zero confidence', (prefs) => {
  const result = prefs.checkSubject('decide', null);
  assert.strictEqual(result.valid, true, `Expected valid=true for null entity`);
  assert(result.confidence === 0 || result.confidence <= 0.1, `Expected ~0 confidence, got ${result.confidence}`);
}, 'P2');

test('EDGE-005: Custom override via addEntityKeyword is respected', (prefs) => {
  prefs.addEntityKeyword('animate', 'robot');
  const result = prefs.getEntityCategories({ label: 'robot' });
  assert(result.includes('animate'), `Expected 'animate' after custom override, got ${JSON.stringify(result)}`);
}, 'P2');

// ============================================================================
// Run all tests
// ============================================================================

runTests();
