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

### Cross-Platform Storage System

**Challenge:** How to persist parsed ontologies in both browser (IndexedDB) and Node.js (filesystem)?

**Solution:** Storage Adapter Pattern with automatic environment detection

#### Storage Abstraction Layer

```javascript
/**
 * StorageAdapter - Cross-platform storage abstraction
 *
 * Automatically selects the best storage backend:
 * - Browser: IndexedDB (persistent across page reloads)
 * - Node.js: File System (.tagteam-cache/ directory)
 * - Fallback: In-Memory Map (session only)
 */
class StorageAdapter {
    static create(options = {}) {
        // Auto-detect environment
        if (typeof window !== 'undefined' && window.indexedDB) {
            return new IndexedDBAdapter(options);
        } else if (typeof process !== 'undefined' && process.versions.node) {
            return new FileSystemAdapter(options);
        } else {
            return new MemoryAdapter(options); // Fallback
        }
    }
}
```

#### Browser Implementation: IndexedDB

```javascript
class IndexedDBAdapter {
    constructor(options) {
        this.dbName = options.dbName || 'TagTeamOntologies';
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('ontologies')) {
                    db.createObjectStore('ontologies', { keyPath: 'url' });
                }
            };
        });
    }

    async get(key) {
        const tx = this.db.transaction(['ontologies'], 'readonly');
        const store = tx.objectStore('ontologies');
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result?.data);
            request.onerror = () => reject(request.error);
        });
    }

    async set(key, value, metadata = {}) {
        const tx = this.db.transaction(['ontologies'], 'readwrite');
        const store = tx.objectStore('ontologies');
        return new Promise((resolve, reject) => {
            const request = store.put({
                url: key,
                data: value,
                timestamp: Date.now(),
                ...metadata
            });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async delete(key) {
        const tx = this.db.transaction(['ontologies'], 'readwrite');
        return tx.objectStore('ontologies').delete(key);
    }
}
```

#### Node.js Implementation: File System

```javascript
class FileSystemAdapter {
    constructor(options) {
        const fs = require('fs');
        const path = require('path');
        this.fs = fs;
        this.path = path;
        this.cacheDir = options.cacheDir || path.join(process.cwd(), '.tagteam-cache');
    }

    async init() {
        // Create cache directory if it doesn't exist
        if (!this.fs.existsSync(this.cacheDir)) {
            this.fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    async get(key) {
        const fileName = this._sanitizeKey(key);
        const filePath = this.path.join(this.cacheDir, `${fileName}.json`);

        if (!this.fs.existsSync(filePath)) {
            return null;
        }

        const content = this.fs.readFileSync(filePath, 'utf8');
        const cached = JSON.parse(content);

        // Check TTL (time-to-live)
        if (cached.ttl && Date.now() - cached.timestamp > cached.ttl) {
            this.fs.unlinkSync(filePath); // Expired
            return null;
        }

        return cached.data;
    }

    async set(key, value, metadata = {}) {
        const fileName = this._sanitizeKey(key);
        const filePath = this.path.join(this.cacheDir, `${fileName}.json`);

        const cacheEntry = {
            url: key,
            data: value,
            timestamp: Date.now(),
            ...metadata
        };

        this.fs.writeFileSync(filePath, JSON.stringify(cacheEntry, null, 2), 'utf8');
    }

    async delete(key) {
        const fileName = this._sanitizeKey(key);
        const filePath = this.path.join(this.cacheDir, `${fileName}.json`);
        if (this.fs.existsSync(filePath)) {
            this.fs.unlinkSync(filePath);
        }
    }

    _sanitizeKey(key) {
        // Convert URL/path to safe filename
        return key.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }
}
```

#### Fallback: In-Memory Storage

```javascript
class MemoryAdapter {
    constructor() {
        this.cache = new Map();
    }

    async init() {
        // No-op
    }

    async get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check TTL
        if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    async set(key, value, metadata = {}) {
        this.cache.set(key, {
            data: value,
            timestamp: Date.now(),
            ...metadata
        });
    }

    async delete(key) {
        this.cache.delete(key);
    }
}
```

