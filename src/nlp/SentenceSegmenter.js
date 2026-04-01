/**
 * SentenceSegmenter.js — Split input text into sentence records
 *
 * Source: TagTeam Sentence Boundary Architecture Specification v1.3 §5.1
 * Authority: The Segment-First Invariant (§3.1)
 *
 * Wave 1: Rule B-1 (standard hard sentence boundaries)
 * Wave 2: Rules B-2 (numbered lists), B-3 (semicolons), B-4 (headers),
 *          parenthetical extraction, SentenceRelationship construction
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ============================================================================
// Constants
// ============================================================================

const SB_MODALS = new Set(['shall', 'must', 'may', 'should', 'will', 'can', 'could', 'would']);

const SB_CONNECTIVES = new Set([
  'however', 'notwithstanding', 'furthermore', 'moreover', 'additionally',
  'therefore', 'thus', 'consequently', 'nevertheless', 'accordingly',
  'including', 'also', 'otherwise'
]);

const SB_DETERMINERS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those',
  'each', 'every', 'all', 'any'
]);

const SB_PRONOUNS = new Set(['it', 'he', 'she', 'they', 'we', 'i', 'you']);

const SB_AUX_VERBS = new Set([
  'is', 'are', 'was', 'were', 'has', 'have', 'had', 'do', 'does', 'did'
]);

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
 * @returns {SegmenterOutput}
 */
function segment(inputText, options = {}) {
  if (!inputText || typeof inputText !== 'string') {
    return { sentences: [], sentenceRelationships: [], abbreviationsMatched: [], totalTokens: 0 };
  }

  const abbreviations = loadAbbreviationLexicon();
  const text = inputText.trim();
  const tokens = tokenizeWithPositions(text);

  if (tokens.length === 0) {
    return { sentences: [], sentenceRelationships: [], abbreviationsMatched: [], totalTokens: 0 };
  }

  // Phase 1: Check for list markers (Rule B-2) — highest priority
  const listMarkers = detectListMarkers(tokens, text);
  if (listMarkers.length > 0) {
    return buildListResult(tokens, listMarkers, text);
  }

  // Phase 2: Check for semicolons (Rule B-3)
  const semicolonIdx = findSemicolon(tokens);
  if (semicolonIdx !== -1 && checkSemicolonGuard(tokens, semicolonIdx)) {
    return buildSemicolonResult(tokens, semicolonIdx, text);
  }

  // Phase 3: Find B-1 boundaries, refine with B-4 check
  const boundaries = findBoundariesWithTypes(tokens, abbreviations, text);

  // Phase 4: Build sentence records
  const sentences = buildSentenceRecordsFromBoundaries(tokens, boundaries, text);

  // Phase 5: Extract parentheticals
  const { sentences: finalSentences, relationships: parenRelationships } =
    extractParentheticals(sentences, tokens, text);

  return {
    sentences: finalSentences,
    sentenceRelationships: parenRelationships,
    abbreviationsMatched: [],
    totalTokens: tokens.length
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
  const tokens = [];
  // Match: abbreviations with dots (U.S., e.g.), ellipsis, contractions, words, punctuation
  const regex = /([A-Za-z]\.(?:[A-Za-z]\.)+|\.{3}|[A-Za-z0-9]+'[A-Za-z]+|[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*|[.!?,;:()"\[\]{}])/g;
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
// Rule B-2: Numbered List Item (§5.1.3)
// ============================================================================

/**
 * Detect numbered list markers in the token stream.
 * A list marker is a digit or lowercase letter followed by '.' at the
 * start of input or after sentence-ending punctuation.
 *
 * @param {Array} tokens
 * @param {string} text
 * @returns {Array<{digitIdx: number, dotIdx: number, marker: string}>}
 */
function detectListMarkers(tokens, text) {
  const markers = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const tok = tokens[i];
    const nextTok = tokens[i + 1];

    if (nextTok.text !== '.') continue;
    if (!/^(\d+|[a-z])$/.test(tok.text)) continue;

    // At start of input
    if (i === 0) {
      markers.push({ digitIdx: i, dotIdx: i + 1, marker: tok.text + '.' });
      continue;
    }

    // After sentence-ending punctuation or newline
    const prevTok = tokens[i - 1];
    if (prevTok.text === '.' || prevTok.text === '!' || prevTok.text === '?') {
      markers.push({ digitIdx: i, dotIdx: i + 1, marker: tok.text + '.' });
      continue;
    }

    // After newline in original text
    const textBetween = text.substring(prevTok.end, tok.start);
    if (/\n/.test(textBetween)) {
      markers.push({ digitIdx: i, dotIdx: i + 1, marker: tok.text + '.' });
    }
  }
  return markers;
}

/**
 * Build segmenter result for numbered list input (Rule B-2).
 */
function buildListResult(tokens, listMarkers, text) {
  const sentences = [];

  for (let m = 0; m < listMarkers.length; m++) {
    const marker = listMarkers[m];
    const startIdx = marker.dotIdx + 1;

    // End: token before next marker's digit, or end of tokens
    const endIdx = (m + 1 < listMarkers.length)
      ? listMarkers[m + 1].digitIdx - 1
      : tokens.length - 1;

    if (startIdx > endIdx) continue;

    const sentTokens = tokens.slice(startIdx, endIdx + 1);
    const sentText = text.substring(tokens[startIdx].start, tokens[endIdx].end).trim();

    sentences.push({
      sentenceIndex: sentences.length,
      text: sentText,
      tokenSpan: [startIdx, endIdx],
      tokens: sentTokens.map(t => t.text),
      segmentationType: 'numbered-list',
      logicalConnector: 'enumeration',
      listMarker: marker.marker,
      precedingModalContext: null,
      isParenthetical: false,
      parentSentenceIndex: null,
    });
  }

  // Relationships between consecutive list items
  const relationships = [];
  for (let i = 0; i < sentences.length - 1; i++) {
    relationships.push({
      fromSentenceIndex: i,
      toSentenceIndex: i + 1,
      logicalConnector: 'enumeration',
      relationshipType: 'enumeration',
    });
  }

  return {
    sentences,
    sentenceRelationships: relationships,
    abbreviationsMatched: [],
    totalTokens: tokens.length
  };
}

// ============================================================================
// Rule B-3: Semicolon Conditional (§5.1.3)
// ============================================================================

/**
 * Find the first semicolon token index.
 */
function findSemicolon(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].text === ';') return i;
  }
  return -1;
}

