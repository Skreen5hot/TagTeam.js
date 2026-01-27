# Phase 6.4.5 Implementation Plan: OntologyValidator

**Version:** 1.0
**Created:** 2026-01-26
**Status:** Planning
**Priority:** High
**Effort:** Medium

---

## Overview

### What is the OntologyValidator?

The OntologyValidator ensures that ontology files (JSON configs and later TTL files) are structurally sound, semantically valid, and compatible with TagTeam's BFO/CCO foundation before they're loaded into the system.

**Key Insight:** Garbage in, garbage out. Invalid or inconsistent ontologies will cause misclassifications, runtime errors, or silent failures. Validation catches these issues early.

### Why Phase 6.4.5?

This phase sits between Phase 6.4 (SemanticGraphBuilder Integration) and Phase 6.5 (TTL Loading):

```
Phase 6.4:                 Phase 6.4.5:              Phase 6.5:
┌────────────────────┐     ┌────────────────────┐    ┌────────────────────┐
│ Builder Integration│  →  │ OntologyValidator  │ →  │ TTL Parser         │
│ (preserveAmbiguity)│     │ (validate configs) │    │ (load TTL files)   │
└────────────────────┘     └────────────────────┘    └────────────────────┘
```

**Why before TTL loading:**
- Establishes validation patterns for JSON configs first (simpler)
- TTL parser can reuse the same validation framework
- Catches issues in existing configs before adding complexity
- Provides foundation for ValueNet integration validation

---

## Validation Architecture

### Two-Mode Operation

**Option B: Validate on Load (Non-Blocking)**
```javascript
// Load with warnings - default behavior
const result = await TagTeam.loadOntology('./custom.json');
if (result._validation.hasWarnings()) {
  console.log(result._validation.warnings);
}
// Ontology is loaded, but flagged
```

**Option C: Explicit Validation (Blocking Available)**
```javascript
// Validate before loading
const report = TagTeam.validateOntology('./custom.json');
if (report.hasErrors()) {
  console.log(report.errors);
  return; // Don't load
}
// Safe to load
await TagTeam.loadOntology('./custom.json');
```

### Validation Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    OntologyValidator                             │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Structural Validation                                  │
│  ├── JSON/TTL syntax valid                                      │
│  ├── Required fields present                                    │
│  ├── Field types correct                                        │
│  └── No malformed values                                        │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Semantic Validation                                    │
│  ├── IRI format valid (cco:, bfo:, custom:)                    │
│  ├── Referenced types exist in BFO/CCO                         │
│  ├── BFO hierarchy respected                                    │
│  └── No circular dependencies                                   │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Compatibility Validation                               │
│  ├── No conflicts with loaded ontologies                        │
│  ├── Namespace prefixes don't collide                          │
│  ├── Term mappings don't contradict                            │
│  └── Selectional preferences coherent                          │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: TagTeam-Specific Validation                           │
│  ├── Config structure matches expected schema                   │
│  ├── Verb overrides have valid structure                       │
│  ├── Type specializations use known base types                 │
│  └── Value definitions have required fields                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Class Interface

