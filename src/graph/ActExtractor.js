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
 * Phase 3: Selectional Restrictions
 * - Verb sense disambiguation based on direct object ontological type
 * - "provide care" → ActOfService, "provide medication" → ActOfTransferOfPossession
 * - Config loader can override restrictions for domain-specific behavior
 *
 * @module graph/ActExtractor
 * @version 4.0.0-phase4
 */

const nlp = require('compromise');
const SentenceModeClassifier = require('./SentenceModeClassifier');

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
 * Verbs that, when used with an inanimate subject, indicate an inference
 * or clinical finding rather than an intentional act.
 * "Blood sugar levels suggest diabetes" → InformationContentEntity, not IntentionalAct
 */
const INFERENCE_VERBS = new Set([
  'suggest', 'indicate', 'show', 'reveal', 'demonstrate',
  'imply', 'point', 'confirm', 'support', 'correlate'
]);

/**
 * Control verbs — verbs that take infinitive complements.
 * "He needs to drop" → "need" is control verb, "drop" is the semantic act.
 * The control verb contributes modality; the infinitive is the actual IntentionalAct.
 */
const CONTROL_VERBS = new Set([
  'need', 'want', 'try', 'attempt', 'decide', 'plan', 'intend',
  'aim', 'seek', 'refuse', 'fail', 'agree', 'promise', 'offer',
  'choose', 'manage', 'expect', 'hope', 'wish', 'prefer',
  'demand', 'require'
]);

/**
 * Modality contributed by control verbs.
 * null = no deontic modality (e.g., "try", "attempt" — aspectual only)
 */
const CONTROL_VERB_MODALITY = {
  'need': 'obligation',
  'require': 'obligation',
  'demand': 'obligation',
  'promise': 'obligation',
  'want': 'intention',
  'intend': 'intention',
  'plan': 'intention',
  'decide': 'intention',
  'choose': 'intention',
  'aim': 'intention',
  'seek': 'intention',
  'hope': 'intention',
  'wish': 'intention',
  'expect': 'intention',
  'agree': 'intention',
  'prefer': 'recommendation',
  'offer': 'permission',
  'refuse': 'prohibition',
  'try': null,
  'attempt': null,
  'fail': null,
  'manage': null
};

/**
 * Ergative/unaccusative verbs — verbs where the subject is the patient/theme,
 * not the agent. "The server rebooted" = server undergoes rebooting (patient).
 * With inanimate subjects, these verbs indicate a process happening TO the subject.
 * With animate subjects, agent reading may still be valid ("He rebooted the server").
 */
const ERGATIVE_VERBS = new Set([
  'reboot', 'restart', 'crash', 'break', 'fail', 'collapse', 'freeze',
  'stall', 'malfunction', 'overheat', 'explode', 'implode', 'melt',
  'dissolve', 'evaporate', 'corrode', 'deteriorate', 'degrade',
  'sink', 'capsize', 'derail', 'rupture', 'fracture', 'shatter',
  'start', 'stop', 'open', 'close', 'change', 'move', 'grow',
  'shrink', 'expand', 'increase', 'decrease', 'improve', 'worsen',
  'sound', 'ring', 'buzz', 'beep', 'flash', 'chime', 'blare', 'tick',
  'emit', 'glow', 'shine', 'flicker', 'hum', 'vibrate', 'rattle'  // ENH-008: emission verbs
]);

// Always-ergative verbs: always intransitive. The inanimate subject is never an intentional agent,
// even when cross-clause linking falsely assigns a patient. These bypass the !links.patient guard.
// Includes emission verbs (sound, ring) and dysfunction verbs (fail, malfunction).
const ALWAYS_ERGATIVE_VERBS = new Set([
  // Emission verbs
  'sound', 'ring', 'buzz', 'beep', 'flash', 'chime', 'blare', 'tick',
  'glow', 'shine', 'flicker', 'hum', 'vibrate', 'rattle',
  'emit',  // ENH-008: "The sensor emitted a signal" → sensor is not agent
  // Dysfunction/state-change verbs (always intransitive when inanimate)
  'fail', 'malfunction', 'stall', 'freeze', 'overheat',
  'corrode', 'deteriorate', 'degrade'
]);

/**
 * Deontic modality mappings
 * Maps modal auxiliaries to modality types
 *
 * Phase 6.4: Extended deontic vocabulary based on BFO-based deontic ontology
 * and Hohfeldian fundamental legal concepts.
 */
const MODALITY_MAPPINGS = {
  // Obligation (duty to act)
  'must': 'obligation',
  'shall': 'obligation',           // Added - legal/formal
  'have to': 'obligation',
  'need to': 'obligation',
  'required': 'obligation',
  'obligated': 'obligation',       // Added

  // Permission (liberty to act)
  'may': 'permission',
  'can': 'permission',
  'allowed': 'permission',
  'permitted': 'permission',       // Added
  'free to': 'permission',         // Added

  // Prohibition (duty not to act)
  'must not': 'prohibition',
  'shall not': 'prohibition',      // Added - legal/formal
  'cannot': 'prohibition',
  'may not': 'prohibition',
  'not allowed': 'prohibition',    // Added

  // Recommendation (soft obligation)
  'should': 'recommendation',
  'ought': 'recommendation',
  'advisable': 'recommendation',   // Added

  // Intention
  'will': 'intention',
  'would': 'intention',
  'going to': 'intention'
};

/**
 * Extended lexical deontic markers
 * Maps lexical patterns to modality types (beyond modal auxiliaries)
 *
 * Phase 6.4: Hohfeldian deontic concepts
 */
const LEXICAL_DEONTIC_MARKERS = {
  // Claim/Right (Hohfeldian claim - correlative of duty)
  claim: {
    patterns: [
      /\b(is|are)\s+entitled\s+to\b/i,
      /\b(has|have)\s+(the\s+)?right\s+to\b/i,
      /\bhas\s+the\s+right\b/i,
      /\bdeserves?\s+\w+/i,
      /\b(is|are)\s+owed\b/i,
      /\bdue\s+to\b/i,
      /\bentitled\s+to\b/i
    ],
    singleWords: ['entitled', 'deserves', 'deserve', 'owed']
  },

  // Power/Authority (Hohfeldian power - ability to change normative relations)
  power: {
    patterns: [
      /\b(is|are)\s+authorized\s+to\b/i,
      /\b(is|are)\s+empowered\s+to\b/i,
      /\bempowers?\s+\w+/i,
      /\bdelegates?\s+\w+/i,
      /\bgrants?\s+\w+/i,
      /\bconfers?\s+\w+/i,
      /\bauthorize[sd]?\s+to\b/i
    ],
    singleWords: ['authorize', 'authorizes', 'authorized', 'empower', 'empowers', 'empowered',
                  'delegate', 'delegates', 'delegated', 'grant', 'grants', 'granted',
                  'confer', 'confers', 'conferred']
  },

  // Immunity (Hohfeldian immunity - protection from power)
  immunity: {
    patterns: [
      /\b(is|are)\s+exempt\s+from\b/i,
      /\b(is|are)\s+immune\s+(from|to)\b/i,
      /\b(is|are)\s+protected\s+from\b/i,
      /\bexempt\s+from\b/i,
      /\bprotected\s+from\b/i,
      /\bimmune\s+(from|to)\b/i
    ],
    singleWords: ['exempt', 'exempted', 'immune']
  },

  // Enhanced prohibition detection
  prohibition: {
    patterns: [
      /\b(is|are)\s+forbidden\s+(to|from)\b/i,
      /\b(is|are)\s+prohibited\s+from\b/i,
      /\b(is|are)\s+not\s+allowed\s+to\b/i,
      /\b(is|are)\s+banned\s+from\b/i,
      /\bforbidden\s+(to|from)\b/i,
      /\bprohibited\s+from\b/i
    ],
    singleWords: ['forbidden', 'prohibited', 'banned']
  },

  // Enhanced permission detection
  permission: {
    patterns: [
      /\b(is|are)\s+allowed\s+to\b/i,
      /\b(is|are)\s+permitted\s+to\b/i
    ],
    singleWords: []
  },

  // Enhanced obligation detection
  obligation: {
    patterns: [
      /\b(is|are)\s+required\s+to\b/i,
      /\b(is|are)\s+obligated\s+to\b/i
    ],
    singleWords: ['required', 'obligated']
  }
};

