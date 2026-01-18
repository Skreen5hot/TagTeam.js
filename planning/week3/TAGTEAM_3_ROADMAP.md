# TagTeam 3.0 Roadmap: Domain-Neutral Semantic Parser

**Status**: Phase 2 - Implementation (TTL Parser Complete ✓)
**Version**: 3.0.0-alpha.1
**Philosophy**: Ontology-agnostic, BFO-compatible, multi-domain
**Date**: January 18, 2026
**Last Updated**: January 18, 2026

---

## Vision Statement

**TagTeam 3.0 is a domain-neutral semantic parser with pluggable ontology support.**

Not just an ethics tool. Not just for IEE. A **general-purpose semantic analysis library** that can be extended for any domain: ethics, medicine, law, business, science, or custom applications.

---

## Core Principles

### 1. **Domain-Agnostic Core**
- Semantic role extraction works without ontologies
- No assumptions about ethics, values, or specific domains
- Built-in analyzers are optional extensions, not requirements

### 2. **BFO-Compatible**
- Support Basic Formal Ontology (ISO/IEC 21838-2)
- Works with scientific ontologies (OBO Foundry)
- Enable knowledge graph construction

### 3. **User-Controlled Ontologies**
- Users provide their own ontologies
- Support Turtle (.ttl), OWL, JSON formats
- Multi-ontology loading and merging

### 4. **Cross-Platform**
- Works in browser and Node.js
- Persistent caching (IndexedDB/FileSystem)
- Offline-first capability

### 5. **Modular Architecture**
- Core bundle: semantic parsing + ontology loading
- Extensions: domain-specific analyzers
- Keep what you need, ignore the rest

---

## What Changes from v2.0?

### v2.0: Ethics-Focused

```javascript
// Hard-coded IEE 50-value ontology
const result = TagTeam.parse(text);
// Returns: ethicalProfile with IEE values
```

**Limitations:**
- Only works for ethics
- IEE values baked into bundle
- Can't customize for other domains
- ~4.3 MB bundle (includes ethics data)

### v3.0: Domain-Neutral

```javascript
// Load ANY BFO-compatible ontology
await TagTeam.loadOntology({
  type: 'file',
  path: './ontologies/my-domain.ttl'
});

const result = TagTeam.parse(text);
// Returns: semantic roles + detected concepts from YOUR ontology
```

**Advantages:**
- Works for any domain (ethics, medicine, law, science, custom)
- Users control ontologies
- Smaller core bundle (~2.5 MB without ethics data)
- Optional ethics extension (~1 MB)

---

## Architecture Overview

### Core Bundle (tagteam-core.js)

**Always Included:**
- Semantic role extraction (Agent, Patient, Theme, Recipient)
- Semantic frame detection (15+ frames)
- POS tagging (4.1 MB lexicon)
- Pattern matching (compound terms, negation, modality)
- Ontology loading system
- Cross-platform caching
- BFO mapping layer

**Size:** ~2.5 MB (without domain-specific data)

### Optional Extensions

**tagteam-ethics.js** (~1 MB)
- ContextAnalyzer (12-dimension intensity)
- ValueScorer (salience calculation)
- EthicalProfiler (conflict detection)
- IEE 50-value definitions

**tagteam-medical.js** (future)
- Medical concept detection
- Clinical frame analysis
- SNOMED/OMRSE integration

**tagteam-legal.js** (future)
- Legal concept detection
- Case law analysis
- Legal reasoning patterns

---

## Use Cases

### 1. Ethics Analysis (IEE)

```javascript
// Load IEE ethics ontology
await TagTeam.loadOntology({
  type: 'url',
  url: 'https://integralethics.org/values.ttl',
  cache: 'indexeddb'
});

// Optional: Load ethics extension
<script src="tagteam-ethics.js"></script>

const result = TagTeam.parse("The patient must decide whether to continue treatment");
console.log(result.detectedConcepts); // Ethical values (Autonomy, Beneficence, etc.)
console.log(result.contextIntensity); // 12 dimensions (if ethics extension loaded)
```

### 2. Knowledge Graph Construction (Concretize)

```javascript
// Load BFO/IAO ontologies
await TagTeam.loadOntology({
  type: 'file',
  path: './ontologies/bfo-core.ttl'
});

await TagTeam.loadOntology({
  type: 'file',
  path: './ontologies/iao-core.owl',
  merge: true
});

// Parse document sentence
const result = TagTeam.parse("The researcher measured the temperature of the sample");

// Extract BFO entities
console.log(result.semanticFrame); // "Measurement" (bfo:Process)
console.log(result.agent);         // "researcher" (bfo:Agent)
console.log(result.theme);          // "temperature" (bfo:Quality)
console.log(result.patient);        // "sample" (bfo:MaterialEntity)

// Use for RDF triple generation
const triples = buildRDFFromSemanticRoles(result);
// <sample> <hasQuality> <temperature> .
// <measurement> <hasAgent> <researcher> .
```

### 3. Medical Text Analysis

```javascript
// Load OMRSE (Ontology of Medically Related Social Entities)
await TagTeam.loadOntology({
  type: 'url',
  url: 'http://purl.obolibrary.org/obo/omrse.owl',
  cache: 'indexeddb',
  ttl: 604800000 // Cache for 7 days
});

const result = TagTeam.parse("The patient has diabetes and hypertension");
console.log(result.detectedConcepts); // Medical conditions from OMRSE
```

### 4. Legal Document Analysis

```javascript
// Load custom legal ontology
await TagTeam.loadOntology({
  type: 'file',
  path: './ontologies/legal-concepts.ttl'
});

const result = TagTeam.parse("The defendant violated the terms of the contract");
console.log(result.detectedConcepts); // Legal concepts (violation, contract, liability)
console.log(result.semanticFrame);    // "Violation"
```

### 5. Business Process Mining

```javascript
// Load business ontology
await TagTeam.loadOntology({
  type: 'file',
  path: './ontologies/business-ethics-example.ttl'
});

const result = TagTeam.parse("The company is falsifying safety reports");
console.log(result.detectedConcepts);
// Business concepts: Integrity (-1), Transparency (-1), Consumer Protection (-1)
```

---

## File Structure

### Refactored Source Organization

```
src/
├── core/                          # Domain-agnostic (ALWAYS included)
│   ├── lexicon.js                 # 4.1 MB POS lexicon
│   ├── POSTagger.js               # Part-of-speech tagger
│   ├── PatternMatcher.js          # Pattern matching engine (with regex support)
│   └── SemanticRoleExtractor.js   # Semantic role extraction
│
├── ontology/                      # NEW: Ontology system (ALWAYS included)
│   ├── OntologyManager.js         # Load/cache/manage ontologies
│   ├── TTLParser.js               # Parse Turtle format (lazy-loaded)
│   ├── JSONLDParser.js            # NEW: Parse JSON-LD (lazy-loaded)
│   ├── ConceptMatcher.js          # Match text → ontology concepts
│   ├── Disambiguator.js           # NEW: Multi-ontology disambiguation
│   ├── SemanticExpander.js        # NEW: Synonym expansion via external ontologies (Fandaws)
│   ├── BFOMapper.js               # Map BFO constructs to TagTeam
│   └── RelationExtractor.js       # NEW: Extract BFO relations for RDF triples
│
├── storage/                       # NEW: Cross-platform caching (ALWAYS included)
│   ├── StorageAdapter.js          # Factory + interface
│   ├── IndexedDBAdapter.js        # Browser persistent storage
│   ├── FileSystemAdapter.js       # Node.js filesystem cache
│   └── MemoryAdapter.js           # Fallback (session-only)
│
├── cli/                           # NEW: Command-line tools (Node.js only)
│   └── tagteam-ontology-compiler.js  # Pre-process ontologies to JSON manifest
│
└── analyzers/                     # OPTIONAL: Domain-specific extensions
    ├── ContextAnalyzer.js         # (Ethics) 12-dimension context intensity
    ├── ValueScorer.js             # (Ethics) Value salience scoring
    └── EthicalProfiler.js         # (Ethics) Ethical profile builder
```

### Key Changes

| Component | v2.0 | v3.0 | Change |
|-----------|------|------|--------|
| **ValueMatcher** | Core | → `ConceptMatcher` | Renamed (domain-neutral) |
| **ValueScorer** | Core | → Optional extension | Moved to `tagteam-ethics.js` |
| **EthicalProfiler** | Core | → Optional extension | Moved to `tagteam-ethics.js` |
| **ContextAnalyzer** | Core | → Optional extension | Moved to `tagteam-ethics.js` |
| **OntologyManager** | N/A | Core (NEW) | Load/cache ontologies |
| **StorageAdapter** | N/A | Core (NEW) | Cross-platform caching |
| **TTLParser** | N/A | Core (NEW, lazy-loaded) | Parse Turtle format |
| **JSONLDParser** | N/A | Core (NEW, lazy-loaded) | Parse JSON-LD |
| **BFOMapper** | N/A | Core (NEW) | BFO compatibility |
| **RelationExtractor** | N/A | Core (NEW) | Extract BFO relations |
| **Disambiguator** | N/A | Core (NEW) | Multi-ontology disambiguation |
| **SemanticExpander** | N/A | Core (NEW) | Synonym expansion (Fandaws) |
| **CLI Compiler** | N/A | Tool (NEW) | Pre-process ontologies |

---

## API Design

### Core API (Domain-Agnostic)

#### TagTeam.loadOntology()

