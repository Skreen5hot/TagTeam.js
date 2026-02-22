/**
 * InformationStaircaseBuilder.js
 *
 * Creates IBE (Information Bearing Entity) node and parser agent node.
 * Links assertion events and ICE nodes to IBE via based_on/is_concretized_by.
 *
 * Information Staircase (SHML):
 *   Literal (text) → IBE → ICE (content) → Assertions
 *
 * Phase 4 Week 2 Implementation:
 * - IBE node for input text with cco:has_text_value
 * - Parser agent as Agent
 * - Deterministic IRI generation for reproducibility
 *
 * @module graph/InformationStaircaseBuilder
 * @version 4.0.0-phase4-week2
 */

const crypto = require('crypto');

/**
 * InformationStaircaseBuilder - creates IBE and parser agent nodes
 */
class InformationStaircaseBuilder {
  /**
   * Create a new InformationStaircaseBuilder
   * @param {Object} options - Configuration options
   * @param {string} [options.version='4.0.0-phase4'] - TagTeam version string
   * @param {string} [options.namespace='inst'] - IRI namespace prefix
   */
  constructor(options = {}) {
    this.options = {
      version: options.version || '4.0.0-phase4',
      namespace: options.namespace || 'inst',
      ...options
    };

    // Cache for singleton parser agent
    this._parserAgentNode = null;
    this._parserAgentIRI = null;
  }

  /**
   * Create IBE node for input text
   *
   * @param {string} inputText - Full input text
   * @param {string} timestamp - ISO timestamp
   * @returns {Object} IBE node for @graph
   */
  createInputIBE(inputText, timestamp) {
    const iri = this.getIBE_IRI(inputText);

    return {
      '@id': iri,
      '@type': ['InformationBearingEntity', 'owl:NamedIndividual'],
      'rdfs:label': 'Input text',
      'has_text_value': inputText,
      'tagteam:char_count': inputText.length,
      'tagteam:word_count': this._countWords(inputText),
      'tagteam:received_at': timestamp
    };
  }

  /**
   * Create parser agent node (singleton per version)
   *
   * The parser agent represents TagTeam as an intentional agent
   * performing detection acts. Used in detected_by relations.
   *
   * @returns {Object} Agent node for @graph
   */
  createParserAgent() {
    // Return cached node if already created
    if (this._parserAgentNode) {
      return this._parserAgentNode;
    }

    const iri = this.getParserAgentIRI();

    this._parserAgentNode = {
      '@id': iri,
      '@type': ['Agent', 'owl:NamedIndividual'],
      'rdfs:label': `TagTeam.js Parser v${this.options.version}`,
      'tagteam:version': this.options.version,
      'tagteam:algorithm': 'BFO-aware NLP with CCO mapping',
      'tagteam:capabilities': [
        'entity_extraction',
        'act_extraction',
        'role_detection',
        'value_detection',
        'context_analysis'
      ]
    };

    return this._parserAgentNode;
  }

  /**
   * Get IRI for input IBE
   *
   * Uses SHA-256 hash of text for deterministic IRI generation.
   * Same text always produces same IRI.
   *
   * @param {string} inputText - Input text
   * @returns {string} IRI
   */
  getIBE_IRI(inputText) {
    const hash = this._hashText(inputText);
    return `${this.options.namespace}:Input_Text_IBE_${hash}`;
  }

  /**
   * Get IRI for parser agent (singleton)
   *
   * @returns {string} IRI
   */
  getParserAgentIRI() {
    if (this._parserAgentIRI) {
      return this._parserAgentIRI;
    }

    // Version-based IRI for parser agent
    const versionSlug = this.options.version.replace(/\./g, '_').replace(/-/g, '_');
    this._parserAgentIRI = `${this.options.namespace}:TagTeam_Parser_v${versionSlug}`;

    return this._parserAgentIRI;
  }

  /**
   * Generate deterministic hash for text
   *
   * @param {string} text - Text to hash
   * @returns {string} 12-char hex hash
   * @private
   */
  _hashText(text) {
    return crypto
      .createHash('sha256')
      .update(text)
      .digest('hex')
      .substring(0, 12);
  }

  /**
   * Count words in text
   *
   * @param {string} text - Input text
   * @returns {number} Word count
   * @private
   */
  _countWords(text) {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Reset cached parser agent (for testing)
   */
  reset() {
    this._parserAgentNode = null;
    this._parserAgentIRI = null;
  }
}

module.exports = InformationStaircaseBuilder;
