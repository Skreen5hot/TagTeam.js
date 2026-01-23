/**
 * NounPhraseExtractor Unit Tests - Phase 5.2
 */

const NounPhraseExtractor = require('../../src/core/NounPhraseExtractor.js');

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
      if (actual !== null) throw new Error(`Expected null but got ${JSON.stringify(actual)}`);
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

const extractor = new NounPhraseExtractor();

describe('NounPhraseExtractor', () => {

  describe('basic noun phrases', () => {
    if (it('extracts definite NP: "The doctor"', () => {
      const tokens = [["The", "DT"], ["doctor", "NN"], ["examined", "VBD"], ["the", "DT"], ["patient", "NN"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].head).toBe("doctor");
      expect(nps[0].determiner).toBe("The");
      expect(nps[0].definiteness).toBe("definite");
    })) passed++; else failed++;

    if (it('extracts indefinite NP: "A doctor"', () => {
      const tokens = [["A", "DT"], ["doctor", "NN"], ["examined", "VBD"], ["a", "DT"], ["patient", "NN"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].head).toBe("doctor");
      expect(nps[0].definiteness).toBe("indefinite");
    })) passed++; else failed++;

    if (it('extracts singular noun', () => {
      const tokens = [["The", "DT"], ["patient", "NN"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].number).toBe("singular");
    })) passed++; else failed++;

    if (it('extracts plural noun', () => {
      const tokens = [["The", "DT"], ["patients", "NNS"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].number).toBe("plural");
    })) passed++; else failed++;
  });

  describe('modifiers', () => {
    if (it('extracts adjective modifier', () => {
      const tokens = [["The", "DT"], ["sick", "JJ"], ["patient", "NN"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].modifiers).toContain("sick");
    })) passed++; else failed++;

    if (it('extracts multiple modifiers', () => {
      const tokens = [["The", "DT"], ["critically", "RB"], ["ill", "JJ"], ["patient", "NN"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].modifiers).toContain("critically");
      expect(nps[0].modifiers).toContain("ill");
    })) passed++; else failed++;

    if (it('builds correct full text with modifiers', () => {
      const tokens = [["The", "DT"], ["critically", "RB"], ["ill", "JJ"], ["patient", "NN"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].fullText).toBe("The critically ill patient");
    })) passed++; else failed++;
  });

  describe('compound nouns', () => {
    if (it('handles two-word compounds', () => {
      const tokens = [["The", "DT"], ["health", "NN"], ["care", "NN"], ["provider", "NN"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].head).toBe("provider");
      expect(nps[0].compoundParts).toContain("health");
      expect(nps[0].compoundParts).toContain("care");
    })) passed++; else failed++;

    if (it('includes compound parts in full text', () => {
      const tokens = [["The", "DT"], ["health", "NN"], ["care", "NN"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].fullText).toBe("The health care");
    })) passed++; else failed++;
  });

  describe('pronouns', () => {
    if (it('extracts pronoun as complete NP', () => {
      const tokens = [["She", "PRP"], ["went", "VBD"], ["home", "NN"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].head).toBe("She");
      expect(nps[0].isPronoun).toBeTrue();
    })) passed++; else failed++;

    if (it('marks pronouns as definite', () => {
      const tokens = [["He", "PRP"], ["saw", "VBD"], ["them", "PRP"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].definiteness).toBe("definite");
    })) passed++; else failed++;

    if (it('detects plural pronouns', () => {
      const tokens = [["They", "PRP"], ["came", "VBD"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].number).toBe("plural");
    })) passed++; else failed++;
  });

  describe('quantifiers', () => {
    if (it('detects universal quantifier "all"', () => {
      const tokens = [["All", "DT"], ["doctors", "NNS"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].quantifier.type).toBe("universal");
      expect(nps[0].quantifier.word).toBe("all");
    })) passed++; else failed++;

    if (it('detects universal quantifier "every"', () => {
      const tokens = [["Every", "DT"], ["patient", "NN"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].quantifier.type).toBe("universal");
    })) passed++; else failed++;

    if (it('detects existential quantifier "some"', () => {
      const tokens = [["Some", "DT"], ["doctors", "NNS"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].quantifier.type).toBe("existential");
    })) passed++; else failed++;

    if (it('detects negative quantifier "no"', () => {
      const tokens = [["No", "DT"], ["doctor", "NN"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].quantifier.type).toBe("negative");
    })) passed++; else failed++;

    if (it('returns null for non-quantifier determiners', () => {
      const tokens = [["The", "DT"], ["doctor", "NN"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].quantifier).toBeNull();
    })) passed++; else failed++;
  });

  describe('nominalization detection', () => {
    if (it('detects -tion nominalization', () => {
      const result = extractor.checkNominalization("organization");
      expect(result.isNominalization).toBeTrue();
      expect(result.suffixes).toContain("-tion");
    })) passed++; else failed++;

    if (it('detects -ment nominalization', () => {
      const result = extractor.checkNominalization("treatment");
      expect(result.isNominalization).toBeTrue();
      expect(result.suffixes).toContain("-ment");
    })) passed++; else failed++;

    if (it('detects -ing nominalization', () => {
      const result = extractor.checkNominalization("building");
      expect(result.isNominalization).toBeTrue();
      expect(result.suffixes).toContain("-ing");
    })) passed++; else failed++;

    if (it('detects -ance nominalization', () => {
      const result = extractor.checkNominalization("performance");
      expect(result.isNominalization).toBeTrue();
      expect(result.suffixes).toContain("-ance/-ence");
    })) passed++; else failed++;

    if (it('returns false for non-nominalization', () => {
      const result = extractor.checkNominalization("doctor");
      expect(result.isNominalization).toBeFalse();
    })) passed++; else failed++;
  });

  describe('entity type classification', () => {
    if (it('classifies "doctor" as animate', () => {
      const result = extractor.classifyEntityType("doctor");
      expect(result.isAnimate).toBeTrue();
      expect(result.isInanimate).toBeFalse();
    })) passed++; else failed++;

    if (it('classifies "rock" as inanimate', () => {
      const result = extractor.classifyEntityType("rock");
      expect(result.isInanimate).toBeTrue();
      expect(result.isAnimate).toBeFalse();
    })) passed++; else failed++;

    if (it('classifies "organization" as animate (can be agent)', () => {
      const result = extractor.classifyEntityType("organization");
      expect(result.isOrganization).toBeTrue();
      expect(result.isAnimate).toBeTrue(); // Organizations can act as agents
    })) passed++; else failed++;

    if (it('classifies "justice" as abstract', () => {
      const result = extractor.classifyEntityType("justice");
      expect(result.isAbstract).toBeTrue();
    })) passed++; else failed++;

    if (it('classifies "committee" as organization', () => {
      const result = extractor.classifyEntityType("committee");
      expect(result.isOrganization).toBeTrue();
    })) passed++; else failed++;
  });

  describe('metonymy detection', () => {
    if (it('detects "White House" as potential metonymy', () => {
      const result = extractor.detectMetonymy("house");
      expect(result.isPotentialMetonymy).toBeTrue();
      expect(result.type).toBe("location_for_institution");
    })) passed++; else failed++;

    if (it('returns false for non-metonymic nouns', () => {
      const result = extractor.detectMetonymy("doctor");
      expect(result.isPotentialMetonymy).toBeFalse();
    })) passed++; else failed++;
  });

  describe('index tracking', () => {
    if (it('tracks correct start and end indices', () => {
      const tokens = [["The", "DT"], ["sick", "JJ"], ["patient", "NN"], ["went", "VBD"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].startIndex).toBe(0);
      expect(nps[0].endIndex).toBe(2);
    })) passed++; else failed++;

    if (it('extracts multiple NPs with correct indices', () => {
      const tokens = [["The", "DT"], ["doctor", "NN"], ["examined", "VBD"], ["the", "DT"], ["patient", "NN"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].startIndex).toBe(0);
      expect(nps[0].endIndex).toBe(1);
      expect(nps[1].startIndex).toBe(3);
      expect(nps[1].endIndex).toBe(4);
    })) passed++; else failed++;
  });

  describe('possessive determiners', () => {
    if (it('marks possessive as definite', () => {
      const tokens = [["His", "PRP$"], ["diagnosis", "NN"]];
      const nps = extractor.extract(tokens);
      expect(nps[0].definiteness).toBe("definite");
      expect(nps[0].determiner).toBe("His");
    })) passed++; else failed++;
  });

});

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
