# Ontology Integration Plan: BFO-Compatible Configuration

**Goal:** Make TagTeam ontology-agnostic with pluggable value systems
**Philosophy:** BFO-compatible, user-controlled ontologies
**Version Target:** 3.0.0

---

## Vision

### Current State (v2.0.0)
```javascript
// Hard-coded: Only IEE's 50-value ontology
const result = TagTeam.parse(text);
// Uses: value-definitions-comprehensive.json (embedded in bundle)
```

### Target State (v3.0.0)
```javascript
// User provides their own ontology
TagTeam.loadOntology({
  source: 'url',
  url: 'https://example.org/my-ontology.ttl'
});

// OR: Local file
TagTeam.loadOntology({
  source: 'file',
  path: './ontologies/medical-ethics.ttl'
});

// OR: Custom JSON (backward compatible)
TagTeam.loadOntology({
  source: 'json',
  data: { values: [...], domains: [...] }
});

// Then parse with custom ontology
const result = TagTeam.parse(text);
// Uses: User's ontology, not IEE's
```

---

## Architecture

### Ontology Loader System

**New Component: OntologyLoader.js**

```javascript
/**
 * OntologyLoader - Loads and manages external ontologies
 *
 * Supports:
 * - RDF/TTL files (Turtle format)
 * - OWL files (Web Ontology Language)
 * - JSON-LD (Linked Data)
 * - Custom JSON (TagTeam format)
 * - Remote URLs (HTTP/HTTPS)
 * - Local files (file://)
 */
class OntologyLoader {
  constructor() {
    this.cache = new Map();
    this.parser = new TTLParser();  // Lightweight Turtle parser
    this.currentOntology = null;
  }

  /**
   * Load ontology from various sources
   */
  async load(config) {
    const { source, url, path, data } = config;

    switch (source) {
      case 'url':
        return await this.loadFromURL(url);
      case 'file':
        return await this.loadFromFile(path);
      case 'json':
        return this.loadFromJSON(data);
      case 'ttl':
        return this.loadFromTTL(data);
      default:
        throw new Error(`Unknown source type: ${source}`);
    }
  }

  async loadFromURL(url) {
    // Check cache
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    // Fetch ontology
    const response = await fetch(url);
    const contentType = response.headers.get('content-type');

    let ontology;
    if (contentType.includes('turtle') || url.endsWith('.ttl')) {
      const ttl = await response.text();
      ontology = this.parseTTL(ttl);
    } else if (contentType.includes('json')) {
      const json = await response.json();
      ontology = this.parseJSON(json);
    } else {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    // Cache and return
    this.cache.set(url, ontology);
    return ontology;
  }

  parseTTL(ttlString) {
    // Parse Turtle format
    const triples = this.parser.parse(ttlString);

    // Extract BFO-compatible value definitions
    return this.extractValuesFromTriples(triples);
  }

  extractValuesFromTriples(triples) {
    /**
     * Map BFO/ontology structure to TagTeam format
     *
     * Expected RDF structure:
     *
     * :Autonomy a :EthicalValue ;
     *   rdfs:label "Autonomy" ;
     *   :domain :Dignity ;
     *   :keywords "choice", "freedom", "independence" ;
     *   :upholdingTerms "respecting choice", "enabling freedom" ;
     *   :violatingTerms "restricting choice", "forcing decision" ;
     *   :entails :Respect, :Dignity .
     */

    const values = [];
    const valueMap = new Map();

    // Group triples by subject
    triples.forEach(triple => {
      const { subject, predicate, object } = triple;

      if (!valueMap.has(subject)) {
        valueMap.set(subject, {});
      }

      const value = valueMap.get(subject);

      // Map predicates to TagTeam structure
      switch (predicate) {
        case 'rdf:type':
          if (object === 'EthicalValue' || object === 'bfo:Quality') {
            value.isValue = true;
          }
          break;
        case 'rdfs:label':
          value.name = object;
          break;
        case 'domain':
        case 'bfo:bearerOf':
          value.domain = object;
          break;
        case 'keywords':
        case 'semanticMarkers':
          if (!value.semanticMarkers) value.semanticMarkers = [];
          value.semanticMarkers.push(...object.split(',').map(s => s.trim()));
          break;
        case 'upholdingTerms':
          if (!value.upholdingTerms) value.upholdingTerms = [];
          value.upholdingTerms.push(...object.split(',').map(s => s.trim()));
          break;
        case 'violatingTerms':
          if (!value.violatingTerms) value.violatingTerms = [];
          value.violatingTerms.push(...object.split(',').map(s => s.trim()));
          break;
        case 'entails':
        case 'bfo:precedesTemporally':
          if (!value.entailedValues) value.entailedValues = [];
          value.entailedValues.push(object);
          break;
      }
    });

    // Convert map to array
    valueMap.forEach((value, iri) => {
      if (value.isValue) {
        values.push({
          iri: iri,
          name: value.name || iri.split('#').pop(),
          domain: value.domain || 'General',
          semanticMarkers: value.semanticMarkers || [],
          upholdingTerms: value.upholdingTerms || [],
          violatingTerms: value.violatingTerms || [],
          entailedValues: value.entailedValues || []
        });
      }
    });

    return {
      values: values,
      source: 'ttl',
      bfoCompatible: true
    };
  }

  parseJSON(json) {
    // Handle JSON-LD or custom JSON
    if (json['@context']) {
      return this.parseJSONLD(json);
    } else {
      return this.parseCustomJSON(json);
    }
  }

  parseCustomJSON(json) {
    // TagTeam native format (backward compatible)
    return {
      values: json.values || [],
      domains: json.domains || [],
      source: 'json',
      bfoCompatible: false
    };
  }
}
```

