/**
 * AC-0.5: UD v2 → BFO/CCO Role Mapping Contract
 *
 * Source: TagTeam-Major-Refactor-v2.2.md §5.3
 * Authority: Universal Dependencies v2, BFO 2.0, CCO v1.5
 *
 * Tests the normative contract between dependency labels and BFO/CCO roles.
 * This mapping is the single source of truth for all role assignment.
 */

'use strict';

const path = require('path');

// Module under test
let RoleMappingContract;
try {
  RoleMappingContract = require(path.join(__dirname, '../../../src/core/RoleMappingContract'));
} catch (e) {
  RoleMappingContract = null;
}

// Test runner
let passed = 0;
let failed = 0;
let errors = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (e) {
    failed++;
    errors.push({ name, error: e.message });
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    ${e.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      (message || 'Assertion failed') +
      `\n    Expected: ${JSON.stringify(expected)}` +
      `\n    Actual:   ${JSON.stringify(actual)}`
    );
  }
}

// ============================================================================
// AC-0.5: Core Argument Role Mapping
// ============================================================================

console.log('\n\x1b[1mAC-0.5: UD v2 → BFO/CCO Role Mapping\x1b[0m');

test('RoleMappingContract module exists and loads', () => {
  assert(RoleMappingContract !== null, 'RoleMappingContract module failed to load');
});

test('exports UD_TO_BFO_ROLE mapping', () => {
  assert(RoleMappingContract, 'Module not loaded');
  assert(typeof RoleMappingContract.UD_TO_BFO_ROLE === 'object',
    'UD_TO_BFO_ROLE should be an object');
});

test('exports CASE_TO_OBLIQUE_ROLE mapping', () => {
  assert(RoleMappingContract, 'Module not loaded');
  assert(typeof RoleMappingContract.CASE_TO_OBLIQUE_ROLE === 'object',
    'CASE_TO_OBLIQUE_ROLE should be an object');
});

test('exports mapUDToRole() function', () => {
  assert(RoleMappingContract, 'Module not loaded');
  assert(typeof RoleMappingContract.mapUDToRole === 'function',
    'mapUDToRole should be a function');
});

test('exports mapCaseToOblique() function', () => {
  assert(RoleMappingContract, 'Module not loaded');
  assert(typeof RoleMappingContract.mapCaseToOblique === 'function',
    'mapCaseToOblique should be a function');
});

// --- Core argument roles ---

console.log('\n  \x1b[36mCore Argument Mappings:\x1b[0m');

test("'nsubj' → bfo:Role with label AgentRole", () => {
  assert(RoleMappingContract, 'Module not loaded');
  const result = RoleMappingContract.mapUDToRole('nsubj');
  assertEqual(result.role, 'Role',
    "'nsubj' should map to bfo:Role");
  assertEqual(result.label, 'AgentRole',
    "'nsubj' label should be AgentRole");
});

test("'obj' → bfo:Role with label PatientRole", () => {
  assert(RoleMappingContract, 'Module not loaded');
  const result = RoleMappingContract.mapUDToRole('obj');
  assertEqual(result.role, 'Role',
    "'obj' should map to bfo:Role");
  assertEqual(result.label, 'PatientRole',
    "'obj' label should be PatientRole");
});

test("'iobj' → bfo:Role with label RecipientRole", () => {
  assert(RoleMappingContract, 'Module not loaded');
  const result = RoleMappingContract.mapUDToRole('iobj');
  assertEqual(result.role, 'Role',
    "'iobj' should map to bfo:Role");
  assertEqual(result.label, 'RecipientRole',
    "'iobj' label should be RecipientRole");
});

test("'nsubj:pass' → bfo:Role with label PatientRole", () => {
  assert(RoleMappingContract, 'Module not loaded');
  const result = RoleMappingContract.mapUDToRole('nsubj:pass');
  assertEqual(result.role, 'Role',
    "'nsubj:pass' should map to bfo:Role (passive subject = patient)");
  assertEqual(result.label, 'PatientRole',
    "'nsubj:pass' label should be PatientRole");
});

test("'obl:agent' → bfo:Role with label AgentRole", () => {
  assert(RoleMappingContract, 'Module not loaded');
  const result = RoleMappingContract.mapUDToRole('obl:agent');
  assertEqual(result.role, 'Role',
    "'obl:agent' should map to bfo:Role (passive 'by' phrase)");
  assertEqual(result.label, 'AgentRole',
    "'obl:agent' label should be AgentRole");
});

test("'obl' → bfo:Role with label ObliqueRole (subtyped by case)", () => {
  assert(RoleMappingContract, 'Module not loaded');
  const result = RoleMappingContract.mapUDToRole('obl');
  assertEqual(result.role, 'Role',
    "'obl' should map to bfo:Role");
  assertEqual(result.label, 'ObliqueRole',
    "'obl' label should be ObliqueRole");
});

