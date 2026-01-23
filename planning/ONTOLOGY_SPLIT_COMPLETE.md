# Ontology Split Complete

**Date:** 2026-01-23
**Status:** Complete

---

## Summary

The TagTeam ontology has been split into two modular ontologies:

1. **tagteam-core.ttl** - Core parsing vocabulary (~600 lines)
2. **tagteam-values.ttl** - Value detection vocabulary (~400 lines, imports core)

The original `tagteam.ttl` is retained as a combined ontology for backwards compatibility.

---

## File Locations

| File | Location | Purpose |
|------|----------|---------|
| tagteam.ttl | `ontology/` | Combined (backwards compatible) |
| tagteam-core.ttl | `ontology/` | Core parsing vocabulary |
| tagteam-values.ttl | `ontology/` | Value detection vocabulary |
| tagteam-values.ttl | `packages/iee-values/ontology/` | Copy for values package |

---

## Ontology IRIs

| Ontology | IRI |
|----------|-----|
| Combined | `http://tagteam.fandaws.org/ontology/` |
| Core | `http://tagteam.fandaws.org/ontology/core/` |
| Values | `http://tagteam.fandaws.org/ontology/values/` |

---

## Core Ontology Contents (tagteam-core.ttl)

### Classes
- `DiscourseReferent` - Linguistic reference to entities
- `VerbPhrase` - Extracted verb phrases
- `DeonticContent` / `DirectiveContent` - Normative content
- `ScarcityAssertion` - Resource scarcity
- `InterpretationContext` - Framework for interpretation
- `ActualityStatus` - Status class for acts

### Named Individuals (Actuality Status)
- `Actual`, `Prescribed`, `Permitted`, `Prohibited`
- `Hypothetical`, `Planned`, `Negated`
- `Default_Context`

### Object Properties
- Parsing: `has_component`, `extracted_from`, `corefersWith`, `describes_quality`
- Role/Act: `would_be_realized_in`, `actualityStatus`, `prescribes`, `prescribed_by`
- Scarcity: `scarceResource`, `competingParties`
- Provenance: `instantiated_by`

### Datatype Properties
- Text: `sourceText`, `startPosition`, `endPosition`, `span_offset`
- Discourse: `denotesType`, `referentialStatus`, `definiteness`, `qualifiers`
- Role/Act: `roleType`, `verb`, `lemma`, `tense`, `aspect`, `negated`
- Modal: `modality`, `modalType`, `modalMarker`, `modalStrength`
- Scarcity: `is_scarce`, `scarcity_marker`, `supplyCount`, `demandCount`
- Quality: `qualifierText`, `severity`, `ageCategory`
- Aggregate: `member_count`, `member_index`
- Parser: `version`, `algorithm`, `capabilities`
- Budget: `budgetUsage`, `truncated`, `budgetWarnings`

---

## Values Ontology Contents (tagteam-values.ttl)

### Classes
- `ValueAssertionEvent` - Value detection process (subClassOf bfo:Process)
- `ContextAssessmentEvent` - Context assessment process
- `EthicalValueICE` - Ethical value entity
- `ContextDimensionICE` - Context dimension entity
- `AssertionType` - Class for assertion type individuals
- `ValueDetectionRecord` (deprecated)
- `ContextAssessmentRecord` (deprecated)

### Named Individuals (Assertion Types)
- `AutomatedDetection`, `HumanValidation`
- `HumanRejection`, `HumanCorrection`

### Object Properties
- `asserts` - Links event to ICE
- `detected_by` - Links to detecting agent
- `based_on` - Links to source IBE
- `assertionType` - Links to assertion type
- `validInContext` - Links to interpretation context
- `validatedBy` - Links to human validator
- `supersedes` - Links to superseded assertion

### Datatype Properties
- Confidence: `extractionConfidence`, `classificationConfidence`, `relevanceConfidence`
- Aggregate: `aggregateConfidence`, `aggregationMethod`
- Timestamp: `validationTimestamp`
- Value: `valueName`, `valueCategory`, `dimension`, `category`
- Assessment: `score`, `polarity`, `salience`
- Evidence: `evidence`, `evidenceText`, `sourceSpan`, `matched_markers`, `detection_method`

---

## Import Hierarchy

```
BFO 2020 (http://purl.obolibrary.org/obo/bfo/2020/bfo.owl)
    └── tagteam-core.ttl
            └── tagteam-values.ttl
```

---

## Usage

### Core Only (Semantic Parsing)
```turtle
@prefix tagteam: <http://tagteam.fandaws.org/ontology/> .
# Uses classes: DiscourseReferent, VerbPhrase, ActualityStatus, etc.
```

### With Values (Ethical Value Detection)
```turtle
@prefix tagteam: <http://tagteam.fandaws.org/ontology/> .
# Additional classes: ValueAssertionEvent, EthicalValueICE, etc.
```

---

## Alignment with Code Packages

| Code Package | Ontology |
|--------------|----------|
| tagteam-core | tagteam-core.ttl |
| tagteam-iee-values | tagteam-values.ttl |
| tagteam (combined) | tagteam.ttl |

---

## Validation

Run validation on individual ontologies:

```bash
# Validate core
robot report --input ontology/tagteam-core.ttl

# Validate values
robot report --input ontology/tagteam-values.ttl

# Validate combined
robot report --input ontology/tagteam.ttl
```

---

## Benefits

1. **Modularity** - Use only what you need
2. **Smaller Imports** - Core users don't need value vocabulary
3. **Clear Separation** - Domain-neutral vs IEE-specific terms
4. **Independent Evolution** - Values ontology can evolve separately
5. **Backwards Compatible** - Combined ontology still available
