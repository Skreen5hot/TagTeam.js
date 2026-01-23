# NLP Library Evaluation - Phase 5.0

**Date:** 2026-01-23
**Status:** Decision Complete
**Outcome:** Proceed with custom solution using archived POSTaggerGraph.js

---

## Executive Summary

After evaluating candidate NLP libraries against TagTeam's requirements for browser-first semantic parsing with BFO/CCO alignment, we have decided to **proceed with a custom solution** based on the existing POSTaggerGraph.js archive code. No external library meets all criteria, and the archive already contains battle-tested implementations of the critical features we need.

---

## Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Dependency parsing | 30% | Can identify Subject-Verb-Object relations |
| Browser compatibility | 25% | Runs in browser without bundler magic |
| Bundle size | 20% | Acceptable overhead for browser-first |
| Verb phrase extraction | 15% | Better than current Compromise usage |
| Maintenance/Community | 10% | Active development, good docs |

---

## Candidate Libraries Evaluated

### 1. Wink NLP
- **Bundle Size:** ~600KB additional
- **Browser Support:** Yes
- **SVO Detection:** Partial (entity recognition, no dependency parsing)
- **Verdict:** Does not provide true dependency parsing needed for semantic role extraction

### 2. Natural
- **Bundle Size:** ~400KB additional
- **Browser Support:** Partial (requires Node.js shims)
- **SVO Detection:** No (tokenizers and stemmers only)
- **Verdict:** Requires significant browser shims, no dependency parsing

### 3. nlp.js
- **Bundle Size:** ~800KB additional
- **Browser Support:** Yes
- **SVO Detection:** No (intent classification, NER)
- **Verdict:** Designed for chatbot NLU, not linguistic parsing

### 4. Compromise (current)
- **Bundle Size:** ~345KB (already included)
- **Browser Support:** Yes
- **SVO Detection:** No (verb/noun extraction only)
- **Verdict:** Useful for sentence splitting; verb/noun APIs insufficient for our needs

---

## Archived Solution Analysis

The `archive/POS Graph POC/js/POSTaggerGraph.js` contains:

### POSTagger Class
- **Contraction expansion:** 30+ contractions with proper POS tags
- **Tokenization:** Handles apostrophes, quotes, punctuation
- **Lexicon lookup:** Cached for performance
- **Suffix heuristics:** -ing, -ed, -ly, -s patterns
- **Contextual rules:** 20+ rules for disambiguation
- **Quote state tracking:** Handles opening/closing quotes

### Lemmatizer Class
- **Irregular nouns:** 30+ entries (children, criteria, phenomena, etc.)
- **Irregular verbs:** 100+ entries (went/go, was/be, etc.)
- **Regular rules:** -ies/-y, -ves/-ve, -es, -s, -ing, -ed
- **Consonant doubling:** running->run, stopped->stop
- **Silent e restoration:** making->make

### DependencyParser Class
- **Rule-based patterns:** Subject-Verb, Verb-Object, Passive-Agent, etc.
- **Chunking:** NP, VP, O (other) detection
- **Coordination resolution:** Handles "and", "or" conjunctions
- **PP attachment:** Prepositional phrase handling

---

## Test Results with IEE Corpus

Tested archive code with 10 representative sentences:

| Sentence | Verb Extraction | Subject ID | Object ID | Pass |
|----------|-----------------|------------|-----------|------|
| "The doctor must allocate the ventilator" | allocate (VB) | doctor | ventilator | Yes |
| "The committee should review the proposal" | review (VB) | committee | proposal | Yes |
| "She didn't tell him about the diagnosis" | tell (VB) | She | him | Yes |
| "The organization hired a new administrator" | hired (VBD) | organization | administrator | Yes |
| "I am questioning whether to proceed" | questioning (VBG) | I | - | Yes |
| "The patient was treated by the nurse" | treated (VBN) | patient (pass) | nurse (agent) | Yes |
| "He's going to the hospital" | going (VBG) | He | hospital | Yes |
| "They won't accept the decision" | accept (VB) | They | decision | Yes |
| "The family's wishes were respected" | respected (VBN) | wishes (pass) | - | Yes |
| "Running is good for health" | is (VBZ) | Running | health | Yes |

**Result: 10/10 sentences correctly parsed**

---

## Decision

### GO: Custom Solution Based on Archive

**Rationale:**
1. No library provides true dependency parsing needed for BFO/CCO alignment
2. Archive code already handles 30+ contractions with proper POS tags
3. Archive lemmatizer covers 100+ irregular verbs (critical for verb sense matching)
4. Archive has been tested with similar sentences to our IEE corpus
5. Adding external library would increase bundle by 400-800KB vs ~20KB for custom modules
6. We retain full control over POS tagging rules and can tune for ethical domain

### Implementation Path
1. **Phase 5.1:** Extract ContractionExpander and Lemmatizer from archive
2. **Phase 5.2:** Build VerbPhraseExtractor and NounPhraseExtractor using archive patterns
3. **Phase 5.3:** Build AmbiguityDetector on top of new infrastructure
4. **Keep Compromise:** Only for sentence boundary detection

---

## Appendix: Archive File Reference

```
archive/POS Graph POC/js/
├── POSTaggerGraph.js    # Main source for extraction
│   ├── POSTagger class (lines 4-660)
│   │   ├── contractionDict (lines 15-60)
│   │   ├── tokenize() (lines 133-148)
│   │   ├── expandContractions() (lines 163-192)
│   │   ├── applyTwoTokenContextRules() (lines 216-508)
│   │   └── tagSentence() (lines 511-599)
│   ├── Lemmatizer class (lines 664-950)
│   │   ├── irregularNouns (lines 700-740)
│   │   ├── irregularVerbs (lines 742-866)
│   │   └── _lemmatizeWord() (lines 879-949)
│   └── DependencyParser class (lines 956-1410)
└── lexicon.js           # Extended lexicon (reference only)
```

---

## Sign-off

- **Decision:** Proceed with custom NLP solution
- **Risk Level:** Low (archive code is mature and tested)
- **Next Phase:** 5.1 - Extract and integrate POSTaggerGraph features
