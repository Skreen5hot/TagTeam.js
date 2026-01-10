# TagTeam.js Bundle Strategy

**Date:** January 10, 2026
**Status:** Planning (Post Week 1)
**Philosophy:** d3.js/mermaid.js-inspired single-file distribution

---

## Executive Summary

TagTeam.js will adopt a **single-file bundle distribution strategy** inspired by d3.js and mermaid.js, prioritizing:

1. **Maximum shareability** - Works in CodePen, JSFiddle, Observable, GitHub Pages
2. **Zero dependencies** - No npm packages, no build tools for users
3. **Simple API** - `TagTeam.parse(text)` → semantic structure
4. **Educational friendly** - Easy for students and researchers to experiment
5. **Production ready** - Fast, deterministic, well-tested

---

## Distribution Philosophy

### Why Single-File Bundle?

**Inspired by:**
- **d3.js** (250KB) - Data visualization standard, single file, ubiquitous
- **mermaid.js** (800KB) - Diagram generation, single file, GitHub integration
- **Chart.js** (200KB) - Charting library, simple API, widely adopted

**Benefits:**
- Drop into any HTML page and start using
- No package managers required (but npm available)
- CDN-friendly (version, cache, distribute)
- Easy to fork and customize
- Works in restricted environments (corporate, educational)

---

## Bundle Formats

### Primary Distribution: Full Bundle

```
dist/tagteam.js (~4.2MB uncompressed)
├── Lexicon data      (~4.2MB) - POS tagging dictionary
├── POSTagger         (~4KB)   - Part-of-speech tagging
├── SemanticExtractor (~32KB)  - Semantic role extraction
└── Unified API       (~2KB)   - Simple interface layer
```

**Usage:**
```html
<script src="tagteam.js"></script>
<script>
  const result = TagTeam.parse("I should tell my doctor about the pain");
  console.log(result.agent);  // { text: "I", entity: "self" }
</script>
```

### Production: Minified Bundle

```
dist/tagteam.min.js (~2.0MB minified)
```

**Features:**
- Whitespace removed
- Variable names shortened
- Comments stripped
- Gzip-friendly (further compression by CDN)

### Future: Slim Bundle (Week 3+)

```
dist/tagteam.slim.js (~35KB)
+ dist/tagteam-lexicon.js (~4.2MB)
```

**Use cases:**
- Custom lexicons (domain-specific vocabularies)
- Lazy loading (load lexicon only when needed)
- Advanced users who want control

---

## API Design

### Primary API (Simple)

```javascript
// Parse single sentence
TagTeam.parse(text, options?)
// → Returns SemanticAction object

// Parse multiple sentences
TagTeam.parseMany(texts[])
// → Returns array of SemanticAction objects
```

### Configuration API (Advanced)

```javascript
// Load IEE value definitions
TagTeam.loadValueDefinitions(json)

// Add custom compound terms
TagTeam.loadCompoundTerms(json)

// Add custom semantic frame
TagTeam.addSemanticFrame({
  name: 'spiritual_practice',
  coreVerbs: ['pray', 'worship', 'meditate']
})
```

### Options Object

```javascript
{
  includeConfidence: true,      // Default: true
  detectNegation: true,         // Default: true
  resolveCompounds: true,       // Default: true (handles "best friend")
  includeRawTokens: false       // Default: false (debugging)
}
```

---

## Build Process

### Build Script (`build.js`)

```javascript
// Node.js script to create bundle
const fs = require('fs');

// 1. Read source files
const lexicon = fs.readFileSync('src/lexicon.js', 'utf8');
const posTagger = fs.readFileSync('src/POSTagger.js', 'utf8');
const semanticExtractor = fs.readFileSync('src/SemanticRoleExtractor.js', 'utf8');

// 2. Wrap in IIFE
const bundle = `
(function(global) {
  'use strict';

  ${lexicon}
  ${posTagger}
  ${semanticExtractor}

  // Unified API
  const TagTeam = {
    parse: function(text, options) {
      const extractor = new SemanticRoleExtractor();
      return extractor.parseSemanticAction(text);
    },
    parseMany: function(texts) {
      return texts.map(t => TagTeam.parse(t));
    },
    version: '1.0.0'
  };

  global.TagTeam = TagTeam;
})(typeof window !== 'undefined' ? window : this);
`;

// 3. Write bundle
fs.writeFileSync('dist/tagteam.js', bundle);

// 4. Minify (using terser or uglify-js)
// fs.writeFileSync('dist/tagteam.min.js', minified);
```

