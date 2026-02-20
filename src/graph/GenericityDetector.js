/**
 * GenericityDetector.js — Kind-Referring vs. Instance-Referring Classification
 *
 * Source: TagTeam Spec §9.5
 * Authority: Carlson (1977) "Reference to Kinds in English",
 *            Krifka et al. (1995) "Genericity: An Introduction",
 *            BFO 2.0 (owl:Class vs owl:NamedIndividual distinction)
 *
 * Classifies subject NPs into four categories:
 *   GEN  — Generic (owl:Class restriction, someValuesFrom)
 *   INST — Instance (owl:NamedIndividual assertion)
 *   UNIV — Universal quantification (owl:Class restriction, allValuesFrom)
 *   AMB  — Ambiguous (instance + structured uncertainty)
 *
 * Uses four signals in priority order:
 *   Signal 1: Determiner status of subject NP (primary)
 *   Signal 2: Tense, aspect, and modality of main predicate (secondary)
 *   Signal 3: Predicate type — stative vs. dynamic (tertiary)
 *   Signal 4: Domain register override (quaternary — advisory)
 */

'use strict';

// --- Signal 1: Determiner → genericity mapping (§9.5.3) ---

const DET_TO_GENERICITY = {
  // Definite / demonstrative → instance
  'the':    'INST',
  'this':   'INST',
  'that':   'INST',
  'these':  'INST',
  'those':  'INST',

  // Indefinite singular → ambiguous
  'a':      'AMB',
  'an':     'AMB',

  // Universal quantifiers → universal
  'all':    'UNIV',
  'every':  'UNIV',
  'each':   'UNIV',

  // Possessives → instance
  'my':     'INST',
  'your':   'INST',
  'his':    'INST',
  'her':    'INST',
  'its':    'INST',
  'our':    'INST',
  'their':  'INST',

  // Numeric / proportional
  'two':    'INST',
  'three':  'INST',
  'many':   'INST',
  'several':'INST',
  'some':   'AMB',
  'most':   'AMB',
  'no':     'UNIV',
};

// --- Signal 1: Mass nouns for bare-noun disambiguation (§9.5.3) ---

const MASS_NOUNS = new Set([
  // Substances & materials
  'water', 'air', 'gold', 'silver', 'iron', 'steel', 'oil', 'gas',
  'wood', 'plastic', 'glass', 'concrete', 'sand', 'dirt', 'dust',
  'fuel', 'ink', 'paint',

  // Abstract / uncountable
  'information', 'evidence', 'data', 'knowledge', 'intelligence',
  'research', 'feedback', 'advice', 'guidance', 'oversight',
  'legislation', 'policy', 'compliance', 'enforcement',
  'traffic', 'commerce', 'trade', 'cargo', 'contraband',
  'equipment', 'software', 'hardware', 'infrastructure',
  'money', 'currency', 'funding',

  // Natural phenomena
  'weather', 'electricity', 'gravity', 'light', 'heat', 'pressure',
]);

// --- Signal 2: Tense/aspect → genericity signal (§9.5.3) ---

const TENSE_GENERICITY_SIGNAL = {
  'VBP': 'GEN_SUPPORT',      // Simple present plural — "Dogs have..."
  'VBZ': 'GEN_SUPPORT',      // Simple present singular — "A dog has..."
  'VBD': 'INST_SUPPORT',     // Simple past — "Dogs had..."
  'VBG': 'INST_SUPPORT',     // Progressive — "Dogs are having..."
  'VBN': 'INST_SUPPORT',     // Perfective — "Dogs have had..."
  'MD':  'MODAL',            // Modal — requires subclassification
};

// --- Signal 2b: Modal → genericity signal (§9.5.3) ---

const MODAL_GENERICITY_SIGNAL = {
  // Deontic modals → support generic/universal
  'shall':  'GEN_SUPPORT',
  'must':   'GEN_SUPPORT',
  'should': 'GEN_SUPPORT',

  // Ability/permission → weak generic support
  'can':    'WEAK_GEN_SUPPORT',
  'may':    'AMB_SUPPORT',

  // Epistemic/volitional → ambiguous
  'will':   'AMB_SUPPORT',
  'would':  'AMB_SUPPORT',
  'could':  'AMB_SUPPORT',
  'might':  'AMB_SUPPORT',
};

