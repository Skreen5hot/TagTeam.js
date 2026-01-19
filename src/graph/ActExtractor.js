/**
 * ActExtractor.js
 *
 * Extracts intentional acts from verb phrases and creates
 * cco:IntentionalAct nodes for the semantic graph.
 *
 * Phase 1.3: Act Extraction
 *
 * @module graph/ActExtractor
 * @version 3.0.0-alpha.2
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
 * ActExtractor class - extracts acts and creates IntentionalAct nodes
 */
class ActExtractor {
  /**
   * Create a new ActExtractor
   * @param {Object} options - Configuration options
   * @param {Object} [options.graphBuilder] - SemanticGraphBuilder instance
   * @param {Array} [options.entities] - Previously extracted entities for linking
   */
  constructor(options = {}) {
    this.options = options;
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
   * Link act to discourse referents
   * @param {string} fullText - Full input text
   * @param {string} verbText - Verb text
   * @param {number} verbOffset - Verb offset
   * @param {Array} entities - Available entities
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

    // Find entities before and after verb
    const entitiesBefore = [];
    const entitiesAfter = [];

    entities.forEach(entity => {
      const entityOffset = entity['tagteam:span_offset']?.[0] || 0;
      if (entityOffset < verbOffset) {
        entitiesBefore.push(entity);
      } else {
        entitiesAfter.push(entity);
      }
    });

    // Agent is typically the closest entity before the verb
    if (entitiesBefore.length > 0) {
      // Get the closest one to the verb
      const closestBefore = entitiesBefore.reduce((closest, entity) => {
        const entityEnd = entity['tagteam:span_offset']?.[1] || 0;
        const closestEnd = closest['tagteam:span_offset']?.[1] || 0;
        return entityEnd > closestEnd ? entity : closest;
      });
      links.agent = closestBefore['@id'];
    }

    // Patient/affected is typically the closest entity after the verb
    if (entitiesAfter.length > 0) {
      // Get the closest one to the verb
      const closestAfter = entitiesAfter.reduce((closest, entity) => {
        const entityStart = entity['tagteam:span_offset']?.[0] || Infinity;
        const closestStart = closest['tagteam:span_offset']?.[0] || Infinity;
        return entityStart < closestStart ? entity : closest;
      });
      links.patient = closestAfter['@id'];
    }

    // All entities after verb are potential participants
    links.participants = entitiesAfter.map(e => e['@id']);

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
   * Create an IntentionalAct node
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

    // Build node
    const node = {
      '@id': iri,
      '@type': [actInfo.actType, 'owl:NamedIndividual'],
      'rdfs:label': `Act of ${actInfo.infinitive}`,
      'tagteam:verb': actInfo.infinitive,
      'tagteam:verb_text': actInfo.text,
      'tagteam:span_offset': [actInfo.offset, actInfo.offset + actInfo.text.length]
    };

    // Add modality if present
    if (actInfo.modality) {
      node['tagteam:modality'] = actInfo.modality;
    }

    // Add negation if present
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

    // Add links to entities
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
