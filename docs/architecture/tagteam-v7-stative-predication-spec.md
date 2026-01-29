# TagTeam v7 Specification: Stative Predication and Complex Designator Handling

**Version**: 7.0.0-draft  
**Status**: Draft Specification  
**Authors**: Aaron, Claude  
**Date**: 2026-01-29  
**Changelog**: v7.0 introduces Sentence Mode Classification, StructuralAssertion ICE type, ComplexDesignator ICE type, and Greedy NER for multi-word proper names.

---

## Executive Summary

TagTeam v6 is optimized for **eventive predication**—extracting Subject-Verb-Object structures where an agent performs an intentional act. This works well for sentences like "The CEO signed the contract" but produces ontologically incorrect output for **stative predication**—sentences where entities stand in structural relations without any act being performed.

**The Problem**: When processing "The group includes the International Association of Marble...", TagTeam v6:
1. Creates an `IntentionalAct` called "Act of include" (category error: including is not an act)
2. Fragments the organization name into multiple entities (parsing failure)
3. Misidentifies "AIDS" as a verb (POS tagging failure)
4. Treats "Settlement" and "Development" as processes rather than name components

**The Solution**: TagTeam v7 introduces:
1. **Sentence Mode Classifier** ("Traffic Cop"): Routes sentences to appropriate parsing strategies
2. **StructuralAssertion**: New ICE type for stative relations (no agent, no act)
3. **ComplexDesignator**: New ICE type for multi-word proper names
4. **Greedy NER**: Aggressive conjunction-joining for capitalized sequences

**Impact**: These changes preserve TagTeam's narrative extraction capabilities while correctly handling structural/list sentences that previously produced garbage output.

---

## 1. Ontological Foundation

### 1.1 The Eventive/Stative Distinction in BFO

Per Basic Formal Ontology, the world divides into:

| Category | BFO Type | Temporal Character | Example Predicates |
|----------|----------|-------------------|-------------------|
| **Occurrents** | `bfo:Process` | Have temporal parts (unfold in time) | run, sign, create, destroy |
| **Continuants** | `bfo:Continuant` | Persist through time (no temporal parts) | exist, be located, have, include |

**Eventive predication** describes occurrents:
> "The CEO **signed** the contract" → A Process occurred

**Stative predication** describes continuant relations:
> "The group **includes** five members" → A relation obtains

### 1.2 The Category Error in TagTeam v6

TagTeam v6 forces all main verbs into the `IntentionalAct` template:

```
❌ WRONG (TagTeam v6):
:act_001 a cco:IntentionalAct ;
    rdfs:label "Act of include" ;
    cco:has_agent :the_group ;
    cco:has_object :members .
```

This commits a **category error**: groups don't *perform* inclusion; they *have* members as a structural fact. There is no agent, no intention, no temporal unfolding.

### 1.3 The Correct Representation

```
✅ CORRECT (TagTeam v7):
:assertion_001 a tagteam:StructuralAssertion ;
    tagteam:assertsRelation cco:has_member ;
    tagteam:hasSubject :the_group ;
    tagteam:hasObject :member_1 .
```

Or, for direct graph output:
```
:the_group cco:has_member :member_1, :member_2, :member_3 .
```

---

## 2. New Ontological Classes

### 2.1 StructuralAssertion

Following the Ontological Definition Style Guide v3.1:

```turtle
tagteam:StructuralAssertion
    a owl:Class ;
    rdfs:subClassOf cco:DescriptiveInformationContentEntity ;
    rdfs:label "Structural Assertion"@en ;
    skos:definition """An information content entity that is about a structural 
        relation between continuants as introduced in discourse, and which 
        denotes the obtaining of that relation as a stative fact rather than 
        as the result of an occurrent."""@en ;
    rdfs:comment """StructuralAssertions are distinguished from VerbPhrases 
        denoting IntentionalActs in that they do not imply an agent performing 
        an action. 'The committee includes five members' asserts a structural 
        relation (membership) without implying an act of including.
        
        ONTOLOGICAL GROUNDING:
        The relation denoted by a StructuralAssertion obtains timelessly 
        relative to the discourse context. There is no beginning, middle, or 
        end to the relation's obtaining—it is not a Process with temporal parts.
        
        TRIGGERED BY:
        Stative verbs: include, consist of, comprise, contain, be composed of,
        have (possessive), belong to, represent (role sense).
        
        OUTPUT SEMANTICS:
        StructuralAssertions produce direct relation triples rather than 
        IntentionalAct nodes. The subject and objects are DiscourseReferents 
        or ComplexDesignators; there is no agent role.
        
        IEE INTEGRATION:
        StructuralAssertions are evaluated differently than IntentionalActs.
        IEE evaluates the VALUE-ALIGNMENT of the relation (is membership good?)
        rather than the NORMATIVE STATUS of an act (was the act permissible?).
        This resolves the long-standing issue where 'being a member' was treated 
        as a 'choice' requiring deontic evaluation.
        
        DENOTATION:
        The StructuralAssertion denotes that a relation (e.g., cco:has_member) 
        obtains between the subject and object(s). Denotation is constrained by 
        discourse context and may fail (fiction, hypotheticals, failed reference).
        """@en ;
    skos:example """'The International Association includes the Marble Polishers 
        Union' produces a StructuralAssertion that denotes a membership relation.
        
        Output:
        :sa_001 a tagteam:StructuralAssertion ;
            tagteam:assertsRelation cco:has_member ;
            tagteam:hasSubject :dr_001 ;  # The International Association
            tagteam:hasObject :cd_001 .   # Marble Polishers Union
        """@en .
```

