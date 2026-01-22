/**
 * ScarcityAssertionFactory.js
 *
 * Creates ScarcityAssertion ICE nodes from detected scarcity in text.
 * Scarcity is an Information Content Entity (ICE), NOT a property of
 * real-world entities (Tier 2).
 *
 * Phase 4 Two-Tier Architecture v2.3:
 * - Scarcity info belongs in Tier 1 (ICE layer)
 * - ScarcityAssertion is_about the Tier 2 resource
 * - Tier 2 entities (cco:Person, cco:Artifact) stay clean
 *
 * @module graph/ScarcityAssertionFactory
 * @version 4.0.0-phase4-v2.3
 */

const crypto = require('crypto');

/**
 * ScarcityAssertionFactory - creates ScarcityAssertion ICE nodes
 */
class ScarcityAssertionFactory {
  /**
   * Create a new ScarcityAssertionFactory
   * @param {Object} options - Configuration options
   * @param {Object} [options.graphBuilder] - SemanticGraphBuilder for IRI generation
   * @param {string} [options.documentIRI] - Document IRI for provenance
   */
  constructor(options = {}) {
    this.options = options;
    this.graphBuilder = options.graphBuilder || null;
  }

  /**
   * Create ScarcityAssertion nodes from entities with scarcity markers
   *
   * @param {Array} tier1Referents - Tier 1 DiscourseReferent nodes
   * @param {Array} tier2Entities - Tier 2 entities
   * @param {Map} linkMap - Map from Tier 1 IRI to Tier 2 IRI
   * @returns {Object} { scarcityAssertions, cleanedReferents }
   */
  createFromEntities(tier1Referents, tier2Entities, linkMap) {
    const scarcityAssertions = [];
    const cleanedReferents = [];

    tier1Referents.forEach(referent => {
      // Check if this referent has scarcity markers
      const isScarce = referent['tagteam:is_scarce'];
      const scarcityMarker = referent['tagteam:scarcity_marker'];
      const quantity = referent['tagteam:quantity'];

      if (isScarce) {
        // Create ScarcityAssertion ICE node
        const tier2IRI = linkMap.get(referent['@id']);
        const assertion = this._createScarcityAssertion({
          sourceText: referent['tagteam:sourceText'] || referent['rdfs:label'],
          scarcityMarker,
          quantity,
          resourceIRI: tier2IRI,
          referentIRI: referent['@id']
        });
        scarcityAssertions.push(assertion);
      }

      // Create cleaned referent (without scarcity properties on Tier 1)
      // Keep scarcity on Tier 1 for now as evidence, but Tier 2 should be clean
      cleanedReferents.push(referent);
    });

    // Clean Tier 2 entities - remove scarcity properties
    const cleanedTier2 = tier2Entities.map(entity => {
      const cleaned = { ...entity };
      // Remove scarcity properties from Tier 2 (they belong in ScarcityAssertion)
      delete cleaned['tagteam:is_scarce'];
      delete cleaned['tagteam:scarcity_marker'];
      delete cleaned['tagteam:quantity'];
      return cleaned;
    });

    return {
      scarcityAssertions,
      cleanedReferents,
      cleanedTier2
    };
  }

  /**
   * Create a ScarcityAssertion node
   *
   * @param {Object} info - Scarcity information
   * @returns {Object} ScarcityAssertion node
   * @private
   */
  _createScarcityAssertion(info) {
    const { sourceText, scarcityMarker, quantity, resourceIRI, referentIRI } = info;

    // Generate IRI
    const iri = this._generateIRI(sourceText, resourceIRI);

    const assertion = {
      '@id': iri,
      '@type': ['tagteam:ScarcityAssertion', 'cco:InformationContentEntity', 'owl:NamedIndividual'],
      'rdfs:label': `Resource Scarcity: ${sourceText}`,
      'tagteam:evidenceText': sourceText
    };

    // Add supply count (quantity of scarce resource)
    if (quantity !== null && quantity !== undefined) {
      assertion['tagteam:supplyCount'] = quantity;
    }

    // Add scarcity marker
    if (scarcityMarker) {
      assertion['tagteam:scarcityMarker'] = scarcityMarker;
    }

    // Link to the Tier 2 resource this is about
    if (resourceIRI) {
      assertion['cco:is_about'] = { '@id': resourceIRI };
    }

    // Link to the source referent
    if (referentIRI) {
      assertion['tagteam:extracted_from'] = { '@id': referentIRI };
    }

    // Add timestamp
    assertion['tagteam:detected_at'] = new Date().toISOString();

    return assertion;
  }

  /**
   * Generate IRI for a ScarcityAssertion
   *
   * @param {string} sourceText - Source text
   * @param {string} resourceIRI - Resource IRI
   * @returns {string} Generated IRI
   * @private
   */
  _generateIRI(sourceText, resourceIRI) {
    const hashInput = `ScarcityAssertion|${sourceText}|${resourceIRI || ''}`;

    const hash = crypto
      .createHash('sha256')
      .update(hashInput)
      .digest('hex')
      .substring(0, 12);

    // Clean source text for IRI
    const cleanText = (sourceText || 'resource')
      .split(' ')
      .slice(0, 3)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('_')
      .replace(/[^a-zA-Z0-9_]/g, '');

    return `inst:ScarcityAssertion_${cleanText}_${hash}`;
  }

  /**
   * Set the graph builder
   * @param {Object} graphBuilder - SemanticGraphBuilder instance
   */
  setGraphBuilder(graphBuilder) {
    this.graphBuilder = graphBuilder;
  }
}

module.exports = ScarcityAssertionFactory;
