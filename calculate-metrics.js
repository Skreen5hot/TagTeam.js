/**
 * calculate-metrics.js
 *
 * Calculate comprehensive accuracy metrics for Week 2b
 */

const fs = require('fs');

// Simulate browser environment
global.window = global;

// Load components
require('./src/lexicon.js');
require('./src/POSTagger.js');
global.POSTagger = global.window.POSTagger;

const PatternMatcher = require('./src/PatternMatcher.js');
global.PatternMatcher = PatternMatcher;

const ContextAnalyzer = require('./src/ContextAnalyzer.js');
global.ContextAnalyzer = ContextAnalyzer;

// Load data files
const valueDefinitions = JSON.parse(fs.readFileSync('./iee-collaboration/from-iee/data/value-definitions-comprehensive.json', 'utf8'));
const frameValueBoosts = JSON.parse(fs.readFileSync('./iee-collaboration/from-iee/data/frame-value-boosts.json', 'utf8'));
const conflictPairs = JSON.parse(fs.readFileSync('./iee-collaboration/from-iee/data/conflict-pairs.json', 'utf8'));
const testCorpus = JSON.parse(fs.readFileSync('./iee-collaboration/from-iee/data/test-corpus-week2.json', 'utf8'));

global.VALUE_DEFINITIONS = valueDefinitions;
global.FRAME_VALUE_BOOSTS = frameValueBoosts;
global.CONFLICT_PAIRS = conflictPairs;

// Load Week 2b components
const ValueMatcher = require('./src/ValueMatcher.js');
const ValueScorer = require('./src/ValueScorer.js');
const EthicalProfiler = require('./src/EthicalProfiler.js');

global.ValueMatcher = ValueMatcher;
global.ValueScorer = ValueScorer;
global.EthicalProfiler = EthicalProfiler;

// Load SemanticRoleExtractor
require('./src/SemanticRoleExtractor.js');
const SemanticRoleExtractor = global.SemanticRoleExtractor;

console.log('========================================');
console.log('Week 2b Accuracy Metrics Calculator');
console.log('========================================\n');

// Initialize extractor
const extractor = new SemanticRoleExtractor();

// Track metrics
const metrics = {
  scenarios: {
    total: 0,
    withProfile: 0,
    withoutProfile: 0
  },
  values: {
    totalExpected: 0,
    totalDetected: 0,
    correctMatches: 0,
    correctPolarities: 0,
    salienceWithinRange: 0
  },
  performance: {
    times: []
  },
  details: []
};

// Run all scenarios
testCorpus.scenarios.forEach((scenario, idx) => {
  metrics.scenarios.total++;

  const startTime = Date.now();
  const result = extractor.parseSemanticAction(scenario.testSentence);
  const parseTime = Date.now() - startTime;

  metrics.performance.times.push(parseTime);

  const detail = {
    id: scenario.id,
    hasProfile: !!result.ethicalProfile,
    valuesDetected: 0,
    valuesExpected: scenario.expectedOutput.values ? scenario.expectedOutput.values.length : 0,
    matches: []
  };

  if (result.ethicalProfile) {
    metrics.scenarios.withProfile++;
    detail.valuesDetected = result.ethicalProfile.values.length;
    metrics.values.totalDetected += detail.valuesDetected;

    if (scenario.expectedOutput.values) {
      metrics.values.totalExpected += scenario.expectedOutput.values.length;

      scenario.expectedOutput.values.forEach(expected => {
        const detected = result.ethicalProfile.values.find(v => v.name === expected.name);

        if (detected) {
          metrics.values.correctMatches++;
          detail.matches.push({
            value: expected.name,
            expectedSalience: expected.salience,
            actualSalience: detected.salience,
            expectedPolarity: expected.polarity,
            actualPolarity: detected.polarity
          });

          if (detected.polarity === expected.polarity) {
            metrics.values.correctPolarities++;
          }

          if (Math.abs(detected.salience - expected.salience) <= 0.2) {
            metrics.values.salienceWithinRange++;
          }
        }
      });
    }
  } else {
    metrics.scenarios.withoutProfile++;
    if (scenario.expectedOutput.values) {
      metrics.values.totalExpected += scenario.expectedOutput.values.length;
    }
  }

  metrics.details.push(detail);
});

