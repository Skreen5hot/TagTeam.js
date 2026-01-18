# Week 2b Technical Questions for IEE Team

**Date:** January 12, 2026
**Planning Session:** Tuesday, Jan 21, 2:00 PM ET
**Purpose:** Clarify technical decisions before Week 2b implementation

---

## Category 1: Value Scoring Strategy

### Question 1.1: Boost Application Method

**Context:** When a value has a base score from keyword matching, and we have both frame and role boosts available, how should we combine them?

**Example Scenario:**
```
Text: "The doctor must allocate the last ventilator"
Value: "beneficence"
- Base score (from keywords): 0.60
- Frame boost (Resource_allocation): +0.25
- Role boost (doctor): +0.30
```

**Options:**

**A) Additive (Simple)**
```javascript
finalScore = min(baseScore + frameBoost + roleBoost, 1.0)
         = min(0.60 + 0.25 + 0.30, 1.0)
         = 1.0
```
✅ **Pros:** Simple, interpretable, predictable
❌ **Cons:** Can quickly saturate at 1.0

**B) Multiplicative (Dampened)**
```javascript
finalScore = baseScore * (1 + frameBoost) * (1 + roleBoost)
         = 0.60 * 1.25 * 1.30
         = 0.975
```
✅ **Pros:** More nuanced, avoids saturation
❌ **Cons:** Less intuitive, low base scores stay low

**C) Weighted Average (Balanced)**
```javascript
finalScore = (baseScore * 0.6) + (frameBoost * 0.2) + (roleBoost * 0.2)
         = (0.60 * 0.6) + (0.25 * 0.2) + (0.30 * 0.2)
         = 0.47
```
✅ **Pros:** Balanced, prevents over-boosting
❌ **Cons:** Boosts have less impact

**D) Maximum (Conservative)**
```javascript
finalScore = max(baseScore, baseScore + frameBoost, baseScore + roleBoost)
         = max(0.60, 0.85, 0.90)
         = 0.90
```
✅ **Pros:** Uses strongest signal, clear logic
❌ **Cons:** Ignores boost combinations

**TagTeam Recommendation:** **Option A (Additive)** - Simplest and most interpretable. Saturation at 1.0 is acceptable since it represents "maximum value activation."

**IEE Decision:** _________________

---

### Question 1.2: Boost Capping

**Context:** Should individual boosts or final scores have limits?

**Options:**

**A) Cap final score at 1.0 only**
```javascript
frameBoost = 0.5  // No limit on individual boosts
finalScore = min(baseScore + frameBoost, 1.0)
```

**B) Cap boosts at 0.5 each, final at 1.0**
```javascript
frameBoost = min(rawBoost, 0.5)
finalScore = min(baseScore + frameBoost, 1.0)
```

**C) No caps (allow >1.0 for strong signals)**
```javascript
finalScore = baseScore + frameBoost  // Could be 1.5
// Later normalize all scores to 0.0-1.0 range
```

**TagTeam Recommendation:** **Option A** - Cap only final score. Simple and allows data to dictate boost sizes.

**IEE Decision:** _________________

---

## Category 2: Polarity and Negation

### Question 2.1: Negative Value Activation

**Context:** How should we handle scenarios where a value is violated or negated?

**Example:**
```
"The decision violated patient autonomy"
```

**Options:**

**A) Negative Scores (-1.0 to 0.0)**
```javascript
values: {
  autonomy: -0.8  // Negative = violation
}
```
✅ **Pros:** Clear semantics, tracks violations
❌ **Cons:** Complex, breaks 0.0-1.0 convention

**B) Separate `valueViolations` Field**
```javascript
ethicalProfile: {
  values: {
    autonomy: 0.2  // Low score
  },
  valueViolations: {
    autonomy: 0.8  // High violation
  }
}
```
✅ **Pros:** Clear separation, maintains conventions
❌ **Cons:** Doubles output size

**C) Low Scores (0.0-0.3) for Violations**
```javascript
values: {
  autonomy: 0.1  // Low = violation
}
```
✅ **Pros:** Simple, single field
❌ **Cons:** Ambiguous (low score vs. violation vs. not present)

**D) Polarity Indicator with Score**
```javascript
values: {
  autonomy: {
    score: 0.8,
    polarity: 'negative'  // or 'positive'
  }
}
```
✅ **Pros:** Explicit polarity, clear meaning
❌ **Cons:** More complex output structure

