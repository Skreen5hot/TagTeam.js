# Build Scripts

This directory contains build and utility scripts for TagTeam.js.

## Scripts

### build.js
**Purpose:** Builds the production bundle (dist/tagteam.js)

**Usage:**
```bash
node scripts/build.js
```

**What it does:**
1. Reads source files from `src/core/` and `src/analyzers/`
2. Reads data files from `iee-collaboration/from-iee/data/`
3. Combines into single UMD bundle
4. Writes to `dist/tagteam.js` (~4.28 MB)

**Output:**
- Bundle header with version info
- Lexicon data (~3.2 MB)
- POS Tagger (~0.8 MB)
- Pattern Matcher
- Context Analyzer
- Value detection components (ValueMatcher, ValueScorer, EthicalProfiler)
- Semantic Role Extractor
- Unified TagTeam API

### calculate-metrics.js
**Purpose:** Calculate accuracy metrics for value detection

**Usage:**
```bash
node scripts/calculate-metrics.js
```

**What it does:**
1. Loads test corpus (20 scenarios)
2. Runs semantic analysis on each
3. Calculates precision, recall, F1 score
4. Measures performance (parse time)
5. Saves results to `WEEK2B_METRICS.json`

**Output:**
- Scenario coverage statistics
- Value detection accuracy
- Polarity accuracy
- Salience accuracy
- Performance metrics

## NPM Scripts

These scripts can also be run via npm:

```bash
npm run build      # Runs build.js
npm run metrics    # Runs calculate-metrics.js
npm test           # Runs integration tests
```

## Requirements

- Node.js 14+ (for fs, path modules)
- No external dependencies (all scripts use built-in modules)

## Adding New Scripts

When adding new build or utility scripts:

1. Place the script in this directory
2. Update this README
3. Add npm script to package.json if appropriate
4. Use relative paths from script location (e.g., `path.join(__dirname, '..', 'src')`)
