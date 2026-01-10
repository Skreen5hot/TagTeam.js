# TagTeam.js Repository Refactor Plan

**Date:** 2026-01-10
**Purpose:** Improve organization for LLM context, human readability, IEE collaboration, and artifact sharing

---

## Current State Analysis

### 📊 Current Directory Structure (31 files in root)

```
TagTeam.js/
├── js/
│   ├── lexicon.js (4.3MB)
│   ├── POSTagger.js
│   └── SemanticRoleExtractor.js
├── *.html (5 test/demo files)
├── *.md (15+ documentation files)
├── *.json (4 IEE artifacts)
└── misc files
```

### ❌ Problems with Current Structure

#### 1. **LLM Context Issues**
- 31 files in root = high cognitive load for file navigation
- No clear signal for which files are current vs deprecated
- Hard to distinguish: internal docs vs IEE communication vs implementation
- Multiple README files (README.md, README_SEMANTIC.md) = confusion

#### 2. **Human Readability Issues**
- Root directory cluttered with mixed-purpose files
- No visual hierarchy (what to read first?)
- Unclear which files are "source of truth"
- Test files mixed with implementation and docs

#### 3. **IEE Communication Issues**
- IEE artifacts scattered in root
- Unclear which files are FROM IEE vs TO IEE
- No designated folder for IEE collaboration
- Hard to package artifacts for IEE team

#### 4. **Shareable Artifacts Issues**
- No clear "release" or "deliverables" folder
- Test suites mixed with implementation
- No separation of public-facing vs internal docs

---

## Proposed Structure

### 🎯 New Directory Organization

```
TagTeam.js/
│
├── 📁 src/                          # Core implementation (SOURCE)
│   ├── SemanticRoleExtractor.js    # Main parser
│   ├── POSTagger.js                # POS tagger
│   ├── lexicon.js                  # POS lexicon (4.3MB)
│   └── config/                     # Configuration
│       ├── semantic-frames.js      # Frame definitions
│       ├── compound-terms.js       # 150 compound terms
│       └── entity-categories.js    # Entity mappings
│
├── 📁 tests/                        # All test files
│   ├── test-iee-corpus.html        # IEE 5-scenario test
│   ├── test-iee-format.html        # Original 4-scenario test
│   ├── run-iee-validator.html      # Full IEE validator
│   └── validators/                 # Validation scripts
│       ├── tagteam-validator.js    # IEE validator (ES6)
│       └── tagteam-validator-browser.js  # Browser version
│
├── 📁 demos/                        # Interactive demos
│   ├── semantic-demo.html          # Main interactive demo
│   └── index.html                  # Landing page
│
├── 📁 docs/                         # Internal documentation
│   ├── README.md                   # Main project README (link hub)
│   ├── architecture/               # Architecture docs
│   │   ├── design-decisions.md     # Week 1 design choices
│   │   ├── semantic-approach.md    # Semantic parsing approach
│   │   └── performance.md          # Performance benchmarks
│   ├── development/                # Development docs
│   │   ├── refactor-plans/         # Historical refactor plans
│   │   │   ├── POSTagger_refactor_plan.md
│   │   │   └── repository_refactor.md (this file)
│   │   └── roadmap.md              # Feature roadmap
│   └── research/                   # Research & exploration
│       ├── predicates-to-processes.md
│       └── iee-worldview-ui.md
│
├── 📁 iee-collaboration/            # IEE team interface (CRITICAL)
│   ├── README.md                   # IEE collaboration overview
│   ├── from-iee/                   # Artifacts FROM IEE team
│   │   ├── requirements/
│   │   │   ├── integration-requirements.md
│   │   │   └── test-build-plan.md
│   │   ├── data/
│   │   │   ├── compound-terms.json
│   │   │   ├── test-corpus-week1.json
│   │   │   └── value-definitions-core.json
│   │   ├── validators/
│   │   │   └── tagteam-validator.js
│   │   └── communication/
│   │       ├── questions-answered.md
│   │       ├── delivery-summary.md
│   │       └── testing-handoff.md
│   └── to-iee/                     # Artifacts TO IEE team (deliverables)
│       ├── week1/
│       │   ├── DELIVERABLE.md          # Week 1 summary
│       │   ├── INTEGRATION_COMPLETE.md # Integration status
│       │   ├── FORMAT_UPDATES.md       # IEE format changes
│       │   └── test-results/           # Test outputs
│       │       ├── corpus-validation.html
│       │       └── format-validation.html
│       └── week2/                  # (Future)
│           └── ...
│
├── 📁 dist/                         # Distribution builds (Future)
│   ├── tagteam.min.js              # Minified production build
│   ├── tagteam.js                  # Development build
│   └── README.md                   # Usage instructions
│
├── .git/                           # Git repository
├── .gitignore                      # Git ignore rules
├── LICENSE                         # MIT License
├── package.json                    # NPM package config (Future)
└── README.md                       # Main README (link hub)
```

