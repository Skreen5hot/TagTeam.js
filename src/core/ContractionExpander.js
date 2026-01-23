/**
 * ContractionExpander - Phase 5.1
 *
 * Expands English contractions into their full forms with POS tags.
 * Extracted and enhanced from archive/POS Graph POC/js/POSTaggerGraph.js
 *
 * @example
 * const expander = new ContractionExpander();
 * expander.expand("I don't know") // => "I do not know"
 * expander.expandWithTags(["I", "don't", "know"])
 *   // => { tokens: ["I", "do", "not", "know"], tagMap: Map { 1 => "VB", 2 => "RB" } }
 */
class ContractionExpander {
  constructor() {
    // Contraction dictionary with parts and POS tags
    // Keys are lowercase for lookup; parts preserve correct casing
    this.contractionDict = {
      // === Negation contractions ===
      "don't": { parts: ["do", "not"], tags: ["VB", "RB"] },
      "doesn't": { parts: ["does", "not"], tags: ["VBZ", "RB"] },
      "didn't": { parts: ["did", "not"], tags: ["VBD", "RB"] },
      "can't": { parts: ["can", "not"], tags: ["MD", "RB"] },
      "cannot": { parts: ["can", "not"], tags: ["MD", "RB"] },
      "won't": { parts: ["will", "not"], tags: ["MD", "RB"] },
      "wouldn't": { parts: ["would", "not"], tags: ["MD", "RB"] },
      "couldn't": { parts: ["could", "not"], tags: ["MD", "RB"] },
      "shouldn't": { parts: ["should", "not"], tags: ["MD", "RB"] },
      "mustn't": { parts: ["must", "not"], tags: ["MD", "RB"] },
      "isn't": { parts: ["is", "not"], tags: ["VBZ", "RB"] },
      "aren't": { parts: ["are", "not"], tags: ["VBP", "RB"] },
      "wasn't": { parts: ["was", "not"], tags: ["VBD", "RB"] },
      "weren't": { parts: ["were", "not"], tags: ["VBD", "RB"] },
      "hasn't": { parts: ["has", "not"], tags: ["VBZ", "RB"] },
      "haven't": { parts: ["have", "not"], tags: ["VBP", "RB"] },
      "hadn't": { parts: ["had", "not"], tags: ["VBD", "RB"] },
      "needn't": { parts: ["need", "not"], tags: ["MD", "RB"] },
      "shan't": { parts: ["shall", "not"], tags: ["MD", "RB"] },
      "mightn't": { parts: ["might", "not"], tags: ["MD", "RB"] },
      "ain't": { parts: ["am", "not"], tags: ["VBP", "RB"] }, // informal

      // === Pronoun + be contractions ===
      "i'm": { parts: ["I", "am"], tags: ["PRP", "VBP"] },
      "you're": { parts: ["you", "are"], tags: ["PRP", "VBP"] },
      "we're": { parts: ["we", "are"], tags: ["PRP", "VBP"] },
      "they're": { parts: ["they", "are"], tags: ["PRP", "VBP"] },
      "he's": { parts: ["he", "is"], tags: ["PRP", "VBZ"] },
      "she's": { parts: ["she", "is"], tags: ["PRP", "VBZ"] },
      "it's": { parts: ["it", "is"], tags: ["PRP", "VBZ"] },

      // === Pronoun + have contractions ===
      "i've": { parts: ["I", "have"], tags: ["PRP", "VBP"] },
      "you've": { parts: ["you", "have"], tags: ["PRP", "VBP"] },
      "we've": { parts: ["we", "have"], tags: ["PRP", "VBP"] },
      "they've": { parts: ["they", "have"], tags: ["PRP", "VBP"] },

      // === Pronoun + will contractions ===
      "i'll": { parts: ["I", "will"], tags: ["PRP", "MD"] },
      "you'll": { parts: ["you", "will"], tags: ["PRP", "MD"] },
      "we'll": { parts: ["we", "will"], tags: ["PRP", "MD"] },
      "they'll": { parts: ["they", "will"], tags: ["PRP", "MD"] },
      "he'll": { parts: ["he", "will"], tags: ["PRP", "MD"] },
      "she'll": { parts: ["she", "will"], tags: ["PRP", "MD"] },
      "it'll": { parts: ["it", "will"], tags: ["PRP", "MD"] },

      // === Pronoun + would/had contractions ===
      "i'd": { parts: ["I", "would"], tags: ["PRP", "MD"] },
      "you'd": { parts: ["you", "would"], tags: ["PRP", "MD"] },
      "we'd": { parts: ["we", "would"], tags: ["PRP", "MD"] },
      "they'd": { parts: ["they", "would"], tags: ["PRP", "MD"] },
      "he'd": { parts: ["he", "would"], tags: ["PRP", "MD"] },
      "she'd": { parts: ["she", "would"], tags: ["PRP", "MD"] },

      // === WH-word contractions ===
      "what's": { parts: ["what", "is"], tags: ["WP", "VBZ"] },
      "that's": { parts: ["that", "is"], tags: ["DT", "VBZ"] },
      "where's": { parts: ["where", "is"], tags: ["WRB", "VBZ"] },
      "who's": { parts: ["who", "is"], tags: ["WP", "VBZ"] },
      "how's": { parts: ["how", "is"], tags: ["WRB", "VBZ"] },
      "when's": { parts: ["when", "is"], tags: ["WRB", "VBZ"] },
      "why's": { parts: ["why", "is"], tags: ["WRB", "VBZ"] },

      // === Existential/demonstrative contractions ===
      "there's": { parts: ["there", "is"], tags: ["EX", "VBZ"] },
      "here's": { parts: ["here", "is"], tags: ["RB", "VBZ"] },

      // === Misc contractions ===
      "let's": { parts: ["let", "us"], tags: ["VB", "PRP"] }
    };
  }

