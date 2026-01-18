# Week 3+ Roadmap: Next Generation Features

**Current Status:** Week 2b Complete (Jan 18, 2026)
**Version:** 2.0.0 (Production Ready)
**Next Target:** 3.0.0 - Enhanced Intelligence

---

## Current State Summary

### ✅ What We Have (v2.0.0)

**Week 1: Semantic Roles**
- Agent, action, patient extraction
- 15 semantic frames
- Modality detection (must/should/can)
- Negation handling

**Week 2a: Context Intensity**
- 12 dimensions (temporal, relational, consequential, epistemic)
- Nuanced scenario understanding

**Week 2b: Ethical Value Detection**
- 50 values across 5 domains
- Keyword-based detection (high precision)
- Polarity detection (+1 upheld, -1 violated, 0 conflicted)
- Domain analysis
- Conflict detection (18 predefined pairs + automatic)
- Salience calculation with frame/role boosts

**Technical:**
- 4.28 MB bundle (14% under 5 MB limit)
- 25-40ms parse time (60-75% under 100ms target)
- Zero dependencies, UMD format
- Browser-ready, single-file deployment

### ⚠️ Current Limitations

1. **Keyword Dependency** - Values only detected when keywords present
2. **Single Sentence** - No multi-sentence context analysis
3. **No Embeddings** - Can't detect implicit/contextual values
4. **Static Lexicon** - Can't learn from usage
5. **General Purpose** - No domain specialization

---

## Week 3 Options: Choose Your Path

We have **5 potential directions**. Pick one or combine based on priorities.

### Option A: Semantic Intelligence (ML-Light)
**Goal:** Detect implicit values without requiring keywords

**Impact:** Dramatically improve recall while maintaining precision

**Effort:** 2-3 weeks | **Complexity:** High | **Value:** Very High

### Option B: Multi-Sentence Context
**Goal:** Analyze paragraphs and full scenarios, not just single sentences

**Impact:** Better understanding of complex ethical situations

**Effort:** 1-2 weeks | **Complexity:** Medium | **Value:** High

### Option C: Domain Specialization
**Goal:** Add domain-specific lexicons (medical, legal, business)

**Impact:** Higher accuracy in specialized contexts

**Effort:** 1-2 weeks | **Complexity:** Low-Medium | **Value:** Medium-High

### Option D: Active Learning System
**Goal:** Learn from usage, refine keywords, adapt over time

**Impact:** Continuous improvement without manual updates

**Effort:** 2-3 weeks | **Complexity:** High | **Value:** High

### Option E: Production Tooling
**Goal:** Better dev tools, debugging, visualization, analytics

**Impact:** Easier to use, debug, and extend

**Effort:** 1 week | **Complexity:** Low-Medium | **Value:** Medium

---

## Recommended Path: Week 3 Hybrid Approach

**Phase 1 (Week 3a):** Semantic Intelligence Foundation
**Phase 2 (Week 3b):** Multi-Sentence Context
**Phase 3 (Week 3c):** Domain Specialization

This gives us **maximum value** while building on existing strengths.

---

## Week 3a: Semantic Intelligence (Detailed Plan)

### Goal
Detect implicit values using lightweight semantic understanding, without requiring heavy ML models or external APIs.

### Approach: Hybrid Model

**1. Lightweight Word Embeddings**
- Pre-computed embeddings for ~10K most common words
- Compact representation (50-100 dimensions)
- Embedded directly in bundle (adds ~500KB-1MB)
- Use cosine similarity for semantic distance

**2. Value Signature Vectors**
- Each value gets a "signature" vector (average of keyword embeddings)
- Example: Autonomy = avg(choice, freedom, independence, self-determination, ...)
- Pre-computed and cached in bundle

**3. Enhanced Detection Pipeline**
```
Text → Tokenize → Embed → Compare to Value Signatures → Score → Threshold → Detect
       ↓
    + Existing keyword detection (still used for precision)
       ↓
    = Combined Score (keyword + semantic similarity)
```

### Architecture

**New Component: SemanticMatcher.js**
```javascript
class SemanticMatcher {
  constructor(embeddings, valueSignatures) {
    this.embeddings = embeddings;  // Pre-computed word vectors
    this.valueSignatures = valueSignatures;  // Value signature vectors
  }

  /**
   * Detect values using semantic similarity
   * Returns values with similarity scores
   */
  matchBySemantics(text, threshold = 0.6) {
    const tokens = this.tokenize(text);
    const textVector = this.computeAverageEmbedding(tokens);

    const matches = [];
    this.valueSignatures.forEach((signature, valueName) => {
      const similarity = this.cosineSimilarity(textVector, signature);
      if (similarity >= threshold) {
        matches.push({
          name: valueName,
          similarityScore: similarity,
          source: 'semantic'
        });
      }
    });

    return matches;
  }

  computeAverageEmbedding(tokens) {
    const vectors = tokens.map(t => this.embeddings[t]).filter(v => v);
    return this.averageVectors(vectors);
  }

  cosineSimilarity(vec1, vec2) {
    // Standard cosine similarity calculation
  }
}
```

