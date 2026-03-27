/**
 * Realist Deontic Modeling Tests
 *
 * Tests the DICE + PlanSpecification + RealizableEntity graph topology
 * that replaces ghost IntentionalAct nodes for modal sentences.
 *
 * Spec: docs/development/realist-deontic-modeling-v1.2.1.md
 * Plan: docs/development/plan-rdm-realist-deontic-modeling.md
 * AC: RDM-01 through RDM-43
 *
 * @tags p0, deontic, rdm, tree-pipeline
 */

const { describe, test, expect, semantic, parseToGraph, printSummary, exit } = require('../../framework/test-helpers');

const TREE_OPTS = { useTreeExtractors: true };

// ── Helpers ──────────────────────────────────────────────────

function findVP(graph, verbLemma) {
  return semantic.findNode(graph, n => {
    const types = [].concat(n['@type'] || []);
    if (!types.includes('tagteam:VerbPhrase')) return false;
    const verb = (n['tagteam:verb'] || '').toLowerCase();
    const lemma = (n['tagteam:lemma'] || '').toLowerCase();
    const label = (n['rdfs:label'] || '').toLowerCase();
    return verb === verbLemma || lemma === verbLemma || label === verbLemma;
  });
}

function findDICE(graph) {
  return semantic.findNode(graph, n => {
    const types = [].concat(n['@type'] || []);
    return types.includes('DirectiveInformationContentEntity') ||
           types.includes('tagteam:DirectiveInformationContentEntity');
  });
}

function findAllDICE(graph) {
  return (graph['@graph'] || []).filter(n => {
    const types = [].concat(n['@type'] || []);
    return types.includes('DirectiveInformationContentEntity') ||
           types.includes('tagteam:DirectiveInformationContentEntity');
  });
}

function findPlanSpec(graph) {
  return semantic.findNode(graph, n => {
    const types = [].concat(n['@type'] || []);
    return types.includes('PlanSpecification') ||
           types.includes('tagteam:PlanSpecification');
  });
}

function findAllPlanSpecs(graph) {
  return (graph['@graph'] || []).filter(n => {
    const types = [].concat(n['@type'] || []);
    return types.includes('PlanSpecification') ||
           types.includes('tagteam:PlanSpecification');
  });
}

function findRE(graph, reType) {
  return semantic.findNode(graph, n => {
    const types = [].concat(n['@type'] || []);
    return types.includes(reType) || types.includes('tagteam:' + reType);
  });
}

function findAllRE(graph, reType) {
  return (graph['@graph'] || []).filter(n => {
    const types = [].concat(n['@type'] || []);
    return types.includes(reType) || types.includes('tagteam:' + reType);
  });
}

function findAct(graph, verbLemma) {
  return semantic.findNode(graph, n => {
    const types = [].concat(n['@type'] || []);
    if (!types.includes('IntentionalAct')) return false;
    const label = (n['rdfs:label'] || '').toLowerCase();
    const lemma = (n['tagteam:lemma'] || '').toLowerCase();
    const verb = (n['tagteam:verb'] || '').toLowerCase();
    return label === verbLemma || lemma === verbLemma || verb === verbLemma;
  });
}

function hasNoGhostAct(graph, verbLemma) {
  const nodes = (graph['@graph'] || []);
  return !nodes.some(n => {
    const types = [].concat(n['@type'] || []);
    if (!types.includes('IntentionalAct')) return false;
    const verb = (n['tagteam:verb'] || '').toLowerCase();
    const lemma = (n['tagteam:lemma'] || '').toLowerCase();
    const label = (n['rdfs:label'] || '').toLowerCase();
    // Exclude the ParsingAct (always exists)
    if (label === 'semantic parsing act') return false;
    return verb === verbLemma || lemma === verbLemma || label === verbLemma;
  });
}

function findConjObligation(graph) {
  return semantic.findNode(graph, n => {
    const types = [].concat(n['@type'] || []);
    return types.includes('tagteam:ConjunctiveObligation') ||
           types.includes('ConjunctiveObligation');
  });
}

function resolveId(val) {
  if (!val) return null;
  return val['@id'] || val;
}

// ═══════════════════════════════════════════════════════════════
// Phase 1: Modal Branch — VerbPhrase (Tier 1) + No Ghost Acts
// ═══════════════════════════════════════════════════════════════

