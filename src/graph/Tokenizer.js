class Tokenizer {
  constructor() {
    // Sentence boundary markers
    this.sentenceEnders = /[.!?]+/;

    // Abbreviations that don't end sentences
    this.abbreviations = new Set([
      'Dr', 'Mr', 'Mrs', 'Ms', 'Prof', 'Sr', 'Jr',
      'etc', 'e.g', 'i.e', 'vs', 'Inc', 'Ltd', 'Co'
    ]);

    // Word character test: letters (including accented), digits
    this._isWordChar = /[\p{L}\p{N}_]/u;
    // Initial word character test (same, excluding underscore for safety)
    this._isWordStart = /[\p{L}\p{N}]/u;
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

      // Special case: em dash "--" as single token (UD-EWT convention)
      if (text[i] === '-' && i + 1 < text.length && text[i + 1] === '-') {
        tokenText = '--';
        i += 2;
      }
      // Special case: possessive 's (keep as separate token for Penn Treebank POS tagging)
      else if (i < text.length - 1 && text.substring(i, i + 2) === "'s") {
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
      // Word characters (letters including accented, numbers)
      else if (this._isWordStart.test(text[i])) {
        while (i < text.length && this._isWordChar.test(text[i])) {
          tokenText += text[i];
          i++;
        }
        // Handle abbreviations like "U.S." (letter.letter. pattern)
        if (tokenText.length === 1 && /[A-Z]/i.test(tokenText) &&
            i < text.length && text[i] === '.') {
          // Check for letter-period-letter-period pattern
          let j = i;
          let abbr = tokenText;
          while (j < text.length && text[j] === '.' &&
                 j + 1 < text.length && /[A-Za-z]/.test(text[j + 1])) {
            abbr += text[j] + text[j + 1]; // period + letter
            j += 2;
          }
          // Include trailing period if present
          if (j < text.length && text[j] === '.' && abbr.length > tokenText.length) {
            abbr += '.';
            j++;
            tokenText = abbr;
            i = j;
          }
        }
        // Handle decimal numbers like "1.1", "3.5"
        if (/^\d+$/.test(tokenText) && i < text.length && text[i] === '.' &&
            i + 1 < text.length && /\d/.test(text[i + 1])) {
          tokenText += '.';
          i++;
          while (i < text.length && /\d/.test(text[i])) {
            tokenText += text[i];
            i++;
          }
        }
        // Handle n't contractions: "don't" → "do" + "n't" (Penn Treebank convention)
        // The word consumed the 'n', check if remaining starts with "'t"
        if (tokenText.length > 1 && tokenText.endsWith('n') &&
            i < text.length - 1 && text[i] === "'" && text[i + 1] === 't' &&
            (i + 2 >= text.length || !/[a-zA-Z]/.test(text[i + 2]))) {
          // Emit the word without trailing 'n', then emit "n't" as next token
          tokenText = tokenText.slice(0, -1);
          tokens.push({ text: tokenText, start: startOffset, end: i - 2 });
          tokenText = "n't";
          const ntStart = i - 1;
          i += 2; // skip past 't
          tokens.push({ text: tokenText, start: ntStart, end: i - 1 });
          tokenText = ''; // Already pushed, skip the push below
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
