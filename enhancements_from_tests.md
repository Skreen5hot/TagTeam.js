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

## ENH-006: Conditional Clause Detection (If...Then Logic)

**Source:** Test 1.1.4 `linguistic.clause-types.conditional`
**Input:** "If demand increases, expand capacity."
**Issue:** Conditional sentences ("If X, then Y") describe a dependency between potential events. Neither the antecedent nor the consequent has occurred. Currently both acts are marked `tagteam:Actual`, which falsely asserts that the events have happened.
**Proposed Fix:**
1. Detect conditional markers ("if", "when...then", "unless", "provided that") at sentence start or clause boundary.
2. Set the antecedent clause acts to `tagteam:Hypothetical` (the "if" part hasn't happened).
3. Set the consequent clause acts to `tagteam:Conditional` or `tagteam:Prescribed` (depends on whether it's a prediction or command).
4. Create a `tagteam:ConditionalContent` ICE node with `tagteam:has_antecedent` and `tagteam:has_consequent` linking the two clause acts.
**Priority:** High
**Complexity:** High — requires clause boundary detection, conditional marker parsing, actuality propagation per clause, and new ConditionalContent node type.

---

## ENH-007: Compound Sentence Clause Boundary Detection

**Source:** Test 1.1.6 `linguistic.sentence-complexity.compound`
**Input:** "The server rebooted and the application restarted."
**Issue:** Compound sentences join independent clauses with coordinating conjunctions ("and", "but", "or"). Currently entity-verb linking spans across clause boundaries, causing misattribution (e.g., "application" treated as object of "rebooted" when it's actually the subject of "restarted"). Each clause should be parsed independently for agent/patient linking.
**Proposed Fix:**
1. Detect clause boundaries at coordinating conjunctions ("and", "but", "or", "nor", "yet", "so") when preceded by a complete SVO clause.
2. Split entity-verb linking scope to within-clause only.
3. Optionally generate a `cco:ProcessAggregate` or sequential relationship (`tagteam:precedes`, `tagteam:simultaneous_with`) for temporally linked clauses.
**Priority:** High
**Complexity:** High — requires clause boundary detection, NLP sentence segmentation, and scoping entity-verb linking per clause.

---

## ENH-008: Ergative/Unaccusative Verb Agent Demotion (Transitive Context)

**Source:** Test 1.1.6 `linguistic.sentence-complexity.compound`
**Input:** "The server rebooted and the application restarted."
**Issue:** When an ergative verb (reboot, restart, crash) has an inanimate subject AND an apparent direct object (due to cross-clause misattribution), the inanimate subject is still assigned as agent. The current ergative fix only works for intransitive uses (`!links.patient`). Full ergative handling requires clause boundary detection (ENH-007) to distinguish "The server rebooted the app" (transitive, server=agent) from "The server rebooted [and] the app restarted" (intransitive, server=patient).
**Priority:** Medium (depends on ENH-007)
**Complexity:** Medium — already partially implemented; full fix requires clause boundaries.

---

## ENH-009: Temporal "When" Clause Linking

**Source:** Test 1.1.7 `linguistic.sentence-complexity.complex`
**Input:** "When the alarm sounded, the guards responded."
**Issue:** The "When" subordinate clause establishes a temporal relationship between two events: the alarm sounding *precedes* the guards responding. Currently, both acts are extracted independently with no temporal link. The graph should capture the temporal dependency between the antecedent event (alarm sounding) and the consequent event (guards responding).
**Proposed Fix:**
1. Detect temporal subordinating conjunctions ("when", "after", "before", "while", "until", "since", "as soon as") at clause boundaries.
2. Create a `tagteam:temporalRelation` link between the subordinate clause act and the main clause act (e.g., `tagteam:precedes`, `tagteam:simultaneous_with`, `tagteam:follows`).
3. Map conjunction to relation type: "when" → `tagteam:precedes` or `tagteam:simultaneous_with`; "after" → `tagteam:follows`; "before" → `tagteam:precedes`; "while" → `tagteam:simultaneous_with`.
**Priority:** Medium
**Complexity:** High — requires clause boundary detection (related to ENH-007) and temporal relation vocabulary.

---
