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

## ENH-002: Question ICE Node (Interrogative Semantics)

**Source:** Test 1.1.0 `linguistic.clause-types.interrogative`
**Input:** "Did the committee approve the budget?"
**Issue:** Questions should generate an Information Content Entity (e.g., `cco:Question` or `tagteam:Inquiry`) that represents the question itself, with `cco:is_about` linking to the hypothetical act. Currently only the act's actuality status is set to `tagteam:Interrogative` — there is no dedicated question node.
**Proposed Fix:** When interrogative mood is detected, create a `tagteam:Inquiry` ICE node with `cco:is_about` pointing to the act. The Tier 1 DiscourseReferent for the sentence could link to this inquiry.
**Priority:** Low-Medium
**Complexity:** Medium — requires new node type and wiring in SemanticGraphBuilder.

---
