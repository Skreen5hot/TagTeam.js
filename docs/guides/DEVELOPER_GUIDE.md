# TagTeam.js Developer Guide

**Version:** 7.0 | **Date:** April 2026

---

## Part 1: What Is This?

TagTeam.js is a deterministic NLP parser that takes English text as input and produces a BFO/CCO-compliant JSON-LD knowledge graph as output. It runs entirely client-side — no LLMs, no neural networks, no API calls, no server. One `<script>` tag and a sentence is all you need.

The graph contains:
- **Entities** — the people, organizations, places, and things mentioned in the text
- **Acts** — what happened (or what is prescribed to happen)
- **Roles** — who did what to whom (agent, patient, recipient, location)
- **Deontic content** — obligations, permissions, and prohibitions expressed by modal verbs

Every IRI in the output resolves to a published ontology entry. The upper ontology is **BFO 2020** (Basic Formal Ontology) — it defines foundational categories like Process, Role, and Disposition. The mid-level ontology is **CCO 2.0** (Common Core Ontologies) — it defines Person, Organization, IntentionalAct, and hundreds of domain-general classes. Parser-internal metadata uses the **tagteam:** namespace.

TagTeam is designed as the parsing frontend for **Fandaws**, a BFO/CCO knowledge graph system. TagTeam produces candidate graphs from raw text; Fandaws resolves them against a full ontology with OWL reasoning.

### Key Concepts

**Two-tier architecture.** TagTeam separates *what the text says* from *what the text is about*. Tier 1 nodes (`DiscourseReferent`) represent textual mentions — they carry positional metadata (sentence index, token span). Tier 2 nodes (`Person`, `Organization`, etc.) represent real-world entities — they carry ontological metadata (type, genericity, roles). The two tiers are linked by `cco:is_about`. This separation is required by BFO: information content entities and independent continuants are ontologically disjoint. Collapsing them into one node would be an OWL reasoner violation.

**Realist Deontic Modeling (RDM).** When a sentence contains a modal verb ("shall", "must", "may"), TagTeam does not produce an act that happened — it produces a *directive* that prescribes, permits, or prohibits an act. The output chain is: Directive → PlanSpecification → Obligation. The PlanSpec carries the prescribed agent, patient, and act type. The Obligation inheres in the bearer (the entity that must comply).

**Ontology-driven graph assembly.** Domain-specific TTL files provide entity types, class hierarchies, and graph assembly templates. When a domain ontology is loaded, TagTeam uses it to promote generic entities to domain-specific types, bind act arguments to typed slots, and detect performative acts. Adding a new domain requires TTL authoring, not code changes.

### Annotated Example

Input: *"The officer arrested the suspect at the station."*

```
                                  JSON-LD Graph
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  TIER 1 (what the text says)                                           │
│  ┌─────────────────┐  ┌────────────────┐  ┌────────────────┐          │
│  │DR_The_officer_m1 │  │DR_the_suspect  │  │DR_the_station  │          │
│  │DiscourseReferent │  │DiscourseRef.   │  │DiscourseRef.   │          │
│  │label:"The officer"│ │label:"suspect" │  │label:"station" │          │
│  │span: [0,1]       │  │span: [3,4]     │  │span: [6,7]     │          │
│  └───────┬──────────┘  └───────┬────────┘  └───────┬────────┘          │
│          │ is_about            │ is_about          │ is_about          │
│          ▼                     ▼                    ▼                    │
│  TIER 2 (what the world contains)                                      │
│  ┌─────────────────┐  ┌────────────────┐  ┌────────────────┐          │
│  │Person_Officer    │  │Person_Suspect  │  │Entity_Station  │          │
│  │type: Person      │  │type: Person    │  │type: Entity    │          │
│  │is_bearer_of: ──┐ │  │is_bearer_of:─┐│  │is_bearer_of:─┐ │          │
│  └────────────────┼─┘  └──────────────┼┘  └──────────────┼──┘          │
│                   │                   │                   │             │
│                   ▼                   ▼                   ▼             │
│  ROLES                                                                  │
│  ┌─────────────────┐  ┌────────────────┐  ┌────────────────┐          │
│  │AgentRole         │  │PatientRole     │  │LocationRole    │          │
│  │inheres_in:Officer│  │inheres_in:Susp.│  │inheres_in:Stat.│          │
│  │realized_in: ─────┼──┤realized_in: ───┼──┤realized_in: ───┤          │
│  └─────────────────┘  └────────────────┘  └───────┬────────┘          │
│                                                     │                   │
│  ACT                                                │                   │
│  ┌──────────────────────────────────────────────────┘                   │
│  │  IntentionalAct: "arrested"                                          │
│  │  lemma: "arrest", status: Actual                                     │
│  └──────────────────────────────────────────────────────────────────── │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Running It

### Browser (zero configuration)

```html
<script src="tagteam.js"></script>
<script>
  const graph = TagTeam.buildGraph("The officer arrested the suspect.");
  console.log(JSON.stringify(graph, null, 2));
