# TTL Parser Decision Document

**Date:** January 18, 2026
**Phase:** 2 - TTL Parser & Ontology Pre-processing
**Status:** Research & Decision Making
**Owner:** TagTeam Development Team

---

## Executive Summary

TagTeam v3.0 requires a Turtle (TTL) parser to load RDF ontologies. This document evaluates three approaches:

1. **N3.js** - Mature, full-featured RDF library
2. **Custom Parser** - Lightweight, purpose-built solution
3. **Hybrid** - Lazy-load N3.js + CLI pre-processor

**Recommendation:** **Option 3 (Hybrid)** - Lazy-load N3.js for development + CLI pre-processor for production

---

## Requirements

### Functional Requirements

1. Parse Turtle (.ttl) and OWL (.owl) format ontologies
2. Extract RDF triples (subject, predicate, object)
3. Support standard predicates (rdfs:label, skos:altLabel, rdf:type)
4. Support custom predicates (ethics:semanticMarkers, tagteam:relatedProcess)
5. Handle BFO class hierarchies (rdfs:subClassOf)
6. Work in both browser and Node.js environments

### Non-Functional Requirements

1. **Bundle Size:** < 50 KB if bundled, 0 KB if lazy-loaded
2. **Parse Time:** < 500ms for typical ontology (10-20 concepts)
3. **Reliability:** Handle malformed TTL gracefully
4. **Maintainability:** Minimal custom code to maintain

---

## Option 1: N3.js

**Description:** Use the mature N3.js library for full RDF/Turtle parsing

### Pros

✅ **Battle-tested** - Used in production by W3C, DBpedia, academic projects
✅ **Full spec compliance** - Handles all Turtle/TriG/N-Quads features
✅ **Active maintenance** - 1M+ downloads/month, regular updates
✅ **Well-documented** - Comprehensive API docs and examples
✅ **Node.js & browser** - Works in both environments
✅ **Streaming support** - Can parse large ontologies incrementally

### Cons

❌ **Bundle size** - ~130 KB minified (gzipped: ~40 KB)
❌ **Overkill** - Full RDF quad store when we only need triple extraction
❌ **Performance** - General-purpose parser may be slower for simple ontologies

### Implementation

```javascript
// Browser (lazy-loaded)
const N3 = await import('https://cdn.jsdelivr.net/npm/n3@1.17.1/+esm');

// Node.js
const N3 = require('n3');

function parseTTL(ttlString) {
    const parser = new N3.Parser();
    const triples = [];

    return new Promise((resolve, reject) => {
        parser.parse(ttlString, (error, quad, prefixes) => {
            if (error) {
                reject(error);
            } else if (quad) {
                triples.push({
                    subject: quad.subject.value,
                    predicate: quad.predicate.value,
                    object: quad.object.value
                });
            } else {
                // Parsing complete
                resolve({ triples, prefixes });
            }
        });
    });
}
```

### Bundle Impact

- **Bundled:** +130 KB (breaks our < 50 KB requirement)
- **Lazy-loaded:** 0 KB initial, ~130 KB when first loading TTL ontology
- **CDN:** Can use ESM import from jsdelivr.net

---

## Option 2: Custom Lightweight Parser

**Description:** Build a minimal TTL parser supporting only the features we need

### Pros

✅ **Tiny bundle** - Estimated ~5-10 KB
✅ **Fast** - Optimized for our specific use case
✅ **No dependencies** - Full control over implementation
✅ **Educational** - Team learns RDF internals

### Cons

❌ **Development time** - 1-2 weeks to build and test
❌ **Bug risk** - Edge cases in Turtle spec are subtle
❌ **Maintenance burden** - Must fix bugs ourselves
❌ **Limited features** - Won't handle advanced Turtle features
❌ **Spec compliance** - May not parse all valid TTL files

### Implementation Sketch

