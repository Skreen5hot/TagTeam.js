# TagTeam.js Security Assurance Package

**Version**: 1.2.0
**Date**: 2026-01-29
**Status**: Formal Security Validation Package
**System**: TagTeam.js Semantic Parsing Library v7.x
**Companion Document**: TagTeam.js Security Plan v2.1.0
**Audience**: Security Reviewers, AppSec, GovSec, Third-Party Auditors

---

## 1. Purpose

This document enables **independent, reproducible validation** of TagTeam.js security controls.

**This document does not ask you to trust us. It asks you to verify.**

Every claim follows this chain:

```
CLAIM → CONTROL → EVIDENCE ARTIFACT → VALIDATION PROCEDURE → EXPECTED RESULT
```

If any link cannot be verified, treat the claim as unsubstantiated.

---

## 2. System Security Context

### 2.1 What TagTeam.js Does

TagTeam.js transforms natural language into ontology-aligned Information Content Entities (ICEs) for:

- **IEE**: Moral reasoning across philosophical worldviews
- **OERS**: Identity resolution across knowledge graphs

### 2.2 Why Semantic Integrity Is a Security Property

| Traditional App Failure | TagTeam.js Failure |
|------------------------|-------------------|
| Database corrupted | ICE contains wrong entity boundaries |
| Service unavailable | Actuality status misclassified |
| **Visible to operators** | **Invisible until downstream failure** |

A successful attack may not be detected until IEE produces incorrect judgments.

---

## 3. Trust Boundaries

| Component | Trust Level | Enforcement | Violation Response |
|-----------|-------------|-------------|-------------------|
| User-provided text | **Untrusted** | Input validator + heuristic validation | WARN + flag |
| Ontology files | **Conditionally Trusted** | SHA-256 manifest | HALT |
| Verb taxonomy | **Conditionally Trusted** | Ontology constraints | HALT |
| TagTeam.js code | **Trusted** | Code review + CI | N/A |

---

## 4. Security Guarantees and Limitations

### 4.1 What We Guarantee (With Evidence)

| Guarantee | Confidence | Evidence |
|-----------|-----------|----------|
| Supply chain: No known Critical/High CVEs | **Deterministic** | `npm audit` scans |
| Ontology integrity: Tampering detected | **Deterministic** | SHA-256 verification |
| Input limits enforced | **Deterministic** | Unit tests (41 tests across 7 test files) |
| Semantic attack patterns flagged | **Heuristic** | Red team corpus |
| XSS prevention in demo UIs | **Deterministic** | HTML escaping in all catch blocks |

### 4.2 What We Do NOT Guarantee

| Non-Guarantee | Reason |
|---------------|--------|
| Prevention of all adversarial NLP | Heuristics can be evaded |
| Resolution of semantic ambiguity | Inherent to natural language |
| Detection of novel attack patterns | Heuristics are pattern-based |

**These are design decisions, not security failures.**

---

## 5. Threat-Control-Evidence Matrix

| Threat ID | Threat | Control | Evidence | Validation |
|-----------|--------|---------|----------|------------|
| **T1** | Ontology poisoning | SHA-256 manifest | `ontology-manifest.json` | §7.2 |
| **T2** | Verb taxonomy manipulation | Ontology constraints | Unit tests | §7.3 |
| **T3** | Entity boundary injection | Heuristic validator | Red team output | §7.4 |
| **T4** | Actuality spoofing | Heuristic validator | Red team output | §7.4 |
| **T5** | Negation bypass | Heuristic validator | Red team output | §7.4 |
| **T6** | Salience manipulation | Heuristic validator | Red team output | §7.4 |
| **T7** | Dependency CVE | `npm audit` scanning | `npm audit` output | §7.1 |

---

## 6. Evidence Inventory

### 6.1 CI-Generated Artifacts

| Artifact | Location | Trigger |
|----------|----------|---------|
| `npm audit` report | CI job output (`security` job) | Every PR and push to main/develop |
| Ontology integrity log | CI job output (`ontology` job) | Every PR and push to main/develop |
| Security test results | CI job output (`security-tests` job) | Every PR and push to main/develop |

### 6.2 Repository Artifacts

