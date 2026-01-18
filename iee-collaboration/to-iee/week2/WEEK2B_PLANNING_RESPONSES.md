# Week 2b Planning Session - TagTeam Responses

**Date:** January 18, 2026
**Responding To:** WEEK2B_PLANNING_SESSION.md from IEE Team
**Status:** ✅ **READY FOR IMPLEMENTATION**

---

## Executive Summary

We've reviewed the IEE planning document and are **ready to begin implementation on Jan 22**. The proposed architecture is excellent and aligns well with our Week 2a approach. Below are our responses to all 30 technical questions.

**Overall Assessment:**
- ✅ Architecture is sound and feasible
- ✅ Timeline is realistic (Jan 22 - Feb 7)
- ✅ Data files are comprehensive
- ✅ No blocking issues identified
- ✅ Ready to proceed with confidence

---

## Topic 1: Value Matching Architecture

### Question 1: Keyword Matching Strategy

**Q:** Reuse PatternMatcher from Week 2a for consistency? Should value keywords use word boundary matching? How to handle multi-word markers?

**TagTeam Response:**

✅ **YES - Reuse PatternMatcher** for maximum consistency

**Implementation:**
```javascript
// Use existing PatternMatcher from Week 2a
const patternMatcher = new PatternMatcher();

// For multi-word markers like "inherent worth"
const markers = [
  'inherent worth',  // Try multi-word first
  'worth',          // Then single word
  'dignity'
];

// PatternMatcher handles word boundaries automatically
const matches = patternMatcher.containsAny(text, markers);
```

**Strategy:**
- Multi-word phrases checked first (higher priority)
- Word boundary matching for all markers
- Same negation/intensifier/hedge logic as Week 2a

**Rationale:** Proven approach from Week 2a (100% accuracy). Maintains code consistency.

---

### Question 2: Semantic Entailment Integration

**Q:** Should entailed values (from frames/roles) be added even if no text evidence? Or only boost salience of keyword-detected values?

**TagTeam Response:**

✅ **ADD entailed values even without text evidence**

**Rationale:**
- Aligns with IEE's "value realism" philosophy (values exist even when not explicit)
- Provides richer ethical profile
- Distinguishes via `source: 'entailment'` field for transparency

**Implementation:**
```javascript
// Step 1: Detect via keywords
const keywordValues = detectViaKeywords(text, valueDefs);

// Step 2: Add entailed values (that weren't already detected)
const entailedValues = detectViaEntailment(frame, roles, valueDefs);

// Merge: keywords first, then entailments
const allValues = [...keywordValues, ...entailedValues];
```

**Example:**
```
Text: "The doctor decided"
- Autonomy: detected via "decide" keyword (source: keyword)
- Beneficence: detected via doctor role (source: entailment)
Both included in output ✅
```

---

### Question 3: Detection Threshold

**Q:** Should we have a minimum salience threshold (e.g., 0.3) for reporting a value?

**TagTeam Response:**

✅ **YES - Use 0.3 threshold** (configurable)

**Implementation:**
```javascript
// Filter low-salience values
const reportedValues = allValues.filter(v => v.salience >= 0.3);

// Make threshold configurable
const result = TagTeam.parse(text, {
  minSalienceThreshold: 0.3  // default
});
```

**Rationale:**
- Reduces noise in output
- Values <0.3 are marginally relevant
- Configurable for power users who want all detections

**Default:** 0.3 (report values with ≥30% salience)

---

### Question 4: Base Salience Value

**Q:** Is 0.5 appropriate as base, or should it start at 0.0?

**TagTeam Response:**

✅ **Use 0.0 base** (change from proposed 0.5)

**Rationale:**
- Makes salience purely evidence-driven
- 0.5 baseline inflates all scores artificially
- Better differentiation between weak and strong signals