```javascript
class OntologyValidator {
  /**
   * Create an OntologyValidator
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      strictMode: false,           // Treat warnings as errors
      allowUnknownTypes: true,     // Allow types not in BFO/CCO
      validateReferences: true,    // Check that referenced types exist
      checkCompatibility: true,    // Check against loaded ontologies
      ...options
    };
  }

  // ==================== Primary API ====================

  /**
   * Validate an ontology file or object
   * @param {string|Object} source - File path or config object
   * @param {Object} options - Validation options
   * @returns {ValidationReport} Validation results
   */
  validate(source, options = {}) { }

  /**
   * Validate a JSON domain config
   * @param {Object} config - Domain config object
   * @returns {ValidationReport}
   */
  validateDomainConfig(config) { }

  /**
   * Validate a TTL ontology (Phase 6.5)
   * @param {string} ttlContent - TTL file content
   * @returns {ValidationReport}
   */
  validateTTL(ttlContent) { }

  /**
   * Check compatibility with already-loaded ontologies
   * @param {Object} newConfig - Config to check
   * @param {Array} loadedConfigs - Already loaded configs
   * @returns {ValidationReport}
   */
  checkCompatibility(newConfig, loadedConfigs) { }

  // ==================== Layer 1: Structural ====================

  /**
   * Validate JSON structure
   * @param {Object} config - Config to validate
   * @returns {Array<ValidationIssue>}
   */
  validateStructure(config) { }

  /**
   * Check required fields are present
   * @param {Object} config
   * @returns {Array<ValidationIssue>}
   */
  checkRequiredFields(config) { }

  /**
   * Validate field types match expected schema
   * @param {Object} config
   * @returns {Array<ValidationIssue>}
   */
  checkFieldTypes(config) { }

  // ==================== Layer 2: Semantic ====================

  /**
   * Validate IRI format
   * @param {string} iri - IRI to validate
   * @returns {ValidationIssue|null}
   */
  validateIRI(iri) { }

  /**
   * Check if type exists in BFO/CCO
   * @param {string} typeIRI - Type IRI to check
   * @returns {ValidationIssue|null}
   */
  checkTypeExists(typeIRI) { }

  /**
   * Validate BFO hierarchy (Occurrent vs Continuant)
   * @param {Object} mapping - Type mapping to check
   * @returns {Array<ValidationIssue>}
   */
  validateBFOHierarchy(mapping) { }

  /**
   * Detect circular dependencies
   * @param {Object} config
   * @returns {Array<ValidationIssue>}
   */
  detectCircularDependencies(config) { }

  // ==================== Layer 3: Compatibility ====================

  /**
   * Check for namespace collisions
   * @param {Object} newConfig
   * @param {Array} existingConfigs
   * @returns {Array<ValidationIssue>}
   */
  checkNamespaceCollisions(newConfig, existingConfigs) { }

  /**
   * Check for term mapping conflicts
   * @param {Object} newConfig
   * @param {Array} existingConfigs
   * @returns {Array<ValidationIssue>}
   */
  checkTermConflicts(newConfig, existingConfigs) { }

  // ==================== Layer 4: TagTeam-Specific ====================

  /**
   * Validate verb override structure
   * @param {Object} verbOverrides
   * @returns {Array<ValidationIssue>}
   */
  validateVerbOverrides(verbOverrides) { }

  /**
   * Validate type specialization structure
   * @param {Object} typeSpecs
   * @returns {Array<ValidationIssue>}
   */
  validateTypeSpecializations(typeSpecs) { }

  /**
   * Validate value definition structure (for ValueNet)
   * @param {Object} valueDef
   * @returns {Array<ValidationIssue>}
   */
  validateValueDefinition(valueDef) { }
}
```

### ValidationReport Structure

```javascript
class ValidationReport {
  constructor() {
    this.errors = [];      // Must fix - loading may fail
    this.warnings = [];    // Should fix - may cause issues
    this.info = [];        // Suggestions - optional improvements
    this.valid = true;     // Overall validity
    this.timestamp = new Date().toISOString();
  }

  hasErrors() { return this.errors.length > 0; }
  hasWarnings() { return this.warnings.length > 0; }
  isValid() { return this.valid; }

  addError(issue) {
    this.errors.push(issue);
    this.valid = false;
  }

  addWarning(issue) {
    this.warnings.push(issue);
  }

  addInfo(issue) {
    this.info.push(issue);
  }

  toJSON() {
    return {
      valid: this.valid,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      errors: this.errors,
      warnings: this.warnings,
      info: this.info,
      timestamp: this.timestamp
    };
  }

  toString() {
    const lines = [`Validation Report (${this.valid ? 'VALID' : 'INVALID'})`];
    if (this.errors.length) {
      lines.push(`Errors (${this.errors.length}):`);
      this.errors.forEach(e => lines.push(`  ❌ ${e.message}`));
    }
    if (this.warnings.length) {
      lines.push(`Warnings (${this.warnings.length}):`);
      this.warnings.forEach(w => lines.push(`  ⚠️ ${w.message}`));
    }
    return lines.join('\n');
  }
}
```

