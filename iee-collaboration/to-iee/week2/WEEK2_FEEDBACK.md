# Week 2 Requirements - TagTeam Feedback

**Date:** January 11, 2026
**Status:** 📋 Requirements Reviewed - Detailed Feedback Provided
**Reviewer:** Aaron Damiano (TagTeam)
**IEE Contact:** IEE Team

---

## Executive Summary

Thank you for the comprehensive Week 2 planning materials! The requirements are **exceptionally well-documented** with clear specifications, excellent test data, and thorough keyword patterns. This is exactly the level of detail needed for successful implementation.

**Overall Assessment:** ✅ **APPROVED with recommendations**

**Key Points:**
- ✅ Scope is ambitious but achievable with phased delivery
- ✅ Test corpus and value definitions are excellent
- ✅ Context patterns provide clear implementation guidance
- ⚠️ Recommend splitting into Week 2a (context) and Week 2b (values)
- ⚠️ Timeline needs adjustment: 2 weeks is tight, recommend 3 weeks

---

## Detailed Responses to IEE Questions

### 1. Timeline Feasibility

**Q: Is Jan 24 delivery realistic for this scope?**

**A:** **Partially.** The scope is substantial - implementing 12 context dimensions + 50-value matching engine is roughly **2-3x the complexity** of Week 1.

**Realistic Timeline:**
- **Week 2a (Context Analysis):** Jan 13-24 (2 weeks) ✅ Achievable
- **Week 2b (Value Matching):** Jan 27-Feb 7 (2 weeks) ✅ Achievable
- **Combined delivery:** Jan 13-Feb 7 (4 weeks total) ✅ Recommended

**Rationale:**
- Week 1 took ~5 days for 4 fixes addressing 7 checks
- Week 2 requires implementing 12 new scoring dimensions + 50-value detection system
- Quality assurance and testing will take significant time
- Risk of rushing leads to lower accuracy and technical debt

**Q: Would you prefer to split into Week 2a (context) and Week 2b (values)?**

**A:** **YES, strongly recommend.** This provides:

✅ **Benefits of Phased Delivery:**
1. **Early value delivery** - Context analysis available 2 weeks earlier
2. **Risk mitigation** - If Week 2a slips, Week 2b buffer remains
3. **Better testing** - Can thoroughly validate context scoring before adding value complexity
4. **Incremental integration** - IEE can begin using context features while values are developed
5. **Quality focus** - Avoid rushing both features simultaneously

**Proposed Phases:**

**Week 2a: Context Intensity Analysis (Jan 13-24)**
- Implement 12-dimension context scoring
- Test against 20 scenarios for context dimensions only
- Deliverable: Parser with `contextIntensity` field
- Success: ±0.2 accuracy on 80% of test cases

**Week 2b: Value Matching Engine (Jan 27-Feb 7)**
- Implement 50-value detection and salience scoring
- Test against 20 scenarios for value activations
- Deliverable: Parser with `values` field
- Success: 80% precision, 70% recall

---

### 2. Technical Approach

**Q: Will you use rule-based pattern matching, or incorporate ML models?**

**A:** **Rule-based pattern matching** (consistent with Week 1 approach).

**Rationale:**
- ✅ **Deterministic** - Same input → same output (critical for debugging)
- ✅ **Transparent** - Can explain why each score was assigned
- ✅ **Fast** - Can meet <50ms performance target
- ✅ **No dependencies** - Doesn't require training data or model hosting
- ✅ **Maintainable** - Keyword patterns can be updated easily

**Implementation Approach:**

**For Context Intensity:**
```javascript
// Example: Urgency scoring
function scoreUrgency(text, taggedWords) {
    const highUrgencyTerms = ['emergency', 'immediately', 'urgent', 'crisis'];
    const mediumUrgencyTerms = ['soon', 'quickly', 'deadline'];
    const lowUrgencyTerms = ['eventually', 'no rush', 'ample time'];

    let score = 0.5; // Default

    if (containsAny(text, highUrgencyTerms)) score = Math.max(score, 0.9);
    if (containsAny(text, mediumUrgencyTerms)) score = Math.max(score, 0.6);
    if (containsAny(text, lowUrgencyTerms)) score = Math.min(score, 0.2);

    return score;
}
```