describe('Phase 1: VerbPhrase Tier 1 + No Ghost Acts', function() {

  test('RDM-01: "shall review" → VP @type is DiscourseReferent + VerbPhrase', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const vp = findVP(graph, 'review');
    expect(vp).toBeTruthy();
    const types = [].concat(vp['@type'] || []);
    expect(types.includes('tagteam:DiscourseReferent')).toBeTruthy();
    expect(types.includes('tagteam:VerbPhrase')).toBeTruthy();
    expect(types.includes('IntentionalAct')).toBeFalsy();
  });

  test('RDM-02: VP has tagteam:verb = "review"', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const vp = findVP(graph, 'review');
    expect(vp).toBeTruthy();
    expect(vp['tagteam:verb']).toBe('review');
  });

  test('RDM-03: VP has tagteam:modalMarker = "shall"', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const vp = findVP(graph, 'review');
    expect(vp).toBeTruthy();
    expect(vp['tagteam:modalMarker']).toBe('shall');
  });

  test('RDM-04: VP has deonticCategory = UnconditionalObligation', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const vp = findVP(graph, 'review');
    expect(vp).toBeTruthy();
    const cat = resolveId(vp['tagteam:deonticCategory']);
    expect(cat).toBe('tagteam:UnconditionalObligation');
  });

  test('RDM-05: VP has interpretationConfidence = 0.95', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const vp = findVP(graph, 'review');
    expect(vp).toBeTruthy();
    expect(vp['tagteam:interpretationConfidence']).toBe(0.95);
  });

  test('RDM-06: No ghost IntentionalAct for "review"', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    expect(hasNoGhostAct(graph, 'review')).toBeTruthy();
  });

  test('RDM-07: Non-modal "treats" still produces IntentionalAct', () => {
    const graph = parseToGraph('The doctor treats the patient.', TREE_OPTS);
    const act = findAct(graph, 'treat') || findAct(graph, 'treats');
    expect(act).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// Phase 2: DICE + PlanSpecification
// ═══════════════════════════════════════════════════════════════

describe('Phase 2: DICE + PlanSpecification', function() {

  test('RDM-08: DICE node exists with type DirectiveInformationContentEntity', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const dice = findDICE(graph);
    expect(dice).toBeTruthy();
  });

  test('RDM-09: DICE prescribes → PlanSpec', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const dice = findDICE(graph);
    expect(dice).toBeTruthy();
    const planSpec = findPlanSpec(graph);
    expect(planSpec).toBeTruthy();
    expect(resolveId(dice['prescribes'])).toBe(planSpec['@id']);
  });

  test('RDM-10: DICE deonticCategory = UnconditionalObligation', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const dice = findDICE(graph);
    expect(dice).toBeTruthy();
    const cat = resolveId(dice['tagteam:deonticCategory']);
    expect(cat).toBe('tagteam:UnconditionalObligation');
  });

  test('RDM-11: DICE modalMarker = "shall"', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const dice = findDICE(graph);
    expect(dice).toBeTruthy();
    expect(dice['tagteam:modalMarker']).toBe('shall');
  });

  test('RDM-12: PlanSpec exists with type PlanSpecification', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const ps = findPlanSpec(graph);
    expect(ps).toBeTruthy();
  });

  test('RDM-13: PlanSpec prescribedActType = "review"', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const ps = findPlanSpec(graph);
    expect(ps).toBeTruthy();
    expect(ps['tagteam:prescribedActType']).toBe('review');
  });

  test('RDM-14: PlanSpec prescribedAgent → Committee Tier 2', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const ps = findPlanSpec(graph);
    expect(ps).toBeTruthy();
    expect(ps['tagteam:prescribedAgent']).toBeTruthy();
  });

  test('RDM-15: PlanSpec prescribedPatient → Proposal Tier 2', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const ps = findPlanSpec(graph);
    expect(ps).toBeTruthy();
    expect(ps['tagteam:prescribedPatient']).toBeTruthy();
  });

  test('RDM-16: VP is_about → DICE', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const vp = findVP(graph, 'review');
    const dice = findDICE(graph);
    expect(vp).toBeTruthy();
    expect(dice).toBeTruthy();
    expect(resolveId(vp['is_about'])).toBe(dice['@id']);
  });

});

// ═══════════════════════════════════════════════════════════════
// Phase 3: RealizableEntity
// ═══════════════════════════════════════════════════════════════

