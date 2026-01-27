/**
 * @file src/data/bfo-cco-registry.js
 * @description Phase 6.4.5 - BFO/CCO Types Registry
 *
 * Registry of known BFO (Basic Formal Ontology) and CCO (Common Core Ontologies)
 * types used for validation. This enables the OntologyValidator to check that
 * domain configurations reference valid ontology types.
 *
 * BFO provides the upper ontology structure:
 * - Continuant (things that persist through time)
 * - Occurrent (processes that unfold through time)
 *
 * CCO extends BFO for common concepts:
 * - Agent, Act, Action, Artifact, etc.
 *
 * @see https://basic-formal-ontology.org/
 * @see https://github.com/CommonCoreOntology/CommonCoreOntologies
 */

const BFO_CCO_REGISTRY = {
  // ==================== Namespace Prefixes ====================
  prefixes: {
    bfo: 'http://purl.obolibrary.org/obo/BFO_',
    cco: 'http://www.ontologyrepository.com/CommonCoreOntologies/',
    obo: 'http://purl.obolibrary.org/obo/',
    tagteam: 'http://purl.org/tagteam#'
  },

  // ==================== BFO Core Types ====================
  // Basic Formal Ontology - Upper Level Categories
  bfo: {
    // Top-level
    'BFO_0000001': { label: 'entity', parent: null },

    // Continuant branch (things that persist)
    'BFO_0000002': { label: 'continuant', parent: 'BFO_0000001' },
    'BFO_0000004': { label: 'independent continuant', parent: 'BFO_0000002' },
    'BFO_0000020': { label: 'specifically dependent continuant', parent: 'BFO_0000002' },
    'BFO_0000031': { label: 'generically dependent continuant', parent: 'BFO_0000002' },

    // Material entities
    'BFO_0000040': { label: 'material entity', parent: 'BFO_0000004' },
    'BFO_0000030': { label: 'object', parent: 'BFO_0000040' },
    'BFO_0000024': { label: 'fiat object part', parent: 'BFO_0000040' },
    'BFO_0000027': { label: 'object aggregate', parent: 'BFO_0000040' },

    // Immaterial entities
    'BFO_0000141': { label: 'immaterial entity', parent: 'BFO_0000004' },
    'BFO_0000006': { label: 'spatial region', parent: 'BFO_0000141' },
    'BFO_0000029': { label: 'site', parent: 'BFO_0000141' },
    'BFO_0000140': { label: 'continuant fiat boundary', parent: 'BFO_0000141' },

    // Dependent continuants
    'BFO_0000019': { label: 'quality', parent: 'BFO_0000020' },
    'BFO_0000145': { label: 'relational quality', parent: 'BFO_0000019' },
    'BFO_0000016': { label: 'disposition', parent: 'BFO_0000020' },
    'BFO_0000017': { label: 'realizable entity', parent: 'BFO_0000020' },
    'BFO_0000023': { label: 'role', parent: 'BFO_0000017' },
    'BFO_0000034': { label: 'function', parent: 'BFO_0000016' },

    // Occurrent branch (processes)
    'BFO_0000003': { label: 'occurrent', parent: 'BFO_0000001' },
    'BFO_0000015': { label: 'process', parent: 'BFO_0000003' },
    'BFO_0000035': { label: 'process boundary', parent: 'BFO_0000003' },
    'BFO_0000011': { label: 'spatiotemporal region', parent: 'BFO_0000003' },
    'BFO_0000008': { label: 'temporal region', parent: 'BFO_0000003' },
    'BFO_0000148': { label: 'zero-dimensional temporal region', parent: 'BFO_0000008' },
    'BFO_0000038': { label: 'one-dimensional temporal region', parent: 'BFO_0000008' },

    // Process parts
    'BFO_0000144': { label: 'process profile', parent: 'BFO_0000015' },
    'BFO_0000182': { label: 'history', parent: 'BFO_0000015' },

    // Common aliases (for bfo:Object, bfo:Process, etc.)
    'Object': { label: 'object', parent: 'BFO_0000040' },
    'Process': { label: 'process', parent: 'BFO_0000015' },
    'Quality': { label: 'quality', parent: 'BFO_0000019' },
    'Role': { label: 'role', parent: 'BFO_0000023' },
    'Disposition': { label: 'disposition', parent: 'BFO_0000016' },
    'Function': { label: 'function', parent: 'BFO_0000034' }
  },

  // ==================== CCO Core Types ====================
  // Common Core Ontologies - Mid-Level Concepts
  cco: {
    // Agents
    'Agent': { label: 'Agent', parent: 'BFO_0000040', namespace: 'cco' },
    'Person': { label: 'Person', parent: 'Agent', namespace: 'cco' },
    'Organization': { label: 'Organization', parent: 'Agent', namespace: 'cco' },
    'GroupOfAgents': { label: 'Group of Agents', parent: 'Agent', namespace: 'cco' },

    // Acts and Actions
    'Act': { label: 'Act', parent: 'BFO_0000015', namespace: 'cco' },
    'IntentionalAct': { label: 'Intentional Act', parent: 'Act', namespace: 'cco' },
    'ActOfCommunication': { label: 'Act of Communication', parent: 'IntentionalAct', namespace: 'cco' },
    'ActOfDeclaration': { label: 'Act of Declaration', parent: 'ActOfCommunication', namespace: 'cco' },
    'ActOfCommand': { label: 'Act of Command', parent: 'ActOfCommunication', namespace: 'cco' },
    'ActOfPromise': { label: 'Act of Promise', parent: 'ActOfCommunication', namespace: 'cco' },
    'ActOfAssent': { label: 'Act of Assent', parent: 'ActOfCommunication', namespace: 'cco' },

    // Medical Acts
    'ActOfMedicalTreatment': { label: 'Act of Medical Treatment', parent: 'IntentionalAct', namespace: 'cco' },
    'ActOfSurgery': { label: 'Act of Surgery', parent: 'ActOfMedicalTreatment', namespace: 'cco' },
    'ActOfDiagnosis': { label: 'Act of Diagnosis', parent: 'IntentionalAct', namespace: 'cco' },
    'ActOfCare': { label: 'Act of Care', parent: 'IntentionalAct', namespace: 'cco' },
    'ActOfService': { label: 'Act of Service', parent: 'IntentionalAct', namespace: 'cco' },
    'ActOfTransferOfPossession': { label: 'Act of Transfer of Possession', parent: 'IntentionalAct', namespace: 'cco' },
    'ActOfAssistance': { label: 'Act of Assistance', parent: 'IntentionalAct', namespace: 'cco' },

    // Information Entities
    'InformationContentEntity': { label: 'Information Content Entity', parent: 'BFO_0000031', namespace: 'cco' },
    'DescriptiveInformationContentEntity': { label: 'Descriptive ICE', parent: 'InformationContentEntity', namespace: 'cco' },
    'DirectiveInformationContentEntity': { label: 'Directive ICE', parent: 'InformationContentEntity', namespace: 'cco' },
    'Document': { label: 'Document', parent: 'InformationContentEntity', namespace: 'cco' },

    // Artifacts
    'Artifact': { label: 'Artifact', parent: 'BFO_0000040', namespace: 'cco' },
    'InformationBearingArtifact': { label: 'Information Bearing Artifact', parent: 'Artifact', namespace: 'cco' },

    // Roles
    'AgentRole': { label: 'Agent Role', parent: 'BFO_0000023', namespace: 'cco' },
    'OccupationRole': { label: 'Occupation Role', parent: 'AgentRole', namespace: 'cco' },
    'SocialRole': { label: 'Social Role', parent: 'AgentRole', namespace: 'cco' },

    // Dispositions
    'AgentDisposition': { label: 'Agent Disposition', parent: 'BFO_0000016', namespace: 'cco' },
    'Capability': { label: 'Capability', parent: 'AgentDisposition', namespace: 'cco' },

    // Qualities
    'Quality': { label: 'Quality', parent: 'BFO_0000019', namespace: 'cco' },
    'InformationQuality': { label: 'Information Quality', parent: 'BFO_0000019', namespace: 'cco' },

    // Events and States
    'Stasis': { label: 'Stasis', parent: 'BFO_0000015', namespace: 'cco' },
    'Change': { label: 'Change', parent: 'BFO_0000015', namespace: 'cco' },

    // Temporal concepts
    'TemporalInterval': { label: 'Temporal Interval', parent: 'BFO_0000038', namespace: 'cco' },
    'TemporalInstant': { label: 'Temporal Instant', parent: 'BFO_0000148', namespace: 'cco' }
  },

  // ==================== TagTeam Extensions ====================
  // TagTeam-specific types that extend BFO/CCO
  tagteam: {
    // Actuality Status (extends BFO quality)
    'ActualityStatus': { label: 'Actuality Status', parent: 'BFO_0000019', namespace: 'tagteam' },
    'Actual': { label: 'Actual', parent: 'ActualityStatus', namespace: 'tagteam' },
    'Potential': { label: 'Potential', parent: 'ActualityStatus', namespace: 'tagteam' },
    'Counterfactual': { label: 'Counterfactual', parent: 'ActualityStatus', namespace: 'tagteam' },

    // Deontic Status (extends ActualityStatus)
    'DeonticStatus': { label: 'Deontic Status', parent: 'ActualityStatus', namespace: 'tagteam' },
    'Prescribed': { label: 'Prescribed', parent: 'DeonticStatus', namespace: 'tagteam' },
    'Permitted': { label: 'Permitted', parent: 'DeonticStatus', namespace: 'tagteam' },
    'Prohibited': { label: 'Prohibited', parent: 'DeonticStatus', namespace: 'tagteam' },

    // Phase 6.4 Hohfeldian Deontic Types
    'Entitled': { label: 'Entitled', parent: 'DeonticStatus', namespace: 'tagteam' },
    'Empowered': { label: 'Empowered', parent: 'DeonticStatus', namespace: 'tagteam' },
    'Protected': { label: 'Protected', parent: 'DeonticStatus', namespace: 'tagteam' },

    // Act types
    'TaggedAct': { label: 'Tagged Act', parent: 'Act', namespace: 'tagteam' },

    // Interpretation structures
    'InterpretationLattice': { label: 'Interpretation Lattice', parent: 'InformationContentEntity', namespace: 'tagteam' },
    'AlternativeReading': { label: 'Alternative Reading', parent: 'InformationContentEntity', namespace: 'tagteam' },

    // Ambiguity types
    'Ambiguity': { label: 'Ambiguity', parent: 'InformationQuality', namespace: 'tagteam' },
    'LexicalAmbiguity': { label: 'Lexical Ambiguity', parent: 'Ambiguity', namespace: 'tagteam' },
    'ScopeAmbiguity': { label: 'Scope Ambiguity', parent: 'Ambiguity', namespace: 'tagteam' },
    'AttachmentAmbiguity': { label: 'Attachment Ambiguity', parent: 'Ambiguity', namespace: 'tagteam' }
  }
};

