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
  'nsubj':      Object.freeze({ role: 'Role', label: 'AgentRole',     bfo: 'bfo:BFO_0000023', note: 'Active voice subject' }),
  'obj':        Object.freeze({ role: 'Role', label: 'PatientRole',   bfo: 'bfo:BFO_0000023', note: 'Direct object' }),
  'iobj':       Object.freeze({ role: 'Role', label: 'RecipientRole', bfo: 'bfo:BFO_0000023', note: 'Indirect object' }),
  'nsubj:pass': Object.freeze({ role: 'Role', label: 'PatientRole',   bfo: 'bfo:BFO_0000023', note: 'Passive subject = patient' }),
  'obl:agent':  Object.freeze({ role: 'Role', label: 'AgentRole',     bfo: 'bfo:BFO_0000023', note: 'Passive "by" phrase = agent' }),
  'obl':        Object.freeze({ role: 'Role', label: 'ObliqueRole',   bfo: 'bfo:BFO_0000023', note: 'Subtyped by case child' }),
});

// =============================================================================
// Oblique Role Subtyping (preposition → role subtype)
// =============================================================================

const CASE_TO_OBLIQUE_ROLE = Object.freeze({
  'for':     'BeneficiaryRole',
  'with':    'InstrumentRole',
  'at':      'LocationRole',
  'in':      'LocationRole',
  'on':      'LocationRole',
  'from':    'SourceRole',
  'to':      'DestinationRole',
  'by':      'AgentRole',
  'about':   'TopicRole',
  'against': 'OpponentRole',
});

// =============================================================================
// Ditransitive Verb Registry (TT-SPEC-RDM-A §3.2)
// =============================================================================

const RMC_DITRANSITIVE_VERBS = new Set([
  // Transfer of possession
  'give', 'gave', 'given', 'grant', 'granted', 'award', 'awarded',
  'assign', 'assigned', 'transfer', 'transferred', 'allocate', 'allocated',
  'return', 'returned', 'restore', 'restored', 'pay', 'paid',
  'owe', 'owed', 'lend', 'lent', 'hand', 'handed', 'forward', 'forwarded',
  // Transfer of information/communication
  'present', 'presented', 'submit', 'submitted', 'provide', 'provided',
  'offer', 'offered', 'show', 'showed', 'shown', 'tell', 'told',
  'report', 'reported', 'disclose', 'disclosed', 'transmit', 'transmitted',
  'send', 'sent', 'deliver', 'delivered', 'issue', 'issued', 'notify', 'notified',
  // Transfer of authority/rights
  'sell', 'sold', 'lease', 'leased', 'delegate', 'delegated',
  'entrust', 'entrusted', 'license', 'licensed', 'authorize', 'authorized',
  // Additional verbs from corpus analysis
  'pass', 'passed', 'teach', 'taught',
  'distribute', 'distributed', 'administer', 'administered',
]);

// =============================================================================
// Passive Non-Role PP Verb Registry (TT-SPEC-RDM-A §4.3)
// =============================================================================

const RMC_NON_ROLE_PP_VERBS_PASSIVE = new Set([
  'seize', 'seized', 'discover', 'discovered', 'observe', 'observed',
  'find', 'found', 'detect', 'detected', 'identify', 'identified',
  'locate', 'located', 'arrest', 'arrested', 'apprehend', 'apprehended',
  'intercept', 'intercepted',
]);

// =============================================================================
// Stative Predicate Suppression — passive participles used adjectivally
// =============================================================================

const RMC_STATIVE_PREDICATES = new Set([
  'known', 'composed', 'divided', 'located', 'based', 'situated',
  'derived', 'classified', 'designated', 'defined', 'established',
  'recognized', 'considered', 'regarded', 'named', 'called',
  'organized', 'structured', 'comprised', 'constituted',
]);

// =============================================================================
// to-PP Dependency Label Recognition (TT-SPEC-RDM-A §6.2)
// =============================================================================

const TO_PP_DEP_LABELS = Object.freeze(new Set([
  'prep', 'obl', 'nmod', 'dative', 'obl:to'
]));

const INFINITIVAL_TO_LABELS = Object.freeze(new Set([
  'aux', 'mark', 'xcomp'
]));

// =============================================================================
// Role Propagation Arcs (TT-SPEC-ENT-A §6.2)
// =============================================================================

const ROLE_PROPAGATION_ARCS = Object.freeze(new Set([
  'conj'   // coordinate nominal propagation — TT-SPEC-ENT-A §3.4, TT-SPEC-RDM-B §4
]));

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
  RMC_DITRANSITIVE_VERBS,
  RMC_NON_ROLE_PP_VERBS_PASSIVE,
  RMC_STATIVE_PREDICATES,
  ROLE_PROPAGATION_ARCS,
  TO_PP_DEP_LABELS,
  INFINITIVAL_TO_LABELS,
  mapUDToRole,
  mapCaseToOblique
};
