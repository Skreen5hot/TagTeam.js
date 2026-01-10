# TagTeam Test Suite

Validation test suites for TagTeam semantic parser.

---

## 🧪 Test Files

### [test-iee-corpus.html](test-iee-corpus.html)
Tests TagTeam against IEE's 5 official test scenarios with detailed validation.

**Scenarios:**
- healthcare-001: End of life decision
- spiritual-001: Leaving faith community
- vocational-001: Whistleblowing decision
- interpersonal-001: Friend's infidelity
- environmental-001: Climate action vs economic impact

**Validates:**
- Agent, action, patient extraction
- Semantic frame classification
- Tense, aspect, modality, negation detection
- POS tagging
- Confidence scoring

**Expected:** ≥75% pass rate (Week 1 target)

---

### [test-iee-format.html](test-iee-format.html)
Original 4-scenario test suite for IEE format compliance.

**Scenarios:**
1. Medical information disclosure
2. Community decision
3. Resource allocation
4. Life support (negation + compound noun)

**Validates:** IEE format requirements (negation field, semanticFrame top-level, etc.)

**Expected:** 4/4 scenarios pass (100%)

---

### [run-iee-validator.html](run-iee-validator.html)
Full IEE validator using IEE's official validation suite.

**Features:**
- Uses `tagteam-validator-browser.js` (IEE's official validator)
- Loads `test-corpus-week1.json` (IEE's test data)
- Generates comprehensive accuracy report
- Per-scenario detailed validation

**Metrics:**
- Agent extraction accuracy
- Action extraction accuracy
- Patient extraction accuracy
- Negation detection accuracy
- Overall parse accuracy

---

## 🚀 Quick Start

```bash
# Open any test file in browser
open test-iee-corpus.html
open test-iee-format.html
open run-iee-validator.html
```

---

## 📊 Expected Results

| Test File | Pass Rate | Notes |
|-----------|-----------|-------|
| test-iee-format.html | 100% (4/4) | ✅ Passing |
| test-iee-corpus.html | ≥75% | ⏳ Pending validation |
| run-iee-validator.html | ≥75% | ⏳ Pending validation |

---

## 🔧 Validators

### [validators/tagteam-validator.js](validators/tagteam-validator.js)
IEE's official validator (ES6 module version)

### [validators/tagteam-validator-browser.js](validators/tagteam-validator-browser.js)
Browser-compatible version (IIFE format)

---

## 📁 Dependencies

Tests load from:
- `../src/` - Core implementation
- `../iee-collaboration/from-iee/data/` - Test data

---

**Last Updated:** 2026-01-10
**Status:** Week 1 tests ready for validation
