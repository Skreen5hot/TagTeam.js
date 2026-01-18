# TagTeam.js Ontologies

This directory contains ontology files and configuration for extending TagTeam.js with custom ethical values.

---

## 📁 Directory Structure

```
ontologies/
├── examples/                    # Example ontologies (ready to use)
│   ├── minimal-example.ttl      # 5 basic values (Honesty, Compassion, etc.)
│   ├── medical-ethics-example.ttl    # 10 healthcare values
│   └── business-ethics-example.ttl   # 11 business values
│
├── templates/                   # Templates for creating custom ontologies
│   ├── value-template.ttl       # Template for defining values
│   └── configuration-template.json   # Configuration file template
│
└── README.md                    # This file
```

---

## 🚀 Quick Start

### Use an Example Ontology

```javascript
// Browser
const config = {
    ontologies: [{
        name: 'medical-ethics',
        source: {
            type: 'file',
            path: './ontologies/examples/medical-ethics-example.ttl'
        },
        cache: 'indexeddb',
        enabled: true
    }]
};

await TagTeam.loadOntologies(config);

// Now parse with extended values
const result = TagTeam.parse("The patient must give informed consent");
console.log(result.ethicalProfile.detectedValues);
// Will detect: Informed Consent, Autonomy, etc.
```

### Create Your Own Ontology

1. **Copy the template**
   ```bash
   cp ontologies/templates/value-template.ttl ontologies/my-values.ttl
   ```

2. **Edit your values** (see template for detailed instructions)
   ```turtle
   <http://example.org/values/MyValue>
       a bfo:0000023 ;
       rdfs:label "My Value" ;
       skos:altLabel "Alternative Name" ;
       ethics:domain "Truth" ;
       ethics:upholdingTerms "uphold, support, promote" ;
       ethics:violatingTerms "violate, harm, undermine" .
   ```

3. **Load it**
   ```javascript
   await TagTeam.loadOntology({
       type: 'file',
       path: './ontologies/my-values.ttl',
       cache: 'memory'
   });
   ```

---

## 📖 Ontology Format

TagTeam.js uses **BFO-compatible** Turtle (.ttl) format for ontologies.

### Required Fields

```turtle
<http://example.org/values/ValueName>
    a bfo:0000023 ;           # BFO class (Role)
    rdfs:label "ValueName" ;  # Primary name
    ethics:domain "DOMAIN" ;  # One of: Dignity, Community, Stewardship, Truth, Growth
    ethics:upholdingTerms "term1, term2" ;  # Phrases indicating value upheld
    ethics:violatingTerms "term3, term4" .  # Phrases indicating value violated
```

### Optional Fields

```turtle
    skos:altLabel "Synonym1" ;      # Alternative names
    skos:altLabel "Synonym2" ;
    rdfs:comment "Description..." ;  # Human-readable description
```

### The Five Ethical Domains

| Domain | Description | Examples |
|--------|-------------|----------|
| **Dignity** | Individual rights, autonomy, life, health | Autonomy, Bodily Integrity, Life, Privacy |
| **Community** | Relationships, fairness, social bonds | Justice, Equality, Solidarity, Loyalty |
| **Stewardship** | Resources, environment, future | Sustainability, Conservation, Legacy |
| **Truth** | Honesty, transparency, knowledge | Honesty, Disclosure, Accuracy, Integrity |
| **Growth** | Development, learning, potential | Education, Innovation, Wisdom, Excellence |

---

## 🔧 Configuration

### Configuration File

Create a `tagteam-config.json` file (use [templates/configuration-template.json](templates/configuration-template.json) as starting point):

```json
{
  "ontologies": [
    {
      "name": "my-ontology",
      "source": {
        "type": "file",
        "path": "./ontologies/my-values.ttl"
      },
      "cache": "indexeddb",
      "enabled": true
    }
  ],
  "settings": {
    "mergeStrategy": "append",
    "minimumSalience": 0.3
  }
}
```

### Loading Configuration

```javascript
// Load entire config
await TagTeam.loadConfig('./tagteam-config.json');

// Or configure programmatically
await TagTeam.loadOntologies({
    ontologies: [
        { name: 'medical', source: { type: 'file', path: './medical.ttl' }, enabled: true },
        { name: 'business', source: { type: 'file', path: './business.ttl' }, enabled: true }
    ]
});
```

---

## 💾 Storage and Caching

### Cache Strategies

| Strategy | Environment | Persistence | Performance | Use Case |
|----------|-------------|-------------|-------------|----------|
| **memory** | Both | Session only | Fastest (0ms) | Small ontologies, testing |
| **indexeddb** | Browser | Persistent | Fast (5-10ms) | Production browser apps |
| **filesystem** | Node.js | Persistent | Fast (5-10ms) | Production Node.js apps |

