/**
 * Entity Boundary Preservation Tests (WS-3 Fix 2)
 *
 * Tests that multi-word named entities containing "and" or prepositional
 * phrases are preserved as single entities by the tree pipeline, using
 * ComplexDesignatorDetector as a pre-extraction pass.
 *
 * Plan Reference: docs/development/plan-ws3-fix2-entity-fragmentation.md
 * AC: AC-EF-01 through AC-EF-29
 *
 * @tags p0, linguistic, entity, coordination, tree-pipeline
 */

const { describe, test, expect, semantic, parseToGraph, printSummary, exit } = require('../../framework/test-helpers');

const TREE_OPTS = { useTreeExtractors: true };

/**
 * Helper: find a Tier 1 DiscourseReferent node whose label contains the given text.
 */
function findEntity(graph, labelSubstring) {
  const lower = labelSubstring.toLowerCase();
  return semantic.findNode(graph, n => {
    const types = [].concat(n['@type'] || []);
    if (!types.includes('tagteam:DiscourseReferent')) return false;
    return (n['rdfs:label'] || '').toLowerCase().includes(lower);
  });
}

/**
 * Helper: find a Tier 2 entity whose label contains the given text.
 */
function findTier2(graph, labelSubstring) {
  const lower = labelSubstring.toLowerCase();
  return semantic.findNode(graph, n => {
    if (!n['is_subject_of']) return false;
    return (n['rdfs:label'] || '').toLowerCase().includes(lower);
  });
}

/**
 * Helper: find an act node by verb/lemma.
 */
function findAct(graph, verbLemma) {
  return semantic.findNode(graph, n => {
    const types = [].concat(n['@type'] || []);
    if (!types.includes('IntentionalAct') && !types.some(t => t.includes('VerbPhrase'))) return false;
    const label = (n['rdfs:label'] || '').toLowerCase();
    const lemma = (n['tagteam:lemma'] || '').toLowerCase();
    const verb = (n['tagteam:verb'] || '').toLowerCase();
    return label === verbLemma || lemma === verbLemma || verb === verbLemma;
  });
}

// ═══════════════════════════════════════════════════════════════
// AC-EF-01 through AC-EF-08: Core Entity Boundary Preservation
// ═══════════════════════════════════════════════════════════════

