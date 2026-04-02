/**
 * DepTreeCorrector.js — Post-parse dependency arc corrections
 *
 * Source: Major-Refactor-Roadmap.md §Phase 4, AC-4.3b
 * Authority: English ditransitive verb frame (Levin 1993 §2.1)
 *
 * Applies targeted arc rewrites to fix known parser errors:
 *   1. Ditransitive compound→iobj rewrite:
 *      "gave the patient medication" → patient is iobj, not compound of medication
 *
 * Operates on raw arc arrays BEFORE DepTree construction.
 */

'use strict';

/**
 * Ditransitive verbs that take double-object constructions (V NP NP).
 * When the parser produces compound instead of iobj for these verbs,
 * the arc may need rewriting.
 */
const DITRANSITIVE_VERBS = new Set([
  'give', 'send', 'hand', 'show', 'tell', 'offer',
  'teach', 'bring', 'pass', 'award'
]);

/**
 * Animate/recipient-capable nouns. The compound child must match one
 * of these to be rewritten — this prevents false positives like
 * "homework assignment" where "homework" is a genuine compound modifier.
 */
const RECIPIENT_NOUNS = new Set([
  // Medical/healthcare
  'patient', 'doctor', 'nurse', 'surgeon', 'therapist', 'caregiver',
  // General persons
  'person', 'man', 'woman', 'child', 'boy', 'girl', 'baby',
  'parent', 'mother', 'father',
  // Professional
  'student', 'teacher', 'professor', 'manager', 'director',
  'officer', 'agent', 'employee', 'worker', 'staff', 'member',
  'client', 'customer', 'user', 'colleague',
  // Groups (can receive in English)
  'committee', 'board', 'team', 'group', 'audience', 'class', 'jury',
  // Organizational
  'secretary', 'administrator', 'supervisor', 'commander', 'inspector'
]);

/**
 * Irregular verb → infinitive mappings for ditransitive verbs.
 */
const VERB_LEMMA = {
  'gave': 'give', 'given': 'give', 'giving': 'give',
  'sent': 'send', 'sending': 'send',
  'handed': 'hand', 'handing': 'hand',
  'showed': 'show', 'shown': 'show', 'showing': 'show',
  'told': 'tell', 'telling': 'tell',
  'offered': 'offer', 'offering': 'offer',
  'taught': 'teach', 'teaching': 'teach',
  'brought': 'bring', 'bringing': 'bring',
  'passed': 'pass', 'passing': 'pass',
  'awarded': 'award', 'awarding': 'award'
};

/**
 * Get lemma for a verb form.
 * @param {string} form - Surface form
 * @returns {string} Lemma
 */
function getLemma(form) {
  const lower = form.toLowerCase();
  return VERB_LEMMA[lower] || lower;
}

/**
 * Apply ditransitive corrections to a raw arc array.
 *
 * Pattern detected: verb has obj child, and obj has compound child that:
 *   1. Precedes the obj head in linear order (English iobj precedes obj)
 *   2. Is tagged NN or NNP (noun, not adjective or other modifier)
 *   3. Matches RECIPIENT_NOUNS (animate/recipient-capable)
 *   OR is tagged NNP (proper noun — always a potential recipient)
 *
 * Rewrite: compound→iobj, reassign preceding det to new iobj
 *
 * @param {Array<{dependent: number, head: number, label: string, scoreMargin: number}>} arcs
 * @param {string[]} tokens - 0-indexed token array
 * @param {string[]} tags - 0-indexed POS tag array
 * @returns {Array} Modified arcs (same array, mutated in place)
 */
