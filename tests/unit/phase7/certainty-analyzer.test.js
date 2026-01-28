/**
 * CertaintyAnalyzer Tests
 * Phase 7.2: Certainty Markers
 *
 * Tests lexicon-based detection of hedges, boosters, and evidentials.
 */

const assert = require('assert');
const CertaintyAnalyzer = require('../../../src/analyzers/CertaintyAnalyzer');

const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Phase 7.2: CertaintyAnalyzer Tests');
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

test('Lexicon has ~50+ marker terms', () => {
  const count = CertaintyAnalyzer.getMarkerCount();
  assert.ok(count >= 45, `Expected at least 45 markers, got ${count}`);
  // Allow up to 80 markers for comprehensive coverage
  assert.ok(count <= 80, `Expected at most 80 markers, got ${count}`);
});

test('Lexicon has hedges, boosters, and evidentials', () => {
  const lexicon = CertaintyAnalyzer.getLexicon();
  assert.ok(Object.keys(lexicon.hedges).length > 10, 'Should have 10+ hedges');
  assert.ok(Object.keys(lexicon.boosters).length > 10, 'Should have 10+ boosters');
  assert.ok(Object.keys(lexicon.evidentials).length > 5, 'Should have 5+ evidentials');
});

// ═══════════════════════════════════════════════════════════════
// Hedge Detection
// ═══════════════════════════════════════════════════════════════

test('Detects modal hedge "might"', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyze('The patient might have an infection.');

  assert.ok(result.isHedged, 'Should detect hedge');
  assert.ok(result.hedges.length > 0, 'Should have hedges array');
  assert.strictEqual(result.hedges[0].marker, 'might');
  assert.strictEqual(result.hedges[0].subtype, 'modal');
});

test('Detects epistemic adverb "possibly"', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyze('This is possibly a serious condition.');

  assert.ok(result.isHedged, 'Should detect hedge');
  assert.strictEqual(result.hedges[0].marker, 'possibly');
  assert.strictEqual(result.hedges[0].subtype, 'adverb');
});

test('Detects hedging verb "seems"', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyze('The treatment seems to be working.');

  assert.ok(result.isHedged, 'Should detect hedge');
  assert.strictEqual(result.hedges[0].marker, 'seems');
  assert.strictEqual(result.hedges[0].subtype, 'verb');
});

test('Detects multiple hedges in one sentence', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyze('This could possibly indicate a problem.');

  assert.ok(result.hedges.length >= 2, `Expected 2+ hedges, got ${result.hedges.length}`);
});

test('Hedge reduces certainty score', () => {
  const analyzer = new CertaintyAnalyzer();
  const hedged = analyzer.analyze('The patient might have diabetes.');
  const neutral = analyzer.analyze('The patient has diabetes.');

  assert.ok(hedged.certaintyScore < neutral.certaintyScore,
    `Hedged (${hedged.certaintyScore}) should be < neutral (${neutral.certaintyScore})`);
});

// ═══════════════════════════════════════════════════════════════
// Booster Detection
// ═══════════════════════════════════════════════════════════════

test('Detects modal booster "must"', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyze('The doctor must perform the surgery.');

  assert.ok(result.isBoosted, 'Should detect booster');
  assert.ok(result.boosters.length > 0, 'Should have boosters array');
  assert.strictEqual(result.boosters[0].marker, 'must');
});

test('Detects intensifying adverb "definitely"', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyze('This is definitely the right treatment.');

  assert.ok(result.isBoosted, 'Should detect booster');
  assert.strictEqual(result.boosters[0].marker, 'definitely');
  assert.strictEqual(result.boosters[0].subtype, 'adverb');
});

test('Detects adverb "clearly"', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyze('The results clearly show improvement.');

  assert.ok(result.isBoosted, 'Should detect booster');
  assert.ok(result.boosters.some(b => b.marker === 'clearly'));
});

test('Booster increases certainty score', () => {
  const analyzer = new CertaintyAnalyzer();
  const boosted = analyzer.analyze('The test definitely confirms the diagnosis.');
  const neutral = analyzer.analyze('The test confirms the diagnosis.');

  assert.ok(boosted.certaintyScore > neutral.certaintyScore,
    `Boosted (${boosted.certaintyScore}) should be > neutral (${neutral.certaintyScore})`);
});

// ═══════════════════════════════════════════════════════════════
// Evidential Detection
// ═══════════════════════════════════════════════════════════════

