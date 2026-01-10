# TagTeam.js Bundle - Week 1 Deliverable

**Single-file semantic parser for easy integration and validation**

---

## 🎯 Quick Start (For IEE Team)

### Option 1: Test in Browser (Easiest)

1. **Open** `test-iee-bundle.html` in your browser
2. **Click** "▶️ Run All Tests"
3. **Verify** pass rate ≥75%

That's it! The bundle contains everything needed.

### Option 2: Use in Your Project

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Test</title>
</head>
<body>
  <!-- 1. Load the bundle -->
  <script src="tagteam.js"></script>

  <!-- 2. Use the simple API -->
  <script>
    const result = TagTeam.parse("I should tell my doctor about the pain");

    console.log(result.agent);      // { text: "i", entity: "self" }
    console.log(result.action);     // { verb: "tell", modality: "should" }
    console.log(result.recipient);  // { text: "doctor", ... }
    console.log(result.theme);      // { text: "pain", ... }
    console.log(result.semanticFrame); // "Revealing_information"
  </script>
</body>
</html>
```

---

## 📦 What's Included

| File | Size | Purpose |
|------|------|---------|
| **tagteam.js** | 4.15 MB | Full bundle (everything you need) |
| **test.html** | 3 KB | Basic functionality test |
| **test-iee-bundle.html** | 8 KB | IEE test corpus validation |
| **README.md** | This file | Documentation |

---

## 🚀 API Reference

### TagTeam.parse(text, options?)

Parse a single sentence and extract semantic roles.

**Parameters:**
- `text` (string) - The sentence to parse
- `options` (object, optional) - Configuration options

**Returns:** Semantic action object

**Example:**
```javascript
const result = TagTeam.parse("The family must decide whether to continue treatment");

// Result structure:
{
  agent: { text: "family", entity: "family", posTag: "NN" },
  action: {
    verb: "decide",
    lemma: "decide",
    tense: "present",
    aspect: "simple",
    modality: "must",
    negation: false,
    verbOriginal: "decide",
    frame: "Deciding",
    frameDescription: "..."
  },
  patient: { text: "treatment", entity: "treatment", posTag: "NN" },
  semanticFrame: "Deciding",
  confidence: 0.85
}
```

### TagTeam.parseMany(texts[])

Parse multiple sentences in batch.

**Example:**
```javascript
const results = TagTeam.parseMany([
  "I love my best friend",
  "The doctor recommended treatment",
  "We must decide about the coal plant"
]);

// Returns array of results
console.log(results[0].agent);  // First sentence agent
console.log(results[1].action); // Second sentence action
```

### TagTeam.version

Version string (currently "1.0.0")

---

## ✅ Week 1 Features

- **Semantic Role Extraction** - Agent, Patient, Recipient, Theme
- **15 Semantic Frames** - Revealing_information, Deciding, Questioning, etc.
- **150 Compound Terms** - Handles "life support", "best friend", etc.
- **Negation Detection** - Identifies "not", "no", "never"
- **Modality Detection** - Captures "should", "must", "can", "might"
- **Tense & Aspect** - Past/present/future, simple/progressive/perfect
- **IEE Format Compliance** - Exact JSON structure as specified
- **Performance** - <10ms per sentence
- **Zero Dependencies** - Pure JavaScript, works everywhere

---

## 🧪 Testing

### Test Files Included

1. **test.html** - Basic bundle functionality
   - Tests simple parsing
   - Tests batch parsing
   - Tests IEE test sentence

2. **test-iee-bundle.html** - Full IEE corpus validation
   - Tests all 5 Week 1 scenarios
   - Validates agent/action/patient extraction
   - Checks semantic frame classification
   - Displays pass/fail for each check

### Expected Results

**Target:** ≥75% pass rate on IEE test corpus

**Typical Results:**
- Agent extraction: ~80-90% accuracy
- Action extraction: ~85-95% accuracy
- Semantic frame: ~75-85% accuracy
- Modality detection: ~90%+ accuracy

---

## 🔄 Differences from Multi-File Version

### Old Way (Multi-File)
```html
<script src="../src/lexicon.js"></script>
<script src="../src/POSTagger.js"></script>
<script src="../src/SemanticRoleExtractor.js"></script>
<script>
  const extractor = new SemanticRoleExtractor();
  const result = extractor.parseSemanticAction(text);
</script>
```

### New Way (Bundle)
```html
<script src="tagteam.js"></script>
<script>
  const result = TagTeam.parse(text);
</script>
```

**Benefits:**
- ✅ Single file (easier to deploy)
- ✅ Simple API (easier to use)
- ✅ Same functionality (no features lost)
- ✅ Backward compatible (classes still available for advanced use)

---

## 📊 Validation Checklist

Use this checklist to validate the bundle:

- [ ] **Load Test** - `test.html` opens without errors
- [ ] **Basic Parsing** - Test 1 button works, shows results
- [ ] **Batch Parsing** - Test 2 button works, shows 3 results
- [ ] **IEE Sentence** - Test 3 button shows all roles correctly
- [ ] **IEE Corpus** - `test-iee-bundle.html` shows ≥75% pass rate
- [ ] **Console Clean** - No JavaScript errors in browser console
- [ ] **Performance** - Page loads in <2 seconds
- [ ] **API Available** - `TagTeam.parse()` works in console

---

## 🐛 Troubleshooting

### Bundle won't load
- **Check:** File size should be ~4.15 MB
- **Check:** Browser console for error messages
- **Try:** Different browser (Chrome, Firefox, Edge)

### Tests fail
- **Check:** Browser supports ES6 (2015+)
- **Check:** File paths are correct (same directory)
- **Check:** No ad blockers interfering

### Unexpected results
- **Check:** Input text format (plain string, no special characters)
- **Check:** Expected vs actual in test output
- **Note:** Week 1 target is 75%, not 100%

---

## 📞 Support

**Questions?** Check the main repository:
- Documentation: `../docs/`
- Source code: `../src/`
- Tests: `../tests/`

**Issues?** Include:
- Browser and version
- Input text that failed
- Expected vs actual output
- Browser console errors (if any)

---

## 🗺️ Roadmap

### Week 1 ✅ (Current)
- Semantic role extraction
- 150 compound terms
- IEE format compliance

### Week 2 (Next)
- Value matching engine
- Context intensity analysis
- 20 test scenarios

### Week 3 (Future)
- Conflict detection
- Salience scoring
- 50 test scenarios

---

## 📜 License

MIT License - See ../LICENSE

---

**Version:** 1.0.0
**Date:** 2026-01-10
**Status:** Week 1 Complete, Ready for IEE Validation