**Modified Formula:**
```javascript
function calculateSalience(text, valueDef, semanticFrame, roles) {
  let salience = 0.0; // Start at zero (changed from 0.5)

  // Component 1: Keyword frequency (0.0 to 1.0)
  const matchCount = countKeywordMatches(text, valueDef.semanticMarkers);
  const keywordScore = Math.min(matchCount * 0.3, 0.6); // 1 match=0.3, 2+=0.6
  salience += keywordScore;

  // Component 2: Frame boost (0.0 to 0.3)
  const frameBoost = getFrameValueBoost(semanticFrame, valueDef.name);
  salience += frameBoost;

  // Component 3: Role boost (0.0 to 0.2)
  const roleBoost = getRoleValueBoost(roles, valueDef.name);
  salience += roleBoost;

  // Clamp to [0.0, 1.0]
  return Math.min(Math.max(salience, 0.0), 1.0);
}
```

**Impact Example:**
- Old (0.5 base): No keyword + no boost = 0.5 salience
- New (0.0 base): No keyword + no boost = 0.0 salience (not reported)

This creates clearer signal-to-noise ratio.

---

### Question 5: Frequency Boost Cap

**Q:** Is +0.2 cap (2+ mentions) reasonable? Should we allow higher boost for 5+ times?

**TagTeam Response:**

✅ **Increase cap to 0.6** (changed from 0.2)

**Rationale:**
- Values mentioned repeatedly are more salient
- 0.2 cap is too conservative
- Allows keyword-only detection to reach high salience

**Modified Formula:**
```javascript
const matchCount = countKeywordMatches(text, valueDef.semanticMarkers);
const keywordScore = Math.min(matchCount * 0.3, 0.6);
// 1 match = 0.3
// 2 matches = 0.6 (capped)
// 3+ matches = 0.6 (capped)
```

**Example:**
```
Text: "Respect dignity. Human dignity is paramount. Dignity matters."
- "dignity" appears 3 times
- Keyword score: 0.6 (capped)
- With frame boost (+0.3): Total salience = 0.9 ✅
```

---

### Question 6: Boost Stacking

**Q:** Can frame boost and role boost both apply (+0.3 + 0.2 = +0.5)?

**TagTeam Response:**

✅ **YES - Allow stacking** (as proposed)

**Rationale:**
- Frame and role are independent signals
- Stacking makes sense (doctor in deciding frame = high autonomy)
- Final cap at 1.0 prevents over-inflation

**Example:**
```
Text: "The doctor must decide"
Frame: Deciding
Role: doctor (agent)

Autonomy value:
- Keyword: "decide" = +0.3
- Frame boost: Deciding → Autonomy = +0.3
- Role boost: doctor → Autonomy = 0.0 (no mapping)
- Total: 0.6 ✅

Beneficence value:
- Keyword: 0.0 (not mentioned)
- Frame boost: 0.0
- Role boost: doctor → Beneficence = +0.3
- Total: 0.3 ✅ (just above threshold)
```

Stacking approved. Capping at 1.0 keeps scores reasonable.

---

### Question 7: Conflict Detection

**Q:** Should conflicted values have a separate `conflict: true` field? Or is `polarity: 0` sufficient?

**TagTeam Response:**

✅ **Add explicit `conflict` boolean** (IEE preference)

**Rationale:**
- Clearer semantics
- Distinguishes "no polarity data" from "genuine conflict"
- Philosophically significant (per IEE notes)

**Implementation:**
```javascript
{
  name: "Human Dignity",
  salience: 0.7,
  polarity: 0,
  conflict: true,  // ← Explicit flag
  evidence: "respects dignity (upholding) AND demeans (violating)"
}
```

**Logic:**
```javascript
if (upholdingScore > 0 && violatingScore > 0) {
  return {
    polarity: 0,
    conflict: true  // Genuine conflict detected
  };
} else if (upholdingScore === 0 && violatingScore === 0) {
  return {
    polarity: 0,
    conflict: false // No polarity evidence
  };
}
```

---

### Question 8: Negation Handling

**Q:** Should we use Week 2a negation detection on polarity patterns?

**TagTeam Response:**

✅ **YES - Reuse PatternMatcher negation logic**

**Implementation:**
```javascript
// Check polarity with negation awareness
for (const pattern of upholdingPatterns) {
  if (patternMatcher.containsAny(text, [pattern])) {
    if (patternMatcher.isNegated(text, pattern)) {
      // "not respecting dignity" → flip to violating
      violatingScore += 1;
    } else {
      upholdingScore += 1;
    }
  }
}
```