### Ontology Manager with Three-Tier Caching

**New Component: OntologyManager.js**

```javascript
/**
 * OntologyManager - Unified ontology loading with cross-platform caching
 *
 * Three-tier cache architecture:
 * 1. Memory cache (fastest, both environments)
 * 2. Persistent storage (IndexedDB/FileSystem, survives restarts)
 * 3. Network/disk fetch (slowest, original source)
 */
class OntologyManager {
    constructor(options = {}) {
        this.storage = StorageAdapter.create(options.storage);
        this.memoryCache = new Map(); // Hot cache for both environments
        this.baseValues = null;       // Built-in values from bundle
        this.ttlParser = new TTLParser();
    }

    async init(baseValues) {
        await this.storage.init();
        this.baseValues = baseValues;
    }

    async loadOntology(source) {
        const cacheKey = source.url || source.path;

        // 1. Check hot memory cache first (fastest - ~0ms)
        if (this.memoryCache.has(cacheKey)) {
            console.log(`✅ Loaded from memory: ${cacheKey}`);
            return this.memoryCache.get(cacheKey);
        }

        // 2. Check persistent storage (fast - ~5-10ms)
        if (source.cache !== 'memory') {
            const cached = await this.storage.get(cacheKey);
            if (cached && !source.forceRefresh) {
                console.log(`✅ Loaded from persistent cache: ${cacheKey}`);
                this.memoryCache.set(cacheKey, cached);
                return cached;
            }
        }

        // 3. Fetch and parse from source (slow - ~50-500ms)
        console.log(`📥 Fetching and parsing: ${cacheKey}`);
        const ontology = await this.fetchAndParse(source);

        // 4. Store in persistent cache (if requested)
        if (source.cache === 'indexeddb' || source.cache === 'filesystem') {
            await this.storage.set(cacheKey, ontology, {
                ttl: source.ttl || 86400000 // Default 24 hours
            });
        }

        // 5. Always cache in memory for this session
        this.memoryCache.set(cacheKey, ontology);

        return ontology;
    }

    async fetchAndParse(source) {
        let content;

        if (source.url) {
            // Fetch from URL (works in both browser and Node.js)
            const response = await fetch(source.url);
            content = await response.text();
        } else if (source.path) {
            // Read from file (Node.js only)
            if (typeof process !== 'undefined' && process.versions.node) {
                const fs = require('fs');
                content = fs.readFileSync(source.path, 'utf8');
            } else {
                throw new Error('File system access not available in browser');
            }
        } else if (source.data) {
            // Inline data
            content = source.data;
        }

        // Parse based on format
        if (source.format === 'ttl') {
            return this.parseTTL(content);
        } else if (source.format === 'json') {
            return JSON.parse(content);
        }
    }

    parseTTL(ttlString) {
        // Parse Turtle format
        const triples = this.ttlParser.parse(ttlString);

        // Extract BFO-compatible value definitions
        return this.extractValuesFromTriples(triples);
    }

    getAllValues() {
        // Merge base values + all loaded ontologies
        const allValues = [...this.baseValues.values];

        this.memoryCache.forEach(ontology => {
            allValues.push(...ontology.values);
        });

        return allValues;
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
  "storage": {
    "cacheDir": "./.tagteam-cache",
    "dbName": "TagTeamOntologies"
  },
  "ontology": {
    "sources": [
      {
        "url": "https://integralethics.org/ontologies/iee-values-v2.ttl",
        "format": "ttl",
        "cache": "indexeddb",
        "ttl": 86400000
      },
      {
        "path": "./ontologies/custom-values.ttl",
        "format": "ttl",
        "cache": "memory"
      }
    ],
    "fallback": "./ontologies/default.json"
  },
  "options": {
    "autoDetectDomain": true,
    "multiOntology": true,
    "strictBFO": false,
    "validateOntology": true
  }
}
```

