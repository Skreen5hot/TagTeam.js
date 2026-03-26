/**
 * Phase 2: Expanded IRI Output Tests
 *
 * Verifies that { expanded: true } produces full IRIs everywhere:
 *   - No @context in output
 *   - All property keys are full IRIs (http://...)
 *   - All @type values are full IRIs
 *   - All @id values with known prefixes are expanded
 *   - Literal values (strings, numbers, booleans) are preserved
 *
 * @tags p0, output, jsonld, expanded
 */

const fs = require('fs');
const path = require('path');
const { describe, test, expect, printSummary, exit } = require('../framework/test-helpers');

// Load TagTeam
const TagTeam = require('../../dist/tagteam.js');
const posJSON = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/data/pos-weights-pruned.json'), 'utf8'));
const depJSON = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/data/dep-weights-pruned.json'), 'utf8'));
TagTeam.loadModels(posJSON, depJSON);

// Known namespace prefixes — expanded output should start with these
const KNOWN_PREFIXES = [
  'http://purl.obolibrary.org/obo/',           // bfo
  'https://www.commoncoreontologies.org/',      // cco
  'http://tagteam.fandaws.org/ontology/',       // tagteam
  'http://tagteam.fandaws.org/instance/',       // inst
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#', // rdf
  'http://www.w3.org/2000/01/rdf-schema#',      // rdfs
  'http://www.w3.org/2002/07/owl#',             // owl
  'http://www.w3.org/2001/XMLSchema#'           // xsd
];

function isFullIRI(term) {
  return typeof term === 'string' && term.startsWith('http');
}

function isJSONLDKeyword(term) {
  return typeof term === 'string' && term.startsWith('@');
}

// ============================================================================
// Tests
// ============================================================================

describe('Phase 2: Expanded IRI Output', function() {

  test('buildGraph with expanded: true returns no @context', () => {
    const result = TagTeam.buildGraph('The doctor treated the patient.', { expanded: true });
    expect(result['@context']).toBe(undefined);
    expect(result['@graph']).toBeTruthy();
    expect(result['@graph'].length).toBeGreaterThan(0);
  });

  test('All property keys are full IRIs or JSON-LD keywords', () => {
    const result = TagTeam.buildGraph('The doctor treated the patient.', { expanded: true });
    const violations = [];

    for (const node of result['@graph']) {
      for (const key of Object.keys(node)) {
        if (isJSONLDKeyword(key)) continue;  // @id, @type are fine
        if (!isFullIRI(key)) {
          violations.push(`${node['@id'] || 'unknown'} → ${key}`);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `${violations.length} non-IRI keys:\n` +
        violations.slice(0, 10).join('\n')
      );
    }
  });

  test('All @type values are full IRIs', () => {
    const result = TagTeam.buildGraph('The doctor treated the patient.', { expanded: true });
    const violations = [];

    for (const node of result['@graph']) {
      const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']].filter(Boolean);
      for (const t of types) {
        if (!isFullIRI(t)) {
          violations.push(`${node['@id'] || 'unknown'} has @type: ${t}`);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `${violations.length} non-IRI @type values:\n` +
        violations.slice(0, 10).join('\n')
      );
    }
  });

  test('All @id values with known prefixes are expanded', () => {
    const result = TagTeam.buildGraph('The doctor treated the patient.', { expanded: true });
    const violations = [];

    for (const node of result['@graph']) {
      const id = node['@id'];
      if (id && id.includes(':') && !isFullIRI(id)) {
        violations.push(id);
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `${violations.length} unexpanded @id values:\n` +
        violations.slice(0, 10).join('\n')
      );
    }
  });

  test('Expanded IRIs use correct namespace bases', () => {
    const result = TagTeam.buildGraph('The doctor treated the patient.', { expanded: true });
    const allKeys = new Set();
    const allTypes = new Set();

    for (const node of result['@graph']) {
      for (const key of Object.keys(node)) {
        if (!isJSONLDKeyword(key)) allKeys.add(key);
      }
      const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']].filter(Boolean);
      types.forEach(t => allTypes.add(t));
    }

    // Every full IRI should start with one of the known prefixes
    for (const iri of [...allKeys, ...allTypes]) {
      if (!isFullIRI(iri)) continue;
      const matchesKnown = KNOWN_PREFIXES.some(p => iri.startsWith(p));
      if (!matchesKnown) {
        throw new Error(`IRI ${iri} doesn't match any known namespace prefix`);
      }
    }
  });

  test('toJSONLD with expanded: true returns valid JSON without @context', () => {
    const jsonStr = TagTeam.toJSONLD('The doctor treated the patient.', { expanded: true });
    const parsed = JSON.parse(jsonStr);
    expect(parsed['@context']).toBe(undefined);
    expect(parsed['@graph']).toBeTruthy();
  });

  test('toJSONLD with expanded: true, pretty: true is formatted', () => {
    const jsonStr = TagTeam.toJSONLD('The doctor treated the patient.', {
      expanded: true,
      pretty: true
    });
    // Pretty output has newlines
    expect(jsonStr.includes('\n')).toBe(true);
    const parsed = JSON.parse(jsonStr);
    expect(parsed['@graph'].length).toBeGreaterThan(0);
  });

  test('Expanded output preserves literal values unchanged', () => {
    const result = TagTeam.buildGraph('The doctor treated the patient.', { expanded: true });
    // Find a node with rdfs:label (string literal)
    const tagteamNS = 'http://tagteam.fandaws.org/ontology/';
    const rdfsNS = 'http://www.w3.org/2000/01/rdf-schema#';

    let foundStringLiteral = false;
    for (const node of result['@graph']) {
      const label = node[rdfsNS + 'label'];
      if (label && typeof label === 'string') {
        foundStringLiteral = true;
        // String should NOT be a full IRI — it's a literal
        expect(label.startsWith('http')).toBe(false);
      }
    }
    // We expect at least one node to have a label
    expect(foundStringLiteral).toBe(true);
  });

  test('Modal sentence expands deontic properties correctly', () => {
    const result = TagTeam.buildGraph('The committee must allocate the funding.', { expanded: true });
    const tagteamNS = 'http://tagteam.fandaws.org/ontology/';

    // Find a node with actualityStatus
    let foundActuality = false;
    for (const node of result['@graph']) {
      if (node[tagteamNS + 'actualityStatus']) {
        foundActuality = true;
        const status = node[tagteamNS + 'actualityStatus'];
        // The value should be an @id reference with a full IRI
        if (status && status['@id']) {
          expect(status['@id'].startsWith('http')).toBe(true);
        }
      }
    }
    expect(foundActuality).toBe(true);
  });

  test('inst: prefix @id values are fully expanded', () => {
    const result = TagTeam.buildGraph('The doctor treated the patient.', { expanded: true });
    const instNS = 'http://tagteam.fandaws.org/instance/';

    let foundInst = false;
    for (const node of result['@graph']) {
      if (node['@id'] && node['@id'].startsWith(instNS)) {
        foundInst = true;
      }
    }
    expect(foundInst).toBe(true);
  });

});

printSummary();
exit();
