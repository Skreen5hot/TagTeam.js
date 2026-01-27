'use strict';

/**
 * @file src/ontology/PropertyMapper.js
 * @description Phase 6.6 - Property Mapper
 *
 * Maps ontology triples to TagDefinitions using a configurable property map.
 * This is the generalization of ValueNetAdapter's hardcoded vn: property extraction.
 *
 * Instead of always reading vn:keywords → semanticMarkers, the PropertyMapper
 * reads whatever property the user specifies as the keyword source.
 */

const TurtleParser = require('./TurtleParser.js');

class PropertyMapper {
  /**
   * Create a new PropertyMapper
   * @param {Object} propertyMap - Mapping configuration
   * @param {string} propertyMap.keywords - Predicate for keyword/search terms (required)
   * @param {string} [propertyMap.label='rdfs:label'] - Predicate for display label
   * @param {string|string[]} [propertyMap.typeFilter] - rdf:type(s) to include (null = all typed subjects)
   * @param {string} [propertyMap.upholding] - Predicate for upholding/positive indicators
   * @param {string} [propertyMap.violating] - Predicate for violating/negative indicators
   * @param {string} [propertyMap.category] - Predicate for category/classification
   * @param {string} [propertyMap.description='rdfs:comment'] - Predicate for description
   * @param {string[]} [propertyMap.extraProperties=[]] - Additional predicates to extract as metadata
   */
  constructor(propertyMap) {
    if (!propertyMap || !propertyMap.keywords) {
      throw new Error('PropertyMapper requires a propertyMap with at least a "keywords" property');
    }

    this.propertyMap = {
      keywords: propertyMap.keywords,
      label: propertyMap.label || 'rdfs:label',
      typeFilter: propertyMap.typeFilter || null,
      upholding: propertyMap.upholding || null,
      violating: propertyMap.violating || null,
      category: propertyMap.category || null,
      description: propertyMap.description || 'rdfs:comment',
      extraProperties: propertyMap.extraProperties || []
    };
  }

  /**
   * Extract TagDefinitions from a TurtleParser ParseResult
   * @param {Object} parseResult - Result from TurtleParser.parse()
   * @returns {Array<Object>} Array of TagDefinition objects
   */
  extractDefinitions(parseResult) {
    // Get all typed subjects
    const classes = parseResult.getClasses();

    // Apply type filter
    const filtered = this._applyTypeFilter(classes);

    // Map each subject to a TagDefinition
    return filtered
      .map(c => this._buildTagDefinition(c, parseResult))
      .filter(d => d !== null);
  }

  /**
   * Validate the property map against a ParseResult
   * @param {Object} parseResult - Result from TurtleParser.parse()
   * @returns {Object} Validation report with { valid, warnings, errors, coverage }
   */
  validate(parseResult) {
    const classes = this._applyTypeFilter(parseResult.getClasses());
    const totalClasses = classes.length;
    const errors = [];
    const warnings = [];
    const coverage = {};

    if (totalClasses === 0) {
      errors.push('No typed subjects found in ontology');
      return { valid: false, warnings, errors, coverage };
    }

    // Check each mapped property for coverage
    const propertiesToCheck = [
      { key: 'keywords', predicate: this.propertyMap.keywords, required: true },
      { key: 'label', predicate: this.propertyMap.label, required: false },
      { key: 'upholding', predicate: this.propertyMap.upholding, required: false },
      { key: 'violating', predicate: this.propertyMap.violating, required: false },
      { key: 'category', predicate: this.propertyMap.category, required: false },
      { key: 'description', predicate: this.propertyMap.description, required: false }
    ];

    // Add extra properties
    for (const extra of this.propertyMap.extraProperties) {
      propertiesToCheck.push({ key: extra, predicate: extra, required: false });
    }

    for (const prop of propertiesToCheck) {
      if (!prop.predicate) continue;

      let count = 0;
      for (const cls of classes) {
        const value = parseResult.getProperty(cls.id, prop.predicate);
        if (value) count++;
      }

      coverage[prop.key] = { found: count, total: totalClasses };

      if (count === 0 && prop.required) {
        errors.push(`Required property "${prop.predicate}" not found on any class`);
      } else if (count === 0 && !prop.required) {
        // Optional property not found anywhere — skip silently
      } else if (count < totalClasses) {
        warnings.push(`${prop.predicate} found on ${count}/${totalClasses} classes only`);
      }
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
      coverage
    };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Apply type filter to classes list
   * @private
   */
  _applyTypeFilter(classes) {
    if (!this.propertyMap.typeFilter) {
      return classes;
    }

    const filters = Array.isArray(this.propertyMap.typeFilter)
      ? this.propertyMap.typeFilter
      : [this.propertyMap.typeFilter];

    return classes.filter(c => filters.includes(c.type));
  }

  /**
   * Build a TagDefinition from a class subject
   * @private
   */
  _buildTagDefinition(classInfo, parseResult) {
    const subject = classInfo.id;

    // Extract keywords — required
    const keywordsRaw = parseResult.getProperty(subject, this.propertyMap.keywords);
    if (!keywordsRaw) {
      return null; // No keywords = not taggable
    }

    const keywords = this._splitAndTrim(keywordsRaw);
    if (keywords.length === 0) {
      return null;
    }

    // Extract local name
    const name = this._extractLocalName(subject);

    // Extract label
    const label = parseResult.getProperty(subject, this.propertyMap.label) || name;

    // Build definition
    const def = {
      id: subject,
      iri: parseResult.resolveIRI ? parseResult.resolveIRI(subject) : subject,
      name: name,
      label: label,
      type: classInfo.type,
      keywords: keywords
    };

    // Polarity indicators (optional)
    if (this.propertyMap.upholding) {
      const raw = parseResult.getProperty(subject, this.propertyMap.upholding);
      if (raw) {
        def.upholdingTerms = this._splitAndTrim(raw);
      }
    }

    if (this.propertyMap.violating) {
      const raw = parseResult.getProperty(subject, this.propertyMap.violating);
      if (raw) {
        def.violatingTerms = this._splitAndTrim(raw);
      }
    }

    // Category (optional)
    if (this.propertyMap.category) {
      const cat = parseResult.getProperty(subject, this.propertyMap.category);
      if (cat) {
        def.category = cat;
      }
    }

    // Description (optional)
    if (this.propertyMap.description) {
      const desc = parseResult.getProperty(subject, this.propertyMap.description);
      if (desc) {
        def.description = desc;
      }
    }

    // Extra properties → metadata
    if (this.propertyMap.extraProperties.length > 0) {
      def.metadata = {};
      for (const prop of this.propertyMap.extraProperties) {
        const val = parseResult.getProperty(subject, prop);
        if (val) {
          // Use local name of predicate as key
          const key = this._extractLocalName(prop);
          def.metadata[key] = val;
        }
      }
    }

    return def;
  }

  /**
   * Split comma-separated string and trim
   * @private
   */
  _splitAndTrim(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return value.split(',').map(s => s.trim()).filter(s => s);
  }

  /**
   * Extract local name from IRI or prefixed name
   * @private
   */
  _extractLocalName(iri) {
    if (!iri) return '';
    if (iri.includes(':') && !iri.includes('://')) {
      return iri.split(':').pop();
    }
    if (iri.includes('#')) return iri.split('#').pop();
    if (iri.includes('/')) return iri.split('/').pop();
    return iri;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PropertyMapper;
}
if (typeof window !== 'undefined') {
  window.PropertyMapper = PropertyMapper;
}