</script>
```

Or open `dist/standalone-demo.html` in any browser. Type a sentence, click parse, see the graph.

### Node.js

```bash
git clone https://github.com/Skreen5hot/TagTeam.js.git
cd TagTeam.js
npm install       # devDependencies only
npm run build     # creates dist/tagteam.js (~11 MB)
```

```javascript
const TagTeam = require('./dist/tagteam.js');

// Verify models are embedded
console.log(TagTeam.areModelsLoaded());  // true

// Parse a sentence
const graph = TagTeam.buildGraph("The officer arrested the suspect at the station.");
console.log(graph['@graph'].length);     // 16 nodes
console.log(graph._metadata.entities);   // 3
console.log(graph._metadata.roles);      // 3
```

If `areModelsLoaded()` returns `false`, the bundle was built without embedded models. Delete `dist/tagteam.js` and rebuild with `npm run build`.

### Verify installation

```bash
npm run test:ci   # 21 suites, 0 failures expected
```

---

## Part 3: Reading the Output

### 3.0 The Two-Tier Contract

Every entity in the graph appears as two nodes: a **Tier 1 DiscourseReferent** and a **Tier 2 real-world entity**. Understanding why is prerequisite to reading any graph.

**Tier 1 represents what the text says.** `DR_The_officer_m1` is a mention. It exists at token positions [0,1] in sentence 0. If the same officer is mentioned again in sentence 2, there would be a second DiscourseReferent with a different span — but both would point to the same Tier 2 entity.

**Tier 2 represents what the world contains.** `Person_Officer_56d013` is the real-world person. It carries the ontological type (`Person`), genericity (`INST` = specific instance), and role bearings (`AgentRole`).

**The grounding relation is `is_about`.** Tier 1 `is_about` Tier 2 connects a textual mention to its referent. The inverse `is_subject_of` (Tier 2 → Tier 1) is a back-link for traversal.

**Roles attach to Tier 2.** A Role node `inheres_in` a Tier 2 entity and is `realized_in` an IntentionalAct. Roles are properties of entities in the world, not properties of text spans. The VerbPhrase (Tier 1) denotes the act; the IntentionalAct (Tier 2) *is* the act.

This separation is not optional. BFO classifies information content entities and independent continuants as ontologically disjoint. Merging them into one node would cause OWL reasoner failures downstream.

### 3.1 Graph Envelope

```javascript
const graph = TagTeam.buildGraph("...");

