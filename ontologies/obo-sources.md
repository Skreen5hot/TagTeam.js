# OBO Foundry Ontologies for Ethics and Values

This document provides links to relevant ontologies from the [OBO Foundry](http://www.obofoundry.org/) that can be used with TagTeam.js for ethical value detection.

---

## 🎯 Recommended OBO Ontologies

### 1. OMRSE - Ontology of Medically Related Social Entities

**URL:** http://purl.obolibrary.org/obo/omrse.owl
**Size:** ~15 MB
**Domain:** Healthcare, Social Medicine, Patient Care
**Description:** Covers social and ethical aspects of medical practice including patient rights, consent, confidentiality, and healthcare relationships.

**Relevant Classes:**
- Patient rights and autonomy
- Informed consent processes
- Healthcare provider roles
- Social determinants of health
- Medical decision-making

**TagTeam.js Usage:**
```javascript
await TagTeam.loadOntology({
    type: 'url',
    url: 'http://purl.obolibrary.org/obo/omrse.owl',
    cache: 'indexeddb',
    ttl: 604800000  // 7 days
});
```

---

### 2. MFOEM - Mental Functioning Ontology

**URL:** http://purl.obolibrary.org/obo/mfoem.owl
**Size:** ~8 MB
**Domain:** Mental Health, Psychology, Cognitive Ethics
**Description:** Covers mental states, cognitive processes, and psychological functioning relevant to ethical decision-making and mental health care.

**Relevant Classes:**
- Mental capacity and competence
- Cognitive decision-making
- Emotional states affecting judgment
- Mental health conditions
- Psychological well-being

**TagTeam.js Usage:**
```javascript
await TagTeam.loadOntology({
    type: 'url',
    url: 'http://purl.obolibrary.org/obo/mfoem.owl',
    cache: 'indexeddb',
    ttl: 604800000
});
```

---

### 3. OBI - Ontology for Biomedical Investigations

**URL:** http://purl.obolibrary.org/obo/obi.owl
**Size:** ~25 MB
**Domain:** Research Ethics, Biomedical Research, Clinical Trials
**Description:** Covers research protocols, experimental design, and ethical considerations in biomedical investigations.

**Relevant Classes:**
- Research ethics and protocols
- Participant consent
- Study design and methodology
- Data collection and privacy
- Institutional review boards

**TagTeam.js Usage:**
```javascript
await TagTeam.loadOntology({
    type: 'url',
    url: 'http://purl.obolibrary.org/obo/obi.owl',
    cache: 'indexeddb',
    ttl: 604800000
});
```

---

### 4. OGMS - Ontology for General Medical Science

**URL:** http://purl.obolibrary.org/obo/ogms.owl
**Size:** ~3 MB
**Domain:** Medical Practice, Clinical Medicine, Healthcare
**Description:** Covers general medical concepts including diagnosis, treatment, and clinical decision-making.

**Relevant Classes:**
- Clinical diagnosis
- Treatment planning
- Medical procedures
- Healthcare outcomes
- Clinical judgment

**TagTeam.js Usage:**
```javascript
await TagTeam.loadOntology({
    type: 'url',
    url: 'http://purl.obolibrary.org/obo/ogms.owl',
    cache: 'indexeddb',
    ttl: 604800000
});
```

---

### 5. ENVO - Environment Ontology

**URL:** http://purl.obolibrary.org/obo/envo.owl
**Size:** ~12 MB
**Domain:** Environmental Ethics, Ecology, Sustainability
**Description:** Covers environmental systems, ecological processes, and environmental contexts relevant to stewardship and sustainability.

**Relevant Classes:**
- Environmental quality
- Ecosystem health
- Natural resources
- Environmental impacts
- Conservation areas

**TagTeam.js Usage:**
```javascript
await TagTeam.loadOntology({
    type: 'url',
    url: 'http://purl.obolibrary.org/obo/envo.owl',
    cache: 'indexeddb',
    ttl: 604800000
});
```

---

## 📋 Full OBO Ontology List

Browse all available ontologies: http://www.obofoundry.org/

**Search by Domain:**
- **Healthcare:** OMRSE, OGMS, OBI, MFOEM
- **Research:** OBI, IAO (Information Artifact Ontology)
- **Environment:** ENVO, PCO (Population and Community Ontology)
- **Social:** OMRSE, ERO (Eagle-I Research Resource Ontology)

---

## ⚙️ Configuration Example

### Load Multiple OBO Ontologies

Create a configuration file (`tagteam-obo-config.json`):

```json
{
  "ontologies": [
    {
      "name": "omrse-medical-social",
      "source": {
        "type": "url",
        "url": "http://purl.obolibrary.org/obo/omrse.owl"
      },
      "cache": "indexeddb",
      "ttl": 604800000,
      "enabled": true,
      "metadata": {
        "domain": "healthcare",
        "description": "Medical and social ethics"
      }
    },
    {
      "name": "mfoem-mental-health",
      "source": {
        "type": "url",
        "url": "http://purl.obolibrary.org/obo/mfoem.owl"
      },
      "cache": "indexeddb",
      "ttl": 604800000,
      "enabled": false,
      "metadata": {
        "domain": "mental-health",
        "description": "Mental functioning and cognitive ethics"
      }
    },
    {
      "name": "obi-research",
      "source": {
        "type": "url",
        "url": "http://purl.obolibrary.org/obo/obi.owl"
      },
      "cache": "indexeddb",
      "ttl": 604800000,
      "enabled": false,
      "metadata": {
        "domain": "research",
        "description": "Biomedical research ethics"
      }
    },
    {
      "name": "envo-environmental",
      "source": {
        "type": "url",
        "url": "http://purl.obolibrary.org/obo/envo.owl"
      },
      "cache": "indexeddb",
      "ttl": 604800000,
      "enabled": false,
      "metadata": {
        "domain": "environmental",
        "description": "Environmental and sustainability ethics"
      }
    }
  ],
  "settings": {
    "mergeStrategy": "append",
    "conflictResolution": "warn",
    "minimumSalience": 0.3
  }
}
```

**Load the configuration:**

```javascript
await TagTeam.loadConfig('./tagteam-obo-config.json');
```

---

## 🚨 Important Notes

### Licensing

- **OBO Foundry License:** Most OBO ontologies are released under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) or similar open licenses
- **Check individual ontology licenses** before using in commercial applications
- **Attribution required:** Cite ontology creators and OBO Foundry when using