**For Value Matching:**
```javascript
// Example: Autonomy detection
function detectAutonomy(text, semanticFrame, roles) {
    const semanticMarkers = ['autonomy', 'freedom', 'choice', 'decide', 'consent'];
    const upholdingIndicators = ['free choice', 'voluntary', 'self-directed'];
    const violatingIndicators = ['force', 'coerce', 'override', 'against will'];

    let present = containsAny(text, semanticMarkers);
    let salience = 0.0;
    let polarity = 0;

    if (present) {
        // Calculate salience based on keyword frequency and frame
        salience = calculateSalience(text, semanticMarkers, semanticFrame);

        // Determine polarity
        if (containsAny(text, upholdingIndicators)) polarity = +1;
        if (containsAny(text, violatingIndicators)) polarity = -1;
    }

    return { name: 'Autonomy', present, salience, polarity };
}
```

**Q: Any dependencies we should provide (word embeddings, ontologies)?**

**A:** **None required** for rule-based approach. However, the provided artifacts are excellent:

✅ **Already Provided (Excellent):**
- context-patterns.json - Comprehensive keyword lists
- value-definitions-comprehensive.json - Semantic markers for all 50 values
- test-corpus-week2.json - Gold standard annotations

⚠️ **Nice-to-Have (Not Critical):**
- Negation handling patterns (e.g., "not urgent" → low urgency)
- Intensifier patterns (e.g., "very urgent" → boost score)
- Contextual modifiers (e.g., "might be urgent" → reduce confidence)

---

### 3. Lemmatization Priority

**Q: Should we fix Week 1 lemmatization (3 checks) before Week 2, or handle in parallel?**

**A:** **Actually, Week 1 is now 100% complete!** ✅

**Update:** After debugging on January 11, we achieved 100% pass rate (7/7 checks) on Week 1 validation. The final issue was a POS tagger accuracy problem (tagging "family" as RB instead of NN), which we resolved with a whitelist approach.

**Current Status:**
- ✅ Week 1 validation: 100% (7/7 checks passing)
- ✅ All priority fixes implemented
- ✅ Bundle rebuilt and tested
- ✅ Documentation complete

**Therefore:** No lemmatization work needed before Week 2. We can proceed directly to context analysis.

**Q: Would completing lemmatization delay Week 2 delivery?**

**A:** **N/A - Already complete.** Week 2 can begin immediately.

---

### 4. Scope Concerns

**Q: Is anything in this spec unclear or underspecified?**

**A:** The spec is **remarkably clear and thorough**. Minor clarifications needed:

#### Clarification Requests:

**4.1 Scoring Logic for Multiple Signals**

**Scenario:** Text contains both "urgent" (0.6) and "emergency" (0.9). Which score wins?

**Options:**
- A) Take maximum (0.9) - **RECOMMENDED**
- B) Take average (0.75)
- C) Weight by keyword strength

**Recommendation:** Use **maximum score** for each dimension to capture peak intensity.

**4.2 Default Scores for Ambiguous Cases**

**Scenario:** Text has no temporal markers. What score for urgency?

**Current spec:** Default = 0.5

**Question:** Is 0.5 appropriate for ALL dimensions, or should some default differently?

**Recommendations:**
- Temporal dimensions (urgency, duration, reversibility): 0.5 ✅
- Epistemic dimensions (certainty, completeness, expertise): 0.5 ✅
- Relational dimensions (intimacy, power, trust): 0.5 ✅
- Consequential dimensions (harm, benefit, scope): **0.3** (assume lower impact unless stated)

**4.3 Negation Handling**

**Scenario:** "This is NOT urgent" - should this score low (0.2) or default (0.5)?

