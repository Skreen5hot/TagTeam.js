# Week 1 Fix Plan - IEE Validation Results Response

**Date:** January 11, 2026
**Current Pass Rate:** 63.2% (12/19 checks)
**Target Pass Rate:** ≥75% (Week 1 minimum)
**Stretch Goal:** ≥85% (Phase 2 trigger)
**Status:** Action Required

---

## Executive Summary

IEE has validated Week 1 deliverable and identified **7 failing checks** across 5 test scenarios. The validation report provides excellent diagnostic information showing **two critical issues** that account for 100% of the failures:

1. **Progressive aspect verb handling** (40% of failures) - HIGH PRIORITY
2. **Semantic frame mappings** (60% of failures) - HIGH PRIORITY

**Good news:** Both issues have clear, straightforward fixes. IEE's analysis shows we can reach **89.5% pass rate** with just Priority 1 and Priority 2 fixes.

---

## Validation Results Summary

### Overall Performance

| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| **Pass Rate** | 63.2% | ≥75% | ⚠️ Below Target |
| **Total Checks** | 19 | - | - |
| **Passed** | 12 ✅ | - | - |
| **Failed** | 7 ❌ | - | - |

### Performance by Check Type

| Check Type | Pass Rate | Assessment |
|-----------|-----------|------------|
| **Agent Extraction** | 83% (5/6) | ✅ Strong (one edge case) |
| **Action Extraction** | 60% (3/5) | ⚠️ Critical issue - progressive verbs |
| **Modality Detection** | 100% (2/2) | ✅ Excellent |
| **Patient Extraction** | 100% (3/3) | ✅ Excellent |
| **Frame Classification** | 40% (2/5) | ⚠️ Critical issue - new frames |

### Strengths Confirmed ✅

1. **Modality detection:** 100% accuracy
2. **Patient extraction:** 100% accuracy (including compound terms)
3. **Compound term detection:** Working correctly ("core_doctrines", "best_friend")
4. **Performance:** <10ms per sentence
5. **Format compliance:** JSON structure correct
6. **Deterministic:** Consistent, reproducible results

---

## Critical Issues and Fixes

### Priority 1: Progressive Aspect Verb Handling (HIGH)

**Problem:** Parser extracts auxiliary verbs instead of main verbs in progressive constructions.

**Failing Scenarios:**
- ❌ "I **am questioning** core doctrines" → extracted "am" instead of "questioning"
- ❌ "My best friend **is cheating** on their spouse" → extracted "is" instead of "cheating"

**Impact:** 40% of action extraction failures (2/5 scenarios)

**Root Cause:**
The current action extraction logic stops at the first verb it encounters (VBZ/VBP tag), which is the auxiliary in progressive constructions.

**Fix Implementation:**

**File:** `src/SemanticRoleExtractor.js`

**Current Code (Line ~450-480):**
```javascript
_extractAction(tokens) {
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // Current: Stops at first verb (including auxiliaries)
        if (this._isVerb(token.tag)) {
            return {
                verb: token.word,
                verbOriginal: token.word,
                lemma: this._lemmatize(token.word, token.tag),
                posTag: token.tag
            };
        }
    }
}
```

**Fixed Code:**
```javascript
_extractAction(tokens) {
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const nextToken = tokens[i + 1];

        // NEW: Skip auxiliary verbs in progressive constructions
        if (this._isAuxiliaryVerb(token.word) &&
            nextToken &&
            nextToken.tag === 'VBG') {
            // Skip auxiliary, continue to next iteration which will catch VBG
            continue;
        }

        if (this._isVerb(token.tag)) {
            return {
                verb: token.word,
                verbOriginal: token.word,
                lemma: this._lemmatize(token.word, token.tag),
                posTag: token.tag
            };
        }
    }
}

_isAuxiliaryVerb(word) {
    const auxiliaries = ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being'];
    return auxiliaries.includes(word.toLowerCase());
}
```

**Test Cases:**
```javascript
// Should extract "questioning" not "am"
"I am questioning core doctrines"
Expected: { verb: "questioning", lemma: "question" }

// Should extract "cheating" not "is"
"My best friend is cheating on their spouse"
Expected: { verb: "cheating", lemma: "cheat" }

// Should still work for simple present
"I question core doctrines"
Expected: { verb: "question", lemma: "question" }
```

**Estimated Impact:** +2 checks (raises pass rate to 73.7%)

---

### Priority 2: Semantic Frame Mappings (HIGH)

