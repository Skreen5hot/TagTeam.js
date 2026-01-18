# Week 2b Implementation Plan - Value Matching Engine

**Date:** January 12, 2026
**Planning Session:** Tuesday, Jan 21, 2:00 PM ET
**Implementation Period:** Jan 22 - Feb 7, 2026
**Delivery Date:** February 7, 2026

---

## Executive Summary

Week 2b will implement a **50-value ethical matching engine** that detects and scores ethical values across 5 domains, applies frame/role-based boosts, and generates composite ethical profiles.

**Complexity Assessment:** Similar to Week 2a (12 dimensions → 50 values = ~4x scale, but similar architecture)

**Confidence Level:** HIGH - Pattern matching approach proven successful in Week 2a (100% accuracy)

---

## Deliverables

### 1. Code Components

| Component | Size Est. | Description |
|-----------|----------|-------------|
| `ValueMatcher.js` | ~20 KB | Core value detection using keyword patterns |
| `ValueScorer.js` | ~15 KB | Applies frame/role boosts and generates scores |
| `EthicalProfiler.js` | ~10 KB | Composite profile generation |
| Updated `SemanticRoleExtractor.js` | +50 lines | Integration layer |
| Updated `dist/tagteam.js` | +45 KB | Bundled with all features |

**Total New Code:** ~45 KB (compared to Week 2a: +30 KB)

### 2. API Output

New field added to `TagTeam.parse()` result:

```javascript
{
  // ... existing fields (agent, action, contextIntensity, etc.)

  ethicalProfile: {
    values: {
      // 50 values with scores (0.0-1.0)
      autonomy: 0.85,
      beneficence: 0.72,
      // ... all 50 values
    },
    topValues: [
      { value: 'autonomy', score: 0.85, domain: 'Healthcare' },
      { value: 'beneficence', score: 0.72, domain: 'Healthcare' },
      { value: 'justice', score: 0.68, domain: 'Healthcare' }
    ],
    dominantDomain: 'Healthcare',
    conflictScore: 0.35,  // 0.0 = aligned, 1.0 = high conflict
    confidence: 0.92
  }
}
```

### 3. Documentation

- `WEEK2B_COMPLETE.md` - Completion report
- `VALUE_MATCHING_GUIDE.md` - Technical documentation
- `API_REFERENCE.md` - Updated with ethicalProfile
- Test suite with 20 IEE scenarios

---

## Technical Architecture

### Phase 1: Value Detection (Jan 22-24)

**Component:** `ValueMatcher.js`

**Approach:** Pattern-based keyword matching (proven in Week 2a)

**Input:**
- Text to analyze
- Tagged words (from POSTagger)
- Semantic frame (from SemanticRoleExtractor)
- Extracted roles

**Process:**
1. Load value definitions from `value-definitions-comprehensive.json`
2. For each of 50 values:
   - Check keyword matches using PatternMatcher
   - Detect polarity (positive/negative indicators)
   - Apply negation handling
   - Generate base score (0.0-1.0)
3. Return initial value scores

**Data Structure:**
```javascript
{
  autonomy: {
    baseScore: 0.6,
    matches: ['choice', 'decide'],
    polarity: 'positive',
    domain: 'Healthcare'
  },
  // ... for all 50 values
}
```

**Success Criteria:**
- All 50 values have detection logic
- Keywords from IEE's value-definitions.json integrated
- Polarity detection working (positive vs. negative value activation)

---

### Phase 2: Frame & Role Boosts (Jan 25-28)

**Component:** `ValueScorer.js`

**Approach:** Apply multiplicative boosts based on semantic context

**Input:**
- Base value scores (from ValueMatcher)
- Semantic frame (e.g., "Deciding", "Harming")
- Extracted roles (e.g., {agent: "doctor", patient: "patient"})
- Frame-value boosts mapping
- Role-value boosts mapping

**Process:**
1. Load `frame-value-boosts.json`
2. For each detected value:
   - Check if current frame has boost for this value
   - Apply frame boost (e.g., Deciding → Autonomy +0.3)
3. Load role-value mappings
4. For each role (agent, patient, recipient):
   - Check if role has value boost (e.g., doctor → Beneficence +0.3)
   - Apply role boost
5. Normalize scores to 0.0-1.0 range
6. Return boosted value scores

**Boost Application Strategy:**

**Option A: Additive**
```javascript
finalScore = min(baseScore + frameBoost + roleBoost, 1.0)
```

