/**
 * AC-2.x: Transition-Based Dependency Parser Tests
 *
 * Source: TagTeam-Major-Refactor-v2.2.md §7
 * Authority: UD v2 (Nivre et al. 2020), Goldberg & Nivre 2012
 *
 * Tests cover: arc-eager transition system, copular analysis, passive voice,
 * score margins, entity subtree extraction, apposition, calibration,
 * model provenance, binary export.
 */

'use strict';

const path = require('path');
const fs = require('fs');

// ============================================================================
// Module loading
// ============================================================================

let DependencyParser;
try {
  DependencyParser = require(path.join(__dirname, '../../../src/core/DependencyParser'));
} catch (e) {
  DependencyParser = null;
}

let DepTree;
try {
  DepTree = require(path.join(__dirname, '../../../src/core/DepTree'));
} catch (e) {
  DepTree = null;
}

let BinaryModelLoader;
try {
  BinaryModelLoader = require(path.join(__dirname, '../../../src/core/BinaryModelLoader'));
} catch (e) {
  BinaryModelLoader = null;
}

// Phase 0 dependency: label validation
let LabelConvention;
try {
  LabelConvention = require(path.join(__dirname, '../../../src/core/LabelConvention'));
} catch (e) {
  LabelConvention = null;
}

// ============================================================================
// Fixture model — hand-crafted weights for testing inference logic
// without requiring a trained model.
//
// Target parse for "The doctor treated the patient":
//   T1: SHIFT          stack=[ROOT, The(1)]
//   T2: LEFT-det       arc(The<-doctor, det), stack=[ROOT]
//   T3: SHIFT          stack=[ROOT, doctor(2)]
//   T4: LEFT-nsubj     arc(doctor<-treated, nsubj), stack=[ROOT]
//   T5: SHIFT          stack=[ROOT, treated(3)]
//   T6: SHIFT          stack=[ROOT, treated(3), the(4)]
//   T7: LEFT-det       arc(the<-patient, det), stack=[ROOT, treated(3)]
//   T8: RIGHT-obj      arc(patient->treated, obj), stack=[ROOT, treated(3), patient(5)]
//   T9: REDUCE         pop patient (has head)
//   Final sweep: treated(3) -> head=ROOT, label=root
// ============================================================================

