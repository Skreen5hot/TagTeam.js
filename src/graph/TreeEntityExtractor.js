/**
 * TreeEntityExtractor.js — Tree-Based Entity Extraction
 *
 * Source: TagTeam-Major-Refactor-v2.2.md §Phase 3A (AC-3.1 through AC-3.4b)
 * Authority: UD v2, BFO 2.0, CCO v1.5, Cambridge Grammar
 *
 * Extracts entities from a DepTree by walking dependency arcs instead of
 * linear NP scanning. Uses getEntitySubtree() to determine entity boundaries,
 * with conservative coordination splitting and alias extraction from appositions.
 */

'use strict';

// ============================================================================
// Constants
// ============================================================================

/**
 * UD dependency labels that indicate an entity-bearing position.
 * Tokens with these labels (as dependents) are entity heads.
 */
const ENTITY_BEARING_LABELS = new Set([
  'nsubj',       // Active voice subject
  'nsubj:pass',  // Passive voice subject
  'obj',         // Direct object
  'iobj',        // Indirect object
  'obl',         // Oblique argument (prepositional phrases)
  'obl:agent',   // Passive "by" agent
  'nmod',        // Nominal modifier (e.g., "of DHS")
]);

/**
 * POS tags that indicate a proper noun (relevant for coordination split).
 */
const PROPER_NOUN_TAGS = new Set(['NNP', 'NNPS']);

/**
 * POS tags that indicate a verb (used to identify verb roots vs noun predicates).
 */
const TEE_VERB_TAGS = new Set(['VB', 'VBD', 'VBZ', 'VBP', 'VBN', 'VBG']);

// ============================================================================
// TreeEntityExtractor
// ============================================================================

class TreeEntityExtractor {
  /**
   * @param {Object} options
   * @param {Object} [options.gazetteerNER] - GazetteerNER instance for type lookup
   */
  constructor(options = {}) {
    this.gazetteerNER = options.gazetteerNER || null;
  }

  /**
   * Extract entities from a dependency tree.
   *
   * @param {DepTree} depTree - Parsed dependency tree
   * @returns {{ entities: Entity[], aliasMap: Map<string, string> }}
   */
  extract(depTree) {
    const entities = [];
    const aliasMap = new Map();
    const seenHeads = new Set(); // Prevent duplicate entity extraction

    // Step 0: Extract root nouns as entities (roots that are not verbs
    // may be copular predicates or standalone noun phrases)
    const roots = depTree.getRoots();
    for (const rootId of roots) {
      const rootTag = depTree.tags[rootId - 1];
      const children = depTree.getChildren(rootId);
      const hasCop = children.some(c => c.label === 'cop');
      // Root nouns that are copular predicates — don't extract as entities
      // Root nouns without cop that have nsubj children — they're predicates in verb-less parses
      // But root nouns in relative clause parses (e.g., "The doctor who ... left") — extract as entity
      if (!TEE_VERB_TAGS.has(rootTag) && !hasCop) {
        const hasNsubj = children.some(c => c.label === 'nsubj' || c.label === 'nsubj:pass');
        if (!hasNsubj && !seenHeads.has(rootId)) {
          seenHeads.add(rootId);
          const entity = this._buildEntity(depTree, rootId, 'root');
          if (entity) {
            this._extractAliases(depTree, entity, aliasMap);
            entities.push(entity);
          }
        }
      }
    }

    // Step 1: Find all entity-bearing positions
    for (const arc of depTree.arcs) {
      if (!ENTITY_BEARING_LABELS.has(arc.label)) continue;
      if (seenHeads.has(arc.dependent)) continue;

      const entityHead = arc.dependent;
      seenHeads.add(entityHead);

      // Step 2: Check for coordination — may need to split
      const coordResult = this._handleCoordination(depTree, entityHead, arc.label, seenHeads);
      if (coordResult) {
        // Coordination was split into multiple entities
        for (const entity of coordResult) {
          this._extractAliases(depTree, entity, aliasMap);
          entities.push(entity);
        }
        continue;
      }

      // Step 3: Build entity span from subtree
      const entity = this._buildEntity(depTree, entityHead, arc.label);
      if (!entity) continue;

      // Step 4: Extract aliases from appositions
      this._extractAliases(depTree, entity, aliasMap);

      entities.push(entity);
    }

    // Step 5: Alias promotion — resolve later mentions via aliasMap
    this._promoteAliases(entities, aliasMap);

    return { entities, aliasMap };
  }

  /**
   * Build a single entity from its head token's subtree.
   *
   * @param {DepTree} depTree
   * @param {number} headId - 1-indexed head token ID
   * @param {string} role - UD dependency label
   * @returns {Entity|null}
   */
  _buildEntity(depTree, headId, role, options = {}) {
    const subtree = this._getEntitySpan(depTree, headId, options);
    if (!subtree.tokens || subtree.tokens.length === 0) return null;

    const fullText = subtree.tokens.join(' ');
    const headWord = depTree.tokens[headId - 1];
    const headTag = depTree.tags[headId - 1];

    // Type classification
    const type = this._classifyType(fullText, headWord, headTag);

    return {
      fullText,
      text: fullText,
      label: fullText,
      headWord,
      headTag,
      headId,
      role,
      type,
      indices: subtree.indices,
    };
  }

