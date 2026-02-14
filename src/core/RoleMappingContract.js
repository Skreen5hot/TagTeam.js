/**
 * RoleMappingContract.js — UD v2 → BFO/CCO Role Mapping
 *
 * AC-0.5: UD v2 → BFO/CCO Role Mapping Contract
 *
 * Source: TagTeam-Major-Refactor-v2.2.md §5.3
 * Authority: Universal Dependencies v2, BFO 2.0, CCO v1.5
 *
 * This mapping is the single source of truth for all role assignment.
 * All role assignment code MUST implement this mapping.
 */

'use strict';

// =============================================================================
// Core Argument Roles (UD v2 label → BFO/CCO semantic role)
// =============================================================================

const UD_TO_BFO_ROLE = Object.freeze({
  'nsubj':      Object.freeze({ role: 'cco:AgentRole',     bfo: 'bfo:BFO_0000023', note: 'Active voice subject' }),
  'obj':        Object.freeze({ role: 'cco:PatientRole',   bfo: 'bfo:BFO_0000023', note: 'Direct object' }),
  'iobj':       Object.freeze({ role: 'cco:RecipientRole', bfo: 'bfo:BFO_0000023', note: 'Indirect object' }),
  'nsubj:pass': Object.freeze({ role: 'cco:PatientRole',   bfo: 'bfo:BFO_0000023', note: 'Passive subject = patient' }),
  'obl:agent':  Object.freeze({ role: 'cco:AgentRole',     bfo: 'bfo:BFO_0000023', note: 'Passive "by" phrase = agent' }),
  'obl':        Object.freeze({ role: 'cco:ObliqueRole',   bfo: 'bfo:BFO_0000023', note: 'Subtyped by case child' }),
});

// =============================================================================
// Oblique Role Subtyping (preposition → role subtype)
// =============================================================================

const CASE_TO_OBLIQUE_ROLE = Object.freeze({
  'for':     'cco:BeneficiaryRole',
  'with':    'cco:InstrumentRole',
  'at':      'cco:LocationRole',
  'in':      'cco:LocationRole',
  'on':      'cco:LocationRole',
  'from':    'cco:SourceRole',
  'to':      'cco:DestinationRole',
  'by':      'cco:AgentRole',
  'about':   'cco:TopicRole',
  'against': 'cco:OpponentRole',
});

// =============================================================================
// Mapping functions
// =============================================================================

/**
 * Map a UD v2 dependency label to its BFO/CCO role.
 *
 * @param {string} udLabel - A UD v2 dependency label (e.g., 'nsubj', 'obj')
 * @returns {{ role: string, bfo: string, note: string } | null} The role mapping, or null if unmapped
 */
function mapUDToRole(udLabel) {
  return UD_TO_BFO_ROLE[udLabel] || null;
}

/**
 * Map a preposition (case dependent value) to its oblique role subtype.
 *
 * @param {string} preposition - A lowercase preposition (e.g., 'for', 'with')
 * @returns {string | null} The oblique role (e.g., 'cco:BeneficiaryRole'), or null if unmapped
 */
function mapCaseToOblique(preposition) {
  return CASE_TO_OBLIQUE_ROLE[preposition] || null;
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  UD_TO_BFO_ROLE,
  CASE_TO_OBLIQUE_ROLE,
  mapUDToRole,
  mapCaseToOblique
};