const FIXTURE_MODEL = {
  version: '0.0.1-fixture',
  labelset: 'UD-v2',
  trainedOn: 'fixture',
  provenance: {
    trainCorpus: 'fixture',
    corpusVersion: '0.0.0',
    trainDate: '2026-02-14T00:00:00Z',
    UAS: 0.0,
    LAS: 0.0,
    oracleType: 'dynamic',
    prunedFrom: 0,
    prunedTo: 0
  },
  labels: ['root', 'nsubj', 'obj', 'det', 'amod', 'advmod', 'nmod',
           'case', 'cop', 'iobj', 'obl', 'conj', 'cc', 'mark',
           'nsubj:pass', 'aux:pass', 'obl:agent', 'appos',
           'acl:relcl', 'acl', 'advcl', 'xcomp', 'ccomp',
           'compound', 'flat', 'punct', 'dep'],
  transitions: ['SHIFT', 'REDUCE',
    'LEFT-root', 'LEFT-nsubj', 'LEFT-obj', 'LEFT-det', 'LEFT-amod',
    'LEFT-advmod', 'LEFT-nmod', 'LEFT-case', 'LEFT-cop', 'LEFT-iobj',
    'LEFT-obl', 'LEFT-conj', 'LEFT-cc', 'LEFT-mark',
    'LEFT-nsubj:pass', 'LEFT-aux:pass', 'LEFT-obl:agent', 'LEFT-appos',
    'LEFT-compound', 'LEFT-flat', 'LEFT-punct', 'LEFT-dep',
    'RIGHT-root', 'RIGHT-nsubj', 'RIGHT-obj', 'RIGHT-det', 'RIGHT-amod',
    'RIGHT-advmod', 'RIGHT-nmod', 'RIGHT-case', 'RIGHT-cop', 'RIGHT-iobj',
    'RIGHT-obl', 'RIGHT-conj', 'RIGHT-cc', 'RIGHT-mark',
    'RIGHT-nsubj:pass', 'RIGHT-aux:pass', 'RIGHT-obl:agent', 'RIGHT-appos',
    'RIGHT-compound', 'RIGHT-flat', 'RIGHT-punct', 'RIGHT-dep',
    'LEFT-acl:relcl', 'LEFT-acl', 'LEFT-advcl', 'LEFT-xcomp', 'LEFT-ccomp',
    'RIGHT-acl:relcl', 'RIGHT-acl', 'RIGHT-advcl', 'RIGHT-xcomp', 'RIGHT-ccomp'],
  weights: {
    // Feature names match DependencyParser._getFeatures() combined feature format:
    //   's0_tag+b0_tag=VALUE1+VALUE2'  (NOT 's0_tag=V1+b0_tag=V2')
    'bias': { 'SHIFT': 0.1 },

    // T1: s0=ROOT, b0=The(DT) -> SHIFT
    's0_tag+b0_tag=ROOT+DT': { 'SHIFT': 5.0 },

    // T2 & T7: s0=DT, b0=NN -> LEFT-det (same tag pattern for both determiners)
    's0_tag+b0_tag=DT+NN': { 'LEFT-det': 5.0 },

    // T3: s0=ROOT, b0=doctor(NN) -> SHIFT
    's0_tag+b0_tag=ROOT+NN': { 'SHIFT': 5.0 },

    // T4: s0=doctor(NN), b0=treated(VBD) -> LEFT-nsubj
    's0_tag+b0_tag=NN+VBD': { 'LEFT-nsubj': 5.0 },

    // T5: s0=ROOT, b0=treated(VBD) -> SHIFT
    's0_tag+b0_tag=ROOT+VBD': { 'SHIFT': 5.0 },

    // T6: s0=treated(VBD), b0=the(DT) -> SHIFT (push DT to LEFT-det with patient)
    's0_tag+b0_tag=VBD+DT': { 'SHIFT': 3.0 },

    // T8: s0=treated(VBD), b0=patient(NN) -> RIGHT-obj
    's0_tag+b0_tag=VBD+NN': { 'RIGHT-obj': 5.0 },

    // T9: s0=patient (has head), buffer empty -> REDUCE
    's0_has_head+b_empty': { 'REDUCE': 5.0 },

    // treated(3) gets root via final sweep (no weight needed)
  }
};

// ============================================================================
// Test runner
// ============================================================================

let passed = 0;
let failed = 0;
let skipped = 0;
let errors = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
  } else {
    failed++;
    errors.push(message);
    console.log(`  \x1b[31m✗\x1b[0m ${message}`);
  }
}

function skip(message) {
  skipped++;
  console.log(`  \x1b[33m⊘\x1b[0m ${message} (SKIPPED)`);
}

function section(name) {
  console.log(`\n\x1b[1m${name}\x1b[0m`);
}

// ============================================================================
// Helper: find arc by dependent index
// ============================================================================

function findArc(arcs, depIdx) {
  return arcs.find(a => a.dependent === depIdx);
}

function findArcByLabel(arcs, label) {
  return arcs.filter(a => a.label === label);
}

// ============================================================================
// Tests
// ============================================================================

section('Prerequisites');

assert(DependencyParser !== null, 'DependencyParser module loads');
assert(DepTree !== null, 'DepTree module loads');
assert(LabelConvention !== null, 'LabelConvention module loads (Phase 0 dependency)');

if (!DependencyParser || !DepTree) {
  console.log('\n\x1b[31mCannot continue: core modules not loaded\x1b[0m');
  console.log(`\n\x1b[1mResults\x1b[0m`);
  console.log(`  Passed:  ${passed}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total:   ${passed + failed + skipped}`);
  process.exit(failed > 0 ? 1 : 0);
}

// ============================================================================
// AC-2.2: Arc-Eager Transition System
// ============================================================================

section('AC-2.2: Arc-Eager Transition System');

