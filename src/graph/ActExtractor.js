/**
 * ActExtractor.js
 *
 * Extracts intentional acts from verb phrases and creates
 * cco:IntentionalAct nodes for the semantic graph.
 *
 * Phase 4 Two-Tier Architecture (v2.2 spec):
 * - Acts link to Tier 2 entities (cco:Person, cco:Artifact) via has_agent/affects
 * - All acts have actualityStatus (Prescribed, Actual, Negated, etc.)
 * - Supports negation detection for Negated status
 *
 * @module graph/ActExtractor
 * @version 4.0.0-phase4
 */

const nlp = require('compromise');

/**
 * Verb-to-CCO Act Type mappings
 * Maps verb infinitives to CCO act classes
 */
const VERB_TO_CCO_MAPPINGS = {
  // Resource Allocation Acts
  'allocate': 'cco:ActOfAllocation',
  'distribute': 'cco:ActOfAllocation',
  'assign': 'cco:ActOfAllocation',
  'give': 'cco:ActOfTransferOfPossession',
  'provide': 'cco:ActOfTransferOfPossession',

  // Medical Acts
  'treat': 'cco:ActOfMedicalTreatment',
  'diagnose': 'cco:ActOfDiagnosis',
  'prescribe': 'cco:ActOfPrescription',
  'administer': 'cco:ActOfAdministration',
  'operate': 'cco:ActOfSurgery',
  'examine': 'cco:ActOfExamination',
  'withdraw': 'cco:ActOfWithdrawal',
  'discontinue': 'cco:ActOfWithdrawal',

  // Communication Acts
  'tell': 'cco:ActOfCommunication',
  'inform': 'cco:ActOfCommunication',
  'disclose': 'cco:ActOfCommunication',
  'report': 'cco:ActOfCommunication',
  'say': 'cco:ActOfCommunication',
  'ask': 'cco:ActOfCommunication',

  // Decision Acts
  'decide': 'cco:ActOfDecision',
  'choose': 'cco:ActOfDecision',
  'select': 'cco:ActOfDecision',
  'determine': 'cco:ActOfDecision',

  // Care Acts
  'help': 'cco:ActOfAssistance',
  'assist': 'cco:ActOfAssistance',
  'support': 'cco:ActOfAssistance',
  'care': 'cco:ActOfCare',
  'protect': 'cco:ActOfProtection',
  'save': 'cco:ActOfProtection',

  // Harm/Risk Acts
  'harm': 'cco:ActOfHarming',
  'injure': 'cco:ActOfHarming',
  'endanger': 'cco:ActOfEndangering',
  'risk': 'cco:ActOfEndangering',

  // Default
  '_default': 'cco:IntentionalAct'
};

/**
 * Deontic modality mappings
 * Maps modal auxiliaries to modality types
 */
const MODALITY_MAPPINGS = {
  // Obligation
  'must': 'obligation',
  'have to': 'obligation',
  'need to': 'obligation',
  'required': 'obligation',

  // Permission
  'may': 'permission',
  'can': 'permission',
  'allowed': 'permission',

  // Prohibition
  'must not': 'prohibition',
  'cannot': 'prohibition',
  'may not': 'prohibition',

  // Recommendation
  'should': 'recommendation',
  'ought': 'recommendation',

  // Intention
  'will': 'intention',
  'would': 'intention',
  'going to': 'intention'
};

/**
 * Modality to ActualityStatus mapping
 * Maps deontic modality to appropriate actuality status
 */
const MODALITY_TO_STATUS = {
  'obligation': 'tagteam:Prescribed',
  'permission': 'tagteam:Permitted',
  'prohibition': 'tagteam:Prohibited',
  'recommendation': 'tagteam:Prescribed', // Recommendations are a softer form of prescription
  'intention': 'tagteam:Planned',
  'hypothetical': 'tagteam:Hypothetical'
};

/**
 * ActExtractor class - extracts acts and creates IntentionalAct nodes
 *
 * Two-Tier Architecture (v2.2):
 * - Links to Tier 2 entities via is_about resolution
 * - Adds actualityStatus to all acts
 */
class ActExtractor {
  /**
   * Create a new ActExtractor
   * @param {Object} options - Configuration options
   * @param {Object} [options.graphBuilder] - SemanticGraphBuilder instance
   * @param {Array} [options.entities] - Previously extracted entities for linking
   * @param {boolean} [options.linkToTier2=true] - Link to Tier 2 entities instead of Tier 1
   */
  constructor(options = {}) {
    this.options = {
      linkToTier2: true,
      ...options
    };
    this.graphBuilder = options.graphBuilder || null;
    this.entities = options.entities || [];
  }

