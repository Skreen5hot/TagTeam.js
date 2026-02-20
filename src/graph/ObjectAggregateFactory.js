/**
 * ObjectAggregateFactory.js
 *
 * Creates BFO Object Aggregate nodes for plural entities.
 * When text mentions "two patients", this creates:
 * - Two individual cco:Person nodes
 * - One bfo:BFO_0000027 (Object Aggregate) containing them
 *
 * Phase 4 Two-Tier Architecture v2.3:
 * - Properly represents plural entities as aggregates
 * - Each member is a distinct Independent Continuant
 * - Aggregate has has_member relations to individuals
 *
 * @module graph/ObjectAggregateFactory
 * @version 4.0.0-phase4-v2.3
 */

const crypto = require('crypto');

/**
 * ObjectAggregateFactory - creates aggregates for plural entities
 */
class ObjectAggregateFactory {
  /**
   * Create a new ObjectAggregateFactory
   * @param {Object} options - Configuration options
   * @param {Object} [options.lemmatizer] - Lemmatizer instance for morphological reduction
   */
  constructor(options = {}) {
    this.options = options;
    this.graphBuilder = options.graphBuilder || null;
    this.lemmatizer = options.lemmatizer || null;
  }

  /**
   * Process Tier 2 entities and create aggregates for plural entities
   *
   * @param {Array} tier2Entities - Array of Tier 2 entities
   * @param {Array} tier1Referents - Array of Tier 1 referents (for quantity info)
   * @param {Map} linkMap - Map from Tier 1 IRI to Tier 2 IRI
   * @returns {Object} { expandedEntities, aggregates, updatedLinkMap }
   */
  processEntities(tier2Entities, tier1Referents, linkMap) {
    const expandedEntities = [];
    const aggregates = [];
    const updatedLinkMap = new Map(linkMap);

    // Build reverse map: Tier 2 IRI -> Tier 1 referent
    const reverseMap = new Map();
    linkMap.forEach((tier2IRI, tier1IRI) => {
      reverseMap.set(tier2IRI, tier1Referents.find(r => r['@id'] === tier1IRI));
    });

    tier2Entities.forEach(entity => {
      const referent = reverseMap.get(entity['@id']);
      const quantity = referent ? referent['tagteam:quantity'] : null;

      // Check if this is a plural entity (quantity > 1)
      if (quantity && quantity > 1 && this._isPersonEntity(entity)) {
        // Create individual members
        const members = this._createMembers(entity, quantity, referent);
        expandedEntities.push(...members);

        // Create aggregate
        const aggregate = this._createAggregate(entity, members, referent);
        aggregates.push(aggregate);

        // Update link map: referent now points to aggregate
        const tier1IRI = [...linkMap.entries()]
          .find(([t1, t2]) => t2 === entity['@id'])?.[0];
        if (tier1IRI) {
          updatedLinkMap.set(tier1IRI, aggregate['@id']);
        }

        // Don't include the original entity (it's been expanded)
      } else {
        // Keep entity as-is
        expandedEntities.push(entity);
      }
    });

    return {
      expandedEntities,
      aggregates,
      updatedLinkMap
    };
  }

  /**
   * Check if entity is a Person type
   * @param {Object} entity - Entity node
   * @returns {boolean} True if Person
   * @private
   */
  _isPersonEntity(entity) {
    const types = entity['@type'] || [];
    return types.some(t => t.includes('cco:Person'));
  }

  /**
   * Create individual member entities
   *
   * @param {Object} originalEntity - Original plural entity
   * @param {number} count - Number of members
   * @param {Object} referent - Source referent
   * @returns {Array<Object>} Array of individual member nodes
   * @private
   */
  _createMembers(originalEntity, count, referent) {
    const members = [];
    let baseLabel = originalEntity['rdfs:label'] || 'entity';
    if (this.lemmatizer) {
      baseLabel = this.lemmatizer.lemmatizePhrase(baseLabel);
    }

    // Extract qualifiers from label (e.g., "critically ill" from "two critically ill patients")
    const qualifiers = this._extractQualifiers(referent);

    for (let i = 1; i <= count; i++) {
      const member = {
        '@id': this._generateMemberIRI(originalEntity['@id'], i),
        '@type': [...originalEntity['@type']],
        'rdfs:label': `${baseLabel.replace(/two|three|four|five|six|seven|eight|nine|ten|\d+/i, '').trim()} ${i}`,
        'tagteam:instantiated_at': new Date().toISOString(),
        'tagteam:member_index': i
      };

      // Add qualifiers as qualities if present
      if (qualifiers.length > 0) {
        member['tagteam:qualifiers'] = qualifiers;
      }

      members.push(member);
    }

    return members;
  }

  /**
   * Create an Object Aggregate node
   *
   * @param {Object} originalEntity - Original plural entity
   * @param {Array} members - Member entities
   * @param {Object} referent - Source referent
   * @returns {Object} Object Aggregate node
   * @private
   */
  _createAggregate(originalEntity, members, referent) {
    let label = referent?.['rdfs:label'] || originalEntity['rdfs:label'];
    if (this.lemmatizer) {
      label = this.lemmatizer.lemmatizePhrase(label);
    }

    const aggregate = {
      '@id': this._generateAggregateIRI(originalEntity['@id']),
      '@type': ['bfo:BFO_0000027', 'owl:NamedIndividual'], // Object Aggregate
      'rdfs:label': `Aggregate of ${label}`,
      // Use object notation with @id for JSON-LD compliance
      'bfo:has_member': members.map(m => ({ '@id': m['@id'] })),
      'tagteam:member_count': members.length,
      'tagteam:instantiated_at': new Date().toISOString()
    };

    return aggregate;
  }

  /**
   * Extract qualifiers from referent label
   *
   * @param {Object} referent - Source referent
   * @returns {Array<string>} Array of qualifier strings
   * @private
   */
  _extractQualifiers(referent) {
    if (!referent) return [];

    const label = referent['rdfs:label'] || '';
    const qualifiers = [];

    // Common medical qualifiers
    const qualifierPatterns = [
      /critically\s+ill/i,
      /terminally\s+ill/i,
      /severely\s+injured/i,
      /elderly/i,
      /young/i,
      /pediatric/i
    ];

    qualifierPatterns.forEach(pattern => {
      const match = label.match(pattern);
      if (match) {
        qualifiers.push(match[0].toLowerCase());
      }
    });

    return qualifiers;
  }

  /**
   * Generate IRI for a member
   * @private
   */
  _generateMemberIRI(baseIRI, index) {
    const hash = crypto
      .createHash('sha256')
      .update(`${baseIRI}|member|${index}`)
      .digest('hex')
      .substring(0, 12);

    // Extract entity type from base IRI
    const typeMatch = baseIRI.match(/inst:(\w+)_/);
    const type = typeMatch ? typeMatch[1] : 'Entity';

    return `inst:${type}_Member_${index}_${hash}`;
  }

  /**
   * Generate IRI for an aggregate
   * @private
   */
  _generateAggregateIRI(baseIRI) {
    const hash = crypto
      .createHash('sha256')
      .update(`${baseIRI}|aggregate`)
      .digest('hex')
      .substring(0, 12);

    return `inst:ObjectAggregate_${hash}`;
  }

  /**
   * Set the graph builder
   * @param {Object} graphBuilder - SemanticGraphBuilder instance
   */
  setGraphBuilder(graphBuilder) {
    this.graphBuilder = graphBuilder;
  }
}

module.exports = ObjectAggregateFactory;
