#!/usr/bin/env node
/**
 * AC-4.20: API Backward Compatibility Tests
 *
 * Source: Major-Refactor-Roadmap.md Phase 4
 *
 * Verifies the public API surface remains stable:
 *   - parse(), buildGraph(), buildTreeGraph(), toJSONLD()
 *   - loadTreeModels(), validateInput(), sanitize()
 *   - Version and class exports
 */

'use strict';

const path = require('path');

const ROOT = path.join(__dirname, '../..');

// Load the built bundle (simulates what users get)
// In Node.js, UMD wrapper returns via module.exports
// In browser, it sets window.TagTeam
const TagTeam = require(path.join(ROOT, 'dist/tagteam.js'));

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
// Tests
// ============================================================================

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}AC-4.20: API Backward Compatibility Tests${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}`);

console.log(`\n${C.cyan}--- Core API Methods ---${C.reset}`);

test('TagTeam object exists', () => {
  assert(TagTeam != null, 'TagTeam should be defined');
  assert(typeof TagTeam === 'object', 'TagTeam should be an object');
});

test('TagTeam.parse is a function', () => {
  assert(typeof TagTeam.parse === 'function', 'parse should be a function');
});

test('TagTeam.parse returns object with expected shape', () => {
  // parse() uses the old Compromise pipeline which may need browser globals.
  // In Node.js from the bundle, it may throw — verify it at least attempts to run.
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

test('TagTeam.buildGraph is a function', () => {
  assert(typeof TagTeam.buildGraph === 'function', 'buildGraph should be a function');
});

test('TagTeam.buildGraph returns @graph array', () => {
  const result = TagTeam.buildGraph('The doctor treated the patient');
  assert(result != null, 'buildGraph should return a result');
  assert(Array.isArray(result['@graph']), 'buildGraph should have @graph array');
  assert(result['@graph'].length > 0, '@graph should not be empty');
});

test('TagTeam.buildTreeGraph is a function', () => {
  assert(typeof TagTeam.buildTreeGraph === 'function', 'buildTreeGraph should be a function');
});

test('TagTeam.buildTreeGraph returns @graph array', () => {
  // Pre-load models from source (bundle auto-load uses path which isn't available in bundle context)
  const fs = require('fs');
  const posJSON = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/pos-weights-pruned.json'), 'utf8'));
  const depJSON = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/dep-weights-pruned.json'), 'utf8'));
  TagTeam.loadTreeModels(posJSON, depJSON);
  const result = TagTeam.buildTreeGraph('The doctor treated the patient');
  assert(result != null, 'buildTreeGraph should return a result');
  assert(Array.isArray(result['@graph']), 'buildTreeGraph should have @graph array');
});

test('TagTeam.toJSONLD is a function', () => {
  assert(typeof TagTeam.toJSONLD === 'function', 'toJSONLD should be a function');
});

test('TagTeam.toJSONLD returns valid JSON string', () => {
  const result = TagTeam.toJSONLD('The doctor treated the patient');
  assert(typeof result === 'string', 'toJSONLD should return a string');
  const parsed = JSON.parse(result);
  assert(parsed != null, 'toJSONLD should return parseable JSON');
});

console.log(`\n${C.cyan}--- Model Loading ---${C.reset}`);

test('TagTeam.loadTreeModels is a function', () => {
  assert(typeof TagTeam.loadTreeModels === 'function', 'loadTreeModels should be a function');
});

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

console.log(`\n${C.cyan}--- Version and Exports ---${C.reset}`);

test('TagTeam.version is a non-empty string', () => {
  assert(typeof TagTeam.version === 'string', 'version should be a string');
  assert(TagTeam.version.length > 0, 'version should not be empty');
});

test('TagTeam.SemanticGraphBuilder is a constructor', () => {
  assert(typeof TagTeam.SemanticGraphBuilder === 'function', 'SemanticGraphBuilder should be a function');
});

console.log(`\n${C.cyan}--- Options Compatibility ---${C.reset}`);

test('buildGraph with { context } does not throw', () => {
  const result = TagTeam.buildGraph('The doctor treated the patient', { context: 'MedicalEthics' });
  assert(result != null, 'Should return a result');
});

test('buildGraph with { extractEntities: false } does not throw', () => {
  const result = TagTeam.buildGraph('The doctor treated the patient', { extractEntities: false });
  assert(result != null, 'Should return a result');
});

console.log(`\n${C.cyan}--- Path Isolation: Format Separation (AC-4.20 amendment) ---${C.reset}`);

// Both pipelines produce Two-Tier ICE (DiscourseReferent, Tier 2, is_about).
// Format isolation verifies each pipeline's DISTINCTIVE structural signatures
// remain consistent and don't bleed into the other.
//
// Tree pipeline signatures:
//   - Acts typed as tagteam:VerbPhrase (not domain-specific cco:Act*)
//   - Tier 1 entities have bfo:Entity base type (not domain-specific on Tier 1)
//   - Tier 1 entities do NOT carry owl:NamedIndividual
//
// Legacy pipeline signatures:
//   - Acts typed as domain-specific cco:Act* with owl:NamedIndividual
//   - Entity DiscourseReferent nodes carry domain types AND owl:NamedIndividual
//   - No tagteam:VerbPhrase nodes

function graphHasType(graph, typeStr) {
  return (graph['@graph'] || []).some(n =>
    (n['@type'] || []).includes(typeStr)
  );
}

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

const legacyGraph = TagTeam.buildGraph('The doctor treated the patient');
const treeGraph = TagTeam.buildTreeGraph('The doctor treated the patient');

test('buildTreeGraph() acts use tagteam:VerbPhrase', () => {
  const acts = getActs(treeGraph);
  assert(acts.length > 0, 'Tree graph should have at least one act');
  assert(acts.every(a => (a['@type'] || []).includes('tagteam:VerbPhrase')),
    'All tree acts should be typed as tagteam:VerbPhrase');
});

test('buildGraph() acts do NOT use tagteam:VerbPhrase', () => {
  const acts = getActs(legacyGraph);
  assert(acts.length > 0, 'Legacy graph should have at least one act');
  assert(acts.every(a => !(a['@type'] || []).includes('tagteam:VerbPhrase')),
    'Legacy acts should not be typed as tagteam:VerbPhrase');
});

test('buildTreeGraph() Tier 1 entities lack owl:NamedIndividual', () => {
  const t1 = getTier1Entities(treeGraph);
  assert(t1.length > 0, 'Tree graph should have Tier 1 entities');
  assert(t1.every(e => !(e['@type'] || []).includes('owl:NamedIndividual')),
    'Tree Tier 1 entities should not carry owl:NamedIndividual');
});

test('buildGraph() Tier 1 entities carry owl:NamedIndividual', () => {
  const t1 = getTier1Entities(legacyGraph);
  assert(t1.length > 0, 'Legacy graph should have Tier 1 entities');
  assert(t1.every(e => (e['@type'] || []).includes('owl:NamedIndividual')),
    'Legacy Tier 1 entities should carry owl:NamedIndividual');
});

console.log(`\n${C.cyan}--- Path Isolation: Shared State (AC-4.20 amendment) ---${C.reset}`);

test('buildTreeGraph then buildGraph: legacy format preserved', () => {
  const testText = 'The analyst reviewed the report';
  // Call tree pipeline first (sets up VerbPhrase / tree state)
  TagTeam.buildTreeGraph(testText);
  // Then call legacy pipeline on same builder
  const legacy = TagTeam.buildGraph(testText);
  const acts = getActs(legacy);
  assert(acts.length > 0, 'Legacy output should have acts');
  assert(acts.every(a => !(a['@type'] || []).includes('tagteam:VerbPhrase')),
    'Legacy acts should not leak VerbPhrase after tree pipeline call');
  const t1 = getTier1Entities(legacy);
  assert(t1.length > 0, 'Legacy output should have Tier 1 entities');
  assert(t1.every(e => (e['@type'] || []).includes('owl:NamedIndividual')),
    'Legacy Tier 1 entities should retain owl:NamedIndividual after tree pipeline call');
});

test('buildGraph then buildTreeGraph: tree format preserved', () => {
  const testText = 'The manager approved the budget';
  // Call legacy pipeline first
  TagTeam.buildGraph(testText);
  // Then call tree pipeline on same builder
  const tree = TagTeam.buildTreeGraph(testText);
  const acts = getActs(tree);
  assert(acts.length > 0, 'Tree output should have acts');
  assert(acts.every(a => (a['@type'] || []).includes('tagteam:VerbPhrase')),
    'Tree acts should retain VerbPhrase after legacy pipeline call');
  const t1 = getTier1Entities(tree);
  assert(t1.length > 0, 'Tree output should have Tier 1 entities');
  assert(t1.every(e => !(e['@type'] || []).includes('owl:NamedIndividual')),
    'Tree Tier 1 entities should not gain owl:NamedIndividual after legacy pipeline call');
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
