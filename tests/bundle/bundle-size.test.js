#!/usr/bin/env node
/**
 * AC-4.12: Bundle Size Compliance
 *
 * Source: Major-Refactor-Roadmap.md Phase 4
 *
 * Verifies the built bundle is within size limits:
 *   - Uncompressed <= 10 MB
 *   - Gzipped <= 4 MB
 */

'use strict';

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  cyan: '\x1b[36m', bright: '\x1b[1m'
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write(`  ${C.green}\u2713${C.reset} ${name}\n`);
  } catch (e) {
    failed++;
    process.stdout.write(`  ${C.red}\u2717${C.reset} ${name}: ${e.message}\n`);
  }
}

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}AC-4.12: Bundle Size Compliance${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}\n`);

const bundlePath = path.join(__dirname, '../../dist/tagteam.js');
const MAX_UNCOMPRESSED = 10 * 1024 * 1024; // 10 MB
const MAX_GZIP = 4 * 1024 * 1024;           // 4 MB

if (!fs.existsSync(bundlePath)) {
  console.log(`${C.red}Bundle not found at ${bundlePath}. Run 'npm run build' first.${C.reset}`);
  process.exit(1);
}

const raw = fs.readFileSync(bundlePath);
const uncompressedBytes = raw.length;
const gzipped = zlib.gzipSync(raw, { level: 9 });
const gzippedBytes = gzipped.length;

const uncompressedMB = (uncompressedBytes / 1024 / 1024).toFixed(2);
const gzippedMB = (gzippedBytes / 1024 / 1024).toFixed(2);

console.log(`${C.cyan}Bundle: ${bundlePath}${C.reset}`);
console.log(`  Uncompressed: ${uncompressedMB} MB (limit: ${(MAX_UNCOMPRESSED / 1024 / 1024).toFixed(0)} MB)`);
console.log(`  Gzipped:      ${gzippedMB} MB (limit: ${(MAX_GZIP / 1024 / 1024).toFixed(0)} MB)\n`);

test(`AC-4.12a: Uncompressed bundle <= 10 MB (actual: ${uncompressedMB} MB)`, () => {
  if (uncompressedBytes > MAX_UNCOMPRESSED) {
    throw new Error(`Uncompressed ${uncompressedMB} MB exceeds 10 MB limit`);
  }
});

test(`AC-4.12b: Gzipped bundle <= 4 MB (actual: ${gzippedMB} MB)`, () => {
  if (gzippedBytes > MAX_GZIP) {
    throw new Error(`Gzipped ${gzippedMB} MB exceeds 4 MB limit`);
  }
});

// Also check model files
const modelsDir = path.join(__dirname, '../../dist/models');
if (fs.existsSync(modelsDir)) {
  let totalModelSize = 0;
  const modelFiles = fs.readdirSync(modelsDir, { recursive: true })
    .filter(f => typeof f === 'string');
  for (const f of modelFiles) {
    const fp = path.join(modelsDir, f);
    try {
      const stat = fs.statSync(fp);
      if (stat.isFile()) totalModelSize += stat.size;
    } catch (e) { /* skip */ }
  }
  const totalMB = ((uncompressedBytes + totalModelSize) / 1024 / 1024).toFixed(2);
  console.log(`\n  Models:       ${(totalModelSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Total:        ${totalMB} MB (bundle + models)`);
}

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}RESULTS: ${C.green}${passed} passed${C.reset}, ${failed > 0 ? C.red : ''}${failed} failed${C.reset} (${passed + failed} total)${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}`);

process.exit(failed > 0 ? 1 : 0);
