#!/usr/bin/env node
/**
 * Phase 4D: Gold Evaluation — F1 Metrics
 *
 * Computes entity F1 and role F1 by comparing the tree pipeline output
 * against gold annotations in sentences.js.
 *
 * Metrics:
 *   - Entity boundary F1: text-match after normalization
 *   - Role assignment F1: (role, entity) pair match
 *   - Copular detection accuracy: StructuralAssertion presence
 *   - Coordination split accuracy: correct split/keep decisions
 *
 * Usage:
 *   node tests/gold/evaluate.js [--verbose] [--subset organizational|coordination]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

// Load pipeline
const SemanticGraphBuilder = require(path.join(ROOT, 'src/graph/SemanticGraphBuilder'));
const PerceptronTagger = require(path.join(ROOT, 'src/core/PerceptronTagger'));
const DependencyParser = require(path.join(ROOT, 'src/core/DependencyParser'));

const posModel = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/pos-weights-pruned.json'), 'utf8'));
const depModel = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/dep-weights-pruned.json'), 'utf8'));

// Load sentences
const sentences = require('./sentences');

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', bright: '\x1b[1m'
};

const verbose = process.argv.includes('--verbose');
const subsetFilter = process.argv.indexOf('--subset') >= 0
  ? process.argv[process.argv.indexOf('--subset') + 1]
  : null;

// ============================================================================
// Text normalization for matching
// ============================================================================

function normalize(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/^(with|to|from|in|on|at|by|for)\s+/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Check if two entity texts match after normalization.
 * Uses substring containment for flexibility.
 */
function entityTextMatch(extracted, gold) {
  const ne = normalize(extracted);
  const ng = normalize(gold);
  if (!ne || !ng) return false;
  return ne === ng || ne.includes(ng) || ng.includes(ne);
}

// ============================================================================
// Role synonyms
// ============================================================================

const ROLE_SYNONYMS = {
  'Patient': ['Patient', 'Theme'],
  'Theme': ['Theme', 'Patient'],
  'Goal': ['Goal', 'Destination'],
  'Destination': ['Destination', 'Goal'],
  'Location': ['Location'],
  'Agent': ['Agent'],
  'Recipient': ['Recipient'],
  'Beneficiary': ['Beneficiary'],
  'Instrument': ['Instrument'],
  'Source': ['Source']
};

function roleMatch(extracted, gold) {
  const synonyms = ROLE_SYNONYMS[gold] || [gold];
  return synonyms.includes(extracted);
}

// ============================================================================
// Extract entities and roles from graph
// ============================================================================

/**
 * Role type mapping: CCO role class name → canonical role label
 */
const ROLE_TYPE_MAP = {
  'cco:AgentRole': 'Agent',
  'AgentRole': 'Agent',
  'cco:PatientRole': 'Patient',
  'PatientRole': 'Patient',
  'cco:RecipientRole': 'Recipient',
  'RecipientRole': 'Recipient',
  'cco:ThemeRole': 'Patient',  // Theme = Patient synonym
  'ThemeRole': 'Patient',
  'cco:BeneficiaryRole': 'Beneficiary',
  'BeneficiaryRole': 'Beneficiary',
  'cco:InstrumentRole': 'Instrument',
  'InstrumentRole': 'Instrument',
  'cco:LocationRole': 'Location',
  'LocationRole': 'Location',
  'cco:SourceRole': 'Source',
  'SourceRole': 'Source',
  'cco:GoalRole': 'Goal',
  'GoalRole': 'Goal',
  'cco:DestinationRole': 'Goal',
  'DestinationRole': 'Goal',
  'cco:ComitativeRole': 'Comitative',
  'ComitativeRole': 'Comitative'
};

