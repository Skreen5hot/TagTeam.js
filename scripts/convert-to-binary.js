#!/usr/bin/env node
/**
 * convert-to-binary.js — Convert JSON model files to TagTeam binary format
 *
 * Source: Major-Refactor-Roadmap.md §Phase 4, AC-4.13
 *
 * Converts POS and dependency parser JSON weight files to binary (.bin) format
 * using the v1.1 sparse encoding for efficient storage.
 *
 * Usage: node scripts/convert-to-binary.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAGIC = 'TT01';
const HEADER_SIZE = 64;

function convertModel(jsonPath, binPath, modelType) {
  const model = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Determine class list
  const classes = model.classes || model.transitions || [];
  const classIndex = new Map();
  classes.forEach((c, i) => classIndex.set(c, i));

  // Build metadata (everything except weights)
  const metadata = {};
  for (const key of Object.keys(model)) {
    if (key !== 'weights') {
      metadata[key] = model[key];
    }
  }
  const metadataJson = Buffer.from(JSON.stringify(metadata), 'utf8');

  // Build feature index (null-terminated strings)
  const featureNames = Object.keys(model.weights);
  const featureIndex = Buffer.from(featureNames.join('\0') + '\0', 'utf8');

  // Build sparse weight matrix (v1.1 format)
  // For each feature: uint16 count + count × (uint16 col, float32 weight)
  const weightParts = [];
  for (const feat of featureNames) {
    const row = model.weights[feat];
    const entries = Object.keys(row)
      .filter(cls => row[cls] !== 0 && classIndex.has(cls))
      .map(cls => ({ col: classIndex.get(cls), weight: row[cls] }));

    const entryBuf = Buffer.alloc(2 + entries.length * 6);
    entryBuf.writeUInt16LE(entries.length, 0);
    let off = 2;
    for (const e of entries) {
      entryBuf.writeUInt16LE(e.col, off);
      off += 2;
      entryBuf.writeFloatLE(e.weight, off);
      off += 4;
    }
    weightParts.push(entryBuf);
  }
  const weightMatrix = Buffer.concat(weightParts);

  // Build payload (metadata + feature index + weight matrix)
  const payload = Buffer.concat([metadataJson, featureIndex, weightMatrix]);

  // Compute SHA-256 checksum of payload
  const checksum = crypto.createHash('sha256').update(payload).digest();

  // Build header (64 bytes)
  const header = Buffer.alloc(HEADER_SIZE);
  header.write(MAGIC, 0, 4, 'ascii');     // Magic
  header[4] = 1;                           // Version major
  header[5] = 1;                           // Version minor (sparse format)
  header[6] = 0x00;                        // Little-endian
  header[7] = modelType;                   // 0x01 = POS, 0x02 = dep
  header.writeUInt32LE(featureNames.length, 8);   // Feature count
  header.writeUInt32LE(classes.length, 12);        // Class count
  header.writeUInt32LE(0, 16);                     // Reserved
  header.writeUInt32LE(metadataJson.length, 20);   // Metadata length
  header.writeUInt32LE(featureIndex.length, 24);   // Feature index length
  header.writeUInt32LE(weightMatrix.length, 28);   // Weight matrix length
  checksum.copy(header, 32);                       // SHA-256 checksum

  // Write binary file
  const output = Buffer.concat([header, payload]);
  fs.writeFileSync(binPath, output);

  const jsonSize = fs.statSync(jsonPath).size;
  const ratio = ((output.length / jsonSize) * 100).toFixed(1);
  console.log(`  ${path.basename(jsonPath)} → ${path.basename(binPath)}`);
  console.log(`    JSON: ${(jsonSize / 1024 / 1024).toFixed(2)} MB → Binary: ${(output.length / 1024 / 1024).toFixed(2)} MB (${ratio}%)`);
  console.log(`    Features: ${featureNames.length}, Classes: ${classes.length}`);
  console.log(`    Format: v1.1 sparse, SHA-256 checksum: ${checksum.toString('hex').slice(0, 16)}...`);
}

// ============================================================================
// Convert both models
// ============================================================================

const dataDir = path.join(__dirname, '..', 'src', 'data');

console.log('\nConverting JSON models to binary format...\n');

convertModel(
  path.join(dataDir, 'pos-weights-pruned.json'),
  path.join(dataDir, 'pos-weights-pruned.bin'),
  0x01  // POS model
);

console.log();

convertModel(
  path.join(dataDir, 'dep-weights-pruned.json'),
  path.join(dataDir, 'dep-weights-pruned.bin'),
  0x02  // Dependency parser model
);

console.log('\nDone.');