**Updated ValueMatcher.js**
```javascript
class ValueMatcher {
  constructor(valueDefinitions, semanticMatcher = null) {
    this.valueDefs = valueDefinitions;
    this.semanticMatcher = semanticMatcher;  // NEW: Optional semantic component
  }

  matchValues(text) {
    // 1. Keyword matching (existing, high precision)
    const keywordMatches = this.matchByKeywords(text);

    // 2. Semantic matching (NEW, high recall)
    let semanticMatches = [];
    if (this.semanticMatcher) {
      semanticMatches = this.semanticMatcher.matchBySemantics(text);
    }

    // 3. Merge and deduplicate
    return this.mergeMatches(keywordMatches, semanticMatches);
  }

  mergeMatches(keywordMatches, semanticMatches) {
    // Keyword matches take precedence (higher precision)
    // Semantic matches add coverage (higher recall)
    // Combined score = max(keywordScore, semanticScore * 0.8)
  }
}
```

### Data Requirements

**1. Word Embeddings**
- Pre-trained GloVe or Word2Vec (100D)
- ~10K most common English words
- File size: ~500KB compressed
- Embedded in bundle or lazy-loaded

**2. Value Signature Vectors**
- 50 values × 100 dimensions = 5,000 floats
- ~20KB (negligible)
- Pre-computed from value keywords

### Implementation Plan

**Week 3a.1: Embedding Infrastructure (3 days)**
- [ ] Research lightweight embedding options (GloVe 100D)
- [ ] Download and process embeddings
- [ ] Create compact binary format (reduce size)
- [ ] Build embedding loader (lazy or bundled)
- [ ] Test embedding lookup performance

**Week 3a.2: Signature Generation (2 days)**
- [ ] Generate value signature vectors from keywords
- [ ] Validate signatures match expected semantic space
- [ ] Export signatures to JSON
- [ ] Add to bundle

**Week 3a.3: SemanticMatcher Component (3 days)**
- [ ] Implement SemanticMatcher class
- [ ] Cosine similarity calculation
- [ ] Threshold tuning
- [ ] Performance optimization
- [ ] Integration tests

**Week 3a.4: Integration & Testing (3 days)**
- [ ] Update ValueMatcher to use SemanticMatcher
- [ ] Update ValueScorer (semantic similarity as salience factor)
- [ ] Test on Week 2 corpus
- [ ] Measure precision/recall improvement
- [ ] Tune thresholds

**Week 3a.5: Bundle & Documentation (2 days)**
- [ ] Update build.js to include embeddings
- [ ] Bundle size analysis (target: <5.5 MB)
- [ ] Performance testing (target: <150ms)
- [ ] Update documentation
- [ ] Create usage examples

### Expected Outcomes

**Metrics:**
- **Recall:** 45% → 75% (detect 15/20 → 18/20 scenarios)
- **Precision:** 100% → 85% (slight decrease acceptable)
- **F1 Score:** 62% → 80%
- **Bundle Size:** 4.28 MB → ~5.0 MB
- **Parse Time:** 25-40ms → 40-80ms

**Benefits:**
- ✅ Detects implicit values (e.g., "questioning doctrines" → Integrity, Authenticity)
- ✅ Better handles synonyms and paraphrasing
- ✅ More robust to keyword variations
- ✅ Still deterministic (no black-box ML)

**Trade-offs:**
- ⚠️ Slightly larger bundle (+700KB)
- ⚠️ Slightly slower parse time (+15-40ms, still under budget)
- ⚠️ Lower precision (85% vs 100%)
- ✅ Much higher recall (75% vs 45%)

---

## Week 3b: Multi-Sentence Context (Detailed Plan)

### Goal
Analyze full scenarios (multiple sentences, paragraphs) to understand context that spans beyond single sentences.

### Current Limitation
```javascript
// Currently: Only analyzes testSentence
const result = TagTeam.parse("The family must decide whether to continue treatment");
// Missing context: "unconscious father", "no advance directive", etc.
```

### New Capability
```javascript
// New: Analyze full scenario
const result = TagTeam.parseScenario({
  sentences: [
    "The father is unconscious with no advance directive.",
    "The family must decide whether to continue treatment.",
    "They are torn between respecting his autonomy and preventing suffering."
  ]
});
// Now detects: Autonomy, Compassion, Non-maleficence from full context
```

