# TagTeam.js

**A deterministic, client-side semantic parser that extracts BFO/CCO-compliant knowledge graphs from English text.**

TagTeam.js takes a sentence as input and produces a JSON-LD semantic graph as output. The graph contains discourse referents (what was mentioned), real-world entities (what it refers to), acts (what happened), roles (who did what to whom), and deontic content (obligations, permissions, prohibitions). Every IRI in the output resolves to a published ontology entry in BFO 2020, CCO 2.0, or the TagTeam namespace.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-7.0-blue)](package.json)

---

## Quick Start

### Browser

```html
<script src="tagteam.js"></script>
<script>
  const graph = TagTeam.buildGraph("The officer arrested the suspect at the station.");
  console.log(JSON.stringify(graph, null, 2));
</script>
```

No build step, no dependencies, no configuration. The single-file bundle (~11 MB, ~2.3 MB gzip) includes all NLP models.

### Node.js

```bash
npm install   # devDependencies only — no runtime deps
npm run build # creates dist/tagteam.js
```

```javascript
const TagTeam = require('./dist/tagteam.js');
const graph = TagTeam.buildGraph("Congress shall have the power to lay and collect taxes.");
```

### With a Domain Ontology

```javascript
const fs = require('fs');
const TagTeam = require('./dist/tagteam.js');

// Load a domain-specific TTL
const ttl = fs.readFileSync('ontologies/examples/constitution.ttl', 'utf-8');
const tagger = TagTeam.OntologyTextTagger.fromTTL(ttl, {
  propertyMap: { keywords: 'rdfs:label', label: 'rdfs:label' }
});

const graph = TagTeam.buildGraph(
  "All legislative Powers herein granted shall be vested in a Congress of the United States.",
  { ontology: tagger, ontologyThreshold: 0.2 }
);
```

The ontology provides entity types and graph assembly templates. The parser provides syntactic structure and candidate extraction. Graph assembly combines them.

---

## What It Produces

For the sentence *"The officer arrested the suspect at the station"*, `buildGraph()` returns a JSON-LD graph containing:

**Tier 1 — Discourse Referents** (what the text mentions)
- `DR_The_officer` — DiscourseReferent
- `DR_the_suspect` — DiscourseReferent
- `DR_the_station` — DiscourseReferent
- `VP_arrested` — VerbPhrase

**Tier 2 — Real-World Entities** (what those mentions refer to)
- `Person_Officer` — `cco:Person`, with `AgentRole` → `arrested`
- `Person_Suspect` — `cco:Person`, with `PatientRole` → `arrested`
- `Entity_Station` — with `LocationRole` → `arrested`

**Cross-Tier Links**
- `DR_The_officer` → `cco:is_about` → `Person_Officer`
- `Person_Officer` → `is_subject_of` → `DR_The_officer`

**Deontic Content** (for modal sentences like *"shall arrest"*)
- `DirectiveInformationContentEntity` → `prescribes` → `PlanSpecification`
- `PlanSpecification` → `prescribedAgent`, `prescribedPatient`, `prescribedActType`
- `Obligation` → `inheres_in` → bearer entity

Every `@type` value resolves through the `@context` to a published BFO or CCO opaque IRI. Parser-internal metadata uses the `tagteam:` namespace.

---

## Architecture

```
Input Text
    │
    ▼
┌─────────────────────────────────────────────┐
│  NLP Pipeline (deterministic, no LLMs)      │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐ │
│  │Tokenizer │→ │POS Tagger │→ │Dep Parser│ │
│  │+ Segmenter│ │(Perceptron)│ │(Arc-Eager)│ │
│  └──────────┘  └───────────┘  └──────────┘ │
└─────────────────────┬───────────────────────┘
                      │  Dependency tree per sentence
                      ▼
┌─────────────────────────────────────────────┐
│  Tree Extractors                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Entity   │  │   Act    │  │   Role   │  │
│  │Extractor │  │Extractor │  │ Mapper   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│  Semantic Graph Builder                     │
│  • Two-tier architecture (ICE → IC)         │
│  • Realist Deontic Modeling                 │
│  • Ontology-driven type promotion           │
│  • Mereological enrichment                  │
│  • JSON-LD output with BFO/CCO @context     │
└─────────────────────────────────────────────┘
                      │
                      ▼
               JSON-LD Graph
```

### Key Design Principles

- **Deterministic**: Same input always produces the same output. No neural networks, no randomness.
- **Single-file**: One `<script>` tag and you're parsing. All models embedded at build time.
- **BFO/CCO-compliant**: Output adheres to the Basic Formal Ontology and Common Core Ontologies. No fabricated IRIs.
- **Two-tier separation**: Tier 1 (DiscourseReferent) represents the linguistic mention. Tier 2 (Person, Organization, etc.) represents the real-world entity. They are linked by `cco:is_about`, never conflated.
- **Ontology-driven**: Domain ontologies (TTL files) provide entity types, graph assembly templates, and class hierarchies. Adding a new domain requires TTL authoring, not code changes.

---

## API

### `TagTeam.buildGraph(text, options?)`

