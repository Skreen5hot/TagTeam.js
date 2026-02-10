# Golden Test Case Schema v2.0

**Version:** 2.0
**Schema File:** [test-case-schema-v2.json](schemas/test-case-schema-v2.json)
**Created:** 2026-02-09

---

## Overview

This document describes the JSON schema for TagTeam golden test cases version 2.0.

---

## Corpus-Level Schema

### Required Fields

```json
{
  "version": "2.0",                    // Schema version
  "corpusId": "interpretation-lattice", // Unique corpus identifier
  "description": "Test cases for...",  // Human-readable description
  "metadata": { /* ... */ },           // Corpus metadata
  "cases": [ /* ... */ ]               // Array of test cases
}
```

### Metadata Object

```json
"metadata": {
  "created": "2026-02-09",             // Creation date (YYYY-MM-DD)
  "lastUpdated": "2026-02-09",         // Last update date
  "author": "TagTeam Core Team",       // Author/team name
  "phase": "6.1-6.4",                  // Roadmap phase
  "priority": "P0",                    // Corpus priority (P0/P1/P2)
  "notes": "Optional notes..."         // Additional context (optional)
}
```

---

## Test Case Schema

### Minimal Test Case

```json
{
  "id": "lattice-001",
  "category": "deontic-epistemic-ambiguity",
  "input": "The doctor should prioritize the younger patient",
  "expectedOutput": {
    "modality": "obligation"
  },
  "tags": ["modal", "deontic"],
  "priority": "P0"
}
```

### Complete Test Case

```json
{
  "id": "lattice-001",
  "category": "deontic-epistemic-ambiguity",
  "input": "The doctor should prioritize the younger patient",

  "expectedOutput": {
    "defaultReading": {
      "interpretationType": "deontic",
      "gloss": "obligation to prioritize",
      "modality": "obligation",
      "actualityStatus": "tagteam:Prescribed"
    },
    "alternativeReadings": [
      {
        "interpretationType": "epistemic",
        "gloss": "expectation of prioritizing",
        "modality": "expectation",
        "actualityStatus": "tagteam:Hypothetical",
        "plausibility": 0.3
      }
    ],
    "ambiguityType": "modal_force",
    "ambiguityPreserved": true,
    "minReadings": 2,
    "maxReadings": 3
  },

  "validationRules": {
    "mustHaveDefaultReading": true,
    "mustHaveAlternatives": true,
    "minAlternatives": 1,
    "maxAlternatives": 2,
    "defaultPlausibility": { "min": 0.6, "max": 1.0 },
    "alternativePlausibility": { "min": 0.2, "max": 0.5 },
    "tolerance": 0.1
  },

  "tags": ["ambiguity", "modal", "deontic", "epistemic", "medical"],
  "priority": "P0",
  "phase": "6.1",
  "relatedIssues": ["#123"],
  "notes": "Classic deontic-epistemic ambiguity...",
  "disabled": false,
  "disabledReason": null
}
```

---

## Field Reference

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Unique identifier (lowercase, hyphens) | `"lattice-001"` |
| `category` | string | Test category | `"deontic-epistemic-ambiguity"` |
| `input` | string | Input text to parse | `"The doctor decided..."` |
| `expectedOutput` | object | Expected parsing results | `{ "modality": "obligation" }` |
| `tags` | array\<string\> | Tags for filtering/categorization | `["modal", "deontic"]` |
| `priority` | enum | Priority level: P0, P1, P2 | `"P0"` |

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `validationRules` | object | Validation configuration | `{ "tolerance": 0.1 }` |
| `phase` | string | Roadmap phase | `"6.1"` |
| `relatedIssues` | array\<string\> | GitHub issue IDs | `["#123", "#456"]` |
| `notes` | string | Explanation and context | `"Tests modal ambiguity..."` |
| `disabled` | boolean | Whether test is disabled | `false` |
| `disabledReason` | string | Reason for disabling | `"Known bug #789"` |

---

## Expected Output Formats

The `expectedOutput` structure varies by test type. Here are common patterns:

### 1. Interpretation Lattice (Phase 6)

```json
"expectedOutput": {
  "defaultReading": {
    "interpretationType": "deontic",
    "modality": "obligation",
    "actualityStatus": "tagteam:Prescribed",
    "plausibility": 0.7
  },
  "alternativeReadings": [
    {
      "interpretationType": "epistemic",
      "modality": "expectation",
      "actualityStatus": "tagteam:Hypothetical",
      "plausibility": 0.3
    }
  ],
  "ambiguityType": "modal_force",
  "ambiguityPreserved": true
}
```

### 2. Selectional Preferences (Phase 6.0)

```json
"expectedOutput": {
  "verb": "decide",
  "subject": { "label": "doctor", "type": "cco:Person" },
  "subjectValid": true,
  "subjectConfidence": 0.95,
  "selectionalViolation": false
}
```

