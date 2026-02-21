/**
 * @file src/graph/OntologyValidator.js
 * @description Phase 6.4.5 - OntologyValidator
 *
 * Validates ontology domain configurations before loading into TagTeam.
 * Provides four layers of validation:
 * 1. Structural - JSON syntax, required fields, types
 * 2. Semantic - IRI format, BFO/CCO types, hierarchy
 * 3. Compatibility - namespace collisions, term conflicts
 * 4. TagTeam-specific - verb overrides, type specializations
 *
 * @example
 * const validator = new OntologyValidator({ strictMode: true });
 * const report = validator.validateDomainConfig(config);
 * if (report.isValid()) {
 *   // Safe to load
 * }
 */

const ValidationReport = require('./ValidationReport.js');
const bfoCcoRegistry = require('../data/bfo-cco-registry.js');

// Known prefixes for IRI validation
const KNOWN_PREFIXES = {
  'bfo': 'http://purl.obolibrary.org/obo/BFO_',
  'cco': 'https://www.commoncoreontologies.org/',
  'obo': 'http://purl.obolibrary.org/obo/',
  'tagteam': 'http://purl.org/tagteam#',
  'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
  'owl': 'http://www.w3.org/2002/07/owl#',
  'xsd': 'http://www.w3.org/2001/XMLSchema#'
};

// Valid keys for verb overrides
const VALID_VERB_KEYS = [
  'default',
  'objectIsOccurrent',
  'objectIsContinuant',
  'objectIsGDC',
  'objectIsPerson',
  'objectIsOrganization',
  'objectIsArtifact'
];

class OntologyValidator {
  /**
   * Create a new OntologyValidator
   * @param {Object} options - Configuration options
   * @param {boolean} options.strictMode - Treat warnings as errors
   * @param {boolean} options.allowUnknownTypes - Allow unknown BFO/CCO types
   * @param {boolean} options.checkCompatibility - Enable compatibility checking
   * @param {boolean} options.validateReferences - Validate IRI references
   * @param {Object} options.customPrefixes - Additional prefix mappings
   */
  constructor(options = {}) {
    this.options = {
      strictMode: options.strictMode || false,
      allowUnknownTypes: options.allowUnknownTypes !== false, // Default true
      checkCompatibility: options.checkCompatibility !== false, // Default true
      validateReferences: options.validateReferences !== false, // Default true
      customPrefixes: options.customPrefixes || {}
    };

    // Merge custom prefixes with known prefixes
    this.prefixes = { ...KNOWN_PREFIXES, ...this.options.customPrefixes };
  }

  // ==================== Main Entry Points ====================

  /**
   * Main validation entry point
   * @param {Object|string} configOrJson - Config object or JSON string
   * @returns {ValidationReport} Validation report
   */
  validate(configOrJson) {
    const report = new ValidationReport();

    // Handle string input (JSON)
    if (typeof configOrJson === 'string') {
      try {
        const parsed = JSON.parse(configOrJson);
        return this.validateDomainConfig(parsed);
      } catch (e) {
        report.addError({
          code: 'INVALID_JSON',
          message: `Invalid JSON: ${e.message}`,
          value: configOrJson.substring(0, 100)
        });
        return report;
      }
    }

    // Handle object input
    return this.validateDomainConfig(configOrJson);
  }

  /**
   * Validate a domain configuration object
   * @param {Object} config - Domain configuration
   * @returns {ValidationReport} Validation report
   */
  validateDomainConfig(config) {
    const report = new ValidationReport();

    // Handle null/undefined
    if (config === null || config === undefined) {
      report.addError({
        code: 'NULL_CONFIG',
        message: 'Configuration is null or undefined'
      });
      return report;
    }

    // Handle non-object
    if (typeof config !== 'object' || Array.isArray(config)) {
      report.addError({
        code: 'INVALID_CONFIG_TYPE',
        message: 'Configuration must be an object',
        value: typeof config
      });
      return report;
    }

    // Layer 1: Structural validation
    this._validateStructure(config, report);

    // Layer 2: Semantic validation
    this._validateSemantics(config, report);

    // Layer 4: TagTeam-specific validation
    this._validateTagTeamSpecific(config, report);

    // In strict mode, convert warnings to errors
    if (this.options.strictMode && report.hasWarnings()) {
      for (const warning of report.warnings) {
        report.addError({
          ...warning,
          code: warning.code,
          message: `[Strict] ${warning.message}`
        });
      }
    }

    return report;
  }

