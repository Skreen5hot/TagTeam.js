# Repository Refactor - Visual Guide

## 🎯 Goal: Transform Chaos → Clarity

---

## Current State: "Flat Chaos" (31 files in root)

```
📦 TagTeam.js/
│
├── 🔧 js/ (implementation)
│   ├── lexicon.js (4.3MB!)
│   ├── POSTagger.js
│   └── SemanticRoleExtractor.js
│
├── 🧪 test-iee-corpus.html
├── 🧪 test-iee-format.html
├── 🧪 run-iee-validator.html
├── 🧪 tagteam-validator.js
├── 🧪 tagteam-validator-browser.js
│
├── 🎨 semantic-demo.html
├── 🎨 index.html
│
├── 📊 compound-terms.json (FROM IEE)
├── 📊 test-corpus-week1.json (FROM IEE)
├── 📊 value-definitions-core.json (FROM IEE)
│
├── 📄 DESIGN_DECISIONS.md
├── 📄 WEEK1_DELIVERABLE.md
├── 📄 WEEK1_INTEGRATION_COMPLETE.md
├── 📄 IEE_FORMAT_UPDATES.md
├── 📄 INTEGRATION_STATUS.md
├── 📄 README.md
├── 📄 README_SEMANTIC.md
├── 📄 tagTeam_Integration_Requirments.md (FROM IEE)
├── 📄 TAGTEAM_TEST_BUILD_PLAN.md (FROM IEE)
├── 📄 TAGTEAM_TESTING_HANDOFF.md (FROM IEE)
├── 📄 TAGTEAM_QUESTIONS_ANSWERED.md (FROM IEE)
├── 📄 TAGTEAM_DELIVERY_SUMMARY.md (FROM IEE)
├── 📄 POSTagger_refactor_plan.md
├── 📄 predicates_to_processes.md
├── 📄 road_map.md
├── 📄 iee-worldview-ui.md
│
├── 📋 LICENSE
└── 🗑️ nul (junk file)

PROBLEMS:
❌ 31 files at root level
❌ No visual hierarchy
❌ Mixed purposes (tests + docs + data + implementation)
❌ Hard to find what you need
❌ Unclear what's FROM IEE vs TO IEE
❌ Can't easily package deliverables
```

---

## Future State: "Organized Hierarchy" (6 folders in root)

```
📦 TagTeam.js/
│
├── 📁 src/                                    # 👈 IMPLEMENTATION
│   ├── SemanticRoleExtractor.js              # Main parser
│   ├── POSTagger.js                          # POS tagger
│   ├── lexicon.js                            # 4.3MB lexicon
│   └── config/                               # Extracted configs
│       ├── compound-terms.js                 # 150 terms
│       ├── semantic-frames.js                # Frame definitions
│       └── entity-categories.js              # Entity mappings
│
├── 📁 tests/                                  # 👈 VALIDATION
│   ├── test-iee-corpus.html                  # IEE 5 scenarios
│   ├── test-iee-format.html                  # Original 4 scenarios
│   ├── run-iee-validator.html                # Full validator
│   ├── README.md                             # Test guide
│   └── validators/
│       ├── tagteam-validator.js              # ES6 module
│       └── tagteam-validator-browser.js      # Browser version
│
├── 📁 demos/                                  # 👈 DEMONSTRATIONS
│   ├── semantic-demo.html                    # Interactive demo
│   ├── index.html                            # Landing page
│   └── README.md                             # Demo guide
│
├── 📁 docs/                                   # 👈 DOCUMENTATION
│   ├── README.md                             # Docs hub
│   ├── architecture/                         # Design docs
│   │   ├── design-decisions.md
│   │   ├── semantic-approach.md
│   │   └── performance.md
│   ├── development/                          # Dev docs
│   │   ├── refactor-plans/
│   │   │   ├── POSTagger_refactor.md
│   │   │   └── repository_refactor.md
│   │   └── roadmap.md
│   └── research/                             # Research notes
│       ├── predicates-to-processes.md
│       └── iee-worldview-ui.md
│
├── 📁 iee-collaboration/                      # 👈 IEE INTERFACE ⭐
│   ├── README.md                             # Collaboration guide
│   │
│   ├── from-iee/                             # 👈 FROM IEE TEAM
│   │   ├── requirements/
│   │   │   ├── integration-requirements.md
│   │   │   └── test-build-plan.md
│   │   ├── data/
│   │   │   ├── compound-terms.json           # 150 terms
│   │   │   ├── test-corpus-week1.json        # 5 scenarios
│   │   │   └── value-definitions-core.json   # 20 values
│   │   ├── validators/
│   │   │   └── tagteam-validator.js
│   │   └── communication/
│   │       ├── questions-answered.md
│   │       ├── delivery-summary.md
│   │       └── testing-handoff.md
│   │
│   └── to-iee/                               # 👈 TO IEE TEAM
│       └── week1/
│           ├── DELIVERABLE.md                # Week 1 summary
│           ├── INTEGRATION_COMPLETE.md       # Integration status
│           ├── FORMAT_UPDATES.md             # Format changes
│           ├── STATUS.md                     # Current status
│           └── test-results/                 # Test outputs
│               ├── corpus-validation.html
│               └── format-validation.html
│
├── 📄 README.md                              # 👈 ENTRY POINT (hub)
├── 📄 LICENSE
└── 📋 .gitignore

BENEFITS:
✅ 6 top-level folders (vs 31 files)
✅ Clear visual hierarchy
✅ Purpose-based organization
✅ Easy to navigate
✅ Clear FROM-IEE vs TO-IEE separation
✅ One-command deliverable packaging
```

