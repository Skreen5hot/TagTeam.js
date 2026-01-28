/**
 * RoleDetector.js
 *
 * Detects BFO roles from acts and links them to entities.
 * Roles link entities (bearers) to acts (realizations).
 *
 * Phase 4 Two-Tier Architecture v2.4:
 * - PatientRole ONLY inheres in cco:Person (not artifacts)
 * - Artifacts use AffectedEntityRole or no role
 * - Roles only realize in Actual acts (not Prescribed/Planned)
 * - PatientRole assigned to ObjectAggregate members (v2.4)
 *
 * @module graph/RoleDetector
 * @version 4.0.0-phase4-v2.4
 */

const crypto = require('crypto');

/**
 * Extract IRI from a relation value (handles both string and object notation)
 * @param {string|Object} value - Relation value (IRI string or {`@id`: IRI})
 * @returns {string|null} The IRI string, or null if invalid
 */
function extractIRI(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value['@id']) return value['@id'];
  return null;
}

/**
 * Extract IRIs from an array of relation values
 * @param {Array} values - Array of relation values
 * @returns {Array<string>} Array of IRI strings
 */
function extractIRIs(values) {
  if (!values) return [];
  if (!Array.isArray(values)) return [extractIRI(values)].filter(Boolean);
  return values.map(extractIRI).filter(Boolean);
}

/**
 * Role type mappings based on relationship to act
 * Maps role positions to CCO/BFO role types
 *
 * IMPORTANT: PatientRole is ONLY for cco:Person entities (BFO/CCO constraint)
 * Artifacts do not bear PatientRole - they are affected but not patients
 */
const ROLE_TYPE_MAPPINGS = {
  // Agent roles (subject performing the act) - ONLY for Persons
  'agent': 'cco:AgentRole',
  'performer': 'cco:AgentRole',
  'actor': 'cco:AgentRole',

  // Patient roles (ONLY for Persons receiving care/treatment)
  'patient': 'cco:PatientRole',

  // ENH-015: Recipient role (for "to NP" prepositional phrases)
  'recipient': 'cco:RecipientRole',

  // Instrument roles (for artifacts used in acts)
  'instrument': 'cco:InstrumentRole',
  'tool': 'cco:InstrumentRole',

  // Beneficiary roles (for "for NP" prepositional phrases)
  'beneficiary': 'cco:BeneficiaryRole',

  // Participant (generic role for other participants)
  'participant': 'bfo:BFO_0000023',

  // Default
  '_default': 'bfo:BFO_0000023' // Generic BFO Role
};

/**
 * Entity types that CAN bear PatientRole (BFO/CCO constraint)
 * PatientRole is a specific medical/care role that only inheres in persons
 */
const PATIENT_ROLE_ELIGIBLE_TYPES = [
  'cco:Person',
  'cco:GroupOfPersons'
];

/**
 * ActualityStatus values where roles can be realized
 * Roles are only realized in actual occurrences, not prescriptions
 */
const REALIZABLE_STATUSES = [
  'tagteam:Actual'
];

/**
 * RoleDetector class - detects roles and links them to acts and bearers
 */
class RoleDetector {
  /**
   * Create a new RoleDetector
   * @param {Object} options - Configuration options
   * @param {Object} [options.graphBuilder] - SemanticGraphBuilder instance for IRI generation
   */
  constructor(options = {}) {
    this.options = options;
    this.graphBuilder = options.graphBuilder || null;
  }