### ValidationIssue Structure

```javascript
{
  code: 'MISSING_REQUIRED_FIELD',    // Machine-readable code
  severity: 'error',                  // 'error' | 'warning' | 'info'
  message: 'Missing required field: domain',
  path: 'config.domain',             // JSON path to issue
  value: undefined,                   // Actual value found
  expected: 'string',                // Expected value/type
  suggestion: 'Add a "domain" field with your domain name'
}
```

---

## Validation Rules

### Layer 1: Structural Validation

| Code | Severity | Condition | Message |
|------|----------|-----------|---------|
| `INVALID_JSON` | error | JSON parse fails | "Invalid JSON syntax: {parseError}" |
| `MISSING_DOMAIN` | error | No `domain` field | "Missing required field: domain" |
| `MISSING_VERSION` | error | No `version` field | "Missing required field: version" |
| `INVALID_DOMAIN_TYPE` | error | `domain` not string | "Field 'domain' must be a string" |
| `INVALID_VERSION_TYPE` | error | `version` not string | "Field 'version' must be a string" |
| `EMPTY_DOMAIN` | warning | `domain` is empty | "Field 'domain' should not be empty" |
| `INVALID_TYPE_SPECS` | warning | `typeSpecializations` not object | "typeSpecializations should be an object" |
| `INVALID_VERB_OVERRIDES` | warning | `verbOverrides` not object | "verbOverrides should be an object" |

### Layer 2: Semantic Validation

| Code | Severity | Condition | Message |
|------|----------|-----------|---------|
| `INVALID_IRI_FORMAT` | error | IRI has invalid characters | "Invalid IRI format: {iri}" |
| `UNKNOWN_PREFIX` | warning | Prefix not in known set | "Unknown namespace prefix: {prefix}" |
| `UNKNOWN_BFO_TYPE` | warning | Type not in BFO/CCO | "Type '{type}' not found in BFO/CCO" |
| `HIERARCHY_VIOLATION` | error | Occurrent mapped to Continuant | "'{term}' maps to Occurrent but base is Continuant" |
| `CIRCULAR_DEPENDENCY` | error | A → B → A detected | "Circular dependency detected: {chain}" |
| `INVALID_TYPE_IRI` | warning | Type IRI malformed | "Type IRI '{iri}' may be malformed" |

### Layer 3: Compatibility Validation

| Code | Severity | Condition | Message |
|------|----------|-----------|---------|
| `NAMESPACE_COLLISION` | warning | Same prefix, different URI | "Namespace '{prefix}' already defined with different URI" |
| `TERM_CONFLICT` | warning | Term → different types | "Term '{term}' already maps to '{existingType}'" |
| `DOMAIN_CONFLICT` | warning | Same domain name | "Domain '{domain}' already loaded" |
| `VERB_OVERRIDE_CONFLICT` | info | Verb already overridden | "Verb '{verb}' override will replace existing" |

### Layer 4: TagTeam-Specific Validation

| Code | Severity | Condition | Message |
|------|----------|-----------|---------|
| `INVALID_VERB_STRUCTURE` | warning | Missing verb override keys | "Verb '{verb}' missing 'default' key" |
| `UNKNOWN_VERB_KEY` | info | Unexpected verb override key | "Unknown key '{key}' in verb '{verb}'" |
| `INVALID_PROCESS_ROOT` | warning | processRootWords not strings | "processRootWords values must be strings" |
| `VALUE_MISSING_KEYWORDS` | error | Value def has no keywords | "Value definition '{name}' missing keywords" |
| `VALUE_MISSING_LABEL` | warning | Value def has no label | "Value definition '{name}' missing rdfs:label" |

---

## Known BFO/CCO Types Registry

