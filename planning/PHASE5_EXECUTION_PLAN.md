# Phase 5: NLP Foundation Upgrade - Execution Plan

**Version:** 1.0.0
**Created:** 2026-01-23
**Status:** Planning Complete
**Goal:** Remove Compromise bottleneck, enable ambiguity detection

---

## Executive Summary

Phase 5 upgrades TagTeam's NLP foundation to enable future ambiguity preservation (Phase 6). The key deliverables are:

1. **5.0** - Evaluate alternative NLP libraries (decision gate)
2. **5.1** - Integrate POSTaggerGraph features from archive
3. **5.2** - Reduce Compromise dependency to sentence boundaries only
4. **5.3** - Build ambiguity detection infrastructure

**Bundle Size Budget:** +200KB max (target: 5.0MB total from 4.8MB)

---

## Phase 5.0: NLP Library Evaluation

### Objective
Evaluate whether existing NLP libraries can replace Compromise before building custom solutions.

### Candidate Libraries

| Library | Bundle Size | Browser Support | Key Features |
|---------|-------------|-----------------|--------------|
| **Wink NLP** | +600KB | Yes | Better tokenization, NER, sentiment |
| **Natural** | +400KB | Partial (needs shim) | Tokenizers, stemmers, classifiers |
| **nlp.js** | +800KB | Yes | Multi-language, entities, sentiment |
| **Compromise** (current) | ~345KB | Yes | Verbs, nouns, basic NLP |

### Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Dependency parsing | 30% | Can identify Subject-Verb-Object relations |
| Browser compatibility | 25% | Runs in browser without bundler magic |
| Bundle size | 20% | Acceptable overhead for browser-first |
| Verb phrase extraction | 15% | Better than current Compromise usage |
| Maintenance/Community | 10% | Active development, good docs |

### Acceptance Criteria

- [ ] AC-5.0.1: Evaluation document created at `docs/research/nlp-library-evaluation.md`
- [ ] AC-5.0.2: Each candidate tested with 10 sample sentences from IEE corpus
- [ ] AC-5.0.3: Bundle size measured for each option
- [ ] AC-5.0.4: Browser compatibility verified (Chrome, Firefox, Safari)
- [ ] AC-5.0.5: Decision documented with rationale
- [ ] AC-5.0.6: If no library meets criteria, proceed with custom solution (5.1-5.3)

### Test Plan

```javascript
// tests/research/nlp-library-eval.test.js

const TEST_SENTENCES = [
  "The doctor must allocate the ventilator",
  "The committee should review the proposal",
  "She didn't tell him about the diagnosis",
  "The organization hired a new administrator",
  "I am questioning whether to proceed"
];

// Test each library for:
// 1. Verb extraction accuracy
// 2. Subject identification
// 3. Object identification
// 4. Negation detection
// 5. Modal detection
```

### Deliverables

1. `docs/research/nlp-library-evaluation.md` - Decision document
2. `tests/research/nlp-library-eval.test.js` - Evaluation test suite
3. GO/NO-GO decision for custom NLP development

### Effort Estimate
- **Duration:** 2-3 days
- **Complexity:** Low
- **Risk:** Low (evaluation only, no production code)

---

## Phase 5.1: Revive POSTaggerGraph.js

### Objective
Integrate advanced features from archived POSTaggerGraph into current pipeline.

### Current State Analysis

**Archive Location:** `archive/POS Graph POC/js/`

**Features to Integrate:**

| Feature | Archive File | Target Location | Priority |
|---------|--------------|-----------------|----------|
| Contraction expansion | POSTaggerGraph.js | src/core/ContractionExpander.js | High |
| Enhanced lemmatizer | POSTaggerGraph.js | src/core/Lemmatizer.js | High |
| Quote state tracking | POSTaggerGraph.js | src/core/QuoteTracker.js | Medium |
| Contextual rules (8) | POSTaggerGraph.js | src/core/POSTagger.js | Medium |

### Contraction Dictionary (46+ entries)

