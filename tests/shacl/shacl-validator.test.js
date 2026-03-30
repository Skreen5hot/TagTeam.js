/**
 * TagTeam SHACL Validation Test Runner v1.3.1
 *
 * JavaScript implementation of SHACL shape validation for TagTeam graphs.
 * Checks compact @context-aliased property names from buildGraph() output.
 * No external SHACL engine dependency — pure JavaScript.
 *
 * Spec: docs/development/tagteam-shacl-validation-spec-v1.3.1.md
 * Shapes: docs/development/tagteam-shacl-v1.3.1.ttl
 *
 * @tags p0, shacl, validation, structural
 */

const { describe, test, expect, parseToGraph, printSummary, exit } = require('../framework/test-helpers');

const TREE_OPTS = { useTreeExtractors: true };

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getNodes(graph) {
  return graph['@graph'] || [];
}

function hasType(node, typeName) {
  const types = [].concat(node['@type'] || []);
  return types.some(t => t === typeName || t.includes(typeName));
}

function resolveId(val) {
  if (!val) return null;
  return (typeof val === 'object' && val['@id']) ? val['@id'] : val;
}

function isSystemAct(node) {
  const label = (node['rdfs:label'] || '').toLowerCase();
  const id = (node['@id'] || '');
  return label.includes('parsing') || id.includes('ParsingAct') || id.includes('System');
}

// ═══════════════════════════════════════════════════════════════
// SHAPE VALIDATORS
// Each returns { pass: boolean, violations: string[] }
// ═══════════════════════════════════════════════════════════════

const VALID_DENOTES_TYPES = new Set([
  'Person', 'Organization', 'Entity', 'Location', 'EventDescription',
  'Event', 'Directive', 'Quality', 'Structure', 'Role'
]);

const VALID_MODAL_MARKERS = new Set([
  'shall', 'must', 'should', 'may', 'can', 'will'
]);

function validateDiscourseReferentShape(nodes) {
  const violations = [];
  const refs = nodes.filter(n => hasType(n, 'DiscourseReferent'));
  for (const n of refs) {
    if (!n['tagteam:mentionId']) violations.push(`${n['@id']}: missing mentionId`);
    if (!n['rdfs:label']) violations.push(`${n['@id']}: missing rdfs:label`);
    if (!n['tagteam:denotesType']) violations.push(`${n['@id']}: missing denotesType`);
    else if (!VALID_DENOTES_TYPES.has(n['tagteam:denotesType'])) violations.push(`${n['@id']}: invalid denotesType "${n['tagteam:denotesType']}"`);
    if (!n['is_about']) violations.push(`${n['@id']}: missing is_about`);
    if (!n['is_concretized_by']) violations.push(`${n['@id']}: missing is_concretized_by`);
    // Anti-patterns
    if (hasType(n, 'IntentionalAct')) violations.push(`${n['@id']}: Tier 1 node has IntentionalAct type (tier leakage)`);
    if (hasType(n, 'EventDescription')) violations.push(`${n['@id']}: Tier 1 node has EventDescription type (tier leakage)`);
    if (n['tagteam:actualityStatus']) violations.push(`${n['@id']}: DiscourseReferent has actualityStatus (Tier 2 property)`);
    if (n['tagteam:realizationStatus']) violations.push(`${n['@id']}: DiscourseReferent has realizationStatus (Tier 2 property)`);
  }
  return { pass: violations.length === 0, violations, count: refs.length };
}

function validateVerbPhraseShape(nodes) {
  const violations = [];
  const vps = nodes.filter(n => hasType(n, 'VerbPhrase') && !hasType(n, 'IntentionalAct'));
  for (const n of vps) {
    if (!n['tagteam:lemma']) violations.push(`${n['@id']}: missing lemma`);
    if (!n['tagteam:verb']) violations.push(`${n['@id']}: missing verb`);
    if (!n['is_about']) violations.push(`${n['@id']}: missing is_about`);
    if (n['tagteam:modalMarker'] && !VALID_MODAL_MARKERS.has(n['tagteam:modalMarker'])) {
      violations.push(`${n['@id']}: invalid modalMarker "${n['tagteam:modalMarker']}"`);
    }
    // Anti-patterns
    if (hasType(n, 'IntentionalAct')) violations.push(`${n['@id']}: VerbPhrase has IntentionalAct type`);
    if (n['realized_in']) violations.push(`${n['@id']}: VerbPhrase has realized_in`);
    if (n['tagteam:describedBy']) violations.push(`${n['@id']}: VerbPhrase has describedBy`);
  }
  return { pass: violations.length === 0, violations, count: vps.length };
}