// ==================== Helper Functions ====================

/**
 * Check if a type exists in any registry
 * @param {string} typeId - Type identifier (can be prefixed or full IRI)
 * @returns {boolean}
 */
function typeExists(typeId) {
  if (!typeId) return false;

  // Normalize the type ID
  const normalized = normalizeTypeId(typeId);

  // Check each registry
  if (BFO_CCO_REGISTRY.bfo[normalized]) return true;
  if (BFO_CCO_REGISTRY.cco[normalized]) return true;
  if (BFO_CCO_REGISTRY.tagteam[normalized]) return true;

  return false;
}

/**
 * Get type information
 * @param {string} typeId - Type identifier
 * @returns {Object|null} Type info with label and parent
 */
function getTypeInfo(typeId) {
  if (!typeId) return null;

  const normalized = normalizeTypeId(typeId);

  if (BFO_CCO_REGISTRY.bfo[normalized]) {
    return { ...BFO_CCO_REGISTRY.bfo[normalized], id: normalized, namespace: 'bfo' };
  }
  if (BFO_CCO_REGISTRY.cco[normalized]) {
    return { ...BFO_CCO_REGISTRY.cco[normalized], id: normalized };
  }
  if (BFO_CCO_REGISTRY.tagteam[normalized]) {
    return { ...BFO_CCO_REGISTRY.tagteam[normalized], id: normalized };
  }

  return null;
}

