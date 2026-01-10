# TagTeam.js Integration Requirements for IEE

**Project**: Integral Ethics Engine (IEE)
**Integration Target**: TagTeam.js Deterministic Semantic Parser
**Date**: 2026-01-05
**Purpose**: Define requirements for TagTeam.js to serve as semantic understanding layer for IEE's moral reasoning engine

---

## Executive Summary

The Integral Ethics Engine (IEE) currently uses **keyword-based pattern matching** to connect natural language ethical scenarios to worldview values. This approach has fundamental limitations that TagTeam.js's deterministic semantic understanding can solve.

**Integration Goal**: Replace brittle regex patterns with compositional semantic understanding while maintaining determinism, speed, and zero external dependencies.

---

## Current IEE Architecture

### Component Overview

```
User Input (Natural Language Scenario)
         ↓
┌────────────────────────────────────────┐
│  scenarioParser.js                     │
│  - Keyword detection                   │
│  - Context flag extraction             │
│  - Agent/artifact identification       │
└────────────┬───────────────────────────┘
             ↓
    Structured Scenario
    {
      action: "family must decide...",
      context: { physicalImpact: true, ... },
      agents: [{ role: 'patient' }, ...],
      artifacts: [{ type: 'life' }]
    }
             ↓
┌────────────────────────────────────────┐
│  moralReasoner.js                      │
│  - Value matching (pattern-based)     │
│  - Confidence calculation              │
│  - Reasoning generation                │
└────────────┬───────────────────────────┘
             ↓
    Worldview Evaluations
    [
      {
        worldview: 'Materialism',
        judgment: 'uncertain',
        confidence: 0.5,
        reasoning: "From Materialism...",
        values: ['physical_wellbeing', ...]
      },
      ... (12 worldviews)
    ]
```

### Current Pain Points

**File**: [src/concepts/scenarioParser.js](src/concepts/scenarioParser.js) (634 lines)

**Problem 1: Action Extraction is Simplistic**
```javascript
// Current approach (line 119-160)
function extractAction(description) {
  const sentences = description.split(/[.!?]+/);

  // Looks for action verbs like "harm", "decide", "leave"
  for (const verb of ACTION_VERBS) {
    if (lowerDesc.includes(verb)) {
      return /* sentence containing verb */;
    }
  }

  // Fallback: return first sentence
  return sentences[0];
}
```

**Limitations**:
- ❌ Can't distinguish agent vs patient ("dog bites man" vs "man bites dog")
- ❌ No negation handling ("decided not to harm" = "decided to harm")
- ❌ Misses semantic relationships (cause, purpose, condition)
- ❌ Returns arbitrary text, not structured action representation

**What TagTeam Should Provide**:
```javascript
// Desired output
{
  agent: { text: 'family', role: 'agent', entity: 'family' },
  action: { verb: 'decide', tense: 'present', modality: 'must' },
  patient: { text: 'treatment', role: 'patient', entity: 'treatment' },
  modifiers: ['aggressive', 'continue'],
  negation: false,
  semanticFrame: 'decision_making'
}
```

---

**File**: [src/concepts/moralReasoner.js](src/concepts/moralReasoner.js) (371 lines)

**Problem 2: Value Matching is Keyword-Dependent**
```javascript
// Current approach (line 41-48)
if (value === 'physical_wellbeing' || value === 'material_security') {
  if (context.physicalImpact ||
      artifacts?.some(a => a.type === 'life' || a.type === 'health') ||
      actionLower.match(/harm|health|pain|suffer|dying|terminal|cancer|treatment|medical|life support/)) {
    matched = true;
    salience = 'high';
  }
}
```

**Limitations**:
- ❌ Requires manual keyword lists for every value (unmaintainable)
- ❌ Misses semantic equivalents ("suffering" = "pain" but no keyword overlap)
- ❌ Can't handle paraphrases ("quality of life" relates to wellbeing)
- ❌ No compositional understanding ("absence of suffering" ≠ "suffering")

