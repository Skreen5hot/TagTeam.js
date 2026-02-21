# TagTeam Phase 4 User Guide

## Overview

Phase 4 transforms TagTeam from a flat value detector into a **semantically honest knowledge graph generator**. This guide covers how to use the Phase 4 JSON-LD output capabilities.

### Key Features

- **JSON-LD Output**: Produce valid JSON-LD knowledge graphs
- **BFO/CCO Compliance**: All entities follow Basic Formal Ontology and Common Core Ontologies patterns
- **SHACL Validation**: Validate graphs against 8 expert-certified patterns
- **GIT-Minimal Integration**: Track provenance with assertionType and validInContext

---

## Quick Start

### Basic Usage

```javascript
const SemanticGraphBuilder = require('./src/graph/SemanticGraphBuilder');
const JSONLDSerializer = require('./src/graph/JSONLDSerializer');

const builder = new SemanticGraphBuilder();
const serializer = new JSONLDSerializer();

// Build and serialize
const graph = builder.build("The doctor must allocate the last ventilator");
const jsonld = serializer.serialize(graph);

console.log(jsonld);
```

### With Interpretation Context

```javascript
const graph = builder.build(
  "The family must decide whether to continue treatment",
  { context: 'MedicalEthics' }
);
```

### Available Contexts

- `MedicalEthics` - Principlism (Beauchamp & Childress)
- `DeontologicalEthics` - Kant, rule-based approaches
- `UtilitarianEthics` - Consequentialist framework
- `VirtueEthics` - Aristotelian approach
- `CareEthics` - Relational, feminist ethics
- `ReligiousEthics` - Faith-based frameworks
- `ProfessionalEthics` - Domain-specific codes
- `EnvironmentalEthics` - Ecological considerations
- `Default` - No specific framework

---

## Understanding the Output

### Graph Structure

Every JSON-LD output contains:

```json
{
  "@context": { /* namespace definitions */ },
  "@graph": [
    /* array of nodes */
  ]
}
```

### Node Types

**Tier 1 (ICE Layer - What the Text Says)**
- `tagteam:DiscourseReferent` - Text mentions of entities
- `tagteam:DirectiveContent` - Modal markers (must, should)
- `tagteam:ScarcityAssertion` - Claims about scarcity
- `tagteam:ValueAssertionEvent` - Detected ethical values
- `tagteam:ContextAssessmentEvent` - Context dimension scores

**Tier 2 (IC Layer - Real-World Entities)**
- `cco:Person` - Human individuals
- `cco:Artifact` - Physical objects
- `cco:Organization` - Groups/institutions
- `bfo:BFO_0000027` - Object Aggregates (e.g., "two patients")

**Acts**
- `cco:IntentionalAct` - Actions with agents and affected parties
- Links: `cco:has_agent`, `cco:affects`, `bfo:has_participant`

**Roles**
- `bfo:Role` (rdfs:label: "AgentRole") - Entity performing an act
- `bfo:Role` (rdfs:label: "PatientRole") - Entity receiving care (persons only)
- `bfo:BFO_0000023` - Generic BFO Role

---

## SHACL Validation

### Running Validation

```javascript
const SHMLValidator = require('./src/graph/SHMLValidator');

const validator = new SHMLValidator();
const graph = builder.build(text, options);
const report = validator.validate(graph);

console.log('Compliance Score:', report.complianceScore);
console.log('Violations:', report.violations.length);
console.log('Warnings:', report.warnings.length);
```

### Understanding the Report

```javascript
{
  valid: true,                // true if no violations
  complianceScore: 85,        // 0-100 score
  violations: [],             // MUST fix
  warnings: [],               // SHOULD address
  info: [],                   // Suggestions
  patterns: {
    InformationStaircase: { passed: 10, total: 10, score: 100 },
    RolePattern: { passed: 5, total: 6, score: 83 },
    // ... 8 patterns total
  }
}
```

### 8 Validation Patterns

1. **Information Staircase** - ICE nodes linked to IBE
2. **Role Pattern** - Roles have bearers and realizations
3. **Designation Pattern** - Proper name structures
4. **Temporal Interval Pattern** - Time grounding
5. **Measurement Pattern** - Proper units and values
6. **Socio-Primal Pattern** - Agent/Act relationships
7. **Domain/Range Validation** - Correct property usage
8. **Vocabulary Validation** - No typos in terms

### Severity Levels

- **VIOLATION**: Must fix - blocks compliance
- **WARNING**: Should address - degrades quality
- **INFO**: Suggestions for improvement

---

## Complexity Budget

### Default Limits

```javascript
const ComplexityBudget = require('./src/graph/ComplexityBudget');

const budget = new ComplexityBudget({
  maxNodes: 200,        // Max nodes in graph
  maxReferents: 30,     // Max discourse referents
  maxAssertions: 50,    // Max assertion events
  maxTextLength: 2000,  // Max input characters
  maxParseTime: 500     // Max parse time (ms)
});
```

### Checking Limits

