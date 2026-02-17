#!/usr/bin/env node
/**
 * AC-4.8 through AC-4.11: Security Sanitization Tests
 *
 * Source: Major-Refactor-Roadmap.md Phase 4
 * Authority: OWASP Top 10, NIST SP 800-53
 *
 * Tests 6 security vectors on the tree pipeline path.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '../..');

// Load pipeline modules
const SemanticGraphBuilder = require(path.join(ROOT, 'src/graph/SemanticGraphBuilder'));
const PerceptronTagger = require(path.join(ROOT, 'src/core/PerceptronTagger'));
const DependencyParser = require(path.join(ROOT, 'src/core/DependencyParser'));

// Load security modules
const { sanitize, sanitizeWithProvenance, escapeHtml } = require(path.join(ROOT, 'src/security/output-sanitizer'));
const { validateInput } = require(path.join(ROOT, 'src/security/input-validator'));

// Load models
const posModel = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/pos-weights-pruned.json'), 'utf8'));
const depModel = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/dep-weights-pruned.json'), 'utf8'));

function buildGraph(text) {
  const builder = new SemanticGraphBuilder({});
  builder._treePosTagger = new PerceptronTagger(posModel);
  builder._treeDepParser = new DependencyParser(depModel);
  return builder.build(text, { useTreeExtractors: true });
}

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

/**
 * Recursively check all string values in an object for raw HTML.
 */
function containsRawHtml(obj, pattern) {
  if (typeof obj === 'string') return pattern.test(obj);
  if (Array.isArray(obj)) return obj.some(v => containsRawHtml(v, pattern));
  if (obj && typeof obj === 'object') {
    return Object.values(obj).some(v => containsRawHtml(v, pattern));
  }
  return false;
}

