/**
 * AC-1B: Gazetteer NER Tests
 *
 * Source: TagTeam-Major-Refactor-v2.2.md §8.5
 * Authority: BFO 2.0, CCO v1.5 entity types
 *
 * Tests cover: gazetteer data format, exact match, alias lookup,
 * abbreviation normalization, match precedence, and version tracking.
 */

'use strict';

const path = require('path');
const fs = require('fs');

// Module under test
let GazetteerNER;
try {
  GazetteerNER = require(path.join(__dirname, '../../../src/graph/GazetteerNER'));
} catch (e) {
  GazetteerNER = null;
}

// Gazetteer data files
const GAZETTEER_DIR = path.join(__dirname, '../../../src/data/gazetteers');

function loadGazetteer(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(GAZETTEER_DIR, filename), 'utf-8'));
  } catch (e) {
    return null;
  }
}

// Test runner
let passed = 0;
let failed = 0;
let errors = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (e) {
    failed++;
    errors.push({ name, error: e.message });
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    ${e.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ============================================================================
// AC-1B.1: Gazetteer Data Format
// ============================================================================

console.log('\n\x1b[1mAC-1B.1: Gazetteer Data Format\x1b[0m');

const REQUIRED_META_FIELDS = ['gazetteerId', 'version', 'source', 'license', 'entryCount', 'generatedAt'];
const GAZETTEER_FILES = ['organizations.json', 'names.json', 'places.json'];

for (const filename of GAZETTEER_FILES) {
  test(`${filename} exists and loads`, () => {
    const data = loadGazetteer(filename);
    assert(data !== null, `Failed to load ${filename}`);
  });

  test(`${filename} has _meta with required fields`, () => {
    const data = loadGazetteer(filename);
    assert(data !== null, `Failed to load ${filename}`);
    assert(data._meta, `Missing _meta object in ${filename}`);
    for (const field of REQUIRED_META_FIELDS) {
      assert(data._meta[field] !== undefined,
        `Missing _meta.${field} in ${filename}`);
    }
  });

  test(`${filename} _meta.entryCount matches actual entity count`, () => {
    const data = loadGazetteer(filename);
    assert(data !== null, `Failed to load ${filename}`);
    assert(data.entities, `Missing entities object in ${filename}`);
    const actualCount = Object.keys(data.entities).length;
    assertEqual(data._meta.entryCount, actualCount,
      `${filename}: _meta.entryCount (${data._meta.entryCount}) ` +
      `doesn't match actual count (${actualCount})`);
  });

  test(`${filename} entities have type field`, () => {
    const data = loadGazetteer(filename);
    assert(data !== null && data.entities, `Failed to load ${filename}`);
    for (const [name, entry] of Object.entries(data.entities)) {
      assert(entry.type, `Entity "${name}" missing type in ${filename}`);
    }
  });
}

// ============================================================================
// AC-1B.2: Exact Match Lookup
// ============================================================================

console.log('\n\x1b[1mAC-1B.2: Exact Match Lookup\x1b[0m');

test('GazetteerNER module exists and loads', () => {
  assert(GazetteerNER !== null, 'GazetteerNER module failed to load');
});

test('Constructor accepts gazetteer data', () => {
  assert(GazetteerNER !== null, 'Module not loaded');
  const orgs = loadGazetteer('organizations.json');
  assert(orgs !== null, 'organizations.json not loaded');
  const ner = new GazetteerNER([orgs]);
  assert(ner !== null, 'Constructor returned null');
});

test('Exact match: "Customs and Border Protection" → cco:Organization', () => {
  assert(GazetteerNER !== null, 'Module not loaded');
  const orgs = loadGazetteer('organizations.json');
  assert(orgs !== null, 'organizations.json not loaded');
  const ner = new GazetteerNER([orgs]);
  const result = ner.lookup('Customs and Border Protection');
  assert(result !== null, 'No result for "Customs and Border Protection"');
  assertEqual(result.type, 'cco:Organization',
    `Expected cco:Organization, got ${result.type}`);
});

test('Exact match returns canonicalName', () => {
  assert(GazetteerNER !== null, 'Module not loaded');
  const orgs = loadGazetteer('organizations.json');
  assert(orgs !== null, 'organizations.json not loaded');
  const ner = new GazetteerNER([orgs]);
  const result = ner.lookup('Customs and Border Protection');
  assert(result !== null, 'No result');
  assertEqual(result.canonicalName, 'Customs and Border Protection');
});

test('Exact match returns matchType "exact"', () => {
  assert(GazetteerNER !== null, 'Module not loaded');
  const orgs = loadGazetteer('organizations.json');
  assert(orgs !== null, 'organizations.json not loaded');
  const ner = new GazetteerNER([orgs]);
  const result = ner.lookup('Customs and Border Protection');
  assert(result !== null, 'No result');
  assertEqual(result.matchType, 'exact');
});

test('Unknown entity returns null', () => {
  assert(GazetteerNER !== null, 'Module not loaded');
  const orgs = loadGazetteer('organizations.json');
  assert(orgs !== null, 'organizations.json not loaded');
  const ner = new GazetteerNER([orgs]);
  const result = ner.lookup('Nonexistent Entity XYZ');
  assertEqual(result, null, 'Expected null for unknown entity');
});

// ============================================================================
// AC-1B.3: Alias Lookup
// ============================================================================

console.log('\n\x1b[1mAC-1B.3: Alias Lookup\x1b[0m');

test('Alias lookup: "CBP" → resolves to "Customs and Border Protection"', () => {
  assert(GazetteerNER !== null, 'Module not loaded');
  const orgs = loadGazetteer('organizations.json');
  assert(orgs !== null, 'organizations.json not loaded');
  const ner = new GazetteerNER([orgs]);
  const result = ner.lookup('CBP');
  assert(result !== null, 'No result for alias "CBP"');
  assertEqual(result.canonicalName, 'Customs and Border Protection');
  assertEqual(result.type, 'cco:Organization');
});

test('Alias lookup returns matchType "alias"', () => {
  assert(GazetteerNER !== null, 'Module not loaded');
  const orgs = loadGazetteer('organizations.json');
  assert(orgs !== null, 'organizations.json not loaded');
  const ner = new GazetteerNER([orgs]);
  const result = ner.lookup('CBP');
  assert(result !== null, 'No result');
  assertEqual(result.matchType, 'alias');
});

// ============================================================================
// AC-1B.4: Abbreviation Normalization
// ============================================================================

console.log('\n\x1b[1mAC-1B.4: Abbreviation Normalization\x1b[0m');

test('Abbreviation normalization: "Dept. of Homeland Security" → match', () => {
  assert(GazetteerNER !== null, 'Module not loaded');
  const orgs = loadGazetteer('organizations.json');
  assert(orgs !== null, 'organizations.json not loaded');
  const ner = new GazetteerNER([orgs]);
  const result = ner.lookup('Dept. of Homeland Security');
  assert(result !== null,
    'Should match "Department of Homeland Security" via normalization');
  assertEqual(result.type, 'cco:Organization');
});

test('Case-insensitive match: "customs and border protection" → match', () => {
  assert(GazetteerNER !== null, 'Module not loaded');
  const orgs = loadGazetteer('organizations.json');
  assert(orgs !== null, 'organizations.json not loaded');
  const ner = new GazetteerNER([orgs]);
  const result = ner.lookup('customs and border protection');
  assert(result !== null, 'Should match case-insensitively');
  assertEqual(result.type, 'cco:Organization');
});

// ============================================================================
// AC-1B.5: Match Precedence
// ============================================================================

console.log('\n\x1b[1mAC-1B.5: Match Precedence\x1b[0m');

test('Precedence: exact match takes priority over alias', () => {
  assert(GazetteerNER !== null, 'Module not loaded');
  const orgs = loadGazetteer('organizations.json');
  assert(orgs !== null, 'organizations.json not loaded');
  const ner = new GazetteerNER([orgs]);
  // "Customs and Border Protection" should match exactly, not via alias
  const result = ner.lookup('Customs and Border Protection');
  assert(result !== null, 'No result');
  assertEqual(result.matchType, 'exact',
    `Expected exact match, got ${result.matchType}`);
});

test('Precedence: alias match takes priority over normalized', () => {
  assert(GazetteerNER !== null, 'Module not loaded');
  const orgs = loadGazetteer('organizations.json');
  assert(orgs !== null, 'organizations.json not loaded');
  const ner = new GazetteerNER([orgs]);
  // "CBP" should match as alias (exact), not as normalized
  const result = ner.lookup('CBP');
  assert(result !== null, 'No result');
  assertEqual(result.matchType, 'alias',
    `Expected alias match, got ${result.matchType}`);
});

// ============================================================================
// AC-1B.6: Version Tracking in Provenance
// ============================================================================

console.log('\n\x1b[1mAC-1B.6: Version Tracking in Provenance\x1b[0m');

test('Gazetteer match includes gazetteerId in result', () => {
  assert(GazetteerNER !== null, 'Module not loaded');
  const orgs = loadGazetteer('organizations.json');
  assert(orgs !== null, 'organizations.json not loaded');
  const ner = new GazetteerNER([orgs]);
  const result = ner.lookup('CBP');
  assert(result !== null, 'No result');
  assert(result.gazetteerId, 'Missing gazetteerId in result');
});

test('Gazetteer match includes version in result', () => {
  assert(GazetteerNER !== null, 'Module not loaded');
  const orgs = loadGazetteer('organizations.json');
  assert(orgs !== null, 'organizations.json not loaded');
  const ner = new GazetteerNER([orgs]);
  const result = ner.lookup('CBP');
  assert(result !== null, 'No result');
  assert(result.version, 'Missing version in result');
});

test('Multiple gazetteers: lookup across all', () => {
  assert(GazetteerNER !== null, 'Module not loaded');
  const orgs = loadGazetteer('organizations.json');
  const places = loadGazetteer('places.json');
  assert(orgs !== null && places !== null, 'Gazetteers not loaded');
  const ner = new GazetteerNER([orgs, places]);
  // Should find organization
  const orgResult = ner.lookup('CBP');
  assert(orgResult !== null, 'Should find org');
  assertEqual(orgResult.type, 'cco:Organization');
  // Should also find place
  const placeResult = ner.lookup('United States');
  assert(placeResult !== null, 'Should find place');
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n\x1b[1mResults\x1b[0m');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}`);

if (errors.length > 0) {
  console.log('\n\x1b[31mFailing tests:\x1b[0m');
  errors.forEach(e => console.log(`  - ${e.name}: ${e.error.substring(0, 120)}`));
}

process.exit(failed > 0 ? 1 : 0);
