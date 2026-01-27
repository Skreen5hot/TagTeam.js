/**
 * EntityExtractor.js
 *
 * Extracts entities from text using Compromise NLP and creates
 * tagteam:DiscourseReferent nodes for the semantic graph.
 *
 * Phase 4 Two-Tier Architecture (v2.2 spec):
 * - Creates Tier 1 DiscourseReferent nodes
 * - Integrates with RealWorldEntityFactory for Tier 2 entities
 * - Links Tier 1 → Tier 2 via cco:is_about
 *
 * @module graph/EntityExtractor
 * @version 4.0.0-phase4
 */

const nlp = require('compromise');
const RealWorldEntityFactory = require('./RealWorldEntityFactory');

/**
 * Scarcity markers that indicate limited resources
 */
const SCARCITY_MARKERS = [
  'last', 'only', 'sole', 'single', 'remaining', 'final',
  'scarce', 'limited', 'rare', 'few', 'shortage', 'deficit'
];

/**
 * Quantity words mapped to numeric values
 */
const QUANTITY_WORDS = {
  'one': 1, 'a': 1, 'an': 1, 'single': 1, 'sole': 1,
  'two': 2, 'both': 2, 'pair': 2, 'couple': 2,
  'three': 3, 'four': 4, 'five': 5, 'six': 6,
  'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'several': 3, 'few': 2, 'many': 10, 'multiple': 3
};

/**
 * Temporal unit words — when the last word of a noun phrase is one of these,
 * and a quantity/number precedes it, the entity is a Temporal Region (BFO:0000038).
 */
const TEMPORAL_UNITS = {
  'day': 'day', 'days': 'day',
  'week': 'week', 'weeks': 'week',
  'month': 'month', 'months': 'month',
  'year': 'year', 'years': 'year',
  'hour': 'hour', 'hours': 'hour',
  'minute': 'minute', 'minutes': 'minute',
  'second': 'second', 'seconds': 'second'
};

/**
 * Relative temporal expressions — standalone words/phrases that denote
 * a temporal region without an explicit quantity.
 */
