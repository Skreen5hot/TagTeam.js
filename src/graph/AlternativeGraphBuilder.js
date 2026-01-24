/**
 * AlternativeGraphBuilder - Phase 6.3
 *
 * Generates alternative graph nodes for preserved ambiguities.
 * Each alternative has a unique IRI traceable to the original node.
 *
 * Key Features:
 * - Modal alternatives with actuality status mapping
 * - Scope alternatives with formal logic representations
 * - Noun category alternatives for process/entity distinction
 * - Metonymic bridge for re-typing locations as organizations
 * - Adverbial intensifier detection for plausibility modulation
 *
 * Plausibility Calculation:
 * - Default reading gets base plausibility (typically 0.7)
 * - Alternative readings split remaining probability
 * - Intensifiers can boost/reduce plausibility scores
 *
 * @example
 * const builder = new AlternativeGraphBuilder();
 * const alternatives = builder.build(originalGraph, preservedAmbiguity);
 * // Returns array of alternative reading objects
 */

class AlternativeGraphBuilder {
  constructor(options = {}) {
    this.options = options;

    // Modality to actuality status mapping
    this.modalityActuality = {
      'obligation': 'tagteam:Prescribed',
      'recommendation': 'tagteam:Prescribed',
      'expectation': 'tagteam:Hypothetical',
      'permission': 'tagteam:Permitted',
      'possibility': 'tagteam:Hypothetical',
      'inference': 'tagteam:Hypothetical',
      'ability': 'tagteam:Potential',
      'conditional': 'tagteam:Hypothetical',
      'habitual': 'tagteam:Actual'
    };

    // Intensifiers that boost specific readings
    this.deonticIntensifiers = new Set([
      'strongly', 'definitely', 'absolutely', 'certainly',
      'imperatively', 'necessarily', 'unquestionably'
    ]);

    this.epistemicIntensifiers = new Set([
      'possibly', 'perhaps', 'maybe', 'probably', 'likely',
      'presumably', 'apparently', 'conceivably'
    ]);

    // Default plausibility for primary reading
    this.defaultPlausibility = options.defaultPlausibility || 0.7;
  }

  /**
   * Build alternative readings for a preserved ambiguity
   * @param {Object} originalGraph - The default graph with @graph array
   * @param {Object} ambiguity - The preserved ambiguity with resolution
   * @returns {Array} Array of alternative reading objects
   */
  build(originalGraph, ambiguity) {
    if (!ambiguity || !ambiguity.type) {
      return [];
    }

    const strategy = this._getStrategy(ambiguity.type);
    if (!strategy) {
      return this._buildGenericAlternative(originalGraph, ambiguity);
    }

    return strategy.call(this, originalGraph, ambiguity);
  }

  /**
   * Get the build strategy for an ambiguity type
   * @private
   */
  _getStrategy(type) {
    const strategies = {
      'modal_force': this._buildModalAlternative,
      'noun_category': this._buildNounCategoryAlternative,
      'scope': this._buildScopeAlternative,
      'potential_metonymy': this._buildMetonymyAlternative
    };
    return strategies[type];
  }

  /**
   * Build alternatives for modal force ambiguity
   * @private
   */
  _buildModalAlternative(originalGraph, ambiguity) {
    const alternatives = [];
    const readings = ambiguity.readings || [];
    const defaultReading = ambiguity.defaultReading || readings[0];

    // Check for intensifiers to adjust plausibility
    const intensifierBoost = this._detectIntensifiers(ambiguity.span || '');

    for (const reading of readings) {
      // Skip the default reading (it's already in the main graph)
      if (reading === defaultReading) continue;

      const altNode = this._cloneNode(originalGraph, ambiguity.nodeId);
      if (!altNode['@id']) {
        altNode['@id'] = ambiguity.nodeId || 'unknown_node';
      }

      // Create unique IRI for alternative
      altNode['@id'] = `${ambiguity.nodeId}_alt_${reading}`;

      // Set modality and actuality status
      altNode['tagteam:modality'] = reading;
      altNode['tagteam:actualityStatus'] = this._mapModalityToActuality(reading);

      // Compute plausibility with intensifier adjustment
      let plausibility = this._computePlausibility(ambiguity, reading);

      // Adjust based on intensifiers
      if (this._isEpistemic(reading) && intensifierBoost.epistemic > 0) {
        plausibility += intensifierBoost.epistemic;
      }
      if (this._isDeontic(reading) && intensifierBoost.deontic > 0) {
        plausibility += intensifierBoost.deontic;
      }

      // Clamp plausibility to valid range
      plausibility = Math.max(0.05, Math.min(0.95, plausibility));

      altNode['tagteam:plausibility'] = plausibility;
      altNode['tagteam:derivedFrom'] = { '@id': ambiguity.nodeId };
      altNode['tagteam:alternativeFor'] = 'modal_force';
      altNode['tagteam:alternativeReading'] = reading;

      alternatives.push({
        reading,
        plausibility,
        derivedFrom: ambiguity.nodeId,
        ambiguityType: 'modal_force',
        actualityStatus: altNode['tagteam:actualityStatus'],
        node: altNode
      });
    }

    return alternatives;
  }

