# TagTeam.js v2 Specification: Structural Semantics & Normalization

**Version**: 2.0.0-spec
**Date**: 2026-01-31
**Status**: Draft Specification
**Prerequisite**: TagTeam.js v1 (3.0.0-alpha.1) stable release

---

## 1. What v1 Delivers

TagTeam.js v1 is a **deterministic semantic intake compiler**. It transforms natural language into ontology-aligned JSON-LD graphs using BFO (Basic Formal Ontology) and CCO (Common Core Ontologies).

### 1.1 v1 Capabilities

| Capability | Description |
|-----------|-------------|
| **Entity extraction** | Persons, artifacts, organizations, information content entities — typed to BFO/CCO |
| **Act extraction** | Intentional acts with agent, patient, and participant roles |
| **Voice handling** | Active, passive, and middle voice with correct role assignment |
| **Ditransitives** | Direct and indirect objects (`give X to Y`) |
| **Oblique arguments** | Prepositional phrases: `with` → Instrument, `for` → Beneficiary, `to` → Recipient |
| **Modal detection** | Deontic obligation (`must`, `shall`, `need to`) and epistemic modality |
| **Ambiguity preservation** | Interpretation lattice with ranked alternative readings |
| **Ontology integration** | TTL/JSON ontology loading, SHACL validation, IEE ValueNet bridge |
| **Selectional restrictions** | Verb-context object typing (ENH-001) |
| **Implicit agents** | Imperative `you` agent insertion (ENH-003) |
| **Ergative verbs** | Agent demotion for intransitive inanimate subjects (ENH-008, bounded) |
| **Definiteness tracking** | Determiners, proper names, scarcity markers |
| **Source attribution** | Direct quote detection (v1-limited) |
| **Certainty markers** | Hedges, boosters, evidentials |
| **Security** | Input validation, semantic attack detection, output sanitization, audit logging |
| **Verbose diagnostics** | Opt-in `{ verbose: true }` POS token visibility |

### 1.2 v1 Architectural Constraints

These are **design decisions**, not bugs:

1. **Single-clause only** — v1 processes one independent clause at a time. Compound sentences (`X and Y`) are not segmented.
2. **No discourse memory** — Each `build()` call is stateless. No cross-sentence coreference.
3. **No structural normalization** — Surface syntax maps directly to semantic structure. Fronted constituents (Wh-movement) are not reordered.
4. **No speech act typing** — Questions, commands, and exclamations modify actuality status but do not generate dedicated ICE wrapper nodes.
5. **Flat parsing** — No recursive clause embedding. "The fact that X worried Y" is not decomposed.

---

## 2. Why v2 Is Needed

v1 correctly handles ~70% of real-world English input — simple declaratives, passives, basic modals, and single-clause constructions. The remaining 30% fails not because of bugs, but because the **architecture cannot represent** the structures involved.

### 2.1 The Four Gaps

| Gap | Example | v1 Behavior | Correct Behavior |
|-----|---------|-------------|------------------|
| **No clause segmentation** | "The server rebooted and the app restarted." | Cross-clause role misattribution (app becomes object of rebooted) | Two independent acts with separate agent/patient scopes |
| **No speech act ICE nodes** | "Did the committee approve the budget?" | Only sets actuality to Interrogative — no Question node | `tagteam:Inquiry` ICE node with `cco:is_about` → the hypothetical act |
| **No verb-class routing** | "The engineer seems to understand the problem." | "Seems" becomes an IntentionalAct; "understand" is lost | Raising verb detected → "understand" is the real act, "seems" is epistemic qualifier |
| **No discourse memory** | "...the system logged the event." | "The event" creates a new disconnected entity | Anaphoric reference resolved to preceding act(s) |

### 2.2 v2 Mission

> **Normalize surface syntax into semantically scoped clauses and speech acts before semantic compilation.**

