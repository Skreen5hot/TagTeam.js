# Week 2 Requirements - TagTeam Integration

**Planning Date:** January 11, 2026
**Delivery Target:** January 20-24, 2026
**Status:** 📋 Planning Phase

---

## Overview

Week 2 expands the TagTeam semantic parser integration to include **context intensity analysis** and **value matching**, moving beyond basic semantic role extraction to deeper ethical reasoning capabilities.

**Week 1 Achievement:** 84.2% pass rate (basic agent-action-patient extraction)
**Week 2 Goal:** Add contextual depth and value alignment scoring

---

## Core Requirements

### 1. Context Intensity Analysis

Extract and score 12 dimensions of contextual factors that influence ethical reasoning:

#### Temporal Context (3 dimensions)
1. **Urgency** - Time pressure for decision
   - Scale: 0.0 (no urgency) to 1.0 (immediate crisis)
   - Keywords: "emergency", "immediately", "deadline", "urgent", "time running out"
   - Example: "The patient will die within hours" → Urgency: 0.9

2. **Duration** - Timespan of impact
   - Scale: 0.0 (momentary) to 1.0 (permanent/lifelong)
   - Keywords: "forever", "permanently", "temporary", "moment", "lifetime"
   - Example: "This will affect them for the rest of their lives" → Duration: 1.0

3. **Reversibility** - Ability to undo decision
   - Scale: 0.0 (fully reversible) to 1.0 (irreversible)
   - Keywords: "can't undo", "permanent", "reversible", "temporary", "final"
   - Example: "Once we pull the plug, there's no going back" → Reversibility: 1.0

#### Relational Context (3 dimensions)
4. **Intimacy** - Closeness of relationship
   - Scale: 0.0 (stranger) to 1.0 (immediate family/self)
   - Keywords: "stranger", "acquaintance", "friend", "family", "spouse", "child", "parent"
   - Example: "My best friend is struggling" → Intimacy: 0.8

5. **Power Differential** - Imbalance in authority/vulnerability
   - Scale: 0.0 (equal) to 1.0 (extreme power imbalance)
   - Keywords: "boss", "employee", "child", "adult", "vulnerable", "authority"
   - Example: "The CEO is pressuring a junior employee" → Power: 0.9

6. **Trust** - Relational trust level
   - Scale: 0.0 (no trust) to 1.0 (complete trust)
   - Keywords: "trusted", "betrayal", "confidence", "reliable", "suspicious"
   - Example: "I've always trusted them completely" → Trust: 1.0

#### Consequential Context (3 dimensions)
7. **Harm Severity** - Magnitude of potential negative impact
   - Scale: 0.0 (no harm) to 1.0 (catastrophic harm)
   - Keywords: "death", "injury", "suffering", "trauma", "minor inconvenience"
   - Example: "This could kill thousands of people" → Harm: 1.0

8. **Benefit Magnitude** - Magnitude of potential positive impact
   - Scale: 0.0 (no benefit) to 1.0 (transformative benefit)
   - Keywords: "life-saving", "cure", "revolutionary", "slight improvement"
   - Example: "This vaccine could save millions" → Benefit: 1.0

9. **Scope** - Number of people affected
   - Scale: 0.0 (single person) to 1.0 (global/all humanity)
   - Keywords: "myself", "family", "community", "nation", "humanity", "everyone"
   - Example: "This affects our entire species" → Scope: 1.0

#### Epistemic Context (3 dimensions)
10. **Certainty** - Confidence in facts/outcomes
    - Scale: 0.0 (highly uncertain) to 1.0 (certain)
    - Keywords: "definitely", "certain", "might", "maybe", "unclear", "proven"
    - Example: "We're absolutely certain this will work" → Certainty: 1.0

11. **Information Completeness** - Availability of relevant information
    - Scale: 0.0 (critical information missing) to 1.0 (complete information)
    - Keywords: "we don't know", "unclear", "all the facts", "missing information"
    - Example: "We're missing critical safety data" → Completeness: 0.2

12. **Expertise** - Agent's competence in domain
    - Scale: 0.0 (no expertise) to 1.0 (expert)
    - Keywords: "expert", "novice", "trained", "inexperienced", "professional"
    - Example: "As a board-certified surgeon..." → Expertise: 0.9

#### Output Format
```javascript
{
  "contextIntensity": {
    "temporal": {
      "urgency": 0.9,
      "duration": 0.8,
      "reversibility": 1.0
    },
    "relational": {
      "intimacy": 0.7,
      "powerDifferential": 0.3,
      "trust": 0.8
    },
    "consequential": {
      "harmSeverity": 0.9,
      "benefitMagnitude": 0.6,
      "scope": 0.4
    },
    "epistemic": {
      "certainty": 0.5,
      "informationCompleteness": 0.7,
      "expertise": 0.8
    }
  }
}
```

---

### 2. Value Matching Engine

Identify which of the 20 core ethical values are activated by the scenario. Each value should have:
- **Presence** (boolean) - Is this value relevant to the scenario?
- **Salience** (0.0-1.0) - How central is this value to the dilemma?
- **Polarity** (+1, 0, -1) - Is the value being upheld (+1), violated (-1), or neutral (0)?

