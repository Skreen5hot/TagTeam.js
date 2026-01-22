# TagTeam.js Phase 4 Comprehensive Test Suite v1.2

**Version**: 1.2 (FINAL)
**Date**: 2026-01-22
**Status**: Approved for Implementation
**Changes from v1.1**: Incorporated temporal/causal logic, propositional attitudes, quantity normalization, recovery benchmarks, and semantic reversibility tests per architectural review.

---

### Design Philosophy

| Principle | Implication |
|-----------|-------------|
| **Domain independence** | No single domain should comprise >15% of test cases |
| **Linguistic coverage over domain depth** | Prioritize syntactic/semantic variety over domain expertise |
| **Failure modes are features** | Explicitly test what TagTeam *cannot* do and verify graceful degradation |
| **Output contracts, not string matching** | Validate structural properties, not specific IRIs |
| **Semantic reversibility** | If relation R holds, inverse(R) must be inferrable |

---

### Validation Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SEMANTIC VALIDATION FUNNEL                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STAGE 1: SYNTACTIC WELL-FORMEDNESS                                 │   │
│  │  ════════════════════════════════════════════════════════════════   │   │
│  │  • Input sanitization & encoding validation                         │   │
│  │  • Sentence boundary detection                                      │   │
│  │  • Constituency & dependency parse success                          │   │
│  │  • Recovery from malformed input                                    │   │
│  │                                                                     │   │
│  │  Gate: Parse tree exists (possibly partial)                         │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STAGE 2: TIER 1 SEMANTIC EXTRACTION                                │   │
│  │  ════════════════════════════════════════════════════════════════   │   │
│  │  • Discourse referent identification                                │   │
│  │  • VerbPhrase & predicate analysis                                  │   │
│  │  • Modality & actuality status assignment                           │   │
│  │  • Propositional attitude nesting (belief, knowledge, assertion)    │   │
│  │  • Temporal relation extraction                                     │   │
│  │                                                                     │   │
│  │  Gate: All Tier 1 nodes pass SHACL DiscourseReferentShape           │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STAGE 3: TIER 2 ONTOLOGICAL MAPPING                                │   │
│  │  ════════════════════════════════════════════════════════════════   │   │
│  │  • BFO category assignment                                          │   │
│  │  • CCO class mapping                                                │   │
│  │  • Role/disposition/function attribution                            │   │
│  │  • Temporal ordering & causal structure                             │   │
│  │  • Quantity & unit normalization                                    │   │
│  │                                                                     │   │
│  │  Gate: All Tier 2 nodes satisfy domain/range constraints            │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STAGE 4: GRAPH INTEGRITY & REVERSIBILITY                           │   │
│  │  ════════════════════════════════════════════════════════════════   │   │
│  │  • Referential integrity (all @id references resolve)               │   │
│  │  • Cross-sentence coreference chains valid                          │   │
│  │  • Semantic reversibility (R → inverse(R) inferrable)               │   │
│  │  • GIT-Minimal compliance (assertion, context, temporal)            │   │
│  │                                                                     │   │
│  │  Gate: Full SHACL validation passes                                 │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STAGE 5: OUTPUT SERIALIZATION                                      │   │
│  │  ════════════════════════════════════════════════════════════════   │   │
│  │  • JSON-LD @context complete                                        │   │
│  │  • Downstream compatibility (RDF, SPARQL, Neo4j)                    │   │
│  │  • Provenance & processing metadata attached                        │   │
│  │                                                                     │   │
│  │  Output: Validated JSON-LD @graph                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 1. Tier 1 Linguistic Coverage Tests

#### 1.1 Clause Types & Syntactic Structures

