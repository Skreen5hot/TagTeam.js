/**
 * Tree Pipeline Modal Detection Tests (WS-3 Fix 1)
 *
 * Tests modal verb detection in the tree pipeline (useTreeExtractors: true),
 * which is the DEFAULT path used by buildGraph(). These tests verify that
 * TreeActExtractor._detectModality() correctly identifies modals from dep
 * tree aux+MD children and sets modality/actualityStatus/deonticType.
 *
 * Plan Reference: docs/development/plan-ws3-fix1-modal-detection.md
 * AC: AC-SH-01 through AC-SH-32
 *
 * @tags p0, linguistic, modality, deontic, tree-pipeline
 */

const { describe, test, expect, semantic, parseToGraph, printSummary, exit } = require('../../../framework/test-helpers');

// All tests use the tree pipeline — the default path in buildGraph()
const TREE_OPTS = { useTreeExtractors: true };

/**
 * Helper: find an act node by verb lemma in the tree pipeline output.
 * Tree path sets rdfs:label to the verb surface form; we also check tagteam:lemma
 * and (once wired) tagteam:verb.
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
// AC-SH-01 through AC-SH-09b: Core Modal Detection
// ═══════════════════════════════════════════════════════════════

describe('Core Modal Detection (Tree Pipeline)', function() {

  test('AC-SH-01: "must" sets modality=obligation', () => {
    const graph = parseToGraph('The doctor must treat the patient.', TREE_OPTS);
    const act = findAct(graph, 'treat');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('obligation');
  });

  test('AC-SH-02: "must" sets actualityStatus=Prescribed', () => {
    const graph = parseToGraph('The doctor must treat the patient.', TREE_OPTS);
    const act = findAct(graph, 'treat');
    expect(act).toBeTruthy();
    semantic.hasActualityStatus(act, 'Prescribed');
  });

  test('AC-SH-03: "must" sets deonticType=duty', () => {
    const graph = parseToGraph('The doctor must treat the patient.', TREE_OPTS);
    const act = findAct(graph, 'treat');
    expect(act).toBeTruthy();
    expect(act['tagteam:deonticType']).toBe('duty');
  });

  test('AC-SH-04: "shall" sets obligation + Prescribed', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const act = findAct(graph, 'review');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('obligation');
    semantic.hasActualityStatus(act, 'Prescribed');
  });

  test('AC-SH-05: "should" sets recommendation + Prescribed', () => {
    const graph = parseToGraph('The doctor should inform the family.', TREE_OPTS);
    const act = findAct(graph, 'inform');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('recommendation');
    semantic.hasActualityStatus(act, 'Prescribed');
  });

  test('AC-SH-06a: "will" sets modality=intention', () => {
    const graph = parseToGraph('The nurse will administer medication.', TREE_OPTS);
    const act = findAct(graph, 'administer');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('intention');
  });

  test('AC-SH-06b: "will" sets actualityStatus=Actual (design choice)', () => {
    const graph = parseToGraph('The nurse will administer medication.', TREE_OPTS);
    const act = findAct(graph, 'administer');
    expect(act).toBeTruthy();
    semantic.hasActualityStatus(act, 'Actual');
  });

  test('AC-SH-07: "may" sets permission + Permitted', () => {
    const graph = parseToGraph('The patient may refuse treatment.', TREE_OPTS);
    const act = findAct(graph, 'refuse');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('permission');
    semantic.hasActualityStatus(act, 'Permitted');
  });

  test('AC-SH-08: "can" sets ability + Possible', () => {
    const graph = parseToGraph('The patient can request records.', TREE_OPTS);
    const act = findAct(graph, 'request');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('ability');
    semantic.hasActualityStatus(act, 'Possible');
  });

  test('AC-SH-09a: "could" sets hypothetical + Hypothetical', () => {
    const graph = parseToGraph('The system could fail under load.', TREE_OPTS);
    const act = findAct(graph, 'fail');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('hypothetical');
    semantic.hasActualityStatus(act, 'Hypothetical');
  });

  test('AC-SH-09b: "could" (ability reading) still maps hypothetical (known default)', () => {
    const graph = parseToGraph('She could speak three languages.', TREE_OPTS);
    const act = findAct(graph, 'speak');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('hypothetical');
  });

});

// ═══════════════════════════════════════════════════════════════
// AC-SH-10 through AC-SH-12: Negated Modals
// ═══════════════════════════════════════════════════════════════

describe('Negated Modals (Tree Pipeline)', function() {

  test('AC-SH-10: "shall not" sets prohibition + Prohibited + duty', () => {
    const graph = parseToGraph('The officer shall not disclose records.', TREE_OPTS);
    const act = findAct(graph, 'disclose');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('prohibition');
    semantic.hasActualityStatus(act, 'Prohibited');
    expect(act['tagteam:deonticType']).toBe('duty');
  });

  test('AC-SH-11: "must not" sets prohibition', () => {
    const graph = parseToGraph('Employees must not access restricted areas.', TREE_OPTS);
    const act = findAct(graph, 'access');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('prohibition');
  });

  test('AC-SH-12: "cannot" sets prohibition + Prohibited', () => {
    const graph = parseToGraph('You cannot enter the building.', TREE_OPTS);
    const act = findAct(graph, 'enter');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('prohibition');
    semantic.hasActualityStatus(act, 'Prohibited');
  });

});

// ═══════════════════════════════════════════════════════════════
// AC-SH-13 through AC-SH-15: Multi-word Modals
// ═══════════════════════════════════════════════════════════════

describe('Multi-word Modals (Tree Pipeline)', function() {

  test('AC-SH-13: "have to" sets obligation', () => {
    const graph = parseToGraph('We have to allocate resources fairly.', TREE_OPTS);
    const act = findAct(graph, 'allocate');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('obligation');
  });

  test('AC-SH-14: "needs to" sets obligation', () => {
    const graph = parseToGraph('The team needs to complete the assessment.', TREE_OPTS);
    const act = findAct(graph, 'complete');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('obligation');
  });

  test('AC-SH-15: "ought to" sets obligation + Prescribed', () => {
    const graph = parseToGraph('Doctors ought to follow guidelines.', TREE_OPTS);
    const act = findAct(graph, 'follow');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('obligation');
    semantic.hasActualityStatus(act, 'Prescribed');
  });

});

// ═══════════════════════════════════════════════════════════════
// AC-SH-16 through AC-SH-19: DirectiveContent Nodes
// ═══════════════════════════════════════════════════════════════

describe('DirectiveContent Nodes (Tree Pipeline)', function() {

  test('AC-SH-16: "must" creates DirectiveContent node', () => {
    const graph = parseToGraph('The doctor must allocate the resource.', TREE_OPTS);
    const directive = semantic.findNode(graph, n =>
      [].concat(n['@type'] || []).includes('tagteam:DirectiveContent')
    );
    expect(directive).toBeTruthy();
  });

  test('AC-SH-17: DirectiveContent prescribes the act', () => {
    const graph = parseToGraph('The doctor must help the patient.', TREE_OPTS);
    const directive = semantic.findNode(graph, n =>
      n['tagteam:modalType'] === 'obligation'
    );
    expect(directive).toBeTruthy();
    expect(directive['prescribes']).toBeTruthy();
  });

  test('AC-SH-18: "must" directive has marker=must, strength=1', () => {
    const graph = parseToGraph('The doctor must decide.', TREE_OPTS);
    const directive = semantic.findNode(graph, n =>
      n['tagteam:modalMarker'] === 'must'
    );
    expect(directive).toBeTruthy();
    expect(directive['tagteam:modalStrength']).toBe(1);
  });

  test('AC-SH-19: "shall" directive has marker=shall, strength=1', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const directive = semantic.findNode(graph, n =>
      n['tagteam:modalMarker'] === 'shall'
    );
    expect(directive).toBeTruthy();
    expect(directive['tagteam:modalStrength']).toBe(1);
  });

});

// ═══════════════════════════════════════════════════════════════
// AC-SH-20, AC-SH-21: Graph Property Compatibility
// ═══════════════════════════════════════════════════════════════

describe('Graph Property Compatibility (Tree Pipeline)', function() {

  test('AC-SH-20: non-modal act has tagteam:verb', () => {
    const graph = parseToGraph('The doctor treats the patient.', TREE_OPTS);
    const act = findAct(graph, 'treat') || findAct(graph, 'treats');
    expect(act).toBeTruthy();
    // tagteam:verb should be set to the lemma
    expect(act['tagteam:verb']).toBeTruthy();
  });

  test('AC-SH-21: non-modal act defaults to actualityStatus=Actual', () => {
    const graph = parseToGraph('The doctor treats the patient.', TREE_OPTS);
    const act = findAct(graph, 'treat') || findAct(graph, 'treats');
    expect(act).toBeTruthy();
    semantic.hasActualityStatus(act, 'Actual');
  });

});

// ═══════════════════════════════════════════════════════════════
// AC-SH-22, AC-SH-23: parse() Path
// ═══════════════════════════════════════════════════════════════

describe('parse() Path — SemanticRoleExtractor', function() {

  test('AC-SH-22: parse("An officer shall verify documentation").action.modality === "shall"', () => {
    let TagTeam;
    try { TagTeam = require('../../../../dist/tagteam.js'); } catch(e) {
      try { TagTeam = require('../../../../src/core/SemanticRoleExtractor'); } catch(e2) {
        // Skip if neither available
        return;
      }
    }
    const result = TagTeam.parse ? TagTeam.parse('An officer shall verify documentation.') : null;
    if (!result) return;
    expect(result.action.modality).toBe('shall');
  });

  test('AC-SH-23: parse("CMS shall provide data").action.modality === "shall"', () => {
    let TagTeam;
    try { TagTeam = require('../../../../dist/tagteam.js'); } catch(e) {
      try { TagTeam = require('../../../../src/core/SemanticRoleExtractor'); } catch(e2) {
        return;
      }
    }
    const result = TagTeam.parse ? TagTeam.parse('CMS shall provide data.') : null;
    if (!result) return;
    expect(result.action.modality).toBe('shall');
  });

});

// ═══════════════════════════════════════════════════════════════
// AC-SH-25 through AC-SH-29: ISA MOA Real-World Sentences
// ═══════════════════════════════════════════════════════════════

describe('ISA MOA Sentences (Tree Pipeline)', function() {

  test('AC-SH-25: "CMS shall allow USCIS to monitor..." → obligation', () => {
    const graph = parseToGraph(
      'CMS shall allow USCIS to monitor and review all records and documents under CMS control related to this Agreement.',
      TREE_OPTS
    );
    const act = findAct(graph, 'allow');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('obligation');
    semantic.hasActualityStatus(act, 'Prescribed');
  });

  test('AC-SH-26: "The AE must submit such documentation electronically." → obligation', () => {
    const graph = parseToGraph(
      'The AE must submit such documentation electronically.',
      TREE_OPTS
    );
    const act = findAct(graph, 'submit');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('obligation');
    semantic.hasActualityStatus(act, 'Prescribed');
  });

  // DIAGNOSTIC: AC-SH-27 is the hardest test. If it fails, check whether act node
  // for "deny" exists at all before debugging modal path. Coordinated subject
  // ("CMS and AEs"), complex PP chain, and relative clause may block act extraction.
  // If act extraction is the bottleneck, classify as WS-1 corpus finding.
  test('AC-SH-27: "CMS and AEs may not deny..." → prohibition', () => {
    const graph = parseToGraph(
      "CMS and AEs may not deny an application based on a verification response that fails to confirm the applicant's status.",
      TREE_OPTS
    );
    const act = findAct(graph, 'deny');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('prohibition');
    semantic.hasActualityStatus(act, 'Prohibited');
  });

  test('AC-SH-28: "Both Parties shall maintain..." → obligation', () => {
    const graph = parseToGraph(
      'Both Parties shall maintain a level of security that is commensurate with the risk and magnitude of the harm that could result from misuse of the information.',
      TREE_OPTS
    );
    const act = findAct(graph, 'maintain');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('obligation');
    semantic.hasActualityStatus(act, 'Prescribed');
  });

  test('AC-SH-29: "Both Parties shall comply..." → obligation', () => {
    const graph = parseToGraph(
      'Both Parties shall comply with the limitations on use and disclosure.',
      TREE_OPTS
    );
    const act = findAct(graph, 'comply');
    expect(act).toBeTruthy();
    expect(act['tagteam:modality']).toBe('obligation');
    semantic.hasActualityStatus(act, 'Prescribed');
  });

});

// ═══════════════════════════════════════════════════════════════
// AC-SH-32: Non-Regression (copular)
// ═══════════════════════════════════════════════════════════════

describe('Non-Regression (Tree Pipeline)', function() {

  test('AC-SH-32: copular sentence has no spurious modality', () => {
    const graph = parseToGraph('CBP is a component of DHS.', TREE_OPTS);
    // Find any act node
    const acts = (graph['@graph'] || []).filter(n =>
      [].concat(n['@type'] || []).some(t => t.includes('IntentionalAct'))
    );
    // No act should have modality
    for (const act of acts) {
      if (act['tagteam:modality']) {
        throw new Error(`Spurious modality "${act['tagteam:modality']}" on copular act "${act['rdfs:label']}"`);
      }
    }
  });

});

printSummary();
exit();
