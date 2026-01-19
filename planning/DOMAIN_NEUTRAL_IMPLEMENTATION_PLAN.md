# Domain-Neutral Parser Implementation Plan

**Based on:** [ONTOLOGICAL_ISSUES_2026_01_19.md](../docs/research/ONTOLOGICAL_ISSUES_2026_01_19.md) v3.1
**Created:** 2026-01-19
**Goal:** Transform TagTeam from medical-domain-coupled to domain-neutral BFO-first architecture

---

## Executive Summary

This plan addresses the technical debt identified in the ontological issues document. The parser currently embeds medical-specific terms (`care`, `therapy`, `surgery`) in core code, violating the domain-neutral principle. This implementation will:

1. Make linguistic patterns the primary detection mechanism
2. Move domain-specific terms to loadable configuration files
3. Implement selectional restrictions for verb sense disambiguation
4. Add proper handling for ambiguous nominalizations

---

## Phase 1: Foundation - Linguistic Pattern Primary Detection

**Duration:** 1-2 sessions
**Goal:** Make nominalization suffix analysis the PRIMARY detection mechanism, removing domain coupling from core logic.

### Tasks

#### 1.1 Refactor EntityExtractor._checkForProcessType()

**Current (domain-coupled):**
```javascript
// Checks PROCESS_ROOT_WORDS first (medical terms)
// Then falls back to suffix analysis
```

**Target (domain-neutral):**
```javascript
// 1. Check ontological vocabulary (domain-neutral)
// 2. Check nominalization suffixes (linguistic patterns)
// 3. Check result noun exception list
// 4. Domain config lookup (if loaded)
```

**Files to modify:**
- `src/graph/EntityExtractor.js`

**Specific changes:**
- Create `ONTOLOGICAL_VOCABULARY` constant (~20-30 terms)
- Create `RESULT_NOUN_EXCEPTIONS` list (medication, documentation, etc.)
- Reorder detection: suffixes BEFORE domain-specific root words
- Move `PROCESS_ROOT_WORDS` to be loaded from config (Phase 2)

#### 1.2 Implement Determiner-Sensitive Defaults

**Current:** No determiner analysis for ambiguous nominalizations

**Target:** Apply decision procedure from v3.1:
- Definite ("the X") → IC (entity)
- Indefinite ("some X") → Occurrent (process)
- "X of Y" complement → Occurrent (process)
- Bare noun → Occurrent (process)

**Files to modify:**
- `src/graph/EntityExtractor.js`

**Implementation:**
- Add `_analyzeNounPhraseContext(nounText, fullText)` method
- Extract determiner from noun phrase
- Check for "of Y" complement pattern
- Return context hints for disambiguation

#### 1.3 Expand Result Noun Exception List

**Current:** Basic list: `medication, documentation, location, organization, foundation, administration`

**Target:** Complete list based on v3.1 analysis:
- Result nouns (product): `medication, publication, construction, creation, invention, decoration, illustration`
- Result nouns (document): `documentation, registration, certification, specification, notification`

**Files to modify:**
- `src/graph/EntityExtractor.js`

### Acceptance Criteria - Phase 1

| ID | Criterion | Test |
|----|-----------|------|
| AC-1.1 | "palliative care" typed as `bfo:BFO_0000015` without medical config | Unit test |
| AC-1.2 | "consulting services" typed as `bfo:BFO_0000015` | Unit test |
| AC-1.3 | "instruction" typed as `bfo:BFO_0000015` (suffix detection) | Unit test |
| AC-1.4 | "medication" typed as `bfo:BFO_0000040` (result noun exception) | Unit test |
| AC-1.5 | "the organization" typed as IC (definite determiner) | Unit test |
| AC-1.6 | All 21 corpus scenarios still pass | Integration test |
| AC-1.7 | No CCO medical types in output without config loaded | Integration test |

---

## Phase 2: Configuration System