```
tests/linguistic/
├── clause-types/
│   ├── declarative.test.js         # "The engineer reviewed the design."
│   ├── interrogative.test.js       # "Did the committee approve the budget?"
│   ├── imperative.test.js          # "Submit the report by Friday."
│   ├── exclamatory.test.js         # "What a disaster the launch was!"
│   └── conditional.test.js         # "If demand increases, expand capacity."
│
├── sentence-complexity/
│   ├── simple.test.js              # Single clause
│   ├── compound.test.js            # "X happened and Y followed."
│   ├── complex.test.js             # "When X happened, Y followed."
│   ├── compound-complex.test.js    # Multiple dependent + independent
│   └── embedded-clauses.test.js    # "The fact that X worried Y..."
│
├── voice-and-valency/
│   ├── active.test.js              # "The auditor found discrepancies."
│   ├── passive.test.js             # "Discrepancies were found."
│   ├── passive-agentless.test.js   # "The contract was terminated."
│   ├── middle-voice.test.js        # "The door opened." (inchoative)
│   ├── ditransitive.test.js        # "She gave him the report."
│   └── causative.test.js           # "The manager had the team revise it."
│
├── argument-structure/
│   ├── subject-extraction.test.js
│   ├── direct-object.test.js
│   ├── indirect-object.test.js
│   ├── oblique-arguments.test.js   # "with the tool", "for the client"
│   ├── expletive-subjects.test.js  # "It is necessary that...", "There are..."
│   └── raising-control.test.js     # "seems to", "wants to"
```

#### 1.2 Discourse Referent Extraction

```
tests/linguistic/referents/
├── definiteness/
│   ├── definite-np.test.js         # "the manager"
│   ├── indefinite-np.test.js       # "a consultant"
│   ├── bare-plurals.test.js        # "Engineers require training."
│   ├── generic-reference.test.js   # "The smartphone changed communication."
│   └── mass-nouns.test.js          # "Water is essential."
│
├── reference-types/
│   ├── proper-names.test.js        # "Acme Corp", "Dr. Chen"
│   ├── pronouns.test.js            # "she", "they", "it"
│   ├── demonstratives.test.js      # "this approach", "those results"
│   ├── quantified-np.test.js       # "every employee", "some departments"
│   └── partitive.test.js           # "three of the samples"
│
├── coreference/
│   ├── pronominal-anaphora.test.js # "The CEO... She announced..."
│   ├── definite-anaphora.test.js   # "A bug was found. The bug..."
│   ├── bridging.test.js            # "the car... the engine" (part-whole)
│   ├── cataphora.test.js           # "Before she left, Maria..."
│   ├── split-antecedent.test.js    # "John met Mary. They discussed..." [NEW]
│   └── cross-sentence-chains.test.js # Multi-hop resolution [NEW]
│
├── referential-status/
│   ├── presupposed.test.js         # Existence assumed
│   ├── introduced.test.js          # New to discourse
│   ├── hypothetical.test.js        # "If there were a solution..."
│   └── attributive-vs-referential.test.js  # "the tallest building"
```

#### 1.3 VerbPhrase & Predicate Analysis

```
tests/linguistic/verbphrase/
├── tense-aspect/
│   ├── simple-present.test.js
│   ├── simple-past.test.js
│   ├── present-perfect.test.js     # "has completed"
│   ├── past-perfect.test.js        # "had already submitted"
│   ├── progressive.test.js         # "is reviewing"
│   ├── future-will.test.js
│   ├── future-going-to.test.js
│   └── habitual.test.js            # "reviews weekly"
│
├── modality/
│   ├── epistemic-certainty.test.js # "must have known", "might be"
│   ├── deontic-obligation.test.js  # "must submit", "should review"
│   ├── deontic-permission.test.js  # "may proceed", "can access"
│   ├── ability.test.js             # "can process 1000 requests"
│   └── volition.test.js            # "will not comply"
│
├── polarity-and-negation/
│   ├── sentential-negation.test.js # "did not approve"
│   ├── constituent-negation.test.js # "approved no changes"
│   ├── neg-raising.test.js         # "I don't think he'll come"
│   ├── double-negation.test.js     # "can't not attend"
│   └── negative-polarity-items.test.js # "any", "ever", "yet"
│
├── event-structure/
│   ├── accomplishment.test.js      # "built the house" (telic, durative)
│   ├── achievement.test.js         # "reached the summit" (telic, punctual)
│   ├── activity.test.js            # "ran in the park" (atelic, durative)
│   ├── state.test.js               # "knows the answer" (atelic, non-dynamic)
│   └── semelfactive.test.js        # "knocked once"
│
├── propositional-attitudes/                              # [NEW SECTION]
│   ├── belief-attribution.test.js  # "John believes the report is accurate."
│   ├── knowledge-attribution.test.js # "Mary knows the deadline passed."
│   ├── nested-attitudes.test.js    # "The auditor believes the CEO knew 
│   │                               #  the report was false."
│   ├── assertion-vs-belief.test.js # Distinguish direct assertion from 
│   │                               #  attributed belief
│   ├── desire-intention.test.js    # "wants to", "intends to", "hopes that"
│   ├── perception-reports.test.js  # "saw him leave", "heard that..."
│   └── attitude-scope.test.js      # Ensure nested content not asserted
│                                   #  as fact
```

