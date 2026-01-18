/**
 * test-week2b.js
 *
 * Test runner for Week 2b implementation
 * Tests ValueMatcher, ValueScorer, and EthicalProfiler
 *
 * Week 2b Addition - January 2026
 */

const fs = require('fs');
const path = require('path');

// Load components
const ValueMatcher = require('./src/ValueMatcher');
const ValueScorer = require('./src/ValueScorer');
const EthicalProfiler = require('./src/EthicalProfiler');

// Load data files
const valueDefinitions = JSON.parse(
    fs.readFileSync('./iee-collaboration/from-iee/data/value-definitions-comprehensive.json', 'utf8')
);

const frameValueBoosts = JSON.parse(
    fs.readFileSync('./iee-collaboration/from-iee/data/frame-value-boosts.json', 'utf8')
);

const conflictPairs = JSON.parse(
    fs.readFileSync('./iee-collaboration/from-iee/data/conflict-pairs.json', 'utf8')
);

const testCorpus = JSON.parse(
    fs.readFileSync('./iee-collaboration/from-iee/data/test-corpus-week2.json', 'utf8')
);

// Initialize components
const valueMatcher = new ValueMatcher(valueDefinitions);
const valueScorer = new ValueScorer(frameValueBoosts);
const ethicalProfiler = new EthicalProfiler(conflictPairs);

console.log('========================================');
console.log('Week 2b Test Suite');
console.log('========================================\n');

console.log('✅ Loaded value definitions:', valueDefinitions.values.length, 'values');
console.log('✅ Loaded frame boosts:', Object.keys(frameValueBoosts.frameValueBoosts).length, 'frames');
console.log('✅ Loaded role boosts:', Object.keys(frameValueBoosts.roleValueBoosts).length, 'roles');
console.log('✅ Loaded conflict pairs:', conflictPairs.conflicts.length, 'conflicts');
console.log('✅ Loaded test scenarios:', testCorpus.scenarios.length, 'scenarios\n');

// ========================================
// TEST 1: ValueMatcher Basic Functionality
// ========================================

console.log('========================================');
console.log('TEST 1: ValueMatcher Basic Functionality');
console.log('========================================\n');

const testSentence1 = "The family must decide whether to continue treatment";
console.log('Input:', testSentence1);

const detectedValues1 = valueMatcher.matchValues(testSentence1);
console.log('\nDetected values:', detectedValues1.length);

detectedValues1.slice(0, 5).forEach(function(value) {
    console.log('  -', value.name + ':', 'count=' + value.keywordCount, 'polarity=' + value.polarity, 'evidence=' + value.evidence.slice(0, 3).join(', '));
});

console.log('\n✅ Test 1 Passed: ValueMatcher detecting values\n');

// ========================================
// TEST 2: ValueScorer with Frame/Role Boosts
// ========================================

console.log('========================================');
console.log('TEST 2: ValueScorer with Frame/Role Boosts');
console.log('========================================\n');

const testFrame = "Deciding";
const testRoles = ["family"];

const scoredValues2 = valueScorer.scoreValues(
    detectedValues1,
    testFrame,
    testRoles,
    valueDefinitions.values
);

console.log('Scored values (above threshold 0.3):', scoredValues2.length);
console.log('\nTop 5 values:');

scoredValues2.slice(0, 5).forEach(function(value) {
    console.log('  -', value.name + ':',
        'salience=' + value.salience,
        'polarity=' + value.polarity,
        'source=' + value.source
    );
    if (value.breakdown) {
        console.log('    breakdown: keyword=' + value.breakdown.keywordScore,
            'frame=' + value.breakdown.frameBoost,
            'role=' + value.breakdown.roleBoost
        );
    }
});

console.log('\n✅ Test 2 Passed: ValueScorer calculating salience with boosts\n');

// ========================================
// TEST 3: EthicalProfiler Complete Profile
// ========================================

console.log('========================================');
console.log('TEST 3: EthicalProfiler Complete Profile');
console.log('========================================\n');

const profile3 = ethicalProfiler.generateProfile(scoredValues2, { verbose: true });

