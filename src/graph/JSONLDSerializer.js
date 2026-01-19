/**
 * JSONLDSerializer.js
 *
 * Serializes semantic graphs to JSON-LD format with proper @context.
 *
 * @module graph/JSONLDSerializer
 * @version 3.0.0-alpha.2
 */

/**
 * JSON-LD Serializer for semantic graphs
 */
class JSONLDSerializer {
  /**
   * Create a new JSONLDSerializer
   * @param {Object} options - Serialization options
   * @param {boolean} [options.compact=true] - Use compact format
   * @param {boolean} [options.pretty=false] - Pretty-print JSON
   */
  constructor(options = {}) {
    this.options = {
      compact: options.compact !== false,
      pretty: options.pretty || false,
      ...options
    };
  }

  /**
   * Serialize a graph to JSON-LD string
   *
   * @param {Object} graph - Graph object with @graph array
   * @param {Array} graph['@graph'] - Array of nodes (optional, can be graph.nodes)
   * @returns {string} JSON-LD string
   *
   * @example
   * const serializer = new JSONLDSerializer();
   * const jsonld = serializer.serialize({ '@graph': nodes });
   */
  serialize(graph) {
    // Build JSON-LD structure
    const jsonld = {
      '@context': this._buildContext(),
      '@graph': graph['@graph'] || graph.nodes || []
    };

    // Convert to string
    const indent = this.options.pretty ? 2 : 0;
    return JSON.stringify(jsonld, null, indent);
  }

  /**
   * Build the @context object with all namespaces and type coercions
   *
   * @returns {Object} @context object
   * @private
   */
  _buildContext() {
    return {
      // Namespace prefixes
      bfo: 'http://purl.obolibrary.org/obo/',
      cco: 'http://www.ontologyrepository.com/CommonCoreOntologies/',
      tagteam: 'http://tagteam.fandaws.org/ontology/',
      inst: 'http://tagteam.fandaws.org/instance/',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      owl: 'http://www.w3.org/2002/07/owl#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',

      // TagTeam Core Classes
      DiscourseReferent: 'tagteam:DiscourseReferent',
      ValueAssertionEvent: 'tagteam:ValueAssertionEvent',
      ContextAssessmentEvent: 'tagteam:ContextAssessmentEvent',
      DocumentParseResult: 'tagteam:DocumentParseResult',
      CrossChunkReference: 'tagteam:CrossChunkReference',

      // GIT-Minimal Classes
      InterpretationContext: 'tagteam:InterpretationContext',
      AutomatedDetection: 'tagteam:AutomatedDetection',
      HumanValidation: 'tagteam:HumanValidation',
      HumanRejection: 'tagteam:HumanRejection',
      HumanCorrection: 'tagteam:HumanCorrection',

      // DiscourseReferent Properties
      denotesType: { '@id': 'tagteam:denotesType', '@type': '@id' },
      referentialStatus: { '@id': 'tagteam:referentialStatus', '@type': '@id' },
      discourseRole: 'tagteam:discourseRole',
      definiteness: 'tagteam:definiteness',

      // Confidence Properties (Three-way decomposition)
      extractionConfidence: { '@id': 'tagteam:extractionConfidence', '@type': 'xsd:decimal' },
      classificationConfidence: { '@id': 'tagteam:classificationConfidence', '@type': 'xsd:decimal' },
      relevanceConfidence: { '@id': 'tagteam:relevanceConfidence', '@type': 'xsd:decimal' },
      aggregateConfidence: { '@id': 'tagteam:aggregateConfidence', '@type': 'xsd:decimal' },
      aggregationMethod: 'tagteam:aggregationMethod',

      // GIT-Minimal Properties
      validInContext: { '@id': 'tagteam:validInContext', '@type': '@id' },
      assertionType: { '@id': 'tagteam:assertionType', '@type': '@id' },
      validatedBy: { '@id': 'tagteam:validatedBy', '@type': '@id' },
      validationTimestamp: { '@id': 'tagteam:validationTimestamp', '@type': 'xsd:dateTime' },
      supersedes: { '@id': 'tagteam:supersedes', '@type': '@id' },
      framework: 'tagteam:framework',

      // BFO Relations (Use realized_in only, not realizes)
      inheres_in: { '@id': 'bfo:BFO_0000052', '@type': '@id' },
      is_bearer_of: { '@id': 'bfo:BFO_0000053', '@type': '@id' },
      realized_in: { '@id': 'bfo:BFO_0000054', '@type': '@id' },
      has_participant: { '@id': 'bfo:BFO_0000057', '@type': '@id' },

      // CCO Relations
      has_agent: { '@id': 'cco:has_agent', '@type': '@id' },
      affects: { '@id': 'cco:affects', '@type': '@id' },
      is_concretized_by: { '@id': 'cco:is_concretized_by', '@type': '@id' },
      concretizes: { '@id': 'cco:concretizes', '@type': '@id' },
      has_text_value: 'cco:has_text_value',
      is_about: { '@id': 'cco:is_about', '@type': '@id' },

      // TagTeam Assertion Properties
      asserts: { '@id': 'tagteam:asserts', '@type': '@id' },
      based_on: { '@id': 'tagteam:based_on', '@type': '@id' },
      detected_by: { '@id': 'tagteam:detected_by', '@type': '@id' },
      extracted_from_span: 'tagteam:extracted_from_span',
      span_offset: 'tagteam:span_offset',

      // Additional Properties
      temporal_extent: { '@id': 'tagteam:temporal_extent', '@type': 'xsd:dateTime' },
      detection_method: 'tagteam:detection_method',
      matched_markers: 'tagteam:matched_markers',
      dimension: 'tagteam:dimension',
      score: { '@id': 'tagteam:score', '@type': 'xsd:decimal' },
      polarity: { '@id': 'tagteam:polarity', '@type': 'xsd:integer' },
      salience: { '@id': 'tagteam:salience', '@type': 'xsd:decimal' }
    };
  }

  /**
   * Parse a JSON-LD string back to graph object
   *
   * @param {string} jsonldString - JSON-LD string
   * @returns {Object} Graph object
   */
  parse(jsonldString) {
    const parsed = JSON.parse(jsonldString);

    return {
      '@graph': parsed['@graph'] || [],
      '@context': parsed['@context']
    };
  }
}

module.exports = JSONLDSerializer;
