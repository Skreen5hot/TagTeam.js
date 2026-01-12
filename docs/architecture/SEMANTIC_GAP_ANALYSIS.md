# TagTeam Semantic Gap Analysis

**Author:** Aaron Damiano
**Date:** January 10, 2026
**Version:** 1.1 (Updated with IEE Phased Strategy)
**Status:** Strategic Roadmap

---

## 🆕 Update: IEE Phased Strategy Confirmed (Jan 11, 2026)

**IEE has confirmed a three-phase approach that resolves the semantic gap pragmatically:**

- **Phase 1 (Weeks 1-3):** TagTeam delivers flat JSON, IEE handles semantic lifting
- **Phase 2 (Weeks 4-6):** Add JSON-LD @context (~10 lines) after hitting 85%+ accuracy
- **Phase 3 (Month 3+):** Full BFO alignment if governance features prove valuable

**This document now serves as a roadmap showing:**
- ✅ **Phase 1 Implementation** (Current TagTeam)
- 📋 **Phase 2 Targets** (POS Graph POC capabilities)
- 🔮 **Phase 3 Vision** (BFO/SHML research)

See [SEMANTIC_STRATEGY_AGREED.md](../../iee-collaboration/from-iee/SEMANTIC_STRATEGY_AGREED.md) for complete strategy details.

---

## Executive Summary

This document analyzes the gap between TagTeam's **current implementation** (Week 1 IEE deliverable) and its **original semantic vision** (POS Graph POC). While the current system successfully meets IEE validation requirements, it operates at the **syntactic role labeling** level rather than the **semantic interpretation** level originally intended.

**Key Finding:** TagTeam Week 1 extracts grammatical structure but does not build semantic meaning. This is not a failure—it's an architectural choice optimized for a specific contract and aligned with IEE's phased strategy.

---

## 1. The Two Paradigms

### 1.1 Current Implementation: Syntactic Role Labeling (✅ Phase 1)

**What it does:**
- Labels words with grammatical categories (POS tags)
- Identifies syntactic slots (agent, action, patient)
- Maps verbs to predefined frame categories
- Outputs flat JSON structures

**IEE Strategy:** This is the agreed Phase 1 approach. IEE handles semantic lifting on their infrastructure.

**Example Input:**
```
"The family must decide whether to continue treatment"
```

**Current Output:**
```json
{
  "agent": {
    "text": "family",
    "role": "agent",
    "entity": "family",
    "posTag": "NN"
  },
  "action": {
    "verb": "decide",
    "lemma": "decide",
    "tense": "present",
    "aspect": "simple",
    "modality": "must",
    "negation": false
  },
  "semanticFrame": "Deciding",
  "confidence": 0.85
}
```

**Characteristics:**
- ✅ Fast (~7ms)
- ✅ Deterministic
- ✅ IEE format compliant
- ❌ No relational structure
- ❌ No nested semantics
- ❌ No grounding
- ❌ No provenance

---

### 1.2 Original Vision: Semantic Dependency Parsing (📋 Phase 2-3)

**What the POS Graph POC demonstrated:**
- Build labeled directed graphs of conceptual relations
- Ground concepts in external ontologies (Wikidata)
- Preserve relational structure
- Support knowledge graph construction

**IEE Strategy:**
- Phase 2: Add JSON-LD @context for semantic web compatibility
- Phase 3: Consider full dependency graph output if governance features require it

**Example Input:**
```
"This set of scripts jointly support the capability of generating a Word document"
```

**POS Graph POC Output:**
```javascript
(support) --[nsubj]--> (script)
(support) --[dobj]--> (capability)
(capability) --[vmod]--> (generate)
(generate) --[dobj]--> (Word document)

// With Wikidata grounding:
(script) → http://www.wikidata.org/entity/Q184768
(capability) → http://www.wikidata.org/entity/Q30035986
```

**Characteristics:**
- ✅ Relational structure
- ✅ Entity linking
- ✅ Compositional semantics
- ✅ Reusable for knowledge graphs
- ❌ Slower (~50-100ms with API calls)
- ❌ Non-deterministic (Wikidata results vary)