  /**
   * Handle coordination within an entity subtree.
   * Returns null if no split needed, or array of entities if split.
   *
   * Conservative rules (AC-3.3):
   *   SPLIT: both conjuncts NNP AND both in gazetteer
   *   KEEP: compound edges cross conjunction
   *   KEEP: common nouns (NN, not NNP)
   *   KEEP: partial gazetteer miss
   *
   * @param {DepTree} depTree
   * @param {number} headId
   * @param {string} role
   * @param {Set<number>} seenHeads
   * @returns {Entity[]|null}
   */
  _handleCoordination(depTree, headId, role, seenHeads) {
    const children = depTree.getChildren(headId);
    const conjChildren = children.filter(c => c.label === 'conj');
    if (conjChildren.length === 0) return null;

    // Check if compound edges cross the conjunction boundary.
    // A compound crosses if any conjunct has compound children,
    // indicating a multi-word name like "Customs and Border Protection"
    // where "Border" is compound of "Protection" (a conjunct).
    for (const conj of conjChildren) {
      const conjSubChildren = depTree.getChildren(conj.dependent);
      const hasCompound = conjSubChildren.some(c => c.label === 'compound');
      if (hasCompound) {
        return null; // Conjunct has compounds → multi-word name → KEEP
      }
    }
    // Also check if head has compound children
    const headCompounds = children.filter(c => c.label === 'compound');
    if (headCompounds.length > 0) {
      return null; // Head has compounds → multi-word name → KEEP
    }

    // Check if ALL conjuncts (including head) are NNP
    const headTag = depTree.tags[headId - 1];
    const allProperNouns = PROPER_NOUN_TAGS.has(headTag) &&
      conjChildren.every(c => PROPER_NOUN_TAGS.has(c.tag));

    if (!allProperNouns) {
      return null; // Common nouns → KEEP
    }

    // Check gazetteer for all conjuncts
    if (this.gazetteerNER) {
      const headText = depTree.tokens[headId - 1];
      const headLookup = this.gazetteerNER.lookup(headText);

      if (!headLookup) return null; // Head not in gazetteer → KEEP

      for (const conj of conjChildren) {
        const conjText = depTree.tokens[conj.dependent - 1];
        const conjLookup = this.gazetteerNER.lookup(conjText);
        if (!conjLookup) return null; // Partial miss → KEEP
      }
    }

    // All checks passed → SPLIT
    const result = [];

    // Mark conj children as seen
    for (const conj of conjChildren) {
      seenHeads.add(conj.dependent);
    }

    // Build head entity (without conj children)
    const headEntity = this._buildEntityWithoutConj(depTree, headId, role);
    if (headEntity) result.push(headEntity);

    // Build entity for each conjunct (skip cc in case parser attached it to conjunct)
    for (const conj of conjChildren) {
      const conjEntity = this._buildEntity(depTree, conj.dependent, role, { skipLabels: ['cc'] });
      if (conjEntity) result.push(conjEntity);
    }

    return result.length > 0 ? result : null;
  }

  /**
   * Build entity span excluding conj children (for split coordination head).
   */
  _buildEntityWithoutConj(depTree, headId, role) {
    // Manually collect subtree, skipping conj and cc children
    const indices = [];
    this._collectSubtreeWithoutConj(depTree, headId, indices);
    indices.sort((a, b) => a - b);

    const tokens = indices.map(i => depTree.tokens[i - 1]);
    const fullText = tokens.join(' ');
    const headWord = depTree.tokens[headId - 1];
    const headTag = depTree.tags[headId - 1];
    const type = this._classifyType(fullText, headWord, headTag);

    return {
      fullText,
      text: fullText,
      label: fullText,
      headWord,
      headTag,
      headId,
      role,
      type,
      indices,
    };
  }

  /**
   * Custom entity span extraction that extends DepTree's traversal with
   * additional exclusions for copular predicates in conj arcs.
   *
   * When the parser produces "Customs(conj→component(cop→is))",
   * the conj child "component" is a copular predicate, not a coordination
   * partner. We exclude such conj children.
   *
   * @param {DepTree} depTree
   * @param {number} headId
   * @returns {{ tokens: string[], indices: number[] }}
   */
  _getEntitySpan(depTree, headId, options = {}) {
    const indices = [];
    this._collectEntitySpan(depTree, headId, indices, true, options.skipLabels || []);
    indices.sort((a, b) => a - b);
    const tokens = indices.map(i => depTree.tokens[i - 1]);
    return { tokens, indices };
  }

