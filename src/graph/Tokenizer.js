class Tokenizer {
  constructor() {
    // Sentence boundary markers
    this.sentenceEnders = /[.!?]+/;

    // Abbreviations that don't end sentences
    this.abbreviations = new Set([
      'Dr', 'Mr', 'Mrs', 'Ms', 'Prof', 'Sr', 'Jr',
      'etc', 'e.g', 'i.e', 'vs', 'Inc', 'Ltd', 'Co'
    ]);
  }

  tokenize(text) {
    const tokens = [];
    let i = 0;

    while (i < text.length) {
      // Skip whitespace
      while (i < text.length && /\s/.test(text[i])) {
        i++;
      }

      if (i >= text.length) break;

      const startOffset = i;

      // Match token (word, punctuation, or special character)
      let tokenText = '';

      // Special case: possessive 's (keep as separate token for Penn Treebank POS tagging)
      if (i < text.length - 1 && text.substring(i, i + 2) === "'s") {
        tokenText = "'s";
        i += 2;
      }
      // Special case: contractions (n't, 'll, 're, 've, 'd, 'm)
      else if (text[i] === "'" && i > 0) {
        const contraction = this._matchContraction(text, i);
        if (contraction) {
          tokenText = contraction;
          i += contraction.length;
        } else {
          tokenText = text[i];
          i++;
        }
      }
      // Word characters (letters, numbers, hyphens within words)
      else if (/[a-zA-Z0-9]/.test(text[i])) {
        while (i < text.length && /[a-zA-Z0-9\-_]/.test(text[i])) {
          tokenText += text[i];
          i++;
        }
      }
      // Punctuation (single character)
      else {
        tokenText = text[i];
        i++;
      }

      if (tokenText) {
        tokens.push({
          text: tokenText,
          start: startOffset,
          end: i - 1
        });
      }
    }

    return tokens;
  }

  _matchContraction(text, startIdx) {
    const remaining = text.substring(startIdx);
    const contractions = ["n't", "'ll", "'re", "'ve", "'d", "'m", "'s"];

    for (const c of contractions) {
      if (remaining.startsWith(c)) {
        return c;
      }
    }

    return null;
  }

  sentenceSplit(text) {
    // Simple sentence splitting on . ! ?
    // Does not handle abbreviations perfectly (good enough for Phase 1)
    const sentences = [];
    let current = '';

    for (let i = 0; i < text.length; i++) {
      current += text[i];

      if (this.sentenceEnders.test(text[i])) {
        // Check if next char is space or end (likely sentence boundary)
        if (i + 1 >= text.length || /\s/.test(text[i + 1])) {
          sentences.push(current.trim());
          current = '';
        }
      }
    }

    // Add remaining text as final sentence
    if (current.trim()) {
      sentences.push(current.trim());
    }

    return sentences;
  }

  tokenizeForPOS(text) {
    const tokens = this.tokenize(text);
    return tokens.map(t => t.text);
  }
}

// Export for Node.js / CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Tokenizer;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.Tokenizer = Tokenizer;
}
