/**
 * @file src/ontology/BridgeOntologyLoader.js
 * @description Phase 6.5.4 - IEE Bridge Ontology Loader
 *
 * Loads and queries bridge ontologies that map between:
 * - TagTeam 50 values ↔ ValueNet dispositions
 * - ValueNet dispositions ↔ IEE worldview values
 *
 * Supports predicates:
 * - owl:sameAs (equivalence)
 * - ethics:relatedTo (association)
 * - ethics:mapsToWorldview (worldview mapping)
 * - ethics:subsumedBy (subsumption)
 *
 * @example
 * const loader = new BridgeOntologyLoader({ ontologyManager });
 * loader.loadFromString(bridgeTTL);
 * const equivalent = loader.findEquivalent('tagteam:Autonomy');
 * // Returns: 'vn:AutonomyDisposition'
 */

const TurtleParser = require('./TurtleParser.js');
const OntologyManager = require('./OntologyManager.js');

/**
 * Bridge Ontology Loader
 *
 * Manages mappings between TagTeam, ValueNet, and IEE ontologies.
 */
class BridgeOntologyLoader {
  /**
   * Create a new BridgeOntologyLoader
   * @param {Object} [options] - Configuration options
   * @param {OntologyManager} [options.ontologyManager] - OntologyManager instance
   * @param {Object} [options.namespaces] - Custom namespace mappings
   * @param {Array<string>} [options.equivalencePredicates] - Custom equivalence predicates
   * @param {Array<string>} [options.relatedPredicates] - Custom related predicates
   * @param {Array<string>} [options.worldviewPredicates] - Custom worldview predicates
   */
  constructor(options = {}) {
    // Use provided OntologyManager or create new one
    this.ontologyManager = options.ontologyManager || new OntologyManager();

    // Default namespaces
    this.namespaces = {
      owl: 'http://www.w3.org/2002/07/owl#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      tagteam: 'https://tagteam.js/ontology/values#',
      vn: 'https://fandaws.com/ontology/bfo/valuenet#',
      iee: 'https://iee.org/ontology/worldview#',
      ethics: 'https://ethics.org/ontology#',
      ...options.namespaces
    };

    // Predicates to recognize for different mapping types
    this.equivalencePredicates = options.equivalencePredicates || [
      'owl:sameAs',
      'http://www.w3.org/2002/07/owl#sameAs'
    ];

    this.relatedPredicates = options.relatedPredicates || [
      'ethics:relatedTo',
      'https://ethics.org/ontology#relatedTo'
    ];

    this.worldviewPredicates = options.worldviewPredicates || [
      'ethics:mapsToWorldview',
      'https://ethics.org/ontology#mapsToWorldview'
    ];

    this.subsumptionPredicates = options.subsumptionPredicates || [
      'ethics:subsumedBy',
      'https://ethics.org/ontology#subsumedBy'
    ];

    // Mapping storage
    this.equivalences = [];      // owl:sameAs mappings
    this.related = [];           // ethics:relatedTo mappings
    this.worldviews = [];        // ethics:mapsToWorldview mappings
    this.subsumptions = [];      // ethics:subsumedBy mappings

    // All mappings combined
    this.allMappings = [];

    // Loading state
    this._loaded = false;
    this._loadedSources = [];

    // Parser instance
    this.parser = new TurtleParser();
  }

  /**
   * Get the OntologyManager instance
   * @returns {OntologyManager} The OntologyManager
   */
  getOntologyManager() {
    return this.ontologyManager;
  }

  /**
   * Get namespace mappings
   * @returns {Object} Namespace mappings
   */
  getNamespaces() {
    return { ...this.namespaces };
  }

  /**
   * Check if any bridge ontology has been loaded
   * @returns {boolean} True if loaded
   */
  isLoaded() {
    return this._loaded;
  }

