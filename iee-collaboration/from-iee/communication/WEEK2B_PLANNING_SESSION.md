# Week 2b Planning Session - Value Matching Engine

**Date:** January 18, 2026
**Session Type:** Async Messaging
**Participants:** IEE Team (Aaron Damiano) & TagTeam Development Team
**Purpose:** Align on Week 2b implementation approach before Jan 22 kickoff

---

## Session Overview

This document serves as our structured planning session for Week 2b (Value Matching Engine). We'll work through each topic asynchronously, documenting decisions, questions, and action items.

**Timeline:**
- **Planning Session:** Jan 18-21 (async messaging)
- **Implementation Start:** Jan 22
- **Delivery Date:** Feb 7, 2026
- **Checkpoints:** Jan 27 (midpoint), Feb 3 (pre-delivery)

---

## Topic 1: Value Matching Architecture

### Overview
Week 2b adds detection and salience scoring for 50 ethical values across 5 domains (Dignity, Care, Virtue, Community, Transcendence).

### 1.1 Detection Approach

**Input Data Available:**
- [`value-definitions-comprehensive.json`](../data/value-definitions-comprehensive.json) - 50 values with `semanticMarkers` arrays
- [`frame-value-boosts.json`](../data/frame-value-boosts.json) - Frame and role entailment rules

**Proposed Approach: Hybrid Keyword + Semantic Entailment**

```javascript
// Pseudocode for value detection
function detectValues(text, semanticFrame, roles, contextIntensity) {
  const detectedValues = [];

  // Step 1: Keyword-based detection
  for (const valueDef of VALUE_DEFINITIONS) {
    const keywordMatches = matchKeywords(text, valueDef.semanticMarkers);

    if (keywordMatches.length > 0) {
      // Value is present via direct keyword mention
      const salience = calculateSalience(
        keywordMatches,
        semanticFrame,
        roles,
        valueDef
      );

      const polarity = detectPolarity(
        text,
        valueDef,
        keywordMatches
      );

      detectedValues.push({
        name: valueDef.name,
        domain: valueDef.domain,
        present: true,
        salience: salience,
        polarity: polarity,
        evidence: keywordMatches.map(m => m.context).join('; ')
      });
    }
  }

  // Step 2: Semantic entailment (frame-value boosts)
  const entailedValues = applyFrameValueBoosts(
    semanticFrame,
    roles,
    VALUE_DEFINITIONS
  );

  for (const entailment of entailedValues) {
    // Only add if not already detected via keywords
    if (!detectedValues.find(v => v.name === entailment.valueName)) {
      detectedValues.push({
        name: entailment.valueName,
        domain: entailment.domain,
        present: true,
        salience: entailment.boostAmount, // Frame boost IS the salience
        polarity: 0, // Neutral for entailed values (no explicit text)
        evidence: `Semantic entailment from frame: ${semanticFrame}`,
        source: 'entailment'
      });
    }
  }

  return detectedValues;
}
```

**Questions for TagTeam:**

1. **Keyword Matching Strategy:**
   - Reuse PatternMatcher from Week 2a for consistency?
   - Should value keywords use word boundary matching like context patterns?
   - How to handle multi-word markers like "inherent worth" vs "worth"?

2. **Semantic Entailment Integration:**
   - Should entailed values (from frames/roles) be added even if no text evidence?
   - Or only boost salience of keyword-detected values?
   - Example: "The doctor decided" → Should "Beneficence" appear even without keyword "beneficence" in text?

3. **Detection Threshold:**
   - Should we have a minimum salience threshold (e.g., 0.3) for reporting a value?
   - Or report all detected values regardless of salience?

---

### 1.2 Salience Calculation

**Proposed Formula** (from WEEK2_IEE_RESPONSE.md):