  /**
   * Build alternatives for noun category ambiguity
   * @private
   */
  _buildNounCategoryAlternative(originalGraph, ambiguity) {
    const alternatives = [];
    const readings = ambiguity.readings || ['process', 'continuant'];
    const defaultReading = ambiguity.defaultReading || 'continuant';

    for (const reading of readings) {
      if (reading === defaultReading) continue;

      const altNode = this._cloneNode(originalGraph, ambiguity.nodeId);
      if (!altNode['@id']) {
        altNode['@id'] = ambiguity.nodeId || 'unknown_node';
      }

      altNode['@id'] = `${ambiguity.nodeId}_alt_${reading}`;

      // Update type based on reading
      if (reading === 'process') {
        altNode['@type'] = this._ensureArray(altNode['@type']);
        altNode['@type'].push('bfo:Process');
        altNode['tagteam:nominalizationReading'] = 'process';
      } else {
        altNode['@type'] = this._ensureArray(altNode['@type']);
        altNode['@type'].push('bfo:Continuant');
        altNode['tagteam:nominalizationReading'] = 'entity';
      }

      const plausibility = this._computePlausibility(ambiguity, reading);
      altNode['tagteam:plausibility'] = plausibility;
      altNode['tagteam:derivedFrom'] = { '@id': ambiguity.nodeId };
      altNode['tagteam:alternativeFor'] = 'noun_category';

      alternatives.push({
        reading,
        plausibility,
        derivedFrom: ambiguity.nodeId,
        ambiguityType: 'noun_category',
        node: altNode
      });
    }

    return alternatives;
  }

  /**
   * Build alternatives for scope ambiguity
   * @private
   */
  _buildScopeAlternative(originalGraph, ambiguity) {
    const alternatives = [];
    const readings = ambiguity.readings || ['wide', 'narrow'];
    const defaultReading = ambiguity.defaultReading || 'wide';

    for (const reading of readings) {
      if (reading === defaultReading) continue;

      const altNode = this._cloneNode(originalGraph, ambiguity.nodeId);
      if (!altNode['@id']) {
        altNode['@id'] = ambiguity.nodeId || `scope_${reading}`;
      }

      altNode['@id'] = `${ambiguity.nodeId || 'scope'}_alt_${reading}_scope`;
      altNode['tagteam:scopeReading'] = reading;

      // Include formalization if available
      if (ambiguity.formalizations && ambiguity.formalizations[reading]) {
        altNode['tagteam:formalization'] = ambiguity.formalizations[reading];
      }

      // Scope alternatives typically have lower plausibility
      // because the surface reading (linear order) is usually preferred
      const plausibility = reading === 'narrow' ? 0.35 : 0.4;
      altNode['tagteam:plausibility'] = plausibility;
      altNode['tagteam:derivedFrom'] = { '@id': ambiguity.nodeId || 'scope' };
      altNode['tagteam:alternativeFor'] = 'scope';

      alternatives.push({
        reading,
        plausibility,
        derivedFrom: ambiguity.nodeId,
        ambiguityType: 'scope',
        formalization: altNode['tagteam:formalization'],
        node: altNode
      });
    }

    return alternatives;
  }

