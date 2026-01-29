# TagTeam.js Security Plan

**Version**: 2.1.0 (Final)  
**Date**: 2026-01-29  
**Status**: Approved  
**Owner**: TagTeam Development Team  
**Review Cycle**: Quarterly

---

## Executive Summary

TagTeam.js processes natural language to produce ontology-aligned Information Content Entities (ICEs) for downstream moral reasoning (IEE) and entity resolution (OERS). **Semantic integrity—not traditional injection—is the primary security concern.**

This plan implements layered controls spanning supply chain, development, CI, runtime, and incident response. It is designed to be **operationally sustainable**, not burdensome.

**Scope**: This plan addresses detectable, pattern-based attacks on semantic processing. It does **not** claim to solve fully adversarial NLP or intentional semantic ambiguity.

---

## 1. Trust Boundaries

Explicit trust boundaries prevent future contributors from breaking the security model.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TRUST BOUNDARIES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  UNTRUSTED (Assume Hostile)                                                 │
│  ──────────────────────────                                                 │
│  • All input text                                                           │
│  • User-provided configuration                                              │
│  • Upstream ICEs from unknown sources                                       │
│  • API requests                                                             │
│                                                                             │
│  CONDITIONALLY TRUSTED (Verified Before Use)                                │
│  ────────────────────────────────────────────                               │
│  • Ontology files (verified by signed manifest)                            │
│  • Configuration files (schema-validated)                                  │
│  • Verb taxonomy (validated against ontology constraints)                  │
│                                                                             │
│  TRUSTED (Assumed Secure)                                                   │
│  ─────────────────────────                                                  │
│  • TagTeam runtime code (code review + CI gates)                           │
│  • CI/CD environment (GitHub-managed)                                      │
│  • npm registry (with lockfile integrity)                                  │
│                                                                             │
│  TRUST DECISIONS                                                            │
│  ───────────────                                                            │
│  • Input validation = WARN, not BLOCK (heuristic, not guarantee)           │
│  • Ontology mismatch = HALT (integrity boundary)                           │
│  • Dependency CVE = BLOCK merge (supply chain boundary)                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Non-Goals (Explicit Scope Limits)

This plan **does not attempt to solve**:

| Non-Goal | Reason |
|----------|--------|
| Fully adversarial ML/NLP attacks | Requires ML-based defense; beyond pattern matching |
| Intentional semantic ambiguity | Natural language is inherently ambiguous |
| Ethical manipulation beyond patterns | Human review needed for subtle manipulation |
| Zero-day supply chain attacks | Detection only; can't prevent unknown attacks |
| Insider threats with code access | Trust boundary includes committed code |

**Expectation**: This plan raises the bar for attacks and makes them detectable. It does not make TagTeam "unhackable."

---

## 3. Threat Model

### 3.1 TagTeam-Specific Threats

| ID | Threat | Impact | Detection | Response |
|----|--------|--------|-----------|----------|
| **T1** | Ontology poisoning | Wrong parsing semantics | Manifest signature check | HALT |
| **T2** | Verb taxonomy manipulation | IEE misses intentional acts | Ontology constraint validation | HALT |
| **T3** | ComplexDesignator injection | OERS resolves wrong entities | Heuristic warning | WARN + flag |
| **T4** | Actuality status spoofing | IEE reasons about non-facts | Heuristic warning | WARN + flag |
| **T5** | Negation bypass | Wrong polarity in evaluation | Heuristic warning | WARN + flag |
| **T6** | Salience manipulation | Skewed moral weighting | Heuristic warning | WARN + flag |
| **T7** | Dependency CVE | Parser compromise | Snyk scanning | BLOCK merge |

### 3.2 Response Philosophy

| Threat Type | Confidence | Response |
|-------------|------------|----------|
| Integrity violation (T1, T2) | High (cryptographic) | **HALT operations** |
| Supply chain (T7) | High (CVE database) | **BLOCK merge** |
| Input manipulation (T3-T6) | Low (heuristic) | **WARN + flag for review** |

**Critical distinction**: Input validators are **risk indicators**, not security guarantees. They flag suspicious patterns for human review; they don't claim to catch all attacks.

---

## 4. Supply Chain Security

### 4.1 Single Source of Truth: Snyk

**Decision**: Snyk is the authoritative vulnerability scanner. `npm audit` is for local dev convenience only.

**Rationale**: Running both creates overlapping results, inconsistent severity scoring, and more false positives. Pick one and trust it.

**Setup**:
```bash
npm install -g snyk
snyk auth
```

