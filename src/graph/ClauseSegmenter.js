/**
 * ClauseSegmenter.js
 *
 * v2 Phase 2: Clause boundary detection with three-case algorithm.
 * Detects compound sentence coordination and segments into clauses.
 *
 * Three-case algorithm (v2Spec §3.1.2):
 * - Case A: Full clause coordination (explicit subject + verb on both sides)
 * - Case B: Elliptical clause coordination (voice/aux change → inject left subject)
 * - Case C: VP coordination (same verb form, shared subject → no segmentation)
 *
 * Also handles:
 * - "So" disambiguation (Result vs Purpose, v2Spec §3.1.3)
 * - Conjunction-to-relation mapping
 *
 * @module graph/ClauseSegmenter
 * @version 2.0.0
 */

'use strict';

/**
 * Coordinating conjunctions that may indicate clause boundaries.
 */
const COORDINATING_CONJUNCTIONS = ['and', 'but', 'or', 'nor', 'yet', 'so'];

/**
 * Conjunction-to-relation mapping per v2Spec.
 */
const CONJUNCTION_RELATIONS = {
  'and': 'tagteam:and_then',
  'but': 'tagteam:contrasts_with',
  'yet': 'tagteam:contrasts_with',
  'or':  'tagteam:alternative_to',
  'nor': 'tagteam:alternative_to'
  // "so" is handled dynamically by _disambiguateSo()
};

/**
 * Modal verbs used for "so" Purpose detection.
 */
const MODALS = new Set(['could', 'would', 'might', 'can', 'will', 'shall', 'should', 'may']);

/**
 * Passive/auxiliary markers that indicate a voice change (Case B).
 */
const PASSIVE_AUX = new Set(['was', 'were', 'been', 'being', 'is', 'are']);

/**
 * Common determiners that signal a noun phrase (subject) follows.
 */
const CS_DETERMINERS = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those',
  'his', 'her', 'its', 'their', 'my', 'our', 'your', 'some', 'any', 'each', 'every']);

class ClauseSegmenter {
  /**
   * Segment text into clauses.
   *
   * @param {string} text - Input sentence text
   * @param {Object} [options] - Segmentation options
   * @returns {{ clauses: Array, relation: string|null }}
   */
  segment(text, options = {}) {
    // Find coordinating conjunction positions
    const conjResult = this._findConjunction(text);

    if (!conjResult) {
      return this._singleClause(text);
    }

    const { conjunction, position, leftText, rightText } = conjResult;

    // Handle "so" — check for "so that" / "so as to" first
    if (conjunction === 'so') {
      return this._handleSo(text, position, leftText, rightText);
    }

    // Classify: Case A, B, or C
    const classification = this._classify(leftText, rightText, conjunction);

    if (classification.case === 'C') {
      return this._singleClause(text);
    }

    // Case A or B: segment into two clauses
    const clause0 = {
      text: leftText.trim(),
      start: 0,
      end: position,
      index: 0,
      conjunction: null,
      clauseType: 'independent'
    };

    const rightStart = position + conjunction.length;
    const clause1Text = classification.case === 'B' && classification.injectedSubject
      ? classification.injectedSubject + ' ' + rightText.trim()
      : rightText.trim();

    const clause1 = {
      text: clause1Text,
      start: rightStart,
      end: text.length,
      index: 1,
      conjunction: conjunction,
      clauseType: classification.case === 'B' ? 'elliptical' : 'independent'
    };

    if (classification.case === 'B' && classification.injectedSubject) {
      clause1.injectedSubject = classification.injectedSubject;
    }

    const relation = CONJUNCTION_RELATIONS[conjunction] || 'tagteam:and_then';

    return {
      clauses: [clause0, clause1],
      relation: relation
    };
  }

  /**
   * Find the primary coordinating conjunction in the text.
   * Skips conjunctions that are part of NP or adjective coordination.
   *
   * @param {string} text
   * @returns {{ conjunction, position, leftText, rightText }|null}
   */
  _findConjunction(text) {
    const words = text.split(/\s+/);
    const lower = text.toLowerCase();

    for (let i = 1; i < words.length - 1; i++) {
      const word = words[i].toLowerCase().replace(/[.,;:!?]$/, '');
      if (!COORDINATING_CONJUNCTIONS.includes(word)) continue;

      // Calculate position of this conjunction in original text
      const beforeWords = words.slice(0, i);
      const position = beforeWords.join(' ').length + 1; // +1 for space before conjunction

      // Handle multi-word "so" patterns: "so that", "so as to"
      if (word === 'so') {
        const nextWord = (words[i + 1] || '').toLowerCase().replace(/[.,;:!?]$/, '');
        if (nextWord === 'that' || nextWord === 'as') {
          // Treat "so" as the conjunction; right text includes "that/as..."
          const conjEnd = position + words[i].length;
          const leftText = text.substring(0, position).trim();
          const rightText = text.substring(conjEnd).trim();
          return { conjunction: 'so', position, leftText, rightText };
        }
      }

      const conjEnd = position + words[i].length;
      const leftText = text.substring(0, position).trim();
      const rightText = text.substring(conjEnd).trim();

      // Quick check: is this actually coordinating clauses?
      if (this._isNPorAdjCoordination(words, i, leftText, rightText)) {
        continue;
      }

      return { conjunction: word, position, leftText, rightText };
    }
    return null;
  }

