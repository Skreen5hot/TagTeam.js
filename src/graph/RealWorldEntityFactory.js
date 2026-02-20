/**
 * RealWorldEntityFactory.js
 *
 * Creates Tier 2 "Real-World" entities (cco:Person, cco:Artifact, cco:Organization)
 * from Tier 1 DiscourseReferent nodes.
 *
 * Phase 4 Two-Tier Architecture (v2.2 spec):
 * - Tier 1 (ICE): DiscourseReferent - what the text says
 * - Tier 2 (IC): Person/Artifact - the real-world entity being described
 *
 * @module graph/RealWorldEntityFactory
 * @version 4.0.0-phase4
 */

const crypto = require('crypto');

/**
 * Entity type mappings from keywords to CCO types
 * Used to determine the appropriate Tier 2 type
 */
const TIER2_TYPE_MAPPINGS = {
  // Maps from denotesType value to Tier 2 class
  'cco:Person': 'cco:Person',
  'cco:GroupOfPersons': 'cco:Person', // Individual persons from group
  'cco:Artifact': 'cco:Artifact',
  'cco:BodyPart': 'cco:Artifact', // Organs treated as artifacts in allocation context
  'cco:Organization': 'cco:Organization',
  'cco:GeopoliticalEntity': 'cco:GeopoliticalEntity', // Cities, countries, states
  'cco:Facility': 'cco:Facility', // Buildings, datacenters, offices
  'bfo:BFO_0000040': 'cco:Artifact', // Material entity defaults to artifact

  // Temporal Regions (Phase 7.0 — not artifacts)
  'bfo:BFO_0000038': 'bfo:BFO_0000038', // One-Dimensional Temporal Region (durations)
  'bfo:BFO_0000008': 'bfo:BFO_0000008', // Temporal Region (relative expressions)

  // Qualities (Phase 7.0 — symptoms, not artifacts)
  'bfo:BFO_0000019': 'bfo:BFO_0000019',  // Quality (symptoms, physiological states)

  // Dispositions (Phase 7.1 — diseases per OGMS/BFO)
  'bfo:BFO_0000016': 'bfo:BFO_0000016',  // Disposition (diseases)

  // Pronoun-derived types (Phase 7.1 — IEE pronoun mapping)
  'bfo:BFO_0000004': 'bfo:BFO_0000004',  // Independent Continuant (for "it")
  'bfo:BFO_0000027': 'bfo:BFO_0000027',  // Object Aggregate (for plural "they")
  'bfo:BFO_0000001': 'bfo:BFO_0000001',  // Entity (for demonstratives "this/that")

  // Information Content Entities (abstract propositional content)
  'cco:InformationContentEntity': 'cco:InformationContentEntity'
};

/**
 * Process type mappings - these create Process nodes instead of Artifacts
 * Processes are occurrents (things that happen) not continuants (things that exist)
 */
const PROCESS_TYPE_MAPPINGS = {
  'cco:ActOfCare': 'cco:ActOfCare',
  'cco:ActOfMedicalTreatment': 'cco:ActOfMedicalTreatment',
  'cco:ActOfSurgery': 'cco:ActOfSurgery',
  'cco:ActOfMedicalProcedure': 'cco:ActOfMedicalProcedure',
  'cco:ActOfExamination': 'cco:ActOfExamination',
  'cco:ActOfDiagnosis': 'cco:ActOfDiagnosis',
  'cco:ActOfService': 'cco:ActOfService',
  'cco:ActOfAssistance': 'cco:ActOfAssistance',
  'cco:ActOfIntervention': 'cco:ActOfIntervention',
  'cco:ActOfCommunication': 'cco:ActOfCommunication',
  'cco:ActOfRehabilitation': 'cco:ActOfRehabilitation',
  'cco:ActOfResuscitation': 'cco:ActOfResuscitation',
  'bfo:BFO_0000015': 'bfo:BFO_0000015' // Generic BFO Process
};

