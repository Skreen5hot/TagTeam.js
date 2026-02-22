/**
 * ENH-001: Verb-Context Object Typing
 * Test Suite for v1 Enhancement
 *
 * Acceptance Criteria:
 * AC-001.1: Cognitive verb refines ambiguous object to ICE
 * AC-001.2: Physical verb preserves Artifact type
 * AC-001.3: Unambiguous entities are not refined
 * AC-001.4: Cognitive verbs include evaluative class
 * AC-001.5: Unknown verbs don't change type
 * AC-001.6: Verb refinement recorded in metadata
 */

const assert = require('assert');
const {
  buildGraph,
  findEntityByLabel,
  hasDenotesType,
  findActByVerb
} = require('./test-utils');

const tests = [];
const results = { passed: 0, failed: 0, skipped: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

function skip(name, fn) {
  tests.push({ name, fn, skip: true });
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ENH-001: Verb-Context Object Typing');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const t of tests) {
    if (t.skip) {
      results.skipped++;
      console.log(`  ⏭️  ${t.name} (skipped)`);
      continue;
    }

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

  console.log(`\n  Total: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped\n`);

  if (results.failed > 0) {
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════
// AC-001.1: Cognitive verb refines ambiguous object to ICE
// ═══════════════════════════════════════════════════════════════

test('AC-001.1a: "The engineer reviewed the design" → design is ICE', () => {
  const graph = buildGraph('The engineer reviewed the design.');
  const design = findEntityByLabel(graph, 'design');

  assert.ok(design, 'Should find design entity');
  assert.strictEqual(design['tagteam:denotesType'], 'InformationContentEntity',
    `Design should be ICE when reviewed, got: ${design['tagteam:denotesType']}`);
});

test('AC-001.1b: "The manager read the report" → report is ICE', () => {
  const graph = buildGraph('The manager read the report.');
  const report = findEntityByLabel(graph, 'report');

  assert.ok(report, 'Should find report entity');
  assert.strictEqual(report['tagteam:denotesType'], 'InformationContentEntity',
    `Report should be ICE when read, got: ${report['tagteam:denotesType']}`);
});

test('AC-001.1c: "The team studied the document" → document is ICE', () => {
  const graph = buildGraph('The team studied the document.');
  const document = findEntityByLabel(graph, 'document');

  assert.ok(document, 'Should find document entity');
  assert.strictEqual(document['tagteam:denotesType'], 'InformationContentEntity',
    `Document should be ICE when studied, got: ${document['tagteam:denotesType']}`);
});

// ═══════════════════════════════════════════════════════════════
// AC-001.2: Physical verb preserves Artifact type
// ═══════════════════════════════════════════════════════════════

test('AC-001.2a: "The engineer built the design" → design is Artifact', () => {
  const graph = buildGraph('The engineer built the design.');
  const design = findEntityByLabel(graph, 'design');

  assert.ok(design, 'Should find design entity');
  // "built" implies physical creation - design is a physical artifact
  assert.strictEqual(design['tagteam:denotesType'], 'Artifact',
    `Design should be Artifact when built, got: ${design['tagteam:denotesType']}`);
});

test('AC-001.2b: "The worker carried the report" → report is Artifact', () => {
  const graph = buildGraph('The worker carried the report.');
  const report = findEntityByLabel(graph, 'report');

  assert.ok(report, 'Should find report entity');
  // "carried" is physical - report is physical object
  assert.strictEqual(report['tagteam:denotesType'], 'Artifact',
    `Report should be Artifact when carried, got: ${report['tagteam:denotesType']}`);
});

// ═══════════════════════════════════════════════════════════════
// AC-001.3: Unambiguous entities are not refined
// ═══════════════════════════════════════════════════════════════

test('AC-001.3a: "The engineer reviewed the patient" → patient remains Person', () => {
  const graph = buildGraph('The engineer reviewed the patient.');
  const patient = findEntityByLabel(graph, 'patient');

  assert.ok(patient, 'Should find patient entity');
  assert.strictEqual(patient['tagteam:denotesType'], 'Person',
    `Patient should remain Person, got: ${patient['tagteam:denotesType']}`);
});

test('AC-001.3b: "The doctor analyzed the medication" → medication remains Artifact', () => {
  const graph = buildGraph('The doctor analyzed the medication.');
  const medication = findEntityByLabel(graph, 'medication');

  assert.ok(medication, 'Should find medication entity');
  // Medication is explicitly a physical thing, not refinable to ICE
  assert.ok(
    medication['tagteam:denotesType'] === 'Artifact' ||
    medication['tagteam:denotesType'] === 'MaterialEntity',
    `Medication should remain Artifact or MaterialEntity, got: ${medication['tagteam:denotesType']}`
  );
});

// ═══════════════════════════════════════════════════════════════
// AC-001.4: Cognitive verbs include evaluative class
// ═══════════════════════════════════════════════════════════════

test('AC-001.4a: "The auditor analyzed the data" → data is ICE', () => {
  const graph = buildGraph('The auditor analyzed the data.');
  const data = findEntityByLabel(graph, 'data');

  assert.ok(data, 'Should find data entity');
  assert.strictEqual(data['tagteam:denotesType'], 'InformationContentEntity',
    `Data should be ICE when analyzed, got: ${data['tagteam:denotesType']}`);
});

test('AC-001.4b: "The committee evaluated the proposal" → proposal is ICE', () => {
  const graph = buildGraph('The committee evaluated the proposal.');
  const proposal = findEntityByLabel(graph, 'proposal');

  assert.ok(proposal, 'Should find proposal entity');
  assert.strictEqual(proposal['tagteam:denotesType'], 'InformationContentEntity',
    `Proposal should be ICE when evaluated, got: ${proposal['tagteam:denotesType']}`);
});

test('AC-001.4c: "The inspector examined the specifications" → specifications is ICE', () => {
  const graph = buildGraph('The inspector examined the specifications.');
  const specs = findEntityByLabel(graph, 'specifications');

  assert.ok(specs, 'Should find specifications entity');
  assert.strictEqual(specs['tagteam:denotesType'], 'InformationContentEntity',
    `Specifications should be ICE when examined, got: ${specs['tagteam:denotesType']}`);
});

// ═══════════════════════════════════════════════════════════════
// AC-001.5: Unknown verbs don't change type
// ═══════════════════════════════════════════════════════════════

test('AC-001.5: "The engineer glorped the design" → design retains default type', () => {
  const graph = buildGraph('The engineer glorped the design.');
  const design = findEntityByLabel(graph, 'design');

  assert.ok(design, 'Should find design entity');
  // Unknown verb should not refine - keeps system default (bfo:BFO_0000040 = MaterialEntity)
  // The key assertion is that it should NOT be refined to ICE
  assert.notStrictEqual(design['tagteam:denotesType'], 'InformationContentEntity',
    'Unknown verb should NOT refine to ICE');
  // And typeRefinedBy should be undefined (no refinement happened)
  assert.ok(!design['tagteam:typeRefinedBy'],
    'Unknown verb should not set typeRefinedBy');
});

// ═══════════════════════════════════════════════════════════════
// AC-001.6: Verb refinement recorded in metadata
// ═══════════════════════════════════════════════════════════════

test('AC-001.6: "The engineer reviewed the design" → typeRefinedBy = "review"', () => {
  const graph = buildGraph('The engineer reviewed the design.');
  const design = findEntityByLabel(graph, 'design');

  assert.ok(design, 'Should find design entity');
  assert.strictEqual(design['tagteam:typeRefinedBy'], 'review',
    `Should record refining verb, got: ${design['tagteam:typeRefinedBy']}`);
});

// Run tests
runTests();
