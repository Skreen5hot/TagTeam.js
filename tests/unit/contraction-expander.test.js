/**
 * ContractionExpander Unit Tests - Phase 5.1
 */

const ContractionExpander = require('../../src/core/ContractionExpander.js');

// Test runner
function describe(name, fn) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${name}`);
  console.log('='.repeat(60));
  fn();
}

function it(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    return true;
  } catch (e) {
    console.log(`  [FAIL] ${name}`);
    console.log(`         ${e.message}`);
    return false;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected "${expected}" but got "${actual}"`);
      }
    },
    toEqual(expected) {
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      if (actualStr !== expectedStr) {
        throw new Error(`Expected ${expectedStr} but got ${actualStr}`);
      }
    },
    toBeTrue() {
      if (actual !== true) {
        throw new Error(`Expected true but got ${actual}`);
      }
    },
    toBeFalse() {
      if (actual !== false) {
        throw new Error(`Expected false but got ${actual}`);
      }
    },
    toContain(item) {
      if (!Array.isArray(actual) || !actual.includes(item)) {
        throw new Error(`Expected array to contain "${item}"`);
      }
    },
    toHaveLength(len) {
      if (actual.length !== len) {
        throw new Error(`Expected length ${len} but got ${actual.length}`);
      }
    }
  };
}

// Tests
let passed = 0;
let failed = 0;

const expander = new ContractionExpander();

