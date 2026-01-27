/**
 * @file src/ontology/ValueNetAdapter.js
 * @description Phase 6.5.3 - ValueNet Integration Adapter
 *
 * Converts OntologyManager's value definitions (from TTL/ValueNet)
 * to the format expected by ValueMatcher for ethical value detection.
 *
 * This adapter bridges:
 * - OntologyManager (TTL format): keywords, upholdingTerms, violatingTerms
 * - ValueMatcher (JSON format): semanticMarkers, polarityIndicators
 *
 * @example
 * const manager = new OntologyManager();
 * manager.loadFromString(valuenetTTL, { format: 'turtle' });
 *
 * const adapter = new ValueNetAdapter(manager);
 * const matcher = adapter.createValueMatcher();
 * const results = matcher.matchValues('Protect the safety of citizens');
 */

// Try to load ValueMatcher - may not be available in all contexts
let ValueMatcher;
try {
  ValueMatcher = require('../analyzers/ValueMatcher.js');
} catch (e) {
  // ValueMatcher not available - createValueMatcher will throw
  ValueMatcher = null;
}

/**
 * ValueNet to ValueMatcher Adapter
 *
 * Converts ontology-based value definitions to the format
 * required by ValueMatcher for ethical value detection.
 */
class ValueNetAdapter {
  /**
   * Create a new ValueNetAdapter
   * @param {OntologyManager} ontologyManager - OntologyManager instance with loaded values
   * @param {Object} [options] - Configuration options
   * @param {string} [options.defaultDomain='valuenet'] - Default domain for converted values
   */
  constructor(ontologyManager, options = {}) {
    if (!ontologyManager) {
      throw new Error('ValueNetAdapter requires an OntologyManager instance');
    }

    this.ontologyManager = ontologyManager;
    this.options = {
      defaultDomain: options.defaultDomain || 'valuenet',
      ...options
    };
  }

  /**
   * Convert a single value definition to ValueMatcher format
   * @param {string} valueName - Name or IRI of the value
   * @param {Object} [options] - Conversion options
   * @param {string} [options.domain] - Override domain
   * @param {boolean} [options.includeConflicts=false] - Include conflict relationships
   * @returns {Object|null} Converted value definition or null if not found
   */
  toValueMatcherFormat(valueName, options = {}) {
    const valueDef = this.ontologyManager.getValueDefinition(valueName);

    if (!valueDef) {
      return null;
    }

    return this._convertValue(valueDef, options);
  }

  /**
   * Convert all value definitions to ValueMatcher format
   * @param {Object} [options] - Filter and conversion options
   * @param {string} [options.bfoType] - Filter by BFO type
   * @param {string} [options.namespace] - Filter by namespace
   * @returns {Array} Array of converted value definitions
   */
  getAllAsValueMatcherFormat(options = {}) {
    const allValues = this.ontologyManager.getAllValueDefinitions();

    return allValues
      .filter(v => {
        // Filter by BFO type if specified
        if (options.bfoType && v.type !== options.bfoType) {
          return false;
        }
        // Filter by namespace if specified
        if (options.namespace && v.namespace !== options.namespace) {
          return false;
        }
        return true;
      })
      .map(v => this._convertValue(v, options));
  }

  /**
   * Get value definitions in the format expected by ValueMatcher constructor
   * @returns {Object} Object with { values: [...], version, source }
   */
  getValueDefinitionsObject() {
    const values = this.getAllAsValueMatcherFormat();

    return {
      version: '1.0',
      source: 'valuenet',
      description: 'Values converted from ValueNet TTL ontology',
      generatedAt: new Date().toISOString(),
      values
    };
  }

  /**
   * Create a ValueMatcher instance using the loaded values
   * @returns {ValueMatcher} ValueMatcher instance ready for value detection
   * @throws {Error} If ValueMatcher is not available
   */
  createValueMatcher() {
    if (!ValueMatcher) {
      throw new Error('ValueMatcher is not available. Ensure it is properly imported.');
    }

    const valueDefinitions = this.getValueDefinitionsObject();
    return new ValueMatcher(valueDefinitions);
  }