/**
 * Independent-subject guard: check that both spans around a semicolon
 * have an independent subject (§5.1.3 Rule B-3).
 */
function checkSemicolonGuard(tokens, semiIdx) {
  const before = tokens.slice(0, semiIdx);
  const after = tokens.slice(semiIdx + 1);
  return hasIndependentSubject(before) && hasIndependentSubject(after);
}

/**
 * Check if a token span has an independent subject.
 * After stripping leading connectives + comma, the first content word
 * must be a determiner, pronoun, or capitalized word (proper noun).
 */
function hasIndependentSubject(tokens) {
  if (tokens.length === 0) return false;

  let startIdx = 0;

  // Skip leading connective
  if (SB_CONNECTIVES.has(tokens[0].text.toLowerCase())) {
    startIdx = 1;
    // Skip optional comma after connective
    if (startIdx < tokens.length && tokens[startIdx].text === ',') startIdx++;
  }

  if (startIdx >= tokens.length) return false;

  const firstContent = tokens[startIdx].text;
  const firstContentLc = firstContent.toLowerCase();

  if (SB_DETERMINERS.has(firstContentLc)) return true;
  if (SB_PRONOUNS.has(firstContentLc)) return true;
  if (/^[A-Z]/.test(firstContent) && !SB_CONNECTIVES.has(firstContentLc)) return true;

  return false;
}

/**
 * Build segmenter result for semicolon split (Rule B-3).
 * The semicolon token is consumed — absent from both tokens arrays.
 */