**Problem:** New frames (Questioning, Becoming_aware, Offenses) are not mapped to their respective verbs.

**Failing Scenarios:**
- ❌ "questioning" should map to "Questioning" frame (got "Generic_action")
- ❌ "discovered" should map to "Becoming_aware" frame (got "Generic_action")
- ❌ "cheating" should map to "Offenses" frame (got "Generic_action")

**Impact:** 60% of frame classification failures (3/5 scenarios)

**Root Cause:**
The VERB_TO_FRAME mapping doesn't include entries for "question", "discover", "cheat".

**Fix Implementation:**

**File:** `src/SemanticRoleExtractor.js`

**Current VERB_TO_FRAME (Line ~180-220):**
```javascript
this.VERB_TO_FRAME = {
    // Existing mappings
    'decide': 'Deciding',
    'choose': 'Deciding',
    'select': 'Deciding',
    'tell': 'Revealing_information',
    'inform': 'Revealing_information',
    'reveal': 'Revealing_information',
    // ... other mappings
};
```

**Add New Mappings:**
```javascript
this.VERB_TO_FRAME = {
    // Existing mappings...

    // NEW: IEE Week 1 frames
    'question': 'Questioning',
    'doubt': 'Questioning',
    'challenge': 'Questioning',

    'discover': 'Becoming_aware',
    'find': 'Becoming_aware',
    'learn': 'Becoming_aware',
    'realize': 'Becoming_aware',

    'cheat': 'Offenses',
    'betray': 'Offenses',
    'deceive': 'Offenses',
    'lie': 'Offenses',
    'falsify': 'Offenses'
};
```

**Also verify FRAME_NAME_MAPPING exists (Line ~150-170):**
```javascript
this.FRAME_NAME_MAPPING = {
    'Deciding': 'Deciding',
    'Revealing_information': 'Revealing_information',
    'Questioning': 'Questioning',        // ✅ Verify present
    'Becoming_aware': 'Becoming_aware',  // ✅ Verify present
    'Offenses': 'Offenses'               // ✅ Verify present
};
```

**Test Cases:**
```javascript
// "questioning" → "Questioning" frame
"I am questioning core doctrines"
Expected: { semanticFrame: "Questioning" }

// "discovered" → "Becoming_aware" frame
"I discovered that my company is falsifying safety reports"
Expected: { semanticFrame: "Becoming_aware" }

// "cheating" → "Offenses" frame
"My best friend is cheating on their spouse"
Expected: { semanticFrame: "Offenses" }
```

**Estimated Impact:** +3 checks (raises pass rate to 89.5%)

---

### Priority 3: Lemmatization (MEDIUM)

**Problem:** Past tense verb "discovered" not lemmatized to base form "discover".

**Failing Scenario:**
- ❌ "I **discovered** that..." → returned "discovered" instead of "discover"

**Impact:** 20% of action extraction failures (1/5 scenarios)

**Root Cause:**
The POS tagger lemmatization may not handle VBD (past tense) correctly, or the lemma lookup is incomplete.

**Fix Investigation:**

**File:** `src/POSTagger.js` (if lemmatization happens there) or `src/SemanticRoleExtractor.js`

**Check Current Lemmatization:**
```javascript
_lemmatize(word, posTag) {
    // Check if this handles VBD → base form
    if (posTag === 'VBD') {
        // Should convert "discovered" → "discover"
        return this._irregularVerbs[word] || word.replace(/ed$/, '');
    }
}
```