```javascript
const CONTRACTIONS = {
  // Negations
  "don't": "do not", "doesn't": "does not", "didn't": "did not",
  "won't": "will not", "wouldn't": "would not", "couldn't": "could not",
  "shouldn't": "should not", "can't": "cannot", "mustn't": "must not",

  // Pronouns
  "I'm": "I am", "I've": "I have", "I'll": "I will", "I'd": "I would",
  "you're": "you are", "you've": "you have", "you'll": "you will",
  "he's": "he is", "she's": "she is", "it's": "it is",
  "we're": "we are", "we've": "we have", "we'll": "we will",
  "they're": "they are", "they've": "they have", "they'll": "they will",

  // Misc
  "that's": "that is", "there's": "there is", "here's": "here is",
  "what's": "what is", "who's": "who is", "let's": "let us"
};
```

### Acceptance Criteria

- [ ] AC-5.1.1: ContractionExpander handles all 46+ contractions
- [ ] AC-5.1.2: Lemmatizer reduces verbs to base form correctly
- [ ] AC-5.1.3: Quote state tracking prevents false positives in quoted text
- [ ] AC-5.1.4: No regression in existing POS tagging accuracy
- [ ] AC-5.1.5: Bundle size increase < 20KB
- [ ] AC-5.1.6: All 290+ existing tests still pass

### Test Plan

```javascript
// tests/unit/contraction-expander.test.js

describe('ContractionExpander', () => {
  describe('negation contractions', () => {
    it('expands "don\'t" to "do not"', () => {
      expect(expand("I don't know")).toBe("I do not know");
    });

    it('preserves case for sentence start', () => {
      expect(expand("Don't go")).toBe("Do not go");
    });

    it('handles multiple contractions', () => {
      expect(expand("I can't and won't do it"))
        .toBe("I cannot and will not do it");
    });
  });

  describe('pronoun contractions', () => {
    it('expands "I\'m" to "I am"', () => {
      expect(expand("I'm happy")).toBe("I am happy");
    });

    it('handles ambiguous "he\'s" (is vs has)', () => {
      // "he's going" → "he is going"
      // "he's gone" → "he has gone" (past participle context)
      expect(expand("he's going")).toBe("he is going");
      expect(expand("he's gone")).toBe("he has gone");
    });
  });
});

// tests/unit/lemmatizer.test.js

describe('Lemmatizer', () => {
  describe('verb lemmatization', () => {
    it('handles regular past tense', () => {
      expect(lemmatize('walked', 'VBD')).toBe('walk');
      expect(lemmatize('talked', 'VBD')).toBe('talk');
    });

    it('handles irregular verbs', () => {
      expect(lemmatize('went', 'VBD')).toBe('go');
      expect(lemmatize('was', 'VBD')).toBe('be');
      expect(lemmatize('had', 'VBD')).toBe('have');
    });

    it('handles -ing forms', () => {
      expect(lemmatize('running', 'VBG')).toBe('run');
      expect(lemmatize('making', 'VBG')).toBe('make');
    });

    it('handles third person singular', () => {
      expect(lemmatize('goes', 'VBZ')).toBe('go');
      expect(lemmatize('has', 'VBZ')).toBe('have');
    });
  });
});
```

### Implementation Plan

1. **Extract** ContractionExpander from archive (1 day)
2. **Extract** Lemmatizer from archive (1 day)
3. **Integrate** into SemanticRoleExtractor pipeline (0.5 days)
4. **Update** ActExtractor to use lemmatized verbs (0.5 days)
5. **Test** with existing corpus (1 day)

### Deliverables

1. `src/core/ContractionExpander.js` - Contraction handling module
2. `src/core/Lemmatizer.js` - Verb/noun lemmatization
3. `src/core/QuoteTracker.js` - Quote state tracking (optional)
4. Updated `src/core/POSTagger.js` - Enhanced with contextual rules
5. `tests/unit/contraction-expander.test.js`
6. `tests/unit/lemmatizer.test.js`

### Effort Estimate
- **Duration:** 4-5 days
- **Complexity:** Low (code exists, needs extraction)
- **Risk:** Low (additive changes, existing tests validate)

