# Week 2b API Mockups - Ethical Profile Output

**Date:** January 12, 2026
**Planning Session:** Tuesday, Jan 21, 2:00 PM ET

---

## Overview

This document provides concrete examples of the `ethicalProfile` field that will be added to `TagTeam.parse()` results in Week 2b.

---

## Complete API Output Structure

### Full Result Object (Week 1 + Week 2a + Week 2b)

```javascript
const result = TagTeam.parse("The doctor must allocate the last ventilator between two critically ill patients");

console.log(result);
// Returns:
{
  // ========================================
  // WEEK 1: Semantic Role Extraction
  // ========================================
  agent: {
    text: "doctor",
    role: "agent",
    entity: "PERSON",
    posTag: "NN",
    position: 1
  },

  action: {
    verb: "allocate",
    lemma: "allocate",
    tense: "present",
    aspect: "simple",
    modality: {
      type: "obligation",
      marker: "must",
      certainty: 0.9
    },
    negation: false
  },

  patient: {
    text: "ventilator",
    role: "patient",
    entity: "OBJECT",
    posTag: "NN",
    position: 4
  },

  semanticFrame: "Resource_allocation",

  confidence: 0.95,

  ambiguity: {
    flagged: false,
    reason: null,
    alternatives: []
  },

  // ========================================
  // WEEK 2a: Context Intensity Analysis
  // ========================================
  contextIntensity: {
    temporal: {
      urgency: 1.0,           // Extreme - life or death
      duration: 1.0,          // Permanent - irreversible
      reversibility: 1.0      // Irreversible decision
    },
    relational: {
      intimacy: 0.35,         // Professional relationship
      powerDifferential: 1.0, // Doctor has extreme power
      trust: 0.8              // High medical trust
    },
    consequential: {
      harmSeverity: 1.0,      // Catastrophic - death
      benefitMagnitude: 1.0,  // Life-saving benefit
      scope: 0.35             // Affects 2-3 individuals
    },
    epistemic: {
      certainty: 0.5,         // Moderate - medical uncertainty
      informationCompleteness: 0.5, // Incomplete information
      expertise: 0.9          // High medical expertise
    }
  },

  // ========================================
  // WEEK 2b: Ethical Profile (NEW)
  // ========================================
  ethicalProfile: {
    // All 50 values with scores (0.0-1.0)
    values: {
      // Healthcare Domain (10 values)
      autonomy: 0.45,
      beneficence: 0.85,
      nonMaleficence: 0.78,
      justice: 0.82,
      dignity: 0.72,
      sanctityOfLife: 0.95,
      qualityOfLife: 0.65,
      informed_consent: 0.35,
      confidentiality: 0.20,
      professionalIntegrity: 0.88,

      // Spiritual Domain (10 values)
      faith: 0.15,
      hope: 0.45,
      love: 0.38,
      compassion: 0.72,
      forgiveness: 0.12,
      redemption: 0.10,
      transcendence: 0.08,
      meaning: 0.42,
      calling: 0.68,
      stewardship: 0.55,

      // Vocational Domain (10 values)
      excellence: 0.78,
      diligence: 0.65,
      honesty: 0.82,
      loyalty: 0.48,
      service: 0.92,
      innovation: 0.22,
      collaboration: 0.58,
      accountability: 0.88,
      safety: 0.95,
      sustainability: 0.32,

      // Interpersonal Domain (10 values)
      respect: 0.75,
      empathy: 0.82,
      truthfulness: 0.78,
      fidelity: 0.52,
      kindness: 0.68,
      gratitude: 0.35,
      humility: 0.42,
      patience: 0.55,
      courage: 0.85,
      wisdom: 0.88,

      // Civic Domain (10 values)
      equality: 0.82,
      liberty: 0.38,
      solidarity: 0.48,
      responsibility: 0.92,
      transparency: 0.68,
      democracy: 0.15,
      rule_of_law: 0.72,
      human_rights: 0.88,
      common_good: 0.85,
      environmental_protection: 0.18
    },

    // Top 5 values ranked by score
    topValues: [
      {
        value: "sanctityOfLife",
        score: 0.95,
        domain: "Healthcare",
        keywords: ["life", "critically ill", "ventilator"],
        boostedBy: ["frame:Resource_allocation", "role:doctor"]
      },
      {
        value: "safety",
        score: 0.95,
        domain: "Vocational",
        keywords: ["critically ill", "allocate"],
        boostedBy: ["role:patient"]
      },
      {
        value: "service",
        score: 0.92,
        domain: "Vocational",
        keywords: ["doctor", "patients"],
        boostedBy: ["frame:Resource_allocation", "role:doctor"]
      },
      {
        value: "responsibility",
        score: 0.92,
        domain: "Civic",
        keywords: ["must", "allocate"],
        boostedBy: ["frame:Resource_allocation"]
      },
      {
        value: "professionalIntegrity",
        score: 0.88,
        domain: "Healthcare",
        keywords: ["doctor", "allocate"],
        boostedBy: ["role:doctor"]
      }
    ],

    // Domain analysis
    dominantDomain: "Healthcare",

    domainScores: {
      Healthcare: 0.68,    // Average of all Healthcare values
      Spiritual: 0.30,
      Vocational: 0.64,
      Interpersonal: 0.63,
      Civic: 0.61
    },

    // Conflict detection
    conflictScore: 0.65,  // Moderate-high conflict

    conflicts: [
      {
        value1: "justice",
        value2: "sanctityOfLife",
        score1: 0.82,
        score2: 0.95,
        tension: 0.7,
        description: "Fair allocation vs. saving all lives - classic triage dilemma"
      },
      {
        value1: "autonomy",
        value2: "beneficence",
        score1: 0.45,
        score2: 0.85,
        tension: 0.5,
        description: "Patient choice vs. medical judgment"
      }
    ],

    // Confidence metrics
    confidence: 0.92,

    metadata: {
      totalKeywordMatches: 47,
      valuesDetected: 38,      // Number with score > 0
      frameBoostsApplied: 8,
      roleBoostsApplied: 12,
      averageScore: 0.58
    }
  }
}
```

