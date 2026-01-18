# Week 2b Architecture - Value Matching System

**Date:** January 12, 2026
**Planning Session:** Tuesday, Jan 21, 2:00 PM ET

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     TagTeam.parse(text)                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SemanticRoleExtractor                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Week 1: Semantic Role Extraction                         │  │
│  │  - POS Tagging                                          │  │
│  │  - Frame Classification                                 │  │
│  │  - Role Extraction (agent, patient, etc.)              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Week 2a: Context Intensity Analysis                      │  │
│  │  - ContextAnalyzer                                       │  │
│  │  - PatternMatcher (keywords, negation, modifiers)       │  │
│  │  → 12 dimensions scored                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Week 2b: Ethical Profile Generation (NEW)               │  │
│  │                                                          │  │
│  │  Step 1: ValueMatcher                                   │  │
│  │  ├─ Load value definitions                              │  │
│  │  ├─ Match keywords for 50 values                        │  │
│  │  ├─ Detect polarity (positive/negative)                 │  │
│  │  └─ Generate base scores (0.0-1.0)                      │  │
│  │                                                          │  │
│  │  Step 2: ValueScorer                                    │  │
│  │  ├─ Apply frame boosts                                  │  │
│  │  ├─ Apply role boosts                                   │  │
│  │  └─ Normalize to 0.0-1.0 range                          │  │
│  │                                                          │  │
│  │  Step 3: EthicalProfiler                                │  │
│  │  ├─ Identify top values                                 │  │
│  │  ├─ Calculate domain scores                             │  │
│  │  ├─ Detect conflicts                                    │  │
│  │  └─ Generate confidence score                           │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Complete Result Object                       │
│  {                                                              │
│    agent: {...},           // Week 1                           │
│    action: {...},          // Week 1                           │
│    semanticFrame: "...",   // Week 1                           │
│    contextIntensity: {...},// Week 2a                          │
│    ethicalProfile: {...}   // Week 2b (NEW)                    │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. ValueMatcher Component

```
┌─────────────────────────────────────────────────────────────┐
│                      ValueMatcher                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Input:                                                     │
│  - text: "The doctor must allocate the last ventilator"    │
│  - taggedWords: [{word: "doctor", pos: "NN"}, ...]        │
│  - frame: "Resource_allocation"                            │
│  - roles: {agent: "doctor", patient: "ventilator"}        │
│                                                             │
│  ┌───────────────────────────────────────────────────┐    │
│  │ Step 1: Load Value Definitions                   │    │
│  │  value-definitions-comprehensive.json            │    │
│  │  {                                                │    │
│  │    "autonomy": {                                  │    │
│  │      "keywords": ["choice", "decide", ...],      │    │
│  │      "polarity": {                                │    │
│  │        "positive": ["empower", "freedom"],       │    │
│  │        "negative": ["restrict", "control"]       │    │
│  │      }                                            │    │
│  │    },                                             │    │
│  │    ...                                            │    │
│  │  }                                                │    │
│  └───────────────────────────────────────────────────┘    │
│                       │                                     │
│                       ▼                                     │
│  ┌───────────────────────────────────────────────────┐    │
│  │ Step 2: For Each Value (50 iterations)           │    │
│  │                                                    │    │
│  │  For value "sanctityOfLife":                     │    │
│  │    keywords = ["life", "living", "alive", ...]   │    │
│  │                                                    │    │
│  │    Use PatternMatcher to check:                  │    │
│  │    ✓ "life" found in "critically ill"            │    │
│  │    ✓ "ventilator" implies life-support           │    │
│  │                                                    │    │
│  │    Check polarity:                                │    │
│  │    - Positive indicators? ✓ (save, help)         │    │
│  │    - Negative indicators? ✗ (none)               │    │
│  │                                                    │    │
│  │    Handle modifiers:                              │    │
│  │    - Negation? ✗                                  │    │
│  │    - Intensifiers? ✓ ("last", "must")            │    │
│  │    - Hedges? ✗                                    │    │
│  │                                                    │    │
│  │    Calculate base score:                          │    │
│  │    score = 0.7 (high keyword match)              │    │
│  │         + 0.15 (intensifier boost)               │    │
│  │         = 0.85                                    │    │
│  │                                                    │    │
│  └───────────────────────────────────────────────────┘    │
│                       │                                     │
│                       ▼                                     │
│  Output:                                                    │
│  {                                                          │
│    sanctityOfLife: { baseScore: 0.85, matches: [...] },   │
│    beneficence: { baseScore: 0.72, matches: [...] },      │
│    justice: { baseScore: 0.68, matches: [...] },          │
│    ...                                                      │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. ValueScorer Component

```
┌─────────────────────────────────────────────────────────────┐
│                      ValueScorer                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Input:                                                     │
│  - baseScores: {sanctityOfLife: 0.85, ...}                │
│  - frame: "Resource_allocation"                            │
│  - roles: {agent: "doctor", patient: "ventilator"}        │
│                                                             │
│  ┌───────────────────────────────────────────────────┐    │
│  │ Step 1: Load Frame-Value Boosts                  │    │
│  │  frame-value-boosts.json                         │    │
│  │  {                                                │    │
│  │    "Resource_allocation": {                      │    │
│  │      "justice": 0.3,                             │    │
│  │      "responsibility": 0.25,                     │    │
│  │      "common_good": 0.2                          │    │
│  │    },                                             │    │
│  │    ...                                            │    │
│  │  }                                                │    │
│  └───────────────────────────────────────────────────┘    │
│                       │                                     │
│                       ▼                                     │
│  ┌───────────────────────────────────────────────────┐    │
│  │ Step 2: Apply Frame Boosts                       │    │
│  │                                                    │    │
│  │  For "justice":                                   │    │
│  │    baseScore = 0.68                               │    │
│  │    frameBoost = 0.3 (Resource_allocation)        │    │
│  │    boosted = min(0.68 + 0.3, 1.0) = 0.98         │    │
│  │                                                    │    │
│  └───────────────────────────────────────────────────┘    │
│                       │                                     │
│                       ▼                                     │
│  ┌───────────────────────────────────────────────────┐    │
│  │ Step 3: Load Role-Value Boosts                   │    │
│  │  {                                                │    │
│  │    "doctor": {                                    │    │
│  │      "beneficence": 0.3,                         │    │
│  │      "professionalIntegrity": 0.25,              │    │
│  │      "service": 0.2                              │    │
│  │    },                                             │    │
│  │    "patient": {                                   │    │
│  │      "dignity": 0.3,                             │    │
│  │      "autonomy": 0.25,                           │    │
│  │      "safety": 0.2                               │    │
│  │    }                                              │    │
│  │  }                                                │    │
│  └───────────────────────────────────────────────────┘    │
│                       │                                     │
│                       ▼                                     │
│  ┌───────────────────────────────────────────────────┐    │
│  │ Step 4: Apply Role Boosts                        │    │
│  │                                                    │    │
│  │  For "beneficence":                               │    │
│  │    baseScore = 0.72                               │    │
│  │    roleBoost = 0.3 (from "doctor")               │    │
│  │    boosted = min(0.72 + 0.3, 1.0) = 1.0          │    │
│  │                                                    │    │
│  │  For "safety":                                    │    │
│  │    baseScore = 0.75                               │    │
│  │    roleBoost = 0.2 (from "patient")              │    │
│  │    boosted = min(0.75 + 0.2, 1.0) = 0.95         │    │
│  │                                                    │    │
│  └───────────────────────────────────────────────────┘    │
│                       │                                     │
│                       ▼                                     │
│  Output:                                                    │
│  {                                                          │
│    sanctityOfLife: 0.85,  // No boost                     │
│    beneficence: 1.0,      // +0.3 from doctor             │
│    justice: 0.98,         // +0.3 from frame              │
│    safety: 0.95,          // +0.2 from patient            │
│    ...                                                      │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. EthicalProfiler Component

```
┌─────────────────────────────────────────────────────────────┐
│                    EthicalProfiler                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Input: finalScores = {                                    │
│    sanctityOfLife: 0.85,                                   │
│    beneficence: 1.0,                                       │
│    justice: 0.98,                                          │
│    ...                                                      │
│  }                                                          │
│                                                             │
│  ┌───────────────────────────────────────────────────┐    │
│  │ Analysis 1: Top Values                            │    │
│  │                                                    │    │
│  │  1. Sort all 50 values by score descending       │    │
│  │  2. Take top 5:                                   │    │
│  │     - beneficence: 1.0                            │    │
│  │     - justice: 0.98                               │    │
│  │     - safety: 0.95                                │    │
│  │     - service: 0.92                               │    │
│  │     - sanctityOfLife: 0.85                        │    │
│  │                                                    │    │
│  └───────────────────────────────────────────────────┘    │
│                       │                                     │
│                       ▼                                     │
│  ┌───────────────────────────────────────────────────┐    │
│  │ Analysis 2: Domain Analysis                       │    │
│  │                                                    │    │
│  │  Healthcare values:                               │    │
│  │  [autonomy, beneficence, nonMaleficence,         │    │
│  │   justice, dignity, sanctityOfLife, ...]         │    │
│  │  Average: 0.68                                    │    │
│  │                                                    │    │
│  │  Vocational values:                               │    │
│  │  [excellence, honesty, safety, service, ...]     │    │
│  │  Average: 0.64                                    │    │
│  │                                                    │    │
│  │  Dominant: Healthcare (highest average)          │    │
│  │                                                    │    │
│  └───────────────────────────────────────────────────┘    │
│                       │                                     │
│                       ▼                                     │
│  ┌───────────────────────────────────────────────────┐    │
│  │ Analysis 3: Conflict Detection                    │    │
│  │                                                    │    │
│  │  Known conflict pairs (from IEE data):           │    │
│  │  - (justice, mercy)                               │    │
│  │  - (autonomy, beneficence)                        │    │
│  │  - (sanctityOfLife, qualityOfLife)               │    │
│  │                                                    │    │
│  │  Check each pair:                                 │    │
│  │  justice (0.98) vs. sanctityOfLife (0.85)       │    │
│  │    Both high → tension = 0.7                      │    │
│  │    Conflict detected!                             │    │
│  │                                                    │    │
│  │  Overall conflict score:                          │    │
│  │  = max(all tension scores) = 0.7                 │    │
│  │                                                    │    │
│  └───────────────────────────────────────────────────┘    │
│                       │                                     │
│                       ▼                                     │
│  ┌───────────────────────────────────────────────────┐    │
│  │ Analysis 4: Confidence Calculation                │    │
│  │                                                    │    │
│  │  Factors:                                         │    │
│  │  - Keyword matches: 47 (high)                     │    │
│  │  - Text length: 65 chars (medium)                │    │
│  │  - Boosts applied: 20 (high)                     │    │
│  │  - Domain consistency: 0.85 (high)               │    │
│  │                                                    │    │
│  │  Formula:                                         │    │
│  │  confidence = 0.4 * (47/50) +                    │    │
│  │               0.2 * 1.0 +                        │    │
│  │               0.2 * 1.0 +                        │    │
│  │               0.2 * 0.85                         │    │
│  │             = 0.92                               │    │
│  │                                                    │    │
│  └───────────────────────────────────────────────────┘    │
│                       │                                     │
│                       ▼                                     │
│  Output: ethicalProfile = {                                │
│    values: { ... all 50 ... },                            │
│    topValues: [ ... top 5 ... ],                          │
│    dominantDomain: "Healthcare",                           │
│    domainScores: { Healthcare: 0.68, ... },               │
│    conflictScore: 0.7,                                     │
│    conflicts: [ ... detected conflicts ... ],             │
│    confidence: 0.92                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
                Input Text
                    ↓
    ┌───────────────────────────────┐
    │  "The doctor must allocate    │
    │  the last ventilator between  │
    │  two critically ill patients" │
    └───────────────────────────────┘
                    ↓
    ┌───────────────────────────────┐
    │     POS Tagging (Week 1)      │
    │  [{doctor, NN}, {must, MD},   │
    │   {allocate, VB}, ...]        │
    └───────────────────────────────┘
                    ↓
    ┌───────────────────────────────┐
    │  Frame Classification (Week 1)│
    │  → "Resource_allocation"      │
    └───────────────────────────────┘
                    ↓
    ┌───────────────────────────────┐
    │  Role Extraction (Week 1)     │
    │  agent: "doctor"              │
    │  patient: "ventilator"        │
    └───────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
┌─────────────────┐    ┌─────────────────┐
│ ContextAnalyzer │    │  ValueMatcher   │
│    (Week 2a)    │    │   (Week 2b)     │
│                 │    │                 │
│ urgency: 1.0    │    │ Load 50 values  │
│ trust: 0.8      │    │ Match keywords  │
│ harmSeverity:1.0│    │ → base scores   │
│ ...             │    │                 │
└─────────────────┘    └────────┬────────┘
                                │
                                ↓
                       ┌─────────────────┐
                       │  ValueScorer    │
                       │   (Week 2b)     │
                       │                 │
                       │ Apply frame     │
                       │ boosts          │
                       │ Apply role      │
                       │ boosts          │
                       │ → final scores  │
                       └────────┬────────┘
                                │
                                ↓
                       ┌─────────────────┐
                       │EthicalProfiler  │
                       │   (Week 2b)     │
                       │                 │
                       │ Top values      │
                       │ Domains         │
                       │ Conflicts       │
                       │ Confidence      │
                       └────────┬────────┘
                                │
                                ↓
                    ┌───────────────────┐
                    │  Complete Result  │
                    │  {                │
                    │   agent: {...},   │
                    │   contextIntensity│
                    │   ethicalProfile  │
                    │  }                │
                    └───────────────────┘
```

---

## Module Dependencies

```
TagTeam.js Bundle Structure
│
├── lexicon.js (4.11 MB)
│   └── Used by: POSTagger
│
├── POSTagger.js (3.89 KB)
│   └── Used by: SemanticRoleExtractor
│
├── PatternMatcher.js (9.10 KB) [Week 2a]
│   └── Used by: ContextAnalyzer, ValueMatcher
│
├── ContextAnalyzer.js (16.88 KB) [Week 2a]
│   └── Used by: SemanticRoleExtractor
│
├── ValueMatcher.js (~20 KB) [Week 2b - NEW]
│   ├── Depends on: PatternMatcher
│   └── Used by: EthicalProfiler
│
├── ValueScorer.js (~15 KB) [Week 2b - NEW]
│   ├── Depends on: value-definitions.json
│   ├── Depends on: frame-value-boosts.json
│   └── Used by: EthicalProfiler
│
├── EthicalProfiler.js (~10 KB) [Week 2b - NEW]
│   ├── Depends on: ValueMatcher
│   ├── Depends on: ValueScorer
│   └── Used by: SemanticRoleExtractor
│
└── SemanticRoleExtractor.js (34.52 KB + ~50 lines)
    ├── Orchestrates all components
    └── Builds final result object
```

---

## Performance Considerations

### Week 2a Performance Baseline
- 12 dimensions
- ~15 KB code
- Parse time: ~15-25ms per scenario
- ✅ Acceptable

### Week 2b Projected Performance
- 50 values (4x more than Week 2a dimensions)
- ~45 KB code (3x more than Week 2a)
- **Estimated parse time: 40-60ms per scenario**

**Optimization Strategies:**
1. **Lazy Loading:** Only load value definitions once (singleton pattern)
2. **Early Termination:** Skip low-score values after initial pass
3. **Cached Patterns:** Reuse compiled regex patterns
4. **Batch Processing:** Process all values in single pass

**Target:** Keep total parse time under 100ms

---

## Error Handling

```
┌─────────────────────────────────────────────────┐
│           Error Handling Strategy               │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. Missing Data Files                         │
│     If value-definitions.json not found:       │
│     → Return ethicalProfile = null             │
│     → Log warning to console                   │
│     → Don't crash, continue with Week 1+2a     │
│                                                 │
│  2. Invalid JSON                                │
│     If boost files are malformed:              │
│     → Skip boost application                   │
│     → Use base scores only                     │
│     → Set confidence *= 0.7                    │
│                                                 │
│  3. Unknown Frame/Role                          │
│     If frame not in boost mapping:             │
│     → No frame boost applied                   │
│     → Continue normally                        │
│                                                 │
│  4. Computation Errors                          │
│     If score calculation fails:                │
│     → Use default score (0.5)                  │
│     → Log error with context                   │
│     → Continue with other values               │
│                                                 │
│  5. Performance Timeout                         │
│     If parsing takes >500ms:                   │
│     → Return partial results                   │
│     → Set confidence *= 0.5                    │
│     → Log performance warning                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Testing Architecture

```
Test Suite Structure

test-week2b-values.html
│
├── Unit Tests (ValueMatcher)
│   ├── Test keyword detection for each value
│   ├── Test polarity detection
│   ├── Test negation handling
│   └── Test modifier application
│
├── Unit Tests (ValueScorer)
│   ├── Test frame boost application
│   ├── Test role boost application
│   ├── Test score normalization
│   └── Test boost combination
│
├── Unit Tests (EthicalProfiler)
│   ├── Test top value selection
│   ├── Test domain analysis
│   ├── Test conflict detection
│   └── Test confidence calculation
│
└── Integration Tests (20 IEE Scenarios)
    ├── Healthcare (5 scenarios)
    ├── Spiritual (5 scenarios)
    ├── Vocational (5 scenarios)
    ├── Interpersonal (5 scenarios)
    └── Civic (if available)
```

---

**Prepared by:** TagTeam Development Team
**Date:** January 12, 2026
**For:** Jan 21 Planning Session
**Status:** Draft for Discussion
