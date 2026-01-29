# TagTeam.js Security Implementation Plan

**Source**: `docs/architecture/tagteam-security-plan-v2.1-final.md`
**Approach**: TDD — write tests first, implement until green
**Priority Order**: P0 (integrity) → P0 (input) → P1 (semantic) → P1 (output) → P1 (red team) → P2 (CI/CD)

---

## Phase 1: Input Validator (`src/security/input-validator.js`)

### New Files
- `src/security/input-validator.js` (~80 lines)
- `tests/unit/security/input-validator.test.js`

### Acceptance Criteria

#### AC-IV-1: Text exceeding MAX_TEXT_LENGTH is rejected
```
GIVEN text with length > 100,000 characters
WHEN  validateInput(text) is called
THEN  result.valid === false
AND   result.issues contains { severity: 'error', confidence: 'deterministic', code: 'INPUT_TOO_LONG' }
```

#### AC-IV-2: Null bytes are rejected
```
GIVEN text containing \x00
WHEN  validateInput(text) is called
THEN  result.valid === false
AND   result.issues contains { severity: 'error', confidence: 'deterministic', code: 'NULL_BYTE' }
```

#### AC-IV-3: Valid text passes and is NFKC-normalized
```
GIVEN normal text "The CEO signed the contract"
WHEN  validateInput(text) is called
THEN  result.valid === true
AND   result.issues.length === 0
AND   result.normalized === text.normalize('NFKC')
```

#### AC-IV-4: Unicode normalization converts equivalent forms
```
GIVEN text with decomposed Unicode (e.g., "café" as c+a+f+e+combining-accent)
WHEN  validateInput(text) is called
THEN  result.normalized uses composed form (NFKC)
```

#### AC-IV-5: Empty/null input is rejected
```
GIVEN text is null, undefined, or empty string
WHEN  validateInput(text) is called
THEN  result.valid === false
AND   result.issues contains { code: 'EMPTY_INPUT' }
```

---

## Phase 2: Ontology Integrity (`src/security/ontology-integrity.js`)

### New Files
- `src/security/ontology-integrity.js` (~100 lines)
- `tests/unit/security/ontology-integrity.test.js`
- `ontology-manifest.json` (initial manifest)

### Acceptance Criteria

#### AC-OI-1: Valid manifest with matching hashes passes
```
GIVEN ontology-manifest.json with correct SHA-256 hashes for all listed files
WHEN  verifyOntologyIntegrity('ontology-manifest.json') is called
THEN  result.valid === true
AND   result.results every entry has valid === true
```

#### AC-OI-2: Tampered file fails integrity check
```
GIVEN ontology-manifest.json listing file X with hash H
AND   file X has been modified (hash != H)
WHEN  verifyOntologyIntegrity() is called
THEN  result.valid === false
AND   result.results contains entry with valid === false, showing expected vs actual hash
```

#### AC-OI-3: Missing file fails integrity check
```
GIVEN ontology-manifest.json listing file X
AND   file X does not exist on disk
WHEN  verifyOntologyIntegrity() is called
THEN  result.valid === false
AND   result.results contains entry with error 'FILE_NOT_FOUND'
```

#### AC-OI-4: Missing manifest fails gracefully
```
GIVEN no ontology-manifest.json exists
WHEN  verifyOntologyIntegrity() is called
THEN  result.valid === false
AND   result.error === 'MANIFEST_NOT_FOUND'
```

#### AC-OI-5: Manifest exposes version and approver
```
GIVEN a valid ontology-manifest.json with version and approver fields
WHEN  verifyOntologyIntegrity() is called
THEN  result.manifestVersion matches manifest.version
AND   result.approver matches manifest.approver
```

---

## Phase 3: Semantic Security Validators (`src/security/semantic-validators.js`)

### New Files
- `src/security/semantic-validators.js` (~150 lines)
- `tests/unit/security/semantic-validators.test.js`

### Acceptance Criteria

#### AC-SV-1: T3 — High connector density triggers warning
```
GIVEN text with connector words (and/or/of/for) comprising >15% of words
WHEN  validator.checkEntityBoundaries(text) is called
THEN  returns warning with code 'HIGH_CONNECTOR_DENSITY'
AND   warning.confidence === 'heuristic'
```

#### AC-SV-2: T3 — Normal connector density passes
```
GIVEN text "The CEO signed the contract"
WHEN  validator.checkEntityBoundaries(text) is called
THEN  returns empty array
```

#### AC-SV-3: T4 — Actuality confusion pattern triggers warning
```
GIVEN text "Hypothetically, the suspect committed the crime"
WHEN  validator.checkActualityMarkers(text) is called
THEN  returns warning with code 'ACTUALITY_CONFUSION'
```

#### AC-SV-4: T4 — Normal conditional language passes
```
GIVEN text "If the patient consents, the doctor will proceed"
WHEN  validator.checkActualityMarkers(text) is called
THEN  returns empty array
```