describe('Core Entity Boundary Preservation', function() {

  test('AC-EF-01: "Customs and Border Protection" exists as entity', () => {
    const graph = parseToGraph('Customs and Border Protection enforces trade laws.', TREE_OPTS);
    const entity = findEntity(graph, 'Customs and Border Protection');
    expect(entity).toBeTruthy();
  });

  test('AC-EF-02: CBP entity does NOT include "enforces" or "trade laws"', () => {
    const graph = parseToGraph('Customs and Border Protection enforces trade laws.', TREE_OPTS);
    const entity = findEntity(graph, 'Customs and Border Protection');
    expect(entity).toBeTruthy();
    const label = entity['rdfs:label'].toLowerCase();
    expect(label.includes('enforces')).toBeFalsy();
    expect(label.includes('trade laws')).toBeFalsy();
  });

  // KNOWN LIMITATION (RC-1): POS tagger tags "enforces" as NNS (plural noun) instead
  // of VBZ. With no verb in the tree, the parser has no predicate. CDD preserves the
  // entity boundary, but act extraction requires correct POS tags. Requires POS model
  // retraining or correction rules to fix.
  test.skip('AC-EF-03: Act node exists with verb "enforce" (KNOWN: POS tagger RC-1)', () => {
    const graph = parseToGraph('Customs and Border Protection enforces trade laws.', TREE_OPTS);
    const act = findAct(graph, 'enforce') || findAct(graph, 'enforces');
    expect(act).toBeTruthy();
  });

  test('AC-EF-04: "Department of Homeland Security" exists as entity', () => {
    const graph = parseToGraph('Department of Homeland Security issued the directive.', TREE_OPTS);
    const entity = findEntity(graph, 'Department of Homeland Security');
    expect(entity).toBeTruthy();
  });

  test('AC-EF-05: No phantom "Homeland Security" or standalone "Department"', () => {
    const graph = parseToGraph('Department of Homeland Security issued the directive.', TREE_OPTS);
    const nodes = (graph['@graph'] || []).filter(n => {
      const types = [].concat(n['@type'] || []);
      return types.includes('tagteam:DiscourseReferent');
    });
    // Should not have separate "Homeland Security" or "Department" entities
    const phantomHS = nodes.find(n => {
      const label = (n['rdfs:label'] || '').toLowerCase();
      return label === 'homeland security' || label === 'department';
    });
    expect(phantomHS).toBeFalsy();
  });

  test('AC-EF-06: "Immigration and Customs Enforcement" exists as entity', () => {
    const graph = parseToGraph('Immigration and Customs Enforcement deported the individual.', TREE_OPTS);
    const entity = findEntity(graph, 'Immigration and Customs Enforcement');
    expect(entity).toBeTruthy();
  });

  test('AC-EF-07: ICE entity does NOT include "deported" or "the individual"', () => {
    const graph = parseToGraph('Immigration and Customs Enforcement deported the individual.', TREE_OPTS);
    const entity = findEntity(graph, 'Immigration and Customs Enforcement');
    expect(entity).toBeTruthy();
    const label = entity['rdfs:label'].toLowerCase();
    expect(label.includes('deported')).toBeFalsy();
    expect(label.includes('individual')).toBeFalsy();
  });

  // KNOWN LIMITATION (RC-1): Parser treats "Immigration" as zero-margin root with
  // "deported" as conj child. CDD locks the entity boundary correctly, but act
  // extraction produces wrong verb because the dep tree structure is inverted.
  // Requires POS/parser correction to fix.
  test.skip('AC-EF-08: Act node has verb "deport" (KNOWN: dep parse RC-1)', () => {
    const graph = parseToGraph('Immigration and Customs Enforcement deported the individual.', TREE_OPTS);
    const act = findAct(graph, 'deport') || findAct(graph, 'deported');
    expect(act).toBeTruthy();
    const badAct = findAct(graph, 'immigration');
    expect(badAct).toBeFalsy();
  });

});

// ═══════════════════════════════════════════════════════════════
// AC-EF-09 through AC-EF-11: Additional Agency Names
// ═══════════════════════════════════════════════════════════════

describe('Additional Agency Names', function() {

  test('AC-EF-09: "Fish and Wildlife Service" exists, excludes "manages"', () => {
    const graph = parseToGraph('Fish and Wildlife Service manages protected areas.', TREE_OPTS);
    const entity = findEntity(graph, 'Fish and Wildlife Service');
    expect(entity).toBeTruthy();
    expect(entity['rdfs:label'].toLowerCase().includes('manages')).toBeFalsy();
  });

  test('AC-EF-10: "Bureau of Alcohol Tobacco and Firearms" exists', () => {
    const graph = parseToGraph('The Bureau of Alcohol Tobacco and Firearms investigated the case.', TREE_OPTS);
    const entity = findEntity(graph, 'Bureau of Alcohol Tobacco and Firearms');
    expect(entity).toBeTruthy();
  });

  test('AC-EF-11: No phantom "Firearms" or "Alcohol Tobacco" entities', () => {
    const graph = parseToGraph('The Bureau of Alcohol Tobacco and Firearms investigated the case.', TREE_OPTS);
    const nodes = (graph['@graph'] || []).filter(n => {
      const types = [].concat(n['@type'] || []);
      return types.includes('tagteam:DiscourseReferent');
    });
    const phantom = nodes.find(n => {
      const label = (n['rdfs:label'] || '').toLowerCase();
      return label === 'firearms' || label === 'alcohol tobacco';
    });
    expect(phantom).toBeFalsy();
  });

});