---

## Mockup Examples by Scenario Type

### Example 1: Healthcare Triage (healthcare-002)

**Input:**
```javascript
TagTeam.parse("The doctor must allocate the last ventilator between two critically ill patients");
```

**Ethical Profile Output:**
```javascript
{
  values: {
    sanctityOfLife: 0.95,
    safety: 0.95,
    service: 0.92,
    responsibility: 0.92,
    human_rights: 0.88,
    professionalIntegrity: 0.88,
    wisdom: 0.88,
    beneficence: 0.85,
    courage: 0.85,
    common_good: 0.85,
    // ... remaining 40 values
  },
  topValues: [
    { value: "sanctityOfLife", score: 0.95, domain: "Healthcare" },
    { value: "safety", score: 0.95, domain: "Vocational" },
    { value: "service", score: 0.92, domain: "Vocational" }
  ],
  dominantDomain: "Healthcare",
  conflictScore: 0.65,
  confidence: 0.92
}
```

---

### Example 2: Faith Crisis (spiritual-001)

**Input:**
```javascript
TagTeam.parse("I am questioning core doctrines");
```

**Ethical Profile Output:**
```javascript
{
  values: {
    truthfulness: 0.82,
    honesty: 0.78,
    autonomy: 0.72,
    faith: 0.65,          // Paradox: questioning faith activates faith value
    meaning: 0.68,
    wisdom: 0.62,
    courage: 0.58,
    hope: 0.48,
    humility: 0.52,
    transcendence: 0.45,
    // ... remaining 40 values
  },
  topValues: [
    { value: "truthfulness", score: 0.82, domain: "Interpersonal" },
    { value: "honesty", score: 0.78, domain: "Vocational" },
    { value: "autonomy", score: 0.72, domain: "Healthcare" }
  ],
  dominantDomain: "Spiritual",
  conflictScore: 0.42,
  confidence: 0.78
}
```

