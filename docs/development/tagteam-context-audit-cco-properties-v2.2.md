# TagTeam @context Audit v2.1 — Object Properties vs CCO 2.0 Merged Ontology

**Date:** 2025-02-25
**Revision:** v2.2 — merges audit findings, restructured @context, tagteam.ttl axioms, and validation
**Scope:** All `tagteam:` entries in TagTeam v3.0.0-alpha.1 `@context` checked against `CommonCoreOntologiesMerged.ttl` (CCO 2.0, develop branch, BFO 2020 import dated 2024-11-03)
**Method:** Systematic comparison of every `tagteam:` alias against CCO object properties, BFO properties, and CCO classes by label, domain/range, and definition

---

## SECTION 1: CRITICAL — tagteam: Properties That Duplicate CCO

Three `tagteam:` object properties resolve to fabricated IRIs that duplicate published CCO properties with verified opaque IRIs. These are the same class of error eliminated in the IRI integrity audit (commit 9ed8311) — minting `tagteam:` namespace terms when CCO already defines the exact relationship.

### CRITICAL 1: `has_input`

| | Current | Corrected |
|---|---|---|
| **@context** | `"tagteam:has_input"` | `"cco:ont00001921"` |
| **Resolves to** | `http://tagteam.fandaws.org/ontology/has_input` (fabricated) | `https://www.commoncoreontologies.org/ont00001921` (published) |

**CCO Definition:** "y has_input x iff x is an instance of Continuant and y is an instance of Process, such that the presence of x at the beginning of y is a necessary condition for the start of y."

- **Domain:** Process (`BFO_0000015`)
- **Range:** Continuant (`BFO_0000002`)
- **Subproperty of:** `has_participant` (`BFO_0000057`)
- **Inverse:** `is_input_of` (`cco:ont00001841`)
- **Source ontology:** CCO ExtendedRelationOntology

**Domain/range fit:** ParsingAct → `IntentionalAct` → `Process` ✓. IBE → `InformationBearingEntity` → `MaterialEntity` → `Continuant` ✓.

### CRITICAL 2: `has_output`

| | Current | Corrected |
|---|---|---|
| **@context** | `"tagteam:has_output"` | `"cco:ont00001986"` |
| **Resolves to** | `http://tagteam.fandaws.org/ontology/has_output` (fabricated) | `https://www.commoncoreontologies.org/ont00001986` (published) |

**CCO Definition:** "y has_output x iff x is an instance of Continuant and y is an instance of Process, such that the presence of x at the end of y is a necessary condition for the completion of y."

- **Domain:** Process (`BFO_0000015`)
- **Range:** Continuant (`BFO_0000002`)
- **Subproperty of:** `has_participant` (`BFO_0000057`)
- **Inverse:** `is_output_of` (`cco:ont00001816`)
- **Source ontology:** CCO ExtendedRelationOntology
- **Definition source:** IPO model (Wikipedia)

**Domain/range fit:** ParsingAct → `Process` ✓. DiscourseReferent → (pending `tagteam.ttl` formalization as `GenericallyDependentContinuant`) → `Continuant` ✓.

### CRITICAL 3: `prescribed_by`

| | Current | Corrected |
|---|---|---|
| **@context** | `"tagteam:prescribed_by"` | `"cco:ont00001920"` |
| **Resolves to** | `http://tagteam.fandaws.org/ontology/prescribed_by` (fabricated) | `https://www.commoncoreontologies.org/ont00001920` (published) |

**CCO Definition:** "x prescribed_by y iff y is an instance of Information Content Entity and x is an instance of Entity, such that y serves as a rule or guide for x if x is an Occurrent, or y serves as a model for x if x is a Continuant."

- **Domain:** Entity (via inverse)
- **Range:** `PrescriptiveInformationContentEntity` (`cco:ont00000965`)
- **Subproperty of:** `is_subject_of` (`cco:ont00001801`)
- **Inverse:** `prescribes` (`cco:ont00001942`) — **already correctly mapped in @context**
- **Source ontology:** CCO InformationEntityOntology

**Note:** The forward direction `prescribes` is already correctly aliased to `cco:ont00001942`. Only the inverse `prescribed_by` was fabricated. An asymmetric error — half the pair is right, half is wrong.

---

## SECTION 2: MISSING — CCO Properties That Should Be in @context

These properties are not currently in the @context but are needed for graph traversal, the Tier 1/Tier 2 separation fix, or completeness of inverse pairs.

### REQUIRED (blocks Tier 1/Tier 2 fix)

| Alias | IRI | Label | Rationale |
|---|---|---|---|
| `is_subject_of` | `cco:ont00001801` | "is subject of" | Inverse of `is_about`. **Required** for Tier 2 → Tier 1 back-link. Replaces proposed `tagteam:denoted_by`. Keeps the back-link strictly within the CCO Information Entity Ontology ecosystem. |

### RECOMMENDED (inverse completeness)

| Alias | IRI | Label | Rationale |
|---|---|---|---|
| `is_input_of` | `cco:ont00001841` | "is input of" | Inverse of `has_input`. Enables Continuant → Process traversal. |
| `is_output_of` | `cco:ont00001816` | "is output of" | Inverse of `has_output`. Enables Continuant → Process traversal. |

---

## SECTION 3: RESOLVED — tagteam: Properties With Partial CCO Overlap

All eight properties from the original investigation backlog have been resolved with formal BFO/CCO verdicts. Six are confirmed legitimate `tagteam:` terms. Two require `tagteam.ttl` axioms to bridge into the BFO hierarchy.

