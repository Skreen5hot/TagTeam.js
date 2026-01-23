/**
 * VerbPhraseExtractor - Phase 5.2
 *
 * Extracts verb phrases from POS-tagged tokens without relying on Compromise.
 * Identifies modals, negation, auxiliaries, tense, and voice.
 *
 * @example
 * const extractor = new VerbPhraseExtractor(lemmatizer);
 * const tokens = [["The", "DT"], ["doctor", "NN"], ["must", "MD"], ["allocate", "VB"]];
 * extractor.extract(tokens)
 * // => [{
 * //   verb: "allocate", lemma: "allocate", tense: "present",
 * //   modal: "must", negated: false, auxiliary: null,
 * //   startIndex: 2, endIndex: 3, sourceText: "must allocate"
 * // }]
 */

class VerbPhraseExtractor {
  constructor(lemmatizer) {
    this.lemmatizer = lemmatizer;

    // POS tags that indicate verbs
    this.verbTags = new Set(['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ']);

    // Modal verbs
    this.modals = new Set([
      'can', 'could', 'may', 'might', 'must',
      'shall', 'should', 'will', 'would', 'ought'
    ]);

    // Auxiliary verbs (forms of be, have, do)
    this.auxiliaries = new Set([
      'be', 'am', 'is', 'are', 'was', 'were', 'being', 'been',
      'have', 'has', 'had', 'having',
      'do', 'does', 'did'
    ]);

    // Negation words
    this.negationWords = new Set(['not', "n't", 'never', 'no']);
  }

  /**
   * Extract verb phrases from POS-tagged tokens
   * @param {Array<[string, string]>} taggedTokens - Array of [word, tag] pairs
   * @returns {Array<Object>} - Array of verb phrase objects
   */
  extract(taggedTokens) {
    const verbPhrases = [];
    const used = new Set(); // Track indices already part of a VP

    for (let i = 0; i < taggedTokens.length; i++) {
      if (used.has(i)) continue;

      const [word, tag] = taggedTokens[i];

      // Check for modal (MD tag)
      if (tag === 'MD' || this.modals.has(word.toLowerCase())) {
        const vp = this._extractVerbPhraseStartingAt(taggedTokens, i);
        if (vp) {
          verbPhrases.push(vp);
          for (let j = vp.startIndex; j <= vp.endIndex; j++) used.add(j);
        }
        continue;
      }

      // Check for auxiliary or verb
      if (this.verbTags.has(tag) || this.auxiliaries.has(word.toLowerCase())) {
        const vp = this._extractVerbPhraseStartingAt(taggedTokens, i);
        if (vp) {
          verbPhrases.push(vp);
          for (let j = vp.startIndex; j <= vp.endIndex; j++) used.add(j);
        }
      }
    }

    return verbPhrases;
  }

  /**
   * Extract a verb phrase starting at a given index
   * @private
   */
  _extractVerbPhraseStartingAt(tokens, startIdx) {
    let modal = null;
    let negated = false;
    let auxiliaries = [];
    let mainVerb = null;
    let mainVerbTag = null;
    let endIdx = startIdx;
    let actualStartIdx = startIdx;

    // Look back for negation adverbs like "never" that precede the verb
    if (startIdx > 0) {
      const [prevWord, prevTag] = tokens[startIdx - 1];
      if (prevTag === 'RB' && this.negationWords.has(prevWord.toLowerCase())) {
        negated = true;
        actualStartIdx = startIdx - 1;
      }
    }

    let i = startIdx;
    const [firstWord, firstTag] = tokens[i];

    // Check for modal
    if (firstTag === 'MD' || this.modals.has(firstWord.toLowerCase())) {
      modal = firstWord.toLowerCase();
      i++;
    }

    // Look for negation, auxiliaries, and main verb
    while (i < tokens.length) {
      const [word, tag] = tokens[i];
      const lowerWord = word.toLowerCase();

      // Check for negation
      if (this.negationWords.has(lowerWord) || lowerWord === "n't") {
        negated = true;
        endIdx = i;
        i++;
        continue;
      }

      // Check for adverb (might appear between aux and main verb)
      if (tag === 'RB' && !this.negationWords.has(lowerWord)) {
        endIdx = i;
        i++;
        continue;
      }

      // Check for auxiliary verb
      if (this.auxiliaries.has(lowerWord) && !mainVerb) {
        auxiliaries.push(lowerWord);
        endIdx = i;
        i++;
        continue;
      }

      // Check for main verb
      if (this.verbTags.has(tag)) {
        mainVerb = word;
        mainVerbTag = tag;
        endIdx = i;
        i++;

        // Check for particle (phrasal verb) or additional verb form
        if (i < tokens.length) {
          const [nextWord, nextTag] = tokens[i];
          // Past participle following auxiliary
          if (nextTag === 'VBN' && auxiliaries.length > 0) {
            mainVerb = nextWord;
            mainVerbTag = nextTag;
            endIdx = i;
            i++;
          }
          // Gerund following auxiliary
          else if (nextTag === 'VBG' && auxiliaries.length > 0) {
            mainVerb = nextWord;
            mainVerbTag = nextTag;
            endIdx = i;
            i++;
          }
        }
        break;
      }

      // Not part of verb phrase
      break;
    }

    // If no main verb found but we have a modal or aux, the aux might be the main verb
    if (!mainVerb && (modal || auxiliaries.length > 0)) {
      if (auxiliaries.length > 0) {
        mainVerb = auxiliaries.pop();
        mainVerbTag = this._getTagForWord(mainVerb, tokens);
      } else if (modal) {
        // Modal alone is not a complete VP
        return null;
      }
    }

    if (!mainVerb) return null;

    // Determine tense and voice
    const tense = this._determineTense(mainVerbTag, auxiliaries);
    const isPassive = this._isPassive(auxiliaries, mainVerbTag);

    // Get lemma
    const lemmaResult = this.lemmatizer
      ? this.lemmatizer.lemmatize(mainVerb, mainVerbTag)
      : { lemma: mainVerb.toLowerCase() };

    // Build source text
    const sourceWords = [];
    for (let j = actualStartIdx; j <= endIdx; j++) {
      sourceWords.push(tokens[j][0]);
    }

    return {
      verb: mainVerb,
      lemma: lemmaResult.lemma,
      tense: tense,
      modal: modal,
      negated: negated,
      auxiliary: auxiliaries.length > 0 ? auxiliaries : null,
      isPassive: isPassive,
      startIndex: actualStartIdx,
      endIndex: endIdx,
      sourceText: sourceWords.join(' ')
    };
  }

