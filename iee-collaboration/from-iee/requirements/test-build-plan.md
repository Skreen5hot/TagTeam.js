# TagTeam Test Fixtures & Integration - Iterative Build Plan

**Project**: Integral Ethics Engine (IEE)
**Goal**: Build testing framework for TagTeam integration
**Timeline**: 3 phases over 2-3 weeks
**Status**: Planning → Implementation

---

## Overview

This plan breaks down the test framework construction into **small, deliverable increments**. Each iteration produces a working artifact that can be validated independently.

**Guiding Principles**:
1. ✅ **Start simple, iterate** - Get basic versions working first
2. ✅ **Validate early** - Test each artifact as it's built
3. ✅ **Deliver incrementally** - TagTeam gets usable artifacts quickly
4. ✅ **Automate progressively** - Manual → semi-automated → fully automated

---

## Phase 1: Foundation (Week 1)

### Iteration 1.1: Setup Test Infrastructure (Day 1)

**Goal**: Get test framework installed and running

**Tasks**:
```bash
# 1. Install Vitest
npm install --save-dev vitest

# 2. Update package.json
# Add test scripts

# 3. Create directory structure
mkdir -p tests/{unit,integration,tagteam-integration,fixtures,helpers}

# 4. Create placeholder test file
touch tests/unit/placeholder.test.js
```

**Deliverable**: `package.json` with test scripts, empty directory structure

**Validation**:
```bash
npm run test  # Should run (even if no tests)
```

**Time**: 30 minutes

---

### Iteration 1.2: Extract Base Scenarios (Day 1-2)

**Goal**: Get first 5 scenarios from TEST_SCENARIOS.md into structured format

**Tasks**:

**Step 1**: Create extraction script
```javascript
// scripts/extract-scenarios.js
import { readFileSync, writeFileSync } from 'fs';

const content = readFileSync('TEST_SCENARIOS.md', 'utf-8');

// Manual extraction for now (we'll parse markdown later)
const scenarios = [
  {
    id: 'healthcare-001',
    domain: 'healthcare',
    title: 'End of Life Decision',
    description: `A 78-year-old patient with terminal cancer is on life support with no chance of recovery. The family must decide whether to continue aggressive treatment or transition to comfort care. The patient left no advance directive, but had previously mentioned preferring quality of life over prolonged suffering.`,
    source: 'TEST_SCENARIOS.md',
    sourceSection: 'Healthcare Domain'
  }
  // Manually add 4 more
];

const corpus = {
  version: '0.1.0',
  lastUpdated: new Date().toISOString(),
  totalScenarios: scenarios.length,
  scenarios
};

writeFileSync(
  'tests/fixtures/tagteam-test-corpus.json',
  JSON.stringify(corpus, null, 2)
);

console.log(`✓ Extracted ${scenarios.length} scenarios`);
```

**Step 2**: Run extraction
```bash
node scripts/extract-scenarios.js
```

**Step 3**: Manual review
- Read generated JSON
- Verify descriptions are complete
- Check formatting

**Deliverable**: `tests/fixtures/tagteam-test-corpus.json` with 5 base scenarios (no annotations yet)

**Validation**:
```bash
cat tests/fixtures/tagteam-test-corpus.json | jq '.scenarios | length'
# Should output: 5
```

**Time**: 2 hours

---

### Iteration 1.3: Annotate First Scenario (Day 2)

**Goal**: Fully annotate ONE scenario with all expected outputs

**Tasks**:

**Step 1**: Manually analyze scenario
- Read healthcare-001 description
- Identify agent, action, patient manually
- Determine context flags manually
- List relevant values manually