### 3.1 `occurs_during` — KEEP tagteam:

- **Candidate:** `occupies_temporal_region` (`BFO_0000199`)
- **Verdict:** KEEP `tagteam:occurs_during`.
- **Rationale:** `occupies_temporal_region` is a functional property implying an exact 1:1 temporal footprint — the process and the time region are identical in extent. TagTeam's `occurs_during` expresses temporal containment: "He slept during the flight" does not mean the sleeping occupied the entire flight interval. BFO uses `occurs_in` (`BFO_0000066`) for spatial/temporal containment of this kind, but its formal range is `MaterialEntity` or `Site`, not `TemporalRegion`. Keeping `tagteam:occurs_during` avoids misuse of either BFO property.
- **tagteam.ttl action:** Document as distinct from `occupies_temporal_region`. No `subPropertyOf` — different semantics.

### 3.2 `has_start_time` / `has_end_time` — KEEP tagteam: as DatatypeProperties

- **Candidates:** `has_first_instant` (`BFO_0000222`), `has_last_instant` (`BFO_0000224`)
- **Verdict:** KEEP `tagteam:has_start_time`, `tagteam:has_end_time`.
- **Rationale:** BFO's temporal relations are strictly `owl:ObjectProperty` types — they point to another IRI (a `TemporalInstant` node). NLP pipelines point to `xsd:dateTime` string literals. By keeping these in the `tagteam:` namespace and typing them as `owl:DatatypeProperty`, TagTeam avoids violating BFO's strict object property ranges.
- **tagteam.ttl action:** Declare as `owl:DatatypeProperty` with `rdfs:range xsd:dateTime`. No BFO `subPropertyOf` — fundamentally different property type (data vs. object).

### 3.3 `has_function` — KEEP tagteam:, bridge via subPropertyOf

- **Candidate:** `is_bearer_of` (`BFO_0000196`)
- **Verdict:** KEEP `tagteam:has_function` in @context. Formalize in `tagteam.ttl`.
- **Rationale:** In BFO, `Function` is a subclass of `RealizableEntity`, which is a subclass of `SpecificallyDependentContinuant`. The general bearer relation is `bearer_of` (`BFO_0000196`). BFO 1.1 had a specific `has_function` sub-property (`BFO_0000085`), but **this property was removed in BFO 2020** — the 2020 restructure collapsed `has_function`, `has_role`, `has_quality` into the single `bearer_of`. Application ontologies define their own sub-properties. CCO follows this pattern: `has_capability` (`cco:ont00001954`) is declared `rdfs:subPropertyOf bfo:BFO_0000196`.
- **tagteam.ttl action:**

```turtle
tagteam:has_function rdf:type owl:ObjectProperty ;
    rdfs:subPropertyOf bfo:BFO_0000196 ;
    rdfs:label "has function"@en ;
    skos:definition "x has_function y iff x is an independent continuant
        and y is a function that inheres in x."@en .
```

**⚠ BFO version note:** Do NOT use `bfo:BFO_0000085`. That IRI existed in BFO 1.1 but is absent from BFO 2020 (`bfo-core.ttl`, 2024-11-03 import). The correct BFO 2020 super-property is `bfo:BFO_0000196` (`bearer_of`).

### 3.4 `has_spatial_extent` — KEEP tagteam:

- **Candidate:** `occupies_spatial_region` (`BFO_0000210`)
- **Verdict:** KEEP `tagteam:has_spatial_extent`.
- **Rationale:** BFO's `occupies_spatial_region` has domain `IndependentContinuant` (not spatial region) and range `SpatialRegion`. TagTeam uses `has_spatial_extent` to link entities to text-extracted location descriptions (strings, not formal spatial regions). Different mechanism — TagTeam operates at the linguistic layer, not the geometric layer.
- **tagteam.ttl action:** No BFO `subPropertyOf`. Document as NLP provenance property.

### 3.5 `describes_quality` — KEEP tagteam:

- **Candidate:** `describes` (`cco:ont00001982`)
- **Verdict:** KEEP `tagteam:describes_quality`.
- **Rationale:** CCO `describes` has domain `DescriptiveInformationContentEntity` (`cco:ont00000853`). `tagteam:describes_quality` links DiscourseReferents to Qualities — a different ontological pattern. Not a duplicate.
- **tagteam.ttl action:** No CCO `subPropertyOf`. Different domain/range.

### 3.6 `has_component` — KEEP tagteam: for NLP structure

- **Candidate:** `has_continuant_part` (`BFO_0000178`)
- **Verdict:** KEEP `tagteam:has_component`.
- **Rationale:** BFO mereology (`has_continuant_part`) is strict — it implies transitivity and physical dependency between material continuants. TagTeam uses `has_component` for linguistic structure: "This VerbPhrase `has_component` this NounPhrase." Applying BFO physical parthood to linguistic parse structures would be a category error. Keep as a `tagteam:` structural property.
- **tagteam.ttl action:** No BFO `subPropertyOf`. Document as linguistic structural relation, explicitly noting it is NOT BFO mereological parthood.

### 3.7 `supersedes` — KEEP tagteam:

- **Candidate:** `is_predecessor_of` (`cco:ont00001928`) / `is_successor_of` (`cco:ont00001775`)
- **Verdict:** KEEP `tagteam:supersedes`.
- **Rationale:** CCO's predecessor/successor relations are tightly bound to manufacturing and processing chains — formally defined through input/output of a process (c1 is input to process p1, p1 outputs c2, therefore c2 is successor of c1). TagTeam's `supersedes` is used for document versioning and correcting human validation records. Mapping to CCO successor would accidentally trigger supply-chain reasoning semantics in any reasoner that imports CCO axioms.
- **tagteam.ttl action:** No CCO `subPropertyOf`. Document distinct semantics.

### 3.8 `has_measurement_value` — KEEP tagteam:

- **Candidate:** CCO data properties: `has_decimal_value` (`cco:ont00001769`), `has_integer_value` (`cco:ont00001773`)
- **Verdict:** KEEP `tagteam:has_measurement_value`.
- **Rationale:** TagTeam uses this as an object property linking to measurement nodes. CCO equivalents are data properties with literal ranges. Different mechanism.
- **tagteam.ttl action:** No CCO `subPropertyOf`. Different property type.

---

## SECTION 4: VERIFIED LEGITIMATE — tagteam: Properties With No CCO Equivalent

These 15 object properties are domain-specific to TagTeam's NLP pipeline, deontic system, or value detection framework. No CCO/BFO equivalent exists.

| Property | Rationale |
|---|---|
| `corefersWith` | Coreference between discourse referents. Linguistic — no BFO/CCO analogue. |
| `extracted_from` | NLP extraction provenance. TagTeam-specific processing relation. |
| `would_be_realized_in` | Counterfactual realization. BFO `realizes`/`realized_in` is actual only. |
| `bears_role_for` | Role-beneficiary relation. BFO `inheres_in` gives bearer, not beneficiary. |
| `has_possession` | Possessive relation from NLP. No CCO ownership/possession property. |
| `asserts` | Assertion link for detection records. Domain-specific provenance. |
| `detected_by` | Detection provenance. Domain-specific to TagTeam pipeline. |
| `based_on` | Evidence basis link. Domain-specific to TagTeam assessment. |
| `assertionType` | Assertion classification. Domain-specific metadata. |
| `validInContext` | Context validity link. Domain-specific to TagTeam. |
| `actualityStatus` | Actuality classification. Domain-specific to TagTeam deontic system. |
| `validatedBy` | Validation provenance. Domain-specific to TagTeam curation. |
| `scarceResource` | Scarcity target. Domain-specific to scarcity detection. |
| `competingParties` | Scarcity competition. Domain-specific to scarcity detection. |
| `instantiated_by` | Instance creation source. Domain-specific provenance. |

---

## SECTION 5: VERIFIED LEGITIMATE — tagteam: Classes

All 26 `tagteam:` classes are domain-specific. None duplicate CCO classes.

**NLP/Linguistic:** `DiscourseReferent`, `VerbPhrase`

**Deontic/Status:** `ActualityStatus`, `Actual`, `Prescribed`, `Permitted`, `Prohibited`, `Hypothetical`, `Planned`, `Negated`, `Entitled`, `Empowered`, `Protected`

**Value Detection:** `DirectiveContent`, `ScarcityAssertion`, `ValueDetectionRecord`, `ContextAssessmentRecord`, `InterpretationContext`, `ValueAssertionEvent`, `ContextAssessmentEvent`, `EthicalValueICE`, `ContextDimensionICE`

**Curation Workflow:** `AutomatedDetection`, `HumanValidation`, `HumanRejection`, `HumanCorrection`

---

## SECTION 6: VERIFIED LEGITIMATE — tagteam: Data/Annotation Properties

54 `tagteam:` data/annotation properties checked. All are domain-specific metadata (NLP confidence scores, parse metadata, detection parameters, span positions, etc.) with no CCO equivalents.

**Note:** `has_text_value` correctly uses `cco:ont00001765` with explicit `@type: "xsd:string"`. ✓ (v2.2 fix — was untyped in v2.1)

---

## SECTION 7: Restructured @context

The @context has been restructured for formatting consistency and organizational clarity. All entries now use the expanded `{@id}` form (namespace prefixes excepted per JSON-LD spec). The formatting rule is:

| Pattern | Meaning |
|---|---|
| No `@type` | Class alias or plain string property (values are strings by default; `@type` arrays always resolve IRIs) |
| `@type: "@id"` | Object property (values are IRIs) |
| `@type: "xsd:..."` | Typed data property (values are typed literals — includes CCO `has_text_value` as `xsd:string`) |

Section grouping order:

1. Namespace prefixes
2. BFO 2020 classes
3. CCO 2.0 classes
4. tagteam classes (NLP/Linguistic, Deontic/Status, Value Detection, Curation)
5. BFO 2020 object properties
6. CCO 2.0 object properties (fixes and additions applied here)
7. tagteam object properties
8. CCO 2.0 data properties
9. tagteam data properties (grouped by xsd type)
10. tagteam annotation/string properties

### Known alias pair

`is_part_of` and `continuant_part_of` both resolve to `bfo:BFO_0000176`. This is intentional — BFO labels it "continuant part of" but natural language uses "is part of." Both aliases are retained for readability in different contexts.

### Restructured @context JSON

