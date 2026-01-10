# TagTeam.js Roadmap: Deterministic Semantic Understanding

**Version:** 1.1 (Updated Jan 10, 2026)
**Philosophy:** d3.js-inspired single-file semantic parser
**Strategy:** Process-Grounded (Fandaws) architecture for the **Integral Ethics Engine (IEE)**

This roadmap moves TagTeam from a multi-file POS-tagger to a **single-file semantic parser** that replaces brittle keyword matching with structural "Process-Participant-Role" modeling.

---

## Distribution Philosophy: The d3.js Model

**Goal:** Make TagTeam.js as shareable as d3.js and mermaid.js

### Core Principles
1. **Single file drop-in** - `<script src="tagteam.js"></script>` just works
2. **Zero dependencies** - No npm, no build tools, pure JavaScript
3. **Simple API** - `TagTeam.parse(text)` returns semantic structure
4. **Maximum shareability** - CodePen, JSFiddle, Observable, GitHub Pages
5. **Browser-native** - Runs anywhere JavaScript runs

### Roadmap Implications
- All phases deliver **single-file bundles** (`tagteam.js`)
- API stays simple: `TagTeam.parse()` is primary interface
- Extensibility through configuration, not code changes
- Minification for production (`tagteam.min.js`)
- Documentation includes CDN and npm distribution

---

## Phase 0: Single-File Bundle Creation (Week 1.5)

**Goal:** Package existing implementation into d3.js-style single file
**Status:** Planned (Post Week 1 Validation)

### 0.1 Bundle Architecture
- [ ] **Task**: Create `dist/tagteam.js` - full bundle
- [ ] **Contents**:
  ```javascript
  (function(global) {
    'use strict';

    // 1. LEXICON (4.2MB)
    const LEXICON_DATA = { /* ... */ };

    // 2. POS TAGGER (~4KB)
    class POSTagger { /* ... */ }

    // 3. SEMANTIC EXTRACTOR (~32KB)
    class SemanticRoleExtractor { /* ... */ }

    // 4. UNIFIED API (~2KB)
    const TagTeam = {
      parse: function(text, options) { /* ... */ },
      parseMany: function(texts) { /* ... */ },
      loadValueDefinitions: function(json) { /* ... */ },
      version: '1.0.0'
    };

    // Export
    global.TagTeam = TagTeam;
  })(typeof window !== 'undefined' ? window : this);
  ```

### 0.2 Build Script
- [ ] **Task**: Create `build.js` (Node.js script)
- [ ] **Logic**:
  1. Read `src/lexicon.js`, `src/POSTagger.js`, `src/SemanticRoleExtractor.js`
  2. Wrap in IIFE (Immediately Invoked Function Expression)
  3. Add unified API layer
  4. Write to `dist/tagteam.js`
  5. Minify to `dist/tagteam.min.js`

### 0.3 API Unification
- [ ] **Task**: Design simple API surface
- [ ] **Current**: `new SemanticRoleExtractor().parseSemanticAction(text)`
- [ ] **New**: `TagTeam.parse(text)`
- [ ] **Backward Compatibility**: Keep class exports for advanced users

### 0.4 Documentation & Examples
- [ ] **Task**: Update README with single-file usage
- [ ] **Task**: Create CodePen demo
- [ ] **Task**: Create NPM package.json
- [ ] **Task**: Setup CDN distribution (jsDelivr/unpkg)

### ✅ Phase 0 Acceptance Criteria
- Single command: `node build.js` produces `dist/tagteam.js`
- Drop `<script src="tagteam.js"></script>` into HTML, works immediately
- `TagTeam.parse("I love coding")` returns semantic structure
- File size: ~4.2MB (full), ~2.0MB (minified)
- Works in: Chrome, Firefox, Safari, Edge (no build tools needed)

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
| **Distribution** | N/A | **Single-file bundle (d3.js model)** |
| **Action Detection** | Regex for "decide", "kill" | `Process` extraction (Subject-Verb-Object) |
| **Relationships** | Flattened (implicit) | Graph (Explicit Participants & Roles) |
| **Value Matching** | 300+ Manual Keywords | Semantic Distance via Concept Registry |
| **Negation** | Ignored | Scoped Logic (Process Modification) |
| **Philosophy** | Pattern Matching | **Process-Grounded Realism** |

