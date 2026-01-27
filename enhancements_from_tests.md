# Enhancements from Tests

Capabilities identified during comprehensive testing that require new functionality (not bugs in existing features).

---

## ENH-001: Verb-Context Object Typing (Selectional Restriction on Objects)

**Source:** Test 1.1.0 `linguistic.clause-types.declarative`
**Input:** "The engineer reviewed the design."
**Issue:** "design" is typed `cco:Artifact`, but when the verb is "review" (a cognitive/evaluative act), the object is almost certainly an Information Content Entity (a document/plan), not a physical artifact.
**Proposed Fix:** Use the verb's selectional restrictions to influence object typing. When the verb implies cognitive engagement (review, read, analyze, evaluate, study, examine), prefer `cco:InformationContentEntity` for ambiguous objects like "design", "report", "plan", "document".
**Priority:** Medium
**Complexity:** Medium — requires cross-referencing verb type with object type in EntityExtractor or ActExtractor.

---