**Cache Strategy Options:**
- `"memory"` - Session only, lost on page refresh (fast, no persistence)
- `"indexeddb"` - Browser persistent storage (auto-converts to "filesystem" in Node.js)
- `"filesystem"` - Node.js only, creates `.tagteam-cache/` directory

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

## Cross-Platform Usage Examples

### Browser Usage

```html
<!DOCTYPE html>
<html>
<head>
  <script src="tagteam.js"></script>
</head>
<body>
  <script>
    (async () => {
      // Load configuration
      const config = await fetch('configuration.json').then(r => r.json());

      // Initialize ontology manager (uses IndexedDB automatically)
      const ontologyMgr = new OntologyManager(config);
      await ontologyMgr.init(BUILTIN_VALUES);

      // Load ontologies from config
      for (const source of config.ontology.sources) {
        await ontologyMgr.loadOntology(source);
      }

      // First load: Fetches from network, stores in IndexedDB
      // Subsequent loads: Instant from IndexedDB

      // Parse with custom ontology
      const result = TagTeam.parse("The doctor must decide...");
      console.log(result.ethicalProfile.detectedValues);
    })();
  </script>
</body>
</html>
```

**What happens:**
1. Fetches configuration.json
2. Creates OntologyManager with IndexedDBAdapter
3. Loads ontology from URL (cached in IndexedDB)
4. On page refresh: Loads instantly from IndexedDB (no network request)

### Node.js Usage

```javascript
// Node.js script
const fs = require('fs');
const TagTeam = require('./dist/tagteam.js');

(async () => {
  // Load configuration
  const config = JSON.parse(fs.readFileSync('configuration.json', 'utf8'));

  // Initialize ontology manager (uses FileSystem automatically)
  const ontologyMgr = new OntologyManager(config);
  await ontologyMgr.init(BUILTIN_VALUES);

  // Load ontologies from config
  for (const source of config.ontology.sources) {
    await ontologyMgr.loadOntology(source);
  }

  // First run: Fetches from URL/file, stores in .tagteam-cache/
  // Subsequent runs: Instant from .tagteam-cache/

  // Parse with custom ontology
  const result = TagTeam.parse("The doctor must decide...");
  console.log(result.ethicalProfile.detectedValues);
})();
```

**What happens:**
1. Reads configuration.json from filesystem
2. Creates OntologyManager with FileSystemAdapter
3. Loads ontology from URL (cached in .tagteam-cache/)
4. On subsequent runs: Loads instantly from .tagteam-cache/ (no network request)

**Cache directory structure:**
```
.tagteam-cache/
├── https___integralethics_org_ontologies_iee_values_v2_ttl.json
└── _ontologies_custom_values_ttl.json
```

### Unified API Example (Works in Both)

```javascript
// Same code works in browser and Node.js!
const config = {
  storage: {
    cacheDir: './.tagteam-cache',  // Only used in Node.js
    dbName: 'TagTeamOntologies'    // Only used in browser
  },
  ontology: {
    sources: [
      {
        url: 'https://example.org/medical-ethics.ttl',
        format: 'ttl',
        cache: 'indexeddb',  // Auto-converts to 'filesystem' in Node.js
        ttl: 86400000        // 24 hours
      },
      {
        path: './ontologies/custom.ttl',
        format: 'ttl',
        cache: 'memory'  // No persistence in either environment
      }
    ]
  }
};

const ontologyMgr = new OntologyManager(config);
await ontologyMgr.init(BUILTIN_VALUES);

for (const source of config.ontology.sources) {
  await ontologyMgr.loadOntology(source);
}

// Now parse with merged ontology (built-in + custom)
const result = TagTeam.parse(text);
```

### Cache Performance Comparison