**What TagTeam Should Provide**:
```javascript
// Desired semantic query interface
if (semanticQuery(scenario, {
  domain: 'physical',
  concept: 'wellbeing',
  polarity: 'any'  // positive or negative mention
})) {
  matched = true;
  salience = computeSalienceFromSemanticDistance(value, scenario);
}
```

---

**Problem 3: Context Detection is Surface-Level**
```javascript
// Current approach (scenarioParser.js line 211-250)
const CONTEXT_KEYWORDS = {
  physicalImpact: [
    'harm', 'injury', 'pain', 'suffering', 'death', 'dying',
    'terminal', 'cancer', 'treatment', 'medical', 'life support'
  ],
  // ... 15 more context types
};

function detectContext(description, domain) {
  for (const [flag, keywords] of Object.entries(CONTEXT_KEYWORDS)) {
    context[flag] = keywords.some(keyword =>
      lowerDesc.includes(keyword.toLowerCase())
    );
  }
}
```

**Limitations**:
- ❌ Binary flags (true/false) lose nuance
- ❌ No severity/intensity ("minor pain" vs "severe suffering")
- ❌ Can't detect implicit context (cultural references, metaphors)
- ❌ Single keyword triggers flag (high false positive rate)

**What TagTeam Should Provide**:
```javascript
// Desired semantic context representation
{
  domains: [
    { domain: 'physical', confidence: 0.9, evidence: ['cancer', 'treatment', 'life support'] },
    { domain: 'interpersonal', confidence: 0.6, evidence: ['family', 'decide'] }
  ],
  intensity: {
    physicalImpact: 0.95,  // 0-1 scale based on semantic strength
    emotionalImpact: 0.7,
    moralConflict: 0.8
  },
  semanticRoles: {
    agent: 'family',
    patient: 'patient',
    instrument: 'treatment',
    goal: 'comfort care'
  }
}
```

---

## TagTeam Integration Points

### Integration Point 1: Scenario Parsing (High Priority)

**Location**: Replace `extractAction()` in [src/concepts/scenarioParser.js:119-160](src/concepts/scenarioParser.js)

**Current Signature**:
```javascript
function extractAction(description: string): string
```

**Required TagTeam Function**:
```javascript
function parseSemanticAction(description: string): SemanticAction

interface SemanticAction {
  agent: {
    text: string;           // Original text span
    role: 'agent' | 'experiencer' | 'instrument';
    entity: string;         // Normalized entity (e.g., 'family')
    posTag: string;         // POS tag from TagTeam
  };

  action: {
    verb: string;           // Main verb (e.g., 'decide')
    lemma: string;          // Base form (e.g., 'decide' for 'deciding')
    tense: 'present' | 'past' | 'future';
    aspect: 'simple' | 'progressive' | 'perfect';
    modality?: 'must' | 'should' | 'can' | 'may';  // Modal verbs
    negation: boolean;      // Is action negated?
  };

  patient?: {               // Recipient of action (optional)
    text: string;
    role: 'patient' | 'theme' | 'goal';
    entity: string;
  };

  modifiers: Array<{        // Adjectives, adverbs modifying action
    text: string;
    type: 'manner' | 'degree' | 'temporal';
    modifies: 'agent' | 'action' | 'patient';
  }>;

  semanticFrame: string;    // High-level action category
                            // Examples: 'decision_making', 'causing_harm',
                            // 'transferring', 'creating'

  confidence: number;       // 0-1 confidence in parse
}
```

**Example Inputs/Outputs**:

**Input 1**: "A 78-year-old patient with terminal cancer is on life support. The family must decide whether to continue aggressive treatment."

**Output 1**:
```javascript
{
  agent: {
    text: 'The family',
    role: 'agent',
    entity: 'family',
    posTag: 'NP'  // Noun Phrase
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
    text: 'whether to continue aggressive treatment',
    role: 'theme',
    entity: 'treatment'
  },
  modifiers: [
    { text: 'aggressive', type: 'manner', modifies: 'patient' }
  ],
  semanticFrame: 'decision_making',
  confidence: 0.85
}
```

**Input 2**: "I'm considering leaving my faith community after 30 years."