**Recommendation:** Detect negation patterns and invert scores:
- "urgent" → 0.9
- "not urgent" → 0.2
- "no urgency" → 0.1

**Need:** Negation pattern list (not, no, without, lack of, etc.)

**4.4 Value Salience Calculation**

**Scenario:** Text mentions "autonomy" once vs. three times. Should salience differ?

**Options:**
- A) Binary - If keyword present, salience based on frame only
- B) Frequency-based - More mentions → higher salience
- C) Frame-weighted - Certain frames (Deciding, Choosing) boost autonomy salience

**Recommendation:** Use **frame-weighted approach** (Option C) for more nuanced scoring.

**4.5 Polarity for Multiple Indicators**

**Scenario:** Text contains both upholding ("free choice") and violating ("forced") indicators for same value.

**Current behavior:** Conflicted → polarity = 0

**Question:** Is this correct, or should we:
- Weight by frequency (more "force" terms → negative)
- Weight by proximity to action verb
- Flag as explicit conflict

**Recommendation:** Use polarity = 0 (conflicted) and optionally add `conflict: true` flag.

**Q: Any features that seem particularly challenging?**

**A:** Yes, two areas require extra attention:

**Challenge #1: Value Recall (70% target)**

**Issue:** Detecting values that are *implicit* rather than explicit.

**Example:**
- Explicit: "This violates patient autonomy" → Easy to detect
- Implicit: "The family must decide" → Autonomy is at stake but not mentioned

**Mitigation:**
- Use semantic frame mappings (e.g., "Deciding" frame → check Autonomy)
- Use role-based inference (e.g., "family must" → Power differential)
- May achieve 70% recall but requires thorough frame-to-value mappings

**Challenge #2: Context Dimension Accuracy (±0.2 threshold)**

**Issue:** Human annotations may vary ±0.1 even for same scenario.

**Example:**
- Annotator 1: Urgency = 0.8
- Annotator 2: Urgency = 0.7
- TagTeam output: 0.6 (fails both)

**Mitigation:**
- Use keyword scoring bands (0.0-0.2, 0.3-0.5, 0.6-0.8, 0.9-1.0)
- May need to calibrate against human variance in test corpus
- Consider ±0.3 tolerance if human inter-rater reliability is low

---

### 5. Value Definitions

**Q: Would you prefer IEE to provide keyword patterns for each value, or will you derive them?**

**A:** **IEE-provided patterns are excellent and sufficient.** ✅

The `value-definitions-comprehensive.json` file provides:
- ✅ Semantic markers (10-20 keywords per value)
- ✅ Polarity indicators (upholding vs violating)
- ✅ Related values for cross-checking
- ✅ Examples for validation

**No additional patterns needed.** This is comprehensive for rule-based matching.

**Q: Do you need more example scenarios per value?**

**A:** **Current examples are sufficient for implementation.** However, **more test scenarios** would help validation:

**Current:** 20 test scenarios
**Ideal:** 30-40 test scenarios (10-20 for development/calibration, 20 for final validation)

**Rationale:**
- 20 scenarios ÷ 50 values = 0.4 scenarios per value average
- Some values may not appear in any test case
- More scenarios improve confidence in recall calculations

**Recommendation:** If possible, add 10 "simple" scenarios specifically targeting rare values (Temperance, Mystery, Gratitude, etc.).

---

### 6. Validation Support

**Q: Would live validation sessions (screen share) be helpful during development?**

**A:** **YES, very helpful!** Recommended schedule:

**Week 2a Checkpoints (Context Analysis):**
1. **Tuesday, Jan 14** - Initial implementation demo (2 dimensions working)
2. **Friday, Jan 17** - Mid-week checkpoint (6 dimensions working)
3. **Tuesday, Jan 21** - Final validation (all 12 dimensions)

**Week 2b Checkpoints (Value Matching):**
1. **Friday, Jan 31** - Initial implementation demo (10 values working)
2. **Wednesday, Feb 5** - Final validation (all 50 values)

