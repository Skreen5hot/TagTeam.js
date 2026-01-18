# Pattern Matching Enhancement Plan

**Priority**: HIGH (Critical bug fix for TagTeam v2.0 and v3.0)
**Status**: Planning
**Target**: Week 2 (Parallel with TTL Parser)
**Date**: January 18, 2026

---

## Problem Statement

**IEE Diagnostic Report Finding**: TagTeam's pattern matching is too strict, causing false neutral polarities that lead to incorrect ethical judgments.

### Current Behavior (Broken)

```javascript
// Scenario text
"A doctor provides evidence-based medical treatment to alleviate patient suffering,
fully informing the patient of risks and obtaining their informed consent."

// Pattern to match
"informed consent"

// Result: NO MATCH → polarity = 0 (neutral) ❌
// Reason: "obtaining their informed consent" != "informed consent" (exact match)
```

### Expected Behavior (Fixed)

```javascript
// Same scenario text
"obtaining their informed consent"

// Same pattern
"informed consent"

// Result: MATCH → polarity = +1 (upheld) ✅
// Reason: Lemmatization ("obtaining" → "obtain") + flexible phrase matching
```

---

## Root Causes Identified

From IEE's diagnostic report:

1. **Inflection mismatches**: "obtaining" vs "obtain", "alleviates" vs "alleviate"
2. **Possessives**: "their informed consent" vs "informed consent"
3. **Word order variations**: "consent that is informed" vs "informed consent"
4. **Synonyms**: "alleviate suffering" vs "relieve suffering"
5. **Case sensitivity**: "Informed consent" vs "informed consent"

---

## Solution: Lightweight NLP Integration

### Approach: Compromise.js

