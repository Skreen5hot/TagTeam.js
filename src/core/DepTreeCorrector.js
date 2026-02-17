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

module.exports = { correctDitransitives, DITRANSITIVE_VERBS, RECIPIENT_NOUNS };
