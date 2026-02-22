#!/usr/bin/env node

/**
 * Level 1 Component Test Runner
 *
 * Runs white-box diagnostic tests against individual TagTeam components.
 * Each test validates against authoritative linguistic or ontological sources.
 *
 * Expected failure rate on V7.0: 30-50% (this is GOOD - shows diagnostic value)
 */

const fs = require('fs');
const path = require('path');

// Import TagTeam (ensure it's built first)
let TagTeam;
try {
  TagTeam = require('../../dist/tagteam.js');
} catch (e) {
  console.error('❌ ERROR: TagTeam not found. Run `npm run build` first.');
  process.exit(1);
}

// Pre-load tree pipeline models (buildGraph() defaults to tree pipeline)
try {
  const posJSON = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/data/pos-weights-pruned.json'), 'utf8'));
  const depJSON = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/data/dep-weights-pruned.json'), 'utf8'));
  TagTeam.loadModels(posJSON, depJSON);
} catch (e) {
  console.warn('⚠️  Could not pre-load tree models, auto-load will be attempted:', e.message);
}

// ============================================================================
// Configuration
// ============================================================================

const COMPONENT_TEST_DIR = __dirname;
const RESULTS_DIR = path.join(COMPONENT_TEST_DIR, 'results');

const CATEGORIES = {
  'clause-segmentation': {
    files: [
      'clause-segmentation/prefix-subordination.json',
      'clause-segmentation/relative-clauses.json'
    ],
    component: 'ClauseSegmenter'
  },
  'entity-extraction': {
    files: [
      'entity-extraction/basic-entities.json',
      'entity-extraction/complex-entities.json',
      'entity-extraction/proper-nouns.json',
      'entity-extraction/type-classification.json'
    ],
    component: 'EntityExtractor'
  },
  'role-assignment': {
    files: [
      'role-assignment/basic-roles.json',
      'role-assignment/indirect-roles.json',
      'role-assignment/complex-roles.json',
      'role-assignment/role-ambiguity.json'
    ],
    component: 'RoleDetector'
  },
  'argument-linking': {
    files: [
      'argument-linking/basic-linking.json',
      'argument-linking/role-reification.json',
      'argument-linking/participant-collection.json',
      'argument-linking/inverse-properties.json',
      'argument-linking/tier-separation.json'
    ],
    component: 'ArgumentLinker'
  }
  // Future categories:
  // 'boundary-enforcement': { files: [...], component: 'CrossComponent' }
};

// ============================================================================
// Tree Format Normalization
// ============================================================================

/**
 * Normalize tree pipeline output so act nodes have inline role properties.
 *
 * The tree pipeline uses separate Role nodes:
 *   Role { tagteam:bearer → entity, tagteam:realizedIn → act }
 *
 * The legacy pipeline puts roles directly on acts:
 *   Act { cco:has_agent → entity, cco:affects → entity }
 *
 * This function detects tree format and materializes role links onto act nodes,
 * plus adds tagteam:verb from rdfs:label/tagteam:lemma for compatibility.
 */
