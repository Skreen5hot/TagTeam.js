/**
 * ValueAnalyzer.js
 *
 * Standalone analyzer for ethical values and context dimensions.
 * Can analyze text directly or enrich existing graphs from tagteam-core.
 *
 * @module tagteam-iee-values/ValueAnalyzer
 * @version 1.0.0
 */

const ContextAnalyzer = require('./analyzers/ContextAnalyzer');
const ValueMatcher = require('./analyzers/ValueMatcher');
const ValueScorer = require('./analyzers/ValueScorer');
const EthicalProfiler = require('./analyzers/EthicalProfiler');
const AssertionEventBuilder = require('./graph/AssertionEventBuilder');

// Default data
const { VALUE_DEFINITIONS, FRAME_VALUE_BOOSTS, CONFLICT_PAIRS } = require('../data');

// Try to import PatternMatcher from core
let PatternMatcher;
try {
  PatternMatcher = require('tagteam-core').PatternMatcher;
} catch (e) {
  // Fallback for development/monorepo
  PatternMatcher = require('../../../src/core/PatternMatcher');
}

/**
 * ValueAnalyzer - Analyze text or graphs for ethical values
 *
 * @example
 * // Standalone text analysis
 * const analyzer = new ValueAnalyzer();
 * const analysis = analyzer.analyzeText("The doctor must allocate the ventilator");
 *
 * @example
 * // Enrich existing graph
 * const { SemanticGraphBuilder } = require('tagteam-core');
 * const { ValueAnalyzer } = require('tagteam-iee-values');
 *
 * const coreBuilder = new SemanticGraphBuilder();
 * const graph = coreBuilder.build("The doctor treats the patient");
 *
 * const analyzer = new ValueAnalyzer();
 * const enrichedGraph = analyzer.analyze(graph, { context: 'MedicalEthics' });
 */
class ValueAnalyzer {
  /**
   * Create a new ValueAnalyzer
   *
   * @param {Object} options - Configuration options
   * @param {Object} [options.valueDefinitions] - Custom value definitions
   * @param {Object} [options.contextPatterns] - Custom context patterns
   * @param {Object} [options.frameBoosts] - Custom frame-value boost mappings
   * @param {Object} [options.conflictPairs] - Custom conflict pair definitions
   */
  constructor(options = {}) {
    this.options = options;

    // Initialize analyzers with defaults
    this.contextAnalyzer = new ContextAnalyzer(options.contextPatterns);
    this.valueMatcher = new ValueMatcher(options.valueDefinitions || VALUE_DEFINITIONS);
    this.valueScorer = new ValueScorer({
      frameBoosts: options.frameBoosts || FRAME_VALUE_BOOSTS,
      conflictPairs: options.conflictPairs || CONFLICT_PAIRS
    });
    this.ethicalProfiler = new EthicalProfiler(options);

    // Pattern matcher for POS tagging
    this.patternMatcher = new PatternMatcher();
  }

  /**
   * Analyze text for values and context dimensions
   *
   * @param {string} text - Input text
   * @param {Object} options - Analysis options
   * @param {string} [options.context] - Interpretation context
   * @param {boolean} [options.detectConflicts=true] - Detect value conflicts
   * @param {boolean} [options.generateProfile=true] - Generate ethical profile
   * @returns {Object} Analysis results
   */
  analyzeText(text, options = {}) {
    const analysisOptions = {
      detectConflicts: options.detectConflicts !== false,
      generateProfile: options.generateProfile !== false,
      ...options
    };

    // POS tagging
    const taggedWords = this._tagText(text);

    // Context analysis (12 dimensions)
    const contextIntensity = this.contextAnalyzer.analyzeContext(
      text,
      taggedWords,
      null, // semanticFrame - not needed for standalone analysis
      null  // roles - not needed for standalone analysis
    );

    // Flatten context intensity for easier access
    const flatContextIntensity = this._flattenContextIntensity(contextIntensity);

    // Value matching
    const matchedValues = this.valueMatcher.matchValues(text, taggedWords);

    // Value scoring
    // scoreValues signature: (detectedValues, semanticFrame, roles, allValueDefinitions)
    // When used standalone, semanticFrame and roles are not available
    const scoredValues = this.valueScorer.scoreValues(
      matchedValues,
      null,  // semanticFrame - not available in standalone mode
      [],    // roles - empty array for standalone mode
      VALUE_DEFINITIONS.values || VALUE_DEFINITIONS
    );

    // Ethical profile generation (includes conflict detection)
    let profile = null;
    let conflicts = [];
    if (analysisOptions.generateProfile) {
      profile = this.ethicalProfiler.generateProfile(scoredValues);
      conflicts = profile.conflicts || [];
    }

    return {
      text,
      scoredValues,
      contextIntensity: flatContextIntensity,
      contextDimensions: contextIntensity, // Original nested structure
      conflicts,
      profile,
      metadata: {
        timestamp: new Date().toISOString(),
        valueCount: scoredValues.length,
        conflictCount: conflicts.length
      }
    };
  }

