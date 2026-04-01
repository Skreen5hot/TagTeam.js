#!/usr/bin/env node
/**
 * CCO Complex Sentence Regression Tests
 *
 * Tests 20 complex sentences using CCO vocabulary across coordination,
 * subordination, relative clauses, passives, negation, multi-word entities,
 * statives, and tense-aspect patterns.
 *
 * Requires: dist/cco-merged.ttl loaded as ontology
 *
 * Run: node tests/corpus/cco-complex-regression.test.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Load TagTeam
let TagTeam;
try {
  TagTeam = require('../../dist/tagteam.js');
} catch (e) {
  console.error('Failed to load TagTeam:', e.message);
  process.exit(1);
}

// Load CCO ontology
let tagger;
try {
  const ttlPath = path.join(__dirname, '../../dist/cco-merged.ttl');
  const ttl = fs.readFileSync(ttlPath, 'utf8');
  tagger = TagTeam.OntologyTextTagger.fromTTL(ttl, {
    propertyMap: { keywords: 'rdfs:label', label: 'rdfs:label' }
  });
  console.log(`Loaded CCO ontology: ${tagger.getStats().classCount} classes\n`);
} catch (e) {
  console.error('Failed to load CCO:', e.message);
  process.exit(1);
}

// Load test corpus
const corpus = JSON.parse(fs.readFileSync(path.join(__dirname, 'cco-complex-sentences.json'), 'utf8'));

// ============================================================================
// Helpers
// ============================================================================

function hasType(node, typeFragment) {
  return [].concat(node['@type'] || []).some(t => t.includes(typeFragment));
}

function buildGraph(sentence) {
  return TagTeam.buildGraph(sentence, { ontology: tagger, ontologyThreshold: 0.2 });
}

function getDRs(graph) {
  return (graph['@graph'] || []).filter(n =>
    hasType(n, 'DiscourseReferent') && !hasType(n, 'VerbPhrase')
  );
}

function getVPs(graph) {
  return (graph['@graph'] || []).filter(n => hasType(n, 'VerbPhrase'));
}

function getEDs(graph) {
  return (graph['@graph'] || []).filter(n => hasType(n, 'EventDescription'));
}

function getIAs(graph) {
  return (graph['@graph'] || []).filter(n =>
    hasType(n, 'IntentionalAct') && !(n['rdfs:label'] || '').includes('parsing')
  );
}

function getDICEs(graph) {
  return (graph['@graph'] || []).filter(n => hasType(n, 'DirectiveInformationContentEntity'));
}

function getSAs(graph) {
  return (graph['@graph'] || []).filter(n => hasType(n, 'StructuralAssertion'));
}

function getOntMatches(graph) {
  return (graph['@graph'] || []).filter(n => n['ontologyMatch']);
}

// ============================================================================
// Test Runner
// ============================================================================

let passed = 0;
let failed = 0;
let skipped = 0;

function test(id, description, fn) {
  try {
    fn();
    console.log(`  \u2713 ${id}: ${description}`);
    passed++;
  } catch (e) {
    console.log(`  \u2717 ${id}: ${description}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

console.log('CCO Complex Sentence Regression Tests');
console.log('=' .repeat(60));

for (const sent of corpus.sentences) {
  console.log(`\n\u{1F4CB} ${sent.id} [${sent.pattern}]`);
  console.log(`   "${sent.sentence}"`);

  const graph = buildGraph(sent.sentence);
  const drs = getDRs(graph);
  const vps = getVPs(graph);
  const eds = getEDs(graph);
  const ias = getIAs(graph);
  const dices = getDICEs(graph);
  const sas = getSAs(graph);
  const ontMatches = getOntMatches(graph);

  // Basic structural test: entities extracted
  test(sent.id + '-entities', 'Entities extracted', () => {
    assert(drs.length > 0, `No entities found (expected ${sent.expectedEntities.length})`);
  });

  // Semantic output: VP or SA present
  test(sent.id + '-semantic', 'Semantic output (VP or SA)', () => {
    assert(vps.length > 0 || sas.length > 0,
      `No VerbPhrases (${vps.length}) or StructuralAssertions (${sas.length})`);
  });

  // Ontology matches
  if (sent.expectedOntologyMatches && sent.expectedOntologyMatches.length > 0) {
    test(sent.id + '-ontology', `Ontology matches (${sent.expectedOntologyMatches.length})`, () => {
      assert(ontMatches.length > 0,
        `No ontology matches (expected: ${sent.expectedOntologyMatches.join(', ')})`);
    });
  }

  // Deontic path
  if (sent.expectedDeontic) {
    test(sent.id + '-deontic', 'Deontic path (DICE emitted)', () => {
      assert(dices.length > 0, 'No DirectiveICE for deontic sentence');
    });
  }

  // Prohibition
  if (sent.expectedProhibition) {
    test(sent.id + '-prohibition', 'Prohibition RE', () => {
      const prohibs = (graph['@graph'] || []).filter(n => hasType(n, 'Prohibition'));
      assert(prohibs.length > 0, 'No Prohibition RE');
    });
  }

  // Negation
  if (sent.expectedNegation) {
    test(sent.id + '-negation', 'VP.isNegated + ED.Unrealized', () => {
      const vp = vps[0];
      assert(vp && vp['tagteam:isNegated'], 'VP not negated');
      const ed = eds[0];
      assert(ed, 'No EventDescription');
      const status = ed['tagteam:realizationStatus'];
      assert(status && status['@id'] && status['@id'].includes('Unrealized'),
        'ED not Unrealized: ' + JSON.stringify(status));
    });
    test(sent.id + '-no-ia', 'No IntentionalAct (Realist Non-Event)', () => {
      assert(ias.length === 0, `${ias.length} IntentionalActs (expected 0)`);
    });
  }

  // Stative
  if (sent.expectedStative) {
    test(sent.id + '-stative', 'Stative path (SA, no IA)', () => {
      assert(sas.length > 0, 'No StructuralAssertion');
      assert(ias.length === 0, `${ias.length} IntentionalActs in stative sentence`);
    });
  }

  // Tense-aspect
  if (sent.expectedTenseAspect) {
    test(sent.id + '-tense', `TenseAspect: ${sent.expectedTenseAspect}`, () => {
      const vp = vps[0];
      assert(vp, 'No VerbPhrase');
      const ta = vp['tagteam:tenseAspect'];
      const taName = ta && ta['@id'] ? ta['@id'].split(':').pop() : 'NONE';
      assert(taName === sent.expectedTenseAspect,
        `Got ${taName}, expected ${sent.expectedTenseAspect}`);
    });
  }
}

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '=' .repeat(60));
console.log(`Total: ${passed + failed + skipped}`);
console.log(`  \u2713 Passed: ${passed}`);
console.log(`  \u2717 Failed: ${failed}`);
if (skipped) console.log(`  \u25CB Skipped: ${skipped}`);
console.log(`\n  Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('=' .repeat(60));

process.exit(failed > 0 ? 1 : 0);