graph['@context']    // 272 IRI mappings — never edit manually
graph['@graph']      // Array of nodes (Tier 1, Tier 2, roles, acts, provenance)
graph._metadata      // Diagnostic: pipeline, sentences, entity/act/role counts
```

The `@context` maps short property names (`inheres_in`, `is_about`, `Person`) to full opaque IRIs in BFO/CCO. Every property name in the graph resolves through this context.

### 3.2 Tier 1 Nodes

```json
{
  "@id": "inst:DR_The_officer_m1",
  "@type": ["tagteam:DiscourseReferent"],
  "rdfs:label": "The officer",
  "tagteam:mentionId": "bddb51cc:s0:m2",
  "tagteam:documentTokenSpan": [0, 1],
  "tagteam:denotesType": "Person",
  "tagteam:genericityCategory": "INST",
  "is_about": { "@id": "inst:Person_Officer_56d01376550e" },
  "tagteam:sentenceIndex": 0
}
```

| Property | Meaning |
|----------|---------|
| `mentionId` | `{parsingActHash}:s{sentenceIdx}:m{headTokenId}` — globally unique |
| `documentTokenSpan` | `[start, end]` token indices in the full document |
| `denotesType` | The ontological type this mention denotes (Person, Organization, etc.) |
| `genericityCategory` | `INST` (specific instance), `GEN` (generic kind), `UNIV` (universal) |
| `is_about` | Link to the Tier 2 entity this mention refers to |
| `sentenceIndex` | Which sentence this mention appears in (0-indexed) |

**VerbPhrase nodes** are a subtype of DiscourseReferent:

```json
{
  "@id": "inst:VP_arrested",
  "@type": ["tagteam:DiscourseReferent", "tagteam:VerbPhrase"],
  "rdfs:label": "arrested",
  "tagteam:lemma": "arrest",
  "tagteam:tenseAspect": { "@id": "tagteam:SimplePastTense" },
  "tagteam:sourceText": "arrested"
}
```

For modal sentences, VerbPhrase nodes also carry: `tagteam:modality` ("obligation", "permission", etc.), `tagteam:modalMarker` ("shall", "must", etc.), `tagteam:deonticCategory`, `tagteam:isPassive`.

### 3.3 Tier 2 Nodes

```json
{
  "@id": "inst:Person_Officer_56d01376550e",
  "@type": ["Person", "owl:NamedIndividual"],
  "rdfs:label": "officer",
  "tagteam:genericityCategory": "INST",
  "tagteam:typeBasis": "type-mapping",
  "is_subject_of": { "@id": "inst:DR_The_officer_m1" },
  "is_bearer_of": [{ "@id": "inst:Role_The_officer_AgentRole" }]
}
```

| Property | Meaning |
|----------|---------|
| `@type` | Ontological type: `Person`, `Organization`, `Artifact`, `GeopoliticalEntity`, `Group`, etc. |
| `typeBasis` | How the type was determined: `type-mapping` (HEAD_NOUN_TYPE_MAP), `ontology` (domain TTL), `gazeteer` |
| `is_subject_of` | Back-link to Tier 1 DiscourseReferent(s) |
| `is_bearer_of` | Back-link to Role node(s) this entity bears |

When a domain ontology is loaded, types may be domain-specific: `LegislativeBody`, `Elector`, `HouseMember`, etc.

### 3.4 Acts and Roles

**IntentionalAct** — what happened:
```json
{
  "@id": "inst:Act_arrested",
  "@type": ["IntentionalAct", "owl:NamedIndividual"],
  "rdfs:label": "arrested",
  "tagteam:lemma": "arrest",
  "tagteam:actualityStatus": { "@id": "tagteam:Actual" }
}
```

**Role** — who did what:
```json
{
  "@id": "inst:Role_The_officer_AgentRole",
  "@type": ["Role"],
  "rdfs:label": "AgentRole",
  "inheres_in": { "@id": "inst:Person_Officer_56d01376550e" },
  "realized_in": { "@id": "inst:Act_arrested" }
}
```

Role types: `AgentRole` (who did it), `PatientRole` (what it was done to), `RecipientRole` (who received), `LocationRole` (where), `SourceRole` (from where), `InstrumentRole` (with what).

The `inheres_in` → `realized_in` pattern reads as: "The AgentRole *inheres in* the officer and is *realized in* the arrest."

### 3.5 Deontic Content

When a modal verb is detected, the graph takes a different structural path.

**Non-modal:** "The officer arrested the suspect" → IntentionalAct + Role nodes

**Modal:** "The officer shall arrest the suspect" → Directive → PlanSpec → Obligation

```
VerbPhrase (Tier 1)
  └─ is_about → DirectiveInformationContentEntity
                  └─ prescribes → PlanSpecification
                                    ├─ prescribedAgent → Person_Officer
                                    ├─ prescribedPatient → Person_Suspect
                                    └─ prescribedActType: "arrest"
                  └─ ← is_prescribed_by ─ Obligation
                                            ├─ inheres_in → Person_Officer
                                            ├─ deonticCategory: UnconditionalObligation
                                            └─ fulfillmentState: Pending
