class NPChunker {
  constructor() {
    // Penn Treebank POS tags for nouns, determiners, adjectives, prepositions
    this.nounTags = new Set(['NN', 'NNS', 'NNP', 'NNPS']);
    this.detTags = new Set(['DT', 'PDT', 'WDT']);
    this.adjTags = new Set(['JJ', 'JJR', 'JJS']);
    this.prepTags = new Set(['IN', 'TO']);
    this.coordTags = new Set(['CC']); // and, or, but
    this.posTag = 'POS'; // Possessive marker ('s)

    // Clitics that don't need preceding space when joining tokens
    this.clitics = new Set(["'s", "'t", "'ll", "'re", "'ve", "'d", "'m"]);
  }

  // Join tokens into text, handling clitics (no space before 's, n't, etc.)
  _joinTokens(tokens) {
    if (tokens.length === 0) return '';

    let result = tokens[0][0]; // First token text
    for (let i = 1; i < tokens.length; i++) {
      const tokenText = tokens[i][0];
      // Don't add space before clitics
      if (this.clitics.has(tokenText)) {
        result += tokenText;
      } else {
        result += ' ' + tokenText;
      }
    }
    return result;
  }

  chunk(tagged) {
    const chunks = [];
    let i = 0;

    while (i < tagged.length) {
      // Try to match NP patterns in order of specificity

      // Pattern 1: Possessive NP [DT? JJ* NN+ 's NN+]
      const possessive = this._matchPossessive(tagged, i);
      if (possessive) {
        chunks.push(possessive);
        i = possessive.endIndex + 1;
        continue;
      }

      // Pattern 2: PP-modified NP [DT? JJ* NN+] IN [NP]
      const ppModified = this._matchPPModified(tagged, i);
      if (ppModified) {
        chunks.push(ppModified);
        i = ppModified.endIndex + 1;
        continue;
      }

      // Pattern 3: Simple NP [DT? JJ* NN+]
      const simple = this._matchSimpleNP(tagged, i);
      if (simple) {
        chunks.push(simple);
        i = simple.endIndex + 1;
        continue;
      }

      // No NP match, move to next token
      i++;
    }

    return chunks;
  }

  _matchPossessive(tagged, startIdx) {
    let i = startIdx;

    // Optional determiner
    if (i < tagged.length && this.detTags.has(tagged[i][1])) {
      i++;
    }

    // Optional adjectives
    while (i < tagged.length && this.adjTags.has(tagged[i][1])) {
      i++;
    }

    // Required: at least one noun
    const possessorStart = i;
    if (i >= tagged.length || !this.nounTags.has(tagged[i][1])) {
      return null;
    }

    // Consume all nouns (for compound nouns like "database server")
    while (i < tagged.length && this.nounTags.has(tagged[i][1])) {
      i++;
    }
    const possessorEnd = i - 1;

    // Required: possessive marker 's
    if (i >= tagged.length || tagged[i][1] !== this.posTag) {
      return null;
    }
    i++; // Consume 's

    // Required: at least one noun after 's (the possessed)
    const possessedStart = i;
    if (i >= tagged.length || !this.nounTags.has(tagged[i][1])) {
      return null; // "admin's" without following noun → not a possessive NP
    }

    // Consume all nouns for possessed part
    while (i < tagged.length && this.nounTags.has(tagged[i][1])) {
      i++;
    }
    const possessedEnd = i - 1;

    // Extract text spans
    const possessorTokens = tagged.slice(startIdx, possessorEnd + 1);
    const possessedTokens = tagged.slice(possessedStart, possessedEnd + 1);
    // Full phrase includes possessor + 's + possessed
    const fullTokens = tagged.slice(startIdx, possessedEnd + 1);

    const possessorText = this._joinTokens(possessorTokens);
    const possessedText = this._joinTokens(possessedTokens);
    const fullText = this._joinTokens(fullTokens);

    // Head noun: rightmost noun in POSSESSED part (not possessor!)
    // "admin's credentials" → head = "credentials", not "admin"
    const headToken = possessedTokens[possessedTokens.length - 1];

    return {
      text: fullText,
      type: 'possessive',
      head: headToken[0].toLowerCase(),
      startIndex: startIdx,
      endIndex: possessedEnd + 1, // +1 for 's token
      structure: {
        possessor: possessorText,
        possessorHead: possessorTokens[possessorTokens.length - 1][0].toLowerCase(),
        possessed: possessedText
      }
    };
  }

