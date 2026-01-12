# IEE-TagTeam Semantic Strategy - Agreed Approach

**Date:** January 11, 2026
**Status:** ✅ Confirmed with IEE Team
**Stakeholders:** IEE Team, TagTeam Development

---

## Executive Summary

IEE has confirmed a **phased semantic approach** that resolves the tension between TagTeam's current syntactic role labeling and the long-term BFO/SHML semantic vision. This approach is pragmatic, realistic, and allows both teams to focus on their strengths.

**Key Insight:** IEE will handle "semantic lifting" on their side, allowing TagTeam to focus on parsing accuracy while still achieving full semantic representation in the integrated system.

---

## The Three-Phase Plan

### Phase 1: Weeks 1-3 (Current) - Accuracy with Simple JSON

**TagTeam Responsibility:**
- ✅ Deliver flat JSON output (agent, action, patient, frame)
- ✅ Focus on parsing accuracy (target: 75% → 85%+)
- ✅ Week 1: Role extraction + frame classification
- ⏳ Week 2: Context analysis
- ⏳ Week 3: Value matching

**IEE Responsibility:**
- Perform semantic lifting on their infrastructure
- Handle ontology mapping
- Manage knowledge graph construction

**Status:** Week 1 complete (delivered Jan 10), Week 2-3 in progress