**Daily workflow**:
```bash
snyk test          # Before commits
snyk monitor       # Creates dashboard snapshot
```

### 4.2 Dependency Management

**package.json**:
```json
{
  "dependencies": {
    "compromise": "14.10.0",
    "compromise-dates": "3.5.0",
    "compromise-numbers": "1.4.0"
  }
}
```

**Policy**:
- All dependencies pinned to exact versions (no `^` or `~`)
- `package-lock.json` committed
- `npm ci` in CI (not `npm install`)

### 4.3 Dependabot Configuration

**`.github/dependabot.yml`**:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"  # Not daily - reduces noise
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
    groups:
      all-dependencies:
        patterns:
          - "*"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

**Note**: GitHub Security Advisories trigger immediate alerts regardless of Dependabot schedule.

### 4.4 SBOM Generation

Generate Software Bill of Materials for compliance and incident response:

```bash
npm install -D @cyclonedx/cyclonedx-npm
```

**package.json**:
```json
{
  "scripts": {
    "sbom": "cyclonedx-npm --output sbom.json"
  }
}
```

---

## 5. Ontology Integrity (Signed Manifest)

### 5.1 Problem with Hardcoded Hashes

Hardcoding hashes in code:
- Requires code change for every legitimate ontology update
- Encourages "just update the hash" without review
- Makes hotfixes painful

### 5.2 Solution: Signed Manifest

**`ontology-manifest.json`**:
```json
{
  "version": "2026-01-29",
  "approver": "aaron@example.org",
  "files": {
    "ontology/tagteam.ttl": {
      "sha256": "abc123...",
      "lastModified": "2026-01-29T10:00:00Z"
    },
    "ontology/bfo.owl": {
      "sha256": "def456...",
      "lastModified": "2026-01-15T08:00:00Z"
    },
    "config/verb-taxonomy.yaml": {
      "sha256": "ghi789...",
      "lastModified": "2026-01-29T10:00:00Z"
    }
  },
  "signature": "-----BEGIN PGP SIGNATURE-----..."
}
```

**Verification** (`src/security/ontology-integrity.js`):
```javascript
import crypto from 'crypto';
import fs from 'fs';

export function verifyOntologyIntegrity(manifestPath = 'ontology-manifest.json') {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  const results = [];
  
  for (const [filePath, expected] of Object.entries(manifest.files)) {
    const content = fs.readFileSync(filePath);
    const actual = crypto.createHash('sha256').update(content).digest('hex');
    
    const match = actual === expected.sha256;
    results.push({
      file: filePath,
      valid: match,
      expected: expected.sha256,
      actual: actual,
      lastApproved: expected.lastModified,
      approver: manifest.approver
    });
    
    if (!match) {
      console.error(`INTEGRITY FAILURE: ${filePath}`);
      console.error(`  Expected: ${expected.sha256}`);
      console.error(`  Actual:   ${actual}`);
      console.error(`  Last approved: ${expected.lastModified} by ${manifest.approver}`);
    }
  }
  
  return {
    valid: results.every(r => r.valid),
    manifestVersion: manifest.version,
    approver: manifest.approver,
    results
  };
}
```

### 5.3 Verb Taxonomy Validation (Ontology-Based)

**Problem**: Hardcoding critical verbs in code encodes domain knowledge in the wrong place.

**Solution**: Define constraints in the ontology itself.

**`ontology/tagteam.ttl`** (add constraints):
```turtle
tagteam:CriticalEventiveVerb a owl:Class ;
    rdfs:comment "Verbs that MUST remain eventive for IEE to function" .

tagteam:kill a tagteam:CriticalEventiveVerb .
tagteam:murder a tagteam:CriticalEventiveVerb .
tagteam:steal a tagteam:CriticalEventiveVerb .
tagteam:consent a tagteam:CriticalEventiveVerb .

tagteam:CriticalStativeVerb a owl:Class ;
    rdfs:comment "Verbs that MUST remain stative for structural parsing" .

tagteam:include a tagteam:CriticalStativeVerb .
tagteam:contain a tagteam:CriticalStativeVerb .
```

**Validation**:
```javascript
export function validateVerbTaxonomy(taxonomy, ontology) {
  const issues = [];
  const criticalEventive = ontology.getInstancesOf('tagteam:CriticalEventiveVerb');
  
  for (const verb of criticalEventive) {
    if (taxonomy.isStative(verb)) {
      issues.push({
        severity: 'critical',
        code: 'CRITICAL_VERB_MISCATEGORIZED',
        verb,
        impact: 'IEE will fail to evaluate this as an intentional act'
      });
    }
  }
  
  return issues;
}
```

