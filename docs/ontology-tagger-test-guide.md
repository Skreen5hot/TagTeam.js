# OntologyTextTagger Test Guide

**From:** Aaron, Technical Lead / Semantic Architect  
**To:** Dev Team  
**Date:** March 5, 2026  
**Version:** 1.0  
**Re:** Complete test specification for OntologyTextTagger integration with buildGraph()

---

## Purpose

This document defines the test ontology, match priority rules, annotation schema, and full test matrix for validating the OntologyTextTagger and its integration with `buildGraph()`. Read the entire document before writing any code. The test matrix includes corrections to three expected outputs from the draft version.

---

## Part 1: Test Ontology (TTL)

This is the corrected ontology. Three issues from the draft have been fixed: the duplicate `ex:Child` declaration is removed, the stray apostrophe on `ex:Kid` notation is documented as intentional, and `ex:DepartmentOfHomelandSecurity` is properly typed.

```turtle
@prefix : <https://example.org/ontology/> .
@prefix ex: <https://example.org/ontology/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix dcterms: <http://purl.org/dc/terms/> .

<https://example.org/ontology/tagteamTestOntology> rdf:type owl:Ontology ;
    owl:versionIRI <https://example.org/ontology/2026-03-05/tagteamTestOntology> ;
    dcterms:contributor "DHS AI Team"@en ;
    dcterms:description "Test ontology for validating OntologyTextTagger matching. Contains classes, properties, and individuals covering exact match, alias, lemma, possessive, irregular inflection, verb inflection, hidden/typo, and multi-token scenarios."@en .

# ═══════════════════════════════════════════════════════════════
# CLASSES
# ═══════════════════════════════════════════════════════════════

# --- Basic classes (exact + lemma match targets) ---

ex:Agent rdf:type owl:Class ;
    rdfs:label "Agent"@en ;
    rdfs:comment "Persons acting on behalf of an organization."@en .

ex:Operative rdf:type owl:Class ;
    skos:prefLabel "Operative"@en ;
    rdfs:comment "Individuals performing covert operations."@en .

# --- Irregular inflection targets ---

ex:Child rdf:type owl:Class ;
    skos:altLabel "Children"@en ;
    rdfs:comment "A young person."@en .

ex:Kid rdf:type owl:Class ;
    skos:notation "Kid'"@en ;
    rdfs:comment "Informal term for a child. NOTE: Notation value includes trailing apostrophe to test that the tagger normalizes ontology-side possessive markers."@en .

ex:Criterion rdf:type owl:Class ;
    rdfs:label "Criteria"@en ;
    rdfs:comment "A standard or principle by which something is judged. NOTE: Label uses the irregular plural form."@en .

ex:Phenomenon rdf:type owl:Class ;
    skos:prefLabel "Phenomena"@en ;
    rdfs:comment "An observable event. NOTE: prefLabel uses the irregular plural form."@en .

# --- Verb inflection targets ---

ex:RunningAct rdf:type owl:Class ;
    rdfs:label "Running"@en ;
    rdfs:comment "The act of moving swiftly on foot."@en .

ex:SwimmingAct rdf:type owl:Class ;
    skos:prefLabel "Swimming"@en ;
    rdfs:comment "The act of moving through water."@en .

# --- Standard lemma targets ---

ex:Dog rdf:type owl:Class ;
    rdfs:label "Dog"@en ;
    rdfs:comment "Domesticated canine animal."@en .

ex:Wolf rdf:type owl:Class ;
    skos:prefLabel "Wolf"@en ;
    rdfs:comment "Wild canine animal."@en .

# --- Multi-token / hyphenated targets ---

ex:Radio rdf:type owl:Class ;
    rdfs:label "Radio"@en ;
    rdfs:comment "A device for receiving or transmitting radio signals."@en .

ex:WalkieTalkie rdf:type owl:Class ;
    skos:prefLabel "Walkie-Talkie"@en ;
    rdfs:comment "A portable two-way radio transceiver."@en .

# --- Government agency class (for proper individual typing) ---

ex:GovernmentAgency rdf:type owl:Class ;
    rdfs:label "Government Agency"@en ;
    rdfs:comment "A government organization."@en .

# ═══════════════════════════════════════════════════════════════
# INDIVIDUALS
# ═══════════════════════════════════════════════════════════════

ex:DepartmentOfHomelandSecurity rdf:type owl:NamedIndividual , ex:GovernmentAgency ;
    rdfs:label "Department of Homeland Security"@en ;
    skos:altLabel "DHS"@en ;
    skos:prefLabel "U.S. Homeland Security Department"@en ;
    skos:notation "HS-DEP"@en ;
    skos:hiddenLabel "Homland Security"@en ;
    skos:hiddenLabel "Dept of Homeland Securty"@en ;
    rdfs:comment "A federal agency responsible for public security."@en .

ex:Smith_001 rdf:type owl:NamedIndividual ;
    rdfs:label "Smith"@en ;
    rdfs:comment "Possessive test form for Smith's."@en .

ex:Jones_001 rdf:type owl:NamedIndividual ;
    skos:prefLabel "Jones"@en ;
    rdfs:comment "Possessive test form for Jones'."@en .
```

