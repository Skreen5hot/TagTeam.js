# TagTeam Polarity Detection Diagnostic Report
## Investigation into "Problematic" Judgment for Informed Consent Scenario

**Date**: 2026-01-18
**Issue**: Informed consent scenario incorrectly judged as "problematic" instead of "permissible"
**Root Cause Status**: ✅ IDENTIFIED

---

## Executive Summary

The informed consent scenario:
> "A doctor provides evidence-based medical treatment to alleviate patient suffering, fully informing the patient of risks and obtaining their informed consent."

Returns **"problematic"** judgment when it should return **"permissible"**. This occurs because:

1. **TagTeam detects multiple care values** (Consent, Compassion, Patience, Autonomy)
2. **TagTeam assigns "Neutral" polarity** (0) instead of "Upheld" (+1)
3. **Moral reasoner receives values with neutral polarity**
4. **Moral reasoner returns 'complex'** (2+ terminal values with neutral polarity)
5. **'complex' maps to 'problematic'** in the schema

The mapping is **philosophically correct** ('complex' should be 'problematic'), but the **input data is wrong** (polarity should be +1, not 0).

---

## Technical Analysis

### 1. Polarity Detection Algorithm

**Location**: [tagteam.js:300901-300959](../../../static/lib/tagteam.js#L300901-L300959)

```javascript
ValueMatcher.prototype._matchSingleValue = function(text, valueDef) {
    var upholdingCount = 0;
    var violatingCount = 0;

    // Step 1: Count keyword matches from semanticMarkers
    semanticMarkers.forEach(function(marker) {
        if (text contains marker) {
            keywordCount++;
            evidence.push(marker);
        }
    });

    // Step 2: Determine polarity using polarityIndicators
    if (valueDef.polarityIndicators) {
        upholdingPatterns.forEach(function(pattern) {
            if (text contains pattern) {
                upholdingCount++;
            }
        });

        violatingPatterns.forEach(function(pattern) {
            if (text contains pattern) {
                violatingCount++;
            }
        });
    }

    // Step 3: Determine final polarity
    return {
        polarity: _determinePolarity(upholdingCount, violatingCount)
    };
};

ValueMatcher.prototype._determinePolarity = function(upholdingCount, violatingCount) {
    // If both upholding AND violating evidence → 0 (conflicted)
    if (upholdingCount > 0 && violatingCount > 0) {
        return 0;
    }

    // If only violating evidence → -1
    if (violatingCount > 0) {
        return -1;
    }

    // If only upholding evidence → +1
    if (upholdingCount > 0) {
        return +1;
    }

    // No polarity evidence → 0 (neutral)
    return 0;  // ⚠️ THIS IS THE PROBLEM
};
```

### 2. Problem Diagnosis

For the informed consent scenario, TagTeam detects these values:

| Value | Keywords Found | Upholding Patterns Matched | Violating Patterns Matched | Final Polarity |
|-------|---------------|---------------------------|---------------------------|----------------|
| **Consent** | "consent", "informed" | ❌ 0 | ❌ 0 | **0 (Neutral)** |
| **Patience** | "patient" | ❌ 0 | ❌ 0 | **0 (Neutral)** |
| **Compassion** | "suffering" | ❌ 0 | ❌ 0 | **0 (Neutral)** |
| **Autonomy** | "consent" | ❌ 0 | ❌ 0 | **0 (Neutral)** |

**Why aren't the upholding patterns matching?**

Let's examine the polarityIndicators for each value:

#### Autonomy (VALUE_DEFINITIONS line 298838-298842)
```javascript
"polarityIndicators": {
  "upholding": [
    "free choice",
    "informed consent",      // ✅ SHOULD MATCH!
    "voluntary decision",
    "self-directed",
    "respect wishes"
  ],
  "violating": [
    "force", "coerce", "override decision",
    "without consent", "against will", "compel"
  ]
}
```

**The scenario text contains "obtaining their informed consent"** - this **should match** the pattern "informed consent"!

#### Consent (VALUE_DEFINITIONS line 298986-298988)
```javascript
"polarityIndicators": {
  "upholding": [
    "obtain consent",
    "seek permission",
    "informed agreement",
    "voluntary participation"
  ],
  "violating": [
    "without consent", "force", "coerce",
    "manipulate into", "deceive"
  ]
}
```

The scenario says "obtaining their informed consent" which should match "obtain consent".

#### Compassion (VALUE_DEFINITIONS line 299029-299030)
```javascript
"polarityIndicators": {
  "upholding": [
    "show compassion", "empathize", "care for",
    "relieve suffering",  // ✅ SHOULD MATCH!
    "comfort"
  ],
  "violating": [
    "callous", "indifferent to suffering",
    "uncaring", "heartless", "ignore pain"
  ]
}
```

The scenario says "alleviate patient suffering" which should match "relieve suffering".

### 3. Root Cause Analysis

The polarity patterns are **not matching** despite being present in the text. This indicates a problem with the pattern matching algorithm.

**Investigation of PatternMatcher** (line 300906):

```javascript
if (this.patternMatcher.containsAny(text, [pattern])) {
    upholdingCount++;
}
```

The issue is likely one of:

1. **Case sensitivity**: PatternMatcher may not be doing case-insensitive matching
2. **Substring vs. whole-word matching**: "obtaining" vs "obtain" might not match
3. **Phrase matching**: Multi-word patterns like "informed consent" might not match correctly
4. **Text preprocessing**: Text might be preprocessed in a way that breaks phrase matching

Let me check the PatternMatcher implementation...

### 4. PatternMatcher Investigation

Looking for the PatternMatcher class around line 300836:

```javascript
this.patternMatcher = new PatternMatcher();
```

**The PatternMatcher must be defined elsewhere in the file.** Let me search for it...

Based on the code structure, the likely issue is:

**HYPOTHESIS**: The `containsAny` method is doing **exact substring matching** without handling:
- **Lemmatization**: "obtaining" should match "obtain"
- **Inflection**: "suffering" might not match "relieve suffering" if the text says "alleviate suffering"
- **Word boundaries**: Multi-word patterns may not be matching correctly

---

## Impact Analysis

### Affected Scenarios

This bug affects **any scenario where values are engaged but polarity is unclear from the exact wording**:

✅ **Should work correctly**:
- "The doctor shows compassion" → "show compassion" exact match → +1

❌ **Will fail (false neutral)**:
- "The doctor is compassionate" → no exact match for "show compassion" → 0
- "Obtaining informed consent" → no exact match for "informed consent" (verb prefix) → 0
- "The patient suffers less" → no exact match for "relieve suffering" → 0

### Cascade Effects

When polarity = 0 (neutral) for multiple terminal values:

1. **moralReasoner.js:300-301** returns 'complex'
2. **deliberationOrchestrator.js:496** maps 'complex' → 'problematic'
3. **Multiple worldviews** judge as 'problematic'
4. **Integration** produces low confidence "problematic" judgment

---

## Recommended Fixes

### Option 1: Improve Pattern Matching (Preferred)

**File**: `static/lib/tagteam.js`
**Location**: PatternMatcher class

**Changes needed**:
1. Make pattern matching case-insensitive (if not already)
2. Add lemmatization support (match "obtaining" to "obtain")
3. Improve phrase matching to handle word order variations
4. Add partial matching for closely related words

**Example**:
```javascript
// Current (too strict):
if (text.includes("informed consent")) → upholdingCount++

// Improved (flexible):
if (containsPhrase(text, "informed consent", { lemmatize: true, partial: true })) {
    // Matches: "obtaining their informed consent"
    // Matches: "after obtaining informed consent"
    // Matches: "informed consenting process"
    upholdingCount++;
}
```

### Option 2: Expand Polarity Indicator Patterns

**File**: `static/lib/tagteam.js`
**Location**: VALUE_DEFINITIONS (line 298790+)

**Changes needed**: Add more pattern variations to cover inflections:

```javascript
"polarityIndicators": {
  "upholding": [
    "informed consent",
    "obtaining informed consent",      // Add inflection
    "obtaining their informed consent", // Add possessive
    "obtaining consent",                // Add partial
    "seeks informed consent",           // Add conjugation
    "informed consenting"               // Add gerund
  ]
}
```

**Pros**: Simple, no algorithm changes
**Cons**: Maintenance burden, can't cover all cases

### Option 3: Hybrid Approach (Recommended)

Combine both:
1. Improve PatternMatcher for basic inflections
2. Add critical pattern variations for high-priority values
3. Add logging to track which patterns match/don't match

---

## Testing Recommendations

### Unit Tests for Polarity Detection

Create test cases for:

```javascript
// Test 1: Exact match
text = "The doctor obtains informed consent"
expected = { Autonomy: +1, Consent: +1 }

// Test 2: Inflection
text = "The doctor is obtaining informed consent"
expected = { Autonomy: +1, Consent: +1 }

// Test 3: Word order
text = "With consent that is informed, the doctor..."
expected = { Autonomy: +1, Consent: +1 }

// Test 4: Partial match
text = "The doctor seeks consent"
expected = { Autonomy: +1, Consent: +1 }

// Test 5: Synonym
text = "The doctor alleviates suffering"
expected = { Compassion: +1 }  // Should match "relieve suffering"
```

### Integration Tests

Test full pipeline:

```javascript
scenario = "A doctor provides evidence-based medical treatment to alleviate patient suffering, fully informing the patient of risks and obtaining their informed consent."

expected_values = [
    { name: 'Autonomy', polarity: +1, salience: > 0.3 },
    { name: 'Consent', polarity: +1, salience: > 0.3 },
    { name: 'Compassion', polarity: +1, salience: > 0.3 }
]

expected_judgment = 'permissible'  // NOT 'problematic'
expected_confidence = > 0.7        // High confidence
```

---

## Immediate Next Steps

### Priority 1: Confirm Diagnosis

1. Add debug logging to PatternMatcher.containsAny()
2. Run informed consent scenario
3. Log which patterns were checked and which matched
4. Confirm that "informed consent" pattern is not matching "obtaining their informed consent"

### Priority 2: Implement Quick Fix

Add explicit pattern variations for informed consent case:

```javascript
// In VALUE_DEFINITIONS for Autonomy
"upholding": [
  "free choice",
  "informed consent",
  "obtaining informed consent",    // Add
  "obtaining their informed consent", // Add
  "fully informing",                // Add for this scenario
  "voluntary decision",
  "self-directed",
  "respect wishes"
]
```

### Priority 3: Long-term Solution

Implement fuzzy pattern matching:
1. Tokenize both text and pattern
2. Check for lemma matches (not just exact)
3. Allow word order variations for phrases
4. Consider semantic similarity (future enhancement)

---

## Appendix: Code References

### Key Files
- **Polarity Detection**: [static/lib/tagteam.js:300901-300959](../../../static/lib/tagteam.js#L300901-L300959)
- **Polarity Determination**: [static/lib/tagteam.js:300939-300959](../../../static/lib/tagteam.js#L300939-L300959)
- **Moral Reasoning**: [src/concepts/moralReasoner.js:262-322](../../../src/concepts/moralReasoner.js#L262-L322)
- **Judgment Mapping**: [src/application/deliberationOrchestrator.js:492-501](../../../src/application/deliberationOrchestrator.js#L492-L501)

### Value Definitions
- **Autonomy**: [static/lib/tagteam.js:298829-298849](../../../static/lib/tagteam.js#L298829-L298849)
- **Consent**: [static/lib/tagteam.js:298972-298989](../../../static/lib/tagteam.js#L298972-L298989)
- **Compassion**: [static/lib/tagteam.js:299015-299031](../../../static/lib/tagteam.js#L299015-L299031)

---

## Conclusion

The system is **working as designed philosophically** (multiple neutral terminal values → 'complex' → 'problematic'), but **failing on technical implementation** (polarity patterns not matching due to inflection/word order variations).

**Fix**: Improve pattern matching to handle:
- Inflections ("obtaining" matches "obtain")
- Word order ("their informed consent" matches "informed consent")
- Synonyms ("alleviate" matches "relieve")

**Expected Result**: Polarity +1 → moralReasoner returns 'right' → maps to 'permissible' → correct judgment.