#### Core Values (20)

**Dignity Domain:**
1. **Human Dignity** - Inherent worth of persons
2. **Autonomy** - Self-determination and freedom
3. **Equality** - Equal moral consideration
4. **Justice** - Fair treatment and due process

**Care Domain:**
5. **Compassion** - Concern for suffering
6. **Fidelity** - Loyalty and promise-keeping
7. **Beneficence** - Active promotion of well-being
8. **Non-maleficence** - Avoiding harm

**Virtue Domain:**
9. **Integrity** - Consistency between values and actions
10. **Honesty** - Truthfulness
11. **Courage** - Moral fortitude
12. **Humility** - Recognition of limitations

**Community Domain:**
13. **Solidarity** - Mutual support and collective responsibility
14. **Common Good** - Welfare of the community
15. **Stewardship** - Responsible care for resources/environment
16. **Peace** - Harmony and conflict resolution

**Transcendence Domain:**
17. **Meaning** - Purpose and significance
18. **Spiritual Growth** - Development of inner life
19. **Sacred/Holy** - Reverence for the transcendent
20. **Hope** - Orientation toward positive future

#### Output Format
```javascript
{
  "values": [
    {
      "name": "Autonomy",
      "present": true,
      "salience": 0.9,
      "polarity": -1,  // Being violated
      "evidence": "Patient's wishes being overridden by family"
    },
    {
      "name": "Compassion",
      "present": true,
      "salience": 0.8,
      "polarity": 1,   // Being upheld
      "evidence": "Family wants to end suffering"
    },
    {
      "name": "Fidelity",
      "present": true,
      "salience": 0.7,
      "polarity": 0,   // Conflicted
      "evidence": "Torn between promise to patient and family pressure"
    }
  ]
}
```

---

### 3. Enhanced Test Corpus (20 Scenarios)

Expand from 5 to 20 annotated test scenarios covering:

**Life Domains (5 scenarios each):**
1. Healthcare - Medical ethics, end-of-life, treatment decisions
2. Spiritual - Faith crises, religious conflicts, meaning-making
3. Vocational - Professional ethics, whistleblowing, workplace dilemmas
4. Interpersonal - Relationships, loyalty conflicts, truth-telling

**Complexity Levels:**
- Simple (5 scenarios) - Single clear conflict
- Moderate (10 scenarios) - Multiple values in tension
- Complex (5 scenarios) - Systemic issues, long-term consequences

**Required Annotations Per Scenario:**
- Semantic roles (agent, action, patient, modality)
- Frame classification
- Context intensity scores (12 dimensions)
- Value activations (present, salience, polarity)
- Expected dilemma classification
- Reasoning pathway hints

---

### 4. Enhanced Value Definitions (50 Comprehensive Values)

Expand from 20 core values to 50 comprehensive values including:

**Add 30 values covering:**
- Virtue ethics: Wisdom, Temperance, Patience, Generosity, etc.
- Professional ethics: Competence, Accountability, Confidentiality
- Social ethics: Diversity, Inclusion, Transparency, Sustainability
- Personal ethics: Authenticity, Gratitude, Forgiveness, Self-care

**Each value definition must include:**
- Name and domain
- Definition (2-3 sentences)
- Keywords for detection (10-20 terms)
- Related values (3-5 connections)
- Polarity indicators (what upholds vs violates)
- Example scenarios (2-3 brief examples)

---

## Technical Specifications

### API Extensions

Week 2 output should extend Week 1 structure:

```javascript
const result = TagTeam.parse("The family must decide whether to continue treatment");

// Week 1 output (existing)
result.agent           // { text: "family", entity: "family" }
result.action          // { verb: "decide", modality: "must" }
result.semanticFrame   // "Deciding"

// Week 2 additions (new)
result.contextIntensity  // { temporal: {...}, relational: {...}, ... }
result.values            // [{ name: "Autonomy", salience: 0.9, ... }, ...]
result.dilemmaType       // "end-of-life" (auto-classified)
result.complexityScore   // 0.75 (based on context + value conflicts)
```

### Performance Requirements

- **Parse time:** <50ms per scenario (including Week 2 analysis)
- **Accuracy targets:**
  - Context dimension scores: ±0.2 of human annotation
  - Value detection: 80% precision, 70% recall
  - Dilemma classification: 75% accuracy

### Backwards Compatibility

- All Week 1 API methods must continue working
- Week 2 additions should be opt-in or automatically included
- No breaking changes to existing output structure

---

## Deliverables

### Code Deliverables
1. **Updated tagteam.js bundle** - Includes Week 2 features
2. **Context analyzer module** - 12-dimension scoring logic
3. **Value matching module** - Pattern matching for 50 values
4. **Dilemma classifier** - Auto-categorization by domain

### Data Deliverables
1. **test-corpus-week2.json** - 20 fully annotated scenarios
2. **value-definitions-comprehensive.json** - 50 value definitions with keywords
3. **context-patterns.json** - Keyword patterns for 12 dimensions

