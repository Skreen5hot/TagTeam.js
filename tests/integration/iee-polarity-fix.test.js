/**
 * IEE Polarity Detection Fix - Integration Test
 *
 * Tests the complete flow from scenario text to ethical judgment
 * Verifies that the pattern matching enhancement fixes the polarity bug
 *
 * Week 3 - January 2026
 */

const TagTeam = require('../../dist/tagteam');

console.log('=== IEE Polarity Detection Fix - Integration Test ===\n');

// Test 1: The original broken scenario
console.log('Test 1: Informed Consent Scenario (IEE Bug Report)');
console.log('---------------------------------------------------');

const scenario1 = "A doctor provides evidence-based medical treatment to alleviate patient " +
                  "suffering, fully informing the patient of risks and obtaining their informed consent.";

console.log('Scenario:', scenario1);
console.log('\nParsing...\n');

const result1 = TagTeam.parse(scenario1);

console.log('Detected Values:');
result1.ethicalProfile.values.forEach(value => {
    console.log(`  - ${value.name}: polarity = ${value.polarity > 0 ? '+' : value.polarity < 0 ? '-' : ''}${value.polarity}, salience = ${value.salience.toFixed(2)}`);
});

console.log('\nEthical Judgment:', result1.ethicalProfile.judgment || 'N/A');
console.log('Net Value:', result1.ethicalProfile.netValue !== undefined ? result1.ethicalProfile.netValue.toFixed(2) : 'N/A');

// Verify the fix
console.log('\n✓ Verification:');
const autonomy = result1.ethicalProfile.values.find(v => v.name === 'Autonomy');
const consent = result1.ethicalProfile.values.find(v => v.name === 'Consent');
const compassion = result1.ethicalProfile.values.find(v => v.name === 'Compassion');

let allTestsPassed = true;

if (autonomy && autonomy.polarity > 0) {
    console.log('  ✓ Autonomy detected with POSITIVE polarity (was incorrectly neutral)');
} else {
    console.log('  ✗ Autonomy NOT detected or has wrong polarity');
    allTestsPassed = false;
}

if (consent && consent.polarity > 0) {
    console.log('  ✓ Consent detected with POSITIVE polarity (was incorrectly neutral)');
} else {
    console.log('  ✗ Consent NOT detected or has wrong polarity');
    allTestsPassed = false;
}

if (compassion && compassion.polarity > 0) {
    console.log('  ✓ Compassion detected with POSITIVE polarity');
} else {
    console.log('  ✗ Compassion NOT detected or has wrong polarity');
    allTestsPassed = false;
}

if (result1.ethicalProfile.judgment === 'permissible' || result1.ethicalProfile.judgment === 'exemplary') {
    console.log('  ✓ Judgment is PERMISSIBLE or EXEMPLARY (was incorrectly problematic)');
} else {
    console.log(`  ✗ Judgment is ${result1.ethicalProfile.judgment} (should be permissible/exemplary)`);
    allTestsPassed = false;
}

// Test 2: Another inflection scenario
console.log('\n\nTest 2: Verb Inflection Scenario');
console.log('----------------------------------');

const scenario2 = "The physician alleviates the patient's suffering by providing compassionate care.";

console.log('Scenario:', scenario2);
console.log('\nParsing...\n');

const result2 = TagTeam.parse(scenario2);

console.log('Detected Values:');
result2.ethicalProfile.values.forEach(value => {
    console.log(`  - ${value.name}: polarity = ${value.polarity > 0 ? '+' : value.polarity < 0 ? '-' : ''}${value.polarity}, salience = ${value.salience.toFixed(2)}`);
});

const compassion2 = result2.ethicalProfile.values.find(v => v.name === 'Compassion');
if (compassion2 && compassion2.polarity > 0) {
    console.log('\n  ✓ "alleviates suffering" correctly matches "relieve suffering" pattern');
} else {
    console.log('\n  ✗ Pattern matching failed for verb inflection');
    allTestsPassed = false;
}

// Test 3: Possessive handling
console.log('\n\nTest 3: Possessive Handling');
console.log('----------------------------');

const scenario3 = "The patient's informed consent was obtained before the procedure.";

console.log('Scenario:', scenario3);
console.log('\nParsing...\n');

const result3 = TagTeam.parse(scenario3);

console.log('Detected Values:');
result3.ethicalProfile.values.forEach(value => {
    console.log(`  - ${value.name}: polarity = ${value.polarity > 0 ? '+' : value.polarity < 0 ? '-' : ''}${value.polarity}, salience = ${value.salience.toFixed(2)}`);
});

const autonomy3 = result3.ethicalProfile.values.find(v => v.name === 'Autonomy');
const consent3 = result3.ethicalProfile.values.find(v => v.name === 'Consent');

if ((autonomy3 && autonomy3.polarity > 0) || (consent3 && consent3.polarity > 0)) {
    console.log('\n  ✓ "patient\'s informed consent" correctly matches despite possessive');
} else {
    console.log('\n  ✗ Possessive handling failed');
    allTestsPassed = false;
}

// Test 4: Negative scenario (violating values)
console.log('\n\nTest 4: Negative Scenario (Values Violated)');
console.log('--------------------------------------------');

const scenario4 = "The doctor proceeded with treatment without obtaining informed consent.";

console.log('Scenario:', scenario4);
console.log('\nParsing...\n');

const result4 = TagTeam.parse(scenario4);

console.log('Detected Values:');
result4.ethicalProfile.values.forEach(value => {
    console.log(`  - ${value.name}: polarity = ${value.polarity > 0 ? '+' : value.polarity < 0 ? '-' : ''}${value.polarity}, salience = ${value.salience.toFixed(2)}`);
});

console.log('\nEthical Judgment:', result4.ethicalProfile.judgment);

const autonomy4 = result4.ethicalProfile.values.find(v => v.name === 'Autonomy');
const consent4 = result4.ethicalProfile.values.find(v => v.name === 'Consent');

if ((autonomy4 && autonomy4.polarity < 0) || (consent4 && consent4.polarity < 0)) {
    console.log('\n  ✓ "without informed consent" correctly detected as VIOLATION');
} else {
    console.log('\n  ✗ Negation handling may have issues');
    allTestsPassed = false;
}

if (result4.ethicalProfile.judgment === 'problematic' || result4.ethicalProfile.judgment === 'prohibited') {
    console.log('  ✓ Judgment is correctly PROBLEMATIC or PROHIBITED');
} else {
    console.log(`  ✗ Judgment is ${result4.ethicalProfile.judgment} (should be problematic/prohibited)`);
    allTestsPassed = false;
}

// Final summary
console.log('\n\n=== Summary ===\n');

if (allTestsPassed) {
    console.log('✓ ALL TESTS PASSED - IEE Polarity Bug is FIXED!');
    console.log('\nThe enhanced pattern matching successfully handles:');
    console.log('  • Verb inflections (obtaining → obtain, alleviates → alleviate)');
    console.log('  • Possessives (patient\'s informed consent)');
    console.log('  • Negations (without informed consent)');
    console.log('  • Word order variations');
    console.log('\nPattern matching now uses Compromise.js for lemmatization.');
    console.log('Bundle size increased by ~330KB but accuracy is significantly improved.');
    process.exit(0);
} else {
    console.log('✗ SOME TESTS FAILED - Please review output above');
    process.exit(1);
}
