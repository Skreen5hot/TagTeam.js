/**
 * PerceptronTagger.js — Averaged Perceptron POS Tagger (Inference)
 *
 * Source: TagTeam-Major-Refactor-v2.2.md §6
 * Authority: Honnibal 2013, Penn Treebank tagset, UD-EWT XPOS
 *
 * Left-to-right greedy decoding with 18-feature template.
 * Trained model weights loaded from JSON (see training/scripts/train_pos_tagger.py).
 *
 * @example
 * const model = require('./data/pos-weights-pruned.json');
 * const tagger = new PerceptronTagger(model);
 * tagger.tag(['The', 'doctor', 'treated', 'the', 'patient']);
 * // → ['DT', 'NN', 'VBD', 'DT', 'NN']
 * tagger.tagFormatted(['The', 'doctor']);
 * // → [['The', 'DT'], ['doctor', 'NN']]
 */

'use strict';

class PerceptronTagger {
  /**
   * @param {Object} model - Trained model with weights, tagdict, classes, provenance
   */
  constructor(model) {
    this.weights = model.weights;       // feature → tag → weight
    this.classes = model.classes;        // list of all PTB tags
    this.provenance = model.provenance;  // training metadata

    // TagDict: compile-time optimization for unambiguous words
    // Frozen to prevent runtime mutation (AC-1A.3)
    this.tagdict = Object.freeze(Object.assign({}, model.tagdict || {}));
  }

  /**
   * Tag tokens, returning array of PTB tags.
   * Left-to-right greedy decoding with tagdict fast path.
   *
   * @param {string[]} tokens - Array of word tokens
   * @returns {string[]} Array of PTB POS tags
   */
  tag(tokens) {
    const tags = [];
    let prev = '-START-';
    let prev2 = '-START2-';

    for (let i = 0; i < tokens.length; i++) {
      // Fast path: unambiguous words from tagdict (AC-1A.3)
      const dictTag = this.tagdict[tokens[i]];
      if (dictTag) {
        tags.push(dictTag);
        prev2 = prev;
        prev = dictTag;
        continue;
      }

      // Extract features (18 features per spec §6)
      const features = this._getFeatures(tokens, i, prev, prev2);

      // Score each tag
      const scores = {};
      for (const cls of this.classes) scores[cls] = 0;

      for (const feat of features) {
        const w = this.weights[feat];
        if (!w) continue;
        for (const tag in w) {
          if (scores[tag] !== undefined) {
            scores[tag] += w[tag];
          }
        }
      }

      // Pick highest-scoring tag
      let bestTag = this.classes[0];
      let bestScore = scores[bestTag];
      for (let c = 1; c < this.classes.length; c++) {
        if (scores[this.classes[c]] > bestScore) {
          bestScore = scores[this.classes[c]];
          bestTag = this.classes[c];
        }
      }

      tags.push(bestTag);
      prev2 = prev;
      prev = bestTag;
    }

    return tags;
  }

  /**
   * Tag tokens, returning [["word", "TAG"], ...] format for backward
   * compatibility with POSTagger.tag() and NPChunker (AC-1A.6).
   *
   * @param {string[]} tokens - Array of word tokens
   * @returns {Array<[string, string]>} Array of [word, tag] pairs
   */
  tagFormatted(tokens) {
    const tags = this.tag(tokens);
    const result = [];
    for (let i = 0; i < tokens.length; i++) {
      result.push([tokens[i], tags[i]]);
    }
    return result;
  }

  /**
   * Compute collapsed word shape: generalizes capitalization patterns.
   * E.g., "Hello" → "Xx", "USA" → "X", "42nd" → "dx"
   *
   * @param {string} word
   * @returns {string}
   */
  _wordShape(word) {
    let shape = '';
    let prev = '';
    for (let j = 0; j < word.length; j++) {
      const ch = word[j];
      let s;
      if (ch >= 'A' && ch <= 'Z') s = 'X';
      else if (ch >= 'a' && ch <= 'z') s = 'x';
      else if (ch >= '0' && ch <= '9') s = 'd';
      else s = ch;
      // Collapse consecutive same-class chars
      if (s !== prev) {
        shape += s;
        prev = s;
      }
    }
    return shape;
  }

  /**
   * Extract features for a token at position i.
   * ~20-feature template from spec §6 (Honnibal 2013).
   *
   * JS Performance Advisory (§6): All suffix/prefix features are pre-computed
   * once per token to avoid repeated String.slice() in scoring loops.
   *
   * @param {string[]} tokens - All tokens in the sentence
   * @param {number} i - Index of current token
   * @param {string} prev - Predicted tag of previous token
   * @param {string} prev2 - Predicted tag of token before that
   * @returns {string[]} Array of feature strings
   */
  _getFeatures(tokens, i, prev, prev2) {
    const word = tokens[i];
    const len = word.length;

    // Pre-compute all string-derived features once (§6 JS Performance Advisory)
    const lower = word.toLowerCase();
    const suf3 = len >= 3 ? lower.slice(-3) : lower;
    const suf2 = len >= 2 ? lower.slice(-2) : lower;
    const suf1 = lower.slice(-1);
    const pre1 = word[0];
    const shape = this._wordShape(word);

    // Boolean features
    const isUpper = word === word.toUpperCase() && /[A-Z]/.test(word);
    const isTitle = /^[A-Z][a-z]/.test(word);
    const isDigit = /^\d+$/.test(word);
    const hasDigit = !isDigit && /\d/.test(word);
    const isHyphen = word.includes('-');

    // Context
    const prevWord = i > 0 ? tokens[i - 1] : '-START-';
    const nextWord = i < tokens.length - 1 ? tokens[i + 1] : '-END-';
    const nextLower = nextWord.toLowerCase();
    const nextSuf3 = nextLower.length >= 3 ? nextLower.slice(-3) : nextLower;
    const prevLower = prevWord !== '-START-' ? prevWord.toLowerCase() : prevWord;

    // Build feature array
    const features = [
      'bias',
      'word=' + word,
      'word_lower=' + lower,
      'suffix_3=' + suf3,
      'suffix_2=' + suf2,
      'suffix_1=' + suf1,
      'prefix_1=' + pre1,
      'word_shape=' + shape,
      'prev_word=' + prevWord,
      'prev_word_lower=' + prevLower,
      'prev_tag=' + prev,
      'prev_prev_tag=' + prev2,
      'prev_word+tag=' + prevWord + '+' + prev,
      'prev_tag+word=' + prev + '+' + word,
      'prev_prev_tag+prev_tag=' + prev2 + '+' + prev,
      'next_word=' + nextWord,
      'next_word_lower=' + nextLower,
      'next_suffix_3=' + nextSuf3,
    ];

    // Boolean features: only add when true (sparse representation)
    if (isUpper) features.push('is_upper');
    if (isTitle) features.push('is_title');
    if (isDigit) features.push('is_digit');
    if (hasDigit) features.push('has_digit');
    if (isHyphen) features.push('is_hyphen');
    if (i === 0) features.push('is_first');

    return features;
  }
}

// Export for Node.js / CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerceptronTagger;
}
// Export for browser
if (typeof window !== 'undefined') {
  window.PerceptronTagger = PerceptronTagger;
}
