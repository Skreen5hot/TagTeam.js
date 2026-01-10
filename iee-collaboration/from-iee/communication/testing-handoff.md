# TagTeam Testing Framework Handoff

**Project**: Integral Ethics Engine (IEE) → TagTeam.js Integration
**Date**: 2026-01-05
**Purpose**: Define testing framework, quality standards, and artifacts to share with TagTeam team

---

## Executive Summary

To maintain quality synchronization between IEE and TagTeam.js, we need:

1. **Shared test scenario corpus** - 50+ annotated ethical scenarios
2. **Validation dataset** - Ground truth for semantic parsing outputs
3. **Test harness** - Automated validation against IEE expectations
4. **Quality metrics** - Measurable success criteria

This document defines what IEE will provide to TagTeam and what we expect back.

---

## IEE Testing Architecture Overview

### Current Test Structure

```
Integral-Ethics-Engine/
├── src/
│   ├── concepts/
│   │   ├── scenarioParser.js       # Current parser (to be enhanced)
│   │   └── moralReasoner.js         # Current reasoner (needs better inputs)
│   └── application/
│       └── deliberationOrchestrator.js
├── tests/
│   ├── unit/                        # NOT YET CREATED
│   │   ├── parser.test.js
│   │   └── reasoner.test.js
│   └── integration/                 # NOT YET CREATED
│       └── deliberation.test.js
├── TEST_SCENARIOS.md                # ✅ EXISTS (100+ lines)
├── test-parser.js                   # ✅ EXISTS (standalone test)
└── package.json
```

**Current State**:
- ✅ Manual test scenarios documented
- ✅ One-off test script (test-parser.js)
- ❌ No formal test framework yet
- ❌ No automated validation suite

**What We Need to Build** (for TagTeam handoff):
1. Jest/Vitest test framework setup
2. Test scenario corpus in JSON format
3. Ground truth annotations for validation
4. Test harness for TagTeam output validation

---

## Artifacts to Provide TagTeam

### Artifact 1: Test Scenario Corpus (High Priority)

**File**: `tagteam-test-corpus.json`

**Format**:
```json
{
  "version": "1.0.0",
  "totalScenarios": 50,
  "domains": ["healthcare", "spiritual", "vocational", "environmental", "interpersonal", "education", "political", "technological"],
  "scenarios": [
    {
      "id": "healthcare-001",
      "domain": "healthcare",
      "title": "End of Life Decision",
      "description": "A 78-year-old patient with terminal cancer is on life support with no chance of recovery. The family must decide whether to continue aggressive treatment or transition to comfort care. The patient left no advance directive, but had previously mentioned preferring quality of life over prolonged suffering.",

      "expectedParse": {
        "agent": {
          "text": "The family",
          "role": "agent",
          "entity": "family"
        },
        "action": {
          "verb": "decide",
          "lemma": "decide",
          "tense": "present",
          "aspect": "simple",
          "modality": "must",
          "negation": false
        },
        "patient": {
          "text": "whether to continue aggressive treatment or transition to comfort care",
          "role": "theme",
          "entity": "treatment"
        },
        "semanticFrame": "decision_making"
      },

      "expectedContext": {
        "physicalImpact": {
          "present": true,
          "intensity": 0.95,
          "polarity": "negative"
        },
        "moralConflict": {
          "present": true,
          "intensity": 0.85,
          "conflictType": "value"
        },
        "autonomyStake": {
          "present": true,
          "intensity": 0.70,
          "whose": ["patient", "family"]
        }
      },

      "expectedValues": [
        {
          "value": "physical_wellbeing",
          "worldview": "Materialism",
          "expectedRelevance": true,
          "expectedSalience": "high",
          "expectedConfidence": 0.9
        },
        {
          "value": "individual_uniqueness",
          "worldview": "Monadism",
          "expectedRelevance": true,
          "expectedSalience": "high",
          "expectedConfidence": 0.85
        },
        {
          "value": "aesthetic_beauty",
          "worldview": "Sensationalism",
          "expectedRelevance": false,
          "expectedSalience": "low",
          "expectedConfidence": 0.95
        }
      ],

      "testCases": [
        {
          "type": "negation_detection",
          "text": "no chance of recovery",
          "expectedNegation": true
        },
        {
          "type": "agent_identification",
          "expectedAgent": "family",
          "notAgent": "patient"
        },
        {
          "type": "semantic_frame",
          "expectedFrame": "decision_making",
          "notFrame": "causing_harm"
        }
      ]
    },

    // ... 49 more scenarios
  ]
}
```

