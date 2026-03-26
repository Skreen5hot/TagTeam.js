#!/usr/bin/env node
/**
 * Bundle Contract Test
 *
 * Verifies that dist/tagteam.js:
 *   1. Includes all core NLP + graph + ontology classes
 *   2. Can build a graph end-to-end
 *
 * Run: node tests/bundle/core-bundle.test.js
 *   or: npm run test:core
 */
'use strict';

const path = require('path');
const corePath = path.join(__dirname, '..', '..', 'dist', 'tagteam.js');

let T;
try {
  T = require(corePath);
} catch (e) {
  console.error(`FATAL: Cannot load ${corePath}`);
  console.error(e.message);
  process.exit(1);
}

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

console.log('Core Bundle Exclusion Contract Test');
console.log('===================================\n');

// ── Core functions present ─────────────────────────────────────────────
console.log('1. Core API functions present:');
assert(typeof T.buildGraph === 'function', 'buildGraph is a function');
assert(typeof T.parse === 'function', 'parse is a function');
assert(typeof T.toJSONLD === 'function', 'toJSONLD is a function');
assert(typeof T.loadModels === 'function', 'loadModels is a function');
assert(typeof T.areModelsLoaded === 'function', 'areModelsLoaded is a function');
console.log(`  ${passed} checks passed\n`);

// ── Core classes present ───────────────────────────────────────────────
const coreStart = passed;
console.log('2. Core classes present:');
assert(typeof T.SemanticGraphBuilder === 'function', 'SemanticGraphBuilder');
assert(typeof T.JSONLDSerializer === 'function', 'JSONLDSerializer');
assert(typeof T.SemanticRoleExtractor === 'function', 'SemanticRoleExtractor');
assert(typeof T.DependencyParser === 'function', 'DependencyParser');
assert(typeof T.TreeEntityExtractor === 'function', 'TreeEntityExtractor');
assert(typeof T.TreeActExtractor === 'function', 'TreeActExtractor');
assert(typeof T.TreeRoleMapper === 'function', 'TreeRoleMapper');
assert(typeof T.GenericityDetector === 'function', 'GenericityDetector');
console.log(`  ${passed - coreStart} checks passed\n`);

// ── Ontology classes present ───────────────────────────────────────────
const ontoStart = passed;
console.log('3. Ontology classes present:');
assert(typeof T.TurtleParser === 'function', 'TurtleParser');
assert(typeof T.OntologyManager === 'function', 'OntologyManager');
assert(typeof T.OntologyTextTagger === 'function', 'OntologyTextTagger');
assert(typeof T.PropertyMapper === 'function', 'PropertyMapper');
console.log(`  ${passed - ontoStart} checks passed\n`);

// ── Models embedded ────────────────────────────────────────────────────
const modelStart = passed;
console.log('4. Embedded models loaded:');
assert(T.areModelsLoaded() === true, 'areModelsLoaded() returns true');
console.log(`  ${passed - modelStart} checks passed\n`);

// ── Functional smoke test ──────────────────────────────────────────────
const funcStart = passed;
console.log('5. Functional smoke test:');
try {
  const graph = T.buildGraph('The agent arrested the suspect');
  assert(graph['@graph'] && graph['@graph'].length > 0, 'buildGraph returns non-empty @graph');

  const hasEntity = graph['@graph'].some(n =>
    n['@type'] && (n['@type'].includes('tagteam:DiscourseReferent') ||
                   n['@type'].some && n['@type'].some(t => t.includes('DiscourseReferent'))));
  assert(hasEntity, 'Graph contains DiscourseReferent nodes');

  const jsonld = T.toJSONLD('Dogs have fur');
  assert(typeof jsonld === 'string' && jsonld.length > 0, 'toJSONLD returns non-empty string');

  // Note: parse() uses SemanticRoleExtractor which references `window` directly
  // (legacy browser-only API). buildGraph() is the primary API and works in Node.js.
  assert(typeof T.parse === 'function', 'parse function exists');
} catch (e) {
  failed++;
  console.error(`  FAIL: Smoke test threw: ${e.message}`);
}
console.log(`  ${passed - funcStart} checks passed\n`);

// ── Ontology enrichment via buildGraph() ─────────────────────────────
const enrichStart = passed;
console.log('6. Ontology enrichment via buildGraph():');
try {
  const ttl = [
    '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
    '@prefix ex: <http://example.org/test#> .',
    'ex:Suspect a rdfs:Class ; rdfs:label "Suspect" .'
  ].join('\n');
  const tagger = T.OntologyTextTagger.fromTTL(ttl, {
    propertyMap: { keywords: 'rdfs:label', label: 'rdfs:label' }
  });
  const enriched = T.buildGraph('The agent arrested the suspect', { ontology: tagger });

  // Check that ontologyMatch annotations exist
  const matchedNodes = enriched['@graph'].filter(n => n['ontologyMatch']);
  assert(matchedNodes.length > 0, 'buildGraph with ontology produces ontologyMatch annotations');

  // Verify structure of match entry
  if (matchedNodes.length > 0) {
    const match = matchedNodes[0]['ontologyMatch'][0];
    assert(match.ontologyMatchIRI, 'ontologyMatch has class IRI');
    assert(typeof match.ontologyMatchConfidence === 'number', 'ontologyMatch has confidence');
    assert(match.ontologyMatchEvidence, 'ontologyMatch has evidence');
  }

  // Verify @type is NOT mutated (annotate, don't assert)
  const suspectNode = enriched['@graph'].find(n =>
    (n['rdfs:label'] || '').toLowerCase().includes('suspect') && n['is_subject_of']);
  if (suspectNode) {
    assert(suspectNode['@type'].indexOf('ex:Suspect') === -1,
      'ontology IRI not pushed into @type (annotate only)');
  }

  // Test threshold filtering — no crash
  T.buildGraph('The agent arrested the suspect',
    { ontology: tagger, ontologyThreshold: 0.99 });
  assert(true, 'ontologyThreshold option accepted without error');
} catch (e) {
  failed++;
  console.error(`  FAIL: Ontology enrichment threw: ${e.message}`);
}
console.log(`  ${passed - enrichStart} checks passed\n`);