---

## Phase 5.2: Reduce Compromise Dependency

### Objective
Minimize Compromise usage to sentence boundary detection only, replacing verb/noun extraction with custom modules.

### Current Compromise Usage

| File | Method | Purpose | Replacement |
|------|--------|---------|-------------|
| ActExtractor.js | `nlp().verbs()` | Verb phrase extraction | VerbPhraseExtractor.js |
| EntityExtractor.js | `nlp().nouns()` | Noun phrase extraction | NounPhraseExtractor.js |
| PatternMatcher.js | `nlp().lemmatize()` | Lemmatization | Lemmatizer.js (5.1) |
| build.js | bundled | Full library | Sentence splitter only |

### Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Current Pipeline                          │
│                                                              │
│  text → Compromise → verbs()/nouns() → Extraction           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Target Pipeline                           │
│                                                              │
│  text → Compromise → sentences only                          │
│           ↓                                                  │
│       Tokenizer (lexicon-based)                             │
│           ↓                                                  │
│       POSTagger (enhanced)                                   │
│           ↓                                                  │
│  ┌────────────────┬────────────────┐                        │
│  │ VerbPhraseExtractor │ NounPhraseExtractor │              │
│  └────────────────┴────────────────┘                        │
│           ↓                                                  │
│       Extraction (EntityExtractor, ActExtractor)            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### VerbPhraseExtractor Specification

```javascript
/**
 * VerbPhraseExtractor
 *
 * Extracts verb phrases from POS-tagged tokens without Compromise.
 *
 * Input: [["The", "DT"], ["doctor", "NN"], ["must", "MD"], ["allocate", "VB"], ...]
 * Output: [
 *   {
 *     verb: "allocate",
 *     lemma: "allocate",
 *     tense: "present",
 *     modal: "must",
 *     negated: false,
 *     auxiliary: null,
 *     startIndex: 2,
 *     endIndex: 3,
 *     sourceText: "must allocate"
 *   }
 * ]
 */

class VerbPhraseExtractor {
  constructor(lemmatizer) {
    this.lemmatizer = lemmatizer;
  }

  extract(taggedTokens) {
    const verbPhrases = [];
    // ... implementation
    return verbPhrases;
  }

  // Pattern: [MD]? [RB]? [VB|VBD|VBG|VBN|VBP|VBZ]
  _findVerbSequences(tokens) { /* ... */ }

  // Detect negation: "not", "n't", "never"
  _detectNegation(tokens, verbIndex) { /* ... */ }

  // Extract modal: must, should, may, might, can, could, will, would
  _extractModal(tokens, verbIndex) { /* ... */ }
}
```

### NounPhraseExtractor Specification

```javascript
/**
 * NounPhraseExtractor
 *
 * Extracts noun phrases from POS-tagged tokens without Compromise.
 *
 * Input: [["The", "DT"], ["critically", "RB"], ["ill", "JJ"], ["patient", "NN"], ...]
 * Output: [
 *   {
 *     head: "patient",
 *     determiner: "The",
 *     modifiers: ["critically", "ill"],
 *     fullText: "The critically ill patient",
 *     startIndex: 0,
 *     endIndex: 3,
 *     definiteness: "definite",
 *     number: "singular"
 *   }
 * ]
 */

class NounPhraseExtractor {
  extract(taggedTokens) {
    const nounPhrases = [];
    // ... implementation
    return nounPhrases;
  }

  // Pattern: [DT]? [JJ|RB]* [NN|NNS|NNP|NNPS]+
  _findNounSequences(tokens) { /* ... */ }

  // Determine definiteness from determiner
  _classifyDefiniteness(determiner) { /* ... */ }

  // Handle compound nouns: "health care", "ventilator allocation"
  _detectCompounds(tokens, nounIndex) { /* ... */ }
}
```

### Acceptance Criteria