{
  const parser = new DependencyParser(FIXTURE_MODEL);
  const tokens = ['The', 'doctor', 'treated', 'the', 'patient'];
  const tags = ['DT', 'NN', 'VBD', 'DT', 'NN'];
  const result = parser.parse(tokens, tags);

  assert(result && Array.isArray(result.arcs), 'parse() returns object with arcs array');
  assert(result.arcs.length === 5, `Expected 5 arcs, got ${result.arcs.length}`);

  // "The"(1) ← "doctor"(2) : det
  const arc1 = findArc(result.arcs, 1);
  assert(arc1 && arc1.head === 2 && arc1.label === 'det',
    `"The"(1) has head=doctor(2), label=det (got head=${arc1 && arc1.head}, label=${arc1 && arc1.label})`);

  // "doctor"(2) ← "treated"(3) : nsubj
  const arc2 = findArc(result.arcs, 2);
  assert(arc2 && arc2.head === 3 && arc2.label === 'nsubj',
    `"doctor"(2) has head=treated(3), label=nsubj (got head=${arc2 && arc2.head}, label=${arc2 && arc2.label})`);

  // "the"(4) ← "patient"(5) : det
  const arc4 = findArc(result.arcs, 4);
  assert(arc4 && arc4.head === 5 && arc4.label === 'det',
    `"the"(4) has head=patient(5), label=det (got head=${arc4 && arc4.head}, label=${arc4 && arc4.label})`);

  // "patient"(5) ← "treated"(3) : obj
  const arc5 = findArc(result.arcs, 5);
  assert(arc5 && arc5.head === 3 && arc5.label === 'obj',
    `"patient"(5) has head=treated(3), label=obj (got head=${arc5 && arc5.head}, label=${arc5 && arc5.label})`);

  // "treated"(3) ← ROOT(0) : root
  const arc3 = findArc(result.arcs, 3);
  assert(arc3 && arc3.head === 0 && arc3.label === 'root',
    `"treated"(3) has head=ROOT(0), label=root (got head=${arc3 && arc3.head}, label=${arc3 && arc3.label})`);
}

// ============================================================================
// AC-2.2b: All output labels are valid UD v2 (uses Phase 0 LabelConvention)
// ============================================================================

section('AC-2.2b: Output Labels are Valid UD v2');

{
  const parser = new DependencyParser(FIXTURE_MODEL);
  const tokens = ['The', 'doctor', 'treated', 'the', 'patient'];
  const tags = ['DT', 'NN', 'VBD', 'DT', 'NN'];
  const result = parser.parse(tokens, tags);

  if (LabelConvention) {
    let allValid = true;
    for (const arc of result.arcs) {
      if (!LabelConvention.isValidUDLabel(arc.label)) {
        allValid = false;
        console.log(`    Invalid label: ${arc.label}`);
      }
    }
    assert(allValid, 'All output arc labels are valid UD v2 labels');
  } else {
    skip('LabelConvention not available for label validation');
  }
}

// ============================================================================
// AC-2.3: Copular Sentence Parse (requires trained model)
// ============================================================================

section('AC-2.3: Copular Sentence Parse');

{
  // Check if trained model is available
  const modelPath = path.join(__dirname, '../../../training/models/dep-weights-pruned.json');
  if (fs.existsSync(modelPath)) {
    const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    const parser = new DependencyParser(model);
    // "CBP is a component of DHS"
    const tokens = ['CBP', 'is', 'a', 'component', 'of', 'DHS'];
    const tags = ['NNP', 'VBZ', 'DT', 'NN', 'IN', 'NNP'];
    const result = parser.parse(tokens, tags);

    // root = "component" (NOT "is")
    const rootArcs = findArcByLabel(result.arcs, 'root');
    assert(rootArcs.length === 1 && rootArcs[0].dependent === 4,
      `Root is "component"(4) (got dep=${rootArcs[0] && rootArcs[0].dependent})`);

    // "is" has label "cop" headed by "component"
    const isArc = findArc(result.arcs, 2);
    assert(isArc && isArc.head === 4 && isArc.label === 'cop',
      `"is"(2) has head=component(4), label=cop (got head=${isArc && isArc.head}, label=${isArc && isArc.label})`);

    // "CBP" has label "nsubj" headed by "component"
    const cbpArc = findArc(result.arcs, 1);
    assert(cbpArc && cbpArc.head === 4 && cbpArc.label === 'nsubj',
      `"CBP"(1) has head=component(4), label=nsubj`);

    // "a" has label "det" headed by "component"
    const aArc = findArc(result.arcs, 3);
    assert(aArc && aArc.head === 4 && aArc.label === 'det',
      `"a"(3) has head=component(4), label=det`);

    // "DHS" has label "nmod" headed by "component"
    const dhsArc = findArc(result.arcs, 6);
    assert(dhsArc && dhsArc.head === 4 && dhsArc.label === 'nmod',
      `"DHS"(6) has head=component(4), label=nmod`);

    // "of" has label "case" headed by "DHS"
    const ofArc = findArc(result.arcs, 5);
    assert(ofArc && ofArc.head === 6 && ofArc.label === 'case',
      `"of"(5) has head=DHS(6), label=case`);
  } else {
    skip('AC-2.3: Copular parse (requires trained model)');
    skip('AC-2.3: "is" has label cop');
    skip('AC-2.3: "CBP" has label nsubj');
    skip('AC-2.3: "a" has label det');
    skip('AC-2.3: "DHS" has label nmod');
    skip('AC-2.3: "of" has label case');
  }
}

