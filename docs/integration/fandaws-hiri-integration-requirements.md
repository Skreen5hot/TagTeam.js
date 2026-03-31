# Fandaws HIRI Integration Requirements for TagTeam.js

**Version**: 1.0
**Date**: 2026-03-31
**From**: TagTeam NLP Team
**To**: Fandaws Graph Team
**Status**: Ready for implementation

---

## 1. Executive Summary

TagTeam.js is a deterministic semantic parser that converts natural language into BFO/CCO-compliant JSON-LD graphs. It currently achieves **80% pass rate** on a strict SHACL-validated legal corpus (CMS-DHS Data Exchange MOA, 40 sentences).

The remaining 20% gap is caused by the parser's dependency tree model (85.3% UAS) silently dropping entities and misassigning roles. Rather than improving the parser model (expensive, diminishing returns), we propose integrating the Fandaws knowledge graph as a **top-down correction signal** that compensates for parser errors at every downstream layer.

**What we need from Fandaws**: Per-term TTL exports with 4 key properties, accessible via HIRI content-addressed atoms on IPFS.

**Expected impact**: Entity typing accuracy from ~70% to ~92%. Overall ISA pass rate from 80% to ~92%.

---

## 2. What TagTeam Does Today (Without Fandaws)

```
Input: "CMS shall allow USCIS to monitor all records under CMS possession."

Pipeline:
  Tokenize → POS Tag (93.5%) → Dep Parse (85.3%) → Entity Extract → Type Guess → Role Guess → Graph

Output:
  - VerbPhrase: "allow", modalMarker: "shall", modality: "obligation"
  - DirectiveICE: UnconditionalObligation
  - PlanSpec: prescribedActType: "allow", prescribedAgent: CMS, prescribedPatient: "all records"
  - Obligation RE: inheres_in CMS, fulfillmentState: Pending
```

Every decision is bottom-up from syntax. When the parser gets it wrong, there is no external signal to recover.

---

## 3. What We Need From Fandaws

### 3.1 Per-Term Data (Required)

For each term in the Fandaws graph, we need **4 properties**:

| Property | RDF Predicate | Example | Purpose |
|----------|--------------|---------|---------|
| **Canonical label** | `rdfs:label` | "Centers for Medicare & Medicaid Services" | Primary match target |
| **Alternative labels** | `skos:altLabel` | "CMS", "Centers for Medicare", "CMMS" | Acronym/abbreviation matching |
| **BFO/CCO type** | `rdf:type` | `cco:GovernmentOrganization` | Entity classification |
| **Domain/Range** | `rdfs:domain` / `rdfs:range` | `domain: cco:Agent`, `range: cco:InformationContentEntity` | Selectional restrictions for role assignment |

### 3.2 Per-Term Data (Optional, High Value)

| Property | RDF Predicate | Example | Purpose |
|----------|--------------|---------|---------|
| Compound term flag | `skos:notation` or custom | "system security assessment" | NER boundary anchoring |
| Superclass chain | `rdfs:subClassOf` | `GovernmentOrganization → Organization → Agent` | Type inference |
| Related terms | `skos:related` | CMS ↔ USCIS ↔ DHS | Coreference hints |

### 3.3 Delivery Format

**Option A (Preferred): Per-domain TTL files**

```turtle
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix cco:  <https://www.commoncoreontologies.org/> .
@prefix hiri: <https://hiri.fandaws.com/> .

hiri:abc123def456
    a cco:GovernmentOrganization ;
    rdfs:label "Centers for Medicare & Medicaid Services" ;
    skos:altLabel "CMS", "Centers for Medicare" ;
    rdfs:domain cco:Agent .

hiri:789ghi012jkl
    a cco:InformationContentEntity ;
    rdfs:label "Data Exchange Agreement" ;
    skos:altLabel "DEA", "agreement" .
```

One TTL file per domain (legal, medical, finance, etc.) with all terms for that domain.

**Option B: IPFS Gateway API**

```
GET https://gateway.fandaws.com/hiri/{content-hash}
→ Returns single TTL atom for that term
```

We will use both: TTL files for build-time compilation, IPFS for runtime on-demand resolution.

---

## 4. How TagTeam Will Use It

### 4.1 Build-Time Compilation (One-Time)

We compile the Fandaws TTL exports into two artifacts that ship with the TagTeam bundle:

```
Fandaws TTL files (150K terms)
    │
    ▼  TagTeam Compiler Script
    │
    ├── bloom-filter.bin (~225KB)
    │     Every rdfs:label + skos:altLabel → hashed
    │     Purpose: instant "might exist" check at parse time
    │
    └── core-vocabulary.json (~500KB)
          Top 2,000 terms by frequency
          { hiri, label, altLabels[], type, domain, range }
          Purpose: covers ~80% of lookups without network
```

### 4.2 Runtime Lookup (Per-Sentence)

```
1. Parse sentence (15ms) → extract entity candidates: ["CMS", "USCIS", "records"]

2. Bloom filter check (<1ms per term):
   "CMS"     → MAYBE (check cache)
   "records"  → NO (common noun, skip)
   "USCIS"   → MAYBE (check cache)

3. Cache lookup (<1ms):
   "CMS" → HIT: { type: GovernmentOrganization, hiri: "hiri:abc123..." }

4. IPFS fetch (50-200ms, cache miss only):
   Unknown term → fetch HIRI atom → cache result

5. Enrich graph:
   - denotesType: "GovernmentOrganization" (not guessed "Entity")
   - Tier 2 IRI: use HIRI address directly
   - Role validation: if "provide" has range ICE, "data" gets PatientRole
```

