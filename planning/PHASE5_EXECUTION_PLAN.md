# Phase 5: NLP Foundation Upgrade - Execution Plan

**Version:** 1.1.0
**Created:** 2026-01-23
**Updated:** 2026-01-23
**Status:** Planning Complete (Critique Review Integrated)
**Goal:** Remove Compromise bottleneck, enable ambiguity detection

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2026-01-23 | Integrated critique review: added selectional constraint tests, modal force disambiguation tests, nominalization tests, scope/negation tests, lemmatization edge-case tests, confidence scoring in AmbiguityReport |
| 1.0.0 | 2026-01-23 | Initial execution plan |

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
- [ ] AC-5.1.7: Lemmatizer handles POS-dependent forms ("saw" VBD→"see", NN→"saw")
- [ ] AC-5.1.8: Lemmatizer handles irregular verbs (went→go, was→be, etc.)
- [ ] AC-5.1.9: Lemmatizer handles irregular noun plurals (children→child, criteria→criterion)
- [ ] AC-5.1.10: Lemmatizer handles consonant doubling/e-deletion rules correctly

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
| **Selectional Violation** | Subject/Object category mismatch | "The rock hired" | `{ type: "selectional_violation", signal: "inanimate_agent" }` |

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
    ambiguities.push(...this._detectModalAmbiguity(acts, entities));

    // 4. Check for scope ambiguity (quantifiers + negation)
    ambiguities.push(...this._detectScopeAmbiguity(text, entities, acts));

    // 5. Check for PP attachment ambiguity
    ambiguities.push(...this._detectPPAttachment(text, entities, acts));

    // 6. Check for selectional constraint violations
    ambiguities.push(...this._detectSelectionalViolations(entities, acts, roles));

    return new AmbiguityReport(ambiguities);
  }

  // Detect violations of selectional constraints (categorical restrictions)
  _detectSelectionalViolations(entities, acts, roles) {
    return acts
      .map(act => this._checkActSelectionalConstraints(act, entities, roles))
      .filter(v => v !== null);
  }

  _checkActSelectionalConstraints(act, entities, roles) {
    const agent = this._findAgentFor(act, roles);
    const patient = this._findPatientFor(act, roles);

    // Check: inanimate cannot be agent of Intentional Act
    if (agent && this._isInanimate(agent) && this._isIntentionalAct(act)) {
      return {
        type: 'selectional_violation',
        signal: 'inanimate_agent',
        subject: agent.label,
        verb: act.verb,
        nodeId: act['@id'],
        confidence: 'high',
        ontologyConstraint: 'bfo:Agent requires bfo:MaterialEntity with cco:has_function'
      };
    }

    // Check: abstract cannot perform physical acts
    if (agent && this._isAbstract(agent) && this._isPhysicalAct(act)) {
      return {
        type: 'selectional_violation',
        signal: 'abstract_physical_actor',
        subject: agent.label,
        verb: act.verb,
        nodeId: act['@id'],
        confidence: 'high'
      };
    }

    return null;
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

  // Get confidence level for an ambiguity
  // Based on selectional preference strength and contextual signals
  getConfidence(ambiguity) {
    // High confidence: strong selectional constraints or clear context
    // Low confidence: weak preferences or missing context
    return ambiguity.confidence || this._computeConfidence(ambiguity);
  }

  _computeConfidence(ambiguity) {
    const { type, signals = [] } = ambiguity;

    // Selectional violations are high confidence (categorical mismatch)
    if (type === 'selectional_violation') return 'high';

    // Strong contextual signals increase confidence
    if (signals.length >= 2) return 'high';

    // Single signal or preference-based = lower confidence
    return signals.length === 1 ? 'medium' : 'low';
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
        'tagteam:detectionSignals': a.signals,
        'tagteam:confidence': this.getConfidence(a)
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
- [ ] AC-5.3.8: Detects selectional constraint violations (inanimate agent with intentional act)
- [ ] AC-5.3.9: AmbiguityReport includes confidence scoring (high/medium/low)
- [ ] AC-5.3.10: Modal force disambiguation considers aspect and subject type signals
- [ ] AC-5.3.11: Nominalization detection uses context signals (of-complement, duration predicate)
- [ ] AC-5.3.12: Scope detection handles multiple quantifiers and modal-negation interactions

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

### Extended Test Coverage (Per Critique Review)

The following test categories address gaps identified in the Phase 5 critique review.

#### A. Selectional Constraint Tests

Selectional constraints enforce categorical restrictions on Subject-Verb-Object relations based on BFO/CCO ontology types. When violated, these indicate either metaphorical usage, errors, or require special handling.

```javascript
// tests/unit/selectional-constraint.test.js

describe('Selectional Constraint Detection', () => {
  describe('categorical violations (restrictions)', () => {
    it('flags inanimate subject with intentional act', () => {
      // "The rock hired an administrator" - rocks cannot perform Intentional Acts
      const graph = buildGraph("The rock hired an administrator");
      const report = detector.detect(graph);

      const violation = report.getByType('selectional_violation')[0];

      expect(violation).toBeDefined();
      expect(violation.signal).toBe('inanimate_agent');
      expect(violation.subject).toBe('rock');
      expect(violation.verb).toBe('hired');
      expect(violation.confidence).toBe('high'); // categorical = high confidence
      expect(violation.ontologyConstraint).toBe('bfo:Agent requires bfo:MaterialEntity with cco:has_function');
    });

    it('flags abstract subject with physical act', () => {
      // "Justice lifted the box" - abstract entities cannot perform physical acts
      const graph = buildGraph("Justice lifted the box");
      const report = detector.detect(graph);

      const violation = report.getByType('selectional_violation')[0];
      expect(violation.signal).toBe('abstract_physical_actor');
      expect(violation.confidence).toBe('high');
    });

    it('flags animate object with creation verb expecting artifact', () => {
      // "She built a doctor" - 'build' expects Artifact, not Person
      const graph = buildGraph("She built a doctor");
      const report = detector.detect(graph);

      const violation = report.getByType('selectional_violation')[0];
      expect(violation.signal).toBe('animate_artifact_object');
    });
  });

  describe('selectional preferences (soft constraints)', () => {
    it('allows but notes unusual agent-verb combinations', () => {
      // "The committee decided" - valid but 'committee' is collective
      const graph = buildGraph("The committee decided quickly");
      const report = detector.detect(graph);

      // Should NOT be a violation, but may note collective agent
      const violations = report.getByType('selectional_violation');
      expect(violations.length).toBe(0);

      const preferences = report.getByType('selectional_preference');
      expect(preferences[0]?.signal).toBe('collective_agent');
      expect(preferences[0]?.confidence).toBe('low');
    });

    it('handles metonymy gracefully', () => {
      // "The White House announced" - metonymy (place for institution)
      const graph = buildGraph("The White House announced the policy");
      const report = detector.detect(graph);

      // Should flag as potential metonymy, not hard violation
      const metonymy = report.getByType('potential_metonymy');
      expect(metonymy[0]?.signal).toBe('location_as_agent');
      expect(metonymy[0]?.suggestedReading).toBe('institution');
    });
  });

  describe('BFO/CCO ontology alignment', () => {
    it('validates agent against cco:Agent requirements', () => {
      const graph = buildGraph("The surgeon performed the operation");
      const report = detector.detect(graph);

      // Valid: surgeon (Person) can be Agent of IntentionalAct
      expect(report.getByType('selectional_violation')).toHaveLength(0);
    });

    it('validates patient/theme against act type', () => {
      const graph = buildGraph("The doctor treated the disease");
      const report = detector.detect(graph);

      // Valid: disease (Disorder) can be object of treating
      expect(report.getByType('selectional_violation')).toHaveLength(0);
    });
  });
});
```

#### B. Modal Force Disambiguation Tests

Modal verbs exhibit systematic ambiguity between deontic (obligation/permission) and epistemic (inference/possibility) readings. Context determines which reading applies.

```javascript
// tests/unit/modal-force-disambiguation.test.js

describe('Modal Force Disambiguation', () => {
  describe('"should" deontic vs epistemic', () => {
    it('detects deontic reading with agent-oriented context', () => {
      // "The doctor should inform the patient" - obligation
      const graph = buildGraph("The doctor should inform the patient");
      const report = detector.detect(graph);

      const modal = report.getByType('modal_force')[0];
      expect(modal.modal).toBe('should');
      expect(modal.readings).toContain('obligation');
      expect(modal.readings).toContain('expectation');
      expect(modal.defaultReading).toBe('obligation'); // agent + intentional act
      expect(modal.signals).toContain('agent_subject');
      expect(modal.signals).toContain('intentional_act');
    });

    it('detects epistemic reading with non-agent subject', () => {
      // "The patient should be in the room" - expectation/inference
      const graph = buildGraph("The patient should be in the room");
      const report = detector.detect(graph);

      const modal = report.getByType('modal_force')[0];
      expect(modal.defaultReading).toBe('expectation');
      expect(modal.signals).toContain('stative_verb');
      expect(modal.signals).toContain('locative_predicate');
    });

    it('detects epistemic reading with perfect aspect', () => {
      // "The results should have arrived" - inference about past
      const graph = buildGraph("The results should have arrived");
      const report = detector.detect(graph);

      const modal = report.getByType('modal_force')[0];
      expect(modal.defaultReading).toBe('expectation');
      expect(modal.signals).toContain('perfect_aspect');
    });
  });

  describe('"must" deontic vs epistemic', () => {
    it('detects deontic "must" with imperative context', () => {
      // "You must submit the form" - obligation
      const graph = buildGraph("You must submit the form");
      const report = detector.detect(graph);

      const modal = report.getByType('modal_force')[0];
      expect(modal.defaultReading).toBe('obligation');
      expect(modal.signals).toContain('second_person_subject');
    });

    it('detects epistemic "must" with evidential context', () => {
      // "The patient must have left" - inference
      const graph = buildGraph("The patient must have left already");
      const report = detector.detect(graph);

      const modal = report.getByType('modal_force')[0];
      expect(modal.defaultReading).toBe('inference');
      expect(modal.signals).toContain('perfect_aspect');
      expect(modal.signals).toContain('temporal_adverb');
    });
  });

  describe('"may/might" permission vs possibility', () => {
    it('detects permission with agent subject and request context', () => {
      // "You may leave early" - permission
      const graph = buildGraph("You may leave early");
      const report = detector.detect(graph);

      const modal = report.getByType('modal_force')[0];
      expect(modal.readings).toContain('permission');
      expect(modal.readings).toContain('possibility');
      expect(modal.defaultReading).toBe('permission');
    });

    it('detects possibility with inanimate subject', () => {
      // "The treatment may cause side effects" - possibility
      const graph = buildGraph("The treatment may cause side effects");
      const report = detector.detect(graph);

      const modal = report.getByType('modal_force')[0];
      expect(modal.defaultReading).toBe('possibility');
      expect(modal.signals).toContain('inanimate_subject');
    });
  });
});
```

#### C. Nominalization (Process vs Continuant) Tests

Nominalizations (-tion, -ment, -ing, etc.) are systematically ambiguous between process readings (bfo:Process) and continuant readings (bfo:Continuant - typically organization/artifact).

```javascript
// tests/unit/nominalization-ambiguity.test.js

describe('Nominalization Ambiguity Detection', () => {
  describe('-tion nominalizations', () => {
    it('flags "organization" as ambiguous with context signals', () => {
      // "The organization was difficult" - ambiguous
      const graph = buildGraph("The organization was difficult");
      const report = detector.detect(graph);

      const nominal = report.getByType('noun_category')[0];
      expect(nominal.span).toContain('organization');
      expect(nominal.readings).toContain('process');    // act of organizing
      expect(nominal.readings).toContain('continuant'); // the entity
      expect(nominal.signals).toContain('predicate_adjective');
      expect(nominal.defaultReading).toBe('process'); // "difficult" suggests process
    });

    it('resolves "organization" to continuant with agent context', () => {
      // "The organization hired staff" - entity reading
      const graph = buildGraph("The organization hired staff");
      const report = detector.detect(graph);

      const nominal = report.getByType('noun_category')[0];
      expect(nominal.defaultReading).toBe('continuant');
      expect(nominal.signals).toContain('subject_of_intentional_act');
      expect(nominal.confidence).toBe('high');
    });

    it('resolves "organization" to process with temporal context', () => {
      // "The organization of files took hours" - process reading
      const graph = buildGraph("The organization of files took hours");
      const report = detector.detect(graph);

      const nominal = report.getByType('noun_category')[0];
      expect(nominal.defaultReading).toBe('process');
      expect(nominal.signals).toContain('of_complement');
      expect(nominal.signals).toContain('duration_predicate');
    });

    it('flags "administration" with dual readings', () => {
      const graph = buildGraph("The administration changed policy");
      const report = detector.detect(graph);

      const nominal = report.getByType('noun_category')[0];
      expect(nominal.readings).toEqual(['process', 'continuant']);
      expect(nominal.defaultReading).toBe('continuant'); // subject of 'changed'
    });
  });

  describe('-ment nominalizations', () => {
    it('flags "treatment" as ambiguous', () => {
      const graph = buildGraph("The treatment was effective");
      const report = detector.detect(graph);

      const nominal = report.getByType('noun_category')[0];
      expect(nominal.readings).toContain('process');    // act of treating
      expect(nominal.readings).toContain('continuant'); // the therapy/plan
    });

    it('resolves "treatment" to process with duration', () => {
      const graph = buildGraph("The treatment lasted three months");
      const report = detector.detect(graph);

      const nominal = report.getByType('noun_category')[0];
      expect(nominal.defaultReading).toBe('process');
      expect(nominal.signals).toContain('duration_verb');
    });
  });

  describe('-ing nominalizations', () => {
    it('flags "building" as ambiguous', () => {
      // "The building collapsed" vs "The building of trust takes time"
      const graph = buildGraph("The building was impressive");
      const report = detector.detect(graph);

      const nominal = report.getByType('noun_category')[0];
      expect(nominal.readings).toContain('process');    // act of building
      expect(nominal.readings).toContain('continuant'); // the structure
    });

    it('uses determiner type to disambiguate', () => {
      // "This building" = continuant, "The building of..." = process
      const graph1 = buildGraph("This building is tall");
      const graph2 = buildGraph("The building of relationships requires patience");

      const report1 = detector.detect(graph1);
      const report2 = detector.detect(graph2);

      expect(report1.getByType('noun_category')[0]?.defaultReading).toBe('continuant');
      expect(report2.getByType('noun_category')[0]?.defaultReading).toBe('process');
    });
  });
});
```

#### D. Scope & Negation Intersection Tests

Quantifier-negation interactions create scope ambiguities where operator precedence affects meaning.

```javascript
// tests/unit/scope-negation.test.js

describe('Scope & Negation Ambiguity', () => {
  describe('universal quantifier + negation', () => {
    it('flags "All doctors did not attend" as scope ambiguous', () => {
      // Wide scope: ¬∀x (not all attended - some did)
      // Narrow scope: ∀x¬ (all didn't attend - none did)
      const graph = buildGraph("All doctors did not attend the meeting");
      const report = detector.detect(graph);

      const scope = report.getByType('scope')[0];
      expect(scope).toBeDefined();
      expect(scope.quantifier).toBe('all');
      expect(scope.negation).toBe('not');
      expect(scope.readings).toContain('wide');   // ¬∀x (negation scopes over all)
      expect(scope.readings).toContain('narrow'); // ∀x¬ (all scopes over negation)
      expect(scope.formalizations).toEqual({
        wide: '¬∀x.Attend(x)',
        narrow: '∀x.¬Attend(x)'
      });
    });

    it('detects surface scope preference from word order', () => {
      // "Not all doctors attended" - clearly wide scope (¬∀x)
      const graph = buildGraph("Not all doctors attended the meeting");
      const report = detector.detect(graph);

      const scope = report.getByType('scope')[0];
      expect(scope.defaultReading).toBe('wide');
      expect(scope.confidence).toBe('high'); // clear word order
    });

    it('handles "every" + negation', () => {
      const graph = buildGraph("Every patient was not examined");
      const report = detector.detect(graph);

      const scope = report.getByType('scope')[0];
      expect(scope.quantifier).toBe('every');
      expect(scope.readings).toContain('wide');
      expect(scope.readings).toContain('narrow');
    });
  });

  describe('existential quantifier + negation', () => {
    it('flags "Some doctors did not attend" appropriately', () => {
      // "Some" + negation is less ambiguous
      const graph = buildGraph("Some doctors did not attend");
      const report = detector.detect(graph);

      // Should either be unambiguous or flag with clear default
      const scope = report.getByType('scope');
      if (scope.length > 0) {
        expect(scope[0].defaultReading).toBe('narrow'); // ∃x¬
        expect(scope[0].confidence).toBe('high');
      }
    });
  });

  describe('negation + modal interactions', () => {
    it('detects scope ambiguity in "must not"', () => {
      // "You must not leave" - obligation not to (¬ scopes under must)
      const graph = buildGraph("You must not leave early");
      const report = detector.detect(graph);

      const modal = report.getByType('modal_force')[0];
      expect(modal.negationScope).toBe('under_modal'); // must(¬leave)
    });

    it('detects scope ambiguity in "may not"', () => {
      // "You may not leave" - ambiguous: permission denied vs possibility denied
      const graph = buildGraph("You may not leave");
      const report = detector.detect(graph);

      const scope = report.getByType('scope')[0];
      expect(scope.readings).toContain('permission_denied'); // ¬permitted
      expect(scope.readings).toContain('possibility_denied'); // ¬possible
    });
  });

  describe('multiple quantifiers', () => {
    it('flags "Every doctor saw some patient" as scope ambiguous', () => {
      const graph = buildGraph("Every doctor saw some patient");
      const report = detector.detect(graph);

      const scope = report.getByType('scope')[0];
      expect(scope.readings).toContain('subject_wide'); // ∀x∃y
      expect(scope.readings).toContain('object_wide');  // ∃y∀x
    });
  });
});
```

#### E. Lemmatization Edge-Case Tests

Context-dependent lemmatization where the same surface form has different base forms depending on POS.

```javascript
// tests/unit/lemmatizer-edge-cases.test.js

describe('Lemmatizer Edge Cases', () => {
  describe('POS-dependent lemmatization', () => {
    it('lemmatizes "files" correctly based on POS context', () => {
      // "files" as noun (NNS) → "file"
      // "files" as verb (VBZ) → "file"
      // Same lemma but different semantic treatment

      const nounContext = lemmatize('files', 'NNS');
      const verbContext = lemmatize('files', 'VBZ');

      expect(nounContext.lemma).toBe('file');
      expect(nounContext.category).toBe('noun');

      expect(verbContext.lemma).toBe('file');
      expect(verbContext.category).toBe('verb');
    });

    it('handles "saw" with verb vs noun POS', () => {
      // "saw" as verb (VBD) → "see"
      // "saw" as noun (NN) → "saw" (tool)

      const verbContext = lemmatize('saw', 'VBD');
      const nounContext = lemmatize('saw', 'NN');

      expect(verbContext.lemma).toBe('see');
      expect(nounContext.lemma).toBe('saw');
    });

    it('handles "left" with verb vs adjective vs noun', () => {
      // "left" as verb (VBD) → "leave"
      // "left" as adjective (JJ) → "left"
      // "left" as noun (NN) → "left"

      expect(lemmatize('left', 'VBD').lemma).toBe('leave');
      expect(lemmatize('left', 'JJ').lemma).toBe('left');
      expect(lemmatize('left', 'NN').lemma).toBe('left');
    });
  });

  describe('irregular verb lemmatization', () => {
    it('handles common irregular past tenses', () => {
      expect(lemmatize('went', 'VBD').lemma).toBe('go');
      expect(lemmatize('was', 'VBD').lemma).toBe('be');
      expect(lemmatize('were', 'VBD').lemma).toBe('be');
      expect(lemmatize('had', 'VBD').lemma).toBe('have');
      expect(lemmatize('made', 'VBD').lemma).toBe('make');
      expect(lemmatize('said', 'VBD').lemma).toBe('say');
      expect(lemmatize('thought', 'VBD').lemma).toBe('think');
      expect(lemmatize('knew', 'VBD').lemma).toBe('know');
    });

    it('handles irregular past participles', () => {
      expect(lemmatize('gone', 'VBN').lemma).toBe('go');
      expect(lemmatize('been', 'VBN').lemma).toBe('be');
      expect(lemmatize('done', 'VBN').lemma).toBe('do');
      expect(lemmatize('seen', 'VBN').lemma).toBe('see');
      expect(lemmatize('written', 'VBN').lemma).toBe('write');
      expect(lemmatize('taken', 'VBN').lemma).toBe('take');
    });

    it('handles irregular 3rd person singular', () => {
      expect(lemmatize('is', 'VBZ').lemma).toBe('be');
      expect(lemmatize('has', 'VBZ').lemma).toBe('have');
      expect(lemmatize('does', 'VBZ').lemma).toBe('do');
      expect(lemmatize('goes', 'VBZ').lemma).toBe('go');
    });
  });

  describe('doubling/deletion rules', () => {
    it('handles consonant doubling correctly', () => {
      // "running" → "run" (not "runn")
      // "stopped" → "stop" (not "stopp")
      expect(lemmatize('running', 'VBG').lemma).toBe('run');
      expect(lemmatize('stopped', 'VBD').lemma).toBe('stop');
      expect(lemmatize('sitting', 'VBG').lemma).toBe('sit');
      expect(lemmatize('planned', 'VBD').lemma).toBe('plan');
    });

    it('handles e-deletion correctly', () => {
      // "making" → "make" (not "mak")
      // "taking" → "take"
      expect(lemmatize('making', 'VBG').lemma).toBe('make');
      expect(lemmatize('taking', 'VBG').lemma).toBe('take');
      expect(lemmatize('giving', 'VBG').lemma).toBe('give');
    });

    it('handles y-to-i replacement', () => {
      // "tried" → "try" (not "tri")
      // "applied" → "apply"
      expect(lemmatize('tried', 'VBD').lemma).toBe('try');
      expect(lemmatize('applied', 'VBD').lemma).toBe('apply');
      expect(lemmatize('carries', 'VBZ').lemma).toBe('carry');
    });
  });

  describe('noun pluralization edge cases', () => {
    it('handles irregular plurals', () => {
      expect(lemmatize('children', 'NNS').lemma).toBe('child');
      expect(lemmatize('people', 'NNS').lemma).toBe('person');
      expect(lemmatize('mice', 'NNS').lemma).toBe('mouse');
      expect(lemmatize('teeth', 'NNS').lemma).toBe('tooth');
      expect(lemmatize('feet', 'NNS').lemma).toBe('foot');
      expect(lemmatize('men', 'NNS').lemma).toBe('man');
      expect(lemmatize('women', 'NNS').lemma).toBe('woman');
    });

    it('handles Latin/Greek plurals', () => {
      expect(lemmatize('criteria', 'NNS').lemma).toBe('criterion');
      expect(lemmatize('phenomena', 'NNS').lemma).toBe('phenomenon');
      expect(lemmatize('analyses', 'NNS').lemma).toBe('analysis');
      expect(lemmatize('diagnoses', 'NNS').lemma).toBe('diagnosis');
    });

    it('handles -ies plurals', () => {
      expect(lemmatize('policies', 'NNS').lemma).toBe('policy');
      expect(lemmatize('families', 'NNS').lemma).toBe('family');
      expect(lemmatize('categories', 'NNS').lemma).toBe('category');
    });
  });

  describe('medical/technical vocabulary', () => {
    it('handles medical plurals correctly', () => {
      expect(lemmatize('diagnoses', 'NNS').lemma).toBe('diagnosis');
      expect(lemmatize('prognoses', 'NNS').lemma).toBe('prognosis');
      expect(lemmatize('metastases', 'NNS').lemma).toBe('metastasis');
    });

    it('handles medical verb forms', () => {
      expect(lemmatize('diagnosed', 'VBD').lemma).toBe('diagnose');
      expect(lemmatize('treating', 'VBG').lemma).toBe('treat');
      expect(lemmatize('administered', 'VBD').lemma).toBe('administer');
    });
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
├── lemmatizer-edge-cases.test.js   # 5.1 (irregular verbs, POS-dependent)
├── verb-phrase-extractor.test.js   # 5.2
├── noun-phrase-extractor.test.js   # 5.2
├── ambiguity-detector.test.js      # 5.3
├── ambiguity-report.test.js        # 5.3
├── selectional-constraint.test.js  # 5.3 (inanimate agent, etc.)
├── modal-force-disambiguation.test.js  # 5.3 (deontic vs epistemic)
├── nominalization-ambiguity.test.js    # 5.3 (process vs continuant)
└── scope-negation.test.js          # 5.3 (quantifier + negation)

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
