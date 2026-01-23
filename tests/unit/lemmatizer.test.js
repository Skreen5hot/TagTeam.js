/**
 * Lemmatizer Unit Tests - Phase 5.1
 */

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
    }
  };
}

// Tests
let passed = 0;
let failed = 0;

const lemmatizer = new Lemmatizer();

describe('Lemmatizer', () => {

  describe('verb lemmatization - regular past tense (-ed)', () => {
    if (it('handles regular past tense: walked -> walk', () => {
      expect(lemmatizer.lemmatize('walked', 'VBD').lemma).toBe('walk');
    })) passed++; else failed++;

    if (it('handles regular past tense: talked -> talk', () => {
      expect(lemmatizer.lemmatize('talked', 'VBD').lemma).toBe('talk');
    })) passed++; else failed++;

    if (it('handles regular past tense: jumped -> jump', () => {
      expect(lemmatizer.lemmatize('jumped', 'VBD').lemma).toBe('jump');
    })) passed++; else failed++;

    if (it('handles -ied past: studied -> study', () => {
      expect(lemmatizer.lemmatize('studied', 'VBD').lemma).toBe('study');
    })) passed++; else failed++;

    if (it('handles -ied past: applied -> apply', () => {
      expect(lemmatizer.lemmatize('applied', 'VBD').lemma).toBe('apply');
    })) passed++; else failed++;

    if (it('handles -ied past: tried -> try', () => {
      expect(lemmatizer.lemmatize('tried', 'VBD').lemma).toBe('try');
    })) passed++; else failed++;
  });

  describe('verb lemmatization - irregular past tense', () => {
    if (it('handles went -> go', () => {
      expect(lemmatizer.lemmatize('went', 'VBD').lemma).toBe('go');
    })) passed++; else failed++;

    if (it('handles was -> be', () => {
      expect(lemmatizer.lemmatize('was', 'VBD').lemma).toBe('be');
    })) passed++; else failed++;

    if (it('handles were -> be', () => {
      expect(lemmatizer.lemmatize('were', 'VBD').lemma).toBe('be');
    })) passed++; else failed++;

    if (it('handles had -> have', () => {
      expect(lemmatizer.lemmatize('had', 'VBD').lemma).toBe('have');
    })) passed++; else failed++;

    if (it('handles made -> make', () => {
      expect(lemmatizer.lemmatize('made', 'VBD').lemma).toBe('make');
    })) passed++; else failed++;

    if (it('handles said -> say', () => {
      expect(lemmatizer.lemmatize('said', 'VBD').lemma).toBe('say');
    })) passed++; else failed++;

    if (it('handles thought -> think', () => {
      expect(lemmatizer.lemmatize('thought', 'VBD').lemma).toBe('think');
    })) passed++; else failed++;

    if (it('handles knew -> know', () => {
      expect(lemmatizer.lemmatize('knew', 'VBD').lemma).toBe('know');
    })) passed++; else failed++;

    if (it('handles took -> take', () => {
      expect(lemmatizer.lemmatize('took', 'VBD').lemma).toBe('take');
    })) passed++; else failed++;

    if (it('handles saw -> see (verb context)', () => {
      expect(lemmatizer.lemmatize('saw', 'VBD').lemma).toBe('see');
    })) passed++; else failed++;

    if (it('handles left -> leave (verb context)', () => {
      expect(lemmatizer.lemmatize('left', 'VBD').lemma).toBe('leave');
    })) passed++; else failed++;
  });

  describe('verb lemmatization - past participles (-en, irregular)', () => {
    if (it('handles gone -> go', () => {
      expect(lemmatizer.lemmatize('gone', 'VBN').lemma).toBe('go');
    })) passed++; else failed++;

    if (it('handles been -> be', () => {
      expect(lemmatizer.lemmatize('been', 'VBN').lemma).toBe('be');
    })) passed++; else failed++;

    if (it('handles done -> do', () => {
      expect(lemmatizer.lemmatize('done', 'VBN').lemma).toBe('do');
    })) passed++; else failed++;

    if (it('handles seen -> see', () => {
      expect(lemmatizer.lemmatize('seen', 'VBN').lemma).toBe('see');
    })) passed++; else failed++;

    if (it('handles written -> write', () => {
      expect(lemmatizer.lemmatize('written', 'VBN').lemma).toBe('write');
    })) passed++; else failed++;

    if (it('handles taken -> take', () => {
      expect(lemmatizer.lemmatize('taken', 'VBN').lemma).toBe('take');
    })) passed++; else failed++;

    if (it('handles given -> give', () => {
      expect(lemmatizer.lemmatize('given', 'VBN').lemma).toBe('give');
    })) passed++; else failed++;

    if (it('handles broken -> break', () => {
      expect(lemmatizer.lemmatize('broken', 'VBN').lemma).toBe('break');
    })) passed++; else failed++;

    if (it('handles spoken -> speak', () => {
      expect(lemmatizer.lemmatize('spoken', 'VBN').lemma).toBe('speak');
    })) passed++; else failed++;
  });

  describe('verb lemmatization - progressive (-ing)', () => {
    if (it('handles running -> run (doubled consonant)', () => {
      expect(lemmatizer.lemmatize('running', 'VBG').lemma).toBe('run');
    })) passed++; else failed++;

    if (it('handles sitting -> sit (doubled consonant)', () => {
      expect(lemmatizer.lemmatize('sitting', 'VBG').lemma).toBe('sit');
    })) passed++; else failed++;

    if (it('handles stopping -> stop (doubled consonant)', () => {
      expect(lemmatizer.lemmatize('stopping', 'VBG').lemma).toBe('stop');
    })) passed++; else failed++;

    if (it('handles planning -> plan (doubled consonant)', () => {
      expect(lemmatizer.lemmatize('planning', 'VBG').lemma).toBe('plan');
    })) passed++; else failed++;

    if (it('handles making -> make (silent e)', () => {
      expect(lemmatizer.lemmatize('making', 'VBG').lemma).toBe('make');
    })) passed++; else failed++;

    if (it('handles taking -> take (silent e)', () => {
      expect(lemmatizer.lemmatize('taking', 'VBG').lemma).toBe('take');
    })) passed++; else failed++;

    if (it('handles giving -> give (silent e)', () => {
      expect(lemmatizer.lemmatize('giving', 'VBG').lemma).toBe('give');
    })) passed++; else failed++;

    if (it('handles studying -> study (i->y)', () => {
      expect(lemmatizer.lemmatize('studying', 'VBG').lemma).toBe('study');
    })) passed++; else failed++;

    if (it('handles walking -> walk (regular)', () => {
      expect(lemmatizer.lemmatize('walking', 'VBG').lemma).toBe('walk');
    })) passed++; else failed++;

    if (it('handles treating -> treat (regular)', () => {
      expect(lemmatizer.lemmatize('treating', 'VBG').lemma).toBe('treat');
    })) passed++; else failed++;
  });

  describe('verb lemmatization - 3rd person singular (-s/-es)', () => {
    if (it('handles is -> be', () => {
      expect(lemmatizer.lemmatize('is', 'VBZ').lemma).toBe('be');
    })) passed++; else failed++;

    if (it('handles has -> have', () => {
      expect(lemmatizer.lemmatize('has', 'VBZ').lemma).toBe('have');
    })) passed++; else failed++;

    if (it('handles does -> do', () => {
      expect(lemmatizer.lemmatize('does', 'VBZ').lemma).toBe('do');
    })) passed++; else failed++;

    if (it('handles goes -> go', () => {
      expect(lemmatizer.lemmatize('goes', 'VBZ').lemma).toBe('go');
    })) passed++; else failed++;

    if (it('handles walks -> walk (regular)', () => {
      expect(lemmatizer.lemmatize('walks', 'VBZ').lemma).toBe('walk');
    })) passed++; else failed++;

    if (it('handles carries -> carry (ies->y)', () => {
      expect(lemmatizer.lemmatize('carries', 'VBZ').lemma).toBe('carry');
    })) passed++; else failed++;

    if (it('handles watches -> watch (sibilant)', () => {
      expect(lemmatizer.lemmatize('watches', 'VBZ').lemma).toBe('watch');
    })) passed++; else failed++;

    if (it('handles pushes -> push (sibilant)', () => {
      expect(lemmatizer.lemmatize('pushes', 'VBZ').lemma).toBe('push');
    })) passed++; else failed++;
  });

  describe('noun lemmatization - irregular plurals', () => {
    if (it('handles children -> child', () => {
      expect(lemmatizer.lemmatize('children', 'NNS').lemma).toBe('child');
    })) passed++; else failed++;

    if (it('handles people -> person', () => {
      expect(lemmatizer.lemmatize('people', 'NNS').lemma).toBe('person');
    })) passed++; else failed++;

    if (it('handles mice -> mouse', () => {
      expect(lemmatizer.lemmatize('mice', 'NNS').lemma).toBe('mouse');
    })) passed++; else failed++;

    if (it('handles teeth -> tooth', () => {
      expect(lemmatizer.lemmatize('teeth', 'NNS').lemma).toBe('tooth');
    })) passed++; else failed++;

    if (it('handles feet -> foot', () => {
      expect(lemmatizer.lemmatize('feet', 'NNS').lemma).toBe('foot');
    })) passed++; else failed++;

    if (it('handles men -> man', () => {
      expect(lemmatizer.lemmatize('men', 'NNS').lemma).toBe('man');
    })) passed++; else failed++;

    if (it('handles women -> woman', () => {
      expect(lemmatizer.lemmatize('women', 'NNS').lemma).toBe('woman');
    })) passed++; else failed++;

    if (it('handles geese -> goose', () => {
      expect(lemmatizer.lemmatize('geese', 'NNS').lemma).toBe('goose');
    })) passed++; else failed++;

    if (it('handles oxen -> ox', () => {
      expect(lemmatizer.lemmatize('oxen', 'NNS').lemma).toBe('ox');
    })) passed++; else failed++;
  });

  describe('noun lemmatization - Latin/Greek plurals', () => {
    if (it('handles criteria -> criterion', () => {
      expect(lemmatizer.lemmatize('criteria', 'NNS').lemma).toBe('criterion');
    })) passed++; else failed++;

    if (it('handles phenomena -> phenomenon', () => {
      expect(lemmatizer.lemmatize('phenomena', 'NNS').lemma).toBe('phenomenon');
    })) passed++; else failed++;

    if (it('handles analyses -> analysis', () => {
      expect(lemmatizer.lemmatize('analyses', 'NNS').lemma).toBe('analysis');
    })) passed++; else failed++;

    if (it('handles diagnoses -> diagnosis', () => {
      expect(lemmatizer.lemmatize('diagnoses', 'NNS').lemma).toBe('diagnosis');
    })) passed++; else failed++;

    if (it('handles theses -> thesis', () => {
      expect(lemmatizer.lemmatize('theses', 'NNS').lemma).toBe('thesis');
    })) passed++; else failed++;

    if (it('handles hypotheses -> hypothesis', () => {
      expect(lemmatizer.lemmatize('hypotheses', 'NNS').lemma).toBe('hypothesis');
    })) passed++; else failed++;

    if (it('handles cacti -> cactus', () => {
      expect(lemmatizer.lemmatize('cacti', 'NNS').lemma).toBe('cactus');
    })) passed++; else failed++;

    if (it('handles fungi -> fungus', () => {
      expect(lemmatizer.lemmatize('fungi', 'NNS').lemma).toBe('fungus');
    })) passed++; else failed++;

    if (it('handles alumni -> alumnus', () => {
      expect(lemmatizer.lemmatize('alumni', 'NNS').lemma).toBe('alumnus');
    })) passed++; else failed++;

    if (it('handles data -> datum', () => {
      expect(lemmatizer.lemmatize('data', 'NNS').lemma).toBe('datum');
    })) passed++; else failed++;

    if (it('handles media -> medium', () => {
      expect(lemmatizer.lemmatize('media', 'NNS').lemma).toBe('medium');
    })) passed++; else failed++;
  });

  describe('noun lemmatization - regular plurals', () => {
    if (it('handles cats -> cat', () => {
      expect(lemmatizer.lemmatize('cats', 'NNS').lemma).toBe('cat');
    })) passed++; else failed++;

    if (it('handles dogs -> dog', () => {
      expect(lemmatizer.lemmatize('dogs', 'NNS').lemma).toBe('dog');
    })) passed++; else failed++;

    if (it('handles boxes -> box (sibilant)', () => {
      expect(lemmatizer.lemmatize('boxes', 'NNS').lemma).toBe('box');
    })) passed++; else failed++;

    if (it('handles watches -> watch (sibilant)', () => {
      expect(lemmatizer.lemmatize('watches', 'NNS').lemma).toBe('watch');
    })) passed++; else failed++;

    if (it('handles policies -> policy (ies->y)', () => {
      expect(lemmatizer.lemmatize('policies', 'NNS').lemma).toBe('policy');
    })) passed++; else failed++;

    if (it('handles families -> family (ies->y)', () => {
      expect(lemmatizer.lemmatize('families', 'NNS').lemma).toBe('family');
    })) passed++; else failed++;

    if (it('handles categories -> category (ies->y)', () => {
      expect(lemmatizer.lemmatize('categories', 'NNS').lemma).toBe('category');
    })) passed++; else failed++;
  });

  describe('noun lemmatization - medical/technical', () => {
    if (it('handles diagnoses -> diagnosis', () => {
      expect(lemmatizer.lemmatize('diagnoses', 'NNS').lemma).toBe('diagnosis');
    })) passed++; else failed++;

    if (it('handles prognoses -> prognosis', () => {
      expect(lemmatizer.lemmatize('prognoses', 'NNS').lemma).toBe('prognosis');
    })) passed++; else failed++;

    if (it('handles metastases -> metastasis', () => {
      expect(lemmatizer.lemmatize('metastases', 'NNS').lemma).toBe('metastasis');
    })) passed++; else failed++;
  });

  describe('POS-dependent disambiguation', () => {
    if (it('handles "saw" as verb (VBD) -> see', () => {
      expect(lemmatizer.lemmatize('saw', 'VBD').lemma).toBe('see');
      expect(lemmatizer.lemmatize('saw', 'VBD').category).toBe('verb');
    })) passed++; else failed++;

    if (it('handles "saw" as noun (NN) -> saw', () => {
      expect(lemmatizer.lemmatize('saw', 'NN').lemma).toBe('saw');
      expect(lemmatizer.lemmatize('saw', 'NN').category).toBe('noun');
    })) passed++; else failed++;

    if (it('handles "left" as verb (VBD) -> leave', () => {
      expect(lemmatizer.lemmatize('left', 'VBD').lemma).toBe('leave');
      expect(lemmatizer.lemmatize('left', 'VBD').category).toBe('verb');
    })) passed++; else failed++;

    if (it('handles "left" as adjective (JJ) -> left', () => {
      // Adjective not transformed
      expect(lemmatizer.lemmatize('left', 'JJ').lemma).toBe('left');
    })) passed++; else failed++;

    if (it('handles "files" as noun (NNS) -> file', () => {
      const result = lemmatizer.lemmatize('files', 'NNS');
      expect(result.lemma).toBe('file');
      expect(result.category).toBe('noun');
    })) passed++; else failed++;

    if (it('handles "files" as verb (VBZ) -> file', () => {
      const result = lemmatizer.lemmatize('files', 'VBZ');
      expect(result.lemma).toBe('file');
      expect(result.category).toBe('verb');
    })) passed++; else failed++;
  });

  describe('consonant doubling rules', () => {
    if (it('handles stopped -> stop', () => {
      expect(lemmatizer.lemmatize('stopped', 'VBD').lemma).toBe('stop');
    })) passed++; else failed++;

    if (it('handles planned -> plan', () => {
      expect(lemmatizer.lemmatize('planned', 'VBD').lemma).toBe('plan');
    })) passed++; else failed++;

    if (it('handles sitting -> sit', () => {
      expect(lemmatizer.lemmatize('sitting', 'VBG').lemma).toBe('sit');
    })) passed++; else failed++;

    if (it('handles running -> run', () => {
      expect(lemmatizer.lemmatize('running', 'VBG').lemma).toBe('run');
    })) passed++; else failed++;
  });

  describe('silent e restoration', () => {
    if (it('handles making -> make', () => {
      expect(lemmatizer.lemmatize('making', 'VBG').lemma).toBe('make');
    })) passed++; else failed++;

    if (it('handles taking -> take', () => {
      expect(lemmatizer.lemmatize('taking', 'VBG').lemma).toBe('take');
    })) passed++; else failed++;

    if (it('handles giving -> give', () => {
      expect(lemmatizer.lemmatize('giving', 'VBG').lemma).toBe('give');
    })) passed++; else failed++;

    if (it('handles hoped -> hope', () => {
      expect(lemmatizer.lemmatize('hoped', 'VBD').lemma).toBe('hope');
    })) passed++; else failed++;

    if (it('handles liked -> like', () => {
      expect(lemmatizer.lemmatize('liked', 'VBD').lemma).toBe('like');
    })) passed++; else failed++;
  });

  describe('y-to-i replacement', () => {
    if (it('handles tried -> try', () => {
      expect(lemmatizer.lemmatize('tried', 'VBD').lemma).toBe('try');
    })) passed++; else failed++;

    if (it('handles applied -> apply', () => {
      expect(lemmatizer.lemmatize('applied', 'VBD').lemma).toBe('apply');
    })) passed++; else failed++;

    if (it('handles carries -> carry', () => {
      expect(lemmatizer.lemmatize('carries', 'VBZ').lemma).toBe('carry');
    })) passed++; else failed++;

    if (it('handles studying -> study', () => {
      expect(lemmatizer.lemmatize('studying', 'VBG').lemma).toBe('study');
    })) passed++; else failed++;
  });

  describe('lemmatizePhrase', () => {
    if (it('lemmatizes last word of phrase', () => {
      expect(lemmatizer.lemmatizePhrase('health care providers')).toBe('health care provider');
    })) passed++; else failed++;

    if (it('handles single word phrases', () => {
      expect(lemmatizer.lemmatizePhrase('patients')).toBe('patient');
    })) passed++; else failed++;

    if (it('handles phrases with irregular nouns', () => {
      expect(lemmatizer.lemmatizePhrase('the children')).toBe('the child');
    })) passed++; else failed++;
  });

  describe('getBaseForm convenience method', () => {
    if (it('returns lemma directly', () => {
      expect(lemmatizer.getBaseForm('running')).toBe('run');
      expect(lemmatizer.getBaseForm('children')).toBe('child');
    })) passed++; else failed++;
  });

  describe('medical verb forms', () => {
    if (it('handles diagnosed -> diagnose', () => {
      expect(lemmatizer.lemmatize('diagnosed', 'VBD').lemma).toBe('diagnose');
    })) passed++; else failed++;

    if (it('handles treating -> treat', () => {
      expect(lemmatizer.lemmatize('treating', 'VBG').lemma).toBe('treat');
    })) passed++; else failed++;

    if (it('handles administered -> administer', () => {
      expect(lemmatizer.lemmatize('administered', 'VBD').lemma).toBe('administer');
    })) passed++; else failed++;
  });

});

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
