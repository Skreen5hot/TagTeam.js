'use strict';

/**
 * @file src/ontology/OntologyTextTagger.js
 * @description Phase 6.6 - General-Purpose Ontology-Driven Text Tagger
 *
 * Enables any team to load their own ontology (TTL or JSON) and tag text
 * with their custom classes, using a configurable property mapping.
 *
 * @example
 * const tagger = OntologyTextTagger.fromTTL(medicalTTL, {
 *   propertyMap: { keywords: 'med:indicators', category: 'med:category' },
 *   domain: 'medical'
 * });
 * const tags = tagger.tagText('Patient presents with chest pain.');
 */

const TurtleParser = require('./TurtleParser.js');
const OntologyManager = require('./OntologyManager.js');
const PropertyMapper = require('./PropertyMapper.js');

// Try to load Lemmatizer for morphological normalization
let Lemmatizer;
try {
  Lemmatizer = require('../core/Lemmatizer.js');
} catch (e) {
  Lemmatizer = null;
}

class OntologyTextTagger {
  /**
   * Create a new OntologyTextTagger
   * @param {Object} options - Configuration
   * @param {Object} options.propertyMap - Property mapping configuration (required)
   * @param {string} options.propertyMap.keywords - Predicate for keywords (required)
   * @param {string} [options.propertyMap.label] - Predicate for label
   * @param {string|string[]} [options.propertyMap.typeFilter] - rdf:type(s) to include
   * @param {string} [options.propertyMap.upholding] - Predicate for upholding indicators
   * @param {string} [options.propertyMap.violating] - Predicate for violating indicators
   * @param {string} [options.propertyMap.category] - Predicate for category
   * @param {string[]} [options.propertyMap.extraProperties] - Additional predicates to extract
   * @param {Object} [options.matchOptions] - Matching configuration
   * @param {boolean} [options.matchOptions.caseSensitive=false] - Case sensitive matching
   * @param {boolean} [options.matchOptions.wordBoundary=true] - Use word boundary regex
   * @param {number} [options.matchOptions.minKeywordMatches=1] - Minimum keyword matches
   * @param {number} [options.matchOptions.confidenceThreshold=0.0] - Minimum confidence to return
   * @param {string} [options.domain='custom'] - Domain label for output
   * @param {OntologyManager} [options.ontologyManager] - Pre-loaded OntologyManager
   */
  constructor(options = {}) {
    if (!options.propertyMap) {
      throw new Error('OntologyTextTagger requires a propertyMap configuration');
    }
    if (!options.propertyMap.keywords) {
      throw new Error('propertyMap must include a "keywords" property');
    }

    this.propertyMap = options.propertyMap;
    this.domain = options.domain || 'custom';
    this.matchOptions = {
      caseSensitive: false,
      wordBoundary: true,
      minKeywordMatches: 1,
      confidenceThreshold: 0.0,
      ...(options.matchOptions || {})
    };

    this.propertyMapper = new PropertyMapper(this.propertyMap);
    this.tagDefinitions = [];
    this._parseResult = null;
    this._lemmatizer = null;

    // Detect match mode: priority chain for standard SKOS properties, legacy keyword for custom
    const standardProps = ['rdfs:label', 'skos:prefLabel', 'skos:altLabel', 'skos:notation', 'skos:hiddenLabel'];
    this._matchMode = (!this.propertyMap.keywords || standardProps.includes(this.propertyMap.keywords))
      ? 'priority' : 'keyword';

    // If ontologyManager provided, we store it for compatibility
    this.ontologyManager = options.ontologyManager || null;
  }

  /**
   * Load ontology from TTL string
   * @param {string} ttlContent - Turtle/TTL content
   * @returns {Object} Load result with { classCount, totalKeywords }
   */
  loadFromString(ttlContent) {
    const parser = new TurtleParser();
    this._parseResult = parser.parse(ttlContent);
    this.tagDefinitions = this.propertyMapper.extractDefinitions(this._parseResult);

    // In priority mode, supplement definitions for classes that were excluded
    // because they lack the configured keyword property but DO have other
    // priority properties (skos:prefLabel, skos:altLabel, skos:notation, etc.)
    if (this._matchMode === 'priority') {
      this._supplementPriorityDefinitions();
      this._precomputeLemmas();
    }

    return {
      classCount: this.tagDefinitions.length,
      totalKeywords: this.tagDefinitions.reduce((sum, d) => sum + d.keywords.length, 0)
    };
  }