  /**
   * Recursively collect entity span indices with enhanced exclusions.
   *
   * @param {DepTree} depTree
   * @param {number} nodeId
   * @param {number[]} indices - Accumulator
   * @param {boolean} isHead - True for entity head node, false for interior nodes.
   *   At entity head level, case children (prepositions) are excluded because they
   *   mark semantic roles ("by", "in", "with"), not entity text. At interior levels,
   *   case children are included to preserve compound names ("Department of Homeland Security").
   * @param {string[]} skipLabels - Additional labels to exclude (e.g., ['cc'] for split conjuncts)
   */
  _collectEntitySpan(depTree, nodeId, indices, isHead = true, skipLabels = []) {
    indices.push(nodeId);
    const children = depTree._children.get(nodeId) || [];
    for (const child of children) {
      // Standard DepTree exclusions
      if (['acl:relcl', 'acl', 'advcl', 'cop', 'punct'].includes(child.label)) continue;
      // Skip appositions (extracted as aliases separately)
      if (child.label === 'appos') continue;
      // At entity head level, exclude case children (role-marking prepositions)
      if (isHead && child.label === 'case') continue;
      // Skip additional labels (e.g., 'cc' for split conjunct entities)
      if (skipLabels.length > 0 && skipLabels.includes(child.label)) continue;
      // Skip conj children that have cop dependents (copular predicates, not coordination)
      if (child.label === 'conj') {
        const conjChildren = depTree._children.get(child.dependent) || [];
        const hasCop = conjChildren.some(c => c.label === 'cop');
        if (hasCop) continue; // This conj is a copular predicate → skip
      }
      this._collectEntitySpan(depTree, child.dependent, indices, false, skipLabels);
    }
  }

  /**
   * Collect subtree indices, skipping conj and cc children.
   * Used for building the head entity when coordination is split.
   */
  _collectSubtreeWithoutConj(depTree, nodeId, indices, isHead = true) {
    indices.push(nodeId);
    const children = depTree._children.get(nodeId) || [];
    for (const child of children) {
      if (child.label === 'conj' || child.label === 'cc') continue;
      if (child.label === 'punct') continue;
      if (['acl:relcl', 'acl', 'advcl', 'cop'].includes(child.label)) continue;
      if (child.label === 'appos') continue;
      if (isHead && child.label === 'case') continue;
      this._collectSubtreeWithoutConj(depTree, child.dependent, indices, false);
    }
  }

  /**
   * Extract appositive aliases from an entity's head token.
   * Sets tagteam:alias on the entity and populates aliasMap.
   *
   * @param {DepTree} depTree
   * @param {Entity} entity
   * @param {Map<string, string>} aliasMap
   */
  _extractAliases(depTree, entity, aliasMap) {
    // Check all tokens in the entity span for appositions, not just the head
    const allAliases = [];
    const indicesToCheck = entity.indices || [entity.headId];

    for (const idx of indicesToCheck) {
      const aliases = depTree.getAppositions(idx);
      for (const alias of aliases) {
        if (!allAliases.includes(alias)) allAliases.push(alias);
      }
    }

    if (allAliases.length > 0) {
      entity['tagteam:alias'] = allAliases.length === 1 ? allAliases[0] : allAliases;
      entity.alias = entity['tagteam:alias'];

      // Populate aliasMap: alias → canonical entity text
      for (const alias of allAliases) {
        aliasMap.set(alias, entity.fullText);
      }
    }
  }

  /**
   * Promote alias references: resolve later mentions via aliasMap.
   * If an entity's text matches an alias, mark it as resolved.
   *
   * @param {Entity[]} entities
   * @param {Map<string, string>} aliasMap
   */
  _promoteAliases(entities, aliasMap) {
    if (aliasMap.size === 0) return;

    // Track which entity texts have been seen (for second-mention detection)
    const canonicalTexts = new Set();
    const aliasTexts = new Set(aliasMap.keys());

    for (const entity of entities) {
      const text = entity.fullText;

      // If this entity's text is an alias AND we've already seen the canonical form
      if (aliasTexts.has(text)) {
        const canonical = aliasMap.get(text);
        if (canonicalTexts.has(canonical)) {
          // This is a second mention — resolve via alias
          entity['tagteam:resolvedVia'] = 'alias';
          entity.resolvedVia = 'alias';
          entity['tagteam:canonicalForm'] = canonical;
        }
      }

      // Track canonical texts (including aliases pointing to them)
      canonicalTexts.add(text);
    }
  }

  /**
   * Classify entity type using gazetteer lookup and POS tag heuristics.
   *
   * @param {string} fullText - Full entity text
   * @param {string} headWord - Head word of the entity
   * @param {string} headTag - POS tag of the head word
   * @returns {string} Entity type IRI
   */
  _classifyType(fullText, headWord, headTag) {
    // Try gazetteer lookup first
    if (this.gazetteerNER) {
      const lookup = this.gazetteerNER.lookup(fullText);
      if (lookup) return lookup.type;

      // Try head word only
      const headLookup = this.gazetteerNER.lookup(headWord);
      if (headLookup) return headLookup.type;
    }

    // POS tag heuristics
    if (PROPER_NOUN_TAGS.has(headTag)) {
      return 'bfo:Entity'; // Proper noun, type unknown without gazetteer
    }

    // Default: generic entity
    return 'bfo:Entity';
  }
}

// ============================================================================
// Exports
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TreeEntityExtractor;
}
if (typeof window !== 'undefined') {
  window.TreeEntityExtractor = TreeEntityExtractor;
}
