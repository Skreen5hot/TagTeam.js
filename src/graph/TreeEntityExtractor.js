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
 * Head-noun → ontological type mappings for common nouns.
 * Mirrors EntityExtractor.ENTITY_TYPE_MAPPINGS for the tree pipeline.
 * Enables correct Tier 2 typing without gazetteer dependency.
 */
const HEAD_NOUN_TYPE_MAP = {
  // Persons (medical + professional + general)
  'doctor': 'Person', 'physician': 'Person', 'surgeon': 'Person',
  'nurse': 'Person', 'patient': 'Person', 'therapist': 'Person',
  'pharmacist': 'Person', 'paramedic': 'Person', 'caregiver': 'Person',
  'person': 'Person', 'man': 'Person', 'woman': 'Person',
  'child': 'Person', 'parent': 'Person', 'mother': 'Person', 'father': 'Person',
  'engineer': 'Person', 'teacher': 'Person', 'lawyer': 'Person',
  'scientist': 'Person', 'researcher': 'Person', 'analyst': 'Person',
  'manager': 'Person', 'director': 'Person', 'officer': 'Person',
  'agent': 'Person', 'inspector': 'Person', 'technician': 'Person',
  'programmer': 'Person', 'developer': 'Person', 'designer': 'Person',
  'consultant': 'Person', 'administrator': 'Person', 'admin': 'Person',
  'supervisor': 'Person', 'specialist': 'Person', 'professor': 'Person',
  'student': 'Person', 'worker': 'Person', 'employee': 'Person',
  'member': 'Person', 'user': 'Person', 'client': 'Person',
  'customer': 'Person', 'owner': 'Person', 'author': 'Person',
  'judge': 'Person', 'witness': 'Person', 'suspect': 'Person',
  'victim': 'Person', 'soldier': 'Person', 'pilot': 'Person',
  'driver': 'Person', 'chef': 'Person', 'artist': 'Person',
  'guard': 'Person', 'family': 'Agent',
  // Artifacts
  'ventilator': 'Artifact', 'medication': 'Artifact', 'drug': 'Artifact',
  'medicine': 'Artifact', 'equipment': 'Artifact', 'server': 'Artifact',
  'database': 'Artifact', 'system': 'Artifact', 'application': 'Artifact',
  // ICE
  'alert': 'InformationContentEntity', 'log': 'InformationContentEntity',
  'credential': 'InformationContentEntity', 'data': 'InformationContentEntity',
  // Facilities
  'datacenter': 'Facility', 'facility': 'Facility', 'building': 'Facility',
  'office': 'Facility',
  // Organizations
  'hospital': 'Organization', 'department': 'Organization',
  'agency': 'Organization', 'company': 'Organization', 'team': 'Organization',
};

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
  extract(depTree, options) {
    const opts = options || {};
    const entities = [];
    const aliasMap = new Map();
    const seenHeads = new Set(); // Prevent duplicate entity extraction

    // Locked spans from ComplexDesignatorDetector (§5.1b)
    // Token indices covered by locked spans — skip normal extraction for these
    const lockedSpans = opts.lockedSpans || [];
    const lockedTokens = new Set();
    for (const span of lockedSpans) {
      for (let t = span.startToken; t <= span.endToken; t++) {
        lockedTokens.add(t);
      }
    }

    // Step 0: Inject locked span entities FIRST
    // These override the dep tree — the CDD surface-form detection takes priority
    for (const span of lockedSpans) {
      const spanTokens = [];
      const spanIndices = [];
      for (let t = span.startToken; t <= span.endToken; t++) {
        spanTokens.push(depTree.tokens[t - 1]);
        spanIndices.push(t);
        seenHeads.add(t);
      }
      entities.push({
        fullText: span.text,
        headId: span.startToken,
        indices: spanIndices,
        type: 'Organization', // CDD detects proper names → Organization default
        role: 'locked',
        source: 'ComplexDesignatorDetector'
      });
    }

    // Step 1: Extract root nouns as entities (roots that are not verbs
    // may be copular predicates or standalone noun phrases)
    const roots = depTree.getRoots();
    for (const rootId of roots) {
      if (lockedTokens.has(rootId)) continue; // Skip tokens inside locked spans
      const rootTag = depTree.tags[rootId - 1];
      const children = depTree.getChildren(rootId);
      const hasCop = children.some(c => c.label === 'cop');
      if (!TEE_VERB_TAGS.has(rootTag) && !hasCop) {
        const hasNsubj = children.some(c => c.label === 'nsubj' || c.label === 'nsubj:pass');
        if (!hasNsubj && !seenHeads.has(rootId)) {
          seenHeads.add(rootId);
          const entity = this._buildEntity(depTree, rootId, 'root');
          if (entity) {
            // RC-3: If entity span overlaps a locked span, skip it
            if (this._overlapsLockedSpan(entity, lockedTokens)) continue;
            this._extractAliases(depTree, entity, aliasMap);
            entities.push(entity);
          }
        }
      }
    }

    // Step 2: Find all entity-bearing positions
    for (const arc of depTree.arcs) {
      if (!ENTITY_BEARING_LABELS.has(arc.label)) continue;
      if (seenHeads.has(arc.dependent)) continue;
      if (lockedTokens.has(arc.dependent)) continue; // Skip tokens inside locked spans

      // Skip interrogative pronouns (WP/WP$) — "Who", "What" are placeholders, not entities
      const headTag = depTree.tags[arc.dependent - 1];
      if (headTag === 'WP' || headTag === 'WP$') continue;

      const entityHead = arc.dependent;
      seenHeads.add(entityHead);

      // Step 3: Check for coordination — may need to split
      const coordResult = this._handleCoordination(depTree, entityHead, arc.label, seenHeads);
      if (coordResult) {
        for (const entity of coordResult) {
          if (this._overlapsLockedSpan(entity, lockedTokens)) continue;
          this._extractAliases(depTree, entity, aliasMap);
          entities.push(entity);
        }
        continue;
      }

      // Step 4: Build entity span from subtree
      const entity = this._buildEntity(depTree, entityHead, arc.label);
      if (!entity) continue;
      if (this._overlapsLockedSpan(entity, lockedTokens)) continue;

      // Step 5: Extract aliases from appositions
      this._extractAliases(depTree, entity, aliasMap);

      entities.push(entity);
    }

    // Step 6: Alias promotion — resolve later mentions via aliasMap
    this._promoteAliases(entities, aliasMap);

    return { entities, aliasMap };
  }

  /**
   * Check if an entity's token indices overlap with locked span tokens.
   * @private
   */
  _overlapsLockedSpan(entity, lockedTokens) {
    if (!entity.indices || lockedTokens.size === 0) return false;
    return entity.indices.some(idx => lockedTokens.has(idx));
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

    // Gazetteer check removed: the compound-crossing check above (lines 181-192)
    // is the authoritative guard against splitting multi-word names like
    // "Customs and Border Protection". The gazetteer partial-miss heuristic
    // was redundant and caused false KEEPs when one conjunct happened to be
    // a gazetteer alias (e.g., "Bob" → Robert) but the other wasn't.

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
      // §5.4h: Exclude obl children — oblique arguments belong to the verb, not the noun
      if (child.label === 'obl') continue;
      // §5.4h: At head level, exclude cc (conjunction word itself doesn't belong to either entity)
      if (isHead && child.label === 'cc') continue;
      // §5.4h: At head level, split conj when conjuncts are clearly separate entities
      // (standalone proper nouns like "CMS and USCIS"). Keep compound names
      // ("Customs and Border Protection") and common noun coordination ("doctors and nurses").
      if (isHead && child.label === 'conj') {
        const conjChildren = depTree._children.get(child.dependent) || [];
        const headChildren = depTree._children.get(nodeId) || [];
        const conjHasCompound = conjChildren.some(c => c.label === 'compound');
        const headHasCompound = headChildren.some(c => c.label === 'compound');
        // If either side has compound children, it's likely a multi-word name — keep
        if (!conjHasCompound && !headHasCompound) {
          const headTag = depTree.tags[nodeId - 1];
          const conjTag = depTree.tags[child.dependent - 1];
          const NNP_TAGS = new Set(['NNP', 'NNPS']);
          // Only split standalone proper nouns without compounds
          if (NNP_TAGS.has(headTag) && NNP_TAGS.has(conjTag)) continue;
        }
      }
      // Skip conj children that are verbs (RC-3: prevents "Immigration" absorbing "deported")
      // or that have cop dependents (copular predicates, not coordination)
      if (child.label === 'conj') {
        const conjTag = depTree.tags[child.dependent - 1];
        if (TEE_VERB_TAGS.has(conjTag)) continue; // Verb conjunct → not part of entity
        const conjChildren = depTree._children.get(child.dependent) || [];
        const hasCop = conjChildren.some(c => c.label === 'cop');
        if (hasCop) continue; // This conj is a copular predicate → skip
      }
      // §5.4h: At head level, exclude nmod children that have their own case preposition
      // (indicates oblique/prepositional role, not part of the noun phrase)
      if (isHead && child.label === 'nmod') {
        const nmodChildren = depTree._children.get(child.dependent) || [];
        const hasCase = nmodChildren.some(c => c.label === 'case');
        if (hasCase) continue;
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

    // Head-noun type lookup (common nouns)
    const headLower = (headWord || '').toLowerCase();
    if (HEAD_NOUN_TYPE_MAP[headLower]) {
      return HEAD_NOUN_TYPE_MAP[headLower];
    }

    // POS tag heuristics
    if (PROPER_NOUN_TAGS.has(headTag)) {
      return 'Entity'; // Proper noun, type unknown without gazetteer
    }

    // Default: generic entity
    return 'Entity';
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
