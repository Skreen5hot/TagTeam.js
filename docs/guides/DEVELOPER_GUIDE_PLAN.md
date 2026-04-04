# Developer Guide Plan

**Audience:** A developer who has never seen TagTeam.js, joining the project or integrating with it.
**Goal:** They can understand what TagTeam does, run it, read the output, extend it with a domain ontology, and debug problems — within one sitting.

---

## Part 1: What Is This? (2 pages)

**What they need to know before touching any code.**

- TagTeam is a **deterministic NLP parser** that turns English text into BFO/CCO-compliant knowledge graphs
- No LLMs, no neural networks, no API calls — runs entirely in the browser or Node.js
- Output is JSON-LD: a graph of entities, acts, roles, and deontic content
- Every IRI in the output maps to a published ontology (BFO 2020, CCO 2.0, or tagteam: namespace)
- Designed as the parsing frontend for Fandaws (knowledge graph backend)

**Key concepts to define:**
- BFO (Basic Formal Ontology) — the upper ontology. Defines categories like Process, Role, Disposition
- CCO (Common Core Ontologies) — mid-level. Defines Person, Organization, IntentionalAct, etc.
- Two-tier architecture: Tier 1 (DiscourseReferent = what the text says) vs Tier 2 (Person/Org = what it refers to)
- Realist Deontic Modeling: how "shall", "must", "may" produce Directive → PlanSpec → Obligation chains
- Ontology-driven graph assembly: domain TTLs provide the template, NLP provides the candidates

**Include:** One annotated JSON-LD output for "The officer arrested the suspect" showing every node and edge with plain-English explanation.

---

## Part 2: Running It (1 page)

**Get from zero to parsed output in 5 minutes.**

- Clone, `npm install`, `npm run build`
- Browser: open `dist/standalone-demo.html`, type a sentence, see the graph
- Node.js: `const TagTeam = require('./dist/tagteam.js'); TagTeam.buildGraph("...")`
- Verify: `TagTeam.areModelsLoaded()` should return `true`
  - If it returns `false`: the bundle was built without embedded models. Rebuild with `npm run build`.
- Run tests: `npm run test:ci` — expect 21 suites, 0 failures

---

## Part 3: Reading the Output (3 pages)

**The graph structure, node by node.**

### 3.0 The Two-Tier Contract

Before examining individual nodes, understand the structural contract that governs the entire graph.

**Tier 1 represents what the text says.** A DiscourseReferent is a mention — it exists at a specific position in a specific sentence. If the same person is mentioned three times, there are three DiscourseReferent nodes.

**Tier 2 represents what the world contains.** A Person or Organization node represents a real-world entity. It may be the target of multiple Tier 1 mentions across sentences.

**The grounding relation is `cco:is_about`.** Tier 1 → `is_about` → Tier 2 connects a textual mention to the real-world entity it refers to. The inverse, `is_subject_of` (Tier 2 → Tier 1), is a back-link for O(1) traversal.

**Roles and acts attach to Tier 2, not Tier 1.** A Role node `inheres_in` a Tier 2 entity (the bearer) and is `realized_in` an IntentionalAct (the event). This is because roles are properties of entities in the world, not properties of text spans. The VerbPhrase (Tier 1) denotes the act; the IntentionalAct (Tier 2) is the act.

**Why every entity appears twice:** When a developer sees both `DR_The_officer_m1` and `Person_Officer_abc123`, they are looking at the mention and its referent. The mention carries positional metadata (sentence index, token span). The entity carries ontological metadata (type, genericity, roles). They are linked by `is_about`. This separation is required by BFO: information content entities (Tier 1) and independent continuants (Tier 2) are ontologically disjoint — collapsing them into one node would be an OWL disjointness violation.

### 3.1 Graph Envelope
- `@context` — 272 IRI mappings. Never edit manually. Every alias resolves to a BFO/CCO opaque IRI or a `tagteam:` namespace property.
- `@graph` — array of nodes (Tier 1, Tier 2, roles, acts, deontic content, provenance)
- `_metadata` — pipeline info, sentence boundaries, entity/act/role counts. Not part of the JSON-LD graph; diagnostic only.