---

## Configuration System

### configuration.json

**Location:** Project root or user-specified path

```json
{
  "version": "3.0",
  "ontology": {
    "source": "url",
    "url": "https://integralethics.org/ontologies/iee-values-v2.ttl",
    "fallback": "./ontologies/default.json",
    "cache": true,
    "cacheExpiry": 86400000
  },
  "domains": {
    "source": "file",
    "path": "./ontologies/domains/"
  },
  "frameMappings": {
    "source": "url",
    "url": "https://integralethics.org/ontologies/frame-mappings.json"
  },
  "conflictPairs": {
    "source": "file",
    "path": "./ontologies/conflicts.ttl"
  },
  "options": {
    "autoDetectDomain": true,
    "multiOntology": false,
    "strictBFO": false,
    "validateOntology": true
  }
}
```

### Alternative: Embedded in HTML

```html
<script src="tagteam.js"></script>
<script>
  TagTeam.configure({
    ontology: {
      source: 'url',
      url: 'https://example.org/my-ontology.ttl'
    }
  });

  // Now parse with custom ontology
  const result = TagTeam.parse("The doctor must decide...");
</script>
```

### Alternative: Programmatic

```javascript
// 1. Load from URL
await TagTeam.loadOntology({
  source: 'url',
  url: 'https://bioportal.bioontology.org/ontologies/APOLLO_SV'
});

// 2. Load from local file
await TagTeam.loadOntology({
  source: 'file',
  path: './my-ethics.ttl'
});

// 3. Load from JSON
await TagTeam.loadOntology({
  source: 'json',
  data: {
    values: [
      {
        name: "Autonomy",
        domain: "Dignity",
        semanticMarkers: ["choice", "freedom"],
        upholdingTerms: ["respecting choice"],
        violatingTerms: ["forcing decision"]
      }
    ]
  }
});

// 4. Load multiple ontologies (merge)
await TagTeam.loadOntologies([
  { source: 'url', url: 'https://example.org/base.ttl' },
  { source: 'file', path: './extensions.ttl' }
], { merge: true });
```