**Benefit**: Domain knowledge lives in the ontology. Code just enforces it.

---

## 6. Input Security (Heuristic Warnings)

### 6.1 Philosophy

Input validators are **risk indicators**, not guarantees.

```javascript
// Every warning includes confidence level
{
  severity: 'warning',
  confidence: 'heuristic',  // ALWAYS include this
  code: 'ACTUALITY_CONFUSION',
  recommendation: 'Flag for human review'
}
```

### 6.2 Input Validator

```javascript
// src/security/input-validator.js

const INPUT_LIMITS = {
  MAX_TEXT_LENGTH: 100000,
  MAX_SENTENCE_LENGTH: 5000,
};

export function validateInput(text) {
  const issues = [];
  
  // Hard limits (these block)
  if (text.length > INPUT_LIMITS.MAX_TEXT_LENGTH) {
    issues.push({
      severity: 'error',
      confidence: 'deterministic',
      code: 'INPUT_TOO_LONG'
    });
  }
  
  // Null bytes (these block)
  if (/\x00/.test(text)) {
    issues.push({
      severity: 'error',
      confidence: 'deterministic',
      code: 'NULL_BYTE'
    });
  }
  
  return {
    valid: !issues.some(i => i.severity === 'error'),
    normalized: text.normalize('NFKC'),
    issues
  };
}
```

### 6.3 Semantic Security Validators

```javascript
// src/security/semantic-validators.js

/**
 * HEURISTIC detectors. Flag for review, not block.
 */
export class SemanticSecurityValidator {
  
  // T3: Entity boundary manipulation
  checkEntityBoundaries(text) {
    const connectorDensity = (text.match(/\b(and|or|of|for)\b/gi) || []).length / 
                             text.split(/\s+/).length;
    
    if (connectorDensity > 0.15) {
      return [{
        code: 'HIGH_CONNECTOR_DENSITY',
        confidence: 'heuristic',
        recommendation: 'Review entity boundaries'
      }];
    }
    return [];
  }
  
  // T4: Actuality status manipulation
  checkActualityMarkers(text) {
    if (/hypothetically[,\s]+[\w\s]+(?:did|committed)/gi.test(text)) {
      return [{
        code: 'ACTUALITY_CONFUSION',
        confidence: 'heuristic',
        recommendation: 'Verify actuality assignments'
      }];
    }
    return [];
  }
  
  // T5: Negation obfuscation
  checkNegationPatterns(text) {
    if (/was\s+\w+\s+in\s+no\s+/gi.test(text) || /absence\s+of\s+/gi.test(text)) {
      return [{
        code: 'BURIED_NEGATION',
        confidence: 'heuristic',
        recommendation: 'Verify polarity assignments'
      }];
    }
    return [];
  }
  
  // T6: Salience inflation
  checkSalienceMarkers(text) {
    const count = (text.match(/\b(primary|essential|crucial|critical|key|fundamental)\b/gi) || []).length;
    if (count > 5) {
      return [{
        code: 'EXCESSIVE_EMPHASIS',
        confidence: 'heuristic',
        count,
        recommendation: 'Review salience scores'
      }];
    }
    return [];
  }
  
  validate(text) {
    return {
      warnings: [
        ...this.checkEntityBoundaries(text),
        ...this.checkActualityMarkers(text),
        ...this.checkNegationPatterns(text),
        ...this.checkSalienceMarkers(text),
      ],
      disclaimer: 'Heuristic checks only. Does not guarantee attack prevention.'
    };
  }
}
```

---

## 7. Output Security with Provenance

Include security metadata so downstream systems can reason about trust:

```javascript
// src/security/output-sanitizer.js

export function sanitizeWithProvenance(ices, context) {
  return ices.map(ice => ({
    ...sanitize(ice),
    provenance: {
      tagteamVersion: process.env.TAGTEAM_VERSION,
      ontologyHash: context.ontologyHash,
      inputValidated: true,
      securityWarnings: context.warnings.map(w => w.code),
      timestamp: new Date().toISOString()
    }
  }));
}

function sanitize(ice) {
  const ALLOWED = [
    'id', 'type', 'label', 'fullName', 'nameComponents',
    'denotedType', 'candidateType', 'expression',
    'assertedRelation', 'subject', 'objects',
    'verbPhrase', 'agent', 'patient',
    'actualityStatus', 'normativeStatus', 'salience',
    'denotationConfidence', 'sourceSpan', 'evidence'
  ];
  
  const result = {};
  for (const prop of ALLOWED) {
    if (ice[prop] !== undefined) result[prop] = ice[prop];
  }
  return result;
}
```