### 3.2 Tier 1 Nodes (DiscourseReferent)
- What they are: mentions in the text
- Key properties: `rdfs:label`, `mentionId`, `sentenceIndex`, `documentTokenSpan`
- VerbPhrase nodes: `modality`, `isPassive`, `tenseAspect`, `sourceText`
- Link to Tier 2 via `is_about`

### 3.3 Tier 2 Nodes (Real-World Entities)
- What they are: the things the text is about
- Types: Person, Organization, Artifact, GeopoliticalEntity, Group, etc. (from CCO or domain ontology)
- Key properties: `rdfs:label`, `genericityCategory` (INST/GEN/UNIV), `typeBasis`
- Back-links: `is_subject_of` → Tier 1 DR, `is_bearer_of` → Role node(s)

### 3.4 Acts and Roles
- IntentionalAct: what happened (`arrested`)
- Role nodes: AgentRole, PatientRole, RecipientRole, LocationRole, SourceRole, etc.
- Role → `inheres_in` → Tier 2 entity (the bearer), `realized_in` → Act (the event)
- EventDescription: ontology-mapped act classification (when ontology is loaded)

### 3.5 Deontic Content (Modal Sentences)
- When modality is detected ("shall", "must", "may"), the graph takes a **different path** than non-modal sentences:
  - DirectiveInformationContentEntity (the directive — the speech act that prescribes)
  - PlanSpecification (what must happen: `prescribedAgent`, `prescribedPatient`, `prescribedActType`)
  - Obligation/Permission/Prohibition (who bears the duty — `inheres_in` → bearer entity)
  - ConjunctiveObligation (when coordinated clauses share a modal)

**Why no Role nodes for deontic sentences:** In a non-modal sentence ("The officer arrested the suspect"), the arrest *happened* — the agent and patient are participants in a realized event, so they get Role nodes. In a deontic sentence ("The officer shall arrest the suspect"), the arrest is *prescribed but not yet realized* — the agent and patient are participants in a normative specification, not an actualized event. BFO Roles are only realized in actual processes, so the participants appear on the PlanSpec as `prescribedAgent`/`prescribedPatient` instead. This is not a missing feature — it is the ontologically correct representation. If a developer sees a modal sentence with no Role nodes but correct PlanSpec bindings, the pipeline is working as designed.

### 3.6 Provenance
- InformationBearingEntity (the input text — carries `has_text_value`)
- Agent (TagTeam parser instance)
- IntentionalAct (the parsing act itself — the act of parsing, not a parsed act)
- SentenceCluster (sentence grouping for multi-sentence inputs)

### 3.7 Error and Edge Cases
- **Empty string input:** Returns a graph with provenance nodes only — no DRs, no entities, no acts.
- **No extractable entities:** Returns VerbPhrase and provenance nodes. Tier 2 is empty.
- **Non-English input:** The parser will produce output, but POS tags and dependency arcs will be unreliable. TagTeam does not detect language — garbage in, garbage out. Do not rely on the output for non-English text.
- **Very long input:** Multi-sentence segmenter handles paragraph-length input. No hard character limit is enforced, but parse time scales linearly with sentence count.

---

## Part 4: Domain Ontologies (3 pages)

**How to make TagTeam understand a new domain without writing code.**

### 4.1 The Pattern
- NLP provides candidates (entities, acts, syntactic structure)
- Ontology provides structure (class hierarchy, act templates, named individuals)
- Graph assembly combines them (type promotion, argument binding)

### 4.2 Writing a Domain TTL

**Start from `ontologies/examples/constitution.ttl`**, not from a Protege export. The TurtleParser handles a specific subset of Turtle syntax (see 4.5) and Protege-generated TTL uses blank nodes, anonymous class expressions, and OWL restrictions that the parser will silently skip.

- Declare classes with `rdfs:subClassOf` chain rooted in BFO/CCO
- Add `rdfs:label` (primary match) and `skos:altLabel` (alias matches for inflections, abbreviations, plurals)
- Declare named individuals for specific known entities (e.g., `tagteam:Congress`)
- For performative acts: subclass `tagteam:PerformativeAct`, add `requiresPatient`/`requiresRecipient`

