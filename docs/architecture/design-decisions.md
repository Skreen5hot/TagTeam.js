# Design Decisions: TagTeam.js → IEE Integration

**Date:** January 9, 2026
**Last Updated:** January 10, 2026
**Status:** Week 1 Complete, Week 2+ Planning

---

## Executive Summary

This document records the critical design decisions made for integrating TagTeam.js with the IEE system, as requested in the [Integration Requirements](../../iee-collaboration/from-iee/requirements/integration-requirements.md).

Each decision prioritizes:
1. **Determinism** - Same input always produces same output
2. **Inspectability** - Results can be traced and explained
3. **Performance** - <50ms processing time
4. **Extensibility** - IEE can customize without code changes
5. **Shareability** - Simple drop-in library (d3.js philosophy)

---

## Decision 0: Distribution Strategy (NEW - Jan 10, 2026)

### Decision
**Single-file bundle (d3.js/mermaid.js philosophy) - `tagteam.js`**

### Philosophy

TagTeam.js follows the design principles of d3.js and mermaid.js:

**Core Principles:**
1. **Zero dependencies** - No npm packages, no build tools required
2. **Single file drop-in** - `<script src="tagteam.js"></script>` and go
3. **Browser-native** - Works in any browser, no compilation
4. **Simple API** - `TagTeam.parse(text)` returns semantic structure
5. **Minimal but complete** - Everything needed, nothing extra
6. **Shareable** - CodePen, JSFiddle, Observable, CDN-ready

### Implementation Strategy

```javascript
// tagteam.js (4.2MB full bundle)
// Single file containing:
// - POSTagger logic (~4KB)
// - Lexicon data (~4.2MB)
// - SemanticRoleExtractor (~32KB)
// - Unified API (~2KB)

<script src="tagteam.js"></script>
<script>
  // Simple API
  const result = TagTeam.parse("I should tell my doctor about the pain");

  console.log(result.agent);      // { text: "I", entity: "self" }
  console.log(result.action);     // { verb: "tell", modality: "should" }
  console.log(result.frame);      // "Revealing_information"
</script>
```

### Distribution Formats

| File | Size | Contents | Use Case |
|------|------|----------|----------|
| `tagteam.js` | ~4.2MB | Full bundle (lexicon + logic) | Drop-in usage, demos, prototypes |
| `tagteam.min.js` | ~2.0MB | Minified bundle | Production websites |
| `tagteam.slim.js` | ~35KB | Logic only (future) | Advanced users with custom lexicons |

### API Design (Unified Interface)

```javascript
// PRIMARY API
TagTeam.parse(text, options?)
// → Returns SemanticAction object

// OPTIONS (optional)
{
  includeConfidence: true,      // Default: true
  detectNegation: true,         // Default: true
  resolveCompounds: true,       // Default: true (handles "best friend")
  includeRawTokens: false       // Default: false (for debugging)
}

// BATCH PROCESSING
TagTeam.parseMany(texts[])
// → Returns array of SemanticAction objects

// CONFIGURATION (for IEE integration)
TagTeam.loadValueDefinitions(json)
TagTeam.loadCompoundTerms(json)
TagTeam.addSemanticFrame(frameDefinition)
```

### Sharability Benefits

✅ **CodePen/JSFiddle** - Single `<script>` tag, instant demos
✅ **NPM/CDN** - `npm install tagteam` or `<script src="cdn.jsdelivr.net/npm/tagteam">`
✅ **Observable/Notebooks** - Works in computational notebooks
✅ **No Build Step** - Vanilla JS, no webpack/rollup/babel
✅ **GitHub Pages** - Deploy demos with zero configuration
✅ **Educational** - Easy for students/researchers to experiment

### Comparison to Similar Libraries

| Library | Size | API Complexity | Build Required | Philosophy Match |
|---------|------|----------------|----------------|------------------|
| d3.js | 250KB | Simple | No | ✅ Perfect model |
| mermaid.js | 800KB | Simple | No | ✅ Perfect model |
| spaCy.js | 50MB | Complex | Yes | ❌ Too heavy |
| compromise.js | 150KB | Medium | No | ⚠️ Close, but less focused |
| **tagteam.js** | 4.2MB | Simple | No | ✅ Follows d3.js pattern |