**Output 2**:
```javascript
{
  agent: {
    text: 'I',
    role: 'agent',
    entity: 'self',
    posTag: 'PRP'
  },
  action: {
    verb: 'leave',
    lemma: 'leave',
    tense: 'present',
    aspect: 'progressive',
    modality: null,
    negation: false
  },
  patient: {
    text: 'my faith community',
    role: 'theme',
    entity: 'community'
  },
  modifiers: [
    { text: 'after 30 years', type: 'temporal', modifies: 'action' }
  ],
  semanticFrame: 'abandoning_relationship',
  confidence: 0.90
}
```

**Input 3**: "The company is NOT disclosing safety reports to avoid recalls."

**Output 3**:
```javascript
{
  agent: {
    text: 'The company',
    role: 'agent',
    entity: 'company',
    posTag: 'NP'
  },
  action: {
    verb: 'disclose',
    lemma: 'disclose',
    tense: 'present',
    aspect: 'progressive',
    modality: null,
    negation: true  // ← CRITICAL: Detected negation
  },
  patient: {
    text: 'safety reports',
    role: 'theme',
    entity: 'reports'
  },
  modifiers: [
    { text: 'to avoid recalls', type: 'purpose', modifies: 'action' }
  ],
  semanticFrame: 'concealing_information',
  confidence: 0.88
}
```

---

### Integration Point 2: Semantic Value Matching (High Priority)

**Location**: Replace pattern matching in [src/concepts/moralReasoner.js:27-188](src/concepts/moralReasoner.js)

**Current Approach**: Regex matching + context flags

**Required TagTeam Function**:
```javascript
function computeSemanticRelevance(
  scenario: ParsedScenario,
  value: string,
  valueDefinition: ValueDefinition
): SemanticRelevance

interface ValueDefinition {
  name: string;                    // e.g., 'physical_wellbeing'
  domain: string;                  // e.g., 'physical', 'moral', 'interpersonal'
  relatedConcepts: string[];       // e.g., ['health', 'pain', 'suffering', 'life']
  antonyms?: string[];             // e.g., ['harm', 'injury', 'death']
  semanticField: string;           // e.g., 'medical', 'emotional', 'spiritual'
}

interface SemanticRelevance {
  relevant: boolean;               // Is this value relevant to scenario?
  salience: 'high' | 'medium' | 'low';
  confidence: number;              // 0-1 confidence in relevance
  evidence: Array<{
    source: 'action' | 'agent' | 'patient' | 'context';
    text: string;                  // Text span that matched
    semanticDistance: number;      // 0-1 (0 = exact match, 1 = distant)
  }>;
  explanation: string;             // Why this value is relevant
}
```

**Example**:

**Scenario**: Parsed action from above (family deciding on treatment)

**Value**: `physical_wellbeing`

**Value Definition**:
```javascript
{
  name: 'physical_wellbeing',
  domain: 'physical',
  relatedConcepts: ['health', 'pain', 'suffering', 'life', 'death', 'injury', 'treatment', 'medical'],
  antonyms: ['harm', 'disease', 'illness'],
  semanticField: 'medical'
}
```

**Expected Output**:
```javascript
{
  relevant: true,
  salience: 'high',
  confidence: 0.92,
  evidence: [
    {
      source: 'context',
      text: 'terminal cancer',
      semanticDistance: 0.1  // Very close to 'physical_wellbeing' concepts
    },
    {
      source: 'context',
      text: 'life support',
      semanticDistance: 0.05  // Direct match with 'life'
    },
    {
      source: 'patient',
      text: 'aggressive treatment',
      semanticDistance: 0.2  // 'treatment' is related concept
    }
  ],
  explanation: "Scenario involves life-threatening medical condition and treatment decisions, directly engaging physical wellbeing."
}
```

**Non-Match Example**:

**Value**: `aesthetic_beauty`

**Expected Output**:
```javascript
{
  relevant: false,
  salience: 'low',
  confidence: 0.95,  // High confidence it's NOT relevant
  evidence: [],
  explanation: "No aesthetic or artistic concepts detected in scenario."
}
```

---

### Integration Point 3: Context Intensity Analysis (Medium Priority)

