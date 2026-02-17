#!/usr/bin/env node
/**
 * AC-4.18 & AC-4.19: Regression Baseline Gates
 *
 * Source: Major-Refactor-Roadmap.md Phase 4
 *
 * Verifies that component and Phase 3A test suites maintain their baselines.
 * Runs each test suite via child_process and parses output for pass counts.
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', bright: '\x1b[1m'
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

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}AC-4.18 & AC-4.19: Regression Baseline Gates${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}`);

// ============================================================================
// AC-4.19: Component Test Baseline
// ============================================================================

console.log(`\n${C.cyan}--- AC-4.19: Component Test Baseline ---${C.reset}`);

const COMPONENT_BASELINE = 89; // Locked at Phase 3B exit

test(`AC-4.19: Component tests >= ${COMPONENT_BASELINE} passing`, () => {
  let output;
  try {
    output = execSync('node tests/component/run-component-tests.js', {
      cwd: ROOT,
      timeout: 120000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (e) {
    // Test runner exits with code 1 if any tests fail, but still outputs results
    output = (e.stdout || '') + (e.stderr || '');
  }

  // Parse output: component tests use "Pass:  89" format
  const match = output.match(/Pass:\s+(\d+)/) || output.match(/(\d+)\s+passed/);
  if (!match) {
    throw new Error('Could not parse component test output for pass count');
  }

  const passCount = parseInt(match[1], 10);
  if (passCount < COMPONENT_BASELINE) {
    throw new Error(`Component tests: ${passCount} passed (baseline: ${COMPONENT_BASELINE}). REGRESSION DETECTED.`);
  }
  console.log(`    (${passCount} passed, baseline: ${COMPONENT_BASELINE})`);
});

// ============================================================================
// AC-4.18: Phase 3A Test Baseline
// ============================================================================

console.log(`\n${C.cyan}--- AC-4.18: Phase 3A Test Baseline ---${C.reset}`);

const PHASE3A_BASELINE = 30; // All 30 AC-3.x tests must pass

test(`AC-4.18: Phase 3A tests >= ${PHASE3A_BASELINE} passing`, () => {
  let output;
  try {
    output = execSync('node tests/integration/tree-extraction.test.js', {
      cwd: ROOT,
      timeout: 120000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (e) {
    output = (e.stdout || '') + (e.stderr || '');
  }

  const match = output.match(/(\d+)\s+passed/);
  if (!match) {
    throw new Error('Could not parse Phase 3A test output for pass count');
  }

  const passCount = parseInt(match[1], 10);
  if (passCount < PHASE3A_BASELINE) {
    throw new Error(`Phase 3A: ${passCount} passed (baseline: ${PHASE3A_BASELINE}). REGRESSION DETECTED.`);
  }
  console.log(`    (${passCount} passed, baseline: ${PHASE3A_BASELINE})`);
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
