/**
 * TreeActExtractor.js — Tree-Based Act and Copular Extraction
 *
 * Source: TagTeam-Major-Refactor-v2.2.md §Phase 3A (AC-3.5 through AC-3.11b)
 * Authority: UD v2, BFO 2.0, CCO v1.5, Cambridge Grammar
 *
 * Extracts acts (events/verbs) and copular/stative structures (StructuralAssertions)
 * from a DepTree. Handles:
 *   - Root verb identification (AC-3.5)
 *   - Passive voice detection (AC-3.6)
 *   - Negation detection (AC-3.7)
 *   - 5 copular patterns (AC-3.8 through AC-3.11b)
 *   - 7 relation inference mappings (AC-3.8b)
 */

'use strict';

// ============================================================================
// Constants
// ============================================================================

/**
 * POS tags that indicate a verb token.
 */
const VERB_TAGS = new Set(['VB', 'VBD', 'VBZ', 'VBP', 'VBN', 'VBG']);

/**
 * POS tags for adjectives (for copular predication like "X is responsible for Y").
 */
const ADJ_TAGS = new Set(['JJ', 'JJR', 'JJS']);

/**
 * Common English verb lemmatization.
 * Irregular forms that can't be handled by simple suffix stripping.
 */
const IRREGULAR_LEMMAS = {
  'treated': 'treat',
  'gave': 'give',
  'given': 'give',
  'was': 'be',
  'were': 'be',
  'is': 'be',
  'are': 'be',
  'been': 'be',
  'being': 'be',
  'has': 'have',
  'had': 'have',
  'having': 'have',
  'did': 'do',
  'done': 'do',
  'went': 'go',
  'gone': 'go',
  'fed': 'feed',
  'led': 'lead',
  'held': 'hold',
  'kept': 'keep',
  'met': 'meet',
  'paid': 'pay',
  'sold': 'sell',
  'told': 'tell',
  'found': 'find',
  'wrote': 'write',
  'written': 'write',
  'ran': 'run',
  'knew': 'know',
  'known': 'know',
  'spoke': 'speak',
  'spoken': 'speak',
  'began': 'begin',
  'begun': 'begin',
  'broke': 'break',
  'broken': 'break',
  'chose': 'choose',
  'chosen': 'choose',
  'fell': 'fall',
  'fallen': 'fall',
  'flew': 'fly',
  'flown': 'fly',
  'slept': 'sleep',
  'woke': 'wake',
  'woken': 'wake',
  'sang': 'sing',
  'sung': 'sing',
  'swam': 'swim',
  'swum': 'swim',
  'drank': 'drink',
  'drunk': 'drink',
  'drew': 'draw',
  'drawn': 'draw',
  'fought': 'fight',
  'thought': 'think',
  'bought': 'buy',
  'brought': 'bring',
  'caught': 'catch',
  'taught': 'teach',
  'built': 'build',
  'arrived': 'arrive',
  'approved': 'approve',
  'received': 'receive',
  'achieved': 'achieve',
  'believed': 'believe',
  'removed': 'remove',
  'moved': 'move',
  'loved': 'love',
  'lived': 'live',
  'served': 'serve',
  'observed': 'observe',
  'improved': 'improve',
  'involved': 'involve',
  'produced': 'produce',
  'reduced': 'reduce',
  'spent': 'spend',
  'lent': 'lend',
  'bent': 'bend',
  'said': 'say',
  'made': 'make',
  'took': 'take',
  'taken': 'take',
  'came': 'come',
  'worked': 'work',
  'left': 'leave',
  'sent': 'send',
  'brought': 'bring',
  'operated': 'operate',
  'explained': 'explain',
  'caused': 'cause',
  'transported': 'transport',
  'located': 'locate',
  'based': 'base',
  'composed': 'compose',
  'proposed': 'propose',
  'opposed': 'oppose',
  'imposed': 'impose',
  'disposed': 'dispose',
  'exposed': 'expose',
  'supposed': 'suppose',
  'excused': 'excuse',
  'refused': 'refuse',
  'accused': 'accuse',
  'revised': 'revise',
  'exercised': 'exercise',
  'recognized': 'recognize',
  'organized': 'organize',
  'authorized': 'authorize',
  'characterized': 'characterize',
  'utilized': 'utilize',
  'comprised': 'comprise',
  'constituted': 'constitute',
  'prescribed': 'prescribe',
  // VBZ forms where -es stripping over-truncates (stem ends in 'e')
  'agrees': 'agree',
  'advises': 'advise',
  'provides': 'provide',
  'discloses': 'disclose',
  'requires': 'require',
  'ensures': 'ensure',
  'produces': 'produce',
  'reduces': 'reduce',
  'causes': 'cause',
  'includes': 'include',
  'involves': 'involve',
  'receives': 'receive',
  'achieves': 'achieve',
  'removes': 'remove',
  'improves': 'improve',
  'serves': 'serve',
  'observes': 'observe',
  'manages': 'manage',
  'describes': 'describe',
  'determines': 'determine',
  'operates': 'operate',
  'locates': 'locate',
  'collaborates': 'collaborate',
  // VBD forms where -ed stripping over-truncates (stem ends in 'e')
  'provided': 'provide',
  'disclosed': 'disclose',
  'required': 'require',
  'ensured': 'ensure',
  'included': 'include',
  'described': 'describe',
  'determined': 'determine',
  'managed': 'manage',
  'collaborated': 'collaborate',
  'advised': 'advise',
  'restricted': 'restrict',
  'submitted': 'submit',
  'encrypted': 'encrypt',
  'conducted': 'conduct',
  'suspended': 'suspend',
  'terminated': 'terminate',
  'maintained': 'maintain',
  'complied': 'comply',
  'notified': 'notify',
  'verified': 'verify',
  'reported': 'report',
  'denied': 'deny',
  'accessed': 'access',
  'monitored': 'monitor',
  'reviewed': 'review',
  'contacted': 'contact',
  'discussed': 'discuss',
  'investigated': 'investigate',
  'addressed': 'address',
  'entered': 'enter',
  'disclosed': 'disclose',
  'prompted': 'prompt',
  'resolved': 'resolve',
  'presented': 'present',
  'executed': 'execute',
  'implemented': 'implement',
  'specified': 'specify',
  'associated': 'associate',
  'requested': 'request',
  'experienced': 'experience',
  'discovered': 'discover',
  'authorized': 'authorize',
  'completed': 'complete',
  'suspected': 'suspect',
  'occurred': 'occur',
  'violated': 'violate',
  'filed': 'file',
  'hired': 'hire',
  'classified': 'classify',
  'authorized': 'authorize',
  'revised': 'revise',
  'described': 'describe',
  'recognized': 'recognize',
  'analyzed': 'analyze',
  'organized': 'organize',
  'utilized': 'utilize',
  'finalized': 'finalize',
  'supervised': 'supervise',
};