/**
 * Get parent type
 * @param {string} typeId - Type identifier
 * @returns {string|null} Parent type ID
 */
function getParentType(typeId) {
  const info = getTypeInfo(typeId);
  return info ? info.parent : null;
}

/**
 * Get all ancestors of a type (parent chain to root)
 * @param {string} typeId - Type identifier
 * @returns {Array} Array of ancestor type IDs
 */
function getAncestors(typeId) {
  const ancestors = [];
  let current = getParentType(typeId);

  while (current) {
    ancestors.push(current);
    current = getParentType(current);
  }

  return ancestors;
}

/**
 * Check if typeA is a subtype of typeB
 * @param {string} typeA - Potential subtype
 * @param {string} typeB - Potential supertype
 * @returns {boolean}
 */
function isSubtypeOf(typeA, typeB) {
  if (!typeA || !typeB) return false;

  const normalizedA = normalizeTypeId(typeA);
  const normalizedB = normalizeTypeId(typeB);

  // Same type
  if (normalizedA === normalizedB) return true;

  // Check ancestor chain
  const ancestors = getAncestors(normalizedA);
  return ancestors.includes(normalizedB);
}

/**
 * Normalize a type ID (remove prefix, extract local name)
 * @param {string} typeId - Type identifier
 * @returns {string} Normalized type ID
 */
