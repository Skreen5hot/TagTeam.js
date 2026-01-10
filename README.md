# TagTeam.js - Deterministic Semantic Parser

**A client-side JavaScript library for extracting semantic roles from natural language text**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-Week%201%20Complete-success)](iee-collaboration/to-iee/week1/)

---

## 🎯 Quick Start

### Try the Demo
Open [demos/semantic-demo.html](demos/semantic-demo.html) in your browser to see TagTeam in action.

### Run Tests
Open [tests/test-iee-corpus.html](tests/test-iee-corpus.html) to validate against IEE's official test scenarios.

### Browse Source
Check [src/SemanticRoleExtractor.js](src/SemanticRoleExtractor.js) for the main parser implementation.

---

## 📁 Repository Structure

```
TagTeam.js/
├── src/                      # Core implementation
├── tests/                    # Test suites
├── demos/                    # Interactive demonstrations
├── docs/                     # Documentation
└── iee-collaboration/        # IEE team interface
```

**→** See full structure details in each folder's README

---

## 🚀 Features (Week 1)

✅ **Semantic Role Extraction** - Agent, Patient, Recipient, Theme extraction with 15 semantic frames

✅ **Advanced Detection** - Negation, modality, tense, and aspect detection

✅ **Multi-Word Entities** - 150 compound terms (life support, best friend, climate change, etc.)

✅ **IEE Format Compliance** - Exact JSON structure matching IEE specifications

✅ **Performance** - <10ms per sentence, zero dependencies, client-side only

---

## 📖 Navigation

- **[Try Demos →](demos/)** - Interactive demonstrations
- **[Run Tests →](tests/)** - Validation test suites
- **[Read Docs →](docs/)** - Architecture, development, research
- **[IEE Collaboration →](iee-collaboration/)** - IEE team interface
- **[Source Code →](src/)** - Core implementation

---

## 🧪 Quick Validation

```bash
# Open in browser
open tests/test-iee-corpus.html
```

**Expected:** ≥75% pass rate on IEE's 5 official scenarios

---

## 📊 Week 1 Status

| Metric | Target | Status |
|--------|--------|--------|
| Integration | Complete | ✅ |
| Test Suite | Ready | ✅ |
| Performance | <50ms | ✅ ~7ms |
| IEE Validation | Pending | ⏳ |

**Full deliverables:** [iee-collaboration/to-iee/week1/](iee-collaboration/to-iee/week1/)

---

## 🗺️ Roadmap

- **Week 1** ✅ - Semantic roles, 150 compound terms, IEE format compliance
- **Week 2** ⏳ - Context analysis, value matching, 20 scenarios, 85% target
- **Week 3** ⏳ - Conflict detection, salience scoring, 50 scenarios, 90% target

---

## 🛠️ Usage Example

```javascript
const extractor = new SemanticRoleExtractor();
const result = extractor.parseSemanticAction("I should tell my doctor about the pain");

console.log(result);
// {
//   agent: { text: "i", entity: "self", posTag: "PRP" },
//   action: { verb: "tell", lemma: "tell", tense: "present", aspect: "simple",
//             modality: "should", negation: false },
//   recipient: { text: "doctor", entity: "medical_professional", posTag: "NN" },
//   theme: { text: "pain", entity: "physical_sensation", posTag: "NN" },
//   semanticFrame: "Revealing_information",
//   confidence: 0.85
// }
```

---

## 🤝 IEE Collaboration

Integrates with the **Integral Ethics Engine (IEE)** team.

- **[From IEE →](iee-collaboration/from-iee/)** - Requirements, data, validators
- **[To IEE →](iee-collaboration/to-iee/)** - Deliverables by week

---

## 📜 License

MIT License - See [LICENSE](LICENSE)

---

**Version:** Week 1 (2026-01-10) | **Status:** ✅ Integration Complete, ⏳ Awaiting Validation
