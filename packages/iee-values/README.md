# tagteam-iee-values

**IEE ethical value detection for TagTeam semantic graphs**

This package provides ethical value detection, context analysis, and value conflict identification for use with TagTeam semantic graphs. It is designed as an optional add-on to the core `tagteam-core` package.

---

## Installation

### Browser (Recommended for Quick Start)

```html
<!-- Load core first -->
<script src="tagteam-core.js"></script>
<!-- Then load values -->
<script src="tagteam-values.js"></script>

<script>
  const builder = new TagTeamValues.IEEGraphBuilder();
  const graph = builder.build("The doctor must allocate the ventilator", {
    context: "MedicalEthics"
  });
</script>
```

### Node.js (Package Installation)

```bash
npm install tagteam-core tagteam-iee-values
```

```javascript
const { SemanticGraphBuilder } = require('tagteam-core');
const { IEEGraphBuilder, ValueAnalyzer } = require('tagteam-iee-values');

// Option 1: Use IEEGraphBuilder for integrated value analysis
const builder = new IEEGraphBuilder();
const graph = builder.build("The nurse should prioritize the patient");

// Option 2: Use ValueAnalyzer to enrich existing graphs
const coreBuilder = new SemanticGraphBuilder();
const coreGraph = coreBuilder.build("The family must decide about treatment");

const analyzer = new ValueAnalyzer();
const enrichedGraph = analyzer.analyze(coreGraph, { context: "MedicalEthics" });
```

---

## API Reference

### IEEGraphBuilder

Convenience wrapper that combines TagTeam semantic parsing with value detection.

```javascript
const builder = new IEEGraphBuilder(options);
const graph = builder.build(text, buildOptions);
```

**Constructor Options:**
- `valueDefinitions` - Custom value definitions (uses IEE defaults if not provided)
- `contextPatterns` - Custom context patterns
- `frameBoosts` - Custom frame-value boost mappings
- `conflictPairs` - Custom conflict pair definitions
- `namespace` - Namespace prefix for IRIs (default: 'inst')

**Build Options:**
- `context` - Interpretation context (e.g., 'MedicalEthics')
- `extractValues` - Enable/disable value extraction (default: true)

**Returns:** JSON-LD semantic graph with value assertions

### ValueAnalyzer

Standalone analyzer for ethical values and context dimensions. Can analyze text directly or enrich existing graphs.

```javascript
const analyzer = new ValueAnalyzer(options);

// Analyze text directly
const analysis = analyzer.analyzeText(text, options);

// Enrich an existing graph
const enrichedGraph = analyzer.analyze(existingGraph, options);
```

**analyzeText() Returns:**
```javascript
{
  text: "original text",
  scoredValues: [
    { value: "Beneficence", confidence: 0.85, domain: "medical", ... },
    { value: "Autonomy", confidence: 0.72, domain: "individual", ... }
  ],
  contextIntensity: {
    urgency: 0.8,
    vulnerability: 0.6,
    scarcity: 0.4,
    // ... 12 dimensions total
  },
  conflicts: [
    { value1: "Autonomy", value2: "Beneficence", intensity: 0.6 }
  ],
  profile: { /* ethical profile summary */ },
  metadata: {
    timestamp: "2026-01-23T...",
    valueCount: 2,
    conflictCount: 1
  }
}
```

### Individual Analyzers

For fine-grained control, you can use the individual analyzer components:

```javascript
const {
  ContextAnalyzer,
  ValueMatcher,
  ValueScorer,
  EthicalProfiler
} = require('tagteam-iee-values/analyzers');

// Context analysis (12 dimensions)
const contextAnalyzer = new ContextAnalyzer();
const context = contextAnalyzer.analyzeContext(text, taggedWords, frame, roles);

// Value matching
const valueMatcher = new ValueMatcher(customDefinitions);
const matches = valueMatcher.matchValues(text, taggedWords);

// Value scoring with frame boosts
const valueScorer = new ValueScorer({ frameBoosts, conflictPairs });
const scored = valueScorer.scoreValues(matches, frame, roles, definitions);

// Ethical profiling with conflict detection
const profiler = new EthicalProfiler();
const profile = profiler.generateProfile(scoredValues);
```