**Source**: Extract from [TEST_SCENARIOS.md](TEST_SCENARIOS.md) + manual annotations

**Delivery Format**:
- JSON file
- Includes 50 scenarios across 8 domains
- Each scenario has expected outputs for validation
- Delivered via: Git repository, shared folder, or API endpoint

---

### Artifact 2: Value Definition Ontology (High Priority)

**File**: `iee-value-definitions.json`

**Purpose**: TagTeam needs to know what IEE values mean to match them semantically

**Format**:
```json
{
  "version": "1.0.0",
  "worldviews": 12,
  "totalValues": 120,
  "definitions": [
    {
      "value": "physical_wellbeing",
      "worldview": "Materialism",
      "type": "terminal",
      "domain": "physical",
      "relatedConcepts": [
        "health", "life", "pain", "suffering", "death", "dying",
        "terminal", "cancer", "treatment", "medical", "life support",
        "injury", "harm", "disease", "illness", "recovery", "healing"
      ],
      "antonyms": [
        "harm", "injury", "death", "disease", "illness", "suffering"
      ],
      "semanticField": "medical",
      "definition": "The state of bodily health, freedom from pain and suffering, and continuation of biological life. Materialism grounds value in physical states of the body.",
      "exampleContexts": [
        "A patient is terminally ill",
        "Someone is experiencing chronic pain",
        "A person's life is threatened",
        "Medical treatment is needed"
      ]
    },

    {
      "value": "empirical_truth",
      "worldview": "Materialism",
      "type": "terminal",
      "domain": "epistemic",
      "relatedConcepts": [
        "evidence", "data", "research", "study", "science", "proven",
        "medical fact", "observation", "measurement", "experiment"
      ],
      "antonyms": [
        "unproven", "unscientific", "speculation", "faith-based"
      ],
      "semanticField": "scientific",
      "definition": "Truth derived from empirical observation and scientific method. What can be measured, tested, and verified through physical evidence.",
      "exampleContexts": [
        "Medical research shows...",
        "Scientific evidence indicates...",
        "Studies have proven...",
        "Data demonstrates..."
      ]
    },

    {
      "value": "lived_experience",
      "worldview": "Phenomenalism",
      "type": "terminal",
      "domain": "experiential",
      "relatedConcepts": [
        "experience", "feel", "perspective", "interpret", "prefer",
        "subjective", "personal", "individual", "phenomenal", "consciousness"
      ],
      "antonyms": [
        "objective", "external", "impersonal"
      ],
      "semanticField": "phenomenological",
      "definition": "The subjective quality of conscious experience from a first-person perspective. How things appear and feel to the experiencing subject.",
      "exampleContexts": [
        "The patient's experience of pain",
        "How it feels from their perspective",
        "What they personally prefer",
        "Their subjective interpretation"
      ]
    },

    // ... 117 more value definitions (10 per worldview × 12 worldviews)
  ]
}
```

**Generation Method**:
1. Extract from [src/concepts/worldviewManager.js](src/concepts/worldviewManager.js)
2. Manually annotate with semantic fields and example contexts
3. Validate against [src/concepts/moralReasoner.js](src/concepts/moralReasoner.js) pattern matching

**Delivery**: JSON file in Git repo

---

### Artifact 3: Test Harness / Validation Suite (Medium Priority)

**File**: `tagteam-validator.js`

**Purpose**: Automated validation that TagTeam outputs meet IEE expectations

