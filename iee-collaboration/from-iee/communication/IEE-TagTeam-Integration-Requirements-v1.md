# TagTeam Integration Requirements for Integral Ethics Engine
## Version 1.0 | 2026-01-25

---

## Executive Summary

The Integral Ethics Engine (IEE) relies on TagTeam for semantic value detection and polarity assessment. Current integration reveals systematic gaps that prevent IEE from delivering accurate moral reasoning across its 12 philosophical worldviews.

This document specifies requirements for TagTeam improvements that will enable IEE to function as designed. Each requirement includes verifiable acceptance criteria and test cases.

**Impact Statement:** Addressing these requirements will transform IEE's judgment accuracy from ~30% to >85% for standard ethical scenarios across all worldviews.

---

## Background: How IEE Uses TagTeam Output

### Data Flow

```
User Scenario → TagTeam Analysis → Value Detection + Polarity → IEE Value Mapper →
12 Worldview Evaluations → Moral Reasoner → Integrated Judgment
```

### What IEE Expects from TagTeam

For each detected value, TagTeam should return:

```javascript
{
  "name": "Beneficence",           // TagTeam's 50-value taxonomy
  "domain": "care",                // One of: dignity, care, virtue, community, transcendence
  "polarity": 1,                   // +1 (upheld), -1 (violated), 0 (neutral/present)
  "salience": 0.85,                // 0.0-1.0 confidence score
  "evidence": ["medical treatment", "alleviate suffering"]  // Trigger phrases
}
```

### The Critical Gap

IEE's 12 worldviews have different terminal values:

| Worldview | Terminal Values | Currently Detected? |
|-----------|-----------------|---------------------|
| Materialism | physical_wellbeing, empirical_truth, material_security | Rarely |
| Monadism | individual_uniqueness, personal_dignity, authentic_individuality | Often |
| Idealism | consciousness_development, ideas_as_causal, meaning_making | Sometimes |
| Realism | objective_truth, correspondence_to_reality, natural_law | Rarely |
| Dynamism | growth, transformation, vital_energy | Rarely |
| Psychism | psychological_wholeness, individuation, soul_depth | Sometimes |
| ... | ... | ... |

TagTeam's current detection favors autonomy/dignity values, leaving Materialism, Realism, and Dynamism worldviews unable to engage with scenarios (polarity=undefined).

---

## Requirements

### REQ-1: Synonym Expansion for Polarity Indicators

**Priority:** P0 (Critical)

**Problem:** Polarity indicators use exact phrase matching. Semantically equivalent phrases fail to trigger detection.

**Current Behavior:**
```
Pattern: "relieve suffering"
Input: "alleviate patient suffering"
Result: No match (polarity = 0)
```

**Required Behavior:**
```
Pattern: "relieve suffering"
Synonyms: [alleviate, ease, reduce, mitigate, address, lessen]
Input: "alleviate patient suffering"
Result: Match (polarity = +1)
```

**Acceptance Criteria:**

| ID | Test Input | Expected Value | Expected Polarity |
|----|------------|----------------|-------------------|
| 1.1 | "alleviate suffering" | Compassion | +1 |
| 1.2 | "ease the patient's pain" | Compassion | +1 |
| 1.3 | "mitigate harm" | Non-maleficence | +1 |
| 1.4 | "reduce distress" | Compassion | +1 |
| 1.5 | "address their concerns" | Care | +1 |
| 1.6 | "lessen the burden" | Beneficence | +1 |

**Synonym Groups to Implement:**

