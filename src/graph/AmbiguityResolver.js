/**
 * AmbiguityResolver - Phase 6.1
 *
 * Decides which detected ambiguities to preserve as multiple readings
 * vs resolve to a single default interpretation.
 *
 * Resolution Strategy:
 * - selectional_violation: Never preserve (flag only, anomalous input)
 * - modal_force: Preserve if confidence < threshold AND no strong intensifier
 * - noun_category: Preserve if "of" complement AND no selectional match
 * - scope: Always preserve (significant semantic difference)
 * - potential_metonymy: Flag only, suggest re-typed alternative
 *
 * Hierarchy of Evidence (Priority Order):
 * 1. Selectional Match (verb requirements match only one reading) → 0.99
 * 2. Adverbial Intensifiers (strongly, possibly, certainly)
 * 3. Structural Signals (of-complement, agent position, perfect aspect)
 * 4. Base Heuristics (frequency-based defaults)
 *
 * @example
 * const resolver = new AmbiguityResolver({ preserveThreshold: 0.7 });
 * const resolutions = resolver.resolve(ambiguityReport);
 * // Returns: { preserved: [], resolved: [], flaggedOnly: [] }
 */

const SelectionalPreferences = require('./SelectionalPreferences.js');

class AmbiguityResolver {
  constructor(config = {}) {
    this.config = {
      preserveThreshold: config.preserveThreshold || 0.7,
      maxReadingsPerNode: config.maxReadingsPerNode || 3,
      alwaysPreserveScope: config.alwaysPreserveScope !== false,
      useSelectionalEvidence: config.useSelectionalEvidence !== false,
      ...config
    };

    // Selectional preferences for hierarchy of evidence
    this.selectionalPreferences = config.selectionalPreferences ||
      new SelectionalPreferences();

    // Adverbial intensifiers that modify modal confidence
    this.deonticIntensifiers = new Set([
      'strongly', 'definitely', 'absolutely', 'certainly', 'clearly',
      'undoubtedly', 'unquestionably', 'necessarily', 'imperatively'
    ]);

    this.epistemicIntensifiers = new Set([
      'possibly', 'perhaps', 'maybe', 'probably', 'likely',
      'presumably', 'apparently', 'seemingly', 'conceivably'
    ]);

    // Confidence adjustments for intensifiers
    this.intensifierBoost = 0.15;
  }

  /**
   * Resolve ambiguities from Phase 5 AmbiguityReport
   * @param {AmbiguityReport} ambiguityReport - Phase 5 ambiguity report
   * @param {Object} options - Resolution options
   * @returns {Object} { preserved: [], resolved: [], flaggedOnly: [] }
   */
  resolve(ambiguityReport, options = {}) {
    const result = {
      preserved: [],    // Will generate alternative readings
      resolved: [],     // Resolved to default, no alternatives
      flaggedOnly: []   // Selectional violations - flag but don't fork
    };

    if (!ambiguityReport || !ambiguityReport.ambiguities) {
      return result;
    }

    const threshold = options.preserveThreshold || this.config.preserveThreshold;
    const maxReadings = options.maxReadingsPerNode || this.config.maxReadingsPerNode;

    for (const ambiguity of ambiguityReport.ambiguities) {
      const decision = this._decideResolution(ambiguity, { threshold, maxReadings });

      // Add resolution metadata to ambiguity
      const resolved = {
        ...ambiguity,
        resolution: decision
      };

      result[decision.category].push(resolved);
    }

    return result;
  }