#### 1.4 Temporal & Causal Structure [NEW SECTION]

```
tests/linguistic/temporal-causal/
├── temporal-ordering/
│   ├── explicit-sequence.test.js   # "First X, then Y, finally Z."
│   ├── before-after.test.js        # "The report was filed after the 
│   │                               #  meeting but before the deadline."
│   ├── while-during.test.js        # "While negotiating, they discovered..."
│   ├── since-until.test.js         # "Since the merger, profits have..."
│   ├── non-linear-narrative.test.js # Flashback: "He remembered that 
│   │                               #  she had warned him."
│   └── temporal-adverbs.test.js    # "yesterday", "immediately", "eventually"
│
├── temporal-relations/
│   ├── allen-interval-algebra.test.js  # before, meets, overlaps, during,
│   │                                   # starts, finishes, equals
│   ├── reference-time.test.js      # Past-of-past vs past-of-now
│   ├── temporal-anaphora.test.js   # "At that time...", "The next day..."
│   └── duration-expressions.test.js # "for three hours", "in two weeks"
│
├── causal-structure/
│   ├── explicit-causation.test.js  # "X caused Y", "Y resulted from X"
│   ├── causal-connectives.test.js  # "because", "therefore", "so", "thus"
│   ├── purpose-clauses.test.js     # "in order to", "so that"
│   ├── enablement.test.js          # "allowed", "enabled", "prevented"
│   └── counterfactual-cause.test.js # "If X hadn't happened, Y wouldn't..."
│
├── event-sequencing-validation/
│   ├── graph-temporal-order.test.js # Verify @graph encodes correct order
│   │                               # independent of sentence position
│   ├── timeline-reconstruction.test.js # Can reconstruct timeline from graph
│   └── causal-chain-integrity.test.js  # Cause precedes effect in model
```

#### 1.5 Coordination, Ellipsis & Complex Phenomena

```
tests/linguistic/complex/
├── coordination/
│   ├── np-coordination.test.js     # "the CEO and CFO"
│   ├── vp-coordination.test.js     # "reviewed and approved"
│   ├── clausal-coordination.test.js
│   ├── right-node-raising.test.js  # "John likes, and Mary hates, broccoli"
│   └── unlike-coordination.test.js # "tired but still working"
│
├── ellipsis/
│   ├── vp-ellipsis.test.js         # "John submitted it, and Mary did too."
│   ├── gapping.test.js             # "John ate rice and Mary beans."
│   ├── sluicing.test.js            # "Someone called, but I don't know who."
│   ├── stripping.test.js           # "John passed, but not Mary."
│   └── np-ellipsis.test.js         # "I'll take the red one."
│
├── ambiguity/
│   ├── pp-attachment.test.js       # "saw the man with the telescope"
│   ├── scope-ambiguity.test.js     # "Every student read a book."
│   ├── lexical-ambiguity.test.js   # "bank" (financial vs. river)
│   ├── structural-ambiguity.test.js # "Flying planes can be dangerous"
│   └── anaphoric-ambiguity.test.js # Multiple antecedent candidates
│
├── long-distance-dependencies/
│   ├── wh-movement.test.js         # "What did she say that he wanted?"
│   ├── topicalization.test.js      # "This report, I haven't read."
│   ├── relative-clauses.test.js    # "the person who submitted the form"
│   └── cleft-constructions.test.js # "It was John who called."
```

---

### 2. Tier 2 Ontological Mapping Tests

#### 2.1 BFO Category Assignment