**Style Guide v3.1 Checklist:**
- ✅ Genus: "information content entity" (via DescriptiveICE)
- ✅ Aboutness: "about a structural relation between continuants"
- ✅ Discourse-mediation: "as introduced in discourse"
- ✅ Differentia: "denotes obtaining as stative fact rather than occurrent result"
- ✅ Grounding: "obtains timelessly relative to discourse context"
- ✅ No circularity: term does not appear in definition
- ✅ Constrained denotation acknowledged

### 2.2 ComplexDesignator

```turtle
tagteam:ComplexDesignator
    a owl:Class ;
    rdfs:subClassOf cco:DesignativeInformationContentEntity ;
    rdfs:label "Complex Designator"@en ;
    skos:definition """An information content entity that is about a particular 
        as introduced in discourse through a multi-word proper name, and which 
        denotes that particular as a unified referent despite internal syntactic 
        complexity."""@en ;
    rdfs:comment """ComplexDesignators handle cases where organization names, 
        titles, or other proper names contain words that would otherwise trigger 
        incorrect parsing (conjunctions, prepositions, apparent verbs, 
        nominalized processes).
        
        PROBLEM ADDRESSED:
        'International Association of Marble, Slate and Stone Polishers, 
        Rubbers and Sawyers' is ONE organization, not multiple entities 
        joined by 'and'. Standard NER fragments this into garbage.
        
        DETECTION HEURISTIC:
        Capitalized word sequences where connectors ('and', 'of', 'for') join 
        capitalized words, terminated by lowercase non-stopword, verb (high 
        confidence only), or sentence boundary.
        
        INTERNAL STRUCTURE:
        ComplexDesignators preserve their internal component structure for:
        - Citation reconstruction (preserve original punctuation)
        - Abbreviation matching ('ICSID' ↔ 'International Centre for...')
        - Hierarchical organization detection ('Department of X, Agency of Y')
        
        OERS INTEGRATION:
        OERS resolves ComplexDesignators as whole units, not word-by-word.
        The fullName property is compared using organization name normalizers
        with abbreviation expansion support.
        
        MORPHOLOGICAL OVERRIDE:
        Words inside ComplexDesignators that would otherwise be typed as 
        Processes (due to -tion/-ment suffixes) are treated as name components.
        'Settlement' in 'Centre for Settlement of Investment Disputes' is part 
        of the organization's name, not a Process.
        """@en ;
    skos:example """'Centre for Settlement of Investment Disputes' produces:
        
        :cd_001 a tagteam:ComplexDesignator ;
            tagteam:fullName "Centre for Settlement of Investment Disputes" ;
            tagteam:nameComponents ("Centre" "for" "Settlement" "of" 
                                    "Investment" "Disputes") ;
            tagteam:denotedType cco:Organization ;
            tagteam:abbreviation "ICSID" .  # If detected
        """@en .
```

**Style Guide v3.1 Checklist:**
- ✅ Genus: "information content entity" (via DesignativeICE)
- ✅ Aboutness: "about a particular"
- ✅ Discourse-mediation: "as introduced in discourse through a multi-word proper name"
- ✅ Differentia: "denotes as unified referent despite internal syntactic complexity"
- ✅ No circularity
- ✅ Practical guidance in rdfs:comment

### 2.3 Properties for New Classes

```turtle
# StructuralAssertion properties
tagteam:assertsRelation
    a owl:ObjectProperty ;
    rdfs:domain tagteam:StructuralAssertion ;
    rdfs:range rdf:Property ;
    rdfs:label "asserts relation"@en ;
    skos:definition """The relation that the StructuralAssertion claims to 
        obtain between subject and object(s)."""@en .

tagteam:hasSubject
    a owl:ObjectProperty ;
    rdfs:domain tagteam:StructuralAssertion ;
    rdfs:range tagteam:DiscourseReferent ;
    rdfs:label "has subject"@en ;
    skos:definition """The discourse referent that serves as the subject 
        of the asserted relation."""@en .

tagteam:hasObject
    a owl:ObjectProperty ;
    rdfs:domain tagteam:StructuralAssertion ;
    rdfs:range tagteam:DiscourseReferent ;
    rdfs:label "has object"@en ;
    skos:definition """A discourse referent that serves as an object 
        of the asserted relation. May have multiple values for list structures."""@en .

# ComplexDesignator properties
tagteam:fullName
    a owl:DatatypeProperty ;
    rdfs:domain tagteam:ComplexDesignator ;
    rdfs:range xsd:string ;
    rdfs:label "full name"@en ;
    skos:definition """The complete multi-word proper name as it appears 
        in discourse, preserving original punctuation and spacing."""@en .

tagteam:nameComponents
    a owl:ObjectProperty ;
    rdfs:domain tagteam:ComplexDesignator ;
    rdfs:range rdf:List ;
    rdfs:label "name components"@en ;
    skos:definition """An ordered list of the individual tokens comprising 
        the complex designator, preserving punctuation as separate elements 
        for citation reconstruction."""@en .

tagteam:denotedType
    a owl:ObjectProperty ;
    rdfs:domain tagteam:ComplexDesignator ;
    rdfs:range owl:Class ;
    rdfs:label "denoted type"@en ;
    skos:definition """The BFO/CCO type of the particular that this 
        ComplexDesignator denotes (e.g., cco:Organization, cco:Person)."""@en .

tagteam:abbreviation
    a owl:DatatypeProperty ;
    rdfs:domain tagteam:ComplexDesignator ;
    rdfs:range xsd:string ;
    rdfs:label "abbreviation"@en ;
    skos:definition """A known abbreviation or acronym for this 
        ComplexDesignator, if detected in context or known from reference data."""@en .
```