  /**
   * Detect roles from acts and entities
   *
   * v2.3 changes:
   * - PatientRole ONLY for cco:Person entities (not artifacts)
   * - Roles only realize in Actual acts (not Prescribed/Planned)
   *
   * @param {Array} acts - Array of IntentionalAct nodes from ActExtractor
   * @param {Array} entities - Array of entity nodes (Tier 1 + Tier 2)
   * @param {Object} [options] - Detection options
   * @returns {Array<Object>} Array of Role nodes
   */
  detect(acts, entities, options = {}) {
    if (!acts || !entities || acts.length === 0 || entities.length === 0) {
      return [];
    }

    // Build entity lookup by IRI
    const entityIndex = new Map();
    entities.forEach(entity => {
      entityIndex.set(entity['@id'], entity);
    });

    // Phase 7.1: Consolidate roles per (roleType, bearerIRI).
    // BFO roles are continuants — one role per bearer, realized across multiple acts.
    // Key: "roleType|bearerIRI", Value: { roleInfo, actEntries: [{actIRI, canRealize}] }
    const roleAccumulator = new Map();

    const accumulateRole = (roleType, bearerIRI, bearer, actIRI, act, canRealize) => {
      const key = `${roleType}|${bearerIRI}`;
      if (roleAccumulator.has(key)) {
        roleAccumulator.get(key).actEntries.push({ actIRI, canRealize });
      } else {
        roleAccumulator.set(key, {
          roleType, bearerIRI, bearer,
          actEntries: [{ actIRI, canRealize }]
        });
      }
    };

    // Process each act to find roles
    acts.forEach(act => {
      const actualityStatus = act['tagteam:actualityStatus'];
      const canRealize = REALIZABLE_STATUSES.includes(actualityStatus);

      // Detect agent role (from has_agent)
      const agentIRI = extractIRI(act['cco:has_agent']);
      if (agentIRI) {
        const bearer = entityIndex.get(agentIRI);
        if (bearer && this._canBearAgentRole(bearer)) {
          accumulateRole('agent', agentIRI, bearer, act['@id'], act, canRealize);
        }
      }

      // Detect patient/affected role (from affects)
      // ENH-015: Use preposition to determine specific role type
      const affectedIRI = extractIRI(act['cco:affects']);
      if (affectedIRI) {
        const bearer = entityIndex.get(affectedIRI);
        if (bearer) {
          // ENH-015: Check for introducing preposition to determine role
          const prep = bearer['tagteam:introducingPreposition'];
          const roleType = this._getRoleTypeFromPreposition(prep, bearer);
          if (roleType) {
            accumulateRole(roleType, affectedIRI, bearer, act['@id'], act, canRealize);
          } else {
            // ENH-015: Direct object without preposition = patient role
            // This applies to both persons and artifacts (semantic patient = affected entity)
            accumulateRole('patient', affectedIRI, bearer, act['@id'], act, canRealize);
          }
        }
      }

      // Detect participant roles (from has_participant)
      // ENH-015: Use preposition to determine specific role type
      const participantIRIs = extractIRIs(act['bfo:has_participant']);
      if (participantIRIs.length > 0) {
        participantIRIs.forEach(participantIRI => {
          if (participantIRI === agentIRI || participantIRI === affectedIRI) return;

          const bearer = entityIndex.get(participantIRI);
          if (bearer) {
            if (this._isObjectAggregate(bearer)) {
              const members = extractIRIs(bearer['bfo:has_member']);
              members.forEach(memberIRI => {
                const member = entityIndex.get(memberIRI);
                if (member && this._isPersonEntity(member)) {
                  accumulateRole('patient', memberIRI, member, act['@id'], act, canRealize);
                }
              });
            } else {
              // ENH-015: Check for introducing preposition first
              const prep = bearer['tagteam:introducingPreposition'];
              const prepRoleType = this._getRoleTypeFromPreposition(prep, bearer);
              if (prepRoleType) {
                accumulateRole(prepRoleType, participantIRI, bearer, act['@id'], act, canRealize);
              } else {
                const roleType = this._isPersonEntity(bearer) ? 'patient' : 'participant';
                accumulateRole(roleType, participantIRI, bearer, act['@id'], act, canRealize);
              }
            }
          }
        });
      }
    });

    // Build consolidated role nodes
    const roles = [];
    for (const [, entry] of roleAccumulator) {
      const role = this._createConsolidatedRole(entry);
      roles.push(role);
      this._addBearerLink(entry.bearer, role['@id']);
    }

    return roles;
  }

  /**
   * ENH-015: Get role type based on introducing preposition
   *
   * Preposition → Role mapping:
   * - "for" → beneficiary
   * - "with" + inanimate → instrument
   * - "with" + person → participant (comitative)
   * - "to" → recipient
   * - "from" → participant (source)
   *
   * @param {string|null} preposition - The introducing preposition
   * @param {Object} bearer - The entity bearing the role
   * @returns {string|null} Role type key or null for default handling
   */
  _getRoleTypeFromPreposition(preposition, bearer) {
    if (!preposition) return null;

    const prep = preposition.toLowerCase();
    const isPerson = this._isPersonEntity(bearer);

    switch (prep) {
      case 'for':
        return 'beneficiary';
      case 'with':
        // "with" + person = comitative (participant)
        // "with" + inanimate = instrument
        return isPerson ? 'participant' : 'instrument';
      case 'to':
        return 'recipient';
      case 'from':
        // Source is treated as participant
        return 'participant';
      case 'by':
        // "by" in passive = agent (handled elsewhere)
        return null;
      default:
        return null;
    }
  }

  /**
   * Check if an entity is a Person type (can bear PatientRole)
   * @param {Object} entity - Entity node
   * @returns {boolean} True if entity is a Person
   */
  _isPersonEntity(entity) {
    const types = entity['@type'] || [];
    return types.some(type =>
      PATIENT_ROLE_ELIGIBLE_TYPES.some(eligible => type.includes(eligible))
    );
  }

  /**
   * Check if an entity can bear AgentRole
   * @param {Object} entity - Entity node
   * @returns {boolean} True if entity can be an agent
   */
  _canBearAgentRole(entity) {
    // AgentRole is primarily for persons, but could extend to organizations
    const types = entity['@type'] || [];
    return types.some(type =>
      type.includes('cco:Person') ||
      type.includes('cco:Organization') ||
      type.includes('cco:GroupOfPersons')
    );
  }

