# TagTeam.js Distribution Bundles

**Browser-ready bundles for semantic parsing and ethical value detection**

---

## Bundle Options

| Bundle | Size | Purpose |
|--------|------|---------|
| **tagteam-core.js** | 4.71 MB | Core semantic parsing only |
| **tagteam-values.js** | 138 KB | IEE value detection add-on |
| **tagteam.js** | 4.84 MB | Combined (backwards compatible) |

---

## Quick Start

### Option 1: Core Only (No Value Detection)

Use this if you only need semantic parsing without ethical value analysis.

```html
<script src="tagteam-core.js"></script>
<script>
  // Simple parsing API
  const result = TagTeam.parse("The doctor treats the patient");
  console.log(result.agent);        // { text: "doctor", ... }
  console.log(result.action);       // { verb: "treats", ... }
  console.log(result.semanticFrame); // "Medical_treatment"

  // Full JSON-LD graph
  const graph = TagTeam.buildGraph("The family must decide about treatment");
  console.log(graph['@graph']);     // Array of BFO/CCO-compliant nodes
</script>
```

### Option 2: Core + Values (Recommended for IEE)

Use this for full ethical value detection and context analysis.

```html
<script src="tagteam-core.js"></script>
<script src="tagteam-values.js"></script>
<script>
  // Create builder with value detection
  const builder = new TagTeamValues.IEEGraphBuilder();

  // Build graph with values
  const graph = builder.build("The doctor must allocate the last ventilator", {
    context: "MedicalEthics"
  });

  // Access value analysis
  const values = graph._valueAnalysis;
  console.log(values.scoredValues);  // [{ value: "Beneficence", ... }]
  console.log(values.conflicts);     // [{ value1: "...", value2: "..." }]

  // Or analyze values separately
  const analysis = builder.analyzeValues("We should protect the vulnerable");
  console.log(analysis.scoredValues);
  console.log(analysis.contextIntensity);
</script>
```

### Option 3: Combined Bundle (Legacy)

For backwards compatibility with existing code.

```html
<script src="tagteam.js"></script>
<script>
  // All functionality available
  const result = TagTeam.parse("text");
  const graph = TagTeam.buildGraph("text");

  // Value classes also available
  const analyzer = new TagTeam.ContextAnalyzer();
  const matcher = new TagTeam.ValueMatcher();
</script>
```

---

## API Reference

### Core API (tagteam-core.js)

#### TagTeam.parse(text, options?)

Parse a sentence and extract semantic roles.

```javascript
const result = TagTeam.parse("I should tell my doctor about the pain");

// Returns:
{
  agent: { text: "i", entity: "self", posTag: "PRP" },
  action: {
    verb: "tell",
    lemma: "tell",
    modality: "should",
    tense: "present",
    frame: "Revealing_information"
  },
  recipient: { text: "doctor", entity: "doctor", posTag: "NN" },
  theme: { text: "pain", entity: "pain", posTag: "NN" },
  semanticFrame: "Revealing_information",
  confidence: 0.85
}
```

#### TagTeam.buildGraph(text, options?)

Build a BFO/CCO-compliant JSON-LD semantic graph.

```javascript
const graph = TagTeam.buildGraph("The nurse prioritizes the patient", {
  context: "MedicalEthics",
  namespace: "inst"
});

// Returns JSON-LD with @graph array containing:
// - InformationBearingEntity (IBE) for the text
// - DiscourseReferent nodes for entities
// - Person/Artifact nodes (Tier 2)
// - Act nodes for actions
// - Role nodes (AgentRole, PatientRole)
// - Quality nodes for modifiers
```

#### TagTeam.toJSONLD(text, options?)

Serialize graph to formatted JSON-LD string.

```javascript
const jsonld = TagTeam.toJSONLD("text", { pretty: true });
console.log(jsonld); // Formatted JSON-LD string
```

### Values API (tagteam-values.js)

#### TagTeamValues.IEEGraphBuilder