**Example:**
```
Text: "The policy does not respect patient dignity"
- Pattern: "respect dignity" (upholding)
- Negation detected: "does not respect"
- Result: violatingScore += 1 (flipped) ✅
```

**Rationale:** Consistent with Week 2a approach. Proven accurate.

---

### Question 9: Entailment Polarity

**Q:** Should entailed values default to polarity 0 or +1?

**TagTeam Response:**

✅ **Default to +1 (positive)** for entailments

**Rationale:**
- Entailment implies value is activated/relevant (positive)
- Negative entailment would require explicit text evidence
- Conservative: assume presence = upholding unless text says otherwise

**Implementation:**
```javascript
// Keyword-detected values: use polarity detection
if (source === 'keyword') {
  polarity = detectPolarity(text, valueDef, matches);
}

// Entailed values: default to positive
if (source === 'entailment') {
  polarity = +1;  // Assume upholding
}
```

**Example:**
```
Text: "The doctor decided"
- Autonomy (via "decide" keyword): polarity = detectPolarity() → 0 (neutral)
- Beneficence (via doctor role): polarity = +1 (default positive)
```

---

### Question 10: Unmatched Frames

**Q:** What if `semanticFrame` is not in frame-value-boosts.json? Return 0.0 boost?

**TagTeam Response:**

✅ **Return 0.0 boost** (as proposed)

**Implementation:**
```javascript
function getFrameValueBoost(semanticFrame, valueName) {
  const frameBoosts = FRAME_VALUE_BOOSTS.frameValueBoosts[semanticFrame];

  if (!frameBoosts) {
    console.warn(`Frame "${semanticFrame}" not in boost mapping`);
    return 0.0;  // Graceful fallback
  }

  return frameBoosts.boosts[valueName] || 0.0;
}
```

**Rationale:**
- Graceful degradation
- Week 1 might produce frames not in IEE's mapping
- Doesn't break parsing, just no boost applied

**Recommendation:** IEE team can expand frame-value-boosts.json during Week 2b if new frames are discovered.

---

### Question 11: Multiple Frames

**Q:** Week 1 returns single `semanticFrame` per sentence. Is this still true for Week 2b?

**TagTeam Response:**

✅ **Still single frame** (Week 1 design)

**Current Behavior:**
- Week 1 classifies to ONE dominant frame per sentence
- Example: "The doctor decided to help" → frame = "Deciding" (not "Helping")

**For Week 2b:**
- Use the single dominant frame for boost lookup
- Keeps implementation simple
- Consistent with Week 1 architecture

**Future Enhancement (Week 3?):**
- Could support multiple frames per sentence
- Would require changes to Week 1 frame classifier
- Not in scope for Week 2b

---

### Question 12: Role Normalization

**Q:** Should we normalize role text to lemma before lookup? (e.g., "The doctor" → "doctor")

**TagTeam Response:**

✅ **YES - Normalize to lowercase, remove articles**

**Implementation:**
```javascript
function normalizeRoleText(roleText) {
  if (!roleText) return null;

  // Lowercase
  let normalized = roleText.toLowerCase();

  // Remove leading articles
  normalized = normalized.replace(/^(the|a|an)\s+/, '');

  // Remove possessives
  normalized = normalized.replace(/^(my|your|his|her|their|our)\s+/, '');

  return normalized;
}

// Usage
const normalizedAgent = normalizeRoleText(roles.agent?.text);
// "The doctor" → "doctor"
// "my doctor" → "doctor"
// "doctors" → "doctors" (keep plural for now)
```

**Rationale:**
- Maximizes boost lookup matches
- Simple normalization (no NLP needed)
- Can add lemmatization later if needed

---

### Question 13: Multiple Role Boosts

**Q:** If agent="doctor" and recipient="patient", both might boost same value. Take maximum boost or sum boosts?

**TagTeam Response:**

✅ **Take maximum boost** (IEE preference)

