/**
 * test-full-corpus.js
 *
 * Complete validation of all 20 test scenarios
 * Calculates accuracy metrics for Week 2b
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
console.log('Week 2b Full Corpus Validation');
console.log('========================================\n');

console.log('Test Corpus:', testCorpus.scenarios.length, 'scenarios');
console.log('');

// Initialize extractor
const extractor = new SemanticRoleExtractor();

// Track results
const results = {
  total: 0,
  withProfile: 0,
  withoutProfile: 0,
  totalExpectedValues: 0,
  totalDetectedValues: 0,
  correctPolarities: 0,
  salienceWithinRange: 0,
  scenarios: []
};

// Run all scenarios
testCorpus.scenarios.forEach((scenario, idx) => {
  console.log(`\n[${idx + 1}/20] ${scenario.id}`);
  console.log(`Text: "${scenario.testSentence}"`);

  results.total++;

  try {
    const result = extractor.parseSemanticAction(scenario.testSentence);

    const scenarioResult = {
      id: scenario.id,
      text: scenario.testSentence,
      hasProfile: !!result.ethicalProfile,
      valuesDetected: 0,
      valuesExpected: scenario.expectedOutput.values ? scenario.expectedOutput.values.length : 0,
      topValue: null,
      domain: null,
      confidence: 0,
      matches: []
    };

    if (result.ethicalProfile) {
      results.withProfile++;
      scenarioResult.valuesDetected = result.ethicalProfile.values.length;
      scenarioResult.topValue = result.ethicalProfile.topValues[0]?.name || null;
      scenarioResult.domain = result.ethicalProfile.dominantDomain;
      scenarioResult.confidence = result.ethicalProfile.confidence;

      console.log(`  ✅ Profile generated`);
      console.log(`    Values detected: ${scenarioResult.valuesDetected}`);
      console.log(`    Top 3: ${result.ethicalProfile.topValues.slice(0, 3).map(v => v.name).join(', ')}`);
      console.log(`    Domain: ${scenarioResult.domain}`);
      console.log(`    Confidence: ${scenarioResult.confidence.toFixed(2)}`);

      // Compare with expected if available
      if (scenario.expectedOutput.values) {
        results.totalExpectedValues += scenario.expectedOutput.values.length;
        results.totalDetectedValues += scenarioResult.valuesDetected;

        scenario.expectedOutput.values.forEach(expected => {
          const detected = result.ethicalProfile.values.find(v => v.name === expected.name);

          if (detected) {
            scenarioResult.matches.push({
              value: expected.name,
              expectedSalience: expected.salience,
              actualSalience: detected.salience,
              expectedPolarity: expected.polarity,
              actualPolarity: detected.polarity,
              polarityMatch: detected.polarity === expected.polarity,
              salienceClose: Math.abs(detected.salience - expected.salience) <= 0.2
            });

            if (detected.polarity === expected.polarity) {
              results.correctPolarities++;
            }

            if (Math.abs(detected.salience - expected.salience) <= 0.2) {
              results.salienceWithinRange++;
            }
          }
        });

        if (scenarioResult.matches.length > 0) {
          console.log(`    Matches: ${scenarioResult.matches.length}/${scenario.expectedOutput.values.length} values`);
        }
      }
    } else {
      results.withoutProfile++;
      console.log(`  ⚠️  No profile generated`);
    }

    results.scenarios.push(scenarioResult);

  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    results.scenarios.push({
      id: scenario.id,
      error: error.message
    });
  }
});

// Calculate metrics
console.log('\n========================================');
console.log('SUMMARY');
console.log('========================================\n');

console.log('Scenarios processed:', results.total);
console.log('  With ethical profile:', results.withProfile, `(${(results.withProfile/results.total*100).toFixed(1)}%)`);
console.log('  Without ethical profile:', results.withoutProfile, `(${(results.withoutProfile/results.total*100).toFixed(1)}%)`);
console.log('');

const avgValuesDetected = results.scenarios
  .filter(s => s.valuesDetected)
  .reduce((sum, s) => sum + s.valuesDetected, 0) / results.withProfile;

console.log('Values:');
console.log('  Average detected per scenario:', avgValuesDetected.toFixed(1));
console.log('  Total expected (from test data):', results.totalExpectedValues);
console.log('  Total detected:', results.totalDetectedValues);
console.log('');

if (results.totalExpectedValues > 0) {
  const polarityAccuracy = (results.correctPolarities / results.totalExpectedValues * 100).toFixed(1);
  const salienceAccuracy = (results.salienceWithinRange / results.totalExpectedValues * 100).toFixed(1);

  console.log('Accuracy Metrics:');
  console.log(`  Polarity accuracy: ${polarityAccuracy}% (${results.correctPolarities}/${results.totalExpectedValues})`);
  console.log(`  Salience within ±0.2: ${salienceAccuracy}% (${results.salienceWithinRange}/${results.totalExpectedValues})`);
  console.log('');
}

// Performance test
console.log('========================================');
console.log('PERFORMANCE TEST');
console.log('========================================\n');

const perfText = testCorpus.scenarios[0].testSentence;
const iterations = 100;
const startTime = Date.now();

for (let i = 0; i < iterations; i++) {
  extractor.parseSemanticAction(perfText);
}

const endTime = Date.now();
const avgTime = (endTime - startTime) / iterations;

console.log(`Iterations: ${iterations}`);
console.log(`Average parse time: ${avgTime.toFixed(2)}ms`);
console.log(`Target: <100ms ${avgTime < 100 ? '✅ PASSED' : '⚠️ WARNING'}`);
console.log('');

// Overall assessment
console.log('========================================');
console.log('OVERALL ASSESSMENT');
console.log('========================================\n');

const assessments = [];

if (results.withProfile / results.total >= 0.9) {
  assessments.push('✅ Profile generation: EXCELLENT (90%+ scenarios)');
} else if (results.withProfile / results.total >= 0.7) {
  assessments.push('✅ Profile generation: GOOD (70%+ scenarios)');
} else {
  assessments.push('⚠️ Profile generation: NEEDS IMPROVEMENT (<70%)');
}

if (avgTime < 100) {
  assessments.push('✅ Performance: EXCELLENT (<100ms)');
} else if (avgTime < 200) {
  assessments.push('✅ Performance: ACCEPTABLE (<200ms)');
} else {
  assessments.push('⚠️ Performance: NEEDS OPTIMIZATION (>200ms)');
}

if (results.totalExpectedValues > 0) {
  if (results.correctPolarities / results.totalExpectedValues >= 0.8) {
    assessments.push('✅ Polarity accuracy: GOOD (80%+)');
  } else {
    assessments.push('⚠️ Polarity accuracy: NEEDS IMPROVEMENT (<80%)');
  }
}

assessments.forEach(a => console.log(a));

console.log('\n🎉 Week 2b Full Corpus Validation: COMPLETE\n');

// Save results to file
const reportData = {
  timestamp: new Date().toISOString(),
  summary: {
    total: results.total,
    withProfile: results.withProfile,
    withoutProfile: results.withoutProfile,
    avgValuesPerScenario: avgValuesDetected,
    avgParseTime: avgTime,
    polarityAccuracy: results.totalExpectedValues > 0 ? (results.correctPolarities / results.totalExpectedValues * 100).toFixed(1) + '%' : 'N/A',
    salienceAccuracy: results.totalExpectedValues > 0 ? (results.salienceWithinRange / results.totalExpectedValues * 100).toFixed(1) + '%' : 'N/A'
  },
  scenarios: results.scenarios,
  assessments: assessments
};

fs.writeFileSync('TEST_RESULTS_WEEK2B.json', JSON.stringify(reportData, null, 2));
console.log('📄 Results saved to TEST_RESULTS_WEEK2B.json\n');