### Performance Considerations

1. **Large file sizes:** OBO ontologies range from 3 MB to 100+ MB
2. **Parsing time:** First load may take 5-30 seconds depending on size
3. **Use persistent caching:** IndexedDB (browser) or filesystem (Node.js)
4. **Set appropriate TTL:** Cache for days/weeks, not hours
5. **Consider selective loading:** Load only needed ontologies for your domain

### Version Pinning

OBO ontologies are updated regularly. For reproducibility, pin to specific versions:

```javascript
await TagTeam.loadOntology({
    type: 'url',
    // Pin to specific date version
    url: 'http://purl.obolibrary.org/obo/omrse/2024-01-01/omrse.owl',
    cache: 'indexeddb',
    ttl: 2592000000  // 30 days
});
```

**Find versions:** Check ontology homepage or browse http://purl.obolibrary.org/obo/ONTOLOGY_ID/

---

## 🔄 Update Strategy

### Development
- Use latest versions (`/obo/ontology.owl`)
- Short TTL (24-48 hours)
- Allow automatic updates

### Production
- Pin to specific versions (`/obo/ontology/YYYY-MM-DD/ontology.owl`)
- Long TTL (7-30 days)
- Manual version updates after testing

**Example:**

```javascript
// Development
await TagTeam.loadOntology({
    url: 'http://purl.obolibrary.org/obo/omrse.owl',
    ttl: 86400000  // 24 hours
});

// Production
await TagTeam.loadOntology({
    url: 'http://purl.obolibrary.org/obo/omrse/2024-01-01/omrse.owl',
    ttl: 2592000000  // 30 days
});
```

---

## 📚 Additional Resources

### OBO Foundry Documentation
- **Main Site:** http://www.obofoundry.org/
- **Principles:** http://www.obofoundry.org/principles/fp-000-summary.html
- **Registry:** http://www.obofoundry.org/ontologies/

### BFO Documentation
- **BFO Website:** https://basic-formal-ontology.org/
- **BFO ISO Standard:** ISO/IEC 21838-2
- **BFO GitHub:** https://github.com/BFO-ontology/BFO

### Ontology Tools
- **Protégé:** https://protege.stanford.edu/ - Ontology editor
- **OLS (Ontology Lookup Service):** https://www.ebi.ac.uk/ols/index - Browse ontologies
- **BioPortal:** https://bioportal.bioontology.org/ - Ontology repository

---

## 🧪 Testing OBO Ontologies

### Quick Test Script

```javascript
// test-obo-ontology.js
const TagTeam = require('./dist/tagteam.js');

(async () => {
    console.log('Loading OMRSE ontology...');
    const start = Date.now();

    await TagTeam.loadOntology({
        type: 'url',
        url: 'http://purl.obolibrary.org/obo/omrse.owl',
        cache: 'memory'  // First load, no cache
    });

    console.log(`Loaded in ${Date.now() - start}ms`);

    // Test with medical scenario
    const result = TagTeam.parse(
        "The patient must give informed consent before the procedure"
    );

    console.log('Detected values:', result.ethicalProfile.detectedValues);
})();
```

---

## 🛠️ Troubleshooting

### Slow Loading
- **Solution:** Use persistent cache (indexeddb/filesystem)
- **Check:** Network connection for remote ontologies
- **Consider:** Download and use local file instead

### Parsing Errors
- **Solution:** Verify ontology URL is accessible
- **Check:** Ontology format (OWL/RDF supported)
- **Try:** Different ontology version

### Value Detection Issues
- **OBO ontologies may not have ethics-specific labels**
- **Solution:** Create custom mapping ontology that links OBO classes to ethical values
- **Example:** Map OMRSE class to TagTeam value with upholding/violating terms

---

**Last Updated:** 2026-01-18
**OBO Foundry Version:** Current
**TagTeam.js Compatibility:** v2.0.0+