---

## 3. Sentence Mode Classifier ("Traffic Cop")

### 3.1 Overview

The Sentence Mode Classifier runs **before** main parsing to determine which parsing strategy to apply.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SENTENCE MODE CLASSIFIER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INPUT: Raw sentence                                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 1: Extract main verb (lemmatized)                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│                          ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 2: Classify verb against verb taxonomy                         │   │
│  │                                                                      │   │
│  │   STATIVE_DEFINITE     → STRUCTURAL_MODE                            │   │
│  │   STATIVE_AMBIGUOUS    → Context-dependent routing                  │   │
│  │   EVENTIVE             → Check object complexity                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│                          ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 3: Check object phrase complexity                              │   │
│  │                                                                      │   │
│  │   HIGH_COMPLEXITY detected?                                         │   │
│  │     YES + STATIVE    → STRUCTURAL_MODE                              │   │
│  │     YES + EVENTIVE   → NARRATIVE_MODE + GREEDY_NER                  │   │
│  │     NO               → NARRATIVE_MODE (default TagTeam v6)          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│                          ▼                                                  │
│  OUTPUT: {mode, ner_strategy, output_type}                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Verb Taxonomy

```yaml
verb_taxonomy:
  
  stative_definite:
    # These verbs ALWAYS trigger STRUCTURAL_MODE
    description: "Verbs that never describe events, only states/relations"
    members:
      membership:
        verbs: [include, contain, comprise, consist, encompass]
        relation_output: cco:has_member
        inverse: cco:member_of
      
      composition:
        verbs: [be composed of, be made up of, be formed of, be constituted by]
        relation_output: cco:has_part
        inverse: cco:part_of
      
      possession:
        verbs: [have, possess, own, hold]
        condition: "possessive sense, not 'have to' (modal)"
        relation_output: cco:has_possession
      
      location:
        verbs: [be located, reside, sit, lie, stand]
        condition: "stative sense only"
        relation_output: cco:located_in
      
      attribution:
        verbs: [be, seem, appear, remain, become]
        condition: "copular use"
        relation_output: rdf:type  # or quality attribution
  
  stative_ambiguous:
    # These verbs require context to determine mode
    description: "Verbs that may be stative or eventive depending on context"
    members:
      represent:
        stative_condition: "Object is Nation/Organization/Institution"
        stative_example: "The Ambassador represents the United States"
        stative_output: "Role assertion (Person bears Role relative to Org)"
        eventive_condition: "Object is abstract (interests, views, position)"
        eventive_example: "She represents my interests in the negotiation"
        eventive_output: "IntentionalAct of representation"
        disambiguation_rule: |
          IF object.denotedType IN [cco:Nation, cco:Organization, cco:GeopoliticalEntity]
            THEN STRUCTURAL_MODE (Role assertion)
          ELSE NARRATIVE_MODE (IntentionalAct)
      
      support:
        stative_condition: "Architectural/structural sense"
        stative_example: "The beam supports the roof"
        eventive_condition: "Aid/assistance sense"
        eventive_example: "The charity supports refugees"
        disambiguation_rule: |
          IF subject.denotedType IN [cco:Artifact, cco:Structure]
            THEN STRUCTURAL_MODE
          ELSE NARRATIVE_MODE
      
      cover:
        stative_condition: "Spatial extent sense"
        stative_example: "The forest covers 500 acres"
        eventive_condition: "Protection/concealment sense"
        eventive_example: "The tarp covers the equipment"
        disambiguation_rule: |
          IF object is Measurement/Area
            THEN STRUCTURAL_MODE
          ELSE context-dependent
  
  eventive:
    # Default: all other verbs
    description: "Verbs that describe events/processes"
    handling: "NARRATIVE_MODE (standard TagTeam v6)"
    examples: [sign, create, destroy, run, speak, decide, attack, build]
```

### 3.3 Object Complexity Detection

```yaml
complexity_detection:
  
  high_complexity_indicators:
    capitalized_density:
      description: "Ratio of capitalized words to total words in object phrase"
      threshold: 0.6  # 60% or more capitalized
      
    multi_entity_connectors:
      description: "Multiple 'and/or' joining capitalized sequences"
      pattern: "[CAP+] (and|or) [CAP+] (and|or) [CAP+]"
      
    nested_prepositions:
      description: "Prepositional phrases with capitalized heads"
      pattern: "[CAP+] (of|for|on) [CAP+] (of|for|on) [CAP+]"
      
    list_structure:
      description: "Comma-separated items with terminal 'and'"
      pattern: "[ITEM], [ITEM], and [ITEM]"
      where_item: "Capitalized phrase"
  
  complexity_score:
    formula: |
      score = (capitalized_density * 0.3) +
              (connector_count * 0.2) +
              (nesting_depth * 0.2) +
              (list_items * 0.3)
    high_threshold: 0.5
```

### 3.4 Mode Output Specification