/**
 * Modality to ActualityStatus mapping
 * Maps deontic modality to appropriate actuality status
 *
 * Phase 6.4: Extended with Hohfeldian-based status values
 */
const MODALITY_TO_STATUS = {
  // Existing
  'obligation': 'tagteam:Prescribed',
  'permission': 'tagteam:Permitted',
  'prohibition': 'tagteam:Prohibited',
  'recommendation': 'tagteam:Prescribed', // Recommendations are a softer form of prescription
  'intention': 'tagteam:Planned',
  'hypothetical': 'tagteam:Hypothetical',

  // Phase 6.4: New Hohfeldian-based statuses
  'claim': 'tagteam:Entitled',            // Right-holder status
  'power': 'tagteam:Empowered',           // Authority status
  'immunity': 'tagteam:Protected'         // Protection status
};

/**
 * Modality to Deontic Type mapping
 * Maps modality to Hohfeldian deontic classification
 *
 * Phase 6.4: For advanced normative relation analysis
 */
const MODALITY_TO_DEONTIC_TYPE = {
  'obligation': 'duty',
  'permission': 'privilege',
  'prohibition': 'duty',        // duty NOT to act
  'recommendation': 'soft_duty',
  'claim': 'claim',
  'power': 'power',
  'immunity': 'immunity',
  'intention': null,
  'hypothetical': null
};

/**
 * Selectional Restrictions - Phase 3
 *
 * Maps verb + direct object ontological category to specialized act types.
 * This allows verb sense disambiguation based on what type of thing is being
 * acted upon.
 *
 * Ontological categories:
 * - objectIsOccurrent: Direct object is a process/event (care, treatment, service)
 * - objectIsContinuant: Direct object is a physical thing (medication, equipment)
 * - objectIsGDC: Direct object is information content (advice, data, instructions)
 * - objectIsPerson: Direct object is a person
 * - default: Fallback when category cannot be determined
 *
 * Based on ONTOLOGICAL_ISSUES_2026_01_19.md v3.1 analysis.
 */
const SELECTIONAL_RESTRICTIONS = {
  'provide': {
    objectIsOccurrent: 'cco:ActOfService',
    objectIsContinuant: 'cco:ActOfTransferOfPossession',
    objectIsGDC: 'cco:ActOfCommunication',
    objectIsPerson: 'cco:ActOfAssistance',
    default: 'cco:IntentionalAct'
  },
  'give': {
    objectIsOccurrent: 'cco:ActOfCommunication', // "give a presentation"
    objectIsContinuant: 'cco:ActOfTransferOfPossession',
    objectIsGDC: 'cco:ActOfCommunication', // "give advice"
    objectIsPerson: 'cco:ActOfTransferOfPossession', // "give the patient to..."
    default: 'cco:ActOfTransferOfPossession'
  },
  'offer': {
    objectIsOccurrent: 'cco:ActOfService',
    objectIsContinuant: 'cco:ActOfTransferOfPossession',
    objectIsGDC: 'cco:ActOfCommunication',
    default: 'cco:ActOfService'
  },
  'deliver': {
    objectIsOccurrent: 'cco:ActOfService', // "deliver care"
    objectIsContinuant: 'cco:ActOfTransferOfPossession', // "deliver medication"
    objectIsGDC: 'cco:ActOfCommunication', // "deliver a message"
    default: 'cco:ActOfTransferOfPossession'
  },
  'administer': {
    objectIsOccurrent: 'cco:ActOfAdministration', // "administer treatment"
    objectIsContinuant: 'cco:ActOfDrugAdministration', // "administer medication"
    objectIsGDC: 'cco:ActOfAdministration',
    default: 'cco:ActOfAdministration'
  },
  'allocate': {
    objectIsOccurrent: 'cco:ActOfAllocation',
    objectIsContinuant: 'cco:ActOfAllocation',
    objectIsPerson: 'cco:ActOfAssignment', // "allocate staff"
    default: 'cco:ActOfAllocation'
  },
  'assign': {
    objectIsOccurrent: 'cco:ActOfAssignment',
    objectIsContinuant: 'cco:ActOfAssignment',
    objectIsPerson: 'cco:ActOfAssignment',
    default: 'cco:ActOfAssignment'
  },
  'send': {
    objectIsOccurrent: 'cco:ActOfCommunication',
    objectIsContinuant: 'cco:ActOfTransferOfPossession',
    objectIsGDC: 'cco:ActOfCommunication', // "send information"
    objectIsPerson: 'cco:ActOfDirecting', // "send the patient"
    default: 'cco:ActOfCommunication'
  },
  'receive': {
    objectIsOccurrent: 'cco:ActOfReceiving',
    objectIsContinuant: 'cco:ActOfReceiving',
    objectIsGDC: 'cco:ActOfReceiving',
    default: 'cco:ActOfReceiving'
  },
  'transfer': {
    objectIsOccurrent: 'cco:ActOfTransfer',
    objectIsContinuant: 'cco:ActOfTransferOfPossession',
    objectIsPerson: 'cco:ActOfPatientTransfer',
    default: 'cco:ActOfTransfer'
  }
};

/**
 * BFO type categories for selectional restriction matching
 * Maps denotesType values to ontological categories
 */
