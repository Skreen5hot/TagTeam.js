#!/usr/bin/env node

/**
 * Level 1 Component Test Runner
 *
 * Runs white-box diagnostic tests against individual TagTeam components.
 * Each test validates against authoritative linguistic or ontological sources.
 *
 * Expected failure rate on V7.0: 30-50% (this is GOOD - shows diagnostic value)
 */

const fs = require('fs');
const path = require('path');

// Import TagTeam (ensure it's built first)
let TagTeam;
try {
  TagTeam = require('../../dist/tagteam.js');
} catch (e) {
  console.error('❌ ERROR: TagTeam not found. Run `npm run build` first.');
  process.exit(1);
}

// ============================================================================
// Configuration
// ============================================================================

const COMPONENT_TEST_DIR = __dirname;
const RESULTS_DIR = path.join(COMPONENT_TEST_DIR, 'results');

const CATEGORIES = {
  'clause-segmentation': {
    files: [
      'clause-segmentation/prefix-subordination.json',
      'clause-segmentation/relative-clauses.json'
    ],
    component: 'ClauseSegmenter'
  }
  // Future categories:
  // 'entity-extraction': { files: [...], component: 'EntityExtractor' },
  // 'semantic-roles': { files: [...], component: 'RoleDetector' },
  // 'boundary-enforcement': { files: [...], component: 'CrossComponent' }
};

// ============================================================================
// Test Execution
// ============================================================================

/**
 * Run a single component test
 */