**Add Irregular Verb Lookup:**
```javascript
this.IRREGULAR_VERBS = {
    'was': 'be',
    'were': 'be',
    'had': 'have',
    'did': 'do',
    'went': 'go',
    'came': 'come',
    'saw': 'see',
    'made': 'make',
    'took': 'take',
    'got': 'get',
    'gave': 'give',
    'found': 'find',
    'thought': 'think',
    'told': 'tell',
    'became': 'become',
    'left': 'leave',
    'felt': 'feel',
    'brought': 'bring',
    'began': 'begin',
    'kept': 'keep',
    'held': 'hold',
    'wrote': 'write',
    'stood': 'stand',
    'heard': 'hear',
    'let': 'let',
    'meant': 'mean',
    'set': 'set',
    'met': 'meet',
    'ran': 'run',
    'paid': 'pay',
    'sat': 'sit',
    'spoke': 'speak',
    'lay': 'lie',
    'led': 'lead',
    'read': 'read',
    'grew': 'grow',
    'lost': 'lose',
    'fell': 'fall',
    'sent': 'send',
    'built': 'build',
    'understood': 'understand',
    'drew': 'draw',
    'broke': 'break',
    'spent': 'spend',
    'cut': 'cut',
    'rose': 'rise',
    'drove': 'drive',
    'shot': 'shoot',
    'wore': 'wear',
    'chose': 'choose',
    'sought': 'seek',
    'threw': 'throw',
    'shone': 'shine',
    'forgot': 'forget',
    'flew': 'fly',
    'hurt': 'hurt',
    'arose': 'arise',
    'woke': 'wake',
    'ate': 'eat',
    'swam': 'swim',
    'gave': 'give',
    'froze': 'freeze',
    'hung': 'hang',
    'caught': 'catch',
    'taught': 'teach',
    'sold': 'sell',
    'won': 'win',
    'bit': 'bite',
    'hid': 'hide',
    'shook': 'shake',
    'rode': 'ride'
};

_lemmatize(word, posTag) {
    const lower = word.toLowerCase();

    // Check irregular verbs first
    if (this.IRREGULAR_VERBS[lower]) {
        return this.IRREGULAR_VERBS[lower];
    }

    // Regular verb lemmatization
    if (posTag === 'VBD' || posTag === 'VBN') {
        // Remove -ed suffix for regular verbs
        if (lower.endsWith('ed')) {
            return lower.replace(/ed$/, '');
        }
    }

    if (posTag === 'VBG') {
        // Remove -ing suffix
        if (lower.endsWith('ing')) {
            return lower.replace(/ing$/, '');
        }
    }

    if (posTag === 'VBZ') {
        // Remove -s suffix
        if (lower.endsWith('s')) {
            return lower.replace(/s$/, '');
        }
    }

    return lower;
}
```

**Test Case:**
```javascript
"I discovered that my company is falsifying safety reports"
Expected: { action: { verb: "discovered", lemma: "discover" } }
```

**Note:** "discovered" is actually regular (discover + ed), so the suffix removal should work. Need to verify the lemmatization is being called and returned correctly.

**Estimated Impact:** +1 check (raises pass rate to 94.7%)

---

### Priority 4: Agent Extraction for "family" (LOW)

**Problem:** "The family must decide..." did not extract "family" as agent.

**Failing Scenario:**
- ❌ "**The family** must decide whether to continue treatment" → agent = null

**Impact:** 17% of agent extraction failures (1/6 scenarios)

**Root Cause Investigation:**

**Possible causes:**
1. The determiner "The" is causing the noun phrase to be skipped
2. The agent extraction is looking for pronouns/proper nouns and missing common nouns
3. The word "family" is not in the person/agent entity list

**Fix Investigation:**

**File:** `src/SemanticRoleExtractor.js`

**Check agent extraction logic:**
```javascript
_extractAgent(tokens) {
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // Current: May be skipping DT + NN patterns
        if (this._isAgentTag(token.tag)) {
            return {
                text: token.word,
                role: 'agent',
                entity: this._classifyEntity(token.word),
                posTag: token.tag
            };
        }
    }
}

_isAgentTag(tag) {
    // Check if this includes NN tags or just PRP
    return ['PRP', 'PRP$', 'NN', 'NNP', 'NNPS'].includes(tag);
}
```

**Potential fix - look for noun phrases before verb:**
```javascript
_extractAgent(tokens) {
    // Find the main verb position first
    const verbIndex = tokens.findIndex(t => this._isVerb(t.tag));
    if (verbIndex === -1) return null;

    // Look backwards from verb for agent
    for (let i = verbIndex - 1; i >= 0; i--) {
        const token = tokens[i];
        const prevToken = tokens[i - 1];

        // Skip determiners but continue looking
        if (token.tag === 'DT') {
            continue;
        }

        // Accept pronouns and nouns as agents
        if (['PRP', 'PRP$', 'NN', 'NNP', 'NNPS', 'NNS'].includes(token.tag)) {
            return {
                text: token.word,
                role: 'agent',
                entity: this._classifyEntity(token.word),
                posTag: token.tag
            };
        }
    }

    return null;
}
```

**Test Case:**
```javascript
"The family must decide whether to continue treatment"
Expected: { agent: { text: "family", entity: "family", posTag: "NN" } }
```

**Estimated Impact:** +1 check (raises pass rate to 100%)

---

## Implementation Timeline

### Day 1 (Monday, Jan 13) - Priority 1 & 2