v2 is a **pre-processing layer**. It segments, normalizes, and classifies input — then feeds normalized single-clause units into v1's existing compiler. v1 is not replaced; it is wrapped.

```
Input text
    ↓
┌─────────────────────────┐
│  v2: Structural Layer   │
│  ├─ Clause Segmenter    │
│  ├─ Speech Act Classifier│
│  ├─ Verb Class Router   │
│  └─ Discourse Tracker   │
└─────────────────────────┘
    ↓ (normalized single-clause units)
┌─────────────────────────┐
│  v1: Semantic Compiler  │
│  (unchanged)            │
└─────────────────────────┘
    ↓
JSON-LD graph with ICE wrappers + clause links
```

---

## 3. Feature Specifications

### 3.1 Clause Segmentation & Linking

The foundational v2 capability. Most other features depend on this.

#### 3.1.1 Compound Sentence Segmentation (ENH-007)

**Problem**: "The server rebooted and the application restarted." — entity-verb linking crosses clause boundaries.

**Spec**:
- Detect clause boundaries at coordinating conjunctions (`and`, `but`, `or`, `nor`, `yet`, `so`) when preceded by a complete SVO clause
- Split input into independent clause units before passing to v1
- Generate a relationship between clause acts: `tagteam:precedes`, `tagteam:simultaneous_with`, or `tagteam:contrasts_with` based on conjunction

**Input**: `"The server rebooted and the application restarted."`
**Output**: Two acts with separate agent scopes + `tagteam:simultaneous_with` link

**Acceptance Criteria**:
- [ ] Compound sentences produce one act per clause
- [ ] Agent/patient assignment is clause-scoped (no cross-clause bleeding)
- [ ] Conjunction type maps to correct inter-clause relationship
- [ ] Simple sentences (no conjunction) pass through unchanged

**Priority**: Critical (blocks ENH-008, ENH-009, ENH-010)
**Complexity**: High

---

#### 3.1.2 Ergative Verbs in Compound Context (ENH-008)

**Problem**: v1's ergative handling only works for intransitive uses. In compound sentences, cross-clause misattribution makes intransitive ergatives look transitive.

**Spec**:
- Depends on ENH-007 (clause segmentation)
- Once clauses are segmented, v1's existing ergative logic handles each clause correctly
- No new logic required beyond clause segmentation

**Acceptance Criteria**:
- [ ] "The server rebooted and the app restarted." → both subjects are patients (intransitive ergative per clause)
- [ ] "The admin rebooted the server." → admin is agent (transitive, not ergative)

**Priority**: Medium (automatically resolved by ENH-007)
**Complexity**: Low (given ENH-007)

---

#### 3.1.3 Temporal Clause Linking (ENH-009)

**Problem**: "When the alarm sounded, the guards responded." — no temporal relationship captured between events.

**Spec**:
- Detect temporal subordinating conjunctions: `when`, `after`, `before`, `while`, `until`, `since`, `as soon as`
- Identify subordinate clause (temporal) vs main clause
- Create `tagteam:temporalRelation` link between clause acts
- Conjunction → relation mapping:
  - `when` → `tagteam:precedes` or `tagteam:simultaneous_with`
  - `after` → `tagteam:follows`
  - `before` → `tagteam:precedes`
  - `while` → `tagteam:simultaneous_with`

**Acceptance Criteria**:
- [ ] Temporal clauses produce two linked acts with correct temporal relation
- [ ] Subordinate clause actuality is `tagteam:Actual` (event happened)
- [ ] Main clause actuality is `tagteam:Actual`

**Priority**: Medium
**Complexity**: High (depends on ENH-007)

---

### 3.2 Speech Act ICE Nodes

Wrap semantic content in Information Content Entity nodes that capture illocutionary force.

#### 3.2.1 Question ICE Node (ENH-002)

**Problem**: "Did the committee approve the budget?" — no dedicated question node.