  /**
   * Load bridge ontology from TTL string
   * @param {string} content - TTL content
   * @param {Object} [options] - Load options
   * @param {boolean} [options.merge=true] - Merge with existing mappings
   * @returns {Object} Load result { success, mappingCount, equivalenceCount, errors }
   */
  loadFromString(content, options = {}) {
    const merge = options.merge !== false;

    // Handle null/empty input
    if (!content) {
      return {
        success: true,
        mappingCount: 0,
        equivalenceCount: 0,
        errors: []
      };
    }

    // Clear if not merging
    if (!merge) {
      this._clearMappings();
    }

    // Parse TTL
    let parseResult;
    try {
      parseResult = this.parser.parse(content);
    } catch (e) {
      return {
        success: true,
        mappingCount: 0,
        equivalenceCount: 0,
        errors: [e.message]
      };
    }

    // Extract mappings from triples
    const triples = parseResult.triples || [];

    let mappingCount = 0;
    let equivalenceCount = 0;
    let relatedCount = 0;
    let worldviewCount = 0;
    let subsumptionCount = 0;

    for (const triple of triples) {
      const mapping = {
        source: triple.subject,
        predicate: triple.predicate,
        target: triple.object
      };

      // Check predicate type
      if (this._isEquivalencePredicate(triple.predicate)) {
        this.equivalences.push(mapping);
        this.allMappings.push({ ...mapping, type: 'equivalence' });
        equivalenceCount++;
        mappingCount++;

        // Handle owl:sameAs symmetry - add reverse mapping
        this.equivalences.push({
          source: triple.object,
          predicate: triple.predicate,
          target: triple.subject
        });
      } else if (this._isRelatedPredicate(triple.predicate)) {
        this.related.push(mapping);
        this.allMappings.push({ ...mapping, type: 'related' });
        relatedCount++;
        mappingCount++;
      } else if (this._isWorldviewPredicate(triple.predicate)) {
        this.worldviews.push(mapping);
        this.allMappings.push({ ...mapping, type: 'worldview' });
        worldviewCount++;
        mappingCount++;
      } else if (this._isSubsumptionPredicate(triple.predicate)) {
        this.subsumptions.push(mapping);
        this.allMappings.push({ ...mapping, type: 'subsumption' });
        subsumptionCount++;
        mappingCount++;
      }
    }

    // Update loading state
    this._loaded = mappingCount > 0 || this._loaded;
    this._loadedSources.push({
      loadedAt: new Date().toISOString(),
      mappingCount,
      equivalenceCount,
      relatedCount,
      worldviewCount
    });

    return {
      success: true,
      mappingCount,
      equivalenceCount,
      relatedCount,
      worldviewCount,
      subsumptionCount,
      errors: parseResult.errors || []
    };
  }

  // ===========================================================================
  // Predicate Type Checking
  // ===========================================================================

  /**
   * Check if predicate is an equivalence predicate
   * @private
   */
  _isEquivalencePredicate(predicate) {
    return this.equivalencePredicates.some(p =>
      predicate === p || predicate.includes('sameAs') || predicate.endsWith(p.split(':').pop())
    );
  }

  /**
   * Check if predicate is a related predicate
   * @private
   */
  _isRelatedPredicate(predicate) {
    return this.relatedPredicates.some(p =>
      predicate === p || predicate.includes('relatedTo') || predicate.endsWith(p.split(':').pop())
    );
  }

  /**
   * Check if predicate is a worldview predicate
   * @private
   */
  _isWorldviewPredicate(predicate) {
    return this.worldviewPredicates.some(p =>
      predicate === p || predicate.includes('mapsToWorldview') || predicate.endsWith(p.split(':').pop())
    );
  }

  /**
   * Check if predicate is a subsumption predicate
   * @private
   */
  _isSubsumptionPredicate(predicate) {
    return this.subsumptionPredicates.some(p =>
      predicate === p || predicate.includes('subsumedBy') || predicate.endsWith(p.split(':').pop())
    );
  }

  // ===========================================================================
  // Query Methods - Equivalence
  // ===========================================================================

  /**
   * Get all equivalence mappings
   * @returns {Array} Equivalence mappings
   */
  getEquivalenceMappings() {
    return [...this.equivalences];
  }

  /**
   * Find equivalent value
   * @param {string} value - Value IRI or local name
   * @param {Object} [options] - Query options
   * @param {boolean} [options.reverse=false] - Search in reverse direction
   * @returns {string|null} Equivalent value IRI or null
   */
  findEquivalent(value, options = {}) {
    const searchField = options.reverse ? 'target' : 'source';
    const resultField = options.reverse ? 'source' : 'target';

    // Try exact match first
    let mapping = this.equivalences.find(m => m[searchField] === value);

    // Try local name match
    if (!mapping) {
      const localName = this._extractLocalName(value);
      mapping = this.equivalences.find(m =>
        this._extractLocalName(m[searchField]) === localName
      );
    }

    return mapping ? mapping[resultField] : null;
  }

  /**
   * Get equivalences from a specific namespace
   * @param {string} namespace - Namespace prefix (e.g., 'tagteam')
   * @returns {Array} Matching equivalences
   */
  getEquivalencesFrom(namespace) {
    return this.equivalences.filter(m =>
      m.source.includes(namespace) || m.source.startsWith(namespace + ':')
    );
  }

  // ===========================================================================
  // Query Methods - Related
  // ===========================================================================

  /**
   * Get all related mappings
   * @returns {Array} Related mappings
   */
  getRelatedMappings() {
    return [...this.related];
  }