// Calculate derived metrics
const avgParseTime = metrics.performance.times.reduce((a, b) => a + b, 0) / metrics.performance.times.length;
const precision = metrics.values.correctMatches / metrics.values.totalDetected;
const recall = metrics.values.correctMatches / metrics.values.totalExpected;
const f1Score = 2 * (precision * recall) / (precision + recall);

console.log('========================================');
console.log('SCENARIO COVERAGE');
console.log('========================================\n');

console.log('Total scenarios:', metrics.scenarios.total);
console.log('  With ethical profile:', metrics.scenarios.withProfile, `(${(metrics.scenarios.withProfile/metrics.scenarios.total*100).toFixed(1)}%)`);
console.log('  Without profile:', metrics.scenarios.withoutProfile, `(${(metrics.scenarios.withoutProfile/metrics.scenarios.total*100).toFixed(1)}%)`);
console.log('');

console.log('========================================');
console.log('VALUE DETECTION');
console.log('========================================\n');

console.log('Expected values:', metrics.values.totalExpected);
console.log('Detected values:', metrics.values.totalDetected);
console.log('Correct matches:', metrics.values.correctMatches);
console.log('');

console.log('========================================');
console.log('ACCURACY METRICS');
console.log('========================================\n');

console.log(`Precision: ${(precision * 100).toFixed(1)}% (${metrics.values.correctMatches}/${metrics.values.totalDetected})`);
console.log(`Recall: ${(recall * 100).toFixed(1)}% (${metrics.values.correctMatches}/${metrics.values.totalExpected})`);
console.log(`F1 Score: ${(f1Score * 100).toFixed(1)}%`);
console.log('');

console.log('========================================');
console.log('POLARITY & SALIENCE ACCURACY');
console.log('========================================\n');

console.log(`Polarity accuracy: ${(metrics.values.correctPolarities / metrics.values.totalExpected * 100).toFixed(1)}% (${metrics.values.correctPolarities}/${metrics.values.totalExpected})`);
console.log(`Salience within ±0.2: ${(metrics.values.salienceWithinRange / metrics.values.totalExpected * 100).toFixed(1)}% (${metrics.values.salienceWithinRange}/${metrics.values.totalExpected})`);
console.log('');

console.log('========================================');
console.log('PERFORMANCE');
console.log('========================================\n');

console.log(`Average parse time: ${avgParseTime.toFixed(2)}ms`);
console.log(`Min: ${Math.min(...metrics.performance.times)}ms`);
console.log(`Max: ${Math.max(...metrics.performance.times)}ms`);
console.log(`Target: <100ms ${avgParseTime < 100 ? '✅ PASSED' : '⚠️ WARNING'}`);
console.log('');

// Save detailed metrics
const reportData = {
  timestamp: new Date().toISOString(),
  summary: {
    scenarioCoverage: `${(metrics.scenarios.withProfile/metrics.scenarios.total*100).toFixed(1)}%`,
    precision: `${(precision * 100).toFixed(1)}%`,
    recall: `${(recall * 100).toFixed(1)}%`,
    f1Score: `${(f1Score * 100).toFixed(1)}%`,
    polarityAccuracy: `${(metrics.values.correctPolarities / metrics.values.totalExpected * 100).toFixed(1)}%`,
    salienceAccuracy: `${(metrics.values.salienceWithinRange / metrics.values.totalExpected * 100).toFixed(1)}%`,
    avgParseTime: `${avgParseTime.toFixed(2)}ms`
  },
  metrics: metrics
};

fs.writeFileSync('WEEK2B_METRICS.json', JSON.stringify(reportData, null, 2));
console.log('✅ Detailed metrics saved to WEEK2B_METRICS.json\n');