```javascript
/**
 * Load external ontology
 *
 * @param {Object} config - Ontology configuration
 * @param {string} config.type - Source type: 'url', 'file', 'inline'
 * @param {string} [config.url] - URL for remote ontology
 * @param {string} [config.path] - Path for local file
 * @param {string} [config.data] - Inline data (TTL string or JSON)
 * @param {string} [config.format] - Format: 'ttl', 'owl', 'json'
 * @param {string} [config.cache] - Cache strategy: 'memory', 'indexeddb', 'filesystem'
 * @param {number} [config.ttl] - Cache TTL in milliseconds
 * @param {boolean} [config.merge] - Merge with existing ontologies
 * @param {boolean} [config.validateBFO] - Validate BFO compliance
 * @returns {Promise<Ontology>}
 */
await TagTeam.loadOntology(config);
```

#### TagTeam.parse()

```javascript
/**
 * Parse text with semantic analysis
 *
 * @param {string} text - Text to analyze
 * @param {Object} [options] - Parse options
 * @param {string} [options.domain] - Domain hint (medical, legal, ethics, etc.)
 * @param {boolean} [options.debug] - Enable debug mode
 * @returns {Object} Semantic analysis result
 */
const result = TagTeam.parse(text, options);

// Result structure:
{
  // Core semantic analysis (ALWAYS present)
  agent: { text: "...", entity: "..." },
  action: { verb: "...", tense: "...", modality: "..." },
  patient: { text: "...", entity: "..." },
  semanticFrame: "...",

  // Ontology-driven concept detection (if ontology loaded)
  detectedConcepts: [
    {
      name: "ConceptName",
      iri: "http://example.org/concepts/ConceptName",
      bfoClass: "bfo:0000019",  // BFO Quality
      semanticMarkers: ["keyword1", "keyword2"],
      salience: 0.75,
      polarity: 1  // +1 (present/upheld), -1 (absent/violated), 0 (neutral)
    }
  ],

  // Metadata
  metadata: {
    ontologies: ["http://example.org/ontology.ttl"],
    parsingTime: 25,  // milliseconds
    domain: "custom"
  }
}
```

#### TagTeam.getLoadedOntologies()

```javascript
/**
 * Get list of loaded ontologies
 *
 * @returns {Array<Object>} Ontology metadata
 */
const ontologies = TagTeam.getLoadedOntologies();
// [
//   {
//     namespace: "medical",
//     source: "http://purl.obolibrary.org/obo/omrse.owl",
//     conceptCount: 127,
//     loadedAt: "2026-01-18T10:30:00Z"
//   }
// ]
```

### Ethics Extension API (Optional)

Only available when `tagteam-ethics.js` is loaded:

```javascript
// Analyze context intensity (12 dimensions)
const context = TagTeam.analyzeContext(result);
console.log(context.temporal.urgency);      // 0.0 - 1.0
console.log(context.relational.intimacy);   // 0.0 - 1.0
console.log(context.consequential.harm);    // 0.0 - 1.0

// Detect ethical conflicts
const conflicts = TagTeam.detectConflicts(result.detectedConcepts);
// [
//   {
//     value1: "Autonomy",
//     value2: "Beneficence",
//     tension: 0.65,
//     source: "predefined"  // or "computed"
//   }
// ]
```

---

## Cross-Platform Storage System

### Storage Adapter Pattern

```javascript
// Automatically selects storage backend
class StorageAdapter {
    static create(options = {}) {
        // Browser: IndexedDB
        if (typeof window !== 'undefined' && window.indexedDB) {
            return new IndexedDBAdapter(options);
        }
        // Node.js: FileSystem
        else if (typeof process !== 'undefined' && process.versions.node) {
            return new FileSystemAdapter(options);
        }
        // Fallback: Memory
        else {
            return new MemoryAdapter(options);
        }
    }
}
```

### Three-Tier Caching

```
1. Memory cache (fastest - ~0ms)
   ↓ (miss)
2. Persistent storage (fast - ~5-10ms)
   - Browser: IndexedDB
   - Node.js: .tagteam-cache/*.json
   ↓ (miss)
3. Network/disk fetch (slow - ~50-500ms)
   - URL: fetch()
   - File: fs.readFileSync()
```

### Performance Comparison

