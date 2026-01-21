# TagTeam Ontology

A BFO/CCO-aligned ontology extension for natural language parsing, semantic graph construction, and ethical discourse analysis.

## Overview

The TagTeam ontology (`tagteam.ttl`) provides vocabulary for:

- **Tier 1 Parsing Layer**: Discourse referents, verb phrases, and linguistic structures
- **Assertion Events**: Value and context assertions with confidence tracking
- **Deontic Modality**: Obligations, permissions, prohibitions
- **Scarcity Detection**: Resource scarcity assertions
- **GIT-Minimal Compliance**: Assertion types, interpretation contexts, provenance

## Alignment

- **BFO 2020** (ISO 21838-2:2020) - Top-level ontology
- **CCO** (Common Core Ontologies) - Domain ontology framework

## Namespace

```
Prefix: tagteam
IRI: http://tagteam.fandaws.org/ontology/
```

## Key Classes

### Parsing Layer (Tier 1)
| Class | Description |
|-------|-------------|
| `DiscourseReferent` | Linguistic reference to an entity in text |
| `VerbPhrase` | Extracted verb phrase with tense/aspect/modality |
| `DirectiveContent` | Prescriptive, permissive, or prohibitive content |
| `ScarcityAssertion` | Assertion that a resource is scarce |

### Assertion Events (GIT-Minimal)
| Class | Description |
|-------|-------------|
| `ValueAssertionEvent` | Assertion of an ethical value |
| `ContextAssessmentEvent` | Assessment of a context dimension |
| `EthicalValueICE` | Information about an ethical value |
| `ContextDimensionICE` | Information about a context dimension |

### Assertion Types
| Individual | Description |
|------------|-------------|
| `AutomatedDetection` | Parser-generated assertion |
| `HumanValidation` | Human-validated assertion |
| `HumanRejection` | Human-rejected assertion |
| `HumanCorrection` | Human-corrected assertion |

### Actuality Status
| Individual | Description |
|------------|-------------|
| `Actual` | Act has occurred |
| `Prescribed` | Act is obligated (must) |
| `Permitted` | Act is allowed (may) |
| `Prohibited` | Act is forbidden (must not) |
| `Hypothetical` | Act is considered (if...then) |
| `Planned` | Act is intended (will) |
| `Negated` | Act is explicitly negated |

## Key Properties

### Object Properties
- `asserts` - Links assertion event to ICE
- `detected_by` - Links to detecting agent
- `based_on` - Links to source IBE (input text)
- `validInContext` - Links to interpretation context
- `assertionType` - Links to assertion type individual
- `would_be_realized_in` - For non-actual role realization

### Datatype Properties
- `extractionConfidence`, `classificationConfidence`, `relevanceConfidence` - Three-way confidence
- `aggregateConfidence` - Combined confidence score
- `sourceText`, `startPosition`, `endPosition` - Text span tracking
- `denotesType` - Type IRI for discourse referent
- `modality` - Deontic modality type
- `actualityStatus` - Act's actuality/modality status

## Validation

Run the validation script:

```bash
node ontology/validation/validate-ontology.js
```

For SPARQL-based validation:

1. **ROBOT** (recommended):
   ```bash
   robot report --input ontology/tagteam.ttl
   ```

2. **Apache Jena**:
   ```bash
   arq --data ontology/tagteam.ttl --query ontology/validation/check-labels.sparql
   ```

3. **Protege**: Load ontology and use SPARQL query tab

### SPARQL Validation Queries

Available in `ontology/validation/`:

| Query | Checks |
|-------|--------|
| `check-labels.sparql` | Missing rdfs:label |
| `check-definitions.sparql` | Missing skos:definition |
| `check-prefLabels.sparql` | Missing skos:prefLabel |
| `check-domain-range.sparql` | Missing domain/range |
| `check-subclass.sparql` | Missing superclass |
| `check-duplicate-labels.sparql` | Duplicate labels |
| `inventory.sparql` | Full entity inventory |

## Usage in TagTeam.js

The ontology vocabulary is used throughout the codebase:

```javascript
// JSON-LD @context includes tagteam namespace
const context = {
  tagteam: 'http://tagteam.fandaws.org/ontology/',
  DiscourseReferent: 'tagteam:DiscourseReferent',
  // ...
};

// Nodes use tagteam properties
const referent = {
  '@type': ['tagteam:DiscourseReferent', 'owl:NamedIndividual'],
  'tagteam:denotesType': 'cco:Person',
  'tagteam:definiteness': 'definite',
  // ...
};
```

## CCO Expert Review (v4.0.1)

The ontology has been reviewed by a CCO/BFO expert and received a **5.0/5.0** rating. The following improvements were made based on the review:

### A. Modal Property Documentation
- `would_be_realized_in` now includes explicit USAGE CONSTRAINT documentation
- Must ONLY be used when target process has actualityStatus other than `:Actual`

### B. DeonticContent/DirectiveContent Taxonomy
- `:DeonticContent` is now the parent class for all normative content
- `:DirectiveContent` is a specific subclass for explicit directives
- Cleaner taxonomy for SHACL validation

### C. Quality Grounding (Phase 5)
- Added `:describes_quality` property for grounding linguistic adjectives in BFO qualities
- Enables mapping from "critically ill" to `cco:DiseaseQuality`

### SHACL Validation Rules (CCO Expert Checklist)
| Rule | Predicate | Constraint |
|------|-----------|------------|
| Agency | `has_agent` | Domain: `bfo:Process`, Range: `cco:Agent` |
| Reference | `is_about` | Domain: `DiscourseReferent`, Range: Tier 2 entity |
| Inherence | `inheres_in` | Domain: `bfo:Role`/`bfo:Quality`, Range: `bfo:IndependentContinuant` |
| Modality | `prescribes` | Domain: `DirectiveContent`, Range: `bfo:Process` |

## Version History

- **4.0.1** - CCO Expert Review improvements
  - Documented `would_be_realized_in` usage constraints
  - Refactored DeonticContent/DirectiveContent taxonomy
  - Added `describes_quality` property for Phase 5
  - Implemented CCO Expert SHACL validation rules

- **4.0.0** - Initial formal TTL release with BFO/CCO alignment
  - 14 classes
  - 16 object properties
  - 65 datatype properties
  - 12 named individuals

## License

CC-BY-4.0