---

## BFO Compatibility Layer

### BFO Mapping

**What is BFO?**
- Basic Formal Ontology (ISO/IEC 21838-2)
- Top-level ontology for scientific research
- Used by: OBI, IDO, OGMS, etc.

**BFO Core Classes We Support:**
```turtle
# Continuant (things that persist)
bfo:Entity
bfo:Quality         # Maps to: Ethical Values
bfo:Disposition     # Maps to: Value tendencies
bfo:Role            # Maps to: Semantic roles (Agent, Patient)

# Occurrent (things that happen)
bfo:Process         # Maps to: Actions, semantic frames
bfo:ProcessBoundary # Maps to: Decision points

# Relations
bfo:bearerOf        # Entity bears Quality (person has autonomy)
bfo:participatesIn  # Entity participates in Process
bfo:precedesTemporally  # One value entails another
```

### Example: BFO-Compatible Ontology

**File: medical-ethics-bfo.ttl**

```turtle
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix bfo: <http://purl.obolibrary.org/obo/BFO_> .
@prefix ethics: <https://integralethics.org/ontology#> .

# Define Autonomy as a BFO Quality
ethics:Autonomy a bfo:0000019 ;  # bfo:Quality
    rdfs:label "Autonomy" ;
    rdfs:comment "The capacity for self-determination and independent decision-making" ;
    ethics:domain ethics:Dignity ;
    ethics:keywords "choice, freedom, independence, self-determination, autonomy" ;
    ethics:upholdingTerms "respecting choice, enabling freedom, supporting independence" ;
    ethics:violatingTerms "forcing decision, restricting choice, removing autonomy" ;
    ethics:entails ethics:Respect, ethics:Dignity .

# Define Beneficence as a BFO Quality
ethics:Beneficence a bfo:0000019 ;
    rdfs:label "Beneficence" ;
    rdfs:comment "The obligation to act for the benefit of others" ;
    ethics:domain ethics:Care ;
    ethics:keywords "benefit, help, improve, promote wellbeing" ;
    ethics:upholdingTerms "helping patient, improving outcomes, promoting health" ;
    ethics:violatingTerms "withholding benefit, refusing to help" ;
    ethics:entails ethics:Compassion, ethics:Care .

# Define Decision as a BFO Process
ethics:DecisionMaking a bfo:0000015 ;  # bfo:Process
    rdfs:label "Decision Making" ;
    rdfs:comment "The process of making a choice among alternatives" ;
    ethics:invokesValue ethics:Autonomy ;
    ethics:invokesValue ethics:Wisdom ;
    ethics:frameBoost "Autonomy:0.3, Wisdom:0.2" .

# Define conflict relationship
ethics:ConflictsWith a rdf:Property ;
    rdfs:label "Conflicts With" ;
    rdfs:comment "Indicates potential tension between values" .

ethics:Autonomy ethics:ConflictsWith ethics:Beneficence ;
    ethics:severity "high" ;
    rdfs:comment "Classic tension: respecting choice vs doing what's best" .

# Define domain hierarchy
ethics:Dignity a ethics:ValueDomain ;
    rdfs:label "Dignity Domain" ;
    rdfs:comment "Values related to human worth and respect" ;
    ethics:includes ethics:Autonomy, ethics:Justice, ethics:HumanRights .

ethics:Care a ethics:ValueDomain ;
    rdfs:label "Care Domain" ;
    rdfs:comment "Values related to compassion and wellbeing" ;
    ethics:includes ethics:Beneficence, ethics:Compassion, ethics:NonMaleficence .
```

### Loading BFO Ontology

