/**
 * TreeRoleMapper.js — UD v2 → BFO/CCO Role Mapping
 *
 * Source: TagTeam-Major-Refactor-v2.2.md §Phase 3A (AC-3.12, AC-3.13)
 * Authority: UD v2, BFO 2.0, CCO v1.5
 *
 * Maps entities to semantic roles using UD dependency labels.
 * Consumes RoleMappingContract as single source of truth.
 *
 * Handles:
 *   - Core argument roles: nsubj→Agent, obj→Patient, iobj→Recipient (AC-3.12)
 *   - Passive role inversion: nsubj:pass→Patient, obl+by→Agent (AC-3.12)
 *   - Oblique role subtyping by preposition (AC-3.13)
 */

'use strict';

let RoleMappingContract;
try {
  RoleMappingContract = require('../core/RoleMappingContract');
} catch (e) {
  RoleMappingContract = null;
}

// ============================================================================
// TreeRoleMapper
// ============================================================================

class TreeRoleMapper {
  constructor() {}

  /**
   * Map entities to semantic roles based on their positions in the dep tree.
   *
   * For each act's verb token, iterate its children in the DepTree and assign
   * roles based on the UD dependency labels using RoleMappingContract.
   *
   * @param {Entity[]} entities - Extracted entities with headId and role properties
   * @param {Act[]} acts - Extracted acts with verbId property
   * @param {DepTree} depTree - Dependency tree
   * @returns {Role[]} Array of role assignments
   */
  map(entities, acts, depTree) {
    const roles = [];

    // Build entity lookup by headId for fast matching
    const entityByHead = new Map();
    for (const entity of entities) {
      entityByHead.set(entity.headId, entity);
      // Also index by all indices in the entity span
      if (entity.indices) {
        for (const idx of entity.indices) {
          if (!entityByHead.has(idx)) {
            entityByHead.set(idx, entity);
          }
        }
      }
    }

    for (const act of acts) {
      const verbId = act.verbId;
      if (!verbId) continue;

      const children = depTree.getChildren(verbId);

      for (const child of children) {
        const role = this._mapChildToRole(child, depTree, entityByHead, act);
        if (role) {
          roles.push(role);
          // Propagate role to coordinated conjuncts (UD: conj children inherit parent role)
          this._propagateToConjuncts(child, depTree, entityByHead, act, role, roles);
        }
      }
    }

    return roles;
  }

  /**
   * Map a single verb child to its semantic role.
   *
   * @param {Object} child - { dependent, label, word, tag }
   * @param {DepTree} depTree
   * @param {Map<number, Entity>} entityByHead
   * @param {Act} act
   * @returns {Role|null}
   */
  _mapChildToRole(child, depTree, entityByHead, act) {
    const label = child.label;

    // Skip non-entity-bearing labels
    if (!this._isEntityBearing(label)) return null;

    // Find the matching entity
    const entity = entityByHead.get(child.dependent);
    if (!entity) return null;

    // Special handling for obl: check for passive "by" agent and oblique subtyping
    if (label === 'obl') {
      return this._handleOblique(child, depTree, entity, act);
    }

    // Use RoleMappingContract for standard label mapping
    const mapping = RoleMappingContract
      ? RoleMappingContract.mapUDToRole(label)
      : this._fallbackMapping(label);

    if (!mapping) return null;

    return {
      role: mapping.role,
      entity: entity.fullText || entity.text,
      entityId: entity.headId,
      act: act.verb,
      actId: act.verbId,
      udLabel: label,
      note: mapping.note,
    };
  }