### 4.3 What Each Property Fixes

| Fandaws Property | TagTeam Problem It Fixes | Current Failure Mode |
|-----------------|-------------------------|---------------------|
| `rdfs:label` | `_findTier2ByLabel` resolution | "data" doesn't match Tier 2 "datum" |
| `skos:altLabel` | Acronym entity recognition | "CMS" not recognized without hardcoded list |
| `rdf:type` | Entity typing accuracy (~70%) | "application" typed as "Artifact" instead of "InformationContentEntity" |
| `rdfs:domain/range` | Role assignment (F1 57.8%) | "data" gets AgentRole instead of PatientRole for "receive" |
| Compound terms | NER boundary accuracy | "system security assessments" fragmented or over-chunked |

---

## 5. IPFS / HIRI Requirements

### 5.1 Gateway Endpoint

TagTeam needs an HTTPS gateway endpoint that resolves HIRI content hashes to TTL atoms:

```
GET https://gateway.fandaws.com/hiri/{hash}
Content-Type: text/turtle

Response: Single TTL term definition (rdfs:label, skos:altLabel, rdf:type, rdfs:domain/range)
```

### 5.2 Latency

- **Target**: <200ms per lookup (p95)
- **Acceptable**: <500ms (graceful degradation — TagTeam operates in async mode)
- **Offline fallback**: If IPFS is unavailable, TagTeam falls back to bloom filter + core vocabulary (no network required)

### 5.3 CORS

The gateway must return `Access-Control-Allow-Origin: *` headers for browser-based TagTeam usage.

### 5.4 Batch API (Optional, Nice to Have)

```
POST https://gateway.fandaws.com/hiri/batch
Body: { "terms": ["CMS", "USCIS", "SAVE Program"] }

Response: { "results": [ { hiri, label, altLabels, type }, ... ] }
```

This avoids N sequential lookups for sentences with many entity candidates.

---

## 6. Domain Coverage Priority

TagTeam's current test corpus is federal regulatory text (CMS-DHS MOA). Priority domains for initial integration:

| Priority | Domain | Key Terms | Estimated Count |
|----------|--------|-----------|----------------|
| 1 | **US Government** | Agency names, acronyms (CMS, DHS, USCIS, CBP, OMB) | ~500 |
| 2 | **Legal/Regulatory** | Agreement types, compliance terms, statutory references | ~2,000 |
| 3 | **Healthcare** | Programs (SAVE, Medicare, Medicaid), conditions, procedures | ~5,000 |
| 4 | **General** | Common nouns with BFO type annotations | ~50,000 |
| 5 | **Full graph** | All 150K terms | All |

Priorities 1-2 are needed for the ISA corpus to reach 85%+. Priority 3 for the broader SMA use case.

---

## 7. Integration Timeline

| Phase | What | Who | When |
|-------|------|-----|------|
| **F-0** | Fandaws exports Priority 1-2 TTL files (gov + legal) | Fandaws team | Week 1 |
| **F-1** | TagTeam builds compiler (TTL → bloom + core vocab) | TagTeam team | Week 1-2 |
| **F-2** | TagTeam builds async resolver (bloom → cache → IPFS) | TagTeam team | Week 2-3 |
| **F-3** | Wire into entity extraction (ontology-aware spans) | TagTeam team | Week 3-4 |
| **F-4** | Wire into type assignment (BFO/CCO from graph) | TagTeam team | Week 3-4 |
| **F-5** | Wire into selectional preferences (domain/range) | TagTeam team | Week 4-5 |
| **F-6** | Wire into `_findTier2ByLabel` (canonical + altLabels) | TagTeam team | Week 3 |
| **F-7** | Domain manifests + production tuning | Both teams | Week 5 |

**F-0 is the critical dependency.** TagTeam cannot begin F-1 without TTL files from Fandaws.

---

## 8. Validation Criteria

Once integrated, TagTeam will validate against:

1. **ISA Corpus**: 40 sentences from CMS-DHS MOA → target ≥85% pass (currently 80%)
2. **Entity typing accuracy**: Spot-check 100 entities → target ≥92% correct BFO type
3. **Role F1**: Gold evaluation 200 sentences → target ≥72% (currently 57.8%)
4. **NER boundary**: Entity fragmentation tests → target ≥95% correct boundaries
5. **Latency**: p50 < 25ms (sync, bloom+cache), p95 < 300ms (async, IPFS miss)

---

## 9. Questions for Fandaws Team

1. **TTL export timeline**: When can Priority 1-2 domain files (gov + legal, ~2,500 terms) be exported?
2. **HIRI hash format**: What is the content-addressing scheme? SHA-256? CID v1?
3. **IPFS gateway**: Is there an existing HTTPS gateway, or does one need to be provisioned?
4. **altLabel coverage**: Do all terms have `skos:altLabel` for acronyms/abbreviations, or only some?
5. **domain/range completeness**: What percentage of properties have explicit `rdfs:domain` and `rdfs:range`?
6. **Update frequency**: How often do TTL files change? (Determines whether we can cache aggressively)

---

## 10. Contact

For technical questions about the TagTeam integration:
- **Repository**: `github.com/Skreen5hot/TagTeam.js` (branch: `dev`)
- **Key files**: `src/graph/SemanticGraphBuilder.js`, `src/ontology/OntologyTextTagger.js`
- **Test runner**: `dist/isa-test-runner-cms-dhs.html` (40-sentence ISA corpus)
- **Spec**: `docs/development/PLANNED_WORK.md` v3.0, Section "Tier 2b: Fandaws HIRI Integration"