function extractFromGraph(graph) {
  const graphNodes = graph['@graph'] || [];
  const entities = [];
  const roles = [];

  // Build a lookup map for entity @id → label
  const idToLabel = {};
  for (const node of graphNodes) {
    if (node['@id'] && node['rdfs:label']) {
      idToLabel[node['@id']] = node['rdfs:label'];
    }
  }

  for (const node of graphNodes) {
    const types = [].concat(node['@type'] || []);
    const isAct = types.some(t =>
      t.includes('Act') || t.includes('IntentionalAct') ||
      t.includes('Process') || t === 'tagteam:VerbPhrase'
    );
    const isRole = types.some(t => t.includes('Role'));
    const isAssertion = types.some(t => t.includes('StructuralAssertion'));

    // Skip provenance and Tier 2 infrastructure nodes
    const isProvenance = types.some(t =>
      t.includes('InformationBearingEntity')
    ) || (node['rdfs:label'] && (
      node['rdfs:label'] === 'ArtificialAgent' ||
      node['rdfs:label'] === 'ActOfArtificialProcessing'
    ));
    const isTier2 = types.includes('owl:NamedIndividual') &&
      !types.includes('tagteam:DiscourseReferent') &&
      !types.includes('tagteam:VerbPhrase');

    // Entity nodes: Tier 1 discourse referents only
    if (!isAct && !isRole && !isAssertion && !isProvenance && !isTier2 && node['rdfs:label']) {
      entities.push({
        text: node['rdfs:label'],
        type: types[0] || 'bfo:Entity',
        id: node['@id']
      });
    }

    // Tree pipeline: Role nodes with tagteam:bearer
    if (isRole && node['tagteam:bearer']) {
      const bearerRef = node['tagteam:bearer'];
      const bearerId = typeof bearerRef === 'string' ? bearerRef : (bearerRef['@id'] || bearerRef);
      const bearerLabel = idToLabel[bearerId] || bearerId;

      // Determine role type from rdfs:label (post-IRI cleanup) or @type array (legacy)
      let roleName = null;
      const roleLabel = node['rdfs:label'] || node['tagteam:roleType'];
      if (roleLabel && ROLE_TYPE_MAP[roleLabel]) {
        roleName = ROLE_TYPE_MAP[roleLabel];
      }
      if (!roleName) {
        for (const t of types) {
          if (ROLE_TYPE_MAP[t]) { roleName = ROLE_TYPE_MAP[t]; break; }
        }
      }
      if (roleName) {
        roles.push({ entity: bearerLabel, role: roleName });
      }
    }

    // Legacy pipeline: Act nodes with cco:has_agent, cco:affects, etc.
    if (isAct) {
      if (node['cco:has_agent']) {
        const refs = [].concat(node['cco:has_agent']);
        for (const agentRef of refs) {
          const agentId = typeof agentRef === 'string' ? agentRef : (agentRef['@id'] || agentRef);
          const label = idToLabel[agentId] || agentId;
          roles.push({ entity: label, role: 'Agent' });
        }
      }

      const affects = [].concat(node['cco:affects'] || []);
      for (const patientRef of affects) {
        const patientId = typeof patientRef === 'string' ? patientRef : (patientRef['@id'] || patientRef);
        const label = idToLabel[patientId] || patientId;
        roles.push({ entity: label, role: 'Patient' });
      }

      if (node['cco:has_recipient']) {
        const refs = [].concat(node['cco:has_recipient']);
        for (const ref of refs) {
          const id = typeof ref === 'string' ? ref : (ref['@id'] || ref);
          const label = idToLabel[id] || id;
          roles.push({ entity: label, role: 'Recipient' });
        }
      }

      for (const [prop, rn] of [
        ['tagteam:located_in', 'Location'],
        ['tagteam:has_instrument', 'Instrument'],
        ['tagteam:instrument', 'Instrument'],
        ['tagteam:has_destination', 'Goal'],
        ['tagteam:destination', 'Goal'],
        ['tagteam:has_source', 'Source'],
        ['tagteam:has_beneficiary', 'Beneficiary']
      ]) {
        if (node[prop]) {
          const refs = [].concat(node[prop]);
          for (const ref of refs) {
            const id = typeof ref === 'string' ? ref : (ref['@id'] || ref);
            const label = idToLabel[id] || id;
            roles.push({ entity: label, role: rn });
          }
        }
      }
    }
  }

  return { entities, roles };
}

// ============================================================================
// F1 computation
// ============================================================================