**Spec**:
- When interrogative mood is detected, create `tagteam:Inquiry` ICE node
- Link via `cco:is_about` to the hypothetical act
- Preserve existing `tagteam:Interrogative` actuality status on the act

**Output Structure**:
```json
{
  "@type": "tagteam:Inquiry",
  "cco:is_about": "inst:Approve_Act_123",
  "tagteam:speechActType": "interrogative"
}
```

**Acceptance Criteria**:
- [ ] Yes/no questions produce `tagteam:Inquiry` node
- [ ] Wh-questions produce `tagteam:Inquiry` node (depends on ENH-014)
- [ ] Declaratives do NOT produce inquiry nodes

**Priority**: Medium
**Complexity**: Medium

---

#### 3.2.2 Directive ICE Node (ENH-004)

**Problem**: "Submit the report by Friday." — imperative semantics not captured as speech act.

**Spec**:
- When imperative mood is detected, create `tagteam:DirectiveContent` ICE node
- Link via `cco:is_about` to the prescribed act
- v1's implicit agent (`you`) still applies to the act itself

**Acceptance Criteria**:
- [ ] Imperatives produce `tagteam:DirectiveContent` node
- [ ] The prescribed act retains its agent/patient structure
- [ ] Declaratives do NOT produce directive nodes

**Priority**: Low-Medium
**Complexity**: Medium

---

#### 3.2.3 Exclamatory / ValueAssertion (ENH-005)

**Problem**: "What a disaster the launch was!" — evaluation/judgment not captured.

**Spec**:
- Detect exclamatory patterns: `What a...!`, trailing `!` with evaluative content
- Create `tagteam:ValueAssertionEvent` node
- Link subject entity via `cco:is_about`, predicated quality via `bfo:has_quality`
- Handle predicative nominative: "X was a Y" → Y is quality of X, not independent entity

**Acceptance Criteria**:
- [ ] Exclamatory sentences produce `ValueAssertionEvent`
- [ ] Evaluative predicate mapped to quality
- [ ] Non-exclamatory sentences unaffected

**Priority**: Medium
**Complexity**: High

---

#### 3.2.4 Conditional Logic (ENH-006)

**Problem**: "If demand increases, expand capacity." — both acts incorrectly marked `tagteam:Actual`.

**Spec**:
- Detect conditional markers: `if`, `when...then`, `unless`, `provided that`
- Antecedent clause → `tagteam:Hypothetical` actuality
- Consequent clause → `tagteam:Conditional` or `tagteam:Prescribed` actuality
- Create `tagteam:ConditionalContent` ICE node with `tagteam:has_antecedent` and `tagteam:has_consequent`

**Acceptance Criteria**:
- [ ] Conditional sentences produce `ConditionalContent` ICE node
- [ ] Antecedent is `Hypothetical`, consequent is `Conditional`
- [ ] Non-conditional sentences unaffected

**Priority**: High
**Complexity**: High (depends on clause segmentation)

---

### 3.3 Verb Class Routing

Handle verb classes that violate the default agent-verb-patient mapping.

#### 3.3.1 Psych-Verb Causation (ENH-012)

**Problem**: "The failure worried the administrator." — "worried" treated as IntentionalAct with `failure` as agent.

**Spec**:
- `PSYCH_VERBS` set: `worry`, `surprise`, `frighten`, `concern`, `alarm`, `disturb`, `shock`, `confuse`, `puzzle`, `annoy`, `irritate`, `please`, `delight`, `amuse`, `bore`, `interest`, `fascinate`, `terrify`, `horrify`, `embarrass`
- Grammatical subject → `cco:is_cause_of` (Stimulus), not `cco:has_agent`
- Grammatical object → Experiencer role, not Patient
- Allow ICE/Process entities as Cause (not just Persons)

**Acceptance Criteria**:
- [ ] Psych-verbs assign Experiencer role to grammatical object
- [ ] Grammatical subject linked as Cause, not Agent
- [ ] Non-psych verbs unaffected

**Priority**: Medium
**Complexity**: High

