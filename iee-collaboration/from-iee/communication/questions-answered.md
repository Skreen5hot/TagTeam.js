# TagTeam Integration - Questions Answered

**Date**: 2026-01-09
**For**: TagTeam Development Team
**From**: Integral Ethics Engine (IEE) Team

---

## Critical Questions (Week 1)

### 1. Output Format Compatibility

**Question**: Do you want us to adopt your exact JSON format now, or can we provide an adapter? Should `negated` → `negation` and `frame` → `semanticFrame`?

**Answer**:

**YES - Please adopt IEE's exact JSON format from the start.** This eliminates the need for adapter code and reduces integration risk.

**Required Field Naming**:
- Use `negation` (boolean) - NOT `negated`
- Use `semanticFrame` (string) - NOT `frame`
- Use `confidence` (number 0-1) - NOT `certainty` or `score`

**Complete Output Format**:

```javascript
{
  agent: {
    text: "family",              // REQUIRED - original text span
    role: "agent",                // REQUIRED - semantic role
    entity: "family",             // REQUIRED - normalized entity
    posTag: "NN"                  // REQUIRED - POS tag
  },
  action: {
    verb: "decide",               // REQUIRED - main verb
    lemma: "decide",              // REQUIRED - base form
    tense: "present",             // REQUIRED - present|past|future
    aspect: "simple",             // REQUIRED - simple|progressive|perfect
    modality: "must",             // OPTIONAL - must|should|can|may
    negation: false               // REQUIRED - boolean (NOT "negated")
  },
  patient: {                      // OPTIONAL - may be absent
    text: "life support",
    role: "patient",
    entity: "life_support"
  },
  semanticFrame: "Deciding",     // REQUIRED (NOT "frame")
  confidence: 0.87                // REQUIRED - 0-1 scale
}
```

**Rationale**: IEE's deliberationOrchestrator.js expects these exact field names. Adapters add maintenance burden and performance cost.

---

### 2. Test Corpus Delivery

**Question**: Can we get 5 fully annotated scenarios NOW to validate our work as we build?

**Answer**:

**YES - You will receive 5 scenarios by END OF WEEK 1 (Friday, Jan 17, 2026).**

**Delivery Format**: JSON file: `test-corpus-week1.json`

**What You'll Get**:

```json
{
  "version": "1.0",
  "deliveryDate": "2026-01-17",
  "scenarios": [
    {
      "id": "healthcare-001",
      "domain": "healthcare",
      "title": "End of Life Decision",
      "description": "A 78-year-old patient with terminal cancer is on life support with no chance of recovery. The family must decide whether to continue treatment.",
      "expectedParse": {
        "agent": { "text": "family", "role": "agent", "entity": "family", "posTag": "NN" },
        "action": { "verb": "decide", "lemma": "decide", "tense": "present", "aspect": "simple", "negation": false },
        "patient": { "text": "treatment", "role": "patient", "entity": "treatment" },
        "semanticFrame": "Deciding",
        "confidence": 0.85
      },
      "expectedContext": {
        "physicalImpact": { "intensity": 0.95, "polarity": "negative" },
        "personsInvolved": { "intensity": 0.90, "polarity": "neutral" },
        "autonomyAtStake": { "intensity": 0.85, "polarity": "neutral" },
        "uncertainty": { "intensity": 0.40, "polarity": "neutral" }
      },
      "expectedValues": [
        { "value": "physical_wellbeing", "expectedRelevance": true, "expectedSalience": "high" },
        { "value": "autonomy", "expectedRelevance": true, "expectedSalience": "high" }
      ]
    }
    // ... 4 more scenarios
  ]
}
```

**Timeline Commitment**:
- **Jan 13 (Monday)**: IEE team begins annotation (Iteration 1.3)
- **Jan 17 (Friday)**: First 5 scenarios delivered to TagTeam
- **Jan 20 (Monday Week 2)**: TagTeam validates their parser against these 5

**IEE Action Item**: We will prioritize Iteration 1.3 from [TAGTEAM_TEST_BUILD_PLAN.md](TAGTEAM_TEST_BUILD_PLAN.md) to deliver this by Friday.

---

### 3. Validation Metrics

**Question**: Is 75% accuracy (3 out of 4 correct parses) acceptable for Week 1, or do you need higher?

**Answer**:

**YES - 75% is acceptable for Week 1 MVP.** However, accuracy targets increase over time:

**Week 1 Targets (Initial Validation)**:
- **Agent Extraction**: ≥75% (3/4 correct)
- **Action Extraction**: ≥75% (3/4 correct)
- **Negation Detection**: ≥50% (1/2 correct)
- **Overall Parse Success**: ≥75%