function buildSemicolonResult(tokens, semiIdx, text) {
  const beforeTokens = tokens.slice(0, semiIdx);
  const afterTokens = tokens.slice(semiIdx + 1);

  const sent0Text = text.substring(
    beforeTokens[0].start,
    beforeTokens[beforeTokens.length - 1].end
  ).trim();

  const sent1Text = text.substring(
    afterTokens[0].start,
    afterTokens[afterTokens.length - 1].end
  ).trim();

  const relType = detectRelationshipType(afterTokens);

  const sentences = [
    {
      sentenceIndex: 0,
      text: sent0Text,
      tokenSpan: [0, semiIdx - 1],
      tokens: beforeTokens.map(t => t.text),
      segmentationType: 'semicolon-conditional',
      logicalConnector: 'semicolon',
      listMarker: null,
      precedingModalContext: null,
      isParenthetical: false,
      parentSentenceIndex: null,
    },
    {
      sentenceIndex: 1,
      text: sent1Text,
      tokenSpan: [semiIdx + 1, tokens.length - 1],
      tokens: afterTokens.map(t => t.text),
      segmentationType: 'semicolon-conditional',
      logicalConnector: 'semicolon',
      listMarker: null,
      precedingModalContext: null,
      isParenthetical: false,
      parentSentenceIndex: null,
    }
  ];

  const relationships = [{
    fromSentenceIndex: 0,
    toSentenceIndex: 1,
    logicalConnector: 'semicolon',
    relationshipType: relType,
  }];

  return {
    sentences,
    sentenceRelationships: relationships,
    abbreviationsMatched: [],
    totalTokens: tokens.length
  };
}

/**
 * Detect the relationship type from the first token(s) of the second clause.
 * Normative algorithm from §4.4 — used by SentenceRelationship construction.
 *
 * Two-token phrases take priority over single tokens to handle
 * "provided that", "subject to", etc. correctly.
 */
const LEGAL_PROVISO_MARKERS   = ['notwithstanding', 'subject to', 'pursuant to',
                                  'in accordance with'];
const LEGAL_EXCEPTION_MARKERS = ['provided that', 'except that', 'except where', 'unless'];
const CONTRAST_MARKERS        = ['however', 'nevertheless', 'conversely'];
const ELABORATION_MARKERS     = ['specifically', 'particularly', 'namely', 'that is'];

function detectRelationshipType(afterTokens) {
  if (afterTokens.length === 0) return 'juxtaposition';

  const first  = afterTokens[0].text.toLowerCase();
  const phrase = `${first} ${(afterTokens[1]?.text || '').toLowerCase()}`.trim();

  if (LEGAL_EXCEPTION_MARKERS.includes(phrase) ||
      LEGAL_EXCEPTION_MARKERS.includes(first))   return 'legal-exception';
  if (LEGAL_PROVISO_MARKERS.includes(phrase) ||
      LEGAL_PROVISO_MARKERS.includes(first))     return 'legal-proviso';
  if (CONTRAST_MARKERS.includes(first))          return 'contrast';
  if (ELABORATION_MARKERS.includes(first))       return 'elaboration';

  return 'juxtaposition';
}

// ============================================================================
// Rule B-4: Section Header (§5.1.3)
// ============================================================================

/**
 * Check if a B-1 boundary is actually a section header (B-4).
 * Preceding span must be a short capitalized noun phrase with no finite verb.
 * Following span must have proper noun + modal within 5 tokens.
 */
function isSectionHeader(tokens, periodIdx) {
  const preceding = tokens.slice(0, periodIdx);
  if (preceding.length === 0 || preceding.length > 5) return false;

  // Section headers don't start with determiners
  const DETS = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those']);
  if (DETS.has(preceding[0].text.toLowerCase())) return false;

  // All words must be capitalized or small connecting words
  const SMALL = new Set(['of', 'and', 'the', 'in', 'for', 'to', 'a', 'an', 'with', 'on', 'at', 'by']);
  for (const t of preceding) {
    if (SMALL.has(t.text.toLowerCase())) continue;
    if (!/^[A-Z]/.test(t.text)) return false;
  }

  // Must have no finite verbs
  for (const t of preceding) {
    const lc = t.text.toLowerCase();
    if (SB_MODALS.has(lc)) return false;
    if (SB_AUX_VERBS.has(lc)) return false;
    if (lc.endsWith('ed') && lc.length > 3) return false;
    if (lc.endsWith('ing') && lc.length > 3) return false;
  }

  // Following span must have proper noun + modal within 5 tokens
  const following = tokens.slice(periodIdx + 1, Math.min(periodIdx + 6, tokens.length));
  let hasProperNoun = false, hasModal = false;
  for (const t of following) {
    if (/^[A-Z]/.test(t.text) && t.text.length > 1) hasProperNoun = true;
    if (SB_MODALS.has(t.text.toLowerCase())) hasModal = true;
  }

  return hasProperNoun && hasModal;
}

// ============================================================================
// Rule B-1: Standard Sentence Boundary (§5.1.3) + B-4 Refinement
// ============================================================================