---

## Refactor Benefits

### ✅ For LLMs (Better Context)

1. **Clear Directory Purpose**
   - `src/` = "look here for implementation"
   - `iee-collaboration/` = "look here for IEE context"
   - `tests/` = "look here for validation"

2. **Reduced Cognitive Load**
   - 6 top-level folders vs 31 files
   - Clear hierarchy: implementation → tests → docs → collaboration

3. **Faster File Location**
   - "Need IEE requirements?" → `iee-collaboration/from-iee/requirements/`
   - "Need test files?" → `tests/`
   - "Need implementation?" → `src/`

4. **Version History Clarity**
   - `to-iee/week1/` = Week 1 state
   - `to-iee/week2/` = Week 2 state
   - Clear progression of deliverables

### ✅ For Humans (Better Readability)

1. **Progressive Disclosure**
   - Root README = starting point
   - Each folder has README explaining contents
   - Clear "what to read first" path

2. **Role-Based Navigation**
   - **Developers** → `src/`, `tests/`, `docs/development/`
   - **IEE Team** → `iee-collaboration/`
   - **Users** → `demos/`, `README.md`
   - **Architects** → `docs/architecture/`

3. **Visual Hierarchy**
   - Folders group related files
   - Naming convention signals purpose
   - Less scrolling, more structure

### ✅ For IEE Communication (Better Collaboration)

1. **Bidirectional Clarity**
   - `from-iee/` = "These are YOUR artifacts"
   - `to-iee/` = "These are OUR deliverables"
   - No confusion about ownership

2. **Easy Artifact Packaging**
   - Zip `to-iee/week1/` → send to IEE
   - Clear versioning by week
   - Test results included

3. **Communication Log**
   - `from-iee/communication/` = chronological record
   - All Q&A preserved
   - Easy reference for future questions

4. **Data Isolation**
   - IEE's JSON artifacts in `from-iee/data/`
   - Clear separation from our implementation
   - Easy to update when IEE sends new versions

### ✅ For Shareability (Better Distribution)

1. **Clean Public Interface**
   - `README.md` = professional entry point
   - `demos/` = live demonstrations
   - `dist/` = production-ready builds (future)

2. **Reusable Test Suite**
   - `tests/` folder is self-contained
   - Can be copied to other projects
   - Clear validation framework

3. **Documentation Hierarchy**
   - Public docs in root README
   - Internal docs in `docs/`
   - IEE-specific docs in `iee-collaboration/`

---

## Migration Plan

### Phase 1: Core Restructure (30 min)

**Step 1: Create Directory Structure**
```bash
mkdir -p src/config
mkdir -p tests/validators
mkdir -p demos
mkdir -p docs/{architecture,development/refactor-plans,research}
mkdir -p iee-collaboration/{from-iee/{requirements,data,validators,communication},to-iee/week1/test-results}
mkdir -p dist
```

**Step 2: Move Implementation Files**
```bash
# Source code
mv js/SemanticRoleExtractor.js src/
mv js/POSTagger.js src/
mv js/lexicon.js src/

# Extract config from SemanticRoleExtractor.js (manual refactor later)
# - COMPOUND_TERMS → src/config/compound-terms.js
# - SEMANTIC_FRAMES → src/config/semantic-frames.js
# - ENTITY_CATEGORIES → src/config/entity-categories.js
```