```yaml
mode_outputs:
  
  STRUCTURAL_MODE:
    output_type: StructuralAssertion
    ner_strategy: GREEDY
    act_generation: DISABLED
    relation_extraction: ENABLED
    agent_role: NOT_APPLICABLE
    
  NARRATIVE_MODE:
    output_type: IntentionalAct
    ner_strategy: STANDARD  # or GREEDY if high complexity
    act_generation: ENABLED
    relation_extraction: DISABLED (acts have participants, not relations)
    agent_role: REQUIRED
    
  NARRATIVE_MODE_GREEDY:
    output_type: IntentionalAct
    ner_strategy: GREEDY
    act_generation: ENABLED
    relation_extraction: DISABLED
    agent_role: REQUIRED
    note: "Used when verb is eventive but objects are complex (proper names)"
```

---

## 4. Greedy NER (Complex Designator Detection)

### 4.1 Core Principle

Standard NER splits on conjunctions. Greedy NER **joins** on conjunctions when inside proper names.

```
STANDARD NER:
  "Marble, Slate and Stone Polishers" 
    → ["Marble", "Slate", "Stone Polishers"]  ❌ WRONG

GREEDY NER:
  "Marble, Slate and Stone Polishers"
    → ["Marble, Slate and Stone Polishers"]   ✅ CORRECT
```

### 4.2 Boundary Detection Rules

```yaml
complex_designator_boundaries:
  
  start_boundary:
    triggers:
      - sentence_start
      - after_lowercase_content_word: true
      - after_determiner: [the, a, an, this, that, these, those]
      - after_preposition_object: true  # "visited the [Centre...]"
      - after_list_comma: true  # In list context
    
  end_boundary:
    triggers:
      - sentence_end
      - before_lowercase_content_word: true
      - before_high_confidence_verb: true  # See 4.3
      - before_clause_boundary: [",", ";", ":", "—"]
        condition: "if followed by lowercase or verb"
      - before_coordinating_conjunction:
        condition: "if joining sentences, not phrases"
        example: "'...Disputes, and the President visited' → break before 'and'"
  
  internal_connector_rules:
    
    "and":
      default: JOIN
      rule: "If next word is capitalized, join"
      exception: "Break if followed by [article + lowercase] indicating new clause"
      examples:
        join: "Marble, Slate and Stone" → ONE entity
        break: "Stone Polishers and the union representatives" → TWO entities
    
    "or":
      default: JOIN
      rule: "Same as 'and'"
    
    "of":
      default: ALWAYS_JOIN
      rule: "Almost always part of name"
      example: "Centre for Settlement of Investment Disputes" → ONE
    
    "for":
      default: JOIN
      rule: "If followed by capitalized word"
      example: "Association for Computing Machinery" → ONE
    
    ",":
      default: CONTEXT_DEPENDENT
      rule: |
        Inside name: JOIN (preserve for reconstruction)
        List separator: SPLIT into multiple ComplexDesignators
      detection: |
        If comma followed by capitalized and later "and [Capitalized]" 
          → List of ComplexDesignators
        If comma followed by capitalized within continuous cap sequence
          → Part of single ComplexDesignator
```

### 4.3 Verb Detection Inside Capitalized Sequences

**Critical refinement**: POS taggers often fail inside proper names. We need conservative verb detection.

```yaml
verb_inside_capitalized_sequence:
  
  principle: |
    Inside a capitalized sequence (potential ComplexDesignator), we are 
    HIGHLY SKEPTICAL of verb interpretations. A word is only a verb if it
    meets strict criteria.
  
  high_confidence_verbs:
    # These are verbs even inside capitalized sequences
    auxiliaries: [is, are, was, were, be, been, being]
    clear_action_verbs: [runs, eats, kills, builds, destroys]
    note: "If these appear mid-name, the name boundary has ended"
  
  never_verb_inside_name:
    # These are NEVER verbs inside capitalized sequences
    organization_suffixes: [Incorporated, Limited, Ltd, Inc, Corp, LLC]
    common_name_words: [International, National, United, Joint, General]
    acronyms: [AIDS, NATO, UNESCO, UNICEF, NASA]
    nominalizations: [Development, Settlement, Investment, Management, Services]
  
  all_caps_rule:
    rule: |
      A word that is ALL CAPS (AIDS, NATO, NASA) is NEVER a verb 
      unless it is sentence-initial AND followed by lowercase object.
    examples:
      noun: "The Program on HIV and AIDS" → AIDS = noun
      noun: "NATO forces deployed" → NATO = noun (sentence-initial but proper noun)
      verb: "AIDS the relief effort" → aids = verb (but flag for review)
  
  resolution_order:
    1. Check never_verb_inside_name list → if match, NOT a verb
    2. Check all_caps_rule → if ALL_CAPS mid-sentence, NOT a verb
    3. Check high_confidence_verbs → if match, IS a verb (end boundary)
    4. Default: NOT a verb (continue ComplexDesignator)
```

### 4.4 Morphological Override (Context-Sensitive Typing)

