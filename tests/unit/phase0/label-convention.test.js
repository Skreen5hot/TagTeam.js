/**
 * AC-0.1: UD v2 Label Set Validation
 * AC-0.2: PTB POS Tag Set Validation
 *
 * Source: TagTeam-Major-Refactor-v2.2.md §5.1, §5.2
 * Authority: Universal Dependencies v2, Penn Treebank
 *
 * These tests verify that the canonical label sets are correctly defined
 * and that validation functions correctly accept/reject labels.
 */

'use strict';

const path = require('path');

// Module under test
let LabelConvention;
try {
  LabelConvention = require(path.join(__dirname, '../../../src/core/LabelConvention'));
} catch (e) {
  // Expected to fail in red phase
  LabelConvention = null;
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
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// ============================================================================
// AC-0.1: UD v2 Label Set Validation
// ============================================================================

console.log('\n\x1b[1mAC-0.1: UD v2 Dependency Label Set\x1b[0m');

test('LabelConvention module exists and loads', () => {
  assert(LabelConvention !== null, 'LabelConvention module failed to load');
});

test('UD_LABELS set contains exactly 37 labels', () => {
  assert(LabelConvention, 'Module not loaded');
  assertEqual(LabelConvention.UD_LABELS.size, 37,
    `Expected 37 UD labels, got ${LabelConvention.UD_LABELS.size}`);
});

// All required labels from §5.2
const REQUIRED_UD_LABELS = [
  'nsubj', 'nsubj:pass', 'obj', 'iobj', 'obl', 'obl:agent',
  'nmod', 'amod', 'advmod', 'nummod', 'det', 'case', 'cop',
  'xcomp', 'ccomp', 'advcl', 'acl', 'acl:relcl',
  'conj', 'cc', 'compound', 'flat', 'fixed', 'appos',
  'mark', 'aux', 'aux:pass', 'expl', 'neg', 'punct',
  'root', 'dep', 'parataxis', 'discourse', 'vocative', 'orphan', 'list'
];

REQUIRED_UD_LABELS.forEach(label => {
  test(`UD label set includes '${label}'`, () => {
    assert(LabelConvention, 'Module not loaded');
    assert(LabelConvention.UD_LABELS.has(label),
      `Missing required UD label: '${label}'`);
  });
});

test('isValidUDLabel() accepts valid labels', () => {
  assert(LabelConvention, 'Module not loaded');
  assert(LabelConvention.isValidUDLabel('nsubj'), "'nsubj' should be valid");
  assert(LabelConvention.isValidUDLabel('obl:agent'), "'obl:agent' should be valid");
  assert(LabelConvention.isValidUDLabel('root'), "'root' should be valid");
});

test('isValidUDLabel() rejects invalid/legacy labels', () => {
  assert(LabelConvention, 'Module not loaded');
  assert(!LabelConvention.isValidUDLabel('dobj'), "'dobj' is legacy, should be rejected");
  assert(!LabelConvention.isValidUDLabel('nsubjpass'), "'nsubjpass' is legacy, should be rejected");
  assert(!LabelConvention.isValidUDLabel('auxpass'), "'auxpass' is legacy, should be rejected");
  assert(!LabelConvention.isValidUDLabel('pobj'), "'pobj' is legacy, should be rejected");
  assert(!LabelConvention.isValidUDLabel('prep'), "'prep' is legacy, should be rejected");
  assert(!LabelConvention.isValidUDLabel('attr'), "'attr' is legacy, should be rejected");
  assert(!LabelConvention.isValidUDLabel('relcl'), "'relcl' should be 'acl:relcl'");
  assert(!LabelConvention.isValidUDLabel('made_up'), "'made_up' should be rejected");
});

// ============================================================================
// AC-0.2: PTB POS Tag Set Validation
// ============================================================================

console.log('\n\x1b[1mAC-0.2: Penn Treebank POS Tag Set\x1b[0m');

test('PTB_TAGS set contains exactly 45 tags', () => {
  assert(LabelConvention, 'Module not loaded');
  assertEqual(LabelConvention.PTB_TAGS.size, 45,
    `Expected 45 PTB tags, got ${LabelConvention.PTB_TAGS.size}`);
});

// All required tags from §5.1
const REQUIRED_PTB_TAGS = [
  'CC', 'CD', 'DT', 'EX', 'FW', 'IN', 'JJ', 'JJR', 'JJS', 'LS', 'MD',
  'NN', 'NNS', 'NNP', 'NNPS', 'PDT', 'POS', 'PRP', 'PRP$',
  'RB', 'RBR', 'RBS', 'RP', 'SYM', 'TO', 'UH',
  'VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ',
  'WDT', 'WP', 'WP$', 'WRB',
  '.', ',', ':', '``', "''", '-LRB-', '-RRB-', '#', '$'
];

REQUIRED_PTB_TAGS.forEach(tag => {
  test(`PTB tag set includes '${tag}'`, () => {
    assert(LabelConvention, 'Module not loaded');
    assert(LabelConvention.PTB_TAGS.has(tag),
      `Missing required PTB tag: '${tag}'`);
  });
});

test('isValidPTBTag() accepts valid tags', () => {
  assert(LabelConvention, 'Module not loaded');
  assert(LabelConvention.isValidPTBTag('NN'), "'NN' should be valid");
  assert(LabelConvention.isValidPTBTag('VBD'), "'VBD' should be valid");
  assert(LabelConvention.isValidPTBTag('PRP$'), "'PRP$' should be valid");
  assert(LabelConvention.isValidPTBTag('-LRB-'), "'-LRB-' should be valid");
  assert(LabelConvention.isValidPTBTag('.'), "'.' should be valid");
});

test('isValidPTBTag() rejects invalid tags', () => {
  assert(LabelConvention, 'Module not loaded');
  assert(!LabelConvention.isValidPTBTag('VERB'), "'VERB' is UPOS, not PTB");
  assert(!LabelConvention.isValidPTBTag('NOUN'), "'NOUN' is UPOS, not PTB");
  assert(!LabelConvention.isValidPTBTag('ADJ'), "'ADJ' is UPOS, not PTB");
  assert(!LabelConvention.isValidPTBTag('nn'), "lowercase 'nn' should be rejected");
  assert(!LabelConvention.isValidPTBTag(''), "empty string should be rejected");
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
