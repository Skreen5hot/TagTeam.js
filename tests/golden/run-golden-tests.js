#!/usr/bin/env node

/**
 * TagTeam Golden Test Runner v2.0
 *
 * Universal test runner for golden test corpus validation
 *
 * Usage:
 *   node run-golden-tests.js                    # Run all tests
 *   node run-golden-tests.js --corpus=X         # Run specific corpus
 *   node run-golden-tests.js --priority=P0      # Run by priority
 *   node run-golden-tests.js --category=phase   # Run by category
 *   node run-golden-tests.js --report           # Generate HTML report
 *   node run-golden-tests.js --verbose          # Verbose output
 */

const fs = require('fs');
const path = require('path');

// Load semantic role validator (optional)
let semanticRoleValidator = null;
try {
  semanticRoleValidator = require('./semantic-role-validator.js');
} catch (e) {
  // Validator not available
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  goldenDir: path.join(__dirname),
  corpusIndex: path.join(__dirname, 'corpus-index.json'),
  schemaFile: path.join(__dirname, 'schemas', 'test-case-schema-v2.json'),
  resultsDir: path.join(__dirname, 'results'),
  historyFile: path.join(__dirname, 'results', 'accuracy-history.csv'),

  // Default tolerance for numeric comparisons
  defaultTolerance: 0.1,

  // Color codes for terminal output
  colors: {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
  }
};

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs() {
  const args = {
    corpus: null,
    priority: null,
    category: null,
    tags: [],
    report: false,
    verbose: false,
    dryRun: false,
    watch: false,
    updateSnapshots: false,
    help: false
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg.startsWith('--corpus=')) {
      args.corpus = arg.split('=')[1];
    } else if (arg.startsWith('--priority=')) {
      args.priority = arg.split('=')[1];
    } else if (arg.startsWith('--category=')) {
      args.category = arg.split('=')[1];
    } else if (arg.startsWith('--tags=')) {
      args.tags = arg.split('=')[1].split(',');
    } else if (arg === '--report') {
      args.report = true;
    } else if (arg === '--verbose' || arg === '-v') {
      args.verbose = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--watch') {
      args.watch = true;
    } else if (arg === '--update-snapshots') {
      args.updateSnapshots = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }

  return args;
}

function showHelp() {
  console.log(`
${CONFIG.colors.bright}TagTeam Golden Test Runner v2.0${CONFIG.colors.reset}

${CONFIG.colors.cyan}Usage:${CONFIG.colors.reset}
  node run-golden-tests.js [options]

${CONFIG.colors.cyan}Options:${CONFIG.colors.reset}
  --corpus=<name>       Run specific corpus (e.g., selectional-corpus)
  --priority=<level>    Run tests by priority (P0, P1, P2)
  --category=<cat>      Run tests by category (phase-specific, feature-specific, etc.)
  --tags=<tag1,tag2>    Run tests with specific tags
  --report              Generate HTML report
  --verbose, -v         Verbose output
  --dry-run             Validate without executing
  --watch               Watch mode (re-run on file changes)
  --update-snapshots    Update expected outputs (use with caution!)
  --help, -h            Show this help message

${CONFIG.colors.cyan}Examples:${CONFIG.colors.reset}
  node run-golden-tests.js
  node run-golden-tests.js --corpus=interpretation-lattice
  node run-golden-tests.js --priority=P0 --verbose
  node run-golden-tests.js --category=iee-integration --report
  node run-golden-tests.js --tags=modal,ambiguity
`);
}

// ============================================================================
// Corpus Loading
// ============================================================================

function loadCorpusIndex() {
  try {
    const indexData = fs.readFileSync(CONFIG.corpusIndex, 'utf8');
    return JSON.parse(indexData);
  } catch (error) {
    console.error(`${CONFIG.colors.red}Error loading corpus index:${CONFIG.colors.reset}`, error.message);
    process.exit(1);
  }
}

function loadCorpus(corpusInfo) {
  const corpusPath = path.join(CONFIG.goldenDir, corpusInfo.path);

  if (!fs.existsSync(corpusPath)) {
    return null;
  }

  try {
    const corpusData = fs.readFileSync(corpusPath, 'utf8');
    return JSON.parse(corpusData);
  } catch (error) {
    console.error(`${CONFIG.colors.red}Error loading corpus ${corpusInfo.id}:${CONFIG.colors.reset}`, error.message);
    return null;
  }
}

function filterCorpuses(index, args) {
  let corpuses = index.corpuses;

  if (args.corpus) {
    corpuses = corpuses.filter(c => c.id === args.corpus);
  }

  if (args.priority) {
    corpuses = corpuses.filter(c => c.priority === args.priority);
  }

  if (args.category) {
    corpuses = corpuses.filter(c => c.category === args.category);
  }

  // Only load corpuses that exist (status !== 'planned')
  corpuses = corpuses.filter(c => c.status === 'complete' || c.status === 'in-progress');

  return corpuses;
}

