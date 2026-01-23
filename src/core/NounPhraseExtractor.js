/**
 * NounPhraseExtractor - Phase 5.2
 *
 * Extracts noun phrases from POS-tagged tokens without relying on Compromise.
 * Identifies determiners, modifiers, head nouns, and compound nouns.
 *
 * @example
 * const extractor = new NounPhraseExtractor();
 * const tokens = [["The", "DT"], ["critically", "RB"], ["ill", "JJ"], ["patient", "NN"]];
 * extractor.extract(tokens)
 * // => [{
 * //   head: "patient", determiner: "The", modifiers: ["critically", "ill"],
 * //   fullText: "The critically ill patient", definiteness: "definite", number: "singular"
 * // }]
 */

class NounPhraseExtractor {
  constructor() {
    // POS tags for nouns
    this.nounTags = new Set(['NN', 'NNS', 'NNP', 'NNPS']);

    // POS tags for determiners
    this.determinerTags = new Set(['DT', 'PDT', 'PRP$', 'WDT', 'WP$']);

    // POS tags for modifiers (adjectives, adverbs)
    this.modifierTags = new Set(['JJ', 'JJR', 'JJS', 'RB', 'RBR', 'RBS', 'VBG', 'VBN', 'CD']);

    // Definite determiners
    this.definiteWords = new Set(['the', 'this', 'that', 'these', 'those']);

    // Indefinite determiners
    this.indefiniteWords = new Set(['a', 'an', 'some', 'any', 'no', 'every', 'each', 'either', 'neither']);

    // Universal quantifiers (for scope ambiguity detection)
    this.universalQuantifiers = new Set(['all', 'every', 'each']);

    // Existential quantifiers
    this.existentialQuantifiers = new Set(['some', 'any', 'a', 'an']);
  }

  /**
   * Extract noun phrases from POS-tagged tokens
   * @param {Array<[string, string]>} taggedTokens - Array of [word, tag] pairs
   * @returns {Array<Object>} - Array of noun phrase objects
   */
  extract(taggedTokens) {
    const nounPhrases = [];
    const used = new Set();

    for (let i = 0; i < taggedTokens.length; i++) {
      if (used.has(i)) continue;

      const [word, tag] = taggedTokens[i];

      // Check if this could start an NP
      if (this._canStartNP(tag)) {
        const np = this._extractNounPhraseAt(taggedTokens, i);
        if (np) {
          nounPhrases.push(np);
          for (let j = np.startIndex; j <= np.endIndex; j++) {
            used.add(j);
          }
        }
      }
    }

    return nounPhrases;
  }

  /**
   * Check if a tag can start a noun phrase
   * @private
   */
  _canStartNP(tag) {
    return this.determinerTags.has(tag) ||
           this.nounTags.has(tag) ||
           this.modifierTags.has(tag) ||
           tag === 'PRP'; // Pronouns
  }

