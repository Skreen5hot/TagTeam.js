/**
 * Lemmatizer - Phase 5.1
 *
 * Reduces inflected word forms to their base/dictionary form (lemma).
 * Handles irregular verbs, irregular nouns, and regular morphological patterns.
 * Extracted and enhanced from archive/POS Graph POC/js/POSTaggerGraph.js
 *
 * @example
 * const lemmatizer = new Lemmatizer();
 * lemmatizer.lemmatize("running", "VBG")  // => { lemma: "run", category: "verb" }
 * lemmatizer.lemmatize("children", "NNS") // => { lemma: "child", category: "noun" }
 * lemmatizer.lemmatize("saw", "VBD")      // => { lemma: "see", category: "verb" }
 * lemmatizer.lemmatize("saw", "NN")       // => { lemma: "saw", category: "noun" }
 */
class Lemmatizer {
  constructor(customIrregulars = {}) {
    // Invariable nouns (same in singular and plural)
    this.invariableNouns = new Set([
      'aircraft', 'barracks', 'billiards', 'bison', 'chinese',
      'cod', 'crossroads', 'deer', 'fish', 'gallows',
      'headquarters', 'hovercraft', 'japanese', 'mathematics', 'means',
      'moose', 'news', 'physics', 'portuguese', 'salmon',
      'series', 'sheep', 'shrimp', 'spacecraft', 'species',
      'squid', 'swiss', 'trout', 'vietnamese', 'watercraft',
      'offspring', 'swine', 'chassis', 'corps', 'premises'
    ]);

    // Irregular noun plurals -> singular
    this.irregularNouns = Object.assign({
      // Vowel change
      'men': 'man',
      'women': 'woman',
      'feet': 'foot',
      'teeth': 'tooth',
      'geese': 'goose',
      'mice': 'mouse',
      'lice': 'louse',

      // Ending change
      'children': 'child',
      'oxen': 'ox',
      'people': 'person',
      'brethren': 'brother',

      // Latin/Greek plurals
      'cacti': 'cactus',
      'fungi': 'fungus',
      'stimuli': 'stimulus',
      'syllabi': 'syllabus',
      'alumni': 'alumnus',
      'algae': 'alga',
      'larvae': 'larva',
      'vertebrae': 'vertebra',
      'antennae': 'antenna',
      'formulae': 'formula',
      'criteria': 'criterion',
      'phenomena': 'phenomenon',
      'appendices': 'appendix',
      'indices': 'index',
      'matrices': 'matrix',
      'analyses': 'analysis',
      'axes': 'axis',
      'bases': 'basis',
      'crises': 'crisis',
      'diagnoses': 'diagnosis',
      'ellipses': 'ellipsis',
      'hypotheses': 'hypothesis',
      'oases': 'oasis',
      'parentheses': 'parenthesis',
      'prognoses': 'prognosis',
      'synopses': 'synopsis',
      'theses': 'thesis',
      'metastases': 'metastasis',
      'neuroses': 'neurosis',
      'psychoses': 'psychosis',

      // -um -> -a
      'data': 'datum',
      'media': 'medium',
      'curricula': 'curriculum',
      'memoranda': 'memorandum',
      'millennia': 'millennium',
      'symposia': 'symposium',
      'bacteria': 'bacterium',
      'strata': 'stratum',

      // -ex/-ix -> -ices
      'vertices': 'vertex',
      'cortices': 'cortex',
      'apices': 'apex',

      // Miscellaneous
      'dice': 'die',
      'pennies': 'penny',
      'pence': 'penny'
    }, customIrregulars.nouns || {});

    // Irregular verb forms -> base form
    this.irregularVerbs = Object.assign({
      // A
      'arisen': 'arise', 'arose': 'arise', 'ate': 'eat', 'awoke': 'awake', 'awoken': 'awake',

      // B
      'was': 'be', 'were': 'be', 'been': 'be', 'am': 'be', 'is': 'be', 'are': 'be',
      'began': 'begin', 'begun': 'begin',
      'bent': 'bend', 'bet': 'bet',
      'bit': 'bite', 'bitten': 'bite',
      'blew': 'blow', 'blown': 'blow',
      'broke': 'break', 'broken': 'break',
      'brought': 'bring', 'built': 'build', 'burnt': 'burn', 'burst': 'burst', 'bought': 'buy',

      // C
      'cast': 'cast', 'caught': 'catch',
      'chose': 'choose', 'chosen': 'choose',
      'came': 'come', 'cost': 'cost', 'crept': 'creep', 'cut': 'cut',

      // D
      'dealt': 'deal',
      'did': 'do', 'done': 'do', 'does': 'do',
      'drew': 'draw', 'drawn': 'draw',
      'dreamt': 'dream', 'drank': 'drink', 'drunk': 'drink',
      'drove': 'drive', 'driven': 'drive',
      'dug': 'dig', 'dwelt': 'dwell',

      // E-F
      'eaten': 'eat',
      'fell': 'fall', 'fallen': 'fall',
      'fed': 'feed', 'felt': 'feel',
      'fit': 'fit', 'fled': 'flee',
      'flew': 'fly', 'flown': 'fly',
      'flung': 'fling',
      'forbade': 'forbid', 'forbidden': 'forbid',
      'forgot': 'forget', 'forgotten': 'forget',
      'forgave': 'forgive', 'forgiven': 'forgive',
      'forsook': 'forsake', 'forsaken': 'forsake',
      'fought': 'fight', 'found': 'find',
      'froze': 'freeze', 'frozen': 'freeze',

      // G
      'gave': 'give', 'given': 'give',
      'got': 'get', 'gotten': 'get',
      'went': 'go', 'gone': 'go', 'goes': 'go',
      'ground': 'grind',
      'grew': 'grow', 'grown': 'grow',

      // H
      'had': 'have', 'has': 'have',
      'heard': 'hear', 'held': 'hold',
      'hid': 'hide', 'hidden': 'hide',
      'hit': 'hit', 'hung': 'hang', 'hurt': 'hurt',

      // K-L
      'kept': 'keep', 'knelt': 'kneel', 'knew': 'know', 'known': 'know',
      'laid': 'lay', 'led': 'lead', 'leant': 'lean', 'leapt': 'leap',
      'learnt': 'learn', 'left': 'leave', 'lent': 'lend', 'let': 'let',
      'lit': 'light', 'lost': 'lose',

      // M
      'made': 'make', 'meant': 'mean', 'met': 'meet', 'mistook': 'mistake',

      // O-P
      'overcame': 'overcome', 'overtook': 'overtake',
      'paid': 'pay', 'put': 'put',

      // Q-R
      'quit': 'quit',
      'ran': 'run', 'rang': 'ring', 'rung': 'ring',
      'read': 'read', // same spelling, different pronunciation
      'rid': 'rid', 'rode': 'ride', 'ridden': 'ride',
      'rose': 'rise', 'risen': 'rise',

      // S
      'said': 'say', 'sang': 'sing', 'sung': 'sing',
      'sank': 'sink', 'sunk': 'sink',
      'sat': 'sit',
      'saw': 'see', 'seen': 'see',
      'sent': 'send', 'set': 'set',
      'shook': 'shake', 'shaken': 'shake',
      'shed': 'shed', 'shone': 'shine',
      'shot': 'shoot', 'showed': 'show', 'shown': 'show',
      'shrank': 'shrink', 'shrunk': 'shrink',
      'shut': 'shut', 'slept': 'sleep', 'slid': 'slide',
      'slit': 'slit', 'smelt': 'smell',
      'sold': 'sell', 'sought': 'seek',
      'sowed': 'sow', 'sown': 'sow',
      'spoke': 'speak', 'spoken': 'speak',
      'sped': 'speed', 'spelt': 'spell', 'spent': 'spend',
      'spilt': 'spill', 'spun': 'spin',
      'split': 'split', 'spoilt': 'spoil',
      'spread': 'spread', 'sprang': 'spring', 'sprung': 'spring',
      'stood': 'stand',
      'stole': 'steal', 'stolen': 'steal',
      'stuck': 'stick', 'stung': 'sting',
      'stank': 'stink', 'stunk': 'stink',
      'strode': 'stride', 'struck': 'strike', 'striven': 'strive', 'strove': 'strive',
      'swam': 'swim', 'swum': 'swim',
      'swept': 'sweep', 'swore': 'swear', 'sworn': 'swear',
      'swung': 'swing',

      // T
      'took': 'take', 'taken': 'take',
      'taught': 'teach', 'tore': 'tear', 'torn': 'tear',
      'told': 'tell', 'thought': 'think', 'threw': 'throw', 'thrown': 'throw',
      'thrust': 'thrust', 'trod': 'tread', 'trodden': 'tread',

      // U-W
      'understood': 'understand', 'underwent': 'undergo', 'undertaken': 'undertake', 'undertook': 'undertake',
      'woke': 'wake', 'woken': 'wake',
      'wore': 'wear', 'worn': 'wear',
      'wove': 'weave', 'woven': 'weave',
      'wept': 'weep', 'wet': 'wet',
      'won': 'win', 'wound': 'wind',
      'withdrew': 'withdraw', 'withdrawn': 'withdraw',
      'withheld': 'withhold', 'withstood': 'withstand',
      'wrung': 'wring', 'wrote': 'write', 'written': 'write'
    }, customIrregulars.verbs || {});

    // POS tags that indicate verbs vs nouns
    this.verbTags = new Set(['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ']);
    this.nounTags = new Set(['NN', 'NNS', 'NNP', 'NNPS']);
  }