```

**Why no Role nodes?** In a non-modal sentence, the arrest *happened* — agent and patient are participants in a realized event, so they get BFO Role nodes. In a deontic sentence, the arrest is *prescribed but not yet realized* — the participants appear on the PlanSpec as `prescribedAgent`/`prescribedPatient`. BFO Roles are only realized in actual processes. If you see a modal sentence with no Role nodes but correct PlanSpec bindings, the pipeline is working correctly.

### 3.6 Provenance

Every graph contains provenance nodes:

- **InformationBearingEntity** — the input text, with `has_text_value`, char/word counts, timestamp
- **Agent** — the TagTeam parser instance, with version and capabilities
- **IntentionalAct** (parsing act) — the act of parsing itself, linking input IBE to output DRs
- **SentenceCluster** — groups DRs and VPs by sentence index

### 3.7 Edge Cases

| Input | Output |
|-------|--------|
| Empty string `""` | Provenance nodes only. No DRs, no entities, no acts. |
| No extractable entities | VerbPhrase and provenance nodes. Tier 2 is empty. |
| Non-English text | Parser produces output, but POS tags and dep arcs are unreliable. No language detection — do not rely on the output. |
| Multi-sentence input | Segmenter splits into sentences. Each gets its own SentenceCluster. Cross-sentence entity resolution is not yet implemented. |

---

## Part 4: Domain Ontologies

### 4.1 The Pattern

TagTeam's architecture separates three concerns:

1. **NLP provides candidates** — entity spans, verb acts, syntactic structure (dependency arcs)
2. **Ontology provides structure** — class hierarchy, named individuals, act templates with typed argument slots
3. **Graph assembly combines them** — type promotion (generic Entity → domain-specific LegislativeBody), argument binding (PlanSpec.prescribedRecipient → the entity matching the required class)

Without an ontology, TagTeam classifies entities using a built-in HEAD_NOUN_TYPE_MAP (officer → Person, station → Entity). With an ontology, entities are promoted to domain-specific types and performative acts gain typed argument bindings.

### 4.2 Writing a Domain TTL

Start from `ontologies/examples/constitution.ttl`, not from a Protege export. Protege generates blank nodes and anonymous class expressions that the TurtleParser silently skips.

**Minimal domain class:**
```turtle
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix cco:  <http://www.ontologyrepository.com/CommonCoreOntologies/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix ex:   <https://example.org/domain#> .

ex:Contractor rdf:type owl:Class ;
    rdfs:subClassOf cco:Person ;
    rdfs:label "Contractor"@en ;
    skos:altLabel "contractor"@en ;
    skos:altLabel "contractors"@en ;
    rdfs:comment "A person or firm performing work under contract."@en .
```

**Named individual:**
```turtle
ex:ACME rdf:type owl:NamedIndividual , cco:Organization ;
    rdfs:label "ACME Corporation"@en ;
    skos:altLabel "ACME"@en .
```

**Performative act with graph assembly template:**
```turtle
ex:ActOfContracting rdf:type owl:Class ;
    rdfs:subClassOf cco:ActOfAuthorization , tagteam:PerformativeAct ;
    rdfs:label "Act of Contracting"@en ;
    skos:altLabel "contracted"@en ;
    skos:altLabel "contract"@en ;
    tagteam:requiresPatient ex:ContractedService ;
    tagteam:requiresRecipient ex:Contractor ;
    tagteam:preferredDepPosition "obl"@en .