**Option B: Multiplicative**
```javascript
finalScore = baseScore * (1 + frameBoost) * (1 + roleBoost)
```

**Option C: Weighted Average**
```javascript
finalScore = (baseScore * 0.6) + (frameBoost * 0.2) + (roleBoost * 0.2)
```

**Question for IEE:** Which boost strategy do you prefer? (Recommend Option A for simplicity)

**Success Criteria:**
- Frame boosts correctly applied for all 11 frames
- Role boosts correctly applied for 30+ roles
- Scores remain in 0.0-1.0 range
- Multiple boosts combine logically

---

### Phase 3: Composite Profile Generation (Jan 29-31)

**Component:** `EthicalProfiler.js`

**Approach:** Aggregate and analyze value scores

**Input:**
- Final value scores (after boosts)
- Value definitions (domain mappings)

**Process:**
1. **Top Values Identification**
   - Sort all 50 values by score
   - Return top 3-5 (configurable)

2. **Domain Analysis**
   - Group values by domain (Healthcare, Spiritual, etc.)
   - Calculate average score per domain
   - Identify dominant domain

3. **Conflict Detection**
   - Check for competing high-scoring values
   - Examples:
     - Autonomy (0.9) vs. Beneficence (0.9) = moderate conflict
     - Justice (0.8) vs. Mercy (0.8) = value tension
   - Generate conflict score (0.0-1.0)

4. **Confidence Calculation**
   - Based on number of keyword matches
   - Higher matches = higher confidence
   - Account for text length

**Output Structure:**
```javascript
{
  values: { /* all 50 scores */ },
  topValues: [
    { value: 'autonomy', score: 0.85, domain: 'Healthcare', keywords: ['choice', 'decide'] },
    { value: 'beneficence', score: 0.72, domain: 'Healthcare', keywords: ['help', 'benefit'] },
    { value: 'justice', score: 0.68, domain: 'Healthcare', keywords: ['fair', 'equitable'] }
  ],
  dominantDomain: 'Healthcare',
  domainScores: {
    Healthcare: 0.75,
    Spiritual: 0.23,
    Vocational: 0.18,
    Interpersonal: 0.31,
    Civic: 0.15
  },
  conflictScore: 0.35,
  conflicts: [
    { value1: 'autonomy', value2: 'beneficence', tension: 0.6 }
  ],
  confidence: 0.92
}
```

**Success Criteria:**
- Top values accurately reflect scenario
- Domain detection correct
- Conflict detection identifies value tensions
- Confidence scores reasonable

---

### Phase 4: Integration & Testing (Feb 1-5)

**Component:** Integration with `SemanticRoleExtractor.js`

**Process:**
1. Add ValueMatcher, ValueScorer, EthicalProfiler to constructor
2. Call value matching after context analysis:
   ```javascript
   // Week 2a
   const contextIntensity = this.contextAnalyzer.analyzeContext(...);

   // Week 2b (NEW)
   const ethicalProfile = this.ethicalProfiler.generateProfile(
       text, taggedWords, frame, roles, contextIntensity
   );
   ```
3. Add `ethicalProfile` to result object
4. Update build.js to bundle new modules
5. Rebuild dist/tagteam.js

**Testing:**
- Test on all 20 IEE scenarios
- Verify accuracy (target: 80% within ±0.2)
- Check edge cases (negation, ambiguity)
- Validate conflict detection
- Performance testing (parsing speed)

**Success Criteria:**
- 80%+ accuracy on IEE test corpus
- No regression on Week 1 or Week 2a features
- Bundle size reasonable (<5 MB)
- Performance acceptable (<100ms per parse)

---

### Phase 5: Documentation & Delivery (Feb 6-7)

**Deliverables:**
1. **WEEK2B_COMPLETE.md** - Completion report
2. **VALUE_MATCHING_GUIDE.md** - Technical guide
3. **Updated API_REFERENCE.md**
4. **test-week2b-values.html** - Test suite
5. **Updated GitHub Pages** - Live demo

---

## Timeline & Checkpoints