```javascript
function calculateSalience(text, valueDef, semanticFrame, roles) {
  let salience = 0.5; // Base salience

  // Component 1: Keyword frequency boost
  const matchCount = countKeywordMatches(text, valueDef.semanticMarkers);
  const frequencyBoost = Math.min(matchCount * 0.1, 0.2); // Cap at +0.2
  salience += frequencyBoost;

  // Component 2: Frame-specific boost
  const frameBoost = getFrameValueBoost(semanticFrame, valueDef.name);
  salience += frameBoost; // 0.0 to +0.3 from frame-value-boosts.json

  // Component 3: Role-specific boost
  const roleBoost = getRoleValueBoost(roles, valueDef.name);
  salience += roleBoost; // 0.0 to +0.2 from frame-value-boosts.json

  // Clamp to [0.0, 1.0]
  return Math.min(Math.max(salience, 0.0), 1.0);
}
```

**Example Calculation:**

**Text:** "The doctor must decide whether to continue treatment"
- **Frame:** Deciding
- **Roles:** doctor (agent)

**For "Autonomy" value:**
1. **Base salience:** 0.5
2. **Keyword boost:** "decide" matches → +0.1 (1 match)
3. **Frame boost:** Deciding → Autonomy = +0.3 (from frame-value-boosts.json)
4. **Role boost:** doctor → Autonomy = 0.0 (not in role boosts)
5. **Final salience:** 0.5 + 0.1 + 0.3 = **0.9**

**For "Beneficence" value:**
1. **Base salience:** 0.5
2. **Keyword boost:** 0.0 (no keyword match)
3. **Frame boost:** 0.0 (Deciding doesn't boost Beneficence)
4. **Role boost:** doctor → Beneficence = +0.3 (from role boosts)
5. **Final salience:** 0.5 + 0.0 + 0.0 + 0.3 = **0.8**

**Questions for TagTeam:**

4. **Base Salience Value:**
   - Is 0.5 appropriate as base, or should it start at 0.0?
   - 0.5 assumes all keyword-matched values are moderately salient by default
   - 0.0 would make salience purely boost-driven

5. **Frequency Boost Cap:**
   - Is +0.2 cap (2+ mentions) reasonable?
   - Should we allow higher boost for values mentioned 5+ times?

6. **Boost Stacking:**
   - Can frame boost and role boost both apply (+0.3 + 0.2 = +0.5)?
   - Current formula allows stacking - is this correct?

---

### 1.3 Polarity Detection

**Polarity Values:**
- `+1` - Value is upheld/promoted
- `0` - Neutral or conflicted
- `-1` - Value is violated/threatened

**Proposed Detection Logic:**

```javascript
function detectPolarity(text, valueDef, keywordMatches) {
  let upholdingScore = 0;
  let violatingScore = 0;

  // Check for polarity indicators in value definition
  const upholdingPatterns = valueDef.polarityIndicators.upholding;
  const violatingPatterns = valueDef.polarityIndicators.violating;

  // Scan text for polarity keywords
  for (const pattern of upholdingPatterns) {
    if (textContains(text, pattern)) {
      upholdingScore += 1;
    }
  }

  for (const pattern of violatingPatterns) {
    if (textContains(text, pattern)) {
      violatingScore += 1;
    }
  }

  // Decision logic
  if (violatingScore > upholdingScore) {
    return -1; // Violation
  } else if (upholdingScore > violatingScore) {
    return +1; // Upholding
  } else if (upholdingScore > 0 && violatingScore > 0) {
    return 0; // Conflicted (both present)
  } else {
    return 0; // Neutral (no polarity indicators)
  }
}
```

**Example:**

**Text:** "The policy respects patient dignity but demeans the poor"
- **Value:** Human Dignity
- **Upholding patterns matched:** "respects dignity" → +1
- **Violating patterns matched:** "demeans" → +1
- **Result:** polarity = 0 (conflicted)

**Questions for TagTeam:**

7. **Conflict Detection:**
   - Should conflicted values have a separate `conflict: true` field?
   - Or is `polarity: 0` sufficient to indicate conflict?
   - IEE preference: Add `conflict` boolean for explicit tracking

8. **Negation Handling:**
   - If text says "not respecting dignity", should we:
     - A) Flip upholding → violating?
     - B) Use Week 2a negation detection on polarity patterns?
   - Recommended: Reuse negation logic from PatternMatcher