```
tests/ontology/bfo-mapping/
├── continuants/
│   ├── independent-continuant/
│   │   ├── material-entity.test.js     # Physical objects
│   │   ├── object.test.js              # Persons, artifacts, organisms
│   │   ├── object-aggregate.test.js    # "the committee", "the fleet"
│   │   └── fiat-object-part.test.js    # "the northern region"
│   │
│   ├── generically-dependent/
│   │   ├── information-content-entity.test.js  # Documents, data
│   │   ├── directive-ice.test.js       # Policies, contracts
│   │   └── descriptive-ice.test.js     # Reports, records
│   │
│   └── specifically-dependent/
│       ├── quality.test.js             # "red", "heavy", "urgent"
│       ├── realizable-entity/
│       │   ├── role.test.js            # "manager", "patient", "owner"
│       │   ├── disposition.test.js     # "fragile", "soluble"
│       │   └── function.test.js        # "the heart's function"
│       └── relational-quality.test.js  # "taller than"
│
├── occurrents/
│   ├── process.test.js                 # "the manufacturing process"
│   ├── process-boundary.test.js        # "the moment of signing"
│   ├── temporal-region.test.js         # "during Q3", "in 2024"
│   └── spatiotemporal-region.test.js   # "the Berlin conference"
```

#### 2.2 CCO Extension Mapping

```
tests/ontology/cco-mapping/
├── agents/
│   ├── person.test.js
│   ├── organization.test.js
│   ├── organization-part.test.js       # "the legal department"
│   └── agent-identification.test.js    # Names, titles, roles
│
├── artifacts/
│   ├── artifact-generic.test.js
│   ├── information-bearing-artifact.test.js  # Documents, software
│   ├── facility.test.js                # Buildings, factories
│   └── artifact-function.test.js       # Purpose/function attribution
│
├── acts-and-events/
│   ├── intentional-act.test.js         # Acts with agents
│   ├── social-act.test.js              # Contracts, agreements
│   ├── communicative-act.test.js       # Announcements, requests
│   ├── measurement-act.test.js         # "measured the temperature"
│   └── stasis.test.js                  # Non-change occurrents
│
├── information-entities/
│   ├── designative-ice.test.js         # Names, identifiers
│   ├── measurement-ice.test.js         # Quantities, metrics
│   └── plan-specification.test.js      # Procedures, workflows
│
├── quantities-and-units/                               # [NEW SECTION]
│   ├── scalar-measurement.test.js      # "The temperature is 25°C"
│   ├── delta-vs-absolute.test.js       # "rose 5°C" vs "rose to 5°C"
│   │                                   # (Process vs State distinction)
│   ├── unit-normalization.test.js      # "5 km" = "5000 m"
│   ├── comparative-quantities.test.js  # "twice as large", "50% more"
│   ├── range-expressions.test.js       # "between 10 and 20", "up to 100"
│   ├── approximate-quantities.test.js  # "about 5", "nearly 100"
│   └── ordinal-vs-cardinal.test.js     # "first" vs "one"
```

#### 2.3 Actuality Status & Modality Mapping

```
tests/ontology/actuality/
├── actual.test.js                      # "The board approved the merger."
├── prescribed.test.js                  # "Employees must wear badges."
├── permitted.test.js                   # "Visitors may access the lobby."
├── prohibited.test.js                  # "Smoking is not allowed."
├── hypothetical.test.js                # "If we expanded, we would need..."
├── intended.test.js                    # "plans to launch", "intends to"
├── counterfactual.test.js              # "would have succeeded if..."
├── negated-actual.test.js              # "The shipment did not arrive."
├── believed.test.js                    # [NEW] "The CEO believes..."
└── asserted-by-other.test.js           # [NEW] "According to the report..."
```

#### 2.4 Semantic Reversibility Tests [NEW SECTION]

```
tests/ontology/reversibility/
├── temporal-inverses/
│   ├── before-after.test.js            # A before B → B after A
│   ├── precedes-follows.test.js        # A precedes B → B follows A
│   ├── causes-caused-by.test.js        # A causes B → B caused-by A
│   └── during-contains.test.js         # A during B → B contains A
│
├── participant-inverses/
│   ├── agent-patient.test.js           # X has-agent A → A agent-of X
│   ├── part-whole.test.js              # A part-of B → B has-part A
│   ├── member-collection.test.js       # A member-of B → B has-member A
│   └── bearer-inheres.test.js          # R inheres-in X → X bearer-of R
│
├── transitive-chains/
│   ├── part-of-transitivity.test.js    # A part-of B, B part-of C → A part-of C
│   ├── before-transitivity.test.js     # A before B, B before C → A before C
│   └── subclass-transitivity.test.js   # Instance reasoning
│
├── inference-completeness/
│   ├── bidirectional-query.test.js     # Query from either direction
│   └── path-reconstruction.test.js     # Can traverse in both directions
```

---

### 3. Domain-Agnostic Scenario Tests