---

## Updated Timeline (Including Bundle Strategy)

### Week 1: Foundation ✅ COMPLETE
- [x] Semantic role extraction (Agent, Patient, Recipient, Theme)
- [x] 15 semantic frames
- [x] 150 compound terms
- [x] Negation & modality detection
- [x] IEE format compliance
- [x] Repository refactor

### Week 1.5: Bundle Creation (NEW) ⏳ NEXT
- [ ] **Phase 0**: Create `dist/tagteam.js` single-file bundle
- [ ] Build script (`build.js`)
- [ ] Unified API (`TagTeam.parse()`)
- [ ] Minification (`tagteam.min.js`)
- [ ] NPM package setup
- [ ] CodePen/JSFiddle demos
- [ ] CDN distribution (jsDelivr)

### Week 2: Expansion
- [ ] **Phase 2**: Value matching engine
- [ ] Context intensity analysis
- [ ] 20 test scenarios (expanded corpus)
- [ ] 50 value definitions
- [ ] Concept registry implementation
- [ ] Semantic distance calculations
- [ ] Update bundle with new features

### Week 3: Production
- [ ] **Phase 3**: Logic & negation refinement
- [ ] **Phase 4**: Optimization & IEE adapter
- [ ] 50 test scenarios (production corpus)
- [ ] 120 value definitions (complete ontology)
- [ ] Performance tuning (<50ms)
- [ ] Final bundle optimization
- [ ] CDN release (v1.0.0)

### Week 4+: Distribution & Community
- [ ] NPM publish (`npm install tagteam`)
- [ ] GitHub Pages documentation site
- [ ] CodePen gallery (10+ examples)
- [ ] Observable notebook integration
- [ ] Blog post / launch announcement
- [ ] Community feedback iteration

---

## Distribution Checklist

### Package Files
- [ ] `dist/tagteam.js` - Full bundle (~4.2MB)
- [ ] `dist/tagteam.min.js` - Minified (~2.0MB)
- [ ] `dist/tagteam.slim.js` - Logic only (~35KB, future)
- [ ] `package.json` - NPM metadata
- [ ] `README.md` - Usage documentation
- [ ] `LICENSE` - MIT license

### Distribution Channels
- [ ] **GitHub Releases** - Tagged versions (v1.0.0, v1.1.0, ...)
- [ ] **NPM Registry** - `npm install tagteam`
- [ ] **jsDelivr CDN** - `<script src="cdn.jsdelivr.net/npm/tagteam@1.0.0">`
- [ ] **unpkg CDN** - `<script src="unpkg.com/tagteam@1.0.0">`
- [ ] **CodePen** - Featured demos
- [ ] **GitHub Pages** - Documentation site

### Documentation
- [ ] API reference (tagteam.parse, options, return format)
- [ ] Quick start guide (5-minute tutorial)
- [ ] Advanced usage (custom frames, value definitions)
- [ ] Examples gallery (15+ use cases)
- [ ] Performance guide (optimization tips)
- [ ] IEE integration guide (specific to IEE team)

---

## Design Philosophy Summary

**TagTeam.js aims to be the "d3.js of semantic parsing":**

1. **Single file, zero dependencies** - Like d3.js (250KB), mermaid.js (800KB)
2. **Simple API** - `TagTeam.parse(text)` → semantic structure
3. **Shareable everywhere** - CodePen, JSFiddle, Observable, GitHub Pages
4. **Educational friendly** - Easy for students and researchers
5. **Production ready** - Deterministic, fast (<50ms), well-tested

**Target Users:**
- Researchers (quick experiments in notebooks)
- Educators (teaching NLP concepts)
- Web developers (adding semantic understanding to websites)
- IEE team (ethical scenario analysis)
- Indie hackers (prototyping semantic tools)