9. **Entailment Polarity:**
   - Values detected via frame/role entailment have no text evidence
   - Should their polarity default to 0 (neutral)?
   - Or should frame entailment imply positive polarity (+1)?

---

### 1.4 Frame-Value Boost Integration

**Data Structure:** [`frame-value-boosts.json`](../data/frame-value-boosts.json)

**Example Entry:**
```json
{
  "frameValueBoosts": {
    "Deciding": {
      "description": "Decision-making frames strongly imply autonomy",
      "boosts": {
        "Autonomy": 0.3,
        "Freedom": 0.2,
        "Responsibility": 0.2,
        "Wisdom": 0.1
      }
    }
  }
}
```

**Implementation:**
```javascript
function getFrameValueBoost(semanticFrame, valueName) {
  const frameBoosts = FRAME_VALUE_BOOSTS.frameValueBoosts[semanticFrame];
  if (!frameBoosts) return 0.0;

  return frameBoosts.boosts[valueName] || 0.0;
}
```

**Questions for TagTeam:**

10. **Unmatched Frames:**
    - What if `semanticFrame` is not in frame-value-boosts.json?
    - Return 0.0 boost (current approach)?
    - Or should we have a default mapping for common frames?

11. **Multiple Frames:**
    - Week 1 returns single `semanticFrame` per sentence
    - Is this still true for Week 2b?
    - Or could multiple frames apply (e.g., "Deciding" + "Questioning")?

---

### 1.5 Role-Value Boost Integration

**Data Structure:** [`frame-value-boosts.json`](../data/frame-value-boosts.json)

**Example Entry:**
```json
{
  "roleValueBoosts": {
    "doctor": {
      "boosts": {
        "Beneficence": 0.3,
        "Non-maleficence": 0.3,
        "Competence": 0.3,
        "Expertise": 0.3
      }
    }
  }
}
```

**Implementation:**
```javascript
function getRoleValueBoost(roles, valueName) {
  let maxBoost = 0.0;

  // Roles from Week 1: { agent, patient, recipient, theme, ... }
  const roleTexts = [
    roles.agent?.text,
    roles.patient?.text,
    roles.recipient?.text
  ].filter(Boolean);

  for (const roleText of roleTexts) {
    const roleBoosts = FRAME_VALUE_BOOSTS.roleValueBoosts[roleText];
    if (roleBoosts && roleBoosts.boosts[valueName]) {
      maxBoost = Math.max(maxBoost, roleBoosts.boosts[valueName]);
    }
  }

  return maxBoost;
}
```

**Questions for TagTeam:**

12. **Role Normalization:**
    - Role text from Week 1: "doctor", "The doctor", "my doctor"
    - Should we normalize to lemma ("doctor") before lookup?
    - Or match as-is and risk missing boosts?

13. **Multiple Role Boosts:**
    - If agent="doctor" and recipient="patient", both might boost same value
    - Current approach: take maximum boost
    - Alternative: sum boosts (with cap)?
    - IEE preference: **Maximum** (avoid double-counting)

---

## Topic 2: API Design Review

### 2.1 Output Structure

**Proposed Week 2b Output Format:**