// ============================================================================
// Schema Validation
// ============================================================================

function validateSchema(corpus) {
  const errors = [];

  // Basic structure validation
  if (!corpus.version) errors.push('Missing version');
  if (!corpus.corpusId) errors.push('Missing corpusId');
  if (!corpus.description) errors.push('Missing description');
  if (!corpus.metadata) errors.push('Missing metadata');
  if (!corpus.cases || !Array.isArray(corpus.cases)) errors.push('Missing or invalid cases array');

  // Metadata validation
  if (corpus.metadata) {
    if (!corpus.metadata.created) errors.push('Missing metadata.created');
    if (!corpus.metadata.author) errors.push('Missing metadata.author');
    if (!corpus.metadata.phase) errors.push('Missing metadata.phase');
    if (!corpus.metadata.priority) errors.push('Missing metadata.priority');
  }

  // Cases validation
  if (corpus.cases) {
    corpus.cases.forEach((testCase, index) => {
      const caseErrors = validateTestCase(testCase, index);
      errors.push(...caseErrors);
    });
  }

  return errors;
}

function validateTestCase(testCase, index) {
  const errors = [];
  const prefix = `Case ${index + 1} (${testCase.id || 'unknown'})`;

  if (!testCase.id) errors.push(`${prefix}: Missing id`);
  if (!testCase.category) errors.push(`${prefix}: Missing category`);
  if (!testCase.input) errors.push(`${prefix}: Missing input`);
  if (!testCase.expectedOutput) errors.push(`${prefix}: Missing expectedOutput`);
  if (!testCase.tags || !Array.isArray(testCase.tags) || testCase.tags.length === 0) {
    errors.push(`${prefix}: Missing or empty tags array`);
  }
  if (!testCase.priority || !['P0', 'P1', 'P2'].includes(testCase.priority)) {
    errors.push(`${prefix}: Invalid priority (must be P0, P1, or P2)`);
  }

  return errors;
}

// ============================================================================
// Test Execution (Placeholder)
// ============================================================================

/**
 * Load TagTeam library once for all tests (V7.4 MEMORY-FIX)
 * Previously loaded per-test (556 × 5.35MB module = massive memory churn)
 */
let _cachedTagTeam = null;
function getTagTeam() {
  if (!_cachedTagTeam) {
    _cachedTagTeam = require('../../dist/tagteam.js');
  }
  return _cachedTagTeam;
}

/**
 * Execute a single test case
 *
 * Uses cached TagTeam instance, returns lightweight result
 */
function executeTest(testCase, args) {
  // V7.4 MEMORY-FIX: Only store essential data in results - no expectedOutput,
  // no graph references. These were causing ~33MB+ accumulation across 556 tests.
  const result = {
    id: testCase.id,
    input: testCase.input,
    passed: false,
    diffCount: 0,
    executionTime: 0,
    error: null
  };

  if (args.verbose) {
    console.log(`  ${CONFIG.colors.cyan}Executing:${CONFIG.colors.reset} ${testCase.id}`);
  }

  try {
    const startTime = Date.now();

    const TagTeam = getTagTeam();

    // Parse input with NPChunker enabled
    const graph = TagTeam.buildGraph(testCase.input, {
      useNPChunker: true,
      preserveAmbiguity: true
    });

    result.executionTime = Date.now() - startTime;

    // Use semantic role validator for role-based tests
    if (semanticRoleValidator && testCase.expectedOutput?.semanticRoles) {
      const validation = semanticRoleValidator.validateSemanticRoles(testCase, graph);
      result.passed = validation.passed;
      result.diffCount = validation.diffs.length;

      // V7.4 MEMORY-FIX: Only store lightweight diffs (role names + text, no graph refs)
      if (!validation.passed) {
        result.diffs = validation.diffs.map(d => ({
          type: d.type,
          role: d.expected?.role || d.actual?.role || '',
          text: d.expected?.text || d.actual?.text || ''
        }));
      }

      // Store summary counts only
      result.validationSummary = validation.summary;

      if (args.verbose && !validation.passed) {
        console.log(`    ${CONFIG.colors.red}Role mismatches:${CONFIG.colors.reset}`);
        validation.diffs.forEach(diff => {
          if (diff.type === 'missing-role') {
            console.log(`      Missing: ${diff.expected.role} - "${diff.expected.text}"`);
          } else if (diff.type === 'extra-role') {
            console.log(`      Extra: ${diff.actual.role} - "${diff.actual.text}"`);
          }
        });
      }
    } else {
      // Default comparison for other test types
      // V7.4 MEMORY-FIX: Only count diffs, don't store graph fragment references
      const diffs = compareResults(
        testCase.expectedOutput,
        graph,
        testCase.validationRules || {}
      );
      result.diffCount = diffs.length;
      result.passed = diffs.length === 0;
      // Don't store diffs - they contain references to graph sub-objects
    }

    // graph goes out of scope here and becomes eligible for GC

  } catch (error) {
    result.error = error.message;
    result.passed = false;
  }

  return result;
}

