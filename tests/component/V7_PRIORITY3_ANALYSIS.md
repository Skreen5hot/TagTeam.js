# Priority 3: Analysis of Remaining 20 Failures (80% → 85%+ Target)

**Date**: 2026-02-11
**Current Status**: 80/100 tests passing (80%)
**Target**: 85%+ (17 failures or fewer)
**Gap**: Need to fix 3+ additional tests

## Failure Categorization

### Category 1: PP Modifier Type Classification (2 tests) ⭐ HIGH IMPACT
**Pattern**: Compound NPs with prepositional modifiers get wrong type (uses modifier type instead of head type)

**Tests Affected**:
- **EE-COMPLEX-001** (P1): "The server in the datacenter failed."
  - Expected: `cco:Artifact` (from "server")
  - Actual: `cco:Facility` (from "datacenter")

- **EE-PROPER-004** (P2): "The server in Seattle failed."
  - Expected: `cco:Artifact` (from "server")
  - Actual: `cco:GeopoliticalEntity` (from "Seattle")

**Root Cause**:
- Compromise NLP does not reliably identify syntactic head nouns for PP-modified NPs
- Type classification uses the wrong noun (the PP object instead of the main noun)
- This is the exact issue identified in V7.3 attempt (see MEMORY.md)

**Solution Path**:
- Custom `_extractHeadNoun()` method for PP-modified NPs
- Use leftmost noun before the preposition as head
- Pattern: "X [PREP] Y" → head = X

**Expected Improvement**: +2 tests (80% → 82%)

---

### Category 2: Oblique Role Assignment (9 tests) ⭐⭐ HIGHEST IMPACT
**Pattern**: Verbs with PP arguments don't detect patient roles correctly

**Tests Affected**:
- RA-BASIC-007 (P2): "The user received an alert." - missing patient
- RA-INDIRECT-001 (P1): "The admin sent the user an alert." - ditransitive missing second patient
- RA-INDIRECT-002 (P2): "The engineer fixed the bug for the team." - missing patient with beneficiary
- RA-INDIRECT-003 (P2): "The admin configured the server with the script." - missing patient with instrument
- RA-INDIRECT-004 (P2): "The engineer installed the patch on the server." - missing patient with location
- RA-INDIRECT-005 (P2): "The user downloaded the file from the server." - missing patient with source
- RA-INDIRECT-006 (P2): "The admin uploaded the file to the server." - missing patient with destination
- RA-COMPLEX-005 (P2): "The admin sent the engineer the file from the server." - complex ditransitive
- RA-AMBIG-001 (P2): "The engineer fixed the bug with the patch." - ambiguous instrument/comitative

**Root Cause**:
- ActExtractor's patient detection may conflict with oblique role detection
- When oblique roles are detected (beneficiary, instrument, location, etc.), patient detection skips the direct object
- This is a REGRESSION from V7.1 where oblique roles were added

**Solution Path**:
- Review ActExtractor's argument linking logic (lines 400-600 in ActExtractor.js)
- Patient detection should run BEFORE oblique detection, not after
- Oblique roles should consume PPs, not direct objects

**Expected Improvement**: +9 tests (80% → 89%) 🎯

---

### Category 3: Proper Name Type Edge Cases (2 tests)
**Pattern**: Ambiguous or titled proper names get wrong types

**Tests Affected**:
- **EE-PROPER-005** (P2): "Windows crashed."
  - Expected: `cco:Artifact` (the OS)
  - Actual: `bfo:BFO_0000040` (default type)
  - Issue: Compromise doesn't detect "Windows" as organization/artifact

- **EE-PROPER-006** (P2): "Dr. Smith examined the patient."
  - Expected count: 2 entities ("Dr. Smith" + "the patient")
  - Actual count: 4 entities
  - Expected type for "Dr. Smith": `cco:Person`
  - Actual type: `bfo:BFO_0000040`
  - Issue: Title "Dr." causes fragmentation or duplication

**Solution Path**:
- Add lexicon for known proper names (Windows, Linux, etc.) → cco:Artifact
- Handle title patterns (Dr., Mr., Ms., Prof., etc.) in proper name extraction

