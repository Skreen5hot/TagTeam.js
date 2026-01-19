# Ontological Issues Identified in Expert Review

**Date:** 2026-01-19
**Last Updated:** 2026-01-19 (v3.1 - final refinements before implementation)
**Input:** "The nurse provides palliative care to the patient."
**Status:** Implementation-ready with documented limitations

---

## The Core Problem: BFO Upper Category Classification

The fundamental issue is a **hard NLP problem**: the parser cannot reliably classify noun phrases into BFO upper categories. This is more nuanced than a binary split.

### Full BFO Upper Category Set

| BFO Category | Code | Definition | Examples |
|--------------|------|------------|----------|
| **Independent Continuant** | IC | Physical entities that persist | Person, Artifact, Organism |
| **Generically Dependent Continuant** | GDC | Information that can be copied | Document, Plan, Software |
| **Specifically Dependent Continuant** | SDC | Qualities/roles bound to bearers | Role, Quality, Disposition |
| **Occurrent** | OCC | Things that unfold in time | Process, Event, Act |

The binary "Continuant vs Occurrent" framing is insufficient. The parser must distinguish at least these four categories, as they have different ontological implications (e.g., GDC entities can be `about` things, SDC entities must `inhere_in` bearers).

**Note on SDC:** Specifically Dependent Continuants (Roles, Qualities) are handled by `RoleDetector.js` based on semantic role labeling, not by noun phrase morphology. The EntityExtractor focuses on IC, GDC, and Occurrent classification.

This distinction is language-independent and domain-independent. The parser should solve it at the BFO level first, then optionally specialize to domain ontologies.

---

## Issue 1: Category Error - Palliative Care as Artifact

### The Problem

The current system typed "palliative care" as `cco:Artifact`:

```json
{
  "@id": "inst:Artifact_Palliative_Care_a39d1a05acbd",
  "@type": ["cco:Artifact", "owl:NamedIndividual"],
  "rdfs:label": "palliative care"
}
```

### Why This Is Wrong

"Palliative care" is **NOT** a physical object. It's a **process** that unfolds over time. An Artifact is defined as a "man-made object" (like a ventilator, syringe, or medication).

### Current Code Path

1. `EntityExtractor._determineEntityType()` checks `ENTITY_TYPE_MAPPINGS`
2. "palliative care" doesn't match any keyword (doctor, nurse, ventilator, etc.)
3. Falls through to `_default: 'bfo:BFO_0000040'` (Material Entity)
4. `RealWorldEntityFactory._determineTier2Type()` maps `bfo:BFO_0000040` → `cco:Artifact`

### Correct Typing (Domain-Neutral First)

The parser should determine the **upper ontology category first**:

```
1. Determine BFO category: "palliative care" → Occurrent (Process)
2. Default output: bfo:BFO_0000015 (Process)
3. If medical domain config loaded: specialize to cco:ActOfCare
```

| Input | Default (No Config) | With Medical Config |
|-------|---------------------|---------------------|
| "palliative care" | `bfo:BFO_0000015` | `cco:ActOfCare` |
| "consulting services" | `bfo:BFO_0000015` | (no mapping → stays Process) |

---

## Issue 2: Verb Sense Disambiguation (General Problem)

### The Problem

The system mapped "provides" to `cco:ActOfTransferOfPossession`:

```json
{
  "@id": "inst:Provide_IntentionalAct_108a9bb43357",
  "@type": ["cco:ActOfTransferOfPossession", "owl:NamedIndividual"]
}
```

### Why This Is a General Problem

This is NOT specific to "provide". Many verbs have **selectional restrictions** that determine their semantic type based on argument type. The binary Continuant/Occurrent split is insufficient:

| Verb | With Artifact | With Process | With Information | With Location |
|------|---------------|--------------|------------------|---------------|
| **provide** | medication → Transfer | care → Service | data → Communication | access → Granting |
| **give** | gift → Transfer | support → Service | advice → Communication | — |
| **offer** | product → Transfer | assistance → Service | opinion → Communication | — |
| **deliver** | package → Transfer | performance → Performance | speech → Communication | — |
| **run** | machine → Operation | program → Execution | report → Production | — |