```javascript
{
  // Week 1 fields (unchanged)
  "agent": { "text": "family", "entity": "family", "type": "collective" },
  "action": { "verb": "decide", "lemma": "decide", "modality": "must" },
  "semanticFrame": "Deciding",

  // Week 2a fields (unchanged)
  "contextIntensity": {
    "temporal": { "urgency": 0.8, "duration": 1.0, "reversibility": 1.0 },
    "relational": { "intimacy": 1.0, "powerDifferential": 0.3, "trust": 0.7 },
    "consequential": { "harmSeverity": 1.0, "benefitMagnitude": 0.4, "scope": 0.1 },
    "epistemic": { "certainty": 0.4, "informationCompleteness": 0.5, "expertise": 0.3 }
  },

  // Week 2b addition (NEW)
  "values": [
    {
      "name": "Autonomy",
      "domain": "dignity",
      "present": true,
      "salience": 0.9,
      "polarity": -1,
      "conflict": false,
      "evidence": "must decide (keyword match)",
      "source": "keyword" // or "entailment"
    },
    {
      "name": "Fidelity",
      "domain": "care",
      "present": true,
      "salience": 0.8,
      "polarity": 0,
      "conflict": false,
      "evidence": "Entailment from role: family",
      "source": "entailment"
    }
  ],

  // Week 2b metadata (NEW)
  "valueSummary": {
    "totalDetected": 2,
    "byDomain": {
      "dignity": 1,
      "care": 1,
      "virtue": 0,
      "community": 0,
      "transcendence": 0
    },
    "avgSalience": 0.85,
    "conflicts": 0
  }
}
```

**Questions for TagTeam:**

14. **Values Array Ordering:**
    - Should values be sorted by salience (highest first)?
    - Or by domain?
    - Or order detected (keyword matches first, entailments last)?
    - IEE preference: **Salience descending** (most salient first)

15. **Conflict Field:**
    - Add explicit `conflict: true/false` field?
    - Or infer from `polarity: 0` + evidence?
    - IEE preference: **Explicit field** for clarity

16. **Value Summary:**
    - Is `valueSummary` object useful for quick stats?
    - Or unnecessary overhead?
    - IEE preference: **Include it** - helps with debugging and analytics

---

### 2.2 Backward Compatibility

**Requirement:** Week 2b must not break Week 1 or Week 2a functionality.

**Verification:**
- All Week 1 fields remain unchanged
- All Week 2a fields remain unchanged
- New `values` and `valueSummary` fields are additive only

**Test Strategy:**
```javascript
// Week 1 baseline test
const result = TagTeam.parse("The doctor decided");
assert(result.agent.text === "doctor");
assert(result.action.verb === "decide");

// Week 2a baseline test
assert(result.contextIntensity.temporal.urgency >= 0.0);

// Week 2b addition test
assert(Array.isArray(result.values));
assert(result.values.length > 0);
```

**Questions for TagTeam:**

17. **Regression Testing:**
    - Will you run Week 1 test corpus (19 checks) against Week 2b bundle?
    - Will you run Week 2a test corpus (5 scenarios, 60 dimensions) against Week 2b?
    - IEE requirement: **Both must pass** for acceptance

---

### 2.3 Performance Considerations

**Requirements:**
- Week 1 target: <30ms parse time
- Week 2a target: <40ms parse time
- Week 2b target: <50ms parse time (adding value matching)

**Performance Risks:**
- 50 values × keyword matching could be slow
- Frame/role boost lookups should be O(1) hash lookups

**Optimization Ideas:**
1. **Precompile regex patterns** for value semantic markers
2. **Early exit** if no keywords match (skip salience calculation)
3. **Cache** frame/role boost lookups per parse session

**Questions for TagTeam:**

18. **Performance Budget:**
    - Is <50ms realistic for 50-value detection?
    - Should we add optional "fast mode" that skips entailments?
    - Or is full detection + entailment feasible within budget?

---

### 2.4 Debug/Verbose Mode

**Proposed Feature:** Optional `debug: true` parameter for development

```javascript
const result = TagTeam.parse(text, { debug: true });

// Adds debug fields
result._debug = {
  "valueDetection": {
    "totalCandidates": 50,
    "keywordMatches": 8,
    "entailments": 3,
    "belowThreshold": 2,
    "reported": 9
  },
  "timings": {
    "semanticRoles": 12,
    "contextIntensity": 8,
    "valueMatching": 15,
    "total": 35
  }
};
```

**Questions for TagTeam:**

