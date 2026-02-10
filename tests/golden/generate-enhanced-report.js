#!/usr/bin/env node

/**
 * Enhanced Report Generator for TagTeam Golden Tests
 *
 * Generates comprehensive HTML reports with:
 * - Charts and visualizations
 * - Per-corpus breakdown
 * - Per-phase breakdown
 * - Per-category breakdown
 * - Historical trend analysis
 * - Regression detection
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  goldenDir: path.join(__dirname),
  corpusIndex: path.join(__dirname, 'corpus-index.json'),
  resultsDir: path.join(__dirname, 'results'),
  latestResults: path.join(__dirname, 'results', 'latest-results.json'),
  historyFile: path.join(__dirname, 'results', 'accuracy-history.csv'),
  htmlReport: path.join(__dirname, 'results', 'enhanced-report.html')
};

// ============================================================================
// Data Loading
// ============================================================================

function loadCorpusIndex() {
  const data = fs.readFileSync(CONFIG.corpusIndex, 'utf8');
  return JSON.parse(data);
}

function loadLatestResults() {
  if (!fs.existsSync(CONFIG.latestResults)) {
    return null;
  }
  const data = fs.readFileSync(CONFIG.latestResults, 'utf8');
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
// Metrics Calculation
// ============================================================================

function calculateDetailedMetrics(results, corpusIndex) {
  const metrics = {
    overall: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      accuracy: 0
    },
    byPriority: {
      P0: { total: 0, passed: 0, failed: 0, accuracy: 0 },
      P1: { total: 0, passed: 0, failed: 0, accuracy: 0 },
      P2: { total: 0, passed: 0, failed: 0, accuracy: 0 }
    },
    byCorpus: {},
    byPhase: {},
    byCategory: {}
  };

  // Overall accuracy
  metrics.overall.accuracy = metrics.overall.total > 0
    ? ((metrics.overall.passed / metrics.overall.total) * 100).toFixed(1)
    : 0;

  // Group results by corpus for easier lookup
  const resultsByCorpus = {};
  results.forEach(r => {
    if (!resultsByCorpus[r.corpus]) {
      resultsByCorpus[r.corpus] = [];
    }
    resultsByCorpus[r.corpus].push(r);
  });

  // Calculate per-corpus metrics
  corpusIndex.corpuses.forEach(corpus => {
    const corpusResults = resultsByCorpus[corpus.id] || [];
    const passed = corpusResults.filter(r => r.passed).length;
    const total = corpusResults.length;

    if (total > 0) {
      metrics.byCorpus[corpus.id] = {
        name: corpus.name,
        total,
        passed,
        failed: total - passed,
        accuracy: ((passed / total) * 100).toFixed(1),
        priority: corpus.priority,
        phase: corpus.phase,
        category: corpus.category
      };

      // Aggregate by priority
      const priority = corpus.priority;
      metrics.byPriority[priority].total += total;
      metrics.byPriority[priority].passed += passed;
      metrics.byPriority[priority].failed += (total - passed);

      // Aggregate by phase
      const phase = corpus.phase.toString();
      if (!metrics.byPhase[phase]) {
        metrics.byPhase[phase] = { total: 0, passed: 0, failed: 0, accuracy: 0 };
      }
      metrics.byPhase[phase].total += total;
      metrics.byPhase[phase].passed += passed;
      metrics.byPhase[phase].failed += (total - passed);

      // Aggregate by category
      const category = corpus.category;
      if (!metrics.byCategory[category]) {
        metrics.byCategory[category] = { total: 0, passed: 0, failed: 0, accuracy: 0 };
      }
      metrics.byCategory[category].total += total;
      metrics.byCategory[category].passed += passed;
      metrics.byCategory[category].failed += (total - passed);
    }
  });

  // Calculate accuracies for aggregated metrics
  ['P0', 'P1', 'P2'].forEach(priority => {
    const p = metrics.byPriority[priority];
    p.accuracy = p.total > 0 ? ((p.passed / p.total) * 100).toFixed(1) : 0;
  });

  Object.values(metrics.byPhase).forEach(phase => {
    phase.accuracy = phase.total > 0 ? ((phase.passed / phase.total) * 100).toFixed(1) : 0;
  });

  Object.values(metrics.byCategory).forEach(category => {
    category.accuracy = category.total > 0 ? ((category.passed / category.total) * 100).toFixed(1) : 0;
  });

  return metrics;
}

// ============================================================================
// HTML Report Generation
// ============================================================================

function generateHTMLReport(metrics, corpusIndex, history) {
  const timestamp = new Date().toLocaleString();

  // Prepare chart data
  const historyLabels = history.slice(-10).map(h => h.timestamp.toLocaleDateString());
  const historyData = history.slice(-10).map(h => h.accuracy);

  const corpusLabels = Object.keys(metrics.byCorpus);
  const corpusData = corpusLabels.map(id => metrics.byCorpus[id].accuracy);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TagTeam Golden Test Report - Enhanced</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #f5f7fa;
      color: #2c3e50;
      line-height: 1.6;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .subtitle { opacity: 0.9; font-size: 1.1em; }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }
    .metric-card:hover { transform: translateY(-5px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .metric-value {
      font-size: 3em;
      font-weight: bold;
      margin: 10px 0;
    }
    .metric-label {
      color: #7f8c8d;
      text-transform: uppercase;
      font-size: 0.9em;
      letter-spacing: 1px;
    }
    .metric-trend {
      font-size: 0.9em;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #ecf0f1;
    }

    .passed { color: #27ae60; }
    .failed { color: #e74c3c; }
    .warning { color: #f39c12; }

    .chart-container {
      background: white;
      padding: 25px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .chart-container h2 {
      margin-bottom: 20px;
      color: #34495e;
      font-size: 1.5em;
    }
    .chart-wrapper {
      position: relative;
      height: 300px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    th, td {
      padding: 15px;
      text-align: left;
    }
    th {
      background: #34495e;
      color: white;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.85em;
      letter-spacing: 1px;
    }
    tr:nth-child(even) { background: #f8f9fa; }
    tr:hover { background: #e8f4f8; }

    .badge {
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
      display: inline-block;
    }
    .badge-p0 { background: #e74c3c; color: white; }
    .badge-p1 { background: #f39c12; color: white; }
    .badge-p2 { background: #3498db; color: white; }
    .badge-success { background: #27ae60; color: white; }
    .badge-warning { background: #f39c12; color: white; }
    .badge-danger { background: #e74c3c; color: white; }

    .progress-bar {
      background: #ecf0f1;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #27ae60, #2ecc71);
      transition: width 0.3s ease;
    }

    .section {
      background: white;
      padding: 25px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .section h2 {
      color: #34495e;
      margin-bottom: 20px;
      font-size: 1.5em;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }

    footer {
      text-align: center;
      padding: 20px;
      color: #7f8c8d;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🧪 TagTeam Golden Test Report</h1>
      <div class="subtitle">Generated: ${timestamp}</div>
    </header>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Overall Accuracy</div>
        <div class="metric-value ${metrics.overall.accuracy >= 95 ? 'passed' : metrics.overall.accuracy >= 80 ? 'warning' : 'failed'}">
          ${metrics.overall.accuracy}%
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${metrics.overall.accuracy}%"></div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Tests Passed</div>
        <div class="metric-value passed">${metrics.overall.passed}</div>
        <div class="metric-trend">of ${metrics.overall.total} total tests</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Tests Failed</div>
        <div class="metric-value ${metrics.overall.failed === 0 ? 'passed' : 'failed'}">
          ${metrics.overall.failed}
        </div>
        <div class="metric-trend">${metrics.overall.failed === 0 ? '✨ Perfect score!' : '⚠️ Needs attention'}</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">P0 Critical Pass Rate</div>
        <div class="metric-value ${metrics.byPriority.P0.accuracy >= 100 ? 'passed' : 'failed'}">
          ${metrics.byPriority.P0.accuracy}%
        </div>
        <div class="metric-trend">${metrics.byPriority.P0.passed}/${metrics.byPriority.P0.total} tests</div>
      </div>
    </div>

    <div class="chart-container">
      <h2>📈 Accuracy Trend (Last 10 Runs)</h2>
      <div class="chart-wrapper">
        <canvas id="historyChart"></canvas>
      </div>
    </div>

    <div class="chart-container">
      <h2>📊 Accuracy by Corpus</h2>
      <div class="chart-wrapper">
        <canvas id="corpusChart"></canvas>
      </div>
    </div>

    <div class="section">
      <h2>🎯 Pass Rate by Priority</h2>
      <table>
        <thead>
          <tr>
            <th>Priority</th>
            <th>Total Tests</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge badge-p0">P0</span></td>
            <td>${metrics.byPriority.P0.total}</td>
            <td class="passed">${metrics.byPriority.P0.passed}</td>
            <td class="failed">${metrics.byPriority.P0.failed}</td>
            <td>
              <strong class="${metrics.byPriority.P0.accuracy >= 100 ? 'passed' : 'failed'}">
                ${metrics.byPriority.P0.accuracy}%
              </strong>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${metrics.byPriority.P0.accuracy}%"></div>
              </div>
            </td>
          </tr>
          <tr>
            <td><span class="badge badge-p1">P1</span></td>
            <td>${metrics.byPriority.P1.total}</td>
            <td class="passed">${metrics.byPriority.P1.passed}</td>
            <td class="failed">${metrics.byPriority.P1.failed}</td>
            <td>
              <strong class="${metrics.byPriority.P1.accuracy >= 95 ? 'passed' : 'warning'}">
                ${metrics.byPriority.P1.accuracy}%
              </strong>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${metrics.byPriority.P1.accuracy}%"></div>
              </div>
            </td>
          </tr>
          <tr>
            <td><span class="badge badge-p2">P2</span></td>
            <td>${metrics.byPriority.P2.total}</td>
            <td class="passed">${metrics.byPriority.P2.passed}</td>
            <td class="failed">${metrics.byPriority.P2.failed}</td>
            <td>
              <strong class="${metrics.byPriority.P2.accuracy >= 70 ? 'passed' : 'warning'}">
                ${metrics.byPriority.P2.accuracy}%
              </strong>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${metrics.byPriority.P2.accuracy}%"></div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>📁 Breakdown by Corpus</h2>
      <table>
        <thead>
          <tr>
            <th>Corpus</th>
            <th>Priority</th>
            <th>Phase</th>
            <th>Total</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          ${Object.keys(metrics.byCorpus)
            .map(id => {
              const corpus = metrics.byCorpus[id];
              const statusBadge = corpus.accuracy >= 95
                ? 'badge-success'
                : corpus.accuracy >= 80
                  ? 'badge-warning'
                  : 'badge-danger';
              return `
            <tr>
              <td><strong>${corpus.name}</strong></td>
              <td><span class="badge badge-${corpus.priority.toLowerCase()}">${corpus.priority}</span></td>
              <td>${corpus.phase}</td>
              <td>${corpus.total}</td>
              <td class="passed">${corpus.passed}</td>
              <td class="failed">${corpus.failed}</td>
              <td>
                <span class="badge ${statusBadge}">${corpus.accuracy}%</span>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${corpus.accuracy}%"></div>
                </div>
              </td>
            </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>🏷️ Breakdown by Category</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Total Tests</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          ${Object.keys(metrics.byCategory)
            .map(category => {
              const cat = metrics.byCategory[category];
              const statusBadge = cat.accuracy >= 95
                ? 'badge-success'
                : cat.accuracy >= 80
                  ? 'badge-warning'
                  : 'badge-danger';
              return `
            <tr>
              <td><strong>${category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong></td>
              <td>${cat.total}</td>
              <td class="passed">${cat.passed}</td>
              <td class="failed">${cat.failed}</td>
              <td>
                <span class="badge ${statusBadge}">${cat.accuracy}%</span>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${cat.accuracy}%"></div>
                </div>
              </td>
            </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </div>

    <footer>
      <p>TagTeam.js Golden Test Corpus • v3.0.0-alpha.1</p>
      <p>Generated by enhanced-report-generator v2.0</p>
    </footer>
  </div>

  <script>
    // History Chart
    const historyCtx = document.getElementById('historyChart').getContext('2d');
    new Chart(historyCtx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(historyLabels)},
        datasets: [{
          label: 'Accuracy %',
          data: ${JSON.stringify(historyData)},
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14 },
            bodyFont: { size: 13 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: value => value + '%' }
          }
        }
      }
    });

    // Corpus Chart
    const corpusCtx = document.getElementById('corpusChart').getContext('2d');
    new Chart(corpusCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(corpusLabels.map(id => metrics.byCorpus[id].name))},
        datasets: [{
          label: 'Accuracy %',
          data: ${JSON.stringify(corpusData)},
          backgroundColor: 'rgba(102, 126, 234, 0.6)',
          borderColor: '#667eea',
          borderWidth: 2,
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: value => value + '%' }
          }
        }
      }
    });
  </script>
</body>
</html>`;

  return html;
}

// ============================================================================
// Main
// ============================================================================

function main() {
  console.log('🎨 Generating enhanced HTML report...\n');

  // Load data
  const corpusIndex = loadCorpusIndex();
  const resultsData = loadLatestResults();
  const history = loadHistory();

  if (!resultsData) {
    console.error('❌ No test results found. Run tests first with: npm run test:golden');
    process.exit(1);
  }

  // Calculate metrics
  const metrics = calculateDetailedMetrics(resultsData.results, corpusIndex);

  // Generate HTML report
  const html = generateHTMLReport(metrics, corpusIndex, history);
  fs.writeFileSync(CONFIG.htmlReport, html);

  console.log(`✅ Enhanced HTML report generated: ${CONFIG.htmlReport}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Overall Accuracy: ${metrics.overall.accuracy}%`);
  console.log(`   Passed: ${metrics.overall.passed}/${metrics.overall.total}`);
  console.log(`   Failed: ${metrics.overall.failed}`);
  console.log(`\n🎯 By Priority:`);
  console.log(`   P0: ${metrics.byPriority.P0.accuracy}% (${metrics.byPriority.P0.passed}/${metrics.byPriority.P0.total})`);
  console.log(`   P1: ${metrics.byPriority.P1.accuracy}% (${metrics.byPriority.P1.passed}/${metrics.byPriority.P1.total})`);
  console.log(`   P2: ${metrics.byPriority.P2.accuracy}% (${metrics.byPriority.P2.passed}/${metrics.byPriority.P2.total})`);
  console.log(`\n✨ Open the report in your browser to see visualizations!`);
}

if (require.main === module) {
  main();
}

module.exports = { calculateDetailedMetrics, generateHTMLReport };
