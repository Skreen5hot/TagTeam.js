# TagTeam.js - Deterministic Semantic Parser with Ethical Value Detection

**A client-side JavaScript library for extracting semantic roles and detecting ethical values in natural language text**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-3.0.0--alpha.1-success)](package.json)
[![Status](https://img.shields.io/badge/status-Phase%207%20Complete-success)](deliverables/)

---

## 🎯 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/TagTeam.js.git
cd TagTeam.js

# Install dependencies
npm install

# Build the bundle
npm run build
```

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| [compromise](https://www.npmjs.com/package/compromise) | ^14.14.5 | Natural language parsing and POS tagging |
| [n3](https://www.npmjs.com/package/n3) | ^1.17.1 | RDF/Turtle ontology parsing |

No dev dependencies are required for runtime use.

### Use the Bundle

```html
<!DOCTYPE html>
<html>
<head>
  <script src="dist/tagteam.js"></script>
</head>
<body>
  <script>
    const result = TagTeam.parse("The family must decide whether to continue treatment");
    console.log(result.semanticFrame);  // "Deciding"
    console.log(result.ethicalProfile.detectedValues);  // Values like Autonomy, Life
  </script>
</body>
</html>
```

### Verbose Mode (POS Diagnostic)

Pass `{ verbose: true }` to see the Part-of-Speech tags Compromise NLP assigned to each token. This is useful for understanding *why* TagTeam parsed a sentence the way it did, without polluting the semantic graph.

```javascript
const graph = TagTeam.buildGraph("The doctor obtained consent.", { verbose: true });

// Semantic graph is unchanged
console.log(graph['@graph']);

// POS tokens available in _debug
console.log(graph._debug.tokens);
// [
//   { text: "The",      tags: ["Determiner"] },
//   { text: "doctor",   tags: ["Noun", "Actor", "Singular"] },
//   { text: "obtained", tags: ["Verb", "PastTense"] },
//   { text: "consent",  tags: ["Noun", "Singular"] }
// ]
```

All demo pages include a "Show POS Tags" checkbox to enable this.

### Run Tests

```bash
# Run full corpus validation (20 scenarios)
npm test

# Build the bundle
npm run build
```

---

## 📁 Repository Structure

```
TagTeam.js/
├── src/                          # Source code
│   ├── core/                     # Core parsing components
│   │   ├── lexicon.js           # 4.1MB POS lexicon
│   │   ├── POSTagger.js         # Part-of-speech tagger
│   │   ├── PatternMatcher.js    # Keyword pattern matching
│   │   └── SemanticRoleExtractor.js  # Main semantic parser
│   ├── analyzers/               # Analysis modules
│   │   ├── ContextAnalyzer.js   # 12-dimension context intensity
│   │   ├── CertaintyAnalyzer.js # Epistemic certainty detection
│   │   ├── ValueMatcher.js      # Ethical value detection
│   │   ├── ValueScorer.js       # Value salience scoring
│   │   └── EthicalProfiler.js   # Ethical profile builder
│   ├── graph/                    # Phase 4-9: Semantic graph building
│   │   ├── SemanticGraphBuilder.js  # Main graph builder
│   │   ├── EntityExtractor.js   # Two-tier entity extraction
│   │   ├── ActExtractor.js      # Intentional act extraction
│   │   ├── RoleDetector.js      # BFO role detection
│   │   ├── AmbiguityDetector.js # Phase 5: ambiguity detection
│   │   ├── InterpretationLattice.js # Phase 6: interpretation lattice
│   │   └── ...                  # 20+ additional modules
│   ├── ontology/                 # Phase 6.5-6.6: Ontology support
│   │   ├── TurtleParser.js      # Lightweight TTL parser
│   │   ├── OntologyManager.js   # Unified ontology loading
│   │   ├── OntologyTextTagger.js # Custom ontology tagging
│   │   └── ...                  # Adapters and loaders
│   ├── security/                 # Security hardening modules
│   │   ├── input-validator.js   # Input length/null-byte validation
│   │   ├── semantic-validators.js # Heuristic threat detection (T3-T6)
│   │   ├── output-sanitizer.js  # Allowlist-based output filtering
│   │   ├── ontology-integrity.js # SHA-256 manifest verification (Node)
│   │   └── audit-logger.js      # Structured security event logging
│   └── validation/               # SHACL validation
│       └── shaclValidator.js    # Graph constraint validation
│
├── tests/                        # Test suites
│   ├── unit/                    # Unit tests (including security/)
│   ├── integration/             # Node.js integration tests
│   ├── iee/                     # IEE validation tests
│   └── ...                      # Browser, linguistic, robustness tests
│
├── dist/                         # Built bundle (~5.2MB)
│   ├── tagteam.js              # UMD bundle (browser + Node.js)
│   └── test.html               # Bundle test page
│
├── demos/                        # Interactive demo pages
│   ├── tagteam-landing.html     # Main landing page
│   ├── stakeholder-demo.html    # Stakeholder presentation
│   ├── phase6-lattice-demo.html # Interpretation lattice demo
│   └── ...                      # Ontology, custom tagger demos
│
├── security/                     # Red team test corpus
│   └── test-corpus/             # Adversarial inputs (T3-T6)
│
├── docs/                         # Documentation
│   └── architecture/            # Security plans, implementation docs
│
├── scripts/                      # Build scripts
│   └── build.js                 # Bundle builder
│
├── .github/                      # CI/CD configuration
│   ├── workflows/security.yml   # Security scanning workflow
│   └── dependabot.yml           # Automated dependency updates
│
├── ontology/                     # TagTeam ontology (TTL)
├── archive/                      # Deprecated/old files
└── iee-collaboration/           # IEE team interface
    ├── from-iee/                # Requirements, data, validators
    └── to-iee/                  # Deliverables
```

---

## 🚀 Features

### Week 1: Semantic Role Extraction ✅
- **Agent, Patient, Recipient, Theme** extraction
- **15 semantic frames** (Deciding, Revealing_information, Questioning, etc.)
- **Advanced detection**: Negation, modality, tense, aspect
- **150 compound terms** (life support, best friend, climate change, etc.)
- **IEE format compliance**
- **Performance**: <10ms per sentence, minimal dependencies (2 runtime)

### Week 2a: Context Intensity Analysis ✅
- **12 dimensions** across 4 categories:
  - **Temporal**: urgency, duration, reversibility
  - **Relational**: intimacy, power differential, trust
  - **Consequential**: harm severity, benefit magnitude, scope
  - **Epistemic**: certainty, information completeness, expertise
- **100% accuracy** on test scenarios

### Week 2b: Ethical Value Detection ✅
- **50 values** across 5 ethical domains (Dignity, Community, Stewardship, Truth, Growth)
- **Polarity detection**: +1 (upheld), -1 (violated), 0 (conflicted)
- **Salience scoring** with context awareness
- **Conflict detection**: 18 predefined ethical tensions
- **Domain analysis**: Multi-domain scenario detection
- **75% coverage, 100% precision** on 20-scenario corpus

---

## 📊 Current Status (v2.0.0)

| Milestone | Status | Accuracy | Performance |
|-----------|--------|----------|-------------|
| **Week 1** | ✅ Complete | 84.2% | <10ms |
| **Week 2a** | ✅ Complete | 100% | <40ms |
| **Week 2b** | ✅ Complete | 75% coverage, 100% precision | <50ms |
| **Week 3** | 📋 Planned | TBD | TBD |

**Latest:** Week 2b completed 18 days ahead of schedule (Jan 18, 2026)

**IEE Grade:** A+ (Production Ready)

---

## 🧪 Testing

### Browser Tests
```bash
# Open in browser
open tests/browser/verify-bundle.html
open tests/iee/run-iee-validator.html
```

### Integration Tests
```bash
# Full 20-scenario validation
npm test

# Week 2b component tests
node tests/integration/test-week2b.js

# Debug value detection
node tests/integration/test-debug.js
```

### Expected Results
- **Week 1 (IEE)**: 84.2% accuracy ✅
- **Week 2a**: 100% accuracy (60/60 dimensions) ✅
- **Week 2b**: 75% scenario coverage (15/20), 100% precision ✅

---

## 📖 Documentation

### For Users
- **[Quick Start Guide](docs/guides/)** - Get started in 5 minutes
- **[API Reference](docs/api/)** - Complete API documentation
- **[Examples](tests/browser/)** - Live browser examples

### For Developers
- **[Architecture](docs/architecture/)** - System design and components
- **[Planning Documents](planning/)** - Week-by-week planning
- **[Test Documentation](tests/README.md)** - Test structure and coverage

### For IEE Team
- **[Deliverables](deliverables/)** - Milestone deliverables
- **[IEE Collaboration](iee-collaboration/)** - Requirements and submissions

---

## 🗺️ Roadmap

### Completed ✅
- **Week 1** - Semantic roles, 150 compound terms, IEE format compliance
- **Week 2a** - Context intensity analysis (12 dimensions, 100% accuracy)
- **Week 2b** - Ethical value detection (50 values, conflict detection, domain analysis)

### Planned (Week 3+)
See [planning/week3/WEEK3_ROADMAP.md](planning/week3/WEEK3_ROADMAP.md) for detailed options:

- **Option A**: Semantic Intelligence (ML-light embeddings for implicit values)
- **Option B**: Multi-Sentence Context (analyze full scenarios)
- **Option C**: Domain Specialization (medical/legal/business lexicons)
- **Option D**: Active Learning (learn from usage patterns)
- **Option E**: Production Tooling (debugging, visualization)

**Bonus**: BFO-compatible ontology system - [planning/week3/ONTOLOGY_INTEGRATION_PLAN.md](planning/week3/ONTOLOGY_INTEGRATION_PLAN.md)

---

## 🛠️ API Usage

### Parse Text
```javascript
const result = TagTeam.parse("I discovered that my company is falsifying safety reports");

// Semantic roles
console.log(result.agent);        // { text: "I", entity: "self" }
console.log(result.action);       // { verb: "discovered", tense: "past" }
console.log(result.semanticFrame); // "Becoming_aware"

// Context intensity (Week 2a)
console.log(result.contextIntensity.relational.trust);  // 0.2 (low trust)
console.log(result.contextIntensity.temporal.urgency);  // 0.6 (moderate)

// Ethical values (Week 2b)
console.log(result.ethicalProfile.detectedValues);
// [
//   { name: "Honesty", polarity: -1, salience: 0.85, domain: "Truth" },
//   { name: "Accountability", polarity: -1, salience: 0.75, domain: "Truth" },
//   { name: "Safety", polarity: -1, salience: 0.70, domain: "Dignity" }
// ]

console.log(result.ethicalProfile.conflicts);
// [{ value1: "Loyalty", value2: "Honesty", intensity: 0.65 }]
```

### Batch Processing
```javascript
const texts = [
  "The family must decide whether to continue treatment",
  "I am questioning core doctrines",
  "My best friend is cheating on their spouse"
];

const results = TagTeam.parseMany(texts);
```

---

## 🤝 IEE Collaboration

Integrates with the **Integral Ethics Engine (IEE)** team.

- **[From IEE →](iee-collaboration/from-iee/)** - Requirements, data, validators
- **[To IEE →](iee-collaboration/to-iee/)** - Deliverables by week
- **[Deliverables →](deliverables/)** - Formal milestone deliverables

---

## 🏗️ Development

### Build
```bash
npm run build          # Creates dist/tagteam.js bundle
```

### Test
```bash
npm test               # Runs full corpus validation
npm run test:browser   # Instructions for browser tests
```

### Calculate Metrics
```bash
npm run metrics        # Generates WEEK2B_METRICS.json
```

---

## 📜 License

MIT License - See [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

- **IEE Team** - Requirements, test data, validation framework
- **d3.js & mermaid.js** - Inspiration for single-file bundle approach

---

**Version:** 3.0.0-alpha.1 (Phase 7 Complete) | **Date:** 2026-01-31 | **Status:** ✅ Active Development