### Trade-offs Accepted

✅ **Gains:**
- Maximum shareability (works everywhere)
- Zero configuration (no package.json, no build)
- Simple mental model (one file, one API)
- Easy to fork/modify (readable source)
- CDN-friendly (can version and cache)

⚠️ **Trade-offs:**
- Larger file size (4.2MB) - acceptable for lexicon data
- No tree-shaking - but deterministic parsing needs full lexicon
- Monolithic - but simpler to reason about

### Future: Slim Distribution

For advanced users who want smaller bundles:

```javascript
// Future: Week 3+
<script src="tagteam-lexicon.js"></script>  <!-- 4.2MB data -->
<script src="tagteam.slim.js"></script>     <!-- 35KB logic -->
<script>
  // Same API, split loading
  const result = TagTeam.parse(text);
</script>
```

This allows:
- Custom lexicons (domain-specific vocabularies)
- Lazy loading (load lexicon only when needed)
- Smaller bundles (if you provide your own dictionary)

But **Week 1-2 focus**: Ship the full bundle for maximum simplicity.

---

## Question 1: Semantic Frame Classification

### Decision
**Use custom lightweight ontology with ~25 frames (12 implemented in Week 1)**

### Options Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| FrameNet (1,200+ frames) | Comprehensive coverage, linguistic rigor | Non-deterministic, requires ML, 500KB+ | ❌ Rejected |
| VerbNet classes | Good verb coverage, structured | Still ~270 classes, semantic gaps | ❌ Rejected |
| PropBank roles | Simple role labels | No frame semantics, just argument structure | ❌ Rejected |
| Custom ontology | Deterministic, fast, IEE-tailored | Limited coverage, manual curation | ✅ **Selected** |

### Implementation

```javascript
// Each frame has explicit core verbs
const SEMANTIC_FRAMES = {
  'revealing_information': {
    coreVerbs: ['tell', 'disclose', 'reveal', 'inform', 'report'],
    requiredRoles: ['agent', 'recipient'],
    optionalRoles: ['theme']
  },
  // ... 11 more frames (Week 1)
  // ... expandable to 25 based on IEE corpus
};
```

### Classification Algorithm
1. Extract main verb from POS tags → O(1)
2. Lookup verb in frame definitions → O(f) where f = number of frames
3. Check context clues for disambiguation → O(n) where n = sentence length
4. Return frame + confidence score

**Complexity:** O(n) - linear in sentence length
**Determinism:** ✅ Always produces same frame for same input

### Frame List (Week 1)

1. `revealing_information` - Disclosure, communication of facts
2. `concealing_information` - Hiding, withholding information
3. `causing_harm` - Actions that injure or damage
4. `causing_benefit` - Actions that help or improve
5. `abandoning_relationship` - Leaving groups or connections
6. `maintaining_relationship` - Preserving connections
7. `decision_making` - Choices and deliberation
8. `resource_allocation` - Distribution of goods/services
9. `medical_treatment` - Healthcare actions
10. `experiencing_emotion` - Feelings and sensations
11. `communication` - General speech acts
12. `physical_motion` - Location changes

### Extensibility Path

IEE can add frames via JSON:
```javascript
tagTeam.addSemanticFrame({
  name: 'spiritual_practice',
  coreVerbs: ['pray', 'worship', 'meditate', 'bless'],
  requiredRoles: ['agent'],
  optionalRoles: ['deity', 'location'],
  contextClues: ['god', 'temple', 'sacred', 'holy']
});
```

### Confidence Scoring

Frame confidence based on:
- Exact verb match: +0.8
- Context clue match: +0.1
- No match (fallback to generic): 0.3

### Trade-offs Accepted

✅ **Gains:**
- Deterministic classification
- <1ms frame lookup
- Explainable (can show why frame chosen)
- IEE can extend without code changes

