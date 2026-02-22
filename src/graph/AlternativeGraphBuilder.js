/**
 * @file src/graph/AlternativeGraphBuilder.js
 * @description Phase 6.3 - Alternative Graph Builder
 *
 * Generates alternative graph fragments for preserved ambiguities.
 * When the AmbiguityResolver decides to preserve an ambiguity, this builder
 * creates variant nodes that represent the alternative interpretations.
 *
 * Key Features:
 * - Variant nodes have unique IRIs with traceable suffixes (_alt1, _alt2)
 * - Each variant links back to the original node via tagteam:alternativeFor
 * - Alternatives are typed with tagteam:AlternativeNode for easy identification
 * - Modal alternatives with actuality status mapping
 * - Scope alternatives with formal logic representations
 * - Noun category alternatives for process/entity distinction
 * - Metonymic bridge for re-typing locations as organizations
 * - Adverbial intensifier detection for plausibility modulation
 *
 * @example
 * const builder = new AlternativeGraphBuilder();
 * const alternatives = builder.buildAlternatives(defaultGraph, preservedAmbiguities);
 * // alternatives can be added to InterpretationLattice
 */

class AlternativeGraphBuilder {
  /**
   * Create an AlternativeGraphBuilder
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      iriSuffix: '_alt',
      preserveOriginalLinks: true,
      includeMetadata: true,
      defaultPlausibility: 0.7,
      ...options
    };

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
  }

  // ==================== Primary API ====================

  /**
   * Build alternative graph fragments for preserved ambiguities
   * @param {Object} defaultGraph - The default/primary interpretation graph
   * @param {Array} preservedAmbiguities - Ambiguities that were preserved
   * @returns {Array} Array of alternative reading objects
   */
  buildAlternatives(defaultGraph, preservedAmbiguities) {
    if (!defaultGraph || !preservedAmbiguities) {
      return [];
    }

    const alternatives = [];

    for (const ambiguity of preservedAmbiguities) {
      let alts = [];

      switch (ambiguity.type) {
        case 'modal_force':
          alts = this.buildModalAlternatives(ambiguity, defaultGraph);
          break;
        case 'scope':
          alts = this.buildScopeAlternatives(ambiguity, defaultGraph);
          break;
        case 'noun_category':
          alts = this.buildNounCategoryAlternatives(ambiguity, defaultGraph);
          break;
        case 'potential_metonymy':
          alts = this._buildMetonymyAlternative(defaultGraph, ambiguity);
          break;
        default:
          // Unknown type - skip gracefully
          break;
      }

      alternatives.push(...alts);
    }

    return alternatives;
  }

  /**
   * Build alternative readings for a preserved ambiguity (legacy API)
   * @param {Object} originalGraph - The default graph with @graph array
   * @param {Object} ambiguity - The preserved ambiguity with resolution
   * @returns {Array} Array of alternative reading objects
   */
  build(originalGraph, ambiguity) {
    if (!ambiguity || !ambiguity.type) {
      return [];
    }
    return this.buildAlternatives(originalGraph, [ambiguity]);
  }

  /**
   * Create a single alternative reading for an ambiguity
   * @param {Object} ambiguity - The ambiguity to create an alternative for
   * @param {Object} defaultGraph - The default graph for context
   * @param {number} alternativeIndex - Index of this alternative (0-based)
   * @param {string} reading - The reading this alternative represents
   * @returns {Object|null} Alternative reading object
   */
  createAlternativeReading(ambiguity, defaultGraph, alternativeIndex, reading) {
    if (!ambiguity) {
      return null;
    }

    const node = this.findNodeForAmbiguity(defaultGraph, ambiguity);
    if (!node) {
      return null;
    }

    const modifications = this._getModificationsForReading(ambiguity.type, reading);
    const suffix = `${this.options.iriSuffix}${alternativeIndex + 1}`;
    const variantNode = this.createVariantNode(node, modifications, suffix);

    return {
      id: `alt_${ambiguity.type}_${ambiguity.nodeId}_${alternativeIndex + 1}`,
      sourceAmbiguity: {
        type: ambiguity.type,
        nodeId: ambiguity.nodeId,
        span: ambiguity.span
      },
      reading: reading,
      plausibility: this._calculatePlausibility(ambiguity, reading),
      derivedFrom: ambiguity.nodeId,
      graph: variantNode
    };
  }

