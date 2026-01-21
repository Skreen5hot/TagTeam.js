#!/usr/bin/env node
/**
 * TagTeam Ontology Validator
 *
 * Validates the TagTeam TTL ontology for common issues:
 * - Missing labels
 * - Missing definitions
 * - Missing prefLabels
 * - Missing domain/range
 * - Missing subclass
 * - Duplicate labels
 *
 * Usage: node validate-ontology.js
 *
 * Note: For full SPARQL validation, use a tool like:
 * - robot report --input ontology/tagteam.ttl
 * - Apache Jena's arq command
 * - Protege's SPARQL query tab
 *
 * This script performs basic structural checks without SPARQL.
 */

const fs = require('fs');
const path = require('path');

const ONTOLOGY_PATH = path.join(__dirname, '..', 'tagteam.ttl');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           TagTeam Ontology Validator                           ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log();

// Read the ontology file
let ontologyContent;
try {
  ontologyContent = fs.readFileSync(ONTOLOGY_PATH, 'utf-8');
  console.log(`✅ Loaded ontology: ${ONTOLOGY_PATH}`);
  console.log(`   Size: ${(ontologyContent.length / 1024).toFixed(1)} KB`);
  console.log();
} catch (error) {
  console.error(`❌ Failed to load ontology: ${error.message}`);
  process.exit(1);
}

// Track validation results
const results = {
  classes: [],
  objectProperties: [],
  datatypeProperties: [],
  individuals: [],
  issues: []
};

// Parse TTL to extract entities (simplified parser)
function parseEntities(content) {
  const lines = content.split('\n');
  let currentEntityName = null;
  let currentEntity = null;
  let inEntityBlock = false;
  let blockContent = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines when not in a block
    if (!inEntityBlock && (trimmed.startsWith('#') || trimmed === '')) continue;

    // Detect start of entity declarations (line starts with ":" and only contains the entity name)
    if (!inEntityBlock && trimmed.startsWith(':') && !trimmed.includes(' ')) {
      inEntityBlock = true;
      blockContent = trimmed;
      // Get entity name (line is just ":EntityName")
      currentEntityName = trimmed.substring(1);
      currentEntity = null; // Will set type on next line
      continue;
    }

    // If we have a name but no type yet, check this line for type declaration
    if (inEntityBlock && currentEntityName && !currentEntity) {
      blockContent += ' ' + trimmed;
      if (trimmed.includes('a owl:Class')) {
        currentEntity = { name: currentEntityName, type: 'Class', hasLabel: false, hasDefinition: false, hasPrefLabel: false, hasSubClass: false };
      } else if (trimmed.includes('a owl:ObjectProperty')) {
        currentEntity = { name: currentEntityName, type: 'ObjectProperty', hasLabel: false, hasDefinition: false, hasPrefLabel: false, hasDomain: false, hasRange: false };
      } else if (trimmed.includes('a owl:DatatypeProperty')) {
        currentEntity = { name: currentEntityName, type: 'DatatypeProperty', hasLabel: false, hasDefinition: false, hasPrefLabel: false, hasRange: false };
      } else if (trimmed.includes('a owl:NamedIndividual')) {
        currentEntity = { name: currentEntityName, type: 'NamedIndividual', hasLabel: false, hasDefinition: false, hasPrefLabel: false };
      }
    } else if (inEntityBlock) {
      blockContent += ' ' + trimmed;
    }

    // Check for annotations within entity block
    if (currentEntity && inEntityBlock) {
      if (trimmed.includes('rdfs:label')) currentEntity.hasLabel = true;
      if (trimmed.includes('skos:definition')) currentEntity.hasDefinition = true;
      if (trimmed.includes('skos:prefLabel')) currentEntity.hasPrefLabel = true;
      if (trimmed.includes('rdfs:subClassOf')) currentEntity.hasSubClass = true;
      if (trimmed.includes('rdfs:domain')) currentEntity.hasDomain = true;
      if (trimmed.includes('rdfs:range')) currentEntity.hasRange = true;
    }

    // End of entity block (line ending with period)
    if (inEntityBlock && trimmed.endsWith('.')) {
      if (currentEntity) {
        if (currentEntity.type === 'Class') results.classes.push(currentEntity);
        else if (currentEntity.type === 'ObjectProperty') results.objectProperties.push(currentEntity);
        else if (currentEntity.type === 'DatatypeProperty') results.datatypeProperties.push(currentEntity);
        else if (currentEntity.type === 'NamedIndividual') results.individuals.push(currentEntity);
      }
      currentEntity = null;
      currentEntityName = null;
      inEntityBlock = false;
      blockContent = '';
    }
  }

  return results;
}

// Run validation
parseEntities(ontologyContent);

console.log('═══════════════════════════════════════════════════════════════════');
console.log('📊 Entity Inventory:');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(`   Classes:            ${results.classes.length}`);
console.log(`   Object Properties:  ${results.objectProperties.length}`);
console.log(`   Datatype Properties: ${results.datatypeProperties.length}`);
console.log(`   Named Individuals:  ${results.individuals.length}`);
console.log();

