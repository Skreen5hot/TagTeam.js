'use strict';

/**
 * SentenceModeClassifier
 *
 * Classifies verbs as STATIVE_DEFINITE, STATIVE_AMBIGUOUS, or EVENTIVE
 * to determine whether a sentence describes a structural relation (stative)
 * or an intentional act (eventive).
 *
 * Per BFO: stative predicates describe continuant relations (no temporal parts),
 * while eventive predicates describe occurrent processes (unfold in time).
 *
 * @module SentenceModeClassifier
 */

/**
 * Verb taxonomy: maps infinitive verbs to their classification and output relation.
 *
 * STATIVE_DEFINITE: Always structural (never an intentional act)
 * STATIVE_AMBIGUOUS: Context-dependent (may be stative or eventive)
 * EVENTIVE: Default — all other verbs
 */
const STATIVE_DEFINITE = {
  // Membership relations
  'include': { relation: 'has_member_part', inverse: 'member_part_of', group: 'membership' },
  'encompass': { relation: 'has_member_part', inverse: 'member_part_of', group: 'membership' },

  // Composition / containment
  'contain': { relation: 'has_continuant_part', inverse: 'continuant_part_of', group: 'composition' },
  'comprise': { relation: 'has_member_part', inverse: 'member_part_of', group: 'composition' },
  'consist': { relation: 'has_continuant_part', inverse: 'continuant_part_of', group: 'composition' },

  // Possession
  'possess': { relation: 'has_possession', inverse: null, group: 'possession' },
  'own': { relation: 'has_possession', inverse: null, group: 'possession' },

  // Location (stative sense)
  'reside': { relation: 'located_in', inverse: null, group: 'location' },
};

/**
 * "have" is special — it is stative in possessive sense but modal in "have to" sense.
 * We handle it separately: stative only when NOT followed by "to" (modal).
 */
const HAVE_VERB = {
  relation: 'has_possession',
  inverse: null,
  group: 'possession',
  condition: 'possessive_sense'
};

/**
 * Ambiguous verbs: may be stative or eventive depending on context.
 */
const STATIVE_AMBIGUOUS = {
  'represent': {
    stativeCondition: 'object_is_organization_or_nation',
    stativeRelation: 'bears_role_for',
    eventiveActType: 'IntentionalAct',
    // Stative if object is Nation, Organization, GeopoliticalEntity
    stativeObjectTypes: ['GeopoliticalOrganization', 'Organization', 'Country']
  },
  'support': {
    stativeCondition: 'subject_is_artifact',
    stativeRelation: 'has_continuant_part',
    eventiveActType: 'IntentionalAct',
    stativeSubjectTypes: ['Artifact']
  },
  'cover': {
    stativeCondition: 'object_is_measurement',
    stativeRelation: 'has_spatial_extent',
    eventiveActType: 'IntentionalAct',
    stativeObjectTypes: []
  }
};

class SentenceModeClassifier {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Classify a verb as stative or eventive.
   *
   * @param {string} infinitive - The verb in infinitive form (e.g., "include", "sign")
   * @param {Object} [context] - Optional context for disambiguation
   * @param {boolean} [context.isModal] - Whether verb is preceded by modal auxiliary
   * @param {string} [context.followedBy] - Next word after verb (for "have to" detection)
   * @returns {{ category: string, relation: string|null, inverse: string|null, group: string|null }}
   */
  classifyVerb(infinitive, context = {}) {
    const verb = (infinitive || '').toLowerCase().trim();

    // Special case: "have" — modal vs possessive
    if (verb === 'have') {
      if (context.followedBy === 'to' || context.isModal) {
        return { category: 'EVENTIVE', relation: null, inverse: null, group: null };
      }
      return {
        category: 'STATIVE_DEFINITE',
        relation: HAVE_VERB.relation,
        inverse: HAVE_VERB.inverse,
        group: HAVE_VERB.group
      };
    }

    // Check definite stative verbs
    if (STATIVE_DEFINITE[verb]) {
      const entry = STATIVE_DEFINITE[verb];
      return {
        category: 'STATIVE_DEFINITE',
        relation: entry.relation,
        inverse: entry.inverse,
        group: entry.group
      };
    }

    // Check ambiguous stative verbs
    if (STATIVE_AMBIGUOUS[verb]) {
      return {
        category: 'STATIVE_AMBIGUOUS',
        relation: STATIVE_AMBIGUOUS[verb].stativeRelation,
        inverse: null,
        group: 'ambiguous'
      };
    }

    // Default: eventive
    return { category: 'EVENTIVE', relation: null, inverse: null, group: null };
  }

  /**
   * Disambiguate an ambiguous stative verb based on entity context.
   *
   * @param {string} infinitive - The verb infinitive
   * @param {Object} context - Disambiguation context
   * @param {string} [context.subjectType] - BFO/CCO type of subject entity
   * @param {string} [context.objectType] - BFO/CCO type of object entity
   * @returns {'STATIVE'|'EVENTIVE'}
   */
  disambiguateStativeVerb(infinitive, context = {}) {
    const verb = (infinitive || '').toLowerCase().trim();
    const entry = STATIVE_AMBIGUOUS[verb];
    if (!entry) return 'EVENTIVE';

    // Check object type condition
    if (entry.stativeObjectTypes && context.objectType) {
      if (entry.stativeObjectTypes.includes(context.objectType)) {
        return 'STATIVE';
      }
    }

    // Check subject type condition
    if (entry.stativeSubjectTypes && context.subjectType) {
      if (entry.stativeSubjectTypes.includes(context.subjectType)) {
        return 'STATIVE';
      }
    }

    // Check if object label suggests organization/nation
    if (verb === 'represent' && context.objectLabel) {
      const label = context.objectLabel.toLowerCase();
      const orgIndicators = ['united', 'states', 'nation', 'republic', 'kingdom',
                             'federation', 'union', 'association', 'organization',
                             'committee', 'council', 'department', 'ministry',
                             'government', 'corporation', 'company'];
      if (orgIndicators.some(ind => label.includes(ind))) {
        return 'STATIVE';
      }
    }

    // Default: eventive
    return 'EVENTIVE';
  }

  /**
   * Get the relation mapping for a stative verb.
   *
   * @param {string} infinitive - The verb infinitive
   * @returns {string|null} The CCO/BFO relation IRI, or null if not stative
   */
  getRelationForStativeVerb(infinitive) {
    const verb = (infinitive || '').toLowerCase().trim();
    if (verb === 'have') return HAVE_VERB.relation;
    if (STATIVE_DEFINITE[verb]) return STATIVE_DEFINITE[verb].relation;
    if (STATIVE_AMBIGUOUS[verb]) return STATIVE_AMBIGUOUS[verb].stativeRelation;
    return null;
  }

  /**
   * Check if a verb is in the stative taxonomy (definite or ambiguous).
   *
   * @param {string} infinitive
   * @returns {boolean}
   */
  isStativeCandidate(infinitive) {
    const verb = (infinitive || '').toLowerCase().trim();
    return verb === 'have' || !!STATIVE_DEFINITE[verb] || !!STATIVE_AMBIGUOUS[verb];
  }
}

module.exports = SentenceModeClassifier;