  /**
   * Create a variant node with modified properties
   * @param {Object} originalNode - The original node from default graph
   * @param {Object} modifications - Properties to change
   * @param {string} suffix - IRI suffix for uniqueness
   * @returns {Object|null} New node with modified properties and unique IRI
   */
  createVariantNode(originalNode, modifications, suffix = '_alt1') {
    if (!originalNode) {
      return null;
    }

    // Deep clone the original node
    const variant = JSON.parse(JSON.stringify(originalNode));

    // Store original IRI before modification
    const originalIri = variant['@id'];

    // Modify the IRI
    variant['@id'] = `${originalIri}${suffix}`;

    // Add AlternativeNode type
    if (Array.isArray(variant['@type'])) {
      variant['@type'] = [...variant['@type'], 'tagteam:AlternativeNode'];
    } else if (variant['@type']) {
      variant['@type'] = [variant['@type'], 'tagteam:AlternativeNode'];
    } else {
      variant['@type'] = ['tagteam:AlternativeNode'];
    }

    // Add link back to original
    if (this.options.preserveOriginalLinks) {
      variant['tagteam:alternativeFor'] = { '@id': originalIri };
    }

    // Apply modifications
    for (const [key, value] of Object.entries(modifications)) {
      variant[key] = value;
    }

    return variant;
  }

  // ==================== Type-Specific Builders ====================

  /**
   * Build alternatives for modal force ambiguity
   * @param {Object} ambiguity - Modal ambiguity
   * @param {Object} defaultGraph - Default graph
   * @returns {Array} Alternative readings for epistemic/deontic
   */
  buildModalAlternatives(ambiguity, defaultGraph) {
    if (!ambiguity) {
      return [];
    }

    const node = this.findNodeForAmbiguity(defaultGraph, ambiguity);
    if (!node) {
      return [];
    }

    const alternatives = [];
    let readings = ambiguity.readings;

    // Use defaults if readings is empty or missing
    if (!readings || readings.length === 0) {
      readings = ['deontic', 'epistemic'];
    }

    const defaultReading = ambiguity.defaultReading || readings[0];

    // Check for intensifiers to adjust plausibility
    const intensifierBoost = this._detectIntensifiers(ambiguity.span || '');

    let altIndex = 0;
    for (const reading of readings) {
      if (reading === defaultReading) {
        continue;
      }

      const modifications = this._getModalModifications(reading);
      const suffix = `${this.options.iriSuffix}${altIndex + 1}`;
      const variantNode = this.createVariantNode(node, modifications, suffix);

      // Compute plausibility with intensifier adjustment
      let plausibility = this._calculatePlausibility(ambiguity, reading);

      // Adjust based on intensifiers
      if (this._isEpistemic(reading) && intensifierBoost.epistemic > 0) {
        plausibility += intensifierBoost.epistemic;
      }
      if (this._isDeontic(reading) && intensifierBoost.deontic > 0) {
        plausibility += intensifierBoost.deontic;
      }

      // Clamp plausibility to valid range
      plausibility = Math.max(0.05, Math.min(0.95, plausibility));

      alternatives.push({
        id: `alt_modal_${ambiguity.nodeId}_${altIndex + 1}`,
        sourceAmbiguity: {
          type: ambiguity.type,
          nodeId: ambiguity.nodeId,
          span: ambiguity.span
        },
        reading: reading,
        plausibility: plausibility,
        derivedFrom: ambiguity.nodeId,
        graph: variantNode
      });

      altIndex++;
    }

    return alternatives;
  }

