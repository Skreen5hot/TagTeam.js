# Migration Note: selectional-corpus.json → v2.0 Schema

**Date:** 2026-02-09
**Status:** Pending
**Priority:** P1

## Issue

The existing `selectional-corpus.json` (created 2026-01-26) uses the v1.0 schema format. It needs to be migrated to the v2.0 schema to work with the new golden test runner.

## Changes Required

### 1. Corpus-Level Changes

**Old (v1.0):**
```json
{
  "version": "1.0",
  "description": "...",
  "created": "2026-01-26",
  "cases": [...]
}
```

**New (v2.0):**
```json
{
  "version": "2.0",
  "corpusId": "selectional-corpus",
  "description": "...",
  "metadata": {
    "created": "2026-01-26",
    "lastUpdated": "2026-02-09",
    "author": "TagTeam Core Team",
    "phase": "6.0",
    "priority": "P0"
  },
  "cases": [...]
}
```

### 2. Test Case Changes (All 20 Cases)

**Old format:**
```json
{
  "id": "golden-001",
  "sentence": "The doctor decided to operate",
  "verb": "decide",
  "subject": { "label": "doctor", "type": "cco:Person" },
  "expectedSubjectValid": true,
  "expectedConfidence": 0.95,
  "tags": ["intentional_mental", "animate_subject", "medical"]
}
```

**New format:**
```json
{
  "id": "golden-001",
  "category": "selectional-preference",
  "input": "The doctor decided to operate",
  "expectedOutput": {
    "verb": "decide",
    "subject": { "label": "doctor", "type": "cco:Person" },
    "subjectValid": true,
    "subjectConfidence": 0.95
  },
  "tags": ["intentional_mental", "animate_subject", "medical"],
  "priority": "P0",
  "notes": "Valid intentional act with animate subject"
}
```

### Mapping Rules

| Old Field | New Location | Notes |
|-----------|--------------|-------|
| `sentence` | `input` | Direct rename |
| `verb`, `subject`, `expected*` | `expectedOutput.{field}` | Nested under expectedOutput |
| (new) | `category` | Add: "selectional-preference" |
| (new) | `priority` | Add: "P0", "P1", or "P2" |
| (new) | `notes` | Add: Brief explanation (optional) |

## Migration Script (Suggested)

```javascript
// migrate-selectional-corpus.js
const fs = require('fs');

const oldCorpus = require('./selectional-corpus.json');

const newCorpus = {
  version: "2.0",
  corpusId: "selectional-corpus",
  description: oldCorpus.description,
  metadata: {
    created: oldCorpus.created,
    lastUpdated: new Date().toISOString().split('T')[0],
    author: "TagTeam Core Team",
    phase: "6.0",
    priority: "P0"
  },
  cases: oldCorpus.cases.map(testCase => ({
    id: testCase.id,
    category: "selectional-preference",
    input: testCase.sentence,
    expectedOutput: {
      verb: testCase.verb,
      subject: testCase.subject,
      object: testCase.object,
      subjectValid: testCase.expectedSubjectValid,
      objectValid: testCase.expectedObjectValid,
      subjectConfidence: testCase.expectedConfidence,
      selectionalViolation: testCase.expectedViolationType === "selectional_violation"
    },
    tags: testCase.tags,
    priority: "P0",
    notes: `Migrated from v1.0 schema`
  }))
};

fs.writeFileSync(
  './selectional-corpus.json',
  JSON.stringify(newCorpus, null, 2)
);

console.log('Migration complete!');
```

## Alternative: Manual Migration

Update each of the 20 test cases manually by:
1. Adding `category` field
2. Renaming `sentence` → `input`
3. Wrapping fields in `expectedOutput` object
4. Adding `priority` field
5. Optionally adding `notes` field

## Verification

After migration, run:
```bash
npm run validate:golden
npm run test:golden -- --corpus=selectional-corpus
```

Expected result: 0 schema validation errors, 20 tests executed.

## Timeline

**Estimated Effort:** 30 minutes (scripted) or 2 hours (manual)
**Priority:** P1 (blocks using selectional-corpus in golden test suite)

---

*Note: This migration is tracked but not blocking Phase 1 completion. The infrastructure is in place; this is data cleanup.*