  /**
   * Handle oblique arguments with preposition-based subtyping.
   *
   * For obl dependents:
   *   1. Find the `case` child to get the preposition
   *   2. If "by" → AgentRole (passive agent)
   *   3. Otherwise → subtype via RoleMappingContract.mapCaseToOblique()
   *
   * @param {Object} child - The obl child
   * @param {DepTree} depTree
   * @param {Entity} entity
   * @param {Act} act
   * @returns {Role|null}
   */
  _handleOblique(child, depTree, entity, act) {
    // Find the case child of this obl token to get the preposition
    const oblChildren = depTree.getChildren(child.dependent);
    const caseChild = oblChildren.find(c => c.label === 'case');
    const preposition = caseChild ? caseChild.word.toLowerCase() : null;

    // Special case: "by" in passive → AgentRole
    if (preposition === 'by' && act.isPassive) {
      return {
        role: 'cco:AgentRole',
        entity: entity.fullText || entity.text,
        entityId: entity.headId,
        act: act.verb,
        actId: act.verbId,
        udLabel: 'obl:agent',
        note: 'Passive "by" phrase = agent',
      };
    }

    // Oblique subtyping by preposition
    let role = 'cco:ObliqueRole';
    let note = 'Oblique argument';

    if (preposition && RoleMappingContract) {
      const obliqueRole = RoleMappingContract.mapCaseToOblique(preposition);
      if (obliqueRole) {
        role = obliqueRole;
        note = `Oblique subtyped by "${preposition}"`;
      }
    } else if (preposition) {
      // Fallback oblique mapping without contract
      role = this._fallbackObliqueMapping(preposition);
      note = `Oblique subtyped by "${preposition}" (fallback)`;
    }

    return {
      role,
      entity: entity.fullText || entity.text,
      entityId: entity.headId,
      act: act.verb,
      actId: act.verbId,
      udLabel: 'obl',
      preposition,
      note,
    };
  }

  /**
   * Propagate a semantic role to coordinated conjuncts.
   * In UD, "Alice and Bob treated..." has Alice as nsubj of "treated"
   * and Bob as conj of Alice. Bob inherits Alice's AgentRole.
   *
   * @param {Object} child - The verb child that received the original role
   * @param {DepTree} depTree
   * @param {Map<number, Entity>} entityByHead
   * @param {Act} act
   * @param {Role} sourceRole - The role assigned to the source child
   * @param {Role[]} roles - Accumulator
   */
  _propagateToConjuncts(child, depTree, entityByHead, act, sourceRole, roles) {
    const sourceEntity = entityByHead.get(child.dependent);
    const conjChildren = depTree.getChildren(child.dependent);
    for (const conjChild of conjChildren) {
      if (conjChild.label !== 'conj') continue;
      const conjEntity = entityByHead.get(conjChild.dependent);
      if (!conjEntity) continue;
      // Skip if conjunct resolves to the same entity (un-split coordination like "doctors and nurses")
      if (conjEntity === sourceEntity) continue;
      roles.push({
        role: sourceRole.role,
        entity: conjEntity.fullText || conjEntity.text,
        entityId: conjEntity.headId,
        act: act.verb,
        actId: act.verbId,
        udLabel: sourceRole.udLabel,
        note: `Propagated from coordination (conj of ${sourceRole.entity})`,
      });
    }
  }

  /**
   * Check if a UD label is entity-bearing.
   */
  _isEntityBearing(label) {
    return ['nsubj', 'nsubj:pass', 'obj', 'iobj', 'obl', 'obl:agent'].includes(label);
  }

  /**
   * Fallback role mapping when RoleMappingContract is unavailable.
   */
  _fallbackMapping(label) {
    const map = {
      'nsubj': { role: 'cco:AgentRole', note: 'Active voice subject' },
      'obj': { role: 'cco:PatientRole', note: 'Direct object' },
      'iobj': { role: 'cco:RecipientRole', note: 'Indirect object' },
      'nsubj:pass': { role: 'cco:PatientRole', note: 'Passive subject = patient' },
      'obl:agent': { role: 'cco:AgentRole', note: 'Passive "by" phrase = agent' },
    };
    return map[label] || null;
  }

  /**
   * Fallback oblique subtyping when RoleMappingContract is unavailable.
   */
  _fallbackObliqueMapping(preposition) {
    const map = {
      'for': 'cco:BeneficiaryRole',
      'with': 'cco:InstrumentRole',
      'at': 'cco:LocationRole',
      'in': 'cco:LocationRole',
      'on': 'cco:LocationRole',
      'from': 'cco:SourceRole',
      'to': 'cco:DestinationRole',
      'by': 'cco:AgentRole',
      'about': 'cco:TopicRole',
      'against': 'cco:OpponentRole',
    };
    return map[preposition] || 'cco:ObliqueRole';
  }
}

// ============================================================================
// Exports
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TreeRoleMapper;
}
if (typeof window !== 'undefined') {
  window.TreeRoleMapper = TreeRoleMapper;
}