**Week 2 Targets (Expanded Corpus - 20 scenarios)**:
- **Agent Extraction**: ≥85% (17/20 correct)
- **Action Extraction**: ≥85% (17/20 correct)
- **Negation Detection**: ≥75% (3/4 correct)
- **Value Matching**: ≥70% (14/20 scenarios match expected values)

**Week 3+ Targets (Production Readiness - 50 scenarios)**:
- **Agent Extraction**: ≥90% (45/50 correct)
- **Action Extraction**: ≥90% (45/50 correct)
- **Negation Detection**: ≥85% (17/20 negation cases)
- **Value Matching**: ≥75% (38/50 scenarios)
- **Context Intensity**: ≥70% within ±0.2 of expected

**Measurement Method**:

We will use exact string matching for Week 1:

```javascript
function validateAgentExtraction(parsed, expected) {
  return parsed.agent.entity === expected.agent.entity;
}
```

For Week 2+, we'll use semantic similarity:

```javascript
function validateAgentExtraction(parsed, expected) {
  // Accepts synonyms: "family" === "relatives" === "kin"
  return normalizedEntitiesMatch(parsed.agent.entity, expected.agent.entity);
}
```

**Critical**: 75% is the MINIMUM bar for Week 1. If you achieve higher, excellent! But don't block on perfection - we'll iterate.

---

### 4. Multi-word Entities

**Question**: Is handling "life support" as a single entity (not "life" + "support") a blocker for Week 1?

**Answer**:

**YES - This is a BLOCKER for Week 1.**

**Rationale**: IEE's moral reasoning depends on recognizing multi-word concepts as semantic units:
- "life support" (medical equipment) ≠ "life" (existence) + "support" (assistance)
- "terminal cancer" (diagnosis) ≠ "terminal" (endpoint) + "cancer" (disease)
- "informed consent" (legal concept) ≠ "informed" (knowledgeable) + "consent" (agreement)

**Required Behavior**:

```javascript
// CORRECT:
{
  patient: {
    text: "life support",
    entity: "life_support",  // Single concept
    posTag: "NN"             // Noun phrase treated as single unit
  }
}

// INCORRECT:
{
  patient: {
    text: "life",
    entity: "life",
    posTag: "NN"
  }
}
// (loses "support" context)
```

**How to Implement**:

1. **Named Entity Recognition (NER)**: Use compound noun detection before tokenization
2. **Domain Lexicon**: We will provide a list of 50+ ethical domain compound terms in Week 1 corpus
3. **Heuristic**: Any hyphenated or quoted phrase should be treated as single entity

**Week 1 Compound Terms to Handle** (will be in corpus):
- life support
- terminal cancer
- informed consent
- autonomy rights
- end-of-life
- quality of life
- medical treatment
- bodily autonomy

**IEE Action Item**: We will include a `compoundTerms` list in the Week 1 test corpus JSON.

---

## Clarifying Questions (Week 2+)

### 5. Value Definitions Timeline

**Question**: Can we get the first 10 value definitions NOW instead of waiting for Week 2?

**Answer**:

**YES - You will receive 20 core value definitions by END OF THIS WEEK (Friday, Jan 10, 2026).**

**Why 20 instead of 10?** These 20 values appear in >80% of ethical scenarios and cover all 12 worldviews. Getting them early allows you to start value matching logic immediately.

**Delivery Format**: JSON file: `value-definitions-core.json`

**What You'll Get**:

```json
{
  "version": "1.0",
  "deliveryDate": "2026-01-10",
  "values": [
    {
      "name": "physical_wellbeing",
      "type": "terminal",
      "worldviews": ["Materialism", "Sensationalism", "Phenomenalism"],
      "semanticMarkers": [
        "health", "pain", "suffering", "harm", "injury", "disease",
        "medical", "treatment", "physical", "bodily", "life support",
        "terminal", "cancer", "dying"
      ],
      "contextTriggers": ["physicalImpact", "personsInvolved"],
      "artifactTriggers": ["life", "health"],
      "defaultSalience": "high",
      "definition": "The state of bodily health, absence of pain, and physical functioning.",
      "examples": [
        "A patient with terminal cancer experiences severe pain.",
        "The treatment would cause significant physical harm.",
        "Life support maintains minimal bodily functions."
      ]
    },
    {
      "name": "autonomy",
      "type": "terminal",
      "worldviews": ["Monadism", "Idealism", "Rationalism"],
      "semanticMarkers": [
        "decide", "choose", "freedom", "autonomy", "consent",
        "force", "require", "coerce", "liberty", "rights",
        "self-determination", "independent", "voluntary"
      ],
      "contextTriggers": ["autonomyAtStake", "personsInvolved"],
      "artifactTriggers": ["rights", "freedom"],
      "defaultSalience": "high",
      "definition": "The capacity for self-governance and independent decision-making.",
      "examples": [
        "The patient has the right to refuse treatment.",
        "Informed consent requires understanding and voluntariness.",
        "Coercing someone violates their autonomy."
      ]
    }
    // ... 18 more values
  ]
}
```