  /**
   * Build metonymic bridge alternative (re-type location as organization)
   * Per critique: Create alternative node typed as cco:Organization
   * while preserving original source text
   * @private
   */
  _buildMetonymyAlternative(originalGraph, ambiguity) {
    const alternatives = [];

    const altNode = this._cloneNode(originalGraph, ambiguity.nodeId);
    if (!altNode['@id']) {
      altNode['@id'] = ambiguity.nodeId || 'metonymy_node';
    }

    altNode['@id'] = `${ambiguity.nodeId}_alt_institution`;

    // Re-type as Organization while preserving source text
    altNode['@type'] = ['cco:Organization', 'bfo:Object'];
    altNode['tagteam:metonymicSource'] = ambiguity.span || altNode['rdfs:label'];
    altNode['tagteam:literalType'] = 'cco:Artifact'; // Original type
    altNode['tagteam:metonymyType'] = 'location_for_institution';

    const plausibility = 0.6; // Metonymy is often the intended reading
    altNode['tagteam:plausibility'] = plausibility;
    altNode['tagteam:derivedFrom'] = { '@id': ambiguity.nodeId };
    altNode['tagteam:alternativeFor'] = 'metonymy';

    alternatives.push({
      reading: 'institution',
      plausibility,
      derivedFrom: ambiguity.nodeId,
      ambiguityType: 'potential_metonymy',
      suggestedType: 'cco:Organization',
      metonymicSource: altNode['tagteam:metonymicSource'],
      node: altNode
    });

    return alternatives;
  }

  /**
   * Build generic alternative for unknown ambiguity types
   * @private
   */
  _buildGenericAlternative(originalGraph, ambiguity) {
    const alternatives = [];
    const readings = ambiguity.readings || [];
    const defaultReading = ambiguity.defaultReading || readings[0];

    for (const reading of readings) {
      if (reading === defaultReading) continue;

      const altNode = this._cloneNode(originalGraph, ambiguity.nodeId);
      if (!altNode['@id']) {
        altNode['@id'] = ambiguity.nodeId || 'unknown_node';
      }

      altNode['@id'] = `${ambiguity.nodeId}_alt_${reading}`;
      altNode['tagteam:alternativeReading'] = reading;
      altNode['tagteam:plausibility'] = this._computePlausibility(ambiguity, reading);
      altNode['tagteam:derivedFrom'] = { '@id': ambiguity.nodeId };
      altNode['tagteam:alternativeFor'] = ambiguity.type;

      alternatives.push({
        reading,
        plausibility: altNode['tagteam:plausibility'],
        derivedFrom: ambiguity.nodeId,
        ambiguityType: ambiguity.type,
        node: altNode
      });
    }

    return alternatives;
  }

  // ==================== Helper Methods ====================

  /**
   * Map modality reading to actuality status
   * @private
   */
  _mapModalityToActuality(modality) {
    return this.modalityActuality[modality] || 'tagteam:Hypothetical';
  }

  /**
   * Compute plausibility for a reading
   * @private
   */
  _computePlausibility(ambiguity, reading) {
    const readings = ambiguity.readings || [];
    const defaultReading = ambiguity.defaultReading;

    // Default reading gets higher plausibility
    if (reading === defaultReading) {
      return this.defaultPlausibility;
    }

    // Alternative readings split the remaining probability
    const alternativeCount = readings.length - 1;
    if (alternativeCount <= 0) return 0.3;

    const remainingProbability = 1 - this.defaultPlausibility;
    return remainingProbability / alternativeCount;
  }

  /**
   * Detect intensifiers in text and compute boosts
   * @private
   */
  _detectIntensifiers(text) {
    const lowerText = text.toLowerCase();
    let deonticBoost = 0;
    let epistemicBoost = 0;

    for (const intensifier of this.deonticIntensifiers) {
      if (lowerText.includes(intensifier)) {
        deonticBoost = 0.15;
        break;
      }
    }

    for (const intensifier of this.epistemicIntensifiers) {
      if (lowerText.includes(intensifier)) {
        epistemicBoost = 0.15;
        break;
      }
    }

    return { deontic: deonticBoost, epistemic: epistemicBoost };
  }

  /**
   * Check if reading is epistemic
   * @private
   */
  _isEpistemic(reading) {
    return ['expectation', 'inference', 'possibility'].includes(reading);
  }

  /**
   * Check if reading is deontic
   * @private
   */
  _isDeontic(reading) {
    return ['obligation', 'permission', 'recommendation'].includes(reading);
  }

  /**
   * Clone a node from the graph
   * @private
   */
  _cloneNode(graph, nodeId) {
    if (!graph || !graph['@graph']) {
      return {};
    }

    const original = graph['@graph'].find(n => n['@id'] === nodeId);
    return original ? { ...original } : {};
  }

  /**
   * Ensure value is an array
   * @private
   */
  _ensureArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? [...value] : [value];
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AlternativeGraphBuilder;
}
if (typeof window !== 'undefined') {
  window.AlternativeGraphBuilder = AlternativeGraphBuilder;
}