/**
 * Relation inference table (AC-3.8b).
 * Maps predicate patterns to ontological relations.
 */
const RELATION_INFERENCE_TABLE = [
  { pattern: 'component of', relation: 'has_continuant_part' },
  { pattern: 'member of', relation: 'member_part_of' },
  { pattern: 'type of', relation: 'rdfs:subClassOf' },
  { pattern: 'kind of', relation: 'rdfs:subClassOf' },
  { pattern: 'part of', relation: 'continuant_part_of' },
  { pattern: 'example of', relation: 'rdf:type' },
  { pattern: 'instance of', relation: 'rdf:type' },
  { pattern: 'located in', relation: 'located_in' },
  { pattern: 'based in', relation: 'located_in' },
  { pattern: 'responsible for', relation: 'has_function' },
];

/**
 * Preposition-based fallback relations (FT-03b).
 * When no specific predicate pattern matches, the nmod/obl preposition
 * alone determines a default ontological relation.
 */
const PREPOSITION_FALLBACK_RELATIONS = {
  'of':     'member_part_of',
  'in':     'located_in',
  'within': 'continuant_part_of',
  'at':     'located_in',
  'for':    'has_function',
  'as':     'rdf:type',
};

/**
 * Modal Vocabulary Table — single source of truth.
 * Maps modal verb → { modality, status, negatedModality, negatedStatus, deonticType }.
 * See docs/development/plan-ws3-fix1-modal-detection.md for specification.
 */
const MODAL_TABLE = {
  'must':   { modality: 'obligation',     status: 'tagteam:Prescribed',   negatedModality: 'prohibition', negatedStatus: 'tagteam:Prohibited', deonticType: 'duty' },
  'shall':  { modality: 'obligation',     status: 'tagteam:Prescribed',   negatedModality: 'prohibition', negatedStatus: 'tagteam:Prohibited', deonticType: 'duty' },
  'should': { modality: 'recommendation', status: 'tagteam:Prescribed',   negatedModality: null,          negatedStatus: null,                  deonticType: 'duty' },
  'will':   { modality: 'intention',      status: 'tagteam:Actual',       negatedModality: 'prohibition', negatedStatus: 'tagteam:Prohibited',  deonticType: null },
  'may':    { modality: 'permission',     status: 'tagteam:Permitted',    negatedModality: 'prohibition', negatedStatus: 'tagteam:Prohibited',  deonticType: 'privilege' },
  'can':    { modality: 'ability',        status: 'tagteam:Possible',     negatedModality: 'prohibition', negatedStatus: 'tagteam:Prohibited',  deonticType: null },
  'could':  { modality: 'hypothetical',   status: 'tagteam:Hypothetical', negatedModality: null,          negatedStatus: null,                  deonticType: null },
  'would':  { modality: 'hypothetical',   status: 'tagteam:Hypothetical', negatedModality: null,          negatedStatus: null,                  deonticType: null },
  'might':  { modality: 'possibility',    status: 'tagteam:Possible',     negatedModality: null,          negatedStatus: null,                  deonticType: null },
  'ought':  { modality: 'recommendation', status: 'tagteam:Prescribed',   negatedModality: null,          negatedStatus: null,                  deonticType: 'duty' },
};

/**
 * Multi-word modal verb lemmas that appear as control verbs with xcomp + "to".
 * e.g., "have to allocate" → "have" is root, "allocate" is xcomp, "to" is mark.
 */
/**
 * Contraction stems produced by the tokenizer splitting "can't" → ["ca","n't"],
 * "won't" → ["wo","n't"], etc. Maps stem → full modal word for MODAL_TABLE lookup.
 */
const CONTRACTION_STEMS = {
  'ca':    'can',     // can't → ca + n't
  'wo':    'will',    // won't → wo + n't
  'sha':   'shall',   // shan't → sha + n't (rare but valid)
};

const MULTI_WORD_MODAL_LEMMAS = {
  'have': 'obligation',
  'need': 'obligation',
  'ought': 'recommendation',  // "ought to" → DefeasibleObligation (spec §4)
  'agree': 'intention',       // "agrees to provide" → DeclaredIntention (commissive)
};

// ============================================================================
// TreeActExtractor
// ============================================================================

class TreeActExtractor {
  constructor() {}