test('Detects "reportedly" as evidential', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyze('The patient reportedly experienced side effects.');

  assert.ok(result.isEvidential, 'Should detect evidential');
  assert.ok(result.evidentials.length > 0, 'Should have evidentials array');
  assert.strictEqual(result.evidentials[0].marker, 'reportedly');
  assert.strictEqual(result.evidentials[0].sourceType, 'reported');
});

test('Detects "allegedly" as evidential with lower reliability', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyze('The doctor allegedly made an error.');

  assert.ok(result.isEvidential, 'Should detect evidential');
  assert.strictEqual(result.evidentials[0].marker, 'allegedly');
  assert.strictEqual(result.evidentials[0].reliability, 0.4);
});

test('Detects attribution marker "according"', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyze('According to the report, the procedure was successful.');

  assert.ok(result.isEvidential, 'Should detect evidential');
  assert.strictEqual(result.evidentials[0].marker, 'according');
  assert.strictEqual(result.evidentials[0].sourceType, 'attributed');
});

// ═══════════════════════════════════════════════════════════════
// Mixed Markers
// ═══════════════════════════════════════════════════════════════

test('Detects mixed hedge and booster', () => {
  const analyzer = new CertaintyAnalyzer();
  // Use sentence without hedging verbs like "indicate"
  const result = analyzer.analyze('This might definitely be a problem.');

  assert.ok(result.isHedged, 'Should detect hedge');
  assert.ok(result.isBoosted, 'Should detect booster');
  assert.strictEqual(result.dominantType, 'mixed');
});

test('Evidential takes precedence in dominant type', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyze('The patient reportedly might have the condition.');

  assert.strictEqual(result.dominantType, 'evidential',
    'Evidential should take precedence');
});

// ═══════════════════════════════════════════════════════════════
// Certainty Score
// ═══════════════════════════════════════════════════════════════

test('Neutral text has ~0.5 certainty', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyze('The patient has diabetes.');

  assert.ok(result.certaintyScore >= 0.4 && result.certaintyScore <= 0.6,
    `Neutral certainty should be ~0.5, got ${result.certaintyScore}`);
});

test('Strong hedge reduces certainty below 0.5', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyze('The patient might possibly have diabetes.');

  assert.ok(result.certaintyScore < 0.5,
    `Hedged certainty should be < 0.5, got ${result.certaintyScore}`);
});

test('Strong booster increases certainty above 0.5', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyze('The patient definitely absolutely has diabetes.');

  assert.ok(result.certaintyScore > 0.7,
    `Strongly boosted certainty should be > 0.7, got ${result.certaintyScore}`);
});

// ═══════════════════════════════════════════════════════════════
// Claim Analysis API
// ═══════════════════════════════════════════════════════════════

test('analyzeClaimCertainty returns tagteam properties', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyzeClaimCertainty('The patient might have diabetes.');

  assert.ok('tagteam:certaintyScore' in result, 'Should have certaintyScore');
  assert.ok('tagteam:certaintyType' in result, 'Should have certaintyType');
  assert.ok('tagteam:hedges' in result, 'Should have hedges');
  assert.ok('tagteam:boosters' in result, 'Should have boosters');
  assert.ok('tagteam:isHedged' in result, 'Should have isHedged');
});

test('analyzeClaimCertainty extracts marker words', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyzeClaimCertainty('This is possibly a serious condition.');

  assert.ok(result['tagteam:hedges'].includes('possibly'),
    'Should extract "possibly" as hedge');
  assert.strictEqual(result['tagteam:isHedged'], true);
});

// ═══════════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════════

test('Handles empty text', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyze('');

  assert.strictEqual(result.markerCount, 0);
  assert.strictEqual(result.dominantType, 'neutral');
});

test('Case insensitive detection', () => {
  const analyzer = new CertaintyAnalyzer();
  const result = analyzer.analyze('DEFINITELY this is POSSIBLY a concern.');

  assert.ok(result.isHedged, 'Should detect "POSSIBLY" as hedge');
  assert.ok(result.isBoosted, 'Should detect "DEFINITELY" as booster');
});

test('Does not false-positive on similar words', () => {
  const analyzer = new CertaintyAnalyzer();
  // "must" as noun ("a must") shouldn't trigger, but regex can't distinguish
  // This test documents current behavior
  const result = analyzer.analyze('The patient has a musky smell.');

  assert.strictEqual(result.isBoosted, false, 'Should not detect "musky" as "must"');
});

// Run tests
runTests();
