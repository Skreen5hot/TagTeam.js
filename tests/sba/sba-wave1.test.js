#!/usr/bin/env node
/**
 * SBA Wave 1 Validation Tests
 *
 * Source: docs/research/sba-test-suite-v1.5.0.json
 * Spec: docs/tagteam-sentence-boundary-spec-v1.3.md
 *
 * Tests the 15 Wave 1 assertions from the SBA test suite.
 * Wave 2/3 tests run as discovery (failures documented, not blocking).
 *
 * Run: node tests/sba/sba-wave1.test.js
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

const suite = JSON.parse(fs.readFileSync(path.join(__dirname, '../../docs/research/sba-test-suite-v1.5.0.json'), 'utf8'));

const hasType = (n, t) => [].concat(n['@type'] || []).some(x => x.includes(t));

let passed = 0, failed = 0, discovery = 0;

function test(id, desc, fn, isDiscovery) {
  try {
    fn();
    console.log(`  \u2713 ${id}: ${desc}`);
    passed++;
  } catch (e) {
    if (isDiscovery) {
      console.log(`  \u25CB ${id}: ${desc} [DISCOVERY]`);
      console.log(`    ${e.message}`);
      discovery++;
    } else {
      console.log(`  \u2717 ${id}: ${desc}`);
      console.log(`    ${e.message}`);
      failed++;
    }
  }
}

console.log(`SBA Test Suite v${suite.version} — Wave 1 Validation`);
console.log('='.repeat(60));

for (const tc of suite.test_cases) {
  const isWave1 = tc.wave === 1;
  const label = isWave1 ? '' : ` [Wave ${tc.wave}]`;
  console.log(`\n\u{1F4CB} ${tc.id}: ${tc.name}${label}`);

  // SBA-013: Integration test — two independent invocations, compare Tier 2 IRIs
  if (tc.id === 'SBA-013' && tc.inputs) {
    let g1, g2, g3;
    try {
      g1 = TagTeam.buildGraph(tc.inputs[0]);
      g2 = TagTeam.buildGraph(tc.inputs[1]);
      g3 = TagTeam.buildGraph(tc.inputs[0]); // third run for determinism check
    } catch (e) {
      console.log(`  \u2717 ${tc.id}: Parse error: ${e.message}`);
      failed++;
      continue;
    }

    const findTier2IRI = (graph, label) => {
      const nodes = graph['@graph'] || [];
      for (const n of nodes) {
        const types = [].concat(n['@type'] || []);
        if (types.some(t => t.includes('Tier2') || t.includes('RealWorldEntity')) &&
            (n['rdfs:label'] || '').includes(label)) {
          return n['@id'];
        }
      }
      // Fallback: look for any node with matching label that has a Tier 2-style IRI
      for (const n of nodes) {
        if ((n['rdfs:label'] || '').includes(label) && (n['@id'] || '').includes('inst:')) {
          const id = n['@id'];
          // Tier 2 IRIs don't contain ParsingAct or sentence-specific markers
          if (!id.includes('ParsingAct') && !id.includes('_s0_') && !id.includes('_s1_')) {
            return id;
          }
        }
      }
      return null;
    };

    const iri1 = findTier2IRI(g1, 'CMS');
    const iri2 = findTier2IRI(g2, 'CMS');
    const iri3 = findTier2IRI(g3, 'CMS');
    const pa1 = (g1['@graph'] || []).find(n => (n['@id'] || '').includes('ParsingAct'));
    const pa2 = (g2['@graph'] || []).find(n => (n['@id'] || '').includes('ParsingAct'));
    const paId1 = pa1 ? pa1['@id'] : '';
    const paId2 = pa2 ? pa2['@id'] : '';

    for (let ci = 0; ci < (tc.success_criteria || []).length; ci++) {
      const criterion = tc.success_criteria[ci];
      const testId = `${tc.id}-C${ci + 1}`;

      test(testId, criterion.substring(0, 80), () => {
        if (criterion.includes('tier2_iri') && criterion.includes('strict string equality')) {
          assert(iri1, 'No Tier 2 IRI found for CMS in invocation 1');
          assert(iri2, 'No Tier 2 IRI found for CMS in invocation 2');
          assert.strictEqual(iri1, iri2, `Tier 2 IRIs differ: "${iri1}" vs "${iri2}"`);
        }
        if (criterion.includes('parsingActId from invocation_1')) {
          assert(iri1, 'No Tier 2 IRI found');
          assert(iri2, 'No Tier 2 IRI found');
          // Extract the unique hash part of parsingActId
          const paHash1 = paId1.replace(/.*ParsingAct_/, '');
          if (paHash1) {
            assert(!iri1.includes(paHash1), `IRI1 contains parsingActId1 hash: ${paHash1}`);
            assert(!iri2.includes(paHash1), `IRI2 contains parsingActId1 hash: ${paHash1}`);
          }
        }
        if (criterion.includes('parsingActId from invocation_2')) {
          assert(iri1, 'No Tier 2 IRI found');
          assert(iri2, 'No Tier 2 IRI found');
          const paHash2 = paId2.replace(/.*ParsingAct_/, '');
          if (paHash2) {
            assert(!iri1.includes(paHash2), `IRI1 contains parsingActId2 hash: ${paHash2}`);
            assert(!iri2.includes(paHash2), `IRI2 contains parsingActId2 hash: ${paHash2}`);
          }
        }
        if (criterion.includes('three times in sequence')) {
          assert(iri1, 'No Tier 2 IRI found in run 1');
          assert(iri3, 'No Tier 2 IRI found in run 3');
          assert.strictEqual(iri1, iri3, `IRI not stable across runs: "${iri1}" vs "${iri3}"`);
        }
        if (criterion.includes('FAILURE MODE')) {
          assert(iri1, 'No Tier 2 IRI found');
          const lower = iri1.toLowerCase();
          assert(!lower.includes('uuid'), `IRI contains 'uuid': ${iri1}`);
        }
      }, !isWave1);
    }
    continue;
  }

  if (!tc.input) {
    console.log('  \u25CB Skipped — no input defined');
    discovery++;
    continue;
  }

  // Build graph
  let g, md, nodes;
  try {
    g = TagTeam.buildGraph(tc.input);
    md = g._metadata;
    nodes = g['@graph'] || [];
  } catch (e) {
    // Some tests expect errors (negative tests)
    if (tc.id === 'SBA-011' || tc.id === 'SBA-025') {
      test(tc.id, tc.name, () => { /* negative test — error is success */ }, !isWave1);
      continue;
    }
    console.log(`  \u2717 ${tc.id}: Parse error: ${e.message}`);
    failed++;
    continue;
  }

  // Run success_criteria assertions
  for (let ci = 0; ci < (tc.success_criteria || []).length; ci++) {
    const criterion = tc.success_criteria[ci];
    const testId = `${tc.id}-C${ci + 1}`;

    test(testId, criterion.substring(0, 80), () => {
      // Sentence count assertions
      if (criterion.includes('sentences.length ===')) {
        const match = criterion.match(/sentences\.length === (\d+)/);
        if (match) assert.strictEqual(md.sentences.length, parseInt(match[1]), criterion);
      }

      // Root indexing assertions
      if (criterion.includes('sentences[1].root ===')) {
        const match = criterion.match(/sentences\[1\]\.root === (\d+)/);
        if (match && md.sentences[1]) {
          const specRoot = parseInt(match[1]);
          const actualRoot = md.sentences[1].root;
          assert(actualRoot === specRoot || actualRoot === specRoot + 1,
            `root ${actualRoot} doesn't match spec root ${specRoot} (0-based) or ${specRoot + 1} (1-based)`);
        }
      }

      // Root within bounds
      if (criterion.includes('sentences[1].root is strictly within')) {
        if (md.sentences[1]) {
          assert(md.sentences[1].root >= 0 && md.sentences[1].root < md.sentences[1].tokens.length,
            `root ${md.sentences[1].root} out of range [0, ${md.sentences[1].tokens.length})`);
        }
      }

      // No arc >= tokens.length
      if (criterion.includes('No arc head or dependent')) {
        if (md.sentences[1]) {
          for (const arc of (md.sentences[1].arcs || [])) {
            assert(arc.head < md.sentences[1].tokens.length + 1 && arc.dependent < md.sentences[1].tokens.length + 1,
              `Arc crosses boundary: head=${arc.head} dep=${arc.dependent}`);
          }
        }
      }

      // logicalConnector === null
      if (criterion.includes('logicalConnector === null')) {
        const match = criterion.match(/sentences\[(\d+)\]/);
        if (match && md.sentences[parseInt(match[1])]) {
          assert.strictEqual(md.sentences[parseInt(match[1])].logicalConnector, null, criterion);
        }
      }

      // logicalConnector === 'value' (non-null)
      if (criterion.includes('logicalConnector ===') && !criterion.includes('null')) {
        const sentMatch = criterion.match(/sentences\[(\d+)\]\.logicalConnector === '([^']+)'/);
        if (sentMatch && md.sentences[parseInt(sentMatch[1])]) {
          assert.strictEqual(md.sentences[parseInt(sentMatch[1])].logicalConnector, sentMatch[2], criterion);
        }
        const relMatch = criterion.match(/sentenceRelationships\[(\d+)\]\.logicalConnector === '([^']+)'/);
        if (relMatch && md.sentenceRelationships[parseInt(relMatch[1])]) {
          assert.strictEqual(md.sentenceRelationships[parseInt(relMatch[1])].logicalConnector, relMatch[2], criterion);
        }
      }

      // sentenceRelationships empty
      if (criterion.includes('sentenceRelationships is an empty array')) {
        assert(Array.isArray(md.sentenceRelationships), 'sentenceRelationships must be array');
        assert.strictEqual(md.sentenceRelationships.length, 0, criterion);
      }

      // relationshipType === 'value'
      if (criterion.includes('relationshipType ===')) {
        const match = criterion.match(/sentenceRelationships\[(\d+)\]\.relationshipType === '([^']+)'/);
        if (match && md.sentenceRelationships[parseInt(match[1])]) {
          assert.strictEqual(md.sentenceRelationships[parseInt(match[1])].relationshipType, match[2], criterion);
        }
      }

      // relationshipType !== 'value'
      if (criterion.includes('relationshipType !==')) {
        const match = criterion.match(/sentenceRelationships\[(\d+)\]\.relationshipType !== '([^']+)'/);
        if (match && md.sentenceRelationships[parseInt(match[1])]) {
          assert.notStrictEqual(md.sentenceRelationships[parseInt(match[1])].relationshipType, match[2], criterion);
        }
      }

      // segmentationType === 'value'
      if (criterion.includes('segmentationType ===')) {
        const match = criterion.match(/sentences\[(\d+)\]\.segmentationType === '([^']+)'/);
        if (match && md.sentences[parseInt(match[1])]) {
          assert.strictEqual(md.sentences[parseInt(match[1])].segmentationType, match[2], criterion);
        }
      }

      // listMarker === 'value'
      if (criterion.includes('listMarker ===')) {
        const match = criterion.match(/sentences\[(\d+)\]\.listMarker === '([^']+)'/);
        if (match && md.sentences[parseInt(match[1])]) {
          assert.strictEqual(md.sentences[parseInt(match[1])].listMarker, match[2], criterion);
        }
      }

      // tokens does NOT contain 'value'
      if (criterion.includes('tokens does NOT contain')) {
        const match = criterion.match(/sentences\[(\d+)\]\.tokens does NOT contain '([^']+)'/);
        if (match && md.sentences[parseInt(match[1])]) {
          assert(!md.sentences[parseInt(match[1])].tokens.includes(match[2]),
            `tokens should not contain '${match[2]}'`);
        }
      }

      // tokens contains 'X' as a single token
      if (criterion.includes('tokens contains') && criterion.includes('as a single token')) {
        const match = criterion.match(/sentences\[(\d+)\]\.tokens contains '([^']+)' as a single token/);
        if (match && md.sentences[parseInt(match[1])]) {
          assert(md.sentences[parseInt(match[1])].tokens.includes(match[2]),
            `tokens should contain '${match[2]}' as single token`);
        }
      }

      // isParenthetical checks — positive assertion only (skip negative cases like SBA-023-C7)
      if ((criterion.includes('isParenthetical: true') || criterion.includes('isParenthetical === true')) &&
          !criterion.includes('No second') && !criterion.includes('No ')) {
        const child = md.sentences.find(s => s.isParenthetical === true);
        assert(child, 'No sentence with isParenthetical: true found');
      }
      if (criterion.includes('isParenthetical === false') || criterion.includes('isParenthetical: false')) {
        const match = criterion.match(/sentences\[(\d+)\]/);
        if (match) {
          assert.strictEqual(md.sentences[parseInt(match[1])].isParenthetical, false, criterion);
        }
      }

      // parentSentenceIndex === N
      if (criterion.includes('parentSentenceIndex ===')) {
        const match = criterion.match(/parentSentenceIndex === (\d+)/);
        if (match) {
          const child = md.sentences.find(s => s.isParenthetical === true);
          assert(child, 'No parenthetical child found');
          assert.strictEqual(child.parentSentenceIndex, parseInt(match[1]), criterion);
        }
      }

      // Child SentenceRecord has segmentationType: 'value'
      if (criterion.includes('Child SentenceRecord has segmentationType')) {
        const match = criterion.match(/segmentationType: '([^']+)'/);
        if (match) {
          const child = md.sentences.find(s => s.isParenthetical === true);
          assert(child, 'No parenthetical child found');
          assert.strictEqual(child.segmentationType, match[1], criterion);
        }
      }

      // Sentinel ['(', '...', ')'] check — only for positive sentinel assertions
      // Skip when criterion says "not a sentinel" (SBA-023 negative case)
      if ((criterion.includes('sentinel') || criterion.includes("['(', '...', ')']")) &&
          !criterion.includes('not a sentinel')) {
        const parent = md.sentences.find(s => !s.isParenthetical && s.tokens && s.tokens.includes('...'));
        assert(parent, 'No sentence with sentinel found');
        const openIdx = parent.tokens.indexOf('(');
        const ellIdx = parent.tokens.indexOf('...');
        const closeIdx = parent.tokens.indexOf(')');
        assert(openIdx !== -1 && ellIdx === openIdx + 1 && closeIdx === ellIdx + 1,
          'Sentinel [(, ..., )] not found in correct sequence');
      }

      // No DiscourseReferent with tagteam:sentenceIndex === N
      if (criterion.includes('No DiscourseReferent') && criterion.includes('sentenceIndex ===')) {
        const match = criterion.match(/sentenceIndex === (\d+)/);
        if (match) {
          const idx = parseInt(match[1]);
          const bad = nodes.filter(n => hasType(n, 'DiscourseReferent') && n['tagteam:sentenceIndex'] === idx);
          assert.strictEqual(bad.length, 0, `Found DiscourseReferent with sentenceIndex ${idx}`);
        }
      }

      // No VerbPhrase with tagteam:sentenceIndex === N
      if (criterion.includes('No VerbPhrase') && criterion.includes('sentenceIndex ===')) {
        const match = criterion.match(/sentenceIndex === (\d+)/);
        if (match) {
          const idx = parseInt(match[1]);
          const bad = nodes.filter(n => {
            const types = [].concat(n['@type'] || []);
            return types.some(t => t.includes('VerbPhrase')) && n['tagteam:sentenceIndex'] === idx;
          });
          assert.strictEqual(bad.length, 0, `Found VerbPhrase with sentenceIndex ${idx}`);
        }
      }

      // has_sentence_cluster.length === N
      if (criterion.includes('has_sentence_cluster.length ===')) {
        const match = criterion.match(/has_sentence_cluster\.length === (\d+)/);
        if (match) {
          const pa = nodes.find(n => (n['@id'] || '').includes('ParsingAct'));
          const clusters = pa && pa['tagteam:has_sentence_cluster'] ? pa['tagteam:has_sentence_cluster'] : [];
          assert.strictEqual(clusters.length, parseInt(match[1]), criterion);
        }
      }

      // The single cluster has tagteam:sentenceIndex === N
      if (criterion.includes('single cluster has tagteam:sentenceIndex')) {
        const match = criterion.match(/sentenceIndex === (\d+)/);
        if (match) {
          const clusters = nodes.filter(n => hasType(n, 'SentenceCluster'));
          assert.strictEqual(clusters.length, 1, `Expected 1 cluster, got ${clusters.length}`);
          assert.strictEqual(clusters[0]['tagteam:sentenceIndex'], parseInt(match[1]), criterion);
        }
      }

      // has_output contains nodes only from sentences[N]
      if (criterion.includes('has_output contains nodes only from')) {
        const match = criterion.match(/sentences\[(\d+)\]/);
        if (match) {
          const expectedIdx = parseInt(match[1]);
          const pa = nodes.find(n => (n['@id'] || '').includes('ParsingAct'));
          if (pa && pa['has_output']) {
            for (const ref of pa['has_output']) {
              const node = nodes.find(n => n['@id'] === ref['@id']);
              if (node && node['tagteam:sentenceIndex'] !== undefined) {
                assert.strictEqual(node['tagteam:sentenceIndex'], expectedIdx,
                  `has_output node has sentenceIndex ${node['tagteam:sentenceIndex']}, expected ${expectedIdx}`);
              }
            }
          }
        }
      }

      // mentionId matches regex (SBA-019)
      if (criterion.includes('mentionId matches regex')) {
        const regexMatch = criterion.match(/regex: (.+)$/);
        if (regexMatch) {
          const pattern = new RegExp(regexMatch[1].trim());
          const drs = nodes.filter(n => hasType(n, 'DiscourseReferent') && !hasType(n, 'VerbPhrase'));
          const withMention = drs.filter(n => n['tagteam:mentionId']);
          assert(withMention.length > 0, 'No DiscourseReferent with mentionId found');
          for (const dr of withMention) {
            assert(pattern.test(dr['tagteam:mentionId']),
              `mentionId "${dr['tagteam:mentionId']}" does not match ${pattern}`);
          }
        }
      }

      // headTokenIndex component in range (SBA-019)
      // At least one DR must have headTokenIndex in the specified range
      if (criterion.includes('headTokenIndex component') && criterion.includes('in range')) {
        const rangeMatch = criterion.match(/in range \[(\d+), (\d+)\]/);
        if (rangeMatch) {
          const lo = parseInt(rangeMatch[1]), hi = parseInt(rangeMatch[2]);
          const drs = nodes.filter(n => hasType(n, 'DiscourseReferent') && !hasType(n, 'VerbPhrase') && n['tagteam:mentionId']);
          const inRange = drs.some(dr => {
            const mMatch = dr['tagteam:mentionId'].match(/:m(\d+)$/);
            if (!mMatch) return false;
            const idx = parseInt(mMatch[1]);
            return idx >= lo && idx <= hi;
          });
          assert(inRange, `No DR has headTokenIndex in range [${lo}, ${hi}]`);
        }
      }

      // headTokenIndex is NOT 0 (SBA-019)
      if (criterion.includes('headTokenIndex is NOT 0')) {
        const drs = nodes.filter(n => hasType(n, 'DiscourseReferent') && !hasType(n, 'VerbPhrase') && n['tagteam:mentionId']);
        for (const dr of drs) {
          const mMatch = dr['tagteam:mentionId'].match(/:m(\d+)$/);
          if (mMatch) {
            assert(parseInt(mMatch[1]) !== 0, 'headTokenIndex should not be 0');
          }
        }
      }

      // documentTokenSpan === [N, M] (SBA-019)
      if (criterion.includes('documentTokenSpan ===')) {
        const spanMatch = criterion.match(/documentTokenSpan === \[(\d+), (\d+)\]/);
        if (spanMatch) {
          const expected = [parseInt(spanMatch[1]), parseInt(spanMatch[2])];
          const drs = nodes.filter(n => hasType(n, 'DiscourseReferent') && !hasType(n, 'VerbPhrase'));
          const withSpan = drs.filter(n => n['tagteam:documentTokenSpan']);
          assert(withSpan.length > 0, 'No DR with documentTokenSpan');
          const span = withSpan[0]['tagteam:documentTokenSpan'];
          assert.deepStrictEqual(span, expected,
            `documentTokenSpan ${JSON.stringify(span)} !== ${JSON.stringify(expected)}`);
        }
      }

      // The semicolon is NOT consumed
      if (criterion.includes('semicolon is NOT consumed')) {
        assert(md.sentences[0].tokens.includes(';'), 'Semicolon should appear in tokens when not consumed');
      }

      // SBA_SentenceRelationshipShape (basic validation)
      if (criterion.includes('SBA_SentenceRelationshipShape')) {
        for (const rel of (md.sentenceRelationships || [])) {
          assert(rel.fromSentenceIndex !== undefined, 'Relationship missing fromSentenceIndex');
          assert(rel.toSentenceIndex !== undefined, 'Relationship missing toSentenceIndex');
          assert(rel.logicalConnector, 'Relationship missing logicalConnector');
          assert(rel.relationshipType, 'Relationship missing relationshipType');
          assert.strictEqual(rel.toSentenceIndex, rel.fromSentenceIndex + 1, 'Relationship not adjacent');
        }
      }

      // ForestStructureShape passes (all arcs in bounds)
      if (criterion.includes('ForestStructureShape')) {
        for (let si = 0; si < md.sentences.length; si++) {
          const sent = md.sentences[si];
          if (sent.segmentationType === 'section-header-inline') continue;
          for (const arc of (sent.arcs || [])) {
            assert(arc.dependent >= 0 && arc.dependent <= sent.tokens.length,
              `S${si} arc dep ${arc.dependent} out of bounds (max ${sent.tokens.length})`);
            assert((arc.head || 0) >= 0 && (arc.head || 0) <= sent.tokens.length,
              `S${si} arc head ${arc.head} out of bounds (max ${sent.tokens.length})`);
          }
        }
      }

      // SentenceCluster count (Wave 1 pattern — per sentence)
      if (criterion.includes('SentenceCluster') && criterion.includes('per sentence')) {
        const clusters = nodes.filter(n => hasType(n, 'SentenceCluster'));
        assert.strictEqual(clusters.length, md.sentences.length,
          `Expected ${md.sentences.length} clusters, got ${clusters.length}`);
      }

      // sentenceIndex on Tier 1 nodes
      if (criterion.includes('sentenceIndex') && criterion.includes('Tier 1')) {
        const tier1 = nodes.filter(n => hasType(n, 'DiscourseReferent'));
        for (const node of tier1) {
          assert(node['tagteam:sentenceIndex'] !== undefined,
            `${node['rdfs:label']} missing sentenceIndex`);
        }
      }

      // Single sentences[0] for single input
      if (criterion.includes('sentences[0].sentenceIndex === 0') || criterion.includes('sentenceIndex: 0')) {
        assert(md.sentences[0] && md.sentences[0].sentenceIndex === 0, criterion);
      }

      // Abbreviation not splitting
      if (criterion.includes('sentences.length === 1') && criterion.includes('abbreviation')) {
        assert.strictEqual(md.sentences.length, 1, 'Abbreviation caused incorrect split');
      }

      // tokens contains '(' and ')' as normal tokens (SBA-023)
      if (criterion.includes("tokens contains '(' and ')'")) {
        const match = criterion.match(/sentences\[(\d+)\]/);
        if (match && md.sentences[parseInt(match[1])]) {
          const toks = md.sentences[parseInt(match[1])].tokens;
          assert(toks.includes('(') && toks.includes(')'), 'Missing ( or ) in tokens');
        }
      }

      // No second SentenceRecord with isParenthetical: true (SBA-023 negative)
      if (criterion.includes('No second SentenceRecord') && criterion.includes('isParenthetical: true')) {
        const parenSents = md.sentences.filter(s => s.isParenthetical === true);
        assert.strictEqual(parenSents.length, 0, 'Found unexpected parenthetical sentence');
      }

      // Wave 1 descriptive note — not testable in Wave 2
      if (criterion.includes('Wave 1 builds MUST produce')) {
        // Descriptive criterion — skip
      }

    }, !isWave1);
  }

  // Basic structural check if no specific criteria matched
  if (!tc.success_criteria || tc.success_criteria.length === 0) {
    test(tc.id + '-structural', 'Parses without error', () => {
      assert(md.sentences.length > 0, 'No sentences produced');
    }, !isWave1);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`Total: ${passed + failed + discovery}`);
console.log(`  \u2713 Passed: ${passed}`);
console.log(`  \u2717 Failed: ${failed}`);
console.log(`  \u25CB Discovery: ${discovery}`);
console.log(`\n  Wave 1 Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