function correctDitransitives(arcs, tokens, tags) {
  // Build head→children index
  const childrenOf = new Map();
  const arcOf = new Map();
  for (const arc of arcs) {
    arcOf.set(arc.dependent, arc);
    if (!childrenOf.has(arc.head)) childrenOf.set(arc.head, []);
    childrenOf.get(arc.head).push(arc);
  }

  // Find verb roots and their obj children
  for (const arc of arcs) {
    if (arc.head === 0) continue; // skip root arcs for verb detection
    // We care about arcs that point to a verb (head is a verb)
  }

  // For each arc that is a root or verb, check for ditransitive pattern
  for (const arc of arcs) {
    const verbId = arc.dependent;
    const verbTag = tags[verbId - 1];
    if (!verbTag || !verbTag.startsWith('VB')) continue;

    const lemma = getLemma(tokens[verbId - 1]);
    if (!DITRANSITIVE_VERBS.has(lemma)) continue;

    // Find obj child of this verb
    const verbChildren = childrenOf.get(verbId) || [];
    const objArc = verbChildren.find(c => c.label === 'obj');
    if (!objArc) continue;

    const objId = objArc.dependent;
    // Find compound child of obj
    const objChildren = childrenOf.get(objId) || [];
    const compoundArc = objChildren.find(c => c.label === 'compound');
    if (!compoundArc) continue;

    const compId = compoundArc.dependent;
    const compToken = tokens[compId - 1].toLowerCase();
    const compTag = tags[compId - 1];

    // Condition: compound precedes obj head in linear order
    if (compId >= objId) continue;

    // Condition: compound is NN or NNP
    if (compTag !== 'NN' && compTag !== 'NNP') continue;

    // Condition: compound is animate/recipient-capable OR is a proper noun
    if (compTag !== 'NNP' && !RECIPIENT_NOUNS.has(compToken)) continue;

    // All conditions met — rewrite compound→iobj
    compoundArc.label = 'iobj';
    compoundArc.head = verbId;

    // Reassign det: if there's a det→objId that precedes the compound,
    // it should become det→compId (it was "the patient", not "the medication")
    const detArc = objChildren.find(c =>
      c.label === 'det' && c.dependent < compId
    );
    if (detArc) {
      detArc.head = compId;
      // Update children index
      const objKids = childrenOf.get(objId);
      if (objKids) {
        const detIdx = objKids.indexOf(detArc);
        if (detIdx >= 0) objKids.splice(detIdx, 1);
      }
      if (!childrenOf.has(compId)) childrenOf.set(compId, []);
      childrenOf.get(compId).push(detArc);
    }

    // Move compound from obj's children to verb's children in index
    const objKids2 = childrenOf.get(objId);
    if (objKids2) {
      const compIdx = objKids2.indexOf(compoundArc);
      if (compIdx >= 0) objKids2.splice(compIdx, 1);
    }
    verbChildren.push(compoundArc);
  }

  return arcs;
}

/**
 * Detect and correct fragmented copular sentences.
 *
 * Pattern: Multiple roots where one is VBZ "is"/"are" and others are nouns.
 * The dep parser failed to produce the standard copular structure:
 *   predicate as root, subject as nsubj, copula as cop.
 *
 * Example: "CMS is the Recipient Agency" parsed as 4 roots: CMS, is, Recipient, .
 * Corrected to: Agency/Recipient as root, CMS as nsubj, is as cop.
 *
 * @param {Array} arcs - Raw arc array
 * @param {string[]} tokens - 0-indexed token array
 * @param {string[]} tags - 0-indexed POS tag array
 * @returns {Array} Modified arcs
 */