**Duration:** 1-2 sessions
**Goal:** Create loadable domain configuration system, move medical terms out of core code.

### Tasks

#### 2.1 Create Configuration Loader

**New file:** `src/graph/DomainConfigLoader.js`

**API:**
```javascript
class DomainConfigLoader {
  constructor()
  loadConfig(configPath)           // Load JSON config file
  loadConfigObject(configObj)      // Load config from object
  getTypeSpecialization(bfoType, term)  // Get domain-specific type
  getVerbOverride(verb, objectType)     // Get verb sense override
  isConfigLoaded()                 // Check if any config loaded
  getLoadedDomains()               // List loaded domain names
  clearConfigs()                   // Reset to BFO-only mode
}
```

**Config format (from v3.1):**
```json
{
  "domain": "medical",
  "version": "1.0",
  "typeSpecializations": {
    "bfo:BFO_0000015": {
      "care": "cco:ActOfCare",
      "surgery": "cco:ActOfSurgery"
    }
  },
  "verbOverrides": {
    "provide": {
      "objectIsOccurrent": "cco:ActOfCare",
      "objectIsContinuant": "cco:ActOfTransferOfPossession"
    }
  }
}
```

#### 2.2 Create Medical Domain Config File

**New file:** `config/medical.json`

**Content:** All medical terms currently in `PROCESS_ROOT_WORDS`:
- care → cco:ActOfCare
- treatment → cco:ActOfMedicalTreatment
- therapy → cco:ActOfMedicalTreatment
- surgery → cco:ActOfSurgery
- procedure → cco:ActOfMedicalProcedure
- examination → cco:ActOfExamination
- diagnosis → cco:ActOfDiagnosis
- rehabilitation → cco:ActOfRehabilitation
- resuscitation → cco:ActOfResuscitation

Also includes verb overrides for medical context.

#### 2.3 Integrate Config Loader into SemanticGraphBuilder

**Files to modify:**
- `src/graph/SemanticGraphBuilder.js`

**Changes:**
- Add `configLoader` property
- Add `loadDomainConfig(path)` method
- Pass config to EntityExtractor and ActExtractor
- Apply type specializations after BFO classification

#### 2.4 Remove Domain Terms from Core Code

**Files to modify:**
- `src/graph/EntityExtractor.js` - Remove medical-specific entries from `PROCESS_ROOT_WORDS`
- `src/graph/RealWorldEntityFactory.js` - Remove `PROCESS_TYPE_MAPPINGS` CCO entries

**Keep in core:**
- `bfo:BFO_0000015` (generic Process)
- Ontological vocabulary terms

### Acceptance Criteria - Phase 2

| ID | Criterion | Test |
|----|-----------|------|
| AC-2.1 | Parser produces BFO types with no config loaded | Unit test |
| AC-2.2 | `loadDomainConfig('config/medical.json')` succeeds | Unit test |
| AC-2.3 | After loading medical config, "care" → `cco:ActOfCare` | Unit test |
| AC-2.4 | Multiple configs can be loaded additively | Unit test |
| AC-2.5 | Conflicting configs emit warning, last wins | Unit test |
| AC-2.6 | `clearConfigs()` returns to BFO-only mode | Unit test |
| AC-2.7 | All corpus tests pass with medical config loaded | Integration test |
| AC-2.8 | Cross-domain tests pass without any config | Integration test |

---

## Phase 3: Selectional Restrictions (Two-Pass)

**Duration:** 1-2 sessions
**Goal:** Implement verb sense disambiguation based on direct object type.

### Tasks

#### 3.1 Modify ActExtractor to Accept Entity Context

**Current:** ActExtractor maps verbs to act types independently

**Target:** ActExtractor receives entity types and adjusts verb sense accordingly

**Files to modify:**
- `src/graph/ActExtractor.js`

**Changes:**
- Add `_getDirectObjectType(verbOffset, entities)` method
- Add `_applySelectionalRestrictions(verb, objectType, configLoader)` method
- Modify `_determineActType()` to use object type when available