| Environment | First Load | Cached Load | Storage Location |
|-------------|-----------|-------------|------------------|
| **Browser** | 500ms (network) | 5ms (IndexedDB) | IndexedDB |
| **Node.js** | 500ms (network) | 10ms (file read) | .tagteam-cache/*.json |
| **Memory-only** | 500ms (network) | 0ms (Map) | RAM |

### Offline-First Behavior

```javascript
// Load ontology with aggressive caching
await ontologyMgr.loadOntology({
  url: 'https://example.org/values.ttl',
  cache: 'indexeddb',
  ttl: 604800000,  // 7 days
  fallback: './ontologies/offline-fallback.json'
});

// First load: Fetches from network, caches
// Offline usage: Uses cached version for 7 days
// After expiry: Falls back to local JSON
```

### Cache Management

```javascript
// Clear all cached ontologies
await ontologyMgr.storage.clear();

// Clear specific ontology
await ontologyMgr.storage.delete('https://example.org/values.ttl');

// Force refresh from network
await ontologyMgr.loadOntology({
  url: 'https://example.org/values.ttl',
  forceRefresh: true
});

// Get cache statistics
const stats = await ontologyMgr.getCacheStats();
console.log(stats);
// {
//   totalEntries: 3,
//   totalSize: '2.5 MB',
//   oldestEntry: '2026-01-15T10:30:00Z',
//   newestEntry: '2026-01-18T14:22:00Z'
// }
```

---

## Directory Structure for Cross-Platform Project

```
project/
├── .tagteam-cache/              # Node.js cache (auto-created)
│   ├── https___example_org_*.json
│   └── _ontologies_*.json
│
├── ontologies/                   # Your ontology files
│   ├── base/
│   │   └── values.ttl
│   ├── custom/
│   │   └── my-values.ttl
│   └── configuration.json       # Ontology config
│
├── src/                          # Your application
│   └── index.js
│
├── dist/
│   └── tagteam.js               # TagTeam bundle
│
├── node_modules/                 # Dependencies (Node.js only)
│
└── package.json
```

**Browser storage:**
- Uses IndexedDB (inspectable in DevTools → Application → IndexedDB → TagTeamOntologies)
- No files created on disk
- Persists across page reloads
- Cleared when user clears browser data

**Node.js storage:**
- Uses `.tagteam-cache/` directory (gitignored)
- JSON files named after sanitized URLs
- Persists across script runs
- Can be manually deleted or managed

---

## Implementation Plan

### Phase 1: Storage Adapters (Week 1)

**Goal:** Cross-platform persistent caching infrastructure

**Tasks:**
- [ ] Implement StorageAdapter factory class
- [ ] Implement IndexedDBAdapter (browser)
- [ ] Implement FileSystemAdapter (Node.js)
- [ ] Implement MemoryAdapter (fallback)
- [ ] Environment auto-detection logic
- [ ] TTL (time-to-live) expiration support
- [ ] Cache statistics and management
- [ ] Unit tests for each adapter

**Deliverable:**
- `src/storage/StorageAdapter.js` (factory)
- `src/storage/IndexedDBAdapter.js` (browser)
- `src/storage/FileSystemAdapter.js` (Node.js)
- `src/storage/MemoryAdapter.js` (fallback)

**File Structure:**
```
src/
├── storage/
│   ├── StorageAdapter.js       # Factory + interface
│   ├── IndexedDBAdapter.js     # Browser implementation
│   ├── FileSystemAdapter.js    # Node.js implementation
│   └── MemoryAdapter.js        # Fallback
```

### Phase 2: TTL Parser (Week 1-2)

**Goal:** Parse Turtle (TTL) format ontologies

**Tasks:**
- [ ] Research lightweight TTL parsers (N3.js, rdflib.js)
- [ ] Implement or integrate TTL parser
- [ ] Extract values from RDF triples
- [ ] Support rdfs:label, skos:altLabel, skos:prefLabel
- [ ] Test with sample BFO ontologies
- [ ] Optimize for browser (bundle size concern)
- [ ] Create parser tests

**Deliverable:**
- `src/ontology/TTLParser.js` - Lightweight Turtle parser (~20-30 KB)

### Phase 3: OntologyManager (Week 2)

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
- `src/ontology/OntologyManager.js` - Main orchestrator

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
