/**
 * SHACL Frontier Tests — Probing System Limits
 *
 * Tests for WS-B (negation), WS-D (tense-aspect), instrumental paths,
 * and cross-document coreference. These test CURRENT behavior to
 * establish baselines before implementation. Tests marked KNOWN
 * document expected failures for unimplemented features.
 *
 * @tags p2, shacl, frontier, limits
 */

const { describe, test, expect, parseToGraph, printSummary, exit } = require('../framework/test-helpers');

const TREE_OPTS = { useTreeExtractors: true };

function getNodes(graph) { return graph['@graph'] || []; }
function hasType(node, t) { return [].concat(node['@type']||[]).some(x => x.includes(t)); }
function resolveId(v) { return v ? (v['@id'] || v) : null; }
function isSystemAct(n) { return (n['rdfs:label']||'').toLowerCase().includes('parsing') || (n['@id']||'').includes('ParsingAct'); }

function findED(nodes, hint) {
  return nodes.find(n => {
    if (!hasType(n, 'EventDescription')) return false;
    if (hint) return (n['tagteam:actType']||'').toLowerCase().includes(hint);
    return true;
  });
}

function findVP(nodes, hint) {
  return nodes.find(n => {
    if (!hasType(n, 'VerbPhrase') || hasType(n, 'IntentionalAct')) return false;
    if (hint) return (n['tagteam:verb']||n['tagteam:lemma']||'').toLowerCase().includes(hint);
    return true;
  });
}

function findIA(nodes, hint) {
  return nodes.find(n => {
    if (!hasType(n, 'IntentionalAct') || isSystemAct(n)) return false;
    if (hint) return (n['tagteam:verb']||n['rdfs:label']||'').toLowerCase().includes(hint);
    return true;
  });
}

function findQA(nodes) { return nodes.find(n => hasType(n, 'QualityAssertion')); }

// ═══════════════════════════════════════════════════════════════
// WS-B: NEGATION FRONTIER
// Tests current behavior for negated sentences.
// WS-B will change these — baseline now, flip expectations later.
// ═══════════════════════════════════════════════════════════════