**The 20 Core Values** (in priority order):

**Terminal Values** (10):
1. physical_wellbeing
2. autonomy
3. dignity
4. justice
5. care
6. empirical_truth
7. growth
8. rational_order
9. spiritual_transcendence
10. experiential_richness

**Constitutive Values** (5):
11. health
12. consciousness
13. relationships
14. knowledge
15. meaning

**Instrumental Values** (5):
16. honesty
17. competence
18. compassion
19. fairness
20. respect

**Timeline**:
- **Jan 10 (Friday)**: 20 core values delivered
- **Jan 24 (Week 2)**: Additional 30 values (total 50)
- **Jan 31 (Week 3)**: Remaining 70 values (total 120)

**IEE Action Item**: I will extract these 20 values from [src/concepts/worldviewManager.js](src/concepts/worldviewManager.js) and create the JSON file TODAY.

---

### 6. Context Intensity Format

**Question**: Should we output decimal precision (0.95) or categories (high/medium/low)?

**Answer**:

**Use DECIMAL PRECISION (0.0 - 1.0 scale) in your output.** IEE will handle category mapping internally if needed.

**Required Format**:

```javascript
{
  physicalImpact: {
    intensity: 0.95,      // REQUIRED - decimal 0-1
    polarity: "negative"  // REQUIRED - "positive" | "negative" | "neutral"
  },
  personsInvolved: {
    intensity: 0.80,
    polarity: "neutral"
  }
}
```

**Precision Requirements**:
- **2 decimal places minimum**: 0.95 (acceptable)
- **3 decimal places maximum**: 0.953 (acceptable but unnecessary)
- **Integer values**: 0 or 1 (acceptable only for binary cases)

**Intensity Calibration Guide** (for your reference):

| Intensity | Interpretation | Example |
|-----------|----------------|---------|
| 0.9-1.0 | Extreme/Maximal | "dying", "terminal", "irreversible" |
| 0.7-0.9 | High/Severe | "serious injury", "major decision" |
| 0.5-0.7 | Medium/Moderate | "discomfort", "inconvenience" |
| 0.3-0.5 | Low/Mild | "minor concern", "slight risk" |
| 0.0-0.3 | Minimal/Trace | "negligible impact", "barely relevant" |

**Polarity Meanings**:
- **positive**: Benefits, gains, improvements ("healing", "flourishing")
- **negative**: Harms, losses, degradation ("suffering", "dying")
- **neutral**: Neither positive nor negative ("decision", "change")

**Example Calibration**:

```
Scenario: "A patient with terminal cancer is dying in severe pain."

Expected Output:
{
  physicalImpact: {
    intensity: 0.95,    // "dying" + "severe pain" = maximal impact
    polarity: "negative"
  },
  personsInvolved: {
    intensity: 0.90,    // "patient" = high (person as subject)
    polarity: "neutral"  // Just indicates people, not harm/benefit
  }
}
```

**Why Decimals Over Categories?**

1. **Granularity**: Allows IEE to distinguish 0.85 (very high) from 0.60 (moderately high)
2. **Weighted Reasoning**: IEE uses intensity scores to weight value salience
3. **Future ML Integration**: Decimal scores enable gradient-based learning if we add ML later

