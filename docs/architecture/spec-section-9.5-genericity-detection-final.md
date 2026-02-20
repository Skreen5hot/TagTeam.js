### 9.5 Genericity Detection: Kind-Referring vs. Instance-Referring Expressions

#### 9.5.1 Problem Statement

Natural language conflates references to classes (universals) and instances (particulars)
using identical syntactic structures. "Dogs have fur" asserts a property of the universal
Dog; "The dogs have fleas" asserts a property of specific instances. The pipeline must
distinguish these to produce ontologically correct output — class-level assertions
(`owl:Class` restrictions) vs. instance-level assertions (`owl:NamedIndividual` triples).

Without genericity detection, all entities are modeled as instances. This produces
incorrect BFO output for kind-referring expressions: a bare plural like "Dogs" would
receive an `owl:NamedIndividual` node, which falsely reifies a universal as a particular.

#### 9.5.2 Classification Categories

Every subject NP is classified into exactly one of four categories:

| Category | Abbreviation | Ontological Treatment | Example |
|----------|-------------|----------------------|---------|
| Generic | `GEN` | `owl:Class` restriction (`someValuesFrom`) | "Dogs have fur" |
| Instance | `INST` | `owl:NamedIndividual` assertion | "The dogs have fleas" |
| Universal Quantification | `UNIV` | `owl:Class` restriction (`allValuesFrom`) | "All dogs bark" |
| Ambiguous | `AMB` | Instance + structured uncertainty (§13) | "A dog barked" |

`GEN` and `UNIV` both produce class-level output but are tracked separately because
they carry different logical force. `GEN` admits exceptions ("Dogs have fur" is true
even though hairless breeds exist); `UNIV` does not ("All dogs bark" claims exceptionless
coverage). This distinction matters for downstream reasoning services in the FNSR
ecosystem, particularly the Analogical Precedent Service and the Counterfactual
Simulation Service, which must know whether an assertion tolerates exceptions before
applying it to novel cases.

#### 9.5.3 Detection Heuristic

Genericity classification uses four signals extracted from the dependency tree, checked
in priority order. Each signal is independently readable from existing pipeline output
(POS tags, dependency labels, lexical identity of dependents).

##### Signal 1: Determiner status of subject NP (primary signal)

Check whether the subject token (bearing `nsubj`, `nsubj:pass`, or equivalent) has a
`det` child, and if so, its lexical identity.

```javascript
/**
 * NORMATIVE: Determiner → genericity signal
 * Applied to the subject NP's det child (or absence thereof).
 */
const DET_TO_GENERICITY = {
  // No det child present — see bare noun logic below
  '_BARE_PLURAL':   'GEN',    // "Dogs have fur" — bare plural, strong generic
  '_BARE_MASS':     'GEN',    // "Water boils at 100°C" — bare mass noun
  '_BARE_COUNT':    'AMB',    // "System failed" — bare count noun, likely det-dropped

  // Definite / demonstrative → instance
  'the':            'INST',   // See §9.5.7 for "Institutional The" exception
  'this':           'INST',
  'that':           'INST',
  'these':          'INST',
  'those':          'INST',

  // Indefinite singular → ambiguous (context-dependent)
  'a':              'AMB',    // "A dog is loyal" (GEN) vs "A dog bit me" (INST)
  'an':             'AMB',

  // Universal quantifiers → universal
  'all':            'UNIV',
  'every':          'UNIV',
  'each':           'UNIV',

  // Possessives → instance
  'my':             'INST',
  'your':           'INST',
  'his':            'INST',
  'her':            'INST',
  'its':            'INST',
  'our':            'INST',
  'their':          'INST',

  // Numeric / proportional
  'two':            'INST',
  'three':          'INST',
  'many':           'INST',
  'several':        'INST',
  'some':           'AMB',    // "Some dogs bark" — partitive, ambiguous
  'most':           'AMB',    // "Most dogs bark" — proportional, ambiguous
  'no':             'UNIV',   // "No dogs bark" — universal negation
};
```