```json
{
  "@context": {

    "_comment_0": "═══════════════════════════════════════════════════════════",
    "_comment_1": "  NAMESPACE PREFIXES",
    "_comment_2": "═══════════════════════════════════════════════════════════",

    "bfo":     "http://purl.obolibrary.org/obo/",
    "cco":     "https://www.commoncoreontologies.org/",
    "tagteam": "http://tagteam.fandaws.org/ontology/",
    "inst":    "http://tagteam.fandaws.org/instance/",
    "rdf":     "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "rdfs":    "http://www.w3.org/2000/01/rdf-schema#",
    "owl":     "http://www.w3.org/2002/07/owl#",
    "xsd":     "http://www.w3.org/2001/XMLSchema#",

    "_comment_10": "═══════════════════════════════════════════════════════════",
    "_comment_11": "  BFO 2020 CLASSES",
    "_comment_12": "  Source: bfo-core.ttl (2024-11-03 import)",
    "_comment_13": "═══════════════════════════════════════════════════════════",

    "Entity":                         { "@id": "bfo:BFO_0000001" },
    "Continuant":                     { "@id": "bfo:BFO_0000002" },
    "IndependentContinuant":          { "@id": "bfo:BFO_0000004" },
    "TemporalRegion":                 { "@id": "bfo:BFO_0000008" },
    "Process":                        { "@id": "bfo:BFO_0000015" },
    "Disposition":                    { "@id": "bfo:BFO_0000016" },
    "Quality":                        { "@id": "bfo:BFO_0000019" },
    "Role":                           { "@id": "bfo:BFO_0000023" },
    "ObjectAggregate":                { "@id": "bfo:BFO_0000027" },
    "Site":                           { "@id": "bfo:BFO_0000029" },
    "Object":                         { "@id": "bfo:BFO_0000030" },
    "GenericallyDependentContinuant": { "@id": "bfo:BFO_0000031" },
    "OneDimensionalTemporalRegion":   { "@id": "bfo:BFO_0000038" },
    "MaterialEntity":                 { "@id": "bfo:BFO_0000040" },
    "RelationalQuality":              { "@id": "bfo:BFO_0000145" },

    "_comment_20": "═══════════════════════════════════════════════════════════",
    "_comment_21": "  CCO 2.0 CLASSES",
    "_comment_22": "  Source: CommonCoreOntologiesMerged.ttl (Version 2.0)",
    "_comment_23": "═══════════════════════════════════════════════════════════",

    "Act":                        { "@id": "cco:ont00000005" },
    "ActOfCommunication":         { "@id": "cco:ont00000402" },
    "Agent":                      { "@id": "cco:ont00001017" },
    "Artifact":                   { "@id": "cco:ont00000995" },
    "Country":                    { "@id": "cco:ont00000139" },
    "Facility":                   { "@id": "cco:ont00000192" },
    "GeopoliticalOrganization":   { "@id": "cco:ont00000176" },
    "InformationBearingEntity":   { "@id": "cco:ont00000253" },
    "InformationContentEntity":   { "@id": "cco:ont00000958" },
    "IntentionalAct":             { "@id": "cco:ont00000228" },
    "Organization":               { "@id": "cco:ont00001180" },
    "Person":                     { "@id": "cco:ont00001262" },

    "_comment_30": "═══════════════════════════════════════════════════════════",
    "_comment_31": "  TAGTEAM CLASSES — NLP / Linguistic",
    "_comment_32": "═══════════════════════════════════════════════════════════",

    "DiscourseReferent":  { "@id": "tagteam:DiscourseReferent" },
    "VerbPhrase":         { "@id": "tagteam:VerbPhrase" },

    "_comment_33": "───────────────────────────────────────────────────────────",
    "_comment_34": "  TAGTEAM CLASSES — Deontic / Actuality Status",
    "_comment_35": "───────────────────────────────────────────────────────────",

    "ActualityStatus": { "@id": "tagteam:ActualityStatus" },
    "Actual":          { "@id": "tagteam:Actual" },
    "Prescribed":      { "@id": "tagteam:Prescribed" },
    "Permitted":       { "@id": "tagteam:Permitted" },
    "Prohibited":      { "@id": "tagteam:Prohibited" },
    "Hypothetical":    { "@id": "tagteam:Hypothetical" },
    "Planned":         { "@id": "tagteam:Planned" },
    "Negated":         { "@id": "tagteam:Negated" },
    "Entitled":        { "@id": "tagteam:Entitled" },
    "Empowered":       { "@id": "tagteam:Empowered" },
    "Protected":       { "@id": "tagteam:Protected" },

    "_comment_36": "───────────────────────────────────────────────────────────",
    "_comment_37": "  TAGTEAM CLASSES — Value Detection",
    "_comment_38": "───────────────────────────────────────────────────────────",

    "DirectiveContent":          { "@id": "tagteam:DirectiveContent" },
    "ScarcityAssertion":         { "@id": "tagteam:ScarcityAssertion" },
    "ValueDetectionRecord":      { "@id": "tagteam:ValueDetectionRecord" },
    "ContextAssessmentRecord":   { "@id": "tagteam:ContextAssessmentRecord" },
    "InterpretationContext":     { "@id": "tagteam:InterpretationContext" },
    "ValueAssertionEvent":       { "@id": "tagteam:ValueAssertionEvent" },
    "ContextAssessmentEvent":    { "@id": "tagteam:ContextAssessmentEvent" },
    "EthicalValueICE":           { "@id": "tagteam:EthicalValueICE" },
    "ContextDimensionICE":       { "@id": "tagteam:ContextDimensionICE" },

    "_comment_39": "───────────────────────────────────────────────────────────",
    "_comment_40": "  TAGTEAM CLASSES — Curation Workflow",
    "_comment_41": "───────────────────────────────────────────────────────────",

    "AutomatedDetection": { "@id": "tagteam:AutomatedDetection" },
    "HumanValidation":    { "@id": "tagteam:HumanValidation" },
    "HumanRejection":     { "@id": "tagteam:HumanRejection" },
    "HumanCorrection":    { "@id": "tagteam:HumanCorrection" },

    "_comment_50": "═══════════════════════════════════════════════════════════",
    "_comment_51": "  BFO 2020 OBJECT PROPERTIES",
    "_comment_52": "  All verified against bfo-core.ttl (2024-11-03 import)",
    "_comment_53": "═══════════════════════════════════════════════════════════",

    "is_concretized_by":        { "@id": "bfo:BFO_0000058",  "@type": "@id" },
    "concretizes":              { "@id": "bfo:BFO_0000059",  "@type": "@id" },
    "inheres_in":               { "@id": "bfo:BFO_0000197",  "@type": "@id" },
    "is_bearer_of":             { "@id": "bfo:BFO_0000196",  "@type": "@id" },
    "realized_in":              { "@id": "bfo:BFO_0000054",  "@type": "@id" },
    "realizes":                 { "@id": "bfo:BFO_0000055",  "@type": "@id" },
    "has_participant":          { "@id": "bfo:BFO_0000057",  "@type": "@id" },
    "participates_in":          { "@id": "bfo:BFO_0000056",  "@type": "@id" },
    "has_member_part":          { "@id": "bfo:BFO_0000115",  "@type": "@id" },
    "member_part_of":           { "@id": "bfo:BFO_0000129",  "@type": "@id" },
    "has_continuant_part":      { "@id": "bfo:BFO_0000178",  "@type": "@id" },
    "continuant_part_of":       { "@id": "bfo:BFO_0000176",  "@type": "@id" },
    "is_part_of":               { "@id": "bfo:BFO_0000176",  "@type": "@id" },
    "located_in":               { "@id": "bfo:BFO_0000171",  "@type": "@id" },
    "occupies_temporal_region":  { "@id": "bfo:BFO_0000199",  "@type": "@id" },

    "_comment_60": "═══════════════════════════════════════════════════════════",
    "_comment_61": "  CCO 2.0 OBJECT PROPERTIES",
    "_comment_62": "  All verified against CommonCoreOntologiesMerged.ttl",
    "_comment_63": "  ★ = fixed in audit v2  ✚ = added in audit v2",
    "_comment_64": "═══════════════════════════════════════════════════════════",

    "is_about":              { "@id": "cco:ont00001808",  "@type": "@id" },
    "is_subject_of":         { "@id": "cco:ont00001801",  "@type": "@id" },
    "prescribes":            { "@id": "cco:ont00001942",  "@type": "@id" },
    "prescribed_by":         { "@id": "cco:ont00001920",  "@type": "@id" },
    "has_agent":             { "@id": "cco:ont00001833",  "@type": "@id" },
    "has_recipient":         { "@id": "cco:ont00001922",  "@type": "@id" },
    "has_input":             { "@id": "cco:ont00001921",  "@type": "@id" },
    "has_output":            { "@id": "cco:ont00001986",  "@type": "@id" },
    "is_input_of":           { "@id": "cco:ont00001841",  "@type": "@id" },
    "is_output_of":          { "@id": "cco:ont00001816",  "@type": "@id" },
    "affects":               { "@id": "cco:ont00001834",  "@type": "@id" },
    "designates":            { "@id": "cco:ont00001916",  "@type": "@id" },
    "is_designated_by":      { "@id": "cco:ont00001879",  "@type": "@id" },
    "is_measured_by":        { "@id": "cco:ont00001904",  "@type": "@id" },
    "measures":              { "@id": "cco:ont00001966",  "@type": "@id" },
    "uses_measurement_unit": { "@id": "cco:ont00001863",  "@type": "@id" },

    "_comment_70": "═══════════════════════════════════════════════════════════",
    "_comment_71": "  TAGTEAM OBJECT PROPERTIES",
    "_comment_72": "  Verified: no CCO/BFO equivalent exists (audit v2 §3–4)",
    "_comment_73": "═══════════════════════════════════════════════════════════",

    "has_component":         { "@id": "tagteam:has_component",         "@type": "@id" },
    "extracted_from":        { "@id": "tagteam:extracted_from",        "@type": "@id" },
    "corefersWith":          { "@id": "tagteam:corefersWith",          "@type": "@id" },
    "describes_quality":     { "@id": "tagteam:describes_quality",     "@type": "@id" },
    "would_be_realized_in":  { "@id": "tagteam:would_be_realized_in", "@type": "@id" },
    "has_possession":        { "@id": "tagteam:has_possession",        "@type": "@id" },
    "has_function":          { "@id": "tagteam:has_function",          "@type": "@id" },
    "has_spatial_extent":    { "@id": "tagteam:has_spatial_extent",    "@type": "@id" },
    "bears_role_for":        { "@id": "tagteam:bears_role_for",        "@type": "@id" },
    "occurs_during":         { "@id": "tagteam:occurs_during",         "@type": "@id" },
    "has_measurement_value": { "@id": "tagteam:has_measurement_value", "@type": "@id" },
    "has_start_time":        { "@id": "tagteam:has_start_time",        "@type": "@id" },
    "has_end_time":          { "@id": "tagteam:has_end_time",          "@type": "@id" },
    "assertionType":         { "@id": "tagteam:assertionType",         "@type": "@id" },
    "validInContext":        { "@id": "tagteam:validInContext",        "@type": "@id" },
    "actualityStatus":       { "@id": "tagteam:actualityStatus",       "@type": "@id" },
    "validatedBy":           { "@id": "tagteam:validatedBy",           "@type": "@id" },
    "supersedes":            { "@id": "tagteam:supersedes",            "@type": "@id" },
    "scarceResource":        { "@id": "tagteam:scarceResource",        "@type": "@id" },
    "asserts":               { "@id": "tagteam:asserts",               "@type": "@id" },
    "detected_by":           { "@id": "tagteam:detected_by",           "@type": "@id" },
    "based_on":              { "@id": "tagteam:based_on",              "@type": "@id" },
    "instantiated_by":       { "@id": "tagteam:instantiated_by",       "@type": "@id" },

    "competingParties": {
      "@id":        "tagteam:competingParties",
      "@type":      "@id",
      "@container": "@set"
    },

    "_comment_80": "═══════════════════════════════════════════════════════════",
    "_comment_81": "  CCO 2.0 DATA PROPERTIES",
    "_comment_82": "═══════════════════════════════════════════════════════════",

    "has_text_value": { "@id": "cco:ont00001765", "@type": "xsd:string" },

    "_comment_90": "═══════════════════════════════════════════════════════════",
    "_comment_91": "  TAGTEAM DATA PROPERTIES — xsd:dateTime",
    "_comment_92": "═══════════════════════════════════════════════════════════",

    "instantiated_at":       { "@id": "tagteam:instantiated_at",       "@type": "xsd:dateTime" },
    "validationTimestamp":   { "@id": "tagteam:validationTimestamp",    "@type": "xsd:dateTime" },
    "detected_at":           { "@id": "tagteam:detected_at",           "@type": "xsd:dateTime" },
    "received_at":           { "@id": "tagteam:received_at",           "@type": "xsd:dateTime" },
    "temporal_extent":       { "@id": "tagteam:temporal_extent",       "@type": "xsd:dateTime" },

    "_comment_93": "───────────────────────────────────────────────────────────",
    "_comment_94": "  TAGTEAM DATA PROPERTIES — xsd:decimal",
    "_comment_95": "───────────────────────────────────────────────────────────",

    "extractionConfidence":      { "@id": "tagteam:extractionConfidence",      "@type": "xsd:decimal" },
    "classificationConfidence":  { "@id": "tagteam:classificationConfidence",  "@type": "xsd:decimal" },
    "relevanceConfidence":       { "@id": "tagteam:relevanceConfidence",       "@type": "xsd:decimal" },
    "aggregateConfidence":       { "@id": "tagteam:aggregateConfidence",       "@type": "xsd:decimal" },
    "modalStrength":             { "@id": "tagteam:modalStrength",             "@type": "xsd:decimal" },
    "scarcityRatio":             { "@id": "tagteam:scarcityRatio",             "@type": "xsd:decimal" },
    "salience":                  { "@id": "tagteam:salience",                  "@type": "xsd:decimal" },
    "score":                     { "@id": "tagteam:score",                     "@type": "xsd:decimal" },

    "_comment_96": "───────────────────────────────────────────────────────────",
    "_comment_97": "  TAGTEAM DATA PROPERTIES — xsd:integer",
    "_comment_98": "───────────────────────────────────────────────────────────",

    "supplyCount":    { "@id": "tagteam:supplyCount",    "@type": "xsd:integer" },
    "demandCount":    { "@id": "tagteam:demandCount",    "@type": "xsd:integer" },
    "member_count":   { "@id": "tagteam:member_count",   "@type": "xsd:integer" },
    "member_index":   { "@id": "tagteam:member_index",   "@type": "xsd:integer" },
    "startPosition":  { "@id": "tagteam:startPosition",  "@type": "xsd:integer" },
    "endPosition":    { "@id": "tagteam:endPosition",    "@type": "xsd:integer" },
    "quantity":       { "@id": "tagteam:quantity",        "@type": "xsd:integer" },
    "char_count":     { "@id": "tagteam:char_count",      "@type": "xsd:integer" },
    "word_count":     { "@id": "tagteam:word_count",      "@type": "xsd:integer" },
    "polarity":       { "@id": "tagteam:polarity",        "@type": "xsd:integer" },

    "_comment_100": "═══════════════════════════════════════════════════════════",
    "_comment_101": "  TAGTEAM ANNOTATION / STRING PROPERTIES",
    "_comment_102": "  Values are plain strings — no type coercion",
    "_comment_103": "═══════════════════════════════════════════════════════════",

    "framework":            { "@id": "tagteam:framework" },
    "negationMarker":       { "@id": "tagteam:negationMarker" },
    "aggregationMethod":    { "@id": "tagteam:aggregationMethod" },
    "modalType":            { "@id": "tagteam:modalType" },
    "modalMarker":          { "@id": "tagteam:modalMarker" },
    "scarcityMarker":       { "@id": "tagteam:scarcityMarker" },
    "evidenceText":         { "@id": "tagteam:evidenceText" },
    "classificationLabel":  { "@id": "tagteam:classificationLabel" },
    "classificationBasis":  { "@id": "tagteam:classificationBasis" },
    "qualifierText":        { "@id": "tagteam:qualifierText" },
    "severity":             { "@id": "tagteam:severity" },
    "ageCategory":          { "@id": "tagteam:ageCategory" },
    "sourceText":           { "@id": "tagteam:sourceText" },
    "definiteness":         { "@id": "tagteam:definiteness" },
    "quantityIndicator":    { "@id": "tagteam:quantityIndicator" },
    "qualifiers":           { "@id": "tagteam:qualifiers" },
    "verb":                 { "@id": "tagteam:verb" },
    "lemma":                { "@id": "tagteam:lemma" },
    "tense":                { "@id": "tagteam:tense" },
    "hasModalMarker":       { "@id": "tagteam:hasModalMarker" },
    "version":              { "@id": "tagteam:version" },
    "algorithm":            { "@id": "tagteam:algorithm" },
    "capabilities":         { "@id": "tagteam:capabilities" },
    "valueName":            { "@id": "tagteam:valueName" },
    "valueCategory":        { "@id": "tagteam:valueCategory" },
    "evidence":             { "@id": "tagteam:evidence" },
    "sourceSpan":           { "@id": "tagteam:sourceSpan" },
    "category":             { "@id": "tagteam:category" },
    "matched_markers":      { "@id": "tagteam:matched_markers" },
    "detection_method":     { "@id": "tagteam:detection_method" },
    "dimension":            { "@id": "tagteam:dimension" }
  }
}
```