19. **Debug Mode Implementation:**
    - Useful for IEE debugging and testing?
    - Or too much overhead for production bundle?
    - IEE preference: **Include it** - very helpful for validation

---

## Topic 3: Timeline and Checkpoints

### 3.1 Week 2b Schedule

**Proposed Timeline:**
- **Jan 18-21:** Planning session (async messaging) ✅ IN PROGRESS
- **Jan 22:** Implementation kickoff
- **Jan 27:** Checkpoint 1 (Midpoint Demo)
  - Value detection working (keyword-based)
  - Salience calculation implemented
  - Polarity detection basic version
- **Feb 3:** Checkpoint 2 (Pre-delivery Review)
  - Full 50-value detection
  - Frame/role entailment working
  - Passing ≥80% of test corpus
- **Feb 7:** Final Delivery
  - Complete bundle with all features
  - Documentation updated
  - 100% test corpus validation (stretch goal)

**Questions for TagTeam:**

20. **Timeline Feasibility:**
    - Is 2 weeks realistic for 50-value matching?
    - Do you need any requirements clarified before starting?
    - Any technical blockers we should address now?

21. **Checkpoint Format:**
    - Same as Week 2a (async messaging + documentation)?
    - Or prefer video call for midpoint demo?

---

### 3.2 Testing Strategy

**Test Corpus:** 20 scenarios in [`test-corpus-week2.json`](../data/test-corpus-week2.json)

**Validation Criteria:**
- **Value Detection Precision:** ≥80% (detected values are correct)
- **Value Detection Recall:** ≥70% (expected values are found)
- **Salience Accuracy:** Within ±0.2 of expected values
- **Polarity Accuracy:** ≥80% correct polarity assignments

**Example Validation:**

**Scenario:** healthcare-001
```json
{
  "testSentence": "The family must decide whether to continue treatment",
  "expectedOutput": {
    "values": [
      { "name": "Autonomy", "salience": 0.9, "polarity": -1 },
      { "name": "Human Dignity", "salience": 0.7, "polarity": 0 },
      { "name": "Care", "salience": 0.8, "polarity": 0 }
    ]
  }
}
```

**Validation Check:**
- ✅ Autonomy detected? Salience 0.7-1.0? Polarity = -1?
- ✅ Human Dignity detected? Salience 0.5-0.9? Polarity = 0?
- ✅ Care detected? Salience 0.6-1.0? Polarity = 0?

**Questions for TagTeam:**

22. **Test Corpus Usage:**
    - Will you validate all 20 scenarios or start with subset (5)?
    - Should IEE provide additional edge case scenarios?
    - Need clarification on any existing scenario annotations?

---

## Topic 4: Technical Questions

### 4.1 Value Definitions Usage

**File:** [`value-definitions-comprehensive.json`](../data/value-definitions-comprehensive.json)

**Structure:**
```json
{
  "values": [
    {
      "id": 1,
      "name": "Human Dignity",
      "domain": "dignity",
      "definition": "The inherent worth and inviolability of every person",
      "semanticMarkers": ["dignity", "inherent worth", "inviolable", "sacred", "human value"],
      "polarityIndicators": {
        "upholding": ["respect dignity", "honor personhood"],
        "violating": ["degrade", "objectify", "use as means"]
      },
      "relatedValues": ["Autonomy", "Equality", "Justice"],
      "examples": [...]
    }
  ]
}
```

**Questions for TagTeam:**

23. **Semantic Markers:**
    - Are these keyword lists sufficient for detection?
    - Need more keywords for any values?
    - Should we add regex patterns for complex markers?

24. **Polarity Indicators:**
    - Are upholding/violating lists comprehensive enough?
    - Need more patterns for specific values?
    - Should we differentiate strong vs weak indicators?

25. **Related Values:**
    - Should detection of one value boost salience of related values?
    - Example: If "Autonomy" detected, boost "Freedom" salience?
    - Or ignore `relatedValues` field for Week 2b?
    - IEE preference: **Ignore for now** (future enhancement)

---

### 4.2 Frame-Value Boosts Clarifications

