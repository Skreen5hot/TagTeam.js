/**
 * SourceAttributionDetector Tests
 * Phase 7.1: Source Attribution Detection
 *
 * Tests pattern-based detection of source attributions:
 * - Direct quotes
 * - Reported speech
 * - Institutional sources
 * - According-to patterns
 */

const assert = require('assert');
const SourceAttributionDetector = require('../../../src/graph/SourceAttributionDetector');

const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Phase 7.1: SourceAttributionDetector Tests');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const t of tests) {
    try {
      await t.fn();
      results.passed++;
      console.log(`  ✅ ${t.name}`);
    } catch (e) {
      results.failed++;
      console.log(`  ❌ ${t.name}`);
      console.log(`     ${e.message}`);
    }
  }

  console.log(`\n  Total: ${results.passed} passed, ${results.failed} failed\n`);

  if (results.failed > 0) {
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════
// Lexicon Coverage
// ═══════════════════════════════════════════════════════════════

test('Lexicon has 40+ reporting verbs', () => {
  const count = SourceAttributionDetector.getVerbCount();
  assert.ok(count >= 40, `Expected at least 40 verbs, got ${count}`);
});

test('Lexicon includes common attribution verbs', () => {
  const verbs = SourceAttributionDetector.getReportingVerbs();
  assert.ok('said' in verbs, 'Should have "said"');
  assert.ok('reported' in verbs, 'Should have "reported"');
  assert.ok('stated' in verbs, 'Should have "stated"');
  assert.ok('claimed' in verbs, 'Should have "claimed"');
});

test('Has institutional patterns', () => {
  const patterns = SourceAttributionDetector.getInstitutionalPatterns();
  assert.ok(patterns.length >= 8, `Expected at least 8 patterns, got ${patterns.length}`);
});

// ═══════════════════════════════════════════════════════════════
// Direct Quote Detection
// ═══════════════════════════════════════════════════════════════

test('Detects post-quote attribution: "X," said Source', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('"The patient needs surgery," said Dr. Smith.');

  assert.ok(result.hasAttributions, 'Should detect attribution');
  assert.strictEqual(result.attributions[0].type, 'direct_quote');
  assert.strictEqual(result.attributions[0].source, 'Dr. Smith');
  assert.strictEqual(result.attributions[0].verb, 'said');
});

test('Detects pre-quote attribution: Source said "X"', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('Dr. Jones stated, "We must act now."');

  assert.ok(result.hasAttributions, 'Should detect attribution');
  assert.strictEqual(result.attributions[0].type, 'direct_quote');
  assert.strictEqual(result.attributions[0].source, 'Dr. Jones');
  assert.strictEqual(result.attributions[0].verb, 'stated');
});

test('Detects colon quote attribution: Source: "X"', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('The Nurse Manager: "We need more staff."');

  assert.ok(result.hasAttributions, 'Should detect attribution');
  assert.strictEqual(result.attributions[0].type, 'direct_quote');
  assert.ok(result.attributions[0].source.includes('Nurse'));
});

test('Direct quote extracts quoted content', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('"Treatment must begin immediately," announced Dr. Williams.');

  assert.ok(result.attributions[0].quote.includes('Treatment'));
  assert.strictEqual(result.attributions[0].verb, 'announced');
});

test('Direct quote classifies source as physician', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('"The diagnosis is confirmed," said Dr. Adams.');

  assert.strictEqual(result.attributions[0].sourceType, 'cco:Physician');
});

// ═══════════════════════════════════════════════════════════════
// Reported Speech Detection
// ═══════════════════════════════════════════════════════════════

test('Detects reported speech with "that" clause', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('The nurse reported that the patient was stable.');

  assert.ok(result.hasAttributions, 'Should detect attribution');
  assert.strictEqual(result.attributions[0].type, 'reported_speech');
  assert.ok(result.attributions[0].source.toLowerCase().includes('nurse'));
});

test('Detects reported speech with various verbs', () => {
  const detector = new SourceAttributionDetector();

  const verbs = ['said', 'claimed', 'argued', 'explained', 'mentioned'];

  for (const verb of verbs) {
    const result = detector.analyze(`The doctor ${verb} that treatment was necessary.`);
    assert.ok(result.hasAttributions, `Should detect "${verb}" as attribution verb`);
  }
});