**Implementation:**
```javascript
function getRoleValueBoost(roles, valueName) {
  let maxBoost = 0.0;

  const roleTexts = [
    roles.agent?.text,
    roles.patient?.text,
    roles.recipient?.text,
    roles.theme?.text
  ].filter(Boolean).map(normalizeRoleText);

  for (const roleText of roleTexts) {
    const roleBoosts = FRAME_VALUE_BOOSTS.roleValueBoosts[roleText];
    if (roleBoosts && roleBoosts.boosts[valueName]) {
      maxBoost = Math.max(maxBoost, roleBoosts.boosts[valueName]);
    }
  }

  return maxBoost;
}
```

**Rationale:**
- Avoids double-counting (agent + patient both boost same value)
- More conservative than summing
- Aligns with IEE preference

---

## Topic 2: API Design Review

### Question 14: Values Array Ordering

**Q:** Should values be sorted by salience (highest first), by domain, or by detection order?

**TagTeam Response:**

✅ **Sort by salience descending** (IEE preference)

**Implementation:**
```javascript
// Sort values by salience (highest first)
values.sort((a, b) => b.salience - a.salience);
```

**Output Example:**
```javascript
values: [
  { name: "Autonomy", salience: 0.9, ... },        // Highest
  { name: "Human Dignity", salience: 0.7, ... },
  { name: "Beneficence", salience: 0.3, ... }      // Lowest (at threshold)
]
```

**Rationale:**
- Most important values appear first
- Easy to display top N values
- Intuitive for users

---

### Question 15: Conflict Field

**Q:** Add explicit `conflict: true/false` field?

**TagTeam Response:**

✅ **YES - Add explicit field** (answered in Q7)

Already covered in Question 7. Agreed to add `conflict` boolean.

---

### Question 16: Value Summary

**Q:** Is `valueSummary` object useful for quick stats? Or unnecessary overhead?

**TagTeam Response:**

✅ **Include valueSummary** (IEE preference)

**Implementation:**
```javascript
valueSummary: {
  totalDetected: values.length,
  byDomain: {
    dignity: values.filter(v => v.domain === 'dignity').length,
    care: values.filter(v => v.domain === 'care').length,
    virtue: values.filter(v => v.domain === 'virtue').length,
    community: values.filter(v => v.domain === 'community').length,
    transcendence: values.filter(v => v.domain === 'transcendence').length
  },
  avgSalience: values.reduce((sum, v) => sum + v.salience, 0) / values.length,
  conflicts: values.filter(v => v.conflict === true).length
}
```

**Rationale:**
- Useful for analytics and debugging
- Small overhead (~50 bytes)
- Provides quick overview without parsing all values

---

### Question 17: Regression Testing

**Q:** Will you run Week 1 and Week 2a test corpora against Week 2b?

**TagTeam Response:**

✅ **YES - Full regression testing** (IEE requirement)

**Test Plan:**
1. **Week 1 Baseline** (19 checks from WEEK1_VALIDATION_RESULTS.md)
   - All semantic role extractions must pass
   - Target: 100% pass rate (same as before)

2. **Week 2a Baseline** (60 dimensions from test-week2a-context.html)
   - All context intensity scores must be within ±0.2
   - Target: 100% accuracy (same as before)

3. **Week 2b New Features** (20 scenarios from test-corpus-week2.json)
   - Value detection, salience, polarity
   - Target: 80% precision/recall

**Deliverable:**
- `test-week2b-regression.html` - Runs all three test suites
- Must show ✅ for Week 1 and Week 2a before Week 2b acceptance

---

### Question 18: Performance Budget

**Q:** Is <50ms realistic for 50-value detection? Should we add optional "fast mode"?

**TagTeam Response:**

✅ **<50ms is realistic** - No fast mode needed

**Performance Analysis:**
- Week 2a: 12 dimensions in ~15-25ms
- Week 2b: 50 values ≈ 4x more, but similar pattern matching
- Estimated: 30-40ms for value detection
- Total with Week 1 + Week 2a: ~45-55ms

**Optimization Strategy:**
1. **Precompile Patterns**
   ```javascript
   // Build regex patterns once at module load
   const VALUE_PATTERNS = VALUE_DEFS.map(v => ({
     name: v.name,
     patterns: v.semanticMarkers.map(m => new RegExp(`\\b${escape(m)}\\b`, 'i'))
   }));
   ```