```javascript
// Load BFO-compatible ontology
await TagTeam.loadOntology({
  source: 'url',
  url: 'https://integralethics.org/ontologies/medical-ethics-bfo.ttl',
  format: 'turtle',
  validateBFO: true  // Ensure BFO compliance
});

// Parse text
const result = TagTeam.parse("The doctor must decide whether to continue treatment");

// Result uses custom ontology
console.log(result.ethicalProfile.values);
// Uses values from medical-ethics-bfo.ttl
```

---

## Multi-Ontology Support

### Use Case: Combining Ontologies

```javascript
// Load base ontology
await TagTeam.loadOntology({
  source: 'url',
  url: 'https://example.org/base-ethics.ttl',
  namespace: 'base'
});

// Add domain-specific extension
await TagTeam.loadOntology({
  source: 'url',
  url: 'https://example.org/medical-extension.ttl',
  namespace: 'medical',
  merge: true  // Merge with base
});

// Add organization-specific values
await TagTeam.loadOntology({
  source: 'file',
  path: './company-values.json',
  namespace: 'company',
  merge: true
});

// Now parse with combined ontology (base + medical + company)
const result = TagTeam.parse(text);
```

### Namespace Management

```javascript
// Query which ontologies are loaded
const ontologies = TagTeam.getLoadedOntologies();
console.log(ontologies);
// Output:
// [
//   { namespace: 'base', source: 'https://...', valueCount: 50 },
//   { namespace: 'medical', source: 'https://...', valueCount: 30 },
//   { namespace: 'company', source: 'file://...', valueCount: 10 }
// ]

// Use specific ontology
const result = TagTeam.parse(text, {
  ontology: 'medical'  // Only use medical ontology
});

// Use multiple ontologies
const result = TagTeam.parse(text, {
  ontologies: ['base', 'medical']  // Use both
});
```

---

## Directory Structure for Ontologies

### Recommended Structure

```
project/
├── ontologies/
│   ├── base/
│   │   ├── values.ttl              # Base value definitions
│   │   ├── domains.ttl             # Domain hierarchy
│   │   ├── frames.ttl              # Semantic frame mappings
│   │   └── conflicts.ttl           # Conflict pairs
│   │
│   ├── domains/
│   │   ├── medical/
│   │   │   ├── medical-values.ttl  # Medical-specific values
│   │   │   ├── medical-frames.ttl  # Medical semantic frames
│   │   │   └── medical-lexicon.json
│   │   ├── legal/
│   │   │   └── legal-values.ttl
│   │   └── business/
│   │       └── business-values.ttl
│   │
│   ├── custom/
│   │   └── my-organization.json    # Organization-specific
│   │
│   └── configuration.json          # Main config
│
└── src/
    └── OntologyLoader.js
```

### Configuration for Directory Structure

```json
{
  "version": "3.0",
  "ontologies": {
    "base": {
      "source": "directory",
      "path": "./ontologies/base/",
      "format": "turtle",
      "autoload": true
    },
    "medical": {
      "source": "directory",
      "path": "./ontologies/domains/medical/",
      "format": "turtle",
      "autoload": false
    },
    "custom": {
      "source": "file",
      "path": "./ontologies/custom/my-organization.json",
      "format": "json",
      "autoload": true
    }
  },
  "defaultOntology": "base",
  "allowMerge": true
}
```

---

## Implementation Plan

### Phase 1: TTL Parser (Week 1)

**Goal:** Parse Turtle (TTL) format ontologies

**Tasks:**
- [ ] Research lightweight TTL parsers (N3.js, rdflib.js)
- [ ] Implement or integrate TTL parser
- [ ] Test with sample BFO ontologies
- [ ] Optimize for browser (bundle size concern)
- [ ] Create parser tests

**Deliverable:** TTLParser class that converts TTL → TagTeam format

### Phase 2: OntologyLoader (Week 1-2)

**Goal:** Load ontologies from various sources

**Tasks:**
- [ ] Implement OntologyLoader class
- [ ] Support URL loading (fetch)
- [ ] Support file loading (Node.js fs, browser File API)
- [ ] Support JSON format (backward compatible)
- [ ] Implement caching system
- [ ] Error handling and validation