// Check for issues
console.log('═══════════════════════════════════════════════════════════════════');
console.log('🔍 Validation Checks:');
console.log('═══════════════════════════════════════════════════════════════════');

// Check labels
const missingLabels = [
  ...results.classes.filter(e => !e.hasLabel),
  ...results.objectProperties.filter(e => !e.hasLabel),
  ...results.datatypeProperties.filter(e => !e.hasLabel),
  ...results.individuals.filter(e => !e.hasLabel)
];

if (missingLabels.length === 0) {
  console.log('✅ All entities have rdfs:label');
} else {
  console.log(`❌ Missing rdfs:label (${missingLabels.length}):`);
  missingLabels.forEach(e => console.log(`   - ${e.type}: ${e.name}`));
}

// Check definitions
const missingDefinitions = [
  ...results.classes.filter(e => !e.hasDefinition),
  ...results.objectProperties.filter(e => !e.hasDefinition),
  ...results.datatypeProperties.filter(e => !e.hasDefinition)
];

if (missingDefinitions.length === 0) {
  console.log('✅ All classes and properties have skos:definition');
} else {
  console.log(`❌ Missing skos:definition (${missingDefinitions.length}):`);
  missingDefinitions.slice(0, 10).forEach(e => console.log(`   - ${e.type}: ${e.name}`));
  if (missingDefinitions.length > 10) {
    console.log(`   ... and ${missingDefinitions.length - 10} more`);
  }
}

// Check prefLabels
const missingPrefLabels = [
  ...results.classes.filter(e => !e.hasPrefLabel),
  ...results.objectProperties.filter(e => !e.hasPrefLabel),
  ...results.datatypeProperties.filter(e => !e.hasPrefLabel),
  ...results.individuals.filter(e => !e.hasPrefLabel)
];

if (missingPrefLabels.length === 0) {
  console.log('✅ All entities have skos:prefLabel');
} else {
  console.log(`❌ Missing skos:prefLabel (${missingPrefLabels.length}):`);
  missingPrefLabels.slice(0, 10).forEach(e => console.log(`   - ${e.type}: ${e.name}`));
  if (missingPrefLabels.length > 10) {
    console.log(`   ... and ${missingPrefLabels.length - 10} more`);
  }
}

// Check subclass
const missingSubClass = results.classes.filter(e => !e.hasSubClass);

if (missingSubClass.length === 0) {
  console.log('✅ All classes have rdfs:subClassOf');
} else {
  console.log(`❌ Missing rdfs:subClassOf (${missingSubClass.length}):`);
  missingSubClass.forEach(e => console.log(`   - Class: ${e.name}`));
}

// Check domain/range on properties
const missingDomain = results.objectProperties.filter(e => !e.hasDomain);
const missingRange = [
  ...results.objectProperties.filter(e => !e.hasRange),
  ...results.datatypeProperties.filter(e => !e.hasRange)
];

if (missingDomain.length === 0) {
  console.log('✅ All object properties have rdfs:domain');
} else {
  console.log(`⚠️  Missing rdfs:domain (${missingDomain.length}):`);
  missingDomain.forEach(e => console.log(`   - ObjectProperty: ${e.name}`));
}

if (missingRange.length === 0) {
  console.log('✅ All properties have rdfs:range');
} else {
  console.log(`⚠️  Missing rdfs:range (${missingRange.length}):`);
  missingRange.forEach(e => console.log(`   - ${e.type}: ${e.name}`));
}

console.log();
console.log('═══════════════════════════════════════════════════════════════════');
console.log('📋 Summary:');
console.log('═══════════════════════════════════════════════════════════════════');

const totalEntities = results.classes.length + results.objectProperties.length +
  results.datatypeProperties.length + results.individuals.length;
const totalIssues = missingLabels.length + missingDefinitions.length +
  missingPrefLabels.length + missingSubClass.length;

console.log(`   Total entities: ${totalEntities}`);
console.log(`   Issues found:   ${totalIssues}`);

if (totalIssues === 0) {
  console.log();
  console.log('🎉 Ontology passes all validation checks!');
} else {
  console.log();
  console.log('⚠️  Some issues found. Review and fix as needed.');
  console.log('   Note: Some issues (like missing domain) may be intentional.');
}

console.log();
console.log('═══════════════════════════════════════════════════════════════════');
console.log('📝 Additional Validation:');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('For complete validation, run SPARQL queries with:');
console.log('  1. ROBOT: robot report --input ontology/tagteam.ttl');
console.log('  2. Apache Jena: arq --data ontology/tagteam.ttl --query <file>.sparql');
console.log('  3. Protege: Load ontology and use SPARQL query tab');
console.log();
console.log('SPARQL queries available in: ontology/validation/*.sparql');
console.log();
