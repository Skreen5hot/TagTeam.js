#!/usr/bin/env node
/**
 * v2 Integration Test Runner
 *
 * Discovers and runs all *.test.js files in tests/integration/v2/
 * Add test files as cross-phase integration points are reached.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const testDir = __dirname;
const testFiles = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.js'))
  .sort();

if (testFiles.length === 0) {
  console.log('No v2 integration test files found yet. Add tests as phases converge.');
  process.exit(0);
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`  TagTeam.js v2 Integration Tests (${testFiles.length} files)`);
console.log(`${'═'.repeat(60)}\n`);

let failed = 0;

for (const file of testFiles) {
  const filePath = path.join(testDir, file);
  console.log(`Running ${file}...`);
  try {
    require(filePath);
  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
    failed++;
  }
}

console.log(`\n${'═'.repeat(60)}`);
if (failed > 0) {
  console.log(`  ${failed} test file(s) FAILED`);
  process.exit(1);
} else {
  console.log(`  All ${testFiles.length} test files passed`);
}
console.log(`${'═'.repeat(60)}\n`);