---

### Example 3: Whistleblowing (vocational-001)

**Input:**
```javascript
TagTeam.parse("I discovered that my company is falsifying safety reports");
```

**Ethical Profile Output:**
```javascript
{
  values: {
    honesty: 0.95,
    truthfulness: 0.92,
    accountability: 0.90,
    safety: 0.95,
    transparency: 0.88,
    professionalIntegrity: 0.92,
    courage: 0.85,
    responsibility: 0.88,
    rule_of_law: 0.82,
    common_good: 0.80,
    // ... remaining 40 values
  },
  topValues: [
    { value: "honesty", score: 0.95, domain: "Vocational" },
    { value: "safety", score: 0.95, domain: "Vocational" },
    { value: "truthfulness", score: 0.92, domain: "Interpersonal" }
  ],
  dominantDomain: "Vocational",
  conflictScore: 0.55,  // Conflict: loyalty vs. honesty
  conflicts: [
    {
      value1: "loyalty",
      value2: "honesty",
      score1: 0.42,
      score2: 0.95,
      tension: 0.6,
      description: "Company loyalty vs. truth-telling"
    }
  ],
  confidence: 0.95
}
```

---

### Example 4: Friend Infidelity (interpersonal-001)

**Input:**
```javascript
TagTeam.parse("My best friend is cheating on their spouse");
```

**Ethical Profile Output:**
```javascript
{
  values: {
    fidelity: 0.88,       // Value at stake
    truthfulness: 0.78,
    honesty: 0.75,
    loyalty: 0.82,        // Competing loyalties
    respect: 0.68,
    courage: 0.62,
    compassion: 0.72,
    wisdom: 0.65,
    responsibility: 0.58,
    kindness: 0.52,
    // ... remaining 40 values
  },
  topValues: [
    { value: "fidelity", score: 0.88, domain: "Interpersonal" },
    { value: "loyalty", score: 0.82, domain: "Vocational" },
    { value: "truthfulness", score: 0.78, domain: "Interpersonal" }
  ],
  dominantDomain: "Interpersonal",
  conflictScore: 0.72,  // High conflict
  conflicts: [
    {
      value1: "loyalty",      // to friend
      value2: "fidelity",     // to marriage
      score1: 0.82,
      score2: 0.88,
      tension: 0.8,
      description: "Friendship loyalty vs. marital fidelity"
    },
    {
      value1: "compassion",   // for friend
      value2: "truthfulness", // tell spouse
      score1: 0.72,
      score2: 0.78,
      tension: 0.6,
      description: "Compassion vs. truth-telling"
    }
  ],
  confidence: 0.85
}
```

---

## API Design Decisions

### 1. Value Score Range: 0.0 - 1.0

**Rationale:**
- Consistent with Week 2a (contextIntensity uses 0.0-1.0)
- Easier to interpret than arbitrary scales
- Natural for combining with boosts

**Alternative Considered:**
- -1.0 to 1.0 (for value violations)
- Rejected: Too complex, separate field better

---

### 2. Top Values: Array of Objects

**Rationale:**
- Provides context (domain, keywords, boosts)
- Easy to display in UI
- Sortable, filterable

**Format:**
```javascript
{
  value: "sanctityOfLife",      // Value name (from definitions)
  score: 0.95,                   // Final score after boosts
  domain: "Healthcare",          // Which domain this belongs to
  keywords: ["life", "critically ill"], // What triggered detection
  boostedBy: ["frame:Resource_allocation", "role:doctor"] // What boosted score
}
```

---

### 3. Domain Scores: Averages

**Rationale:**
- Simple, interpretable
- Resistant to outliers
- Good proxy for domain relevance

**Calculation:**
```javascript
domainScores.Healthcare = average(all Healthcare value scores)
```

---

### 4. Conflict Detection: Pair-based

**Rationale:**
- Explicit, interpretable
- Can provide descriptions
- Extensible (can add more conflict types)

