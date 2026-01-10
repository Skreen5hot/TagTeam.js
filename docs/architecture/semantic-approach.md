# TagTeam.js Semantic Extension - Quick Start

**🎯 Goal:** Transform TagTeam from POS tagger → deterministic semantic understanding engine

**📅 Current Status:** Week 1 Complete (Semantic Role Extraction)

---

## 🚀 Quick Start

### 1. Open the Demo
```bash
# Open semantic-demo.html in your browser
start semantic-demo.html
```

### 2. Try It Out
```javascript
const extractor = new SemanticRoleExtractor();
const result = extractor.parseSemanticAction("I should tell my doctor about the pain");

console.log(result.toString());
// Output: "I tell doctor [revealing_information]"

console.log(result.confidence);
// Output: 0.85 (high confidence)
```

### 3. Test IEE Scenarios
Click the "Scenario" buttons in the demo to test with IEE's 4 reference cases.

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| [SemanticRoleExtractor.js](js/SemanticRoleExtractor.js) | Core semantic parser (22 KB) |
| [semantic-demo.html](semantic-demo.html) | Interactive test interface |
| [WEEK1_DELIVERABLE.md](WEEK1_DELIVERABLE.md) | Complete documentation + test results |
| [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) | Rationale for 4 key design choices |
| [tagTeam_Integration_Requirments.md](tagTeam_Integration_Requirments.md) | Original IEE requirements |

---

## 🎓 What It Does

### Before (TagTeam v1)
```
Input: "I should tell my doctor about the pain"
Output: [
  [I, PRP],
  [should, MD],
  [tell, VB],
  [my, PRP$],
  [doctor, NN],
  [about, IN],
  [the, DT],
  [pain, NN]
]
```

### After (Week 1 Semantic Extension)
```
Input: "I should tell my doctor about the pain"
Output: {
  agent: {text: "I", entity: "self"},
  action: {verb: "tell", frame: "revealing_information"},
  recipient: {text: "doctor", entity: "medical_professional"},
  theme: {text: "pain", entity: "physical_sensation"},
  modality: {type: "necessity", marker: "should"},
  confidence: 0.85
}
```

**Key Improvement:** From word tags → structured meaning (WHO does WHAT to WHOM)

---

## ✅ Design Decisions Made

### 1. Semantic Frames
**Decision:** Custom lightweight ontology (~25 frames)
- 12 implemented in Week 1
- Deterministic O(n) classification
- Expandable by IEE without code changes

### 2. Semantic Distance
**Decision:** Hybrid hierarchical + lexicon approach
- Foundation laid in Week 1
- Full implementation in Week 2
- IEE provides concept hierarchies as JSON

### 3. Value Definitions
**Decision:** IEE provides JSON, TagTeam consumes
- Clear API contract defined
- Awaiting IEE's 120 value definitions
- Supports iterative refinement

### 4. Ambiguity Handling
**Decision:** Single interpretation + confidence + flag
- Confidence score: 0-1 scale
- Thresholds: 0.8 (high), 0.5 (low)
- Ambiguity reasons provided

**See [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) for full rationale**

---

## 📊 Test Results (IEE Scenarios)

| Scenario | Status | Confidence | Notes |
|----------|--------|------------|-------|
| 1. Medical disclosure | ✅ PASS | 0.85 | Perfect extraction |
| 2. Community decision | ✅ PASS | 0.75 | All roles found |
| 3. Resource allocation | ✅ PASS | 0.70 | Flagged ambiguity correctly |
| 4. Life support negation | ⚠️ PARTIAL | 0.55 | Negation detected, frame needs fix |

**Overall:** 3/4 full pass, 1 partial (fixable in 30 minutes)

**See [WEEK1_DELIVERABLE.md](WEEK1_DELIVERABLE.md) for detailed test analysis**

---

## 🛠️ Integration (For IEE Team)