**Step 3: Move Test Files**
```bash
mv test-iee-corpus.html tests/
mv test-iee-format.html tests/
mv run-iee-validator.html tests/
mv tagteam-validator.js tests/validators/
mv tagteam-validator-browser.js tests/validators/
```

**Step 4: Move Demo Files**
```bash
mv semantic-demo.html demos/
mv index.html demos/
```

**Step 5: Move IEE Artifacts**
```bash
# FROM IEE
mv tagTeam_Integration_Requirments.md iee-collaboration/from-iee/requirements/integration-requirements.md
mv TAGTEAM_TEST_BUILD_PLAN.md iee-collaboration/from-iee/requirements/test-build-plan.md
mv TAGTEAM_TESTING_HANDOFF.md iee-collaboration/from-iee/communication/testing-handoff.md
mv TAGTEAM_QUESTIONS_ANSWERED.md iee-collaboration/from-iee/communication/questions-answered.md
mv TAGTEAM_DELIVERY_SUMMARY.md iee-collaboration/from-iee/communication/delivery-summary.md

mv compound-terms.json iee-collaboration/from-iee/data/
mv test-corpus-week1.json iee-collaboration/from-iee/data/
mv value-definitions-core.json iee-collaboration/from-iee/data/

# TO IEE (Week 1 Deliverables)
mv WEEK1_DELIVERABLE.md iee-collaboration/to-iee/week1/DELIVERABLE.md
mv WEEK1_INTEGRATION_COMPLETE.md iee-collaboration/to-iee/week1/INTEGRATION_COMPLETE.md
mv IEE_FORMAT_UPDATES.md iee-collaboration/to-iee/week1/FORMAT_UPDATES.md
mv INTEGRATION_STATUS.md iee-collaboration/to-iee/week1/STATUS.md

# Copy test files to week1 deliverables
cp tests/test-iee-corpus.html iee-collaboration/to-iee/week1/test-results/
cp tests/test-iee-format.html iee-collaboration/to-iee/week1/test-results/
```

**Step 6: Move Documentation**
```bash
# Architecture docs
mv DESIGN_DECISIONS.md docs/architecture/design-decisions.md
mv README_SEMANTIC.md docs/architecture/semantic-approach.md

# Development docs
mv POSTagger_refactor_plan.md docs/development/refactor-plans/
mv road_map.md docs/development/roadmap.md

# Research docs
mv predicates_to_processes.md docs/research/
mv iee-worldview-ui.md docs/research/

# Keep README.md in root
```

**Step 7: Update File References**

All HTML files need path updates:
- `./js/` → `../src/`
- `./tagteam-validator.js` → `./validators/tagteam-validator.js`
- `./compound-terms.json` → `../iee-collaboration/from-iee/data/compound-terms.json`

### Phase 2: Create README Files (20 min)

**Root README.md** (Hub with links)
```markdown
# TagTeam.js - Deterministic Semantic Parser

Quick Links:
- [Try the Demo](demos/semantic-demo.html)
- [Run Tests](tests/)
- [IEE Collaboration](iee-collaboration/)
- [Documentation](docs/)
- [Source Code](src/)
```

**iee-collaboration/README.md**
```markdown
# IEE Collaboration Interface

This folder manages all communication and artifacts with the Integral Ethics Engine (IEE) team.

## Structure
- `from-iee/` - Artifacts received from IEE
- `to-iee/` - Deliverables sent to IEE
```

**tests/README.md**
```markdown
# TagTeam Test Suite

- `test-iee-corpus.html` - IEE's 5 official scenarios
- `test-iee-format.html` - Original 4-scenario validation
- `run-iee-validator.html` - Full IEE validator
```

**docs/README.md**
```markdown
# TagTeam Documentation

- `architecture/` - System design and decisions
- `development/` - Development guides and roadmaps
- `research/` - Research notes and explorations
```