  /**
   * Get conflicts for a specific value
   * @param {string} valueName - Name or IRI of the value
   * @returns {Array<string>} Array of conflicting value IRIs/names
   */
  getConflictsForValue(valueName) {
    return this.ontologyManager.getConflicts(valueName);
  }

  /**
   * Get all conflict pairs from loaded ontologies
   * @returns {Array<Object>} Array of { value1, value2 } pairs
   */
  getAllConflictPairs() {
    const pairs = [];
    const allValues = this.ontologyManager.getAllValueDefinitions();

    for (const value of allValues) {
      const conflicts = this.ontologyManager.getConflicts(value.name);
      for (const conflict of conflicts) {
        pairs.push({
          value1: value.name,
          value2: this._extractLocalName(conflict)
        });
      }
    }

    return pairs;
  }

  /**
   * Export adapter state to JSON
   * @returns {Object} Serializable state
   */
  toJSON() {
    return {
      valueCount: this.ontologyManager.getAllValueDefinitions().length,
      source: this.options.defaultDomain,
      loadedOntologies: this.ontologyManager.getLoadedOntologies()
    };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Convert a single value definition
   * @private
   */
  _convertValue(valueDef, options = {}) {
    const domain = options.domain || this.options.defaultDomain;

    // Build the converted value
    const converted = {
      // Use label as name (falls back to extracted name)
      name: valueDef.label || valueDef.name,

      // Domain from options
      domain: domain,

      // Keywords become semanticMarkers
      semanticMarkers: this._normalizeArray(valueDef.keywords),

      // Upholding/violating become polarityIndicators
      polarityIndicators: {
        upholding: this._normalizeArray(valueDef.upholdingTerms),
        violating: this._normalizeArray(valueDef.violatingTerms)
      },

      // Preserve ontological metadata
      iri: valueDef.iri || valueDef.id,
      bfoType: valueDef.type
    };

    // Optionally include conflicts as relatedValues
    if (options.includeConflicts) {
      const conflicts = this.ontologyManager.getConflicts(valueDef.name);
      converted.relatedValues = {
        conflicts: conflicts.map(c => this._extractLocalName(c))
      };
    }

    return converted;
  }

  /**
   * Normalize array - handle strings, arrays, and undefined
   * @private
   */
  _normalizeArray(value) {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      // Flatten and trim
      return value.flatMap(v => {
        if (typeof v === 'string') {
          return v.split(',').map(s => s.trim()).filter(s => s);
        }
        return [v];
      });
    }

    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim()).filter(s => s);
    }

    return [];
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

  // ===========================================================================
  // Static Methods
  // ===========================================================================

  /**
   * Static conversion of a raw value object to ValueMatcher format
   * @param {Object} rawValue - Raw value object from OntologyManager
   * @param {Object} [options] - Conversion options
   * @returns {Object} Converted value definition
   */
  static convert(rawValue, options = {}) {
    const domain = options.domain || 'valuenet';

    // Helper to normalize arrays
    const normalizeArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) {
        return value.flatMap(v => {
          if (typeof v === 'string') {
            return v.split(',').map(s => s.trim()).filter(s => s);
          }
          return [v];
        });
      }
      if (typeof value === 'string') {
        return value.split(',').map(s => s.trim()).filter(s => s);
      }
      return [];
    };

    return {
      name: rawValue.label || rawValue.name,
      domain: domain,
      semanticMarkers: normalizeArray(rawValue.keywords),
      polarityIndicators: {
        upholding: normalizeArray(rawValue.upholdingTerms),
        violating: normalizeArray(rawValue.violatingTerms)
      },
      iri: rawValue.iri || rawValue.id,
      bfoType: rawValue.type
    };
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ValueNetAdapter;
}
if (typeof window !== 'undefined') {
  window.ValueNetAdapter = ValueNetAdapter;
}