  _matchPPModified(tagged, startIdx) {
    // First, match head NP [DT? JJ* NN+]
    const headNP = this._matchSimpleNP(tagged, startIdx);
    if (!headNP) return null;

    let i = headNP.endIndex + 1;

    // Required: preposition
    if (i >= tagged.length || !this.prepTags.has(tagged[i][1])) {
      return null;
    }
    const prep = tagged[i][0];
    i++;

    // Required: PP object NP [DT? JJ* NN+]
    const ppObject = this._matchSimpleNP(tagged, i);
    if (!ppObject) return null;

    // Construct full PP-modified NP
    const fullTokens = tagged.slice(startIdx, ppObject.endIndex + 1);
    const fullText = this._joinTokens(fullTokens);

    return {
      text: fullText,
      type: 'pp-modified',
      head: headNP.head, // Head is from the FIRST NP, not the PP object!
      startIndex: startIdx,
      endIndex: ppObject.endIndex,
      structure: {
        headNP: headNP.text,
        preposition: prep,
        ppObject: ppObject.text,
        ppObjectHead: ppObject.head
      }
    };
  }

  _matchSimpleNP(tagged, startIdx) {
    let i = startIdx;
    const npStart = i;

    // Optional determiner
    let hasDeterminer = false;
    if (i < tagged.length && this.detTags.has(tagged[i][1])) {
      hasDeterminer = true;
      i++;
    }

    // Optional adjectives
    while (i < tagged.length && this.adjTags.has(tagged[i][1])) {
      i++;
    }

    // Required: at least one noun
    if (i >= tagged.length || !this.nounTags.has(tagged[i][1])) {
      return null;
    }

    const nounStart = i;

    // Consume all consecutive nouns (for compound nouns)
    while (i < tagged.length && this.nounTags.has(tagged[i][1])) {
      i++;
    }
    const nounEnd = i - 1;

    // Extract text
    const tokens = tagged.slice(npStart, nounEnd + 1);
    const text = this._joinTokens(tokens);

    // Head: rightmost noun
    const headToken = tagged[nounEnd];

    return {
      text: text,
      type: 'simple',
      head: headToken[0].toLowerCase(),
      startIndex: npStart,
      endIndex: nounEnd,
      structure: {
        hasDeterminer: hasDeterminer
      }
    };
  }

  extractComponents(chunk) {
    const components = [];

    if (chunk.type === 'possessive') {
      // Component 1: Possessor entity
      components.push({
        text: chunk.structure.possessor,
        head: chunk.structure.possessorHead,
        role: 'possessor',
        properties: { 'tagteam:isPossessor': true }
      });

      // Component 2: Full possessive phrase
      components.push({
        text: chunk.text,
        head: chunk.head, // "credentials", not "admin"!
        role: 'full-phrase',
        properties: { 'tagteam:hasModifier': true }
      });
    } else if (chunk.type === 'pp-modified') {
      // Component 1: Head NP (direct object/patient)
      // "the bug" from "the bug for the team"
      components.push({
        text: chunk.structure.headNP,
        head: chunk.head,
        role: 'head-np',
        properties: {}
      });

      // Component 2: PP object entity (beneficiary/location/etc)
      // "the team" from "the bug for the team"
      components.push({
        text: chunk.structure.ppObject,
        head: chunk.structure.ppObjectHead,
        role: 'pp-object',
        properties: {
          'tagteam:isPPObject': true,
          'tagteam:preposition': chunk.structure.preposition
        }
      });

      // Component 3: Full PP-modified phrase (optional, for reference)
      // "the bug for the team" - full phrase
      components.push({
        text: chunk.text,
        head: chunk.head,
        role: 'full-phrase',
        properties: { 'tagteam:hasModifier': true }
      });
    } else {
      // Simple NP: just the phrase itself
      components.push({
        text: chunk.text,
        head: chunk.head,
        role: 'full-phrase',
        properties: {}
      });
    }

    return components;
  }
}

// Export for Node.js / CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NPChunker;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.NPChunker = NPChunker;
}