function normalizeGraphForAnalysis(result) {
  if (!result || !result['@graph']) return result;

  const graph = result['@graph'];

  // Detect tree format: acts typed as tagteam:VerbPhrase
  const isTreeFormat = graph.some(n =>
    (n['@type'] || []).includes('tagteam:VerbPhrase')
  );

  if (!isTreeFormat) return result; // Legacy format, no normalization needed

  // Map from role rdfs:label to property name (post-IRI cleanup: roles are bfo:Role)
  const roleToProperty = {
    'AgentRole': 'has_agent',
    'PatientRole': 'affects',
    'RecipientRole': 'has_recipient',
    'BeneficiaryRole': 'tagteam:has_beneficiary',
    'InstrumentRole': 'tagteam:has_instrument',
    'LocationRole': 'tagteam:has_location',
    'SourceRole': 'tagteam:has_source',
    'DestinationRole': 'tagteam:has_destination',
    'ComitativeRole': 'tagteam:has_comitative',
    'CauseRole': 'tagteam:has_cause'
  };

  // Find all Role nodes (bfo:Role after IRI cleanup) and materialize them onto acts
  const roleNodes = graph.filter(n =>
    (n['@type'] || []).includes('bfo:Role')
  );

  roleNodes.forEach(role => {
    const actRef = role['tagteam:realizedIn'];
    const entityRef = role['tagteam:bearer'];
    if (!actRef || !entityRef) return;

    const actId = typeof actRef === 'string' ? actRef : actRef['@id'];
    const entityId = typeof entityRef === 'string' ? entityRef : entityRef['@id'];

    const act = graph.find(n => n['@id'] === actId);
    if (!act) return;

    // Determine which property to set from role's rdfs:label
    const roleLabel = role['rdfs:label'] || role['tagteam:roleType'];
    if (!roleLabel || !roleToProperty[roleLabel]) return;

    const prop = roleToProperty[roleLabel];

    // Resolve to Tier 2 entity if available (for tier-separation compatibility).
    // Legacy format links acts to Tier 2 (owl:NamedIndividual) entities.
    const bearerEntity = graph.find(n => n['@id'] === entityId);
    let targetId = entityId;
    if (bearerEntity && bearerEntity['is_about']) {
      const aboutRef = bearerEntity['is_about'];
      targetId = typeof aboutRef === 'string' ? aboutRef : aboutRef['@id'];
    }

    // Set or append the property on the act
    if (act[prop]) {
      // Already has this property — make array
      if (!Array.isArray(act[prop])) act[prop] = [act[prop]];
      act[prop].push({ '@id': targetId });
    } else {
      act[prop] = { '@id': targetId };
    }

    // Also add has_participant for participant collection tests
    if (!act['has_participant']) act['has_participant'] = [];
    if (!Array.isArray(act['has_participant'])) {
      act['has_participant'] = [act['has_participant']];
    }
    const already = act['has_participant'].some(p =>
      (typeof p === 'string' ? p : p['@id']) === targetId
    );
    if (!already) {
      act['has_participant'].push({ '@id': targetId });
    }
  });

  // Normalize act verb property: add tagteam:verb from rdfs:label (surface form).
  // Use rdfs:label (e.g. "created") rather than tagteam:lemma (may be truncated, e.g. "creat")
  // because component tests match via .includes() which handles inflected forms.
  // Also store tagteam:verbLemma for exact matching with irregular verbs.
  graph.forEach(node => {
    if ((node['@type'] || []).includes('tagteam:VerbPhrase') && !node['tagteam:verb']) {
      node['tagteam:verb'] = node['rdfs:label'] || node['tagteam:lemma'] || '';
      if (node['tagteam:lemma']) {
        node['tagteam:verbLemma'] = node['tagteam:lemma'];
      }
    }
  });

  // Promote Tier 2 domain types onto Tier 1 DiscourseReferent entities.
  // Tree pipeline stores domain types (Person, Artifact) on Tier 2 nodes
  // linked via cco:is_about. Component tests expect them on Tier 1.
  graph.forEach(node => {
    if (!(node['@type'] || []).includes('tagteam:DiscourseReferent')) return;
    const aboutRef = node['is_about'];
    if (!aboutRef) return;

    const aboutId = typeof aboutRef === 'string' ? aboutRef : aboutRef['@id'];
    const tier2 = graph.find(n => n['@id'] === aboutId);
    if (!tier2) return;

    // Promote domain types (cco:*, bfo:*) from Tier 2 to Tier 1
    (tier2['@type'] || []).forEach(t => {
      if (t === 'owl:NamedIndividual' || t === 'owl:Class') return; // Skip OWL markers
      if (!node['@type'].includes(t)) {
        node['@type'].push(t);
      }
    });
  });

  return result;
}

// ============================================================================
// Test Execution
// ============================================================================

/**
 * Run a single component test
 */
