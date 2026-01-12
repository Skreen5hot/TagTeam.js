# Week 2 Implementation - Kickoff Document

**Date:** January 11, 2026
**Status:** ✅ Ready to Begin Implementation
**Timeline:** Week 2a (Jan 13-24), Week 2b (Jan 27-Feb 7)
**Team:** TagTeam Development

---

## Executive Summary

Week 2 planning is **complete and approved** by the IEE team. All technical clarifications have been resolved, supplemental data artifacts delivered, and validation checkpoints scheduled. We are ready to begin implementation on Monday, January 13, 2026.

**Phased Delivery Approved:**
- **Week 2a:** Context Intensity Analysis (Jan 13-24) - 12 dimensions
- **Week 2b:** Value Matching Engine (Jan 27-Feb 7) - 50 values

---

## What We're Building

### Week 2a: Context Intensity Analysis

**Goal:** Extract and score 12 dimensions of contextual factors (0.0-1.0 scale)

**12 Dimensions:**

**Temporal Context (3):**
1. Urgency - Time pressure for decision
2. Duration - Timespan of impact
3. Reversibility - Ability to undo decision

**Relational Context (3):**
4. Intimacy - Closeness of relationship
5. Power Differential - Imbalance in authority/vulnerability
6. Trust - Relational trust level

**Consequential Context (3):**
7. Harm Severity - Magnitude of potential negative impact
8. Benefit Magnitude - Magnitude of potential positive impact
9. Scope - Number of people affected

**Epistemic Context (3):**
10. Certainty - Confidence in facts/outcomes
11. Information Completeness - Availability of relevant information
12. Expertise - Agent's competence in domain

**Output Format:**
```javascript
result.contextIntensity = {
  temporal: { urgency: 0.9, duration: 0.8, reversibility: 1.0 },
  relational: { intimacy: 0.7, powerDifferential: 0.3, trust: 0.8 },
  consequential: { harmSeverity: 0.9, benefitMagnitude: 0.6, scope: 0.4 },
  epistemic: { certainty: 0.5, informationCompleteness: 0.7, expertise: 0.8 }
};
```

### Week 2b: Value Matching Engine

**Goal:** Identify which of 50 ethical values are activated and their salience/polarity

**50 Values Across 5 Domains:**
- **Dignity** (10): Human Dignity, Autonomy, Equality, Justice, Freedom, etc.
- **Care** (10): Compassion, Fidelity, Beneficence, Non-maleficence, etc.
- **Virtue** (10): Integrity, Honesty, Courage, Humility, Wisdom, etc.
- **Community** (10): Solidarity, Common Good, Stewardship, Peace, etc.
- **Transcendence** (10): Meaning, Spiritual Growth, Sacred/Holy, Hope, etc.

**Output Format:**
```javascript
result.values = [
  {
    name: "Autonomy",
    present: true,
    salience: 0.9,
    polarity: -1,  // -1 = violated, 0 = conflicted, +1 = upheld
    evidence: "Patient's wishes being overridden by family"
  }
];
```

---

## All Technical Decisions Resolved ✅

### Scoring Logic (All Questions Answered)

| Question | Decision | Implementation |
|----------|----------|----------------|
| **Multiple keywords?** | Take maximum | `score = Math.max(score, keywordScore)` |
| **Default scores?** | Differentiate by type | Temporal/Epistemic: 0.5, Relational: 0.3, Consequential: 0.3 |
| **Negation handling?** | Invert scores | "not urgent" → `1.0 - 0.9 = 0.1` |
| **Intensifiers?** | Boost by +0.15 | "very urgent" → `0.9 + 0.15 = 1.0` (capped) |
| **Hedges?** | Reduce by -0.15 | "somewhat urgent" → `0.9 - 0.15 = 0.75` |
| **Value salience?** | Frame-weighted + keyword frequency | Base + frame boost + role boost |
| **Polarity conflicts?** | Set polarity=0, add flag | `polarity: 0, conflict: true` |

### Default Scores by Dimension