2. **Early Exit**
   ```javascript
   // Skip salience calculation if no keywords match
   if (keywordMatches.length === 0 && frameBoost === 0 && roleBoost === 0) {
     continue; // Skip this value
   }
   ```

3. **Cache Boost Lookups**
   ```javascript
   // Cache frame/role boosts per parse session
   const boostCache = new Map();
   ```

**Confident we can hit <50ms without "fast mode" compromise.**

---

### Question 19: Debug Mode Implementation

**Q:** Useful for IEE debugging? Or too much overhead?

**TagTeam Response:**

✅ **Include debug mode** (IEE preference)

**Implementation:**
```javascript
const result = TagTeam.parse(text, { debug: true });

// Adds _debug field
result._debug = {
  valueDetection: {
    totalCandidates: 50,
    keywordMatches: 8,
    entailments: 3,
    belowThreshold: 2,
    reported: 9
  },
  timings: {
    semanticRoles: 12,
    contextIntensity: 8,
    valueMatching: 15,
    total: 35
  },
  performance: {
    patternCacheHits: 42,
    patternCacheMisses: 8
  }
};
```

**Overhead:** ~5-10ms when enabled, 0ms when disabled (default)

**Rationale:**
- Essential for IEE validation and testing
- Helps TagTeam debug during development
- Gated behind flag (no production impact)

---

## Topic 3: Timeline and Checkpoints

### Question 20: Timeline Feasibility

**Q:** Is 2 weeks realistic? Any requirements to clarify? Any blockers?

**TagTeam Response:**

✅ **Timeline is realistic** - Ready to start Jan 22

**Breakdown:**
- **Jan 22-24** (3 days): ValueMatcher implementation
  - Keyword detection
  - Polarity detection
  - 20 values working

- **Jan 25-27** (3 days): ValueScorer implementation
  - Frame/role boost integration
  - Salience calculation
  - All 50 values working
  - **Checkpoint 1: Jan 27**

- **Jan 28-31** (4 days): Integration & testing
  - SemanticRoleExtractor integration
  - Bundle rebuild
  - Test corpus validation (80% target)

- **Feb 1-3** (3 days): Polish & documentation
  - Bug fixes from testing
  - Documentation updates
  - **Checkpoint 2: Feb 3**

- **Feb 4-7** (4 days): Final testing & delivery
  - Full regression testing
  - Performance optimization
  - **Delivery: Feb 7**

**No Blockers Identified:**
- ✅ All data files present and understood
- ✅ Architecture is clear
- ✅ Questions answered
- ✅ Team is ready

**Clarifications Needed:** None - IEE document is comprehensive

---

### Question 21: Checkpoint Format

**Q:** Same as Week 2a (async messaging) or prefer video call?

**TagTeam Response:**

✅ **Async messaging preferred** (same as Week 2a)

**Checkpoint Format:**
- Share test results (screenshot or HTML)
- Document progress and any issues
- Get async feedback
- Continue implementation

**Benefits:**
- Flexible timing (no scheduling needed)
- Clear documentation trail
- Proven successful in Week 2a

**Alternative:** If IEE prefers video call for Jan 27 checkpoint, we're flexible. Let us know.

---

### Question 22: Test Corpus Usage

**Q:** Validate all 20 scenarios or start with subset (5)? Need additional edge cases?

**TagTeam Response:**

✅ **Start with 5, validate all 20 by delivery**

**Strategy:**
1. **Jan 27 Checkpoint:** Test on first 5 scenarios
   - Same scenarios as Week 2a for continuity
   - healthcare-001, healthcare-002, spiritual-001, vocational-001, interpersonal-001
   - Target: 70% accuracy (early implementation)

2. **Feb 3 Checkpoint:** Test on all 20 scenarios
   - Full test corpus validation
   - Target: 80% accuracy

3. **Feb 7 Delivery:** Final validation
   - All 20 scenarios
   - Target: 85%+ accuracy (stretch goal)

**Edge Cases:**
- Current 20 scenarios seem comprehensive
- No additional scenarios needed unless IEE identifies gaps
- Happy to test on additional scenarios if provided

---

## Topic 4: Technical Questions

### Question 23: Semantic Markers