- [ ] AC-5.2.1: VerbPhraseExtractor matches Compromise output for 95%+ of test corpus
- [ ] AC-5.2.2: NounPhraseExtractor matches Compromise output for 95%+ of test corpus
- [ ] AC-5.2.3: Compromise only used for sentence splitting in production
- [ ] AC-5.2.4: Bundle size reduced by 50KB+ (optional Compromise load)
- [ ] AC-5.2.5: Processing speed equal or faster than current
- [ ] AC-5.2.6: All existing tests pass with new extractors

### Test Plan

```javascript
// tests/unit/verb-phrase-extractor.test.js

describe('VerbPhraseExtractor', () => {
  describe('basic verb extraction', () => {
    it('extracts simple present tense', () => {
      const tokens = tag("The doctor allocates resources");
      const vps = extractor.extract(tokens);
      expect(vps[0].verb).toBe("allocates");
      expect(vps[0].lemma).toBe("allocate");
      expect(vps[0].tense).toBe("present");
    });

    it('extracts modal + verb', () => {
      const tokens = tag("The doctor must allocate");
      const vps = extractor.extract(tokens);
      expect(vps[0].modal).toBe("must");
      expect(vps[0].verb).toBe("allocate");
    });

    it('detects negation', () => {
      const tokens = tag("The doctor should not allocate");
      const vps = extractor.extract(tokens);
      expect(vps[0].negated).toBe(true);
    });
  });

  describe('complex verb phrases', () => {
    it('handles auxiliary verbs', () => {
      const tokens = tag("The doctor has been allocating");
      const vps = extractor.extract(tokens);
      expect(vps[0].verb).toBe("allocating");
      expect(vps[0].auxiliary).toContain("has");
      expect(vps[0].auxiliary).toContain("been");
    });

    it('handles passive voice', () => {
      const tokens = tag("The ventilator was allocated");
      const vps = extractor.extract(tokens);
      expect(vps[0].verb).toBe("allocated");
      expect(vps[0].isPassive).toBe(true);
    });
  });
});

// tests/unit/noun-phrase-extractor.test.js

describe('NounPhraseExtractor', () => {
  describe('basic noun phrases', () => {
    it('extracts definite NP', () => {
      const tokens = tag("The doctor examined the patient");
      const nps = extractor.extract(tokens);
      expect(nps[0].head).toBe("doctor");
      expect(nps[0].definiteness).toBe("definite");
    });

    it('extracts indefinite NP', () => {
      const tokens = tag("A doctor examined a patient");
      const nps = extractor.extract(tokens);
      expect(nps[0].definiteness).toBe("indefinite");
    });

    it('extracts modifiers', () => {
      const tokens = tag("The critically ill patient");
      const nps = extractor.extract(tokens);
      expect(nps[0].modifiers).toContain("critically");
      expect(nps[0].modifiers).toContain("ill");
    });
  });

  describe('compound nouns', () => {
    it('handles two-word compounds', () => {
      const tokens = tag("The health care provider");
      const nps = extractor.extract(tokens);
      expect(nps[0].fullText).toContain("health care provider");
    });
  });
});

// tests/integration/compromise-replacement.test.js

describe('Compromise Replacement Validation', () => {
  const IEE_CORPUS = loadCorpus('iee-collaboration/from-iee/test-corpus.json');

  IEE_CORPUS.forEach(({ text, expectedVerbs, expectedNouns }) => {
    it(`matches Compromise output for: "${text.substring(0, 40)}..."`, () => {
      // Compare old (Compromise) vs new (custom) extraction
      const compromiseVerbs = extractWithCompromise(text);
      const customVerbs = extractWithCustom(text);

      expect(customVerbs).toMatchVerbOutput(compromiseVerbs, 0.95);
    });
  });
});
```

### Implementation Plan

1. **Create** Tokenizer module using existing lexicon (2 days)
2. **Create** VerbPhraseExtractor (3 days)
3. **Create** NounPhraseExtractor (3 days)
4. **Update** ActExtractor to use VerbPhraseExtractor (1 day)
5. **Update** EntityExtractor to use NounPhraseExtractor (1 day)
6. **Validate** with comparison tests (2 days)
7. **Optional**: Make Compromise lazy-loadable (1 day)