  /**
   * Decide how to handle a single ambiguity
   * @private
   */
  _decideResolution(ambiguity, options) {
    const { threshold } = options;

    // 1. Selectional violations are NEVER preserved - they're anomalies
    if (ambiguity.type === 'selectional_violation') {
      return {
        category: 'flaggedOnly',
        reason: 'anomalous_input',
        preserveAlternatives: false,
        explanation: 'Selectional constraint violation indicates malformed input or figurative language'
      };
    }

    // 2. Scope ambiguity ALWAYS preserved (semantic difference is significant)
    if (ambiguity.type === 'scope' && this.config.alwaysPreserveScope) {
      return {
        category: 'preserved',
        reason: 'significant_semantic_difference',
        preserveAlternatives: true,
        explanation: 'Scope ambiguity represents mathematically distinct truth conditions'
      };
    }

    // 3. Modal force - check hierarchy of evidence
    if (ambiguity.type === 'modal_force') {
      return this._resolveModalForce(ambiguity, threshold);
    }

    // 4. Noun category - check selectional match and of-complement
    if (ambiguity.type === 'noun_category') {
      return this._resolveNounCategory(ambiguity, threshold);
    }

    // 5. Potential metonymy - flag only, suggest re-typed alternative
    if (ambiguity.type === 'potential_metonymy') {
      return {
        category: 'flaggedOnly',
        reason: 'metonymy_suggested',
        preserveAlternatives: false,
        suggestRetyping: true,
        suggestedType: 'cco:Organization',
        explanation: 'Location used as agent suggests institutional metonymy'
      };
    }

    // Default: use confidence-based resolution
    const confidence = this._computeBaseConfidence(ambiguity);
    if (confidence >= threshold) {
      return {
        category: 'resolved',
        reason: 'high_confidence',
        confidence,
        preserveAlternatives: false
      };
    }

    return {
      category: 'preserved',
      reason: 'low_confidence',
      confidence,
      preserveAlternatives: true
    };
  }

  /**
   * Resolve modal force ambiguity using hierarchy of evidence
   * @private
   */
  _resolveModalForce(ambiguity, threshold) {
    let confidence = this._computeBaseConfidence(ambiguity);
    let deonticBoost = 0;
    let epistemicBoost = 0;

    // Check for adverbial intensifiers in signals or source text
    const signals = ambiguity.signals || [];
    const sourceText = (ambiguity.span || '').toLowerCase();

    // Check signals for intensifier evidence
    if (signals.includes('agent_subject')) deonticBoost += 0.1;
    if (signals.includes('intentional_act')) deonticBoost += 0.1;
    if (signals.includes('second_person_subject')) deonticBoost += 0.15;
    if (signals.includes('perfect_aspect')) epistemicBoost += 0.2;
    if (signals.includes('stative_verb')) epistemicBoost += 0.1;

    // Check for explicit adverbial intensifiers
    for (const intensifier of this.deonticIntensifiers) {
      if (sourceText.includes(intensifier)) {
        deonticBoost += this.intensifierBoost;
        break;
      }
    }

    for (const intensifier of this.epistemicIntensifiers) {
      if (sourceText.includes(intensifier)) {
        epistemicBoost += this.intensifierBoost;
        break;
      }
    }

    // Determine which reading is favored
    const netBoost = deonticBoost - epistemicBoost;
    const adjustedConfidence = Math.min(0.99, confidence + Math.abs(netBoost));

    // If strong signal in either direction, resolve
    if (Math.abs(netBoost) >= 0.2) {
      const favoredReading = netBoost > 0 ? 'deontic' : 'epistemic';
      return {
        category: 'resolved',
        reason: 'strong_evidence',
        confidence: adjustedConfidence,
        favoredReading,
        deonticBoost,
        epistemicBoost,
        preserveAlternatives: false,
        explanation: `Strong ${favoredReading} signals (boost: ${netBoost.toFixed(2)})`
      };
    }

    // Check base confidence
    if (adjustedConfidence >= threshold) {
      return {
        category: 'resolved',
        reason: 'high_confidence',
        confidence: adjustedConfidence,
        deonticBoost,
        epistemicBoost,
        preserveAlternatives: false
      };
    }

    // Preserve as genuinely ambiguous
    return {
      category: 'preserved',
      reason: 'balanced_evidence',
      confidence: adjustedConfidence,
      deonticBoost,
      epistemicBoost,
      preserveAlternatives: true,
      explanation: 'Signals are balanced; both readings plausible'
    };
  }