### 3. Ethical Values (IEE Week 2b)

```json
"expectedOutput": {
  "detectedValues": [
    {
      "name": "Autonomy",
      "polarity": 1,
      "salience": 0.85,
      "domain": "Dignity"
    },
    {
      "name": "Life",
      "polarity": 0,
      "salience": 0.75,
      "domain": "Dignity"
    }
  ],
  "conflicts": [
    {
      "value1": "Autonomy",
      "value2": "Life",
      "intensity": 0.6
    }
  ],
  "dominantDomain": "Dignity"
}
```

### 4. Context Intensity (IEE Week 2a)

```json
"expectedOutput": {
  "temporal": {
    "urgency": 0.8,
    "duration": 0.6,
    "reversibility": 0.3
  },
  "relational": {
    "intimacy": 0.9,
    "powerDifferential": 0.5,
    "trust": 0.7
  },
  "consequential": {
    "harmSeverity": 0.9,
    "benefitMagnitude": 0.4,
    "scope": 0.7
  },
  "epistemic": {
    "certainty": 0.6,
    "informationCompleteness": 0.5,
    "expertise": 0.8
  }
}
```

### 5. Semantic Roles (IEE Week 1)

```json
"expectedOutput": {
  "semanticFrame": "Deciding",
  "agent": {
    "text": "family",
    "entity": "family",
    "role": "Agent"
  },
  "theme": {
    "text": "treatment",
    "entity": "treatment",
    "role": "Theme"
  },
  "modality": "must",
  "tense": "present"
}
```

### 6. Definiteness (Phase 8.5.1)

```json
"expectedOutput": {
  "entity": "ventilator",
  "definiteness": "definite",
  "determiner": "the",
  "modifiers": ["last"],
  "scarcityMarker": "last"
}
```

### 7. Voice Transformation (v1)

```json
"expectedOutput": {
  "voice": "passive",
  "agent": {
    "text": "the doctor",
    "role": "Agent",
    "position": "byPhrase"
  },
  "patient": {
    "text": "the patient",
    "role": "Patient",
    "position": "subject"
  }
}
```

---

## Validation Rules

### Purpose

Validation rules allow flexible comparison when exact matching is too strict.

### Available Rules

```json
"validationRules": {
  // Structural requirements
  "mustHaveDefaultReading": true,
  "mustHaveAlternatives": true,
  "minAlternatives": 1,
  "maxAlternatives": 2,

  // Numeric ranges
  "defaultPlausibility": {
    "min": 0.6,
    "max": 1.0
  },
  "alternativePlausibility": {
    "min": 0.2,
    "max": 0.5
  },

  // Tolerance for floating point comparisons
  "tolerance": 0.1,

  // Custom rules (extensible)
  "customRule": "value"
}
```

### Example Usage

**Scenario:** Testing plausibility scores, which may vary slightly (±0.1)

```json
{
  "id": "lattice-003",
  "input": "The committee might decide tomorrow",
  "expectedOutput": {
    "plausibility": 0.7
  },
  "validationRules": {
    "tolerance": 0.1  // Accept 0.6 - 0.8
  }
}
```

---

## Tag Taxonomy

### Linguistic Features

| Tag | Description |
|-----|-------------|
| `modal` | Modal verbs (should, must, can, may, might) |
| `deontic` | Deontic modality (obligation, permission, prohibition) |
| `epistemic` | Epistemic modality (possibility, necessity, expectation) |
| `negation` | Negation (not, never, no) |
| `passive` | Passive voice |
| `active` | Active voice |
| `definite` | Definite NPs (the patient) |
| `indefinite` | Indefinite NPs (a patient) |
| `temporal` | Temporal expressions |
| `scope` | Scope ambiguity |
| `ambiguity` | General ambiguity |

### Domains

| Tag | Description |
|-----|-------------|
| `medical` | Medical ethics scenarios |
| `legal` | Legal scenarios |
| `business` | Business scenarios |
| `ethical` | Ethical dilemmas |

### Phases

| Tag | Description |
|-----|-------------|
| `phase-4` | Phase 4 (JSON-LD) |
| `phase-5` | Phase 5 (NLP Foundation) |
| `phase-6` | Phase 6 (Interpretation Lattice) |
| `phase-7` | Phase 7 (Epistemic Layer) |
| `v1` | v1 scope contract |
| `v2` | v2 features |

### IEE

| Tag | Description |
|-----|-------------|
| `week1` | IEE Week 1 (semantic roles) |
| `week2a` | IEE Week 2a (context intensity) |
| `week2b` | IEE Week 2b (value detection) |
| `value-detection` | Value detection tests |

---

## Priority Levels

### P0: Critical

**When to use:**
- Core v1 features
- Blocking v1 release
- IEE integration requirements
- High-frequency scenarios

