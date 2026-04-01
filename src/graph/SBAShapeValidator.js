/**
 * SBAShapeValidator.js — JavaScript implementation of SBA SHACL shapes
 *
 * Source: TagTeam Sentence Boundary Architecture Specification v1.3 §6
 * Formal definitions: docs/development/tagteam-sba-shacl-v1.3.ttl
 *
 * Translates the 6 SPARQL-based SHACL shapes into pure JavaScript validators
 * operating on projected RDF nodes (from SBAProjection.projectToRDF) and the
 * original @graph nodes.
 *
 * Interface follows SHMLValidator.js pattern:
 *   validate(graphResult, projectedNodes?) → { valid, violations[], warnings[] }
 */

'use strict';

const { projectToRDF } = require('./SBAProjection');

// ============================================================================
// Helpers
// ============================================================================

const hasType = (n, t) => [].concat(n['@type'] || []).some(x => x.includes(t));

function findById(nodes, id) {
  return nodes.find(n => n['@id'] === id);
}

// ============================================================================
// §6.1 SBA_ForestStructureShape
// ============================================================================

/**
 * Validate arc indices are within sentence token bounds.
 */
function validateForestStructure(md) {
  const violations = [];
  for (const sent of (md.sentences || [])) {
    if (sent.segmentationType === 'section-header-inline') continue;
    const tokenCount = (sent.tokens || []).length;
    for (let j = 0; j < (sent.arcs || []).length; j++) {
      const arc = sent.arcs[j];
      // Allow 1-based root index (head=0 means root in dep parsing)
      if (arc.head !== undefined && arc.head !== null) {
        if (arc.head < 0 || arc.head > tokenCount) {
          violations.push(
            `ForestStructureViolation: arc ${j} in sentence ${sent.sentenceIndex} ` +
            `has head = ${arc.head}, out of range for ${tokenCount} tokens.`
          );
        }
      }
      if (arc.dependent !== undefined && arc.dependent !== null) {
        if (arc.dependent < 0 || arc.dependent > tokenCount) {
          violations.push(
            `ForestStructureViolation: arc ${j} in sentence ${sent.sentenceIndex} ` +
            `has dependent = ${arc.dependent}, out of range for ${tokenCount} tokens.`
          );
        }
      }
    }
  }
  return violations;
}

// ============================================================================
// §6.2 SBA_SentenceIndexShape
// ============================================================================

/**
 * Validate sentenceIndex present on all DiscourseReferent and VerbPhrase nodes.
 */
function validateSentenceIndex(graphNodes) {
  const violations = [];
  for (const node of graphNodes) {
    const types = [].concat(node['@type'] || []);
    const isDR = types.includes('tagteam:DiscourseReferent');
    const isVP = types.some(t => t.includes('VerbPhrase'));
    if (isDR || isVP) {
      const idx = node['tagteam:sentenceIndex'];
      if (idx === undefined || idx === null) {
        violations.push(
          `SentenceIndexViolation: ${node['@id'] || 'unknown'} (${isDR ? 'DiscourseReferent' : 'VerbPhrase'}) ` +
          `missing required tagteam:sentenceIndex.`
        );
      } else if (typeof idx !== 'number' || idx < 0 || !Number.isInteger(idx)) {
        violations.push(
          `SentenceIndexViolation: ${node['@id'] || 'unknown'} has invalid sentenceIndex: ${idx}.`
        );
      }
    }
  }
  return violations;
}

// ============================================================================
// §6.3 SBA_MentionPartitionShape
// ============================================================================

/**
 * Validate that documentTokenSpan does not cross sentence boundaries.
 */
function validateMentionPartition(graphNodes, md) {
  const violations = [];
  if (!md.sentences || md.sentences.length < 2) return violations;

  // Build boundary map: only non-parenthetical sentences define boundaries
  // Parenthetical children are nested within parent tokenSpans, so exclude them
  const boundaries = md.sentences
    .filter(s => !s.isParenthetical)
    .map(s => ({
      index: s.sentenceIndex,
      start: s.tokenSpan ? s.tokenSpan[0] : 0,
      end: s.tokenSpan ? s.tokenSpan[1] : 0,
    }));

  for (const node of graphNodes) {
    if (!hasType(node, 'DiscourseReferent')) continue;
    const span = node['tagteam:documentTokenSpan'];
    if (!span || !Array.isArray(span)) continue;

    const spanEnd = span[1];
    const sentIdx = node['tagteam:sentenceIndex'];
    if (sentIdx === undefined) continue;

    // Check if span crosses into next sentence
    const nextSent = boundaries.find(b => b.index === sentIdx + 1);
    if (nextSent && spanEnd >= nextSent.start) {
      const thisSent = boundaries.find(b => b.index === sentIdx);
      violations.push(
        `MentionPartitionViolation: ${node['@id'] || 'unknown'} has documentTokenSpan ` +
        `[${span[0]}, ${span[1]}] crossing boundary between sentence ${sentIdx} ` +
        `(ending at ${thisSent ? thisSent.end : '?'}) and sentence ${sentIdx + 1} ` +
        `(starting at ${nextSent.start}).`
      );
    }
  }
  return violations;
}