  /**
   * Resolve noun category ambiguity using selectional evidence
   * @private
   */
  _resolveNounCategory(ambiguity, threshold) {
    const signals = ambiguity.signals || [];
    let entityConfidence = 0.5;
    let processConfidence = 0.5;

    // Hierarchy Level 1: Selectional Match (highest priority)
    if (this.config.useSelectionalEvidence && signals.includes('subject_of_intentional_act')) {
      // If noun is agent of intentional verb, it must be an entity
      // Check if verb requires organization/animate agent
      entityConfidence = 0.99;
      return {
        category: 'resolved',
        reason: 'selectional_match',
        confidence: entityConfidence,
        defaultReading: 'continuant',
        preserveAlternatives: false,
        explanation: 'Verb selectional requirements match only entity reading'
      };
    }

    // Hierarchy Level 3: Structural Signals
    // "of" complement suggests process reading but preserves ambiguity
    // (e.g., "the organization of files" - could be process or entity)
    const hasOfComplement = signals.includes('of_complement');

    if (hasOfComplement) {
      processConfidence += 0.15; // Smaller boost, preserve ambiguity
    }

    if (signals.includes('duration_predicate')) {
      processConfidence += 0.3; // Strong signal for process
    }

    if (signals.includes('predicate_adjective')) {
      processConfidence += 0.1;
    }

    // Determine confidence
    const confidence = Math.max(entityConfidence, processConfidence);
    const defaultReading = processConfidence > entityConfidence ? 'process' : 'continuant';

    // "of" complement always preserves ambiguity unless there's overwhelming evidence
    if (hasOfComplement && confidence < 0.9) {
      return {
        category: 'preserved',
        reason: 'of_complement_present',
        confidence,
        defaultReading,
        preserveAlternatives: true,
        explanation: '"of" complement suggests process reading but context unclear'
      };
    }

    if (confidence >= threshold) {
      return {
        category: 'resolved',
        reason: 'structural_evidence',
        confidence,
        defaultReading,
        preserveAlternatives: false
      };
    }

    // Fallback: preserve if confidence is low
    if (confidence < threshold && processConfidence > 0.5) {
      return {
        category: 'preserved',
        reason: 'weak_process_signal',
        confidence,
        defaultReading,
        preserveAlternatives: true,
        explanation: '"of" complement suggests process reading but context unclear'
      };
    }

    return {
      category: 'resolved',
      reason: 'default_heuristic',
      confidence: 0.6,
      defaultReading: 'continuant',
      preserveAlternatives: false,
      explanation: 'No strong signals; defaulting to entity reading'
    };
  }

  /**
   * Compute base confidence from ambiguity signals
   * @private
   */
  _computeBaseConfidence(ambiguity) {
    // Map confidence strings to numeric values
    const confidenceMap = {
      'high': 0.85,
      'medium': 0.6,
      'low': 0.4
    };

    if (typeof ambiguity.confidence === 'number') {
      return ambiguity.confidence;
    }

    return confidenceMap[ambiguity.confidence] || 0.5;
  }

  /**
   * Get resolution statistics
   * @param {Object} resolutions - Output from resolve()
   * @returns {Object} Statistics about the resolutions
   */
  getStatistics(resolutions) {
    return {
      total: resolutions.preserved.length +
             resolutions.resolved.length +
             resolutions.flaggedOnly.length,
      preserved: resolutions.preserved.length,
      resolved: resolutions.resolved.length,
      flaggedOnly: resolutions.flaggedOnly.length,
      byType: this._countByType(resolutions),
      byReason: this._countByReason(resolutions)
    };
  }

  /**
   * Count resolutions by ambiguity type
   * @private
   */
  _countByType(resolutions) {
    const counts = {};
    const all = [
      ...resolutions.preserved,
      ...resolutions.resolved,
      ...resolutions.flaggedOnly
    ];

    for (const r of all) {
      counts[r.type] = (counts[r.type] || 0) + 1;
    }

    return counts;
  }

  /**
   * Count resolutions by reason
   * @private
   */
  _countByReason(resolutions) {
    const counts = {};
    const all = [
      ...resolutions.preserved,
      ...resolutions.resolved,
      ...resolutions.flaggedOnly
    ];

    for (const r of all) {
      const reason = r.resolution?.reason || 'unknown';
      counts[reason] = (counts[reason] || 0) + 1;
    }

    return counts;
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AmbiguityResolver;
}
if (typeof window !== 'undefined') {
  window.AmbiguityResolver = AmbiguityResolver;
}