```
tests/domains/
├── business-operations/
│   ├── contract-clauses.test.js        # "Party A shall deliver..."
│   ├── meeting-minutes.test.js         # "The committee resolved to..."
│   ├── policy-documents.test.js        # "Employees are entitled to..."
│   ├── incident-reports.test.js        # "At 14:32, the system..."
│   └── requirements-specs.test.js      # "The system shall support..."
│
├── legal-regulatory/
│   ├── statutory-language.test.js      # "No person shall..."
│   ├── court-opinions.test.js          # "The court held that..."
│   ├── regulatory-filings.test.js      # "The registrant certifies..."
│   └── compliance-statements.test.js
│
├── scientific-technical/
│   ├── methods-sections.test.js        # "Samples were collected..."
│   ├── results-reporting.test.js       # "Analysis revealed..."
│   ├── technical-specs.test.js         # "The component operates at..."
│   └── safety-data-sheets.test.js      # "In case of contact..."
│
├── healthcare/
│   ├── clinical-notes.test.js          # "Patient presents with..."
│   ├── procedure-orders.test.js        # "Administer 10mg..."
│   ├── informed-consent.test.js        # "The patient agrees to..."
│   └── discharge-summaries.test.js
│
├── logistics-supply-chain/
│   ├── shipping-manifests.test.js      # "Cargo consists of..."
│   ├── inventory-updates.test.js       # "Stock depleted; reorder..."
│   ├── delivery-instructions.test.js   # "Deliver to loading dock B..."
│   └── customs-declarations.test.js
│
├── human-resources/
│   ├── job-descriptions.test.js        # "The candidate will..."
│   ├── performance-reviews.test.js     # "Employee exceeded..."
│   ├── termination-notices.test.js     # "Employment is terminated..."
│   └── offer-letters.test.js
│
├── journalism-media/
│   ├── news-leads.test.js              # "Officials announced..."
│   ├── attribution-chains.test.js      # "X said that Y claimed..."
│   ├── event-reporting.test.js
│   └── editorial-opinion.test.js       # Distinguish fact from opinion
│
├── everyday-informal/
│   ├── email-requests.test.js          # "Could you please..."
│   ├── chat-messages.test.js           # Fragments, abbreviations
│   ├── social-media.test.js            # Hashtags, mentions
│   └── product-reviews.test.js         # "This product is terrible because..."
│
├── financial/                                          # [NEW]
│   ├── earnings-reports.test.js        # "Revenue increased 15% YoY..."
│   ├── analyst-projections.test.js     # "We expect Q2 to..."
│   ├── risk-disclosures.test.js        # "The company may be subject to..."
│   └── transaction-records.test.js
│
└── edge-domains/
    ├── poetry-literary.test.js         # Metaphor, non-literal
    ├── humor-sarcasm.test.js           # "Great, another meeting."
    ├── historical-archaic.test.js      # "Whereas the party of the first..."
    └── multilingual-codeswitching.test.js  # Embedded phrases
```

---

### 4. Output Contract & Structural Validation Tests

#### 4.1 JSON-LD Structure Validation

```
tests/output/jsonld/
├── context-validation/
│   ├── required-prefixes.test.js       # bfo:, cco:, tagteam:
│   ├── iri-validity.test.js            # All @id values are valid IRIs
│   ├── type-consistency.test.js        # @type arrays well-formed
│   └── no-blank-nodes.test.js          # Or explicit policy on them
│
├── graph-structure/
│   ├── tier1-tier2-separation.test.js  # No prohibited cross-tier relations
│   ├── referential-integrity.test.js   # All referenced @ids exist
│   ├── no-orphan-nodes.test.js         # Every node reachable
│   ├── assertion-event-coverage.test.js # Every Tier 1 node has assertion
│   └── cross-sentence-integrity.test.js # [NEW] Multi-sentence @id resolution
│
├── relation-validity/
│   ├── domain-range-compliance.test.js # BFO domain/range constraints
│   ├── inverse-relations.test.js       # Only assert what spec requires
│   └── cardinality-constraints.test.js
```

#### 4.2 SHACL Compliance

