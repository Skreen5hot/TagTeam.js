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

**Source:** Test 1.1.1 `linguistic.clause-types.interrogative`
**Input:** "Did the committee approve the budget?"
**Issue:** Questions should generate an Information Content Entity (e.g., `cco:Question` or `tagteam:Inquiry`) that represents the question itself, with `cco:is_about` linking to the hypothetical act. Currently only the act's actuality status is set to `tagteam:Interrogative` — there is no dedicated question node.
**Proposed Fix:** When interrogative mood is detected, create a `tagteam:Inquiry` ICE node with `cco:is_about` pointing to the act. The Tier 1 DiscourseReferent for the sentence could link to this inquiry.
**Priority:** Low-Medium
**Complexity:** Medium — requires new node type and wiring in SemanticGraphBuilder.

---

## ENH-003: Implicit Agent for Imperatives

**Source:** Test 1.1.2 `linguistic.clause-types.imperative`
**Input:** "Submit the report by Friday."
**Issue:** Imperative sentences have an implicit "you" agent. Currently the act has no `cco:has_agent` because no subject entity is extracted. The parser should create an implicit `cco:Person` entity for the addressee ("you") and assign it as the agent.
**Proposed Fix:** When imperative mood is detected and no explicit agent is found, create a synthetic entity with `rdfs:label: "you"`, `tagteam:referentialStatus: "deictic"`, `tagteam:denotesType: "cco:Person"` and link it as the act's agent.
**Priority:** Medium
**Complexity:** Low-Medium — synthetic entity creation in ActExtractor or SemanticGraphBuilder when imperative + no agent.

---

## ENH-004: Directive ICE Node (Imperative Semantics)

**Source:** Test 1.1.2 `linguistic.clause-types.imperative`
**Input:** "Submit the report by Friday."
**Issue:** Imperative sentences express a directive speech act. There should be a `tagteam:DirectiveContent` ICE node representing the command, with `cco:is_about` linking to the prescribed act. This parallels ENH-002 (Question ICE for interrogatives).
**Proposed Fix:** When imperative mood is detected, create a `tagteam:DirectiveContent` ICE node with `cco:is_about` pointing to the prescribed act. This captures the illocutionary force of the utterance.
**Priority:** Low-Medium
**Complexity:** Medium — requires new node type and wiring, similar to ENH-002.

---

## ENH-005: Exclamatory Semantics (ValueAssertion / Evaluation Node)

**Source:** Test 1.1.3 `linguistic.clause-types.exclamatory`
**Input:** "What a disaster the launch was!"
**Issue:** Exclamatory sentences express an evaluation or emotional judgment. The graph should capture this via a `tagteam:ValueAssertionEvent` or `cco:InformationContentEntity` (Assessment) node that asserts a quality relationship: `Launch has_quality Disastrous`. Currently no evaluation node is generated — only the entities are extracted.
**Proposed Fix:** When exclamatory mood is detected (e.g., "What a...!" pattern, trailing `!`), generate a `tagteam:ValueAssertionEvent` node with `cco:is_about` linking to the subject entity and `bfo:has_quality` linking to the predicated quality. The predicative nominative pattern ("X was a Y") should assign Y as a quality of X rather than treating both as independent entities.
**Priority:** Medium
**Complexity:** High — requires exclamatory mood detection, predicative nominative parsing, and new ValueAssertion node generation in SemanticGraphBuilder.

---