function correctCopularFragmentation(arcs, tokens, tags) {
  // Find all root arcs
  const rootArcs = arcs.filter(a => a.label === 'root' && a.head === 0);
  if (rootArcs.length < 2) return arcs; // Need multiple roots to detect fragmentation

  // Find VBZ "is"/"are" among roots
  const copulaRootArc = rootArcs.find(a => {
    const tag = tags[a.dependent - 1];
    const word = tokens[a.dependent - 1].toLowerCase();
    return tag === 'VBZ' && (word === 'is' || word === 'are');
  });
  if (!copulaRootArc) return arcs;

  const copulaId = copulaRootArc.dependent;

  // Find subject candidate: root NNP/NNS/NN that precedes the copula
  const subjectArc = rootArcs.find(a => {
    const tag = tags[a.dependent - 1];
    return a.dependent < copulaId && (tag === 'NNP' || tag === 'NNPS' || tag === 'NNS' || tag === 'NN');
  });
  if (!subjectArc) return arcs;

  // Find predicate candidate: root NN/NNP/JJ that follows the copula (skip punct)
  const predicateArc = rootArcs.find(a => {
    const tag = tags[a.dependent - 1];
    return a.dependent > copulaId && (tag === 'NN' || tag === 'NNP' || tag === 'NNPS' || tag === 'JJ');
  });
  if (!predicateArc) return arcs;

  const subjectId = subjectArc.dependent;
  const predicateId = predicateArc.dependent;

  // Rewrite: predicate becomes the sole root, subject becomes nsubj, copula becomes cop
  subjectArc.label = 'nsubj';
  subjectArc.head = predicateId;

  copulaRootArc.label = 'cop';
  copulaRootArc.head = predicateId;

  // Any det before predicate that's still a root or misattached → attach to predicate
  for (const arc of arcs) {
    if (arc.label === 'det' && arc.head === 0) {
      if (arc.dependent > copulaId && arc.dependent < predicateId) {
        arc.head = predicateId;
      }
    }
  }

  // Reattach punct to predicate
  for (const arc of rootArcs) {
    const tag = tags[arc.dependent - 1];
    if (tag === '.' || tag === ',' || tokens[arc.dependent - 1] === '.') {
      arc.label = 'punct';
      arc.head = predicateId;
    }
  }

  return arcs;
}

/**
 * Correct misparse where NN is root and VBN/VBD is acl (reduced relative).
 *
 * Pattern: "The organization submitted the report"
 *   Parser produces: organization(root), submitted(acl→organization), report(obj→submitted)
 *   Correct: submitted(root), organization(nsubj→submitted), report(obj→submitted)
 *
 * Detection: Single NN/NNS/NNP root with exactly one VBN/VBD child labeled acl,
 * and the VBN has an obj child (transitive verb).
 *
 * @param {Array} arcs - Raw arc array
 * @param {string[]} tokens - 0-indexed token array
 * @param {string[]} tags - 0-indexed POS tag array
 * @returns {Array} Modified arcs
 */
function correctNounRootVerbAcl(arcs, tokens, tags) {
  // Find the single root
  const rootArcs = arcs.filter(a => a.label === 'root' && a.head === 0);
  if (rootArcs.length !== 1) return arcs;

  const rootArc = rootArcs[0];
  const rootId = rootArc.dependent;
  const rootTag = tags[rootId - 1];

  // Root must be a noun
  if (!rootTag || !rootTag.startsWith('NN')) return arcs;

  // Find acl child that is VBN or VBD — check root AND nmod children of root
  // Find VBN/VBD child labeled acl or amod that should be the main verb
  let aclArc = arcs.find(a =>
    a.head === rootId && (a.label === 'acl' || a.label === 'amod') &&
    (tags[a.dependent - 1] === 'VBN' || tags[a.dependent - 1] === 'VBD')
  );
  // Check nmod children of root for acl (deep: "officer of org reviewed report")
  if (!aclArc) {
    const nmodChildren = arcs.filter(a => a.head === rootId && a.label === 'nmod');
    for (const nmod of nmodChildren) {
      aclArc = arcs.find(a =>
        a.head === nmod.dependent && (a.label === 'acl' || a.label === 'amod') &&
        (tags[a.dependent - 1] === 'VBN' || tags[a.dependent - 1] === 'VBD')
      );
      if (aclArc) break;
    }
  }
  // Check obj children of root for amod VBN ("facilities reported incidents" where
  // reported is amod of incidents which is obj of facilities)
  if (!aclArc) {
    const objChildren = arcs.filter(a => a.head === rootId && a.label === 'obj');
    for (const obj of objChildren) {
      aclArc = arcs.find(a =>
        a.head === obj.dependent && a.label === 'amod' &&
        (tags[a.dependent - 1] === 'VBN' || tags[a.dependent - 1] === 'VBD')
      );
      if (aclArc) {
        // Special case: the obj becomes the real obj of the verb, reattach
        obj.head = aclArc.dependent;
        break;
      }
    }
  }
  if (!aclArc) return arcs;

  const verbId = aclArc.dependent;

  // Verb must have an obj child (transitive — confirms it's a real verb, not a modifier)
  // Also check conj children for obj ("reviewed and approved the document")
  let hasObj = arcs.some(a => a.head === verbId && a.label === 'obj');
  if (!hasObj) {
    const conjChildren = arcs.filter(a => a.head === verbId && a.label === 'conj');
    hasObj = conjChildren.some(conj => arcs.some(a => a.head === conj.dependent && a.label === 'obj'));
  }
  if (!hasObj) return arcs;

  // Rewrite: verb becomes root, noun becomes nsubj of verb
  rootArc.label = 'nsubj';
  rootArc.head = verbId;

  aclArc.label = 'root';
  aclArc.head = 0;

  // Reattach punct from old root to new root
  for (const arc of arcs) {
    if (arc.label === 'punct' && arc.head === rootId) {
      arc.head = verbId;
    }
  }

  return arcs;
}

