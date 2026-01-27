/**
 * @file src/graph/AmbiguityResolver.js
 * @description Phase 6.1 - Ambiguity Resolution
 *
 * The AmbiguityResolver takes ambiguities detected by Phase 5's AmbiguityDetector
 * and decides which ones should be preserved as multiple readings vs. resolved
 * to a single default reading.
 *
 * Resolution Strategy:
 * - selectional_violation: Never preserve (flag only, anomalous input)
 * - modal_force: Preserve if confidence < threshold AND no strong intensifier
 * - noun_category: Preserve if "of" complement AND no selectional match
 * - scope: Always preserve (significant semantic difference)
 * - potential_metonymy: Flag only, suggest re-typed alternative
 *
 * @example
 * const resolver = new AmbiguityResolver({ preserveThreshold: 0.7 });
 * const result = resolver.resolve(ambiguityReport);
 * // Returns: { preserved: [], resolved: [], flagged: [], stats: {...} }
 */

/**
 * Default resolution rules for each ambiguity type
 */
const DEFAULT_RULES = {
  selectional_violation: {
    action: 'flag',
    reason: 'Anomalous input - flag but do not fork',
    flag: 'selectionalMismatch'
  },

  potential_metonymy: {
    action: 'flag',
    reason: 'Metonymic usage - annotate but do not fork',
    flag: 'potentialMetonymy'
  },

  modal_force: {
    action: 'threshold',
    threshold: 0.8,
    preserveReason: 'Modal ambiguity below confidence threshold',
    resolveReason: 'Modal ambiguity resolved with high confidence',
    contextRules: [
      { signal: 'perfect_aspect', resolve: 'epistemic', confidence: 0.85 },
      { signal: 'agent_subject', resolve: 'deontic', confidence: 0.75 },
      { signal: 'stative_verb', resolve: 'epistemic', confidence: 0.7 }
    ]
  },

  noun_category: {
    action: 'context',
    contextRules: [
      { signal: 'subject_of_intentional_act', resolve: 'continuant' },
      { signal: 'duration_predicate', resolve: 'process' },
      { signal: 'predicate_adjective', resolve: 'process' },
      { signal: 'of_complement', preserve: true }
    ],
    default: { preserve: true, reason: 'No strong context signal' }
  },

  scope: {
    action: 'preserve',
    reason: 'Scope ambiguity is semantically significant',
    contextRules: [
      { pattern: 'not_all', defaultReading: 'wide' },
      { pattern: 'multiple_quantifiers', defaultReading: 'subject_wide' }
    ]
  },

  verb_sense: {
    action: 'threshold',
    threshold: 0.6,
    preserveReason: 'Verb sense ambiguous',
    resolveReason: 'Verb sense resolved with context'
  }
};

/**
 * Default configuration for the resolver
 */
const DEFAULT_CONFIG = {
  preserveThreshold: 0.7,
  maxReadingsPerNode: 3,
  maxTotalAlternatives: 10
};

/**
 * AmbiguityResolver - Decides how to handle detected ambiguities
 */
class AmbiguityResolver {
  /**
   * Create an AmbiguityResolver
   * @param {Object} config - Configuration options
   * @param {number} config.preserveThreshold - Confidence threshold for preservation (default: 0.7)
   * @param {number} config.maxReadingsPerNode - Max alternative readings per node (default: 3)
   * @param {number} config.maxTotalAlternatives - Max total alternatives in output (default: 10)
   * @param {Object} config.rules - Custom resolution rules
   */
  constructor(config = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...(config || {})
    };

