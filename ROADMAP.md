# TagTeam Consolidated Roadmap

**Version:** 4.0.0
**Last Updated:** 2026-01-19
**Status:** Phase 4 Complete, Production Ready

---

## Project Overview

TagTeam is a **self-contained semantic parser** for ethical dilemma analysis. It works like mermaid.js or d3.js - a single JavaScript bundle that runs in browser or Node.js with no external dependencies.

```
dist/tagteam.js  (~4.8 MB single bundle)
```

### Core Capabilities

- **Semantic Role Extraction**: Agent, Patient, Theme, Recipient
- **Ethical Value Detection**: 50 IEE values with polarity and salience
- **Context Analysis**: 12-dimension intensity scoring
- **JSON-LD Output**: BFO/CCO compliant knowledge graphs
- **SHACL Validation**: 8 expert-certified patterns

---

## What's Complete

### Phase 4: JSON-LD Semantic Graphs (DONE)

**Certification:** 5.0/5.0 BFO/CCO Realist Compliance (2026-01-19)

| Week | Deliverables | Status |
|------|-------------|--------|
| **Week 1** | Two-tier architecture, Entity/Act extraction, Role detection | ✅ Complete |
| **Week 2** | Assertion events, GIT-Minimal provenance, Information Staircase | ✅ Complete |
| **Week 3** | SHACL validation, Complexity budget, Corpus testing, Documentation | ✅ Complete |

**Key Files Created:**
```
src/graph/
├── SemanticGraphBuilder.js    # Main orchestrator
├── EntityExtractor.js         # Tier 1/2 entity extraction
├── ActExtractor.js            # IntentionalAct nodes + selectional restrictions
├── RoleDetector.js            # BFO roles (Agent, Patient)
├── DomainConfigLoader.js      # Domain configuration system
├── AssertionEventBuilder.js   # Value/Context assertions
├── ContextManager.js          # Interpretation contexts
├── InformationStaircaseBuilder.js  # IBE/ICE linkage
├── JSONLDSerializer.js        # JSON-LD output
├── SHMLValidator.js           # SHACL pattern validation
├── ComplexityBudget.js        # Graph limits
└── [other factories...]

config/
└── medical.json               # Medical domain vocabulary
```

**Test Coverage:** 245+ tests passing

**Documentation:**
- [docs/PHASE4_USER_GUIDE.md](docs/PHASE4_USER_GUIDE.md)
- [docs/JSONLD_EXAMPLES.md](docs/JSONLD_EXAMPLES.md)
- [docs/SHACL_VALIDATION_GUIDE.md](docs/SHACL_VALIDATION_GUIDE.md)

---

## Current Architecture

### Self-Contained Bundle

```
┌─────────────────────────────────────────────────────────────┐
│                    tagteam.js (4.8 MB)                      │
├─────────────────────────────────────────────────────────────┤
│  Core                                                       │
│  ├── lexicon.js (4.1 MB POS lexicon)                       │
│  ├── POSTagger.js                                          │
│  ├── PatternMatcher.js                                     │
│  └── SemanticRoleExtractor.js                              │
├─────────────────────────────────────────────────────────────┤
│  Analyzers                                                  │
│  ├── ContextAnalyzer.js (12 dimensions)                    │
│  ├── ValueMatcher.js                                       │
│  ├── ValueScorer.js                                        │
│  └── EthicalProfiler.js                                    │
├─────────────────────────────────────────────────────────────┤
│  Graph (Phase 4)                                            │
│  ├── SemanticGraphBuilder.js                               │
│  ├── JSONLDSerializer.js                                   │
│  ├── SHMLValidator.js                                      │
│  └── [12 other modules]                                    │
├─────────────────────────────────────────────────────────────┤
│  Data                                                       │
│  ├── IEE 50 value definitions                              │
│  ├── Frame-value boosts                                    │
│  ├── Conflict pairs                                        │
│  └── Compound terms                                        │
└─────────────────────────────────────────────────────────────┘
```

### Usage

```html
<!-- Browser -->
<script src="tagteam.js"></script>
<script>
  const result = TagTeam.parse("The doctor must allocate the ventilator");
  console.log(result.ethicalProfile);
  console.log(result.semanticGraph);  // JSON-LD
</script>
```

```javascript
// Node.js
const TagTeam = require('./dist/tagteam.js');
const result = TagTeam.parse(text);
```

---

## Immediate Priorities

### 1. Production Deployment (Ready Now)