// --- Signal 3: Stative verbs (§9.5.3) ---

const STATIVE_VERBS = new Set([
  // Possession / inclusion
  'have', 'contain', 'include', 'comprise', 'consist',
  // Cognition / perception
  'know', 'believe', 'understand', 'recognize', 'perceive',
  // Relational
  'belong', 'depend', 'require', 'need', 'involve',
  // Existential / identity
  'exist', 'remain', 'resemble', 'equal', 'represent',
  // Measurement
  'weigh', 'cost', 'measure', 'last',
]);

/**
 * Subject dependency labels that identify subject NPs.
 */
const SUBJECT_LABELS = new Set([
  'nsubj', 'nsubj:pass',
]);

class GenericityDetector {
  /**
   * @param {Object} [options]
   * @param {Object} [options.lemmatizer] - Lemmatizer instance for verb normalization
   * @param {string} [options.registerHint] - Domain register hint ('legal', etc.)
   */
  constructor(options = {}) {
    this.lemmatizer = options.lemmatizer || null;
    this.registerHint = options.registerHint || null;
  }

  /**
   * Classify genericity of subject entities.
   *
   * @param {Array} entities - Extracted entities with headId, role properties
   * @param {Object} depTree - DepTree instance
   * @param {string[]} tags - POS tags (0-indexed)
   * @param {Object} [options] - Per-call options
   * @param {string} [options.registerHint] - Domain register override
   * @returns {Map<number, {category: string, confidence: number, alternative?: {category: string, confidence: number}}>}
   *   Map from entity headId → genericity classification
   */
  classify(entities, depTree, tags, options = {}) {
    const results = new Map();
    const registerHint = options.registerHint || this.registerHint;

    for (const entity of entities) {
      // Only classify subject entities (§9.5.7: object genericity deferred)
      if (!this._isSubject(entity, depTree)) continue;

      const headId = entity.headId;
      if (!headId || headId < 1 || headId > depTree.n) continue;

      const result = this._classifyEntity(headId, depTree, tags, registerHint);
      results.set(headId, result);
    }

    return results;
  }

  /**
   * Check if an entity is a subject NP.
   * @private
   */
  _isSubject(entity, depTree) {
    // Check entity's own role property
    if (entity.role && SUBJECT_LABELS.has(entity.role)) return true;

    // Check dep tree for the head's label
    const headArc = depTree.getHead(entity.headId);
    if (headArc && SUBJECT_LABELS.has(headArc.label)) return true;

    return false;
  }

  /**
   * Classify a single subject entity.
   *
   * Implements the decision algorithm from §9.5.4.
   * @private
   */
  _classifyEntity(headId, depTree, tags, registerHint) {
    // Step 1: Determiner signal
    const detSignal = this._getDeterminerSignal(headId, depTree, tags);

    // Step 2: Tense/aspect/modal signal
    const verbInfo = this._getGoverningVerb(headId, depTree);
    const { signal: tenseSignal, isModal } = this._getTenseSignal(verbInfo, depTree, tags);

    // Step 3: Predicate type signal
    const predicateSignal = this._getPredicateSignal(verbInfo, depTree, tags);

    // Step 4: Decision logic
    return this._decide(detSignal, tenseSignal, predicateSignal, headId, depTree, tags, registerHint, isModal);
  }

  /**
   * Signal 1: Determiner status of subject NP.
   * @private
   */
  _getDeterminerSignal(headId, depTree, tags) {
    const children = depTree.getChildren(headId);
    const detChild = children.find(c => c.label === 'det');

    if (!detChild) {
      // Bare noun — classify by POS tag
      const headTag = tags[headId - 1];

      if (headTag === 'NNS' || headTag === 'NNPS') {
        return 'GEN'; // bare plural
      }
      if (headTag === 'NNP') {
        return 'INST'; // proper noun
      }
      if (headTag === 'NN') {
        const headWord = depTree.tokens[headId - 1].toLowerCase();
        const lemma = this.lemmatizer
          ? this.lemmatizer.lemmatize(headWord, headTag).lemma
          : headWord;
        if (MASS_NOUNS.has(lemma)) {
          return 'GEN'; // bare mass noun
        }
        return 'AMB'; // bare count noun (possibly det-dropped)
      }
      return 'AMB';
    }

    // Has determiner — look it up
    const detWord = detChild.word.toLowerCase();
    return DET_TO_GENERICITY[detWord] || 'AMB';
  }

