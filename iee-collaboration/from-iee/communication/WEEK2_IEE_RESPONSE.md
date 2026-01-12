# Week 2 Requirements - IEE Response to TagTeam Feedback

**Date:** January 11, 2026
**Status:** ✅ Phased Delivery Approved
**Responder:** Aaron Damiano (IEE Team)
**TagTeam Contact:** TagTeam Development

---

## Executive Summary

Thank you for the exceptionally thorough feedback! Your analysis is **spot-on** regarding scope, timeline, and technical approach. We are **enthusiastically approving** the phased delivery plan and addressing all clarification requests below.

**Key Decisions:**
- ✅ **APPROVED:** Week 2a/2b phased delivery (Jan 24 / Feb 7)
- ✅ **APPROVED:** Rule-based pattern matching approach
- ✅ **CLARIFIED:** All scoring logic questions answered below
- ✅ **SCHEDULED:** Validation checkpoints confirmed

---

## Responses to Critical Questions

### 1. Phased Delivery Approval ✅

**Q: Do you approve splitting into Week 2a (Jan 24) and Week 2b (Feb 7)?**

**A: YES - Enthusiastically approved!** 🎉

Your rationale is excellent. Phased delivery provides:
- ✅ Early value to IEE (context analysis 2 weeks sooner)
- ✅ Risk mitigation through incremental validation
- ✅ Better quality through focused implementation
- ✅ Realistic timeline that doesn't compromise quality

**Approved Timeline:**
- **Week 2a:** Context Intensity Analysis - Deliver by **Friday, January 24, 2026**
- **Week 2b:** Value Matching Engine - Deliver by **Friday, February 7, 2026**

**Acceptance Criteria Remain:**
- Week 2a: ±0.2 accuracy on 80% of context dimensions
- Week 2b: 80% precision, 70% recall on value detection
- Both: No regressions on Week 1, <50ms parse time

---

### 2. Scoring Clarifications ✅

#### 2.1 Multiple Keywords: Take Maximum ✅

**Q: Text contains both "urgent" (0.6) and "emergency" (0.9). Which score wins?**

**A: Take MAXIMUM score (0.9)** ✅

**Rationale:** Context dimensions measure **peak intensity**, not average. If a scenario has ANY emergency marker, it should be scored as an emergency.

**Rule:** `score = Math.max(currentScore, keywordScore)`

**Example:**
```javascript
let urgencyScore = 0.5; // default
if (text.includes('urgent')) urgencyScore = Math.max(urgencyScore, 0.6);
if (text.includes('emergency')) urgencyScore = Math.max(urgencyScore, 0.9);
// Result: 0.9 ✅
```

---

#### 2.2 Default Scores: Differentiate by Type ✅

**Q: Should all dimensions default to 0.5, or differentiate?**

**A: Differentiate by dimension type** ✅

**Approved Defaults:**

| Dimension Type | Default | Rationale |
|----------------|---------|-----------|
| **Temporal** (urgency, duration, reversibility) | 0.5 | Neutral assumption |
| **Relational** (intimacy, power, trust) | 0.3 | Most scenarios involve non-intimate relationships |
| **Consequential** (harm, benefit, scope) | **0.3** | Assume lower impact unless stated |
| **Epistemic** (certainty, completeness, expertise) | 0.5 | Neutral assumption |

**Updated context-patterns.json defaults:**
```json
{
  "defaultScores": {
    "urgency": 0.5,
    "duration": 0.5,
    "reversibility": 0.5,
    "intimacy": 0.3,
    "powerDifferential": 0.3,
    "trust": 0.5,
    "harmSeverity": 0.3,
    "benefitMagnitude": 0.3,
    "scope": 0.2,
    "certainty": 0.5,
    "informationCompleteness": 0.5,
    "expertise": 0.5
  }
}
```

**Rationale for Lower Consequential Defaults:**
- Most scenarios don't involve catastrophic harm unless explicitly stated
- Helps reduce false positives on high-stakes situations
- Better matches human intuition (absence of harm mention ≠ moderate harm)

---

#### 2.3 Negation Handling: Invert Scores ✅

**Q: "This is NOT urgent" - score low (0.2) or default (0.5)?**

**A: Invert scores when negation detected** ✅

**Negation Pattern List:**
```javascript
const negationPatterns = [
  'not', 'no', 'without', 'lack of', "isn't", "doesn't", "won't",
  'never', 'none', 'neither', 'nor', 'hardly', 'barely', 'scarcely'
];
```