**Location**: Enhance `detectContext()` in [src/concepts/scenarioParser.js:211-250](src/concepts/scenarioParser.js)

**Current Approach**: Binary flags (true/false)

**Required TagTeam Function**:
```javascript
function analyzeContextIntensity(
  parsedScenario: ParsedScenario
): ContextIntensity

interface ContextIntensity {
  physicalImpact: {
    present: boolean;
    intensity: number;         // 0-1 scale
    evidence: string[];        // Text spans supporting this
    polarity: 'positive' | 'negative' | 'mixed';
  };

  emotionalImpact: {
    present: boolean;
    intensity: number;
    evidence: string[];
    emotions: string[];        // e.g., ['fear', 'grief', 'hope']
  };

  moralConflict: {
    present: boolean;
    intensity: number;
    evidence: string[];
    conflictType: 'value' | 'duty' | 'consequence';
  };

  autonomyStake: {
    present: boolean;
    intensity: number;
    evidence: string[];
    whose: string[];           // Whose autonomy? e.g., ['patient', 'family']
  };

  // ... other context dimensions
}
```

**Example**:

**Scenario**: "A 78-year-old patient with terminal cancer is on life support..."

**Expected Output**:
```javascript
{
  physicalImpact: {
    present: true,
    intensity: 0.95,           // Very high (life-threatening)
    evidence: ['terminal cancer', 'life support', 'no chance of recovery'],
    polarity: 'negative'
  },

  emotionalImpact: {
    present: true,
    intensity: 0.75,
    evidence: ['family must decide', 'prolonged suffering'],
    emotions: ['grief', 'anxiety', 'sorrow']
  },

  moralConflict: {
    present: true,
    intensity: 0.85,
    evidence: ['continue aggressive treatment or transition to comfort care'],
    conflictType: 'value'      // Value conflict between prolonging life vs quality
  },

  autonomyStake: {
    present: true,
    intensity: 0.70,
    evidence: ['patient left no advance directive', 'family must decide'],
    whose: ['patient', 'family']
  }
}
```

---

### Integration Point 4: Negation Detection (High Priority)

**Location**: New functionality (not currently supported)

**Current Problem**: "decided NOT to harm" is treated identically to "decided to harm"

**Required TagTeam Function**:
```javascript
function detectNegation(
  parsedAction: SemanticAction,
  fullText: string
): NegationAnalysis

interface NegationAnalysis {
  negated: boolean;              // Is the main action negated?
  scope: 'action' | 'modifier' | 'context';  // What is negated?
  negationWords: string[];       // Words indicating negation
  affectedSpan: {                // What text is negated?
    start: number;
    end: number;
    text: string;
  };
  semanticPolarity: 'positive' | 'negative' | 'neutral';
}
```

**Example 1**: "The family decided NOT to continue aggressive treatment."

**Expected Output**:
```javascript
{
  negated: true,
  scope: 'action',
  negationWords: ['not'],
  affectedSpan: {
    start: 22,
    end: 56,
    text: 'to continue aggressive treatment'
  },
  semanticPolarity: 'negative'   // Negating a harmful action = positive outcome
}
```

**Example 2**: "I will stay in the community without feeling authentic."

**Expected Output**:
```javascript
{
  negated: false,               // Main action (stay) is not negated
  scope: 'modifier',
  negationWords: ['without'],
  affectedSpan: {
    start: 32,
    end: 56,
    text: 'feeling authentic'
  },
  semanticPolarity: 'negative'  // Absence of positive quality
}
```

---

## Technical Requirements

### Performance

- **Speed**: <50ms per scenario parse (comparable to current keyword matching)
- **Memory**: <10MB overhead (client-side deployment)
- **Determinism**: Same input MUST produce same output every time

### Architecture

**Module Structure**:
```
tagteam-iee/
├── src/
│   ├── core/
│   │   ├── pos-tagger.js       # Existing TagTeam POS tagger
│   │   └── lexicon.js           # Existing 297k line lexicon
│   ├── semantic/
│   │   ├── semantic-roles.js    # NEW: Agent/action/patient extraction
│   │   ├── negation-detector.js # NEW: Negation analysis
│   │   ├── context-analyzer.js  # NEW: Context intensity
│   │   └── value-matcher.js     # NEW: Semantic value relevance
│   └── iee-adapter.js           # Adapter layer for IEE integration
├── tests/
│   └── iee-scenarios.test.js    # Test with actual IEE scenarios
└── package.json
```

