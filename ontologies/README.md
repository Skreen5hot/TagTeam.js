# Ontologies Directory

This directory will contain value ontologies for Week 3 ontology integration feature.

## Structure (Week 3)

### base/
Default IEE 50-value ontology in TTL format
- `values.ttl` - Value definitions
- `domains.ttl` - Domain hierarchy
- `frames.ttl` - Semantic frame mappings
- `conflicts.ttl` - Conflict pairs

### domains/
Domain-specific ontologies
- `medical/` - Medical ethics values and terminology
- `legal/` - Legal ethics values and terminology
- `business/` - Business ethics values and terminology

### examples/
Example ontologies for documentation
- `simple-example.ttl` - Minimal example
- `bfo-example.ttl` - BFO-compatible example
- `custom-organization.json` - JSON format example

## Current Status

**Week 2b Complete (v2.0.0):**
- Ontology: Hard-coded IEE 50-value system (embedded in bundle)
- Format: JSON (in `iee-collaboration/from-iee/data/`)

**Week 3 Plan:**
- Add BFO-compatible ontology loading
- Support Turtle (.ttl) format
- Support remote URLs
- Support local files
- Multi-ontology merging

## Usage (Week 3)

```javascript
// Load custom ontology
await TagTeam.loadOntology({
  source: 'file',
  path: './ontologies/base/values.ttl'
});

// Load remote ontology
await TagTeam.loadOntology({
  source: 'url',
  url: 'https://example.org/ethics.ttl'
});

// Load domain-specific
await TagTeam.loadOntology({
  source: 'directory',
  path: './ontologies/domains/medical/'
});
```

See [ONTOLOGY_INTEGRATION_PLAN.md](../planning/week3/ONTOLOGY_INTEGRATION_PLAN.md) for complete design.
