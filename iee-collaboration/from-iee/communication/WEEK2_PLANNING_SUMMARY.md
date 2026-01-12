# Week 2 Planning Summary

**Date:** January 11, 2026
**Status:** 📋 Planning Complete - Ready for TagTeam Review
**Previous:** Week 1 Complete ✅ (84.2% pass rate)

---

## Executive Summary

Week 2 planning is complete with all requirements, test data, and specifications ready for TagTeam review. The scope expands from basic semantic role extraction to **context-aware ethical reasoning** through context intensity analysis and value matching.

---

## Week 2 Objectives

### Primary Goals
1. **Context Intensity Analysis** - Score 12 dimensions of contextual factors (0.0-1.0 scale)
2. **Value Matching Engine** - Detect which of 50 ethical values are activated and their salience
3. **Expanded Test Coverage** - Grow from 5 to 20 annotated scenarios

### Success Criteria
- Context scores within ±0.2 of human annotations (80% of cases)
- Value detection: 80% precision, 70% recall
- No regressions on Week 1 baseline
- Parse time <50ms average

---

## Deliverables Created (IEE → TagTeam)

### 1. Requirements Document ✅
**File:** [requirements/WEEK2_REQUIREMENTS.md](requirements/WEEK2_REQUIREMENTS.md)

**Contents:**
- Complete specifications for 12 context dimensions
- Value matching requirements (50 values)
- API design for Week 2 features
- Validation criteria (80% threshold)
- Timeline and coordination plan
- Open questions for TagTeam

**Size:** ~450 lines, comprehensive technical spec

---

### 2. Test Corpus (20 Scenarios) ✅
**File:** [data/test-corpus-week2.json](data/test-corpus-week2.json)

**Coverage:**
- **Healthcare:** 5 scenarios (triage, error disclosure, experimental treatment, psychiatric hold, end-of-life)
- **Spiritual:** 5 scenarios (faith crisis, conversion, Sabbath conflict, abuse cover-up, prayer vs medicine)
- **Vocational:** 5 scenarios (whistleblowing, resume fraud, credit theft, discrimination, environmental harm)
- **Interpersonal:** 5 scenarios (infidelity, feedback, inheritance, addiction intervention, domestic violence)

**Complexity Distribution:**
- Simple: 5 scenarios
- Moderate: 10 scenarios
- Complex: 5 scenarios

**Annotations Per Scenario:**
- Semantic roles (agent, action, patient, modality, frame)
- Context intensity scores (12 dimensions with rationale)
- Value activations (presence, salience, polarity, evidence)
- Dilemma classification

**Size:** 1,506 lines, fully annotated

---

### 3. Value Definitions (50 Values) ✅
**File:** [data/value-definitions-comprehensive.json](data/value-definitions-comprehensive.json)

**Structure:**
- **Dignity Domain** (10 values): Human Dignity, Autonomy, Equality, Justice, Freedom, Rights, Respect for Persons, Privacy, Consent, Human Rights
- **Care Domain** (10 values): Compassion, Fidelity, Beneficence, Non-maleficence, Care, Love, Kindness, Empathy, Forgiveness, Mercy
- **Virtue Domain** (10 values): Integrity, Honesty, Courage, Humility, Wisdom, Temperance, Patience, Generosity, Gratitude, Authenticity
- **Community Domain** (10 values): Solidarity, Common Good, Stewardship, Peace, Inclusion, Diversity, Transparency, Accountability, Service, Democracy
- **Transcendence Domain** (10 values): Meaning, Spiritual Growth, Sacred/Holy, Hope, Faith, Transcendence, Mystery, Reverence, Grace, Self-care

**Each Value Includes:**
- Name and domain
- Clear definition (2-3 sentences)
- Semantic markers (10-20 keywords)
- Polarity indicators (upholding vs violating)
- Related values (3-5 connections)
- Example scenarios (2-3 concrete cases)

**Size:** Comprehensive keyword coverage for pattern matching

---

### 4. Context Pattern Keywords ✅
**File:** [data/context-patterns.json](data/context-patterns.json)

**12 Dimensions Covered:**

**Temporal Context:**
1. Urgency (emergency → no rush)
2. Duration (permanent → momentary)
3. Reversibility (irreversible → easily undone)

**Relational Context:**
4. Intimacy (self/family → stranger)
5. Power Differential (extreme imbalance → equal)
6. Trust (complete → no trust)

**Consequential Context:**
7. Harm Severity (catastrophic → no harm)
8. Benefit Magnitude (transformative → no benefit)
9. Scope (global → individual)

**Epistemic Context:**
10. Certainty (certain → unknown)
11. Information Completeness (complete → missing critical info)
12. Expertise (expert → no expertise)

**Features:**
- Keyword lists for each level (high/medium/low)
- Scoring heuristics with thresholds
- Handling for negation, intensifiers, hedges
- Contextual modifiers (life/death, children, professional roles)
- Default scores for missing data
- Example scenarios with expected scores and rationale

**Size:** Comprehensive pattern matching guide

---

## Timeline

### Week of Jan 13-17 (Preparation) - **CURRENT WEEK**
- ✅ **IEE:** Deliver Week 2 requirements (DONE)
- ✅ **IEE:** Create 20-scenario test corpus (DONE)
- ✅ **IEE:** Expand value definitions to 50 (DONE)
- ✅ **IEE:** Create context pattern keywords (DONE)
- ⏳ **TagTeam:** Review requirements, ask clarifying questions
- ⏳ **TagTeam:** Provide feedback on timeline feasibility by **Monday, Jan 13**