```javascript
budget.startParse();
budget.checkTextLength(text);

// Add nodes
budget.addNode('tagteam:DiscourseReferent');
budget.addNode('cco:IntentionalAct');

// Check usage
const usage = budget.getUsage();
console.log(usage.nodes.percentage + '% of node budget used');
```

### Text Chunking

For texts exceeding limits:

```javascript
const chunks = budget.chunkText(longText, {
  maxChars: 2000,
  preserveSentences: true  // Split on sentence boundaries
});

// Process each chunk
chunks.forEach((chunk, idx) => {
  console.log(`Chunk ${idx}: ${chunk.text.length} chars`);
  const graph = builder.build(chunk.text, options);
});
```

---

## GIT-Minimal Properties

### Assertion Types

Every assertion event has:

```json
{
  "tagteam:assertionType": "tagteam:AutomatedDetection",
  "tagteam:validInContext": "tagteam:MedicalEthics_Context",
  "tagteam:detected_by": "inst:TagTeam_Parser_v4.0.0",
  "tagteam:based_on": "inst:Input_Text_IBE_..."
}
```

### Future: Human Validation

Phase 5 will support:
- `tagteam:HumanValidation` - Expert confirmed
- `tagteam:HumanRejection` - Expert rejected
- `tagteam:HumanCorrection` - Expert modified
- `tagteam:supersedes` - Chain of corrections

---

## Confidence Scores

### Three-Way Decomposition

Value assertions include:

```json
{
  "tagteam:extractionConfidence": 0.95,
  "tagteam:classificationConfidence": 0.90,
  "tagteam:relevanceConfidence": 0.75,
  "tagteam:aggregateConfidence": 0.86,
  "tagteam:aggregationMethod": "geometric_mean"
}
```

- **extractionConfidence**: How reliably the text was parsed
- **classificationConfidence**: How confidently the value was categorized
- **relevanceConfidence**: How relevant to the context
- **aggregateConfidence**: Combined score (geometric mean)

---

## API Reference

### SemanticGraphBuilder

```javascript
class SemanticGraphBuilder {
  constructor(options)
  build(text, options) -> { '@graph': nodes[], _metadata: {} }
  addNode(node)
  addNodes(nodes)
  generateIRI(text, type) -> string
}
```

**Build Options:**
- `context`: Interpretation context name
- `extractEntities`: Extract discourse referents (default: true)
- `extractActs`: Extract intentional acts (default: true)
- `detectRoles`: Detect BFO roles (default: true)
- `extractValues`: Create value assertions (requires scoredValues)
- `extractContext`: Create context assessments (requires contextIntensity)
- `scoredValues`: Array of value detections
- `contextIntensity`: Object with 12 dimension scores

### JSONLDSerializer

```javascript
class JSONLDSerializer {
  constructor(options)
  serialize(graph) -> string
}
```

**Options:**
- `compact`: Use compact format (default: true)
- `pretty`: Pretty-print JSON (default: false)

### SHMLValidator

```javascript
class SHMLValidator {
  constructor(options)
  validate(graph) -> ValidationReport
  formatReport(report) -> string
}
```

**Options:**
- `strictMode`: Treat warnings as violations (default: false)
- `verbose`: Include INFO level issues (default: false)
- `maxSuggestions`: Max typo suggestions (default: 3)

### ComplexityBudget

```javascript
class ComplexityBudget {
  constructor(options)
  reset()
  startParse()
  checkTextLength(text) -> boolean
  canAddNode(nodeType) -> boolean
  addNode(nodeType) -> boolean
  addNodes(nodeTypes) -> number
  getUsage() -> UsageStats
  getRemaining() -> RemainingCapacity
  wasTruncated() -> boolean
  chunkText(text, options) -> Chunk[]
}
```

---

## Troubleshooting

### Common Issues

**"Role has no bearer"**
- Ensure entities are extracted before roles
- Check that entity IRIs match the bearer reference

**"ICE has no is_concretized_by"**
- The ICE node is missing its link to the IBE
- Verify Information Staircase is being built

**"Unknown predicate/class"**
- TagTeam custom terms may not be in validator vocabulary
- This is a warning, not a violation

**Parse time exceeded**
- Text too long - use chunking
- Reduce complexity by filtering low-confidence detections

### Performance Tips

1. Use chunking for texts > 2000 characters
2. Filter values with confidence < 0.5
3. Limit discourse referents to 30 per chunk
4. Validate after building, not during

---

## Version Information

- **Phase 4 Version**: 4.0.0-phase4-week3
- **Expert Review**: 5.0/5.0 BFO/CCO Compliance (2026-01-19)
- **Test Coverage**: 245+ tests passing
- **Corpus Validation**: 21 scenarios, 100% SHACL compliant

---

## Further Reading

- [JSONLD_EXAMPLES.md](JSONLD_EXAMPLES.md) - Annotated output examples
- [SHACL_VALIDATION_GUIDE.md](SHACL_VALIDATION_GUIDE.md) - Validation patterns detail
- [PHASE4_IMPLEMENTATION_ROADMAP.md](../planning/week3/PHASE4_IMPLEMENTATION_ROADMAP.md) - Technical roadmap