### Deliverables

1. `src/core/Tokenizer.js` - Lexicon-based tokenizer
2. `src/core/VerbPhraseExtractor.js` - Custom VP extraction
3. `src/core/NounPhraseExtractor.js` - Custom NP extraction
4. Updated `src/graph/ActExtractor.js`
5. Updated `src/graph/EntityExtractor.js`
6. `tests/unit/verb-phrase-extractor.test.js`
7. `tests/unit/noun-phrase-extractor.test.js`
8. `tests/integration/compromise-replacement.test.js`

### Effort Estimate
- **Duration:** 12-14 days
- **Complexity:** Medium-High
- **Risk:** Medium (core extraction logic change)

---

## Phase 5.3: Ambiguity Detection Layer

### Objective
Create infrastructure to detect (not yet preserve) ambiguous cases for future Phase 6 integration.

### Ambiguity Types to Detect

| Type | Detection Signal | Example | Output |
|------|------------------|---------|--------|
| **Noun Process/Continuant** | Nominalization suffix + context | "organization" | `{ type: "noun_category", readings: ["process", "continuant"] }` |
| **Verb Sense** | Multiple selectional matches | "provide care" vs "provide equipment" | `{ type: "verb_sense", readings: ["service", "transfer"] }` |
| **Deontic/Epistemic** | Modal + context | "should" | `{ type: "modal_force", readings: ["obligation", "expectation"] }` |
| **Scope** | Quantifier + negation | "not all" | `{ type: "scope", readings: ["wide", "narrow"] }` |
| **PP Attachment** | PP following NP VP | "with the scalpel" | `{ type: "pp_attachment", readings: ["instrument", "attribute"] }` |

### AmbiguityDetector Specification

```javascript
/**
 * AmbiguityDetector
 *
 * Identifies potentially ambiguous spans in parsed output.
 * Does NOT resolve ambiguity - only flags it for Phase 6 lattice.
 *
 * @param {Object} parseResult - Output from SemanticGraphBuilder
 * @returns {AmbiguityReport} - Structured ambiguity metadata
 */

class AmbiguityDetector {
  constructor(config = {}) {
    this.nominalizationSuffixes = ['-tion', '-ment', '-ing', '-ance', '-ence'];
    this.deonticModals = ['must', 'should', 'shall', 'ought'];
    this.epistemicModals = ['may', 'might', 'could', 'should'];
    this.scopeQuantifiers = ['all', 'every', 'some', 'any', 'no'];
  }

  detect(text, entities, acts, roles) {
    const ambiguities = [];

    // 1. Check nouns for process/continuant ambiguity
    ambiguities.push(...this._detectNounAmbiguity(entities));

    // 2. Check verbs for sense ambiguity
    ambiguities.push(...this._detectVerbSenseAmbiguity(acts));

    // 3. Check modals for deontic/epistemic ambiguity
    ambiguities.push(...this._detectModalAmbiguity(acts));

    // 4. Check for scope ambiguity
    ambiguities.push(...this._detectScopeAmbiguity(text, entities));

    // 5. Check for PP attachment ambiguity
    ambiguities.push(...this._detectPPAttachment(text, entities, acts));

    return new AmbiguityReport(ambiguities);
  }

  _detectNounAmbiguity(entities) {
    return entities
      .filter(e => this._isAmbiguousNominalization(e))
      .map(e => ({
        type: 'noun_category',
        span: e.sourceText,
        nodeId: e['@id'],
        readings: ['process', 'continuant'],
        signals: this._getNounSignals(e),
        defaultReading: this._inferNounDefault(e)
      }));
  }

  _detectModalAmbiguity(acts) {
    return acts
      .filter(a => this._hasAmbiguousModal(a))
      .map(a => ({
        type: 'modal_force',
        span: a.sourceText,
        nodeId: a['@id'],
        modal: a['tagteam:modality'],
        readings: this._getModalReadings(a['tagteam:modality']),
        signals: this._getModalSignals(a),
        defaultReading: this._inferModalDefault(a)
      }));
  }

  // ... other detection methods
}
```

