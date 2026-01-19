/**
 * RoleDetector.js
 *
 * Detects BFO roles from acts and links them to discourse referents.
 * Roles link discourse referents (bearers) to acts (realizations).
 *
 * Phase 1.4: Role Detection
 *
 * @module graph/RoleDetector
 * @version 3.0.0-alpha.2
 */

const crypto = require('crypto');

/**
 * Role type mappings based on relationship to act
 * Maps role positions to CCO/BFO role types
 */
const ROLE_TYPE_MAPPINGS = {
  // Agent roles (subject performing the act)
  'agent': 'cco:AgentRole',
  'performer': 'cco:AgentRole',
  'actor': 'cco:AgentRole',

  // Patient roles (object receiving/affected by act)
  'patient': 'cco:PatientRole',
  'recipient': 'cco:PatientRole',
  'affected': 'cco:PatientRole',

  // Instrument roles
  'instrument': 'cco:InstrumentRole',
  'tool': 'cco:InstrumentRole',

  // Beneficiary roles
  'beneficiary': 'cco:BeneficiaryRole',

  // Default
  '_default': 'bfo:BFO_0000023' // Generic BFO Role
};

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
   * @param {Array} acts - Array of IntentionalAct nodes from ActExtractor
   * @param {Array} entities - Array of DiscourseReferent nodes from EntityExtractor
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
      // Detect agent role (from has_agent)
      if (act['cco:has_agent']) {
        const agentIRI = act['cco:has_agent'];
        const bearer = entityIndex.get(agentIRI);

        if (bearer) {
          const role = this._createRole({
            roleType: 'agent',
            bearerIRI: agentIRI,
            bearer,
            actIRI: act['@id'],
            act
          });
          roles.push(role);

          // Add inverse relation to bearer
          if (!bearer['bfo:is_bearer_of']) {
            bearer['bfo:is_bearer_of'] = [];
          }
          if (Array.isArray(bearer['bfo:is_bearer_of'])) {
            bearer['bfo:is_bearer_of'].push(role['@id']);
          } else {
            bearer['bfo:is_bearer_of'] = [bearer['bfo:is_bearer_of'], role['@id']];
          }
        }
      }

      // Detect patient role (from affects)
      if (act['cco:affects']) {
        const patientIRI = act['cco:affects'];
        const bearer = entityIndex.get(patientIRI);

        if (bearer) {
          const role = this._createRole({
            roleType: 'patient',
            bearerIRI: patientIRI,
            bearer,
            actIRI: act['@id'],
            act
          });
          roles.push(role);

          // Add inverse relation to bearer
          if (!bearer['bfo:is_bearer_of']) {
            bearer['bfo:is_bearer_of'] = [];
          }
          if (Array.isArray(bearer['bfo:is_bearer_of'])) {
            bearer['bfo:is_bearer_of'].push(role['@id']);
          } else {
            bearer['bfo:is_bearer_of'] = [bearer['bfo:is_bearer_of'], role['@id']];
          }
        }
      }

      // Detect participant roles (from has_participant, excluding agent/patient)
      if (act['bfo:has_participant'] && Array.isArray(act['bfo:has_participant'])) {
        act['bfo:has_participant'].forEach(participantIRI => {
          // Skip if already covered as agent or patient
          if (participantIRI === act['cco:has_agent'] ||
              participantIRI === act['cco:affects']) {
            return;
          }

          const bearer = entityIndex.get(participantIRI);
          if (bearer) {
            const role = this._createRole({
              roleType: 'participant',
              bearerIRI: participantIRI,
              bearer,
              actIRI: act['@id'],
              act
            });
            roles.push(role);

            // Add inverse relation to bearer
            if (!bearer['bfo:is_bearer_of']) {
              bearer['bfo:is_bearer_of'] = [];
            }
            if (Array.isArray(bearer['bfo:is_bearer_of'])) {
              bearer['bfo:is_bearer_of'].push(role['@id']);
            } else {
              bearer['bfo:is_bearer_of'] = [bearer['bfo:is_bearer_of'], role['@id']];
            }
          }
        });
      }
    });

    return roles;
  }

  /**
   * Create a Role node
   * @param {Object} roleInfo - Role information
   * @returns {Object} Role node
   */
  _createRole(roleInfo) {
    const { roleType, bearerIRI, bearer, actIRI, act } = roleInfo;

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
      'bfo:inheres_in': bearerIRI,

      // Realization link (links role to act)
      'bfo:realized_in': actIRI
    };

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
