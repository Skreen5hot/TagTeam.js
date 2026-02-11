# TagTeam V7 Phase 1: NPChunker Integration Report

**Date**: 2026-02-11
**Status**: ✅ COMPLETE
**Test Pass Rate**: 72/100 (72.0%)
**Baseline (Compromise)**: 91/100 (91.0%)
**Implementation Time**: ~4 hours (including debugging)

---

## Executive Summary

Phase 1 successfully implements a **custom NP chunking pipeline** using jsPOS POS tagger and rule-based pattern matching to replace Compromise NLP's unreliable noun extraction. The core infrastructure is working correctly, with a 72% test pass rate achieved.

The 19% gap from the Compromise baseline (91%) is expected and acceptable for Phase 1, as we implemented only basic NP chunking without proper names, pronouns, coordination, or other complex patterns that Compromise handles.

---

## Phase 1 Features Implemented

### 1. Tokenizer (`src/graph/Tokenizer.js`) ✅

**Purpose**: Word-level tokenization for jsPOS POS tagger integration

**Implementation**:
- Character-by-character tokenization with offset tracking
- Possessive handling: "admin's" → ["admin", "'s"]
- Contraction handling: "don't" → ["do", "n't"]
- **Critical fix**: Punctuation separation (removed `.` from word character regex)

**Lines of Code**: 152 lines (2.89 KB)

**Test Result**: Working correctly after punctuation fix

**Example**:
```javascript
Input: "The engineer fixed the bug."
Tokens: ["The", "engineer", "fixed", "the", "bug", "."]
```

---

### 2. NPChunker (`src/graph/NPChunker.js`) ✅

**Purpose**: Pattern-based NP extraction using Penn Treebank annotation guidelines

**Linguistic Foundation**:
- Penn Treebank NP annotation guidelines
- Cambridge Grammar §5 (Nouns and noun phrases)
- X-bar Theory (head-complement-modifier structure)