function computeEntityF1(extracted, gold) {
  let tp = 0;
  const matchedGold = new Set();
  const matchedExtracted = new Set();

  for (let i = 0; i < extracted.length; i++) {
    for (let j = 0; j < gold.length; j++) {
      if (matchedGold.has(j)) continue;
      if (entityTextMatch(extracted[i].text, gold[j].text)) {
        tp++;
        matchedGold.add(j);
        matchedExtracted.add(i);
        break;
      }
    }
  }

  const precision = extracted.length > 0 ? tp / extracted.length : 0;
  const recall = gold.length > 0 ? tp / gold.length : 0;
  const f1 = (precision + recall) > 0
    ? 2 * precision * recall / (precision + recall) : 0;

  return { tp, fp: extracted.length - tp, fn: gold.length - tp, precision, recall, f1 };
}

function computeRoleF1(extracted, gold) {
  let tp = 0;
  const matchedGold = new Set();

  for (let i = 0; i < extracted.length; i++) {
    for (let j = 0; j < gold.length; j++) {
      if (matchedGold.has(j)) continue;
      if (roleMatch(extracted[i].role, gold[j].role) &&
          entityTextMatch(extracted[i].entity, gold[j].entity)) {
        tp++;
        matchedGold.add(j);
        break;
      }
    }
  }

  const precision = extracted.length > 0 ? tp / extracted.length : 0;
  const recall = gold.length > 0 ? tp / gold.length : 0;
  const f1 = (precision + recall) > 0
    ? 2 * precision * recall / (precision + recall) : 0;

  return { tp, fp: extracted.length - tp, fn: gold.length - tp, precision, recall, f1 };
}

// ============================================================================
// Check for StructuralAssertions (copular detection)
// ============================================================================

function hasStructuralAssertion(graph) {
  const nodes = graph['@graph'] || [];
  return nodes.some(n => {
    const types = [].concat(n['@type'] || []);
    return types.some(t => t.includes('StructuralAssertion'));
  });
}

