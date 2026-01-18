# Week 2 Planning - Context Analysis Implementation

**Date:** January 11, 2026
**Milestone:** Week 2 (Jan 13-17)
**Status:** Planning Phase
**Strategy:** Aligned with IEE Phase 1 approach

---

## Executive Summary

Following IEE's confirmation of the phased semantic strategy, Week 2 development will focus on **parsing accuracy for context dimensions** using the existing flat JSON output format. IEE will handle semantic lifting on their infrastructure.

**Key Decision:** Continue with flat JSON approach (Phase 1), defer dependency graphs and BFO grounding to Phase 2-3.

---

## What Changed After IEE Feedback

### Before IEE Feedback (Uncertainty):
- ❓ Should we build dependency graphs for context analysis?
- ❓ Should we implement BFO intentionality model?
- ❓ Should we add JSON-LD output?
- ❓ Should we integrate POS Graph POC capabilities?

### After IEE Feedback (Clarity):
- ✅ Continue flat JSON output
- ✅ Focus on parsing accuracy (target: 75% → 85%+)
- ✅ IEE handles semantic lifting
- 📋 JSON-LD @context in Phase 2 (Weeks 4-6) after accuracy threshold
- 🔮 BFO alignment in Phase 3 (Month 3+) if governance features prove valuable

---

## Week 2 Scope: Context Analysis

### Input Format
```
"I should remove my father from life support even though it conflicts with my religious beliefs"
```

### Output Format (Flat JSON)
```json
{
  "agent": {
    "text": "I",
    "role": "agent",
    "entity": "self",
    "posTag": "PRP"
  },
  "action": {
    "verb": "remove",
    "lemma": "remove",
    "tense": "present",
    "aspect": "simple",
    "modality": "should",
    "negation": false
  },
  "patient": {
    "text": "father",
    "role": "patient",
    "entity": "family_member",
    "posTag": "NN"
  },
  "theme": {
    "text": "life_support",
    "role": "theme",
    "entity": "medical_equipment",
    "posTag": "NN"
  },
  "semanticFrame": "Deciding",
  "context": {
    "personsInvolved": 2,
    "autonomyAtStake": "high",
    "relationshipType": "family",
    "setting": "private",
    "valueConflict": true
  },
  "confidence": 0.82
}
```

### New Field: `context`

**Required Dimensions (from IEE Week 2 specs):**

1. **personsInvolved** (number)
   - Count of distinct persons referenced
   - Self-references count as 1
   - Examples: "I" (1), "I and my father" (2), "The family" (3+)

2. **autonomyAtStake** ("low" | "medium" | "high")
   - Low: Minor personal choices (e.g., "Should I change jobs?")
   - Medium: Significant but reversible (e.g., "Should I move?")
   - High: Life/death, irreversible (e.g., "Should I remove life support?")

3. **relationshipType** ("none" | "family" | "professional" | "romantic" | "friendship" | "community")
   - Based on entity types and possessive markers
   - Examples: "my father" → "family", "my boss" → "professional"

4. **setting** ("public" | "private" | "institutional" | "unknown")
   - Public: Community, environmental, social
   - Private: Home, personal
   - Institutional: Hospital, workplace, church
   - Unknown: Cannot determine from text

5. **valueConflict** (boolean)
   - Detect phrases like "even though", "but", "conflicts with"
   - Detect value-laden terms: "beliefs", "principles", "morals"
   - True if conflict markers + value terms both present

---

## Implementation Strategy

### Approach: Heuristic Pattern Matching + Entity Analysis

**Why this approach:**
- ✅ Consistent with Phase 1 flat JSON
- ✅ Fast (target <10ms)
- ✅ Deterministic and debuggable
- ✅ Builds on existing role extraction
- ✅ IEE handles semantic lifting

**Not using:**
- ❌ Dependency graphs (deferred to Phase 2-3)
- ❌ External APIs (Wikidata, etc.)
- ❌ BFO grounding (deferred to Phase 3)

### Step 1: Person Count Detection

**Heuristics:**
1. Count unique person entities in agent/patient/recipient roles
2. Treat "I", "me", "my" as 1 person (self)
3. Family terms ("family", "parents") = 3+ persons
4. Plural pronouns ("we", "they") = 2+ persons
5. Count possessive markers ("my X", "their Y") as +1 person

**Implementation:**
```javascript
_countPersons(roles, text) {
    let count = 0;
    const seenEntities = new Set();

    // Check each role for person entities
    ['agent', 'patient', 'recipient'].forEach(role => {
        if (roles[role] && this._isPersonEntity(roles[role].entity)) {
            seenEntities.add(roles[role].entity);
        }
    });

    // Count unique person entities
    count = seenEntities.size;

    // Add possessive markers as additional persons
    const possessiveMarkers = text.match(/\b(my|his|her|their|our)\s+\w+/gi) || [];
    possessiveMarkers.forEach(marker => {
        if (!marker.toLowerCase().startsWith('my ')) {
            count++;
        }
    });

    return Math.max(count, 1); // Minimum 1 person
}
```