The primary API. Returns a JSON-LD graph object.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ontology` | OntologyTextTagger | null | Domain ontology tagger (from `.fromTTL()`) |
| `ontologyThreshold` | number | 0.2 | Minimum confidence for ontology matches |
| `verbose` | boolean | false | Include POS tags in `_debug` |

**Returns:** `{ "@context": {...}, "@graph": [...], "_metadata": {...} }`

### `TagTeam.OntologyTextTagger.fromTTL(ttlString, options)`

Creates an ontology tagger from a Turtle string.

```javascript
const tagger = TagTeam.OntologyTextTagger.fromTTL(ttl, {
  propertyMap: { keywords: 'rdfs:label', label: 'rdfs:label' }
});
```

### `TagTeam.TurtleParser`

Lightweight Turtle parser. Extracts classes, properties, individuals, labels, and `rdfs:subClassOf` hierarchies.

```javascript
const parser = new TagTeam.TurtleParser();
const result = parser.parse(ttlContent);
result.getNamedIndividuals();              // ['tagteam:Congress', ...]
result.isSubclassOf('tagteam:Senate', 'tagteam:LegislativeBody');  // true
result.getProperty('tagteam:ActOfVesting', 'tagteam:requiresPatient');  // 'tagteam:LegislativePower'
```

### Other Exports

| Export | Purpose |
|--------|---------|
| `TagTeam.parse(text)` | Legacy API — returns flat semantic roles |
| `TagTeam.toJSONLD(text)` | Returns serialized JSON-LD string |
| `TagTeam.areModelsLoaded()` | Should return `true` (models are embedded) |
| `TagTeam.loadModels(pos, dep, cal, gaz)` | Override built-in models |

---

## Domain Ontologies

TagTeam uses domain ontology TTL files to drive entity typing and graph assembly. A domain TTL defines:

1. **Classes** with `rdfs:subClassOf` chains rooted in BFO/CCO
2. **Labels and aliases** via `rdfs:label` and `skos:altLabel` for text matching
3. **Named Individuals** for specific real-world entities
4. **Graph Assembly Templates** — `tagteam:requiresPatient` / `tagteam:requiresRecipient` on act classes
5. **Performative Act classes** — subclasses of `tagteam:PerformativeAct` for document-enacted events

See [ontologies/examples/constitution.ttl](ontologies/examples/constitution.ttl) for a complete example.

### Supported TTL Constructs

| Construct | Status |
|-----------|--------|
| `@prefix`, `PREFIX` | Supported |
| `rdf:type` / `a` | Supported |
| `rdfs:label`, `rdfs:comment` | Supported |
| `rdfs:subClassOf` (transitive) | Supported |
| `skos:altLabel`, `skos:prefLabel` | Supported |
| `owl:Class`, `owl:ObjectProperty`, `owl:DatatypeProperty` | Supported |
| `owl:NamedIndividual` | Supported |
| Multi-type declarations | Supported |
| Semicolon predicate lists, comma object lists | Supported |
| Language tags (`@en`), datatype annotations (`^^xsd:`) | Supported |
| Blank nodes, OWL restrictions, `owl:unionOf` | Not supported |

---

## Test Commands

```bash
npm run test:ci                                    # All CI suites (21 suites, 0 failures)
node tests/sba/sba-wave1.test.js                   # SBA: 143/144 (99.3%)
node tests/corpus/cco-complex-regression.test.js   # CCO: 106/106 (100%)
node tests/corpus/isa-multi-sentence.test.js       # ISA multi-sentence: 70/70 (100%)
npm run gold:evaluate                              # Entity F1: 93.1%, Role F1: 83.0%
```

---

## Current Metrics (v7.0, April 2026)

| Metric | Value |
|--------|-------|
| Entity boundary F1 | 93.1% |
| Role assignment F1 | 83.0% |
| CI suites | 21, 0 failures |
| SBA (sentence boundary) | 143/144 (99.3%) |
| CCO complex sentences | 106/106 (100%) |
| ISA multi-sentence | 70/70 (100%) |
| SHACL shape validation | 21/21 (100%) |
| Bundle size | ~11 MB raw, ~2.3 MB gzip |
| Parse time | <100ms per sentence |
| Runtime dependencies | 0 |

---

## Project Structure

```
TagTeam.js/
├── src/
│   ├── core/           # Tokenizer, POS tagger, dep parser, dep tree
│   ├── graph/          # SemanticGraphBuilder + tree extractors
│   ├── ontology/       # TurtleParser, OntologyTextTagger
│   ├── nlp/            # SentenceSegmenter, TokenReIndexer
│   ├── data/           # POS/dep model weights (embedded at build)
│   └── validation/     # SHACL validator
├── ontology/           # TagTeam OWL ontology (tagteam.ttl)
├── ontologies/         # Domain extension examples + templates
├── tests/              # 21+ test suites
├── dist/               # Built bundle (tagteam.js)
├── demos/              # Interactive browser demos
├── docs/               # Specs, architecture, research
└── scripts/            # Build system
```

### Key Source Files

| File | Purpose |
|------|---------|
| `src/graph/SemanticGraphBuilder.js` | Main orchestrator — forest loop, graph assembly, RDM |
| `src/graph/TreeEntityExtractor.js` | Entity extraction from dependency trees |
| `src/graph/TreeActExtractor.js` | Act extraction with modal/deontic detection |
| `src/graph/TreeRoleMapper.js` | Two-pass role assignment (core args + oblique PPs) |
| `src/ontology/TurtleParser.js` | Lightweight TTL parser |
| `src/ontology/OntologyTextTagger.js` | Ontology-driven text tagging |
| `src/nlp/SentenceSegmenter.js` | Sentence boundary detection (Rules B-1 through B-4) |
| `src/core/DepTreeCorrector.js` | Post-parse dependency tree corrections |

---

## Downstream Integration

TagTeam is designed as the parsing layer for **Fandaws**, a BFO/CCO knowledge graph system. TagTeam produces candidate graphs; Fandaws resolves them against a full ontology with OWL reasoning. The integration contract is defined in [docs/integration/fandaws-hiri-integration-requirements.md](docs/integration/fandaws-hiri-integration-requirements.md).

---

## License

MIT License - See [LICENSE](LICENSE)

---

**Version:** 7.0 | **Date:** April 2026 | **Status:** Paused pending Fandaws graph availability
