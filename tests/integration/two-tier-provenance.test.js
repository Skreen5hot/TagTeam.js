#!/usr/bin/env node
/**
 * Two-Tier ICE + Provenance Verification Tests
 *
 * Validates that the tree pipeline produces:
 *   - Tier 1: tagteam:DiscourseReferent (linguistic mention / ICE)
 *   - Tier 2: Person, Organization, Artifact (real-world entity)
 *   - Provenance: IBE, ArtificialAgent, ActOfArtificialProcessing
 *
 * Authority: TagTeam-Major-Refactor-v2.2.md §11, BFO 2.0, CCO v1.5
 *
 * Usage:
 *   node tests/integration/two-tier-provenance.test.js
 *   npm run test:two-tier
 */

'use strict';

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '../..');

// Load pipeline
const SemanticGraphBuilder = require(path.join(ROOT, 'src/graph/SemanticGraphBuilder'));
const PerceptronTagger = require(path.join(ROOT, 'src/core/PerceptronTagger'));
const DependencyParser = require(path.join(ROOT, 'src/core/DependencyParser'));

const posModel = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/pos-weights-pruned.json'), 'utf8'));
const depModel = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/dep-weights-pruned.json'), 'utf8'));

// ============================================================================
// Test infrastructure
// ============================================================================

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  cyan: '\x1b[36m', bright: '\x1b[1m', dim: '\x1b[2m'
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write(`  ${C.green}\u2713${C.reset} ${name}\n`);
  } catch (e) {
    failed++;
    process.stdout.write(`  ${C.red}\u2717${C.reset} ${name}: ${e.message}\n`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function buildTreeGraph(text) {
  const builder = new SemanticGraphBuilder({});
  builder._treePosTagger = new PerceptronTagger(posModel);
  builder._treeDepParser = new DependencyParser(depModel);
  return builder.build(text, { useTreeExtractors: true });
}

function getNodes(graph) {
  return graph['@graph'] || [];
}

function findByType(nodes, typeFragment) {
  return nodes.filter(n => {
    const types = [].concat(n['@type'] || []);
    return types.some(t => t.includes(typeFragment));
  });
}

function findByLabel(nodes, label) {
  return nodes.filter(n => n['rdfs:label'] === label);
}

function findParsingAgent(nodes) {
  return nodes.filter(n => {
    const id = n['@id'] || '';
    const types = [].concat(n['@type'] || []);
    return id.includes('Parser') && types.includes('Agent');
  });
}

function findParsingAct(nodes) {
  return nodes.filter(n => {
    const id = n['@id'] || '';
    const types = [].concat(n['@type'] || []);
    return id.includes('ParsingAct') && types.includes('IntentionalAct');
  });
}

function findTier1(nodes) {
  return nodes.filter(n => {
    const types = [].concat(n['@type'] || []);
    return types.includes('tagteam:DiscourseReferent');
  });
}

function findTier2(nodes) {
  return nodes.filter(n => {
    const types = [].concat(n['@type'] || []);
    const id = n['@id'] || '';
    return types.includes('owl:NamedIndividual') &&
      !types.includes('tagteam:DiscourseReferent') &&
      !types.includes('tagteam:VerbPhrase') &&
      !types.some(t => t.includes('InformationBearingEntity')) &&
      !id.includes('Parser') && !id.includes('ParsingAct');
  });
}

// ============================================================================
// Test sentences
// ============================================================================

const SENTENCES = {
  svo: 'The FBI investigated the case.',
  passive: 'The patient was treated by the doctor.',
  copular: 'CBP is a component of DHS.',
  ditransitive: 'The nurse gave the patient medication.',
  oblique: 'The doctor treated the patient with antibiotics.',
};

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}Two-Tier ICE + Provenance Verification${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}\n`);

// ============================================================================
// 1. Tier 1: DiscourseReferent marking
// ============================================================================

console.log(`${C.cyan}--- Tier 1: DiscourseReferent ---${C.reset}`);

test('Entity nodes have tagteam:DiscourseReferent in @type', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const nodes = getNodes(graph);
  const tier1 = findTier1(nodes);
  assert(tier1.length >= 2, `Expected >= 2 DiscourseReferents, got ${tier1.length}`);
});

test('Entity nodes have tagteam:denotesType set', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const tier1 = findTier1(getNodes(graph));
  for (const node of tier1) {
    assert(node['tagteam:denotesType'], `Node ${node['@id']} missing tagteam:denotesType`);
  }
});

test('Act nodes are NOT marked as DiscourseReferent', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const acts = findByType(getNodes(graph), 'IntentionalAct');
  for (const act of acts) {
    const types = [].concat(act['@type'] || []);
    assert(!types.includes('tagteam:DiscourseReferent'),
      `Act ${act['@id']} should not be DiscourseReferent`);
  }
});

// ============================================================================
// 2. Tier 2: Real-world entities
// ============================================================================

console.log(`\n${C.cyan}--- Tier 2: Real-World Entities ---${C.reset}`);

test('Tier 2 entities exist with owl:NamedIndividual', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const tier2 = findTier2(getNodes(graph));
  assert(tier2.length >= 1, `Expected >= 1 Tier 2 entity, got ${tier2.length}`);
  for (const node of tier2) {
    const types = [].concat(node['@type'] || []);
    assert(types.includes('owl:NamedIndividual'), `Tier 2 node ${node['@id']} missing owl:NamedIndividual`);
  }
});

test('Tier 1 nodes link to Tier 2 via is_about', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const nodes = getNodes(graph);
  const tier1 = findTier1(nodes);
  const tier2IRIs = new Set(findTier2(nodes).map(n => n['@id']));

  let linked = 0;
  for (const node of tier1) {
    if (node['is_about']) {
      const ref = node['is_about'];
      const iri = typeof ref === 'object' ? ref['@id'] : ref;
      assert(tier2IRIs.has(iri), `is_about points to ${iri} which is not a Tier 2 node`);
      linked++;
    }
  }
  assert(linked >= 1, `Expected >= 1 Tier 1 node linked to Tier 2, got ${linked}`);
});

test('Organization entity maps to Organization Tier 2', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const nodes = getNodes(graph);
  const fbi = nodes.find(n => (n['rdfs:label'] || '').includes('FBI'));
  assert(fbi, 'FBI entity not found');
  assert(fbi['is_about'], 'FBI node missing is_about');
  const t2id = typeof fbi['is_about'] === 'object' ? fbi['is_about']['@id'] : fbi['is_about'];
  const t2node = nodes.find(n => n['@id'] === t2id);
  assert(t2node, `Tier 2 node ${t2id} not found in graph`);
  const types = [].concat(t2node['@type'] || []);
  assert(types.includes('Organization'), `Expected Organization, got ${types.join(', ')}`);
});

test('Passive voice: doctor maps to Person Tier 2', () => {
  const graph = buildTreeGraph(SENTENCES.passive);
  const nodes = getNodes(graph);
  const doctor = nodes.find(n => (n['rdfs:label'] || '').toLowerCase().includes('doctor'));
  assert(doctor, 'doctor entity not found');
  assert(doctor['is_about'], 'doctor node missing is_about');
  const t2id = typeof doctor['is_about'] === 'object' ? doctor['is_about']['@id'] : doctor['is_about'];
  const t2node = nodes.find(n => n['@id'] === t2id);
  assert(t2node, `Tier 2 node ${t2id} not found`);
  const types = [].concat(t2node['@type'] || []);
  assert(types.includes('Person'), `Expected Person for doctor, got ${types.join(', ')}`);
});

// ============================================================================
// 3. VerbPhrase ICE
// ============================================================================

console.log(`\n${C.cyan}--- VerbPhrase ICE ---${C.reset}`);

test('Act nodes have tagteam:VerbPhrase in @type', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const nodes = getNodes(graph);
  // Exclude provenance ParsingAct — it's IntentionalAct but not a text-extracted VerbPhrase
  const acts = findByType(nodes, 'IntentionalAct').filter(a => !(a['@id'] || '').includes('ParsingAct'));
  assert(acts.length >= 1, 'No text-extracted acts found');
  for (const act of acts) {
    const types = [].concat(act['@type'] || []);
    assert(types.includes('tagteam:VerbPhrase'), `Act ${act['@id']} missing tagteam:VerbPhrase`);
  }
});

// ============================================================================
// 4. Provenance: IBE
// ============================================================================

console.log(`\n${C.cyan}--- Provenance: InformationBearingEntity ---${C.reset}`);

test('IBE node exists with InformationBearingEntity type', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const ibes = findByType(getNodes(graph), 'InformationBearingEntity');
  assert(ibes.length === 1, `Expected exactly 1 IBE, got ${ibes.length}`);
});

test('ICE nodes (entities + acts) link to IBE via is_concretized_by', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const nodes = getNodes(graph);
  const ibe = findByType(nodes, 'InformationBearingEntity')[0];
  assert(ibe, 'IBE node not found');

  const tier1 = findTier1(nodes);
  for (const node of tier1) {
    assert(node['is_concretized_by'],
      `Tier 1 node ${node['@id']} missing is_concretized_by`);
    const ref = node['is_concretized_by'];
    const iri = typeof ref === 'object' ? ref['@id'] : ref;
    assert(iri === ibe['@id'],
      `Expected is_concretized_by → ${ibe['@id']}, got ${iri}`);
  }

  // Text-extracted acts (exclude provenance ParsingAct — it IS the act of processing, not an extracted ICE)
  const acts = findByType(nodes, 'IntentionalAct').filter(a => !(a['@id'] || '').includes('ParsingAct'));
  for (const act of acts) {
    assert(act['is_concretized_by'],
      `Act ${act['@id']} missing is_concretized_by`);
  }
});

// ============================================================================
// 5. Provenance: ArtificialAgent
// ============================================================================

console.log(`\n${C.cyan}--- Provenance: ArtificialAgent ---${C.reset}`);

test('ArtificialAgent node exists', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const agents = findParsingAgent(getNodes(graph));
  assert(agents.length === 1, `Expected exactly 1 ArtificialAgent, got ${agents.length}`);
});

test('ArtificialAgent has rdfs:label', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const agent = findParsingAgent(getNodes(graph))[0];
  assert(agent['rdfs:label'], 'ArtificialAgent missing rdfs:label');
});

// ============================================================================
// 6. Provenance: ActOfArtificialProcessing
// ============================================================================

console.log(`\n${C.cyan}--- Provenance: ParsingAct ---${C.reset}`);

test('ActOfArtificialProcessing node exists', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const parsingActs = findParsingAct(getNodes(graph));
  assert(parsingActs.length === 1, `Expected exactly 1 ParsingAct, got ${parsingActs.length}`);
});

test('ParsingAct has tagteam:has_input pointing to IBE', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const nodes = getNodes(graph);
  const pa = findParsingAct(nodes)[0];
  const ibe = findByType(nodes, 'InformationBearingEntity')[0];
  assert(pa['tagteam:has_input'], 'ParsingAct missing tagteam:has_input');
  const inputIRI = typeof pa['tagteam:has_input'] === 'object' ? pa['tagteam:has_input']['@id'] : pa['tagteam:has_input'];
  assert(inputIRI === ibe['@id'], `has_input should point to IBE (${ibe['@id']}), got ${inputIRI}`);
});

test('ParsingAct has has_agent pointing to ArtificialAgent', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const nodes = getNodes(graph);
  const pa = findParsingAct(nodes)[0];
  const agent = findParsingAgent(nodes)[0];
  assert(pa['has_agent'], 'ParsingAct missing has_agent');
  const agentIRI = typeof pa['has_agent'] === 'object' ? pa['has_agent']['@id'] : pa['has_agent'];
  assert(agentIRI === agent['@id'], `has_agent should point to Agent (${agent['@id']}), got ${agentIRI}`);
});

test('ParsingAct has tagteam:has_output listing all ICE nodes', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const nodes = getNodes(graph);
  const pa = findParsingAct(nodes)[0];
  assert(pa['tagteam:has_output'], 'ParsingAct missing tagteam:has_output');
  const outputs = [].concat(pa['tagteam:has_output']);
  assert(outputs.length >= 2, `Expected >= 2 ICE outputs, got ${outputs.length}`);
});

// ============================================================================
// 7. XSS sanitization covers new nodes
// ============================================================================

console.log(`\n${C.cyan}--- Sanitization ---${C.reset}`);

test('Tier 2 labels are XSS-sanitized', () => {
  const graph = buildTreeGraph('The <script>alert(1)</script> agency reviewed the case.');
  const nodes = getNodes(graph);
  const json = JSON.stringify(nodes);
  assert(!json.includes('<script>'), 'Raw <script> tag found in graph output');
  assert(!json.includes('</script>'), 'Raw </script> tag found in graph output');
});

test('IBE text value has quotes escaped', () => {
  const graph = buildTreeGraph('The "important" memo was filed.');
  const nodes = getNodes(graph);
  const ibe = findByType(nodes, 'InformationBearingEntity')[0];
  if (ibe && ibe['has_text_value']) {
    assert(!ibe['has_text_value'].includes('"important"'),
      'Unescaped quotes in IBE text value');
  }
});

// ============================================================================
// 8. Node count and structure consistency
// ============================================================================

console.log(`\n${C.cyan}--- Structure Consistency ---${C.reset}`);

test('SVO sentence: ~10 nodes (2 T1 + 2 T2 + 1 act + 2 roles + 3 prov)', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const count = getNodes(graph).length;
  assert(count >= 8 && count <= 14, `Expected 8-14 nodes, got ${count}`);
});

test('Copular sentence: structural assertions preserved alongside provenance', () => {
  const graph = buildTreeGraph(SENTENCES.copular);
  const nodes = getNodes(graph);
  const structural = findByType(nodes, 'StructuralAssertion');
  const prov = findParsingAct(nodes);
  assert(structural.length >= 1, 'Copular should produce StructuralAssertion');
  assert(prov.length === 1, 'Should still have ParsingAct');
});

test('Roles remain intact — not disrupted by Two-Tier wiring', () => {
  const graph = buildTreeGraph(SENTENCES.svo);
  const nodes = getNodes(graph);
  const roles = findByType(nodes, 'Role');
  assert(roles.length >= 2, `Expected >= 2 roles, got ${roles.length}`);
  // Each role should still have bearer and realizedIn
  for (const r of roles) {
    assert(r['tagteam:bearer'], `Role ${r['@id']} missing tagteam:bearer`);
    assert(r['tagteam:realizedIn'], `Role ${r['@id']} missing tagteam:realizedIn`);
  }
});

test('Deterministic: same input produces same IRIs', () => {
  const g1 = buildTreeGraph(SENTENCES.svo);
  const g2 = buildTreeGraph(SENTENCES.svo);
  const iris1 = getNodes(g1).map(n => n['@id']).sort();
  const iris2 = getNodes(g2).map(n => n['@id']).sort();
  assert(JSON.stringify(iris1) === JSON.stringify(iris2),
    'Same input should produce identical IRIs');
});

test('Multiple sentences produce distinct IBE IRIs', () => {
  const g1 = buildTreeGraph(SENTENCES.svo);
  const g2 = buildTreeGraph(SENTENCES.passive);
  const ibe1 = findByType(getNodes(g1), 'InformationBearingEntity')[0];
  const ibe2 = findByType(getNodes(g2), 'InformationBearingEntity')[0];
  assert(ibe1['@id'] !== ibe2['@id'],
    'Different inputs should produce different IBE IRIs');
});

// ============================================================================
// Results
// ============================================================================

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}RESULTS: ${C.green}${passed} passed${C.reset}, ${failed > 0 ? C.red : ''}${failed} failed${C.reset} (${passed + failed} total)${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}`);

process.exit(failed > 0 ? 1 : 0);