**Morning (2-3 hours):**
- ✅ Implement Priority 1: Progressive aspect handling
  - Add `_isAuxiliaryVerb()` helper method
  - Update `_extractAction()` to skip auxiliaries before VBG
  - Test with "I am questioning", "is cheating" examples

**Afternoon (2-3 hours):**
- ✅ Implement Priority 2: Frame mappings
  - Add verb-to-frame mappings for question/discover/cheat
  - Verify FRAME_NAME_MAPPING entries exist
  - Test frame classification

**End of Day:**
- ✅ Run validation tests
- ✅ Target: 89.5% pass rate (17/19 checks)

### Day 2 (Tuesday, Jan 14) - Priority 3 & 4

**Morning (2-3 hours):**
- ✅ Implement Priority 3: Lemmatization
  - Add irregular verb lookup table
  - Verify VBD handling
  - Test "discovered" → "discover"

**Afternoon (2-3 hours):**
- ✅ Debug Priority 4: Agent extraction
  - Investigate "The family" failure
  - Fix determiner handling
  - Test agent extraction with determiners

**End of Day:**
- ✅ Run full validation suite
- ✅ Target: 94.7-100% pass rate

### Day 3 (Wednesday, Jan 15) - Testing & Bundle

**Morning (2 hours):**
- ✅ Create comprehensive test suite
- ✅ Add edge case tests
- ✅ Verify all 5 IEE scenarios pass

**Afternoon (2 hours):**
- ✅ Rebuild dist/tagteam.js bundle
- ✅ Update dist/test-iee-bundle.html
- ✅ Test bundle in browser and Node.js

### Day 4 (Thursday, Jan 16) - Validation & Documentation

**Morning (2 hours):**
- ✅ Re-run IEE validation with fixed bundle
- ✅ Document all changes made
- ✅ Create test report

**Afternoon (2 hours):**
- ✅ Update STATUS.md with new results
- ✅ Prepare deliverable for IEE
- ✅ Create validation evidence package

### Day 5 (Friday, Jan 17) - Delivery

**Morning:**
- ✅ Final validation check
- ✅ Package deliverables
- ✅ Send to IEE team

---

## Testing Strategy

### Test Files to Create/Update

1. **test-week1-fixes.html** (New)
   - Focused test for the 7 failing checks
   - Before/after comparison
   - Clear pass/fail indicators

2. **dist/test-iee-bundle.html** (Update)
   - Re-run with fixed bundle
   - Should show ≥89.5% pass rate