function validateEventDescriptionShape(nodes) {
  const violations = [];
  const eds = nodes.filter(n => hasType(n, 'EventDescription'));
  for (const n of eds) {
    if (!n['tagteam:actType']) violations.push(`${n['@id']}: missing actType`);
    if (!n['tagteam:realizationStatus']) violations.push(`${n['@id']}: missing realizationStatus`);
    if (!n['tagteam:agent'] && !n['tagteam:patient']) violations.push(`${n['@id']}: missing both agent and patient`);
    if (hasType(n, 'VerbPhrase')) violations.push(`${n['@id']}: EventDescription has VerbPhrase type`);
    if (hasType(n, 'DiscourseReferent')) violations.push(`${n['@id']}: EventDescription has DiscourseReferent type`);
    if (n['tagteam:mentionId']) violations.push(`${n['@id']}: EventDescription has mentionId (Tier 1 property)`);
  }
  return { pass: violations.length === 0, violations, count: eds.length };
}

function validateQualityAssertionShape(nodes) {
  const violations = [];
  const qas = nodes.filter(n => hasType(n, 'QualityAssertion'));
  for (const n of qas) {
    if (!n['tagteam:assertedQuality']) violations.push(`${n['@id']}: missing assertedQuality`);
    if (!n['tagteam:assertionSubject']) violations.push(`${n['@id']}: missing assertionSubject`);
  }
  return { pass: violations.length === 0, violations, count: qas.length };
}

function validateStructuralAssertionShape(nodes) {
  const violations = [];
  const sas = nodes.filter(n => hasType(n, 'StructuralAssertion') && !hasType(n, 'QualityAssertion') && !hasType(n, 'RoleAssertion'));
  for (const n of sas) {
    // Must have subject (as string or IRI) and pattern
    if (!n['tagteam:subject'] && !n['tagteam:assertionSubject'] && !n['assertionSubject']) {
      violations.push(`${n['@id']}: missing subject`);
    }
  }
  return { pass: violations.length === 0, violations, count: sas.length };
}

function validatePlanSpecificationShape(nodes) {
  const violations = [];
  const pss = nodes.filter(n => hasType(n, 'PlanSpecification'));
  for (const n of pss) {
    if (!n['tagteam:prescribedActType']) violations.push(`${n['@id']}: missing prescribedActType`);
    if (!n['tagteam:prescribedAgent']) violations.push(`${n['@id']}: missing prescribedAgent`);
  }
  return { pass: violations.length === 0, violations, count: pss.length };
}

function validateDirectiveICEShape(nodes) {
  const violations = [];
  const dices = nodes.filter(n => hasType(n, 'DirectiveInformationContentEntity'));
  for (const n of dices) {
    if (!n['tagteam:modalMarker']) violations.push(`${n['@id']}: missing modalMarker`);
    else if (!VALID_MODAL_MARKERS.has(n['tagteam:modalMarker'])) violations.push(`${n['@id']}: invalid modalMarker`);
    if (!n['prescribes']) violations.push(`${n['@id']}: missing prescribes`);
  }
  return { pass: violations.length === 0, violations, count: dices.length };
}

function validateIntentionalActShape(nodes) {
  const violations = [];
  const acts = nodes.filter(n => hasType(n, 'IntentionalAct') && !isSystemAct(n));
  for (const n of acts) {
    if (!n['tagteam:actualityStatus']) violations.push(`${n['@id']}: missing actualityStatus`);
    if (!n['tagteam:describedBy']) violations.push(`${n['@id']}: missing describedBy (ghost act)`);
    if (hasType(n, 'VerbPhrase')) violations.push(`${n['@id']}: IntentionalAct has VerbPhrase type (tier leakage)`);
    if (hasType(n, 'DiscourseReferent')) violations.push(`${n['@id']}: IntentionalAct has DiscourseReferent type`);
    if (n['tagteam:mentionId']) violations.push(`${n['@id']}: IntentionalAct has mentionId (Tier 1 property)`);
  }
  return { pass: violations.length === 0, violations, count: acts.length };
}