**Output Format:**
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
  "patient": {
    "text": "treatment",
    "role": "patient",
    "entity": "medical_procedure",
    "posTag": "NN"
  },
  "semanticFrame": "Deciding",
  "confidence": 0.85
}
```

---

### Phase 2: Weeks 4-6 - JSON-LD Context Addition

**Trigger:** After hitting 85%+ accuracy on IEE test corpus

**TagTeam Responsibility:**
- Add JSON-LD `@context` to output (~10 lines)
- Use exact context file provided by IEE
- Maintain backward compatibility with Phase 1 output

**IEE Responsibility:**
- Provide the canonical `@context` file
- Define semantic mappings for frames, roles, entities
- Ensure context enables semantic web integration

**Expected Output:**
```json
{
  "@context": "https://iee.example.org/contexts/tagteam-v1.jsonld",
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
  "patient": {
    "text": "treatment",
    "role": "patient",
    "entity": "medical_procedure",
    "posTag": "NN"
  },
  "semanticFrame": "Deciding",
  "confidence": 0.85
}
```

**What the @context enables:**
- Maps `semanticFrame: "Deciding"` to ontology IRIs
- Maps `role: "agent"` to BFO/semantic web predicates
- Enables RDF triple extraction on IEE's side
- Unlocks SPARQL queries, reasoning, knowledge graph integration

**Implementation Effort:** Minimal (~10 lines in TagTeam code)

---

### Phase 3: Month 3+ - Full BFO Alignment (If Needed)

**Trigger:** After proving value with Phases 1-2

**Collaboration Scope:**
- Governance features requiring provenance
- Audit trails requiring process metadata
- Advanced reasoning requiring BFO grounding

**TagTeam Responsibility:**
- Model assertions as occurrents (if needed)
- Add provenance metadata (agent, timestamp, context)
- Implement SHML middle layer (if needed)

**IEE Responsibility:**
- Define governance requirements
- Specify audit trail needs
- Validate BFO conformance

**Decision Point:** Only proceed if business value is proven

---

## Why This Approach Works

### 1. Separation of Concerns ✅

**TagTeam focuses on:**
- Natural language parsing accuracy
- Role extraction precision
- Frame classification quality
- Context and value detection

**IEE focuses on:**
- Semantic lifting (JSON → RDF)
- Ontology mapping
- Knowledge graph construction
- Governance and audit

**Result:** Each team works in their area of expertise

---

### 2. Incremental Semantic Enhancement ✅

**Phase 1:** Flat JSON (simple, fast, debuggable)
**Phase 2:** JSON-LD context (semantic web compatible, minimal code change)
**Phase 3:** Full BFO (only if business value proven)

**Result:** No over-engineering, no premature optimization

---

### 3. Validates the Reality Check Assessment ✅

From [GAP_ANALYSIS_REALITY_CHECK.md](../../../docs/architecture/GAP_ANALYSIS_REALITY_CHECK.md):

> "Gap analysis shows BFO examples as **aspirational**, not implemented in POC"
> "POC uses JSON-LD in GDCService component, not primary output"
> "Recommendation: Clarify what's implemented vs. what's research vision"

**IEE's plan confirms:**
- Phase 1 = Current implementation (flat JSON)
- Phase 2 = JSON-LD context (minimal semantic lift)
- Phase 3 = Full BFO (research vision, conditional on value)

**Result:** Our reality check was accurate, and IEE's plan matches our recommendations

---

## Impact on Gap Analysis Documents

### SEMANTIC_GAP_ANALYSIS.md - Now Strategic Roadmap

The gap analysis document remains valuable as a **long-term vision**, but should be understood as:

**Phase 1 (Current):**
- ✅ Current TagTeam implementation
- ✅ Meets IEE Week 1-3 requirements

**Phase 2 (Weeks 4-6):**
- ⚠️ JSON-LD context addition (not full graph output)
- ⚠️ Semantic mappings defined by IEE, not TagTeam

**Phase 3 (Month 3+):**
- 📋 POS Graph POC capabilities (dependency graphs, relations)
- 📋 BFO/SHML vision (intentional acts, provenance)
- 📋 Conditional on business value

### GAP_ANALYSIS_REALITY_CHECK.md - Validated by IEE Response

The reality check identified:
- Current system does syntactic role labeling ✅
- POC had semantic dependency parsing ✅
- BFO/SHML are aspirational ✅
- JSON-LD was partial (only GDCService) ✅

**IEE's response confirms:** All assessments were accurate.

---

## Revised Priorities for Week 2-3

### Week 2: Context Analysis

**Focus:** Parsing accuracy for context dimensions
- Person count detection
- Autonomy stake assessment
- Relationship type classification
- Public/private setting detection
- Value conflict identification

**Format:** Flat JSON (consistent with Phase 1)
**Semantic Lifting:** IEE handles

**Example Output:**
```json
{
  "agent": { "text": "I", "entity": "self" },
  "action": { "verb": "remove", "modality": "should" },
  "context": {
    "personsInvolved": 2,
    "autonomyAtStake": "high",
    "relationshipType": "family",
    "setting": "private",
    "valueConflict": true
  },
  "semanticFrame": "Deciding",
  "confidence": 0.82
}
```

**NO NEED FOR:**
- Dependency graphs (defer to Phase 3)
- BFO grounding (defer to Phase 3)
- Provenance metadata (defer to Phase 3)

### Week 3: Value Matching

**Focus:** Parsing accuracy for value detection
- Value terms extraction
- Value category classification
- Conflict detection

**Format:** Flat JSON (consistent with Phase 1)

---

## What Changes in Our Development

### ✅ Continue (No Change):
1. Flat JSON output
2. Focus on parsing accuracy
3. IEE format compliance
4. Test corpus validation
5. Week 2-3 deliverables as planned

### ❌ Defer (No Longer Week 2-3 Scope):
1. Dependency graph output
2. Wikidata linking integration
3. BFO intentional act modeling
4. SHML middle layer implementation
5. Process provenance metadata

### 📋 Plan (Phase 2 - Weeks 4-6):
1. JSON-LD `@context` integration
2. Use IEE-provided context file
3. Test semantic web compatibility

### 🔮 Research (Phase 3 - Month 3+):
1. POS Graph POC capabilities (if needed)
2. Full BFO alignment (if needed)
3. SHML architecture (if governance requires it)

---

## Communication with IEE

### What to Share:

1. **Acknowledgment:** "We appreciate the phased approach and agree it's the right strategy"
2. **Week 1 Status:** "Week 1 deliverable ready for validation (delivered Jan 10)"
3. **Week 2-3 Plan:** "Focusing on parsing accuracy for context and values, using flat JSON format"
4. **Phase 2 Readiness:** "Ready to integrate JSON-LD @context once accuracy threshold is met"
5. **Phase 3 Interest:** "Interested in exploring BFO alignment if governance features prove valuable"

### What to Request:

1. **Week 1 Validation Results:** "Please validate our Week 1 output and confirm accuracy baseline"
2. **Context File Preview:** "Can we see a draft @context file to prepare for Phase 2?"
3. **Accuracy Targets:** "Confirm Week 2-3 accuracy targets (still 75%? Or higher?)"

---

## Updated Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Phase 1 (Weeks 1-3)                     │
│                                                                 │
│  TagTeam Parser                                                 │
│  ┌──────────────┐                                               │
│  │ Lexicon      │  ──→  POS Tagger  ──→  Role Extractor        │
│  │ (4.15 MB)    │                                               │
│  └──────────────┘                                               │
│                                                                 │
│  Output: Flat JSON                                              │
│  { agent: {...}, action: {...}, semanticFrame: "..." }          │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  IEE Semantic Lifting Infrastructure                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  - JSON → RDF conversion                                 │  │
│  │  - Ontology mapping                                      │  │
│  │  - Knowledge graph construction                          │  │
│  │  - Reasoning and inference                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         Phase 2 (Weeks 4-6)                     │
│                                                                 │
│  TagTeam Parser (+ @context)                                    │
│  Output: JSON-LD                                                │
│  {                                                              │
│    "@context": "https://iee.../contexts/tagteam-v1.jsonld",     │
│    "agent": {...},                                              │
│    "action": {...}                                              │
│  }                                                              │
│                                                                 │
│  ↓ (Direct RDF conversion, no mapping needed)                  │
│                                                                 │
│  IEE Knowledge Graph (Native Semantic Web)                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Phase 3 (Month 3+, Optional)               │
│                                                                 │
│  TagTeam + BFO/SHML Layer                                       │
│  - Intentional act modeling                                     │
│  - Process provenance                                           │
│  - Audit trails                                                 │
│  - Governance features                                          │
│                                                                 │
│  Only if business value proven                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary: What This Means

### For Week 2-3 Development:
✅ **No architecture changes needed** - Continue with flat JSON
✅ **Focus on accuracy** - IEE's primary concern
✅ **Defer semantic complexity** - IEE handles lifting

### For Long-Term Vision:
✅ **Semantic goals preserved** - Phase 2-3 path is clear
✅ **BFO/SHML research validated** - Recognized as valuable for governance
✅ **Pragmatic timeline** - Prove value before over-engineering

### For Repository Structure:
✅ **Gap analysis remains valuable** - Shows long-term roadmap
✅ **Reality check was accurate** - Correctly identified implementation vs. aspiration
✅ **Research papers guide Phase 3** - BFO intentionality and SHML architecture

---

## Next Actions

### Immediate (Today):
1. ✅ Document IEE's phased approach (this file)
2. ⏳ Update SEMANTIC_GAP_ANALYSIS.md with phase labels
3. ⏳ Confirm Week 2 scope focuses on parsing accuracy (not semantic architecture)

### Week 2 (Jan 13-17):
1. Implement context analysis (flat JSON output)
2. Test against IEE scenarios
3. Validate accuracy ≥75%

### Week 3 (Jan 20-24):
1. Implement value matching (flat JSON output)
2. Test against IEE scenarios
3. Target accuracy 80-85% for Phase 2 trigger

### Weeks 4-6 (If 85%+ accuracy achieved):
1. Receive @context file from IEE
2. Add ~10 lines to integrate JSON-LD context
3. Test semantic web compatibility

---

**Document Version:** 1.0
**Last Updated:** January 11, 2026
**Status:** ✅ Strategy Confirmed with IEE Team