### 4.3 How Matching Works
- OntologyTextTagger scans text against labels/altLabels
- Priority: exact `rdfs:label` match > `skos:altLabel` match > lemma match > morphological variant
- Multi-word phrases matched as units ("House of Representatives")
- Confidence scores based on match quality and match type

### 4.4 Graph Assembly Templates
- `tagteam:requiresPatient` — declares what ontology class fills the patient slot of this act
- `tagteam:requiresRecipient` — declares what ontology class fills the recipient slot
- `tagteam:preferredDepPosition` — syntactic disambiguation hint (e.g., "obl" for oblique arguments)
- When an act class is identified, the builder queries these properties and searches extracted entities for type matches. If a match is found, the entity is bound to the act's argument slot. If multiple matches exist, the dep tree position disambiguates.

### 4.5 Safe TTL Patterns (TurtleParser Capabilities)

**Write TTLs using only these constructs — they are fully tested:**

| Construct | Example | Status |
|-----------|---------|--------|
| `@prefix` declarations | `@prefix cco: <...> .` | Supported |
| `rdf:type` / `a` shorthand | `ex:Foo rdf:type owl:Class .` | Supported |
| `rdfs:label`, `rdfs:comment` | String literals with `@en` tags | Supported |
| `rdfs:subClassOf` (named targets) | `ex:Foo rdfs:subClassOf cco:Person .` | Supported (transitive walk) |
| `skos:altLabel` (multiple) | Comma-separated object lists | Supported |
| `owl:Class`, `owl:ObjectProperty`, `owl:DatatypeProperty` | Type declarations | Supported |
| `owl:NamedIndividual` | Multi-type declarations | Supported |
| Semicolon predicate lists | `ex:Foo a owl:Class ; rdfs:label "Foo" .` | Supported |
| Comma object lists | `ex:Foo skos:altLabel "a" , "b" .` | Supported |
| Language tags | `"label"@en` | Supported (stripped on read) |
| Datatype annotations | `"5"^^xsd:integer` | Supported |

**Do NOT use — the parser will silently skip these:**

| Construct | Example | Why |
|-----------|---------|-----|
| Blank nodes | `[ rdf:type owl:Restriction ]` | Common in Protege exports |
| OWL restrictions | `owl:onProperty`, `owl:someValuesFrom` | Requires OWL reasoner |
| `owl:unionOf`, `owl:intersectionOf` | Collection-based class expressions | Requires list parsing |
| `rdf:first` / `rdf:rest` | RDF collections/lists | Not implemented |
| Named graphs | `GRAPH <...> { ... }` | Not implemented |

For full OWL reasoning over complex class expressions, pass the graph to Fandaws.

### 4.6 Worked Example
- Walk through adding a new domain (e.g., contract law) from scratch
- Define 3-4 classes, 1 performative act, 2 named individuals
- Show the TTL, the input sentence, and the resulting graph
- Show what happens when the ontology is NOT loaded (baseline) vs. when it IS loaded (enriched)

---

## Part 5: The NLP Pipeline (3 pages)

**How text becomes a graph. Follow a sentence through the pipeline.**

### 5.1 Sentence Segmentation
- SentenceSegmenter splits multi-sentence input
- Rules B-1 (standard), B-2 (numbered list), B-3 (semicolon), B-4 (section header)
- Parenthetical extraction (3-criteria guard: modal, finite verb, >5 tokens)
- Abbreviation lexicon prevents false splits ("U.S.", "Dr.", "Corp.")

### 5.2 Tokenization and POS Tagging
- Tokenizer: whitespace + punctuation splitting, contraction expansion ("can't" → "ca" + "n't"), hyphenated proper noun compound handling
- PerceptronTagger: averaged perceptron, 93.5% accuracy, Penn Treebank tagset
- Tags: NN (noun), NNP (proper noun), VBD (past tense), VBN (past participle), MD (modal), JJ (adjective), etc.