```javascript
SYNONYM_GROUPS = {
  // Suffering-relief verbs
  "relieve": ["alleviate", "ease", "reduce", "mitigate", "lessen", "address", "soothe"],

  // Harm-related
  "harm": ["hurt", "injure", "damage", "wound", "impair"],
  "prevent": ["avoid", "avert", "stop", "block", "forestall"],

  // Consent-related
  "consent": ["agree", "permit", "authorize", "approve", "accept"],
  "inform": ["tell", "notify", "advise", "disclose", "explain"],

  // Benefit-related
  "help": ["assist", "aid", "support", "serve", "benefit"],
  "improve": ["enhance", "better", "advance", "promote", "foster"],

  // Truth-related
  "truth": ["fact", "reality", "evidence", "proof", "accuracy"],
  "honest": ["truthful", "candid", "sincere", "frank", "transparent"],

  // Growth-related
  "grow": ["develop", "evolve", "mature", "progress", "advance"],
  "transform": ["change", "convert", "shift", "alter", "modify"]
}
```

**Verification Method:** Unit tests with synonym substitution across all 50 values.

---

### REQ-2: Lemmatization for Pattern Matching

**Priority:** P0 (Critical)

**Problem:** Inflected verbs don't match base-form patterns.

**Current Behavior:**
```
Pattern: "obtain consent"
Input: "obtaining their informed consent"
Result: No match (v2.0), Partial match (v3.0)
```

**Required Behavior:**
```
Pattern: "obtain consent" → lemmatized: "obtain consent"
Input: "obtaining their informed consent" → lemmatized: "obtain inform consent"
Result: Full match (polarity = +1)
```

**Acceptance Criteria:**

| ID | Test Input | Expected Value | Expected Polarity |
|----|------------|----------------|-------------------|
| 2.1 | "obtaining consent" | Consent | +1 |
| 2.2 | "she consented to treatment" | Consent | +1 |
| 2.3 | "patients are informed" | Autonomy | +1 |
| 2.4 | "respecting their wishes" | Autonomy | +1 |
| 2.5 | "he was helping others" | Beneficence | +1 |
| 2.6 | "they promoted welfare" | Beneficence | +1 |

**Implementation Note:** Compromise.js is already bundled in v3.0. Ensure lemmatization is applied to BOTH input text AND polarity indicator patterns before matching.

**Verification Method:** Test matrix of all verb inflections (VB, VBD, VBG, VBN, VBP, VBZ) against base patterns.

---

### REQ-3: Compositional Pattern Recognition

**Priority:** P1 (High)

**Problem:** Polarity detection requires exact phrases. Natural language uses compositional structures that convey the same meaning.

**Current Behavior:**
```
Pattern: "relieve suffering"
Input: "alleviate the patient's ongoing suffering"
Result: No match (intervening words break pattern)
```

**Required Behavior:**
```
Pattern Template: [RELIEF_VERB] + [0-3 words] + [SUFFERING_NOUN]
Input: "alleviate the patient's ongoing suffering"
Match: "alleviate" ... "suffering"
Result: Compassion +1
```

**Compositional Templates to Implement:**

```javascript
COMPOSITIONAL_PATTERNS = {
  // Care domain
  "Compassion_uphold": {
    pattern: "[RELIEF_VERB] [*0-3] [SUFFERING_NOUN]",
    RELIEF_VERB: ["relieve", "alleviate", "ease", "reduce", "address", "soothe"],
    SUFFERING_NOUN: ["suffering", "pain", "distress", "anguish", "agony", "misery"]
  },

  "Beneficence_uphold": {
    pattern: "[BENEFIT_VERB] [*0-3] [WELFARE_NOUN]",
    BENEFIT_VERB: ["promote", "improve", "enhance", "advance", "support", "foster"],
    WELFARE_NOUN: ["welfare", "wellbeing", "health", "flourishing", "good", "benefit"]
  },

  "Consent_uphold": {
    pattern: "[OBTAIN_VERB] [*0-3] [CONSENT_NOUN]",
    OBTAIN_VERB: ["obtain", "get", "secure", "receive", "request"],
    CONSENT_NOUN: ["consent", "permission", "agreement", "approval", "authorization"]
  },

  // Dignity domain
  "Autonomy_uphold": {
    pattern: "[RESPECT_VERB] [*0-3] [AUTONOMY_NOUN]",
    RESPECT_VERB: ["respect", "honor", "uphold", "protect", "support"],
    AUTONOMY_NOUN: ["autonomy", "choice", "decision", "wishes", "preferences", "self-determination"]
  },

  // Virtue domain
  "Honesty_uphold": {
    pattern: "[TRUTH_VERB] [*0-3] [TRUTH_NOUN]",
    TRUTH_VERB: ["tell", "speak", "reveal", "disclose", "share"],
    TRUTH_NOUN: ["truth", "facts", "reality", "honestly", "truthfully"]
  },

  // Negation patterns (see REQ-4)
  "Consent_violate": {
    pattern: "[NEGATION] [*0-3] [CONSENT_NOUN]",
    NEGATION: ["without", "no", "denied", "refused", "violated", "ignored"],
    CONSENT_NOUN: ["consent", "permission", "agreement", "approval"]
  }
}
```

