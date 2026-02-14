/**
 * AC-0.3: Unicode Normalization
 *
 * Source: TagTeam-Major-Refactor-v2.2.md §5.5.1
 * Authority: Unicode Consortium, UD-EWT tokenization conventions
 *
 * Tests that normalizeUnicode() correctly converts Unicode variants
 * to their ASCII equivalents before tokenization.
 */

'use strict';

const path = require('path');

// Module under test
let UnicodeNormalizer;
try {
  UnicodeNormalizer = require(path.join(__dirname, '../../../src/core/UnicodeNormalizer'));
} catch (e) {
  UnicodeNormalizer = null;
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
    throw new Error(
      (message || 'Assertion failed') +
      `\n    Expected: ${JSON.stringify(expected)}` +
      `\n    Actual:   ${JSON.stringify(actual)}`
    );
  }
}

// ============================================================================
// AC-0.3: Unicode Normalization
// ============================================================================

console.log('\n\x1b[1mAC-0.3: Unicode Normalization\x1b[0m');

test('UnicodeNormalizer module exists and loads', () => {
  assert(UnicodeNormalizer !== null, 'UnicodeNormalizer module failed to load');
});

test('exports normalizeUnicode function', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assert(typeof UnicodeNormalizer.normalizeUnicode === 'function',
    'normalizeUnicode should be a function');
});

// --- Smart Quotes ---

test('Smart right single quote (U+2019) → ASCII apostrophe', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assertEqual(
    UnicodeNormalizer.normalizeUnicode("don\u2019t"),
    "don't",
    'U+2019 (right single quote) should become ASCII apostrophe'
  );
});

test('Smart left single quote (U+2018) → ASCII apostrophe', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assertEqual(
    UnicodeNormalizer.normalizeUnicode("\u2018hello\u2019"),
    "'hello'",
    'U+2018/U+2019 should become ASCII apostrophes'
  );
});

test('Reversed single quote (U+201B) → ASCII apostrophe', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assertEqual(
    UnicodeNormalizer.normalizeUnicode("say \u201Bhello\u201B"),
    "say 'hello'",
    'U+201B should become ASCII apostrophe'
  );
});

// --- Smart Double Quotes ---

test('Smart double quotes (U+201C, U+201D) → ASCII double quote', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assertEqual(
    UnicodeNormalizer.normalizeUnicode("\u201CHello\u201D"),
    '"Hello"',
    'Smart double quotes should become ASCII double quotes'
  );
});

test('Reversed double quote (U+201F) → ASCII double quote', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assertEqual(
    UnicodeNormalizer.normalizeUnicode("\u201Fword\u201F"),
    '"word"',
    'U+201F should become ASCII double quote'
  );
});

// --- Dashes ---

test('Em dash (U+2014) → space-padded double hyphen', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assertEqual(
    UnicodeNormalizer.normalizeUnicode("policy\u2014and"),
    "policy -- and",
    'Em dash should become " -- " (space-padded)'
  );
});

test('En dash (U+2013) → hyphen', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assertEqual(
    UnicodeNormalizer.normalizeUnicode("2020\u20132025"),
    "2020-2025",
    'En dash should become hyphen'
  );
});

// --- Spaces ---

test('Non-breaking space (U+00A0) → regular space', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assertEqual(
    UnicodeNormalizer.normalizeUnicode("100\u00A0dollars"),
    "100 dollars",
    'Non-breaking space should become regular space'
  );
});

test('Narrow no-break space (U+202F) → regular space', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assertEqual(
    UnicodeNormalizer.normalizeUnicode("100\u202Fdollars"),
    "100 dollars",
    'Narrow no-break space should become regular space'
  );
});

// --- Zero-Width Characters ---

test('Zero-width space (U+200B) → removed', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assertEqual(
    UnicodeNormalizer.normalizeUnicode("CBP\u200B"),
    "CBP",
    'Zero-width space should be removed'
  );
});

test('Zero-width non-joiner (U+200C) → removed', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assertEqual(
    UnicodeNormalizer.normalizeUnicode("test\u200Cword"),
    "testword",
    'Zero-width non-joiner should be removed'
  );
});

test('Zero-width joiner (U+200D) → removed', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assertEqual(
    UnicodeNormalizer.normalizeUnicode("test\u200Dword"),
    "testword",
    'Zero-width joiner should be removed'
  );
});

test('BOM (U+FEFF) → removed', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assertEqual(
    UnicodeNormalizer.normalizeUnicode("\uFEFFHello"),
    "Hello",
    'BOM should be removed'
  );
});

// --- Ellipsis ---

test('Ellipsis (U+2026) → three periods', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assertEqual(
    UnicodeNormalizer.normalizeUnicode("wait\u2026"),
    "wait...",
    'Ellipsis should become three periods'
  );
});

// --- Soft Hyphen ---

test('Soft hyphen (U+00AD) → removed', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assertEqual(
    UnicodeNormalizer.normalizeUnicode("hyphen\u00ADated"),
    "hyphenated",
    'Soft hyphen should be removed'
  );
});

// --- Combined Input ---

test('Multiple normalizations in one string', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  const input = "\u201CHello\u201D \u2014 don\u2019t wait\u2026";
  const expected = '"Hello" -- don\'t wait...';
  assertEqual(
    UnicodeNormalizer.normalizeUnicode(input),
    expected,
    'Multiple normalizations should work together'
  );
});

test('ASCII input passes through unchanged', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  const input = "The doctor treated the patient.";
  assertEqual(
    UnicodeNormalizer.normalizeUnicode(input),
    input,
    'Pure ASCII input should pass through unchanged'
  );
});

test('Empty string returns empty string', () => {
  assert(UnicodeNormalizer, 'Module not loaded');
  assertEqual(
    UnicodeNormalizer.normalizeUnicode(""),
    "",
    'Empty string should return empty string'
  );
});

// ============================================================================
// Summary
// ============================================================================

console.log(`\n\x1b[1mResults: ${passed} passed, ${failed} failed\x1b[0m`);
if (failed > 0) {
  console.log('\x1b[31mFailing tests:\x1b[0m');
  errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
  process.exit(1);
}