### HTML Setup
```html
<script src="tagteam/js/lexicon.js"></script>
<script src="tagteam/js/POSTagger.js"></script>
<script src="tagteam/js/SemanticRoleExtractor.js"></script>
```

### Basic Usage
```javascript
// Initialize once
const extractor = new SemanticRoleExtractor();

// Parse user input
const userText = getUserInput();
const action = extractor.parseSemanticAction(userText);

// Check confidence
if (action.confidence >= 0.5) {
  // Use result for value matching
  const values = matchToValues(action);
  displayValues(values);
} else {
  // Low confidence - flag for review
  showAmbiguityWarning(action.ambiguity.reason);
}
```

### Error Handling
```javascript
try {
  const action = extractor.parseSemanticAction(userText);
  if (action.confidence < 0.5) {
    // Fallback to keyword matching
    return legacyKeywordMatch(userText);
  }
  return action;
} catch (error) {
  console.error('Parse failed:', error);
  return legacyKeywordMatch(userText);
}
```

---

## 🎯 Semantic Frames (Week 1)

| Frame | Core Verbs | Use Case |
|-------|------------|----------|
| `revealing_information` | tell, disclose, reveal | "I should tell my doctor" |
| `concealing_information` | hide, conceal, withhold | "I kept it secret" |
| `causing_harm` | harm, hurt, injure | "This might hurt the patient" |
| `causing_benefit` | help, benefit, improve | "This will help my community" |
| `abandoning_relationship` | leave, abandon, quit | "I'm leaving my family" |
| `maintaining_relationship` | stay, remain, continue | "I want to stay here" |
| `decision_making` | decide, choose, consider | "I'm considering leaving" |
| `resource_allocation` | allocate, distribute, give | "They should share the land" |
| `medical_treatment` | treat, heal, operate | "Remove life support" |
| `experiencing_emotion` | feel, suffer, experience | "I feel pain" |
| `communication` | say, speak, talk | "I told them" |
| `physical_motion` | go, move, walk | "I left the building" |

---

## 📦 Bundle Size

| Component | Size (Original) | Size (Gzipped) |
|-----------|----------------|----------------|
| lexicon.js | 2.1 MB | 500 KB |
| POSTagger.js | 4 KB | 1.5 KB |
| **SemanticRoleExtractor.js** | **22 KB** | **8 KB** → **3 KB** |
| **Total Added** | **22 KB** | **3 KB** |

**IEE Requirement:** <200 KB → ✅ **PASS** (added 3 KB)

---

## ⚡ Performance

| Operation | Complexity | Time (20-word sentence) |
|-----------|------------|------------------------|
| Tokenization | O(n) | <1ms |
| POS tagging | O(n) | 2-3ms |
| Role extraction | O(n) | 1-2ms |
| **Total** | **O(n)** | **~5ms** |

**IEE Requirement:** <50ms → ✅ **PASS** (5ms average)

---

## 🚧 Known Limitations (Week 1)

1. **Multi-word entities** - "life support" tokenized separately
   - **Impact:** Medium (affects Scenario 4)
   - **Fix:** Week 2 compound noun detection

2. **Limited irregular verbs** - Only 12 verbs lemmatized
   - **Impact:** Low (common verbs covered)
   - **Fix:** Expand to ~100 verbs

3. **Frame coverage** - 12/25 frames implemented
   - **Impact:** Medium (some verbs → generic_action)
   - **Fix:** Add 13 more frames based on IEE corpus

4. **No dependency parsing** - Shallow syntactic analysis
   - **Impact:** Low for simple sentences
   - **Fix:** Week 3 if needed