**Q:** Are keyword lists sufficient? Need more keywords? Should we add regex patterns?

**TagTeam Response:**

✅ **Keyword lists are sufficient** for Week 2b

**Assessment:**
- Reviewed `value-definitions-comprehensive.json`
- Semantic markers appear comprehensive (5-10 per value)
- Cover main variations and synonyms

**Recommendations:**
1. **Start with existing keywords**
2. **Add patterns based on testing**
   - If precision/recall is low for specific values, add keywords
   - Document in checkpoint reports

3. **Regex patterns:** Not needed yet
   - Simple keyword matching should suffice
   - Can add regex for complex patterns if needed later

**Process:**
- Jan 27 checkpoint will identify any values with poor detection
- IEE can suggest additional keywords
- We'll iterate quickly

---

### Question 24: Polarity Indicators

**Q:** Are upholding/violating lists comprehensive? Need more patterns?

**TagTeam Response:**

✅ **Lists are comprehensive** - Start with existing

**Same strategy as Q23:**
- Test with existing polarity indicators
- Identify gaps during validation
- Add patterns as needed

**Quality Check:**
- Reviewed polarity indicators for top 10 values
- Good coverage of common patterns
- Can expand based on testing results

---

### Question 25: Related Values

**Q:** Should detection of one value boost salience of related values?

**TagTeam Response:**

✅ **Ignore `relatedValues` for Week 2b** (IEE preference)

**Rationale:**
- Keep Week 2b scope focused
- Avoid complex cascading boost logic
- Can add in future enhancement (Week 3?)

**Implementation:**
```javascript
// Do NOT use relatedValues field
// Each value scores independently
```

**Future Consideration:**
- Week 2c or later: Add related value boosting
- Example: Autonomy detected (0.8) → boost Freedom (+0.1)
- Would require careful tuning to avoid inflation

---

### Question 26: Missing Frames/Roles

**Q:** How to handle unmapped frames? Should IEE expand boosts file?

**TagTeam Response:**

✅ **Handle gracefully** - IEE can expand if needed

**Current Approach:**
- Unmapped frames: return 0.0 boost (answered in Q10)
- Log warnings in debug mode
- Track coverage during testing

**Recommendation for IEE:**
- Current coverage: 12 frames, 15 roles
- Week 1 produces ~20 different frames total
- **IEE should review** frame-value-boosts.json and add missing frames if desired
- Not blocking - we'll work with what's provided

**During Week 2b:**
- We'll report which frames appear in test corpus but aren't mapped
- IEE can decide whether to add mappings

---

### Question 27: Boost Value Ranges

**Q:** Current boosts: 0.1 to 0.3. Are these appropriate? Should some frames have stronger boosts (0.5)?

**TagTeam Response:**

✅ **Current ranges (0.1-0.3) are appropriate**

**Rationale:**
- With 0.0 base (our Q4 change), boosts have significant impact
- 0.3 boost + 0.3 keyword + 0.2 role = 0.8 salience (strong signal)
- Higher boosts (0.5) could over-inflate scores

**Analysis:**
```
Example with 0.3 boost:
- Keyword only: 0.3 salience
- Keyword + frame: 0.6 salience
- Keyword + frame + role: 0.8 salience ✅

Example with 0.5 boost (too high):
- Keyword only: 0.3 salience
- Keyword + frame: 0.8 salience
- Keyword + frame + role: 1.0 salience (saturated) ❌
```

**Recommendation:** Keep 0.1-0.3 range. Can adjust based on testing if needed.

---

### Question 28: No Values Detected (Edge Case 1)

**Q:** Should `values` be empty array or include low-salience defaults?

**TagTeam Response:**

✅ **Empty array** `[]`

**Implementation:**
```javascript
// Text: "The ball rolled down the hill"
// No ethical content

result.values = [];  // Empty array
result.valueSummary = {
  totalDetected: 0,
  byDomain: { dignity: 0, care: 0, virtue: 0, community: 0, transcendence: 0 },
  avgSalience: 0,
  conflicts: 0
};
```

**Rationale:**
- Clear signal: no ethical values detected
- Avoids noise in output
- Honest representation

---

### Question 29: All Values Equally Salient (Edge Case 2)

