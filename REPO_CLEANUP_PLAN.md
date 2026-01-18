# Repository Cleanup Plan - Week 2b → Week 3 Transition

**Date:** January 18, 2026
**Current Status:** Week 2b Complete (v2.0.0)
**Goal:** Clean, organized repo ready for Week 3 (Ontology Integration + Enhancements)

---

## Current State Analysis

### ✅ Well Organized
- `src/` - Source code (8 files, clean)
- `dist/` - Production bundle
- `iee-collaboration/` - IEE partnership files
- `.github/` - GitHub workflows

### ⚠️ Needs Organization
- **Root directory cluttered** (30+ files)
- **Test files scattered** (10+ test files in root)
- **Documentation mixed** (some in `/docs`, some in root)
- **Completion reports scattered** (WEEK1_FIXES_COMPLETE.md, WEEK2B_COMPLETE.md, etc. in root)
- **Old planning docs** (mixed in `/docs`)

---

## Proposed New Structure

```
TagTeam.js/
├── .github/                          # GitHub workflows (unchanged)
├── .claude/                          # Claude settings (unchanged)
│
├── src/                              # Source code
│   ├── core/                         # ← NEW: Core components
│   │   ├── lexicon.js
│   │   ├── POSTagger.js
│   │   ├── PatternMatcher.js
│   │   └── SemanticRoleExtractor.js
│   ├── analyzers/                    # ← NEW: Analysis components
│   │   ├── ContextAnalyzer.js
│   │   ├── ValueMatcher.js
│   │   ├── ValueScorer.js
│   │   └── EthicalProfiler.js
│   └── ontology/                     # ← NEW: Week 3 (future)
│       ├── OntologyLoader.js
│       └── TTLParser.js
│
├── dist/                             # Production bundle
│   ├── tagteam.js                    # Main bundle (4.28 MB)
│   ├── tagteam.min.js                # ← TODO: Minified version
│   ├── test-week2b-full.html         # Comprehensive test suite
│   └── README.md
│
├── tests/                            # ← REORGANIZE: All tests here
│   ├── unit/                         # ← NEW: Unit tests
│   │   ├── test-value-matcher.js
│   │   ├── test-value-scorer.js
│   │   └── test-ethical-profiler.js
│   ├── integration/                  # ← NEW: Integration tests
│   │   ├── test-integration.js
│   │   ├── test-full-corpus.js
│   │   └── test-week2b.js
│   ├── browser/                      # ← NEW: Browser tests
│   │   ├── test-week1-fixes.html
│   │   ├── test-week2a-context.html
│   │   ├── test-debug-trust.html
│   │   └── verify-bundle.html
│   ├── iee/                          # ← NEW: IEE-specific tests
│   │   ├── test-iee-corpus.html
│   │   ├── test-iee-format.html
│   │   └── run-iee-validator.html
│   ├── validators/                   # Existing validators
│   │   ├── tagteam-validator.js
│   │   └── tagteam-validator-browser.js
│   └── README.md
│
├── docs/                             # Documentation
│   ├── api/                          # ← NEW: API documentation
│   │   ├── TagTeam.parse.md
│   │   ├── loadOntology.md
│   │   └── configure.md
│   ├── guides/                       # ← NEW: User guides
│   │   ├── getting-started.md
│   │   ├── creating-ontologies.md
│   │   └── migration-v2-to-v3.md
│   ├── architecture/                 # Architecture docs (existing)
│   │   ├── design-decisions.md
│   │   ├── semantic-approach.md
│   │   └── SEMANTIC_GAP_ANALYSIS.md
│   ├── research/                     # Research notes (existing)
│   │   ├── bfo-intentionality.md
│   │   └── predicates_to_processes.md
│   └── README.md
│
├── planning/                         # ← NEW: All planning docs
│   ├── week1/
│   │   ├── WEEK1_FIX_PLAN.md
│   │   └── WEEK1_FIXES_COMPLETE.md
│   ├── week2/
│   │   ├── WEEK2_PLANNING.md
│   │   ├── WEEK2_KICKOFF.md
│   │   └── WEEK2A_COMPLETE.md
│   ├── week2b/
│   │   ├── WEEK2B_API_MOCKUPS.md
│   │   ├── WEEK2B_ARCHITECTURE.md
│   │   ├── WEEK2B_IMPLEMENTATION_PLAN.md
│   │   ├── WEEK2B_PLANNING_SESSION_AGENDA.md
│   │   ├── WEEK2B_TECHNICAL_QUESTIONS.md
│   │   ├── WEEK2B_PLANNING_SUMMARY.md
│   │   ├── CHECKPOINT_1_STATUS.md
│   │   ├── CHECKPOINT_2_STATUS.md
│   │   ├── WEEK2B_METRICS.md
│   │   ├── WEEK2B_PROGRESS_SUMMARY.md
│   │   └── WEEK2B_COMPLETE.md
│   ├── week3/
│   │   ├── WEEK3_ROADMAP.md
│   │   └── ONTOLOGY_INTEGRATION_PLAN.md
│   └── README.md
│
├── deliverables/                     # ← NEW: Milestone deliverables
│   ├── week1/
│   │   ├── STATUS.md
│   │   └── DELIVERABLE.md
│   ├── week2/
│   │   ├── BUNDLE_VERIFICATION.md
│   │   └── HOW_TO_VERIFY.md
│   └── README.md
│
├── iee-collaboration/                # IEE partnership (unchanged)
│   ├── from-iee/
│   ├── to-iee/
│   └── README.md
│
├── demos/                            # Demo files (unchanged)
│   └── README.md
│
├── ontologies/                       # ← NEW: Week 3 ontologies
│   ├── base/                         # Default IEE ontology
│   ├── domains/                      # Domain-specific
│   ├── examples/                     # Example ontologies
│   └── README.md
│
├── scripts/                          # ← NEW: Build/utility scripts
│   ├── build.js
│   ├── calculate-metrics.js
│   └── README.md
│
├── archive/                          # ← NEW: Historical/deprecated
│   ├── POS Graph POC/
│   ├── REFACTOR_COMPLETE.md
│   ├── BUNDLE_COMPLETE.md
│   ├── GITHUB_PAGES_SETUP.md
│   └── README.md
│
├── .gitignore
├── LICENSE
├── README.md                         # Main project README
└── package.json                      # ← NEW: NPM package metadata
```