// ============================================================================
// AC-2.4: Passive Voice Parse (requires trained model)
// ============================================================================

section('AC-2.4: Passive Voice Parse');

{
  const modelPath = path.join(__dirname, '../../../training/models/dep-weights-pruned.json');
  if (fs.existsSync(modelPath)) {
    const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    const parser = new DependencyParser(model);
    // "The patient was treated by the doctor"
    const tokens = ['The', 'patient', 'was', 'treated', 'by', 'the', 'doctor'];
    const tags = ['DT', 'NN', 'VBD', 'VBN', 'IN', 'DT', 'NN'];
    const result = parser.parse(tokens, tags);

    // "patient" has label "nsubj:pass"
    const patientArc = findArc(result.arcs, 2);
    assert(patientArc && patientArc.label === 'nsubj:pass',
      `"patient"(2) has label=nsubj:pass (got ${patientArc && patientArc.label})`);

    // "was" has label "aux:pass"
    const wasArc = findArc(result.arcs, 3);
    assert(wasArc && wasArc.label === 'aux:pass',
      `"was"(3) has label=aux:pass (got ${wasArc && wasArc.label})`);

    // "doctor" has label "obl" (with "by" as case child) or "obl:agent"
    const doctorArc = findArc(result.arcs, 7);
    const byArc = findArc(result.arcs, 5);
    const isOblAgent = doctorArc && (
      doctorArc.label === 'obl:agent' ||
      (doctorArc.label === 'obl' && byArc && byArc.head === 7 && byArc.label === 'case')
    );
    assert(isOblAgent,
      `"doctor"(7) has label=obl:agent or obl with "by" as case child`);
  } else {
    skip('AC-2.4: Passive voice nsubj:pass (requires trained model)');
    skip('AC-2.4: Passive voice aux:pass (requires trained model)');
    skip('AC-2.4: Passive voice obl:agent (requires trained model)');
  }
}

// ============================================================================
// AC-2.5: Score Margin Tracking
// ============================================================================

section('AC-2.5: Score Margin Tracking');

{
  const parser = new DependencyParser(FIXTURE_MODEL);
  const tokens = ['The', 'doctor', 'treated', 'the', 'patient'];
  const tags = ['DT', 'NN', 'VBD', 'DT', 'NN'];
  const result = parser.parse(tokens, tags);

  // Each arc has a scoreMargin property
  const allHaveMargin = result.arcs.every(a => typeof a.scoreMargin === 'number');
  assert(allHaveMargin, 'Every arc has a numeric scoreMargin property');

  // scoreMargin = best - second_best (so always ≥ 0)
  const allNonNeg = result.arcs.every(a => a.scoreMargin >= 0);
  assert(allNonNeg, 'All scoreMargins are non-negative');
}

// ============================================================================
// AC-2.6: DepTree Utility — Entity Subtree Extraction
// ============================================================================

section('AC-2.6: DepTree — Entity Subtree Extraction');

