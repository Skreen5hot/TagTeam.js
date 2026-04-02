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
   * @param {Object} [context] - { gazetteerTypes } — extended per TT-SPEC-RDM-A §7.2
   * @returns {Role[]} Array of role assignments
   */
  map(entities, acts, depTree, context) {
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

    const ctx = { ...(context || {}), entities, entityByHead };

    // Stative predicate suppression set
    const stativeSet = RoleMappingContract && RoleMappingContract.RMC_STATIVE_PREDICATES;

    for (const act of acts) {
      const verbId = act.verbId;
      if (!verbId) continue;

      // Suppress all roles for stative predicates in passive voice
      // ("is known as", "is composed of", "is divided into" — no event, no roles)
      if (act.isPassive && stativeSet) {
        const verbLc = (act.verb || '').toLowerCase();
        const lemmaLc = (act.lemma || '').toLowerCase();
        if (stativeSet.has(verbLc) || stativeSet.has(lemmaLc)) continue;
      }

      const children = depTree.getChildren(verbId);

      for (const child of children) {
        const role = this._mapChildToRole(child, depTree, entityByHead, act, ctx);
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
   * @param {Object} [context] - { arcs, gazetteerTypes, entities }
   * @returns {Role|null}
   */
  _mapChildToRole(child, depTree, entityByHead, act, context) {
    const label = child.label;

    // Skip non-entity-bearing labels
    if (!this._isEntityBearing(label)) return null;

    // Find the matching entity
    const entity = entityByHead.get(child.dependent);
    if (!entity) return null;

    // Special handling for obl/obl:agent: check for passive "by" agent and oblique subtyping
    if (label === 'obl' || label === 'obl:agent') {
      return this._handleOblique(child, depTree, entity, act, context);
    }

    // Passive role flip: if act is passive and label is nsubj (not nsubj:pass),
    // the dep parser missed the :pass suffix — flip to PatientRole
    let effectiveLabel = label;
    if (label === 'nsubj' && act.isPassive) {
      effectiveLabel = 'nsubj:pass'; // Force patient mapping for passive subjects
    }

    // Use RoleMappingContract for standard label mapping
    const mapping = RoleMappingContract
      ? RoleMappingContract.mapUDToRole(effectiveLabel)
      : this._fallbackMapping(effectiveLabel);

    if (!mapping) return null;

    return {
      role: mapping.role,
      label: mapping.label || mapping.role,
      entity: entity.fullText || entity.text,
      entityId: entity.headId,
      act: act.verb,
      actId: act.verbId,
      udLabel: label,
      note: mapping.note + (label !== effectiveLabel ? ' (passive-flipped)' : ''),
    };
  }

  /**
   * Handle oblique arguments with preposition-based subtyping.
   *
   * For obl dependents:
   *   1. Find the `case` child to get the preposition
   *   2. If "by" → AgentRole (passive agent)
   *   3. If "to" → run resolveToPPRole() (TT-SPEC-RDM-A §5)
   *   4. Otherwise → subtype via RoleMappingContract.mapCaseToOblique()
   *
   * @param {Object} child - The obl child
   * @param {DepTree} depTree
   * @param {Entity} entity
   * @param {Act} act
   * @param {Object} [context] - { arcs, gazetteerTypes, entities }
   * @returns {Role|null}
   */
  _handleOblique(child, depTree, entity, act, context) {
    // Find the case child of this obl token to get the preposition
    const oblChildren = depTree.getChildren(child.dependent);
    const caseChild = oblChildren.find(c => c.label === 'case');
    const preposition = caseChild ? caseChild.word.toLowerCase() : null;

    // Special case: "by" in passive → AgentRole
    // Guard: obl:agent label requires "by" preposition. If parser mislabels
    // a non-by PP as obl:agent, downgrade to plain obl and route normally.
    if (child.label === 'obl:agent' && preposition !== 'by') {
      // Fall through to normal obl handling below
    } else if (preposition === 'by' && act.isPassive) {
      return {
        role: 'Role',
        label: 'AgentRole',
        entity: entity.fullText || entity.text,
        entityId: entity.headId,
        act: act.verb,
        actId: act.verbId,
        udLabel: 'obl:agent',
        note: 'Passive "by" phrase = agent',
      };
    }

    // to-PP: run priority resolution algorithm (TT-SPEC-RDM-A §5)
    if (preposition === 'to') {
      const resolved = this._resolveToPPRole(act, child, depTree, entity, context);
      if (resolved === 'SUPPRESS') {
        return null; // No RoleAssertion — entity extracted as DR only
      }
      if (resolved) {
        return {
          role: 'Role',
          label: resolved,
          entity: entity.fullText || entity.text,
          entityId: entity.headId,
          act: act.verb,
          actId: act.verbId,
          udLabel: 'obl',
          preposition: 'to',
          note: `to-PP resolved to ${resolved} (§5 algorithm)`,
        };
      }
      // null → fall through to default DestinationRole via contract
    }

    // Oblique subtyping by preposition
    let role = 'ObliqueRole';
    let note = 'Oblique argument';

    if (preposition && RoleMappingContract) {
      const obliqueRole = RoleMappingContract.mapCaseToOblique(preposition);
      if (obliqueRole) {
        role = obliqueRole;
        note = `Oblique subtyped by "${preposition}"`;
      }
    } else if (preposition) {
      // Fallback oblique mapping without contract — verb-aware
      role = this._fallbackObliqueMapping(preposition, act.lemma);
      note = `Oblique subtyped by "${preposition}" (fallback)`;
    }

    return {
      role: 'Role',
      label: role,
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
   * Unified to-PP Resolution Algorithm (TT-SPEC-RDM-A §5).
   *
   * @param {Act} act - Governing verb act
   * @param {Object} child - The obl child token
   * @param {DepTree} depTree
   * @param {Entity} entity - The to-PP head entity
   * @param {Object} [context] - { arcs, gazetteerTypes, entities }
   * @returns {string|null} 'RecipientRole', 'SUPPRESS', or null (use default)
   */
  _resolveToPPRole(act, child, depTree, entity, context) {
    const ctx = context || {};

    // Step 1: Infinitival to guard — if head is VERB/AUX, not a role-bearing PP
    const tag = child.tag || '';
    if (tag.startsWith('VB') || tag === 'AUX' || tag === 'TO') {
      return null;
    }

    // Step 2: iobj priority guard — if verb already has iobj, don't override
    if (depTree) {
      const verbChildren = depTree.getChildren(act.verbId);
      if (verbChildren.some(c => c.label === 'iobj')) {
        return null;
      }
    }

    // Normalize verb for registry lookup
    const verbLemma = (act.lemma || act.verb || '').toLowerCase();

    // Access registries (may be null in browser bundle if contract not loaded)
    const ditransitiveSet = RoleMappingContract && RoleMappingContract.RMC_DITRANSITIVE_VERBS;
    const nonRolePPSet = RoleMappingContract && RoleMappingContract.RMC_NON_ROLE_PP_VERBS_PASSIVE;

    // Step 3: Passive stative/perception suppression
    if (act.isPassive && nonRolePPSet) {
      const verbToken = (act.verb || '').toLowerCase();
      if (nonRolePPSet.has(verbLemma) || nonRolePPSet.has(verbToken)) {
        return 'SUPPRESS';
      }
    }

    // Step 4: Ditransitive verb check
    const isDitransitive = ditransitiveSet &&
      (ditransitiveSet.has(verbLemma) ||
       ditransitiveSet.has((act.verb || '').toLowerCase()));
    if (!isDitransitive) {
      return null; // Use DestinationRole default
    }

    // Step 5: Animacy check (§3.3)
    if (this._isAnimate(entity, ctx)) {
      // Step 6: Assign RecipientRole
      return 'RecipientRole';
    }

    return null; // Not animate → use DestinationRole default
  }

  /**
   * Animacy detection (TT-SPEC-RDM-A §3.3).
   * Evaluated in strict priority order — first match wins.
   *
   * @param {Entity} entity
   * @param {Object} context - { gazetteerTypes, entities }
   * @returns {boolean}
   */
  _isAnimate(entity, context) {
    const ctx = context || {};

    // Priority 1: Tier 2 type is subclass of Agent
    const entityType = entity.type || '';
    if (entityType.includes('Agent') || entityType.includes('Person') ||
        entityType.includes('Organization')) {
      return true;
    }

    // Priority 2-3: GazetteerNER entity type
    const gazType = entity.gazetteerType || entity.entityType || '';
    if (gazType === 'Person' || gazType.includes('Person')) return true;
    if (gazType === 'Organization' || gazType === 'GovernmentOrganization' ||
        gazType.includes('Organization')) return true;

    // Priority 4: Fandaws domain lookup — not yet implemented (F-0 dependency)

    // Priority 5: Personal pronoun
    const text = (entity.fullText || entity.text || '').toLowerCase();
    const pronouns = new Set(['him', 'her', 'them', 'whom', 'us']);
    if (pronouns.has(text)) return true;

    // Priority 6: Human role title pattern (det/amod + title word)
    const TITLES = new Set([
      'director', 'committee', 'accused', 'jury', 'team', 'judge',
      'magistrate', 'officer', 'commander', 'supervisor', 'inspector',
      'analyst', 'agent', 'chief', 'secretary', 'administrator',
      'instructor', 'recruits', 'class', 'officials', 'personnel',
      'staff', 'board', 'council', 'panel', 'commission',
      'sector', 'sectors', 'division', 'divisions', 'unit', 'units',
      'patient', 'patients', 'nurse', 'nurses',
    ]);
    const words = text.split(/\s+/);
    for (const w of words) {
      if (TITLES.has(w.toLowerCase())) return true;
    }

    // Priority 7: Default — not animate
    return false;
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
    this._propagateToConjunctsRecursive(child.dependent, sourceEntity, depTree, entityByHead, act, sourceRole, roles);
  }

  /**
   * Recursively propagate roles through coordination chains.
   * Handles 3+ element coordination (e.g., "Alice, Bob, and Carol reviewed")
   * where UD may produce chains: Carol → conj of Bob → conj of Alice → nsubj of reviewed.
   */
  _propagateToConjunctsRecursive(headId, sourceEntity, depTree, entityByHead, act, sourceRole, roles) {
    const children = depTree.getChildren(headId);
    for (const child of children) {
      if (child.label !== 'conj') continue;
      const conjEntity = entityByHead.get(child.dependent);
      if (conjEntity && conjEntity !== sourceEntity) {
        roles.push({
          role: sourceRole.role,
          label: sourceRole.label,
          entity: conjEntity.fullText || conjEntity.text,
          entityId: conjEntity.headId,
          act: act.verb,
          actId: act.verbId,
          udLabel: sourceRole.udLabel,
          note: `Propagated from coordination (conj of ${sourceRole.entity})`,
        });
      }
      // Recurse into nested conjuncts (3+ element coordination chains)
      this._propagateToConjunctsRecursive(child.dependent, sourceEntity, depTree, entityByHead, act, sourceRole, roles);
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
      'nsubj': { role: 'Role', label: 'AgentRole', note: 'Active voice subject' },
      'obj': { role: 'Role', label: 'PatientRole', note: 'Direct object' },
      'iobj': { role: 'Role', label: 'RecipientRole', note: 'Indirect object' },
      'nsubj:pass': { role: 'Role', label: 'PatientRole', note: 'Passive subject = patient' },
      'obl:agent': { role: 'Role', label: 'AgentRole', note: 'Passive "by" phrase = agent' },
    };
    return map[label] || null;
  }

  /**
   * Fallback oblique subtyping when RoleMappingContract is unavailable.
   */
  _fallbackObliqueMapping(preposition, actLemma) {
    // Verb-specific preposition overrides (highest priority)
    const verbSpecific = {
      'provide_to': 'RecipientRole',
      'provide_with': 'PatientRole',
      'disclose_to': 'RecipientRole',
      'report_to': 'RecipientRole',
      'submit_to': 'RecipientRole',
      'send_to': 'RecipientRole',
      'advise_through': 'InstrumentRole',
      'disclose_through': 'InstrumentRole',
      'interface_among': 'ParticipantRole',
      'comply_with': 'PatientRole',
      'encrypt_with': 'InstrumentRole',
      'encrypt_using': 'InstrumentRole',
      'collaborate_with': 'PatientRole',
      'enter_into': 'PatientRole',
    };
    if (actLemma && preposition) {
      const key = actLemma.toLowerCase() + '_' + preposition;
      if (verbSpecific[key]) return verbSpecific[key];
    }

    // Generic preposition mapping (fallback)
    const map = {
      'for': 'BeneficiaryRole',
      'with': 'InstrumentRole',
      'at': 'LocationRole',
      'in': 'LocationRole',
      'on': 'LocationRole',
      'from': 'SourceRole',
      'to': 'RecipientRole',
      'by': 'AgentRole',
      'about': 'TopicRole',
      'against': 'OpponentRole',
      'through': 'InstrumentRole',
      'via': 'InstrumentRole',
      'under': 'ConditionRole',
      'within': 'TemporalRole',
      'upon': 'ConditionRole',
      'during': 'TemporalRole',
      'after': 'TemporalRole',
      'before': 'TemporalRole',
      'until': 'TemporalRole',
      'between': 'LocationRole',
      'among': 'LocationRole',
      'regarding': 'TopicRole',
      'concerning': 'TopicRole',
      'using': 'InstrumentRole',
    };
    return map[preposition] || 'ObliqueRole';
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