  /**
   * Extract acts and structural assertions from a dependency tree.
   *
   * @param {DepTree} depTree - Parsed dependency tree
   * @returns {{ acts: Act[], structuralAssertions: StructuralAssertion[] }}
   */
  extract(depTree) {
    const acts = [];
    const structuralAssertions = [];

    const roots = depTree.getRoots();

    for (const rootId of roots) {
      const rootTag = depTree.tags[rootId - 1];
      const rootWord = depTree.tokens[rootId - 1];
      const children = depTree.getChildren(rootId);

      // Check for copular structure: root has a `cop` child
      const copChild = children.find(c => c.label === 'cop');
      // Check for existential: root has an `expl` child
      const explChild = children.find(c => c.label === 'expl');

      // Also check conj children for copular structure (fragmented "DHS/USCIS is the Source Agency")
      if (!copChild) {
        const conjChild = children.find(c => c.label === 'conj');
        if (conjChild) {
          const conjChildren = depTree.getChildren(conjChild.dependent);
          const conjCop = conjChildren.find(c => c.label === 'cop');
          if (conjCop) {
            // The conj child IS the copular predicate — handle it directly
            const assertion = this._handleCopular(depTree, conjChild.dependent, conjCop, conjChildren);
            if (assertion) structuralAssertions.push(assertion);
            // Skip normal processing of this root
            continue;
          }
        }
      }

      // Guard: passive modal clauses ("shall be composed of") are NOT copular
      // even if the parser attaches a spurious cop label. The presence of
      // aux:pass + modal aux is the definitive signal for passive verb.
      const hasAuxPass = children.some(c => c.label === 'aux:pass');
      const hasModalAux = children.some(c => c.label === 'aux' && depTree.tags[c.dependent - 1] === 'MD');
      const isPassiveModal = hasAuxPass && hasModalAux;

      if (copChild && !isPassiveModal) {
        // Copular construction: root is the PREDICATE, cop is the copula verb
        const assertion = this._handleCopular(depTree, rootId, copChild, children);
        if (assertion) structuralAssertions.push(assertion);
      } else if (explChild && VERB_TAGS.has(rootTag)) {
        // Existential: "There is X" — root is the verb "is" with expl "There"
        const assertion = this._handleExistential(depTree, rootId, children);
        if (assertion) structuralAssertions.push(assertion);
      } else if (this._isPossessive(rootWord, rootTag, children, depTree)) {
        // Possessive stative: "X has Y" — emit only StructuralAssertion, no IntentionalAct
        // Tag as quality_assertion for SGB to upgrade to QualityAssertion + Quality
        const assertion = this._handlePossessive(depTree, rootId, children);
        if (assertion) {
          assertion.pattern = 'quality_assertion';
          assertion.predicateTag = 'NN'; // object is a noun (quality/part)
          // Get the object word for quality extraction
          const objChild = children.find(c => c.label === 'obj');
          if (objChild) {
            assertion.predicateText = depTree.tokens[objChild.dependent - 1];
            assertion.predicateTag = depTree.tags[objChild.dependent - 1];
          }
          structuralAssertions.push(assertion);
        }
        // NO _buildAct() — suppresses ghost IntentionalAct
      } else if (this._isEvidentialCopula(rootWord, rootTag, children, depTree)) {
        // Evidential copula: "She seems tired" — perception verb + xcomp adjective
        const assertion = this._handleEvidentialCopula(depTree, rootId, children);
        if (assertion) structuralAssertions.push(assertion);
      } else if (this._isStativeVerb(rootWord, rootTag, children)) {
        // Non-copular stative verb: "include", "contain", "comprise"
        const assertion = this._handleStativeVerb(depTree, rootId, children);
        if (assertion) structuralAssertions.push(assertion);
      } else {
        // Check for multi-word modal: root is "have"/"need"/"ought" with xcomp child
        const multiWordResult = this._checkMultiWordModal(depTree, rootId, children);
        if (multiWordResult) {
          acts.push(multiWordResult);
        } else {
          // Regular verb act
          const act = this._buildAct(depTree, rootId, children);

          // Check for verb-based relation patterns (e.g., "is located in X")
          // If a structural assertion is found, it replaces the act (not both)
          const verbRelation = this._checkVerbRelation(depTree, rootId, children, act);
          if (verbRelation) {
            structuralAssertions.push(verbRelation);
          } else if (act) {
            acts.push(act);
          }
        }
      }

      // Also extract acts from embedded clauses (advcl, acl:relcl)
      this._extractEmbeddedActs(depTree, rootId, acts, structuralAssertions);
    }

    // BC-2: Filter out junk acts from mistagged tokens (punctuation, single chars,
    // tokens that are clearly nouns misidentified as verbs by the dep parser)
    const validActs = acts.filter(act => {
      const lemma = act.lemma || '';
      // Reject punctuation and single-character "verbs"
      if (lemma.length <= 1) return false;
      if (/^[^a-zA-Z]/.test(lemma)) return false;
      // Reject tokens tagged as nouns that slipped through (NNP/NNS/NN mistagged as root)
      if (act.tag && !VERB_TAGS.has(act.tag) && !act.modality) return false;
      return true;
    });

    return { acts: validActs, structuralAssertions };
  }

