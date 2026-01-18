# Week 2b Planning Session - Agenda

**Date:** Tuesday, January 21, 2026
**Time:** 2:00 PM ET
**Duration:** 60-90 minutes
**Attendees:** TagTeam Development Team, IEE Team

---

## Meeting Objectives

1. ✅ Review and approve Week 2b architecture
2. ✅ Answer 18 technical questions
3. ✅ Confirm timeline and checkpoints
4. ✅ Identify any missing requirements
5. ✅ Get green light to start implementation Jan 22

---

## Pre-Meeting Materials

### For IEE Team to Review:

1. **Implementation Plan** (`WEEK2B_IMPLEMENTATION_PLAN.md`)
   - 5-phase delivery plan
   - Timeline: Jan 22 - Feb 7
   - Risk assessment
   - Success metrics

2. **API Mockups** (`WEEK2B_API_MOCKUPS.md`)
   - Complete output examples
   - 4 scenario walkthroughs
   - Output verbosity options

3. **Architecture** (`WEEK2B_ARCHITECTURE.md`)
   - System architecture diagrams
   - Component data flow
   - Performance targets

4. **Technical Questions** (`WEEK2B_TECHNICAL_QUESTIONS.md`)
   - 18 questions across 9 categories
   - TagTeam recommendations
   - Decision matrix

---

## Agenda (90 minutes)

### Part 1: Welcome & Context (5 min)

- Week 2a success recap (100% accuracy, 12 days early)
- Week 2b scope overview
- Meeting goals

---

### Part 2: Architecture Presentation (15 min)

**TagTeam presents:**

1. **System Overview** (5 min)
   - Three-component design: ValueMatcher → ValueScorer → EthicalProfiler
   - Integration with existing Week 1 + Week 2a code
   - Data flow diagram walkthrough

2. **Example Walkthrough** (10 min)
   - Live demo: "The doctor must allocate the last ventilator..."
   - Show each component's output
   - Illustrate boost application
   - Display final ethical profile

**Questions from IEE**

---

### Part 3: Technical Decisions (45 min)

**Priority 1: Critical Decisions (Must decide today)**

1. **Boost Application Strategy** (10 min)
   - Question 1.1 from technical questions
   - Options: Additive, Multiplicative, Weighted
   - Impact on results
   - **Decision needed:** Which approach?

2. **Polarity Handling** (10 min)
   - Question 2.1 from technical questions
   - How to represent value violations?
   - Options: Negative scores, separate field, low scores
   - **Decision needed:** Which approach?

3. **Conflict Detection** (10 min)
   - Question 3.1 from technical questions
   - Predefined pairs vs. automatic detection
   - **Decision needed:** Can IEE provide conflict-pairs.json?

4. **Output Verbosity** (5 min)
   - Question 4.1 from technical questions
   - Minimal, Standard, or Verbose?
   - **Decision needed:** Default output level?

**Priority 2: Important Decisions (Nice to decide today)**

5. **Performance Targets** (5 min)
   - Question 6.1: Max acceptable parse time?
   - Target: <100ms

6. **Top Values Count** (5 min)
   - Question 4.2: How many to return?
   - Recommend: 5 (configurable)

**Priority 3: Defer if Needed**

7-18. Remaining questions from technical questions doc
   - Can use TagTeam recommendations as defaults
   - Iterate based on testing results

---

### Part 4: Timeline & Checkpoints (15 min)

**Proposed Schedule:**

| Date | Milestone | Deliverable |
|------|-----------|-------------|
| Jan 21 (today) | Planning approved | Architecture finalized |
| Jan 24 | Phase 1 checkpoint | ValueMatcher working |
| Jan 28 | Phase 2 checkpoint | Boosts applied |
| Jan 31 | Phase 3 checkpoint | Profiles generated |
| Feb 5 | Phase 4 checkpoint | Testing complete |
| Feb 7 | **Week 2b delivery** | **Full package** |

**Checkpoint format:**
- Screen share demo
- Show test results
- Discuss any issues
- Get feedback/approval to continue

**Questions:**
- Are these dates/times workable?
- Same meeting time for checkpoints (2:00 PM ET)?
- Any concerns about timeline?

---

### Part 5: Data & Resources (5 min)

**From IEE Team:**

✅ **Already Provided:**
- value-definitions-comprehensive.json
- frame-value-boosts.json
- test-corpus-week2.json (20 scenarios)