```javascript
const KNOWN_BFO_TYPES = {
  // BFO Top Level
  'bfo:Entity': { category: 'top' },
  'bfo:Continuant': { category: 'continuant', parent: 'bfo:Entity' },
  'bfo:Occurrent': { category: 'occurrent', parent: 'bfo:Entity' },

  // BFO Continuants
  'bfo:IndependentContinuant': { category: 'continuant', parent: 'bfo:Continuant' },
  'bfo:MaterialEntity': { category: 'continuant', parent: 'bfo:IndependentContinuant' },
  'bfo:Object': { category: 'continuant', parent: 'bfo:MaterialEntity' },
  'bfo:Quality': { category: 'continuant', parent: 'bfo:Continuant' },
  'bfo:Role': { category: 'continuant', parent: 'bfo:Continuant' },
  'bfo:Disposition': { category: 'continuant', parent: 'bfo:Continuant' },

  // BFO Occurrents
  'bfo:Process': { category: 'occurrent', parent: 'bfo:Occurrent' },
  'bfo:TemporalRegion': { category: 'occurrent', parent: 'bfo:Occurrent' },

  // CCO Agents
  'cco:Person': { category: 'continuant', parent: 'bfo:Object' },
  'cco:Organization': { category: 'continuant', parent: 'bfo:Object' },
  'cco:GroupOfPersons': { category: 'continuant', parent: 'bfo:Object' },
  'cco:Agent': { category: 'continuant', parent: 'bfo:Object' },

  // CCO Acts (Occurrents)
  'cco:IntentionalAct': { category: 'occurrent', parent: 'bfo:Process' },
  'cco:ActOfCommunication': { category: 'occurrent', parent: 'cco:IntentionalAct' },
  'cco:ActOfTransferOfPossession': { category: 'occurrent', parent: 'cco:IntentionalAct' },
  'cco:ActOfCare': { category: 'occurrent', parent: 'cco:IntentionalAct' },
  'cco:ActOfService': { category: 'occurrent', parent: 'cco:IntentionalAct' },
  'cco:ActOfMeasurement': { category: 'occurrent', parent: 'cco:IntentionalAct' },

  // CCO Artifacts
  'cco:Artifact': { category: 'continuant', parent: 'bfo:Object' },
  'cco:InformationBearingArtifact': { category: 'continuant', parent: 'cco:Artifact' },
  'cco:Document': { category: 'continuant', parent: 'cco:InformationBearingArtifact' },

  // CCO Information
  'cco:InformationContentEntity': { category: 'continuant', parent: 'bfo:GenericallyDependentContinuant' },
  'cco:DesignativeInformationContentEntity': { category: 'continuant', parent: 'cco:InformationContentEntity' }
};

const KNOWN_PREFIXES = {
  'bfo': 'http://purl.obolibrary.org/obo/BFO_',
  'cco': 'http://www.ontologyrepository.com/CommonCoreOntologies/',
  'tagteam': 'http://purl.org/tagteam#',
  'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
  'owl': 'http://www.w3.org/2002/07/owl#',
  'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
};
```

---

## Test-Driven Development Plan

### Test File Structure

```
tests/
├── unit/
│   └── phase6/
│       ├── selectional-preferences.test.js  # Phase 6.0 (done)
│       ├── ambiguity-resolver.test.js       # Phase 6.1 (done)
│       ├── interpretation-lattice.test.js   # Phase 6.2 (done)
│       ├── alternative-graph-builder.test.js # Phase 6.3 (done)
│       └── ontology-validator.test.js       # Phase 6.4.5 (new)
```

### Test Categories

#### Category 1: Basic Validation (10 tests)

| Test ID | Input | Expected | Priority |
|---------|-------|----------|----------|
| BV-001 | Empty constructor | Creates validator with defaults | P0 |
| BV-002 | Valid minimal config | Returns valid report | P0 |
| BV-003 | Missing domain field | Error: MISSING_DOMAIN | P0 |
| BV-004 | Missing version field | Error: MISSING_VERSION | P0 |
| BV-005 | Invalid JSON string | Error: INVALID_JSON | P0 |
| BV-006 | Empty domain value | Warning: EMPTY_DOMAIN | P0 |
| BV-007 | Custom options applied | strictMode works | P1 |
| BV-008 | Null input | Error gracefully | P1 |
| BV-009 | Non-object input | Error: expected object | P1 |
| BV-010 | Full valid medical config | No errors or warnings | P0 |