**Step 2**: Add annotation structure
```javascript
{
  id: 'healthcare-001',
  domain: 'healthcare',
  title: 'End of Life Decision',
  description: '...',

  // NEW: Manual annotations
  expectedParse: {
    agent: {
      text: 'The family',
      role: 'agent',
      entity: 'family',
      posTag: 'NP'
    },
    action: {
      verb: 'decide',
      lemma: 'decide',
      tense: 'present',
      aspect: 'simple',
      modality: 'must',
      negation: false
    },
    patient: {
      text: 'whether to continue aggressive treatment or transition to comfort care',
      role: 'theme',
      entity: 'treatment'
    },
    semanticFrame: 'decision_making',
    confidence: 0.85
  },

  expectedContext: {
    physicalImpact: {
      present: true,
      intensity: 0.95,
      evidence: ['terminal cancer', 'life support', 'no chance of recovery'],
      polarity: 'negative'
    },
    emotionalImpact: {
      present: true,
      intensity: 0.75,
      evidence: ['family must decide', 'prolonged suffering'],
      emotions: ['grief', 'anxiety']
    },
    moralConflict: {
      present: true,
      intensity: 0.85,
      evidence: ['continue aggressive treatment or transition to comfort care'],
      conflictType: 'value'
    },
    autonomyStake: {
      present: true,
      intensity: 0.70,
      evidence: ['patient left no advance directive', 'family must decide'],
      whose: ['patient', 'family']
    }
  },

  expectedValues: [
    {
      value: 'physical_wellbeing',
      worldview: 'Materialism',
      expectedRelevance: true,
      expectedSalience: 'high',
      expectedConfidence: 0.90,
      reasoning: 'Terminal cancer, life support, suffering all directly engage physical wellbeing'
    },
    {
      value: 'individual_uniqueness',
      worldview: 'Monadism',
      expectedRelevance: true,
      expectedSalience: 'high',
      expectedConfidence: 0.85,
      reasoning: 'Patient as unique individual with prior preferences'
    },
    {
      value: 'aesthetic_beauty',
      worldview: 'Sensationalism',
      expectedRelevance: false,
      expectedSalience: 'low',
      expectedConfidence: 0.95,
      reasoning: 'No aesthetic or artistic concepts in scenario'
    }
  ],

  testCases: [
    {
      type: 'negation_detection',
      text: 'no chance of recovery',
      expectedNegation: true,
      scope: 'context'
    },
    {
      type: 'agent_identification',
      expectedAgent: 'family',
      notAgent: 'patient'
    }
  ]
}
```

**Deliverable**: Fully annotated healthcare-001 scenario

**Validation**:
- Peer review annotations
- Check against current IEE parser output
- Verify completeness

**Time**: 3 hours

---

### Iteration 1.4: Run Current Parser Against First Scenario (Day 2-3)

**Goal**: Baseline IEE's current performance on annotated scenario

**Tasks**:

**Step 1**: Create baseline test
```javascript
// tests/helpers/baseline-test.js
import { parseScenario } from '../../src/concepts/scenarioParser.js';
import corpus from '../fixtures/tagteam-test-corpus.json' assert { type: 'json' };

const scenario = corpus.scenarios[0]; // healthcare-001

console.log('=== Baseline Test: healthcare-001 ===\n');

const result = parseScenario({
  description: scenario.description,
  domain: scenario.domain,
  context: {}
});

console.log('Current Parser Output:');
console.log(JSON.stringify(result, null, 2));

console.log('\n=== Comparison to Expected ===\n');

console.log('Expected Agent:', scenario.expectedParse.agent.entity);
console.log('Extracted Action:', result.action);
console.log('Match?', result.action.includes('decide') ? '✓' : '✗');

console.log('\nExpected Context physicalImpact:', scenario.expectedContext.physicalImpact.intensity);
console.log('Current Context physicalImpact:', result.context?.physicalImpact ? 'true' : 'false');
```

**Step 2**: Run baseline
```bash
node tests/helpers/baseline-test.js
```

**Step 3**: Document gaps
Create `tests/fixtures/baseline-gaps.md`:
```markdown
# Baseline Performance Gaps

## Scenario: healthcare-001

### What Works ✓
- Context flag detection (physicalImpact = true)
- Agent identification (found 'family')

### What Doesn't Work ✗
- Action extraction (got "cancer is on life support..." instead of "decide")
- No negation detection ("no chance of recovery" not flagged)
- Context intensity missing (binary flags only)
- Agent role not distinguished (agent vs patient vs instrument)

### Priority Improvements for TagTeam
1. Semantic role labeling (agent/action/patient)
2. Negation detection
3. Context intensity scoring
```