  /**
   * Find the governing verb for a subject token.
   * @private
   * @returns {{ verbId: number, verbTag: string, verbWord: string } | null}
   */
  _getGoverningVerb(headId, depTree) {
    const headArc = depTree.getHead(headId);
    if (!headArc) return null;

    const verbId = headArc.head;
    if (verbId < 1 || verbId > depTree.n) return null;

    return {
      verbId,
      verbTag: depTree.tags[verbId - 1],
      verbWord: depTree.tokens[verbId - 1],
    };
  }

  /**
   * Signal 2: Tense, aspect, and modality of main predicate.
   * Returns { signal, isModal } — isModal is true when an MD auxiliary
   * was detected (needed for decision logic: deontic modals outweigh
   * predicate type in AMB resolution per §9.5.5 Pattern E).
   * @private
   */
  _getTenseSignal(verbInfo, depTree, tags) {
    if (!verbInfo) return { signal: 'AMB_SUPPORT', isModal: false };

    const children = depTree.getChildren(verbInfo.verbId);

    // First check for modal auxiliary (MD) among children — handles
    // "shall verify", "might verify" where root verb is VB/VBP
    const modalChild = children.find(c => c.tag === 'MD');
    let tenseSignal;

    if (modalChild) {
      // Modal present — use modal subclassification (Signal 2b)
      tenseSignal = MODAL_GENERICITY_SIGNAL[modalChild.word.toLowerCase()] || 'AMB_SUPPORT';
      return { signal: tenseSignal, isModal: true };
    }

    tenseSignal = TENSE_GENERICITY_SIGNAL[verbInfo.verbTag] || 'AMB_SUPPORT';

    // Check for copular verbs — the actual verb may be the predicate,
    // and the copula may be an aux/cop child
    if (tenseSignal === 'AMB_SUPPORT') {
      const copChild = children.find(c => c.label === 'cop');
      if (copChild) {
        const copTag = tags[copChild.dependent - 1];
        tenseSignal = TENSE_GENERICITY_SIGNAL[copTag] || 'AMB_SUPPORT';
      }
    }

    // Also check if the verb's own tag is MD (verb itself is modal)
    if (tenseSignal === 'MODAL') {
      tenseSignal = MODAL_GENERICITY_SIGNAL[verbInfo.verbWord.toLowerCase()] || 'AMB_SUPPORT';
      return { signal: tenseSignal, isModal: true };
    }

    return { signal: tenseSignal, isModal: false };
  }

  /**
   * Signal 3: Predicate type — stative vs. dynamic.
   * @private
   */
  _getPredicateSignal(verbInfo, depTree, tags) {
    if (!verbInfo) return 'INST_SUPPORT';

    // Check for copular construction
    const children = depTree.getChildren(verbInfo.verbId);
    const hasCop = children.some(c => c.label === 'cop');
    if (hasCop) return 'GEN_SUPPORT'; // copular predicates support generic

    // Lemmatize the verb and check stative list
    const verbWord = verbInfo.verbWord.toLowerCase();
    let lemma = verbWord;
    if (this.lemmatizer) {
      lemma = this.lemmatizer.lemmatize(verbWord, verbInfo.verbTag).lemma;
    }

    if (STATIVE_VERBS.has(lemma)) return 'GEN_SUPPORT';

    // Check for progressive aspect (aux + VBG) → instance support
    const hasProgressiveAux = children.some(c =>
      c.label === 'aux' && tags[c.dependent - 1] === 'VBG'
    );
    if (hasProgressiveAux) return 'INST_SUPPORT';

    // Default: dynamic verb
    return 'INST_SUPPORT';
  }

