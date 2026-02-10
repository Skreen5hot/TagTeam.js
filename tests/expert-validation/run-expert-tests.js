#!/usr/bin/env node

/**
 * Expert Validation Test Runner
 *
 * Runs bulk tests from expert-designed test matrices
 * Generates detailed reports for CCO/SME review
 */

const fs = require('fs');
const path = require('path');

// Load TagTeam (adjust path as needed)
const TagTeam = require('../../dist/tagteam.js');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  testInputFile: path.join(__dirname, 'test-matrix.json'),
  outputDir: path.join(__dirname, 'results'),
  reportFile: path.join(__dirname, 'results', 'expert-validation-report.json'),
  htmlReport: path.join(__dirname, 'results', 'expert-validation-report.html')
};

// ============================================================================
// Test Execution
// ============================================================================

async function runSingleTest(test) {
  console.log(`\n  Testing: ${test.id}`);
  console.log(`  Sentence: "${test.sentence}"`);

  try {
    const startTime = Date.now();

    const result = TagTeam.buildGraph(test.sentence, {
      preserveAmbiguity: true,
      returnJSON: true
    });

    const endTime = Date.now();

    // Analyze result for common issues
    const analysis = analyzeResult(result, test);

    return {
      ...test,
      status: analysis.hasIssues ? 'fail' : 'pass',
      output: result,
      analysis,
      executionTime: endTime - startTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);

    return {
      ...test,
      status: 'error',
      output: null,
      error: error.message,
      executionTime: 0,
      timestamp: new Date().toISOString()
    };
  }
}