```

### 4.3 How Matching Works

OntologyTextTagger scans the input text against all `rdfs:label` and `skos:altLabel` values in the loaded TTL.

**Priority order:**
1. Exact `rdfs:label` match (highest confidence)
2. Exact `skos:altLabel` match
3. Lemma match (morphological normalization)
4. Morphological variant (irregular plurals, verb inflections)

Multi-word phrases are matched as units. "House of Representatives" matches the label, not "House" + "of" + "Representatives" separately.

### 4.4 Graph Assembly Templates

When a verb matches an act class that is a subclass of `tagteam:PerformativeAct`, the builder:

1. Queries `tagteam:requiresPatient` → gets the expected patient class (e.g., `ex:ContractedService`)
2. Queries `tagteam:requiresRecipient` → gets the expected recipient class (e.g., `ex:Contractor`)
3. Searches the clause's extracted entities for type matches
4. If exactly one match → binds it to the argument slot
5. If multiple matches → uses `tagteam:preferredDepPosition` to disambiguate via dependency tree position
6. If no match → leaves the slot empty (no hallucination)

### 4.5 Safe TTL Patterns

**Fully tested — use freely:**

| Construct | Example |
|-----------|---------|
| `@prefix` declarations | `@prefix cco: <...> .` |
| `rdf:type` / `a` | `ex:Foo a owl:Class .` |
| `rdfs:label`, `rdfs:comment` | With `@en` language tags |
| `rdfs:subClassOf` (named targets) | Transitive chain walking works |
| `skos:altLabel` (multiple) | Comma-separated object lists |
| `owl:Class`, `owl:ObjectProperty`, `owl:DatatypeProperty` | Type declarations |
| `owl:NamedIndividual` | Multi-type (`a owl:NamedIndividual , cco:Person`) |
| Semicolon predicate lists | `ex:Foo a owl:Class ; rdfs:label "Foo" .` |
| Language tags, datatype annotations | `"text"@en`, `"5"^^xsd:integer` |

**Silently skipped — do not use:**

| Construct | Why |
|-----------|-----|
| Blank nodes `[ rdf:type owl:Restriction ]` | Common in Protege exports |
| OWL restrictions (`owl:onProperty`, `owl:someValuesFrom`) | Requires OWL reasoner |
| `owl:unionOf`, `owl:intersectionOf` | Collection-based class expressions |
| `rdf:first` / `rdf:rest` (RDF collections) | Not implemented |

For full OWL reasoning, pass the output graph to Fandaws.

**Known matching gaps** (see `docs/development/PLANNED_WORK.md` §5.3b for details):
- **Multi-word phrase lemmatization:** "hand guns" does NOT match label "Hand Gun" — the lemmatizer normalizes single-word labels only, not individual tokens within multi-word phrases
- **No synonym/hypernym expansion:** "gun" does not match "Firearm" or "Hand Gun" — the tagger matches surface forms only, not semantic equivalents
- **Mitigation:** add `skos:altLabel` entries for common inflected and colloquial forms in your domain TTL

### 4.6 Worked Example: Contract Law Domain

**Step 1 — Write the TTL** (`ontologies/examples/contract-law.ttl`):

```turtle
@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix cco:  <http://www.ontologyrepository.com/CommonCoreOntologies/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix tagteam: <https://example.org/tagteam/ontology#> .
@prefix cl:   <https://example.org/contract-law#> .

cl:ContractingParty rdf:type owl:Class ;
    rdfs:subClassOf cco:Organization ;
    rdfs:label "Contracting Party"@en ;
    skos:altLabel "party"@en ;
    skos:altLabel "parties"@en .

cl:ContractualObligation rdf:type owl:Class ;
    rdfs:subClassOf cco:NormativeDescription ;
    rdfs:label "Contractual Obligation"@en ;
    skos:altLabel "obligation"@en ;
    skos:altLabel "obligations"@en .

cl:ACME rdf:type owl:NamedIndividual , cl:ContractingParty ;
    rdfs:label "ACME Corporation"@en ;
    skos:altLabel "ACME"@en .
```

**Step 2 — Load and parse:**

```javascript
const ttl = fs.readFileSync('ontologies/examples/contract-law.ttl', 'utf-8');
const tagger = TagTeam.OntologyTextTagger.fromTTL(ttl, {
  propertyMap: { keywords: 'rdfs:label', label: 'rdfs:label' }
});

