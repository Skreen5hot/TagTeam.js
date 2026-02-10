#!/usr/bin/env node

/**
 * Regression Detection for TagTeam Golden Tests
 *
 * Compares current test run with previous results to detect:
 * - Tests that previously passed but now fail
 * - Tests that previously failed but now pass (improvements)
 * - Changes in accuracy metrics
 * - Performance regressions
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  resultsDir: path.join(__dirname, 'results'),
  latestResults: path.join(__dirname, 'results', 'latest-results.json'),
  previousResults: path.join(__dirname, 'results', 'previous-results.json'),
  historyFile: path.join(__dirname, 'results', 'accuracy-history.csv'),
  regressionReport: path.join(__dirname, 'results', 'regression-report.json')
};

// ============================================================================
// Data Loading
// ============================================================================

function loadResults(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

function loadHistory() {
  if (!fs.existsSync(CONFIG.historyFile)) {
    return [];
  }

  const data = fs.readFileSync(CONFIG.historyFile, 'utf8');
  const lines = data.trim().split('\n').slice(1); // Skip header

  return lines.map(line => {
    const [timestamp, accuracy, passed, failed] = line.split(',');
    return {
      timestamp: new Date(timestamp),
      accuracy: parseFloat(accuracy),
      passed: parseInt(passed),
      failed: parseInt(failed)
    };
  });
}

// ============================================================================
// Regression Detection
// ============================================================================

function detectRegressions(currentRun, previousRun) {
  const regressions = {
    timestamp: new Date().toISOString(),
    summary: {
      totalRegressions: 0,
      totalImprovements: 0,
      accuracyChange: 0,
      newFailures: [],
      newPasses: []
    },
    details: []
  };

  if (!previousRun) {
    console.log('ℹ️  No previous results found. Skipping regression detection.');
    return regressions;
  }

  // Create maps for quick lookup
  const currentTests = new Map();
  currentRun.results.forEach(r => currentTests.set(r.id, r));

  const previousTests = new Map();
  previousRun.results.forEach(r => previousTests.set(r.id, r));

  // Compare test results
  for (const [testId, currentTest] of currentTests) {
    const previousTest = previousTests.get(testId);

    if (!previousTest) {
      // New test added
      continue;
    }

    // Check for regression (was passing, now failing)
    if (previousTest.passed && !currentTest.passed) {
      regressions.summary.totalRegressions++;
      regressions.summary.newFailures.push({
        id: testId,
        input: currentTest.input,
        corpus: currentTest.corpus,
        previousStatus: 'passed',
        currentStatus: 'failed',
        error: currentTest.error
      });

      regressions.details.push({
        type: 'regression',
        testId,
        message: `Test ${testId} regressed: was passing, now failing`,
        severity: 'high'
      });
    }

    // Check for improvement (was failing, now passing)
    if (!previousTest.passed && currentTest.passed) {
      regressions.summary.totalImprovements++;
      regressions.summary.newPasses.push({
        id: testId,
        input: currentTest.input,
        corpus: currentTest.corpus,
        previousStatus: 'failed',
        currentStatus: 'passed'
      });

      regressions.details.push({
        type: 'improvement',
        testId,
        message: `Test ${testId} improved: was failing, now passing`,
        severity: 'low'
      });
    }
  }

  // Calculate accuracy change
  const currentAccuracy = parseFloat(currentRun.summary.accuracy);
  const previousAccuracy = parseFloat(previousRun.summary.accuracy);
  regressions.summary.accuracyChange = (currentAccuracy - previousAccuracy).toFixed(2);

  // Check for significant accuracy drop
  if (regressions.summary.accuracyChange < -5) {
    regressions.details.push({
      type: 'accuracy-regression',
      message: `Accuracy dropped by ${Math.abs(regressions.summary.accuracyChange)}%`,
      severity: 'critical',
      previousAccuracy,
      currentAccuracy
    });
  }

  return regressions;
}

// ============================================================================
// Trend Analysis
// ============================================================================

function analyzeTrends(history) {
  if (history.length < 2) {
    return {
      trend: 'unknown',
      message: 'Insufficient data for trend analysis'
    };
  }

  const recent = history.slice(-10); // Last 10 runs
  const accuracies = recent.map(h => h.accuracy);

  // Calculate simple moving average
  const avg = accuracies.reduce((sum, val) => sum + val, 0) / accuracies.length;

  // Calculate trend (positive = improving, negative = declining)
  const first = accuracies[0];
  const last = accuracies[accuracies.length - 1];
  const trend = last - first;

  // Check for instability (high variance)
  const variance = accuracies.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / accuracies.length;
  const stdDev = Math.sqrt(variance);

  let analysis = {
    average: avg.toFixed(2),
    trend: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable',
    trendValue: trend.toFixed(2),
    stability: stdDev < 2 ? 'stable' : stdDev < 5 ? 'moderate' : 'unstable',
    standardDeviation: stdDev.toFixed(2),
    message: ''
  };

  if (trend > 5) {
    analysis.message = '🎉 Tests are improving over time!';
  } else if (trend < -5) {
    analysis.message = '⚠️ Warning: Test accuracy declining over time';
  } else if (stdDev > 5) {
    analysis.message = '⚠️ Warning: High variance in test results - investigate instability';
  } else {
    analysis.message = '✅ Test suite is stable';
  }

  return analysis;
}

// ============================================================================
// Reporting
// ============================================================================

function printRegressionReport(regressions, trends) {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 Regression Detection Report');
  console.log('='.repeat(70));

  console.log(`\n📊 Summary:`);
  console.log(`   Regressions: ${regressions.summary.totalRegressions}`);
  console.log(`   Improvements: ${regressions.summary.totalImprovements}`);
  console.log(`   Accuracy Change: ${regressions.summary.accuracyChange > 0 ? '+' : ''}${regressions.summary.accuracyChange}%`);

  if (regressions.summary.totalRegressions > 0) {
    console.log(`\n❌ New Failures (${regressions.summary.newFailures.length}):`);
    regressions.summary.newFailures.forEach(f => {
      console.log(`   - ${f.id}: "${f.input}"`);
      if (f.error) {
        console.log(`     Error: ${f.error}`);
      }
    });
  }

  if (regressions.summary.totalImprovements > 0) {
    console.log(`\n✅ New Passes (${regressions.summary.newPasses.length}):`);
    regressions.summary.newPasses.forEach(p => {
      console.log(`   - ${p.id}: "${p.input}"`);
    });
  }

  console.log(`\n📈 Trend Analysis:`);
  console.log(`   Average Accuracy: ${trends.average}%`);
  console.log(`   Trend: ${trends.trend} (${trends.trendValue > 0 ? '+' : ''}${trends.trendValue}%)`);
  console.log(`   Stability: ${trends.stability} (σ = ${trends.standardDeviation})`);
  console.log(`   ${trends.message}`);

  console.log('\n' + '='.repeat(70));

  // Exit with error code if there are regressions
  if (regressions.summary.totalRegressions > 0) {
    console.log('\n⚠️  Regressions detected! Review the failures above.');
    return 1;
  }

  console.log('\n✅ No regressions detected.');
  return 0;
}

function saveRegressionReport(regressions, trends) {
  const report = {
    ...regressions,
    trends
  };

  fs.writeFileSync(CONFIG.regressionReport, JSON.stringify(report, null, 2));
  console.log(`\n💾 Regression report saved: ${CONFIG.regressionReport}`);
}

// ============================================================================
// Main
// ============================================================================

function main() {
  console.log('🔍 Analyzing test results for regressions...\n');

  // Load results
  const currentRun = loadResults(CONFIG.latestResults);
  const previousRun = loadResults(CONFIG.previousResults);
  const history = loadHistory();

  if (!currentRun) {
    console.error('❌ No current test results found. Run tests first with: npm run test:golden');
    process.exit(1);
  }

  // Save current as previous for next run
  if (fs.existsSync(CONFIG.latestResults)) {
    fs.copyFileSync(CONFIG.latestResults, CONFIG.previousResults);
  }

  // Detect regressions
  const regressions = detectRegressions(currentRun, previousRun);

  // Analyze trends
  const trends = analyzeTrends(history);

  // Generate report
  saveRegressionReport(regressions, trends);

  // Print report
  const exitCode = printRegressionReport(regressions, trends);

  process.exit(exitCode);
}

if (require.main === module) {
  main();
}

module.exports = { detectRegressions, analyzeTrends };
