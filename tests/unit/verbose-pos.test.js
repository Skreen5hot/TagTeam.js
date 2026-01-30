/**
 * Verbose POS Diagnostic Mode Tests
 *
 * Tests the { verbose: true } option on SemanticGraphBuilder.build()
 * which attaches _debug.tokens with POS tag data from Compromise NLP.
 */

const assert = require('assert');

const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

function getBuilder() {
  const SemanticGraphBuilder = require('../../src/graph/SemanticGraphBuilder');
  return new SemanticGraphBuilder();
}

// ============================================================
// Default mode: no _debug property
// ============================================================

test('Default mode: output has no _debug property', () => {
  const builder = getBuilder();
  const result = builder.build('The doctor treated the patient.');
  assert.strictEqual(result._debug, undefined, 'Default output should not have _debug');
});

// ============================================================
// Verbose mode: _debug.tokens present
// ============================================================

test('Verbose mode: output has _debug.tokens array', () => {
  const builder = getBuilder();
  const result = builder.build('The doctor treated the patient.', { verbose: true });
  assert.ok(result._debug, 'Verbose output should have _debug');
  assert.ok(Array.isArray(result._debug.tokens), '_debug.tokens should be an array');
  assert.ok(result._debug.tokens.length > 0, '_debug.tokens should not be empty');
});

test('Verbose mode: each token has text and tags', () => {
  const builder = getBuilder();
  const result = builder.build('The doctor treated the patient.', { verbose: true });

  for (const token of result._debug.tokens) {
    assert.ok(typeof token.text === 'string', `Token should have text, got: ${JSON.stringify(token)}`);
    assert.ok(Array.isArray(token.tags), `Token should have tags array, got: ${JSON.stringify(token)}`);
  }
});

test('Verbose mode: tokens cover the input words', () => {
  const builder = getBuilder();
  const input = 'The doctor treated the patient.';
  const result = builder.build(input, { verbose: true });

  const tokenTexts = result._debug.tokens.map(t => t.text.toLowerCase());
  // Key content words should appear in tokens
  assert.ok(tokenTexts.some(t => t.includes('doctor')), 'Should contain "doctor"');
  assert.ok(tokenTexts.some(t => t.includes('treat')), 'Should contain "treated/treat"');
  assert.ok(tokenTexts.some(t => t.includes('patient')), 'Should contain "patient"');
});

test('Verbose mode: verb tokens have Verb tag', () => {
  const builder = getBuilder();
  const result = builder.build('The doctor treated the patient.', { verbose: true });

  const verbTokens = result._debug.tokens.filter(t => t.tags.some(tag => tag === 'Verb'));
  assert.ok(verbTokens.length > 0, 'Should have at least one verb token');
});

test('Verbose mode: noun tokens have Noun tag', () => {
  const builder = getBuilder();
  const result = builder.build('The doctor treated the patient.', { verbose: true });

  const nounTokens = result._debug.tokens.filter(t => t.tags.some(tag => tag === 'Noun'));
  assert.ok(nounTokens.length > 0, 'Should have at least one noun token');
});

test('Verbose mode: graph output is unchanged', () => {
  const builder1 = getBuilder();
  const builder2 = getBuilder();
  const input = 'The doctor treated the patient.';

  const normal = builder1.build(input);
  const verbose = builder2.build(input, { verbose: true });

  // Same number of graph nodes
  assert.strictEqual(normal['@graph'].length, verbose['@graph'].length,
    'Should have same number of graph nodes');

  // Same node @ids and @types (ignoring timestamps)
  const normalIds = normal['@graph'].map(n => n['@id']).sort();
  const verboseIds = verbose['@graph'].map(n => n['@id']).sort();
  assert.deepStrictEqual(normalIds, verboseIds,
    'Should have same node @ids in both modes');
});

// ============================================================
// Runner
// ============================================================

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Verbose POS Diagnostic Mode Tests');
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