**Structure**:
```javascript
/**
 * TagTeam Output Validator for IEE Integration
 *
 * Usage:
 *   node tagteam-validator.js <tagteam-output.json> <expected-corpus.json>
 *
 * Returns:
 *   - Pass/fail for each test scenario
 *   - Aggregate metrics (accuracy, precision, recall)
 *   - Detailed error report
 */

import { readFileSync } from 'fs';

// Load test corpus
const corpus = JSON.parse(readFileSync('tagteam-test-corpus.json'));
const tagteamOutput = JSON.parse(process.argv[2]);

// Validation functions
function validateSemanticAction(actual, expected) {
  return {
    agentCorrect: actual.agent.entity === expected.agent.entity,
    actionCorrect: actual.action.verb === expected.action.verb,
    patientCorrect: actual.patient?.entity === expected.patient?.entity,
    negationCorrect: actual.action.negation === expected.action.negation,
    semanticFrameCorrect: actual.semanticFrame === expected.semanticFrame
  };
}

function validateContextIntensity(actual, expected) {
  const tolerance = 0.15; // Allow 15% variance
  return {
    physicalImpactAccurate: Math.abs(
      actual.physicalImpact.intensity - expected.physicalImpact.intensity
    ) < tolerance,
    moralConflictAccurate: Math.abs(
      actual.moralConflict.intensity - expected.moralConflict.intensity
    ) < tolerance
  };
}

function validateValueRelevance(actual, expected) {
  const relevantMatches = expected
    .filter(v => v.expectedRelevance === true)
    .filter(v => actual.find(a =>
      a.value === v.value && a.relevant === true
    )).length;

  const irrelevantMatches = expected
    .filter(v => v.expectedRelevance === false)
    .filter(v => actual.find(a =>
      a.value === v.value && a.relevant === false
    )).length;

  const totalExpected = expected.length;
  const accuracy = (relevantMatches + irrelevantMatches) / totalExpected;

  return {
    accuracy,
    relevantMatches,
    irrelevantMatches,
    totalExpected
  };
}

// Run validation
const results = corpus.scenarios.map(scenario => {
  const output = tagteamOutput.find(o => o.id === scenario.id);

  if (!output) {
    return {
      id: scenario.id,
      status: 'ERROR',
      error: 'No TagTeam output found for scenario'
    };
  }

  const actionValidation = validateSemanticAction(
    output.semanticAction,
    scenario.expectedParse
  );

  const contextValidation = validateContextIntensity(
    output.contextIntensity,
    scenario.expectedContext
  );

  const valueValidation = validateValueRelevance(
    output.valueRelevance,
    scenario.expectedValues
  );

  const passed =
    Object.values(actionValidation).every(v => v) &&
    Object.values(contextValidation).every(v => v) &&
    valueValidation.accuracy >= 0.75;

  return {
    id: scenario.id,
    status: passed ? 'PASS' : 'FAIL',
    actionValidation,
    contextValidation,
    valueValidation
  };
});

// Compute aggregate metrics
const totalPassed = results.filter(r => r.status === 'PASS').length;
const totalFailed = results.filter(r => r.status === 'FAIL').length;
const totalErrors = results.filter(r => r.status === 'ERROR').length;
const accuracy = totalPassed / corpus.scenarios.length;

console.log(`\n=== TagTeam Validation Results ===\n`);
console.log(`Total Scenarios: ${corpus.scenarios.length}`);
console.log(`Passed: ${totalPassed} (${(accuracy * 100).toFixed(1)}%)`);
console.log(`Failed: ${totalFailed}`);
console.log(`Errors: ${totalErrors}`);
console.log(`\nTarget Accuracy: 75%`);
console.log(`Status: ${accuracy >= 0.75 ? '✅ PASS' : '❌ FAIL'}`);

// Detailed failure report
if (totalFailed > 0 || totalErrors > 0) {
  console.log(`\n=== Failure Details ===\n`);
  results
    .filter(r => r.status !== 'PASS')
    .forEach(r => {
      console.log(`\n${r.id}:`);
      if (r.error) {
        console.log(`  Error: ${r.error}`);
      } else {
        console.log(`  Action Validation:`, r.actionValidation);
        console.log(`  Context Validation:`, r.contextValidation);
        console.log(`  Value Validation:`, r.valueValidation);
      }
    });
}

// Exit with appropriate code
process.exit(accuracy >= 0.75 ? 0 : 1);
```

**Purpose**:
- TagTeam runs this validator against their outputs
- Catches regressions automatically
- Provides clear pass/fail feedback
- Enables CI/CD integration

**Delivery**: JavaScript file + instructions in Git repo

---

### Artifact 4: Integration Test Suite (Medium Priority)

**Directory**: `tests/tagteam-integration/`