| Date | Milestone | Deliverable |
|------|-----------|-------------|
| Jan 21 | Planning session | Architecture approved |
| Jan 24 | Phase 1 checkpoint | ValueMatcher working (50 values detected) |
| Jan 28 | Phase 2 checkpoint | Frame/role boosts applied |
| Jan 31 | Phase 3 checkpoint | Composite profiles generated |
| Feb 5 | Phase 4 checkpoint | Integration complete, testing done |
| Feb 7 | **Week 2b delivery** | **Full package delivered** |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Value definition ambiguity | Medium | Medium | Clarify in Jan 21 meeting |
| Boost strategy unclear | Low | Medium | Propose options, get IEE approval |
| Conflict detection complex | Medium | Low | Start simple, iterate if needed |
| Performance issues (50 values) | Low | Medium | Use same pattern matching as Week 2a |
| Test accuracy below 80% | Low | High | Iterate on keywords, leverage Week 2a success |

**Overall Risk:** LOW - Similar architecture to successful Week 2a

---

## Technical Questions for IEE Team

### 1. Value Scoring Strategy

**Question:** How should we combine base scores with frame/role boosts?

**Options:**
- A) Additive: `score + frameBoost + roleBoost` (capped at 1.0)
- B) Multiplicative: `score * (1 + frameBoost) * (1 + roleBoost)`
- C) Weighted: `(score * 0.6) + (boost * 0.4)`

**Recommendation:** Option A (simplest, most interpretable)

### 2. Polarity Handling

**Question:** How should we handle negative value activation?

**Example:** "The decision violated autonomy"

**Options:**
- A) Negative score (-0.5 to 0.0 range)
- B) Separate `valueViolations` field
- C) Lower score (0.0-0.3 range)

**Recommendation:** Option B (clearest semantics)

### 3. Conflict Detection

**Question:** What threshold defines a "conflict"?

**Options:**
- A) Two values both >0.7 and typically opposed
- B) Distance from ideal value profile
- C) Custom conflict pairs defined in data

**Recommendation:** Option C (most accurate, data-driven)

### 4. Top Values Count

**Question:** How many top values should we return?

**Options:**
- A) Fixed (top 3)
- B) Dynamic (all values >0.5)
- C) Configurable (default 5, user can override)

**Recommendation:** Option C (most flexible)

### 5. Domain Detection

**Question:** If values from multiple domains are high, how determine dominant?

**Options:**
- A) Highest single value's domain
- B) Average score per domain
- C) Weighted by value importance

**Recommendation:** Option B (most stable)

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Value detection accuracy | 80% | % of values within ±0.2 on test corpus |
| Boost application accuracy | 90% | % of boosts correctly applied |
| Top values accuracy | 85% | Top-3 matches expected values |
| Domain detection accuracy | 90% | Dominant domain correct |
| Conflict detection accuracy | 75% | Known conflicts identified |
| Performance | <100ms | Parse time per scenario |
| Bundle size | <5 MB | Total bundle size |

---

## Dependencies

### From IEE Team
- ✅ `value-definitions-comprehensive.json` - Received
- ✅ `frame-value-boosts.json` - Received
- ✅ Test corpus with expected value scores
- ⏳ Clarifications on boost strategy (Jan 21 meeting)
- ⏳ Conflict pairs definition (if using Option C)

### From TagTeam
- ✅ Week 2a codebase (PatternMatcher, ContextAnalyzer)
- ✅ Proven pattern matching approach
- ⏳ Week 2b modules (to be built)

---

## Open Questions

1. **Value Negation:** Should "violated X" create negative score or separate field?
2. **Boost Limits:** Can boosts push scores above 1.0, or should we cap?
3. **Confidence Threshold:** At what confidence should we warn "low confidence"?
4. **Missing Values:** How to handle when no values are detected (all scores = 0)?
5. **Performance:** Acceptable max parse time?
6. **Output Format:** Any preference on decimal places (0.85 vs 0.8523)?

---

## Next Steps

### Before Jan 21 Meeting
- [x] Create implementation plan
- [ ] Create API mockups (separate doc)
- [ ] Create architecture diagrams (separate doc)
- [ ] Create technical questions doc (separate doc)
- [ ] Review all IEE data files in detail

### During Jan 21 Meeting
- [ ] Present architecture
- [ ] Get answers to technical questions
- [ ] Agree on boost strategy
- [ ] Confirm timeline and checkpoints
- [ ] Identify any missing requirements

### After Jan 21 Meeting
- [ ] Update plan based on feedback
- [ ] Begin Phase 1 implementation (Jan 22)

---

**Prepared by:** TagTeam Development Team
**Date:** January 12, 2026
**Status:** Draft for Jan 21 Planning Session
**Version:** 1.0