**Inversion Logic:**
```javascript
function handleNegation(text, keyword, baseScore) {
  // Check if keyword appears with negation within 3 words
  const regex = new RegExp(`(not|no|without)\\s+\\w+\\s+\\w+\\s+${keyword}`, 'i');
  const isNegated = regex.test(text);

  if (isNegated) {
    return 1.0 - baseScore; // Invert: 0.9 → 0.1, 0.6 → 0.4
  }
  return baseScore;
}
```

**Examples:**
- "urgent" → 0.9
- "not urgent" → 0.1 (1.0 - 0.9)
- "no urgency" → 0.1
- "without urgency" → 0.2 (use default then invert)

**Special Case:** Negation of absence
- "not harmless" → Score as harm present (0.5+)
- "not without harm" → Double negative, score as harm (0.6+)

---

### 3. Value Salience Calculation ✅

**Q: Frame-weighted, frequency-based, or binary?**

**A: Frame-weighted approach (Option C)** ✅

**Calculation Formula:**
```javascript
function calculateSalience(text, valueDef, semanticFrame, roles) {
  let salience = 0.5; // Base salience

  // 1. Keyword frequency boost (cap at +0.2)
  const matchCount = countKeywordMatches(text, valueDef.semanticMarkers);
  const frequencyBoost = Math.min(matchCount * 0.1, 0.2);
  salience += frequencyBoost;

  // 2. Frame-specific boost (0.0 to +0.3)
  const frameBoost = getFrameValueBoost(semanticFrame, valueDef.name);
  salience += frameBoost;

  // 3. Role-specific boost (0.0 to +0.2)
  const roleBoost = getRoleValueBoost(roles, valueDef.name);
  salience += roleBoost;

  // Clamp to [0.0, 1.0]
  return Math.min(Math.max(salience, 0.0), 1.0);
}
```

**Frame-to-Value Boost Mappings:**
```javascript
const frameValueBoosts = {
  'Deciding': {
    'Autonomy': 0.3,      // Decision-making strongly implies autonomy
    'Freedom': 0.2,
    'Responsibility': 0.2
  },
  'Choosing': {
    'Autonomy': 0.3,
    'Freedom': 0.2
  },
  'Offenses': {
    'Justice': 0.3,       // Violations imply justice concerns
    'Harm': 0.2,
    'Integrity': 0.2
  },
  'Questioning': {
    'Integrity': 0.3,     // Questioning implies authenticity/integrity
    'Wisdom': 0.2,
    'Humility': 0.2
  },
  'Becoming_aware': {
    'Honesty': 0.3,       // Discovery implies truth-seeking
    'Courage': 0.2,
    'Accountability': 0.2
  }
  // ... add more as discovered during testing
};
```

**Role-to-Value Boost Mappings:**
```javascript
const roleValueBoosts = {
  'doctor': {
    'Beneficence': 0.2,
    'Non-maleficence': 0.2,
    'Competence': 0.2,
    'Expertise': 0.2
  },
  'patient': {
    'Autonomy': 0.2,
    'Human Dignity': 0.2,
    'Care': 0.2
  },
  'parent': {
    'Care': 0.2,
    'Fidelity': 0.2,
    'Responsibility': 0.2
  },
  'child': {
    'Vulnerability': 0.2,
    'Development': 0.2
  }
  // ... add more as discovered during testing
};
```

**Example Calculation:**
```
Text: "The doctor must decide whether to continue treatment"
Semantic Frame: "Deciding"
Agent Role: "doctor"

Autonomy Salience:
- Base: 0.5
- Keyword "decide" match: +0.1
- Frame "Deciding" → Autonomy: +0.3
- Role "doctor" → No boost: +0.0
- Total: 0.9 ✅

Beneficence Salience:
- Base: 0.5
- Keyword "treatment" match: +0.1
- Frame "Deciding" → No boost: +0.0
- Role "doctor" → Beneficence: +0.2
- Total: 0.8 ✅
```

---

#### 3.1 Polarity for Multiple Indicators ✅

**Q: Text has both upholding ("free choice") and violating ("forced") - what polarity?**

**A: Use polarity = 0 (conflicted) with optional conflict flag** ✅