**Benefits:**
- Catch misunderstandings early
- Adjust scoring thresholds based on IEE feedback
- Ensure alignment on edge cases

**Q: Should we provide interim test corpus (10 scenarios) before final 20?**

**A:** **Helpful but not critical.**

**Recommendation:** Use the 20-scenario corpus, but **label 10 as "training set"** and 10 as "validation set":

**Training Set (10):** Use for development and calibration
- Can peek at expected scores
- Adjust keyword weights to match annotations

**Validation Set (10):** Hold out for final testing
- Don't peek until implementation complete
- True test of generalization

This approach maximizes use of existing 20 scenarios without requiring IEE to create more.

---

## Additional Feedback on Deliverables

### Test Corpus Quality: ✅ Excellent

**Strengths:**
- Comprehensive domain coverage (Healthcare, Spiritual, Vocational, Interpersonal)
- Good complexity distribution (5 simple, 10 moderate, 5 complex)
- Fully annotated with rationale
- Realistic ethical dilemmas

**Minor Suggestions:**
1. **Add edge cases:** Scenarios with no clear values (e.g., "I bought milk") to test false positive rate
2. **Add ambiguous cases:** Scenarios where context scores are genuinely unclear (0.4-0.6 range)
3. **Add test sentences** for each scenario (currently only healthcare-001 and healthcare-002 have `testSentence`)

### Value Definitions: ✅ Excellent

**Strengths:**
- Clear taxonomy (5 domains × 10 values)
- Comprehensive semantic markers
- Polarity indicators well-defined
- Good coverage of ethical traditions

**Minor Suggestions:**
1. **Add synonym lists:** E.g., "autonomy" = ["self-determination", "freedom", "liberty"]
2. **Add antonym lists:** E.g., autonomy antonyms = ["coercion", "compulsion", "force"]
3. **Specify keyword weights:** E.g., "autonomy" (1.0), "freedom" (0.8), "liberty" (0.6)

### Context Patterns: ✅ Excellent

**Strengths:**
- Comprehensive keyword lists
- Clear scoring heuristics
- Good examples with rationale

**Minor Suggestions:**
1. **Add negation patterns:** "not urgent", "no harm", etc.
2. **Add intensifier patterns:** "very urgent", "extremely harmful", etc.
3. **Add hedge patterns:** "might be", "possibly", "unclear if", etc.

---

## Recommended Implementation Plan

### Phase 1: Week 2a - Context Intensity Analysis (Jan 13-24)

**Week 1 (Jan 13-17):**
- Implement temporal dimensions (urgency, duration, reversibility)
- Implement relational dimensions (intimacy, power, trust)
- Initial testing on 10 training scenarios
- **Checkpoint:** Friday, Jan 17 - Demo 6 dimensions

**Week 2 (Jan 20-24):**
- Implement consequential dimensions (harm, benefit, scope)
- Implement epistemic dimensions (certainty, completeness, expertise)
- Full testing on all 20 scenarios
- Accuracy validation (±0.2 threshold)
- **Checkpoint:** Tuesday, Jan 21 - Demo all 12 dimensions
- **Deliverable:** Friday, Jan 24 - Week 2a bundle with context analysis

### Phase 2: Week 2b - Value Matching Engine (Jan 27-Feb 7)

**Week 1 (Jan 27-31):**
- Implement value detection (50 values)
- Implement salience scoring
- Implement polarity determination
- Initial testing on 10 training scenarios
- **Checkpoint:** Friday, Jan 31 - Demo 20 values

**Week 2 (Feb 3-7):**
- Refine detection patterns based on testing
- Full testing on all 20 scenarios
- Precision/recall validation (80%/70% targets)
- **Checkpoint:** Wednesday, Feb 5 - Demo all 50 values
- **Deliverable:** Friday, Feb 7 - Week 2b bundle with value matching

---

