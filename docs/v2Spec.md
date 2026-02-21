# TagTeam.js v2 Specification: Structural Semantics & Normalization

**Version**: 2.0.0-spec-v1.3  
**Date**: 2026-01-31  
**Status**: Draft Specification  
**Prerequisite**: TagTeam.js v1 (3.0.0-alpha.1) stable release

---

## Executive Summary

This specification defines v2 as a **structural pre-processing layer** that normalizes complex English syntax into single-clause units suitable for v1's semantic compiler. v2 does not replace v1—it wraps it.

### What Ships When

| Release | Features | Target |
|---------|----------|--------|
| **v2.0 MVP** | Clause segmentation (with ellipsis), Wh-movement (with negation), Question ICE, Conditional ICE, `tagteam.ttl` schema | Q2 2026 |
| **v2.1** | Verb class routing (psych-verbs, raising, causatives), remaining ICE types | Q3 2026 |
| **v2.2** | Discourse features (abstract anaphora, clausal subjects), disambiguation | Q4 2026 |
| **v2.3+** | Human validation loop, domain expansion, temporal grounding | 2027+ |

### Changes in v1.3

This revision adds **visual diagrams** at key algorithmic complexity points:
- Clause segmentation decision flowchart
- v2→v1 data pipeline architecture
- Wh-movement normalization flow
- Expletive vs. referential "It" decision tree
- Psych-verb role transformation
- Session lifecycle for concurrency safety
- "So" disambiguation decision tree

---

## 1. What v1 Delivers

TagTeam.js v1 is a **deterministic semantic intake compiler**. It transforms natural language into ontology-aligned JSON-LD graphs using BFO (Basic Formal Ontology) and CCO (Common Core Ontologies).

### 1.1 v1 Capabilities

| Capability | Description |
|-----------|-------------|
| **Entity extraction** | Persons, artifacts, organizations, ICEs — typed to BFO/CCO |
| **Act extraction** | Intentional acts with agent, patient, and participant roles |
| **Voice handling** | Active, passive, and middle voice with correct role assignment |
| **Ditransitives** | Direct and indirect objects (`give X to Y`) |
| **Oblique arguments** | `with` → Instrument, `for` → Beneficiary, `to` → Recipient |
| **Modal detection** | Deontic obligation and epistemic modality |
| **Ambiguity preservation** | Interpretation lattice with ranked alternatives |
| **Ontology integration** | TTL/JSON loading, SHACL validation, IEE ValueNet bridge |
| **Security** | Input validation, attack detection, output sanitization |

### 1.2 v1 Architectural Constraints

1. **Single-clause only** — v1 processes one independent clause at a time
2. **No discourse memory** — Each `build()` call is stateless
3. **No structural normalization** — Surface syntax maps directly to semantics
4. **No speech act typing** — Questions/commands modify actuality only
5. **Flat parsing** — No recursive clause embedding

### 1.3 v1 Modifications Required for v2

#### 1.3.1 Wh-Word Entity Recognition

**Problem**: v2 normalizes Wh-questions, placing Wh-phrases in object position. v1 must accept these as valid entities.

**Required v1 Change**:

```javascript
const WH_PSEUDO_ENTITIES = {
  'who':   { type: 'cco:Person', definiteness: 'interrogative' },
  'whom':  { type: 'cco:Person', definiteness: 'interrogative' },
  'what':  { type: 'bfo:Entity', definiteness: 'interrogative' },
  'which': { type: 'bfo:Entity', definiteness: 'interrogative_selective' },
  'where': { type: 'bfo:Site', definiteness: 'interrogative' },
  'when':  { type: 'bfo:TemporalRegion', definiteness: 'interrogative' }
};
```

**v2→v1 Handoff Contract**:

```javascript
{
  normalizedClause: "the auditor review which report",
  v2Metadata: {
    whPhrase: { text: "which report", position: "object", headNoun: "report" },
    originalForm: "Which report did the auditor review?"
  }
}
```

---

## 2. Why v2 Is Needed

### 2.1 Empirical Basis

| Category | CBP Corpus | General | Combined |
|----------|------------|---------|----------|
| Simple declaratives (v1 handles) | 68% | 52% | 63% |
| Compound sentences | 12% | 18% | 14% |
| Questions | 3% | 8% | 5% |
| Conditionals | 8% | 6% | 7% |
| Complex verb constructions | 5% | 9% | 6% |
| Other | 4% | 7% | 5% |

### 2.2 The Four Gaps