**Acceptance Criteria:**

| ID | Test Input | Expected Value | Expected Polarity |
|----|------------|----------------|-------------------|
| 3.1 | "alleviate the patient's suffering" | Compassion | +1 |
| 3.2 | "promote long-term welfare" | Beneficence | +1 |
| 3.3 | "obtain their informed consent" | Consent | +1 |
| 3.4 | "respect the patient's autonomous choices" | Autonomy | +1 |
| 3.5 | "tell them the complete truth" | Honesty | +1 |

**Verification Method:** Pattern coverage tests with varied word-order and intervening modifiers.

---

### REQ-4: Negation Handling

**Priority:** P1 (High)

**Problem:** Negation inverts the moral polarity of an action. Currently, negated phrases return neutral (0) instead of violated (-1).

**Current Behavior:**
```
Input: "without consent"
Result: Consent polarity = 0 (neutral)
```

**Required Behavior:**
```
Input: "without consent"
Result: Consent polarity = -1 (violated)
```

**Negation Scope Rules:**

```javascript
NEGATION_MARKERS = {
  explicit: ["not", "no", "never", "without", "lacking", "absent"],
  violation: ["denied", "refused", "rejected", "violated", "breached", "ignored"],
  failure: ["failed to", "unable to", "neglected to", "omitted"]
}

NEGATION_SCOPE = 4  // Negation affects up to 4 words following
```

**Acceptance Criteria:**

| ID | Test Input | Expected Value | Expected Polarity |
|----|------------|----------------|-------------------|
| 4.1 | "without consent" | Consent | -1 |
| 4.2 | "did not inform the patient" | Autonomy | -1 |
| 4.3 | "refused to help" | Beneficence | -1 |
| 4.4 | "ignored their suffering" | Compassion | -1 |
| 4.5 | "violated their privacy" | Privacy | -1 |
| 4.6 | "failed to obtain consent" | Consent | -1 |
| 4.7 | "never disclosed the risks" | Honesty | -1 |
| 4.8 | "treatment without patient agreement" | Consent | -1 |

**Edge Cases:**

| ID | Test Input | Expected | Reasoning |
|----|------------|----------|-----------|
| 4.9 | "not without consent" | Consent +1 | Double negation |
| 4.10 | "consent was not violated" | Consent +1 | Negated violation |
| 4.11 | "the lack of harm" | Non-maleficence +1 | Negated negative = positive |

**Verification Method:** Negation test suite with scope boundary tests.

---

### REQ-5: Medical/Clinical Vocabulary Expansion

**Priority:** P1 (High)

**Problem:** Healthcare scenarios are common in ethical reasoning, but clinical terminology doesn't trigger value detection.

**Current Gap:**
```
Input: "provide evidence-based medical treatment"
Detected: (nothing relevant to Beneficence)
Expected: Beneficence +1
```

**Medical Semantic Markers to Add:**