**TagTeam Recommendation:** **Option B (Separate field)** - Clearest semantics. Most useful for ethical analysis.

**IEE Decision:** _________________

---

### Question 2.2: Negation Strength

**Context:** Should we have degrees of negation?

**Examples:**
- "violated autonomy" (strong negation)
- "not fully respecting autonomy" (weak negation)
- "somewhat undermined autonomy" (moderate negation)

**Options:**

**A) Binary (Negated or Not)**
```javascript
negated: true/false
```

**B) Scaled (Negation Strength)**
```javascript
negationStrength: 0.0-1.0
```

**TagTeam Recommendation:** **Option A (Binary)** for Week 2b. Can add Option B later if needed.

**IEE Decision:** _________________

---

## Category 3: Conflict Detection

### Question 3.1: Conflict Definition

**Context:** What constitutes an ethical "conflict"?

**Options:**

**A) Predefined Conflict Pairs**
```javascript
// From IEE data
conflictPairs = [
  {values: ['autonomy', 'beneficence'], description: '...'},
  {values: ['justice', 'mercy'], description: '...'},
  ...
]
```
Then check if both values in pair have high scores (>0.7)

✅ **Pros:** Accurate, domain-informed
❌ **Cons:** Requires IEE to define all pairs

**B) High Competing Values (Automatic)**
```javascript
// Any two values from different domains both >0.7
if (value1.score > 0.7 && value2.score > 0.7 && value1.domain != value2.domain) {
  → potential conflict
}
```
✅ **Pros:** Automatic, finds unexpected conflicts
❌ **Cons:** Many false positives

**C) Hybrid Approach**
```javascript
// Use predefined pairs (high confidence)
// Plus automatic detection (flag for review)
conflicts: [
  {type: 'known', values: [...], confidence: 0.9},
  {type: 'detected', values: [...], confidence: 0.5}
]
```
✅ **Pros:** Best of both worlds
❌ **Cons:** More complex

**TagTeam Recommendation:** **Option A (Predefined)** for Week 2b. IEE provides conflict pairs in data.

**IEE Decision:** _________________

**Follow-up:** Can IEE provide a `conflict-pairs.json` file with known ethical tensions?

---

### Question 3.2: Conflict Scoring

**Context:** How to calculate the `conflictScore` (0.0-1.0)?

**Options:**

**A) Maximum Tension**
```javascript
conflictScore = max(all detected conflict tensions)
```

**B) Average Tension**
```javascript
conflictScore = average(all detected conflict tensions)
```

**C) Weighted by Value Importance**
```javascript
conflictScore = sum(tension * valueImportance) / totalWeight
```

**TagTeam Recommendation:** **Option A (Maximum)** - Most conservative, highlights strongest conflict.

**IEE Decision:** _________________

---

## Category 4: Output Structure

### Question 4.1: Output Verbosity

**Context:** How much detail should the `ethicalProfile` include?

**Option A: Minimal (Default)**
```javascript
ethicalProfile: {
  values: { /* all 50 scores */ },
  topValues: [
    { value: 'autonomy', score: 0.85 }
  ],
  dominantDomain: 'Healthcare',
  conflictScore: 0.65,
  confidence: 0.92
}
```
~200 bytes

**Option B: Standard**
```javascript
ethicalProfile: {
  values: { /* all 50 scores */ },
  topValues: [
    { value: 'autonomy', score: 0.85, domain: 'Healthcare', keywords: [...] }
  ],
  dominantDomain: 'Healthcare',
  domainScores: { Healthcare: 0.75, ... },
  conflictScore: 0.65,
  conflicts: [ /* conflict details */ ],
  confidence: 0.92
}
```
~500 bytes

**Option C: Verbose (Debug)**
```javascript
ethicalProfile: {
  values: { /* all 50 with metadata */ },
  topValues: [ /* with keywords, boosts, etc. */ ],
  dominantDomain: 'Healthcare',
  domainScores: { /* all 5 */ },
  conflictScore: 0.65,
  conflicts: [ /* all details */ ],
  confidence: 0.92,
  metadata: {
    totalKeywordMatches: 47,
    valuesDetected: 38,
    frameBoostsApplied: 8,
    roleBoostsApplied: 12,
    processingTime: 42
  }
}
```
~1 KB

**TagTeam Recommendation:** **Option B (Standard)** by default, with optional verbose mode via parameter.

**IEE Decision:** _________________

