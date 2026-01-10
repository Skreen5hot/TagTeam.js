# **From Predicates to Processes (v3.0):

A Process-Grounded Modeling Discipline for BFO-Realist Semantic Web Ontologies**

**Aaron Damiano**
*(Fandaws Ontology Service)*

---

## Abstract

Binary predicates are the workhorse of RDF and OWL, enabling efficient inference and broad interoperability. Yet in many domains—especially those involving causality, temporality, agency, and normative structure—predicate-centric modeling tends to “flatten” the world into static edges, severing formal representations from the processes that make relational claims true. This paper argues that many widely used object predicates (e.g., *part_of*, *resides_in*, *owns*) are not ontological primitives but **derived summaries** whose truth conditions are grounded in **occurrents** (processes) and **realizable entities** (roles, functions, dispositions) as understood in Basic Formal Ontology (BFO). We present **Fandaws**, a modeling discipline and ontology service that restricts *asserted* domain structure to (i) taxonomic classification, (ii) dependent continuants as properties, and (iii) process participation, while treating many object predicates as **materialized inference views** derived from processual grounding. We clarify scope limits (not all relations are process-groundable), formalize “ontological unpacking” as professional tradecraft, provide stopping rules to prevent primitive regress, and introduce grounded parthood types to address common mereological failures in applied ontologies. The result is an approach that preserves computational pragmatism while making causal and temporal justification first-class—supporting auditability, explanation, and natural-language alignment.

---

## 1. Introduction

The Semantic Web has created a domain of computational certainty: triples can be checked, queried, reasoned over, and exchanged at scale. But a persistent problem remains: many ontologies cannot *explain* themselves in terms that track how reality changes, how relations arise, and why a relationship should be believed. This gap becomes acute when ontologies are used not merely as catalogs but as **decision substrates**—in medicine, defense, finance, governance, and AI-enabled systems—where justification, temporal traceability, and disagreement analysis matter.

A common response is to add more predicates, more qualifiers, and more exceptions. The result is often a proliferation of bespoke relations whose intended meaning is encoded socially rather than ontologically: new predicates become “patches” for missing causal structure. This paper proposes a different move: treat many binary predicates not as primitives but as **summaries** of **process participation** and **role realization**.

Fandaws is an ontology service built to enforce and operationalize this move as a disciplined modeling practice.

---

## 2. BFO Realism as a Constraint on Modeling Shortcuts

BFO is a realist upper ontology. Its core distinction between **continuants** and **occurrents** is not merely a taxonomy; it is a constraint on what kinds of entities can bear what kinds of explanatory load.

* **Continuants** persist through time (e.g., a person, a car, a house).
* **Occurrents** unfold through time and have temporal parts (e.g., a surgery, a lease period, a manufacturing run).
* **Specifically dependent continuants** inhere in continuants (e.g., qualities, roles, functions, dispositions).
* **Realizable entities** (roles, functions, dispositions) are manifested only through processes.

A key BFO-realist implication is:

> Many relational facts about continuants are true **in virtue of** occurrents and realizable entities.

This is the central realist pressure on naïve predicate-centric modeling: when a relation is asserted as a timeless primitive edge, the ontology often loses the very structure that makes the relation true.

---

## 3. The Predicate Shortcut Problem

Predicate-centric modeling asserts relations as atomic edges:

* `arm part_of body`
* `person resides_in house`
* `wheel part_of car`

This is often convenient, but it produces systematic failures:

1. **Loss of causality**
   The ontology cannot answer *why* the relation holds without external narrative.

2. **Loss of temporality**
   Relations appear eternal even when contingent, reversible, or time-bounded.

3. **Loss of justificatory structure**
   The ontology cannot provide an internal audit trail for high-stakes reasoning.

4. **Linguistic mismatch**
   Human explanation is verb- and event-centered; flattened edges do not map cleanly to natural-language justifications.

The practical symptom is predictable: modelers compensate by inventing ever-more specific predicates (e.g., `surgically_implanted_part_of`, `currently_resides_in`, `previously_owned_by`) rather than modeling the processes that differentiate those cases.

---

## 4. Scope: Which Relations Must Be Process-Grounded?

A crucial clarification: **Fandaws is not a claim that every relation must be grounded in a process.** Some relations are primarily logical, mathematical, or topological; others are causal, normative, or social. Treating everything as process-first would create needless overhead.

Fandaws therefore adopts a **relation-grounding policy**:

### 4.1 Relation Typology