```javascript
class SimpleTTLParser {
    parse(ttlString) {
        const lines = ttlString.split('\n');
        const triples = [];
        const prefixes = {};
        let currentSubject = null;

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip comments and empty lines
            if (trimmed.startsWith('#') || trimmed === '') continue;

            // Handle @prefix declarations
            if (trimmed.startsWith('@prefix')) {
                const match = trimmed.match(/@prefix\s+(\w+):\s+<(.+?)>/);
                if (match) {
                    prefixes[match[1]] = match[2];
                }
                continue;
            }

            // Parse triple
            const parts = this._parseTriple(trimmed, prefixes);
            if (parts) {
                triples.push(parts);
            }
        }

        return { triples, prefixes };
    }

    _parseTriple(line, prefixes) {
        // SIMPLIFIED - Real implementation needs to handle:
        // - Quoted literals with escapes
        // - Multi-line values
        // - Blank nodes
        // - Collections
        // - Abbreviated syntax (a, ;, ,)
        // This is where bugs creep in!

        const match = line.match(/^(\S+)\s+(\S+)\s+(.+?)\s*\.?$/);
        if (!match) return null;

        return {
            subject: this._expandPrefix(match[1], prefixes),
            predicate: this._expandPrefix(match[2], prefixes),
            object: this._parseObject(match[3], prefixes)
        };
    }

    _expandPrefix(term, prefixes) {
        // Handle prefix expansion
        const [prefix, local] = term.split(':');
        return prefixes[prefix] ? prefixes[prefix] + local : term;
    }

    _parseObject(obj, prefixes) {
        // Handle literals, URIs, blank nodes
        if (obj.startsWith('"')) {
            return obj.replace(/^"(.+)".*$/, '$1');
        }
        return this._expandPrefix(obj, prefixes);
    }
}
```

### Risk Assessment

**High Risk Areas:**
1. **String literals** - Escaping, multi-line, language tags, datatypes
2. **Abbreviated syntax** - `a` for rdf:type, `;` for same subject, `,` for same predicate
3. **Blank nodes** - `_:b0`, `[]`, `()`
4. **Collections** - `( item1 item2 )`
5. **Comments** - Mid-line comments with `#`

**Estimated Bug Count:** 10-20 edge cases we'll miss initially

---

## Option 3: Hybrid Approach (RECOMMENDED)

**Description:** Lazy-load N3.js for development + CLI pre-processor for production

### Architecture

```
Development Mode:
User loads ontology → Lazy-load N3.js → Parse TTL → Cache result
(Convenience, full spec support)

Production Mode:
Developer runs CLI → N3.js parses TTL → Output JSON manifest → User loads JSON
(Zero runtime parsing, maximum performance)
```

### Pros

✅ **Best of both worlds** - N3.js reliability + zero bundle size
✅ **Development convenience** - Load any TTL file directly
✅ **Production performance** - Pre-compiled JSON manifest
✅ **Zero bundle impact** - N3.js only loaded when parsing TTL in browser
✅ **Proven approach** - Used by Webpack, Vite for development/production split

### Cons

❌ **Complexity** - Two code paths (runtime vs pre-compiled)
❌ **Build step** - Users must run CLI for production
⚠️ **Documentation** - Must explain when to use which approach

### Implementation

#### Runtime (Browser/Node.js)

```javascript
// src/ontology/TTLParser.js
class TTLParser {
    async parse(ttlString) {
        // Lazy-load N3.js only when needed
        const N3 = await this._loadN3();

        const parser = new N3.Parser();
        const triples = [];

        return new Promise((resolve, reject) => {
            parser.parse(ttlString, (error, quad, prefixes) => {
                if (error) {
                    reject(new Error(`TTL parsing failed: ${error.message}`));
                } else if (quad) {
                    triples.push({
                        subject: quad.subject.value,
                        predicate: quad.predicate.value,
                        object: quad.object.value,
                        objectType: quad.object.termType // 'Literal' or 'NamedNode'
                    });
                } else {
                    resolve({ triples, prefixes });
                }
            });
        });
    }

    async _loadN3() {
        if (this._n3Cache) return this._n3Cache;

        if (typeof window !== 'undefined') {
            // Browser - load from CDN
            this._n3Cache = await import('https://cdn.jsdelivr.net/npm/n3@1.17.1/+esm');
        } else {
            // Node.js
            this._n3Cache = require('n3');
        }

        return this._n3Cache;
    }
}
```

#### CLI Pre-processor