const TYPE_TO_CATEGORY = {
  // Occurrents (processes)
  'bfo:BFO_0000015': 'occurrent',
  'cco:ActOfCare': 'occurrent',
  'cco:ActOfMedicalTreatment': 'occurrent',
  'cco:ActOfSurgery': 'occurrent',
  'cco:ActOfMedicalProcedure': 'occurrent',
  'cco:ActOfExamination': 'occurrent',
  'cco:ActOfDiagnosis': 'occurrent',
  'cco:ActOfService': 'occurrent',
  'cco:ActOfAssistance': 'occurrent',
  'cco:ActOfIntervention': 'occurrent',
  'cco:ActOfCommunication': 'occurrent',
  'cco:ActOfRehabilitation': 'occurrent',
  'cco:ActOfResuscitation': 'occurrent',

  // Independent Continuants (physical things)
  'bfo:BFO_0000040': 'continuant',
  'cco:Artifact': 'continuant',
  'cco:BodyPart': 'continuant',
  'cco:DrugProduct': 'continuant',
  'cco:MedicalDevice': 'continuant',

  // Persons
  'cco:Person': 'person',
  'cco:GroupOfPersons': 'person',
  'cco:Patient': 'person',
  'cco:Physician': 'person',
  'cco:Nurse': 'person',

  // Organizations (treated as continuant for selectional purposes)
  'cco:Organization': 'continuant',
  'cco:Hospital': 'continuant',

  // Generically Dependent Continuants (information)
  'bfo:BFO_0000031': 'gdc',
  'cco:InformationContentEntity': 'gdc'
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
    this._sentenceModeClassifier = new SentenceModeClassifier();
    // ENH-003: Track implicit "you" entity for reuse across imperatives
    this._implicitYouEntity = null;
  }

  /**
   * Extract acts from text and return IntentionalAct nodes
   *
   * Phase 6.4: Enhanced to detect sentence-level deontic patterns
   * that Compromise NLP may miss.
   *
   * @param {string} text - Input text to analyze
   * @param {Object} [options] - Extraction options
   * @param {Array} [options.entities] - Entities for linking
   * @returns {Array<Object>} Array of IntentionalAct nodes
   */
  extract(text, options = {}) {
    const acts = [];
    const entities = options.entities || this.entities;
    const cdSpans = options.complexDesignatorSpans || [];

    // ENH-003: Reset implicit "you" tracking for fresh text
    this._resetImplicitYou();

    // Phase 6.4: First detect sentence-level deontic patterns
    // These may not be captured by Compromise NLP verb extraction
    const sentenceDeontic = this._detectSentenceLevelDeontic(text, entities);
    if (sentenceDeontic) {
      acts.push(sentenceDeontic);
    }

    // Parse with Compromise NLP
    const doc = nlp(text);

    // Extract verbs
    const verbs = doc.verbs();

    // Pass 1: Collect verb entries, identifying control verbs and infinitive complements
    const verbEntries = [];
    verbs.forEach((verb, index) => {
      const verbText = verb.text();
      const verbJson = verb.json()[0] || {};
      const verbData = verbJson.verb || {};

      if (this._isAuxiliaryOnly(verbData)) return;

      // Get infinitive and strip "to " prefix if present (e.g., "to allocate" → "allocate")
      let infinitive = verbData.infinitive || verbData.root || verbText;
      if (infinitive.toLowerCase().startsWith('to ')) {
        infinitive = infinitive.substring(3);
      }
      const isInfinitive = !!(verbData.grammar?.isInfinitive && !verbData.auxiliary);
      const isControlVerb = CONTROL_VERBS.has(infinitive.toLowerCase());

      verbEntries.push({ verbText, verbData, infinitive, isInfinitive, isControlVerb, index });
    });

    // Detect interrogative mood (question mark at end of text)
    const isInterrogative = text.trim().endsWith('?');

    // Detect imperative mood: sentence starts with a base-form verb and has no explicit subject
    // e.g., "Submit the report by Friday." — verb-initial, no pronoun/noun subject before verb
    const isImperative = this._isImperativeSentence(text, doc);

    // Do-support filtering: "Did he approve?" → "did" is auxiliary, not a separate act
    // If a do-form verb coexists with other non-do verbs, remove the do-form
    const hasDoForm = verbEntries.some(e => this._isDoForm(e.infinitive));
    const hasNonDoVerb = verbEntries.some(e => !this._isDoForm(e.infinitive));
    if (hasDoForm && hasNonDoVerb) {
      // Remove do-support entries (they carry tense but not semantic content)
      for (let i = verbEntries.length - 1; i >= 0; i--) {
        if (this._isDoForm(verbEntries[i].infinitive)) {
          verbEntries.splice(i, 1);
        }
      }
    }

    // Pass 2: Pair control verbs with their infinitive complements
    const consumedIndices = new Set();
    for (let i = 0; i < verbEntries.length; i++) {
      const entry = verbEntries[i];
      if (entry.isControlVerb && i + 1 < verbEntries.length && verbEntries[i + 1].isInfinitive) {
        // Control verb + infinitive pair found
        // Mark control verb as consumed — the infinitive becomes the primary act
        consumedIndices.add(i);
        // Tag the infinitive with the control verb's modality
        verbEntries[i + 1]._controlVerb = entry.infinitive.toLowerCase();
        verbEntries[i + 1]._controlModality = CONTROL_VERB_MODALITY[entry.infinitive.toLowerCase()] || null;
        // Inherit the control verb's sourceText span for combined sourceText
        verbEntries[i + 1]._controlVerbText = entry.verbText;
      }
    }

    verbEntries.forEach((entry, i) => {
      // Skip consumed control verbs (absorbed into infinitive complement)
      if (consumedIndices.has(i)) return;

      // Skip standalone infinitives not preceded by a control verb
      if (entry.isInfinitive && !entry._controlVerb) return;

      const { verbText, verbData, index } = entry;
      const infinitive = entry.infinitive;

      // Get span offset
      const offset = this._getSpanOffset(text, verbText, index);

      // Phase 7 v7: Skip verbs that fall inside ComplexDesignator spans
      if (cdSpans.length > 0) {
        const verbEnd = offset + verbText.length;
        const insideCD = cdSpans.some(span =>
          offset >= span.start && verbEnd <= span.end
        );
        if (insideCD) return; // Skip — this "verb" is part of a proper name
      }

      // Phase 7 v7: Check if verb is stative — route to StructuralAssertion instead of IntentionalAct
      const followedBy = this._getWordAfterVerb(text, offset, verbText);
      const verbClassification = this._sentenceModeClassifier.classifyVerb(infinitive, { followedBy });

      if (verbClassification.category === 'STATIVE_DEFINITE') {
        const links = this._linkToEntities(text, verbText, offset, entities);
        const assertion = this._createStructuralAssertion({
          text: verbText,
          infinitive,
          offset,
          relation: verbClassification.relation,
          inverse: verbClassification.inverse,
          links,
          sourceText: text
        });
        acts.push(assertion);
        return; // Skip IntentionalAct creation
      }

      if (verbClassification.category === 'STATIVE_AMBIGUOUS') {
        const links = this._linkToEntities(text, verbText, offset, entities);
        // Get object entity type for disambiguation
        const objectEntity = links.patientEntity || links.affectedEntity;
        const objectType = objectEntity?.['@type']?.[0] || objectEntity?.['tagteam:denotesType'] || null;
        const objectLabel = objectEntity?.['rdfs:label'] || null;
        const subjectEntity = links.agentEntity || links.subjectEntity;
        const subjectType = subjectEntity?.['@type']?.[0] || subjectEntity?.['tagteam:denotesType'] || null;

        const disambiguation = this._sentenceModeClassifier.disambiguateStativeVerb(infinitive, {
          objectType, objectLabel, subjectType
        });

        if (disambiguation === 'STATIVE') {
          const stativeRelation = this._sentenceModeClassifier.getRelationForStativeVerb(infinitive);
          const assertion = this._createStructuralAssertion({
            text: verbText,
            infinitive,
            offset,
            relation: stativeRelation,
            inverse: null,
            links,
            sourceText: text
          });
          acts.push(assertion);
          return; // Skip IntentionalAct creation
        }
        // Otherwise fall through to eventive processing
      }

      // Phase 3: Get direct object type for selectional restrictions
      const directObjectType = this._getDirectObjectType(offset, entities);

      // Determine CCO act type (with selectional restrictions if object type available)
      const actType = this._determineActType(infinitive, { directObjectType });

      // Phase 6.4: Enhanced modality detection with lexical markers
      const modalityResult = this._detectModalityEnhanced(verbData, text);
      let modality = modalityResult.modality;
      let deonticType = modalityResult.deonticType;

      // Control verb complement: inherit modality from the control verb
      let controlVerb = null;
      if (entry._controlVerb) {
        controlVerb = entry._controlVerb;
        if (entry._controlModality && !modality) {
          modality = entry._controlModality;
          // Map modality to deontic type
          const MODALITY_TO_DEONTIC = {
            'obligation': 'tagteam:Obligation',
            'permission': 'tagteam:Permission',
            'prohibition': 'tagteam:Prohibition',
            'recommendation': 'tagteam:Recommendation',
            'intention': 'tagteam:Intention'
          };
          deonticType = MODALITY_TO_DEONTIC[modality] || null;
        }
      }

      // Detect negation
      const negation = verbData.negative || false;

      // Extract tense info
      const tense = this._extractTense(verbData);

      // Link to entities (agent, patient, affected)
      // For infinitive complements, use the control verb's position for entity linking
      // since the agent ("He") is syntactically tied to the control verb
      const linkText = entry._controlVerbText || verbText;
      const linkOffset = entry._controlVerbText
        ? this._getSpanOffset(text, entry._controlVerbText, 0)
        : offset;
      const links = this._linkToEntities(text, linkText, linkOffset, entities);

      // Passive voice detection: "X was found [by Y]" → X is patient, Y is agent
      // Compromise NLP provides grammar.passive flag
      const isPassive = !!(verbData.grammar?.passive);
      if (isPassive && links.agent) {
        // In passive voice, the grammatical subject (pre-verb) is the patient, not the agent
        // Save the subject for patient assignment
        const passiveSubject = links.agent;
        const passiveSubjectEntity = links.agentEntity;

        // Check for "by [agent]" phrase after the verb to find the real agent
        const byAgent = this._findByAgent(text, offset, entities);
        if (byAgent) {
          links.agent = byAgent.iri;
          links.agentEntity = byAgent.entity;
          // The entity after "by" is the agent, not the patient
          // Clear patient if it was assigned to the by-agent
          if (links.patient === byAgent.iri) {
            links.patient = null;
            links.patientEntity = null;
          }
        } else {
          // No explicit agent — agent is unknown/implicit
          links.agent = null;
          links.agentEntity = null;
        }

        // The grammatical subject becomes the patient (affected entity)
        links.patient = passiveSubject;
        links.patientEntity = passiveSubjectEntity;
      }

      // ENH-003: Implicit agent for imperatives
      // If this is an imperative sentence, use implicit "you" as agent
      // Exception: if there's an explicit "You" subject pronoun, keep it
      if (isImperative) {
        // Check if the found agent is an explicit "you" pronoun
        const agentLabel = links.agentEntity?.['rdfs:label']?.toLowerCase();
        const hasExplicitYou = agentLabel === 'you';

        if (!hasExplicitYou) {
          // Use implicit "you" - override any incorrectly assigned agent
          const implicitYou = this._getOrCreateImplicitYou();
          links.agent = implicitYou['@id'];
          links.agentEntity = implicitYou;
          links.isImplicitAgent = true;
        }
      }

      // Phase 7.0 Story 3: Inanimate agent re-typing
      // If an inference verb has an inanimate subject, create ICE instead of IntentionalAct
      // Use subjectEntity (includes qualities/temporals) not agentEntity (excludes them)
      const subjectEntity = links.subjectEntity || links.agentEntity;
      if (INFERENCE_VERBS.has(infinitive.toLowerCase()) &&
          subjectEntity && this._isInanimateAgent(subjectEntity)) {
        // Use subject as the "about" source even if filtered from agent
        const inferenceLinks = {
          ...links,
          agent: links.subjectIRI || links.agent,
          agentEntity: subjectEntity
        };
        const inferenceNode = this._createInferenceNode({
          text: verbText,
          infinitive,
          offset,
          links: inferenceLinks
        });
        acts.push(inferenceNode);
        return; // Skip IntentionalAct creation for this verb
      }

      // Ergative verb check: "The server rebooted" → server is patient, not agent
      // When an ergative verb has an inanimate subject and no object, demote agent to participant
      // Always-ergative verbs (emission + dysfunction) always demote — they can never have intentional agents
      const isAlwaysErgative = ALWAYS_ERGATIVE_VERBS.has(infinitive.toLowerCase());
      if (ERGATIVE_VERBS.has(infinitive.toLowerCase()) && links.agentEntity &&
          this._isInanimateAgent(links.agentEntity) && (isAlwaysErgative || !links.patient)) {
        // Demote: agent becomes participant, no agent
        if (!links.participants) links.participants = [];
        links.participants.push(links.agent);
        // ENH-008: Only set agent as patient if no existing patient
        // "The alarm sounded the warning" → warning is patient, alarm is participant
        if (!links.patient) {
          links.patient = links.agent; // The subject undergoes the process
        }
        links.agent = null;
        links.agentEntity = null;
      }

      // Build sourceText: include control verb span if present
      const sourceText = entry._controlVerbText
        ? `${entry._controlVerbText} to ${verbText}`
        : verbText;

      // Actuality overrides:
      // - Interrogative sentences: the act is queried, not asserted
      // - Imperative sentences: the act is commanded, not yet realized
      // - Infinitive complements of control verbs: not yet realized
      let actualityOverride = null;
      if (isInterrogative) {
        actualityOverride = 'tagteam:Interrogative';
      } else if (isImperative) {
        actualityOverride = 'tagteam:Prescribed';
      } else if (controlVerb) {
        actualityOverride = 'tagteam:Prescribed';
      }

      // Create IntentionalAct node (Phase 6.4: includes deonticType)
      const act = this._createIntentionalAct({
        text: sourceText,
        infinitive,
        offset,
        actType,
        modality,
        deonticType,
        negation,
        tense,
        links,
        controlVerb,
        actualityOverride
      });

      acts.push(act);
    });

    // ENH-003: Attach implicit entities to result for graph builder to include
    // Using a property on the array to maintain backward compatibility
    acts._implicitEntities = this._implicitYouEntity ? [this._implicitYouEntity] : [];

    return acts;
  }

  /**
   * ENH-003: Get any implicit entities created during extraction.
   * These should be added to the graph as Tier 2 entities.
   *
   * @returns {Array<Object>} Implicit entities (e.g., implicit "you" for imperatives)
   */
  getImplicitEntities() {
    return this._implicitYouEntity ? [this._implicitYouEntity] : [];
  }

  /**
   * Phase 7 v7: Get the word immediately following the verb in the text.
   * Used for "have to" detection.
   */
  _getWordAfterVerb(text, offset, verbText) {
    const afterIndex = offset + verbText.length;
    const rest = text.slice(afterIndex).trimStart();
    const match = rest.match(/^(\w+)/);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Phase 7 v7: Create a StructuralAssertion node for stative verbs.
   * Instead of IntentionalAct + AgentRole/PatientRole, stative verbs produce
   * a subject-relation-object assertion with no act semantics.
   */
  _createStructuralAssertion({ text, infinitive, offset, relation, inverse, links, sourceText }) {
    let id;
    if (this.graphBuilder) {
      id = this.graphBuilder.generateIRI(infinitive, 'StructuralAssertion', offset);
    } else {
      const cleanVerb = infinitive.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      id = `inst:StructuralAssertion_${cleanVerb}_${offset}`;
    }

    const subject = links.agent || links.subjectIRI || null;
    const object = links.patient || links.affected || null;

    const node = {
      '@id': id,
      '@type': ['tagteam:StructuralAssertion'],
      'tagteam:verb': infinitive,
      'tagteam:assertsRelation': relation,
      'tagteam:sourceText': sourceText
    };

    if (subject) {
      node['tagteam:hasSubject'] = { '@id': subject };
    }
    if (object) {
      node['tagteam:hasObject'] = { '@id': object };
    }
    if (inverse) {
      node['tagteam:inverseRelation'] = inverse;
    }

    return node;
  }

  /**
   * Check if verb is auxiliary only (no main verb content)
   * @param {Object} verbData - Compromise verb data
   * @returns {boolean} True if auxiliary only
   */
  _isAuxiliaryOnly(verbData) {
    const auxOnlyVerbs = ['be', 'is', 'are', 'was', 'were', 'been', 'being'];
    // Phase 7 v7: "have/has/had" removed from aux-only list — they can be stative main verbs
    // (e.g., "The hospital has two ventilators"). The stative check in the verb loop handles routing.
    const haveVerbs = ['have', 'has', 'had'];
    const root = (verbData.infinitive || verbData.root || '').toLowerCase();
    if (auxOnlyVerbs.includes(root) && !verbData.auxiliary) return true;
    // For have/has/had: only filter if it's truly auxiliary (another main verb exists)
    if (haveVerbs.includes(root) && !verbData.auxiliary) {
      // Check if Compromise detected it as a standalone verb (no participle follows)
      const text = verbData.text || '';
      // If the verb phrase is just "has"/"have"/"had" with no participle, it's a main verb
      return false;
    }
    return false;
  }

  /**
   * Check if a verb is do-support (auxiliary "do/did/does" in questions/negation)
   * Do-support is auxiliary when another main verb exists in the sentence.
   * "Did he approve?" → "did" is auxiliary, "approve" is main verb.
   * "He did the dishes" → "did" is main verb (no other verb).
   * @param {string} root - Verb root/infinitive
   * @returns {boolean} True if this is a do-form
   */
  _isDoForm(root) {
    return ['do', 'did', 'does'].includes(root.toLowerCase());
  }

  /**
   * Detect imperative mood: sentence starts with a base-form verb, no explicit subject.
   * "Submit the report by Friday." → imperative (verb-initial, no subject)
   * "He submits the report." → NOT imperative (has subject "He")
   * "Please submit the report." → imperative (polite marker + verb)
   * @param {string} text - Full sentence text
   * @param {Object} doc - Compromise NLP document
   * @returns {boolean} True if sentence is imperative
   */
  _isImperativeSentence(text, doc) {
    const trimmed = text.trim();
    // Questions are not imperatives
    if (trimmed.endsWith('?')) return false;

    // ENH-003: Polite imperative markers that can precede the verb
    const politeMarkers = ['please', 'kindly', 'just'];

    // Get the words of the sentence
    const words = trimmed.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, '').toLowerCase());
    if (words.length === 0) return false;

    let firstWord = words[0];
    let verbIndex = 0;

    // Skip polite markers to find the main verb
    if (politeMarkers.includes(firstWord)) {
      if (words.length < 2) return false;
      firstWord = words[1];
      verbIndex = 1;
    }

    // Check if first word is a verb (base form) by looking at Compromise's analysis
    // Also check: no subject pronoun or noun before the first verb
    const nouns = doc.nouns().out('array');

    // If the sentence starts with a noun/pronoun before the verb, it's not imperative
    // Simple heuristic: if the first word is a known subject pronoun or the first noun
    // appears at position 0, it has a subject
    const subjectPronouns = ['i', 'you', 'he', 'she', 'it', 'we', 'they',
                             'who', 'what', 'which', 'that', 'this', 'these', 'those'];
    if (subjectPronouns.includes(firstWord)) return false;

    // Check if first word appears to be a noun (starts with capital in non-initial position doesn't help here)
    // Instead: check if the first token is tagged as a verb by Compromise
    const terms = doc.json()[0]?.terms || [];
    if (terms.length <= verbIndex) return false;

    const verbTerm = terms[verbIndex];
    const verbTags = verbTerm?.tags || [];
    // Compromise tags can be array of strings or object with boolean values
    const tagList = Array.isArray(verbTags) ? verbTags : Object.keys(verbTags);

    // Compromise tags: check if the word is tagged as Verb
    const isVerbWord = tagList.some(t => t === 'Verb' || t === 'Infinitive' || t === 'Imperative');

    if (!isVerbWord) return false;

    // Additional: the first word should NOT be tagged as a Noun (e.g., "Report" could be noun or verb)
    // If it's ONLY a verb tag (not also noun), it's more likely imperative
    // But if it has both Verb and Noun tags, check if a determiner follows (not imperative)
    // For now, trust that verb-initial + no subject pronoun = imperative
    return true;
  }

  /**
   * Determine CCO act type from verb infinitive
   *
   * Phase 3: Now supports selectional restrictions - if direct object type
   * is provided, uses it to disambiguate verb sense.
   *
   * @param {string} infinitive - Verb infinitive form
   * @param {Object} [context] - Optional context for selectional restrictions
   * @param {string} [context.directObjectType] - BFO/CCO type of direct object
   * @returns {string} CCO act type IRI
   */
  _determineActType(infinitive, context = {}) {
    const lowerInf = infinitive.toLowerCase().trim();

    // Phase 3: Apply selectional restrictions if direct object type available
    if (context.directObjectType) {
      const restrictedType = this._applySelectionalRestrictions(
        lowerInf,
        context.directObjectType
      );
      if (restrictedType) {
        return restrictedType;
      }
    }

    // Check for known mappings
    if (VERB_TO_CCO_MAPPINGS[lowerInf]) {
      return VERB_TO_CCO_MAPPINGS[lowerInf];
    }

    return VERB_TO_CCO_MAPPINGS['_default'];
  }

  /**
   * Apply selectional restrictions based on verb and direct object type
   *
   * Phase 3: Verb sense disambiguation based on what type of thing is
   * being acted upon.
   *
   * @param {string} verb - Verb infinitive (lowercase)
   * @param {string} objectType - BFO/CCO type of direct object
   * @returns {string|null} Specialized act type or null if no restriction applies
   * @private
   */
  _applySelectionalRestrictions(verb, objectType) {
    // First check config loader for domain-specific overrides
    if (this.configLoader && this.configLoader.isConfigLoaded()) {
      const category = this._getOntologicalCategory(objectType);
      const configOverride = this.configLoader.getVerbOverride(verb, category);
      if (configOverride) {
        return configOverride;
      }
    }

    // Check core selectional restrictions
    const restrictions = SELECTIONAL_RESTRICTIONS[verb];
    if (!restrictions) {
      return null; // No restrictions for this verb
    }

    // Determine ontological category of direct object
    const category = this._getOntologicalCategory(objectType);

    // Map category to restriction key
    const categoryToKey = {
      'occurrent': 'objectIsOccurrent',
      'continuant': 'objectIsContinuant',
      'gdc': 'objectIsGDC',
      'person': 'objectIsPerson'
    };

    const restrictionKey = categoryToKey[category];
    if (restrictionKey && restrictions[restrictionKey]) {
      return restrictions[restrictionKey];
    }

    // TD-007: Return default if available, otherwise null
    if (restrictions.default) {
      return restrictions.default;
    }

    return null;
  }

  /**
   * Get ontological category from a BFO/CCO type
   *
   * @param {string} type - BFO/CCO type IRI
   * @returns {string} Category: 'occurrent', 'continuant', 'gdc', 'person', or 'unknown'
   * @private
   */
  _getOntologicalCategory(type) {
    // Check direct mapping
    if (TYPE_TO_CATEGORY[type]) {
      return TYPE_TO_CATEGORY[type];
    }

    // Heuristic fallbacks based on type name patterns
    const lowerType = type.toLowerCase();

    // Occurrents (processes/acts)
    if (lowerType.includes('act') || lowerType.includes('process') ||
        lowerType.includes('event') || lowerType.includes('bfo_0000015')) {
      return 'occurrent';
    }

    // Persons
    if (lowerType.includes('person') || lowerType.includes('patient') ||
        lowerType.includes('physician') || lowerType.includes('nurse') ||
        lowerType.includes('agent')) {
      return 'person';
    }

    // GDC (information entities)
    if (lowerType.includes('information') || lowerType.includes('document') ||
        lowerType.includes('bfo_0000031')) {
      return 'gdc';
    }

    // Default to continuant (physical things)
    return 'continuant';
  }

  /**
   * Get the direct object type from entities near the verb
   *
   * Phase 3: Finds the entity immediately after the verb and returns
   * its denotesType for selectional restriction matching.
   *
   * @param {number} verbOffset - Character offset of verb in text
   * @param {Array} entities - Available entities (Tier 1 referents)
   * @returns {string|null} Direct object's denotesType or null
   * @private
   */
  _getDirectObjectType(verbOffset, entities) {
    if (!entities || entities.length === 0) {
      return null;
    }

    // Filter to only Tier 1 DiscourseReferents
    const referents = entities.filter(e =>
      e['@type'] && e['@type'].includes('tagteam:DiscourseReferent')
    );

    if (referents.length === 0) {
      return null;
    }

    // Find entities after the verb
    const entitiesAfter = referents.filter(entity => {
      const entityStart = this._getEntityStart(entity);
      return entityStart > verbOffset;
    });

    if (entitiesAfter.length === 0) {
      return null;
    }

    // Get the closest entity after the verb (likely direct object)
    const directObject = entitiesAfter.reduce((closest, entity) => {
      const entityStart = this._getEntityStart(entity);
      const closestStart = this._getEntityStart(closest);
      return entityStart < closestStart ? entity : closest;
    });

    // Return its denotesType
    return directObject['tagteam:denotesType'] || null;
  }

  /**
   * Detect deontic modality from verb data and text
   *
   * Phase 6.4: Enhanced to detect both auxiliary-based modals
   * and lexical deontic markers.
   *
   * @param {Object} verbData - Compromise verb data
   * @param {string} [text] - Full text for lexical marker detection
   * @returns {Object} Detection result { modality, markers, confidence, deonticType }
   */
  _detectModality(verbData, text = '') {
    const result = {
      modality: null,
      markers: [],
      confidence: 0,
      deonticType: null
    };

    const auxiliary = (verbData.auxiliary || '').toLowerCase().trim();

    // 1. Check auxiliary-based modality (highest confidence)
    if (auxiliary) {
      // Check for known modality mappings
      if (MODALITY_MAPPINGS[auxiliary]) {
        result.modality = MODALITY_MAPPINGS[auxiliary];
        result.markers.push({ type: 'auxiliary', text: auxiliary });
        result.confidence = 0.9;
      } else {
        // Check for compound modals (e.g., "have to")
        for (const [modal, modality] of Object.entries(MODALITY_MAPPINGS)) {
          if (auxiliary.includes(modal)) {
            result.modality = modality;
            result.markers.push({ type: 'auxiliary', text: modal });
            result.confidence = 0.85;
            break;
          }
        }
      }
    }

    // 2. Check lexical deontic markers if text provided
    if (text) {
      const lexicalResult = this._detectLexicalDeonticMarkers(text);
      // Use lexical result if no auxiliary detected or lexical has higher confidence
      if (lexicalResult.modality && (!result.modality || lexicalResult.confidence > result.confidence)) {
        result.modality = lexicalResult.modality;
        result.markers = result.markers.concat(lexicalResult.markers);
        result.confidence = Math.max(result.confidence, lexicalResult.confidence);
      }
    }

    // 3. Add deontic type classification
    if (result.modality && MODALITY_TO_DEONTIC_TYPE[result.modality]) {
      result.deonticType = MODALITY_TO_DEONTIC_TYPE[result.modality];
    }

    // Return just the modality for backward compatibility
    // The enhanced info is available via _detectModalityEnhanced
    return result.modality;
  }

  /**
   * Detect deontic modality with full result object
   *
   * Phase 6.4: Returns complete detection result including markers and confidence.
   *
   * @param {Object} verbData - Compromise verb data
   * @param {string} [text] - Full text for lexical marker detection
   * @returns {Object} { modality, markers, confidence, deonticType }
   */
  _detectModalityEnhanced(verbData, text = '') {
    const result = {
      modality: null,
      markers: [],
      confidence: 0,
      deonticType: null
    };

    const auxiliary = (verbData.auxiliary || '').toLowerCase().trim();

    // 1. Check auxiliary-based modality
    if (auxiliary) {
      if (MODALITY_MAPPINGS[auxiliary]) {
        result.modality = MODALITY_MAPPINGS[auxiliary];
        result.markers.push({ type: 'auxiliary', text: auxiliary });
        result.confidence = 0.9;
      } else {
        for (const [modal, modality] of Object.entries(MODALITY_MAPPINGS)) {
          if (auxiliary.includes(modal)) {
            result.modality = modality;
            result.markers.push({ type: 'auxiliary', text: modal });
            result.confidence = 0.85;
            break;
          }
        }
      }
    }

    // 2. Check lexical deontic markers
    if (text) {
      const lexicalResult = this._detectLexicalDeonticMarkers(text);
      if (lexicalResult.modality && (!result.modality || lexicalResult.confidence > result.confidence)) {
        result.modality = lexicalResult.modality;
        result.markers = result.markers.concat(lexicalResult.markers);
        result.confidence = Math.max(result.confidence, lexicalResult.confidence);
      }
    }

    // 3. Add deontic type
    if (result.modality && MODALITY_TO_DEONTIC_TYPE[result.modality]) {
      result.deonticType = MODALITY_TO_DEONTIC_TYPE[result.modality];
    }

    return result;
  }

  /**
   * Detect lexical deontic markers in text
   *
   * Phase 6.4: Detects deontic markers like "entitled", "authorized", "forbidden"
   * that are not auxiliary modals but carry deontic meaning.
   *
   * @param {string} text - Text to analyze
   * @returns {Object} { modality, markers, confidence }
   * @private
   */
  _detectLexicalDeonticMarkers(text) {
    const result = {
      modality: null,
      markers: [],
      confidence: 0
    };

    if (!text) return result;

    const lowerText = text.toLowerCase();

    // Check each modality's lexical patterns
    for (const [modality, config] of Object.entries(LEXICAL_DEONTIC_MARKERS)) {
      // Check multi-word patterns first (higher specificity)
      for (const pattern of config.patterns || []) {
        const match = text.match(pattern);
        if (match) {
          result.modality = modality;
          result.markers.push({ type: 'lexical_pattern', text: match[0] });
          result.confidence = 0.85;
          return result; // Return on first match
        }
      }

      // Check single words
      for (const word of config.singleWords || []) {
        if (lowerText.includes(word)) {
          // Verify it's a word boundary match
          const wordPattern = new RegExp(`\\b${word}\\b`, 'i');
          if (wordPattern.test(text)) {
            result.modality = modality;
            result.markers.push({ type: 'lexical_word', text: word });
            result.confidence = 0.75;
            return result; // Return on first match
          }
        }
      }
    }

    return result;
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
   * Find the agent in a passive "by [agent]" phrase.
   * E.g., "The report was reviewed by the committee." → committee is agent.
   * @param {string} text - Full input text
   * @param {Object} verbOffset - Verb offset info
   * @param {Array} entities - All entities
   * @returns {Object|null} { iri, entity } or null if no "by" agent found
   */
  _findByAgent(text, verbOffset, entities) {
    if (!entities || entities.length === 0) return null;

    const lowerText = text.toLowerCase();
    const verbEnd = verbOffset.end || verbOffset.start + 10;

    // Look for "by" after the verb
    const byIndex = lowerText.indexOf(' by ', verbEnd - 1);
    if (byIndex === -1) return null;

    // Find an entity that starts after "by"
    const byPos = byIndex + 4; // position after "by "
    const referents = entities.filter(e =>
      e['@type'] && e['@type'].includes('tagteam:DiscourseReferent')
    );

    const linkMap = this.options.linkToTier2 ? this._buildTier2LinkMap(entities) : new Map();
    const resolveIRI = (referentIRI) => {
      if (this.options.linkToTier2 && linkMap.has(referentIRI)) {
        return linkMap.get(referentIRI);
      }
      return referentIRI;
    };

    for (const entity of referents) {
      const start = this._getEntityStart(entity);
      // Entity must start near the "by" position (within ~5 chars to account for determiners)
      if (start >= byPos - 1 && start <= byPos + 10) {
        return { iri: resolveIRI(entity['@id']), entity };
      }
    }

    return null;
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
        // Handle both object notation { '@id': iri } and plain string
        const isAbout = entity['cco:is_about'];
        const iri = typeof isAbout === 'object' ? isAbout['@id'] : isAbout;
        linkMap.set(entity['@id'], iri);
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

    // Temporal regions and qualities cannot be agents, patients, or primary participants
    const NON_AGENT_TYPES = ['bfo:BFO_0000038', 'bfo:BFO_0000008', 'bfo:BFO_0000019', 'bfo:BFO_0000016', 'cco:InformationContentEntity'];
    const isNonAgentEntity = (entity) => {
      const dt = entity['tagteam:denotesType'];
      return dt && NON_AGENT_TYPES.includes(dt);
    };

    // Find entities before and after verb (excluding temporal/quality entities from agent/patient)
    const entitiesBefore = [];
    const entitiesAfter = [];
    // Also track ALL entities (including non-agent types) for inference detection
    const allEntitiesBefore = [];
    const allEntitiesAfter = [];

    referents.forEach(entity => {
      const entityOffset = this._getEntityStart(entity);
      if (entityOffset < verbOffset) {
        allEntitiesBefore.push(entity);
        if (!isNonAgentEntity(entity)) entitiesBefore.push(entity);
      } else {
        allEntitiesAfter.push(entity);
        if (!isNonAgentEntity(entity)) entitiesAfter.push(entity);
      }
    });

    // Helper to resolve IRI (Tier 1 → Tier 2 if linkToTier2 enabled)
    const resolveIRI = (referentIRI) => {
      if (this.options.linkToTier2 && linkMap.has(referentIRI)) {
        return linkMap.get(referentIRI);
      }
      return referentIRI;
    };

    // Track the grammatical subject (closest entity before verb, ANY type) for inference detection
    if (allEntitiesBefore.length > 0) {
      const closestSubject = allEntitiesBefore.reduce((closest, entity) => {
        const entityEnd = this._getEntityEnd(entity);
        const closestEnd = this._getEntityEnd(closest);
        return entityEnd > closestEnd ? entity : closest;
      });
      links.subjectEntity = closestSubject;
      links.subjectIRI = resolveIRI(closestSubject['@id']);
    }

    // Agent is typically the closest entity before the verb (excluding non-agent types)
    if (entitiesBefore.length > 0) {
      // Get the closest one to the verb
      const closestBefore = entitiesBefore.reduce((closest, entity) => {
        const entityEnd = this._getEntityEnd(entity);
        const closestEnd = this._getEntityEnd(closest);
        return entityEnd > closestEnd ? entity : closest;
      });
      links.agent = resolveIRI(closestBefore['@id']);
      links.agentEntity = closestBefore; // Preserve for animacy checking
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
      links.patientEntity = closestAfter; // Preserve for inference target
    }

    // Track closest entity after verb (ANY type) for inference target
    if (allEntitiesAfter.length > 0) {
      const closestObject = allEntitiesAfter.reduce((closest, entity) => {
        const entityStart = this._getEntityStart(entity);
        const closestStart = this._getEntityStart(closest);
        return entityStart < closestStart ? entity : closest;
      });
      links.objectEntity = closestObject;
      links.objectIRI = resolveIRI(closestObject['@id']);
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
    let actualityStatus = this._determineActualityStatus(
      actInfo.modality,
      actInfo.negation,
      actInfo.tense
    );

    // Control verb override: infinitive complements are Prescribed (not yet realized)
    if (actInfo.actualityOverride) {
      actualityStatus = actInfo.actualityOverride;
    }

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

    // Add control verb reference if this is an infinitive complement
    if (actInfo.controlVerb) {
      node['tagteam:controlVerb'] = actInfo.controlVerb;
    }

    // Add modality if present
    if (actInfo.modality) {
      node['tagteam:modality'] = actInfo.modality;
    }

    // Phase 6.4: Add deontic type for Hohfeldian classification
    if (actInfo.deonticType) {
      node['tagteam:deonticType'] = actInfo.deonticType;
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
    // Use object notation with @id for JSON-LD compliance
    if (actInfo.links.agent) {
      node['cco:has_agent'] = { '@id': actInfo.links.agent };
    }

    if (actInfo.links.patient) {
      node['cco:affects'] = { '@id': actInfo.links.patient };
    }

    if (actInfo.links.participants && actInfo.links.participants.length > 0) {
      node['bfo:has_participant'] = actInfo.links.participants.map(p => ({ '@id': p }));
    }

    return node;
  }

  /**
   * Create an InformationContentEntity node for inanimate-agent inference verbs.
   * Phase 7.0 Story 3: "Blood sugar levels suggest diabetes" produces an
   * Inference/ClinicalFinding ICE instead of an IntentionalAct with inanimate agent.
   *
   * @param {Object} actInfo - Act information (same shape as _createIntentionalAct input)
   * @returns {Object} InformationContentEntity node
   * @private
   */
  _createInferenceNode(actInfo) {
    const cleanVerb = actInfo.infinitive.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const iri = this.graphBuilder
      ? this.graphBuilder.generateIRI(actInfo.infinitive, 'Inference', actInfo.offset)
      : `inst:Inference_${cleanVerb}_${actInfo.offset}`;

    // Determine subtype based on verb
    const verb = actInfo.infinitive.toLowerCase();
    const subtype = (verb === 'suggest' || verb === 'imply' || verb === 'point')
      ? 'tagteam:Inference'
      : 'tagteam:ClinicalFinding';

    const node = {
      '@id': iri,
      '@type': ['cco:InformationContentEntity', subtype, 'owl:NamedIndividual'],
      'rdfs:label': `Inference from ${actInfo.links.agentEntity
        ? (actInfo.links.agentEntity['rdfs:label'] || 'source')
        : 'source'}`,
      'tagteam:sourceText': actInfo.text,
      'tagteam:startPosition': actInfo.offset,
      'tagteam:endPosition': actInfo.offset + actInfo.text.length,
      'tagteam:detection_method': 'selectional_retype',
      'tagteam:original_verb': actInfo.infinitive
    };

    // Link to the inanimate entity (the measurement/quality that "suggests")
    if (actInfo.links.agent) {
      node['cco:is_about'] = { '@id': actInfo.links.agent };
    }

    // Link to the inferred entity (what is being suggested)
    // Use patient if available, fall back to objectIRI (which includes quality entities)
    const inferredIRI = actInfo.links.patient || actInfo.links.objectIRI;
    if (inferredIRI) {
      node['tagteam:supports_inference'] = { '@id': inferredIRI };
    }

    return node;
  }

  /**
   * Check if an agent entity is inanimate (not a person/organization)
   * @param {Object} entity - DiscourseReferent entity
   * @returns {boolean} True if inanimate
   * @private
   */
  _isInanimateAgent(entity) {
    if (!entity) return false;
    const dt = entity['tagteam:denotesType'];
    // Persons and organizations are animate agents
    if (dt === 'cco:Person' || dt === 'cco:GroupOfPersons' || dt === 'cco:Organization') {
      return false;
    }
    // Artifacts, qualities, material entities are inanimate
    return true;
  }

  /**
   * ENH-003: Get or create the implicit "you" entity for imperative sentences.
   *
   * When an imperative sentence has no explicit subject (e.g., "Submit the report"),
   * the addressee "you" is the implicit agent. This method creates a synthetic
   * Tier 2 Person entity representing the implicit "you".
   *
   * The entity is cached and reused across multiple imperatives in the same text,
   * ensuring a single "you" entity is shared (BFO principle: one entity per referent).
   *
   * @returns {Object} Implicit "you" Tier 2 Person entity
   * @private
   */
  _getOrCreateImplicitYou() {
    // Reuse existing implicit "you" if already created
    if (this._implicitYouEntity) {
      return this._implicitYouEntity;
    }

    // Generate IRI for the implicit "you" entity
    const iri = this.graphBuilder
      ? this.graphBuilder.generateIRI('you', 'Person', 0)
      : 'inst:Person_You_implicit';

    // Create Tier 2 Person entity for implicit "you"
    // ENH-003: Include all required properties for a proper Tier 2 entity
    this._implicitYouEntity = {
      '@id': iri,
      '@type': ['cco:Person', 'owl:NamedIndividual'],
      'rdfs:label': 'you',
      'tagteam:denotesType': 'cco:Person',
      'tagteam:referentialStatus': 'deictic',  // "you" refers deictically to addressee
      'tagteam:isImplicit': true,
      'tagteam:implicitReason': 'imperative_addressee'
    };

    return this._implicitYouEntity;
  }

  /**
   * ENH-003: Reset implicit "you" entity tracking.
   * Called at the start of processing new text to ensure fresh state.
   * @private
   */
  _resetImplicitYou() {
    this._implicitYouEntity = null;
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

  /**
   * Set the domain config loader for verb overrides
   *
   * Phase 2: When a config loader is set, verb sense can be overridden
   * based on the ontological category of the direct object (selectional
   * restrictions to be implemented in Phase 3).
   *
   * @param {Object|null} configLoader - DomainConfigLoader instance or null to clear
   */
  setConfigLoader(configLoader) {
    this.configLoader = configLoader;
  }

  /**
   * Detect sentence-level deontic patterns
   *
   * Phase 6.4: Some deontic patterns aren't captured by verb extraction because:
   * - The main verb is missed (e.g., "shall disclose" only extracts "shall")
   * - The verb is ambiguous with noun (e.g., "delegates", "grants")
   * - The pattern uses adjectives (e.g., "is exempt from", "is entitled to")
   *
   * This method detects these patterns and creates appropriate act nodes.
   *
   * @param {string} text - Input text
   * @param {Array} entities - Available entities
   * @returns {Object|null} IntentionalAct node or null
   * @private
   */
  _detectSentenceLevelDeontic(text, entities) {
    if (!text) return null;

    // Define sentence-level patterns with their deontic type and verb extraction
    const patterns = [
      // Prohibition patterns
      { pattern: /\bshall\s+not\s+(\w+)/i, modality: 'prohibition', verbGroup: 1 },
      { pattern: /\bmust\s+not\s+(\w+)/i, modality: 'prohibition', verbGroup: 1 },

      // Claim/Right patterns
      { pattern: /\b(has|have)\s+the\s+right\s+to\s+(\w+)/i, modality: 'claim', verbGroup: 2 },
      { pattern: /\b(has|have)\s+a\s+right\s+to\s+(\w+)/i, modality: 'claim', verbGroup: 2 },
      { pattern: /\b(is|are)\s+entitled\s+to\s+(\w+)/i, modality: 'claim', verbGroup: 2 },

      // Power patterns - verb-based
      { pattern: /\bdelegates?\s+(authority|power|responsibility)/i, modality: 'power', verb: 'delegate' },
      { pattern: /\bgrants?\s+(permission|authority|access)/i, modality: 'power', verb: 'grant' },
      { pattern: /\bconfers?\s+(the\s+)?(right|authority|power)/i, modality: 'power', verb: 'confer' },
      { pattern: /\b(is|are)\s+authorized\s+to\s+(\w+)/i, modality: 'power', verbGroup: 2 },
      { pattern: /\b(is|are)\s+empowered\s+to\s+(\w+)/i, modality: 'power', verbGroup: 2 },
      { pattern: /\bempowers?\s+(\w+)/i, modality: 'power', verb: 'empower' },

      // Immunity patterns
      { pattern: /\b(is|are)\s+exempt\s+from/i, modality: 'immunity', verb: 'exempt' },
      { pattern: /\b(is|are)\s+protected\s+from/i, modality: 'immunity', verb: 'protect' },
      { pattern: /\b(is|are)\s+immune\s+(from|to)/i, modality: 'immunity', verb: 'immunize' },

      // Enhanced prohibition
      { pattern: /\b(is|are)\s+forbidden\s+(to|from)/i, modality: 'prohibition', verb: 'forbid' },
      { pattern: /\b(is|are)\s+prohibited\s+from/i, modality: 'prohibition', verb: 'prohibit' }
    ];

    for (const p of patterns) {
      const match = text.match(p.pattern);
      if (match) {
        // Extract the verb
        let verb = p.verb;
        if (p.verbGroup && match[p.verbGroup]) {
          verb = match[p.verbGroup];
        }

        // Get offset
        const offset = match.index || 0;

        // Create act node
        return this._createIntentionalAct({
          text: match[0],
          infinitive: verb || match[0],
          offset,
          actType: 'cco:IntentionalAct',
          modality: p.modality,
          deonticType: MODALITY_TO_DEONTIC_TYPE[p.modality] || null,
          negation: false,
          tense: { tense: 'present', form: 'simple', aspect: 'simple' },
          links: this._linkToEntities(text, match[0], offset, entities)
        });
      }
    }

    return null;
  }
}

module.exports = ActExtractor;
