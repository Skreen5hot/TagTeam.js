# TagTeam.js Roadmap: Deterministic Semantic Understanding

**Strategy**: Implement a **Process-Grounded (Fandaws)** architecture to provide deterministic semantic understanding for the **Integral Ethics Engine (IEE)**.

This roadmap moves TagTeam from a POS-tagger to a Semantic Graph Generator. It replaces brittle keyword matching with structural "Process-Participant-Role" modeling.

---

## Phase 1: The Process-Aware Parser (Core Architecture)
**Goal**: Move from "Strings" to "Structures". Treat verbs as **Processes** and nouns as **Participants** (Agents/Patients).
**IEE Alignment**: [Integration Point 1: Scenario Parsing]

### 1.1 Define Core Data Structures (The Ontology)
- [ ] Create `SemanticNode` base class (Immutable, Hashable).
- [ ] Create `Process` class (extends Node, holds temporal/modal properties).
- [ ] Create `Entity` class (extends Node, holds inherent properties).
- [ ] Create `Role` enum/class (Agent, Patient, Instrument, Theme).

### 1.2 Implement Semantic Action Extraction
- [ ] **Task**: Implement `parseSemanticAction(description)`.
- [ ] **Logic**:
    1.  Identify the root verb (Process).
    2.  Identify the subject (Agent) and object (Patient).
    3.  **Extract Linguistic Features**: Tense, Aspect, Modality (must/should/can).
    4.  Map specific verbs to **Semantic Frames** (e.g., `decide` → `DecisionProcess`).
- [ ] **Task**: Define Finite Semantic Frame Ontology (approx. 50 frames) covering IEE needs (e.g., `decision_making`, `causing_harm`).
- [ ] **Fandaws Principle**: Do not create an edge `(Family) --[decides]--> (Treatment)`. Create a node `DecisionProcess` with edges `has_agent(Family)` and `has_theme(Treatment)`.

### ✅ Phase 1 Acceptance Criteria
- **Input**: "The family must decide whether to continue aggressive treatment."
- **Output**:
  ```json
  {
    "process": "DecisionProcess",
    "modality": "must",
    "participants": [
      { "role": "Agent", "entity": "family" },
      { "role": "Theme", "entity": "treatment", "modifier": "aggressive" }
    ]
  }
  ```
- **Metric**: >90% accuracy on identifying Agent vs. Patient in IEE Test Scenarios 1 & 2.

---

## Phase 2: Concept Canonicalization & Value Matching
**Goal**: Move from "Keywords" to "Concepts". Enable semantic distance calculations without external ML embeddings.
**IEE Alignment**: [Integration Point 2: Semantic Value Matching]

### 2.1 The Concept Registry (Lexical Grounding)
- [ ] **Task**: Build a lightweight, deterministic `ConceptRegistry`.
- [ ] **Task**: Implement `loadValueDefinitions(json)` to ingest IEE value schemas.
- [ ] **Logic**:
    -   Map synonyms/hyponyms to canonical IDs (e.g., "cancer", "tumor", "malignancy" → `CONCEPT_DISEASE`).
    -   Support "Is-A" hierarchies for distance calculation.

### 2.2 Semantic Relevance Engine
- [ ] **Task**: Implement `computeSemanticRelevance(scenario, valueDef)`.
- [ ] **Logic**:
    -   Traverse the graph generated in Phase 1.
    -   Calculate distance: `Steps(ScenarioNode → ValueConcept)`.
    -   **Fandaws Principle**: Use "Stopping Rules". If a `MedicalProcess` is detected, automatically infer relevance to `PhysicalWellbeing` without needing 50 keywords.

### ✅ Phase 2 Acceptance Criteria
- **Input**: Scenario containing "terminal cancer".
- **Query**: Is `physical_wellbeing` relevant?
- **Output**: `true` (Confidence > 0.9).
- **Negative Test**: Querying `aesthetic_beauty` returns `false`.
- **Metric**: Match values with >0.75 accuracy vs. manual annotation on IEE corpus.

---

## Phase 3: Logic, Negation & Context Intensity
**Goal**: Move from "Binary Flags" to "Nuanced Understanding". Handle the "Not" and the "How Much".
**IEE Alignment**: [Integration Points 3 & 4]

### 3.1 Deterministic Negation Detection
- [ ] **Task**: Implement `detectNegation(parsedAction, fullText)`.
- [ ] **Logic**:
    -   Scope detection: Does "not" apply to the Verb (Process) or the Adjective (Modifier)?
    -   "Decided not to harm" → `DecisionProcess(Goal: Avoidance(Harm))`.
    -   "Not a good decision" → Negated Property.

### 3.2 Context Intensity Analyzer
- [ ] **Task**: Implement `analyzeContextIntensity(parsedScenario)`.
- [ ] **Logic**:
    -   Map Process types to IEE dimensions (`physicalImpact`, `emotionalImpact`, `moralConflict`, `autonomyStake`).
    -   Assign "Intensity Weights" to specific Process types (e.g., `DyingProcess` = 1.0, `InjuringProcess` = 0.7).
    -   Aggregate weights across the graph.

### ✅ Phase 3 Acceptance Criteria
- **Input**: "The family decided NOT to continue treatment."
- **Output**:
  ```json
  {
    "negation": { "present": true, "scope": "continue treatment" },
    "intensity": { "physicalImpact": 0.95 }
  }
  ```
- **Metric**: Correctly distinguish "harm" vs "no harm" in >85% of test cases.

---

## Phase 4: Optimization & IEE Adapter
**Goal**: Production readiness. Zero dependencies. High speed.

### 4.1 Performance Tuning
- [ ] Ensure graph traversal is non-recursive or tail-recursive to prevent stack overflow.
- [ ] Optimize `ConceptRegistry` lookups (O(1) hash maps).
- [ ] **Constraint**: Bundle size < 200KB.

### 4.2 IEE Adapter Layer
- [ ] **Task**: Create `iee-adapter.js`.
- [ ] **Logic**: Map TagTeam internal Graph objects to the specific JSON format required by IEE `moralReasoner.js`.
- [ ] **Task**: Implement Ambiguity Handling (return top confidence parse + flag for low confidence).

### ✅ Phase 4 Acceptance Criteria
- **Performance**: <50ms per scenario parse.
- **Determinism**: 100% reproducible outputs for identical inputs.
- **Integration**: Drop-in replacement for `scenarioParser.js` passes all IEE unit tests.

---

## Summary of Architectural Shift

| Feature | Old Approach (IEE Current) | New Approach (TagTeam Fandaws) |
| :--- | :--- | :--- |
| **Action Detection** | Regex for "decide", "kill" | `Process` extraction (Subject-Verb-Object) |
| **Relationships** | Flattened (implicit) | Graph (Explicit Participants & Roles) |
| **Value Matching** | 300+ Manual Keywords | Semantic Distance via Concept Registry |
| **Negation** | Ignored | Scoped Logic (Process Modification) |
| **Philosophy** | Pattern Matching | **Process-Grounded Realism** |
```

<!--
[PROMPT_SUGGESTION]Can you generate the code for the `SemanticNode` and `Process` classes in JavaScript, ensuring they support the Fandaws requirement of immutable IDs?[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]How should I implement the `ConceptRegistry` to handle synonyms efficiently without bloating the bundle size?[/PROMPT_SUGGESTION]