### Step 2: Autonomy Stake Classification

**Heuristics:**
1. High: Life/death terms, irreversible actions, medical decisions
2. Medium: Career changes, relationships, relocations
3. Low: Preferences, minor choices, opinions

**Keywords:**
- High: "life", "death", "die", "kill", "remove", "terminate", "life support"
- Medium: "job", "career", "move", "marry", "divorce", "break up"
- Low: "choose", "prefer", "like", "want", "consider"

**Implementation:**
```javascript
_classifyAutonomyStake(action, patient, theme, frame) {
    const highStakeTerms = ['life', 'death', 'die', 'kill', 'remove', 'terminate', 'life_support'];
    const mediumStakeTerms = ['job', 'career', 'move', 'marry', 'divorce'];

    const allText = [
        action?.verb,
        patient?.text,
        theme?.text,
        frame
    ].filter(Boolean).join(' ').toLowerCase();

    if (highStakeTerms.some(term => allText.includes(term))) {
        return 'high';
    }
    if (mediumStakeTerms.some(term => allText.includes(term))) {
        return 'medium';
    }
    return 'low';
}
```

### Step 3: Relationship Type Detection

**Heuristics:**
1. Check entity types for relationship indicators
2. Look for possessive markers + entity type
3. Default to "none" if no relationships detected

**Entity Type Mapping:**
- "family_member", "father", "mother", "parent" → "family"
- "boss", "colleague", "doctor", "medical_professional" → "professional"
- "partner", "spouse" → "romantic"
- "friend" → "friendship"
- "community", "public" → "community"

**Implementation:**
```javascript
_detectRelationshipType(roles) {
    const familyEntities = ['family', 'family_member', 'father', 'mother', 'parent', 'child'];
    const professionalEntities = ['boss', 'colleague', 'doctor', 'medical_professional'];
    const romanticEntities = ['partner', 'spouse', 'boyfriend', 'girlfriend'];

    for (const role of ['agent', 'patient', 'recipient']) {
        const entity = roles[role]?.entity?.toLowerCase();
        if (!entity) continue;

        if (familyEntities.includes(entity)) return 'family';
        if (professionalEntities.includes(entity)) return 'professional';
        if (romanticEntities.includes(entity)) return 'romantic';
    }

    return 'none';
}
```

### Step 4: Setting Classification

**Heuristics:**
1. Look for location/setting keywords in text
2. Infer from entity types (e.g., "doctor" → institutional)
3. Default to "unknown"

**Keywords:**
- Public: "public", "community", "street", "park"
- Private: "home", "house", "personal", "private"
- Institutional: "hospital", "office", "church", "school", "workplace"

**Implementation:**
```javascript
_classifySetting(text, roles) {
    const lowerText = text.toLowerCase();

    const publicTerms = ['public', 'community', 'street', 'park', 'environment'];
    const privateTerms = ['home', 'house', 'personal', 'private'];
    const institutionalTerms = ['hospital', 'office', 'church', 'school', 'workplace'];

    if (publicTerms.some(term => lowerText.includes(term))) return 'public';
    if (privateTerms.some(term => lowerText.includes(term))) return 'private';
    if (institutionalTerms.some(term => lowerText.includes(term))) return 'institutional';

    // Infer from entity types
    const entities = [roles.agent, roles.patient, roles.recipient]
        .filter(Boolean)
        .map(r => r.entity);

    if (entities.includes('medical_professional') || entities.includes('doctor')) {
        return 'institutional';
    }

    return 'unknown';
}
```

### Step 5: Value Conflict Detection

**Heuristics:**
1. Look for conflict markers: "even though", "but", "however", "conflicts with"
2. Look for value terms: "beliefs", "values", "principles", "morals", "religion"
3. Return true only if BOTH conflict markers AND value terms present

**Implementation:**
```javascript
_detectValueConflict(text) {
    const conflictMarkers = ['even though', 'but', 'however', 'although', 'conflicts with', 'despite'];
    const valueTerms = ['belief', 'value', 'principle', 'moral', 'religion', 'ethic', 'conscience'];

    const lowerText = text.toLowerCase();

    const hasConflictMarker = conflictMarkers.some(marker => lowerText.includes(marker));
    const hasValueTerm = valueTerms.some(term => lowerText.includes(term));

    return hasConflictMarker && hasValueTerm;
}
```

