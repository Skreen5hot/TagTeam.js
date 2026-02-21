/**
 * @file src/graph/InterpretationLattice.js
 * @description Phase 6.2 - Interpretation Lattice
 *
 * Holds a default interpretation plus alternative readings for
 * preserved ambiguities. Provides audit trail for resolution decisions.
 *
 * The lattice represents a "state machine for meaning" - when the parser
 * encounters an ambiguity, it forks the interpretation graph. Each fork
 * has a plausibility score and traceability back to the original node.
 *
 * Key Concepts:
 * - defaultReading: The primary interpretation (highest plausibility)
 * - alternativeReadings: Other valid interpretations with lower plausibility
 * - resolutionLog: Audit trail explaining why each ambiguity was preserved/resolved
 *
 * @example
 * const lattice = new InterpretationLattice(defaultGraph, resolutionResult);
 * lattice.addAlternative(epistemicReading);
 * console.log(lattice.hasSignificantAmbiguity()); // true
 * console.log(lattice.toJSONLD()); // Serialized with @type
 */

class InterpretationLattice {
  /**
   * Create a new InterpretationLattice
   * @param {Object} defaultGraph - The default/primary interpretation graph
   * @param {Object} resolutionResult - Resolution result from AmbiguityResolver.resolve()
   * @param {Object} options - Configuration options
   */
  constructor(defaultGraph = null, resolutionResult = null, options = {}) {
    this.defaultReading = defaultGraph;
    this.resolutionResult = resolutionResult || {
      preserved: [],
      resolved: [],
      flagged: [],
      stats: { total: 0, preserved: 0, resolved: 0, flagged: 0 }
    };
    this.alternativeReadings = [];
    this.resolutionLog = [];
    this.options = options;

    // Track alternative IDs to prevent duplicates
    this._alternativeIds = new Set();
  }

  // ==================== Primary API ====================

  /**
   * Get the default (highest plausibility) reading
   * @returns {Object|null} The default graph
   */
  getDefaultReading() {
    return this.defaultReading;
  }

  /**
   * Get all alternative readings, optionally filtered by ambiguity type
   * @param {string} type - Optional ambiguity type to filter by
   * @returns {Array} Array of alternative reading objects
   */
  getAlternatives(type = null) {
    if (type === null) {
      return this.alternativeReadings;
    }
    return this.alternativeReadings.filter(
      alt => alt.sourceAmbiguity && alt.sourceAmbiguity.type === type
    );
  }

  /**
   * Add an alternative reading to the lattice
   * @param {Object} altReading - Alternative reading object with id, plausibility, derivedFrom, etc.
   */
  addAlternative(altReading) {
    // Ignore null/undefined
    if (!altReading) return;

    // Check for duplicate IDs
    if (altReading.id && this._alternativeIds.has(altReading.id)) {
      return; // Reject duplicate
    }

    this.alternativeReadings.push(altReading);

    // Track ID to prevent duplicates
    if (altReading.id) {
      this._alternativeIds.add(altReading.id);
    }
  }

  /**
   * Get ambiguities that were preserved (have alternatives)
   * @returns {Array} Preserved ambiguities from ResolutionResult
   */
  getAmbiguitiesPreserved() {
    return this.resolutionResult.preserved || [];
  }

  // ==================== Analysis API ====================

  /**
   * Check if there are any preserved ambiguities (significant uncertainty)
   * @returns {boolean} True if any ambiguities were preserved
   */
  hasSignificantAmbiguity() {
    const preserved = this.resolutionResult.preserved || [];
    return preserved.length > 0;
  }

  /**
   * Check if there are any anomalies (selectional violations)
   * @returns {boolean} True if any anomalies were flagged
   */
  hasAnomalies() {
    const flagged = this.resolutionResult.flagged || [];
    return flagged.length > 0;
  }

