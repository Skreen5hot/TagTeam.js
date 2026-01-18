# TagTeam 3.0 Roadmap: Domain-Neutral Semantic Parser

**Status**: Planning Phase
**Version**: 3.0.0
**Philosophy**: Ontology-agnostic, BFO-compatible, multi-domain
**Date**: January 18, 2026

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
│   ├── PatternMatcher.js          # Pattern matching engine
│   └── SemanticRoleExtractor.js   # Semantic role extraction
│
├── ontology/                      # NEW: Ontology system (ALWAYS included)
│   ├── OntologyManager.js         # Load/cache/manage ontologies
│   ├── TTLParser.js               # Parse Turtle format
│   ├── ConceptMatcher.js          # Match text → ontology concepts
│   └── BFOMapper.js               # Map BFO constructs to TagTeam
│
├── storage/                       # NEW: Cross-platform caching (ALWAYS included)
│   ├── StorageAdapter.js          # Factory + interface
│   ├── IndexedDBAdapter.js        # Browser persistent storage
│   ├── FileSystemAdapter.js       # Node.js filesystem cache
│   └── MemoryAdapter.js           # Fallback (session-only)
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
| **TTLParser** | N/A | Core (NEW) | Parse Turtle format |
| **BFOMapper** | N/A | Core (NEW) | BFO compatibility |

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

**Goal:** Cross-platform storage infrastructure

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

### Phase 2: TTL Parser (Week 2) 🔄 **IN PROGRESS**

**Goal:** Parse Turtle format ontologies

**Tasks:**
- [ ] Research lightweight TTL parsers (N3.js, rdflib.js, custom)
- [ ] Implement or integrate TTL parser
- [ ] Extract concepts from RDF triples
- [ ] Support rdfs:label, skos:altLabel, skos:prefLabel
- [ ] Support custom predicates (ethics:semanticMarkers, etc.)
- [ ] Test with BFO, IAO, OMRSE ontologies
- [ ] Optimize for browser (bundle size)
- [ ] Create parser tests

**Deliverable:**
- `src/ontology/TTLParser.js` (~20-30 KB)

**Decision Points:**
1. **Parser choice**: Bundle lightweight parser, use external dependency, or lazy-load?
2. **Custom predicate support**: Which predicates to support beyond standard RDF/RDFS/SKOS?

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

### Phase 4: BFO Mapping (Week 3)

**Goal:** Map BFO constructs to TagTeam structures

**Tasks:**
- [ ] Define BFO → TagTeam mapping rules
- [ ] Implement `extractConceptsFromTriples()`
- [ ] Support bfo:Quality → Concept
- [ ] Support bfo:Process → SemanticFrame
- [ ] Support bfo:Role → Agent/Patient
- [ ] Test with real BFO ontologies (BFO, IAO, OMRSE)
- [ ] Document BFO mapping

**Deliverable:**
- `src/ontology/BFOMapper.js`

### Phase 5: ConceptMatcher (Week 3)

**Goal:** Match text to ontology concepts (domain-neutral)

**Tasks:**
- [ ] Rename ValueMatcher → ConceptMatcher
- [ ] Refactor for domain-neutral operation
- [ ] Support custom semantic markers
- [ ] Support polarity detection (present/absent)
- [ ] Calculate salience scores
- [ ] Test with multiple domains (ethics, medical, legal)

**Deliverable:**
- `src/ontology/ConceptMatcher.js` (refactored from ValueMatcher)

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

## Questions to Resolve

### 1. TTL Parser Choice

**Options:**
- A) Bundle lightweight custom parser (+25-30 KB)
- B) External dependency (N3.js) (0 KB, user provides)
- C) Lazy-load on-demand (0 KB initially, fetch when needed)

**Recommendation:** Start with option C (lazy-load), provide option B for advanced users

### 2. Custom Predicate Support

**Standard predicates** (always support):
- `rdfs:label`, `skos:altLabel`, `skos:prefLabel`
- `rdfs:comment`
- `rdf:type`

**Custom predicates** (optional, configurable):
- `ethics:semanticMarkers` → concept keywords
- `ethics:upholdingTerms` → positive indicators
- `ethics:violatingTerms` → negative indicators
- `ethics:domain` → domain assignment
- `iee:worldview` → worldview mapping (IEE-specific)
- `iee:grounding` → worldview explanation (IEE-specific)

**Recommendation:** Support standard predicates in core, allow custom predicate configuration

### 3. Default Behavior

**Options:**
- A) Require user to load ontology (strict, no defaults)
- B) Include minimal default ontology (convenience)
- C) Backward compatible (IEE ontology as default for v2.0 users)

**Recommendation:** Option C (backward compatible) with clear migration path to option A

### 4. Bundle Modularization

**Options:**
- A) Single bundle with tree-shaking
- B) Separate core + extensions
- C) Full modularization (lexicon separate, parser separate, etc.)

**Recommendation:** Option B (core + extensions) for v3.0, consider C for v4.0

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

**Document Version:** 1.0
**Status:** Planning Phase
**Next Review:** After Phase 2 completion
**Owner:** TagTeam Development Team

---

**TagTeam 3.0** - Domain-neutral semantic parsing with BFO-compatible ontology support.