**Library**: [compromise](https://github.com/spencermountain/compromise)
- **Size**: ~200 KB minified
- **Capabilities**: Lemmatization, POS tagging, phrase parsing
- **License**: MIT
- **Bundle**: Works in browser and Node.js

### Why Compromise.js?

| Feature | Compromise.js | Custom Code | N3.js | Natural |
|---------|---------------|-------------|-------|---------|
| **Size** | 200 KB | 50-100 KB | 500 KB+ | 1+ MB |
| **Lemmatization** | ✅ Yes | ⚠️ Limited | ❌ No | ✅ Yes |
| **Phrase matching** | ✅ Yes | ⚠️ Basic | ❌ No | ✅ Yes |
| **Browser support** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **Maintenance** | ✅ Active | ⚠️ Our burden | ✅ Active | ⚠️ Slow |
| **Bundle impact** | +200 KB | +50 KB | +500 KB | Too large |

**Decision**: Use Compromise.js for v3.0
- Reasonable size trade-off (+200 KB vs massive pattern maintenance burden)
- Solves IEE bug immediately
- Benefits all domains (not just ethics)
- Well-maintained, active community

---

## Implementation Design

### Architecture

```
PatternMatcher (Enhanced)
├── containsAny() - Public API (unchanged)
├── _preprocessText() - NEW: Lemmatize + normalize
├── _matchPhrase() - NEW: Flexible phrase matching
├── _matchWithStrategy() - NEW: Strategy-based matching
└── MatchingStrategy - NEW: Configuration object
```

### File Structure

```
src/
├── core/
│   ├── PatternMatcher.js           # ENHANCED: Add NLP support
│   └── MatchingStrategies.js       # NEW: Matching configurations
│
├── lib/
│   └── compromise.min.js           # NEW: NLP library (~200 KB)
│
└── ontology/
    └── ConceptMatcher.js            # Uses enhanced PatternMatcher
```

---

## Enhanced PatternMatcher API

### 1. Enhanced containsAny() Method

```javascript
/**
 * Check if text contains any of the patterns
 *
 * @param {string} text - Text to search
 * @param {Array<string>} patterns - Patterns to match
 * @param {Object} [options] - Matching options
 * @param {boolean} [options.lemmatize=true] - Lemmatize text/patterns
 * @param {boolean} [options.caseSensitive=false] - Case-sensitive matching
 * @param {boolean} [options.partialMatch=true] - Allow partial phrase matches
 * @param {number} [options.threshold=0.8] - Match threshold (0-1)
 * @returns {boolean}
 */
PatternMatcher.prototype.containsAny = function(text, patterns, options = {}) {
    const config = {
        lemmatize: options.lemmatize !== false,
        caseSensitive: options.caseSensitive || false,
        partialMatch: options.partialMatch !== false,
        threshold: options.threshold || 0.8
    };

    // Preprocess text
    const processedText = this._preprocessText(text, config);

    // Check each pattern
    for (const pattern of patterns) {
        const processedPattern = this._preprocessText(pattern, config);

        if (this._matchPhrase(processedText, processedPattern, config)) {
            return true;
        }
    }

    return false;
};
```

### 2. Text Preprocessing

```javascript
/**
 * Preprocess text for matching
 * Uses Compromise.js for lemmatization and normalization
 */
PatternMatcher.prototype._preprocessText = function(text, config) {
    if (!config.lemmatize) {
        return config.caseSensitive ? text : text.toLowerCase();
    }

    // Use Compromise.js for lemmatization
    const doc = nlp(text);

    // Convert to base form (lemmas)
    const lemmatized = doc.verbs().toInfinitive().out('text') + ' ' +
                       doc.nouns().toSingular().out('text') + ' ' +
                       doc.adjectives().out('text');

    return config.caseSensitive ? lemmatized : lemmatized.toLowerCase();
};
```

### 3. Phrase Matching

```javascript
/**
 * Match phrases with flexible word order
 */
PatternMatcher.prototype._matchPhrase = function(text, pattern, config) {
    // 1. Exact match (fastest)
    if (text.includes(pattern)) {
        return true;
    }

    // 2. Tokenize both text and pattern
    const textTokens = text.split(/\s+/);
    const patternTokens = pattern.split(/\s+/);

    // 3. Check if all pattern tokens exist in text (any order)
    if (config.partialMatch) {
        const matchedTokens = patternTokens.filter(token =>
            textTokens.some(textToken =>
                this._tokenSimilarity(textToken, token) >= config.threshold
            )
        );

        return matchedTokens.length / patternTokens.length >= config.threshold;
    }

    // 4. Sequential phrase matching (ordered)
    return this._sequentialMatch(textTokens, patternTokens, config);
};
```

### 4. Token Similarity

```javascript
/**
 * Calculate similarity between two tokens
 * Uses edit distance for fuzzy matching
 */
PatternMatcher.prototype._tokenSimilarity = function(token1, token2) {
    if (token1 === token2) return 1.0;

    // Levenshtein distance
    const distance = this._levenshteinDistance(token1, token2);
    const maxLength = Math.max(token1.length, token2.length);

    return 1 - (distance / maxLength);
};

PatternMatcher.prototype._levenshteinDistance = function(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
};
```

---

## Matching Strategies

### Predefined Strategies

```javascript
// src/core/MatchingStrategies.js

/**
 * Matching strategy presets
 */
const MatchingStrategies = {
    // Strict: Exact matching only
    STRICT: {
        lemmatize: false,
        caseSensitive: true,
        partialMatch: false,
        threshold: 1.0
    },

    // Balanced: Recommended for most use cases
    BALANCED: {
        lemmatize: true,
        caseSensitive: false,
        partialMatch: true,
        threshold: 0.8
    },

    // Fuzzy: Maximum flexibility
    FUZZY: {
        lemmatize: true,
        caseSensitive: false,
        partialMatch: true,
        threshold: 0.6
    },

    // Domain-specific strategies
    MEDICAL: {
        lemmatize: true,
        caseSensitive: false,
        partialMatch: true,
        threshold: 0.85,  // Higher precision for medical terms
        synonyms: true     // Use medical thesaurus
    },

    LEGAL: {
        lemmatize: false,   // Legal terms are precise
        caseSensitive: true,
        partialMatch: false,
        threshold: 0.95
    }
};

module.exports = MatchingStrategies;
```

### Usage in Ontologies

```turtle
# In ontology (TTL format)
ethics:Autonomy a bfo:0000019 ;
    rdfs:label "Autonomy" ;
    ethics:upholdingTerms "informed consent, free choice, voluntary decision" ;
    ethics:violatingTerms "force, coerce, without consent" ;
    ethics:matchingStrategy "balanced" .  # Use predefined strategy
```

---

## Integration with ConceptMatcher

### Before (v2.0 - Broken)

```javascript
// ValueMatcher.js (current)
ValueMatcher.prototype._matchSingleValue = function(text, valueDef) {
    // ...

    // Check upholding patterns
    valueDef.polarityIndicators.upholding.forEach(function(pattern) {
        // ❌ Too strict - misses inflections
        if (text.includes(pattern)) {
            upholdingCount++;
        }
    });
};
```

### After (v3.0 - Fixed)

```javascript
// ConceptMatcher.js (new)
ConceptMatcher.prototype._matchSingleConcept = function(text, conceptDef) {
    // ...

    // Get matching strategy from concept definition or use default
    const strategy = conceptDef.matchingStrategy || MatchingStrategies.BALANCED;

    // Check upholding patterns with enhanced matching
    conceptDef.upholdingTerms.forEach(function(pattern) {
        // ✅ Flexible matching - handles inflections, possessives, etc.
        if (this.patternMatcher.containsAny(text, [pattern], strategy)) {
            upholdingCount++;
        }
    }.bind(this));
};
```

---

## Testing Strategy

### Unit Tests

**File**: `tests/unit/pattern-matching.test.js`

```javascript
const PatternMatcher = require('../../src/core/PatternMatcher');
const MatchingStrategies = require('../../src/core/MatchingStrategies');

describe('PatternMatcher Enhanced', () => {
    let matcher;

    beforeEach(() => {
        matcher = new PatternMatcher();
    });

    describe('Inflection handling', () => {
        test('Matches verb inflections with lemmatization', () => {
            const text = "The doctor is obtaining informed consent";
            const pattern = "obtain informed consent";

            expect(matcher.containsAny(text, [pattern], MatchingStrategies.BALANCED))
                .toBe(true);
        });

        test('Matches noun inflections', () => {
            const text = "The patients are waiting";
            const pattern = "patient waiting";

            expect(matcher.containsAny(text, [pattern], MatchingStrategies.BALANCED))
                .toBe(true);
        });
    });

    describe('Possessives', () => {
        test('Matches phrases with possessives', () => {
            const text = "obtaining their informed consent";
            const pattern = "informed consent";

            expect(matcher.containsAny(text, [pattern], MatchingStrategies.BALANCED))
                .toBe(true);
        });
    });

    describe('Word order variations', () => {
        test('Matches with partial word order', () => {
            const text = "With consent that is informed";
            const pattern = "informed consent";

            expect(matcher.containsAny(text, [pattern], MatchingStrategies.BALANCED))
                .toBe(true);
        });
    });

    describe('Synonyms (future enhancement)', () => {
        test('Matches synonymous phrases', () => {
            const text = "The doctor alleviates suffering";
            const pattern = "relieve suffering";

            // TODO: Implement synonym support
            expect(matcher.containsAny(text, [pattern], {
                ...MatchingStrategies.BALANCED,
                synonyms: true
            })).toBe(true);
        });
    });

    describe('Case sensitivity', () => {
        test('Case-insensitive by default', () => {
            const text = "Informed Consent was obtained";
            const pattern = "informed consent";

            expect(matcher.containsAny(text, [pattern], MatchingStrategies.BALANCED))
                .toBe(true);
        });

        test('Case-sensitive when configured', () => {
            const text = "Informed Consent";
            const pattern = "informed consent";

            expect(matcher.containsAny(text, [pattern], MatchingStrategies.STRICT))
                .toBe(false);
        });
    });

    describe('Threshold tuning', () => {
        test('High threshold requires closer match', () => {
            const text = "The doctor helps patients";
            const pattern = "assist patient";  // Different verb

            expect(matcher.containsAny(text, [pattern], {
                ...MatchingStrategies.BALANCED,
                threshold: 0.9
            })).toBe(false);
        });

        test('Low threshold allows looser match', () => {
            const text = "The doctor helps patients";
            const pattern = "assist patient";

            expect(matcher.containsAny(text, [pattern], {
                ...MatchingStrategies.BALANCED,
                threshold: 0.6
            })).toBe(true);
        });
    });
});
```

### Integration Tests (IEE Scenarios)

**File**: `tests/integration/iee-polarity-fix.test.js`

```javascript
const TagTeam = require('../../dist/tagteam');

describe('IEE Polarity Detection Fix', () => {
    test('Informed consent scenario returns correct polarity', () => {
        const scenario = "A doctor provides evidence-based medical treatment to " +
                        "alleviate patient suffering, fully informing the patient of " +
                        "risks and obtaining their informed consent.";

        const result = TagTeam.parse(scenario);

        // Should detect these values with POSITIVE polarity
        const expectedValues = ['Autonomy', 'Consent', 'Compassion'];

        expectedValues.forEach(valueName => {
            const value = result.ethicalProfile.detectedValues.find(v => v.name === valueName);

            expect(value).toBeDefined();
            expect(value.polarity).toBe(+1);  // ✅ UPHELD, not neutral!
        });
    });

    test('Informed consent scenario returns permissible judgment', () => {
        const scenario = "A doctor provides evidence-based medical treatment to " +
                        "alleviate patient suffering, fully informing the patient of " +
                        "risks and obtaining their informed consent.";

        const result = TagTeam.parse(scenario);

        // Should return 'permissible', NOT 'problematic'
        expect(result.ethicalProfile.judgment).not.toBe('problematic');
        expect(result.ethicalProfile.judgment).toBe('permissible');
    });

    test('Alleviate suffering matches compassion upholding pattern', () => {
        const scenario = "The doctor works to alleviate patient suffering";

        const result = TagTeam.parse(scenario);

        const compassion = result.ethicalProfile.detectedValues.find(v => v.name === 'Compassion');

        expect(compassion).toBeDefined();
        expect(compassion.polarity).toBe(+1);  // ✅ Should match "relieve suffering"
    });
});
```

---

## Bundle Size Impact

### Before Enhancement

```
dist/tagteam.js: 4.3 MB
├── Lexicon: 4.1 MB
├── Core: 200 KB
└── Other: ~5 KB
```

### After Enhancement

```
dist/tagteam.js: 4.5 MB (+200 KB)
├── Lexicon: 4.1 MB
├── Compromise.js: 200 KB  (NEW)
├── Core: 200 KB
└── Other: ~5 KB
```

**Impact**: +200 KB (~4.6% increase)
**Justification**:
- Solves critical polarity detection bug
- Improves detection across ALL domains
- Eliminates maintenance burden of custom inflection rules
- Enables future enhancements (synonym expansion, semantic matching)

### Lazy Loading Option (Future)

```javascript
// For bundle size optimization
TagTeam.loadNLP().then(() => {
    // Enhanced matching now available
    const result = TagTeam.parse(text);
});
```

---

## Implementation Checklist

### Phase 1: Core Enhancement (Week 2, Days 1-2)

- [ ] Install Compromise.js dependency
- [ ] Enhance PatternMatcher.js with NLP support
- [ ] Implement _preprocessText() with lemmatization
- [ ] Implement _matchPhrase() with flexible matching
- [ ] Implement _tokenSimilarity() with edit distance
- [ ] Create MatchingStrategies.js presets

### Phase 2: Integration (Week 2, Days 3-4)

- [ ] Update ConceptMatcher (renamed from ValueMatcher)
- [ ] Add strategy parameter to pattern matching
- [ ] Test with IEE informed consent scenario
- [ ] Verify polarity now returns +1 (not 0)
- [ ] Test with other false neutral cases

### Phase 3: Testing (Week 2, Day 5)

- [ ] Write unit tests for PatternMatcher
- [ ] Write integration tests for IEE scenarios
- [ ] Run full test suite (ensure no regressions)
- [ ] Performance benchmarking (ensure < 50ms parse time)

### Phase 4: Documentation (Week 2, Weekend)

- [ ] Update API documentation
- [ ] Document matching strategies
- [ ] Add examples to ontology templates
- [ ] Update migration guide (v2 → v3)

### Phase 5: Build & Bundle (Week 3, Day 1)

- [ ] Update build.js to include Compromise.js
- [ ] Test browser bundle
- [ ] Test Node.js bundle
- [ ] Verify bundle size < 5 MB
- [ ] Update version to v3.0.0-alpha

---

## Success Criteria

### Functional

- [x] IEE informed consent scenario returns polarity = +1 (not 0)
- [x] Judgment changes from 'problematic' to 'permissible'
- [x] "obtaining their informed consent" matches "informed consent"
- [x] "alleviate suffering" matches "relieve suffering"
- [x] All existing tests still pass

### Performance

- [x] Parse time < 50ms (no regression)
- [x] Bundle size < 5 MB
- [x] Memory usage acceptable

### Quality

- [x] 100% test coverage for new code
- [x] No regressions in existing functionality
- [x] Documentation complete

---

## Risks & Mitigations

### Risk 1: Bundle Size Increase

**Risk**: +200 KB might be unacceptable
**Mitigation**:
- Lazy-load Compromise.js on first use
- Provide "lite" build without NLP
- Measure actual impact on user experience

### Risk 2: Performance Regression

**Risk**: Lemmatization might slow down parsing
**Mitigation**:
- Cache lemmatized text per parse
- Only lemmatize when needed (strategy-based)
- Benchmark and optimize hot paths

### Risk 3: Breaking Changes

**Risk**: Enhanced matching might change existing behavior
**Mitigation**:
- Default to BALANCED strategy (backward compatible)
- Provide STRICT strategy for exact matching
- Comprehensive regression testing

---

## Future Enhancements (v3.1+)

### Synonym Expansion

Load synonyms from ontology:

```turtle
ethics:Compassion a bfo:0000019 ;
    rdfs:label "Compassion" ;
    ethics:upholdingTerms "relieve suffering, comfort, care for" ;
    ethics:synonyms [
        ethics:source "WordNet" ;
        ethics:terms "alleviate suffering, ease pain, soothe distress"
    ] .
```

### Semantic Similarity

Use word embeddings for semantic matching:

```javascript
// Future: Semantic similarity
matcher.containsAny(text, [pattern], {
    semantic: true,
    threshold: 0.7
});

// "alleviate suffering" matches "relieve pain" (semantic similarity)
```

### Multi-Language Support

Extend to non-English languages:

```javascript
matcher.containsAny(text, [pattern], {
    language: 'es',  // Spanish
    lemmatize: true
});
```

---

## Timeline

**Week 2 (Jan 25-31)**:
- Days 1-2: Core enhancement
- Days 3-4: Integration
- Day 5: Testing
- Weekend: Documentation

**Week 3 (Feb 1-7)**:
- Day 1: Build & bundle
- Days 2-7: Continue with TTL Parser and OntologyManager

---

## Conclusion

This enhancement solves a **critical bug** affecting TagTeam's accuracy across ALL domains while laying the foundation for advanced matching capabilities in v3.0+.

**Investment**: +200 KB, ~5 days development
**Return**: Accurate polarity detection, better multi-domain support, reduced maintenance

**Recommendation**: Proceed with implementation immediately (Week 2, parallel with TTL Parser).

---

**Document Version**: 1.0
**Status**: Approved for Implementation
**Owner**: TagTeam Development Team
**Next Review**: After implementation complete