**Bare noun classification** requires distinguishing bare plurals from bare mass nouns
from det-dropped count nouns:

- If the subject has POS tag `NNS` or `NNPS` and no `det` child → `_BARE_PLURAL`
- If the subject has POS tag `NN`, no `det` child, and appears in `MASS_NOUNS` list → `_BARE_MASS`
- If the subject has POS tag `NN`, no `det` child, and does NOT appear in `MASS_NOUNS` → `_BARE_COUNT`
- If the subject has POS tag `NNP` and no `det` child → `INST` (proper noun)

The `MASS_NOUNS` list is a short selectional preference list (~50 entries) covering
common mass nouns encountered in the target domain:

```javascript
/**
 * Selectional preference list for mass noun detection.
 * Used to distinguish bare mass nouns ("Water boils") from det-dropped
 * count nouns ("System failed"). Not exhaustive — unlisted bare singulars
 * default to _BARE_COUNT (AMB) rather than _BARE_MASS (GEN).
 *
 * Organized by semantic category for maintainability.
 */
const MASS_NOUNS = new Set([
  // Substances & materials
  'water', 'air', 'gold', 'silver', 'iron', 'steel', 'oil', 'gas',
  'wood', 'plastic', 'glass', 'concrete', 'sand', 'dirt', 'dust',
  'fuel', 'ink', 'paint',

  // Abstract / uncountable
  'information', 'evidence', 'data', 'knowledge', 'intelligence',
  'research', 'feedback', 'advice', 'guidance', 'oversight',
  'legislation', 'policy', 'compliance', 'enforcement',
  'traffic', 'commerce', 'trade', 'cargo', 'contraband',
  'equipment', 'software', 'hardware', 'infrastructure',
  'money', 'currency', 'funding',

  // Natural phenomena
  'weather', 'electricity', 'gravity', 'light', 'heat', 'pressure',
]);
```

This list is deliberately conservative. Unlisted bare singulars default to `_BARE_COUNT`
(mapped to `AMB`), which is safer than misclassifying a det-dropped instance reference
as generic. The list is extensible via gazetteer-style configuration.

##### Signal 2: Tense, aspect, and modality of main predicate (secondary signal)

```javascript
/**
 * NORMATIVE: Tense/aspect/modality → genericity modifier
 * Applied to the main verb (root or head of the subject's governor).
 */
const TENSE_GENERICITY_SIGNAL = {
  'VBP':  'GEN_SUPPORT',     // Simple present plural — "Dogs have..."
  'VBZ':  'GEN_SUPPORT',     // Simple present singular — "A dog has..."
  'VBD':  'INST_SUPPORT',    // Simple past — "Dogs had..."
  'VBG':  'INST_SUPPORT',    // Progressive — "Dogs are having..."
  'VBN':  'INST_SUPPORT',    // Perfective — "Dogs have had..."
  'MD':   'MODAL',           // Modal — requires subclassification (see below)
};
```

