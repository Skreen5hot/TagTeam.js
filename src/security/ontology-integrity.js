'use strict';

/**
 * Ontology Integrity Verifier
 *
 * Verifies ontology and configuration files against a signed manifest
 * containing expected SHA-256 hashes. Any mismatch halts processing.
 *
 * @module security/ontology-integrity
 */

const crypto = require('crypto');
const fs = require('fs');

/**
 * Verify ontology file integrity against a signed manifest.
 *
 * @param {string} manifestPath - Path to ontology-manifest.json
 * @returns {{ valid: boolean, manifestVersion?: string, approver?: string, results?: Array, error?: string }}
 */
function verifyOntologyIntegrity(manifestPath) {
  // Check manifest exists
  if (!fs.existsSync(manifestPath)) {
    return {
      valid: false,
      error: 'MANIFEST_NOT_FOUND'
    };
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    return {
      valid: false,
      error: 'MANIFEST_PARSE_ERROR'
    };
  }

  const results = [];

  for (const [filePath, expected] of Object.entries(manifest.files || {})) {
    if (!fs.existsSync(filePath)) {
      results.push({
        file: filePath,
        valid: false,
        error: 'FILE_NOT_FOUND',
        expected: expected.sha256,
        lastApproved: expected.lastModified,
        approver: manifest.approver
      });
      continue;
    }

    const content = fs.readFileSync(filePath);
    const actual = crypto.createHash('sha256').update(content).digest('hex');
    const match = actual === expected.sha256;

    results.push({
      file: filePath,
      valid: match,
      expected: expected.sha256,
      actual: actual,
      lastApproved: expected.lastModified,
      approver: manifest.approver
    });

    if (!match) {
      console.error(`INTEGRITY FAILURE: ${filePath}`);
      console.error(`  Expected: ${expected.sha256}`);
      console.error(`  Actual:   ${actual}`);
      console.error(`  Last approved: ${expected.lastModified} by ${manifest.approver}`);
    }
  }

  return {
    valid: results.every(r => r.valid),
    manifestVersion: manifest.version,
    approver: manifest.approver,
    results
  };
}

/**
 * Validate verb taxonomy against ontology constraints.
 * Critical verbs must maintain their eventive/stative classification.
 *
 * @param {{ isStative: (verb: string) => boolean, isEventive: (verb: string) => boolean }} taxonomy
 * @param {{ getInstancesOf: (cls: string) => string[] }} ontology
 * @returns {Array<{severity: string, code: string, verb: string, impact: string}>}
 */
function validateVerbTaxonomy(taxonomy, ontology) {
  const issues = [];

  const criticalEventive = ontology.getInstancesOf('tagteam:CriticalEventiveVerb');
  for (const verb of criticalEventive) {
    if (taxonomy.isStative(verb)) {
      issues.push({
        severity: 'critical',
        code: 'CRITICAL_VERB_MISCATEGORIZED',
        verb,
        impact: 'IEE will fail to evaluate this as an intentional act'
      });
    }
  }

  const criticalStative = ontology.getInstancesOf('tagteam:CriticalStativeVerb');
  for (const verb of criticalStative) {
    if (!taxonomy.isStative(verb)) {
      issues.push({
        severity: 'critical',
        code: 'CRITICAL_VERB_MISCATEGORIZED',
        verb,
        impact: 'Structural relation will be misclassified as intentional act'
      });
    }
  }

  return issues;
}

module.exports = { verifyOntologyIntegrity, validateVerbTaxonomy };