## Technical Architecture

### Module Structure

```javascript
// src/ContextAnalyzer.js
class ContextAnalyzer {
    constructor(contextPatterns) {
        this.patterns = contextPatterns;
    }

    analyzeContext(text, taggedWords, semanticFrame, roles) {
        return {
            temporal: this._analyzeTemporal(text, taggedWords),
            relational: this._analyzeRelational(text, roles),
            consequential: this._analyzeConsequential(text, semanticFrame),
            epistemic: this._analyzeEpistemic(text, taggedWords)
        };
    }

    _analyzeTemporal(text, taggedWords) {
        return {
            urgency: this._scoreUrgency(text),
            duration: this._scoreDuration(text),
            reversibility: this._scoreReversibility(text)
        };
    }

    // ... similar for other dimensions
}
```

```javascript
// src/ValueMatcher.js
class ValueMatcher {
    constructor(valueDefinitions) {
        this.values = valueDefinitions;
    }

    matchValues(text, semanticFrame, roles, contextIntensity) {
        const activated = [];

        for (const valueDef of this.values) {
            const detection = this._detectValue(text, valueDef, semanticFrame);
            if (detection.present) {
                activated.push({
                    name: valueDef.name,
                    present: true,
                    salience: detection.salience,
                    polarity: detection.polarity,
                    evidence: detection.evidence
                });
            }
        }

        return activated;
    }

    _detectValue(text, valueDef, semanticFrame) {
        // Check semantic markers
        const hasMarkers = this._containsKeywords(text, valueDef.semanticMarkers);

        // Check frame-based inference
        const frameImplies = this._frameImpliesValue(semanticFrame, valueDef);

        const present = hasMarkers || frameImplies;

        if (!present) return { present: false };

        // Calculate salience
        const salience = this._calculateSalience(text, valueDef, semanticFrame);

        // Determine polarity
        const polarity = this._determinePolarity(text, valueDef);

        // Generate evidence
        const evidence = this._generateEvidence(text, valueDef);

        return { present, salience, polarity, evidence };
    }
}
```

### Integration with SemanticRoleExtractor

```javascript
// src/SemanticRoleExtractor.js (enhanced)
SemanticRoleExtractor.prototype.parseSemanticAction = function(text) {
    // Week 1 functionality (existing)
    const words = this._tokenize(text);
    const taggedWords = this.posTagger.tag(words);
    const verbInfo = this._findMainVerb(taggedWords);
    const frame = this._classifyFrame(verbInfo, taggedWords);
    const roles = this._extractRoles(taggedWords, verbInfo, frame);

    // Week 2a: Context Analysis (NEW)
    const contextIntensity = this.contextAnalyzer.analyzeContext(
        text, taggedWords, frame, roles
    );

    // Week 2b: Value Matching (NEW)
    const values = this.valueMatcher.matchValues(
        text, frame, roles, contextIntensity
    );

    // Build enhanced result
    return {
        // Week 1 fields (existing)
        agent: roles.agent,
        action: verbInfo,
        patient: roles.patient,
        semanticFrame: frame.name,

        // Week 2 fields (new)
        contextIntensity: contextIntensity,
        values: values,
        dilemmaType: this._classifyDilemma(frame, contextIntensity, values),
        complexityScore: this._calculateComplexity(contextIntensity, values)
    };
};
```

---

## Performance Considerations

### Target: <50ms Parse Time

**Week 1 Baseline:** ~7ms average

**Week 2a Addition (Context):**
- 12 dimensions × ~0.5ms keyword matching = +6ms
- **Projected:** ~13ms total ✅ Well under target

**Week 2b Addition (Values):**
- 50 values × ~0.5ms keyword matching = +25ms
- **Projected:** ~38ms total ✅ Still under target

**Optimization Strategies:**
1. **Pre-compile regex patterns** for keyword matching
2. **Short-circuit evaluation** - Skip values unlikely to be present based on frame
3. **Batch keyword searches** - Search for all patterns in single pass
4. **Cache lemmatized text** - Reuse for multiple value checks