#### 3.2 Implement Core Selectional Restrictions

**New constant in ActExtractor.js:**
```javascript
const SELECTIONAL_RESTRICTIONS = {
  'provide': {
    objectIsOccurrent: 'cco:ActOfService',
    objectIsContinuant: 'cco:ActOfTransferOfPossession',
    objectIsGDC: 'cco:ActOfCommunication',
    default: 'cco:IntentionalAct'  // Fallback
  },
  'give': {
    objectIsOccurrent: 'cco:ActOfCommunication',
    objectIsContinuant: 'cco:ActOfTransferOfPossession',
    default: 'cco:ActOfTransferOfPossession'
  },
  // ... other verbs from v3.1
};
```

#### 3.3 Modify SemanticGraphBuilder Pipeline

**Current:**
```
entities = entityExtractor.extract(text)
acts = actExtractor.extract(text, { entities })
// No feedback loop
```

**Target (Two-Pass):**
```
// Pass 1: Extract and type entities
entities = entityExtractor.extract(text)

// Pass 2: Extract acts with entity context
acts = actExtractor.extract(text, {
  entities,
  configLoader: this.configLoader
})

// Acts can now use entity types for verb sense disambiguation
```

#### 3.4 Add Fallback for Unmapped Combinations

When verb+object combination isn't in restrictions:
1. Use verb's `default` sense if defined
2. Fall back to `cco:IntentionalAct`
3. Log warning for analysis

### Acceptance Criteria - Phase 3

| ID | Criterion | Test |
|----|-----------|------|
| AC-3.1 | "provide care" → `cco:ActOfService` (not Transfer) | Unit test |
| AC-3.2 | "provide medication" → `cco:ActOfTransferOfPossession` | Unit test |
| AC-3.3 | "give advice" → `cco:ActOfCommunication` | Unit test |
| AC-3.4 | Unmapped verb+object uses fallback with warning | Unit test |
| AC-3.5 | Config can override selectional restrictions | Unit test |
| AC-3.6 | All corpus tests still pass | Integration test |
| AC-3.7 | Parse time remains <300ms | Performance test |

---

## Phase 4: Cross-Domain Validation

**Duration:** 1 session
**Goal:** Verify domain-neutral behavior with non-medical test cases.

### Tasks

#### 4.1 Create Cross-Domain Test Corpus

**New file:** `tests/integration/test-cross-domain.js`

**Test cases from v3.1:**
- "The company provides consulting" (Business)
- "The teacher provides instruction" (Education)
- "The contractor provides maintenance" (Construction)
- "The government provides assistance" (Policy)

All should produce `bfo:BFO_0000015` without any config loaded.

#### 4.2 Create Legal Domain Config (Optional)

**New file:** `config/legal.json`

Demonstrates extensibility:
- "hearing" → legal:LegalHearing
- "trial" → legal:LegalTrial
- "verdict" → legal:LegalVerdict

#### 4.3 Verify No Medical Types Leak Without Config

Audit all output to ensure:
- No `cco:ActOfCare` appears without medical config
- No `cco:ActOfMedicalTreatment` appears without medical config
- Only BFO types and generic CCO types in default mode

### Acceptance Criteria - Phase 4

| ID | Criterion | Test |
|----|-----------|------|
| AC-4.1 | All 4 cross-domain test cases produce `bfo:BFO_0000015` | Unit test |
| AC-4.2 | Legal config loads and specializes legal terms | Unit test |
| AC-4.3 | No CCO medical types in any output without medical config | Audit |
| AC-4.4 | Medical config + legal config can coexist | Unit test |

---

## Phase 5: Iterative Refinement (Conditional)

**Duration:** 1-2 sessions
**Trigger:** >10% of test cases require manual override OR 3+ verb sense failures reported
**Goal:** Replace two-pass with iterative constraint propagation

### Tasks (Only if triggered)

#### 5.1 Implement Constraint Propagation Loop

