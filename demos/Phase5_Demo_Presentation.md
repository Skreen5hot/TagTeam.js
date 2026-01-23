# Phase 5: NLP Foundation Upgrade
## Demo Presentation for Stakeholders

---

## Executive Summary

Phase 5 adds **linguistic intelligence** to TagTeam.js, enabling the system to understand the nuances and ambiguities in natural language. This is critical for ethical reasoning applications where the difference between "The doctor *must* treat the patient" (obligation) and "The patient *must* be recovering" (inference) matters enormously.

### Key Achievements
- **275+ automated tests** (100% pass rate)
- **Zero new dependencies** - built entirely with custom code
- **5 types of ambiguity detection** for downstream resolution
- **Production-ready** NLP foundation for Phase 6 interpretation

---

## What Problem Does This Solve?

### Before Phase 5
TagTeam could identify *that* a sentence contained ethical content, but struggled with linguistic nuances:

```
Input: "The organization should allocate resources"

Old Analysis:
- Found: organization, resources
- Modal: should (but what kind?)
- Is "organization" a group of people or an activity?
```

### After Phase 5
TagTeam now **flags ambiguities** for human review or automated resolution:

```
Input: "The organization should allocate resources"

New Analysis:
✓ "organization" flagged as AMBIGUOUS
  - Could mean: the act of organizing (process)
  - Could mean: the company/institution (entity)
  - Signal: Used as agent → likely entity

✓ "should" flagged as AMBIGUOUS
  - Could mean: obligation (you ought to do this)
  - Could mean: expectation (this is probably happening)
  - Signal: Has agent subject → likely obligation
```

---

## The Five Types of Ambiguity We Now Detect

### 1. Nominalization Ambiguity (Process vs. Entity)

**The Problem:** Words ending in -tion, -ment, -ing can refer to either an activity or a thing.

| Word | Process Reading | Entity Reading |
|------|-----------------|----------------|
| organization | the act of organizing | the company |
| treatment | the act of treating | the medical regimen |
| building | the act of constructing | the structure |

**Why It Matters for Ethics:**
- "The *treatment* was successful" → Was it the medical procedure or the care plan?
- "The *organization* violated policy" → Did the company do it, or was it a procedural failure?

---

### 2. Modal Force Ambiguity (Obligation vs. Prediction)

**The Problem:** Words like "must," "should," and "may" have multiple meanings.

| Modal | Deontic (Obligation) | Epistemic (Inference) |
|-------|---------------------|----------------------|
| must | You are required to | It's certainly true that |
| should | You ought to | It's expected that |
| may | You are permitted to | It's possible that |

**Why It Matters for Ethics:**
- "The doctor *must* inform the patient" → Is this a legal requirement or a logical conclusion?
- "You *may* not leave" → Is this a denial of permission or a statement of impossibility?

---

### 3. Scope Ambiguity (Quantifier + Negation)

**The Problem:** When "all/every" combines with "not," the meaning changes based on scope.

| Sentence | Wide Scope (¬∀) | Narrow Scope (∀¬) |
|----------|-----------------|-------------------|
| "All doctors did not attend" | Not all came (some did) | None came |
| "Every patient was not examined" | Not every one was (some were) | No one was |

**Why It Matters for Ethics:**
- "All employees did not receive training" → Did *some* miss it, or did *everyone* miss it?
- This completely changes the severity of a compliance violation.

---

### 4. Selectional Constraint Violations

**The Problem:** Some combinations of subjects and verbs don't make sense.

| Violation Type | Example | Issue |
|----------------|---------|-------|
| Inanimate Agent | "The rock decided to move" | Rocks can't decide |
| Abstract Physical Actor | "Justice lifted the box" | Abstract concepts can't lift |

**Why It Matters for Ethics:**
- Detecting these signals **metonymy** (figurative language)
- "The White House announced" → The building didn't announce; the administration did
- These violations flag text that needs **human interpretation**

---

### 5. Metonymy Detection

**The Problem:** Locations are often used to refer to institutions.

| Literal | Metonymic |
|---------|-----------|
| The White House (building) | The White House (presidency) |
| Wall Street (location) | Wall Street (financial industry) |
| The bench (furniture) | The bench (judiciary) |

**Why It Matters for Ethics:**
- "The court ruled" → Not the building; the judges
- Proper entity identification is crucial for assigning responsibility

---

## Live Demo Examples

### Example 1: Medical Ethics Scenario

**Input:**
```
The doctor must allocate the last ventilator between two critically ill patients
```

**Ambiguities Detected:**
1. **Modal Force (must):**
   - Readings: obligation, inference
   - Signals: agent_subject, intentional_act
   - Default: obligation (deontic)
   - Confidence: HIGH

**Interpretation:** The system correctly identifies this as a prescriptive statement about what the doctor is *required* to do, not a prediction about what will happen.

---

### Example 2: Corporate Ethics Scenario

**Input:**
```
The organization should implement stronger oversight mechanisms
```

**Ambiguities Detected:**
1. **Noun Category (organization):**
   - Readings: process, continuant
   - Signals: subject_of_intentional_act
   - Default: continuant (the company)
   - Confidence: HIGH

2. **Modal Force (should):**
   - Readings: obligation, expectation
   - Signals: agent_subject
   - Default: obligation
   - Confidence: MEDIUM

