/**
 * EntityExtractor.js
 *
 * Extracts entities from text using Compromise NLP and creates
 * tagteam:DiscourseReferent nodes for the semantic graph.
 *
 * Phase 1.2: Entity Extraction → Discourse Referents
 *
 * @module graph/EntityExtractor
 * @version 3.0.0-alpha.2
 */

const nlp = require('compromise');

/**
 * Scarcity markers that indicate limited resources
 */
const SCARCITY_MARKERS = [
  'last', 'only', 'sole', 'single', 'remaining', 'final',
  'scarce', 'limited', 'rare', 'few', 'shortage', 'deficit'
];

/**
 * Quantity words mapped to numeric values
 */
const QUANTITY_WORDS = {
  'one': 1, 'a': 1, 'an': 1, 'single': 1, 'sole': 1,
  'two': 2, 'both': 2, 'pair': 2, 'couple': 2,
  'three': 3, 'four': 4, 'five': 5, 'six': 6,
  'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'several': 3, 'few': 2, 'many': 10, 'multiple': 3
};

/**
 * Entity type mappings to CCO/BFO types (for denotesType property)
 */
const ENTITY_TYPE_MAPPINGS = {
  // Persons/Roles
  'doctor': 'cco:Person',
  'physician': 'cco:Person',
  'nurse': 'cco:Person',
  'patient': 'cco:Person',
  'family': 'cco:GroupOfPersons',
  'person': 'cco:Person',
  'man': 'cco:Person',
  'woman': 'cco:Person',
  'child': 'cco:Person',
  'parent': 'cco:Person',
  'mother': 'cco:Person',
  'father': 'cco:Person',

  // Medical Equipment/Artifacts
  'ventilator': 'cco:Artifact',
  'medication': 'cco:Artifact',
  'drug': 'cco:Artifact',
  'medicine': 'cco:Artifact',
  'equipment': 'cco:Artifact',
  'bed': 'cco:Artifact',
  'resource': 'cco:Artifact',
  'organ': 'cco:BodyPart',

  // Default
  '_default': 'bfo:BFO_0000040' // Material Entity
};

/**
 * EntityExtractor class - extracts entities and creates DiscourseReferent nodes
 */
class EntityExtractor {
  /**
   * Create a new EntityExtractor
   * @param {Object} options - Configuration options
   * @param {Object} [options.graphBuilder] - SemanticGraphBuilder instance for IRI generation
   */
  constructor(options = {}) {
    this.options = options;
    this.graphBuilder = options.graphBuilder || null;
  }

  /**
   * Extract entities from text and return DiscourseReferent nodes
   *
   * @param {string} text - Input text to analyze
   * @param {Object} [options] - Extraction options
   * @returns {Array<Object>} Array of DiscourseReferent nodes
   *
   * @example
   * const extractor = new EntityExtractor();
   * const entities = extractor.extract("The doctor treats the patient");
   * // Returns array of DiscourseReferent nodes
   */
  extract(text, options = {}) {
    const entities = [];

    // Parse with Compromise NLP
    const doc = nlp(text);

    // Extract nouns with their context
    const nouns = doc.nouns();

    nouns.forEach((noun, index) => {
      const nounText = noun.text();
      const nounJson = noun.json()[0] || {};
      const nounData = nounJson.noun || {};

      // Get the root noun (without determiner/adjectives)
      const rootNoun = nounData.root || nounText;

      // Skip non-entity nouns (like "here", "there", etc.)
      if (this._isNonEntityNoun(rootNoun)) {
        return;
      }

      // Get span offset
      const offset = this._getSpanOffset(text, nounText, index);

      // Use Compromise data for definiteness detection
      const definitenessInfo = this._detectDefiniteness(noun, nounText, text, nounData);

      // Detect scarcity from adjectives and context
      const scarcityInfo = this._detectScarcity(nounText, text, offset, nounData);

      // Detect quantity from Compromise and context
      const quantityInfo = this._detectQuantity(nounText, text, offset, nounData);

      // Determine entity type (use root noun for better matching)
      const entityType = this._determineEntityType(rootNoun);

      // Determine referential status
      const referentialStatus = this._determineReferentialStatus(
        definitenessInfo,
        nounText,
        text,
        index
      );

      // Create DiscourseReferent node (use full noun phrase as label)
      const referent = this._createDiscourseReferent({
        text: nounText,
        rootNoun: rootNoun,
        offset,
        entityType,
        definiteness: definitenessInfo.definiteness,
        referentialStatus,
        scarcity: scarcityInfo,
        quantity: quantityInfo
      });

      entities.push(referent);
    });

    return entities;
  }

  /**
   * Check if noun is a non-entity word to skip
   * @param {string} noun - Noun text
   * @returns {boolean} True if should skip
   */
  _isNonEntityNoun(noun) {
    const nonEntityNouns = ['here', 'there', 'now', 'then', 'help', 'way', 'thing'];
    return nonEntityNouns.includes(noun.toLowerCase().trim());
  }