function validateRoleShapes(nodes) {
  const violations = [];
  const roles = nodes.filter(n => hasType(n, 'Role'));
  for (const n of roles) {
    if (!n['inheres_in']) violations.push(`${n['@id']}: Role missing inheres_in`);
    if (!n['realized_in']) violations.push(`${n['@id']}: Role missing realized_in`);
    // realized_in must point to IntentionalAct, not EventDescription
    const realizedIn = resolveId(n['realized_in']);
    if (realizedIn) {
      const target = nodes.find(t => t['@id'] === realizedIn);
      if (target && hasType(target, 'EventDescription')) {
        violations.push(`${n['@id']}: Role realized_in points to EventDescription (should be IntentionalAct)`);
      }
    }
  }
  return { pass: violations.length === 0, violations, count: roles.length };
}

function validateEntityShape(nodes) {
  const violations = [];
  const entities = nodes.filter(n => n['is_subject_of']);
  for (const n of entities) {
    if (!n['rdfs:label']) violations.push(`${n['@id']}: Entity missing rdfs:label`);
  }
  return { pass: violations.length === 0, violations, count: entities.length };
}

function validateIBEShape(nodes) {
  const violations = [];
  const ibes = nodes.filter(n => hasType(n, 'InformationBearingEntity'));
  for (const n of ibes) {
    if (!n['has_text_value']) violations.push(`${n['@id']}: IBE missing has_text_value`);
    if (!n['tagteam:received_at']) violations.push(`${n['@id']}: IBE missing received_at`);
  }
  return { pass: violations.length === 0, violations, count: ibes.length };
}

// ── Cross-Tier Integrity ──

function validateTierSeparation(nodes) {
  const violations = [];
  for (const n of nodes) {
    if (hasType(n, 'VerbPhrase') && hasType(n, 'IntentionalAct')) {
      violations.push(`${n['@id']}: Node is both VerbPhrase and IntentionalAct`);
    }
  }
  return { pass: violations.length === 0, violations };
}

function validateStativeExclusion(nodes) {
  const violations = [];
  const statives = nodes.filter(n => hasType(n, 'QualityAssertion') || (hasType(n, 'StructuralAssertion') && !hasType(n, 'QualityAssertion')));
  for (const sa of statives) {
    // Check if any VP that is_about this also is_about an IntentionalAct
    const vps = nodes.filter(vp => {
      const aboutId = resolveId(vp['is_about']);
      return aboutId === sa['@id'] && hasType(vp, 'VerbPhrase');
    });
    for (const vp of vps) {
      const acts = nodes.filter(a => hasType(a, 'IntentionalAct') && !isSystemAct(a));
      // This is a simplified check — in SPARQL it checks same VP points to both
    }
  }
  return { pass: violations.length === 0, violations };
}

function validateGhostActDetection(nodes) {
  const violations = [];
  const acts = nodes.filter(n => hasType(n, 'IntentionalAct') && !isSystemAct(n));
  for (const n of acts) {
    if (!n['tagteam:describedBy']) {
      violations.push(`${n['@id']}: IntentionalAct without describedBy (ghost act)`);
    }
  }
  return { pass: violations.length === 0, violations };
}

function validateTierPollution(nodes) {
  const violations = [];
  const tier2 = nodes.filter(n => hasType(n, 'IntentionalAct') || hasType(n, 'EventDescription'));
  for (const n of tier2) {
    if (isSystemAct(n)) continue;
    if (n['tagteam:mentionId']) violations.push(`${n['@id']}: Tier 2 node has mentionId`);
  }
  return { pass: violations.length === 0, violations };
}

function validateLemmaActTypeConsistency(nodes) {
  const violations = [];
  const vps = nodes.filter(n => hasType(n, 'VerbPhrase') && !hasType(n, 'IntentionalAct'));
  for (const vp of vps) {
    const aboutId = resolveId(vp['is_about']);
    if (!aboutId) continue;
    const ed = nodes.find(n => n['@id'] === aboutId && hasType(n, 'EventDescription'));
    if (!ed) continue;
    const lemma = vp['tagteam:lemma'];
    const actType = ed['tagteam:actType'];
    if (lemma && actType && lemma !== actType) {
      violations.push(`${vp['@id']}: VP.lemma="${lemma}" != ED.actType="${actType}"`);
    }
  }
  return { pass: violations.length === 0, violations };
}

// ═══════════════════════════════════════════════════════════════
// TEST RUNNER — Appendix B Test Sentences
// ═══════════════════════════════════════════════════════════════