```javascript
// cli/tagteam-ontology-compiler.js
#!/usr/bin/env node

const fs = require('fs');
const N3 = require('n3');
const path = require('path');

async function compileOntology(inputPath, outputPath, options = {}) {
    console.log(`Compiling ${inputPath}...`);

    // Read TTL file
    const ttlContent = fs.readFileSync(inputPath, 'utf8');

    // Parse with N3.js
    const parser = new N3.Parser();
    const triples = [];

    await new Promise((resolve, reject) => {
        parser.parse(ttlContent, (error, quad, prefixes) => {
            if (error) reject(error);
            else if (quad) {
                triples.push({
                    s: quad.subject.value,
                    p: quad.predicate.value,
                    o: quad.object.value,
                    t: quad.object.termType === 'Literal' ? 'l' : 'n'
                });
            } else resolve(prefixes);
        });
    });

    // Extract concepts
    const concepts = extractConcepts(triples, options);

    // Semantic expansion (if requested)
    if (options.expandSemantics) {
        const expandedConcepts = await expandSemantics(concepts, options);
        concepts.push(...expandedConcepts);
    }

    // Write lightweight JSON manifest
    const manifest = {
        version: '3.0.0',
        source: inputPath,
        compiledAt: new Date().toISOString(),
        concepts: concepts,
        metadata: {
            conceptCount: concepts.length,
            expanded: !!options.expandSemantics
        }
    };

    fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

    console.log(`✓ Compiled ${concepts.length} concepts to ${outputPath}`);
    console.log(`  Size reduction: ${(ttlContent.length / 1024).toFixed(1)} KB → ${(JSON.stringify(manifest).length / 1024).toFixed(1)} KB`);
}

function extractConcepts(triples, options) {
    const concepts = new Map();

    // Group triples by subject
    for (const triple of triples) {
        if (!concepts.has(triple.s)) {
            concepts.set(triple.s, {
                iri: triple.s,
                properties: {}
            });
        }

        const concept = concepts.get(triple.s);

        // Store predicate values
        if (!concept.properties[triple.p]) {
            concept.properties[triple.p] = [];
        }
        concept.properties[triple.p].push(triple.o);
    }

    // Convert to array and extract common fields
    return Array.from(concepts.values()).map(c => ({
        iri: c.iri,
        name: c.properties['http://www.w3.org/2000/01/rdf-schema#label']?.[0],
        type: c.properties['http://www.w3.org/1999/02/22-rdf-syntax-ns#type']?.[0],
        semanticMarkers: c.properties['http://tagteam.org/semanticMarkers']?.[0]?.split(',').map(s => s.trim()),
        // ... extract other relevant fields
    })).filter(c => c.name); // Only include concepts with labels
}

async function expandSemantics(concepts, options) {
    // Load expansion ontology (Fandaws, WordNet, etc.)
    const expansionPath = options.expandSemantics;
    const expansionTTL = fs.readFileSync(expansionPath, 'utf8');

    // Parse expansion ontology
    // Extract hierarchy
    // Merge synonyms into target concepts
    // Return expanded concepts

    // (Implementation in Phase 4)
    return [];
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const inputPath = args[0];
    const outputPath = args[1] || inputPath.replace('.ttl', '.json');

    const options = {};

    // Parse flags
    for (let i = 2; i < args.length; i++) {
        if (args[i] === '--expand-semantics') {
            options.expandSemantics = args[i + 1];
            i++;
        } else if (args[i] === '--map') {
            options.semanticMap = options.semanticMap || [];
            options.semanticMap.push(args[i + 1]);
            i++;
        }
    }

    compileOntology(inputPath, outputPath, options)
        .catch(err => {
            console.error('Error:', err.message);
            process.exit(1);
        });
}

module.exports = { compileOntology, extractConcepts };
```

### Usage Examples

```bash
# Development: Load TTL directly in browser/Node.js
await TagTeam.loadOntology({ type: 'file', path: 'my-ontology.ttl' });
# → Lazy-loads N3.js, parses, caches result

# Production: Pre-compile to JSON
$ tagteam-compile my-ontology.ttl --output my-ontology.json
# → Uses N3.js in Node.js, outputs lightweight JSON

# Load pre-compiled manifest (no parsing needed)
await TagTeam.loadOntology({ type: 'file', path: 'my-ontology.json' });
# → Direct JSON load, zero parsing overhead

# With semantic expansion
$ tagteam-compile iee-ethics.ttl \
  --expand-semantics fandaws-ameliorate.ttl \
  --map "ethics:Beneficence=fan:ameliorate" \
  --output iee-expanded.json
```

---

## Comparison Matrix