---

## SECTION 8: tagteam.ttl Axioms — DELIVERED

The `tagteam:` properties confirmed as legitimate in Sections 3–4 are now formalized with OWL axioms in `tagteam.ttl`. These axioms bridge into the BFO/CCO hierarchy where appropriate and carry `skos:scopeNote` documentation where a near-miss CCO/BFO property exists.

**Validated:** 27 triples, rdflib parse successful. 6 `owl:ObjectProperty`, 2 `owl:DatatypeProperty`, 1 `rdfs:subPropertyOf` axiom (has_function → BFO 2020 bearer_of).

### Properties requiring `rdfs:subPropertyOf` axioms

| tagteam: Property | Super-property | Rationale |
|---|---|---|
| `tagteam:has_function` | `bfo:BFO_0000196` (`bearer_of`) | Function inheres in bearer. BFO 2020 pattern. **Not** `BFO_0000085` (removed in BFO 2020). |
| `tagteam:would_be_realized_in` | *(none — novel)* | Counterfactual; no BFO super-property applies. |
| `tagteam:extracted_from` | *(none — novel)* | NLP provenance; outside BFO scope. |

### Properties requiring `owl:DatatypeProperty` declaration

| tagteam: Property | Range | Note |
|---|---|---|
| `tagteam:has_start_time` | `xsd:dateTime` | NOT a BFO temporal object property. |
| `tagteam:has_end_time` | `xsd:dateTime` | NOT a BFO temporal object property. |
| `tagteam:occurs_during` | *(depends on usage)* | If range is `xsd:dateTime`, declare as DatatypeProperty. If range is a TemporalRegion IRI, declare as ObjectProperty and document distinction from `occupies_temporal_region`. |

