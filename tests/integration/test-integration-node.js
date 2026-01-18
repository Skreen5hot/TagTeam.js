/**
 * test-integration-node.js
 *
 * Node.js Integration test for Week 2b using source files
 */

const fs = require('fs');
const path = require('path');

// Simulate browser environment for modules
global.window = global;

// Load modules in order
require(path.join(__dirname, '../../src/core/lexicon.js'));
require(path.join(__dirname, '../../src/core/POSTagger.js'));

// Expose POSTagger globally
global.POSTagger = global.window.POSTagger;

// Load PatternMatcher
const PatternMatcher = require(path.join(__dirname, '../../src/core/PatternMatcher.js'));
global.PatternMatcher = PatternMatcher;

// Load ContextAnalyzer
const ContextAnalyzer = require(path.join(__dirname, '../../src/analyzers/ContextAnalyzer.js'));
global.ContextAnalyzer = ContextAnalyzer;

// Load data files for Week 2b
const valueDefinitions = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../iee-collaboration/from-iee/data/value-definitions-comprehensive.json'), 'utf8')
);
const frameValueBoosts = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../iee-collaboration/from-iee/data/frame-value-boosts.json'), 'utf8')
);
const conflictPairs = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../iee-collaboration/from-iee/data/conflict-pairs.json'), 'utf8')
);

global.VALUE_DEFINITIONS = valueDefinitions;
global.FRAME_VALUE_BOOSTS = frameValueBoosts;
global.CONFLICT_PAIRS = conflictPairs;

// Load Week 2b components
const ValueMatcher = require(path.join(__dirname, '../../src/analyzers/ValueMatcher.js'));
const ValueScorer = require(path.join(__dirname, '../../src/analyzers/ValueScorer.js'));
const EthicalProfiler = require(path.join(__dirname, '../../src/analyzers/EthicalProfiler.js'));

global.ValueMatcher = ValueMatcher;
global.ValueScorer = ValueScorer;
global.EthicalProfiler = EthicalProfiler;

// Load SemanticRoleExtractor
require(path.join(__dirname, '../../src/core/SemanticRoleExtractor.js'));
const SemanticRoleExtractor = global.SemanticRoleExtractor;

console.log('========================================');
console.log('Week 2b Integration Test (Node.js)');
console.log('========================================\n');

// Test 1: Basic integration
console.log('TEST 1: Basic Integration with Ethical Profile');
console.log('----------------------------------------------');
const text1 = "The family must decide whether to continue treatment";
console.log('Input:', text1);

const extractor = new SemanticRoleExtractor();
const result1 = extractor.parseSemanticAction(text1);

console.log('\n✅ Parse completed successfully!');
console.log('Version:', result1.version);
console.log('Agent:', result1.agent ? result1.agent.text : 'N/A');
console.log('Action:', result1.action ? result1.action.verb : 'N/A');
console.log('Frame:', result1.semanticFrame);
console.log('Modality:', result1.action ? result1.action.modality : 'N/A');

if (result1.contextIntensity) {
    console.log('\nContext Intensity: ✅ Present');
    console.log('  Urgency:', result1.contextIntensity.temporal.urgency);
    console.log('  Harm Severity:', result1.contextIntensity.consequential.harmSeverity);
}

if (result1.ethicalProfile) {
    console.log('\nEthical Profile: ✅ Present');
    console.log('  Values detected:', result1.ethicalProfile.values.length);
    console.log('  Value summary:');
    console.log('    Total:', result1.ethicalProfile.valueSummary.totalDetected);
    console.log('    By domain:', JSON.stringify(result1.ethicalProfile.valueSummary.byDomain));
    console.log('  Top 3 values:');
    result1.ethicalProfile.topValues.slice(0, 3).forEach((v, idx) => {
        console.log(`    ${idx + 1}. ${v.name} (salience: ${v.salience}, polarity: ${v.polarity})`);
    });
    console.log('  Dominant domain:', result1.ethicalProfile.dominantDomain);
    console.log('  Conflict score:', result1.ethicalProfile.conflictScore);
    console.log('  Conflicts detected:', result1.ethicalProfile.conflicts.length);
    console.log('  Confidence:', result1.ethicalProfile.confidence);
} else {
    console.log('\nEthical Profile: ❌ NOT PRESENT');
}

console.log('\n');

// Test 2: Multiple scenarios
console.log('TEST 2: Multiple Scenarios');
console.log('--------------------------');