/**
 * Find sentence boundaries with type information.
 * Each B-1 boundary is checked for B-4 refinement.
 *
 * @param {Array} tokens
 * @param {Set} abbreviations
 * @param {string} text
 * @returns {Array<{tokenIndex: number, type: string}>}
 */
function findBoundariesWithTypes(tokens, abbreviations, text) {
  const boundaries = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i].text;
    if (tok !== '.' && tok !== '!' && tok !== '?') continue;

    // Abbreviation guard
    if (i > 0) {
      const prevToken = tokens[i - 1].text;
      const withDot = prevToken + '.';
      if (abbreviations.has(withDot.toLowerCase()) || abbreviations.has(prevToken.toLowerCase())) continue;
      if (abbreviations.has(prevToken.toLowerCase() + '.')) continue;
    }

    // Next token must exist and start uppercase
    if (i + 1 >= tokens.length) continue;
    const nextToken = tokens[i + 1].text;
    if (!nextToken || !/^[A-Z]/.test(nextToken)) continue;

    // B-4 check: is this a section header boundary?
    const type = isSectionHeader(tokens, i) ? 'section-header-inline' : 'standard';
    boundaries.push({ tokenIndex: i, type });
  }

  return boundaries;
}

// ============================================================================
// Sentence Record Construction
// ============================================================================

/**
 * Build SentenceRecord objects from typed boundaries.
 */
function buildSentenceRecordsFromBoundaries(tokens, boundaries, text) {
  if (boundaries.length === 0) {
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
    const boundary = boundaries[b];
    const boundaryIdx = boundary.tokenIndex;

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
      segmentationType: boundary.type,
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
// Parenthetical Extraction (§5.1.4)
// ============================================================================

/**
 * Extract qualifying parentheticals as child SentenceRecords.
 * Criteria: contains modal verb, contains finite verb, > 5 tokens.
 */
function extractParentheticals(sentences, allTokens, text) {
  const updated = [];
  const children = [];

  for (const sent of sentences) {
    const toks = sent.tokens;
    const openIdx = toks.indexOf('(');
    const closeIdx = toks.lastIndexOf(')');

    if (openIdx === -1 || closeIdx === -1 || closeIdx <= openIdx + 1) {
      updated.push(sent);
      continue;
    }

    // Content between parentheses (exclusive)
    const parenContent = toks.slice(openIdx + 1, closeIdx);

    // Check all 3 extraction criteria (§5.1.4)
    const hasModal = parenContent.some(t => SB_MODALS.has(t.toLowerCase()));
    const hasVerb = parenContent.some(t => {
      const lc = t.toLowerCase();
      return SB_AUX_VERBS.has(lc) || SB_MODALS.has(lc);
    });
    const longEnough = parenContent.length > 5;

    if (!hasModal || !hasVerb || !longEnough) {
      updated.push(sent);
      continue;
    }

    // Replace parenthetical content with sentinel in parent
    const sentinelTokens = [
      ...toks.slice(0, openIdx),
      '(', '...', ')',
      ...toks.slice(closeIdx + 1)
    ];

    // Parent sentence: text for parsing is the clean version (without parenthetical)
    const beforeParen = toks.slice(0, openIdx);
    const afterParen = toks.slice(closeIdx + 1);
    const cleanText = [...beforeParen, ...afterParen].join(' ');

    const parentSent = {
      ...sent,
      text: cleanText,
      tokens: sentinelTokens,
      _sentinelTokens: sentinelTokens,
      _cleanText: cleanText,
    };
    updated.push(parentSent);

    // Child sentence
    const childText = parenContent.join(' ');
    children.push({
      sentenceIndex: -1, // renumbered below
      text: childText,
      tokenSpan: [sent.tokenSpan[0] + openIdx + 1, sent.tokenSpan[0] + closeIdx - 1],
      tokens: parenContent,
      segmentationType: 'parenthetical',
      logicalConnector: null,
      listMarker: null,
      precedingModalContext: null,
      isParenthetical: true,
      parentSentenceIndex: sent.sentenceIndex,
    });
  }

  // Append children and renumber
  const all = [...updated, ...children];
  for (let i = 0; i < all.length; i++) {
    all[i].sentenceIndex = i;
  }

  return { sentences: all, relationships: [] };
}

// ============================================================================
// Exports
// ============================================================================

module.exports = { segment, loadAbbreviationLexicon, tokenizeWithPositions };
