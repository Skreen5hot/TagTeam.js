/**
 * @file src/ontology/OntologyManager.js
 * @description Phase 6.5.2 - Unified Ontology Manager
 *
 * Manages loading and querying of ontologies from multiple formats:
 * - JSON domain configs (existing format from DomainConfigLoader)
 * - TTL/Turtle files (via TurtleParser from Phase 6.5.1)
 *
 * Features:
 * - Auto-detect format by file extension
 * - Memory caching for performance
 * - Merge multiple ontologies with conflict tracking
 * - Query value definitions, type specializations, conflicts
 * - Support for IEE ValueNet integration
 *
 * @example
 * const manager = new OntologyManager();
 * manager.loadFromString(ttlContent, { format: 'turtle', namespace: 'vn' });
 * manager.loadFromObject(jsonConfig);
 * const value = manager.getValueDefinition('SecurityDisposition');
 */

const TurtleParser = require('./TurtleParser.js');

/**
 * Unified Ontology Manager
 *
 * Loads and manages ontologies from JSON and TTL formats with caching and merge support.
 */
class OntologyManager {
  /**
   * Create a new OntologyManager
   * @param {Object} options - Configuration options
   * @param {boolean} [options.cacheEnabled=true] - Enable memory caching
   */
  constructor(options = {}) {
    this.options = {
      cacheEnabled: options.cacheEnabled !== false,
      ...options
    };

    // Memory cache for parsed ontologies
    this.cache = new Map();

    // Loaded ontologies metadata
    this.loadedOntologies = [];

    // Value definitions from TTL (name -> definition)
    this.valueDefinitions = new Map();

    // Type specializations from JSON configs (bfoType -> term -> specializedType)
    this.typeSpecializations = new Map();

    // Process root words from JSON configs
    this.processRootWords = new Map();

    // Verb overrides from JSON configs
    this.verbOverrides = new Map();

    // Conflict tracking (valueName -> array of conflict IRIs)
    this.conflicts = new Map();

    // Merge conflicts (for tracking overwrites)
    this.mergeConflicts = [];

    // TurtleParser instance
    this.turtleParser = new TurtleParser();
  }

  /**
   * Detect format from file path/name
   * @param {string} path - File path or name
   * @param {string} [explicitFormat] - Explicit format override
   * @returns {string|null} Detected format ('turtle', 'json') or null
   */
  detectFormat(path, explicitFormat) {
    if (explicitFormat) {
      return explicitFormat;
    }

    if (!path) return null;

    const lowerPath = path.toLowerCase();

    if (lowerPath.endsWith('.ttl') || lowerPath.endsWith('.turtle')) {
      return 'turtle';
    }

    if (lowerPath.endsWith('.json')) {
      return 'json';
    }

    return null;
  }

  /**
   * Load ontology from string content
   * @param {string} content - String content (TTL or JSON)
   * @param {Object} options - Load options
   * @param {string} options.format - Format ('turtle' or 'json')
   * @param {string} [options.namespace] - Namespace prefix
   * @param {string} [options.cacheKey] - Cache key for caching
   * @param {boolean} [options.forceReload=false] - Force reload even if cached
   * @param {boolean} [options.merge=true] - Merge with existing (or replace)
   * @returns {Object} Load result { success, valueCount, fromCache, errors }
   */
  loadFromString(content, options = {}) {
    const format = options.format;
    const cacheKey = options.cacheKey;
    const forceReload = options.forceReload || false;
    const merge = options.merge !== false;

    // Check cache
    if (this.options.cacheEnabled && cacheKey && !forceReload && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      return { success: true, valueCount: cached.valueCount, fromCache: true };
    }

    let result;

    if (format === 'turtle') {
      result = this._loadTurtle(content, options, merge);
    } else if (format === 'json') {
      const obj = JSON.parse(content);
      return this.loadFromObject(obj, { ...options, merge });
    } else {
      return { success: false, valueCount: 0, errors: ['Unknown format'] };
    }

    // Cache if enabled
    if (this.options.cacheEnabled && cacheKey) {
      this.cache.set(cacheKey, { valueCount: result.valueCount });
    }

    result.fromCache = false;
    return result;
  }

  /**
   * Load ontology from JSON object
   * @param {Object} config - JSON config object
   * @param {Object} [options] - Load options
   * @param {boolean} [options.merge=true] - Merge with existing
   * @returns {Object} Load result { success, errors }
   */
  loadFromObject(config, options = {}) {
    const merge = options.merge !== false;

    // Validate required fields
    if (!config.domain) {
      throw new Error('Config must have a "domain" field');
    }
    if (!config.version) {
      throw new Error('Config must have a "version" field');
    }

    // Clear if not merging
    if (!merge) {
      this._clearJsonData();
    }

    // Track the loaded ontology
    this.loadedOntologies.push({
      namespace: config.domain,
      format: 'json',
      version: config.version,
      valueCount: 0,
      loadedAt: new Date().toISOString()
    });

    // Merge type specializations
    if (config.typeSpecializations) {
      for (const [bfoType, terms] of Object.entries(config.typeSpecializations)) {
        if (!this.typeSpecializations.has(bfoType)) {
          this.typeSpecializations.set(bfoType, new Map());
        }
        const typeMap = this.typeSpecializations.get(bfoType);

        for (const [term, specializedType] of Object.entries(terms)) {
          typeMap.set(term.toLowerCase(), specializedType);
        }
      }
    }

    // Merge process root words
    if (config.processRootWords) {
      for (const [term, type] of Object.entries(config.processRootWords)) {
        this.processRootWords.set(term.toLowerCase(), type);
      }
    }

    // Merge verb overrides
    if (config.verbOverrides) {
      for (const [verb, overrides] of Object.entries(config.verbOverrides)) {
        this.verbOverrides.set(verb.toLowerCase(), {
          ...this.verbOverrides.get(verb.toLowerCase()),
          ...overrides
        });
      }
    }

    return { success: true, valueCount: 0, fromCache: false };
  }

