#!/usr/bin/env node
/**
 * SBA SHACL Shape Validation Tests
 *
 * Tests the JSON-to-RDF Projection (§4.6) and all 6 SBA SHACL shapes (§6)
 * against real buildGraph() output and synthetic negative cases.
 *
 * Run: node tests/shacl/sba-shapes.test.js
 */

'use strict';

const assert = require('assert');
const path = require('path');

let TagTeam, SBAProjection, SBAShapeValidator;
try {
  TagTeam = require('../../dist/tagteam.js');
  SBAProjection = require('../../src/graph/SBAProjection');
  SBAShapeValidator = require('../../src/graph/SBAShapeValidator');
} catch (e) {
  console.error('Failed to load modules:', e.message);
  process.exit(1);
}

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    passed++;
  } catch (e) {
    console.log(`  \u2717 ${name}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

// ============================================================================
// §4.6 Projection Tests
// ============================================================================

console.log('\n\u{1F4CB} §4.6 JSON-to-RDF Projection');

const singleResult = TagTeam.buildGraph('CMS shall provide access to all records.');
const multiResult = TagTeam.buildGraph('The Person submitted the Document. The Organization reviewed the Credential.');
const semicolonResult = TagTeam.buildGraph('The IncorporatedOrganization issued the ActOfAuthorization; however, the Person did not sign the Document.');

test('P-1: Projection produces nodes for single-sentence input', () => {
  const proj = SBAProjection.projectToRDF(singleResult);
  assert(proj.nodes.length > 0, 'No projected nodes');
  assert(proj.parsingActIri, 'Missing parsingActIri');
});

test('P-2: ForestMetadata node created', () => {
  const proj = SBAProjection.projectToRDF(singleResult);
  const fm = proj.nodes.find(n => n['@type'] === 'tagteam:ForestMetadata');
  assert(fm, 'No ForestMetadata node');
  assert(fm['@id'].includes('/forest-metadata'), 'ForestMetadata IRI pattern wrong');
});

test('P-3: SentenceRecord nodes match sentence count', () => {
  const proj = SBAProjection.projectToRDF(multiResult);
  const sentNodes = proj.nodes.filter(n => n['@type'] === 'tagteam:SentenceRecord');
  assert.strictEqual(sentNodes.length, 2, `Expected 2 SentenceRecords, got ${sentNodes.length}`);
});

test('P-4: SentenceRecord has derived tokenCount', () => {
  const proj = SBAProjection.projectToRDF(singleResult);
  const sent = proj.nodes.find(n => n['@type'] === 'tagteam:SentenceRecord');
  assert(sent, 'No SentenceRecord');
  assert(typeof sent['tagteam:tokenCount'] === 'number', 'tokenCount not a number');
  assert(sent['tagteam:tokenCount'] > 0, 'tokenCount is 0');
});

test('P-5: SentenceRecord has tokenSpanStart/End', () => {
  const proj = SBAProjection.projectToRDF(singleResult);
  const sent = proj.nodes.find(n => n['@type'] === 'tagteam:SentenceRecord');
  assert(typeof sent['tagteam:tokenSpanStart'] === 'number', 'Missing tokenSpanStart');
  assert(typeof sent['tagteam:tokenSpanEnd'] === 'number', 'Missing tokenSpanEnd');
});

test('P-6: SentenceRecord has firstToken', () => {
  const proj = SBAProjection.projectToRDF(singleResult);
  const sent = proj.nodes.find(n => n['@type'] === 'tagteam:SentenceRecord');
  assert(typeof sent['tagteam:firstToken'] === 'string', 'Missing firstToken');
});

test('P-7: Arc nodes produced with integer head/dependent', () => {
  const proj = SBAProjection.projectToRDF(singleResult);
  const arcs = proj.nodes.filter(n => n['@type'] === 'tagteam:Arc');
  assert(arcs.length > 0, 'No Arc nodes');
  for (const arc of arcs) {
    assert(Number.isInteger(arc['tagteam:head']), `head not integer: ${arc['tagteam:head']}`);
    assert(Number.isInteger(arc['tagteam:dependent']), `dependent not integer: ${arc['tagteam:dependent']}`);
  }
});

test('P-8: SentenceRelationship nodes for semicolon split', () => {
  const proj = SBAProjection.projectToRDF(semicolonResult);
  const rels = proj.nodes.filter(n => n['@type'] === 'tagteam:SentenceRelationship');
  assert.strictEqual(rels.length, 1, `Expected 1 SentenceRelationship, got ${rels.length}`);
  assert.strictEqual(rels[0]['tagteam:logicalConnector'], 'semicolon');
  assert.strictEqual(rels[0]['tagteam:relationshipType'], 'contrast');
});

test('P-9: logicalConnector omitted when null', () => {
  const proj = SBAProjection.projectToRDF(singleResult);
  const sent = proj.nodes.find(n => n['@type'] === 'tagteam:SentenceRecord');
  assert(!('tagteam:logicalConnector' in sent), 'logicalConnector should be absent when null');
});

test('P-10: TokenSpanCardinalityError on malformed input', () => {
  const bad = {
    '@graph': [{ '@id': 'inst:ParsingAct_test', '@type': ['tagteam:ParsingAct'] },
               { '@id': 'inst:Input_Text_IBE_test', '@type': ['tagteam:InformationBearingEntity'] }],
    _metadata: {
      sentences: [{
        sentenceIndex: 0,
        tokenSpan: [0, 5],
        tokens: ['a', 'b', 'c'],
        arcs: [],
        segmentationType: 'standard',
      }],
      sentenceRelationships: [],
    }
  };
  assert.throws(() => SBAProjection.projectToRDF(bad), /TokenSpanCardinalityError/);
});

// ============================================================================
// §6 Shape Validation — Positive Tests
// ============================================================================

console.log('\n\u{1F4CB} §6 SBA Shapes — Positive (real buildGraph output)');

test('S-1: Single sentence passes all shapes', () => {
  const result = SBAShapeValidator.validate(singleResult);
  assert(result.valid, `Violations: ${result.violations.join('; ')}`);
});

test('S-2: Two-sentence input passes all shapes', () => {
  const result = SBAShapeValidator.validate(multiResult);
  assert(result.valid, `Violations: ${result.violations.join('; ')}`);
});

test('S-3: Semicolon split passes all shapes', () => {
  const result = SBAShapeValidator.validate(semicolonResult);
  assert(result.valid, `Violations: ${result.violations.join('; ')}`);
});

test('S-4: Numbered list passes all shapes', () => {
  const g = TagTeam.buildGraph('1. CMS shall provide access. 2. USCIS shall monitor records.');
  const result = SBAShapeValidator.validate(g);
  assert(result.valid, `Violations: ${result.violations.join('; ')}`);
});

test('S-5: Section header passes all shapes', () => {
  const g = TagTeam.buildGraph('Access Controls. CMS shall restrict access to authorized personnel only.');
  const result = SBAShapeValidator.validate(g);
  assert(result.valid, `Violations: ${result.violations.join('; ')}`);
});

test('S-6: Parenthetical extraction passes all shapes', () => {
  const g = TagTeam.buildGraph('The Facility (which must comply with all applicable healthcare directives) submitted the report.');
  const result = SBAShapeValidator.validate(g);
  assert(result.valid, `Violations: ${result.violations.join('; ')}`);
});

test('S-7: Three-sentence input passes all shapes', () => {
  const g = TagTeam.buildGraph('The Person filed the Report. The Organization reviewed it. CMS approved the Document.');
  const result = SBAShapeValidator.validate(g);
  assert(result.valid, `Violations: ${result.violations.join('; ')}`);
});

// ============================================================================
// §6 Shape Validation — Negative Tests
// ============================================================================

console.log('\n\u{1F4CB} §6 SBA Shapes — Negative (synthetic violations)');

test('N-1: §6.5 RelationshipAdjacencyViolation detected', () => {
  const g = TagTeam.buildGraph('The Person submitted the Document. The Organization reviewed the Credential.');
  // Inject non-adjacent relationship
  g._metadata.sentenceRelationships = [{
    fromSentenceIndex: 0,
    toSentenceIndex: 2,
    logicalConnector: 'semicolon',
    relationshipType: 'contrast',
  }];
  const result = SBAShapeValidator.validate(g);
  assert(!result.valid, 'Should detect adjacency violation');
  assert(result.violations.some(v => v.includes('AdjacencyViolation')), 'Missing AdjacencyViolation');
});

test('N-2: §6.5 OrphanRelationshipViolation detected', () => {
  const g = TagTeam.buildGraph('CMS shall provide access to all records.');
  g._metadata.sentenceRelationships = [{
    fromSentenceIndex: 0,
    toSentenceIndex: 5,
    logicalConnector: 'semicolon',
    relationshipType: 'contrast',
  }];
  const result = SBAShapeValidator.validate(g);
  assert(!result.valid, 'Should detect orphan violation');
  assert(result.violations.some(v => v.includes('OrphanRelationship')), 'Missing OrphanRelationshipViolation');
});

test('N-3: §6.5 RelationshipTypeConsistencyViolation detected', () => {
  const g = TagTeam.buildGraph('The Person submitted the Document. The Organization reviewed the Credential.');
  g._metadata.sentenceRelationships = [{
    fromSentenceIndex: 0,
    toSentenceIndex: 1,
    logicalConnector: 'enumeration',
    relationshipType: 'contrast',
  }];
  const result = SBAShapeValidator.validate(g);
  assert(!result.valid, 'Should detect type-consistency violation');
  assert(result.violations.some(v => v.includes('TypeConsistency')), 'Missing TypeConsistencyViolation');
});

test('N-4: §6.5 RelationshipDuplicateViolation detected', () => {
  const g = TagTeam.buildGraph('The IncorporatedOrganization issued the ActOfAuthorization; however, the Person did not sign the Document.');
  // Duplicate the relationship
  g._metadata.sentenceRelationships.push({...g._metadata.sentenceRelationships[0]});
  const result = SBAShapeValidator.validate(g);
  assert(!result.valid, 'Should detect duplicate violation');
  assert(result.violations.some(v => v.includes('DuplicateViolation')), 'Missing DuplicateViolation');
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log(`Total: ${passed + failed}`);
console.log(`  \u2713 Passed: ${passed}`);
console.log(`  \u2717 Failed: ${failed}`);
console.log(`\n  Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