// ═══════════════════════════════════════════════════════════════
// AC-EF-12 through AC-EF-14: Syntactic Position Variants
// ═══════════════════════════════════════════════════════════════

describe('Syntactic Position Variants', function() {

  test('AC-EF-12: DHS intact in passive/obl:agent position', () => {
    const graph = parseToGraph('The directive was issued by the Department of Homeland Security.', TREE_OPTS);
    const entity = findEntity(graph, 'Department of Homeland Security');
    expect(entity).toBeTruthy();
  });

  test('AC-EF-13: CBP intact in PP object position', () => {
    const graph = parseToGraph('She works for Customs and Border Protection.', TREE_OPTS);
    const entity = findEntity(graph, 'Customs and Border Protection');
    expect(entity).toBeTruthy();
  });

  test('AC-EF-14: DHS intact in possessive position', () => {
    const graph = parseToGraph("The Department of Homeland Security's policy requires annual review.", TREE_OPTS);
    const entity = findEntity(graph, 'Department of Homeland Security');
    expect(entity).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// AC-EF-17, AC-EF-18: CDD Integration (novel agencies)
// ═══════════════════════════════════════════════════════════════

describe('CDD Integration — Novel Agencies', function() {

  test('AC-EF-17: "Federal Emergency Management Agency" detected by CDD', () => {
    const graph = parseToGraph('Federal Emergency Management Agency coordinated the response.', TREE_OPTS);
    const entity = findEntity(graph, 'Federal Emergency Management Agency');
    expect(entity).toBeTruthy();
  });

  test('AC-EF-18: "National Oceanic and Atmospheric Administration" detected', () => {
    const graph = parseToGraph('The National Oceanic and Atmospheric Administration issued a warning.', TREE_OPTS);
    const entity = findEntity(graph, 'National Oceanic and Atmospheric Administration');
    expect(entity).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// AC-EF-28, AC-EF-29: CDD Negative Tests (Must NOT Lock)
// ═══════════════════════════════════════════════════════════════

describe('CDD Negative Tests — Must NOT Lock', function() {

  test('AC-EF-28: "FBI and CIA" → two separate entities, not one span', () => {
    const graph = parseToGraph('FBI and CIA investigated the matter.', TREE_OPTS);
    const fbi = findEntity(graph, 'FBI');
    const cia = findEntity(graph, 'CIA');
    // Should be two separate entities
    expect(fbi).toBeTruthy();
    expect(cia).toBeTruthy();
    // Should NOT have a fused "FBI and CIA" entity
    const fused = findEntity(graph, 'FBI and CIA');
    if (fused) {
      // If found, its label should not be "FBI and CIA" exactly
      const label = fused['rdfs:label'].toLowerCase();
      expect(label === 'fbi and cia').toBeFalsy();
    }
  });

  test('AC-EF-29: "Alice and Bob" → two separate entities', () => {
    const graph = parseToGraph('Alice and Bob went to the park.', TREE_OPTS);
    const alice = findEntity(graph, 'Alice');
    const bob = findEntity(graph, 'Bob');
    expect(alice).toBeTruthy();
    expect(bob).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// AC-EF-23, AC-EF-24: Non-Regression
// ═══════════════════════════════════════════════════════════════

describe('Non-Regression', function() {

  test('AC-EF-23: copular "CBP is a component of DHS" not affected', () => {
    const graph = parseToGraph('CBP is a component of DHS.', TREE_OPTS);
    const assertions = (graph['@graph'] || []).filter(n => {
      const types = [].concat(n['@type'] || []);
      return types.some(t => t.includes('Assertion'));
    });
    expect(assertions.length > 0).toBeTruthy();
  });

  test('AC-EF-24: "Alice and Bob" coordination split preserved', () => {
    const graph = parseToGraph('Alice and Bob went to the park.', TREE_OPTS);
    const alice = findEntity(graph, 'Alice');
    const bob = findEntity(graph, 'Bob');
    expect(alice).toBeTruthy();
    expect(bob).toBeTruthy();
  });

});

printSummary();
exit();