---

## 2. What's Missing: Layer-by-Layer Analysis

### 2.1 Missing Relational Structure

**Current:** Flat slots with no connections between entities.

**Example Problem:**
```
Input: "My best friend is cheating on their spouse"

Current Output:
- agent: "best_friend"
- action: "cheat"

What's Lost:
- Who owns the "best friend" relationship? ("my")
- What is "their" pointing to?
- How does "spouse" relate to "best friend"?
```

**POS Graph Would Capture:**
```javascript
(I) --[poss]--> (best friend)
(best friend) --[nsubj]--> (cheating)
(cheating) --[prep_on]--> (spouse)
(spouse) --[poss]--> (best friend)  // "their" resolves to "best friend"
```

---

### 2.2 Missing Nested Semantics

**Current:** Cannot represent propositions as objects.

**Example Problem:**
```
Input: "I discovered that my company is falsifying safety reports"

Current Output:
- agent: "I"
- action: "discover"
- patient: "company"  ❌ WRONG

Correct Semantic Structure:
- agent: "I"
- action: "discover"
- patient: [PROPOSITION: "company falsifying safety reports"]
  - agent: "company"
  - action: "falsify"
  - patient: "safety reports"
```

**Why This Matters:**
Discovery is not about an entity (company), but about a **state of affairs** (company doing something wrong). The current flat structure cannot represent this.

---

### 2.3 Missing Grounding

**Current:** Entity labels are strings with no external reference.

**Example:**
```json
{
  "agent": { "text": "family", "entity": "family" }
}
```

**Questions the system cannot answer:**
- Is "family" a biological unit, a legal entity, or a social group?
- Does "family" refer to a specific instance or the general concept?
- How does "family" relate to other entities in a knowledge base?

**POS Graph POC Provided:**
```javascript
{
  "term": "family",
  "iri": "http://www.wikidata.org/entity/Q8436",
  "label": "family",
  "description": "group of people affiliated by consanguinity, affinity, or co-residence"
}
```

This links the text to a **shared semantic space** where reasoning is possible.

---

### 2.4 Missing Process Metadata (The BFO/SHML Gap)

**Current:** No record of the interpretation process itself.

**What's Lost:**
- **Who** performed the semantic analysis? (human annotator, algorithm version, etc.)
- **When** was this interpretation made?
- **In what context** was this meaning assigned? (medical, legal, religious)
- **Why** was this frame chosen over alternatives?

**Example Scenario:**
```
Input: "The patient should be told about the diagnosis"

Current Output:
- agent: "patient"
- action: "tell"
- semanticFrame: "Revealing_information"

Ambiguity Not Captured:
- Is the agent really "patient"? Or is there an implicit agent (doctor)?
- Passive voice detected, but semantic roles may be inverted
- "Revealing_information" assumes truth-telling, but could be "Concealing_information" in context
```

**BFO-Grounded Approach Would Record (🔮 Phase 3 - Aspirational):**

*Note: This example is from the BFO intentionality research paper. It is NOT implemented in current TagTeam or POS Graph POC. This represents the long-term vision if governance/audit features prove valuable.*

```turtle
:interpretation_act_001 a git:InterpretationAct ;
    has_participant :Annotator_Alice ;
    git:directed_toward :Patient_123 ;
    git:directed_toward :TellingProcess_456 ;
    git:creates :semantic_assertion_789 ;
    occurs_at "2026-01-10T15:30:00Z" ;
    git:context :ClinicalContext .

:semantic_assertion_789 a git:DeterminateICE ;
    git:created_by :interpretation_act_001 ;
    iao:is_about :Patient_123 ;
    iao:is_about :TellingProcess_456 ;
    git:frames_as :Revealing_information ;
    git:confidence_value 0.75 ;
    git:alternative_interpretation :concealing_reading .
```

This makes the **semantic labor visible and accountable**.

---

## 3. Concrete Examples of Semantic Loss