```
tests/output/shacl/
├── discourse-referent-shape.test.js
├── verb-phrase-shape.test.js
├── assertion-event-shape.test.js
├── tier2-entity-shape.test.js
├── role-shape.test.js
├── act-shape.test.js
├── temporal-relation-shape.test.js     # [NEW]
├── propositional-attitude-shape.test.js # [NEW]
├── quantity-measurement-shape.test.js  # [NEW]
└── full-graph-validation.test.js       # Run all shapes
```

#### 4.3 GIT-Minimal Compliance

```
tests/output/git-minimal/
├── assertion-type-present.test.js      # Every assertion has type
├── valid-in-context-present.test.js    # Context scoping
├── temporal-extent-present.test.js     # Temporal grounding
├── source-attribution.test.js          # Span offsets, source doc
├── processing-provenance.test.js       # Parser version, timestamp
└── attitude-scope-marking.test.js      # [NEW] Nested beliefs marked
```

---

### 5. Error Handling & Graceful Degradation Tests

```
tests/robustness/
├── malformed-input/
│   ├── empty-string.test.js
│   ├── whitespace-only.test.js
│   ├── extremely-long-input.test.js    # 100K+ characters
│   ├── binary-garbage.test.js
│   ├── encoding-issues.test.js         # UTF-8 edge cases
│   └── html-embedded.test.js           # Strip or handle markup
│
├── linguistic-edge-cases/
│   ├── sentence-fragments.test.js      # "Approved." "Next steps?"
│   ├── run-on-sentences.test.js        # Missing punctuation
│   ├── all-caps.test.js
│   ├── no-verbs.test.js                # "The report on compliance."
│   ├── garden-path.test.js             # "The horse raced past the barn fell."
│   └── typos-misspellings.test.js      # Robustness to noise
│
├── graceful-degradation/
│   ├── unknown-entity-type.test.js     # Falls back to generic
│   ├── unparseable-clause.test.js      # Logs warning, continues
│   ├── ambiguity-threshold.test.js     # Returns readings up to limit
│   └── confidence-below-threshold.test.js
│
├── complexity-budget/
│   ├── max-referents.test.js           # Enforces limit
│   ├── max-depth.test.js               # Embedding depth
│   └── timeout-behavior.test.js        # Partial output on timeout
│
├── recovery-benchmarks/                                # [NEW SECTION]
│   ├── garden-path-recovery.test.js    # Measure reparse cost
│   ├── backtrack-budget.test.js        # Max operations before fallback
│   ├── partial-parse-quality.test.js   # Quality of incomplete output
│   └── recovery-latency.test.js        # Time to recover from misparse
```

#### 5.1 Recovery Budget Specification [NEW]

```javascript
// tests/robustness/recovery-benchmarks/backtrack-budget.test.js

/**
 * Recovery Budget Contract
 * 
 * When initial parse heuristics fail (e.g., garden path sentences),
 * TagTeam must bound reprocessing effort to maintain predictable latency.
 */

const RECOVERY_BUDGET = {
  maxBacktrackOperations: 50,      // Max reparse attempts per sentence
  maxTimeMs: 500,                   // Absolute timeout for recovery
  partialOutputThreshold: 0.6,     // Minimum coverage to emit partial
  fallbackStrategy: 'BEST_EFFORT'  // 'BEST_EFFORT' | 'ABORT' | 'GENERIC'
};

describe('Recovery Budget Enforcement', () => {
  test('garden path respects operation budget', async () => {
    const input = "The horse raced past the barn fell.";
    const result = await parse(input, { recoveryBudget: RECOVERY_BUDGET });
    
    expect(result.metadata.backtrackOperations).toBeLessThanOrEqual(50);
    expect(result.metadata.recoveryTimeMs).toBeLessThan(500);
  });
  
  test('emits partial output when budget exhausted', async () => {
    const input = extremelyAmbiguousSentence;
    const result = await parse(input, { recoveryBudget: RECOVERY_BUDGET });
    
    if (result.metadata.budgetExhausted) {
      expect(result.coverage).toBeGreaterThanOrEqual(0.6);
      expect(result.warnings).toContain('PARTIAL_PARSE');
    }
  });
});
```

---

### 6. Performance & Scale Tests