---

## Navigation Patterns

### 🤖 LLM Pattern

**Question:** "Where are IEE's requirements?"
**Answer:** `iee-collaboration/from-iee/requirements/` ✅ (1 second)

**Question:** "What did we deliver to IEE?"
**Answer:** `iee-collaboration/to-iee/week1/` ✅ (1 second)

**Question:** "Where's the main implementation?"
**Answer:** `src/SemanticRoleExtractor.js` ✅ (1 second)

### 👤 Human Pattern

**New Developer:**
1. Read `README.md` (root)
2. Navigate to `demos/` → try interactive demo
3. Read `docs/architecture/` → understand design
4. Read `src/` → dive into code

**IEE Team Member:**
1. Read `iee-collaboration/README.md`
2. Check `to-iee/week1/` → review deliverables
3. Upload new data to `from-iee/data/`
4. Add questions to `from-iee/communication/`

**Tester:**
1. Navigate to `tests/`
2. Open `run-iee-validator.html`
3. Check results

### 📦 Packaging Pattern

**Package Week 1 Deliverables for IEE:**
```bash
cd iee-collaboration/to-iee
zip -r week1-deliverables.zip week1/
# Send week1-deliverables.zip to IEE ✅
```

**Before refactor:**
```bash
# Manually select 10+ files from root
# Risk of missing files
# No clear versioning
```

---

## File Type Legend

```
🔧 Implementation files (.js)
🧪 Test files (.html, validators)
🎨 Demo files (.html)
📊 Data files (.json)
📄 Documentation files (.md)
📁 Directories/folders
📋 Config files (.gitignore, LICENSE)
🗑️ Junk files
⭐ Critical/Important
👈 Directional indicator
```

---

## Migration Visualization

### Before → After Examples

#### Example 1: IEE Compound Terms

**BEFORE:**
```
TagTeam.js/
└── compound-terms.json  ❓ (What is this? Where did it come from?)
```

**AFTER:**
```
TagTeam.js/
└── iee-collaboration/
    └── from-iee/
        └── data/
            └── compound-terms.json  ✅ (Obviously from IEE, in data folder)
```

#### Example 2: Week 1 Deliverable

**BEFORE:**
```
TagTeam.js/
├── WEEK1_DELIVERABLE.md           ❓ (Which version? Where to find it?)
├── WEEK1_INTEGRATION_COMPLETE.md  ❓
└── IEE_FORMAT_UPDATES.md          ❓
```

