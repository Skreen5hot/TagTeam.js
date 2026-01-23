/**
 * IEEGraphBuilder.js
 *
 * Convenience class that wraps SemanticGraphBuilder with value detection enabled.
 * This is the primary entry point for IEE users who want both semantic parsing
 * and value detection in one step.
 *
 * @module tagteam-iee-values/IEEGraphBuilder
 * @version 1.0.0
 */

// Import from peer dependency
let SemanticGraphBuilder;
try {
  SemanticGraphBuilder = require('tagteam-core').SemanticGraphBuilder;
} catch (e) {
  // Fallback for development/monorepo
  SemanticGraphBuilder = require('../../../src/graph/SemanticGraphBuilder');
}

const ValueAnalyzer = require('./ValueAnalyzer');
const AssertionEventBuilder = require('./graph/AssertionEventBuilder');

/**
 * IEEGraphBuilder - Pre-configured builder with value detection
 *
 * @example
 * const { IEEGraphBuilder } = require('tagteam-iee-values');
 * const builder = new IEEGraphBuilder();
 * const graph = builder.build("The doctor must allocate the ventilator", {
 *   context: 'MedicalEthics'
 * });
 */
class IEEGraphBuilder {
  /**
   * Create a new IEEGraphBuilder
   *
   * @param {Object} options - Configuration options
   * @param {string} [options.namespace='inst'] - IRI namespace prefix
   * @param {string} [options.context] - Default interpretation context
   * @param {Object} [options.valueDefinitions] - Custom value definitions
   * @param {Object} [options.contextPatterns] - Custom context patterns
   */
  constructor(options = {}) {
    this.options = options;

    // Initialize value analyzer
    this.valueAnalyzer = new ValueAnalyzer({
      valueDefinitions: options.valueDefinitions,
      contextPatterns: options.contextPatterns
    });

    // Initialize assertion builder
    this.assertionBuilder = new AssertionEventBuilder({
      namespace: options.namespace || 'inst'
    });

    // Create core builder with our assertion builder injected
    this.coreBuilder = new SemanticGraphBuilder({
      ...options,
      assertionBuilder: this.assertionBuilder
    });
  }

  /**
   * Build a complete graph with semantic parsing AND value detection
   *
   * @param {string} text - Input text to analyze
   * @param {Object} options - Build options
   * @param {string} [options.context] - Interpretation context (e.g., 'MedicalEthics')
   * @param {boolean} [options.includeContextDimensions=true] - Include 12-dimension analysis
   * @param {boolean} [options.detectConflicts=true] - Detect value conflicts
   * @returns {Object} JSON-LD graph with value assertions
   *
   * @example
   * const graph = builder.build("The doctor must allocate the ventilator", {
   *   context: 'MedicalEthics'
   * });
   */
  build(text, options = {}) {
    const buildOptions = {
      ...this.options,
      ...options,
      includeContextDimensions: options.includeContextDimensions !== false,
      detectConflicts: options.detectConflicts !== false
    };

    // Step 1: Analyze values and context
    const valueAnalysis = this.valueAnalyzer.analyzeText(text, buildOptions);

    // Step 2: Build core graph with value data injected
    const graph = this.coreBuilder.build(text, {
      ...buildOptions,
      scoredValues: valueAnalysis.scoredValues,
      contextIntensity: buildOptions.includeContextDimensions
        ? valueAnalysis.contextIntensity
        : null
    });

    // Step 3: Add analysis metadata
    graph._metadata = {
      ...graph._metadata,
      valueAnalysis: {
        valueCount: valueAnalysis.scoredValues?.length || 0,
        conflictCount: valueAnalysis.conflicts?.length || 0,
        dominantDomain: valueAnalysis.profile?.dominantDomain || null
      }
    };

    // Optionally include full analysis
    if (options.includeFullAnalysis) {
      graph._valueAnalysis = valueAnalysis;
    }

    return graph;
  }

  /**
   * Analyze text for values without building a full graph
   *
   * @param {string} text - Input text
   * @param {Object} options - Analysis options
   * @returns {Object} Value analysis results
   */
  analyzeValues(text, options = {}) {
    return this.valueAnalyzer.analyzeText(text, options);
  }

  /**
   * Load a domain configuration for the core builder
   *
   * @param {string} configPath - Path to domain config JSON
   * @returns {boolean} True if loaded successfully
   */
  loadDomainConfig(configPath) {
    return this.coreBuilder.loadDomainConfig(configPath);
  }

  /**
   * Load domain configuration from object
   *
   * @param {Object} config - Configuration object
   * @returns {boolean} True if loaded successfully
   */
  loadDomainConfigObject(config) {
    return this.coreBuilder.loadDomainConfigObject(config);
  }

  /**
   * Get the underlying core builder for advanced usage
   *
   * @returns {SemanticGraphBuilder} Core builder instance
   */
  getCoreBuilder() {
    return this.coreBuilder;
  }

  /**
   * Get the value analyzer for standalone usage
   *
   * @returns {ValueAnalyzer} Value analyzer instance
   */
  getValueAnalyzer() {
    return this.valueAnalyzer;
  }
}

module.exports = IEEGraphBuilder;