**Structure**:
```
tests/tagteam-integration/
├── setup.js                    # Test environment setup
├── semantic-action.test.js     # Integration Point 1 tests
├── value-matching.test.js      # Integration Point 2 tests
├── context-intensity.test.js   # Integration Point 3 tests
├── negation-detection.test.js  # Integration Point 4 tests
└── end-to-end.test.js          # Full pipeline tests
```

**Example Test File** (`semantic-action.test.js`):

```javascript
/**
 * Integration Point 1: Semantic Action Parsing
 * Tests TagTeam's parseSemanticAction() function
 */

import { describe, it, expect } from 'vitest';
import { parseSemanticAction } from 'tagteam-iee';
import testCorpus from '../../tagteam-test-corpus.json';

describe('TagTeam Integration: Semantic Action Parsing', () => {
  // Test all corpus scenarios
  testCorpus.scenarios.forEach(scenario => {
    describe(`Scenario: ${scenario.id} - ${scenario.title}`, () => {
      let result;

      beforeAll(() => {
        result = parseSemanticAction(scenario.description);
      });

      it('should identify correct agent', () => {
        expect(result.agent.entity).toBe(scenario.expectedParse.agent.entity);
      });

      it('should identify correct action verb', () => {
        expect(result.action.verb).toBe(scenario.expectedParse.action.verb);
      });

      it('should identify correct patient/theme', () => {
        if (scenario.expectedParse.patient) {
          expect(result.patient.entity).toBe(scenario.expectedParse.patient.entity);
        }
      });

      it('should detect negation correctly', () => {
        expect(result.action.negation).toBe(scenario.expectedParse.action.negation);
      });

      it('should assign correct semantic frame', () => {
        expect(result.semanticFrame).toBe(scenario.expectedParse.semanticFrame);
      });

      it('should have confidence >= 0.8', () => {
        expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  // Edge case tests
  describe('Edge Cases', () => {
    it('should handle double negation', () => {
      const result = parseSemanticAction(
        "I can't not do this anymore - I must act."
      );
      expect(result.action.negation).toBe(false); // Double negative = positive
    });

    it('should handle ambiguous pronouns', () => {
      const result = parseSemanticAction(
        "They told them that they should decide."
      );
      expect(result.confidence).toBeLessThan(0.7); // Should flag ambiguity
    });

    it('should handle passive voice', () => {
      const result = parseSemanticAction(
        "The patient was harmed by the treatment."
      );
      expect(result.agent.entity).toBe('treatment');
      expect(result.patient.entity).toBe('patient');
    });
  });
});
```

**Purpose**:
- Automated regression testing
- CI/CD integration
- Clear documentation of expected behavior

**Delivery**: Test files in Git repo

---

### Artifact 5: Sample IEE Outputs (Low Priority)

**File**: `iee-sample-outputs.json`

**Purpose**: Show TagTeam what IEE's current parser produces (for comparison)

**Format**:
```json
{
  "version": "current",
  "parser": "scenarioParser.js (keyword-based)",
  "samples": [
    {
      "scenarioId": "healthcare-001",
      "input": "A 78-year-old patient with terminal cancer...",
      "currentOutput": {
        "action": "cancer is on life support with no chance of recovery. the family must decide whether to continue aggressive treat",
        "context": {
          "physicalImpact": true,
          "personsInvolved": true,
          "autonomyAtStake": true,
          "uncertainty": true
        },
        "agents": [
          { "role": "patient", "mentioned": "patient" },
          { "role": "family", "mentioned": "family" },
          { "role": "self", "mentioned": "I" }
        ],
        "artifacts": [
          { "type": "life", "mentioned": "life support" }
        ]
      },
      "problems": [
        "Action extraction is imprecise (includes 'cancer is on life support')",
        "Context flags are binary (no intensity)",
        "No negation detection ('no chance of recovery' not flagged)",
        "Agent 'self' incorrectly identified (no first-person in text)"
      ]
    }
  ]
}
```

**Purpose**: Shows TagTeam what they're improving upon

**Delivery**: JSON file

---

## Testing Framework Setup (IEE Side)

### What IEE Needs to Build

**Priority 1: Test Framework Installation**

