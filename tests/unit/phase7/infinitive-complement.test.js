/**
 * Infinitive Complement Test Suite
 * Phase 7.2: Control Verb → Semantic Verb extraction
 *
 * "He needs to drop the hand gun" → act verb = "drop" (not "need")
 * Control verbs contribute modality; the infinitive is the IntentionalAct.
 */

const assert = require('assert');

let SemanticGraphBuilder;
try {
  SemanticGraphBuilder = require('../../../src/graph/SemanticGraphBuilder');
} catch (e) {
  console.log('Note: Required modules not found:', e.message);
}

const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Infinitive Complement Tests - Control Verb Extraction');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!SemanticGraphBuilder) {
    console.log('❌ SemanticGraphBuilder not found.\n');
    return;
  }

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

  console.log(`\n  Total: ${results.passed} passed, ${results.failed} failed\n`);
  if (results.failed > 0) process.exit(1);
}

function buildGraph(text) {
  const builder = new SemanticGraphBuilder();
  return builder.build(text);
}

function getNodes(graph) {
  return graph['@graph'] || [];
}

function findActs(graph) {
  return getNodes(graph).filter(n =>
    n['tagteam:verb'] && n['@type'] &&
    !n['@type'].includes('IntentionalAct')
  );
}

function findActByVerb(graph, verb) {
  return findActs(graph).find(a =>
    a['tagteam:verb'] === verb
  );
}

// ═══════════════════════════════════════════════════════════════
// Core: control verb + infinitive → infinitive is the act
// ═══════════════════════════════════════════════════════════════

test('"He needs to drop the hand gun" → act verb = "drop"', () => {
  const graph = buildGraph('He needs to drop the hand gun.');
  const drop = findActByVerb(graph, 'drop');
  assert.ok(drop, 'Should find act with verb "drop"');
  const need = findActByVerb(graph, 'need');
  assert.ok(!need, 'Should NOT find standalone act for "need" (absorbed into drop)');
});

test('"needs to drop" → sourceText includes control verb', () => {
  const graph = buildGraph('He needs to drop the hand gun.');
  const drop = findActByVerb(graph, 'drop');
  assert.ok(drop, 'Should find act with verb "drop"');
  assert.ok(drop['tagteam:sourceText'].includes('needs'),
    'sourceText should include "needs", got: ' + drop['tagteam:sourceText']);
});

test('"needs to drop" → modality = obligation', () => {
  const graph = buildGraph('He needs to drop the hand gun.');
  const drop = findActByVerb(graph, 'drop');
  assert.ok(drop, 'Should find act with verb "drop"');
  assert.strictEqual(drop['tagteam:modality'], 'obligation',
    'Control verb "need" should contribute obligation modality');
});

test('"needs to drop" → controlVerb = "need"', () => {
  const graph = buildGraph('He needs to drop the hand gun.');
  const drop = findActByVerb(graph, 'drop');
  assert.ok(drop, 'Should find act with verb "drop"');
  assert.strictEqual(drop['tagteam:controlVerb'], 'need');
});

test('"needs to drop" → actualityStatus = Prescribed', () => {
  const graph = buildGraph('He needs to drop the hand gun.');
  const drop = findActByVerb(graph, 'drop');
  assert.ok(drop, 'Should find act with verb "drop"');
  assert.strictEqual(drop['tagteam:actualityStatus'], 'tagteam:Prescribed',
    'Infinitive complement should be Prescribed, got: ' + drop['tagteam:actualityStatus']);
});

// ═══════════════════════════════════════════════════════════════
// Entity linking preserved: agent and affected
// ═══════════════════════════════════════════════════════════════

test('"He needs to drop the hand gun" → drop has agent (He)', () => {
  const graph = buildGraph('He needs to drop the hand gun.');
  const drop = findActByVerb(graph, 'drop');
  assert.ok(drop, 'Should find act with verb "drop"');
  assert.ok(drop['has_agent'], 'Drop should have an agent');
});

test('"He needs to drop the hand gun" → drop affects hand gun', () => {
  const graph = buildGraph('He needs to drop the hand gun.');
  const drop = findActByVerb(graph, 'drop');
  assert.ok(drop, 'Should find act with verb "drop"');
  assert.ok(drop['affects'] || drop['has_participant'],
    'Drop should affect hand gun');
});

// ═══════════════════════════════════════════════════════════════
// Other control verbs
// ═══════════════════════════════════════════════════════════════

test('"She wants to help the patient" → act verb = "help", modality = intention', () => {
  const graph = buildGraph('She wants to help the patient.');
  const help = findActByVerb(graph, 'help');
  assert.ok(help, 'Should find act with verb "help"');
  assert.strictEqual(help['tagteam:modality'], 'intention');
  const want = findActByVerb(graph, 'want');
  assert.ok(!want, 'Should NOT find standalone "want" act');
});

test('"He refused to comply" → act verb = "comply", modality = prohibition', () => {
  const graph = buildGraph('He refused to comply.');
  const comply = findActByVerb(graph, 'comply');
  assert.ok(comply, 'Should find act with verb "comply"');
  assert.strictEqual(comply['tagteam:modality'], 'prohibition');
});

// ═══════════════════════════════════════════════════════════════
// Non-control verbs: regular behavior unchanged
// ═══════════════════════════════════════════════════════════════

test('"The patient takes the medication" → act verb = "take" (no control verb)', () => {
  const graph = buildGraph('The patient takes the medication.');
  const take = findActByVerb(graph, 'take');
  assert.ok(take, 'Should find act with verb "take"');
  assert.ok(!take['tagteam:controlVerb'], 'Should not have controlVerb property');
  assert.strictEqual(take['tagteam:actualityStatus'], 'tagteam:Actual',
    'Non-control verb should be Actual');
});

test('"The doctor treats the patient" → unchanged behavior', () => {
  const graph = buildGraph('The doctor treats the patient.');
  const treat = findActByVerb(graph, 'treat');
  assert.ok(treat, 'Should find act with verb "treat"');
  assert.ok(!treat['tagteam:controlVerb'], 'Should not have controlVerb');
});

runTests();
