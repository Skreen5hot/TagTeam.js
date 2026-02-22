/**
 * RealWorldEntityFactory.js
 *
 * Creates Tier 2 "Real-World" entities (Person, Artifact, Organization)
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
 * BFO opaque IRI → human-readable label mapping.
 * Used to generate valid IRI local names from BFO types
 * (BFO_0000001 → Entity, not bfo:BFO_0000001 which contains invalid colons).
 */
const BFO_IRI_LABELS = {
  'Entity': 'Entity',
  'IndependentContinuant': 'IndependentContinuant',
  'TemporalRegion': 'TemporalRegion',
  'Process': 'Process',
  'Disposition': 'Disposition',
  'Quality': 'Quality',
  'Role': 'Role',
  'ObjectAggregate': 'ObjectAggregate',
  'OneDimensionalTemporalRegion': 'OneDimTemporalRegion',
  'MaterialEntity': 'MaterialEntity',
};

/**
 * Convert a tier2Type IRI to a human-readable label for use in instance IRIs.
 * Handles BFO opaque IRIs via lookup table, strips namespace prefix for CCO/other types.
 * @param {string} tier2Type - The type IRI (e.g., 'Entity', 'Person')
 * @returns {string} Human-readable label (e.g., 'Entity', 'Person')
 */
function _typeToLabel(tier2Type) {
  if (BFO_IRI_LABELS[tier2Type]) return BFO_IRI_LABELS[tier2Type];
  return tier2Type.replace(/^[a-z]+:/, '');
}

/**
 * Entity type mappings from keywords to CCO types
 * Used to determine the appropriate Tier 2 type
 */
const TIER2_TYPE_MAPPINGS = {
  // Maps from denotesType value to Tier 2 class
  'Person': 'Person',
  'Agent': 'Agent', // Agent (groups, collectives)
  'Artifact': 'Artifact',
  'Organization': 'Organization',
  'GeopoliticalOrganization': 'GeopoliticalOrganization', // Cities, countries, states
  'Facility': 'Facility', // Buildings, datacenters, offices
  'MaterialEntity': 'Artifact', // Material entity defaults to artifact

  // Temporal Regions (Phase 7.0 — not artifacts)
  'OneDimensionalTemporalRegion': 'OneDimensionalTemporalRegion', // One-Dimensional Temporal Region (durations)
  'TemporalRegion': 'TemporalRegion', // Temporal Region (relative expressions)

  // Qualities (Phase 7.0 — symptoms, not artifacts)
  'Quality': 'Quality',  // Quality (symptoms, physiological states)

  // Dispositions (Phase 7.1 — diseases per OGMS/BFO)
  'Disposition': 'Disposition',  // Disposition (diseases)

  // Pronoun-derived types (Phase 7.1 — IEE pronoun mapping)
  'IndependentContinuant': 'IndependentContinuant',  // Independent Continuant (for "it")
  'ObjectAggregate': 'ObjectAggregate',  // Object Aggregate (for plural "they")
  'Entity': 'Entity',  // Entity (for demonstratives "this/that")
  // NOTE: bfo:Entity (prefixed form) intentionally NOT mapped here.
  // When denotesType is bfo:Entity (generic/unclassified), we want keyword
  // fallback to refine the type (e.g., "doctor" → Person). The default
  // at the end of _determineTier2Type() already returns bfo:BFO_0000001.

  // Information Content Entities (abstract propositional content)
  'InformationContentEntity': 'InformationContentEntity'
};

/**
 * Process type mappings — all processes map to bfo:Process (BFO_0000015, verified).
 * Specific act sub-typing is the knowledge graph's responsibility, not the parser's.
 */
const PROCESS_TYPE_MAPPINGS = {
  'Process': 'Process',
  'Process': 'Process',
  'ActOfCommunication': 'ActOfCommunication',  // VERIFIED (ont00000402)
  'IntentionalAct': 'IntentionalAct'           // VERIFIED (ont00000228)
};

/**
 * Keywords that suggest person type
 */
const PERSON_KEYWORDS = [
  // Medical
  'doctor', 'physician', 'nurse', 'patient', 'surgeon', 'therapist',
  'pharmacist', 'paramedic', 'caregiver',
  // General
  'person', 'man', 'woman', 'child', 'parent', 'mother', 'father',
  // Professional/occupational (synced from EntityExtractor ENTITY_TYPE_MAPPINGS)
  'engineer', 'teacher', 'lawyer', 'architect', 'scientist', 'researcher',
  'analyst', 'manager', 'director', 'officer', 'agent', 'inspector',
  'technician', 'programmer', 'developer', 'designer', 'consultant',
  'administrator', 'admin', 'supervisor', 'coordinator', 'specialist',
  'professor', 'student', 'worker', 'employee', 'staff', 'member',
  'user', 'client', 'customer', 'owner', 'author', 'editor',
  'reviewer', 'auditor', 'judge', 'witness', 'suspect', 'victim',
  'soldier', 'pilot', 'driver', 'chef', 'artist', 'musician',
  'athlete', 'guard', 'professional'
];