  /**
   * Check if a conjunction is coordinating noun phrases or adjectives,
   * not clauses (Case C filter).
   */
  _isNPorAdjCoordination(words, conjIdx, leftText, rightText) {
    const wordBefore = (words[conjIdx - 1] || '').toLowerCase().replace(/[.,;:!?]$/, '');
    const wordAfter = (words[conjIdx + 1] || '').toLowerCase().replace(/[.,;:!?]$/, '');

    // "The doctor and the nurse treated..." — NP coordination before verb
    // Heuristic: if the word after conjunction is a determiner, check whether
    // the right side has its own INDEPENDENT clause (subject + different verb)
    // vs. just being a second NP before a shared verb.
    if (CS_DETERMINERS.has(wordAfter)) {
      // Count words after conjunction until we hit a verb
      const rightWords = rightText.trim().split(/\s+/);
      let verbIdx = -1;
      for (let j = 0; j < rightWords.length; j++) {
        const rw = rightWords[j].toLowerCase().replace(/[.,;:!?]$/, '');
        if (this._isLikelyVerb(rw) && j > 0) {
          verbIdx = j;
          break;
        }
      }
      if (verbIdx >= 0) {
        // Right side has DET + noun(s) + verb → it's a full clause (Case A)
        // as long as left side also has its own verb
        if (this._hasVerb(leftText)) {
          return false; // Case A: two independent clauses
        }
      }
      // No verb on right side after the noun, or left has no verb → NP coordination
      return true;
    }

    // Adjective coordination: "tall and experienced" before a noun
    // Heuristic: no verb on right side at all → NP/adj coordination
    if (!this._hasVerb(rightText)) {
      return true;
    }

    return false;
  }

  /**
   * Classify right side as Case A, B, or C.
   */
  _classify(leftText, rightText, conjunction) {
    const rightWords = rightText.trim().split(/\s+/);
    if (rightWords.length === 0) return { case: 'C' };

    const firstRight = rightWords[0].toLowerCase().replace(/[.,;:!?]$/, '');
    const secondRight = (rightWords[1] || '').toLowerCase().replace(/[.,;:!?]$/, '');

    // Case A: Explicit subject on right side (determiner/pronoun + verb pattern)
    if (this._hasSubjectVerb(rightText)) {
      return { case: 'A' };
    }

    // Case B: Voice/auxiliary change — right starts with passive auxiliary + past participle
    if (PASSIVE_AUX.has(firstRight)) {
      const leftSubject = this._extractSubject(leftText);
      return {
        case: 'B',
        injectedSubject: leftSubject
      };
    }

    // Case B: "did" inversion for "nor did X..."
    if (conjunction === 'nor' && firstRight === 'did') {
      return { case: 'A' }; // "nor did the backup respond" has explicit subject
    }

    // Case C: Bare verb in same form → VP coordination
    return { case: 'C' };
  }

  /**
   * Check if text starts with a subject-verb pattern.
   */
  _hasSubjectVerb(text) {
    const words = text.trim().split(/\s+/);
    if (words.length < 2) return false;

    const first = words[0].toLowerCase().replace(/[.,;:!?]$/, '');
    const second = words[1].toLowerCase().replace(/[.,;:!?]$/, '');

    // Pronoun subjects
    const pronouns = new Set(['he', 'she', 'it', 'they', 'we', 'i', 'you', 'who']);
    if (pronouns.has(first)) return true;

    // Determiner + noun + verb pattern
    if (CS_DETERMINERS.has(first)) {
      // Check that a verb follows somewhere after the noun
      return this._hasVerb(words.slice(1).join(' '));
    }

    // Proper noun (capitalized) followed by verb
    if (words[0][0] === words[0][0].toUpperCase() && words[0][0] !== words[0][0].toLowerCase()) {
      if (this._hasVerb(words.slice(1).join(' '))) return true;
    }

    // "did" inversion (e.g., "nor did the backup respond")
    if (first === 'did') return true;

    return false;
  }

  /**
   * Check if a single word is likely a verb.
   */
  _isLikelyVerb(word) {
    const irregulars = new Set([
      'went', 'came', 'gave', 'took', 'made', 'got', 'did', 'had', 'was', 'were',
      'ran', 'won', 'lost', 'said', 'saw', 'knew', 'grew', 'flew', 'drew', 'fell',
      'wrote', 'drove', 'broke', 'spoke', 'chose', 'woke', 'rose', 'began', 'sang',
      'swam', 'drank', 'ate', 'sat', 'stood', 'understood', 'left', 'sent', 'built',
      'spent', 'meant', 'kept', 'felt', 'led', 'read', 'met', 'found', 'told', 'brought',
      'treated', 'rebooted', 'restarted', 'examined', 'disagreed', 'resigned', 'refreshed',
      'approved', 'verified', 'responded', 'reviewed', 'monitored', 'designed', 'evaluated',
      'analyzed', 'prepared', 'sounded', 'celebrated', 'launched', 'operated', 'waited'
    ]);
    const clean = word.replace(/[.,;:!?]$/, '');
    if (irregulars.has(clean)) return true;
    if (clean.endsWith('ed') && clean.length > 3) return true;
    if (PASSIVE_AUX.has(clean)) return true;
    return false;
  }