**Run:** `node build.js`

---

## Distribution Channels

### 1. GitHub Releases
- Tagged versions (v1.0.0, v1.1.0, ...)
- Attach `tagteam.js` and `tagteam.min.js` as release assets
- Changelog and upgrade notes

### 2. NPM Registry
```bash
npm install tagteam
```

**package.json:**
```json
{
  "name": "tagteam",
  "version": "1.0.0",
  "description": "Deterministic semantic parser for natural language",
  "main": "dist/tagteam.js",
  "files": ["dist/", "LICENSE", "README.md"],
  "keywords": ["nlp", "semantic", "parser", "ethics", "deterministic"],
  "license": "MIT"
}
```

### 3. CDN (jsDelivr & unpkg)

**jsDelivr:**
```html
<!-- Latest version -->
<script src="https://cdn.jsdelivr.net/npm/tagteam@latest"></script>

<!-- Specific version (recommended) -->
<script src="https://cdn.jsdelivr.net/npm/tagteam@1.0.0/dist/tagteam.min.js"></script>
```

**unpkg:**
```html
<script src="https://unpkg.com/tagteam@1.0.0/dist/tagteam.min.js"></script>
```

### 4. CodePen & JSFiddle

**External Resources:**
```
https://cdn.jsdelivr.net/npm/tagteam@1.0.0/dist/tagteam.min.js
```

**Template demos:**
- Basic semantic parsing
- Ethical scenario analysis
- Custom frame definitions
- Batch processing examples

### 5. GitHub Pages (Documentation Site)

**URL:** `https://yourusername.github.io/TagTeam.js/`

**Structure:**
```
docs/
├── index.html          # Landing page
├── api.html            # API reference
├── quickstart.html     # 5-minute tutorial
├── examples/           # Gallery of examples
│   ├── basic.html
│   ├── ethical.html
│   ├── custom.html
│   └── batch.html
└── tagteam.min.js      # Self-hosted copy
```

---

## Documentation Strategy

### Quick Start (README.md)

```markdown
# TagTeam.js

Deterministic semantic parser for natural language.

## Install

**CDN:**
```html
<script src="https://cdn.jsdelivr.net/npm/tagteam@1.0.0"></script>
```

**NPM:**
```bash
npm install tagteam
```

## Usage

```javascript
const result = TagTeam.parse("I should tell my doctor about the pain");

console.log(result.agent);      // { text: "I", entity: "self" }
console.log(result.action);     // { verb: "tell", modality: "should" }
console.log(result.theme);      // { text: "pain", entity: "physical_sensation" }
console.log(result.frame);      // "Revealing_information"
```

## Examples

- [Basic Parsing](https://codepen.io/...)
- [Ethical Scenarios](https://codepen.io/...)
- [Custom Frames](https://codepen.io/...)
```

### API Reference

- `TagTeam.parse(text, options)` - Parse single sentence
- `TagTeam.parseMany(texts)` - Parse multiple sentences
- `TagTeam.loadValueDefinitions(json)` - Load value ontology
- `TagTeam.loadCompoundTerms(json)` - Add compound terms
- `TagTeam.addSemanticFrame(definition)` - Add custom frame
- `TagTeam.version` - Current version string

### Examples Gallery

