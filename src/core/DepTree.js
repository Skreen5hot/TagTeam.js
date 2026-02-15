/**
 * DepTree.js — Dependency Tree Utility
 *
 * Source: TagTeam-Major-Refactor-v2.2.md §7
 * Authority: UD v2 (Nivre et al. 2020)
 *
 * Provides tree traversal utilities over parsed dependency arcs:
 *   - getEntitySubtree(headId): extract entity span, stopping at clause boundaries
 *   - getAppositions(headId): extract appositive aliases
 *   - getChildren(headId): get direct children
 *   - getHead(depId): get head and label
 *
 * Entity subtree extraction excludes clause-level dependents (acl:relcl, acl,
 * advcl, cop, punct) to prevent over-extraction into embedded clauses.
 * This is the regression gate for Phase 3A entity extraction (AC-2.6).
 */

'use strict';

/**
 * Labels excluded from entity subtree traversal.
 * These represent clause boundaries or non-entity dependents.
 * Per AC-2.6 and Cambridge Grammar of the English Language.
 */
const ENTITY_SUBTREE_EXCLUDED_LABELS = new Set([
  'acl:relcl',  // relative clause ("the doctor who treated")
  'acl',        // clausal modifier ("the decision to leave")
  'advcl',      // adverbial clause ("he left because...")
  'cop',        // copula ("is" in "CBP is a component")
  'punct',      // punctuation
]);

/**
 * Labels that indicate appositive relationships.
 */
const APPOSITION_LABELS = new Set([
  'appos',      // appositive ("Customs and Border Protection (CBP)")
]);

class DepTree {
  /**
   * @param {Array<{dependent: number, head: number, label: string, scoreMargin: number}>} arcs
   * @param {string[]} tokens - Word tokens (0-indexed array, but arcs use 1-indexed)
   * @param {string[]} tags - POS tags
   */
  constructor(arcs, tokens, tags) {
    this.arcs = arcs;
    this.tokens = tokens;   // 0-indexed: tokens[0] = first word
    this.tags = tags;
    this.n = tokens.length;

    // Build index: head → [child arcs]
    this._children = new Map();
    // Build index: dependent → arc
    this._headOf = new Map();

    for (const arc of arcs) {
      this._headOf.set(arc.dependent, arc);
      if (!this._children.has(arc.head)) {
        this._children.set(arc.head, []);
      }
      this._children.get(arc.head).push(arc);
    }
  }

  /**
   * Get entity subtree rooted at headId.
   * Traverses children recursively, stopping at excluded labels.
   * Returns tokens and their 1-indexed positions.
   *
   * @param {number} headId - 1-indexed head token ID
   * @returns {{ tokens: string[], indices: number[] }}
   */
  getEntitySubtree(headId) {
    const indices = [];
    this._collectSubtree(headId, indices);
    indices.sort((a, b) => a - b);

    const tokens = indices.map(i => this.tokens[i - 1]); // Convert 1-indexed to 0-indexed
    return { tokens, indices };
  }

  /**
   * Recursively collect token indices for entity subtree.
   * Stops at excluded labels (acl:relcl, acl, advcl, cop, punct)
   * and apposition labels (appos).
   *
   * @param {number} nodeId - 1-indexed node ID
   * @param {number[]} indices - Accumulator
   * @private
   */
  _collectSubtree(nodeId, indices) {
    indices.push(nodeId);

    const children = this._children.get(nodeId) || [];
    for (const child of children) {
      // Skip excluded labels — these are clause boundaries
      if (ENTITY_SUBTREE_EXCLUDED_LABELS.has(child.label)) continue;
      // Skip appositions — these are separate entities
      if (APPOSITION_LABELS.has(child.label)) continue;
      this._collectSubtree(child.dependent, indices);
    }
  }

  /**
   * Get appositive aliases for a head token.
   * Returns the text of appositive dependents (e.g., "CBP" from "(CBP)").
   *
   * @param {number} headId - 1-indexed head token ID
   * @returns {string[]} Appositive alias strings
   */
  getAppositions(headId) {
    const children = this._children.get(headId) || [];
    const aliases = [];

    for (const child of children) {
      if (APPOSITION_LABELS.has(child.label)) {
        // Get the appositive subtree text (excluding punct)
        const subIndices = [];
        this._collectAppositionTokens(child.dependent, subIndices);
        subIndices.sort((a, b) => a - b);

        // Filter out punctuation tokens from appositive span
        const apposTokens = subIndices
          .filter(i => {
            const tag = this.tags[i - 1];
            const word = this.tokens[i - 1];
            // Exclude punctuation: -LRB-, -RRB-, and actual parens/commas
            return !tag.match(/^-[LR]RB-$/) &&
                   !['(', ')', ',', '.', ':', ';'].includes(word);
          })
          .map(i => this.tokens[i - 1]);

        if (apposTokens.length > 0) {
          aliases.push(apposTokens.join(' '));
        }
      }
    }

    return aliases;
  }

  /**
   * Collect tokens for an appositive subtree (including its own children,
   * but not punct of its parent).
   *
   * @param {number} nodeId
   * @param {number[]} indices
   * @private
   */
  _collectAppositionTokens(nodeId, indices) {
    indices.push(nodeId);
    const children = this._children.get(nodeId) || [];
    for (const child of children) {
      // Include everything in the appositive span (even punct children)
      this._collectAppositionTokens(child.dependent, indices);
    }
  }

  /**
   * Get direct children of a node.
   *
   * @param {number} headId - 1-indexed head token ID
   * @returns {Array<{dependent: number, label: string, word: string, tag: string}>}
   */
  getChildren(headId) {
    const children = this._children.get(headId) || [];
    return children.map(c => ({
      dependent: c.dependent,
      label: c.label,
      word: this.tokens[c.dependent - 1],
      tag: this.tags[c.dependent - 1]
    }));
  }

  /**
   * Get the head arc for a dependent.
   *
   * @param {number} depId - 1-indexed dependent token ID
   * @returns {{head: number, label: string, scoreMargin: number} | null}
   */
  getHead(depId) {
    return this._headOf.get(depId) || null;
  }

  /**
   * Find the root token(s) of the tree.
   *
   * @returns {number[]} 1-indexed IDs of root tokens
   */
  getRoots() {
    return this.arcs
      .filter(a => a.head === 0)
      .map(a => a.dependent);
  }
}

// Static property: exposed for testing (AC-2.6b)
DepTree.ENTITY_SUBTREE_EXCLUDED_LABELS = ENTITY_SUBTREE_EXCLUDED_LABELS;

// Export for Node.js / CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DepTree;
}
// Export for browser
if (typeof window !== 'undefined') {
  window.DepTree = DepTree;
}