### Properties requiring explicit non-BFO documentation

These are correct as `tagteam:` properties but carry `skos:scopeNote` in `tagteam.ttl` explaining why they are NOT the BFO/CCO property they resemble:

| tagteam: Property | Resembles | Why distinct |
|---|---|---|
| `tagteam:has_component` | `has_continuant_part` (`BFO_0000178`) | Linguistic structure, not BFO mereological parthood. |
| `tagteam:supersedes` | `is_successor_of` (`cco:ont00001775`) | Document versioning, not CCO manufacturing chain. |
| `tagteam:describes_quality` | `describes` (`cco:ont00001982`) | DiscourseReferent → Quality link, not DescriptiveICE → Entity. |

### tagteam.ttl

```turtle
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix bfo:  <http://purl.obolibrary.org/obo/> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
@prefix tagteam: <http://tagteam.fandaws.org/ontology/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

# ═══════════════════════════════════════════════════════════
#  TagTeam Application Ontology — Property Axioms
#  Source: tagteam-context-audit-cco-properties v2.2
#  Date: 2025-02-25
# ═══════════════════════════════════════════════════════════

# ───────────────────────────────────────────────────────────
#  1. BFO Bridged Object Properties (Audit §3.3)
# ───────────────────────────────────────────────────────────

tagteam:has_function a owl:ObjectProperty ;
    rdfs:subPropertyOf bfo:BFO_0000196 ;  # BFO 2020 bearer_of
    rdfs:label "has function"@en ;
    skos:definition "x has_function y iff x is an independent continuant and y is a function that inheres in x."@en .

# ───────────────────────────────────────────────────────────
#  2. Datatype Properties (Audit §3.2)
# ───────────────────────────────────────────────────────────

tagteam:has_start_time a owl:DatatypeProperty ;
    rdfs:label "has start time"@en ;
    rdfs:range xsd:dateTime ;
    skos:scopeNote "NLP extraction property. Distinct from BFO Object Properties like has_first_instant."@en .

tagteam:has_end_time a owl:DatatypeProperty ;
    rdfs:label "has end time"@en ;
    rdfs:range xsd:dateTime ;
    skos:scopeNote "NLP extraction property. Distinct from BFO Object Properties like has_last_instant."@en .

# ───────────────────────────────────────────────────────────
#  3. Domain-Specific Object Properties (Audit §8)
# ───────────────────────────────────────────────────────────

tagteam:would_be_realized_in a owl:ObjectProperty ;
    rdfs:label "would be realized in"@en ;
    skos:scopeNote "Denotes counterfactual realization. BFO realizes/realized_in is reserved for actual events only."@en .

tagteam:extracted_from a owl:ObjectProperty ;
    rdfs:label "extracted from"@en ;
    skos:scopeNote "NLP processing provenance. Links a parse artifact to its source text span."@en .

tagteam:has_component a owl:ObjectProperty ;
    rdfs:label "has component"@en ;
    skos:scopeNote "Denotes linguistic or structural composition (e.g., VerbPhrase contains NounPhrase). STRICTLY NOT BFO mereological parthood (has_continuant_part)."@en .

tagteam:supersedes a owl:ObjectProperty ;
    rdfs:label "supersedes"@en ;
    skos:scopeNote "Denotes document or validation record versioning. Distinct from CCO is_successor_of, which implies a manufacturing/process chain."@en .

tagteam:describes_quality a owl:ObjectProperty ;
    rdfs:label "describes quality"@en ;
    skos:scopeNote "Links a linguistic DiscourseReferent to a Quality. Distinct from CCO describes, which links a DescriptiveICE to an Entity."@en .
```