**Deliverable**: Baseline performance document

**Validation**: Manual review of gaps

**Time**: 2 hours

---

### Iteration 1.5: Create Simple Validator (Day 3)

**Goal**: Basic pass/fail validation for semantic action parsing

**Tasks**:

**Step 1**: Create minimal validator
```javascript
// tests/helpers/simple-validator.js
import corpus from '../fixtures/tagteam-test-corpus.json' assert { type: 'json' };

export function validateSemanticAction(actual, expected) {
  const results = {
    agentCorrect: false,
    actionCorrect: false,
    patientCorrect: false,
    negationCorrect: false,
    semanticFrameCorrect: false,
    score: 0
  };

  // Agent check
  if (actual.agent?.entity === expected.agent.entity) {
    results.agentCorrect = true;
    results.score += 20;
  }

  // Action check
  if (actual.action?.verb === expected.action.verb) {
    results.actionCorrect = true;
    results.score += 20;
  }

  // Patient check
  if (actual.patient?.entity === expected.patient?.entity) {
    results.patientCorrect = true;
    results.score += 20;
  }

  // Negation check
  if (actual.action?.negation === expected.action.negation) {
    results.negationCorrect = true;
    results.score += 20;
  }

  // Semantic frame check
  if (actual.semanticFrame === expected.semanticFrame) {
    results.semanticFrameCorrect = true;
    results.score += 20;
  }

  results.passed = results.score >= 80; // 80% threshold

  return results;
}

// Test the validator
if (import.meta.url === `file://${process.argv[1]}`) {
  const scenario = corpus.scenarios[0];

  // Simulate TagTeam output (manually for now)
  const mockTagTeamOutput = {
    agent: { entity: 'family' },
    action: { verb: 'decide', negation: false },
    patient: { entity: 'treatment' },
    semanticFrame: 'decision_making'
  };

  const result = validateSemanticAction(mockTagTeamOutput, scenario.expectedParse);

  console.log('=== Validator Test ===');
  console.log('Score:', result.score, '/ 100');
  console.log('Passed:', result.passed ? '✓' : '✗');
  console.log('\nDetails:');
  console.log('  Agent:', result.agentCorrect ? '✓' : '✗');
  console.log('  Action:', result.actionCorrect ? '✓' : '✗');
  console.log('  Patient:', result.patientCorrect ? '✓' : '✗');
  console.log('  Negation:', result.negationCorrect ? '✓' : '✗');
  console.log('  Frame:', result.semanticFrameCorrect ? '✓' : '✗');
}
```

**Step 2**: Test validator
```bash
node tests/helpers/simple-validator.js
```

**Deliverable**: Working validator for semantic action parsing

**Validation**: Run with mock data, verify scoring logic

**Time**: 2 hours

---

### Phase 1 Deliverables Summary

**End of Week 1, you will have**:

✅ **Test infrastructure** - Vitest installed, directories created
✅ **5 base scenarios** - Extracted from TEST_SCENARIOS.md
✅ **1 fully annotated scenario** - healthcare-001 with all expected outputs
✅ **Baseline performance doc** - Current IEE parser gaps documented
✅ **Simple validator** - Basic pass/fail for semantic action parsing

**Ready to share with TagTeam**:
- Test corpus (5 scenarios, 1 fully annotated)
- Validator script (basic version)
- Baseline gaps document

---

## Phase 2: Expansion (Week 2)

### Iteration 2.1: Annotate Remaining 4 Scenarios (Day 4-5)

**Goal**: Complete annotations for all 5 base scenarios

**Tasks**:

**Step 1**: Annotate in batches
- Day 4 AM: Spiritual scenario (leaving faith)
- Day 4 PM: Vocational scenario (unethical work)
- Day 5 AM: Environmental scenario (mining vs wilderness)
- Day 5 PM: Interpersonal scenario (truth vs kindness)

**Step 2**: Use template from healthcare-001
- Copy structure
- Fill in scenario-specific values
- Adjust context intensities

**Step 3**: Validate each annotation
- Peer review
- Check against IEE output
- Test with validator

**Deliverable**: 5 fully annotated scenarios

**Validation**: All 5 pass basic structure checks

**Time**: 8 hours (2 hours per scenario)

---

### Iteration 2.2: Extract Value Definitions (Day 5-6)

**Goal**: Create value definitions JSON from worldviewManager.js

**Tasks**:

**Step 1**: Create extraction script
```javascript
// scripts/extract-value-definitions.js
import { worldviewManager } from '../src/concepts/worldviewManager.js';

