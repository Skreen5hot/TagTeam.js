# Enhancements from Tests

Capabilities identified during comprehensive testing that require new functionality (not bugs in existing features).

## Scope Classification

Per the **v1/v2 Scope Contract** (2026-01-28), each enhancement is classified:

- **v1** — In scope for v1 stabilization. Improves correctness without structural re-architecture.
- **v2** — Deferred to v2 (Structural Semantics & Normalization). Requires clause segmentation, discourse memory, or structural normalization.

**Guiding principle:** TagTeam.js v1 is an intake compiler, not an AI. Correctness before coverage. Determinism before cleverness.

---

## ENH-001: Verb-Context Object Typing (Selectional Restriction on Objects) `[v1]`

**Source:** Test 1.1.0 `linguistic.clause-types.declarative`
**Input:** "The engineer reviewed the design."
**Issue:** "design" is typed `cco:Artifact`, but when the verb is "review" (a cognitive/evaluative act), the object is almost certainly an Information Content Entity (a document/plan), not a physical artifact.
**Proposed Fix:** Use the verb's selectional restrictions to influence object typing. When the verb implies cognitive engagement (review, read, analyze, evaluate, study, examine), prefer `cco:InformationContentEntity` for ambiguous objects like "design", "report", "plan", "document".
**Priority:** Medium
**Complexity:** Medium — requires cross-referencing verb type with object type in EntityExtractor or ActExtractor.

---

## ENH-002: Question ICE Node (Interrogative Semantics) `[v2]`

**Source:** Test 1.1.1 `linguistic.clause-types.interrogative`
**Input:** "Did the committee approve the budget?"
**Issue:** Questions should generate an Information Content Entity (e.g., `cco:Question` or `tagteam:Inquiry`) that represents the question itself, with `cco:is_about` linking to the hypothetical act. Currently only the act's actuality status is set to `tagteam:Interrogative` — there is no dedicated question node.
**Proposed Fix:** When interrogative mood is detected, create a `tagteam:Inquiry` ICE node with `cco:is_about` pointing to the act. The Tier 1 DiscourseReferent for the sentence could link to this inquiry.
**Priority:** Low-Medium
**Complexity:** Medium — requires new node type and wiring in SemanticGraphBuilder.

---

## ENH-003: Implicit Agent for Imperatives `[v1]`

**Source:** Test 1.1.2 `linguistic.clause-types.imperative`
**Input:** "Submit the report by Friday."
**Issue:** Imperative sentences have an implicit "you" agent. Currently the act has no `cco:has_agent` because no subject entity is extracted. The parser should create an implicit `cco:Person` entity for the addressee ("you") and assign it as the agent.
**Proposed Fix:** When imperative mood is detected and no explicit agent is found, create a synthetic entity with `rdfs:label: "you"`, `tagteam:referentialStatus: "deictic"`, `tagteam:denotesType: "cco:Person"` and link it as the act's agent.
**Priority:** Medium
**Complexity:** Low-Medium — synthetic entity creation in ActExtractor or SemanticGraphBuilder when imperative + no agent.

---

## ENH-004: Directive ICE Node (Imperative Semantics) `[v2]`

**Source:** Test 1.1.2 `linguistic.clause-types.imperative`
**Input:** "Submit the report by Friday."
**Issue:** Imperative sentences express a directive speech act. There should be a `tagteam:DirectiveContent` ICE node representing the command, with `cco:is_about` linking to the prescribed act. This parallels ENH-002 (Question ICE for interrogatives).
**Proposed Fix:** When imperative mood is detected, create a `tagteam:DirectiveContent` ICE node with `cco:is_about` pointing to the prescribed act. This captures the illocutionary force of the utterance.
**Priority:** Low-Medium
**Complexity:** Medium — requires new node type and wiring, similar to ENH-002.

---

## ENH-005: Exclamatory Semantics (ValueAssertion / Evaluation Node) `[v2]`

**Source:** Test 1.1.3 `linguistic.clause-types.exclamatory`
**Input:** "What a disaster the launch was!"
**Issue:** Exclamatory sentences express an evaluation or emotional judgment. The graph should capture this via a `tagteam:ValueAssertionEvent` or `cco:InformationContentEntity` (Assessment) node that asserts a quality relationship: `Launch has_quality Disastrous`. Currently no evaluation node is generated — only the entities are extracted.
**Proposed Fix:** When exclamatory mood is detected (e.g., "What a...!" pattern, trailing `!`), generate a `tagteam:ValueAssertionEvent` node with `cco:is_about` linking to the subject entity and `bfo:has_quality` linking to the predicated quality. The predicative nominative pattern ("X was a Y") should assign Y as a quality of X rather than treating both as independent entities.
**Priority:** Medium
**Complexity:** High — requires exclamatory mood detection, predicative nominative parsing, and new ValueAssertion node generation in SemanticGraphBuilder.