Selectional restrictions may need finer-grained categories than Continuant vs Occurrent:
- **Artifact** (physical object)
- **Process** (service, activity)
- **Information Content** (data, advice, speech)
- **Location/Access** (spatial or permission-based)
- **Person** (recipient vs patient)

**Note:** The selectional restriction table is **illustrative, not exhaustive**. Examples like "run a company" (Management), "run a risk" (Engagement) show the table will grow unboundedly. The implementation must have a **fallback** when verb+object combinations aren't explicitly mapped—default to the verb's most common sense or flag for review.

### Current Code Path

```javascript
// ActExtractor.js - static verb mapping
VERB_TO_CCO_MAPPINGS = {
  'provide': 'cco:ActOfTransferOfPossession', // ignores argument type
}
```

### Correct Approach: Selectional Restrictions

The architecture should support **verb sense disambiguation based on argument type**:

```javascript
// Pseudocode for general mechanism
const selectionalRestrictions = {
  'provide': {
    objectIsOccurrent: 'cco:ActOfService',
    objectIsContinuant: 'cco:ActOfTransferOfPossession'
  },
  'give': {
    objectIsOccurrent: 'cco:ActOfCommunication',
    objectIsContinuant: 'cco:ActOfTransferOfPossession'
  }
};
```

This requires **coordination between entity typing and act typing** - the direct object's type constrains the verb's interpretation.

---

## Proposed Solutions (Revised Priority)

### Solution B: Linguistic Patterns (PRIMARY - Domain Neutral)

**Approach:** Use morphological and syntactic cues that work across all domains.

**Key Heuristic: Nominalization Suffixes**

Deverbal nouns (nouns derived from verbs) often denote processes:

| Suffix | Examples | Derived From |
|--------|----------|--------------|
| -tion | treatment, rehabilitation, instruction | treat, rehabilitate, instruct |
| -ment | treatment, assessment, management | treat, assess, manage |
| -sis | diagnosis, analysis, synthesis | diagnose, analyze, synthesize |
| -ance/-ence | assistance, maintenance, reference | assist, maintain, refer |
| -ure | procedure, exposure, closure | proceed, expose, close |
| -ing | counseling, training, processing | counsel, train, process |

**The Result Noun Problem Is Significant (Not a Small Exception List)**

The document previously understated this. The result/process distinction affects roughly 30-40% of -tion nominalizations:

| Category | Examples | BFO Type |
|----------|----------|----------|
| **Process nouns** | treatment, rehabilitation, instruction, consultation, investigation | Occurrent |
| **Result nouns** (product) | medication, publication, construction (building), creation, invention, decoration | IC (Artifact) |
| **Result nouns** (document) | documentation, registration (the form), certification, specification | GDC |
| **Ambiguous** | organization, construction, administration, production, registration | Context-dependent |

**Handling Ambiguous Nominalizations:**

When context is insufficient, apply this **determiner-sensitive** decision procedure:

| Determiner Pattern | Default Reading | Rationale |
|--------------------|-----------------|-----------|
| Definite ("the X") | **IC (entity)** | "The administration announced..." → the body |
| Indefinite ("some X", "any X") | **Occurrent (process)** | "Some administration is required" → the act |
| "X of Y" complement | **Occurrent (process)** | "Organization of files" → the act of organizing |
| Bare noun | **Occurrent (process)** | "Administration takes time" → the act |

Decision procedure:
1. Check for syntactic cues: "of Y" complement → process reading
2. Check determiner: definite → entity, indefinite/bare → process
3. Allow override via explicit indicators ("the new construction" → artifact, "physical documentation" → artifact)

**Note:** The "X of Y" test case requires syntactic context at classification time. If unavailable, this pattern cannot be applied.

**Pros:**
- Works across ALL domains without configuration
- Linguistically principled
- Catches novel terms automatically

**Cons:**
- Ambiguous cases require syntactic analysis or default + override
- ~30-40% of -tion words need careful handling

### Solution C: Selectional Restrictions (PRIMARY - General Mechanism)

**Approach:** Verbs constrain argument types; argument types constrain verb sense.

This is how human interpretation works - "provide care" and "provide medication" are disambiguated by the object, not the verb alone.

**Architecture Change Required:**

Current (isolated extractors):
```
Text → EntityExtractor → ActExtractor → Graph
         (isolated)        (isolated)
```