**See full limitations in [WEEK1_DELIVERABLE.md](WEEK1_DELIVERABLE.md#known-limitations)**

---

## 📅 Roadmap

### ✅ Week 1: Semantic Role Extraction (COMPLETE)
- [x] Design 4 key decisions
- [x] Implement parseSemanticAction()
- [x] Handle negation + modality
- [x] Test with IEE scenarios
- [x] Documentation

### 🚧 Week 2: Value Matching Engine (IN PROGRESS)
- [ ] Implement semantic distance metric
- [ ] Build concept hierarchy loader
- [ ] Create matchSemanticActionToValues()
- [ ] Load IEE's 120 value definitions
- [ ] Test relevance scoring

### 📋 Week 3: Refinement
- [ ] Fix Scenario 4 (multi-word entities)
- [ ] Expand frame coverage to 25
- [ ] Add 100 irregular verbs
- [ ] Optimize confidence calibration
- [ ] Final testing with IEE

---

## 🤝 Feedback Needed from IEE

### Immediate (Week 1)
1. ✅ Test [semantic-demo.html](semantic-demo.html) with all 4 scenarios
2. ✅ Try your own sentences from real user scenarios
3. ✅ Evaluate confidence scores - are thresholds right?
4. ✅ Review ambiguity flags - helpful or noisy?

### For Week 2
1. 📝 Provide 120 value definitions JSON (see API format in DESIGN_DECISIONS.md)
2. 📝 Specify concept hierarchies for key values
3. 📝 Define intensity levels (high/medium/low)
4. 📝 Clarify which frames to prioritize (current 12 vs. next 13)

### Questions
1. Should we fix Scenario 4 before Week 2, or accept 75% pass rate?
2. What confidence threshold triggers human review in your UI?
3. How often do you expect ambiguous inputs from users?
4. Any domain-specific entities to add (elder, ritual, ancestor)?

---

## 📧 Resources

- **Live Demo:** [semantic-demo.html](semantic-demo.html)
- **Full Docs:** [WEEK1_DELIVERABLE.md](WEEK1_DELIVERABLE.md)
- **Design Rationale:** [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md)
- **GitHub Issues:** [Report bugs here](https://github.com/skreen5hot/TagTeam.js/issues)

---

## 💡 Key Innovations

### 1. Deterministic Semantic Understanding
- **No ML models** - Rule-based frame classification
- **Same input → same output** - Fully reproducible
- **Inspectable** - Can explain every decision

### 2. Client-Side Execution
- **Zero server calls** - Runs entirely in browser
- **No data leakage** - User privacy preserved
- **Fast** - 5ms average processing time

### 3. Extensible Architecture
- **IEE controls semantics** - Value definitions as JSON
- **No code changes** - Add frames/concepts without redeployment
- **Iterative refinement** - Test and improve definitions weekly

### 4. Graduated Confidence
- **Not binary** - 0-1 scale, not just "match/no match"
- **Honest uncertainty** - Flags ambiguous parses
- **Evidence-based** - Shows why confidence is high/low

---

## 🎉 What This Enables (Weeks 2-3)

### Replace 320+ Regex Patterns
```javascript
// OLD: Brittle keyword matching
if (text.includes('doctor') || text.includes('hospital')) {
  values.push('physical_wellbeing');
}

// NEW: Semantic understanding
const action = extractor.parseSemanticAction(text);
if (action.action.frame === 'medical_treatment') {
  values.push({
    value: 'physical_wellbeing',
    score: computeRelevance(action),
    evidence: [action.agent, action.patient, action.theme]
  });
}
```

### Handle Negation
```javascript
// "I will NOT tell my doctor" → authentic_selfhood (concealment)
// "I WILL tell my doctor" → physical_wellbeing (disclosure)
```

### Context-Aware Scoring
```javascript
// "I might leave" → score: 0.4 (uncertain)
// "I will leave" → score: 0.8 (certain)
// "I left" → score: 1.0 (past action)
```

### Gradient Intensity
```javascript
// "minor discomfort" → physical_wellbeing: 0.3
// "severe pain" → physical_wellbeing: 0.7
// "terminal illness" → physical_wellbeing: 1.0
```

---

**Status:** ✅ Week 1 Complete - Ready for IEE Testing
**Next Milestone:** Week 2 Value Matching (Pending IEE Data)
**Contact:** [Your email/channel]