---

#### 3.3.2 Causative Constructions (ENH-013)

**Problem**: "The manager had the team revise it." — causative "had" is lost; manager disconnected from any act.

**Spec**:
- Detect causative patterns: `[NP1] had/made/let/got [NP2] [bare infinitive]`
- Create two linked acts:
  1. Directive/causing act: agent = NP1 (manager)
  2. Semantic act: agent = NP2 (team), verb = infinitive (revise)
- Link via `tagteam:causes` or `cco:is_cause_of`
- Distinguish causative "had" from auxiliary "had" (past perfect)

**Acceptance Criteria**:
- [ ] Causative constructions produce two linked acts
- [ ] Each act has the correct agent
- [ ] Past perfect "had revised" does NOT trigger causative logic

**Priority**: High
**Complexity**: High

---

#### 3.3.3 Wh-Movement & Do-Support (ENH-014)

**Problem**: "Which report did the auditor review?" — Wh-phrase treated as agent; "did" extracted as main verb; "auditor review" fused as compound noun.

**Spec**:
- Detect Wh-question pattern: `[Wh-word] [NP] did/does/do [NP] [Verb]?`
- Wh-NP = fronted object (logical patient)
- Intervening NP = subject (logical agent)
- Reconstitute split verb: "did ... review" → single act with verb "review"
- Discard auxiliary as non-semantic

**Acceptance Criteria**:
- [ ] Wh-questions correctly assign agent and patient
- [ ] Auxiliary "did/does/do" is not extracted as an act
- [ ] Fronted Wh-phrase assigned as patient, not agent

**Priority**: High
**Complexity**: Very High

---

#### 3.3.4 Expletive Subject Detection (ENH-016)

**Problem**: "It is necessary that the system restart." — "It" reified as entity; embedded clause mis-parsed; modal adjective ignored.

**Spec**:
- Detect pattern: `It + be + [Adjective] + that + [clause]`
- Discard "It" as non-referential
- Parse that-clause as embedded clause
- Map modal adjective to deontic/epistemic status:
  - `necessary`, `required`, `essential` → obligation
  - `possible`, `likely`, `probable` → epistemic possibility
  - `important`, `critical` → high-priority obligation

**Acceptance Criteria**:
- [ ] Expletive "It" does not produce an entity node
- [ ] Embedded that-clause parsed correctly
- [ ] Modal adjective mapped to deontic/epistemic property

**Priority**: High
**Complexity**: Very High

---

#### 3.3.5 Raising Verbs (ENH-017)

**Problem**: "The engineer seems to understand the problem." — "seems" treated as IntentionalAct; "understand" lost entirely.

**Spec**:
- `RAISING_VERBS` set: `seem`, `appear`, `tend`, `happen`, `turn out`, `prove`
- When raising verb + infinitive detected:
  - Extract infinitive ("understand") as primary act
  - Lower syntactic subject ("engineer") to agent of infinitive
  - Do NOT create act for raising verb
  - Map raising verb to epistemic qualifier: `seem` → `tagteam:epistemicStatus: "apparent"`

**Acceptance Criteria**:
- [ ] Raising verb does not produce its own IntentionalAct
- [ ] Infinitive complement is the primary act
- [ ] Syntactic subject correctly assigned as agent of infinitive
- [ ] Epistemic qualifier attached from raising verb

**Priority**: High
**Complexity**: High

---

### 3.4 Discourse & Anaphora

Limited discourse memory for within-paragraph reference resolution.

#### 3.4.1 Abstract Anaphora (ENH-010)

**Problem**: "...the system logged the event." — "the event" creates disconnected entity instead of resolving to preceding act(s).

**Spec**:
- Detect abstract anaphoric nouns with definite article: `the event`, `the incident`, `the situation`, `the occurrence`, `the problem`, `the issue`
- Resolve to preceding act node(s) via `owl:sameAs` or `tagteam:corefers_with`
- Alternatively create `bfo:ProcessAggregate` bundling preceding acts