/**
 * Keywords that suggest person type
 */
const PERSON_KEYWORDS = [
  'doctor', 'physician', 'nurse', 'patient', 'person', 'man', 'woman',
  'child', 'parent', 'mother', 'father', 'family', 'staff', 'worker',
  'professional', 'specialist', 'surgeon', 'therapist', 'caregiver'
];

/**
 * Keywords that suggest organization type
 */
const ORG_KEYWORDS = [
  'hospital', 'clinic', 'department', 'unit', 'organization', 'institution',
  'company', 'firm', 'agency', 'board', 'committee', 'council', 'team'
];

/**
 * Factory for creating Tier 2 real-world entities
 */
class RealWorldEntityFactory {
  /**
   * Create a new RealWorldEntityFactory
   * @param {Object} options - Configuration options
   * @param {Object} [options.graphBuilder] - SemanticGraphBuilder instance for IRI generation
   * @param {string} [options.documentIRI] - IRI of the source document/IBE for scoped IRIs
   * @param {string} [options.sessionId] - Session ID for scoped IRIs (alternative to documentIRI)
   * @param {Object} [options.lemmatizer] - Lemmatizer instance for morphological reduction
   */
  constructor(options = {}) {
    this.options = options;
    this.graphBuilder = options.graphBuilder || null;
    this.documentIRI = options.documentIRI || null;
    this.sessionId = options.sessionId || null;
    this.lemmatizer = options.lemmatizer || null;

    // Cache for deduplication within a parse session
    this.entityCache = new Map();
  }

  /**
   * Create Tier 2 entities from an array of DiscourseReferent nodes
   *
   * @param {Array<Object>} referents - Array of DiscourseReferent nodes
   * @param {Object} [options] - Creation options
   * @param {string} [options.documentIRI] - Override document IRI
   * @param {boolean} [options.includeProvenance=true] - Include provenance properties
   * @returns {Object} Result object containing:
   *   - tier2Entities: Array of Tier 2 nodes
   *   - linkMap: Map from referent IRI to Tier 2 entity IRI
   *
   * @example
   * const factory = new RealWorldEntityFactory({ documentIRI: 'inst:IBE_123' });
   * const { tier2Entities, linkMap } = factory.createFromReferents(referents);
   */
  createFromReferents(referents, options = {}) {
    const tier2Entities = [];
    const linkMap = new Map();

    const docIRI = options.documentIRI || this.documentIRI;
    const includeProvenance = options.includeProvenance !== false;

    for (const referent of referents) {
      // Determine Tier 2 type
      const tier2Type = this._determineTier2Type(referent);

      if (!tier2Type) {
        // Skip if we can't determine a valid Tier 2 type
        continue;
      }

      // Generate Tier 2 entity
      const tier2Entity = this._createTier2Entity(referent, tier2Type, {
        documentIRI: docIRI,
        includeProvenance
      });

      // Check cache for existing entity with same IRI
      const existingIRI = this.entityCache.get(tier2Entity['@id']);
      if (existingIRI) {
        // Use existing entity IRI
        linkMap.set(referent['@id'], existingIRI);
      } else {
        // Add new entity
        tier2Entities.push(tier2Entity);
        this.entityCache.set(tier2Entity['@id'], tier2Entity['@id']);
        linkMap.set(referent['@id'], tier2Entity['@id']);
      }
    }

    return { tier2Entities, linkMap };
  }

  /**
   * Create a single Tier 2 entity from a DiscourseReferent
   *
   * @param {Object} referent - DiscourseReferent node
   * @param {Object} [options] - Creation options
   * @returns {Object|null} Tier 2 entity node or null if cannot create
   */
  createFromReferent(referent, options = {}) {
    const tier2Type = this._determineTier2Type(referent);

    if (!tier2Type) {
      return null;
    }

    return this._createTier2Entity(referent, tier2Type, options);
  }

