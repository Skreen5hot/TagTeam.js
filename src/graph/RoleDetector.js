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
  'recipient': 'cco:PatientRole',

  // Instrument roles (for artifacts used in acts)
  'instrument': 'cco:InstrumentRole',
  'tool': 'cco:InstrumentRole',

  // Beneficiary roles
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
    const roles = [];

    if (!acts || !entities || acts.length === 0 || entities.length === 0) {
      return roles;
    }

    // Build entity lookup by IRI
    const entityIndex = new Map();
    entities.forEach(entity => {
      entityIndex.set(entity['@id'], entity);
    });

    // Process each act to find roles
    acts.forEach(act => {
      // Check if roles can be realized in this act (only Actual acts)
      const actualityStatus = act['tagteam:actualityStatus'];
      const canRealize = REALIZABLE_STATUSES.includes(actualityStatus);

      // Detect agent role (from has_agent)
      const agentIRI = extractIRI(act['cco:has_agent']);
      if (agentIRI) {
        const bearer = entityIndex.get(agentIRI);

        // AgentRole only for Person entities
        if (bearer && this._canBearAgentRole(bearer)) {
          const role = this._createRole({
            roleType: 'agent',
            bearerIRI: agentIRI,
            bearer,
            actIRI: act['@id'],
            act,
            canRealize
          });
          roles.push(role);
          this._addBearerLink(bearer, role['@id']);
        }
      }

      // Detect patient/affected role (from affects)
      const affectedIRI = extractIRI(act['cco:affects']);
      if (affectedIRI) {
        const bearer = entityIndex.get(affectedIRI);

        if (bearer) {
          // CRITICAL: PatientRole ONLY for Person entities (BFO/CCO constraint)
          // Artifacts are affected but do NOT bear PatientRole
          const isPerson = this._isPersonEntity(bearer);

          if (isPerson) {
            // Create PatientRole for persons
            const role = this._createRole({
              roleType: 'patient',
              bearerIRI: affectedIRI,
              bearer,
              actIRI: act['@id'],
              act,
              canRealize
            });
            roles.push(role);
            this._addBearerLink(bearer, role['@id']);
          }
          // NOTE: Artifacts do NOT get PatientRole - they are simply affected
          // The cco:affects relation on the act is sufficient
        }
      }

      // Detect participant roles (from has_participant)
      // These are persons who participate but are not the primary agent/patient
      // v2.4: Also process members of ObjectAggregates
      const participantIRIs = extractIRIs(act['bfo:has_participant']);
      if (participantIRIs.length > 0) {
        participantIRIs.forEach(participantIRI => {
          // Skip if already covered as agent or affected
          if (participantIRI === agentIRI || participantIRI === affectedIRI) {
            return;
          }

          const bearer = entityIndex.get(participantIRI);
          if (bearer) {
            // Check if this is an ObjectAggregate - if so, process its members
            if (this._isObjectAggregate(bearer)) {
              // v2.4: Assign PatientRole to each member of the aggregate
              const members = extractIRIs(bearer['bfo:has_member']);

              members.forEach(memberIRI => {
                const member = entityIndex.get(memberIRI);
                if (member && this._isPersonEntity(member)) {
                  const role = this._createRole({
                    roleType: 'patient',
                    bearerIRI: memberIRI,
                    bearer: member,
                    actIRI: act['@id'],
                    act,
                    canRealize
                  });
                  roles.push(role);
                  this._addBearerLink(member, role['@id']);
                }
              });
            } else {
              // Non-aggregate participant
              // Determine appropriate role type based on entity type
              const roleType = this._isPersonEntity(bearer) ? 'patient' : 'participant';

              const role = this._createRole({
                roleType,
                bearerIRI: participantIRI,
                bearer,
                actIRI: act['@id'],
                act,
                canRealize
              });
              roles.push(role);
              this._addBearerLink(bearer, role['@id']);
            }
          }
        });
      }
    });

    return roles;
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
    if (Array.isArray(bearer['bfo:is_bearer_of'])) {
      bearer['bfo:is_bearer_of'].push(roleIRI);
    } else {
      bearer['bfo:is_bearer_of'] = [bearer['bfo:is_bearer_of'], roleIRI];
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
  _createRole(roleInfo) {
    const { roleType, bearerIRI, bearer, actIRI, act, canRealize } = roleInfo;

    // Generate IRI
    const iri = this._generateRoleIRI(roleType, bearerIRI, actIRI);

    // Determine specific role type
    const specificType = ROLE_TYPE_MAPPINGS[roleType] || ROLE_TYPE_MAPPINGS['_default'];

    // Build role node
    const role = {
      '@id': iri,
      '@type': [specificType, 'bfo:BFO_0000023', 'owl:NamedIndividual'],
      'rdfs:label': this._generateRoleLabel(roleType, bearer, act),
      'tagteam:roleType': roleType,

      // CRITICAL: Bearer link (SHACL VIOLATION if missing)
      // Use object notation with @id for JSON-LD compliance
      'bfo:inheres_in': { '@id': bearerIRI }
    };

    // IMPORTANT: Realization link ONLY for Actual acts (v2.3 fix)
    // Prescribed/Planned acts: role exists (inheres_in) but is not realized
    // Use object notation with @id for JSON-LD compliance
    if (canRealize) {
      role['bfo:realized_in'] = { '@id': actIRI };
    } else {
      // For non-actual acts, indicate which act would realize the role
      role['tagteam:would_be_realized_in'] = { '@id': actIRI };
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
  _generateRoleIRI(roleType, bearerIRI, actIRI) {
    // Create hash input for deterministic IRI
    const hashInput = `${roleType}|${bearerIRI}|${actIRI}`;

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
  _generateRoleLabel(roleType, bearer, act) {
    const bearerLabel = bearer['rdfs:label'] || 'entity';
    const actVerb = act['tagteam:verb'] || 'act';
    return `${roleType} role of ${bearerLabel} in ${actVerb}`;
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