#### AC-SV-5: T5 — Buried negation triggers warning
```
GIVEN text "The defendant was involved in no wrongdoing"
WHEN  validator.checkNegationPatterns(text) is called
THEN  returns warning with code 'BURIED_NEGATION'
```

#### AC-SV-6: T5 — Explicit negation passes (no warning)
```
GIVEN text "The defendant did not commit the crime"
WHEN  validator.checkNegationPatterns(text) is called
THEN  returns empty array
```

#### AC-SV-7: T6 — Excessive emphasis triggers warning
```
GIVEN text with >5 emphasis words (primary, essential, crucial, critical, key, fundamental)
WHEN  validator.checkSalienceMarkers(text) is called
THEN  returns warning with code 'EXCESSIVE_EMPHASIS'
AND   warning.count > 5
```

#### AC-SV-8: T6 — Normal emphasis passes
```
GIVEN text "The primary goal is to improve safety"
WHEN  validator.checkSalienceMarkers(text) is called
THEN  returns empty array
```

#### AC-SV-9: validate() aggregates all checks
```
GIVEN text triggering multiple heuristics
WHEN  validator.validate(text) is called
THEN  result.warnings contains all triggered codes
AND   result.disclaimer is present
```

#### AC-SV-10: validate() returns disclaimer on clean text
```
GIVEN clean text with no suspicious patterns
WHEN  validator.validate(text) is called
THEN  result.warnings.length === 0
AND   result.disclaimer is present
```

---

## Phase 4: Output Sanitizer with Provenance (`src/security/output-sanitizer.js`)

### New Files
- `src/security/output-sanitizer.js` (~80 lines)
- `tests/unit/security/output-sanitizer.test.js`

### Acceptance Criteria

#### AC-OS-1: Only allowed properties pass through sanitize()
```
GIVEN an ICE object with allowed props (id, type, label) and disallowed props (internalDebug, _privateField)
WHEN  sanitize(ice) is called
THEN  result contains allowed props
AND   result does NOT contain disallowed props
```

#### AC-OS-2: Provenance metadata is attached
```
GIVEN ICEs and a context with ontologyHash and warnings
WHEN  sanitizeWithProvenance(ices, context) is called
THEN  each output has provenance.ontologyHash === context.ontologyHash
AND   provenance.securityWarnings lists warning codes from context
AND   provenance.timestamp is a valid ISO string
AND   provenance.inputValidated === true
```

#### AC-OS-3: Empty warnings produces empty array in provenance
```
GIVEN context with warnings = []
WHEN  sanitizeWithProvenance(ices, context) is called
THEN  provenance.securityWarnings === []
```

#### AC-OS-4: All allowed property names are preserved
```
GIVEN an ICE with every allowed property populated
WHEN  sanitize(ice) is called
THEN  all 15 allowed properties are present in result
```

---

## Phase 5: Audit Logger (`src/security/audit-logger.js`)

### New Files
- `src/security/audit-logger.js` (~60 lines)
- `tests/unit/security/audit-logger.test.js`

### Acceptance Criteria

#### AC-AL-1: log() emits structured JSON with timestamp and service
```
GIVEN a SecurityAuditLogger instance
WHEN  logger.log({ event: 'TEST', severity: 'info' }) is called
THEN  output is valid JSON
AND   output.timestamp is a valid ISO string
AND   output.service === 'tagteam'
AND   output.event === 'TEST'
```

#### AC-AL-2: ontologyFailure() emits critical event with details
```
GIVEN a SecurityAuditLogger instance
WHEN  logger.ontologyFailure({ file: 'foo.ttl', expected: 'abc', actual: 'def', approver: 'aaron' })
THEN  output.event === 'ONTOLOGY_INTEGRITY_FAILED'
AND   output.severity === 'critical'
AND   output.action === 'PARSING_HALTED'
AND   output.file === 'foo.ttl'
```

#### AC-AL-3: inputValidationWarning() emits warning event
```
GIVEN a SecurityAuditLogger instance
WHEN  logger.inputValidationWarning({ code: 'HIGH_CONNECTOR_DENSITY', text: '...' })
THEN  output.event === 'INPUT_VALIDATION_WARNING'
AND   output.severity === 'warning'
```

---

## Phase 6: Verb Taxonomy Validation

### Modified Files
- `src/security/ontology-integrity.js` (+30 lines)

### Acceptance Criteria

#### AC-VT-1: Critical eventive verb miscategorized as stative → error
```
GIVEN verb taxonomy where "kill" is classified as stative
AND   ontology declares "kill" as tagteam:CriticalEventiveVerb
WHEN  validateVerbTaxonomy(taxonomy, ontology) is called
THEN  returns issue with severity 'critical' and code 'CRITICAL_VERB_MISCATEGORIZED'
```

#### AC-VT-2: Correctly categorized verbs produce no issues
```
GIVEN verb taxonomy where "kill" is eventive and "include" is stative
AND   ontology declares "kill" as CriticalEventiveVerb and "include" as CriticalStativeVerb
WHEN  validateVerbTaxonomy(taxonomy, ontology) is called
THEN  returns empty issues array
```