  /**
   * Extract a noun phrase starting at a given index
   * @private
   */
  _extractNounPhraseAt(tokens, startIdx) {
    let determiner = null;
    let modifiers = [];
    let headNoun = null;
    let headTag = null;
    let compoundParts = [];
    let endIdx = startIdx;

    let i = startIdx;
    const [firstWord, firstTag] = tokens[i];

    // Handle pronoun as complete NP
    if (firstTag === 'PRP' || firstTag === 'WP') {
      return {
        head: firstWord,
        determiner: null,
        modifiers: [],
        fullText: firstWord,
        startIndex: startIdx,
        endIndex: startIdx,
        definiteness: 'definite', // Pronouns are definite
        number: this._getNumberFromPronoun(firstWord),
        isPronoun: true,
        quantifier: null
      };
    }

    // Check for determiner
    if (this.determinerTags.has(firstTag)) {
      determiner = firstWord;
      endIdx = i;
      i++;
    }

    // Collect modifiers (adjectives, adverbs, etc.)
    while (i < tokens.length) {
      const [word, tag] = tokens[i];

      // Check for modifier
      if (this.modifierTags.has(tag)) {
        modifiers.push(word);
        endIdx = i;
        i++;
        continue;
      }

      // Check for noun (could be head or compound part)
      if (this.nounTags.has(tag)) {
        if (headNoun === null) {
          headNoun = word;
          headTag = tag;
          endIdx = i;
          i++;

          // Look for compound noun continuation
          while (i < tokens.length) {
            const [nextWord, nextTag] = tokens[i];
            if (this.nounTags.has(nextTag)) {
              // This is a compound noun
              compoundParts.push(headNoun);
              headNoun = nextWord;
              headTag = nextTag;
              endIdx = i;
              i++;
            } else {
              break;
            }
          }
        }
        break;
      }

      // Not part of NP
      break;
    }

    // If no head noun, check if determiner or modifier can serve as head
    if (!headNoun) {
      // Some determiners can be heads: "all" in "all of them"
      if (determiner && !modifiers.length) {
        return null; // Not a complete NP
      }
      // Nominalized adjective: "the poor", "the sick"
      if (determiner && modifiers.length > 0) {
        headNoun = modifiers.pop();
        headTag = 'NN';
      } else {
        return null;
      }
    }

    // Build full text
    const parts = [];
    if (determiner) parts.push(determiner);
    parts.push(...modifiers);
    if (compoundParts.length > 0) parts.push(...compoundParts);
    parts.push(headNoun);

    // Determine definiteness
    const definiteness = this._classifyDefiniteness(determiner);

    // Determine number
    const number = this._getNumber(headTag);

    // Check for quantifier
    const quantifier = this._getQuantifier(determiner);

    return {
      head: headNoun,
      determiner: determiner,
      modifiers: modifiers,
      compoundParts: compoundParts.length > 0 ? compoundParts : null,
      fullText: parts.join(' '),
      startIndex: startIdx,
      endIndex: endIdx,
      definiteness: definiteness,
      number: number,
      isPronoun: false,
      quantifier: quantifier
    };
  }

  /**
   * Classify definiteness from determiner
   * @private
   */
  _classifyDefiniteness(determiner) {
    if (!determiner) return 'bare';

    const lower = determiner.toLowerCase();

    if (this.definiteWords.has(lower)) {
      return 'definite';
    }

    if (this.indefiniteWords.has(lower)) {
      return 'indefinite';
    }

    // Possessives are definite
    if (['my', 'your', 'his', 'her', 'its', 'our', 'their'].includes(lower)) {
      return 'definite';
    }

    return 'other';
  }

  /**
   * Get grammatical number from noun tag
   * @private
   */
  _getNumber(tag) {
    if (tag === 'NNS' || tag === 'NNPS') {
      return 'plural';
    }
    return 'singular';
  }

  /**
   * Get number from pronoun
   * @private
   */
  _getNumberFromPronoun(pronoun) {
    const plural = new Set(['we', 'us', 'they', 'them', 'these', 'those']);
    return plural.has(pronoun.toLowerCase()) ? 'plural' : 'singular';
  }

  /**
   * Get quantifier type if determiner is a quantifier
   * @private
   */
  _getQuantifier(determiner) {
    if (!determiner) return null;

    const lower = determiner.toLowerCase();

    if (this.universalQuantifiers.has(lower)) {
      return { type: 'universal', word: lower };
    }

    if (this.existentialQuantifiers.has(lower)) {
      return { type: 'existential', word: lower };
    }

    if (lower === 'no') {
      return { type: 'negative', word: lower };
    }

    return null;
  }