**Example output**:
```json
{
  "id": "ice_001",
  "type": "StructuralAssertion",
  "provenance": {
    "tagteamVersion": "7.0.0",
    "ontologyHash": "sha256:abc123...",
    "securityWarnings": ["HIGH_CONNECTOR_DENSITY"],
    "timestamp": "2026-01-29T10:00:00Z"
  }
}
```

---

## 8. CI/CD Security

**`.github/workflows/security.yml`**:
```yaml
name: Security

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Weekly

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      
      - name: Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript
          queries: security-extended
      - uses: github/codeql-action/analyze@v3

  ontology:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run verify:ontology

  sbom:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run sbom
      - uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.json
```

**Severity Gates**:

| Severity | CI | Merge |
|----------|-----|-------|
| Critical/High | ❌ Fail | ❌ Block |
| Medium | ⚠️ Warn | ✅ Allow |
| Low | ✅ Pass | ✅ Allow |

---

## 9. Red Team Test Corpus

Prevent validator regressions:

```
security/test-corpus/
├── t3-entity-boundary/
│   └── connector-flooding.txt
├── t4-actuality-spoofing/
│   └── hypothetical-assertion.txt
├── t5-negation-bypass/
│   └── buried-negation.txt
└── t6-salience-inflation/
    └── emphasis-flooding.txt
```

**Test runner** (add to CI):
```javascript
// Each corpus file should trigger its corresponding warning
const validator = new SemanticSecurityValidator();

for (const [dir, expectedCode] of Object.entries(EXPECTED)) {
  const text = fs.readFileSync(`security/test-corpus/${dir}/test.txt`, 'utf8');
  const result = validator.validate(text);
  
  if (!result.warnings.some(w => w.code === expectedCode)) {
    console.error(`REGRESSION: ${dir} should trigger ${expectedCode}`);
    process.exit(1);
  }
}
```

---

## 10. Audit Logging

```javascript
// src/security/audit-logger.js

export class SecurityAuditLogger {
  log(event) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'tagteam',
      ...event
    }));
  }
  
  ontologyFailure(details) {
    this.log({
      event: 'ONTOLOGY_INTEGRITY_FAILED',
      severity: 'critical',
      file: details.file,
      expected: details.expected,
      actual: details.actual,
      approver: details.approver,
      action: 'PARSING_HALTED'
    });
  }
}
```

---

## 11. Incident Response

| Trigger | Severity | Response | SLA |
|---------|----------|----------|-----|
| Ontology integrity failure | Critical | HALT, alert, restore | < 1 hour |
| Critical CVE | Critical | BLOCK deploys, patch | < 24 hours |
| High CVE | High | BLOCK merge, patch | < 7 days |

**Ontology Failure Playbook**:
1. Parsing auto-halts (verify)
2. Check audit log: which file, what mismatch, who approved
3. Compare to git history
4. Restore from known good commit
5. Verify hashes, resume

---

## 12. Implementation Checklist

### Quick Start (30 min)

| Task | Time |
|------|------|
| Install Snyk: `npm i -g snyk && snyk auth` | 5 min |
| Add `.github/dependabot.yml` | 2 min |
| Add `.github/workflows/security.yml` | 10 min |
| Enable branch protection | 5 min |
| Pin dependencies (remove `^`) | 5 min |
| Run `snyk test` | 3 min |

### Week 1

| Task | Priority |
|------|----------|
| Create `ontology-manifest.json` | P0 |
| Implement `ontology-integrity.js` | P0 |
| Implement `input-validator.js` | P0 |
| Add SBOM generation | P1 |

### Month 1

| Task | Priority |
|------|----------|
| Implement `semantic-validators.js` | P1 |
| Add provenance to ICE output | P1 |
| Create red team test corpus | P1 |
| Add verb constraints to ontology | P2 |

---

## Appendix: package.json Scripts

```json
{
  "scripts": {
    "verify:ontology": "node src/security/verify-ontology.js",
    "sbom": "cyclonedx-npm --output sbom.json",
    "security:test": "node security/test-corpus/run-tests.js"
  }
}
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 2.1.0 | 2026-01-29 | Final: Trust boundaries, non-goals, signed manifest, ontology-based taxonomy validation, heuristic confidence labeling, provenance, red team corpus. Removed npm audit from CI, weekly Dependabot. |

**Next Review**: 2026-04-29

---

*Approved for production use.*
