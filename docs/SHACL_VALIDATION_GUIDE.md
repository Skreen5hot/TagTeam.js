# SHACL Validation Guide

This guide details the 8 SHACL validation patterns implemented in TagTeam Phase 4, certified at 5.0/5.0 BFO/CCO compliance.

---

## Overview

TagTeam's SHACL validator (`SHMLValidator`) enforces ontological correctness against 8 expert-certified patterns based on:

- **BFO** (Basic Formal Ontology)
- **CCO** (Common Core Ontologies)
- **SHML** (Semantic Health Markup Language) patterns

### Severity Levels

| Level | Description | Impact |
|-------|-------------|--------|
| **VIOLATION** | Must fix | Blocks compliance |
| **WARNING** | Should address | Degrades quality |
| **INFO** | Suggestion | Improves quality |

---

## Pattern 1: Information Staircase

### Purpose
Ensures ICE nodes properly link to their IBE foundation through the `is_concretized_by` relation.

### SHML Reference
```
ICE → (cco:is_concretized_by) → IBE → (cco:has_text_value) → xsd:string
```

### Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| ICE requires IBE link | WARNING | ICE should have `is_concretized_by` |
| IBE requires text value | WARNING | IBE should have `has_text_value` |

### Examples

**Valid:**
```json
{
  "@id": "inst:Autonomy_ICE",
  "@type": "tagteam:EthicalValueICE",
  "cco:is_concretized_by": "inst:Input_IBE"
}
```

**Invalid (missing link):**
```json
{
  "@id": "inst:Autonomy_ICE",
  "@type": "tagteam:EthicalValueICE"
  // Missing is_concretized_by → WARNING
}
```

### Fix
Add `cco:is_concretized_by` linking to the IBE node containing the source text.

---

## Pattern 2: Role Pattern

### Purpose
Ensures BFO roles have bearers and are properly realized in processes.

### SHML Reference
```
Role ← (bfo:inheres_in) ← IndependentContinuant
Role → (bfo:realized_in) → Process
```

### Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| Role requires bearer | **VIOLATION** | Role MUST have `inheres_in` |
| Bearer type check | WARNING | Bearer should be IndependentContinuant |
| Role realization | WARNING | Role should be realized in process |

### Examples

**Valid:**
```json
{
  "@id": "inst:Agent_Role",
  "@type": "bfo:Role",
  "rdfs:label": "AgentRole",
  "bfo:inheres_in": "inst:Doctor_Person",
  "bfo:realized_in": "inst:Treat_Act"
}
```

**Invalid (no bearer):**
```json
{
  "@id": "inst:Agent_Role",
  "@type": "bfo:Role",
  "rdfs:label": "AgentRole"
  // Missing inheres_in → VIOLATION
}
```

### Two Ways to Express Bearer Link

1. **On the role** (forward link):
   ```json
   { "@id": "inst:Role", "bfo:inheres_in": "inst:Person" }
   ```

2. **On the bearer** (reverse link):
   ```json
   { "@id": "inst:Person", "bfo:is_bearer_of": "inst:Role" }
   ```

Both are accepted by the validator.

### Non-Actual Acts

For deontic/prescribed acts (not yet actual), use:
```json
{
  "@id": "inst:Agent_Role",
  "tagteam:would_be_realized_in": "inst:Must_Decide_Act"
}
```

---

## Pattern 3: Designation Pattern

### Purpose
Validates proper name structures (designations for named entities).

### SHML Reference
```
DesignativeICE → (cco:designates) → IndependentContinuant
DesignativeICE → (cco:has_text_value) → name string
```

### Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| Designation requires designee | WARNING | Should link to entity |
| Designation requires text | WARNING | Should have text value |

### Examples

**Valid:**
```json
{
  "@id": "inst:DrSmith_Designation",
  "@type": "cco:InformationContentEntity",
  "rdfs:label": "DesignativeICE",
  "cco:has_text_value": "Dr. Smith",
  "cco:designates": "inst:DrSmith_Person"
}
```

---

## Pattern 4: Temporal Interval Pattern

### Purpose
Ensures temporal entities have proper start/end times.

### SHML Reference
```
TemporalInterval → (cco:has_start_time) → xsd:dateTime
TemporalInterval → (cco:has_end_time) → xsd:dateTime
```

### Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| Interval requires start time | WARNING | Should have start time |
| Instant requires value | WARNING | Should have timestamp |

### Examples

**Valid:**
```json
{
  "@id": "inst:Surgery_Time",
  "@type": "cco:TemporalInterval",
  "cco:has_start_time": "2026-01-19T10:00:00Z",
  "cco:has_end_time": "2026-01-19T14:00:00Z"
}
```

---

## Pattern 5: Measurement Pattern

### Purpose
Validates measurement structures with units and values.

### SHML Reference
```
QualityMeasurement → (cco:has_measurement_value) → xsd:decimal
QualityMeasurement → (cco:uses_measurement_unit) → MeasurementUnit
```

### Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| Measurement requires value | WARNING | Should have numeric value |
| Measurement requires unit | WARNING | Should have unit reference |

### Examples

**Valid:**
```json
{
  "@id": "inst:Temperature_Measurement",
  "@type": "cco:QualityMeasurement",
  "cco:has_measurement_value": 38.5,
  "cco:uses_measurement_unit": "inst:DegreeCelsius"
}
```

---

## Pattern 6: Socio-Primal Pattern

### Purpose
Validates Agent/Act relationships - the foundation of social/intentional semantics.

### SHML Reference
```
Agent ← (cco:has_agent) ← IntentionalAct
IntentionalAct → (cco:affects) → Patient
```

### Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| Agent linked to act | WARNING | Agent should have act |
| Act has agent | WARNING | Act should have agent |
| Act has temporal grounding | WARNING | Act should have temporal context |

### Examples

**Valid:**
```json
{
  "@id": "inst:Allocate_Act",
  "@type": "cco:IntentionalAct",
  "cco:has_agent": "inst:Doctor_Person",
  "cco:affects": "inst:Ventilator_Artifact",
  "cco:occurs_during": "inst:Decision_Time"
}
```

### Temporal Grounding Options

1. `cco:occurs_during` - Link to TemporalInterval
2. `tagteam:temporal_extent` - Direct timestamp

---

## Pattern 7: Domain/Range Validation

### Purpose
Ensures properties are used with correct subject/object types.

### Key Constraints

| Property | Domain | Range |
|----------|--------|-------|
| `cco:has_agent` | IntentionalAct | Agent |
| `cco:affects` | IntentionalAct | Entity |
| `bfo:inheres_in` | SpecificallyDependentContinuant | IndependentContinuant |
| `cco:realized_in` | RealizableEntity | Process |
| `cco:designates` | DesignativeICE | IndependentContinuant |

### Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| has_agent domain | WARNING | Should be on IntentionalAct |
| inheres_in range | WARNING | Should target IndependentContinuant |
| etc. | | |

### Examples

**Valid:**
```json
{
  "@id": "inst:Treat_Act",
  "@type": "cco:IntentionalAct",  // ✓ Correct domain
  "cco:has_agent": "inst:Doctor"   // ✓ cco:Person is an Agent
}
```

**Invalid:**
```json
{
  "@id": "inst:Quality",
  "@type": "bfo:BFO_0000019",
  "cco:has_agent": "inst:Doctor"   // ✗ has_agent on non-act
}
```

---

## Pattern 8: Vocabulary Validation

### Purpose
Catches typos and unknown terms in class names and predicates.

### Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| Unknown class | WARNING | Class not in known vocabulary |
| Unknown predicate | WARNING | Predicate not in known vocabulary |

### Known Vocabularies

**Prefixes:**
- `bfo:` - Basic Formal Ontology
- `cco:` - Common Core Ontologies
- `tagteam:` - TagTeam custom terms
- `owl:`, `rdf:`, `rdfs:`, `xsd:` - Standard

### Typo Detection

The validator uses Levenshtein distance to suggest corrections:

```
WARNING: Unknown predicate: tagteam:aserts
Suggestion: Check spelling. Similar: tagteam:asserts
```

### Adding Custom Terms

If you use custom properties, add them to the validator:

```javascript
// In SHMLValidator.js, KNOWN_PREDICATES set:
'tagteam:myCustomProperty'
```

---

## Compliance Score Calculation

The compliance score is calculated as:

```
Score = Σ(pattern_score × pattern_weight) - (violations × 10) - (warnings × 2)
```