### Architecture

**New Component: ScenarioAnalyzer.js**
```javascript
class ScenarioAnalyzer {
  constructor(semanticExtractor) {
    this.extractor = semanticExtractor;
  }

  /**
   * Parse multi-sentence scenario
   * Aggregates information across all sentences
   */
  parseScenario(text, options = {}) {
    // 1. Split into sentences
    const sentences = this.splitSentences(text);

    // 2. Parse each sentence
    const parsedSentences = sentences.map(s => this.extractor.parseSemanticAction(s));

    // 3. Aggregate values across sentences
    const aggregatedValues = this.aggregateValues(parsedSentences);

    // 4. Build composite profile
    return this.buildCompositeProfile(parsedSentences, aggregatedValues);
  }

  aggregateValues(parsedSentences) {
    // Combine values from all sentences
    // Boost values that appear multiple times
    // Handle cross-sentence entailment
  }

  buildCompositeProfile(sentences, values) {
    // Find main decision/action
    // Identify stakeholders across sentences
    // Calculate composite confidence
    // Generate unified ethical profile
  }
}
```

**Enhanced Output Structure**
```javascript
{
  version: "3.0",

  // NEW: Scenario-level analysis
  scenario: {
    sentences: [
      { text: "...", agent: "...", action: "..." },
      { text: "...", agent: "...", action: "..." }
    ],
    mainAction: { sentence: 1, agent: "family", action: "decide" },
    stakeholders: ["father", "family"],
    timeSpan: "present-future"
  },

  // Existing fields (from main sentence)
  agent: { ... },
  action: { ... },
  semanticFrame: "Deciding",
  contextIntensity: { ... },

  // Enhanced ethical profile (from full scenario)
  ethicalProfile: {
    values: [
      {
        name: "Autonomy",
        salience: 0.85,
        polarity: -1,
        evidenceSources: [
          { sentence: 0, evidence: "unconscious, no directive" },
          { sentence: 2, evidence: "respecting his autonomy" }
        ]
      },
      // ... more values with cross-sentence evidence
    ],
    topValues: [ ... ],
    scenarioComplexity: "high",  // NEW: based on sentence count, value diversity
    crossSentenceConflicts: [ ... ]  // NEW: conflicts that span sentences
  }
}
```

### Implementation Plan

**Week 3b.1: Sentence Segmentation (2 days)**
- [ ] Implement robust sentence splitter
- [ ] Handle edge cases (abbreviations, quotes, etc.)
- [ ] Test on complex scenarios
- [ ] Performance optimization

**Week 3b.2: Value Aggregation (3 days)**
- [ ] Implement value merging across sentences
- [ ] Design salience combination formula
- [ ] Handle evidence tracking
- [ ] Cross-sentence entailment detection

**Week 3b.3: Composite Profile Generation (3 days)**
- [ ] Identify main action/decision
- [ ] Stakeholder identification
- [ ] Composite confidence calculation
- [ ] Enhanced conflict detection

**Week 3b.4: Integration & Testing (3 days)**
- [ ] Create ScenarioAnalyzer component
- [ ] Update TagTeam API (TagTeam.parseScenario)
- [ ] Test on full Week 2 scenarios (not just testSentence)
- [ ] Measure improvement

**Week 3b.5: Bundle & Documentation (2 days)**
- [ ] Update build with ScenarioAnalyzer
- [ ] Bundle size check (should be +20-30KB only)
- [ ] Performance testing
- [ ] API documentation
- [ ] Usage examples

### Expected Outcomes

**Metrics:**
- **Coverage:** 75% → 95% (detect 15/20 → 19/20 scenarios)
- **Value Count:** 1.5 avg → 3.2 avg values per scenario
- **Accuracy:** Higher (using full context vs excerpt)
- **Bundle Size:** +20-30KB (minimal impact)
- **Parse Time:** +10-20ms per additional sentence

**Benefits:**
- ✅ Analyzes full ethical scenarios (as intended)
- ✅ Cross-sentence value detection
- ✅ Better stakeholder identification
- ✅ More complete ethical profiles
- ✅ Backward compatible (single sentence still works)

---

## Week 3c: Domain Specialization (Detailed Plan)

### Goal
Add domain-specific lexicons for medical, legal, and business contexts to improve accuracy in specialized areas.

### Current State
```javascript
// Generic keywords work okay but miss domain-specific terms
"palliative care" → no specific values detected
"informed consent" → partially detected (autonomy only)
"fiduciary duty" → not detected
```