Required (constraint propagation):
```
Text → Joint Extraction → Consistency Resolution → Graph
       (entities + acts)   (mutual constraints)
```

**Pipeline Coordination Strategy Options:**

| Approach | Description | Complexity | Recommended |
|----------|-------------|------------|-------------|
| **Iterative refinement** | Extract → type → re-check constraints → re-type → iterate until stable | Medium | **Yes (Phase 5)** |
| **Probabilistic joint model** | Score all consistent type assignments simultaneously | High | No (overkill) |
| **Constraint satisfaction** | Define hard constraints, use solver | High | No (overkill) |
| **Two-pass with override** | Entity types inform act types; act constraints can override entity types | Low | **Yes (immediate)** |

**Recommended approach:** Start with two-pass override (simple), migrate to iterative refinement when edge cases accumulate.

**Migration threshold:** Migrate to iterative refinement when >10% of test cases require manual override due to entity-act type conflicts, or when 3+ distinct verb sense disambiguation failures are reported.

**Pros:**
- Linguistically correct
- Handles polysemous verbs properly
- Works across domains

**Cons:**
- Requires pipeline refactoring
- Two-pass adds latency (acceptable for <300ms target)

### Solution D: Configurable Domain Mappings (FOUNDATION - Separation of Concerns)

**Approach:** Core parser produces BFO-typed output; domain configs specialize types.

```json
// config/medical.json
{
  "domain": "medical",
  "typeSpecializations": {
    "bfo:BFO_0000015": {  // Process
      "care": "cco:ActOfCare",
      "treatment": "cco:ActOfMedicalTreatment",
      "surgery": "cco:ActOfSurgery"
    }
  }
}
```

**Key Principle:** The parser WITHOUT any configuration should produce valid BFO-typed output. Domain-specific types are optional specializations.

**Pros:**
- Clean separation of concerns
- Extensible to any domain
- Core parser stays domain-neutral

**Cons:**
- Requires configuration management
- Users must load appropriate configs

### Solution A: Keyword Lists (RESTRICTED - Distinguish Ontological vs Domain)

**The "Never in Core" stance is too strong.** We must distinguish:

| Keyword Type | Examples | Acceptable in Core? |
|--------------|----------|---------------------|
| **Ontological vocabulary** | "process", "event", "person", "thing", "object" | **Yes** - these directly name BFO categories |
| **Domain terms** | "care", "therapy", "surgery", "palliative" | **No** - these are medical-specific |

**Acceptable Core Keywords (~20-30 terms):**

```javascript
// These are English words for BFO categories - domain-neutral
const ONTOLOGICAL_VOCABULARY = {
  // Occurrents
  'process': 'bfo:BFO_0000015',
  'event': 'bfo:BFO_0000015',
  'activity': 'bfo:BFO_0000015',
  'action': 'bfo:BFO_0000015',

  // Independent Continuants
  'person': 'cco:Person',
  'people': 'cco:Person',
  'human': 'cco:Person',
  'thing': 'bfo:BFO_0000040',
  'object': 'bfo:BFO_0000040',
  'item': 'bfo:BFO_0000040',

  // GDC
  'document': 'bfo:BFO_0000031',
  'information': 'bfo:BFO_0000031',
  'data': 'bfo:BFO_0000031',
  'plan': 'bfo:BFO_0000031'
};
```

**Current Implementation Risk:**

```javascript
// This couples the parser to medical domain - MOVE TO CONFIG
const PROCESS_ROOT_WORDS = {
  'care': 'cco:ActOfCare',        // Domain-specific
  'therapy': 'cco:ActOfMedicalTreatment',  // Domain-specific
  'surgery': 'cco:ActOfSurgery'   // Domain-specific
};
```

**Rule:** Domain terms belong in loadable configuration files, not core parser code.

---

## Revised Recommended Approach

### Priority Ranking (Domain-Neutral First)

| Priority | Solution | Generalizability | When to Implement |
|----------|----------|------------------|-------------------|
| **1** | B: Linguistic patterns | High (language-level) | **Now** - primary detection |
| **2** | C: Selectional restrictions | High (general semantics) | **Now** - verb disambiguation |
| **3** | D: Configurable mappings | High (separation of concerns) | **Foundation** - architecture |
| **4** | A: Keyword lists | Low (domain-coupled) | **Never in core** - config only |

### Architectural Implications

