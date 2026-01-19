/**
 * ContextManager.js
 *
 * Manages InterpretationContext nodes for GIT-Minimal compliance.
 * Every assertion must have a validInContext link.
 *
 * Phase 4 Week 2 Implementation:
 * - Predefined interpretation contexts (MedicalEthics, etc.)
 * - Default context fallback (tagteam:Default_Context vocabulary term)
 * - Context node generation with framework metadata
 *
 * @module graph/ContextManager
 * @version 4.0.0-phase4-week2
 */

const crypto = require('crypto');

/**
 * Predefined interpretation contexts
 * These represent common ethical frameworks for value interpretation
 */
const PREDEFINED_CONTEXTS = {
  MedicalEthics: {
    label: 'Medical Ethics Framework',
    framework: 'Principlism (Beauchamp & Childress)',
    comment: 'Four principles: autonomy, beneficence, non-maleficence, justice'
  },
  DeontologicalEthics: {
    label: 'Deontological Ethics Framework',
    framework: 'Kantian',
    comment: 'Duty-based reasoning, categorical imperative'
  },
  UtilitarianEthics: {
    label: 'Utilitarian Ethics Framework',
    framework: 'Consequentialist',
    comment: 'Greatest good for greatest number'
  },
  VirtueEthics: {
    label: 'Virtue Ethics Framework',
    framework: 'Aristotelian',
    comment: 'Character, flourishing, moral exemplars'
  },
  CareEthics: {
    label: 'Care Ethics Framework',
    framework: 'Relational',
    comment: 'Relationships, responsibilities, context-sensitive care'
  },
  BusinessEthics: {
    label: 'Business Ethics Framework',
    framework: 'Stakeholder Theory',
    comment: 'Corporate responsibility, stakeholder interests, sustainability'
  },
  ResearchEthics: {
    label: 'Research Ethics Framework',
    framework: 'Belmont Report',
    comment: 'Respect for persons, beneficence, justice in research'
  },
  Default: {
    label: 'Default Interpretation Context',
    framework: 'TagTeam General',
    comment: 'No specific framework; general ethical value detection'
  }
};

/**
 * ContextManager - manages InterpretationContext nodes
 */
class ContextManager {
  /**
   * Create a new ContextManager
   * @param {Object} options - Configuration options
   * @param {Object} [options.graphBuilder] - SemanticGraphBuilder instance
   * @param {string} [options.namespace='inst'] - IRI namespace prefix
   */
  constructor(options = {}) {
    this.options = {
      namespace: options.namespace || 'inst',
      ...options
    };
    this.graphBuilder = options.graphBuilder || null;

    // Cache for created context nodes
    this._contextCache = new Map();
  }

  /**
   * Get or create InterpretationContext node
   *
   * @param {string} contextName - Context name (e.g., 'MedicalEthics', 'Default')
   * @returns {Object|null} Context node for @graph, or null for Default
   */
  getOrCreateContext(contextName) {
    // Default context uses vocabulary term, no node needed
    if (contextName === 'Default') {
      return null;
    }

    // Return cached node if already created
    if (this._contextCache.has(contextName)) {
      return this._contextCache.get(contextName);
    }

    // Create new context node
    const node = this._createContextNode(contextName);
    this._contextCache.set(contextName, node);

    return node;
  }

  /**
   * Get context IRI (may be vocabulary term or instance)
   *
   * @param {string} contextName - Context name
   * @returns {string} IRI - 'tagteam:Default_Context' or 'inst:Name_Context'
   */
  getContextIRI(contextName) {
    // Default context is a vocabulary term, not an instance
    if (contextName === 'Default' || !contextName) {
      return 'tagteam:Default_Context';
    }

    // Instance IRI for named contexts
    return `${this.options.namespace}:${contextName}_Context`;
  }

  /**
   * Create InterpretationContext node
   *
   * @param {string} contextName - Context name
   * @returns {Object} Node
   * @private
   */
  _createContextNode(contextName) {
    const iri = this.getContextIRI(contextName);
    const definition = PREDEFINED_CONTEXTS[contextName] || {
      label: `${contextName} Interpretation Context`,
      framework: 'Custom',
      comment: `Custom interpretation context: ${contextName}`
    };

    return {
      '@id': iri,
      '@type': ['tagteam:InterpretationContext', 'owl:NamedIndividual'],
      'rdfs:label': definition.label,
      'tagteam:framework': definition.framework,
      'rdfs:comment': definition.comment,
      'tagteam:instantiated_at': new Date().toISOString()
    };
  }

  /**
   * Check if context is predefined
   *
   * @param {string} contextName - Context name
   * @returns {boolean} True if predefined
   */
  isPredefined(contextName) {
    return contextName in PREDEFINED_CONTEXTS;
  }

  /**
   * Get all predefined context names
   *
   * @returns {Array<string>} Context names
   */
  getPredefinedContextNames() {
    return Object.keys(PREDEFINED_CONTEXTS);
  }

  /**
   * Get all created context nodes (for inclusion in @graph)
   *
   * @returns {Array<Object>} Context nodes
   */
  getContextNodes() {
    return Array.from(this._contextCache.values());
  }

  /**
   * Reset cache (for testing)
   */
  reset() {
    this._contextCache.clear();
  }

  /**
   * Set the graph builder
   *
   * @param {Object} graphBuilder - SemanticGraphBuilder instance
   */
  setGraphBuilder(graphBuilder) {
    this.graphBuilder = graphBuilder;
  }
}

module.exports = ContextManager;