### Enhanced State
```javascript
// Domain-specific lexicons detect nuanced values
"palliative care" → Compassion (0.8), Non-maleficence (0.7), Dignity (0.6)
"informed consent" → Autonomy (0.9), Transparency (0.7), Respect (0.6)
"fiduciary duty" → Fidelity (0.9), Justice (0.7), Responsibility (0.6)
```

### Architecture

**New Data Files**

**1. medical-lexicon.json**
```json
{
  "domain": "medical",
  "terms": {
    "palliative care": {
      "boosts": {
        "Compassion": 0.5,
        "Non-maleficence": 0.4,
        "Dignity": 0.3
      }
    },
    "informed consent": {
      "boosts": {
        "Autonomy": 0.6,
        "Transparency": 0.4
      }
    },
    "do not resuscitate": {
      "boosts": {
        "Autonomy": 0.5,
        "Non-maleficence": 0.3
      }
    }
    // ... ~200 medical terms
  }
}
```

**2. legal-lexicon.json**
```json
{
  "domain": "legal",
  "terms": {
    "fiduciary duty": {
      "boosts": { "Fidelity": 0.6, "Justice": 0.4 }
    },
    "due process": {
      "boosts": { "Justice": 0.7, "Rights": 0.5 }
    },
    "reasonable doubt": {
      "boosts": { "Justice": 0.5, "Truth": 0.4 }
    }
    // ... ~150 legal terms
  }
}
```

**3. business-lexicon.json**
```json
{
  "domain": "business",
  "terms": {
    "conflict of interest": {
      "boosts": { "Integrity": 0.6, "Transparency": 0.5 }
    },
    "stakeholder engagement": {
      "boosts": { "Respect": 0.5, "Community": 0.4 }
    },
    "corporate social responsibility": {
      "boosts": { "Stewardship": 0.6, "Community": 0.5 }
    }
    // ... ~100 business terms
  }
}
```

**Enhanced ValueScorer.js**
```javascript
class ValueScorer {
  constructor(frameValueBoosts, domainLexicons = {}) {
    this.frameBoosts = frameValueBoosts;
    this.domainLexicons = domainLexicons;  // NEW: Domain-specific terms
  }

  scoreValues(detectedValues, frame, roles, allValues, options = {}) {
    const domain = options.domain || 'general';  // NEW: Domain hint

    return detectedValues.map(value => {
      let salience = this.calculateBaseSalience(value);

      // Existing boosts
      salience += this.getFrameBoost(frame, value.name);
      salience += this.getRoleBoost(roles, value.name);

      // NEW: Domain boost
      if (this.domainLexicons[domain]) {
        salience += this.getDomainBoost(value, domain, text);
      }

      return { ...value, salience: Math.min(salience, 1.0) };
    });
  }

  getDomainBoost(value, domain, text) {
    const lexicon = this.domainLexicons[domain];
    let maxBoost = 0.0;

    Object.entries(lexicon.terms).forEach(([term, termData]) => {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        const boost = termData.boosts[value.name] || 0.0;
        if (boost > maxBoost) maxBoost = boost;
      }
    });

    return Math.min(maxBoost, 0.3);  // Cap domain boost at 0.3
  }
}
```

**Enhanced API**
```javascript
// Auto-detect domain
const result = TagTeam.parse("The patient needs informed consent for surgery");
// Detects medical context, applies medical lexicon

// Explicit domain
const result = TagTeam.parse("The patient needs informed consent for surgery", {
  domain: 'medical'  // Force medical domain
});

// Multiple domains
const result = TagTeam.parse("Medical malpractice lawsuit requires expert testimony", {
  domain: ['medical', 'legal']  // Combine lexicons
});
```

### Implementation Plan

**Week 3c.1: Lexicon Research & Curation (4 days)**
- [ ] Research medical ethics terminology
- [ ] Research legal ethics terminology
- [ ] Research business ethics terminology
- [ ] Map ~450 total terms to values
- [ ] Validate with domain experts (if available)

**Week 3c.2: Data File Creation (2 days)**
- [ ] Create medical-lexicon.json (~200 terms)
- [ ] Create legal-lexicon.json (~150 terms)
- [ ] Create business-lexicon.json (~100 terms)
- [ ] Validate JSON structure
- [ ] Add to data directory

**Week 3c.3: Domain Detection (2 days)**
- [ ] Implement automatic domain detection
- [ ] Use keyword hints (medical: "patient", "doctor"; legal: "court", "defendant")
- [ ] Confidence scoring
- [ ] Fallback to 'general' domain