1. **Basic Semantic Parsing** - Extract agent, action, patient
2. **Ethical Scenario Analysis** - Identify values at stake
3. **Negation Detection** - Handle "not", "no", "never"
4. **Modality Detection** - Capture "should", "must", "can"
5. **Compound Terms** - Recognize "best friend", "life support"
6. **Custom Frames** - Define domain-specific action types
7. **Batch Processing** - Parse multiple sentences efficiently
8. **Value Matching** - Link text to ethical values
9. **Confidence Scoring** - Assess parse quality
10. **Ambiguity Handling** - Flag uncertain interpretations

---

## Timeline

### Week 1.5 (Jan 13-17, 2026) - Bundle Creation
- [x] Plan bundle strategy (this document)
- [ ] Create `build.js` script
- [ ] Generate `dist/tagteam.js`
- [ ] Minify to `dist/tagteam.min.js`
- [ ] Test in browsers (Chrome, Firefox, Safari, Edge)
- [ ] Create basic CodePen demo

### Week 2 (Jan 20-24) - NPM & CDN
- [ ] Create `package.json`
- [ ] Publish to NPM (`npm publish`)
- [ ] Verify CDN distribution (jsDelivr, unpkg)
- [ ] Create 5 CodePen examples
- [ ] Update README with CDN instructions

### Week 3 (Jan 27-31) - Documentation Site
- [ ] Setup GitHub Pages
- [ ] Create landing page
- [ ] Write API reference
- [ ] Build examples gallery (10 demos)
- [ ] Add download links for offline use

### Week 4+ (Feb 2026) - Community
- [ ] Blog post / launch announcement
- [ ] Submit to Hacker News / Reddit
- [ ] Create Observable notebook
- [ ] Monitor GitHub issues
- [ ] Gather feedback and iterate

---

## Success Metrics

### Technical
- ✅ Single file bundle created (~4.2MB)
- ✅ Minified version (~2.0MB)
- ✅ Works in all modern browsers
- ✅ Zero dependencies
- ✅ `<script>` tag instant loading

### Distribution
- ✅ NPM package published
- ✅ CDN distribution live
- ✅ 10+ CodePen examples
- ✅ GitHub Pages documentation site
- ✅ Observable notebook integration

### Adoption
- ⏳ 50+ GitHub stars (Week 4)
- ⏳ 10+ npm downloads/week (Week 4)
- ⏳ 5+ community examples (Week 8)
- ⏳ Featured on JavaScript Weekly (Week 12)

---

## Comparison: TagTeam.js vs Similar Libraries

| Library | Size | API | Build | Dependencies | Philosophy Match |
|---------|------|-----|-------|--------------|------------------|
| d3.js | 250KB | Simple | No | 0 | ✅ Perfect model |
| mermaid.js | 800KB | Simple | No | 0 | ✅ Perfect model |
| Chart.js | 200KB | Simple | No | 0 | ✅ Great model |
| compromise.js | 150KB | Medium | No | 0 | ⚠️ Similar but different focus |
| spaCy.js | 50MB | Complex | Yes | Many | ❌ Too heavy |
| natural.js | N/A | Complex | Yes | Many | ❌ npm-only |
| **tagteam.js** | **4.2MB** | **Simple** | **No** | **0** | **✅ d3.js pattern** |

**TagTeam.js is larger (4.2MB) but:**
- Still reasonable for modern web (< 1 second load on typical connection)
- Lexicon data explains size (not bloated code)
- Gzip compression reduces to ~1MB
- Comparable to medium-sized image files
- Trade-off: Comprehensive POS lexicon = accurate parsing

---

## Key Takeaways

1. **Single file bundle** = maximum shareability
2. **d3.js philosophy** = simple, ubiquitous, reliable
3. **Zero dependencies** = works everywhere JavaScript runs
4. **Educational friendly** = easy to learn and teach
5. **Production ready** = deterministic, fast, well-tested

**Goal:** Make TagTeam.js as easy to use as d3.js
**Success:** When people say "just drop in TagTeam.js and it works"

---

**Document Version:** 1.0
**Last Updated:** January 10, 2026
**Status:** Planning
**Next Step:** Create `build.js` script