#### Category 2: Structural Validation (10 tests)

| Test ID | Input | Expected | Priority |
|---------|-------|----------|----------|
| SV-001 | typeSpecializations not object | Warning | P0 |
| SV-002 | verbOverrides not object | Warning | P0 |
| SV-003 | processRootWords not object | Warning | P1 |
| SV-004 | domain not string | Error | P0 |
| SV-005 | version not string | Error | P0 |
| SV-006 | Nested type spec invalid | Warning | P1 |
| SV-007 | Verb override missing default | Warning | P1 |
| SV-008 | Extra unknown fields | Info (not error) | P2 |
| SV-009 | Empty typeSpecializations | Valid (no warning) | P1 |
| SV-010 | Deeply nested invalid | Catches nested errors | P1 |

#### Category 3: IRI Validation (10 tests)

| Test ID | Input | Expected | Priority |
|---------|-------|----------|----------|
| IR-001 | Valid cco: prefix | Valid | P0 |
| IR-002 | Valid bfo: prefix | Valid | P0 |
| IR-003 | Unknown prefix xyz: | Warning: UNKNOWN_PREFIX | P0 |
| IR-004 | Empty IRI | Error: INVALID_IRI_FORMAT | P0 |
| IR-005 | IRI with spaces | Error: INVALID_IRI_FORMAT | P0 |
| IR-006 | Full URI format | Valid | P1 |
| IR-007 | Mixed case prefix | Warning | P2 |
| IR-008 | tagteam: prefix | Valid (known) | P1 |
| IR-009 | Custom prefix with declaration | Valid | P1 |
| IR-010 | Numeric-only local name | Warning | P2 |

#### Category 4: BFO Hierarchy Validation (10 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| BH-001 | Type extends correct parent | Valid | P0 |
| BH-002 | Occurrent mapped to Continuant base | Error: HIERARCHY_VIOLATION | P0 |
| BH-003 | Continuant mapped to Occurrent base | Error: HIERARCHY_VIOLATION | P0 |
| BH-004 | Unknown type with allowUnknownTypes | Valid (warning) | P0 |
| BH-005 | Unknown type without allowUnknownTypes | Error | P0 |
| BH-006 | Valid CCO subtype of BFO | Valid | P1 |
| BH-007 | Process specialization | Valid | P1 |
| BH-008 | Role specialization | Valid | P1 |
| BH-009 | Quality specialization | Valid | P1 |
| BH-010 | Check all medical.json types | All valid | P0 |

#### Category 5: Compatibility Validation (10 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| CV-001 | No conflicts with empty loaded | Valid | P0 |
| CV-002 | Same domain name | Warning: DOMAIN_CONFLICT | P0 |
| CV-003 | Same term → different type | Warning: TERM_CONFLICT | P0 |
| CV-004 | Same term → same type | Valid (no conflict) | P0 |
| CV-005 | Different domains, no overlap | Valid | P1 |
| CV-006 | Namespace prefix collision | Warning: NAMESPACE_COLLISION | P1 |
| CV-007 | Verb override conflict | Info (not error) | P1 |
| CV-008 | Multiple loaded configs | Checks all | P1 |
| CV-009 | Compatible overlapping terms | Valid | P2 |
| CV-010 | checkCompatibility disabled | Skips checks | P1 |

#### Category 6: Verb Override Validation (8 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| VO-001 | Valid verb override | Valid | P0 |
| VO-002 | Missing default key | Warning | P0 |
| VO-003 | Unknown override key | Info | P1 |
| VO-004 | Invalid override value type | Warning | P1 |
| VO-005 | All medical.json verbs valid | Valid | P0 |
| VO-006 | Empty verb override | Warning | P1 |
| VO-007 | Verb with all keys | Valid | P1 |
| VO-008 | Override value not string | Warning | P1 |