**Changes from draft TTL:**

| Issue | Fix |
|---|---|
| Duplicate `ex:Child` declaration | Removed second declaration with wrong rdfs:comment |
| `ex:DepartmentOfHomelandSecurity` self-typed | Now typed as `ex:GovernmentAgency` (class declared) |
| `ex:Kid` notation apostrophe | Kept intentionally; rdfs:comment now documents the purpose |
| `ex:Act` / `ex:SwimAct` class names | Renamed to `ex:RunningAct` / `ex:SwimmingAct` for clarity (the old names collided with BFO/CCO `Act` terminology) |
| Ontology version IRI | Updated to `2026-03-05` |

---

## Part 2: Match Priority Chain

The tagger must attempt matches in this order. The first match wins for a given label/property pair. All matches above confidence threshold are returned — there is no "first match only" across different ontology classes.

```
Priority 1: Exact case-insensitive match on rdfs:label
Priority 2: Exact case-insensitive match on skos:prefLabel
Priority 3: Exact case-insensitive match on skos:altLabel
Priority 4: Exact case-insensitive match on skos:notation
Priority 5: Exact case-insensitive match on skos:hiddenLabel
Priority 6: Lemma/inflection match against all of the above (in same order)
Priority 7: Hidden/typo match (fuzzy, skos:hiddenLabel only)
```

**Why this matters:** An input like "Running" is an exact match on `rdfs:label` of `ex:RunningAct`. It should produce `matchType: "exact"`, not `matchType: "lemma"`. Lemma matching only fires when exact matching fails. This distinction is critical for consumers evaluating match trustworthiness.

---

## Part 3: Annotation Schema

Each `ontologyMatch` entry on a Tier 2 node uses this structure. All fields are required on every match entry.

```json
{
  "ontologyMatchIRI": "https://example.org/ontology/Agent",
  "ontologyMatchConfidence": 0.92,
  "ontologyMatchEvidence": "agents",
  "ontologyMatchLabel": "Agent",
  "ontologyMatchType": "lemma",
  "ontologyMatchForm": "agents",
  "ontologyMatchInflection": "plural→singular"
}
```

| Field | Type | Description |
|---|---|---|
| `ontologyMatchIRI` | IRI (`@type: "@id"`) | The ontology class or individual IRI that matched |
| `ontologyMatchConfidence` | decimal (0.0–1.0) | Confidence of the match |
| `ontologyMatchEvidence` | string | The specific text token or span that triggered the match |
| `ontologyMatchLabel` | string | The human-readable label of the matched ontology class |
| `ontologyMatchType` | string | How the match was made (see vocabulary below) |
| `ontologyMatchForm` | string | The original input form before any normalization |
| `ontologyMatchInflection` | string or null | The normalization chain applied (null if exact match) |

**matchType vocabulary:**

