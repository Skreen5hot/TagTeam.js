/**
 * AmbiguityReport - Phase 5.3
 *
 * Structured output for detected ambiguities.
 * Designed for Phase 6 InterpretationLattice integration.
 *
 * @example
 * const report = new AmbiguityReport([
 *   { type: 'modal_force', span: 'should', nodeId: 'act_1', readings: ['obligation', 'expectation'] }
 * ]);
 * report.getByType('modal_force')
 * report.toJSONLD()
 */

class AmbiguityReport {
  constructor(ambiguities = []) {
    this.ambiguities = ambiguities;
    this.timestamp = new Date().toISOString();
    this.statistics = this._computeStatistics();
  }

  /**
   * Get confidence level for an ambiguity
   * Based on selectional preference strength and contextual signals
   * @param {Object} ambiguity - The ambiguity object
   * @returns {string} - 'high', 'medium', or 'low'
   */
  getConfidence(ambiguity) {
    if (ambiguity.confidence) {
      return ambiguity.confidence;
    }
    return this._computeConfidence(ambiguity);
  }

  /**
   * Compute confidence based on ambiguity characteristics
   * @private
   */
  _computeConfidence(ambiguity) {
    const { type, signals = [] } = ambiguity;

    // Selectional violations are high confidence (categorical mismatch)
    if (type === 'selectional_violation') return 'high';

    // Strong contextual signals increase confidence
    if (signals.length >= 2) return 'high';

    // Single signal or preference-based = lower confidence
    return signals.length === 1 ? 'medium' : 'low';
  }

  /**
   * Filter ambiguities by type
   * @param {string} type - The ambiguity type
   * @returns {Array<Object>} - Matching ambiguities
   */
  getByType(type) {
    return this.ambiguities.filter(a => a.type === type);
  }

  /**
   * Filter by severity (number of readings)
   * @param {number} minReadings - Minimum readings to match
   * @returns {Array<Object>} - Matching ambiguities
   */
  getBySeverity(minReadings = 2) {
    return this.ambiguities.filter(a =>
      a.readings && a.readings.length >= minReadings
    );
  }

  /**
   * Get ambiguities affecting a specific node
   * @param {string} nodeId - The node ID to filter by
   * @returns {Array<Object>} - Matching ambiguities
   */
  getForNode(nodeId) {
    return this.ambiguities.filter(a => a.nodeId === nodeId);
  }

  /**
   * Check if any critical ambiguities exist
   * Critical = more than 2 possible readings
   * @returns {boolean}
   */
  hasCriticalAmbiguities() {
    return this.ambiguities.some(a =>
      a.readings && a.readings.length > 2
    );
  }

  /**
   * Check if report has any ambiguities
   * @returns {boolean}
   */
  hasAmbiguities() {
    return this.ambiguities.length > 0;
  }

  /**
   * Get total count of ambiguities
   * @returns {number}
   */
  get count() {
    return this.ambiguities.length;
  }

  /**
   * Serialize for JSON-LD integration
   * @returns {Object} - JSON-LD compatible object
   */
  toJSONLD() {
    return {
      '@type': 'tagteam:AmbiguityReport',
      'tagteam:ambiguityCount': this.ambiguities.length,
      'tagteam:timestamp': this.timestamp,
      'tagteam:statistics': {
        '@type': 'tagteam:AmbiguityStatistics',
        'tagteam:total': this.statistics.total,
        'tagteam:byType': this.statistics.byType,
        'tagteam:averageReadings': this.statistics.avgReadings
      },
      'tagteam:ambiguities': this.ambiguities.map(a => this._ambiguityToJSONLD(a))
    };
  }

  /**
   * Convert single ambiguity to JSON-LD format
   * @private
   */
  _ambiguityToJSONLD(ambiguity) {
    const jsonld = {
      '@type': 'tagteam:DetectedAmbiguity',
      'tagteam:ambiguityType': ambiguity.type,
      'tagteam:confidence': this.getConfidence(ambiguity)
    };

    if (ambiguity.span) {
      jsonld['tagteam:span'] = ambiguity.span;
    }

    if (ambiguity.nodeId) {
      jsonld['tagteam:affectsNode'] = { '@id': ambiguity.nodeId };
    }

    if (ambiguity.readings) {
      jsonld['tagteam:possibleReadings'] = ambiguity.readings;
    }

    if (ambiguity.defaultReading) {
      jsonld['tagteam:defaultReading'] = ambiguity.defaultReading;
    }

    if (ambiguity.signals && ambiguity.signals.length > 0) {
      jsonld['tagteam:detectionSignals'] = ambiguity.signals;
    }

    // Type-specific fields
    if (ambiguity.type === 'selectional_violation') {
      if (ambiguity.signal) {
        jsonld['tagteam:violationType'] = ambiguity.signal;
      }
      if (ambiguity.subject) {
        jsonld['tagteam:subject'] = ambiguity.subject;
      }
      if (ambiguity.verb) {
        jsonld['tagteam:verb'] = ambiguity.verb;
      }
      if (ambiguity.ontologyConstraint) {
        jsonld['tagteam:ontologyConstraint'] = ambiguity.ontologyConstraint;
      }
    }

    if (ambiguity.type === 'modal_force') {
      if (ambiguity.modal) {
        jsonld['tagteam:modal'] = ambiguity.modal;
      }
      if (ambiguity.negationScope) {
        jsonld['tagteam:negationScope'] = ambiguity.negationScope;
      }
    }

    if (ambiguity.type === 'scope') {
      if (ambiguity.quantifier) {
        jsonld['tagteam:quantifier'] = ambiguity.quantifier;
      }
      if (ambiguity.negation) {
        jsonld['tagteam:negation'] = ambiguity.negation;
      }
      if (ambiguity.formalizations) {
        jsonld['tagteam:formalizations'] = ambiguity.formalizations;
      }
    }

    return jsonld;
  }

  /**
   * Compute statistics about ambiguities
   * @private
   */
  _computeStatistics() {
    const byType = {};
    let totalReadings = 0;

    this.ambiguities.forEach(a => {
      byType[a.type] = (byType[a.type] || 0) + 1;
      if (a.readings) {
        totalReadings += a.readings.length;
      }
    });

    return {
      total: this.ambiguities.length,
      byType,
      avgReadings: this.ambiguities.length > 0
        ? totalReadings / this.ambiguities.length
        : 0
    };
  }

  /**
   * Create a summary string
   * @returns {string}
   */
  toString() {
    if (this.ambiguities.length === 0) {
      return 'AmbiguityReport: No ambiguities detected';
    }

    const typeStr = Object.entries(this.statistics.byType)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');

    return `AmbiguityReport: ${this.ambiguities.length} ambiguities (${typeStr})`;
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AmbiguityReport;
}
if (typeof window !== 'undefined') {
  window.AmbiguityReport = AmbiguityReport;
}