Phase 4 is production-ready:
- 100% SHACL compliant (0 violations)
- 100% valid JSON-LD output
- 70% average compliance score
- <150ms parse time

**To deploy:**
```bash
npm run build
# Output: dist/tagteam.js (4.8 MB)
```

### 2. IEE Integration Support

Support IEE team with:
- JSON-LD output integration
- SHACL validation for their pipelines
- Custom context support (MedicalEthics, etc.)

### 3. Bug Fixes / Improvements

| Issue | Priority | Description |
|-------|----------|-------------|
| Vocabulary warnings | Low | Add remaining TagTeam predicates to validator |
| SocioPrimal warnings | Low | Add temporal grounding to acts |
| Information Staircase | Low | Link all ICE nodes to IBE |

---

## What's Complete (Continued)

### Domain-Neutral Parser Implementation (DONE)

**Certification:** 5.0/5.0 Expert Certified (2026-01-19)

Resolved the "Medical Hardcoding" issue by transitioning to a domain-neutral architecture.

| Phase | Deliverables | Status |
|-------|-------------|--------|
| **Phase 1** | Suffix-based process detection, result noun exceptions, ONTOLOGICAL_VOCABULARY | ✅ Complete |
| **Phase 2** | DomainConfigLoader, config/medical.json, type specialization | ✅ Complete |
| **Phase 3** | Selectional restrictions, verb sense disambiguation, config overrides | ✅ Complete |

**Key Files Created/Modified:**
```
src/graph/
├── DomainConfigLoader.js      # Domain configuration loader (NEW)
├── EntityExtractor.js         # Priority-based type detection (MODIFIED)
├── ActExtractor.js            # Selectional restrictions (MODIFIED)
└── SemanticGraphBuilder.js    # Config loading API (MODIFIED)

config/
└── medical.json               # Medical domain configuration (NEW)

tests/unit/
├── test-domain-neutral-phase1.js    # Phase 1 tests (15 tests)
├── test-domain-config.js            # Phase 2 tests (17 tests)
└── test-selectional-restrictions.js # Phase 3 tests (16 tests)
```

**Key Achievements:**
- "Palliative care" now correctly typed as `cco:ActOfCare` (Occurrent), not Artifact
- "Provide care" → `cco:ActOfService` via selectional restrictions
- "Provide medication" → `cco:ActOfTransferOfPossession` (different verb sense)
- Domain vocabulary moved to loadable config files
- BFO-only mode works without any config loaded

---

## Future Roadmap

### Phase 5: Advanced Disambiguation (Recommended by Expert Review)

**Goal:** Address the "Honest Gaps" identified in expert certification

Based on the 2026-01-19 expert review, the following enhancements are recommended:

#### 5.1 Noun Ambiguity Resolution

**Problem:** Words like "organization" can be either a Process or Continuant depending on context.

**Current Approach:** Determiner-based heuristics ("the organization" = entity, "organization of files" = process)

**Proposed Enhancement:**
- Integrate syntactic context from Compromise NLP
- Use prepositional phrases as disambiguation signals
- Add confidence scoring for ambiguous cases

| Signal | Interpretation | Example |
|--------|---------------|---------|
| "the X" + verb phrase | Continuant | "The organization hired..." |
| "X of Y" | Process | "Organization of files..." |
| "during X" | Occurrent | "During treatment..." |

**Priority:** Medium
**Status:** Not started

#### 5.2 Iterative Verb Refinement

**Problem:** Unbounded verb mappings like "run" have many senses ("run a company" vs "run a risk")

**Current Approach:** Selectional restrictions based on direct object type

**Proposed Enhancement:**
- Use ActualityStatus retroactively to disambiguate
- Use ContextDimension scores to inform verb sense
- Implement iterative refinement passes

**Example:**
```
Input: "The CEO runs the company"
Pass 1: run + Organization → cco:ActOfManaging (selectional restriction)
Pass 2: Verify with ContextDimension[ResourceDistribution] → confirms business sense
```

**Priority:** Low
**Status:** Not started

#### 5.3 Vocabulary Learning Module

**Problem:** Manual creation of domain config files is labor-intensive

**Proposed Enhancement:**
- Auto-suggest domain types via BFO-rooting
- Cluster similar terms linguistically
- Generate draft config files from corpus analysis

**Use Case:**
```javascript
const learner = new VocabularyLearner();
learner.analyzeCorpus(legalDocuments);
// Output: draft config/legal.json with suggested mappings
```

**Priority:** Low
**Status:** Not started - requires significant R&D