  /**
   * Find related values
   * @param {string} value - Value IRI or local name
   * @returns {Array<string>} Related value IRIs
   */
  findRelated(value) {
    const results = [];

    // Try exact match
    for (const mapping of this.related) {
      if (mapping.source === value) {
        results.push(mapping.target);
      }
    }

    // Try local name match
    if (results.length === 0) {
      const localName = this._extractLocalName(value);
      for (const mapping of this.related) {
        if (this._extractLocalName(mapping.source) === localName) {
          results.push(mapping.target);
        }
      }
    }

    return results;
  }

  /**
   * Get related mappings from a specific namespace
   * @param {string} namespace - Namespace prefix
   * @returns {Array} Matching related mappings
   */
  getRelatedFrom(namespace) {
    return this.related.filter(m =>
      m.source.includes(namespace) || m.source.startsWith(namespace + ':')
    );
  }

  // ===========================================================================
  // Query Methods - Worldview
  // ===========================================================================

  /**
   * Get all worldview mappings
   * @returns {Array} Worldview mappings
   */
  getWorldviewMappings() {
    return [...this.worldviews];
  }

  /**
   * Find worldview for a ValueNet disposition
   * @param {string} disposition - Disposition IRI or local name
   * @returns {string|null} Worldview IRI or null
   */
  findWorldview(disposition) {
    // Try exact match
    let mapping = this.worldviews.find(m => m.source === disposition);

    // Try local name match
    if (!mapping) {
      const localName = this._extractLocalName(disposition);
      mapping = this.worldviews.find(m =>
        this._extractLocalName(m.source) === localName
      );
    }

    return mapping ? mapping.target : null;
  }

  /**
   * Find worldview for a TagTeam value (via ValueNet)
   * @param {string} tagteamValue - TagTeam value IRI
   * @returns {string|null} IEE worldview IRI or null
   */
  findWorldviewForTagTeam(tagteamValue) {
    // First find ValueNet equivalent
    const vnDisposition = this.findEquivalent(tagteamValue);
    if (!vnDisposition) return null;

    // Then find worldview mapping
    return this.findWorldview(vnDisposition);
  }

  /**
   * Find all values that map to a worldview
   * @param {string} worldview - Worldview IRI
   * @returns {Array<string>} Value IRIs
   */
  findValuesForWorldview(worldview) {
    const results = [];

    for (const mapping of this.worldviews) {
      if (mapping.target === worldview ||
          this._extractLocalName(mapping.target) === this._extractLocalName(worldview)) {
        results.push(mapping.source);
      }
    }

    return results;
  }

  /**
   * Get all worldview mappings as object
   * @returns {Object} Worldview lookup { disposition: worldview }
   */
  getAllWorldviewMappings() {
    const result = {};
    for (const mapping of this.worldviews) {
      result[mapping.source] = mapping.target;
    }
    return result;
  }

  // ===========================================================================
  // Query Methods - Subsumption
  // ===========================================================================

  /**
   * Get all subsumption mappings
   * @returns {Array} Subsumption mappings
   */
  getSubsumptionMappings() {
    return [...this.subsumptions];
  }

  // ===========================================================================
  // Full Pipeline Methods
  // ===========================================================================

  /**
   * Resolve a TagTeam value to its full definition via bridge
   * @param {string} tagteamValue - TagTeam value IRI
   * @returns {Object|null} Full value definition or null
   */
  resolveValue(tagteamValue) {
    // Find ValueNet equivalent
    const vnDisposition = this.findEquivalent(tagteamValue);
    if (!vnDisposition) return null;

    // Get definition from OntologyManager
    const localName = this._extractLocalName(vnDisposition);
    return this.ontologyManager.getValueDefinition(localName);
  }

  /**
   * Get complete mapping chain for a TagTeam value
   * @param {string} tagteamValue - TagTeam value IRI
   * @returns {Object} Mapping chain { tagteamValue, valuenetDisposition, ieeWorldview }
   */
  getMappingChain(tagteamValue) {
    const vnDisposition = this.findEquivalent(tagteamValue);
    const ieeWorldview = vnDisposition ? this.findWorldview(vnDisposition) : null;

    return {
      tagteamValue,
      valuenetDisposition: vnDisposition,
      ieeWorldview
    };
  }

  /**
   * Get all mappings
   * @returns {Array} All mappings
   */
  getMappings() {
    return [...this.allMappings];
  }

  // ===========================================================================
  // Batch Operations
  // ===========================================================================

