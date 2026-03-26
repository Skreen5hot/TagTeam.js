/**
 * T0-01: CURIE-Free Output Validation Gate
 *
 * Asserts that ZERO raw CURIEs (prefixed terms like tagteam:foo, bfo:bar)
 * appear as property keys or @type values in buildGraph() output.
 *
 * Every term in @graph nodes must be either:
 *   - A compact label resolvable via @context (e.g., "Person", "has_agent")
 *   - A JSON-LD keyword (@id, @type, @context)
 *   - An explicitly allowed CURIE (rdfs:label, owl:NamedIndividual)
 *
 * This test must pass after every file edit during Phase 1b.
 * It catches the "missed one" class of bugs that no existing test covers.
 *
 * @tags p0, output, jsonld, curie-gate
 */

const { describe, test, expect, parseToGraph, printSummary, exit } = require('../framework/test-helpers');

// ============================================================================
// Allowed CURIEs — terms that intentionally keep a prefix in output
// ============================================================================

const ALLOWED_CURIE_KEYS = new Set([
  '@id',
  '@type',
  '@context',
  '@graph',
  '@container',
  '@set',
  'rdfs:label',
  'rdfs:comment'
]);

// owl:NamedIndividual is used as a @type value, not a property key.
// rdfs:label is a universal convention we intentionally preserve.
const ALLOWED_CURIE_TYPE_VALUES = new Set([
  'owl:NamedIndividual',
  'owl:NegativePropertyAssertion'
]);

// ============================================================================
// Test sentences — chosen to exercise different code paths in the 24 graph files
// ============================================================================

const TEST_SENTENCES = [
  // Basic SVO — ActExtractor, EntityExtractor, RoleDetector
  { id: 'T0-01a', sentence: 'The doctor treated the patient.' },
  // Copular — stative predication path
  { id: 'T0-01b', sentence: 'The medicine is expensive.' },
  // Negated — negation scope, NegatedStructuralAssertion
  { id: 'T0-01c', sentence: 'The nurse did not administer the drug.' },
  // Passive — passive voice path, PatientRole promotion
  { id: 'T0-01d', sentence: 'The suspect was arrested by the officer.' },
  // Modal/deontic — DirectiveExtractor, actuality status
  { id: 'T0-01e', sentence: 'The committee must allocate the funding.' },
  // Generic — GenericityDetector path
  { id: 'T0-01f', sentence: 'Doctors treat patients.' },
  // Multi-clause — ClauseSegmenter, ClauseRelation nodes
  { id: 'T0-01g', sentence: 'The teacher explained the concept and the students understood it.' },
  // Ditransitive — recipient role path
  { id: 'T0-01h', sentence: 'The manager gave the report to the director.' }
];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Recursively collect all property keys and @type values from a node,
 * including nested objects (e.g., { '@id': '...' } values don't need checking
 * but nested annotation objects do).
 */
function collectTerms(node, keys, typeValues) {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    node.forEach(item => collectTerms(item, keys, typeValues));
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    keys.add(key);

    // Collect @type values
    if (key === '@type') {
      const types = Array.isArray(value) ? value : [value];
      types.forEach(t => { if (typeof t === 'string') typeValues.add(t); });
    }

    // Recurse into nested objects (but not @id string values)
    if (typeof value === 'object' && value !== null) {
      collectTerms(value, keys, typeValues);
    }
  }
}

/**
 * Check if a term contains a CURIE prefix (has ':' that isn't a JSON-LD keyword)
 */
function isRawCURIE(term) {
  return typeof term === 'string' && term.includes(':') && !term.startsWith('@');
}

// ============================================================================
// Tests
// ============================================================================

describe('T0-01: CURIE-Free Output Validation Gate', function() {

  TEST_SENTENCES.forEach(({ id, sentence }) => {

    test(`${id}: No raw CURIEs in keys — "${sentence}"`, () => {
      const doc = parseToGraph(sentence);
      const graph = doc['@graph'] || [];

      const allKeys = new Set();
      const allTypeValues = new Set();
      graph.forEach(node => collectTerms(node, allKeys, allTypeValues));

      // Check property keys
      const keyViolations = [];
      for (const key of allKeys) {
        if (isRawCURIE(key) && !ALLOWED_CURIE_KEYS.has(key)) {
          keyViolations.push(key);
        }
      }

      if (keyViolations.length > 0) {
        const detail = keyViolations.sort().join(', ');
        throw new Error(
          `${keyViolations.length} raw CURIE key(s) in output: ${detail}`
        );
      }
    });

    test(`${id}: No raw CURIEs in @type values — "${sentence}"`, () => {
      const doc = parseToGraph(sentence);
      const graph = doc['@graph'] || [];

      const allKeys = new Set();
      const allTypeValues = new Set();
      graph.forEach(node => collectTerms(node, allKeys, allTypeValues));

      // Check @type values
      const typeViolations = [];
      for (const t of allTypeValues) {
        if (isRawCURIE(t) && !ALLOWED_CURIE_TYPE_VALUES.has(t)) {
          typeViolations.push(t);
        }
      }

      if (typeViolations.length > 0) {
        const detail = typeViolations.sort().join(', ');
        throw new Error(
          `${typeViolations.length} raw CURIE @type value(s) in output: ${detail}`
        );
      }
    });

  });

  // Aggregate diagnostic: collect ALL violations across all sentences
  test('T0-01z: Aggregate — complete CURIE inventory across all test sentences', () => {
    const allKeyViolations = new Map();   // CURIE → Set<sentence>
    const allTypeViolations = new Map();  // CURIE → Set<sentence>

    TEST_SENTENCES.forEach(({ id, sentence }) => {
      const doc = parseToGraph(sentence);
      const graph = doc['@graph'] || [];

      const keys = new Set();
      const types = new Set();
      graph.forEach(node => collectTerms(node, keys, types));

      for (const key of keys) {
        if (isRawCURIE(key) && !ALLOWED_CURIE_KEYS.has(key)) {
          if (!allKeyViolations.has(key)) allKeyViolations.set(key, new Set());
          allKeyViolations.get(key).add(id);
        }
      }

      for (const t of types) {
        if (isRawCURIE(t) && !ALLOWED_CURIE_TYPE_VALUES.has(t)) {
          if (!allTypeViolations.has(t)) allTypeViolations.set(t, new Set());
          allTypeViolations.get(t).add(id);
        }
      }
    });

    const totalViolations = allKeyViolations.size + allTypeViolations.size;

    if (totalViolations > 0) {
      const lines = [];
      if (allKeyViolations.size > 0) {
        lines.push(`Property keys (${allKeyViolations.size}):`);
        for (const [curie, ids] of [...allKeyViolations.entries()].sort()) {
          lines.push(`  ${curie}  (in ${[...ids].join(', ')})`);
        }
      }
      if (allTypeViolations.size > 0) {
        lines.push(`@type values (${allTypeViolations.size}):`);
        for (const [curie, ids] of [...allTypeViolations.entries()].sort()) {
          lines.push(`  ${curie}  (in ${[...ids].join(', ')})`);
        }
      }

      throw new Error(
        `${totalViolations} distinct raw CURIE(s) found across ${TEST_SENTENCES.length} sentences:\n` +
        lines.join('\n')
      );
    }
  });

});

printSummary();
exit();