**Deliverable:** OntologyLoader.js component

### Phase 3: BFO Mapping (Week 2)

**Goal:** Map BFO constructs to TagTeam structures

**Tasks:**
- [ ] Define BFO → TagTeam mapping rules
- [ ] Implement extractValuesFromTriples
- [ ] Support bfo:Quality → EthicalValue
- [ ] Support bfo:Process → SemanticFrame
- [ ] Support bfo:Role → Agent/Patient
- [ ] Test with real BFO ontologies

**Deliverable:** BFO compatibility layer

### Phase 4: Configuration System (Week 2-3)

**Goal:** Flexible configuration for ontology sources

**Tasks:**
- [ ] Design configuration.json schema
- [ ] Implement config loader
- [ ] Support multiple configuration sources
- [ ] API for programmatic configuration
- [ ] Environment variable support
- [ ] Validation and error messages

**Deliverable:** Configuration system + docs

### Phase 5: Multi-Ontology Support (Week 3)

**Goal:** Load and merge multiple ontologies

**Tasks:**
- [ ] Namespace management
- [ ] Ontology merging logic
- [ ] Conflict resolution (duplicate values)
- [ ] Query loaded ontologies
- [ ] Switch between ontologies

**Deliverable:** Multi-ontology manager

### Phase 6: Integration & Testing (Week 3-4)

**Goal:** Integrate with existing TagTeam components

**Tasks:**
- [ ] Update ValueMatcher to use custom ontologies
- [ ] Update ValueScorer to use custom frames
- [ ] Update EthicalProfiler to use custom conflicts
- [ ] Create sample ontologies (BFO, medical, legal)
- [ ] Test with Week 2 corpus
- [ ] Performance testing
- [ ] Bundle size analysis

**Deliverable:** Fully integrated system

### Phase 7: Documentation (Week 4)

**Goal:** Complete documentation for ontology system

**Tasks:**
- [ ] API reference (loadOntology, configure)
- [ ] TTL format guide (how to create ontologies)
- [ ] BFO mapping guide
- [ ] Migration guide (v2.0 → v3.0)
- [ ] Example ontologies
- [ ] Tutorial: "Create your own ontology"

**Deliverable:** Comprehensive docs

---

## API Design

### TagTeam.loadOntology()

```javascript
/**
 * Load external ontology
 *
 * @param {Object} config - Ontology configuration
 * @param {string} config.source - Source type: 'url', 'file', 'json', 'ttl'
 * @param {string} [config.url] - URL for remote ontology
 * @param {string} [config.path] - Path for local file
 * @param {Object} [config.data] - Inline data (JSON or TTL string)
 * @param {string} [config.format] - Format: 'turtle', 'json', 'jsonld', 'owl'
 * @param {string} [config.namespace] - Namespace identifier
 * @param {boolean} [config.merge] - Merge with existing ontology
 * @param {boolean} [config.validateBFO] - Validate BFO compliance
 * @param {boolean} [config.cache] - Enable caching
 * @returns {Promise<Ontology>} Loaded ontology object
 */
async function loadOntology(config) {
  // Implementation
}
```

### TagTeam.configure()

```javascript
/**
 * Configure TagTeam with custom settings
 *
 * @param {Object} config - Configuration object
 * @param {Object} [config.ontology] - Ontology configuration
 * @param {Object} [config.domains] - Domain-specific settings
 * @param {Object} [config.options] - General options
 * @returns {TagTeam} TagTeam instance (for chaining)
 */
function configure(config) {
  // Implementation
}
```

### TagTeam.getLoadedOntologies()

```javascript
/**
 * Get list of loaded ontologies
 *
 * @returns {Array<Object>} Array of ontology metadata
 */
function getLoadedOntologies() {
  // Implementation
}
```

### TagTeam.parse() Enhanced