{
  // "the allegedly corrupt senior official"
  // Manually constructed parse tree:
  // official(5) ← ROOT: root
  // the(1) ← official(5): det
  // allegedly(2) ← corrupt(3): advmod
  // corrupt(3) ← official(5): amod
  // senior(4) ← official(5): amod
  const arcs1 = [
    { dependent: 1, head: 5, label: 'det', scoreMargin: 2.0 },
    { dependent: 2, head: 3, label: 'advmod', scoreMargin: 2.0 },
    { dependent: 3, head: 5, label: 'amod', scoreMargin: 2.0 },
    { dependent: 4, head: 5, label: 'amod', scoreMargin: 2.0 },
    { dependent: 5, head: 0, label: 'root', scoreMargin: 2.0 },
  ];
  const tokens1 = ['the', 'allegedly', 'corrupt', 'senior', 'official'];
  const tags1 = ['DT', 'RB', 'JJ', 'JJ', 'NN'];

  const tree1 = new DepTree(arcs1, tokens1, tags1);
  const subtree1 = tree1.getEntitySubtree(5);

  assert(subtree1.tokens.length === 5,
    `Subtree of "official" includes all 5 tokens (got ${subtree1.tokens.length})`);
  assert(subtree1.tokens.includes('the') && subtree1.tokens.includes('allegedly') &&
         subtree1.tokens.includes('corrupt') && subtree1.tokens.includes('senior') &&
         subtree1.tokens.includes('official'),
    'Subtree includes: the, allegedly, corrupt, senior, official');

  // "the doctor who treated the patient"
  // doctor(2) ← ROOT: root
  // the(1) ← doctor(2): det
  // treated(4) ← doctor(2): acl:relcl
  // who(3) ← treated(4): nsubj
  // the(5) ← patient(6): det
  // patient(6) ← treated(4): obj
  const arcs2 = [
    { dependent: 1, head: 2, label: 'det', scoreMargin: 2.0 },
    { dependent: 2, head: 0, label: 'root', scoreMargin: 2.0 },
    { dependent: 3, head: 4, label: 'nsubj', scoreMargin: 2.0 },
    { dependent: 4, head: 2, label: 'acl:relcl', scoreMargin: 2.0 },
    { dependent: 5, head: 6, label: 'det', scoreMargin: 2.0 },
    { dependent: 6, head: 4, label: 'obj', scoreMargin: 2.0 },
  ];
  const tokens2 = ['the', 'doctor', 'who', 'treated', 'the', 'patient'];
  const tags2 = ['DT', 'NN', 'WP', 'VBD', 'DT', 'NN'];

  const tree2 = new DepTree(arcs2, tokens2, tags2);
  const subtree2 = tree2.getEntitySubtree(2);

  assert(subtree2.tokens.length === 2,
    `Subtree of "doctor" includes 2 tokens, NOT rel clause (got ${subtree2.tokens.length})`);
  assert(subtree2.tokens.includes('the') && subtree2.tokens.includes('doctor'),
    'Subtree includes: the, doctor');
  assert(!subtree2.tokens.includes('who') && !subtree2.tokens.includes('treated'),
    'Subtree excludes acl:relcl dependents: who, treated');
}

// ============================================================================
// AC-2.6b: Excluded labels list
// ============================================================================

section('AC-2.6b: Entity Subtree Excluded Labels');

{
  // Verify that the excluded labels set contains required labels
  assert(DepTree.ENTITY_SUBTREE_EXCLUDED_LABELS !== undefined,
    'DepTree.ENTITY_SUBTREE_EXCLUDED_LABELS is defined');

  const excluded = DepTree.ENTITY_SUBTREE_EXCLUDED_LABELS || new Set();
  assert(excluded.has('acl:relcl'), 'Excluded: acl:relcl');
  assert(excluded.has('acl'), 'Excluded: acl');
  assert(excluded.has('advcl'), 'Excluded: advcl');
  assert(excluded.has('cop'), 'Excluded: cop');
  assert(excluded.has('punct'), 'Excluded: punct');
}

// ============================================================================
// AC-2.7: DepTree Utility — Apposition Extraction
// ============================================================================

section('AC-2.7: DepTree — Apposition Extraction');