Where:
- Each pattern contributes (passed/total × 100)
- Violations deduct 10 points each
- Warnings deduct 2 points each
- Final score capped at 0-100

### Target Scores

| Level | Score | Description |
|-------|-------|-------------|
| Production Ready | ≥90% | No violations, minimal warnings |
| Acceptable | ≥70% | Few warnings |
| Needs Work | ≥50% | Some violations or many warnings |
| Failing | <50% | Multiple violations |

---

## Strict Mode

Enable strict mode to treat warnings as violations:

```javascript
const validator = new SHMLValidator({ strictMode: true });
const report = validator.validate(graph);
// report.valid will be false if ANY warnings exist
```

---

## Using the Validator

### Basic Validation

```javascript
const SHMLValidator = require('./src/graph/SHMLValidator');

const validator = new SHMLValidator();
const graph = { '@context': {...}, '@graph': [...] };
const report = validator.validate(graph);

if (report.valid) {
  console.log('Graph is SHACL compliant!');
} else {
  console.log('Violations found:');
  report.violations.forEach(v => {
    console.log(`  [${v.pattern}] ${v.message}`);
    console.log(`    Fix: ${v.suggestion}`);
  });
}
```

### Formatted Report

```javascript
console.log(validator.formatReport(report));
```

### Programmatic Access

```javascript
// Pattern scores
report.patterns.InformationStaircase.score // 100
report.patterns.RolePattern.passed         // 5
report.patterns.RolePattern.total          // 6

// Issue counts
report.summary.violationCount  // 0
report.summary.warningCount    // 3

// Issue details
report.violations  // Array of VIOLATION issues
report.warnings    // Array of WARNING issues
report.info        // Array of INFO issues (if verbose)
```

---

## Fixing Common Issues

### "Role has no bearer"
```javascript
// Bad
{ "@id": "inst:Role", "@type": "bfo:Role", "rdfs:label": "AgentRole" }

// Good - add inheres_in
{ "@id": "inst:Role", "@type": "bfo:Role", "rdfs:label": "AgentRole",
  "bfo:inheres_in": "inst:Person" }
```

### "ICE has no is_concretized_by"
```javascript
// Bad
{ "@id": "inst:ICE", "@type": "tagteam:EthicalValueICE" }

// Good - link to IBE
{ "@id": "inst:ICE", "@type": "tagteam:EthicalValueICE",
  "cco:is_concretized_by": "inst:Input_IBE" }
```

### "Act has no temporal grounding"
```javascript
// Bad
{ "@id": "inst:Act", "@type": "cco:IntentionalAct" }

// Good - add temporal extent
{ "@id": "inst:Act", "@type": "cco:IntentionalAct",
  "tagteam:temporal_extent": "2026-01-19T12:00:00Z" }
```

### "Unknown predicate"
```javascript
// Check spelling first
"tagteam:aserts" → "tagteam:asserts"

// If intentional custom property, add to KNOWN_PREDICATES
```

---

## Pattern Coverage Summary

| Pattern | Rules | Critical Issues |
|---------|-------|-----------------|
| Information Staircase | 2 | ICE-IBE linkage |
| Role Pattern | 3 | Bearer necessity (VIOLATION) |
| Designation Pattern | 2 | Name structures |
| Temporal Interval | 2 | Time bounds |
| Measurement Pattern | 2 | Units and values |
| Socio-Primal Pattern | 3 | Agent-Act relations |
| Domain/Range | Variable | Property usage |
| Vocabulary | Variable | Typo detection |

---

## Expert Certification

These patterns were certified at **5.0/5.0 BFO/CCO Realist Compliance** on 2026-01-19.

Key achievements:
- Two-tier architecture (ICE/IC separation)
- Semantic honesty (assertions ≠ reality)
- Role inheres/realizes pattern
- Information Staircase (IBE → ICE → Assertion)
- GIT-Minimal provenance

---

## Further Reading

- [PHASE4_USER_GUIDE.md](PHASE4_USER_GUIDE.md) - Complete user guide
- [JSONLD_EXAMPLES.md](JSONLD_EXAMPLES.md) - Annotated output examples
- [BFO 2020 Reference](https://basic-formal-ontology.org/) - BFO specification
- [CCO Documentation](https://github.com/CommonCoreOntology/CommonCoreOntologies) - CCO reference