// Initialize worldview manager to get value hierarchies
// (May need to call initialization methods)

const definitions = [];

// For each worldview
const worldviewNames = [
  'Materialism', 'Sensationalism', 'Phenomenalism', 'Realism',
  'Dynamism', 'Monadism', 'Idealism', 'Rationalism',
  'Psychism', 'Pneumatism', 'Spiritualism', 'Mathematism'
];

worldviewNames.forEach(worldview => {
  const values = worldviewManager.state.valueHierarchies[worldview];

  if (values) {
    // Extract terminal values
    values.terminal?.forEach(value => {
      definitions.push({
        value,
        worldview,
        type: 'terminal',
        domain: inferDomain(value, worldview),
        relatedConcepts: [], // TO BE FILLED MANUALLY
        semanticField: inferSemanticField(worldview),
        definition: '', // TO BE FILLED MANUALLY
        exampleContexts: [] // TO BE FILLED MANUALLY
      });
    });
  }
});

function inferDomain(value, worldview) {
  if (value.includes('physical') || value.includes('health')) return 'physical';
  if (value.includes('truth') || value.includes('knowledge')) return 'epistemic';
  if (value.includes('experience')) return 'experiential';
  if (value.includes('spiritual') || value.includes('sacred')) return 'spiritual';
  return 'unknown';
}

function inferSemanticField(worldview) {
  const fields = {
    'Materialism': 'medical',
    'Sensationalism': 'aesthetic',
    'Phenomenalism': 'phenomenological',
    'Realism': 'scientific',
    'Dynamism': 'energetic',
    'Monadism': 'individualistic',
    'Idealism': 'conceptual',
    'Rationalism': 'logical',
    'Psychism': 'psychological',
    'Pneumatism': 'spiritual',
    'Spiritualism': 'religious',
    'Mathematism': 'mathematical'
  };
  return fields[worldview] || 'unknown';
}

const output = {
  version: '0.1.0',
  lastUpdated: new Date().toISOString(),
  worldviews: worldviewNames.length,
  totalValues: definitions.length,
  definitions
};

writeFileSync(
  'tests/fixtures/iee-value-definitions.json',
  JSON.stringify(output, null, 2)
);

console.log(`✓ Extracted ${definitions.length} value definitions`);
console.log('⚠ Manual annotation required for:');
console.log('  - relatedConcepts');
console.log('  - definition text');
console.log('  - exampleContexts');
```

**Step 2**: Run extraction
```bash
node scripts/extract-value-definitions.js
```

**Step 3**: Manual annotation (focus on top 10 values)
Start with most common values:
- physical_wellbeing
- empirical_truth
- lived_experience
- individual_uniqueness
- objective_truth
- etc.

Add:
- relatedConcepts from moralReasoner.js patterns
- definition from worldviewManager reasoning strings
- exampleContexts from test scenarios

**Deliverable**: `tests/fixtures/iee-value-definitions.json` with 10+ annotated values

**Validation**: Spot-check annotations, verify JSON structure

**Time**: 6 hours

---

### Iteration 2.3: Expand Test Corpus (Day 6-7)

**Goal**: Add 15 more scenarios (total 20)

**Tasks**:

**Step 1**: Extract from TEST_SCENARIOS.md
- 2 more healthcare
- 2 more spiritual
- 2 more vocational
- 2 more environmental
- 2 more interpersonal
- 2 education
- 2 political
- 1 technological

**Step 2**: Basic annotations only (not full)
For these 15, only annotate:
- expectedParse (agent/action/patient - basic)
- expectedContext (present/not present - boolean)
- expectedValues (3-5 key values only)

Skip detailed annotations (intensity scores, test cases) for now.

**Deliverable**: Test corpus with 20 scenarios (5 fully annotated, 15 basic)

**Validation**: All 20 have valid structure

**Time**: 6 hours

---

### Iteration 2.4: Create First Integration Test (Day 7)

**Goal**: Write actual Vitest test for semantic action parsing

**Tasks**:

**Step 1**: Create test file
```javascript
// tests/tagteam-integration/semantic-action.test.js
import { describe, it, expect } from 'vitest';
import corpus from '../fixtures/tagteam-test-corpus.json' assert { type: 'json' };

