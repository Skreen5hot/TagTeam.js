/**
 * P0-WH: Wh-Word Pseudo-Entity Recognition Tests
 *
 * Phase 0 — validates that EntityExtractor recognizes Wh-words as valid
 * entities with interrogative definiteness when processing v2-normalized input.
 *
 * Test IDs: P0-WH-1 through P0-WH-4
 */

'use strict';

const { describe, test, expect, semantic, createGraphBuilder, printSummary } = require('../../framework/test-helpers');

/**
 * Helper: build graph and find entity by label substring
 */
function buildAndFind(text, labelSubstring) {
  const builder = createGraphBuilder();
  const graph = builder.build(text);
  const nodes = graph['@graph'] || [];
  return nodes.find(e => {
    const label = (e['rdfs:label'] || '').toLowerCase();
    return label.includes(labelSubstring.toLowerCase());
  });
}

function buildAndGetAll(text) {
  const builder = createGraphBuilder();
  const graph = builder.build(text);
  return graph['@graph'] || [];
}

describe('P0-WH: Wh-Word Pseudo-Entity Recognition', () => {

  test('P0-WH-1: "the auditor review which report" — "which report" extracted with interrogative_selective definiteness', () => {
    const nodes = buildAndGetAll('the auditor review which report');
    const whEntity = nodes.find(e => {
      const label = (e['rdfs:label'] || '').toLowerCase();
      return label.includes('which');
    });

    expect(whEntity).toBeDefined();
    expect(whEntity['rdfs:label']).toContain('which');
    expect(whEntity['rdfs:label']).toContain('report');
    expect(whEntity['tagteam:definiteness']).toBe('interrogative_selective');
  });

  test('P0-WH-2: "who approved the budget" — "who" extracted as Person with interrogative definiteness', () => {
    const entity = buildAndFind('who approved the budget', 'who');

    expect(entity).toBeDefined();
    expect(entity['tagteam:definiteness']).toBe('interrogative');
    expect(entity['tagteam:denotesType']).toBe('Person');
  });

  test('P0-WH-3: "the committee decide what" — "what" extracted as bfo:Entity with interrogative definiteness', () => {
    const entity = buildAndFind('the committee decide what', 'what');

    expect(entity).toBeDefined();
    expect(entity['tagteam:definiteness']).toBe('interrogative');
    expect(entity['tagteam:denotesType']).toBe('bfo:Entity');
  });

  test('P0-WH-4: Wh pseudo-entity type mapping (who→Person, what→Entity, which→Entity, where→Site, when→TemporalRegion)', () => {
    // who → Person
    const who = buildAndFind('who arrived', 'who');
    expect(who['tagteam:denotesType']).toBe('Person');

    // whom → Person
    const whom = buildAndFind('the manager consulted whom', 'whom');
    expect(whom['tagteam:denotesType']).toBe('Person');
    expect(whom['tagteam:definiteness']).toBe('interrogative');

    // what → bfo:Entity
    const what = buildAndFind('the team decide what', 'what');
    expect(what['tagteam:denotesType']).toBe('bfo:Entity');

    // which → bfo:Entity (interrogative_selective)
    const which = buildAndFind('the auditor review which item', 'which');
    expect(which['tagteam:denotesType']).toBe('bfo:Entity');
    expect(which['tagteam:definiteness']).toBe('interrogative_selective');

    // where → bfo:Site
    const where = buildAndFind('the team meet where', 'where');
    expect(where['tagteam:denotesType']).toBe('bfo:Site');

    // when → bfo:TemporalRegion
    const when = buildAndFind('the meeting start when', 'when');
    expect(when['tagteam:denotesType']).toBe('bfo:TemporalRegion');
  });
});

printSummary();
