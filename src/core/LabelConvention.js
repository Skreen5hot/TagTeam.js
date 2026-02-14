/**
 * LabelConvention.js — Canonical Label Sets for TagTeam
 *
 * AC-0.1: UD v2 Dependency Label Set (37 labels)
 * AC-0.2: Penn Treebank POS Tag Set (45 tags)
 *
 * Source: TagTeam-Major-Refactor-v2.2.md §5.1, §5.2
 * Authority: Universal Dependencies v2, Penn Treebank
 *
 * This module is the single source of truth for all label/tag validation.
 * All training scripts, inference code, and test assertions MUST use these sets.
 */

'use strict';

// =============================================================================
// AC-0.1: UD v2 Dependency Labels (37 labels, from §5.2)
// =============================================================================

const UD_LABELS = Object.freeze(new Set([
  'nsubj', 'nsubj:pass', 'obj', 'iobj', 'obl', 'obl:agent',
  'nmod', 'amod', 'advmod', 'nummod', 'det', 'case', 'cop',
  'xcomp', 'ccomp', 'advcl', 'acl', 'acl:relcl',
  'conj', 'cc', 'compound', 'flat', 'fixed', 'appos',
  'mark', 'aux', 'aux:pass', 'expl', 'neg', 'punct',
  'root', 'dep', 'parataxis', 'discourse', 'vocative', 'orphan', 'list'
]));

// =============================================================================
// AC-0.2: Penn Treebank POS Tags (45 tags, from §5.1)
// =============================================================================

const PTB_TAGS = Object.freeze(new Set([
  'CC', 'CD', 'DT', 'EX', 'FW', 'IN', 'JJ', 'JJR', 'JJS', 'LS', 'MD',
  'NN', 'NNS', 'NNP', 'NNPS', 'PDT', 'POS', 'PRP', 'PRP$',
  'RB', 'RBR', 'RBS', 'RP', 'SYM', 'TO', 'UH',
  'VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ',
  'WDT', 'WP', 'WP$', 'WRB',
  '.', ',', ':', '``', "''", '-LRB-', '-RRB-', '#', '$'
]));

// =============================================================================
// Validation functions
// =============================================================================

/**
 * Check whether a dependency label is in the UD v2 canonical set.
 * @param {string} label - The dependency label to validate
 * @returns {boolean} true if the label is in the canonical set
 */
function isValidUDLabel(label) {
  return UD_LABELS.has(label);
}

/**
 * Check whether a POS tag is in the Penn Treebank canonical set.
 * @param {string} tag - The POS tag to validate
 * @returns {boolean} true if the tag is in the canonical set
 */
function isValidPTBTag(tag) {
  return PTB_TAGS.has(tag);
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  UD_LABELS,
  PTB_TAGS,
  isValidUDLabel,
  isValidPTBTag
};