❓ **Still Needed:**
1. Expected value scores for test scenarios?
   - Format: `{healthcare-001: {autonomy: 0.75, beneficence: 0.65, ...}}`

2. Conflict pairs definition?
   - Format: `{conflicts: [{value1: "autonomy", value2: "beneficence", ...}]}`

3. Any additional test scenarios?

**From TagTeam:**
- Confirm we have everything needed to start Jan 22

---

### Part 6: Open Discussion (5 min)

- Any concerns from IEE team?
- Any questions from TagTeam?
- Anything we missed?

---

### Part 7: Wrap-Up & Next Steps (5 min)

**Confirm:**
- ✅ Architecture approved?
- ✅ Critical decisions made?
- ✅ Timeline acceptable?
- ✅ All materials provided?

**Next Actions:**
- TagTeam: Begin Phase 1 implementation (Jan 22)
- IEE: Provide any missing data files (by Jan 23)
- Both: Schedule first checkpoint (Jan 24)

---

## Key Questions to Answer

### Must Answer Today:

1. **Boost strategy:** Additive, multiplicative, or weighted?
2. **Polarity:** How to handle value violations?
3. **Conflicts:** Will IEE provide conflict-pairs.json?
4. **Output:** Minimal, standard, or verbose default?
5. **Timeline:** Approved as proposed?

### Can Use Defaults:

- Top values count: 5 (configurable)
- Performance target: <100ms
- Early termination: Yes at 0.1 threshold
- Accuracy target: 80%
- Dominant domain: Threshold-based with "Mixed"
- All other questions: Use TagTeam recommendations

---

## Decision Matrix (Fill During Meeting)

| Decision | Options Discussed | IEE Choice | Notes |
|----------|-------------------|------------|-------|
| Boost strategy | A/B/C/D | _____ | |
| Polarity handling | A/B/C/D | _____ | |
| Conflict detection | A/B/C | _____ | |
| Output verbosity | A/B/C | _____ | |
| Top values count | A/B/C | _____ | |
| Performance target | A/B/C | _____ | |
| Test data format | Confirmed/Modified | _____ | |
| Timeline | Approved/Adjusted | _____ | |

---

## Post-Meeting Action Items

**TagTeam:**
- [ ] Update implementation plan based on decisions
- [ ] Begin Phase 1 implementation (Jan 22)
- [ ] Send checkpoint #1 invite (Jan 24)

**IEE:**
- [ ] Provide expected value scores (if needed)
- [ ] Provide conflict-pairs.json (if applicable)
- [ ] Review updated plan (if changes made)

**Both:**
- [ ] Confirm checkpoint schedule
- [ ] Establish communication channel for questions

---

## Materials Checklist

**Before Meeting:**
- [x] Implementation plan created
- [x] API mockups created
- [x] Architecture diagrams created
- [x] Technical questions document created
- [x] All materials pushed to GitHub
- [ ] IEE team has reviewed materials
- [ ] Zoom link shared

**During Meeting:**
- [ ] Screen share setup ready
- [ ] Live demo prepared
- [ ] Decision matrix filled out
- [ ] Notes taken

**After Meeting:**
- [ ] Meeting notes distributed
- [ ] Decision matrix shared
- [ ] Updated plan (if needed)
- [ ] Action items assigned

---

## Contact Information

**For Pre-Meeting Questions:**
- Email: [Your email]
- GitHub: Issues on TagTeam.js repo
- Response time: <24 hours

**During Meeting:**
- Zoom link: [To be provided by IEE]
- Screen share: TagTeam will demo
- Backup: Phone conference if needed

---

## Backup Plans

**If Timeline Needs Adjustment:**
- Can compress Phase 1+2 (Jan 22-26)
- Can extend final testing (Feb 5-8)
- Maximum delivery: Feb 10 (still acceptable)

**If Critical Decisions Can't Be Made:**
- Use TagTeam recommendations as defaults
- Build with configuration options
- Iterate based on feedback

**If Data Files Missing:**
- Can use placeholder data for Phase 1
- Integrate real data in Phase 2
- No impact on timeline if provided by Jan 23

---

**Prepared by:** TagTeam Development Team
**Last Updated:** January 12, 2026
**Version:** 1.0

**Status:** ✅ Ready for Jan 21 Planning Session