**Modal subclassification:** Modals carry different genericity signals depending on
their deontic vs. epistemic character. Deontic modals ("shall", "must", "should") in
normative/legal text signal generic or universal readings ("An employee shall report
violations" → kind-referring). Epistemic modals ("might", "could", "may") are neutral.

```javascript
/**
 * NORMATIVE: Modal → genericity signal
 * Applied when the main verb has an MD auxiliary.
 */
const MODAL_GENERICITY_SIGNAL = {
  // Deontic modals → support generic/universal (normative statements)
  'shall':    'GEN_SUPPORT',
  'must':     'GEN_SUPPORT',
  'should':   'GEN_SUPPORT',

  // Ability/permission → weak generic support
  'can':      'WEAK_GEN_SUPPORT',
  'may':      'AMB_SUPPORT',

  // Epistemic/volitional → ambiguous
  'will':     'AMB_SUPPORT',
  'would':    'AMB_SUPPORT',
  'could':    'AMB_SUPPORT',
  'might':    'AMB_SUPPORT',
};
```

This is particularly relevant for the CBP/DHS domain where policy documents routinely
use deontic modals in kind-referring constructions ("An officer shall verify
documentation"). Without modal subclassification, these would be tagged `AMB` rather
than correctly resolving toward `GEN`/`UNIV`.

Tense and modality alone never override the determiner signal. They are used to resolve
`AMB` cases from Signal 1 and to adjust confidence on borderline classifications.

##### Signal 3: Predicate type — stative vs. dynamic (tertiary signal)

Stative verbs describe enduring states or properties and strongly correlate with generic
readings. Dynamic verbs describe events or actions and correlate with episodic/instance
readings.

```javascript
/**
 * NORMATIVE: Verb class → genericity signal
 * Applied to the lemma of the main verb.
 */
const STATIVE_VERBS = new Set([
  // Possession / inclusion
  'have', 'contain', 'include', 'comprise', 'consist',
  // Cognition / perception
  'know', 'believe', 'understand', 'recognize', 'perceive',
  // Relational
  'belong', 'depend', 'require', 'need', 'involve',
  // Existential / identity
  'exist', 'remain', 'resemble', 'equal', 'represent',
  // Measurement
  'weigh', 'cost', 'measure', 'last',
]);
```

| Verb Class | Detection | Genericity Signal |
|-----------|-----------|-------------------|
| Stative (in `STATIVE_VERBS`) | Lemma lookup | `GEN_SUPPORT` |
| Copular + taxonomic predicate | `cop` + §9 pattern | `GEN_SUPPORT` |
| Copular + bare predicate nominal | `cop` + root NN, no `det` | `GEN_SUPPORT` |
| Dynamic (not in `STATIVE_VERBS`) | Default | `INST_SUPPORT` |
| Progressive aspect (`aux` + VBG) | Dependency check | `INST_SUPPORT` |

The stative/dynamic distinction is a heuristic, not a hard rule. Many verbs are
ambiguous ("run" is dynamic in "The dog ran" but stative in "The river runs through
the valley"). The verb list covers high-confidence cases; unlisted verbs default to
dynamic, which produces the safer `INST_SUPPORT` signal.

##### Signal 4: Domain register override (quaternary signal — advisory)

Certain text registers are overwhelmingly kind-referring despite surface-level signals
that would indicate instance reference:

- **Legal/regulatory text**: "The Client shall..." uses definite articles but refers
  to any client (kind-referring). Deontic modals ("shall", "must") are the primary
  detector (handled by Signal 2's modal subclassification).

- **Policy/procedural text**: "The officer verifies documentation" uses definite
  articles generically. Simple present tense is the primary detector (Signal 2).

- **Scientific/technical definitions**: "The electron has negative charge" uses a
  definite article for a kind. Copular + individual-level predicate is the primary
  detector (Signal 3).

**Normative status:** Signal 4 is advisory, not normative. The pipeline does not
attempt automatic register detection in this phase. However, the `GenericityDetector`
accepts an optional `registerHint` parameter:

```javascript
genericityDetector.classify(entities, depTree, tags, {
  registerHint: 'legal'  // Boosts GEN_SUPPORT for deontic modals + definite articles
});
```

When `registerHint` is set, definite articles with deontic modals or simple present
stative predicates receive a confidence boost toward `GEN` rather than hard-classifying
as `INST`. This is designed for future integration with the ContextAnalyzer module
(§11, preserved), which could infer register from document-level features.

#### 9.5.4 Decision Algorithm

```
function classifyGenericity(subjectToken, depTree, posTags, options = {}):

  // Step 1: Determiner signal
  detChild = depTree.getDependentByLabel(subjectToken.id, 'det')
  verbToken = getGoverningVerb(subjectToken, depTree)
  verbPOS = posTags[verbToken.id]

  if detChild is null:
    if posTags[subjectToken.id] in ['NNS', 'NNPS']:
      detSignal = 'GEN'                         // bare plural
    else if posTags[subjectToken.id] == 'NNP':
      detSignal = 'INST'                         // proper noun
    else if posTags[subjectToken.id] == 'NN':
      if MASS_NOUNS.has(subjectToken.lemma):
        detSignal = 'GEN'                        // bare mass noun
      else:
        detSignal = 'AMB'                        // bare count noun (det-dropped?)
    else:
      detSignal = 'AMB'
  else:
    detWord = detChild.word.toLowerCase()
    detSignal = DET_TO_GENERICITY[detWord] || 'AMB'

  // Step 2: Gather tense/aspect/modal signal
  tenseSignal = TENSE_GENERICITY_SIGNAL[verbPOS]

  // Step 2b: Modal subclassification
  if tenseSignal == 'MODAL':
    modalChild = depTree.getDependentByLabel(verbToken.id, 'aux')
                 || depTree.getDependentByPOS(verbToken.id, 'MD')
    if modalChild:
      tenseSignal = MODAL_GENERICITY_SIGNAL[modalChild.word.toLowerCase()] || 'AMB_SUPPORT'
    else:
      tenseSignal = 'AMB_SUPPORT'

  // Step 3: Gather predicate type signal
  predicateSignal = classifyPredicateType(verbToken, depTree)
  // Returns: 'GEN_SUPPORT' (stative/copular) or 'INST_SUPPORT' (dynamic)

  // Step 4: Decision logic
  if detSignal in ['GEN', 'UNIV']:
    // Strong signal from determiner — tense/predicate adjust confidence only
    confidence = 0.9
    if tenseSignal == 'INST_SUPPORT':
      // "Dogs had fur" — past tense bare plural; still generic, lower confidence
      confidence = 0.7
    if detSignal == 'GEN' and predicateSignal == 'GEN_SUPPORT':
      confidence = 0.95  // Bare plural + stative/copular = very high confidence
    return { category: detSignal, confidence: confidence }

  if detSignal == 'INST':
    confidence = 0.9
    // Check for "Institutional The" exception (§9.5.7)
    if detChild and detWord == 'the'
       and posTags[subjectToken.id] == 'NN'      // singular
       and predicateSignal == 'GEN_SUPPORT'        // stative/copular predicate
       and (tenseSignal == 'GEN_SUPPORT' or tenseSignal == 'GEN_SUPPORT'):
      // "The electron has negative charge" — possible kind-referring definite
      return {
        category: 'AMB',
        confidence: 0.6,
        alternative: { category: 'GEN', confidence: 0.4 }
      }
    // Domain register hint boost
    if options.registerHint == 'legal' and tenseSignal in ['GEN_SUPPORT', 'WEAK_GEN_SUPPORT']:
      confidence = 0.75  // Lower confidence on INST for legal register
      return {
        category: 'INST',
        confidence: confidence,
        alternative: { category: 'GEN', confidence: 0.25 }
      }
    return { category: 'INST', confidence: confidence }

  // Step 5: Resolve AMB using tense + predicate type
  // Tally supporting signals
  genSupport = 0
  instSupport = 0

  if tenseSignal in ['GEN_SUPPORT', 'WEAK_GEN_SUPPORT']:  genSupport += 1
  if tenseSignal == 'INST_SUPPORT':                         instSupport += 1
  if predicateSignal == 'GEN_SUPPORT':                      genSupport += 1
  if predicateSignal == 'INST_SUPPORT':                     instSupport += 1

  if genSupport >= 2:
    // Both tense and predicate support generic — resolve AMB → GEN
    return { category: 'GEN', confidence: 0.75 }
  if genSupport == 1 and instSupport == 0:
    return { category: 'GEN', confidence: 0.65 }
  if instSupport >= 2:
    return {
      category: 'INST',
      confidence: 0.75,
      alternative: { category: 'GEN', confidence: 0.25 }
    }
  if instSupport == 1 and genSupport == 0:
    return {
      category: 'INST',
      confidence: 0.65,
      alternative: { category: 'GEN', confidence: 0.35 }
    }

  // Step 6: Irreducible ambiguity — neither side has clear support
  return {
    category: 'AMB',
    confidence: 0.5,
    alternative: { category: 'GEN', confidence: 0.5 }
  }
```

**Normative requirements:**
1. When the algorithm returns `AMB`, the graph MUST include the confidence score
   from §13 on the assertion node.
2. When an `alternative` is present, it MUST be emitted as `tagteam:genericityAlternative`
   with its own confidence score. This enables the Phase 6 Interpretation Lattice to
   evaluate both readings.
3. The algorithm satisfies the guiding principle: "Better to output structured
   uncertainty than false precision."

#### 9.5.5 Ontological Output Patterns

**Pattern A: Generic (`GEN`) — Class restriction**

Input: "Dogs have fur."

Classification: `{ category: 'GEN', confidence: 0.95 }`
(Bare plural + simple present + stative verb)

```json
{
  "@id": "inst:Assertion_Dogs_fur",
  "@type": ["tagteam:GenericAssertion", "owl:Restriction"],
  "tagteam:subjectClass": "cco:Dog",
  "owl:onProperty": "bfo:bears",
  "owl:someValuesFrom": "cco:Furriness",
  "tagteam:genericityCategory": "GEN",
  "tagteam:confidence": 0.95
}
```

No `owl:NamedIndividual` is created for "Dogs." The subject refers to the universal,
not a particular. The Tier 2 output is a class reference (`cco:Dog`), not an instance.
The Tier 1 DiscourseReferent still exists — it represents the linguistic mention — but
its `cco:is_about` link points to the class rather than an individual.

**Pattern B: Instance (`INST`) — Individual assertion**

Input: "Those dogs have fleas."

Classification: `{ category: 'INST', confidence: 0.9 }`
(Demonstrative determiner)

```json
{
  "@id": "inst:those_dogs",
  "@type": ["tagteam:DiscourseReferent", "bfo:Entity"],
  "cco:is_about": { "@id": "inst:Dog_instance_abc123" },
  "tagteam:genericityCategory": "INST",
  "tagteam:confidence": 0.9
}
```
```json
{
  "@id": "inst:Dog_instance_abc123",
  "@type": ["cco:Dog", "owl:NamedIndividual"],
  "bfo:bears": { "@id": "inst:flea_infestation_1" }
}
```

Standard two-tier ICE output. No change from current pipeline behavior except the
addition of `tagteam:genericityCategory` and `tagteam:confidence`.

**Pattern C: Universal quantification (`UNIV`) — Universal restriction**

Input: "All dogs bark."

Classification: `{ category: 'UNIV', confidence: 0.9 }`
(Universal quantifier "all")

```json
{
  "@id": "inst:Assertion_All_dogs_bark",
  "@type": ["tagteam:UniversalAssertion", "owl:Restriction"],
  "tagteam:subjectClass": "cco:Dog",
  "owl:onProperty": "cco:participates_in",
  "owl:allValuesFrom": "cco:ActOfBarking",
  "tagteam:genericityCategory": "UNIV",
  "tagteam:confidence": 0.9
}
```

Note `owl:allValuesFrom` (universal) vs. `owl:someValuesFrom` (generic). This reflects
the logical distinction: "All dogs bark" → ∀x(Dog(x) → ∃e(Barking(e) ∧ agent(e,x)));
"Dogs have fur" → Dog ⊑ ∃bears.Furriness (typical, admits exceptions).

**Pattern D: Ambiguous (`AMB`) — Instance with structured uncertainty**

Input: "A dog barked."

Classification: `{ category: 'INST', confidence: 0.65, alternative: { category: 'GEN', confidence: 0.35 } }`
(Indefinite article + past tense → INST favored, but GEN alternative preserved)

```json
{
  "@id": "inst:a_dog",
  "@type": ["tagteam:DiscourseReferent", "bfo:Entity"],
  "cco:is_about": { "@id": "inst:Dog_instance_def456" },
  "tagteam:genericityCategory": "INST",
  "tagteam:confidence": 0.65,
  "tagteam:genericityAlternative": {
    "tagteam:category": "GEN",
    "tagteam:confidence": 0.35
  }
}
```

Default to instance reading (more common for indefinite singular + past tense) but
annotate the alternative reading with its own confidence score. Downstream consumers
or the Phase 6 Interpretation Lattice can resolve based on discourse context.

**Pattern E: Normative generic via deontic modal**

Input: "An officer shall verify documentation."

Classification: `{ category: 'GEN', confidence: 0.75 }`
(Indefinite article [AMB] + deontic "shall" [GEN_SUPPORT] + dynamic verb → resolved GEN)

```json
{
  "@id": "inst:Assertion_officer_verify",
  "@type": ["tagteam:GenericAssertion", "owl:Restriction"],
  "tagteam:subjectClass": "cco:Officer",
  "owl:onProperty": "cco:participates_in",
  "owl:someValuesFrom": "cco:ActOfVerification",
  "tagteam:genericityCategory": "GEN",
  "tagteam:confidence": 0.75,
  "tagteam:deonticModality": "obligation"
}
```

The `tagteam:deonticModality` annotation preserves the normative force of the original
statement. This is relevant for the FNSR Commitment Tracking Service, which needs to
distinguish descriptive generics ("Dogs have fur") from prescriptive generics
("Officers shall verify").

#### 9.5.6 Interaction with Existing Pipeline Components

| Component | Interaction |
|-----------|------------|
| TreeEntityExtractor (§8) | No change. Entity extraction operates on the mention level regardless of genericity. |
| TreeActExtractor (§9) | No change. Act extraction is independent of whether the subject is kind-referring. |
| TreeRoleMapper (§5.3) | No change. Role assignment operates on syntactic relations, not genericity. |
| StructuralAssertion (§9) | **Extended.** Copular assertions on generic subjects produce `GenericAssertion` instead of `StructuralAssertion`. Copular assertions on universally quantified subjects produce `UniversalAssertion`. |
| RealWorldEntityFactory (§11) | **Extended.** For `GEN`/`UNIV` subjects, Tier 2 output is a class reference (`cco:Dog`), not an individual (`inst:Dog_abc`). For `AMB` subjects, Tier 2 output is an individual with `genericityAlternative` annotation. |
| InformationStaircaseBuilder (§11) | No change. The Tier 1 DiscourseReferent is still a linguistic mention regardless of what it refers to. The ICE → IBE → ParsingAct provenance chain is unaffected. |
| ConfidenceAnnotator (§13) | **Extended.** Genericity confidence score is emitted alongside arc confidence. When an alternative reading exists, both confidence values are emitted. |
| ContextAnalyzer (§11, preserved) | **Future integration.** Document-level register detection could feed `registerHint` to the GenericityDetector, improving accuracy on legal/policy text. |
| InterpretationLattice (Phase 6) | **Prepared.** `AMB` classifications with `alternative` readings feed directly into the lattice for discourse-level resolution. See §9.5.8. |

#### 9.5.7 Edge Cases, Limitations, and Mitigations

**Habitual readings:** "John smokes" is an instance-level subject (proper noun → `INST`)
with a habitual/generic predicate. The algorithm correctly classifies the subject as
`INST` — it's about the individual John, not the class of Johns. The habitual aspect
is a property of the predicate, not the subject's referential status.

**Kind-referring definite singulars ("Institutional The"):** "The dog is a loyal
companion" and "The electron has negative charge" use definite articles but refer to
kinds. The algorithm's primary classification is `INST` (definite article), but the
mitigation in Step 4 checks for the combination of definite singular + stative/copular
predicate + simple present tense. When all three conditions hold, the classification
is upgraded to `AMB` with `alternative: { category: 'GEN', confidence: 0.4 }`.

This also handles the "Institutional The" pattern common in government text: "The
Secretary shall designate..." — here the definite article refers to whoever holds the
role, not a specific individual. The deontic modal ("shall") provides additional
`GEN_SUPPORT` via Signal 2.

**Bare singulars — det-dropped vs. mass noun:** "System failed" (headline English,
det-dropped count noun) vs. "Water boils at 100°C" (bare mass noun). The `MASS_NOUNS`
list disambiguates high-confidence cases. Unlisted bare singulars default to
`_BARE_COUNT` → `AMB`, which is the safe default. The list is intentionally conservative
(~50 entries) and extensible.

**Bare plurals in object position:** "I like dogs" — the bare plural "dogs" is in
object position, not subject. The current algorithm classifies only subject NPs. Object
genericity detection is deferred to a future phase; object entities default to `INST`.

**Quantifier scope:** "Every student read a book" — does "a book" refer to one book
(narrow scope) or any book (wide scope)? Quantifier scope ambiguity is out of scope
for this section. Both NPs are classified independently based on their own determiner
and syntactic role.

**Domain-specific class terms:** In the CBP/DHS domain, "An agency is a component of a
department" is clearly generic/definitional even though both subject and object have
indefinite articles. The algorithm resolves this correctly: indefinite article (`AMB`)
+ simple present (`GEN_SUPPORT`) + copular stative predicate (`GEN_SUPPORT`) =
`{ category: 'GEN', confidence: 0.75 }`. Domain-specific gazetteer entries that are
known class terms (e.g., "agency", "component", "directorate") could further boost
confidence in future phases.

**Legal/regulatory register:** Contracts and regulations are overwhelmingly
kind-referring despite heavy use of definite articles ("The Client shall submit...",
"The Agency may determine..."). The `registerHint: 'legal'` parameter (Signal 4)
provides a domain-level override. Absent the hint, the deontic modal subclassification
(Signal 2) handles the most common patterns.

#### 9.5.8 Interaction with Phase 6 Interpretation Lattice

The genericity detector is designed as a "feeder" for the Phase 6 Interpretation
Lattice. `AMB` classifications with `alternative` readings are first-class lattice
inputs.

**Discourse resolution scenario:**

```
Sentence 1: "A dog barked."
  → Classification: INST (confidence: 0.65), alternative: GEN (0.35)

Sentence 2: "The animal was frightened."
  → Classification: INST (confidence: 0.9)
  → Coreference: "The animal" → "A dog" (via Phase 6 coreference resolution)

Lattice resolution:
  → "The animal" (definite, anaphoric) corefers with "A dog"
  → The referent has become a specific discourse entity
  → Sentence 1 is retrospectively resolved: INST (confidence: 0.9)
  → Alternative GEN reading is suppressed
```

This is the intended design: the genericity detector provides initial classifications
with honest uncertainty, and the lattice resolves that uncertainty using cross-sentence
discourse evidence. The `alternative` field ensures no information is lost between
the detector and the lattice.

#### 9.5.9 Implementation Module

```
File: src/graph/GenericityDetector.js (NEW)

Dependencies:
  - DepTree (for det child lookup, verb governor traversal)
  - POS tags (for tense/aspect and noun type)
  - Lemmatizer (for stative verb lookup)
  - MASS_NOUNS list (inline or loaded from config)
  - STATIVE_VERBS list (inline or loaded from config)

Insertion point in SemanticGraphBuilder.build():
  After:  Step 8 (TreeRoleMapper)
  Before: Step 9 (ConfidenceAnnotator)

  // Step 8.5: Classify genericity of subject NPs (NEW — §9.5)
  const genericityResults = this.genericityDetector.classify(
    entities, depTree, tags, options
  );

Output: Map<entityId, {
  category: 'GEN' | 'INST' | 'UNIV' | 'AMB',
  confidence: number,
  alternative?: { category: string, confidence: number }
}>

Consumed by:
  - createGraphNodes (Step 10): determines Tier 2 treatment (class vs. individual)
  - ConfidenceAnnotator (Step 9): emits genericity confidence
  - JSON-LD output: emits tagteam:genericityCategory, tagteam:confidence,
    tagteam:genericityAlternative on entity and assertion nodes
```

**Estimated scope:** ~180 lines (increased from initial estimate to accommodate mass
noun list, stative verb list, modal subclassification, and alternative confidence
tracking). No external dependencies. No model changes. Reads existing pipeline output
(dependency tree, POS tags, lemmas) and annotates entities with genericity
classification before graph assembly.

#### 9.5.10 Test Coverage Requirements

```
Test: genericity-detection.test.js

--- Signal 1: Determiner-driven classification ---

- GIVEN "Dogs have fur"
- THEN subject classified GEN, confidence >= 0.9
  (Bare plural + stative + simple present)

- GIVEN "The dogs have fleas"
- THEN subject classified INST, confidence >= 0.85

- GIVEN "Those dogs are barking"
- THEN subject classified INST, confidence >= 0.9

- GIVEN "All dogs bark"
- THEN subject classified UNIV, confidence >= 0.85

- GIVEN "No dogs were harmed"
- THEN subject classified UNIV, confidence >= 0.85

- GIVEN "Water boils at 100 degrees"
- THEN subject classified GEN, confidence >= 0.85
  (Bare mass noun)

- GIVEN "System failed"
- THEN subject classified AMB or INST, NOT GEN
  (Bare count noun — det-dropped, not mass)

--- Signal 2: Tense/modal resolution ---

- GIVEN "A dog is a loyal companion"
- THEN subject classified GEN, confidence >= 0.65
  (Indefinite [AMB] + simple present + copular → resolved GEN)

- GIVEN "A dog bit me"
- THEN subject classified INST, confidence >= 0.6
  (Indefinite [AMB] + past tense → resolved INST)
- AND alternative.category == 'GEN'
- AND alternative.confidence > 0

- GIVEN "An officer shall verify documentation"
- THEN subject classified GEN, confidence >= 0.7
  (Indefinite [AMB] + deontic "shall" → resolved GEN)

- GIVEN "An officer might verify documentation"
- THEN subject classified AMB, confidence <= 0.6
  (Indefinite [AMB] + epistemic "might" → unresolved)

--- Signal 3: Predicate type ---

- GIVEN "Mammals contain hemoglobin"
- THEN subject classified GEN, confidence >= 0.9
  (Bare plural + stative "contain")

- GIVEN "Children ran across the field"
- THEN subject classified GEN, confidence <= 0.75
  (Bare plural [GEN] but past tense + dynamic verb reduce confidence)

--- Proper nouns ---

- GIVEN "CBP is a component of DHS"
- THEN subject classified INST, confidence >= 0.9
  (Proper noun → instance)

--- Institutional The ---

- GIVEN "The electron has negative charge"
- THEN subject classified AMB
- AND alternative.category == 'GEN'
  (Definite singular + stative + simple present → exception path)

--- Domain class terms ---

- GIVEN "An agency is a component of a department"
- THEN subject classified GEN, confidence >= 0.7
  (Indefinite + copular + simple present → resolved GEN)

--- Structured uncertainty ---

- GIVEN any AMB classification
- THEN output includes tagteam:confidence
- AND if alternative exists, output includes tagteam:genericityAlternative
    with its own confidence score
```

#### 9.5.11 Future Extensions

| Extension | Phase | Description |
|-----------|-------|-------------|
| Object NP genericity | Phase 6 | Extend classification to object position ("I like dogs") |
| Register auto-detection | Phase 6 | ContextAnalyzer infers legal/technical/narrative register |
| Domain class term boosting | Phase 5 | Gazetteer entries marked as class terms boost GEN confidence |
| Stative verb expansion | Phase 5 | Corpus-derived stative verb list (~200 entries) |
| Mass noun expansion | Phase 5 | Corpus-derived mass noun list (~200 entries) |
| Cross-sentence resolution | Phase 6 | Interpretation Lattice resolves AMB via coreference |
| Quantifier scope | Phase 7+ | Nested quantifier disambiguation |