  // ==================== Layer 1: Structural Validation ====================

  /**
   * Validate structure of config
   * @private
   */
  _validateStructure(config, report) {
    // Required fields
    if (!('domain' in config)) {
      report.addError({
        code: 'MISSING_DOMAIN',
        message: 'Missing required field: domain',
        path: 'domain'
      });
    } else if (typeof config.domain !== 'string') {
      report.addError({
        code: 'INVALID_DOMAIN_TYPE',
        message: 'Domain must be a string',
        path: 'domain',
        value: typeof config.domain
      });
    } else if (config.domain === '') {
      report.addWarning({
        code: 'EMPTY_DOMAIN',
        message: 'Domain name is empty',
        path: 'domain',
        suggestion: 'Provide a meaningful domain name'
      });
    }

    if (!('version' in config)) {
      report.addError({
        code: 'MISSING_VERSION',
        message: 'Missing required field: version',
        path: 'version'
      });
    } else if (typeof config.version !== 'string') {
      report.addError({
        code: 'INVALID_VERSION_TYPE',
        message: 'Version must be a string',
        path: 'version',
        value: typeof config.version
      });
    }

    // Optional fields type checking
    if ('typeSpecializations' in config) {
      this._validateTypeSpecializations(config.typeSpecializations, report);
    }

    if ('verbOverrides' in config) {
      if (typeof config.verbOverrides !== 'object' ||
          config.verbOverrides === null ||
          Array.isArray(config.verbOverrides)) {
        report.addWarning({
          code: 'INVALID_VERB_OVERRIDES',
          message: 'verbOverrides must be an object',
          path: 'verbOverrides',
          value: typeof config.verbOverrides
        });
      } else {
        const issues = this.validateVerbOverrides(config.verbOverrides);
        report.addIssues(issues);
      }
    }

    if ('processRootWords' in config) {
      if (typeof config.processRootWords !== 'object' ||
          config.processRootWords === null ||
          Array.isArray(config.processRootWords)) {
        report.addWarning({
          code: 'INVALID_PROCESS_ROOT_WORDS',
          message: 'processRootWords must be an object',
          path: 'processRootWords',
          value: typeof config.processRootWords
        });
      }
    }
  }

  /**
   * Validate typeSpecializations structure
   * @private
   */
  _validateTypeSpecializations(typeSpecs, report) {
    if (typeof typeSpecs !== 'object' || typeSpecs === null || Array.isArray(typeSpecs)) {
      report.addWarning({
        code: 'INVALID_TYPE_SPECS',
        message: 'typeSpecializations must be an object',
        path: 'typeSpecializations',
        value: typeof typeSpecs
      });
      return;
    }

    // Validate each type specialization
    for (const [typeKey, spec] of Object.entries(typeSpecs)) {
      const path = `typeSpecializations.${typeKey}`;

      if (spec === null || spec === undefined) {
        report.addWarning({
          code: 'NULL_TYPE_SPEC',
          message: `Type specialization for ${typeKey} is null`,
          path
        });
        continue;
      }

      if (typeof spec !== 'object' || Array.isArray(spec)) {
        report.addWarning({
          code: 'INVALID_TYPE_SPEC_VALUE',
          message: `Type specialization for ${typeKey} must be an object`,
          path,
          value: typeof spec
        });
        continue;
      }

      // Check terms array if present
      if ('terms' in spec) {
        if (!Array.isArray(spec.terms)) {
          report.addWarning({
            code: 'INVALID_TERMS_TYPE',
            message: `Terms for ${typeKey} must be an array`,
            path: `${path}.terms`,
            value: typeof spec.terms
          });
        }
      }
    }
  }

  // ==================== Layer 2: Semantic Validation ====================