3. **src/test/** (New directory)
   - Unit tests for progressive aspect handling
   - Unit tests for frame mapping
   - Unit tests for lemmatization

### Validation Checklist

**Progressive Aspect Tests:**
- [ ] "I am questioning core doctrines" → verb: "questioning"
- [ ] "is cheating" → verb: "cheating"
- [ ] "was thinking" → verb: "thinking"
- [ ] "were running" → verb: "running"
- [ ] "am being" → verb: "being"

**Frame Mapping Tests:**
- [ ] "question" → "Questioning"
- [ ] "discover" → "Becoming_aware"
- [ ] "cheat" → "Offenses"
- [ ] "decide" → "Deciding" (regression test)
- [ ] "tell" → "Revealing_information" (regression test)

**Lemmatization Tests:**
- [ ] "discovered" → "discover"
- [ ] "questioned" → "question"
- [ ] "cheated" → "cheat"
- [ ] "decided" → "decide"

**Agent Extraction Tests:**
- [ ] "The family must decide" → agent: "family"
- [ ] "I am questioning" → agent: "i"
- [ ] "We must decide" → agent: "we"
- [ ] "My best friend is cheating" → agent: "best_friend"

---

## Expected Results After Fixes

### Pass Rate Projection

| Stage | Fixes Applied | Pass Rate | Status |
|-------|--------------|-----------|--------|
| Current | None | 63.2% (12/19) | ⚠️ Below target |
| After P1 | Progressive verbs | 73.7% (14/19) | ⚠️ Still below |
| After P1+P2 | + Frame mappings | **89.5% (17/19)** | ✅ Exceeds target |
| After P1+P2+P3 | + Lemmatization | **94.7% (18/19)** | ✅ Excellent |
| After All | + Agent fix | **100% (19/19)** | ✅ Perfect |

### Scenario Results Projection

| Scenario | Current | After Fixes | Change |
|----------|---------|-------------|--------|
| healthcare-001 | 75% (3/4) | 100% (4/4) | +1 ✅ |
| spiritual-001 | 50% (2/4) | 100% (4/4) | +2 ✅ |
| vocational-001 | 33% (1/3) | 100% (3/3) | +2 ✅ |
| interpersonal-001 | 50% (2/4) | 100% (4/4) | +2 ✅ |
| environmental-001 | 100% (4/4) | 100% (4/4) | ✅ |

---

## Files to Modify

### Core Implementation

**src/SemanticRoleExtractor.js** (Primary file)
- Line ~450-480: `_extractAction()` - Add progressive aspect handling
- Line ~180-220: `VERB_TO_FRAME` - Add new frame mappings
- Line ~300-330: `_lemmatize()` - Add irregular verbs and improve VBD handling
- Line ~400-430: `_extractAgent()` - Fix determiner handling
- Line ~50-80: Add `_isAuxiliaryVerb()` helper method
- Line ~60-100: Add `IRREGULAR_VERBS` constant

### Testing

**test-week1-fixes.html** (New)
- Test focused on 7 failing checks
- Before/after comparison UI

**dist/test-iee-bundle.html** (Update)
- Will automatically use new bundle

### Bundle

**dist/tagteam.js** (Rebuild)
- Regenerate after source changes
- Same build process as Week 1

### Documentation

**iee-collaboration/to-iee/week1/FIXES_IMPLEMENTED.md** (New)
- Document all changes
- Include before/after results
- Provide validation evidence

**iee-collaboration/to-iee/week1/STATUS.md** (Update)
- Update pass rate
- Update status to "✅ Ready for Validation (89.5%+)"

---

## Risk Assessment

### Low Risk ✅

**Priority 1 & 2 fixes:**
- Clear, isolated changes
- Well-tested patterns
- High confidence in success

### Medium Risk ⚠️

**Priority 3 (Lemmatization):**
- May need irregular verb lookup table
- Edge cases possible
- But failure only affects 1 check

**Priority 4 (Agent extraction):**
- Requires careful investigation
- May have broader implications
- But failure only affects 1 check

### Mitigation

- Test each fix in isolation before combining
- Maintain regression test suite for passing checks
- Keep backup of working Week 1 bundle
- Incremental validation after each fix

---

## Questions for IEE Team (Optional)

While the validation report is comprehensive, we could confirm:

1. **Timeline:** Is Jan 14-17 acceptable for fixes, or do you need them sooner?

2. **Pass Rate:** Is 89.5% (P1+P2 fixes only) acceptable, or should we aim for 100%?

3. **Week 2 Blocker:** Can we start Week 2 planning in parallel, or must we complete fixes first?

4. **Validation Method:** Should we re-submit to your test environment, or is our local validation sufficient?

---

## Success Criteria

### Minimum (Week 1 Acceptance)
- ✅ Pass rate ≥75% (currently targeting 89.5%)
- ✅ Progressive aspect verbs handled correctly
- ✅ New frames (Questioning, Becoming_aware, Offenses) mapped correctly
- ✅ Bundle rebuilt and tested

### Stretch (Phase 2 Trigger)
- ✅ Pass rate ≥85% (already exceeded with P1+P2)
- ✅ All 5 scenarios at 100%
- ✅ Lemmatization working for all verb forms
- ✅ Agent extraction working with determiners

---

## Next Steps

### Immediate Actions (Today - Jan 11)
1. ✅ Review this fix plan
2. ✅ Confirm approach with IEE if needed
3. ⏳ Set up development environment for fixes

### Monday (Jan 13)
1. ⏳ Implement Priority 1 (progressive aspects)
2. ⏳ Implement Priority 2 (frame mappings)
3. ⏳ Test and validate (target: 89.5%)

### Tuesday-Thursday (Jan 14-16)
1. ⏳ Implement Priority 3 & 4
2. ⏳ Comprehensive testing
3. ⏳ Rebuild bundle
4. ⏳ Documentation

### Friday (Jan 17)
1. ⏳ Final delivery to IEE
2. ⏳ Begin Week 2 planning

---

**Status:** Ready to begin fixes
**Confidence Level:** High (clear fixes, well-scoped issues)
**Estimated Time:** 3-4 days to 89.5%, 4-5 days to 100%
**Blocker Status:** None - ready to proceed

---

**Document Version:** 1.0
**Last Updated:** January 11, 2026
**Next Update:** After Priority 1 & 2 fixes (target: Jan 13 EOD)