function normalizeTypeId(typeId) {
  if (!typeId) return '';

  // Handle full IRIs
  if (typeId.startsWith('http://')) {
    // Extract local name after last / or #
    const parts = typeId.split(/[/#]/);
    return parts[parts.length - 1];
  }

  // Handle prefixed names (bfo:BFO_0000015, cco:Act, etc.)
  if (typeId.includes(':')) {
    const parts = typeId.split(':');
    return parts[parts.length - 1];
  }

  return typeId;
}

/**
 * Get all types in a namespace
 * @param {string} namespace - 'bfo', 'cco', or 'tagteam'
 * @returns {Array} Array of type IDs
 */
function getTypesInNamespace(namespace) {
  const registry = BFO_CCO_REGISTRY[namespace];
  return registry ? Object.keys(registry) : [];
}

/**
 * Get the full IRI for a type
 * @param {string} typeId - Type identifier
 * @returns {string|null} Full IRI
 */
function getFullIRI(typeId) {
  const info = getTypeInfo(typeId);
  if (!info) return null;

  const ns = info.namespace || 'bfo';
  const prefix = BFO_CCO_REGISTRY.prefixes[ns];
  const normalized = normalizeTypeId(typeId);

  return prefix + normalized;
}

/**
 * Validate that a type can be used as a parent for another
 * @param {string} childType - The child type
 * @param {string} parentType - The proposed parent type
 * @returns {Object} Validation result with valid and message
 */
function validateParentRelation(childType, parentType) {
  const childInfo = getTypeInfo(childType);
  const parentInfo = getTypeInfo(parentType);

  if (!childInfo) {
    return { valid: false, message: `Unknown child type: ${childType}` };
  }
  if (!parentInfo) {
    return { valid: false, message: `Unknown parent type: ${parentType}` };
  }

  // Check if parent is actually an ancestor of child
  if (isSubtypeOf(childType, parentType)) {
    return { valid: true, message: 'Valid parent relation' };
  }

  return {
    valid: false,
    message: `${childType} is not a subtype of ${parentType}`
  };
}

// ==================== Exports ====================

const registryAPI = {
  registry: BFO_CCO_REGISTRY,
  prefixes: BFO_CCO_REGISTRY.prefixes,
  typeExists,
  getTypeInfo,
  getParentType,
  getAncestors,
  isSubtypeOf,
  normalizeTypeId,
  getTypesInNamespace,
  getFullIRI,
  validateParentRelation
};

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = registryAPI;
}
if (typeof window !== 'undefined') {
  window.BFOCCORegistry = registryAPI;
}