// --- Oblique role subtyping by preposition ---

console.log('\n  \x1b[36mOblique Role Subtyping (CASE_TO_OBLIQUE_ROLE):\x1b[0m');

test("case='for' → 'BeneficiaryRole'", () => {
  assert(RoleMappingContract, 'Module not loaded');
  assertEqual(
    RoleMappingContract.mapCaseToOblique('for'),
    'BeneficiaryRole'
  );
});

test("case='with' → 'InstrumentRole'", () => {
  assert(RoleMappingContract, 'Module not loaded');
  assertEqual(
    RoleMappingContract.mapCaseToOblique('with'),
    'InstrumentRole'
  );
});

test("case='at' → 'LocationRole'", () => {
  assert(RoleMappingContract, 'Module not loaded');
  assertEqual(
    RoleMappingContract.mapCaseToOblique('at'),
    'LocationRole'
  );
});

test("case='in' → 'LocationRole'", () => {
  assert(RoleMappingContract, 'Module not loaded');
  assertEqual(
    RoleMappingContract.mapCaseToOblique('in'),
    'LocationRole'
  );
});

test("case='on' → 'LocationRole'", () => {
  assert(RoleMappingContract, 'Module not loaded');
  assertEqual(
    RoleMappingContract.mapCaseToOblique('on'),
    'LocationRole'
  );
});

test("case='from' → 'SourceRole'", () => {
  assert(RoleMappingContract, 'Module not loaded');
  assertEqual(
    RoleMappingContract.mapCaseToOblique('from'),
    'SourceRole'
  );
});

test("case='to' → 'DestinationRole'", () => {
  assert(RoleMappingContract, 'Module not loaded');
  assertEqual(
    RoleMappingContract.mapCaseToOblique('to'),
    'DestinationRole'
  );
});

test("case='by' → 'AgentRole'", () => {
  assert(RoleMappingContract, 'Module not loaded');
  assertEqual(
    RoleMappingContract.mapCaseToOblique('by'),
    'AgentRole'
  );
});

test("case='about' → 'TopicRole'", () => {
  assert(RoleMappingContract, 'Module not loaded');
  assertEqual(
    RoleMappingContract.mapCaseToOblique('about'),
    'TopicRole'
  );
});

test("case='against' → 'OpponentRole'", () => {
  assert(RoleMappingContract, 'Module not loaded');
  assertEqual(
    RoleMappingContract.mapCaseToOblique('against'),
    'OpponentRole'
  );
});

// --- Edge cases ---

console.log('\n  \x1b[36mEdge Cases:\x1b[0m');

test("mapUDToRole() returns null for unmapped label", () => {
  assert(RoleMappingContract, 'Module not loaded');
  const result = RoleMappingContract.mapUDToRole('punct');
  assertEqual(result, null,
    "'punct' should not map to any role (returns null)");
});

test("mapCaseToOblique() returns null for unmapped preposition", () => {
  assert(RoleMappingContract, 'Module not loaded');
  const result = RoleMappingContract.mapCaseToOblique('during');
  assertEqual(result, null,
    "'during' is not in the contract (returns null)");
});

test("All UD_TO_BFO_ROLE entries have BFO identifier", () => {
  assert(RoleMappingContract, 'Module not loaded');
  for (const [label, mapping] of Object.entries(RoleMappingContract.UD_TO_BFO_ROLE)) {
    assert(mapping.bfo && mapping.bfo.startsWith('bfo:'),
      `UD label '${label}' missing BFO identifier`);
  }
});

test("All UD_TO_BFO_ROLE entries have note", () => {
  assert(RoleMappingContract, 'Module not loaded');
  for (const [label, mapping] of Object.entries(RoleMappingContract.UD_TO_BFO_ROLE)) {
    assert(typeof mapping.note === 'string' && mapping.note.length > 0,
      `UD label '${label}' missing note`);
  }
});

test("Mappings are immutable (frozen)", () => {
  assert(RoleMappingContract, 'Module not loaded');
  assert(Object.isFrozen(RoleMappingContract.UD_TO_BFO_ROLE),
    'UD_TO_BFO_ROLE should be frozen');
  assert(Object.isFrozen(RoleMappingContract.CASE_TO_OBLIQUE_ROLE),
    'CASE_TO_OBLIQUE_ROLE should be frozen');
});

// ============================================================================
// Summary
// ============================================================================

console.log(`\n\x1b[1mResults: ${passed} passed, ${failed} failed\x1b[0m`);
if (failed > 0) {
  console.log('\x1b[31mFailing tests:\x1b[0m');
  errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
  process.exit(1);
}