  /**
   * Detect definiteness from determiner
   * @param {Object} noun - Compromise noun object
   * @param {string} nounText - The noun text
   * @param {string} fullText - Full input text
   * @param {Object} nounData - Compromise noun metadata
   * @returns {Object} Definiteness info
   */
  _detectDefiniteness(noun, nounText, fullText, nounData = {}) {
    // Definite determiners
    const definiteMarkers = ['the', 'this', 'that', 'these', 'those', 'his', 'her', 'its', 'their', 'my', 'our', 'your'];

    // Indefinite determiners
    const indefiniteMarkers = ['a', 'an', 'some', 'any', 'each', 'every', 'no', 'another'];

    // First check Compromise's determiner data
    if (nounData.determiner) {
      const det = nounData.determiner.toLowerCase();
      if (definiteMarkers.includes(det)) {
        return { definiteness: 'definite', determiner: det };
      }
      if (indefiniteMarkers.includes(det)) {
        return { definiteness: 'indefinite', determiner: det };
      }
    }

    // Fallback: check text before noun for possessives (Compromise may not catch these)
    const lowerText = fullText.toLowerCase();
    const lowerNoun = nounText.toLowerCase();
    const nounIndex = lowerText.indexOf(lowerNoun);

    if (nounIndex > 0) {
      const beforeNoun = lowerText.substring(0, nounIndex).trim();
      const words = beforeNoun.split(/\s+/);
      const lastWord = words[words.length - 1];

      if (definiteMarkers.includes(lastWord)) {
        return { definiteness: 'definite', determiner: lastWord };
      }
      if (indefiniteMarkers.includes(lastWord)) {
        return { definiteness: 'indefinite', determiner: lastWord };
      }
    }

    // Default to indefinite if no determiner
    return { definiteness: 'indefinite', determiner: null };
  }

  /**
   * Detect scarcity markers near entity
   * @param {string} nounText - The noun text
   * @param {string} fullText - Full input text
   * @param {number} offset - Span offset
   * @param {Object} nounData - Compromise noun metadata
   * @returns {Object} Scarcity info
   */
  _detectScarcity(nounText, fullText, offset, nounData = {}) {
    // First check adjectives from Compromise
    if (nounData.adjectives && nounData.adjectives.length > 0) {
      for (const adj of nounData.adjectives) {
        const lowerAdj = adj.toLowerCase();
        if (SCARCITY_MARKERS.includes(lowerAdj)) {
          return { isScarce: true, marker: lowerAdj };
        }
      }
    }

    // Fallback: check context before noun
    const lowerText = fullText.toLowerCase();
    const lowerNoun = nounText.toLowerCase();

    const nounIndex = lowerText.indexOf(lowerNoun);
    if (nounIndex === -1) {
      return { isScarce: false, marker: null };
    }

    const contextStart = Math.max(0, nounIndex - 30);
    const beforeContext = lowerText.substring(contextStart, nounIndex);

    for (const marker of SCARCITY_MARKERS) {
      if (beforeContext.includes(marker)) {
        return { isScarce: true, marker };
      }
    }

    return { isScarce: false, marker: null };
  }

  /**
   * Detect quantity from context
   * @param {string} nounText - The noun text
   * @param {string} fullText - Full input text
   * @param {number} offset - Span offset
   * @param {Object} nounData - Compromise noun metadata
   * @returns {Object} Quantity info
   */
  _detectQuantity(nounText, fullText, offset, nounData = {}) {
    // First check Compromise's number data
    if (nounData.number !== null && nounData.number !== undefined) {
      return { quantity: nounData.number, quantifier: 'detected' };
    }

    // Check adjectives for implied quantity (last, only, single = 1)
    const impliedOneMarkers = ['last', 'only', 'sole', 'single', 'remaining', 'final'];
    if (nounData.adjectives && nounData.adjectives.length > 0) {
      for (const adj of nounData.adjectives) {
        if (impliedOneMarkers.includes(adj.toLowerCase())) {
          return { quantity: 1, quantifier: adj.toLowerCase() };
        }
      }
    }

    const lowerText = fullText.toLowerCase();
    const lowerNoun = nounText.toLowerCase();

    // Find noun position
    const nounIndex = lowerText.indexOf(lowerNoun);
    if (nounIndex === -1) {
      return { quantity: null, quantifier: null };
    }

    // Look for quantity word before noun
    const contextStart = Math.max(0, nounIndex - 20);
    const beforeContext = lowerText.substring(contextStart, nounIndex);
    const words = beforeContext.trim().split(/\s+/);

    // Check each word for quantity
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      if (QUANTITY_WORDS[word] !== undefined) {
        return { quantity: QUANTITY_WORDS[word], quantifier: word };
      }

      // Check for numeric digits
      if (/^\d+$/.test(word)) {
        return { quantity: parseInt(word, 10), quantifier: word };
      }
    }

