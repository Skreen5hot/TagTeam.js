/**
 * test-debug.js
 *
 * Debug test to understand value detection
 */

const fs = require('fs');
const ValueMatcher = require('./src/ValueMatcher');
const ValueScorer = require('./src/ValueScorer');
const EthicalProfiler = require('./src/EthicalProfiler');

// Load data
const valueDefinitions = JSON.parse(
    fs.readFileSync('./iee-collaboration/from-iee/data/value-definitions-comprehensive.json', 'utf8')
);
const frameValueBoosts = JSON.parse(
    fs.readFileSync('./iee-collaboration/from-iee/data/frame-value-boosts.json', 'utf8')
);
const conflictPairs = JSON.parse(
    fs.readFileSync('./iee-collaboration/from-iee/data/conflict-pairs.json', 'utf8')
);

// Initialize
const valueMatcher = new ValueMatcher(valueDefinitions);
const valueScorer = new ValueScorer(frameValueBoosts);
const ethicalProfiler = new EthicalProfiler(conflictPairs);

// Test sentence
const testSentence = "The family must decide whether to continue treatment";
const semanticFrame = "Deciding";
const roles = ["family"];

console.log('========================================');
console.log('DEBUG: Value Detection Analysis');
console.log('========================================\n');

console.log('Input:', testSentence);
console.log('Frame:', semanticFrame);
console.log('Roles:', roles.join(', '));
console.log('');

// Step 1: Match values
console.log('Step 1: ValueMatcher');
console.log('-------------------');
const detected = valueMatcher.matchValues(testSentence);
console.log('Keyword-detected values:', detected.length);
detected.forEach(v => {
    console.log('  -', v.name, '(keywords:', v.keywordCount, ', polarity:', v.polarity, ')');
});
console.log('');

// Step 2: Score values
console.log('Step 2: ValueScorer');
console.log('-------------------');

// Check what frame boosts are available
console.log('Frame boosts for "Deciding":');
if (frameValueBoosts.frameValueBoosts.Deciding) {
    const boosts = frameValueBoosts.frameValueBoosts.Deciding.boosts;
    for (const valueName in boosts) {
        console.log('  -', valueName + ':', boosts[valueName]);
    }
}
console.log('');

// Check what role boosts are available
console.log('Role boosts for "family":');
if (frameValueBoosts.roleValueBoosts.family) {
    const boosts = frameValueBoosts.roleValueBoosts.family.boosts;
    for (const valueName in boosts) {
        console.log('  -', valueName + ':', boosts[valueName]);
    }
}
console.log('');

const scored = valueScorer.scoreValues(detected, semanticFrame, roles, valueDefinitions.values);
console.log('Scored values (>= 0.3 threshold):', scored.length);
scored.forEach(v => {
    console.log('  -', v.name + ':', 'salience=' + v.salience, 'source=' + v.source);
    if (v.breakdown) {
        console.log('    breakdown:', JSON.stringify(v.breakdown));
    }
});
console.log('');

// Step 3: Generate profile
console.log('Step 3: EthicalProfiler');
console.log('----------------------');
const profile = ethicalProfiler.generateProfile(scored, { verbose: true });
console.log('Total values in profile:', profile.values.length);
console.log('Top values:', profile.topValues.map(v => v.name).join(', '));
console.log('Confidence:', profile.confidence);
console.log('');

// Compare with expected
console.log('========================================');
console.log('Expected vs Actual');
console.log('========================================\n');

const expected = [
    { name: 'Autonomy', salience: 0.9, polarity: -1 },
    { name: 'Compassion', salience: 0.8, polarity: 1 },
    { name: 'Fidelity', salience: 0.7, polarity: 0 },
    { name: 'Non-maleficence', salience: 0.8, polarity: 0 }
];

expected.forEach(exp => {
    const actual = profile.values.find(v => v.name === exp.name);
    if (actual) {
        const salienceDiff = (actual.salience - exp.salience).toFixed(2);
        const polarityMatch = actual.polarity === exp.polarity ? '✓' : '✗';
        console.log(exp.name + ':');
        console.log('  Expected: salience=' + exp.salience + ', polarity=' + exp.polarity);
        console.log('  Actual:   salience=' + actual.salience + ' (diff: ' + salienceDiff + '), polarity=' + actual.polarity, polarityMatch);
    } else {
        console.log(exp.name + ': NOT DETECTED ✗');
    }
});

console.log('');