test('Detects named source reported speech', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('Dr. Miller explained that the procedure carries risks.');

  assert.ok(result.hasAttributions, 'Should detect attribution');
  assert.strictEqual(result.attributions[0].type, 'reported_speech');
  assert.ok(result.attributions[0].source.includes('Miller'));
});

test('Reported speech confidence is lower than direct quote', () => {
  const detector = new SourceAttributionDetector();
  const quote = detector.analyze('"Test," said Dr. Smith.');
  const reported = detector.analyze('The doctor said that the test was positive.');

  // Reported speech has 0.9 multiplier
  assert.ok(reported.attributions[0].confidence < quote.attributions[0].confidence,
    'Reported speech should have lower confidence than direct quote');
});

// ═══════════════════════════════════════════════════════════════
// Institutional Source Detection
// ═══════════════════════════════════════════════════════════════

test('Detects hospital policy attribution', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('Hospital policy states that visitors are limited.');

  assert.ok(result.hasAttributions, 'Should detect attribution');
  assert.strictEqual(result.attributions[0].type, 'institutional');
  assert.strictEqual(result.attributions[0].institutionalType, 'policy');
});

test('Detects medical guidelines attribution', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('Clinical guidelines recommend early intervention.');

  assert.ok(result.hasAttributions, 'Should detect attribution');
  assert.strictEqual(result.attributions[0].type, 'institutional');
  assert.strictEqual(result.attributions[0].institutionalType, 'guideline');
});

test('Detects regulatory attribution', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('Federal law requires patient consent.');

  assert.ok(result.hasAttributions, 'Should detect attribution');
  assert.strictEqual(result.attributions[0].type, 'institutional');
  assert.strictEqual(result.attributions[0].institutionalType, 'regulation');
});

test('Detects committee/board attribution', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('The ethics committee decided to approve the trial.');

  assert.ok(result.hasAttributions, 'Should detect attribution');
  assert.strictEqual(result.attributions[0].type, 'institutional');
  assert.strictEqual(result.attributions[0].institutionalType, 'committee');
});

test('Institutional source classified as Organization', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('Hospital policy requires informed consent.');

  assert.strictEqual(result.attributions[0].sourceType, 'cco:Organization');
});

// ═══════════════════════════════════════════════════════════════
// According-To Detection
// ═══════════════════════════════════════════════════════════════

test('Detects "according to" pattern', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('According to Dr. Brown, the treatment is effective.');

  assert.ok(result.hasAttributions, 'Should detect attribution');
  assert.strictEqual(result.attributions[0].type, 'according_to');
  assert.ok(result.attributions[0].source.includes('Brown'));
});

test('Detects "according to" with organization', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('According to the hospital, new protocols are in place.');

  assert.ok(result.hasAttributions, 'Should detect attribution');
  assert.strictEqual(result.attributions[0].type, 'according_to');
  assert.strictEqual(result.attributions[0].sourceType, 'cco:Organization');
});

test('Detects "according to" with document reference', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('According to the medical report, the patient improved.');

  assert.ok(result.hasAttributions, 'Should detect attribution');
  assert.strictEqual(result.attributions[0].type, 'according_to');
  assert.strictEqual(result.attributions[0].sourceType, 'cco:InformationContentEntity');
});

// ═══════════════════════════════════════════════════════════════
// Source Classification
// ═══════════════════════════════════════════════════════════════

test('Classifies nurse as cco:Nurse', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('The nurse reported that the patient was improving.');

  assert.strictEqual(result.attributions[0].sourceType, 'cco:Nurse');
});

test('Classifies patient as cco:Patient', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('The patient stated that pain had decreased.');

  assert.strictEqual(result.attributions[0].sourceType, 'cco:Patient');
});

test('Classifies family member appropriately', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('The family reported that symptoms began last week.');

  assert.strictEqual(result.attributions[0].sourceType, 'cco:FamilyMember');
});

test('Classifies unknown capitalized name as Person', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('"Important findings," said John Wilson.');

  assert.strictEqual(result.attributions[0].sourceType, 'cco:Person');
});

// ═══════════════════════════════════════════════════════════════
// Claim Analysis API
// ═══════════════════════════════════════════════════════════════