  /**
   * Lemmatize a word with optional POS tag context
   * @param {string} word - Word to lemmatize
   * @param {string} [posTag] - POS tag for disambiguation
   * @returns {{ lemma: string, category: string }} - Lemma and category
   */
  lemmatize(word, posTag) {
    if (!word || typeof word !== 'string') {
      return { lemma: '', category: 'unknown' };
    }

    const w = word.toLowerCase().trim();

    // Determine category from POS tag
    let category = 'unknown';
    if (posTag) {
      if (this.verbTags.has(posTag)) {
        category = 'verb';
      } else if (this.nounTags.has(posTag)) {
        category = 'noun';
      } else if (posTag === 'JJ' || posTag === 'JJR' || posTag === 'JJS') {
        // Adjectives: return as-is, don't lemmatize
        return { lemma: w, category: 'adjective' };
      } else if (posTag === 'RB' || posTag === 'RBR' || posTag === 'RBS') {
        // Adverbs: return as-is
        return { lemma: w, category: 'adverb' };
      }
    }

    // Handle POS-dependent disambiguation
    if (category === 'verb') {
      return { lemma: this._lemmatizeVerb(w), category: 'verb' };
    } else if (category === 'noun') {
      return { lemma: this._lemmatizeNoun(w), category: 'noun' };
    }

    // No POS tag - try verb first, then noun
    const verbLemma = this._lemmatizeVerb(w);
    if (verbLemma !== w) {
      return { lemma: verbLemma, category: 'verb' };
    }

    const nounLemma = this._lemmatizeNoun(w);
    if (nounLemma !== w) {
      return { lemma: nounLemma, category: 'noun' };
    }

    // Return original word
    return { lemma: w, category: 'unknown' };
  }