const graph = TagTeam.buildGraph(
  "ACME shall fulfill all contractual obligations to the parties.",
  { ontology: tagger, ontologyThreshold: 0.2 }
);
```

**Step 3 — Observe the difference.** Without the ontology, "ACME" would be typed as a generic `Entity`. With the ontology, it becomes `ContractingParty` because the TTL declares `cl:ACME` as a `NamedIndividual` of type `cl:ContractingParty`.

---

## Part 5: The NLP Pipeline

### 5.1 Sentence Segmentation

`SentenceSegmenter` splits multi-sentence input before parsing. Each sentence is parsed independently.

| Rule | Trigger | Example |
|------|---------|---------|
| B-1 | Period/question/exclamation at end of word | "The officer arrived. The suspect fled." |
| B-2 | Numbered list marker | "1. First item 2. Second item" |
| B-3 | Semicolon between independent clauses | "Officers patrol; suspects flee" |
| B-4 | Section header followed by body text | "Article I: All powers..." |

The abbreviation lexicon (`src/nlp/abbreviation-lexicon.json`) prevents false splits on "U.S.", "Dr.", "Corp.", "Inc.", etc.

Parenthetical clauses are extracted as separate parsing units when they meet three criteria: contain a modal verb, contain a finite verb, and exceed 5 tokens.

### 5.2 Tokenization and POS Tagging

The **Tokenizer** splits on whitespace and punctuation, expands contractions ("can't" → "ca" + "n't", "won't" → "wo" + "n't"), and preserves hyphenated proper noun compounds ("Secretary-General").

The **PerceptronTagger** (averaged perceptron, 93.5% accuracy) assigns Penn Treebank tags:

| Tag | Meaning | Example |
|-----|---------|---------|
| NN | Common noun, singular | officer, station |
| NNP | Proper noun | Congress, ACME |
| NNS | Common noun, plural | officers |
| VBD | Verb, past tense | arrested |
| VBN | Verb, past participle | arrested (passive) |
| VBZ | Verb, 3rd person singular | arrests |
| MD | Modal | shall, must, may |
| JJ | Adjective | legislative |
| IN | Preposition | at, in, by |
| DT | Determiner | the, a, each |

### 5.3 Dependency Parsing

The **DependencyParser** (arc-eager transition-based, 85.3% UAS) produces a tree of labeled arcs:

```
The  officer  arrested  the  suspect  at  the  station  .
DT   NN       VBN       DT   NN       IN  DT   NN       .
 └─det─┘       │         └─det─┘       │   └─det─┘
        └─nsubj─┘               └─obj──┘       └──obl──┘
                                         └─case─┘
