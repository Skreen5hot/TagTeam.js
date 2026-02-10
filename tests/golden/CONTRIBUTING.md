# Contributing to the Golden Test Corpus

Thank you for contributing to TagTeam's golden test corpus! This guide will help you add high-quality test cases that improve TagTeam's parsing accuracy and regression prevention.

---

## 📋 Table of Contents

1. [Before You Start](#before-you-start)
2. [Choosing a Corpus](#choosing-a-corpus)
3. [Test Case Structure](#test-case-structure)
4. [Writing Test Cases](#writing-test-cases)
5. [Validation](#validation)
6. [Submission Process](#submission-process)
7. [Best Practices](#best-practices)

---

## Before You Start

### Prerequisites

- Familiarity with TagTeam's parsing capabilities
- Understanding of semantic parsing concepts
- JSON editing experience
- Review [SCHEMA.md](SCHEMA.md) for schema documentation

### Key Principles

1. **Accuracy** - Expected outputs must be 100% correct
2. **Coverage** - Test edge cases and boundary conditions
3. **Clarity** - Include clear notes and documentation
4. **Uniqueness** - Don't duplicate existing test cases
5. **Relevance** - Align with roadmap phases and v1 scope

---

## Choosing a Corpus

### Decision Tree

```
1. Is this testing a specific roadmap phase feature?
   YES → Use phase-specific/ corpus
   NO → Go to 2

2. Is this testing a general linguistic feature?
   YES → Use feature-specific/ corpus
   NO → Go to 3

3. Is this validating v1 scope contract?
   YES → Use v1-acceptance/ corpus
   NO → Go to 4

4. Is this for IEE team validation?
   YES → Use iee-integration/ corpus
   NO → Go to 5

5. Is this a known regression or bug?
   YES → Use regression/ corpus
   NO → Use domain-specific/edge-cases.json
```

### Corpus Mapping

| If testing... | Use corpus... |
|---------------|---------------|
| Interpretation lattice (Phase 6.1-6.4) | `phase-specific/interpretation-lattice.json` |
| Selectional preferences (Phase 6.0) | `selectional-corpus.json` (root level) |
| Ontology loading (Phase 6.5) | `phase-specific/ontology-loading.json` |
| Source attribution (Phase 7.1) | `phase-specific/epistemic-markers.json` |
| Definiteness detection | `feature-specific/definiteness-corpus.json` |
| Modal ambiguity | `feature-specific/modality-corpus.json` |
| Voice transformations | `feature-specific/voice-corpus.json` |
| Negation scope | `feature-specific/negation-corpus.json` |
| Passive voice (v1 core) | `v1-acceptance/v1-core-features.json` |
| Question ICE nodes (v2 deferred) | `v1-acceptance/v1-deferred-features.json` |
| v1/v2 boundary | `v1-acceptance/v1-edge-cases.json` |
| IEE value detection | `iee-integration/ethical-values.json` |
| IEE context intensity | `iee-integration/context-intensity.json` |
| IEE semantic roles | `iee-integration/semantic-roles.json` |
| Known Phase 4 bug | `regression/phase4-regressions.json` |
| Malformed input | `domain-specific/edge-cases.json` |

---

## Test Case Structure

### Minimal Required Fields

```json
{
  "id": "unique-test-id",
  "category": "test-category",
  "input": "The text to parse",
  "expectedOutput": {
    "...": "expected parsing results"
  },
  "tags": ["tag1", "tag2"],
  "priority": "P0"
}
```

### Full Structure with Optional Fields

```json
{
  "id": "lattice-001",
  "category": "deontic-epistemic-ambiguity",
  "input": "The doctor should prioritize the younger patient",

  "expectedOutput": {
    "defaultReading": {
      "modality": "obligation",
      "actualityStatus": "tagteam:Prescribed"
    },
    "alternativeReadings": [
      {
        "modality": "expectation",
        "actualityStatus": "tagteam:Hypothetical",
        "plausibility": 0.3
      }
    ],
    "ambiguityType": "modal_force",
    "ambiguityPreserved": true
  },

  "validationRules": {
    "mustHaveDefaultReading": true,
    "mustHaveAlternatives": true,
    "minAlternatives": 1,
    "maxAlternatives": 2,
    "defaultPlausibility": { "min": 0.6, "max": 1.0 },
    "alternativePlausibility": { "min": 0.2, "max": 0.5 },
    "tolerance": 0.1
  },

  "tags": ["ambiguity", "modal", "deontic", "epistemic", "medical"],
  "priority": "P0",
  "phase": "6.1",
  "relatedIssues": ["#123"],
  "notes": "Classic deontic-epistemic ambiguity. Should default to deontic in medical context.",
  "disabled": false
}
```

---

## Writing Test Cases

### Step 1: Determine Test ID

Format: `{category-prefix}-{sequential-number}`

Examples:
- `lattice-001`, `lattice-002` (interpretation lattice)
- `def-001`, `def-002` (definiteness)
- `modal-001`, `modal-002` (modality)
- `values-001`, `values-002` (ethical values)

**Rule:** Use 3-digit zero-padded numbers (001, 002, ..., 099)

### Step 2: Choose Category

Be specific about what linguistic phenomenon you're testing:

- Good: `"deontic-epistemic-ambiguity"`
- Bad: `"ambiguity"`

- Good: `"definite-np-with-modifiers"`
- Bad: `"definiteness"`

### Step 3: Write Input Text

**Guidelines:**
- Use realistic, natural language
- Medical ethics domain preferred (aligns with IEE)
- Keep sentences under 30 words for v1 scope
- Use proper capitalization and punctuation
- Avoid typos (unless testing malformed input)

**Examples:**

✅ Good:
```json
"input": "The doctor should prioritize the younger patient"
```

❌ Bad:
```json
"input": "doctor should prioritize patient"  // Missing articles, unnatural
```

### Step 4: Define Expected Output

**Critical:** Expected output must match **actual TagTeam output format**.

**How to get expected output:**
1. Run TagTeam on your input text
2. Copy the actual output
3. Manually verify it's correct
4. Paste as `expectedOutput`

**Example workflow:**

```javascript
// 1. Run TagTeam
const TagTeam = require('../../dist/tagteam.js');
const result = TagTeam.buildGraph("The doctor decided to operate", {
  preserveAmbiguity: true
});

// 2. Inspect output
console.log(JSON.stringify(result, null, 2));

// 3. Copy relevant fields to expectedOutput
```

### Step 5: Add Validation Rules (Optional)

Use validation rules when exact matching is too strict:

```json
"validationRules": {
  "tolerance": 0.1,  // ±0.1 for numeric values
  "mustHaveDefaultReading": true,
  "minAlternatives": 1
}
```

### Step 6: Assign Priority

| Priority | When to Use |
|----------|-------------|
| **P0** | Critical feature, blocking v1 release, core functionality |
| **P1** | Important feature, should have for v1, high value |
| **P2** | Nice to have, edge cases, low frequency scenarios |

**Guidelines:**
- v1 core features → P0
- IEE integration → P0
- Interpretation lattice → P0
- Edge cases → P2
- Regressions → P1

### Step 7: Add Tags

**Tag categories:**
- **Linguistic feature:** `modal`, `negation`, `passive`, `definite`, `temporal`
- **Domain:** `medical`, `legal`, `business`, `ethical`
- **Phase:** `phase-6`, `phase-7`, `v1`, `v2`
- **Ambiguity type:** `ambiguity`, `deontic`, `epistemic`, `scope`
- **IEE:** `week1`, `week2a`, `week2b`, `value-detection`

**Example:**
```json
"tags": ["modal", "deontic", "epistemic", "ambiguity", "medical", "phase-6"]
```

### Step 8: Write Notes

Explain:
- Why this test case exists
- What it validates
- Any special considerations
- Linguistic explanation

**Example:**
```json
"notes": "Classic deontic-epistemic ambiguity with 'should'. In medical contexts, deontic (obligation) reading is more common than epistemic (expectation). TagTeam should default to deontic but preserve epistemic as alternative with lower plausibility (~0.3)."
```

---

## Validation

### Before Submitting

1. **Validate JSON syntax:**
   ```bash
   npm run validate:golden
   ```

2. **Validate against schema:**
   ```bash
   npm run validate:schema
   ```

3. **Run the test:**
   ```bash
   npm run test:golden -- --corpus=your-corpus
   ```

4. **Check for duplicates:**
   ```bash
   npm run check:duplicates
   ```

### Common Validation Errors

| Error | Fix |
|-------|-----|
| `Missing required field "id"` | Add unique test ID |
| `Invalid priority "P3"` | Use P0, P1, or P2 only |
| `Duplicate test ID "lattice-001"` | Use next available number |
| `Empty tags array` | Add at least one tag |
| `Invalid JSON` | Fix syntax errors (commas, quotes, brackets) |

---

## Submission Process

### 1. Create a Branch

```bash
git checkout -b golden-test/your-test-name
```

### 2. Edit Corpus File

Add your test case to the appropriate corpus file's `cases` array.

### 3. Update corpus-index.json

Increment the `testCount` for your corpus:

```json
{
  "id": "interpretation-lattice",
  "testCount": 51,  // Was 50, now 51
  "lastUpdated": "2026-02-09"
}
```

### 4. Run Validation

```bash
npm run validate:golden
npm run test:golden
```

### 5. Commit Changes

```bash
git add tests/golden/
git commit -m "Add test case: lattice-051 for modal negation"
```

### 6. Push and Create PR

```bash
git push origin golden-test/your-test-name
```

Then create a pull request with:
- **Title:** `[Golden Test] Add {test-id}: {description}`
- **Description:** Explain what the test validates and why it's needed
- **Checklist:** Include validation results

---

## Best Practices

### DO ✅

- **DO** test one phenomenon per test case
- **DO** use realistic, natural language
- **DO** include clear notes explaining the test
- **DO** verify expected output matches actual TagTeam output
- **DO** use appropriate priority levels
- **DO** add comprehensive tags
- **DO** validate before submitting

### DON'T ❌

- **DON'T** duplicate existing test cases
- **DON'T** test multiple unrelated features in one test
- **DON'T** use artificial or contrived language
- **DON'T** guess expected output without running TagTeam
- **DON'T** make everything P0 priority
- **DON'T** submit without validation

### Examples

#### ✅ Good Test Case

```json
{
  "id": "lattice-025",
  "category": "modal-negation-interaction",
  "input": "The patient should not undergo surgery",
  "expectedOutput": {
    "defaultReading": {
      "modality": "obligation",
      "negated": true,
      "actualityStatus": "tagteam:Prohibited"
    }
  },
  "tags": ["modal", "negation", "deontic", "medical"],
  "priority": "P0",
  "notes": "Tests interaction of deontic modal 'should' with negation 'not'. Expected: prohibition (should not = must not in deontic contexts)."
}
```

#### ❌ Bad Test Case

```json
{
  "id": "test1",  // ❌ Non-descriptive ID
  "category": "test",  // ❌ Too generic
  "input": "patient surgery",  // ❌ Unnatural, missing function words
  "expectedOutput": {
    "result": "something"  // ❌ Vague, not actual TagTeam output
  },
  "tags": ["test"],  // ❌ Uninformative tags
  "priority": "P0"  // ❌ No notes explaining why P0
}
```

---

## Review Checklist

Before submitting, verify:

- [ ] Test ID is unique and follows naming convention
- [ ] Category is specific and descriptive
- [ ] Input text is natural and realistic
- [ ] Expected output matches actual TagTeam output
- [ ] Validation rules are appropriate (if used)
- [ ] Tags are comprehensive and relevant
- [ ] Priority is justified
- [ ] Notes explain the test's purpose
- [ ] JSON is valid (no syntax errors)
- [ ] Schema validation passes
- [ ] Test runs and produces expected result
- [ ] corpus-index.json is updated
- [ ] No duplicates with existing tests

---

## Questions?

- **Schema questions:** See [SCHEMA.md](SCHEMA.md)
- **Corpus organization:** See [README.md](README.md)
- **Implementation plan:** See [planning/GOLDEN_TEST_CORPUS_PLAN.md](../../planning/GOLDEN_TEST_CORPUS_PLAN.md)
- **Issues:** [GitHub Issues](https://github.com/anthropics/claude-code/issues)

---

Thank you for contributing to TagTeam's quality and accuracy! 🎯