// ============================================================================
// §6.4 SBA_IBEProvenanceShape
// ============================================================================

/**
 * Validate all Tier 1 nodes share the same is_concretized_by target.
 * Only checks DiscourseReferent and VerbPhrase nodes (Tier 1), not Tier 2 entities.
 */
function validateIBEProvenance(graphNodes) {
  const violations = [];
  const ibeTargets = new Set();

  for (const node of graphNodes) {
    const types = [].concat(node['@type'] || []);
    const isTier1 = types.includes('tagteam:DiscourseReferent') ||
                    types.some(t => t.includes('VerbPhrase'));
    if (!isTier1) continue;

    const icb = node['is_concretized_by'] || node['tagteam:is_concretized_by'];
    if (!icb) continue;
    const target = typeof icb === 'string' ? icb : (icb['@id'] || '');
    if (target) ibeTargets.add(target);
  }

  if (ibeTargets.size > 1) {
    const iris = [...ibeTargets];
    violations.push(
      `IBEProvenanceViolation: Multiple IBE targets found: ${iris.join(', ')}. ` +
      `All Tier 1 nodes must share the same is_concretized_by target.`
    );
  }
  return violations;
}

// ============================================================================
// §6.5 SBA_SentenceRelationshipShape (5 constraint blocks)
// ============================================================================

/**
 * Validate SentenceRelationship integrity.
 */
function validateSentenceRelationships(md) {
  const violations = [];
  const sentences = md.sentences || [];
  const rels = md.sentenceRelationships || [];

  // Build sentence index set
  const sentIndices = new Set(sentences.map(s => s.sentenceIndex));

  // Block 1: Missing relationship for soft-boundary sentences
  for (const sent of sentences) {
    const stype = sent.segmentationType;
    if (stype === 'semicolon-conditional' || stype === 'numbered-list' || stype === 'enumeration') {
      const hasRel = rels.some(r =>
        r.fromSentenceIndex === sent.sentenceIndex ||
        r.toSentenceIndex === sent.sentenceIndex
      );
      if (!hasRel) {
        violations.push(
          `SentenceRelationshipViolation (missing): sentence ${sent.sentenceIndex} has ` +
          `segmentationType '${stype}' but no SentenceRelationship links it to an adjacent sentence.`
        );
      }
    }
  }

  // Block 2: Orphan relationships referencing non-existent sentences
  for (const rel of rels) {
    if (!sentIndices.has(rel.fromSentenceIndex)) {
      violations.push(
        `OrphanRelationshipViolation: SentenceRelationship references fromSentenceIndex ` +
        `${rel.fromSentenceIndex} which does not exist in sentences.`
      );
    }
    if (!sentIndices.has(rel.toSentenceIndex)) {
      violations.push(
        `OrphanRelationshipViolation: SentenceRelationship references toSentenceIndex ` +
        `${rel.toSentenceIndex} which does not exist in sentences.`
      );
    }
  }

  // Block 3: Adjacency — toSentenceIndex must equal fromSentenceIndex + 1
  for (const rel of rels) {
    if (rel.toSentenceIndex !== rel.fromSentenceIndex + 1) {
      violations.push(
        `RelationshipAdjacencyViolation: SentenceRelationship links sentences ` +
        `${rel.fromSentenceIndex} and ${rel.toSentenceIndex}, but toSentenceIndex must ` +
        `equal fromSentenceIndex + 1 (${rel.fromSentenceIndex + 1}).`
      );
    }
  }

  // Block 4: Duplicate relationships for same (from, to) pair
  const pairMap = new Map();
  for (const rel of rels) {
    const key = `${rel.fromSentenceIndex}-${rel.toSentenceIndex}`;
    if (pairMap.has(key)) {
      violations.push(
        `RelationshipDuplicateViolation: Multiple SentenceRelationship nodes for ` +
        `sentences ${rel.fromSentenceIndex} → ${rel.toSentenceIndex}.`
      );
    }
    pairMap.set(key, true);
  }

  // Block 5: Type-consistency between connector and relationship type
  const SEMICOLON_TYPES = new Set([
    'juxtaposition', 'elaboration', 'contrast', 'legal-proviso', 'legal-exception'
  ]);
  for (const rel of rels) {
    const conn = rel.logicalConnector;
    const rtype = rel.relationshipType;
    if (conn === 'enumeration' && rtype !== 'enumeration') {
      violations.push(
        `RelationshipTypeConsistencyViolation: logicalConnector '${conn}' requires ` +
        `relationshipType 'enumeration', got '${rtype}'.`
      );
    }
    if (conn === 'semicolon' && rtype === 'enumeration') {
      violations.push(
        `RelationshipTypeConsistencyViolation: logicalConnector 'semicolon' cannot have ` +
        `relationshipType 'enumeration'.`
      );
    }
    if (conn === 'semicolon' && !SEMICOLON_TYPES.has(rtype)) {
      violations.push(
        `RelationshipTypeConsistencyViolation: logicalConnector 'semicolon' requires ` +
        `relationshipType in {${[...SEMICOLON_TYPES].join(', ')}}, got '${rtype}'.`
      );
    }
  }

  return violations;
}