---

## ENH-006: Conditional Clause Detection (If...Then Logic) `[v2]`

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

## ENH-007: Compound Sentence Clause Boundary Detection `[v2]`

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

## ENH-008: Ergative/Unaccusative Verb Agent Demotion (Transitive Context) `[v1]`

**Source:** Test 1.1.6 `linguistic.sentence-complexity.compound`
**Input:** "The server rebooted and the application restarted."
**Issue:** When an ergative verb (reboot, restart, crash) has an inanimate subject AND an apparent direct object (due to cross-clause misattribution), the inanimate subject is still assigned as agent. The current ergative fix only works for intransitive uses (`!links.patient`). Full ergative handling requires clause boundary detection (ENH-007) to distinguish "The server rebooted the app" (transitive, server=agent) from "The server rebooted [and] the app restarted" (intransitive, server=patient).
**Priority:** Medium (depends on ENH-007)
**Complexity:** Medium — already partially implemented; full fix requires clause boundaries.

---

## ENH-009: Temporal "When" Clause Linking `[v2]`

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

## ENH-010: Abstract Noun Coreference (Event/Situation Anaphora) `[v2]`

**Source:** Test 1.1.8 `linguistic.sentence-complexity.compound-complex`
**Input:** "When the alarm sounded, the guards responded and the system logged the event."
**Issue:** "The event" refers back to the entire situation described in the preceding clauses (alarm sounding + guards responding), not to an independent entity. Currently, a new generic `bfo:BFO_0000015` (Process) node is created for "event" with no coreference link to the acts it refers to. This creates a disconnected node that loses the anaphoric relationship.
**Proposed Fix:**
1. Detect abstract anaphoric nouns ("the event", "the incident", "the situation", "the occurrence", "the problem", "the issue") with definite articles.
2. When such a noun appears after one or more acts, resolve it as a coreference to the preceding act(s) rather than creating a new entity.
3. Use `owl:sameAs` or `tagteam:corefersWith` to link the discourse referent to the act node(s) it refers to.
4. Alternatively, create a `bfo:ProcessAggregate` that bundles the preceding acts and link "the event" to it.
**Priority:** Medium
**Complexity:** High — requires discourse-level anaphora resolution and act-to-entity coreference linking.

---

## ENH-011: Clausal Subject Parsing ("The fact that X" as Agent) `[v2]`

**Source:** Test 1.1.9 `linguistic.sentence-complexity.embedded-clauses`
**Input:** "The fact that the server failed worried the administrator."
**Issue:** The subject of "worried" is the entire clause "The fact that the server failed", not the nearest concrete noun "server". The parser's positional entity-verb linking grabs "server" (closest noun before "worried") instead of the head noun "fact" or the embedded process "failed". This produces the false assertion that the server worried the administrator.
**Proposed Fix:**
1. Detect "the fact that" / "the idea that" / "the claim that" complementizer patterns.
2. Identify the head noun of the subject NP ("fact") as the true agent of the main verb.
3. The embedded clause ("the server failed") should be linked to the head noun via `cco:is_about` (the fact IS ABOUT the failure).
4. The head noun (ICE) or the embedded process becomes the agent/cause of the main verb.
**Priority:** High
**Complexity:** Very High — requires NP head detection, complementizer clause parsing, and agent reassignment based on syntactic structure rather than linear position.

---

## ENH-012: Psych-Verb Causation (Experiencer Subjects) `[v2]`

**Source:** Test 1.1.9 `linguistic.sentence-complexity.embedded-clauses`
**Input:** "The fact that the server failed worried the administrator."
**Issue:** Psychological verbs like "worry", "surprise", "frighten", "concern", "alarm", "disturb" have reversed thematic roles: the grammatical subject is the Stimulus/Cause and the grammatical object is the Experiencer. Currently "worry" is treated as an IntentionalAct with a standard agent. Instead, the subject should be a `cco:is_cause_of` link and the object should be the Experiencer (bearing a `bfo:Role` with rdfs:label "ExperiencerRole", or similar).
**Proposed Fix:**
1. Create a PSYCH_VERBS set: worry, surprise, frighten, concern, alarm, disturb, shock, confuse, puzzle, annoy, irritate, please, delight, amuse, bore, interest, fascinate, terrify, horrify, embarrass.
2. For psych-verbs, allow ICE or Process entities as the Cause (not agent).
3. Map the grammatical object as the Experiencer rather than Patient.
4. Optionally use `tagteam:has_cause` rather than `cco:has_agent` for the subject link.
**Priority:** Medium
**Complexity:** High — requires new verb class, reversed thematic role mapping, and causal linking.