```bash
# Install Vitest (lightweight, fast)
npm install --save-dev vitest

# Update package.json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest tests/unit",
    "test:integration": "vitest tests/integration",
    "test:tagteam": "vitest tests/tagteam-integration"
  }
}
```

**Priority 2: Directory Structure**

```
tests/
├── unit/
│   ├── parser.test.js           # Test scenarioParser.js
│   ├── reasoner.test.js         # Test moralReasoner.js
│   └── worldview.test.js        # Test worldviewManager.js
├── integration/
│   ├── deliberation.test.js     # Test full deliberation flow
│   └── conflict-resolution.test.js
├── tagteam-integration/
│   ├── semantic-action.test.js
│   ├── value-matching.test.js
│   ├── context-intensity.test.js
│   └── negation-detection.test.js
├── fixtures/
│   ├── tagteam-test-corpus.json
│   └── iee-value-definitions.json
└── helpers/
    └── tagteam-validator.js
```

**Priority 3: Test Corpus Generation Script**

```javascript
/**
 * generate-test-corpus.js
 *
 * Extracts scenarios from TEST_SCENARIOS.md and formats as JSON
 */

import { readFileSync, writeFileSync } from 'fs';

const testScenariosContent = readFileSync('TEST_SCENARIOS.md', 'utf-8');

// Parse markdown and extract scenarios
// Manual annotation pass needed for expectedParse, expectedContext, expectedValues

const corpus = {
  version: '1.0.0',
  totalScenarios: 0,
  domains: [],
  scenarios: []
};

// ... parsing logic

writeFileSync(
  'tests/fixtures/tagteam-test-corpus.json',
  JSON.stringify(corpus, null, 2)
);

console.log(`✓ Generated test corpus with ${corpus.totalScenarios} scenarios`);
```

---

## Quality Metrics & Success Criteria

### Metrics to Track

**Semantic Action Parsing**:
- ✅ Agent identification accuracy: >90%
- ✅ Action verb accuracy: >90%
- ✅ Patient identification accuracy: >85%
- ✅ Negation detection accuracy: >85%
- ✅ Semantic frame accuracy: >80%

**Value Matching**:
- ✅ Relevant value identification: >75% precision
- ✅ Irrelevant value rejection: >85% precision
- ✅ Salience assignment agreement: >70% with manual annotation

**Context Intensity**:
- ✅ Intensity scores within ±0.15 of expected: >80%
- ✅ Polarity detection: >90%

**Performance**:
- ✅ Parse time per scenario: <50ms
- ✅ Memory usage: <10MB overhead

**Determinism**:
- ✅ Same input → same output: 100% consistency

### Validation Process

1. **Weekly Validation Runs**
   - TagTeam runs validator against test corpus
   - Reports metrics to IEE team
   - Discusses failures/edge cases

2. **Regression Testing**
   - Any TagTeam code change runs full test suite
   - No commits without passing tests
   - CI/CD pipeline gates deployment

3. **Manual Review**
   - 10% random sample manual review
   - Edge case analysis
   - Continuous corpus refinement

---

## Coordination Protocol

### Weekly Sync Cadence

**Week 1**:
- IEE delivers: Test corpus (20 scenarios), value definitions
- TagTeam delivers: Initial semantic role extraction
- Joint validation: Run validator, review failures

**Week 2**:
- IEE delivers: Full test corpus (50 scenarios), integration tests
- TagTeam delivers: Value matching + context intensity
- Joint validation: Run full test suite, discuss edge cases

**Week 3**:
- IEE delivers: Edge case scenarios, performance benchmarks
- TagTeam delivers: Final integration build
- Joint validation: End-to-end testing, production readiness

### Communication Channels

**Test Results**:
- Automated: CI/CD posts results to shared Slack/Discord channel
- Manual: Weekly validation report (Google Doc or GitHub issue)

**Bug Reports**:
- GitHub Issues with label `tagteam-integration`
- Include: Scenario ID, expected vs actual, TagTeam version

**Corpus Updates**:
- Git commits to `tests/fixtures/` directory
- Semantic versioning for corpus (1.0.0, 1.1.0, etc.)
- Change log documents new scenarios or updated annotations

---

## Delivery Checklist

### IEE Delivers to TagTeam:

- [ ] `tagteam-test-corpus.json` - 50 annotated scenarios
- [ ] `iee-value-definitions.json` - 120 value definitions
- [ ] `tagteam-validator.js` - Automated validation script
- [ ] `tests/tagteam-integration/*.test.js` - Integration test suite
- [ ] `iee-sample-outputs.json` - Current baseline outputs
- [ ] `TAGTEAM_INTEGRATION_REQUIREMENTS.md` - Full spec (already created)
- [ ] Weekly validation reports - Pass/fail metrics

### TagTeam Delivers to IEE:

- [ ] `tagteam-iee.js` - Integration build (ES6 module)
- [ ] `tagteam-output-samples.json` - Output for test corpus
- [ ] Weekly validation run results - Metrics report
- [ ] Documentation - API usage, semantic frame ontology
- [ ] Performance benchmarks - Parse times, memory usage
- [ ] Edge case analysis - Known limitations, failure modes

---

## Next Steps

### Immediate (This Week):

1. **Generate Test Corpus**
   - Extract 20 scenarios from TEST_SCENARIOS.md
   - Manually annotate expected outputs
   - Validate against current IEE parser

2. **Create Value Definitions**
   - Extract from worldviewManager.js
   - Add semantic fields and example contexts
   - Validate against moralReasoner.js patterns

3. **Build Validator Script**
   - Implement validation functions
   - Test with current IEE outputs
   - Document pass/fail criteria

### Short-term (Week 1-2):

4. **Expand Test Corpus**
   - Reach 50 scenarios across 8 domains
   - Add edge cases (negation, ambiguity, passive voice)
   - Peer review annotations

5. **Create Integration Tests**
   - Set up Vitest framework
   - Write tests for all 4 integration points
   - Establish CI/CD pipeline

### Medium-term (Week 3+):

6. **Continuous Corpus Refinement**
   - Add scenarios based on TagTeam failures
   - Update annotations based on joint review
   - Version control corpus evolution

7. **Performance Benchmarking**
   - Establish baseline metrics
   - Monitor TagTeam performance
   - Optimize bottlenecks

---

## Appendix: File Directory Structure

### What to Share with TagTeam

```
Integral-Ethics-Engine/
├── tests/
│   ├── fixtures/
│   │   ├── tagteam-test-corpus.json          # ← DELIVER
│   │   ├── iee-value-definitions.json        # ← DELIVER
│   │   └── iee-sample-outputs.json           # ← DELIVER
│   ├── helpers/
│   │   └── tagteam-validator.js              # ← DELIVER
│   └── tagteam-integration/
│       ├── semantic-action.test.js           # ← DELIVER
│       ├── value-matching.test.js            # ← DELIVER
│       ├── context-intensity.test.js         # ← DELIVER
│       └── negation-detection.test.js        # ← DELIVER
├── docs/
│   ├── TAGTEAM_INTEGRATION_REQUIREMENTS.md   # ← DELIVER (already created)
│   └── TAGTEAM_TESTING_HANDOFF.md            # ← DELIVER (this file)
└── TEST_SCENARIOS.md                          # ← DELIVER (reference)
```

### Total Deliverables

**Files**: 10
**Total Size**: ~500KB (mostly JSON test data)
**Format**: JSON + JavaScript + Markdown
**Delivery Method**: Git repository (public or private)

---

## Contact & Support

**IEE Testing Lead**: Ready to answer questions about test corpus, validate TagTeam outputs, and provide rapid feedback

**Response Time**:
- Critical bugs: <24 hours
- Test corpus updates: <48 hours
- General questions: <72 hours

**Preferred Communication**:
- Async: GitHub Issues, email
- Sync: Weekly video call (1 hour)
- Urgent: Discord/Slack DM

---

## Conclusion

**Quality synchronization = shared understanding of success**

By providing:
1. Concrete test scenarios with expected outputs
2. Automated validation tools
3. Clear success metrics
4. Rapid feedback loops

We ensure TagTeam builds exactly what IEE needs, and IEE can validate that TagTeam meets requirements.

**Timeline**: Deliver core artifacts (corpus + validator) by end of Week 1, full test suite by end of Week 2.

**Success**: TagTeam passes 75%+ of test scenarios, maintains determinism, and completes parsing in <50ms.
