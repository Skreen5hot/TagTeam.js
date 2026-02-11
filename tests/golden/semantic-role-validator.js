/**
 * Semantic Role Validator for Golden Tests
 *
 * Extracts semantic roles from TagTeam's JSON-LD graph and compares
 * with expected simplified format from golden tests.
 */

/**
 * Normalize text for comparison (strip determiners, lowercase)
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '')
    .trim();
}

/**
 * Check if entity is spurious (metadata, etc.)
 */
function isSpuriousEntity(entity) {
  const label = (entity['rdfs:label'] || '').toLowerCase();
  return (
    label.includes('tagteam') ||
    label.includes('parser') ||
    label.includes('v3.0.0') ||
    label.includes('alpha')
  );
}

/**
 * Extract semantic roles from TagTeam graph
 */
function extractSemanticRoles(graph) {
  const nodes = graph['@graph'] || [];
  const roles = [];

  // Find all Act/IntentionalAct nodes
  const acts = nodes.filter(n =>
    n['@type']?.some(t =>
      t.includes('Act') ||
      t.includes('IntentionalAct')
    )
  );

  for (const act of acts) {
    const verb = act['tagteam:verb'] || act['rdfs:label'];

    // Extract agent
    if (act['cco:has_agent']) {
      const agentId = act['cco:has_agent']['@id'] || act['cco:has_agent'];
      const agent = nodes.find(n => n['@id'] === agentId);
      if (agent && !isSpuriousEntity(agent)) {
        roles.push({
          text: normalizeText(agent['rdfs:label'] || ''),
          role: 'Agent',
          entityType: extractEntityType(agent),
          verb
        });
      }
    }

    // Extract patient
    if (act['cco:affects']) {
      const patients = Array.isArray(act['cco:affects']) ? act['cco:affects'] : [act['cco:affects']];
      for (const patientRef of patients) {
        const patientId = patientRef['@id'] || patientRef;
        const patient = nodes.find(n => n['@id'] === patientId);
        if (patient && !isSpuriousEntity(patient)) {
          roles.push({
            text: normalizeText(patient['rdfs:label'] || ''),
            role: 'Patient',
            entityType: extractEntityType(patient),
            verb
          });
        }
      }
    }

    // Extract recipient
    if (act['cco:has_recipient']) {
      const recipientId = act['cco:has_recipient']['@id'] || act['cco:has_recipient'];
      const recipient = nodes.find(n => n['@id'] === recipientId);
      if (recipient && !isSpuriousEntity(recipient)) {
        roles.push({
          text: normalizeText(recipient['rdfs:label'] || ''),
          role: 'Recipient',
          entityType: extractEntityType(recipient),
          verb
        });
      }
    }

    // Extract theme (synonymous with patient in many frameworks)
    if (act['cco:has_object']) {
      const themeId = act['cco:has_object']['@id'] || act['cco:has_object'];
      const theme = nodes.find(n => n['@id'] === themeId);
      if (theme && !isSpuriousEntity(theme)) {
        roles.push({
          text: normalizeText(theme['rdfs:label'] || ''),
          role: 'Theme',
          entityType: extractEntityType(theme),
          verb
        });
      }
    }

    // Extract oblique roles (beneficiary, instrument, location, etc.)
    const obliqueProps = [
      'cco:has_beneficiary',
      'cco:has_instrument',
      'cco:occurs_at',
      'cco:has_source',
      'cco:has_destination'
    ];

    for (const prop of obliqueProps) {
      if (act[prop]) {
        const roleId = act[prop]['@id'] || act[prop];
        const roleEntity = nodes.find(n => n['@id'] === roleId);
        if (roleEntity && !isSpuriousEntity(roleEntity)) {
          const roleName = prop.replace('cco:has_', '').replace('cco:occurs_at', 'Location');
          roles.push({
            text: normalizeText(roleEntity['rdfs:label'] || ''),
            role: roleName.charAt(0).toUpperCase() + roleName.slice(1),
            entityType: extractEntityType(roleEntity),
            verb
          });
        }
      }
    }
  }

  return roles;
}

function extractEntityType(entity) {
  const types = entity['@type'] || [];

  // Map TagTeam types to golden test entity types
  if (types.includes('cco:Person')) return 'human-professional';
  if (types.includes('cco:Organization')) return 'organization';
  if (types.includes('cco:Act') || types.includes('cco:IntentionalAct')) return 'event';
  if (types.includes('cco:Artifact')) return 'artifact';
  if (types.includes('cco:Facility')) return 'location';
  if (types.includes('bfo:Quality')) return 'quality';

  return 'unknown';
}

/**
 * Compare extracted roles with expected roles
 */
function compareSemanticRoles(expected, actual) {
  const diffs = [];

  // Normalize expected roles
  const expectedRoles = expected.semanticRoles || [];
  const expectedRoleMap = new Map();

  for (const role of expectedRoles) {
    // Skip implicit roles that TagTeam doesn't infer
    if (role.text.startsWith('implicit-')) {
      continue;
    }
    const key = `${role.role}:${normalizeText(role.text)}`;
    expectedRoleMap.set(key, role);
  }

  // Check if all expected roles are found
  for (const [key, expectedRole] of expectedRoleMap) {
    const [expectedRoleName, expectedText] = key.split(':');

    const found = actual.some(actualRole => {
      const actualText = normalizeText(actualRole.text);

      // Exact match
      if (actualRole.role === expectedRoleName && actualText === expectedText) {
        return true;
      }

      // Patient/Theme are synonymous
      if ((expectedRoleName === 'Theme' && actualRole.role === 'Patient') ||
          (expectedRoleName === 'Patient' && actualRole.role === 'Theme')) {
        return actualText === expectedText;
      }

      return false;
    });

    if (!found) {
      diffs.push({
        type: 'missing-role',
        expected: expectedRole,
        actual: null
      });
    }
  }

  // Check for extra roles not in expected
  for (const actualRole of actual) {
    const key = `${actualRole.role}:${normalizeText(actualRole.text)}`;
    if (!expectedRoleMap.has(key)) {
      // Check if it's Patient role when Theme is expected (they're often synonymous)
      const themeKey = `Theme:${normalizeText(actualRole.text)}`;
      const patientKey = `Patient:${normalizeText(actualRole.text)}`;

      if (actualRole.role === 'Patient' && expectedRoleMap.has(themeKey)) {
        // Patient for Theme is acceptable
        continue;
      }
      if (actualRole.role === 'Theme' && expectedRoleMap.has(patientKey)) {
        // Theme for Patient is acceptable
        continue;
      }

      diffs.push({
        type: 'extra-role',
        expected: null,
        actual: actualRole
      });
    }
  }

  return diffs;
}

/**
 * Validate a test case
 */
function validateSemanticRoles(testCase, graph) {
  const extractedRoles = extractSemanticRoles(graph);
  const diffs = compareSemanticRoles(testCase.expectedOutput, extractedRoles);

  return {
    passed: diffs.length === 0,
    extractedRoles,
    expectedRoles: testCase.expectedOutput.semanticRoles || [],
    diffs,
    summary: {
      expectedCount: (testCase.expectedOutput.semanticRoles || []).length,
      actualCount: extractedRoles.length,
      matched: (testCase.expectedOutput.semanticRoles || []).length - diffs.filter(d => d.type === 'missing-role').length
    }
  };
}

module.exports = {
  extractSemanticRoles,
  compareSemanticRoles,
  validateSemanticRoles
};
