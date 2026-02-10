# Expert Validation Test Harness

**Purpose:** Efficient bulk testing workflow for CCO/SME validation of TagTeam parsing accuracy.

## Quick Start

### 1. Run Expert Tests
```bash
npm run test:expert
```
This runs all tests in `test-matrix.json` and generates:
- JSON report: `results/expert-validation-report.json`
- Console summary with pass/fail status

### 2. View Visual Summary
```bash
# Open in browser automatically
start tests/expert-validation/results/expert-validation-visual-summary.html

# Or open manually
tests/expert-validation/results/expert-validation-visual-summary.html
```

### 3. Interactive Testing (Optional)
```bash
npm run test:expert:open
```
Opens the interactive HTML harness where you can:
- Input test sentences in JSON format
- Run tests in real-time
- See results side-by-side
- Export results for expert review

## Files

### Input
- **`test-matrix.json`** - Expert-designed test cases in JSON format

### Output
- **`results/expert-validation-report.json`** - Complete test results with JSON-LD graphs
- **`results/expert-validation-visual-summary.html`** - Annotated visual report for stakeholders
- **`results/` directory** - All generated reports and artifacts

### Tools
- **`run-expert-tests.js`** - Command-line test runner
- **`expert-test-harness.html`** - Interactive browser-based test harness

## Test Matrix Format

Create tests in `test-matrix.json`:

```json
[
  {
    "id": "1.2-subordination-if",
    "category": "subordination-prefix",
    "sentence": "If the server fails, the admin receives an alert.",
    "hypothesis": "Likely FAIL: Same comma-dependency as 'When'",
    "priority": "P0",
    "dimension": "Subordination",
    "expectedIssue": "Argument bleeding - 'fails' may consume 'admin'"
  }
]
```

### Fields
- **id:** Unique test identifier (e.g., "1.2-subordination-if")
- **category:** Test category (subordination-prefix, relative-clause, etc.)
- **sentence:** Input sentence to parse
- **hypothesis:** Expert's prediction of behavior
- **priority:** P0 (blocking), P1 (critical), P2 (medium)
- **dimension:** High-level feature dimension (Subordination, Relative Clauses, etc.)
- **expectedIssue:** Specific failure mode expected

## Workflow: Expert Test Campaign

### Phase 1: Test Matrix Design (with Expert)
1. Expert designs 30-40 tests systematically exploring linguistic dimensions
2. Each test includes hypothesis and expected failure mode
3. Tests prioritized by severity (P0 = blocking, P1 = critical, P2 = defer)

### Phase 2: Bulk Execution (Developer)
```bash
# Edit test-matrix.json with expert's test cases
nano test-matrix.json

# Run all tests
npm run test:expert

# Results automatically saved to results/ directory
```

### Phase 3: Pattern Analysis (with Expert)
1. Share `expert-validation-visual-summary.html` with expert/stakeholders
2. Expert reviews clustered failures (e.g., "all subordination tests failed")
3. Identify root causes and prioritize fixes
4. Define V7 scope (what MUST work vs. acceptable limitations)

### Phase 4: Fix-Validate Cycles
1. Developer fixes one failure *pattern* (e.g., subordination)
2. Re-run tests: `npm run test:expert`
3. If pattern passes → short validation call with expert
4. If still failing → iterate locally before expert review
5. Move to next pattern

## Current Test Results

**Status:** ❌ 2/2 tests FAILED (0% pass rate)

### Test 1.2: Subordination (If-clause)
- **Sentence:** "If the server fails, the admin receives an alert."
- **Status:** ❌ FAIL
- **Issue:** Argument bleeding - "fails" consumed "admin" as direct object
- **Severity:** P0 BLOCKING

### Test 2.1: Relative Clause (Who-clause)
- **Sentence:** "The engineer who designed the system left."
- **Status:** ❌ FAIL
- **Issue:** "Who" treated as separate entity + "system" became subject of "left"
- **Severity:** P1 CRITICAL

## Expert Recommendations

**From CCO/SME Review:**

1. **V7.0 Release Status:** HOLD - Critical failures confirmed
2. **Required Fixes:**
   - V7-003: Subordination support (If/When/While prefix clauses)
   - V7-004: Relative clause support (who/which/that anaphora)
3. **Root Cause:** V7 architecture over-fits to infix coordination ("X and Y")
4. **Impact:** Semantic corruption (false assertions in knowledge graph)

## Adding More Tests

To expand the test matrix:

```bash
# Edit test-matrix.json
nano test-matrix.json

# Add new test case following the format above

# Run tests
npm run test:expert

# View updated report
start tests/expert-validation/results/expert-validation-visual-summary.html
```

## Sharing Results

**For Expert/SME Review:**
- Share: `results/expert-validation-visual-summary.html` (visual, annotated)
- Or: `results/expert-validation-report.json` (raw data)

**For Stakeholders:**
- Share: `expert-validation-visual-summary.html` (clear, executive-friendly)

**For Developers:**
- Share: `expert-validation-report.json` (complete JSON-LD graphs for debugging)

## Tips for Efficient Expert Testing

✅ **DO:**
- Design test matrices by *linguistic dimension*, not random examples
- Test *boundary cases* that probe architectural limits
- Cluster failures by *root cause*, not individual tests
- Validate *patterns* (e.g., "all subordination"), not one-off fixes

❌ **DON'T:**
- Test one sentence at a time (batch 30-40 tests)
- Send raw JSON without context (use visual summary)
- Fix individual bugs without understanding the pattern
- Re-validate every single test after each fix (validate patterns)

## Next Steps

1. **Immediate:** Review visual summary with expert
2. **Short-term:** Design complete test matrix (Dimensions 1-4)
3. **Medium-term:** Implement V7-003 and V7-004 fixes
4. **Long-term:** Define V7 scope vs. defer to V8

---

**Questions?** See main project documentation or contact the TagTeam development team.