  /**
   * Get summary statistics
   * @returns {Object} Statistics about ambiguities and alternatives
   */
  getStatistics() {
    const stats = this.resolutionResult.stats || {
      total: 0,
      preserved: 0,
      resolved: 0,
      flagged: 0
    };

    return {
      totalAmbiguities: stats.total,
      preserved: stats.preserved,
      resolved: stats.resolved,
      flagged: stats.flagged,
      alternativeCount: this.alternativeReadings.length
    };
  }

  /**
   * Get the total number of interpretations (default + alternatives)
   * @returns {number} Total interpretation count
   */
  getInterpretationCount() {
    return 1 + this.alternativeReadings.length;
  }

  /**
   * Log a resolution decision
   * @param {Object} entry - Log entry with ambiguity, decision, reason
   */
  logResolution(entry) {
    if (!entry) return;

    // Add timestamp if missing
    if (!entry.timestamp) {
      entry.timestamp = new Date().toISOString();
    }

    this.resolutionLog.push(entry);
  }

  /**
   * Get resolution reasoning log
   * @returns {Array} Array of resolution log entries
   */
  getResolutionReasoning() {
    return this.resolutionLog;
  }

  /**
   * Get alternatives for a specific node
   * @param {string} nodeId - The node ID to find alternatives for
   * @returns {Array} Alternatives derived from that node
   */
  getAlternativesForNode(nodeId) {
    return this.alternativeReadings.filter(alt => alt.derivedFrom === nodeId);
  }

  /**
   * Get the highest plausibility alternative
   * @returns {Object|null} The most plausible alternative, or null if none
   */
  getMostPlausibleAlternative() {
    if (this.alternativeReadings.length === 0) return null;

    return this.alternativeReadings.reduce((best, current) => {
      const currentPlaus = current.plausibility || 0;
      const bestPlaus = best.plausibility || 0;
      return (currentPlaus > bestPlaus) ? current : best;
    });
  }

  // ==================== Serialization ====================

  /**
   * Serialize to JSON-LD format
   * @returns {Object} JSON-LD representation of the lattice
   */
  toJSONLD() {
    return {
      '@context': {
        'tagteam': 'http://purl.org/tagteam#',
        'bfo': 'http://purl.obolibrary.org/obo/BFO_',
        'cco': 'https://www.commoncoreontologies.org/'
      },
      '@type': 'tagteam:InterpretationLattice',
      'tagteam:defaultReading': this.defaultReading,
      'tagteam:alternativeReadings': this.alternativeReadings.map(alt => ({
        '@type': 'tagteam:AlternativeReading',
        '@id': alt.id,
        'tagteam:sourceAmbiguity': alt.sourceAmbiguity ? alt.sourceAmbiguity.type : null,
        'tagteam:reading': alt.reading,
        'tagteam:plausibility': alt.plausibility,
        'tagteam:derivedFrom': alt.derivedFrom ? { '@id': alt.derivedFrom } : null,
        'tagteam:graphFragment': alt.graph
      })),
      '_statistics': this.getStatistics(),
      '_resolutionLog': this.resolutionLog,
      '_metadata': {
        version: this.options.version || '6.2.0',
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Get simplified graph (backwards compatible - just default reading)
   * @returns {Object} The default reading graph
   */
  toSimplifiedGraph() {
    return this.defaultReading;
  }

  /**
   * Convert to a summary string
   * @returns {string} Human-readable summary
   */
  toString() {
    const stats = this.getStatistics();
    const parts = [
      `InterpretationLattice:`,
      `  Interpretations: ${this.getInterpretationCount()}`,
      `  Preserved: ${stats.preserved}`,
      `  Resolved: ${stats.resolved}`,
      `  Flagged: ${stats.flagged}`
    ];

    if (this.hasSignificantAmbiguity()) {
      parts.push(`  Status: AMBIGUOUS`);
    } else if (this.hasAnomalies()) {
      parts.push(`  Status: ANOMALOUS`);
    } else {
      parts.push(`  Status: RESOLVED`);
    }

    return parts.join('\n');
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InterpretationLattice;
}
if (typeof window !== 'undefined') {
  window.InterpretationLattice = InterpretationLattice;
}