  /**
   * Build an Act from a verb token.
   *
   * @param {DepTree} depTree
   * @param {number} verbId - 1-indexed verb token ID
   * @param {Array} children - Direct children of this verb
   * @returns {Act|null}
   */
  _buildAct(depTree, verbId, children) {
    const word = depTree.tokens[verbId - 1];
    const tag = depTree.tags[verbId - 1];

    // Must be a verb (or accept root position even if mistagged)
    const isRoot = depTree.arcs.some(a => a.dependent === verbId && a.head === 0);

    const lemma = this._lemmatize(word, tag);
    const isPassive = this._detectPassive(children);
    const isNegated = this._detectNegation(children, depTree);
    const isCopular = false;

    // Modal detection: scan aux children for MD tag or known modal words
    const modal = this._detectModality(depTree, verbId, children);

    // WS-D: Tense-aspect detection from POS tags + aux children
    const tenseAspect = this._detectTenseAspect(depTree, verbId, tag, children);

    const act = {
      verb: word,
      lemma,
      tag,
      verbId,
      isCopular,
      isPassive,
      isNegated,
      tenseAspect: tenseAspect,
    };

    if (modal) {
      act.modalVerb = modal.modalVerb;
      act.modality = modal.modality;
      act.actualityStatus = modal.actualityStatus;
      if (modal.deonticType) act.deonticType = modal.deonticType;
      // Reconstruct source text for DirectiveExtractor
      // Include aux:pass ("be") for passive modals: "shall be composed"
      const auxPassChild = children.find(c => c.label === 'aux:pass');
      if (auxPassChild) {
        act.sourceText = modal.modalVerb + ' ' + auxPassChild.word + ' ' + word;
      } else {
        act.sourceText = modal.modalVerb + ' ' + word;
      }

      // Subject-level negation flip: if isNegated (from "No X shall Y") but
      // _detectModality didn't catch the negation, flip modality here
      if (isNegated && !modal.isNegated) {
        const modalWord = modal.modalVerb.toLowerCase().replace(/n't$/, '').replace(/not$/, '').trim();
        const entry = MODAL_TABLE[modalWord];
        if (entry && entry.negatedModality) {
          act.modality = entry.negatedModality;
          act.actualityStatus = entry.negatedStatus;
        }
      }
    }

    return act;
  }

  /**
   * WS-D: Detect tense-aspect from POS tag and auxiliary children.
   *
   * Pattern table:
   *   VBD (no aux)         → SimplePastTense
   *   VBZ/VBP (no aux)     → SimplePresentTense
   *   is/are + VBG         → PresentProgressiveTense
   *   was/were + VBG       → PastProgressiveTense
   *   has/have + VBN       → PresentPerfectTense
   *   had + VBN            → PastPerfectTense
   *   MD:will + VB         → SimpleFutureTense (also handled by RDM)
   *
   * @param {DepTree} depTree
   * @param {number} verbId
   * @param {string} verbTag - POS tag of the main verb
   * @param {Array} children - Direct children of this verb
   * @returns {string|null} TenseAspect individual name or null
   */
  _detectTenseAspect(depTree, verbId, verbTag, children) {
    // Find aux children
    const auxChildren = children.filter(c => c.label === 'aux' || c.label === 'aux:pass');
    const auxWords = auxChildren.map(c => depTree.tokens[c.dependent - 1].toLowerCase());
    const auxTags = auxChildren.map(c => depTree.tags[c.dependent - 1]);

    // Progressive: aux "is/are/was/were" + main verb VBG
    if (verbTag === 'VBG') {
      const hasPastAux = auxWords.some(w => w === 'was' || w === 'were');
      const hasPresentAux = auxWords.some(w => w === 'is' || w === 'are' || w === 'am');
      if (hasPastAux) return 'PastProgressiveTense';
      if (hasPresentAux) return 'PresentProgressiveTense';
    }

    // Perfect: aux "has/have/had" + main verb VBN
    if (verbTag === 'VBN') {
      const hasHad = auxWords.some(w => w === 'had');
      const hasHasHave = auxWords.some(w => w === 'has' || w === 'have');
      if (hasHad) return 'PastPerfectTense';
      if (hasHasHave) return 'PresentPerfectTense';
      // Bare VBN with nsubj = past tense (POS tagger mistagged VBD as VBN)
      // "The organization reviewed..." → VBN but has nsubj → SimplePast
      const hasNsubj = children.some(c => c.label === 'nsubj' || c.label === 'nsubj:pass');
      if (hasNsubj) return 'SimplePastTense';
      // True bare VBN — passive or reduced relative, not a tense marker
      return null;
    }

    // Future: aux MD "will" + main verb VB
    if (verbTag === 'VB' && auxTags.some(t => t === 'MD')) {
      return 'SimpleFutureTense';
    }

    // Simple past: VBD with no perfect/progressive aux
    if (verbTag === 'VBD') return 'SimplePastTense';

    // Simple present: VBZ/VBP with no progressive/perfect aux
    if (verbTag === 'VBZ' || verbTag === 'VBP') return 'SimplePresentTense';

    return null;
  }

  /**
   * Detect modality from dependency tree.
   *
   * Detection order (per plan specification):
   *   1. Find modal: scan aux children for POS MD or known modal words
   *   2. Find negation: scan advmod children for "not"/"n't", or handle "cannot"
   *   3. Combine: if negation + modal has negated form, use negated modality/status
   *
   * @param {DepTree} depTree
   * @param {number} verbId - 1-indexed verb token ID
   * @param {Array} children - Direct children of this verb
   * @returns {{ modalVerb: string, modality: string, actualityStatus: string, deonticType: string|null }|null}
   */
  _detectModality(depTree, verbId, children) {
    // Step 1: Find modal among aux children
    let modalWord = null;
    let modalEntry = null;

    for (const child of children) {
      if (child.label !== 'aux' && child.label !== 'advmod') continue;
      const childWord = child.word.toLowerCase();
      // advmod children: only check "cannot" (POS tagger tags it as RB, not MD)
      if (child.label === 'advmod' && childWord !== 'cannot') continue;
      const childTag = depTree.tags[child.dependent - 1];

      // Resolve contraction stems: "ca" → "can", "wo" → "will"
      const resolvedWord = CONTRACTION_STEMS[childWord] || childWord;

      // Check by POS tag MD first, then by word lookup (fallback for mistagged modals)
      if (childTag === 'MD' || MODAL_TABLE[resolvedWord] || resolvedWord === 'cannot') {
        // "cannot" → look up "can" + force negation
        if (childWord === 'cannot') {
          modalEntry = MODAL_TABLE['can'];
          modalWord = 'cannot';
          if (modalEntry && modalEntry.negatedModality) {
            return {
              modalVerb: 'cannot',
              modality: modalEntry.negatedModality,
              actualityStatus: modalEntry.negatedStatus,
              deonticType: modalEntry.deonticType || null,
            };
          }
          break;
        }
        modalEntry = MODAL_TABLE[resolvedWord];
        if (modalEntry) {
          modalWord = resolvedWord;
          break;
        }
      }
    }

    // Handle "cannot" as single token: the tokenizer may keep it as one word
    // Check if the verb itself is "cannot" — it won't appear as an aux child
    if (!modalEntry) {
      const verbWord = depTree.tokens[verbId - 1].toLowerCase();
      if (verbWord === 'cannot') {
        modalEntry = MODAL_TABLE['can'];
        modalWord = 'cannot';
        // "cannot" is inherently negated
        if (modalEntry && modalEntry.negatedModality) {
          return {
            modalVerb: 'cannot',
            modality: modalEntry.negatedModality,
            actualityStatus: modalEntry.negatedStatus,
            deonticType: modalEntry.deonticType || null,
          };
        }
      }
    }

    if (!modalEntry) return null;

    // Step 2: Check for negation among siblings
    const hasNegation = children.some(c => {
      if (c.label === 'advmod') {
        const w = c.word.toLowerCase();
        return w === 'not' || w === "n't" || w === 'never';
      }
      return c.label === 'neg';
    });

    // Step 3: Combine modal + negation
    if (hasNegation && modalEntry.negatedModality) {
      return {
        modalVerb: modalWord,
        modality: modalEntry.negatedModality,
        actualityStatus: modalEntry.negatedStatus,
        deonticType: modalEntry.deonticType || null,
      };
    }

    return {
      modalVerb: modalWord,
      modality: modalEntry.modality,
      actualityStatus: modalEntry.status,
      deonticType: modalEntry.deonticType || null,
    };
  }

  /**
   * Handle copular construction: root is the predicate with a `cop` child.
   *
   * In UD v2, copular sentences have the predicate as root:
   *   "CBP is a component of DHS" → root=component, cop=is, nsubj=CBP, nmod=DHS
   *   "The headquarters is in Washington" → root=Washington, cop=is, nsubj=headquarters
   *   "CBP is not ..." → root=predicate, cop=is, advmod=not
   *
   * @param {DepTree} depTree
   * @param {number} predicateId - 1-indexed predicate token ID (root)
   * @param {Object} copChild - The cop child arc
   * @param {Array} children - All children of the predicate
   * @returns {StructuralAssertion|null}
   */
  _handleCopular(depTree, predicateId, copChild, children) {
    const predicateWord = depTree.tokens[predicateId - 1];
    const predicateTag = depTree.tags[predicateId - 1];
    const copulaWord = copChild.word;

    // Find subject
    const subjectChild = children.find(c =>
      c.label === 'nsubj' || c.label === 'nsubj:pass'
    );
    if (!subjectChild) return null;

    // Get subject text from subtree
    const subjectSubtree = depTree.getEntitySubtree(subjectChild.dependent);
    const subjectText = subjectSubtree.tokens.join(' ');

    // Check for negation
    const isNegated = this._detectNegation(children, depTree);

    // Check for locative pattern: predicate has a `case` child (preposition)
    const caseChild = children.find(c => c.label === 'case');
    if (caseChild) {
      const prep = caseChild.word.toLowerCase();
      if (['in', 'at', 'on', 'near', 'under', 'above', 'behind'].includes(prep)) {
        // Note: "by" excluded — too ambiguous (authorship "by the author", agency "by the officer")
        // Locative copular: "X is in Y"
        return {
          type: 'copular',
          pattern: 'locative',
          subject: subjectText,
          object: predicateWord,
          copula: copulaWord,
          negated: isNegated,
          relation: 'located_in',
          predicateId,
          subjectId: subjectChild.dependent,
        };
      }
    }

    // Get predicate subtree text for relation inference
    const predicateSubtree = depTree.getEntitySubtree(predicateId);
    const predicateText = predicateSubtree.tokens.join(' ').toLowerCase();

    // Find nmod children for "X of Y" patterns
    const nmodChild = children.find(c => c.label === 'nmod');
    let objectText = null;
    let objectId = null;
    if (nmodChild) {
      const objectSubtree = depTree.getEntitySubtree(nmodChild.dependent);
      objectText = objectSubtree.tokens.join(' ');
      objectId = nmodChild.dependent;
    }

    // Find obl children for "responsible for X" patterns
    const oblChild = children.find(c => c.label === 'obl');
    if (!objectText && oblChild) {
      const oblSubtree = depTree.getEntitySubtree(oblChild.dependent);
      objectText = oblSubtree.tokens.join(' ');
      objectId = oblChild.dependent;
    }

    // Infer relation from predicate pattern
    const relation = this._inferRelation(depTree, predicateId, predicateText, children);

    return {
      type: 'copular',
      pattern: isNegated ? 'negated_predication' : 'predication',
      subject: subjectText,
      object: objectText,
      copula: copulaWord,
      negated: isNegated,
      relation,
      predicateId,
      subjectId: subjectChild.dependent,
      objectId,
      predicateText: predicateWord,
      predicateFullText: this._getPredicateNounPhrase(depTree, predicateId),
      predicateTag,
    };
  }

  /**
   * Handle existential construction: "There is X"
   * Root is the verb "is" with expl "There" and nsubj for the entity.
   *
   * @param {DepTree} depTree
   * @param {number} verbId
   * @param {Array} children
   * @returns {StructuralAssertion|null}
   */
  _handleExistential(depTree, verbId, children) {
    const subjectChild = children.find(c => c.label === 'nsubj');
    if (!subjectChild) return null;

    const subjectSubtree = depTree.getEntitySubtree(subjectChild.dependent);
    const subjectText = subjectSubtree.tokens.join(' ');

    return {
      type: 'existential',
      pattern: 'existential',
      subject: subjectText,
      object: null,
      copula: depTree.tokens[verbId - 1],
      negated: this._detectNegation(children, depTree),
      relation: null,
      subjectId: subjectChild.dependent,
    };
  }

  /**
   * Check if a verb is a possessive construction.
   * Possessive = verb lemma "have" + obj child + no aux child.
   */
  /**
   * Event-noun blacklist: nouns that denote events, not things.
   * "The committee has a meeting" → NOT stative (event-noun).
   */
  static get EVENT_NOUN_BLACKLIST() {
    return new Set([
      'meeting', 'surgery', 'flight', 'appointment', 'conference',
      'session', 'trial', 'hearing', 'examination', 'interview',
      'wedding', 'funeral', 'party', 'ceremony', 'celebration',
      'game', 'match', 'race', 'competition', 'concert', 'performance',
      'lesson', 'class', 'lecture', 'seminar', 'workshop',
      'trip', 'journey', 'vacation', 'tour', 'visit',
      'conversation', 'discussion', 'debate', 'argument', 'fight',
      'operation', 'procedure', 'transaction', 'deal', 'negotiation'
    ]);
  }

  _isPossessive(word, tag, children, depTree) {
    const lemma = this._lemmatize(word, tag);
    if (lemma !== 'have') return false;

    const objChild = children.find(c => c.label === 'obj');
    if (!objChild) return false;
    const hasAux = children.some(c => c.label === 'aux' || c.label === 'aux:pass');
    if (hasAux) return false;

    // Event-noun check: if the object is an event noun, this is NOT possessive stative
    if (depTree) {
      const objLemma = this._lemmatize(depTree.tokens[objChild.dependent - 1], depTree.tags[objChild.dependent - 1]);
      if (TreeActExtractor.EVENT_NOUN_BLACKLIST.has(objLemma)) return false;
    }

    return true;
  }

  /**
   * Handle possessive construction: "X has Y"
   */
  _handlePossessive(depTree, verbId, children) {
    const subjectChild = children.find(c => c.label === 'nsubj');
    const objectChild = children.find(c => c.label === 'obj');

    if (!subjectChild || !objectChild) return null;

    const subjectSubtree = depTree.getEntitySubtree(subjectChild.dependent);
    const objectSubtree = depTree.getEntitySubtree(objectChild.dependent);

    return {
      type: 'possessive',
      pattern: 'possessive',
      subject: subjectSubtree.tokens.join(' '),
      object: objectSubtree.tokens.join(' '),
      copula: depTree.tokens[verbId - 1],
      negated: this._detectNegation(children, depTree),
      relation: 'has_possession',
      subjectId: subjectChild.dependent,
      objectId: objectChild.dependent,
    };
  }

  /**
   * Evidential/perception copula verbs.
   */
  /**
   * Non-copular stative verbs that denote relations, not acts.
   * Maps verb lemma → ontological relation.
   */
  static get STATIVE_VERB_MAP() {
    return {
      'include': 'has_member_part',
      'contain': 'has_continuant_part',
      'comprise': 'has_member_part',
      'consist': 'has_continuant_part',
      'encompass': 'has_continuant_part',
    };
  }

  /**
   * Check if a verb is a non-copular stative verb.
   */
  _isStativeVerb(word, tag, children) {
    if (!VERB_TAGS.has(tag)) return false;
    // Modal verbs override stative: "must include" → RDM path, not stative
    const hasModal = children.some(c => c.label === 'aux' && c.word && c.word.toUpperCase() !== c.word);
    if (hasModal) {
      const modalChild = children.find(c => c.label === 'aux');
      if (modalChild && MODAL_TABLE[modalChild.word.toLowerCase()]) return false;
    }
    const lemma = this._lemmatize(word, tag);
    const lower = word.toLowerCase();
    // Check both lemma and raw word (lemmatizer may over-strip: "includes" → "includ")
    const matchesStative = TreeActExtractor.STATIVE_VERB_MAP[lemma] ||
                           TreeActExtractor.STATIVE_VERB_MAP[lower] ||
                           Object.keys(TreeActExtractor.STATIVE_VERB_MAP).some(k => lower.startsWith(k));
    if (!matchesStative) return false;
    // Must have obj or nmod child (the thing being included/contained)
    return children.some(c => c.label === 'obj' || c.label === 'nmod');
  }

  /**
   * Handle non-copular stative verb: "The group includes five members"
   */
  _handleStativeVerb(depTree, verbId, children) {
    const word = depTree.tokens[verbId - 1];
    const tag = depTree.tags[verbId - 1];
    const lemma = this._lemmatize(word, tag);
    const lower = word.toLowerCase();
    const matchedKey = Object.keys(TreeActExtractor.STATIVE_VERB_MAP).find(k =>
      lemma === k || lower === k || lower.startsWith(k)
    );
    const relation = matchedKey ? TreeActExtractor.STATIVE_VERB_MAP[matchedKey] : null;

    const subjectChild = children.find(c => c.label === 'nsubj' || c.label === 'nsubj:pass');
    const objectChild = children.find(c => c.label === 'obj') || children.find(c => c.label === 'nmod');

    if (!subjectChild) return null;

    const subjectSubtree = depTree.getEntitySubtree(subjectChild.dependent);
    let objectText = null;
    let objectId = null;
    if (objectChild) {
      const objectSubtree = depTree.getEntitySubtree(objectChild.dependent);
      objectText = objectSubtree.tokens.join(' ');
      objectId = objectChild.dependent;
    }

    return {
      type: 'stative_verb',
      pattern: 'stative_relation',
      subject: subjectSubtree.tokens.join(' '),
      object: objectText,
      copula: word,
      negated: this._detectNegation(children, depTree),
      relation: relation,
      predicateId: verbId,
      subjectId: subjectChild.dependent,
      objectId: objectId,
      predicateText: lemma,
      predicateTag: tag,
    };
  }

  /**
   * Get just the noun phrase for a copular predicate, excluding nsubj, cop, punct.
   * "student" with det "a" → "a student"
   * Avoids getEntitySubtree which pulls in the entire clause.
   */
  _getPredicateNounPhrase(depTree, predicateId) {
    const indices = [predicateId];
    const children = depTree.getChildren(predicateId);
    for (const child of children) {
      // Include only NP-internal dependents: det, amod, compound, nummod, flat
      if (['det', 'amod', 'compound', 'nummod', 'flat', 'flat:name'].includes(child.label)) {
        indices.push(child.dependent);
      }
    }
    indices.sort((a, b) => a - b);
    return indices.map(i => depTree.tokens[i - 1]).join(' ');
  }

  static get EVIDENTIAL_VERBS() {
    return new Set(['seem', 'appear', 'look', 'sound', 'feel', 'taste', 'smell']);
  }

  /**
   * Check if a verb is an evidential copula ("She seems tired").
   * Pattern 5: root is perception verb + xcomp adjective.
   */
  _isEvidentialCopula(word, tag, children, depTree) {
    const lemma = this._lemmatize(word, tag);
    if (!TreeActExtractor.EVIDENTIAL_VERBS.has(lemma)) return false;
    if (!VERB_TAGS.has(tag)) return false;
    // Must have xcomp child that is an adjective
    const xcompChild = children.find(c => c.label === 'xcomp');
    if (!xcompChild) return false;
    const xcompTag = depTree.tags[xcompChild.dependent - 1];
    return xcompTag === 'JJ' || xcompTag === 'JJR' || xcompTag === 'JJS';
  }

  /**
   * Handle evidential copula: "She seems tired"
   * Returns a StructuralAssertion with evidential metadata.
   */
  _handleEvidentialCopula(depTree, verbId, children) {
    const xcompChild = children.find(c => c.label === 'xcomp');
    if (!xcompChild) return null;

    const subjectChild = children.find(c => c.label === 'nsubj' || c.label === 'nsubj:pass');
    if (!subjectChild) return null;

    const subjectSubtree = depTree.getEntitySubtree(subjectChild.dependent);
    const qualityWord = depTree.tokens[xcompChild.dependent - 1];
    const evidentialLemma = this._lemmatize(depTree.tokens[verbId - 1], depTree.tags[verbId - 1]);

    return {
      type: 'evidential_copular',
      pattern: 'quality_assertion',
      subject: subjectSubtree.tokens.join(' '),
      object: null,
      copula: depTree.tokens[verbId - 1],
      negated: this._detectNegation(children, depTree),
      relation: null,
      predicateId: xcompChild.dependent,
      subjectId: subjectChild.dependent,
      predicateText: qualityWord,
      predicateTag: depTree.tags[xcompChild.dependent - 1],
      evidentialMarker: evidentialLemma,
    };
  }

  /**
   * Check if a verb implies a relation pattern.
   * E.g., "is located in X" → bfo:located_in (passive form of "locate").
   *
   * @param {DepTree} depTree
   * @param {number} verbId
   * @param {Array} children
   * @param {Act} act
   * @returns {StructuralAssertion|null}
   */
  _checkVerbRelation(depTree, verbId, children, act) {
    if (!act) return null;

    const lemma = act.lemma || this._lemmatize(depTree.tokens[verbId - 1], depTree.tags[verbId - 1]);

    // "located in X" → bfo:located_in
    // "based in X" → bfo:located_in
    // GUARD: "The building was located BY the surveyor" is agentive passive,
    // not stative-locative. If obl has case child "by" (agent marker), this
    // is eventive — keep as Act. Only treat as StructuralAssertion when
    // obl has locative case child ("in", "at", "on").
    if ((lemma === 'locate' || lemma === 'base') && act.isPassive) {
      const hasAgentMarker = children.some(c => {
        if (c.label !== 'obl') return false;
        const oblChildren = depTree.getChildren(c.dependent);
        return oblChildren.some(oc => oc.label === 'case' &&
          depTree.tokens[oc.dependent - 1].toLowerCase() === 'by');
      });
      if (hasAgentMarker) return null; // Eventive, not stative
    }
    if (lemma === 'locate' || lemma === 'base') {
      const oblChild = children.find(c => c.label === 'obl');
      if (oblChild) {
        const oblChildren = depTree.getChildren(oblChild.dependent);
        const caseChild = oblChildren.find(c => c.label === 'case');
        const prep = caseChild ? caseChild.word.toLowerCase() : '';
        if (prep === 'in' || prep === 'at') {
          // Find subject
          const subjectChild = children.find(c =>
            c.label === 'nsubj' || c.label === 'nsubj:pass'
          );
          if (subjectChild) {
            const subjectSubtree = depTree.getEntitySubtree(subjectChild.dependent);
            const objectSubtree = depTree.getEntitySubtree(oblChild.dependent);
            return {
              type: 'copular',
              pattern: 'locative',
              subject: subjectSubtree.tokens.join(' '),
              object: objectSubtree.tokens.join(' '),
              copula: depTree.tokens[verbId - 1],
              negated: act.isNegated,
              relation: 'located_in',
              subjectId: subjectChild.dependent,
              objectId: oblChild.dependent,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract acts from embedded clauses (advcl, acl:relcl).
   */
  _extractEmbeddedActs(depTree, parentId, acts, structuralAssertions) {
    const children = depTree.getChildren(parentId);
    // Get parent act's modal info for inheritance to conj children
    const parentTag = depTree.tags[parentId - 1];
    const parentAct = VERB_TAGS.has(parentTag)
      ? acts.find(a => a.verbId === parentId)
      : null;

    for (const child of children) {
      if (child.label === 'advcl' || child.label === 'acl:relcl' || child.label === 'acl' || child.label === 'ccomp') {
        const embeddedTag = depTree.tags[child.dependent - 1];
        if (VERB_TAGS.has(embeddedTag)) {
          const embeddedChildren = depTree.getChildren(child.dependent);
          const act = this._buildAct(depTree, child.dependent, embeddedChildren);
          if (act) {
            // Inherit deontic modality from parent ONLY for non-finite verbs.
            // Finite verbs (VBD, VBZ, VBP) have independent tense — they describe
            // actual events, not prescribed ones. VBN in reduced relatives ("data
            // received from USCIS") also describes completed events.
            // Non-finite forms (VB base, VBG gerund) are within the deontic scope.
            const FINITE_TAGS = new Set(['VBD', 'VBZ', 'VBP', 'VBN']);
            if (!act.modality && parentAct && parentAct.modality && !FINITE_TAGS.has(embeddedTag)) {
              act.modalVerb = parentAct.modalVerb;
              act.modality = parentAct.modality;
              act.actualityStatus = parentAct.actualityStatus;
              act.deonticType = parentAct.deonticType;
              act.sourceText = (parentAct.modalVerb || '') + ' ' + act.verb;
            }
            acts.push(act);
          }
          // Recurse into embedded clause to find deeper acts (e.g., ccomp inside acl)
          this._extractEmbeddedActs(depTree, child.dependent, acts, structuralAssertions);
        }
      }
      // Coordinated verbs: conj children inherit the parent's modal
      // Stamp coordinatedVPIndex for shared-argument propagation (TT-SPEC-RDM-B §3)
      if (child.label === 'conj') {
        const conjTag = depTree.tags[child.dependent - 1];
        if (VERB_TAGS.has(conjTag)) {
          const conjChildren = depTree.getChildren(child.dependent);
          const act = this._buildAct(depTree, child.dependent, conjChildren);
          if (act) {
            // Inherit modal from parent if conj doesn't have its own
            if (!act.modality && parentAct && parentAct.modality) {
              act.modalVerb = parentAct.modalVerb;
              act.modality = parentAct.modality;
              act.actualityStatus = parentAct.actualityStatus;
              act.deonticType = parentAct.deonticType;
              act.sourceText = (parentAct.modalVerb || '') + ' ' + act.verb;
            }
            // Inherit tenseAspect from parent if conj doesn't have its own
            if (!act.tenseAspect && parentAct && parentAct.tenseAspect) {
              act.tenseAspect = parentAct.tenseAspect;
            }
            // Stamp coordinatedVPIndex: parent is 0, conjuncts are 1, 2, ...
            if (parentAct && parentAct.coordinatedVPIndex === undefined) {
              parentAct.coordinatedVPIndex = 0;
            }
            act.coordinatedVPIndex = (parentAct ? parentAct._nextConjIdx || 1 : 1);
            if (parentAct) parentAct._nextConjIdx = act.coordinatedVPIndex + 1;
            acts.push(act);
          }
        }
      }
    }
  }

  /**
   * Check for multi-word modal patterns: "have to VERB", "need to VERB".
   * The root is the control verb ("have"/"need") with xcomp → real verb and mark → "to".
   * Returns an act for the real verb with obligation modality, or null.
   *
   * @param {DepTree} depTree
   * @param {number} rootId - 1-indexed root verb ID
   * @param {Array} children - Direct children of root
   * @returns {Act|null}
   */
  _checkMultiWordModal(depTree, rootId, children) {
    const rootWord = depTree.tokens[rootId - 1];
    const rootTag = depTree.tags[rootId - 1];
    const rootLemma = this._lemmatize(rootWord, rootTag);

    const modalModality = MULTI_WORD_MODAL_LEMMAS[rootLemma];
    if (!modalModality) return null;

    // Find xcomp child (the real verb)
    const xcompChild = children.find(c => c.label === 'xcomp');
    if (!xcompChild) return null;

    // Verify "to" mark exists on the xcomp
    const xcompChildren = depTree.getChildren(xcompChild.dependent);
    const hasToMark = xcompChildren.some(c => c.label === 'mark' && c.word.toLowerCase() === 'to');
    if (!hasToMark) return null;

    // Build act for the real verb (xcomp)
    const act = this._buildAct(depTree, xcompChild.dependent, xcompChildren);
    if (!act) return null;

    // Override with multi-word modal properties
    // Look up the actual modality entry — 'ought' maps to 'recommendation', not 'obligation'
    const matchingModal = Object.entries(MODAL_TABLE).find(([, v]) => v.modality === modalModality);
    const entry = matchingModal ? matchingModal[1] : MODAL_TABLE['must'];
    act.modalVerb = rootLemma + ' to';
    act.modality = modalModality;
    act.actualityStatus = entry.status;
    act.deonticType = entry.deonticType;
    act.sourceText = rootWord + ' to ' + act.verb;

    return act;
  }

  /**
   * Detect passive voice from children.
   * Passive if: nsubj:pass child exists OR aux:pass child exists.
   */
  _detectPassive(children) {
    return children.some(c =>
      c.label === 'nsubj:pass' || c.label === 'aux:pass'
    );
  }

  /**
   * Detect negation from children.
   * Negated if: advmod child with word "not"/"n't" or neg child.
   */
  _detectNegation(children, depTree) {
    // Direct negation: advmod "not"/"never" or neg relation on the verb
    const directNeg = children.some(c => {
      if (c.label === 'advmod') {
        const word = c.word.toLowerCase();
        return word === 'not' || word === "n't" || word === 'never' || word === 'no';
      }
      if (c.label === 'neg') return true;
      return false;
    });
    if (directNeg) return true;

    // Subject-level negation: "No X shall Y" / "Neither X nor Y shall Z"
    // Check if nsubj has a det with "no" or "neither"
    if (depTree) {
      const nsubjChild = children.find(c => c.label === 'nsubj' || c.label === 'nsubj:pass');
      if (nsubjChild) {
        const nsubjChildren = depTree.getChildren(nsubjChild.dependent) || [];
        const negDet = nsubjChildren.some(c =>
          c.label === 'det' && (c.word.toLowerCase() === 'no' || c.word.toLowerCase() === 'neither')
        );
        if (negDet) return true;
      }
    }

    return false;
  }

  /**
   * Infer relation from copular predicate.
   * Uses the relation inference table (AC-3.8b).
   *
   * @param {DepTree} depTree
   * @param {number} predicateId
   * @param {string} predicateText - Lowercased predicate subtree text
   * @param {Array} children
   * @returns {string|null} Relation IRI
   */
  _inferRelation(depTree, predicateId, predicateText, children) {
    const predicateWord = depTree.tokens[predicateId - 1].toLowerCase();

    // Check nmod children for "X of Y" patterns
    const nmodChild = children.find(c => c.label === 'nmod');
    if (nmodChild) {
      // Get the case child of the nmod to find the preposition
      const nmodChildren = depTree.getChildren(nmodChild.dependent);
      const caseChild = nmodChildren.find(c => c.label === 'case');
      const prep = caseChild ? caseChild.word.toLowerCase() : '';

      // Build "predicate prep" pattern for matching
      const pattern = `${predicateWord} ${prep}`.trim();

      for (const entry of RELATION_INFERENCE_TABLE) {
        if (pattern === entry.pattern || predicateText.includes(entry.pattern)) {
          return entry.relation;
        }
      }
    }

    // Check obl children for "responsible for X" pattern
    const oblChild = children.find(c => c.label === 'obl');
    if (oblChild) {
      const oblChildren = depTree.getChildren(oblChild.dependent);
      const caseChild = oblChildren.find(c => c.label === 'case');
      const prep = caseChild ? caseChild.word.toLowerCase() : '';
      const pattern = `${predicateWord} ${prep}`.trim();

      for (const entry of RELATION_INFERENCE_TABLE) {
        if (pattern === entry.pattern || predicateText.includes(entry.pattern)) {
          return entry.relation;
        }
      }
    }

    // Check acl children for "type of herding dog" pattern where
    // "of" is mark of acl child, not case of nmod
    const aclChild = children.find(c => c.label === 'acl');
    if (aclChild) {
      const aclChildren = depTree.getChildren(aclChild.dependent);
      const markChild = aclChildren.find(c => c.label === 'mark');
      if (markChild) {
        const prep = markChild.word.toLowerCase();
        const pattern = `${predicateWord} ${prep}`.trim();
        for (const entry of RELATION_INFERENCE_TABLE) {
          if (pattern === entry.pattern) {
            return entry.relation;
          }
        }
      }
    }

    // Also check the full predicate text for patterns
    for (const entry of RELATION_INFERENCE_TABLE) {
      if (predicateText.includes(entry.pattern)) {
        return entry.relation;
      }
    }

    // FT-03b: Preposition-based fallback — when no specific predicate pattern
    // matches, use the preposition alone to infer a default relation.
    // e.g. "X is an agency of Y" → "of" → member_part_of
    const fallbackPrep = this._extractFallbackPreposition(depTree, children);
    if (fallbackPrep && PREPOSITION_FALLBACK_RELATIONS[fallbackPrep]) {
      return PREPOSITION_FALLBACK_RELATIONS[fallbackPrep];
    }

    return null;
  }

  /**
   * Extract the governing preposition from nmod/obl children for fallback
   * relation inference. Checks nmod first (most common for copulars), then obl.
   *
   * @param {DepTree} depTree
   * @param {Array} children - Children of the predicate root
   * @returns {string|null} Lowercase preposition or null
   */
  _extractFallbackPreposition(depTree, children) {
    const nmodChild = children.find(c => c.label === 'nmod');
    if (nmodChild) {
      const nmodChildren = depTree.getChildren(nmodChild.dependent);
      const caseChild = nmodChildren.find(c => c.label === 'case');
      if (caseChild) return caseChild.word.toLowerCase();
    }
    const oblChild = children.find(c => c.label === 'obl');
    if (oblChild) {
      const oblChildren = depTree.getChildren(oblChild.dependent);
      const caseChild = oblChildren.find(c => c.label === 'case');
      if (caseChild) return caseChild.word.toLowerCase();
    }
    return null;
  }

  /**
   * Simple verb lemmatization.
   *
   * @param {string} word
   * @param {string} tag
   * @returns {string}
   */
  _lemmatize(word, tag) {
    const lower = word.toLowerCase();

    // Check irregular forms first
    if (IRREGULAR_LEMMAS[lower]) return IRREGULAR_LEMMAS[lower];

    // Simple suffix-based lemmatization
    // Note: verbs whose stem ends in 'e' (provide→provided) should be in IRREGULAR_LEMMAS
    if (tag === 'VBD' || tag === 'VBN') {
      if (lower.endsWith('ied')) return lower.slice(0, -3) + 'y';
      if (lower.endsWith('ed')) return lower.slice(0, -2);
      if (lower.endsWith('d')) return lower.slice(0, -1);
    }
    if (tag === 'VBG') {
      if (lower.endsWith('ing')) return lower.slice(0, -3);
    }
    if (tag === 'VBZ') {
      if (lower.endsWith('ies')) return lower.slice(0, -3) + 'y';
      if (lower.endsWith('es')) return lower.slice(0, -2);
      if (lower.endsWith('s')) return lower.slice(0, -1);
    }

    return lower;
  }
}

// ============================================================================
// Exports
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TreeActExtractor;
}
if (typeof window !== 'undefined') {
  window.TreeActExtractor = TreeActExtractor;
}