### AmbiguityReport Specification

```javascript
/**
 * AmbiguityReport
 *
 * Structured output for detected ambiguities.
 * Designed for Phase 6 InterpretationLattice integration.
 */

class AmbiguityReport {
  constructor(ambiguities) {
    this.ambiguities = ambiguities;
    this.timestamp = new Date().toISOString();
    this.statistics = this._computeStatistics();
  }

  // Filter by ambiguity type
  getByType(type) {
    return this.ambiguities.filter(a => a.type === type);
  }

  // Filter by severity (number of readings)
  getBySeverity(minReadings = 2) {
    return this.ambiguities.filter(a => a.readings.length >= minReadings);
  }

  // Get ambiguities affecting a specific node
  getForNode(nodeId) {
    return this.ambiguities.filter(a => a.nodeId === nodeId);
  }

  // Check if any critical ambiguities
  hasCriticalAmbiguities() {
    return this.ambiguities.some(a => a.readings.length > 2);
  }

  // Serialize for JSON-LD integration
  toJSONLD() {
    return {
      '@type': 'tagteam:AmbiguityReport',
      'tagteam:ambiguityCount': this.ambiguities.length,
      'tagteam:ambiguities': this.ambiguities.map(a => ({
        '@type': 'tagteam:DetectedAmbiguity',
        'tagteam:ambiguityType': a.type,
        'tagteam:span': a.span,
        'tagteam:affectsNode': { '@id': a.nodeId },
        'tagteam:possibleReadings': a.readings,
        'tagteam:defaultReading': a.defaultReading,
        'tagteam:detectionSignals': a.signals
      }))
    };
  }

  _computeStatistics() {
    const byType = {};
    this.ambiguities.forEach(a => {
      byType[a.type] = (byType[a.type] || 0) + 1;
    });
    return {
      total: this.ambiguities.length,
      byType,
      avgReadings: this.ambiguities.reduce((s, a) => s + a.readings.length, 0) /
                   (this.ambiguities.length || 1)
    };
  }
}
```

### Acceptance Criteria

- [ ] AC-5.3.1: Detects noun process/continuant ambiguity for nominalizations
- [ ] AC-5.3.2: Detects verb sense ambiguity when multiple selectional matches
- [ ] AC-5.3.3: Detects deontic/epistemic ambiguity for "should", "must", etc.
- [ ] AC-5.3.4: Detects scope ambiguity for quantifiers + negation
- [ ] AC-5.3.5: AmbiguityReport serializes to valid JSON-LD
- [ ] AC-5.3.6: SemanticGraphBuilder optionally includes ambiguity metadata
- [ ] AC-5.3.7: Performance: < 10ms additional processing time

### Test Plan