**Acceptance Criteria**:
- [ ] Abstract anaphoric nouns resolve to preceding acts
- [ ] No disconnected entity nodes for resolved anaphora
- [ ] Non-anaphoric uses of same nouns ("An event occurred") create normal entities

**Priority**: Medium
**Complexity**: High (requires discourse memory)

---

#### 3.4.2 Clausal Subjects (ENH-011)

**Problem**: "The fact that the server failed worried the administrator." — "server" grabbed as agent of "worried" by positional linking.

**Spec**:
- Detect complementizer patterns: `the fact that`, `the idea that`, `the claim that`
- Head noun ("fact") is true subject of main verb
- Embedded clause linked to head noun via `cco:is_about`
- Depends on ENH-012 (psych-verbs) for correct role assignment

**Acceptance Criteria**:
- [ ] Clausal subject correctly identified as agent/cause of main verb
- [ ] Embedded clause parsed independently
- [ ] Positional entity-verb linking does not cross clause boundary

**Priority**: High
**Complexity**: Very High

---

### 3.5 Epistemic Expansion

Extend v1's limited epistemic detection to full coverage.

#### 3.5.1 Source Attribution — Expanded (Phase 7.1)

**v1 scope**: Direct quote detection only.
**v2 scope**: Reported speech, institutional sources, evidential chains.

**Spec**:
- Reported speech: "The nurse reported that..." → `{ source: "nurse", type: "reported" }`
- Institutional: "Hospital policy states..." → `{ source: "hospital", type: "institutional" }`
- Evidential chains: multi-hop attribution tracking

**Acceptance Criteria**:
- [ ] Reported speech attribution detected
- [ ] Institutional source attribution detected
- [ ] Evidential chain depth ≥ 2

---

#### 3.5.2 Temporal Grounding (Phase 7.3)

**Spec**:
- Accept `referenceTime` and `documentDate` options
- Resolve relative temporal expressions: `yesterday`, `last week`, `N days ago`
- Attach resolved timestamps to entity/act nodes

**Input**:
```javascript
builder.build(text, {
  referenceTime: '2026-01-19T00:00:00Z',
  documentDate: '2026-01-15T00:00:00Z'
});
```

**Acceptance Criteria**:
- [ ] "yesterday" resolves to correct date
- [ ] "last week" resolves to date range
- [ ] Unresolvable expressions left as-is (no guessing)

---

### 3.6 Enhanced Disambiguation (Phase 8)

#### 3.6.1 Noun Ambiguity Resolution (Phase 8.1)

**Spec**:
- Use cross-clause context signals to resolve noun category:
  - `the X` + verb phrase → Continuant
  - `X of Y` → Process
  - `during X` → Occurrent

**Acceptance Criteria**:
- [ ] Context-dependent noun typing improves over v1 defaults
- [ ] Ambiguous nouns with clear context signals resolve correctly

---

#### 3.6.2 Iterative Verb Refinement (Phase 8.2)

**Spec**:
- Multi-pass disambiguation:
  - Pass 1: Selectional restrictions (v1, already implemented)
  - Pass 2: ContextDimension scores
  - Pass 3: ActualityStatus consistency check

**Acceptance Criteria**:
- [ ] Multi-pass produces more accurate verb classification than single-pass
- [ ] No regression on v1 test suite

---

### 3.7 Human Validation Loop (Phase 10)

#### 3.7.1 Validation Data Model

**Spec**:
- `tagteam:HumanValidationEvent` — expert confirms machine assertion
- `tagteam:HumanRejectionEvent` — expert rejects false positive
- `tagteam:HumanCorrectionEvent` — expert provides correction with supersession chain
- API: `builder.recordValidation(assertionId, validatorId, status)`