**Export Interface** (for IEE integration):
```javascript
// iee-adapter.js
export {
  parseSemanticAction,          // Integration Point 1
  computeSemanticRelevance,     // Integration Point 2
  analyzeContextIntensity,      // Integration Point 3
  detectNegation                // Integration Point 4
};
```

### Dependencies

- **Zero new dependencies** (maintains IEE's no-external-deps policy)
- **Builds on existing TagTeam**: POS tagger + lexicon
- **Pure JavaScript**: No TypeScript compilation (or provide compiled .js)

### Browser Compatibility

- **Target**: Modern browsers (ES6+)
- **Bundle size**: <200KB total (including existing TagTeam)
- **No build step required**: Direct import into IEE

---

## Data Formats

### Input Format (from IEE scenarioParser)

TagTeam will receive scenarios as:
```javascript
{
  description: string,    // Original user input (100-500 words typical)
  domain: string,         // Hint: 'healthcare', 'spiritual', 'vocational', etc.
  context: object         // Optional: user-provided context overrides
}
```

### Output Format (to IEE moralReasoner)

TagTeam should produce:
```javascript
{
  semanticAction: SemanticAction,     // Structured action representation
  contextIntensity: ContextIntensity, // Graduated context scores
  negationAnalysis: NegationAnalysis, // Negation detection

  // Compatibility layer (for gradual migration)
  legacy: {
    action: string,        // Simple string (for backward compat)
    context: object,       // Binary flags (for backward compat)
    agents: Array,
    artifacts: Array
  }
}
```

---

## Test Scenarios

TagTeam must successfully parse these IEE test scenarios:

### Scenario 1: Healthcare - End of Life
**Input**:
```
A 78-year-old patient with terminal cancer is on life support with no chance of recovery.
The family must decide whether to continue aggressive treatment or transition to comfort care.
The patient left no advance directive, but had previously mentioned preferring quality of life
over prolonged suffering.
```

**Required Semantic Parse**:
- Agent: family
- Action: decide (modality: must)
- Patient: treatment choice (continue vs transition)
- Context: physicalImpact = 0.95, moralConflict = 0.85
- Negation: "no chance of recovery" (negated possibility)

**Values That Should Match** (with high salience):
- physical_wellbeing (evidence: cancer, life support, suffering)
- individual_uniqueness (evidence: patient's preferences)
- autonomy (evidence: patient's prior wishes, family decision)

---

### Scenario 2: Spiritual - Leaving Faith
**Input**:
```
After 30 years in a conservative religious community, I'm questioning core doctrines and
considering leaving. This would mean losing my entire social network and possibly estrangement
from family. However, staying feels intellectually dishonest and emotionally suffocating.
```

**Required Semantic Parse**:
- Agent: self (I)
- Action: leave (aspect: considering, not committed)
- Patient: faith community
- Context: emotionalImpact = 0.80, moralConflict = 0.75
- Negation: "dishonest" and "suffocating" are negative states

**Values That Should Match**:
- authentic_selfhood (evidence: intellectually dishonest, emotionally suffocating)
- social_belonging (evidence: losing social network, estrangement)
- spiritual_meaning (evidence: religious community, doctrines)

---

### Scenario 3: Vocational - Unethical Work (Negation Test)
**Input**:
```
I've been offered a $300,000/year position at a company whose primary client is developing
weapons systems. The money would eliminate my family's debt and secure our future, but the
work conflicts with my values around peace and non-violence.
```

**Required Semantic Parse**:
- Agent: self (I)
- Action: accept (implied from "offered")
- Patient: job position
- Context: moralConflict = 0.90, financialStakes = 0.85
- Negation: "conflicts with values" (negative alignment)

**Values That Should Match**:
- material_security (evidence: $300,000, eliminate debt)
- moral_integrity (evidence: conflicts with values)
- peace/non_violence (evidence: weapons systems, peace values)

---

### Scenario 4: Environmental - Negation Test
**Input**:
```
Our town can approve a lithium mining operation creating 500 jobs but destroying 50,000 acres
of pristine wilderness. The region has high unemployment but is also home to endangered species.
```

**Required Semantic Parse**:
- Agent: town (collective)
- Action: approve
- Patient: mining operation
- Antithesis: jobs vs wilderness (trade-off structure)
- Context: moralConflict = 0.85, resourceScarcity = 0.70

**Values That Should Match**:
- economic_wellbeing (evidence: 500 jobs, unemployment)
- environmental_preservation (evidence: pristine wilderness, endangered species)

---

## Success Criteria

### Functional Requirements

✅ **Requirement 1**: Parse all 4 test scenarios with >0.80 confidence

✅ **Requirement 2**: Correctly identify agent, action, patient in >90% of IEE scenarios

✅ **Requirement 3**: Detect negation in >85% of negated statements

✅ **Requirement 4**: Match values with >0.75 accuracy vs. manual annotation

✅ **Requirement 5**: Provide semantic relevance scores that correlate >0.70 with human judgments

### Non-Functional Requirements

✅ **Performance**: Average parse time <50ms per scenario

✅ **Determinism**: 100% reproducible results (same input → same output)

✅ **Bundle Size**: <200KB total (gzipped)

✅ **Zero Dependencies**: No npm packages beyond existing TagTeam

✅ **Browser Compatibility**: Works in Chrome, Firefox, Safari, Edge (latest 2 versions)

---

## Integration Plan

### Phase 1: Core Semantic Roles (Week 1)
- Implement `parseSemanticAction()`
- Test with 10 IEE scenarios
- Achieve >0.80 confidence on agent/action/patient extraction

### Phase 2: Value Matching (Week 1-2)
- Implement `computeSemanticRelevance()`
- Build value definition ontology (12 worldviews × ~10 values each)
- Test against manual annotations

### Phase 3: Context & Negation (Week 2)
- Implement `analyzeContextIntensity()`
- Implement `detectNegation()`
- Test edge cases (double negatives, implied negation)

### Phase 4: IEE Integration (Week 3)
- Create adapter layer in IEE
- Gradual migration (run TagTeam + old parser in parallel)
- A/B test outputs, validate improvements
- Switch to TagTeam as primary parser

---

## Open Questions for TagTeam Development

### Question 1: Semantic Frame Classification
**Issue**: IEE scenarios involve diverse action types (decisions, relationships, transactions, creative acts)

**TagTeam Decision Needed**:
- How to classify semantic frames? (Use FrameNet? Custom ontology?)
- Example frames needed: `decision_making`, `causing_harm`, `abandoning_relationship`, `resource_allocation`

**IEE's Preference**: Small, deterministic set of frames (<50 categories) rather than large probabilistic classifier

---

### Question 2: Semantic Distance Metric
**Issue**: Need to quantify "how related" a scenario element is to a value concept

**TagTeam Decision Needed**:
- Use WordNet-style hierarchies? (is-a, part-of)
- Use co-occurrence statistics from lexicon?
- Hand-coded concept networks?

**IEE's Preference**: Deterministic, inspectable metric (no learned embeddings)

---

### Question 3: Value Definition Format
**Issue**: IEE has 120 unique values (12 worldviews × ~10 values each)

**TagTeam Decision Needed**:
- Who defines the value concept lists? (TagTeam or IEE?)
- What format for value definitions?

**IEE's Proposal**:
```javascript
// IEE provides value definitions as JSON
const valueDefinitions = {
  'physical_wellbeing': {
    domain: 'physical',
    relatedConcepts: ['health', 'life', 'pain', 'suffering', ...],
    antonyms: ['harm', 'injury', 'death', ...],
    semanticField: 'medical'
  },
  // ... 119 more values
};

// TagTeam accepts this and uses for semantic matching
tagTeam.loadValueDefinitions(valueDefinitions);
```

---

### Question 4: Ambiguity Handling
**Issue**: Some scenarios are genuinely ambiguous

**Example**: "I'm considering leaving" - leaving what? (job, relationship, location?)

**TagTeam Decision Needed**:
- Return multiple interpretations with confidence scores?
- Force single best-guess interpretation?
- Flag ambiguity for user clarification?

**IEE's Preference**: Return top interpretation + confidence, flag low-confidence parses

---

## Appendix A: IEE Architecture Reference

### Key Files
- [src/concepts/scenarioParser.js](src/concepts/scenarioParser.js) - Scenario parsing (634 lines)
- [src/concepts/moralReasoner.js](src/concepts/moralReasoner.js) - Value matching (371 lines)
- [src/concepts/worldviewManager.js](src/concepts/worldviewManager.js) - Value hierarchies
- [src/application/deliberationOrchestrator.js](src/application/deliberationOrchestrator.js) - Main orchestrator

### Value Hierarchy Structure
Each worldview returns:
```javascript
{
  terminal: ['value1', 'value2', ...],      // Ultimate goods
  constitutive: ['value3', 'value4', ...],  // Essential components
  instrumental: ['value5', 'value6', ...]   // Means to ends
}
```

Example (Materialism):
```javascript
{
  terminal: ['physical_wellbeing', 'empirical_truth', 'material_security'],
  constitutive: ['health', 'bodily_comfort', 'sensory_function'],
  instrumental: ['technology', 'medicine', 'engineering', 'measurement']
}
```

### 12 Worldviews (Steiner's Integral Philosophy)
1. Materialism - Matter is fundamental
2. Sensationalism - Sensation is fundamental
3. Phenomenalism - Phenomena are fundamental
4. Realism - External reality is fundamental
5. Dynamism - Force/energy is fundamental
6. Monadism - Individual centers are fundamental
7. Idealism - Ideas are fundamental
8. Rationalism - Reason is fundamental
9. Psychism - Mind is fundamental
10. Pneumatism - Spirit is fundamental
11. Spiritualism - Spiritual reality is fundamental
12. Mathematism - Mathematical relations are fundamental

---

## Appendix B: Example Regex Patterns (To Be Replaced)

Current pattern matching that TagTeam will replace:

```javascript
// From scenarioParser.js
const CONTEXT_KEYWORDS = {
  physicalImpact: [
    'harm', 'injury', 'pain', 'suffering', 'death', 'dying',
    'terminal', 'cancer', 'treatment', 'medical', 'life support'
  ],
  autonomyAtStake: [
    'choice', 'decide', 'decision', 'autonomy', 'freedom', 'liberty',
    'control', 'independent', 'self-determination', 'force', 'coerce'
  ],
  // ... 14 more
};

// From moralReasoner.js
if (actionLower.match(/harm|health|pain|suffer|dying|terminal|cancer|treatment|medical|life support/)) {
  matched = true;
}
```

These 16 context types × ~20 keywords each = **~320 manual patterns** that TagTeam's semantic understanding should replace with deterministic compositional semantics.

---

## Contact & Coordination

**IEE Repository**: c:\Users\aaron\OneDrive\Documents\Integral-Ethics-Engine
**TagTeam Repository**: https://github.com/Skreen5hot/TagTeam.js

**Coordination Needed**:
- Weekly sync on semantic frame ontology
- Shared test scenario corpus (IEE will provide 50 annotated scenarios)
- Joint validation of semantic relevance scores

**IEE Integration Lead**: Ready to test TagTeam builds weekly and provide feedback

---

## Conclusion

TagTeam.js has the potential to solve IEE's core semantic understanding challenge while maintaining the deterministic, dependency-free philosophy that both projects share.

**Success = IEE can understand**: "The family decided NOT to continue aggressive treatment to honor the patient's wish for quality of life over prolonged suffering."

And correctly identify:
- Agent: family (not patient)
- Action: decide (negated: NOT continue treatment)
- Purpose: honor patient's wish (respect for autonomy)
- Values at stake: physical_wellbeing, individual_autonomy, quality_of_life

**Timeline**: 3 weeks to full integration, with weekly milestones for testing and validation.