### Phase 3: Config Extraction (40 min)

**Extract from SemanticRoleExtractor.js:**

1. **src/config/compound-terms.js**
```javascript
// Compound terms from IEE (150 terms)
export const COMPOUND_TERMS = [ ... ];
```

2. **src/config/semantic-frames.js**
```javascript
// Semantic frame definitions
export const SEMANTIC_FRAMES = { ... };
export const FRAME_NAME_MAPPING = { ... };
```

3. **src/config/entity-categories.js**
```javascript
// Entity categorization
export const ENTITY_CATEGORIES = { ... };
```

**Update SemanticRoleExtractor.js** to import these configs (or use browser-compatible includes).

### Phase 4: Update HTML Paths (30 min)

**Update all test files:**
- tests/test-iee-corpus.html
- tests/test-iee-format.html
- tests/run-iee-validator.html

**Change:**
```html
<script src="./js/lexicon.js"></script>
<script src="./js/POSTagger.js"></script>
<script src="./js/SemanticRoleExtractor.js"></script>
```

**To:**
```html
<script src="../src/lexicon.js"></script>
<script src="../src/POSTagger.js"></script>
<script src="../src/SemanticRoleExtractor.js"></script>
```

**Update data paths:**
```javascript
fetch('./test-corpus-week1.json')  // OLD
fetch('../iee-collaboration/from-iee/data/test-corpus-week1.json')  // NEW
```

### Phase 5: Clean Up Root (10 min)

**Remove obsolete files:**
```bash
rm nul  # Likely a mistake file
```

**Final root directory:**
```
TagTeam.js/
├── src/
├── tests/
├── demos/
├── docs/
├── iee-collaboration/
├── .git/
├── .gitignore
├── LICENSE
├── README.md
└── package.json (future)
```

---

## File Mapping Reference

### Current → New Location

| Current File | New Location | Notes |
|--------------|--------------|-------|
| **Implementation** |
| js/SemanticRoleExtractor.js | src/SemanticRoleExtractor.js | Extract configs |
| js/POSTagger.js | src/POSTagger.js | |
| js/lexicon.js | src/lexicon.js | |
| **Tests** |
| test-iee-corpus.html | tests/test-iee-corpus.html | Update paths |
| test-iee-format.html | tests/test-iee-format.html | Update paths |
| run-iee-validator.html | tests/run-iee-validator.html | Update paths |
| tagteam-validator.js | tests/validators/tagteam-validator.js | |
| tagteam-validator-browser.js | tests/validators/tagteam-validator-browser.js | |
| **Demos** |
| semantic-demo.html | demos/semantic-demo.html | Update paths |
| index.html | demos/index.html | Update paths |
| **IEE FROM** |
| tagTeam_Integration_Requirments.md | iee-collaboration/from-iee/requirements/integration-requirements.md | |
| TAGTEAM_TEST_BUILD_PLAN.md | iee-collaboration/from-iee/requirements/test-build-plan.md | |
| TAGTEAM_TESTING_HANDOFF.md | iee-collaboration/from-iee/communication/testing-handoff.md | |
| TAGTEAM_QUESTIONS_ANSWERED.md | iee-collaboration/from-iee/communication/questions-answered.md | |
| TAGTEAM_DELIVERY_SUMMARY.md | iee-collaboration/from-iee/communication/delivery-summary.md | |
| compound-terms.json | iee-collaboration/from-iee/data/compound-terms.json | |
| test-corpus-week1.json | iee-collaboration/from-iee/data/test-corpus-week1.json | |
| value-definitions-core.json | iee-collaboration/from-iee/data/value-definitions-core.json | |
| **IEE TO** |
| WEEK1_DELIVERABLE.md | iee-collaboration/to-iee/week1/DELIVERABLE.md | |
| WEEK1_INTEGRATION_COMPLETE.md | iee-collaboration/to-iee/week1/INTEGRATION_COMPLETE.md | |
| IEE_FORMAT_UPDATES.md | iee-collaboration/to-iee/week1/FORMAT_UPDATES.md | |
| INTEGRATION_STATUS.md | iee-collaboration/to-iee/week1/STATUS.md | |
| **Documentation** |
| DESIGN_DECISIONS.md | docs/architecture/design-decisions.md | |
| README_SEMANTIC.md | docs/architecture/semantic-approach.md | |
| POSTagger_refactor_plan.md | docs/development/refactor-plans/POSTagger_refactor.md | |
| road_map.md | docs/development/roadmap.md | |
| predicates_to_processes.md | docs/research/predicates-to-processes.md | |
| iee-worldview-ui.md | docs/research/iee-worldview-ui.md | |
| **Root** |
| README.md | README.md | Update as hub |
| LICENSE | LICENSE | Keep |