// ── Priority matching integration (TC-I01 through TC-I07) ────────────
const priorityStart = passed;
console.log('7. Priority matching integration:');
try {
  const fs = require('fs');
  const ttlPath = path.join(__dirname, '..', 'tagger', 'test-ontology.ttl');
  const ttl = fs.readFileSync(ttlPath, 'utf8');

  // TC-I01: Annotations appear on Tier 2 nodes
  const tagger = T.OntologyTextTagger.fromTTL(ttl);
  const g = T.buildGraph('The agent arrested the suspect', { ontology: tagger });
  const tier2Nodes = g['@graph'].filter(n => n['is_subject_of']);
  const agentNode = tier2Nodes.find(n =>
    (n['rdfs:label'] || '').toLowerCase() === 'agent');
  assert(agentNode && agentNode['ontologyMatch'],
    'TC-I01: Agent Tier 2 node has ontologyMatch');

  // TC-I02: @type is never mutated
  tier2Nodes.forEach(n => {
    (n['@type'] || []).forEach(t => {
      assert(!t.includes('example.org'),
        'TC-I02: Ontology IRI not in @type: ' + (n['rdfs:label'] || 'unknown'));
    });
  });

  // TC-I03: classNominationStatus resolves on match
  const lawTTL = [
    '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
    '@prefix ex: <http://example.org/law#> .',
    'ex:Officer a rdfs:Class ; rdfs:label "Officer" .'
  ].join('\n');
  const lawTagger = T.OntologyTextTagger.fromTTL(lawTTL);
  const gLaw = T.buildGraph('An officer shall verify documentation', { ontology: lawTagger });
  const officerNode = gLaw['@graph'].find(n =>
    n['is_subject_of'] && (n['rdfs:label'] || '').toLowerCase() === 'officer');
  if (officerNode && officerNode['ontologyMatch']) {
    assert(officerNode['tagteam:classNominationStatus'] === 'resolved',
      'TC-I03: classNominationStatus resolved');
  }

  // TC-I04: No ontology option — no annotations, no crash
  const gNoOnt = T.buildGraph('The doctor treated the patient');
  const anyMatches = gNoOnt['@graph'].filter(n => n['ontologyMatch']);
  assert(anyMatches.length === 0,
    'TC-I04: No ontology produces no ontologyMatch');

  // TC-I05: Token boundary enforcement
  const antTTL = [
    '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
    '@prefix ex: <http://example.org/test#> .',
    'ex:Ant a rdfs:Class ; rdfs:label "Ant" .'
  ].join('\n');
  const antTagger = T.OntologyTextTagger.fromTTL(antTTL);
  const gAnt = T.buildGraph('The doctor treated the patient', { ontology: antTagger });
  const patientNode = gAnt['@graph'].find(n =>
    n['is_subject_of'] && (n['rdfs:label'] || '').toLowerCase().includes('patient'));
  assert(!patientNode || !patientNode['ontologyMatch'],
    'TC-I05: "ant" does not substring-match "patient"');

  // TC-I06: All matches surface with complete fields
  const g2 = T.buildGraph('The agent reviewed the criteria', { ontology: tagger });
  const matched2 = g2['@graph'].filter(n => n['ontologyMatch']);
  matched2.forEach(n => {
    n['ontologyMatch'].forEach(m => {
      assert(typeof m.ontologyMatchConfidence === 'number',
        'TC-I06: Match has numeric confidence');
      assert(typeof m.ontologyMatchType === 'string',
        'TC-I06: Match has matchType');
    });
  });

  // TC-I07: Full annotation structure
  const g3 = T.buildGraph('The agents inspected the dogs', { ontology: tagger });
  const matched3 = g3['@graph'].filter(n => n['ontologyMatch']);
  assert(matched3.length > 0, 'TC-I07: At least one match produced');
  matched3.forEach(n => {
    n['ontologyMatch'].forEach(m => {
      assert(m.ontologyMatchIRI, 'TC-I07: Has ontologyMatchIRI');
      assert(typeof m.ontologyMatchConfidence === 'number', 'TC-I07: Has confidence');
      assert(m.ontologyMatchEvidence, 'TC-I07: Has evidence');
      assert(m.ontologyMatchLabel !== undefined, 'TC-I07: Has label');
      assert(m.ontologyMatchType, 'TC-I07: Has matchType');
      assert(m.ontologyMatchForm, 'TC-I07: Has matchForm');
    });
  });

} catch (e) {
  failed++;
  console.error(`  FAIL: Priority integration threw: ${e.message}`);
}
console.log(`  ${passed - priorityStart} checks passed\n`);

// ── Summary ────────────────────────────────────────────────────────────
console.log('-----------------------------------');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error('\nCore bundle exclusion contract FAILED');
  process.exit(1);
} else {
  console.log('\nCore bundle exclusion contract PASSED');
}