    return { quantity: null, quantifier: null };
  }

  /**
   * Determine entity type for denotesType property
   * @param {string} nounText - The noun text
   * @returns {string} Entity type IRI
   */
  _determineEntityType(nounText) {
    const lowerNoun = nounText.toLowerCase().trim();

    // Check for known entity types
    for (const [keyword, type] of Object.entries(ENTITY_TYPE_MAPPINGS)) {
      if (keyword === '_default') continue;
      if (lowerNoun.includes(keyword)) {
        return type;
      }
    }

    return ENTITY_TYPE_MAPPINGS['_default'];
  }

  /**
   * Determine referential status based on context
   * @param {Object} definitenessInfo - Definiteness info
   * @param {string} nounText - The noun text
   * @param {string} fullText - Full input text
   * @param {number} index - Entity index in sequence
   * @returns {string} Referential status
   */
  _determineReferentialStatus(definitenessInfo, nounText, fullText, index) {
    const lowerText = fullText.toLowerCase();

    // Hypothetical markers
    const hypotheticalMarkers = ['if', 'would', 'could', 'might', 'suppose', 'assuming', 'hypothetically'];
    for (const marker of hypotheticalMarkers) {
      if (lowerText.includes(marker)) {
        // Check if marker is near this noun
        const nounIndex = lowerText.indexOf(nounText.toLowerCase());
        const markerIndex = lowerText.indexOf(marker);
        if (markerIndex !== -1 && markerIndex < nounIndex && (nounIndex - markerIndex) < 50) {
          return 'hypothetical';
        }
      }
    }

    // Anaphoric: pronouns or "the [noun]" when noun was mentioned before
    const pronouns = ['he', 'she', 'it', 'they', 'him', 'her', 'them', 'his', 'their'];
    if (pronouns.includes(nounText.toLowerCase())) {
      return 'anaphoric';
    }

    // If definite and not first mention, likely presupposed
    if (definitenessInfo.definiteness === 'definite') {
      return 'presupposed';
    }

    // Indefinite typically introduces new referent
    return 'introduced';
  }

  /**
   * Get span offset for entity in text
   * @param {string} fullText - Full input text
   * @param {string} entityText - Entity text
   * @param {number} index - Entity index
   * @returns {number} Character offset
   */
  _getSpanOffset(fullText, entityText, index) {
    const lowerText = fullText.toLowerCase();
    const lowerEntity = entityText.toLowerCase();

    let offset = 0;
    let searchStart = 0;

    // Find nth occurrence
    for (let i = 0; i <= index; i++) {
      const found = lowerText.indexOf(lowerEntity, searchStart);
      if (found === -1) break;
      offset = found;
      searchStart = found + 1;
    }

    return offset;
  }

  /**
   * Create a DiscourseReferent node
   * @param {Object} entityInfo - Entity information
   * @returns {Object} DiscourseReferent node
   */
  _createDiscourseReferent(entityInfo) {
    // Generate IRI
    let iri;
    if (this.graphBuilder) {
      iri = this.graphBuilder.generateIRI(
        entityInfo.text,
        'DiscourseReferent',
        entityInfo.offset
      );
    } else {
      // Fallback simple IRI
      const cleanText = entityInfo.text.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      iri = `inst:${cleanText}_Referent_${entityInfo.offset}`;
    }

    // Build node
    const node = {
      '@id': iri,
      '@type': ['tagteam:DiscourseReferent', 'owl:NamedIndividual'],
      'rdfs:label': entityInfo.text,
      'tagteam:denotesType': entityInfo.entityType,
      'tagteam:definiteness': entityInfo.definiteness,
      'tagteam:referentialStatus': entityInfo.referentialStatus,
      'tagteam:extracted_from_span': entityInfo.text,
      'tagteam:span_offset': [entityInfo.offset, entityInfo.offset + entityInfo.text.length]
    };

    // Add scarcity if detected
    if (entityInfo.scarcity && entityInfo.scarcity.isScarce) {
      node['tagteam:is_scarce'] = true;
      node['tagteam:scarcity_marker'] = entityInfo.scarcity.marker;
    }

    // Add quantity if detected
    if (entityInfo.quantity && entityInfo.quantity.quantity !== null) {
      node['tagteam:quantity'] = entityInfo.quantity.quantity;
    }

    return node;
  }

  /**
   * Set the graph builder for IRI generation
   * @param {Object} graphBuilder - SemanticGraphBuilder instance
   */
  setGraphBuilder(graphBuilder) {
    this.graphBuilder = graphBuilder;
  }
}

module.exports = EntityExtractor;