| Gap | Example | v1 Behavior | Correct Behavior |
|-----|---------|-------------|------------------|
| No clause segmentation | "X rebooted and Y restarted" | Cross-clause misattribution | Two separate acts |
| No speech act nodes | "Did X approve Y?" | Actuality only | Inquiry ICE wrapper |
| No verb-class routing | "X seems to understand Y" | "Seems" is act | "Understand" is act |
| No discourse memory | "...logged the event" | Disconnected entity | Resolved anaphor |

### 2.3 v2 Architecture

#### Diagram: v2→v1 Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INPUT TEXT                                      │
│                "Which report did the auditor review?"                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        v2: STRUCTURAL LAYER                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ Clause          │  │ Speech Act      │  │ Verb Class      │              │
│  │ Segmenter       │──│ Classifier      │──│ Router          │              │
│  │                 │  │                 │  │                 │              │
│  │ • Coordination  │  │ • Question ICE  │  │ • Psych-verbs   │              │
│  │ • Ellipsis      │  │ • Directive ICE │  │ • Raising verbs │              │
│  │ • "So" disambig │  │ • Conditional   │  │ • Causatives    │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                     │                                        │
│                          ┌──────────┴──────────┐                            │
│                          │    v2Metadata       │                            │
│                          │ • whPhrase          │                            │
│                          │ • negation          │                            │
│                          │ • clauseRelation    │                            │
│                          │ • subjectSource     │                            │
│                          └──────────┬──────────┘                            │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │   Normalized Single-Clause Unit   │
                    │  "the auditor review which report"│
                    └─────────────────┬─────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        v1: SEMANTIC COMPILER                                 │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ Entity          │  │ Act             │  │ Role            │              │
