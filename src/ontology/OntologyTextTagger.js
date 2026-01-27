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

// Try to load ValueMatcher - may not be available in all contexts
let ValueMatcher;
try {
  ValueMatcher = require('../analyzers/ValueMatcher.js');
} catch (e) {
  ValueMatcher = null;
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
      const result = this._matchDefinition(text, def);
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
   * Export as ValueMatcher-compatible format
   * @returns {Object} { values: [...], version, source }
   */
  toValueMatcherFormat() {
    const values = this.tagDefinitions.map(def => ({
      name: def.label || def.name,
      domain: this.domain,
      semanticMarkers: def.keywords,
      polarityIndicators: {
        upholding: def.upholdingTerms || [],
        violating: def.violatingTerms || []
      },
      iri: def.iri || def.id,
      bfoType: def.type
    }));

    return {
      values,
      version: '6.6',
      source: this.domain,
      description: `Values converted by OntologyTextTagger (${this.domain})`,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Create a ValueMatcher instance
   * @returns {Object} ValueMatcher instance
   * @throws {Error} If ValueMatcher is not available
   */
  createValueMatcher() {
    if (!ValueMatcher) {
      throw new Error('ValueMatcher is not available. Ensure it is properly imported.');
    }
    return new ValueMatcher(this.toValueMatcherFormat());
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
  // Static Factory Methods
  // ===========================================================================

  /**
   * Create tagger from TTL string
   * @param {string} ttlContent - Turtle content
   * @param {Object} options - Configuration (same as constructor)
   * @returns {OntologyTextTagger} Configured and loaded tagger
   */
  static fromTTL(ttlContent, options = {}) {
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