  /**
   * Build alternatives for scope ambiguity
   * @param {Object} ambiguity - Scope ambiguity
   * @param {Object} defaultGraph - Default graph
   * @returns {Array} Alternative readings for different scope orders
   */
  buildScopeAlternatives(ambiguity, defaultGraph) {
    if (!ambiguity) {
      return [];
    }

    const node = this.findNodeForAmbiguity(defaultGraph, ambiguity);
    if (!node) {
      return [];
    }

    const alternatives = [];
    const readings = ambiguity.readings || ['wide', 'narrow'];
    const defaultReading = ambiguity.defaultReading || readings[0];

    let altIndex = 0;
    for (const reading of readings) {
      if (reading === defaultReading) {
        continue;
      }

      const modifications = this._getScopeModifications(reading);

      // Include formalization if available
      if (ambiguity.formalizations && ambiguity.formalizations[reading]) {
        modifications['tagteam:formalization'] = ambiguity.formalizations[reading];
      }

      const suffix = `${this.options.iriSuffix}${altIndex + 1}`;
      const variantNode = this.createVariantNode(node, modifications, suffix);

      alternatives.push({
        id: `alt_scope_${ambiguity.nodeId}_${altIndex + 1}`,
        sourceAmbiguity: {
          type: ambiguity.type,
          nodeId: ambiguity.nodeId,
          span: ambiguity.span
        },
        reading: reading,
        plausibility: this._calculatePlausibility(ambiguity, reading),
        derivedFrom: ambiguity.nodeId,
        graph: variantNode
      });

      altIndex++;
    }

    return alternatives;
  }

  /**
   * Build alternatives for noun category ambiguity
   * @param {Object} ambiguity - Noun category ambiguity
   * @param {Object} defaultGraph - Default graph
   * @returns {Array} Alternative readings (role vs organization, etc.)
   */
  buildNounCategoryAlternatives(ambiguity, defaultGraph) {
    if (!ambiguity) {
      return [];
    }

    const node = this.findNodeForAmbiguity(defaultGraph, ambiguity);
    if (!node) {
      return [];
    }

    const alternatives = [];
    const readings = ambiguity.readings || ['organization', 'role'];
    const defaultReading = ambiguity.defaultReading || readings[0];

    let altIndex = 0;
    for (const reading of readings) {
      if (reading === defaultReading) {
        continue;
      }

      const modifications = this._getNounCategoryModifications(reading);
      const suffix = `${this.options.iriSuffix}${altIndex + 1}`;
      const variantNode = this.createVariantNode(node, modifications, suffix);

      alternatives.push({
        id: `alt_noun_${ambiguity.nodeId}_${altIndex + 1}`,
        sourceAmbiguity: {
          type: ambiguity.type,
          nodeId: ambiguity.nodeId,
          span: ambiguity.span
        },
        reading: reading,
        plausibility: this._calculatePlausibility(ambiguity, reading),
        derivedFrom: ambiguity.nodeId,
        graph: variantNode
      });

      altIndex++;
    }

    return alternatives;
  }

  /**
   * Build metonymic bridge alternative (re-type location as organization)
   * Per critique: Create alternative node typed as Organization
   * while preserving original source text
   * @private
   */
  _buildMetonymyAlternative(originalGraph, ambiguity) {
    const alternatives = [];

    const node = this.findNodeForAmbiguity(originalGraph, ambiguity);
    if (!node) {
      return [];
    }

    const modifications = {
      '@type': ['Organization', 'bfo:Object', 'tagteam:AlternativeNode'],
      'tagteam:metonymicSource': ambiguity.span || node['rdfs:label'],
      'tagteam:literalType': 'Artifact',
      'tagteam:metonymyType': 'location_for_institution'
    };

    const variantNode = this.createVariantNode(node, modifications, '_alt1');

    const plausibility = 0.6; // Metonymy is often the intended reading

    alternatives.push({
      id: `alt_metonymy_${ambiguity.nodeId}_1`,
      sourceAmbiguity: {
        type: ambiguity.type,
        nodeId: ambiguity.nodeId,
        span: ambiguity.span
      },
      reading: 'institution',
      plausibility: plausibility,
      derivedFrom: ambiguity.nodeId,
      graph: variantNode
    });

    return alternatives;
  }

