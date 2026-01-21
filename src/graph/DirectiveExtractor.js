/**
 * DirectiveExtractor.js
 *
 * Extracts Directive Information Content Entities from text.
 * Directives represent deontic/modal content (must, should, may, etc.)
 *
 * Phase 4 Two-Tier Architecture v2.3:
 * - DirectiveInformationContentEntity for modal markers
 * - Links to acts via cco:prescribes
 * - Properly separates linguistic content (ICE) from acts (occurrents)
 *
 * @module graph/DirectiveExtractor
 * @version 4.0.0-phase4-v2.3
 */

const crypto = require('crypto');

/**
 * Modal marker to deontic type mapping
 */
const MODAL_MAPPINGS = {
  // Obligation (must, have to, shall)
  'must': { type: 'obligation', strength: 1.0 },
  'shall': { type: 'obligation', strength: 1.0 },
  'have to': { type: 'obligation', strength: 0.9 },
  'need to': { type: 'obligation', strength: 0.8 },
  'ought to': { type: 'obligation', strength: 0.7 },
  'should': { type: 'obligation', strength: 0.6 },

  // Permission (may, can, could)
  'may': { type: 'permission', strength: 0.7 },
  'can': { type: 'permission', strength: 0.6 },
  'could': { type: 'permission', strength: 0.5 },
  'might': { type: 'permission', strength: 0.4 },

  // Prohibition (must not, cannot)
  'must not': { type: 'prohibition', strength: 1.0 },
  'cannot': { type: 'prohibition', strength: 0.9 },
  'shall not': { type: 'prohibition', strength: 1.0 },

  // Intention (will, going to)
  'will': { type: 'intention', strength: 0.8 },
  'going to': { type: 'intention', strength: 0.7 }
};

/**
 * DirectiveExtractor - extracts deontic/modal directives from text
 */
class DirectiveExtractor {
  /**
   * Create a new DirectiveExtractor
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = options;
    this.graphBuilder = options.graphBuilder || null;
  }

  /**
   * Extract Directive ICE nodes from acts
   *
   * @param {Array} acts - Array of IntentionalAct nodes
   * @param {string} fullText - Original input text
   * @returns {Array<Object>} Array of DirectiveInformationContentEntity nodes
   */
  extract(acts, fullText) {
    const directives = [];

    acts.forEach(act => {
      const modality = act['tagteam:modality'];

      if (modality) {
        // Find the modal marker in the source text
        const sourceText = act['tagteam:sourceText'] || '';
        const modalMarker = this._findModalMarker(sourceText, fullText);

        if (modalMarker) {
          const directive = this._createDirective({
            modalMarker: modalMarker.marker,
            modalType: modalMarker.type,
            modalStrength: modalMarker.strength,
            actIRI: act['@id'],
            sourceText: act['tagteam:sourceText']
          });
          directives.push(directive);

          // Link act back to directive
          act['tagteam:prescribed_by'] = directive['@id'];
        }
      }
    });

    return directives;
  }

  /**
   * Find modal marker in text
   *
   * @param {string} sourceText - Act source text
   * @param {string} fullText - Full input text
   * @returns {Object|null} Modal info or null
   * @private
   */
  _findModalMarker(sourceText, fullText) {
    const textLower = sourceText.toLowerCase();

    // Check for multi-word markers first (must not, have to, etc.)
    const multiWordMarkers = ['must not', 'shall not', 'have to', 'need to', 'ought to', 'going to'];
    for (const marker of multiWordMarkers) {
      if (textLower.includes(marker)) {
        const mapping = MODAL_MAPPINGS[marker];
        return { marker, ...mapping };
      }
    }

    // Check single-word markers
    for (const [marker, mapping] of Object.entries(MODAL_MAPPINGS)) {
      if (!marker.includes(' ') && textLower.includes(marker)) {
        return { marker, ...mapping };
      }
    }

    return null;
  }

  /**
   * Create a DirectiveInformationContentEntity node
   *
   * @param {Object} info - Directive information
   * @returns {Object} Directive ICE node
   * @private
   */
  _createDirective(info) {
    const { modalMarker, modalType, modalStrength, actIRI, sourceText } = info;

    // Generate IRI
    const iri = this._generateIRI(modalMarker, actIRI);

    const directive = {
      '@id': iri,
      // Per ontology: DirectiveContent is subclass of both DeonticContent and cco:DirectiveInformationContentEntity
      '@type': ['tagteam:DirectiveContent', 'cco:DirectiveInformationContentEntity', 'owl:NamedIndividual'],
      'rdfs:label': `${modalType.charAt(0).toUpperCase() + modalType.slice(1)} Directive: ${modalMarker}`,
      'tagteam:modalMarker': modalMarker,
      'tagteam:modalType': modalType,
      'tagteam:modalStrength': modalStrength,

      // Link to the act this directive prescribes
      'cco:prescribes': actIRI
    };

    if (sourceText) {
      directive['tagteam:evidenceText'] = sourceText;
    }

    return directive;
  }

  /**
   * Generate IRI for a Directive
   *
   * @param {string} modalMarker - Modal marker
   * @param {string} actIRI - Act IRI
   * @returns {string} Generated IRI
   * @private
   */
  _generateIRI(modalMarker, actIRI) {
    const hashInput = `Directive|${modalMarker}|${actIRI}`;

    const hash = crypto
      .createHash('sha256')
      .update(hashInput)
      .digest('hex')
      .substring(0, 12);

    const cleanMarker = modalMarker
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('_');

    return `inst:Directive_${cleanMarker}_${hash}`;
  }

  /**
   * Set the graph builder
   * @param {Object} graphBuilder - SemanticGraphBuilder instance
   */
  setGraphBuilder(graphBuilder) {
    this.graphBuilder = graphBuilder;
  }
}

module.exports = DirectiveExtractor;
