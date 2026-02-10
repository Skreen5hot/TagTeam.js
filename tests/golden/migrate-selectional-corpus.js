#!/usr/bin/env node

/**
 * Migration script: selectional-corpus.json v1.0 → v2.0
 *
 * Migrates test cases from old format to new v2.0 schema
 */

const fs = require('fs');
const path = require('path');

const corpusPath = path.join(__dirname, 'selectional-corpus.json');

console.log('📦 Migrating selectional-corpus.json to v2.0 schema...\n');

// Load existing corpus
const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

console.log(`Found ${corpus.cases.length} test cases`);

// Migrate each test case
let migratedCount = 0;
let alreadyMigratedCount = 0;

corpus.cases = corpus.cases.map((testCase, index) => {
  // Check if already migrated (has 'input' and 'expectedOutput')
  if (testCase.input && testCase.expectedOutput) {
    alreadyMigratedCount++;
    return testCase;
  }

  // Migrate from v1.0 to v2.0 format
  const migrated = {
    id: testCase.id,
    category: "selectional-preference",
    input: testCase.sentence,
    expectedOutput: {},
    tags: testCase.tags || [],
    priority: "P0"
  };

  // Migrate verb
  if (testCase.verb) {
    migrated.expectedOutput.verb = testCase.verb;
  }

  // Migrate subject
  if (testCase.subject) {
    migrated.expectedOutput.subject = testCase.subject;
  }

  // Migrate object (if present)
  if (testCase.object) {
    migrated.expectedOutput.object = testCase.object;
  }

  // Migrate expectedSubjectValid → subjectValid
  if (testCase.expectedSubjectValid !== undefined) {
    migrated.expectedOutput.subjectValid = testCase.expectedSubjectValid;
  }

  // Migrate expectedObjectValid → objectValid
  if (testCase.expectedObjectValid !== undefined) {
    migrated.expectedOutput.objectValid = testCase.expectedObjectValid;
  }

  // Migrate expectedConfidence → subjectConfidence
  if (testCase.expectedConfidence !== undefined) {
    migrated.expectedOutput.subjectConfidence = testCase.expectedConfidence;
  }

  // Migrate expectedViolationType → selectionalViolation flag
  if (testCase.expectedViolationType === "selectional_violation") {
    migrated.expectedOutput.selectionalViolation = true;
  }

  // Generate notes based on content
  let notes = [];
  if (migrated.expectedOutput.subjectValid === false) {
    notes.push("Invalid selectional preference");
  } else if (migrated.expectedOutput.subjectValid === true) {
    notes.push("Valid selectional preference");
  }

  if (testCase.tags.includes('organization_subject')) {
    notes.push("organization as valid agent");
  } else if (testCase.tags.includes('inanimate_subject')) {
    notes.push("inanimate subject");
  } else if (testCase.tags.includes('animate_subject')) {
    notes.push("animate subject");
  }

  if (testCase.tags.includes('metonymy')) {
    notes.push("metonymic use");
  }

  if (notes.length > 0) {
    migrated.notes = notes.join(', ');
  }

  migratedCount++;
  return migrated;
});

// Save migrated corpus
fs.writeFileSync(corpusPath, JSON.stringify(corpus, null, 2));

console.log(`\n✅ Migration complete!`);
console.log(`   - Already migrated: ${alreadyMigratedCount} test cases`);
console.log(`   - Newly migrated: ${migratedCount} test cases`);
console.log(`   - Total: ${corpus.cases.length} test cases\n`);

console.log('Run validation:');
console.log('  npm run validate:golden\n');