```javascript
function extractWithConstraints(text, maxIterations = 3) {
  let entities = entityExtractor.extract(text);
  let acts = actExtractor.extract(text, { entities });

  for (let i = 0; i < maxIterations; i++) {
    const entityConstraints = deriveEntityConstraints(acts);
    const actConstraints = deriveActConstraints(entities);

    const newEntities = applyConstraints(entities, entityConstraints);
    const newActs = applyConstraints(acts, actConstraints);

    if (isStable(entities, newEntities) && isStable(acts, newActs)) {
      break; // Converged
    }

    entities = newEntities;
    acts = newActs;
  }

  return { entities, acts };
}
```

#### 5.2 Define Constraint Functions

- `deriveEntityConstraints(acts)`: If verb requires Occurrent object, constrain entity
- `deriveActConstraints(entities)`: If object is Occurrent, constrain verb sense

### Acceptance Criteria - Phase 5

| ID | Criterion | Test |
|----|-----------|------|
| AC-5.1 | Iterative loop converges within 3 iterations | Unit test |
| AC-5.2 | Edge cases that failed two-pass now pass | Regression test |
| AC-5.3 | Parse time remains <300ms | Performance test |

---

## Implementation Schedule

| Phase | Dependency | Est. Sessions | Priority |
|-------|------------|---------------|----------|
| Phase 1 | None | 1-2 | **HIGH** - Removes domain coupling |
| Phase 2 | Phase 1 | 1-2 | **HIGH** - Enables extensibility |
| Phase 3 | Phase 2 | 1-2 | **MEDIUM** - Fixes verb disambiguation |
| Phase 4 | Phase 3 | 1 | **MEDIUM** - Validates architecture |
| Phase 5 | Phase 3 + trigger | 1-2 | **LOW** - Only if needed |

---

## Technical Debt Resolution

This plan addresses the following technical debt items from v3.1:

| TD-ID | Issue | Resolution Phase |
|-------|-------|------------------|
| TD-001 | `PROCESS_ROOT_WORDS` contains medical terms | Phase 2.4 |
| TD-002 | `PROCESS_TYPE_MAPPINGS` hardcodes CCO | Phase 2.4 |
| TD-003 | No configuration loading system | Phase 2.1 |
| TD-004 | ActExtractor lacks selectional restrictions | Phase 3.1-3.2 |
| TD-005 | No ambiguous nominalization handling | Phase 1.2 |
| TD-006 | Result noun exception list incomplete | Phase 1.3 |
| TD-007 | No fallback for unmapped verb+object | Phase 3.4 |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing corpus tests | Run full test suite after each phase |
| Performance regression | Performance test in each phase (target: <300ms) |
| Over-engineering | Phase 5 only if triggered by actual failures |
| Config file management complexity | Start with single medical.json, expand as needed |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Domain-neutral default output | 100% BFO types | Integration test audit |
| Corpus test pass rate | 100% | Automated test suite |
| Cross-domain test pass rate | 100% | New test suite |
| Parse time | <300ms | Performance benchmark |
| Config loading time | <50ms | Performance benchmark |

---

## Appendix: File Change Summary

### New Files
- `src/graph/DomainConfigLoader.js`
- `config/medical.json`
- `config/legal.json` (optional)
- `tests/integration/test-cross-domain.js`
- `tests/unit/test-domain-config.js`
- `tests/unit/test-selectional-restrictions.js`

### Modified Files
- `src/graph/EntityExtractor.js` (Phase 1, 2)
- `src/graph/RealWorldEntityFactory.js` (Phase 2)
- `src/graph/ActExtractor.js` (Phase 3)
- `src/graph/SemanticGraphBuilder.js` (Phase 2, 3)

### Deleted/Deprecated
- Medical terms removed from `PROCESS_ROOT_WORDS` (moved to config)
- CCO entries removed from `PROCESS_TYPE_MAPPINGS` (moved to config)
