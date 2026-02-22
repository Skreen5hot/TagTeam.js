'use strict';

/**
 * ComplexDesignatorDetector
 *
 * Detects multi-word proper names (complex designators) in text using
 * Greedy NER — joining capitalized sequences across conjunctions and
 * prepositions that are typically part of organization/entity names.
 *
 * Per the v7 spec:
 * - Standard NER splits on conjunctions → fragments names
 * - Greedy NER joins on conjunctions when inside proper names
 * - ALL_CAPS words (AIDS, NATO) are never verbs inside capitalized sequences
 * - Morphological overrides suppress Process typing for -tion/-ment inside names
 *
 * @module graph/ComplexDesignatorDetector
 */

/**
 * Words that are NEVER verbs inside capitalized sequences.
 */
const NEVER_VERB_INSIDE_NAME = new Set([
  // Organization suffixes
  'incorporated', 'limited', 'ltd', 'inc', 'corp', 'llc',
  // Common name words
  'international', 'national', 'united', 'joint', 'general',
  // Nominalizations (process-like suffixes that are name components)
  'development', 'settlement', 'investment', 'management', 'services',
  'association', 'organization', 'operation', 'co-operation',
  'cooperation', 'administration', 'commission', 'foundation',
  'institution', 'federation', 'corporation', 'department',
  'programme', 'program', 'institute', 'institutes', 'centre', 'center',
  'council', 'committee', 'ministry', 'bureau', 'agency', 'office',
  'authority', 'board', 'bank', 'fund', 'union'
]);

/**
 * Known acronyms — always nouns, never verbs.
 */
const KNOWN_ACRONYMS = new Set([
  'AIDS', 'HIV', 'NATO', 'UNESCO', 'UNICEF', 'NASA', 'WHO',
  'OECD', 'ICSID', 'UNAIDS', 'IMF', 'WTO', 'EU', 'UN', 'OPEC',
  'ASEAN', 'NAFTA', 'FBI', 'CIA', 'NSA', 'IRS', 'EPA', 'CDC',
  'NIH', 'HHS', 'DOJ', 'DOD', 'DOS', 'DOE', 'USAID'
]);

/**
 * Internal connectors that can join parts of proper names.
 */
const INTERNAL_CONNECTORS = new Set(['and', 'or', 'of', 'for', 'on', 'the']);

/**
 * Determiners that signal the start of a new noun phrase.
 */
const DETERMINERS = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those']);

/**
 * High-confidence verbs that always signal a boundary even inside capitalized sequences.
 */
const HIGH_CONFIDENCE_VERBS = new Set([
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'has', 'have', 'had',
  'do', 'does', 'did',
  'runs', 'eats', 'kills', 'builds', 'destroys',
  'include', 'includes', 'included',
  'support', 'supports', 'supported',
  'visit', 'visits', 'visited',
  'deploy', 'deploys', 'deployed',
  'meet', 'meets', 'met',
  'signed', 'signs', 'sign',
  'said', 'says', 'say',
  'made', 'makes', 'make',
  'took', 'takes', 'take',
  'gave', 'gives', 'give'
]);

class ComplexDesignatorDetector {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Detect complex designator spans in text.
   *
   * @param {string} text - Input text
   * @returns {Array<{text: string, start: number, end: number, components: string[]}>}
   */
  detect(text) {
    if (!text || typeof text !== 'string') return [];

    const tokens = this._tokenize(text);
    const spans = [];
    let i = 0;

    while (i < tokens.length) {
      // Look for the start of a capitalized sequence or known acronym
      if (this._isCapitalizedOrAcronym(tokens[i])) {
        const span = this._consumeComplexDesignator(tokens, i);
        // Allow single-component spans if they are known acronyms
        const minComponents = KNOWN_ACRONYMS.has(tokens[i].word) ? 1 : 2;
        if (span && span.components.length >= minComponents) {
          spans.push(span);
          // Skip past this span
          i = span._endIndex;
          continue;
        }
      }
      i++;
    }

    // Post-process: split list-separated spans
    return this._splitListSpans(spans, text);
  }

  /**
   * Create JSON-LD ComplexDesignator nodes from detected spans.
   *
   * @param {Array} spans - Detected spans from detect()
   * @param {Object} [graphBuilder] - Optional graph builder for IRI generation
   * @returns {Array<Object>} JSON-LD nodes
   */
  createNodes(spans, graphBuilder) {
    return spans.map((span, idx) => {
      let id;
      if (graphBuilder) {
        id = graphBuilder.generateIRI(
          span.text.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_'),
          'ComplexDesignator',
          span.start
        );
      } else {
        const slug = span.text.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
        id = `inst:ComplexDesignator_${slug}_${span.start}`;
      }

      return {
        '@id': id,
        '@type': ['tagteam:ComplexDesignator'],
        'tagteam:fullName': span.text,
        'tagteam:nameComponents': span.components,
        'tagteam:denotedType': 'Organization',
        'tagteam:startPosition': span.start,
        'tagteam:endPosition': span.end
      };
    });
  }