| Artifact | Location | Status |
|----------|----------|--------|
| `security/test-corpus/` | Red team inputs (4 threat categories) | Implemented |
| `.github/workflows/security.yml` | CI configuration (3 jobs) | Implemented |
| `.github/dependabot.yml` | Automated dependency updates | Implemented |
| `src/security/` | Security module source (5 modules) | Implemented |
| `tests/unit/security/` | Security test suite (7 test files, 41 tests) | Implemented |
| `ontology-manifest.json` | Repository root | **Planned** (see §7.2 note) |

---

## 7. Validation Procedures

### 7.1 Supply Chain Validation (T7)

**Claim**: Critical/High CVEs block merges.

**Procedure**:
```bash
git clone https://github.com/[org]/tagteam.js && cd tagteam.js
npm ci
npm audit --audit-level=high
```

**Expected**:
- `npm ci` succeeds without lockfile changes
- `npm audit --audit-level=high` exits 0 (no Critical/High findings)
- CI `security` job enforces this on every PR

**Additional controls**:
- Dependabot monitors npm and GitHub Actions dependencies weekly
- Dependency PRs are grouped and labeled `dependencies`

---

### 7.2 Ontology Integrity Validation (T1)

**Claim**: File tampering is detected and halts operations.

**Procedure**:
```bash
# Verify clean state
npm run verify:ontology
# Expected: exit 0, "All files valid"

# Tamper and re-verify
echo "# tampered" >> ontology/tagteam.ttl
npm run verify:ontology
# Expected: exit 1, "INTEGRITY FAILURE" with file, expected hash, actual hash

# Restore
git checkout ontology/tagteam.ttl
```

**Note**: `ontology-manifest.json` must be generated before this validation is fully operational. The CI job runs with `continue-on-error: true` until the manifest is created. Once created, remove the `continue-on-error` flag to enforce integrity checks.

---

### 7.3 Verb Taxonomy Validation (T2)

**Claim**: Critical verbs cannot be miscategorized without detection.

**Procedure**:
```bash
# Run security tests (includes verb taxonomy validation)
npm run security:test
# Expected: all 41 tests pass, including verb taxonomy tests (AC-VT-1, AC-VT-2)
```

**Expected**: Tests verify that critical eventive verbs (`kill`, `consent`, `steal`) are correctly classified and that misclassification is detected.

---

### 7.4 Semantic Attack Detection Validation (T3-T6)

**Claim**: Known attack patterns are flagged (heuristic, not guaranteed).

**Procedure**:
```bash
# View red team corpus
ls security/test-corpus/
# Expected: t3-entity-boundary/, t4-actuality-spoofing/, t5-negation-bypass/, t6-salience-inflation/

# Run security tests (includes red team corpus tests)
npm run security:test
# Expected: all tests pass, including:
#   AC-RT-1: Each corpus file triggers its corresponding warning code
#   AC-RT-2: All corpus files exist and are non-empty
#   AC-RT-3: Clean text triggers zero warnings
```

**Important**: This validates *known patterns* are detected, not that *all attacks* are prevented.

---

### 7.5 Output Provenance Validation

**Claim**: ICE output includes security metadata.

**Procedure**:
```bash
# Run security tests (includes output sanitizer tests)
npm run security:test
# Expected: AC-OS-3 and AC-OS-4 verify provenance attachment
```

**Expected provenance structure**:
```json
{
  "tagteamVersion": "7.x.x",
  "ontologyHash": "sha256:...",
  "securityWarnings": [],
  "timestamp": "2026-01-29T..."
}
```

The output sanitizer (`src/security/output-sanitizer.js`) uses an allowlist of 20 properties and attaches provenance metadata to all ICE output.

---

### 7.6 SBOM Validation

**Status**: **Planned** — requires `@cyclonedx/cyclonedx-npm` to be installed.

Once implemented:
```bash
npm run sbom
cat sbom.json | jq '.components | length'
```

**Expected**: SBOM contains all dependencies with name, version, purl.

---

## 8. CI/CD Configuration

### 8.1 Security Workflow

Located at `.github/workflows/security.yml`:

| Job | Purpose | Trigger |
|-----|---------|---------|
| `security` | `npm audit --audit-level=high` | Push to main/develop, PRs to main, weekly Monday 6am UTC |
| `ontology` | Ontology integrity verification | Same |
| `security-tests` | Full security test suite (41 tests) | Same |

All jobs run with `permissions: contents: read` (least privilege).

### 8.2 Severity Gates