// ============================================================================
// §6.6 SBA_SentenceClusterShape
// ============================================================================

/**
 * Validate SentenceCluster partition integrity.
 */
function validateSentenceClusters(graphNodes) {
  const violations = [];

  const pa = graphNodes.find(n => (n['@id'] || '').includes('ParsingAct'));
  if (!pa) return violations;

  const clusters = graphNodes.filter(n => hasType(n, 'SentenceCluster'));
  const clusterMap = new Map(); // sentenceIndex → cluster
  for (const c of clusters) {
    clusterMap.set(c['tagteam:sentenceIndex'], c);
  }

  // Block 1: Node in wrong cluster
  for (const cluster of clusters) {
    const clusterIdx = cluster['tagteam:sentenceIndex'];
    const members = [
      ...(cluster['tagteam:hasDiscourseReferent'] || []),
      ...(cluster['tagteam:hasVerbPhrase'] || []),
    ];
    for (const ref of members) {
      const nodeId = typeof ref === 'string' ? ref : (ref['@id'] || '');
      const node = graphNodes.find(n => n['@id'] === nodeId);
      if (node && node['tagteam:sentenceIndex'] !== undefined &&
          node['tagteam:sentenceIndex'] !== clusterIdx) {
        violations.push(
          `SentenceClusterViolation: node ${nodeId} has sentenceIndex ` +
          `${node['tagteam:sentenceIndex']} but belongs to cluster with sentenceIndex ${clusterIdx}.`
        );
      }
    }
  }

  // Block 2: Node missing from any cluster
  const hasOutput = pa['has_output'] || [];
  for (const ref of hasOutput) {
    const nodeId = typeof ref === 'string' ? ref : (ref['@id'] || '');
    const node = graphNodes.find(n => n['@id'] === nodeId);
    if (!node) continue;
    const sentIdx = node['tagteam:sentenceIndex'];
    if (sentIdx === undefined) continue;

    const cluster = clusterMap.get(sentIdx);
    if (!cluster) {
      violations.push(
        `MissingClusterViolation: node ${nodeId} (sentenceIndex ${sentIdx}) ` +
        `is in has_output but no SentenceCluster exists for sentenceIndex ${sentIdx}.`
      );
      continue;
    }

    const inDR = (cluster['tagteam:hasDiscourseReferent'] || [])
      .some(r => (typeof r === 'string' ? r : r['@id']) === nodeId);
    const inVP = (cluster['tagteam:hasVerbPhrase'] || [])
      .some(r => (typeof r === 'string' ? r : r['@id']) === nodeId);
    if (!inDR && !inVP) {
      violations.push(
        `MissingClusterViolation: node ${nodeId} (sentenceIndex ${sentIdx}) ` +
        `is in has_output but not listed in any SentenceCluster.`
      );
    }
  }

  return violations;
}

// ============================================================================
// Main Validator
// ============================================================================

/**
 * Run all 6 SBA SHACL shape validations.
 *
 * @param {Object} graphResult - Output from TagTeam.buildGraph()
 * @returns {Object} { valid, violations[], shapeResults }
 */
function validate(graphResult) {
  const graph = graphResult['@graph'] || [];
  const md = graphResult._metadata || {};

  // Run projection (also validates TokenSpanCardinalityError)
  let projected;
  try {
    projected = projectToRDF(graphResult);
  } catch (e) {
    if (e.name === 'TokenSpanCardinalityError') {
      return {
        valid: false,
        violations: [e.message],
        shapeResults: { projection: { valid: false, violations: [e.message] } },
      };
    }
    throw e;
  }

  const results = {};
  const allViolations = [];

  // §6.1
  results.ForestStructure = validateForestStructure(md);
  allViolations.push(...results.ForestStructure);

  // §6.2
  results.SentenceIndex = validateSentenceIndex(graph);
  allViolations.push(...results.SentenceIndex);

  // §6.3
  results.MentionPartition = validateMentionPartition(graph, md);
  allViolations.push(...results.MentionPartition);

  // §6.4
  results.IBEProvenance = validateIBEProvenance(graph);
  allViolations.push(...results.IBEProvenance);

  // §6.5
  results.SentenceRelationship = validateSentenceRelationships(md);
  allViolations.push(...results.SentenceRelationship);

  // §6.6
  results.SentenceCluster = validateSentenceClusters(graph);
  allViolations.push(...results.SentenceCluster);

  return {
    valid: allViolations.length === 0,
    violations: allViolations,
    shapeResults: results,
    projectedNodeCount: projected.nodes.length,
  };
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  validate,
  validateForestStructure,
  validateSentenceIndex,
  validateMentionPartition,
  validateIBEProvenance,
  validateSentenceRelationships,
  validateSentenceClusters,
};