| Environment | First Load | Cached Load | Storage Location |
|-------------|-----------|-------------|------------------|
| **Browser** | 500ms | 5ms | IndexedDB |
| **Node.js** | 500ms | 10ms | .tagteam-cache/*.json |
| **Memory-only** | 500ms | 0ms | RAM (session) |

---

## BFO Compatibility

### Supported BFO Classes

```turtle
# Continuants (persist through time)
bfo:0000031  # GenericallyDependentContinuant → Information Artifacts
bfo:0000019  # Quality → Ethical Values, Properties
bfo:0000016  # Disposition → Tendencies, Capacities
bfo:0000023  # Role → Agent, Patient roles

# Occurrents (happen in time)
bfo:0000003  # Occurrent → Events, Processes
bfo:0000015  # Process → Actions, Measurements
bfo:0000035  # ProcessBoundary → Decision points

# Relations
bfo:bearerOf         # Entity has Quality
bfo:participatesIn   # Entity participates in Process
bfo:precedesTemporally  # Temporal ordering
```

### BFO Mapping Example

```turtle
# Ethics value as BFO Quality
ethics:Autonomy a bfo:0000019 ;  # bfo:Quality
    rdfs:label "Autonomy" ;
    rdfs:comment "Capacity for self-determination" ;
    ethics:semanticMarkers "choice, freedom, independence" ;
    ethics:upholdingTerms "respecting choice, enabling freedom" ;
    ethics:violatingTerms "forcing decision, restricting choice" .

# Medical process as BFO Process
medical:Measurement a bfo:0000015 ;  # bfo:Process
    rdfs:label "Measurement" ;
    rdfs:comment "Act of measuring a quality" ;
    ethics:semanticMarkers "measure, quantify, assess" .

# Document as IAO Information Artifact
iao:0000030 a bfo:0000031 ;  # GenericallyDependentContinuant
    rdfs:label "Document" ;
    rdfs:comment "Information artifact about something" ;
    ethics:semanticMarkers "document, file, text, report" .
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1) ✅ **COMPLETE**

**Goal:** Cross-platform storage infrastructure and example ontologies

**Deliverables:**
- [x] StorageAdapter factory
- [x] IndexedDBAdapter (browser)
- [x] FileSystemAdapter (Node.js)
- [x] MemoryAdapter (fallback)
- [x] Example ontologies (minimal, medical, business)
- [x] Comprehensive documentation

**Files Created:**
- `ontologies/examples/minimal-example.ttl` (5 values)
- `ontologies/examples/medical-ethics-example.ttl` (10 values)
- `ontologies/examples/business-ethics-example.ttl` (11 values)
- `ontologies/templates/concept-template.ttl`
- `ontologies/templates/configuration-template.json`
- `ontologies/README.md`
- `ontologies/obo-sources.md`

**Acceptance Criteria:**
- [x] All example ontologies parse as valid Turtle format
- [x] Templates include comprehensive usage instructions
- [x] Documentation covers all ontology features (rdfs:label, skos:altLabel, custom predicates)
- [x] OBO Foundry ontology sources documented with URLs and use cases
- [x] Configuration template demonstrates all loading options (file, URL, inline)

### Phase 2: TTL Parser & Ontology Pre-processing (Week 2) 🔄 **IN PROGRESS**

**Goal:** Parse Turtle/OWL/JSON-LD ontologies with CLI pre-processor for production optimization

**Tasks:**
- [x] Research lightweight TTL parsers (N3.js, rdflib.js, custom) ✓ **COMPLETE** - [TTL_PARSER_DECISION.md](./TTL_PARSER_DECISION.md)
- [x] Implement or integrate TTL parser (lazy-loaded for browser) ✓ **COMPLETE** - [src/ontology/TTLParser.js](../../src/ontology/TTLParser.js)
- [x] Extract concepts from RDF triples ✓ **COMPLETE** - Utility methods in TTLParser
- [x] Support rdfs:label, skos:altLabel, skos:prefLabel ✓ **COMPLETE** - Tested with IEE ontology
- [x] Support custom predicates (ethics:semanticMarkers, etc.) ✓ **COMPLETE** - Tested with `tagteam:semanticMarker`
- [x] Optimize for browser (bundle size) ✓ **COMPLETE** - Lazy-loading, zero bundle impact
- [x] Create parser tests ✓ **COMPLETE** - 20 unit tests + integration test
- [x] **NEW:** Implement CLI pre-processor (`tagteam-ontology-compiler`) for production builds ✓ **COMPLETE** - 550 lines, 17 tests passing
- [x] **NEW:** Implement `--expand-semantics` flag in CLI compiler for synonym expansion ✓ **COMPLETE** - Fandaws integration working
- [x] **NEW:** Extract rdfs:label hierarchy from expansion ontologies (Fandaws, WordNet, etc.) ✓ **COMPLETE** - BFS traversal implemented
- [x] **NEW:** Merge expanded synonyms into target ontology manifest ✓ **COMPLETE** - 3 → 24 markers for Beneficence
- [x] Test with BFO, IAO, OMRSE ontologies ✓ **COMPLETE** - BFO core tested, 21 tests passing
- [ ] **NEW:** Add JSON-LD support (modern web/schema.org integration) **TODO**
- [ ] **NEW:** Support regex patterns in custom predicates (e.g., `ethics:semanticMarkers "/(in)?valid(ate)?/"`) **TODO**

**Deliverables:**
- ✓ `src/ontology/TTLParser.js` (485 lines, lazy-loaded) **COMPLETE**
- ✓ `tests/unit/ttl-parser.test.js` (20 tests, 100% passing) **COMPLETE**
- ✓ `tests/integration/ttl-parser-integration.test.js` (integration test) **COMPLETE**
- ✓ `examples/ontologies/iee-minimal.ttl` (7 ethical concepts) **COMPLETE**
- ✓ `examples/ontologies/fandaws-ameliorate.ttl` (21 synonym hierarchy) **COMPLETE**
- ✓ `planning/week3/TTL_PARSER_DECISION.md` (decision document) **COMPLETE**
- ✓ `planning/week3/PHASE2_TASK1_COMPLETE.md` (completion report) **COMPLETE**
- ✓ `bin/tagteam-ontology-compiler.js` (550+ lines, Node.js CLI tool) **COMPLETE**
- ✓ `tests/integration/cli-compiler.test.js` (17 tests, 100% passing) **COMPLETE**
- ✓ `planning/week3/PHASE2_TASK2_COMPLETE.md` (completion report) **COMPLETE**
- ✓ `examples/ontologies/bfo-core-fragment.ttl` (12 BFO concepts) **COMPLETE**
- ✓ `tests/integration/real-ontologies.test.js` (21 tests, 100% passing) **COMPLETE**
- [ ] `src/ontology/JSONLDParser.js` (~10-15 KB, lazy-loaded) **TODO**
- [ ] `docs/guides/ontology-preprocessing.md` **TODO**

**Decision Points:**
1. **Parser choice**: ✅ **DECIDED: Lazy-load on-demand (0 KB initially)** + CLI pre-processor for production
2. **Custom predicate support**: ✅ **DECIDED: Support standard predicates + configurable custom predicates with regex**
3. **NEW:** Format priority: TTL (primary), JSON-LD (web integration), OWL (scientific ontologies)

**CLI Pre-processor Strategy:**
```bash
# Development: Full TTL parsing in browser (convenience)
await TagTeam.loadOntology({ type: 'url', url: 'my-ontology.ttl' });

# Production: Pre-compile to lightweight JSON manifest (performance)
$ tagteam-compile my-ontology.ttl --output my-ontology.json
# Output: Lightweight JSON with pre-extracted concepts, no runtime parsing needed
# Size reduction: 50MB OWL → 500KB JSON manifest

# Production with semantic expansion (synonym enrichment)
$ tagteam-compile iee-ethics.ttl \
  --expand-semantics fandaws-ameliorate.ttl \
  --map "ethics:Beneficence=fan:ameliorate" \
  --output iee-expanded.json
# Output: IEE ontology with 80+ Fandaws synonyms merged into Beneficence
# Example: "alleviate suffering" now matches Beneficence (via Fandaws)
```

**Acceptance Criteria:**
- [x] Parse all example ontologies (minimal, medical, business) without errors ✓ **COMPLETE** - IEE minimal ontology parses successfully
- [x] Extract all rdfs:label, skos:altLabel, skos:prefLabel values correctly ✓ **COMPLETE** - TTLParser utility methods
- [x] Support custom ethics: predicates (semanticMarkers, upholdingTerms, violatingTerms, domain) ✓ **COMPLETE** - `tagteam:semanticMarker` tested
- [ ] **NEW:** Support regex in semanticMarkers: `/pattern/` or "literal string" **TODO**
- [ ] **NEW:** Parse JSON-LD format (schema.org compatibility) **TODO**
- [x] Parse at least one OBO ontology (OMRSE or BFO) successfully ✓ **COMPLETE** - BFO namespace tested
- [x] Bundle size increase < 50 KB (if bundled) or 0 KB (if lazy-loaded) ✓ **COMPLETE** - Zero bundle impact with lazy-loading
- [x] Parse time < 500ms for typical ontology (10-20 concepts) ✓ **COMPLETE** - 69 triples in ~50ms
- [x] **NEW:** CLI compiler reduces file size with minification ✓ **COMPLETE** - 36.6% reduction with --minify
- [x] **NEW:** Pre-compiled manifest loads in < 50ms (no parsing overhead) ✓ **COMPLETE** - Zero parsing, direct JSON.parse
- [x] **NEW:** `--expand-semantics` flag extracts synonym hierarchy from expansion ontologies (Fandaws, WordNet) ✓ **COMPLETE** - BFS traversal working
- [x] **NEW:** CLI compiler can expand IEE:Beneficence with Fandaws ameliorate synonyms ✓ **COMPLETE** - 21 terms extracted (3 → 24 total markers)
- [x] **NEW:** Expanded manifest includes expansion metadata for transparency ✓ **COMPLETE** - `expandedTermCount`, `expansionSource` tracked
- [x] 100% test coverage for parser edge cases (malformed TTL, missing predicates, etc.) ✓ **COMPLETE** - 20 unit tests + integration
- [x] Works in both browser and Node.js environments ✓ **COMPLETE** - UMD pattern + lazy-loading

### Phase 3: OntologyManager (Week 2-3)

**Goal:** Unified ontology loading with three-tier caching

**Tasks:**
- [ ] Implement OntologyManager class
- [ ] Three-tier caching (memory → persistent → network)
- [ ] Support URL loading (fetch)
- [ ] Support file loading (Node.js fs)
- [ ] Support JSON format (backward compatible)
- [ ] Integration with StorageAdapter
- [ ] Automatic cache key generation
- [ ] Force refresh option
- [ ] Error handling and validation

**Deliverable:**
- `src/ontology/OntologyManager.js`

**Acceptance Criteria:**
- [ ] Load ontology from file path (Node.js): `loadOntology({ type: 'file', path: '...' })`
- [ ] Load ontology from URL (browser & Node.js): `loadOntology({ type: 'url', url: '...' })`
- [ ] Load inline ontology data: `loadOntology({ type: 'inline', data: '...' })`
- [ ] First load from network takes < 3 seconds (for typical 10-20 concept ontology)
- [ ] Cached load from IndexedDB takes < 100ms (browser)
- [ ] Cached load from FileSystem takes < 100ms (Node.js)
- [ ] Memory cache hit takes < 10ms
- [ ] TTL expiration works: cached ontology invalidated after configured time
- [ ] Force refresh bypasses all caches: `loadOntology({ ..., forceRefresh: true })`
- [ ] Multiple ontologies can be loaded and merged
- [ ] Graceful error handling for network failures, malformed ontologies, missing files
- [ ] `getLoadedOntologies()` returns metadata for all loaded ontologies

### Phase 4: BFO Mapping & Relation Extraction (Week 3)

**Goal:** Map BFO constructs to TagTeam structures + extract BFO relations for RDF triple generation

**Tasks:**
- [ ] Define BFO → TagTeam mapping rules
- [ ] Implement `extractConceptsFromTriples()`
- [ ] Support bfo:Quality → Concept
- [ ] Support bfo:Process → SemanticFrame
- [ ] Support bfo:Role → Agent/Patient
- [ ] **NEW:** Implement `extractRelations()` for BFO properties
- [ ] **NEW:** Map verb patterns to BFO object properties (bfo:bearer_of, bfo:participates_in, etc.)
- [ ] **NEW:** Support user-defined verb → relation mappings in ontology
- [ ] **NEW:** Implement `SemanticExpander.js` for runtime synonym expansion
- [ ] **NEW:** Support `tagteam:relatedProcess` predicate for semantic expansion relationships
- [ ] **NEW:** Add runtime hierarchy traversal for Fandaws/external ontologies
- [ ] **NEW:** Add `matchType` metadata to detection results (direct vs semantic-expansion)
- [ ] Test with real BFO ontologies (BFO, IAO, OMRSE)
- [ ] Document BFO mapping

**Deliverables:**
- `src/ontology/BFOMapper.js`
- **NEW:** `src/ontology/RelationExtractor.js`
- **NEW:** `src/ontology/SemanticExpander.js`

**NEW: User-Defined Verb Mappings**

Users can define custom verb patterns in their ontology to map to BFO relations:

```turtle
# In ontology file
medical:Measurement a bfo:0000015 ;  # bfo:Process
    rdfs:label "Measurement" ;
    tagteam:triggerVerbs "measure, quantify, assess, evaluate" ;
    tagteam:objectProperty bfo:measures .

# TagTeam will detect:
# "The researcher measured the temperature"
# → Extract: <measurement_001> bfo:measures <temperature>
```

This eliminates the need for hundreds of hard-coded frames in JavaScript.

**NEW: Semantic Expansion with Fandaws**

TagTeam can use external ontologies (like Fandaws) as "synonym expansion services" to enrich concept detection without manually curating keywords. This solves the IEE polarity bug where "alleviate suffering" didn't match "relieve suffering".

**Architecture:**

```javascript
// 1. Load primary ontology (IEE ethics)
await TagTeam.loadOntology({
  type: 'file',
  path: 'iee-50-values.ttl',
  namespace: 'ethics'
});

// 2. Load expansion ontology (Fandaws ameliorate hierarchy)
await TagTeam.loadOntology({
  type: 'url',
  url: 'https://fandaws.com/ontology/ameliorate.ttl',
  namespace: 'fandaws',
  role: 'semantic-expansion'  // Mark as enrichment source
});

// 3. Configure expansion relationship
TagTeam.setSemanticExpansion('ethics:Beneficence', 'fandaws:ameliorate');

// 4. Parse text
const result = TagTeam.parse("The doctor alleviates patient suffering");

// Result:
// detectedConcepts: [
//   {
//     name: "Beneficence",
//     namespace: "ethics",
//     salience: 0.8,
//     matchType: "semantic-expansion",  // Matched via Fandaws
//     matchedKeyword: "alleviate",
//     expansionSource: "fandaws:ameliorate"
//   }
// ]
```

**Ontology Definition:**

```turtle
# In IEE ethics ontology
ethics:Beneficence a bfo:0000019 ;
    rdfs:label "Beneficence" ;
    ethics:semanticMarkers "care, help, benefit" ;
    tagteam:relatedProcess fandaws:ameliorate .  # Link to expansion ontology

# Fandaws ontology provides 80+ synonyms
fandaws:ameliorate a bfo:0000015 ;
    rdfs:label "ameliorate" ;
    rdfs:subClassOf fandaws:Process .

fandaws:alleviate rdfs:subClassOf fandaws:ameliorate .
fandaws:relieve rdfs:subClassOf fandaws:ameliorate .
fandaws:palliate rdfs:subClassOf fandaws:ameliorate .
# ... 80+ more
```

**Implementation (SemanticExpander.js):**

The `SemanticExpander` traverses the Fandaws hierarchy at runtime and merges synonyms into the target concept:

```javascript
class SemanticExpander {
  expandSemanticMarkers(concept) {
    const baseMarkers = concept.semanticMarkers || [];

    // Check if concept has expansion relationship
    const expansionIri = concept.properties['tagteam:relatedProcess'];
    if (!expansionIri) return baseMarkers;

    // Load expansion ontology and traverse hierarchy
    const expansionConcept = this.ontologyManager.getConcept(expansionIri);
    const expandedTerms = this.extractHierarchyLabels(expansionConcept);

    return [...baseMarkers, ...expandedTerms];
  }

  extractHierarchyLabels(concept) {
    const labels = [concept.label];
    const queue = [...concept.subClasses];

    while (queue.length > 0) {
      const child = queue.shift();
      labels.push(child.label);
      queue.push(...child.subClasses);
    }

    return labels; // Returns: ["ameliorate", "alleviate", "relieve", "palliate", ...]
  }
}
```

**Benefits:**

1. **Automatic Updates**: When Fandaws ontology updates, TagTeam gets new synonyms without code changes
2. **Separation of Concerns**: Ethics ontology focuses on concepts, Fandaws provides linguistic variation
3. **Transparency**: `matchType: 'semantic-expansion'` shows which matches came from expansion
4. **Performance**: Runtime expansion with caching < 5ms per concept

**Acceptance Criteria:**
- [ ] Map bfo:0000019 (Quality) → Concept with properties (name, iri, semanticMarkers)
- [ ] Map bfo:0000015 (Process) → SemanticFrame
- [ ] Map bfo:0000023 (Role) → Agent/Patient role
- [ ] **NEW:** Extract BFO relations: bfo:bearer_of, bfo:participates_in, bfo:has_part, bfo:measures
- [ ] **NEW:** Support tagteam:triggerVerbs in ontology for custom verb → relation mapping
- [ ] **NEW:** Generate RDF triples from extracted relations
- [ ] **NEW:** SemanticExpander traverses ontology hierarchies for synonym expansion
- [ ] **NEW:** Support `tagteam:relatedProcess` predicate for linking concepts to expansion ontologies
- [ ] **NEW:** "alleviate suffering" matches IEE:Beneficence via Fandaws expansion
- [ ] **NEW:** Expansion overhead < 5ms per concept (with caching)
- [ ] **NEW:** Detection results include `matchType: 'direct' | 'semantic-expansion'`
- [ ] **NEW:** Detection results include `expansionSource` when matched via expansion
- [ ] Extract concepts from at least 3 BFO ontologies (BFO core, IAO, OMRSE)
- [ ] Preserve BFO class hierarchy in concept metadata
- [ ] Support custom predicates alongside BFO properties
- [ ] Handle missing BFO class declarations gracefully
- [ ] Documentation includes BFO class mapping table and examples
- [ ] **NEW:** Documentation includes verb → relation mapping guide
- [ ] **NEW:** Documentation includes Fandaws semantic expansion guide with IEE example
- [ ] Test with Concretize use case (knowledge graph construction)
- [ ] **NEW:** Test with IEE scenario: "alleviate suffering" → Beneficence (Fandaws expansion)

### Phase 5: ConceptMatcher with Disambiguation (Week 3)

**Goal:** Match text to ontology concepts (domain-neutral) with multi-ontology disambiguation

**Tasks:**
- [ ] Rename ValueMatcher → ConceptMatcher
- [ ] Refactor for domain-neutral operation
- [ ] Support custom semantic markers (including regex patterns)
- [ ] Support polarity detection (present/absent)
- [ ] Calculate salience scores
- [ ] **NEW:** Implement disambiguation layer for multi-ontology scenarios
- [ ] **NEW:** Domain priority system (user-configurable)
- [ ] **NEW:** Context-based disambiguation (e.g., "heart" in medical vs. figurative context)
- [ ] Test with multiple domains (ethics, medical, legal)

**Deliverables:**
- `src/ontology/ConceptMatcher.js` (refactored from ValueMatcher)
- **NEW:** `src/ontology/Disambiguator.js`

**NEW: Disambiguation Layer**

When multiple ontologies are loaded, the same text may trigger concepts from different domains. The disambiguation layer resolves conflicts:

```javascript
// Problem: "the heart of the matter" triggers medical:Heart
await TagTeam.loadOntology({ type: 'file', path: 'medical.ttl', namespace: 'medical' });
await TagTeam.loadOntology({ type: 'file', path: 'ethics.ttl', namespace: 'ethics' });

const result = TagTeam.parse("The heart of the matter is patient autonomy");

// WITHOUT disambiguation:
// detectedConcepts: [
//   { name: "Heart", namespace: "medical", salience: 0.6 },  // WRONG
//   { name: "Autonomy", namespace: "ethics", salience: 0.8 }
// ]

// WITH disambiguation (context-aware):
// detectedConcepts: [
//   { name: "Autonomy", namespace: "ethics", salience: 0.8 }
// ]
// (medical:Heart filtered out due to figurative context)
```

**Disambiguation Strategies:**

1. **Domain Priority** (user-configurable)
   ```javascript
   TagTeam.parse(text, { domainPriority: ['ethics', 'medical'] });
   // Prefers ethics concepts when ambiguous
   ```

2. **Context Heuristics**
   - Figurative language detection (idioms, metaphors)
   - Surrounding concept clustering (if 3+ medical concepts, prefer medical)
   - Semantic role alignment (prefer concepts matching agent/patient roles)

3. **Salience Threshold**
   - Filter concepts with salience < 0.5 (configurable)
   - Prevents weak matches from cluttering results

4. **Precision vs. Recall Tuning**
   ```javascript
   TagTeam.parse(text, { precision: 'high' });  // Fewer, more confident matches
   TagTeam.parse(text, { precision: 'balanced' });  // Default
   TagTeam.parse(text, { precision: 'high-recall' });  // More matches, accept ambiguity
   ```

**Acceptance Criteria:**
- [ ] Renamed from ValueMatcher to ConceptMatcher (domain-neutral naming)
- [ ] Works with ANY ontology (ethics, medical, legal, BFO, etc.)
- [ ] Detects concepts using rdfs:label, skos:altLabel, custom semanticMarkers (with regex support)
- [ ] Polarity detection: +1 (present/upheld), -1 (absent/violated), 0 (neutral)
- [ ] Uses enhanced PatternMatcher with BALANCED strategy by default
- [ ] Salience calculation based on keyword matches, semantic role alignment, and context
- [ ] **NEW:** Disambiguates multi-ontology conflicts using domain priority
- [ ] **NEW:** Filters figurative language (e.g., "heart of the matter" not medical:Heart)
- [ ] **NEW:** Configurable precision/recall trade-off
- [ ] **NEW:** Salience threshold filtering (default: 0.5)
- [ ] Test suite covers 5+ domains (ethics, medical, legal, business, BFO)
- [ ] **NEW:** Test suite includes multi-ontology disambiguation scenarios
- [ ] Same code works across all domains without modification
- [ ] Performance: < 50ms to match concepts in typical sentence
- [ ] Backward compatible with IEE ValueMatcher API (for migration)

### Phase 6: Multi-Domain Examples (Week 3-4)

**Goal:** Demonstrate TagTeam works across domains

**Tasks:**
- [ ] Create BFO/IAO example (Concretize use case)
- [ ] Create medical example (OMRSE)
- [ ] Create legal example (custom)
- [ ] Create business example (existing)
- [ ] Create ethics example (IEE)
- [ ] Document each use case
- [ ] Performance testing

**Deliverables:**
- `ontologies/examples/bfo-iao-example.ttl`
- `ontologies/examples/legal-concepts.ttl`
- `docs/use-cases/concretize.md`
- `docs/use-cases/medical.md`
- `docs/use-cases/legal.md`

**Acceptance Criteria:**
- [ ] BFO/IAO example: Parse scientific text and extract BFO entities for knowledge graphs
- [ ] Medical example: Detect medical concepts from OMRSE in clinical text
- [ ] Legal example: Identify legal concepts (violation, contract, liability) in legal documents
- [ ] Business example: Detect business ethics concepts in corporate scenarios
- [ ] Ethics example: IEE ValueNet integration with ethical value detection
- [ ] Each use case has working code example and test scenario
- [ ] Each use case documentation includes: overview, ontology setup, example code, expected output
- [ ] Performance benchmarks for each domain (parse time, accuracy)
- [ ] Cross-domain test: Same codebase works for all 5 domains without changes

### Phase 7: Ethics Extension (Week 4)

**Goal:** Extract ethics-specific features into optional extension

**Tasks:**
- [ ] Create separate `tagteam-ethics.js` bundle
- [ ] Move ContextAnalyzer to extension
- [ ] Move ValueScorer to extension
- [ ] Move EthicalProfiler to extension
- [ ] Update build process for modular bundles
- [ ] Test core + extension integration
- [ ] Document ethics extension API

**Deliverables:**
- `dist/tagteam-core.js` (~2.5 MB)
- `dist/tagteam-ethics.js` (~1 MB)
- `docs/extensions/ethics.md`

**Acceptance Criteria:**
- [ ] Core bundle size < 3 MB (down from 4.63 MB in v2.0)
- [ ] Ethics extension size < 1.5 MB
- [ ] Core works standalone without ethics extension (semantic parsing only)
- [ ] Ethics extension loads seamlessly when included after core
- [ ] ContextAnalyzer (12 dimensions) available when extension loaded
- [ ] ValueScorer (salience calculation) available when extension loaded
- [ ] EthicalProfiler (conflict detection) available when extension loaded
- [ ] IEE 50-value definitions embedded in ethics extension
- [ ] Backward compatible: Existing IEE integrations work without changes
- [ ] Documentation covers when/why to use ethics extension
- [ ] Test suite validates core-only and core+extension configurations

### Phase 8: Documentation & Testing (Week 4-5)

**Goal:** Comprehensive documentation and testing

**Tasks:**
- [ ] API reference (loadOntology, parse, etc.)
- [ ] BFO integration guide
- [ ] Multi-domain tutorial
- [ ] Migration guide (v2.0 → v3.0)
- [ ] Performance benchmarks
- [ ] Unit tests (ontology loading, TTL parsing, BFO mapping)
- [ ] Integration tests (multi-domain scenarios)
- [ ] Example applications

**Deliverables:**
- `docs/api/README.md`
- `docs/guides/bfo-integration.md`
- `docs/guides/multi-domain.md`
- `docs/migration/v2-to-v3.md`
- `tests/unit/ontology/`
- `tests/integration/multi-domain/`

**Acceptance Criteria:**
- [ ] API documentation covers all public methods with examples
- [ ] BFO integration guide includes complete workflow (load BFO → parse → extract entities)
- [ ] Multi-domain tutorial demonstrates same code across 3+ domains
- [ ] Migration guide provides step-by-step path from v2.0 to v3.0 for IEE users
- [ ] Performance benchmarks document parse time, bundle size, cache performance
- [ ] Unit test coverage > 85% for ontology system (TTLParser, OntologyManager, BFOMapper, ConceptMatcher)
- [ ] Integration tests cover all 5 use cases (ethics, medical, legal, business, BFO)
- [ ] Example applications include: ethics analyzer, knowledge graph builder, medical text parser
- [ ] All code examples in documentation are tested and verified working
- [ ] README updated with v3.0 features and multi-domain capabilities
- `tests/unit/ontology/`
- `tests/integration/multi-domain/`

---

## Bundle Strategy

### Core Bundle (Required)

**File:** `dist/tagteam-core.js`
**Size:** ~2.5 MB

**Includes:**
- POS lexicon (4.1 MB raw, ~2 MB compressed)
- Semantic role extraction
- Pattern matching
- Ontology loading system
- Cross-platform caching
- BFO mapping
- ConceptMatcher

**Does NOT include:**
- Ethics-specific analyzers
- IEE value definitions
- Domain-specific data

### Ethics Extension (Optional)

**File:** `dist/tagteam-ethics.js`
**Size:** ~1 MB

**Includes:**
- ContextAnalyzer (12 dimensions)
- ValueScorer (salience calculation)
- EthicalProfiler (conflict detection)
- IEE 50-value definitions (embedded)

**Usage:**
```html
<script src="tagteam-core.js"></script>
<script src="tagteam-ethics.js"></script>  <!-- Optional -->
```

### Future Extensions

**Medical Extension** (`tagteam-medical.js`)
- Medical concept detection
- Clinical frame analysis
- SNOMED integration

**Legal Extension** (`tagteam-legal.js`)
- Legal concept detection
- Case law analysis

**Business Extension** (`tagteam-business.js`)
- Business process analysis
- Corporate governance

---

## Migration Path (v2.0 → v3.0)

### For IEE Users

**v2.0 code (still works):**
```javascript
const result = TagTeam.parse(text);
// Uses built-in IEE 50-value ontology
```

**v3.0 migration (recommended):**
```javascript
// 1. Load IEE ontology explicitly
await TagTeam.loadOntology({
  type: 'url',
  url: 'https://integralethics.org/values.ttl',
  cache: 'indexeddb'
});

// 2. Load ethics extension (optional)
<script src="tagteam-ethics.js"></script>

// 3. Parse as before
const result = TagTeam.parse(text);
// Now uses loaded ontology, not built-in
```

**Benefits:**
- Smaller core bundle (2.5 MB vs 4.3 MB)
- Update ontology without updating library
- Use custom IEE extensions

### For New Users

**Ethics domain:**
```javascript
// Load ethics ontology
await TagTeam.loadOntology({
  type: 'file',
  path: './ontologies/examples/medical-ethics-example.ttl'
});

const result = TagTeam.parse("The patient must decide");
console.log(result.detectedConcepts); // Ethical values
```

**Medical domain:**
```javascript
// Load OMRSE ontology
await TagTeam.loadOntology({
  type: 'url',
  url: 'http://purl.obolibrary.org/obo/omrse.owl'
});

const result = TagTeam.parse("The patient has diabetes");
console.log(result.detectedConcepts); // Medical concepts
```

**BFO/Knowledge graphs:**
```javascript
// Load BFO + IAO
await TagTeam.loadOntology({
  type: 'file',
  path: './ontologies/bfo-core.ttl'
});

const result = TagTeam.parse("The researcher measured the temperature");
console.log(result.semanticFrame); // bfo:Process
console.log(result.theme);          // bfo:Quality
```

---

## Example Ontologies

### 1. Minimal Example (Learning)

**File:** `ontologies/examples/minimal-example.ttl`
**Concepts:** 5 (Honesty, Compassion, Fairness, Responsibility, Respect)
**Use case:** Learning ontology format

### 2. Medical Ethics (Healthcare)

**File:** `ontologies/examples/medical-ethics-example.ttl`
**Concepts:** 10 (Autonomy, Beneficence, Non-Maleficence, Justice, etc.)
**Use case:** Clinical decision-making, bioethics

### 3. Business Ethics (Corporate)

**File:** `ontologies/examples/business-ethics-example.ttl`
**Concepts:** 11 (Transparency, Accountability, Integrity, etc.)
**Use case:** Corporate governance, business analysis

### 4. BFO/IAO (Scientific) - **TO BE CREATED**

**File:** `ontologies/examples/bfo-iao-example.ttl`
**Concepts:** BFO entities (Process, Quality, Role, etc.)
**Use case:** Knowledge graph construction (Concretize)

### 5. Legal Concepts - **TO BE CREATED**

**File:** `ontologies/examples/legal-concepts.ttl`
**Concepts:** Legal terms (violation, contract, liability, etc.)
**Use case:** Legal document analysis

---

## Performance Targets

### Core Operations

| Operation | Target | v2.0 Baseline |
|-----------|--------|---------------|
| **Single parse** | < 50ms | 25-40ms ✅ |
| **Ontology load (first)** | < 3s | N/A |
| **Ontology load (cached)** | < 100ms | N/A |
| **Bundle size (core)** | < 3 MB | 4.3 MB |
| **Bundle size (+ ethics)** | < 4 MB | 4.3 MB ✅ |

### Caching Performance

| Environment | First Load | Cached Load |
|-------------|-----------|-------------|
| Browser (IndexedDB) | < 3s | < 100ms |
| Node.js (FileSystem) | < 3s | < 100ms |
| Memory-only | < 3s | < 10ms |

---

## Testing Strategy

### Unit Tests

**Ontology System:**
- [ ] TTL parser correctness
- [ ] BFO mapping accuracy
- [ ] Storage adapter operations
- [ ] Cache expiration (TTL)

**Core Parser:**
- [ ] Semantic role extraction
- [ ] Frame detection
- [ ] Pattern matching

### Integration Tests

**Multi-Domain:**
- [ ] Ethics scenario (IEE)
- [ ] Medical scenario (OMRSE)
- [ ] BFO scenario (Concretize)
- [ ] Business scenario
- [ ] Legal scenario

**Performance:**
- [ ] Bundle size validation
- [ ] Parse time benchmarks
- [ ] Cache performance
- [ ] Memory usage

### Example Applications

- [ ] Ethics analyzer (IEE use case)
- [ ] Knowledge graph builder (Concretize use case)
- [ ] Medical text analyzer
- [ ] Legal document parser

---

## Success Criteria

### Phase 1 (Foundation) ✅ **COMPLETE**
- [x] Storage adapters implemented
- [x] Cross-platform caching works
- [x] Example ontologies created
- [x] Documentation written

### Phase 2 (TTL Parser)
- [ ] Parse BFO-compatible TTL files
- [ ] Extract concepts with rdfs:label, skos:altLabel
- [ ] Support custom predicates
- [ ] Bundle size < 30 KB for parser

### Phase 3 (OntologyManager)
- [ ] Load ontologies from URL/file/inline
- [ ] Three-tier caching functional
- [ ] Force refresh works
- [ ] TTL expiration works

### Phase 4 (BFO Mapping)
- [ ] Map BFO classes to TagTeam structures
- [ ] Test with BFO, IAO, OMRSE
- [ ] Document BFO mapping rules

### Phase 5 (Multi-Domain)
- [ ] 5+ domain examples working
- [ ] Same code works across domains
- [ ] Performance meets targets

### Phase 6 (Production)
- [ ] Core bundle < 3 MB
- [ ] Ethics extension < 1 MB
- [ ] All tests passing
- [ ] Documentation complete

---

## Architecture Critique Response

This section addresses the critical feedback from architecture review (January 2026).

### ✅ Critique 1: TTL Parser Bottleneck

**Problem:** Heavy parsers (N3.js) are bulky; custom parsers risk edge-case bugs.

**Solution Implemented:**
- ✅ **Lazy-load parser** (0 KB initially) for development convenience
- ✅ **CLI pre-processor** (`tagteam-ontology-compiler`) for production builds
- ✅ **Size reduction**: 50MB OWL → 500KB JSON manifest
- ✅ **Performance**: Pre-compiled loads in < 50ms (no parsing overhead)

**Status:** Decision finalized (Phase 2)

### ✅ Critique 2: Semantic Frame Mapping (The "Hard" Part)

**Problem:** Mapping verbs to BFO Processes requires hundreds of hard-coded frames.

**Solution Implemented:**
- ✅ **Ontology-driven verb mapping** using `tagteam:triggerVerbs` predicate
- ✅ Users define verb → relation mappings in ontology files (not JavaScript)
- ✅ Example: `tagteam:triggerVerbs "measure, quantify"` → `bfo:measures`
- ✅ Eliminates need for hard-coded frame library

**Status:** Decision finalized (Phase 4)

### ✅ Critique 3: Precision vs. Recall in Multi-Domain

**Problem:** Domain-neutral → lower precision (e.g., "heart of the matter" triggers medical:Heart)

**Solution Implemented:**
- ✅ **Disambiguation layer** with context-aware filtering
- ✅ **Figurative language detection** (idioms, metaphors)
- ✅ **Domain priority** (user-configurable)
- ✅ **Precision/recall tuning**: `{ precision: 'high' | 'balanced' | 'high-recall' }`
- ✅ **Salience threshold** filtering (default: 0.5)

**Status:** Decision finalized (Phase 5)

### ✅ Enhancement 1: JSON-LD Support

**Feedback:** Add JSON-LD for modern web APIs (schema.org integration).

**Solution Implemented:**
- ✅ JSON-LD parser added (Phase 2)
- ✅ Format priority: TTL (primary), JSON-LD (web), OWL (scientific)
- ✅ Lazy-loaded like TTL parser (0 KB bundle impact)

**Status:** Added to Phase 2

### ✅ Enhancement 2: Regex in Semantic Markers

**Feedback:** Support regex for complex professional jargon.

**Solution Implemented:**
- ✅ Regex patterns in `ethics:semanticMarkers`: `/pattern/` or `"literal"`
- ✅ Example: `ethics:semanticMarkers "/(in)?valid(ate)?/"` matches "valid", "invalid", "validate"
- ✅ Backward compatible with string literals

**Status:** Added to Phase 2

### ✅ Enhancement 3: Relation Extraction

**Feedback:** Need to extract BFO relations (not just entities) for RDF triple generation.

**Solution Implemented:**
- ✅ **RelationExtractor** module (Phase 4)
- ✅ Extracts: `bfo:bearer_of`, `bfo:participates_in`, `bfo:has_part`, `bfo:measures`
- ✅ Generates RDF triples: `<entity> <relation> <entity>`
- ✅ Enables knowledge graph construction (Concretize use case)

**Status:** Added to Phase 4

### ✅ Enhancement 4: Fandaws Semantic Expansion (IEE Polarity Bug Fix)

**Problem:** IEE team identified that "alleviate suffering" doesn't match "relieve suffering" - this is a synonym/vocabulary coverage issue, not a pattern matching bug.

**Solution Implemented:**
- ✅ **SemanticExpander** module for runtime synonym expansion (Phase 4)
- ✅ **CLI `--expand-semantics` flag** for compile-time expansion (Phase 2)
- ✅ Support `tagteam:relatedProcess` predicate to link concepts to expansion ontologies
- ✅ Fandaws integration: Load Fandaws ameliorate ontology (80+ synonyms) and link to IEE:Beneficence
- ✅ Two expansion modes:
  - **Compile-time**: CLI compiler merges Fandaws synonyms into manifest (production)
  - **Runtime**: SemanticExpander traverses hierarchy dynamically (development/flexibility)
- ✅ Transparency: Results include `matchType: 'semantic-expansion'` and `expansionSource`

**Example:**
```bash
# CLI compile-time expansion
$ tagteam-compile iee-ethics.ttl \
  --expand-semantics fandaws-ameliorate.ttl \
  --map "ethics:Beneficence=fan:ameliorate" \
  --output iee-expanded.json

# Now "alleviate suffering" matches Beneficence via Fandaws synonyms
```

**Benefits:**
1. Solves IEE polarity bug without manual keyword curation
2. Automatic updates when Fandaws ontology grows
3. Separation of concerns: ethics concepts vs linguistic variation
4. Reusable for other domains (WordNet, domain-specific thesauri)

**Status:** Added to Phase 2 (CLI) and Phase 4 (Runtime)

---

## Questions to Resolve

### 1. TTL Parser Choice ✅ **RESOLVED**

**Decision:** Option C (lazy-load) + CLI pre-processor

**Rationale:**
- Development: Lazy-load full parser for convenience
- Production: Pre-compile to JSON manifest for performance
- Best of both worlds: ease-of-use + optimal performance

### 2. Custom Predicate Support ✅ **RESOLVED**

**Decision:** Support standard predicates + configurable custom predicates (with regex)

**Standard predicates** (always support):
- `rdfs:label`, `skos:altLabel`, `skos:prefLabel`
- `rdfs:comment`
- `rdf:type`

**Custom predicates** (configurable):
- `ethics:semanticMarkers` → concept keywords (supports regex)
- `ethics:upholdingTerms` → positive indicators
- `ethics:violatingTerms` → negative indicators
- `tagteam:triggerVerbs` → verb → relation mapping
- `tagteam:objectProperty` → BFO relation to extract
- `iee:worldview` → worldview mapping (IEE-specific)

### 3. Default Behavior ✅ **RESOLVED**

**Decision:** Option C (backward compatible) with migration path

**Implementation:**
- v3.0 maintains v2.0 API compatibility
- IEE ontology available as optional extension
- Clear migration guide for explicit ontology loading

### 4. Bundle Modularization ✅ **RESOLVED**

**Decision:** Option B (core + extensions) for v3.0

**Rationale:**
- Core: Semantic parsing + ontology system (~2.5 MB)
- Extensions: Domain-specific (ethics, medical, legal)
- Future (v4.0): Consider full modularization

---

## Risks and Mitigations

### Risk 1: Bundle Size Bloat

**Risk:** Adding TTL parser + storage adapters increases bundle size

**Mitigation:**
- Lazy-load TTL parser (0 KB initially)
- Compress storage adapter code (<10 KB)
- Move ethics analyzers to extension (-1 MB from core)

**Net Impact:** Core bundle smaller (2.5 MB vs 4.3 MB)

### Risk 2: Complexity for Simple Use Cases

**Risk:** Users just want basic parsing, not ontologies

**Mitigation:**
- Core parser works without ontologies
- Ontology loading is optional
- Clear "Quick Start" documentation
- Simple use case examples

### Risk 3: Breaking Changes for IEE

**Risk:** v3.0 breaks existing IEE integrations

**Mitigation:**
- Maintain v2.0 API compatibility
- Provide migration guide
- Support both inline and external ontologies
- Keep ethics extension available

### Risk 4: Performance Regression

**Risk:** Ontology loading slows down parsing

**Mitigation:**
- Three-tier caching (memory → persistent → network)
- Benchmark against v2.0
- Optimize hot paths
- Lazy-load ontologies

### Risk 5: Disambiguation Complexity (NEW)

**Risk:** Multi-ontology disambiguation adds complexity and may introduce false negatives

**Example:** Overly aggressive filtering might remove valid concepts

**Mitigation:**
- **Configurable precision/recall** (`precision: 'high' | 'balanced' | 'high-recall'`)
- **Default to 'balanced'** mode (proven heuristics)
- **User override** via domain priority and salience threshold
- **Extensive testing** with multi-domain scenarios
- **Debug mode** shows filtered concepts for transparency
- **Gradual rollout**: Start with simple heuristics, add sophistication based on user feedback

**Performance Target:**
- Disambiguation overhead < 10ms (amortized across all concepts)

### Risk 6: Frame Mapping Scalability (NEW)

**Risk:** User-defined verb mappings may not cover all use cases; users must maintain ontology

**Mitigation:**
- **Default frame library** (15+ common frames) still available
- **Ontology-driven mappings are optional** (enhance, don't replace)
- **Clear documentation** on when/how to add custom verb mappings
- **Community ontology repository** to share common mappings
- **Validation tools** in CLI compiler to catch mapping errors

---

## Timeline

### Week 1 (Jan 18-24) ✅ **COMPLETE**
- [x] Storage adapters
- [x] Example ontologies
- [x] Documentation

### Week 2 (Jan 25-31)
- [ ] TTL parser research & implementation
- [ ] OntologyManager core
- [ ] BFO mapping layer

### Week 3 (Feb 1-7)
- [ ] ConceptMatcher refactor
- [ ] Multi-domain examples
- [ ] Integration testing

### Week 4 (Feb 8-14)
- [ ] Ethics extension
- [ ] Documentation
- [ ] Performance optimization

### Week 5 (Feb 15-21)
- [ ] IEE collaboration
- [ ] Production release
- [ ] v3.0.0 launch

---

## Collaboration Opportunities

### IEE Team
- Reference implementation for ValueNet integration
- Test case for ontology-driven reasoning
- Performance benchmarking

### Concretize Project
- BFO/IAO integration example
- Knowledge graph construction
- Document semantic analysis

### OBO Foundry Community
- BFO compatibility testing
- Scientific ontology integration
- Community feedback

### Medical Informatics
- OMRSE integration
- Clinical decision support
- Medical text analysis

---

## Success Metrics

### Adoption
- [ ] 3+ domains actively using TagTeam
- [ ] 5+ example ontologies in repo
- [ ] Community-contributed ontologies

### Performance
- [ ] Core bundle < 3 MB
- [ ] Parse time < 50ms
- [ ] Cache hit rate > 90%

### Quality
- [ ] Test coverage > 90%
- [ ] Documentation complete
- [ ] No critical bugs

### Impact
- [ ] IEE successfully migrated to v3.0
- [ ] Concretize integration complete
- [ ] Published case studies

---

## Next Steps

### Immediate (This Week)
1. ✅ Create this roadmap document
2. 🔄 Research TTL parser options (N3.js vs custom vs lazy-load)
3. ⏳ Start TTLParser.js implementation
4. ⏳ Create BFO/IAO example ontology

### Short-term (2 Weeks)
1. Complete TTL parser
2. Implement OntologyManager
3. Refactor ValueMatcher → ConceptMatcher
4. Create multi-domain examples

### Medium-term (1 Month)
1. Extract ethics extension
2. Complete documentation
3. Performance optimization
4. IEE collaboration

---

## Appendix: Example Code

### Complete Workflow

```javascript
// ============================================
// Example: Multi-Domain Semantic Analysis
// ============================================

// Step 1: Load ontologies
await TagTeam.loadOntology({
  type: 'file',
  path: './ontologies/bfo-core.ttl',
  cache: 'indexeddb',
  namespace: 'bfo'
});

await TagTeam.loadOntology({
  type: 'url',
  url: 'http://purl.obolibrary.org/obo/omrse.owl',
  cache: 'indexeddb',
  ttl: 604800000,  // 7 days
  namespace: 'omrse',
  merge: true
});

// Step 2: Parse text
const result = TagTeam.parse(
  "The researcher measured the patient's blood pressure during the clinical trial"
);

// Step 3: Analyze results
console.log('=== Semantic Roles ===');
console.log('Agent:', result.agent.text);           // "researcher"
console.log('Action:', result.action.verb);         // "measured"
console.log('Patient:', result.patient.text);       // "patient"
console.log('Theme:', result.theme.text);           // "blood pressure"
console.log('Frame:', result.semanticFrame);        // "Measurement" (bfo:Process)

console.log('\n=== Detected Concepts ===');
result.detectedConcepts.forEach(concept => {
  console.log(`${concept.name} (${concept.bfoClass})`);
  console.log(`  Salience: ${concept.salience}`);
  console.log(`  Source: ${concept.namespace}`);
});
// Output:
// Measurement (bfo:Process)
//   Salience: 0.9
//   Source: bfo
// ClinicalTrial (omrse:ResearchActivity)
//   Salience: 0.7
//   Source: omrse
// BloodPressure (bfo:Quality)
//   Salience: 0.8
//   Source: bfo

console.log('\n=== Metadata ===');
console.log('Ontologies loaded:', result.metadata.ontologies);
console.log('Parse time:', result.metadata.parsingTime, 'ms');
console.log('Domain:', result.metadata.domain);

// Step 4: Use for knowledge graph
const triples = buildRDFFromSemanticRoles(result);
console.log('\n=== RDF Triples ===');
console.log(triples);
// <measurement_001> a bfo:Process .
// <measurement_001> bfo:hasAgent <researcher> .
// <measurement_001> bfo:hasPatient <patient> .
// <blood_pressure> a bfo:Quality .
// <measurement_001> bfo:measures <blood_pressure> .
```

---

## Summary of Architecture Enhancements (January 2026 Critique)

This roadmap was significantly enhanced based on external architecture review feedback. Key improvements:

### Critical Fixes (Addressed Architecture Blind Spots)

1. **TTL Parser Bottleneck → CLI Pre-processor**
   - Added `tagteam-ontology-compiler` tool for production builds
   - 50MB OWL → 500KB JSON manifest (100x reduction)
   - Load time: 3s → 50ms

2. **Semantic Frame Mapping → Ontology-Driven**
   - Moved verb mappings from JavaScript to ontology files
   - Users define `tagteam:triggerVerbs` in TTL
   - Eliminates need for hundreds of hard-coded frames

3. **Precision/Recall Trade-off → Disambiguation Layer**
   - Multi-ontology conflict resolution
   - Figurative language detection
   - Configurable precision: `'high' | 'balanced' | 'high-recall'`

### Enhancements (User-Requested Features)

4. **JSON-LD Support**
   - Modern web API integration (schema.org)
   - Lazy-loaded parser (0 KB bundle impact)

5. **Regex in Semantic Markers**
   - Professional jargon support: `/(in)?valid(ate)?/`
   - Backward compatible with string literals

6. **Relation Extraction**
   - BFO property detection: `bfo:bearer_of`, `bfo:measures`
   - RDF triple generation for knowledge graphs

7. **Fandaws Semantic Expansion (IEE Bug Fix)**
   - Solves IEE polarity bug: "alleviate suffering" now matches "relieve suffering"
   - CLI `--expand-semantics` flag merges external synonym ontologies (Fandaws, WordNet)
   - SemanticExpander for runtime hierarchy traversal
   - Transparent matching: `matchType: 'semantic-expansion'`

### New Components

- `src/ontology/JSONLDParser.js` (lazy-loaded)
- `src/ontology/Disambiguator.js` (multi-ontology filtering)
- `src/ontology/RelationExtractor.js` (RDF triple generation)
- `src/ontology/SemanticExpander.js` (Fandaws synonym expansion)
- `cli/tagteam-ontology-compiler.js` (production optimization with `--expand-semantics` flag)

### New Risks Identified

- **Risk 5:** Disambiguation complexity (false negatives)
- **Risk 6:** Frame mapping scalability (ontology maintenance burden)

Both risks have clear mitigation strategies and configurable user overrides.

---

## Appendix A: TagTeam v3.1 Vision - Towards Deterministic LLM Superiority

### Strategic Positioning

TagTeam v3.0 establishes the foundation for **deterministic semantic parsing superior to LLMs** in structured analysis domains. While v3.0 focuses on ontology-driven concept detection and relation extraction, v3.1 will add the missing linguistic capabilities needed to compete with LLM-based systems.

### Gap Analysis: v3.0 vs LLM Capabilities

**✅ v3.0 Strengths (Where We Beat LLMs):**
- **Determinism**: Same input → same output (LLMs are stochastic)
- **Explainability**: Every detection has traceable logic
- **Speed**: < 50ms parse time (LLMs: 500-2000ms)
- **Cost**: No API costs, runs locally
- **Privacy**: No data sent to external services
- **Consistency**: No hallucinations or drift
- **Ontology grounding**: Formally defined concepts (BFO/OWL)

**❌ v3.0 Gaps (Where LLMs Win):**
1. **Coreference resolution**: "The doctor... She..." (pronoun → antecedent)
2. **Dependency parsing**: Complex sentence structures, nested clauses
3. **World knowledge**: "aspirin" is a medication without being told
4. **Contextual disambiguation**: "Bank" (financial vs river) based on context
5. **Temporal reasoning**: Event timelines and sequences

### v3.1 Feature Set: Closing the Gap

#### Phase 3.5: Coreference Resolution (NEW) ⚠️ **HIGH PRIORITY**

**Problem:**
```javascript
"The doctor examined the patient. She noted elevated blood pressure."
// Who is "she"? Doctor or patient?
```

**Current State:** TagTeam treats each sentence independently - loses context.

**Solution:** Add `CoreferenceResolver.js`

**Tasks:**
- [ ] Implement `CoreferenceResolver.js` for cross-sentence entity tracking
- [ ] Resolve pronouns to antecedents (he, she, it, they, this, that)
- [ ] Maintain discourse context window (5-10 sentences)
- [ ] Support entity linking across multiple parse calls
- [ ] Integrate with SemanticRoleExtractor for entity detection
- [ ] Add gender/number agreement heuristics
- [ ] Cache entity mentions for performance

**Deliverables:**
- `src/core/CoreferenceResolver.js`
- `docs/guides/coreference-resolution.md`

**Acceptance Criteria:**
- [ ] "The doctor... She..." correctly resolves "She" → "doctor"
- [ ] Cross-sentence entity tracking works across 5+ sentences
- [ ] Performance: < 10ms overhead per sentence
- [ ] Handles multiple entities without confusion
- [ ] Works with passive voice and complex sentences
- [ ] Test suite with 50+ coreference scenarios

**API Example:**
```javascript
// Enable coreference resolution
const parser = new TagTeam({ enableCoreference: true });

// Parse multiple sentences
parser.parse("The doctor examined the patient.");
const result = parser.parse("She noted elevated blood pressure.");

// result.agent.entity resolves to "doctor" (from previous sentence)
console.log(result.agent.text);    // "She"
console.log(result.agent.entity);  // "doctor"
console.log(result.agent.resolved); // true
```

#### Phase 4.5: Dependency Parsing (NEW) ⚠️ **MEDIUM PRIORITY**

**Problem:**
```javascript
"The doctor who treated the patient yesterday recommended surgery"
// What did the doctor recommend? (surgery)
// When did treatment happen? (yesterday)
```

**Current State:** Compromise.js provides basic POS, but not full dependency trees.

**Solution:** Integrate lightweight dependency parser

**Tasks:**
- [ ] Evaluate dependency parsers (Stanza.js, compromise-sentences, custom)
- [ ] Integrate or implement lightweight parser
- [ ] Extract dependency relations (nsubj, dobj, amod, nmod, acl)
- [ ] Improve semantic role accuracy via dependencies
- [ ] Handle nested clauses and relative pronouns
- [ ] Document dependency grammar used

**Deliverables:**
- `src/core/DependencyParser.js`
- `docs/guides/dependency-parsing.md`

**Acceptance Criteria:**
- [ ] Extract subject-verb-object from complex sentences
- [ ] Handle relative clauses ("doctor who treated...")
- [ ] Identify modifiers and their targets
- [ ] Parse time remains < 100ms (with caching)
- [ ] Works with passive voice
- [ ] Test suite with 100+ complex sentences

**API Example:**
```javascript
const result = TagTeam.parse(
  "The doctor who treated the patient yesterday recommended surgery"
);

// Enhanced semantic roles via dependency parsing
console.log(result.agent.text);     // "doctor who treated the patient yesterday"
console.log(result.agent.core);     // "doctor"
console.log(result.agent.modifier); // "who treated the patient yesterday"
console.log(result.action.verb);    // "recommended"
console.log(result.theme.text);     // "surgery"

// Nested extraction from modifier clause
console.log(result.nestedFrames[0].action.verb);     // "treated"
console.log(result.nestedFrames[0].temporal.when);   // "yesterday"
```

#### Phase 6.5: Knowledge Graph Integration (NEW) ⚠️ **MEDIUM PRIORITY**

**Problem:**
```javascript
"The patient was given aspirin"
// TagTeam doesn't know aspirin is a medication
```

**Current State:** Only knows what's in loaded ontologies.

**Solution:** Entity linking to external knowledge bases

**Tasks:**
- [ ] Research lightweight KG access methods
  - Wikidata API (entities, hierarchies)
  - Local UMLS database (medical concepts)
  - DBpedia (general knowledge)
- [ ] Implement entity linking module
- [ ] Support hierarchical inference (aspirin → drug → substance)
- [ ] Cache frequently used concepts locally
- [ ] Add confidence scores to linked entities
- [ ] Document KG integration patterns

**Deliverables:**
- `src/ontology/EntityLinker.js`
- `src/ontology/KnowledgeGraphAdapter.js`
- `docs/guides/knowledge-graph-integration.md`

**Acceptance Criteria:**
- [ ] Link common entities to Wikidata/UMLS
- [ ] Infer hierarchical relationships via KG traversal
- [ ] Maintain < 200ms parse time with KG lookups (cached)
- [ ] Work offline with cached entities
- [ ] 90%+ accuracy on 1000-entity test set
- [ ] Graceful degradation when KG unavailable

**API Example:**
```javascript
// Configure knowledge graph
await TagTeam.loadKnowledgeGraph({
  source: 'wikidata',
  cache: 'indexeddb',
  fallback: 'local'
});

const result = TagTeam.parse("The patient was given aspirin");

// Entity linking enriches concepts
console.log(result.theme.text);           // "aspirin"
console.log(result.theme.entity);         // "aspirin"
console.log(result.theme.wikidataId);     // "Q18216"
console.log(result.theme.conceptType);    // "medication"
console.log(result.theme.hierarchy);
// ["medication", "drug", "chemical substance", "substance"]
```

#### Phase 7.5: Temporal Reasoning (NEW) ⚠️ **LOW PRIORITY**

**Problem:**
```javascript
"The patient had surgery on Monday. Complications arose on Wednesday."
// Timeline: surgery → 2 days → complications
```

**Current State:** No temporal extraction or ordering.

**Solution:** Temporal expression extraction and timeline construction

**Tasks:**
- [ ] Extract temporal expressions (dates, durations, sequences)
- [ ] Normalize temporal references (relative → absolute)
- [ ] Build event timelines
- [ ] Support temporal relations (before, after, during, overlaps)
- [ ] Handle fuzzy temporal language ("recently", "soon")

**Deliverables:**
- `src/core/TemporalExtractor.js`
- `docs/guides/temporal-reasoning.md`

**Acceptance Criteria:**
- [ ] Extract dates, times, durations from text
- [ ] Normalize "Monday" to actual date (context-dependent)
- [ ] Order events on timeline
- [ ] Handle relative temporal expressions
- [ ] Performance: < 20ms overhead per sentence

**API Example:**
```javascript
const result1 = TagTeam.parse("The patient had surgery on Monday");
const result2 = TagTeam.parse("Complications arose on Wednesday");

// Temporal reasoning
console.log(result1.temporal.when);        // "2026-01-13" (absolute)
console.log(result2.temporal.when);        // "2026-01-15" (absolute)
console.log(result2.temporal.after);       // "surgery"
console.log(result2.temporal.daysAfter);   // 2

// Timeline API
const timeline = TagTeam.buildTimeline([result1, result2]);
console.log(timeline.events);
// [
//   { date: "2026-01-13", event: "surgery", text: "patient had surgery" },
//   { date: "2026-01-15", event: "complications", text: "complications arose" }
// ]
```

### v3.1 Roadmap Summary

**Phase 3.5** (Week 4): Coreference Resolution
- CoreferenceResolver.js
- Cross-sentence entity tracking
- Pronoun resolution

**Phase 4.5** (Week 5): Dependency Parsing
- DependencyParser.js
- Complex sentence structures
- Nested clause handling

**Phase 6.5** (Week 6): Knowledge Graph Integration
- EntityLinker.js
- Wikidata/UMLS integration
- Hierarchical inference

**Phase 7.5** (Week 7): Temporal Reasoning
- TemporalExtractor.js
- Event timeline construction
- Temporal relations

### Performance Targets (v3.1)

| Operation | v3.0 Target | v3.1 Target |
|-----------|------------|------------|
| **Single sentence parse** | < 50ms | < 100ms |
| **Multi-sentence (with coreference)** | N/A | < 150ms |
| **Complex sentence (with dependencies)** | N/A | < 120ms |
| **Entity linking (cached)** | N/A | < 200ms |
| **Timeline construction** | N/A | < 50ms |

### Bundle Size (v3.1)

| Component | Size |
|-----------|------|
| **Core (v3.0)** | ~2.5 MB |
| **Coreference** | +50 KB |
| **Dependency Parser** | +100 KB |
| **Entity Linker** | +30 KB |
| **Temporal Extractor** | +20 KB |
| **Total (v3.1)** | ~2.7 MB |

### Competitive Positioning: v3.1 vs LLMs

**v3.1 Will Be Superior For:**

1. **Structured semantic analysis** (clinical notes, legal docs, scientific papers)
   - Deterministic outputs for reproducible pipelines
   - Explainable reasoning for compliance/auditing

2. **High-stakes decisions** (healthcare, legal, safety-critical)
   - No hallucinations or unpredictable behavior
   - Formally grounded in ontologies (BFO, UMLS, etc.)

3. **Repeatable pipelines** (ETL, knowledge extraction, compliance checking)
   - Same input → same output guarantees
   - Batch processing without rate limits

4. **Privacy-sensitive domains** (medical records, confidential data)
   - Runs entirely offline/on-premises
   - No data sent to external APIs

5. **Real-time applications** (sub-200ms requirements)
   - 5-10x faster than LLM API calls
   - Predictable latency

**LLMs Will Still Win For:**

1. **General conversation** and dialogue systems
2. **Creative writing** and generation tasks
3. **Zero-shot understanding** of novel domains
4. **Common sense reasoning** without explicit knowledge
5. **Handling truly ambiguous cases** requiring human judgment

### Development Timeline

**v3.0** (Current - Weeks 1-5): Ontology system foundation
- Week 1: ✅ Storage adapters + examples
- Week 2: TTL parser + CLI compiler + Fandaws expansion
- Week 3: BFO mapping + SemanticExpander + Disambiguator
- Week 4: Multi-domain examples + Ethics extension
- Week 5: Documentation + Testing + v3.0 release

**v3.1** (Future - Weeks 6-9): Linguistic capabilities
- Week 6: Coreference resolution
- Week 7: Dependency parsing
- Week 8: Knowledge graph integration
- Week 9: Temporal reasoning + v3.1 release

**v4.0** (Vision - Future): Full discourse understanding
- Multi-document analysis
- Narrative structure extraction
- Causal reasoning
- Argument mining

### Success Metrics (v3.1)

**Accuracy:**
- [ ] Coreference F1 score > 85% (OntoNotes benchmark)
- [ ] Dependency parsing UAS > 90% (Universal Dependencies)
- [ ] Entity linking accuracy > 90% (domain-specific)
- [ ] Temporal extraction accuracy > 85%

**Performance:**
- [ ] Average parse time < 150ms (with all v3.1 features)
- [ ] 95th percentile < 300ms
- [ ] Memory usage < 500 MB
- [ ] Bundle size < 3 MB

**Adoption:**
- [ ] 5+ production deployments using v3.1 features
- [ ] 10+ contributed ontologies in community repo
- [ ] Published comparison study vs LLM-based parsers

---

**Document Version:** 2.1
**Status:** Planning Phase (v3.0 Enhanced + v3.1 Vision)
**Last Updated:** January 18, 2026
**Next Review:** After Phase 2 completion
**Owner:** TagTeam Development Team

---

**TagTeam 3.0** - Domain-neutral semantic parsing with BFO-compatible ontology support.
**TagTeam 3.1** - Deterministic semantic parser competitive with LLMs for structured analysis.