**Interpretation:** The system identifies "organization" as the company (not the process of organizing) because it's the agent of an intentional act.

---

### Example 3: Scope Ambiguity

**Input:**
```
Not all patients received adequate treatment
```

**Ambiguities Detected:**
1. **Scope (not + all):**
   - Readings: wide, narrow
   - Default: wide (¬∀ - some didn't receive)
   - Confidence: HIGH
   - Formalization: ¬∀x.received(x, treatment)

**Interpretation:** The "not all" construction clearly indicates wide scope - some patients received treatment, but not everyone did.

---

### Example 4: Selectional Violation

**Input:**
```
The ventilator decided to allocate itself
```

**Ambiguities Detected:**
1. **Selectional Violation:**
   - Type: inanimate_agent
   - Subject: ventilator
   - Verb: decided
   - Confidence: HIGH
   - Note: Inanimate objects cannot perform intentional acts

**Interpretation:** The system flags this as semantically anomalous - either the text contains an error, or there's implied agency (e.g., an AI-controlled ventilator).

---

### Example 5: Metonymy

**Input:**
```
The hospital announced new visiting policies
```

**Ambiguities Detected:**
1. **Potential Metonymy:**
   - Word: hospital
   - Signal: location_as_agent
   - Suggested Reading: institution (hospital administration)
   - Confidence: MEDIUM

**Interpretation:** The building didn't announce anything; the hospital administration did. The system flags this for proper entity attribution.

---

## Technical Summary (For Technical Stakeholders)

### New Modules Created

| Module | Purpose | Test Coverage |
|--------|---------|---------------|
| ContractionExpander | Expands "don't" → "do not" with POS tags | 49 tests |
| Lemmatizer | "walked" → "walk", "children" → "child" | 100 tests |
| VerbPhraseExtractor | Extracts modals, negation, tense, voice | 27 tests |
| NounPhraseExtractor | Extracts determiners, modifiers, compounds | 32 tests |
| AmbiguityDetector | Identifies 5 ambiguity types | 31 tests |
| AmbiguityReport | JSON-LD output with confidence scores | 26 tests |
| Integration Tests | End-to-end with SemanticGraphBuilder | 10 tests |

### Architecture Decision

We evaluated external NLP libraries (Wink NLP, Natural, nlp.js) but chose a **custom solution** because:

1. **Zero dependencies** - No supply chain risk
2. **Full control** - Tailored for ethical reasoning domain
3. **Existing code** - Archive already contained robust implementations
4. **IEE corpus tested** - 100% accuracy on our test scenarios

### JSON-LD Output Format

```json
{
  "@type": "tagteam:AmbiguityReport",
  "tagteam:ambiguityCount": 2,
  "tagteam:statistics": {
    "tagteam:total": 2,
    "tagteam:byType": {
      "modal_force": 1,
      "noun_category": 1
    }
  },
  "tagteam:ambiguities": [
    {
      "@type": "tagteam:DetectedAmbiguity",
      "tagteam:ambiguityType": "modal_force",
      "tagteam:modal": "should",
      "tagteam:possibleReadings": ["obligation", "expectation"],
      "tagteam:defaultReading": "obligation",
      "tagteam:confidence": "high",
      "tagteam:detectionSignals": ["agent_subject", "intentional_act"]
    }
  ]
}
```

---

## What's Next: Phase 6 Preview

Phase 5 **detects** ambiguities. Phase 6 will **resolve** them through an **Interpretation Lattice**:

```
Input: "The doctor should allocate resources"

Phase 5 Output:
  → Ambiguity: "should" (obligation OR expectation)

Phase 6 Output:
  → Interpretation 1: Obligation (confidence: 0.85)
  → Interpretation 2: Expectation (confidence: 0.15)
  → Recommended: Obligation
  → Reasoning: Agent subject + intentional verb + medical context
```

The lattice will enable:
- **Multiple interpretations** preserved for human review
- **Confidence-weighted resolution** based on context
- **Audit trail** showing why an interpretation was chosen

---

## Try It Yourself

### Browser Demo
Visit the GitHub Pages site and use the "Build JSON-LD Graph" feature with `detectAmbiguity: true`.

### Code Example
```javascript
const builder = new SemanticGraphBuilder();
const result = builder.build(
  "The organization should allocate resources",
  { detectAmbiguity: true }
);

console.log(result._ambiguityReport.toString());
// Output: "AmbiguityReport: 2 ambiguities (modal_force: 1, noun_category: 1)"

console.log(result._ambiguityReport.getByType('modal_force'));
// Output: [{ type: 'modal_force', modal: 'should', readings: [...] }]
```

### Test Sentences to Try

1. **Modal ambiguity:** "The committee must review all applications"
2. **Nominalization:** "The administration of the policy failed"
3. **Scope:** "Every employee did not complete training"
4. **Metonymy:** "The White House responded to the crisis"
5. **Violation:** "The policy decided to implement itself"

---

## Questions?

Contact the development team for:
- Custom ambiguity patterns for your domain
- Integration with existing ethics review workflows
- Training on interpreting ambiguity reports

---

*Phase 5 completed: January 2026*
*275+ tests passing | Zero new dependencies | Production ready*