// ============================================================================
// Result Comparison
// ============================================================================

function compareResults(expected, actual, validationRules = {}) {
  const tolerance = validationRules.tolerance || CONFIG.defaultTolerance;
  const diffs = [];

  // Deep comparison with tolerance for numbers
  function compare(exp, act, path = '') {
    if (typeof exp === 'number' && typeof act === 'number') {
      if (Math.abs(exp - act) > tolerance) {
        diffs.push({
          path,
          expected: exp,
          actual: act,
          type: 'numeric-mismatch'
        });
      }
    } else if (typeof exp !== typeof act) {
      diffs.push({
        path,
        expected: exp,
        actual: act,
        type: 'type-mismatch'
      });
    } else if (Array.isArray(exp)) {
      if (!Array.isArray(act) || exp.length !== act.length) {
        diffs.push({
          path,
          expected: exp,
          actual: act,
          type: 'array-mismatch'
        });
      } else {
        exp.forEach((item, i) => compare(item, act[i], `${path}[${i}]`));
      }
    } else if (typeof exp === 'object' && exp !== null) {
      for (const key in exp) {
        compare(exp[key], act?.[key], path ? `${path}.${key}` : key);
      }
    } else if (exp !== act) {
      diffs.push({
        path,
        expected: exp,
        actual: act,
        type: 'value-mismatch'
      });
    }
  }

  compare(expected, actual);
  return diffs;
}

// ============================================================================
// Reporting
// ============================================================================

function generateReport(results, args) {
  const summary = {
    totalTests: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    errors: results.filter(r => r.error).length,
    accuracy: 0,
    byPriority: { P0: { total: 0, passed: 0 }, P1: { total: 0, passed: 0 }, P2: { total: 0, passed: 0 } },
    byCorpus: {},
    regressions: [],
    executionTime: results.reduce((sum, r) => sum + r.executionTime, 0)
  };

  summary.accuracy = summary.totalTests > 0
    ? (summary.passed / summary.totalTests * 100).toFixed(1)
    : 0;

  return summary;
}

function printReport(summary, args) {
  const c = CONFIG.colors;

  console.log('\n' + '='.repeat(70));
  console.log(`${c.bright}${c.cyan}   TagTeam Golden Test Corpus Results${c.reset}`);
  console.log(`${c.bright}${c.cyan}   Run Date: ${new Date().toISOString().split('T')[0]}${c.reset}`);
  console.log('='.repeat(70));

  const accuracyColor = summary.accuracy >= 95 ? c.green : summary.accuracy >= 80 ? c.yellow : c.red;
  console.log(`  Overall Accuracy: ${accuracyColor}${summary.accuracy}%${c.reset} (${summary.passed}/${summary.totalTests} tests passed)`);

  if (summary.totalTests > 0) {
    const passRate = (summary.passed / summary.totalTests * 100).toFixed(1);
    console.log(`  Pass Rate: ${passRate}%`);
    console.log(`  Failed: ${c.red}${summary.failed}${c.reset}`);
    console.log(`  Errors: ${summary.errors > 0 ? c.red : c.green}${summary.errors}${c.reset}`);
    console.log(`  Execution Time: ${summary.executionTime}ms`);
  }

  console.log('='.repeat(70) + '\n');
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  console.log(`${CONFIG.colors.bright}${CONFIG.colors.blue}🧪 TagTeam Golden Test Runner v2.0${CONFIG.colors.reset}\n`);

  // Load corpus index
  const index = loadCorpusIndex();
  console.log(`Loaded corpus index: ${index.corpuses.length} corpuses`);

  // Filter corpuses based on arguments
  const filteredCorpuses = filterCorpuses(index, args);
  console.log(`Running tests from ${filteredCorpuses.length} corpus(es)\n`);

  if (filteredCorpuses.length === 0) {
    console.log(`${CONFIG.colors.yellow}No corpuses match the filter criteria.${CONFIG.colors.reset}`);
    console.log(`Available corpuses with status='complete':`);
    index.corpuses
      .filter(c => c.status === 'complete')
      .forEach(c => console.log(`  - ${c.id} (${c.testCount} tests)`));
    return;
  }

  // Run tests
  const allResults = [];

  for (const corpusInfo of filteredCorpuses) {
    console.log(`${CONFIG.colors.bright}Testing corpus: ${corpusInfo.id}${CONFIG.colors.reset}`);

    const corpus = loadCorpus(corpusInfo);

    if (!corpus) {
      console.log(`  ${CONFIG.colors.yellow}⚠ Corpus not found or status is 'planned'${CONFIG.colors.reset}`);
      continue;
    }

    // Validate schema
    if (!args.dryRun) {
      const schemaErrors = validateSchema(corpus);
      if (schemaErrors.length > 0) {
        console.log(`  ${CONFIG.colors.red}✗ Schema validation failed:${CONFIG.colors.reset}`);
        schemaErrors.forEach(err => console.log(`    - ${err}`));
        continue;
      }
      console.log(`  ${CONFIG.colors.green}✓ Schema validation passed${CONFIG.colors.reset}`);
    }

    // Execute tests
    if (!args.dryRun) {
      for (const testCase of corpus.cases) {
        // Filter by priority
        if (args.priority && testCase.priority !== args.priority) continue;

        // Filter by tags
        if (args.tags.length > 0 && !args.tags.some(tag => testCase.tags.includes(tag))) continue;

        const result = executeTest(testCase, args);
        allResults.push(result);
      }

      console.log(`  ${CONFIG.colors.green}✓ Executed ${corpus.cases.length} test(s)${CONFIG.colors.reset}\n`);
    }
  }

  // Generate and print report
  if (!args.dryRun) {
    const summary = generateReport(allResults, args);
    printReport(summary, args);

    // Save results
    ensureResultsDir();
    saveResults(allResults, summary);

    // Generate HTML report if requested
    if (args.report) {
      generateHTMLReport(allResults, summary);
      console.log(`${CONFIG.colors.green}✓ HTML report generated: results/latest-report.html${CONFIG.colors.reset}\n`);
    }
  } else {
    console.log(`${CONFIG.colors.cyan}Dry run complete. No tests executed.${CONFIG.colors.reset}\n`);
  }
}