---

## Cleanup Tasks

### Phase 1: Create New Directories ✓

```bash
# Create new directory structure
mkdir -p src/{core,analyzers,ontology}
mkdir -p tests/{unit,integration,browser,iee}
mkdir -p docs/{api,guides}
mkdir -p planning/{week1,week2,week2b,week3}
mkdir -p deliverables/{week1,week2}
mkdir -p ontologies/{base,domains,examples}
mkdir -p scripts
mkdir -p archive
```

### Phase 2: Reorganize Source Code ✓

**Move core components:**
```bash
# Core
mv src/lexicon.js src/core/
mv src/POSTagger.js src/core/
mv src/PatternMatcher.js src/core/
mv src/SemanticRoleExtractor.js src/core/

# Analyzers
mv src/ContextAnalyzer.js src/analyzers/
mv src/ValueMatcher.js src/analyzers/
mv src/ValueScorer.js src/analyzers/
mv src/EthicalProfiler.js src/analyzers/
```

**Update imports in build.js:**
```javascript
// OLD
const lexiconPath = path.join(__dirname, 'src', 'lexicon.js');

// NEW
const lexiconPath = path.join(__dirname, 'src', 'core', 'lexicon.js');
```

### Phase 3: Reorganize Tests ✓

**Move test files:**
```bash
# Unit tests (future - to be created)
# (none yet, will create in Week 3)

# Integration tests
mv test-integration.js tests/integration/
mv test-full-corpus.js tests/integration/
mv test-week2b.js tests/integration/
mv test-integration-node.js tests/integration/

# Browser tests
mv test-week1-fixes.html tests/browser/
mv test-week2a-context.html tests/browser/
mv test-debug-trust.html tests/browser/
mv verify-bundle.html tests/browser/

# IEE tests
mv tests/test-iee-corpus.html tests/iee/
mv tests/test-iee-format.html tests/iee/
mv tests/run-iee-validator.html tests/iee/

# Validators (already in tests/validators/)
# (no move needed)

# Debug/scratch tests (decide: keep or archive?)
mv test-debug.js tests/integration/  # Keep, useful
mv test-regex.js archive/            # Archive, old POC
mv test-trust-scoring.js archive/    # Archive, old POC
```