1. **Separate upper ontology classification from domain specialization**
   - Core parser → BFO types (`bfo:BFO_0000015` for processes)
   - Domain config → CCO specializations (`cco:ActOfCare`)

2. **Entity-Act coordination is necessary, not a bug**
   - The object's type SHOULD constrain the verb's interpretation
   - Design pipeline to support mutual constraints

3. **Test cases should be domain-neutral**
   - Expect BFO types by default
   - Domain-specific types only when config loaded

---

## Pattern Precedence Rules

When multiple patterns apply to the same noun phrase, conflicts must be resolved.

**Example:** "The nurse provides careful medication administration."

- "medication" — result noun → IC (Artifact)
- "administration" — -tion suffix → Occurrent (Process)
- "medication administration" as compound — Occurrent (administering medication)

### Precedence Order (Highest to Lowest)

| Priority | Pattern | Rationale |
|----------|---------|-----------|
| 1 | **Verb selectional restrictions** | Verb constrains object type |
| 2 | **Compound noun as unit** | "medication administration" > "medication" + "administration" |
| 3 | **Head noun morphology** | Head noun (last word in English) determines category |
| 4 | **Modifier constraints** | Adjectives/determiners can override ("physical documentation") |
| 5 | **Suffix heuristics** | Applied to head noun only |
| 6 | **Ontological vocabulary match** | Direct BFO term match |
| 7 | **Default** | Fall through to `bfo:BFO_0000040` (Material Entity) |

**Application to example:**
1. Verb "provides" + object type → if object is Occurrent, act = Service
2. "medication administration" is compound → treat as unit
3. Head noun "administration" → -tion suffix → Occurrent
4. Result: `bfo:BFO_0000015` (Process), not Artifact

---

## Configuration Semantics

### Loading Multiple Configs

**Q: Can multiple domain configs be loaded simultaneously?**

Yes, configs are **additive by default**:

```javascript
parser.loadConfig('medical.json');  // Adds medical specializations
parser.loadConfig('legal.json');    // Adds legal specializations
// Both active
```

### Conflict Resolution

**Q: What happens when configs conflict?**

| Conflict Type | Resolution |
|---------------|------------|
| Same term, different specializations | **Last loaded wins** (with warning) |
| Same term, same specialization | No conflict (idempotent) |
| Specialization vs base type | Specialization wins |

**Example conflict:**
```json
// medical.json
{ "treatment": "cco:ActOfMedicalTreatment" }

// legal.json
{ "treatment": "legal:ActOfLegalRemedy" }
```

If both loaded, last wins. Parser should emit warning.

### Config Selection

**Q: How does the parser know which config to load?**

| Mode | Behavior |
|------|----------|
| **Explicit** | User calls `parser.loadConfig('medical.json')` |
| **Auto-detect** | NOT SUPPORTED (too error-prone) |
| **Default** | No config loaded → BFO types only |

Auto-detection (guessing domain from text) is explicitly out of scope. Users must explicitly load domain configs.

### Config Format