    // Deep copy default rules and merge with custom rules
    this.rules = JSON.parse(JSON.stringify(DEFAULT_RULES));
    if (config && config.rules) {
      Object.assign(this.rules, config.rules);
    }
  }

  /**
   * Resolve ambiguities from an AmbiguityReport
   * @param {Object} report - AmbiguityReport from AmbiguityDetector
   * @param {Object} context - Additional context (graph, entities, acts)
   * @returns {Object} ResolutionResult with preserved, resolved, flagged arrays
   */
  resolve(report, context = {}) {
    const result = {
      preserved: [],
      resolved: [],
      flagged: [],
      stats: {
        total: 0,
        preserved: 0,
        resolved: 0,
        flagged: 0
      }
    };

    // Get ambiguities from report
    const ambiguities = report.getAmbiguities ? report.getAmbiguities() : (report.ambiguities || []);

    for (const ambiguity of ambiguities) {
      // Skip null/undefined entries
      if (!ambiguity) continue;

      result.stats.total++;

      const decision = this.shouldPreserve(ambiguity, context);

      if (decision.flag) {
        // Flagged ambiguity (anomaly, metonymy)
        result.flagged.push({
          ambiguity,
          flag: decision.flag,
          reason: decision.reason
        });
        result.stats.flagged++;
      } else if (decision.preserve) {
        // Check if we've hit the cap
        if (result.preserved.length < this.config.maxTotalAlternatives) {
          result.preserved.push({
            ambiguity,
            readings: decision.readings || ambiguity.readings,
            defaultReading: decision.defaultReading,
            reason: decision.reason
          });
          result.stats.preserved++;
        }
      } else {
        // Resolved to single reading
        result.resolved.push({
          ambiguity,
          selectedReading: decision.selectedReading,
          reason: decision.reason
        });
        result.stats.resolved++;
      }
    }

    return result;
  }

  /**
   * Check if a specific ambiguity should be preserved
   * @param {Object} ambiguity - Single ambiguity from report
   * @param {Object} context - Additional context
   * @returns {Object} Decision with preserve, reason, defaultReading, flag, selectedReading
   */
  shouldPreserve(ambiguity, context = {}) {
    const type = ambiguity.type;
    const rule = this.rules[type];

    // Unknown type - preserve by default
    if (!rule) {
      return {
        preserve: true,
        reason: 'Unknown ambiguity type - preserving by default',
        readings: this._capReadings(ambiguity.readings)
      };
    }

    // Handle based on rule action
    switch (rule.action) {
      case 'flag':
        return this._handleFlag(ambiguity, rule);

      case 'preserve':
        return this._handlePreserve(ambiguity, rule);

      case 'threshold':
        return this._handleThreshold(ambiguity, rule, context);

      case 'context':
        return this._handleContext(ambiguity, rule, context);

      default:
        return {
          preserve: true,
          reason: 'Unknown rule action - preserving by default',
          readings: this._capReadings(ambiguity.readings)
        };
    }
  }

  /**
   * Get resolution rule for ambiguity type
   * @param {string} type - Ambiguity type
   * @returns {Object|undefined} Resolution rule
   */
  getRule(type) {
    return this.rules[type];
  }

  /**
   * Add or override a resolution rule
   * @param {string} type - Ambiguity type
   * @param {Object} rule - Resolution rule
   */
  setRule(type, rule) {
    this.rules[type] = rule;
  }

  // ============================================
  // Private methods
  // ============================================

  /**
   * Handle flag action (always flag, never preserve)
   */
  _handleFlag(ambiguity, rule) {
    return {
      preserve: false,
      flag: rule.flag,
      reason: rule.reason
    };
  }

  /**
   * Handle preserve action (always preserve)
   */
  _handlePreserve(ambiguity, rule) {
    const signals = ambiguity.signals || [];
    let defaultReading = null;

    // Check for context rules that set default reading
    if (rule.contextRules) {
      for (const ctxRule of rule.contextRules) {
        if (ctxRule.pattern && signals.includes(ctxRule.pattern)) {
          defaultReading = ctxRule.defaultReading;
          break;
        }
      }
    }

    return {
      preserve: true,
      reason: rule.reason,
      readings: this._capReadings(ambiguity.readings),
      defaultReading
    };
  }

  /**
   * Handle threshold action (preserve if below threshold)
   */
  _handleThreshold(ambiguity, rule, context) {
    const signals = ambiguity.signals || [];
    const confidence = ambiguity.confidence ?? 0.5; // Default to 0.5 if missing
    // Use global config threshold - it takes precedence over rule-specific threshold
    const threshold = this.config.preserveThreshold;

    // First check context rules - they can override threshold behavior
    if (rule.contextRules && signals.length > 0) {
      for (const ctxRule of rule.contextRules) {
        if (signals.includes(ctxRule.signal)) {
          return {
            preserve: false,
            selectedReading: ctxRule.resolve,
            reason: `Context signal '${ctxRule.signal}' indicates ${ctxRule.resolve}`
          };
        }
      }
    }

    // Apply threshold check
    if (confidence >= threshold) {
      // High confidence - resolve
      return {
        preserve: false,
        selectedReading: ambiguity.readings ? ambiguity.readings[0] : null,
        reason: `Resolved with high confidence (${confidence} >= ${threshold})`
      };
    } else {
      // Low confidence - preserve
      return {
        preserve: true,
        reason: `Confidence ${confidence} below threshold ${threshold}`,
        readings: this._capReadings(ambiguity.readings)
      };
    }
  }

  /**
   * Handle context action (decision based on signals)
   */
  _handleContext(ambiguity, rule, context) {
    const signals = ambiguity.signals || [];

    // Check context rules in order (first match wins)
    if (rule.contextRules) {
      for (const ctxRule of rule.contextRules) {
        if (signals.includes(ctxRule.signal)) {
          if (ctxRule.preserve) {
            return {
              preserve: true,
              reason: `Context signal '${ctxRule.signal}' indicates preservation`,
              readings: this._capReadings(ambiguity.readings)
            };
          } else {
            return {
              preserve: false,
              selectedReading: ctxRule.resolve,
              reason: `Context signal '${ctxRule.signal}' resolves to ${ctxRule.resolve}`
            };
          }
        }
      }
    }

    // No matching signal - use default
    if (rule.default) {
      if (rule.default.preserve) {
        return {
          preserve: true,
          reason: rule.default.reason || 'Default: preserve',
          readings: this._capReadings(ambiguity.readings)
        };
      } else {
        return {
          preserve: false,
          selectedReading: rule.default.resolve,
          reason: rule.default.reason || 'Default: resolve'
        };
      }
    }

    // Ultimate fallback - preserve
    return {
      preserve: true,
      reason: 'No matching context rule - preserving by default',
      readings: this._capReadings(ambiguity.readings)
    };
  }

  /**
   * Cap readings to maxReadingsPerNode
   */
  _capReadings(readings) {
    if (!readings || !Array.isArray(readings)) {
      return readings;
    }
    return readings.slice(0, this.config.maxReadingsPerNode);
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AmbiguityResolver;
}
if (typeof window !== 'undefined') {
  window.AmbiguityResolver = AmbiguityResolver;
}