```yaml
morphological_override:
  
  principle: |
    Words ending in process-like suffixes (-tion, -ment, -ing, -ance) are 
    typed based on CONTEXT, not morphology alone.
  
  process_suffixes:
    - "-tion"
    - "-ment"
    - "-ing"
    - "-ance"
    - "-ence"
    - "-al" (as noun)
  
  context_rules:
    
    inside_complex_designator:
      effect: SUPPRESS_PROCESS_INTERPRETATION
      interpretation: "Part of proper name (name component)"
      rationale: |
        'Settlement' in 'Centre for Settlement of Investment Disputes' 
        is part of the organization's NAME, not a Process being described.
      output: |
        The word becomes a nameComponent of the ComplexDesignator.
        It does NOT generate a Process node.
    
    standalone_head_noun:
      effect: ALLOW_PROCESS_INTERPRETATION
      interpretation: "Nominalized process"
      pattern: "the [NOUN-tion/ment] of [NP]"
      example: "The settlement of the lawsuit took hours" → Process
    
    after_determiner_before_of:
      effect: LIKELY_PROCESS
      pattern: "the [NOUN] of"
      example: "the development of AI" → Process
    
    capitalized_mid_sentence:
      effect: LIKELY_NAME_COMPONENT
      example: "visited the Development Bank" → Part of name
  
  disambiguation_algorithm:
    1. Is word inside a ComplexDesignator? → Name component (not Process)
    2. Is word capitalized mid-sentence? → Likely name component
    3. Does word follow "the" and precede "of"? → Likely Process
    4. Is word standalone and lowercase? → Process
    5. Default: Check broader context
```

---

## 5. Processing Pipeline

### 5.1 Complete Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TAGTEAM v7 PROCESSING PIPELINE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INPUT: Raw sentence                                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STAGE 1: PRE-FILTERING                                              │   │
│  │                                                                      │   │
│  │  • Apply ALL_CAPS → never-verb rule                                 │   │
│  │  • Mark known acronyms (AIDS, NATO, etc.)                           │   │
│  │  • Detect potential ComplexDesignator spans (capitalized sequences) │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│                          ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STAGE 2: SENTENCE MODE CLASSIFICATION                               │   │
│  │                                                                      │   │
│  │  • Extract main verb                                                │   │
│  │  • Classify: STATIVE_DEFINITE / STATIVE_AMBIGUOUS / EVENTIVE       │   │
│  │  • Measure object complexity                                        │   │
│  │  • Output: {mode, ner_strategy}                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│           ┌──────────────┴──────────────┐                                  │
│           │                             │                                  │
│           ▼                             ▼                                  │
│  ┌─────────────────┐          ┌─────────────────────────────────────────┐  │
│  │ STRUCTURAL_MODE │          │ NARRATIVE_MODE                          │  │
│  │                 │          │                                         │  │
│  │ • Greedy NER    │          │ • Standard or Greedy NER (per config)  │  │
│  │ • No agent      │          │ • Agent extraction                     │  │
│  │ • Relation      │          │ • IntentionalAct generation            │  │
│  │   extraction    │          │                                         │  │
│  └────────┬────────┘          └──────────────────┬──────────────────────┘  │
│           │                                      │                         │
│           ▼                                      ▼                         │
│  ┌─────────────────┐          ┌─────────────────────────────────────────┐  │
│  │ STAGE 3a:       │          │ STAGE 3b:                               │  │
│  │ GREEDY NER      │          │ ENTITY EXTRACTION                       │  │
│  │                 │          │                                         │  │
│  │ • Complex       │          │ • DiscourseReferents                   │  │
│  │   Designator    │          │ • ComplexDesignators (if GREEDY)       │  │
│  │   detection     │          │ • Standard entities                    │  │
│  │ • Boundary      │          │                                         │  │
│  │   rules         │          │                                         │  │
│  │ • Morphological │          │                                         │  │
│  │   override      │          │                                         │  │
│  └────────┬────────┘          └──────────────────┬──────────────────────┘  │
│           │                                      │                         │
│           ▼                                      ▼                         │
│  ┌─────────────────┐          ┌─────────────────────────────────────────┐  │
│  │ STAGE 4a:       │          │ STAGE 4b:                               │  │
│  │ STRUCTURAL      │          │ INTENTIONAL ACT                         │  │
│  │ ASSERTION       │          │ GENERATION                              │  │
│  │ GENERATION      │          │                                         │  │
│  │                 │          │ • VerbPhrase extraction                 │  │
│  │ • Subject       │          │ • Agent/Patient/Instrument roles        │  │
│  │ • Relation      │          │ • Temporal/Modal features               │  │
│  │ • Object(s)     │          │                                         │  │
│  └────────┬────────┘          └──────────────────┬──────────────────────┘  │
│           │                                      │                         │
│           └──────────────────┬───────────────────┘                         │
│                              │                                             │
│                              ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STAGE 5: OUTPUT GENERATION                                          │   │
│  │                                                                      │   │
│  │  • DiscourseReferents                                               │   │
│  │  • ComplexDesignators                                               │   │
│  │  • StructuralAssertions OR IntentionalActs                          │   │
│  │  • Provenance metadata                                              │   │
│  │  • Mode flag (for downstream systems)                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  OUTPUT: TagTeam v7 parse result                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Output Schema