function runComponentTest(test) {
  try {
    // Run TagTeam.buildGraph
    const result = TagTeam.buildGraph(test.input, {
      preserveAmbiguity: true,
      returnJSON: true
    });

    // Analyze result based on test category
    const analysis = analyzeResult(result, test);

    return {
      ...test,
      status: analysis.passed ? 'pass' : 'fail',
      actual: result,
      analysis: analysis,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      ...test,
      status: 'error',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Analyze TagTeam output against expected behavior
 */
function analyzeResult(result, test) {
  const analysis = {
    passed: false,
    issues: [],
    observations: []
  };

  // Extract acts from JSON-LD @graph
  // Use tagteam:verb to identify acts (more reliable than @type filtering)
  const acts = result['@graph'] ? result['@graph'].filter(node =>
    node['tagteam:verb']  // Any node with a verb is an act
  ) : [];

  // Category-specific analysis
  if (test.category.startsWith('prefix-subordination')) {
    return analyzePrefixSubordination(acts, result, test);
  } else if (test.category.startsWith('relative-clause')) {
    return analyzeRelativeClause(acts, result, test);
  }

  // Default analysis
  analysis.observations.push(`Found ${acts.length} acts in output`);
  return analysis;
}

/**
 * Analyze prefix subordination test
 */
function analyzePrefixSubordination(acts, result, test) {
  const analysis = {
    passed: false,
    issues: [],
    observations: []
  };

  // Expected: 2 acts (subordinate clause + main clause)
  const expectedActCount = 2;
  const actualActCount = acts.length;

  analysis.observations.push(`Expected ${expectedActCount} acts, found ${actualActCount}`);

  if (actualActCount !== expectedActCount) {
    analysis.issues.push(`Wrong act count: expected ${expectedActCount}, got ${actualActCount}`);
  }

  // Check for argument bleeding across comma boundary
  // In "If X fails, Y receives Z", "fails" should NOT have Y or Z as arguments
  const commaPos = test.input.indexOf(',');
  if (commaPos !== -1) {
    const beforeComma = test.input.substring(0, commaPos).toLowerCase();
    const afterComma = test.input.substring(commaPos + 1).toLowerCase();

    acts.forEach((act, idx) => {
      const verb = act['tagteam:verb'] || '';
      const actStart = act['tagteam:startPosition'];

      // Check if this act's position is in the prefix clause (before comma)
      if (actStart !== undefined && actStart < commaPos) {
        // This act should only reference entities from BEFORE comma
        const args = [];
        if (act['cco:has_agent']) args.push({ role: 'agent', value: act['cco:has_agent'] });
        if (act['cco:has_patient']) args.push({ role: 'patient', value: act['cco:has_patient'] });
        if (act['cco:affects']) args.push({ role: 'affects', value: act['cco:affects'] });

        // Check if any argument references text from AFTER comma
        args.forEach(arg => {
          const argId = typeof arg.value === 'string' ? arg.value : arg.value['@id'];

          // Find entity in @graph
          const entity = result['@graph'].find(node => node['@id'] === argId);
          if (entity && entity['rdfs:label']) {
            const entityLabel = entity['rdfs:label'].toLowerCase().replace('entity of ', '');

            // Check if entity text appears after comma
            if (afterComma.includes(entityLabel)) {
              analysis.issues.push(
                `ARGUMENT BLEEDING: Act "${verb}" (before comma) has ${arg.role} "${entity['rdfs:label']}" (after comma)`
              );
            }
          }
        });
      }
    });
  }

  // Check for clause relation
  const hasClauseRelation = result['@graph'].some(node =>
    node['@type'] && (
      node['@type'].some(t => t.includes('ClauseRelation')) ||  // Check if any type includes 'ClauseRelation'
      node['tagteam:clauseRelation']
    )
  );

  if (!hasClauseRelation) {
    analysis.issues.push('No clause relation detected (subordination not recognized)');
  } else {
    analysis.observations.push('Clause relation detected');
  }

  analysis.passed = analysis.issues.length === 0;
  return analysis;
}

/**
 * Analyze relative clause test
 */
function analyzeRelativeClause(acts, result, test) {
  const analysis = {
    passed: false,
    issues: [],
    observations: []
  };

  // Extract relativizer from test
  const relativizers = ['who', 'which', 'that', 'whom', 'whose'];
  const usedRelativizer = relativizers.find(rel => test.input.toLowerCase().includes(` ${rel} `));

  if (usedRelativizer) {
    // Check if relativizer was instantiated as separate entity
    const relativizerEntity = result['@graph'].find(node =>
      node['rdfs:label'] &&
      node['rdfs:label'].toLowerCase().includes(usedRelativizer)
    );

    if (relativizerEntity) {
      analysis.issues.push(
        `FRAGMENTATION: Relativizer "${usedRelativizer}" instantiated as separate entity: ${relativizerEntity['@id']}`
      );
    } else {
      analysis.observations.push(`Relativizer "${usedRelativizer}" not instantiated (good)`);
    }

    // Check for anaphoric link
    const hasAnaphoricLink = result['@graph'].some(node =>
      node['tagteam:anaphor'] ||
      node['tagteam:antecedent'] ||
      (node['@type'] && node['@type'].includes('AnaphoricLink'))
    );

    if (!hasAnaphoricLink) {
      analysis.issues.push('No anaphoric link detected (relative clause not recognized)');
    } else {
      analysis.observations.push('Anaphoric link detected');
    }
  }

  // Check for subject bleeding
  // In "The X who Y the Z V", the subject of V should be X, not Z
  if (acts.length > 0) {
    const mainAct = acts[acts.length - 1]; // Assume last act is main clause verb
    const expectedSubject = test.expected.clauses[0].mainClause.subject.toLowerCase();

    if (mainAct['cco:has_agent']) {
      const agentId = typeof mainAct['cco:has_agent'] === 'string'
        ? mainAct['cco:has_agent']
        : mainAct['cco:has_agent']['@id'];

      const agent = result['@graph'].find(node => node['@id'] === agentId);
      if (agent && agent['rdfs:label']) {
        const actualSubject = agent['rdfs:label'].toLowerCase().replace('entity of ', '');

        if (!actualSubject.includes(expectedSubject.replace('the ', ''))) {
          analysis.issues.push(
            `SUBJECT BLEEDING: Expected subject "${expectedSubject}", got "${agent['rdfs:label']}"`
          );
        } else {
          analysis.observations.push(`Correct subject: ${agent['rdfs:label']}`);
        }
      }
    }
  }

  analysis.passed = analysis.issues.length === 0;
  return analysis;
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(results) {
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    errors: results.filter(r => r.status === 'error').length,
    timestamp: new Date().toISOString()
  };

  summary.passRate = ((summary.passed / summary.total) * 100).toFixed(1);
  summary.failRate = ((summary.failed / summary.total) * 100).toFixed(1);

  // Group by category
  const byCategory = {};
  results.forEach(r => {
    if (!byCategory[r.category]) {
      byCategory[r.category] = { total: 0, passed: 0, failed: 0, errors: 0 };
    }
    byCategory[r.category].total++;
    byCategory[r.category][r.status]++;
  });

  // Group by priority
  const byPriority = {};
  results.forEach(r => {
    const priority = r.priority || 'P2';
    if (!byPriority[priority]) {
      byPriority[priority] = { total: 0, passed: 0, failed: 0, errors: 0 };
    }
    byPriority[priority].total++;
    byPriority[priority][r.status]++;
  });

  return {
    summary,
    byCategory,
    byPriority,
    results
  };
}

function printReport(report) {
  console.log('\n' + '='.repeat(80));
  console.log('LEVEL 1: COMPONENT TEST RESULTS');
  console.log('='.repeat(80));

  const { summary, byCategory, byPriority } = report;

  console.log(`\n📊 Overall Summary:`);
  console.log(`   Total:  ${summary.total} tests`);
  console.log(`   ✅ Pass:  ${summary.passed} (${summary.passRate}%)`);
  console.log(`   ❌ Fail:  ${summary.failed} (${summary.failRate}%)`);
  console.log(`   ⚠️  Error: ${summary.errors}`);

  console.log(`\n📁 By Category:`);
  Object.entries(byCategory).forEach(([category, stats]) => {
    const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
    const icon = stats.passed === stats.total ? '✅' : stats.passed > 0 ? '⚠️ ' : '❌';
    console.log(`   ${icon} ${category}: ${stats.passed}/${stats.total} (${passRate}%)`);
  });

  console.log(`\n🎯 By Priority:`);
  ['P0', 'P1', 'P2'].forEach(priority => {
    if (byPriority[priority]) {
      const stats = byPriority[priority];
      const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
      const icon = stats.passed === stats.total ? '✅' : stats.failed > 0 ? '❌' : '⚠️ ';
      console.log(`   ${icon} ${priority}: ${stats.passed}/${stats.total} (${passRate}%)`);
    }
  });

  // Show failures
  const failures = report.results.filter(r => r.status === 'fail');
  if (failures.length > 0) {
    console.log(`\n❌ Failures (${failures.length}):`);
    failures.forEach(f => {
      console.log(`\n   ${f.id} - ${f.priority || 'P2'}`);
      console.log(`   Input: "${f.input}"`);
      if (f.analysis && f.analysis.issues) {
        f.analysis.issues.forEach(issue => {
          console.log(`      • ${issue}`);
        });
      }
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Tests that FAIL are VALUABLE - they show us what to fix!');
  console.log('='.repeat(80) + '\n');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const categoryFilter = args.find(arg => arg.startsWith('--category='))?.split('=')[1];
  const verbose = args.includes('--verbose');

  console.log('🔬 Running Level 1 Component Tests...\n');

  // Ensure results directory exists
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  // Load and run tests
  const allResults = [];

  for (const [category, config] of Object.entries(CATEGORIES)) {
    // Skip if category filter specified and doesn't match
    if (categoryFilter && category !== categoryFilter) {
      continue;
    }

    console.log(`📂 Category: ${category} (${config.component})`);

    for (const file of config.files) {
      const filePath = path.join(COMPONENT_TEST_DIR, file);

      if (!fs.existsSync(filePath)) {
        console.log(`   ⚠️  File not found: ${file}`);
        continue;
      }

      const tests = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`   📄 ${path.basename(file)}: ${tests.length} tests`);

      for (const test of tests) {
        const result = runComponentTest(test);
        allResults.push(result);

        if (verbose) {
          const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️ ';
          console.log(`      ${icon} ${result.id}`);
        }
      }
    }
  }

  // Generate and print report
  const report = generateReport(allResults);
  printReport(report);

  // Save full report to JSON
  const reportPath = path.join(RESULTS_DIR, 'component-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📝 Full report saved to: ${reportPath}\n`);

  // Exit with non-zero if any failures (for CI/CD)
  // Note: Failures are EXPECTED on V7.0, so we DON'T fail CI here
  // This is different from golden tests - component tests are diagnostic
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