```
tests/performance/
├── throughput/
│   ├── single-sentence.bench.js        # Baseline latency
│   ├── paragraph.bench.js              # 5-10 sentences
│   ├── page.bench.js                   # ~500 words
│   ├── document.bench.js               # ~5000 words
│   └── batch-processing.bench.js       # 100 documents
│
├── scaling/
│   ├── linear-scaling.test.js          # O(n) not O(n²)
│   ├── memory-usage.test.js            # No leaks on batch
│   └── concurrent-requests.test.js     # Thread safety
│
├── regression-benchmarks/
│   └── golden-set.bench.js             # Track perf over versions
│
├── recovery-overhead/                                  # [NEW]
│   ├── clean-vs-garden-path.bench.js   # Cost of recovery
│   ├── ambiguity-scaling.bench.js      # Cost per ambiguity level
│   └── worst-case-latency.bench.js     # P99 with adversarial input
```

---

### 7. Integration & API Contract Tests

```
tests/integration/
├── api-contracts/
│   ├── parse-endpoint.test.js
│   ├── async-job-endpoint.test.js
│   ├── validation-endpoint.test.js
│   └── configuration-endpoint.test.js
│
├── configuration/
│   ├── tier2-disabled.test.js          # Tier 1 only mode
│   ├── custom-namespace.test.js
│   ├── confidence-threshold.test.js
│   ├── max-ambiguity.test.js
│   ├── domain-hints.test.js            # Optional domain context
│   └── recovery-budget-config.test.js  # [NEW]
│
├── downstream-compatibility/
│   ├── rdf-serialization.test.js       # Converts to N-Triples, Turtle
│   ├── sparql-queryable.test.js        # Load into triplestore
│   ├── neo4j-ingestible.test.js        # JSON-LD → Neo4j
│   ├── shacl-validator-compatible.test.js
│   └── timeline-reconstruction.test.js # [NEW] Can rebuild event sequence
```

---

### 8. Regression & Golden Set Tests

```
tests/regression/
├── golden-outputs/
│   ├── canonical-examples.test.js      # Hand-verified outputs
│   ├── version-stability.test.js       # Output doesn't change unexpectedly
│   └── cross-sentence-golden.test.js   # [NEW] Multi-sentence documents
│
├── bug-reproductions/
│   └── issue-NNN.test.js               # One test per fixed bug
│
└── comparative/
    └── v3-to-v4-parity.test.js         # Where applicable
```

---

### Test Coverage Targets v1.2

| Metric | Target | Rationale |
|--------|--------|-----------|
| Clause types | 100% | Finite set, must handle all |
| BFO categories | 100% | Core ontological competence |
| Domains | ≥12 distinct | Proves generality |
| Syntactic structures | ≥85% | Long tail is acceptable |
| Error paths | 100% | Robustness is non-negotiable |
| SHACL shapes | 100% | Output contract |
| **Anaphora resolution accuracy** | **≥90%** | [NEW] Critical for document-level parsing |
| **Cross-sentence referential integrity** | **100%** | [NEW] Every @id must resolve |
| **Semantic reversibility** | **≥95%** | [NEW] R implies inverse(R) queryable |
| **Temporal ordering accuracy** | **≥90%** | [NEW] Event sequence correctness |
| **Propositional attitude scope** | **100%** | [NEW] Never assert nested belief as fact |

---

### Test Data Sources v1.2

| Source | Why | Domain Coverage |
|--------|-----|-----------------|
| Penn Treebank samples | Syntactic diversity | News |
| CoNLL datasets | NER, SRL gold standard | Mixed |
| SNLI/MultiNLI | Inference patterns | Varied |
| Contracts (CUAD) | Legal/deontic | Legal |
| PubMed abstracts | Scientific | Healthcare/Bio |
| SEC filings | Regulatory | Finance |
| Wikipedia leads | Encyclopedic | General |
| Reddit/Twitter samples | Informal | Social |
| **TimeBank** | **Temporal annotation** | **News** | [NEW]
| **FactBank** | **Belief/factuality** | **News** | [NEW]
| **PropBank/NomBank** | **Argument structure** | **Mixed** | [NEW]
| Synthetic adversarial | Edge cases | Constructed |

---

### Appendix A: Propositional Attitude Test Specification [NEW]

The critique correctly identifies that "who knows what" is often more important than "what happened." This requires careful handling:

```javascript
// tests/linguistic/verbphrase/propositional-attitudes/nested-attitudes.test.js

describe('Nested Propositional Attitudes', () => {
  
  test('does not assert embedded proposition as fact', async () => {
    const input = "The auditor believes the CEO knew the report was false.";
    const result = await parse(input);
    
    // Extract all propositions marked as ACTUAL
    const actualPropositions = result.graph
      .filter(n => n.actualityStatus === 'tagteam:Actual');
    
    // "The report was false" should NOT be in actual propositions
    const falseReport = actualPropositions
      .find(n => n.aboutContent?.includes('false'));
    
    expect(falseReport).toBeUndefined();
  });
  
  test('correctly nests attitude holders', async () => {
    const input = "The auditor believes the CEO knew the report was false.";
    const result = await parse(input);
    
    // Structure should be:
    // Auditor BELIEVES [ CEO KNEW [ report was false ] ]
    
    const auditorBelief = findAttitude(result, 'believes', 'auditor');
    const ceoKnowledge = findAttitude(result, 'knew', 'CEO');
    const reportFalse = findProposition(result, 'report', 'false');
    
    expect(auditorBelief.hasContent).toContain(ceoKnowledge['@id']);
    expect(ceoKnowledge.hasContent).toContain(reportFalse['@id']);
    expect(reportFalse.actualityStatus).toBe('tagteam:AttributedBelief');
  });
});
```

---

### Appendix B: Temporal Ordering Test Specification [NEW]

```javascript
// tests/linguistic/temporal-causal/temporal-ordering/before-after.test.js

describe('Non-Linear Temporal Ordering', () => {
  
  test('graph reflects semantic order, not surface order', async () => {
    const input = "The report was filed after the meeting but before the deadline.";
    const result = await parse(input);
    
    const meeting = findEvent(result, 'meeting');
    const filing = findEvent(result, 'filed');
    const deadline = findEvent(result, 'deadline');
    
    // Verify temporal relations in graph
    expect(hasRelation(result, meeting, 'before', filing)).toBe(true);
    expect(hasRelation(result, filing, 'before', deadline)).toBe(true);
    
    // Verify transitivity is inferrable
    expect(canInfer(result, meeting, 'before', deadline)).toBe(true);
    
    // Verify inverse is queryable
    expect(hasRelation(result, filing, 'after', meeting)).toBe(true);
  });
});
```

---

### Appendix C: Quantity Normalization Test Specification [NEW]

```javascript
// tests/ontology/cco-mapping/quantities-and-units/delta-vs-absolute.test.js

describe('Scalar Measurement: Delta vs Absolute', () => {
  
  test('distinguishes "rose 5°C" (delta) from "rose to 5°C" (absolute)', async () => {
    const deltaInput = "The temperature rose 5°C.";
    const absoluteInput = "The temperature rose to 5°C.";
    
    const deltaResult = await parse(deltaInput);
    const absoluteResult = await parse(absoluteInput);
    
    // Delta: Process with magnitude change
    const deltaEvent = findEvent(deltaResult, 'rose');
    expect(deltaEvent['@type']).toContain('cco:IncreaseProcess');
    expect(deltaEvent.hasMagnitude.value).toBe(5);
    expect(deltaEvent.hasMagnitude.isDelta).toBe(true);
    
    // Absolute: Process with resulting state
    const absoluteEvent = findEvent(absoluteResult, 'rose');
    expect(absoluteEvent['@type']).toContain('cco:IncreaseProcess');
    expect(absoluteEvent.hasResultingState.value).toBe(5);
    expect(absoluteEvent.hasResultingState.isDelta).toBe(false);
  });
});
```

---

### Summary of v1.2 Changes

| Section | Change | Rationale |
|---------|--------|-----------|
| Design Philosophy | Added semantic reversibility principle | Ensures bidirectional queryability |
| Validation Flow | New architectural diagram | Visualizes test stages |
| 1.3 VerbPhrase | Added propositional attitudes subsection | Theory of mind coverage |
| 1.4 | New Temporal & Causal Structure section | Event ordering independent of sentence order |
| 2.2 CCO | Added quantities-and-units subsection | Delta vs absolute measurement |
| 2.4 | New Semantic Reversibility section | Inverse relation inference |
| 4.2 SHACL | Added 3 new shape tests | Coverage for new phenomena |
| 5 | Added recovery-benchmarks subsection | Backtracking budget |
| Coverage Targets | 5 new metrics | Anaphora, integrity, reversibility, temporal, attitude scope |
| Data Sources | Added TimeBank, FactBank, PropBank | Gold standard for new phenomena |
| Appendices | A, B, C with detailed test specs | Implementation guidance |
