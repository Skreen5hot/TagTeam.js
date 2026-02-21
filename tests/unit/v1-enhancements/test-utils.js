/**
 * Test utilities for v1 enhancement tests
 * Shared helpers for building graphs and querying nodes
 */

let SemanticGraphBuilder;
try {
  SemanticGraphBuilder = require('../../../src/graph/SemanticGraphBuilder');
} catch (e) {
  console.log('Note: SemanticGraphBuilder not found:', e.message);
}

/**
 * Build a semantic graph from text
 */
function buildGraph(text, options = {}) {
  if (!SemanticGraphBuilder) {
    throw new Error('SemanticGraphBuilder not available');
  }
  const builder = new SemanticGraphBuilder();
  return builder.build(text, options);
}

/**
 * Get all nodes from graph
 */
function getNodes(graph) {
  return graph['@graph'] || [];
}

/**
 * Find entity by label (case-insensitive)
 * Prefers Tier 2 entities (Person, Artifact, etc.) over Tier 1 DiscourseReferents
 */
function findEntityByLabel(graph, label) {
  const labelLower = label.toLowerCase();
  const matches = getNodes(graph).filter(n => {
    const nodeLabel = n['rdfs:label'];
    if (!nodeLabel) return false;
    return nodeLabel.toLowerCase() === labelLower ||
           nodeLabel.toLowerCase().includes(labelLower);
  });

  // Prefer Tier 2 entities (cco:Person, cco:Artifact, etc.) over Tier 1 DiscourseReferents
  const tier2 = matches.find(n => {
    const types = n['@type'] || [];
    return types.some(t => t.startsWith('cco:') || t.startsWith('bfo:BFO_000001') || t.startsWith('bfo:BFO_0000038'));
  });
  if (tier2) return tier2;

  return matches[0] || null;
}

/**
 * Find all entities by partial label match
 */
function findEntitiesByLabel(graph, label) {
  const labelLower = label.toLowerCase();
  return getNodes(graph).filter(n => {
    const nodeLabel = n['rdfs:label'];
    if (!nodeLabel) return false;
    return nodeLabel.toLowerCase().includes(labelLower);
  });
}

/**
 * Find act by verb
 */
function findActByVerb(graph, verb) {
  const verbLower = verb.toLowerCase();
  return getNodes(graph).find(n =>
    n['tagteam:verb']?.toLowerCase() === verbLower &&
    n['@type'] &&
    (n['@type'].includes('cco:IntentionalAct') ||
     n['@type'].some(t => t.startsWith('cco:ActOf')))
  );
}

/**
 * Find all semantic acts (excluding system-internal parsing acts)
 */
function findAllActs(graph) {
  return getNodes(graph).filter(n =>
    n['tagteam:verb'] &&
    n['@type'] &&
    n['@type'].some(t => t.includes('IntentionalAct') || t.startsWith('cco:ActOf')) &&
    !n['tagteam:isSystemAct']
  );
}

/**
 * Get agent entity of an act
 */
function getAgentOfAct(graph, verb) {
  const act = findActByVerb(graph, verb);
  if (!act) return null;

  const agentRef = act['cco:has_agent'];
  if (!agentRef) return null;

  const agentId = agentRef['@id'] || agentRef;
  return getNodes(graph).find(n => n['@id'] === agentId);
}

/**
 * Get patient entity of an act
 */
function getPatientOfAct(graph, verb) {
  const act = findActByVerb(graph, verb);
  if (!act) return null;

  const patientRef = act['cco:affects'];
  if (!patientRef) return null;

  const patientId = patientRef['@id'] || patientRef;
  return getNodes(graph).find(n => n['@id'] === patientId);
}

/**
 * Find role node by bearer label
 */
function findRoleByBearer(graph, bearerLabel) {
  const bearer = findEntityByLabel(graph, bearerLabel);
  if (!bearer) return null;

  return getNodes(graph).find(n => {
    const inheres = n['bfo:inheres_in'];
    if (!inheres) return false;
    const inheresId = inheres['@id'] || inheres;
    // Check for role types (includes named roles AND BFO generic role bfo:BFO_0000023)
    const isRole = n['@type']?.some(t => t.includes('Role') || t === 'bfo:BFO_0000023');
    return inheresId === bearer['@id'] && isRole;
  });
}

/**
 * Get role type from role node
 */
function getRoleType(roleNode) {
  if (!roleNode || !roleNode['@type']) return null;

  // Find the specific role type (not just bfo:BFO_0000023)
  for (const type of roleNode['@type']) {
    if (type.includes('AgentRole')) return 'agent';
    if (type.includes('PatientRole')) return 'patient';
    if (type.includes('InstrumentRole')) return 'instrument';
    if (type.includes('BeneficiaryRole')) return 'beneficiary';
    if (type.includes('RecipientRole')) return 'recipient';
  }

  // Check label as fallback
  const label = roleNode['rdfs:label']?.toLowerCase() || '';
  if (label.includes('agent')) return 'agent';
  if (label.includes('patient')) return 'patient';
  if (label.includes('instrument')) return 'instrument';
  if (label.includes('beneficiary')) return 'beneficiary';
  if (label.includes('recipient')) return 'recipient';

  return 'participant';
}

/**
 * Check if entity has specific denotesType
 */
function hasDenotesType(entity, expectedType) {
  if (!entity) return false;
  return entity['tagteam:denotesType'] === expectedType;
}

/**
 * Check if entity has introducing preposition
 */
function hasIntroducingPreposition(entity, expectedPrep) {
  if (!entity) return false;
  return entity['tagteam:introducingPreposition'] === expectedPrep;
}

/**
 * Check if act has negation
 */
function isNegated(graph, verb) {
  const act = findActByVerb(graph, verb);
  return act && act['tagteam:negated'] === true;
}

/**
 * Check actuality status of act
 */
function getActualityStatus(graph, verb) {
  const act = findActByVerb(graph, verb);
  return act ? act['tagteam:actualityStatus'] : null;
}

module.exports = {
  buildGraph,
  getNodes,
  findEntityByLabel,
  findEntitiesByLabel,
  findActByVerb,
  findAllActs,
  getAgentOfAct,
  getPatientOfAct,
  findRoleByBearer,
  getRoleType,
  hasDenotesType,
  hasIntroducingPreposition,
  isNegated,
  getActualityStatus
};