  /**
   * Tag text — returns array of matches
   * @param {string} text - Input text to analyze
   * @param {Object} [options] - Tag options
   * @param {string[]} [options.classes] - Filter to specific class IDs
   * @returns {Array<Object>} Array of tag results
   */
  tagText(text, options = {}) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const defs = options.classes
      ? this.tagDefinitions.filter(d => options.classes.includes(d.id))
      : this.tagDefinitions;

    const results = [];

    for (const def of defs) {
      const result = this._matchMode === 'priority'
        ? this._matchDefinitionPriority(text, def)
        : this._matchDefinition(text, def);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Tag text and group by category
   * @param {string} text - Input text
   * @returns {Object} Map of category → matches
   */
  tagTextGrouped(text) {
    const tags = this.tagText(text);
    const grouped = {};

    for (const tag of tags) {
      const cat = tag.category || '_uncategorized';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(tag);
    }

    return grouped;
  }

  /**
   * List all taggable classes from the loaded ontology
   * @returns {Array<Object>} Class summaries
   */
  getTaggableClasses() {
    return this.tagDefinitions.map(d => ({
      id: d.id,
      label: d.label,
      category: d.category || null,
      keywordCount: d.keywords.length,
      hasPolarity: !!(d.upholdingTerms || d.violatingTerms)
    }));
  }

  /**
   * Get the compiled tag definition for a single class
   * @param {string} classId - Class ID (prefixed or full IRI)
   * @returns {Object|null} Tag definition or null
   */
  getTagDefinition(classId) {
    return this.tagDefinitions.find(d => d.id === classId) || null;
  }

  /**
   * Get summary statistics
   * @returns {Object} Stats object
   */
  getStats() {
    const categories = new Set();
    let withPolarity = 0;
    let totalKeywords = 0;

    for (const def of this.tagDefinitions) {
      totalKeywords += def.keywords.length;
      if (def.category) categories.add(def.category);
      if (def.upholdingTerms || def.violatingTerms) withPolarity++;
    }

    return {
      classCount: this.tagDefinitions.length,
      totalKeywords,
      withPolarity,
      categories: categories.size
    };
  }

  /**
   * Validate the property map against the loaded ontology
   * @returns {Object} Validation report
   */
  validatePropertyMap() {
    if (!this._parseResult) {
      return {
        valid: false,
        warnings: [],
        errors: ['No ontology loaded. Call loadFromString() first.'],
        coverage: {}
      };
    }

    return this.propertyMapper.validate(this._parseResult);
  }

  /**
   * Export tag definitions as JSON
   * @returns {Object} Serializable definitions
   */
  exportDefinitions() {
    return {
      domain: this.domain,
      propertyMap: this.propertyMap,
      classCount: this.tagDefinitions.length,
      definitions: this.tagDefinitions.map(d => ({ ...d })),
      exportedAt: new Date().toISOString()
    };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * In priority mode, add definitions for classes that have priority properties
   * (skos:prefLabel, skos:altLabel, etc.) but were excluded by the PropertyMapper
   * because they lack the configured keyword property (rdfs:label).
   * @private
   */
  _supplementPriorityDefinitions() {
    if (!this._parseResult) return;

    const existingIds = new Set(this.tagDefinitions.map(d => d.id));
    const allClasses = this._parseResult.getClasses();

    for (const cls of allClasses) {
      if (existingIds.has(cls.id)) continue;

      // Check if this class has any priority property values
      const evidence = this.propertyMapper._collectPropertyEvidence(cls.id, this._parseResult);
      if (evidence.length === 0) continue;

      // Build a minimal definition from the property evidence
      const allValues = [];
      for (const group of evidence) {
        for (const v of group.values) {
          allValues.push(v);
        }
      }

      const localName = cls.id.includes(':') && !cls.id.includes('://')
        ? cls.id.split(':').pop()
        : cls.id.includes('#') ? cls.id.split('#').pop()
        : cls.id.includes('/') ? cls.id.split('/').pop()
        : cls.id;

      const label = (evidence[0] && evidence[0].values[0]) || localName;

      this.tagDefinitions.push({
        id: cls.id,
        iri: this._parseResult.resolveIRI ? this._parseResult.resolveIRI(cls.id) : cls.id,
        name: localName,
        label: label,
        type: cls.type,
        keywords: allValues,
        propertyEvidence: evidence
      });
    }
  }

  /**
   * Match a single tag definition against text
   * @private
   */
  _matchDefinition(text, def) {
    const compareText = this.matchOptions.caseSensitive ? text : text.toLowerCase();
    let keywordCount = 0;
    const evidence = [];

    for (const keyword of def.keywords) {
      const compareKeyword = this.matchOptions.caseSensitive ? keyword : keyword.toLowerCase();

      let matched = false;
      if (this.matchOptions.wordBoundary) {
        const escaped = compareKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('\\b' + escaped + '\\b', this.matchOptions.caseSensitive ? 'g' : 'gi');
        const matches = text.match(regex);
        if (matches) {
          keywordCount += matches.length;
          matched = true;
        }
      } else {
        if (compareText.includes(compareKeyword)) {
          keywordCount++;
          matched = true;
        }
      }

      if (matched && evidence.indexOf(keyword) === -1) {
        evidence.push(keyword);
      }
    }

    // Check minimum keyword threshold
    if (keywordCount < this.matchOptions.minKeywordMatches) {
      return null;
    }

    // Calculate confidence as ratio of matched keywords to total
    const confidence = def.keywords.length > 0
      ? Math.round((evidence.length / def.keywords.length) * 100) / 100
      : 0;

    // Check confidence threshold
    if (confidence < this.matchOptions.confidenceThreshold) {
      return null;
    }

    // Determine polarity if mapped
    let polarity = 0;
    if (def.upholdingTerms || def.violatingTerms) {
      let upholdingCount = 0;
      let violatingCount = 0;

      if (def.upholdingTerms) {
        for (const term of def.upholdingTerms) {
          const lowerTerm = term.toLowerCase();
          if (text.toLowerCase().includes(lowerTerm)) {
            upholdingCount++;
          }
        }
      }

      if (def.violatingTerms) {
        for (const term of def.violatingTerms) {
          const lowerTerm = term.toLowerCase();
          if (text.toLowerCase().includes(lowerTerm)) {
            violatingCount++;
          }
        }
      }

      if (upholdingCount > 0 && violatingCount > 0) {
        polarity = 0; // conflicted
      } else if (violatingCount > 0) {
        polarity = -1;
      } else if (upholdingCount > 0) {
        polarity = 1;
      }
    }

    // Build result
    const result = {
      class: def.id,
      label: def.label,
      confidence,
      evidence,
      keywordCount,
      polarity,
      domain: this.domain,
      iri: def.iri || def.id
    };

    // Add category if present
    if (def.category) {
      result.category = def.category;
    }

    // Add metadata if present
    if (def.metadata && Object.keys(def.metadata).length > 0) {
      result.metadata = { ...def.metadata };
    }

    return result;
  }

  // ===========================================================================
  // Priority Matching Engine
  // ===========================================================================

  /**
   * Match a definition using the multi-property priority chain with morphological normalization.
   * @param {string} text - Input text
   * @param {Object} def - Tag definition with propertyEvidence
   * @returns {Object|null} Match result or null
   * @private
   */
  _matchDefinitionPriority(text, def) {
    const groups = def.propertyEvidence;
    if (!groups || groups.length === 0) {
      return this._matchDefinition(text, def);
    }

    // Extract possessive tokens upfront (needed in Phases 1, 2, 4)
    const possessiveTokens = this._extractPossessiveTokens(text);

    // Phase 1: EXACT match — word-boundary search in text for each property value
    // Also detects possessive context: "Smith's" matching "Smith" → inflection: possessive→base
    const phase1Matched = new Set(); // track which (value) matched exactly
    for (const group of groups) {
      for (const value of group.values) {
        const hit = this._wordBoundarySearchEx(text, value);
        if (hit) {
          phase1Matched.add(value.toLowerCase());
          // Check if the match is within a possessive token
          const possCtx = this._possessiveContext(hit, possessiveTokens);
          return this._buildPriorityResult(def, {
            matchType: group.matchType,
            evidence: [value],
            originalForm: possCtx ? possCtx.original : hit.originalForm,
            inflection: possCtx ? 'possessive→base' : null
          });
        }
      }
    }

    // Phase 2: POSSESSIVE-STRIPPED input against ontology values
    if (possessiveTokens.length > 0) {
      for (const pt of possessiveTokens) {
        const strippedLower = pt.stripped.toLowerCase();
        for (const group of groups) {
          for (const value of group.values) {
            const valueCleaned = this._stripPossessive(value);
            if (strippedLower === valueCleaned.toLowerCase()) {
              return this._buildPriorityResult(def, {
                matchType: group.matchType,
                evidence: [value],
                originalForm: pt.original,
                inflection: 'possessive→base'
              });
            }
          }
        }
      }
    }

    // Phase 3: LEMMA match — multi-candidate approach
    const lem = this._getLemmatizer();
    if (lem) {
      const tokens = text.split(/\s+/).map(t => t.replace(/[^a-zA-Z0-9'\u2019\u2018-]/g, '')).filter(t => t);

      for (const token of tokens) {
        const tokenLower = token.toLowerCase();
        // Get multiple lemma candidates (no-tag, NNS, verb paths)
        const candidates = this._getLemmaCandidates(tokenLower, lem);

        for (const cand of candidates) {
          for (const group of groups) {
            if (!group.lemmatizedValues) continue;
            for (const lv of group.lemmatizedValues) {
              // Guard: skip if already matched exactly in Phase 1
              if (phase1Matched.has(lv.original.toLowerCase()) && tokenLower === lv.original.toLowerCase()) {
                continue;
              }
              if (cand.lemma === lv.lemma && cand.lemma !== '') {
                // Verify normalization occurred on at least one side
                if (tokenLower === lv.original.toLowerCase()) continue;
                const inflection = this._determineInflection(tokenLower, cand.lemma, lv.original, lem);
                return this._buildPriorityResult(def, {
                  matchType: 'lemma',
                  evidence: [lv.original],
                  originalForm: token,
                  inflection: inflection
                });
              }
            }
          }
        }
      }
    }

    // Phase 4: POSSESSIVE + LEMMA compound
    if (lem && possessiveTokens.length > 0) {
      for (const pt of possessiveTokens) {
        const strippedLower = pt.stripped.toLowerCase();
        const candidates = this._getLemmaCandidates(strippedLower, lem);
        for (const cand of candidates) {
          for (const group of groups) {
            if (!group.lemmatizedValues) continue;
            for (const lv of group.lemmatizedValues) {
              if (cand.lemma === lv.lemma && cand.lemma !== '') {
                return this._buildPriorityResult(def, {
                  matchType: group.matchType,
                  evidence: [lv.original],
                  originalForm: pt.original,
                  inflection: 'possessive→base'
                });
              }
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Pre-compute lemmatized ontology values for each propertyEvidence group.
   * Uses multiple POS paths for robust lemmatization.
   * @private
   */
  _precomputeLemmas() {
    const lem = this._getLemmatizer();
    if (!lem) return;

    for (const def of this.tagDefinitions) {
      if (!def.propertyEvidence) continue;

      for (const group of def.propertyEvidence) {
        group.lemmatizedValues = group.values.map(v => {
          const cleaned = this._stripPossessive(v);
          const cleanedLower = cleaned.toLowerCase();
          // Get best non-identity lemma using multiple paths
          const candidates = this._getLemmaCandidates(cleanedLower, lem);
          const nonIdentity = candidates.filter(c => c.source !== 'identity');
          const bestLemma = nonIdentity.length > 0 ? nonIdentity[0].lemma : cleanedLower;
          return {
            original: v,
            cleaned: cleaned,
            lemma: bestLemma
          };
        });
      }
    }
  }

  /**
   * Get multiple lemma candidates for a token, trying different POS paths.
   * Returns candidates sorted by priority: no-tag first, then NNS, then verb forms.
   * @param {string} tokenLower - Lowercased token
   * @param {Object} lem - Lemmatizer instance
   * @returns {Array<{lemma: string, source: string}>} Lemma candidates
   * @private
   */
  _getLemmaCandidates(tokenLower, lem) {
    const candidates = [];
    const seen = new Set();

    // Identity candidate: enables bidirectional matching where the input is
    // already the base form but the ontology has an inflected form
    // (e.g., input "Criterion" matching ontology "Criteria" whose lemma is "criterion")
    candidates.push({ lemma: tokenLower, source: 'identity' });
    seen.add(tokenLower);

    // No-tag path (tries verb first, then noun)
    const noTag = lem.lemmatize(tokenLower);
    if (!seen.has(noTag.lemma)) {
      candidates.push({ lemma: noTag.lemma, source: noTag.category });
      seen.add(noTag.lemma);
    }

    // Explicit noun plural path (catches wolves→wolf which noTag misses)
    const nns = lem.lemmatize(tokenLower, 'NNS');
    if (!seen.has(nns.lemma)) {
      candidates.push({ lemma: nns.lemma, source: 'noun' });
      seen.add(nns.lemma);
    }

    // Explicit verb paths
    for (const tag of ['VBZ', 'VBG', 'VBD']) {
      const vr = lem.lemmatize(tokenLower, tag);
      if (!seen.has(vr.lemma)) {
        candidates.push({ lemma: vr.lemma, source: 'verb' });
        seen.add(vr.lemma);
      }
    }

    return candidates;
  }

  /**
   * Get or create the Lemmatizer instance (lazy).
   * @returns {Object|null} Lemmatizer instance or null
   * @private
   */
  _getLemmatizer() {
    if (this._lemmatizer) return this._lemmatizer;
    if (!Lemmatizer) return null;
    this._lemmatizer = new Lemmatizer();
    return this._lemmatizer;
  }

  /**
   * Strip possessive suffix from a string.
   * @param {string} str - Input string
   * @returns {string} String with possessive removed
   * @private
   */
  _stripPossessive(str) {
    if (!str) return '';
    return str.replace(/['\u2019\u2018]s?$/i, '').trim();
  }

  /**
   * Extract possessive tokens from text.
   * Matches both "word's" and "word'" patterns.
   * @param {string} text - Input text
   * @returns {Array<{original: string, stripped: string}>} Possessive tokens
   * @private
   */
  _extractPossessiveTokens(text) {
    const results = [];
    // Match word + apostrophe + optional s, followed by non-word or end
    const regex = /(\w+)(['\u2019\u2018]s?)(?=\s|$|[^a-zA-Z0-9])/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const original = match[0]; // e.g., "Smith's" or "Jones'"
      const stripped = match[1]; // e.g., "Smith" or "Jones"
      if (stripped && match[2]) {
        results.push({ original, stripped });
      }
    }
    return results;
  }

  /**
   * Word-boundary search for a value in text. Returns match with position info.
   * @param {string} text - Text to search
   * @param {string} value - Value to find
   * @returns {{originalForm: string, index: number}|null} Match info or null
   * @private
   */
  _wordBoundarySearchEx(text, value) {
    if (!value || !text) return null;
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('\\b' + escaped + '\\b', 'i');
    const match = regex.exec(text);
    if (match) {
      return { originalForm: match[0], index: match.index };
    }
    return null;
  }

  /**
   * Check if a word-boundary match is within a possessive context.
   * E.g., "Smith" matched within "Smith's" → possessive context.
   * @param {{originalForm: string, index: number}} hit - Match result
   * @param {Array} possessiveTokens - Extracted possessive tokens
   * @returns {{original: string, stripped: string}|null} Possessive token or null
   * @private
   */
  _possessiveContext(hit, possessiveTokens) {
    const hitLower = hit.originalForm.toLowerCase();
    for (const pt of possessiveTokens) {
      if (pt.stripped.toLowerCase() === hitLower) {
        return pt;
      }
    }
    return null;
  }

  /**
   * Determine the inflection type from a lemma match.
   * Uses ontology-side context: if the ontology value is a verb form, it's verb→base.
   * Checks irregular maps on both input and ontology sides.
   * @param {string} inputLower - Lowercased input token
   * @param {string} matchedLemma - The lemma that matched
   * @param {string} ontologyOriginal - Original ontology value
   * @param {Object} lem - Lemmatizer instance
   * @returns {string} Inflection description
   * @private
   */
  _determineInflection(inputLower, matchedLemma, ontologyOriginal, lem) {
    const ontoLower = ontologyOriginal.toLowerCase();

    // Check irregular noun maps on both sides (children→child, criteria→criterion)
    if (lem.irregularNouns && (lem.irregularNouns[inputLower] || lem.irregularNouns[ontoLower])) {
      return 'irregular';
    }
    // Irregular verbs (ran→run, swam→swim) → "verb→base" — from the consumer's
    // perspective what matters is that a verb was normalized, not regularity
    if (lem.irregularVerbs && (lem.irregularVerbs[inputLower] || lem.irregularVerbs[ontoLower])) {
      return 'verb→base';
    }

    // Check if the ontology value itself is a verb form
    // (e.g., "Running" → lemma "run" via verb path → verb domain)
    const ontoLemmaResult = lem.lemmatize(ontoLower);
    if (ontoLemmaResult.lemma !== ontoLower && ontoLemmaResult.category === 'verb') {
      return 'verb→base';
    }

    // Simple plural heuristic: if removing trailing 's' gives the matched lemma,
    // it's most likely a noun plural (agents→agent, operatives→operative)
    if (inputLower.endsWith('s') && inputLower.slice(0, -1) === matchedLemma) {
      return 'plural→singular';
    }

    // Check if the input is a verb form by trying verb-specific lemmatization
    for (const tag of ['VBG', 'VBD']) {
      const vr = lem.lemmatize(inputLower, tag);
      if (vr.lemma === matchedLemma && vr.lemma !== inputLower) {
        return 'verb→base';
      }
    }

    return 'plural→singular';
  }

  /**
   * Build the result object for a priority match.
   * @param {Object} def - Tag definition
   * @param {Object} matchInfo - Match details
   * @returns {Object} Tag result
   * @private
   */
  _buildPriorityResult(def, matchInfo) {
    return {
      class: def.id,
      label: def.label,
      confidence: 1.0,
      evidence: matchInfo.evidence,
      keywordCount: 1,
      polarity: 0,
      domain: this.domain,
      iri: def.iri || def.id,
      ontologyMatchType: matchInfo.matchType,
      ontologyMatchForm: matchInfo.originalForm,
      ontologyMatchInflection: matchInfo.inflection
    };
  }

  // ===========================================================================
  // Static Factory Methods
  // ===========================================================================

  /**
   * Create tagger from TTL string
   * @param {string} ttlContent - Turtle content
   * @param {Object} options - Configuration (same as constructor)
   * @returns {OntologyTextTagger} Configured and loaded tagger
   */
  static fromTTL(ttlContent, options = {}) {
    if (!options.propertyMap) {
      options = { ...options, propertyMap: { keywords: 'rdfs:label', label: 'rdfs:label' } };
    }
    const tagger = new OntologyTextTagger(options);
    tagger.loadFromString(ttlContent);
    return tagger;
  }

  /**
   * Create tagger from JSON config
   * @param {Object} jsonConfig - JSON configuration with class definitions
   * @param {Object} options - Configuration (same as constructor)
   * @returns {OntologyTextTagger} Configured and loaded tagger
   */
  static fromJSON(jsonConfig, options = {}) {
    if (!jsonConfig || !jsonConfig.classes) {
      throw new Error('fromJSON requires a config with "classes" array');
    }

    const tagger = new OntologyTextTagger(options);

    // Convert JSON classes directly to tagDefinitions
    tagger.tagDefinitions = jsonConfig.classes
      .filter(c => c.keywords || c[options.propertyMap?.keywords])
      .map(c => {
        const keywordProp = options.propertyMap?.keywords || 'keywords';
        const keywordsRaw = c[keywordProp] || c.keywords;
        const keywords = typeof keywordsRaw === 'string'
          ? keywordsRaw.split(',').map(s => s.trim()).filter(s => s)
          : Array.isArray(keywordsRaw) ? keywordsRaw : [];

        const def = {
          id: c.id || c.name,
          iri: c.iri || c.id || c.name,
          name: c.name || c.id,
          label: c.label || c.name || c.id,
          type: c.type || 'custom:Class',
          keywords
        };

        // Map optional properties from the JSON
        if (options.propertyMap?.upholding && c[options.propertyMap.upholding]) {
          const raw = c[options.propertyMap.upholding];
          def.upholdingTerms = typeof raw === 'string'
            ? raw.split(',').map(s => s.trim()).filter(s => s)
            : Array.isArray(raw) ? raw : [];
        }

        if (options.propertyMap?.violating && c[options.propertyMap.violating]) {
          const raw = c[options.propertyMap.violating];
          def.violatingTerms = typeof raw === 'string'
            ? raw.split(',').map(s => s.trim()).filter(s => s)
            : Array.isArray(raw) ? raw : [];
        }

        if (options.propertyMap?.category && c[options.propertyMap.category]) {
          def.category = c[options.propertyMap.category];
        }

        // Extra properties → metadata
        if (options.propertyMap?.extraProperties) {
          def.metadata = {};
          for (const prop of options.propertyMap.extraProperties) {
            const key = prop.includes(':') ? prop.split(':').pop() : prop;
            if (c[prop] !== undefined) {
              def.metadata[key] = c[prop];
            } else if (c[key] !== undefined) {
              def.metadata[key] = c[key];
            }
          }
        }

        return def;
      });

    return tagger;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OntologyTextTagger;
}
if (typeof window !== 'undefined') {
  window.OntologyTextTagger = OntologyTextTagger;
}