{
  // "Customs and Border Protection (CBP)"
  // Parse (simplified):
  // Customs(1) ← ROOT: root (or head of flat)
  // and(2) ← Customs(1): cc
  // Border(3) ← Customs(1): conj (or flat)
  // Protection(4) ← Customs(1): flat
  // ((5) ← CBP(6): punct
  // CBP(6) ← Customs(1): appos
  // )(7) ← CBP(6): punct
  // Actually for "Customs and Border Protection", UD treats it as flat:
  // Protection(4) ← ROOT: root (head is rightmost in UD for flat names? or leftmost?)
  // Let me use a simpler but correct approach:
  // Head = Protection(4), flat dependents = Customs(1), and(2), Border(3)
  // appos = CBP(6)
  const arcs = [
    { dependent: 1, head: 4, label: 'flat', scoreMargin: 2.0 },
    { dependent: 2, head: 4, label: 'cc', scoreMargin: 2.0 },
    { dependent: 3, head: 4, label: 'flat', scoreMargin: 2.0 },
    { dependent: 4, head: 0, label: 'root', scoreMargin: 2.0 },
    { dependent: 5, head: 6, label: 'punct', scoreMargin: 2.0 },
    { dependent: 6, head: 4, label: 'appos', scoreMargin: 2.0 },
    { dependent: 7, head: 6, label: 'punct', scoreMargin: 2.0 },
  ];
  const tokens = ['Customs', 'and', 'Border', 'Protection', '(', 'CBP', ')'];
  const tags = ['NNP', 'CC', 'NNP', 'NNP', '-LRB-', 'NNP', '-RRB-'];

  const tree = new DepTree(arcs, tokens, tags);
  const appositions = tree.getAppositions(4);

  assert(appositions.length === 1, `1 apposition found (got ${appositions.length})`);
  assert(appositions[0] === 'CBP', `Apposition alias is "CBP" (got "${appositions[0]}")`);

  // Main entity span should NOT include "(CBP)"
  const mainSpan = tree.getEntitySubtree(4);
  assert(!mainSpan.tokens.includes('CBP'),
    'Main entity span excludes apposition "CBP"');
  assert(!mainSpan.tokens.includes('(') && !mainSpan.tokens.includes(')'),
    'Main entity span excludes parentheses');
}

// ============================================================================
// AC-2.9: Confidence Calibration (requires trained model + calibration table)
// ============================================================================

section('AC-2.9: Confidence Calibration');

{
  const calibPath = path.join(__dirname, '../../../training/models/dep-calibration.json');
  if (fs.existsSync(calibPath)) {
    const calibration = JSON.parse(fs.readFileSync(calibPath, 'utf8'));

    assert(calibration.bins && calibration.bins.length >= 5,
      `Calibration table has ≥5 bins (got ${calibration.bins ? calibration.bins.length : 0})`);

    // Monotonic: P(correct | margin=low) < P(correct | margin=high)
    if (calibration.bins && calibration.bins.length >= 2) {
      let isMonotonic = true;
      for (let i = 1; i < calibration.bins.length; i++) {
        if (calibration.bins[i].probability < calibration.bins[i - 1].probability) {
          isMonotonic = false;
          break;
        }
      }
      assert(isMonotonic, 'Calibration probabilities are monotonically increasing');
    }

    // Lookup function: margin → probability
    const parser = new DependencyParser(FIXTURE_MODEL);
    if (typeof parser.getCalibratedProbability === 'function') {
      const pLow = parser.getCalibratedProbability(0.3, calibration);
      const pHigh = parser.getCalibratedProbability(100.0, calibration);
      assert(typeof pLow === 'number' && pLow >= 0 && pLow <= 1,
        `P(correct | margin=0.3) is valid probability (got ${pLow})`);
      assert(pLow < pHigh,
        `P(correct | margin=0.3) < P(correct | margin=100.0): ${pLow} < ${pHigh}`);
    } else {
      skip('getCalibratedProbability method not implemented');
    }
  } else {
    skip('AC-2.9: Calibration table (requires trained model)');
    skip('AC-2.9: Monotonic calibration (requires trained model)');
  }
}

// ============================================================================
// AC-2.10: Model Size Budget (requires trained model)
// ============================================================================

section('AC-2.10: Model Size Budget');

{
  const modelPath = path.join(__dirname, '../../../training/models/dep-weights-pruned.json');
  if (fs.existsSync(modelPath)) {
    const stats = fs.statSync(modelPath);
    const sizeMB = stats.size / (1024 * 1024);
    assert(sizeMB <= 5.0, `Pruned model ≤ 5 MB (got ${sizeMB.toFixed(2)} MB)`);
  } else {
    skip('AC-2.10: Model size (requires trained model)');
  }
}

// ============================================================================
// AC-2.11: Binary Model Export (requires trained model)
// ============================================================================

section('AC-2.11: Binary Model Export');

