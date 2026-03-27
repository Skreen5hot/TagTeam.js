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

      if (copChild) {
        // Copular construction: root is the PREDICATE, cop is the copula verb
        const assertion = this._handleCopular(depTree, rootId, copChild, children);
        if (assertion) structuralAssertions.push(assertion);
      } else if (explChild && VERB_TAGS.has(rootTag)) {
        // Existential: "There is X" — root is the verb "is" with expl "There"
        const assertion = this._handleExistential(depTree, rootId, children);
        if (assertion) structuralAssertions.push(assertion);
      } else if (this._isPossessive(rootWord, rootTag, children)) {
        // Possessive: "X has Y" — verb lemma "have" + obj, no aux
        const assertion = this._handlePossessive(depTree, rootId, children);
        if (assertion) structuralAssertions.push(assertion);
        // Also create an act for "has"
        const act = this._buildAct(depTree, rootId, children);
        if (act) {
          act.type = 'possessive';
          act.pattern = 'possessive';
          acts.push(act);
        }
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

    return { acts, structuralAssertions };
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
    const isNegated = this._detectNegation(children);
    const isCopular = false;

    // Modal detection: scan aux children for MD tag or known modal words
    const modal = this._detectModality(depTree, verbId, children);

    const act = {
      verb: word,
      lemma,
      tag,
      verbId,
      isCopular,
      isPassive,
      isNegated,
    };

    if (modal) {
      act.modalVerb = modal.modalVerb;
      act.modality = modal.modality;
      act.actualityStatus = modal.actualityStatus;
      if (modal.deonticType) act.deonticType = modal.deonticType;
      // Reconstruct source text for DirectiveExtractor
      act.sourceText = modal.modalVerb + ' ' + word;
    }

    return act;
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
    const isNegated = this._detectNegation(children);

    // Check for locative pattern: predicate has a `case` child (preposition)
    const caseChild = children.find(c => c.label === 'case');
    if (caseChild) {
      const prep = caseChild.word.toLowerCase();
      if (['in', 'at', 'on', 'near', 'by', 'under', 'above', 'behind'].includes(prep)) {
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
      negated: this._detectNegation(children),
      relation: null,
      subjectId: subjectChild.dependent,
    };
  }

  /**
   * Check if a verb is a possessive construction.
   * Possessive = verb lemma "have" + obj child + no aux child.
   */
  _isPossessive(word, tag, children) {
    const lemma = this._lemmatize(word, tag);
    if (lemma !== 'have') return false;

    const hasObj = children.some(c => c.label === 'obj');
    const hasAux = children.some(c => c.label === 'aux' || c.label === 'aux:pass');
    return hasObj && !hasAux;
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
      negated: this._detectNegation(children),
      relation: 'has_possession',
      subjectId: subjectChild.dependent,
      objectId: objectChild.dependent,
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
          if (act) acts.push(act);
          // Recurse into embedded clause to find deeper acts (e.g., ccomp inside acl)
          this._extractEmbeddedActs(depTree, child.dependent, acts, structuralAssertions);
        }
      }
      // Coordinated verbs: conj children inherit the parent's modal
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
  _detectNegation(children) {
    return children.some(c => {
      if (c.label === 'advmod') {
        const word = c.word.toLowerCase();
        return word === 'not' || word === "n't" || word === 'never' || word === 'no';
      }
      if (c.label === 'neg') return true;
      return false;
    });
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
