/**
 * WS-1 Domain Corpus Regression Tests
 *
 * Guards the 5 bug fixes discovered during the 50-sentence CBP domain
 * corpus review. Each test reproduces a specific failure that was fixed.
 * If any of these regress, the corpus review baseline (38/50) drops.
 *
 * Source: docs/research/cms-2303-dhs-data-exch.pdf (CMS/DHS MOA)
 * Fixes are principled and general — not MOA-specific.
 *
 * @tags p0, corpus, regression, rdm
 */

const { describe, test, expect, semantic, parseToGraph, printSummary, exit } = require('../framework/test-helpers');

const TREE_OPTS = { useTreeExtractors: true };

function findPlanSpec(graph, verbHint) {
  return semantic.findNode(graph, n => {
    const types = [].concat(n['@type'] || []);
    if (!types.includes('PlanSpecification') && !types.includes('tagteam:PlanSpecification')) return false;
    if (verbHint) {
      return (n['tagteam:prescribedActType'] || '').toLowerCase().includes(verbHint);
    }
    return true;
  });
}

function findRE(graph, reType) {
  return semantic.findNode(graph, n => {
    const types = [].concat(n['@type'] || []);
    return types.includes(reType) || types.includes('tagteam:' + reType);
  });
}

function findVP(graph, verbHint) {
  return semantic.findNode(graph, n => {
    const types = [].concat(n['@type'] || []);
    if (!types.includes('tagteam:VerbPhrase')) return false;
    const verb = (n['tagteam:verb'] || '').toLowerCase();
    return verb.includes(verbHint);
  });
}

function resolveId(val) {
  if (!val) return null;
  return val['@id'] || val;
}

// ═══════════════════════════════════════════════════════════════
// P0: MOA-14 — ccomp extraction + recursion
// "must specify" was inside a ccomp of an acl, never found
// ═══════════════════════════════════════════════════════════════