---

### Question 4.2: Top Values Count

**Context:** How many "top values" should we return?

**Options:**

**A) Fixed Count (e.g., top 5)**
```javascript
topValues: [ /* exactly 5 */ ]
```
✅ **Pros:** Predictable, easy to display
❌ **Cons:** Arbitrary threshold

**B) Dynamic (all values >0.5)**
```javascript
topValues: [ /* variable count, all >0.5 */ ]
```
✅ **Pros:** Semantically meaningful
❌ **Cons:** Variable output size

**C) Configurable (default 5, user can override)**
```javascript
TagTeam.parse(text, { topValuesCount: 10 })
```
✅ **Pros:** Flexible
❌ **Cons:** More API complexity

**TagTeam Recommendation:** **Option C** - Default 5, configurable for power users.

**IEE Decision:** _________________

---

## Category 5: Domain Analysis

### Question 5.1: Dominant Domain Selection

**Context:** If multiple domains have similar scores, how to pick dominant?

**Example:**
```
domainScores: {
  Healthcare: 0.72,
  Vocational: 0.70,
  Interpersonal: 0.68
}
```

**Options:**

**A) Highest Average (Simple)**
```javascript
dominantDomain = domain with highest average score
// → Healthcare (0.72)
```

**B) Weighted by Top Values**
```javascript
dominantDomain = domain with most values in top 5
```

**C) Threshold-Based**
```javascript
if (max - secondMax < 0.1) {
  dominantDomain = 'Mixed'
} else {
  dominantDomain = highest
}
```

**TagTeam Recommendation:** **Option C** - Acknowledges close calls with "Mixed" domain.

**IEE Decision:** _________________

---

### Question 5.2: Domain Count

**Context:** IEE data has 5 domains (Healthcare, Spiritual, Vocational, Interpersonal, Civic). Are all equally important?

**Options:**

**A) All 5 domains equal**
```javascript
domainScores: { Healthcare: X, Spiritual: Y, ... }
```

**B) Weight domains by context**
```javascript
// Healthcare scenarios boost Healthcare domain scores
domainWeights = {
  Healthcare: 1.2,  // 20% boost in medical scenarios
  ...
}
```

**TagTeam Recommendation:** **Option A** - Equal weighting. Context is already captured via frame/role boosts.

**IEE Decision:** _________________

---

## Category 6: Performance and Optimization

### Question 6.1: Acceptable Parse Time

**Context:** Week 2a parses in ~15-25ms. Week 2b will be slower (50 values vs. 12 dimensions).

**What is the maximum acceptable parse time?**

**Options:**
- A) <50ms (very fast, may need optimization)
- B) <100ms (fast enough for interactive use)
- C) <500ms (acceptable for batch processing)

**TagTeam Recommendation:** **Option B (<100ms)** - Target 50-80ms, acceptable up to 100ms.

**IEE Decision:** _________________

---

### Question 6.2: Early Termination

**Context:** Should we skip low-scoring values to improve performance?

**Example:**
```javascript
// After initial pass, if value score <0.1, skip boost application
if (baseScore < 0.1) {
  finalScore = 0.0;  // Don't waste time on boosts
}
```

**Options:**
- A) Yes, use early termination (threshold: 0.1)
- B) No, process all 50 values fully
- C) Make it configurable

**TagTeam Recommendation:** **Option A** - Early termination at 0.1 threshold. Saves ~30% processing time.

**IEE Decision:** _________________

---

## Category 7: Data Files and Formats

### Question 7.1: Conflict Pairs Definition

**Does IEE team have or can provide a `conflict-pairs.json` file?**

**Desired Format:**
```javascript
{
  "conflicts": [
    {
      "value1": "autonomy",
      "value2": "beneficence",
      "description": "Patient self-determination vs. medical paternalism",
      "severity": 0.8
    },
    {
      "value1": "justice",
      "value2": "mercy",
      "description": "Fairness vs. compassion",
      "severity": 0.7
    },
    // ... more pairs
  ]
}
```

**IEE Response:** _________________

---

### Question 7.2: Value Importance Weights

**Should some values be weighted higher than others?**

**Example:**
```javascript
// In healthcare scenarios, is "sanctityOfLife" more important than "sustainability"?
valueWeights: {
  sanctityOfLife: 1.5,
  sustainability: 0.8
}
```

**Options:**
- A) Yes, provide weights
- B) No, all values equal
- C) Context-dependent (different weights per domain)