```javascript
const DEFAULT_SCORES = {
  // Temporal - Neutral assumption
  urgency: 0.5,
  duration: 0.5,
  reversibility: 0.5,

  // Relational - Lower defaults (most scenarios = acquaintances)
  intimacy: 0.3,
  powerDifferential: 0.3,
  trust: 0.5,

  // Consequential - Lower defaults (assume less harm unless stated)
  harmSeverity: 0.3,
  benefitMagnitude: 0.3,
  scope: 0.2,  // Most scenarios = individual, not global

  // Epistemic - Neutral assumption
  certainty: 0.5,
  informationCompleteness: 0.5,
  expertise: 0.5
};
```

---

## Data Artifacts Provided by IEE

### 1. Test Corpus ✅
**File:** [iee-collaboration/from-iee/communication/test-corpus-week2.json](../iee-collaboration/from-iee/communication/test-corpus-week2.json)

**20 Scenarios:**
- Healthcare: 5 (end-of-life, triage, experimental treatment, etc.)
- Spiritual: 5 (faith crisis, conversion, abuse cover-up, etc.)
- Vocational: 5 (whistleblowing, fraud, discrimination, etc.)
- Interpersonal: 5 (infidelity, inheritance, addiction, etc.)

**Complexity:**
- Simple: 5 scenarios
- Moderate: 10 scenarios
- Complex: 5 scenarios

**Each Scenario Includes:**
- Test sentence
- Expected semantic roles
- Expected context intensity (12 dimensions with scores)
- Expected value activations (present, salience, polarity, evidence)

### 2. Value Definitions ✅
**File:** [iee-collaboration/from-iee/communication/value-definitions-comprehensive.json](../iee-collaboration/from-iee/communication/value-definitions-comprehensive.json)

**50 Values Each With:**
- Name and domain
- Definition (2-3 sentences)
- Semantic markers (10-20 keywords)
- Polarity indicators (upholding vs violating keywords)
- Related values
- Example scenarios

### 3. Context Patterns ✅
**File:** [iee-collaboration/from-iee/communication/context-patterns.json](../iee-collaboration/from-iee/communication/context-patterns.json)

**For Each of 12 Dimensions:**
- Keyword lists (high/medium/low)
- Scoring heuristics
- Negation patterns (22 patterns)
- Intensifiers (17 patterns: "very", "extremely", etc.)
- Hedges (15 patterns: "somewhat", "might", etc.)
- Default scores
- Examples with rationale

### 4. Frame-Value Boosts ✅
**File:** [iee-collaboration/from-iee/data/frame-value-boosts.json](../iee-collaboration/from-iee/data/frame-value-boosts.json)

**11 Semantic Frames Mapped to Values:**
- Deciding → Autonomy (+0.3), Freedom (+0.2)
- Offenses → Justice (+0.3), Non-maleficence (+0.2)
- Questioning → Integrity (+0.3), Authenticity (+0.3)
- Becoming_aware → Honesty (+0.3), Courage (+0.2)
- etc.

**30+ Role Types Mapped to Values:**
- doctor → Beneficence (+0.3), Expertise (+0.2)
- patient → Autonomy (+0.2), Vulnerability (+0.3)
- family → Care (+0.3), Solidarity (+0.2)
- etc.

---

## Implementation Architecture

### Module Structure

```
src/
├── SemanticRoleExtractor.js (existing - Week 1)
├── ContextAnalyzer.js (new - Week 2a)
│   ├── analyzeTemporal()
│   ├── analyzeRelational()
│   ├── analyzeConsequential()
│   └── analyzeEpistemic()
├── ValueMatcher.js (new - Week 2b)
│   ├── detectValue()
│   ├── calculateSalience()
│   └── determinePolarity()
└── PatternMatcher.js (new - Week 2 utility)
    ├── containsKeywords()
    ├── handleNegation()
    ├── applyIntensifiers()
    └── applyHedges()
```

### Integration Points