test('analyzeClaimAttribution returns tagteam properties', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyzeClaimAttribution('"Test results are positive," said Dr. Lee.');

  assert.ok('tagteam:hasAttribution' in result, 'Should have hasAttribution');
  assert.ok('tagteam:attributionType' in result, 'Should have attributionType');
  assert.ok('tagteam:detectedSource' in result, 'Should have detectedSource');
  assert.ok('tagteam:sourceType' in result, 'Should have sourceType');
  assert.ok('tagteam:attributionConfidence' in result, 'Should have confidence');
});

test('analyzeClaimAttribution returns correct values', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyzeClaimAttribution('According to the hospital, protocol was followed.');

  assert.strictEqual(result['tagteam:hasAttribution'], true);
  assert.strictEqual(result['tagteam:attributionType'], 'according_to');
  assert.strictEqual(result['tagteam:sourceType'], 'cco:Organization');
});

test('analyzeClaimAttribution returns unattributed for no match', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyzeClaimAttribution('The patient has diabetes.');

  assert.strictEqual(result['tagteam:hasAttribution'], false);
  assert.strictEqual(result['tagteam:attributionType'], 'unattributed');
});

// ═══════════════════════════════════════════════════════════════
// Multiple Attributions
// ═══════════════════════════════════════════════════════════════

test('Detects multiple attributions in text', () => {
  const detector = new SourceAttributionDetector();
  const text = '"We need more time," said Dr. Brown. The nurse reported that resources were limited.';
  const result = detector.analyze(text);

  assert.ok(result.attributionCount >= 2, `Expected 2+ attributions, got ${result.attributionCount}`);
});

test('Provides summary of attributions', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('"Test passed," said Dr. Smith.');

  assert.ok(result.summary.length > 0, 'Should have summary');
  assert.ok(result.summary.includes('attribution'), 'Summary should mention attributions');
});

test('Returns dominant type correctly', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('"Quote one," said Dr. A. "Quote two," said Dr. B.');

  assert.strictEqual(result.dominantType, 'direct_quote');
});

// ═══════════════════════════════════════════════════════════════
// Confidence and Filtering
// ═══════════════════════════════════════════════════════════════

test('Strong verbs have high confidence', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('"Test," confirmed Dr. Smith.');

  assert.ok(result.attributions[0].confidence >= 0.9,
    `Expected high confidence for "confirmed", got ${result.attributions[0].confidence}`);
});

test('Weak verbs have lower confidence', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('The expert implied that changes were needed.');

  assert.ok(result.attributions[0].confidence <= 0.6,
    `Expected lower confidence for "implied", got ${result.attributions[0].confidence}`);
});

test('Minimum confidence filter works', () => {
  const detector = new SourceAttributionDetector({ minConfidence: 0.8 });
  const result = detector.analyze('The researcher suggested that results were promising.');

  // "suggested" has 0.6 strength * 0.9 = 0.54, should be filtered
  assert.strictEqual(result.attributionCount, 0, 'Low confidence should be filtered');
});

// ═══════════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════════

test('Handles empty text', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('');

  assert.strictEqual(result.hasAttributions, false);
  assert.strictEqual(result.attributionCount, 0);
  assert.strictEqual(result.dominantType, 'none');
});

test('Handles text without attributions', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('The patient was admitted with chest pain.');

  assert.strictEqual(result.hasAttributions, false);
  assert.strictEqual(result.attributionCount, 0);
});

test('Handles quotes without attribution', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('The sign read "No Entry" on the door.');

  // "read" is not a reporting verb, so this should not match
  assert.strictEqual(result.hasAttributions, false);
});

test('Case insensitive matching for verbs', () => {
  const detector = new SourceAttributionDetector();
  const result = detector.analyze('The doctor SAID that treatment was needed.');

  assert.ok(result.hasAttributions, 'Should detect regardless of case');
});

test('Includes position when enabled', () => {
  const detector = new SourceAttributionDetector({ includePositions: true });
  const result = detector.analyze('"Test," said Dr. Smith.');

  assert.ok(result.attributions[0].position !== undefined, 'Should include position');
});

test('Excludes position when disabled', () => {
  const detector = new SourceAttributionDetector({ includePositions: false });
  const result = detector.analyze('"Test," said Dr. Smith.');

  assert.strictEqual(result.attributions[0].position, undefined, 'Should not include position');
});

// Run tests
runTests();
