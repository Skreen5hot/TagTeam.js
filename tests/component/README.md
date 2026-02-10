# Level 1: Component Tests

**Purpose:** White-box diagnostic testing of individual TagTeam components against authoritative linguistic and ontological sources of truth.

## Test Categories

### 1. Clause Segmentation (`clause-segmentation/`)
- **Component:** ClauseSegmenter
- **Source of Truth:** Cambridge Grammar of the English Language (Huddleston & Pullum)
- **Test Count:** 50-100 tests
- **Failure Expectations:** 30-50% on V7.0 (prefix subordination, relative clauses)

### 2. Entity Extraction (`entity-extraction/`)
- **Component:** EntityExtractor
- **Source of Truth:** BFO 2020 + CCO v1.5 taxonomies
- **Test Count:** 50-100 tests
- **Failure Expectations:** 10-20% on V7.0 (complex NPs, prepositional phrases)

### 3. Semantic Role Detection (`semantic-roles/`)
- **Component:** RoleDetector
- **Source of Truth:** CCO IntentionalAct semantics + FrameNet
- **Test Count:** 40-60 tests
- **Failure Expectations:** 15-25% on V7.0 (indirect objects, benefactives)

### 4. Hard Boundary Enforcement (`boundary-enforcement/`)
- **Component:** Cross-component integration
- **Source of Truth:** V7 architecture specification
- **Test Count:** 30-40 tests
- **Failure Expectations:** 5-10% on V7.0 (edge cases only)

## Running Component Tests

```bash
# Run all component tests
npm run test:component

# Run specific category
npm run test:component -- --category=clause-segmentation

# Run with verbose output
npm run test:component -- --verbose

# Generate component test report
npm run report:component
```

## Test Format

Each component test follows this structure:

```json
{
  "id": "CS-PREFIX-SUB-001",
  "category": "prefix-subordination",
  "input": "If the server fails, the admin receives an alert.",
  "component": "ClauseSegmenter",
  "expected": {
    "clauses": [...],
    "boundaries": [...]
  },
  "sourceOfTruth": {
    "reference": "Cambridge Grammar §8.3",
    "principle": "Subordinate clause boundaries marked by comma after prefix subordinator"
  },
  "v7ExpectedResult": "FAIL",
  "v7ExpectedFailureMode": "No prefix subordination detection; single clause returned"
}
```

## Ground Truth Registry

See [ground-truth-registry.json](./ground-truth-registry.json) for authoritative sources and principles.

## Success Metrics

**Component tests are DIAGNOSTIC, not gatekeeping:**
- 30-50% failure rate on V7.0 = EXPECTED and VALUABLE
- 0% failure rate = Suspicion of mock tests or insufficient coverage
- Each failure should point to specific architectural gap or missing feature

## Test Development Workflow

1. **Define source of truth** - Identify authoritative reference (grammar, ontology, spec)
2. **Create test case** - Minimal input that tests one principle
3. **Document expected behavior** - What SHOULD happen per source of truth
4. **Run against V7.0** - Capture actual behavior
5. **Analyze deviation** - Why does V7.0 fail? Which component? What's missing?
6. **Register in Ground Truth** - Document authority for this test

## Next Steps

1. **Week 1:** Clause Segmentation tests (50 tests targeting V7-003, V7-004)
2. **Week 2:** Entity Extraction tests (60 tests targeting BFO/CCO alignment)
3. **Week 3:** Semantic Role Detection tests (50 tests targeting CCO IntentionalAct)
4. **Week 4:** Hard Boundary Enforcement tests (30 tests targeting V7 guarantees)

---

**Remember:** Tests that fail diagnostically are more valuable than tests that pass meaninglessly.