**SemanticRoleExtractor.js Enhancement:**
```javascript
SemanticRoleExtractor.prototype.parseSemanticAction = function(text) {
    // Week 1 - Existing (no changes)
    const words = this._tokenize(text);
    const taggedWords = this.posTagger.tag(words);
    const verbInfo = this._findMainVerb(taggedWords);
    const frame = this._classifyFrame(verbInfo, taggedWords);
    const roles = this._extractRoles(taggedWords, verbInfo, frame);

    // Week 2a - Context Analysis (NEW)
    const contextIntensity = this.contextAnalyzer.analyzeContext(
        text, taggedWords, frame, roles
    );

    // Week 2b - Value Matching (NEW)
    const values = this.valueMatcher.matchValues(
        text, frame, roles, contextIntensity
    );

    return {
        // Week 1 output (unchanged)
        agent: roles.agent,
        action: verbInfo,
        patient: roles.patient,
        semanticFrame: frame.name,

        // Week 2a output (new)
        contextIntensity: contextIntensity,

        // Week 2b output (new)
        values: values
    };
};
```

---

## Week 2a Implementation Plan (Jan 13-24)

### Week 1: Jan 13-17

**Monday, Jan 13:**
- ✅ Create `src/ContextAnalyzer.js` module
- ✅ Create `src/PatternMatcher.js` utility
- ✅ Load context-patterns.json data
- ✅ Implement temporal dimension scoring (urgency, duration, reversibility)

**Tuesday, Jan 14:**
- ✅ Implement relational dimension scoring (intimacy, power, trust)
- ✅ Add negation handling
- ✅ Test on first 5 scenarios (healthcare domain)

**Wednesday, Jan 15:**
- ✅ Implement consequential dimension scoring (harm, benefit, scope)
- ✅ Add intensifier/hedge handling
- ✅ Test on next 5 scenarios (spiritual domain)

**Thursday, Jan 16:**
- ✅ Implement epistemic dimension scoring (certainty, completeness, expertise)
- ✅ Test on next 5 scenarios (vocational domain)
- ✅ Prepare demo for Friday checkpoint

**Friday, Jan 17:**
- 📍 **CHECKPOINT:** Demo 6 dimensions to IEE (3:00 PM)
- ✅ Address feedback from checkpoint
- ✅ Test on final 5 scenarios (interpersonal domain)

### Week 2: Jan 20-24

**Monday, Jan 20:**
- ✅ Complete all 12 dimensions
- ✅ Full integration testing with Week 1 baseline
- ✅ Verify no regressions on Week 1 tests

**Tuesday, Jan 21:**
- 📍 **CHECKPOINT:** Demo all 12 dimensions to IEE (2:00 PM)
- ✅ Accuracy validation against 20 test scenarios
- ✅ Calculate ±0.2 accuracy rate (target: 80% of cases)

**Wednesday, Jan 22:**
- ✅ Fix any accuracy issues identified
- ✅ Performance optimization (target: <30ms)
- ✅ Documentation updates

**Thursday, Jan 23:**
- ✅ Final testing and validation
- ✅ Bundle rebuild (dist/tagteam.js)
- ✅ Create Week 2a test file (test-week2a-context.html)

**Friday, Jan 24:**
- 📦 **DELIVERY:** Week 2a bundle with context analysis
- 📄 Documentation: WEEK2A_IMPLEMENTATION.md
- 📊 Test results: Context accuracy report

---

## Week 2b Implementation Plan (Jan 27-Feb 7)

### Week 1: Jan 27-31

**Monday, Jan 27:**
- ✅ Create `src/ValueMatcher.js` module
- ✅ Load value-definitions-comprehensive.json data
- ✅ Load frame-value-boosts.json data
- ✅ Implement keyword-based value detection (Dignity domain - 10 values)

**Tuesday, Jan 28:**
- ✅ Implement salience calculation (base + frame boost + role boost)
- ✅ Implement polarity determination (upholding/violating indicators)
- ✅ Test on 5 healthcare scenarios

**Wednesday, Jan 29:**
- ✅ Implement Care domain (10 values)
- ✅ Implement Virtue domain (10 values)
- ✅ Test on 5 spiritual scenarios

**Thursday, Jan 30:**
- ✅ Implement Community domain (10 values)
- ✅ Implement Transcendence domain (10 values)
- ✅ Test on 5 vocational scenarios
- ✅ Prepare demo for Friday checkpoint