**Expected Improvement**: +2 tests (would reach 82% if done alone, or 91% combined with Category 2)

---

### Category 4: Abstract/Measurement Entity Types (2 tests)
**Pattern**: Abstract nouns and measurements get default type instead of bfo:Quality

**Tests Affected**:
- **EE-TYPE-004** (P2): "The datacenter lost power."
  - Expected type for "power": `bfo:Quality`
  - Actual: `bfo:BFO_0000040`

- **EE-TYPE-005** (P2): "The server consumed 100GB of memory."
  - Expected type for "100GB of memory": `bfo:Quality`
  - Actual: `bfo:BFO_0000040`

**Solution Path**:
- Add abstract noun detection (power, energy, strength, etc.) → bfo:Quality
- Add measurement pattern detection (NUMBER + UNIT + of + NOUN) → bfo:Quality

**Expected Improvement**: +2 tests

---

### Category 5: Minor Entity Issues (4 tests)
**Lower priority fixes**:

- **EE-BASIC-004** (P1): "An admin received an alert." - Missing "an alert" entity
  - This might be related to Category 2 (role assignment issue)

- **EE-COMPLEX-010** (P2): "The engineer, a senior developer, deployed the patch."
  - Appositive handling creates 3 entities instead of 2
  - Need appositive detection and merging

- **EE-TYPE-006** (P2): "The server failed yesterday."
  - Temporal adverb "yesterday" extracted as entity (should be filtered)

- **CS-REL-002** (P1): "The database which stores user data crashed."
  - Relative clause fragmentation (relativizer "which" as separate entity)
  - This is a known V7 limitation (see V7-004 ticket)

**Expected Improvement**: +4 tests (if all fixed)

---

## Recommended Priority 3 Tasks (Ordered by Impact)

### **Task 1: Fix Oblique Role + Patient Detection** ⭐⭐ HIGHEST IMPACT
- **Target**: +9 tests (80% → 89%)
- **Files**: `src/graph/ActExtractor.js`
- **Effort**: Medium (2-3 hours)
- **Rationale**: Fixes 9/20 failures in one shot, gets us to 89% (near Compromise baseline)

### **Task 2: Fix PP Modifier Head Noun Detection** ⭐ HIGH IMPACT
- **Target**: +2 tests (cumulative: 91%)
- **Files**: `src/graph/EntityExtractor.js`
- **Effort**: Medium (1-2 hours)
- **Rationale**: Addresses systematic head noun issue identified in V7.3 attempt

### **Task 3: Fix Proper Name Edge Cases**
- **Target**: +2 tests (cumulative: 93%)
- **Files**: `src/graph/EntityExtractor.js`
- **Effort**: Low-Medium (1 hour)
- **Rationale**: Quick wins with lexicon additions and title handling

### **Task 4: Fix Abstract/Measurement Types**
- **Target**: +2 tests (cumulative: 95%)
- **Files**: `src/graph/EntityExtractor.js`
- **Effort**: Low (30 min - 1 hour)
- **Rationale**: Pattern-based detection, straightforward implementation

---

## Expected Trajectory

| After Task | Pass Rate | Tests Fixed | Cumulative | Notes |
|------------|-----------|-------------|------------|-------|
| Baseline   | 80%       | -           | 80/100     | Priority 2 complete |
| Task 1     | 89%       | +9          | 89/100     | Oblique roles fixed |
| Task 2     | 91%       | +2          | 91/100     | PP head nouns fixed |
| Task 3     | 93%       | +2          | 93/100     | Proper name edges |
| Task 4     | 95%       | +2          | 95/100     | 🎯 **TARGET REACHED** |

---

## Critical Insight: Task 1 is the Bottleneck

**The oblique role regression (Task 1) is blocking 45% of remaining failures (9/20).**

This suggests that the V7.1 implementation of oblique roles (V7-009b) may have introduced a conflict with patient detection. The solution is architectural - not adding new features, but fixing the interaction between patient and oblique role detection.

**Recommendation**: Start with Task 1 to maximize impact, then assess whether Tasks 2-4 are still needed to reach target.