  /**
   * Extract acts from text and return IntentionalAct nodes
   *
   * @param {string} text - Input text to analyze
   * @param {Object} [options] - Extraction options
   * @param {Array} [options.entities] - Entities for linking
   * @returns {Array<Object>} Array of IntentionalAct nodes
   */
  extract(text, options = {}) {
    const acts = [];
    const entities = options.entities || this.entities;

    // Parse with Compromise NLP
    const doc = nlp(text);

    // Extract verbs
    const verbs = doc.verbs();

    verbs.forEach((verb, index) => {
      const verbText = verb.text();
      const verbJson = verb.json()[0] || {};
      const verbData = verbJson.verb || {};

      // Skip auxiliary-only verbs (is, are, was, were, be)
      if (this._isAuxiliaryOnly(verbData)) {
        return;
      }

      // Skip infinitive markers (to + verb patterns already captured)
      if (verbData.grammar?.isInfinitive && !verbData.auxiliary) {
        return;
      }

      // Get infinitive form
      const infinitive = verbData.infinitive || verbData.root || verbText;

      // Get span offset
      const offset = this._getSpanOffset(text, verbText, index);

      // Determine CCO act type
      const actType = this._determineActType(infinitive);

      // Detect modality
      const modality = this._detectModality(verbData);

      // Detect negation
      const negation = verbData.negative || false;

      // Extract tense info
      const tense = this._extractTense(verbData);

      // Link to entities (agent, patient, affected)
      const links = this._linkToEntities(text, verbText, offset, entities);

      // Create IntentionalAct node
      const act = this._createIntentionalAct({
        text: verbText,
        infinitive,
        offset,
        actType,
        modality,
        negation,
        tense,
        links
      });

      acts.push(act);
    });

    return acts;
  }