**Output**:
```json
{
  "@type": "tagteam:HumanValidationEvent",
  "tagteam:validates": "inst:Autonomy_ValueAssertion_abc123",
  "tagteam:validator": "inst:Expert_Jane_Doe",
  "tagteam:validationStatus": "tagteam:Confirmed"
}
```

**Acceptance Criteria**:
- [ ] Validation events produce valid JSON-LD
- [ ] Supersession chains track correction history: Original → Correction1 → Correction2
- [ ] API is consumer-friendly (TagTeam does NOT implement UI)

---

### 3.8 Domain Expansion (Phase 11)

**Spec**:
- Add domain configuration files following `config/medical.json` pattern
- Each domain config: entity type mappings, vocabulary, role overrides

| Domain | Config File | Use Case |
|--------|-------------|----------|
| Legal | `config/legal.json` | Contracts, regulations, case law |
| Business | `config/business.json` | Corporate governance, finance |
| Scientific | `config/scientific.json` | Research methodology, lab processes |

**Acceptance Criteria**:
- [ ] Each domain config loads without error
- [ ] Domain-specific terms correctly typed
- [ ] No interference between domain configs when switching

---

## 4. Dependency Graph

```
ENH-007 (Clause Segmentation)     ← CRITICAL PATH
  ├── ENH-008 (Ergative compound)
  ├── ENH-009 (Temporal linking)
  ├── ENH-010 (Abstract anaphora)  ← requires discourse memory
  ├── ENH-011 (Clausal subjects)   ← also needs ENH-012
  └── ENH-006 (Conditionals)

ENH-014 (Wh-movement)             ← independent
ENH-012 (Psych-verbs)             ← independent
ENH-013 (Causatives)              ← independent
ENH-016 (Expletive subjects)      ← partially depends on clause parsing
ENH-017 (Raising verbs)           ← independent

ENH-002 (Question ICE)            ← enhanced by ENH-014
ENH-004 (Directive ICE)           ← independent
ENH-005 (Exclamatory ICE)         ← independent
ENH-006 (Conditional ICE)         ← depends on ENH-007

Phase 7.1 expanded                ← independent
Phase 7.3 temporal                ← independent
Phase 8.1-8.2                     ← depends on ENH-007
Phase 10                          ← independent (IEE team input needed)
Phase 11                          ← independent
```

## 5. Recommended Implementation Order

### Tier 1: Foundation (unlocks everything else)
1. **ENH-007** — Clause Segmentation
2. **ENH-014** — Wh-Movement & Do-Support

### Tier 2: Verb Classes (independent, high value)
3. **ENH-012** — Psych-Verbs
4. **ENH-017** — Raising Verbs
5. **ENH-013** — Causatives

### Tier 3: Speech Act Nodes (builds on Tier 1)
6. **ENH-002** — Question ICE
7. **ENH-004** — Directive ICE
8. **ENH-006** — Conditional ICE
9. **ENH-005** — Exclamatory ICE

### Tier 4: Advanced Structural (builds on Tier 1)
10. **ENH-016** — Expletive Subjects
11. **ENH-009** — Temporal Linking
12. **ENH-011** — Clausal Subjects
13. **ENH-008** — Ergative Compound (free with ENH-007)
14. **ENH-010** — Abstract Anaphora

### Tier 5: Extensions
15. Phase 7.1 expanded (source attribution)
16. Phase 7.3 (temporal grounding)
17. Phase 8.1-8.2 (disambiguation)
18. Phase 10 (human validation)
19. Phase 11 (domain expansion)

---

## 6. Non-Goals for v2

- **Full discourse parsing** — v2 handles limited within-paragraph anaphora, not multi-document coreference
- **Machine learning** — All v2 features are rule-based/heuristic. No training data required.
- **UI/visualization** — TagTeam remains a library. Consumers build their own interfaces.
- **Multilingual support** — English only
- **Breaking v1 API** — v2 wraps v1; existing `build()` calls continue to work unchanged

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0-spec | 2026-01-31 | Initial v2 specification |