---

## SECTION 9: Validation Results

Validation run against the restructured @context JSON and tagteam.ttl. All passes successful.

```
═══ VALIDATION PASS 1: JSON-LD Structure ═══
  ✓ All entries are expanded {"@id": ...} dicts
  ✓ All IRIs use declared namespace prefixes

═══ VALIDATION PASS 2: Duplicate Aliases ═══
  ✓ No duplicate aliases

═══ VALIDATION PASS 3: Duplicate IRIs ═══
  ⚠ Known: ['continuant_part_of', 'is_part_of'] → bfo:BFO_0000176
    (BFO labels it "continuant part of"; natural language uses "is part of")

═══ VALIDATION PASS 4: Audit v2 Fixes ═══
  ✓ has_input       → cco:ont00001921 (was tagteam:has_input)
  ✓ has_output      → cco:ont00001986 (was tagteam:has_output)
  ✓ prescribed_by   → cco:ont00001920 (was tagteam:prescribed_by)
  ✓ is_subject_of   → cco:ont00001801 (new)
  ✓ is_input_of     → cco:ont00001841 (new)
  ✓ is_output_of    → cco:ont00001816 (new)

═══ VALIDATION PASS 5: No Fabricated IRIs ═══
  ✓ No fabricated tagteam: IRIs for audited properties

═══ VALIDATION PASS 6: Formatting Consistency ═══
  ✓ All non-prefix entries use expanded {@id} format

═══ VALIDATION PASS 7: Type Annotations ═══
  Object properties (@type: @id):     55
  Data properties (@type: xsd:...):   24   ← +1 (has_text_value now typed)
  Classes/strings (no @type):         84   ← -1
  Total:                              163

═══ VALIDATION PASS 8: Section Organization ═══
  10 top-level sections verified

═══ VALIDATION PASS 9: No Lost Entries ═══
  ✓ All 38 spot-checked original aliases present

═══ VALIDATION PASS 10: tagteam.ttl (rdflib) ═══
  ✓ Valid Turtle — 27 triples parsed
  ✓ 6 owl:ObjectProperty declarations
  ✓ 2 owl:DatatypeProperty declarations
  ✓ 1 rdfs:subPropertyOf axiom
  ✓ has_function → bfo:BFO_0000196 (BFO 2020 bearer_of)
```