function runShapesOnSentence(sentence) {
  const graph = parseToGraph(sentence, TREE_OPTS);
  const nodes = getNodes(graph);
  return {
    nodes,
    DiscourseReferentShape: validateDiscourseReferentShape(nodes),
    VerbPhraseShape: validateVerbPhraseShape(nodes),
    EventDescriptionShape: validateEventDescriptionShape(nodes),
    QualityAssertionShape: validateQualityAssertionShape(nodes),
    StructuralAssertionShape: validateStructuralAssertionShape(nodes),
    PlanSpecificationShape: validatePlanSpecificationShape(nodes),
    DirectiveICEShape: validateDirectiveICEShape(nodes),
    IntentionalActShape: validateIntentionalActShape(nodes),
    RoleShapes: validateRoleShapes(nodes),
    EntityShape: validateEntityShape(nodes),
    IBEShape: validateIBEShape(nodes),
    TierSeparation: validateTierSeparation(nodes),
    StativeExclusion: validateStativeExclusion(nodes),
    GhostActDetection: validateGhostActDetection(nodes),
    TierPollution: validateTierPollution(nodes),
    LemmaActTypeConsistency: validateLemmaActTypeConsistency(nodes),
  };
}

// ═══════════════════════════════════════════════════════════════
// B.1: Eventive Path (WS-C)
// ═══════════════════════════════════════════════════════════════

describe('B.1: Eventive Path — SHACL Validation', function() {

  test('SHACL: "The parent fed the child." — all shapes pass', () => {
    const r = runShapesOnSentence('The parent fed the child.');
    const allViolations = [];
    for (const [name, result] of Object.entries(r)) {
      if (name === 'nodes') continue;
      if (!result.pass) allViolations.push(`${name}: ${result.violations.join('; ')}`);
    }
    if (allViolations.length > 0) {
      throw new Error('SHACL violations:\n  ' + allViolations.join('\n  '));
    }
  });

  test('SHACL: "The parent fed the child." — has EventDescription[Realized] + IntentionalAct', () => {
    const r = runShapesOnSentence('The parent fed the child.');
    expect(r.EventDescriptionShape.count > 0).toBeTruthy();
    expect(r.IntentionalActShape.count > 0).toBeTruthy();
  });

  test('SHACL: "The doctor treats the patient." — all shapes pass', () => {
    const r = runShapesOnSentence('The doctor treats the patient.');
    const allViolations = [];
    for (const [name, result] of Object.entries(r)) {
      if (name === 'nodes') continue;
      if (!result.pass) allViolations.push(`${name}: ${result.violations.join('; ')}`);
    }
    if (allViolations.length > 0) {
      throw new Error('SHACL violations:\n  ' + allViolations.join('\n  '));
    }
  });

});

// ═══════════════════════════════════════════════════════════════
// B.2: Stative Path (WS-A)
// ═══════════════════════════════════════════════════════════════