**Friday, Jan 31:**
- 📍 **CHECKPOINT:** Demo 20+ values to IEE (3:00 PM)
- ✅ Address feedback from checkpoint
- ✅ Test on 5 interpersonal scenarios

### Week 2: Feb 3-7

**Monday, Feb 3:**
- ✅ Complete all 50 values
- ✅ Implement conflict detection (polarity = 0, conflict = true)
- ✅ Full integration testing

**Tuesday, Feb 4:**
- ✅ Precision/recall validation
- ✅ Calculate metrics against 20 test scenarios
- ✅ Target: 80% precision, 70% recall

**Wednesday, Feb 5:**
- 📍 **CHECKPOINT:** Demo all 50 values to IEE (2:00 PM)
- ✅ Fix any detection issues
- ✅ Performance optimization (target: <50ms total)

**Thursday, Feb 6:**
- ✅ Final testing and validation
- ✅ Bundle rebuild (dist/tagteam.js)
- ✅ Create Week 2b test file (test-week2b-values.html)
- ✅ Documentation updates

**Friday, Feb 7:**
- 📦 **DELIVERY:** Week 2b bundle with value matching
- 📄 Documentation: WEEK2B_IMPLEMENTATION.md
- 📊 Test results: Precision/recall report

---

## Success Criteria

### Week 2a: Context Intensity Analysis

| Metric | Target | Validation |
|--------|--------|------------|
| **No regressions** | 100% | All Week 1 checks still pass (100% on 7/7) |
| **Context accuracy** | 80% | ±0.2 of human annotation on 16/20 scenarios |
| **Dimension coverage** | 100% | All 12 dimensions implemented |
| **Parse time** | <30ms | Average across 20 scenarios |

### Week 2b: Value Matching

| Metric | Target | Validation |
|--------|--------|------------|
| **No regressions** | 100% | Week 1 + 2a checks still pass |
| **Value precision** | 80% | Detected values are truly present |
| **Value recall** | 70% | Present values are detected |
| **Value coverage** | 100% | All 50 values can be detected |
| **Parse time** | <50ms | Average across 20 scenarios |

---

## Validation Checkpoints

**5 Scheduled Checkpoints with IEE:**

1. **Friday, Jan 17 @ 3:00 PM** - 6 dimensions demo (temporal + relational)
2. **Tuesday, Jan 21 @ 2:00 PM** - All 12 dimensions demo
3. **Friday, Jan 24** - Week 2a delivery and acceptance
4. **Friday, Jan 31 @ 3:00 PM** - 20+ values demo
5. **Wednesday, Feb 5 @ 2:00 PM** - All 50 values demo

**Format:** Screen share, live demo, Q&A, feedback collection

---

## Key Implementation Notes

### Pattern Matching Logic

**Context Scoring:**
```javascript
function scoreUrgency(text) {
    let score = 0.5; // Default

    // Check high urgency keywords
    if (containsAny(text, ['emergency', 'life or death'])) {
        score = Math.max(score, 0.9);
    }
    if (containsAny(text, ['urgent', 'critical'])) {
        score = Math.max(score, 0.6);
    }

    // Handle negation
    if (containsPattern(text, /not\s+urgent/i)) {
        score = 1.0 - score; // Invert
    }

    // Apply intensifiers
    if (containsAny(text, ['very', 'extremely'])) {
        score = Math.min(score + 0.15, 1.0);
    }

    // Apply hedges
    if (containsAny(text, ['somewhat', 'might be'])) {
        score = Math.max(score - 0.15, 0.0);
    }

    return score;
}
```

**Value Salience:**
```javascript
function calculateSalience(text, valueDef, frame, roles) {
    let salience = 0.0;

    // Base: Keyword frequency
    const keywordMatches = countKeywords(text, valueDef.semanticMarkers);
    salience += Math.min(keywordMatches * 0.2, 0.5);

    // Frame boost
    const frameBoost = getFrameBoost(frame.name, valueDef.name);
    salience += frameBoost;

    // Role boost
    const roleBoost = getRoleBoost(roles, valueDef.name);
    salience += roleBoost;

    // Cap at 1.0
    return Math.min(salience, 1.0);
}
```