  /**
   * Check if verb is auxiliary only (no main verb content)
   * @param {Object} verbData - Compromise verb data
   * @returns {boolean} True if auxiliary only
   */
  _isAuxiliaryOnly(verbData) {
    const auxOnlyVerbs = ['be', 'is', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had'];
    const root = (verbData.infinitive || verbData.root || '').toLowerCase();
    return auxOnlyVerbs.includes(root) && !verbData.auxiliary;
  }

  /**
   * Determine CCO act type from verb infinitive
   * @param {string} infinitive - Verb infinitive form
   * @returns {string} CCO act type IRI
   */
  _determineActType(infinitive) {
    const lowerInf = infinitive.toLowerCase().trim();

    // Check for known mappings
    if (VERB_TO_CCO_MAPPINGS[lowerInf]) {
      return VERB_TO_CCO_MAPPINGS[lowerInf];
    }

    return VERB_TO_CCO_MAPPINGS['_default'];
  }

  /**
   * Detect deontic modality from verb data
   * @param {Object} verbData - Compromise verb data
   * @returns {string|null} Modality type or null
   */
  _detectModality(verbData) {
    const auxiliary = (verbData.auxiliary || '').toLowerCase().trim();

    if (!auxiliary) {
      return null;
    }

    // Check for known modality mappings
    if (MODALITY_MAPPINGS[auxiliary]) {
      return MODALITY_MAPPINGS[auxiliary];
    }

    // Check for compound modals (e.g., "have to")
    for (const [modal, modality] of Object.entries(MODALITY_MAPPINGS)) {
      if (auxiliary.includes(modal)) {
        return modality;
      }
    }

    return null;
  }

  /**
   * Extract tense information
   * @param {Object} verbData - Compromise verb data
   * @returns {Object} Tense info
   */
  _extractTense(verbData) {
    const grammar = verbData.grammar || {};
    return {
      tense: grammar.tense || 'present',
      form: grammar.form || 'simple',
      aspect: this._determineAspect(grammar.form)
    };
  }

  /**
   * Determine grammatical aspect from form
   * @param {string} form - Verb form
   * @returns {string} Aspect
   */
  _determineAspect(form) {
    if (!form) return 'simple';
    if (form.includes('progressive') || form.includes('continuous')) return 'progressive';
    if (form.includes('perfect')) return 'perfect';
    return 'simple';
  }

  /**
   * Get start position from entity (supports both v2.2 and legacy properties)
   * @param {Object} entity - Entity node
   * @returns {number} Start position
   * @private
   */
  _getEntityStart(entity) {
    // v2.2 property
    if (entity['tagteam:startPosition'] !== undefined) {
      return entity['tagteam:startPosition'];
    }
    // Legacy property
    if (entity['tagteam:span_offset']?.[0] !== undefined) {
      return entity['tagteam:span_offset'][0];
    }
    return 0;
  }

  /**
   * Get end position from entity (supports both v2.2 and legacy properties)
   * @param {Object} entity - Entity node
   * @returns {number} End position
   * @private
   */
  _getEntityEnd(entity) {
    // v2.2 property
    if (entity['tagteam:endPosition'] !== undefined) {
      return entity['tagteam:endPosition'];
    }
    // Legacy property
    if (entity['tagteam:span_offset']?.[1] !== undefined) {
      return entity['tagteam:span_offset'][1];
    }
    return 0;
  }

  /**
   * Build a map from Tier 1 referent IRI to Tier 2 entity IRI
   *
   * @param {Array} entities - All entities (both Tier 1 and Tier 2)
   * @returns {Map<string, string>} Map from referent IRI to Tier 2 IRI
   * @private
   */
  _buildTier2LinkMap(entities) {
    const linkMap = new Map();

    // Find all referents with is_about links
    entities.forEach(entity => {
      if (entity['cco:is_about']) {
        linkMap.set(entity['@id'], entity['cco:is_about']);
      }
    });

    return linkMap;
  }

  /**
   * Link act to discourse referents (Tier 1) or real-world entities (Tier 2)
   *
   * v2.2 spec: Acts should link to Tier 2 entities (cco:Person, cco:Artifact)
   * via has_agent/affects. When linkToTier2 is enabled, resolves Tier 1
   * referents to their Tier 2 entities via cco:is_about.
   *
   * @param {string} fullText - Full input text
   * @param {string} verbText - Verb text
   * @param {number} verbOffset - Verb offset
   * @param {Array} entities - Available entities (both Tier 1 and Tier 2)
   * @returns {Object} Links to entities
   */
  _linkToEntities(fullText, verbText, verbOffset, entities) {
    const links = {
      agent: null,
      patient: null,
      participants: []
    };

    if (!entities || entities.length === 0) {
      return links;
    }

    // Filter to only Tier 1 DiscourseReferents (not Tier 2 Person/Artifact)
    const referents = entities.filter(e =>
      e['@type'] && e['@type'].includes('tagteam:DiscourseReferent')
    );

    if (referents.length === 0) {
      return links;
    }

    // Build link map from Tier 1 to Tier 2 (if linkToTier2 enabled)
    const linkMap = this.options.linkToTier2 ? this._buildTier2LinkMap(entities) : new Map();

    // Find entities before and after verb
    const entitiesBefore = [];
    const entitiesAfter = [];

    referents.forEach(entity => {
      const entityOffset = this._getEntityStart(entity);
      if (entityOffset < verbOffset) {
        entitiesBefore.push(entity);
      } else {
        entitiesAfter.push(entity);
      }
    });

    // Helper to resolve IRI (Tier 1 → Tier 2 if linkToTier2 enabled)
    const resolveIRI = (referentIRI) => {
      if (this.options.linkToTier2 && linkMap.has(referentIRI)) {
        return linkMap.get(referentIRI);
      }
      return referentIRI;
    };

    // Agent is typically the closest entity before the verb
    if (entitiesBefore.length > 0) {
      // Get the closest one to the verb
      const closestBefore = entitiesBefore.reduce((closest, entity) => {
        const entityEnd = this._getEntityEnd(entity);
        const closestEnd = this._getEntityEnd(closest);
        return entityEnd > closestEnd ? entity : closest;
      });
      links.agent = resolveIRI(closestBefore['@id']);
    }

    // Patient/affected is typically the closest entity after the verb
    if (entitiesAfter.length > 0) {
      // Get the closest one to the verb
      const closestAfter = entitiesAfter.reduce((closest, entity) => {
        const entityStart = this._getEntityStart(entity);
        const closestStart = this._getEntityStart(closest);
        return entityStart < closestStart ? entity : closest;
      });
      links.patient = resolveIRI(closestAfter['@id']);
    }

    // All entities after verb are potential participants (resolved to Tier 2)
    links.participants = entitiesAfter.map(e => resolveIRI(e['@id']));

    return links;
  }

  /**
   * Get span offset for verb in text
   * @param {string} fullText - Full input text
   * @param {string} verbText - Verb text
   * @param {number} index - Verb index
   * @returns {number} Character offset
   */
  _getSpanOffset(fullText, verbText, index) {
    const lowerText = fullText.toLowerCase();
    const lowerVerb = verbText.toLowerCase();

    let offset = 0;
    let searchStart = 0;

    // Find nth occurrence
    for (let i = 0; i <= index; i++) {
      const found = lowerText.indexOf(lowerVerb, searchStart);
      if (found === -1) break;
      offset = found;
      searchStart = found + 1;
    }

    return offset;
  }

  /**
   * Determine actuality status based on modality and negation
   *
   * v2.2 spec: All acts have actualityStatus (Named Individual)
   * - Negated acts → tagteam:Negated
   * - Modal verbs → mapped via MODALITY_TO_STATUS
   * - Simple past/present → tagteam:Actual
   *
   * @param {string|null} modality - Detected modality
   * @param {boolean} negation - Whether act is negated
   * @param {Object} tense - Tense information
   * @returns {string} ActualityStatus IRI
   * @private
   */
  _determineActualityStatus(modality, negation, tense) {
    // Negation takes precedence
    if (negation) {
      return 'tagteam:Negated';
    }

    // Modal verbs determine status
    if (modality && MODALITY_TO_STATUS[modality]) {
      return MODALITY_TO_STATUS[modality];
    }

    // Default: past or present tense without modality = Actual
    return 'tagteam:Actual';
  }

  /**
   * Create an IntentionalAct node
   *
   * v2.2 spec updates:
   * - All acts have actualityStatus (Prescribed, Actual, Negated, etc.)
   * - Uses sourceText, startPosition, endPosition (v2.2 position properties)
   * - Links to Tier 2 entities via has_agent/affects
   *
   * @param {Object} actInfo - Act information
   * @returns {Object} IntentionalAct node
   */
  _createIntentionalAct(actInfo) {
    // Generate IRI
    let iri;
    if (this.graphBuilder) {
      iri = this.graphBuilder.generateIRI(
        actInfo.infinitive,
        'IntentionalAct',
        actInfo.offset
      );
    } else {
      // Fallback simple IRI
      const cleanVerb = actInfo.infinitive.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      iri = `inst:${cleanVerb}_Act_${actInfo.offset}`;
    }

    // Determine actuality status (v2.2)
    const actualityStatus = this._determineActualityStatus(
      actInfo.modality,
      actInfo.negation,
      actInfo.tense
    );

    // Build node with v2.2 position properties
    const node = {
      '@id': iri,
      '@type': [actInfo.actType, 'owl:NamedIndividual'],
      'rdfs:label': `Act of ${actInfo.infinitive}`,
      'tagteam:verb': actInfo.infinitive,
      'tagteam:sourceText': actInfo.text,
      'tagteam:startPosition': actInfo.offset,
      'tagteam:endPosition': actInfo.offset + actInfo.text.length,
      'tagteam:actualityStatus': actualityStatus
    };

    // Add modality if present
    if (actInfo.modality) {
      node['tagteam:modality'] = actInfo.modality;
    }

    // Add negation if present (kept for backward compatibility)
    if (actInfo.negation) {
      node['tagteam:negated'] = true;
    }

    // Add tense info
    if (actInfo.tense) {
      node['tagteam:tense'] = actInfo.tense.tense;
      if (actInfo.tense.aspect !== 'simple') {
        node['tagteam:aspect'] = actInfo.tense.aspect;
      }
    }

    // Add links to entities (Tier 2 if linkToTier2 enabled)
    if (actInfo.links.agent) {
      node['cco:has_agent'] = actInfo.links.agent;
    }

    if (actInfo.links.patient) {
      node['cco:affects'] = actInfo.links.patient;
    }

    if (actInfo.links.participants && actInfo.links.participants.length > 0) {
      node['bfo:has_participant'] = actInfo.links.participants;
    }

    return node;
  }

  /**
   * Set the graph builder for IRI generation
   * @param {Object} graphBuilder - SemanticGraphBuilder instance
   */
  setGraphBuilder(graphBuilder) {
    this.graphBuilder = graphBuilder;
  }

  /**
   * Set entities for linking
   * @param {Array} entities - Entity nodes
   */
  setEntities(entities) {
    this.entities = entities;
  }
}

module.exports = ActExtractor;
