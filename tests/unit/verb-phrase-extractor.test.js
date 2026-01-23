/**
 * VerbPhraseExtractor Unit Tests - Phase 5.2
 */

const VerbPhraseExtractor = require('../../src/core/VerbPhraseExtractor.js');
const Lemmatizer = require('../../src/core/Lemmatizer.js');

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
      if (actual !== true) throw new Error(`Expected true but got ${actual}`);
    },
    toBeFalse() {
      if (actual !== false) throw new Error(`Expected false but got ${actual}`);
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null but got ${actual}`);
    },
    toContain(item) {
      if (!actual || !actual.includes(item)) {
        throw new Error(`Expected array to contain "${item}"`);
      }
    }
  };
}

let passed = 0;
let failed = 0;

const lemmatizer = new Lemmatizer();
const extractor = new VerbPhraseExtractor(lemmatizer);

describe('VerbPhraseExtractor', () => {

  describe('basic verb extraction', () => {
    if (it('extracts simple present tense verb', () => {
      const tokens = [["The", "DT"], ["doctor", "NN"], ["allocates", "VBZ"], ["resources", "NNS"]];
      const vps = extractor.extract(tokens);
      expect(vps.length).toBe(1);
      expect(vps[0].verb).toBe("allocates");
      expect(vps[0].lemma).toBe("allocate");
      expect(vps[0].tense).toBe("present");
    })) passed++; else failed++;

    if (it('extracts past tense verb', () => {
      const tokens = [["The", "DT"], ["doctor", "NN"], ["allocated", "VBD"], ["resources", "NNS"]];
      const vps = extractor.extract(tokens);
      expect(vps.length).toBe(1);
      expect(vps[0].verb).toBe("allocated");
      expect(vps[0].tense).toBe("past");
    })) passed++; else failed++;

    if (it('extracts base form verb', () => {
      const tokens = [["They", "PRP"], ["allocate", "VB"], ["resources", "NNS"]];
      const vps = extractor.extract(tokens);
      expect(vps.length).toBe(1);
      expect(vps[0].verb).toBe("allocate");
      expect(vps[0].lemma).toBe("allocate");
    })) passed++; else failed++;
  });

  describe('modal + verb extraction', () => {
    if (it('extracts modal + base verb', () => {
      const tokens = [["The", "DT"], ["doctor", "NN"], ["must", "MD"], ["allocate", "VB"]];
      const vps = extractor.extract(tokens);
      expect(vps.length).toBe(1);
      expect(vps[0].modal).toBe("must");
      expect(vps[0].verb).toBe("allocate");
    })) passed++; else failed++;

    if (it('extracts "should" modal', () => {
      const tokens = [["You", "PRP"], ["should", "MD"], ["review", "VB"], ["this", "DT"]];
      const vps = extractor.extract(tokens);
      expect(vps[0].modal).toBe("should");
      expect(vps[0].verb).toBe("review");
    })) passed++; else failed++;

    if (it('extracts "can" modal', () => {
      const tokens = [["She", "PRP"], ["can", "MD"], ["help", "VB"]];
      const vps = extractor.extract(tokens);
      expect(vps[0].modal).toBe("can");
      expect(vps[0].verb).toBe("help");
    })) passed++; else failed++;

    if (it('extracts "may" modal', () => {
      const tokens = [["It", "PRP"], ["may", "MD"], ["cause", "VB"], ["problems", "NNS"]];
      const vps = extractor.extract(tokens);
      expect(vps[0].modal).toBe("may");
      expect(vps[0].verb).toBe("cause");
    })) passed++; else failed++;
  });

  describe('negation detection', () => {
    if (it('detects negation with "not"', () => {
      const tokens = [["The", "DT"], ["doctor", "NN"], ["should", "MD"], ["not", "RB"], ["allocate", "VB"]];
      const vps = extractor.extract(tokens);
      expect(vps[0].negated).toBeTrue();
    })) passed++; else failed++;

    if (it('detects negation with "never"', () => {
      const tokens = [["They", "PRP"], ["never", "RB"], ["allocate", "VB"]];
      const vps = extractor.extract(tokens);
      expect(vps[0].negated).toBeTrue();
    })) passed++; else failed++;

    if (it('marks non-negated correctly', () => {
      const tokens = [["The", "DT"], ["doctor", "NN"], ["allocates", "VBZ"]];
      const vps = extractor.extract(tokens);
      expect(vps[0].negated).toBeFalse();
    })) passed++; else failed++;
  });

  describe('complex verb phrases', () => {
    if (it('handles auxiliary verbs: "has been"', () => {
      const tokens = [["The", "DT"], ["doctor", "NN"], ["has", "VBZ"], ["been", "VBN"], ["allocating", "VBG"]];
      const vps = extractor.extract(tokens);
      expect(vps[0].verb).toBe("allocating");
      expect(vps[0].auxiliary).toContain("has");
      expect(vps[0].auxiliary).toContain("been");
    })) passed++; else failed++;

    if (it('handles "is doing" progressive', () => {
      const tokens = [["He", "PRP"], ["is", "VBZ"], ["working", "VBG"]];
      const vps = extractor.extract(tokens);
      expect(vps[0].verb).toBe("working");
      expect(vps[0].tense).toBe("progressive");
    })) passed++; else failed++;

    if (it('handles perfect tense: "have eaten"', () => {
      const tokens = [["They", "PRP"], ["have", "VBP"], ["eaten", "VBN"]];
      const vps = extractor.extract(tokens);
      expect(vps[0].verb).toBe("eaten");
      expect(vps[0].tense).toBe("perfect");
    })) passed++; else failed++;
  });

  describe('passive voice detection', () => {
    if (it('detects passive voice: "was allocated"', () => {
      const tokens = [["The", "DT"], ["ventilator", "NN"], ["was", "VBD"], ["allocated", "VBN"]];
      const vps = extractor.extract(tokens);
      expect(vps[0].verb).toBe("allocated");
      expect(vps[0].isPassive).toBeTrue();
    })) passed++; else failed++;

    if (it('detects passive voice: "is being treated"', () => {
      const tokens = [["The", "DT"], ["patient", "NN"], ["is", "VBZ"], ["being", "VBG"], ["treated", "VBN"]];
      const vps = extractor.extract(tokens);
      expect(vps[0].isPassive).toBeTrue();
    })) passed++; else failed++;

    if (it('marks active voice correctly', () => {
      const tokens = [["The", "DT"], ["doctor", "NN"], ["treated", "VBD"], ["the", "DT"], ["patient", "NN"]];
      const vps = extractor.extract(tokens);
      expect(vps[0].isPassive).toBeFalse();
    })) passed++; else failed++;
  });

  describe('modal force classification', () => {
    if (it('classifies "must" as ambiguous', () => {
      const result = extractor.classifyModalForce('must', {});
      expect(result.isDeontic).toBeTrue();
      expect(result.isEpistemic).toBeTrue();
    })) passed++; else failed++;

    if (it('classifies "must" with perfect as epistemic', () => {
      const result = extractor.classifyModalForce('must', { isPerfectAspect: true });
      expect(result.isDeontic).toBeFalse();
      expect(result.isEpistemic).toBeTrue();
    })) passed++; else failed++;

    if (it('classifies "must" with agent subject as deontic', () => {
      const result = extractor.classifyModalForce('must', { hasAgentSubject: true });
      expect(result.isDeontic).toBeTrue();
      expect(result.isEpistemic).toBeFalse();
    })) passed++; else failed++;

    if (it('classifies "should" as ambiguous by default', () => {
      const result = extractor.classifyModalForce('should', {});
      expect(result.isDeontic).toBeTrue();
      expect(result.isEpistemic).toBeTrue();
    })) passed++; else failed++;

    if (it('classifies "should" with stative verb as epistemic', () => {
      const result = extractor.classifyModalForce('should', { isStativeVerb: true });
      expect(result.isDeontic).toBeFalse();
      expect(result.isEpistemic).toBeTrue();
    })) passed++; else failed++;

    if (it('classifies "might" as purely epistemic', () => {
      const result = extractor.classifyModalForce('might', {});
      expect(result.isDeontic).toBeFalse();
      expect(result.isEpistemic).toBeTrue();
    })) passed++; else failed++;

    if (it('classifies "shall" as purely deontic', () => {
      const result = extractor.classifyModalForce('shall', {});
      expect(result.isDeontic).toBeTrue();
      expect(result.isEpistemic).toBeFalse();
    })) passed++; else failed++;
  });

  describe('source text extraction', () => {
    if (it('captures full VP source text', () => {
      const tokens = [["The", "DT"], ["doctor", "NN"], ["must", "MD"], ["not", "RB"], ["allocate", "VB"]];
      const vps = extractor.extract(tokens);
      expect(vps[0].sourceText).toBe("must not allocate");
    })) passed++; else failed++;

    if (it('captures index range correctly', () => {
      const tokens = [["The", "DT"], ["doctor", "NN"], ["must", "MD"], ["allocate", "VB"]];
      const vps = extractor.extract(tokens);
      expect(vps[0].startIndex).toBe(2);
      expect(vps[0].endIndex).toBe(3);
    })) passed++; else failed++;
  });

  describe('helper methods', () => {
    if (it('detectNegation finds negation before verb', () => {
      const tokens = [["He", "PRP"], ["did", "VBD"], ["not", "RB"], ["go", "VB"]];
      expect(extractor.detectNegation(tokens, 3)).toBeTrue();
    })) passed++; else failed++;

    if (it('extractModal finds modal before verb', () => {
      const tokens = [["He", "PRP"], ["should", "MD"], ["go", "VB"]];
      expect(extractor.extractModal(tokens, 2)).toBe("should");
    })) passed++; else failed++;
  });

});

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