### 5.3 Dependency Parsing
- Arc-eager transition-based parser, 85.3% UAS
- Universal Dependencies v2 label set: nsubj, obj, obl, nmod, amod, det, case, aux, aux:pass, etc.
- DepTree API: 1-indexed token IDs, `getChildren(id)`, `getDescendants(id)`, `getHead(id)`
- DepTreeCorrector: post-parse fixes — ditransitive obj→iobj rewrite (`correctDoubleObjDitransitives`), orphan recovery (`recoverDitransitiveOrphans`), ontology-demoted verb promotion (`correctOntologyDemotedVerb`)

### 5.4 Tree Extractors
- **TreeEntityExtractor**: walks nsubj/obj/obl/nmod arcs, builds entity spans including determiners and modifiers, handles coordination splitting per TT-SPEC-ENT-A (common noun conjuncts split, proper noun compounds preserved), classifies entity types via HEAD_NOUN_TYPE_MAP + ontology hints
- **TreeActExtractor**: identifies verbs from dependency roots and embedded clauses, detects modality (10 single-word modals + 3 multi-word: "have to", "need to", "ought to"), detects passive voice (aux:pass), builds act objects with lemma, tag, tenseAspect, and deontic properties
- **TreeRoleMapper**: two-pass role assignment per TT-SPEC-RDM-C.
  - **Pass 1 (`_assignCoreArgRoles`)**: nsubj → AgentRole, obj → PatientRole, iobj → RecipientRole. Must complete before Pass 2.
  - **Pass 2 (`_assignObliquePPRoles`)**: oblique PPs with argument saturation check + ROLE_BEARING_PP_VERBS whitelist. Adjunct PPs suppressed when core arg slots are already filled.
  - **Ordering constraint (load-bearing):** Pass 1 must complete fully before Pass 2 runs. Pass 2's adjunct suppression depends on knowing which core arg slots are already occupied. Refactoring the two passes into a single loop will introduce silent role assignment bugs.
  - Stative predicate filtering (bypassed for modal + passive). VP coordination role propagation per TT-SPEC-RDM-B.

### 5.5 Semantic Graph Builder
- Forest loop: one iteration per sentence
- Ontology tagging: clause-level authority match (DirectiveInformationContentEntity detection), entity type hints from ontology classes
- Tier 1 construction: DiscourseReferent + VerbPhrase nodes with positional metadata
- Tier 2 construction: RealWorldEntityFactory promotes entities to ontological types
- Role binding: TreeRoleMapper output → Role nodes with `inheres_in` (Tier 2 entity) and `realized_in` (Act)
- Deontic path: DirectiveExtractor → PlanSpec → Obligation chain (only for modal sentences)
- Performative Act detection: ontology-driven — checks `isSubclassOf(matchedClass, 'tagteam:PerformativeAct')`
- Mereological enrichment: `continuant_part_of` edges from `bfo:BFO_0000050` declarations in loaded ontology
- Cleanup: debug property removal, provenance IBE construction

---

## Part 6: Testing and Debugging (2 pages)

### 6.1 Test Suites
| Suite | Command | What It Tests |
|-------|---------|---------------|
| CI (21 suites) | `npm run test:ci` | Full regression across all phases |
| SBA | `node tests/sba/sba-wave1.test.js` | Sentence boundary detection (143/144) |
| CCO | `node tests/corpus/cco-complex-regression.test.js` | Complex CCO sentences (106/106) |
| ISA | `node tests/corpus/isa-multi-sentence.test.js` | Multi-sentence parsing (70/70) |
| Gold | `npm run gold:evaluate` | Entity F1 93.1%, Role F1 83.0% |
| SHACL | `node tests/shacl/sba-shapes.test.js` | Graph shape validation (21/21) |

### 6.2 Debugging a Bad Parse

**API:** `const graph = TagTeam.buildGraph(text, { verbose: true });` — POS tags appear in `graph._debug.tokens`, not on console.

**Systematic diagnostic:**
1. Check `graph._metadata.sentences` — did segmentation split correctly?
2. Check `graph._metadata.entities` — were entities extracted with correct spans?
3. Check `graph._metadata.acts` — were verbs identified? Is `modality` correct?
4. Check `graph._metadata.roles` — were roles assigned to the right entities?
5. Open `dist/standalone-demo.html` in a browser, paste the sentence, inspect the visual graph