---

### Phase 6: Human Validation Loop (Planned)

**Goal:** Enable human experts to validate/correct automated detections

**Features:**
- `tagteam:HumanValidation` assertion type
- `tagteam:HumanRejection` for false positives
- `tagteam:HumanCorrection` for modifications
- `tagteam:supersedes` chain for tracking corrections
- Validation timestamp and validator ID

**Status:** Not Started - Requires IEE team input on workflow

---

### Phase 7: Extended Domain Support (Future Vision)

**Goal:** Expand domain-neutral parser to additional domains

With the DomainConfigLoader architecture now in place, adding new domains is straightforward:

| Domain | Config File | Status |
|--------|-------------|--------|
| Medical | `config/medical.json` | ✅ Complete |
| Legal | `config/legal.json` | Not started |
| Business | `config/business.json` | Not started |
| Scientific | `config/scientific.json` | Not started |

**To add a new domain:**
```javascript
// 1. Create config file
// config/legal.json
{
  "domain": "legal",
  "version": "1.0",
  "processRootWords": {
    "trial": "legal:LegalTrial",
    "hearing": "legal:LegalHearing"
  },
  "verbOverrides": {
    "file": {
      "objectIsGDC": "legal:ActOfFiling"
    }
  }
}

// 2. Load in code
builder.loadDomainConfig('config/legal.json');
```

---

### Future Architecture Considerations

#### Modular Bundles (Under Consideration)

```
tagteam-core.js (~2.5 MB)
├── Semantic role extraction
├── DomainConfigLoader
├── BFO type detection
└── JSON-LD serialization

tagteam-ethics.js (~1 MB) [optional]
├── ContextAnalyzer
├── ValueScorer
├── EthicalProfiler
└── IEE value definitions

tagteam-medical.js (~50 KB) [optional]
└── config/medical.json embedded
```

**Status:** Not scheduled - current monolithic bundle works well

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 4.0.0-phase4 | 2026-01-19 | Domain-Neutral Parser (Phases 1-3), Selectional Restrictions |
| 4.0.0 | 2026-01-19 | Phase 4 complete, JSON-LD, SHACL validation |
| 3.0.0 | - | Future: Modular bundles |
| 2.0.0 | 2026-01 | IEE integration, 50 values, ethical profiling |
| 1.0.0 | 2025 | Initial semantic parser |

---

## File Structure

```
TagTeam.js/
├── dist/
│   └── tagteam.js              # Production bundle (4.8 MB)
├── src/
│   ├── core/                   # Semantic parsing
│   ├── analyzers/              # Ethics analysis
│   ├── graph/                  # Phase 4 JSON-LD
│   └── types/                  # TypeScript definitions
├── tests/
│   ├── unit/                   # 200+ unit tests
│   └── integration/            # Corpus validation
├── docs/
│   ├── PHASE4_USER_GUIDE.md
│   ├── JSONLD_EXAMPLES.md
│   └── SHACL_VALIDATION_GUIDE.md
├── planning/
│   └── week3/                  # Phase 4 planning docs
├── iee-collaboration/          # IEE test corpus
├── ROADMAP.md                  # This file
└── README.md
```

---

## Quick Reference

### Build Commands

```bash
npm run build          # Build production bundle
npm test               # Run all tests
node tests/unit/test-shacl-validation.js    # SHACL tests
node tests/integration/test-phase4-corpus.js # Corpus validation
```

### Key APIs

```javascript
// Basic parsing
const result = TagTeam.parse(text);

// With JSON-LD output
const builder = new SemanticGraphBuilder();
const graph = builder.build(text, { context: 'MedicalEthics' });
const jsonld = new JSONLDSerializer().serialize(graph);

// SHACL validation
const validator = new SHMLValidator();
const report = validator.validate(graph);
```

### Test Results (Current)

| Test Suite | Passed | Total |
|------------|--------|-------|
| Domain-Neutral Phase 1 | 15 | 15 |
| Domain-Neutral Phase 2 | 17 | 17 |
| Domain-Neutral Phase 3 | 16 | 16 |
| SHACL Validation | 29 | 29 |
| Complexity Budget | 32 | 32 |
| Corpus Validation | 21 | 21 |
| Total | 290+ | 290+ |

---

## Contact & Support

- **Issues:** https://github.com/anthropics/claude-code/issues
- **IEE Collaboration:** See `iee-collaboration/` folder

---

**TagTeam** - Deterministic semantic parsing for ethical dilemma analysis.