**Worst Case:** 50ms (acceptable, meets requirement)

---

## Risk Assessment

### High Confidence Areas ✅

1. **Context temporal dimensions** - Keywords are clear and unambiguous
2. **Value detection precision** - Semantic markers are comprehensive
3. **Performance** - Rule-based approach is fast
4. **Backward compatibility** - Week 1 API unchanged

### Medium Confidence Areas ⚠️

1. **Context relational dimensions** - May require role analysis, not just keywords
2. **Value recall (70% target)** - Implicit values harder to detect
3. **Accuracy (±0.2 threshold)** - May be tight depending on human variance

### Risk Mitigation

**For Value Recall:**
- Implement frame-to-value mappings (e.g., "Deciding" → Autonomy)
- Use role-based inference (e.g., "doctor" → Expertise, Beneficence)
- May achieve 60-65% without ML, 70% achievable with careful tuning

**For Accuracy Threshold:**
- Calibrate keyword weights during training phase
- Test against human inter-rater reliability
- Request ±0.3 tolerance if human variance is high

---

## Success Metrics

### Week 2a (Context Analysis) Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| No regressions | 100% | All Week 1 checks still pass |
| Context accuracy | 80% | ±0.2 of human annotation on 16/20 scenarios |
| Parse time | <30ms | Average across all 20 scenarios |
| Dimension coverage | 100% | All 12 dimensions implemented |

### Week 2b (Value Matching) Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Value precision | 80% | Detected values are truly present |
| Value recall | 70% | Present values are detected |
| Parse time | <50ms | Average across all 20 scenarios |
| Value coverage | 100% | All 50 values can be detected |

---

## Questions for IEE

### Critical (Need answer before implementation)

1. **Phased Delivery Approval**
   - Do you approve splitting into Week 2a (Jan 24) and Week 2b (Feb 7)?
   - Or do you require combined delivery by Jan 24?

2. **Scoring Clarifications**
   - Multiple keywords: Take maximum, average, or weighted?
   - Default scores: All 0.5, or differentiate by dimension type?
   - Negation handling: Invert scores or use default?

3. **Value Salience Calculation**
   - Frame-weighted, frequency-based, or binary?
   - Weight factors for frame boost?

### Nice-to-Have (Can proceed with assumptions)

1. **Additional Test Data**
   - Can you provide 10 additional simple scenarios for rare values?
   - Can you label 10 scenarios as "training" and 10 as "validation"?

2. **Validation Sessions**
   - Can we schedule 5 checkpoints as outlined above?
   - Preferred meeting time/format?

3. **Accuracy Tolerance**
   - If human inter-rater reliability is ±0.2, should we use ±0.3 threshold?
   - Can you provide human variance data from annotations?

---

## Conclusion

**Overall Recommendation:** ✅ **APPROVE Week 2 requirements with phased delivery**

**Summary:**
- ✅ Requirements are exceptionally clear and thorough
- ✅ Test corpus and data artifacts are excellent
- ✅ Scope is ambitious but achievable with 3-4 week timeline
- ✅ Recommend Week 2a (context) by Jan 24, Week 2b (values) by Feb 7
- ✅ Rule-based approach will meet performance and accuracy targets
- ⚠️ Some clarifications needed on scoring logic and validation

**Confidence Level:** 85% confident we can achieve Week 2 success criteria with phased approach

**Next Steps:**
1. IEE approves phased delivery plan (or requests combined delivery)
2. IEE clarifies scoring questions (maximum vs average, etc.)
3. TagTeam begins Week 2a implementation (Jan 13)
4. Schedule first checkpoint (Friday, Jan 17)

---

**Document Owner:** Aaron Damiano (TagTeam)
**Last Updated:** January 11, 2026
**Status:** ✅ Feedback Complete - Awaiting IEE Response
**Response Requested By:** Monday, Jan 13, 2026