**Week 3c.4: ValueScorer Enhancement (2 days)**
- [ ] Add domain lexicon support
- [ ] Implement getDomainBoost
- [ ] Update salience formula
- [ ] Test boost calculations

**Week 3c.5: Integration & Testing (3 days)**
- [ ] Update build.js to include domain lexicons
- [ ] Create domain-specific test scenarios
- [ ] Measure accuracy improvement
- [ ] Performance testing

### Expected Outcomes

**Metrics:**
- **Medical Context Accuracy:** +25% value detection
- **Legal Context Accuracy:** +20% value detection
- **Business Context Accuracy:** +15% value detection
- **Bundle Size:** +40-60KB (domain lexicons)
- **Parse Time:** +5-10ms (negligible)

**Benefits:**
- ✅ Better accuracy in specialized contexts
- ✅ Detects domain-specific ethical nuances
- ✅ Extensible (easy to add more domains)
- ✅ Backward compatible

---

## Combined Week 3 Roadmap

### Phased Approach (Recommended)

**Week 3a (Days 1-7): Semantic Intelligence**
- Lightweight embeddings
- Implicit value detection
- Higher recall

**Week 3b (Days 8-14): Multi-Sentence Context**
- Scenario-level analysis
- Cross-sentence aggregation
- Full context understanding

**Week 3c (Days 15-21): Domain Specialization**
- Medical/legal/business lexicons
- Domain-specific accuracy
- Extensible framework

### Parallel Approach (Fast Track)

**Team A:** Semantic Intelligence (1 person, 2 weeks)
**Team B:** Multi-Sentence Context (1 person, 1.5 weeks)
**Team C:** Domain Lexicons (1 person, 1.5 weeks)

**Result:** All three features in ~2 weeks (with team)

### Sequential Approach (Solo, Careful)

**Weeks 1-2:** Semantic Intelligence
**Week 3:** Multi-Sentence Context
**Week 4:** Domain Specialization
**Week 5:** Integration, testing, optimization

**Result:** Solid v3.0 in 5 weeks

---

## Version 3.0 Target Specs

### Bundle
- **Size:** <5.5 MB (vs 4.28 MB now)
- **Version:** 3.0.0
- **Format:** UMD (unchanged)
- **Dependencies:** 0 (unchanged)

### Performance
- **Parse Time (single sentence):** <80ms (vs 25-40ms now)
- **Parse Time (full scenario):** <200ms (new capability)
- **Memory:** <100 MB (should be fine)

### Accuracy
- **Scenario Coverage:** 95% (vs 75% now)
- **Average Values per Scenario:** 3.5 (vs 1.5 now)
- **Precision:** 85% (vs 100% now, acceptable trade-off)
- **Recall:** 75% (vs 45% now, major improvement)
- **F1 Score:** 80% (vs 62% now)

### Features
- ✅ Semantic value detection (implicit)
- ✅ Multi-sentence scenarios
- ✅ Domain-specific lexicons (medical, legal, business)
- ✅ Enhanced conflict detection (cross-sentence)
- ✅ Better stakeholder identification
- ✅ Backward compatible with v2.0

---

## Questions to Answer Before Starting

1. **Which path do you prefer?**
   - A: Semantic Intelligence (ML-light)
   - B: Multi-Sentence Context
   - C: Domain Specialization
   - D: Combination (which order?)

2. **What's your timeline?**
   - Fast: 2-3 weeks (aggressive)
   - Moderate: 4-6 weeks (comfortable)
   - Careful: 8-10 weeks (thorough)

3. **What's your priority?**
   - Better recall (detect more values)
   - Better context (full scenarios)
   - Better specialization (domains)
   - All three (comprehensive v3.0)

4. **Bundle size tolerance?**
   - Strict: Stay under 5 MB (limits embeddings)
   - Flexible: Up to 6 MB (allows full features)
   - No limit: Whatever it takes

5. **Performance tolerance?**
   - Strict: Stay under 100ms (may limit features)
   - Moderate: Up to 200ms acceptable
   - Flexible: Up to 500ms okay for complex scenarios

---

## My Recommendation

**Path:** Start with **Week 3b (Multi-Sentence Context)** first

**Why?**
1. **Easiest to implement** - builds on existing architecture
2. **Biggest bang for buck** - fixes the 5 "failed" scenarios immediately
3. **Low risk** - minimal bundle size increase, small performance impact
4. **High value** - dramatically improves real-world utility
5. **Foundation for other features** - sets up for 3a and 3c

**Then:** Week 3a (Semantic Intelligence)
**Finally:** Week 3c (Domain Specialization)

**Timeline:** 3-4 weeks total for complete v3.0

**What do you think?** Which direction excites you most?