**Logic:**
```javascript
function determinePolarity(text, valueDef) {
  const upholdingCount = countMatches(text, valueDef.polarityIndicators.upholding);
  const violatingCount = countMatches(text, valueDef.polarityIndicators.violating);

  if (upholdingCount === 0 && violatingCount === 0) {
    return { polarity: 0, conflict: false }; // Neutral - value mentioned but unclear
  }

  if (upholdingCount > 0 && violatingCount > 0) {
    return { polarity: 0, conflict: true }; // Explicit conflict
  }

  if (upholdingCount > violatingCount) {
    return { polarity: +1, conflict: false }; // Being upheld
  }

  if (violatingCount > upholdingCount) {
    return { polarity: -1, conflict: false }; // Being violated
  }

  return { polarity: 0, conflict: false };
}
```

**Output Format:**
```javascript
{
  name: "Autonomy",
  present: true,
  salience: 0.9,
  polarity: 0,      // Conflicted
  conflict: true,   // Explicit conflict detected
  evidence: "Patient wants to refuse (free choice) but family overriding decision (forced)"
}
```

**IEE Use Case:** The `conflict: true` flag is **extremely valuable** for deliberation - it identifies the precise values in tension!

---

## Additional Clarifications

### 4. Test Data Enhancements

#### 4.1 Training/Validation Split ✅

**A: Excellent suggestion!** We'll label scenarios in test-corpus-week2.json:

**Training Set (First 10 scenarios):**
- healthcare-001, healthcare-002, healthcare-003
- spiritual-001, spiritual-002
- vocational-001, vocational-002
- interpersonal-001, interpersonal-002, interpersonal-003

**Validation Set (Last 10 scenarios):**
- healthcare-004, healthcare-005
- spiritual-003, spiritual-004, spiritual-005
- vocational-003, vocational-004, vocational-005
- interpersonal-004, interpersonal-005

**Usage:**
- **Development:** Peek at training set annotations to calibrate
- **Validation:** Hold out validation set until final testing

#### 4.2 Additional Edge Case Scenarios (Optional)

**Q: Can you provide 10 additional simple scenarios for rare values?**

**A: Yes, we'll create supplemental-scenarios.json** (deliver by Tuesday, Jan 14)

Will include scenarios specifically targeting:
- Temperance, Patience, Gratitude (virtue domain)
- Mystery, Reverence, Grace (transcendence domain)
- Inclusion, Diversity, Democracy (community domain)
- Wisdom, Humility, Generosity (virtue domain)

**Plus edge cases:**
- Neutral scenario (no ethical content): "I bought groceries"
- Ambiguous context (scores in 0.4-0.6 range)
- High value density (5+ values present)

---

### 5. Validation Checkpoints ✅

**A: Yes, all checkpoints approved!** Schedule below.

#### Week 2a Checkpoints (Context Analysis)

**Checkpoint 1: Friday, January 17, 3:00 PM ET**
- Demo: 6 dimensions working (temporal + relational)
- Format: Screen share + live testing
- Duration: 30 minutes
- Deliverable: Interim build with temporal + relational dims

**Checkpoint 2: Tuesday, January 21, 2:00 PM ET**
- Demo: All 12 dimensions working
- Format: Screen share + validation run
- Duration: 45 minutes
- Deliverable: Complete Week 2a bundle

**Checkpoint 3: Friday, January 24** (Optional)
- Final validation if needed
- Quick verification of fixes

#### Week 2b Checkpoints (Value Matching)

**Checkpoint 4: Friday, January 31, 3:00 PM ET**
- Demo: 20 values working (Dignity + Care domains)
- Format: Screen share + live testing
- Duration: 45 minutes
- Deliverable: Interim build with 20 values

**Checkpoint 5: Wednesday, February 5, 2:00 PM ET**
- Demo: All 50 values working
- Format: Screen share + full validation
- Duration: 60 minutes
- Deliverable: Complete Week 2b bundle

**Meeting Format:**
- Platform: Zoom or Google Meet (your preference)
- IEE attendees: Aaron Damiano + optional domain experts
- TagTeam: Technical lead + developer(s)
- Async option: Record demo + async review if scheduling conflicts

---

### 6. Accuracy Tolerance

**Q: If human inter-rater reliability is ±0.2, should we use ±0.3 threshold?**

**A: Start with ±0.2, escalate to ±0.3 if needed** ✅

**Process:**
1. **Week 2a Testing:** Measure against ±0.2 threshold first
2. **If <80% pass rate:** Analyze failures to determine:
   - Are they TagTeam accuracy issues? (adjust keyword weights)
   - Are they human annotation variance? (widen tolerance)