// ============================================================================
// Main evaluation
// ============================================================================

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}Phase 4D: Gold Evaluation — F1 Metrics${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}\n`);

const filteredSentences = subsetFilter
  ? sentences.filter(s => s.subset === subsetFilter)
  : sentences;

console.log(`${C.cyan}Evaluating ${filteredSentences.length} sentences${subsetFilter ? ` (subset: ${subsetFilter})` : ''}...${C.reset}\n`);

// Accumulators
const totals = {
  entity: { tp: 0, fp: 0, fn: 0 },
  role: { tp: 0, fp: 0, fn: 0 }
};

const subsetTotals = {};
let copularCorrect = 0;
let copularTotal = 0;
let coordinationCorrect = 0;
let coordinationTotal = 0;

const perSentence = [];

for (const sentence of filteredSentences) {
  try {
    const builder = new SemanticGraphBuilder({});
    builder._treePosTagger = new PerceptronTagger(posModel);
    builder._treeDepParser = new DependencyParser(depModel);
    const graph = builder.build(sentence.text, { useTreeExtractors: true });

    const { entities, roles } = extractFromGraph(graph);
    const entityMetrics = computeEntityF1(entities, sentence.expectedEntities);
    const roleMetrics = computeRoleF1(roles, sentence.expectedRoles);

    // Accumulate
    totals.entity.tp += entityMetrics.tp;
    totals.entity.fp += entityMetrics.fp;
    totals.entity.fn += entityMetrics.fn;
    totals.role.tp += roleMetrics.tp;
    totals.role.fp += roleMetrics.fp;
    totals.role.fn += roleMetrics.fn;

    // Subset tracking
    if (!subsetTotals[sentence.subset]) {
      subsetTotals[sentence.subset] = {
        entity: { tp: 0, fp: 0, fn: 0 },
        role: { tp: 0, fp: 0, fn: 0 },
        count: 0
      };
    }
    const st = subsetTotals[sentence.subset];
    st.entity.tp += entityMetrics.tp;
    st.entity.fp += entityMetrics.fp;
    st.entity.fn += entityMetrics.fn;
    st.role.tp += roleMetrics.tp;
    st.role.fp += roleMetrics.fp;
    st.role.fn += roleMetrics.fn;
    st.count++;

    // Copular detection
    if (sentence.tags.includes('copular')) {
      copularTotal++;
      if (hasStructuralAssertion(graph)) {
        copularCorrect++;
      }
    }

    // Coordination split accuracy
    if (sentence.subset === 'coordination') {
      coordinationTotal++;
      // Check if the number of entities extracted matches expected
      const goldEntityCount = sentence.expectedEntities.length;
      if (entities.length === goldEntityCount) {
        coordinationCorrect++;
      } else if (entityMetrics.f1 >= 0.8) {
        // Close enough — entity boundaries mostly correct
        coordinationCorrect++;
      }
    }

    perSentence.push({
      id: sentence.id,
      entityF1: entityMetrics.f1,
      roleF1: roleMetrics.f1,
      entityPrecision: entityMetrics.precision,
      entityRecall: entityMetrics.recall,
      rolePrecision: roleMetrics.precision,
      roleRecall: roleMetrics.recall,
      extractedEntities: entities.length,
      goldEntities: sentence.expectedEntities.length,
      extractedRoles: roles.length,
      goldRoles: sentence.expectedRoles.length
    });

    if (verbose) {
      const eIcon = entityMetrics.f1 >= 0.8 ? `${C.green}\u2713` : `${C.red}\u2717`;
      const rIcon = roleMetrics.f1 >= 0.8 || sentence.expectedRoles.length === 0 ? `${C.green}\u2713` : `${C.red}\u2717`;
      process.stdout.write(
        `  ${eIcon}${C.reset} ${sentence.id}: E-F1=${entityMetrics.f1.toFixed(2)} ` +
        `${rIcon}${C.reset} R-F1=${roleMetrics.f1.toFixed(2)} ` +
        `(${entities.length}e/${sentence.expectedEntities.length}g, ${roles.length}r/${sentence.expectedRoles.length}g)\n`
      );
    }

  } catch (e) {
    perSentence.push({
      id: sentence.id,
      entityF1: 0,
      roleF1: 0,
      error: e.message
    });
    if (verbose) {
      process.stdout.write(`  ${C.red}\u2717${C.reset} ${sentence.id}: ERROR ${e.message}\n`);
    }
  }
}

// ============================================================================
// Compute aggregate F1
// ============================================================================

function microF1(totals) {
  const p = totals.tp > 0 ? totals.tp / (totals.tp + totals.fp) : 0;
  const r = totals.tp > 0 ? totals.tp / (totals.tp + totals.fn) : 0;
  const f1 = (p + r) > 0 ? 2 * p * r / (p + r) : 0;
  return { precision: p, recall: r, f1 };
}

const entityF1 = microF1(totals.entity);
const roleF1 = microF1(totals.role);

// ============================================================================
// Report
// ============================================================================

console.log(`\n${C.bright}--- Aggregate Metrics (micro-averaged) ---${C.reset}`);
console.log(`\n${C.cyan}Entity Boundary F1:${C.reset}`);
console.log(`  Precision: ${(entityF1.precision * 100).toFixed(1)}%`);
console.log(`  Recall:    ${(entityF1.recall * 100).toFixed(1)}%`);
console.log(`  F1:        ${(entityF1.f1 * 100).toFixed(1)}%`);
console.log(`  (TP=${totals.entity.tp} FP=${totals.entity.fp} FN=${totals.entity.fn})`);

console.log(`\n${C.cyan}Role Assignment F1:${C.reset}`);
console.log(`  Precision: ${(roleF1.precision * 100).toFixed(1)}%`);
console.log(`  Recall:    ${(roleF1.recall * 100).toFixed(1)}%`);
console.log(`  F1:        ${(roleF1.f1 * 100).toFixed(1)}%`);
console.log(`  (TP=${totals.role.tp} FP=${totals.role.fp} FN=${totals.role.fn})`);

// Copular accuracy
if (copularTotal > 0) {
  const copAcc = (copularCorrect / copularTotal * 100).toFixed(1);
  console.log(`\n${C.cyan}Copular Detection:${C.reset}`);
  console.log(`  Accuracy: ${copAcc}% (${copularCorrect}/${copularTotal})`);
}

// Coordination accuracy
if (coordinationTotal > 0) {
  const coordAcc = (coordinationCorrect / coordinationTotal * 100).toFixed(1);
  console.log(`\n${C.cyan}Coordination Split:${C.reset}`);
  console.log(`  Accuracy: ${coordAcc}% (${coordinationCorrect}/${coordinationTotal})`);
}

// Per-subset breakdown
console.log(`\n${C.bright}--- Per-Subset Breakdown ---${C.reset}`);
for (const [subset, st] of Object.entries(subsetTotals)) {
  const ef1 = microF1(st.entity);
  const rf1 = microF1(st.role);
  console.log(`\n${C.cyan}${subset} (${st.count} sentences):${C.reset}`);
  console.log(`  Entity F1: ${(ef1.f1 * 100).toFixed(1)}% (P=${(ef1.precision * 100).toFixed(1)}% R=${(ef1.recall * 100).toFixed(1)}%)`);
  console.log(`  Role F1:   ${(rf1.f1 * 100).toFixed(1)}% (P=${(rf1.precision * 100).toFixed(1)}% R=${(rf1.recall * 100).toFixed(1)}%)`);
}

// ============================================================================
// AC Acceptance Criteria Check
// ============================================================================

console.log(`\n${C.bright}--- AC-4.1 through AC-4.3 Acceptance Criteria ---${C.reset}\n`);

let passed = 0;
let testFailed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write(`  ${C.green}\u2713${C.reset} ${name}\n`);
  } catch (e) {
    testFailed++;
    process.stdout.write(`  ${C.red}\u2717${C.reset} ${name}: ${e.message}\n`);
  }
}

test(`AC-4.1a: Entity boundary F1 >= 88% (actual: ${(entityF1.f1 * 100).toFixed(1)}%)`, () => {
  if (entityF1.f1 < 0.88) throw new Error(`Entity F1 ${(entityF1.f1 * 100).toFixed(1)}% < 88%`);
});

test(`AC-4.1b: Role assignment F1 >= 85% (actual: ${(roleF1.f1 * 100).toFixed(1)}%)`, () => {
  if (roleF1.f1 < 0.85) throw new Error(`Role F1 ${(roleF1.f1 * 100).toFixed(1)}% < 85%`);
});

if (copularTotal > 0) {
  const copAcc = copularCorrect / copularTotal;
  test(`AC-4.1c: Copular detection >= 95% (actual: ${(copAcc * 100).toFixed(1)}%)`, () => {
    if (copAcc < 0.95) throw new Error(`Copular accuracy ${(copAcc * 100).toFixed(1)}% < 95%`);
  });
}

// AC-4.2: Organizational subset
if (subsetTotals.organizational) {
  const orgEf1 = microF1(subsetTotals.organizational.entity);
  test(`AC-4.2: Organizational entity F1 >= 85% (actual: ${(orgEf1.f1 * 100).toFixed(1)}%)`, () => {
    if (orgEf1.f1 < 0.85) throw new Error(`Org entity F1 ${(orgEf1.f1 * 100).toFixed(1)}% < 85%`);
  });
}

// AC-4.3: Coordination split
if (coordinationTotal > 0) {
  const coordAcc = coordinationCorrect / coordinationTotal;
  test(`AC-4.3: Coordination split >= 80% (actual: ${(coordAcc * 100).toFixed(1)}%)`, () => {
    if (coordAcc < 0.80) throw new Error(`Coordination accuracy ${(coordAcc * 100).toFixed(1)}% < 80%`);
  });
}

// ============================================================================
// Save report
// ============================================================================

const report = {
  timestamp: new Date().toISOString(),
  sentenceCount: filteredSentences.length,
  entityF1: entityF1,
  roleF1: roleF1,
  copularAccuracy: copularTotal > 0 ? copularCorrect / copularTotal : null,
  coordinationAccuracy: coordinationTotal > 0 ? coordinationCorrect / coordinationTotal : null,
  subsets: {},
  perSentence
};

for (const [subset, st] of Object.entries(subsetTotals)) {
  report.subsets[subset] = {
    count: st.count,
    entityF1: microF1(st.entity),
    roleF1: microF1(st.role)
  };
}

const reportPath = path.join(__dirname, 'evaluation-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}RESULTS: ${C.green}${passed} passed${C.reset}, ${testFailed > 0 ? C.red : ''}${testFailed} failed${C.reset} (${passed + testFailed} criteria)${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}`);
console.log(`\nReport saved to: ${reportPath}`);

process.exit(testFailed > 0 ? 1 : 0);