// ============================================================================
// Tests
// ============================================================================

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}AC-4.8 through AC-4.11: Security Sanitization Tests${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}`);

// --- AC-4.8: XSS via Entity Labels ---
console.log(`\n${C.cyan}--- AC-4.8: XSS via Entity Labels ---${C.reset}`);

test('AC-4.8a: <script> tag in input', () => {
  const result = buildGraph('<script>alert("xss")</script> is an agency');
  assert(result != null, 'Should return a result');
  // Check @graph nodes only (not _metadata which stores raw input for debugging)
  const graphJson = JSON.stringify(result['@graph'] || []);
  assert(!/<script/i.test(graphJson), 'Graph nodes should not contain raw <script> tag');
});

test('AC-4.8b: <img onerror> in input', () => {
  const result = buildGraph('<img onerror="alert(1)" src="x"> treated the patient');
  assert(result != null, 'Should return a result');
  const graphJson = JSON.stringify(result['@graph'] || []);
  assert(!/<img/i.test(graphJson), 'Graph nodes should not contain raw <img> tag');
});

test('AC-4.8c: javascript: URI in input', () => {
  const result = buildGraph('The agency javascript:alert(1) reviewed the case');
  assert(result != null, 'Should return a result');
  // javascript: in text is OK (not a URI context), just verify no crash
});

test('AC-4.8d: Event handler in entity text', () => {
  const result = buildGraph('The onmouseover="alert(1)" doctor treated');
  assert(result != null, 'Should return a result');
  // Check @graph nodes only for unescaped event handler attributes
  const graphJson = JSON.stringify(result['@graph'] || []);
  assert(!graphJson.includes('onmouseover='), 'Event handler should not appear in graph output');
});

// --- AC-4.9: JSON Injection ---
console.log(`\n${C.cyan}--- AC-4.9: JSON Injection ---${C.reset}`);

test('AC-4.9a: JSON structure in input', () => {
  const result = buildGraph('{"@type": "cco:Person", "label": "injected"} is a concept');
  assert(result != null, 'Should return a result');
  // Verify the output is valid JSON
  const json = JSON.stringify(result);
  JSON.parse(json); // Should not throw
  // Verify no injected @type from input
  const graph = result['@graph'] || [];
  for (const node of graph) {
    const types = [].concat(node['@type'] || []);
    // Types should be from our ontology, not from injected input
    for (const t of types) {
      assert(!t.includes('injected'), `@type should not contain injected values: ${t}`);
    }
  }
});

test('AC-4.9b: Nested quotes in input', () => {
  const result = buildGraph('He said "the \\"doctor\\" treated" the patient');
  assert(result != null, 'Should return a result');
  const json = JSON.stringify(result);
  JSON.parse(json); // Must produce valid JSON
});

test('AC-4.9c: Unicode escape sequence', () => {
  const result = buildGraph('The \\u0022doctor\\u0022 treated the patient');
  assert(result != null, 'Should return a result');
  const json = JSON.stringify(result);
  JSON.parse(json);
});

test('AC-4.9d: Closing brace injection', () => {
  const result = buildGraph('The concept }],"@context":{"hacked":true} was discussed');
  assert(result != null, 'Should return a result');
  const json = JSON.stringify(result);
  const parsed = JSON.parse(json);
  assert(!parsed['@context'] || !parsed['@context'].hacked, 'Should not have injected @context');
});

// --- AC-4.10: Null Bytes ---
console.log(`\n${C.cyan}--- AC-4.10: Null Bytes ---${C.reset}`);

test('AC-4.10a: Null byte mid-text', () => {
  const result = buildGraph('The doctor\x00treated the patient');
  assert(result != null, 'Should return a result (rejection or stripped)');
  if (result._metadata && result._metadata.inputValidationFailed) {
    assert(result._metadata.error === 'NULL_BYTE', 'Should report NULL_BYTE error');
  }
});

test('AC-4.10b: Multiple null bytes', () => {
  const result = buildGraph('\x00\x00\x00The doctor treated');
  assert(result != null, 'Should return a result');
});

test('AC-4.10c: Null byte in entity name', () => {
  const result = buildGraph('Dr.\x00Smith treated the patient');
  assert(result != null, 'Should return a result');
});

test('AC-4.10d: validateInput rejects null bytes directly', () => {
  const validation = validateInput('The doctor\x00treated');
  assert(!validation.valid, 'Should reject null bytes');
  assert(validation.issues[0].code === 'NULL_BYTE', 'Should identify NULL_BYTE');
});

// --- AC-4.11: Oversized Input and Deep Nesting ---
console.log(`\n${C.cyan}--- AC-4.11: Oversized Input and Deep Nesting ---${C.reset}`);

test('AC-4.11a: Oversized input (100,001 chars)', () => {
  const oversized = 'The doctor treated the patient. '.repeat(3334); // ~100K chars
  const result = buildGraph(oversized);
  assert(result != null, 'Should return a result');
  if (result._metadata && result._metadata.inputValidationFailed) {
    assert(result._metadata.error === 'INPUT_TOO_LONG', 'Should report INPUT_TOO_LONG');
  }
});

test('AC-4.11b: Deeply nested parentheses (500 levels)', () => {
  const nested = '('.repeat(500) + 'the doctor' + ')'.repeat(500);
  const start = Date.now();
  const result = buildGraph(nested);
  const elapsed = Date.now() - start;
  assert(result != null, 'Should return a result');
  assert(elapsed < 10000, `Should complete within 10s, took ${elapsed}ms`);
});

test('AC-4.11c: Very long single word (5000 chars)', () => {
  const longWord = 'a'.repeat(5000) + ' treated the patient';
  const result = buildGraph(longWord);
  assert(result != null, 'Should return a result');
});

test('AC-4.11d: validateInput rejects oversized input directly', () => {
  const oversized = 'x'.repeat(100001);
  const validation = validateInput(oversized);
  assert(!validation.valid, 'Should reject oversized input');
  assert(validation.issues[0].code === 'INPUT_TOO_LONG', 'Should identify INPUT_TOO_LONG');
});

// --- Sanitizer Unit Tests ---
console.log(`\n${C.cyan}--- Sanitizer Unit Tests ---${C.reset}`);

test('escapeHtml: escapes < and >', () => {
  assert(escapeHtml('<script>') === '&lt;script&gt;', 'Should escape angle brackets');
});

test('escapeHtml: escapes quotes', () => {
  const result = escapeHtml('"hello" & \'world\'');
  assert(result === '&quot;hello&quot; &amp; &#39;world&#39;', `Got: ${result}`);
});

test('sanitize: escapes string values', () => {
  const result = sanitize({ label: '<script>alert(1)</script>', type: 'cco:Person' });
  assert(!/<script/.test(result.label), 'label should be escaped');
  assert(result.label.includes('&lt;script&gt;'), 'label should have escaped HTML');
});

test('sanitizeWithProvenance: escapes string values', () => {
  const results = sanitizeWithProvenance(
    [{ label: '<b>bold</b>', type: 'cco:Person' }],
    { ontologyHash: 'abc', warnings: [] }
  );
  assert(!/<b>/.test(results[0].label), 'label should be escaped');
  assert(results[0].provenance, 'Should have provenance');
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