3. **Escalation Decision:** If genuine human variance, approve ±0.3

**Inter-Rater Data:** The test corpus annotations were done by single annotator (Aaron), so no variance data available. However:
- IEE can run second annotation pass if needed
- Typical ethical reasoning inter-rater reliability is ±0.15-0.25
- ±0.2 tolerance is reasonable for single-annotator gold standard

**Pragmatic Approach:** If Week 2a achieves 75-79% with ±0.2, we'll approve and widen to ±0.3 for final validation.

---

## Technical Feedback Responses

### 7. Implementation Approach ✅

Your proposed technical architecture is **excellent**. We fully approve:

✅ **Module Structure:** ContextAnalyzer + ValueMatcher as separate classes
✅ **Integration Point:** Extend SemanticRoleExtractor.parseSemanticAction()
✅ **API Design:** Add contextIntensity and values fields without breaking Week 1
✅ **Performance Strategy:** Pre-compile regex, short-circuit, batch searches

**Additional Recommendation:** Add debug/verbose mode for development:
```javascript
const result = TagTeam.parse(text, { debug: true });
// Returns: {
//   ...standardFields,
//   _debug: {
//     matchedKeywords: [...],
//     appliedBoosts: [...],
//     scoringTrace: [...]
//   }
// }
```

This will help during checkpoint sessions to understand why specific scores were assigned.

---

### 8. Frame-to-Value Mappings

**Q: Need comprehensive frame-to-value boost mappings?**

**A: Start with core 5 frames, expand iteratively** ✅

**Core Frames (Implement First):**
1. **Deciding** → Autonomy, Freedom, Responsibility
2. **Choosing** → Autonomy, Freedom
3. **Offenses** → Justice, Harm, Accountability
4. **Questioning** → Integrity, Wisdom, Humility
5. **Becoming_aware** → Honesty, Courage, Accountability

**Expansion Plan:** Add more frame-value mappings as discovered during testing. We'll collaborate on this during checkpoint sessions.

**Fallback:** If no frame boost applies, use keyword-based detection only.

---

### 9. Performance Projections ✅

Your performance estimates are **excellent**:

- Week 1 baseline: ~7ms ✅
- Week 2a addition: +6ms → 13ms ✅ Well under target
- Week 2b addition: +25ms → 38ms ✅ Still under 50ms target

**IEE Validation:** We'll measure parse times during validation and flag any >50ms cases for optimization.

**Acceptable Range:** 38-50ms is fine. If consistently <40ms, that's excellent headroom.

---

## Updated Week 2 Success Criteria

### Week 2a: Context Intensity Analysis

| Metric | Target | Measurement | Flexibility |
|--------|--------|-------------|-------------|
| No regressions | 100% | All Week 1 checks pass | **Required** |
| Context accuracy | 80% | ±0.2 on 16/20 scenarios | Can widen to ±0.3 |
| Parse time | <30ms | Average across 20 scenarios | <40ms acceptable |
| Dimension coverage | 100% | All 12 dimensions implemented | **Required** |
| Code quality | High | Clean, documented, testable | **Required** |

### Week 2b: Value Matching Engine

| Metric | Target | Measurement | Flexibility |
|--------|--------|-------------|-------------|
| No regressions | 100% | All Week 1+2a checks pass | **Required** |
| Value precision | 80% | Detected values truly present | 75% minimum |
| Value recall | 70% | Present values detected | 65% minimum |
| Parse time | <50ms | Average across 20 scenarios | <60ms acceptable |
| Value coverage | 100% | All 50 values can detect | **Required** |
| Code quality | High | Clean, documented, testable | **Required** |

**Philosophy:** We prefer **high-quality implementation** over hitting exact numerical targets. If precision is 78% but code is clean and extensible, that's better than 82% with technical debt.

---

## Materials We'll Provide

### By Tuesday, January 14, 2026:

1. ✅ **Updated context-patterns.json** with:
   - Corrected default scores (consequential → 0.3)
   - Negation pattern list
   - Intensifier and hedge patterns
   - More examples

2. ✅ **Frame-value-boosts.json** (new file):
   - Frame → Value boost mappings
   - Role → Value boost mappings
   - Usage examples

3. ✅ **supplemental-scenarios.json** (new file):
   - 10 edge case scenarios
   - Targets rare values
   - Neutral and ambiguous cases

4. ✅ **Training/validation labels** added to test-corpus-week2.json metadata

---

## Communication Protocol