---

## Post-Refactor Validation

### Checklist:

1. ✅ All test files run successfully
   - [ ] tests/test-iee-corpus.html opens and runs
   - [ ] tests/test-iee-format.html opens and runs
   - [ ] tests/run-iee-validator.html opens and runs

2. ✅ All demos work
   - [ ] demos/semantic-demo.html loads
   - [ ] demos/index.html loads

3. ✅ All paths updated
   - [ ] No broken `<script src="">` tags
   - [ ] No broken `fetch()` calls
   - [ ] All relative paths correct

4. ✅ Documentation complete
   - [ ] Root README.md is clear entry point
   - [ ] Each folder has README.md
   - [ ] All links work

5. ✅ IEE artifacts organized
   - [ ] All FROM-IEE files in from-iee/
   - [ ] All TO-IEE files in to-iee/week1/
   - [ ] Communication log chronological

---

## Benefits Summary

### Quantitative Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Root directory files | 31 | 6 folders | 81% reduction |
| LLM file scan depth | 1 level, 31 files | 2 levels, 6 folders | 5x easier |
| Time to find IEE artifacts | ~10 file scans | 1 folder | 10x faster |
| Time to package deliverables | Manual selection | Zip 1 folder | 5x faster |
| README files | 2 (conflicting) | 5 (hierarchical) | Clear hierarchy |

### Qualitative Improvements

1. **LLM Context:** Clear directory signals → faster file location
2. **Human Navigation:** Progressive disclosure → easier onboarding
3. **IEE Collaboration:** Bidirectional folders → clear ownership
4. **Shareability:** Clean structure → professional presentation

---

## Timeline

- **Phase 1:** Core Restructure - 30 min
- **Phase 2:** Create READMEs - 20 min
- **Phase 3:** Config Extraction - 40 min
- **Phase 4:** Update HTML Paths - 30 min
- **Phase 5:** Clean Up Root - 10 min

**Total Time:** ~2 hours

**Validation:** 30 min

**Grand Total:** 2.5 hours

---

## Risks & Mitigations

### Risk 1: Broken Paths After Move
**Mitigation:** Update all paths in Phase 4, test each file

### Risk 2: Git History Disruption
**Mitigation:** Use `git mv` instead of `mv` to preserve history

### Risk 3: IEE Team Confusion
**Mitigation:** Send updated directory map, clear `iee-collaboration/README.md`

### Risk 4: Breaking Changes
**Mitigation:** Test all HTML files post-refactor, rollback if needed

---

## Future Enhancements

### After Week 1 Validation

1. **Build System** (Week 2)
   - Add `package.json`
   - Add build script (rollup/webpack)
   - Generate `dist/tagteam.min.js`

2. **Module System** (Week 2)
   - Convert to ES6 modules
   - Use import/export properly
   - Remove IIFE wrappers

3. **Week 2 Structure** (Week 2)
   - Create `iee-collaboration/to-iee/week2/`
   - Add context analysis tests
   - Add value matching tests

4. **CI/CD** (Week 3)
   - Add GitHub Actions
   - Automated testing
   - Automated releases

---

**Prepared By:** Claude Sonnet 4.5
**Date:** 2026-01-10
**Version:** 1.0
**Status:** Ready for Review & Approval
