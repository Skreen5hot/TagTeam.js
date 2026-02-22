/**
 * AssertionEventBuilder.js
 *
 * Creates ValueAssertionEvent and ContextAssessmentEvent nodes.
 * Wraps existing value and context detections as semantically honest
 * assertion events with GIT-Minimal provenance tracking.
 *
 * Phase 4 Week 2 Implementation:
 * - Three-way confidence decomposition (extraction, classification, relevance)
 * - GIT-Minimal properties (assertionType, validInContext)
 * - ICE nodes as separate entities linked via asserts
 * - Parser agent provenance via detected_by
 * - IBE linkage via based_on
 *
 * @module graph/AssertionEventBuilder
 * @version 4.0.0-phase4-week2
 */

const crypto = require('crypto');

/**
 * Context dimension definitions for ContextAssessmentEvents
 * Maps to ContextAnalyzer's 12 dimensions
 */
const CONTEXT_DIMENSIONS = {
  // Temporal
  urgency: { category: 'temporal', label: 'Urgency' },
  timePressure: { category: 'temporal', label: 'Time Pressure' },
  irreversibility: { category: 'temporal', label: 'Irreversibility' },

  // Relational
  powerDifferential: { category: 'relational', label: 'Power Differential' },
  dependencyLevel: { category: 'relational', label: 'Dependency Level' },
  trustRequirement: { category: 'relational', label: 'Trust Requirement' },

  // Consequential
  stakesLevel: { category: 'consequential', label: 'Stakes Level' },
  scopeOfImpact: { category: 'consequential', label: 'Scope of Impact' },
  cascadeRisk: { category: 'consequential', label: 'Cascade Risk' },

  // Epistemic
  informationCompleteness: { category: 'epistemic', label: 'Information Completeness' },
  expertiseRequired: { category: 'epistemic', label: 'Expertise Required' },
  uncertaintyLevel: { category: 'epistemic', label: 'Uncertainty Level' }
};

/**
 * AssertionEventBuilder - creates assertion events with GIT-Minimal provenance
 */
class AssertionEventBuilder {
  /**
   * Create a new AssertionEventBuilder
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
  }

  /**
   * Create ValueAssertionEvents from scored values
   *
   * @param {Array} scoredValues - Array from ValueScorer.scoreValues()
   * @param {Object} context - Context for assertions
   * @param {string} context.contextIRI - InterpretationContext IRI
   * @param {string} context.ibeIRI - Input IBE IRI
   * @param {string} context.parserAgentIRI - Parser agent IRI
   * @returns {Object} { assertionEvents: [], iceNodes: [] }
   */
  createValueAssertions(scoredValues, context) {
    const assertionEvents = [];
    const iceNodes = [];

    if (!scoredValues || !Array.isArray(scoredValues)) {
      return { assertionEvents, iceNodes };
    }

    scoredValues.forEach((scoredValue, index) => {
      // Create ICE node for the value content
      const iceNode = this._createValueICE(scoredValue, context, index);
      iceNodes.push(iceNode);

      // Create assertion event
      const assertionEvent = this._createValueAssertionEvent(
        scoredValue,
        iceNode['@id'],
        context,
        index
      );
      assertionEvents.push(assertionEvent);
    });

    return { assertionEvents, iceNodes };
  }

  /**
   * Create ContextAssessmentEvents from context analysis
   *
   * @param {Object} contextIntensity - Object from ContextAnalyzer.analyzeContext()
   * @param {Object} context - Context for assertions
   * @param {string} context.contextIRI - InterpretationContext IRI
   * @param {string} context.ibeIRI - Input IBE IRI
   * @param {string} context.parserAgentIRI - Parser agent IRI
   * @returns {Object} { assessmentEvents: [], iceNodes: [] }
   */
  createContextAssessments(contextIntensity, context) {
    const assessmentEvents = [];
    const iceNodes = [];

    if (!contextIntensity || typeof contextIntensity !== 'object') {
      return { assessmentEvents, iceNodes };
    }

    // Process each dimension
    Object.entries(CONTEXT_DIMENSIONS).forEach(([dimension, meta]) => {
      const score = contextIntensity[dimension];
      if (score === undefined || score === null) return;

      // Create ICE node for dimension content
      const iceNode = this._createContextDimensionICE(dimension, score, meta, context);
      iceNodes.push(iceNode);

      // Create assessment event
      const assessmentEvent = this._createContextAssessmentEvent(
        dimension,
        score,
        meta,
        iceNode['@id'],
        context
      );
      assessmentEvents.push(assessmentEvent);
    });

    return { assessmentEvents, iceNodes };
  }

