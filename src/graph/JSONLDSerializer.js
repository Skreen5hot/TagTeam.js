/**
 * JSONLDSerializer.js
 *
 * Serializes semantic graphs to JSON-LD format with proper @context.
 *
 * Phase 4 Two-Tier Architecture v2.4 + Week 2:
 * - ScarcityAssertion ICE type
 * - DeonticContent / DirectiveInformationContentEntity
 * - ObjectAggregate (bfo:BFO_0000027)
 * - Role realization properties
 * - ValueAssertionEvent, ContextAssessmentEvent (Week 2)
 * - EthicalValueICE, ContextDimensionICE (Week 2)
 * - IBE/ICE concretization linkage (Week 2)
 *
 * @module graph/JSONLDSerializer
 * @version 4.0.0-phase4-week2
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
      // ===== Namespace Prefixes =====
      bfo: 'http://purl.obolibrary.org/obo/',
      cco: 'https://www.commoncoreontologies.org/',
      tagteam: 'http://tagteam.fandaws.org/ontology/',
      inst: 'http://tagteam.fandaws.org/instance/',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      owl: 'http://www.w3.org/2002/07/owl#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',

      // ===== Tier 1 Classes (ICE - Parsing Layer) =====
      DiscourseReferent: 'tagteam:DiscourseReferent',
      VerbPhrase: 'tagteam:VerbPhrase',
      DirectiveContent: 'tagteam:DirectiveContent',
      ScarcityAssertion: 'tagteam:ScarcityAssertion',
      ValueDetectionRecord: 'tagteam:ValueDetectionRecord',
      ContextAssessmentRecord: 'tagteam:ContextAssessmentRecord',
      InterpretationContext: 'tagteam:InterpretationContext',

      // ===== Week 2: Assertion Event Classes =====
      ValueAssertionEvent: 'tagteam:ValueAssertionEvent',
      ContextAssessmentEvent: 'tagteam:ContextAssessmentEvent',
      EthicalValueICE: 'tagteam:EthicalValueICE',
      ContextDimensionICE: 'tagteam:ContextDimensionICE',

      // ===== Week 2: Information Staircase Classes =====
      InformationBearingEntity: 'cco:InformationBearingEntity',
      InformationContentEntity: 'cco:InformationContentEntity',
      // ArtificialAgent and ActOfArtificialProcessing removed — dead aliases,
      // code emits cco:Agent and cco:IntentionalAct directly

      // ===== GIT-Minimal Classes =====
      AutomatedDetection: 'tagteam:AutomatedDetection',
      HumanValidation: 'tagteam:HumanValidation',
      HumanRejection: 'tagteam:HumanRejection',
      HumanCorrection: 'tagteam:HumanCorrection',

      // ===== Actuality Status Named Individuals =====
      ActualityStatus: 'tagteam:ActualityStatus',
      Actual: 'tagteam:Actual',
      Prescribed: 'tagteam:Prescribed',
      Permitted: 'tagteam:Permitted',
      Prohibited: 'tagteam:Prohibited',
      Hypothetical: 'tagteam:Hypothetical',
      Planned: 'tagteam:Planned',
      Negated: 'tagteam:Negated',
      // Phase 6.4: Hohfeldian deontic statuses
      Entitled: 'tagteam:Entitled',      // Claim/Right holder status
      Empowered: 'tagteam:Empowered',    // Authority/Power status
      Protected: 'tagteam:Protected',    // Immunity/Protection status

      // ===== Cross-Tier Relations =====
      is_about: { '@id': 'cco:is_about', '@type': '@id' },
      prescribes: { '@id': 'cco:prescribes', '@type': '@id' },
      prescribed_by: { '@id': 'tagteam:prescribed_by', '@type': '@id' },

      // ===== ICE Concretization (BFO 2020) =====
      is_concretized_by: { '@id': 'bfo:BFO_0000058', '@type': '@id' },
      concretizes: { '@id': 'bfo:BFO_0000059', '@type': '@id' },

      // ===== Tier 1 Relations =====
      has_component: { '@id': 'tagteam:has_component', '@type': '@id' },
      extracted_from: { '@id': 'tagteam:extracted_from', '@type': '@id' },
      corefersWith: { '@id': 'tagteam:corefersWith', '@type': '@id' },
      describes_quality: { '@id': 'tagteam:describes_quality', '@type': '@id' },

      // ===== Tier 2 Relations (BFO 2020) =====
      inheres_in: { '@id': 'bfo:BFO_0000197', '@type': '@id' },
      is_bearer_of: { '@id': 'bfo:BFO_0000196', '@type': '@id' },
      realized_in: { '@id': 'bfo:BFO_0000054', '@type': '@id' },
      realizes: { '@id': 'bfo:BFO_0000055', '@type': '@id' },
      has_participant: { '@id': 'bfo:BFO_0000057', '@type': '@id' },
      has_member_part: { '@id': 'bfo:BFO_0000115', '@type': '@id' },

      // v2.3: Role realization (for Prescribed acts where role is not yet realized)
      would_be_realized_in: { '@id': 'tagteam:would_be_realized_in', '@type': '@id' },

      // ===== Tier 2 Relations (CCO) =====
      has_agent: { '@id': 'cco:has_agent', '@type': '@id' },
      has_recipient: { '@id': 'cco:has_recipient', '@type': '@id' },
      has_input: { '@id': 'tagteam:has_input', '@type': '@id' },
      has_output: { '@id': 'tagteam:has_output', '@type': '@id' },
      affects: { '@id': 'cco:affects', '@type': '@id' },
      occupies_temporal_region: { '@id': 'cco:occupies_temporal_region', '@type': '@id' },
      participates_in: { '@id': 'cco:participates_in', '@type': '@id' },
      is_part_of: { '@id': 'cco:is_part_of', '@type': '@id' },
      occurs_during: { '@id': 'cco:occurs_during', '@type': '@id' },
      designates: { '@id': 'cco:designates', '@type': '@id' },
      is_designated_by: { '@id': 'cco:is_designated_by', '@type': '@id' },
      is_measured_by: { '@id': 'cco:is_measured_by', '@type': '@id' },
      measures: { '@id': 'cco:measures', '@type': '@id' },
      has_measurement_value: { '@id': 'cco:has_measurement_value', '@type': '@id' },
      uses_measurement_unit: { '@id': 'cco:uses_measurement_unit', '@type': '@id' },
      has_start_time: { '@id': 'cco:has_start_time', '@type': '@id' },
      has_end_time: { '@id': 'cco:has_end_time', '@type': '@id' },

      // ===== GIT-Minimal Properties =====
      assertionType: { '@id': 'tagteam:assertionType', '@type': '@id' },
      validInContext: { '@id': 'tagteam:validInContext', '@type': '@id' },
      actualityStatus: { '@id': 'tagteam:actualityStatus', '@type': '@id' },
      validatedBy: { '@id': 'tagteam:validatedBy', '@type': '@id' },
      validationTimestamp: { '@id': 'tagteam:validationTimestamp', '@type': 'xsd:dateTime' },
      supersedes: { '@id': 'tagteam:supersedes', '@type': '@id' },
      framework: 'tagteam:framework',

      // ===== Provenance Properties (v2.2) =====
      instantiated_at: { '@id': 'tagteam:instantiated_at', '@type': 'xsd:dateTime' },
      instantiated_by: { '@id': 'tagteam:instantiated_by', '@type': '@id' },
      negationMarker: 'tagteam:negationMarker',

      // ===== Confidence Properties =====
      extractionConfidence: { '@id': 'tagteam:extractionConfidence', '@type': 'xsd:decimal' },
      classificationConfidence: { '@id': 'tagteam:classificationConfidence', '@type': 'xsd:decimal' },
      relevanceConfidence: { '@id': 'tagteam:relevanceConfidence', '@type': 'xsd:decimal' },
      aggregateConfidence: { '@id': 'tagteam:aggregateConfidence', '@type': 'xsd:decimal' },
      aggregationMethod: 'tagteam:aggregationMethod',

      // ===== Deontic Properties =====
      modalType: 'tagteam:modalType',
      modalMarker: 'tagteam:modalMarker',
      modalStrength: { '@id': 'tagteam:modalStrength', '@type': 'xsd:decimal' },

      // ===== Scarcity Properties (v2.3: ScarcityAssertion ICE) =====
      scarceResource: { '@id': 'tagteam:scarceResource', '@type': '@id' },
      competingParties: { '@id': 'tagteam:competingParties', '@type': '@id', '@container': '@set' },
      supplyCount: { '@id': 'tagteam:supplyCount', '@type': 'xsd:integer' },
      demandCount: { '@id': 'tagteam:demandCount', '@type': 'xsd:integer' },
      scarcityRatio: { '@id': 'tagteam:scarcityRatio', '@type': 'xsd:decimal' },
      scarcityMarker: 'tagteam:scarcityMarker',
      evidenceText: 'tagteam:evidenceText',
      detected_at: { '@id': 'tagteam:detected_at', '@type': 'xsd:dateTime' },

      // ===== Object Aggregate Properties (v2.3) =====
      member_count: { '@id': 'tagteam:member_count', '@type': 'xsd:integer' },
      member_index: { '@id': 'tagteam:member_index', '@type': 'xsd:integer' },

      // ===== Quality Properties (v2.4) =====
      qualifierText: 'tagteam:qualifierText',
      severity: 'tagteam:severity',
      ageCategory: 'tagteam:ageCategory',

      // ===== Discourse Referent Properties =====
      sourceText: 'tagteam:sourceText',
      startPosition: { '@id': 'tagteam:startPosition', '@type': 'xsd:integer' },
      endPosition: { '@id': 'tagteam:endPosition', '@type': 'xsd:integer' },
      definiteness: 'tagteam:definiteness',
      quantity: { '@id': 'tagteam:quantity', '@type': 'xsd:integer' },
      quantityIndicator: 'tagteam:quantityIndicator',
      qualifiers: 'tagteam:qualifiers',

      // ===== VerbPhrase Properties =====
      verb: 'tagteam:verb',
      lemma: 'tagteam:lemma',
      tense: 'tagteam:tense',
      hasModalMarker: 'tagteam:hasModalMarker',

      // ===== IBE Properties =====
      has_text_value: 'cco:has_text_value',
      char_count: { '@id': 'tagteam:char_count', '@type': 'xsd:integer' },
      word_count: { '@id': 'tagteam:word_count', '@type': 'xsd:integer' },
      received_at: { '@id': 'tagteam:received_at', '@type': 'xsd:dateTime' },
      temporal_extent: { '@id': 'tagteam:temporal_extent', '@type': 'xsd:dateTime' },

      // ===== Week 2: Parser Agent Properties =====
      version: 'tagteam:version',
      algorithm: 'tagteam:algorithm',
      capabilities: 'tagteam:capabilities',

      // ===== Week 2: Value/Context Assertion Properties =====
      valueName: 'tagteam:valueName',
      valueCategory: 'tagteam:valueCategory',
      evidence: 'tagteam:evidence',
      sourceSpan: 'tagteam:sourceSpan',
      category: 'tagteam:category',

      // ===== Value Detection Properties =====
      asserts: { '@id': 'tagteam:asserts', '@type': '@id' },
      detected_by: { '@id': 'tagteam:detected_by', '@type': '@id' },
      based_on: { '@id': 'tagteam:based_on', '@type': '@id' },
      polarity: { '@id': 'tagteam:polarity', '@type': 'xsd:integer' },
      salience: { '@id': 'tagteam:salience', '@type': 'xsd:decimal' },
      matched_markers: 'tagteam:matched_markers',
      detection_method: 'tagteam:detection_method',
      dimension: 'tagteam:dimension',
      score: { '@id': 'tagteam:score', '@type': 'xsd:decimal' }
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