  /**
   * Check if an entity is an ObjectAggregate (v2.4)
   * @param {Object} entity - Entity node
   * @returns {boolean} True if ObjectAggregate
   */
  _isObjectAggregate(entity) {
    const types = entity['@type'] || [];
    return types.some(type => type.includes('BFO_0000027'));
  }

  /**
   * Add bearer link to entity
   * @param {Object} bearer - Bearer entity
   * @param {string} roleIRI - Role IRI
   */
  _addBearerLink(bearer, roleIRI) {
    if (!bearer['bfo:is_bearer_of']) {
      bearer['bfo:is_bearer_of'] = [];
    }
    if (!Array.isArray(bearer['bfo:is_bearer_of'])) {
      bearer['bfo:is_bearer_of'] = [bearer['bfo:is_bearer_of']];
    }
    // Deduplicate: don't add the same role IRI twice
    const existing = bearer['bfo:is_bearer_of'].some(ref =>
      (typeof ref === 'object' ? ref['@id'] : ref) === roleIRI
    );
    if (!existing) {
      bearer['bfo:is_bearer_of'].push({ '@id': roleIRI });
    }
  }

  /**
   * Create a Role node
   *
   * v2.3: Roles only have bfo:realized_in for Actual acts
   * For Prescribed/Planned acts, role exists but is not yet realized
   *
   * @param {Object} roleInfo - Role information
   * @returns {Object} Role node
   */
  /**
   * Create a consolidated role node from accumulated act entries.
   * One role per (roleType, bearerIRI), with realized_in as array when multiple acts.
   */
  _createConsolidatedRole(entry) {
    const { roleType, bearerIRI, bearer, actEntries } = entry;

    const iri = this._generateRoleIRI(roleType, bearerIRI);
    const specificType = ROLE_TYPE_MAPPINGS[roleType] || ROLE_TYPE_MAPPINGS['_default'];

    // Build @type array, avoiding duplicates
    const types = [specificType];
    if (specificType !== 'bfo:BFO_0000023') {
      types.push('bfo:BFO_0000023');
    }
    types.push('owl:NamedIndividual');

    const role = {
      '@id': iri,
      '@type': types,
      'rdfs:label': this._generateRoleLabel(roleType, bearer),
      'tagteam:roleType': roleType,
      'bfo:inheres_in': { '@id': bearerIRI }
    };

    // Separate actual vs non-actual acts
    const realizedActs = actEntries.filter(e => e.canRealize).map(e => ({ '@id': e.actIRI }));
    const wouldRealizeActs = actEntries.filter(e => !e.canRealize).map(e => ({ '@id': e.actIRI }));

    if (realizedActs.length === 1) {
      role['bfo:realized_in'] = realizedActs[0];
    } else if (realizedActs.length > 1) {
      role['bfo:realized_in'] = realizedActs;
    }

    if (wouldRealizeActs.length === 1) {
      role['tagteam:would_be_realized_in'] = wouldRealizeActs[0];
    } else if (wouldRealizeActs.length > 1) {
      role['tagteam:would_be_realized_in'] = wouldRealizeActs;
    }

    return role;
  }

  /**
   * Generate IRI for a role
   * @param {string} roleType - Type of role
   * @param {string} bearerIRI - Bearer IRI
   * @param {string} actIRI - Act IRI
   * @returns {string} Role IRI
   */
  _generateRoleIRI(roleType, bearerIRI) {
    // Phase 7.1: Hash only roleType|bearerIRI — one role per bearer
    const hashInput = `${roleType}|${bearerIRI}`;

    // Generate SHA-256 hash
    const hash = crypto
      .createHash('sha256')
      .update(hashInput)
      .digest('hex');

    // Take first 8 characters
    const hashSuffix = hash.substring(0, 8);

    // Format: inst:RoleType_Role_hash
    const typeLabel = roleType.charAt(0).toUpperCase() + roleType.slice(1);
    return `inst:${typeLabel}_Role_${hashSuffix}`;
  }

  /**
   * Generate human-readable label for role
   * @param {string} roleType - Type of role
   * @param {Object} bearer - Bearer entity
   * @param {Object} act - Act node
   * @returns {string} Role label
   */
  _generateRoleLabel(roleType, bearer) {
    const bearerLabel = bearer['rdfs:label'] || 'entity';
    return `${roleType} role of ${bearerLabel}`;
  }

  /**
   * Set the graph builder for IRI generation
   * @param {Object} graphBuilder - SemanticGraphBuilder instance
   */
  setGraphBuilder(graphBuilder) {
    this.graphBuilder = graphBuilder;
  }

  /**
   * Get role type for a given position
   * @param {string} position - Role position (agent, patient, etc.)
   * @returns {string} CCO/BFO role type
   */
  static getRoleType(position) {
    return ROLE_TYPE_MAPPINGS[position] || ROLE_TYPE_MAPPINGS['_default'];
  }
}

module.exports = RoleDetector;