**Q:** Should we limit to top N values or report all?

**TagTeam Response:**

✅ **Report all** above threshold (0.3)

**Rationale:**
- Threshold (0.3) already filters noise
- Genuine ethical complexity can involve many values
- User can take top N if desired

**Example:**
```javascript
// Text: "The ethical framework considers all moral principles"
// Might activate 15 values at 0.4-0.6 salience

// We report all 15 ✅
// Sorted by salience (highest first)
// User's responsibility to interpret or filter
```

**Optional Enhancement:**
- Could add `topValues` field (top 5) to `valueSummary`
- Helps users focus on most salient
- Not blocking for Week 2b

---

### Question 30: Conflicting Polarities (Edge Case 3)

**Q:** How to represent nuance when related values have opposite polarities?

**TagTeam Response:**

✅ **Separate entries** for each value

**Example:**
```javascript
// Text: "The policy promotes freedom but restricts autonomy"

values: [
  {
    name: "Freedom",
    salience: 0.7,
    polarity: +1,  // Promoted
    conflict: false,
    evidence: "promotes freedom"
  },
  {
    name: "Autonomy",
    salience: 0.8,
    polarity: -1,  // Restricted
    conflict: false,
    evidence: "restricts autonomy"
  }
]

// User can see both entries and infer the tension
```

**Rationale:**
- Explicit representation
- Each value tracks its own polarity
- Users can identify tensions by comparing related values
- No need for complex conflict resolution logic

**Future Enhancement:**
- Could detect related value conflicts
- Add to `valueSummary.relatedConflicts` array
- Not in Week 2b scope

---

## Decision Log

| # | Topic | TagTeam Decision | Rationale |
|---|-------|------------------|-----------|
| 1 | Keyword matching | Reuse PatternMatcher | Consistency with Week 2a (100% accuracy) |
| 2 | Entailment integration | Add entailed values | Aligns with IEE's value realism |
| 3 | Detection threshold | 0.3 minimum salience | Reduces noise, configurable |
| 4 | Base salience | 0.0 (changed from 0.5) | Evidence-driven, better differentiation |
| 5 | Frequency boost cap | 0.6 (changed from 0.2) | Allows keyword-only high salience |
| 6 | Boost stacking | Allow (frame + role) | Independent signals, capped at 1.0 |
| 7 | Conflict field | Add explicit boolean | Philosophically significant |
| 8 | Negation handling | Reuse PatternMatcher | Consistency, proven accurate |
| 9 | Entailment polarity | Default +1 (positive) | Assume upholding unless text says otherwise |
| 10 | Unmatched frames | Return 0.0 boost | Graceful degradation |
| 11 | Multiple frames | Single frame (Week 1) | Consistent with architecture |
| 12 | Role normalization | Lowercase + remove articles | Maximize boost lookup matches |
| 13 | Multiple role boosts | Maximum boost | Avoid double-counting (IEE pref) |
| 14 | Values ordering | Sort by salience descending | Most salient first (IEE pref) |
| 15 | Conflict field | Explicit (see #7) | Already decided |
| 16 | Value summary | Include it | Analytics, debugging (IEE pref) |
| 17 | Regression testing | Full Week 1 + Week 2a | Ensure no regressions (IEE req) |
| 18 | Performance budget | <50ms realistic | Optimization strategy ready |
| 19 | Debug mode | Include it | Essential for validation (IEE pref) |
| 20 | Timeline | Realistic, ready Jan 22 | No blockers identified |
| 21 | Checkpoint format | Async messaging | Proven successful |
| 22 | Test corpus | Start 5, validate all 20 | Incremental validation |
| 23 | Semantic markers | Existing sufficient | Iterate based on testing |
| 24 | Polarity indicators | Existing sufficient | Iterate based on testing |
| 25 | Related values | Ignore for Week 2b | Keep scope focused (IEE pref) |
| 26 | Missing frames/roles | Handle gracefully | IEE can expand if needed |
| 27 | Boost ranges | 0.1-0.3 appropriate | Good balance |
| 28 | No values detected | Empty array | Clear signal |
| 29 | Many values | Report all >0.3 | Represents complexity |
| 30 | Conflicting polarities | Separate entries | Explicit representation |

---

## TagTeam Notes

### Architectural Confidence

We're **highly confident** in this architecture:

1. **Proven Foundation:** Reuses Week 2a pattern matching (100% accuracy)
2. **Clear Design:** Three-step process (detect → score → report)
3. **Balanced Approach:** Keywords + entailment (per IEE philosophy)
4. **Realistic Performance:** <50ms achievable with optimization
5. **Good Test Coverage:** 20 scenarios across 5 domains

### Key Design Decisions

**Changed from IEE Proposal:**
- Base salience: 0.0 (not 0.5) - More evidence-driven
- Frequency cap: 0.6 (not 0.2) - Allows stronger keyword signals

**Agreed with IEE:**
- Explicit conflict field (philosophically significant)
- Maximum role boost (avoid double-counting)
- Sort by salience (most important first)
- Include value summary (analytics)
- Add debug mode (validation)

### Risk Mitigation

**Low Risk Areas:**
- Keyword detection (proven in Week 2a)
- Boost application (straightforward hash lookups)
- Integration (additive to existing code)

**Medium Risk Areas:**
- Polarity detection (new logic, needs testing)
- Performance (<50ms with 50 values requires optimization)

**Mitigation:**
- Early testing (Jan 27 checkpoint)
- Incremental validation (5 scenarios → 20 scenarios)
- Debug mode for troubleshooting

---

## Questions for IEE

### Q1: Frame-Value Boosts Expansion

Should we prioritize expanding frame-value-boosts.json before Jan 22?

**Context:**
- Current: 12 frames mapped
- Week 1 produces: ~20 different frames
- 8 frames unmapped (will get 0.0 boost)

**Options:**
A) Start with existing 12, add more during Week 2b if needed
B) IEE provides expanded mapping before Jan 22