```javascript
MEDICAL_VOCABULARY = {
  "Beneficence": [
    "treatment", "therapy", "intervention", "procedure", "surgery",
    "medication", "prescription", "care", "cure", "remedy",
    "heal", "treat", "administer", "prescribe", "operate"
  ],

  "Non-maleficence": [
    "evidence-based", "safe", "proven", "tested", "clinical trial",
    "risk assessment", "contraindicated", "side effects", "adverse events",
    "do no harm", "primum non nocere", "safety protocol"
  ],

  "Consent": [
    "informed consent", "consent form", "patient authorization",
    "treatment consent", "surgical consent", "medical consent",
    "capacity to consent", "competent to decide"
  ],

  "Autonomy": [
    "patient preference", "advance directive", "living will",
    "healthcare proxy", "medical decision", "right to refuse",
    "self-determination", "bodily autonomy"
  ],

  "Compassion": [
    "palliative", "hospice", "comfort care", "pain management",
    "end-of-life care", "supportive care", "symptom relief",
    "patient suffering", "alleviate pain"
  ],

  "Fidelity": [
    "doctor-patient relationship", "therapeutic alliance",
    "confidentiality", "HIPAA", "medical privacy",
    "professional duty", "fiduciary duty"
  ]
}
```

**Acceptance Criteria:**

| ID | Test Input | Expected Values | Expected Polarities |
|----|------------|-----------------|---------------------|
| 5.1 | "provide evidence-based treatment" | Beneficence, Non-maleficence | +1, +1 |
| 5.2 | "obtain informed consent before surgery" | Consent, Autonomy | +1, +1 |
| 5.3 | "palliative care to manage pain" | Compassion, Beneficence | +1, +1 |
| 5.4 | "respect advance directive" | Autonomy, Fidelity | +1, +1 |
| 5.5 | "maintain patient confidentiality" | Fidelity, Privacy | +1, +1 |

**Verification Method:** Medical scenario corpus test (50+ healthcare scenarios).

---

### REQ-6: Value Coverage for All IEE Worldviews

**Priority:** P2 (Medium)

**Problem:** TagTeam's 50 values map well to individualist worldviews (Monadism, Psychism) but poorly to materialist/realist worldviews.

**Current Coverage Analysis:**

| IEE Worldview | Terminal Values | TagTeam Mapping | Coverage |
|---------------|-----------------|-----------------|----------|
| Materialism | physical_wellbeing, empirical_truth, material_security | Beneficence, (none), Safety | 67% |
| Sensationalism | experiential_richness, hedonic_quality, aesthetic_beauty | (none), (none), (none) | 0% |
| Phenomenalism | interpretive_honesty, lived_experience, phenomenological_depth | Honesty (partial), (none), (none) | 33% |
| Realism | objective_truth, correspondence_to_reality, natural_law | Honesty (partial), (none), (none) | 33% |
| Dynamism | growth, transformation, vital_energy | (none), (none), (none) | 0% |
| Monadism | individual_uniqueness, personal_dignity, authentic_individuality | Dignity, Dignity, Autonomy | 100% |
| Idealism | consciousness_development, ideas_as_causal, meaning_making | Wisdom (partial), (none), (none) | 33% |
| Rationalism | logical_coherence, universal_principles, systematic_order | (none), Justice (partial), (none) | 33% |
| Psychism | psychological_wholeness, individuation, soul_depth | Integrity, Autonomy, Wisdom | 100% |
| Pneumatism | spiritual_vitality, ensouled_cosmos, immanent_divinity | Sacred (partial), (none), Sacred | 67% |
| Spiritualism | divine_relationship, revealed_truth, transcendent_connection | Sacred, Honesty (partial), Sacred | 100% |
| Mathematism | mathematical_beauty, structural_harmony, formal_perfection | (none), (none), (none) | 0% |

**Required New Values or Expanded Mappings:**

