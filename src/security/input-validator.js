'use strict';

/**
 * Input Validator
 *
 * Validates and sanitizes input text before semantic processing.
 * Hard limits (length, null bytes) block processing.
 * All text is NFKC-normalized to prevent Unicode-based attacks.
 *
 * @module security/input-validator
 */

const INPUT_LIMITS = {
  MAX_TEXT_LENGTH: 100000,
  MAX_SENTENCE_LENGTH: 5000,
};

/**
 * Validate input text for security constraints.
 *
 * @param {string} text - Raw input text
 * @returns {{ valid: boolean, normalized: string|null, issues: Array<{severity: string, confidence: string, code: string}> }}
 */
function validateInput(text) {
  const issues = [];

  // Empty/null/undefined check
  if (text == null || (typeof text === 'string' && text.length === 0)) {
    issues.push({
      severity: 'error',
      confidence: 'deterministic',
      code: 'EMPTY_INPUT'
    });
    return { valid: false, normalized: null, issues };
  }

  if (typeof text !== 'string') {
    issues.push({
      severity: 'error',
      confidence: 'deterministic',
      code: 'INVALID_TYPE'
    });
    return { valid: false, normalized: null, issues };
  }

  // Hard limit: text length
  if (text.length > INPUT_LIMITS.MAX_TEXT_LENGTH) {
    issues.push({
      severity: 'error',
      confidence: 'deterministic',
      code: 'INPUT_TOO_LONG'
    });
  }

  // Hard limit: null bytes
  if (/\x00/.test(text)) {
    issues.push({
      severity: 'error',
      confidence: 'deterministic',
      code: 'NULL_BYTE'
    });
  }

  const valid = !issues.some(i => i.severity === 'error');

  return {
    valid,
    normalized: text.normalize('NFKC'),
    issues
  };
}

module.exports = { validateInput, INPUT_LIMITS };