  /**
   * Check if text contains a verb (simple heuristic).
   */
  _hasVerb(text) {
    const words = text.trim().toLowerCase().split(/\s+/);
    // Past tense heuristic: ends in -ed, -ied
    // Common irregular verbs
    const irregulars = new Set([
      'went', 'came', 'gave', 'took', 'made', 'got', 'did', 'had', 'was', 'were',
      'ran', 'won', 'lost', 'said', 'saw', 'knew', 'grew', 'flew', 'drew', 'fell',
      'wrote', 'drove', 'broke', 'spoke', 'chose', 'woke', 'rose', 'began', 'sang',
      'swam', 'drank', 'ate', 'sat', 'stood', 'understood', 'left', 'sent', 'built',
      'spent', 'meant', 'kept', 'felt', 'led', 'read', 'met', 'found', 'told', 'brought'
    ]);
    for (const w of words) {
      const clean = w.replace(/[.,;:!?]$/, '');
      if (irregulars.has(clean)) return true;
      if (clean.endsWith('ed') && clean.length > 3) return true;
      if (clean.endsWith('ied') && clean.length > 4) return true;
      if (clean.endsWith('es') && clean.length > 3) return true;
      if (PASSIVE_AUX.has(clean)) return true;
      if (MODALS.has(clean)) return true;
    }
    return false;
  }

  /**
   * Extract the subject NP from a clause text.
   * Returns the subject phrase for injection into elliptical clauses.
   */
  _extractSubject(clauseText) {
    const words = clauseText.trim().split(/\s+/);
    if (words.length === 0) return null;

    const first = words[0].toLowerCase();

    // Pronoun subject
    const pronouns = { 'he': 'He', 'she': 'She', 'it': 'It', 'they': 'They', 'we': 'We', 'i': 'I', 'you': 'You' };
    if (pronouns[first]) return pronouns[first];

    // Determiner + noun(s) subject
    if (CS_DETERMINERS.has(first)) {
      // Take determiner + following nouns until we hit a verb
      const subject = [words[0]];
      for (let i = 1; i < words.length; i++) {
        const w = words[i].toLowerCase().replace(/[.,;:!?]$/, '');
        // Stop at verb indicators
        if (w.endsWith('ed') || w.endsWith('es') || PASSIVE_AUX.has(w) ||
            w === 'did' || w === 'had' || w === 'has' || w === 'does') {
          break;
        }
        subject.push(words[i]);
        // Stop after first non-determiner word (the noun) unless next is also a noun
        if (!CS_DETERMINERS.has(w) && i > 0) {
          break;
        }
      }
      return subject.join(' ');
    }

    // Proper noun: take the first word
    return words[0];
  }

  /**
   * Handle "so" conjunction with disambiguation.
   */
  _handleSo(text, position, leftText, rightText) {
    const trimmedRight = rightText.trim().toLowerCase();
    let relation;

    // "so that" → Purpose
    if (trimmedRight.startsWith('that ')) {
      relation = 'tagteam:in_order_that';
    }
    // "so as to" → Purpose
    else if (trimmedRight.startsWith('as to ')) {
      relation = 'tagteam:in_order_that';
    }
    // Check for modal in right clause → Purpose
    else if (this._hasModal(rightText)) {
      relation = 'tagteam:in_order_that';
    }
    // Default: indicative → Result
    else {
      relation = 'tagteam:therefore';
    }

    const conjEnd = position + 'so'.length;

    return {
      clauses: [
        {
          text: leftText.trim(),
          start: 0,
          end: position,
          index: 0,
          conjunction: null,
          clauseType: 'independent'
        },
        {
          text: rightText.trim(),
          start: conjEnd,
          end: text.length,
          index: 1,
          conjunction: 'so',
          clauseType: 'independent'
        }
      ],
      relation: relation
    };
  }

  /**
   * Check if text contains a modal verb.
   */
  _hasModal(text) {
    const words = text.trim().toLowerCase().split(/\s+/);
    return words.some(w => MODALS.has(w.replace(/[.,;:!?]$/, '')));
  }

  /**
   * Return single-clause result (passthrough).
   */
  _singleClause(text) {
    return {
      clauses: [
        {
          text: text,
          start: 0,
          end: text.length,
          index: 0,
          conjunction: null,
          clauseType: 'independent'
        }
      ],
      relation: null
    };
  }
}

module.exports = ClauseSegmenter;