```javascript
// tests/unit/ambiguity-detector.test.js

describe('AmbiguityDetector', () => {
  describe('noun category ambiguity', () => {
    it('flags "organization" as ambiguous', () => {
      const graph = buildGraph("The organization hired staff");
      const report = detector.detect(graph);

      const orgAmbiguity = report.getByType('noun_category')
        .find(a => a.span.includes('organization'));

      expect(orgAmbiguity).toBeDefined();
      expect(orgAmbiguity.readings).toContain('continuant');
      expect(orgAmbiguity.readings).toContain('process');
    });

    it('does not flag unambiguous nouns', () => {
      const graph = buildGraph("The doctor examined the patient");
      const report = detector.detect(graph);

      expect(report.getByType('noun_category')).toHaveLength(0);
    });
  });

  describe('modal ambiguity', () => {
    it('flags "should" as deontic/epistemic ambiguous', () => {
      const graph = buildGraph("The doctor should prioritize");
      const report = detector.detect(graph);

      const modalAmbiguity = report.getByType('modal_force')[0];

      expect(modalAmbiguity.modal).toBe('should');
      expect(modalAmbiguity.readings).toContain('obligation');
      expect(modalAmbiguity.readings).toContain('expectation');
    });

    it('flags "must" with deontic + epistemic readings', () => {
      const graph = buildGraph("The patient must have arrived");
      const report = detector.detect(graph);

      const modalAmbiguity = report.getByType('modal_force')[0];
      expect(modalAmbiguity.readings).toContain('obligation');
      expect(modalAmbiguity.readings).toContain('inference');
    });
  });

  describe('scope ambiguity', () => {
    it('flags "not all" scope ambiguity', () => {
      const graph = buildGraph("Not all patients received treatment");
      const report = detector.detect(graph);

      const scopeAmbiguity = report.getByType('scope')[0];
      expect(scopeAmbiguity.readings).toContain('wide'); // ¬∀x
      expect(scopeAmbiguity.readings).toContain('narrow'); // ∀x¬
    });
  });
});

// tests/unit/ambiguity-report.test.js

describe('AmbiguityReport', () => {
  it('serializes to valid JSON-LD', () => {
    const report = new AmbiguityReport([
      { type: 'modal_force', span: 'should', readings: ['obligation', 'expectation'] }
    ]);

    const jsonld = report.toJSONLD();

    expect(jsonld['@type']).toBe('tagteam:AmbiguityReport');
    expect(jsonld['tagteam:ambiguities'][0]['@type']).toBe('tagteam:DetectedAmbiguity');
  });

  it('computes statistics correctly', () => {
    const report = new AmbiguityReport([
      { type: 'modal_force', readings: ['a', 'b'] },
      { type: 'modal_force', readings: ['a', 'b', 'c'] },
      { type: 'noun_category', readings: ['x', 'y'] }
    ]);

    expect(report.statistics.total).toBe(3);
    expect(report.statistics.byType.modal_force).toBe(2);
    expect(report.statistics.avgReadings).toBeCloseTo(2.33, 1);
  });
});

// tests/integration/ambiguity-integration.test.js

describe('Ambiguity Integration', () => {
  it('includes ambiguity report in graph output', () => {
    const builder = new SemanticGraphBuilder({ detectAmbiguity: true });
    const result = builder.build("The organization should allocate resources");

    expect(result._ambiguityReport).toBeDefined();
    expect(result._ambiguityReport.statistics.total).toBeGreaterThan(0);
  });

  it('does not affect default graph output', () => {
    const builder = new SemanticGraphBuilder();
    const result = builder.build("The doctor should treat the patient");

    expect(result._ambiguityReport).toBeUndefined();
    expect(result['@graph']).toBeDefined();
  });
});
```

### Implementation Plan

1. **Create** AmbiguityDetector class (3 days)
2. **Create** AmbiguityReport class (1 day)
3. **Implement** noun category detection (2 days)
4. **Implement** modal ambiguity detection (2 days)
5. **Implement** scope ambiguity detection (2 days)
6. **Implement** verb sense ambiguity detection (2 days)
7. **Integrate** with SemanticGraphBuilder (1 day)
8. **Add** JSON-LD vocabulary for ambiguity (0.5 days)
9. **Test** and validate (2 days)

### Deliverables

1. `src/graph/AmbiguityDetector.js` - Detection engine
2. `src/graph/AmbiguityReport.js` - Structured output
3. Updated `src/graph/SemanticGraphBuilder.js` - Optional ambiguity detection
4. Updated `src/graph/JSONLDSerializer.js` - Ambiguity vocabulary
5. `tests/unit/ambiguity-detector.test.js`
6. `tests/unit/ambiguity-report.test.js`
7. `tests/integration/ambiguity-integration.test.js`

### Effort Estimate
- **Duration:** 14-16 days
- **Complexity:** Medium
- **Risk:** Low (detection only, no behavior change)

---

## Phase 5 Summary

### Total Effort Estimate

| Phase | Duration | Complexity | Dependencies |
|-------|----------|------------|--------------|
| 5.0 NLP Evaluation | 2-3 days | Low | None |
| 5.1 POSTaggerGraph | 4-5 days | Low | 5.0 decision |
| 5.2 Reduce Compromise | 12-14 days | Medium-High | 5.1 |
| 5.3 Ambiguity Detection | 14-16 days | Medium | 5.2 (partial) |
| **Total** | **32-38 days** | - | - |

