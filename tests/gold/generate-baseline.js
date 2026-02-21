#!/usr/bin/env node
/**
 * Phase 4D: Generate Gold Baselines
 *
 * Runs each curated sentence through buildTreeGraph() and saves the
 * resulting JSON-LD graph as a baseline file. These baselines serve as
 * the gold standard after expert review/adjustment.
 *
 * Usage:
 *   node tests/gold/generate-baseline.js [--force]
 *
 * Options:
 *   --force  Overwrite existing baselines (default: skip existing)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const BASELINES_DIR = path.join(__dirname, 'baselines');

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

const force = process.argv.includes('--force');

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}Phase 4D: Generating Gold Baselines${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}\n`);

if (!fs.existsSync(BASELINES_DIR)) {
  fs.mkdirSync(BASELINES_DIR, { recursive: true });
}

let generated = 0;
let skipped = 0;
let errors = 0;

for (const sentence of sentences) {
  const baselinePath = path.join(BASELINES_DIR, `${sentence.id}.json`);

  if (fs.existsSync(baselinePath) && !force) {
    skipped++;
    continue;
  }

  try {
    const builder = new SemanticGraphBuilder({});
    builder._treePosTagger = new PerceptronTagger(posModel);
    builder._treeDepParser = new DependencyParser(depModel);
    const graph = builder.build(sentence.text, { useTreeExtractors: true });

    // Extract entities and roles from graph for evaluation
    const graphNodes = graph['@graph'] || [];
    const extractedEntities = [];
    const extractedRoles = [];

    // Role type mapping
    const ROLE_TYPE_MAP = {
      'cco:AgentRole': 'Agent', 'AgentRole': 'Agent',
      'cco:PatientRole': 'Patient', 'PatientRole': 'Patient',
      'cco:RecipientRole': 'Recipient', 'RecipientRole': 'Recipient',
      'cco:ThemeRole': 'Patient', 'ThemeRole': 'Patient',
      'cco:BeneficiaryRole': 'Beneficiary', 'BeneficiaryRole': 'Beneficiary',
      'cco:InstrumentRole': 'Instrument', 'InstrumentRole': 'Instrument',
      'cco:LocationRole': 'Location', 'LocationRole': 'Location',
      'cco:SourceRole': 'Source', 'SourceRole': 'Source',
      'cco:GoalRole': 'Goal', 'GoalRole': 'Goal',
      'cco:DestinationRole': 'Goal', 'DestinationRole': 'Goal'
    };

    // Build @id → label map
    const idToLabel = {};
    for (const n of graphNodes) {
      if (n['@id'] && n['rdfs:label']) idToLabel[n['@id']] = n['rdfs:label'];
    }

    for (const node of graphNodes) {
      const types = [].concat(node['@type'] || []);
      const isAct = types.some(t => t.includes('Act') || t.includes('IntentionalAct') || t.includes('Process'));
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

      if (!isAct && !isRole && !isAssertion && !isProvenance && !isTier2 && node['rdfs:label']) {
        extractedEntities.push({
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
          extractedRoles.push({ entity: bearerLabel, role: roleName });
        }
      }
    }

    const baseline = {
      id: sentence.id,
      text: sentence.text,
      subset: sentence.subset,
      tags: sentence.tags,
      generatedAt: new Date().toISOString(),
      pipelineVersion: graph._metadata ? graph._metadata.version : 'unknown',
      expectedEntities: sentence.expectedEntities,
      expectedRoles: sentence.expectedRoles,
      extractedEntities,
      extractedRoles,
      graph: {
        '@graph': graphNodes
      }
    };

    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
    generated++;
    process.stdout.write(`  ${C.green}\u2713${C.reset} ${sentence.id}: ${sentence.text.substring(0, 50)}...\n`);

  } catch (e) {
    errors++;
    process.stdout.write(`  ${C.red}\u2717${C.reset} ${sentence.id}: ${e.message}\n`);
  }
}

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}RESULTS: ${C.green}${generated} generated${C.reset}, ${C.yellow}${skipped} skipped${C.reset}, ${errors > 0 ? C.red : ''}${errors} errors${C.reset} (${sentences.length} total)${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}`);
console.log(`\nBaselines written to: ${BASELINES_DIR}`);

if (generated > 0) {
  console.log(`\n${C.yellow}NOTE: These baselines are auto-generated. Expert review is required`);
  console.log(`before they can serve as gold standards for F1 evaluation.${C.reset}`);
}

process.exit(errors > 0 ? 1 : 0);