**IEE Internal Mapping** (for your reference only - don't implement this):

```javascript
// IEE converts decimals to categories AFTER receiving your output
function intensityToCategory(intensity) {
  if (intensity >= 0.75) return 'high';
  if (intensity >= 0.40) return 'medium';
  return 'low';
}
```

---

### 7. Validator Integration

**Question**: Will IEE provide `tagteam-validator.js` in Week 1, or should we write our own?

**Answer**:

**IEE will provide `tagteam-validator.js` by END OF WEEK 1 (Friday, Jan 17, 2026).**

**What It Will Do**:

```javascript
// tagteam-validator.js
import { validateParse, calculateAccuracy, generateReport } from './validation-utils.js';

/**
 * Validates TagTeam output against expected test corpus results.
 *
 * @param {Object} tagteamOutput - Your parsed output
 * @param {Object} expectedOutput - From test corpus
 * @returns {Object} Validation results with pass/fail and errors
 */
export function validateTagTeamOutput(tagteamOutput, expectedOutput) {
  const results = {
    passed: true,
    errors: [],
    warnings: [],
    scores: {}
  };

  // Agent validation
  if (tagteamOutput.agent.entity !== expectedOutput.agent.entity) {
    results.passed = false;
    results.errors.push({
      field: 'agent.entity',
      expected: expectedOutput.agent.entity,
      actual: tagteamOutput.agent.entity
    });
  }

  // Action validation
  if (tagteamOutput.action.verb !== expectedOutput.action.verb) {
    results.passed = false;
    results.errors.push({
      field: 'action.verb',
      expected: expectedOutput.action.verb,
      actual: tagteamOutput.action.verb
    });
  }

  // Negation validation (critical)
  if (tagteamOutput.action.negation !== expectedOutput.action.negation) {
    results.passed = false;
    results.errors.push({
      field: 'action.negation',
      expected: expectedOutput.action.negation,
      actual: tagteamOutput.action.negation
    });
  }

  // Confidence validation (must be 0-1)
  if (tagteamOutput.confidence < 0 || tagteamOutput.confidence > 1) {
    results.passed = false;
    results.errors.push({
      field: 'confidence',
      message: 'Must be between 0 and 1'
    });
  }

  return results;
}

/**
 * Runs validator against entire test corpus.
 *
 * @param {Array} testCorpus - Array of test scenarios
 * @param {Function} tagteamParser - Your parsing function
 * @returns {Object} Aggregate results with accuracy scores
 */
export function runFullValidation(testCorpus, tagteamParser) {
  const results = testCorpus.map(scenario => {
    const parsed = tagteamParser(scenario.description);
    const validation = validateTagTeamOutput(parsed, scenario.expectedParse);
    return { scenario: scenario.id, ...validation };
  });

  return {
    totalScenarios: testCorpus.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    accuracy: results.filter(r => r.passed).length / testCorpus.length,
    details: results
  };
}
```

**How to Use It**:

```javascript
// In your TagTeam test suite
import { runFullValidation } from '../iee-integration/tagteam-validator.js';
import testCorpus from '../iee-integration/test-corpus-week1.json';
import { parseScenario } from './tagteam-parser.js';

describe('IEE Integration Validation', () => {
  it('should pass Week 1 validation (75% accuracy)', () => {
    const results = runFullValidation(testCorpus.scenarios, parseScenario);

    expect(results.accuracy).toBeGreaterThanOrEqual(0.75);

    console.log(`Passed: ${results.passed}/${results.totalScenarios}`);
    console.log(`Accuracy: ${(results.accuracy * 100).toFixed(1)}%`);
  });
});
```

**Deliverables**:

| File | Delivery Date | Description |
|------|--------------|-------------|
| `tagteam-validator.js` | Jan 17 (Fri) | Main validation logic |
| `validation-utils.js` | Jan 17 (Fri) | Helper functions for scoring |
| `test-corpus-week1.json` | Jan 17 (Fri) | 5 scenarios with expected outputs |
| `validator-usage-guide.md` | Jan 17 (Fri) | Integration instructions |

**IEE Action Item**: We will create this as part of Iteration 1.5 in [TAGTEAM_TEST_BUILD_PLAN.md](TAGTEAM_TEST_BUILD_PLAN.md).

---

### 8. Performance Targets

**Question**: Is <50ms for parsing only, or does it include value matching and context analysis?

**Answer**:

**<50ms is for COMPLETE END-TO-END PROCESSING** including all 4 integration points:

1. Semantic Action Parsing
2. Semantic Value Matching
3. Context Intensity Analysis
4. Negation Detection

**Breakdown Targets**:

| Component | Target Time | % of Budget |
|-----------|-------------|-------------|
| **Tokenization & POS Tagging** | <10ms | 20% |
| **Semantic Role Labeling** (agent/action/patient) | <15ms | 30% |
| **Value Matching** (against 120 values) | <15ms | 30% |
| **Context Intensity Analysis** | <5ms | 10% |
| **Negation Detection** | <5ms | 10% |
| **TOTAL** | **<50ms** | **100%** |

**Measurement Setup**:

```javascript
// How IEE will measure performance
function benchmarkTagTeam(scenario, iterations = 100) {
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    // FULL PIPELINE
    const parsed = tagteam.parseScenario(scenario.description);
    const matched = tagteam.matchValues(parsed, valueDefinitions);
    const context = tagteam.analyzeContext(parsed);

    const end = performance.now();
    times.push(end - start);
  }

  return {
    mean: times.reduce((a, b) => a + b) / times.length,
    p95: percentile(times, 0.95),
    p99: percentile(times, 0.99)
  };
}
```

**Success Criteria**:

- **Mean**: <50ms across 100 scenarios
- **P95**: <75ms (95th percentile - some scenarios can be slower)
- **P99**: <100ms (99th percentile - rare edge cases)

**Hardware Baseline**:

These targets assume:
- **CPU**: Modern laptop (Intel i5/i7 or AMD Ryzen 5/7, 2020+)
- **Runtime**: Node.js 18+ or modern browser (Chrome 100+)
- **Memory**: <10MB for lexicon + parser in memory

**What's Excluded from the 50ms**:

- Network latency (TagTeam is client-side)
- UI rendering (React/Svelte components)
- Database queries (not applicable)
- Deliberation orchestration overhead (IEE's responsibility)

**What's Included in the 50ms**:

- Loading the 297k lexicon into memory (one-time startup cost - amortize across calls)
- POS tagging
- Semantic parsing
- Value matching against 120 values
- Context scoring
- Output JSON serialization

**Optimization Priority**:

**Week 1**: Don't optimize yet - establish correctness baseline
**Week 2**: Profile and identify bottlenecks (likely value matching loop)
**Week 3**: Optimize hot paths (cache lemmas, precompile regex)

**If You Can't Hit 50ms**:

We can relax to **<100ms** if accuracy is excellent (>85%). Speed matters, but correctness matters more. Let us know early if performance is an issue.

---

## Additional Context

### Integration Architecture Reminder

TagTeam will be called from [src/application/deliberationOrchestrator.js](src/application/deliberationOrchestrator.js):

```javascript
// Current (Week 1+)
import { parseScenario } from '../concepts/scenarioParser.js'; // IEE's old parser

// Future (Week 3+)
import { parseScenario } from 'tagteam/semantic-parser.js'; // Your parser
```

**Deliverable**: Your final output should be an ES module that exports:

```javascript
// tagteam/semantic-parser.js
export function parseScenario(description, domain = 'general') {
  // Your implementation
  return {
    agent: { ... },
    action: { ... },
    patient: { ... },
    semanticFrame: "...",
    confidence: 0.XX
  };
}

export function matchValues(parsedScenario, valueDefinitions) {
  // Your implementation
  return [
    { value: "physical_wellbeing", salience: "high", confidence: 0.XX },
    { value: "autonomy", salience: "high", confidence: 0.XX }
  ];
}

export function analyzeContext(parsedScenario) {
  // Your implementation
  return {
    physicalImpact: { intensity: 0.XX, polarity: "..." },
    personsInvolved: { intensity: 0.XX, polarity: "..." },
    // ... other context dimensions
  };
}
```

---

## Summary of Commitments

### IEE Team Commitments:

| Deliverable | Due Date | Status |
|-------------|----------|--------|
| 20 Core Value Definitions JSON | Jan 10 (Fri) | **COMMITTED** |
| 5 Annotated Test Scenarios JSON | Jan 17 (Fri) | **COMMITTED** |
| `tagteam-validator.js` | Jan 17 (Fri) | **COMMITTED** |
| Compound Terms List (50+ terms) | Jan 17 (Fri) | **COMMITTED** |
| 20 Total Scenarios | Jan 24 (Fri Week 2) | Planned |
| 50 Total Scenarios | Jan 31 (Fri Week 3) | Planned |

### TagTeam Team Commitments:

| Milestone | Due Date | Target Accuracy |
|-----------|----------|-----------------|
| Week 1 MVP - 5 scenarios | Jan 20 (Mon) | ≥75% |
| Week 2 Expansion - 20 scenarios | Jan 27 (Mon) | ≥85% |
| Week 3 Production - 50 scenarios | Feb 3 (Mon) | ≥90% |

---

## Open Issues / Next Steps

1. **Confirm Receipt**: Please acknowledge you've received this document and the format is clear
2. **Blocker Clarification**: If multi-word entities are still unclear, request a 15-min call
3. **Value Definitions Review**: When you receive the 20 core values JSON (Jan 10), validate the format works for you
4. **Week 1 Checkpoint**: Friday Jan 17 - joint review of 5 scenarios + validator

---

## Contact for Questions

- **Architecture Questions**: Reply to this document with line-specific questions
- **Urgent Blockers**: Flag in shared channel immediately
- **Weekly Sync**: Mondays 10am (starting Jan 13)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-09
**Next Review**: 2026-01-17 (after Week 1 delivery)