  /**
   * Tokenize text into words with position information.
   * @private
   */
  _tokenize(text) {
    const tokens = [];
    // Match words, punctuation, and apostrophe-attached suffixes
    const regex = /([A-Za-z'-]+|[,;:.])/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      tokens.push({
        word: match[1],
        start: match.index,
        end: match.index + match[1].length
      });
    }
    return tokens;
  }

  /**
   * Check if a token is capitalized or a known acronym.
   * @private
   */
  _isCapitalizedOrAcronym(token) {
    if (!token) return false;
    const w = token.word;
    if (KNOWN_ACRONYMS.has(w)) return true;
    if (this._isAllCaps(w) && w.length >= 2) return true;
    return /^[A-Z]/.test(w);
  }

  /**
   * Check if a word is ALL_CAPS.
   * @private
   */
  _isAllCaps(word) {
    return word.length >= 2 && word === word.toUpperCase() && /^[A-Z]+$/.test(word);
  }

  /**
   * Consume tokens starting from index i to build a ComplexDesignator span.
   * Greedy: keeps consuming while the sequence looks like a proper name.
   * @private
   */
  _consumeComplexDesignator(tokens, startIdx) {
    const components = [];
    let i = startIdx;
    let lastCapEnd = -1;

    while (i < tokens.length) {
      const token = tokens[i];
      const word = token.word;
      const wordLower = word.toLowerCase();

      // Case 1: Capitalized word or known acronym — always include
      if (this._isCapitalizedOrAcronym(token)) {
        // Check if this is a high-confidence verb that should end the span
        if (components.length > 0 && this._isHighConfidenceVerb(word) &&
            !NEVER_VERB_INSIDE_NAME.has(wordLower) && !this._isAllCaps(word)) {
          break;
        }
        components.push(word);
        lastCapEnd = token.end;
        i++;
        continue;
      }

      // Case 2: Internal connector (and, or, of, for, on)
      if (INTERNAL_CONNECTORS.has(wordLower) && components.length > 0) {
        // Look ahead: if next meaningful token is capitalized or acronym, join
        const nextMeaningful = this._nextMeaningfulToken(tokens, i + 1);
        if (nextMeaningful && this._isCapitalizedOrAcronym(nextMeaningful)) {
          // Special case: "and the [lowercase]" → break (new clause)
          if ((wordLower === 'and' || wordLower === 'or') && i + 1 < tokens.length) {
            const nextToken = tokens[i + 1];
            if (nextToken && DETERMINERS.has(nextToken.word.toLowerCase())) {
              // Check what follows the determiner
              const afterDet = this._nextMeaningfulToken(tokens, i + 2);
              if (afterDet && !this._isCapitalizedOrAcronym(afterDet)) {
                // "and the [lowercase]" → break
                break;
              }
            }
          }
          components.push(word);
          i++;
          continue;
        } else {
          // Next token is lowercase/end — break
          break;
        }
      }

      // Case 3: Comma — context dependent
      if (word === ',') {
        // Look ahead past the comma
        const afterComma = this._nextMeaningfulToken(tokens, i + 1);
        if (!afterComma) break;

        // If "the" follows comma, check if it starts a new list item or a new clause
        if (afterComma.word.toLowerCase() === 'the') {
          // Look further: "the [Capitalized]" could be a new list item in an enumeration
          // But in list context ("..., the X, the Y, and the Z"), each "the" starts a new item
          // We should break here to allow list splitting later
          break;
        }

        // If next is "and" followed by "the" → list terminator, break
        if (afterComma.word.toLowerCase() === 'and') {
          const afterAnd = this._nextMeaningfulToken(tokens, i + 2);
          if (afterAnd && afterAnd.word.toLowerCase() === 'the') {
            break;
          }
        }

        // If next meaningful word is capitalized → still inside the name (e.g., "Marble, Slate")
        if (this._isCapitalizedOrAcronym(afterComma)) {
          components.push(',');
          i++;
          continue;
        }

        // Otherwise break
        break;
      }

      // Case 4: Lowercase word that's not a connector → boundary
      break;
    }

    // Allow single-component spans for known acronyms
    const firstWord = tokens[startIdx]?.word;
    const minLen = (KNOWN_ACRONYMS.has(firstWord) || this._isAllCaps(firstWord)) ? 1 : 2;
    if (components.length < minLen) return null;

    // Build the span text from the original text positions
    const firstToken = tokens[startIdx];
    const lastTokenIdx = startIdx + this._countTokensInComponents(tokens, startIdx, components) - 1;
    const lastToken = tokens[Math.min(lastTokenIdx, tokens.length - 1)];

    // Reconstruct text from original positions
    const spanStart = firstToken.start;
    const spanEnd = lastToken ? lastToken.end : firstToken.end;

    return {
      text: this._reconstructText(tokens, startIdx, components),
      start: spanStart,
      end: spanEnd,
      components: components,
      _endIndex: Math.min(lastTokenIdx + 1, tokens.length)
    };
  }

  /**
   * Reconstruct the span text from components, preserving spacing.
   * @private
   */
  _reconstructText(tokens, startIdx, components) {
    // Walk tokens from startIdx, collecting the original text
    let result = '';
    let tokenIdx = startIdx;
    let compIdx = 0;

    while (compIdx < components.length && tokenIdx < tokens.length) {
      const token = tokens[tokenIdx];
      const comp = components[compIdx];

      if (token.word === comp || token.word.toLowerCase() === comp.toLowerCase() || comp === ',') {
        if (result.length > 0 && comp !== ',') {
          result += ' ';
        } else if (comp === ',') {
          // No space before comma, but handled by original text
        }
        result += token.word;
        tokenIdx++;
        compIdx++;
      } else {
        tokenIdx++;
      }
    }

    return result;
  }

  /**
   * Count how many tokens are consumed by the components list.
   * @private
   */
  _countTokensInComponents(tokens, startIdx, components) {
    let tokenIdx = startIdx;
    let compIdx = 0;
    let count = 0;

    while (compIdx < components.length && tokenIdx < tokens.length) {
      const token = tokens[tokenIdx];
      const comp = components[compIdx];

      if (token.word === comp || token.word.toLowerCase() === comp.toLowerCase()) {
        count++;
        compIdx++;
      }
      tokenIdx++;
      if (tokenIdx - startIdx > components.length * 3) break; // safety
    }

    return count > 0 ? (tokenIdx - startIdx) : components.length;
  }

  /**
   * Get the next meaningful (non-whitespace) token after index.
   * @private
   */
  _nextMeaningfulToken(tokens, idx) {
    if (idx >= tokens.length) return null;
    return tokens[idx]; // tokens already skip whitespace
  }

  /**
   * Check if a word is a high-confidence verb (boundary signal).
   * @private
   */
  _isHighConfidenceVerb(word) {
    return HIGH_CONFIDENCE_VERBS.has(word.toLowerCase());
  }

  /**
   * Split detected spans that are actually comma-separated lists.
   * E.g., "the OECD, the World Bank, and UNICEF" should be 3 spans, not 1.
   * @private
   */
  _splitListSpans(spans, originalText) {
    // The splitting is already handled in _consumeComplexDesignator
    // by breaking at ", the" patterns.
    // This method handles the special case of top-level list detection
    // where items are separated by ", " and joined by "and"

    // If no spans detected, try to detect individual items from a list pattern
    if (spans.length === 0) {
      return this._detectListItems(originalText);
    }

    return spans;
  }

  /**
   * Detect individual ComplexDesignator items from a comma-separated list.
   * Handles: "the OECD, the World Bank, and UNICEF"
   * @private
   */
  _detectListItems(text) {
    // Split on ", " and ", and " to find list items
    // Then check each item for capitalized sequences
    const items = [];

    // Pattern: items separated by ", " with optional "and " before last
    // Remove leading "the " from the whole text first
    const cleanText = text.replace(/^the\s+/i, '');

    // Split on list separators
    const parts = cleanText.split(/,\s*(?:and\s+)?|,\s+/);

    for (const part of parts) {
      const trimmed = part.replace(/^(?:the\s+|and\s+)/i, '').trim();
      if (!trimmed) continue;

      // Check if this part contains capitalized words
      const tokens = this._tokenize(trimmed);
      if (tokens.length > 0 && tokens.some(t => this._isCapitalizedOrAcronym(t))) {
        const span = this._consumeComplexDesignator(tokens, 0);
        if (span) {
          // Adjust positions relative to original text
          const idx = text.indexOf(trimmed);
          if (idx >= 0) {
            span.start = idx;
            span.end = idx + trimmed.length;
          }
          items.push(span);
        }
      }
    }

    return items;
  }
}

module.exports = ComplexDesignatorDetector;
