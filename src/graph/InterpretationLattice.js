/**
 * InterpretationLattice - Phase 6.2
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
 * const lattice = new InterpretationLattice(defaultGraph, resolutions);
 * lattice.addAlternative(epistemicReading);
 * console.log(lattice.hasSignificantAmbiguity()); // true
 * console.log(lattice.toJSONLD()); // Serialized with @type
 */

class InterpretationLattice {
  /**
   * Create a new InterpretationLattice
   * @param {Object} defaultGraph - The default/primary interpretation graph
   * @param {Object} resolutions - Resolution decisions from AmbiguityResolver
   */
  constructor(defaultGraph, resolutions) {
    this.defaultReading = defaultGraph;
    this.resolutions = resolutions || { preserved: [], resolved: [], flaggedOnly: [] };
    this.alternativeReadings = [];

    // Compute metadata
    this.metadata = {
      createdAt: new Date().toISOString(),
      ambiguityCount: this._countAmbiguities(),
      preservedCount: this.resolutions.preserved.length,
      resolvedCount: this.resolutions.resolved.length,
      flaggedCount: this.resolutions.flaggedOnly.length
    };
  }

  // ==================== Primary API ====================

  /**
   * Get the default (highest plausibility) reading
   * @returns {Object} The default graph
   */
  getDefaultReading() {
    return this.defaultReading;
  }

  /**
   * Get all alternative readings
   * @returns {Array} Array of alternative reading objects
   */
  getAlternatives() {
    return this.alternativeReadings;
  }

  /**
   * Add an alternative reading to the lattice
   * @param {Object} altReading - Alternative reading object with plausibility, derivedFrom, etc.
   */
  addAlternative(altReading) {
    this.alternativeReadings.push(altReading);
    // Update metadata
    this.metadata.alternativeCount = this.alternativeReadings.length;
  }

  /**
   * Get ambiguities that were preserved (have alternatives)
   * @returns {Array} Preserved ambiguities with resolution metadata
   */
  getAmbiguitiesPreserved() {
    return this.resolutions.preserved;
  }

  /**
   * Get ambiguities that were resolved to default
   * @returns {Array} Resolved ambiguities with resolution metadata
   */
  getAmbiguitiesResolved() {
    return this.resolutions.resolved;
  }

  /**
   * Get ambiguities that were flagged only (anomalies)
   * @returns {Array} Flagged-only ambiguities
   */
  getAmbiguitiesFlagged() {
    return this.resolutions.flaggedOnly;
  }

  // ==================== Analysis API ====================

  /**
   * Check if there are any preserved ambiguities (significant uncertainty)
   * @returns {boolean} True if any ambiguities were preserved
   */
  hasSignificantAmbiguity() {
    return this.resolutions.preserved.length > 0;
  }

  /**
   * Check if there are any anomalies (selectional violations)
   * @returns {boolean} True if any anomalies were flagged
   */
  hasAnomalies() {
    return this.resolutions.flaggedOnly.length > 0;
  }

  /**
   * Get the total number of interpretations (default + alternatives)
   * @returns {number} Total interpretation count
   */
  getInterpretationCount() {
    return 1 + this.alternativeReadings.length;
  }

  /**
   * Get structured audit trail of resolution reasoning
   * @returns {Object} Resolution reasoning by category
   */
  getResolutionReasoning() {
    return {
      preserved: this.resolutions.preserved.map(a => ({
        type: a.type,
        nodeId: a.nodeId,
        span: a.span,
        reason: a.resolution?.reason,
        confidence: a.resolution?.confidence,
        explanation: a.resolution?.explanation
      })),
      resolved: this.resolutions.resolved.map(a => ({
        type: a.type,
        nodeId: a.nodeId,
        span: a.span,
        reason: a.resolution?.reason,
        defaultReading: a.defaultReading,
        confidence: a.resolution?.confidence
      })),
      flagged: this.resolutions.flaggedOnly.map(a => ({
        type: a.type,
        nodeId: a.nodeId,
        span: a.span,
        reason: a.resolution?.reason,
        signal: a.signal,
        suggestedType: a.resolution?.suggestedType
      }))
    };
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
      return (current.plausibility > best.plausibility) ? current : best;
    });
  }

  // ==================== Serialization ====================

  /**
   * Serialize to JSON-LD format
   * @returns {Object} JSON-LD representation of the lattice
   */
  toJSONLD() {
    return {
      '@type': 'tagteam:InterpretationLattice',
      'tagteam:defaultReading': this.defaultReading,
      'tagteam:alternativeReadings': this.alternativeReadings.map(alt => ({
        '@type': 'tagteam:AlternativeReading',
        'tagteam:plausibility': alt.plausibility,
        'tagteam:derivedFrom': alt.derivedFrom ? { '@id': alt.derivedFrom } : null,
        'tagteam:ambiguityType': alt.ambiguityType,
        'tagteam:reading': alt.reading,
        'tagteam:node': alt.node,
        '@graph': alt.graph
      })),
      'tagteam:resolutionLog': this.getResolutionReasoning(),
      'tagteam:metadata': this.metadata
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
    const parts = [
      `InterpretationLattice:`,
      `  Interpretations: ${this.getInterpretationCount()}`,
      `  Preserved: ${this.resolutions.preserved.length}`,
      `  Resolved: ${this.resolutions.resolved.length}`,
      `  Flagged: ${this.resolutions.flaggedOnly.length}`
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

  // ==================== Private Methods ====================

  /**
   * Count total ambiguities from resolutions
   * @private
   */
  _countAmbiguities() {
    return (
      this.resolutions.preserved.length +
      this.resolutions.resolved.length +
      this.resolutions.flaggedOnly.length
    );
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InterpretationLattice;
}
if (typeof window !== 'undefined') {
  window.InterpretationLattice = InterpretationLattice;
}