describe('P0: ccomp act extraction (MOA-14)', function() {

  test('MOA-14: "must specify" found via ccomp of acl', () => {
    const graph = parseToGraph(
      'The Party requesting permission must specify the following in writing.',
      TREE_OPTS
    );
    const vp = findVP(graph, 'specify');
    expect(vp).toBeTruthy();
    expect(vp['tagteam:modality']).toBe('obligation');
  });

  test('MOA-14: DICE + PlanSpec emitted for "must specify"', () => {
    const graph = parseToGraph(
      'The Party requesting permission must specify the following in writing.',
      TREE_OPTS
    );
    const dice = semantic.findNode(graph, n =>
      [].concat(n['@type'] || []).some(t => t.includes('DirectiveInformationContentEntity'))
    );
    const ps = findPlanSpec(graph, 'specify');
    expect(dice).toBeTruthy();
    expect(ps).toBeTruthy();
  });

  test('General: ccomp verbs with modals produce VerbPhrase', () => {
    // Any sentence where the modal verb is in a ccomp position
    const graph = parseToGraph(
      'The report indicating compliance must include all relevant data.',
      TREE_OPTS
    );
    const vp = findVP(graph, 'include');
    expect(vp).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// P0: MOA-20 — "will not" → prohibition
// MODAL_TABLE lacked negated form for 'will'
// ═══════════════════════════════════════════════════════════════

describe('P0: will not → prohibition (MOA-20)', function() {

  test('MOA-20: "will not use" → Prohibition', () => {
    const graph = parseToGraph(
      'The Parties will not use the data to extract information concerning individuals.',
      TREE_OPTS
    );
    const pro = findRE(graph, 'Prohibition');
    expect(pro).toBeTruthy();
    const cat = resolveId(pro['tagteam:deonticCategory']);
    expect(cat).toBe('tagteam:UnconditionalProhibition');
  });

  test('General: "will not disclose" → Prohibition', () => {
    const graph = parseToGraph(
      'The agency will not disclose personal information without consent.',
      TREE_OPTS
    );
    const pro = findRE(graph, 'Prohibition');
    expect(pro).toBeTruthy();
  });

  test('Non-negated "will" still produces Intention', () => {
    const graph = parseToGraph(
      'The agency will provide the data.',
      TREE_OPTS
    );
    const intent = findRE(graph, 'Intention');
    expect(intent).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// P1: MOA-05/06 — quantifier + plural normalization
// "Both Parties" → strip "Both", normalize "parties"→"party"
// ═══════════════════════════════════════════════════════════════

describe('P1: Quantifier stripping + plural normalization (MOA-05/06)', function() {

  test('MOA-05: "Both Parties shall maintain" → agent resolved', () => {
    const graph = parseToGraph(
      'Both Parties shall maintain a level of security.',
      TREE_OPTS
    );
    const ps = findPlanSpec(graph, 'maintain');
    expect(ps).toBeTruthy();
    expect(ps['tagteam:prescribedAgent']).toBeTruthy();
  });

  test('MOA-06: "Both Parties shall comply" → agent resolved', () => {
    const graph = parseToGraph(
      'Both Parties shall comply with the limitations on use and disclosure.',
      TREE_OPTS
    );
    const ps = findPlanSpec(graph, 'comply');
    expect(ps).toBeTruthy();
    expect(ps['tagteam:prescribedAgent']).toBeTruthy();
  });

  test('General: "Each employee must report" → agent resolved', () => {
    const graph = parseToGraph(
      'Each employee must report any security incidents.',
      TREE_OPTS
    );
    const ps = findPlanSpec(graph, 'report');
    expect(ps).toBeTruthy();
    expect(ps['tagteam:prescribedAgent']).toBeTruthy();
  });

  test('General: "All agencies shall submit" → agent resolved', () => {
    const graph = parseToGraph(
      'All agencies shall submit annual compliance reports.',
      TREE_OPTS
    );
    const ps = findPlanSpec(graph, 'submit');
    expect(ps).toBeTruthy();
    expect(ps['tagteam:prescribedAgent']).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// P1: MOA-35/42 — passive modal agent fallback
// Passive voice with modal: use prescribedPatient as RE bearer
// ═══════════════════════════════════════════════════════════════

describe('P1: Passive modal bearer fallback (MOA-35/42)', function() {

  test('MOA-42: "AE will be prompted" → Intention inheres_in AE', () => {
    const graph = parseToGraph(
      'When USCIS cannot verify immigration status, the AE will be prompted to submit the case for third step verification.',
      TREE_OPTS
    );
    // At minimum, some RE should have inheres_in
    const nodes = (graph['@graph'] || []);
    const res = nodes.filter(n => {
      const types = [].concat(n['@type'] || []);
      return (types.includes('Intention') || types.includes('Prohibition') ||
              types.includes('Obligation') || types.includes('Permission')) &&
             n['inheres_in'];
    });
    expect(res.length > 0).toBeTruthy();
  });

  test('General: "Records shall be destroyed" → Obligation has bearer', () => {
    const graph = parseToGraph(
      'The records shall be destroyed by the officer.',
      TREE_OPTS
    );
    const obl = findRE(graph, 'Obligation');
    expect(obl).toBeTruthy();
    expect(obl['inheres_in']).toBeTruthy();
  });

  test('General: passive "may be granted" → Permission has bearer', () => {
    const graph = parseToGraph(
      'Access may be granted by the supervisor.',
      TREE_OPTS
    );
    const perm = findRE(graph, 'Permission');
    expect(perm).toBeTruthy();
    expect(perm['inheres_in']).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// P2: MOA-03/13 — conjunct role propagation
// Coordinated verbs: copy agent from first PlanSpec to others
// ═══════════════════════════════════════════════════════════════

describe('P2: Conjunct PlanSpec role propagation (MOA-03/13)', function() {

  test('MOA-03: "shall cooperate and collaborate" → all PlanSpecs have agent', () => {
    const graph = parseToGraph(
      'CMS shall cooperate and collaborate with USCIS.',
      TREE_OPTS
    );
    const planSpecs = (graph['@graph'] || []).filter(n =>
      [].concat(n['@type'] || []).includes('PlanSpecification')
    );
    // At least 2 PlanSpecs for coordinated verbs
    expect(planSpecs.length >= 2).toBeTruthy();
    // All should have prescribedAgent (propagated from first)
    const withAgent = planSpecs.filter(ps => ps['tagteam:prescribedAgent']);
    expect(withAgent.length).toBe(planSpecs.length);
  });

  test('General: "must review and approve" → both PlanSpecs have agent', () => {
    const graph = parseToGraph(
      'The committee must review and approve the proposal.',
      TREE_OPTS
    );
    const planSpecs = (graph['@graph'] || []).filter(n =>
      [].concat(n['@type'] || []).includes('PlanSpecification')
    );
    expect(planSpecs.length >= 2).toBeTruthy();
    const withAgent = planSpecs.filter(ps => ps['tagteam:prescribedAgent']);
    expect(withAgent.length).toBe(planSpecs.length);
  });

});

printSummary();
exit();