  /**
   * Load Turtle content
   * @private
   */
  _loadTurtle(content, options, merge) {
    const namespace = options.namespace || 'default';

    // Clear if not merging
    if (!merge) {
      this._clearTtlData();
    }

    // Parse with TurtleParser
    const parseResult = this.turtleParser.parse(content);

    // Extract value definitions
    const valueDefs = parseResult.getAllValueDefinitions();
    let valueCount = 0;

    for (const def of valueDefs) {
      const name = this._extractLocalName(def.id);

      // Check for merge conflict
      if (this.valueDefinitions.has(name)) {
        const existing = this.valueDefinitions.get(name);
        this.mergeConflicts.push({
          name,
          previous: existing,
          current: def,
          namespace
        });
      }

      // Store value definition
      this.valueDefinitions.set(name, {
        id: def.id,
        iri: def.iri,
        name: def.name || name,
        label: def.label || name,
        type: def.type,
        keywords: this._parseCommaSeparated(def.keywords || []),
        upholdingTerms: def.upholdingTerms || [],
        violatingTerms: def.violatingTerms || [],
        description: def.description,
        namespace
      });

      valueCount++;
    }

    // Extract conflicts from relationships
    const conflictTriples = parseResult.triples.filter(
      t => t.predicate.includes('conflictsWith')
    );

    for (const triple of conflictTriples) {
      const subjectName = this._extractLocalName(triple.subject);
      if (!this.conflicts.has(subjectName)) {
        this.conflicts.set(subjectName, []);
      }
      this.conflicts.get(subjectName).push(triple.object);
    }

    // Track the loaded ontology
    this.loadedOntologies.push({
      namespace,
      format: 'turtle',
      valueCount,
      prefixes: parseResult.prefixes,
      loadedAt: new Date().toISOString()
    });

    return {
      success: true,
      valueCount,
      errors: parseResult.errors
    };
  }

  /**
   * Extract local name from IRI or prefixed name
   * @private
   */
  _extractLocalName(iri) {
    if (!iri) return '';

    // Prefixed form (vn:SecurityDisposition)
    if (iri.includes(':') && !iri.includes('://')) {
      return iri.split(':').pop();
    }

    // Full IRI
    if (iri.includes('#')) {
      return iri.split('#').pop();
    }

    if (iri.includes('/')) {
      return iri.split('/').pop();
    }

    return iri;
  }