### Documentation Deliverables
1. **WEEK2_IMPLEMENTATION.md** - Technical documentation
2. **API_REFERENCE_v2.md** - Complete API with examples
3. **VALIDATION_METHODOLOGY.md** - How to validate Week 2 features

### Test Deliverables
1. **Updated test suite** - Validates all Week 2 features
2. **Performance benchmarks** - Parse time, accuracy metrics
3. **Regression tests** - Ensures Week 1 features still work

---

## Validation Criteria

### Week 2 Acceptance Criteria (80% threshold)

#### Context Intensity (30% of grade)
- All 12 dimensions implemented
- Scores within ±0.2 of human annotation for 80% of test cases
- Consistent scoring logic (deterministic)

#### Value Matching (40% of grade)
- Detects relevant values with 80% precision
- Recalls at least 70% of human-identified values
- Polarity assignment accurate in 75% of cases

#### Integration Quality (30% of grade)
- No regressions on Week 1 test corpus
- Parse time <50ms average
- Clean API design, well-documented

### Validation Process

IEE will validate Week 2 deliverables using:

1. **Automated Tests** - Run test-corpus-week2.json through parser
2. **Human Annotation Comparison** - Compare scores to expert annotations
3. **Regression Tests** - Re-run Week 1 corpus, ensure no failures
4. **Performance Testing** - Measure parse times across scenarios
5. **API Review** - Verify clean integration, documentation quality

---

## Timeline

### Week of Jan 13-17 (Preparation)
- **IEE:** Deliver Week 2 requirements (this document)
- **IEE:** Create and annotate 20-scenario test corpus
- **IEE:** Expand value definitions to 50 comprehensive values
- **TagTeam:** Review requirements, ask clarifying questions
- **TagTeam:** Design technical approach for Week 2 features

### Week of Jan 20-24 (Implementation)
- **TagTeam:** Implement context intensity analysis
- **TagTeam:** Implement value matching engine
- **TagTeam:** Update test suite and documentation
- **TagTeam:** Deliver Week 2 bundle by Jan 24

### Jan 24-25 (Validation)
- **IEE:** Run automated validation suite
- **IEE:** Compare against human annotations
- **IEE:** Provide feedback or acceptance

---

## Optional Enhancements (Not Required for Week 2)

### Nice-to-Have Features
1. **Verb lemmatization completion** - Fix 3 remaining checks from Week 1
2. **Confidence scores** - Uncertainty estimates for each dimension
3. **Value conflict detection** - Automatically identify which values are in tension
4. **Reasoning hints** - Brief explanations of why values were detected

### Future Roadmap (Week 3+)
1. **JSON-LD output format** - Semantic web integration
2. **BFO/SHML alignment** - Ontological grounding
3. **Multi-sentence parsing** - Handle complex narrative scenarios
4. **Interactive refinement** - Allow user to adjust scores

---

## Questions for TagTeam

Before proceeding with Week 2, please provide feedback on:

1. **Timeline Feasibility**
   - Is Jan 24 delivery realistic for this scope?
   - Would you prefer to split into Week 2a (context) and Week 2b (values)?

2. **Technical Approach**
   - Will you use rule-based pattern matching, or incorporate ML models?
   - Any dependencies we should provide (word embeddings, ontologies)?

3. **Lemmatization Priority**
   - Should we fix Week 1 lemmatization (3 checks) before Week 2, or handle in parallel?
   - Would completing lemmatization delay Week 2 delivery?

4. **Scope Concerns**
   - Is anything in this spec unclear or underspecified?
   - Any features that seem particularly challenging?

5. **Value Definitions**
   - Would you prefer IEE to provide keyword patterns for each value, or will you derive them?
   - Do you need more example scenarios per value?

6. **Validation Support**
   - Would live validation sessions (screen share) be helpful during development?
   - Should we provide interim test corpus (10 scenarios) before final 20?

---

## Communication

### Response Requested By
**Monday, Jan 13, 2026** - Feedback on timeline and scope questions

### Next IEE Deliveries
**Tuesday, Jan 14, 2026:**
- test-corpus-week2.json (20 annotated scenarios)
- value-definitions-comprehensive.json (50 values)
- context-patterns.json (keyword patterns for 12 dimensions)

### Coordination
All Week 2 artifacts will be placed in:
```
collaborations/tagteam/requirements/week2/
collaborations/tagteam/data/week2/
```

---

## Success Definition

Week 2 is successful when TagTeam delivers a parser that can:

1. ✅ Extract semantic roles (Week 1 baseline - no regressions)
2. ✅ Score 12 contextual dimensions with reasonable accuracy (±0.2)
3. ✅ Detect and score relevant ethical values (80% precision, 70% recall)
4. ✅ Maintain performance (<50ms parse time)
5. ✅ Provide clean, documented API for IEE integration

This enables IEE to move from basic semantic extraction to **context-aware ethical reasoning** - a critical milestone for Phase 4.5 integration.

---

**Document Owner:** Aaron Damiano (IEE Team)
**Last Updated:** January 11, 2026
**Status:** Awaiting TagTeam feedback on timeline and scope