### Example 1: Possessives

**Input:** "My best friend is cheating"

| Layer | Current TagTeam | POS Graph POC |
|-------|-----------------|---------------|
| **Tokens** | ["my", "best", "friend", "is", "cheating"] | Same |
| **Compounds** | "best_friend" | "best friend" |
| **Roles** | agent: "best_friend" | N/A (has relations instead) |
| **Relations** | None | `(I) --[poss]--> (best friend)` |
| **Result** | ❌ "my" is lost | ✅ Possessive preserved |

**Impact:** Cannot answer "Whose friend?" from current output.

---

### Example 2: Nested Propositions

**Input:** "I discovered that my company is falsifying safety reports"

| Aspect | Current TagTeam | Should Be |
|--------|-----------------|-----------|
| **Agent** | "I" ✅ | "I" ✅ |
| **Action** | "discover" ✅ | "discover" ✅ |
| **Patient** | "company" ❌ | **CLAUSE:** "company falsifying safety reports" |
| **Nested Agent** | Not extracted | "company" |
| **Nested Action** | Not extracted | "falsify" |
| **Nested Patient** | Not extracted | "safety reports" |

**Impact:** Cannot represent that discovery is *about a wrongdoing*, not just *about a company*.

---

### Example 3: Context-Dependent Frames

**Input:** "I am questioning core doctrines"

| Factor | Current | What's Missing |
|--------|---------|----------------|
| **Frame Assigned** | "Questioning" ✅ | Context: religious vs. scientific |
| **Agent** | "I" ✅ | Agent's role: member vs. outsider |
| **Patient** | "core_doctrines" ✅ | Doctrine source: Christianity, Islam, Physics? |
| **Consequence** | None | Questioning could lead to: apostasy, investigation, learning |

**Impact:** Frame is technically correct but semantically underspecified.

---

## 4. Why This Gap Exists

### 4.1 Contract Requirements vs. Semantic Goals

**IEE Contract Specified:**
- Agent/action/patient extraction
- Semantic frame classification
- Negation and modality detection
- 75% accuracy on test scenarios

**IEE Did NOT Specify:**
- Relational graphs
- Entity linking
- Nested propositions
- Process metadata

**Result:** TagTeam optimized for what was **measured**, not what was **meaningful**.

---

### 4.2 Flat JSON vs. Graph Structures

**IEE's JSON Schema:**
```json
{
  "agent": { "text": "...", "entity": "..." },
  "action": { "verb": "...", "tense": "..." },
  "semanticFrame": "..."
}
```

This schema **cannot represent**:
- Relations between entities
- Nested structures
- Alternative interpretations
- Provenance chains

**Graph-Based Alternative:**
```javascript
{
  "nodes": [
    { "id": "n1", "type": "Person", "text": "I" },
    { "id": "n2", "type": "Action", "text": "discover" },
    { "id": "n3", "type": "Organization", "text": "company" },
    { "id": "n4", "type": "Action", "text": "falsify" },
    { "id": "n5", "type": "Document", "text": "safety reports" }
  ],
  "edges": [
    { "from": "n2", "to": "n1", "relation": "agent" },
    { "from": "n2", "to": "n4", "relation": "patient" },  // Discovery of an ACTION
    { "from": "n4", "to": "n3", "relation": "agent" },
    { "from": "n4", "to": "n5", "relation": "patient" }
  ]
}
```

---

### 4.3 Speed vs. Depth Trade-off

**Current System:**
- ~7ms per sentence
- Zero API calls
- Deterministic output

**Semantic Graph System:**
- ~50-100ms per sentence (with Wikidata linking)
- Multiple API calls for entity resolution
- Non-deterministic (Wikidata results change)

**IEE Priority:** Speed and reproducibility trumped semantic depth.

---

## 5. Implications for Week 2 (Context & Values)

### 5.1 IEE Week 2 Requirements

1. **Context Intensity Analysis** (12 dimensions)
   - Physical impact
   - Persons involved
   - Autonomy at stake
   - etc.