```javascript
/**
 * Parse text with custom ontology
 *
 * @param {string} text - Text to parse
 * @param {Object} [options] - Parse options
 * @param {string|Array<string>} [options.ontology] - Ontology namespace(s) to use
 * @param {string} [options.domain] - Domain hint (medical, legal, etc.)
 * @param {boolean} [options.debug] - Enable debug mode
 * @returns {Object} Semantic analysis result
 */
function parse(text, options = {}) {
  // Implementation
}
```

---

## Example: Complete Workflow

### 1. Create Custom Ontology (TTL)

**File: my-values.ttl**

```turtle
@prefix ethics: <https://myorg.org/ontology#> .
@prefix bfo: <http://purl.obolibrary.org/obo/BFO_> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

# Define custom value
ethics:Innovation a bfo:0000019 ;
    rdfs:label "Innovation" ;
    ethics:domain ethics:Progress ;
    ethics:keywords "innovation, creativity, novel, breakthrough" ;
    ethics:upholdingTerms "fostering innovation, encouraging creativity" ;
    ethics:violatingTerms "blocking innovation, stifling creativity" .

ethics:Tradition a bfo:0000019 ;
    rdfs:label "Tradition" ;
    ethics:domain ethics:Community ;
    ethics:keywords "tradition, heritage, established, proven" ;
    ethics:upholdingTerms "honoring tradition, preserving heritage" ;
    ethics:violatingTerms "abandoning tradition, disregarding heritage" .

# Define conflict
ethics:Innovation ethics:ConflictsWith ethics:Tradition ;
    ethics:severity "moderate" .
```

### 2. Load Ontology

```javascript
// Load custom ontology
await TagTeam.loadOntology({
  source: 'file',
  path: './ontologies/my-values.ttl',
  format: 'turtle',
  validateBFO: true
});
```

### 3. Use Custom Ontology

```javascript
// Parse with custom values
const result = TagTeam.parse(
  "We must balance innovation with respect for established practices"
);

console.log(result.ethicalProfile.values);
// Output:
// [
//   { name: "Innovation", salience: 0.6, polarity: 1, ... },
//   { name: "Tradition", salience: 0.5, polarity: 1, ... }
// ]

console.log(result.ethicalProfile.conflicts);
// Output:
// [
//   { value1: "Innovation", value2: "Tradition", tension: 0.55, source: "predefined" }
// ]
```

---

## Bundle Size Considerations

### Minimal Approach (No Parser in Bundle)

**Option 1: External Parser**
```javascript
// User provides parser library
<script src="https://cdn.jsdelivr.net/npm/n3@1.16.0/browser/n3.min.js"></script>
<script src="tagteam.js"></script>
<script>
  TagTeam.setTTLParser(N3);  // Use external parser
  await TagTeam.loadOntology({ ... });
</script>
```

**Bundle Impact:** 0 KB (parser not included)

### Included Approach (Lightweight Parser)

**Option 2: Minimal TTL Parser**
- Custom lightweight parser (~20-30 KB minified)
- Only supports needed TTL features
- Embedded in TagTeam bundle

**Bundle Impact:** +25-35 KB

### Hybrid Approach (Recommended)

**Option 3: Lazy Load Parser**
```javascript
// Parser loaded on-demand
await TagTeam.loadOntology({
  source: 'url',
  url: '...',
  format: 'turtle'
});
// Automatically fetches parser if not present
// <script src="https://cdn.jsdelivr.net/npm/@tagteam/ttl-parser@1.0.0"></script>
```

**Bundle Impact:** 0 KB (lazy loaded when needed)

---

## Backward Compatibility

### v2.0 Code Still Works

```javascript
// v2.0 code (embedded IEE ontology)
const result = TagTeam.parse(text);
// Works exactly as before

// v3.0 code (custom ontology)
await TagTeam.loadOntology({ source: 'url', url: '...' });
const result = TagTeam.parse(text);
// Uses custom ontology
```

