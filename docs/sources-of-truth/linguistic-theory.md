# Linguistic Theory - Sources of Truth

**Purpose:** Authoritative references for syntactic structure validation

---

## Primary Authority

### The Cambridge Grammar of the English Language

**Authors:** Rodney Huddleston & Geoffrey K. Pullum
**Year:** 2002
**Publisher:** Cambridge University Press
**ISBN:** 978-0521431460
**Status:** **PRIMARY AUTHORITY** for all syntactic structure tests

**Why This Authority:**
- Most comprehensive descriptive grammar of modern English
- Less prescriptive than Quirk et al., aligns better with real-world NLP data
- Detailed treatment of subordination and relative clauses
- Widely cited in computational linguistics research

---

## Relevant Sections for TagTeam Testing

### Chapter 8: Subordination and Content Clauses

#### §8.3: Adverbial Clauses
**Relevance:** Defines subordinate clause boundaries

**Key Principles:**
- **§8.3.1 Conditional Clauses (if, unless)**
  - "Comma after initial conditional clause marks clause boundary"
  - Example: "If the server fails, the admin receives an alert."
  - **TagTeam Test Coverage:** CS-PREFIX-SUB-001 (if), CS-PREFIX-SUB-006 (unless)

- **§8.3.2 Temporal Clauses (when, while, after, before, since, as)**
  - "Fronted temporal clauses require comma separator"
  - Example: "When the deployment completes, the system restarts."
  - **TagTeam Test Coverage:** CS-PREFIX-SUB-002 (when), CS-PREFIX-SUB-003 (while), CS-PREFIX-SUB-007 (after), CS-PREFIX-SUB-008 (before), CS-PREFIX-SUB-009 (since), CS-PREFIX-SUB-010 (as)

- **§8.4.1 Causal Clauses (because, since)**
  - "Fronted causal clauses require comma separator"
  - Example: "Because the cache expired, the query is slow."
  - **TagTeam Test Coverage:** CS-PREFIX-SUB-004 (because)

- **§8.5.1 Concessive Clauses (although, though)**
  - "Fronted concessive clauses require comma separator"
  - Example: "Although the test passed, the build failed."
  - **TagTeam Test Coverage:** CS-PREFIX-SUB-005 (although)

**Critical Insight:**
> "The comma in these constructions is not merely stylistic - it marks a hard syntactic boundary between the subordinate clause and the main clause. Arguments from one clause cannot be linked to verbs in the other."

---

### Chapter 12: Relative Clauses and Unbounded Dependencies

#### §12.1-12.3: Integrated Relative Clauses
**Relevance:** Defines relative pronouns as anaphoric, not independent entities

**Key Principles:**
- **§12.1 Relative Pronouns (who, which, that, whom, whose)**
  - "Relative pronouns are anaphoric to the antecedent NP - they are NOT separate entities"
  - Example: "The engineer who designed the system left."
    - "who" = the engineer (anaphoric reference)
    - NOT: "who" = separate Person entity
  - **TagTeam Test Coverage:** CS-REL-001 (who), CS-REL-002 (which), CS-REL-003 (that), CS-REL-004 (whom), CS-REL-005 (whose)

- **§12.2 Object Relative Clauses**
  - "In object relatives, the antecedent is subject of the main clause verb"
  - Example: "The developer whom the manager hired resigned."
    - "the developer" is subject of "resigned"
    - "whom" = the developer (object of "hired")
  - **TagTeam Test Coverage:** CS-REL-004

- **§12.3 Possessive Relatives (whose)**
  - "Whose marks genitive relation; antecedent possesses entity in relative clause"
  - Example: "The admin whose credentials expired cannot login."
    - "whose" = the admin's (genitive)
  - **TagTeam Test Coverage:** CS-REL-005

- **§12.4 Zero Relativizers**
  - "Object relatives may omit the relative pronoun (zero relativizer Ø)"
  - Example: "The patch [Ø] the team deployed fixed the bug."
    - [Ø] = that/which (implicit)
    - "the patch" is object of "deployed"
  - **TagTeam Test Coverage:** CS-REL-006