  /**
   * Check if a denotesType is a process type (occurrent rather than continuant)
   * @param {string} denotesType - The denotesType value
   * @returns {boolean} True if it's a process type
   * @private
   */
  _isProcessType(denotesType) {
    return PROCESS_TYPE_MAPPINGS.hasOwnProperty(denotesType);
  }

  /**
   * Determine the Tier 2 type for a referent
   *
   * BFO/CCO compliance: Distinguishes between:
   * - Continuants (objects that persist): cco:Person, cco:Artifact, cco:Organization
   * - Occurrents (processes that happen): cco:ActOfCare, cco:ActOfMedicalTreatment, etc.
   *
   * @param {Object} referent - DiscourseReferent node
   * @returns {string|null} Tier 2 type IRI or null
   * @private
   */
  _determineTier2Type(referent) {
    // First check denotesType if present
    const denotesType = referent['tagteam:denotesType'];

    // Check if it's a process type (pass through as-is)
    if (denotesType && this._isProcessType(denotesType)) {
      return PROCESS_TYPE_MAPPINGS[denotesType];
    }

    // Check continuant type mappings
    if (denotesType && TIER2_TYPE_MAPPINGS[denotesType]) {
      return TIER2_TYPE_MAPPINGS[denotesType];
    }

    // Fall back to label-based detection using head noun (last content word).
    // This prevents modifiers from triggering false positives, e.g.,
    // "patient medication" should NOT match Person via "patient".
    const label = (referent['rdfs:label'] || '').toLowerCase();
    const words = label.replace(/^(the|a|an)\s+/i, '').split(/\s+/).filter(w => w.length > 1);
    const headNoun = words.length > 0 ? words[words.length - 1] : label;

    // Check head noun for person keywords
    for (const keyword of PERSON_KEYWORDS) {
      if (headNoun === keyword) {
        return 'cco:Person';
      }
    }

    // Check head noun for organization keywords
    for (const keyword of ORG_KEYWORDS) {
      if (headNoun === keyword) {
        return 'cco:Organization';
      }
    }

    // Default to Artifact for physical entities
    return 'cco:Artifact';
  }

  /**
   * Create a Tier 2 entity node
   * @param {Object} referent - Source DiscourseReferent
   * @param {string} tier2Type - The Tier 2 type (cco:Person, etc.)
   * @param {Object} options - Creation options
   * @returns {Object} Tier 2 entity node
   * @private
   */
  _createTier2Entity(referent, tier2Type, options = {}) {
    const label = referent['rdfs:label'] || 'entity';
    const normalizedLabel = this._normalizeLabel(label);
    const docIRI = options.documentIRI || this.documentIRI;
    const includeProvenance = options.includeProvenance !== false;

    // Generate document-scoped IRI (v2.2 spec)
    const iri = this._generateTier2IRI(normalizedLabel, tier2Type, docIRI);

    // Build the Tier 2 node
    const typeLabel = tier2Type.replace('cco:', '');
    const node = {
      '@id': iri,
      '@type': [tier2Type, 'owl:NamedIndividual'],
      'rdfs:label': normalizedLabel
    };

    // Add provenance properties (v2.2)
    if (includeProvenance) {
      node['tagteam:instantiated_at'] = new Date().toISOString();
      if (docIRI) {
        node['tagteam:instantiated_by'] = docIRI;
      }
    }

    // ENH-015: Copy introducing preposition from referent for role mapping
    if (referent['tagteam:introducingPreposition']) {
      node['tagteam:introducingPreposition'] = referent['tagteam:introducingPreposition'];
    }

    // ENH-001: Copy type information from referent for consistency
    if (referent['tagteam:denotesType']) {
      node['tagteam:denotesType'] = referent['tagteam:denotesType'];
    }
    if (referent['tagteam:typeRefinedBy']) {
      node['tagteam:typeRefinedBy'] = referent['tagteam:typeRefinedBy'];
    }

    return node;
  }

