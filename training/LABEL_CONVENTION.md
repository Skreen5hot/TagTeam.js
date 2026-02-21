# Label Convention Reference

**Source:** TagTeam-Major-Refactor-v2.2.md §5.1, §5.2, §5.3
**Module:** `src/core/LabelConvention.js`, `src/core/RoleMappingContract.js`
**Tests:** `tests/unit/phase0/label-convention.test.js`, `tests/unit/phase0/role-mapping-contract.test.js`

---

## 1. Penn Treebank POS Tags (45 tags)

The POS tagger outputs PTB tags via the UD-EWT XPOS column.

| Tag | Description |
|-----|-------------|
| CC | Coordinating conjunction |
| CD | Cardinal number |
| DT | Determiner |
| EX | Existential "there" |
| FW | Foreign word |
| IN | Preposition / subordinating conjunction |
| JJ | Adjective |
| JJR | Adjective, comparative |
| JJS | Adjective, superlative |
| LS | List item marker |
| MD | Modal |
| NN | Noun, singular or mass |
| NNS | Noun, plural |
| NNP | Proper noun, singular |
| NNPS | Proper noun, plural |
| PDT | Predeterminer |
| POS | Possessive ending |
| PRP | Personal pronoun |
| PRP$ | Possessive pronoun |
| RB | Adverb |
| RBR | Adverb, comparative |
| RBS | Adverb, superlative |
| RP | Particle |
| SYM | Symbol |
| TO | "to" |
| UH | Interjection |
| VB | Verb, base form |
| VBD | Verb, past tense |
| VBG | Verb, gerund / present participle |
| VBN | Verb, past participle |
| VBP | Verb, non-3rd person singular present |
| VBZ | Verb, 3rd person singular present |
| WDT | Wh-determiner |
| WP | Wh-pronoun |
| WP$ | Possessive wh-pronoun |
| WRB | Wh-adverb |
| . | Sentence-final punctuation |
| , | Comma |
| : | Colon / semicolon / dash |
| `` | Opening quotation mark |
| '' | Closing quotation mark |
| -LRB- | Left bracket |
| -RRB- | Right bracket |
| # | Pound sign |
| $ | Dollar sign |

### Validation

```javascript
const { isValidPTBTag } = require('./src/core/LabelConvention');
isValidPTBTag('NN');    // true
isValidPTBTag('NOUN');  // false (UPOS, not PTB)
isValidPTBTag('nn');    // false (case-sensitive)
```

---

## 2. UD v2 Dependency Labels (37 labels)

| UD v2 Label | Usage | Replaces (v1.0) |
|-------------|-------|-----------------|
| nsubj | Agent (active voice) | — |
| nsubj:pass | Patient (passive subject) | nsubjpass |
| obj | Patient (direct object) | dobj |
| iobj | Recipient (indirect object) | — |
| obl | Oblique argument (PP) | pobj, prep |
| obl:agent | Agent (passive "by" phrase) | — |
| nmod | Nominal modifier | — |
| amod | Adjectival modifier | — |
| advmod | Adverbial modifier | — |
| nummod | Numeric modifier | — |
| det | Determiner | — |
| case | Preposition/postposition | prep |
| cop | Copula ("is", "was") | — |
| xcomp | Open clausal complement | attr |
| ccomp | Clausal complement | — |
| advcl | Adverbial clause | — |
| acl | Adnominal clause | — |
| acl:relcl | Relative clause | relcl |
| conj | Conjunct | — |
| cc | Coordinating conjunction | — |
| compound | Compound word | — |
| flat | Flat name | — |
| fixed | Fixed expression | — |
| appos | Apposition | — |
| mark | Subordinating conjunction | — |
| aux | Auxiliary verb | — |
| aux:pass | Passive auxiliary | auxpass |
| expl | Expletive ("there") | — |
| neg | Negation | — |
| punct | Punctuation | — |
| root | Root of sentence | — |
| dep | Unspecified dependency | — |
| parataxis | Paratactic relation | — |
| discourse | Discourse element | — |
| vocative | Vocative | — |
| orphan | Orphan in ellipsis | — |
| list | List item | — |

### Critical v1.0 → v2.0 Corrections

- `dobj` → `obj`
- `nsubjpass` → `nsubj:pass`
- `auxpass` → `aux:pass`
- `pobj` → does not exist in UD (use `obl` or `nmod`)
- `prep` → does not exist in UD (use `case` + `obl`/`nmod`)
- `attr` → does not exist in UD (use `xcomp` or copular analysis)
- `relcl` → `acl:relcl`

### Validation

```javascript
const { isValidUDLabel } = require('./src/core/LabelConvention');
isValidUDLabel('nsubj');      // true
isValidUDLabel('nsubj:pass'); // true
isValidUDLabel('dobj');       // false (legacy)
```

---

## 3. UD v2 → BFO/CCO Role Mapping

### Core Argument Roles

| UD Label | CCO Role | Note |
|----------|----------|------|
| nsubj | bfo:Role (rdfs:label: "AgentRole") | Active voice subject |
| obj | bfo:Role (rdfs:label: "PatientRole") | Direct object |
| iobj | bfo:Role (rdfs:label: "RecipientRole") | Indirect object |
| nsubj:pass | bfo:Role (rdfs:label: "PatientRole") | Passive subject = patient |
| obl:agent | bfo:Role (rdfs:label: "AgentRole") | Passive "by" phrase |
| obl | bfo:Role (rdfs:label: "ObliqueRole") | Subtyped by case child |

### Oblique Role Subtyping (by preposition)

| Preposition | CCO Role |
|-------------|----------|
| for | bfo:Role (rdfs:label: "BeneficiaryRole") |
| with | bfo:Role (rdfs:label: "InstrumentRole") |
| at | bfo:Role (rdfs:label: "LocationRole") |
| in | bfo:Role (rdfs:label: "LocationRole") |
| on | bfo:Role (rdfs:label: "LocationRole") |
| from | bfo:Role (rdfs:label: "SourceRole") |
| to | bfo:Role (rdfs:label: "DestinationRole") |
| by | bfo:Role (rdfs:label: "AgentRole") |
| about | bfo:Role (rdfs:label: "TopicRole") |
| against | bfo:Role (rdfs:label: "OpponentRole") |

### Usage

```javascript
const { mapUDToRole, mapCaseToOblique } = require('./src/core/RoleMappingContract');

mapUDToRole('nsubj');        // { role: 'bfo:Role', label: 'AgentRole', bfo: 'bfo:BFO_0000023', note: '...' }
mapUDToRole('punct');        // null (not a role-bearing relation)
mapCaseToOblique('with');    // { role: 'bfo:Role', label: 'InstrumentRole' }
mapCaseToOblique('during');  // null (unmapped)
```