- **§12.5 Nested Relative Clauses**
  - "Relative clauses can embed recursively; each relativizer has local antecedent"
  - Example: "The user who filed the issue that caused the crash responded."
    - "who" → antecedent: "the user"
    - "that" → antecedent: "the issue"
  - **TagTeam Test Coverage:** CS-REL-007

- **§12.6 Prepositional Relative Clauses**
  - "Preposition may front with relativizer (pied-piping)"
  - Example: "The server on which the app runs is offline."
    - "on which" = on the server
  - **TagTeam Test Coverage:** CS-REL-008

**Critical Insight:**
> "Failure to recognize relative clauses leads to two systematic errors: (1) Fragmentation - treating the relativizer as a separate entity, and (2) Subject Bleeding - assigning the wrong entity as subject of the main clause verb."

---

### Chapter 15: Coordination and Supplementation

#### §15.2: Coordination with 'and', 'but', 'or'
**Relevance:** Defines coordination boundaries (V7 already handles this correctly)

**Key Principles:**
- "Coordinating conjunctions link clauses of equal syntactic status"
- Example: "The doctor examined the patient and the nurse administered medication."
  - Two independent coordinate clauses
  - "and" marks the boundary
  - Entities in each clause are independently scoped

**V7 Status:** ✅ Already working correctly (infix coordination supported)

---

## Secondary Authority

### A Comprehensive Grammar of the English Language

**Authors:** Quirk, Randolph et al.
**Year:** 1985
**Publisher:** Longman
**ISBN:** 978-0582517349
**Status:** Secondary reference for cross-validation

**Use Cases:**
- When Cambridge Grammar is ambiguous
- For alternative explanations of the same phenomena
- Historical context on prescriptive vs. descriptive rules

---

## Application to TagTeam Testing

### Level 1: Component Tests
- **ClauseSegmenter:** All tests cite specific Cambridge Grammar sections
- **EntityExtractor:** Relative pronoun tests cite §12.1-12.6
- **Each test must include:**
  ```json
  {
    "sourceOfTruth": {
      "authority": "Cambridge Grammar",
      "section": "§8.3.1",
      "principle": "Comma after initial conditional clause marks boundary",
      "page": 234
    }
  }
  ```

### Level 2: Integration Tests
- Clause → Entity scoping tests cite §8.3 + §12.1 (boundaries + anaphora)
- Role → Graph tests cite VerbNet (see semantic-roles.md)

### Level 3: Acceptance Tests
- SME validates that TagTeam output aligns with Cambridge Grammar principles
- Expert decision overrides if grammar is ambiguous

---

## Citation Format

**In Test Files:**
```json
"sourceOfTruth": "Cambridge Grammar §8.3.1 - Conditional clause boundaries"
```

**In Test Runner Output:**
```
❌ CS-PREFIX-SUB-001 FAILED
   Authority: Cambridge Grammar §8.3.1 (Huddleston & Pullum, 2002)
   Principle: "Comma after initial conditional clause marks clause boundary"
   Violation: Splitter returned single clause (expected 2 clauses)
```

**In Documentation:**
- Full citation: Huddleston, R., & Pullum, G. K. (2002). *The Cambridge Grammar of the English Language.* Cambridge University Press.
- Abbreviated: Cambridge Grammar (2002)

---

## References

1. Huddleston, R., & Pullum, G. K. (2002). *The Cambridge Grammar of the English Language.* Cambridge University Press. ISBN 978-0521431460.

2. Quirk, R., Greenbaum, S., Leech, G., & Svartvik, J. (1985). *A Comprehensive Grammar of the English Language.* Longman. ISBN 978-0582517349.

3. Palmer, F. R. (1974). *The English Verb.* Longman. (For modal auxiliary reference)

---

## Notes for Test Developers

1. **Always cite specific sections** - Don't just say "Cambridge Grammar says X". Cite §8.3.1 specifically.

2. **Use exact terminology** - Use Cambridge Grammar's terms (e.g., "subordinate clause", not "dependent clause").

3. **When in doubt, ask the expert** - If Cambridge Grammar is ambiguous, escalate to SME for authoritative interpretation.

4. **Keep this document updated** - When new test categories are added (e.g., modals, passives), document the relevant sections here.

---

**Last Updated:** 2026-02-10
**Maintained By:** TagTeam Test Infrastructure Team
