/**
 * SentenceSegmenter.js — Split input text into sentence records
 *
 * Source: TagTeam Sentence Boundary Architecture Specification v1.3 §5.1
 * Authority: The Segment-First Invariant (§3.1)
 *
 * Wave 1: Rule B-1 only (standard hard sentence boundaries)
 * Waves 2-3: Rules B-2 (numbered lists), B-3 (semicolons), B-4 (headers)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ============================================================================
// Abbreviation Lexicon (§5.1.2)
// ============================================================================

let ABBREVIATION_SET = null;

/**
 * Load and merge the abbreviation lexicon from JSON file.
 * @returns {Set<string>} Merged set of all abbreviation entries (lowercased)
 */
function loadAbbreviationLexicon() {
  if (ABBREVIATION_SET) return ABBREVIATION_SET;

  let lexicon;
  try {
    const lexPath = path.join(__dirname, 'abbreviation-lexicon.json');
    lexicon = JSON.parse(fs.readFileSync(lexPath, 'utf8'));
  } catch (e) {
    // Fallback: minimal set if file not found
    lexicon = {
      standard: ['U.S.', 'U.S.C.', 'etc.', 'e.g.', 'i.e.', 'vs.', 'Dr.', 'Mr.', 'Mrs.', 'Ms.'],
      agency: [],
      custom: []
    };
  }

  // Merge all three tiers into a single Set (lowercased for matching)
  ABBREVIATION_SET = new Set();
  for (const tier of ['standard', 'agency', 'custom']) {
    const entries = lexicon[tier] || [];
    for (const entry of entries) {
      ABBREVIATION_SET.add(entry.toLowerCase());
    }
  }

  return ABBREVIATION_SET;
}

// ============================================================================
// SentenceSegmenter
// ============================================================================

/**
 * Segment input text into sentence records.
 *
 * @param {string} inputText - Full input text
 * @param {Object} [options] - Options
 * @param {Object} [options.tokenizer] - Tokenizer instance (must have .tokenize(text))
 * @param {Object} [options.posTagger] - POS tagger instance (must have .tag(tokens))
 * @returns {SegmenterOutput}
 */
function segment(inputText, options = {}) {
  if (!inputText || typeof inputText !== 'string') {
    return { sentences: [], sentenceRelationships: [], abbreviationsMatched: [], totalTokens: 0 };
  }

  const abbreviations = loadAbbreviationLexicon();
  const text = inputText.trim();

  // Tokenize the full input to get token boundaries
  // Use simple whitespace + punctuation split for boundary detection
  const tokenBoundaries = tokenizeWithPositions(text);

  if (tokenBoundaries.length === 0) {
    return { sentences: [], sentenceRelationships: [], abbreviationsMatched: [], totalTokens: 0 };
  }

  // Find sentence boundaries using Rule B-1
  const boundaries = findBoundaries(tokenBoundaries, abbreviations, text);

  // Split into sentence records
  const sentences = buildSentenceRecords(tokenBoundaries, boundaries, text);

  return {
    sentences,
    sentenceRelationships: [], // Wave 1: no soft boundaries
    abbreviationsMatched: [],
    totalTokens: tokenBoundaries.length
  };
}

// ============================================================================
// Tokenization (§5.1.1)
// ============================================================================

/**
 * Tokenize text with character positions for boundary detection.
 * @param {string} text
 * @returns {Array<{text: string, start: number, end: number, index: number}>}
 */
function tokenizeWithPositions(text) {
  const abbreviations = loadAbbreviationLexicon();
  const tokens = [];
  // Match: abbreviations with dots (U.S., e.g.), contractions, words, punctuation
  // Abbreviation pattern checked first to consume multi-dot sequences
  const regex = /([A-Za-z]\.(?:[A-Za-z]\.)+|[A-Za-z0-9]+'[A-Za-z]+|[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*|[.!?,;:()"\[\]{}])/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      text: match[1],
      start: match.index,
      end: match.index + match[1].length,
      index: tokens.length
    });
  }
  return tokens;
}

// ============================================================================
// Rule B-1: Standard Sentence Boundary (§5.1.3)
// ============================================================================