// This will be TagTeam's export (mocked for now)
// import { parseSemanticAction } from 'tagteam-iee';

// Mock function until TagTeam delivers
function parseSemanticAction(description) {
  // Placeholder that always fails (shows what we're testing for)
  return {
    agent: { entity: 'unknown' },
    action: { verb: 'unknown', negation: false },
    patient: { entity: 'unknown' },
    semanticFrame: 'unknown',
    confidence: 0
  };
}

describe('TagTeam Integration: Semantic Action Parsing', () => {
  // Test only the 5 fully annotated scenarios
  const fullyAnnotated = corpus.scenarios.slice(0, 5);

  fullyAnnotated.forEach(scenario => {
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
});
```

**Step 2**: Run test (will fail - expected)
```bash
npm run test:tagteam
```

**Step 3**: Verify test structure
- Tests are discoverable
- Assertions are clear
- Output is readable

**Deliverable**: First integration test file (fails with mock)

**Validation**: Test runs, produces clear failure output

**Time**: 2 hours

---

### Phase 2 Deliverables Summary

**End of Week 2, you will have**:

✅ **20 scenarios** - 5 fully annotated, 15 with basic annotations
✅ **Value definitions** - 10+ values with relatedConcepts and examples
✅ **Integration test** - Semantic action parsing test (ready for TagTeam)
✅ **Expanded validator** - Updated for more scenarios

**Ready to share with TagTeam**:
- Full test corpus (20 scenarios)
- Value definitions (10+ annotated)
- Integration test file
- Updated validator

---

## Phase 3: Refinement (Week 3)

### Iteration 3.1: Complete Value Definitions (Day 8-9)

**Goal**: Finish all 120 value definitions

**Tasks**:

**Step 1**: Batch annotation (30 values per session)
- Session 1: Material-Empirical cluster (30 values)
- Session 2: Process-Individual cluster (30 values)
- Session 3: Depth-Ideal cluster (30 values)
- Session 4: Spiritual cluster (30 values)

**Step 2**: Use patterns from moralReasoner.js
Extract keyword patterns from lines 44, 52, 60, etc. in moralReasoner.js:
```javascript
// Example: physical_wellbeing keywords from line 44
relatedConcepts: [
  'harm', 'health', 'pain', 'suffer', 'dying', 'terminal',
  'cancer', 'treatment', 'medical', 'life support'
]
```

**Step 3**: Add definitions from worldviewManager.js
Extract reasoning strings (e.g., line 39):
```javascript
definition: 'Materialism grounds value in physical reality. What exists is matter and its properties. Wellbeing reduces to physical states.'
```

**Deliverable**: Complete `iee-value-definitions.json` with 120 values

**Validation**: All values have relatedConcepts and definitions

**Time**: 8 hours

---

### Iteration 3.2: Add More Integration Tests (Day 9-10)

**Goal**: Create tests for other integration points

**Tasks**:

**Step 1**: Value matching test
```javascript
// tests/tagteam-integration/value-matching.test.js
import { describe, it, expect } from 'vitest';
import { computeSemanticRelevance } from 'tagteam-iee'; // Mock for now
import corpus from '../fixtures/tagteam-test-corpus.json';
import valueDefs from '../fixtures/iee-value-definitions.json';

describe('TagTeam Integration: Value Matching', () => {
  corpus.scenarios.slice(0, 5).forEach(scenario => {
    describe(`Scenario: ${scenario.id}`, () => {
      scenario.expectedValues.forEach(expectedValue => {
        it(`should correctly evaluate ${expectedValue.value}`, () => {
          const valueDef = valueDefs.definitions.find(
            d => d.value === expectedValue.value
          );

          const result = computeSemanticRelevance(
            scenario, // parsed scenario
            expectedValue.value,
            valueDef
          );

          expect(result.relevant).toBe(expectedValue.expectedRelevance);

          if (expectedValue.expectedRelevance) {
            expect(result.salience).toBe(expectedValue.expectedSalience);
            expect(result.confidence).toBeGreaterThanOrEqual(0.75);
          }
        });
      });
    });
  });
});
```

**Step 2**: Context intensity test
```javascript
// tests/tagteam-integration/context-intensity.test.js
// Similar structure, test context intensity scoring
```

**Step 3**: Negation detection test
```javascript
// tests/tagteam-integration/negation-detection.test.js
// Focus on test cases with negation
```

**Deliverable**: 4 complete integration test files

**Validation**: All tests run, produce clear output

**Time**: 6 hours

---

### Iteration 3.3: Expand to 50 Scenarios (Day 10-11)

**Goal**: Reach full 50-scenario corpus

**Tasks**:

**Step 1**: Extract 30 more from TEST_SCENARIOS.md
Distribute across domains:
- 5 healthcare
- 5 spiritual
- 5 vocational
- 5 environmental
- 5 interpersonal
- 3 education
- 2 political

**Step 2**: Basic annotations for all 30
- agent/action/patient
- key context flags
- 2-3 expected values

**Step 3**: Fully annotate 5 more (total 10 fully annotated)
Select diverse scenarios:
- 1 with complex negation
- 1 with ambiguous agents
- 1 with multiple actions
- 1 with trade-offs
- 1 with moral dilemma

**Deliverable**: 50-scenario corpus (10 fully annotated, 40 basic)

**Validation**: All scenarios have valid structure

**Time**: 8 hours

---

### Iteration 3.4: Build Full Validator (Day 11-12)

**Goal**: Complete automated validation script

**Tasks**:

**Step 1**: Expand simple-validator.js
```javascript
// tests/helpers/tagteam-validator.js
import { validateSemanticAction } from './simple-validator.js';

export function validateContextIntensity(actual, expected) {
  const tolerance = 0.15;
  const results = {};

  Object.keys(expected).forEach(contextType => {
    if (expected[contextType].present) {
      results[contextType] = {
        presentCorrect: actual[contextType]?.present === true,
        intensityAccurate: Math.abs(
          actual[contextType]?.intensity - expected[contextType].intensity
        ) < tolerance
      };
    }
  });

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r =>
    r.presentCorrect && r.intensityAccurate
  ).length;

  return {
    score: (passed / total) * 100,
    passed: passed >= total * 0.8,
    details: results
  };
}

export function validateValueRelevance(actual, expected) {
  // Check each expected value
  const results = expected.map(exp => {
    const act = actual.find(a => a.value === exp.value);

    return {
      value: exp.value,
      relevanceCorrect: act?.relevant === exp.expectedRelevance,
      salienceCorrect: act?.salience === exp.expectedSalience,
      confidenceAdequate: act?.confidence >= 0.75
    };
  });

  const total = results.length;
  const passed = results.filter(r =>
    r.relevanceCorrect && r.salienceCorrect && r.confidenceAdequate
  ).length;

  return {
    score: (passed / total) * 100,
    passed: passed >= total * 0.75,
    details: results
  };
}

export function runFullValidation(tagteamOutput, corpus) {
  const results = corpus.scenarios.map(scenario => {
    const output = tagteamOutput.find(o => o.id === scenario.id);

    if (!output) {
      return {
        id: scenario.id,
        status: 'ERROR',
        error: 'No output found'
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

    const overallPassed =
      actionValidation.passed &&
      contextValidation.passed &&
      valueValidation.passed;

    return {
      id: scenario.id,
      status: overallPassed ? 'PASS' : 'FAIL',
      actionValidation,
      contextValidation,
      valueValidation
    };
  });

  return {
    totalScenarios: results.length,
    passed: results.filter(r => r.status === 'PASS').length,
    failed: results.filter(r => r.status === 'FAIL').length,
    errors: results.filter(r => r.status === 'ERROR').length,
    accuracy: results.filter(r => r.status === 'PASS').length / results.length,
    results
  };
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const tagteamOutputFile = process.argv[2];
  const corpusFile = process.argv[3] || 'tests/fixtures/tagteam-test-corpus.json';

  const tagteamOutput = JSON.parse(readFileSync(tagteamOutputFile));
  const corpus = JSON.parse(readFileSync(corpusFile));

  const results = runFullValidation(tagteamOutput, corpus);

  console.log('\n=== TagTeam Validation Results ===\n');
  console.log(`Total: ${results.totalScenarios}`);
  console.log(`Passed: ${results.passed} (${(results.accuracy * 100).toFixed(1)}%)`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Errors: ${results.errors}`);
  console.log(`\nTarget: 75% accuracy`);
  console.log(`Status: ${results.accuracy >= 0.75 ? '✅ PASS' : '❌ FAIL'}`);

  if (results.failed > 0) {
    console.log('\n=== Failures ===\n');
    results.results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`\n${r.id}:`);
        console.log(`  Action: ${r.actionValidation.score}/100`);
        console.log(`  Context: ${r.contextValidation.score}/100`);
        console.log(`  Values: ${r.valueValidation.score}/100`);
      });
  }

  process.exit(results.accuracy >= 0.75 ? 0 : 1);
}
```

**Step 2**: Test with mock data
Create mock TagTeam output file to test validator

**Step 3**: Document usage
Add README in tests/helpers/

**Deliverable**: Complete validation script

**Validation**: Runs successfully, produces clear reports

**Time**: 6 hours

---

### Iteration 3.5: Create Sample Outputs (Day 12)

**Goal**: Generate sample outputs from current IEE parser

**Tasks**:

**Step 1**: Run current parser on all scenarios
```javascript
// scripts/generate-baseline-outputs.js
import { parseScenario } from '../src/concepts/scenarioParser.js';
import corpus from '../tests/fixtures/tagteam-test-corpus.json' assert { type: 'json' };

const outputs = corpus.scenarios.map(scenario => {
  const result = parseScenario({
    description: scenario.description,
    domain: scenario.domain,
    context: {}
  });

  return {
    id: scenario.id,
    title: scenario.title,
    currentParserOutput: result,
    expectedOutput: scenario.expectedParse,
    gaps: identifyGaps(result, scenario.expectedParse)
  };
});

function identifyGaps(actual, expected) {
  const gaps = [];

  if (!actual.action.includes(expected.action.verb)) {
    gaps.push('Action verb not correctly identified');
  }

  if (actual.agents?.find(a => a.role === expected.agent.entity)) {
    // Agent found but not distinguished
    gaps.push('Agent not distinguished from other participants');
  }

  // ... more gap detection

  return gaps;
}

const output = {
  version: 'baseline',
  parser: 'scenarioParser.js (keyword-based)',
  generatedAt: new Date().toISOString(),
  samples: outputs
};

writeFileSync(
  'tests/fixtures/iee-sample-outputs.json',
  JSON.stringify(output, null, 2)
);

console.log(`✓ Generated baseline outputs for ${outputs.length} scenarios`);
```

**Step 2**: Review outputs
Identify common patterns in failures

**Deliverable**: `iee-sample-outputs.json` with baseline performance

**Validation**: Spot-check outputs against manual review

**Time**: 2 hours

---

### Phase 3 Deliverables Summary

**End of Week 3, you will have**:

✅ **50 scenarios** - 10 fully annotated, 40 with basic annotations
✅ **120 value definitions** - Complete with relatedConcepts, definitions, examples
✅ **4 integration tests** - Semantic action, value matching, context, negation
✅ **Full validator** - Automated validation with detailed reporting
✅ **Baseline outputs** - Current IEE performance documented

**Ready to ship to TagTeam**:
- Complete test corpus (50 scenarios)
- Complete value definitions (120 values)
- Full integration test suite (4 test files)
- Automated validator
- Baseline performance data
- Requirements document (already done)
- Testing handoff document (already done)

---

## Summary Timeline

### Week 1 (Foundation)
- **Day 1**: Setup infrastructure + extract 5 scenarios (0.5 + 2 = 2.5 hours)
- **Day 2**: Annotate first scenario + baseline test (3 + 2 = 5 hours)
- **Day 3**: Simple validator (2 hours)
- **Total**: ~9.5 hours

### Week 2 (Expansion)
- **Day 4-5**: Annotate 4 more scenarios (8 hours)
- **Day 5-6**: Extract value definitions (6 hours)
- **Day 6-7**: Expand corpus to 20 + first test (6 + 2 = 8 hours)
- **Total**: ~22 hours

### Week 3 (Refinement)
- **Day 8-9**: Complete value definitions (8 hours)
- **Day 9-10**: More integration tests (6 hours)
- **Day 10-11**: Expand to 50 scenarios (8 hours)
- **Day 11-12**: Full validator + sample outputs (6 + 2 = 8 hours)
- **Total**: ~30 hours

**Grand Total**: ~61.5 hours over 3 weeks

**Realistic Schedule**: ~3-4 hours per day = 3 weeks calendar time

---

## Validation Checkpoints

### After Phase 1 (Week 1):
- [ ] Vitest runs successfully
- [ ] 5 scenarios extracted
- [ ] 1 scenario fully annotated
- [ ] Baseline gaps documented
- [ ] Simple validator works

### After Phase 2 (Week 2):
- [ ] 20 scenarios in corpus
- [ ] 5 fully annotated
- [ ] 10+ value definitions complete
- [ ] First integration test runs
- [ ] Validator handles multiple scenarios

### After Phase 3 (Week 3):
- [ ] 50 scenarios complete
- [ ] 10 fully annotated
- [ ] 120 value definitions complete
- [ ] 4 integration tests running
- [ ] Full validator produces reports
- [ ] Baseline outputs documented

---

## Handoff to TagTeam

### Week 1 Deliverable Package:
```
tagteam-handoff-week1.zip
├── tests/fixtures/
│   └── tagteam-test-corpus.json (5 scenarios, 1 annotated)
├── tests/helpers/
│   ├── simple-validator.js
│   └── baseline-gaps.md
└── docs/
    ├── TAGTEAM_INTEGRATION_REQUIREMENTS.md
    └── TAGTEAM_TESTING_HANDOFF.md
```

### Week 2 Deliverable Package:
```
tagteam-handoff-week2.zip
├── tests/fixtures/
│   ├── tagteam-test-corpus.json (20 scenarios, 5 annotated)
│   └── iee-value-definitions.json (10+ values)
├── tests/tagteam-integration/
│   └── semantic-action.test.js
└── tests/helpers/
    └── simple-validator.js (updated)
```

### Week 3 Final Package:
```
tagteam-handoff-final.zip
├── tests/fixtures/
│   ├── tagteam-test-corpus.json (50 scenarios, 10 annotated)
│   ├── iee-value-definitions.json (120 values)
│   └── iee-sample-outputs.json
├── tests/tagteam-integration/
│   ├── semantic-action.test.js
│   ├── value-matching.test.js
│   ├── context-intensity.test.js
│   └── negation-detection.test.js
├── tests/helpers/
│   ├── tagteam-validator.js (complete)
│   └── README.md
└── docs/
    ├── TAGTEAM_INTEGRATION_REQUIREMENTS.md
    ├── TAGTEAM_TESTING_HANDOFF.md
    └── TAGTEAM_TEST_BUILD_PLAN.md (this file)
```

---

## Next Steps

### Immediate (Today):
1. Review this plan
2. Approve timeline and scope
3. Schedule Phase 1 work

### This Week (Phase 1):
1. Install Vitest
2. Extract first 5 scenarios
3. Annotate healthcare-001 scenario
4. Run baseline test
5. Build simple validator

### Communication with TagTeam:
- Share this plan
- Get feedback on timeline
- Coordinate weekly delivery schedule
- Establish validation protocol

---

## Success Criteria

**Phase 1 Complete** = TagTeam can start development with clear targets
**Phase 2 Complete** = TagTeam has enough data to validate their work
**Phase 3 Complete** = Fully automated testing pipeline ready for integration

**Final Validation**: TagTeam delivers output that passes 75%+ of validation suite