  /**
   * Resolve multiple values at once
   * @param {Array<string>} values - Array of value IRIs
   * @returns {Array<Object>} Resolution results
   */
  resolveAll(values) {
    return values.map(value => {
      const chain = this.getMappingChain(value);
      return {
        ...chain,
        found: chain.valuenetDisposition !== null
      };
    });
  }

  /**
   * Convert mappings to lookup table
   * @returns {Object} Lookup table { source: { equivalent, related, worldview } }
   */
  toLookupTable() {
    const table = {};

    for (const mapping of this.equivalences) {
      if (!table[mapping.source]) {
        table[mapping.source] = { equivalences: [], related: [], worldview: null };
      }
      table[mapping.source].equivalences.push(mapping.target);
    }

    for (const mapping of this.related) {
      if (!table[mapping.source]) {
        table[mapping.source] = { equivalences: [], related: [], worldview: null };
      }
      table[mapping.source].related.push(mapping.target);
    }

    for (const mapping of this.worldviews) {
      if (!table[mapping.source]) {
        table[mapping.source] = { equivalences: [], related: [], worldview: null };
      }
      table[mapping.source].worldview = mapping.target;
    }

    return table;
  }

  /**
   * Export all mappings to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      equivalences: this.equivalences.map(m => ({
        source: m.source,
        target: m.target
      })),
      related: this.related.map(m => ({
        source: m.source,
        target: m.target
      })),
      worldviews: this.worldviews.map(m => ({
        source: m.source,
        target: m.target
      })),
      subsumptions: this.subsumptions.map(m => ({
        source: m.source,
        target: m.target
      })),
      namespaces: this.namespaces,
      loadedSources: this._loadedSources
    };
  }

  // ===========================================================================
  // Clear and Reset
  // ===========================================================================

  /**
   * Clear all mappings
   * @private
   */
  _clearMappings() {
    this.equivalences = [];
    this.related = [];
    this.worldviews = [];
    this.subsumptions = [];
    this.allMappings = [];
  }

  /**
   * Clear all loaded data
   */
  clear() {
    this._clearMappings();
    this._loaded = false;
    this._loadedSources = [];
  }

  // ===========================================================================
  // Statistics and Metadata
  // ===========================================================================

  /**
   * Get mapping statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      totalMappings: this.allMappings.length,
      equivalenceMappings: this.equivalences.length / 2, // Divided by 2 due to symmetry
      relatedMappings: this.related.length,
      worldviewMappings: this.worldviews.length,
      subsumptionMappings: this.subsumptions.length
    };
  }

  /**
   * Get namespaces used in mappings
   * @returns {Array<string>} Namespace prefixes
   */
  getUsedNamespaces() {
    const namespaces = new Set();

    for (const mapping of this.allMappings) {
      // Extract namespace from prefixed form
      if (mapping.source.includes(':') && !mapping.source.includes('://')) {
        namespaces.add(mapping.source.split(':')[0]);
      }
      if (mapping.target.includes(':') && !mapping.target.includes('://')) {
        namespaces.add(mapping.target.split(':')[0]);
      }

      // Extract namespace from full IRI
      for (const [prefix, uri] of Object.entries(this.namespaces)) {
        if (mapping.source.startsWith(uri) || mapping.target.startsWith(uri)) {
          namespaces.add(prefix);
        }
      }
    }

    return Array.from(namespaces);
  }

  /**
   * Get loaded sources metadata
   * @returns {Array} Source metadata
   */
  getLoadedSources() {
    return [...this._loadedSources];
  }

  /**
   * Get coverage statistics
   * @returns {Object} Coverage stats
   */
  getCoverage() {
    const tagteamValues = new Set();
    const valuenetDispositions = new Set();
    const ieeWorldviews = new Set();

    for (const mapping of this.equivalences) {
      if (mapping.source.includes('tagteam')) {
        tagteamValues.add(mapping.source);
      }
      if (mapping.target.includes('tagteam')) {
        tagteamValues.add(mapping.target);
      }
      if (mapping.source.includes('vn:') || mapping.source.includes('valuenet')) {
        valuenetDispositions.add(mapping.source);
      }
      if (mapping.target.includes('vn:') || mapping.target.includes('valuenet')) {
        valuenetDispositions.add(mapping.target);
      }
    }

    for (const mapping of this.worldviews) {
      if (mapping.target.includes('iee:') || mapping.target.includes('worldview')) {
        ieeWorldviews.add(mapping.target);
      }
    }

    return {
      tagteamValues: tagteamValues.size,
      valuenetDispositions: valuenetDispositions.size,
      ieeWorldviews: ieeWorldviews.size
    };
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

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
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BridgeOntologyLoader;
}
if (typeof window !== 'undefined') {
  window.BridgeOntologyLoader = BridgeOntologyLoader;
}