#### Category 7: ValidationReport API (8 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| VR-001 | hasErrors() with errors | Returns true | P0 |
| VR-002 | hasErrors() without errors | Returns false | P0 |
| VR-003 | hasWarnings() with warnings | Returns true | P0 |
| VR-004 | isValid() with errors | Returns false | P0 |
| VR-005 | isValid() without errors | Returns true | P0 |
| VR-006 | toJSON() structure | Correct format | P0 |
| VR-007 | toString() output | Human readable | P1 |
| VR-008 | addError() sets valid false | valid = false | P0 |

#### Category 8: Integration with DomainConfigLoader (6 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| IL-001 | Validate before load | Report before loading | P0 |
| IL-002 | Load with validation (Option B) | Loads + includes report | P0 |
| IL-003 | strictMode blocks invalid | Throws on errors | P1 |
| IL-004 | Non-strict loads with warnings | Loads despite warnings | P1 |
| IL-005 | _validation in load result | Report accessible | P0 |
| IL-006 | Existing medical.json passes | No errors | P0 |

#### Category 9: Edge Cases (8 tests)

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| EC-001 | Very large config | Completes in reasonable time | P2 |
| EC-002 | Circular type reference | Detects cycle | P1 |
| EC-003 | Unicode in IRIs | Handles correctly | P2 |
| EC-004 | Config with 100+ terms | All validated | P2 |
| EC-005 | Null values in mappings | Warning | P1 |
| EC-006 | Array instead of object | Error | P1 |
| EC-007 | Number as type mapping | Error | P1 |
| EC-008 | Validate file path (string) | Loads and validates | P1 |

---

## Acceptance Criteria

### Functional Criteria

- [ ] **AC-001:** Constructor accepts options and applies defaults
- [ ] **AC-002:** `validate()` accepts both file paths and config objects
- [ ] **AC-003:** `validateDomainConfig()` validates JSON domain configs
- [ ] **AC-004:** `checkRequiredFields()` catches missing domain/version
- [ ] **AC-005:** `checkFieldTypes()` validates field types
- [ ] **AC-006:** `validateIRI()` validates IRI format
- [ ] **AC-007:** `checkTypeExists()` checks against BFO/CCO registry
- [ ] **AC-008:** `validateBFOHierarchy()` detects Occurrent/Continuant violations
- [ ] **AC-009:** `checkCompatibility()` detects conflicts with loaded configs
- [ ] **AC-010:** `validateVerbOverrides()` validates verb structure

### ValidationReport Criteria

- [ ] **AC-011:** ValidationReport has errors, warnings, info arrays
- [ ] **AC-012:** `hasErrors()` returns correct boolean
- [ ] **AC-013:** `hasWarnings()` returns correct boolean
- [ ] **AC-014:** `isValid()` returns false if errors exist
- [ ] **AC-015:** `toJSON()` produces correct structure
- [ ] **AC-016:** `toString()` produces readable output

### Integration Criteria

- [ ] **AC-017:** Option B: Loads with validation report attached
- [ ] **AC-018:** Option C: `validateOntology()` available as explicit call
- [ ] **AC-019:** strictMode treats warnings as errors
- [ ] **AC-020:** Existing medical.json passes validation
- [ ] **AC-021:** DomainConfigLoader integration works

### Quality Criteria

- [ ] **AC-022:** All P0 tests pass (40 tests)
- [ ] **AC-023:** All P1 tests pass (25 tests)
- [ ] **AC-024:** 90%+ P2 tests pass (5 tests)
- [ ] **AC-025:** Zero regression in existing tests
- [ ] **AC-026:** Bundle size increase < 10KB

---

## Implementation Steps

### Step 1: Create Test File (TDD)

Write all P0 tests as failing tests first.

### Step 2: Implement ValidationReport Class