### Phase 4: Reorganize Documentation ✓

**Planning documents:**
```bash
# Week 1
mv docs/WEEK1_FIX_PLAN.md planning/week1/
mv WEEK1_FIXES_COMPLETE.md planning/week1/

# Week 2
mv docs/WEEK2_PLANNING.md planning/week2/
mv docs/WEEK2_KICKOFF.md planning/week2/

# Week 2b
mv docs/WEEK2B_API_MOCKUPS.md planning/week2b/
mv docs/WEEK2B_ARCHITECTURE.md planning/week2b/
mv docs/WEEK2B_IMPLEMENTATION_PLAN.md planning/week2b/
mv docs/WEEK2B_PLANNING_SESSION_AGENDA.md planning/week2b/
mv docs/WEEK2B_TECHNICAL_QUESTIONS.md planning/week2b/
mv WEEK2B_PLANNING_SUMMARY.md planning/week2b/
mv CHECKPOINT_2_STATUS.md planning/week2b/
mv WEEK2B_METRICS.md planning/week2b/
mv WEEK2B_PROGRESS_SUMMARY.md planning/week2b/
mv WEEK2B_COMPLETE.md planning/week2b/

# Week 3
mv WEEK3_ROADMAP.md planning/week3/
mv ONTOLOGY_INTEGRATION_PLAN.md planning/week3/

# Deliverables
mv iee-collaboration/to-iee/week1/*.md deliverables/week1/
mv iee-collaboration/to-iee/week2/BUNDLE_VERIFICATION.md deliverables/week2/
mv iee-collaboration/to-iee/week2/HOW_TO_VERIFY.md deliverables/week2/
```

**Development docs (keep in docs/development/):**
```bash
# These stay in docs/development/
# - BUNDLE_STRATEGY.md
# - roadmap.md
# - refactor-plans/
```

### Phase 5: Move Scripts ✓

```bash
mv build.js scripts/
mv calculate-metrics.js scripts/
```

**Update paths in scripts:**
```javascript
// In scripts/build.js
// Change all relative paths from __dirname to parent directory
const srcDir = path.join(__dirname, '..', 'src');
```

### Phase 6: Archive Old Files ✓

```bash
# Historical/deprecated
mv "POS Graph POC" archive/
mv REFACTOR_COMPLETE.md archive/
mv BUNDLE_COMPLETE.md archive/
mv GITHUB_PAGES_SETUP.md archive/

# Update archive/README.md to explain what's here
```

### Phase 7: Create Missing Files ✓

**Create package.json:**
```json
{
  "name": "tagteam-js",
  "version": "2.0.0",
  "description": "Deterministic semantic parser with ethical value detection",
  "main": "dist/tagteam.js",
  "scripts": {
    "build": "node scripts/build.js",
    "test": "node tests/integration/test-full-corpus.js",
    "test:browser": "open tests/browser/verify-bundle.html",
    "metrics": "node scripts/calculate-metrics.js"
  },
  "keywords": ["nlp", "ethics", "semantic-parsing", "values", "bfo"],
  "author": "Aaron Damiano",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/TagTeam.js"
  }
}
```