```

Key arc labels:
| Label | Meaning | Role implication |
|-------|---------|-----------------|
| `nsubj` | Nominal subject | AgentRole (active), PatientRole (passive) |
| `obj` | Direct object | PatientRole |
| `iobj` | Indirect object | RecipientRole |
| `obl` | Oblique argument | LocationRole, SourceRole, or adjunct |
| `nmod` | Nominal modifier | Possessive or prepositional modifier |
| `aux` | Auxiliary verb | Tense/aspect marker |
| `aux:pass` | Passive auxiliary | Passive voice signal ("was arrested") |
| `case` | Case marker | Preposition governing an obl/nmod |

The **DepTree** API is 1-indexed (token 1 = first word). `getChildren(id)` returns direct dependents. `getHead(id)` returns the governor.

**DepTreeCorrector** applies post-parse fixes:
- `correctDoubleObjDitransitives()`: first `obj` → `iobj` for ditransitive verbs ("gave the officer the report")
- `recoverDitransitiveOrphans()`: `obl:unmarked` → `obj` for misparsed ditransitives
- `correctOntologyDemotedVerb()`: promotes `ccomp` child to root when ontology matching demotes the syntactic root

### 5.4 Tree Extractors

**TreeEntityExtractor** walks the dependency tree to find entity spans:
- Scans `nsubj`, `obj`, `obl`, `nmod` arcs from verb roots
- Expands spans to include determiners, adjective modifiers, compound nouns
- Handles coordination splitting per TT-SPEC-ENT-A: common noun conjuncts ("officers and suspects") are split into separate entities; proper noun compounds ("Smith and Wesson") are preserved
- Classifies types via HEAD_NOUN_TYPE_MAP (officer → Person, station → Entity) with ontology hint override when available

**TreeActExtractor** identifies verbs and their properties:
- Finds verbs from dependency roots and embedded clauses (`xcomp`, `ccomp`, `conj`)
- Detects modality: 10 single-word modals (shall, must, may, can, could, would, might, should, will, ought) + 3 multi-word ("have to", "need to", "ought to")
- Detects passive voice (`aux:pass` child)
- Detects negation (`advmod` "not"/"n't")
- Detects tense/aspect from POS tags and auxiliary children
- Builds act objects with verb, lemma, tag, modality, passive flag, tenseAspect

**TreeRoleMapper** assigns semantic roles in two passes (TT-SPEC-RDM-C):

**Pass 1 — Core arguments** (`_assignCoreArgRoles`):
- `nsubj` → AgentRole (active) or PatientRole (passive `nsubj:pass`)
- `obj` → PatientRole
- `iobj` → RecipientRole

**Pass 2 — Oblique PPs** (`_assignObliquePPRoles`):
- Scans `obl` arcs with `case` preposition children
- Applies adjunct suppression: if core arg slots are already filled and the preposition is in `ADJUNCT_PREPOSITIONS` (in, at, on, with, for, near), the PP is suppressed as an adjunct — unless the verb is in `ROLE_BEARING_PP_VERBS`
- Remaining PPs get LocationRole (at/in/on), InstrumentRole (with), SourceRole (from), RecipientRole (to, with animacy check)

**Ordering constraint:** Pass 1 must complete fully before Pass 2 runs. Pass 2's adjunct suppression checks whether core arg slots are occupied. Refactoring into a single loop will produce silent role assignment bugs.

### 5.5 Semantic Graph Builder

The main orchestrator (`SemanticGraphBuilder.js`) runs a forest loop — one iteration per sentence:

1. **Sentence segmentation** — split input into sentences
2. **Tokenize + POS tag** — for each sentence
3. **Dependency parse** — produce the dep tree
4. **DepTreeCorrector** — post-parse fixes
5. **Ontology tagging** (if ontology loaded) — clause-level authority match, entity type hints
6. **Tree extraction** — entities, acts, roles
7. **Tier 1 construction** — DiscourseReferent + VerbPhrase nodes
8. **Tier 2 construction** — RealWorldEntityFactory promotes entities to typed Tier 2 nodes
9. **Role binding** — Role nodes with `inheres_in` (Tier 2) and `realized_in` (Act)
10. **Deontic path** (modal sentences) — Directive → PlanSpec → Obligation
11. **Performative Act detection** (ontology-driven) — checks `isSubclassOf(matchedClass, 'tagteam:PerformativeAct')`
12. **Mereological enrichment** — `continuant_part_of` edges from `bfo:BFO_0000050` in loaded ontology
13. **Provenance** — IBE, Agent, ParsingAct, SentenceCluster nodes
14. **Cleanup** — remove debug properties, finalize `@context`

---

## Part 6: Testing and Debugging

### 6.1 Test Suites

| Suite | Command | Expects |
|-------|---------|---------|
| CI (21 suites) | `npm run test:ci` | 0 failures |
| SBA | `node tests/sba/sba-wave1.test.js` | 143/144 (99.3%) |
| CCO | `node tests/corpus/cco-complex-regression.test.js` | 106/106 (100%) |
| ISA multi-sentence | `node tests/corpus/isa-multi-sentence.test.js` | 70/70 (100%) |
| Gold evaluation | `npm run gold:evaluate` | Entity F1 >= 88%, Role F1 >= 83% |
| SHACL shapes | `node tests/shacl/sba-shapes.test.js` | 21/21 (100%) |

### 6.2 Debugging a Bad Parse

**Step 1 — Get diagnostic output:**

```javascript
const graph = TagTeam.buildGraph(text, { verbose: true });
// POS tags in graph._debug.tokens (array of { text, tags })
// Sentence data in graph._metadata.sentences (tokens, tags, arcs, root)
```

**Step 2 — Systematic diagnostic:**

| Check | Where | What to look for |
|-------|-------|------------------|
| Segmentation | `graph._metadata.sentences` | Did multi-sentence input split correctly? |
| POS tags | `graph._metadata.sentences[0].tags` | Is the verb tagged VBD/VBN? Is the noun NN/NNP? |
| Dep arcs | `graph._metadata.sentences[0].arcs` | Is nsubj pointing to the right token? Is obj correct? |
| Entities | `graph._metadata.entities` | Count. Are entity spans too wide or too narrow? |
| Acts | `graph._metadata.acts` | Count. Is modality detected? Is passive flag correct? |
| Roles | `graph._metadata.roles` | Count. Are roles on the right entities? |

**Step 3 — Open `dist/standalone-demo.html`** in a browser, paste the sentence, and inspect the visual graph. The demo shows all nodes and edges interactively.

### 6.3 Common Failure Modes

| Symptom | Likely cause | Where to look |
|---------|-------------|---------------|
| Wrong entity type | POS mistagging (NN vs NNP) | `_metadata.sentences[0].tags` |
| Entity span too wide | Missed coordination split | TreeEntityExtractor, ENT-A logic |
| Zero roles on a verb | Stative suppression | Check `RMC_STATIVE_PREDICATES` in RoleMappingContract.js |
| Missing oblique role | Adjunct suppression | Check `ADJUNCT_PREPOSITIONS` and core arg saturation |
| Wrong role assignment | Incorrect dep arc | `_metadata.sentences[0].arcs` — look at label and head |
| No deontic content | Modal not detected | Check if word is in `MODAL_TABLE` in TreeActExtractor.js |

### 6.4 Adding Gold Test Sentences

Edit `tests/gold/sentences.js`:

```javascript
{
  text: "The contractor delivered the materials to the site.",
  expectedEntities: [
    { text: "contractor", type: "Person" },
    { text: "materials", type: "Artifact" },
    { text: "site", type: "Entity" }
  ],
  expectedRoles: [
    { role: "AgentRole", entity: "contractor" },
    { role: "PatientRole", entity: "materials" },
    { role: "RecipientRole", entity: "site" }
  ]
}
```

Run `npm run gold:evaluate` to measure impact. A new sentence that drops F1 reveals a pipeline gap worth investigating.

---

## Part 7: Build System

`scripts/build.js` concatenates all source files into a single UMD bundle at `dist/tagteam.js`.

**What happens at build time:**
- POS model weights (`src/data/pos-weights-pruned.json`) are embedded as JSON literals
- Dep parser weights (`src/data/dep-weights-pruned.json`) are embedded as JSON literals
- Gazetteer data is embedded inline
- SentenceSegmenter's abbreviation lexicon (`src/nlp/abbreviation-lexicon.json`) is inlined
- All `require('fs')` and `require('path')` calls are stripped (browser-incompatible)
- RoleMappingContract and DepTreeCorrector have **bundle shims** in the build script — if you add new exports to these modules, you must update the corresponding shim in `scripts/build.js`

**Build integrity gate:** The build script scans the output for `require('fs')` and `readFileSync`. If found, the build fails. This prevents Node.js-only code from reaching the browser bundle.

**Build number:** Auto-incremented in `scripts/build-number.json`. Stamped into the bundle header.

**Demo sync:** `demos/tagteam.js` must match `dist/tagteam.js`. After any build, copy the file or the Production Readiness Checklist will flag the mismatch.

```bash
npm run build                    # Build the bundle
cp dist/tagteam.js demos/        # Sync demo copy
```

---

## Part 8: Normative Specifications

The codebase implements these formal specifications. Each spec is the authoritative source for its domain — if the code and the spec disagree, the spec wins (file a bug).

| Spec ID | Title | Scope | File |
|---------|-------|-------|------|
| TT-SPEC-SBA | Sentence Boundary Architecture v1.3 | Rules B-1 through B-4, parenthetical extraction, SentenceRecord schema, JSON-to-RDF projection, mentionId format | `docs/tagteam-sentence-boundary-spec-v1.3.md` |
| TT-SPEC-RDM-A | RDM Addendum A v1.2 | Ditransitive recipient detection, passive PP guard, animacy check, `_resolveToPPRole()` unification | `docs/tagteam-rdm-addendum-a-v1.1.md` |
| TT-SPEC-RDM-B | RDM Addendum B v1.1 | VP coordination role propagation, composite `entityByHead` keys, shared-argument inheritance across conjoined VPs | `docs/tagteam-rdm-addendum-b-v1.1.md` |
| TT-SPEC-RDM-C | RDM Addendum C v1.1 | Two-pass role assignment (core args then oblique PPs), PP adjunct suppression, argument saturation, `ROLE_BEARING_PP_VERBS` whitelist | `docs/tagteam-rdm-addendum-c-v1.1.md` |
| TT-SPEC-ENT-A | Entity Addendum A v1.1 | Subject/object coordination entity splitting, common noun conjunct detection, proper noun compound preservation | `docs/tagteam-ent-addendum-a-v1.1.md` |
| TT-SPEC-ENT-B | Entity Addendum B v1.1 | CDD ontology awareness (`knownIndividuals`), entity splitting + ontology hint ordering, `continuant_part_of` propagation | `docs/tagteam-ent-addendum-b-v1.1.md` |
| TT-SPEC-SGB-A | Graph Assembly Addendum A v1.1 | Document authority wiring, performative Act detection via `isSubclassOf(PerformativeAct)`, Graph Assembly Template pattern (`requiresPatient`/`requiresRecipient`/`preferredDepPosition`) | `docs/tagteam-sgb-addendum-a-v1.1.md` |