  /**
   * Normalize various apostrophe characters to standard apostrophe
   * @param {string} text - Input text
   * @returns {string} - Normalized text
   */
  normalizeApostrophes(text) {
    if (!text) return text;
    return text.replace(/[''`]/g, "'");
  }

  /**
   * Apply casing from original word to expanded part
   * @param {string} original - Original contraction
   * @param {string} part - Expanded part
   * @returns {string} - Cased part
   */
  applyCasing(original, part) {
    if (!original || original.length === 0) return part;
    const firstChar = original[0];
    // If original starts with uppercase letter
    if (firstChar.toUpperCase() === firstChar && firstChar.toLowerCase() !== firstChar) {
      if (/^[A-Za-z]/.test(part)) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }
    }
    return part;
  }

  /**
   * Lookup contraction in dictionary
   * @param {string} token - Token to look up
   * @returns {Object|undefined} - Contraction entry or undefined
   */
  lookupContraction(token) {
    if (!token) return undefined;
    const normalized = this.normalizeApostrophes(token).toLowerCase();
    return this.contractionDict[normalized];
  }

  /**
   * Expand a text string, replacing contractions with full forms
   * @param {string} text - Input text
   * @returns {string} - Expanded text
   */
  expand(text) {
    if (!text) return text;

    const normalized = this.normalizeApostrophes(text);
    // Match words including contractions
    const tokens = normalized.match(/\b[\w']+\b/g) || [];

    let result = normalized;
    for (const token of tokens) {
      const entry = this.lookupContraction(token);
      if (entry) {
        const expanded = entry.parts.map((part, i) =>
          i === 0 ? this.applyCasing(token, part) : part
        ).join(' ');
        // Replace the contraction with expanded form (case-insensitive)
        const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        result = result.replace(regex, (match) => {
          // Preserve original casing for first part
          const parts = entry.parts.slice();
          parts[0] = this.applyCasing(match, parts[0]);
          return parts.join(' ');
        });
      }
    }

    return result;
  }

  /**
   * Expand tokens array with contraction tag mapping
   * @param {string[]} tokens - Array of tokens
   * @returns {{ tokens: string[], tagMap: Map<number, string> }} - Expanded tokens and tag map
   */
  expandWithTags(tokens) {
    const expanded = [];
    const tagMap = new Map();

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const entry = this.lookupContraction(token);

      if (entry) {
        const parts = entry.parts;
        const tags = entry.tags;

        for (let p = 0; p < parts.length; p++) {
          const part = p === 0 ? this.applyCasing(token, parts[p]) : parts[p];
          const newIndex = expanded.length;
          expanded.push(part);
          if (tags[p]) {
            tagMap.set(newIndex, tags[p]);
          }
        }
      } else {
        expanded.push(token);
      }
    }

    return { tokens: expanded, tagMap };
  }

  /**
   * Check if a token is a contraction
   * @param {string} token - Token to check
   * @returns {boolean} - True if token is a known contraction
   */
  isContraction(token) {
    return this.lookupContraction(token) !== undefined;
  }

  /**
   * Get all known contractions
   * @returns {string[]} - Array of contraction keys
   */
  getContractionList() {
    return Object.keys(this.contractionDict);
  }

  /**
   * Disambiguate "he's" / "she's" based on following word context
   * Returns "is" or "has" based on whether next word is past participle
   * @param {string} contraction - The 's contraction
   * @param {string} nextWord - The following word
   * @param {string} nextTag - The POS tag of following word (optional)
   * @returns {string} - "is" or "has"
   */
  disambiguateApostropheS(contraction, nextWord, nextTag) {
    // Past participles typically end in -ed, -en, or are irregular
    const pastParticiplePatterns = /^(been|gone|done|seen|taken|given|written|broken|spoken|chosen|frozen|stolen|forgotten|hidden|driven|eaten|fallen|risen|gotten|begun|sung|swum|rung|drunk|sunk|shrunk|worn|torn|sworn|born|borne)$/i;
    const endsInEd = nextWord && /ed$/i.test(nextWord);
    const endsInEn = nextWord && /en$/i.test(nextWord);
    const isVBN = nextTag === 'VBN';

    if (pastParticiplePatterns.test(nextWord) || isVBN || (endsInEn && !endsInEd)) {
      return 'has';
    }
    return 'is';
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContractionExpander;
}
if (typeof window !== 'undefined') {
  window.ContractionExpander = ContractionExpander;
}