```javascript
const builder = new TagTeamValues.IEEGraphBuilder({
  valueDefinitions: customDefs,  // Optional
  frameBoosts: customBoosts,     // Optional
  conflictPairs: customPairs     // Optional
});

// Build graph with values
const graph = builder.build(text, { context: "MedicalEthics" });

// Analyze values only (no graph building)
const analysis = builder.analyzeValues(text);
```

#### TagTeamValues.VALUE_DEFINITIONS

Access the built-in value definitions:

```javascript
const defs = TagTeamValues.VALUE_DEFINITIONS;
console.log(defs.values); // Array of value definitions
```

---

## Exposed Classes

### Core Bundle

| Class | Purpose |
|-------|---------|
| `SemanticRoleExtractor` | Parse text to semantic roles |
| `SemanticGraphBuilder` | Build JSON-LD graphs |
| `PatternMatcher` | NLP pattern matching |
| `POSTagger` | Part-of-speech tagging |
| `EntityExtractor` | Extract entities from text |
| `ActExtractor` | Extract actions/verbs |
| `RoleDetector` | Detect semantic roles |
| `JSONLDSerializer` | Serialize to JSON-LD |
| `RealWorldEntityFactory` | Create Tier 2 entities |
| `ScarcityAssertionFactory` | Create scarcity assertions |
| `DirectiveExtractor` | Extract modal directives |
| `ObjectAggregateFactory` | Create plural aggregates |
| `QualityFactory` | Create quality nodes |
| `ContextManager` | Manage interpretation contexts |
| `InformationStaircaseBuilder` | Build IBE/ICE staircase |

### Values Bundle

| Class | Purpose |
|-------|---------|
| `IEEGraphBuilder` | Integrated graph + values |
| `ContextAnalyzer` | 12-dimension context analysis |
| `ValueMatcher` | Match text to values |
| `ValueScorer` | Score and rank values |
| `EthicalProfiler` | Generate ethical profiles |
| `AssertionEventBuilder` | Create value assertion nodes |

---

## Migration Guide

### From Combined to Separated Bundles

**Before (combined):**
```html
<script src="tagteam.js"></script>
<script>
  const graph = TagTeam.buildGraph("text");
</script>
```

**After (separated, core only):**
```html
<script src="tagteam-core.js"></script>
<script>
  const graph = TagTeam.buildGraph("text");
  // Same API, smaller bundle
</script>
```

**After (separated, with values):**
```html
<script src="tagteam-core.js"></script>
<script src="tagteam-values.js"></script>
<script>
  // Use IEEGraphBuilder for value detection
  const builder = new TagTeamValues.IEEGraphBuilder();
  const graph = builder.build("text", { context: "MedicalEthics" });
</script>
```

---

## Bundle Sizes

| Bundle | Uncompressed | Gzipped (est.) |
|--------|--------------|----------------|
| tagteam-core.js | 4.71 MB | ~1.2 MB |
| tagteam-values.js | 138 KB | ~35 KB |
| tagteam.js | 4.84 MB | ~1.2 MB |

The combined bundle is ~130 KB larger than core due to value definitions and analyzers.

---

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

Requires ES6 support (arrow functions, classes, template literals).

---

## Node.js Usage

All bundles work in Node.js:

```javascript
// Core only
const TagTeam = require('./dist/tagteam-core.js');

// With values (load core first)
const TagTeam = require('./dist/tagteam-core.js');
global.TagTeam = TagTeam;
const TagTeamValues = require('./dist/tagteam-values.js');

// Combined
const TagTeam = require('./dist/tagteam.js');
```

---

## Test Files

- **test.html** - Basic bundle functionality test
- **test-iee-bundle.html** - Full IEE corpus validation

---

## Version

- **tagteam-core.js** - v5.0.0-core
- **tagteam-values.js** - v1.0.0
- **tagteam.js** - v5.0.0

Date: 2026-01-23
