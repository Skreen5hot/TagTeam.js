# How to Verify dist/tagteam.js Bundle

**Quick Start:** The bundle is complete and ready. Here's how to verify it contains all Week 2a features.

---

## Method 1: Automated Verification (Recommended)

Open `verify-bundle.html` in your browser. This runs 7 automated tests:

```bash
# In repository root
start verify-bundle.html    # Windows
open verify-bundle.html     # macOS
xdg-open verify-bundle.html # Linux
```

**Expected Result:** 7/7 tests pass ✅

The tests verify:
1. TagTeam global exists
2. Basic parsing works
3. contextIntensity field exists
4. All 12 dimensions present
5. Trust scoring bug fix (0.2 for "falsifying")
6. Urgency scoring works
7. Default scores are reasonable

---

## Method 2: Manual Browser Test

Create a simple HTML file:

```html
<!DOCTYPE html>
<html>
<head>
    <script src="dist/tagteam.js"></script>
</head>
<body>
    <script>
        const text = "I discovered that my company is falsifying safety reports";
        const result = TagTeam.parse(text);

        console.log("Input:", text);
        console.log("Full result:", result);
        console.log("Context intensity:", result.contextIntensity);
        console.log("Trust score:", result.contextIntensity.relational.trust);

        // Verify
        if (result.contextIntensity.relational.trust === 0.2) {
            console.log("✅ PASS - Trust scoring works correctly");
        } else {
            console.log("❌ FAIL - Expected trust 0.2, got", result.contextIntensity.relational.trust);
        }
    </script>
</body>
</html>
```

**Expected Console Output:**
```
Input: I discovered that my company is falsifying safety reports
Full result: {agent: {...}, action: {...}, contextIntensity: {...}, ...}
Context intensity: {temporal: {...}, relational: {...}, consequential: {...}, epistemic: {...}}
Trust score: 0.2
✅ PASS - Trust scoring works correctly
```

---

## Method 3: Test Suite

Open the full test suite:

```bash
start test-week2a-context.html    # Windows
open test-week2a-context.html     # macOS
xdg-open test-week2a-context.html # Linux
```

**Expected Result:**
```
100.0% Accuracy (60/60 dimensions within ±0.2)
✅ EXCELLENT! Meets Week 2a target (80%)
```

---

## Method 4: Command Line Verification

```bash
# Check file size (should be ~4.2 MB)
ls -lh dist/tagteam.js

# Verify ContextAnalyzer is in bundle
grep -c "ContextAnalyzer.prototype.analyzeContext" dist/tagteam.js
# Expected: 1

# Verify PatternMatcher is in bundle
grep -c "PatternMatcher" dist/tagteam.js
# Expected: 17

# Verify bug fix is present
grep -c "let maxScore = null" dist/tagteam.js
# Expected: 1
```

---

## What to Look For

### ✅ Correct contextIntensity Structure

```javascript
{
  temporal: {
    urgency: 0.0-1.0,
    duration: 0.0-1.0,
    reversibility: 0.0-1.0
  },
  relational: {
    intimacy: 0.0-1.0,
    powerDifferential: 0.0-1.0,
    trust: 0.0-1.0
  },
  consequential: {
    harmSeverity: 0.0-1.0,
    benefitMagnitude: 0.0-1.0,
    scope: 0.0-1.0
  },
  epistemic: {
    certainty: 0.0-1.0,
    informationCompleteness: 0.0-1.0,
    expertise: 0.0-1.0
  }
}
```

### ✅ Bug Fix Verification

**Test Case:** "I discovered that my company is falsifying safety reports"

| Dimension | Expected | Reason |
|-----------|----------|--------|
| `trust` | 0.2 | "falsifying" triggers none/distrust category |
| `certainty` | 0.8 | "discovered" indicates high certainty |
| `urgency` | 0.6 | "discovered" indicates moderate urgency |

**Old (Buggy) Behavior:** trust = 0.5 (default overrode the 0.2 match)
**New (Fixed) Behavior:** trust = 0.2 (match is properly used)

---

## Common Issues

### Issue: contextIntensity is undefined

**Cause:** Using old bundle or browser cache

**Solution:**
1. Ensure you're using the latest bundle (check file date: 2026-01-18)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Hard refresh (Ctrl+F5)
4. Rebuild: `node build.js`

### Issue: Trust scores seem wrong

**Cause:** PatternMatcher bug fix not applied

**Solution:**
1. Verify bundle has the fix: `grep "let maxScore = null" dist/tagteam.js`
2. If not found, rebuild: `node build.js`

### Issue: Only some dimensions work

**Cause:** Partial integration

**Solution:**
1. Ensure all source files are present in `src/`:
   - PatternMatcher.js
   - ContextAnalyzer.js
2. Rebuild: `node build.js`

---

## File Locations

| File | Description |
|------|-------------|
| `dist/tagteam.js` | **The deliverable** - Single bundled file (4.18 MB) |
| `verify-bundle.html` | Automated verification tests |
| `test-week2a-context.html` | Full test suite (100% accuracy) |
| `iee-collaboration/to-iee/week2/WEEK2A_COMPLETE.md` | Completion report |
| `iee-collaboration/to-iee/week2/BUNDLE_VERIFICATION.md` | Technical verification doc |

---

## Need Help?

If verification fails:

1. Check file date: `ls -l dist/tagteam.js` (should be 2026-01-18)
2. Check file size: Should be ~4.18 MB
3. Rebuild bundle: `node build.js`
4. Run verification: Open `verify-bundle.html`
5. Check git commit: `git log -1 dist/tagteam.js`

**Latest Git Commit:** a6f91bb
**Bundle Build Date:** January 12, 2026

---

**Contact:** TagTeam Development Team
**Status:** ✅ Ready for IEE Review