| Value | Meaning |
|---|---|
| `exact` | Direct case-insensitive match on rdfs:label or skos:prefLabel |
| `alias` | Match on skos:altLabel or skos:notation |
| `lemma` | Match after morphological normalization (plural stripping, verb base form, etc.) |
| `hidden` | Match on skos:hiddenLabel (typo/variant catch) |

**inflection chain notation:**

Operations are listed left-to-right in the order applied, separated by `→`. Vocabulary:

| Token | Meaning |
|---|---|
| `plural→singular` | Regular plural stripped (agents → agent) |
| `possessive→base` | Possessive marker stripped (Smith's → Smith) |
| `irregular` | Irregular inflection resolved (children → child, criteria → criterion) |
| `verb→base` | Verbal inflection stripped (runs → run, swimming → swim) |
| `case→lower` | Case normalization (implicit, not typically listed unless it's the only operation) |

Example chains: `possessive→base`, `plural→singular`, `possessive→base→irregular`, `verb→base`

---

## Part 4: @context and TTL Declarations

These properties must be added to support the annotation schema.

**JSONLDSerializer.js @context additions:**

```javascript
// ── Ontology matching ──────────────────────────────────
ontologyMatch:           { '@id': 'tagteam:ontologyMatch',           '@container': '@set' },
ontologyMatchIRI:      { '@id': 'tagteam:ontologyMatchIRI',      '@type': '@id' },
ontologyMatchConfidence: { '@id': 'tagteam:ontologyMatchConfidence', '@type': 'xsd:decimal' },
ontologyMatchEvidence:   { '@id': 'tagteam:ontologyMatchEvidence' },
ontologyMatchLabel:      { '@id': 'tagteam:ontologyMatchLabel' },
ontologyMatchType:       { '@id': 'tagteam:ontologyMatchType' },
ontologyMatchForm:       { '@id': 'tagteam:ontologyMatchForm' },
ontologyMatchInflection: { '@id': 'tagteam:ontologyMatchInflection' },
```

**tagteam-v3.ttl declarations:**

```turtle
# ═══════ ONTOLOGY MATCH ANNOTATION PROPERTIES ═══════

tagteam:ontologyMatch rdf:type owl:AnnotationProperty ;
    rdfs:label "ontology match"@en ;
    skos:definition "An annotation linking a Tier 2 entity node to externally-matched ontology class metadata."@en .

tagteam:ontologyMatchIRI rdf:type owl:AnnotationProperty ;
    rdfs:label "ontology match class"@en ;
    skos:definition "The IRI of the ontology class matched to this entity."@en .

tagteam:ontologyMatchConfidence rdf:type owl:AnnotationProperty ;
    rdfs:label "ontology match confidence"@en ;
    skos:definition "Decimal 0.0–1.0 indicating confidence of the ontology class match."@en .

tagteam:ontologyMatchEvidence rdf:type owl:AnnotationProperty ;
    rdfs:label "ontology match evidence"@en ;
    skos:definition "The text token or span that triggered the ontology class match."@en .

tagteam:ontologyMatchLabel rdf:type owl:AnnotationProperty ;
    rdfs:label "ontology match label"@en ;
    skos:definition "The human-readable label of the matched ontology class."@en .

tagteam:ontologyMatchType rdf:type owl:AnnotationProperty ;
    rdfs:label "ontology match type"@en ;
    skos:definition "How the match was made: exact, alias, lemma, or hidden."@en .

tagteam:ontologyMatchForm rdf:type owl:AnnotationProperty ;
    rdfs:label "ontology match form"@en ;
    skos:definition "The original input form before any normalization."@en .

tagteam:ontologyMatchInflection rdf:type owl:AnnotationProperty ;
    rdfs:label "ontology match inflection"@en ;
    skos:definition "The normalization chain applied to the input to produce the match."@en .
```

Note: All properties are `owl:AnnotationProperty`, not `owl:DatatypeProperty`. This is consistent with the annotate-only design — these are metadata about matches, not ontological assertions.

---

## Part 5: Tagger Unit Test Matrix

These tests run against `OntologyTextTagger.tagText()` directly. Each row is a single test case. The "a" variants test lowercase versions of the same input.

### Section A: Exact Match (rdfs:label, skos:prefLabel)

| ID | Input | Property | Match Strategy | Expected Class | Expected matchType | Expected inflection |
|---|---|---|---|---|---|---|
| TC-01 | "Department of Homeland Security" | rdfs:label | Exact multi-token | `ex:DepartmentOfHomelandSecurity` | exact | null |
| TC-01a | "department of homeland security" | rdfs:label | Exact (lowercase) | `ex:DepartmentOfHomelandSecurity` | exact | null |
| TC-02 | "U.S. Homeland Security Department" | skos:prefLabel | Exact multi-token | `ex:DepartmentOfHomelandSecurity` | exact | null |
| TC-02a | "u.s. homeland security department" | skos:prefLabel | Exact (lowercase) | `ex:DepartmentOfHomelandSecurity` | exact | null |
| TC-19 | "Radio" | rdfs:label | Exact | `ex:Radio` | exact | null |
| TC-19a | "radio" | rdfs:label | Exact (lowercase) | `ex:Radio` | exact | null |
| TC-20 | "Walkie-Talkie" | skos:prefLabel | Exact (hyphenated) | `ex:WalkieTalkie` | exact | null |
| TC-20a | "walkie-talkie" | skos:prefLabel | Exact (lowercase hyphenated) | `ex:WalkieTalkie` | exact | null |

### Section B: Alias Match (skos:altLabel, skos:notation)

| ID | Input | Property | Match Strategy | Expected Class | Expected matchType | Expected inflection |
|---|---|---|---|---|---|---|
| TC-03 | "DHS" | skos:altLabel | Alias (acronym) | `ex:DepartmentOfHomelandSecurity` | alias | null |
| TC-03a | "dhs" | skos:altLabel | Alias (lowercase) | `ex:DepartmentOfHomelandSecurity` | alias | null |
| TC-04 | "HS-DEP" | skos:notation | Alias (notation) | `ex:DepartmentOfHomelandSecurity` | alias | null |
| TC-04a | "hs-dep" | skos:notation | Alias (lowercase) | `ex:DepartmentOfHomelandSecurity` | alias | null |

### Section C: Lemma Match — Regular Plurals

| ID | Input | Normalization | Property | Expected Class | Expected matchType | Expected inflection |
|---|---|---|---|---|---|---|
| TC-05 | "Agents" | agents → agent | rdfs:label ("Agent") | `ex:Agent` | lemma | `plural→singular` |
| TC-05a | "agents" | agents → agent | rdfs:label ("Agent") | `ex:Agent` | lemma | `plural→singular` |
| TC-06 | "Operatives" | operatives → operative | skos:prefLabel ("Operative") | `ex:Operative` | lemma | `plural→singular` |
| TC-06a | "operatives" | operatives → operative | skos:prefLabel ("Operative") | `ex:Operative` | lemma | `plural→singular` |
| TC-15 | "dogs" | dogs → dog | rdfs:label ("Dog") | `ex:Dog` | lemma | `plural→singular` |
| TC-15a | "DOGS" | DOGS → dog | rdfs:label ("Dog") | `ex:Dog` | lemma | `plural→singular` |
| TC-16 | "wolves" | wolves → wolf | skos:prefLabel ("Wolf") | `ex:Wolf` | lemma | `plural→singular` |
| TC-16a | "WOLVES" | WOLVES → wolf | skos:prefLabel ("Wolf") | `ex:Wolf` | lemma | `plural→singular` |

**CORRECTION from draft:** TC-06 expected class was listed as `class:Agent`. This is wrong. "Operatives" lemmatizes to "operative", which matches `ex:Operative` via skos:prefLabel, not `ex:Agent`.

### Section D: Lemma Match — Irregular Plurals

| ID | Input | Normalization | Property | Expected Class | Expected matchType | Expected inflection |
|---|---|---|---|---|---|---|
| TC-11 | "Criteria" | criteria → criterion | rdfs:label ("Criteria") | `ex:Criterion` | exact | null |
| TC-11a | "criteria" | (case only) | rdfs:label ("Criteria") | `ex:Criterion` | exact | null |
| TC-12 | "Phenomena" | phenomena → phenomenon | skos:prefLabel ("Phenomena") | `ex:Phenomenon` | exact | null |
| TC-12a | "phenomena" | (case only) | skos:prefLabel ("Phenomena") | `ex:Phenomenon` | exact | null |

**IMPORTANT NOTE:** TC-11 and TC-12 are actually **exact matches**, not lemma matches. The ontology labels are "Criteria" and "Phenomena" (the plural forms). Input "Criteria" matches "Criteria" exactly. If you want to test irregular lemmatization, you need inputs that do NOT match any label exactly:

| ID | Input | Normalization | Property | Expected Class | Expected matchType | Expected inflection |
|---|---|---|---|---|---|---|
| TC-11b | "Criterion" | criterion (base form, no label match) → lemma scan finds "Criteria" label on `ex:Criterion` | rdfs:label | `ex:Criterion` | lemma | `irregular` |
| TC-12b | "Phenomenon" | phenomenon (base form) → lemma scan finds "Phenomena" on `ex:Phenomenon` | skos:prefLabel | `ex:Phenomenon` | lemma | `irregular` |

This tests the reverse direction: input is the singular, ontology has the plural. The tagger needs to handle both directions of irregular inflection.

### Section E: Lemma Match — Verb Inflection

| ID | Input | Normalization | Property | Expected Class | Expected matchType | Expected inflection |
|---|---|---|---|---|---|---|
| TC-13 | "Running" | (exact match on rdfs:label) | rdfs:label ("Running") | `ex:RunningAct` | exact | null |
| TC-13a | "running" | (case only) | rdfs:label ("Running") | `ex:RunningAct` | exact | null |
| TC-14 | "Swimming" | (exact match on skos:prefLabel) | skos:prefLabel ("Swimming") | `ex:SwimmingAct` | exact | null |
| TC-14a | "swimming" | (case only) | skos:prefLabel ("Swimming") | `ex:SwimmingAct` | exact | null |

**IMPORTANT NOTE:** Like TC-11/12, these are exact matches because the ontology labels use the inflected forms. To test actual verb lemmatization, add:

| ID | Input | Normalization | Property | Expected Class | Expected matchType | Expected inflection |
|---|---|---|---|---|---|---|
| TC-13b | "Runs" | runs → run; "Running" label → run | rdfs:label | `ex:RunningAct` | lemma | `verb→base` |
| TC-13c | "Ran" | ran → run; "Running" label → run | rdfs:label | `ex:RunningAct` | lemma | `verb→base` |
| TC-14b | "Swam" | swam → swim; "Swimming" label → swim | skos:prefLabel | `ex:SwimmingAct` | lemma | `verb→base` |
| TC-14c | "Swims" | swims → swim; "Swimming" label → swim | skos:prefLabel | `ex:SwimmingAct` | lemma | `verb→base` |

**CORRECTION from draft:** TC-14 expected class was listed as `class:Act`. This is wrong. "Swimming" matches `ex:SwimmingAct` (now renamed from `ex:SwimAct`) via skos:prefLabel, not `ex:RunningAct`.

### Section F: Possessive Stripping

| ID | Input | Normalization | Property | Expected Class | Expected matchType | Expected inflection |
|---|---|---|---|---|---|---|
| TC-17 | "Smith's" | Smith's → Smith | rdfs:label ("Smith") | `ex:Smith_001` | exact | `possessive→base` |
| TC-17a | "smith's" | smith's → smith | rdfs:label ("Smith") | `ex:Smith_001` | exact | `possessive→base` |
| TC-18 | "Jones'" | Jones' → Jones | skos:prefLabel ("Jones") | `ex:Jones_001` | exact | `possessive→base` |
| TC-18a | "jones'" | jones' → jones | skos:prefLabel ("Jones") | `ex:Jones_001` | exact | `possessive→base` |

**Design question:** TC-17/18 strip possessives from the input, then match exactly on the base form. Should `matchType` be `"exact"` (because the stripped form matches the label exactly) or `"lemma"` (because normalization was required)? Recommend: `matchType` stays `"exact"` because the ontology label is the base form. The `ontologyMatchInflection` field documents that normalization occurred. This keeps matchType about the ontology-side strategy, while inflection documents the input-side processing.

### Section G: Possessive + Irregular Lemma (compound normalization)

| ID | Input | Normalization | Property | Expected Class | Expected matchType | Expected inflection |
|---|---|---|---|---|---|---|
| TC-07 | "Children's" | Children's → Children → child | skos:altLabel ("Children") | `ex:Child` | alias | `possessive→base` |
| TC-07a | "children's" | children's → children | skos:altLabel ("Children") | `ex:Child` | alias | `possessive→base` |
| TC-08 | "Kids'" | Kids' → Kids → kid | skos:notation ("Kid'") | `ex:Kid` | alias | `possessive→base` |
| TC-08a | "kids'" | kids' → kids → kid | skos:notation ("Kid'") | `ex:Kid` | alias | `possessive→base` |

**CORRECTION from draft:** TC-08 expected class was listed as `class:Child`. This is wrong. "Kids'" → "kid" matches `ex:Kid` via skos:notation, not `ex:Child`.

**NOTE on TC-07:** "Children's" → strip possessive → "Children" → exact match on skos:altLabel "Children" of `ex:Child`. No lemmatization needed because the ontology label is the irregular plural form. This means TC-07 does NOT test irregular lemmatization — it tests possessive stripping + alias match. If you want to test the full chain (possessive + irregular lemma), use an input where the stripped form does not appear as any label, e.g., "Child's" → "Child" which would need to match against "Children" via reverse irregular inflection.

### Section H: Hidden Label / Typo Match

| ID | Input | Property | Expected Class | Expected matchType | Expected inflection |
|---|---|---|---|---|---|
| TC-09 | "Homland Security" | skos:hiddenLabel | `ex:DepartmentOfHomelandSecurity` | hidden | null |
| TC-09a | "homland security" | skos:hiddenLabel | `ex:DepartmentOfHomelandSecurity` | hidden | null |
| TC-10 | "Dept of Homeland Securty" | skos:hiddenLabel | `ex:DepartmentOfHomelandSecurity` | hidden | null |
| TC-10a | "dept of homeland securty" | skos:hiddenLabel | `ex:DepartmentOfHomelandSecurity` | hidden | null |

---

## Part 6: Negative Tests

These verify the tagger does NOT produce false matches. Every test expects zero matches for the given input.

| ID | Input | Why No Match Expected |
|---|---|---|
| TC-N01 | "Xylophone" | Term not in ontology |
| TC-N02 | "ant" | Substring of "Agent" — must NOT match. Token boundary enforcement. |
| TC-N03 | "HS" | Partial acronym — substring of "DHS" and "HS-DEP" but matches neither exactly |
| TC-N04 | "age" | Substring of "Agent" and "agency" — must NOT match |
| TC-N05 | "walk" | Substring of "Walkie-Talkie" — must NOT match |
| TC-N06 | "Depart" | Substring of "Department of Homeland Security" — must NOT match |
| TC-N07 | "Securities" | Lemma "security" is close to "Security" but "Securities" is a different concept (financial). Should NOT match DHS. Tests that lemmatization doesn't create false bridges. |

---

## Part 7: Disambiguation Tests

These verify behavior when an input could match multiple ontology classes. The tagger should return ALL matching classes with individual confidences. The consumer decides.

| ID | Input | Possible Matches | Expected Behavior |
|---|---|---|---|
| TC-D01 | "Agent" | `ex:Agent` (rdfs:label "Agent") | Single match. `ex:Operative` should NOT match — its label is "Operative", not "Agent". |
| TC-D02 | "Children" | `ex:Child` (skos:altLabel "Children") | Single match. `ex:Kid` has notation "Kid'", not "Children". |
| TC-D03 | "Running" | `ex:RunningAct` (rdfs:label "Running") | Single match. Verify no spurious match on `ex:SwimmingAct`. |

If the tagger produces multiple matches for any of these, that's a precision bug worth investigating.

---

## Part 8: Compound Entity Tests

TagTeam collapses coordinated noun phrases into single entity labels. The tagger should independently match each token within the compound label.

| ID | Input Sentence | Expected Entity Label | Expected Matches on Entity |
|---|---|---|---|
| TC-C01 | "The agent and operative assisted." | "agent and operative" | `ex:Agent` (via "agent"), `ex:Operative` (via "operative") — two separate ontologyMatch entries |
| TC-C02 | "The dog and wolf escaped." | "dog and wolf" | `ex:Dog` (via "dog"), `ex:Wolf` (via "wolf") — two separate ontologyMatch entries |
| TC-C03 | "The radio and walkie-talkie failed." | "radio and walkie-talkie" | `ex:Radio` (via "radio"), `ex:WalkieTalkie` (via "walkie-talkie") — two entries |

**NOTE for TC-C03:** "walkie-talkie" within a compound label requires multi-token or hyphenated evidence matching. Verify the enrichment helper handles this.

---

## Part 9: buildGraph() Integration Tests

These run the full pipeline: parse sentence → build graph → enrich with ontology. They verify that `ontologyMatch` annotations land on the correct Tier 2 nodes with the correct structure.

### TC-I01: Basic integration — annotations appear on Tier 2 nodes

```javascript
const ttl = fs.readFileSync('test-ontology.ttl', 'utf8');
const tagger = T.OntologyTextTagger.fromTTL(ttl);
const g = T.buildGraph('The agent arrested the suspect', { ontology: tagger });

const tier2Nodes = g['@graph'].filter(n => n['is_subject_of']);
const matchedNodes = tier2Nodes.filter(n => n['ontologyMatch']);

// "agent" should match ex:Agent
const agentNode = tier2Nodes.find(n =>
  (n['rdfs:label'] || '').toLowerCase() === 'agent');
assert(agentNode && agentNode['ontologyMatch'],
  'Agent Tier 2 node has ontologyMatch');
assert(agentNode['ontologyMatch'][0].ontologyMatchIRI ===
  'https://example.org/ontology/Agent',
  'Agent matches ex:Agent class');
```

### TC-I02: @type is never mutated

```javascript
const ttl = fs.readFileSync('test-ontology.ttl', 'utf8');
const tagger = T.OntologyTextTagger.fromTTL(ttl);
const g = T.buildGraph('The agent arrested the suspect', { ontology: tagger });

const tier2Nodes = g['@graph'].filter(n => n['is_subject_of']);
tier2Nodes.forEach(n => {
  (n['@type'] || []).forEach(t => {
    assert(!t.includes('example.org'),
      'Ontology IRI not in @type: ' + n['rdfs:label'] + ' has ' + t);
  });
});
```

### TC-I03: classNominationStatus resolves on match

```javascript
const ttl = [
  '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
  '@prefix ex: <http://example.org/law#> .',
  'ex:Officer a rdfs:Class ; rdfs:label "Officer" .'
].join('\n');
const tagger = T.OntologyTextTagger.fromTTL(ttl);
const g = T.buildGraph('An officer shall verify documentation', { ontology: tagger });

const officerNode = g['@graph'].find(n =>
  n['is_subject_of'] && (n['rdfs:label'] || '').toLowerCase() === 'officer');
assert(officerNode, 'Officer Tier 2 node exists');
if (officerNode['ontologyMatch']) {
  assert(officerNode['tagteam:classNominationStatus'] === 'resolved',
    'classNominationStatus updated to resolved');
  assert(officerNode['tagteam:requiresOntologyResolution'] === false,
    'requiresOntologyResolution cleared');
}
```

### TC-I04: No ontology option — no annotations, no crash

```javascript
const g = T.buildGraph('The doctor treated the patient');
const anyMatches = g['@graph'].filter(n => n['ontologyMatch']);
assert(anyMatches.length === 0,
  'No ontology option produces no ontologyMatch annotations');
```

### TC-I05: Token boundary enforcement in integration

```javascript
const ttl = [
  '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
  '@prefix ex: <http://example.org/test#> .',
  'ex:Ant a rdfs:Class ; rdfs:label "Ant" .'
].join('\n');
const tagger = T.OntologyTextTagger.fromTTL(ttl);
const g = T.buildGraph('The doctor treated the patient', { ontology: tagger });

const patientNode = g['@graph'].find(n =>
  n['is_subject_of'] && (n['rdfs:label'] || '').toLowerCase().includes('patient'));
assert(!patientNode || !patientNode['ontologyMatch'],
  '"ant" does not substring-match "patient"');
```

### TC-I06: ontologyMatch is transparent — all matches surface regardless of confidence

```javascript
const ttl = fs.readFileSync('test-ontology.ttl', 'utf8');
const tagger = T.OntologyTextTagger.fromTTL(ttl);
const g = T.buildGraph('The agent reviewed the criteria', { ontology: tagger });

// Verify that low AND high confidence matches both appear
const matchedNodes = g['@graph'].filter(n => n['ontologyMatch']);
matchedNodes.forEach(n => {
  n['ontologyMatch'].forEach(m => {
    assert(typeof m.ontologyMatchConfidence === 'number',
      'Every match has numeric confidence');
    assert(typeof m.ontologyMatchType === 'string',
      'Every match has matchType');
    // No filtering — consumer evaluates
  });
});
```

### TC-I07: Annotation structure is complete

```javascript
const ttl = fs.readFileSync('test-ontology.ttl', 'utf8');
const tagger = T.OntologyTextTagger.fromTTL(ttl);
const g = T.buildGraph('The agents inspected the dogs', { ontology: tagger });

const matchedNodes = g['@graph'].filter(n => n['ontologyMatch']);
assert(matchedNodes.length > 0, 'At least one match produced');

matchedNodes.forEach(n => {
  n['ontologyMatch'].forEach(m => {
    assert(m.ontologyMatchIRI, 'Has ontologyMatchIRI (IRI)');
    assert(typeof m.ontologyMatchConfidence === 'number', 'Has ontologyMatchConfidence (number)');
    assert(m.ontologyMatchEvidence, 'Has ontologyMatchEvidence (string)');
    assert(m.ontologyMatchLabel !== undefined, 'Has ontologyMatchLabel');
    assert(m.ontologyMatchType, 'Has ontologyMatchType');
    assert(m.ontologyMatchForm, 'Has ontologyMatchForm');
    // ontologyMatchInflection can be null for exact matches
  });
});
```

---

## Part 10: Test File Organization

```
tests/
  tagger/
    ontology-text-tagger.test.js     ← Part 5 (tagger unit tests, CSV-style)
    test-ontology.ttl                 ← Part 1 (corrected ontology)
    negative-tests.js                 ← Part 6 (negative cases)
    disambiguation-tests.js           ← Part 7
    compound-entity-tests.js          ← Part 8
  bundle/
    core-bundle.test.js               ← Part 9 (integration tests, extends existing)
```

---

## Summary: Corrections from Draft

| Item | Draft Value | Corrected Value | Reason |
|---|---|---|---|
| TC-06 expected class | `class:Agent` | `class:Operative` | "Operatives" → "operative" matches `ex:Operative` prefLabel |
| TC-08 expected class | `class:Child` | `class:Kid` | "Kids'" → "kid" matches `ex:Kid` notation |
| TC-14 expected class | `class:Act` | `class:SwimmingAct` | "Swimming" matches `ex:SwimmingAct` prefLabel |
| TC-11/12 matchType | `lemma` | `exact` | Ontology labels are the plural forms; inputs match exactly |
| TC-13/14 matchType | `lemma` | `exact` | Ontology labels are the inflected forms; inputs match exactly |
| Ontology class names | `ex:Act`, `ex:SwimAct` | `ex:RunningAct`, `ex:SwimmingAct` | Avoids collision with BFO/CCO "Act" terminology |
| DHS individual typing | Self-typed | Typed as `ex:GovernmentAgency` | Proper OWL hygiene |
| Duplicate `ex:Child` | Two declarations | One declaration | Removed redundant second declaration |