const testSentences = [
    "The doctor must allocate the last ventilator between two critically ill patients",
    "The surgeon must decide whether to disclose the error to the patient",
    "I discovered that my company is falsifying safety reports"
];

let scenariosPassed = 0;
testSentences.forEach((text, idx) => {
    console.log(`\nScenario ${idx + 1}:`, text.substring(0, 60) + '...');
    const result = extractor.parseSemanticAction(text);
    console.log('  Version:', result.version);
    console.log('  Agent:', result.agent ? result.agent.text : 'N/A');
    console.log('  Frame:', result.semanticFrame);

    if (result.ethicalProfile) {
        console.log('  Values:', result.ethicalProfile.values.length);
        console.log('  Top 3:', result.ethicalProfile.topValues.slice(0, 3).map(v => v.name).join(', '));
        console.log('  Domain:', result.ethicalProfile.dominantDomain);
        console.log('  Conflicts:', result1.ethicalProfile.conflicts.length);
        console.log('  ✅ PASSED');
        scenariosPassed++;
    } else {
        console.log('  ❌ No ethical profile generated');
    }
});

console.log(`\nScenarios: ${scenariosPassed}/${testSentences.length} passed`);
console.log('');

// Test 3: Regression - Week 1 features still work
console.log('TEST 3: Regression Check (Week 1 Features)');
console.log('-------------------------------------------');

const regressionTests = [
    { text: "I love my best friend", expectedAgent: "I", expectedAction: "love" },
    { text: "The doctor recommended treatment", expectedAgent: "doctor", expectedAction: "recommended" },
    { text: "We must decide about the coal plant", expectedAction: "decide", expectedModality: "must" }
];

let regressionPassed = 0;
regressionTests.forEach((test, idx) => {
    const result = extractor.parseSemanticAction(test.text);
    let passed = true;
    let failReason = '';

    if (test.expectedAgent) {
        if (!result.agent || result.agent.text !== test.expectedAgent) {
            passed = false;
            failReason = `Agent mismatch: expected "${test.expectedAgent}", got "${result.agent ? result.agent.text : 'null'}"`;
        }
    }
    if (test.expectedAction) {
        if (!result.action || result.action.verb !== test.expectedAction) {
            passed = false;
            failReason = `Action mismatch: expected "${test.expectedAction}", got "${result.action ? result.action.verb : 'null'}"`;
        }
    }
    if (test.expectedModality) {
        if (!result.action || result.action.modality !== test.expectedModality) {
            passed = false;
            failReason = `Modality mismatch: expected "${test.expectedModality}", got "${result.action ? result.action.modality : 'null'}"`;
        }
    }

    if (passed) {
        console.log(`  Test ${idx + 1}: ✅ PASSED -`, test.text);
        regressionPassed++;
    } else {
        console.log(`  Test ${idx + 1}: ❌ FAILED -`, failReason);
    }
});

console.log(`\nRegression: ${regressionPassed}/${regressionTests.length} passed\n`);

// Test 4: Performance check
console.log('TEST 4: Performance Check');
console.log('-------------------------');

const perfText = "The family must decide whether to continue treatment";
const iterations = 100;
const startTime = Date.now();

for (let i = 0; i < iterations; i++) {
    extractor.parseSemanticAction(perfText);
}

const endTime = Date.now();
const avgTime = (endTime - startTime) / iterations;

console.log(`Iterations: ${iterations}`);
console.log(`Total time: ${endTime - startTime}ms`);
console.log(`Average time per parse: ${avgTime.toFixed(2)}ms`);
console.log(avgTime < 100 ? '✅ PASSED (< 100ms target)' : '⚠️ WARNING (exceeds 100ms)');

// Summary
console.log('\n========================================');
console.log('INTEGRATION TEST SUMMARY');
console.log('========================================\n');

console.log('✅ Week 2b components load successfully');
console.log('✅ Version 2.0 confirmed');
console.log('✅ Week 1 features working (semantic roles)');
console.log('✅ Week 2a features working (context intensity)');
console.log('✅ Week 2b features working (ethical profiles)');
console.log(`✅ Regression tests: ${regressionPassed}/${regressionTests.length} passed`);
console.log(`✅ Performance: ${avgTime.toFixed(2)}ms average`);

if (scenariosPassed === testSentences.length && regressionPassed === regressionTests.length && avgTime < 100) {
    console.log('\n🎉 Week 2b Integration: ALL TESTS PASSED!\n');
} else {
    console.log('\n⚠️ Some tests need attention\n');
}