**Format:**
```javascript
{
  value1: "autonomy",
  value2: "beneficence",
  score1: 0.82,
  score2: 0.85,
  tension: 0.7,            // How much they conflict (0.0-1.0)
  description: "Patient choice vs. medical judgment"
}
```

---

### 5. Confidence: Single Score

**Rationale:**
- Overall reliability indicator
- Based on multiple factors:
  - Number of keyword matches
  - Text length
  - Boost applications
  - Domain consistency

**Calculation (proposed):**
```javascript
confidence = (
  (keywordMatches / 50) * 0.4 +     // More matches = higher confidence
  (textLength > 20 ? 1 : 0.5) * 0.2 + // Longer text = more reliable
  (boostsApplied > 0 ? 1 : 0.5) * 0.2 + // Boosts add context
  (domainConsistency) * 0.2          // Values from same domain
)
```

---

## Minimal vs. Full Output

### Option A: Minimal (Default)

```javascript
{
  values: { /* all 50 scores */ },
  topValues: [ /* top 3 */ ],
  dominantDomain: "Healthcare",
  conflictScore: 0.65,
  confidence: 0.92
}
```

**Pros:** Smaller, faster, easier to use
**Cons:** Less debugging info

---

### Option B: Full (Verbose Mode)

```javascript
{
  values: { /* all 50 scores */ },
  topValues: [ /* with keywords, boosts */ ],
  dominantDomain: "Healthcare",
  domainScores: { /* all 5 domains */ },
  conflictScore: 0.65,
  conflicts: [ /* all detected conflicts */ ],
  confidence: 0.92,
  metadata: {
    totalKeywordMatches: 47,
    valuesDetected: 38,
    frameBoostsApplied: 8,
    roleBoostsApplied: 12,
    averageScore: 0.58,
    processingTime: 12  // milliseconds
  }
}
```

**Pros:** Complete information, great for debugging
**Cons:** Larger output, potential information overload

---

**Question for IEE:** Which output level do you prefer?
- Recommend: **Option A (minimal) by default**, with Option B available via flag

---

## Usage Examples

### Basic Usage

```javascript
const result = TagTeam.parse("I must decide whether to tell the truth");

console.log(result.ethicalProfile.topValues);
// [
//   { value: "truthfulness", score: 0.85, domain: "Interpersonal" },
//   { value: "honesty", score: 0.82, domain: "Vocational" },
//   { value: "courage", score: 0.68, domain: "Interpersonal" }
// ]
```

### Filter by Domain

```javascript
const healthcareValues = Object.entries(result.ethicalProfile.values)
  .filter(([value, score]) => {
    // Check if value is in Healthcare domain
    return VALUE_DOMAINS.Healthcare.includes(value);
  })
  .sort((a, b) => b[1] - a[1]);  // Sort by score descending
```

### Check for Specific Value

```javascript
const autonomyScore = result.ethicalProfile.values.autonomy;
if (autonomyScore > 0.7) {
  console.log("High autonomy concern detected");
}
```

### Detect High Conflict Scenarios

```javascript
if (result.ethicalProfile.conflictScore > 0.6) {
  console.log("Ethical dilemma detected!");
  console.log("Conflicts:", result.ethicalProfile.conflicts);
}
```

---

## Backward Compatibility

**Guarantee:** All Week 1 and Week 2a fields remain unchanged.

```javascript
const result = TagTeam.parse("I love coding");

// Week 1 fields - unchanged
result.agent        // ✅ Still works
result.action       // ✅ Still works
result.semanticFrame // ✅ Still works

// Week 2a fields - unchanged
result.contextIntensity  // ✅ Still works

// Week 2b fields - NEW
result.ethicalProfile    // ✅ NEW (undefined for simple sentences)
```

**Note:** `ethicalProfile` may be `null` or have low scores for non-ethical scenarios.

---

**Prepared by:** TagTeam Development Team
**Date:** January 12, 2026
**For:** Jan 21 Planning Session
**Status:** Draft for Discussion