2. **Value Matching** (20 core values)
   - Match text to value definitions
   - Detect semantic markers
   - Handle negation patterns

**Critical Question:** Can you do context analysis and value matching with **flat role labels**, or do you need **relational structure**?

---

### 5.2 Why Week 2 Needs Semantic Structure

**Example Scenario:**
```
"I must decide whether to remove life support from my father,
even though it conflicts with my religious beliefs."
```

**Flat Analysis (Current Approach):**
```json
{
  "agent": "I",
  "action": "decide",
  "patient": "life_support",
  "semanticFrame": "Deciding"
}
```

**What's Missing for Context Analysis:**
- **Autonomy at stake:** Who has agency? Patient (father) or decision-maker (I)?
- **Relationship:** Father-child relationship affects ethical weight
- **Conflict:** "conflicts with beliefs" creates a value tension
- **Conditionality:** "whether to" indicates uncertainty

**Relational Analysis Needed:**
```javascript
// Main decision
(I) --[agent]--> (decide)
(decide) --[patient]--> (remove)
(remove) --[dobj]--> (life support)
(life support) --[attached_to]--> (father)
(father) --[relationship]--> (I)  // "my father"

// Conflict clause
(remove) --[conflicts_with]--> (religious beliefs)
(religious beliefs) --[poss]--> (I)

// Context dimensions derived from graph:
- Persons involved: 2 (I, father)
- Autonomy at stake: High (life/death decision for another)
- Relationship type: Family (filial)
- Value conflict: Present (religious beliefs vs. medical decision)
```

---

### 5.3 Recommendation for Week 2 (✅ Updated with IEE Strategy)

**IEE has confirmed Option A is the correct approach:**

**Selected: Option A - Extend current flat structure**
- ✅ Pro: Fast, consistent with Week 1
- ✅ Pro: IEE handles semantic lifting on their side
- ✅ Pro: Allows focus on parsing accuracy (primary goal)
- ✅ Status: **AGREED WITH IEE TEAM**

**Deferred: Option B/C - Dependency graphs**
- 📋 Phase 2: Consider after 85%+ accuracy achieved
- 📋 Phase 3: Implement if governance features require it
- Status: **Part of long-term roadmap, not Week 2-3 scope**

**Week 2 Focus:** Parsing accuracy for context dimensions using flat JSON output.

---

## 6. Comparison Table: Current vs. Semantic

**Legend:**
- ✅ Phase 1 = Current implementation (Weeks 1-3)
- 📋 Phase 2 = JSON-LD context addition (Weeks 4-6, after 85%+ accuracy)
- 🔮 Phase 3 = Full BFO alignment (Month 3+, if governance features prove valuable)

| Feature | Current TagTeam (✅ Phase 1) | POS Graph POC (📋 Phase 2-3) | BFO/SHML Vision (🔮 Phase 3) |
|---------|-----------------|---------------|-----------------|
| **Output Format** | Flat JSON | Dependency graph | RDF/OWL graph |
| **Speed** | ~7ms | ~50ms | ~100ms+ |
| **Deterministic** | Yes | Mostly (except Wikidata) | No (interpretation context) |
| **Relations** | None | Yes (nsubj, dobj, etc.) | Yes (BFO relations) |
| **Nesting** | No | Limited (via relations) | Yes (propositions as entities) |
| **Grounding** | String labels | Wikidata IRIs | BFO/CCO classes |
| **Provenance** | None | None | Full (agent, time, context) |
| **Ambiguity** | Flags only | Multiple candidates | Multiple interpretations |
| **IEE Compliant** | ✅ Yes | ❌ No | ❌ No |
| **Knowledge Graph Ready** | ❌ No | ✅ Partial | ✅ Yes |
| **Supports Reasoning** | ❌ No | ⚠️ Limited | ✅ Yes |

---

## 7. The Semantic Honesty Principle (from SHML Paper) (🔮 Phase 3)