/**
 * Keywords that suggest organization type
 */
const ORG_KEYWORDS = [
  'hospital', 'clinic', 'department', 'unit', 'organization', 'institution',
  'company', 'firm', 'agency', 'board', 'committee', 'council', 'team',
  // Synced from EntityExtractor ENTITY_TYPE_MAPPINGS
  'foundation', 'administration', 'association', 'corporation',
  'commission', 'panel'
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
      const { type: tier2Type, basis: typeBasis } = this._determineTier2Type(referent);

      if (!tier2Type) {
        // Skip if we can't determine a valid Tier 2 type
        continue;
      }

      // Generate Tier 2 entity
      const tier2Entity = this._createTier2Entity(referent, tier2Type, {
        documentIRI: docIRI,
        includeProvenance,
        typeBasis
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
    const { type: tier2Type, basis: typeBasis } = this._determineTier2Type(referent);

    if (!tier2Type) {
      return null;
    }

    return this._createTier2Entity(referent, tier2Type, { ...options, typeBasis });
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
   * - Continuants (objects that persist): Person, Artifact, Organization
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
      return { type: PROCESS_TYPE_MAPPINGS[denotesType], basis: 'type-mapping' };
    }

    // Check continuant type mappings
    if (denotesType && TIER2_TYPE_MAPPINGS[denotesType]) {
      return { type: TIER2_TYPE_MAPPINGS[denotesType], basis: 'type-mapping' };
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
        return { type: 'Person', basis: 'keyword' };
      }
    }

    // Check head noun for organization keywords
    for (const keyword of ORG_KEYWORDS) {
      if (headNoun === keyword) {
        return { type: 'Organization', basis: 'keyword' };
      }
    }

    // Default to bfo:Entity (BFO root) — honest admission of incomplete classification.
    // Artifact was incorrectly specific; bfo:Entity is maximally general and safe.
    return { type: 'Entity', basis: 'default' };
  }

  /**
   * Create a Tier 2 entity node
   * @param {Object} referent - Source DiscourseReferent
   * @param {string} tier2Type - The Tier 2 type (Person, etc.)
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
    // §9.5: GEN/UNIV subjects produce owl:Class, not owl:NamedIndividual
    const genericityCategory = referent['tagteam:genericityCategory'];
    const isClassLevel = genericityCategory === 'GEN' || genericityCategory === 'UNIV';
    const node = {
      '@id': iri,
      '@type': [tier2Type, isClassLevel ? 'owl:Class' : 'owl:NamedIndividual'],
      'rdfs:label': normalizedLabel
    };

    // Propagate genericity annotations to Tier 2
    if (genericityCategory) {
      node['tagteam:genericityCategory'] = genericityCategory;
    }

    // Type resolution basis (how the Tier 2 type was determined)
    if (options.typeBasis) {
      node['tagteam:typeBasis'] = options.typeBasis;
    }

    // Class nomination pattern: GEN/UNIV entities signal unresolved class references
    if (isClassLevel) {
      node['tagteam:classNominationStatus'] = 'unresolved';
      node['tagteam:nominatedClassLabel'] = this._canonicalClassLabel(normalizedLabel);
      node['tagteam:nominationBasis'] = referent['tagteam:genericityBasis'] || 'unknown';
      node['tagteam:requiresOntologyResolution'] = true;
    }

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

    // Extract type name without namespace (handles both cco: and bfo: prefixes)
    const typeLabel = _typeToLabel(tier2Type);

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

    // Detect if the head word is an acronym BEFORE lowercasing
    const origWords = label.trim().split(/\s+/);
    const origLastWord = origWords[origWords.length - 1];
    const headIsAcronym = /^[A-Z]{2,}$/.test(origLastWord);

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
    // Skip acronyms — "DHS" is not a plural of "DH"
    if (this.lemmatizer && !headIsAcronym) {
      normalized = this.lemmatizer.lemmatizePhrase(normalized);
    }

    return normalized;
  }

  /**
   * Create a singular, capitalized canonical class label from a normalized label.
   * "doctors" → "Doctor", "safety reports" → "Safety Report"
   * @param {string} label - Normalized label (already lowercased, determiner-stripped)
   * @returns {string} Canonical class label
   * @private
   */
  _canonicalClassLabel(label) {
    let words = label.trim().split(/\s+/);
    if (words.length === 0) return label;

    // Strip leading quantifiers — "all employees" → "employees", not "All Employee"
    const quantifiers = ['all', 'every', 'each', 'no', 'some', 'any', 'most'];
    while (words.length > 1 && quantifiers.includes(words[0])) {
      words.shift();
    }

    // Lemmatize the last word (head noun) to singular form
    const lastWord = words[words.length - 1];
    if (this.lemmatizer) {
      const lemma = this.lemmatizer.lemmatize(lastWord, 'NNS').lemma;
      words[words.length - 1] = lemma;
    }

    // Capitalize each word
    return words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
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
          'is_about': { '@id': tier2IRI }
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