{
  const binPath = path.join(__dirname, '../../../training/models/dep-weights-pruned.bin');
  if (fs.existsSync(binPath)) {
    const buf = fs.readFileSync(binPath);

    // Magic number "TT01"
    assert(buf.slice(0, 4).toString('ascii') === 'TT01',
      'Binary model starts with magic number "TT01"');

    // Endianness flag byte 6 = 0x00 (little-endian)
    assert(buf[6] === 0x00,
      'Endianness flag is 0x00 (little-endian)');

    // Model type byte 7 = 0x02 (dependency parser)
    assert(buf[7] === 0x02,
      'Model type flag is 0x02 (dependency parser)');

    // SHA-256 checksum (bytes 32-63)
    if (BinaryModelLoader) {
      const isValid = BinaryModelLoader.verifyChecksum(buf);
      assert(isValid, 'SHA-256 checksum is valid');
    } else {
      skip('BinaryModelLoader not available for checksum verification');
    }

    // Binary file size < JSON file size
    const jsonPath = path.join(__dirname, '../../../training/models/dep-weights-pruned.json');
    if (fs.existsSync(jsonPath)) {
      const jsonSize = fs.statSync(jsonPath).size;
      const binSize = buf.length;
      assert(binSize < jsonSize,
        `Binary (${(binSize / 1024).toFixed(0)} KB) < JSON (${(jsonSize / 1024).toFixed(0)} KB)`);
    } else {
      skip('JSON model not available for size comparison');
    }
  } else {
    skip('AC-2.11: Binary magic number (requires trained model)');
    skip('AC-2.11: Binary endianness (requires trained model)');
    skip('AC-2.11: Binary model type (requires trained model)');
    skip('AC-2.11: Binary checksum (requires trained model)');
    skip('AC-2.11: Binary < JSON size (requires trained model)');
  }
}

// ============================================================================
// AC-2.12: Dependency Model Provenance Fields (requires trained model)
// ============================================================================

section('AC-2.12: Model Provenance Fields');

{
  const modelPath = path.join(__dirname, '../../../training/models/dep-weights-pruned.json');
  if (fs.existsSync(modelPath)) {
    const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));

    assert(model.provenance !== undefined, 'Model has provenance object');
    const p = model.provenance || {};

    assert(p.trainCorpus === 'UD_English-EWT',
      `trainCorpus is "UD_English-EWT" (got "${p.trainCorpus}")`);
    assert(typeof p.corpusVersion === 'string' && p.corpusVersion.length > 0,
      `corpusVersion is non-empty string (got "${p.corpusVersion}")`);
    assert(typeof p.trainDate === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(p.trainDate),
      `trainDate is ISO-8601 (got "${p.trainDate}")`);
    assert(typeof p.UAS === 'number' && p.UAS >= 0.90,
      `UAS ≥ 0.90 (got ${p.UAS})`);
    assert(typeof p.LAS === 'number' && p.LAS >= 0.88,
      `LAS ≥ 0.88 (got ${p.LAS})`);
    assert(p.oracleType === 'dynamic',
      `oracleType is "dynamic" (got "${p.oracleType}")`);
    assert(typeof p.prunedFrom === 'number',
      `prunedFrom is a number (got ${typeof p.prunedFrom})`);
    assert(typeof p.prunedTo === 'number',
      `prunedTo is a number (got ${typeof p.prunedTo})`);
  } else {
    skip('AC-2.12: Provenance fields (requires trained model)');
  }
}

// ============================================================================
// AC-2.1: Parse Accuracy on UD-EWT Test Set (requires trained model + test data)
// ============================================================================

section('AC-2.1: Parse Accuracy on UD-EWT Test Set');

{
  const modelPath = path.join(__dirname, '../../../training/models/dep-weights-pruned.json');
  const testFile = path.join(__dirname, '../../../training/data/UD_English-EWT/en_ewt-ud-test.conllu');

  if (fs.existsSync(modelPath) && fs.existsSync(testFile)) {
    // Load model and test data
    const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    const parser = new DependencyParser(model);

    // Parse CoNLL-U test file
    const content = fs.readFileSync(testFile, 'utf8');
    const sentences = parseConllu(content);

    let totalArcs = 0;
    let correctHead = 0; // UAS
    let correctHeadLabel = 0; // LAS

    for (const sent of sentences) {
      const result = parser.parse(sent.tokens, sent.tags);
      for (const arc of result.arcs) {
        totalArcs++;
        const goldArc = sent.arcs.find(g => g.dependent === arc.dependent);
        if (goldArc) {
          if (arc.head === goldArc.head) {
            correctHead++;
            if (arc.label === goldArc.label) {
              correctHeadLabel++;
            }
          }
        }
      }
    }

    const uas = totalArcs > 0 ? correctHead / totalArcs : 0;
    const las = totalArcs > 0 ? correctHeadLabel / totalArcs : 0;

    assert(uas >= 0.90,
      `UAS ≥ 90% on UD-EWT test (got ${(uas * 100).toFixed(1)}%)`);
    assert(las >= 0.88,
      `LAS ≥ 88% on UD-EWT test (got ${(las * 100).toFixed(1)}%)`);
  } else {
    skip('AC-2.1: UAS ≥ 90% (requires trained model + UD-EWT test data)');
    skip('AC-2.1: LAS ≥ 88% (requires trained model + UD-EWT test data)');
  }
}