**Note:** This section describes the research vision from the SHML paper. Neither current TagTeam nor the POS Graph POC implement this architecture. This represents the **Phase 3 long-term goal** if governance/audit features prove valuable.

---

Your SHML research defines **Semantic Honesty** as:

> "The commitment to never represent a state as a static, global truth if it is in fact the output of a process."

**Applied to TagTeam:**

**Current System (Phase 1):**
```json
{
  "agent": "family",
  "semanticFrame": "Deciding"
}
```

This asserts "family is the agent" and "this is a Deciding event" as **facts**, when they are actually **interpretation outputs**. However, IEE has confirmed they will handle semantic lifting on their infrastructure in Phase 1.

**Semantically Honest Approach (Phase 3 - Aspirational):**
```turtle
:parse_event_123 a shml:SemanticAssertion ;
    shml:performed_by :TagTeam_v1.0 ;
    shml:occurred_at "2026-01-10T15:30:00Z" ;
    shml:asserts [
        a shml:RoleAssertion ;
        shml:text "family" ;
        shml:role "agent" ;
        shml:confidence 0.85
    ] ;
    shml:asserts [
        a shml:FrameAssertion ;
        shml:frame "Deciding" ;
        shml:confidence 0.80
    ] .
```

This makes the **process visible** and the **confidence explicit**.

---

## 8. Path Forward: Three Strategies

### Strategy 1: Document and Defer
**Action:** Accept the gap as a Week 1 constraint, document thoroughly, address in Week 2+
**Pros:** No immediate rework, meets current contract
**Cons:** Gap widens if not addressed

**Recommended for:** IEE Week 1 delivery (current state)

---

### Strategy 2: Dual Output Mode
**Action:** Add `TagTeam.parse(text, { mode: 'semantic' })` option
**Output:** Returns dependency graph alongside IEE format

**Example:**
```javascript
const ieeFormat = TagTeam.parse(text, { mode: 'iee' });
// → { agent: {...}, action: {...}, semanticFrame: "..." }

const semanticGraph = TagTeam.parse(text, { mode: 'semantic' });
// → { nodes: [...], edges: [...], groundings: [...] }
```

**Pros:** Demonstrates semantic capabilities without breaking contract
**Cons:** Maintenance burden of two code paths

**Recommended for:** Week 1.5 (post-IEE validation)

---

### Strategy 3: Middle Layer (SHML Implementation)
**Action:** Build SHML layer that wraps TagTeam
**Architecture:**
```
User Input
    ↓
TagTeam (current) → IEE JSON
    ↓
SHML Layer → Process metadata + relations
    ↓
Knowledge Graph (BFO/CCO grounded)
```

**Pros:** Full semantic stack, research-quality output
**Cons:** Significant development effort

**Recommended for:** Week 3+ or separate project

---

## 9. Questions for IEE Team

To bridge this gap, we need clarity on IEE's actual goals:

### 9.1 Dataset vs. System
**Question:** Is TagTeam meant to be:
- A) An annotation tool to create training datasets for ML models?
- B) A semantic system for live reasoning and inference?

**Why it matters:**
- (A) requires flat, consistent labels → Current approach is correct
- (B) requires relational structure → Need semantic graph output

---

### 9.2 Context Analysis Requirements
**Question:** For Week 2 context analysis, should we:
- A) Use heuristics on flat role labels?
- B) Build dependency graphs to compute context?
- C) Let IEE team compute context from our role labels?

**Example:**
```
Input: "My father's doctor must decide whether to continue treatment"

Who has autonomy at stake?
- Flat analysis: "doctor" is agent → doctor has autonomy ❌
- Graph analysis: "doctor" is agent of decision, but "father" is patient of treatment → father has autonomy ✅
```

---

### 9.3 Future Grounding Plans
**Question:** Does IEE plan to:
- A) Link entities to external ontologies (Wikidata, BFO, domain-specific)?
- B) Keep entities as ungrounded strings?
- C) Build their own entity resolution layer?

**Why it matters:** If (A), we should provide IRIs now. If (B) or (C), strings are sufficient.