function analyzeResult(result, test) {
  const issues = [];
  let hasIssues = false;

  // Basic validation
  if (!result) {
    issues.push({ type: 'null-result', severity: 'critical', message: 'Result is null' });
    hasIssues = true;
  }

  if (!result.acts || result.acts.length === 0) {
    issues.push({ type: 'no-acts', severity: 'critical', message: 'No acts detected' });
    hasIssues = true;
  }

  // Category-specific checks
  if (test.category.includes('subordination')) {
    // Check for expected clause count
    if (result.acts && result.acts.length < 2) {
      issues.push({
        type: 'missing-clause',
        severity: 'high',
        message: 'Expected 2 clauses (subordinate + main), found fewer'
      });
      hasIssues = true;
    }

    // Check for clause relations
    if (!result.clauseRelations || result.clauseRelations.length === 0) {
      issues.push({
        type: 'missing-relation',
        severity: 'high',
        message: 'No clause relations found (expected temporal/conditional link)'
      });
      hasIssues = true;
    }
  }

  if (test.category.includes('relative')) {
    // Check for relative clause markers
    const hasRelativeMarker = JSON.stringify(result).includes('relative') ||
                               JSON.stringify(result).includes('who') ||
                               JSON.stringify(result).includes('which') ||
                               JSON.stringify(result).includes('that');

    if (!hasRelativeMarker) {
      issues.push({
        type: 'missing-relative-marker',
        severity: 'medium',
        message: 'Relative clause structure not detected'
      });
    }
  }

  // Check for argument bleeding heuristics
  if (result.acts) {
    result.acts.forEach((act, idx) => {
      // Check if act has too many arguments (possible bleeding)
      const argCount = (act['cco:affects'] ? 1 : 0) +
                       (act['cco:has_participant'] ? 1 : 0) +
                       (act['cco:uses_tool'] ? 1 : 0);

      if (argCount > 3) {
        issues.push({
          type: 'excessive-arguments',
          severity: 'medium',
          message: `Act ${idx} has ${argCount} arguments (possible bleeding)`,
          actId: act['@id']
        });
      }
    });
  }

  return {
    hasIssues,
    issues,
    summary: `${issues.length} potential issues detected`
  };
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(results) {
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail' || r.status === 'error').length;
  const accuracy = results.length > 0 ? (passed / results.length * 100).toFixed(1) : 0;

  const report = {
    metadata: {
      timestamp: new Date().toISOString(),
      tagteamVersion: '7.0',
      totalTests: results.length,
      passed,
      failed,
      accuracy: `${accuracy}%`
    },
    summary: {
      byCategory: {},
      byPriority: {}
    },
    results
  };

  // Aggregate by category
  results.forEach(r => {
    if (!report.summary.byCategory[r.category]) {
      report.summary.byCategory[r.category] = { total: 0, passed: 0, failed: 0 };
    }
    report.summary.byCategory[r.category].total++;
    if (r.status === 'pass') report.summary.byCategory[r.category].passed++;
    else report.summary.byCategory[r.category].failed++;
  });

  return report;
}

function printConsoleReport(report) {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 Expert Validation Test Results');
  console.log('='.repeat(70));
  console.log(`\n📊 Summary:`);
  console.log(`   Total Tests: ${report.metadata.totalTests}`);
  console.log(`   Passed: ${report.metadata.passed}`);
  console.log(`   Failed: ${report.metadata.failed}`);
  console.log(`   Accuracy: ${report.metadata.accuracy}`);

  console.log(`\n📁 By Category:`);
  Object.entries(report.summary.byCategory).forEach(([category, stats]) => {
    const accuracy = ((stats.passed / stats.total) * 100).toFixed(1);
    const icon = accuracy === '100.0' ? '✅' : accuracy >= '80.0' ? '⚠️' : '❌';
    console.log(`   ${icon} ${category}: ${stats.passed}/${stats.total} (${accuracy}%)`);
  });

  console.log('\n' + '='.repeat(70));
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('🧪 TagTeam Expert Validation Test Runner\n');

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Load test matrix
  let tests = [];
  if (fs.existsSync(CONFIG.testInputFile)) {
    const data = fs.readFileSync(CONFIG.testInputFile, 'utf8');
    tests = JSON.parse(data);
    console.log(`📖 Loaded ${tests.length} tests from ${CONFIG.testInputFile}\n`);
  } else {
    console.log('⚠️  No test-matrix.json found. Creating template...\n');

    // Create template
    const template = [
      {
        id: "1.2-subordination-if",
        category: "subordination-prefix",
        sentence: "If the server fails, the admin receives an alert.",
        hypothesis: "Likely FAIL: Same comma-dependency as 'When'",
        priority: "P0"
      },
      {
        id: "2.1-relative-subject",
        category: "relative-clause",
        sentence: "The engineer who designed the system left.",
        hypothesis: "High risk: Subject bleeding or fragmentation",
        priority: "P1"
      }
    ];

    fs.writeFileSync(CONFIG.testInputFile, JSON.stringify(template, null, 2));
    console.log(`✅ Created template at ${CONFIG.testInputFile}`);
    console.log('   Edit this file and run again.\n');
    return;
  }

  // Run tests
  console.log('▶ Running tests...\n');
  const results = [];

  for (const test of tests) {
    const result = await runSingleTest(test);
    results.push(result);

    const icon = result.status === 'pass' ? '✅' : result.status === 'error' ? '💥' : '❌';
    console.log(`  ${icon} ${result.status.toUpperCase()}: ${result.id}`);

    if (result.analysis && result.analysis.issues.length > 0) {
      result.analysis.issues.forEach(issue => {
        console.log(`     - ${issue.severity.toUpperCase()}: ${issue.message}`);
      });
    }
  }

  // Generate report
  const report = generateReport(results);

  // Save JSON report
  fs.writeFileSync(CONFIG.reportFile, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved: ${CONFIG.reportFile}`);

  // Print console summary
  printConsoleReport(report);

  console.log(`\n📄 To view detailed results:`);
  console.log(`   1. Open: tests/expert-validation/expert-test-harness.html`);
  console.log(`   2. Or share: ${CONFIG.reportFile}\n`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runSingleTest, generateReport };