### Migration Path

```javascript
// Step 1: Extract embedded ontology to TTL
TagTeam.exportOntology({
  format: 'turtle',
  output: './iee-values-v2.ttl'
});

// Step 2: Customize the TTL file
// Edit ./iee-values-v2.ttl with your changes

// Step 3: Load customized ontology
await TagTeam.loadOntology({
  source: 'file',
  path: './iee-values-v2.ttl'
});
```

---

## Testing Strategy

### Unit Tests

- [ ] TTL parser correctness
- [ ] BFO mapping accuracy
- [ ] Ontology merging logic
- [ ] Configuration loading
- [ ] URL fetching (with mocks)

### Integration Tests

- [ ] Load real BFO ontologies
- [ ] Parse with custom ontologies
- [ ] Multi-ontology scenarios
- [ ] Performance with large ontologies

### Sample Ontologies for Testing

- [ ] IEE 50-value ontology (baseline)
- [ ] Medical ethics (BFO-compatible)
- [ ] Legal ethics (custom)
- [ ] Business ethics (minimal)
- [ ] Conflict test (overlapping values)

---

## Documentation Structure

### User Guide

1. **Quick Start**
   - Load ontology from URL
   - Load ontology from file
   - Use custom JSON

2. **Creating Ontologies**
   - TTL format guide
   - BFO compatibility
   - Value definitions
   - Domain hierarchy
   - Conflict specification

3. **Advanced Usage**
   - Multi-ontology
   - Namespace management
   - Dynamic loading
   - Validation

4. **Migration**
   - v2.0 → v3.0 guide
   - Export existing ontology
   - Update configuration

### API Reference

- `TagTeam.loadOntology(config)`
- `TagTeam.configure(config)`
- `TagTeam.getLoadedOntologies()`
- `TagTeam.parse(text, options)`
- `TagTeam.exportOntology(options)`

### Examples

- Basic URL loading
- Local file loading
- JSON format (legacy)
- Multi-ontology merging
- BFO-compatible ontology
- Organization-specific values

---

## Timeline

### Fast Track (3 weeks)
- Week 1: TTL Parser + OntologyLoader
- Week 2: BFO Mapping + Configuration
- Week 3: Integration + Testing + Docs

### Thorough (5 weeks)
- Week 1: Research + TTL Parser
- Week 2: OntologyLoader + Caching
- Week 3: BFO Mapping + Multi-ontology
- Week 4: Configuration + Integration
- Week 5: Testing + Documentation + Examples

---

## Questions to Resolve

1. **Parser choice?**
   - Bundle lightweight parser (+30 KB)?
   - External dependency (N3.js)?
   - Lazy load on-demand?

2. **Bundle size limit?**
   - Strict 5 MB?
   - Flexible 6 MB?
   - Modular (core + ontology module)?

3. **BFO validation strictness?**
   - Strict (reject non-BFO)?
   - Lenient (warn but accept)?
   - Optional (user choice)?

4. **Default behavior?**
   - Keep IEE ontology as default?
   - Require user to provide ontology?
   - Support both modes?

5. **Online vs offline?**
   - Support both URL and file?
   - Cache remote ontologies?
   - Offline-first approach?

---

## My Recommendation

**Approach:** Hybrid lazy-loading with backward compatibility

**Why:**
1. **Zero bundle impact** - Parser loaded only when needed
2. **Backward compatible** - v2.0 code works unchanged
3. **Maximum flexibility** - Supports URL, file, JSON, TTL
4. **BFO-compatible** - Ready for scientific ontologies
5. **User-friendly** - Simple API, good docs

**Implementation Order:**
1. Week 1: Configuration system + JSON support (no TTL yet)
2. Week 2: TTL parser + BFO mapping
3. Week 3: Multi-ontology + testing

**What do you think?** Should we proceed with this plan?
