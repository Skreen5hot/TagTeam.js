#!/usr/bin/env node
/**
 * TagTeam Test Runner
 *
 * A simple but effective test runner that:
 * - Discovers and runs test files
 * - Supports filtering by path pattern
 * - Supports filtering by tags
 * - Aggregates results across files
 * - Provides clear output
 *
 * Usage:
 *   node tests/framework/test-runner.js                    # Run all tests
 *   node tests/framework/test-runner.js --filter unit/     # Run unit tests
 *   node tests/framework/test-runner.js --filter linguistic # Run linguistic tests
 *   node tests/framework/test-runner.js --tags p0          # Run P0 priority tests
 *
 * @module tests/framework/test-runner
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  filter: null,
  tags: [],
  verbose: false,
  bail: false,
  help: false
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--filter':
    case '-f':
      options.filter = args[++i];
      break;
    case '--tags':
    case '-t':
      options.tags = args[++i].split(',');
      break;
    case '--verbose':
    case '-v':
      options.verbose = true;
      break;
    case '--bail':
    case '-b':
      options.bail = true;
      break;
    case '--help':
    case '-h':
      options.help = true;
      break;
  }
}

if (options.help) {
  console.log(`
TagTeam Test Runner

Usage:
  node test-runner.js [options]

Options:
  --filter, -f <pattern>   Filter test files by path pattern
  --tags, -t <tags>        Filter tests by tags (comma-separated)
  --verbose, -v            Show verbose output
  --bail, -b               Stop on first failure
  --help, -h               Show this help

Examples:
  node test-runner.js                          # Run all tests
  node test-runner.js --filter unit/           # Run unit tests only
  node test-runner.js --filter linguistic      # Run linguistic tests
  node test-runner.js --tags p0                # Run P0 priority tests
  node test-runner.js --filter ontology -v     # Run ontology tests verbosely
`);
  process.exit(0);
}

// Set environment for verbose mode
if (options.verbose) {
  process.env.VERBOSE = 'true';
}

/**
 * Recursively find all test files
 */
function findTestFiles(dir, pattern = null) {
  const testFiles = [];

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          walk(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
        // Check if file matches filter pattern
        if (!pattern || fullPath.includes(pattern)) {
          testFiles.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return testFiles.sort();
}

/**
 * Run a single test file
 */
async function runTestFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);

  console.log('\n' + '─'.repeat(60));
  console.log(`📁 ${relativePath}`);
  console.log('─'.repeat(60));

  try {
    // Clear require cache to ensure fresh run
    delete require.cache[require.resolve(filePath)];

    // Reset test helpers state
    const helpers = require('./test-helpers');
    helpers.resetResults();

    // Run the test file
    require(filePath);

    // Wait for any async tests (give them time to complete)
    await new Promise(resolve => setTimeout(resolve, 100));

    return helpers.getResults();

  } catch (error) {
    console.error(`  ✗ Error loading test file: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    return { passed: 0, failed: 1, skipped: 0, pending: 0, tests: [] };
  }
}

/**
 * Main runner
 */
async function main() {
  const startTime = Date.now();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║             TagTeam.js Test Runner v1.0.0                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (options.filter) {
    console.log(`\nFilter: ${options.filter}`);
  }
  if (options.tags.length > 0) {
    console.log(`Tags: ${options.tags.join(', ')}`);
  }

  // Find test directories
  const testsDir = path.join(__dirname, '..');

  // Find all test files
  const testFiles = findTestFiles(testsDir, options.filter);

  if (testFiles.length === 0) {
    console.log('\n⚠️  No test files found matching criteria');
    process.exit(0);
  }

  console.log(`\nFound ${testFiles.length} test file(s)`);

  // Aggregate results
  const aggregate = {
    passed: 0,
    failed: 0,
    skipped: 0,
    pending: 0,
    files: 0,
    failedFiles: []
  };

  // Run each test file
  for (const testFile of testFiles) {
    const result = await runTestFile(testFile);

    aggregate.passed += result.passed;
    aggregate.failed += result.failed;
    aggregate.skipped += result.skipped;
    aggregate.pending += result.pending;
    aggregate.files++;

    if (result.failed > 0) {
      aggregate.failedFiles.push(path.relative(process.cwd(), testFile));

      if (options.bail) {
        console.log('\n⛔ Stopping due to --bail flag');
        break;
      }
    }
  }

  // Print final summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '═'.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('═'.repeat(60));

  const total = aggregate.passed + aggregate.failed + aggregate.skipped + aggregate.pending;

  console.log(`\n  Files:    ${aggregate.files}`);
  console.log(`  Total:    ${total} tests`);
  console.log(`  ✓ Passed:  ${aggregate.passed}`);
  console.log(`  ✗ Failed:  ${aggregate.failed}`);
  console.log(`  ○ Skipped: ${aggregate.skipped}`);
  console.log(`  ◌ Pending: ${aggregate.pending}`);
  console.log(`  Duration: ${duration}s`);

  if (aggregate.passed + aggregate.failed > 0) {
    const passRate = ((aggregate.passed / (aggregate.passed + aggregate.failed)) * 100).toFixed(1);
    console.log(`\n  Pass Rate: ${passRate}%`);
  }

  if (aggregate.failedFiles.length > 0) {
    console.log('\n  Failed Files:');
    aggregate.failedFiles.forEach(f => console.log(`    - ${f}`));
  }

  console.log('\n' + '═'.repeat(60));

  // Exit with appropriate code
  process.exit(aggregate.failed > 0 ? 1 : 0);
}

// Run
main().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