  /**
   * Decision logic from §9.5.4.
   * @private
   */
  _decide(detSignal, tenseSignal, predicateSignal, headId, depTree, tags, registerHint, isModal) {
    // Strong GEN or UNIV from determiner
    if (detSignal === 'GEN' || detSignal === 'UNIV') {
      let confidence = 0.9;
      if (tenseSignal === 'INST_SUPPORT') {
        // Past tense reduces confidence for bare plurals (GEN)
        // but explicit quantifiers (UNIV) remain strong — the universality
        // comes from the determiner, not the tense
        confidence = detSignal === 'UNIV' ? 0.85 : 0.7;
      }
      if (detSignal === 'GEN' && predicateSignal === 'GEN_SUPPORT') {
        confidence = 0.95; // Bare plural + stative/copular = very high
      }
      return { category: detSignal, confidence };
    }

    // Strong INST from determiner
    if (detSignal === 'INST') {
      let confidence = 0.9;

      // Check for "Institutional The" exception (§9.5.7)
      const children = depTree.getChildren(headId);
      const detChild = children.find(c => c.label === 'det');
      if (detChild) {
        const detWord = detChild.word.toLowerCase();
        const headTag = tags[headId - 1];

        if (detWord === 'the'
          && headTag === 'NN'
          && predicateSignal === 'GEN_SUPPORT'
          && (tenseSignal === 'GEN_SUPPORT' || tenseSignal === 'WEAK_GEN_SUPPORT')) {
          // "The electron has negative charge" — possible kind-referring definite
          return {
            category: 'AMB',
            confidence: 0.6,
            alternative: { category: 'GEN', confidence: 0.4 }
          };
        }
      }

      // Domain register hint boost
      if (registerHint === 'legal'
        && (tenseSignal === 'GEN_SUPPORT' || tenseSignal === 'WEAK_GEN_SUPPORT')) {
        return {
          category: 'INST',
          confidence: 0.75,
          alternative: { category: 'GEN', confidence: 0.25 }
        };
      }

      return { category: 'INST', confidence };
    }

    // Step 5: Resolve AMB using tense + predicate type
    let genSupport = 0;
    let instSupport = 0;

    if (tenseSignal === 'GEN_SUPPORT' || tenseSignal === 'WEAK_GEN_SUPPORT') genSupport += 1;
    if (tenseSignal === 'INST_SUPPORT') instSupport += 1;
    if (predicateSignal === 'GEN_SUPPORT') genSupport += 1;
    if (predicateSignal === 'INST_SUPPORT') instSupport += 1;

    // §9.5.5 Pattern E: Deontic modals (shall/must/should) provide strong
    // normative-generic evidence that outweighs dynamic verb INST_SUPPORT.
    // "An officer shall verify documentation" → GEN despite dynamic "verify".
    if (isModal && tenseSignal === 'GEN_SUPPORT') {
      genSupport += 1; // Double-weight: deontic modal is a strong generic signal
    }

    // Epistemic modals (might/could/would) with AMB_SUPPORT create genuine
    // uncertainty about the event structure → dampen INST evidence.
    if (isModal && tenseSignal === 'AMB_SUPPORT' && instSupport > 0) {
      instSupport -= 1; // Modal hedging undermines instance reading
    }

    if (genSupport >= 2) {
      return { category: 'GEN', confidence: 0.75 };
    }
    if (genSupport === 1 && instSupport === 0) {
      return { category: 'GEN', confidence: 0.65 };
    }
    if (instSupport >= 2) {
      return {
        category: 'INST',
        confidence: 0.75,
        alternative: { category: 'GEN', confidence: 0.25 }
      };
    }
    if (instSupport === 1 && genSupport === 0) {
      return {
        category: 'INST',
        confidence: 0.65,
        alternative: { category: 'GEN', confidence: 0.35 }
      };
    }

    // Step 6: Irreducible ambiguity
    return {
      category: 'AMB',
      confidence: 0.5,
      alternative: { category: 'GEN', confidence: 0.5 }
    };
  }
}

// Static exports for testing and external access
GenericityDetector.DET_TO_GENERICITY = DET_TO_GENERICITY;
GenericityDetector.MASS_NOUNS = MASS_NOUNS;
GenericityDetector.STATIVE_VERBS = STATIVE_VERBS;
GenericityDetector.TENSE_GENERICITY_SIGNAL = TENSE_GENERICITY_SIGNAL;
GenericityDetector.MODAL_GENERICITY_SIGNAL = MODAL_GENERICITY_SIGNAL;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GenericityDetector;
}
if (typeof window !== 'undefined') {
  window.GenericityDetector = GenericityDetector;
}