  /**
   * Compute three-way confidence breakdown
   *
   * @param {Object} scoredValue - Scored value with confidence data
   * @returns {Object} { extraction, classification, relevance, aggregate }
   */
  _computeConfidenceBreakdown(scoredValue) {
    // Extract confidence components
    // If not provided, use reasonable defaults based on overall confidence
    const overallConfidence = scoredValue.confidence || scoredValue.score || 0.5;

    // Extraction: How confident we found the text pattern
    const extraction = scoredValue.extractionConfidence ||
                       scoredValue.patternStrength ||
                       Math.min(1.0, overallConfidence + 0.1);

    // Classification: How confident it's the right value type
    const classification = scoredValue.classificationConfidence ||
                           scoredValue.typeConfidence ||
                           overallConfidence;

    // Relevance: How relevant to the ethical context
    const relevance = scoredValue.relevanceConfidence ||
                      scoredValue.contextualScore ||
                      Math.max(0.5, overallConfidence - 0.1);

    // Aggregate: Geometric mean (conservative combination)
    const aggregate = Math.pow(extraction * classification * relevance, 1/3);

    return {
      extraction: this._roundConfidence(extraction),
      classification: this._roundConfidence(classification),
      relevance: this._roundConfidence(relevance),
      aggregate: this._roundConfidence(aggregate)
    };
  }

  /**
   * Create EthicalValueICE node
   *
   * @param {Object} scoredValue - Scored value
   * @param {Object} context - Context for assertions
   * @param {number} index - Index for uniqueness
   * @returns {Object} ICE node
   * @private
   */
  _createValueICE(scoredValue, context, index) {
    const valueName = scoredValue.value || scoredValue.name || 'UnknownValue';
    const iri = this._generateIRI(valueName, 'ICE', index);

    return {
      '@id': iri,
      '@type': ['tagteam:EthicalValueICE', 'InformationContentEntity', 'owl:NamedIndividual'],
      'rdfs:label': `${valueName} Value Content`,
      'is_about': { '@id': `tagteam:${valueName}` },
      'is_concretized_by': { '@id': context.ibeIRI },
      'tagteam:valueName': valueName,
      'tagteam:valueCategory': scoredValue.category || 'ethical',
      'tagteam:instantiated_at': new Date().toISOString()
    };
  }

  /**
   * Create ValueAssertionEvent node
   *
   * @param {Object} scoredValue - Scored value
   * @param {string} iceIRI - ICE node IRI
   * @param {Object} context - Context for assertions
   * @param {number} index - Index for uniqueness
   * @returns {Object} Assertion event node
   * @private
   */
  _createValueAssertionEvent(scoredValue, iceIRI, context, index) {
    const valueName = scoredValue.value || scoredValue.name || 'UnknownValue';
    const iri = this._generateIRI(valueName, 'ValueAssertion', index);
    const confidence = this._computeConfidenceBreakdown(scoredValue);

    const event = {
      '@id': iri,
      '@type': ['tagteam:ValueAssertionEvent', 'owl:NamedIndividual'],
      'rdfs:label': `${valueName} Value Assertion`,

      // Core assertion links
      'tagteam:asserts': { '@id': iceIRI },
      'tagteam:detected_by': { '@id': context.parserAgentIRI },
      'tagteam:based_on': { '@id': context.ibeIRI },

      // GIT-Minimal required properties
      'tagteam:assertionType': { '@id': 'tagteam:AutomatedDetection' },
      'tagteam:validInContext': { '@id': context.contextIRI },

      // Three-way confidence decomposition
      'tagteam:extractionConfidence': confidence.extraction,
      'tagteam:classificationConfidence': confidence.classification,
      'tagteam:relevanceConfidence': confidence.relevance,
      'tagteam:aggregateConfidence': confidence.aggregate,
      'tagteam:aggregationMethod': 'geometric_mean',

      // Metadata
      'tagteam:instantiated_at': new Date().toISOString()
    };

    // Add evidence if available
    if (scoredValue.evidence || scoredValue.matchedText) {
      event['tagteam:evidence'] = scoredValue.evidence || scoredValue.matchedText;
    }

    // Add source span if available
    if (scoredValue.span) {
      event['tagteam:sourceSpan'] = scoredValue.span;
    }

    return event;
  }