**Entry counts:**

| Category | Count |
|---|---|
| Namespace prefixes | 8 |
| BFO classes | 15 |
| CCO classes | 12 |
| tagteam classes | 26 |
| BFO object properties | 15 |
| CCO object properties | 16 |
| tagteam object properties | 24 |
| CCO data properties | 1 |
| tagteam data properties | 23 |
| tagteam string/annotation properties | 31 |
| **Total entries** | **171** |

---

## Summary

| Category | Count | Action |
|---|---|---|
| **Critical fixes** (CCO duplicates) | 3 properties | @context-only change ✓ applied |
| **Missing additions** (inverses) | 3 properties | @context-only change ✓ applied |
| **Data property typing** | 1 property | `has_text_value` → `@type: "xsd:string"` ✓ applied (v2.2) |
| **Resolved — keep tagteam:** | 8 properties | No @context change; `tagteam.ttl` axioms ✓ delivered |
| **Verified legitimate** (object properties) | 15 properties | No action |
| **Verified legitimate** (classes) | 26 classes | No action |
| **Verified legitimate** (data properties) | 54 properties | No action |
| **Formatting restructure** | 171 entries | All expanded `{@id}` format, section-grouped |
| **tagteam.ttl axioms** | 27 triples | 8 properties formalized ✓ delivered |
| **Total tagteam: entries** | ~90 | |
| **Duplicating CCO** | 3 (3.3%) → 0 | |

**Deliverables:**

1. `tagteam-context-restructured.json` — drop-in replacement for `src/context.json`
2. `tagteam.ttl` — OWL axioms for legitimate `tagteam:` properties
3. This audit document

**CI verification:**

```bash
# No tagteam: IRIs where CCO IRIs should be
grep -n "tagteam:has_input\|tagteam:has_output\|tagteam:prescribed_by" src/context.json
# expect: 0 matches
```

**Remaining open item:** `tagteam:occurs_during` range determination — if range is `xsd:dateTime`, add to DatatypeProperty declarations in `tagteam.ttl`; if range is a TemporalRegion IRI, add as ObjectProperty with `skos:scopeNote` documenting distinction from `occupies_temporal_region`.