  /**
   * Lemmatize a phrase (lemmatizes the head word)
   * @param {string} phrase - Phrase to lemmatize
   * @returns {string} - Lemmatized phrase
   */
  lemmatizePhrase(phrase) {
    if (!phrase || typeof phrase !== 'string') return '';
    const words = phrase.trim().split(/\s+/);
    if (words.length === 0) return '';

    const lastIdx = words.length - 1;
    const lastWord = words[lastIdx];
    // Skip lemmatization for acronyms (all-uppercase, e.g. DHS, CBP, FBI)
    if (/^[A-Z]{2,}$/.test(lastWord)) {
      words[lastIdx] = lastWord.toLowerCase();
    } else {
      const { lemma } = this.lemmatize(lastWord.toLowerCase());
      words[lastIdx] = lemma;
    }
    return words.join(' ');
  }

  /**
   * Lemmatize a verb form
   * @param {string} word - Verb form
   * @returns {string} - Base form
   * @private
   */
  _lemmatizeVerb(word) {
    // Check irregular verbs first
    if (this.irregularVerbs[word]) {
      return this.irregularVerbs[word];
    }

    const vowels = 'aeiou';

    // Handle -ing forms (VBG)
    if (word.endsWith('ing') && word.length > 4) {
      const stem = word.slice(0, -3);

      // Too short stems are probably base forms like "bring", "sing"
      if (stem.length < 3) return word;

      // Check for doubled consonant: running -> run
      if (
        stem.length > 2 &&
        stem.charAt(stem.length - 1) === stem.charAt(stem.length - 2) &&
        !vowels.includes(stem.charAt(stem.length - 1)) &&
        vowels.includes(stem.charAt(stem.length - 3))
      ) {
        return stem.slice(0, -1);
      }

      // Handle i -> y: studying -> study
      if (stem.endsWith('i')) {
        return stem.slice(0, -1) + 'y';
      }

      // Check for silent 'e': making -> make
      if (this._needsSilentE(stem)) {
        return stem + 'e';
      }

      return stem;
    }

    // Handle -ed forms (VBD, VBN)
    if (word.endsWith('ed') && word.length > 3) {
      // Handle -ied: studied -> study
      if (word.endsWith('ied')) {
        return word.slice(0, -3) + 'y';
      }

      // Handle -ered, -ened patterns: administered -> administer, threatened -> threaten
      if (word.endsWith('ered') && word.length > 5) {
        return word.slice(0, -2); // remove -ed, keep -er
      }
      if (word.endsWith('ened') && word.length > 5) {
        return word.slice(0, -2); // remove -ed, keep -en
      }

      const stem = word.slice(0, -2);

      // Too short
      if (stem.length < 2) return word;

      // Check for doubled consonant: stopped -> stop
      if (
        stem.length > 2 &&
        stem.charAt(stem.length - 1) === stem.charAt(stem.length - 2) &&
        !vowels.includes(stem.charAt(stem.length - 1)) &&
        vowels.includes(stem.charAt(stem.length - 3))
      ) {
        return stem.slice(0, -1);
      }

      // Check for silent 'e': hoped -> hope (stem ends in consonant)
      // But NOT for words ending in -er (like administer)
      if (this._needsSilentE(stem) && !stem.endsWith('er') && !stem.endsWith('en')) {
        return stem + 'e';
      }

      // Just remove -ed
      return stem;
    }

    // Handle 3rd person singular -s/-es (VBZ)
    if (word.endsWith('ies') && word.length > 4) {
      return word.slice(0, -3) + 'y'; // carries -> carry
    }
    if (word.endsWith('es') && word.length > 3) {
      // Check for sibilants: watches -> watch, pushes -> push
      const stem = word.slice(0, -2);
      if (/(ch|sh|ss|x|z)$/.test(stem)) {
        return stem;
      }
      // Otherwise just -s: makes -> make
      return word.slice(0, -1);
    }
    if (word.endsWith('s') && word.length > 2 && !word.endsWith('ss')) {
      return word.slice(0, -1);
    }

    return word;
  }