**AFTER:**
```
TagTeam.js/
└── iee-collaboration/
    └── to-iee/
        └── week1/
            ├── DELIVERABLE.md              ✅
            ├── INTEGRATION_COMPLETE.md     ✅ (All Week 1 stuff together)
            └── FORMAT_UPDATES.md           ✅
```

#### Example 3: Test Files

**BEFORE:**
```
TagTeam.js/
├── test-iee-corpus.html           ❓ (Scattered in root)
├── test-iee-format.html           ❓
├── run-iee-validator.html         ❓
├── tagteam-validator.js           ❓
└── tagteam-validator-browser.js   ❓
```

**AFTER:**
```
TagTeam.js/
└── tests/
    ├── test-iee-corpus.html       ✅
    ├── test-iee-format.html       ✅
    ├── run-iee-validator.html     ✅ (Obviously all tests)
    └── validators/
        ├── tagteam-validator.js          ✅
        └── tagteam-validator-browser.js  ✅
```

---

## Decision Tree: "Where Does This File Go?"

```
┌─ Is it source code?
│  ├─ YES → src/
│  │   ├─ Config data? → src/config/
│  │   └─ Core logic? → src/
│  └─ NO ↓
│
┌─ Is it a test?
│  ├─ YES → tests/
│  │   ├─ Validator? → tests/validators/
│  │   └─ Test page? → tests/
│  └─ NO ↓
│
┌─ Is it a demo?
│  ├─ YES → demos/
│  └─ NO ↓
│
┌─ Is it documentation?
│  ├─ YES → docs/
│  │   ├─ Architecture? → docs/architecture/
│  │   ├─ Development? → docs/development/
│  │   └─ Research? → docs/research/
│  └─ NO ↓
│
┌─ Is it related to IEE?
│  ├─ FROM IEE? → iee-collaboration/from-iee/
│  │   ├─ Requirements? → from-iee/requirements/
│  │   ├─ Data/JSON? → from-iee/data/
│  │   └─ Communication? → from-iee/communication/
│  │
│  ├─ TO IEE? → iee-collaboration/to-iee/weekN/
│  └─ NO ↓
│
└─ Keep in root (README, LICENSE, .gitignore)
```

---

## Color-Coded Organization

### 🟦 Implementation (Blue)
- `src/` folder
- Core semantic parser
- POS tagger
- Lexicons

### 🟩 Validation (Green)
- `tests/` folder
- Test HTML pages
- Validators
- Test results

### 🟨 Demonstration (Yellow)
- `demos/` folder
- Interactive demos
- Landing pages

### 🟪 Documentation (Purple)
- `docs/` folder
- Architecture docs
- Development guides
- Research notes

### 🟥 IEE Interface (Red - Important!)
- `iee-collaboration/` folder
- **FROM IEE:** Requirements, data, validators
- **TO IEE:** Deliverables by week

---

## Success Metrics

### Before Refactor
- ❌ Time to find file: ~30 seconds (scan 31 files)
- ❌ Time to understand structure: ~10 minutes (read everything)
- ❌ Time to package deliverables: ~5 minutes (manual selection)
- ❌ LLM context overhead: High (31 files to scan)

### After Refactor
- ✅ Time to find file: ~5 seconds (navigate to folder)
- ✅ Time to understand structure: ~2 minutes (read root README)
- ✅ Time to package deliverables: ~10 seconds (zip folder)
- ✅ LLM context overhead: Low (6 folders to scan)

---

## Quick Start After Refactor

### For Developers
```bash
1. Read README.md (root)
2. cd demos/ && open semantic-demo.html
3. cd src/ && read SemanticRoleExtractor.js
```

### For IEE Team
```bash
1. cd iee-collaboration/
2. Read README.md
3. Check to-iee/week1/ for deliverables
4. Upload new files to from-iee/
```

### For Testers
```bash
1. cd tests/
2. open run-iee-validator.html
3. Check results
```

---

**Visual Guide Version:** 1.0
**Date:** 2026-01-10
**Purpose:** Supplement to REPOSITORY_REFACTOR_PLAN.md
