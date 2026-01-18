# dist/tagteam.js Bundle Verification

**Date:** January 12, 2026
**File:** `dist/tagteam.js`
**Size:** 4.18 MB
**Status:** ✅ **VERIFIED - Contains all Week 2a features**

---

## Bundle Contents Verified

### ✅ PatternMatcher Module (Line ~298231)
```
// PATTERN MATCHER (Week 2a) (~8KB)
```

**Features:**
- Keyword matching with word boundaries
- Negation detection (inverts scores)
- Intensifier boost (+0.15)
- Hedge reduction (-0.15)
- Maximum score selection with proper fallback logic

**Key Fix:** The bug where default scores were overriding low matches has been fixed. The code now properly uses:
```javascript
let maxScore = null; // Start with null to detect if any match found
let foundMatch = false;
```

### ✅ ContextAnalyzer Module (Line ~298283)
```
// CONTEXT ANALYZER (Week 2a) (~15KB)
```

**All 12 Dimensions Implemented:**

#### Temporal Context
- ✅ `urgency` - Time sensitivity (0.0-1.0)
- ✅ `duration` - How long consequences last (0.0-1.0)
- ✅ `reversibility` - Can decision be undone (0.0-1.0)

#### Relational Context
- ✅ `intimacy` - Relationship closeness (0.0-1.0)
- ✅ `powerDifferential` - Power imbalance (0.0-1.0)
- ✅ `trust` - Level of trust (0.0-1.0)

#### Consequential Context
- ✅ `harmSeverity` - Potential harm magnitude (0.0-1.0)
- ✅ `benefitMagnitude` - Potential benefit magnitude (0.0-1.0)
- ✅ `scope` - Number of people affected (0.0-1.0)

#### Epistemic Context
- ✅ `certainty` - Information certainty (0.0-1.0)
- ✅ `informationCompleteness` - Available information (0.0-1.0)
- ✅ `expertise` - Available expertise level (0.0-1.0)

### ✅ SemanticRoleExtractor Integration (Line ~298541)

The `parseSemanticAction` method now includes:
```javascript
// Week 2a: Analyze context intensity
let contextIntensity = null;
if (this.contextAnalyzer) {
    contextIntensity = this.contextAnalyzer.analyzeContext(text, taggedWords, frame, roles);
}
```

And the `_buildSemanticAction` method adds it to the result:
```javascript
// Week 2a: Add context intensity if available
if (contextIntensity) {
    result.contextIntensity = contextIntensity;
}
```

---

## How to Verify

### Method 1: Check File Directly

```bash
# Check file size
ls -lh dist/tagteam.js
# Should show: 4.2M

# Verify ContextAnalyzer is present
grep -c "ContextAnalyzer.prototype.analyzeContext" dist/tagteam.js
# Should show: 1

# Verify PatternMatcher is present
grep -c "PatternMatcher" dist/tagteam.js
# Should show: 17

# Check for the bug fix
grep -c "let maxScore = null" dist/tagteam.js
# Should show: 1
```

### Method 2: Test in Browser

```html
<!DOCTYPE html>
<html>
<head>
    <script src="dist/tagteam.js"></script>
</head>
<body>
    <script>
        // Test Week 2a feature
        const result = TagTeam.parse("I discovered that my company is falsifying safety reports");

        console.log("Full result:", result);
        console.log("Has contextIntensity:", !!result.contextIntensity);
        console.log("Trust score:", result.contextIntensity?.relational?.trust);

        // Expected: trust score should be 0.2 (not 0.5)
        if (result.contextIntensity?.relational?.trust === 0.2) {
            console.log("✅ CORRECT - Trust scoring working properly");
        } else {
            console.log("❌ ERROR - Trust score is", result.contextIntensity?.relational?.trust);
        }
    </script>
</body>
</html>
```

### Method 3: Use Test Suite

Open `test-week2a-context.html` in a browser - it should show:
```
100.0% Accuracy (60/60 dimensions within ±0.2)
✅ EXCELLENT! Meets Week 2a target (80%)
```

---

## Bundle Build Process

The bundle is created by `build.js`:

1. **Reads source files:**
   - `src/lexicon.js` (4.11 MB)
   - `src/POSTagger.js` (3.89 KB)
   - `src/PatternMatcher.js` (9.10 KB) ← Week 2a
   - `src/ContextAnalyzer.js` (16.88 KB) ← Week 2a
   - `src/SemanticRoleExtractor.js` (34.52 KB)

2. **Bundles into UMD format:**
   - Wraps in Universal Module Definition
   - Exports as `TagTeam` global
   - Works in browser and Node.js (with jsdom)

3. **Outputs:**
   - `dist/tagteam.js` (4.18 MB)

---

## Version Info

**Bundle Header:**
```javascript
/*!
 * TagTeam.js - Deterministic Semantic Parser
 * Version: 1.0.0
 * Date: 2026-01-18
 *
 * A client-side JavaScript library for extracting semantic roles from natural language text
 * Inspired by d3.js and mermaid.js - single file, zero dependencies, simple API
 *
 * Features:
 * - Week 1: Semantic role extraction with 99.7% pass rate
 * - Week 2a: 12-dimension context intensity analysis (100% accuracy)
 */
```

---

## What Changed From Week 1

| Component | Week 1 | Week 2a |
|-----------|--------|---------|
| Bundle size | ~4.15 MB | 4.18 MB (+30 KB) |
| Modules | 3 (Lexicon, POSTagger, SemanticRoleExtractor) | 5 (+ PatternMatcher, ContextAnalyzer) |
| Output fields | 7 (agent, action, patient, frame, etc.) | 8 (+ contextIntensity) |
| Test accuracy | 99.7% (289/290 checks) | 100% (60/60 dimensions) |

---

## Troubleshooting

**Q: I don't see contextIntensity in the output**
- Ensure you're using the latest bundle (check file date: 2026-01-18)
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh the page (Ctrl+F5)

**Q: Trust scores seem wrong**
- The bug where defaults override matches was fixed
- "falsifying" should give trust = 0.2 (not 0.5)
- "questioning" should default to 0.5 (not 0.3)

**Q: How do I rebuild the bundle?**
```bash
node build.js
```

---

**Verified by:** TagTeam Development Team
**Last Updated:** January 12, 2026
**Bundle Location:** `dist/tagteam.js`
**Git Commit:** 15b36e8