---

## Data Files

The package includes curated data files for value detection:

```javascript
const {
  VALUE_DEFINITIONS,
  FRAME_VALUE_BOOSTS,
  CONFLICT_PAIRS
} = require('tagteam-iee-values/data');
```

### VALUE_DEFINITIONS

Comprehensive definitions for ethical values across domains:
- Medical ethics (Beneficence, Non-maleficence, Autonomy, Justice)
- Environmental ethics (Sustainability, Intergenerational equity)
- Social values (Fairness, Transparency, Privacy)
- Personal values (Honesty, Loyalty, Courage)

### FRAME_VALUE_BOOSTS

Mappings from semantic frames to value confidence boosts:
- `Deciding` frame boosts `Autonomy`
- `Giving` frame boosts `Beneficence`
- `Preventing` frame boosts `Non-maleficence`

### CONFLICT_PAIRS

Known value conflict pairs and their typical resolution patterns:
- Autonomy vs Beneficence (paternalism dilemma)
- Individual vs Collective good
- Short-term vs Long-term benefit

---

## Context Dimensions

The ContextAnalyzer evaluates 12 contextual dimensions:

| Category | Dimensions |
|----------|------------|
| Temporal | urgency, time_horizon |
| Resource | scarcity, replaceability |
| Social | vulnerability, power_differential |
| Epistemic | certainty, reversibility |
| Scope | individual_collective, public_private |
| Moral | intentionality, harm_potential |

Each dimension is scored 0.0-1.0 based on linguistic cues in the text.

---

## Graph Output

When using IEEGraphBuilder, the output includes:

### Value Assertion Events
```json
{
  "@id": "inst:ValueAssertion_abc123",
  "@type": ["tagteam:ValueAssertionEvent", "cco:ActOfMeasuring"],
  "cco:has_output": "inst:ValueICE_abc123",
  "cco:is_about": "inst:IBE_...",
  "tagteam:has_confidence": "high"
}
```

### Value ICE Nodes
```json
{
  "@id": "inst:ValueICE_abc123",
  "@type": ["cco:InformationContentEntity", "tagteam:ValueMeasurement"],
  "tagteam:has_value_type": "Beneficence",
  "tagteam:has_score": 0.85,
  "tagteam:has_domain": "medical"
}
```

### Context Assessment Events
```json
{
  "@id": "inst:ContextAssessment_def456",
  "@type": ["tagteam:ContextAssessmentEvent", "cco:ActOfMeasuring"],
  "tagteam:has_dimension": "urgency",
  "tagteam:has_intensity": 0.8
}
```

---

## Ontology

This package includes the values-specific ontology vocabulary:

- `ontology/tagteam-values.ttl` - OWL/RDF definitions for value detection classes and properties

Key classes defined:
- `ValueAssertionEvent` - Process of asserting an ethical value
- `ContextAssessmentEvent` - Process of assessing context dimensions
- `EthicalValueICE` - Information content entity for ethical values
- `ContextDimensionICE` - Information content entity for context dimensions
- `AssertionType` individuals (AutomatedDetection, HumanValidation, etc.)

The values ontology imports `tagteam-core.ttl` for base vocabulary.

---

## Peer Dependencies

This package requires `tagteam-core` version 5.0.0 or higher:

```json
{
  "peerDependencies": {
    "tagteam-core": "^5.0.0"
  }
}
```

---

## Development

### Running Tests

```bash
cd packages/iee-values
npm test
```

### Test Files

- `tests/test-iee-graph-builder.js` - Integration tests for the full pipeline

---

## License

MIT License

---

## Version History

### 1.0.0 (2026-01-23)
- Initial release as separate package
- Extracted from tagteam.js combined bundle
- Added ValueAnalyzer for standalone use
- Added IEEGraphBuilder for integrated use