/**
 * Correct fragmented modal sentences where NN, MD, and VB are all roots.
 *
 * Pattern: "No organization shall disclose information"
 *   Parser: organization(root), shall(root), disclose(root), .(root)
 *   Correct: disclose(root), organization(nsubj), shall(aux)
 *
 * @param {Array} arcs
 * @param {string[]} tokens
 * @param {string[]} tags
 * @returns {Array}
 */
function correctModalFragmentation(arcs, tokens, tags) {
  const rootArcs = arcs.filter(a => a.label === 'root' && a.head === 0);
  if (rootArcs.length < 3) return arcs;

  // Find MD root and VB root
  const mdRoot = rootArcs.find(a => tags[a.dependent - 1] === 'MD');
  const vbRoot = rootArcs.find(a => {
    const t = tags[a.dependent - 1];
    return t === 'VB' || t === 'VBP';
  });
  const nnRoot = rootArcs.find(a => {
    const t = tags[a.dependent - 1];
    return t && t.startsWith('NN') && a !== mdRoot && a !== vbRoot;
  });

  if (!mdRoot || !vbRoot || !nnRoot) return arcs;

  const verbId = vbRoot.dependent;
  const mdId = mdRoot.dependent;
  const nnId = nnRoot.dependent;

  // NN must precede MD which must precede VB
  if (!(nnId < mdId && mdId < verbId)) return arcs;

  // Rewrite: VB becomes sole root, NN becomes nsubj, MD becomes aux
  nnRoot.label = 'nsubj';
  nnRoot.head = verbId;

  mdRoot.label = 'aux';
  mdRoot.head = verbId;

  // Reattach punct
  for (const arc of rootArcs) {
    if (arc !== vbRoot && arc !== nnRoot && arc !== mdRoot) {
      const t = tags[arc.dependent - 1];
      if (t === '.' || t === ',' || tokens[arc.dependent - 1] === '.') {
        arc.label = 'punct';
        arc.head = verbId;
      }
    }
  }

  return arcs;
}

/**
 * Correct double-obj on ditransitive verbs: first obj → iobj (TT-SPEC-RDM-A §3).
 *
 * Pattern: verb has two obj children. In English double-object constructions
 * ("gave the team new orders"), the first obj (closer to verb, animate) is the
 * indirect object. Rewrite to iobj so the existing iobj → RecipientRole path fires.
 *
 * Uses the extended DITRANSITIVE_VERBS registry from RoleMappingContract when available,
 * falling back to the local set.
 *
 * @param {Array} arcs
 * @param {string[]} tokens
 * @param {string[]} tags
 * @returns {Array}
 */
