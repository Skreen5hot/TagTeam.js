# TagTeam Demonstrations

Interactive demonstrations of TagTeam semantic parsing capabilities.

---

## 🎮 Demo Files

### [semantic-demo.html](semantic-demo.html)
Full-featured interactive demo showcasing Week 1 capabilities.

**Features:**
- Live semantic parsing
- Visual role display (Agent, Action, Patient, Theme)
- Semantic frame classification
- Negation & modality detection
- Tense & aspect detection
- Pre-loaded IEE test scenarios
- Confidence scoring
- JSON output view

**Try it:** `open semantic-demo.html`

---

### [index.html](index.html)
Basic POS tagger demo (original TagTeam functionality).

**Features:**
- Simple text input
- POS tag display in table format
- Educational view of part-of-speech tagging

**Try it:** `open index.html`

---

## 🚀 Quick Start

```bash
# Main demo
open semantic-demo.html

# Basic POS tagger
open index.html
```

---

## 🎯 Test Scenarios

semantic-demo.html includes pre-loaded scenarios:
- Medical information disclosure
- Community decision
- Resource allocation
- Life support decision

Click any scenario button to see instant parsing results.

---

## 📖 What You'll See

### Example Output
```javascript
{
  agent: { text: "i", entity: "self" },
  action: { verb: "tell", lemma: "tell", tense: "present",
            aspect: "simple", modality: "should", negation: false },
  recipient: { text: "doctor", entity: "medical_professional" },
  theme: { text: "pain", entity: "physical_sensation" },
  semanticFrame: "Revealing_information",
  confidence: 0.85
}
```

---

## 🔧 Dependencies

Demos load from:
- `../src/lexicon.js` - POS lexicon (4.3MB)
- `../src/POSTagger.js` - POS tagger
- `../src/SemanticRoleExtractor.js` - Semantic parser

---

**Last Updated:** 2026-01-10
**Status:** Ready for use