  /**
   * Create ContextDimensionICE node
   *
   * @param {string} dimension - Dimension name
   * @param {number} score - Dimension score
   * @param {Object} meta - Dimension metadata
   * @param {Object} context - Context for assertions
   * @returns {Object} ICE node
   * @private
   */
  _createContextDimensionICE(dimension, score, meta, context) {
    const iri = this._generateIRI(dimension, 'DimensionICE', 0);

    return {
      '@id': iri,
      '@type': ['tagteam:ContextDimensionICE', 'InformationContentEntity', 'owl:NamedIndividual'],
      'rdfs:label': `${meta.label} Dimension Content`,
      'is_concretized_by': context.ibeIRI,
      'tagteam:dimension': dimension,
      'tagteam:category': meta.category,
      'tagteam:score': this._roundConfidence(score),
      'tagteam:instantiated_at': new Date().toISOString()
    };
  }

  /**
   * Create ContextAssessmentEvent node
   *
   * @param {string} dimension - Dimension name
   * @param {number} score - Dimension score
   * @param {Object} meta - Dimension metadata
   * @param {string} iceIRI - ICE node IRI
   * @param {Object} context - Context for assertions
   * @returns {Object} Assessment event node
   * @private
   */
  _createContextAssessmentEvent(dimension, score, meta, iceIRI, context) {
    const iri = this._generateIRI(dimension, 'ContextAssessment', 0);

    return {
      '@id': iri,
      '@type': ['tagteam:ContextAssessmentEvent', 'owl:NamedIndividual'],
      'rdfs:label': `${meta.label} Context Assessment`,

      // Core assertion links
      'tagteam:asserts': { '@id': iceIRI },
      'tagteam:detected_by': { '@id': context.parserAgentIRI },
      'tagteam:based_on': { '@id': context.ibeIRI },

      // GIT-Minimal required properties
      'tagteam:assertionType': { '@id': 'tagteam:AutomatedDetection' },
      'tagteam:validInContext': { '@id': context.contextIRI },

      // Dimension-specific properties
      'tagteam:dimension': dimension,
      'tagteam:category': meta.category,
      'tagteam:score': this._roundConfidence(score),

      // Confidence (simpler for context assessment - single score)
      'tagteam:aggregateConfidence': this._roundConfidence(score),
      'tagteam:aggregationMethod': 'direct_score',

      // Metadata
      'tagteam:instantiated_at': new Date().toISOString()
    };
  }

  /**
   * Generate deterministic IRI
   *
   * @param {string} text - Text for IRI
   * @param {string} type - Type label
   * @param {number} index - Index for uniqueness
   * @returns {string} IRI
   * @private
   */
  _generateIRI(text, type, index) {
    const hash = crypto
      .createHash('sha256')
      .update(`${text}|${type}|${index}|${Date.now()}`)
      .digest('hex')
      .substring(0, 12);

    const cleanText = text
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .substring(0, 20);

    return `${this.options.namespace}:${cleanText}_${type}_${hash}`;
  }

  /**
   * Round confidence to 2 decimal places
   *
   * @param {number} value - Confidence value
   * @returns {number} Rounded value
   * @private
   */
  _roundConfidence(value) {
    return Math.round(value * 100) / 100;
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

module.exports = AssertionEventBuilder;