**Examples:**
- Passive voice transformation
- Deontic modal detection
- Basic value detection

### P1: High

**When to use:**
- Important features
- Should have for v1
- Common scenarios
- Known regressions

**Examples:**
- Edge case handling
- Less common modals
- Secondary features

### P2: Medium

**When to use:**
- Nice to have
- Low frequency scenarios
- Future enhancements
- Experimental features

**Examples:**
- Rare linguistic phenomena
- Performance tests
- Documentation examples

---

## Examples by Corpus Type

### Phase-Specific: Interpretation Lattice

```json
{
  "id": "lattice-001",
  "category": "deontic-epistemic-ambiguity",
  "input": "The doctor should prioritize the younger patient",
  "expectedOutput": {
    "defaultReading": {
      "modality": "obligation",
      "actualityStatus": "tagteam:Prescribed"
    },
    "alternativeReadings": [
      {
        "modality": "expectation",
        "actualityStatus": "tagteam:Hypothetical",
        "plausibility": 0.3
      }
    ],
    "ambiguityType": "modal_force",
    "ambiguityPreserved": true
  },
  "tags": ["ambiguity", "modal", "deontic", "epistemic", "medical"],
  "priority": "P0",
  "phase": "6.1",
  "notes": "Classic deontic-epistemic ambiguity. Should default to deontic."
}
```

### Feature-Specific: Definiteness

```json
{
  "id": "def-001",
  "category": "definite-np-with-modifiers",
  "input": "The last ventilator is available",
  "expectedOutput": {
    "entity": "ventilator",
    "definiteness": "definite",
    "determiner": "the",
    "modifiers": ["last"],
    "scarcityMarker": "last"
  },
  "tags": ["definite", "scarcity", "medical"],
  "priority": "P0",
  "phase": "8.5.1",
  "notes": "Tests definiteness with scarcity modifier 'last'."
}
```

### v1-Acceptance: Core Features

```json
{
  "id": "v1-core-001",
  "category": "passive-voice-transformation",
  "input": "The patient was treated by the doctor",
  "expectedOutput": {
    "voice": "passive",
    "agent": {
      "text": "the doctor",
      "role": "Agent",
      "position": "byPhrase"
    },
    "patient": {
      "text": "the patient",
      "role": "Patient",
      "position": "subject"
    }
  },
  "tags": ["passive", "voice", "v1", "core-feature"],
  "priority": "P0",
  "notes": "v1 core: passive voice with by-phrase agent."
}
```

### IEE-Integration: Ethical Values

```json
{
  "id": "values-001",
  "category": "value-conflict",
  "input": "The family must decide whether to continue treatment",
  "expectedOutput": {
    "detectedValues": [
      { "name": "Autonomy", "polarity": 1, "salience": 0.85, "domain": "Dignity" },
      { "name": "Life", "polarity": 0, "salience": 0.75, "domain": "Dignity" }
    ],
    "conflicts": [
      { "value1": "Autonomy", "value2": "Life", "intensity": 0.6 }
    ],
    "dominantDomain": "Dignity"
  },
  "tags": ["value-detection", "conflict", "week2b", "medical-ethics"],
  "priority": "P0",
  "notes": "Tests Autonomy vs Life value conflict in end-of-life scenario."
}
```

### Regression: Known Issue

```json
{
  "id": "reg-phase6-001",
  "category": "ambiguity-resolution-failure",
  "input": "The organization of files was efficient",
  "expectedOutput": {
    "ambiguityType": "noun_category",
    "ambiguityPreserved": true
  },
  "tags": ["regression", "phase-6", "noun-category"],
  "priority": "P1",
  "phase": "6",
  "relatedIssues": ["#456"],
  "notes": "Known issue: fails to disambiguate 'organization' as process vs entity.",
  "disabled": false
}
```

---

## Schema Validation

### Command

```bash
npm run validate:schema
```

### Validation Process

1. Validates JSON syntax
2. Validates against JSON Schema
3. Checks for duplicate test IDs
4. Verifies tag taxonomy
5. Validates priority levels

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid JSON syntax` | Missing comma, quote, bracket | Fix syntax |
| `Missing required field` | Required field omitted | Add field |
| `Invalid priority` | Priority not P0/P1/P2 | Use valid priority |
| `Duplicate test ID` | ID already exists | Choose unique ID |
| `Empty tags array` | No tags provided | Add at least one tag |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-02-09 | Initial schema with validation rules |
| 1.0 | 2026-01-26 | Original selectional corpus schema |

---

## See Also

- [README.md](README.md) - Golden test corpus overview
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to add test cases
- [test-case-schema-v2.json](schemas/test-case-schema-v2.json) - JSON Schema definition
- [corpus-index.json](corpus-index.json) - Master corpus index

---

*Golden Test Case Schema v2.0 - TagTeam.js*