❌ **Losses:**
- Limited to ~25 action types
- Rare verbs fall back to `generic_action`
- Requires manual frame curation
- No automatic discovery of new frames

---

## Question 2: Semantic Distance Metric

### Decision
**Hybrid approach: Hand-coded hierarchies + lexicon-derived relationships**

### Options Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| WordNet paths | Established, covers many words | Non-deterministic distances, missing domain terms | ❌ Rejected |
| Word embeddings (Word2Vec) | Rich semantic relationships | Requires training data, not deterministic, 100MB+ | ❌ Rejected |
| Edit distance (Levenshtein) | Simple, deterministic | Only measures spelling, not meaning | ❌ Rejected |
| Concept hierarchy + co-occurrence | Deterministic, extensible, small | Requires manual hierarchy design | ✅ **Selected** |

### Implementation Architecture

```javascript
// 1. Hand-coded concept hierarchy (IEE provides)
const CONCEPT_HIERARCHY = {
  'physical_wellbeing': {
    directChildren: ['health', 'life', 'bodily_comfort'],
    relatedConcepts: ['pain', 'suffering', 'treatment', 'medical'],
    antonyms: ['harm', 'injury', 'death', 'illness']
  },
  'health': {
    parent: 'physical_wellbeing',
    directChildren: ['fitness', 'vitality', 'recovery']
  }
  // ... built from IEE's 120 values
};

// 2. Distance function (deterministic)
function semanticDistance(word1, word2) {
  if (word1 === word2) return 0.0;                    // Exact match
  if (isDirectChild(word1, word2)) return 0.1;        // Parent-child
  if (haveSameParent(word1, word2)) return 0.3;       // Siblings
  if (areRelatedConcepts(word1, word2)) return 0.4;   // Explicit relation
  if (isAncestor(word1, word2, depth=2)) return 0.5;  // Grandparent
  if (sharePOSCategory(word1, word2)) return 0.7;     // Same POS (fallback)
  return 1.0;                                          // No relationship
}
```

### Distance Scale

| Distance | Relationship | Example |
|----------|-------------|---------|
| 0.0 | Exact match | health ↔ health |
| 0.1 | Parent-child | physical_wellbeing ↔ health |
| 0.3 | Siblings | health ↔ comfort (both children of wellbeing) |
| 0.4 | Related concepts | health ↔ pain (explicit link) |
| 0.5 | 2-level hierarchy | physical_wellbeing ↔ fitness (grandparent) |
| 0.7 | Same POS category | health ↔ happiness (both NN) |
| 1.0 | No relationship | health ↔ politics |

### Key Properties

✅ **Deterministic:** Same words always return same distance
✅ **Fast:** O(1) hash lookups, no matrix operations
✅ **Inspectable:** Can explain why distance is X
✅ **Extensible:** IEE adds concepts as JSON, no code changes
✅ **Small:** <10KB for 120 value hierarchies

### Week 1 Status

🚧 **Foundation laid, full implementation in Week 2**

Week 1 delivers:
- Entity categorization system
- Extensible entity dictionary
- Framework for loading hierarchies

Week 2 will add:
- Full distance metric implementation
- IEE value hierarchy loading
- Concept graph construction

### IEE's Responsibility

Provide concept hierarchies in JSON:
```json
{
  "physical_wellbeing": {
    "directChildren": ["health", "life", "comfort"],
    "relatedConcepts": ["pain", "suffering", "treatment"],
    "antonyms": ["harm", "death", "illness"],
    "intensity": {
      "high": ["death", "terminal", "life-threatening"],
      "medium": ["illness", "pain", "treatment"],
      "low": ["discomfort", "minor", "ache"]
    }
  }
}
```

### Trade-offs Accepted

✅ **Gains:**
- Deterministic distance calculations
- <1ms per distance lookup
- Explainable relationships
- IEE controls semantics

❌ **Losses:**
- Requires manual hierarchy construction
- Limited to concepts in hierarchy
- No automatic semantic discovery
- May miss implicit relationships

---

## Question 3: Value Definition Format