1. Constructor with arrays
2. `hasErrors()`, `hasWarnings()`, `isValid()`
3. `addError()`, `addWarning()`, `addInfo()`
4. `toJSON()`, `toString()`

### Step 3: Implement Core Validator

1. Constructor with options
2. `validate()` main entry point
3. `validateDomainConfig()` for JSON configs
4. Layer 1: Structural validation methods

### Step 4: Implement Semantic Validation

1. `validateIRI()` - IRI format checking
2. `checkTypeExists()` - BFO/CCO registry
3. `validateBFOHierarchy()` - Continuant/Occurrent checks
4. `detectCircularDependencies()`

### Step 5: Implement Compatibility Validation

1. `checkNamespaceCollisions()`
2. `checkTermConflicts()`
3. `checkCompatibility()` integration

### Step 6: Integrate with DomainConfigLoader

1. Add `_validation` to load results (Option B)
2. Add `TagTeam.validateOntology()` API (Option C)
3. Add strictMode support

### Step 7: Run All Tests

All P0 and P1 tests should pass.

---

## API Usage Examples

### Option B: Validate on Load (Default)

```javascript
// Load with automatic validation
const loader = new DomainConfigLoader();
const result = await loader.loadConfig('./custom-medical.json');

// Check validation results
if (result._validation) {
  if (result._validation.hasErrors()) {
    console.error('Config has errors:', result._validation.errors);
    // Decide whether to proceed
  }
  if (result._validation.hasWarnings()) {
    console.warn('Config has warnings:', result._validation.warnings);
  }
}

// Config is loaded regardless (unless strictMode)
```

### Option C: Explicit Validation

```javascript
// Validate before loading
const validator = new OntologyValidator({ strictMode: true });
const report = validator.validate('./custom-medical.json');

if (!report.isValid()) {
  console.error('Validation failed:');
  console.error(report.toString());
  process.exit(1);
}

// Safe to load
const loader = new DomainConfigLoader();
await loader.loadConfig('./custom-medical.json');
```

### Check Compatibility

```javascript
const validator = new OntologyValidator();

// Check new config against already loaded
const report = validator.checkCompatibility(
  newConfig,
  loader.getLoadedConfigs()
);

if (report.hasWarnings()) {
  console.warn('Potential conflicts detected');
  report.warnings.forEach(w => console.warn(`  - ${w.message}`));
}
```

---

## Files

```
src/
├── graph/
│   ├── OntologyValidator.js      # Phase 6.4.5 (new)
│   ├── ValidationReport.js       # Phase 6.4.5 (new)
│   └── DomainConfigLoader.js     # Updated with validation
│
├── data/
│   └── bfo-cco-registry.js       # Known types registry (new)

tests/unit/phase6/
├── selectional-preferences.test.js  # 60 tests (done)
├── ambiguity-resolver.test.js       # 46 tests (done)
├── interpretation-lattice.test.js   # 55 tests (done)
├── alternative-graph-builder.test.js # 75 tests (done)
└── ontology-validator.test.js       # 70 tests (new)
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| P0 Test Pass Rate | 100% | 40/40 tests |
| P1 Test Pass Rate | 100% | 25/25 tests |
| P2 Test Pass Rate | 90%+ | 5/5 tests |
| Regression Tests | 0 failures | All existing tests pass |
| Bundle Size | < +10KB | Measure before/after |
| medical.json | 0 errors | Validates cleanly |

---

## Future Extensions (Phase 6.5+)

- `validateTTL()` - TTL file validation (Phase 6.5)
- `validateValueNet()` - ValueNet-specific validation (Phase 6.5.3)
- `validateBridgeOntology()` - Bridge ontology validation (Phase 6.5.4)
- SHACL-based validation rules (Phase 9.x)

---

## Sign-Off

- [ ] Plan reviewed
- [ ] Acceptance criteria agreed
- [ ] Test strategy approved
- [ ] Ready to implement

---

*Phase 6.4.5 Implementation Plan - OntologyValidator*