  /**
   * Generate a document-scoped IRI for a Tier 2 entity
   *
   * v2.2 spec: Tier 2 IRIs include document/session scope to prevent
   * accidental cross-document co-reference.
   *
   * @param {string} normalizedLabel - Normalized entity label
   * @param {string} tier2Type - The Tier 2 type
   * @param {string} [documentIRI] - Document IRI for scoping
   * @returns {string} Generated IRI
   * @private
   */
  _generateTier2IRI(normalizedLabel, tier2Type, documentIRI) {
    // Build hash input: label + type + document scope (v2.2)
    const scopeId = documentIRI || this.sessionId || 'default';
    const hashInput = `${normalizedLabel}|${tier2Type}|${scopeId}`;

    // Generate SHA-256 hash
    const hash = crypto
      .createHash('sha256')
      .update(hashInput)
      .digest('hex');

    // Take first 12 characters (v2.2 spec)
    const hashSuffix = hash.substring(0, 12);

    // Clean label for IRI
    const cleanLabel = normalizedLabel
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('_')
      .replace(/[^a-zA-Z0-9_]/g, '');

    // Extract type name without namespace
    const typeLabel = tier2Type.replace('cco:', '');

    return `inst:${typeLabel}_${cleanLabel}_${hashSuffix}`;
  }

  /**
   * Normalize a label for entity matching
   * @param {string} label - Raw label
   * @returns {string} Normalized label
   * @private
   */
  _normalizeLabel(label) {
    // Remove determiners and clean up
    const determiners = ['the', 'a', 'an', 'this', 'that', 'these', 'those'];

    // Modal adjectives — epistemic status belongs to the ICE, not the entity
    const modalAdjectives = [
      'possible', 'likely', 'probable', 'suspected', 'potential',
      'presumed', 'apparent', 'alleged', 'uncertain', 'questionable'
    ];

    let normalized = label.toLowerCase().trim();

    // Remove leading determiner
    const words = normalized.split(/\s+/);
    if (words.length > 1 && determiners.includes(words[0])) {
      words.shift();
    }

    // Remove leading modal adjectives (e.g., "possible diabetes" → "diabetes")
    while (words.length > 1 && modalAdjectives.includes(words[0])) {
      words.shift();
    }

    // Remove trailing punctuation
    normalized = words.join(' ').replace(/[.,;:!?]+$/, '');

    // Lemmatize the head noun (e.g., "safety reports" → "safety report")
    if (this.lemmatizer) {
      normalized = this.lemmatizer.lemmatizePhrase(normalized);
    }

    return normalized;
  }

  /**
   * Update referents with is_about links to their Tier 2 entities
   *
   * @param {Array<Object>} referents - DiscourseReferent nodes to update
   * @param {Map<string, string>} linkMap - Map from referent IRI to Tier 2 IRI
   * @returns {Array<Object>} Updated referent nodes
   */
  linkReferentsToTier2(referents, linkMap) {
    return referents.map(referent => {
      const tier2IRI = linkMap.get(referent['@id']);
      if (tier2IRI) {
        return {
          ...referent,
          'cco:is_about': { '@id': tier2IRI }
        };
      }
      return referent;
    });
  }

  /**
   * Clear the entity cache (for new parse sessions)
   */
  clearCache() {
    this.entityCache.clear();
  }

  /**
   * Set the document IRI for scoping
   * @param {string} documentIRI - Document/IBE IRI
   */
  setDocumentIRI(documentIRI) {
    this.documentIRI = documentIRI;
  }

  /**
   * Set the graph builder for IRI generation fallback
   * @param {Object} graphBuilder - SemanticGraphBuilder instance
   */
  setGraphBuilder(graphBuilder) {
    this.graphBuilder = graphBuilder;
  }
}

module.exports = RealWorldEntityFactory;