### Decision
**IEE provides JSON definitions, TagTeam consumes and indexes**

### Options Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| TagTeam defines values | Technical rigor, consistent structure | TagTeam doesn't know IEE's domain | ❌ Rejected |
| IEE provides natural language | Flexible, easy for IEE | Ambiguous, hard to parse reliably | ❌ Rejected |
| IEE provides structured JSON | Clear contract, machine-readable | Requires IEE to learn format | ✅ **Selected** |
| Hybrid: IEE prose + TagTeam parses | Best of both worlds | Complex, error-prone | ❌ Rejected |

### API Contract

```typescript
interface ValueDefinition {
  // Core identity
  name: string;                    // e.g., "physical_wellbeing"
  domain: string;                  // e.g., "physical", "psychological", "social"

  // Semantic relationships
  relatedConcepts: string[];       // Words/phrases associated with this value
  antonyms: string[];              // Opposing concepts
  semanticField: string;           // Broad category (e.g., "medical", "identity")

  // Context intensity (NEW)
  intensity: {
    high: string[];                // Strong indicators (death, terminal)
    medium: string[];              // Moderate indicators (illness, pain)
    low: string[];                 // Weak indicators (discomfort, minor)
  };

  // Optional metadata
  description?: string;            // Human-readable explanation
  examples?: string[];             // Example sentences
  worldview?: string;              // Which of 12 worldviews (if applicable)
}
```

### Example Definition

```json
{
  "name": "physical_wellbeing",
  "domain": "physical",
  "relatedConcepts": [
    "health", "life", "pain", "suffering", "treatment",
    "medical", "body", "vitality", "wellness", "doctor",
    "hospital", "medicine", "injury", "illness"
  ],
  "antonyms": [
    "harm", "injury", "death", "illness", "disease", "damage"
  ],
  "semanticField": "medical",
  "intensity": {
    "high": ["death", "terminal", "life support", "fatal", "critical"],
    "medium": ["treatment", "illness", "pain", "surgery", "hospitalization"],
    "low": ["discomfort", "minor", "ache", "checkup", "preventive"]
  },
  "description": "Concerns about physical health and bodily wellbeing",
  "examples": [
    "I should tell my doctor about the pain",
    "The treatment might harm the patient",
    "I need to preserve my health"
  ]
}
```

### Division of Responsibilities

| Task | Owner | Rationale |
|------|-------|-----------|
| Define value concepts | IEE | Domain expertise, cultural knowledge |
| Choose related concepts | IEE | Knows which words matter in their context |
| Set intensity levels | IEE | Understands gradient of importance |
| Validate definitions | IEE | Can test with real user scenarios |
| Parse JSON | TagTeam | Technical implementation |
| Build search index | TagTeam | Optimization expertise |
| Compute matches | TagTeam | Semantic distance algorithm |
| Score relevance | TagTeam | Confidence calculations |

### Loading Process

```javascript
// 1. IEE provides all 120 value definitions
const valueDefinitions = {
  'physical_wellbeing': { /* ... */ },
  'authentic_selfhood': { /* ... */ },
  // ... 118 more
};

// 2. TagTeam loads at initialization
const tagTeam = new SemanticMatcher();
tagTeam.loadValueDefinitions(valueDefinitions);

// 3. TagTeam builds internal index
// - Inverted index: word → values that mention it
// - Concept hierarchy: parent → children
// - Intensity map: value → intensity levels

// 4. Ready for matching
const action = extractor.parseSemanticAction("I should tell my doctor");
const matches = tagTeam.matchToValues(action);
// Returns: [
//   { value: 'physical_wellbeing', score: 0.85, evidence: [...] },
//   { value: 'authentic_selfhood', score: 0.43, evidence: [...] }
// ]
```

### Validation & Iteration

IEE can iteratively refine definitions:

