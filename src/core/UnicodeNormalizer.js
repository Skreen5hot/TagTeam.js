/**
 * UnicodeNormalizer.js — Unicode Text Normalization
 *
 * AC-0.3: Unicode Normalization
 *
 * Source: TagTeam-Major-Refactor-v2.2.md §5.5.1
 * Authority: Unicode Consortium, UD-EWT tokenization conventions
 *
 * Converts Unicode variants to their ASCII equivalents before tokenization.
 * Runs FIRST in the pipeline, before ContractionExpander and Tokenizer.
 */

'use strict';

/**
 * Normalize Unicode text to ASCII-compatible form for UD-aligned processing.
 *
 * @param {string} text - Raw input text (may contain Unicode variants)
 * @returns {string} Normalized text with ASCII punctuation
 */
function normalizeUnicode(text) {
  return text
    .replace(/[\u2018\u2019\u201B]/g, "'")        // Smart single quotes → ASCII apostrophe
    .replace(/[\u201C\u201D\u201F]/g, '"')         // Smart double quotes → ASCII double quote
    .replace(/[\u00A0\u202F]/g, ' ')               // Non-breaking spaces → regular space
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')    // Zero-width chars + BOM → remove
    .replace(/\s*\u2014\s*/g, ' -- ')                 // Em dash → space-padded double hyphen
    .replace(/\u2013/g, '-')                        // En dash → hyphen
    .replace(/\u2026/g, '...')                       // Ellipsis → three periods
    .replace(/\u00AD/g, '');                         // Soft hyphen → remove
}

module.exports = {
  normalizeUnicode
};