function correctDoubleObjDitransitives(arcs, tokens, tags) {
  // Use the RMC registry if available in scope (bundle), else local set
  const ditransitives = (typeof RMC_DITRANSITIVE_VERBS !== 'undefined')
    ? RMC_DITRANSITIVE_VERBS : DITRANSITIVE_VERBS;

  // Build head→children index
  const childrenOf = new Map();
  for (const arc of arcs) {
    if (!childrenOf.has(arc.head)) childrenOf.set(arc.head, []);
    childrenOf.get(arc.head).push(arc);
  }

  for (const arc of arcs) {
    const verbId = arc.dependent;
    const verbTag = tags[verbId - 1];
    if (!verbTag || !verbTag.startsWith('VB')) continue;

    const lemma = getLemma(tokens[verbId - 1]);
    const verbLc = tokens[verbId - 1].toLowerCase();
    if (!ditransitives.has(lemma) && !ditransitives.has(verbLc)) continue;

    // Find all obj children of this verb
    const verbChildren = childrenOf.get(verbId) || [];
    const objArcs = verbChildren.filter(c => c.label === 'obj');
    if (objArcs.length < 2) continue;

    // Sort by linear position — first obj is the indirect object
    objArcs.sort((a, b) => a.dependent - b.dependent);
    const firstObj = objArcs[0];

    // Rewrite first obj → iobj
    firstObj.label = 'iobj';
  }

  return arcs;
}

/**
 * Recover misattached second arguments in ditransitive constructions.
 *
 * Pattern: ditransitive verb has exactly one obj, and a second noun argument
 * attached with a wrong label (obl:unmarked, parataxis, advcl) that should be obj.
 * Rewrite the wrong label to obj. Then correctDoubleObjDitransitives() promotes
 * the first obj to iobj.
 *
 * Example: "The commander gave the team new orders"
 *   Before: nsubj(commander→gave), obj(team→gave), obl:unmarked(orders→gave)
 *   After:  obj(orders→gave), then double-obj: obj(team)→iobj(team)
 *
 * @param {Array} arcs
 * @param {string[]} tokens
 * @param {string[]} tags
 * @returns {Array}
 */
function recoverDitransitiveOrphans(arcs, tokens, tags) {
  const ditransitives = (typeof RMC_DITRANSITIVE_VERBS !== 'undefined')
    ? RMC_DITRANSITIVE_VERBS : DITRANSITIVE_VERBS;

  // Misattached labels that should be obj on ditransitive verbs
  const MISATTACHED_LABELS = new Set(['obl:unmarked', 'parataxis', 'advcl']);

  // Build head→children index
  const childrenOf = new Map();
  for (const arc of arcs) {
    if (!childrenOf.has(arc.head)) childrenOf.set(arc.head, []);
    childrenOf.get(arc.head).push(arc);
  }

  for (const arc of arcs) {
    const verbId = arc.dependent;
    const verbTag = tags[verbId - 1];
    if (!verbTag || !verbTag.startsWith('VB')) continue;

    const lemma = getLemma(tokens[verbId - 1]);
    const verbLc = tokens[verbId - 1].toLowerCase();
    if (!ditransitives.has(lemma) && !ditransitives.has(verbLc)) continue;

    const verbChildren = childrenOf.get(verbId) || [];
    const objArcs = verbChildren.filter(c => c.label === 'obj');
    if (objArcs.length !== 1) continue;

    const objId = objArcs[0].dependent;

    // Find misattached noun argument after the obj
    for (const child of verbChildren) {
      if (!MISATTACHED_LABELS.has(child.label)) continue;
      if (child.dependent <= objId) continue; // Must be after obj

      const depTag = tags[child.dependent - 1];
      if (!depTag || !depTag.startsWith('NN')) continue;

      // Rewrite to obj
      child.label = 'obj';
      break; // One rewrite per verb
    }
  }

  return arcs;
}

module.exports = { correctDitransitives, correctDoubleObjDitransitives, recoverDitransitiveOrphans, correctCopularFragmentation, correctNounRootVerbAcl, correctModalFragmentation, DITRANSITIVE_VERBS, RECIPIENT_NOUNS };