```typescript
interface TagTeamV7Output {
  // Metadata
  version: "7.0.0";
  mode_detected: "STRUCTURAL" | "NARRATIVE" | "NARRATIVE_GREEDY";
  source_text: string;
  
  // Discourse Referents (standard entity mentions)
  discourse_referents: DiscourseReferent[];
  
  // Complex Designators (multi-word proper names)
  complex_designators: ComplexDesignator[];
  
  // Output depends on mode
  structural_assertions?: StructuralAssertion[];  // STRUCTURAL mode
  intentional_acts?: IntentionalAct[];            // NARRATIVE mode
  
  // Provenance
  processing_metadata: {
    classifier_confidence: number;
    ner_strategy: "STANDARD" | "GREEDY";
    morphological_overrides: MorphologicalOverride[];
    warnings: string[];
  };
}

interface ComplexDesignator {
  id: string;
  type: "tagteam:ComplexDesignator";
  full_name: string;
  name_components: string[];  // Preserves punctuation
  denoted_type: string;       // e.g., "cco:Organization"
  abbreviation?: string;
  source_span: [number, number];
  denotation_confidence: number;
}

interface StructuralAssertion {
  id: string;
  type: "tagteam:StructuralAssertion";
  asserted_relation: string;  // e.g., "cco:has_member"
  subject: EntityReference;
  objects: EntityReference[];
  actuality_status: "Asserted" | "Questioned" | "Hypothetical";
  source_span: [number, number];
}

interface EntityReference {
  ref_id: string;  // References DiscourseReferent or ComplexDesignator
  ref_type: "DiscourseReferent" | "ComplexDesignator";
  label: string;
}
```

---

## 6. Integration with Downstream Systems

### 6.1 IEE Integration

StructuralAssertions are evaluated differently than IntentionalActs:

```yaml
iee_integration:
  
  intentional_act_handling:
    evaluation_type: "DEONTIC"
    question_asked: "Was this act normatively permissible?"
    relevant_values: [Consent, Autonomy, Beneficence, Non-maleficence]
    output: "normative_status: upheld | violated"
  
  structural_assertion_handling:
    evaluation_type: "AXIOLOGICAL"
    question_asked: "Is this relation/state of affairs value-aligned?"
    relevant_values: [Solidarity, Belonging, Community, Loyalty]
    output: "value_alignment: positive | negative | neutral"
  
  practical_impact:
    problem_solved: |
      Previously, "being a member" was treated as a "choice" requiring 
      deontic evaluation every time. This was philosophically wrong—
      membership is a state, not an act.
    new_behavior: |
      StructuralAssertions about membership are evaluated for VALUE-ALIGNMENT 
      (does this membership promote solidarity?) not ACT-PERMISSIBILITY 
      (was the act of including permissible?).
  
  data_contract_extension:
    # New field in IEE input
    source_type: "StructuralAssertion" | "IntentionalAct"
    
    # Affects routing
    if_structural:
      worldview_evaluation: "axiological"
      skip_deontic_analysis: true
    if_intentional:
      worldview_evaluation: "deontic"
      full_analysis: true
```

### 6.2 OERS Integration

ComplexDesignators require special handling in entity resolution:

```yaml
oers_integration:
  
  complex_designator_handling:
    resolution_unit: "entire_designator"
    comparison_strategy: "organization_name_normalizer"
    
    features:
      - full_name (fuzzy match)
      - abbreviation (exact match)
      - name_components (set overlap)
    
    identity_model:
      ontological_basis:
        type: "varies by denotedType"
        typical: "cco:Organization"
        identity_grounding: "legal_name_continuity"
      
      epistemic_evidence:
        high_weight:
          - property: fullName
            comparator: fuzzy_organization_name
            m_probability: 0.85
            u_probability: 0.02
          - property: abbreviation
            comparator: exact
            m_probability: 0.95
            u_probability: 0.001
        medium_weight:
          - property: nameComponents
            comparator: jaccard_overlap
            m_probability: 0.70
            u_probability: 0.10
  
  tagteam_bridge_update:
    # ComplexDesignator maps to entity candidate
    translation:
      input: ComplexDesignator
      output: EntityCandidate
      type: denotedType
      name: fullName
      confidence: denotationConfidence
    
    # StructuralAssertion does NOT create acts
    structural_assertion_handling:
      create_act: false
      create_relation_triple: true
      subject_resolution: required
      object_resolution: required
```

---

## 7. Test Cases

### 7.1 The "Marble" Test (Gold Standard)

**Test ID**: `edge_case_marble_001`

**Input Text**:
> "Complexly named organizations include the International Association of Marble, Slate and Stone Polishers, Rubbers and Sawyers, Tile and Marble Setters' Helpers and Marble Mosaic and Terrazzo Workers' Helpers, the United States Department of Health and Human Services National Institutes of Health, the Joint United Nations Program on HIV and AIDS, the Organization for Economic Co-operation and Development, and the International Centre for Settlement of Investment Disputes."

**Test Configuration**:
- Expected Mode: `STRUCTURAL_MODE`
- Expected Trigger: "include" (STATIVE_DEFINITE) + High Complexity Object
- Strict Entity Count: 6 (1 subject + 5 objects)
- Forbidden Types: `IntentionalAct`

**Expected Output**:

```json
{
  "test_id": "edge_case_marble_001",
  "version": "7.0.0",
  "mode_detected": "STRUCTURAL",
  
  "discourse_referents": [
    {
      "id": "dr_001",
      "expression": "Complexly named organizations",
      "candidate_type": "cco:Organization",
      "denotation_confidence": 0.9
    }
  ],
  
  "complex_designators": [
    {
      "id": "cd_001",
      "type": "tagteam:ComplexDesignator",
      "full_name": "International Association of Marble, Slate and Stone Polishers, Rubbers and Sawyers, Tile and Marble Setters' Helpers and Marble Mosaic and Terrazzo Workers' Helpers",
      "name_components": ["International", "Association", "of", "Marble", ",", "Slate", "and", "Stone", "Polishers", ",", "Rubbers", "and", "Sawyers", ",", "Tile", "and", "Marble", "Setters'", "Helpers", "and", "Marble", "Mosaic", "and", "Terrazzo", "Workers'", "Helpers"],
      "denoted_type": "cco:Organization",
      "validation_notes": ["Contains 'Rubbers and Sawyers' inside name", "Multiple 'and' connectors correctly joined"],
      "denotation_confidence": 0.85
    },
    {
      "id": "cd_002",
      "type": "tagteam:ComplexDesignator",
      "full_name": "United States Department of Health and Human Services National Institutes of Health",
      "name_components": ["United", "States", "Department", "of", "Health", "and", "Human", "Services", "National", "Institutes", "of", "Health"],
      "denoted_type": "cco:Organization",
      "abbreviation": "HHS NIH",
      "validation_notes": ["Nested Department/Institutes handled correctly"],
      "denotation_confidence": 0.9
    },
    {
      "id": "cd_003",
      "type": "tagteam:ComplexDesignator",
      "full_name": "Joint United Nations Program on HIV and AIDS",
      "name_components": ["Joint", "United", "Nations", "Program", "on", "HIV", "and", "AIDS"],
      "denoted_type": "cco:Organization",
      "abbreviation": "UNAIDS",
      "validation_notes": ["'AIDS' parsed as Noun/Acronym, NOT verb"],
      "denotation_confidence": 0.95
    },
    {
      "id": "cd_004",
      "type": "tagteam:ComplexDesignator",
      "full_name": "Organization for Economic Co-operation and Development",
      "name_components": ["Organization", "for", "Economic", "Co-operation", "and", "Development"],
      "denoted_type": "cco:Organization",
      "abbreviation": "OECD",
      "validation_notes": ["'Development' parsed as part of Name, NOT Process"],
      "denotation_confidence": 0.95
    },
    {
      "id": "cd_005",
      "type": "tagteam:ComplexDesignator",
      "full_name": "International Centre for Settlement of Investment Disputes",
      "name_components": ["International", "Centre", "for", "Settlement", "of", "Investment", "Disputes"],
      "denoted_type": "cco:Organization",
      "abbreviation": "ICSID",
      "validation_notes": ["'Settlement' parsed as part of Name, NOT Process"],
      "denotation_confidence": 0.95
    }
  ],
  
  "structural_assertions": [
    {
      "id": "sa_001",
      "type": "tagteam:StructuralAssertion",
      "asserted_relation": "cco:has_member",
      "subject": {
        "ref_id": "dr_001",
        "ref_type": "DiscourseReferent",
        "label": "Complexly named organizations"
      },
      "objects": [
        {"ref_id": "cd_001", "ref_type": "ComplexDesignator"},
        {"ref_id": "cd_002", "ref_type": "ComplexDesignator"},
        {"ref_id": "cd_003", "ref_type": "ComplexDesignator"},
        {"ref_id": "cd_004", "ref_type": "ComplexDesignator"},
        {"ref_id": "cd_005", "ref_type": "ComplexDesignator"}
      ],
      "actuality_status": "Asserted"
    }
  ],
  
  "intentional_acts": [],
  
  "processing_metadata": {
    "classifier_confidence": 0.98,
    "ner_strategy": "GREEDY",
    "morphological_overrides": [
      {"word": "Settlement", "suppressed_type": "bfo:Process", "actual_type": "nameComponent"},
      {"word": "Development", "suppressed_type": "bfo:Process", "actual_type": "nameComponent"}
    ],
    "all_caps_handled": ["HIV", "AIDS", "OECD", "ICSID"],
    "warnings": []
  },
  
  "test_assertions": {
    "mode_correct": true,
    "entity_count_correct": true,
    "no_intentional_acts": true,
    "aids_not_verb": true,
    "settlement_not_process": true,
    "development_not_process": true,
    "all_organizations_single_entities": true
  }
}
```

### 7.2 The "AIDS" Test

**Test ID**: `edge_case_aids_001`

**Input Text**:
> "The Program on HIV and AIDS supports treatment access."

**Expected**:
- Mode: `NARRATIVE` (verb "supports" is eventive)
- NER Strategy: `GREEDY` (complex subject)
- "AIDS" parsed as noun/acronym, NOT verb
- "The Program on HIV and AIDS" is ONE ComplexDesignator

```json
{
  "test_id": "edge_case_aids_001",
  "mode_detected": "NARRATIVE",
  "ner_strategy": "GREEDY",
  
  "complex_designators": [
    {
      "id": "cd_001",
      "full_name": "The Program on HIV and AIDS",
      "denoted_type": "cco:Organization"
    }
  ],
  
  "intentional_acts": [
    {
      "verb_phrase": {
        "lemma": "support",
        "tense": "present"
      },
      "agent": {"ref_id": "cd_001"},
      "patient": {"expression": "treatment access", "type": "cco:Service"}
    }
  ],
  
  "test_assertions": {
    "aids_is_noun": true,
    "aids_not_verb": true,
    "program_is_single_entity": true
  }
}
```

### 7.3 The "Settlement" Context Test

**Test ID**: `edge_case_settlement_001`

**Input A** (Process):
> "The settlement of the lawsuit took three months."

**Expected**: `settlement` → `bfo:Process`

**Input B** (Name Component):
> "The President visited the Centre for Settlement of Investment Disputes."

**Expected**: `Settlement` → part of ComplexDesignator (cco:Organization)