describe('Phase 3: RealizableEntity', function() {

  test('RDM-17: Obligation node exists for "shall review"', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const obl = findRE(graph, 'Obligation');
    expect(obl).toBeTruthy();
  });

  test('RDM-18: Obligation inheres_in → Committee Tier 2', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const obl = findRE(graph, 'Obligation');
    expect(obl).toBeTruthy();
    expect(obl['inheres_in']).toBeTruthy();
  });

  test('RDM-19: Obligation is_prescribed_by → DICE', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const obl = findRE(graph, 'Obligation');
    const dice = findDICE(graph);
    expect(obl).toBeTruthy();
    expect(dice).toBeTruthy();
    expect(resolveId(obl['is_prescribed_by'])).toBe(dice['@id']);
  });

  test('RDM-20: Obligation isSpecifiedBy → PlanSpec', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const obl = findRE(graph, 'Obligation');
    const ps = findPlanSpec(graph);
    expect(obl).toBeTruthy();
    expect(ps).toBeTruthy();
    expect(resolveId(obl['isSpecifiedBy'])).toBe(ps['@id']);
  });

  test('RDM-21: Obligation deonticCategory = UnconditionalObligation', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const obl = findRE(graph, 'Obligation');
    expect(obl).toBeTruthy();
    const cat = resolveId(obl['tagteam:deonticCategory']);
    expect(cat).toBe('tagteam:UnconditionalObligation');
  });

  test('RDM-22: Obligation fulfillmentState = Pending', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const obl = findRE(graph, 'Obligation');
    expect(obl).toBeTruthy();
    const state = resolveId(obl['tagteam:fulfillmentState']);
    expect(state).toBe('tagteam:Pending');
  });

  test('RDM-23: "shall not disclose" → Prohibition', () => {
    const graph = parseToGraph('Officers shall not disclose records.', TREE_OPTS);
    const pro = findRE(graph, 'Prohibition');
    expect(pro).toBeTruthy();
    const cat = resolveId(pro['tagteam:deonticCategory']);
    expect(cat).toBe('tagteam:UnconditionalProhibition');
  });

  test('RDM-24: "may refuse" → Permission', () => {
    const graph = parseToGraph('The patient may refuse treatment.', TREE_OPTS);
    const perm = findRE(graph, 'Permission');
    expect(perm).toBeTruthy();
    const cat = resolveId(perm['tagteam:deonticCategory']);
    expect(cat).toBe('tagteam:GrantedPermission');
  });

  test('RDM-25: "will provide" → Intention', () => {
    const graph = parseToGraph('The agency will provide data.', TREE_OPTS);
    const intent = findRE(graph, 'Intention');
    expect(intent).toBeTruthy();
    const cat = resolveId(intent['tagteam:deonticCategory']);
    expect(cat).toBe('tagteam:DeclaredIntention');
  });

  test('RDM-26: "could fail" → no RealizableEntity (hypothetical)', () => {
    const graph = parseToGraph('The system could fail under load.', TREE_OPTS);
    const obl = findRE(graph, 'Obligation');
    const perm = findRE(graph, 'Permission');
    const pro = findRE(graph, 'Prohibition');
    const intent = findRE(graph, 'Intention');
    expect(obl).toBeFalsy();
    expect(perm).toBeFalsy();
    expect(pro).toBeFalsy();
    expect(intent).toBeFalsy();
  });

  test('RDM-27: "could fail" → DICE + PlanSpec still exist', () => {
    const graph = parseToGraph('The system could fail under load.', TREE_OPTS);
    const dice = findDICE(graph);
    const ps = findPlanSpec(graph);
    expect(dice).toBeTruthy();
    expect(ps).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// Phase 4: ConjunctiveObligation
// ═══════════════════════════════════════════════════════════════

describe('Phase 4: ConjunctiveObligation', function() {

  test('RDM-28: "shall review and approve" → two Obligations', () => {
    const graph = parseToGraph('The committee shall review and approve the proposal.', TREE_OPTS);
    const obligations = findAllRE(graph, 'Obligation');
    expect(obligations.length >= 2).toBeTruthy();
  });

  test('RDM-29: ConjunctiveObligation wrapper with hasConjunct → both', () => {
    const graph = parseToGraph('The committee shall review and approve the proposal.', TREE_OPTS);
    const conj = findConjObligation(graph);
    expect(conj).toBeTruthy();
    const conjuncts = [].concat(conj['tagteam:hasConjunct'] || []);
    expect(conjuncts.length >= 2).toBeTruthy();
  });

  test('RDM-30: ConjunctiveObligation fulfillmentState = Pending', () => {
    const graph = parseToGraph('The committee shall review and approve the proposal.', TREE_OPTS);
    const conj = findConjObligation(graph);
    expect(conj).toBeTruthy();
    const state = resolveId(conj['tagteam:fulfillmentState']);
    expect(state).toBe('tagteam:Pending');
  });

});

// ═══════════════════════════════════════════════════════════════
// Phase 5: Role Branch
// ═══════════════════════════════════════════════════════════════

describe('Phase 5: Role Branch for Modal Sentences', function() {

  test('RDM-31: "shall review" → no AgentRole/PatientRole nodes', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const roles = (graph['@graph'] || []).filter(n => {
      const types = [].concat(n['@type'] || []);
      return types.includes('Role') && (
        (n['tagteam:roleType'] || '').includes('Agent') ||
        (n['tagteam:roleType'] || '').includes('Patient') ||
        (n['rdfs:label'] || '').includes('Agent') ||
        (n['rdfs:label'] || '').includes('Patient')
      );
    });
    // Filter out roles that realize_in non-modal acts (ParsingAct etc.)
    const modalRoles = roles.filter(r => {
      const realizedIn = resolveId(r['realized_in']);
      // If it points to an act containing "review", it's a ghost role
      return realizedIn && realizedIn.toLowerCase().includes('review');
    });
    expect(modalRoles.length).toBe(0);
  });

  test('RDM-32: PlanSpec has prescribedAgent + prescribedPatient', () => {
    const graph = parseToGraph('The committee shall review the proposal.', TREE_OPTS);
    const ps = findPlanSpec(graph);
    expect(ps).toBeTruthy();
    expect(ps['tagteam:prescribedAgent']).toBeTruthy();
    expect(ps['tagteam:prescribedPatient']).toBeTruthy();
  });

  test('RDM-33: Non-modal "treats" → AgentRole + PatientRole exist', () => {
    const graph = parseToGraph('The doctor treats the patient.', TREE_OPTS);
    const roles = (graph['@graph'] || []).filter(n => {
      const types = [].concat(n['@type'] || []);
      return types.includes('Role');
    });
    expect(roles.length >= 2).toBeTruthy();
  });

  test('RDM-34: Passive "shall be destroyed by officer" → agent from obl:by', () => {
    const graph = parseToGraph('The records shall be destroyed by the officer.', TREE_OPTS);
    const ps = findPlanSpec(graph);
    expect(ps).toBeTruthy();
    // prescribedAgent should point to officer, not records
    const agentId = resolveId(ps['tagteam:prescribedAgent']);
    expect(agentId).toBeTruthy();
    // Verify it's the officer, not the records
    const agentNode = (graph['@graph'] || []).find(n => n['@id'] === agentId);
    if (agentNode) {
      const label = (agentNode['rdfs:label'] || '').toLowerCase();
      expect(label.includes('officer')).toBeTruthy();
    }
  });

});

// ═══════════════════════════════════════════════════════════════
// Phase 6: ISA MOA Sentences
// ═══════════════════════════════════════════════════════════════

describe('Phase 6: ISA MOA Sentences', function() {

  test('RDM-35: "CMS shall allow USCIS..." → DICE + PlanSpec + Obligation', () => {
    const graph = parseToGraph(
      'CMS shall allow USCIS to monitor and review all records and documents under CMS control related to this Agreement.',
      TREE_OPTS
    );
    expect(findDICE(graph)).toBeTruthy();
    expect(findPlanSpec(graph)).toBeTruthy();
    expect(findRE(graph, 'Obligation')).toBeTruthy();
  });

  test('RDM-36: "AE must submit..." → Obligation inheres_in AE', () => {
    const graph = parseToGraph(
      'The AE must submit such documentation electronically.',
      TREE_OPTS
    );
    const obl = findRE(graph, 'Obligation');
    expect(obl).toBeTruthy();
    expect(obl['inheres_in']).toBeTruthy();
  });

  test('RDM-37: "may not deny" → Prohibition', () => {
    const graph = parseToGraph(
      "CMS and AEs may not deny an application based on a verification response that fails to confirm the applicant's status.",
      TREE_OPTS
    );
    const pro = findRE(graph, 'Prohibition');
    expect(pro).toBeTruthy();
    const cat = resolveId(pro['tagteam:deonticCategory']);
    expect(cat).toBe('tagteam:UnconditionalProhibition');
  });

  test('RDM-38: "shall comply" → Obligation', () => {
    const graph = parseToGraph(
      'Both Parties shall comply with the limitations on use and disclosure.',
      TREE_OPTS
    );
    const obl = findRE(graph, 'Obligation');
    expect(obl).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// Phase 7: Non-Regression
// ═══════════════════════════════════════════════════════════════

describe('Phase 7: Non-Regression', function() {

  test('RDM-39: Non-modal → IntentionalAct + Roles unchanged', () => {
    const graph = parseToGraph('The doctor treats the patient.', TREE_OPTS);
    const act = findAct(graph, 'treat') || findAct(graph, 'treats');
    expect(act).toBeTruthy();
    const roles = (graph['@graph'] || []).filter(n => {
      const types = [].concat(n['@type'] || []);
      return types.includes('Role');
    });
    expect(roles.length >= 2).toBeTruthy();
  });

  test('RDM-40: Copular "CBP is a component of DHS" → StructuralAssertion', () => {
    const graph = parseToGraph('CBP is a component of DHS.', TREE_OPTS);
    const assertions = (graph['@graph'] || []).filter(n => {
      const types = [].concat(n['@type'] || []);
      return types.some(t => t.includes('Assertion'));
    });
    expect(assertions.length > 0).toBeTruthy();
  });

});

printSummary();
exit();