  /**
   * Enrich an existing graph with value assertions
   *
   * @param {Object} graph - Graph from tagteam-core
   * @param {Object} options - Analysis options
   * @param {string} [options.context] - Interpretation context
   * @returns {Object} Enriched graph with value assertions
   */
  analyze(graph, options = {}) {
    // Extract text from IBE node
    const ibeNode = graph['@graph'].find(n =>
      n['@type']?.includes('cco:InformationBearingEntity')
    );
    const text = ibeNode?.['cco:has_text_value'] || '';

    if (!text) {
      console.warn('ValueAnalyzer.analyze: No text found in graph IBE node');
      return graph;
    }

    // Analyze text
    const analysis = this.analyzeText(text, options);

    // Find parser agent
    const parserAgentIRI = this._findParserAgent(graph);

    // Determine context IRI
    const contextIRI = options.contextIRI ||
      graph._metadata?.contextIRI ||
      'inst:DefaultContext';

    // Create assertion nodes
    const assertionBuilder = new AssertionEventBuilder({
      namespace: this.options.namespace || 'inst'
    });

    const valueAssertions = assertionBuilder.createValueAssertions(
      analysis.scoredValues,
      {
        contextIRI,
        ibeIRI: ibeNode?.['@id'],
        parserAgentIRI
      }
    );

    // Optionally add context assessments
    let contextAssessments = { assessmentEvents: [], iceNodes: [] };
    if (options.includeContextDimensions !== false) {
      contextAssessments = assertionBuilder.createContextAssessments(
        analysis.contextIntensity,
        {
          contextIRI,
          ibeIRI: ibeNode?.['@id'],
          parserAgentIRI
        }
      );
    }

    // Return enriched graph
    return {
      '@graph': [
        ...graph['@graph'],
        ...valueAssertions.assertionEvents,
        ...valueAssertions.iceNodes,
        ...contextAssessments.assessmentEvents,
        ...contextAssessments.iceNodes
      ],
      _metadata: {
        ...graph._metadata,
        enrichedBy: 'tagteam-iee-values',
        valueAnalysis: analysis.metadata
      },
      _valueAnalysis: analysis
    };
  }

  /**
   * Get top values from analysis
   *
   * @param {Object} analysis - Analysis from analyzeText
   * @param {number} [limit=5] - Maximum values to return
   * @returns {Array} Top scored values
   */
  getTopValues(analysis, limit = 5) {
    return analysis.scoredValues
      .slice()
      .sort((a, b) => (b.confidence || b.score || 0) - (a.confidence || a.score || 0))
      .slice(0, limit);
  }

  /**
   * Get values by domain
   *
   * @param {Object} analysis - Analysis from analyzeText
   * @param {string} domain - Domain to filter by
   * @returns {Array} Values in the specified domain
   */
  getValuesByDomain(analysis, domain) {
    return analysis.scoredValues.filter(v =>
      v.domain === domain || v.category === domain
    );
  }

  /**
   * Tag text using PatternMatcher
   *
   * @param {string} text - Text to tag
   * @returns {Array} Tagged words
   * @private
   */
  _tagText(text) {
    try {
      return this.patternMatcher.nlp(text).terms().json();
    } catch (e) {
      // Fallback: simple tokenization
      return text.split(/\s+/).map(word => ({
        text: word,
        normal: word.toLowerCase()
      }));
    }
  }

  /**
   * Flatten nested context intensity structure
   *
   * @param {Object} contextIntensity - Nested context intensity
   * @returns {Object} Flat context intensity
   * @private
   */
  _flattenContextIntensity(contextIntensity) {
    const flat = {};
    for (const category of Object.keys(contextIntensity)) {
      const dimensions = contextIntensity[category];
      if (typeof dimensions === 'object') {
        for (const [dimension, score] of Object.entries(dimensions)) {
          flat[dimension] = score;
        }
      }
    }
    return flat;
  }

  /**
   * Find parser agent IRI in graph
   *
   * @param {Object} graph - Graph to search
   * @returns {string|null} Parser agent IRI
   * @private
   */
  _findParserAgent(graph) {
    const agent = graph['@graph'].find(n =>
      n['@type']?.includes('cco:ArtificialAgent')
    );
    return agent?.['@id'] || null;
  }
}

module.exports = ValueAnalyzer;