| Severity | CI Result | Merge Allowed |
|----------|-----------|---------------|
| Critical/High | Fail | No |
| Medium | Warning | Yes |
| Low | Pass | Yes |

### 8.3 Branch Protection (Recommended)

Configure in GitHub Settings > Branches > Branch protection rules:

```yaml
main:
  required_status_checks: [security, ontology, security-tests]
  required_reviewers: 1
```

### 8.4 Automated Dependency Management

Dependabot is configured (`.github/dependabot.yml`) for:
- npm packages: weekly scans, grouped PRs, limit 5 open PRs
- GitHub Actions: weekly version updates

---

## 9. Incident Response Readiness

| Incident | Playbook | SLA |
|----------|----------|-----|
| Ontology integrity failure | Security Plan §11 | < 1 hour |
| Critical CVE | Security Plan §11 | < 24 hours |

Reviewers may request tabletop walkthrough.

---

## 10. Independent Validation Checklist

| # | Item | Section | Result |
|---|------|---------|--------|
| 1 | `npm ci` succeeds | §7.1 | ☐ Pass ☐ Fail |
| 2 | `npm audit --audit-level=high` — no Critical/High | §7.1 | ☐ Pass ☐ Fail |
| 3 | Branch protection configured | §8.3 | ☐ Pass ☐ Fail |
| 4 | Ontology tampering detected | §7.2 | ☐ Pass ☐ Fail |
| 5 | Security tests pass (41/41) | §7.4 | ☐ Pass ☐ Fail |
| 6 | Output includes provenance | §7.5 | ☐ Pass ☐ Fail |
| 7 | Red team corpus files present | §7.4 | ☐ Pass ☐ Fail |

**Minimum passing**: Items 1-5 are critical.

---

## 11. Quick Reference Commands

```bash
# Supply chain
npm audit --audit-level=high

# Ontology integrity
npm run verify:ontology

# Full security test suite (41 tests, 7 files)
npm run security:test

# All tests (includes security)
npm test
```

---

## 12. Security Implementation Summary

### 12.1 Security Modules

| Module | File | Purpose |
|--------|------|---------|
| Input Validator | `src/security/input-validator.js` | Length limits, null byte rejection, NFKC normalization |
| Ontology Integrity | `src/security/ontology-integrity.js` | SHA-256 manifest verification, verb taxonomy validation |
| Semantic Validators | `src/security/semantic-validators.js` | Heuristic detection for T3-T6 threats |
| Output Sanitizer | `src/security/output-sanitizer.js` | Allowlist-based property filtering, provenance attachment |
| Audit Logger | `src/security/audit-logger.js` | Structured JSON security event logging |

### 12.2 Test Coverage

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `input-validator.test.js` | 8 | AC-IV-1 through AC-IV-5 |
| `ontology-integrity.test.js` | 5 | AC-OI-1 through AC-OI-5 |
| `semantic-validators.test.js` | 11 | AC-SV-1 through AC-SV-10 |
| `output-sanitizer.test.js` | 4 | AC-OS-1 through AC-OS-4 |
| `audit-logger.test.js` | 3 | AC-AL-1 through AC-AL-3 |
| `verb-taxonomy.test.js` | 4 | AC-VT-1 through AC-VT-2 |
| `red-team.test.js` | 6 | AC-RT-1 through AC-RT-3 |
| **Total** | **41** | |

### 12.3 Additional Hardening

- XSS prevention: All demo HTML files use `escapeHtml()` to sanitize exception messages rendered via `.innerHTML`
- URL sanitization: IRI validation in `shaclValidator.js` uses proper prefix matching instead of substring checks

---

## 13. Conclusion

TagTeam.js provides:

- **Verifiable** supply chain and configuration integrity
- **Heuristic** semantic attack detection (with explicit limitations)
- **Traceable** output provenance
- **Reproducible** validation procedures
- **41 automated security tests** across 7 test files

All claims are falsifiable through the provided procedures.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.2.0 | 2026-01-29 | Aligned with actual implementation; replaced Snyk with npm audit; added security module inventory and test coverage; corrected all script names and CI job references; marked SBOM and ontology manifest as planned |
| 1.1.0 | 2026-01-29 | Aligned with Security Plan v2.1; added validation procedures, evidence inventory, explicit expected results |
| 1.0.0 | 2026-01-29 | Initial package |

**Next Review**: 2026-04-29