---

## ENH-013: Causative Construction Detection ("had X do Y") `[v2]`

**Source:** Test 1.1.15 `linguistic.voice-and-valency.ditransitive`
**Input:** "The manager had the team revise it."
**Issue:** The causative verb "had" is lost entirely. "Had" in this context is a causative/directive verb — the manager *caused* the team to revise. The graph should contain two linked acts: (1) a commanding/causing act with the manager as agent, and (2) the revise act with the team as agent. Currently only the "revise" act exists and the manager entity is disconnected from any process.
**Proposed Fix:**
1. Detect causative patterns: `[Subject1] had/made/let/got [Subject2] [bare infinitive verb]`.
2. Create a `cco:ActOfCommunication` or `tagteam:DirectiveAct` for the causative verb ("had") with Subject1 (manager) as `cco:has_agent`.
3. Create the standard `cco:IntentionalAct` for the semantic verb ("revise") with Subject2 (team) as `cco:has_agent`.
4. Link the causative act to the semantic act via `tagteam:causes` or `cco:is_cause_of`.
5. Causative verbs: "have" (past: "had"), "make" (past: "made"), "let", "get" (with "to" infinitive).
6. The causative act's `tagteam:actualityStatus` should be `tagteam:Actual` (the manager did cause it); the semantic act should also be `tagteam:Actual` (the team did revise it).
**Priority:** High
**Complexity:** High — requires detecting causative verb + NP + bare infinitive pattern, creating two linked acts with separate agents, and distinguishing causative "had" from auxiliary "had" (past perfect).

---

## ENH-014: Wh-Question Parsing (Wh-Movement & Do-Support) `[v2]`

**Source:** Test 1.1.16 `linguistic.argument-structure.subject-extraction`
**Input:** "Which report did the auditor review?"
**Issue:** Three interrelated failures:
1. **Wh-movement not handled:** "Which report" is the logical *object* of "review" (fronted via Wh-movement), but the parser treats it as the agent because it appears first. The auditor is the true agent.
2. **"Auditor review" hallucinated as compound noun:** The parser fuses "auditor" and "review" into a single entity `Person_Auditor_Review` instead of recognizing "review" as the main verb and "auditor" as a separate noun (the subject).
3. **Do-support creates false act:** "Did" is extracted as the main `IntentionalAct` verb ("do") instead of being recognized as an auxiliary. The semantic verb is "review", split across the auxiliary ("did ... review").
**Proposed Fix:**
1. Detect Wh-question pattern: `[Wh-word] [NP] did/does/do [NP] [Verb]?`
   - Wh-words: "which", "what", "who", "whom", "where", "when", "how", "why"
   - The first NP after the Wh-word is the **fronted object** (logical patient)
   - The NP between auxiliary and verb is the **subject** (logical agent)
   - The final verb is the **semantic verb** (not the auxiliary)
2. Reconstitute split verb phrase: "did ... review" → single act with verb "review"
3. Assign roles: Wh-NP ("which report") → `cco:affects` (patient); intervening NP ("the auditor") → `cco:has_agent`
4. Mark actuality as `tagteam:Interrogative` (already working)
5. This also fixes the do-support issue from Test 1.1.0 for interrogatives
**Priority:** High
**Complexity:** Very High — requires Wh-movement detection, auxiliary verb filtering, split verb phrase reconstitution, and reordering of positional entity-verb linking for interrogative word order.

---

## ENH-015: Prepositional Phrase Semantic Role Discrimination (Beneficiary vs Patient) `[v1]`