```javascript
NEW_VALUE_MAPPINGS = {
  // For Materialism/Empiricism
  "Empirical_Truth": {
    semanticMarkers: ["evidence", "data", "research", "study", "experiment",
                      "measurement", "observation", "scientific", "verified", "proven"],
    mapsTo: ["empirical_truth", "correspondence_to_reality", "objective_truth"]
  },

  // For Dynamism
  "Growth": {
    semanticMarkers: ["grow", "develop", "evolve", "mature", "progress",
                      "advance", "improve", "transform", "change", "become"],
    mapsTo: ["growth", "transformation", "vital_energy", "creative_becoming"]
  },

  // For Sensationalism/Phenomenalism
  "Experience": {
    semanticMarkers: ["experience", "feel", "perceive", "sense", "aware",
                      "conscious", "subjective", "lived", "phenomenal", "quality"],
    mapsTo: ["experiential_richness", "lived_experience", "phenomenological_depth"]
  },

  // For Rationalism/Mathematism
  "Coherence": {
    semanticMarkers: ["logical", "consistent", "coherent", "systematic", "ordered",
                      "rational", "principled", "structured", "unified", "integrated"],
    mapsTo: ["logical_coherence", "systematic_order", "structural_harmony"]
  }
}
```

**Acceptance Criteria:**

| ID | Test Input | Worldview Activated | Terminal Value | Polarity |
|----|------------|---------------------|----------------|----------|
| 6.1 | "based on scientific evidence" | Materialism, Realism | empirical_truth | +1 |
| 6.2 | "promotes personal growth" | Dynamism | growth | +1 |
| 6.3 | "rich lived experience" | Phenomenalism | lived_experience | +1 |
| 6.4 | "logical and coherent approach" | Rationalism | logical_coherence | +1 |
| 6.5 | "transforms understanding" | Dynamism | transformation | +1 |

**Verification Method:** Worldview activation coverage test (all 12 worldviews must activate for at least one standard scenario).

---

### REQ-7: Salience Scoring Calibration

**Priority:** P2 (Medium)

**Problem:** IEE uses salience scores to weight value contributions. Current salience scores don't reflect semantic prominence.

**Current Behavior:**
```
Input: "The primary goal is to obtain informed consent before any treatment."
Consent salience: 0.5 (generic)
```

**Required Behavior:**
```
Input: "The primary goal is to obtain informed consent before any treatment."
Consent salience: 0.9 (high - explicit primary focus)
```

**Salience Boosters:**

```javascript
SALIENCE_MODIFIERS = {
  high_boost: ["primary", "main", "central", "crucial", "essential",
               "fundamental", "paramount", "critical", "key", "core"],
  medium_boost: ["important", "significant", "major", "substantial", "notable"],
  low_boost: ["also", "additionally", "furthermore", "moreover"],

  explicit_markers: ["the goal is", "we must", "it is essential to",
                     "the priority is", "above all", "most importantly"],

  frequency_boost: true  // Multiple mentions increase salience
}
```

**Acceptance Criteria:**

| ID | Test Input | Expected Value | Expected Salience |
|----|------------|----------------|-------------------|
| 7.1 | "The primary concern is patient safety" | Non-maleficence | ≥ 0.85 |
| 7.2 | "Safety is also important" | Non-maleficence | 0.5-0.7 |
| 7.3 | "Consent, consent, consent - nothing matters more" | Consent | ≥ 0.95 |
| 7.4 | "We must respect autonomy above all" | Autonomy | ≥ 0.9 |
| 7.5 | "Various factors including dignity" | Dignity | 0.4-0.6 |

**Verification Method:** Salience calibration test with human-annotated gold standard.

---

## Verification Protocol

### Test Suite Structure

```
tagteam-iee-integration-tests/
├── unit/
│   ├── synonym-expansion.test.js      # REQ-1
│   ├── lemmatization.test.js          # REQ-2
│   ├── compositional-patterns.test.js # REQ-3
│   ├── negation-handling.test.js      # REQ-4
│   ├── medical-vocabulary.test.js     # REQ-5
│   └── salience-scoring.test.js       # REQ-7
├── integration/
│   ├── worldview-coverage.test.js     # REQ-6
│   └── iee-moral-reasoning.test.js    # End-to-end
└── scenarios/
    ├── healthcare-corpus.json         # 50 medical scenarios
    ├── business-ethics-corpus.json    # 50 business scenarios
    └── personal-ethics-corpus.json    # 50 personal dilemmas
```