**TagTeam Recommendation:** **Option B** - Start with equal weights. Can add weights in future iteration.

**IEE Decision:** _________________

---

## Category 8: Edge Cases

### Question 8.1: No Values Detected

**Context:** What if text doesn't activate any values?

**Example:**
```
TagTeam.parse("The sky is blue");
```

**Options:**

**A) Return empty/null profile**
```javascript
ethicalProfile: null
```

**B) Return all zeros**
```javascript
ethicalProfile: {
  values: { autonomy: 0, beneficence: 0, ... },
  topValues: [],
  confidence: 0
}
```

**C) Return defaults (0.1 for all)**
```javascript
ethicalProfile: {
  values: { autonomy: 0.1, beneficence: 0.1, ... },
  topValues: [],
  confidence: 0.2
}
```

**TagTeam Recommendation:** **Option A (null)** - Clearest signal that no ethical content detected.

**IEE Decision:** _________________

---

### Question 8.2: Very Short Text

**Context:** Minimum text length for meaningful analysis?

**Options:**
- A) No minimum (try to analyze anything)
- B) Minimum 10 characters
- C) Minimum 3 words

**TagTeam Recommendation:** **Option A** - Analyze all text, rely on confidence scores to indicate reliability.

**IEE Decision:** _________________

---

## Category 9: Testing and Validation

### Question 9.1: Test Corpus Format

**Do the 20 IEE test scenarios include expected value scores?**

**Desired Format:**
```javascript
{
  "id": "healthcare-001",
  "text": "The family must decide...",
  "expectedValues": {
    "autonomy": 0.75,
    "beneficence": 0.65,
    // ... expected scores for all relevant values
  },
  "expectedTopValues": ["autonomy", "dignity", "sanctityOfLife"],
  "expectedDominantDomain": "Healthcare"
}
```

**IEE Response:** _________________

---

### Question 9.2: Accuracy Target

**What accuracy threshold for Week 2b acceptance?**

**Week 2a achieved:** 100% (60/60 dimensions within ±0.2)

**Options for Week 2b:**
- A) 80% (same as original Week 2a target)
- B) 85% (higher bar)
- C) 90% (aspirational)

**TagTeam Recommendation:** **80%** - Same as Week 2a target. 50 values is 4x more complex.

**IEE Decision:** _________________

---

## Summary of Key Questions

| # | Question | TagTeam Rec | IEE Decision |
|---|----------|-------------|--------------|
| 1.1 | Boost application method | Additive | ______ |
| 1.2 | Boost capping | Cap final only | ______ |
| 2.1 | Negative value handling | Separate field | ______ |
| 2.2 | Negation strength | Binary | ______ |
| 3.1 | Conflict definition | Predefined pairs | ______ |
| 3.2 | Conflict scoring | Maximum tension | ______ |
| 4.1 | Output verbosity | Standard | ______ |
| 4.2 | Top values count | 5 (configurable) | ______ |
| 5.1 | Dominant domain | Threshold-based | ______ |
| 5.2 | Domain weighting | Equal | ______ |
| 6.1 | Max parse time | <100ms | ______ |
| 6.2 | Early termination | Yes (0.1) | ______ |
| 7.1 | Conflict pairs file | Need from IEE | ______ |
| 7.2 | Value importance weights | Equal | ______ |
| 8.1 | No values detected | Return null | ______ |
| 8.2 | Min text length | No minimum | ______ |
| 9.1 | Test corpus format | Need from IEE | ______ |
| 9.2 | Accuracy target | 80% | ______ |

---

## Additional Questions from TagTeam

1. **Decimal Precision:** How many decimal places for scores? (e.g., 0.85 vs 0.8523)
   - Recommend: 2 decimal places (0.85)

2. **Bundle Size Limit:** Current bundle is 4.18 MB. Is there a size limit for Week 2b?
   - Week 2b will add ~45 KB → ~4.23 MB total

3. **Browser Support:** Any specific browser requirements?
   - Current: ES5 compatible, works in all modern browsers

4. **API Versioning:** Should we add version field to output?
   ```javascript
   {
     version: "2.0",  // Week 1 = 1.0, Week 2a = 1.5, Week 2b = 2.0
     ...
   }
   ```

---

**Prepared by:** TagTeam Development Team
**Date:** January 12, 2026
**For:** Jan 21 Planning Session
**Status:** Awaiting IEE Responses