// ============================================================================
// Structural tests (always run with fixture model)
// ============================================================================

section('Structural: Parser API Contract');

{
  const parser = new DependencyParser(FIXTURE_MODEL);

  // parse() returns { arcs, confidences } or similar
  assert(typeof parser.parse === 'function', 'Parser has parse() method');

  const result = parser.parse(['Hello'], ['UH']);
  assert(result && typeof result === 'object', 'parse() returns an object');
  assert(Array.isArray(result.arcs), 'Result has arcs array');

  // Each arc has required properties
  if (result.arcs.length > 0) {
    const arc = result.arcs[0];
    assert(typeof arc.dependent === 'number', 'Arc has numeric dependent');
    assert(typeof arc.head === 'number', 'Arc has numeric head');
    assert(typeof arc.label === 'string', 'Arc has string label');
    assert(typeof arc.scoreMargin === 'number', 'Arc has numeric scoreMargin');
  }
}

section('Structural: DepTree API Contract');

{
  const arcs = [
    { dependent: 1, head: 2, label: 'det', scoreMargin: 2.0 },
    { dependent: 2, head: 0, label: 'root', scoreMargin: 2.0 },
  ];
  const tree = new DepTree(arcs, ['the', 'doctor'], ['DT', 'NN']);

  assert(typeof tree.getEntitySubtree === 'function', 'DepTree has getEntitySubtree() method');
  assert(typeof tree.getAppositions === 'function', 'DepTree has getAppositions() method');

  // getEntitySubtree returns { tokens: [...], indices: [...] }
  const sub = tree.getEntitySubtree(2);
  assert(sub && Array.isArray(sub.tokens), 'getEntitySubtree returns object with tokens array');
  assert(sub && Array.isArray(sub.indices), 'getEntitySubtree returns object with indices array');
}

// ============================================================================
// CoNLL-U parser helper (for AC-2.1 evaluation)
// ============================================================================

function parseConllu(content) {
  const sentences = [];
  let currentTokens = [];
  let currentTags = [];
  let currentArcs = [];

  for (const line of content.split('\n')) {
    if (line.startsWith('#') || line.trim() === '') {
      if (line.trim() === '' && currentTokens.length > 0) {
        sentences.push({
          tokens: currentTokens,
          tags: currentTags,
          arcs: currentArcs
        });
        currentTokens = [];
        currentTags = [];
        currentArcs = [];
      }
      continue;
    }
    const fields = line.split('\t');
    if (fields.length < 10) continue;
    // Skip multi-word tokens (e.g., "1-2")
    if (fields[0].includes('-') || fields[0].includes('.')) continue;

    const id = parseInt(fields[0]);
    const word = fields[1];
    const xpos = fields[4]; // PTB tag
    const head = parseInt(fields[6]);
    const deprel = fields[7];

    currentTokens.push(word);
    currentTags.push(xpos);
    currentArcs.push({ dependent: id, head: head, label: deprel });
  }

  // Handle last sentence if file doesn't end with newline
  if (currentTokens.length > 0) {
    sentences.push({
      tokens: currentTokens,
      tags: currentTags,
      arcs: currentArcs
    });
  }

  return sentences;
}

// ============================================================================
// Results
// ============================================================================

console.log(`\n\x1b[1mResults\x1b[0m`);
console.log(`  Passed:  ${passed}`);
console.log(`  Failed:  ${failed}`);
console.log(`  Skipped: ${skipped}`);
console.log(`  Total:   ${passed + failed + skipped}`);

if (errors.length > 0) {
  console.log(`\n\x1b[31mFailures:\x1b[0m`);
  for (const e of errors) {
    console.log(`  - ${e}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