**Source:** Test 1.1.19 `linguistic.argument-structure.oblique-arguments`
**Input:** "The technician repaired the device with the tool for the client."
**Issue:** The client (introduced by "for the client") is assigned a `bfo:Role` (rdfs:label: "PatientRole"), implying the technician performed repairs *on* the client. The client is actually a **Beneficiary** — the person for whom the act was performed. Currently all Person entities linked via `bfo:has_participant` get PatientRole by default regardless of the preposition that introduced them.
**Proposed Fix:**
1. Track the introducing preposition for each entity during extraction (e.g., "with" → instrument, "for" → beneficiary, "to" → recipient, "from" → source, "by" → agent in passive).
2. Map prepositions to semantic roles:
   - "with" → `bfo:Role` (rdfs:label: "InstrumentRole") (already partially working as participant)
   - "for" → `bfo:Role` (rdfs:label: "BeneficiaryRole") (new, or generic `bfo:BFO_0000023` with label "beneficiary role")
   - "to" → `bfo:Role` (rdfs:label: "RecipientRole") or participant
   - "by" → `bfo:Role` (rdfs:label: "AgentRole") (passive voice, already handled)
   - "from" → participant (source)
3. In RoleDetector, use the preposition metadata to assign the correct role type instead of defaulting Person participants to PatientRole.
**Priority:** Medium
**Complexity:** Medium — requires tracking preposition context during entity extraction and mapping it to role types in RoleDetector.

---

## ENH-016: Expletive Subject Detection & Extraposed Clause Parsing `[v2]`

**Source:** Test 1.1.20 `linguistic.argument-structure.expletive-subjects`
**Input:** "It is necessary that the system restart."
**Issue:** Three interrelated failures:
1. **Expletive "It" reified:** "It" in "It is necessary that..." is a syntactic placeholder (dummy subject) with no referent. The parser creates a `bfo:BFO_0000004` entity for it.
2. **Embedded clause mis-chunked:** "the system restart" is parsed as a compound noun (`cco:Artifact`) instead of a clause with subject ("the system") + verb ("restart" in subjunctive).
3. **Modal adjective "necessary" ignored:** The deontic modality expressed by "necessary" is entirely absent from the graph. Should produce a `cco:Requirement` or modal assertion targeting the restart process.
**Proposed Fix:**
1. Detect expletive "It" pattern: `It + be + [Adjective] + that + [clause]`. Discard "It" as non-referential; the logical subject is the that-clause.
2. Parse the that-clause as an embedded clause: "the system restart" → subject ("system") + verb ("restart").
3. Map modal adjectives to deontic/epistemic status:
   - "necessary", "required", "essential", "mandatory" → `obligation` / `cco:Requirement`
   - "possible", "likely", "probable" → `epistemic possibility`
   - "important", "critical", "vital" → `high priority obligation`
   - "unlikely", "impossible" → `epistemic impossibility`
4. Create a modal assertion node linking the modality to the embedded act.
**Priority:** High
**Complexity:** Very High — requires expletive detection, that-clause boundary parsing, subjunctive verb recognition, and modal adjective → deontic mapping.

---

## ENH-017: Raising Verb Detection (seem, appear, tend) `[v2]`

**Source:** Test 1.1.21 `linguistic.argument-structure.raising-control`
**Input:** "The engineer seems to understand the problem."
**Issue:** Three failures:
1. **"Seem" treated as IntentionalAct:** "Seem" is a raising verb — it has no agent and is not an intentional act. The graph asserts the engineer performs an "act of seeming", which is a BFO category error.
2. **"Understand" missing entirely:** The infinitive complement "to understand" is the actual semantic predicate but is not extracted. Total information loss.
3. **Subject not lowered:** In raising constructions, the syntactic subject of the raising verb ("the engineer") is the semantic agent of the embedded verb ("understand"), not of "seem".
**Proposed Fix:**
1. Create a `RAISING_VERBS` set: "seem", "appear", "tend", "happen", "turn out", "prove" (in the sense of "proved to be").
2. When a raising verb + infinitive complement is detected:
   - Extract the **infinitive** ("understand") as the primary act
   - Assign the raising verb's syntactic subject ("engineer") as the agent of the infinitive act
   - Do NOT create an IntentionalAct for the raising verb itself
   - Map the raising verb to an epistemic qualifier on the act: "seem" → `tagteam:epistemicStatus: "apparent"` or `tagteam:confidence: "probable"`
3. This is similar to control verb handling (plan for Phase 7.2) but differs: control verbs have a true agent ("He needs to..."), raising verbs do not ("He seems to..." — "he" is NOT the agent of "seeming").
**Priority:** High
**Complexity:** High — requires raising verb detection, subject lowering to embedded verb, and epistemic status mapping. Can build on the control verb / infinitive complement infrastructure.

---