### Acceptance Test: The Canonical Scenario

The following scenario must produce the specified output:

**Input:**
> "A doctor provides evidence-based medical treatment to alleviate patient suffering, fully informing the patient of risks and obtaining their informed consent."

**Required TagTeam Output:**

```javascript
{
  "detectedValues": [
    { "name": "Consent", "polarity": 1, "salience": 0.9,
      "evidence": ["obtaining their informed consent"] },
    { "name": "Autonomy", "polarity": 1, "salience": 0.85,
      "evidence": ["informed consent", "informing the patient"] },
    { "name": "Beneficence", "polarity": 1, "salience": 0.8,
      "evidence": ["medical treatment", "alleviate suffering"] },
    { "name": "Compassion", "polarity": 1, "salience": 0.75,
      "evidence": ["alleviate patient suffering"] },
    { "name": "Non-maleficence", "polarity": 1, "salience": 0.7,
      "evidence": ["evidence-based", "informing of risks"] },
    { "name": "Honesty", "polarity": 1, "salience": 0.65,
      "evidence": ["fully informing", "informing of risks"] }
  ]
}
```

**Required IEE Processing Result:**

| Worldview | Judgment | Confidence |
|-----------|----------|------------|
| Materialism | permissible | ≥ 0.7 |
| Monadism | permissible | ≥ 0.8 |
| Realism | permissible | ≥ 0.6 |
| Idealism | permissible | ≥ 0.7 |
| Psychism | permissible | ≥ 0.75 |
| **Integrated** | **permissible** | **≥ 0.7** |

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Value detection recall | ~40% | ≥ 85% | Detected values / Expected values |
| Polarity accuracy | ~60% | ≥ 90% | Correct polarity / Total detected |
| Worldview activation | 4/12 | 12/12 | Worldviews with polarity ≠ undefined |
| Scenario judgment accuracy | ~30% | ≥ 85% | Correct judgment / Total scenarios |
| Canonical scenario pass | FAIL | PASS | See acceptance test above |

---

## Implementation Priority

| Phase | Requirements | Effort | Impact |
|-------|--------------|--------|--------|
| **Phase 1** | REQ-1, REQ-2 | 1-2 weeks | High - fixes 60% of detection failures |
| **Phase 2** | REQ-3, REQ-4 | 2-3 weeks | High - enables violation detection |
| **Phase 3** | REQ-5 | 1 week | Medium - improves medical scenario handling |
| **Phase 4** | REQ-6, REQ-7 | 2-3 weeks | Medium - enables all worldviews |

---

## Appendix A: Current ValueMapper Reference

The IEE valueMapper expects TagTeam values from this set:

```
Dignity Domain: Human Dignity, Autonomy, Justice, Equality, Human Rights,
                Privacy, Dignity, Freedom, Respect, Consent, Self-determination

Care Domain: Compassion, Beneficence, Non-maleficence, Empathy, Fidelity,
             Care, Protection, Safety, Healing, Nurturance, Generosity

Virtue Domain: Integrity, Honesty, Courage, Wisdom, Humility,
               Temperance, Prudence, Accountability, Patience, Gratitude

Community Domain: Solidarity, Loyalty, Reciprocity, Trust, Cooperation,
                  Belonging, Tradition, Authority, Fairness, Civic Duty

Transcendence Domain: Sacred/Holy, Meaning, Purpose, Hope,
                      Transcendence, Wonder, Gratitude, Love, Peace, Harmony
```

Each TagTeam value maps to multiple worldview-specific values via the valueMapper.

---

## Appendix B: Contact and Delivery

**IEE Technical Contact:** [Your contact info]

**Delivery Format:**
- Updated `tagteam.js` UMD bundle
- Test suite with all acceptance criteria
- Changelog documenting changes

**Version Target:** TagTeam v3.1.0

---

*Document prepared by IEE Integration Team*
*Last updated: 2026-01-25*