---

## Testing Strategy

### Test Scenarios (from IEE Week 2)

1. **Healthcare Decision:**
   - Input: "I should remove my father from life support even though it conflicts with my religious beliefs"
   - Expected context:
     - personsInvolved: 2
     - autonomyAtStake: "high"
     - relationshipType: "family"
     - setting: "institutional" (inferred from medical context)
     - valueConflict: true

2. **Spiritual Crisis:**
   - Input: "I am questioning core doctrines"
   - Expected context:
     - personsInvolved: 1
     - autonomyAtStake: "medium"
     - relationshipType: "none"
     - setting: "private"
     - valueConflict: false (no explicit conflict marker)

3. **Vocational Dilemma:**
   - Input: "I discovered that my company is falsifying safety reports"
   - Expected context:
     - personsInvolved: 2 (I + company)
     - autonomyAtStake: "high" (safety issue)
     - relationshipType: "professional"
     - setting: "institutional"
     - valueConflict: false (no value terms)

4. **Interpersonal Conflict:**
   - Input: "My best friend is cheating"
   - Expected context:
     - personsInvolved: 2 (I + friend)
     - autonomyAtStake: "medium"
     - relationshipType: "friendship"
     - setting: "private"
     - valueConflict: false

5. **Environmental Concern:**
   - Input: "The factory is polluting our water supply"
   - Expected context:
     - personsInvolved: 3+ (our = community)
     - autonomyAtStake: "high" (public health)
     - relationshipType: "community"
     - setting: "public"
     - valueConflict: false

---

## Implementation Plan

### Files to Modify

**src/SemanticRoleExtractor.js**
- Add `_analyzeContext(sentence, roles)` method
- Add 5 helper methods for each context dimension
- Update `parseSemanticAction()` to call `_analyzeContext()`
- Add context object to output

**src/test-iee-week2.html** (Create New)
- Test 5 IEE Week 2 scenarios
- Validate context dimensions
- Display pass/fail for each check
- Show overall pass rate

**dist/tagteam.js** (Update Bundle)
- Rebuild with context analysis
- Maintain same `TagTeam.parse()` API
- Output includes new `context` field

### Timeline

**Monday Jan 13:**
- Implement person count detection
- Implement autonomy stake classification
- Test with scenario 1 (healthcare)

**Tuesday Jan 14:**
- Implement relationship type detection
- Implement setting classification
- Test with scenarios 2-3 (spiritual, vocational)

**Wednesday Jan 15:**
- Implement value conflict detection
- Test with scenarios 4-5 (interpersonal, environmental)
- Create test-iee-week2.html

**Thursday Jan 16:**
- Rebuild bundle (dist/tagteam.js)
- Run full test suite
- Fix any failing scenarios

**Friday Jan 17:**
- Final validation
- Documentation
- Prepare deliverable for IEE

---

## Success Criteria

### Accuracy Targets
- ✅ Pass rate ≥75% on IEE Week 2 test scenarios
- ✅ All 5 context dimensions extracted
- ✅ Performance <10ms per sentence
- ✅ IEE format compliance maintained

### Deliverables
- ✅ Updated SemanticRoleExtractor.js with context analysis
- ✅ test-iee-week2.html validation test
- ✅ Updated dist/tagteam.js bundle
- ✅ Documentation of context dimension logic

---

## What We're NOT Doing (Deferred to Phase 2-3)

### Not in Week 2:
- ❌ Dependency graph output
- ❌ Wikidata entity linking
- ❌ BFO intentional act modeling
- ❌ SHML middle layer
- ❌ JSON-LD @context (waiting for IEE to provide)
- ❌ Process provenance metadata

### Why:
- IEE handles semantic lifting in Phase 1
- Focus on parsing accuracy first
- JSON-LD @context added in Phase 2 (after 85%+ accuracy)
- Full BFO alignment in Phase 3 (if governance features needed)

---

## Questions for IEE (Before Starting)

1. **Context Dimension Specs:**
   - Are the 5 dimensions (persons, autonomy, relationship, setting, conflict) complete?
   - Any additional dimensions needed?

2. **Accuracy Targets:**
   - Is 75% pass rate still the target for Week 2?
   - Or should we aim for 80-85% to prepare for Phase 2?

3. **Test Scenarios:**
   - Are the 5 scenarios the complete Week 2 test corpus?
   - Any additional edge cases to test?

4. **Value Terms:**
   - Should we expand the value term list?
   - IEE's domain may have specific value vocabulary

---

**Status:** Ready to begin Week 2 implementation
**Next Step:** Confirm scope with IEE, then start implementation Monday Jan 13
**Target Completion:** Friday Jan 17 (Week 2 deliverable)
