#!/usr/bin/env node
/**
 * TagTeam.js Phase 4 Demo
 *
 * Demonstrates JSON-LD semantic graph output with:
 * - Discourse Referents (entities)
 * - Intentional Acts (verbs with CCO types)
 * - BFO Roles (linking entities to acts)
 *
 * Run: node demo-phase4.js
 *
 * @version 3.0.0-alpha.2
 */

const SemanticGraphBuilder = require('./src/graph/SemanticGraphBuilder');
const JSONLDSerializer = require('./src/graph/JSONLDSerializer');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║       TagTeam.js Phase 4: JSON-LD Semantic Graph Demo          ║');
console.log('║                     Version 3.0.0-alpha.2                       ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log();

// Example text from the IEE medical ethics domain
const text = "The doctor must allocate the last ventilator between two critically ill patients";

console.log('📝 Input Text:');
console.log(`   "${text}"`);
console.log();

// Build the semantic graph
const builder = new SemanticGraphBuilder();
const graph = builder.build(text);

// Display summary
console.log('═══════════════════════════════════════════════════════════════════');
console.log('📊 Graph Summary:');
console.log('═══════════════════════════════════════════════════════════════════');

const referents = graph['@graph'].filter(n =>
  n['@type'].includes('tagteam:DiscourseReferent'));
const acts = graph['@graph'].filter(n =>
  n['@type'].some(t => t.includes('IntentionalAct') || t.includes('ActOf')));
const roles = graph['@graph'].filter(n =>
  n['@type'].includes('bfo:BFO_0000023'));

console.log(`   Total Nodes:          ${graph['@graph'].length}`);
console.log(`   Discourse Referents:  ${referents.length}`);
console.log(`   Intentional Acts:     ${acts.length}`);
console.log(`   BFO Roles:            ${roles.length}`);
console.log();

// Display entities
console.log('═══════════════════════════════════════════════════════════════════');
console.log('👤 Discourse Referents (Entities):');
console.log('═══════════════════════════════════════════════════════════════════');

referents.forEach(ref => {
  console.log(`   • ${ref['rdfs:label']}`);
  console.log(`     IRI: ${ref['@id']}`);
  console.log(`     denotesType: ${ref['tagteam:denotesType']}`);
  console.log(`     definiteness: ${ref['tagteam:definiteness']}`);
  if (ref['tagteam:is_scarce']) {
    console.log(`     ⚠️  SCARCE (quantity: ${ref['tagteam:quantity']})`);
  }
  if (ref['tagteam:quantity'] && ref['tagteam:quantity'] > 1) {
    console.log(`     quantity: ${ref['tagteam:quantity']}`);
  }
  console.log();
});

// Display acts
console.log('═══════════════════════════════════════════════════════════════════');
console.log('⚡ Intentional Acts:');
console.log('═══════════════════════════════════════════════════════════════════');

acts.forEach(act => {
  console.log(`   • ${act['rdfs:label']}`);
  console.log(`     IRI: ${act['@id']}`);
  console.log(`     Type: ${act['@type'].find(t => t.includes('cco:'))}`);
  console.log(`     Verb: ${act['tagteam:verb']}`);
  if (act['tagteam:modality']) {
    console.log(`     Modality: ${act['tagteam:modality']} (deontic)`);
  }
  if (act['cco:has_agent']) {
    console.log(`     Agent: ${act['cco:has_agent']}`);
  }
  if (act['cco:affects']) {
    console.log(`     Affects: ${act['cco:affects']}`);
  }
  console.log();
});

// Display roles
console.log('═══════════════════════════════════════════════════════════════════');
console.log('🎭 BFO Roles (Entity-Act Links):');
console.log('═══════════════════════════════════════════════════════════════════');

roles.forEach(role => {
  console.log(`   • ${role['rdfs:label']}`);
  console.log(`     IRI: ${role['@id']}`);
  console.log(`     Type: ${role['@type'].find(t => t.includes('cco:') || t === 'bfo:BFO_0000023')}`);
  console.log(`     Bearer (inheres_in): ${role['bfo:inheres_in']}`);
  console.log(`     Realization (realized_in): ${role['bfo:realized_in']}`);
  console.log();
});

// Serialize to JSON-LD
const serializer = new JSONLDSerializer({ pretty: true });
const jsonld = serializer.serialize(graph);

console.log('═══════════════════════════════════════════════════════════════════');
console.log('📦 Full JSON-LD Output:');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(jsonld);
console.log();

console.log('═══════════════════════════════════════════════════════════════════');
console.log('✅ Demo Complete!');
console.log('═══════════════════════════════════════════════════════════════════');
console.log();
console.log('Week 1 Phases Complete:');
console.log('  ✅ Phase 1.1: Semantic Graph Builder + JSON-LD Serializer');
console.log('  ✅ Phase 1.2: Entity Extraction → Discourse Referents');
console.log('  ✅ Phase 1.3: Act Extraction (Verbs → CCO Types)');
console.log('  ✅ Phase 1.4: Role Detection (BFO Roles)');
console.log();
console.log('Unit Tests: 116 passing (32 + 31 + 29 + 24)');
console.log();
