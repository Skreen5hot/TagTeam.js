/**
 * ENH-003: Implicit Agent for Imperatives
 * Test Suite for v1 Enhancement
 *
 * Acceptance Criteria:
 * AC-003.1: Imperative with no subject creates "you" agent
 * AC-003.2: Imperative "you" entity is reused across sentence
 * AC-003.3: Explicit subject prevents synthetic agent
 * AC-003.4: Polite imperative ("please") still creates agent
 * AC-003.5: Negative imperative creates agent
 */

const assert = require('assert');
const {
  buildGraph,
  findActByVerb,
  getAgentOfAct,
  findEntityByLabel,
  isNegated,
  getActualityStatus
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
  console.log('  ENH-003: Implicit Agent for Imperatives');
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
// AC-003.1: Imperative with no subject creates "you" agent
// ═══════════════════════════════════════════════════════════════

test('AC-003.1a: "Submit the report by Friday" → act has agent "you"', () => {
  const graph = buildGraph('Submit the report by Friday.');
  const agent = getAgentOfAct(graph, 'submit');

  assert.ok(agent, 'Act should have an agent');
  assert.strictEqual(agent['rdfs:label'], 'you',
    `Agent label should be "you", got: ${agent['rdfs:label']}`);
});

test('AC-003.1b: Implicit agent has denotesType = cco:Person', () => {
  const graph = buildGraph('Submit the report by Friday.');
  const agent = getAgentOfAct(graph, 'submit');

  assert.ok(agent, 'Act should have an agent');
  assert.strictEqual(agent['tagteam:denotesType'], 'cco:Person',
    `Agent denotesType should be cco:Person, got: ${agent['tagteam:denotesType']}`);
});

test('AC-003.1c: Implicit agent has referentialStatus = deictic', () => {
  const graph = buildGraph('Submit the report by Friday.');
  const agent = getAgentOfAct(graph, 'submit');

  assert.ok(agent, 'Act should have an agent');
  assert.strictEqual(agent['tagteam:referentialStatus'], 'deictic',
    `Agent should have referentialStatus "deictic", got: ${agent['tagteam:referentialStatus']}`);
});

test('AC-003.1d: Imperative act has actualityStatus = Prescribed', () => {
  const graph = buildGraph('Submit the report by Friday.');
  const status = getActualityStatus(graph, 'submit');

  assert.strictEqual(status, 'tagteam:Prescribed',
    `Imperative should be Prescribed, got: ${status}`);
});

// ═══════════════════════════════════════════════════════════════
// AC-003.2: Imperative "you" entity is reused across sentence
// ═══════════════════════════════════════════════════════════════

test('AC-003.2: "Review the design and submit the report" → same "you" for both acts', () => {
  const graph = buildGraph('Review the design and submit the report.');

  const reviewAgent = getAgentOfAct(graph, 'review');
  const submitAgent = getAgentOfAct(graph, 'submit');

  assert.ok(reviewAgent, 'Review act should have an agent');
  assert.ok(submitAgent, 'Submit act should have an agent');

  // Both should point to same entity (same IRI)
  assert.strictEqual(reviewAgent['@id'], submitAgent['@id'],
    'Both acts should share the same implicit "you" agent');
});

// ═══════════════════════════════════════════════════════════════
// AC-003.3: Explicit subject prevents synthetic agent
// ═══════════════════════════════════════════════════════════════

test('AC-003.3a: "You should submit the report" → agent is extracted "You", not synthetic', () => {
  const graph = buildGraph('You should submit the report.');
  const agent = getAgentOfAct(graph, 'submit');

  assert.ok(agent, 'Act should have an agent');
  // Check it's not marked as synthetic
  assert.ok(!agent['tagteam:synthetic'],
    'Explicit "You" should not be marked as synthetic');
});

test('AC-003.3b: No duplicate "you" entities when explicit subject present', () => {
  const graph = buildGraph('You should submit the report.');

  // Find all Tier 2 "you" entities (exclude Tier 1 DiscourseReferents)
  // Two-tier architecture: Tier 1 = DiscourseReferent, Tier 2 = Person/Artifact/etc.
  const youEntities = [];
  for (const node of graph['@graph'] || []) {
    if (node['rdfs:label']?.toLowerCase() === 'you' &&
        node['@type']?.includes('cco:Person')) {
      youEntities.push(node);
    }
  }

  assert.strictEqual(youEntities.length, 1,
    `Should have exactly 1 Tier 2 "you" entity, found: ${youEntities.length}`);
});

// ═══════════════════════════════════════════════════════════════
// AC-003.4: Polite imperative ("please") still creates agent
// ═══════════════════════════════════════════════════════════════

test('AC-003.4: "Please submit the report" → act has agent "you"', () => {
  const graph = buildGraph('Please submit the report.');
  const agent = getAgentOfAct(graph, 'submit');

  assert.ok(agent, 'Polite imperative should have an agent');
  assert.strictEqual(agent['rdfs:label'], 'you',
    `Agent should be "you", got: ${agent['rdfs:label']}`);
});

// ═══════════════════════════════════════════════════════════════
// AC-003.5: Negative imperative creates agent
// ═══════════════════════════════════════════════════════════════

test('AC-003.5a: "Don\'t touch the equipment" → act has agent "you"', () => {
  const graph = buildGraph("Don't touch the equipment.");
  const agent = getAgentOfAct(graph, 'touch');

  assert.ok(agent, 'Negative imperative should have an agent');
  assert.strictEqual(agent['rdfs:label'], 'you',
    `Agent should be "you", got: ${agent['rdfs:label']}`);
});

test('AC-003.5b: "Don\'t touch the equipment" → act has negated = true', () => {
  const graph = buildGraph("Don't touch the equipment.");
  const negated = isNegated(graph, 'touch');

  assert.strictEqual(negated, true,
    'Negative imperative should have negated = true');
});

// Run tests
runTests();