---

## Risk Mitigation

### Known Challenges

**1. Value Recall (70% target)**
- **Challenge:** Implicit values harder to detect than explicit
- **Mitigation:** Use frame-value-boosts.json for inference
- **Backup:** If 65-68%, IEE may accept with explanation

**2. Context Accuracy (±0.2 threshold)**
- **Challenge:** Human annotations may have ±0.1 variance
- **Mitigation:** Calibrate during training phase
- **Backup:** Request ±0.3 tolerance if needed

**3. Performance (<50ms)**
- **Challenge:** 50 values × keyword matching
- **Mitigation:** Pre-compile regexes, batch searches
- **Confidence:** High - Week 1 is 7ms, budget allows 43ms for new features

---

## Next Steps

### Immediate (Today - Jan 11)
- ✅ Week 2 planning complete
- ✅ All technical decisions resolved
- ✅ Data artifacts received and reviewed
- ✅ Kickoff document created

### Monday, Jan 13 (Week 2a Start)
1. Create new branch: `feature/week2a-context-analysis`
2. Set up ContextAnalyzer.js module structure
3. Load context-patterns.json data
4. Begin temporal dimension implementation
5. Write first unit tests

### Friday, Jan 17 (First Checkpoint)
- Demo 6 dimensions working
- Show test results on 10 scenarios
- Get IEE feedback on scoring accuracy
- Adjust keyword weights if needed

---

## Resources

### Code Files (Week 1 Baseline)
- [src/SemanticRoleExtractor.js](../src/SemanticRoleExtractor.js) - Main parser (Week 1)
- [dist/tagteam.js](../dist/tagteam.js) - Production bundle
- [test-week1-fixes.html](../test-week1-fixes.html) - Week 1 validation (100% pass)

### IEE Data Artifacts
- [test-corpus-week2.json](../iee-collaboration/from-iee/communication/test-corpus-week2.json) - 20 test scenarios
- [value-definitions-comprehensive.json](../iee-collaboration/from-iee/communication/value-definitions-comprehensive.json) - 50 values
- [context-patterns.json](../iee-collaboration/from-iee/communication/context-patterns.json) - 12 dimension patterns
- [frame-value-boosts.json](../iee-collaboration/from-iee/data/frame-value-boosts.json) - Frame/role boosts

### Documentation
- [WEEK2_REQUIREMENTS.md](../iee-collaboration/from-iee/communication/WEEK2_REQUIREMENTS.md) - Full specifications
- [WEEK2_FEEDBACK.md](../iee-collaboration/to-iee/week2/WEEK2_FEEDBACK.md) - Our feedback
- [WEEK2_IEE_RESPONSE.md](../iee-collaboration/from-iee/communication/WEEK2_IEE_RESPONSE.md) - IEE clarifications
- [WEEK2_PLANNING_SUMMARY.md](../iee-collaboration/from-iee/communication/WEEK2_PLANNING_SUMMARY.md) - Overview

---

## Confidence Level

**95% Confident** in Week 2 success with phased approach:

✅ **Strengths:**
- Comprehensive requirements and data artifacts
- All technical decisions resolved
- Realistic timeline (3-4 weeks, not rushed)
- Phased delivery reduces risk
- Rule-based approach is proven (Week 1: 100% pass)
- Strong IEE support and collaboration

⚠️ **Risks:**
- Value recall may land at 65-70% vs 70% target
- Context accuracy variance (human ±0.1 may affect ±0.2 threshold)

**Mitigation:**
- Frame-value boosts will help recall
- Can request ±0.3 tolerance if needed
- Checkpoints allow mid-course corrections

---

**Status:** ✅ Ready to Begin
**Start Date:** Monday, January 13, 2026
**First Checkpoint:** Friday, January 17, 2026 @ 3:00 PM
**Week 2a Delivery:** Friday, January 24, 2026
**Week 2b Delivery:** Friday, February 7, 2026

**Document Owner:** Aaron Damiano (TagTeam)
**Last Updated:** January 11, 2026