  /**
   * Validate semantic correctness
   * @private
   */
  _validateSemantics(config, report) {
    // Validate IRIs in typeSpecializations
    if (config.typeSpecializations && typeof config.typeSpecializations === 'object') {
      for (const typeKey of Object.keys(config.typeSpecializations)) {
        const iriIssue = this.validateIRI(typeKey);
        if (iriIssue) {
          report.addIssues([{
            ...iriIssue,
            path: `typeSpecializations.${typeKey}`
          }]);
        }
      }
    }

    // Validate IRIs in verbOverrides
    if (config.verbOverrides && typeof config.verbOverrides === 'object') {
      for (const [verb, overrides] of Object.entries(config.verbOverrides)) {
        if (overrides && typeof overrides === 'object') {
          for (const [key, value] of Object.entries(overrides)) {
            if (typeof value === 'string' && value.includes(':')) {
              const iriIssue = this.validateIRI(value);
              if (iriIssue) {
                report.addIssues([{
                  ...iriIssue,
                  path: `verbOverrides.${verb}.${key}`
                }]);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Validate an IRI format
   * @param {string} iri - IRI to validate
   * @returns {Object|null} Issue object or null if valid
   */
  validateIRI(iri) {
    if (!iri || typeof iri !== 'string') {
      return {
        code: 'INVALID_IRI_FORMAT',
        message: 'IRI is empty or not a string',
        severity: 'error',
        value: iri
      };
    }

    // Check for spaces (invalid in IRIs)
    if (/\s/.test(iri)) {
      return {
        code: 'INVALID_IRI_FORMAT',
        message: 'IRI contains whitespace',
        severity: 'error',
        value: iri
      };
    }

    // Full URI format
    if (iri.startsWith('http://') || iri.startsWith('https://')) {
      return null; // Valid full URI
    }

    // Prefixed format (e.g., cco:Person)
    if (iri.includes(':')) {
      const [prefix, localName] = iri.split(':', 2);

      // Check for uppercase prefix (case sensitivity warning)
      if (prefix !== prefix.toLowerCase()) {
        return {
          code: 'MIXED_CASE_PREFIX',
          message: `Prefix "${prefix}" should be lowercase`,
          severity: 'warning',
          value: iri,
          suggestion: `Use "${prefix.toLowerCase()}:${localName}"`
        };
      }

      // Check if prefix is known
      if (!this.prefixes[prefix]) {
        return {
          code: 'UNKNOWN_PREFIX',
          message: `Unknown namespace prefix: ${prefix}`,
          severity: 'warning',
          value: iri
        };
      }

      // Valid prefixed IRI
      return null;
    }

    // Unprefixed local name - allow but could warn
    return null;
  }

  /**
   * Validate BFO hierarchy for a type mapping
   * @param {Object} mapping - Type mapping to validate
   * @returns {Array} Array of issue objects
   */
  validateBFOHierarchy(mapping) {
    const issues = [];
    const { term, mappedType, baseType } = mapping;

    if (!mappedType) {
      return issues;
    }

    // Normalize type names
    const normalizedMapped = bfoCcoRegistry.normalizeTypeId(mappedType);
    const normalizedBase = baseType ? bfoCcoRegistry.normalizeTypeId(baseType) : null;

    // Check if mapped type exists
    const typeExists = bfoCcoRegistry.typeExists(normalizedMapped);

    if (!typeExists) {
      if (!this.options.allowUnknownTypes) {
        issues.push({
          code: 'UNKNOWN_TYPE',
          message: `Unknown type: ${mappedType}`,
          severity: 'error',
          value: mappedType,
          path: term
        });
      } else {
        issues.push({
          code: 'UNKNOWN_TYPE',
          message: `Unknown type: ${mappedType} (allowed)`,
          severity: 'warning',
          value: mappedType,
          path: term
        });
      }
      return issues;
    }

    // If no base type, nothing more to validate
    if (!normalizedBase) {
      return issues;
    }

    // Check hierarchy relationship
    const isValidHierarchy = bfoCcoRegistry.isSubtypeOf(normalizedMapped, normalizedBase);

    if (!isValidHierarchy) {
      // Check for Continuant/Occurrent mismatch
      const mappedInfo = bfoCcoRegistry.getTypeInfo(normalizedMapped);
      const baseInfo = bfoCcoRegistry.getTypeInfo(normalizedBase);

      if (mappedInfo && baseInfo) {
        const mappedAncestors = bfoCcoRegistry.getAncestors(normalizedMapped);
        const baseAncestors = bfoCcoRegistry.getAncestors(normalizedBase);

        const mappedIsContinuant = mappedAncestors.includes('BFO_0000002') || normalizedMapped === 'BFO_0000002';
        const mappedIsOccurrent = mappedAncestors.includes('BFO_0000003') || normalizedMapped === 'BFO_0000003';
        const baseIsContinuant = baseAncestors.includes('BFO_0000002') || normalizedBase === 'BFO_0000002';
        const baseIsOccurrent = baseAncestors.includes('BFO_0000003') || normalizedBase === 'BFO_0000003';

        if ((mappedIsContinuant && baseIsOccurrent) || (mappedIsOccurrent && baseIsContinuant)) {
          issues.push({
            code: 'HIERARCHY_VIOLATION',
            message: `Type mismatch: ${mappedType} cannot be a subtype of ${baseType} (Continuant/Occurrent mismatch)`,
            severity: 'error',
            value: { mapped: mappedType, base: baseType },
            path: term
          });
        }
      }
    }

    return issues;
  }

  // ==================== Layer 3: Compatibility Validation ====================

  /**
   * Check compatibility with other loaded configs
   * @param {Object} newConfig - New config to check
   * @param {Array} loadedConfigs - Already loaded configs
   * @returns {ValidationReport} Compatibility report
   */
  checkCompatibility(newConfig, loadedConfigs) {
    const report = new ValidationReport();

    // If compatibility checking is disabled, return empty report
    if (!this.options.checkCompatibility) {
      return report;
    }

    if (!loadedConfigs || !Array.isArray(loadedConfigs)) {
      return report;
    }

    for (const existing of loadedConfigs) {
      // Check domain name collision
      if (existing.domain && newConfig.domain && existing.domain === newConfig.domain) {
        report.addWarning({
          code: 'DOMAIN_CONFLICT',
          message: `Domain "${newConfig.domain}" already loaded`,
          value: newConfig.domain
        });
      }

      // Check namespace prefix collisions
      this._checkPrefixCollisions(newConfig, existing, report);

      // Check term conflicts
      this._checkTermConflicts(newConfig, existing, report);

      // Check verb override conflicts
      this._checkVerbConflicts(newConfig, existing, report);
    }

    return report;
  }

  /**
   * Check for prefix collisions
   * @private
   */
  _checkPrefixCollisions(newConfig, existing, report) {
    if (!newConfig.prefixes || !existing.prefixes) return;

    for (const [prefix, uri] of Object.entries(newConfig.prefixes)) {
      if (existing.prefixes[prefix] && existing.prefixes[prefix] !== uri) {
        report.addWarning({
          code: 'NAMESPACE_COLLISION',
          message: `Prefix "${prefix}" maps to different URIs`,
          value: { new: uri, existing: existing.prefixes[prefix] }
        });
      }
    }
  }

  /**
   * Check for term conflicts
   * @private
   */
  _checkTermConflicts(newConfig, existing, report) {
    if (!newConfig.typeSpecializations || !existing.typeSpecializations) return;

    // Build term->type map for existing config
    const existingTerms = new Map();
    for (const [type, spec] of Object.entries(existing.typeSpecializations)) {
      if (spec && spec.terms && Array.isArray(spec.terms)) {
        for (const term of spec.terms) {
          existingTerms.set(term, type);
        }
      }
    }

    // Check new config terms
    for (const [type, spec] of Object.entries(newConfig.typeSpecializations)) {
      if (spec && spec.terms && Array.isArray(spec.terms)) {
        for (const term of spec.terms) {
          const existingType = existingTerms.get(term);
          if (existingType && existingType !== type) {
            report.addWarning({
              code: 'TERM_CONFLICT',
              message: `Term "${term}" mapped to different types`,
              value: { new: type, existing: existingType }
            });
          }
        }
      }
    }
  }

  /**
   * Check for verb override conflicts
   * @private
   */
  _checkVerbConflicts(newConfig, existing, report) {
    if (!newConfig.verbOverrides || !existing.verbOverrides) return;

    for (const [verb, newOverride] of Object.entries(newConfig.verbOverrides)) {
      const existingOverride = existing.verbOverrides[verb];
      if (existingOverride) {
        // Check if defaults differ
        if (newOverride.default && existingOverride.default &&
            newOverride.default !== existingOverride.default) {
          report.addInfo({
            code: 'VERB_OVERRIDE_CONFLICT',
            message: `Verb "${verb}" has different defaults`,
            value: { new: newOverride.default, existing: existingOverride.default }
          });
        }
      }
    }
  }

  // ==================== Layer 4: TagTeam-Specific Validation ====================

  /**
   * Validate TagTeam-specific features
   * @private
   */
  _validateTagTeamSpecific(config, report) {
    // Verb overrides validation already done in structure validation
    // Additional TagTeam-specific checks can go here
  }

  /**
   * Validate verb overrides structure
   * @param {Object} verbOverrides - Verb overrides object
   * @returns {Array} Array of issue objects
   */
  validateVerbOverrides(verbOverrides) {
    const issues = [];

    if (!verbOverrides || typeof verbOverrides !== 'object') {
      return issues;
    }

    for (const [verb, overrides] of Object.entries(verbOverrides)) {
      const path = `verbOverrides.${verb}`;

      // Check if overrides is valid object
      if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
        issues.push({
          code: 'INVALID_VERB_STRUCTURE',
          message: `Verb override for "${verb}" must be an object`,
          severity: 'warning',
          path,
          value: typeof overrides
        });
        continue;
      }

      // Check for empty object
      if (Object.keys(overrides).length === 0) {
        issues.push({
          code: 'INVALID_VERB_STRUCTURE',
          message: `Verb override for "${verb}" is empty`,
          severity: 'warning',
          path
        });
        continue;
      }

      // Check for missing default key
      if (!('default' in overrides)) {
        issues.push({
          code: 'INVALID_VERB_STRUCTURE',
          message: `Verb override for "${verb}" missing required "default" key`,
          severity: 'warning',
          path,
          suggestion: 'Add a "default" key with the fallback act type'
        });
      }

      // Check each key
      for (const [key, value] of Object.entries(overrides)) {
        // Check for unknown keys
        if (!VALID_VERB_KEYS.includes(key)) {
          issues.push({
            code: 'UNKNOWN_VERB_KEY',
            message: `Unknown verb override key: ${key}`,
            severity: 'info',
            path: `${path}.${key}`
          });
        }

        // Check value type
        if (typeof value !== 'string') {
          issues.push({
            code: 'INVALID_VERB_VALUE',
            message: `Verb override value for "${verb}.${key}" must be a string`,
            severity: 'warning',
            path: `${path}.${key}`,
            value: typeof value
          });
        }
      }
    }

    return issues;
  }

  /**
   * Detect circular dependencies in type hierarchy
   * @param {Object} types - Type hierarchy object
   * @returns {Array} Array of cycle issues
   */
  detectCircularDependencies(types) {
    const issues = [];

    if (!types || typeof types !== 'object') {
      return issues;
    }

    // Build adjacency list
    const graph = new Map();
    for (const [type, info] of Object.entries(types)) {
      if (info && info.parent) {
        graph.set(type, info.parent);
      }
    }

    // Detect cycles using DFS
    const visited = new Set();
    const recStack = new Set();

    const hasCycle = (node, path) => {
      if (recStack.has(node)) {
        issues.push({
          code: 'CIRCULAR_DEPENDENCY',
          message: `Circular dependency detected: ${[...path, node].join(' -> ')}`,
          severity: 'error',
          value: [...path, node]
        });
        return true;
      }

      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      recStack.add(node);

      const parent = graph.get(node);
      if (parent && graph.has(parent)) {
        hasCycle(parent, [...path, node]);
      }

      recStack.delete(node);
      return false;
    };

    for (const type of graph.keys()) {
      if (!visited.has(type)) {
        hasCycle(type, []);
      }
    }

    return issues;
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OntologyValidator;
}
if (typeof window !== 'undefined') {
  window.OntologyValidator = OntologyValidator;
}