| Relation category                | Examples                                          | Default Fandaws policy                                                      |
| -------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| **Causal / normative / social**  | owns, employs, resides_in, authorizes             | **Process-ground required**                                                 |
| **Structural / historical**      | component_of (artifacts), organ_part_of (biology) | **Process-ground strongly preferred**                                       |
| **Purely spatial / topological** | adjacent_to, overlaps, inside                     | **Optional** (ground only if temporality/explanation required)              |
| **Fiat / conventional**          | within_city_limits, is_in_district                | **Optional** (ground in adjudication/definition processes only when needed) |
| **Mathematical / logical**       | greater_than, subset_of, congruent_to             | **Not process-grounded**                                                    |

This scope statement prevents overreach and positions Fandaws as a **selective realist discipline**: process grounding is applied where it increases ontological fidelity and explanatory power.

---

## 5. Fandaws as a Modeling Discipline: Assertion vs. Derivation

Fandaws does not replace OWL, RDF, or BFO. It defines a discipline governing **what you assert** and **what you derive**.

### 5.1 Restricted Assertion Primitives

Fandaws encourages three kinds of primitive assertions:

1. **Taxonomy (`is_a` / `subClassOf`)**
   For essential type distinctions among universals.

2. **Dependent continuants as properties (`has_property`)**
   For qualities, roles, functions, and dispositions that inhere in continuants.

3. **Process participation and realization**
   For linking continuants (and their realizable entities) to occurrents.

Everything else is treated as either:

* a **derived view** (materialized for convenience), or
* a **domain-specific construction** justified by explicit rules.

### 5.2 The Key Distinction

> **Predicates used for interoperability and querying are acceptable—so long as their ontological meaning is treated as derived, not primitive.**

This is the heart of the compromise: *you can keep edges for the interface tier*, but you must earn them in the grounding tier.

---

## 6. Formal Comparison: Shortcut vs. Process-Grounded Expansion

### 6.1 Standard shortcut

```ttl
:John :residesIn :House_42 .
```

If residency ends, the triple is removed. The ontology loses:

* legal basis (lease vs. ownership vs. informal arrangement),
* temporal boundaries,
* evidence trail,
* explanatory structure.

### 6.2 Fandaws expansion (grounding tier)

```ttl
# Role (realizable entity)
:TenantRole_John a bfo:Role ;
    inheres_in :John .

# Legal/Normative process
:LeaseProcess_001 a bfo:Process ;
    has_participant :John, :Landlord_A ;
    realizes :TenantRole_John ;
    has_start_date "2023-01-01"^^xsd:date .

# Inhabitation process (can be continuous or episodic)
:Inhabitation_001 a bfo:Process ;
    has_participant :John ;
    realizes :TenantRole_John ;
    occurs_at :House_42 ;
    has_start_date "2023-01-01"^^xsd:date .
```

Residence is not asserted as a primitive edge; it is **derived** from the existence of temporally bounded processes realizing a role and occurring at a location.

---

## 7. Interoperability Without Metaphysical Flattening

### 7.1 Material inference views (property chains / rules)

Fandaws supports binary predicates as derived interface views:

* `realizes ∘ occurs_at  → resides_in`
* `realizes ∘ has_bearer → is_tenant_of` (pattern-dependent)

This preserves:

* external query simplicity,
* data exchange compatibility,
* conventional consumer expectations.

### 7.2 Tiered representation architecture (normative)

Fandaws adopts a three-tier architecture:

| Tier                | Purpose                             | Representation                       |
| ------------------- | ----------------------------------- | ------------------------------------ |
| **Interface tier**  | Interop, SPARQL simplicity          | Derived binary predicates            |
| **Grounding tier**  | Explanation, temporality, causality | Processes, roles, participation      |
| **Foundation tier** | Upper-level integrity               | BFO-aligned categories & constraints |

This is the practical answer to the “too complex” objection: complexity is **internalized** where it provides value, while interface surfaces remain simple.

---

## 8. Mereology: Grounded Parthood Types and Controlled Transitivity

Parthood is the hardest stress test because “part_of” is used across different ontological regimes (structural, social, functional) where mereological axioms behave differently.

### 8.1 The problem: transitivity failures are often category errors

Classic applied failures (e.g., “musician part_of orchestra” vs. “hand part_of musician”) result from mixing different grounding bases under a single transitive predicate.

### 8.2 Grounded parthood pattern

Fandaws distinguishes grounded parthood types:

| Parthood type           | Grounding basis                               | Typical behavior                   |
| ----------------------- | --------------------------------------------- | ---------------------------------- |
| **Structural parthood** | development, assembly, biological integration | Often transitive *within a system* |
| **Membership parthood** | agreement, enrollment, collective action      | Often non-transitive across levels |
| **Functional parthood** | plan execution, role realization in tasks     | Context-dependent                  |

### 8.3 The rule: transitivity is conditional on shared grounding type

Instead of declaring one universal `part_of` transitive everywhere, Fandaws supports:

* transitivity within **structural parthood** when the same integration basis holds,
* explicit non-propagation across grounding boundaries.

This yields a realist explanation for why some “part-of-like” relations shouldn’t propagate—even though they are casually described with the same English word.

---

## 9. Ontological Unpacking as Professional Tradecraft

Fandaws formalizes **ontological unpacking**: the method of converting a flattened relation into the minimal process/role structure that justifies it.

This is not metaphysical hobbyism. It is comparable to:

* normalization in database engineering,
* threat modeling in cybersecurity,
* causal diagramming in statistics,
* hazard analysis in safety engineering.

### 9.1 Why unpacking is sometimes mandatory

Unpacking becomes obligatory when the system requires:

* audit trails (“why did you infer this?”),
* temporal qualification (“when was this true?”),
* disagreement analysis (“which assumption differs?”),
* policy compliance and governance (“who authorized this, under what process?”),
* explainability in high-stakes AI.

In these settings, a graph of “facts” is insufficient; the model must support **justification**.

---

## 10. Stopping Rules: Preventing Primitive Regress

A standard objection to decomposition is: “Where does it stop?”

Fandaws treats granularity as a **governance decision**, bounded by explicit stopping rules.

Unpacking SHOULD stop when one or more apply:

1. **Role-realization adequacy**
   The process is sufficient to explain the truth conditions of the derived relation.

2. **Inference invariance**
   Further decomposition would not change required inferences or constraints.

3. **Expert alignment**
   Domain experts naturally explain the relation at this level (no invented micro-processes).

4. **Decision relevance**
   Additional granularity does not affect outcomes, risk, compliance, or disagreement resolution.

5. **BFO anchoring**
   The model cleanly lands in stable BFO categories (process, role, disposition) rather than drifting into simulation.

This is how you stay realist without becoming a physics engine.

---

## 11. Natural Language Alignment and Explainable Systems

Human explanation is process-first. We justify relations by telling what happened:

* “The wheel is part of the car because it was assembled there.”
* “John resides in the house because he signed a lease and inhabits it.”

Predicate-centric graphs cannot natively produce these justifications; they require external narrative.

Process-grounded graphs can. They support:

* Natural Language Generation (NLG) from process traces,
* traceable justifications (“here is the lease process; here is the inhabitation process”),
* conflict resolution (“we disagree on whether the lease is valid; therefore the residency inference differs”).

### 11.1 Ontological unpacking as XAI

Fandaws-style grounding provides an **explanation substrate**: the ontology encodes the rationale, not just the output relation. This is especially important when AI systems consume the ontology to plan actions or justify decisions.

---

## 12. When Not to Use Fandaws

Fandaws is not mandatory everywhere. It may be unnecessary when:

* the domain is static and purely classificatory,
* temporal qualification is irrelevant,
* justification and audit are not required,
* relations are mathematical/logical/topological and already precise,
* interoperability is the only goal and explanatory fidelity is not demanded.

This is a feature: Fandaws is a discipline for domains where meaning, change, and justification matter—not a universal replacement for predicate-centric modeling.

---

## 13. Conclusion

Binary predicates remain essential for interoperability and efficient querying. The error is not using predicates; the error is treating many of them as **ontological primitives** when their truth conditions depend on processes, roles, and temporally bounded participation.

Fandaws reframes predicate edges as **derived interface views** over a causally and temporally grounded model. It introduces a disciplined practice of ontological unpacking, scoped by relation typology, bounded by stopping rules, and strengthened by grounded parthood types that prevent category mistakes in applied mereology.

The result is not “more complexity for its own sake,” but a principled relocation of meaning to the level where BFO says it belongs: **goings-on in the world**. In high-stakes, human-facing, agent-integrated systems, this shift is not merely a technical improvement—it is the difference between a knowledge graph that asserts and a knowledge graph that can justify.

---

If you want, I can also produce a **Version 3.0 appendix** with:

* 3–5 reusable “Unpacking Templates” (Residency, Ownership, Employment, Implantation, Membership)
* A compact **rule catalog** showing how interface predicates are derived
* A “Fandaws Modeling Checklist” that turns this paper into practice.
