'use strict';

/**
 * Output Sanitizer with Provenance
 *
 * Strips unexpected properties from ICE output and attaches
 * provenance metadata so downstream systems can reason about trust.
 *
 * @module security/output-sanitizer
 */

const ALLOWED = [
  'id', 'type', 'label', 'fullName', 'nameComponents',
  'denotedType', 'candidateType', 'expression',
  'assertedRelation', 'subject', 'objects',
  'verbPhrase', 'agent', 'patient',
  'actualityStatus', 'normativeStatus', 'salience',
  'denotationConfidence', 'sourceSpan', 'evidence'
];

/**
 * Escape HTML special characters to prevent XSS (AC-4.8).
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Strip an ICE object to only allowed properties.
 * String values are HTML-escaped to prevent XSS.
 * @param {Object} ice
 * @returns {Object}
 */
function sanitize(ice) {
  const result = {};
  for (const prop of ALLOWED) {
    if (ice[prop] !== undefined) {
      result[prop] = typeof ice[prop] === 'string' ? escapeHtml(ice[prop]) : ice[prop];
    }
  }
  return result;
}

/**
 * Sanitize ICEs and attach provenance metadata.
 * @param {Array<Object>} ices
 * @param {{ ontologyHash: string, warnings: Array<{code: string}> }} context
 * @returns {Array<Object>}
 */
function sanitizeWithProvenance(ices, context) {
  return ices.map(ice => ({
    ...sanitize(ice),
    provenance: {
      tagteamVersion: process.env.TAGTEAM_VERSION || 'unknown',
      ontologyHash: context.ontologyHash,
      inputValidated: true,
      securityWarnings: context.warnings.map(w => w.code),
      timestamp: new Date().toISOString()
    }
  }));
}

module.exports = { sanitize, sanitizeWithProvenance, escapeHtml, ALLOWED };