  /**
   * Lemmatize a noun form
   * @param {string} word - Noun form
   * @returns {string} - Singular form
   * @private
   */
  _lemmatizeNoun(word) {
    // Check invariable nouns
    if (this.invariableNouns.has(word)) {
      return word;
    }

    // Check irregular nouns
    if (this.irregularNouns[word]) {
      return this.irregularNouns[word];
    }

    // Handle -ies plurals: policies -> policy
    if (word.endsWith('ies') && word.length > 4) {
      return word.slice(0, -3) + 'y';
    }

    // Handle -ves plurals: leaves -> leaf
    if (word.endsWith('ves') && word.length > 4) {
      const stem = word.slice(0, -3);
      // Check if original ends in -f or -fe
      // leaves -> leaf, knives -> knife
      if (['lea', 'li', 'loa', 'shea', 'thie', 'wi', 'wol', 'kni', 'hal', 'shel', 'sel', 'cal'].some(s => stem.endsWith(s))) {
        return stem + 'f';
      }
      return stem + 'fe';
    }

    // Handle -es plurals after sibilants: boxes -> box, watches -> watch
    if (word.endsWith('es') && word.length > 3) {
      const stem = word.slice(0, -2);
      if (/(s|x|z|ch|sh)$/.test(stem)) {
        return stem;
      }
    }

    // Handle regular -s plurals: cats -> cat
    if (word.endsWith('s') && word.length > 2 && !word.endsWith('ss')) {
      return word.slice(0, -1);
    }

    return word;
  }

  /**
   * Check if a stem needs silent 'e' restoration
   * @param {string} stem - Word stem
   * @returns {boolean} - True if silent 'e' should be added
   * @private
   */
  _needsSilentE(stem) {
    if (stem.length < 2) return false;

    const vowels = 'aeiou';
    const lastChar = stem.slice(-1);
    const secondLast = stem.slice(-2, -1);
    const thirdLast = stem.length > 2 ? stem.slice(-3, -2) : '';

    // CVC pattern where C is not w, x, y
    if (
      !vowels.includes(lastChar) &&       // ends in consonant
      vowels.includes(secondLast) &&       // preceded by vowel
      thirdLast && !vowels.includes(thirdLast) &&  // preceded by consonant
      !['w', 'x', 'y'].includes(lastChar)  // not w, x, y
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get the base form regardless of POS (convenience method)
   * @param {string} word - Word to lemmatize
   * @returns {string} - Lemma
   */
  getBaseForm(word) {
    return this.lemmatize(word).lemma;
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Lemmatizer;
}
if (typeof window !== 'undefined') {
  window.Lemmatizer = Lemmatizer;
}
