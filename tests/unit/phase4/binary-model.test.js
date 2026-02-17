#!/usr/bin/env node
/**
 * AC-4.13, AC-4.14, AC-4.14b: Binary Model Loading Tests
 *
 * Source: Major-Refactor-Roadmap.md Phase 4
 *
 * Tests:
 *   AC-4.13:  Load .bin files, verify header fields, checksum valid
 *   AC-4.13b: Round-trip test — binary model produces identical output to JSON model
 *   AC-4.14:  Corrupted checksum → throws with reason 'checksum_mismatch'
 *   AC-4.14b: Unsupported version → throws with reason 'version_incompatible'
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../..');
const BinaryModelLoader = require(path.join(ROOT, 'src/core/BinaryModelLoader'));
const PerceptronTagger = require(path.join(ROOT, 'src/core/PerceptronTagger'));
const DependencyParser = require(path.join(ROOT, 'src/core/DependencyParser'));

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  cyan: '\x1b[36m', bright: '\x1b[1m'
};

let passed = 0;
let failed = 0;
const errors = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write(`  ${C.green}\u2713${C.reset} ${name}\n`);
  } catch (e) {
    failed++;
    errors.push({ name, error: e.message });
    process.stdout.write(`  ${C.red}\u2717${C.reset} ${name}: ${e.message}\n`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ============================================================================
// Data paths
// ============================================================================

const DATA_DIR = path.join(ROOT, 'src/data');
const posBinPath = path.join(DATA_DIR, 'pos-weights-pruned.bin');
const depBinPath = path.join(DATA_DIR, 'dep-weights-pruned.bin');
const posJsonPath = path.join(DATA_DIR, 'pos-weights-pruned.json');
const depJsonPath = path.join(DATA_DIR, 'dep-weights-pruned.json');

// Check binary files exist
const hasPOSBin = fs.existsSync(posBinPath);
const hasDepBin = fs.existsSync(depBinPath);

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}AC-4.13/4.14/4.14b: Binary Model Tests${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}`);

// ============================================================================
// AC-4.13: Header and checksum validation
// ============================================================================

console.log(`\n${C.cyan}--- AC-4.13: Binary Model Loading ---${C.reset}`);

test('POS binary model exists', () => {
  assert(hasPOSBin, `POS binary not found at ${posBinPath}. Run: node scripts/convert-to-binary.js`);
});

test('DEP binary model exists', () => {
  assert(hasDepBin, `DEP binary not found at ${depBinPath}. Run: node scripts/convert-to-binary.js`);
});

if (hasPOSBin) {
  const posBuf = fs.readFileSync(posBinPath);

  test('POS binary: magic is TT01', () => {
    assert(posBuf.slice(0, 4).toString('ascii') === 'TT01', 'Expected magic TT01');
  });

  test('POS binary: endianness is 0x00 (little-endian)', () => {
    assert(posBuf[6] === 0x00, `Expected 0x00, got 0x${posBuf[6].toString(16)}`);
  });

  test('POS binary: model type is 0x01 (POS)', () => {
    assert(posBuf[7] === 0x01, `Expected 0x01, got 0x${posBuf[7].toString(16)}`);
  });

  test('POS binary: checksum valid', () => {
    assert(BinaryModelLoader.verifyChecksum(posBuf), 'Checksum verification failed');
  });

  test('POS binary: load() returns model object', () => {
    const model = BinaryModelLoader.load(posBuf);
    assert(model.weights != null, 'Model should have weights');
    assert(model.classes != null, 'Model should have classes');
    assert(Object.keys(model.weights).length > 0, 'Weights should not be empty');
  });
}

if (hasDepBin) {
  const depBuf = fs.readFileSync(depBinPath);

  test('DEP binary: magic is TT01', () => {
    assert(depBuf.slice(0, 4).toString('ascii') === 'TT01', 'Expected magic TT01');
  });

  test('DEP binary: endianness is 0x00 (little-endian)', () => {
    assert(depBuf[6] === 0x00, `Expected 0x00, got 0x${depBuf[6].toString(16)}`);
  });

  test('DEP binary: model type is 0x02 (dep)', () => {
    assert(depBuf[7] === 0x02, `Expected 0x02, got 0x${depBuf[7].toString(16)}`);
  });

  test('DEP binary: checksum valid', () => {
    assert(BinaryModelLoader.verifyChecksum(depBuf), 'Checksum verification failed');
  });

  test('DEP binary: load() returns model object', () => {
    const model = BinaryModelLoader.load(depBuf);
    assert(model.weights != null, 'Model should have weights');
    assert(model.transitions != null, 'Model should have transitions');
    assert(Object.keys(model.weights).length > 0, 'Weights should not be empty');
  });
}

// ============================================================================
// AC-4.13b: Round-trip — binary model produces identical output to JSON model
// ============================================================================

console.log(`\n${C.cyan}--- AC-4.13b: Round-trip Verification ---${C.reset}`);

const roundTripSentences = [
  'The doctor treated the patient',
  'The nurse gave the patient medication',
  'Alice and Bob reviewed the proposal',
  'The report was submitted by the analyst',
  'The surgeon operated on the patient at dawn',
  'CBP is a component of DHS',
  'The committee reviewed and approved the policy',
  'Dr. Smith treated John at St. Mary Hospital',
  'The experienced doctor carefully treated the elderly patient',
  'The task force coordinated with federal and state agencies'
];

if (hasPOSBin) {
  test('POS round-trip: binary produces identical tags to JSON', () => {
    const posJson = JSON.parse(fs.readFileSync(posJsonPath, 'utf8'));
    const posBuf = fs.readFileSync(posBinPath);
    const posBin = BinaryModelLoader.load(posBuf);

    const taggerJson = new PerceptronTagger(posJson);
    const taggerBin = new PerceptronTagger(posBin);

    const mismatches = [];
    for (const sentence of roundTripSentences) {
      const tokens = sentence.split(/\s+/);
      const tagsJson = taggerJson.tag(tokens);
      const tagsBin = taggerBin.tag(tokens);

      for (let i = 0; i < tokens.length; i++) {
        if (tagsJson[i] !== tagsBin[i]) {
          mismatches.push(`"${sentence}": token "${tokens[i]}" JSON=${tagsJson[i]} BIN=${tagsBin[i]}`);
        }
      }
    }

    assert(mismatches.length === 0,
      `${mismatches.length} POS tag mismatches:\n    ${mismatches.slice(0, 5).join('\n    ')}`);
  });
}

if (hasDepBin) {
  test('DEP round-trip: binary produces identical parses to JSON', () => {
    const posJson = JSON.parse(fs.readFileSync(posJsonPath, 'utf8'));
    const depJson = JSON.parse(fs.readFileSync(depJsonPath, 'utf8'));
    const depBuf = fs.readFileSync(depBinPath);
    const depBin = BinaryModelLoader.load(depBuf);

    const tagger = new PerceptronTagger(posJson);
    const parserJson = new DependencyParser(depJson);
    const parserBin = new DependencyParser(depBin);

    const mismatches = [];
    for (const sentence of roundTripSentences) {
      const tokens = sentence.split(/\s+/);
      const tags = tagger.tag(tokens);

      const resultJson = parserJson.parse(tokens, tags);
      const resultBin = parserBin.parse(tokens, tags);

      // Compare arc labels and heads
      for (let i = 0; i < resultJson.arcs.length; i++) {
        const aj = resultJson.arcs[i];
        const ab = resultBin.arcs[i];
        if (!ab || aj.head !== ab.head || aj.label !== ab.label) {
          mismatches.push(
            `"${sentence}": arc ${i} JSON=(${aj.dependent}→${aj.head} ${aj.label}) ` +
            `BIN=(${ab ? ab.dependent + '→' + ab.head + ' ' + ab.label : 'missing'})`
          );
        }
      }
    }

    assert(mismatches.length === 0,
      `${mismatches.length} parse mismatches:\n    ${mismatches.slice(0, 5).join('\n    ')}`);
  });
}

// ============================================================================
// AC-4.14: Checksum mismatch
// ============================================================================

console.log(`\n${C.cyan}--- AC-4.14: Checksum Mismatch Detection ---${C.reset}`);

test('Corrupted checksum throws ModelLoadError with reason checksum_mismatch', () => {
  // Create a minimal valid-looking buffer and then corrupt the checksum
  if (!hasDepBin) throw new Error('DEP binary not available');

  const buf = Buffer.from(fs.readFileSync(depBinPath));
  // Flip a byte in the payload (after header) to invalidate checksum
  buf[BinaryModelLoader.HEADER_SIZE + 10] ^= 0xFF;

  let threw = false;
  let reason = '';
  try {
    BinaryModelLoader.load(buf);
  } catch (e) {
    threw = true;
    reason = e.reason || '';
  }

  assert(threw, 'Should throw on corrupted checksum');
  assert(reason === 'checksum_mismatch',
    `Expected reason 'checksum_mismatch', got '${reason}'`);
});

// ============================================================================
// AC-4.14b: Version incompatible
// ============================================================================

console.log(`\n${C.cyan}--- AC-4.14b: Version Incompatible Detection ---${C.reset}`);

test('Unsupported major version throws with reason version_incompatible', () => {
  if (!hasDepBin) throw new Error('DEP binary not available');

  const buf = Buffer.from(fs.readFileSync(depBinPath));
  // Set major version to 0xFF
  buf[4] = 0xFF;

  let threw = false;
  let reason = '';
  try {
    BinaryModelLoader.load(buf);
  } catch (e) {
    threw = true;
    reason = e.reason || '';
  }

  assert(threw, 'Should throw on unsupported version');
  assert(reason === 'version_incompatible',
    `Expected reason 'version_incompatible', got '${reason}'`);
});

test('Unsupported minor version throws with reason version_incompatible', () => {
  if (!hasDepBin) throw new Error('DEP binary not available');

  const buf = Buffer.from(fs.readFileSync(depBinPath));
  // Set minor version to 0xFF (beyond max supported)
  buf[5] = 0xFF;

  let threw = false;
  let reason = '';
  try {
    BinaryModelLoader.load(buf);
  } catch (e) {
    threw = true;
    reason = e.reason || '';
  }

  assert(threw, 'Should throw on unsupported minor version');
  assert(reason === 'version_incompatible',
    `Expected reason 'version_incompatible', got '${reason}'`);
});

// ============================================================================
// Results
// ============================================================================

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}RESULTS: ${C.green}${passed} passed${C.reset}, ${failed > 0 ? C.red : ''}${failed} failed${C.reset} (${passed + failed} total)${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}`);

if (errors.length > 0) {
  console.log(`\n${C.red}Failures:${C.reset}`);
  for (const e of errors) {
    console.log(`  - ${e.name}: ${e.error}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