**File:** [`frame-value-boosts.json`](../data/frame-value-boosts.json)

**Coverage:**
- 12 frames mapped (Deciding, Questioning, Becoming_aware, etc.)
- 15 roles mapped (doctor, patient, parent, etc.)

**Questions for TagTeam:**

26. **Missing Frames/Roles:**
    - Will Week 2b encounter frames not in boosts file?
    - How to handle unmapped frames? (return 0.0 boost)
    - Should IEE expand the boosts file before Week 2b starts?

27. **Boost Value Ranges:**
    - Current boosts: 0.1 to 0.3
    - Are these magnitudes appropriate?
    - Should some frames have stronger boosts (e.g., 0.5)?

---

### 4.3 Edge Cases and Ambiguities

**Scenario Examples:**

**Edge Case 1: No Values Detected**
```javascript
// Text: "The ball rolled down the hill"
// Expected: values = [] (no ethical content)
```
**Question 28:** Should `values` be empty array or include low-salience defaults?

**Edge Case 2: All Values Equally Salient**
```javascript
// Text: "The ethical framework considers all moral principles"
// Might trigger many values with similar salience
```
**Question 29:** Should we limit to top N values (e.g., top 10)? Or report all?

**Edge Case 3: Conflicting Polarities**
```javascript
// Text: "The policy promotes freedom but restricts autonomy"
// Autonomy and Freedom are related but have opposite polarities
```
**Question 30:** How to represent this nuance? Separate entries for each value?

---

## Decision Log

This section will track decisions made during the async planning session.

### Decisions

| # | Topic | Decision | Rationale | Date |
|---|-------|----------|-----------|------|
| - | *Pending TagTeam responses* | - | - | - |

---

## Action Items

### IEE Team
- [ ] Provide responses to TagTeam's questions (if any arise)
- [ ] Review and approve final architecture decisions
- [ ] Prepare validation environment for Week 2b testing
- [ ] Send Zoom link if synchronous checkpoint preferred

### TagTeam Team
- [ ] Review planning session document
- [ ] Respond to 30 technical questions above
- [ ] Propose alternative approaches if needed
- [ ] Confirm timeline feasibility
- [ ] Begin implementation on Jan 22

---

## Open Questions from TagTeam

*TagTeam: Please add any additional questions or concerns here*

### Q1: [TagTeam question here]
**IEE Response:** [To be filled]

---

## Next Steps

1. **TagTeam:** Review this planning document and respond to questions (by Jan 20)
2. **IEE:** Address TagTeam questions and finalize architecture (by Jan 21)
3. **Joint:** Align on final approach via messaging (Jan 21)
4. **TagTeam:** Begin implementation (Jan 22)
5. **Checkpoint 1:** Jan 27 (midpoint demo)

---

## Notes and Discussion

*This section for free-form discussion during async planning*

### IEE Notes

**Philosophy of Value Detection:**

The proposed approach balances two detection methods:

1. **Keyword Matching** - Direct text evidence (high confidence)
2. **Semantic Entailment** - Inferred from frame/role (lower confidence but captures implicit values)

This dual approach aligns with our ontological commitment to **value realism** (values exist even when not explicitly named) while maintaining **epistemic humility** (explicit text evidence is stronger than inference).

**Polarity as Normative Semantics:**

The tripartite polarity system (+1, 0, -1) represents our ethical pluralism:
- **+1 (upholding):** Value is promoted/respected
- **-1 (violating):** Value is threatened/violated
- **0 (neutral/conflicted):** Either no clear stance OR genuine moral conflict

The `conflict` boolean distinguishes between "we don't know" (no evidence) and "genuine conflict" (competing evidence), which is philosophically significant.

### TagTeam Notes

*TagTeam: Add your architectural notes, concerns, or alternative proposals here*

---

**Document Status:** 🟡 IN PROGRESS
**Last Updated:** January 18, 2026
**Next Update:** After TagTeam initial responses (target: Jan 20)
