# TagTeam Semantic Parser Integration

Workspace for collaboration between IEE and TagTeam on NLP semantic role labeling.

## Project Overview

**TagTeam** is a deterministic JavaScript semantic parser that extracts agent-action-patient structures from natural language ethical scenarios. This integration enables automated semantic analysis for the Integral Ethics Engine's deliberation process.

## Directory Structure

```
tagteam/
├── deliverables/          # Work products received from TagTeam
│   └── week1/            # Week 1 semantic parser + test results
├── requirements/          # Specifications and requirements from IEE
├── communication/         # Correspondence and status updates
├── data/                 # Shared data artifacts
│   ├── compound-terms.json         # 150 multi-word entities
│   ├── test-corpus-week1.json      # 5 annotated test scenarios
│   └── value-definitions-core.json # 20 core values
├── dist/                 # Distributable bundles
│   ├── tagteam.js                  # 4.15MB single-file bundle
│   ├── test-iee-bundle.html        # One-click validation
│   └── simple-test.cjs             # Node.js test runner
└── integration/          # IEE integration code
    └── tagteam-validator.js        # Validation suite
```

## Current Status

**Phase:** Week 1 Complete ✅
**Pass Rate:** 84.2% (16/19 checks)
**Target:** ≥75% for Week 1 acceptance
**Status:** ✅ **WEEK 1 ACCEPTED** - Target exceeded by +9.2%

### Week 1 Results
- ✅ Progressive aspect handling fixed
- ✅ Frame mapping complete (all frames working)
- ✅ Modal verb recognition working
- ✅ Agent extraction robust (handles POS tagger edge cases)
- 🟡 Lemmatization refinement (3 checks) - suitable for Week 2 enhancement

**Initial Validation:** 63.2% (12/19) - Jan 10, 2026
**After Week 1 Fixes:** 84.2% (16/19) - Jan 11, 2026
**Improvement:** +21 percentage points

See [communication/WEEK1_VALIDATION_RESULTS.md](communication/WEEK1_VALIDATION_RESULTS.md) for detailed analysis.

## Quick Links

**Latest Communication:**
- [WEEK1_ACCEPTANCE.md](communication/WEEK1_ACCEPTANCE.md) - **Week 1 formally accepted** (84.2% pass)
- [WEEK1_VALIDATION_RESULTS.md](communication/WEEK1_VALIDATION_RESULTS.md) - Week 1 final validation details
- [TAGTEAM_VALIDATION_RESULTS.md](communication/TAGTEAM_VALIDATION_RESULTS.md) - Initial validation (63.2% pass)
- [testing-handoff.md](communication/testing-handoff.md) - Testing handoff document

**Requirements:**
- [WEEK2_REQUIREMENTS.md](requirements/WEEK2_REQUIREMENTS.md) - **Week 2 scope and specifications** 📋 NEW
- [integration-requirements.md](requirements/integration-requirements.md) - Week 1 integration specifications
- [test-build-plan.md](requirements/test-build-plan.md) - Test and build requirements

**Data Artifacts:**
- [data/test-corpus-week2.json](data/test-corpus-week2.json) - **20 annotated scenarios** 📋 NEW
- [data/value-definitions-comprehensive.json](data/value-definitions-comprehensive.json) - **50 comprehensive values** 📋 NEW
- [data/context-patterns.json](data/context-patterns.json) - **12-dimension context keywords** 📋 NEW
- [data/test-corpus-week1.json](data/test-corpus-week1.json) - 5 annotated scenarios (Week 1)
- [data/value-definitions-core.json](data/value-definitions-core.json) - 20 core values (Week 1)
- [data/compound-terms.json](data/compound-terms.json) - 150 multi-word entities

**Deliverables:**
- [deliverables/week1/](deliverables/week1/) - Week 1 semantic parser bundle
- [dist/tagteam.js](dist/tagteam.js) - Single-file distributable (4.15MB)

## Running Validation Tests

### Browser Test (Easiest)
1. Open `dist/test-iee-bundle.html` in browser
2. Click "▶️ Run All Tests"
3. Review pass/fail results

### Node.js Test
```bash
cd dist/
node simple-test.cjs
```

Expected output: Pass rate percentage and detailed results

## Integration Timeline

### Week 1 (Jan 10-17, 2026) ✅ COMPLETE
- ✅ IEE delivers test corpus, compound terms, validator
- ✅ TagTeam delivers single-file bundle
- ✅ IEE runs initial validation (63.2% pass rate)
- ✅ TagTeam implements 5 critical fixes
- ✅ IEE re-validates (84.2% pass rate - **EXCEEDS TARGET**)

### Week 2 (Jan 20-24, 2026) 📋 IN PLANNING
- 📋 Requirements delivered (WEEK2_REQUIREMENTS.md)
- 📋 Test corpus ready (20 scenarios with full annotations)
- 📋 Value definitions ready (50 comprehensive values)
- 📋 Context patterns ready (keyword patterns for 12 dimensions)
- ⏳ Awaiting TagTeam feedback on timeline and scope
- **Scope:** Context intensity analysis + Value matching engine

### Week 3 (Jan 27-31, 2026)
- Conflict detection
- Salience scoring
- Expand to 50 test scenarios

## TagTeam API Usage

### Basic Parsing
```javascript
// Load bundle
<script src="dist/tagteam.js"></script>

// Parse sentence
const result = TagTeam.parse("The family must decide whether to continue treatment");

// Access roles
console.log(result.agent);      // { text: "family", entity: "family" }
console.log(result.action);     // { verb: "decide", modality: "must" }
console.log(result.semanticFrame); // "Deciding"
```

### Batch Parsing
```javascript
const results = TagTeam.parseMany([
  "I love my best friend",
  "The doctor recommended treatment"
]);
```

See [dist/README.md](dist/README.md) for complete API documentation.

## Contact & Communication

**Handoff Method:** Asynchronous via shared directory structure
- IEE places requirements/questions in `requirements/` and `communication/`
- TagTeam places deliverables in `deliverables/` and `dist/`
- Both teams update communication docs with status

**Next Action Items:**
1. ✅ Week 1 Complete - 84.2% pass rate achieved
2. 🎯 Week 2 Planning - Expand test corpus to 20 scenarios
3. 🔧 Optional Enhancement - Complete verb lemmatization (3 remaining checks)
4. 📋 Begin Week 2 artifacts - Context analysis, value matching

## Archive

This collaboration workspace will be preserved as-is for:
- Future reference
- Handoff documentation patterns
- Validation methodology examples
