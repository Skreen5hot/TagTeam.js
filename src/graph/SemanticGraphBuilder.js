/**
 * SemanticGraphBuilder.js
 *
 * Main orchestrator for building JSON-LD semantic graphs.
 * Transforms TagTeam parsing results into SHML+GIT-compliant knowledge graphs.
 * Updated for Phase 4 Two-Tier Architecture (v2.2 spec).
 *
 * @module graph/SemanticGraphBuilder
 * @version 4.0.0-phase4
 */

const crypto = require('crypto');
const EntityExtractor = require('./EntityExtractor');
const ActExtractor = require('./ActExtractor');
const RoleDetector = require('./RoleDetector');

/**
 * Main class for building semantic graphs in JSON-LD format
 */
class SemanticGraphBuilder {
  /**
   * Create a new SemanticGraphBuilder
   * @param {Object} options - Configuration options
   * @param {string} [options.namespace='inst'] - Namespace prefix for instance IRIs
   * @param {string} [options.context] - Interpretation context (e.g., 'MedicalEthics')
   */
  constructor(options = {}) {
    this.options = {
      namespace: options.namespace || 'inst',
      context: options.context || null,
      ...options
    };

    // Internal graph storage
    this.nodes = [];
    this.nodeIndex = new Map(); // IRI -> node for deduplication

    // Initialize extractors
    this.entityExtractor = new EntityExtractor({ graphBuilder: this });
    this.actExtractor = new ActExtractor({ graphBuilder: this });
    this.roleDetector = new RoleDetector({ graphBuilder: this });
  }

  /**
   * Build a complete semantic graph from input text
   *
   * @param {string} text - Input text to analyze
   * @param {Object} [options] - Build options
   * @param {string} [options.context] - Interpretation context override
   * @returns {Object} Graph structure with nodes array
   *
   * @example
   * const builder = new SemanticGraphBuilder();
   * const graph = builder.build("The doctor treats the patient");
   * // Returns: { nodes: [...] }
   */
  build(text, options = {}) {
    // Reset state for new build
    this.nodes = [];
    this.nodeIndex = new Map();

    // Merge options
    const buildOptions = {
      ...this.options,
      ...options
    };

    // Store metadata
    this.inputText = text;
    this.buildTimestamp = new Date().toISOString();
    this.buildContext = buildOptions.context;

    // Phase 1.2: Extract entities as DiscourseReferent nodes
    let extractedEntities = [];
    if (buildOptions.extractEntities !== false) {
      extractedEntities = this.entityExtractor.extract(text, buildOptions);
      this.addNodes(extractedEntities);
    }

    // Phase 1.3: Extract acts as IntentionalAct nodes
    let extractedActs = [];
    if (buildOptions.extractActs !== false) {
      extractedActs = this.actExtractor.extract(text, {
        ...buildOptions,
        entities: extractedEntities
      });
      this.addNodes(extractedActs);
    }

    // Phase 1.4: Detect roles from acts and entities
    if (buildOptions.detectRoles !== false && extractedActs.length > 0) {
      const roles = this.roleDetector.detect(extractedActs, extractedEntities, buildOptions);
      this.addNodes(roles);
    }

    // Future phases will add:
    // - Phase 2.1: Assertion events (ValueAssertionEvent, ContextAssessmentEvent)

    return {
      '@graph': this.nodes,
      _metadata: {
        buildTimestamp: this.buildTimestamp,
        inputLength: text.length,
        nodeCount: this.nodes.length
      }
    };
  }

  /**
   * Add a single node to the graph
   *
   * @param {Object} node - Node to add (must have @id and @type)
   * @returns {Object} The added node
   *
   * @throws {Error} If node missing @id or @type
   */
  addNode(node) {
    // Validate required properties
    if (!node['@id']) {
      throw new Error('Node must have @id property');
    }
    if (!node['@type']) {
      throw new Error('Node must have @type property');
    }

    // Check for duplicates
    if (this.nodeIndex.has(node['@id'])) {
      // Merge with existing node (later: conflict resolution)
      const existing = this.nodeIndex.get(node['@id']);
      Object.assign(existing, node);
      return existing;
    }

    // Add to graph
    this.nodes.push(node);
    this.nodeIndex.set(node['@id'], node);

    return node;
  }

  /**
   * Add multiple nodes to the graph
   *
   * @param {Array<Object>} nodes - Array of nodes to add
   * @returns {Array<Object>} The added nodes
   */
  addNodes(nodes) {
    if (!Array.isArray(nodes)) {
      throw new Error('addNodes expects an array');
    }

    return nodes.map(node => this.addNode(node));
  }

  /**
   * Generate a deterministic IRI for an instance
   *
   * Uses SHA-256 hash of (text + span_offset + type) for reproducibility.
   * v2.2 spec: 12 hex chars for collision resistance.
   *
   * @param {string} text - Text content (e.g., "the doctor")
   * @param {string} type - Entity type (e.g., "DiscourseReferent", "Act")
   * @param {number} [offset=0] - Text span offset for uniqueness
   * @returns {string} IRI in format "inst:Type_hash12chars"
   *
   * @example
   * generateIRI("the doctor", "DiscourseReferent", 0)
   * // Returns: "inst:Doctor_Referent_a8f3b2e4c5d6"
   */
  generateIRI(text, type, offset = 0) {
    // Create hash input: text + offset + type
    const hashInput = `${text}|${offset}|${type}`;

    // Generate SHA-256 hash
    const hash = crypto
      .createHash('sha256')
      .update(hashInput)
      .digest('hex');

    // Take first 12 characters (v2.2 spec: increased from 8 for collision resistance)
    const hashSuffix = hash.substring(0, 12);

    // Clean text for IRI (remove spaces, special chars)
    const cleanText = text
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('_')
      .replace(/[^a-zA-Z0-9_]/g, '');

    // Format: inst:Type_Text_hash
    const typeLabel = type.replace(/^.*:/, ''); // Remove namespace prefix
    const iri = `${this.options.namespace}:${cleanText}_${typeLabel}_${hashSuffix}`;

    return iri;
  }

  /**
   * Get all nodes in the graph
   * @returns {Array<Object>} All nodes
   */
  getNodes() {
    return this.nodes;
  }

  /**
   * Get a node by IRI
   * @param {string} iri - Node IRI
   * @returns {Object|undefined} Node or undefined if not found
   */
  getNode(iri) {
    return this.nodeIndex.get(iri);
  }

  /**
   * Clear the graph
   */
  clear() {
    this.nodes = [];
    this.nodeIndex.clear();
  }

  /**
   * Get graph statistics
   * @returns {Object} Statistics about the graph
   */
  getStats() {
    return {
      nodeCount: this.nodes.length,
      timestamp: this.buildTimestamp,
      inputLength: this.inputText?.length || 0
    };
  }
}

module.exports = SemanticGraphBuilder;