**TagTeam Preference:** Option A (start with 12, expand iteratively)

---

### Q2: Expected Value Annotations

Do test corpus scenarios have expected value scores/polarities?

**Needed Format:**
```json
{
  "id": "healthcare-001",
  "testSentence": "The family must decide...",
  "expectedValues": [
    { "name": "Autonomy", "salience": 0.9, "polarity": -1 },
    { "name": "Human Dignity", "salience": 0.7, "polarity": 0 }
  ]
}
```

**Impact:**
- With annotations: Automated precision/recall calculation
- Without annotations: Manual validation (slower but feasible)

---

### Q3: Checkpoint Timing

Confirm checkpoint schedule:
- **Jan 27:** Midpoint demo (async messaging?)
- **Feb 3:** Pre-delivery review (async messaging?)

Or prefer video calls?

---

## Action Items

### TagTeam
- [x] Review IEE planning document
- [x] Answer all 30 technical questions
- [x] Confirm timeline feasibility
- [x] Identify any blockers (none found)
- [ ] Begin implementation Jan 22
- [ ] Checkpoint 1 report (Jan 27)
- [ ] Checkpoint 2 report (Feb 3)
- [ ] Final delivery (Feb 7)

### IEE
- [ ] Review TagTeam responses
- [ ] Answer TagTeam's 3 questions (Q1-Q3 above)
- [ ] Provide expected value annotations (if available)
- [ ] Confirm checkpoint format/timing
- [ ] Approve architecture to proceed

---

## Next Steps

1. **IEE Reviews This Document** (by Jan 20)
   - Verify our answers to 30 questions
   - Answer our 3 questions
   - Approve architecture

2. **Final Alignment** (Jan 21)
   - Resolve any remaining questions
   - Confirm green light to proceed

3. **Implementation Kickoff** (Jan 22)
   - Begin ValueMatcher component
   - Track progress against timeline

4. **Checkpoint 1** (Jan 27)
   - Demo on 5 scenarios
   - Report accuracy and issues
   - Get feedback

---

**Document Status:** ✅ **COMPLETE - Ready for IEE Review**
**Prepared By:** TagTeam Development Team
**Date:** January 18, 2026
**Confidence Level:** HIGH
**Ready to Proceed:** YES

---

**Thank you for the comprehensive planning document! We're excited to begin Week 2b and deliver another successful implementation.** 🚀