**Common failure modes:**
- Wrong POS tag → wrong entity type (e.g., "station" tagged NNP → Person instead of Entity)
- Missed coordination split → entity span too wide ("officers and suspects" as one entity)
- Stative suppression → zero roles on a passive verb that should have roles (check if the verb is in `RMC_STATIVE_PREDICATES`)
- Adjunct suppression → missing oblique role (check if PP preposition is in `ADJUNCT_PREPOSITIONS` and core args are saturated)
- Wrong dep arc → wrong role (e.g., obj labeled as obl → PatientRole missing)

### 6.3 Adding Gold Test Sentences
- Edit `tests/gold/sentences.js`
- Format: `{ text: "...", expectedEntities: [{ text: "officer", type: "Person" }], expectedRoles: [{ role: "AgentRole", entity: "officer" }] }`
- Run `npm run gold:evaluate` to measure impact on F1 metrics
- A new sentence that causes F1 to drop reveals a pipeline gap worth investigating

---

## Part 7: Build System (1 page)

- `scripts/build.js` — concatenates source files into single UMD bundle
- Models (POS weights, dep weights, gazetteers) embedded at build time as JSON literals
- SentenceSegmenter abbreviation lexicon inlined, `fs`/`path` requires stripped
- Bundle integrity gate: no `require('fs')` or `readFileSync` in output — build script scans for violations
- Build number tracked in `scripts/build-number.json` (auto-incremented)
- `demos/tagteam.js` must be synced from `dist/tagteam.js` before merge to main
- RoleMappingContract and DepTreeCorrector have bundle shims in the build script — new exports from these modules require updating the shim

---

## Part 8: Normative Specifications (reference appendix)

Index of specs the codebase implements, with file paths and scope:

| Spec ID | Title | Scope | File |
|---------|-------|-------|------|
| TT-SPEC-SBA | Sentence Boundary Architecture v1.3 | Segmentation rules B-1 through B-4, parenthetical extraction, SentenceRecord schema, JSON-to-RDF projection | `docs/tagteam-sentence-boundary-spec-v1.3.md` |
| TT-SPEC-RDM-A | Realist Deontic Modeling Addendum A v1.2 | Ditransitive recipient detection, passive PP guard, animacy check, `_resolveToPPRole()` | `docs/tagteam-rdm-addendum-a-v1.1.md` |
| TT-SPEC-RDM-B | RDM Addendum B v1.1 | VP coordination role propagation, composite entityByHead keys, shared-argument inheritance | `docs/tagteam-rdm-addendum-b-v1.1.md` |
| TT-SPEC-RDM-C | RDM Addendum C v1.1 | Two-pass role assignment, PP adjunct suppression, argument saturation, ROLE_BEARING_PP_VERBS whitelist | `docs/tagteam-rdm-addendum-c-v1.1.md` |
| TT-SPEC-ENT-A | Entity Extraction Addendum A v1.1 | Subject/object coordination entity splitting, common noun conjunct detection | `docs/tagteam-ent-addendum-a-v1.1.md` |
| TT-SPEC-ENT-B | Entity Extraction Addendum B v1.1 | CDD ontology awareness, entity splitting + ontology hint ordering, `continuant_part_of` propagation | `docs/tagteam-ent-addendum-b-v1.1.md` |
| TT-SPEC-SGB-A | Graph Assembly Addendum A v1.1 | Document authority wiring, performative Act detection via `isSubclassOf(PerformativeAct)`, Graph Assembly Template pattern (`requiresPatient`/`requiresRecipient`) | `docs/tagteam-sgb-addendum-a-v1.1.md` |

---

## Estimated Length: ~16 pages

## Priority Order for Writing
1. **Part 1 + Part 2** — orientation and running (gets them from zero to output)
2. **Part 3** — reading the output (the thing they'll do most; two-tier contract is prerequisite for everything)
3. **Part 4** — domain ontologies (the extension point for integrators; most developers need this before pipeline internals)
4. **Part 5** — NLP pipeline internals (for contributors and debuggers)
5. **Part 6** — testing and debugging (for ongoing development)
6. **Part 7 + Part 8** — build system and specs (reference — consult as needed)
