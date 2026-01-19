/**
 * QualityFactory.js
 *
 * Creates BFO Quality nodes (bfo:BFO_0000019) for entity qualifiers.
 * Qualities inhere in Independent Continuants and represent their
 * intrinsic properties.
 *
 * Phase 4 Two-Tier Architecture v2.4:
 * - "critically ill" → Quality inhering in Person
 * - Links qualities to bearers via bfo:inheres_in
 *
 * @module graph/QualityFactory
 * @version 4.0.0-phase4-v2.4
 */

const crypto = require('crypto');

/**
 * Known quality types mapped to BFO/CCO types
 */
const QUALITY_TYPE_MAPPINGS = {
  'critically ill': {
    type: 'cco:DiseaseQuality',
    label: 'Critical Illness Quality',
    severity: 'critical'
  },
  'terminally ill': {
    type: 'cco:DiseaseQuality',
    label: 'Terminal Illness Quality',
    severity: 'terminal'
  },
  'severely injured': {
    type: 'cco:InjuryQuality',
    label: 'Severe Injury Quality',
    severity: 'severe'
  },
  'elderly': {
    type: 'cco:AgeQuality',
    label: 'Elderly Age Quality',
    ageCategory: 'elderly'
  },
  'young': {
    type: 'cco:AgeQuality',
    label: 'Young Age Quality',
    ageCategory: 'young'
  },
  'pediatric': {
    type: 'cco:AgeQuality',
    label: 'Pediatric Age Quality',
    ageCategory: 'pediatric'
  }
};

/**
 * QualityFactory - creates BFO Quality nodes for entity qualifiers
 */
class QualityFactory {
  /**
   * Create a new QualityFactory
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = options;
    this.graphBuilder = options.graphBuilder || null;
  }

  /**
   * Create Quality nodes for entities with qualifiers
   *
   * @param {Array} entities - Array of Tier 2 entities
   * @returns {Object} { qualities, updatedEntities }
   */
  createFromEntities(entities) {
    const qualities = [];
    const updatedEntities = [];

    entities.forEach(entity => {
      const entityQualities = [];
      const qualifiers = entity['tagteam:qualifiers'] || [];

      if (qualifiers.length > 0) {
        qualifiers.forEach(qualifier => {
          const quality = this._createQuality(qualifier, entity);
          if (quality) {
            qualities.push(quality);
            entityQualities.push(quality['@id']);
          }
        });
      }

      // Update entity with quality bearer links
      const updatedEntity = { ...entity };
      if (entityQualities.length > 0) {
        updatedEntity['bfo:is_bearer_of'] = [
          ...(updatedEntity['bfo:is_bearer_of'] || []),
          ...entityQualities
        ];
      }
      updatedEntities.push(updatedEntity);
    });

    return { qualities, updatedEntities };
  }

  /**
   * Create a Quality node for a qualifier
   *
   * @param {string} qualifier - Qualifier string (e.g., "critically ill")
   * @param {Object} bearer - Bearer entity
   * @returns {Object|null} Quality node or null if unknown qualifier
   * @private
   */
  _createQuality(qualifier, bearer) {
    const normalizedQualifier = qualifier.toLowerCase().trim();
    const mapping = QUALITY_TYPE_MAPPINGS[normalizedQualifier];

    if (!mapping) {
      // Unknown qualifier - create generic quality
      return this._createGenericQuality(qualifier, bearer);
    }

    const iri = this._generateQualityIRI(qualifier, bearer['@id']);

    const quality = {
      '@id': iri,
      '@type': [mapping.type, 'bfo:BFO_0000019', 'owl:NamedIndividual'],
      'rdfs:label': `${mapping.label} of ${bearer['rdfs:label']}`,
      'bfo:inheres_in': bearer['@id'],
      'tagteam:qualifierText': qualifier,
      'tagteam:instantiated_at': new Date().toISOString()
    };

    // Add severity/category if applicable
    if (mapping.severity) {
      quality['tagteam:severity'] = mapping.severity;
    }
    if (mapping.ageCategory) {
      quality['tagteam:ageCategory'] = mapping.ageCategory;
    }

    return quality;
  }

  /**
   * Create a generic Quality node for unknown qualifiers
   *
   * @param {string} qualifier - Qualifier string
   * @param {Object} bearer - Bearer entity
   * @returns {Object} Quality node
   * @private
   */
  _createGenericQuality(qualifier, bearer) {
    const iri = this._generateQualityIRI(qualifier, bearer['@id']);

    return {
      '@id': iri,
      '@type': ['bfo:BFO_0000019', 'owl:NamedIndividual'],
      'rdfs:label': `${qualifier} quality of ${bearer['rdfs:label']}`,
      'bfo:inheres_in': bearer['@id'],
      'tagteam:qualifierText': qualifier,
      'tagteam:instantiated_at': new Date().toISOString()
    };
  }

  /**
   * Generate IRI for a quality
   * @private
   */
  _generateQualityIRI(qualifier, bearerIRI) {
    const hash = crypto
      .createHash('sha256')
      .update(`${qualifier}|${bearerIRI}`)
      .digest('hex')
      .substring(0, 12);

    // Normalize qualifier for IRI
    const qualifierSlug = qualifier
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .substring(0, 20);

    return `inst:Quality_${qualifierSlug}_${hash}`;
  }

  /**
   * Set the graph builder
   * @param {Object} graphBuilder - SemanticGraphBuilder instance
   */
  setGraphBuilder(graphBuilder) {
    this.graphBuilder = graphBuilder;
  }
}

module.exports = QualityFactory;