**Create .gitignore (update):**
```gitignore
# Node modules (if we add any)
node_modules/

# Build artifacts
dist/*.map
*.log

# OS files
.DS_Store
Thumbs.db

# Editor files
.vscode/
.idea/
*.swp
*.swo

# Test results
TEST_RESULTS_*.json
WEEK2B_METRICS.json

# Temporary files
tmp/
temp/
```

**Create README files:**
- planning/README.md - Explains planning docs structure
- deliverables/README.md - Explains deliverable milestones
- ontologies/README.md - Explains ontology structure
- scripts/README.md - Explains build scripts
- archive/README.md - Explains archived content
- tests/README.md - Update with new structure

### Phase 8: Update Main README ✓

**Update root README.md** to reflect new structure:

```markdown
# TagTeam.js v2.0.0

Deterministic semantic parser with ethical value detection.

## Quick Start

```html
<script src="dist/tagteam.js"></script>
<script>
  const result = TagTeam.parse("The family must decide...");
  console.log(result.ethicalProfile);
</script>
```

## Project Structure

- `src/` - Source code
  - `src/core/` - Core parsing components
  - `src/analyzers/` - Analysis components (context, values)
  - `src/ontology/` - Ontology loading (Week 3)
- `dist/` - Production bundle
- `tests/` - All test files
- `docs/` - Documentation
- `planning/` - Planning documents
- `ontologies/` - Value ontologies (Week 3)

## Documentation

- [API Reference](docs/api/)
- [User Guides](docs/guides/)
- [Architecture](docs/architecture/)

## Development

```bash
npm run build      # Build bundle
npm test           # Run tests
npm run metrics    # Calculate metrics
```

## License

MIT
```

### Phase 9: Update Build Script Paths ✓

**Update scripts/build.js:**

```javascript
// Update all paths to account for new location
const srcDir = path.join(__dirname, '..', 'src');
const distDir = path.join(__dirname, '..', 'dist');
const dataDir = path.join(__dirname, '..', 'iee-collaboration', 'from-iee', 'data');

// Update source paths
const lexiconPath = path.join(srcDir, 'core', 'lexicon.js');
const posTaggerPath = path.join(srcDir, 'core', 'POSTagger.js');
const patternMatcherPath = path.join(srcDir, 'core', 'PatternMatcher.js');
const contextAnalyzerPath = path.join(srcDir, 'analyzers', 'ContextAnalyzer.js');
const valueMatcherPath = path.join(srcDir, 'analyzers', 'ValueMatcher.js');
const valueScorerPath = path.join(srcDir, 'analyzers', 'ValueScorer.js');
const ethicalProfilerPath = path.join(srcDir, 'analyzers', 'EthicalProfiler.js');
const semanticExtractorPath = path.join(srcDir, 'core', 'SemanticRoleExtractor.js');
```

### Phase 10: Update Test File Paths ✓

**Update all test files** to use correct paths to:
- `dist/tagteam.js`
- `src/` components
- Data files

Example for tests/integration/test-full-corpus.js:
```javascript
// OLD
require('./src/lexicon.js');

// NEW
require('../../src/core/lexicon.js');
```

### Phase 11: Verify Everything Works ✓

**After reorganization, test:**

```bash
# 1. Build succeeds
npm run build
# Should create dist/tagteam.js

# 2. Tests run
npm test
# Should execute test-full-corpus.js

# 3. Browser tests work
# Open tests/browser/verify-bundle.html
# Should load and run successfully

# 4. Git status clean
git status
# Should show organized structure
```

---

## Execution Order (Step-by-Step)

### Step 1: Backup Current State ✓
```bash
git add -A
git commit -m "Checkpoint: Before repo reorganization"
git tag v2.0.0-pre-cleanup
```

### Step 2: Create New Directories ✓
```bash
# Run all mkdir commands from Phase 1
```