  // ==================== Utilities ====================

  /**
   * Generate a unique IRI for an alternative node
   * @param {string} originalIri - Original node IRI
   * @param {number} index - Alternative index (0-based)
   * @returns {string|null} New unique IRI
   */
  generateAlternativeIri(originalIri, index) {
    if (!originalIri) {
      return null;
    }
    return `${originalIri}${this.options.iriSuffix}${index + 1}`;
  }

  /**
   * Find the node in graph that corresponds to an ambiguity
   * @param {Object} graph - The graph to search
   * @param {Object} ambiguity - The ambiguity with nodeId
   * @returns {Object|null} The matching node or null
   */
  findNodeForAmbiguity(graph, ambiguity) {
    if (!graph || !ambiguity) {
      return null;
    }

    const nodeId = ambiguity.nodeId;
    if (!nodeId) {
      return null;
    }

    // Check if graph is a @graph array structure
    if (graph['@graph'] && Array.isArray(graph['@graph'])) {
      const found = graph['@graph'].find(node => node['@id'] === nodeId);
      if (found) {
        return found;
      }
    }

    // Check if graph is a flat single node
    if (graph['@id'] === nodeId) {
      return graph;
    }

    return null;
  }

  // ==================== Private Helpers ====================

  /**
   * Get modifications for a specific reading type
   * @private
   */
  _getModificationsForReading(type, reading) {
    switch (type) {
      case 'modal_force':
        return this._getModalModifications(reading);
      case 'scope':
        return this._getScopeModifications(reading);
      case 'noun_category':
        return this._getNounCategoryModifications(reading);
      default:
        return {};
    }
  }

  /**
   * Get modifications for modal reading
   * @private
   */
  _getModalModifications(reading) {
    if (reading === 'epistemic') {
      return {
        'tagteam:modality': 'expectation',
        'tagteam:actualityStatus': 'tagteam:Hypothetical'
      };
    } else if (reading === 'deontic') {
      return {
        'tagteam:modality': 'obligation',
        'tagteam:actualityStatus': 'tagteam:Prescribed'
      };
    } else if (reading === 'dynamic') {
      return {
        'tagteam:modality': 'ability',
        'tagteam:actualityStatus': 'tagteam:Potential'
      };
    }
    return {};
  }

  /**
   * Get modifications for scope reading
   * @private
   */
  _getScopeModifications(reading) {
    return {
      'tagteam:scope': reading
    };
  }

  /**
   * Get modifications for noun category reading
   * @private
   */
  _getNounCategoryModifications(reading) {
    const typeMap = {
      'organization': ['Organization'],
      'role': ['bfo:Role'],
      'quality': ['bfo:Quality'],
      'process': ['bfo:Process'],
      'agent': ['Agent'],
      'continuant': ['bfo:Continuant']
    };

    return {
      '@type': typeMap[reading] || ['tagteam:Entity']
    };
  }

  /**
   * Calculate plausibility score for an alternative reading
   * @private
   */
  _calculatePlausibility(ambiguity, reading) {
    // Base plausibility from ambiguity confidence
    const baseConfidence = ambiguity.confidence ?? this.options.defaultPlausibility;

    const readings = ambiguity.readings || [];
    const defaultReading = ambiguity.defaultReading;

    if (reading === defaultReading) {
      return baseConfidence;
    }

    // Non-default readings share the remaining probability
    const remainingProb = 1 - baseConfidence;
    const nonDefaultCount = readings.filter(r => r !== defaultReading).length || 1;

    return Math.round((remainingProb / nonDefaultCount) * 100) / 100;
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
    return ['expectation', 'inference', 'possibility', 'epistemic'].includes(reading);
  }

  /**
   * Check if reading is deontic
   * @private
   */
  _isDeontic(reading) {
    return ['obligation', 'permission', 'recommendation', 'deontic'].includes(reading);
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AlternativeGraphBuilder;
}
if (typeof window !== 'undefined') {
  window.AlternativeGraphBuilder = AlternativeGraphBuilder;
}
