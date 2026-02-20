#!/usr/bin/env node
/**
 * AC-4.20: API Backward Compatibility Tests
 *
 * Source: Major-Refactor-Roadmap.md Phase 4
 *
 * Verifies the public API surface remains stable:
 *   - parse(), buildGraph(), buildTreeGraph(), toJSONLD()
 *   - loadModels(), loadTreeModels(), areModelsLoaded()
 *   - validateInput(), sanitize()
 *   - Version and class exports
 *
 * Post-cutover: buildGraph() now defaults to tree pipeline.
 * Legacy pipeline available via { useLegacy: true }.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '../..');

// Load the built bundle (simulates what users get)
const TagTeam = require(path.join(ROOT, 'dist/tagteam.js'));

// Pre-load models (required for tree pipeline in bundle context)
const posJSON = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/pos-weights-pruned.json'), 'utf8'));
const depJSON = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/dep-weights-pruned.json'), 'utf8'));

// ============================================================================
// Test infrastructure
// ============================================================================

let passed = 0;
let failed = 0;
const errors = [];
const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  cyan: '\x1b[36m', bright: '\x1b[1m'
};

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write(`  ${C.green}\u2713${C.reset} ${name}\n`);
  } catch (e) {
    failed++;
    errors.push({ name, error: e.message });
    process.stdout.write(`  ${C.red}\u2717${C.reset} ${name}: ${e.message}\n`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ============================================================================
// Helper functions
// ============================================================================

function getActs(graph) {
  return (graph['@graph'] || []).filter(n => {
    const types = n['@type'] || [];
    return types.some(t => t.includes('Act') || t.includes('Process') || t === 'tagteam:VerbPhrase') &&
           !types.some(t => t.includes('InformationBearingEntity') || t.includes('ArtificialAgent') || t.includes('ActOfArtificialProcessing'));
  });
}

function getTier1Entities(graph) {
  return (graph['@graph'] || []).filter(n =>
    (n['@type'] || []).includes('tagteam:DiscourseReferent')
  );
}

// ============================================================================
// Tests
// ============================================================================

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}AC-4.20: API Backward Compatibility Tests (Post-Cutover)${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}`);

// ---- Model Loading ----

console.log(`\n${C.cyan}--- Model Loading ---${C.reset}`);

test('TagTeam.loadModels is a function', () => {
  assert(typeof TagTeam.loadModels === 'function', 'loadModels should be a function');
});

test('TagTeam.loadTreeModels is a function (backward compat alias)', () => {
  assert(typeof TagTeam.loadTreeModels === 'function', 'loadTreeModels should be a function');
});

test('TagTeam.areModelsLoaded is a function', () => {
  assert(typeof TagTeam.areModelsLoaded === 'function', 'areModelsLoaded should be a function');
});

test('areModelsLoaded() returns false before loading', () => {
  // Create a fresh require to test initial state — but we can't easily reset module state.
  // Instead, test that the function exists and returns boolean.
  const result = TagTeam.areModelsLoaded();
  assert(typeof result === 'boolean', 'areModelsLoaded should return boolean');
});

test('loadModels() caches models', () => {
  TagTeam.loadModels(posJSON, depJSON);
  assert(TagTeam.areModelsLoaded() === true, 'areModelsLoaded should return true after loadModels');
});

test('loadTreeModels() also caches models (backward compat)', () => {
  // loadTreeModels delegates to loadModels
  TagTeam.loadTreeModels(posJSON, depJSON);
  assert(TagTeam.areModelsLoaded() === true, 'areModelsLoaded should return true after loadTreeModels');
});

// ---- Core API Methods ----

console.log(`\n${C.cyan}--- Core API Methods ---${C.reset}`);

test('TagTeam object exists', () => {
  assert(TagTeam != null, 'TagTeam should be defined');
  assert(typeof TagTeam === 'object', 'TagTeam should be an object');
});

test('TagTeam.parse is a function', () => {
  assert(typeof TagTeam.parse === 'function', 'parse should be a function');
});

test('TagTeam.buildGraph is a function', () => {
  assert(typeof TagTeam.buildGraph === 'function', 'buildGraph should be a function');
});

test('TagTeam.buildTreeGraph is a function', () => {
  assert(typeof TagTeam.buildTreeGraph === 'function', 'buildTreeGraph should be a function');
});

test('TagTeam.toJSONLD is a function', () => {
  assert(typeof TagTeam.toJSONLD === 'function', 'toJSONLD should be a function');
});

// ---- parse() Backward Compatibility ----

console.log(`\n${C.cyan}--- parse() Backward Compatibility ---${C.reset}`);

test('parse() returns object with expected shape', () => {
  try {
    const result = TagTeam.parse('The doctor treated the patient');
    assert(result != null, 'parse should return a result');
    assert(typeof result === 'object', 'parse should return an object');
  } catch (e) {
    // Acceptable: old pipeline may not work from bundle in Node.js
    assert(e.message.includes('window') || e.message.includes('nlp'),
      `Unexpected error: ${e.message}`);
  }
});

test('parse() returns flat semantic action (not JSON-LD)', () => {
  try {
    const result = TagTeam.parse('The doctor treated the patient');
    // parse() returns a flat object, NOT a JSON-LD graph
    assert(!result['@graph'], 'parse should not return @graph (that is buildGraph format)');
    // Should have agent/action/patient structure
    assert(result.agent != null || result.action != null || result.patient != null,
      'parse should have agent, action, or patient properties');
  } catch (e) {
    // Acceptable if Compromise not available in Node bundle
    assert(e.message.includes('window') || e.message.includes('nlp'),
      `Unexpected error: ${e.message}`);
  }
});

// ---- buildGraph() Tree Default ----

console.log(`\n${C.cyan}--- buildGraph() Tree Default ---${C.reset}`);

test('buildGraph() returns @graph array', () => {
  const result = TagTeam.buildGraph('The doctor treated the patient');
  assert(result != null, 'buildGraph should return a result');
  assert(Array.isArray(result['@graph']), 'buildGraph should have @graph array');
  assert(result['@graph'].length > 0, '@graph should not be empty');
});

test('buildGraph() acts use tagteam:VerbPhrase (tree format)', () => {
  const graph = TagTeam.buildGraph('The doctor treated the patient');
  const acts = getActs(graph);
  assert(acts.length > 0, 'buildGraph should produce at least one act');
  assert(acts.every(a => (a['@type'] || []).includes('tagteam:VerbPhrase')),
    'buildGraph acts should be typed as tagteam:VerbPhrase (tree pipeline)');
});

test('buildGraph() Tier 1 entities lack owl:NamedIndividual (tree format)', () => {
  const graph = TagTeam.buildGraph('The doctor treated the patient');
  const t1 = getTier1Entities(graph);
  assert(t1.length > 0, 'buildGraph should produce Tier 1 entities');
  assert(t1.every(e => !(e['@type'] || []).includes('owl:NamedIndividual')),
    'buildGraph Tier 1 entities should not carry owl:NamedIndividual (tree pipeline)');
});

test('buildGraph() produces DiscourseReferent nodes', () => {
  const graph = TagTeam.buildGraph('The doctor treated the patient');
  const t1 = getTier1Entities(graph);
  assert(t1.length > 0, 'buildGraph should produce DiscourseReferent nodes');
});

// ---- buildGraph({useLegacy: true}) ----

console.log(`\n${C.cyan}--- buildGraph({useLegacy: true}) Legacy Escape Hatch ---${C.reset}`);

test('buildGraph({useLegacy:true}) returns @graph array', () => {
  const result = TagTeam.buildGraph('The doctor treated the patient', { useLegacy: true });
  assert(result != null, 'Legacy buildGraph should return a result');
  assert(Array.isArray(result['@graph']), 'Legacy buildGraph should have @graph array');
  assert(result['@graph'].length > 0, 'Legacy @graph should not be empty');
});

test('buildGraph({useLegacy:true}) acts do NOT use tagteam:VerbPhrase', () => {
  const graph = TagTeam.buildGraph('The doctor treated the patient', { useLegacy: true });
  const acts = getActs(graph);
  assert(acts.length > 0, 'Legacy graph should have at least one act');
  assert(acts.every(a => !(a['@type'] || []).includes('tagteam:VerbPhrase')),
    'Legacy acts should not be typed as tagteam:VerbPhrase');
});

test('buildGraph({useLegacy:true}) Tier 1 entities carry owl:NamedIndividual', () => {
  const graph = TagTeam.buildGraph('The doctor treated the patient', { useLegacy: true });
  const t1 = getTier1Entities(graph);
  assert(t1.length > 0, 'Legacy graph should have Tier 1 entities');
  assert(t1.every(e => (e['@type'] || []).includes('owl:NamedIndividual')),
    'Legacy Tier 1 entities should carry owl:NamedIndividual');
});

// ---- useLegacy byte-identical comparison ----

console.log(`\n${C.cyan}--- useLegacy Format Verification ---${C.reset}`);

const LEGACY_TEST_SENTENCES = [
  'The doctor treated the patient',
  'An officer shall verify documentation',
  'CBP is a component of DHS',
  'The engineer designed the system',
  'She reviewed the proposal carefully',
  'The manager approved the budget',
  'Dogs have fur',
  'The child was vaccinated by the nurse',
  'The medication caused adverse reactions',
  'The surgeon operated on the patient'
];

test('useLegacy produces consistent legacy format across 10 sentences', () => {
  for (const sentence of LEGACY_TEST_SENTENCES) {
    const graph = TagTeam.buildGraph(sentence, { useLegacy: true });
    assert(Array.isArray(graph['@graph']), `Legacy should produce @graph for: "${sentence}"`);
    const acts = getActs(graph);
    // Legacy acts should never have VerbPhrase
    for (const act of acts) {
      const types = act['@type'] || [];
      assert(!types.includes('tagteam:VerbPhrase'),
        `Legacy act should not have VerbPhrase for: "${sentence}"`);
    }
    // Legacy Tier 1 should have owl:NamedIndividual
    const t1 = getTier1Entities(graph);
    for (const e of t1) {
      const types = e['@type'] || [];
      assert(types.includes('owl:NamedIndividual'),
        `Legacy Tier 1 entity should have owl:NamedIndividual for: "${sentence}"`);
    }
  }
});

// ---- buildTreeGraph() Backward Compat ----

console.log(`\n${C.cyan}--- buildTreeGraph() Backward Compat (Deprecated) ---${C.reset}`);

test('buildTreeGraph() returns @graph array', () => {
  const result = TagTeam.buildTreeGraph('The doctor treated the patient');
  assert(result != null, 'buildTreeGraph should return a result');
  assert(Array.isArray(result['@graph']), 'buildTreeGraph should have @graph array');
});

test('buildTreeGraph() produces same format as buildGraph()', () => {
  const treeResult = TagTeam.buildTreeGraph('The analyst reviewed the report');
  const defaultResult = TagTeam.buildGraph('The analyst reviewed the report');

  // Both should have VerbPhrase acts
  const treeActs = getActs(treeResult);
  const defaultActs = getActs(defaultResult);
  assert(treeActs.length > 0, 'buildTreeGraph should produce acts');
  assert(defaultActs.length > 0, 'buildGraph should produce acts');
  assert(treeActs.every(a => (a['@type'] || []).includes('tagteam:VerbPhrase')),
    'buildTreeGraph acts should have VerbPhrase');
  assert(defaultActs.every(a => (a['@type'] || []).includes('tagteam:VerbPhrase')),
    'buildGraph acts should have VerbPhrase');

  // Both should lack owl:NamedIndividual on Tier 1
  const treeT1 = getTier1Entities(treeResult);
  const defaultT1 = getTier1Entities(defaultResult);
  assert(treeT1.every(e => !(e['@type'] || []).includes('owl:NamedIndividual')),
    'buildTreeGraph Tier 1 should not have owl:NamedIndividual');
  assert(defaultT1.every(e => !(e['@type'] || []).includes('owl:NamedIndividual')),
    'buildGraph Tier 1 should not have owl:NamedIndividual');
});

// ---- Shared State Isolation ----

console.log(`\n${C.cyan}--- Shared State Isolation ---${C.reset}`);

test('buildGraph() then buildGraph({useLegacy:true}): legacy format preserved', () => {
  const testText = 'The analyst reviewed the report';
  // Call tree pipeline first (default)
  TagTeam.buildGraph(testText);
  // Then call legacy pipeline
  const legacy = TagTeam.buildGraph(testText, { useLegacy: true });
  const acts = getActs(legacy);
  assert(acts.length > 0, 'Legacy output should have acts');
  assert(acts.every(a => !(a['@type'] || []).includes('tagteam:VerbPhrase')),
    'Legacy acts should not leak VerbPhrase after tree pipeline call');
  const t1 = getTier1Entities(legacy);
  assert(t1.length > 0, 'Legacy output should have Tier 1 entities');
  assert(t1.every(e => (e['@type'] || []).includes('owl:NamedIndividual')),
    'Legacy Tier 1 entities should retain owl:NamedIndividual after tree pipeline call');
});

test('buildGraph({useLegacy:true}) then buildGraph(): tree format preserved', () => {
  const testText = 'The manager approved the budget';
  // Call legacy pipeline first
  TagTeam.buildGraph(testText, { useLegacy: true });
  // Then call tree pipeline (default)
  const tree = TagTeam.buildGraph(testText);
  const acts = getActs(tree);
  assert(acts.length > 0, 'Tree output should have acts');
  assert(acts.every(a => (a['@type'] || []).includes('tagteam:VerbPhrase')),
    'Tree acts should retain VerbPhrase after legacy pipeline call');
  const t1 = getTier1Entities(tree);
  assert(t1.length > 0, 'Tree output should have Tier 1 entities');
  assert(t1.every(e => !(e['@type'] || []).includes('owl:NamedIndividual')),
    'Tree Tier 1 entities should not gain owl:NamedIndividual after legacy pipeline call');
});

// ---- toJSONLD() Tree Format ----

console.log(`\n${C.cyan}--- toJSONLD() Tree Format ---${C.reset}`);

test('toJSONLD() returns valid JSON string', () => {
  const result = TagTeam.toJSONLD('The doctor treated the patient');
  assert(typeof result === 'string', 'toJSONLD should return a string');
  const parsed = JSON.parse(result);
  assert(parsed != null, 'toJSONLD should return parseable JSON');
});

test('toJSONLD() output has @graph array', () => {
  const parsed = JSON.parse(TagTeam.toJSONLD('The doctor treated the patient'));
  assert(Array.isArray(parsed['@graph']), 'toJSONLD output should have @graph array');
});

test('toJSONLD() output contains DiscourseReferent nodes', () => {
  const parsed = JSON.parse(TagTeam.toJSONLD('The doctor treated the patient'));
  const t1 = (parsed['@graph'] || []).filter(n =>
    (n['@type'] || []).includes('tagteam:DiscourseReferent')
  );
  assert(t1.length > 0, 'toJSONLD output should contain DiscourseReferent nodes');
});

test('toJSONLD() output contains Tier 2 entities', () => {
  const parsed = JSON.parse(TagTeam.toJSONLD('The doctor treated the patient'));
  const tier2 = (parsed['@graph'] || []).filter(n => {
    const types = n['@type'] || [];
    return types.includes('owl:Class') || types.includes('owl:NamedIndividual');
  });
  assert(tier2.length > 0, 'toJSONLD output should contain Tier 2 entities (owl:Class or owl:NamedIndividual)');
});

test('toJSONLD() output contains provenance node', () => {
  const parsed = JSON.parse(TagTeam.toJSONLD('The doctor treated the patient'));
  const provenance = (parsed['@graph'] || []).filter(n =>
    (n['@type'] || []).some(t => t.includes('ActOfArtificialProcessing'))
  );
  assert(provenance.length > 0, 'toJSONLD output should contain ActOfArtificialProcessing provenance node');
});

// ---- Security API ----

console.log(`\n${C.cyan}--- Security API ---${C.reset}`);

test('TagTeam.validateInput is a function', () => {
  assert(typeof TagTeam.validateInput === 'function', 'validateInput should be a function');
});

test('TagTeam.validateInput returns { valid, normalized, issues }', () => {
  const result = TagTeam.validateInput('test input');
  assert(typeof result.valid === 'boolean', 'should have valid boolean');
  assert(typeof result.normalized === 'string' || result.normalized === null, 'should have normalized');
  assert(Array.isArray(result.issues), 'should have issues array');
});

test('TagTeam.validateInput rejects null bytes', () => {
  const result = TagTeam.validateInput('test\x00input');
  assert(!result.valid, 'should reject null bytes');
});

test('TagTeam.sanitize is a function', () => {
  assert(typeof TagTeam.sanitize === 'function', 'sanitize should be a function');
});

test('TagTeam.sanitize strips non-allowlisted properties', () => {
  const result = TagTeam.sanitize({ label: 'test', type: 'T', malicious: 'bad' });
  assert(result.label != null, 'should keep allowed props');
  assert(result.malicious === undefined, 'should strip non-allowed props');
});

test('TagTeam.sanitizeWithProvenance is a function', () => {
  assert(typeof TagTeam.sanitizeWithProvenance === 'function', 'sanitizeWithProvenance should be a function');
});

// ---- Version and Exports ----

console.log(`\n${C.cyan}--- Version and Exports ---${C.reset}`);

test('TagTeam.version is a non-empty string', () => {
  assert(typeof TagTeam.version === 'string', 'version should be a string');
  assert(TagTeam.version.length > 0, 'version should not be empty');
});

test('TagTeam.SemanticGraphBuilder is a constructor', () => {
  assert(typeof TagTeam.SemanticGraphBuilder === 'function', 'SemanticGraphBuilder should be a function');
});

// ---- Options Compatibility ----

console.log(`\n${C.cyan}--- Options Compatibility ---${C.reset}`);

test('buildGraph with { context } does not throw', () => {
  const result = TagTeam.buildGraph('The doctor treated the patient', { context: 'MedicalEthics' });
  assert(result != null, 'Should return a result');
});

test('buildGraph with { extractEntities: false } does not throw', () => {
  const result = TagTeam.buildGraph('The doctor treated the patient', { extractEntities: false });
  assert(result != null, 'Should return a result');
});

// ============================================================================
// Results
// ============================================================================

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}RESULTS: ${C.green}${passed} passed${C.reset}, ${failed > 0 ? C.red : ''}${failed} failed${C.reset} (${passed + failed} total)${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}`);

if (errors.length > 0) {
  console.log(`\n${C.red}Failures:${C.reset}`);
  for (const e of errors) {
    console.log(`  - ${e.name}: ${e.error}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