### Step 3: Move Source Files ✓
```bash
# Run all mv commands from Phase 2
```

### Step 4: Move Test Files ✓
```bash
# Run all mv commands from Phase 3
```

### Step 5: Move Documentation ✓
```bash
# Run all mv commands from Phase 4
```

### Step 6: Move Scripts ✓
```bash
# Run all mv commands from Phase 5
```

### Step 7: Archive Old Files ✓
```bash
# Run all mv commands from Phase 6
```

### Step 8: Create New Files ✓
```bash
# Create package.json, update .gitignore, create READMEs
```

### Step 9: Update Build Script ✓
```bash
# Edit scripts/build.js with new paths
```

### Step 10: Update Test Files ✓
```bash
# Edit test files with new paths
```

### Step 11: Test Build ✓
```bash
npm run build
# Verify dist/tagteam.js is created
```

### Step 12: Test Execution ✓
```bash
# Open tests/browser/verify-bundle.html in browser
# Run npm test
# Verify everything works
```

### Step 13: Update README ✓
```bash
# Edit README.md with new structure
```

### Step 14: Commit Reorganization ✓
```bash
git add -A
git commit -m "Repository reorganization for Week 3

- Organized src/ into core/ and analyzers/ subdirectories
- Consolidated all tests into tests/ with subdirectories
- Moved planning docs to planning/ by week
- Created ontologies/ directory for Week 3
- Moved build scripts to scripts/
- Archived deprecated files
- Created package.json
- Updated all documentation

Ready for Week 3: Ontology Integration"
```

### Step 15: Tag Release ✓
```bash
git tag v2.0.0-clean
git push origin main --tags
```

---

## Benefits of New Structure

### Before (Cluttered)
```
TagTeam.js/
├── 30+ files in root
├── Test files scattered
├── Planning docs mixed
└── Hard to find anything
```

### After (Organized)
```
TagTeam.js/
├── src/ (organized by component type)
├── tests/ (all tests, organized by type)
├── docs/ (pure documentation)
├── planning/ (historical, organized by week)
├── scripts/ (build tools)
└── Root: Only README, LICENSE, package.json
```

### Advantages
1. ✅ **Cleaner root** - Only essential files visible
2. ✅ **Logical grouping** - Related files together
3. ✅ **Easier navigation** - Clear directory purpose
4. ✅ **Better for newcomers** - Obvious structure
5. ✅ **Scalable** - Ready for Week 3+ additions
6. ✅ **Professional** - Standard project layout
7. ✅ **Git-friendly** - Logical commit organization

---

## Post-Cleanup Checklist

- [ ] All source files in `src/core/` or `src/analyzers/`
- [ ] All tests in `tests/` subdirectories
- [ ] All planning docs in `planning/` by week
- [ ] Scripts in `scripts/`
- [ ] Old files in `archive/`
- [ ] Root directory clean (< 10 files)
- [ ] Build succeeds (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Browser tests work
- [ ] README.md updated
- [ ] package.json created
- [ ] .gitignore updated
- [ ] All READMEs created
- [ ] Git commit made
- [ ] Git tag created

---

## Timeline

**Estimated Time:** 2-3 hours

- Phase 1-7 (Moving files): 1 hour
- Phase 8-10 (Creating/updating files): 30 min
- Phase 11 (Testing): 30 min
- Phase 12-15 (Documentation & commit): 30 min

---

## Ready for Week 3

After cleanup, the repo will be perfectly positioned for:

✅ **Ontology Integration**
- `ontologies/` directory ready
- `src/ontology/` for new components
- Clear structure for new features

✅ **Professional Development**
- Standard directory layout
- NPM-ready structure
- Easy for contributors

✅ **Clean History**
- Planning docs archived by week
- Clear progression visible
- Easy to reference past decisions

---

**Let's execute this cleanup! Should I start with the reorganization?**
