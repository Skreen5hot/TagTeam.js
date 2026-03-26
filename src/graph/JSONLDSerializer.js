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
      // ═══════ Namespace Prefixes ═══════
      bfo:     'http://purl.obolibrary.org/obo/',
      cco:     'https://www.commoncoreontologies.org/',
      tagteam: 'http://tagteam.fandaws.org/ontology/',
      inst:    'http://tagteam.fandaws.org/instance/',
      rdf:     'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs:    'http://www.w3.org/2000/01/rdf-schema#',
      owl:     'http://www.w3.org/2002/07/owl#',
      xsd:     'http://www.w3.org/2001/XMLSchema#',

      // ═══════ BFO 2020 Classes ═══════
      Entity:                         { '@id': 'bfo:BFO_0000001' },
      Continuant:                     { '@id': 'bfo:BFO_0000002' },
      IndependentContinuant:          { '@id': 'bfo:BFO_0000004' },
      TemporalRegion:                 { '@id': 'bfo:BFO_0000008' },
      Process:                        { '@id': 'bfo:BFO_0000015' },
      Disposition:                    { '@id': 'bfo:BFO_0000016' },
      Quality:                        { '@id': 'bfo:BFO_0000019' },
      Role:                           { '@id': 'bfo:BFO_0000023' },
      ObjectAggregate:                { '@id': 'bfo:BFO_0000027' },
      Site:                           { '@id': 'bfo:BFO_0000029' },
      Object:                         { '@id': 'bfo:BFO_0000030' },
      GenericallyDependentContinuant: { '@id': 'bfo:BFO_0000031' },
      OneDimensionalTemporalRegion:   { '@id': 'bfo:BFO_0000038' },
      MaterialEntity:                 { '@id': 'bfo:BFO_0000040' },
      RelationalQuality:              { '@id': 'bfo:BFO_0000145' },

      // ═══════ CCO 2.0 Classes ═══════
      Act:                        { '@id': 'cco:ont00000005' },
      ActOfCommunication:         { '@id': 'cco:ont00000402' },
      Agent:                      { '@id': 'cco:ont00001017' },
      Artifact:                   { '@id': 'cco:ont00000995' },
      Country:                    { '@id': 'cco:ont00000139' },
      Facility:                   { '@id': 'cco:ont00000192' },
      GeopoliticalOrganization:   { '@id': 'cco:ont00000176' },
      InformationBearingEntity:   { '@id': 'cco:ont00000253' },
      InformationContentEntity:   { '@id': 'cco:ont00000958' },
      IntentionalAct:             { '@id': 'cco:ont00000228' },
      Organization:               { '@id': 'cco:ont00001180' },
      Person:                     { '@id': 'cco:ont00001262' },

      // ═══════ TagTeam Classes — NLP / Linguistic ═══════
      DiscourseReferent:  { '@id': 'tagteam:DiscourseReferent' },
      VerbPhrase:         { '@id': 'tagteam:VerbPhrase' },

      // ─────── TagTeam Classes — Deontic / Actuality Status ───────
      ActualityStatus: { '@id': 'tagteam:ActualityStatus' },
      Actual:          { '@id': 'tagteam:Actual' },
      Prescribed:      { '@id': 'tagteam:Prescribed' },
      Permitted:       { '@id': 'tagteam:Permitted' },
      Prohibited:      { '@id': 'tagteam:Prohibited' },
      Hypothetical:    { '@id': 'tagteam:Hypothetical' },
      Planned:         { '@id': 'tagteam:Planned' },
      Negated:         { '@id': 'tagteam:Negated' },
      Entitled:        { '@id': 'tagteam:Entitled' },
      Empowered:       { '@id': 'tagteam:Empowered' },
      Protected:       { '@id': 'tagteam:Protected' },

      // ─────── TagTeam Classes — Graph Structure ───────
      DirectiveContent:        { '@id': 'tagteam:DirectiveContent' },
      ScarcityAssertion:       { '@id': 'tagteam:ScarcityAssertion' },
      InterpretationContext:   { '@id': 'tagteam:InterpretationContext' },

      // ─────── TagTeam Classes — Curation Workflow ───────
      AutomatedDetection: { '@id': 'tagteam:AutomatedDetection' },
      HumanValidation:    { '@id': 'tagteam:HumanValidation' },
      HumanRejection:     { '@id': 'tagteam:HumanRejection' },
      HumanCorrection:    { '@id': 'tagteam:HumanCorrection' },

      // ─────── TagTeam Classes — v3 Speech Acts & Structural ───────
      SpeechAct:          { '@id': 'tagteam:SpeechAct' },
      Inquiry:            { '@id': 'tagteam:Inquiry' },
      ConditionalContent: { '@id': 'tagteam:ConditionalContent' },
      ClauseRelation:     { '@id': 'tagteam:ClauseRelation' },
      CausativeAct:       { '@id': 'tagteam:CausativeAct' },

      // ─────── v3 Named Individuals — Actuality Status ───────
      Interrogative: { '@id': 'tagteam:Interrogative' },

      // ─────── v3 Named Individuals — Clause Relation Types ───────
      and_then:       { '@id': 'tagteam:and_then' },
      therefore:      { '@id': 'tagteam:therefore' },
      in_order_that:  { '@id': 'tagteam:in_order_that' },
      contrasts_with: { '@id': 'tagteam:contrasts_with' },
      alternative_to: { '@id': 'tagteam:alternative_to' },

      // ─────── v3 Named Individuals — Temporal Relations ───────
      precedes:          { '@id': 'tagteam:precedes' },
      follows:           { '@id': 'tagteam:follows' },
      simultaneous_with: { '@id': 'tagteam:simultaneous_with' },

      // ═══════ BFO 2020 Object Properties ═══════
      is_concretized_by:        { '@id': 'bfo:BFO_0000058',  '@type': '@id' },
      concretizes:              { '@id': 'bfo:BFO_0000059',  '@type': '@id' },
      inheres_in:               { '@id': 'bfo:BFO_0000197',  '@type': '@id' },
      is_bearer_of:             { '@id': 'bfo:BFO_0000196',  '@type': '@id' },
      realized_in:              { '@id': 'bfo:BFO_0000054',  '@type': '@id' },
      realizes:                 { '@id': 'bfo:BFO_0000055',  '@type': '@id' },
      has_participant:          { '@id': 'bfo:BFO_0000057',  '@type': '@id' },
      participates_in:          { '@id': 'bfo:BFO_0000056',  '@type': '@id' },
      has_member_part:          { '@id': 'bfo:BFO_0000115',  '@type': '@id' },
      member_part_of:           { '@id': 'bfo:BFO_0000129',  '@type': '@id' },
      has_continuant_part:      { '@id': 'bfo:BFO_0000178',  '@type': '@id' },
      continuant_part_of:       { '@id': 'bfo:BFO_0000176',  '@type': '@id' },
      is_part_of:               { '@id': 'bfo:BFO_0000176',  '@type': '@id' },
      located_in:               { '@id': 'bfo:BFO_0000171',  '@type': '@id' },
      occupies_temporal_region:  { '@id': 'bfo:BFO_0000199',  '@type': '@id' },

      // ═══════ CCO 2.0 Object Properties (★ = fixed in audit v2.2, ✚ = added) ═══════
      is_about:              { '@id': 'cco:ont00001808',  '@type': '@id' },
      is_subject_of:         { '@id': 'cco:ont00001801',  '@type': '@id' },       // ✚ added
      prescribes:            { '@id': 'cco:ont00001942',  '@type': '@id' },
      prescribed_by:         { '@id': 'cco:ont00001920',  '@type': '@id' },       // ★ was tagteam:
      has_agent:             { '@id': 'cco:ont00001833',  '@type': '@id' },
      has_recipient:         { '@id': 'cco:ont00001922',  '@type': '@id' },
      has_input:             { '@id': 'cco:ont00001921',  '@type': '@id' },       // ★ was tagteam:
      has_output:            { '@id': 'cco:ont00001986',  '@type': '@id' },       // ★ was tagteam:
      is_input_of:           { '@id': 'cco:ont00001841',  '@type': '@id' },       // ✚ added
      is_output_of:          { '@id': 'cco:ont00001816',  '@type': '@id' },       // ✚ added
      affects:               { '@id': 'cco:ont00001834',  '@type': '@id' },
      designates:            { '@id': 'cco:ont00001916',  '@type': '@id' },
      is_designated_by:      { '@id': 'cco:ont00001879',  '@type': '@id' },
      is_measured_by:        { '@id': 'cco:ont00001904',  '@type': '@id' },
      measures:              { '@id': 'cco:ont00001966',  '@type': '@id' },
      uses_measurement_unit: { '@id': 'cco:ont00001863',  '@type': '@id' },

      // ═══════ TagTeam Object Properties (no CCO/BFO equivalent — audit v2.2 §3–4) ═══════
      has_component:         { '@id': 'tagteam:has_component',         '@type': '@id' },
      extracted_from:        { '@id': 'tagteam:extracted_from',        '@type': '@id' },
      corefersWith:          { '@id': 'tagteam:corefersWith',          '@type': '@id' },
      describes_quality:     { '@id': 'tagteam:describes_quality',     '@type': '@id' },
      would_be_realized_in:  { '@id': 'tagteam:would_be_realized_in', '@type': '@id' },
      has_possession:        { '@id': 'tagteam:has_possession',        '@type': '@id' },
      has_function:          { '@id': 'tagteam:has_function',          '@type': '@id' },
      has_spatial_extent:    { '@id': 'tagteam:has_spatial_extent',    '@type': '@id' },
      bears_role_for:        { '@id': 'tagteam:bears_role_for',        '@type': '@id' },
      occurs_during:         { '@id': 'tagteam:occurs_during',         '@type': '@id' },
      has_measurement_value: { '@id': 'tagteam:has_measurement_value', '@type': '@id' },
      has_start_time:        { '@id': 'tagteam:has_start_time',        '@type': 'xsd:dateTime' },
      has_end_time:          { '@id': 'tagteam:has_end_time',          '@type': 'xsd:dateTime' },
      assertionType:         { '@id': 'tagteam:assertionType',         '@type': '@id' },
      validInContext:        { '@id': 'tagteam:validInContext',        '@type': '@id' },
      actualityStatus:       { '@id': 'tagteam:actualityStatus',       '@type': '@id' },
      validatedBy:           { '@id': 'tagteam:validatedBy',           '@type': '@id' },
      supersedes:            { '@id': 'tagteam:supersedes',            '@type': '@id' },
      scarceResource:        { '@id': 'tagteam:scarceResource',        '@type': '@id' },
      asserts:               { '@id': 'tagteam:asserts',               '@type': '@id' },
      detected_by:           { '@id': 'tagteam:detected_by',           '@type': '@id' },
      based_on:              { '@id': 'tagteam:based_on',              '@type': '@id' },
      instantiated_by:       { '@id': 'tagteam:instantiated_by',       '@type': '@id' },
      denotesType:           { '@id': 'tagteam:denotesType' },

      // ═══════ FT-03: StructuralAssertion provenance properties ═══════
      assertionSubject:      { '@id': 'tagteam:assertionSubject',      '@type': '@id' },
      assertionObject:       { '@id': 'tagteam:assertionObject',       '@type': '@id' },
      assertedRelation:      { '@id': 'tagteam:assertedRelation',      '@type': '@id' },

      // ═══════ OWL NegativePropertyAssertion vocabulary ═══════
      'owl:NegativePropertyAssertion': { '@id': 'owl:NegativePropertyAssertion' },
      'owl:sourceIndividual':    { '@id': 'owl:sourceIndividual',    '@type': '@id' },
      'owl:assertionProperty':   { '@id': 'owl:assertionProperty',   '@type': '@id' },
      'owl:targetIndividual':    { '@id': 'owl:targetIndividual',    '@type': '@id' },

      competingParties: {
        '@id':        'tagteam:competingParties',
        '@type':      '@id',
        '@container': '@set'
      },

      // ─────── v3 Object Properties — Clause / Conditional / Causal ───────
      relationType:   { '@id': 'tagteam:relationType',   '@type': '@id' },
      fromClause:     { '@id': 'tagteam:fromClause',     '@type': '@id' },
      toClause:       { '@id': 'tagteam:toClause',       '@type': '@id' },
      has_antecedent: { '@id': 'tagteam:has_antecedent', '@type': '@id' },
      has_consequent: { '@id': 'tagteam:has_consequent', '@type': '@id' },
      has_cause:      { '@id': 'tagteam:has_cause',      '@type': '@id' },

      // ═══════ CCO 2.0 Data Properties ═══════
      has_text_value: { '@id': 'cco:ont00001765', '@type': 'xsd:string' },

      // ═══════ TagTeam Data Properties — xsd:dateTime ═══════
      instantiated_at:     { '@id': 'tagteam:instantiated_at',     '@type': 'xsd:dateTime' },
      validationTimestamp:  { '@id': 'tagteam:validationTimestamp',  '@type': 'xsd:dateTime' },
      detected_at:         { '@id': 'tagteam:detected_at',          '@type': 'xsd:dateTime' },
      received_at:         { '@id': 'tagteam:received_at',          '@type': 'xsd:dateTime' },
      temporal_extent:     { '@id': 'tagteam:temporal_extent',      '@type': 'xsd:dateTime' },

      // ─────── TagTeam Data Properties — xsd:decimal ───────
      extractionConfidence:     { '@id': 'tagteam:extractionConfidence',     '@type': 'xsd:decimal' },
      classificationConfidence: { '@id': 'tagteam:classificationConfidence', '@type': 'xsd:decimal' },
      relevanceConfidence:      { '@id': 'tagteam:relevanceConfidence',      '@type': 'xsd:decimal' },
      aggregateConfidence:      { '@id': 'tagteam:aggregateConfidence',      '@type': 'xsd:decimal' },
      modalStrength:            { '@id': 'tagteam:modalStrength',            '@type': 'xsd:decimal' },
      scarcityRatio:            { '@id': 'tagteam:scarcityRatio',            '@type': 'xsd:decimal' },
      salience:                 { '@id': 'tagteam:salience',                 '@type': 'xsd:decimal' },
      score:                    { '@id': 'tagteam:score',                    '@type': 'xsd:decimal' },

      // ─────── TagTeam Data Properties — xsd:integer ───────
      supplyCount:   { '@id': 'tagteam:supplyCount',   '@type': 'xsd:integer' },
      demandCount:   { '@id': 'tagteam:demandCount',   '@type': 'xsd:integer' },
      member_count:  { '@id': 'tagteam:member_count',  '@type': 'xsd:integer' },
      member_index:  { '@id': 'tagteam:member_index',  '@type': 'xsd:integer' },
      startPosition: { '@id': 'tagteam:startPosition', '@type': 'xsd:integer' },
      endPosition:   { '@id': 'tagteam:endPosition',   '@type': 'xsd:integer' },
      quantity:      { '@id': 'tagteam:quantity',       '@type': 'xsd:integer' },
      char_count:    { '@id': 'tagteam:char_count',     '@type': 'xsd:integer' },
      word_count:    { '@id': 'tagteam:word_count',     '@type': 'xsd:integer' },
      polarity:      { '@id': 'tagteam:polarity',       '@type': 'xsd:integer' },

      // ─────── v3 Data Properties — Clause / Discourse ───────
      clauseIndex:    { '@id': 'tagteam:clauseIndex',    '@type': 'xsd:integer' },
      isQuestionFocus: { '@id': 'tagteam:isQuestionFocus', '@type': 'xsd:boolean' },
      subjectSource:  { '@id': 'tagteam:subjectSource' },
      whPhrase:       { '@id': 'tagteam:whPhrase' },
      verbClass:      { '@id': 'tagteam:verbClass' },
      epistemicStatus: { '@id': 'tagteam:epistemicStatus' },

      // ═══════ TagTeam Annotation / String Properties ═══════
      framework:           { '@id': 'tagteam:framework' },
      negationMarker:      { '@id': 'tagteam:negationMarker' },
      aggregationMethod:   { '@id': 'tagteam:aggregationMethod' },
      modalType:           { '@id': 'tagteam:modalType' },
      modalMarker:         { '@id': 'tagteam:modalMarker' },
      scarcityMarker:      { '@id': 'tagteam:scarcityMarker' },
      evidenceText:        { '@id': 'tagteam:evidenceText' },
      classificationLabel: { '@id': 'tagteam:classificationLabel' },
      classificationBasis: { '@id': 'tagteam:classificationBasis' },
      qualifierText:       { '@id': 'tagteam:qualifierText' },
      severity:            { '@id': 'tagteam:severity' },
      ageCategory:         { '@id': 'tagteam:ageCategory' },
      sourceText:          { '@id': 'tagteam:sourceText' },
      definiteness:        { '@id': 'tagteam:definiteness' },
      quantityIndicator:   { '@id': 'tagteam:quantityIndicator' },
      qualifiers:          { '@id': 'tagteam:qualifiers' },
      verb:                { '@id': 'tagteam:verb' },
      lemma:               { '@id': 'tagteam:lemma' },
      tense:               { '@id': 'tagteam:tense' },
      hasModalMarker:      { '@id': 'tagteam:hasModalMarker' },
      version:             { '@id': 'tagteam:version' },
      algorithm:           { '@id': 'tagteam:algorithm' },
      capabilities:        { '@id': 'tagteam:capabilities' },
      valueName:           { '@id': 'tagteam:valueName' },
      valueCategory:       { '@id': 'tagteam:valueCategory' },
      evidence:            { '@id': 'tagteam:evidence' },
      sourceSpan:          { '@id': 'tagteam:sourceSpan' },
      category:            { '@id': 'tagteam:category' },
      matched_markers:     { '@id': 'tagteam:matched_markers' },
      detection_method:    { '@id': 'tagteam:detection_method' },
      dimension:           { '@id': 'tagteam:dimension' },

      // ─────── v3 Annotation Property ───────
      structuralAmbiguity: { '@id': 'tagteam:structuralAmbiguity' },

      // ─────── Ontology matching ───────
      ontologyMatch: {
        '@id':        'tagteam:ontologyMatch',
        '@container': '@set'
      },
      ontologyMatchIRI:      { '@id': 'tagteam:ontologyMatchIRI',      '@type': '@id' },
      ontologyMatchConfidence: { '@id': 'tagteam:ontologyMatchConfidence', '@type': 'xsd:decimal' },
      ontologyMatchEvidence:   { '@id': 'tagteam:ontologyMatchEvidence' },
      ontologyMatchLabel:      { '@id': 'tagteam:ontologyMatchLabel' },
      ontologyMatchType:       { '@id': 'tagteam:ontologyMatchType' },
      ontologyMatchForm:       { '@id': 'tagteam:ontologyMatchForm' },
      ontologyMatchInflection: { '@id': 'tagteam:ontologyMatchInflection' },
      ontologyMatchOWLType:    { '@id': 'tagteam:ontologyMatchOWLType' }
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