---

## Phase 7: Red Team Test Corpus

### New Files
- `security/test-corpus/t3-entity-boundary/connector-flooding.txt`
- `security/test-corpus/t4-actuality-spoofing/hypothetical-assertion.txt`
- `security/test-corpus/t5-negation-bypass/buried-negation.txt`
- `security/test-corpus/t6-salience-inflation/emphasis-flooding.txt`
- `security/test-corpus/run-tests.js`
- `tests/unit/security/red-team.test.js`

### Acceptance Criteria

#### AC-RT-1: Each corpus file triggers its corresponding warning code
```
GIVEN connector-flooding.txt exists with high connector density text
WHEN  SemanticSecurityValidator.validate(text) is called
THEN  warnings include 'HIGH_CONNECTOR_DENSITY'
```

#### AC-RT-2: Each corpus file triggers ONLY relevant warnings
```
GIVEN hypothetical-assertion.txt
WHEN  validated
THEN  warnings include 'ACTUALITY_CONFUSION'
(repeat for each threat category)
```

#### AC-RT-3: Clean text triggers zero warnings
```
GIVEN a normal sentence with no adversarial patterns
WHEN  validated
THEN  warnings.length === 0
```

---

## Phase 8: CI/CD Configuration

### New Files
- `.github/dependabot.yml`
- `.github/workflows/security.yml`

### Acceptance Criteria

#### AC-CI-1: Dependabot configured for npm + GitHub Actions weekly
```
GIVEN .github/dependabot.yml exists
THEN  it configures npm ecosystem with weekly schedule
AND   it configures github-actions ecosystem with weekly schedule
AND   open-pull-requests-limit <= 5
```

#### AC-CI-2: Security workflow runs Snyk with high severity threshold
```
GIVEN .github/workflows/security.yml exists
THEN  it triggers on push to main/develop, PRs to main, and weekly schedule
AND   Snyk step uses severity-threshold=high
AND   CodeQL step uses security-extended queries
```

#### AC-CI-3: Ontology verification runs in CI
```
GIVEN security workflow
THEN  it includes a job that runs npm run verify:ontology
```

#### AC-CI-4: SBOM generated on main branch only
```
GIVEN security workflow
THEN  sbom job has condition github.ref == 'refs/heads/main'
AND   uploads sbom.json as artifact
```

---

## Implementation Order

| Step | Phase | What | Tests First |
|------|-------|------|-------------|
| 1 | 1 | Write input-validator.test.js (5 tests) | Yes |
| 2 | 1 | Create input-validator.js | — |
| 3 | 1 | Run tests → green | — |
| 4 | 2 | Write ontology-integrity.test.js (5 tests) | Yes |
| 5 | 2 | Create ontology-integrity.js + ontology-manifest.json | — |
| 6 | 2 | Run tests → green | — |
| 7 | 3 | Write semantic-validators.test.js (10 tests) | Yes |
| 8 | 3 | Create semantic-validators.js | — |
| 9 | 3 | Run tests → green | — |
| 10 | 4 | Write output-sanitizer.test.js (4 tests) | Yes |
| 11 | 4 | Create output-sanitizer.js | — |
| 12 | 4 | Run tests → green | — |
| 13 | 5 | Write audit-logger.test.js (3 tests) | Yes |
| 14 | 5 | Create audit-logger.js | — |
| 15 | 5 | Run tests → green | — |
| 16 | 6 | Add verb taxonomy validation tests + implementation | Yes |
| 17 | 7 | Create red team corpus files + test runner | Yes |
| 18 | 8 | Create .github/dependabot.yml + security.yml | — |
| 19 | — | Full regression: all tests | — |

## Files Summary

| File | Phase | Action |
|------|-------|--------|
| `src/security/input-validator.js` | 1 | Create |
| `src/security/ontology-integrity.js` | 2, 6 | Create, Modify |
| `src/security/semantic-validators.js` | 3 | Create |
| `src/security/output-sanitizer.js` | 4 | Create |
| `src/security/audit-logger.js` | 5 | Create |
| `ontology-manifest.json` | 2 | Create |
| `security/test-corpus/` | 7 | Create (4 dirs + files) |
| `security/test-corpus/run-tests.js` | 7 | Create |
| `.github/dependabot.yml` | 8 | Create |
| `.github/workflows/security.yml` | 8 | Create |
| `tests/unit/security/input-validator.test.js` | 1 | Create |
| `tests/unit/security/ontology-integrity.test.js` | 2 | Create |
| `tests/unit/security/semantic-validators.test.js` | 3 | Create |
| `tests/unit/security/output-sanitizer.test.js` | 4 | Create |
| `tests/unit/security/audit-logger.test.js` | 5 | Create |
| `tests/unit/security/red-team.test.js` | 7 | Create |
| `package.json` | 2 | Modify (add verify:ontology, sbom, security:test scripts) |