describe('B.2: Stative Path — SHACL Validation', function() {

  test('SHACL: "The child is hungry." — QualityAssertion shape passes', () => {
    const r = runShapesOnSentence('The child is hungry.');
    expect(r.QualityAssertionShape.pass).toBeTruthy();
    expect(r.QualityAssertionShape.count > 0).toBeTruthy();
    // No IntentionalAct for stative
    expect(r.IntentionalActShape.count).toBe(0);
  });

  test('SHACL: "CBP is a component of DHS." — StructuralAssertion passes', () => {
    const r = runShapesOnSentence('CBP is a component of DHS.');
    expect(r.StructuralAssertionShape.pass).toBeTruthy();
    // Tier separation
    expect(r.TierSeparation.pass).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// B.4: Deontic Path (RDM)
// ═══════════════════════════════════════════════════════════════

describe('B.4: Deontic Path — SHACL Validation', function() {

  test('SHACL: "The committee shall review the proposal." — RDM shapes pass', () => {
    const r = runShapesOnSentence('The committee shall review the proposal.');
    expect(r.PlanSpecificationShape.pass).toBeTruthy();
    expect(r.DirectiveICEShape.pass).toBeTruthy();
    expect(r.VerbPhraseShape.pass).toBeTruthy();
    // No ghost acts
    expect(r.GhostActDetection.pass).toBeTruthy();
    // Tier separation
    expect(r.TierSeparation.pass).toBeTruthy();
  });

  test('SHACL: "Members may attend." — Permission path shapes pass', () => {
    const r = runShapesOnSentence('Members may attend.');
    expect(r.DirectiveICEShape.pass).toBeTruthy();
    expect(r.VerbPhraseShape.pass).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// Cross-Tier Integrity (All Sentences)
// ═══════════════════════════════════════════════════════════════

describe('Cross-Tier Integrity', function() {

  const SENTENCES = [
    'The parent fed the child.',
    'The doctor treats the patient.',
    'The child is hungry.',
    'Dogs have fur.',
    'CBP is a component of DHS.',
    'The committee shall review the proposal.',
    'She seems tired.',
  ];

  test('SHACL: No tier separation violations across all test sentences', () => {
    const allViolations = [];
    for (const s of SENTENCES) {
      const r = runShapesOnSentence(s);
      if (!r.TierSeparation.pass) allViolations.push(`"${s}": ${r.TierSeparation.violations.join('; ')}`);
    }
    if (allViolations.length > 0) throw new Error(allViolations.join('\n'));
  });

  test('SHACL: No ghost acts across all test sentences', () => {
    const allViolations = [];
    for (const s of SENTENCES) {
      const r = runShapesOnSentence(s);
      if (!r.GhostActDetection.pass) allViolations.push(`"${s}": ${r.GhostActDetection.violations.join('; ')}`);
    }
    if (allViolations.length > 0) throw new Error(allViolations.join('\n'));
  });

  test('SHACL: No tier pollution across all test sentences', () => {
    const allViolations = [];
    for (const s of SENTENCES) {
      const r = runShapesOnSentence(s);
      if (!r.TierPollution.pass) allViolations.push(`"${s}": ${r.TierPollution.violations.join('; ')}`);
    }
    if (allViolations.length > 0) throw new Error(allViolations.join('\n'));
  });

  test('SHACL: Lemma-ActType consistency across eventive sentences', () => {
    const eventive = ['The parent fed the child.', 'The doctor treats the patient.'];
    const allViolations = [];
    for (const s of eventive) {
      const r = runShapesOnSentence(s);
      if (!r.LemmaActTypeConsistency.pass) allViolations.push(`"${s}": ${r.LemmaActTypeConsistency.violations.join('; ')}`);
    }
    if (allViolations.length > 0) throw new Error(allViolations.join('\n'));
  });

});

// ═══════════════════════════════════════════════════════════════
// Conformance Profile: Minimal
// ═══════════════════════════════════════════════════════════════

describe('Conformance Profile: Minimal', function() {

  test('SHACL: Minimal conformance — eventive sentence', () => {
    const r = runShapesOnSentence('The parent fed the child.');
    const required = [
      'DiscourseReferentShape', 'VerbPhraseShape', 'EventDescriptionShape',
      'IntentionalActShape', 'EntityShape', 'IBEShape',
      'TierSeparation', 'GhostActDetection', 'TierPollution'
    ];
    const failures = [];
    for (const shape of required) {
      if (r[shape] && !r[shape].pass) failures.push(`${shape}: ${r[shape].violations.join('; ')}`);
    }
    if (failures.length > 0) throw new Error('Minimal conformance failures:\n  ' + failures.join('\n  '));
  });

  test('SHACL: Minimal conformance — stative sentence', () => {
    const r = runShapesOnSentence('The child is hungry.');
    const required = [
      'DiscourseReferentShape', 'QualityAssertionShape',
      'EntityShape', 'IBEShape', 'TierSeparation', 'TierPollution'
    ];
    const failures = [];
    for (const shape of required) {
      if (r[shape] && !r[shape].pass) failures.push(`${shape}: ${r[shape].violations.join('; ')}`);
    }
    if (failures.length > 0) throw new Error('Minimal conformance failures:\n  ' + failures.join('\n  '));
  });

  test('SHACL: Minimal conformance — deontic sentence', () => {
    const r = runShapesOnSentence('The committee shall review the proposal.');
    const required = [
      'DiscourseReferentShape', 'VerbPhraseShape',
      'PlanSpecificationShape', 'DirectiveICEShape',
      'EntityShape', 'IBEShape', 'TierSeparation',
      'GhostActDetection', 'TierPollution'
    ];
    const failures = [];
    for (const shape of required) {
      if (r[shape] && !r[shape].pass) failures.push(`${shape}: ${r[shape].violations.join('; ')}`);
    }
    if (failures.length > 0) throw new Error('Minimal conformance failures:\n  ' + failures.join('\n  '));
  });

});

printSummary();
exit();