### Example: Browser with Persistent Cache

```javascript
await TagTeam.loadOntology({
    type: 'url',
    url: 'https://example.org/large-ontology.ttl',
    cache: 'indexeddb',
    ttl: 86400000  // Cache for 24 hours
});
```

### Example: Node.js with Filesystem Cache

```javascript
await TagTeam.loadOntology({
    type: 'file',
    path: './ontologies/medical-ethics-example.ttl',
    cache: 'filesystem',  // Stores in .tagteam-cache/
    ttl: 604800000  // Cache for 7 days
});
```

---

## 🌐 Remote Ontologies (OBO Foundry)

### Loading OBO Ontologies

TagTeam.js can load ontologies from the [OBO Foundry](http://www.obofoundry.org/):

```javascript
await TagTeam.loadOntology({
    type: 'url',
    url: 'http://purl.obolibrary.org/obo/omrse.owl',  // Mental Functioning ontology
    cache: 'indexeddb',
    ttl: 604800000  // Cache for 7 days (large file)
});
```

### Recommended OBO Ontologies for Ethics

See [obo-sources.md](obo-sources.md) for a curated list of relevant ontologies:

- **OMRSE** - Ontology of Medically Related Social Entities
- **MFOEM** - Mental Functioning Ontology
- **OBI** - Ontology for Biomedical Investigations
- **OGMS** - Ontology for General Medical Science

**Note:** OBO ontologies are large (10-100+ MB). Use persistent caching and appropriate TTL values.

---

## 📊 Example Ontologies

### Minimal Example (5 values)

**File:** [examples/minimal-example.ttl](examples/minimal-example.ttl)

Values: Honesty, Compassion, Fairness, Responsibility, Respect

**Use case:** Learning the ontology format, quick testing

```javascript
await TagTeam.loadOntology({
    type: 'file',
    path: './ontologies/examples/minimal-example.ttl',
    cache: 'memory'
});
```

### Medical Ethics (10 values)

**File:** [examples/medical-ethics-example.ttl](examples/medical-ethics-example.ttl)

Values: Autonomy, Beneficence, Non-Maleficence, Justice, Confidentiality, Competence, Fidelity, Informed Consent, Double Effect, Sanctity of Life

**Use case:** Healthcare scenarios, medical decision-making, bioethics

```javascript
await TagTeam.loadOntology({
    type: 'file',
    path: './ontologies/examples/medical-ethics-example.ttl',
    cache: 'indexeddb',
    ttl: 86400000
});

const result = TagTeam.parse("The patient refuses life-sustaining treatment");
// Detects: Autonomy (+1), Sanctity of Life (-1 or conflict)
```

### Business Ethics (11 values)

**File:** [examples/business-ethics-example.ttl](examples/business-ethics-example.ttl)

Values: Transparency, Accountability, Integrity, Fiduciary Duty, Fair Compensation, Workplace Safety, Fair Competition, Consumer Protection, Environmental Responsibility, Social Responsibility, Data Privacy

**Use case:** Corporate governance, professional conduct, business scenarios

```javascript
await TagTeam.loadOntology({
    type: 'file',
    path: './ontologies/examples/business-ethics-example.ttl',
    cache: 'filesystem'
});

const result = TagTeam.parse("The company is falsifying safety reports");
// Detects: Integrity (-1), Transparency (-1), Consumer Protection (-1)
```

---

## 🛠️ Creating Custom Ontologies

### Step-by-Step Guide

1. **Start with the template**
   ```bash
   cp ontologies/templates/value-template.ttl ontologies/my-domain.ttl
   ```

2. **Define your domain metadata**
   ```turtle
   <http://example.org/ontology/my-domain>
       a owl:Ontology ;
       rdfs:label "My Domain Ethics" ;
       rdfs:comment "Ethical values for [your domain]" ;
       owl:versionInfo "1.0.0" .
   ```

3. **Add values** (repeat for each value)
   ```turtle
   <http://example.org/values/MyValue>
       a bfo:0000023 ;
       rdfs:label "My Value" ;
       skos:altLabel "Synonym 1" ;
       skos:altLabel "Synonym 2" ;
       rdfs:comment "What this value means" ;
       ethics:domain "Truth" ;  # Choose: Dignity, Community, Stewardship, Truth, Growth
       ethics:upholdingTerms "action 1, action 2, phrase indicating upholding" ;
       ethics:violatingTerms "action 3, action 4, phrase indicating violation" .
   ```

4. **Test your ontology**
   ```javascript
   const result = TagTeam.parse("Test sentence with your domain terminology");
   console.log(result.ethicalProfile.detectedValues);
   ```

5. **Iterate** based on detection results
   - Add more alternative labels if values aren't detected
   - Refine upholding/violating terms for better matching
   - Adjust domain assignments if needed

### Best Practices

1. **Use specific, actionable terms**
   - ✅ Good: "disclose financial records, report earnings, publish audit"
   - ❌ Avoid: "transparency, openness" (too vague)

2. **Include domain-specific vocabulary**
   - Medical: "informed consent", "patient autonomy", "do no harm"
   - Legal: "due process", "attorney-client privilege", "burden of proof"
   - Environmental: "carbon footprint", "habitat preservation", "renewable energy"

3. **Provide multiple alternative labels**
   - Helps detection when people use different terminology
   - Include both formal and informal terms
   - Example: "Autonomy" → also "Self-Determination", "Patient Choice", "Independence"

4. **Test with real text from your domain**
   - Use actual examples from your use case
   - Check detection accuracy
   - Refine based on false positives/negatives

---

## 🧪 Testing Ontologies

### Quick Test

```javascript
// Load your ontology
await TagTeam.loadOntology({
    type: 'file',
    path: './ontologies/my-values.ttl',
    cache: 'memory'
});

// Test with example text
const result = TagTeam.parse("Test sentence from your domain");

// Verify detection
console.log('Detected values:', result.ethicalProfile.detectedValues);
console.log('Built-in values:', result.ethicalProfile.baseValues);
console.log('Custom values:', result.ethicalProfile.customValues);
```

### Debug Output

```javascript
const result = TagTeam.parse(text, { debug: true });
console.log('Ontology metadata:', result.metadata.ontologies);
console.log('Value sources:', result.metadata.valueSources);
```

---

## 🔍 Advanced Usage

### Multiple Ontologies

```javascript
// Load multiple domain-specific ontologies
await TagTeam.loadOntologies({
    ontologies: [
        { name: 'medical', source: { type: 'file', path: './medical.ttl' }, enabled: true },
        { name: 'research', source: { type: 'file', path: './research.ttl' }, enabled: true },
        { name: 'legal', source: { type: 'file', path: './legal.ttl' }, enabled: true }
    ],
    settings: {
        mergeStrategy: 'append'  // Keep all values from all ontologies
    }
});
```

### Conditional Loading

```javascript
// Load different ontologies based on context
const domain = detectDomain(text);  // Your logic

if (domain === 'healthcare') {
    await TagTeam.loadOntology({ type: 'file', path: './medical.ttl' });
} else if (domain === 'business') {
    await TagTeam.loadOntology({ type: 'file', path: './business.ttl' });
}
```

### Dynamic Updates

```javascript
// Reload ontology with fresh data
await TagTeam.loadOntology({
    type: 'url',
    url: 'https://example.org/ontology.ttl',
    cache: 'indexeddb',
    forceRefresh: true  // Bypass cache
});
```

---

## 📚 Resources

### Templates
- [value-template.ttl](templates/value-template.ttl) - Value definition template
- [configuration-template.json](templates/configuration-template.json) - Configuration file template

### Examples
- [minimal-example.ttl](examples/minimal-example.ttl) - Basic example (5 values)
- [medical-ethics-example.ttl](examples/medical-ethics-example.ttl) - Healthcare (10 values)
- [business-ethics-example.ttl](examples/business-ethics-example.ttl) - Business (11 values)

### External Resources
- [BFO (Basic Formal Ontology)](https://basic-formal-ontology.org/) - ISO/IEC 21838-2 standard
- [OBO Foundry](http://www.obofoundry.org/) - Open Biological and Biomedical Ontologies
- [SKOS Primer](https://www.w3.org/TR/skos-primer/) - Simple Knowledge Organization System
- [Turtle Syntax](https://www.w3.org/TR/turtle/) - RDF serialization format

---

## 🐛 Troubleshooting

### Ontology not loading

1. **Check file path** - Use absolute path or path relative to working directory
2. **Verify syntax** - Validate Turtle syntax (use online validators)
3. **Check cache** - Clear cache if using persistent storage
4. **Enable debug** - Use `{ debug: true }` option to see detailed logs

### Values not being detected

1. **Check upholding/violating terms** - Make sure they match actual text
2. **Add alternative labels** - Use `skos:altLabel` for synonyms
3. **Verify domain mapping** - Check that domain is one of the 5 core domains
4. **Test with simple text** - Start with obvious examples

### Performance issues

1. **Use persistent caching** - IndexedDB (browser) or filesystem (Node.js)
2. **Set appropriate TTL** - Avoid re-parsing on every load
3. **Consider ontology size** - Large OBO ontologies may take time to parse
4. **Use memory cache** - For frequently accessed ontologies

---

## 📝 Contributing

To contribute new example ontologies:

1. Create ontology following the template
2. Test thoroughly with real text
3. Document use cases and expected values
4. Submit with examples and test cases

---

**Version:** 1.0.0 | **Date:** 2026-01-18 | **Status:** Ready for Week 3