```javascript
// Week 1: Initial definitions
'physical_wellbeing': {
  relatedConcepts: ['health', 'pain']
}

// Week 2: After testing, IEE expands
'physical_wellbeing': {
  relatedConcepts: ['health', 'pain', 'suffering', 'treatment', 'medical', 'doctor']
}

// Week 3: IEE adds intensity
'physical_wellbeing': {
  relatedConcepts: ['health', 'pain', ...],
  intensity: {
    high: ['death', 'terminal'],
    medium: ['pain', 'illness'],
    low: ['discomfort']
  }
}
```

### Trade-offs Accepted

✅ **Gains:**
- Clear separation of concerns
- IEE maintains control over definitions
- Iterative refinement without code changes
- Portable (can share definitions across projects)
- Versionable (can track changes in git)

❌ **Losses:**
- IEE must learn JSON format
- Manual work to create 120 definitions
- Potential for inconsistency across definitions
- No automatic concept discovery

---

## Question 4: Ambiguity Handling

### Decision
**Single best interpretation + confidence score + ambiguity flag**

### Options Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Return top N interpretations | User sees all options | Confusing, no decision made | ❌ Rejected |
| Single interpretation, no confidence | Simple, decisive | Hides uncertainty, user can't assess quality | ❌ Rejected |
| Single + confidence | Decisive but honest | Doesn't explain *why* low confidence | ⚠️ Partial |
| Single + confidence + ambiguity flag | Decisive, honest, explainable | Slightly more complex API | ✅ **Selected** |

### Implementation

```typescript
interface SemanticAction {
  // ... (agent, action, patient, etc.)

  // Confidence in this interpretation
  confidence: number;  // 0.0 - 1.0

  // Ambiguity detection
  ambiguity: {
    flagged: boolean;              // Is this parse ambiguous?
    reason: string | null;         // Human-readable explanation
    alternatives?: Array<{         // Optional: other possibilities
      interpretation: string,
      confidence: number
    }>
  };
}
```

### Confidence Score Calculation

```javascript
function computeConfidence(roles, frame, verbInfo) {
  let confidence = 0.5;  // Base confidence

  // Boost factors
  if (verbInfo.lemma) confidence += 0.2;              // Verb found
  if (frame.name !== 'unknown') confidence += 0.1;     // Frame classified
  if (roles.agent) confidence += 0.1;                  // Agent found
  if (roles.patient || roles.recipient) confidence += 0.1;  // Object found

  // Penalty factors
  if (missingRequiredRoles(frame, roles)) confidence -= 0.15;  // Incomplete parse
  if (hasUnknownEntities(roles)) confidence -= 0.1;            // Ambiguous entities

  return clamp(confidence, 0.0, 1.0);
}
```

### Confidence Thresholds

| Range | Label | IEE Action | UI Indicator |
|-------|-------|------------|--------------|
| 0.80 - 1.0 | High | Use interpretation directly | 🟢 Green |
| 0.50 - 0.79 | Medium | Use, but log for review | 🟡 Yellow |
| 0.00 - 0.49 | Low | Flag for human review | 🔴 Red |

### Ambiguity Detection Triggers

1. **Missing Required Roles**
   ```javascript
   // Input: "I'm considering leaving"
   {
     action: {verb: 'leave', frame: 'abandoning_relationship'},
     agent: {text: 'I'},
     patient: null,  // ← Missing! Leaving what?

     confidence: 0.45,
     ambiguity: {
       flagged: true,
       reason: "Missing required role: theme (leaving what? job, community, location)"
     }
   }
   ```

2. **Unknown Entities**
   ```javascript
   // Input: "They should allocate resources"
   {
     agent: {text: 'they', entity: 'other_plural'},
     patient: {text: 'resources', entity: 'UNKNOWN'},  // ← Not in dictionary

     confidence: 0.55,
     ambiguity: {
       flagged: true,
       reason: "Ambiguous entity: resources (not categorized)"
     }
   }
   ```

3. **Frame Classification Failure**
   ```javascript
   // Input: "I might wibble the floobar"
   {
     action: {verb: 'wibble', frame: 'generic_action'},  // ← Fallback frame

     confidence: 0.30,
     ambiguity: {
       flagged: true,
       reason: "Unknown verb: wibble (no matching semantic frame)"
     }
   }
   ```