  /**
   * Determine tense from verb tag and auxiliaries
   * @private
   */
  _determineTense(verbTag, auxiliaries) {
    if (!verbTag) return 'unknown';

    // Check for future with "will"
    if (auxiliaries.some(aux => ['will', 'shall'].includes(aux))) {
      return 'future';
    }

    // Check for past
    if (verbTag === 'VBD' || verbTag === 'VBN') {
      if (auxiliaries.some(aux => ['have', 'has', 'had'].includes(aux))) {
        return 'perfect';
      }
      return 'past';
    }

    // Check for progressive
    if (verbTag === 'VBG') {
      if (auxiliaries.some(aux => ['be', 'am', 'is', 'are', 'was', 'were'].includes(aux))) {
        return 'progressive';
      }
    }

    // Present forms
    if (verbTag === 'VBZ' || verbTag === 'VBP' || verbTag === 'VB') {
      return 'present';
    }

    return 'present';
  }

  /**
   * Check if verb phrase is passive voice
   * @private
   */
  _isPassive(auxiliaries, mainVerbTag) {
    // Passive = form of "be" + past participle (VBN)
    const hasBe = auxiliaries.some(aux =>
      ['be', 'am', 'is', 'are', 'was', 'were', 'been', 'being'].includes(aux)
    );
    return hasBe && mainVerbTag === 'VBN';
  }

  /**
   * Get POS tag for a word from tokens
   * @private
   */
  _getTagForWord(word, tokens) {
    const lw = word.toLowerCase();
    for (const [w, tag] of tokens) {
      if (w.toLowerCase() === lw) return tag;
    }
    return 'VB';
  }

  /**
   * Check if a token sequence contains negation
   * @param {Array<[string, string]>} tokens
   * @param {number} verbIndex - Index of the verb
   * @returns {boolean}
   */
  detectNegation(tokens, verbIndex) {
    // Look before the verb (within 3 tokens)
    for (let i = Math.max(0, verbIndex - 3); i < verbIndex; i++) {
      const word = tokens[i][0].toLowerCase();
      if (this.negationWords.has(word)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Extract modal from before a verb
   * @param {Array<[string, string]>} tokens
   * @param {number} verbIndex
   * @returns {string|null}
   */
  extractModal(tokens, verbIndex) {
    // Look before the verb (within 3 tokens)
    for (let i = Math.max(0, verbIndex - 3); i < verbIndex; i++) {
      const [word, tag] = tokens[i];
      if (tag === 'MD' || this.modals.has(word.toLowerCase())) {
        return word.toLowerCase();
      }
    }
    return null;
  }

  /**
   * Classify modal as deontic or epistemic (for ambiguity detection)
   * @param {string} modal
   * @param {Object} context - Contextual info (subject type, aspect, etc.)
   * @returns {{ isDeontic: boolean, isEpistemic: boolean }}
   */
  classifyModalForce(modal, context = {}) {
    const m = modal.toLowerCase();

    // Pure deontic modals
    if (m === 'shall') {
      return { isDeontic: true, isEpistemic: false };
    }

    // Pure epistemic modals
    if (m === 'might') {
      return { isDeontic: false, isEpistemic: true };
    }

    // Ambiguous modals - need context
    if (['must', 'should', 'may', 'can', 'could', 'would'].includes(m)) {
      // These are systematically ambiguous
      // Use context to determine default reading
      const { hasAgentSubject, isPerfectAspect, isStativeVerb } = context;

      // Perfect aspect + must/should -> epistemic
      if (isPerfectAspect && (m === 'must' || m === 'should')) {
        return { isDeontic: false, isEpistemic: true };
      }

      // Stative verb + modal -> epistemic
      if (isStativeVerb && (m === 'should' || m === 'must')) {
        return { isDeontic: false, isEpistemic: true };
      }

      // Agent subject + intentional verb -> deontic
      if (hasAgentSubject && (m === 'must' || m === 'should')) {
        return { isDeontic: true, isEpistemic: false };
      }

      // Default: ambiguous
      return { isDeontic: true, isEpistemic: true };
    }

    return { isDeontic: false, isEpistemic: false };
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VerbPhraseExtractor;
}
if (typeof window !== 'undefined') {
  window.VerbPhraseExtractor = VerbPhraseExtractor;
}