```json
{
  "test_id": "edge_case_settlement_001",
  
  "input_a": {
    "text": "The settlement of the lawsuit took three months.",
    "expected_type_for_settlement": "bfo:Process",
    "mode": "NARRATIVE"
  },
  
  "input_b": {
    "text": "The President visited the Centre for Settlement of Investment Disputes.",
    "expected_type_for_settlement": "nameComponent",
    "mode": "NARRATIVE",
    "complex_designator": "Centre for Settlement of Investment Disputes"
  }
}
```

### 7.4 The "Represent" Ambiguity Test

**Test ID**: `edge_case_represent_001`

**Input A** (Stative - Role):
> "The Ambassador represents the United States."

**Expected**: `STRUCTURAL_MODE` (Role assertion)

**Input B** (Eventive - Activity):
> "The lawyer represents my interests in the negotiation."

**Expected**: `NARRATIVE_MODE` (IntentionalAct)

```json
{
  "test_id": "edge_case_represent_001",
  
  "input_a": {
    "text": "The Ambassador represents the United States.",
    "expected_mode": "STRUCTURAL",
    "output_type": "StructuralAssertion",
    "relation": "bears_role_relative_to"
  },
  
  "input_b": {
    "text": "The lawyer represents my interests in the negotiation.",
    "expected_mode": "NARRATIVE",
    "output_type": "IntentionalAct",
    "verb": "represent"
  }
}
```

### 7.5 Narrative Preservation Test

**Test ID**: `regression_narrative_001`

**Input Text**:
> "The CEO of Acme Corporation signed the merger agreement with Global Industries."

**Expected**: Standard narrative parsing preserved; only entity recognition improved

```json
{
  "test_id": "regression_narrative_001",
  "mode_detected": "NARRATIVE",
  "ner_strategy": "GREEDY",
  
  "complex_designators": [
    {"full_name": "Acme Corporation", "denoted_type": "cco:Organization"},
    {"full_name": "Global Industries", "denoted_type": "cco:Organization"}
  ],
  
  "intentional_acts": [
    {
      "verb_phrase": {"lemma": "sign", "tense": "past"},
      "agent": {
        "expression": "The CEO of Acme Corporation",
        "candidate_type": "cco:Person",
        "role": "cco:ChiefExecutiveOfficer"
      },
      "patient": {
        "expression": "the merger agreement",
        "candidate_type": "cco:ContractDocument"
      },
      "comitative": {"ref": "cd_002", "label": "Global Industries"}
    }
  ],
  
  "structural_assertions": [],
  
  "test_assertions": {
    "narrative_structure_preserved": true,
    "intentional_act_generated": true,
    "agent_correctly_identified": true,
    "organizations_single_entities": true
  }
}
```

---

## 8. Implementation Checklist

| Phase | Task | Priority | Owner | Status |
|-------|------|----------|-------|--------|
| **1** | Implement verb taxonomy (STATIVE/EVENTIVE classification) | P0 | | ☐ |
| **1** | Implement Sentence Mode Classifier | P0 | | ☐ |
| **1** | Add `StructuralAssertion` class to ontology | P0 | | ☐ |
| **1** | Add `ComplexDesignator` class to ontology | P0 | | ☐ |
| **2** | Implement Greedy NER (boundary detection rules) | P0 | | ☐ |
| **2** | Implement ALL_CAPS → never-verb filter | P0 | | ☐ |
| **2** | Implement context-sensitive morphological override | P0 | | ☐ |
| **3** | Implement ambiguous stative verb disambiguation | P1 | | ☐ |
| **3** | Add StructuralAssertion output generation | P1 | | ☐ |
| **3** | Preserve punctuation in nameComponents | P1 | | ☐ |
| **4** | Update IEE data contract for StructuralAssertion | P1 | | ☐ |
| **4** | Update OERS bridge for ComplexDesignator | P1 | | ☐ |
| **5** | Implement full test suite (Marble, AIDS, Settlement, etc.) | P1 | | ☐ |
| **5** | Regression testing on narrative sentences | P2 | | ☐ |
| **6** | Documentation update | P2 | | ☐ |

---

## 9. Appendix: Relation Mapping for Stative Verbs

| Stative Verb | Output Relation | Inverse | Notes |
|--------------|-----------------|---------|-------|
| include | `cco:has_member` | `cco:member_of` | |
| contain | `cco:has_part` | `cco:part_of` | Spatial containment |
| comprise | `cco:has_part` | `cco:part_of` | |
| consist of | `cco:has_part` | `cco:part_of` | |
| have (possessive) | `cco:has_possession` | `cco:possessed_by` | |
| belong to | `cco:member_of` | `cco:has_member` | Inverse direction |
| be located in | `cco:located_in` | `cco:location_of` | |
| represent (role) | `tagteam:bears_role_for` | | New relation needed |

---

## 10. Appendix: Changelog

### v7.0.0-draft (2026-01-29)
- Introduced Sentence Mode Classification ("Traffic Cop")
- Added `StructuralAssertion` ICE type for stative predication
- Added `ComplexDesignator` ICE type for multi-word proper names
- Implemented Greedy NER with boundary detection rules
- Added ALL_CAPS → never-verb filter
- Added context-sensitive morphological override
- Added ambiguous stative verb handling ("represent")
- Documented IEE integration changes
- Documented OERS integration changes
- Created comprehensive test suite including "Marble" gold standard

---

**End of Specification**

*This specification addresses the "Marble Disaster" and related edge cases while preserving TagTeam's narrative extraction capabilities. The ontological grounding follows BFO/CCO principles and aligns with the Ontological Definition Style Guide v3.1.*