### Week of Jan 20-24 (Implementation)
- **TagTeam:** Implement context intensity analysis
- **TagTeam:** Implement value matching engine
- **TagTeam:** Update test suite and documentation
- **TagTeam:** Deliver Week 2 bundle by **Friday, Jan 24**

### Jan 24-25 (Validation)
- **IEE:** Run automated validation suite
- **IEE:** Compare against human annotations
- **IEE:** Provide feedback or acceptance

---

## Key Questions for TagTeam

(From WEEK2_REQUIREMENTS.md)

1. **Timeline Feasibility**
   - Is Jan 24 delivery realistic for this scope?
   - Would you prefer to split into Week 2a (context) and Week 2b (values)?

2. **Technical Approach**
   - Rule-based pattern matching vs ML models?
   - Any dependencies needed (word embeddings, ontologies)?

3. **Lemmatization Priority**
   - Fix Week 1 lemmatization (3 checks) before Week 2, or handle in parallel?
   - Would completing lemmatization delay Week 2 delivery?

4. **Scope Concerns**
   - Is anything unclear or underspecified?
   - Any features particularly challenging?

5. **Value Definitions**
   - Need more keyword patterns per value?
   - Need more example scenarios?

6. **Validation Support**
   - Would live validation sessions be helpful during development?
   - Should we provide interim test corpus (10 scenarios) before final 20?

---

## Week 2 Scope Overview

### What's Included
✅ Context intensity scoring (12 dimensions)
✅ Value matching and salience (50 values)
✅ Expanded test corpus (20 scenarios)
✅ Enhanced API with backward compatibility
✅ Performance target: <50ms parse time
✅ Documentation and test suite updates

### What's Optional (Nice-to-Have)
🟡 Complete verb lemmatization from Week 1 (3 checks)
🟡 Confidence scores for each dimension
🟡 Automatic value conflict detection
🟡 Reasoning hints/explanations

### What's Future (Week 3+)
⏭️ JSON-LD output format
⏭️ BFO/SHML ontological alignment
⏭️ Multi-sentence parsing
⏭️ Interactive refinement

---

## File Locations

All Week 2 materials are in the TagTeam collaboration workspace:

```
collaborations/tagteam/
├── requirements/
│   └── WEEK2_REQUIREMENTS.md          # Complete specifications
├── data/
│   ├── test-corpus-week2.json         # 20 annotated scenarios
│   ├── value-definitions-comprehensive.json  # 50 values
│   └── context-patterns.json          # Keyword patterns
├── communication/
│   ├── WEEK1_ACCEPTANCE.md            # Week 1 formally accepted
│   └── WEEK1_VALIDATION_RESULTS.md    # Week 1 details
└── README.md                          # Updated with Week 2 status
```

---

## Expected Week 2 Output Format

```javascript
const result = TagTeam.parse("The family must decide whether to continue treatment");

// Week 1 output (existing - no changes)
result.agent           // { text: "family", entity: "family" }
result.action          // { verb: "decide", modality: "must" }
result.semanticFrame   // "Deciding"

// Week 2 additions (new features)
result.contextIntensity  // 12-dimension object
result.values            // Array of activated values
result.dilemmaType       // Auto-classification
result.complexityScore   // Computed from context + values
```

---

## Success Definition

Week 2 is successful when:

1. ✅ No regressions on Week 1 baseline (84.2% pass rate maintained)
2. ✅ Context scores accurate within ±0.2 (80% of test cases)
3. ✅ Value detection at 80% precision, 70% recall
4. ✅ Parse time remains <50ms average
5. ✅ Clean, documented API for IEE integration

This enables IEE to move from basic semantic extraction to **context-aware ethical reasoning** - critical for Phase 4.5 Deliberation Engine integration.

---

## Next Steps

### Immediate (This Weekend)
1. ✅ Week 2 planning complete
2. 📧 Notify TagTeam of Week 2 materials availability
3. ⏳ Await TagTeam feedback by Monday, Jan 13

### Monday, Jan 13
1. Review TagTeam questions/concerns
2. Adjust timeline if needed
3. Clarify any ambiguous requirements
4. Confirm Week 2 kickoff

### Week of Jan 20-24
1. TagTeam implementation
2. IEE available for questions
3. Optional: Interim validation checkpoints

---

## Communication

All Week 2 communications will continue through the shared directory structure:

**IEE → TagTeam:**
- Requirements in `requirements/`
- Questions in `communication/`
- Data artifacts in `data/`

**TagTeam → IEE:**
- Deliverables in `deliverables/week2/`
- Updated bundle in `dist/`
- Status updates in `communication/`

---

## Confidence Level

**95% Confident** Week 2 planning is thorough and achievable:

✅ Comprehensive requirements document
✅ Fully annotated test corpus (20 scenarios)
✅ Complete value taxonomy (50 values)
✅ Detailed keyword patterns for context scoring
✅ Clear success criteria and validation plan
✅ Realistic timeline (2 weeks implementation)
✅ Built on successful Week 1 foundation

**Potential Risks:**
- Scope may be ambitious for 2-week timeline
- Context scoring accuracy depends on pattern matching quality
- Value detection recall may be challenging without ML

**Mitigations:**
- Willing to split into Week 2a/2b if needed
- Provided comprehensive keyword patterns
- Open to phased delivery (context first, then values)

---

**Status:** ✅ Ready for TagTeam Review
**Next Milestone:** TagTeam feedback by Monday, Jan 13, 2026
**Document Owner:** Aaron Damiano (IEE Team)
**Last Updated:** January 11, 2026