function ensureResultsDir() {
  if (!fs.existsSync(CONFIG.resultsDir)) {
    fs.mkdirSync(CONFIG.resultsDir, { recursive: true });
  }
}

function saveResults(results, summary) {
  const timestamp = new Date().toISOString();

  // V7.4 MEMORY-FIX: Results are already lightweight from executeTest()
  // No graph objects, no expectedOutput, no extractedRoles stored
  const resultData = {
    timestamp,
    summary,
    results
  };

  const resultFile = path.join(CONFIG.resultsDir, 'latest-results.json');
  fs.writeFileSync(resultFile, JSON.stringify(resultData, null, 2));

  // Append to history CSV
  const historyEntry = `${timestamp},${summary.accuracy},${summary.passed},${summary.failed}\n`;
  fs.appendFileSync(CONFIG.historyFile, historyEntry);
}

function generateHTMLReport(results, summary) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>TagTeam Golden Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .metric { flex: 1; background: #ecf0f1; padding: 15px; border-radius: 5px; text-align: center; }
    .metric-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
    .metric-label { color: #7f8c8d; font-size: 0.9em; }
    .passed { color: #27ae60; }
    .failed { color: #e74c3c; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #34495e; color: white; }
    tr:hover { background: #f9f9f9; }
    .badge { padding: 4px 8px; border-radius: 3px; font-size: 0.85em; }
    .badge-p0 { background: #e74c3c; color: white; }
    .badge-p1 { background: #f39c12; color: white; }
    .badge-p2 { background: #3498db; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 TagTeam Golden Test Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>

    <div class="summary">
      <div class="metric">
        <div class="metric-value ${summary.accuracy >= 95 ? 'passed' : 'failed'}">${summary.accuracy}%</div>
        <div class="metric-label">Accuracy</div>
      </div>
      <div class="metric">
        <div class="metric-value passed">${summary.passed}</div>
        <div class="metric-label">Passed</div>
      </div>
      <div class="metric">
        <div class="metric-value failed">${summary.failed}</div>
        <div class="metric-label">Failed</div>
      </div>
      <div class="metric">
        <div class="metric-value">${summary.totalTests}</div>
        <div class="metric-label">Total Tests</div>
      </div>
    </div>

    <h2>Test Results</h2>
    <p>Placeholder: Detailed test results would appear here in production version.</p>
  </div>
</body>
</html>`;

  const reportFile = path.join(CONFIG.resultsDir, 'latest-report.html');
  fs.writeFileSync(reportFile, html);
}

// ============================================================================
// Entry Point
// ============================================================================

if (require.main === module) {
  main().catch(error => {
    console.error(`${CONFIG.colors.red}Fatal error:${CONFIG.colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { executeTest, compareResults, validateSchema };