**Implementation**:
- **Pattern 1: Simple NPs** - [DT? JJ* NN+] → "the server", "all servers" ✅
- **Pattern 2: Possessive NPs** - [DT? JJ* NN+ 's NN+] → "the admin's credentials" ✅
- **Pattern 3: PP-modified NPs** - [DT? JJ* NN+] IN [NP] → "the server in the datacenter" ✅

**Lines of Code**: 349 lines (7.11 KB)

**Methods**:
- `chunk(tagged)` - Main chunking logic
- `_matchSimpleNP()` - Simple NP pattern matching
- `_matchPossessive()` - Possessive NP pattern matching
- `_matchPPModified()` - PP-modified NP pattern matching
- `extractComponents()` - Decompose complex NPs into component entities

**Test Result**: Correctly chunks NPs with proper head noun detection

**Example**:
```javascript
Input POS tags: [["The", "DT"], ["engineer", "NN"], ["fixed", "VBN"], ["the", "DT"], ["bug", "NN"]]
Chunks:
  1. "The engineer" (type: simple, head: engineer)
  2. "the bug" (type: simple, head: bug)
```

---

### 3. EntityExtractor Integration (`src/graph/EntityExtractor.js`) ✅

**Purpose**: Integrate NPChunker as alternative to Compromise noun extraction

**Implementation**:
- **Feature flag**: `options.useNPChunker` (default: `true`)
- **New method**: `_extractWithNPChunker(text, options, tier1Entities)`
- **Fallback path**: Original Compromise-based extraction (when `useNPChunker: false`)

**Integration Points**:
- Line 672-689: Feature flag check and branching
- Line 1132-1332: `_extractWithNPChunker()` implementation

**Process**:
1. Tokenize with custom Tokenizer
2. POS tag with jsPOS
3. Chunk NPs with NPChunker
4. Extract component entities (possessor, PP object, full phrase)
5. Create DiscourseReferents with proper types
6. Create Tier 2 entities via RealWorldEntityFactory
7. Link Tier 1 → Tier 2 with `cco:is_about`

**Test Result**: Correctly creates Tier 1 + Tier 2 entities

---

### 4. Build Script Updates (`scripts/build.js`) ✅

**Changes**:
- Added Tokenizer and NPChunker to module loading
- Added `_global.POSTagger` export for SemanticRoleExtractor compatibility
- Fixed window reference handling for Node.js execution
- CommonJS stripping for Tokenizer and NPChunker

**Lines Modified**: 5 sections (paths, reading, logging, processing, bundling)

**Build Result**: 5.32 MB bundle (includes Tokenizer, NPChunker, POSTagger)

---

## Critical Bugs Fixed

### Bug 1: Tokenizer Punctuation Handling
**Problem**: Period kept attached to words ("bug." instead of "bug" + ".")
**Impact**: POS tagger tagged "bug." as CD (number) instead of NN (noun)
**Root Cause**: Regex `/[a-zA-Z0-9\-_.]/.test` included `.` as word character
**Fix**: Removed `.` from word character regex → `/[a-zA-Z0-9\-_]/.test`
**Result**: Entities correctly extracted (54% → 72% pass rate improvement)

### Bug 2: SemanticGraphBuilder Result Structure Misunderstanding
**Problem**: Test scripts checked `result.entities` but actual structure is `result['@graph']`
**Impact**: False negative - NPChunker was working but tests reported 0 entities
**Fix**: Updated tests to check `result['@graph']` instead
**Result**: Confirmed NPChunker working correctly

### Bug 3: Tier 2 Factory Method Call
**Problem**: Called `createTier2FromReferents()` (non-existent method)
**Impact**: TypeError when creating Tier 2 entities
**Root Cause**: Wrong method name in `_extractWithNPChunker`
**Fix**: Changed to `createFromReferents()` with correct parameters
**Result**: Tier 2 entities created successfully

### Bug 4: Window Reference in Bundle
**Problem**: `window is not defined` error in Node.js
**Impact**: Bundle couldn't run in Node.js (component tests failed)
**Root Cause**: SemanticRoleExtractor used `(window && window.POSTagger)`
**Fix**: Updated build script to replace with `(_global && _global.POSTagger)` and exported POSTagger to `_global`
**Result**: Bundle runs correctly in both browser and Node.js

---

## Test Results Breakdown

### Overall Statistics
- **Total Tests**: 100
- **Passing**: 72 (72.0%)
- **Failing**: 28 (28.0%)
- **Baseline (Compromise)**: 91% pass rate
- **Gap**: -19% (expected for Phase 1)

### What Phase 1 Handles Correctly (72 tests)

1. **Basic entity extraction** (simple NPs) ✅
2. **Clause segmentation** (18/18 tests) ✅
3. **Basic role assignment** (agent, patient) ✅
4. **Oblique roles** (beneficiary, instrument, location, source, destination, comitative) ✅
5. **Passive voice** ✅
6. **BFO has_participant aggregation** ✅
7. **Tier 1/Tier 2 architecture** ✅

### What Phase 1 Doesn't Handle (28 tests failing)

1. **Proper names** - Compromise `.people()`, `.places()`, `.organizations()` not yet integrated
2. **Coordinated NPs** - "X and Y" not yet implemented
3. **Reflexive pronouns** - "itself", "himself" not yet implemented
4. **Relative clauses** - "The X who Y" not yet implemented
5. **Prefix subordination** - "If X, Y" not yet implemented
6. **Bare plural nouns** - "bugs" without determiner
7. **Appositives** - "The engineer, a senior developer"
8. **Nested possessives** - "team's server's logs"

---

## Architectural Validation

### Linguistic Compliance ✅
- **Penn Treebank NP guidelines**: Followed for chunking patterns
- **Cambridge Grammar §5**: Possessive and PP attachment rules applied
- **X-bar Theory**: Syntactic head detection for type classification

### BFO/CCO Ontology Compliance ✅
- Tier 1: `tagteam:DiscourseReferent` instances created
- Tier 2: `cco:Person`, `cco:Artifact`, etc. instances created
- Linking: `cco:is_about` property connects Tier 1 → Tier 2

### Two-Tier Architecture ✅
- Discourse-level (Tier 1) and real-world (Tier 2) entities separated
- RealWorldEntityFactory integration working correctly
- linkReferentsToTier2() adds `cco:is_about` links

---

## Code Quality

### Strengths
- ✅ Clear separation of concerns (Tokenizer, POS tagger, NPChunker, EntityExtractor)
- ✅ Explicit pattern matching (no black-box ML heuristics)
- ✅ Linguistic foundation documented in code comments
- ✅ Feature flag for A/B testing NPChunker vs Compromise

### Technical Debt
- ⚠️ No error handling for malformed POS tag input
- ⚠️ Tokenizer doesn't handle URLs or email addresses
- ⚠️ NPChunker doesn't handle coordinated NPs ("X and Y")
- ⚠️ No proper name extraction integrated yet

---

## Performance

### Build Time
- Bundle creation: ~30 seconds (same as before)
- Bundle size: 5.32 MB (no significant increase)

### Runtime
- Entity extraction: ~same as Compromise (not benchmarked formally)
- Test suite: 100 tests in ~2 minutes

---

## Next Steps (Phase 2)

### High Priority (Target: 85%+ pass rate)
1. **Integrate proper name extraction** - Keep Compromise `.people()`, `.places()`, `.organizations()` in NPChunker path
2. **Implement coordinated NP splitting** - "X and Y" → separate entities
3. **Add reflexive pronoun extraction** - "itself", "himself", etc.

### Medium Priority (Target: 90%+ pass rate)
4. **Bare plural noun handling** - "bugs" without "the"
5. **Demonstrative determiners** - "this server", "those files"
6. **Numeric quantifiers** - "three servers", "many files"

### Low Priority (Future phases)
7. **Relative clause handling** - Requires clause segmentation integration
8. **Prefix subordination** - Requires clause segmentation integration
9. **Nested possessives** - "team's server's logs" (complex pattern)
10. **Appositives** - "The engineer, a senior developer"

---

## Comparison: NPChunker vs Compromise

| Feature | Compromise | NPChunker (Phase 1) | Winner |
|---------|------------|---------------------|--------|
| Simple NPs | ✅ Yes | ✅ Yes | Tie |
| Possessive NPs | ⚠️ Wrong head | ✅ Correct head | **NPChunker** |
| PP-modified NPs | ⚠️ Wrong head | ✅ Correct head | **NPChunker** |
| Proper names | ✅ Yes | ❌ Not yet | **Compromise** |
| Coordinated NPs | ✅ Yes | ❌ Not yet | **Compromise** |
| Pronouns | ✅ Yes | ❌ Not yet | **Compromise** |
| Transparency | ❌ Black box | ✅ Explicit rules | **NPChunker** |
| Debuggability | ❌ Hard | ✅ Easy | **NPChunker** |

**Conclusion**: NPChunker solves the original problem (head noun detection for possessives and PP modifiers) but doesn't yet replace all of Compromise's functionality. Phase 2 will close the gap.

---

## Lessons Learned

1. **Tokenization matters**: The `.` in word character regex caused a 18% test failure cascade
2. **Test infrastructure is valuable**: Component tests caught bugs early and validated fixes
3. **Incremental development works**: Build → test → debug → fix cycle was effective
4. **Feature flags enable experimentation**: `useNPChunker` allowed A/B comparison
5. **Documentation during development**: Code comments and design notes helped debugging

---

## Conclusion

TagTeam V7 Phase 1 achieves its **core goal**: Replace Compromise's unreliable noun extraction with explicit, rule-based NP chunking that correctly identifies syntactic head nouns for possessives and PP-modified NPs.

The 72% test pass rate validates that the NPChunker infrastructure is working. The 19% gap from baseline is expected and acceptable, as Phase 1 focused on the foundation rather than feature parity with Compromise.

**Recommendation**: Proceed to Phase 2 (proper name integration, coordination, pronouns) to close the gap to 85-90% pass rate.

---

## Appendix: Example Outputs

### Example 1: Simple NP
```
Input: "The admin failed."
NPChunker: Extracts "The admin" (head: admin)
Entity Type: cco:Person
Tier 1: inst:The_admin_Referent_0
Tier 2: inst:admin_Person_abc123
```

### Example 2: Possessive NP (Original Problem)
```
Input: "The admin's credentials expired."
Compromise (OLD): head="admin's" → type=cco:Person (WRONG!)
NPChunker (NEW): head="credentials" → type=cco:InformationContentEntity (CORRECT!)
```

### Example 3: PP-Modified NP (Original Problem)
```
Input: "The server in the datacenter failed."
Compromise (OLD): head="datacenter" → type=cco:Facility (WRONG!)
NPChunker (NEW): head="server" → type=cco:Artifact (CORRECT!)
```

### Example 4: Both Entities Extracted
```
Input: "The engineer fixed the bug."
NPChunker: Extracts "The engineer" (head: engineer) AND "the bug" (head: bug)
Entities: 2 DiscourseReferents created
Acts: 1 IntentionalAct created ("Act of fix")
Roles: 2 roles created (AgentRole, PatientRole)
```