```json
{
  "domain": "medical",
  "version": "1.0",
  "typeSpecializations": {
    "bfo:BFO_0000015": {
      "care": "cco:ActOfCare",
      "surgery": "cco:ActOfSurgery"
    },
    "bfo:BFO_0000040": {
      "ventilator": "cco:MedicalDevice"
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

---

## Current Status

### Partial Fixes Applied (Need Review)

Changes made to:
- `src/graph/EntityExtractor.js` - Added `PROCESS_ROOT_WORDS` and suffix detection
- `src/graph/RealWorldEntityFactory.js` - Added `PROCESS_TYPE_MAPPINGS`

**WARNING:** These fixes embed medical-domain terms in core parser code, which contradicts the domain-neutral goal. They should be:
1. Reviewed for domain coupling
2. Refactored to use linguistic patterns (Solution B) as primary mechanism
3. Domain-specific terms moved to configuration files

### What Should Change

1. **Primary detection:** Nominalization suffix analysis (domain-neutral)
2. **Exception list:** Small list of result nouns that look like processes but aren't
3. **Domain configs:** Medical terms like `cco:ActOfCare` should be in loadable config, not core code

---

## Test Cases (Domain-Neutral)

### Default Behavior (No Domain Config)

| Input | Expected Upper Type | Reasoning |
|-------|---------------------|-----------|
| "palliative care" | `bfo:BFO_0000015` (Occurrent) | "care" is process noun |
| "consulting services" | `bfo:BFO_0000015` (Occurrent) | "services" is process noun |
| "instruction" | `bfo:BFO_0000015` (Occurrent) | -tion suffix, deverbal (process reading) |
| "maintenance" | `bfo:BFO_0000015` (Occurrent) | -ance suffix, deverbal |
| "medication" | `bfo:BFO_0000040` (IC) | result noun exception list |
| "documentation" | `bfo:BFO_0000031` (GDC) | result noun producing document |
| "the organization" | `bfo:BFO_0000027` (IC) | definite determiner → entity reading |
| "organization of files" | `bfo:BFO_0000015` (Occurrent) | "of X" complement → process reading **(requires syntactic context)** |
| "ventilator" | `bfo:BFO_0000040` (IC) | known artifact (from ontological vocabulary or context) |
| "regulator" | `bfo:BFO_0000040` (IC) **with warning** | Ambiguous agent/instrument noun - defaults to artifact but may be person/org. Known limitation. |

**Note on -or/-er suffixes:** These indicate agent or instrument but do NOT reliably determine BFO category. "Doctor" (person), "ventilator" (artifact), "regulator" (ambiguous) all end in -or but have different types. Do not use suffix alone for classification.

### With Medical Domain Config Loaded

| Input | Expected Specialized Type |
|-------|---------------------------|
| "palliative care" | `cco:ActOfCare` |
| "surgery" | `cco:ActOfSurgery` |
| "rehabilitation" | `cco:ActOfRehabilitation` |

### Cross-Domain Test Cases

| Input | Domain | Expected Type |
|-------|--------|---------------|
| "The company provides consulting" | Business | `bfo:BFO_0000015` |
| "The teacher provides instruction" | Education | `bfo:BFO_0000015` |
| "The contractor provides maintenance" | Construction | `bfo:BFO_0000015` |
| "The government provides assistance" | Policy | `bfo:BFO_0000015` |

These should ALL work without domain-specific configuration.

---

## Risk Assessment

**Current Risk:** The parser is being designed for medical text while claiming to be general. Shipping with `PROCESS_ROOT_WORDS = {care, therapy, surgery}` in core code will:
- Work well for medical domain
- Fail or behave inconsistently for legal, financial, policy domains
- Require core code changes for each new domain

**Mitigation:** Prioritize linguistic patterns over keyword lists. Domain-specific mappings belong in configuration, not code.

---

---

## Technical Debt Tracking

This section tracks known issues to be addressed incrementally.

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| TD-001 | `PROCESS_ROOT_WORDS` in EntityExtractor.js contains medical-specific terms | High | **Documented** - move to config |
| TD-002 | `PROCESS_TYPE_MAPPINGS` in RealWorldEntityFactory.js hardcodes CCO types | High | **Documented** - move to config |
| TD-003 | No configuration loading system exists | Medium | **Not started** |
| TD-004 | ActExtractor doesn't use selectional restrictions | Medium | **Not started** |
| TD-005 | No handling of ambiguous nominalizations (organization, construction) | Low | **Not started** |
| TD-006 | Result noun exception list is incomplete | Low | **Partial** - basic list exists |

**Policy:** Technical debt is paid incrementally as we encounter issues. Each fix should move toward domain-neutrality, not add more domain-specific code.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1 | 2026-01-19 | Initial analysis, medical-focused solutions |
| v2 | 2026-01-19 | Reframed for domain neutrality, revised priorities |
| v3 | 2026-01-19 | Added: pattern precedence, config semantics, expanded BFO categories, result noun analysis, pipeline coordination strategy, -or suffix correction, technical debt tracking |
| v3.1 | 2026-01-19 | Final refinements: SDC note, determiner-sensitive defaults, selectional restriction fallback, migration threshold, JSON fix, ambiguous noun handling |

---

## References

- BFO 2020 Specification: https://basic-formal-ontology.org/
- CCO Medical Ontologies: https://github.com/CommonCoreOntology/CommonCoreOntologies
- Expert Review Transcript: 2026-01-19 session
- Domain Neutrality Critique: 2026-01-19 architectural review
- Implementation Feasibility Review: 2026-01-19