describe('ContractionExpander', () => {

  describe('negation contractions', () => {
    if (it('expands "don\'t" to "do not"', () => {
      expect(expander.expand("I don't know")).toBe("I do not know");
    })) passed++; else failed++;

    if (it('expands "doesn\'t" correctly', () => {
      expect(expander.expand("She doesn't care")).toBe("She does not care");
    })) passed++; else failed++;

    if (it('expands "didn\'t" correctly', () => {
      expect(expander.expand("They didn't go")).toBe("They did not go");
    })) passed++; else failed++;

    if (it('expands "can\'t" to "can not"', () => {
      expect(expander.expand("I can't do it")).toBe("I can not do it");
    })) passed++; else failed++;

    if (it('expands "won\'t" to "will not"', () => {
      expect(expander.expand("She won't come")).toBe("She will not come");
    })) passed++; else failed++;

    if (it('expands "shouldn\'t" correctly', () => {
      expect(expander.expand("You shouldn't do that")).toBe("You should not do that");
    })) passed++; else failed++;

    if (it('expands "mustn\'t" correctly', () => {
      expect(expander.expand("You mustn't leave")).toBe("You must not leave");
    })) passed++; else failed++;

    if (it('handles multiple contractions in one sentence', () => {
      expect(expander.expand("I can't and won't do it")).toBe("I can not and will not do it");
    })) passed++; else failed++;
  });

  describe('pronoun contractions', () => {
    if (it('expands "I\'m" to "I am"', () => {
      expect(expander.expand("I'm happy")).toBe("I am happy");
    })) passed++; else failed++;

    if (it('expands "you\'re" to "you are"', () => {
      expect(expander.expand("You're correct")).toBe("You are correct");
    })) passed++; else failed++;

    if (it('expands "we\'re" correctly', () => {
      expect(expander.expand("We're going")).toBe("We are going");
    })) passed++; else failed++;

    if (it('expands "they\'re" correctly', () => {
      expect(expander.expand("They're here")).toBe("They are here");
    })) passed++; else failed++;

    if (it('expands "he\'s" to "he is"', () => {
      expect(expander.expand("He's coming")).toBe("He is coming");
    })) passed++; else failed++;

    if (it('expands "she\'s" correctly', () => {
      expect(expander.expand("She's ready")).toBe("She is ready");
    })) passed++; else failed++;

    if (it('expands "it\'s" correctly', () => {
      expect(expander.expand("It's raining")).toBe("It is raining");
    })) passed++; else failed++;
  });

  describe('have contractions', () => {
    if (it('expands "I\'ve" to "I have"', () => {
      expect(expander.expand("I've seen it")).toBe("I have seen it");
    })) passed++; else failed++;

    if (it('expands "you\'ve" correctly', () => {
      expect(expander.expand("You've been there")).toBe("You have been there");
    })) passed++; else failed++;

    if (it('expands "we\'ve" correctly', () => {
      expect(expander.expand("We've finished")).toBe("We have finished");
    })) passed++; else failed++;

    if (it('expands "they\'ve" correctly', () => {
      expect(expander.expand("They've arrived")).toBe("They have arrived");
    })) passed++; else failed++;
  });

  describe('will contractions', () => {
    if (it('expands "I\'ll" to "I will"', () => {
      expect(expander.expand("I'll do it")).toBe("I will do it");
    })) passed++; else failed++;

    if (it('expands "you\'ll" correctly', () => {
      expect(expander.expand("You'll see")).toBe("You will see");
    })) passed++; else failed++;

    if (it('expands "he\'ll" correctly', () => {
      expect(expander.expand("He'll arrive soon")).toBe("He will arrive soon");
    })) passed++; else failed++;

    if (it('expands "she\'ll" correctly', () => {
      expect(expander.expand("She'll call you")).toBe("She will call you");
    })) passed++; else failed++;

    if (it('expands "it\'ll" correctly', () => {
      expect(expander.expand("It'll be fine")).toBe("It will be fine");
    })) passed++; else failed++;
  });

  describe('would contractions', () => {
    if (it('expands "I\'d" to "I would"', () => {
      expect(expander.expand("I'd like that")).toBe("I would like that");
    })) passed++; else failed++;

    if (it('expands "you\'d" correctly', () => {
      expect(expander.expand("You'd better go")).toBe("You would better go");
    })) passed++; else failed++;

    if (it('expands "he\'d" correctly', () => {
      expect(expander.expand("He'd said yes")).toBe("He would said yes");
    })) passed++; else failed++;
  });

  describe('WH-word contractions', () => {
    if (it('expands "what\'s" correctly', () => {
      expect(expander.expand("What's happening")).toBe("What is happening");
    })) passed++; else failed++;

    if (it('expands "that\'s" correctly', () => {
      expect(expander.expand("That's good")).toBe("That is good");
    })) passed++; else failed++;

    if (it('expands "where\'s" correctly', () => {
      expect(expander.expand("Where's the key")).toBe("Where is the key");
    })) passed++; else failed++;

    if (it('expands "who\'s" correctly', () => {
      expect(expander.expand("Who's there")).toBe("Who is there");
    })) passed++; else failed++;

    if (it('expands "how\'s" correctly', () => {
      expect(expander.expand("How's it going")).toBe("How is it going");
    })) passed++; else failed++;
  });

  describe('misc contractions', () => {
    if (it('expands "there\'s" correctly', () => {
      expect(expander.expand("There's a problem")).toBe("There is a problem");
    })) passed++; else failed++;

    if (it('expands "here\'s" correctly', () => {
      expect(expander.expand("Here's the answer")).toBe("Here is the answer");
    })) passed++; else failed++;

    if (it('expands "let\'s" to "let us"', () => {
      expect(expander.expand("Let's go")).toBe("Let us go");
    })) passed++; else failed++;
  });

  describe('case preservation', () => {
    if (it('preserves case for sentence start', () => {
      expect(expander.expand("Don't go")).toBe("Do not go");
    })) passed++; else failed++;

    if (it('preserves case for "I\'m" at start', () => {
      expect(expander.expand("I'm here")).toBe("I am here");
    })) passed++; else failed++;

    if (it('preserves case mid-sentence', () => {
      expect(expander.expand("Well, I'm here")).toBe("Well, I am here");
    })) passed++; else failed++;
  });

  describe('expandWithTags', () => {
    if (it('returns expanded tokens with tag map', () => {
      const result = expander.expandWithTags(["I", "don't", "know"]);
      expect(result.tokens).toEqual(["I", "do", "not", "know"]);
      expect(result.tagMap.get(1)).toBe("VB");
      expect(result.tagMap.get(2)).toBe("RB");
    })) passed++; else failed++;

    if (it('handles modal contractions', () => {
      const result = expander.expandWithTags(["I", "can't", "go"]);
      expect(result.tokens).toEqual(["I", "can", "not", "go"]);
      expect(result.tagMap.get(1)).toBe("MD");
      expect(result.tagMap.get(2)).toBe("RB");
    })) passed++; else failed++;

    if (it('handles pronoun contractions', () => {
      const result = expander.expandWithTags(["I'm", "going"]);
      expect(result.tokens).toEqual(["I", "am", "going"]);
      expect(result.tagMap.get(0)).toBe("PRP");
      expect(result.tagMap.get(1)).toBe("VBP");
    })) passed++; else failed++;
  });

  describe('isContraction', () => {
    if (it('returns true for known contractions', () => {
      expect(expander.isContraction("don't")).toBeTrue();
      expect(expander.isContraction("I'm")).toBeTrue();
      expect(expander.isContraction("won't")).toBeTrue();
    })) passed++; else failed++;

    if (it('returns false for non-contractions', () => {
      expect(expander.isContraction("hello")).toBeFalse();
      expect(expander.isContraction("doctor")).toBeFalse();
    })) passed++; else failed++;
  });

  describe('apostrophe normalization', () => {
    if (it('normalizes curly apostrophes', () => {
      expect(expander.expand("I'm happy")).toBe("I am happy"); // curly '
    })) passed++; else failed++;

    if (it('normalizes backtick apostrophes', () => {
      expect(expander.expand("I`m happy")).toBe("I am happy");
    })) passed++; else failed++;
  });

  describe('disambiguateApostropheS', () => {
    if (it('returns "has" for past participle context', () => {
      expect(expander.disambiguateApostropheS("he's", "gone", null)).toBe("has");
      expect(expander.disambiguateApostropheS("she's", "been", null)).toBe("has");
      expect(expander.disambiguateApostropheS("it's", "taken", null)).toBe("has");
    })) passed++; else failed++;

    if (it('returns "is" for progressive/other context', () => {
      expect(expander.disambiguateApostropheS("he's", "going", null)).toBe("is");
      expect(expander.disambiguateApostropheS("she's", "happy", null)).toBe("is");
      expect(expander.disambiguateApostropheS("it's", "raining", null)).toBe("is");
    })) passed++; else failed++;

    if (it('uses VBN tag when provided', () => {
      expect(expander.disambiguateApostropheS("he's", "finished", "VBN")).toBe("has");
    })) passed++; else failed++;
  });

  describe('getContractionList', () => {
    if (it('returns array of all contractions', () => {
      const list = expander.getContractionList();
      expect(Array.isArray(list)).toBeTrue();
      expect(list.length > 40).toBeTrue(); // Should have 46+ contractions
      expect(list).toContain("don't");
      expect(list).toContain("i'm");
    })) passed++; else failed++;
  });

});

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