/**
 * Find hard sentence boundaries.
 *
 * Rule B-1:
 * - tokens[p] is '.', '!', or '?'
 * - tokens[p-1] is NOT in the abbreviation lexicon
 * - tokens[p+1] exists and begins with an uppercase character
 *
 * @param {Array} tokens - Token boundaries
 * @param {Set} abbreviations - Abbreviation set
 * @param {string} text - Original text
 * @returns {number[]} Token indices of boundary punctuation
 */
function findBoundaries(tokens, abbreviations, text) {
  const boundaries = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i].text;

    // Must be sentence-ending punctuation
    if (tok !== '.' && tok !== '!' && tok !== '?') continue;

    // Check preceding token is not an abbreviation
    if (i > 0) {
      const prevToken = tokens[i - 1].text;
      // Check if prevToken + '.' forms an abbreviation
      const withDot = prevToken + '.';
      if (abbreviations.has(withDot.toLowerCase()) || abbreviations.has(prevToken.toLowerCase())) {
        continue; // Skip — this period is part of an abbreviation
      }
      // Also check if the token itself (already containing the dot) is an abbreviation
      // e.g., "U.S." tokenized as a single token
      if (abbreviations.has(prevToken.toLowerCase() + '.')) {
        continue;
      }
    }

    // Check following token exists and starts uppercase
    if (i + 1 < tokens.length) {
      const nextToken = tokens[i + 1].text;
      if (nextToken && /^[A-Z]/.test(nextToken)) {
        boundaries.push(i);
      }
    }
    // If this is the last token, it's the final sentence boundary (no split needed)
  }

  return boundaries;
}

// ============================================================================
// Sentence Record Construction
// ============================================================================

/**
 * Build SentenceRecord objects from token boundaries.
 *
 * @param {Array} tokens - All document tokens with positions
 * @param {number[]} boundaries - Token indices of boundary punctuation
 * @param {string} text - Original text
 * @returns {Array<SentenceRecord>}
 */
function buildSentenceRecords(tokens, boundaries, text) {
  if (boundaries.length === 0) {
    // Single sentence — entire input
    return [{
      sentenceIndex: 0,
      text: text,
      tokenSpan: [0, tokens.length - 1],
      tokens: tokens.map(t => t.text),
      segmentationType: 'standard',
      logicalConnector: null,
      listMarker: null,
      precedingModalContext: null,
      isParenthetical: false,
      parentSentenceIndex: null,
    }];
  }

  const sentences = [];
  let sentStart = 0;

  for (let b = 0; b < boundaries.length; b++) {
    const boundaryIdx = boundaries[b];

    // Sentence includes tokens from sentStart through boundaryIdx (inclusive of punct)
    const sentTokens = tokens.slice(sentStart, boundaryIdx + 1);
    const sentText = text.substring(
      tokens[sentStart].start,
      tokens[boundaryIdx].end
    ).trim();

    sentences.push({
      sentenceIndex: sentences.length,
      text: sentText,
      tokenSpan: [sentStart, boundaryIdx],
      tokens: sentTokens.map(t => t.text),
      segmentationType: 'standard',
      logicalConnector: null,
      listMarker: null,
      precedingModalContext: null,
      isParenthetical: false,
      parentSentenceIndex: null,
    });

    sentStart = boundaryIdx + 1;
  }

  // Remaining tokens after last boundary → final sentence
  if (sentStart < tokens.length) {
    const sentTokens = tokens.slice(sentStart);
    const sentText = text.substring(
      tokens[sentStart].start,
      tokens[tokens.length - 1].end
    ).trim();

    sentences.push({
      sentenceIndex: sentences.length,
      text: sentText,
      tokenSpan: [sentStart, tokens.length - 1],
      tokens: sentTokens.map(t => t.text),
      segmentationType: 'standard',
      logicalConnector: null,
      listMarker: null,
      precedingModalContext: null,
      isParenthetical: false,
      parentSentenceIndex: null,
    });
  }

  return sentences;
}

// ============================================================================
// Exports
// ============================================================================

module.exports = { segment, loadAbbreviationLexicon, tokenizeWithPositions };