  /**
   * Check if noun is a nominalization (process/continuant ambiguity)
   * @param {string} noun
   * @returns {{ isNominalization: boolean, suffixes: string[] }}
   */
  checkNominalization(noun) {
    const lower = noun.toLowerCase();
    const suffixes = [];

    // -tion nominalizations
    if (lower.endsWith('tion') || lower.endsWith('sion')) {
      suffixes.push('-tion');
    }

    // -ment nominalizations
    if (lower.endsWith('ment')) {
      suffixes.push('-ment');
    }

    // -ing nominalizations (gerunds as nouns)
    if (lower.endsWith('ing')) {
      suffixes.push('-ing');
    }

    // -ance/-ence nominalizations
    if (lower.endsWith('ance') || lower.endsWith('ence')) {
      suffixes.push('-ance/-ence');
    }

    // -al nominalizations
    if (lower.endsWith('al') && lower.length > 3) {
      suffixes.push('-al');
    }

    return {
      isNominalization: suffixes.length > 0,
      suffixes: suffixes
    };
  }

  /**
   * Classify entity type for selectional constraint checking
   * @param {string} noun - The head noun
   * @param {Object} context - Additional context
   * @returns {{ isAnimate: boolean, isAbstract: boolean, isOrganization: boolean }}
   */
  classifyEntityType(noun, context = {}) {
    const lower = noun.toLowerCase();

    // Common animate nouns (people, animals)
    const animatePatterns = [
      'person', 'man', 'woman', 'child', 'doctor', 'patient', 'nurse',
      'teacher', 'student', 'worker', 'manager', 'administrator',
      'employee', 'staff', 'member', 'user', 'customer', 'client',
      'family', 'friend', 'colleague', 'surgeon', 'therapist'
    ];

    // Common abstract nouns
    const abstractPatterns = [
      'idea', 'concept', 'theory', 'thought', 'belief', 'opinion',
      'justice', 'freedom', 'love', 'hate', 'fear', 'hope',
      'truth', 'beauty', 'knowledge', 'wisdom', 'intelligence'
    ];

    // Inanimate objects
    const inanimatePatterns = [
      'rock', 'stone', 'table', 'chair', 'book', 'computer',
      'machine', 'device', 'equipment', 'tool', 'building',
      'ventilator', 'medication', 'treatment'
    ];

    // Organization/collective nouns
    const organizationPatterns = [
      'organization', 'company', 'corporation', 'institution',
      'committee', 'board', 'team', 'group', 'department',
      'government', 'agency', 'hospital', 'university'
    ];

    const isAnimate = animatePatterns.some(p => lower.includes(p));
    const isAbstract = abstractPatterns.some(p => lower.includes(p));
    const isOrganization = organizationPatterns.some(p => lower.includes(p));
    const isInanimate = inanimatePatterns.some(p => lower.includes(p));

    return {
      isAnimate: isAnimate || isOrganization, // Organizations can act as agents
      isAbstract: isAbstract,
      isOrganization: isOrganization,
      isInanimate: isInanimate && !isOrganization
    };
  }

  /**
   * Detect potential metonymy (location as agent, etc.)
   * @param {string} noun
   * @returns {{ isPotentialMetonymy: boolean, type: string|null }}
   */
  detectMetonymy(noun) {
    const lower = noun.toLowerCase();

    // Location-for-institution patterns
    const locationPatterns = [
      'house', 'building', 'office', 'palace', 'hall',
      'street', 'avenue', 'square'
    ];

    if (locationPatterns.some(p => lower.includes(p))) {
      // Check for known metonymic expressions
      const knownMetonyms = [
        'white house', 'wall street', 'pentagon', 'downing street',
        'kremlin', 'city hall', 'capitol'
      ];

      if (knownMetonyms.some(m => lower.includes(m.split(' ').pop()))) {
        return { isPotentialMetonymy: true, type: 'location_for_institution' };
      }
    }

    return { isPotentialMetonymy: false, type: null };
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NounPhraseExtractor;
}
if (typeof window !== 'undefined') {
  window.NounPhraseExtractor = NounPhraseExtractor;
}