| Feature | N3.js | Custom Parser | Hybrid (Recommended) |
|---------|-------|---------------|---------------------|
| **Bundle Size (initial)** | 130 KB | 5-10 KB | 0 KB |
| **Bundle Size (runtime)** | 130 KB | 5-10 KB | 130 KB (lazy) |
| **Spec Compliance** | Full | Partial | Full |
| **Reliability** | High | Medium | High |
| **Development Time** | 1 day | 1-2 weeks | 2-3 days |
| **Maintenance** | Low | High | Low |
| **Production Performance** | Good | Good | Excellent (pre-compiled) |
| **Development Convenience** | High | Medium | High |
| **Risk** | Low | High | Low |

---

## Decision Matrix

### Weighted Scoring (1-5 scale, 5 = best)

| Criterion | Weight | N3.js | Custom | Hybrid |
|-----------|--------|-------|--------|--------|
| **Bundle Size** | 20% | 2 | 5 | 5 |
| **Reliability** | 25% | 5 | 2 | 5 |
| **Development Time** | 15% | 5 | 2 | 4 |
| **Maintenance** | 15% | 5 | 2 | 5 |
| **Performance** | 15% | 3 | 4 | 5 |
| **Spec Compliance** | 10% | 5 | 2 | 5 |
| **Weighted Total** | 100% | **4.05** | **2.85** | **4.85** |

**Winner:** Hybrid Approach (4.85/5.0)

---

## Recommendation

### ✅ Adopt Option 3: Hybrid Approach

**Rationale:**

1. **Zero bundle impact** - N3.js only loaded when parsing TTL at runtime
2. **Production-ready** - Pre-compiled JSON manifests for optimal performance
3. **Developer-friendly** - Can load raw TTL files during development
4. **Battle-tested** - Uses proven N3.js library, not custom code
5. **Future-proof** - CLI compiler enables advanced features (semantic expansion, validation, optimization)

### Implementation Plan

**Week 2 Tasks:**

1. **Day 1-2:** Implement TTLParser.js with lazy N3.js loading
2. **Day 3-4:** Implement CLI compiler (basic JSON manifest generation)
3. **Day 5:** Add `--expand-semantics` flag for Fandaws integration
4. **Testing:** Verify with example ontologies (minimal, medical, business)

**Acceptance Criteria:**

- [ ] TTLParser lazy-loads N3.js (0 KB initial bundle)
- [ ] CLI compiler reduces 50MB OWL → < 1MB JSON manifest
- [ ] Parse time < 500ms for typical ontology
- [ ] Works in both browser and Node.js
- [ ] Handles malformed TTL gracefully

---

## Alternative Parsers Considered

### rdflib.js

- **Bundle:** ~200 KB (larger than N3.js)
- **Status:** Less active maintenance
- **Verdict:** No advantage over N3.js

### jsonld.js

- **Format:** JSON-LD only (not Turtle)
- **Bundle:** ~50 KB
- **Verdict:** Add as separate parser for JSON-LD support

### Custom Regex-Based

- **Bundle:** ~2 KB
- **Reliability:** Very low (Turtle spec is complex)
- **Verdict:** Too risky for production

---

## Risk Mitigation

### Risk 1: N3.js CDN Availability

**Mitigation:**
- Fallback to npm-hosted version
- Include N3.js in npm dependencies for Node.js
- Document offline usage pattern

### Risk 2: CLI Compiler Adoption

**Mitigation:**
- Make CLI compiler optional (runtime parsing still works)
- Document performance benefits clearly
- Provide npm scripts in examples

### Risk 3: JSON Manifest Format Changes

**Mitigation:**
- Version manifest format
- Include schema validation
- Support backward compatibility

---

## Next Steps

1. ✅ **Finalize decision** - Hybrid approach approved
2. **Create TTLParser.js** - Implement lazy N3.js loading
3. **Create CLI compiler** - Basic JSON manifest generation
4. **Add to package.json** - Include N3.js as dependency
5. **Write tests** - Parse example ontologies
6. **Document usage** - Add to roadmap

---

## References

- N3.js: https://github.com/rdfjs/N3.js
- Turtle Spec: https://www.w3.org/TR/turtle/
- RDF Primer: https://www.w3.org/TR/rdf11-primer/
- Related: Week 3 PatternMatcher uses similar lazy-load strategy for Compromise.js

---

**Document Version:** 1.0
**Status:** Decision Made - Hybrid Approach
**Next Review:** After Phase 2 implementation
**Approved By:** TagTeam Development Team