describe('WS-B Frontier: Negation', function() {

  // ── Current behavior: negated sentences still produce IntentionalAct ──
  // WS-B will change this to EventDescription[Unrealized] with no IA

  test('NEG-01: "The parent did not feed the child." — EventDescription exists', () => {
    const graph = parseToGraph('The parent did not feed the child.', TREE_OPTS);
    const nodes = getNodes(graph);
    const ed = findED(nodes, 'feed');
    // Currently: ED exists (WS-C emits ED for all narrative acts)
    expect(ed).toBeTruthy();
  });

  test('NEG-02: "The parent did not feed the child." — VP isNegated', () => {
    const graph = parseToGraph('The parent did not feed the child.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'feed');
    expect(vp).toBeTruthy();
    expect(vp['tagteam:isNegated']).toBe(true);
  });

  test('NEG-03: "The parent did not feed the child." — realizationStatus check', () => {
    const graph = parseToGraph('The parent did not feed the child.', TREE_OPTS);
    const nodes = getNodes(graph);
    const ed = findED(nodes, 'feed');
    if (ed) {
      const status = resolveId(ed['tagteam:realizationStatus']);
      // CURRENT: Realized (WS-B will change to Unrealized)
      // Record what we get
      expect(status).toBeTruthy();
    }
  });

  test('NEG-04: "The parent did not feed the child." — IntentionalAct present?', () => {
    const graph = parseToGraph('The parent did not feed the child.', TREE_OPTS);
    const nodes = getNodes(graph);
    const ia = findIA(nodes, 'feed');
    // CURRENT: IA exists (WS-B will remove it for negated)
    // Just record — not asserting pass/fail on IA presence
    if (ia) {
      expect(ia['tagteam:describedBy']).toBeTruthy();
    }
  });

  test('NEG-05: "She never arrived." — VP isNegated', () => {
    const graph = parseToGraph('She never arrived.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'arrive') || findVP(nodes, 'arrived');
    expect(vp).toBeTruthy();
    expect(vp['tagteam:isNegated']).toBe(true);
  });

  test('NEG-06: "He didn\'t submit the report." — VP isNegated', () => {
    const graph = parseToGraph("He didn't submit the report.", TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'submit');
    expect(vp).toBeTruthy();
    expect(vp['tagteam:isNegated']).toBe(true);
  });

  test('NEG-07: "Nobody attended the meeting." — entities extracted', () => {
    const graph = parseToGraph('Nobody attended the meeting.', TREE_OPTS);
    const nodes = getNodes(graph);
    // Should have at least the meeting entity
    const refs = nodes.filter(n => hasType(n, 'DiscourseReferent'));
    expect(refs.length > 0).toBeTruthy();
  });

  test('NEG-08: "The proposal was not approved." — passive + negation', () => {
    const graph = parseToGraph('The proposal was not approved.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'approve') || findVP(nodes, 'approved');
    expect(vp).toBeTruthy();
    expect(vp['tagteam:isNegated']).toBe(true);
    expect(vp['tagteam:isPassive']).toBe(true);
  });

  test('NEG-09: "The committee has not reviewed the proposal." — aux negation', () => {
    const graph = parseToGraph('The committee has not reviewed the proposal.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'review');
    expect(vp).toBeTruthy();
  });

  test('NEG-10: Negated + modal "must not disclose" — routes to RDM prohibition', () => {
    const graph = parseToGraph('Officers must not disclose records.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'disclose');
    expect(vp).toBeTruthy();
    const cat = resolveId(vp['tagteam:deonticCategory']);
    expect(cat).toBeTruthy();
    expect(cat.includes('Prohibition')).toBeTruthy();
  });

  test('NEG-11: Affirmative baseline "The parent fed the child." — Realized', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const nodes = getNodes(graph);
    const ed = findED(nodes, 'feed');
    expect(ed).toBeTruthy();
    const status = resolveId(ed['tagteam:realizationStatus']);
    expect(status.includes('Realized')).toBeTruthy();
  });

  test('NEG-12: Double negation "He did not not comply." — edge case', () => {
    const graph = parseToGraph('He did not not comply.', TREE_OPTS);
    const nodes = getNodes(graph);
    // Parser behavior with double negation — just ensure no crash
    expect(nodes.length > 0).toBeTruthy();
  });

  test('NEG-13: Implicit negation "He refused to comply." — not structural negation', () => {
    const graph = parseToGraph('He refused to comply.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'refuse') || findVP(nodes, 'refused');
    if (vp) {
      // "refused" is not structurally negated (advmod:not), it's lexical negation
      // The VP should NOT have isNegated = true
      expect(vp['tagteam:isNegated']).toBeFalsy();
    }
  });

  test('NEG-14: "Nothing happened." — expletive subject', () => {
    const graph = parseToGraph('Nothing happened.', TREE_OPTS);
    const nodes = getNodes(graph);
    expect(nodes.length > 0).toBeTruthy();
  });

  test('NEG-15: "No officer shall disclose records." — negated deontic', () => {
    const graph = parseToGraph('No officer shall disclose records.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'disclose');
    expect(vp).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// WS-D: TENSE-ASPECT FRONTIER
// Tests current tense/aspect detection capabilities.
// ═══════════════════════════════════════════════════════════════

describe('WS-D Frontier: Tense-Aspect', function() {

  test('TAS-01: Simple past "The parent fed the child." — VBD tag', () => {
    const graph = parseToGraph('The parent fed the child.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'feed');
    expect(vp).toBeTruthy();
    // tenseAspect property — may not exist yet (WS-D)
    // Just verify the VP exists and has correct lemma
    expect(vp['tagteam:verb']).toBe('feed');
  });

  test('TAS-02: Simple present "The doctor treats the patient." — VBZ tag', () => {
    const graph = parseToGraph('The doctor treats the patient.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'treat');
    expect(vp).toBeTruthy();
  });

  test('TAS-03: Present progressive "The doctor is treating the patient."', () => {
    const graph = parseToGraph('The doctor is treating the patient.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'treat');
    expect(vp).toBeTruthy();
  });

  test('TAS-04: Past progressive "She was feeding the cat."', () => {
    const graph = parseToGraph('She was feeding the cat.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'feed');
    expect(vp).toBeTruthy();
    expect(vp['tagteam:verb']).toBe('feed');
  });

  test('TAS-05: Present perfect "The parent has fed the child."', () => {
    const graph = parseToGraph('The parent has fed the child.', TREE_OPTS);
    const nodes = getNodes(graph);
    // "has fed" — "fed" is the main verb, "has" is aux
    const vp = findVP(nodes, 'feed');
    expect(vp).toBeTruthy();
  });

  test('TAS-06: Past perfect "The parent had fed the child."', () => {
    const graph = parseToGraph('The parent had fed the child.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'feed');
    expect(vp).toBeTruthy();
  });

  test('TAS-07: Future "The agency will provide data." — modal will', () => {
    const graph = parseToGraph('The agency will provide data.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'provide');
    expect(vp).toBeTruthy();
    // "will" routes to RDM — DeclaredIntention
    const cat = resolveId(vp['tagteam:deonticCategory']);
    if (cat) expect(cat.includes('DeclaredIntention')).toBeTruthy();
  });

  test('TAS-08: Passive past "The report was written by the analyst."', () => {
    const graph = parseToGraph('The report was written by the analyst.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'write') || findVP(nodes, 'written');
    expect(vp).toBeTruthy();
    expect(vp['tagteam:isPassive']).toBe(true);
  });

  test('TAS-09: Passive present "The form is submitted electronically."', () => {
    const graph = parseToGraph('The form is submitted electronically.', TREE_OPTS);
    const nodes = getNodes(graph);
    // May be parsed as stative copular or passive
    expect(nodes.length > 0).toBeTruthy();
  });

  test('TAS-10: Infinitive "She wanted to leave."', () => {
    const graph = parseToGraph('She wanted to leave.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'want') || findVP(nodes, 'wanted');
    expect(vp).toBeTruthy();
  });

  test('TAS-11: Gerund subject "Running is healthy."', () => {
    const graph = parseToGraph('Running is healthy.', TREE_OPTS);
    const nodes = getNodes(graph);
    // "Running" as gerund subject, "healthy" as adjective predicate
    const qa = findQA(nodes);
    expect(qa).toBeTruthy();
  });

  test('TAS-12: Habitual "The doctor treats patients every day."', () => {
    const graph = parseToGraph('The doctor treats patients every day.', TREE_OPTS);
    const nodes = getNodes(graph);
    const ed = findED(nodes, 'treat');
    expect(ed).toBeTruthy();
  });

  test('TAS-13: Stative present "The child is hungry." — no tense on quality', () => {
    const graph = parseToGraph('The child is hungry.', TREE_OPTS);
    const nodes = getNodes(graph);
    const qa = findQA(nodes);
    expect(qa).toBeTruthy();
    // Quality assertions don't have tenseAspect (states, not events)
  });

  test('TAS-14: Modal past "The committee should have reviewed."', () => {
    const graph = parseToGraph('The committee should have reviewed the proposal.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'review');
    expect(vp).toBeTruthy();
  });

  test('TAS-15: Conditional "If he had arrived, she would have left."', () => {
    const graph = parseToGraph('If he had arrived, she would have left.', TREE_OPTS);
    const nodes = getNodes(graph);
    // Complex conditional — just ensure no crash
    expect(nodes.length > 0).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════
// INSTRUMENT PATH FRONTIER
// Tests "with X" instrumental constructions.
// ═══════════════════════════════════════════════════════════════

describe('Instrument Path Frontier', function() {

  test('INST-01: "She cut the paper with scissors." — scissors entity exists', () => {
    const graph = parseToGraph('She cut the paper with scissors.', TREE_OPTS);
    const nodes = getNodes(graph);
    const scissors = nodes.find(n =>
      hasType(n, 'DiscourseReferent') && (n['rdfs:label']||'').toLowerCase().includes('scissors')
    );
    expect(scissors).toBeTruthy();
  });

  test('INST-02: "She cut the paper with scissors." — EventDescription exists', () => {
    const graph = parseToGraph('She cut the paper with scissors.', TREE_OPTS);
    const nodes = getNodes(graph);
    const ed = findED(nodes, 'cut');
    expect(ed).toBeTruthy();
  });

  test('INST-03: "He wrote the letter with a pen." — pen entity exists', () => {
    const graph = parseToGraph('He wrote the letter with a pen.', TREE_OPTS);
    const nodes = getNodes(graph);
    const pen = nodes.find(n =>
      hasType(n, 'DiscourseReferent') && (n['rdfs:label']||'').toLowerCase().includes('pen')
    );
    expect(pen).toBeTruthy();
  });

  test('INST-04: "The parent fed the child with a spoon." — all roles present', () => {
    const graph = parseToGraph('The parent fed the child with a spoon.', TREE_OPTS);
    const nodes = getNodes(graph);
    const ed = findED(nodes, 'feed');
    expect(ed).toBeTruthy();
    expect(ed['tagteam:agent']).toBeTruthy();
    expect(ed['tagteam:patient']).toBeTruthy();
  });

  test('INST-05: "with" as accompaniment "She went with John." — not instrument', () => {
    const graph = parseToGraph('She went with John.', TREE_OPTS);
    const nodes = getNodes(graph);
    // "with John" is accompaniment, not instrument
    expect(nodes.length > 0).toBeTruthy();
  });

  test('INST-06: "The team built the bridge with steel." — material, not tool', () => {
    const graph = parseToGraph('The team built the bridge with steel.', TREE_OPTS);
    const nodes = getNodes(graph);
    const ed = findED(nodes, 'build') || findED(nodes, 'built');
    expect(ed).toBeTruthy();
  });

  test('INST-07: "She opened the door with a key." — instrument entity', () => {
    const graph = parseToGraph('She opened the door with a key.', TREE_OPTS);
    const nodes = getNodes(graph);
    const key = nodes.find(n =>
      hasType(n, 'DiscourseReferent') && (n['rdfs:label']||'').toLowerCase().includes('key')
    );
    expect(key).toBeTruthy();
  });

  test('INST-08: Multiple PPs "He fixed the car with a wrench in the garage."', () => {
    const graph = parseToGraph('He fixed the car with a wrench in the garage.', TREE_OPTS);
    const nodes = getNodes(graph);
    const ed = findED(nodes, 'fix');
    expect(ed).toBeTruthy();
  });

  test('INST-09: Instrumental passive "The paper was cut with scissors."', () => {
    const graph = parseToGraph('The paper was cut with scissors.', TREE_OPTS);
    const nodes = getNodes(graph);
    const vp = findVP(nodes, 'cut');
    expect(vp).toBeTruthy();
    expect(vp['tagteam:isPassive']).toBe(true);
  });

  test('INST-10: No instrument "She cut the paper." — no obl:with', () => {
    const graph = parseToGraph('She cut the paper.', TREE_OPTS);
    const nodes = getNodes(graph);
    const ed = findED(nodes, 'cut');
    expect(ed).toBeTruthy();
    // No instrument property expected
  });

});

// ═══════════════════════════════════════════════════════════════
// CROSS-DOCUMENT COREFERENCE FRONTIER
// Tests entity resolution across multiple sentences in one parse.
// ═══════════════════════════════════════════════════════════════

describe('Cross-Document Coreference Frontier', function() {

  test('COREF-01: Same entity name twice — two DRs, same Tier 2?', () => {
    const graph = parseToGraph('The doctor treated the patient. The doctor left.', TREE_OPTS);
    const nodes = getNodes(graph);
    const doctorRefs = nodes.filter(n =>
      hasType(n, 'DiscourseReferent') && (n['rdfs:label']||'').toLowerCase().includes('doctor')
    );
    // May get 1 or 2 DRs depending on pipeline
    expect(doctorRefs.length >= 1).toBeTruthy();
  });

  test('COREF-02: Pronoun "He" after "The doctor" — entity linking', () => {
    const graph = parseToGraph('The doctor treated the patient. He left.', TREE_OPTS);
    const nodes = getNodes(graph);
    // "He" should be extracted as a DR
    const he = nodes.find(n =>
      hasType(n, 'DiscourseReferent') && (n['rdfs:label']||'') === 'He'
    );
    expect(he).toBeTruthy();
  });

  test('COREF-03: Acronym after full name "CBP is part of DHS. CBP enforces laws."', () => {
    const graph = parseToGraph('CBP is part of DHS. CBP enforces laws.', TREE_OPTS);
    const nodes = getNodes(graph);
    const cbpRefs = nodes.filter(n =>
      hasType(n, 'DiscourseReferent') && (n['rdfs:label']||'').includes('CBP')
    );
    expect(cbpRefs.length >= 1).toBeTruthy();
  });

  test('COREF-04: Multi-sentence "The child is hungry. The parent fed the child."', () => {
    const graph = parseToGraph('The child is hungry. The parent fed the child.', TREE_OPTS);
    const nodes = getNodes(graph);
    // Should have QualityAssertion for "hungry" AND EventDescription for "fed"
    const qa = findQA(nodes);
    const ed = findED(nodes, 'feed');
    expect(qa).toBeTruthy();
    expect(ed).toBeTruthy();
  });

  test('COREF-05: Deontic + narrative "Officers must report. The officer reported."', () => {
    const graph = parseToGraph('Officers must report incidents. The officer reported the incident.', TREE_OPTS);
    const nodes = getNodes(graph);
    // Deontic path for first sentence, narrative for second
    const dice = nodes.find(n => hasType(n, 'DirectiveInformationContentEntity'));
    const ed = findED(nodes, 'report');
    expect(dice).toBeTruthy();
    expect(ed).toBeTruthy();
  });

  test('COREF-06: Three-sentence scenario from SMA spec', () => {
    const text = 'Parents must feed their children. The child is hungry. The parent did not feed the child.';
    const graph = parseToGraph(text, TREE_OPTS);
    const nodes = getNodes(graph);
    // Deontic for sentence 1
    const dice = nodes.find(n => hasType(n, 'DirectiveInformationContentEntity'));
    // Stative for sentence 2
    const qa = findQA(nodes);
    // Narrative for sentence 3
    const ed = findED(nodes, 'feed');
    expect(dice).toBeTruthy();
    expect(qa).toBeTruthy();
    expect(ed).toBeTruthy();
  });

  test('COREF-07: Mixed path "The soup is hot. She heated the soup."', () => {
    const graph = parseToGraph('The soup is hot. She heated the soup.', TREE_OPTS);
    const nodes = getNodes(graph);
    const qa = findQA(nodes);
    const ed = findED(nodes, 'heat');
    expect(qa).toBeTruthy();
    expect(ed).toBeTruthy();
  });

  test('COREF-08: Long sentence "The committee shall review and approve the proposal by Friday."', () => {
    const graph = parseToGraph('The committee shall review and approve the proposal by Friday.', TREE_OPTS);
    const nodes = getNodes(graph);
    // Should have ConjunctiveObligation or multiple PlanSpecs
    const pss = nodes.filter(n => hasType(n, 'PlanSpecification'));
    expect(pss.length >= 1).toBeTruthy();
  });

  test('COREF-09: Relative clause "The doctor who treated the patient left."', () => {
    const graph = parseToGraph('The doctor who treated the patient left.', TREE_OPTS);
    const nodes = getNodes(graph);
    // Should produce at least one entity and one act
    expect(nodes.length > 3).toBeTruthy();
  });

  test('COREF-10: Embedded quote "She said the child is hungry."', () => {
    const graph = parseToGraph('She said the child is hungry.', TREE_OPTS);
    const nodes = getNodes(graph);
    expect(nodes.length > 0).toBeTruthy();
  });

});

printSummary();
exit();
