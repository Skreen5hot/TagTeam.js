# TagTeam Test Suite

Comprehensive test suite for TagTeam semantic parser, organized by test type.

---

## 📁 Directory Structure

### integration/
Node.js integration tests for complete system validation
- `test-integration.js` - Basic integration tests
- `test-full-corpus.js` - Full 20-scenario validation
- `test-week2b.js` - Week 2b component tests
- `test-integration-node.js` - Node.js-specific tests
- `test-debug.js` - Debugging and analysis tools

### browser/
HTML-based browser tests with visual results
- `test-week1-fixes.html` - Week 1 regression tests
- `test-week2a-context.html` - Context intensity tests
- `test-debug-trust.html` - Trust scoring debug
- `verify-bundle.html` - Bundle verification

### iee/
IEE-specific test suites and validators
- `test-iee-corpus.html` - 5 official IEE scenarios
- `test-iee-format.html` - IEE format compliance
- `run-iee-validator.html` - IEE official validator

### validators/
Validation logic and utilities
- `tagteam-validator.js` - IEE validator (ES6 module)
- `tagteam-validator-browser.js` - IEE validator (browser)

### unit/
Unit tests for individual components (Week 3+)
- (Future: test-value-matcher.js)
- (Future: test-value-scorer.js)
- (Future: test-ethical-profiler.js)

---

## 🚀 Quick Start

### Run Integration Tests
```bash
# Full corpus validation (20 scenarios)
node tests/integration/test-full-corpus.js

# Basic integration
node tests/integration/test-integration.js

# Week 2b components
node tests/integration/test-week2b.js
```

### Run Browser Tests
```bash
# Open in browser
open tests/browser/verify-bundle.html
open tests/iee/run-iee-validator.html
```

### NPM Scripts
```bash
npm test                # Runs full corpus test
npm run test:browser    # Instructions for browser tests
```

---

## 🧪 Test Coverage

### Week 1: Semantic Roles
**Tests:** `iee/test-iee-corpus.html`, `browser/test-week1-fixes.html`
**Coverage:**
- ✅ Agent/Patient extraction
- ✅ Semantic frames (15 types)
- ✅ Modality detection
- ✅ Negation handling
- ✅ POS tagging

**Expected:** 84.2% accuracy (achieved)

### Week 2a: Context Intensity
**Tests:** `browser/test-week2a-context.html`
**Coverage:**
- ✅ Temporal dimensions (urgency, duration, reversibility)
- ✅ Relational dimensions (intimacy, power, trust)
- ✅ Consequential dimensions (harm, benefit, scope)
- ✅ Epistemic dimensions (certainty, information, expertise)

**Expected:** 100% accuracy (achieved)

### Week 2b: Ethical Values
**Tests:** `integration/test-full-corpus.js`, `integration/test-week2b.js`
**Coverage:**
- ✅ Value detection (50 values across 5 domains)
- ✅ Polarity detection (+1 upheld, -1 violated, 0 conflicted)
- ✅ Salience calculation
- ✅ Conflict detection
- ✅ Domain analysis

**Expected:** 75% coverage, 100% precision (achieved)

---

## 📊 Test Results

### Latest Results (Week 2b)

| Test Type | Status | Pass Rate | Notes |
|-----------|--------|-----------|-------|
| **Integration Tests** | ✅ | 75% (15/20) | Expected behavior |
| **Browser Tests** | ✅ | Pass | Visual verification |
| **IEE Validator** | ✅ | 84.2% | Week 1 target met |
| **Regression** | ✅ | 3/3 | No regressions |
| **Performance** | ✅ | 25-40ms | Well under 100ms target |

### Test Corpus
- **Week 1:** 5 scenarios (IEE)
- **Week 2:** 20 scenarios (expanded)
- **Week 3:** TBD

---

## 🔧 Test Data

Tests load data from:
- `../iee-collaboration/from-iee/data/test-corpus-week1.json` - Week 1 corpus
- `../iee-collaboration/from-iee/data/test-corpus-week2.json` - Week 2 corpus
- `../iee-collaboration/from-iee/data/value-definitions-comprehensive.json` - 50 values
- `../iee-collaboration/from-iee/data/frame-value-boosts.json` - Frame/role mappings
- `../iee-collaboration/from-iee/data/conflict-pairs.json` - Conflict pairs

---

## 🎯 Running Specific Tests

### Full Corpus Validation
```bash
node tests/integration/test-full-corpus.js
```
**Output:**
- Scenario coverage (15/20 = 75%)
- Value detection statistics
- Polarity accuracy
- Salience accuracy
- Performance metrics
- Saved to `WEEK2B_METRICS.json`

### Bundle Verification
```bash
# Open in browser
open tests/browser/verify-bundle.html
```
**Tests:**
- Bundle loads correctly
- TagTeam API available
- Parse functionality works
- All features present (v2.0)

### IEE Official Validator
```bash
# Open in browser
open tests/iee/run-iee-validator.html
```
**Uses:** IEE's official validation logic
**Output:** Detailed accuracy report per scenario

---

## 🐛 Debugging

### Debug Tools
- `tests/integration/test-debug.js` - Value detection debugging
- `tests/browser/test-debug-trust.html` - Trust scoring debug

### Debug Output
Set debug flags in test files:
```javascript
const result = TagTeam.parse(text, { debug: true });
console.log(result.metadata);  // Debug info
```

---

## ✅ Adding New Tests

### Integration Test Template
```javascript
// tests/integration/test-my-feature.js
const TagTeam = require('../../dist/tagteam.js');

console.log('Testing my feature...');
const result = TagTeam.parse("Test text");
console.log(result.myFeature ? '✅ PASS' : '❌ FAIL');
```

### Browser Test Template
```html
<!-- tests/browser/test-my-feature.html -->
<!DOCTYPE html>
<html>
<head>
  <title>My Feature Test</title>
  <script src="../../dist/tagteam.js"></script>
</head>
<body>
  <h1>My Feature Test</h1>
  <div id="results"></div>
  <script>
    const result = TagTeam.parse("Test text");
    document.getElementById('results').innerHTML =
      result.myFeature ? '✅ PASS' : '❌ FAIL';
  </script>
</body>
</html>
```

---

## 📝 Test Checklist

Before merging new features:

- [ ] Integration tests pass
- [ ] Browser tests pass
- [ ] No regressions (run test-week1-fixes.html)
- [ ] Performance acceptable (<100ms for single parse)
- [ ] IEE validator passes (if semantic changes)
- [ ] Documentation updated

---

## 🔮 Future Tests (Week 3+)

### Planned Unit Tests
- `tests/unit/test-ontology-loader.js` - Ontology loading
- `tests/unit/test-ttl-parser.js` - Turtle parser
- `tests/unit/test-bfo-mapping.js` - BFO compatibility

### Planned Integration Tests
- `tests/integration/test-multi-sentence.js` - Scenario-level analysis
- `tests/integration/test-semantic-matching.js` - Implicit value detection
- `tests/integration/test-custom-ontology.js` - Custom ontology loading

---

**Last Updated:** 2026-01-18 (v2.0.0)
**Status:** Week 2b tests complete, ready for Week 3