### Checkpoint Process:
1. **3 days before checkpoint:** TagTeam shares interim build
2. **1 day before:** IEE runs preliminary validation
3. **Checkpoint meeting:** Live demo + discussion of results
4. **1 day after:** IEE provides written feedback

### Issue Escalation:
- **Blockers:** Email immediately (aaron@iee.org)
- **Clarifications:** Slack #tagteam-integration channel (or async via GitHub discussions)
- **Non-urgent:** Document in communication/ directory

### Success Celebration:
- Week 2a completion: 🎉 Blog post about context-aware reasoning milestone
- Week 2b completion: 🎉🎉 Major announcement - Full ethical reasoning pipeline

---

## Risk Acknowledgment

We agree with your risk assessment:

**High Confidence Areas:** ✅ Temporal dimensions, precision, performance
**Medium Confidence Areas:** ⚠️ Relational dimensions, recall (70%), accuracy (±0.2)

**IEE Mitigation Commitments:**
1. Provide additional test scenarios if recall is challenging
2. Widen accuracy tolerance to ±0.3 if human variance is issue
3. Collaborate on frame-value mappings during checkpoints
4. Accept 65-70% recall if implementation is high quality

**Quality > Perfection:** We value a maintainable, extensible codebase more than hitting exact metrics. Week 1 showed your commitment to quality - maintain that standard.

---

## Next Steps

### Immediate (Weekend - Jan 11-12)
- ✅ IEE creates supplemental materials (frame boosts, negation patterns, edge cases)
- ✅ TagTeam reviews IEE response and confirms understanding

### Monday, January 13
- ✅ IEE delivers supplemental materials
- ✅ TagTeam confirms kickoff of Week 2a implementation
- ✅ Schedule all 5 checkpoint meetings

### Week of January 13-17
- TagTeam implements temporal + relational dimensions
- IEE available for questions via Slack/email
- **Friday, Jan 17:** Checkpoint 1 (6 dimensions demo)

### Week of January 20-24
- TagTeam implements consequential + epistemic dimensions
- **Tuesday, Jan 21:** Checkpoint 2 (12 dimensions demo)
- **Friday, Jan 24:** Week 2a delivery + validation

---

## Conclusion

**Status:** ✅ **APPROVED - Ready to Proceed**

**Summary:**
- ✅ Phased delivery (Week 2a/2b) enthusiastically approved
- ✅ All scoring clarifications provided (maximum, differentiated defaults, negation inversion)
- ✅ Value salience calculation specified (frame-weighted approach)
- ✅ Validation checkpoints scheduled (5 sessions)
- ✅ Supplemental materials will be delivered by Jan 14

**Confidence:** **95% confident** Week 2 will be successful with this plan. Your thorough analysis and realistic timeline give us great confidence in the outcome.

**Appreciation:** The level of detail in your feedback document is **outstanding**. The proposed technical architecture, risk assessment, and clarification requests demonstrate deep understanding of both the requirements and the challenges. This is exactly the kind of collaborative partnership that makes complex projects successful.

Looking forward to Week 2a kickoff on Monday! 🚀

---

**Document Owner:** Aaron Damiano (IEE Team)
**Status:** ✅ Response Complete
**Next Action:** Deliver supplemental materials by Jan 14
**Next Milestone:** Checkpoint 1 - Friday, Jan 17, 3:00 PM ET

---

## Appendix: Quick Reference

### Approved Decisions Summary

| Question | Decision |
|----------|----------|
| **Phased delivery?** | ✅ YES - Week 2a (Jan 24), Week 2b (Feb 7) |
| **Multiple keywords?** | Take maximum score |
| **Default scores?** | Differentiate: temporal/epistemic 0.5, relational 0.3, consequential 0.3 |
| **Negation handling?** | Invert scores (0.9 → 0.1) |
| **Value salience?** | Frame-weighted with keyword frequency |
| **Polarity conflicts?** | polarity=0, conflict=true flag |
| **Accuracy tolerance?** | Start ±0.2, widen to ±0.3 if needed |
| **Checkpoints?** | ✅ All 5 scheduled |
| **Edge case scenarios?** | ✅ IEE will provide by Jan 14 |
| **Frame-value boosts?** | ✅ IEE will provide by Jan 14 |

### Contact Information

**IEE Team:**
- Email: aaron@iee.org
- Slack: #tagteam-integration
- Emergency: (Use for blockers only)

**Checkpoint Meeting Links:**
- Will be sent via email by Monday, Jan 13