│  │ Extraction      │──│ Extraction      │──│ Assignment      │              │
│  │                 │  │                 │  │                 │              │
│  │ • Wh-pseudo     │  │ • Verb→Act type │  │ • Agent/Patient │              │
│  │   entities (NEW)│  │ • Modality      │  │ • Obliques      │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                     │                                        │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OUTPUT: JSON-LD GRAPH                              │
│                                                                              │
│  {                                                                           │
│    "@type": "tagteam:Inquiry",                                               │
│    "cco:is_about": {                                                         │
│      "@type": "cco:IntentionalAct",                                          │
│      "cco:has_agent": { "@id": "inst:Auditor_001" },                         │
│      "cco:affects": { "@id": "inst:Report_001", "tagteam:isQuestionFocus": true }
│    }                                                                         │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Fallback Behavior

| Confidence | Behavior |
|------------|----------|
| **High** | Process and pass to v1 |
| **Medium** | Add to interpretation lattice |
| **Low** | Pass through + flag ambiguity |
| **None** | Pass through unchanged |

**Principle**: v2 never makes output worse than v1 alone.

---

## 3. Feature Specifications

### 3.1 Clause Segmentation & Linking (ENH-007)

#### 3.1.1 Coordination Type Detection

| Type | Example | v2 Action |
|------|---------|-----------|
| **Clause (full)** | "X rebooted and Y restarted" | Segment into two clauses |
| **Clause (elliptical)** | "X rebooted and was verified" | Segment + inject subject |
| **VP coordination** | "X rebooted and restarted" | Single clause, compound VP |
| **NP coordination** | "old and new servers" | Single clause, compound NP |

#### 3.1.2 Clause Boundary Detection Algorithm

#### Diagram: Clause Segmentation Decision Flowchart

```
                            ┌─────────────────────┐
                            │  Input: Sentence    │
                            │  with conjunction   │
                            └──────────┬──────────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │ Locate conjunction  │
                            │ (and/but/or/so/yet) │
                            └──────────┬──────────┘
                                       │
                                       ▼
                      ┌────────────────────────────────┐
                      │  Look LEFT: Complete SVO/SV?   │
                      │  Record LEFT_SUBJECT           │
                      └────────────────┬───────────────┘
                                       │
                                       ▼
                      ┌────────────────────────────────┐
                      │  Look RIGHT: What follows?     │
                      └────────────────┬───────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
   │ Explicit Subject │    │  No Subject +    │    │  No Subject +    │
   │ + Finite Verb    │    │  DIFFERENT voice │    │  SAME verb form  │
   └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
            │                       │                       │
            ▼                       ▼                       ▼
   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
   │    CASE A:       │    │    CASE B:       │    │    CASE C:       │
   │  Full Clause     │    │ Elliptical Clause│    │ VP Coordination  │
   │  Coordination    │    │  Coordination    │    │ (Shared Subject) │
   └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
            │                       │                       │
            ▼                       ▼                       ▼
   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
   │ SEGMENT into     │    │ SEGMENT +        │    │ DO NOT SEGMENT   │
   │ two independent  │    │ INJECT           │    │ Pass as single   │
   │ clauses          │    │ LEFT_SUBJECT     │    │ clause to v1     │
   └──────────────────┘    └──────────────────┘    └──────────────────┘

   Example:                 Example:                 Example:
   "X rebooted AND         "X rebooted AND          "X rebooted AND
    Y restarted"            was verified"            restarted"
         │                       │                        │
         ▼                       ▼                        ▼
   Clause 1: X rebooted    Clause 1: X rebooted     Single clause:
   Clause 2: Y restarted   Clause 2: [X] verified   X rebooted and restarted
```

**Voice/Auxiliary Change Detection (CASE B vs CASE C)**:

| Left Clause | Right Side | Classification | Rationale |
|-------------|------------|----------------|-----------|
| "X rebooted" | "was verified" | CASE B (elliptical) | Voice change (active→passive) |
| "X rebooted" | "restarted" | CASE C (VP coord) | Same verb form |
| "X rebooted" | "began logging" | CASE C (VP coord) | Aspectual verb |
| "X was verified" | "was approved" | CASE B (elliptical) | Same voice but new clause |

#### 3.1.3 "So" Disambiguation (Result vs. Purpose)

#### Diagram: "So" Disambiguation Decision Tree

```
                         ┌─────────────────────┐
                         │  Sentence contains  │
                         │  conjunction "so"   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  What follows "so"? │
                         └──────────┬──────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  "so that..."   │      │  "so as to..."  │      │  "so" + clause  │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│    PURPOSE      │      │    PURPOSE      │      │ Check for MODAL │
│ in_order_that   │      │ in_order_that   │      │ in right clause │
└─────────────────┘      └─────────────────┘      └────────┬────────┘
                                                           │
                                    ┌──────────────────────┴──────────────────────┐
                                    │                                             │
                                    ▼                                             ▼
                         ┌─────────────────────┐                       ┌─────────────────────┐
                         │ Modal present:      │                       │ No modal:           │
                         │ could/would/might/  │                       │ Indicative verb     │
                         │ can/will            │                       │                     │
                         └──────────┬──────────┘                       └──────────┬──────────┘
                                    │                                             │
                                    ▼                                             ▼
                         ┌─────────────────────┐                       ┌─────────────────────┐
                         │      PURPOSE        │                       │       RESULT        │
                         │   in_order_that     │                       │      therefore      │
                         └─────────────────────┘                       └─────────────────────┘

  "He worked late so       "He left early so        "He worked late so      "The system was slow
   that he could finish"    as to avoid traffic"     he could finish"        so the user refreshed"
          │                        │                        │                        │
          ▼                        ▼                        ▼                        ▼
      PURPOSE                  PURPOSE                  PURPOSE                   RESULT
   (in_order_that)          (in_order_that)          (in_order_that)           (therefore)
```

#### 3.1.4 Output Structure

**Input**: `"The server rebooted and was verified by the administrator."`

**Transformation**:
```
Original:  "The server rebooted and was verified by the administrator"
                │                        │
                │         ┌──────────────┘
                ▼         ▼
Clause 1:  "The server rebooted"
Clause 2:  "[The server] was verified by the administrator"
                 ↑
                 └── Injected from LEFT_SUBJECT
```

**Output**:
```json
{
  "@graph": [
    {
      "@id": "inst:Reboot_Act_001",
      "@type": "cco:IntentionalAct",
      "cco:affects": { "@id": "inst:Server_001" },
      "tagteam:clauseIndex": 0
    },
    {
      "@id": "inst:Verify_Act_002",
      "@type": "cco:IntentionalAct",
      "cco:has_agent": { "@id": "inst:Administrator_001" },
      "cco:affects": { "@id": "inst:Server_001" },
      "tagteam:clauseIndex": 1,
      "tagteam:subjectSource": "ellipsis_injection"
    },
    {
      "@id": "inst:ClauseRelation_001",
      "@type": "tagteam:ClauseRelation",
      "tagteam:relationType": "tagteam:and_then",
      "tagteam:fromClause": { "@id": "inst:Reboot_Act_001" },
      "tagteam:toClause": { "@id": "inst:Verify_Act_002" }
    }
  ]
}
```

#### 3.1.5 Acceptance Criteria

- [ ] Clause coordination (full) produces separate acts
- [ ] Clause coordination (elliptical) injects left subject
- [ ] VP coordination produces single act (no segmentation)
- [ ] Voice change triggers segmentation
- [ ] "so" + modal → Purpose; "so" + indicative → Result
- [ ] Ambiguous cases pass through with flag

---

### 3.2 Speech Act ICE Nodes

#### 3.2.1 Question ICE Node (ENH-002)

| Type | Pattern | Example |
|------|---------|---------|
| Yes/no | Aux + S + V | "Did they approve?" |
| Wh-object | Wh + aux + S + V | "What did they approve?" |
| Wh-subject | Wh + V | "Who approved?" |
| Tag | S + V, aux + pro? | "They approved, didn't they?" |

#### 3.2.2 Directive ICE Node (ENH-004)

##### Imperative Detection with Homonym Handling

#### Diagram: Imperative Detection Flowchart

```
                         ┌─────────────────────────┐
                         │ Sentence starts with    │
                         │ potential verb          │
                         └───────────┬─────────────┘
                                     │
                                     ▼
                         ┌─────────────────────────┐
                         │ Is word in VERB_NOUN_   │
                         │ HOMONYMS set?           │
                         └───────────┬─────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │ NO                              │ YES
                    ▼                                 ▼
         ┌─────────────────────┐          ┌─────────────────────┐
         │ Clear verb:         │          │ Check what follows  │
         │ IMPERATIVE          │          └───────────┬─────────┘
         └─────────────────────┘                      │
                                    ┌─────────────────┼─────────────────┐
                                    │                 │                 │
                                    ▼                 ▼                 ▼
                         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                         │ Followed by  │  │ Followed by  │  │ Followed by  │
                         │ COLON (:)    │  │ noun that    │  │ DET + NOUN   │
                         │              │  │ could be     │  │ (the, a, an) │
                         │              │  │ SUBJECT      │  │              │
                         └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                                │                 │                 │
                                ▼                 ▼                 ▼
                         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                         │ REJECT       │  │ REJECT       │  │ ACCEPT       │
                         │ Not imperative│  │ Not imperative│  │ IMPERATIVE   │
                         │ (Label/Def)  │  │ (Declarative)│  │              │
                         └──────────────┘  └──────────────┘  └──────────────┘

  Examples:

  "Monitor definition: a screen..."     "Monitor lizards are..."     "Monitor the port."
        │                                      │                           │
        ▼                                      ▼                           ▼
    COLON follows                      "lizards" could be            "the port" is
    → Label/definition                  subject of "Monitor"          object pattern
    → NOT IMPERATIVE                    → NOT IMPERATIVE              → IMPERATIVE
```

**Homonym Examples**:

| Input | Following Token(s) | Classification | Rationale |
|-------|-------------------|----------------|-----------|
| "Monitor the port." | DET + NOUN | Imperative | Object pattern |
| "Monitor definition:" | COLON | Not imperative | Label pattern |
| "Monitor lizards are..." | NOUN + VERB | Not imperative | Subject pattern |
| "List the files." | DET + NOUN | Imperative | Object pattern |
| "List: eggs, milk" | COLON | Not imperative | Label pattern |

---

### 3.3 Verb Class Routing

#### 3.3.1 Psych-Verb Causation (ENH-012)

##### Semantic Role Transformation

#### Diagram: Psych-Verb Role Transformation

```
                              STANDARD VERB
                     "The administrator reviewed the report"

                         ┌─────────────────────┐
                         │    Subject (NP1)    │
                         │   "administrator"   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     has_agent       │──────────────┐
                         └─────────────────────┘              │
                                                              │
                         ┌─────────────────────┐              │
                         │     Object (NP2)    │              │
                         │      "report"       │              │
                         └──────────┬──────────┘              │
                                    │                         │
                                    ▼                         ▼
                         ┌─────────────────────┐    ┌─────────────────────┐
                         │    has_patient      │    │  cco:IntentionalAct │
                         └─────────────────────┘    │  "review"           │
                                                    └─────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

                               PSYCH-VERB
                      "The failure worried the administrator"

                         ┌─────────────────────┐
                         │    Subject (NP1)    │
                         │     "failure"       │
                         │    [STIMULUS]       │
                         └──────────┬──────────┘
                                    │
                                    │  ┌─────────────────────────────────────┐
                                    │  │ TRANSFORMATION: Subject is NOT agent│
                                    │  │ Psych-verb inverts standard mapping │
                                    │  └─────────────────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     has_cause       │──────────────┐
                         │  (NOT has_agent!)   │              │
                         └─────────────────────┘              │
                                                              │
                         ┌─────────────────────┐              │
                         │    Object (NP2)     │              │
                         │  "administrator"    │              │
                         │   [EXPERIENCER]     │              │
                         └──────────┬──────────┘              │
                                    │                         │
                                    │  ┌─────────────────────────────────────┐
                                    │  │ TRANSFORMATION: Object IS the agent │
                                    │  │ The mind doing the worrying         │
                                    │  └─────────────────────────────────────┘
                                    │                         │
                                    ▼                         ▼
                         ┌─────────────────────┐    ┌─────────────────────┐
                         │     has_agent       │    │  cco:MentalProcess  │
                         │  (Experiencer is    │    │  "worry"            │
                         │   agent of mental   │    └─────────────────────┘
                         │   process!)         │
                         └─────────────────────┘

                              CCO COMPLIANCE:
                    ┌────────────────────────────────────┐
                    │ MentalProcess REQUIRES an agent    │
                    │ The Experiencer IS that agent      │
                    │ The Stimulus CAUSES the process    │
                    └────────────────────────────────────┘
```

**Output**:

```json
{
  "@type": "cco:MentalProcess",
  "@id": "inst:Worry_Process_001",
  "cco:has_agent": { "@id": "inst:Administrator_001" },
  "tagteam:has_cause": { "@id": "inst:Failure_001" },
  "tagteam:verbClass": "psych_verb"
}
```

#### 3.3.2 Wh-Movement & Do-Support (ENH-014)

##### Wh-Question Normalization

#### Diagram: Wh-Movement Normalization Flow

```
                    INPUT: "Which report did the auditor review?"

   Surface Structure:
   ┌─────────┐ ┌─────┐ ┌─────┐ ┌─────────┐ ┌────────┐
   │ Which   │ │ did │ │ the │ │ auditor │ │ review │
   │ report  │ │     │ │     │ │         │ │        │
   └────┬────┘ └──┬──┘ └──┬──┘ └────┬────┘ └────┬───┘
        │         │       │         │           │
        │    AUXILIARY    └────┬────┘           │
        │    (discard)         │                │
   FRONTED                  SUBJECT          MAIN VERB
   OBJECT                                   (semantic)
        │                      │                │
        │                      │                │
        ▼                      ▼                ▼
   ┌─────────────────────────────────────────────────┐
   │           NORMALIZATION PROCESS                 │
   │                                                 │
   │  1. Identify Wh-phrase: "which report"          │
   │  2. Classify function: OBJECT (fronted)         │
   │  3. Identify auxiliary: "did" (tense only)      │
   │  4. Identify subject: "the auditor"             │
   │  5. Identify main verb: "review"                │
   │  6. Check for negation: NONE                    │
   │  7. Reconstruct canonical order                 │
   └─────────────────────────────────────────────────┘
                         │
                         ▼
   Canonical Structure:
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │ the     │         │ review  │         │ which   │
   │ auditor │         │         │         │ report  │
   └────┬────┘         └────┬────┘         └────┬────┘
        │                   │                   │
     SUBJECT             VERB               OBJECT
     (agent)           (semantic)          (patient)
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
              Normalized: "the auditor review which report"
                            │
                            ▼
              ┌─────────────────────────────────┐
              │          v2Metadata             │
              │  whPhrase: "which report"       │
              │  whFunction: "object"           │
              │  headNoun: "report"             │
              │  negation: false                │
              └─────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════

                    INPUT: "Why didn't the server restart?"

   ┌─────┐ ┌─────────┐ ┌─────┐ ┌────────┐ ┌─────────┐
   │ Why │ │ didn't  │ │ the │ │ server │ │ restart │
   └──┬──┘ └────┬────┘ └──┬──┘ └────┬───┘ └────┬────┘
      │         │         │         │          │
   ADJUNCT   AUX+NEG      └────┬────┘       MAIN VERB
   (reason)  (did+not)         │
      │         │           SUBJECT
      │         │              │
      │    ┌────┴────┐         │
      │    │         │         │
      │  discard  PRESERVE     │
      │   aux     negation     │
      │              │         │
      ▼              ▼         ▼
   ┌─────────────────────────────────────────────────┐
   │          NORMALIZATION WITH NEGATION            │
   │                                                 │
   │  Normalized: "the server restart"              │
   │  v2Metadata:                                    │
   │    whPhrase: "why"                             │
   │    whFunction: "adjunct_reason"                │
   │    negation: TRUE  ◄── PRESERVED               │
   │    actualityStatus: [Interrogative, Negated]  │
   └─────────────────────────────────────────────────┘
```

##### Negation Preservation

| Input | Auxiliary | Negation | actualityStatus |
|-------|-----------|----------|-----------------|
| "Did they approve?" | did | false | [Interrogative] |
| "Didn't they approve?" | didn't | true | [Interrogative, Negated] |
| "Why won't it start?" | won't | true | [Interrogative, Negated] |

#### 3.3.3 Expletive Subject Detection (ENH-016)

#### Diagram: Expletive vs. Referential "It" Decision Tree

```
                         ┌─────────────────────────┐
                         │ Sentence contains "It"  │
                         │ as subject              │
                         └───────────┬─────────────┘
                                     │
                                     ▼
                         ┌─────────────────────────┐
                         │ Pattern: "It" + be +    │
                         │ [ADJ] + [clause/inf]?   │
                         └───────────┬─────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │ NO                              │ YES
                    ▼                                 ▼
         ┌─────────────────────┐          ┌─────────────────────┐
         │ Standard pronoun    │          │ Check ADJECTIVE     │
         │ resolution          │          │ TYPE                │
         │ (discourse/context) │          └───────────┬─────────┘
         └─────────────────────┘                      │
                                    ┌─────────────────┴─────────────────┐
                                    │                                   │
                                    ▼                                   ▼
                         ┌──────────────────┐               ┌──────────────────┐
                         │ EVALUATIVE/MODAL │               │ PHYSICAL         │
                         │ necessary        │               │ heavy, large     │
                         │ important        │               │ hard, soft       │
                         │ clear, obvious   │               │ hot, cold        │
                         │ likely, certain  │               └────────┬─────────┘
                         └────────┬─────────┘                        │
                                  │                                  │
                                  ▼                                  ▼
                         ┌──────────────────┐               ┌──────────────────┐
                         │ Check clause type │               │ Check DISCOURSE  │
                         └────────┬─────────┘               │ for prior        │
                                  │                         │ referent         │
                    ┌─────────────┴─────────────┐           └────────┬─────────┘
                    │                           │                    │
                    ▼                           ▼           ┌────────┴────────┐
         ┌──────────────────┐        ┌──────────────────┐   │                 │
         │ "that" + clause  │        │ "to" + infinitive│   ▼                 ▼
         │                  │        │                  │ ┌────────┐    ┌────────┐
         └────────┬─────────┘        └────────┬─────────┘ │ Prior  │    │ No     │
                  │                           │           │ ref    │    │ prior  │
                  ▼                           ▼           │ found  │    │ ref    │
         ┌──────────────────┐        ┌──────────────────┐ └───┬────┘    └───┬────┘
         │    EXPLETIVE     │        │ Check discourse  │     │            │
         │ (always for      │        │ for prior ref    │     ▼            ▼
         │  that-clauses)   │        └────────┬─────────┘ ┌────────┐  ┌────────┐
         └──────────────────┘                 │           │REFERENT│  │EXPLETIVE│
                                    ┌─────────┴─────────┐ │"It"=   │  │No entity│
                                    │                   │ │prior NP│  │node     │
                                    ▼                   ▼ └────────┘  └────────┘
                             ┌────────────┐     ┌────────────┐
                             │ Prior ref  │     │ No prior   │
                             │ exists     │     │ referent   │
                             └─────┬──────┘     └─────┬──────┘
                                   │                  │
                                   ▼                  ▼
                             ┌────────────┐     ┌────────────┐
                             │ REFERENTIAL│     │ EXPLETIVE  │
                             │ "It" = obj │     │ No entity  │
                             └────────────┘     └────────────┘


  Examples:

  "It is necessary that X restart."     "The server is heavy. It is hard to move."
            │                                      │
            ▼                                      ▼
    Evaluative + that-clause               Physical adj + prior referent
            │                                      │
            ▼                                      ▼
        EXPLETIVE                             REFERENTIAL
    No entity for "It"                    "It" = inst:Server_001
```

---

### 3.4 Discourse & Anaphora

#### 3.4.1 Concurrency Safety

#### Diagram: Session Lifecycle for Concurrency Safety

```
                    ┌─────────────────────────────────────────────────────────┐
                    │              TagTeamBuilder (SINGLETON)                  │
                    │                                                          │
                    │  ┌─────────────────────────────────────────────────┐    │
                    │  │  Configuration (immutable)                      │    │
                    │  │  • ontologyPath                                 │    │
                    │  │  • v2 settings                                  │    │
                    │  │  • NO DISCOURSE STATE                           │    │
                    │  └─────────────────────────────────────────────────┘    │
                    │                                                          │
                    │  createSession() ──┬──────────────────────────────────  │
                    │                    │                                     │
                    └────────────────────┼─────────────────────────────────────┘
                                         │
           ┌─────────────────────────────┼─────────────────────────────┐
           │                             │                             │
           ▼                             ▼                             ▼
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│     Session A       │     │     Session B       │     │     Session C       │
│  (Request 1)        │     │  (Request 2)        │     │  (Request 3)        │
│                     │     │                     │     │                     │
│ ┌─────────────────┐ │     │ ┌─────────────────┐ │     │ ┌─────────────────┐ │
│ │DiscourseState A │ │     │ │DiscourseState B │ │     │ │DiscourseState C │ │
│ │ • entities      │ │     │ │ • entities      │ │     │ │ • entities      │ │
│ │ • acts          │ │     │ │ • acts          │ │     │ │ • acts          │ │
│ │ • topicChain    │ │     │ │ • topicChain    │ │     │ │ • topicChain    │ │
│ │                 │ │     │ │                 │ │     │ │                 │ │
│ │ ISOLATED        │ │     │ │ ISOLATED        │ │     │ │ ISOLATED        │ │
│ └─────────────────┘ │     │ └─────────────────┘ │     │ └─────────────────┘ │
│                     │     │                     │     │                     │
│ build(text1) ───────┤     │ build(text1) ───────┤     │ build(text1) ───────┤
│      │              │     │      │              │     │      │              │
│      ▼              │     │      ▼              │     │      ▼              │
│ build(text2) ───────┤     │ build(text2) ───────┤     │ build(text2) ───────┤
│      │              │     │      │              │     │      │              │
│      ▼              │     │      ▼              │     │      ▼              │
│ finalize() ─────────┤     │ finalize() ─────────┤     │ finalize() ─────────┤
│      │              │     │      │              │     │      │              │
│      ▼              │     │      ▼              │     │      ▼              │
│ [Result A]          │     │ [Result B]          │     │ [Result C]          │
│ [State cleared]     │     │ [State cleared]     │     │ [State cleared]     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘

                         NO CROSS-SESSION INTERFERENCE
                         
           Session A's "the event" ≠ Session B's "the event"
           Each session maintains independent discourse context
```

**API Usage**:

```javascript
// CORRECT: Isolated sessions
const session = builder.createSession({ discourse: { enabled: true } });
session.build("The server failed.");
session.build("The administrator noticed the event.");  // "the event" → Fail_Act
const result = session.finalize();

// SAFE: Concurrent sessions
await Promise.all([
  processDoc(builder, doc1),  // Session A
  processDoc(builder, doc2),  // Session B
  processDoc(builder, doc3)   // Session C
]);
```

#### 3.4.2 Discourse Memory Model

```javascript
class DiscourseState {
  constructor() {
    this.entities = new Map();  // id → EntityRecord
    this.acts = [];             // ActRecord[]
    this.topicChain = [];       // Most salient entity per clause
    this.resolutions = [];      // Resolution history
  }
}

// Salience calculation
salience = (recency × 0.4) + (grammaticalRole × 0.3) + 
           (topicContinuity × 0.2) + (definiteness × 0.1)
```

---

## 4. Ontology Schema: tagteam.ttl

### 4.1 Schema Overview

**File**: `ontologies/tagteam.ttl`  
**Namespace**: `http://tagteam.fandaws.org/ontology/`

### 4.2 Core Classes

```turtle
@prefix : <http://tagteam.fandaws.org/ontology/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix cco: <https://www.commoncoreontologies.org/> .

<http://tagteam.fandaws.org/ontology/v2/> a owl:Ontology ;
    owl:versionInfo "2.0.0" ;
    owl:imports <http://tagteam.fandaws.org/ontology/core/> .

# Speech Act Classes (DirectiveContent is in core)
:SpeechAct rdfs:subClassOf cco:InformationContentEntity .
:Inquiry rdfs:subClassOf :SpeechAct .
:ConditionalContent rdfs:subClassOf :SpeechAct .

# Structural Classes
:ClauseRelation a owl:Class .
:CausativeAct rdfs:subClassOf cco:IntentionalAct .

# Actuality Status (Actual, Hypothetical, Prescribed, Negated in core)
:Interrogative a owl:NamedIndividual, :ActualityStatus .

# Clause Relations
:and_then a owl:NamedIndividual .
:therefore a owl:NamedIndividual .
:in_order_that a owl:NamedIndividual .
:contrasts_with a owl:NamedIndividual .

# Properties
:clauseIndex a owl:DatatypeProperty .
:subjectSource a owl:DatatypeProperty .
:whPhrase a owl:DatatypeProperty .
:verbClass a owl:DatatypeProperty .
:structuralAmbiguity a owl:AnnotationProperty .
```

---

## 5. Dependency Graph

```
TIER 1: FOUNDATION (v2.0 MVP)
═══════════════════════════════════════════════════════════════
PREREQUISITES:
  • v1 UPDATE: Wh-word entity recognition
  • tagteam.ttl schema

FEATURES:
  • ENH-007 (Clause Segmentation)
      ├── elliptical subject injection
      └── "so" disambiguation
  • ENH-014 (Wh-movement)
      └── negation preservation
  • ENH-002 (Question ICE)
  • ENH-006 (Conditional ICE)

TIER 2: VERB CLASSES (v2.1)
═══════════════════════════════════════════════════════════════
  • ENH-012 (Psych-verbs) ← CCO-compliant mapping
  • ENH-017 (Raising verbs)
  • ENH-013 (Causatives)
  • ENH-016 (Expletive subjects) ← referential "it" detection
  • ENH-004 (Directive ICE) ← homonym handling

TIER 3: DISCOURSE (v2.2)
═══════════════════════════════════════════════════════════════
  • Discourse Memory Model ← concurrency-safe sessions
  • ENH-010 (Abstract anaphora)
  • ENH-011 (Clausal subjects)
  • ENH-018 (Relative clauses)
```

---

## 6. Release Plan

### v2.0 MVP — Q2 2026

| Feature | Weeks |
|---------|-------|
| v1: Wh-word entities | 1 |
| tagteam.ttl schema | 1 |
| ENH-007 (with ellipsis, "so") | 5 |
| ENH-014 (with negation) | 3 |
| ENH-002 (yes/no questions) | 1 |
| ENH-006 (simple conditionals) | 2 |
| **Total** | **13 weeks** |

**Exit Criteria**:
- [ ] Elliptical subject injection: >85% accuracy
- [ ] "so" disambiguation: >85% accuracy
- [ ] Negated questions: >95% accuracy
- [ ] All output validates against tagteam.ttl

### v2.1 — Q3 2026 (12 weeks)

- Psych-verbs (CCO-compliant)
- Raising verbs, Causatives
- Expletive subjects (with referential "it")
- Directive ICE (with homonyms)

### v2.2 — Q4 2026 (12 weeks)

- Discourse model (concurrency-safe)
- Abstract anaphora
- Clausal subjects
- Relative clauses

---

## 7. API Changes

### 7.1 Configuration

```javascript
const builder = new TagTeamBuilder({
  v2: {
    enabled: true,
    clauseSegmentation: {
      enabled: true,
      ellipsisInjection: true
    },
    speechActNodes: {
      questions: true,
      directives: true,
      conditionals: true
    },
    discourse: {
      enabled: false  // v2.2
    }
  }
});
```

### 7.2 Document Mode (v2.2+)

```javascript
const session = builder.createSession({ discourse: { enabled: true } });
session.build("The server failed.");
session.build("The administrator noticed the event.");
const result = session.finalize();
```

---

## 8. Test Strategy

### 8.1 Test Matrix

| Category | Test File | Key Cases |
|----------|-----------|-----------|
| Elliptical coordination | elliptical-subjects.test.js | Voice change detection |
| "so" disambiguation | so-disambiguation.test.js | Modal detection |
| Negation preservation | negated-questions.test.js | didn't, won't, can't |
| Verb/noun homonyms | directive-homonyms.test.js | Colon, subject patterns |
| Expletive vs. referential | expletive-it.test.js | Adjective type, discourse |
| Psych-verb CCO | psych-verbs-cco.test.js | Experiencer as agent |
| Concurrency | concurrency.test.js | 100 parallel sessions |
| Schema validation | tagteam-ttl.test.js | All output validates |

### 8.2 Regression Requirements

1. Full v1 test suite passes
2. All output validates against tagteam.ttl
3. Concurrency: 100 parallel sessions, no leakage
4. Performance: <2x v1 latency

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0-spec | 2026-01-31 | Initial specification |
| 2.0.0-spec-v1.1 | 2026-01-31 | MVP scoping, edge cases, fallback behavior |
| 2.0.0-spec-v1.2 | 2026-01-31 | v1 prerequisites, elliptical subjects, "so" disambiguation, negation, psych-verb CCO compliance, concurrency safety, homonyms, expletive/referential "it", tagteam.ttl |
| 2.0.0-spec-v1.3 | 2026-01-31 | Added visual diagrams: pipeline architecture, clause segmentation flowchart, "so" decision tree, imperative detection, psych-verb transformation, Wh-movement normalization, expletive "it" decision tree, session lifecycle |