4. **Multiple Plausible Interpretations**
   ```javascript
   // Input: "I left the bank"
   {
     action: {verb: 'leave', frame: 'physical_motion'},  // Could be abandoning_relationship
     patient: {text: 'bank', entity: 'UNKNOWN'},          // Could be financial or river

     confidence: 0.60,
     ambiguity: {
       flagged: true,
       reason: "Multiple interpretations: physical motion vs. relationship abandonment; bank = financial institution vs. riverbank",
       alternatives: [
         {interpretation: 'physical_motion (left building)', confidence: 0.60},
         {interpretation: 'abandoning_relationship (quit job)', confidence: 0.35}
       ]
     }
   }
   ```

### User Experience Flow

```
User Input → Semantic Parse → Check Confidence
                                    ↓
                          ┌─────────┴─────────┐
                      confidence              confidence
                       ≥ 0.50                  < 0.50
                          ↓                       ↓
                    Use result              Flag for review
                    Show values             Show ambiguity message
                    🟢/🟡                    🔴
```

### Example UI Messages

**High Confidence (>0.80):**
```
✅ Understood: "You want to tell your doctor about the pain"
Relevant values: Physical Wellbeing (high), Authentic Selfhood (medium)
```

**Medium Confidence (0.50-0.79):**
```
⚠️ I think you mean: "You're considering leaving your community"
Relevant values: Collective Harmony (high), Social Belonging (medium)
(Confidence: 65%)
```

**Low Confidence (<0.50):**
```
❌ I'm not sure I understood correctly.
You said: "I might leave the bank"
Did you mean:
□ Physically leaving a bank building
□ Quitting your job at a bank
□ Departing from a riverbank
```

### Trade-offs Accepted

✅ **Gains:**
- IEE gets a decision (not paralyzed by options)
- Honest about uncertainty (confidence score)
- Explainable (reason string helps debugging)
- User-friendly (can show warnings for low confidence)

❌ **Losses:**
- May choose wrong interpretation (if confidence miscalibrated)
- User doesn't see alternative interpretations (unless in `alternatives` array)
- Confidence thresholds somewhat arbitrary (0.5, 0.8)
- More complex API than simple parse result

---

## Summary Table

| Question | Decision | Key Property | Week 1 Status |
|----------|----------|--------------|---------------|
| **1. Semantic Frames** | Custom ontology (25 frames) | Deterministic O(n) classification | ✅ 12 frames implemented |
| **2. Distance Metric** | Hierarchical + lexicon hybrid | Deterministic O(1) lookups | 🚧 Foundation laid |
| **3. Value Definitions** | IEE provides JSON | Clear separation of concerns | ✅ API defined, awaiting IEE data |
| **4. Ambiguity** | Single + confidence + flag | Decisive but honest | ✅ Fully implemented |

---

## Next Review Points

### IEE Feedback Needed On:

1. **Frame Taxonomy (Q1)**
   - Are 12 frames sufficient for initial testing?
   - Which 13 additional frames should we prioritize?
   - Any frames we're missing for your domain?

2. **Distance Metric (Q2)**
   - When can you provide concept hierarchies for your 120 values?
   - What distance thresholds make sense (0.1, 0.3, 0.5)?
   - Any non-hierarchical relationships we should capture?

3. **Value Definitions (Q3)**
   - When can you provide JSON for 120 values?
   - Do you need help formatting the JSON?
   - Should we provide a validation tool?

4. **Confidence Thresholds (Q4)**
   - Is 0.5 the right cutoff for "low confidence"?
   - Should UI block on low confidence or just warn?
   - How often do you expect ambiguous inputs?

### Timeline

- **Week 1:** ✅ Decisions finalized, core implementation complete
- **Week 2:** Distance metric + value matching engine (needs IEE data)
- **Week 3:** Iteration based on IEE testing with real scenarios

---

**Document Version:** 1.0
**Last Updated:** January 9, 2026
**Status:** Finalized
**Next Review:** After IEE Week 1 testing
