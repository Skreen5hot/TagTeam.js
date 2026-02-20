/**
 * Phase 5: Genericity Detection Tests
 *
 * Tests §9.5 from the architecture spec.
 * Validates classification of subject NPs as GEN, INST, UNIV, or AMB.
 *
 * Authority: spec-section-9.5-genericity-detection-final.md
 */

'use strict';

// ============================================================================
// Test framework (minimal, consistent with other phase tests)
// ============================================================================
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m\u2713\x1b[0m ${message}`);
    passed++;
  } else {
    console.log(`  \x1b[31m\u2717\x1b[0m ${message}`);
    failed++;
    failures.push(message);
  }
}

function section(name) {
  console.log(`\n\x1b[1m${name}\x1b[0m`);
}

// ============================================================================
// Load modules
// ============================================================================
let GenericityDetector, DepTree, Lemmatizer;

try {
  GenericityDetector = require('../../../src/graph/GenericityDetector');
} catch (e) {
  console.log(`\x1b[31mCannot load GenericityDetector: ${e.message}\x1b[0m`);
  console.log('\nResults: 0 passed, 0 failed (module not found)');
  process.exit(1);
}

try {
  DepTree = require('../../../src/core/DepTree');
} catch (e) {
  console.log(`\x1b[31mCannot load DepTree: ${e.message}\x1b[0m`);
  process.exit(1);
}

try {
  Lemmatizer = require('../../../src/core/Lemmatizer');
} catch (e) {
  console.log(`\x1b[31mCannot load Lemmatizer: ${e.message}\x1b[0m`);
  process.exit(1);
}

// ============================================================================
// Helpers: Build mock DepTree from simple sentence descriptions
// ============================================================================

/**
 * Create a DepTree from tokens, tags, and arc descriptions.
 * Arc format: { dep, head, label } where dep/head are 1-indexed.
 */
function makeDepTree(tokens, tags, arcs) {
  const fullArcs = arcs.map(a => ({
    dependent: a.dep,
    head: a.head,
    label: a.label,
    scoreMargin: a.margin || 2.0
  }));
  return new DepTree(fullArcs, tokens, tags);
}

/**
 * Create a subject entity object compatible with GenericityDetector.classify().
 */
function makeSubjectEntity(headId, role) {
  return {
    headId,
    role: role || 'nsubj',
    fullText: 'test-entity',
  };
}

const lemmatizer = new Lemmatizer();
const detector = new GenericityDetector({ lemmatizer });

// ============================================================================
// Signal 1: Determiner-driven classification
// ============================================================================
section('Signal 1: Determiner-driven classification');

// Test 1: "Dogs have fur" → GEN (bare plural + stative + simple present)
{
  const tokens = ['Dogs', 'have', 'fur'];
  const tags   = ['NNS',  'VBP',  'NN'];
  const arcs = [
    { dep: 1, head: 2, label: 'nsubj' },
    { dep: 2, head: 0, label: 'root' },
    { dep: 3, head: 2, label: 'obj' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(1);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(1);
  assert(gen && gen.category === 'GEN', 'GEN-1: "Dogs have fur" → GEN');
  assert(gen && gen.confidence >= 0.9, 'GEN-1: confidence ≥ 0.9 (got ' + (gen ? gen.confidence : 'null') + ')');
}

// Test 2: "The dogs have fleas" → INST (definite article)
{
  const tokens = ['The', 'dogs', 'have', 'fleas'];
  const tags   = ['DT',  'NNS',  'VBP',  'NNS'];
  const arcs = [
    { dep: 1, head: 2, label: 'det' },
    { dep: 2, head: 3, label: 'nsubj' },
    { dep: 3, head: 0, label: 'root' },
    { dep: 4, head: 3, label: 'obj' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(2);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(2);
  assert(gen && gen.category === 'INST', 'INST-1: "The dogs have fleas" → INST');
  assert(gen && gen.confidence >= 0.85, 'INST-1: confidence ≥ 0.85');
}

// Test 3: "Those dogs are barking" → INST (demonstrative)
{
  const tokens = ['Those', 'dogs', 'are', 'barking'];
  const tags   = ['DT',    'NNS',  'VBP', 'VBG'];
  const arcs = [
    { dep: 1, head: 2, label: 'det' },
    { dep: 2, head: 4, label: 'nsubj' },
    { dep: 3, head: 4, label: 'aux' },
    { dep: 4, head: 0, label: 'root' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(2);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(2);
  assert(gen && gen.category === 'INST', 'INST-2: "Those dogs are barking" → INST');
  assert(gen && gen.confidence >= 0.9, 'INST-2: confidence ≥ 0.9');
}

// Test 4: "All dogs bark" → UNIV (universal quantifier)
{
  const tokens = ['All', 'dogs', 'bark'];
  const tags   = ['DT',  'NNS',  'VBP'];
  const arcs = [
    { dep: 1, head: 2, label: 'det' },
    { dep: 2, head: 3, label: 'nsubj' },
    { dep: 3, head: 0, label: 'root' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(2);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(2);
  assert(gen && gen.category === 'UNIV', 'UNIV-1: "All dogs bark" → UNIV');
  assert(gen && gen.confidence >= 0.85, 'UNIV-1: confidence ≥ 0.85');
}

// Test 5: "No dogs were harmed" → UNIV (universal negation)
{
  const tokens = ['No', 'dogs', 'were', 'harmed'];
  const tags   = ['DT', 'NNS',  'VBD',  'VBN'];
  const arcs = [
    { dep: 1, head: 2, label: 'det' },
    { dep: 2, head: 4, label: 'nsubj:pass' },
    { dep: 3, head: 4, label: 'aux:pass' },
    { dep: 4, head: 0, label: 'root' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(2, 'nsubj:pass');
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(2);
  assert(gen && gen.category === 'UNIV', 'UNIV-2: "No dogs were harmed" → UNIV');
  assert(gen && gen.confidence >= 0.85, 'UNIV-2: confidence ≥ 0.85');
}

// Test 6: "Water boils at 100 degrees" → GEN (bare mass noun)
{
  const tokens = ['Water', 'boils', 'at', '100', 'degrees'];
  const tags   = ['NN',    'VBZ',   'IN', 'CD',  'NNS'];
  const arcs = [
    { dep: 1, head: 2, label: 'nsubj' },
    { dep: 2, head: 0, label: 'root' },
    { dep: 3, head: 2, label: 'obl' },
    { dep: 4, head: 5, label: 'nummod' },
    { dep: 5, head: 3, label: 'nmod' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(1);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(1);
  assert(gen && gen.category === 'GEN', 'GEN-2: "Water boils at 100 degrees" → GEN');
  assert(gen && gen.confidence >= 0.85, 'GEN-2: confidence ≥ 0.85');
}

// Test 7: "System failed" → AMB or INST, NOT GEN (bare count noun, det-dropped)
{
  const tokens = ['System', 'failed'];
  const tags   = ['NN',     'VBD'];
  const arcs = [
    { dep: 1, head: 2, label: 'nsubj' },
    { dep: 2, head: 0, label: 'root' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(1);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(1);
  assert(gen && gen.category !== 'GEN', 'AMB-1: "System failed" → NOT GEN (got ' + (gen ? gen.category : 'null') + ')');
}

// ============================================================================
// Signal 2: Tense/modal resolution
// ============================================================================
section('Signal 2: Tense/modal resolution');

// Test 8: "A dog is a loyal companion" → GEN (indefinite + copular + simple present)
{
  // UD structure: "companion" is root (predicate), "dog" is nsubj, "is" is cop
  const tokens = ['A', 'dog', 'is', 'a', 'loyal', 'companion'];
  const tags   = ['DT', 'NN', 'VBZ', 'DT', 'JJ',  'NN'];
  const arcs = [
    { dep: 1, head: 2, label: 'det' },
    { dep: 2, head: 6, label: 'nsubj' },
    { dep: 3, head: 6, label: 'cop' },
    { dep: 4, head: 6, label: 'det' },
    { dep: 5, head: 6, label: 'amod' },
    { dep: 6, head: 0, label: 'root' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(2);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(2);
  assert(gen && gen.category === 'GEN', 'GEN-3: "A dog is a loyal companion" → GEN');
  assert(gen && gen.confidence >= 0.65, 'GEN-3: confidence ≥ 0.65');
}

// Test 9: "A dog bit me" → INST (indefinite + past tense + dynamic)
{
  const tokens = ['A', 'dog', 'bit', 'me'];
  const tags   = ['DT', 'NN', 'VBD', 'PRP'];
  const arcs = [
    { dep: 1, head: 2, label: 'det' },
    { dep: 2, head: 3, label: 'nsubj' },
    { dep: 3, head: 0, label: 'root' },
    { dep: 4, head: 3, label: 'obj' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(2);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(2);
  assert(gen && gen.category === 'INST', 'INST-3: "A dog bit me" → INST');
  assert(gen && gen.confidence >= 0.6, 'INST-3: confidence ≥ 0.6');
  assert(gen && gen.alternative && gen.alternative.category === 'GEN',
    'INST-3: has GEN alternative');
}

// Test 10: "An officer shall verify documentation" → GEN (indefinite + deontic "shall")
{
  const tokens = ['An', 'officer', 'shall', 'verify', 'documentation'];
  const tags   = ['DT', 'NN',      'MD',    'VB',     'NN'];
  const arcs = [
    { dep: 1, head: 2, label: 'det' },
    { dep: 2, head: 4, label: 'nsubj' },
    { dep: 3, head: 4, label: 'aux' },
    { dep: 4, head: 0, label: 'root' },
    { dep: 5, head: 4, label: 'obj' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(2);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(2);
  assert(gen && gen.category === 'GEN', 'GEN-4: "An officer shall verify documentation" → GEN');
  assert(gen && gen.confidence >= 0.7, 'GEN-4: confidence ≥ 0.7');
}

// Test 11: "An officer might verify documentation" → AMB (indefinite + epistemic "might")
{
  const tokens = ['An', 'officer', 'might', 'verify', 'documentation'];
  const tags   = ['DT', 'NN',      'MD',    'VB',     'NN'];
  const arcs = [
    { dep: 1, head: 2, label: 'det' },
    { dep: 2, head: 4, label: 'nsubj' },
    { dep: 3, head: 4, label: 'aux' },
    { dep: 4, head: 0, label: 'root' },
    { dep: 5, head: 4, label: 'obj' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(2);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(2);
  assert(gen && (gen.category === 'AMB' || gen.confidence <= 0.6),
    'AMB-2: "An officer might verify..." → AMB or low confidence (got ' +
    (gen ? gen.category + '/' + gen.confidence : 'null') + ')');
}

// ============================================================================
// Signal 3: Predicate type
// ============================================================================
section('Signal 3: Predicate type (stative vs dynamic)');

// Test 12: "Mammals contain hemoglobin" → GEN (bare plural + stative "contain")
{
  const tokens = ['Mammals', 'contain', 'hemoglobin'];
  const tags   = ['NNS',     'VBP',     'NN'];
  const arcs = [
    { dep: 1, head: 2, label: 'nsubj' },
    { dep: 2, head: 0, label: 'root' },
    { dep: 3, head: 2, label: 'obj' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(1);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(1);
  assert(gen && gen.category === 'GEN', 'GEN-5: "Mammals contain hemoglobin" → GEN');
  assert(gen && gen.confidence >= 0.9, 'GEN-5: confidence ≥ 0.9');
}

// Test 13: "Children ran across the field" → GEN but lower confidence
// (bare plural [GEN] + past tense + dynamic → confidence reduced)
{
  const tokens = ['Children', 'ran', 'across', 'the', 'field'];
  const tags   = ['NNS',      'VBD', 'IN',     'DT',  'NN'];
  const arcs = [
    { dep: 1, head: 2, label: 'nsubj' },
    { dep: 2, head: 0, label: 'root' },
    { dep: 3, head: 5, label: 'case' },
    { dep: 4, head: 5, label: 'det' },
    { dep: 5, head: 2, label: 'obl' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(1);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(1);
  assert(gen && gen.category === 'GEN', 'GEN-6: "Children ran across the field" → GEN');
  assert(gen && gen.confidence <= 0.75, 'GEN-6: confidence ≤ 0.75 (past tense reduces; got ' + (gen ? gen.confidence : 'null') + ')');
}

// ============================================================================
// Proper nouns
// ============================================================================
section('Proper nouns');

// Test 14: "CBP is a component of DHS" → INST (proper noun)
{
  const tokens = ['CBP', 'is', 'a', 'component', 'of', 'DHS'];
  const tags   = ['NNP', 'VBZ', 'DT', 'NN',      'IN', 'NNP'];
  const arcs = [
    { dep: 1, head: 4, label: 'nsubj' },
    { dep: 2, head: 4, label: 'cop' },
    { dep: 3, head: 4, label: 'det' },
    { dep: 4, head: 0, label: 'root' },
    { dep: 5, head: 6, label: 'case' },
    { dep: 6, head: 4, label: 'nmod' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(1);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(1);
  assert(gen && gen.category === 'INST', 'INST-4: "CBP is a component of DHS" → INST');
  assert(gen && gen.confidence >= 0.9, 'INST-4: confidence ≥ 0.9');
}

// ============================================================================
// Institutional The (§9.5.7)
// ============================================================================
section('Institutional The exception');

// Test 15: "The electron has negative charge" → AMB with GEN alternative
{
  const tokens = ['The', 'electron', 'has', 'negative', 'charge'];
  const tags   = ['DT',  'NN',       'VBZ', 'JJ',       'NN'];
  const arcs = [
    { dep: 1, head: 2, label: 'det' },
    { dep: 2, head: 3, label: 'nsubj' },
    { dep: 3, head: 0, label: 'root' },
    { dep: 4, head: 5, label: 'amod' },
    { dep: 5, head: 3, label: 'obj' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(2);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(2);
  assert(gen && gen.category === 'AMB',
    'AMB-3: "The electron has negative charge" → AMB (got ' + (gen ? gen.category : 'null') + ')');
  assert(gen && gen.alternative && gen.alternative.category === 'GEN',
    'AMB-3: has GEN alternative');
}

// ============================================================================
// Domain class terms
// ============================================================================
section('Domain class terms');

// Test 16: "An agency is a component of a department" → GEN
{
  const tokens = ['An', 'agency', 'is', 'a', 'component', 'of', 'a', 'department'];
  const tags   = ['DT', 'NN',     'VBZ','DT', 'NN',       'IN', 'DT', 'NN'];
  const arcs = [
    { dep: 1, head: 2, label: 'det' },
    { dep: 2, head: 5, label: 'nsubj' },
    { dep: 3, head: 5, label: 'cop' },
    { dep: 4, head: 5, label: 'det' },
    { dep: 5, head: 0, label: 'root' },
    { dep: 6, head: 8, label: 'case' },
    { dep: 7, head: 8, label: 'det' },
    { dep: 8, head: 5, label: 'nmod' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(2);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(2);
  assert(gen && gen.category === 'GEN',
    'GEN-7: "An agency is a component of a department" → GEN');
  assert(gen && gen.confidence >= 0.7,
    'GEN-7: confidence ≥ 0.7 (got ' + (gen ? gen.confidence : 'null') + ')');
}

// ============================================================================
// Structured uncertainty requirements
// ============================================================================
section('Structured uncertainty');

// Test 17: Every result has confidence
{
  // Re-use "A dog bit me" (AMB → INST with alternative)
  const tokens = ['A', 'dog', 'bit', 'me'];
  const tags   = ['DT', 'NN', 'VBD', 'PRP'];
  const arcs = [
    { dep: 1, head: 2, label: 'det' },
    { dep: 2, head: 3, label: 'nsubj' },
    { dep: 3, head: 0, label: 'root' },
    { dep: 4, head: 3, label: 'obj' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(2);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(2);
  assert(gen && typeof gen.confidence === 'number' && gen.confidence >= 0 && gen.confidence <= 1,
    'CONF-1: Classification includes valid confidence score');
}

// Test 18: AMB with alternative includes genericityAlternative
{
  // Re-use "The electron has negative charge"
  const tokens = ['The', 'electron', 'has', 'negative', 'charge'];
  const tags   = ['DT',  'NN',       'VBZ', 'JJ',       'NN'];
  const arcs = [
    { dep: 1, head: 2, label: 'det' },
    { dep: 2, head: 3, label: 'nsubj' },
    { dep: 3, head: 0, label: 'root' },
    { dep: 4, head: 5, label: 'amod' },
    { dep: 5, head: 3, label: 'obj' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const entity = makeSubjectEntity(2);
  const result = detector.classify([entity], depTree, tags);
  const gen = result.get(2);
  assert(gen && gen.alternative,
    'CONF-2: AMB classification includes alternative reading');
  assert(gen && gen.alternative && typeof gen.alternative.confidence === 'number',
    'CONF-2: Alternative includes its own confidence score');
}

// ============================================================================
// Non-subject entities should NOT be classified
// ============================================================================
section('Scope: subject-only classification');

// Test 19: Object entities are not classified
{
  const tokens = ['Dogs', 'eat', 'meat'];
  const tags   = ['NNS',  'VBP', 'NN'];
  const arcs = [
    { dep: 1, head: 2, label: 'nsubj' },
    { dep: 2, head: 0, label: 'root' },
    { dep: 3, head: 2, label: 'obj' },
  ];
  const depTree = makeDepTree(tokens, tags, arcs);
  const subjectEntity = makeSubjectEntity(1);
  const objectEntity = { headId: 3, role: 'obj', fullText: 'meat' };
  const result = detector.classify([subjectEntity, objectEntity], depTree, tags);
  assert(result.has(1), 'SCOPE-1: Subject entity (Dogs) IS classified');
  assert(!result.has(3), 'SCOPE-1: Object entity (meat) is NOT classified');
}

// ============================================================================
// Static data exports
// ============================================================================
section('Static data exports');

// Test 20: Module exports lookup tables for testing/inspection
{
  assert(GenericityDetector.DET_TO_GENERICITY && typeof GenericityDetector.DET_TO_GENERICITY === 'object',
    'EXPORT-1: DET_TO_GENERICITY exported');
  assert(GenericityDetector.MASS_NOUNS instanceof Set,
    'EXPORT-2: MASS_NOUNS exported as Set');
  assert(GenericityDetector.STATIVE_VERBS instanceof Set,
    'EXPORT-3: STATIVE_VERBS exported as Set');
  assert(GenericityDetector.MASS_NOUNS.has('water'),
    'EXPORT-4: MASS_NOUNS contains "water"');
  assert(GenericityDetector.STATIVE_VERBS.has('contain'),
    'EXPORT-5: STATIVE_VERBS contains "contain"');
}

// ============================================================================
// Results
// ============================================================================
console.log(`\n${'='.repeat(60)}`);
console.log(`Genericity Detection Tests: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f}`);
  }
}
console.log(`${'='.repeat(60)}`);

process.exit(failed > 0 ? 1 : 0);
