#!/usr/bin/env node
/**
 * ISA Multi-Sentence Regression Tests (Wave 1 SBA)
 *
 * Tests 10 multi-sentence inputs from CMS-DHS MOA corpus.
 * Validates: sentence segmentation, no cross-sentence arcs,
 * independent DICE generation, SentenceCluster structure.
 *
 * Run: node tests/corpus/isa-multi-sentence.test.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let TagTeam;
try {
  TagTeam = require('../../dist/tagteam.js');
} catch (e) {
  console.error('Failed to load TagTeam:', e.message);
  process.exit(1);
}

const corpus = JSON.parse(fs.readFileSync(path.join(__dirname, 'isa-multi-sentence.json'), 'utf8'));

const hasType = (n, t) => [].concat(n['@type'] || []).some(x => x.includes(t));
const isSystem = n => (n['rdfs:label'] || '').includes('parsing');

let passed = 0;
let failed = 0;

function test(id, desc, fn) {
  try {
    fn();
    console.log(`  \u2713 ${id}: ${desc}`);
    passed++;
  } catch (e) {
    console.log(`  \u2717 ${id}: ${desc}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

console.log('ISA Multi-Sentence Regression Tests (Wave 1)');
console.log('=' .repeat(60));

for (const input of corpus.sentences) {
  console.log(`\n\u{1F4CB} ${input.id} [${input.category}]`);
  console.log(`   "${input.input.substring(0, 60)}..."`);

  const g = TagTeam.buildGraph(input.input);
  const nodes = g['@graph'] || [];
  const md = g._metadata;

  // AC-SBA-1: Correct sentence count
  test(input.id + '-segmentation', `Segments into ${input.expectedSentences} sentences`, () => {
    assert.strictEqual(md.sentences.length, input.expectedSentences,
      `Expected ${input.expectedSentences} sentences, got ${md.sentences.length}`);
  });

  // AC-SBA-1: No cross-sentence arcs (all arcs sentence-relative)
  test(input.id + '-no-cross-arcs', 'No cross-sentence arcs', () => {
    for (let si = 0; si < md.sentences.length; si++) {
      const sent = md.sentences[si];
      const maxIdx = sent.tokens.length;
      for (const arc of (sent.arcs || [])) {
        const head = arc.head || arc.dependent;
        const dep = arc.dependent;
        assert(dep >= 0 && dep <= maxIdx,
          `Sentence ${si}: arc dep ${dep} out of range [0, ${maxIdx}]`);
        assert(head >= 0 && head <= maxIdx,
          `Sentence ${si}: arc head ${head} out of range [0, ${maxIdx}]`);
      }
    }
  });

  // AC-SBA-10: SentenceClusters match sentence count
  const clusters = nodes.filter(n => hasType(n, 'SentenceCluster'));
  test(input.id + '-clusters', `${input.expectedSentences} SentenceClusters`, () => {
    assert.strictEqual(clusters.length, input.expectedSentences,
      `Expected ${input.expectedSentences} clusters, got ${clusters.length}`);
  });

  // DICE count (deontic independence)
  const dices = nodes.filter(n => hasType(n, 'DirectiveInformationContentEntity'));
  test(input.id + '-dices', `${input.expectedDICEs} DICEs`, () => {
    assert.strictEqual(dices.length, input.expectedDICEs,
      `Expected ${input.expectedDICEs} DICEs, got ${dices.length}`);
  });

  // AC-SBA-6: sentenceIndex on all Tier 1 nodes
  const tier1 = nodes.filter(n => hasType(n, 'DiscourseReferent') || hasType(n, 'VerbPhrase'));
  test(input.id + '-sentenceIndex', 'All Tier 1 nodes have sentenceIndex', () => {
    for (const node of tier1) {
      assert(node['tagteam:sentenceIndex'] !== undefined,
        `Node ${node['rdfs:label']} missing sentenceIndex`);
    }
  });

  // AC-SBA-8: Single IBE
  const ibes = nodes.filter(n => hasType(n, 'InformationBearingEntity'));
  test(input.id + '-single-ibe', 'Single IBE node', () => {
    assert.strictEqual(ibes.length, 1, `Expected 1 IBE, got ${ibes.length}`);
  });

  // SystemGenerated on ParsingAct
  const pa = nodes.find(n => hasType(n, 'IntentionalAct') && isSystem(n));
  test(input.id + '-system-gen', 'ParsingAct has systemGenerated', () => {
    assert(pa && pa['tagteam:systemGenerated'] === true, 'Missing systemGenerated');
  });
}

console.log('\n' + '='.repeat(60));
console.log(`Total: ${passed + failed}`);
console.log(`  \u2713 Passed: ${passed}`);
console.log(`  \u2717 Failed: ${failed}`);
console.log(`\n  Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