  /**
   * Parse comma-separated string or array to array
   * @private
   */
  _parseCommaSeparated(value) {
    if (Array.isArray(value)) {
      // Flatten if array contains comma-separated strings
      return value.flatMap(v =>
        typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(s => s) : [v]
      );
    }

    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim()).filter(s => s);
    }

    return [];
  }

  /**
   * Clear only TTL-related data
   * @private
   */
  _clearTtlData() {
    this.valueDefinitions.clear();
    this.conflicts.clear();
    this.loadedOntologies = this.loadedOntologies.filter(o => o.format !== 'turtle');
  }

  /**
   * Clear only JSON-related data
   * @private
   */
  _clearJsonData() {
    this.typeSpecializations.clear();
    this.processRootWords.clear();
    this.verbOverrides.clear();
    this.loadedOntologies = this.loadedOntologies.filter(o => o.format !== 'json');
  }

  // ===========================================================================
  // Query Methods
  // ===========================================================================

  /**
   * Get value definition by name or IRI
   * @param {string} name - Value name or IRI
   * @returns {Object|null} Value definition or null
   */
  getValueDefinition(name) {
    if (!name) return null;

    // Try direct lookup
    if (this.valueDefinitions.has(name)) {
      return this.valueDefinitions.get(name);
    }

    // Try with local name extraction
    const localName = this._extractLocalName(name);
    if (this.valueDefinitions.has(localName)) {
      return this.valueDefinitions.get(localName);
    }

    return null;
  }

  /**
   * Get all value definitions
   * @returns {Array} Array of value definitions
   */
  getAllValueDefinitions() {
    return Array.from(this.valueDefinitions.values());
  }

  /**
   * Check if a value exists
   * @param {string} name - Value name
   * @returns {boolean} True if value exists
   */
  hasValue(name) {
    return this.getValueDefinition(name) !== null;
  }

  /**
   * Get type specialization
   * @param {string} bfoType - BFO type
   * @param {string} term - Term to specialize
   * @returns {string|null} Specialized type or null
   */
  getTypeSpecialization(bfoType, term) {
    const typeMap = this.typeSpecializations.get(bfoType);
    if (!typeMap) return null;

    return typeMap.get(term.toLowerCase()) || null;
  }

  /**
   * Get process root type
   * @param {string} term - Process term
   * @returns {string|null} Process type or null
   */
  getProcessRootType(term) {
    return this.processRootWords.get(term.toLowerCase()) || null;
  }

  /**
   * Get conflicts for a value
   * @param {string} name - Value name
   * @returns {Array} Array of conflicting value IRIs
   */
  getConflicts(name) {
    const localName = this._extractLocalName(name);
    return this.conflicts.get(localName) || [];
  }

  /**
   * Find values by keyword
   * @param {string} keyword - Keyword to search
   * @returns {Array} Matching value definitions
   */
  findByKeyword(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    const results = [];

    for (const def of this.valueDefinitions.values()) {
      const keywords = def.keywords || [];
      if (keywords.some(k => k.toLowerCase().includes(lowerKeyword))) {
        results.push(def);
      }
    }

    return results;
  }

  /**
   * Get loaded ontologies metadata
   * @returns {Array} Loaded ontology metadata
   */
  getLoadedOntologies() {
    return [...this.loadedOntologies];
  }

  // ===========================================================================
  // Merge Conflict Methods
  // ===========================================================================

  /**
   * Get all merge conflicts
   * @returns {Array} Merge conflicts
   */
  getMergeConflicts() {
    return [...this.mergeConflicts];
  }

  /**
   * Check if there are merge conflicts
   * @returns {boolean} True if conflicts exist
   */
  hasMergeConflicts() {
    return this.mergeConflicts.length > 0;
  }

  // ===========================================================================
  // Cache Methods
  // ===========================================================================

  /**
   * Check if content is cached
   * @param {string} cacheKey - Cache key
   * @returns {boolean} True if cached
   */
  isCached(cacheKey) {
    return this.cache.has(cacheKey);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      entries: this.cache.size
    };
  }

  // ===========================================================================
  // Clear and Reset Methods
  // ===========================================================================

  /**
   * Clear all loaded ontologies and cache
   */
  clear() {
    this.valueDefinitions.clear();
    this.typeSpecializations.clear();
    this.processRootWords.clear();
    this.verbOverrides.clear();
    this.conflicts.clear();
    this.mergeConflicts = [];
    this.loadedOntologies = [];
    this.cache.clear();
  }

  /**
   * Unload a specific ontology by namespace
   * @param {string} namespace - Namespace to unload
   * @returns {boolean} True if unloaded
   */
  unloadOntology(namespace) {
    const index = this.loadedOntologies.findIndex(o => o.namespace === namespace);
    if (index === -1) return false;

    const ontology = this.loadedOntologies[index];

    // Remove values from this namespace
    for (const [name, def] of this.valueDefinitions.entries()) {
      if (def.namespace === namespace) {
        this.valueDefinitions.delete(name);
      }
    }

    // Remove from loaded list
    this.loadedOntologies.splice(index, 1);

    return true;
  }

  // ===========================================================================
  // Serialization Methods
  // ===========================================================================

  /**
   * Serialize manager state to JSON
   * @returns {Object} Serializable state
   */
  toJSON() {
    return {
      loadedOntologies: this.loadedOntologies,
      valueDefinitions: Object.fromEntries(this.valueDefinitions),
      typeSpecializations: Object.fromEntries(
        Array.from(this.typeSpecializations.entries()).map(
          ([k, v]) => [k, Object.fromEntries(v)]
        )
      ),
      processRootWords: Object.fromEntries(this.processRootWords),
      conflicts: Object.fromEntries(this.conflicts)
    };
  }

  /**
   * Restore manager state from JSON
   * @param {Object} json - Serialized state
   */
  fromJSON(json) {
    if (json.loadedOntologies) {
      this.loadedOntologies = json.loadedOntologies;
    }

    if (json.valueDefinitions) {
      this.valueDefinitions = new Map(Object.entries(json.valueDefinitions));
    }

    if (json.typeSpecializations) {
      this.typeSpecializations = new Map(
        Object.entries(json.typeSpecializations).map(
          ([k, v]) => [k, new Map(Object.entries(v))]
        )
      );
    }

    if (json.processRootWords) {
      this.processRootWords = new Map(Object.entries(json.processRootWords));
    }

    if (json.conflicts) {
      this.conflicts = new Map(Object.entries(json.conflicts));
    }
  }

  /**
   * Get usage statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      totalOntologies: this.loadedOntologies.length,
      totalValues: this.valueDefinitions.size,
      totalTypeSpecializations: Array.from(this.typeSpecializations.values())
        .reduce((sum, map) => sum + map.size, 0),
      totalProcessRoots: this.processRootWords.size,
      totalConflicts: this.conflicts.size,
      cacheEntries: this.cache.size
    };
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OntologyManager;
}
if (typeof window !== 'undefined') {
  window.OntologyManager = OntologyManager;
}