const RELATIVE_TEMPORAL_TERMS = [
  'yesterday', 'today', 'tomorrow',
  'recently', 'previously', 'currently',
  'now', 'then', 'earlier', 'later',
  'overnight', 'midday', 'midnight',
  // Days of the week
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

/**
 * Relative temporal phrase prefixes — when combined with a temporal unit
 * (e.g., "last week", "next month"), denote an unspecified temporal region.
 */
const RELATIVE_TEMPORAL_PREFIXES = ['last', 'next', 'past', 'previous', 'this', 'coming'];

/**
 * Symptom and physiological quality terms.
 * These are BFO Qualities (bfo:BFO_0000019) that inhere in material entities,
 * NOT artifacts. Extensible — add domain terms as needed.
 *
 * Single-word terms are matched against rootNoun.
 * Multi-word terms are matched against the full noun phrase.
 */
const SYMPTOM_SINGLE_WORDS = new Set([
  // Pain
  'pain', 'ache', 'headache', 'migraine', 'soreness',
  // Respiratory
  'cough', 'wheeze', 'congestion', 'dyspnea',
  // Systemic
  'fever', 'chills', 'fatigue', 'malaise', 'weakness', 'lethargy',
  // Gastrointestinal
  'nausea', 'vomiting', 'diarrhea', 'constipation', 'bloating',
  // Neurological
  'dizziness', 'vertigo', 'numbness', 'tingling', 'tremor', 'seizure',
  // Dermatological
  'rash', 'itching', 'hives', 'swelling', 'bruising',
  // Cardiovascular
  'palpitations', 'tachycardia', 'bradycardia', 'hypertension', 'hypotension',
  // Other
  'bleeding', 'inflammation', 'infection', 'edema', 'insomnia',
  'anxiety', 'depression', 'stress', 'confusion', 'delirium',
]);

/**
 * Disease terms — these are Dispositions (bfo:BFO_0000016) per OGMS/BFO,
 * NOT Qualities. Diseases are predispositions to undergo pathological processes.
 */
const DISEASE_TERMS = new Set([
  'diabetes', 'asthma', 'pneumonia', 'bronchitis', 'anemia',
  'arthritis', 'epilepsy', 'cancer', 'stroke',
  'hypertension', 'infection', 'disease', 'disorder', 'syndrome',
  'condition', 'illness', 'malaria', 'tuberculosis', 'hepatitis',
  'meningitis', 'influenza', 'measles', 'mumps', 'cholera',
  'leukemia', 'lymphoma', 'dementia', 'alzheimer', 'parkinson',
  'cirrhosis', 'fibrosis', 'sepsis', 'gangrene'
]);

/**
 * Evaluative quality terms — nouns that denote judgments, assessments, or
 * evaluative qualities of events/entities. These are BFO Qualities (bfo:BFO_0000019)
 * because they describe an attribute/status of something, not a physical object.
 * "The launch was a disaster" → "disaster" is a quality predicated of "launch".
 */
const EVALUATIVE_QUALITY_TERMS = new Set([
  'disaster', 'catastrophe', 'calamity', 'fiasco', 'debacle',
  'success', 'failure', 'triumph', 'victory', 'defeat',
  'miracle', 'tragedy', 'achievement', 'accomplishment',
  'masterpiece', 'mess', 'blunder', 'mistake', 'error',
  'breakthrough', 'setback', 'improvement', 'decline',
  'crisis', 'emergency', 'priority', 'necessity'
]);

/**
 * Multi-word symptom phrases matched against the full noun text.
 */
const SYMPTOM_PHRASES = [
  'chest pain', 'back pain', 'abdominal pain', 'joint pain', 'muscle pain',
  'sore throat', 'runny nose', 'shortness of breath',
  'loss of appetite', 'loss of consciousness', 'difficulty breathing',
  'blood pressure', 'heart rate', 'blood sugar',
  'weight loss', 'weight gain', 'night sweats', 'cold sweats',
  'blurred vision', 'double vision', 'hearing loss',
  'mental health', 'mood changes', 'panic attack'
];

/**
 * Adjective modifiers that do NOT change a symptom into a non-symptom.
 * "persistent cough" is still a symptom. "cough medicine" is not.
 */
const SYMPTOM_ADJECTIVE_MODIFIERS = new Set([
  'persistent', 'chronic', 'acute', 'severe', 'mild', 'moderate',
  'intermittent', 'constant', 'recurrent', 'sudden', 'gradual',
  'worsening', 'improving', 'unexplained', 'possible'
]);

/**
 * Entity type mappings to CCO/BFO types (for denotesType property)
 */
const ENTITY_TYPE_MAPPINGS = {
  // Persons/Roles
  'doctor': 'cco:Person',
  'physician': 'cco:Person',
  'nurse': 'cco:Person',
  'patient': 'cco:Person',
  'family': 'cco:GroupOfPersons',
  'person': 'cco:Person',
  'man': 'cco:Person',
  'woman': 'cco:Person',
  'child': 'cco:Person',
  'parent': 'cco:Person',
  'mother': 'cco:Person',
  'father': 'cco:Person',
  // Professional/occupational roles (the person bearing the role)
  'engineer': 'cco:Person',
  'teacher': 'cco:Person',
  'lawyer': 'cco:Person',
  'architect': 'cco:Person',
  'scientist': 'cco:Person',
  'researcher': 'cco:Person',
  'analyst': 'cco:Person',
  'manager': 'cco:Person',
  'director': 'cco:Person',
  'officer': 'cco:Person',
  'agent': 'cco:Person',
  'inspector': 'cco:Person',
  'technician': 'cco:Person',
  'programmer': 'cco:Person',
  'developer': 'cco:Person',
  'designer': 'cco:Person',
  'consultant': 'cco:Person',
  'administrator': 'cco:Person',
  'supervisor': 'cco:Person',
  'coordinator': 'cco:Person',
  'specialist': 'cco:Person',
  'professor': 'cco:Person',
  'student': 'cco:Person',
  'worker': 'cco:Person',
  'employee': 'cco:Person',
  'staff': 'cco:Person',
  'member': 'cco:Person',
  'user': 'cco:Person',
  'client': 'cco:Person',
  'customer': 'cco:Person',
  'owner': 'cco:Person',
  'author': 'cco:Person',
  'editor': 'cco:Person',
  'reviewer': 'cco:Person',
  'auditor': 'cco:Person',
  'judge': 'cco:Person',
  'witness': 'cco:Person',
  'suspect': 'cco:Person',
  'victim': 'cco:Person',
  'soldier': 'cco:Person',
  'pilot': 'cco:Person',
  'driver': 'cco:Person',
  'chef': 'cco:Person',
  'artist': 'cco:Person',
  'musician': 'cco:Person',
  'athlete': 'cco:Person',
  'guard': 'cco:Person',

  // Medical Equipment/Artifacts (physical objects)
  'ventilator': 'cco:Artifact',
  'medication': 'cco:Artifact',
  'drug': 'cco:Artifact',
  'medicine': 'cco:Artifact',
  'equipment': 'cco:Artifact',
  'bed': 'cco:Artifact',
  'resource': 'cco:Artifact',
  'organ': 'cco:BodyPart',

  // Default
  '_default': 'bfo:BFO_0000040' // Material Entity
};

/**
 * Pronoun → BFO/CCO type mappings (IEE realist specification)
 *
 * Pronouns carry selectional presuppositions about their antecedent's ontological category:
 * - he/she/him/her/his → cco:Person (gendered personal pronouns presuppose person)
 * - I/me/my/we/us/our → cco:Person (1st person always human)
 * - you/your → cco:Person (2nd person always human)
 * - they/them/their → bfo:BFO_0000027 (Object Aggregate) when plural,
 *                      cco:Person when singular (context-dependent; default plural)
 * - it/its → bfo:BFO_0000004 (Independent Continuant — could be anything non-person)
 * - this/that/these/those → bfo:BFO_0000001 (Entity — maximally general demonstrative)
 */
const PRONOUN_TYPE_MAPPINGS = {
  // Gendered personal → Person
  'he': 'cco:Person',
  'she': 'cco:Person',
  'him': 'cco:Person',
  'her': 'cco:Person',
  'his': 'cco:Person',
  'himself': 'cco:Person',
  'herself': 'cco:Person',

  // 1st person → Person
  'i': 'cco:Person',
  'me': 'cco:Person',
  'my': 'cco:Person',
  'myself': 'cco:Person',
  'we': 'cco:Person',
  'us': 'cco:Person',
  'our': 'cco:Person',
  'ourselves': 'cco:Person',

  // 2nd person → Person
  'you': 'cco:Person',
  'your': 'cco:Person',
  'yourself': 'cco:Person',
  'yourselves': 'cco:Person',

  // 3rd person plural → Object Aggregate (group)
  'they': 'bfo:BFO_0000027',
  'them': 'bfo:BFO_0000027',
  'their': 'bfo:BFO_0000027',
  'themselves': 'bfo:BFO_0000027',

  // 3rd person neuter → Independent Continuant (non-person)
  'it': 'bfo:BFO_0000004',
  'its': 'bfo:BFO_0000004',
  'itself': 'bfo:BFO_0000004',

  // Demonstratives → Entity (maximally general)
  'this': 'bfo:BFO_0000001',
  'that': 'bfo:BFO_0000001',
  'these': 'bfo:BFO_0000001',
  'those': 'bfo:BFO_0000001'
};

/**
 * Domain-neutral ontological vocabulary
 *
 * These are universally applicable terms that map to BFO/CCO types without
 * requiring domain-specific configuration. They represent the core vocabulary
 * that TagTeam recognizes in any domain.
 *
 * Based on ONTOLOGICAL_ISSUES_2026_01_19.md v3.1 analysis.
 */
const ONTOLOGICAL_VOCABULARY = {
  // Occurrents (processes/events)
  'process': 'bfo:BFO_0000015',
  'event': 'bfo:BFO_0000015',
  'activity': 'bfo:BFO_0000015',
  'action': 'bfo:BFO_0000015',
  'service': 'bfo:BFO_0000015',      // Generic service (domain config specializes)
  'assistance': 'bfo:BFO_0000015',
  'intervention': 'bfo:BFO_0000015',
  // Zero-derivation nominalizations (verb→noun without suffix)
  'launch': 'bfo:BFO_0000015',
  'attack': 'bfo:BFO_0000015',
  'attempt': 'bfo:BFO_0000015',
  'collapse': 'bfo:BFO_0000015',
  'crash': 'bfo:BFO_0000015',
  'escape': 'bfo:BFO_0000015',
  'fight': 'bfo:BFO_0000015',
  'release': 'bfo:BFO_0000015',
  'search': 'bfo:BFO_0000015',
  'strike': 'bfo:BFO_0000015',
  'struggle': 'bfo:BFO_0000015',
  'surge': 'bfo:BFO_0000015',

  // Independent Continuants (objects)
  'person': 'cco:Person',
  'people': 'cco:Person',
  'human': 'cco:Person',
  'individual': 'cco:Person',
  'thing': 'bfo:BFO_0000040',
  'object': 'bfo:BFO_0000040',
  'item': 'bfo:BFO_0000040',
  'artifact': 'cco:Artifact',
  'device': 'cco:Artifact',
  'tool': 'cco:Artifact',
  'machine': 'cco:Artifact',

  // Generically Dependent Continuants (information entities)
  'document': 'bfo:BFO_0000031',
  'information': 'bfo:BFO_0000031',
  'data': 'bfo:BFO_0000031',
  'plan': 'bfo:BFO_0000031',
  'record': 'bfo:BFO_0000031',
  'report': 'bfo:BFO_0000031'
};

/**
 * Domain-specific process root words - DEPRECATED, will move to config in Phase 2
 *
 * TECHNICAL DEBT (TD-001): These medical-specific terms should be loaded from
 * config/medical.json instead of being hardcoded in core. Until Phase 2 is
 * complete, they remain here for backward compatibility.
 *
 * After Phase 2: This constant will be removed and replaced by DomainConfigLoader.
 */
const DOMAIN_PROCESS_WORDS = {
  // Medical services - TO BE MOVED TO config/medical.json
  'care': 'cco:ActOfCare',
  'treatment': 'cco:ActOfMedicalTreatment',
  'therapy': 'cco:ActOfMedicalTreatment',
  'surgery': 'cco:ActOfSurgery',
  'procedure': 'cco:ActOfMedicalProcedure',
  'examination': 'cco:ActOfExamination',
  'diagnosis': 'cco:ActOfDiagnosis',
  'consultation': 'cco:ActOfCommunication',
  'counseling': 'cco:ActOfCommunication',
  'rehabilitation': 'cco:ActOfRehabilitation',
  'resuscitation': 'cco:ActOfResuscitation'
};

/**
 * Nominalization suffixes that often indicate processes/events
 * Words ending in these are candidates for process detection
 */
const PROCESS_SUFFIXES = ['-tion', '-ment', '-ing', '-sis', '-ance', '-ence', '-ure', '-ery'];

/**
 * Physical/concrete object indicators - terms that suggest a material entity
 * When these are present, prefer Artifact classification
 */
const PHYSICAL_OBJECT_INDICATORS = [
  'machine', 'device', 'unit', 'bed', 'monitor', 'pump', 'tube', 'needle',
  'pill', 'tablet', 'bottle', 'bag', 'mask', 'gown', 'glove'
];

/**
 * Result noun exceptions - nominalizations ending in process suffixes that
 * ALWAYS denote products/entities rather than processes.
 *
 * These are NOT ambiguous - they are ALWAYS result nouns regardless of context.
 * "The medication" and "some medication" both refer to the drug, not a process.
 *
 * Based on ONTOLOGICAL_ISSUES_2026_01_19.md v3.1 analysis:
 * - ~30-40% of -tion words are result nouns, not process nouns
 * - These should be classified as Independent Continuants (IC) or GDC
 */
const UNAMBIGUOUS_RESULT_NOUNS = {
  // Physical products (IC - Artifact) - always the product, never the process
  'medication': 'cco:Artifact',
  'publication': 'cco:Artifact',
  'invention': 'cco:Artifact',
  'decoration': 'cco:Artifact',
  'illustration': 'cco:Artifact',
  'equipment': 'cco:Artifact',       // Physical tools/devices
  'instrument': 'cco:Artifact',      // Medical/scientific instrument
  'garment': 'cco:Artifact',         // Clothing item
  'pavement': 'cco:Artifact',        // Physical surface
  'monument': 'cco:Artifact',        // Physical structure
  'compartment': 'cco:Artifact',     // Physical container/section

  // Documents (GDC) - always the document, never the process
  'documentation': 'bfo:BFO_0000031',
  'registration': 'bfo:BFO_0000031',
  'certification': 'bfo:BFO_0000031',
  'specification': 'bfo:BFO_0000031',
  'notification': 'bfo:BFO_0000031',
  'recommendation': 'bfo:BFO_0000031',
  'regulation': 'bfo:BFO_0000031',     // The rule document
  'legislation': 'bfo:BFO_0000031',

  // Locations (IC) - always the place, never the process
  'location': 'bfo:BFO_0000040',
  'station': 'bfo:BFO_0000040',
  'position': 'bfo:BFO_0000040'        // Spatial position
};

/**
 * Ambiguous nominalizations - can be either process OR entity depending on context.
 * These need determiner-sensitive disambiguation:
 * - "the organization" → entity (the company)
 * - "organization of files" → process (the act of organizing)
 *
 * Default to entity type shown, but process reading possible with "of X" complement
 * or indefinite/bare noun in certain contexts.
 *
 * Phase 5.3.1: Added committee, board, council for proper Organization typing
 * per stakeholder feedback (these are agent-capable social entities).
 */
const AMBIGUOUS_NOMINALIZATIONS = {
  // Can be organization (entity) or organizing (process)
  'organization': 'cco:Organization',
  'foundation': 'cco:Organization',
  'administration': 'cco:Organization',
  'association': 'cco:Organization',
  'corporation': 'cco:Organization',
  'institution': 'cco:Organization',

  // Phase 5.3.1: Collective decision-making bodies (always Organizations when agents)
  // These are social entities that can perform intentional acts
  'committee': 'cco:Organization',
  'board': 'cco:Organization',
  'council': 'cco:Organization',
  'commission': 'cco:Organization',
  'panel': 'cco:Organization',
  'team': 'cco:Organization',

  // Can be the building (entity) or the act of building (process)
  'construction': 'cco:Artifact',
  'creation': 'cco:Artifact',
  'production': 'cco:Artifact',
  'installation': 'cco:Artifact'
};

/**
 * Combined result noun exceptions for backward compatibility
 * Used by _checkForProcessType to override suffix detection
 */
const RESULT_NOUN_EXCEPTIONS = {
  ...UNAMBIGUOUS_RESULT_NOUNS,
  ...AMBIGUOUS_NOMINALIZATIONS
};

/**
 * EntityExtractor class - extracts entities and creates DiscourseReferent nodes
 *
 * Two-Tier Architecture:
 * - Creates Tier 1 DiscourseReferent nodes from text
 * - Optionally creates Tier 2 Person/Artifact entities via RealWorldEntityFactory
 * - Links Tier 1 → Tier 2 via cco:is_about
 */
class EntityExtractor {
  /**
   * Create a new EntityExtractor
   * @param {Object} options - Configuration options
   * @param {Object} [options.graphBuilder] - SemanticGraphBuilder instance for IRI generation
   * @param {boolean} [options.createTier2=true] - Whether to create Tier 2 entities
   * @param {string} [options.documentIRI] - Document IRI for Tier 2 scoping
   */
  constructor(options = {}) {
    this.options = {
      createTier2: true,
      ...options
    };
    this.graphBuilder = options.graphBuilder || null;

    // Initialize RealWorldEntityFactory for Tier 2 creation
    this.tier2Factory = new RealWorldEntityFactory({
      graphBuilder: this.graphBuilder,
      documentIRI: options.documentIRI
    });
  }

  /**
   * Extract entities from text and return DiscourseReferent nodes
   *
   * Two-Tier Architecture (v2.2):
   * - Creates Tier 1 DiscourseReferent nodes
   * - Creates Tier 2 Person/Artifact entities (if createTier2 enabled)
   * - Links Tier 1 → Tier 2 via cco:is_about
   *
   * @param {string} text - Input text to analyze
   * @param {Object} [options] - Extraction options
   * @param {boolean} [options.createTier2] - Override Tier 2 creation setting
   * @param {string} [options.documentIRI] - Document IRI for Tier 2 scoping
   * @returns {Array<Object>} Array of nodes (Tier 1 referents + Tier 2 entities)
   *
   * @example
   * const extractor = new EntityExtractor();
   * const entities = extractor.extract("The doctor treats the patient");
   * // Returns array of DiscourseReferent nodes + cco:Person nodes
   */
  extract(text, options = {}) {
    const tier1Entities = [];

    // Update Tier 2 factory document IRI if provided
    if (options.documentIRI) {
      this.tier2Factory.setDocumentIRI(options.documentIRI);
    }

    // Parse with Compromise NLP
    const doc = nlp(text);

    // Extract nouns with their context
    const nouns = doc.nouns();

    nouns.forEach((noun, index) => {
      const nounText = noun.text();
      const nounJson = noun.json()[0] || {};
      const nounData = nounJson.noun || {};

      // Get the root noun (without determiner/adjectives)
      const rootNoun = nounData.root || nounText;

      // Skip non-entity nouns (like "here", "there", etc.)
      if (this._isNonEntityNoun(rootNoun)) {
        return;
      }

      // Get span offset
      const offset = this._getSpanOffset(text, nounText, index);

      // Use Compromise data for definiteness detection
      const definitenessInfo = this._detectDefiniteness(noun, nounText, text, nounData);

      // Detect scarcity from adjectives and context
      const scarcityInfo = this._detectScarcity(nounText, text, offset, nounData);

      // Detect quantity from Compromise and context
      const quantityInfo = this._detectQuantity(nounText, text, offset, nounData);

      // Check for temporal type using full noun phrase (needs quantity + unit together)
      const fullWords = nounText.toLowerCase().trim().split(/\s+/);
      const temporalType = this._checkForTemporalType(nounText.toLowerCase().trim(), fullWords);

      // Check for symptom/quality type using full noun phrase AND root noun
      const symptomType = !temporalType
        ? this._checkForSymptomType(nounText.toLowerCase().trim(), rootNoun.toLowerCase().trim())
        : null;

      // Determine entity type: temporal > symptom > standard matching
      const entityType = temporalType || symptomType || this._determineEntityType(rootNoun, {
        fullText: text,
        definitenessInfo: definitenessInfo
      });

      // Extract temporal unit if this is a temporal entity
      const temporalUnit = temporalType ? this._extractTemporalUnit(nounText) : null;

      // Determine referential status
      const referentialStatus = this._determineReferentialStatus(
        definitenessInfo,
        nounText,
        text,
        index
      );

      // Create DiscourseReferent node (use full noun phrase as label)
      const referent = this._createDiscourseReferent({
        text: nounText,
        rootNoun: rootNoun,
        offset,
        entityType,
        definiteness: definitenessInfo.definiteness,
        referentialStatus,
        scarcity: scarcityInfo,
        quantity: quantityInfo,
        temporalUnit: temporalUnit
      });

      tier1Entities.push(referent);
    });

    // Create Tier 2 entities and link via is_about (Two-Tier Architecture)
    const shouldCreateTier2 = options.createTier2 !== undefined
      ? options.createTier2
      : this.options.createTier2;

    if (shouldCreateTier2 && tier1Entities.length > 0) {
      const { tier2Entities, linkMap } = this.tier2Factory.createFromReferents(
        tier1Entities,
        { documentIRI: options.documentIRI }
      );

      // Add is_about links to Tier 1 referents
      const linkedReferents = this.tier2Factory.linkReferentsToTier2(tier1Entities, linkMap);

      // Return both Tier 1 (with is_about) and Tier 2 entities
      return [...linkedReferents, ...tier2Entities];
    }

    return tier1Entities;
  }

  /**
   * Check if noun is a non-entity word to skip
   * @param {string} noun - Noun text
   * @returns {boolean} True if should skip
   */
  _isNonEntityNoun(noun) {
    const nonEntityNouns = ['here', 'there', 'now', 'then', 'help', 'way', 'thing'];
    return nonEntityNouns.includes(noun.toLowerCase().trim());
  }

  /**
   * Detect definiteness from determiner
   * @param {Object} noun - Compromise noun object
   * @param {string} nounText - The noun text
   * @param {string} fullText - Full input text
   * @param {Object} nounData - Compromise noun metadata
   * @returns {Object} Definiteness info
   */
  _detectDefiniteness(noun, nounText, fullText, nounData = {}) {
    // Definite determiners
    const definiteMarkers = ['the', 'this', 'that', 'these', 'those', 'his', 'her', 'its', 'their', 'my', 'our', 'your'];

    // Indefinite determiners
    const indefiniteMarkers = ['a', 'an', 'some', 'any', 'each', 'every', 'no', 'another'];

    // First check Compromise's determiner data
    if (nounData.determiner) {
      const det = nounData.determiner.toLowerCase();
      if (definiteMarkers.includes(det)) {
        return { definiteness: 'definite', determiner: det };
      }
      if (indefiniteMarkers.includes(det)) {
        return { definiteness: 'indefinite', determiner: det };
      }
    }

    // Fallback: check text before noun for possessives (Compromise may not catch these)
    const lowerText = fullText.toLowerCase();
    const lowerNoun = nounText.toLowerCase();
    const nounIndex = lowerText.indexOf(lowerNoun);

    if (nounIndex > 0) {
      const beforeNoun = lowerText.substring(0, nounIndex).trim();
      const words = beforeNoun.split(/\s+/);
      const lastWord = words[words.length - 1];

      if (definiteMarkers.includes(lastWord)) {
        return { definiteness: 'definite', determiner: lastWord };
      }
      if (indefiniteMarkers.includes(lastWord)) {
        return { definiteness: 'indefinite', determiner: lastWord };
      }
    }

    // Default to indefinite if no determiner
    return { definiteness: 'indefinite', determiner: null };
  }

  /**
   * Detect scarcity markers near entity
   * @param {string} nounText - The noun text
   * @param {string} fullText - Full input text
   * @param {number} offset - Span offset
   * @param {Object} nounData - Compromise noun metadata
   * @returns {Object} Scarcity info
   */
  _detectScarcity(nounText, fullText, offset, nounData = {}) {
    // First check adjectives from Compromise
    if (nounData.adjectives && nounData.adjectives.length > 0) {
      for (const adj of nounData.adjectives) {
        const lowerAdj = adj.toLowerCase();
        if (SCARCITY_MARKERS.includes(lowerAdj)) {
          return { isScarce: true, marker: lowerAdj };
        }
      }
    }

    // Fallback: check context before noun
    const lowerText = fullText.toLowerCase();
    const lowerNoun = nounText.toLowerCase();

    const nounIndex = lowerText.indexOf(lowerNoun);
    if (nounIndex === -1) {
      return { isScarce: false, marker: null };
    }

    const contextStart = Math.max(0, nounIndex - 30);
    const beforeContext = lowerText.substring(contextStart, nounIndex);

    for (const marker of SCARCITY_MARKERS) {
      if (beforeContext.includes(marker)) {
        return { isScarce: true, marker };
      }
    }

    return { isScarce: false, marker: null };
  }

  /**
   * Detect quantity from context
   * @param {string} nounText - The noun text
   * @param {string} fullText - Full input text
   * @param {number} offset - Span offset
   * @param {Object} nounData - Compromise noun metadata
   * @returns {Object} Quantity info
   */
  _detectQuantity(nounText, fullText, offset, nounData = {}) {
    // First check Compromise's number data
    if (nounData.number !== null && nounData.number !== undefined) {
      return { quantity: nounData.number, quantifier: 'detected' };
    }

    // Check adjectives for implied quantity (last, only, single = 1)
    const impliedOneMarkers = ['last', 'only', 'sole', 'single', 'remaining', 'final'];
    if (nounData.adjectives && nounData.adjectives.length > 0) {
      for (const adj of nounData.adjectives) {
        if (impliedOneMarkers.includes(adj.toLowerCase())) {
          return { quantity: 1, quantifier: adj.toLowerCase() };
        }
      }
    }

    const lowerText = fullText.toLowerCase();
    const lowerNoun = nounText.toLowerCase();

    // Find noun position
    const nounIndex = lowerText.indexOf(lowerNoun);
    if (nounIndex === -1) {
      return { quantity: null, quantifier: null };
    }

    // Look for quantity word before noun
    const contextStart = Math.max(0, nounIndex - 20);
    const beforeContext = lowerText.substring(contextStart, nounIndex);
    const words = beforeContext.trim().split(/\s+/);

    // Check each word for quantity
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      if (QUANTITY_WORDS[word] !== undefined) {
        return { quantity: QUANTITY_WORDS[word], quantifier: word };
      }

      // Check for numeric digits
      if (/^\d+$/.test(word)) {
        return { quantity: parseInt(word, 10), quantifier: word };
      }
    }

    return { quantity: null, quantifier: null };
  }

  /**
   * Extract head noun from a noun phrase
   *
   * In English, the head noun is typically the rightmost noun in a compound.
   * e.g., "medication administration" → "administration" (head)
   *       "patient care plan" → "plan" (head)
   *
   * @param {string} nounPhrase - The noun phrase
   * @returns {string} The head noun
   * @private
   */
  _extractHeadNoun(nounPhrase) {
    const words = nounPhrase.toLowerCase().trim().split(/\s+/);
    return words[words.length - 1];
  }

  /**
   * Check if noun phrase refers to a process/service rather than a physical object
   *
   * Domain-Neutral Detection Order (ONTOLOGICAL_ISSUES_2026_01_19.md v3.1):
   * 0. Compound noun analysis → head noun determines type
   * 1. Physical object indicators → Artifact (override everything)
   * 2. Ontological vocabulary → BFO types (domain-neutral)
   * 3. Result noun exceptions → IC/GDC (override suffixes)
   * 4. Nominalization suffixes → BFO:Process (linguistic patterns - PRIMARY)
   * 5. Domain-specific words → CCO types (DEPRECATED - Phase 2 moves to config)
   *
   * Pattern Precedence (from critique):
   * 1. Verb selectional restrictions (Phase 3)
   * 2. Compound noun as unit - head noun determines type
   * 3. Head noun morphology - suffixes on head noun
   * 4. Modifier constraints - "physical documentation" override (TODO)
   * 5. Suffix heuristics
   * 6. Ontological vocabulary match
   * 7. Default
   *
   * @param {string} nounText - The noun text
   * @param {Object} [context] - Additional context for disambiguation
   * @param {string} [context.determiner] - Determiner if available
   * @returns {Object|null} Type info { isProcess, type } or null if not a process
   */
  _checkForProcessType(nounText, context = {}) {
    const lowerNoun = nounText.toLowerCase().trim();
    const words = lowerNoun.split(/\s+/);
    const lastWord = this._extractHeadNoun(lowerNoun); // Head noun determines type

    // Priority 1: Physical object indicators override everything
    for (const indicator of PHYSICAL_OBJECT_INDICATORS) {
      if (lowerNoun.includes(indicator)) {
        return null; // Not a process, let it fall through to artifact
      }
    }

    // Priority 2: Check ontological vocabulary (domain-neutral)
    // Handle both singular and common plural forms (service/services, activity/activities)
    for (const [term, type] of Object.entries(ONTOLOGICAL_VOCABULARY)) {
      // Match term or term+s or term with y→ies plural
      const pluralS = term + 's';
      const pluralIes = term.endsWith('y') ? term.slice(0, -1) + 'ies' : null;

      const matchesTerm = lastWord === term ||
                          lastWord === pluralS ||
                          (pluralIes && lastWord === pluralIes);

      if (matchesTerm) {
        // Check if it's an occurrent type
        if (type === 'bfo:BFO_0000015') {
          return { isProcess: true, type };
        }
        // Not a process (person, artifact, GDC) - return null to use other classification
        return null;
      }
    }

    // Priority 3: Check result noun exceptions (these override suffix detection)
    if (RESULT_NOUN_EXCEPTIONS[lastWord]) {
      // It's a result noun (product/entity), not a process
      return null;
    }

    // Priority 4: Domain-specific words from config loader (Phase 2)
    // Config loader takes precedence over suffix detection to allow domain-specific
    // type specialization (e.g., "surgery" → cco:ActOfSurgery instead of bfo:BFO_0000015)
    if (this.configLoader && this.configLoader.isConfigLoaded()) {
      const configType = this.configLoader.getProcessRootWord(lastWord);
      if (configType) {
        return { isProcess: true, type: configType };
      }

      // Also check the full phrase for multi-word matches
      const fullPhraseType = this.configLoader.getProcessRootWord(lowerNoun);
      if (fullPhraseType) {
        return { isProcess: true, type: fullPhraseType };
      }
    }

    // Priority 5: Nominalization suffixes - domain-neutral detection mechanism
    // This is the linguistic pattern approach when no config specialization matches
    for (const suffix of PROCESS_SUFFIXES) {
      const cleanSuffix = suffix.replace('-', '');
      if (lastWord.endsWith(cleanSuffix) && lastWord.length > cleanSuffix.length + 2) {
        // Has process suffix and not in exception list → Process
        return { isProcess: true, type: 'bfo:BFO_0000015' }; // BFO:Process
      }
    }

    // Priority 6: Deprecated domain process words (fallback when no config)
    // TD-001: These will be removed after Phase 2 migration is complete
    if (!this.configLoader || !this.configLoader.isConfigLoaded()) {
      for (const [rootWord, type] of Object.entries(DOMAIN_PROCESS_WORDS)) {
        const regex = new RegExp(`\\b${rootWord}\\b`, 'i');
        if (regex.test(lowerNoun)) {
          return { isProcess: true, type };
        }
      }
    }

    return null;
  }

  /**
   * Check if a word is a known result noun or physical entity
   * These are nominalizations that denote products/entities rather than processes.
   *
   * @param {string} word - Word to check
   * @returns {boolean} True if known result noun or physical entity
   */
  _isKnownPhysicalEntity(word) {
    // Use the RESULT_NOUN_EXCEPTIONS constant for comprehensive coverage
    return RESULT_NOUN_EXCEPTIONS.hasOwnProperty(word.toLowerCase());
  }

  /**
   * Check if a noun phrase denotes a temporal region.
   *
   * Detection rules:
   * 1. Quantity + temporal unit ("three days") → bfo:BFO_0000038 (1D Temporal Region)
   * 2. Numeric + temporal unit ("24 hours") → bfo:BFO_0000038
   * 3. Relative prefix + unit ("last week") → bfo:BFO_0000008 (Temporal Region)
   * 4. Standalone relative term ("yesterday") → bfo:BFO_0000008
   *
   * @param {string} lowerNoun - Lowercased noun text
   * @param {string[]} words - Words array
   * @returns {string|null} BFO temporal type IRI or null
   */
  _checkForTemporalType(lowerNoun, words) {
    const lastWord = words[words.length - 1];

    // Rule 1-2: quantity/number + temporal unit → 1D Temporal Region
    if (words.length >= 2 && TEMPORAL_UNITS[lastWord]) {
      const firstWord = words[0];
      if (QUANTITY_WORDS[firstWord] !== undefined || /^\d+$/.test(firstWord)) {
        return 'bfo:BFO_0000038'; // One-Dimensional Temporal Region
      }
    }

    // Rule 3: relative prefix + temporal unit → Temporal Region (unspecified)
    if (words.length >= 2 && TEMPORAL_UNITS[lastWord]) {
      if (RELATIVE_TEMPORAL_PREFIXES.includes(words[0])) {
        return 'bfo:BFO_0000008'; // Temporal Region
      }
    }

    // Rule 4: standalone relative temporal term
    if (words.length === 1 && RELATIVE_TEMPORAL_TERMS.includes(lastWord)) {
      return 'bfo:BFO_0000008'; // Temporal Region
    }

    return null;
  }

  /**
   * Extract temporal unit from a noun phrase if it is a temporal expression.
   * Used to annotate Tier 1 nodes with tagteam:unit.
   *
   * @param {string} nounText - The noun text
   * @returns {string|null} Normalized unit ("day", "week", etc.) or null
   */
  _extractTemporalUnit(nounText) {
    const words = nounText.toLowerCase().trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    return TEMPORAL_UNITS[lastWord] || null;
  }

  /**
   * Check if a noun phrase denotes a physiological symptom or quality.
   *
   * Detection rules:
   * 1. Full phrase matches a known multi-word symptom phrase ("chest pain", "shortness of breath")
   * 2. Root noun is a known single-word symptom ("cough", "fever", "nausea")
   * 3. Coordinated symptoms: "cough and fever" — check individual conjuncts
   *
   * @param {string} fullNounLower - Full noun phrase, lowercased
   * @param {string} rootNounLower - Root/head noun, lowercased
   * @returns {string|null} 'bfo:BFO_0000019' (Quality) or null
   */
  _checkForSymptomType(fullNounLower, rootNounLower) {
    // Rule 0: Disease terms → Disposition (bfo:BFO_0000016), NOT Quality
    // Per OGMS/BFO, diseases are dispositions to undergo pathological processes
    if (DISEASE_TERMS.has(rootNounLower)) {
      return 'bfo:BFO_0000016'; // Disposition
    }
    // Check head word of multi-word root for diseases
    const rootWordsForDisease = rootNounLower.split(/\s+/);
    if (rootWordsForDisease.length > 1) {
      const headForDisease = rootWordsForDisease[rootWordsForDisease.length - 1];
      if (DISEASE_TERMS.has(headForDisease)) {
        return 'bfo:BFO_0000016';
      }
    }

    // Rule 0b: Evaluative quality terms → Quality (bfo:BFO_0000019)
    // "disaster", "success", "failure" etc. are evaluative attributes, not artifacts
    if (EVALUATIVE_QUALITY_TERMS.has(rootNounLower)) {
      return 'bfo:BFO_0000019'; // Quality
    }

    // Rule 1: Multi-word phrase match (symptoms only)
    for (const phrase of SYMPTOM_PHRASES) {
      if (fullNounLower.includes(phrase)) {
        return 'bfo:BFO_0000019'; // Quality
      }
    }

    // Rule 2: Single-word root noun match
    if (SYMPTOM_SINGLE_WORDS.has(rootNounLower)) {
      return 'bfo:BFO_0000019';
    }

    // Rule 3: Strip adjective modifiers and re-check root
    const rootWords = rootNounLower.split(/\s+/);
    if (rootWords.length > 1) {
      const headWord = rootWords[rootWords.length - 1];
      if (SYMPTOM_SINGLE_WORDS.has(headWord)) {
        return 'bfo:BFO_0000019';
      }
    }

    // Rule 4: Coordinated nouns — "cough and fever"
    // Check individual conjuncts from the full phrase
    if (fullNounLower.includes(' and ')) {
      const conjuncts = fullNounLower.split(/\s+and\s+/);
      const allAreSymptoms = conjuncts.every(c => {
        const trimmed = c.trim();
        // Strip leading adjective modifiers
        const words = trimmed.split(/\s+/);
        const head = words[words.length - 1];
        // Check disease terms first
        if (DISEASE_TERMS.has(head)) return true;
        // Check single word symptoms
        if (SYMPTOM_SINGLE_WORDS.has(head)) return true;
        // Check multi-word
        for (const phrase of SYMPTOM_PHRASES) {
          if (trimmed.includes(phrase)) return true;
        }
        return false;
      });
      if (allAreSymptoms) {
        // If any conjunct is a disease, the whole phrase is a disposition
        const anyDisease = conjuncts.some(c => {
          const head = c.trim().split(/\s+/).pop();
          return DISEASE_TERMS.has(head);
        });
        return anyDisease ? 'bfo:BFO_0000016' : 'bfo:BFO_0000019';
      }
    }

    return null;
  }

  /**
   * Analyze noun phrase context for determiner-sensitive disambiguation
   *
   * Based on ONTOLOGICAL_ISSUES_2026_01_19.md v3.1:
   * - Definite determiner ("the X") → favors entity (IC) reading
   * - Indefinite determiner ("some X") → favors process (Occurrent) reading
   * - "X of Y" complement pattern → favors process reading
   * - Bare noun (no determiner) → favors process reading
   *
   * @param {string} nounText - The noun phrase text
   * @param {string} fullText - The full sentence for context
   * @param {Object} definitenessInfo - Definiteness info from _detectDefiniteness
   * @returns {Object} Context hints for disambiguation
   */
  _analyzeNounPhraseContext(nounText, fullText, definitenessInfo) {
    const result = {
      favorsEntity: false,
      favorsProcess: false,
      reason: null
    };

    const lowerFull = fullText.toLowerCase();
    const lowerNoun = nounText.toLowerCase();

    // Check for "X of Y" complement pattern (strongly favors process reading)
    // e.g., "the organization of files" = process, not entity
    const nounIndex = lowerFull.indexOf(lowerNoun);
    if (nounIndex !== -1) {
      const afterNoun = lowerFull.substring(nounIndex + lowerNoun.length).trim();
      if (afterNoun.startsWith('of ')) {
        result.favorsProcess = true;
        result.reason = 'of-complement';
        return result;
      }
    }

    // Check determiner
    if (definitenessInfo.definiteness === 'definite') {
      // "the administration" → entity reading (the organization)
      result.favorsEntity = true;
      result.reason = 'definite-determiner';
    } else if (definitenessInfo.determiner === null) {
      // Bare noun → process reading
      result.favorsProcess = true;
      result.reason = 'bare-noun';
    } else {
      // Indefinite → process reading
      result.favorsProcess = true;
      result.reason = 'indefinite-determiner';
    }

    return result;
  }

  /**
   * Determine entity type for denotesType property
   *
   * BFO/CCO compliance: Distinguishes between:
   * - Continuants (objects): cco:Person, cco:Artifact
   * - Occurrents (processes): cco:ActOfCare, cco:ActOfMedicalTreatment, etc.
   *
   * Uses determiner-sensitive disambiguation for ambiguous nominalizations.
   *
   * @param {string} nounText - The noun text
   * @param {Object} [context] - Additional context
   * @param {string} [context.fullText] - Full sentence for context analysis
   * @param {Object} [context.definitenessInfo] - Definiteness info
   * @returns {string} Entity type IRI
   */
  _determineEntityType(nounText, context = {}) {
    const lowerNoun = nounText.toLowerCase().trim();
    const words = lowerNoun.split(/\s+/);
    const lastWord = words[words.length - 1];

    // Priority -1: Pronoun type mapping (IEE realist specification)
    // Pronouns carry selectional presuppositions about ontological category
    if (words.length === 1 && PRONOUN_TYPE_MAPPINGS[lowerNoun]) {
      return PRONOUN_TYPE_MAPPINGS[lowerNoun];
    }

    // Priority 0: Compound noun analysis
    // If the noun phrase has multiple words, check if compound context favors process
    // e.g., "medication administration" → process (administering medication)
    //       "file organization" → process (organizing files)
    if (words.length > 1 && AMBIGUOUS_NOMINALIZATIONS[lastWord]) {
      // Check if any modifier word is a known entity type (suggests process reading)
      // "medication administration" - medication is artifact, so this is about administering it
      const modifiers = words.slice(0, -1);
      for (const modifier of modifiers) {
        // If modifier is a known entity/artifact, compound likely denotes process
        if (UNAMBIGUOUS_RESULT_NOUNS[modifier] ||
            ENTITY_TYPE_MAPPINGS[modifier] ||
            ['patient', 'file', 'data', 'drug', 'medication', 'document'].includes(modifier)) {
          return 'bfo:BFO_0000015'; // Process reading for compound
        }
      }
    }

    // Priority 1: Unambiguous result nouns - ALWAYS return the product type
    // "medication" is always the drug, "documentation" is always the document
    if (UNAMBIGUOUS_RESULT_NOUNS[lastWord]) {
      return UNAMBIGUOUS_RESULT_NOUNS[lastWord];
    }

    // Priority 2: Ambiguous nominalizations - use determiner-sensitive defaults
    // "organization" can be the company (entity) or organizing (process)
    if (AMBIGUOUS_NOMINALIZATIONS[lastWord] && context.definitenessInfo && context.fullText) {
      const nounContext = this._analyzeNounPhraseContext(
        nounText,
        context.fullText,
        context.definitenessInfo
      );

      if (nounContext.favorsProcess && nounContext.reason === 'of-complement') {
        // "organization of files" → process reading
        return 'bfo:BFO_0000015';
      }

      if (nounContext.favorsEntity) {
        // "the administration" → entity reading
        return AMBIGUOUS_NOMINALIZATIONS[lastWord];
      }

      // Bare/indefinite with ambiguous noun → default to entity (more common usage)
      // Note: v3.1 spec says default to process, but entity is safer for most cases
      return AMBIGUOUS_NOMINALIZATIONS[lastWord];
    }

    // Handle ambiguous nominalizations without context (fallback to entity reading)
    if (AMBIGUOUS_NOMINALIZATIONS[lastWord]) {
      return AMBIGUOUS_NOMINALIZATIONS[lastWord];
    }

    // Standard process detection (domain-neutral)
    const processCheck = this._checkForProcessType(lowerNoun, context);
    if (processCheck) {
      return processCheck.type;
    }

    // Check for known entity types (continuants)
    for (const [keyword, type] of Object.entries(ENTITY_TYPE_MAPPINGS)) {
      if (keyword === '_default') continue;
      if (lowerNoun.includes(keyword)) {
        return type;
      }
    }

    // Temporal Region detection
    // "three days" (quantity + temporal unit) → bfo:BFO_0000038 (1D Temporal Region)
    // "yesterday", "recently" → bfo:BFO_0000008 (Temporal Region)
    // "last week" (relative prefix + unit) → bfo:BFO_0000008
    const temporalType = this._checkForTemporalType(lowerNoun, words);
    if (temporalType) {
      return temporalType;
    }

    return ENTITY_TYPE_MAPPINGS['_default'];
  }

  /**
   * Determine referential status based on context
   * @param {Object} definitenessInfo - Definiteness info
   * @param {string} nounText - The noun text
   * @param {string} fullText - Full input text
   * @param {number} index - Entity index in sequence
   * @returns {string} Referential status
   */
  _determineReferentialStatus(definitenessInfo, nounText, fullText, index) {
    const lowerText = fullText.toLowerCase();
    const lowerNoun = nounText.toLowerCase().trim();

    // Modal adjectives on the noun itself → hypothetical
    // "possible diabetes", "suspected infection", "likely pneumonia"
    const modalAdjectives = ['possible', 'likely', 'probable', 'suspected', 'potential',
      'presumed', 'apparent', 'alleged', 'uncertain', 'questionable'];
    const firstWord = lowerNoun.split(/\s+/)[0];
    if (modalAdjectives.includes(firstWord)) {
      return 'hypothetical';
    }

    // Hypothetical markers in surrounding context
    const hypotheticalMarkers = ['if', 'would', 'could', 'might', 'suppose', 'assuming', 'hypothetically'];
    for (const marker of hypotheticalMarkers) {
      if (lowerText.includes(marker)) {
        // Check if marker is near this noun
        const nounIndex = lowerText.indexOf(nounText.toLowerCase());
        const markerIndex = lowerText.indexOf(marker);
        if (markerIndex !== -1 && markerIndex < nounIndex && (nounIndex - markerIndex) < 50) {
          return 'hypothetical';
        }
      }
    }

    // Anaphoric: pronouns or "the [noun]" when noun was mentioned before
    const pronouns = ['he', 'she', 'it', 'they', 'him', 'her', 'them', 'his', 'their'];
    if (pronouns.includes(nounText.toLowerCase())) {
      return 'anaphoric';
    }

    // If definite and not first mention, likely presupposed
    if (definitenessInfo.definiteness === 'definite') {
      return 'presupposed';
    }

    // Indefinite typically introduces new referent
    return 'introduced';
  }

  /**
   * Get span offset for entity in text
   * @param {string} fullText - Full input text
   * @param {string} entityText - Entity text
   * @param {number} index - Entity index
   * @returns {number} Character offset
   */
  _getSpanOffset(fullText, entityText, index) {
    const lowerText = fullText.toLowerCase();
    const lowerEntity = entityText.toLowerCase();

    let offset = 0;
    let searchStart = 0;

    // Find nth occurrence
    for (let i = 0; i <= index; i++) {
      const found = lowerText.indexOf(lowerEntity, searchStart);
      if (found === -1) break;
      offset = found;
      searchStart = found + 1;
    }

    return offset;
  }

  /**
   * Create a DiscourseReferent node (Tier 1)
   *
   * v2.2 spec properties:
   * - sourceText, startPosition, endPosition (instead of extracted_from_span, span_offset)
   * - denotesType kept for backward compatibility (deprecated; use is_about to Tier 2)
   *
   * @param {Object} entityInfo - Entity information
   * @returns {Object} DiscourseReferent node
   */
  _createDiscourseReferent(entityInfo) {
    // Generate IRI
    let iri;
    if (this.graphBuilder) {
      iri = this.graphBuilder.generateIRI(
        entityInfo.text,
        'DiscourseReferent',
        entityInfo.offset
      );
    } else {
      // Fallback simple IRI
      const cleanText = entityInfo.text.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      iri = `inst:${cleanText}_Referent_${entityInfo.offset}`;
    }

    // Calculate end position
    const endPosition = entityInfo.offset + entityInfo.text.length;

    // Build node with v2.2 properties
    const node = {
      '@id': iri,
      '@type': ['tagteam:DiscourseReferent', 'owl:NamedIndividual'],
      'rdfs:label': entityInfo.text,

      // v2.2 position properties
      'tagteam:sourceText': entityInfo.text,
      'tagteam:startPosition': entityInfo.offset,
      'tagteam:endPosition': endPosition,

      // Discourse properties
      'tagteam:definiteness': entityInfo.definiteness,
      'tagteam:referentialStatus': entityInfo.referentialStatus,

      // Legacy compatibility: denotesType (deprecated in v2.2, use is_about instead)
      // Kept for backward compatibility with existing tests
      'tagteam:denotesType': entityInfo.entityType
    };

    // Add scarcity if detected
    if (entityInfo.scarcity && entityInfo.scarcity.isScarce) {
      node['tagteam:is_scarce'] = true;
      node['tagteam:scarcity_marker'] = entityInfo.scarcity.marker;
    }

    // Add quantity if detected
    if (entityInfo.quantity && entityInfo.quantity.quantity !== null) {
      node['tagteam:quantity'] = entityInfo.quantity.quantity;
    }

    // Add temporal unit if this is a temporal entity
    if (entityInfo.temporalUnit) {
      node['tagteam:unit'] = entityInfo.temporalUnit;
    }

    return node;
  }

  /**
   * Set the graph builder for IRI generation
   * @param {Object} graphBuilder - SemanticGraphBuilder instance
   */
  setGraphBuilder(graphBuilder) {
    this.graphBuilder = graphBuilder;
    this.tier2Factory.setGraphBuilder(graphBuilder);
  }

  /**
   * Set the document IRI for Tier 2 entity scoping
   * @param {string} documentIRI - Document/IBE IRI
   */
  setDocumentIRI(documentIRI) {
    this.tier2Factory.setDocumentIRI(documentIRI);
  }

  /**
   * Get the Tier 2 factory for direct access
   * @returns {RealWorldEntityFactory} The factory instance
   */
  getTier2Factory() {
    return this.tier2Factory;
  }

  /**
   * Set the domain config loader for type specialization
   *
   * Phase 2: When a config loader is set, domain-specific process words
   * are loaded from the config instead of using the deprecated
   * DOMAIN_PROCESS_WORDS constant.
   *
   * @param {Object|null} configLoader - DomainConfigLoader instance or null to clear
   */
  setConfigLoader(configLoader) {
    this.configLoader = configLoader;
  }

  /**
   * Get domain-specific type from config loader
   *
   * @param {string} term - The term to look up
   * @param {string} bfoType - The BFO base type
   * @returns {string|null} Specialized type or null
   * @private
   */
  _getConfigSpecializedType(term, bfoType) {
    if (!this.configLoader || !this.configLoader.isConfigLoaded()) {
      return null;
    }

    // First check process root words (domain-specific terms like "care", "surgery")
    const processType = this.configLoader.getProcessRootWord(term);
    if (processType) {
      return processType;
    }

    // Then check type specializations for the BFO type
    return this.configLoader.getTypeSpecialization(bfoType, term);
  }
}

module.exports = EntityExtractor;