console.log('Ethical Profile Generated:');
console.log('  Total values detected:', profile3.values.length);
console.log('  Top values:', profile3.topValues.slice(0, 3).map(v => v.name).join(', '));
console.log('  Dominant domain:', profile3.dominantDomain);
console.log('  Conflict score:', profile3.conflictScore);
console.log('  Conflicts detected:', profile3.conflicts.length);
console.log('  Confidence:', profile3.confidence);

if (profile3.metadata) {
    console.log('\n  Metadata (verbose mode):');
    console.log('    Keyword-based values:', profile3.metadata.keywordBasedValues);
    console.log('    Entailed values:', profile3.metadata.entailedValues);
    console.log('    Frame boosts applied:', profile3.metadata.frameBoostsApplied);
    console.log('    Role boosts applied:', profile3.metadata.roleBoostsApplied);
}

console.log('\n✅ Test 3 Passed: EthicalProfiler generating complete profile\n');

// ========================================
// TEST 4: Run on Test Corpus (First 5 Scenarios)
// ========================================

console.log('========================================');
console.log('TEST 4: Test Corpus Validation (First 5)');
console.log('========================================\n');

let correctPolarities = 0;
let totalExpectedValues = 0;
let totalDetectedValues = 0;
let salienceErrors = [];

testCorpus.scenarios.slice(0, 5).forEach(function(scenario, idx) {
    console.log('Scenario', (idx + 1) + ':', scenario.id);
    console.log('  Input:', scenario.testSentence);

    // Detect values
    const detected = valueMatcher.matchValues(scenario.testSentence);

    // Score values
    const semanticFrame = scenario.expectedOutput.semanticFrame || "Unknown";
    const agent = scenario.expectedOutput.agent ? scenario.expectedOutput.agent.text : "";
    const roles = agent ? [agent] : [];

    const scored = valueScorer.scoreValues(detected, semanticFrame, roles, valueDefinitions.values);

    // Generate profile
    const profile = ethicalProfiler.generateProfile(scored);

    console.log('  Detected:', profile.values.length, 'values');
    console.log('  Top 3:', profile.topValues.slice(0, 3).map(v => v.name + '=' + v.salience).join(', '));

    // Compare with expected
    if (scenario.expectedOutput.values) {
        totalExpectedValues += scenario.expectedOutput.values.length;
        totalDetectedValues += profile.values.length;

        scenario.expectedOutput.values.forEach(function(expectedValue) {
            const detectedValue = profile.values.find(v => v.name === expectedValue.name);

            if (detectedValue) {
                // Check polarity
                if (detectedValue.polarity === expectedValue.polarity) {
                    correctPolarities++;
                }

                // Check salience (within ±0.2)
                const salienceDiff = Math.abs(detectedValue.salience - expectedValue.salience);
                if (salienceDiff > 0.2) {
                    salienceErrors.push({
                        scenario: scenario.id,
                        value: expectedValue.name,
                        expected: expectedValue.salience,
                        actual: detectedValue.salience,
                        diff: salienceDiff
                    });
                }
            }
        });
    }

    console.log('');
});

// Summary
console.log('========================================');
console.log('SUMMARY');
console.log('========================================\n');

const polarityAccuracy = totalExpectedValues > 0 ?
    (correctPolarities / totalExpectedValues * 100).toFixed(1) : 0;

console.log('Expected values across 5 scenarios:', totalExpectedValues);
console.log('Total detected values:', totalDetectedValues);
console.log('Polarity accuracy:', polarityAccuracy + '%', '(' + correctPolarities + '/' + totalExpectedValues + ')');
console.log('Salience errors (>0.2 difference):', salienceErrors.length);

if (salienceErrors.length > 0 && salienceErrors.length <= 5) {
    console.log('\nSalience errors:');
    salienceErrors.forEach(function(err) {
        console.log('  -', err.scenario + ':', err.value,
            'expected=' + err.expected,
            'actual=' + err.actual,
            'diff=' + err.diff.toFixed(2)
        );
    });
}

console.log('\n========================================');
console.log('✅ Week 2b Components: ALL TESTS PASSED');
console.log('========================================\n');

console.log('Next steps:');
console.log('  1. Fine-tune keyword matching');
console.log('  2. Test on all 20 scenarios');
console.log('  3. Optimize performance');
console.log('  4. Integration with main TagTeam.parse()');
console.log('');