---

## 10. Recommendations

### Immediate (Week 1 Complete)
1. ✅ **Deliver current system as-is** - Meets contract requirements
2. ✅ **Document this gap** - This document serves that purpose
3. ⏳ **Prepare dual-output demo** - Show what semantic mode could look like

### Short-term (Week 2 Planning)
4. ⏳ **Clarify IEE's context analysis needs** - Do they need graphs or will heuristics suffice?
5. ⏳ **Prototype graph-based context analysis** - Prove it's superior for their use case
6. ⏳ **Propose dual output API** - Offer both flat (IEE) and graph (semantic) modes

### Long-term (Beyond IEE Contract)
7. ⏳ **Implement SHML layer** - Build the middle layer architecture from your research
8. ⏳ **Add BFO grounding** - Link to realist ontologies for accountability
9. ⏳ **Create "TagTeam Semantic Edition"** - Research-quality fork demonstrating full vision

---

## 11. Conclusion

**The current TagTeam Week 1 deliverable is not wrong—it's incomplete.**

It successfully performs **syntactic role labeling** and meets all IEE contract requirements. However, it operates at a lower semantic level than the original POS Graph POC vision.

**This gap matters because:**
1. **Context analysis** (Week 2) may require relational structure
2. **Value matching** (Week 2) may require nested propositions
3. **Long-term** accountability requires process metadata (BFO/SHML)

**The solution is not to abandon the current approach, but to layer semantic capabilities on top of it.**

By understanding this gap now, we can make informed architectural decisions for Week 2 and beyond, rather than discovering limitations when requirements cannot be met.

---

## Appendix A: Code Comparison

### Current System (SemanticRoleExtractor.js)

```javascript
parseSemanticAction(sentence) {
    const tokens = this._tokenize(sentence);
    const tagged = this._posTag(tokens);
    const agent = this._extractAgent(tagged);
    const action = this._extractAction(tagged);
    const patient = this._extractPatient(tagged);
    const frame = this._classifyFrame(action.verb);

    return {
        agent: agent,
        action: action,
        patient: patient,
        semanticFrame: frame,
        confidence: this._computeConfidence()
    };
}
```

**Output:** Flat object with no relations.

---

### POS Graph POC (DependencyParser.js)

```javascript
parse(chunks) {
    const dependencies = [];

    // Subject-Verb rule
    if (chunks[i].type === 'NP' && chunks[i+1].type === 'VP') {
        dependencies.push({
            head: chunks[i+1].lemmatizedText,
            relation: 'nsubj',
            dependent: chunks[i].lemmatizedText
        });
    }

    // Verb-Object rule
    if (chunks[i].type === 'VP' && chunks[i+1].type === 'NP') {
        dependencies.push({
            head: chunks[i].lemmatizedText,
            relation: 'dobj',
            dependent: chunks[i+1].lemmatizedText
        });
    }

    return dependencies;
}
```

**Output:** Graph structure with labeled edges.

---

## Appendix B: References

1. **BFO Intentionality Paper** - [docs/research/bfo-intentionality.md](../research/bfo-intentionality.md)
   - Grounds information in intentional acts
   - Provides provenance and accountability
   - Distinguishes genuine vs. pseudo-representations

2. **SHML Architecture Paper** - [docs/research/middle-layer-shml.md](../research/middle-layer-shml.md)
   - Three-layer architecture (Reality/SHML/Logic)
   - Semantic honesty principle
   - Process-oriented representation

3. **POS Graph POC** - [POS Graph POC/](../../POS%20Graph%20POC/)
   - Original semantic dependency parser
   - Wikidata linking
   - GDC knowledge graph integration

4. **IEE Week 1 Deliverable** - [iee-collaboration/to-iee/week1/](../../iee-collaboration/to-iee/week1/)
   - Current flat role extraction
   - IEE format compliance
   - Test validation results

---

**Document Status:** Complete
**Next Review:** Before Week 2 planning begins
**Distribution:** Internal team, optionally IEE team for transparency