### Milestone Schedule

```
Week 1: Phase 5.0 - NLP Library Evaluation
        └─ Decision gate: custom vs library

Week 2: Phase 5.1 - POSTaggerGraph Integration
        └─ Contraction expansion, lemmatization

Weeks 3-4: Phase 5.2 - Custom Extractors
        └─ VerbPhraseExtractor, NounPhraseExtractor

Weeks 5-6: Phase 5.3 - Ambiguity Detection
        └─ AmbiguityDetector, AmbiguityReport

Week 7: Integration Testing & Documentation
        └─ Full regression suite, docs update
```

### Success Criteria (Phase 5 Complete)

- [ ] **SC-1**: NLP library decision documented with rationale
- [ ] **SC-2**: Contraction expansion working for 46+ contractions
- [ ] **SC-3**: Custom verb extraction matches Compromise 95%+
- [ ] **SC-4**: Custom noun extraction matches Compromise 95%+
- [ ] **SC-5**: Ambiguity detection identifies 4+ ambiguity types
- [ ] **SC-6**: All 290+ existing tests still pass
- [ ] **SC-7**: Bundle size within budget (+200KB max)
- [ ] **SC-8**: No performance regression (< 50ms typical parse)

### Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Custom extractors don't match Compromise quality | Medium | High | Extensive comparison testing, keep Compromise as fallback |
| Bundle size exceeds budget | Low | Medium | Tree-shake, lazy load, measure early |
| Ambiguity detection false positives | Medium | Low | Tune thresholds, add confidence scores |
| Integration breaks existing tests | Low | High | Run full suite after each change |

### Dependencies for Phase 6

Phase 5 enables Phase 6 (Interpretation Lattice) by providing:

1. **AmbiguityReport** - Input for lattice construction
2. **Custom extractors** - Better control over extraction process
3. **Lemmatizer** - Normalized verb forms for selectional matching
4. **Detection infrastructure** - Foundation for lattice nodes

---

## Appendix: File Reference

### Files to Create

```
src/core/
├── ContractionExpander.js    # 5.1
├── Lemmatizer.js             # 5.1
├── QuoteTracker.js           # 5.1 (optional)
├── Tokenizer.js              # 5.2
├── VerbPhraseExtractor.js    # 5.2
└── NounPhraseExtractor.js    # 5.2

src/graph/
├── AmbiguityDetector.js      # 5.3
└── AmbiguityReport.js        # 5.3

docs/research/
└── nlp-library-evaluation.md # 5.0

tests/unit/
├── contraction-expander.test.js    # 5.1
├── lemmatizer.test.js              # 5.1
├── verb-phrase-extractor.test.js   # 5.2
├── noun-phrase-extractor.test.js   # 5.2
├── ambiguity-detector.test.js      # 5.3
└── ambiguity-report.test.js        # 5.3

tests/integration/
├── compromise-replacement.test.js  # 5.2
└── ambiguity-integration.test.js   # 5.3

tests/research/
└── nlp-library-eval.test.js        # 5.0
```

### Files to Modify

```
src/core/POSTagger.js           # 5.1 - Add contextual rules
src/graph/ActExtractor.js       # 5.2 - Use VerbPhraseExtractor
src/graph/EntityExtractor.js    # 5.2 - Use NounPhraseExtractor
src/graph/SemanticGraphBuilder.js  # 5.3 - Add ambiguity option
src/graph/JSONLDSerializer.js   # 5.3 - Add ambiguity vocabulary
scripts/build.js                # 5.2 - Optional Compromise
scripts/build-separated.js      # 5.2 - Update for new modules
```

### Archive Files to Reference

```
archive/POS Graph POC/js/
├── POSTaggerGraph.js    # Contraction dict, lemmatizer, rules
├── lexicon.js           # Extended lexicon (reference only)
└── [other files]        # May contain useful patterns
```