function runComponentTest(test) {
  try {
    // Run TagTeam.buildGraph
    const result = TagTeam.buildGraph(test.input, {
      preserveAmbiguity: true,
      returnJSON: true
    });

    // Normalize tree format for analysis compatibility
    const normalized = normalizeGraphForAnalysis(result);

    // Analyze result based on test category
    const analysis = analyzeResult(normalized, test);

    return {
      ...test,
      status: analysis.passed ? 'pass' : 'fail',
      actual: result,
      analysis: analysis,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      ...test,
      status: 'error',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Analyze TagTeam output against expected behavior
 */
function analyzeResult(result, test) {
  const analysis = {
    passed: false,
    issues: [],
    observations: []
  };

  // Extract acts from JSON-LD @graph
  // Support both legacy (tagteam:verb) and tree (tagteam:VerbPhrase) formats
  const acts = result['@graph'] ? result['@graph'].filter(node =>
    node['tagteam:verb'] ||
    (node['@type'] || []).includes('tagteam:VerbPhrase')
  ) : [];

  // Category-specific analysis
  if (test.category.startsWith('prefix-subordination')) {
    return analyzePrefixSubordination(acts, result, test);
  } else if (test.category.startsWith('relative-clause')) {
    return analyzeRelativeClause(acts, result, test);
  } else if (test.category.startsWith('entity-extraction')) {
    return analyzeEntityExtraction(result, test);
  } else if (test.category.startsWith('role-assignment')) {
    return analyzeRoleAssignment(acts, result, test);
  } else if (test.category.startsWith('argument-linking')) {
    return analyzeArgumentLinking(acts, result, test);
  }

  // Default analysis
  analysis.observations.push(`Found ${acts.length} acts in output`);
  return analysis;
}

/**
 * Analyze prefix subordination test
 */
function analyzePrefixSubordination(acts, result, test) {
  const analysis = {
    passed: false,
    issues: [],
    observations: []
  };

  // Expected: 2 acts (subordinate clause + main clause)
  const expectedActCount = 2;
  const actualActCount = acts.length;

  analysis.observations.push(`Expected ${expectedActCount} acts, found ${actualActCount}`);

  if (actualActCount !== expectedActCount) {
    analysis.issues.push(`Wrong act count: expected ${expectedActCount}, got ${actualActCount}`);
  }

  // Check for argument bleeding across comma boundary
  // In "If X fails, Y receives Z", "fails" should NOT have Y or Z as arguments
  const commaPos = test.input.indexOf(',');
  if (commaPos !== -1) {
    const beforeComma = test.input.substring(0, commaPos).toLowerCase();
    const afterComma = test.input.substring(commaPos + 1).toLowerCase();

    acts.forEach((act, idx) => {
      const verb = act['tagteam:verb'] || '';
      const actStart = act['tagteam:startPosition'];

      // Check if this act's position is in the prefix clause (before comma)
      if (actStart !== undefined && actStart < commaPos) {
        // This act should only reference entities from BEFORE comma
        const args = [];
        if (act['has_agent']) args.push({ role: 'agent', value: act['has_agent'] });
        if (act['affects']) args.push({ role: 'affects', value: act['affects'] });

        // Check if any argument references text from AFTER comma
        args.forEach(arg => {
          const argId = typeof arg.value === 'string' ? arg.value : arg.value['@id'];

          // Find entity in @graph
          const entity = result['@graph'].find(node => node['@id'] === argId);
          if (entity && entity['rdfs:label']) {
            const entityLabel = entity['rdfs:label'].toLowerCase().replace('entity of ', '');

            // Check if entity text appears after comma
            if (afterComma.includes(entityLabel)) {
              analysis.issues.push(
                `ARGUMENT BLEEDING: Act "${verb}" (before comma) has ${arg.role} "${entity['rdfs:label']}" (after comma)`
              );
            }
          }
        });
      }
    });
  }

  // Check for clause relation
  const hasClauseRelation = result['@graph'].some(node =>
    node['@type'] && (
      node['@type'].some(t => t.includes('ClauseRelation')) ||  // Check if any type includes 'ClauseRelation'
      node['tagteam:clauseRelation']
    )
  );

  if (!hasClauseRelation) {
    analysis.issues.push('No clause relation detected (subordination not recognized)');
  } else {
    analysis.observations.push('Clause relation detected');
  }

  analysis.passed = analysis.issues.length === 0;
  return analysis;
}

/**
 * Analyze relative clause test
 */
function analyzeRelativeClause(acts, result, test) {
  const analysis = {
    passed: false,
    issues: [],
    observations: []
  };

  // Extract relativizer from test
  const relativizers = ['who', 'which', 'that', 'whom', 'whose'];
  const usedRelativizer = relativizers.find(rel => test.input.toLowerCase().includes(` ${rel} `));

  if (usedRelativizer) {
    // Check if relativizer was instantiated as separate entity
    const relativizerEntity = result['@graph'].find(node =>
      node['rdfs:label'] &&
      node['rdfs:label'].toLowerCase().includes(usedRelativizer)
    );

    if (relativizerEntity) {
      analysis.issues.push(
        `FRAGMENTATION: Relativizer "${usedRelativizer}" instantiated as separate entity: ${relativizerEntity['@id']}`
      );
    } else {
      analysis.observations.push(`Relativizer "${usedRelativizer}" not instantiated (good)`);
    }

    // Check for anaphoric link
    const hasAnaphoricLink = result['@graph'].some(node =>
      node['tagteam:anaphor'] ||
      node['tagteam:antecedent'] ||
      (node['@type'] && node['@type'].includes('AnaphoricLink'))
    );

    if (!hasAnaphoricLink) {
      analysis.issues.push('No anaphoric link detected (relative clause not recognized)');
    } else {
      analysis.observations.push('Anaphoric link detected');
    }
  }

  // Check for subject bleeding
  // In "The X who Y the Z V", the subject of V should be X, not Z
  if (acts.length > 0) {
    const mainAct = acts[acts.length - 1]; // Assume last act is main clause verb
    const expectedSubject = test.expected.clauses[0].mainClause.subject.toLowerCase();

    if (mainAct['has_agent']) {
      const agentId = typeof mainAct['has_agent'] === 'string'
        ? mainAct['has_agent']
        : mainAct['has_agent']['@id'];

      const agent = result['@graph'].find(node => node['@id'] === agentId);
      if (agent && agent['rdfs:label']) {
        const actualSubject = agent['rdfs:label'].toLowerCase().replace('entity of ', '');

        if (!actualSubject.includes(expectedSubject.replace('the ', ''))) {
          analysis.issues.push(
            `SUBJECT BLEEDING: Expected subject "${expectedSubject}", got "${agent['rdfs:label']}"`
          );
        } else {
          analysis.observations.push(`Correct subject: ${agent['rdfs:label']}`);
        }
      }
    }
  }

  analysis.passed = analysis.issues.length === 0;
  return analysis;
}

/**
 * Analyze role assignment test
 */
function analyzeRoleAssignment(acts, result, test) {
  const analysis = {
    passed: false,
    issues: [],
    observations: []
  };

  const expectedRoles = test.expected.roles || [];

  analysis.observations.push(`Expected ${expectedRoles.length} role assignments`);

  // Mapping from role label to property names (post-IRI cleanup)
  const rolePropertyMap = {
    'AgentRole': ['has_agent', 'tagteam:agent_in'],
    'PatientRole': ['affects', 'tagteam:patient_in'],
    'RecipientRole': ['has_recipient', 'tagteam:recipient'],
    'BeneficiaryRole': ['tagteam:has_beneficiary', 'tagteam:beneficiary'],
    'InstrumentRole': ['tagteam:has_instrument', 'tagteam:instrument'],
    'LocationRole': ['tagteam:has_location', 'tagteam:located_in'],
    'SourceRole': ['tagteam:has_source', 'tagteam:source'],
    'DestinationRole': ['tagteam:has_destination', 'tagteam:destination'],
    'ComitativeRole': ['tagteam:has_comitative', 'tagteam:comitative'],
    'CauseRole': ['tagteam:has_cause', 'tagteam:cause']
  };

  // For each expected role assignment
  expectedRoles.forEach(expected => {
    const verb = expected.verb.toLowerCase();
    const entityText = expected.entity.toLowerCase();
    const roleType = expected.role;

    // Find act with matching verb
    const matchingAct = acts.find(act => {
      const actVerb = (act['tagteam:verb'] || '').toLowerCase();
      const actLemma = (act['tagteam:verbLemma'] || '').toLowerCase();
      return actVerb === verb || actVerb.includes(verb) || verb.includes(actVerb) || actLemma === verb || actLemma.includes(verb) || verb.includes(actLemma);
    });

    if (!matchingAct) {
      analysis.issues.push(`No act found for verb "${verb}"`);
      return;
    }

    // Get properties to check for this role type
    const propertiesToCheck = rolePropertyMap[roleType] || [];

    // Check if any of the role properties exist and reference the expected entity
    let foundRole = false;
    for (const prop of propertiesToCheck) {
      if (matchingAct[prop]) {
        const roleValue = matchingAct[prop];
        const entityId = typeof roleValue === 'string' ? roleValue : roleValue['@id'];

        // Find entity in @graph
        const entity = result['@graph'].find(node => node['@id'] === entityId);
        if (entity && entity['rdfs:label']) {
          const entityLabel = entity['rdfs:label'].toLowerCase().replace('entity of ', '');

          // Check if entity matches expected text
          if (entityLabel.includes(entityText) || entityText.includes(entityLabel)) {
            foundRole = true;
            analysis.observations.push(
              `✓ Found ${roleType} for "${verb}": "${entity['rdfs:label']}" via ${prop}`
            );
            break;
          }
        }
      }
    }

    if (!foundRole) {
      analysis.issues.push(
        `Missing ${roleType} for verb "${verb}": expected entity "${expected.entity}"`
      );
    }
  });

  analysis.passed = analysis.issues.length === 0;
  return analysis;
}

/**
 * Analyze argument linking test
 */
function analyzeArgumentLinking(acts, result, test) {
  const analysis = {
    passed: false,
    issues: [],
    observations: []
  };

  const expectedLinks = test.expected.links || [];
  const expectedAssertions = test.expected.assertions || [];
  const expectedInverseLinks = test.expected.inverseLinks || [];
  const forbiddenLinks = test.expected.forbidden || [];

  // Check forward property links (act -> entity)
  expectedLinks.forEach(expected => {
    const verb = expected.act.toLowerCase();
    const property = expected.property;

    // Find act with matching verb
    const matchingAct = acts.find(act => {
      const actVerb = (act['tagteam:verb'] || '').toLowerCase();
      const actLemma = (act['tagteam:verbLemma'] || '').toLowerCase();
      return actVerb === verb || actVerb.includes(verb) || verb.includes(actVerb) || actLemma === verb || actLemma.includes(verb) || verb.includes(actLemma);
    });

    if (!matchingAct) {
      analysis.issues.push(`No act found for verb "${verb}"`);
      return;
    }

    // Check if expected property exists
    if (expected.target) {
      // Single target
      const targetEntity = expected.target.toLowerCase();

      if (!matchingAct[property]) {
        analysis.issues.push(`Missing property ${property} on act "${verb}"`);
        return;
      }

      const propValue = matchingAct[property];
      const entityId = typeof propValue === 'string' ? propValue : propValue['@id'];

      // Find entity in @graph
      const entity = result['@graph'].find(node => node['@id'] === entityId);
      if (!entity) {
        analysis.issues.push(`Property ${property} references non-existent entity ${entityId}`);
        return;
      }

      const entityLabel = (entity['rdfs:label'] || '').toLowerCase().replace('entity of ', '');
      if (!entityLabel.includes(targetEntity) && !targetEntity.includes(entityLabel)) {
        analysis.issues.push(
          `Wrong target for ${property}: expected "${expected.target}", got "${entity['rdfs:label']}"`
        );
      } else {
        analysis.observations.push(`✓ ${property}: "${verb}" → "${entity['rdfs:label']}"`);
      }

      // Check target type if specified
      if (expected.targetType) {
        const entityTypes = entity['@type'] || [];
        const hasExpectedType = entityTypes.some(t =>
          t.includes(expected.targetType.replace('cco:', '').replace('bfo:', ''))
        );

        if (!hasExpectedType) {
          analysis.issues.push(
            `Wrong type for ${property} target: expected ${expected.targetType}, got ${entityTypes.join(', ')}`
          );
        }
      }
    } else if (expected.targets) {
      // Multiple targets (for has_participant)
      if (!matchingAct[property]) {
        analysis.issues.push(`Missing property ${property} on act "${verb}"`);
        return;
      }

      // Property could be array or single value
      const propValues = Array.isArray(matchingAct[property])
        ? matchingAct[property]
        : [matchingAct[property]];

      analysis.observations.push(
        `Found ${propValues.length} ${property} links for "${verb}"`
      );

      // Check if all expected targets are present
      expected.targets.forEach(targetText => {
        const found = propValues.some(pv => {
          const entityId = typeof pv === 'string' ? pv : pv['@id'];
          const entity = result['@graph'].find(node => node['@id'] === entityId);
          if (entity && entity['rdfs:label']) {
            const label = entity['rdfs:label'].toLowerCase().replace('entity of ', '');
            return label.includes(targetText.toLowerCase()) ||
                   targetText.toLowerCase().includes(label);
          }
          return false;
        });

        if (!found) {
          analysis.issues.push(
            `Missing ${property} link for "${verb}" to "${targetText}"`
          );
        }
      });
    }
  });

  // Check forbidden links (tier separation tests)
  forbiddenLinks.forEach(forbidden => {
    const verb = forbidden.act.toLowerCase();
    const property = forbidden.property;
    const targetPattern = forbidden.targetPattern;

    const matchingAct = acts.find(act => {
      const actVerb = (act['tagteam:verb'] || '').toLowerCase();
      const actLemma = (act['tagteam:verbLemma'] || '').toLowerCase();
      return actVerb === verb || actVerb.includes(verb) || verb.includes(actVerb) || actLemma === verb || actLemma.includes(verb) || verb.includes(actLemma);
    });

    if (matchingAct && matchingAct[property]) {
      const propValue = matchingAct[property];
      const entityId = typeof propValue === 'string' ? propValue : propValue['@id'];

      // Find entity in @graph
      const entity = result['@graph'].find(node => node['@id'] === entityId);
      if (entity) {
        const entityTypes = entity['@type'] || [];
        const hasForbiddenType = entityTypes.some(t => t.includes(targetPattern));

        if (hasForbiddenType) {
          analysis.issues.push(
            `FORBIDDEN: Act "${verb}" has ${property} linking to ${targetPattern} (${forbidden.reason})`
          );
        }
      }
    }
  });

  analysis.passed = analysis.issues.length === 0;
  return analysis;
}

/**
 * Analyze entity extraction test
 */
function analyzeEntityExtraction(result, test) {
  const analysis = {
    passed: false,
    issues: [],
    observations: []
  };

  // Extract entities from JSON-LD @graph
  const entities = result['@graph'] ? result['@graph'].filter(node =>
    node['@type'] && node['@type'].includes('tagteam:DiscourseReferent')
  ) : [];

  const expectedEntities = test.expected.entities || [];

  analysis.observations.push(`Expected ${expectedEntities.length} entities, found ${entities.length}`);

  // Check entity count
  if (entities.length !== expectedEntities.length) {
    analysis.issues.push(`Wrong entity count: expected ${expectedEntities.length}, got ${entities.length}`);
  }

  // For each expected entity, check if it exists and has correct properties
  expectedEntities.forEach(expected => {
    const matchingEntity = entities.find(e => {
      const label = e['rdfs:label'] || '';
      const expectedText = expected.text.toLowerCase();
      return label.toLowerCase().includes(expectedText) ||
             expectedText.includes(label.toLowerCase().replace('entity of ', ''));
    });

    if (!matchingEntity) {
      analysis.issues.push(`Missing entity: "${expected.text}"`);
      return;
    }

    analysis.observations.push(`Found entity: "${matchingEntity['rdfs:label']}"`);

    // Check entity type if specified
    if (expected.type) {
      const entityTypes = matchingEntity['@type'] || [];
      const hasExpectedType = entityTypes.some(t => t.includes(expected.type.replace('cco:', '').replace('bfo:', '')));

      if (!hasExpectedType) {
        analysis.issues.push(
          `Wrong type for "${expected.text}": expected ${expected.type}, got ${entityTypes.join(', ')}`
        );
      } else {
        analysis.observations.push(`Correct type for "${expected.text}": ${expected.type}`);
      }
    }

    // Check definiteness if specified (basic check - this would need refinement)
    if (expected.definiteness) {
      const label = matchingEntity['rdfs:label'] || '';
      const startsWithThe = label.toLowerCase().startsWith('the ');
      const startsWithA = label.toLowerCase().match(/^a(n)? /);

      if (expected.definiteness === 'definite' && !startsWithThe && !expected.properNoun) {
        analysis.observations.push(`Note: "${expected.text}" expected definite ("the ...")`);
      } else if (expected.definiteness === 'indefinite' && !startsWithA) {
        analysis.observations.push(`Note: "${expected.text}" expected indefinite ("a/an ...")`);
      }
    }
  });

  analysis.passed = analysis.issues.length === 0;
  return analysis;
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(results) {
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    errors: results.filter(r => r.status === 'error').length,
    timestamp: new Date().toISOString()
  };

  summary.passRate = ((summary.passed / summary.total) * 100).toFixed(1);
  summary.failRate = ((summary.failed / summary.total) * 100).toFixed(1);

  // Group by category
  const byCategory = {};
  results.forEach(r => {
    if (!byCategory[r.category]) {
      byCategory[r.category] = { total: 0, passed: 0, failed: 0, errors: 0 };
    }
    byCategory[r.category].total++;
    byCategory[r.category][r.status]++;
  });

  // Group by priority
  const byPriority = {};
  results.forEach(r => {
    const priority = r.priority || 'P2';
    if (!byPriority[priority]) {
      byPriority[priority] = { total: 0, passed: 0, failed: 0, errors: 0 };
    }
    byPriority[priority].total++;
    byPriority[priority][r.status]++;
  });

  return {
    summary,
    byCategory,
    byPriority,
    results
  };
}

function printReport(report) {
  console.log('\n' + '='.repeat(80));
  console.log('LEVEL 1: COMPONENT TEST RESULTS');
  console.log('='.repeat(80));

  const { summary, byCategory, byPriority } = report;

  console.log(`\n📊 Overall Summary:`);
  console.log(`   Total:  ${summary.total} tests`);
  console.log(`   ✅ Pass:  ${summary.passed} (${summary.passRate}%)`);
  console.log(`   ❌ Fail:  ${summary.failed} (${summary.failRate}%)`);
  console.log(`   ⚠️  Error: ${summary.errors}`);

  console.log(`\n📁 By Category:`);
  Object.entries(byCategory).forEach(([category, stats]) => {
    const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
    const icon = stats.passed === stats.total ? '✅' : stats.passed > 0 ? '⚠️ ' : '❌';
    console.log(`   ${icon} ${category}: ${stats.passed}/${stats.total} (${passRate}%)`);
  });

  console.log(`\n🎯 By Priority:`);
  ['P0', 'P1', 'P2'].forEach(priority => {
    if (byPriority[priority]) {
      const stats = byPriority[priority];
      const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
      const icon = stats.passed === stats.total ? '✅' : stats.failed > 0 ? '❌' : '⚠️ ';
      console.log(`   ${icon} ${priority}: ${stats.passed}/${stats.total} (${passRate}%)`);
    }
  });

  // Show failures
  const failures = report.results.filter(r => r.status === 'fail');
  if (failures.length > 0) {
    console.log(`\n❌ Failures (${failures.length}):`);
    failures.forEach(f => {
      console.log(`\n   ${f.id} - ${f.priority || 'P2'}`);
      console.log(`   Input: "${f.input}"`);
      if (f.analysis && f.analysis.issues) {
        f.analysis.issues.forEach(issue => {
          console.log(`      • ${issue}`);
        });
      }
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Tests that FAIL are VALUABLE - they show us what to fix!');
  console.log('='.repeat(80) + '\n');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const categoryFilter = args.find(arg => arg.startsWith('--category='))?.split('=')[1];
  const verbose = args.includes('--verbose');

  console.log('🔬 Running Level 1 Component Tests...\n');

  // Ensure results directory exists
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  // Load and run tests
  const allResults = [];

  for (const [category, config] of Object.entries(CATEGORIES)) {
    // Skip if category filter specified and doesn't match
    if (categoryFilter && category !== categoryFilter) {
      continue;
    }

    console.log(`📂 Category: ${category} (${config.component})`);

    for (const file of config.files) {
      const filePath = path.join(COMPONENT_TEST_DIR, file);

      if (!fs.existsSync(filePath)) {
        console.log(`   ⚠️  File not found: ${file}`);
        continue;
      }

      const tests = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`   📄 ${path.basename(file)}: ${tests.length} tests`);

      for (const test of tests) {
        const result = runComponentTest(test);
        allResults.push(result);

        if (verbose) {
          const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️ ';
          console.log(`      ${icon} ${result.id}`);
        }
      }
    }
  }

  // Generate and print report
  const report = generateReport(allResults);
  printReport(report);

  // Save full report to JSON
  const reportPath = path.join(RESULTS_DIR, 'component-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📝 Full report saved to: ${reportPath}\n`);

  // Exit with non-zero if any failures (for CI/CD)
  // Note: Failures are EXPECTED on V7.0, so we DON'T fail CI here
  // This is different from golden tests - component tests are diagnostic
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
